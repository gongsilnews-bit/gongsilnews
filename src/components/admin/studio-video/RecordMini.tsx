"use client";

// 녹화 중 [작게 하기] — 카톡 창만 한 작은 녹화 창 (스튜디오 창은 내려가 있다).
// 옮기기·투명도·크기 조절 / 화면·카메라·화면+카메라 / 지금 녹화되는 화면 / 마이크·PC 소리 막대·크기·설정 / 녹화 중·크게 보기·녹화 끝내기.
// 녹화에는 찍히지 않는다 (앱이 캡처에서 뺀다). 스튜디오 창에서 window.open 으로 열고 React 로 그린다 (같은 상태를 그대로 쓴다)
import React, { useEffect, useRef, useState } from "react";
import { fmtTime, videoBridge } from "./types";
import { C, FONT, Icon } from "./ui";

type Mode = "screen" | "camera" | "both";
export type MiniProps = {
  mode: Mode;
  setMode: (m: Mode) => void;
  stream: MediaStream | null;
  sec: number;
  levels: { mic: number; pc: number };
  micVol: number;
  micMuted: boolean;
  setMicVol: (v: number) => void;
  setMicMuted: (v: boolean) => void;
  pcVol: number;
  pcMuted: boolean;
  setPcVol: (v: number) => void;
  setPcMuted: (v: boolean) => void;
  onStop: () => void;
};

