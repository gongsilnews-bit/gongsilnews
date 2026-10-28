"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import StudioBlogEditor, { type BlogDraft } from "./StudioBlogEditor";
import StudioSnsPanel, { type SnsData, type ChannelInfo } from "./StudioSnsPanel";
import ChannelButton from "./ChannelButton";
import StudioArticlePanel from "./StudioArticlePanel";
import StudioYoutubePanel from "./StudioYoutubePanel";
import { useStudioWriter } from "./useStudioWriter";

/**
 * 뉴스·SNS발행의 채널 탭 — 공실뉴스 기사 · 네이버 블로그 · 인스타그램 · 스레드 · 페이스북 · 유튜브 대본
 *
 * 공실뉴스(공실 하나)와 뉴스칼럼(소재 하나)이 함께 쓴다. workId 는 공실 ID 또는 칼럼 번호("col-…")이고,
 * 앱이 번호를 보고 알맞은 프롬프트(매물용·뉴스메이커)로 쓴다. 화면은 같다.
 *  - 블로그 3단계 쓰기(문체·글자 수) → 미리보기 편집기, 4단계 네이버 블로그 채우기(디자인 4종, 발행은 회원이)
 *  - 공실은 글 끝에 매물 정보 출처(표시·광고 필수 정보), 칼럼은 [참고 자료](원문 출처)가 붙는다.
 */

type BlogStyles = { saleKind?: string; styles: { id: string; label: string; fit: string; titleExample: string; design?: string }[]; lengths: { id: string; label: string; chars: string }[] };
type Bridge = {
  ai: { connect: (id: string) => Promise<{ ok: boolean }>; finishLogin: () => Promise<void> };
  naver: {
    designs: () => Promise<{ id: string; label: string; hint: string }[]>;
    fill: (opts: { vacancyId: string; design: string; via?: string }) => Promise<NaverDone>;
    openMyBlog: () => Promise<unknown>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
  sns: { channels: () => Promise<ChannelInfo[]>; get: (vacancyId: string) => Promise<SnsData | null>; writeAll?: (o: Omit<AllOpts, "sns"> & { sns: { on: boolean; tone: Record<string, string>; only?: string }; vacancyId: string }) => Promise<{ article?: BlogDraft; blog?: BlogDraft; sns?: SnsData; youtube?: unknown; miss?: string[] }> };
  article?: { options: (vacancyId: string) => Promise<{ kinds: { id: string; label: string }[]; lengths: { id: string; label: string }[] }> };
  youtube: { get: (vacancyId: string) => Promise<unknown> };
  work?: { save: (id: string) => Promise<WorkSaved>; saveAs?: (id: string) => Promise<WorkSaved & { canceled?: boolean }>; status: (id: string) => Promise<WorkSaved>; show: (file: string) => Promise<void>; open: () => Promise<boolean> };
  blog: {
    styles: (vacancyId?: string) => Promise<BlogStyles>;
    write: (opts: { vacancyId: string; style: string; length: string }) => Promise<BlogDraft>;
    get: (vacancyId: string, doc?: string) => Promise<BlogDraft | null>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
/** 한 번에 쓰기 — 탭마다 "함께 쓰기" 체크 · 기사 스타일·분량 · SNS 문체 (이 PC 에 기억). 블로그 문체·분량은 블로그 탭 값 */
type AllOpts = { article: { on: boolean; kind: string; length: string; autoCover?: boolean }; blog: { on: boolean; style: string; length: string }; sns: { on: boolean; tone?: string; tones?: Record<string, string> }; youtube: { on: boolean; videoType?: string; duration?: string; tone?: string; number?: string } };
// 공실뉴스·뉴스칼럼은 기사 종류·블로그 문체가 달라 따로 기억한다
const allKey = (kind: string) => (kind === "column" ? "gs-allwrite:column" : kind === "sim" ? "gs-allwrite:sim" : "gs-allwrite");
const loadAll = (kind: string): AllOpts => {
  const ALL_KEY = allKey(kind);
  const d: AllOpts = { article: { on: true, kind: "news", length: "normal" }, blog: { on: true, style: "", length: "normal" }, sns: { on: true, tone: "polite" }, youtube: { on: false } };
  try { const v = JSON.parse(localStorage.getItem(ALL_KEY) || "null"); return v ? { article: { ...d.article, ...v.article }, blog: { ...d.blog, ...v.blog }, sns: { ...d.sns, ...v.sns }, youtube: { ...d.youtube, ...v.youtube } } : d; } catch { return d; }
};
const bridge = (): Bridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null) : null);
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

/** 작업 파일(.gsn) 저장 상태 — file 이 비면 아직 파일이 없다 */
type WorkSaved = { file: string; savedAt: string };
const hhmm = (iso: string) => (iso ? new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }) : "");
/** 네이버 채우기 결과 — via: helper(평소 크롬 + 도우미) · manual(복사·사진 폴더) · chrome(전용 크롬) */
type NaverDone = { ok: boolean; imagesInserted: number; imagesTotal: number; design: string; tags: string[]; via?: string; folder?: string; photos?: number; copy?: { title: string; html: string; text: string; tags: string } };

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };

