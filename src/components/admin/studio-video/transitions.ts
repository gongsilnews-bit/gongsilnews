// 화면전환 — 클립 사이(뒤 클립의 clip.trans)에 넣는다. 앞 클립 끝 a초 + 뒤 클립 시작 b초 동안 화면만 섞는다.
// 영상 길이·소리·자막 시각은 그대로 (전환하는 동안 상대 클립은 첫 장면/마지막 장면에서 멈춘 채로 섞인다).
// 굽기는 studio-app/src/video/render.js 의 ffmpeg xfade 로 — 효과 id 와 ffmpeg 이름(ff)을 같이 고친다.
import type React from "react";
import type { FlatItem } from "./timeline";
import { ADV, advLook, isAdv, type AdvSide } from "./transAdv";

export type TransType =
  | "fade" | "fadeblack" | "fadewhite"
  | "slideleft" | "slideright" | "slideup" | "slidedown"
  | "coverleft" | "wiperight"
  | "circleopen" | "zoomin" | "hblur"
  | `x_${string}`; // 고급 (transAdv.ts)

export const TRANSITIONS: { id: TransType; label: string; group: string; tier: "basic" | "adv"; sfx?: string }[] = [
  { id: "fade", label: "디졸브", group: "기본", tier: "basic" },
  { id: "fadeblack", label: "검은 화면 거쳐서", group: "기본", tier: "basic" },
  { id: "fadewhite", label: "흰 화면 거쳐서", group: "기본", tier: "basic" },
  { id: "slideleft", label: "밀기 ←", group: "밀기·덮기", tier: "basic" },
  { id: "slideright", label: "밀기 →", group: "밀기·덮기", tier: "basic" },
  { id: "slideup", label: "밀기 ↑", group: "밀기·덮기", tier: "basic" },
  { id: "slidedown", label: "밀기 ↓", group: "밀기·덮기", tier: "basic" },
  { id: "coverleft", label: "덮기", group: "밀기·덮기", tier: "basic" },
  { id: "wiperight", label: "닦아내기", group: "밀기·덮기", tier: "basic" },
  { id: "circleopen", label: "원형 열기", group: "모양·특수", tier: "basic" },
  { id: "zoomin", label: "확대하며", group: "모양·특수", tier: "basic" },
  { id: "hblur", label: "흐려지며", group: "모양·특수", tier: "basic" },
  // 고급 (2026-10-20 사장님 — 유료로 할 자리, 권한은 아직) · 움직임 · 빛·필름 · 디지털 · 모양
  ...ADV.map((x) => ({ id: x.id as TransType, label: x.label, group: x.group, tier: "adv" as const, sfx: x.sfx })),
];
export const transLabel = (t?: string) => TRANSITIONS.find((x) => x.id === t)?.label || "화면전환";

export const TRANS_DEFAULT = { type: "fade" as TransType, a: 0.3, b: 0.3 };
export const TRANS_MIN = 0.2;
export const TRANS_MAX = 2;

/** 실제로 쓸 앞(a)·뒤(b) 시간 — 클립 길이의 45%를 넘지 않게 (render.js transOf 와 같은 계산) */
export function transOf(prev: FlatItem | undefined, cur: FlatItem): { type: TransType; a: number; b: number } | null {
  const t = cur.clip.trans;
  if (!prev || !t) return null;
  const a = Math.max(0, Math.min(Number(t.a) || 0, prev.dur * 0.45));
  const b = Math.max(0, Math.min(Number(t.b) || 0, cur.dur * 0.45));
  if (a + b < 0.05) return null;
  return { type: (t.type as TransType) || "fade", a, b };
}

