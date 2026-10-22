// 이미지 편집 — 필터 (포토샵 필터 메뉴와 같은 이름 · 같은 갈래). 그림 한 장 → 같은 크기 새 그림
// 흐림은 브라우저 그리기(blur) 를 써서 빠르게, 나머지는 픽셀 계산. 큰 반경은 상한을 두어 멈추지 않게.

export type FParam =
  | { key: string; label: string; min: number; max: number; step?: number; def: number; unit?: string }
  | { key: string; label: string; options: [string, string][]; def: string };
export type FVals = Record<string, number | string>;
export type FCtx = { fg: string; bg: string };
export type Filter = { id: string; name: string; params?: FParam[]; run: (src: HTMLCanvasElement, v: FVals, c: FCtx) => HTMLCanvasElement };

/* ── 도움 ── */
const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
const g2 = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true })!;
const dataOf = (c: HTMLCanvasElement) => g2(c).getImageData(0, 0, c.width, c.height);
const fromData = (d: ImageData) => { const c = mk(d.width, d.height); g2(c).putImageData(d, 0, 0); return c; };
const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const num = (v: FVals, k: string) => Number(v[k]) || 0;
const hex = (h: string) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || "") ; const n = m ? parseInt(m[1], 16) : 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** 가장자리를 늘려 붙인 그림 (흐림이 가장자리에서 투명하게 빠지지 않게 — 포토샵처럼) */
function padded(src: HTMLCanvasElement, p: number) {
  const W = src.width, H = src.height, c = mk(W + p * 2, H + p * 2), g = g2(c);
  g.drawImage(src, p, p);
  g.drawImage(src, 0, 0, 1, H, 0, p, p, H); g.drawImage(src, W - 1, 0, 1, H, p + W, p, p, H);
  g.drawImage(src, 0, 0, W, 1, p, 0, W, p); g.drawImage(src, 0, H - 1, W, 1, p, p + H, W, p);
  g.drawImage(src, 0, 0, 1, 1, 0, 0, p, p); g.drawImage(src, W - 1, 0, 1, 1, p + W, 0, p, p);
  g.drawImage(src, 0, H - 1, 1, 1, 0, p + H, p, p); g.drawImage(src, W - 1, H - 1, 1, 1, p + W, p + H, p, p);
  return c;
}
/** 투명한 곳이 있는 그림인가 (있으면 가장자리 늘리기를 안 한다) */
function hasAlpha(src: HTMLCanvasElement) {
  const d = dataOf(src).data;
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) return true;
  return false;
}
/** 가우시안 흐림 */
export function gauss(src: HTMLCanvasElement, r: number) {
  if (r <= 0) return src;
  const alpha = hasAlpha(src), p = alpha ? 0 : Math.ceil(r * 3);
  const s = p ? padded(src, p) : src;
  const t = mk(s.width, s.height), g = g2(t);
  g.filter = `blur(${r}px)`;
  g.drawImage(s, 0, 0);
  const out = mk(src.width, src.height);
  g2(out).drawImage(t, -p, -p);
  return out;
}
/** 여러 장을 겹쳐 평균 — 동작·방사형 흐림 */
function average(src: HTMLCanvasElement, n: number, place: (g: CanvasRenderingContext2D, i: number, t: number) => void, pad = 0) {
  const out = mk(src.width, src.height), g = g2(out);
  const p = hasAlpha(src) ? 0 : Math.ceil(pad);
  const s = p ? padded(src, p) : src;
  for (let i = 0; i < n; i++) {
    g.save();
    g.globalAlpha = 1 / (i + 1);
    place(g, i, n > 1 ? i / (n - 1) - 0.5 : 0);
    g.drawImage(s, -p, -p);
    g.restore();
  }
  return out;
}
/** 픽셀 하나씩 */
function perPixel(src: HTMLCanvasElement, fn: (d: Uint8ClampedArray, i: number, x: number, y: number) => void) {
  const im = dataOf(src), d = im.data, W = im.width;
  for (let i = 0, n = d.length; i < n; i += 4) fn(d, i, (i >> 2) % W, Math.floor((i >> 2) / W));
  return fromData(im);
}
/** 3×3 (또는 n×n) 합성곱 */
function convolve(src: HTMLCanvasElement, k: number[], div = 1, add = 0, keepAlpha = true) {
  const im = dataOf(src), s = im.data, W = im.width, H = im.height, o = new ImageData(W, H), d = o.data;
  const n = Math.round(Math.sqrt(k.length)), h = n >> 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, gg = 0, b = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const xx = Math.min(W - 1, Math.max(0, x + i - h)), yy = Math.min(H - 1, Math.max(0, y + j - h));
      const p = (yy * W + xx) * 4, w = k[j * n + i];
      r += s[p] * w; gg += s[p + 1] * w; b += s[p + 2] * w;
    }
    const q = (y * W + x) * 4;
    d[q] = clamp(r / div + add); d[q + 1] = clamp(gg / div + add); d[q + 2] = clamp(b / div + add); d[q + 3] = keepAlpha ? s[q + 3] : 255;
  }
  return fromData(o);
}
/** 거꾸로 따라가 옮기기 (왜곡) — fn: 결과 x,y → 원본 x,y (밖이면 null) */
function remap(src: HTMLCanvasElement, fn: (x: number, y: number, W: number, H: number) => [number, number] | null, wrap = false) {
  const im = dataOf(src), s = im.data, W = im.width, H = im.height, o = new ImageData(W, H), d = o.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const m = fn(x + 0.5, y + 0.5, W, H);
    const q = (y * W + x) * 4;
    if (!m) continue;
    let sx = m[0] - 0.5, sy = m[1] - 0.5;
    if (wrap) { sx = ((sx % W) + W) % W; sy = ((sy % H) + H) % H; }
    if (sx < -0.5 || sy < -0.5 || sx > W - 0.5 || sy > H - 0.5) continue;
    // 쌍선형
    const x0 = Math.max(0, Math.min(W - 1, Math.floor(sx))), y0 = Math.max(0, Math.min(H - 1, Math.floor(sy)));
    const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), fx = Math.max(0, Math.min(1, sx - x0)), fy = Math.max(0, Math.min(1, sy - y0));
    const a = (y0 * W + x0) * 4, b = (y0 * W + x1) * 4, c = (y1 * W + x0) * 4, e = (y1 * W + x1) * 4;
    for (let k = 0; k < 4; k++) d[q + k] = (s[a + k] * (1 - fx) + s[b + k] * fx) * (1 - fy) + (s[c + k] * (1 - fx) + s[e + k] * fx) * fy;
  }
  return fromData(o);
}
/** 중간값 (채널마다 막대 그래프로 — 반경이 커도 빠르게) */
function median(src: HTMLCanvasElement, r: number, threshold = -1) {
  r = Math.max(1, Math.min(12, Math.round(r)));
  const im = dataOf(src), s = im.data, W = im.width, H = im.height, o = new ImageData(new Uint8ClampedArray(s), W, H), d = o.data;
  const half = ((2 * r + 1) * (2 * r + 1)) >> 1;
  for (let ch = 0; ch < 3; ch++) {
    for (let y = 0; y < H; y++) {
      const hist = new Uint32Array(256);
      let cnt = 0;
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const xx = Math.max(0, Math.min(W - 1, i)), yy = Math.max(0, Math.min(H - 1, y + j));
        hist[s[(yy * W + xx) * 4 + ch]]++; cnt++;
      }
      for (let x = 0; x < W; x++) {
        if (x > 0) {
          const xo = Math.max(0, x - r - 1), xn = Math.min(W - 1, x + r);
          for (let j = -r; j <= r; j++) {
            const yy = Math.max(0, Math.min(H - 1, y + j));
            hist[s[(yy * W + xo) * 4 + ch]]--; hist[s[(yy * W + xn) * 4 + ch]]++;
          }
        }
        let acc = 0, m = 0;
        for (; m < 256; m++) { acc += hist[m]; if (acc > half) break; }
        void cnt;
        const q = (y * W + x) * 4 + ch;
        if (threshold < 0 || Math.abs(s[q] - m) > threshold) d[q] = m;
      }
    }
  }
  return fromData(o);
}
/** 최대값 · 최소값 (채널마다, 가로·세로 나눠서) */
function maxMin(src: HTMLCanvasElement, r: number, max: boolean) {
  r = Math.max(1, Math.min(50, Math.round(r)));
  const im = dataOf(src), W = im.width, H = im.height;
  let a = im.data;
  const pass = (horiz: boolean) => {
    const b = new Uint8ClampedArray(a);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      for (let ch = 0; ch < 3; ch++) {
        let v = max ? 0 : 255;
        for (let k = -r; k <= r; k++) {
          const xx = horiz ? Math.max(0, Math.min(W - 1, x + k)) : x, yy = horiz ? y : Math.max(0, Math.min(H - 1, y + k));
          const p = a[(yy * W + xx) * 4 + ch];
          v = max ? (p > v ? p : v) : (p < v ? p : v);
        }
        b[(y * W + x) * 4 + ch] = v;
      }
    }
    a = b;
  };
  pass(true); pass(false);
  return fromData(new ImageData(a, W, H));
}
/** 표면 흐림 — 비슷한 색끼리만 섞는다 (경계는 그대로) */
function surface(src: HTMLCanvasElement, r: number, th: number) {
  r = Math.max(1, Math.min(8, Math.round(r)));
  const im = dataOf(src), s = im.data, W = im.width, H = im.height, o = new ImageData(new Uint8ClampedArray(s), W, H), d = o.data;
  const step = r > 4 ? 2 : 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = (y * W + x) * 4;
    let R = 0, G = 0, B = 0, n = 0;
    for (let j = -r; j <= r; j += step) for (let i = -r; i <= r; i += step) {
      const xx = Math.max(0, Math.min(W - 1, x + i)), yy = Math.max(0, Math.min(H - 1, y + j)), p = (yy * W + xx) * 4;
      if (Math.abs(s[p] - s[q]) + Math.abs(s[p + 1] - s[q + 1]) + Math.abs(s[p + 2] - s[q + 2]) > th * 3) continue;
      R += s[p]; G += s[p + 1]; B += s[p + 2]; n++;
    }
    if (n) { d[q] = R / n; d[q + 1] = G / n; d[q + 2] = B / n; }
  }
  return fromData(o);
}
/** 값 잡음 (구름) — 0~1 */
function noiseField(W: number, H: number, scale: number, seed: number) {
  let s = seed >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const out = new Float32Array(W * H);
  let amp = 1, total = 0;
  for (let oct = 0; oct < 6; oct++) {
    const cell = Math.max(2, scale / 2 ** oct), gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1], c = grid[(y0 + 1) * gw + x0], e = grid[(y0 + 1) * gw + x0 + 1];
      out[y * W + x] += ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + e * sx) * sy) * amp;
    }
    total += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
