"use client";

import React, { useEffect, useState } from "react";
import ArticleCardGrid from "./ArticleCardGrid";
import { useRouter } from "next/navigation";
import WorkCardGrid, { LinkNotice } from "./WorkCardGrid";
import StudioChannelTabs, { StepLine, StepTitle } from "./StudioChannelTabs";
import { LoadingCover } from "./StudioLoading";
import MediaEditGrid, { type MediaOp } from "./MediaEditGrid";
import { isWebStudio, studioBridge } from "../studio-web";
import { useInnerHistory } from "@/utils/useInnerHistory";

/**
 * 뉴스·SNS발행 > 뉴스칼럼 (크롬 확장 뉴스메이커를 앱으로 옮긴 것)
 *
 * ① 소재 고르기
 *   - 뉴스: 주소 붙여넣기 → [가져오기] (앱이 안 보이는 창에서 본문을 읽는다)
 *           또는 [네이버 뉴스 열기] → 전용 크롬에서 기사를 연 채로 [지금 보는 뉴스 가져오기]
 *           가져온 제목·언론사·본문은 고칠 수 있다. 원문 사진은 쓰지 않는다 (저작권).
 *   - 주제 직접입력: 주제 · 서론 · 본론(최대 5) · 결론 · 참고 메모 (비운 칸은 AI 가 채운다)
 *   - 단지 시세 · 우리동네 시세는 다음 단계 (2026-10-15 회의)
 * 소재를 정하면 칼럼 번호가 생기고, 아래는 공실뉴스와 같은 채널 탭(기사 → 블로그 · SNS)이다.
 * 기사는 원문 문장을 옮기지 않고 "○○ 보도에 따르면"·"(참고: ○○ 보도)"로 출처를 밝힌다 (뉴스메이커 프롬프트 그대로).
 */

type News = { title: string; publisher: string; publishedAt: string; url: string; body: string; truncated?: boolean; shots?: string[] };
type Topic = { subject: string; intro: string; points: string[]; outro: string; memo: string };
type Source = { mode: "news" | "topic"; angle?: string; news?: News; topic?: Topic };
type Column = { id: string; source: Source; label: string; createdAt: string; articleTitle?: string; captures?: { thumb: string | null; caption: string; kind?: string }[]; hiddenCount?: number };
type Bridge = {
  column: {
    media?: (id: string, op: MediaOp) => Promise<Column>; // 기사 화면 정리 (2026-10-28)
    save?: (id: string, p: { title?: string; body?: string; angle?: string; intro?: string; points?: string[]; outro?: string }) => Promise<Column>; // 원문·재료 고치기 (2026-11-06)
    fetchNews: (url: string) => Promise<News>;
    openNews: () => Promise<unknown>;
    grabNews: () => Promise<News>;
    create: (source: Source) => Promise<Column>;
    get: (id: string) => Promise<Column | null>;
    refetch?: (id: string) => Promise<Column>;
    list: (limit?: number) => Promise<Column[]>;
  };
};
// 앱이면 앱, 웹이면 웹 뉴스칼럼 (studio-web — 내 기사로만, 2026-11-04 사장님)
const bridge = (): Bridge | null => studioBridge<Bridge>();
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

const LAST_COLUMN_KEY = "studio_last_column"; // 마지막으로 연 칼럼 (이 기기)
const EMPTY_TOPIC: Topic = { subject: "", intro: "", points: ["", "", ""], outro: "", memo: "" };
const MODES = [
  { id: "news", label: "뉴스", ready: true },
  { id: "topic", label: "주제 직접입력", ready: true },
  { id: "complex", label: "단지 시세", ready: false },
  { id: "local", label: "우리동네 시세", ready: false },
];

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };

function shortDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* 보도일은 "2026.10.15" 처럼 짧게 보여 주고 고칠 수 있게 */
const tidy = (n: News): News => ({ ...n, publishedAt: n.publishedAt ? shortDate(n.publishedAt) : "" });

