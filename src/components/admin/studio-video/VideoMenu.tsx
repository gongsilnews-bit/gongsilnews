"use client";

// [동영상제작] 왼쪽 메뉴 칸 — 공실마케팅처럼 제목 + AI 설정 상자 + 세부 메뉴 (2026-10-18 사장님). 편집 화면에서는 숨긴다
import React, { useCallback, useEffect, useState } from "react";
import type { Method } from "./types";
import { METHODS } from "./Flows";
import { C, FONT, Icon, useStudioTheme } from "./ui";

type AiItem = { id: string; name: string; ready: boolean; ok: boolean };
type AiBridge = { openAiConnect: () => Promise<void>; ai: { list: () => Promise<AiItem[]> } };
const aiBridge = (): AiBridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: AiBridge }).gongsilStudio ?? null) : null);

export type VideoView = "home" | "myvoice" | "aivoice";

/** AI 설정 상자 — 공실마케팅·SNS발행과 같다 (누르면 [내 AI 연결] 창). 동영상제작·이미지 편집 왼쪽 메뉴에 쓴다 */
/** light = 흰 바탕 칸에 놓을 때 (글자·테두리를 어둡게) */
export function AiSettingsBox({ light = false }: { light?: boolean } = {}) {
  const [ai, setAi] = useState<AiItem[] | null>(null);
  const loadAi = useCallback(async () => {
    const b = aiBridge();
    if (b?.ai) setAi(await b.ai.list().catch(() => []));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAi();
    window.addEventListener("focus", loadAi);
    return () => window.removeEventListener("focus", loadAi);
  }, [loadAi]);
  const connected = (ai || []).filter((a) => a.ok);
  if (!aiBridge()?.openAiConnect) return null;
  return (
    <button type="button" onClick={() => aiBridge()?.openAiConnect()} title="AI 설정 (내 AI 연결)"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT, marginBottom: 6,
        background: connected.length ? (light ? "#ecfdf5" : "rgba(34,197,94,0.12)") : "transparent", border: `1px solid ${connected.length ? (light ? "#6ee7b7" : "rgba(110,231,183,0.6)") : light ? "#d1d5db" : C.line2}`, color: connected.length ? (light ? "#047857" : "#6ee7b7") : light ? "#111827" : C.text }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: connected.length ? "#22c55e" : "#64748b", boxShadow: connected.length ? "0 0 0 3px rgba(34,197,94,0.2)" : "none" }} />
      {connected.length ? `AI 설정 · ${connected.map((a) => a.name).join(", ")}` : "AI 설정"}
    </button>
  );
}

export default function VideoMenu({ view, onView, onMethod }: { view: VideoView; onView: (v: VideoView) => void; onMethod: (m: Method) => void }) {
  const [theme] = useStudioTheme(false);
  // 일반 메뉴 — 색 상자·왼쪽 막대 없이, 고른 것은 글자만 밝고 굵게 (2026-10-18 사장님)
  const item = (on: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", border: 0, borderRadius: 8, cursor: "pointer", fontFamily: FONT, fontSize: 14.5,
    fontWeight: on ? 800 : 600, color: on ? C.text : C.sub, background: "transparent",
    // 밝은 화면 — 관리 화면 둘째 메뉴처럼 연한 남색 바탕 · 남색 글씨 · 왼쪽 막대 (어두운 화면은 글자만, 2026-10-18)
    ...(on && theme === "light" ? { color: C.accent, background: C.accentDim, boxShadow: `inset 3px 0 0 ${C.accent}` } : {}),
  });
  const head: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: C.dim, margin: "14px 12px 4px" };
  return (
    <aside style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, padding: "22px 12px", background: C.panel, borderRight: `1px solid ${C.line}`, overflowY: "auto", fontFamily: FONT, color: C.text }}>
      <h2 style={{ margin: "0 6px 10px", fontSize: 19, fontWeight: 800 }}>동영상studio</h2>
      <AiSettingsBox light={theme === "light"} />
      <button type="button" onClick={() => onView("home")} style={item(view === "home")}><Icon name="folder" size={17} />내 프로젝트</button>
      {METHODS.filter((m) => m.id !== "record").map((m) => (
        <button key={m.id} type="button" onClick={() => onMethod(m.id)} title={m.desc} style={item(false)}><Icon name={m.icon} size={17} />{m.title.replace(/하기$/, "")}</button>
      ))}
      <div style={head}>스튜디오</div>
      <button type="button" onClick={() => onMethod("record")} title="화면이나 카메라를 녹화하면 바로 편집 화면으로 가요" style={item(false)}><Icon name="record" size={17} />강의/영상녹화</button>
      <button type="button" onClick={() => onView("aivoice")} title="글을 쓰면 AI 성우가 읽어서 MP3·WAV 로 저장해요" style={item(view === "aivoice")}><Icon name="music" size={17} />AI 보이스 녹음</button>
      <button type="button" onClick={() => onView("myvoice")} style={item(view === "myvoice")}><Icon name="mic" size={17} />AI 내 목소리 만들기</button>
    </aside>
  );
}
