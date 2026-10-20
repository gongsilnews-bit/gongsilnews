// 고급 화면전환 (2026-10-20 사장님: "기본 · 고급" — Premiere Composer 처럼 휙·줌·회전·빛 번짐·글리치 …)
//  웹 src/components/admin/studio-video/transAdv.ts 와 같은 계산 (advLook) — 둘을 같이 고친다.
//  미리보기는 CSS(transform·SVG 번짐·mask·blend)로, 굽기는 여기 bake 가 칸마다 같은 값으로 그린다 → 보이는 결과가 같다.
//
//  advLook(type, p, ar) → { from, to, top, over }
//   from·to: { x, y (화면 너비·높이 비율로 옮김), s (크기), sx·sy (가로·세로 늘이기), r (도, 시계 방향), o (진하기), bx, by (번짐 — 화면 너비 비율), rgb (색 갈라짐 — 화면 너비 비율), br (밝기 배수), mask }
//   top: 위에 그릴 쪽 ("to" | "from") · over: 맨 위 덮개 배열 (flash 흰 번쩍 · glow 빛 번짐 · rays 빛줄기 · vig 가장자리 어둡게)
"use strict";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, p) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const eIn = (t) => t * t * t;
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eInOut5 = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
const eInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const side = (o = {}) => ({ x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, o: 1, bx: 0, by: 0, rgb: 0, br: 1, mask: null, ...o });
/** 돌려도 빈 곳이 안 보이는 크기 (ar = 너비/높이) */
const cover = (deg, ar) => { const R = Math.max(ar, 1 / ar), a = (Math.abs(deg) * Math.PI) / 180; return Math.abs(Math.cos(a)) + R * Math.abs(Math.sin(a)); };

const ADV = [
  { id: "x_whipl", label: "휙 넘기기 ←", group: "움직임", sfx: "whoosh-short" },
  { id: "x_whipr", label: "휙 넘기기 →", group: "움직임", sfx: "whoosh-short" },
  { id: "x_whipu", label: "휙 넘기기 ↑", group: "움직임", sfx: "whoosh-short" },
  { id: "x_whipd", label: "휙 넘기기 ↓", group: "움직임", sfx: "whoosh-short" },
  { id: "x_zoomin", label: "줌 인", group: "움직임", sfx: "whoosh" },
  { id: "x_zoomout", label: "줌 아웃", group: "움직임", sfx: "whoosh" },
  { id: "x_spin", label: "회전", group: "움직임", sfx: "whoosh" },
  { id: "x_shake", label: "흔들며", group: "움직임" },
  { id: "x_bounce", label: "튕기며 들어오기", group: "움직임", sfx: "pop" },
  { id: "x_stretch", label: "늘이며", group: "움직임", sfx: "whoosh-short" },
  { id: "x_roll", label: "구르며", group: "움직임", sfx: "whoosh" },
  { id: "x_punch", label: "펀치 줌", group: "움직임", sfx: "impact-bass-1" },
  { id: "x_focus", label: "초점 흐림", group: "흐림" },
  { id: "x_dirblur", label: "방향 흐림", group: "흐림", sfx: "whoosh-short" },
  { id: "x_chblur", label: "채널 흐림", group: "흐림" },
  { id: "x_bokeh", label: "보케 흐림", group: "흐림", sfx: "sparkle" },
  { id: "x_leak", label: "빛 번짐", group: "빛·필름" },
  { id: "x_flash", label: "번쩍", group: "빛·필름", sfx: "impact-bass-1" },
  { id: "x_burn", label: "필름 타는", group: "빛·필름" },
  { id: "x_dip", label: "부드럽게 검은 화면", group: "빛·필름" },
  { id: "x_burnwhite", label: "하얗게 타며", group: "빛·필름", sfx: "sparkle" },
  { id: "x_glow", label: "글로우", group: "빛·필름", sfx: "sparkle" },
  { id: "x_rays", label: "빛줄기", group: "빛·필름", sfx: "chime" },
  { id: "x_chroma", label: "컬러 빛 번짐", group: "빛·필름" },
  { id: "x_vig", label: "비네팅 어둡게", group: "빛·필름" },
  { id: "x_glitch", label: "글리치", group: "디지털" },
  { id: "x_rgb", label: "RGB 갈라짐", group: "디지털" },
  { id: "x_flicker", label: "깜빡이며", group: "디지털" },
  { id: "x_circle", label: "원 (부드럽게)", group: "모양" },
  { id: "x_wipe", label: "비스듬히 닦기", group: "모양" },
  { id: "x_blinds", label: "블라인드", group: "모양" },
];
const isAdv = (t) => ADV.some((x) => x.id === t);