const blendCanvas = (a: HTMLCanvasElement, b: HTMLCanvasElement, mix: (x: number, y: number) => number) => {
  const A = dataOf(a), B = dataOf(b).data, d = A.data, W = A.width;
  for (let i = 0; i < d.length; i += 4) { const t = mix((i >> 2) % W, Math.floor((i >> 2) / W)); for (let k = 0; k < 4; k++) d[i + k] = d[i + k] * (1 - t) + B[i + k] * t; }
  return fromData(A);
};
const ang = (deg: number) => (deg * Math.PI) / 180;

/* ── 필터 목록 ── */
const P = (key: string, label: string, min: number, max: number, def: number, unit = "", step = 1): FParam => ({ key, label, min, max, def, unit, step });
export const FILTERS: Record<string, Filter> = {
  /* 노이즈 */
  reduceNoise: { id: "reduceNoise", name: "노이즈 감소", params: [P("r", "강도", 1, 8, 3), P("th", "세부 유지 (경계)", 2, 60, 18)], run: (s, v) => surface(s, num(v, "r"), num(v, "th")) },
  addNoise: { id: "addNoise", name: "노이즈 추가", params: [P("amt", "양", 1, 100, 12, "%"), { key: "dist", label: "분포", options: [["uniform", "균일"], ["gauss", "가우시안"]], def: "gauss" }, { key: "mono", label: "단색", options: [["0", "아니오"], ["1", "예"]], def: "0" }],
    run: (s, v) => {
      const a = num(v, "amt") * 2.55, g = v.dist === "gauss", mono = v.mono === "1";
      const rn = () => (g ? (Math.random() + Math.random() + Math.random() - 1.5) / 1.5 : Math.random() * 2 - 1) * a;
      return perPixel(s, (d, i) => { if (mono) { const n = rn(); d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n); } else { d[i] = clamp(d[i] + rn()); d[i + 1] = clamp(d[i + 1] + rn()); d[i + 2] = clamp(d[i + 2] + rn()); } });
    } },
  dust: { id: "dust", name: "먼지와 스크래치", params: [P("r", "반경", 1, 12, 2, "px"), P("th", "한계값", 0, 128, 10)], run: (s, v) => median(s, num(v, "r"), num(v, "th")) },
  despeckle: { id: "despeckle", name: "반점 제거", run: (s) => median(s, 1, 6) },
  median: { id: "median", name: "중간값", params: [P("r", "반경", 1, 12, 2, "px")], run: (s, v) => median(s, num(v, "r")) },

  /* 렌더 */
  clouds: { id: "clouds", name: "구름 효과 1", params: [P("scale", "크기", 20, 600, 160, "px"), P("seed", "모양 바꾸기", 1, 999, 7)],
    run: (s, v, c) => { const n = noiseField(s.width, s.height, num(v, "scale"), num(v, "seed")), a = hex(c.fg), b = hex(c.bg); return perPixel(s, (d, i) => { const t = n[i >> 2]; d[i] = a[0] * (1 - t) + b[0] * t; d[i + 1] = a[1] * (1 - t) + b[1] * t; d[i + 2] = a[2] * (1 - t) + b[2] * t; d[i + 3] = 255; }); } },
  clouds2: { id: "clouds2", name: "구름 효과 2 (차이)", params: [P("scale", "크기", 20, 600, 160, "px"), P("seed", "모양 바꾸기", 1, 999, 7)],
    run: (s, v, c) => { const n = noiseField(s.width, s.height, num(v, "scale"), num(v, "seed")), a = hex(c.fg), b = hex(c.bg); return perPixel(s, (d, i) => { const t = n[i >> 2]; for (let k = 0; k < 3; k++) d[i + k] = Math.abs(d[i + k] - (a[k] * (1 - t) + b[k] * t)); }); } },
  flare: { id: "flare", name: "렌즈 플레어", params: [P("x", "가로 위치", 0, 100, 30, "%"), P("y", "세로 위치", 0, 100, 25, "%"), P("amt", "명도", 10, 300, 100, "%")],
    run: (s, v) => {
      const out = mk(s.width, s.height), g = g2(out), W = s.width, H = s.height;
      g.drawImage(s, 0, 0);
      const cx = (num(v, "x") / 100) * W, cy = (num(v, "y") / 100) * H, k = num(v, "amt") / 100, R = Math.max(W, H);
      g.globalCompositeOperation = "screen";
      const glow = (x: number, y: number, r: number, col: string, a: number) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${Math.min(1, a * k)})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
      glow(cx, cy, R * 0.35, "255,250,230", 0.9); glow(cx, cy, R * 0.08, "255,255,255", 1);
      const dx = W / 2 - cx, dy = H / 2 - cy;
      [[0.5, 0.04, "120,200,255", 0.35], [0.9, 0.07, "255,180,120", 0.25], [1.3, 0.03, "180,255,180", 0.3], [1.7, 0.1, "160,140,255", 0.18]].forEach(([t, r, col, a]) => glow(cx + dx * Number(t) * 2, cy + dy * Number(t) * 2, R * Number(r), String(col), Number(a)));
      return out;
    } },
  fibers: { id: "fibers", name: "섬유", params: [P("var", "변화", 1, 64, 16), P("str", "강도", 1, 64, 4)],
    run: (s, v, c) => {
      const W = s.width, H = s.height, a = hex(c.fg), b = hex(c.bg), col = new Float32Array(W);
      for (let x = 0; x < W; x++) col[x] = Math.random();
      const n = noiseField(W, H, Math.max(4, 200 / num(v, "var")), 3);
      return perPixel(s, (d, i, x, y) => { const t = Math.max(0, Math.min(1, col[x] * 0.6 + n[y * W + x] * 0.4 + Math.sin(y / (num(v, "str") * 6) + col[x] * 9) * 0.1)); for (let k = 0; k < 3; k++) d[i + k] = a[k] * (1 - t) + b[k] * t; d[i + 3] = 255; });
    } },

  /* 비디오 */
  ntsc: { id: "ntsc", name: "NTSC 색상", run: (s) => perPixel(s, (d, i) => { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; for (let k = 0; k < 3; k++) d[i + k] = clamp(l + (d[i + k] - l) * 0.8); }) },
  deinterlace: { id: "deinterlace", name: "인터레이스 제거", params: [{ key: "keep", label: "남길 줄", options: [["odd", "홀수 줄"], ["even", "짝수 줄"]], def: "odd" }],
    run: (s, v) => { const im = dataOf(s), d = im.data, W = im.width, H = im.height, off = v.keep === "even" ? 1 : 0; for (let y = off; y < H; y += 2) { const src = Math.min(H - 1, y + (off ? -1 : 1)); d.copyWithin(y * W * 4, src * W * 4, src * W * 4 + W * 4); } return fromData(im); } },

  /* 선명 효과 */
  sharpen: { id: "sharpen", name: "선명하게", run: (s) => convolve(s, [0, -0.5, 0, -0.5, 3, -0.5, 0, -0.5, 0]) },
  sharpenMore: { id: "sharpenMore", name: "더 선명하게", run: (s) => convolve(s, [0, -1, 0, -1, 5, -1, 0, -1, 0]) },
  sharpenEdges: { id: "sharpenEdges", name: "가장자리 선명하게", run: (s) => FILTERS.unsharp.run(s, { amt: 120, r: 1, th: 12 }, { fg: "", bg: "" }) },
  unsharp: { id: "unsharp", name: "언샤프 마스크", params: [P("amt", "양", 1, 500, 100, "%"), P("r", "반경", 0.1, 50, 1.5, "px", 0.1), P("th", "한계값", 0, 255, 0, "레벨")],
    run: (s, v) => { const bl = dataOf(gauss(s, num(v, "r"))).data, a = num(v, "amt") / 100, th = num(v, "th"); return perPixel(s, (d, i) => { for (let k = 0; k < 3; k++) { const diff = d[i + k] - bl[i + k]; if (Math.abs(diff) >= th) d[i + k] = clamp(d[i + k] + diff * a); } }); } },
  smartSharpen: { id: "smartSharpen", name: "고급 선명 효과", params: [P("amt", "양", 1, 500, 150, "%"), P("r", "반경", 0.1, 20, 1, "px", 0.1), P("nr", "노이즈 감소", 0, 100, 10, "%")],
    run: (s, v) => FILTERS.unsharp.run(s, { amt: num(v, "amt"), r: num(v, "r"), th: num(v, "nr") / 5 }, { fg: "", bg: "" }) },

  /* 스타일화 */
  findEdges: { id: "findEdges", name: "가장자리 찾기", run: (s) => { const e = dataOf(convolve(s, [-1, -1, -1, -1, 8, -1, -1, -1, -1])), d = e.data; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = 255 - d[i + k]; return fromData(e); } },
  emboss: { id: "emboss", name: "엠보스", params: [P("angle", "각도", -180, 180, 135, "°"), P("h", "높이", 1, 10, 3, "px"), P("amt", "양", 1, 500, 100, "%")],
    run: (s, v) => {
      const im = dataOf(s), sd = im.data, W = im.width, H = im.height, o = new ImageData(W, H), d = o.data;
      const dx = Math.round(Math.cos(ang(num(v, "angle"))) * num(v, "h")), dy = Math.round(-Math.sin(ang(num(v, "angle"))) * num(v, "h")), a = num(v, "amt") / 100;
      const L = (x: number, y: number) => { const p = (Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))) * 4; return 0.299 * sd[p] + 0.587 * sd[p + 1] + 0.114 * sd[p + 2]; };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const q = (y * W + x) * 4, val = clamp(128 + (L(x + dx, y + dy) - L(x - dx, y - dy)) * a); d[q] = d[q + 1] = d[q + 2] = val; d[q + 3] = sd[q + 3]; }
      return fromData(o);
    } },
  traceContour: { id: "traceContour", name: "윤곽선 추적", params: [P("lv", "레벨", 0, 255, 128)],
    run: (s, v) => { const im = dataOf(s), sd = im.data, W = im.width, H = im.height, o = new ImageData(W, H), d = o.data, lv = num(v, "lv");
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const q = (y * W + x) * 4; for (let k = 0; k < 3; k++) { const a = sd[q + k] >= lv, r = x + 1 < W && (sd[q + 4 + k] >= lv) !== a, b = y + 1 < H && (sd[q + W * 4 + k] >= lv) !== a; d[q + k] = r || b ? 0 : 255; } d[q + 3] = sd[q + 3]; }
      return fromData(o); } },
  wind: { id: "wind", name: "바람", params: [{ key: "dir", label: "방향", options: [["right", "오른쪽에서"], ["left", "왼쪽에서"]], def: "right" }, P("len", "세기", 4, 80, 24, "px")],
    run: (s, v) => { const im = dataOf(s), d = im.data, W = im.width, H = im.height, len = num(v, "len"), dir = v.dir === "left" ? -1 : 1;
      for (let y = 0; y < H; y++) { let run = 0; const rv = [0, 0, 0];
        for (let n = 0; n < W; n++) { const x = dir > 0 ? W - 1 - n : n, q = (y * W + x) * 4, lum = d[q] + d[q + 1] + d[q + 2];
          if (Math.random() < 0.06 && lum > 300) { run = Math.random() * len; rv[0] = d[q]; rv[1] = d[q + 1]; rv[2] = d[q + 2]; }
          else if (run > 0) { const t = run / len; for (let k = 0; k < 3; k++) d[q + k] = Math.max(d[q + k], d[q + k] * (1 - t) + rv[k] * t); run--; } } }
      return fromData(im); } },
  diffuse: { id: "diffuse", name: "확산", params: [P("r", "거리", 1, 10, 2, "px")],
    run: (s, v) => { const im = dataOf(s), sd = im.data, W = im.width, H = im.height, o = new ImageData(W, H), d = o.data, r = num(v, "r");
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const xx = Math.max(0, Math.min(W - 1, x + Math.round((Math.random() * 2 - 1) * r))), yy = Math.max(0, Math.min(H - 1, y + Math.round((Math.random() * 2 - 1) * r))), p = (yy * W + xx) * 4, q = (y * W + x) * 4; for (let k = 0; k < 4; k++) d[q + k] = sd[p + k]; }
      return fromData(o); } },
  oilPaint: { id: "oilPaint", name: "유화", params: [P("r", "붓 크기", 2, 8, 4, "px")],
    run: (s, v) => { const r = Math.round(num(v, "r")), im = dataOf(s), sd = im.data, W = im.width, H = im.height, o = new ImageData(new Uint8ClampedArray(sd), W, H), d = o.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let best = Infinity, br = 0, bg = 0, bb = 0;
        for (const [ox, oy] of [[-r, -r], [0, -r], [-r, 0], [0, 0]]) { let R = 0, G = 0, B = 0, S = 0, n = 0;
          for (let j = 0; j <= r; j += 2) for (let i = 0; i <= r; i += 2) { const xx = Math.max(0, Math.min(W - 1, x + ox + i)), yy = Math.max(0, Math.min(H - 1, y + oy + j)), p = (yy * W + xx) * 4, l = sd[p] + sd[p + 1] + sd[p + 2]; R += sd[p]; G += sd[p + 1]; B += sd[p + 2]; S += l * l; n++; }
          const m = (R + G + B) / n, va = S / n - m * m; if (va < best) { best = va; br = R / n; bg = G / n; bb = B / n; } }
        const q = (y * W + x) * 4; d[q] = br; d[q + 1] = bg; d[q + 2] = bb; }
      return fromData(o); } },
  solarize: { id: "solarize", name: "솔라리즈", run: (s) => perPixel(s, (d, i) => { for (let k = 0; k < 3; k++) if (d[i + k] > 127) d[i + k] = 255 - d[i + k]; }) },

  /* 왜곡 */
  spherize: { id: "spherize", name: "구형화", params: [P("amt", "양", -100, 100, 100, "%")],
    run: (s, v) => { const a = num(v, "amt") / 100; return remap(s, (x, y, W, H) => { const cx = W / 2, cy = H / 2, nx = (x - cx) / cx, ny = (y - cy) / cy, r = Math.hypot(nx, ny); if (r >= 1 || r === 0) return [x, y]; const nr = a >= 0 ? r * (1 - a) + Math.asin(r) / (Math.PI / 2) * a : r * (1 + a) + r * r * -a; const k = nr / r; return [cx + nx * k * cx, cy + ny * k * cy]; }); } },
  pinch: { id: "pinch", name: "핀치", params: [P("amt", "양", -100, 100, 50, "%")],
    run: (s, v) => { const a = num(v, "amt") / 100; return remap(s, (x, y, W, H) => { const cx = W / 2, cy = H / 2, nx = (x - cx) / cx, ny = (y - cy) / cy, r = Math.hypot(nx, ny); if (r >= 1 || r === 0) return [x, y]; const k = Math.pow(Math.sin((Math.PI / 2) * r), a) / r * r; return [cx + nx * (k || 1) * cx, cy + ny * (k || 1) * cy]; }); } },
  twirl: { id: "twirl", name: "돌리기", params: [P("angle", "각도", -999, 999, 50, "°")],
    run: (s, v) => { const a = ang(num(v, "angle")); return remap(s, (x, y, W, H) => { const cx = W / 2, cy = H / 2, R = Math.min(cx, cy), dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r >= R) return [x, y]; const t = a * (1 - r / R), c = Math.cos(t), sn = Math.sin(t); return [cx + dx * c - dy * sn, cy + dx * sn + dy * c]; }); } },
  ripple: { id: "ripple", name: "잔물결", params: [P("amt", "양", -999, 999, 100, "%"), { key: "size", label: "크기", options: [["small", "작게"], ["medium", "중간"], ["large", "크게"]], def: "medium" }],
    run: (s, v) => { const a = num(v, "amt") / 100 * 4, wl = v.size === "small" ? 8 : v.size === "large" ? 30 : 16; return remap(s, (x, y) => [x + Math.sin(y / wl * Math.PI * 2) * a, y + Math.sin(x / wl * Math.PI * 2) * a]); } },
  zigzag: { id: "zigzag", name: "지그재그", params: [P("amt", "양", -100, 100, 10), P("ridges", "능선", 1, 20, 5)],
    run: (s, v) => { const a = num(v, "amt") / 100, n = num(v, "ridges"); return remap(s, (x, y, W, H) => { const cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), R = Math.min(cx, cy); if (r >= R || r === 0) return [x, y]; const t = Math.sin((r / R) * Math.PI * n) * a * (1 - r / R) * 2, c = Math.cos(t), sn = Math.sin(t); return [cx + dx * c - dy * sn, cy + dx * sn + dy * c]; }); } },
  wave: { id: "wave", name: "파형", params: [P("wl", "파장", 4, 400, 60, "px"), P("amp", "진폭", 1, 200, 12, "px"), { key: "type", label: "유형", options: [["sine", "사인파"], ["tri", "삼각형"], ["square", "사각형"]], def: "sine" }],
    run: (s, v) => { const wl = num(v, "wl"), amp = num(v, "amp"); const f = (t: number) => (v.type === "tri" ? 2 / Math.PI * Math.asin(Math.sin(t)) : v.type === "square" ? Math.sign(Math.sin(t)) : Math.sin(t)); return remap(s, (x, y) => [x + f((y / wl) * Math.PI * 2) * amp, y + f((x / wl) * Math.PI * 2 + 1) * amp]); } },
  polar: { id: "polar", name: "극좌표", params: [{ key: "mode", label: "방식", options: [["toPolar", "직교 좌표를 극좌표로"], ["toRect", "극좌표를 직교 좌표로"]], def: "toPolar" }],
    run: (s, v) => v.mode === "toRect"
      ? remap(s, (x, y, W, H) => { const t = (x / W) * Math.PI * 2 - Math.PI / 2, r = ((H - y) / H) * Math.min(W, H) / 2; return [W / 2 + Math.cos(t) * r * (W / Math.min(W, H)), H / 2 + Math.sin(t) * r * (H / Math.min(W, H))]; })
      : remap(s, (x, y, W, H) => { const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2), r = Math.hypot(dx, dy); if (r > 1) return null; let t = Math.atan2(dy, dx) + Math.PI / 2; if (t < 0) t += Math.PI * 2; return [(t / (Math.PI * 2)) * W, H - r * H]; }) },
  shear: { id: "shear", name: "기울임", params: [P("amt", "기울기", -100, 100, 30, "%")],
    run: (s, v) => { const a = num(v, "amt") / 100; return remap(s, (x, y, W, H) => [x - Math.sin((y / H) * Math.PI) * a * W * 0.2, y], true); } },

  /* 픽셀화 */
  facet: { id: "facet", name: "단면화", run: (s) => perPixel(median(s, 2), (d, i) => { for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 24) * 24; }) },
  mezzotint: { id: "mezzotint", name: "메조틴트", params: [{ key: "type", label: "유형", options: [["fine", "미세한 점"], ["coarse", "굵은 점"], ["lines", "짧은 선"]], def: "fine" }],
    run: (s, v) => { const W = s.width; return perPixel(s, (d, i, x, y) => { const r = v.type === "lines" ? ((Math.sin(x * 0.7 + y * 13.1) + 1) / 2) * 255 : v.type === "coarse" ? (((Math.floor(x / 2) * 73856093) ^ (Math.floor(y / 2) * 19349663)) % 255 + 255) % 255 : Math.random() * 255; void W; for (let k = 0; k < 3; k++) d[i + k] = d[i + k] > r ? 255 : 0; }); } },
  mosaic: { id: "mosaic", name: "모자이크", params: [P("cell", "칸 크기", 2, 200, 12, "px")],
    run: (s, v) => { const c = Math.round(num(v, "cell")), W = s.width, H = s.height, t = mk(Math.ceil(W / c), Math.ceil(H / c)), g = g2(t); g.imageSmoothingQuality = "high"; g.drawImage(s, 0, 0, t.width, t.height); const out = mk(W, H), og = g2(out); og.imageSmoothingEnabled = false; og.drawImage(t, 0, 0, t.width * c, t.height * c); return out; } },
  fragment: { id: "fragment", name: "분열", run: (s) => { const out = mk(s.width, s.height), g = g2(out); [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([dx, dy], i) => { g.globalAlpha = 1 / (i + 1); g.drawImage(s, dx, dy); }); return out; } },
  halftone: { id: "halftone", name: "색상 하프톤", params: [P("r", "최대 반경", 4, 40, 8, "px")],
    run: (s, v) => { const r = num(v, "r"), W = s.width, H = s.height, src = dataOf(s).data, out = mk(W, H), g = g2(out); g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "lighter";
      ([[0, "#ff0000", 0.26], [1, "#00ff00", 1.3], [2, "#0000ff", 0.79]] as [number, string, number][]).forEach(([ch, col, a]) => { g.fillStyle = col; const c = Math.cos(a), sn = Math.sin(a), step = r * 2;
        for (let j = -H; j < W + H; j += step) for (let i = -W; i < W + H; i += step) { const x = i * c - j * sn, y = i * sn + j * c; if (x < -r || y < -r || x > W + r || y > H + r) continue; const p = (Math.max(0, Math.min(H - 1, Math.round(y))) * W + Math.max(0, Math.min(W - 1, Math.round(x)))) * 4, val = src[p + ch] / 255; g.beginPath(); g.arc(x, y, r * Math.sqrt(val) * 1.1, 0, Math.PI * 2); g.fill(); } });
      return out; } },
  crystallize: { id: "crystallize", name: "수정화", params: [P("cell", "칸 크기", 3, 300, 18, "px")],
    run: (s, v) => { const c = num(v, "cell"), im = dataOf(s), sd = im.data, W = im.width, H = im.height, gw = Math.ceil(W / c), gh = Math.ceil(H / c), pts = new Float32Array(gw * gh * 2);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { pts[(j * gw + i) * 2] = (i + Math.random()) * c; pts[(j * gw + i) * 2 + 1] = (j + Math.random()) * c; }
      const col = new Float32Array(gw * gh * 4), cnt = new Uint32Array(gw * gh), owner = new Int32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const gi = Math.floor(x / c), gj = Math.floor(y / c); let best = Infinity, bi = 0; for (let j = gj - 1; j <= gj + 1; j++) for (let i = gi - 1; i <= gi + 1; i++) { if (i < 0 || j < 0 || i >= gw || j >= gh) continue; const k = j * gw + i, dd = (pts[k * 2] - x) ** 2 + (pts[k * 2 + 1] - y) ** 2; if (dd < best) { best = dd; bi = k; } } owner[y * W + x] = bi; const p = (y * W + x) * 4; for (let q = 0; q < 4; q++) col[bi * 4 + q] += sd[p + q]; cnt[bi]++; }
      const o = new ImageData(W, H), d = o.data; for (let i = 0; i < W * H; i++) { const k = owner[i], n = cnt[k] || 1; for (let q = 0; q < 4; q++) d[i * 4 + q] = col[k * 4 + q] / n; }
      return fromData(o); } },
  pointillize: { id: "pointillize", name: "점묘화", params: [P("cell", "칸 크기", 3, 100, 10, "px")],
    run: (s, v, cx) => { const c = num(v, "cell"), W = s.width, H = s.height, sd = dataOf(s).data, out = mk(W, H), g = g2(out); g.fillStyle = cx.bg || "#fff"; g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += c * 0.7) for (let x = 0; x < W; x += c * 0.7) { const px = x + Math.random() * c * 0.7, py = y + Math.random() * c * 0.7, p = (Math.min(H - 1, Math.floor(py)) * W + Math.min(W - 1, Math.floor(px))) * 4; g.fillStyle = `rgb(${sd[p]},${sd[p + 1]},${sd[p + 2]})`; g.beginPath(); g.arc(px, py, c * 0.5, 0, Math.PI * 2); g.fill(); }
      return out; } },

  /* 흐림 효과 */
  gaussian: { id: "gaussian", name: "가우시안 흐림 효과", params: [P("r", "반경", 0.1, 250, 4, "px", 0.1)], run: (s, v) => gauss(s, num(v, "r")) },
  smartBlur: { id: "smartBlur", name: "고급 흐림 효과", params: [P("r", "반경", 1, 8, 3), P("th", "한계값", 1, 100, 25)], run: (s, v) => surface(s, num(v, "r"), num(v, "th")) },
  blur: { id: "blur", name: "흐리게", run: (s) => gauss(s, 0.8) },
  blurMore: { id: "blurMore", name: "더 흐리게", run: (s) => gauss(s, 1.8) },
  motion: { id: "motion", name: "동작 흐림 효과", params: [P("angle", "각도", -90, 90, 0, "°"), P("dist", "거리", 1, 400, 20, "px")],
    run: (s, v) => { const a = ang(num(v, "angle")), dist = num(v, "dist"), n = Math.min(64, Math.max(4, Math.round(dist / 2))); return average(s, n, (g, _i, t) => g.translate(Math.cos(a) * dist * t, -Math.sin(a) * dist * t), dist); } },
  lensBlur: { id: "lensBlur", name: "렌즈 흐림 효과", params: [P("r", "반경", 1, 100, 10, "px")], run: (s, v) => gauss(s, num(v, "r") * 0.7) },
  shapeBlur: { id: "shapeBlur", name: "모양 흐림 효과", params: [P("r", "반경", 1, 100, 10, "px")], run: (s, v) => FILTERS.box.run(s, { r: num(v, "r") }, { fg: "", bg: "" }) },
  radial: { id: "radial", name: "방사형 흐림 효과", params: [P("amt", "양", 1, 100, 10), { key: "mode", label: "흐림 효과 방법", options: [["spin", "돌기"], ["zoom", "확대/축소"]], def: "zoom" }],
    run: (s, v) => { const a = num(v, "amt"), W = s.width, H = s.height, n = Math.min(60, 8 + Math.round(a * 0.6)); return average(s, n, (g, _i, t) => { g.translate(W / 2, H / 2); if (v.mode === "spin") g.rotate(ang(a) * t * 0.5); else { const k = 1 + (t + 0.5) * a / 250; g.scale(k, k); } g.translate(-W / 2, -H / 2); }, Math.max(W, H) * 0.3); } },
  box: { id: "box", name: "상자 흐림 효과", params: [P("r", "반경", 1, 200, 6, "px")],
    run: (s, v) => { const r = Math.round(num(v, "r")), im = dataOf(s), W = im.width, H = im.height; let a = im.data;
      const pass = (horiz: boolean) => { const b = new Uint8ClampedArray(a.length), len = horiz ? W : H, lines = horiz ? H : W;
        for (let l = 0; l < lines; l++) { const acc = [0, 0, 0, 0]; const idx = (t: number) => (horiz ? (l * W + Math.max(0, Math.min(W - 1, t))) : (Math.max(0, Math.min(H - 1, t)) * W + l)) * 4;
          for (let t = -r; t <= r; t++) { const p = idx(t); for (let k = 0; k < 4; k++) acc[k] += a[p + k]; }
          for (let t = 0; t < len; t++) { const q = idx(t); for (let k = 0; k < 4; k++) b[q + k] = acc[k] / (2 * r + 1); const po = idx(t - r), pn = idx(t + r + 1); for (let k = 0; k < 4; k++) acc[k] += a[pn + k] - a[po + k]; } }
        a = b; };
      pass(true); pass(false); return fromData(new ImageData(a, W, H)); } },
  average: { id: "average", name: "평균", run: (s) => { const t = mk(1, 1), g = g2(t); g.imageSmoothingQuality = "high"; g.drawImage(s, 0, 0, 1, 1); const [r, gg, b, a] = g.getImageData(0, 0, 1, 1).data; return perPixel(s, (d, i) => { if (!d[i + 3]) return; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = Math.max(d[i + 3], a); }); } },
  surface: { id: "surface", name: "표면 흐림 효과", params: [P("r", "반경", 1, 8, 5, "px"), P("th", "한계값", 2, 255, 15, "레벨")], run: (s, v) => surface(s, num(v, "r"), num(v, "th")) },

  /* 흐림 효과 갤러리 */
  fieldBlur: { id: "fieldBlur", name: "필드 흐림 효과", params: [P("r", "흐림 효과", 1, 100, 15, "px")], run: (s, v) => gauss(s, num(v, "r")) },
  irisBlur: { id: "irisBlur", name: "조리개 흐림 효과", params: [P("r", "흐림 효과", 1, 100, 15, "px"), P("size", "선명한 곳 크기", 10, 90, 40, "%"), P("x", "가운데 가로", 0, 100, 50, "%"), P("y", "가운데 세로", 0, 100, 50, "%")],
    run: (s, v) => { const b = gauss(s, num(v, "r")), W = s.width, H = s.height, cx = (num(v, "x") / 100) * W, cy = (num(v, "y") / 100) * H, rr = num(v, "size") / 100; return blendCanvas(s, b, (x, y) => { const d = Math.hypot((x - cx) / (W / 2), (y - cy) / (H / 2)); return Math.max(0, Math.min(1, (d - rr) / 0.35)); }); } },
  tiltShift: { id: "tiltShift", name: "기울기-이동", params: [P("r", "흐림 효과", 1, 100, 15, "px"), P("y", "선명한 줄 위치", 0, 100, 55, "%"), P("band", "선명한 줄 폭", 2, 80, 20, "%")],
    run: (s, v) => { const b = gauss(s, num(v, "r")), H = s.height, cy = (num(v, "y") / 100) * H, band = (num(v, "band") / 100) * H / 2; return blendCanvas(s, b, (_x, y) => Math.max(0, Math.min(1, (Math.abs(y - cy) - band) / (H * 0.2)))); } },
  pathBlur: { id: "pathBlur", name: "경로 흐림 효과", params: [P("angle", "방향", -90, 90, 0, "°"), P("dist", "속도", 1, 200, 30, "px")], run: (s, v) => FILTERS.motion.run(s, v, { fg: "", bg: "" }) },
  spinBlur: { id: "spinBlur", name: "회전 흐림 효과", params: [P("amt", "흐림 효과 각도", 1, 90, 12, "°")], run: (s, v) => FILTERS.radial.run(s, { amt: num(v, "amt"), mode: "spin" }, { fg: "", bg: "" }) },

  /* 기타 */
  hsb: { id: "hsb", name: "HSB/HSL", params: [{ key: "to", label: "출력", options: [["hsb", "RGB → HSB"], ["hsl", "RGB → HSL"]], def: "hsb" }],
    run: (s, v) => perPixel(s, (d, i) => { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
      let h = 0; if (c) h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4; h = ((h * 60 + 360) % 360) / 360;
      if (v.to === "hsl") { const l = (mx + mn) / 2, sat = c ? c / (1 - Math.abs(2 * l - 1)) : 0; d[i] = h * 255; d[i + 1] = sat * 255; d[i + 2] = l * 255; }
      else { d[i] = h * 255; d[i + 1] = (mx ? c / mx : 0) * 255; d[i + 2] = mx * 255; } }) },
  custom: { id: "custom", name: "사용자 정의", params: [P("k1", "왼쪽 위", -10, 10, 0), P("k2", "위", -10, 10, -1), P("k3", "오른쪽 위", -10, 10, 0), P("k4", "왼쪽", -10, 10, -1), P("k5", "가운데", -10, 20, 5), P("k6", "오른쪽", -10, 10, -1), P("k7", "왼쪽 아래", -10, 10, 0), P("k8", "아래", -10, 10, -1), P("k9", "오른쪽 아래", -10, 10, 0), P("scale", "비율", 1, 50, 1), P("off", "오프셋", -255, 255, 0)],
    run: (s, v) => convolve(s, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => num(v, `k${i}`)), num(v, "scale") || 1, num(v, "off")) },
  offset: { id: "offset", name: "오프셋", params: [P("dx", "가로", -2000, 2000, 50, "px"), P("dy", "세로", -2000, 2000, 50, "px"), { key: "edge", label: "정의되지 않은 영역", options: [["wrap", "둘러싸기"], ["repeat", "가장자리 픽셀 반복"], ["none", "투명하게"]], def: "wrap" }],
    run: (s, v) => { const dx = num(v, "dx"), dy = num(v, "dy"); return remap(s, (x, y, W, H) => { const sx = x - dx, sy = y - dy; if (v.edge === "repeat") return [Math.max(0.5, Math.min(W - 0.5, sx)), Math.max(0.5, Math.min(H - 0.5, sy))]; return [sx, sy]; }, v.edge === "wrap"); } },
  maximum: { id: "maximum", name: "최대값", params: [P("r", "반경", 1, 50, 2, "px")], run: (s, v) => maxMin(s, num(v, "r"), true) },
  minimum: { id: "minimum", name: "최소값", params: [P("r", "반경", 1, 50, 2, "px")], run: (s, v) => maxMin(s, num(v, "r"), false) },
  highPass: { id: "highPass", name: "하이 패스", params: [P("r", "반경", 0.1, 100, 10, "px", 0.1)], run: (s, v) => { const bl = dataOf(gauss(s, num(v, "r"))).data; return perPixel(s, (d, i) => { for (let k = 0; k < 3; k++) d[i + k] = clamp(128 + d[i + k] - bl[i + k]); }); } },

  /* 렌즈 교정 · 응용 광각 (간단히) */
  lensCorrect: { id: "lensCorrect", name: "렌즈 교정", params: [P("dist", "왜곡 제거", -100, 100, 0), P("vig", "비네팅 (어둡게 ↔ 밝게)", -100, 100, 0), P("vmid", "비네팅 중간점", 0, 100, 50)],
    run: (s, v) => { const k = num(v, "dist") / 100 * 0.35; let out = k ? remap(s, (x, y, W, H) => { const cx = W / 2, cy = H / 2, nx = (x - cx) / cx, ny = (y - cy) / cy, r2 = nx * nx + ny * ny, f = 1 + k * r2; return [cx + nx * f * cx, cy + ny * f * cy]; }) : s;
      const vg = num(v, "vig") / 100, mid = num(v, "vmid") / 100;
      if (vg) out = perPixel(out, (d, i, x, y) => { const W = out.width, H = out.height, r = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)) / Math.SQRT2, t = Math.max(0, (r - mid * 0.6) / (1 - mid * 0.6)) ** 2; for (let q = 0; q < 3; q++) d[i + q] = clamp(d[i + q] * (1 + vg * t)); });
      return out; } },
  wideAngle: { id: "wideAngle", name: "응용 광각", params: [P("amt", "보정", -100, 100, 40)], run: (s, v) => FILTERS.lensCorrect.run(s, { dist: -num(v, "amt"), vig: 0, vmid: 50 }, { fg: "", bg: "" }) },
};