/** 지금 시각이 화면전환 안이면 — 앞 클립(from)·뒤 클립(to), 진행(0~1), 지금 재생 중인 쪽 */
export function transAt(items: FlatItem[], time: number) {
  for (let i = 1; i < items.length; i++) {
    const cut = items[i].start;
    if (time < cut - 2.5) return null;
    const tr = transOf(items[i - 1], items[i]);
    if (!tr) continue;
    if (time >= cut - tr.a && time < cut + tr.b) return { from: items[i - 1], to: items[i], ...tr, p: (time - (cut - tr.a)) / (tr.a + tr.b), live: time < cut ? ("from" as const) : ("to" as const) };
  }
  return null;
}

export type TransFxSpec = { from?: { sx: number; sy: number; rgb: number }; to?: { sx: number; sy: number; rgb: number } };
/** 고급 — 한 쪽 화면 CSS (굽기 transAdv.js 와 같은 값). 번짐·색 갈라짐은 SVG 필터(fid) — <TransFx> 가 그린다 */
function advCss(sd: AdvSide, w: number, h: number, fid: string): React.CSSProperties {
  const st: React.CSSProperties = { transform: `translate(${(sd.x * 100).toFixed(3)}%, ${(sd.y * 100).toFixed(3)}%) rotate(${sd.r.toFixed(3)}deg) scale(${(sd.s * sd.sx).toFixed(4)}, ${(sd.s * sd.sy).toFixed(4)})`, opacity: Math.max(0, Math.min(1, sd.o)) };
  const f = [sd.bx > 0.0002 || sd.by > 0.0002 || sd.rgb > 0.0002 ? `url(#${fid})` : "", Math.abs(sd.br - 1) > 0.001 ? `brightness(${sd.br.toFixed(3)})` : ""].filter(Boolean).join(" ");
  if (f) st.filter = f;
  const m = sd.mask;
  if (m) {
    let img = "";
    if (m.kind === "circle") {
      const hd = Math.hypot(w, h) / 2;
      img = `radial-gradient(circle at 50% 50%, #000 ${((m.r - m.f) * hd).toFixed(2)}px, transparent ${(m.r * hd).toFixed(2)}px)`;
    } else if (m.kind === "wipe") {
      const e = m.pos * (1 + m.f);
      img = `linear-gradient(${m.ang}deg, #000 ${((e - m.f) * 100).toFixed(3)}%, transparent ${(e * 100).toFixed(3)}%)`;
    } else {
      const stp = h / m.n, e = m.pos * (1 + m.f);
      img = `repeating-linear-gradient(to bottom, #000 0px, #000 ${Math.max(0, (e - m.f) * stp).toFixed(2)}px, transparent ${Math.max(0.01, e * stp).toFixed(2)}px, transparent ${stp.toFixed(2)}px)`;
    }
    st.maskImage = img;
    st.WebkitMaskImage = img;
  }
  return st;
}

