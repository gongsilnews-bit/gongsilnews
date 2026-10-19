// 이미지 편집 (포토랩) — PSD 를 바탕으로 한 문서·그리기·저장 (회의: docs/2026-10-19_photolab_meeting.md)
//  - 열기/저장은 ag-psd 로 이 화면 안에서 (PC 안에서만, 빠르게). 앱은 파일을 읽고 쓰기만 한다 (studio-app/src/photo/ipc.js)
//  - 문서 = ag-psd 의 Psd 그대로 (포토샵 레이어·마스크·조정 레이어·스마트 오브젝트를 건드리지 않고 그대로 다시 저장)
//  - 그리기 = 레이어마다 그림(효과 포함)을 기억해 두고 자리만 바꿔 붙인다 (옮길 때 다시 그리지 않음)
//  - 우리만의 정보(글자 칸 모양 등)는 PSD 안 메모(XMP)에 함께 넣는다 → 포토샵은 무시, 포토랩은 다시 고칠 수 있다
import { readPsd, writePsdUint8Array, type Layer, type Psd } from "ag-psd";
import type { TextLook } from "@/components/admin/studio-video/SubPresets";
import { effLeading, effSpacing } from "@/components/admin/studio-video/timeline";
import { STUDIO_FONTS } from "@/lib/studio-video/fonts";

/* ── 레이어에 붙이는 우리 정보 (PSD 에는 안 들어가고, 저장할 때 XMP 메모로) ── */
export type PLayer = Layer & {
  _k?: string; // 화면에서 쓰는 열쇠
  _look?: TextLook & { text: string; px: number }; // 글자 칸 모양 (우리가 만든·고친 글자)
  _src?: HTMLCanvasElement; // 크기를 바꾼 사진의 원본 (여러 번 줄였다 늘려도 흐려지지 않게)
  _shape?: { w: number; h: number; color: string; radius: number }; // 도형
  _box?: boolean; // 저장할 때 만든 "글자 상자" 레이어 (다시 열면 지운다)
};
export type Doc = {
  id: string;
  name: string;
  path?: string; // 이 PC 의 파일 (새 문서면 없음)
  fromFile?: boolean; // 밖에서 연 PSD — 처음 저장은 다른 이름으로 (원본 보호)
  psd: Psd;
  dirty: boolean;
  /** 색 모드 — rgb(화면용) · cmyk(인쇄용: 인쇄 색 미리보기 · CMYK 인쇄 파일). PSD 는 RGB 로 저장하고 모드는 메모에 */
  mode?: "rgb" | "cmyk";
  pristine: boolean; // 연 뒤 아무것도 안 고침 → 포토샵이 저장한 합성 그림을 그대로 보여 준다 (가장 정확)
};

let seq = 0;
export const uid = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export function mk(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
const ctx2 = (c: HTMLCanvasElement) => c.getContext("2d")!;

/* ── 나무 다루기 ── children[0] 이 맨 아래 (PSD 차례) */
export const kids = (l: { children?: Layer[] }) => (l.children || []) as PLayer[];
export function walk(list: PLayer[], fn: (l: PLayer, depth: number, parent: PLayer | null) => void, depth = 0, parent: PLayer | null = null) {
  for (const l of list) {
    fn(l, depth, parent);
    if (l.children) walk(kids(l), fn, depth + 1, l);
  }
}
export function findLayer(list: PLayer[], k: string): PLayer | null {
  let hit: PLayer | null = null;
  walk(list, (l) => { if (!hit && l._k === k) hit = l; });
  return hit;
}
/** 그림(canvas)·바이트는 같이 쓰고 나머지는 새로 — 되돌리기 기록용 (그림을 제자리에서 바꾸지 않으므로 같이 써도 된다) */
export function cloneTree<T>(v: T): T {
  if (Array.isArray(v)) return v.map((x) => cloneTree(x)) as unknown as T;
  if (v && typeof v === "object") {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return v; // canvas · Uint8Array 등
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = cloneTree(x);
    return o as T;
  }
  return v;
}
/** 레이어(와 그 아래)를 dx·dy 만큼 옮기기 — 마스크·글자 기준점까지 */
export function offsetLayer(l: PLayer, dx: number, dy: number) {
  if (l.children) for (const c of kids(l)) offsetLayer(c, dx, dy);
  if (typeof l.left === "number") l.left += dx;
  if (typeof l.right === "number") l.right += dx;
  if (typeof l.top === "number") l.top += dy;
  if (typeof l.bottom === "number") l.bottom += dy;
  if (l.mask && typeof l.mask.left === "number") {
    l.mask.left! += dx; l.mask.right! += dx; l.mask.top! += dy; l.mask.bottom! += dy;
  }
  if (l.text?.transform) {
    const t = [...l.text.transform];
    t[4] += dx;
    t[5] += dy;
    l.text.transform = t;
  }
}
/** 레이어가 차지하는 자리 (그룹이면 아래 것들을 합친 자리) */
export function boundsOf(l: PLayer): { x: number; y: number; w: number; h: number } | null {
  if (l.children) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of kids(l)) {
      const b = boundsOf(c);
      if (!b) continue;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    return x1 > x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  }
  if (!l.canvas) return null;
  return { x: l.left || 0, y: l.top || 0, w: l.canvas.width, h: l.canvas.height };
}

/* ── 글꼴 — 우리 글꼴 ↔ 포토샵 글꼴 이름 (PostScript) ── */
const PS_NAMES: Record<string, string> = {
  Pretendard: "Pretendard-Bold", NanumGothic: "NanumGothic", GmarketSans: "GmarketSansBold", "Do Hyeon": "DoHyeon-Regular", Jua: "Jua-Regular",
  "Yeon Sung": "YeonSung-Regular", "Malgun Gothic": "MalgunGothicBold", NanumMyeongjo: "NanumMyeongjo", "Black Han Sans": "BlackHanSans-Regular",
  "Gowun Dodum": "GowunDodum-Regular", "Nanum Pen": "NanumPen", "Song Myung": "SongMyung-Regular",
};
export const psFontName = (family?: string) => PS_NAMES[family || ""] || (family || "MalgunGothic").replace(/\s+/g, "");
export function familyOfPs(ps?: string) {
  if (!ps) return "Pretendard";
  const hit = Object.entries(PS_NAMES).find(([, v]) => v.toLowerCase() === ps.toLowerCase());
  if (hit) return hit[0];
  const loose = STUDIO_FONTS.find((f) => ps.toLowerCase().replace(/[-\s]/g, "").startsWith(f.family.toLowerCase().replace(/\s/g, "")));
  return loose ? loose.family : ps.replace(/-.*$/, "");
}

