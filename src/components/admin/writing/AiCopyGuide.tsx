"use client";
/**
 * AI 창에서 복사·붙여넣기 하는 법 — 처음 쓰는 회원용 그림 설명 (2026-11-03 사장님: "처음 하는 사람은 복사 붙여 넣기 어떻게 하는지 모름, 복사 단추 위치까지")
 *  ① 입력칸 누르고 Ctrl+V → 보내기  ② 답의 코드 상자 오른쪽 위 [복사]  ③ 이 창으로 돌아오기
 *  그림은 각 AI 화면을 흉내 낸 단순한 모양 (실제 화면 캡처·로고는 쓰지 않는다)
 */
import React from "react";
import { createPortal } from "react-dom";

const NAVY = "#1e3a6e", LINE = "#e5e7eb", SUB = "#6b7280", RED = "#ef4444";

/** AI 마다 다른 점 — 보내기 단추 모양 · 코드 상자 복사 단추 글자 */
const LOOK: Record<string, { name: string; send: string; copy: string; bar: string }> = {
  chatgpt: { name: "ChatGPT", send: "↑", copy: "복사", bar: "#f4f4f4" },
  gemini: { name: "Gemini", send: "➤", copy: "⧉", bar: "#f0f4f9" },
  claude: { name: "Claude", send: "↑", copy: "Copy", bar: "#f5f4ef" },
};

const Ring = ({ children }: { children: React.ReactNode }) => (
  <span style={{ position: "relative", display: "inline-flex" }}>
    {children}
    <span style={{ position: "absolute", inset: -5, border: `2.5px solid ${RED}`, borderRadius: 8, animation: "gsRing 1.4s ease-in-out infinite" }} />
  </span>
);

/** ① 입력칸 그림 */
function PasteBox({ ai }: { ai: string }) {
  const L = LOOK[ai] || LOOK.chatgpt;
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: L.bar, padding: "9px 10px 9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ flex: 1, fontSize: 12.5, color: "#9ca3af" }}>{L.name}에게 메시지 보내기…</span>
      <Ring><span style={{ fontSize: 11.5, fontWeight: 800, color: NAVY, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 5, padding: "2px 7px" }}>Ctrl + V</span></Ring>
      <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#111827", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{L.send}</span>
    </div>
  );
}

/** ② 답의 코드 상자 — 오른쪽 위 [복사] */
function CodeBox({ ai }: { ai: string }) {
  const L = LOOK[ai] || LOOK.chatgpt;
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "6px 10px", background: "#f3f4f6", fontSize: 11.5, color: SUB }}>
        <span style={{ flex: 1, fontWeight: 700 }}>json</span>
        <Ring><span style={{ fontSize: 11.5, fontWeight: 800, color: "#111827", padding: "1px 6px" }}>⧉ {L.copy === "⧉" ? "" : L.copy}</span></Ring>
      </div>
      <div style={{ padding: "8px 12px", fontFamily: "Consolas, monospace", fontSize: 11.5, lineHeight: 1.55, color: "#374151" }}>
        {"{"} <span style={{ color: "#b45309" }}>&quot;title&quot;</span>: &quot;논현동 아파트…&quot;,<br />
        &nbsp;&nbsp;<span style={{ color: "#b45309" }}>&quot;paragraphs&quot;</span>: [ … ] {"}"}
      </div>
    </div>
  );
}

/** ③ 돌아오기 */
function BackTab() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
      <span style={{ padding: "6px 12px", borderRadius: "8px 8px 0 0", background: "#e5e7eb", fontSize: 11.5, color: SUB }}>ChatGPT</span>
      <Ring><span style={{ padding: "6px 12px", borderRadius: "8px 8px 0 0", background: "#fff", border: `1px solid ${LINE}`, borderBottom: 0, fontSize: 11.5, fontWeight: 800, color: NAVY }}>공실뉴스 기사쓰기</span></Ring>
    </div>
  );
}

export function AiCopySteps({ ai }: { ai: string }) {
  const L = LOOK[ai] || LOOK.chatgpt;
  const step = (n: number, title: React.ReactNode, pic: React.ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: "6px 10px", alignItems: "start" }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: NAVY, color: "#fff", fontSize: 12.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1f2937", lineHeight: 1.55, paddingTop: 2 }}>{title}</div>
      <span />
      <div>{pic}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`@keyframes gsRing{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
      {step(1, <>새로 열린 <b>{L.name}</b> 창의 <b>입력칸을 한 번 누르고 Ctrl+V</b> (질문이 이미 복사돼 있어요) → <b>보내기</b></>, <PasteBox ai={ai} />)}
      {step(2, <>답이 다 나오면, 답 안의 <b>코드 상자 오른쪽 위 [복사]</b>를 누르세요</>, <CodeBox ai={ai} />)}
      {step(3, <><b>이 창(공실뉴스)으로 돌아오면</b> 제목·부제·본문·키워드가 저절로 채워져요</>, <BackTab />)}
    </div>
  );
}

/** 안내 창 — 기다리는 중(waiting)이면 [질문 다시 복사하고 열기]·[복사한 답 가져오기]·[그만두기], 아니면 [닫기] */
export default function AiCopyGuide({ ai, waiting, msg, onReopen, onPaste, onClose }: {
  ai: string; waiting: boolean; msg?: string;
  onReopen?: () => void; onPaste?: () => void; onClose: () => void;
}) {
  const L = LOOK[ai] || LOOK.chatgpt;
  const btn: React.CSSProperties = { height: 38, padding: "0 14px", borderRadius: 6, border: `1px solid #d9dde3`, background: "#fff", color: "#374151", fontSize: 13.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={() => { if (!waiting) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "100%", background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${LINE}` }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#111827" }}>{waiting ? `내 ${L.name}로 기사 초안을 쓰는 중` : `${L.name}로 쓰는 법`}</span>
          <button type="button" onClick={onClose} title={waiting ? "그만두기" : "닫기"} style={{ border: 0, background: "none", fontSize: 20, color: SUB, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "18px 20px" }}>
          <AiCopySteps ai={ai} />
          {msg && <div style={{ marginTop: 14, padding: "9px 12px", borderRadius: 6, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 700 }}>{msg}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 20px 18px", flexWrap: "wrap" }}>
          {waiting ? (<>
            <button type="button" onClick={onPaste} style={{ ...btn, flex: 1, background: NAVY, borderColor: NAVY, color: "#fff" }}>복사한 답 가져오기</button>
            <button type="button" onClick={onReopen} style={btn}>질문 다시 복사하고 {L.name} 열기</button>
            <button type="button" onClick={onClose} style={btn}>그만두기</button>
          </>) : (
            <button type="button" onClick={onClose} style={{ ...btn, flex: 1, background: NAVY, borderColor: NAVY, color: "#fff" }}>알겠어요</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
