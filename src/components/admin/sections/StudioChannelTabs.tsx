"use client";

import { MARKET_STORIES, VACANCY_STORIES } from "@/utils/storyFlows";
import { isWebStudio, prepareWebArticleDraft, studioBridge } from "../studio-web";
import { openHelperStore } from "@/components/admin/studioLight";
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import StudioBlogEditor, { type BlogDraft } from "./StudioBlogEditor";
import StudioSnsPanel, { SNS_TONES, tonesFor, defaultTone, type SnsData, type ChannelInfo } from "./StudioSnsPanel";
import ChannelButton from "./ChannelButton";
import StudioArticlePanel from "./StudioArticlePanel";
import StudioYoutubePanel from "./StudioYoutubePanel";
import { getMyVacancyPromos } from "@/app/actions/vacancyPromos";
import { useStudioWriter } from "./useStudioWriter";

/**
 * 뉴스·SNS발행의 채널 탭 — 공실뉴스 기사 · 네이버 블로그 · 인스타그램 · 스레드 · 페이스북 · 유튜브 대본
 *
 * 공실뉴스(공실 하나)와 뉴스칼럼(소재 하나)이 함께 쓴다. workId 는 공실 ID 또는 칼럼 번호("col-…")이고,
 * 앱이 번호를 보고 알맞은 프롬프트(매물용·뉴스메이커)로 쓴다. 화면은 같다.
 *  - 블로그 3단계 쓰기(문체·글자 수) → 미리보기 편집기, 4단계 네이버 블로그 채우기(디자인 4종, 발행은 회원이)
 *  - 공실은 글 끝에 매물 정보 출처(표시·광고 필수 정보), 칼럼은 [참고 자료](원문 출처)가 붙는다.
 */

type YtOpt = { id: string; label: string; chars?: string };
type BlogStyles = { saleKind?: string; styles: { id: string; label: string; fit: string; titleExample: string; design?: string }[]; lengths: { id: string; label: string; chars: string }[] };
type Bridge = {
  ai: { connect: (id: string) => Promise<{ ok: boolean }>; finishLogin: () => Promise<void> };
  naver: {
    designs: () => Promise<{ id: string; label: string; hint: string }[]>;
    fill: (opts: { vacancyId: string; design: string; via?: string }) => Promise<NaverDone>;
    openMyBlog: () => Promise<unknown>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
  sns: { channels: () => Promise<ChannelInfo[]>; get: (vacancyId: string) => Promise<SnsData | null>; writeAll?: (o: Omit<AllOpts, "sns"> & { sns: { on: boolean; tone: Record<string, string>; only?: string | string[] }; vacancyId: string }) => Promise<{ article?: BlogDraft; blog?: BlogDraft; sns?: SnsData; youtube?: unknown; miss?: string[]; skipped?: string[] }> };
  article?: { options: (vacancyId: string) => Promise<{ kinds: { id: string; label: string }[]; lengths: { id: string; label: string }[] }> };
  youtube: { get: (vacancyId: string) => Promise<unknown>; options?: (vacancyId: string) => Promise<{ videoTypes: YtOpt[]; durations: YtOpt[]; tones: YtOpt[]; numbers: YtOpt[]; defaults: Record<string, string> }> };
  work?: { save: (id: string) => Promise<WorkSaved>; saveAs?: (id: string) => Promise<WorkSaved & { canceled?: boolean }>; status: (id: string) => Promise<WorkSaved>; show: (file: string) => Promise<void>; open: () => Promise<boolean> };
  blog: {
    styles: (vacancyId?: string) => Promise<BlogStyles>;
    write: (opts: { vacancyId: string; style: string; length: string }) => Promise<BlogDraft>;
    get: (vacancyId: string, doc?: string) => Promise<BlogDraft | null>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
/** 한 번에 쓰기 — 탭마다 "함께 쓰기" 체크 · 기사 스타일·분량 · SNS 문체 (이 PC 에 기억). 블로그 문체·분량은 블로그 탭 값 */
type AllOpts = { story?: string; article: { on: boolean; kind: string; length: string; autoCover?: boolean }; blog: { on: boolean; style: string; length: string }; sns: { on: boolean; tone?: string; tones?: Record<string, string>; same?: boolean; chs?: Record<string, boolean> }; youtube: { on: boolean; videoType?: string; duration?: string; tone?: string; number?: string } };
// 공실뉴스·뉴스칼럼은 기사 종류·블로그 문체가 달라 따로 기억한다
// 자유 글쓰기는 뉴스칼럼과 따로 기억한다 — 기본값이 다르다 (2026-11-06: 기사 칼럼·해설 · 블로그 전문가 칼럼형 · 쇼츠 생활 정보·친근한 이야기)
const allKey = (kind: string, free = false) => (kind === "column" ? (free ? "gs-allwrite:column-free" : "gs-allwrite:column") : kind === "sim" ? "gs-allwrite:sim" : "gs-allwrite");
const loadAll = (kind: string, free = false): AllOpts => {
  const ALL_KEY = allKey(kind, free);
  const d: AllOpts = free
    ? { article: { on: true, kind: "column", length: "normal" }, blog: { on: true, style: "expert", length: "normal" }, sns: { on: true, tone: "polite" }, youtube: { on: false, videoType: "info", tone: "friendly" } }
    : { article: { on: true, kind: "news", length: "normal" }, blog: { on: true, style: "", length: "normal" }, sns: { on: true, tone: "polite" }, youtube: { on: false } };
  try { const v = JSON.parse(localStorage.getItem(ALL_KEY) || "null"); return v ? { story: v.story, article: { ...d.article, ...v.article }, blog: { ...d.blog, ...v.blog }, sns: { ...d.sns, ...v.sns }, youtube: { ...d.youtube, ...v.youtube } } : d; } catch { return d; }
};
const bridge = (): Bridge | null => studioBridge<Bridge>();
/** 어떤 이야기로 — 공실은 매물 이야기, 뉴스칼럼은 단지 중심(기사 흐름 그대로가 기본) (2026-11-09 사장님: 자연스럽게 선택하고 이어지게) */
const storyChoices = (kind: string) => (kind === "gongsil" ? VACANCY_STORIES.map((x) => ({ id: x.id, name: x.name, desc: x.desc })) : kind === "column" ? [...MARKET_STORIES.map((x) => ({ id: x.id, name: x.name, desc: x.desc })), { id: "", name: "기사 흐름 그대로", desc: "내 기사의 흐름을 따라" }] : []); // 기본은 종합 (2026-11-09 사장님 — 분석 기사 흐름은 영상에 안 맞음) // 웹이면 웹 대역 (2026-11-03)
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

/** 작업 파일(.gsn) 저장 상태 — file 이 비면 아직 파일이 없다 */
type WorkSaved = { file: string; savedAt: string };
const hhmm = (iso: string) => (iso ? new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }) : "");
/** 네이버 채우기 결과 — via: helper(평소 크롬 + 도우미) · manual(복사·사진 폴더) · chrome(전용 크롬) */
type NaverDone = { ok: boolean; imagesInserted: number; imagesTotal: number; design: string; tags: string[]; via?: string; folder?: string; photos?: number; copy?: { title: string; html: string; text: string; tags: string } };

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };

