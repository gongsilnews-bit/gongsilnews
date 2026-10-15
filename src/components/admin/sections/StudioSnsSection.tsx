"use client";

import React, { useCallback, useEffect, useState } from "react";
import { findStudioVacancyByNo, listMyStudioVacancies } from "@/app/actions/studio";
import StudioChannelTabs from "./StudioChannelTabs";
import StudioColumnSource from "./StudioColumnSource";

/**
 * SNS뉴스발행 (공실뉴스 스튜디오 앱 전용)
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

type MediaThumb = { kind: string; caption: string; thumb: string | null };
type Analysis = {
  vacancyId: string;
  vacancy: { title?: string; priceText?: string; saleKind?: string; fields?: { label: string; value: string }[]; themes?: string[]; infra?: string };
  media: MediaThumb[];
  failures: string[];
};
type Usage = { plan: string; monthLimit: number; monthUsed: number; monthRemaining: number | null; dailyLimit: number | null; todayUsed: number; custom: boolean };
type AiItem = { id: string; name: string; ready: boolean; ok: boolean; account?: string; plan?: string };
type StudioBridge = {
  openAiConnect: () => Promise<void>;
  ai: { list: () => Promise<AiItem[]>; connect: (id: string) => Promise<{ ok: boolean }>; finishLogin: () => Promise<void> };
  vacancy: { analyze: (id: string) => Promise<Analysis>; load: (id: string) => Promise<Analysis | null>; onProgress: (fn: (t: string) => void) => () => void };
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
  { id: "interior", label: "인테리어뉴스", lead: "인테리어 사례·시뮬레이션으로 기사와 SNS 글을 씁니다." },
  { id: "remodel", label: "리모델링뉴스", lead: "리모델링 전후·시뮬레이션으로 기사와 SNS 글을 씁니다." },
];
const LAST_KEY = "studio_last_vacancy"; // 마지막으로 작업한 공실·탭 (이 기기)
const CATEGORY_KEY = "studio_news_category"; // 마지막으로 연 카테고리
const KIND_LABEL: Record<string, string> = { photo: "등록 사진", proof: "공실열람 검증", map: "지도", roadview: "로드뷰" };

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function StudioSnsSection({ theme, memberId }: { theme: Theme; memberId: string }) {
  const [ai, setAi] = useState<AiItem[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [snsUsage, setSnsUsage] = useState<Usage | null>(null);
  const [youtubeUsage, setYoutubeUsage] = useState<Usage | null>(null);
  // 채널 탭 (회의 결정: 공통 ①②를 한 번 하고, 채널마다 탭)
  const [tab, setTab] = useState("article"); // 공실뉴스 기사가 맨 앞
  const [category, setCategoryState] = useState("gongsil"); // 왼쪽 뉴스 카테고리
  const [columnTab, setColumnTab] = useState("article"); // 뉴스칼럼의 채널 탭
  const [pickOpen, setPickOpen] = useState(true); // ①② 펼침 — 분석이 끝나면 한 줄로 접는다
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
    setPicked(res.data as VacancyRow);
    setResult(null);
  };

  /* 분석 결과를 화면에 올린다 (써 둔 기사·블로그·SNS 는 채널 탭이 불러온다) */
  const applyResult = async (r: Analysis, v: VacancyRow) => {
    setResult(r);
    setPickOpen(false);
    // 다른 메뉴(예: 기사쓰기)에 갔다 와도 이어서 보이게 이 기기에 기억한다
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ vacancyId: r.vacancyId, picked: v }));
    } catch {}
  };

  // 돌아오면 마지막 공실과 탭을 다시 불러온다 (분석·캡처는 다시 하지 않는다)
  useEffect(() => {
    const b = bridge();
    if (!b) return;
    let saved: { vacancyId: string; picked: VacancyRow; tab?: string } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
    } catch {}
    if (!saved?.vacancyId) return;
    b.vacancy.load(saved.vacancyId).then(async (r) => {
      if (!r) return;
      setPicked(saved!.picked);
      await applyResult(r, saved!.picked);
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

  const analyze = async () => {
    const b = bridge();
    if (!b || !picked) return;
    setBusy(true);
    setError("");
    setResult(null);
    const off = b.vacancy.onProgress(setProgress);
    try {
      const r = await b.vacancy.analyze(picked.id);
      await applyResult(r, picked);
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
              background: connectedAi.length ? "#ecfdf5" : theme.cardBg, border: `1px solid ${connectedAi.length ? "#6ee7b7" : theme.border}`, color: connectedAi.length ? "#047857" : theme.textPrimary }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: connectedAi.length ? "#22c55e" : "#cbd5e1", boxShadow: connectedAi.length ? "0 0 0 3px rgba(34,197,94,0.2)" : "none" }} />
            {connectedAi.length ? `${connectedAi.map((a) => a.name).join(", ")} 연결됨` : "내 AI 연결하기"}
          </button>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
          {NEWS_CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{ textAlign: "left", padding: "9px 12px", border: 0, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
                  fontWeight: on ? 700 : 500, color: on ? "#1a3a6b" : theme.textSecondary, background: on ? "rgba(26,58,107,0.08)" : "transparent",
                  boxShadow: on ? "inset 3px 0 0 #1a3a6b" : "none" }}>
                {c.label}
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
          {(() => {
            const t = category === "column" ? columnTab : tab;
            if ((category !== "gongsil" && category !== "column") || t === "article") return null; // 기사 한도는 기사 등록할 때 센다
            const u = t === "blog" ? usage : t === "youtube" ? youtubeUsage : snsUsage;
            const name = t === "blog" ? "블로그" : t === "youtube" ? "유튜브" : "SNS";
            if (!u) return null;
            return u.monthRemaining === null ? (
              <span style={{ fontSize: 13, fontWeight: 700, padding: "8px 12px", borderRadius: 10, background: "#ecfdf5", color: "#047857" }}>
                {name} 무제한{u.dailyLimit !== null ? ` · 오늘 ${u.todayUsed}/${u.dailyLimit}건` : ""}
              </span>
            ) : u.monthRemaining > 0 ? (
              <span style={{ fontSize: 13, fontWeight: 700, padding: "8px 12px", borderRadius: 10, background: "#eff6ff", color: "#1d4ed8" }}>
                이번 달 {name} {u.monthRemaining}/{u.monthLimit}회 남음
              </span>
            ) : (
              <a href="/study" target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 800, padding: "8px 12px", borderRadius: 10, background: "#fef3c7", color: "#b45309", textDecoration: "none" }}>
                {u.monthLimit === 0 ? `${name}는 부동산회원 기능입니다` : `이번 달 ${u.monthLimit}회를 모두 썼어요 · 공실스터디 멤버십 무제한 →`}
              </a>
            );
          })()}
          </div>
        </div>

        {category === "column" && (
          <StudioColumnSource theme={theme} tab={columnTab} onTab={setColumnTab} onUsed={loadUsage} />
        )}

        {category !== "gongsil" && category !== "column" && (
          <div style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>{NEWS_CATEGORIES.find((c) => c.id === category)?.label} · 준비 중</div>
            <div style={{ marginTop: 8, fontSize: 13.5, color: theme.textSecondary }}>곧 이 자리에서 쓸 수 있게 됩니다.</div>
          </div>
        )}

        {category === "gongsil" && (<>
        {/* ①② 접힌 요약 (분석이 끝나면) */}
        {result && !pickOpen && (
          <div style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {result.media.slice(0, 4).map((m, i) => (
                <div key={i} style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "#e5e7eb" }}>
                  {m.thumb && <img src={m.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                {result.vacancy.saleKind && (
                  <span style={{ fontSize: 11.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c" }}>{result.vacancy.saleKind}</span>
                )}
                {picked ? vacancyLabel(picked) : result.vacancy.title}
              </div>
              <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                {result.vacancy.title} · {result.vacancy.priceText} · 사진 {result.media.length}장 분석·캡처 완료
              </div>
            </div>
            <button onClick={() => setPickOpen(true)}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              공실 바꾸기
            </button>
          </div>
        )}

        {(!result || pickOpen) && (<>
        {/* 1. 공실 고르기 */}
        <div style={card}>
          {stepTitle(1, "공실 고르기")}
          {/* 내가 등록한 공실은 셀렉트바로 (기사등록의 "보도 대상 공실 매물"과 같은 모양) */}
          <label style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 6, display: "block" }}>보도 대상 공실 매물</label>
          {mine === null ? (
            <div style={{ fontSize: 13, color: theme.textSecondary }}>불러오는 중…</div>
          ) : mine.length === 0 ? (
            <div style={{ fontSize: 13.5, color: "#b45309", padding: "6px 0" }}>{mineError || "아직 등록한 공실이 없습니다."} 공실등록 메뉴에서 공실을 등록하면 여기에 나옵니다.</div>
          ) : (
            <select value={picked && mine.some((v) => v.id === picked.id) ? picked.id : ""}
              onChange={(e) => {
                const v = mine.find((x) => x.id === e.target.value);
                if (!v) return;
                setPicked(v);
                setResult(null);
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
            <input value={noInput} onChange={(e) => setNoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pickByNo()} placeholder="공실번호 또는 경매 관리번호"
              style={{ width: 240, padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary }} />
            <button onClick={pickByNo} style={{ padding: "9px 14px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>불러오기</button>
            {/* 공실열람을 새 창으로 열어 물건(경매·공매 포함)을 둘러보고 번호를 확인한다 */}
            <button onClick={openGongsil} title="공실열람을 새 창으로 열기"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4l-6 3v13l6-3 6 3 6-3V4l-6 3z" /><path d="M9 4v13M15 7v13" /></svg>
              공실열람
            </button>
          </div>
        </div>

        {/* 2. 분석·캡처 */}
        <div style={card}>
          {stepTitle(2, "공실 분석·캡처")}
          {!picked ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>먼저 공실을 골라 주세요.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: theme.textPrimary }}>{vacancyLabel(picked)}</span>
                <button onClick={analyze} disabled={busy}
                  style={{ padding: "10px 18px", background: busy ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: busy ? "default" : "pointer" }}>
                  {busy ? "분석·캡처 중…" : result ? "다시 분석·캡처" : "분석·캡처 시작"}
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>등록 사진 전부와 화면 3장(공실열람 검증·지도·로드뷰)을 모읍니다. 10초쯤 걸립니다.</div>
            </>
          )}
          {progress && <div style={{ marginTop: 12, fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{progress}</div>}
          {error && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{error}</div>}

          {result && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: theme.textPrimary }}>{result.vacancy.title}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#2563eb", margin: "4px 0 8px" }}>{result.vacancy.priceText}</div>
              <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.7 }}>
                상세 항목 {result.vacancy.fields?.length || 0}개{result.vacancy.themes?.length ? ` · ${result.vacancy.themes.join(" ")}` : ""}
                {result.vacancy.infra ? <div>주변환경: {result.vacancy.infra}</div> : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
                {result.media.map((m, i) => (
                  <figure key={i} style={{ margin: 0, border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden", background: theme.bg || "#f6f8fa" }}>
                    <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#e5e7eb" }}>
                      {m.thumb && <img src={m.thumb} alt={m.caption} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                      <span style={{ position: "absolute", top: 8, left: 8, fontSize: 11, fontWeight: 800, padding: "3px 7px", borderRadius: 6, background: m.kind === "photo" ? "rgba(0,0,0,0.6)" : "#1a3a6b", color: "#fff" }}>{KIND_LABEL[m.kind] || m.kind}</span>
                    </div>
                    <figcaption style={{ padding: "8px 10px", fontSize: 12, lineHeight: 1.5, color: theme.textSecondary }}>{m.caption}</figcaption>
                  </figure>
                ))}
              </div>
              {result.failures.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 13, color: "#b45309" }}>못 가져온 것: {result.failures.join(" / ")}</div>
              )}
            </div>
          )}
        </div>

        </>)}

        {/* 채널 탭 — 공실뉴스 기사 · 네이버 블로그 · 인스타그램 · 스레드 · 페이스북 */}
        {result && <StudioChannelTabs key={result.vacancyId} theme={theme} workId={result.vacancyId} kind="gongsil" tab={tab} onTab={chooseTab} onUsed={loadUsage} />}
        </>)}
      </div>
      </div>
    </div>
  );
}
