// 화면전환 — 클립 사이(뒤 클립의 clip.trans)에 넣는다. 앞 클립 끝 a초 + 뒤 클립 시작 b초 동안 화면만 섞는다.
// 영상 길이·소리·자막 시각은 그대로 (전환하는 동안 상대 클립은 첫 장면/마지막 장면에서 멈춘 채로 섞인다).
// 굽기는 studio-app/src/video/render.js 의 ffmpeg xfade 로 — 효과 id 와 ffmpeg 이름(ff)을 같이 고친다.
import type React from "react";
import type { FlatItem } from "./timeline";

export type TransType =
  | "fade" | "fadeblack" | "fadewhite"
  | "slideleft" | "slideright" | "slideup" | "slidedown"
  | "coverleft" | "wiperight"
  | "circleopen" | "zoomin" | "hblur";

export const TRANSITIONS: { id: TransType; label: string; group: string }[] = [
  { id: "fade", label: "디졸브", group: "기본" },
  { id: "fadeblack", label: "검은 화면 거쳐서", group: "기본" },
  { id: "fadewhite", label: "흰 화면 거쳐서", group: "기본" },
  { id: "slideleft", label: "밀기 ←", group: "밀기·덮기" },
  { id: "slideright", label: "밀기 →", group: "밀기·덮기" },
  { id: "slideup", label: "밀기 ↑", group: "밀기·덮기" },
  { id: "slidedown", label: "밀기 ↓", group: "밀기·덮기" },
  { id: "coverleft", label: "덮기", group: "밀기·덮기" },
  { id: "wiperight", label: "닦아내기", group: "밀기·덮기" },
  { id: "circleopen", label: "원형 열기", group: "모양·특수" },
  { id: "zoomin", label: "확대하며", group: "모양·특수" },
  { id: "hblur", label: "흐려지며", group: "모양·특수" },
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

/** 효과마다 두 화면의 모습 — p: 0(앞 화면) → 1(뒤 화면). veil: 검은·흰 화면 덮개 */
export function transStyle(type: TransType, p: number): { from: React.CSSProperties; to: React.CSSProperties; veil?: React.CSSProperties; toOnTop: boolean } {
  const q = Math.max(0, Math.min(1, p));
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
