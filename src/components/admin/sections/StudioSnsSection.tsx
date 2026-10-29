"use client";

import MediaEditGrid, { type MediaOp } from "./MediaEditGrid";
import StudioMyVideoPanel from "./StudioMyVideoPanel";
import React, { useCallback, useEffect, useState } from "react";
import { findStudioVacancyByNo, listMyStudioVacancies } from "@/app/actions/studio";
import StudioChannelTabs, { StepNav } from "./StudioChannelTabs";
import StudioColumnSource from "./StudioColumnSource";
import StudioSimSource from "./StudioSimSource";
import { BusyDots, LoadingCover } from "./StudioLoading";

/**
 * SNS뉴스발행 (공실마케팅 앱 전용)
 *
 * 1단계 공실 분석·캡처: 공실을 고르면 앱이 안 보이는 창에서 공실열람을 열어
 * 매물 정보를 읽고, 등록 사진 전부 + 화면 3장(공실열람 검증·지도·로드뷰)을 모은다.
 * 결과는 앱(PC)에 저장되고 기사·블로그·SNS·영상이 함께 쓴다.
 * 3단계 블로그 쓰기: 크롬 확장과 같은 블로그 프롬프트(6문체·글자 수)로 소장님 AI(ChatGPT)가 쓴다.
 * 채널 탭(StudioChannelTabs): 공실뉴스 기사 · 네이버 블로그(③④) · 인스타그램 · 스레드 · 페이스북. ①②는 분석이 끝나면 한 줄로 접힌다.
 * 4단계 네이버 블로그 채우기: 확장과 같은 디자인 4종·사진 배치·출처 블록으로 네이버 글쓰기에 채운다.
 *   발행은 회원이 누른다. 태그는 발행 창이 열릴 때 채워진다.
 * 뉴스칼럼 카테고리(StudioColumnSource): 뉴스·주제를 소재로 확장 뉴스메이커와 같은 기사·블로그·SNS 를 쓴다.
 */

type MediaThumb = { kind: string; caption: string; thumb: string | null; real?: boolean };

