// 이미지 편집 — 선택 영역 (포토샵처럼). 문서 크기 그림 한 장(mask)에 "골라진 곳"을 불투명하게 칠해 둔다
// 선택 윤곽(사각형·타원) · 올가미 · 다각형 올가미 · 자동 선택(요술봉), 그리고 선택 영역 안에서만 지우기·칠하기·보정
import { copyCanvas, mk, type Box } from "./model";

const ctx = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true })!;
export type SelMode = "new" | "add" | "sub";
/** 펜 점 — 손잡이(hx·hy)는 나가는 쪽, 들어오는 쪽은 반대로 (포토샵 기본 끌기) */
export type PenPt = { x: number; y: number; hx: number; hy: number };
export type SelShape =
  | { kind: "rect" | "ellipse"; box: Box }
  | { kind: "poly"; pts: { x: number; y: number }[] }
  | { kind: "path"; pts: PenPt[] }
  | { kind: "wand"; x: number; y: number };
/** 펜 패스 그리기 (닫힌 모양) */
export function penPath(g: CanvasRenderingContext2D | Path2D, pts: PenPt[], close = true) {
  if (!pts.length) return;
  g.moveTo(pts[0].x, pts[0].y);
  const seg = (a: PenPt, b: PenPt) => g.bezierCurveTo(a.x + a.hx, a.y + a.hy, b.x - b.hx, b.y - b.hy, b.x, b.y);
  for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i]);
  if (close && pts.length > 2) { seg(pts[pts.length - 1], pts[0]); g.closePath(); }
}

/** 모양 → 선택 그림 */
export function shapeMask(W: number, H: number, s: Exclude<SelShape, { kind: "wand" }>) {
  const c = mk(W, H);
  const g = ctx(c);
  g.fillStyle = "#000";
  g.beginPath();
  if (s.kind === "rect") g.rect(s.box.x, s.box.y, s.box.w, s.box.h);
  else if (s.kind === "ellipse") g.ellipse(s.box.x + s.box.w / 2, s.box.y + s.box.h / 2, Math.max(0.5, s.box.w / 2), Math.max(0.5, s.box.h / 2), 0, 0, Math.PI * 2);
  else if (s.kind === "poly") s.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  else if (s.kind === "path") penPath(g, s.pts);
  g.closePath();
  g.fill();
  return c;
}
/** 새로 · 더하기 · 빼기 */
export function combine(base: HTMLCanvasElement | null, add: HTMLCanvasElement, mode: SelMode) {
  if (mode === "new" || !base) return mode === "sub" ? null : add;
  const c = copyCanvas(base);
  const g = ctx(c);
  g.globalCompositeOperation = mode === "add" ? "source-over" : "destination-out";
  g.drawImage(add, 0, 0);
  return isEmpty(c) ? null : c;
}
export function selectAll(W: number, H: number) {
  return shapeMask(W, H, { kind: "rect", box: { x: 0, y: 0, w: W, h: H } });
}
/** 선택 반전 */
export function invertMask(m: HTMLCanvasElement) {
  const c = mk(m.width, m.height);
  const g = ctx(c);
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(m, 0, 0);
  return isEmpty(c) ? null : c;
}
const alphaCache = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();
/** 선택 그림의 투명도만 (윤곽 그리기·범위 찾기용, 한 번만 읽는다) */
export function alphaOf(m: HTMLCanvasElement) {
  let a = alphaCache.get(m);
  if (!a) {
    const d = ctx(m).getImageData(0, 0, m.width, m.height).data;
    a = new Uint8ClampedArray(m.width * m.height);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    alphaCache.set(m, a);
  }
  return a;
}
export function maskBounds(m: HTMLCanvasElement): Box | null {
  const a = alphaOf(m), W = m.width, H = m.height;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[y * W + x] > 127) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const isEmpty = (m: HTMLCanvasElement) => !maskBounds(m);