function advLook(type, p, ar = 16 / 9) {
  p = clamp(p);
  const env = Math.sin(Math.PI * p); // 가운데에서 가장 세게
  const cf = (a = 0.42, b = 0.58) => smooth(a, b, p); // 가운데서 살짝 섞어 바꾸기
  switch (type) {
    case "x_whipl": case "x_whipr": case "x_whipu": case "x_whipd": {
      const e = eInOut5(p), b = 0.06 * env * env;
      const h = type === "x_whipl" || type === "x_whipr";
      const dir = type === "x_whipl" || type === "x_whipu" ? -1 : 1;
      const mv = (v) => (h ? { x: v } : { y: v });
      const bl = h ? { bx: b } : { by: b };
      return { from: side({ ...mv(dir * e), ...bl }), to: side({ ...mv(dir * (e - 1)), ...bl }), top: "to" };
    }
    case "x_zoomin": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      return { from: side({ s: 1 + eIn(u), bx: 0.025 * eIn(u), by: 0.025 * eIn(u), o: 1 }), to: side({ s: 2 - eOut(v), bx: 0.025 * (1 - eOut(v)), by: 0.025 * (1 - eOut(v)), o: cf() }), top: "to" };
    }
    case "x_zoomout": {
      const b1 = 0.02 * eIn(p), b2 = 0.02 * (1 - eOut(p));
      return { from: side({ s: 1 - 0.6 * eIn(p), o: 1 - smooth(0.5, 0.85, p), bx: b1, by: b1 }), to: side({ s: 1.6 - 0.6 * eOut(p), bx: b2, by: b2 }), top: "from" };
    }
    case "x_spin": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      const r1 = eIn(u) * 28, r2 = -(1 - eOut(v)) * 28;
      const b1 = 0.02 * eIn(u), b2 = 0.02 * (1 - eOut(v));
      return { from: side({ r: r1, s: cover(r1, ar) * (1 + 0.25 * eIn(u)), bx: b1, by: b1 }), to: side({ r: r2, s: cover(r2, ar) * (1 + 0.25 * (1 - eOut(v))), bx: b2, by: b2, o: cf() }), top: "to" };
    }
    case "x_shake": {
      const jx = 0.035 * env * Math.sin(p * Math.PI * 2 * 7), jy = 0.025 * env * Math.sin(p * Math.PI * 2 * 9 + 1);
      const b = 0.006 * env, s = 1.08 + 0.1 * env;
      return { from: side({ x: jx, y: jy, s, bx: b, by: b }), to: side({ x: jx, y: jy, s, bx: b, by: b, o: cf(0.4, 0.6) }), top: "to" };
    }
    case "x_bounce": {
      const b = 0.02 * (1 - smooth(0, 0.7, p));
      return { from: side({ s: 1 + 0.06 * eOut(p) }), to: side({ x: 1 - backOut(p), bx: b }), top: "to" };
    }
    case "x_leak":
      return { from: side({ s: 1 + 0.04 * p }), to: side({ s: 1.04 - 0.04 * p, o: smooth(0.3, 0.7, p) }), top: "to", over: [{ kind: "glow", o: 0.95 * Math.pow(env, 1.5), cx: -0.2 + 1.4 * p, cy: 0.4, r: 0.9, c1: "#FFE3A3", c2: "#FF7A3D" }] };
    case "x_flash":
      return { from: side({ s: 1 + 0.08 * env }), to: side({ s: 1 + 0.08 * env, o: p < 0.5 ? 0 : 1 }), top: "to", over: [{ kind: "flash", o: Math.pow(clamp(1 - Math.abs(p - 0.5) / 0.5), 2) }] };
    case "x_burn":
      return { from: side(), to: side({ o: smooth(0.35, 0.65, p) }), top: "to", over: [{ kind: "glow", o: env, cx: 0.08, cy: 0.92, r: 0.3 + 1.3 * p, c1: "#FFF1C2", c2: "#FF4D00" }] };
    case "x_dip":
      return { from: side({ o: 1 - smooth(0, 0.5, p) }), to: side({ o: smooth(0.5, 1, p) }), top: "to" };
    case "x_glitch": {
      const e2 = clamp(1 - Math.abs(p - 0.5) * 2);
      const jx = 0.025 * e2 * (Math.sin(p * 97) > 0 ? 1 : -1);
      return { from: side({ x: jx, rgb: 0.022 * e2 }), to: side({ x: jx, rgb: 0.022 * e2, o: p < 0.5 ? 0 : 1 }), top: "to" };
    }
    case "x_rgb":
      return { from: side({ s: 1 + 0.06 * env, rgb: 0.025 * env }), to: side({ s: 1 + 0.06 * env, rgb: 0.025 * env, o: smooth(0.35, 0.65, p) }), top: "to" };
    case "x_flicker": {
      const k = Math.floor(p * 12); // 칸 12개 — 가운데 6칸에서 번갈아
      const on = p >= 0.75 || (p >= 0.25 && k % 2 === 1);
      return { from: side({ rgb: 0.01 * env }), to: side({ rgb: 0.01 * env, o: on ? 1 : 0 }), top: "to" };
    }
    case "x_stretch": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      return { from: side({ sx: 1 + 3 * eIn(u), bx: 0.05 * eIn(u), br: 1 + 0.3 * eIn(u) }), to: side({ sx: 4 - 3 * eOut(v), bx: 0.05 * (1 - eOut(v)), br: 1 + 0.3 * (1 - eOut(v)), o: cf() }), top: "to" };
    }
    case "x_roll": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      const r1 = eIn(u) * 90, r2 = -(1 - eOut(v)) * 90, b1 = 0.035 * eIn(u), b2 = 0.035 * (1 - eOut(v));
      return { from: side({ r: r1, s: cover(r1, ar), bx: b1, by: b1 }), to: side({ r: r2, s: cover(r2, ar), bx: b2, by: b2, o: cf(0.45, 0.55) }), top: "to" };
    }
    case "x_punch": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      const jx = 0.02 * env * Math.sin(p * Math.PI * 2 * 9);
      return { from: side({ s: 1 + 0.6 * eIn(u), x: jx, bx: 0.02 * eIn(u), by: 0.02 * eIn(u) }), to: side({ s: 1.6 - 0.6 * eOut(v), x: jx, bx: 0.02 * (1 - eOut(v)), by: 0.02 * (1 - eOut(v)), o: p < 0.5 ? 0 : 1 }), top: "to", over: [{ kind: "flash", o: 0.85 * Math.pow(clamp(1 - Math.abs(p - 0.5) / 0.18), 2) }] };
    }
    case "x_focus": {
      const b1 = 0.03 * smooth(0, 0.55, p), b2 = 0.03 * (1 - smooth(0.45, 1, p));
      return { from: side({ bx: b1, by: b1, s: 1 + 0.03 * p }), to: side({ bx: b2, by: b2, s: 1.03 - 0.03 * p, o: cf(0.35, 0.65) }), top: "to" };
    }
    case "x_dirblur": {
      const b1 = 0.07 * smooth(0, 0.55, p), b2 = 0.07 * (1 - smooth(0.45, 1, p));
      return { from: side({ bx: b1, x: -0.04 * eIn(p) }), to: side({ bx: b2, x: 0.04 * (1 - eOut(p)), o: cf(0.4, 0.6) }), top: "to" };
    }
    case "x_chblur": {
      const k = env;
      return { from: side({ rgb: 0.03 * k, bx: 0.012 * k, by: 0.012 * k, s: 1 + 0.05 * k }), to: side({ rgb: 0.03 * k, bx: 0.012 * k, by: 0.012 * k, s: 1 + 0.05 * k, o: cf(0.4, 0.6) }), top: "to" };
    }
    case "x_bokeh": {
      const b = 0.045 * env, l = 1 + 0.45 * env;
      return { from: side({ bx: b, by: b, br: l }), to: side({ bx: b, by: b, br: l, o: cf(0.35, 0.65) }), top: "to", over: [{ kind: "glow", o: 0.35 * env, cx: 0.5, cy: 0.45, r: 0.8, c1: "#FFF4D6", c2: "#FFB15C" }] };
    }
    case "x_burnwhite": {
      const l = 1 + 3.2 * Math.pow(env, 1.6), b = 0.01 * env;
      return { from: side({ br: l, bx: b, by: b }), to: side({ br: l, bx: b, by: b, o: cf(0.45, 0.55) }), top: "to" };
    }
    case "x_glow": {
      const l = 1 + 1.3 * env, b = 0.02 * env;
      return { from: side({ br: l, bx: b, by: b }), to: side({ br: l, bx: b, by: b, o: cf(0.4, 0.6) }), top: "to", over: [{ kind: "glow", o: 0.55 * env, cx: 0.5, cy: 0.5, r: 1.0, c1: "#FFFFFF", c2: "#FFE7B0" }] };
    }
    case "x_rays":
      return { from: side({ s: 1 + 0.04 * p, br: 1 + 0.25 * env }), to: side({ s: 1.04 - 0.04 * p, br: 1 + 0.25 * env, o: smooth(0.35, 0.65, p) }), top: "to",
        over: [{ kind: "rays", o: env, cx: 0.5, cy: -0.1, rot: -30 + 60 * p, n: 16, r: 1.4, c: "#FFF2C8" }, { kind: "glow", o: 0.6 * env, cx: 0.5, cy: 0, r: 0.7, c1: "#FFFFFF", c2: "#FFD27A" }] };
    case "x_chroma":
      return { from: side(), to: side({ o: smooth(0.3, 0.7, p) }), top: "to",
        over: [{ kind: "glow", o: 0.9 * env, cx: -0.15 + 1.2 * p, cy: 0.3, r: 0.75, c1: "#FFB3F0", c2: "#E0219B" }, { kind: "glow", o: 0.9 * env, cx: 1.15 - 1.2 * p, cy: 0.72, r: 0.75, c1: "#B5F5FF", c2: "#1FA2E0" }] };
    case "x_vig":
      return { from: side(), to: side({ o: cf(0.4, 0.6) }), top: "to", over: [{ kind: "vig", o: Math.min(1, 1.3 * env) }] };
    case "x_circle":
      return { from: side({ s: 1 + 0.05 * p }), to: side({ mask: { kind: "circle", r: eInOut(p) * 1.15, f: 0.15 } }), top: "to" };
    case "x_wipe":
      return { from: side(), to: side({ mask: { kind: "wipe", ang: 120, pos: eInOut(p), f: 0.18 } }), top: "to" };
    case "x_blinds":
      return { from: side(), to: side({ mask: { kind: "blinds", n: 8, pos: eInOut(p), f: 0.12 } }), top: "to" };
    default:
      return { from: side(), to: side({ o: p }), top: "to" };
  }
}