export default function StudioChannelTabs({ theme, workId, kind, tab, onTab, onUsed, layout, head, analysis }: {
  theme: Theme;
  /** "desk" = 작업대 화면 (2026-11-03 사장님 시안 A3) — 왼쪽 [공실 + 쓸 글·글마다 설정 + 한 번에 쓰기] · 가운데 [분석 내용 | 글마다 결과]. 없으면 예전 탭 화면 */
  layout?: "desk";
  /** 작업대 왼쪽 맨 위 — 이 공실 카드 (StudioSnsSection 이 만든다) */
  head?: React.ReactNode;
  /** 작업대 가운데 [📋 분석 내용] 탭 내용 — 글의 재료 (StudioSnsSection 이 만든다) */
  analysis?: React.ReactNode;
  workId: string;
  kind: "gongsil" | "column" | "sim"; // sim = 인테리어·리모델링 시뮬레이션 결과표
  tab: string;
  onTab: (id: string) => void;
  onUsed: () => void;
}) {
  const aiName = useStudioWriter(); // 고른 글쓰기 AI (ChatGPT · Gemini)
  const router = useRouter();
  // [기사쓰기 화면으로 보내기] — 웹은 이 브라우저에 둔 기사를 기사쓰기 화면이 읽는 자리에 먼저 놓는다 (2026-11-03)
  const sendArticle = async () => {
    if (isWebStudio()) await prepareWebArticleDraft(workId);
    router.push(`/realty_admin?menu=article&action=write&studioDraft=${encodeURIComponent(workId)}`);
  };
  const column = kind === "column";
  const [article, setArticle] = useState<BlogDraft | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [snsData, setSnsData] = useState<SnsData | null>(null);
  const [hasYoutube, setHasYoutube] = useState(false);
  const [blogOpts, setBlogOpts] = useState<BlogStyles | null>(null);
  const [style, setStyle] = useState("");
  const [length, setLength] = useState("normal");
  const [writing, setWriting] = useState(false);
  const [blogProgress, setBlogProgress] = useState("");
  const [blogError, setBlogError] = useState("");
  const [blog, setBlog] = useState<BlogDraft | null>(null);
  // 한 번에 쓰기 (공실뉴스 매물만 — 칼럼·인테리어는 탭마다 쓰기)
  const oneShot = true; // 공실뉴스·뉴스칼럼·인테리어·리모델링 모두 (2026-10-23 사장님)
  // 자유 글쓰기인지 — 칼럼 소재가 "topic" 이면 (2026-11-06)
  const [free, setFree] = useState(false);
  useEffect(() => {
    if (kind !== "column") { setFree(false); return; }
    let live = true;
    void (studioBridge<{ column?: { get: (id: string) => Promise<{ source?: { mode?: string } } | null> } }>()?.column?.get(workId) || Promise.resolve(null))
      .then((c) => { if (live) setFree(c?.source?.mode === "topic"); }).catch(() => {});
    return () => { live = false; };
  }, [kind, workId]);
  const [all, setAll] = useState<AllOpts>(() => loadAll(kind));
  useEffect(() => setAll(loadAll(kind, free)), [kind, free]);
  const [allBusy, setAllBusy] = useState("");
  const [allMsg, setAllMsg] = useState("");
  const [ytVer, setYtVer] = useState(0);
  // 한 번에 쓰기로 대본을 새로 받으면 유튜브 탭을 다시 그린다
  // SNS 문체 — 채널마다 (전에 세 채널 같이 고른 값이 있으면 그것으로 시작)
  // 목록에 없는 문체(뺀 스토리체, 인스타·페북의 스레드 감성)는 그 채널 처음 문체로 (2026-11-06)
  const snsTones: Record<string, string> = Object.fromEntries(["instagram", "threads", "facebook"].map((ch) => {
    const t = all.sns.tones?.[ch] || defaultTone(ch, column);
    return [ch, tonesFor(ch, column).some((x) => x.id === t) ? t : defaultTone(ch, column)];
  }));
  // 채널별 발행일 — 홍보현황에 올린 주소가 연결된 날 (공실만, 2026-11-06 사장님)
  const [pubDates, setPubDates] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!/^[0-9a-f]{8}-/i.test(workId)) { setPubDates({}); return; }
    let live = true;
    const load = () => getMyVacancyPromos().then((r) => {
      if (!live || !r.success) return;
      const p = r.promos[workId];
      const out: Record<string, string> = {};
      for (const [c, at] of Object.entries(p?.at || {})) {
        const d = new Date(String(at));
        if (p?.links[c as keyof typeof p.links] && !Number.isNaN(d.getTime())) out[c] = `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      }
      setPubDates(out);
    }).catch(() => {});
    void load();
    window.addEventListener("gs-promo-saved", load);
    window.addEventListener("focus", load);
    return () => { live = false; window.removeEventListener("gs-promo-saved", load); window.removeEventListener("focus", load); };
  }, [workId]);
  // 자유 글쓰기 블로그 문체 기본 = 전문가 칼럼형 (2026-11-06)
  useEffect(() => { if (free && blogOpts?.styles.some((x) => x.id === "expert")) setStyle("expert"); }, [free, blogOpts]); // eslint-disable-line react-hooks/exhaustive-deps
  const keepAll = (n: AllOpts) => { setAll(n); try { localStorage.setItem(allKey(kind, free), JSON.stringify(n)); } catch {} };
  // 스레드는 스레드 감성(반말 혼잣말)으로 한 번 되돌린다 — 그 뒤에 고른 것은 그대로 (2026-11-06 사장님: "기본값을 쓰레드로")
  useEffect(() => {
    if (kind === "column") return; // 뉴스칼럼·자유 글쓰기는 따로 (문체 목록이 다르다)
    const mark = "gs-sns-thread-default-1106";
    try {
      if (localStorage.getItem(mark)) return;
      localStorage.setItem(mark, "1");
    } catch { return; }
    const cur = all.sns.tones?.threads;
    if (cur && cur !== "thread") keepAll({ ...all, sns: { ...all.sns, same: false, tones: { ...(all.sns.tones || {}), threads: "thread" } } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // 인스타그램도 체크체로 한 번 되돌린다 — 그 뒤에 고른 것은 그대로 (2026-11-06 사장님: "인스타는 체크체가 기본으로")
  useEffect(() => {
    if (kind === "column") return; // 뉴스칼럼·자유 글쓰기는 공실 기본값(체크체·물건소개형)으로 되돌리지 않는다
    const mark = "gs-sns-insta-default-1106";
    try {
      const first = !localStorage.getItem(mark);
      localStorage.setItem(mark, "1");
      const raw = JSON.parse(localStorage.getItem(allKey(kind)) || "null") as AllOpts | null; // 위 스레드 되돌리기와 겹쳐도 지워지지 않게 저장된 값에서
      const base = raw || all;
      const cur = base.sns.tones?.instagram;
      if (first && cur && cur !== "check") keepAll({ ...base, sns: { ...base.sns, same: false, tones: { ...(base.sns.tones || {}), instagram: "check" } } });
    } catch { /* */ }
    // 쇼츠 대본 말투도 물건 소개형(기본형)으로 한 번 (2026-11-06 사장님: "기본형으로")
    try {
      const m2 = "gs-yt-tone-default-1106";
      if (localStorage.getItem(m2)) return;
      localStorage.setItem(m2, "1");
      const raw = JSON.parse(localStorage.getItem(allKey(kind)) || "null") as AllOpts | null;
      const base = raw || all;
      if (base.youtube?.tone && base.youtube.tone !== "listing") keepAll({ ...base, youtube: { ...base.youtube, tone: "listing" } });
    } catch { /* */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // only — 이 탭 글만 쓰기 (2026-10-28 사장님: 한 번에 쓰기와 함께 각각 쓰기도). ☑ 기억은 바꾸지 않는다
  // SNS 는 채널 하나만도 (instagram · threads · facebook — 나머지 채널 글은 그대로, 2026-10-28 사장님)
  const runAll = async (only?: "article" | "blog" | "sns" | "youtube" | "instagram" | "threads" | "facebook") => {
    const snsOnly = only === "instagram" || only === "threads" || only === "facebook" ? only : "";
    if (snsOnly) only = "sns";
    const b = bridge();
    if (!b?.sns.writeAll) return setAllMsg("앱을 새 버전으로 다시 켜 주세요.");
    const pick: AllOpts = only
      ? { ...all, article: { ...all.article, on: only === "article" }, blog: { ...all.blog, on: only === "blog" }, sns: { ...all.sns, on: only === "sns" }, youtube: { ...all.youtube, on: only === "youtube" } }
      : all;
    // 인스타·스레드·페북을 따로 켜고 끈다 (2026-11-03 사장님) — 몇 채널만 켰으면 그 채널 글만 바꾼다
    const snsOn = snsOnly ? [snsOnly] : pick.sns.on ? ["instagram", "threads", "facebook"].filter((c) => all.sns.chs?.[c] !== false) : [];
    if (!pick.article.on && !pick.blog.on && !snsOn.length && !pick.youtube.on) return setAllMsg("쓸 글을 하나 이상 켜 주세요.");
    setAllBusy("AI에게 보내는 중…");
    setAllMsg("");
    const off = b.blog.onProgress(setAllBusy);
    try {
      const st = blogOpts?.styles.some((x) => x.id === style) ? style : blogOpts?.styles[0]?.id || "";
      const r = await b.sns.writeAll({ vacancyId: workId, ...pick, sns: { on: snsOn.length > 0, tone: snsTones, only: snsOnly || (snsOn.length < 3 ? snsOn : undefined) }, blog: { on: pick.blog.on, style: st, length } });
      if (r.article) setArticle({ ...r.article, doc: "article" });
      if (r.blog) { setBlog(r.blog); setNaverDone(null); setDesign(designFor(st)); }
      if (r.sns) setSnsData(r.sns);
      if (r.youtube) { setHasYoutube(true); setYtVer((n) => n + 1); }
      const skip = r.skipped?.length ? ` (${r.skipped.join("·")}는 PRO에서 쓸 수 있어 빼고 썼어요)` : ""; // 무료 — 막지 않고 빼고 쓴다 (2026-11-04)
      setAllMsg(r.miss?.length ? `${r.miss.join("·")} 글은 읽지 못했어요. 그 탭에서 [이 글만 쓰기]를 다시 눌러 주세요.` : (only ? "다 썼어요. 확인하고 고쳐 보세요." : "다 썼어요. 탭마다 확인하고 고쳐 보세요. 한 가지만 다시 쓰려면 그 탭에서 [이 글만 쓰기].") + skip);
    } catch (e) {
      setAllMsg(cleanErr(e));
    } finally {
      off();
      setAllBusy("");
      onUsed();
    }
  };
  const [artOpts, setArtOpts] = useState<{ kinds: { id: string; label: string }[]; lengths: { id: string; label: string; chars?: string }[] } | null>(null);
  const [ytOpts, setYtOpts] = useState<{ videoTypes: YtOpt[]; durations: YtOpt[]; tones: YtOpt[]; numbers: YtOpt[]; defaults: Record<string, string> } | null>(null);
  useEffect(() => {
    if (layout !== "desk") return;
    bridge()?.article?.options(workId).then(setArtOpts).catch(() => {});
    bridge()?.youtube.options?.(workId).then(setYtOpts).catch(() => {});
  }, [layout, workId]);
  // 고른 기사 스타일이 목록에 없으면(예전 "숫자로 보는" 등 — 2026-11-06 웹은 여섯 개로 줄임) 맨 앞(매물 소개형)으로
  useEffect(() => {
    if (!artOpts?.kinds.length || artOpts.kinds.some((k) => k.id === all.article.kind)) return;
    keepAll({ ...all, article: { ...all.article, kind: artOpts.kinds[0].id } });
  }, [artOpts]); // eslint-disable-line react-hooks/exhaustive-deps
  const [openRow, setOpenRow] = useState<string>(""); // 작업대 왼쪽 — 펼친 글 (하나만)
  // 가운데 탭이 어떤 길로든 바뀌면 왼쪽도 그 글 설정을 펼친다 (2026-11-03 사장님: 좌우가 함께) — 분석 내용 탭은 그대로
  useEffect(() => { if (layout === "desk" && tab && tab !== "source") setOpenRow(tab); }, [tab, layout]);
  const [designs, setDesigns] = useState<{ id: string; label: string; hint: string }[]>([]);
  const [design, setDesign] = useState("");
  const [filling, setFilling] = useState(false);
  const [naverProgress, setNaverProgress] = useState("");
  const [naverError, setNaverError] = useState("");
  const [naverLogin, setNaverLogin] = useState<"" | "need" | "open">("");
  const [naverDone, setNaverDone] = useState<NaverDone | null>(null);
  const [naverNoHelper, setNaverNoHelper] = useState(false); // 도우미 확장이 대답하지 않았다 → 복사·폴더 / 전용 크롬 고르기
  const [copied, setCopied] = useState("");
  /** 디자인 그대로 복사 (html) — 네이버 글쓰기에 Ctrl+V */
  const copyRich = async (what: string, html: string, text: string) => {
    try {
      if (html && typeof ClipboardItem !== "undefined") await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
      else await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1600);
    } catch { setNaverError("복사하지 못했어요."); }
  };

  // 문체마다 어울리는 디자인 (확장과 같은 짝 — 문체 목록에 함께 온다)
  const designFor = useCallback((id: string, opts = blogOpts) => opts?.styles.find((x) => x.id === id)?.design || "basic", [blogOpts]);

  /* 써 둔 기사·블로그·SNS 를 불러온다 (새로 골랐을 때·돌아왔을 때 공용) */
  useEffect(() => {
    const b = bridge();
    if (!b) return;
    let alive = true;
    (async () => {
      b.naver.designs().then((d) => alive && setDesigns(d)).catch(() => {});
      b.sns.channels().then((c) => alive && setChannels(c)).catch(() => {});
      const opts = await b.blog.styles(workId); // 경매·공매면 경매용, 칼럼이면 뉴스메이커 문체
      if (!alive) return;
      setBlogOpts(opts);
      setStyle(opts.styles[0]?.id || ""); // 자유 글쓰기는 아래 효과에서 전문가 칼럼형으로
      setSnsData(await b.sns.get(workId).catch(() => null));
      setHasYoutube(Boolean(await b.youtube.get(workId).catch(() => null)));
      const prevArticle = await b.blog.get(workId, "article").catch(() => null);
      setArticle(prevArticle ? { ...prevArticle, doc: "article" } : null);
      const prev = await b.blog.get(workId).catch(() => null);
      if (!alive) return;
      setBlog(prev);
      if (prev) {
        setStyle(prev.style);
        setLength(prev.length);
        setDesign(designFor(prev.style, opts));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId]);

  // 탭을 옮겨 오면 PC에 저장된 최신 글로 다시 그린다 (미리보기에서 고친 것·수정 요청 반영)
  const firstTab = React.useRef(true);
  useEffect(() => {
    if (firstTab.current) {
      firstTab.current = false;
      return;
    }
    const b = bridge();
    if (!b || (tab !== "article" && tab !== "blog")) return;
    if (tab === "article") b.blog.get(workId, "article").then((a) => a && setArticle({ ...a, doc: "article" })).catch(() => {});
    else b.blog.get(workId).then((d) => d && setBlog(d)).catch(() => {});
  }, [tab, workId]);

  const writeBlog = async () => {
    const b = bridge();
    if (!b) return;
    setWriting(true);
    setBlogError("");
    setBlog(null);
    setNaverDone(null);
    const off = b.blog.onProgress(setBlogProgress);
    try {
      setBlog(await b.blog.write({ vacancyId: workId, style, length }));
      setDesign(designFor(style));
    } catch (e) {
      setBlogError(cleanErr(e));
    } finally {
      off();
      setBlogProgress("");
      setWriting(false);
      onUsed();
    }
  };

  /* via — helper(처음 값: 평소 크롬 + 공실뉴스 작성기) · manual(복사·사진 폴더) · ""(전용 크롬, 예전 방식) — 2026-10-23 사장님 */
  const fillNaver = async (via = "helper") => {
    const b = bridge();
    if (!b || !blog) return;
    setFilling(true);
    setNaverError("");
    setNaverDone(null);
    setNaverNoHelper(false);
    const off = b.naver.onProgress(setNaverProgress);
    try {
      setNaverDone(await b.naver.fill({ vacancyId: workId, design: design || "basic", via }));
    } catch (e) {
      const msg = cleanErr(e);
      if (msg.startsWith("NAVER_LOGIN:")) setNaverLogin("need");
      if (msg.startsWith("HELPER_NONE:")) setNaverNoHelper(true);
      setNaverError(msg.replace(/^(NAVER_LOGIN|HELPER_NONE):\s*/, ""));
    } finally {
      off();
      setNaverProgress("");
      setFilling(false);
    }
  };

  /* 네이버 로그인: 전용 크롬(조종 없는 평범한 창)에서 회원이 직접 로그인 → [로그인 다 했어요] */
  const loginNaver = async () => {
    const b = bridge();
    if (!b) return;
    setNaverLogin("open");
    setNaverError("");
    try {
      const r = await b.ai.connect("naver");
      if (r && r.ok) {
        setNaverLogin("");
        setNaverProgress("");
        setNaverError("");
        setNaverDone(null);
      } else {
        setNaverLogin("need");
        setNaverError("네이버 로그인이 확인되지 않았습니다. 다시 [네이버 로그인]을 눌러 주세요.");
      }
    } catch (e) {
      setNaverLogin("need");
      setNaverError(cleanErr(e));
    }
  };

  // 오른쪽 단계 막대(StepNav)에 ✓ 알리기 — ② 쓴 글이 있음 · ③ 네이버에 채움 (2026-10-28 사장님)
  useEffect(() => {
    const written = Boolean(article || blog || hasYoutube || Object.values(snsData?.channels || {}).some((c) => c?.post));
    window.dispatchEvent(new CustomEvent("gs-steps", { detail: { written, filled: Boolean(naverDone) } }));
  }, [article, blog, hasYoutube, snsData, naverDone]);

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  // 단계 제목은 카드 바깥 — 위 ①② 와 같은 자리 (2026-10-28 사장님)
  const stepTitle = (n: number, t: string) => (
    <div id={`gs-step-${n}`} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 8px 2px", scrollMarginTop: 16 }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>{t}</h3>
    </div>
  );
  // 칼럼은 기사가 있어야 블로그·SNS 를 쓴다 (뉴스메이커와 같다: 기사 → 블로그·SNS)
  const needArticle = !oneShot && !article; // 시뮬레이션은 기사를 먼저 (뉴스칼럼은 한 번에 쓰기로 기사와 함께 쓴다)
  const firstStep = column ? 2 : 3;

  /* 블로그 문체·글자 수 — 예전 탭 화면과 작업대 왼쪽이 같이 쓴다 (narrow = 왼쪽 좁은 칸) */
  const blogControls = (narrow: boolean) => (<>
              <div style={{ fontSize: narrow ? 12 : 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>문체</div>
              <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: narrow ? 6 : 8, marginBottom: 14 }}>
                {(blogOpts?.styles || []).map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)} title={`예: ${s.titleExample}`}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: style === s.id ? "rgba(26,58,107,0.08)" : "transparent",
                      border: `1px solid ${style === s.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.border}`, color: theme.textPrimary }}>
                    <div style={{ fontSize: narrow ? 13 : 14, fontWeight: 800 }}>{s.label}</div>
                    {!narrow && <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{s.fit}</div>}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: narrow ? 12 : 13, fontWeight: 700, color: theme.textSecondary, marginRight: 4 }}>글자 수</span>
                {(blogOpts?.lengths || []).map((l) => (
                  <button key={l.id} onClick={() => setLength(l.id)}
                    style={{ padding: narrow ? "4px 11px" : "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: narrow ? 12 : 13, fontWeight: 700,
                      border: `1px solid ${length === l.id ? "#1a3a6b" : theme.border}`, background: length === l.id ? "#1a3a6b" : "transparent", color: length === l.id ? "#fff" : theme.textPrimary }}>
                    {narrow ? l.label : `${l.label} · ${l.chars}`}
                  </button>
                ))}
                {oneShot || narrow ? null : ( /* [이 글만 다시 쓰기]는 뺐다 — 위 ☑ + [한 번에 쓰기]로 (2026-10-24 사장님) */
                  <button onClick={writeBlog} disabled={writing}
                    style={{ marginLeft: "auto", padding: "10px 18px", background: writing ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: writing ? "default" : "pointer" }}>
                    {writing ? `${aiName}가 쓰는 중…` : blog ? "다시 쓰기" : `${aiName}로 블로그 글 쓰기`}
                  </button>
                )}
              </div>
              {/* 좁은 칸 — 단추는 작게, 글자 수는 아래 설명으로 (2026-11-03 사장님) */}
              {narrow && blogOpts?.lengths.find((l) => l.id === length)?.chars && <div style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>{blogOpts.lengths.find((l) => l.id === length)!.label} · {blogOpts.lengths.find((l) => l.id === length)!.chars}</div>}
  </>);
  /* 네이버 블로그 채우기 — 디자인 고르기 · 채우기 · 로그인 · 복사 (예전 탭 화면과 작업대가 같이 쓴다) */
  // 함수 — [이 블로그만 쓰기](writeBtn, 아래에서 만든다)를 단추 줄에 같이 넣는다 (2026-11-06 사장님: 인스타와 같이 단추를 밑으로 한 줄)
  const naverBlock = (wb?: React.ReactNode) => (<>
          {!blog ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>먼저 블로그 글을 써 주세요.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>블로그 디자인</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 14 }}>
                {designs.map((d) => (
                  <button key={d.id} onClick={() => setDesign(d.id)}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: design === d.id ? "rgba(26,58,107,0.08)" : "transparent",
                      border: `1px solid ${design === d.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.border}`, color: theme.textPrimary }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2, lineHeight: 1.5 }}>{d.hint}</div>
                  </button>
                ))}
              </div>
              {/* 단추 한 줄 — [이 블로그만 쓰기] · 바로가기 · 채우기, 설명은 그 아래 (인스타그램 탭과 같은 모양) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {wb}
                <ChannelButton channel="blog" label="네이버 블로그 바로가기" onClick={() => bridge()?.naver.openMyBlog()} />
                <button onClick={() => void fillNaver("helper")} disabled={filling}
                  style={{ padding: "10px 16px", background: filling ? "#94a3b8" : "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: filling ? "default" : "pointer", whiteSpace: "nowrap" }}>
                  {filling ? "네이버에 채우는 중…" : "네이버 블로그에 채우기"}
                </button>
                {pubDates.blog && <span title="네이버 블로그에 올린 날 (올린 주소가 연결된 날)" style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: theme.textSecondary, whiteSpace: "nowrap" }}>발행 {pubDates.blog}</span>}
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: theme.textSecondary, lineHeight: 1.6 }}>
                평소 쓰는 크롬에 네이버 글쓰기가 열리고 <b>공실뉴스 작성기</b>(크롬 확장)가 제목·본문·사진 {blog.media.length}장·{column ? "참고 자료(원문 출처)" : kind === "sim" ? "AI 예측 안내·출처" : "매물 정보 출처"}가 채워집니다. <b>[발행]은 소장님이 직접</b> 눌러 주세요. 태그는 발행 창이 열릴 때 자동으로 들어갑니다.
              </div>
            </>
          )}
          {naverProgress && <div style={{ marginTop: 12, fontSize: 14, color: (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontWeight: 600 }}>{naverProgress}</div>}
          {naverError && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030", lineHeight: 1.6 }}>{naverError}</div>}
          {naverNoHelper && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => void fillNaver("manual")} disabled={filling}
                style={{ padding: "10px 16px", background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>복사·사진 폴더로 직접 붙여 넣기</button>
              {!isWebStudio() && <button onClick={() => void fillNaver("")} disabled={filling} title="예전 방식 — 앱이 따로 띄운 크롬에서 채워요 (네이버 로그인을 그 창에서 한 번 해야 해요)"
                style={{ padding: "10px 16px", background: "transparent", color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>전용 크롬으로 채우기</button>}
              <button onClick={openHelperStore} title="평소 크롬에 공실뉴스 작성기를 설치해요"
                style={{ padding: "10px 16px", background: "#fff7ed", color: "#c2410c", border: "1px solid #fdba74", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>크롬 도우미 설치하기</button>
            </div>
          )}
          {naverLogin === "need" && (
            <button onClick={loginNaver}
              style={{ marginTop: 10, padding: "10px 16px", background: "#03c75a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              네이버 로그인
            </button>
          )}
          {naverLogin === "open" && (
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "#065f46", flex: 1, minWidth: 240, lineHeight: 1.6 }}>
                오른쪽에 새로 뜬 &quot;공실마케팅&quot; 크롬 창에서 네이버에 로그인한 뒤 눌러 주세요. (평소 쓰시는 크롬 창이 아닙니다)
              </span>
              <button onClick={() => bridge()?.ai.finishLogin()}
                style={{ padding: "10px 16px", background: "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                로그인 다 했어요
              </button>
            </div>
          )}
          {naverDone?.via === "manual" && naverDone.copy && (
            <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 10, background: theme.darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${theme.border}`, fontSize: 14, color: theme.textPrimary, lineHeight: 1.7 }}>
              {isWebStudio() ? <>새 탭에 네이버 글쓰기를 열고, 사진 {naverDone.photos || 0}장을 글 순서대로 번호 붙여 압축 파일(zip)로 내려받았어요.</> : <>평소 크롬에 네이버 글쓰기를 열고, 사진 {naverDone.photos || 0}장을 글 순서대로 번호 붙여 폴더에 저장했어요.</>}
              <ol style={{ margin: "8px 0", paddingLeft: 20 }}>
                <li>[제목 복사] → 네이버 제목 칸에 붙여 넣기</li>
                <li>[본문 복사] → 본문 칸에 붙여 넣기 (디자인 그대로, 사진 자리는 <b>[사진 1]</b>처럼 표시)</li>
                <li>{isWebStudio() ? "압축을 푼 사진" : "폴더의 사진"}을 [사진 N] 자리에 끌어다 놓고 그 표시는 지우기</li>
                <li>[발행]을 누를 때 태그 칸에 [태그 복사]</li>
              </ol>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {([["title", "제목 복사", "", naverDone.copy.title], ["body", "본문 복사", naverDone.copy.html, naverDone.copy.text], ["tags", "태그 복사", "", naverDone.copy.tags]] as const).map(([k, label, html, text]) => (
                  <button key={k} onClick={() => void copyRich(k, html, text)}
                    style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: copied === k ? "#16a34a" : theme.cardBg, color: copied === k ? "#fff" : theme.textPrimary, fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>
                    {copied === k ? "복사됨 ✓" : label}
                  </button>
                ))}
              </div>
              {naverDone.folder && <div style={{ marginTop: 8, fontSize: 12.5, color: theme.textSecondary, wordBreak: "break-all" }}>사진: {naverDone.folder}</div>}
            </div>
          )}
          {naverDone && naverDone.via !== "manual" && (
            <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 14, color: "#065f46", lineHeight: 1.7 }}>
              {naverDone.via === "helper" ? "평소 크롬의 네이버 글쓰기에 도우미가 채웠어요." : "네이버 글쓰기에 채웠습니다."} 사진 {naverDone.imagesInserted}/{naverDone.imagesTotal}장.
              {naverDone.imagesInserted < naverDone.imagesTotal ? " 빠진 사진은 네이버 화면에서 직접 올려 주세요." : ""}
              <br />{naverDone.via === "helper" ? "크롬 창에서" : "오른쪽 크롬 창에서"} 내용을 확인하고 <b>[발행]</b>을 눌러 주세요. 태그 {naverDone.tags.length}개는 발행 창에 자동으로 들어갑니다.
            </div>
          )}
  </>);

  const writeBtn = (() => {
    if (!oneShot) return null;
    const ch = channels.find((c) => c.id === tab);
    const part = tab === "article" ? "article" : tab === "blog" ? "blog" : tab === "youtube" ? "youtube" : ch ? (tab as "instagram" | "threads" | "facebook") : null;
    if (!part) return null;
    const label = part === "article" ? "이 기사만 쓰기" : part === "blog" ? "이 블로그만 쓰기" : part === "youtube" ? "이 대본만 쓰기" : `이 ${ch?.label || "SNS"} 글만 쓰기`;
    return (
      <button type="button" onClick={() => void runAll(part)} disabled={Boolean(allBusy)} title={ch ? `${ch.label} 글만 새로 씁니다 (다른 SNS 글은 그대로)` : "이 탭 글만 씁니다"}
        style={{ padding: "10px 16px", borderRadius: 8, border: `2px solid ${theme.darkMode ? "#5b8def" : "#1a3a6b"}`, background: theme.cardBg, color: allBusy ? theme.textSecondary : (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontSize: 14, fontWeight: 800, cursor: allBusy ? "default" : "pointer", whiteSpace: "nowrap" }}>
        {allBusy ? "쓰는 중…" : label}
      </button>
    );
  })();

  /* ── 작업대 화면 (시안 A3) ── */
  if (layout === "desk") {
    const navy = theme.darkMode ? "#5b8def" : "#1a3a6b";
    const soft = theme.darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc";
    const sameTone = false; // 채널마다 따로 (2026-11-06 사장님: "같은 문체로" 선택 없앰)
    // 같은 문체로 — 스레드 감성은 스레드에만 (인스타·페북은 그대로)
    const setTone = (ch: string, t: string) => keepAll({ ...all, sns: { ...all.sns, tones: sameTone ? (t === "thread" ? { ...snsTones, threads: t } : { instagram: t, threads: t, facebook: t }) : { ...snsTones, [ch]: t } } });
    const toneLabel = (id: string) => SNS_TONES.find((t) => t.id === id)?.label || id;
    const chOn = (c: string) => all.sns.on && all.sns.chs?.[c] !== false;
    const flipCh = (c: string) => {
      const chs = { instagram: true, threads: true, facebook: true, ...(all.sns.on ? all.sns.chs : { instagram: false, threads: false, facebook: false }), [c]: !chOn(c) };
      keepAll({ ...all, sns: { ...all.sns, chs, on: Object.values(chs).some(Boolean) } });
    };
    const count = (all.article.on ? 1 : 0) + (all.blog.on ? 1 : 0) + channels.filter((c) => chOn(c.id)).length + (all.youtube.on ? 1 : 0);
    const toggle = (on: boolean, flip: () => void) => (
      <span role="switch" aria-checked={on} onClick={(e) => { e.stopPropagation(); if (!allBusy) flip(); }} title={on ? "함께 쓰기 — 끄기" : "함께 쓰기 — 켜기"}
        style={{ marginLeft: 8, width: 36, height: 20, borderRadius: 10, background: on ? "#2563eb" : theme.darkMode ? "#4b5563" : "#d1d5db", position: "relative", flexShrink: 0, cursor: allBusy ? "default" : "pointer", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
      </span>
    );
    const ICON: Record<string, [string, string]> = { article: ["공", "#2563eb"], blog: ["N", "#03c75a"], instagram: ["◎", "linear-gradient(45deg,#f58529,#dd2a7b,#8134af)"], threads: ["@", "#111"], facebook: ["f", "#1877f2"], youtube: ["▶", "#ff0000"], sns: ["#", "linear-gradient(45deg,#f58529,#dd2a7b,#8134af)"] };
    const icon = (id: string) => <em style={{ fontStyle: "normal", width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, background: ICON[id]?.[1] || "#64748b", flexShrink: 0 }}>{ICON[id]?.[0] || "·"}</em>;
    // 요약 줄 — 분량은 글자 수까지, 대본은 시간까지 (2026-11-03 사장님)
    const withChars = (l?: { label: string; chars?: string }) => (l ? `${l.label}${l.chars ? ` ${l.chars}` : ""}` : "");
    const artSum = artOpts ? [artOpts.kinds.find((k) => k.id === all.article.kind)?.label, withChars(artOpts.lengths.find((l) => l.id === all.article.length))].filter(Boolean).join(" · ") : "";
    const blogSum = blogOpts ? [blogOpts.styles.find((x) => x.id === style)?.label, withChars(blogOpts.lengths.find((l) => l.id === length))].filter(Boolean).join(" · ") : "";
    const ytPick = (k: "videoType" | "duration" | "tone", list?: YtOpt[]) => { const id = (all.youtube[k] as string | undefined) || ytOpts?.defaults?.[k]; return list?.find((x) => x.id === id)?.label || ""; };
    const ytSum = ytOpts ? [ytPick("videoType", ytOpts.videoTypes), ytPick("duration", ytOpts.durations), ytPick("tone", ytOpts.tones)].filter(Boolean).join(" · ") : "형식 · 길이 · 말투";
    const toneGrid = (ch: string) => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {tonesFor(ch, column).map((t) => {
          const on = snsTones[ch] === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTone(ch, t.id)}
              style={{ textAlign: "left", padding: "7px 9px", borderRadius: 8, cursor: "pointer", color: theme.textPrimary, border: `1px solid ${on ? "#2563eb" : theme.border}`, background: on ? (theme.darkMode ? "rgba(37,99,235,0.18)" : "#eff5ff") : "transparent" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: on ? (theme.darkMode ? "#93c5fd" : "#1d4ed8") : undefined }}>{t.label}</div>
              <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>{t.brief}</div>
            </button>
          );
        })}
      </div>
    );
    const rows: { id: string; label: string; sum: string; on: boolean; flip: () => void; body: React.ReactNode }[] = [
      { id: "article", label: "공실뉴스 기사", sum: artSum, on: all.article.on, flip: () => keepAll({ ...all, article: { ...all.article, on: !all.article.on } }),
        body: <StudioArticlePanel view="settings" theme={theme} vacancyId={workId} article={article} onArticle={setArticle} column={column} oneShot
          pick={all.article} onPick={(k, l) => keepAll({ ...all, article: { ...all.article, kind: k, length: l } })}
          autoCover={all.article.autoCover === true} onAutoCover={(v) => keepAll({ ...all, article: { ...all.article, autoCover: v } })} onSend={() => {}} /> },
      { id: "blog", label: "네이버 블로그", sum: blogSum, on: all.blog.on, flip: () => keepAll({ ...all, blog: { ...all.blog, on: !all.blog.on } }), body: <div>{blogControls(true)}</div> },
      ...channels.map((c) => ({ id: c.id, label: c.label, sum: toneLabel(snsTones[c.id]), on: chOn(c.id), flip: () => flipCh(c.id),
        body: (
          <div>
            {toneGrid(c.id)}
            {/* "○○도 같은 문체로" 단추는 뺐다 — 채널마다 맞는 문체가 달라서 늘 따로 고른다 (2026-11-06 사장님) */}
          </div>
        ) })),
      { id: "youtube", label: "쇼츠릴스 대본", sum: ytSum, on: all.youtube.on, flip: () => keepAll({ ...all, youtube: { ...all.youtube, on: !all.youtube.on } }),
        body: <StudioYoutubePanel view="settings" theme={theme} vacancyId={workId} onUsed={onUsed} oneShot remembered={all.youtube} onPick={(p) => keepAll({ ...all, youtube: { ...all.youtube, ...p } })} /> },
    ];
    const tabs = [
      ...(analysis ? [{ id: "source", label: "📋 분석 내용 · 글의 재료", done: true }] : []),
      { id: "article", label: "공실뉴스 기사", done: Boolean(article) }, { id: "blog", label: "네이버 블로그", done: Boolean(blog) },
      ...channels.map((c) => ({ id: c.id, label: c.label, done: Boolean(snsData?.channels[c.id]?.post) })),
      { id: "youtube", label: "쇼츠릴스 대본", done: hasYoutube },
    ];
    const cur = tab === "source" && !analysis ? "article" : tab;
    return (
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 작업 파일 — 위 줄 오른쪽 자리(#gs-workfile-slot)에 그린다 */}
        <WorkFileBar theme={theme} workId={workId} />
        {/* 왼쪽 — 이 공실 · 쓸 글(글마다 설정) · 한 번에 쓰기 */}
        <aside style={{ width: 372, flexShrink: 0, display: "flex", flexDirection: "column", background: theme.cardBg, borderRight: `1px solid ${theme.border}` }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 8px" }}>
            {head}
            <StepTitle theme={theme} n={2} label="쓸 글 고르기" state={article || blog || hasYoutube || Object.values(snsData?.channels || {}).some((c) => c?.post) ? "done" : "now"} style={{ margin: "20px 0 8px" }}
              title="켜 둔 글을 [한 번에 쓰기]로 함께 씁니다. 줄을 누르면 그 글의 설정이 펼쳐집니다." />
            {/* 어떤 이야기로 — 한 번 고르면 기사·블로그·SNS·쇼츠가 같은 이야기로 이어진다 (2026-11-09) */}
            {storyChoices(kind).length > 0 && (() => {
              const list = storyChoices(kind);
              const cur = all.story !== undefined && list.some((x) => x.id === all.story) ? all.story : list[0].id;
              return (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: theme.textSecondary, marginBottom: 6 }}>어떤 이야기로 <span style={{ fontWeight: 500 }}>· 모든 글이 같은 이야기로 이어져요</span></div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {list.map((x) => {
                      const on = cur === x.id;
                      return (
                        <button key={x.id || "flow"} type="button" onClick={() => keepAll({ ...all, story: x.id })} title={x.desc}
                          style={{ height: 32, padding: "0 12px", borderRadius: 16, border: `1px solid ${on ? (theme.darkMode ? "#93c5fd" : "#1a3a6b") : theme.border}`, background: on ? (theme.darkMode ? "#93c5fd" : "#1a3a6b") : theme.cardBg, color: on ? (theme.darkMode ? "#111827" : "#fff") : theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          {x.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map((row) => {
                const open = openRow === row.id;
                return (
                  <div key={row.id} style={{ borderRadius: 10, background: open ? theme.cardBg : soft, border: `1px solid ${open ? (theme.darkMode ? "#5b8def" : "#c7d7fe") : "transparent"}`, boxShadow: open ? "0 2px 10px rgba(37,99,235,0.08)" : "none" }}>
                    <div role="button" tabIndex={0} onClick={() => { setOpenRow(open ? "" : row.id); if (!open) onTab(row.id); }} onKeyDown={(e) => { if (e.key === "Enter") { setOpenRow(open ? "" : row.id); if (!open) onTab(row.id); } }}
                      style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 50, padding: "6px 12px", cursor: "pointer", userSelect: "none" }}>
                      {icon(row.id)}
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                        <b style={{ fontSize: 14, color: theme.textPrimary, opacity: row.on ? 1 : 0.55 }}>{row.label}</b>
                        {row.sum && <small style={{ fontSize: 11.5, color: theme.textSecondary, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.sum}</small>}
                      </span>
                      <span style={{ color: theme.textSecondary, fontSize: 12 }}>{open ? "▾" : "▸"}</span>
                      {toggle(row.on, row.flip)}
                    </div>
                    {open && <div style={{ padding: "2px 12px 14px 44px" }}>{row.body}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: "12px 18px 18px", borderTop: `1px solid ${theme.border}` }}>
            <StepTitle theme={theme} n={3} label="AI로 작성" state={allBusy ? "now" : (article || blog || hasYoutube || Object.values(snsData?.channels || {}).some((c) => c?.post)) ? "done" : "todo"} />
            <button type="button" onClick={() => void runAll()} disabled={Boolean(allBusy)} title="켜 둔 글을 글마다 고른 설정으로 한 번에 씁니다"
              style={{ width: "100%", height: 50, borderRadius: 12, border: 0, background: allBusy ? "#94a3b8" : "#2563eb", color: "#fff", fontSize: 16, fontWeight: 800, cursor: allBusy ? "default" : "pointer" }}>
              {allBusy ? "쓰는 중…" : `✨ ${count}개 한 번에 쓰기`}
            </button>
            <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, textAlign: "center", fontWeight: allBusy || allMsg ? 700 : 500,
              color: allBusy ? (theme.darkMode ? "#93c5fd" : "#1a3a6b") : allMsg ? (/못했|모자|다시 켜|오류|없|골라/.test(allMsg) ? "#dc2626" : "#16a34a") : theme.textSecondary }}>
              {allBusy ? `${aiName} · ${allBusy}` : allMsg || "켜 둔 글을 글마다 설정대로 한 번에 씁니다"}
            </div>
          </div>
        </aside>

        {/* 가운데 — [분석 내용] | 글마다 결과 */}
        <main data-ai-dock="" style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "16px 28px 28px", background: theme.darkMode ? undefined : "#f4f6f9" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, position: "sticky", top: -16, zIndex: 5, padding: "8px 0", background: theme.darkMode ? theme.bg : "#f4f6f9" }}>
            {tabs.map((t) => {
              const on = cur === t.id;
              const src = t.id === "source";
              return (
                <button key={t.id} type="button" onClick={() => { onTab(t.id); if (rows.some((r) => r.id === t.id)) setOpenRow(t.id); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 18, cursor: "pointer", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap",
                    border: `1px solid ${on ? (src ? "#9a3412" : theme.darkMode ? "#fff" : "#111827") : src ? "#fdba74" : theme.border}`,
                    background: on ? (src ? "#9a3412" : theme.darkMode ? "#fff" : "#111827") : src ? (theme.darkMode ? "rgba(253,186,116,0.12)" : "#fff7ed") : theme.cardBg,
                    color: on ? (theme.darkMode && !src ? "#111827" : "#fff") : src ? "#c2410c" : theme.textSecondary }}>
                  {!src && <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.done ? "#10b981" : theme.darkMode ? "#4b5563" : "#d1d5db" }} />}
                  {t.label}
                </button>
              );
            })}
          </div>

          {cur === "source" && analysis}
          {cur === "article" && (
            <StudioArticlePanel view="result" theme={theme} vacancyId={workId} article={article} onArticle={setArticle} column={column}
              oneShot pick={all.article} onPick={(k, l) => keepAll({ ...all, article: { ...all.article, kind: k, length: l } })}
              autoCover={all.article.autoCover === true} onAutoCover={(v) => keepAll({ ...all, article: { ...all.article, autoCover: v } })}
              onSend={() => void sendArticle()} writeBtn={writeBtn} />
          )}
          {cur === "youtube" && (
            <StudioYoutubePanel view="result" key={ytVer} theme={theme} vacancyId={workId} onUsed={onUsed} onScript={setHasYoutube}
              oneShot remembered={all.youtube} onPick={(p) => keepAll({ ...all, youtube: { ...all.youtube, ...p } })} writeBtn={writeBtn} pubAt={pubDates.youtube} />
          )}
          {channels.find((c) => c.id === cur) && (
            <StudioSnsPanel view="result" theme={theme} channel={cur} info={channels.find((c) => c.id === cur)!} vacancyId={workId}
              data={snsData} onData={setSnsData} onUsed={onUsed}
              oneShot tones={snsTones} onTone={(t) => setTone(cur, t)} writeBtn={writeBtn} pubAt={pubDates[cur]} column={column} />
          )}
          {cur === "blog" && (<>
            <div style={card}>
              {!blog && <div style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 1.7 }}>아직 블로그 글을 쓰지 않았어요. 왼쪽에서 문체·글자 수를 고르고 <b>[✨ 한 번에 쓰기]</b>, 또는 아래 <b>[이 블로그만 쓰기]</b>를 누르세요.</div>}
              {blogProgress && <div style={{ marginTop: 12, fontSize: 14, color: navy, fontWeight: 600 }}>{blogProgress}</div>}
              {blogError && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{blogError}</div>}
              {!blog && writeBtn && <div style={{ marginTop: 14 }}>{writeBtn}</div>}
              {blog && <StudioBlogEditor key={`${blog.vacancyId}-${blog.version || blog.title}`} theme={theme} initial={blog} />}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary, margin: "6px 0 8px 2px" }}>네이버 블로그 채우기</div>
            <div style={{ ...card, opacity: blog ? 1 : 0.6 }}>{naverBlock(blog ? writeBtn : null)}</div>
          </>)}
        </main>
      </div>
    );
  }

  return (
    <>
      {/* 작업 파일 — [저장하기] · [다른 이름으로 저장] · [불러오기] */}
      <WorkFileBar theme={theme} workId={workId} />
      {/* 2단계 표시 — 위 ① 공실 다음은 여기 (2026-10-28 사장님) */}
      {kind !== "sim" && (
        <div id="gs-step-2" style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0 4px 2px", scrollMarginTop: 16 }}>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>쓸 글 고르기</span>
          <span style={{ fontSize: 12.5, color: theme.textSecondary }}>☑ 한 글을 오른쪽 [한 번에 쓰기]로 함께 써요 · 하나만 쓰려면 아래 칸 오른쪽 위 [이 ○○만 쓰기]</span>
        </div>
      )}
      {/* 채널 탭 — 탭에서는 스타일만 고르고, 오른쪽 끝 [한 번에 쓰기]로 ☑ 한 글을 함께 쓴다 (2026-10-23 사장님) */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: `1px solid ${theme.border}`, marginBottom: allBusy || allMsg ? 8 : 16 }}>
        <div style={{ display: "flex", gap: 4, flex: 1, minWidth: 0, overflowX: "auto", scrollbarWidth: "none" }}>
          {[{ id: "article", label: "공실뉴스 기사", done: Boolean(article), part: "article" as const }, { id: "blog", label: "네이버 블로그", done: Boolean(blog), part: "blog" as const }, ...channels.map((c) => ({ id: c.id, label: c.label, done: Boolean(snsData?.channels[c.id]?.post), part: "sns" as const })), { id: "youtube", label: "쇼츠릴스 대본", done: hasYoutube, part: "youtube" as const }].map((t) => (
            <div key={t.id} role="button" tabIndex={0} onClick={() => onTab(t.id)} onKeyDown={(e) => e.key === "Enter" && onTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 16px", cursor: "pointer", fontSize: 14.5, whiteSpace: "nowrap", userSelect: "none",
                fontWeight: tab === t.id ? 800 : 600, color: tab === t.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.textSecondary,
                borderBottom: `3px solid ${tab === t.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : "transparent"}`, marginBottom: -1 }}>
              {oneShot && t.part && (
                <input type="checkbox" checked={all[t.part].on} disabled={Boolean(allBusy)} title={t.part === "sns" ? "함께 쓰기 (인스타그램·스레드·페이스북은 같이)" : "함께 쓰기"}
                  onClick={(e) => e.stopPropagation()} onChange={(e) => keepAll({ ...all, [t.part!]: { ...all[t.part!], on: e.target.checked } })}
                  style={{ margin: 0, width: 15, height: 15, cursor: "pointer", accentColor: "#16a34a" }} />
              )}
              {t.label}
              {t.done && <span style={{ fontSize: 11, fontWeight: 800, color: "#16a34a" }}>✓</span>}
            </div>
          ))}
        </div>
        {oneShot && (
          <button type="button" onClick={() => void runAll()} disabled={Boolean(allBusy)} title="☑ 한 탭의 글을 각 탭에서 고른 스타일로 한 번에 씁니다"
            style={{ flexShrink: 0, marginBottom: 6, padding: "9px 18px", borderRadius: 8, border: 0, background: allBusy ? "#94a3b8" : "#16a34a", color: "#fff", fontSize: 14, fontWeight: 800, cursor: allBusy ? "default" : "pointer", whiteSpace: "nowrap" }}>
            {allBusy ? "쓰는 중…" : `☑ ${(all.article.on ? 1 : 0) + (all.blog.on ? 1 : 0) + (all.sns.on ? channels.length : 0) + (all.youtube.on ? 1 : 0)}개 한 번에 쓰기`}
          </button>
        )}
      </div>
      {oneShot && (allBusy || allMsg) && (
        <div style={{ marginBottom: 14, fontSize: 13.5, fontWeight: 700, textAlign: "right", color: allBusy ? (theme.darkMode ? "#93c5fd" : "#1a3a6b") : /못했|모자|다시 켜|오류|없|골라/.test(allMsg) ? "#dc2626" : "#16a34a" }}>
          {allBusy ? `${aiName} · ${allBusy}` : allMsg}
        </div>
      )}

      {/* 이 글만 쓰기 — 각 패널 아래 버튼 줄 맨 앞 ([글 복사] 앞, 2026-10-29 사장님: 위에 있으면 헷갈린다). 인스타·스레드·페북은 SNS 세 채널을 같이 */}
      {tab === "article" && (
        <StudioArticlePanel theme={theme} vacancyId={workId} article={article} onArticle={setArticle} column={column}
          oneShot={oneShot} pick={all.article} onPick={(k, l) => keepAll({ ...all, article: { ...all.article, kind: k, length: l } })}
          autoCover={all.article.autoCover === true} onAutoCover={(v) => keepAll({ ...all, article: { ...all.article, autoCover: v } })}
          onSend={() => void sendArticle()} writeBtn={writeBtn} />
      )}

      {tab === "youtube" && (needArticle
        ? <div style={{ ...card, fontSize: 14, color: theme.textSecondary }}>먼저 <b>[공실뉴스 기사]</b> 탭에서 기사를 써 주세요. 대본은 그 기사를 바탕으로 씁니다.</div>
        : <StudioYoutubePanel key={ytVer} theme={theme} vacancyId={workId} onUsed={onUsed} onScript={setHasYoutube}
            oneShot={oneShot} remembered={all.youtube} onPick={(p) => keepAll({ ...all, youtube: { ...all.youtube, ...p } })} writeBtn={writeBtn} />)}

      {channels.some((c) => c.id === tab) && needArticle && (
        <div style={{ ...card, fontSize: 14, color: theme.textSecondary }}>먼저 <b>[공실뉴스 기사]</b> 탭에서 기사를 써 주세요. SNS 글은 그 기사를 바탕으로 씁니다.</div>
      )}
      {tab !== "blog" && !needArticle && channels.find((c) => c.id === tab) && (
        <StudioSnsPanel theme={theme} channel={tab} info={channels.find((c) => c.id === tab)!} vacancyId={workId}
          data={snsData} onData={setSnsData} onUsed={onUsed}
          oneShot={oneShot} tones={snsTones} onTone={(t) => keepAll({ ...all, sns: { ...all.sns, tones: { ...snsTones, [tab]: t } } })} writeBtn={writeBtn} />
      )}

      {tab === "blog" && (<>
        {/* 블로그 쓰기 */}
        {/* 공실뉴스는 쓰기가 ② 쓸 글 고르기에 들어가므로 제목 없이, 채우기가 ③ (2026-10-28 사장님) */}
        {kind === "sim" && stepTitle(firstStep, "블로그 쓰기")}
        <div style={card}>
          {needArticle ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>먼저 <b>[공실뉴스 기사]</b> 탭에서 기사를 써 주세요. 블로그는 그 기사를 바탕으로 씁니다.</div>
          ) : (
            <>
              {/* 제목 — 기사·대본 탭과 같게 (아래 [이 블로그만 쓰기]와 한 줄, 2026-10-28 사장님) */}
              <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 12 }}>네이버 블로그 스타일</div>
              {blogControls(false)}
              <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>{oneShot ? "문체·글자 수를 고르고 아래 [이 블로그만 쓰기], 또는 ☑ 한 글을 함께 [한 번에 쓰기]를 누르세요." : `${aiName}가 씁니다. 1~2분 걸립니다.`}</div>
            </>
          )}
          {blogProgress && <div style={{ marginTop: 12, fontSize: 14, color: (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontWeight: 600 }}>{blogProgress}</div>}
          {blogError && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{blogError}</div>}

          {!blog && !needArticle && writeBtn && <div style={{ marginTop: 14 }}>{writeBtn}</div>}
          {blog && <StudioBlogEditor key={`${blog.vacancyId}-${blog.version || blog.title}`} theme={theme} initial={blog} />}
          {blog && writeBtn && <div style={{ marginTop: 14 }}>{writeBtn}</div>}
        </div>

        {/* 네이버 블로그 채우기 */}
        {stepTitle(kind !== "sim" ? 3 : firstStep + 1, "네이버 블로그 채우기")}
        <div style={{ ...card, opacity: blog ? 1 : 0.6 }}>
          {naverBlock()}
        </div>
      </>)}
    </>
  );
}