/** 자동 선택(요술봉) — 누른 곳과 비슷한 색. contiguous = 이어진 곳만 */
export function wandMask(src: HTMLCanvasElement, ox: number, oy: number, W: number, H: number, x: number, y: number, tol: number, contiguous: boolean) {
  const w = src.width, h = src.height;
  const sx = Math.floor(x - ox), sy = Math.floor(y - oy);
  const out = mk(W, H);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  const d = ctx(src).getImageData(0, 0, w, h).data;
  const i0 = (sy * w + sx) * 4;
  const t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
  const same = (p: number) => {
    const i = p * 4;
    if (t[3] === 0 && d[i + 3] === 0) return true;
    return Math.abs(d[i] - t[0]) <= tol && Math.abs(d[i + 1] - t[1]) <= tol && Math.abs(d[i + 2] - t[2]) <= tol && Math.abs(d[i + 3] - t[3]) <= tol;
  };
  const mask = new Uint8Array(w * h);
  if (contiguous) {
    const stack = [sy * w + sx];
    while (stack.length) {
      const p = stack.pop()!;
      if (mask[p] || !same(p)) continue;
      const yy = Math.floor(p / w);
      let l = p, r = p;
      while (l % w > 0 && !mask[l - 1] && same(l - 1)) l--;
      while (r % w < w - 1 && !mask[r + 1] && same(r + 1)) r++;
      for (let q = l; q <= r; q++) {
        mask[q] = 1;
        if (yy > 0 && !mask[q - w]) stack.push(q - w);
        if (yy < h - 1 && !mask[q + w]) stack.push(q + w);
      }
    }
  } else for (let p = 0; p < mask.length; p++) mask[p] = same(p) ? 1 : 0;
  const f = mk(w, h);
  const fg = ctx(f);
  const img = fg.createImageData(w, h);
  for (let p = 0; p < mask.length; p++) if (mask[p]) img.data[p * 4 + 3] = 255;
  fg.putImageData(img, 0, 0);
  ctx(out).drawImage(f, ox, oy);
  return out;
}

/* ── 선택 영역 안에서만 (레이어 그림 기준 ox·oy = 레이어 left·top) ── */
/** changed 를 선택 영역 안에서만 받아들이고 바깥은 orig 그대로 */
export function clipTo(orig: HTMLCanvasElement, changed: HTMLCanvasElement, m: HTMLCanvasElement, ox: number, oy: number) {
  const inside = copyCanvas(changed);
  const gi = ctx(inside);
  gi.globalCompositeOperation = "destination-in";
  gi.drawImage(m, -ox, -oy);
  const out = copyCanvas(orig);
  const go = ctx(out);
  go.globalCompositeOperation = "destination-out";
  go.drawImage(m, -ox, -oy);
  go.globalCompositeOperation = "source-over";
  go.drawImage(inside, 0, 0);
  return out;
}
/** 그림의 선택 영역 안만 남기기 (제자리) */
export function keepInside(c: HTMLCanvasElement, m: HTMLCanvasElement, ox: number, oy: number) {
  const g = ctx(c);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(m, -ox, -oy);
  g.globalCompositeOperation = "source-over";
}
/** 선택 영역 지우기 (Delete) */
export function clearInside(c: HTMLCanvasElement, m: HTMLCanvasElement, ox: number, oy: number) {
  const out = copyCanvas(c);
  const g = ctx(out);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(m, -ox, -oy);
  return out;
}
/** 선택 영역 채우기 (Alt+Backspace 전경색 · Ctrl+Backspace 배경색) */
export function fillInside(c: HTMLCanvasElement, m: HTMLCanvasElement | null, ox: number, oy: number, color: string) {
  const f = mk(c.width, c.height);
  const gf = ctx(f);
  gf.fillStyle = color;
  gf.fillRect(0, 0, f.width, f.height);
  return m ? clipTo(c, (() => { const o = copyCanvas(c); ctx(o).drawImage(f, 0, 0); return o; })(), m, ox, oy) : f;
}
/** 선택 영역의 그림만 떼어내기 (복사 · Ctrl+J) — 문서 좌표 x·y 와 함께 */
export function extract(c: HTMLCanvasElement, ox: number, oy: number, m: HTMLCanvasElement | null) {
  const b = m ? maskBounds(m) : { x: ox, y: oy, w: c.width, h: c.height };
  if (!b) return null;
  const out = mk(b.w, b.h);
  const g = ctx(out);
  g.drawImage(c, ox - b.x, oy - b.y);
  if (m) {
    g.globalCompositeOperation = "destination-in";
    g.drawImage(m, -b.x, -b.y);
  }
  return { c: out, x: b.x, y: b.y };
}

