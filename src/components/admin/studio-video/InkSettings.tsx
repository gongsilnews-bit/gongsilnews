"use client";
// 판서 · 마우스 강조 설정 칸 — 녹화 준비 창(Flows)과 녹화 조정실(RecordConsole)이 같이 쓴다 (2026-10-24)
import React, { useEffect, useState } from "react";
import type { InkPrefs } from "./types";
import { videoBridge } from "./types";
import { C, FONT, Toggle, label } from "./ui";

const small: React.CSSProperties = { height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", flexShrink: 0 };

/** setup = 녹화 전 (미리 써 보기 버튼을 보여 줌). onPrefs = 바뀐 설정을 부모에 알림 */
export function InkSettings({ setup, onPrefs }: { setup: boolean; onPrefs?: (p: InkPrefs) => void }) {
  const b = videoBridge();
  const [ink, setInk] = useState<InkPrefs | null>(null);
  const [inkTry, setInkTry] = useState(false);
  useEffect(() => {
    void b?.record.ink?.("prefs").then((p: InkPrefs) => { setInk(p); onPrefs?.(p); }).catch(() => {});
    // 미리 써 보기를 켠 채 창을 닫으면 판도 닫는다
    return () => { if (b?.record.ink) void b.record.ink("state").then((s: { open: boolean; drawing: boolean }) => s?.open && setup && b.record.ink?.("try")).catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!b?.record.ink || !ink) return null;
  const set = (p: Partial<InkPrefs>) => {
    const n = { ...ink, ...p };
    setInk(n);
    onPrefs?.(n);
    void b.record.ink?.("set-prefs", p);
  };
  return (
    <div>
      <div style={{ ...label, marginBottom: 8 }}>판서 · 마우스 강조 <span style={{ color: C.dim, fontWeight: 600 }}>· 녹화에 찍혀요</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13.5 }}>판서 <b>F9</b> <span style={{ color: C.sub }}>· 녹화하면 아래 도구 막대가 떠요 · F9 보이기·숨기기</span></span>
          <Toggle on={ink.enabled} onChange={(v) => set({ enabled: v })} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13.5 }}>마우스 후광 <span style={{ color: C.sub }}>· 포인터 둘레 동그라미</span></span>
          <Toggle on={ink.halo} onChange={(v) => set({ halo: v })} />
        </div>
        {ink.halo && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 10 }}>
            {["#facc15", "#f87171", "#60a5fa", "#4ade80"].map((c) => (
              <button key={c} type="button" title={c} onClick={() => set({ haloColor: c })} style={{ width: 22, height: 22, padding: 0, borderRadius: 11, background: c, border: `2px solid ${ink.haloColor === c ? C.accent : C.line2}`, cursor: "pointer" }} />
            ))}
            <span style={{ fontSize: 13, color: C.sub, marginLeft: 8 }}>크기</span>
            <input type="range" min={20} max={70} value={ink.haloSize} onChange={(e) => set({ haloSize: Number(e.target.value) })} style={{ flex: 1, accentColor: C.accent }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13.5 }}>포인터 크게 <span style={{ color: C.sub }}>· 녹화 영상에 큰 화살표</span></span>
          <Toggle on={ink.big} onChange={(v) => set({ big: v })} />
        </div>
        {ink.big && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 10 }}>
            {[2, 3, 4].map((k) => (
              <button key={k} type="button" onClick={() => set({ scale: k })} style={{ ...small, color: ink.scale === k ? "#fff" : C.sub, background: ink.scale === k ? C.accent : "transparent", borderColor: ink.scale === k ? C.accent : C.line2, fontWeight: 700 }}>{k}배</button>
            ))}
          </div>
        )}
        {setup && (
          <button type="button" onClick={async () => setInkTry(Boolean(await b.record.ink?.("try")))} style={{ ...small, height: 32, alignSelf: "flex-start", color: inkTry ? "#fff" : C.text, background: inkTry ? C.accent : "transparent", borderColor: inkTry ? C.accent : C.line2 }}>
            {inkTry ? "미리 써 보기 끝내기" : "미리 써 보기 (F9로 판서)"}
          </button>
        )}
      </div>
    </div>
  );
}
