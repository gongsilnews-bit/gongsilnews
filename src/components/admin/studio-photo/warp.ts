// 이미지 편집 — 텍스트 뒤틀기 (포토샵 문자 › 텍스트 뒤틀기와 같은 15가지)
// 반듯하게 그린 글자 그림을 잘게 나눈 그물(삼각형)로 옮겨 그린다. 값은 포토샵처럼 -100 ~ 100 (%)

export type WarpId = "none" | "arc" | "arcLower" | "arcUpper" | "arch" | "bulge" | "shellLower" | "shellUpper" | "flag" | "wave" | "fish" | "rise" | "fisheye" | "inflate" | "squeeze" | "twist";
export type TextWarp = { style: WarpId | string; vertical?: boolean; bend?: number; h?: number; v?: number };

/** 메뉴 — 포토샵과 같은 순서 · 묶음 (그림은 24×24 선) */
export const WARP_GROUPS: { id: WarpId; name: string; icon: string }[][] = [
  [{ id: "none", name: "없음", icon: "" }],
  [
    { id: "arc", name: "부채꼴", icon: "M4 10Q12 2 20 10L17 19Q12 15 7 19Z" },
    { id: "arcLower", name: "아래 부채꼴", icon: "M5 5H19V13Q12 23 5 13Z" },
    { id: "arcUpper", name: "위 부채꼴", icon: "M5 11Q12 1 19 11V19H5Z" },
  ],
  [
    { id: "arch", name: "아치", icon: "M4 11Q12 3 20 11V17Q12 9 4 17Z" },
    { id: "bulge", name: "돌출", icon: "M4 8Q12 2 20 8V16Q12 22 4 16Z" },
    { id: "shellLower", name: "아래가 넓은 조개", icon: "M7 5H17L20 15Q12 22 4 15Z" },
    { id: "shellUpper", name: "위가 넓은 조개", icon: "M4 9Q12 2 20 9L17 19H7Z" },
  ],
  [
    { id: "flag", name: "깃발", icon: "M4 7Q8 3 12 7T20 7V17Q16 21 12 17T4 17Z" },
    { id: "wave", name: "파형", icon: "M4 8Q8 4 12 8T20 8V16Q16 20 12 16T4 18Z" },
    { id: "fish", name: "물고기", icon: "M3 9Q9 3 16 10L21 7V17L16 14Q9 21 3 15Z" },
    { id: "rise", name: "상승", icon: "M4 13Q12 13 20 4V12Q12 21 4 21Z" },
  ],
  [
    { id: "fisheye", name: "어안", icon: "M4 5H20V19H4ZM8 12A4 4 0 1016 12A4 4 0 108 12" },
    { id: "inflate", name: "부풀리기", icon: "M3 12Q3 4 12 4T21 12T12 20T3 12Z" },
    { id: "squeeze", name: "양쪽 누르기", icon: "M4 4Q12 9 20 4V20Q12 15 4 20Z" },
    { id: "twist", name: "비틀기", icon: "M5 5Q12 8 19 5Q16 12 19 19Q12 16 5 19Q8 12 5 5Z" },
  ],
];
export const WARP_NAME: Record<string, string> = Object.fromEntries(WARP_GROUPS.flat().map((w) => [w.id, w.name]));

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** 한 점 옮기기 — u·v 는 -1 ~ 1 (u = 글 방향, v = 글 높이 방향, -1 = 위), 결과는 가운데 기준 픽셀 */
function mapPt(style: string, u: number, v: number, W: number, H: number, b: number): [number, number] {
  const hw = W / 2, hh = H / 2;
  let x = u * hw, y = v * hh;
  switch (style) {
    case "arc": {
      if (Math.abs(b) < 0.002) break;
      const A = b * Math.PI; // 100% = 반원
      const R = W / A;
      const r = R - v * hh;
      const t = (u * A) / 2;
      x = r * Math.sin(t);
      y = R - r * Math.cos(t);
      break;
    }
    case "arcLower": y = v * hh + b * hh * ((v + 1) / 2) * (1 - u * u); break;
    case "arcUpper": y = v * hh - b * hh * ((1 - v) / 2) * (1 - u * u); break;
    case "arch": y = v * hh - b * hh * (1 - u * u) * (0.75 + 0.25 * (1 - v) / 2); break;
    case "bulge": y = v * hh * (1 + b * (1 - u * u)); break;
    case "shellLower": y = v * hh + b * hh * ((v + 1) / 2) * (u * u - 0.35); x = u * hw * (1 + b * 0.12 * ((v + 1) / 2)); break;
    case "shellUpper": y = v * hh - b * hh * ((1 - v) / 2) * (u * u - 0.35); x = u * hw * (1 + b * 0.12 * ((1 - v) / 2)); break;
    case "flag": y = v * hh + b * hh * Math.sin(u * Math.PI); break;
    case "wave": y = v * hh + b * hh * Math.sin(u * Math.PI + (v + 1) * 0.55); break;
    case "fish": y = v * hh * (1 + b * 0.8 * Math.sin((u + 1) * Math.PI * 0.8)); break;
    case "rise": y = v * hh - b * hh * Math.sin((u * Math.PI) / 2) * (1 + 0.3 * (1 - v * v)); break;
    case "fisheye": { const s = 1 + b * 0.7 * Math.max(0, 1 - (u * u + v * v) / 1.6); x = u * hw * s; y = v * hh * s; break; }
    case "inflate": x = u * hw * (1 + b * 0.22 * (1 - v * v)); y = v * hh * (1 + b * 0.8 * (1 - u * u)); break;
    case "squeeze": y = v * hh * (1 - b * 0.6 * (1 - u * u)); x = u * hw * (1 + b * 0.12 * (1 - v * v)); break;
    case "twist": {
      const nr = Math.min(1, Math.hypot(u, v) / Math.SQRT2);
      const t = b * (Math.PI / 5) * (1 - nr);
      const px = x, py = y * 2.2; // 글이 납작하면 돌림이 티가 안 나서 높이를 키워 돌리고 되돌림
      x = px * Math.cos(t) - py * Math.sin(t);
      y = (px * Math.sin(t) + py * Math.cos(t)) / 2.2;
      break;
    }
  }
  return [x, y];
}