/* ── 보정 (색 반전 · 흑백 · 자동 톤 · 자동 대비 · 자동 색상) ── */
export type Adjust = "invert" | "gray" | "autoTone" | "autoContrast" | "autoColor";
export const ADJUST_NAME: Record<Adjust, string> = { invert: "색 반전", gray: "흑백", autoTone: "자동 톤", autoContrast: "자동 대비", autoColor: "자동 색상" };
/** 끝의 0.1% 는 버리고 가장 어두운·밝은 값 */
function range(hist: Uint32Array, n: number) {
  const cut = n * 0.001;
  let lo = 0, hi = 255, s = 0;
  for (; lo < 255; lo++) { s += hist[lo]; if (s > cut) break; }
  s = 0;
  for (; hi > 0; hi--) { s += hist[hi]; if (s > cut) break; }
  return hi > lo ? [lo, hi] : [0, 255];
}
export function adjustCanvas(src: HTMLCanvasElement, kind: Adjust) {
  const out = copyCanvas(src);
  const g = ctx(out);
  const img = g.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  const lut = (lo: number, hi: number) => { const t = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) t[v] = ((v - lo) * 255) / (hi - lo); return t; };
  if (kind === "invert") for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
  else if (kind === "gray") for (let i = 0; i < d.length; i += 4) { const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = y; }
  else {
    const hs = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)], hy = new Uint32Array(256);
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      n++;
      hs[0][d[i]]++; hs[1][d[i + 1]]++; hs[2][d[i + 2]]++;
      hy[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    }
    if (!n) return out;
    if (kind === "autoContrast") {
      // 밝기 기준으로 세 색을 같이 늘린다 (색감은 그대로)
      const [lo, hi] = range(hy, n), t = lut(lo, hi);
      for (let i = 0; i < d.length; i += 4) { d[i] = t[d[i]]; d[i + 1] = t[d[i + 1]]; d[i + 2] = t[d[i + 2]]; }
    } else {
      // 자동 톤 = 색마다 따로 늘리기. 자동 색상 = 그 위에 가운데 회색을 맞춰 색 틀어짐까지
      const ts = hs.map((h) => { const [lo, hi] = range(h, n); return lut(lo, hi); });
      for (let i = 0; i < d.length; i += 4) { d[i] = ts[0][d[i]]; d[i + 1] = ts[1][d[i + 1]]; d[i + 2] = ts[2][d[i + 2]]; }
      if (kind === "autoColor") {
        const sum = [0, 0, 0];
        for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; }
        const avg = sum.map((v) => v / n), mid = (avg[0] + avg[1] + avg[2]) / 3;
        const gm = avg.map((a) => (a > 1 && a < 254 ? Math.log(mid / 255) / Math.log(a / 255) : 1));
        const gl = gm.map((p) => { const t = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) t[v] = 255 * Math.pow(v / 255, p); return t; });
        for (let i = 0; i < d.length; i += 4) { d[i] = gl[0][d[i]]; d[i + 1] = gl[1][d[i + 1]]; d[i + 2] = gl[2][d[i + 2]]; }
      }
    }
  }
  g.putImageData(img, 0, 0);
  return out;
}