export default function StudioChannelTabs({ theme, workId, kind, tab, onTab, onUsed }: {
  theme: Theme;
  workId: string;
  kind: "gongsil" | "column" | "sim"; // sim = 인테리어·리모델링 시뮬레이션 결과표
  tab: string;
  onTab: (id: string) => void;
  onUsed: () => void;
}) {
  const aiName = useStudioWriter(); // 고른 글쓰기 AI (ChatGPT · Gemini)
  const router = useRouter();
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
  const [all, setAll] = useState<AllOpts>(() => loadAll(kind));
  useEffect(() => setAll(loadAll(kind)), [kind]);
  const [allBusy, setAllBusy] = useState("");
  const [allMsg, setAllMsg] = useState("");
  const [ytVer, setYtVer] = useState(0);
  // 한 번에 쓰기로 대본을 새로 받으면 유튜브 탭을 다시 그린다
  // SNS 문체 — 채널마다 (전에 세 채널 같이 고른 값이 있으면 그것으로 시작)
  const snsTones: Record<string, string> = Object.fromEntries(["instagram", "threads", "facebook"].map((ch) => [ch, all.sns.tones?.[ch] || all.sns.tone || "polite"]));
  const keepAll = (n: AllOpts) => { setAll(n); try { localStorage.setItem(allKey(kind), JSON.stringify(n)); } catch {} };
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
    if (!pick.article.on && !pick.blog.on && !pick.sns.on && !pick.youtube.on) return setAllMsg("탭 이름 옆 ☑ 로 쓸 글을 하나 이상 골라 주세요.");
    setAllBusy("AI에게 보내는 중…");
    setAllMsg("");
    const off = b.blog.onProgress(setAllBusy);
    try {
      const st = blogOpts?.styles.some((x) => x.id === style) ? style : blogOpts?.styles[0]?.id || "";
      const r = await b.sns.writeAll({ vacancyId: workId, ...pick, sns: { on: pick.sns.on, tone: snsTones, only: snsOnly }, blog: { on: pick.blog.on, style: st, length } });
      if (r.article) setArticle({ ...r.article, doc: "article" });
      if (r.blog) { setBlog(r.blog); setNaverDone(null); setDesign(designFor(st)); }
      if (r.sns) setSnsData(r.sns);
      if (r.youtube) { setHasYoutube(true); setYtVer((n) => n + 1); }
      setAllMsg(r.miss?.length ? `${r.miss.join("·")} 글은 읽지 못했어요. 그 탭에서 [이 글만 쓰기]를 다시 눌러 주세요.` : only ? "다 썼어요. 확인하고 고쳐 보세요." : "다 썼어요. 탭마다 확인하고 고쳐 보세요. 한 가지만 다시 쓰려면 그 탭에서 [이 글만 쓰기].");
    } catch (e) {
      setAllMsg(cleanErr(e));
    } finally {
      off();
      setAllBusy("");
      onUsed();
    }
  };
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
      setStyle(opts.styles[0]?.id || "");
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

  /* via — helper(처음 값: 평소 크롬 + 공실마케팅 도우미) · manual(복사·사진 폴더) · ""(전용 크롬, 예전 방식) — 2026-10-23 사장님 */
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
          {[{ id: "article", label: "공실뉴스 기사", done: Boolean(article), part: "article" as const }, { id: "blog", label: "네이버 블로그", done: Boolean(blog), part: "blog" as const }, ...channels.map((c) => ({ id: c.id, label: c.label, done: Boolean(snsData?.channels[c.id]?.post), part: "sns" as const })), { id: "youtube", label: "유튜브 대본", done: hasYoutube, part: "youtube" as const }].map((t) => (
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

      <div style={{ position: "relative", height: 0 }}>
        {/* 이 글만 쓰기 — 아래 카드 오른쪽 위 (한 번에 쓰기와 자리를 나눔, 2026-10-28 사장님) */}
        {oneShot && (() => {
          // 이 글만 쓰기 — 지금 탭 (인스타·스레드·페북은 SNS 세 채널을 같이)
          const ch = channels.find((c) => c.id === tab);
          const part = tab === "article" ? "article" : tab === "blog" ? "blog" : tab === "youtube" ? "youtube" : ch ? (tab as "instagram" | "threads" | "facebook") : null;
          if (!part) return null;
          const label = part === "article" ? "이 기사만 쓰기" : part === "blog" ? "이 블로그만 쓰기" : part === "youtube" ? "이 대본만 쓰기" : `이 ${ch?.label || "SNS"} 글만 쓰기`;
          return (
            <button type="button" onClick={() => void runAll(part)} disabled={Boolean(allBusy)} title={ch ? `${ch.label} 글만 새로 씁니다 (다른 SNS 글은 그대로)` : "이 탭 글만 씁니다"}
              style={{ position: "absolute", right: 22, top: 18, zIndex: 2, padding: "8px 16px", borderRadius: 8, border: `2px solid ${theme.darkMode ? "#5b8def" : "#1a3a6b"}`, background: theme.cardBg, color: allBusy ? theme.textSecondary : (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontSize: 13.5, fontWeight: 800, cursor: allBusy ? "default" : "pointer", whiteSpace: "nowrap" }}>
              {label}
            </button>
          );
        })()}
      </div>
      {tab === "article" && (
        <StudioArticlePanel theme={theme} vacancyId={workId} article={article} onArticle={setArticle} column={column}
          oneShot={oneShot} pick={all.article} onPick={(k, l) => keepAll({ ...all, article: { ...all.article, kind: k, length: l } })}
          autoCover={all.article.autoCover === true} onAutoCover={(v) => keepAll({ ...all, article: { ...all.article, autoCover: v } })}
          onSend={() => router.push(`/realty_admin?menu=article&action=write&studioDraft=${encodeURIComponent(workId)}`)} />
      )}

      {tab === "youtube" && (needArticle
        ? <div style={{ ...card, fontSize: 14, color: theme.textSecondary }}>먼저 <b>[공실뉴스 기사]</b> 탭에서 기사를 써 주세요. 대본은 그 기사를 바탕으로 씁니다.</div>
        : <StudioYoutubePanel key={ytVer} theme={theme} vacancyId={workId} onUsed={onUsed} onScript={setHasYoutube}
            oneShot={oneShot} remembered={all.youtube} onPick={(p) => keepAll({ ...all, youtube: { ...all.youtube, ...p } })} />)}

      {channels.some((c) => c.id === tab) && needArticle && (
        <div style={{ ...card, fontSize: 14, color: theme.textSecondary }}>먼저 <b>[공실뉴스 기사]</b> 탭에서 기사를 써 주세요. SNS 글은 그 기사를 바탕으로 씁니다.</div>
      )}
      {tab !== "blog" && !needArticle && channels.find((c) => c.id === tab) && (
        <StudioSnsPanel theme={theme} channel={tab} info={channels.find((c) => c.id === tab)!} vacancyId={workId}
          data={snsData} onData={setSnsData} onUsed={onUsed}
          oneShot={oneShot} tones={snsTones} onTone={(t) => keepAll({ ...all, sns: { ...all.sns, tones: { ...snsTones, [tab]: t } } })} />
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
              {/* 제목 — 기사·대본 탭과 같게 (오른쪽 위 [이 블로그만 쓰기]와 한 줄, 2026-10-28 사장님) */}
              <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 12 }}>네이버 블로그 스타일</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>문체</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 14 }}>
                {(blogOpts?.styles || []).map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)} title={`예: ${s.titleExample}`}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: style === s.id ? "rgba(26,58,107,0.08)" : "transparent",
                      border: `1px solid ${style === s.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.border}`, color: theme.textPrimary }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{s.fit}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginRight: 4 }}>글자 수</span>
                {(blogOpts?.lengths || []).map((l) => (
                  <button key={l.id} onClick={() => setLength(l.id)}
                    style={{ padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 700,
                      border: `1px solid ${length === l.id ? "#1a3a6b" : theme.border}`, background: length === l.id ? "#1a3a6b" : "transparent", color: length === l.id ? "#fff" : theme.textPrimary }}>
                    {l.label} · {l.chars}
                  </button>
                ))}
                {oneShot ? null : ( /* [이 글만 다시 쓰기]는 뺐다 — 위 ☑ + [한 번에 쓰기]로 (2026-10-24 사장님) */
                  <button onClick={writeBlog} disabled={writing}
                    style={{ marginLeft: "auto", padding: "10px 18px", background: writing ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: writing ? "default" : "pointer" }}>
                    {writing ? `${aiName}가 쓰는 중…` : blog ? "다시 쓰기" : `${aiName}로 블로그 글 쓰기`}
                  </button>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>{oneShot ? "문체·글자 수를 고르고 오른쪽 위 [이 블로그만 쓰기], 또는 ☑ 한 글을 함께 [한 번에 쓰기]를 누르세요." : `${aiName}가 씁니다. 1~2분 걸립니다.`}</div>
            </>
          )}
          {blogProgress && <div style={{ marginTop: 12, fontSize: 14, color: (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontWeight: 600 }}>{blogProgress}</div>}
          {blogError && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{blogError}</div>}

          {blog && <StudioBlogEditor key={`${blog.vacancyId}-${blog.version || blog.title}`} theme={theme} initial={blog} />}
        </div>

        {/* 네이버 블로그 채우기 */}
        {stepTitle(kind !== "sim" ? 3 : firstStep + 1, "네이버 블로그 채우기")}
        <div style={{ ...card, opacity: blog ? 1 : 0.6 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: theme.textSecondary, flex: 1, minWidth: 260, lineHeight: 1.6 }}>
                  평소 쓰는 크롬에 네이버 글쓰기가 열리고 <b>공실마케팅 도우미</b>(크롬 확장)가 제목·본문·사진 {blog.media.length}장·{column ? "참고 자료(원문 출처)" : kind === "sim" ? "AI 예측 안내·출처" : "매물 정보 출처"}가 채워집니다. <b>[발행]은 소장님이 직접</b> 눌러 주세요. 태그는 발행 창이 열릴 때 자동으로 들어갑니다.
                </div>
                <ChannelButton channel="blog" label="네이버 블로그 바로가기" onClick={() => bridge()?.naver.openMyBlog()} />
                <button onClick={() => void fillNaver("helper")} disabled={filling}
                  style={{ padding: "11px 20px", background: filling ? "#94a3b8" : "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: filling ? "default" : "pointer" }}>
                  {filling ? "네이버에 채우는 중…" : "네이버 블로그에 채우기"}
                </button>
              </div>
            </>
          )}
          {naverProgress && <div style={{ marginTop: 12, fontSize: 14, color: (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontWeight: 600 }}>{naverProgress}</div>}
          {naverError && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030", lineHeight: 1.6 }}>{naverError}</div>}
          {naverNoHelper && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => void fillNaver("manual")} disabled={filling}
                style={{ padding: "10px 16px", background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>복사·사진 폴더로 직접 붙여 넣기</button>
              <button onClick={() => void fillNaver("")} disabled={filling} title="예전 방식 — 앱이 따로 띄운 크롬에서 채워요 (네이버 로그인을 그 창에서 한 번 해야 해요)"
                style={{ padding: "10px 16px", background: "transparent", color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>전용 크롬으로 채우기</button>
              <span style={{ fontSize: 12.5, color: theme.textSecondary }}>도우미 설치: 크롬 › 확장 프로그램 › &quot;공실마케팅 도우미&quot;</span>
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
              평소 크롬에 네이버 글쓰기를 열고, 사진 {naverDone.photos || 0}장을 글 순서대로 번호 붙여 폴더에 저장했어요.
              <ol style={{ margin: "8px 0", paddingLeft: 20 }}>
                <li>[제목 복사] → 네이버 제목 칸에 붙여 넣기</li>
                <li>[본문 복사] → 본문 칸에 붙여 넣기 (디자인 그대로, 사진 자리는 <b>[사진 1]</b>처럼 표시)</li>
                <li>폴더의 사진을 [사진 N] 자리에 끌어다 놓고 그 표시는 지우기</li>
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
              {naverDone.folder && <div style={{ marginTop: 8, fontSize: 12.5, color: theme.textSecondary, wordBreak: "break-all" }}>사진 폴더: {naverDone.folder}</div>}
            </div>
          )}
          {naverDone && naverDone.via !== "manual" && (
            <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 14, color: "#065f46", lineHeight: 1.7 }}>
              {naverDone.via === "helper" ? "평소 크롬의 네이버 글쓰기에 도우미가 채웠어요." : "네이버 글쓰기에 채웠습니다."} 사진 {naverDone.imagesInserted}/{naverDone.imagesTotal}장.
              {naverDone.imagesInserted < naverDone.imagesTotal ? " 빠진 사진은 네이버 화면에서 직접 올려 주세요." : ""}
              <br />{naverDone.via === "helper" ? "크롬 창에서" : "오른쪽 크롬 창에서"} 내용을 확인하고 <b>[발행]</b>을 눌러 주세요. 태그 {naverDone.tags.length}개는 발행 창에 자동으로 들어갑니다.
            </div>
          )}
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
  useEffect(() => { setSlot(document.getElementById("gs-workfile-slot")); }, []);
  if (!bridge()?.work) return null;
  const bar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginBottom: slot ? 0 : 8, fontSize: 12.5, color: theme.textSecondary }}>
      {saveMsg ? <span style={{ color: /없어요/.test(saveMsg) ? "#c2410c" : "#16a34a", fontWeight: 700 }}>{saveMsg}</span>
        : saved?.file ? <span title={saved.file}>✓ 저장됨 · {hhmm(saved.savedAt)}</span> : <span>아직 저장 안 됨</span>}
      {saved?.file && <button type="button" onClick={() => void bridge()?.work?.show(saved.file)} title={saved.file}
        style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>파일 위치</button>}
      <button type="button" onClick={() => void saveNow()} title=".gsn 작업 파일로 지금 저장 (바뀌면 저절로도 저장돼요)"
        style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>저장하기</button>
      {bridge()?.work?.saveAs && <button type="button" onClick={() => void saveAs()} title="저장할 자리와 파일 이름을 골라 저장 (앞으로 그 파일에 저장돼요)"
        style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>다른 이름으로 저장</button>}
      <button type="button" onClick={() => void bridge()?.work?.open()} title="저장해 둔 .gsn 작업 파일 열기"
        style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>불러오기</button>
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