export default function StudioColumnSource({ theme, tab, onTab, onUsed, onListView, onDesk, memberId, onOpenWork }: { theme: Theme; tab: string; onTab: (id: string) => void; onUsed: () => void; /** 지금 열린 작업 번호 — 위 줄 "자동 저장됨"·[다른 이름으로 저장] (2026-11-10) */ onOpenWork?: (id: string | null) => void; /** 목록 화면인지 — 위에서 폭을 넓힌다 */ onListView?: (on: boolean) => void; /** 작업대 화면인지 — 위에서 여백 없이 꽉 채운다 (2026-11-03 사장님: 공실뉴스 디자인으로) */ onDesk?: (on: boolean) => void; memberId?: string }) {
  const router = useRouter();
  const [column, setColumn] = useState<Column | null>(null);
  // "" = 지금 칼럼(한 줄 요약) · list = [소재 바꾸기] 칼럼 목록 · new = [+ 새로 작성] ① 소재 고르기 (공실뉴스와 같다, 2026-10-24 사장님)
  // 2026-10-29 사장님: 들어오면 목록이 먼저 — [+ 새로 만들기] + 만든 칼럼 카드. 홈 "내 기사"·.gsn 으로 오면 바로 그 칼럼
  // 홈 기사 카드에서 막 눌렀으면 목록을 거치지 않고 바로 그 칼럼으로 (2026-10-30 사장님)
  const [view, setView] = useState<"" | "list" | "new">(() => {
    try { if (typeof window !== "undefined" && localStorage.getItem("studio_open_column")) return ""; } catch {}
    return "list";
  });
  useEffect(() => { onListView?.(view === "list"); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  // 뒤로가기 = 작업 화면 → 목록 (뉴스칼럼·블로그·SNS 글쓰기) — 공실뉴스 작업대와 같게 (2026-11-10 사장님: "뒤로가기하면 이전에 있던 것으로")
  useInnerHistory("col-desk", view !== "list", () => setView("list"), () => { if (column) setView(""); });
  useEffect(() => { onOpenWork?.(view === "" && column ? column.id : null); }, [view, column?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showSource, setShowSource] = useState(false); // 요약 줄 [원문 보기]
  const [refetching, setRefetching] = useState(false);
  const [recent, setRecent] = useState<Column[]>([]);
  const [mode, setMode] = useState<"news" | "topic">("news");
  const [url, setUrl] = useState("");
  const [news, setNews] = useState<News | null>(null);
  const [topic, setTopic] = useState<Topic>(EMPTY_TOPIC);
  const [angle, setAngle] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  /* 원문·글의 재료 고치기 — 뉴스칼럼(기사 제목·본문) · 자유 글쓰기(제목·내 글) · 서론·본론·결론 · 추가 요청 (2026-11-06 사장님: "다 고칠 수 있게") */
  const [ed, setEd] = useState<{ title: string; body: string; angle: string; intro: string; points: string[]; outro: string } | null>(null);
  const [edSaving, setEdSaving] = useState(false);
  useEffect(() => { setEd(null); }, [column?.id]);
  const startEd = () => {
    if (!column) return;
    const s = column.source;
    setEd(s.mode === "news"
      ? { title: s.news?.title || "", body: s.news?.body || "", angle: s.angle || "", intro: "", points: [], outro: "" }
      : { title: s.topic?.subject || "", body: s.topic?.memo || "", angle: s.angle || "", intro: s.topic?.intro || "", points: [...(s.topic?.points || [])], outro: s.topic?.outro || "" });
  };
  const saveEd = async () => {
    const b = bridge();
    if (!column || !ed || !b?.column.save) return;
    setEdSaving(true);
    setError("");
    try {
      const c = await b.column.save(column.id, column.source.mode === "news" ? { title: ed.title, body: ed.body, angle: ed.angle } : ed);
      if (c) setColumn({ ...column, ...c });
      setEd(null);
    } catch (e) { setError(cleanErr(e)); }
    setEdSaving(false);
  };

  // 돌아오면 마지막 칼럼을 다시 연다
  useEffect(() => {
    const b = bridge();
    if (!b) return;
    b.column.list(200).then(setRecent).catch(() => {});
    let id = "";
    try {
      if (localStorage.getItem("studio_open_column")) {
        id = localStorage.getItem(LAST_COLUMN_KEY) || "";
        localStorage.removeItem("studio_open_column");
      }
    } catch {}
    if (id) b.column.get(id).then((c) => (c ? choose(c) : setView("list"))).catch(() => setView("list"));
  }, []);

  const choose = (c: Column) => {
    setColumn(c);
    setView("");
    setShowSource(false);
    // 목록·새로 만든 칼럼에는 기사 화면이 없다 — 하나만 다시 받아 요약 줄 썸네일·[원문 보기]에 쓴다
    if (!c.captures) bridge()?.column.get(c.id).then((full) => full && setColumn((cur) => (cur?.id === full.id ? full : cur))).catch(() => {});
    try {
      localStorage.setItem(LAST_COLUMN_KEY, c.id);
    } catch {}
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(cleanErr(e));
    } finally {
      setBusy("");
    }
  };

  const fetchUrl = () => run("뉴스 본문을 읽는 중… (5~15초)", async () => {
    const b = bridge();
    if (!b) return;
    setNews(tidy(await b.column.fetchNews(url)));
  });
  const openNaverNews = () => run("", async () => {
    await bridge()?.column.openNews();
    setHint("오른쪽 \"공실마케팅\" 크롬 창에서 기사 한 건을 연 뒤 [지금 보는 뉴스 가져오기]를 눌러 주세요.");
  });
  const grab = () => run("보고 있는 뉴스를 읽는 중…", async () => {
    const b = bridge();
    if (!b) return;
    const n = tidy(await b.column.grabNews());
    setNews(n);
    setUrl(n.url);
    setHint("");
  });

  const start = () => run("칼럼을 준비하는 중…", async () => {
    const b = bridge();
    if (!b) return;
    const source: Source = mode === "news" ? { mode, angle, news: news || undefined } : { mode, angle, topic };
    const c = await b.column.create(source);
    choose(c);
    setShowSource(true); // 가져온 원문·기사 화면을 펼친 채로 (2026-10-24 사장님)
    onTab("article");
    b.column.list(200).then(setRecent).catch(() => {});
  });

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const input: React.CSSProperties = { width: "100%", padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit", boxSizing: "border-box" };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: theme.textSecondary, margin: "12px 0 6px", display: "block" };
  const plainBtn: React.CSSProperties = { padding: "9px 14px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
  /* [다시 가져오기] — 같은 기사 주소로 본문·기사 화면을 새로 받고, 끝나면 원문을 펼쳐 보여 준다 */
  const refetch = async () => {
    const b = bridge();
    if (!b?.column.refetch || !column) return;
    setRefetching(true);
    setError("");
    try {
      setColumn(await b.column.refetch(column.id));
      setShowSource(true);
    } catch (e) {
      setError(cleanErr(e));
    } finally {
      setRefetching(false);
    }
  };
  const openList = () => {
    setView("list");
    bridge()?.column.list(200).then(setRecent).catch(() => {});
  };
  // "무엇을 그릴까요?" 추천 — 소재 제목·주제로 바로 (AI 안 씀)
  const columnIdeas = (c: Column): string[] => {
    const t = (c.source.mode === "news" ? c.source.news?.title : c.source.topic?.subject) || c.label || "";
    const head = t.replace(/^\[[^\]]*\]\s*/, "").slice(0, 40);
    return Array.from(new Set([
      `${head} — 기사 내용을 보여 주는 현장 사진`,
      `${head}를 상징하는 도시 풍경, 맑은 날 낮`,
      "기사 주제와 어울리는 사람들의 일상 장면 (얼굴은 멀리, 뒷모습)",
      "부동산 중개사무소 안에서 상담하는 장면, 따뜻한 조명",
      "기사 핵심 숫자를 설명하는 깔끔한 인포그래픽 느낌 (글자 없이)",
    ])).filter(Boolean);
  };
  const openNew = () => {
    setView("new");
    setUrl(""); setNews(null); setTopic(EMPTY_TOPIC); setAngle(""); setHint(""); setError("");
  };
  const ready = mode === "news" ? Boolean(news && news.title.trim() && news.body.trim()) : Boolean(topic.subject.trim());
  const deskOn = Boolean(column) && view === "";
  useEffect(() => { onDesk?.(deskOn); }, [deskOn]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ① 작업대 — 왼쪽 [이 소재 + 쓸 글·글마다 설정 + 한 번에 쓰기] · 가운데 [원문·글의 재료 | 글마다 결과] (공실뉴스와 같은 모양, 2026-11-03 사장님) */}
      {deskOn && column && (() => {
        const n = column.source.news;
        const t = column.source.topic;
        const caps = column.captures || [];
        const isNews = column.source.mode === "news";
        const NAVY = theme.darkMode ? "#5b8def" : "#1a3a6b";
        const soft = theme.darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc";
        const small: React.CSSProperties = { flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${theme.border}`, background: soft, color: theme.textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
        const head = (
          <div>
            <StepTitle theme={theme} n={1} label="소재" state="done" />
            <div style={{ position: "relative", border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, minHeight: refetching ? 150 : undefined }}>
              {refetching && <LoadingCover theme={theme} title="다시 가져오는 중" detail="같은 기사 주소로 본문·기사 화면을 새로 받아요" />}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", background: theme.darkMode ? "#374151" : "#e5e7eb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {caps[0]?.thumb ? <img src={caps[0].thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
                    : <span style={{ fontSize: 11.5, fontWeight: 800, color: isNews ? "#1d4ed8" : "#6d28d9" }}>{isNews ? "뉴스" : "주제"}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{column.label}</div>
                  <div style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 3, lineHeight: 1.45 }}>
                    {isNews ? [n?.publisher, n?.publishedAt].filter(Boolean).join(" · ") || "뉴스" : isWebStudio() ? "자유 글쓰기" : "주제 직접입력"}<br />{isNews ? (caps.length ? `기사 화면 ${caps.length}장` : "기사 화면 없음") : isWebStudio() ? `${String(t?.memo || "").length.toLocaleString("ko-KR")}자 · 사진 ${caps.length}장` : `본론 ${(t?.points || []).filter(Boolean).length}개`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button onClick={() => onTab("source")} style={small}>📋 원문·재료</button>
                {isNews && bridge()?.column.refetch && <button onClick={() => void refetch()} disabled={refetching} title="같은 기사 주소로 본문·기사 화면을 새로 받습니다" style={{ ...small, border: 0, background: NAVY, color: "#fff", fontWeight: 800 }}>{refetching ? "받는 중…" : "↻ 다시 가져오기"}</button>}
                <button onClick={openList} title="다른 소재 고르기" style={{ ...small, flex: 1.5, whiteSpace: "nowrap" }}>다른 소재 고르기</button>
              </div>
              {error && !refetching && <div style={{ marginTop: 8, fontSize: 12.5, color: "#c53030" }}>{error}</div>}
            </div>
          </div>
        );
        const analysis = (
          <div style={{ background: theme.cardBg, borderRadius: 14, border: `1px solid ${theme.border}`, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderBottom: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.textSecondary }}>
              <span style={{ flex: 1 }}>{ed ? "고친 내용은 저장한 뒤 쓰는 글부터 반영돼요." : "AI가 이 내용만 보고 기사·블로그·SNS를 씁니다. 원문 문장은 옮기지 않고 사실만 살려 새로 써요."}</span>
              {bridge()?.column.save && (ed ? (<>
                <button onClick={() => setEd(null)} disabled={edSaving} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>취소</button>
                <button onClick={() => void saveEd()} disabled={edSaving} style={{ padding: "6px 16px", borderRadius: 8, border: 0, background: NAVY, color: "#fff", fontSize: 13, fontWeight: 800, cursor: edSaving ? "default" : "pointer" }}>{edSaving ? "저장 중…" : "저장"}</button>
              </>) : (
                <button onClick={startEd} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>✎ 원문·재료 고치기</button>
              ))}
            </div>
            {error && ed && <div style={{ padding: "8px 18px 0", fontSize: 12.5, color: "#c53030" }}>{error}</div>}
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {ed ? (() => {
                const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 13.5, lineHeight: 1.6, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit" };
                const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: theme.textSecondary, margin: "10px 0 4px" };
                const hasOutline = !isNews && (ed.intro || ed.points.length > 0 || ed.outro);
                return (
                  <div style={{ border: `1px solid ${NAVY}`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ ...lab, marginTop: 0 }}>{isNews ? "기사 제목" : "제목"}</div>
                    <input value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} style={{ ...inp, fontWeight: 700 }} />
                    {hasOutline && (<>
                      <div style={lab}>서론</div>
                      <textarea value={ed.intro} onChange={(e) => setEd({ ...ed, intro: e.target.value })} rows={2} style={{ ...inp, resize: "vertical" }} />
                      {ed.points.map((x, i) => (
                        <React.Fragment key={i}>
                          <div style={lab}>본론 {i + 1}</div>
                          <textarea value={x} onChange={(e) => setEd({ ...ed, points: ed.points.map((y, k) => (k === i ? e.target.value : y)) })} rows={2} style={{ ...inp, resize: "vertical" }} />
                        </React.Fragment>
                      ))}
                      {ed.points.length < 5 && <button onClick={() => setEd({ ...ed, points: [...ed.points, ""] })} style={{ marginTop: 6, padding: "4px 12px", borderRadius: 6, border: `1px dashed ${theme.border}`, background: "transparent", color: theme.textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>+ 본론 더하기</button>}
                      <div style={lab}>결론</div>
                      <textarea value={ed.outro} onChange={(e) => setEd({ ...ed, outro: e.target.value })} rows={2} style={{ ...inp, resize: "vertical" }} />
                    </>)}
                    <div style={lab}>{isNews ? "기사 본문" : hasOutline ? "참고 메모" : "내 글"}</div>
                    <textarea value={ed.body} onChange={(e) => setEd({ ...ed, body: e.target.value })} rows={16} style={{ ...inp, resize: "vertical" }} />
                    <div style={lab}>추가 요청 (AI에게 · 선택)</div>
                    <input value={ed.angle} onChange={(e) => setEd({ ...ed, angle: e.target.value })} placeholder="예: 실수요자 눈높이로, 숫자는 표로" style={inp} />
                  </div>
                );
              })() : (
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 13.5, color: theme.textPrimary, lineHeight: 1.75 }}>
                {isNews ? (<>
                  <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 2 }}>{n?.title}</div>
                  <div style={{ fontSize: 12.5, color: theme.textSecondary, marginBottom: 8, wordBreak: "break-all" }}>{[n?.publisher, n?.publishedAt].filter(Boolean).join(" · ")}{n?.url ? ` · ${n.url}` : ""}</div>
                  <div style={{ whiteSpace: "pre-wrap", maxHeight: 420, overflowY: "auto" }}>{n?.body}</div>
                </>) : (<>
                  <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>{t?.subject}</div>
                  {t?.intro && <div><b>서론</b> {t.intro}</div>}
                  {(t?.points || []).filter(Boolean).map((x, i) => <div key={i}><b>본론 {i + 1}</b> {x}</div>)}
                  {t?.outro && <div><b>결론</b> {t.outro}</div>}
                  {t?.memo && <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}><b>참고 메모</b> {t.memo}</div>}
                </>)}
                {column.source.angle && <div style={{ marginTop: 8, fontSize: 12.5, color: theme.textSecondary }}><b>추가 요청</b> {column.source.angle}</div>}
              </div>
              )}
              {(caps.length > 0 || bridge()?.column.media) && (
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: theme.textPrimary, marginBottom: 4 }}>사진 · 화면 <span style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary }}>글에 들어갈 순서</span></div>
                  {bridge()?.column.media ? (
                    <MediaEditGrid theme={theme} items={caps.map((c) => ({ kind: c.kind || "capture", caption: c.caption, thumb: c.thumb }))} hiddenCount={column.hiddenCount || 0} styleKey={column.id}
                      ideas={columnIdeas(column)} seed={columnIdeas(column)[0] || column.label}
                      note="끌어서 순서를 바꿔요 · 맨 앞이 대표 사진 · 정리한 사진은 기사·블로그·SNS·영상에 바로 들어가요"
                      onOp={async (op) => { const c = await bridge()!.column.media!(column.id, op); if (c) setColumn(c); }} />
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                      {caps.map((c, i) => (
                        <figure key={i} style={{ margin: 0, border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ aspectRatio: "4 / 3", background: "#e5e7eb" }}>{c.thumb && <img src={c.thumb} alt={c.caption} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />}</div>
                          <figcaption style={{ padding: "8px 10px", fontSize: 12, lineHeight: 1.5, color: theme.textSecondary }}>{c.caption}</figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
        return (<>
          <StepLine theme={theme} tab={tab} onTab={onTab} onFirst={() => onTab("source")} first="소재 고르기" />
          <StudioChannelTabs key={column.id} layout="desk" head={head} analysis={analysis} theme={theme} workId={column.id} kind="column" tab={tab} onTab={onTab} onUsed={onUsed} />
        </>);
      })()}

      {/* 칼럼 목록 — 처음 화면 (2026-10-29 사장님: 기사관리처럼). 맨 앞 [+ 새로 만들기], 이어서 이 PC의 칼럼 카드 */}
      {view === "list" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            {column && <button onClick={() => setView("")} style={{ ...plainBtn, padding: "6px 12px", fontSize: 12.5 }}>지금 작업으로 돌아가기</button>}
          </div>
          <LinkNotice darkMode={Boolean((theme as { darkMode?: boolean }).darkMode)} />
          {/* 기사관리 SNS홍보형 카드 그대로 (2026-10-29 사장님: "이것과 똑같아야지") — 기사를 누르면 그 기사의 칼럼 (없으면 만든다) */}
          {/* [새로 만들기] → 기사등록 화면, 등록·취소하면 뉴스·SNS자동화(뉴스칼럼)로 돌아온다 (2026-10-30 사장님) */}
          <ArticleCardGrid theme={theme as unknown as React.ComponentProps<typeof ArticleCardGrid>["theme"]} memberId={memberId} layout="grid" addLabel="새로 만들기" hideDrafts
            onAdd={() => router.push(`?menu=article&action=write&from=column&return=${encodeURIComponent("realty_admin?menu=sns")}`, { scroll: false })}
            onMenuChange={(m) => router.push(`?menu=${m}`, { scroll: false })}
            onOpenColumn={(id, t) => { bridge()?.column.get(id).then((c) => { if (c) { choose(c); onTab(t); } }).catch(() => {}); }} />
          {/* 공실뉴스 기사가 아닌 뉴스·주제로 만든 칼럼 — 기사로 등록하기 전이라 위 카드에 없다 */}
          {/* 웹 — 자유 글쓰기로 만든 글도 여기서 다시 연다 (2026-11-05) */}
          {/* 웹 — [새 기사 작성] › [블로그·SNS로만 쓰기]로 쓴 글(예전 자유 글쓰기 글 포함)을 "SNS 글만"으로 (2026-11-10 사장님: "자유 글쓰기는 없애고") */}
          {!isWebStudio() && recent.some((c) => !(c.source.mode === "news" && c.source.news?.publisher === "공실뉴스")) && ( /* 웹은 "SNS 글만" 메뉴로 따로 (2026-11-10) */
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary, marginBottom: 10 }}>{isWebStudio() ? <>SNS 글만 <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.textSecondary }}>기사 등록 없이 블로그·SNS로만 쓴 글 (기사는 기사관리 작성중에)</span></> : "다른 뉴스·주제로 만든 칼럼"}</div>
              <WorkCardGrid theme={theme} variant="article" addLabel="새로 만들기" onAdd={isWebStudio() ? () => router.push(`?menu=article&action=write&return=${encodeURIComponent("realty_admin?menu=sns")}`, { scroll: false }) : openNew} placeholder={<span style={{ fontSize: 30 }}>📰</span>}
                cards={recent.filter((c) => !(c.source.mode === "news" && c.source.news?.publisher === "공실뉴스")).map((c) => {
                  const x = c as Column & { thumb?: string | null; done?: Record<string, boolean>; articleTitle?: string };
                  const isNews = c.source.mode === "news";
                  return { id: c.id, badge: isNews ? "뉴스" : isWebStudio() ? "SNS 글만" : "주제", date: shortDate(c.createdAt), title: x.articleTitle || c.label,
                    line1: isNews ? (c.source.news?.publisher || "") : (c.source.topic?.subject || ""), thumb: x.thumb || null, done: x.done, current: c.id === column?.id };
                })}
                onOpen={(id, t) => { const c = recent.find((r) => r.id === id); if (c) { choose(c); onTab(t); } }} />
            </div>
          )}
        </div>
      )}

      {/* [+ 새로 작성] (또는 처음) — ① 소재 고르기 */}
      {(!column || view === "new") && view !== "list" && (
        <div style={{ ...card, position: "relative" }}>
          {/* 뉴스 가져오기·칼럼 준비 중 — 흰 막 + 곤색 점 (2026-10-24 사장님). "뉴스 본문을 읽는 중… (5~15초)" → 제목 · 아래 작은 글 */}
          {busy && <LoadingCover theme={theme} title={busy.split("…")[0]} detail={busy.split("…").slice(1).join("…").trim().replace(/^\((.*)\)$/, "$1")} />}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary, flex: 1 }}>소재 고르기</h3>
            {!column && <button onClick={openList} style={{ ...plainBtn, padding: "6px 12px", fontSize: 12.5 }}>← 목록</button>}
            {column && <button onClick={() => setView("")} style={{ ...plainBtn, padding: "6px 12px", fontSize: 12.5 }}>취소</button>}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {MODES.map((m) => {
              const on = mode === m.id;
              return (
                <button key={m.id} disabled={!m.ready} onClick={() => m.ready && setMode(m.id as "news" | "topic")}
                  style={{ padding: "8px 14px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: m.ready ? "pointer" : "default",
                    border: `1px solid ${on ? "#1a3a6b" : theme.border}`, background: on ? "#1a3a6b" : "transparent", color: on ? "#fff" : m.ready ? theme.textPrimary : "#9ca3af" }}>
                  {m.label}{!m.ready && " · 준비 중"}
                </button>
              );
            })}
          </div>

          {mode === "news" ? (
            <>
              <label style={label}>뉴스 주소</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && fetchUrl()}
                  placeholder="https://n.news.naver.com/… 처럼 기사 한 건의 주소를 붙여넣어 주세요" style={input} />
                <button onClick={fetchUrl} disabled={Boolean(busy)} style={plainBtn}>가져오기</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: theme.textSecondary }}>또는</span>
                <button onClick={openNaverNews} disabled={Boolean(busy)} style={plainBtn}>네이버 뉴스 열기</button>
                <button onClick={grab} disabled={Boolean(busy)} style={plainBtn}>지금 보는 뉴스 가져오기</button>
              </div>
              {hint && <div style={{ marginTop: 8, fontSize: 13, color: "#1a3a6b", lineHeight: 1.6 }}>{hint}</div>}

              {news && (
                <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 12, background: theme.bg || "#f6f8fa", border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: theme.textPrimary, marginBottom: 2 }}>가져온 원문 — 고칠 수 있어요</div>
                  <div style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 1.6 }}>
                    AI는 이 원문의 <b>사실만</b> 뽑아 새 문장으로 씁니다. 원문 사진은 쓰지 않아요.
                  </div>
                  {/* 가져올 때 찍은 기사 화면 — 기사·블로그·SNS 사진으로 들어가고 사진마다 출처가 붙는다 (2026-10-23) */}
                  {Boolean(news.shots?.length) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSecondary }}>기사 화면 {news.shots!.length}장</span>
                      {news.shots!.map((u, i) => <img key={i} src={u} alt="" style={{ width: 90, height: 64, objectFit: "cover", objectPosition: "top", borderRadius: 6, border: `1px solid ${theme.border}` }} />)}
                      <span style={{ fontSize: 12, color: theme.textSecondary }}>기사·블로그·SNS 사진으로 들어가요 (사진마다 출처 표시)</span>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 140px", gap: 8, marginTop: 10 }}>
                    <input value={news.publisher} onChange={(e) => setNews({ ...news, publisher: e.target.value })} placeholder="언론사" style={input} />
                    <input value={news.title} onChange={(e) => setNews({ ...news, title: e.target.value })} placeholder="원문 제목" style={input} />
                    <input value={news.publishedAt} onChange={(e) => setNews({ ...news, publishedAt: e.target.value })} placeholder="보도일" style={input} />
                  </div>
                  <textarea value={news.body} onChange={(e) => setNews({ ...news, body: e.target.value })} rows={9}
                    style={{ ...input, marginTop: 8, lineHeight: 1.7, resize: "vertical" }} />
                  <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                    본문 {news.body.length.toLocaleString()}자{news.truncated ? " · 길어서 앞부분만 가져왔습니다" : ""}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <label style={label}>주제</label>
              <input value={topic.subject} onChange={(e) => setTopic({ ...topic, subject: e.target.value })} placeholder="예: 전세 계약 전 꼭 확인할 등기부등본 읽는 법" style={input} />
              <div style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 6 }}>아래 칸은 비워도 됩니다. 적은 칸은 그 순서·내용대로, 비운 칸은 AI가 주제에 맞게 채웁니다.</div>
              <label style={label}>서론</label>
              <input value={topic.intro} onChange={(e) => setTopic({ ...topic, intro: e.target.value })} style={input} />
              {topic.points.map((p, i) => (
                <div key={i}>
                  <label style={label}>본론 {i + 1}</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={p} onChange={(e) => setTopic({ ...topic, points: topic.points.map((x, j) => (j === i ? e.target.value : x)) })} style={input} />
                    {topic.points.length > 1 && (
                      <button onClick={() => setTopic({ ...topic, points: topic.points.filter((_, j) => j !== i) })} title="이 본론 빼기" style={{ ...plainBtn, padding: "9px 11px" }}>✕</button>
                    )}
                  </div>
                </div>
              ))}
              {topic.points.length < 5 && (
                <button onClick={() => setTopic({ ...topic, points: [...topic.points, ""] })} style={{ ...plainBtn, marginTop: 8, fontSize: 12.5, padding: "6px 12px" }}>+ 본론 추가</button>
              )}
              <label style={label}>결론</label>
              <input value={topic.outro} onChange={(e) => setTopic({ ...topic, outro: e.target.value })} style={input} />
              <label style={label}>참고 메모 (사실·숫자·자료)</label>
              <textarea value={topic.memo} onChange={(e) => setTopic({ ...topic, memo: e.target.value })} rows={4}
                placeholder="여기 적은 사실·숫자는 그대로 씁니다. 비우면 널리 확정된 일반 지식으로만 씁니다." style={{ ...input, lineHeight: 1.6, resize: "vertical" }} />
            </>
          )}

          <label style={label}>추가 요청 (선택)</label>
          <input value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="예: 세입자 입장에서, 우리 동네(마포) 독자에게 맞춰" style={input} />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {busy && <span style={{ fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{busy}</span>}
            <button onClick={start} disabled={!ready || Boolean(busy)}
              style={{ marginLeft: "auto", padding: "11px 20px", background: !ready || busy ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: !ready || busy ? "default" : "pointer" }}>
              이 소재로 칼럼 시작
            </button>
          </div>
          {error && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030", lineHeight: 1.6 }}>{error}</div>}

        </div>
      )}

    </>
  );
}