/** 열기 — 스튜디오 창의 글꼴·스타일을 옮겨 담은 빈 창. 닫으면 onGone */
export function openMiniWindow(onGone: () => void): { w: Window; root: HTMLElement; close: () => void } | null {
  const w = window.open("about:blank", `gsv-mini-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  if (!w) return null;
  const d = w.document;
  d.title = "녹화 중";
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => {
    const c = n.cloneNode(true) as HTMLElement;
    if (n instanceof HTMLLinkElement) (c as HTMLLinkElement).href = n.href;
    d.head.appendChild(c);
  });
  d.body.style.cssText = `margin:0;background:${C.bg};color:${C.text};font-family:${FONT};overflow:hidden;user-select:none;`;
  const root = d.createElement("div");
  root.style.cssText = "height:100vh;display:flex;flex-direction:column;";
  d.body.appendChild(root);
  let mine = true;
  const gone = () => {
    if (!mine) return;
    mine = false;
    onGone();
  };
  w.addEventListener("pagehide", gone);
  w.addEventListener("beforeunload", gone);
  return {
    w,
    root,
    close: () => {
      mine = false;
      w.removeEventListener("pagehide", gone);
      w.removeEventListener("beforeunload", gone);
      w.close();
    },
  };
}

const MODES: { id: Mode; name: string; icon: string }[] = [
  { id: "screen", name: "화면", icon: "screen" },
  { id: "camera", name: "카메라", icon: "camera" },
  { id: "both", name: "화면+카메라", icon: "layers" },
];

/** 소리 줄 — [아이콘(누르면 끄기)] 소리 막대 / 크기 막대 % [⚙ 설정] */
function SoundRow({ icon, name, level, vol, muted, setVol, setMuted, onSettings }: { icon: string; name: string; level: number; vol: number; muted: boolean; setVol: (v: number) => void; setMuted: (v: boolean) => void; onSettings?: () => void }) {
  const lv = muted ? 0 : level;
  const color = lv > 0.9 ? C.danger : lv > 0.75 ? "#eab308" : "#22c55e";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => setMuted(!muted)} title={muted ? `${name} 켜기` : `${name} 끄기`}
          style={{ width: 36, height: 32, borderRadius: 6, border: `1px solid ${muted ? C.danger : C.line2}`, background: muted ? "rgba(239,68,68,0.15)" : "transparent", color: muted ? C.danger : C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={muted ? "mute" : icon} size={18} />
        </button>
        <span style={{ width: 54, fontSize: 14, fontWeight: 700, flexShrink: 0, color: muted ? C.danger : C.text }}>{muted ? "꺼짐" : name}</span>
        <div style={{ flex: 1, height: 10, borderRadius: 5, background: C.panel2, overflow: "hidden", border: `1px solid ${C.line}` }}>
          <div style={{ width: `${Math.round(lv * 100)}%`, height: "100%", background: color, transition: "width 90ms linear" }} />
        </div>
        {onSettings && (
          <button type="button" onClick={onSettings} title={`윈도우 ${name} 설정 열기`}
            style={{ width: 36, height: 32, borderRadius: 6, border: `1px solid ${C.line2}`, background: "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="gear" size={17} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 44 }}>
        <input type="range" min={0} max={2} step={0.05} value={muted ? 0 : vol} onChange={(e) => { const v = Number(e.target.value); setVol(v); setMuted(v === 0); }} style={{ flex: 1, accentColor: C.accent }} />
        <span style={{ width: 44, textAlign: "right", fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{muted ? "0%" : `${Math.round(vol * 100)}%`}</span>
      </div>
    </div>
  );
}

export function RecordMini(p: MiniProps) {
  const b = videoBridge()!;
  const vid = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = vid.current;
    if (v && p.stream && v.srcObject !== p.stream) {
      v.srcObject = p.stream;
      v.play().catch(() => {});
    }
  }, [p.stream]);
  const [opacity, setOpacityState] = useState(() => {
    try {
      return Number(localStorage.getItem("gsv:miniOpacity")) || 1;
    } catch {
      return 1;
    }
  });
  const setOpacity = (v: number) => {
    setOpacityState(v);
    try {
      localStorage.setItem("gsv:miniOpacity", String(v));
    } catch {}
    b.record.console?.("opacity", v).catch(() => {});
  };
  useEffect(() => {
    if (opacity < 1) {
      const t = setTimeout(() => b.record.console?.("opacity", opacity).catch(() => {}), 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [big, setBig] = useState(false);
  const toggleBig = async () => setBig(Boolean(await b.record.console?.("max").catch(() => false)));
  // 위 줄을 끌어 옮긴다 (✥ 열십자)
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (big || e.button !== 0 || (e.target as HTMLElement).closest("button, input")) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.screenX, sy = e.screenY;
    b.record.console?.("drag-start").catch(() => {});
    const mv = (ev: PointerEvent) => void b.record.console?.("drag", ev.screenX - sx, ev.screenY - sy).catch(() => {});
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
  };
  const settings = () => void (b.openDeviceSettings || b.openSettings)?.("microphone");
  const winBtn = (icon: string, tip: string, onClick: () => void, close = false) => (
    <button type="button" onClick={onClick} title={tip} style={{ width: 40, height: 36, border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = close ? C.danger : C.line2; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.sub; }}>
      <Icon name={icon} size={18} />
    </button>
  );
  return (
    <>
      {/* 1. 위 줄 — 옮기기·투명도·작게·크게·닫기(= 크게 보기) */}
      <div onPointerDown={drag} onDoubleClick={(e) => !(e.target as HTMLElement).closest("button, input") && void toggleBig()}
        style={{ display: "flex", alignItems: "center", gap: 8, height: 36, paddingLeft: 10, background: "#0b0c0f", borderBottom: `1px solid ${C.line}`, cursor: big ? "default" : "move", flexShrink: 0 }}>
        <span style={{ fontSize: 15, color: C.sub }}>✥</span>
        <span style={{ fontSize: 12.5, color: C.sub }}>투명도</span>
        <input type="range" min={0.3} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} title="창을 비치게 (녹화에는 안 찍혀요)" style={{ width: 80, accentColor: C.accent }} />
        <span style={{ flex: 1 }} />
        {winBtn("winMin", "작게 (작업 표시줄로)", () => void b.record.console?.("min"))}
        {winBtn(big ? "winRestore" : "winMax", big ? "원래 크기로" : "크게 (화면 가득)", () => void toggleBig())}
        {winBtn("close", "닫고 스튜디오 창 크게 보기", () => void b.record.console?.("big"), true)}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12, padding: 12, overflowY: "auto" }}>
        {/* 2. 화면 · 카메라 · 화면+카메라 */}
        <div style={{ display: "flex", gap: 6 }}>
          {MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => p.setMode(m.id)}
              style={{ flex: 1, height: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 6, border: `1px solid ${p.mode === m.id ? C.text : C.line2}`, background: p.mode === m.id ? C.text : "transparent", color: p.mode === m.id ? C.bg : C.text, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
              <Icon name={m.icon} size={16} />{m.name}
            </button>
          ))}
        </div>
        {/* 3. 지금 녹화되는 화면 */}
        <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#000", border: `2px solid ${C.danger}`, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
          <video ref={vid} muted playsInline autoPlay style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
        </div>
        {/* 4·5. 마이크 · PC 소리 */}
        <SoundRow icon="mic" name="마이크" level={p.levels.mic} vol={p.micVol} muted={p.micMuted} setVol={p.setMicVol} setMuted={p.setMicMuted} onSettings={settings} />
        <SoundRow icon="volume" name="PC 소리" level={p.levels.pc} vol={p.pcVol} muted={p.pcMuted} setVol={p.setPcVol} setMuted={p.setPcMuted} onSettings={settings} />
      </div>
      {/* 6. 녹화 중 · 크게 보기 · 녹화 끝내기 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderTop: `1px solid ${C.line}`, background: "#0b0c0f", flexShrink: 0 }}>
        <span style={{ width: 11, height: 11, borderRadius: 6, background: C.danger, flexShrink: 0 }} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span style={{ fontSize: 12.5, color: C.sub }}>녹화 중</span>
          <span style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmtTime(p.sec, false)}</span>
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => void b.record.console?.("big")} style={{ height: 40, padding: "0 14px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>크게 보기</button>
        <button type="button" onClick={p.onStop} style={{ height: 40, padding: "0 14px", borderRadius: 6, border: 0, background: C.danger, color: "#fff", fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>■ 녹화 끝내기</button>
      </div>
    </>
  );
}