/** 필터 메뉴 (포토샵과 같은 갈래 · 순서). null = 아직 없는 것 (흐리게 표시) */
export const FILTER_MENU: { group: string; items: (string | [string, null])[] }[] = [
  { group: "노이즈", items: ["reduceNoise", "addNoise", "dust", "despeckle", "median"] },
  { group: "렌더", items: [["불꽃…", null], ["사진 프레임…", null], ["나무…", null], "clouds", "clouds2", "flare", "fibers"] },
  { group: "비디오", items: ["ntsc", "deinterlace"] },
  { group: "선명 효과", items: ["sharpenEdges", "sharpen", "sharpenMore", "unsharp", "smartSharpen"] },
  { group: "스타일화", items: ["findEdges", "emboss", "traceContour", "wind", "diffuse", "oilPaint", "solarize"] },
  { group: "왜곡", items: ["spherize", "polar", "shear", "twirl", ["변위…", null], "ripple", "zigzag", "wave", "pinch"] },
  { group: "픽셀화", items: ["facet", "mezzotint", "mosaic", "fragment", "halftone", "crystallize", "pointillize"] },
  { group: "흐림 효과", items: ["gaussian", "smartBlur", "blurMore", "motion", "lensBlur", "shapeBlur", "radial", "box", "average", "surface", "blur"] },
  { group: "흐림 효과 갤러리", items: ["fieldBlur", "irisBlur", "tiltShift", "pathBlur", "spinBlur"] },
  { group: "기타", items: ["hsb", "custom", "offset", "maximum", "minimum", "highPass"] },
];
export const filterDefaults = (f: Filter): FVals => Object.fromEntries((f.params || []).map((p) => [p.key, p.def]));