type Analysis = {
  vacancyId: string;
  vacancy: { title?: string; priceText?: string; saleKind?: string; fields?: { label: string; value: string }[]; themes?: string[]; infra?: string };
  media: MediaThumb[];
  failures: string[];
  hiddenCount?: number;
};
type Usage = { plan: string; monthLimit: number; monthUsed: number; monthRemaining: number | null; dailyLimit: number | null; todayUsed: number; custom: boolean };
type AiItem = { id: string; name: string; ready: boolean; ok: boolean; account?: string; plan?: string };
type StudioBridge = {
  openAiConnect: () => Promise<void>;
  ai: { list: () => Promise<AiItem[]>; connect: (id: string) => Promise<{ ok: boolean }>; finishLogin: () => Promise<void> };
  blog?: { imageStyles?: (vacancyId?: string) => Promise<{ id: string; label: string }[]> };
  vacancy: { analyze: (id: string) => Promise<Analysis>; load: (id: string) => Promise<Analysis | null>; media?: (id: string, op: MediaOp) => Promise<Analysis>; list?: () => Promise<WorkRow[]>; onProgress: (fn: (t: string) => void) => () => void };
};
/** [공실 바꾸기] 목록 한 줄 — 이 PC에서 작업한 공실 (앱 studio:vacancy-list) */
type WorkRow = { vacancyId: string; no: string; title: string; priceText: string; saleKind: string; thumb: string | null; updatedAt: string; done: Record<string, boolean> };
const DONE_LABELS: [string, string][] = [["article", "기사"], ["blog", "블로그"], ["instagram", "인스타"], ["threads", "스레드"], ["facebook", "페북"], ["youtube", "유튜브"]];
const whenText = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const hm = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `오늘 ${hm}`;
  if (new Date(now.getTime() - 86400000).toDateString() === d.toDateString()) return `어제 ${hm}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};
type VacancyRow = { id: string; vacancy_no: number; building_name?: string | null; trade_type?: string | null; property_type?: string | null; sido?: string; sigungu?: string; dong?: string };
type MyVacancy = { id: string; vacancy_no: number; building_name: string | null; trade_type: string | null; property_type: string | null; deposit: number | null; monthly_rent: number | null; address: string; created_at: string; photo: string | null; photoCount: number };

/* 원 단위 → "3억 5,000만" (공실열람과 같은 표기) */
function won(v: number | null) {
  if (!v) return "";
  const man = Math.floor(v / 10000);
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok && rest) return `${eok}억 ${rest.toLocaleString()}만`;
  if (eok) return `${eok}억`;
  return `${man.toLocaleString()}만`;
}
function priceText(v: MyVacancy) {
  if (v.trade_type === "월세") return `월세 ${won(v.deposit) || "0"} / ${won(v.monthly_rent) || "0"}`;
  return `${v.trade_type || ""} ${won(v.deposit)}`.trim();
}

const bridge = (): StudioBridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: StudioBridge }).gongsilStudio ?? null) : null);

/* 뉴스 카테고리 (2026-10-15 회의: 구성만 먼저, 공실뉴스부터) */
const NEWS_CATEGORIES = [
  { id: "gongsil", label: "공실뉴스", lead: "공실 하나로 공실뉴스 기사·네이버 블로그·SNS 글을 소장님 AI가 씁니다. 등록·발행은 소장님이 누릅니다." },
  { id: "column", label: "뉴스칼럼", lead: "뉴스나 주제 하나로 공실뉴스 기사·네이버 블로그·SNS 글을 소장님 AI가 씁니다. 원문 문장은 옮기지 않고 출처를 밝힙니다." },
  // 편집이 끝난 영상 파일을 그대로 SNS에 (2026-10-29 사장님 — 뉴스칼럼과 인테리어뉴스 사이)
  { id: "myvideo", label: "내 영상 올리기", lead: "편집이 끝난 영상을 다시 굽지 않고 그대로 유튜브·인스타 릴스·스레드·페이스북에 올립니다. 글은 소장님 AI가 쓰고, [게시]는 소장님이 누릅니다." },
  { id: "interior", label: "인테리어뉴스", lead: "실내 사진 한 장으로 인테리어 예측 이미지와 예상 공사비를 만들고, 그 결과로 기사·블로그·SNS·유튜브 대본을 씁니다. (유료회원 전용)" },
  { id: "remodel", label: "리모델링뉴스", lead: "건물 외관 사진 한 장으로 리모델링 예측 이미지와 예상 공사비를 만들고, 그 결과로 기사·블로그·SNS·유튜브 대본을 씁니다. (유료회원 전용)" },
];
const LAST_KEY = "studio_last_vacancy"; // 마지막으로 작업한 공실·탭 (이 기기)
const CATEGORY_KEY = "studio_news_category"; // 마지막으로 연 카테고리
const KIND_LABEL: Record<string, string> = { photo: "등록 사진", proof: "공실열람 검증", map: "지도", roadview: "로드뷰", ai: "AI 생성", upload: "내 사진" };

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };

export default function StudioSnsSection({ theme, memberId }: { theme: Theme; memberId: string }) {
  const [ai, setAi] = useState<AiItem[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [snsUsage, setSnsUsage] = useState<Usage | null>(null);
  const [youtubeUsage, setYoutubeUsage] = useState<Usage | null>(null);
  // 채널 탭 (회의 결정: 공통 ①②를 한 번 하고, 채널마다 탭)
  const [tab, setTab] = useState("article"); // 공실뉴스 기사가 맨 앞
  const [category, setCategoryState] = useState("gongsil"); // 왼쪽 뉴스 카테고리
  // 뉴스칼럼의 채널 탭 — 홈 "내 기사"에서 고른 채널이 있으면 그 탭으로 한 번 연다 (2026-10-28)
  const [columnTab, setColumnTab] = useState(() => {
    try {
      const t = typeof window === "undefined" ? "" : sessionStorage.getItem("gs-column-tab") || "";
      if (t) { sessionStorage.removeItem("gs-column-tab"); return t; }
    } catch {}
    return "article";
  });
  const [simTabs, setSimTabs] = useState<Record<string, string>>({ interior: "article", remodel: "article" }); // 인테리어·리모델링 채널 탭
  const [simAllowed, setSimAllowed] = useState<boolean | null>(null); // 유료회원만 (서버가 알려 줌)
  // 공실 고르기 — "" = 지금 작업(한 줄 요약) · list = [공실 바꾸기] 작업 목록 · new = [+ 새로 작성] ①② (2026-10-24 사장님)
  const [mode, setMode] = useState<"" | "list" | "new">("");
  // .gsn 에서 연 작업 (2026-10-23, docs/2026-10-23_gsn_plan.md) — 앱이 주소 ?gsn=<id> 로 연다.
  // 각 화면이 "이 기기에 기억한 마지막 작업"을 불러오는 길을 그대로 쓴다 — 효과(useEffect)보다 먼저, 처음 그릴 때 기억을 바꿔 둔다
  useState(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    const id = u.searchParams.get("gsn") || "";
    if (!/^[\w-]+$/.test(id)) return "";
    const cat = /^col-/.test(id) ? "column" : /^int-/.test(id) ? "interior" : /^rem-/.test(id) ? "remodel" : "gongsil";
    try {
      localStorage.setItem(CATEGORY_KEY, cat);
      if (cat === "column") localStorage.setItem("studio_last_column", id);
      else if (cat !== "gongsil") localStorage.setItem(`studio_last_sim_${cat}`, id);
      else localStorage.setItem(LAST_KEY, JSON.stringify({ vacancyId: id, picked: null }));
    } catch {}
    u.searchParams.delete("gsn");
    window.history.replaceState(window.history.state, "", u.toString());
    return id;
  });
  const setCategory = (id: string) => {
    setCategoryState(id);
    try {
      localStorage.setItem(CATEGORY_KEY, id);
    } catch {}
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CATEGORY_KEY);
      if (saved && NEWS_CATEGORIES.some((c) => c.id === saved)) setCategoryState(saved);
    } catch {}
  }, []);
  const loadUsage = useCallback(() => {
    fetch("/api/studio/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setUsage(d.usage);
        setSnsUsage(d.snsUsage || null);
        setYoutubeUsage(d.youtubeUsage || null);
        setSimAllowed(typeof d.simAllowed === "boolean" ? d.simAllowed : null);
      })
      .catch(() => {});
  }, []);
  useEffect(() => loadUsage(), [loadUsage]);
  const [mine, setMine] = useState<MyVacancy[] | null>(null);
  const [mineError, setMineError] = useState("");

  const [noInput, setNoInput] = useState("");
  const [picked, setPicked] = useState<VacancyRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [curPicked, setCurPicked] = useState<VacancyRow | null>(null); // 지금 작업 중인 공실 ([취소]하면 되돌린다)
  const [works, setWorks] = useState<WorkRow[] | null>(null);
  const [workQ, setWorkQ] = useState("");
  const [showMedia, setShowMedia] = useState(false); // 요약 줄 [분석 내용 보기]
  const loadWorks = useCallback(() => {
    const b = bridge();
    if (!b?.vacancy.list) return setWorks([]);
    b.vacancy.list().then(setWorks).catch(() => setWorks([]));
  }, []);
  useEffect(() => loadWorks(), [loadWorks]);
  const loadAi = useCallback(async () => {
    const b = bridge();
    if (b) setAi(await b.ai.list());
  }, []);

  useEffect(() => {
    loadAi();
    const onFocus = () => loadAi();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadAi]);

  useEffect(() => {
    listMyStudioVacancies().then((res) => {
      if (res.success) setMine(res.data);
      else {
        setMine([]);
        setMineError(res.error);
      }
    });
  }, [memberId]);



  const pickByNo = async () => {
    setError("");
    const res = await findStudioVacancyByNo(noInput);
    if (!res.success) return setError(res.error);
    choose(res.data as VacancyRow);
  };
  /* 공실을 고르면 — 이 PC에 작업이 있으면 바로 열고, 처음이면 분석·캡처를 저절로 시작 */
  const choose = (v: VacancyRow) => {
    setPicked(v);
    setError("");
    if (works?.some((w) => w.vacancyId === v.id)) void openWork(v.id, v);
    else void analyze(v);
  };
  /* 작업해 둔 공실 열기 — 분석·캡처는 다시 하지 않는다 */
  const openWork = async (id: string, v?: VacancyRow) => {
    const b = bridge();
    if (!b) return;
    const r = await b.vacancy.load(id).catch(() => null);
    if (!r) return v ? analyze(v) : setError("이 공실 작업을 열지 못했어요.");
    const no = Number((r.vacancy.fields || []).find((f) => f.label === "공실광고번호")?.value) || 0;
    const row: VacancyRow = v || { id, vacancy_no: no, building_name: r.vacancy.title || "" };
    setPicked(row);
    await applyResult(r, row);
    chooseTab("article");
  };
  const openList = () => { setMode("list"); setWorkQ(""); loadWorks(); };
  const openNew = () => { setMode("new"); setPicked(null); setNoInput(""); setError(""); };
  const cancelPick = () => { setMode(""); setPicked(curPicked); setError(""); };

  /* 분석 결과를 화면에 올린다 (써 둔 기사·블로그·SNS 는 채널 탭이 불러온다) */
  const applyResult = async (r: Analysis, v: VacancyRow) => {
    setResult(r);
    setMode("");
    setCurPicked(v);
    setShowMedia(false);
    loadWorks();
    // 다른 메뉴(예: 기사쓰기)에 갔다 와도 이어서 보이게 이 기기에 기억한다
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ vacancyId: r.vacancyId, picked: v }));
    } catch {}
  };

  // 돌아오면 마지막 공실과 탭을 다시 불러온다 (분석·캡처는 다시 하지 않는다)
  useEffect(() => {
    const b = bridge();
    if (!b) return;
    let saved: { vacancyId: string; picked: VacancyRow; tab?: string; auto?: boolean } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
      // auto 는 홈 카드에서 막 누른 한 번만 — 지워 두어 다음에 들어올 때 저절로 분석하지 않게
      if (saved?.auto) localStorage.setItem(LAST_KEY, JSON.stringify({ ...saved, auto: undefined }));
    } catch {}
    if (!saved?.vacancyId) return;
    b.vacancy.load(saved.vacancyId).catch(() => null).then(async (r) => {
      if (!r) {
        // 처음 작업하는 공실 — 홈 카드에서 누른 공실로 바로 분석·캡처, 끝나면 누른 채널 탭 (2026-10-29 사장님)
        if (!saved!.auto || !saved!.picked) return;
        setPicked(saved!.picked);
        if (saved!.tab) setTab(saved!.tab);
        await analyze(saved!.picked);
        return;
      }
      // .gsn 에서 연 작업은 고른 공실 정보가 없다 — 불러온 공실 정보로 채운다 (2026-10-23)
      const no = Number((r.vacancy.fields || []).find((f) => f.label === "공실광고번호")?.value) || 0;
      const picked: VacancyRow = saved!.picked || { id: r.vacancyId, vacancy_no: no, building_name: r.vacancy.title || "" };
      setPicked(picked);
      await applyResult(r, picked);
      if (saved!.tab) setTab(saved!.tab);
    }).catch(() => {});
  }, []);
  const chooseTab = (id: string) => {
    setTab(id);
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
      if (saved) localStorage.setItem(LAST_KEY, JSON.stringify({ ...saved, tab: id }));
    } catch {}
  };

  const analyze = async (v: VacancyRow | null = picked) => {
    const b = bridge();
    if (!b || !v) return;
    setBusy(true);
    setError("");
    const off = b.vacancy.onProgress(setProgress);
    try {
      const r = await b.vacancy.analyze(v.id);
      const again = result?.vacancyId === v.id; // [다시 분석·캡처] — 끝나면 모은 사진을 바로 펼쳐 보여 준다
      await applyResult(r, v);
      if (again) setShowMedia(true);
    } catch (e) {
      setError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      off();
      setProgress("");
      setBusy(false);
    }
  };

  /* 공실열람 새 창 — 앱에서는 평소 크롬 새 창, 웹에서는 새 탭 */
  const openGongsil = () => {
    const url = `${window.location.origin}/gongsil`;
    const studio = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => Promise<void> } }).gongsilStudio;
    if (studio?.openInBrowser) studio.openInBrowser(url);
    else window.open(url, "_blank", "noopener");
  };

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const stepTitle = (n: number, t: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{t}</h3>
    </div>
  );
  /* 분석 사진 정리 (2026-10-28 사장님) — 화면은 MediaEditGrid (뉴스칼럼과 같이 씀) */
  const mediaOp = async (op: MediaOp) => {
    const b = bridge();
    if (!result || !b?.vacancy.media) throw new Error("앱을 새 버전으로 다시 켜 주세요.");
    setResult(await b.vacancy.media(result.vacancyId, op));
  };
  // "무엇을 그릴까요?" 추천 — 공실 정보(종류·주변 역·동네·테마)로 바로 만든다, AI 안 씀 (2026-10-28 사장님)
  const aiIdeas = (r: Analysis): string[] => {
    const t = r.vacancy.title || "";
    const dong = (/(\S+동)(?=\s|$)/.exec(t) || [])[1] || "";
    const station = (/지하철역:\s*([^,/]+?역)/.exec(r.vacancy.infra || "") || [])[1]?.replace(/\s*\d+호선/, "").trim() || "";
    const biz = /상가|사무실|오피스(?!텔)|빌딩|건물|공장|창고|토지|지식산업/.test(t);
    const out = biz
      ? [`${t} 건물 외관, 맑은 날 낮, 정면 3/4 시점`, "깔끔하게 정리된 사무 공간 내부, 큰 창으로 들어오는 자연광", "1층 상가 전면 유리창과 보행자가 있는 거리 (간판 글자 없이)"]
      : [`${t} 건물 외관, 맑은 날 낮`, "밝은 채광의 거실과 큰 창, 깔끔한 바닥", "정돈된 주방과 수납공간이 보이는 실내", "아늑한 침실, 부드러운 오후 햇살"];
    if (station) out.push(`${station} 주변 거리와 출구 풍경, 사람들이 오가는 낮`);
    if (dong) out.push(`${dong} 골목과 동네 상권 분위기, 따뜻한 저녁 조명`);
    if (/공원/.test(r.vacancy.infra || "")) out.push("가까운 공원과 산책로, 푸른 나무와 벤치");
    if (/학교|초등/.test(r.vacancy.infra || "")) out.push("등굣길 학교 앞 안전한 보행로, 아침 햇살");
    for (const th of r.vacancy.themes || []) {
      if (/반려/.test(th)) out.push("반려동물과 함께하는 밝은 거실");
      if (/주차/.test(th)) out.push("넓고 정돈된 건물 주차장");
      if (/엘리베이터/.test(th)) out.push("깔끔한 엘리베이터 홀과 복도");
    }
    return Array.from(new Set(out)).slice(0, 8);
  };
  const aiSeed = (r: Analysis) => [r.vacancy.title, r.vacancy.themes?.slice(0, 3).join(" "), "밝은 채광의 실내"].filter(Boolean).join(", ");
  /* 분석 내용 — 모은 사진·화면 (요약 줄 [분석 내용 보기]) */
  const mediaGrid = (r: Analysis) => (
    <>
      <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.7 }}>
        상세 항목 {r.vacancy.fields?.length || 0}개{r.vacancy.themes?.length ? ` · ${r.vacancy.themes.join(" ")}` : ""}
        {r.vacancy.infra ? <div>주변환경: {r.vacancy.infra}</div> : null}
      </div>
      <MediaEditGrid theme={theme} items={r.media} hiddenCount={r.hiddenCount || 0} styleKey={r.vacancyId} ideas={aiIdeas(r)} seed={aiSeed(r)} onOp={mediaOp} />
      {r.failures.length > 0 && <div style={{ marginTop: 12, fontSize: 13, color: "#b45309" }}>못 가져온 것: {r.failures.join(" / ")}</div>}
    </>
  );
  const vacancyLabel = (v: VacancyRow) => `${v.vacancy_no} · ${v.building_name || [v.sigungu, v.dong].filter(Boolean).join(" ") || "이름 없음"}${v.trade_type ? ` · ${v.trade_type}` : ""}`;
  const connectedAi = ai.filter((a) => a.ok);

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* 왼쪽: 작업 메뉴 — 제목·내 AI 연결·카테고리 (메인 메뉴처럼 글자 위주로 얌전하게) */}
      <aside style={{ width: 210, flexShrink: 0, background: theme.cardBg, borderRight: `1px solid ${theme.border}`, padding: "22px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: "0 4px", fontSize: 19, fontWeight: 800, color: theme.textPrimary }}>뉴스·SNS발행</h2>
          {/* 연결되면 초록, 아니면 회색 — 누르면 [내 AI 연결] 창 */}
          <button onClick={() => bridge()?.openAiConnect()} title="내 AI 연결"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: connectedAi.length ? (theme.darkMode ? "rgba(34,197,94,0.12)" : "#ecfdf5") : theme.cardBg, border: `1px solid ${connectedAi.length ? (theme.darkMode ? "rgba(110,231,183,0.6)" : "#6ee7b7") : theme.border}`, color: connectedAi.length ? (theme.darkMode ? "#6ee7b7" : "#047857") : theme.textPrimary }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: connectedAi.length ? "#22c55e" : "#cbd5e1", boxShadow: connectedAi.length ? "0 0 0 3px rgba(34,197,94,0.2)" : "none" }} />
            {connectedAi.length ? `${connectedAi.map((a) => a.name).join(", ")} 연결됨` : "내 AI 연결하기"}
          </button>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
          {NEWS_CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, textAlign: "left", padding: "9px 12px", border: 0, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
                  fontWeight: on ? 700 : 500, color: on ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.textSecondary, background: on ? (theme.darkMode ? "rgba(255,255,255,0.10)" : "rgba(26,58,107,0.08)") : "transparent",
                  boxShadow: on ? `inset 3px 0 0 ${(theme.darkMode ? "#ffffff" : "#1a3a6b")}` : "none" }}>
                <span style={{ flex: 1, whiteSpace: "nowrap" }}>{c.label}</span>
                {/* 유료 회원 전용 표시 — 주황 = 공실뉴스부동산 색 (2026-10-23 사장님) */}
                {(c.id === "interior" || c.id === "remodel") && (
                  <span title="공실마케팅 회원 전용" style={{ flexShrink: 0, padding: "2px 6px", borderRadius: 4, background: "#f97316", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.2, lineHeight: 1.3 }}>Membership</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 오른쪽: 작업 공간 */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>{NEWS_CATEGORIES.find((c) => c.id === category)?.label}</h3>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: theme.textSecondary }}>{NEWS_CATEGORIES.find((c) => c.id === category)?.lead}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* 작업 파일 줄(저장·불러오기)이 여기로 올라온다 — WorkFileBar 가 이 자리에 그린다 (2026-10-28 사장님) */}
          <div id="gs-workfile-slot" />
          {(() => {
            const t = category === "column" ? columnTab : category === "gongsil" ? tab : simTabs[category];
            if (!t || t === "article" || ((category === "interior" || category === "remodel") && !simAllowed)) return null; // 기사 한도는 기사 등록할 때 센다
            const u = t === "blog" ? usage : t === "youtube" ? youtubeUsage : snsUsage;
            const name = t === "blog" ? "블로그" : t === "youtube" ? "유튜브" : "SNS";
            if (!u) return null;
            return u.monthRemaining === null ? (
              <span style={{ fontSize: 13, fontWeight: 700, padding: "8px 12px", borderRadius: 10, background: "#ecfdf5", color: "#047857" }}>
                {name} 무제한{u.dailyLimit !== null ? ` · 오늘 ${u.todayUsed}/${u.dailyLimit}건` : ""}
              </span>
            ) : u.monthRemaining > 0 ? (
              <span style={{ fontSize: 13, fontWeight: 700, padding: "8px 12px", borderRadius: 10, background: "#eff6ff", color: "#1d4ed8" }}>
                이번 주 {name} {u.monthRemaining} / {u.monthLimit}번 남음
              </span>
            ) : (
              <a href="/marketing/pricing" target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 800, padding: "8px 12px", borderRadius: 10, background: "#fef3c7", color: "#b45309", textDecoration: "none" }}>
                {u.monthLimit === 0 ? `${name}는 공실뉴스부동산 회원 기능입니다` : `이번 주 ${u.monthLimit}번을 모두 사용했습니다 · 공실마케팅에서 무제한 →`}
              </a>
            );
          })()}
          </div>
        </div>

        {category === "myvideo" && <StudioMyVideoPanel theme={theme} />}

        {category === "column" && (
          <StudioColumnSource theme={theme} tab={columnTab} onTab={setColumnTab} onUsed={loadUsage} />
        )}

        {(category === "interior" || category === "remodel") && (
          <StudioSimSource key={category} theme={theme} kind={category} allowed={simAllowed} tab={simTabs[category]}
            onTab={(id) => setSimTabs((m) => ({ ...m, [category]: id }))} onUsed={loadUsage} />
        )}

        {category === "gongsil" && (<>
        {/* 지금 작업 — 한 줄 요약. [공실 바꾸기] = 작업 목록 · [다시 분석·캡처] = 같은 공실 사진을 새로 */}
        {result && mode === "" && (<>
          {/* 1단계 표시 — 여기서부터 시작인 걸 알게 (2026-10-28 사장님: 밋밋해서 인지가 안 됨) */}
          <div id="gs-step-1" style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px 2px", scrollMarginTop: 16 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>이 공실로 씁니다</span>
            <span style={{ fontSize: 12.5, color: theme.textSecondary }}>다른 공실은 [공실 바꾸기]</span>
          </div>
          <div style={{ ...card, padding: "16px 20px", position: "relative", minHeight: busy ? 200 : undefined, border: `2px solid ${theme.darkMode ? "#5b8def" : "#1a3a6b"}`, background: theme.darkMode ? "rgba(91,141,239,0.10)" : "#f3f7ff" }}>
            {busy && <LoadingCover theme={theme} title="분석·캡처 중" detail={progress} />}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {result.media.slice(0, 4).map((m, i) => (
                  <div key={i} style={{ width: 58, height: 58, borderRadius: 8, overflow: "hidden", background: "#e5e7eb" }}>
                    {m.thumb && <img src={m.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: theme.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                  {result.vacancy.saleKind && (
                    <span style={{ fontSize: 11.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c" }}>{result.vacancy.saleKind}</span>
                  )}
                  {picked ? vacancyLabel(picked) : result.vacancy.title}
                </div>
                <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                  {result.vacancy.title} · {result.vacancy.priceText} · 사진 {result.media.length}장 분석·캡처 완료
                  {/* 펼침·접기 — 눈에 띄게 테두리 단추로 (2026-10-24 사장님) */}
                  <button onClick={() => setShowMedia((x) => !x)}
                    style={{ marginLeft: 8, padding: "3px 10px", borderRadius: 6, border: `1px solid ${theme.darkMode ? "#ffffff" : "#1a3a6b"}`, background: showMedia ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : "transparent", color: showMedia ? (theme.darkMode ? "#1a3a6b" : "#ffffff") : (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontSize: 12.5, fontWeight: 800, cursor: "pointer", verticalAlign: "middle" }}>
                    {showMedia ? "접기 ▲" : "분석 내용 보기 ▼"}
                  </button>
                </div>
              </div>
              {/* 분석·캡처 중에는 곤색 단추로 눈에 띄게 (2026-10-24 사장님) */}
              <button onClick={() => void analyze(picked)} disabled={busy} title="같은 공실의 사진·화면을 새로 받습니다"
                style={busy
                  ? { padding: "8px 14px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "default" }
                  : { padding: "8px 14px", borderRadius: 8, border: `2px solid ${theme.darkMode ? "#5b8def" : "#1a3a6b"}`, background: theme.darkMode ? "transparent" : "#ffffff", color: theme.darkMode ? "#ffffff" : "#1a3a6b", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                {busy ? <>분석·캡처 중<BusyDots /></> : "↻ 다시 분석·캡처"}
              </button>
              <button onClick={openList}
                style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                공실 바꾸기
              </button>
            </div>
            {error && <div style={{ marginTop: 10, fontSize: 13.5, color: "#c53030" }}>{error}</div>}
            {showMedia && <div style={{ marginTop: 6 }}>{mediaGrid(result)}</div>}
          </div>
        </>)}

        {/* [공실 바꾸기] — 이 PC에서 작업한 공실 목록. 누르면 써 둔 글이 바로 열린다 */}
        {mode === "list" && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <h3 style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>공실 바꾸기</h3>
              <button onClick={openNew}
                style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ 새로 작성</button>
              {result && <button onClick={cancelPick}
                style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>취소</button>}
            </div>
            <input value={workQ} onChange={(e) => setWorkQ(e.target.value)} placeholder="번호·이름으로 찾기"
              style={{ width: "100%", maxWidth: 360, padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary, marginBottom: 10 }} />
            {works === null ? (
              <div style={{ fontSize: 13, color: theme.textSecondary }}>불러오는 중…</div>
            ) : (() => {
              const q = workQ.trim();
              const cur = result?.vacancyId;
              const rows = works
                .filter((w) => !q || `${w.no} ${w.title} ${w.priceText}`.includes(q))
                .sort((x, y) => Number(y.vacancyId === cur) - Number(x.vacancyId === cur)); // 지금 작업을 맨 위로
              if (!rows.length) return <div style={{ fontSize: 13.5, color: theme.textSecondary, padding: "8px 0" }}>{q ? "찾는 공실이 없어요." : "아직 작업한 공실이 없어요. [+ 새로 작성]으로 시작해 주세요."}</div>;
              return (
                <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden", maxHeight: 520, overflowY: "auto" }}>
                  {rows.map((w, i) => {
                    const isCur = w.vacancyId === cur;
                    return (
                      <button key={w.vacancyId} onClick={() => (isCur ? cancelPick() : void openWork(w.vacancyId))}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: 0, borderTop: i ? `1px solid ${theme.border}` : 0, background: isCur ? (theme.darkMode ? "rgba(255,255,255,0.06)" : "#f0f6ff") : theme.cardBg, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                        <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 8, overflow: "hidden", background: "#e5e7eb" }}>
                          {w.thumb && <img src={w.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: theme.textPrimary }}>
                            {w.saleKind && <span style={{ flexShrink: 0, whiteSpace: "nowrap", fontSize: 11, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c" }}>{w.saleKind}</span>}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[w.no, w.title, w.priceText].filter(Boolean).join(" · ")}</span>
                            {isCur && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: "#1a3a6b", color: "#fff" }}>지금 작업</span>}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 12, flexWrap: "wrap" }}>
                            {DONE_LABELS.map(([k, label]) => (
                              <span key={k} style={{ color: w.done[k] ? "#16a34a" : theme.textSecondary, fontWeight: w.done[k] ? 700 : 400, opacity: w.done[k] ? 1 : 0.6 }}>{label}{w.done[k] ? "✓" : ""}</span>
                            ))}
                          </div>
                        </div>
                        <span style={{ flexShrink: 0, fontSize: 12.5, color: theme.textSecondary }}>{whenText(w.updatedAt)}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* [+ 새로 작성] (또는 처음) — ① 공실 고르기 ② 분석·캡처. 고르면 저절로 시작한다 */}
        {(!result || mode === "new") && mode !== "list" && (<>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>{stepTitle(1, "공실 고르기")}</div>
            {!result && works && works.length > 0 && <button onClick={openList}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>작업한 공실 목록</button>}
            {result && <button onClick={cancelPick}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>취소</button>}
          </div>
          {/* 내가 등록한 공실은 셀렉트바로 (기사등록의 "보도 대상 공실 매물"과 같은 모양) */}
          <label style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 6, display: "block" }}>보도 대상 공실 매물</label>
          {mine === null ? (
            <div style={{ fontSize: 13, color: theme.textSecondary }}>불러오는 중…</div>
          ) : mine.length === 0 ? (
            <div style={{ fontSize: 13.5, color: "#b45309", padding: "6px 0" }}>{mineError || "아직 등록한 공실이 없습니다."} 공실등록 메뉴에서 공실을 등록하면 여기에 나옵니다.</div>
          ) : (
            <select value={picked && mine.some((v) => v.id === picked.id) ? picked.id : ""} disabled={busy}
              onChange={(e) => {
                const v = mine.find((x) => x.id === e.target.value);
                if (v) choose(v);
              }}
              style={{ width: "100%", maxWidth: 560, padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, background: theme.cardBg, color: theme.textPrimary }}>
              <option value="">공실을 골라 주세요 ({mine.length}개)</option>
              {mine.map((v) => (
                <option key={v.id} value={v.id}>
                  [{v.trade_type || "-"}] {v.building_name || "무제"} ({v.address || ""}) · {v.vacancy_no}
                </option>
              ))}
            </select>
          )}
          {/* 경매·공매 물건이나 남의 공실은 물건번호로 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: theme.textSecondary }}>또는</span>
            <input value={noInput} onChange={(e) => setNoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && pickByNo()} placeholder="공실번호 또는 경매 관리번호"
              style={{ width: 240, padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary }} />
            <button onClick={pickByNo} disabled={busy} style={{ padding: "9px 14px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>불러오기</button>
            {/* 공실열람을 새 창으로 열어 물건(경매·공매 포함)을 둘러보고 번호를 확인한다 */}
            <button onClick={openGongsil} title="공실열람을 새 창으로 열기"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4l-6 3v13l6-3 6 3 6-3V4l-6 3z" /><path d="M9 4v13M15 7v13" /></svg>
              공실열람
            </button>
          </div>
        </div>

        {/* 2. 분석·캡처 — 고르면 저절로 시작 (멈췄을 때만 버튼으로 다시) */}
        <div style={{ ...card, position: "relative", minHeight: busy ? 200 : undefined }}>
          {busy && <LoadingCover theme={theme} title="분석·캡처 중" detail={progress} />}
          {stepTitle(2, "공실 분석·캡처")}
          {!picked ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>공실을 고르면 분석·캡처가 저절로 시작됩니다. 전에 작업한 공실이면 써 둔 글이 바로 열립니다.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: theme.textPrimary }}>{vacancyLabel(picked)}</span>
                {(busy || error) && (
                  <button onClick={() => void analyze(picked)} disabled={busy}
                    style={{ padding: "10px 18px", background: busy ? "#1a3a6b" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: busy ? "default" : "pointer" }}>
                    {busy ? <>분석·캡처 중<BusyDots /></> : "다시 시도"}
                  </button>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>등록 사진 전부와 화면 3장(공실열람 검증·지도·로드뷰)을 모읍니다. 10초쯤 걸립니다.</div>
            </>
          )}
          {progress && <div style={{ marginTop: 12, fontSize: 14, color: (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontWeight: 600 }}>{progress}</div>}
          {error && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{error}</div>}
        </div>
        </>)}

        {/* 채널 탭 — 공실뉴스 기사 · 네이버 블로그 · 인스타그램 · 스레드 · 페이스북 (고르는 동안은 숨긴다) */}
        {result && mode === "" && <StepNav theme={theme} tab={tab} onTab={chooseTab} onOpen1={() => setShowMedia(true)} />}
        {result && mode === "" && <StudioChannelTabs key={result.vacancyId} theme={theme} workId={result.vacancyId} kind="gongsil" tab={tab} onTab={chooseTab} onUsed={loadUsage} />}
        </>)}
      </div>
      </div>
    </div>
  );
}