/* ── 획 · 칠 (편집 › 획 / 편집 › 칠) — 문서 크기 그림으로 돌려준다 ── */
export type StrokeOpt = { width: number; pos: "inside" | "center" | "outside"; color: string; dash: "solid" | "dash" | "dot"; opacity: number };
export type FillOpt = { kind: "fg" | "bg" | "color" | "gradient"; color: string; color2: string | null; grad: "down" | "right" | "diag" | "radial"; opacity: number };
const pathOf = (v: Exclude<SelShape, { kind: "wand" }>) => {
  const p = new Path2D();
  if (v.kind === "rect") p.rect(v.box.x, v.box.y, v.box.w, v.box.h);
  else if (v.kind === "ellipse") p.ellipse(v.box.x + v.box.w / 2, v.box.y + v.box.h / 2, Math.max(0.5, v.box.w / 2), Math.max(0.5, v.box.h / 2), 0, 0, Math.PI * 2);
  else if (v.kind === "poly") { v.pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y))); p.closePath(); }
  else if (v.kind === "path") penPath(p, v.pts);
  return p;
};
/** 넓히기 — 8방향으로 1·2·4… 칸씩 겹쳐 그려 n 칸 */
export function grow(m: HTMLCanvasElement, n: number) {
  const c = copyCanvas(m);
  let left = Math.round(n), s = 1;
  while (left > 0) {
    const k = Math.min(s, left);
    const t = copyCanvas(c);
    const g = ctx(c);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7]]) g.drawImage(t, Math.round(dx * k), Math.round(dy * k));
    left -= k;
    s *= 2;

  }
  return c;
}
const inv = (m: HTMLCanvasElement) => {
  const c = mk(m.width, m.height);
  const g = ctx(c);
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(m, 0, 0);
  return c;
};
export const shrink = (m: HTMLCanvasElement, n: number) => inv(grow(inv(m), n));
/** 선택 › 수정 — 확대 · 축소 · 페더(가장자리 흐리게) · 테두리(띠만) · 매끄럽게 */
export function modifyMask(m: HTMLCanvasElement, kind: "expand" | "contract" | "feather" | "border" | "smooth", n: number) {
  if (kind === "expand") return grow(m, n);
  if (kind === "contract") return shrink(m, n);
  if (kind === "border") return minus(grow(m, n / 2), shrink(m, n / 2));
  const c = mk(m.width, m.height);
  const g = ctx(c);
  g.filter = `blur(${Math.max(0.5, kind === "smooth" ? n / 2 : n / 2)}px)`;
  g.drawImage(m, 0, 0);
  g.filter = "none";
  if (kind === "smooth") {
    // 흐린 뒤 반을 기준으로 다시 또렷하게 — 모서리가 둥글어진다
    const img = g.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] >= 128 ? 255 : 0;
    g.putImageData(img, 0, 0);
  }
  return c;
}
const minus = (a: HTMLCanvasElement, b: HTMLCanvasElement) => {
  const c = copyCanvas(a);
  const g = ctx(c);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(b, 0, 0);
  return c;
};
export function strokeCanvas(m: HTMLCanvasElement, vec: SelShape | null | undefined, o: StrokeOpt) {
  const W = m.width, H = m.height, w = Math.max(1, o.width);
  const c = mk(W, H);
  const g = ctx(c);
  g.globalAlpha = o.opacity;
  if (vec && vec.kind !== "wand") {
    // 모양을 아는 선택 — 선으로 그린다 (파선 · 점선 가능)
    const path = pathOf(vec);
    const lw = o.pos === "center" ? w : w * 2;
    g.strokeStyle = o.color;
    g.lineWidth = lw;
    g.lineJoin = o.dash === "dot" ? "round" : "miter";
    g.lineCap = o.dash === "dot" ? "round" : "butt";
    g.setLineDash(o.dash === "dash" ? [w * 3, w * 2] : o.dash === "dot" ? [0.01, w * 2] : []);
    if (o.pos === "inside") { g.save(); g.clip(path); g.stroke(path); g.restore(); }
    else if (o.pos === "outside") {
      const t = mk(W, H);
      const tg = ctx(t);
      Object.assign(tg, { strokeStyle: o.color, lineWidth: lw, lineJoin: g.lineJoin, lineCap: g.lineCap });
      tg.setLineDash(g.getLineDash());
      tg.stroke(path);
      tg.globalCompositeOperation = "destination-out";
      tg.fill(path);
      g.drawImage(t, 0, 0);
    } else g.stroke(path);
    return c;
  }
  // 모양을 모르는 선택 (자동 선택 · 합친 선택) — 넓히기·좁히기로 띠를 만들어 칠한다 (실선)
  const band = o.pos === "inside" ? minus(m, shrink(m, w)) : o.pos === "outside" ? minus(grow(m, w), m) : minus(grow(m, w / 2), shrink(m, w / 2));
  const f = mk(W, H);
  const fg = ctx(f);
  fg.fillStyle = o.color;
  fg.fillRect(0, 0, W, H);
  fg.globalCompositeOperation = "destination-in";
  fg.drawImage(band, 0, 0);
  g.drawImage(f, 0, 0);
  return c;
}
/** 칠 — 선택 영역 안 (없으면 문서 전체) 을 색 또는 그레이디언트로 */
export function fillCanvas(W: number, H: number, m: HTMLCanvasElement | null, o: FillOpt, fg: string, bg: string) {
  const c = mk(W, H);
  const g = ctx(c);
  const b = (m && maskBounds(m)) || { x: 0, y: 0, w: W, h: H };
  if (o.kind === "gradient") {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const grd = o.grad === "radial" ? g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, Math.hypot(b.w, b.h) / 2))
      : o.grad === "right" ? g.createLinearGradient(b.x, 0, b.x + b.w, 0)
      : o.grad === "diag" ? g.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h)
      : g.createLinearGradient(0, b.y, 0, b.y + b.h);
    grd.addColorStop(0, o.color);
    grd.addColorStop(1, o.color2 || "rgba(0,0,0,0)");
    g.fillStyle = grd;
  } else g.fillStyle = o.kind === "fg" ? fg : o.kind === "bg" ? bg : o.color;
  g.globalAlpha = o.opacity;
  g.fillRect(0, 0, W, H);
  if (m) {
    g.globalAlpha = 1;
    g.globalCompositeOperation = "destination-in";
    g.drawImage(m, 0, 0);
  }
  return c;
}
/** 투명한 가장자리를 잘라낸 그림과 그 자리 (새 레이어를 가볍게) */
export function trimCanvas(c: HTMLCanvasElement) {
  const d = ctx(c).getImageData(0, 0, c.width, c.height).data;
  const W = c.width, H = c.height;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const out = mk(x1 - x0 + 1, y1 - y0 + 1);
  ctx(out).drawImage(c, -x0, -y0);
  return { c: out, x: x0, y: y0 };
}

