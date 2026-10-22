"use client";

// 이미지 편집 — 색상 피커 (포토샵처럼): 큰 색 판(채도·밝기) + 색조 막대 · 새로운 색/현재 색 · H S B · R G B · # · C M Y K
// 전경색·배경색 칸을 누르면 열린다. [확인] 을 눌러야 바뀐다 (포토샵과 같이)
import React, { useEffect, useRef, useState } from "react";
import { Btn, C, FONT } from "@/components/admin/studio-video/ui";
import { cmykToRgb, outOfGamut, rgbToCmyk } from "./cmyk";

type HSB = { h: number; s: number; b: number };
const clamp = (v: number, a: number, z: number) => Math.max(a, Math.min(z, v));
function rgbToHsb(r: number, g: number, b: number): HSB {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: Math.round(((h * 60) + 360) % 360), s: mx ? Math.round((d / mx) * 100) : 0, b: Math.round((mx / 255) * 100) };
}
function hsbToRgb({ h, s, b }: HSB) {
  const S = s / 100, V = b / 100, c = V * S, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = V - c;
  const [r, g, bl] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((bl + m) * 255) };
}
const hexOf = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const rgbOf = (hex: string) => { const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; };

export function ColorPicker({ value, title, onOk, onClose }: { value: string; title: string; onOk: (hex: string) => void; onClose: () => void }) {
  const cur = rgbOf(value);
  const [hsb, setHsb] = useState<HSB>(() => rgbToHsb(cur.r, cur.g, cur.b));
  const [hexTxt, setHexTxt] = useState(value.replace("#", "").toUpperCase());
  const rgb = hsbToRgb(hsb);
  const hex = hexOf(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  useEffect(() => { setHexTxt(hex.replace("#", "")); }, [hex]); // eslint-disable-line react-hooks/set-state-in-effect
  const sv = useRef<HTMLDivElement>(null), hue = useRef<HTMLDivElement>(null);
  const dragIn = (ref: React.RefObject<HTMLDivElement | null>, fn: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const at = (ev: { clientX: number; clientY: number }) => { const r = el.getBoundingClientRect(); fn(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)); };
    at(e);
    const mv = (ev: PointerEvent) => at(ev);
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); }
      if (e.key === "Enter") { e.stopImmediatePropagation(); onOk(hex); }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });
  const field = (lab: string, v: number, max: number, set: (n: number) => void, unit = "") => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.sub }}>
      <span style={{ width: 16, textAlign: "right" }}>{lab}:</span>
      <input type="number" min={0} max={max} value={v} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => set(clamp(Number(e.target.value) || 0, 0, max))}
        style={{ width: 54, height: 24, borderRadius: 3, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, padding: "0 4px" }} />
      <span style={{ width: 12, fontSize: 12 }}>{unit}</span>
    </label>
  );
  const setRgb = (p: Partial<{ r: number; g: number; b: number }>) => { const n = { ...rgb, ...p }; setHsb(rgbToHsb(n.r, n.g, n.b)); };
  const setCmyk = (p: Partial<{ c: number; m: number; y: number; k: number }>) => {
    const n = { c: cmyk.c * 100, m: cmyk.m * 100, y: cmyk.y * 100, k: cmyk.k * 100, ...p };
    const r = cmykToRgb({ c: n.c / 100, m: n.m / 100, y: n.y / 100, k: n.k / 100 });
    setHsb(rgbToHsb(r.r, r.g, r.b));
  };
  const pure = hsbToRgb({ h: hsb.h, s: 100, b: 100 });
  const warn = outOfGamut(rgb.r, rgb.g, rgb.b);
  return (
    <div onPointerDown={(e) => e.stopPropagation()} style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 600, background: "#535353", border: "1px solid #2b2b2b", borderRadius: 6, boxShadow: "0 16px 50px rgba(0,0,0,0.6)", fontFamily: FONT, color: "#e5e5e5" }}>
        <div style={{ display: "flex", alignItems: "center", height: 34, padding: "0 12px", background: "#3c3c3c", borderBottom: "1px solid #2b2b2b", fontSize: 13.5 }}>
          <span style={{ flex: 1 }}>색상 피커 ({title})</span>
          <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: "#ddd", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 14, padding: 14 }}>
          {/* 채도·밝기 판 */}
          <div ref={sv} onPointerDown={(e) => dragIn(sv, (x, y) => setHsb((o) => ({ ...o, s: Math.round(x * 100), b: Math.round((1 - y) * 100) })))(e)}
            style={{ position: "relative", width: 256, height: 256, flexShrink: 0, cursor: "crosshair", touchAction: "none",
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hexOf(pure.r, pure.g, pure.b)})` }}>
            <span style={{ position: "absolute", left: `${hsb.s}%`, top: `${100 - hsb.b}%`, width: 12, height: 12, marginLeft: -6, marginTop: -6, borderRadius: "50%", border: `2px solid ${hsb.b > 55 && hsb.s < 40 ? "#000" : "#fff"}`, pointerEvents: "none" }} />
          </div>
          {/* 색조 막대 */}
          <div ref={hue} onPointerDown={(e) => dragIn(hue, (_x, y) => setHsb((o) => ({ ...o, h: Math.round((1 - y) * 359) })))(e)}
            style={{ position: "relative", width: 20, height: 256, flexShrink: 0, cursor: "ns-resize", touchAction: "none",
              background: "linear-gradient(to top, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}>
            <span style={{ position: "absolute", left: -5, right: -5, top: `${100 - (hsb.h / 359) * 100}%`, height: 0, borderTop: "2px solid #fff", boxShadow: "0 0 0 1px #000", pointerEvents: "none" }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ textAlign: "center", fontSize: 12 }}>
                <div>새로운 색</div>
                <div style={{ width: 70, height: 34, background: hex, border: "1px solid #222", marginTop: 3 }} />
                <div style={{ width: 70, height: 34, background: value, border: "1px solid #222", borderTop: 0 }} />
                <div style={{ marginTop: 3 }}>현재 색</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: "auto" }}>
                <Btn small primary onClick={() => onOk(hex)}>확인</Btn>
                <Btn small onClick={onClose}>취소</Btn>
                {warn && <span title="인쇄(CMYK)로는 이 색이 그대로 안 나와요" style={{ fontSize: 12, color: "#fbbf24" }}>⚠ 인쇄 색 범위 밖</span>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {field("H", hsb.h, 359, (n) => setHsb({ ...hsb, h: n }), "°")}
                {field("S", hsb.s, 100, (n) => setHsb({ ...hsb, s: n }), "%")}
                {field("B", hsb.b, 100, (n) => setHsb({ ...hsb, b: n }), "%")}
                <div style={{ height: 4 }} />
                {field("R", rgb.r, 255, (n) => setRgb({ r: n }))}
                {field("G", rgb.g, 255, (n) => setRgb({ g: n }))}
                {field("B", rgb.b, 255, (n) => setRgb({ b: n }))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {field("C", Math.round(cmyk.c * 100), 100, (n) => setCmyk({ c: n }), "%")}
                {field("M", Math.round(cmyk.m * 100), 100, (n) => setCmyk({ m: n }), "%")}
                {field("Y", Math.round(cmyk.y * 100), 100, (n) => setCmyk({ y: n }), "%")}
                {field("K", Math.round(cmyk.k * 100), 100, (n) => setCmyk({ k: n }), "%")}
                <div style={{ height: 4 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.sub }}>
                  <span style={{ width: 16, textAlign: "right" }}>#</span>
                  <input value={hexTxt} maxLength={6} onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const t = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
                      setHexTxt(t);
                      if (t.length === 6) { const c = rgbOf(t); setHsb(rgbToHsb(c.r, c.g, c.b)); }
                    }}
                    style={{ width: 80, height: 24, borderRadius: 3, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, padding: "0 4px", fontFamily: "monospace" }} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