/* ── 색 ── */
const hexToRgb = (hex: string) => {
  const n = parseInt(String(hex || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const rgbToHex = (c?: { r?: number; g?: number; b?: number } | unknown) => {
  const o = (c || {}) as { r?: number; g?: number; b?: number };
  return "#" + [o.r ?? 0, o.g ?? 0, o.b ?? 0].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
};

/* ── 글자 그리기 (우리 글자 레이어) — 채움(과 상자)만. 테두리·그림자·빛은 레이어 효과로 (포토샵과 같은 방식) ── */
export function renderText(look: TextLook & { text: string; px: number }) {
  const px = Math.max(4, look.px);
  const fam = look.font || "Pretendard";
  const weight = look.bold === false ? 400 : 700;
  const font = `${look.italic ? "italic " : ""}${weight} ${px}px '${fam}', 'Malgun Gothic', sans-serif`;
  const caseOf = (t: string) => (look.textCase === "upper" ? t.toUpperCase() : look.textCase === "lower" ? t.toLowerCase() : look.textCase === "title" ? t.replace(/(^|\s)([a-z])/g, (m, a, b) => a + b.toUpperCase()) : t);
  const lines = caseOf(look.text || " ").split(/\r?\n/);
  const sp = effSpacing(look) * px;
  const lh = effLeading(look) * px;
  const meas = mk(4, 4).getContext("2d")!;
  meas.font = font;
  (meas as unknown as { letterSpacing: string }).letterSpacing = `${sp}px`;
  const widths = lines.map((t) => meas.measureText(t || " ").width);
  const tw = Math.max(1, ...widths);
  const pad = look.bg ? px * 0.3 * (look.bgPad ?? 1) : 0;
  const w = Math.ceil(tw + pad * 2 + 2), h = Math.ceil(lh * lines.length + pad * 2 * 0.6 + px * 0.15);
  const c = mk(w, h);
  const g = ctx2(c);
  if (look.bg) {
    g.fillStyle = look.bgColor || "#000000";
    g.globalAlpha = Math.max(0, Math.min(1, look.bgOpacity ?? 0.62));
    g.beginPath();
    g.roundRect(0, 0, w, h, Math.min(12, px * 0.12));
    g.fill();
    g.globalAlpha = 1;
  }
  g.font = font;
  (g as unknown as { letterSpacing: string }).letterSpacing = `${sp}px`;
  g.textBaseline = "alphabetic";
  g.fillStyle = look.color || "#111111";
  const align = look.align || "left";
  lines.forEach((t, i) => {
    const x = align === "center" ? (w - widths[i]) / 2 : align === "right" ? w - pad - widths[i] - 1 : pad + 1;
    const y = pad * 0.6 + i * lh + (lh - px) / 2 + px * 0.86;
    g.fillText(t, x, y);
    if (look.underline) g.fillRect(x, y + px * 0.08, widths[i], Math.max(1, px * 0.06));
  });
  return { canvas: c, ascent: pad * 0.6 + (lh - px) / 2 + px * 0.86 };
}

/** 글자 칸 모양 → 포토샵 레이어 효과 (획·드롭 섀도·외부 광선) */
export function effectsFromLook(look: TextLook, px: number): Layer["effects"] | undefined {
  const fx: NonNullable<Layer["effects"]> = {};
  const contour = { name: "Linear", curve: [{ x: 0, y: 0 }, { x: 255, y: 255 }] };
  const ow = Number(look.outlineWidth ?? 0);
  if (!look.bg && ow > 0) {
    fx.stroke = [{ enabled: true, present: true, showInDialog: true, position: "outside", fillType: "color", blendMode: "normal", opacity: 1 - (look.outlineAlpha ?? 0), size: { units: "Pixels", value: Math.max(1, Math.round((ow * px) / 50)) }, color: hexToRgb(look.outline || "#000000") }];
  }
  if (!look.bg && Number(look.shadow) > 0) {
    const d = Math.round(Number(look.shadow) * px * 1.41);
    fx.dropShadow = [{ enabled: true, present: true, showInDialog: true, blendMode: "multiply", color: hexToRgb(look.shadowColor || "#000000"), opacity: 1 - (look.shadowAlpha ?? 0), angle: 135, useGlobalLight: false, distance: { units: "Pixels", value: d }, choke: { units: "Pixels", value: 0 }, size: { units: "Pixels", value: 0 }, antialiased: false, layerConceals: true, contour }];
  }
  if (!look.bg && look.glow) {
    fx.outerGlow = { enabled: true, present: true, showInDialog: true, blendMode: "screen", color: hexToRgb(look.glow), opacity: 1 - (look.glowAlpha ?? 0), size: { units: "Pixels", value: Math.round(px * 0.25 * (look.glowSize ?? 1)) }, choke: { units: "Pixels", value: 0 }, range: 0.5, source: "edge", antialiased: false, noise: 0, contour } as NonNullable<Layer["effects"]>["outerGlow"];
  }
  return Object.keys(fx).length ? fx : undefined;
}
/** 포토샵 글자 레이어 → 글자 칸 모양 (처음 열 때) */
export function lookFromLayer(l: PLayer): TextLook & { text: string; px: number } {
  const t = l.text!;
  const st = t.style || t.styleRuns?.[0]?.style || {};
  const scale = Math.abs(t.transform?.[3] || 1);
  const px = Math.round((st.fontSize || 24) * scale);
  const fx = l.effects;
  const stroke = fx?.stroke?.[0];
  const sh = fx?.dropShadow?.[0];
  const gl = fx?.outerGlow;
  const just = t.paragraphStyle?.justification || t.paragraphStyleRuns?.[0]?.style?.justification;
  return {
    text: (t.text || "").replace(/\r/g, "\n"),
    px,
    font: familyOfPs(st.font?.name),
    color: rgbToHex(st.fillColor),
    bold: st.fauxBold ? true : undefined,
    italic: st.fauxItalic || undefined,
    underline: st.underline || undefined,
    textCase: st.fontCaps === 2 ? "upper" : undefined,
    spacing: typeof st.tracking === "number" ? st.tracking / 1000 : undefined,
    leading: st.autoLeading === false && st.leading ? st.leading / (st.fontSize || 24) : undefined,
    align: just === "center" ? "center" : just === "right" ? "right" : "left",
    outline: stroke?.enabled ? rgbToHex(stroke.color) : undefined,
    outlineWidth: stroke?.enabled ? Math.round(((stroke.size?.value || 2) * 50) / px) : 0,
    shadow: sh?.enabled ? Math.max(0.01, (sh.distance?.value || 6) / px / 1.41) : 0,
    shadowColor: sh?.enabled ? rgbToHex(sh.color) : undefined,
    shadowAlpha: sh?.enabled ? 1 - (sh.opacity ?? 0.75) : undefined,
    glow: gl?.enabled ? rgbToHex(gl.color) : "",
    glowSize: gl?.enabled ? Math.max(0.3, (gl.size?.value || px * 0.25) / (px * 0.25)) : undefined,
    textAlpha: typeof (l as { fillOpacity?: number }).fillOpacity === "number" ? 1 - (l as { fillOpacity?: number }).fillOpacity! : undefined,
  };
}
/** 글자 레이어를 다시 그리기 — 기준점(left·top)은 그대로 두고 그림·효과·포토샵 글자 정보를 맞춘다 */
export function applyLook(l: PLayer, look: TextLook & { text: string; px: number }, keepAnchor = true) {
  const r = renderText(look);
  // 글이 길어지고 짧아져도 정렬 기준(가운데 정렬이면 가운데)이 제자리에
  if (keepAnchor && l.canvas && typeof l.left === "number") {
    const a = look.align || "left";
    const dw = r.canvas.width - l.canvas.width;
    if (a === "center") l.left = Math.round(l.left - dw / 2);
    else if (a === "right") l.left = Math.round(l.left - dw);
  }
  l._look = { ...look };
  l.canvas = r.canvas;
  l.right = (l.left || 0) + r.canvas.width;
  l.bottom = (l.top || 0) + r.canvas.height;
  l.effects = effectsFromLook(look, look.px);
  (l as { fillOpacity?: number }).fillOpacity = 1 - (look.textAlpha ?? 0);
  const align = look.align || "left";
  const ax = (l.left || 0) + (align === "center" ? r.canvas.width / 2 : align === "right" ? r.canvas.width : 0);
  const ay = (l.top || 0) + r.ascent;
  l.text = {
    text: look.text.replace(/\n/g, "\r"),
    transform: [1, 0, 0, 1, Math.round(ax), Math.round(ay)],
    antiAlias: "smooth",
    style: {
      font: { name: psFontName(look.font) }, fontSize: look.px, fillColor: hexToRgb(look.color || "#111111"),
      fauxBold: look.bold === true && !/Bold|Black|Han|Hyeon|Jua/.test(psFontName(look.font)), fauxItalic: Boolean(look.italic), underline: Boolean(look.underline),
      fontCaps: look.textCase === "upper" ? 2 : 0, tracking: Math.round(effSpacing(look) * 1000), autoLeading: false, leading: Math.round(effLeading(look) * look.px),
    },
    paragraphStyle: { justification: align },
  };
}

/* ── 효과 그리기 (드롭 섀도·외부 광선·획·색상 오버레이) — 포토샵과 비슷하게 ── */
const silhouette = (src: HTMLCanvasElement, color: string, alpha = 1) => {
  const c = mk(src.width, src.height);
  const g = ctx2(c);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
};
const fxMargin = (fx?: Layer["effects"]) => {
  if (!fx || fx.disabled) return 0;
  let m = 0;
  for (const s of fx.dropShadow || []) if (s.enabled !== false) m = Math.max(m, (s.distance?.value || 0) + (s.size?.value || 0) * 1.5);
  if (fx.outerGlow && fx.outerGlow.enabled !== false) m = Math.max(m, (fx.outerGlow.size?.value || 0) * 1.6);
  for (const s of fx.stroke || []) if (s.enabled !== false) m = Math.max(m, (s.size?.value || 0) + 2);
  return Math.ceil(m);
};

/** 마스크(흑백) → 투명도 그림 */
const maskCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function alphaMask(mc: HTMLCanvasElement) {
  const hit = maskCache.get(mc);
  if (hit) return hit;
  const c = mk(mc.width, mc.height);
  const g = ctx2(c);
  g.drawImage(mc, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i + 3] = Math.round((d.data[i] * d.data[i + 3]) / 255);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = 255;
  }
  g.putImageData(d, 0, 0);
  maskCache.set(mc, c);
  return c;
}

export type LayerImg = { c: HTMLCanvasElement; x: number; y: number };
/** 레이어 하나의 그림 (마스크·효과·칠 불투명도 포함, 레이어 불투명도·혼합 모드는 합칠 때) — 자리는 x·y 로 따로 → 옮겨도 다시 안 그림 */
const imgCache = new WeakMap<HTMLCanvasElement, { key: string; img: { c: HTMLCanvasElement; dx: number; dy: number } }>();
export function layerImage(l: PLayer): LayerImg | null {
  if (!l.canvas || l.adjustment) return null;
  const fx = l.effects && !l.effects.disabled ? l.effects : undefined;
  const fill = typeof (l as { fillOpacity?: number }).fillOpacity === "number" ? (l as { fillOpacity?: number }).fillOpacity! : 1;
  const mask = l.mask && !l.mask.disabled && l.mask.canvas ? l.mask : null;
  const key = JSON.stringify([fx, fill, mask ? [mask.left! - (l.left || 0), mask.top! - (l.top || 0), mask.defaultColor] : 0]);
  const cached = imgCache.get(l.canvas);
  if (cached && cached.key === key) return { c: cached.img.c, x: (l.left || 0) + cached.img.dx, y: (l.top || 0) + cached.img.dy };
  // 1) 마스크 적용한 원본
  let base = l.canvas;
  if (mask) {
    const c = mk(base.width, base.height);
    const g = ctx2(c);
    g.drawImage(base, 0, 0);
    g.globalCompositeOperation = "destination-in";
    if (mask.defaultColor === 255) {
      // 마스크 바깥은 보임 — 바깥을 먼저 채우고 마스크 칸만 마스크대로
      const m = mk(base.width, base.height);
      const mg = ctx2(m);
      mg.fillStyle = "#fff";
      mg.fillRect(0, 0, m.width, m.height);
      mg.clearRect(mask.left! - (l.left || 0), mask.top! - (l.top || 0), mask.canvas!.width, mask.canvas!.height);
      mg.drawImage(alphaMask(mask.canvas!), mask.left! - (l.left || 0), mask.top! - (l.top || 0));
      g.drawImage(m, 0, 0);
    } else g.drawImage(alphaMask(mask.canvas!), mask.left! - (l.left || 0), mask.top! - (l.top || 0));
    base = c;
  }
  const m = fxMargin(fx);
  const out = mk(base.width + m * 2, base.height + m * 2);
  const g = ctx2(out);
  if (fx) {
    // 뒤: 드롭 섀도 → 외부 광선 → 획(바깥)
    for (const s of fx.dropShadow || []) {
      if (s.enabled === false) continue;
      const a = ((s.angle ?? 120) * Math.PI) / 180, d = s.distance?.value || 0;
      g.save();
      if (s.size?.value) g.filter = `blur(${(s.size.value / 2).toFixed(1)}px)`;
      g.drawImage(silhouette(base, rgbToHex(s.color), s.opacity ?? 0.75), m - Math.cos(a) * d, m + Math.sin(a) * d);
      g.restore();
    }
    const og = fx.outerGlow;
    if (og && og.enabled !== false) {
      const sil = silhouette(base, rgbToHex(og.color), og.opacity ?? 0.75);
      g.save();
      g.filter = `blur(${Math.max(1, (og.size?.value || 10) / 2).toFixed(1)}px)`;
      g.drawImage(sil, m, m);
      g.drawImage(sil, m, m);
      g.restore();
    }
    for (const s of fx.stroke || []) {
      if (s.enabled === false || s.fillType === "pattern") continue;
      const r = s.size?.value || 3;
      const sil = silhouette(base, rgbToHex(s.color || { r: 0, g: 0, b: 0 }), 1);
      const st = mk(out.width, out.height);
      const sg = ctx2(st);
      const n = Math.max(12, Math.min(48, Math.round(r * 3)));
      for (let ring = r; ring > 0; ring -= Math.max(1, r / 3)) for (let i = 0; i < n; i++) {
        const t = (Math.PI * 2 * i) / n;
        sg.drawImage(sil, m + Math.cos(t) * ring, m + Math.sin(t) * ring);
      }
      g.globalAlpha = s.opacity ?? 1;
      g.drawImage(st, 0, 0);
      g.globalAlpha = 1;
    }
  }
  // 채움 (칠 불투명도)
  g.globalAlpha = fill;
  g.drawImage(base, m, m);
  g.globalAlpha = 1;
  // 위: 색상 오버레이
  if (fx) for (const s of fx.solidFill || []) {
    if (s.enabled === false) continue;
    g.save();
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = s.opacity ?? 1;
    g.fillStyle = rgbToHex(s.color);
    g.fillRect(m, m, base.width, base.height);
    g.restore();
  }
  imgCache.set(l.canvas, { key, img: { c: out, dx: -m, dy: -m } });
  return { c: out, x: (l.left || 0) - m, y: (l.top || 0) - m };
}

const BLEND: Record<string, GlobalCompositeOperation> = {
  normal: "source-over", "pass through": "source-over", multiply: "multiply", screen: "screen", overlay: "overlay", darken: "darken", lighten: "lighten",
  "color dodge": "color-dodge", "color burn": "color-burn", "hard light": "hard-light", "soft light": "soft-light", difference: "difference", exclusion: "exclusion",
  hue: "hue", saturation: "saturation", color: "color", luminosity: "luminosity", "linear dodge": "lighter",
};
export const blendOf = (b?: string) => BLEND[b || "normal"] || "source-over";

/** 레이어들을 합쳐 그리기 (아래 → 위, 클리핑 마스크·그룹 포함) */
export function drawList(g: CanvasRenderingContext2D, list: PLayer[], W: number, H: number, skip?: string) {
  for (let i = 0; i < list.length; ) {
    const base = list[i];
    const clipped: PLayer[] = [];
    let j = i + 1;
    while (j < list.length && list[j].clipping) clipped.push(list[j++]);
    i = j;
    if (base.hidden || base._k === skip) continue;
    let img: LayerImg | null;
    if (base.children) {
      const c = mk(W, H);
      drawList(ctx2(c), kids(base), W, H, skip);
      img = { c, x: 0, y: 0 };
    } else img = layerImage(base);
    if (!img) continue;
    if (clipped.length) {
      const c = mk(img.c.width, img.c.height);
      const cg = ctx2(c);
      cg.drawImage(img.c, 0, 0);
      for (const cl of clipped) {
        if (cl.hidden) continue;
        const ci = layerImage(cl);
        if (!ci) continue;
        cg.globalCompositeOperation = "source-atop";
        cg.globalAlpha = (cl.opacity ?? 1);
        cg.drawImage(ci.c, ci.x - img.x, ci.y - img.y);
      }
      img = { c, x: img.x, y: img.y };
    }
    g.globalAlpha = base.opacity ?? 1;
    g.globalCompositeOperation = blendOf(base.blendMode);
    g.drawImage(img.c, img.x, img.y);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
}
/** 문서 전체 그림 (실제 크기) */
export function composite(d: Doc, skip?: string) {
  const { width: W, height: H } = d.psd;
  if (d.pristine && d.psd.canvas && !skip) return d.psd.canvas;
  const c = mk(W, H);
  drawList(ctx2(c), kids(d.psd), W, H, skip);
  return c;
}
/** 누른 자리의 맨 위 레이어 (투명한 곳은 지나간다) */
export function hitTest(d: Doc, x: number, y: number): PLayer | null {
  let hit: PLayer | null = null;
  const look = (list: PLayer[]) => {
    for (let i = list.length - 1; i >= 0 && !hit; i--) {
      const l = list[i];
      if (l.hidden) continue;
      if (l.children) { look(kids(l)); continue; }
      if (l.protected?.position || l._box) continue; // 잠금 · 배경
      const img = layerImage(l);
      if (!img) continue;
      const ix = Math.floor(x - img.x), iy = Math.floor(y - img.y);
      if (ix < 0 || iy < 0 || ix >= img.c.width || iy >= img.c.height) continue;
      const a = ctx2(img.c).getImageData(ix, iy, 1, 1).data[3];
      if (a > 12) hit = l;
    }
  };
  look(kids(d.psd));
  return hit;
}

/* ── 새 문서 · 열기 · 저장 ── */
export function newDoc(o: { name: string; width: number; height: number; bg: "white" | "transparent" | string; ppi?: number }): Doc {
  const children: PLayer[] = [];
  if (o.bg !== "transparent") {
    const c = mk(o.width, o.height);
    const g = ctx2(c);
    g.fillStyle = o.bg === "white" ? "#FFFFFF" : o.bg;
    g.fillRect(0, 0, c.width, c.height);
    children.push({ _k: uid(), name: "배경", canvas: c, left: 0, top: 0, right: c.width, bottom: c.height, protected: { position: true, transparency: true, composite: false } });
  }
  return {
    id: uid(), name: o.name || "제목 없음-1", dirty: false, pristine: false,
    psd: { width: o.width, height: o.height, children, imageResources: { resolutionInfo: { horizontalResolution: o.ppi || 72, horizontalResolutionUnit: "PPI", widthUnit: "Inches", verticalResolution: o.ppi || 72, verticalResolutionUnit: "PPI", heightUnit: "Inches" } } },
  };
}
/** PSD 바이트 → 문서 */
export function openPsdBytes(name: string, bytes: Uint8Array, path?: string): Doc {
  const psd = readPsd(bytes, { skipThumbnail: true, skipLinkedFilesData: false }) as Psd;
  // 우리 메모 (XMP)
  const memo = readMemo(psd.imageResources?.xmpMetadata);
  walk(kids(psd), (l) => {
    l._k = uid();
    if (typeof l.id === "number" && memo[l.id]) {
      const m = memo[l.id];
      if (m.look) l._look = m.look;
      if (m.box) l._box = true;
      if (m.shape) l._shape = m.shape;
    }
  });
  // 저장할 때 만든 "글자 상자" 는 글자 레이어가 다시 그리므로 지운다
  const strip = (list: PLayer[]): PLayer[] => list.filter((l) => !l._box).map((l) => (l.children ? { ...l, children: strip(kids(l)) } : l));
  psd.children = strip(kids(psd));
  // 색 모드 — 우리가 저장한 CMYK 문서, 또는 포토샵 CMYK 파일 (그림은 RGB 로 바뀌어 열린다)
  const mode = memo[-1]?.mode || ((psd as { colorMode?: number }).colorMode === 4 ? "cmyk" : "rgb");
  const layerMemo = Object.keys(memo).filter((k) => k !== "-1").length;
  return { id: uid(), name: name.replace(/\.(psd|psb)$/i, ""), path, fromFile: true, psd, mode, dirty: false, pristine: Boolean(psd.canvas) && !layerMemo };
}
/** PNG·JPG → 문서 (그림 한 장짜리) */
export async function openImageBytes(name: string, bytes: Uint8Array, path?: string): Promise<Doc> {
  const c = await bytesToCanvas(bytes);
  const d = newDoc({ name: name.replace(/\.\w+$/, ""), width: c.width, height: c.height, bg: "transparent" });
  const bg: PLayer = { _k: uid(), name: "배경", canvas: c, left: 0, top: 0, right: c.width, bottom: c.height };
  d.psd.children = [bg];
  d.path = undefined; // 저장은 PSD 로 (원본 사진은 그대로)
  d.fromFile = true;
  void path;
  return d;
}
export async function bytesToCanvas(bytes: Uint8Array) {
  const bmp = await createImageBitmap(new Blob([bytes as BlobPart]));
  const c = mk(bmp.width, bmp.height);
  ctx2(c).drawImage(bmp, 0, 0);
  bmp.close();
  return c;
}

/* 우리 메모 (XMP) — 레이어 id → 글자 칸 모양 등. base64 로 넣어 포토샵이 그대로 들고 다니게 */
type Memo = Record<number, { look?: PLayer["_look"]; box?: boolean; shape?: PLayer["_shape"]; mode?: "rgb" | "cmyk" }>; // -1 = 문서 (색 모드)
function readMemo(xmp?: string): Memo {
  const m = /<gongsil:photolab>([A-Za-z0-9+/=]+)<\/gongsil:photolab>/.exec(xmp || "");
  if (!m) return {};
  try {
    return JSON.parse(decodeURIComponent(escape(atob(m[1])))) as Memo;
  } catch {
    return {};
  }
}
function writeMemo(xmp: string | undefined, memo: Memo) {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(memo))));
  const desc = `<rdf:Description rdf:about="" xmlns:gongsil="https://gongsilnews.com/ns/photolab/1.0/"><gongsil:photolab>${b64}</gongsil:photolab></rdf:Description>`;
  const clean = (xmp || "").replace(/<rdf:Description[^>]*xmlns:gongsil=[\s\S]*?<\/rdf:Description>/g, "");
  if (clean.includes("</rdf:RDF>")) return clean.replace("</rdf:RDF>", `${desc}</rdf:RDF>`);
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">${desc}</rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
}