/* ── 스팟 복구 (J) — 칠한 곳을 둘레 색으로 메운다: 작은 번짐부터 큰 번짐까지 차례로 빈 곳을 채우고, 마지막에 살짝 고르게 ── */
export function inpaint(base: HTMLCanvasElement, hole: HTMLCanvasElement) {
  const W = base.width, H = base.height;
  const ha = ctx(hole).getImageData(0, 0, W, H).data;
  // 칠한 곳 둘레만 다룬다 (빠르게)
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ha[(y * W + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return copyCanvas(base);
  const pad = Math.max(16, Math.round(Math.max(x1 - x0, y1 - y0) * 0.6));
  const bx = Math.max(0, x0 - pad), by = Math.max(0, y0 - pad), bw = Math.min(W, x1 + pad + 1) - bx, bh = Math.min(H, y1 + pad + 1) - by;
  const work = mk(bw, bh);
  const wg = ctx(work);
  wg.drawImage(base, -bx, -by);
  const img = wg.getImageData(0, 0, bw, bh);
  const d = img.data;
  const inHole = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (ha[((y + by) * W + (x + bx)) * 4 + 3] > 20) { inHole[y * bw + x] = 1; d[(y * bw + x) * 4 + 3] = 0; }
  const filled = new Uint8Array(bw * bh);
  const tmp = mk(bw, bh);
  const tg = ctx(tmp);
  for (const r of [2, 4, 8, 16, 32, 64, 128]) {
    tg.putImageData(img, 0, 0);
    const bl = mk(bw, bh);
    const bg = ctx(bl);
    bg.filter = `blur(${r}px)`;
    bg.drawImage(tmp, 0, 0);
    const bd = bg.getImageData(0, 0, bw, bh).data;
    let left = 0;
    for (let p = 0; p < inHole.length; p++) {
      if (!inHole[p] || filled[p]) continue;
      const i = p * 4;
      if (bd[i + 3] > 8) { d[i] = bd[i]; d[i + 1] = bd[i + 1]; d[i + 2] = bd[i + 2]; d[i + 3] = 255; filled[p] = 1; } else left++;
    }
    if (!left) break;
  }
  // 메운 곳만 한 번 더 살짝 고르게
  tg.putImageData(img, 0, 0);
  const sm = mk(bw, bh);
  const sg = ctx(sm);
  sg.filter = "blur(1.5px)";
  sg.drawImage(tmp, 0, 0);
  const sd = sg.getImageData(0, 0, bw, bh).data;
  for (let p = 0; p < inHole.length; p++) if (inHole[p]) { const i = p * 4; d[i] = sd[i]; d[i + 1] = sd[i + 1]; d[i + 2] = sd[i + 2]; d[i + 3] = 255; }
  wg.putImageData(img, 0, 0);
  const out = copyCanvas(base);
  ctx(out).drawImage(work, bx, by);
  return out;
}

/* ── 페인트 통 (포토샵처럼) — 허용치 · 인접 · 모든 레이어 · 앤티 앨리어스 · 모드 · 불투명도 ── */
export type BucketOpt = { color: string; tol: number; contiguous: boolean; aa: boolean; opacity: number; mode: GlobalCompositeOperation };
/** target 그림 위 (lx, ly) 를 눌러 채운 새 그림. sample = 비슷한 색을 찾을 그림 (target 과 같은 자리·크기) */
export function bucketFill(target: HTMLCanvasElement, sample: HTMLCanvasElement, lx: number, ly: number, o: BucketOpt) {
  const W = target.width, H = target.height;
  let m = wandMask(sample, 0, 0, W, H, lx, ly, o.tol, o.contiguous);
  if (!m) return copyCanvas(target);
  if (o.aa) {
    // 가장자리를 반 칸쯤 부드럽게
    const s = mk(W, H);
    const sg = ctx(s);
    sg.filter = "blur(0.6px)";
    sg.drawImage(m, 0, 0);
    m = s;
  }
  const f = mk(W, H);
  const fg = ctx(f);
  fg.fillStyle = o.color;
  fg.fillRect(0, 0, W, H);
  fg.globalCompositeOperation = "destination-in";
  fg.drawImage(m, 0, 0);
  // 칠할 곳 안 = 원래 그림 위에 (모드 · 불투명도로) 색을 얹은 것, 바깥 = 원래 그림 그대로
  const inside = copyCanvas(target);
  const ig = ctx(inside);
  ig.globalAlpha = o.opacity;
  ig.globalCompositeOperation = o.mode;
  ig.drawImage(f, 0, 0);
  ig.globalAlpha = 1;
  ig.globalCompositeOperation = "destination-in";
  ig.drawImage(m, 0, 0);
  const out = copyCanvas(target);
  const g = ctx(out);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(m, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.drawImage(inside, 0, 0);
  return out;
}