/** 효과마다 두 화면의 모습 — p: 0(앞 화면) → 1(뒤 화면). veil: 맨 위 덮개. 고급은 o.w·o.h(화면 px)·o.fid(필터 이름 앞머리)가 있어야 같은 모양 */
export function transStyle(type: TransType, p: number, o: { w: number; h: number; fid: string } = { w: 160, h: 90, fid: "gstr" }): { from: React.CSSProperties; to: React.CSSProperties; veil?: React.CSSProperties; veils?: React.CSSProperties[]; toOnTop: boolean; fx?: TransFxSpec } {
  const q = Math.max(0, Math.min(1, p));
  if (isAdv(type)) {
    const L = advLook(type, q, o.w / Math.max(1, o.h));
    const fxOf = (sd: AdvSide) => (sd.bx > 0.0002 || sd.by > 0.0002 || sd.rgb > 0.0002 ? { sx: (sd.bx * o.w) / (sd.s * sd.sx), sy: (sd.by * o.w) / (sd.s * sd.sy), rgb: (sd.rgb * o.w) / (sd.s * sd.sx) } : undefined);
    const px = (v: number) => `${v.toFixed(2)}px`;
    const rgbA = (hex: string, a: number) => { const n = parseInt(hex.replace("#", ""), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
    // 덮개 — 굽기 bakeFrame 과 같은 모양 (screen 빛 · 흰 번쩍 · 빛줄기 · 가장자리 어둡게)
    const veils = (L.over || []).filter((ov) => ov.o > 0.001).map((ov): React.CSSProperties => {
      if (ov.kind === "flash") return { background: "#fff", opacity: ov.o };
      if (ov.kind === "glow") return { background: `radial-gradient(circle ${px(ov.r * o.w)} at ${px(ov.cx * o.w)} ${px(ov.cy * o.h)}, ${ov.c1} 0%, ${ov.c2} 45%, transparent 100%)`, mixBlendMode: "screen", opacity: ov.o };
      if (ov.kind === "rays") {
        const P = 360 / ov.n, R = ov.r * o.w, at = `${px(ov.cx * o.w)} ${px(ov.cy * o.h)}`;
        const m = `radial-gradient(circle ${px(R)} at ${at}, #000 0%, transparent 100%)`;
        return { background: `repeating-conic-gradient(from ${ov.rot.toFixed(2)}deg at ${at}, ${rgbA(ov.c, 0)} 0deg, ${rgbA(ov.c, 0.8)} ${(P * 0.25).toFixed(3)}deg, ${rgbA(ov.c, 0)} ${(P * 0.5).toFixed(3)}deg, ${rgbA(ov.c, 0)} ${P.toFixed(3)}deg)`, maskImage: m, WebkitMaskImage: m, mixBlendMode: "screen", opacity: ov.o };
      }
      return { background: `radial-gradient(circle ${px(Math.hypot(o.w, o.h) / 2)} at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,1) 100%)`, opacity: ov.o };
    });
    return { from: advCss(L.from, o.w, o.h, `${o.fid}-from`), to: advCss(L.to, o.w, o.h, `${o.fid}-to`), veil: veils[0], veils, toOnTop: L.top === "to", fx: { from: fxOf(L.from), to: fxOf(L.to) } };
  }
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  switch (type) {
    case "fadeblack":
    case "fadewhite":
      return { from: { opacity: q < 0.5 ? 1 : 0 }, to: { opacity: q < 0.5 ? 0 : 1 }, veil: { background: type === "fadeblack" ? "#000" : "#fff", opacity: q < 0.5 ? q * 2 : (1 - q) * 2 }, toOnTop: true };
    case "slideleft":
      return { from: { transform: `translateX(-${pct(q)})` }, to: { transform: `translateX(${pct(1 - q)})` }, toOnTop: true };
    case "slideright":
      return { from: { transform: `translateX(${pct(q)})` }, to: { transform: `translateX(-${pct(1 - q)})` }, toOnTop: true };
    case "slideup":
      return { from: { transform: `translateY(-${pct(q)})` }, to: { transform: `translateY(${pct(1 - q)})` }, toOnTop: true };
    case "slidedown":
      return { from: { transform: `translateY(${pct(q)})` }, to: { transform: `translateY(-${pct(1 - q)})` }, toOnTop: true };
    case "coverleft":
      return { from: {}, to: { transform: `translateX(${pct(1 - q)})` }, toOnTop: true };
    case "wiperight":
      return { from: {}, to: { clipPath: `inset(0 ${pct(1 - q)} 0 0)` }, toOnTop: true };
    case "circleopen":
      return { from: {}, to: { clipPath: `circle(${(q * 75).toFixed(2)}% at 50% 50%)` }, toOnTop: true };
    case "zoomin":
      return { from: { transform: `scale(${(1 + q * 0.6).toFixed(3)})`, opacity: 1 - q }, to: { opacity: q }, toOnTop: true };
    case "hblur":
      return { from: { filter: `blur(${(q * 18).toFixed(1)}px)`, opacity: 1 - q }, to: { filter: `blur(${((1 - q) * 18).toFixed(1)}px)`, opacity: q }, toOnTop: true };
    default:
      return { from: {}, to: { opacity: q }, toOnTop: true };
  }
}