/** 포토샵이 직접 저장한 레이어처럼 빈칸을 채운다 (마스크 오류 막기 — 인수인계 5-1) */
const fullRange = [0, 0, 255, 255];
const blendingRanges = { compositeGrayBlendSource: fullRange, compositeGraphBlendDestinationRange: fullRange, ranges: [0, 1, 2, 3].map(() => ({ sourceRange: fullRange, destRange: fullRange })) };

/** 문서 → PSD 바이트 (포토샵에서 열림: 글자는 글자로, 효과는 레이어 스타일로) */
export function savePsdBytes(d: Doc): Uint8Array {
  let maxId = 0;
  walk(kids(d.psd), (l) => { if (typeof l.id === "number") maxId = Math.max(maxId, l.id); });
  const memo: Memo = {};
  if (d.mode === "cmyk") memo[-1] = { mode: "cmyk" };
  const fix = (list: PLayer[]): PLayer[] => {
    const out: PLayer[] = [];
    for (const l0 of list) {
      const l: PLayer = { ...l0 };
      if (typeof l.id !== "number") l.id = ++maxId;
      const anyL = l as Record<string, unknown>;
      if (!anyL.blendingRanges) anyL.blendingRanges = blendingRanges;
      if (!l.protected) l.protected = { transparency: false, composite: false, position: false };
      if (!l.layerColor) l.layerColor = "none";
      if (!l.referencePoint) l.referencePoint = { x: 0, y: 0 };
      if (l.children) l.children = fix(kids(l));
      // 글자 상자 → 글자 아래에 그림 레이어 하나 (포토샵이 글자를 다시 그려도 상자는 남게)
      if (l._look?.bg && l.canvas) {
        const box = mk(l.canvas.width, l.canvas.height);
        const bg = ctx2(box);
        bg.fillStyle = l._look.bgColor || "#000000";
        bg.globalAlpha = Math.max(0, Math.min(1, l._look.bgOpacity ?? 0.62));
        bg.beginPath();
        bg.roundRect(0, 0, box.width, box.height, Math.min(12, l._look.px * 0.12));
        bg.fill();
        const bl: PLayer = { name: `${l.name || "글자"} 상자`, id: ++maxId, canvas: box, left: l.left, top: l.top, right: l.right, bottom: l.bottom, blendingRanges, protected: { transparency: false, composite: false, position: false }, layerColor: "none", referencePoint: { x: 0, y: 0 } } as PLayer;
        memo[bl.id!] = { box: true };
        out.push(bl);
      }
      if (l._look || l._shape) memo[l.id!] = { look: l._look, shape: l._shape };
      for (const k of Object.keys(l)) if (k.startsWith("_")) delete (l as Record<string, unknown>)[k];
      out.push(l);
    }
    return out;
  };
  const children = fix(kids(d.psd));
  // 연 뒤 안 고친 문서는 포토샵이 만든 합성 그림 그대로 (조정 레이어까지 정확)
  const comp = d.pristine && d.psd.canvas ? d.psd.canvas : composite({ ...d, pristine: false });
  const psd: Psd = {
    ...d.psd,
    children,
    canvas: comp,
    imageResources: { ...(d.psd.imageResources || {}), xmpMetadata: writeMemo(d.psd.imageResources?.xmpMetadata, memo) },
  };
  delete (psd as { imageData?: unknown }).imageData;
  const editedText = Object.values(memo).some((m) => m.look);
  return writePsdUint8Array(psd, { invalidateTextLayers: editedText, generateThumbnail: true });
}
/** PNG·JPG 바이트 */
export async function exportBytes(d: Doc, type: "png" | "jpg", quality = 0.92): Promise<Uint8Array> {
  let c = composite(d);
  if (type === "jpg") {
    // JPG 는 투명이 없으니 흰 바탕
    const w = mk(c.width, c.height);
    const g = ctx2(w);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w.width, w.height);
    g.drawImage(c, 0, 0);
    c = w;
  }
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("그림을 만들지 못했어요"))), type === "jpg" ? "image/jpeg" : "image/png", quality));
  return new Uint8Array(await blob.arrayBuffer());
}
/** 작은 그림 (최근 파일·레이어 목록) */
export function thumbOf(c: HTMLCanvasElement, max = 220) {
  const k = Math.min(1, max / Math.max(c.width, c.height));
  const t = mk(c.width * k, c.height * k);
  const g = ctx2(t);
  g.imageSmoothingQuality = "high";
  g.drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL("image/png");
}

