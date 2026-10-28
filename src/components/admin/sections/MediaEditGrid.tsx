"use client";
// 사진 정리 칸 (2026-10-28 사장님) — 공실뉴스 분석 사진 · 뉴스칼럼 기사 화면 같이 쓴다
//  [×] 빼기 · 끌어서 순서 · [+ AI 이미지 만들기](스타일·그릴 내용 추천) · [+ 내 사진 올리기] · 뺀 사진 되살리기. 맨 앞 = 대표 사진
import React, { useEffect, useState } from "react";
import { IMAGE_STYLES } from "@/lib/studio-video/imageStyles";

export type MediaOp = { type: "order"; order: number[] } | { type: "remove"; index: number } | { type: "restore" } | { type: "upload" } | { type: "ai"; prompt: string; ai?: unknown; style?: string; styleLabel?: string; stylePrompt?: string };
type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };
type Item = { kind: string; caption: string; thumb: string | null };
type Bridge = { blog?: { imageStyles?: (id?: string) => Promise<{ id: string; label: string }[]> }; vacancy?: { onProgress: (fn: (t: string) => void) => () => void } };
const bridge = (): Bridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null) : null);

const KIND_LABEL: Record<string, string> = { photo: "등록 사진", proof: "공실열람 검증", map: "지도", roadview: "로드뷰", ai: "AI 생성", upload: "내 사진", capture: "기사 화면" };
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

