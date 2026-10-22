// 이미지 편집 — 보정 (포토샵 이미지 › 조정): 레벨 Ctrl+L · 곡선 Ctrl+M · 색조/채도 Ctrl+U · 색상 균형 Ctrl+B · 명도/대비
// 모두 "그림 → 새 그림". 대화상자를 연 동안은 미리보기로 계속 다시 만든다
import { copyCanvas } from "./model";

export type Levels = { inB: number; inW: number; gamma: number; outB: number; outW: number };
export type CurvePt = { x: number; y: number };
export type HueSat = { hue: number; sat: number; light: number };
export type Balance = { cr: number; mg: number; yb: number };
export type BrightCon = { b: number; c: number };
export type AdjKind = "levels" | "curves" | "hueSat" | "balance" | "brightCon";
export type AdjVal = { levels: Levels; curves: CurvePt[]; hueSat: HueSat; balance: Balance; brightCon: BrightCon };
export const ADJ_DEFAULT: AdjVal = {
  levels: { inB: 0, inW: 255, gamma: 1, outB: 0, outW: 255 },
  curves: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  hueSat: { hue: 0, sat: 0, light: 0 },
  balance: { cr: 0, mg: 0, yb: 0 },
  brightCon: { b: 0, c: 0 },
};
export const ADJ_TITLE: Record<AdjKind, string> = { levels: "레벨", curves: "곡선", hueSat: "색조/채도", balance: "색상 균형", brightCon: "명도/대비" };

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
/** 색마다 같은 표 (0~255 → 0~255) 로 바꾸기 */
function withLut(src: HTMLCanvasElement, lut: Uint8ClampedArray | [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray]) {
  const out = copyCanvas(src);
  const g = out.getContext("2d", { willReadFrequently: true })!;
  const img = g.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  const [r, gg, b] = Array.isArray(lut) ? lut : [lut, lut, lut];
  for (let i = 0; i < d.length; i += 4) { d[i] = r[d[i]]; d[i + 1] = gg[d[i + 1]]; d[i + 2] = b[d[i + 2]]; }
  g.putImageData(img, 0, 0);
  return out;
}
export function levelsLut(v: Levels) {
  const t = new Uint8ClampedArray(256);
  const span = Math.max(1, v.inW - v.inB);
  for (let i = 0; i < 256; i++) {
    const n = Math.min(1, Math.max(0, (i - v.inB) / span));
    t[i] = clamp(v.outB + Math.pow(n, 1 / Math.max(0.1, v.gamma)) * (v.outW - v.outB));
  }
  return t;
}
/** 곡선 — 점들을 매끄럽게 잇는 표 (단조 3차 보간, 포토샵 곡선처럼 지나가는 점) */
export function curveLut(pts: CurvePt[]) {
  const p = [...pts].sort((a, b) => a.x - b.x);
  const n = p.length;
  const t = new Uint8ClampedArray(256);
  if (n < 2) { for (let i = 0; i < 256; i++) t[i] = i; return t; }
  const dx: number[] = [], m: number[] = [], s: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(Math.max(1e-6, p[i + 1].x - p[i].x)); s.push((p[i + 1].y - p[i].y) / dx[i]); }
  m.push(s[0]);
  for (let i = 1; i < n - 1; i++) m.push(s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2);
  m.push(s[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (s[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / s[i], b = m[i + 1] / s[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * s[i]; m[i + 1] = k * b * s[i]; }
  }
  for (let x = 0; x < 256; x++) {
    if (x <= p[0].x) { t[x] = clamp(p[0].y); continue; }
    if (x >= p[n - 1].x) { t[x] = clamp(p[n - 1].y); continue; }
    let i = 0;
    while (i < n - 2 && x > p[i + 1].x) i++;
    const h = dx[i], u = (x - p[i].x) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    t[x] = clamp(h00 * p[i].y + h10 * h * m[i] + h01 * p[i + 1].y + h11 * h * m[i + 1]);
  }
  return t;
}
function brightConLut(v: BrightCon) {
  const t = new Uint8ClampedArray(256);
  const c = v.c / 100, k = c >= 0 ? 1 / Math.max(0.01, 1 - c * 0.99) : 1 + c;
  for (let i = 0; i < 256; i++) t[i] = clamp((i + v.b - 128) * k + 128);
  return t;
}
/** 색상 균형 (중간 톤) — 녹청↔빨강 · 마젠타↔초록 · 노랑↔파랑 */
function balanceLut(v: Balance): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const mk1 = (amt: number) => {
    const t = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      const w = 1 - Math.abs(i - 128) / 128; // 가운데 톤일수록 많이
      t[i] = clamp(i + amt * 0.6 * (0.35 + 0.65 * w));
    }
    return t;
  };
  return [mk1(v.cr), mk1(-v.mg), mk1(-v.yb)];
}
function rgb2hsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hueSatCanvas(src: HTMLCanvasElement, v: HueSat) {
  const out = copyCanvas(src);
  const g = out.getContext("2d", { willReadFrequently: true })!;
  const img = g.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  const dh = v.hue / 360, ks = v.sat / 100, kl = v.light / 100;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
    h = (h + dh + 1) % 1;
    s = ks >= 0 ? s + (1 - s) * ks * s : s * (1 + ks);
    l = kl >= 0 ? l + (1 - l) * kl : l * (1 + kl);
    if (s <= 0) { d[i] = d[i + 1] = d[i + 2] = l * 255; continue; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    d[i] = hue2rgb(p, q, h + 1 / 3) * 255;
    d[i + 1] = hue2rgb(p, q, h) * 255;
    d[i + 2] = hue2rgb(p, q, h - 1 / 3) * 255;
  }
  g.putImageData(img, 0, 0);
  return out;
}
export function applyAdj<K extends AdjKind>(src: HTMLCanvasElement, kind: K, v: AdjVal[K]) {
  if (kind === "levels") return withLut(src, levelsLut(v as Levels));
  if (kind === "curves") return withLut(src, curveLut(v as CurvePt[]));
  if (kind === "brightCon") return withLut(src, brightConLut(v as BrightCon));
  if (kind === "balance") return withLut(src, balanceLut(v as Balance));
  return hueSatCanvas(src, v as HueSat);
}
/** 밝기 분포 (레벨 · 곡선 대화상자의 그래프) */
export function histogram(src: HTMLCanvasElement) {
  const d = src.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, src.width, src.height).data;
  const h = new Uint32Array(256);
  const step = Math.max(1, Math.floor(d.length / 4 / 400000)) * 4; // 큰 그림은 건너뛰며
  for (let i = 0; i < d.length; i += step) if (d[i + 3]) h[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
  return h;
}
