"use client";

// [동영상제작] 왼쪽 메뉴 칸 — 공실마케팅처럼 제목 + AI 설정 상자 + 세부 메뉴 (2026-10-18 사장님). 편집 화면에서는 숨긴다
import React, { useCallback, useEffect, useState } from "react";
import type { Method } from "./types";
import { METHODS } from "./Flows";
import { C, FONT, Icon } from "./ui";

type AiItem = { id: string; name: string; ready: boolean; ok: boolean };
type AiBridge = { openAiConnect: () => Promise<void>; ai: { list: () => Promise<AiItem[]> } };
const aiBridge = (): AiBridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: AiBridge }).gongsilStudio ?? null) : null);

export type VideoView = "home" | "myvoice";

export default function VideoMenu({ view, onView, onMethod }: { view: VideoView; onView: (v: VideoView) => void; onMethod: (m: Method) => void }) {
  // AI 설정 상자 — 공실마케팅·SNS발행과 같다 (누르면 [내 AI 연결] 창)
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

  const item = (on: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", border: 0, borderRadius: 8, cursor: "pointer", fontFamily: FONT, fontSize: 14.5,
    fontWeight: on ? 800 : 600, color: on ? C.text : C.sub, background: on ? C.accentDim : "transparent", boxShadow: on ? `inset 3px 0 0 ${C.accent}` : "none",
  });
  const head: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: C.dim, margin: "14px 12px 4px" };
  return (
    <aside style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, padding: "22px 12px", background: C.panel, borderRight: `1px solid ${C.line}`, overflowY: "auto", fontFamily: FONT, color: C.text }}>
      <h2 style={{ margin: "0 6px 10px", fontSize: 19, fontWeight: 800 }}>동영상제작</h2>
      {aiBridge()?.openAiConnect && (
        <button type="button" onClick={() => aiBridge()?.openAiConnect()} title="AI 설정 (내 AI 연결)"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT, marginBottom: 6,
            background: connected.length ? "rgba(34,197,94,0.12)" : "transparent", border: `1px solid ${connected.length ? "rgba(110,231,183,0.6)" : C.line2}`, color: connected.length ? "#6ee7b7" : C.text }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: connected.length ? "#22c55e" : "#64748b", boxShadow: connected.length ? "0 0 0 3px rgba(34,197,94,0.2)" : "none" }} />
          {connected.length ? `${connected.map((a) => a.name).join(", ")} 연결됨` : "AI 설정 · 내 AI 연결하기"}
        </button>
      )}
      <button type="button" onClick={() => onView("home")} style={item(view === "home")}><Icon name="folder" size={17} />내 프로젝트</button>
      <div style={head}>새로 만들기</div>
      {METHODS.map((m) => (
        <button key={m.id} type="button" onClick={() => onMethod(m.id)} title={m.desc} style={item(false)}><Icon name={m.icon} size={17} />{m.title.replace(/ (만들기|편집하기)$/, "")}</button>
      ))}
      <div style={head}>목소리</div>
      <button type="button" onClick={() => onView("myvoice")} style={item(view === "myvoice")}><Icon name="mic" size={17} />내 목소리</button>
    </aside>
  );
}