/** 뒤틀린 글자 그림 — 같은 그림이면 원래 그림 그대로 */
export function warpCanvas(src: HTMLCanvasElement, w: TextWarp): HTMLCanvasElement {
  const b = clamp((w.bend ?? 50) / 100, -1, 1), ph = clamp((w.h ?? 0) / 100, -1, 1), pv = clamp((w.v ?? 0) / 100, -1, 1);
  if (!w.style || w.style === "none" || (!b && !ph && !pv)) return src;
  const W = src.width, H = src.height;
  const vert = Boolean(w.vertical);
  const map = (u: number, v: number): [number, number] => {
    // 세로 = 글 방향을 바꿔 계산하고 되돌림
    let [x, y] = vert ? (([a, c]) => [c, a] as [number, number])(mapPt(w.style, v, u, H, W, b)) : mapPt(w.style, u, v, W, H, b);
    // 가로 왜곡 = 오른쪽이 커짐 · 세로 왜곡 = 아래가 넓어짐 (포토샵처럼)
    if (ph) { const k = 1 + ph * 0.6 * u; y *= k; x *= 1 + ph * 0.15 * u * u * Math.sign(u); }
    if (pv) { const k = 1 + pv * 0.6 * v; x *= k; y *= 1 + pv * 0.15 * v * v * Math.sign(v); }
    return [x, y];
  };
  const nx = clamp(Math.ceil(W / 14), 8, 90), ny = clamp(Math.ceil(H / 14), 4, 30);
  const P: [number, number][][] = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let j = 0; j <= ny; j++) {
    const row: [number, number][] = [];
    for (let i = 0; i <= nx; i++) {
      const p = map((2 * i) / nx - 1, (2 * j) / ny - 1);
      row.push(p);
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    }
    P.push(row);
  }
  const m = 2;
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.min(16000, Math.ceil(x1 - x0) + m * 2));
  out.height = Math.max(1, Math.min(16000, Math.ceil(y1 - y0) + m * 2));
  const g = out.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  const ox = m - x0, oy = m - y0;
  const tri = (s: number[][], d: number[][]) => {
    const [[sx0, sy0], [sx1, sy1], [sx2, sy2]] = s;
    const [[u0, v0], [u1, v1], [u2, v2]] = d;
    const det = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
    if (!det) return;
    const a = (u0 * (sy1 - sy2) + u1 * (sy2 - sy0) + u2 * (sy0 - sy1)) / det;
    const c = (u0 * (sx2 - sx1) + u1 * (sx0 - sx2) + u2 * (sx1 - sx0)) / det;
    const e = (u0 * (sx1 * sy2 - sx2 * sy1) + u1 * (sx2 * sy0 - sx0 * sy2) + u2 * (sx0 * sy1 - sx1 * sy0)) / det;
    const bb = (v0 * (sy1 - sy2) + v1 * (sy2 - sy0) + v2 * (sy0 - sy1)) / det;
    const dd = (v0 * (sx2 - sx1) + v1 * (sx0 - sx2) + v2 * (sx1 - sx0)) / det;
    const f = (v0 * (sx1 * sy2 - sx2 * sy1) + v1 * (sx2 * sy0 - sx0 * sy2) + v2 * (sx0 * sy1 - sx1 * sy0)) / det;
    // 이음매가 안 보이게 삼각형을 가운데서 조금 키워 자른다
    const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3;
    const grow = (x: number, y: number) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / l) * 0.7, y + ((y - cy) / l) * 0.7]; };
    g.save();
    g.beginPath();
    for (const [k, [x, y]] of d.entries()) { const [gx, gy] = grow(x, y); if (k) g.lineTo(gx, gy); else g.moveTo(gx, gy); }
    g.closePath();
    g.clip();
    g.setTransform(a, bb, c, dd, e, f);
    const lx = Math.max(0, Math.floor(Math.min(sx0, sx1, sx2)) - 1), ly = Math.max(0, Math.floor(Math.min(sy0, sy1, sy2)) - 1);
    const rx = Math.min(W, Math.ceil(Math.max(sx0, sx1, sx2)) + 1), ry = Math.min(H, Math.ceil(Math.max(sy0, sy1, sy2)) + 1);
    if (rx > lx && ry > ly) g.drawImage(src, lx, ly, rx - lx, ry - ly, lx, ly, rx - lx, ry - ly);
    g.restore();
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const s00 = [(i / nx) * W, (j / ny) * H], s10 = [((i + 1) / nx) * W, (j / ny) * H], s01 = [(i / nx) * W, ((j + 1) / ny) * H], s11 = [((i + 1) / nx) * W, ((j + 1) / ny) * H];
      const d = (p: [number, number]) => [p[0] + ox, p[1] + oy];
      const d00 = d(P[j][i]), d10 = d(P[j][i + 1]), d01 = d(P[j + 1][i]), d11 = d(P[j + 1][i + 1]);
      tri([s00, s10, s11], [d00, d10, d11]);
      tri([s00, s11, s01], [d00, d11, d01]);
    }
  }
  return out;
}