/** 작업 파일(.gsn) 줄 — [저장하기] · [다른 이름으로 저장] · [불러오기]. 채널 탭 위, 그리고 인테리어·리모델링은 결과 전에도 (2026-10-24 사장님) */
export function WorkFileBar({ theme, workId }: { theme: Theme; workId: string }) {
  // 작업 파일 — [저장하기] · [불러오기] (저절로 저장도 그대로, 2026-10-23 사장님)
  const [saved, setSaved] = useState<WorkSaved | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  useEffect(() => {
    const w = bridge()?.work;
    if (!w) return;
    const load = () => w.status(workId).then(setSaved).catch(() => {});
    load();
    const t = setInterval(load, 8000); // 저절로 저장된 시각도 따라가게
    return () => clearInterval(t);
  }, [workId]);
  // 오른쪽 단계 막대 아래에도 "자동 저장됨" 보이기 (2026-10-28 사장님)
  useEffect(() => { window.dispatchEvent(new CustomEvent("gs-saved", { detail: saved?.file ? saved.savedAt : "" })); }, [saved]);
  const saveNow = async () => {
    const w = bridge()?.work;
    if (!w) return;
    setSaveMsg("");
    const r = await w.save(workId).catch(() => null);
    if (r && r.file) { setSaved(r); setSaveMsg("저장했어요"); setTimeout(() => setSaveMsg(""), 2500); }
    else setSaveMsg("아직 저장할 내용이 없어요. 분석·캡처나 글쓰기를 먼저 해 주세요.");
  };
  // 다른 이름으로 저장 — 윈도우 저장 창에서 자리·이름을 고르면 앞으로 그 파일에 저장 (2026-10-24 사장님)
  const saveAs = async () => {
    const w = bridge()?.work;
    if (!w?.saveAs) return;
    setSaveMsg("");
    const r = await w.saveAs(workId).catch(() => null);
    if (r?.canceled) return;
    if (r && r.file) { setSaved(r); setSaveMsg("저장했어요"); setTimeout(() => setSaveMsg(""), 2500); }
    else setSaveMsg("아직 저장할 내용이 없어요. 분석·캡처나 글쓰기를 먼저 해 주세요.");
  };
  // 맨 위 제목 줄 오른쪽 자리(#gs-workfile-slot)가 있으면 거기에 그린다 (2026-10-28 사장님: 저장은 위로)
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => { setSlot(document.getElementById("gs-workfile-slot")); }, []);
  if (!bridge()?.work) return null;
  // [파일 ▾] 하나로 묶는다 — 저장하기 · 다른 이름으로 저장 · 불러오기 · 파일 위치 (2026-11-03 사장님 시안: 단추 5개가 복잡)
  const item = (label: string, title: string, fn: () => void) => (
    <button type="button" key={label} title={title} onClick={() => { setMenu(false); fn(); }}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: 0, background: "transparent", color: theme.textPrimary, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.darkMode ? "rgba(255,255,255,0.08)" : "#f3f4f6")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{label}</button>
  );
  const bar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: slot ? 0 : 8, fontSize: 12.5, color: theme.textSecondary, position: "relative" }}>
      {saveMsg ? <span style={{ color: /없어요/.test(saveMsg) ? "#c2410c" : "#16a34a", fontWeight: 700 }}>{saveMsg}</span>
        : saved?.file ? <span title={`${saved.file}
고치면 3초 뒤 저절로 저장돼요`}>✓ 자동 저장 · {hhmm(saved.savedAt)}</span> : <span>아직 저장 안 됨</span>}
      <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} title="작업 파일(.gsn)"
        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>파일 ▾</button>
      {menu && (<>
        <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 41, minWidth: 190, padding: "6px 0", borderRadius: 10, background: theme.cardBg, border: `1px solid ${theme.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}>
          {item("저장하기", ".gsn 작업 파일로 지금 저장 (바뀌면 저절로도 저장돼요)", () => void saveNow())}
          {bridge()?.work?.saveAs && item("다른 이름으로 저장…", "저장할 자리와 파일 이름을 골라 저장 (앞으로 그 파일에 저장돼요)", () => void saveAs())}
          {item("불러오기…", "저장해 둔 .gsn 작업 파일 열기", () => void bridge()?.work?.open())}
          {saved?.file && item("파일 위치 열기", saved.file, () => void bridge()?.work?.show(saved.file))}
        </div>
      </>)}
    </div>
  );
  return slot ? createPortal(bar, slot) : bar;
}

/** 오른쪽에 떠 있는 단계 이동 막대 — ① 공실(소재) ② 쓸 글 ③ 채우기, 누르면 그 자리로 · 끝난 단계 ✓ (2026-10-28 사장님). 공실뉴스·뉴스칼럼 같이 씀 */
export function StepNav({ theme, tab, onTab, onOpen1, first = "공실 선택 및 분석" }: { theme: Theme; tab: string; onTab: (t: string) => void; onOpen1: () => void; first?: string }) {
  // ③은 지금 탭에 맞게 — 기사는 등록 보내기, 블로그·SNS 는 채우기, 대본은 동영상 (2026-10-28 사장님: 페북이면 페북)
  const third = tab === "article" ? "기사 등록 보내기" : tab === "blog" ? "블로그 채우기" : tab === "instagram" ? "인스타그램 채우기" : tab === "threads" ? "스레드 채우기" : tab === "facebook" ? "페이스북 채우기" : tab === "youtube" ? "동영상 만들기" : "채우기";
  const steps = [{ n: 1, t: first }, { n: 2, t: "쓸 글 고르기" }, { n: 3, t: third }];
  const [on, setOn] = useState(1);
  const [wide, setWide] = useState(true);
  // 단계별 ✓ — ① 분석 끝 · ② 쓴 글 있음 · ③ 네이버에 채움 (StudioChannelTabs 가 "gs-steps" 로 알려 준다)
  const [done, setDone] = useState({ written: false, filled: false });
  useEffect(() => {
    const f = (e: Event) => setDone((e as CustomEvent).detail);
    window.addEventListener("gs-steps", f);
    return () => window.removeEventListener("gs-steps", f);
  }, []);
  const [savedAt, setSavedAt] = useState("");
  useEffect(() => {
    const f = (e: Event) => setSavedAt(String((e as CustomEvent).detail || ""));
    window.addEventListener("gs-saved", f);
    return () => window.removeEventListener("gs-saved", f);
  }, []);
  const isDone = (n: number) => n === 1 || (n === 2 && done.written) || (n === 3 && tab === "blog" && done.filled);
  const go = (n: number) => {
    if (n === 1) onOpen1(); // ①은 분석 내용을 펼쳐서 보여 준다
    let tries = 0;
    const jump = () => {
      const el = document.getElementById(`gs-step-${n}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (tries++ < 20) setTimeout(jump, 60);
    };
    jump();
  };
  useEffect(() => {
    const look = () => {
      setWide(window.innerWidth >= 1500); // 좁으면 본문을 가리므로 숨김
      let cur = 1;
      for (const s of steps) {
        const el = document.getElementById(`gs-step-${s.n}`);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = s.n;
      }
      setOn(cur);
    };
    look();
    document.addEventListener("scroll", look, true);
    window.addEventListener("resize", look);
    return () => { document.removeEventListener("scroll", look, true); window.removeEventListener("resize", look); };
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!wide) return null;
  const navy = theme.darkMode ? "#5b8def" : "#1a3a6b";

  return (
    <div style={{ position: "fixed", right: 28, top: "50%", transform: "translateY(-50%)", zIndex: 30, display: "flex", flexDirection: "column", gap: 4, padding: 8, borderRadius: 14, background: theme.cardBg, border: `1px solid ${theme.border}`, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}>
      {steps.map((s) => {
        const act = on === s.n;
        return (
          <button key={s.n} type="button" onClick={() => go(s.n)} title={isDone(s.n) ? "끝난 단계 — 눌러서 이동" : "눌러서 이동"}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, border: 0, cursor: "pointer", textAlign: "left", background: act ? (theme.darkMode ? "rgba(91,141,239,0.18)" : "#eef3ff") : "transparent", color: act ? navy : theme.textSecondary, fontSize: 13, fontWeight: act ? 800 : 600, whiteSpace: "nowrap" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: act ? navy : "transparent", border: `1.5px solid ${act ? navy : theme.border}`, color: act ? "#fff" : theme.textSecondary, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.n}</span>
            <span style={{ flex: 1 }}>{s.t}</span>
            <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginLeft: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900,
              background: isDone(s.n) ? "#16a34a" : "transparent", border: isDone(s.n) ? 0 : `1.5px dashed ${theme.border}`, color: "#fff" }}>{isDone(s.n) ? "✓" : ""}</span>
          </button>
        );
      })}
      {/* 자동 저장 — 고치면 3초 뒤 작업 파일(.gsn)에 저절로 저장된다 */}
      <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: 4, padding: "8px 12px 2px", fontSize: 12, color: theme.textSecondary, whiteSpace: "nowrap" }} title="고치면 3초 뒤 작업 파일(.gsn)에 저절로 저장돼요">
        {savedAt ? <><span style={{ color: "#16a34a", fontWeight: 800 }}>✓ 자동 저장됨</span> · {hhmm(savedAt)}</> : "자동 저장 준비 중"}
      </div>
    </div>
  );
}