/* ── 넣기 ── */
export function textLayer(d: Doc, look?: Partial<TextLook>, text = "글자를 입력하세요"): PLayer {
  const px = Math.max(12, Math.round(Math.min(d.psd.width, d.psd.height) * 0.07));
  const l: PLayer = { _k: uid(), name: text.slice(0, 20), left: 0, top: 0 };
  applyLook(l, { font: "Pretendard", color: "#111111", outlineWidth: 0, align: "center", ...look, text, px });
  const w = l.canvas!.width, h = l.canvas!.height;
  offsetLayer(l, Math.round((d.psd.width - w) / 2), Math.round((d.psd.height - h) / 2));
  return l;
}
export function imageLayer(d: Doc, src: HTMLCanvasElement, name: string): PLayer {
  const k = Math.min(1, (d.psd.width * 0.7) / src.width, (d.psd.height * 0.7) / src.height);
  const c = scaled(src, src.width * k, src.height * k);
  const x = Math.round((d.psd.width - c.width) / 2), y = Math.round((d.psd.height - c.height) / 2);
  return { _k: uid(), name, canvas: c, _src: k < 1 ? src : undefined, left: x, top: y, right: x + c.width, bottom: y + c.height };
}
export function scaled(src: HTMLCanvasElement, w: number, h: number) {
  const c = mk(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  const g = ctx2(c);
  g.imageSmoothingQuality = "high";
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
export function shapeCanvas(s: NonNullable<PLayer["_shape"]>) {
  const c = mk(s.w, s.h);
  const g = ctx2(c);
  g.fillStyle = s.color;
  g.beginPath();
  g.roundRect(0, 0, c.width, c.height, Math.min(s.radius, c.width / 2, c.height / 2));
  g.fill();
  return c;
}
export function shapeLayer(d: Doc): PLayer {
  const s = { w: Math.round(d.psd.width * 0.4), h: Math.round(d.psd.height * 0.25), color: "#1A3A6B", radius: 0 };
  const c = shapeCanvas(s);
  const x = Math.round((d.psd.width - s.w) / 2), y = Math.round((d.psd.height - s.h) / 2);
  return { _k: uid(), name: "사각형", _shape: s, canvas: c, left: x, top: y, right: x + s.w, bottom: y + s.h };
}
/** 레이어 하나만 PNG (레이어 오른쪽 클릭 [PNG 빠른 내보내기]) */
export async function layerPng(l: PLayer): Promise<Uint8Array | null> {
  const img = l.children ? null : layerImage(l);
  if (!img) return null;
  const blob = await new Promise<Blob | null>((res) => img.c.toBlob(res, "image/png"));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

/* ── 고치기 ── */
export type Box = { x: number; y: number; w: number; h: number };
export const isText = (l: PLayer) => Boolean(l._look || l.text);
export const lookOf = (l: PLayer) => l._look || lookFromLayer(l);
/** 크기 바꾸기 — 글자는 글자 크기로, 도형은 다시 그리고, 사진은 원본에서 다시 줄여 (흐려지지 않게) */
export function applyResize(l: PLayer, box: Box) {
  const b0 = boundsOf(l);
  if (!b0 || l.children) return;
  const w = Math.max(1, Math.round(box.w)), h = Math.max(1, Math.round(box.h));
  if (isText(l)) {
    const look = lookOf(l);
    const k = h / b0.h;
    l.left = Math.round(box.x);
    l.top = Math.round(box.y);
    applyLook(l, { ...look, px: Math.max(4, Math.round(look.px * k)) }, false);
    return;
  }
  const sx = w / b0.w, sy = h / b0.h;
  if (l._shape) {
    l._shape = { ...l._shape, w, h };
    l.canvas = shapeCanvas(l._shape);
  } else {
    const src = l._src || l.canvas!;
    l._src = src;
    l.canvas = scaled(src, w, h);
    delete l.placedLayer; // 스마트 오브젝트 → 그림 (포토샵에서도 바뀐 크기 그대로)
  }
  if (l.mask?.canvas && typeof l.mask.left === "number") {
    const mx = box.x + (l.mask.left - b0.x) * sx, my = box.y + (l.mask.top! - b0.y) * sy;
    const mc = scaled(l.mask.canvas, l.mask.canvas.width * sx, l.mask.canvas.height * sy);
    l.mask = { ...l.mask, canvas: mc, left: Math.round(mx), top: Math.round(my), right: Math.round(mx) + mc.width, bottom: Math.round(my) + mc.height };
  }
  l.left = Math.round(box.x);
  l.top = Math.round(box.y);
  l.right = l.left + l.canvas!.width;
  l.bottom = l.top + l.canvas!.height;
}
const flipped = (c: HTMLCanvasElement, h: boolean) => {
  const o = mk(c.width, c.height);
  const g = ctx2(o);
  g.translate(h ? o.width : 0, h ? 0 : o.height);
  g.scale(h ? -1 : 1, h ? 1 : -1);
  g.drawImage(c, 0, 0);
  return o;
};
/** 뒤집기 (사진·도형) */
export function flipLayer(l: PLayer, horizontal: boolean) {
  if (!l.canvas || l.children || isText(l)) return;
  l.canvas = flipped(l.canvas, horizontal);
  if (l._src) l._src = flipped(l._src, horizontal);
  if (l.mask?.canvas) l.mask = { ...l.mask, canvas: flipped(l.mask.canvas, horizontal) };
  delete l.placedLayer;
}
/** 복제 — 새 열쇠·새 id (그림은 같이 써도 된다) */
export function duplicate(l: PLayer): PLayer {
  const c = cloneTree(l);
  walk([c], (x) => { x._k = uid(); delete x.id; });
  c.name = `${l.name || "레이어"} 복사`;
  return c;
}
/** 부모 목록 찾기 */
export function parentList(root: PLayer[], k: string): { list: PLayer[]; i: number; parent: PLayer | null } | null {
  let out: { list: PLayer[]; i: number; parent: PLayer | null } | null = null;
  const look = (list: PLayer[], parent: PLayer | null) => {
    list.forEach((l, i) => {
      if (out) return;
      if (l._k === k) out = { list, i, parent };
      else if (l.children) look(kids(l), l);
    });
  };
  look(root, null);
  return out;
}
/** 레이어 하나(또는 여러 개)를 한 장의 그림으로 — 아래 레이어와 병합 · 그림으로 바꾸기 */
export function rasterize(list: PLayer[], W: number, H: number, name: string): PLayer | null {
  const c = mk(W, H);
  drawList(ctx2(c), list.map((l) => ({ ...l, hidden: false, clipping: false })), W, H);
  // 빈 곳 잘라내기
  const d = ctx2(c).getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const out = mk(x1 - x0 + 1, y1 - y0 + 1);
  ctx2(out).drawImage(c, -x0, -y0);
  return { _k: uid(), name, canvas: out, left: x0, top: y0, right: x1 + 1, bottom: y1 + 1 };
}
/** 문서(캔버스) 크기 바꾸기 — 가운데 기준 */
export function resizeCanvas(d: Doc, w: number, h: number) {
  const dx = Math.round((w - d.psd.width) / 2), dy = Math.round((h - d.psd.height) / 2);
  for (const l of kids(d.psd)) {
    if (l.name === "배경" && l.protected?.position && l.canvas && !l.children) {
      // 우리가 만든 흰 배경은 새 크기로 다시 칠한다
      const c = mk(w, h);
      const g = ctx2(c);
      g.fillStyle = ctx2(l.canvas).getImageData(0, 0, 1, 1).data[3] ? `rgba(${[...ctx2(l.canvas).getImageData(0, 0, 1, 1).data.slice(0, 3)].join(",")})` : "#fff";
      g.fillRect(0, 0, w, h);
      l.canvas = c; l.left = 0; l.top = 0; l.right = w; l.bottom = h;
    } else offsetLayer(l, dx, dy);
  }
  d.psd.width = w;
  d.psd.height = h;
}
/** 문서에 조정 레이어가 있나 (미리보기에는 안 보임 — 포토샵에서는 그대로) */
export function hasAdjust(d: Doc) {
  let n = 0;
  walk(kids(d.psd), (l) => { if (l.adjustment) n++; });
  return n;
}
/* 레이어 효과 기본값 (오른쪽 칸 [효과] 켜기) */
const contour0 = () => ({ name: "Linear", curve: [{ x: 0, y: 0 }, { x: 255, y: 255 }] });
export const FX_DEFAULT = {
  stroke: () => ({ enabled: true, present: true, showInDialog: true, position: "outside" as const, fillType: "color" as const, blendMode: "normal" as const, opacity: 1, size: { units: "Pixels" as const, value: 6 }, color: { r: 255, g: 255, b: 255 } }),
  dropShadow: () => ({ enabled: true, present: true, showInDialog: true, blendMode: "multiply" as const, color: { r: 0, g: 0, b: 0 }, opacity: 0.6, angle: 120, useGlobalLight: false, distance: { units: "Pixels" as const, value: 10 }, choke: { units: "Pixels" as const, value: 0 }, size: { units: "Pixels" as const, value: 14 }, antialiased: false, layerConceals: true, contour: contour0() }),
  outerGlow: () => ({ enabled: true, present: true, showInDialog: true, blendMode: "screen" as const, color: { r: 255, g: 230, b: 120 }, opacity: 0.8, size: { units: "Pixels" as const, value: 20 }, choke: { units: "Pixels" as const, value: 0 }, range: 0.5, source: "edge" as const, antialiased: false, noise: 0, contour: contour0() }),
  solidFill: () => ({ enabled: true, present: true, showInDialog: true, blendMode: "normal" as const, color: { r: 26, g: 58, b: 107 }, opacity: 1 }),
};
export { hexToRgb, rgbToHex };

/* ── 색칠하기 · 그레이디언트 (브러시 · 지우개 · 페인트 통 · 그레이디언트 도구) ── */
/** 그림을 제자리에서 바꾼 뒤 — 기억해 둔 레이어 그림을 버린다 */
export const forgetImage = (c?: HTMLCanvasElement) => { if (c) imgCache.delete(c); };
export function copyCanvas(c: HTMLCanvasElement) {
  const o = mk(c.width, c.height);
  ctx2(o).drawImage(c, 0, 0);
  return o;
}
/** 색칠할 수 있는 레이어 (그림 레이어만 — 글자·도형·그룹·조정·스마트 오브젝트는 안 됨) */
export const paintable = (l: PLayer | null | undefined): l is PLayer =>
  Boolean(l && l.canvas && !l.children && !isText(l) && !l._shape && !l.adjustment && !l.placedLayer);
/** 색칠하기 전에 — 레이어 그림을 문서 전체를 덮게 넓히고 새 그림으로 (되돌리기 기록이 옛 그림을 갖도록) */
export function preparePaint(l: PLayer, W: number, H: number) {
  const b = boundsOf(l) || { x: 0, y: 0, w: W, h: H };
  const x0 = Math.min(0, b.x), y0 = Math.min(0, b.y), x1 = Math.max(W, b.x + b.w), y1 = Math.max(H, b.y + b.h);
  const c = mk(x1 - x0, y1 - y0);
  if (l.canvas) ctx2(c).drawImage(l.canvas, b.x - x0, b.y - y0);
  l.canvas = c;
  l.left = x0; l.top = y0; l.right = x1; l.bottom = y1;
  delete l._src;
}
/** 브러시 한 점 (경도 1 = 또렷, 0 = 부드럽게) */
export function dab(g: CanvasRenderingContext2D, x: number, y: number, size: number, hardness: number, color: string) {
  const r = Math.max(0.5, size / 2);
  if (hardness >= 0.98) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    return;
  }
  const { r: R, g: G, b: B } = hexToRgb(color);
  const grd = g.createRadialGradient(x, y, r * hardness, x, y, r);
  grd.addColorStop(0, `rgba(${R},${G},${B},1)`);
  grd.addColorStop(1, `rgba(${R},${G},${B},0)`);
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
/** 두 점 사이를 브러시 점으로 잇기 */
export function dabLine(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, size: number, hardness: number, color: string) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const step = Math.max(0.5, size * 0.12);
  const n = Math.max(1, Math.ceil(d / step));
  for (let i = 1; i <= n; i++) dab(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, size, hardness, color);
}
/** 페인트 통 — 누른 곳과 비슷한 색이 이어진 곳을 채운다 (허용치 0~255) */
export function floodFill(src: HTMLCanvasElement, sx: number, sy: number, color: string, tol: number, opacity: number) {
  const w = src.width, h = src.height;
  const out = copyCanvas(src);
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return out;
  const d = ctx2(src).getImageData(0, 0, w, h).data;
  const i0 = (sy * w + sx) * 4;
  const t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
  const same = (p: number) => {
    const i = p * 4;
    // 투명끼리는 색을 따지지 않는다
    if (t[3] === 0 && d[i + 3] === 0) return true;
    return Math.abs(d[i] - t[0]) <= tol && Math.abs(d[i + 1] - t[1]) <= tol && Math.abs(d[i + 2] - t[2]) <= tol && Math.abs(d[i + 3] - t[3]) <= tol;
  };
  const mask = new Uint8Array(w * h);
  const stack = [sy * w + sx];
  while (stack.length) {
    const p = stack.pop()!;
    if (mask[p] || !same(p)) continue;
    const y = Math.floor(p / w);
    let l = p, r = p;
    while (l % w > 0 && !mask[l - 1] && same(l - 1)) l--;
    while (r % w < w - 1 && !mask[r + 1] && same(r + 1)) r++;
    for (let q = l; q <= r; q++) {
      mask[q] = 1;
      if (y > 0 && !mask[q - w]) stack.push(q - w);
      if (y < h - 1 && !mask[q + w]) stack.push(q + w);
    }
  }
  const f = mk(w, h);
  const fg = ctx2(f);
  const img = fg.createImageData(w, h);
  const { r: R, g: G, b: B } = hexToRgb(color);
  for (let p = 0; p < mask.length; p++) if (mask[p]) {
    const i = p * 4;
    img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255;
  }
  fg.putImageData(img, 0, 0);
  const og = ctx2(out);
  og.globalAlpha = opacity;
  og.drawImage(f, 0, 0);
  return out;
}
/** 그레이디언트 칠하기 (선형 · 원형) — 그림 전체를 새로 칠한다 */
export function paintGradient(c: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number, type: "linear" | "radial", c0: string, c1: string | null, opacity: number) {
  const g = ctx2(c);
  g.clearRect(0, 0, c.width, c.height);
  const grd = type === "radial" ? g.createRadialGradient(x0, y0, 0, x0, y0, Math.max(1, Math.hypot(x1 - x0, y1 - y0))) : g.createLinearGradient(x0, y0, x1, y1);
  const a = hexToRgb(c0);
  grd.addColorStop(0, `rgba(${a.r},${a.g},${a.b},1)`);
  if (c1) grd.addColorStop(1, c1);
  else grd.addColorStop(1, `rgba(${a.r},${a.g},${a.b},0)`);
  g.globalAlpha = opacity;
  g.fillStyle = grd;
  g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 1;
}
/** 문서 한 점의 색 (스포이드 — Alt+누르기) */
export function pickColor(d: Doc, x: number, y: number) {
  const c = composite(d);
  const px = ctx2(c).getImageData(Math.max(0, Math.min(c.width - 1, Math.floor(x))), Math.max(0, Math.min(c.height - 1, Math.floor(y))), 1, 1).data;
  return rgbToHex({ r: px[0], g: px[1], b: px[2] });
}
/** 안내선 (포토샵 PSD 안 안내선 그대로) */
export type PsdGuide = { location: number; direction: "horizontal" | "vertical" };
export const guidesOf = (d: Doc): PsdGuide[] => (d.psd.imageResources?.gridAndGuidesInformation?.guides as PsdGuide[] | undefined) || [];
export function setGuides(d: Doc, g: PsdGuide[]) {
  const ir = (d.psd.imageResources ||= {});
  ir.gridAndGuidesInformation = { ...(ir.gridAndGuidesInformation || {}), guides: g };
}
/** 문서에 알맞은 격자 간격 (짧은 변의 1/10 근처 둥근 수) */
export function niceGrid(W: number, H: number) {
  const raw = Math.min(W, H) / 10;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw * 0.75) || 10 * p;
}