/* ── 굽기 — 칸 하나 그리기 (RGB 8비트 두 장 → 한 장) ── */
function hexRgb(h) { const n = parseInt(String(h).replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255); }
/** 상자 번짐 3번 = 가우스 번짐 (CSS blur 와 같은 sigma) — 미리 곱한(premultiplied) RGBA 한 방향 */
function boxSizes(sigma) {
  const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
  const wu = wl + 2, mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4), m = Math.round(mIdeal);
  return [0, 1, 2].map((i) => ((i < m ? wl : wu) - 1) / 2);
}
function blurDir(src, tmp, W, H, rad, horiz, ch) {
  if (rad < 1) return;
  const len = horiz ? W : H, lines = horiz ? H : W, stride = horiz ? ch : W * ch, step = horiz ? W * ch : ch;
  const k = 1 / (2 * rad + 1), last = len - 1;
  for (let l = 0; l < lines; l++) {
    const base = l * step;
    for (let c = 0; c < ch; c++) {
      const b0 = base + c;
      let acc = src[b0] * (rad + 1);
      for (let i = 1; i <= rad; i++) acc += src[b0 + Math.min(last, i) * stride];
      for (let i = 0; i < len; i++) {
        tmp[b0 + i * stride] = acc * k;
        const ia = i + rad + 1, ir = i - rad;
        acc += src[b0 + (ia > last ? last : ia) * stride] - src[b0 + (ir < 0 ? 0 : ir) * stride];
      }
    }
  }
  src.set(tmp);
}
/** 번짐 — 제자리(옮기기·키우기 전)에서, 가장자리는 끝 색을 늘려서 (미리보기 SVG feGaussianBlur edgeMode=duplicate 와 같다) */
function blurSrc(F, tmp, W, H, sx, sy) {
  if (sx >= 0.5) for (const r of boxSizes(sx)) blurDir(F, tmp, W, H, Math.round(r), true, 3);
  if (sy >= 0.5) for (const r of boxSizes(sy)) blurDir(F, tmp, W, H, Math.round(r), false, 3);
}
/** 한 쪽 화면(F: 0~1 RGB)을 옮기고·키우고·돌려 RGBA 로 — 화면 밖은 투명 */
function placeLayer(F, L, W, H, sd) {
  const cx = W / 2, cy = H / 2, tx = sd.x * W, ty = sd.y * H;
  const a = (-sd.r * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), isx = 1 / (sd.s * sd.sx), isy = 1 / (sd.s * sd.sy), is = isx;
  const dR = sd.rgb * W;
  const samp = (u, v, ch) => {
    if (u < -0.5 || v < -0.5 || u > W - 0.5 || v > H - 0.5) return -1;
    const x0 = Math.max(0, Math.min(W - 1, Math.floor(u))), y0 = Math.max(0, Math.min(H - 1, Math.floor(v)));
    const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
    const fx = Math.max(0, Math.min(1, u - x0)), fy = Math.max(0, Math.min(1, v - y0));
    const i00 = (y0 * W + x0) * 3 + ch, i10 = (y0 * W + x1) * 3 + ch, i01 = (y1 * W + x0) * 3 + ch, i11 = (y1 * W + x1) * 3 + ch;
    return (F[i00] * (1 - fx) + F[i10] * fx) * (1 - fy) + (F[i01] * (1 - fx) + F[i11] * fx) * fy;
  };
  for (let Y = 0; Y < H; Y++) {
    for (let X = 0; X < W; X++) {
      const dx = X + 0.5 - cx - tx, dy = Y + 0.5 - cy - ty;
      const u = (dx * ca - dy * sa) * isx + cx - 0.5, v = (dx * sa + dy * ca) * isy + cy - 0.5;
      const o = (Y * W + X) * 4;
      if (dR) {
        const r = samp(u - dR * is, v, 0), g = samp(u, v, 1), b = samp(u + dR * is, v, 2);
        const ar = r < 0 ? 0 : 1, ag = g < 0 ? 0 : 1, ab = b < 0 ? 0 : 1;
        L[o] = r < 0 ? 0 : r; L[o + 1] = g < 0 ? 0 : g; L[o + 2] = b < 0 ? 0 : b; L[o + 3] = Math.min(1, ar + ag + ab);
      } else {
        const r = samp(u, v, 0);
        if (r < 0) { L[o] = L[o + 1] = L[o + 2] = L[o + 3] = 0; continue; }
        L[o] = r; L[o + 1] = samp(u, v, 1); L[o + 2] = samp(u, v, 2); L[o + 3] = 1;
      }
    }
  }
}
/** 가리개 (0~1) — 미리보기 CSS mask-image 와 같은 모양 */
function maskAt(m, X, Y, W, H) {
  if (m.kind === "circle") {
    const hd = Math.hypot(W, H) / 2, d = Math.hypot(X + 0.5 - W / 2, Y + 0.5 - H / 2) / hd;
    const r1 = m.r - m.f, r2 = m.r;
    return d <= r1 ? 1 : d >= r2 ? 0 : 1 - (d - r1) / Math.max(1e-6, r2 - r1);
  }
  if (m.kind === "wipe") {
    // CSS linear-gradient(ang) — 방향 (sin, -cos), 길이 |W sin| + |H cos|
    const a = (m.ang * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
    const len = Math.abs(W * dx) + Math.abs(H * dy);
    const t = ((X + 0.5 - W / 2) * dx + (Y + 0.5 - H / 2) * dy) / len + 0.5; // 0~1
    const e = m.pos * (1 + m.f); // 끝까지 다 덮이게
    return t <= e - m.f ? 1 : t >= e ? 0 : 1 - (t - (e - m.f)) / m.f;
  }
  if (m.kind === "blinds") {
    const st = H / m.n, t = ((Y + 0.5) % st) / st, e = m.pos * (1 + m.f);
    return t <= e - m.f ? 1 : t >= e ? 0 : 1 - (t - (e - m.f)) / m.f;
  }
  return 1;
}
/** 칸 하나: A(앞)·B(뒤) RGB 버퍼 → out RGB 버퍼 */
function bakeFrame(A, B, out, W, H, look, work) {
  const N = W * H;
  if (!work.acc) { work.acc = new Float32Array(N * 3); work.L = new Float32Array(N * 4); work.F = new Float32Array(N * 3); work.T = new Float32Array(N * 3); }
  const acc = work.acc, L = work.L, F = work.F, T = work.T;
  acc.fill(0); // 바탕은 검정 (미리보기 상자 바탕)
  const order = look.top === "from" ? [["to", B], ["from", A]] : [["from", A], ["to", B]];
  for (const [k, src] of order) {
    const sd = look[k];
    if (!(sd.o > 0.001)) continue;
    for (let j = 0; j < N * 3; j++) F[j] = src[j] / 255;
    // 미리보기와 같이 번짐은 제자리에서 걸고 키운다 — 화면에서 sigma = (화면 너비 비율)이 되게 크기로 나눈다
    blurSrc(F, T, W, H, (sd.bx * W) / (sd.s * sd.sx), (sd.by * W) / (sd.s * sd.sy));
    if (sd.br !== 1) for (let j = 0; j < N * 3; j++) F[j] = Math.min(1, F[j] * sd.br); // CSS brightness (1 에서 자른다)
    placeLayer(F, L, W, H, sd);
    for (let i = 0, o = 0; i < N; i++, o += 4) {
      let a = L[o + 3] * sd.o;
      if (a <= 0) continue;
      let m = 1;
      if (sd.mask) { m = maskAt(sd.mask, i % W, (i / W) | 0, W, H); if (m <= 0) continue; a *= m; }
      const f = sd.o * m, j = i * 3;
      acc[j] = L[o] * f + acc[j] * (1 - a);
      acc[j + 1] = L[o + 1] * f + acc[j + 1] * (1 - a);
      acc[j + 2] = L[o + 2] * f + acc[j + 2] * (1 - a);
    }
  }
  for (const ov of look.over || []) {
    if (!(ov.o > 0.001)) continue;
    if (ov.kind === "flash") {
      for (let j = 0; j < N * 3; j++) acc[j] = acc[j] * (1 - ov.o) + ov.o;
    } else if (ov.kind === "glow") {
      // radial-gradient(circle R at cx cy, c1 0, c2 45%, 투명 100%) · mix-blend-mode: screen · opacity o
      const c1 = hexRgb(ov.c1), c2 = hexRgb(ov.c2), R = ov.r * W, px = ov.cx * W, py = ov.cy * H;
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
        const d = Math.hypot(X + 0.5 - px, Y + 0.5 - py) / R;
        if (d >= 1) continue;
        let c, al;
        if (d <= 0.45) { const t = d / 0.45; c = [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]; al = 1; } else { c = c2; al = 1 - (d - 0.45) / 0.55; }
        al *= ov.o;
        const j = (Y * W + X) * 3;
        for (let q = 0; q < 3; q++) { const b = acc[j + q], s2 = 1 - (1 - b) * (1 - c[q]); acc[j + q] = b + (s2 - b) * al; }
      }
    } else if (ov.kind === "rays") {
      // repeating-conic-gradient(from rot at cx cy, 투명 0, c 25%, 투명 50%, 투명 100% (한 칸 = 360/n)) · mask radial(circle R) · screen
      const c = hexRgb(ov.c), R = ov.r * W, px = ov.cx * W, py = ov.cy * H, P = 360 / ov.n;
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
        const dx = X + 0.5 - px, dy = Y + 0.5 - py, d = Math.hypot(dx, dy) / R;
        if (d >= 1) continue;
        let th = (Math.atan2(dx, -dy) * 180) / Math.PI - ov.rot;
        th = ((th % P) + P) % P / P;
        const al = (th < 0.25 ? th / 0.25 : th < 0.5 ? 1 - (th - 0.25) / 0.25 : 0) * 0.8 * (1 - d) * ov.o;
        if (al <= 0) continue;
        const j = (Y * W + X) * 3;
        for (let q = 0; q < 3; q++) { const b = acc[j + q], s2 = 1 - (1 - b) * (1 - c[q]); acc[j + q] = b + (s2 - b) * al; }
      }
    } else if (ov.kind === "vig") {
      // radial-gradient(circle 반대각선 at 가운데, 투명 30%, 검정 100%) · opacity o
      const R = Math.hypot(W, H) / 2;
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
        const d = Math.hypot(X + 0.5 - W / 2, Y + 0.5 - H / 2) / R;
        const al = clamp((d - 0.3) / 0.7) * ov.o;
        if (al <= 0) continue;
        const j = (Y * W + X) * 3;
        acc[j] *= 1 - al; acc[j + 1] *= 1 - al; acc[j + 2] *= 1 - al;
      }
    }
  }
  for (let j = 0; j < N * 3; j++) out[j] = Math.max(0, Math.min(255, Math.round(acc[j] * 255)));
}

module.exports = { ADV, isAdv, advLook, bakeFrame };