/** 위 가로 한 줄 단계 — ① 공실 고르기 ✓ ── ② 글 쓰기 ── ③ 등록·발행 (2026-11-03 사장님 시안 A3, 오른쪽 떠 있던 StepNav 대신). 누르면 그 단계로 */
/** 왼쪽 칸 제목 — 위 단계 막대와 같은 번호·이름 (2026-11-04 사장님: 왼쪽이 몇 단계인지 안 보임)
 *  done = 초록 ✓ · 회색 글씨 / now = 남색 번호 · 진한 글씨 / todo = 회색 번호 */
export function StepTitle({ theme, n, label, state, style, title }: { theme: Theme; n: number; label: string; state: "done" | "now" | "todo"; style?: React.CSSProperties; title?: string }) {
  return (
    <div title={title} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, ...style }}>
      <StepPill theme={theme} n={n} state={state} />
      <span style={{ fontSize: 14, fontWeight: 800, color: state === "now" ? theme.textPrimary : theme.textSecondary }}>{label}{title ? " ⓘ" : ""}</span>
    </div>
  );
}

/** "Step 1" 알약 (2026-11-04 사장님: 단계는 영어로 Step 1~4) — done 초록 ✓ · now 파랑 · todo 회색 */
function StepPill({ theme, n, state }: { theme: Theme; n: number; state: "done" | "now" | "todo" }) {
  const navy = theme.darkMode ? "#5b8def" : "#2563eb";
  return (
    <span style={{ height: 22, padding: "0 9px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2, flexShrink: 0, whiteSpace: "nowrap",
      background: state === "done" ? "#10b981" : state === "now" ? navy : theme.darkMode ? "#374151" : "#e5e7eb", color: state === "todo" ? theme.textSecondary : "#fff" }}>{state === "done" ? "✓ " : ""}Step {n}</span>
  );
}