export default function MediaEditGrid({ theme, items, hiddenCount = 0, styleKey, ideas, seed, onOp, note }: {
  theme: Theme;
  items: Item[];
  hiddenCount?: number;
  /** 그림 스타일 목록을 받을 작업 id (공실 id · 칼럼 id) */
  styleKey: string;
  /** "무엇을 그릴까요?" 추천 문장 */
  ideas: string[];
  /** AI 창을 열 때 처음 칸에 넣을 글 */
  seed: string;
  /** 작업을 앱에 보내고 새 목록으로 바꾼다 */
  onOp: (op: MediaOp) => Promise<void>;
  note?: string;
}) {
  const [dragFrom, setDragFrom] = useState(-1);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [aiAsk, setAiAsk] = useState<string | null>(null);
  const run = async (op: MediaOp) => {
    setErr("");
    setBusy(op.type === "ai" ? "AI가 그림을 그리는 중… (30초~1분)" : op.type === "upload" ? "사진을 넣는 중…" : "저장하는 중…");
    const off = op.type === "ai" ? bridge()?.vacancy?.onProgress((t) => setBusy(t)) || (() => {}) : () => {};
    try {
      await onOp(op);
      if (op.type === "ai") setAiAsk(null);
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };
  const move = (from: number, to: number) => {
    if (from === to || from < 0) return;
    const order = items.map((_, i) => i);
    const [x] = order.splice(from, 1);
    order.splice(to, 0, x);
    void run({ type: "order", order });
  };
  // 그림 스타일 — 블로그 AI 이미지와 같은 목록: 기사용(앱) + 영상 편집기 스타일
  const [artStyles, setArtStyles] = useState<{ id: string; label: string }[]>([]);
  const [aiStyle, setAiStyle] = useState("");
  useEffect(() => {
    if (aiAsk === null || artStyles.length) return;
    bridge()?.blog?.imageStyles?.(styleKey).then((l) => { setArtStyles(l || []); setAiStyle((cur) => cur || l?.[0]?.id || ""); }).catch(() => {});
  }, [aiAsk]); // eslint-disable-line react-hooks/exhaustive-deps
  const styleCards = [
    ...artStyles.map((st) => ({ key: st.id, label: st.label, desc: "기사용 스타일", bg: "linear-gradient(135deg,#1a3a6b,#3b6fb6)", thumb: ["news", "building", "area", "animation", "infographic"].includes(st.id) ? `/studio-styles/${st.id}.jpg` : "" })),
    ...IMAGE_STYLES.map((st) => ({ key: `vs:${st.id}`, label: st.label, desc: st.desc, bg: st.bg, thumb: st.thumb || "" })),
  ];
  const styleOp = () => {
    const vs = aiStyle.startsWith("vs:") ? IMAGE_STYLES.find((x) => x.id === aiStyle.slice(3)) : undefined;
    if (vs) return { styleLabel: vs.label, stylePrompt: vs.prompt };
    const a = artStyles.find((x) => x.id === aiStyle);
    return a ? { style: a.id, styleLabel: a.label } : {};
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
        {items.map((m, i) => (
          <figure key={i} className="gs-media-card" draggable={!busy} onDragStart={() => setDragFrom(i)} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); move(dragFrom, i); setDragFrom(-1); }} title="끌어서 순서를 바꿔요 · 맨 앞이 대표 사진"
            style={{ margin: 0, border: `${dragFrom === i ? 2 : 1}px solid ${dragFrom === i ? "#3b82f6" : theme.border}`, borderRadius: 10, overflow: "hidden", background: theme.bg || "#f6f8fa", cursor: busy ? "wait" : "grab", opacity: busy ? 0.7 : 1 }}>
            <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#e5e7eb" }}>
              {m.thumb && <img src={m.thumb} alt={m.caption} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: m.kind === "capture" ? "top" : "center", display: "block" }} />}
              <span style={{ position: "absolute", top: 8, left: 8, fontSize: 11, fontWeight: 800, padding: "3px 7px", borderRadius: 6, background: m.kind === "ai" ? "#7048e8" : m.kind === "photo" ? "rgba(0,0,0,0.6)" : "#1a3a6b", color: "#fff" }}>{i === 0 ? "대표 · " : ""}{KIND_LABEL[m.kind] || m.kind}</span>
              <button className="gs-media-x" title="이 사진 빼기 (아래에서 되살릴 수 있어요)" disabled={Boolean(busy)} onClick={() => void run({ type: "remove", index: i })}
                style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", border: 0, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 15, fontWeight: 800, lineHeight: 1, cursor: "pointer" }}>×</button>
            </div>
            <figcaption style={{ padding: "8px 10px", fontSize: 12, lineHeight: 1.5, color: theme.textSecondary }}>{m.caption}</figcaption>
          </figure>
        ))}
        <div style={{ border: `2px dashed ${theme.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, minHeight: 180 }}>
          <button disabled={Boolean(busy)} onClick={() => setAiAsk(seed)}
            style={{ flex: 1, border: 0, background: "transparent", cursor: "pointer", color: "#7048e8", fontSize: 14, fontWeight: 800 }}>＋ AI 이미지 만들기</button>
          <div style={{ borderTop: `1px dashed ${theme.border}` }} />
          <button disabled={Boolean(busy)} onClick={() => void run({ type: "upload" })} title="내 PC 의 사진을 골라 넣어요 (여러 장 가능)"
            style={{ flex: 1, border: 0, background: "transparent", cursor: "pointer", color: theme.darkMode ? "#93c5fd" : "#1a3a6b", fontSize: 14, fontWeight: 800 }}>＋ 내 사진 올리기</button>
        </div>
      </div>
      {aiAsk !== null && (
        <div onClick={() => !busy && setAiAsk(null)} style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="AI 이미지 만들기"
            style={{ width: 720, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 48px)", overflowY: "auto", background: theme.cardBg, borderRadius: 16, padding: "22px 24px", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>AI 이미지 만들기</div>
              <button onClick={() => setAiAsk(null)} disabled={Boolean(busy)} aria-label="닫기" style={{ border: 0, background: "transparent", color: theme.textSecondary, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: theme.textSecondary }}>만든 그림은 사진 모음 끝에 "AI 생성" 표시로 붙어요. 대표 사진(맨 앞)은 실제 사진만 돼요.</div>
            <div style={{ marginTop: 16, fontSize: 13.5, fontWeight: 800, color: theme.textPrimary }}>그림 스타일</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6, marginTop: 8 }}>
              {styleCards.map((c) => {
                const on = aiStyle === c.key;
                return (
                  <button key={c.key} type="button" onClick={() => setAiStyle(c.key)} title={c.desc}
                    style={{ position: "relative", height: 56, borderRadius: 8, border: 0, outline: on ? "3px solid #7048e8" : "none", outlineOffset: -3, background: c.thumb ? `center / cover no-repeat url(${c.thumb}), ${c.bg}` : c.bg, cursor: "pointer", overflow: "hidden" }}>
                    <span style={{ position: "absolute", inset: 0, background: on ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.45)" }} />
                    <span style={{ position: "relative", color: "#fff", fontSize: 12.5, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{on ? "✓ " : ""}{c.label}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16, fontSize: 13.5, fontWeight: 800, color: theme.textPrimary }}>무엇을 그릴까요?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {ideas.map((x) => (
                <button key={x} type="button" onClick={() => setAiAsk(x)} title="누르면 아래 칸에 넣어요 (고칠 수 있어요)"
                  style={{ padding: "6px 11px", borderRadius: 999, border: `1px solid ${aiAsk === x ? "#7048e8" : theme.border}`, background: aiAsk === x ? "rgba(112,72,232,0.1)" : "transparent", color: aiAsk === x ? "#7048e8" : theme.textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  {x}
                </button>
              ))}
            </div>
            <textarea value={aiAsk} onChange={(e) => setAiAsk(e.target.value)} rows={3}
              style={{ marginTop: 8, width: "100%", boxSizing: "border-box", fontSize: 14, padding: 10, borderRadius: 10, border: "2px solid #3b82f6", resize: "vertical", background: theme.cardBg, color: theme.textPrimary }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
              {busy && <span style={{ fontSize: 13, fontWeight: 800, color: "#7048e8" }}>{busy}</span>}
              {err && <span style={{ fontSize: 13, fontWeight: 800, color: "#c92a2a" }}>{err}</span>}
              <button onClick={() => setAiAsk(null)} disabled={Boolean(busy)} style={{ marginLeft: "auto", height: 38, padding: "0 18px", borderRadius: 999, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textPrimary, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>취소</button>
              <button onClick={() => void run({ type: "ai", prompt: aiAsk, ...styleOp() })} disabled={Boolean(busy) || !aiAsk.trim()}
                style={{ height: 38, padding: "0 22px", borderRadius: 999, border: 0, background: "#7048e8", color: "#fff", fontSize: 13.5, fontWeight: 800, cursor: busy ? "wait" : "pointer", opacity: busy || !aiAsk.trim() ? 0.6 : 1 }}>{busy ? "만드는 중…" : "만들기"}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`.gs-media-x{opacity:0;transition:opacity .15s}.gs-media-card:hover .gs-media-x{opacity:1}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 12.5, color: theme.textSecondary, flexWrap: "wrap" }}>
        <span>{note || "끌어서 순서를 바꿔요 · 맨 앞이 대표 사진(실제 사진만) · 정리한 사진은 기사·블로그·SNS·영상에 바로 들어가요"}</span>
        {hiddenCount > 0 && <button disabled={Boolean(busy)} onClick={() => void run({ type: "restore" })}
          style={{ border: 0, background: "transparent", color: "#1a73e8", fontSize: 12.5, fontWeight: 800, cursor: "pointer", padding: 0 }}>뺀 사진 {hiddenCount}장 되살리기</button>}
        {busy && <span style={{ fontWeight: 800, color: "#1a3a6b" }}>{busy}</span>}
        {err && <span style={{ fontWeight: 800, color: "#c92a2a" }}>{err}</span>}
      </div>
    </>
  );
}
