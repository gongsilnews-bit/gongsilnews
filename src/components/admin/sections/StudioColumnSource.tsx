"use client";

import React, { useEffect, useState } from "react";
import StudioChannelTabs from "./StudioChannelTabs";

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
type Column = { id: string; source: Source; label: string; createdAt: string; articleTitle?: string };
type Bridge = {
  column: {
    fetchNews: (url: string) => Promise<News>;
    openNews: () => Promise<unknown>;
    grabNews: () => Promise<News>;
    create: (source: Source) => Promise<Column>;
    get: (id: string) => Promise<Column | null>;
    list: () => Promise<Column[]>;
  };
};
const bridge = (): Bridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null) : null);
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

const LAST_COLUMN_KEY = "studio_last_column"; // 마지막으로 연 칼럼 (이 기기)
const EMPTY_TOPIC: Topic = { subject: "", intro: "", points: ["", "", ""], outro: "", memo: "" };
const MODES = [
  { id: "news", label: "뉴스", ready: true },
  { id: "topic", label: "주제 직접입력", ready: true },
  { id: "complex", label: "단지 시세", ready: false },
  { id: "local", label: "우리동네 시세", ready: false },
];

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

function shortDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* 보도일은 "2026.10.15" 처럼 짧게 보여 주고 고칠 수 있게 */
const tidy = (n: News): News => ({ ...n, publishedAt: n.publishedAt ? shortDate(n.publishedAt) : "" });

export default function StudioColumnSource({ theme, tab, onTab, onUsed }: { theme: Theme; tab: string; onTab: (id: string) => void; onUsed: () => void }) {
  const [column, setColumn] = useState<Column | null>(null);
  const [open, setOpen] = useState(true); // ① 펼침 — 소재를 정하면 한 줄로 접는다
  const [recent, setRecent] = useState<Column[]>([]);
  const [mode, setMode] = useState<"news" | "topic">("news");
  const [url, setUrl] = useState("");
  const [news, setNews] = useState<News | null>(null);
  const [topic, setTopic] = useState<Topic>(EMPTY_TOPIC);
  const [angle, setAngle] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  // 돌아오면 마지막 칼럼을 다시 연다
  useEffect(() => {
    const b = bridge();
    if (!b) return;
    b.column.list().then(setRecent).catch(() => {});
    let id = "";
    try {
      id = localStorage.getItem(LAST_COLUMN_KEY) || "";
    } catch {}
    if (id) b.column.get(id).then((c) => c && choose(c)).catch(() => {});
  }, []);

  const choose = (c: Column) => {
    setColumn(c);
    setOpen(false);
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
    setHint("오른쪽 \"공실스튜디오\" 크롬 창에서 기사 한 건을 연 뒤 [지금 보는 뉴스 가져오기]를 눌러 주세요.");
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
    onTab("article");
    b.column.list().then(setRecent).catch(() => {});
  });

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const input: React.CSSProperties = { width: "100%", padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit", boxSizing: "border-box" };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: theme.textSecondary, margin: "12px 0 6px", display: "block" };
  const plainBtn: React.CSSProperties = { padding: "9px 14px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
  const ready = mode === "news" ? Boolean(news && news.title.trim() && news.body.trim()) : Boolean(topic.subject.trim());

  return (
    <>
      {/* ① 접힌 요약 */}
      {column && !open && (
        <div style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: column.source.mode === "news" ? "#eff6ff" : "#f5f3ff", color: column.source.mode === "news" ? "#1d4ed8" : "#6d28d9" }}>
            {column.source.mode === "news" ? "뉴스" : "주제"}
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>{column.label}</div>
            {column.source.mode === "news" && column.source.news?.url && (
              <div style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{column.source.news.url}</div>
            )}
          </div>
          <button onClick={() => setOpen(true)} style={plainBtn}>소재 바꾸기</button>
        </div>
      )}

      {(!column || open) && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary, flex: 1 }}>소재 고르기</h3>
            {column && <button onClick={() => setOpen(false)} style={{ ...plainBtn, padding: "6px 12px", fontSize: 12.5 }}>접기</button>}
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
                    AI는 이 원문의 <b>사실만</b> 뽑아 새 문장으로 씁니다. 원문 사진은 쓰지 않고, 기사에 출처를 밝힙니다.
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

          {recent.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>최근 칼럼 (이 PC)</div>
              {recent.map((c) => (
                <button key={c.id} onClick={() => choose(c)}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "8px 10px", border: 0, borderRadius: 8, background: column?.id === c.id ? "rgba(26,58,107,0.08)" : "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: c.source.mode === "news" ? "#1d4ed8" : "#6d28d9", flexShrink: 0 }}>{c.source.mode === "news" ? "뉴스" : "주제"}</span>
                  <span style={{ flex: 1, fontSize: 13.5, color: theme.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.articleTitle || c.label}</span>
                  <span style={{ fontSize: 12, color: theme.textSecondary, flexShrink: 0 }}>{shortDate(c.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {column && <StudioChannelTabs key={column.id} theme={theme} workId={column.id} kind="column" tab={tab} onTab={onTab} onUsed={onUsed} />}
    </>
  );
}