export function StepLine({ theme, tab, onTab, onFirst, first = "공실 고르기" }: { theme: Theme; tab: string; onTab: (t: string) => void; onFirst: () => void; first?: string }) {
  const [done, setDone] = useState({ written: false, filled: false });
  useEffect(() => {
    const f = (e: Event) => setDone((e as CustomEvent).detail);
    window.addEventListener("gs-steps", f);
    return () => window.removeEventListener("gs-steps", f);
  }, []);
  const third = tab === "article" ? "기사 등록" : tab === "blog" ? "블로그 채우기" : tab === "youtube" ? "동영상 만들기" : ["instagram", "threads", "facebook"].includes(tab) ? "SNS 올리기" : "등록·발행";
  // 공실(소재)을 고른 뒤에만 이 막대가 보인다 — ①은 늘 ✓, 지금 단계는 보는 탭이 아니라 진행 상태로 (2026-11-04 사장님: ①에 불이 켜져 헷갈림)
  // 4단계 (2026-11-04 사장님): Step 1 공실 고르기 · Step 2 쓸 글 고르기 · Step 3 AI로 작성(한 번에 쓰기) · Step 4 등록·발행
  const cur = done.written ? 4 : 2;
  const toWrite = () => onTab(tab === "source" ? "article" : tab);
  const steps = [
    { n: 1, t: first, ok: true, go: onFirst },
    { n: 2, t: "쓸 글 고르기", ok: done.written, go: toWrite },
    { n: 3, t: "AI로 작성", ok: done.written, go: toWrite },
    { n: 4, t: third, ok: tab === "blog" && done.filled, go: toWrite },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", height: 48, padding: "0 28px", background: theme.cardBg, borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          {i > 0 && <span style={{ width: 56, height: 2, margin: "0 12px", background: steps[i - 1].ok ? "#10b981" : theme.border }} />}
          <button type="button" onClick={s.go} style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", cursor: "pointer", padding: 0, fontSize: 14, fontWeight: cur === s.n ? 800 : 600, color: cur === s.n ? theme.textPrimary : s.ok ? theme.textPrimary : theme.textSecondary }}>
            <StepPill theme={theme} n={s.n} state={s.ok && cur !== s.n ? "done" : cur === s.n ? "now" : "todo"} />
            {s.t}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
