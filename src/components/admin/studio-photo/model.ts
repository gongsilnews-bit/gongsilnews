// 이미지 편집 (포토랩) — PSD 를 바탕으로 한 문서·그리기·저장 (회의: docs/2026-10-19_photolab_meeting.md)
//  - 열기/저장은 ag-psd 로 이 화면 안에서 (PC 안에서만, 빠르게). 앱은 파일을 읽고 쓰기만 한다 (studio-app/src/photo/ipc.js)
//  - 문서 = ag-psd 의 Psd 그대로 (포토샵 레이어·마스크·조정 레이어·스마트 오브젝트를 건드리지 않고 그대로 다시 저장)
//  - 그리기 = 레이어마다 그림(효과 포함)을 기억해 두고 자리만 바꿔 붙인다 (옮길 때 다시 그리지 않음)
//  - 우리만의 정보(글자 칸 모양 등)는 PSD 안 메모(XMP)에 함께 넣는다 → 포토샵은 무시, 포토랩은 다시 고칠 수 있다
import { pictoCanvas, pictoOf, type PictoStyle } from "./pictos";
import { readPsd, writePsdUint8Array, type Layer, type Psd, type WarpStyle } from "ag-psd";
import { warpCanvas } from "./warp";
import type { TextLook } from "@/components/admin/studio-video/SubPresets";
import { effLeading, effSpacing } from "@/components/admin/studio-video/timeline";
import { STUDIO_FONTS } from "@/lib/studio-video/fonts";

/* ── 레이어에 붙이는 우리 정보 (PSD 에는 안 들어가고, 저장할 때 XMP 메모로) ── */
export type PLayer = Layer & {
  _k?: string; // 화면에서 쓰는 열쇠
  _look?: TextLook & { text: string; px: number }; // 글자 칸 모양 (우리가 만든·고친 글자)
  _src?: HTMLCanvasElement; // 크기를 바꾼 사진의 원본 (여러 번 줄였다 늘려도 흐려지지 않게)
  _shape?: { w: number; h: number; color: string; radius: number; kind?: "rect" | "ellipse" | "line" | "path"; lw?: number; dir?: 1 | -1; rot?: number;
    pts?: { x: number; y: number; hx: number; hy: number }[] }; // pts = 펜 모양 (0~1 비율) // 도형 (선: lw 두께 · dir 1 = ↘ / -1 = ↗ · rot 회전°)
  _rot?: number; // 글자 회전 (°, 시계 방향)
  _tpl?: { id: string; fields: string[]; color: string }; // 디자인 템플릿에서 떼어낸 묶음 (어떤 템플릿 · 칸 글)
  _maskOf?: string; // 마스크에 칠할 때 쓰는 대리 레이어 — 진짜 레이어 열쇠
  _picto?: { id: string; color: string; style: "line" | "circle" }; // 픽토그램 — 크기를 바꾸면 다시 그려 또렷하게, 색 바꾸기
  _slot?: string; // 레이아웃 칸 — title · sub · price · area · address · agency · phone · photo · badge … (다른 공실을 넣으면 여기를 바꾼다)
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
  /** 이 문서를 만든 재료 — 가져온 공실·기사, 배경 AI 프롬프트 ("배경만 다시 만들기"에 씀) */
  meta?: { src?: { kind: "vacancy" | "article"; id: string; no?: string; title?: string }; ai?: { prompt: string; style?: string; ratio?: string } };
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

/** 글자 그림의 치수 — 고치는 칸을 그려진 글자에 딱 겹치게 */
export function textGeom(look: TextLook & { text: string; px: number }) {
  const px = Math.max(4, look.px);
  const fam = look.font || "Pretendard";
  return {
    px, sp: effSpacing(look) * px, lh: effLeading(look) * px,
    pad: look.bg ? px * 0.3 * (look.bgPad ?? 1) : 0,
    font: `${look.italic ? "italic " : ""}${look.bold === false ? 400 : 700} ${px}px '${fam}', 'Malgun Gothic', sans-serif`,
  };
}

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
  const pad = look.bg ? px * 0.3 * (look.bgPad ?? 1) : 0;
  // 단락 글자 (문자 도구로 끌어 만든 칸) — 칸 너비에서 띄어쓰기 단위로 줄을 바꾼다 (긴 낱말은 글자 단위)
  if (look.boxW) {
    const maxW = Math.max(px, look.boxW - pad * 2 - 2);
    const fits = (t: string) => meas.measureText(t).width <= maxW;
    const wrap = (t: string) => {
      const out: string[] = [];
      let cur = "";
      for (const tok of t.split(/(\s+)/)) {
        if (!tok) continue;
        if (fits(cur + tok)) { cur += tok; continue; }
        if (/^\s+$/.test(tok)) { out.push(cur); cur = ""; continue; }
        if (cur) { out.push(cur.replace(/\s+$/, "")); cur = ""; }
        if (fits(tok)) { cur = tok; continue; }
        for (const ch of Array.from(tok)) { if (cur && !fits(cur + ch)) { out.push(cur); cur = ch; } else cur += ch; }
      }
      out.push(cur);
      return out;
    };
    lines.splice(0, lines.length, ...lines.flatMap(wrap));
  }
  const widths = lines.map((t) => meas.measureText(t || " ").width);
  const tw = Math.max(1, ...widths);
  const w = look.boxW ? Math.max(1, Math.round(look.boxW)) : Math.ceil(tw + pad * 2 + 2);
  const h = look.boxW && look.boxH ? Math.max(1, Math.round(look.boxH)) : Math.ceil(lh * lines.length + pad * 2 * 0.6 + px * 0.15);
  // 가로·세로 비율 (포토샵 문자 칸의 가로/세로 비율 — Shift+끌기로 자유롭게 늘인 글자)
  const hs = look.hScale && look.hScale > 0 ? look.hScale : 1, vs = look.vScale && look.vScale > 0 ? look.vScale : 1;
  const c = mk(Math.max(1, Math.ceil(w * hs)), Math.max(1, Math.ceil(h * vs)));
  const g = ctx2(c);
  if (hs !== 1 || vs !== 1) g.scale(hs, vs);
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
  g.fillStyle = look.gradTo && !look.bg ? textGradient(g, look, w, h) : look.color || "#111111";
  const align = look.align || "left";
  lines.forEach((t, i) => {
    const x = align === "center" ? (w - widths[i]) / 2 : align === "right" ? w - pad - widths[i] - 1 : pad + 1;
    const y = pad * 0.6 + i * lh + (lh - px) / 2 + px * 0.86;
    g.fillText(t, x, y);
    if (look.underline) g.fillRect(x, y + px * 0.08, widths[i], Math.max(1, px * 0.06));
  });
  // 머리 딱지 (NEWS 등) — 글자 상자 위 왼쪽에 작은 색 띠 (영상 메인자막과 같은 모양, 2026-10-22)
  let out = c, asc = (pad * 0.6 + (lh - px) / 2 + px * 0.86) * vs;
  const tagT = String(look.tag || "").trim();
  if (tagT) {
    const tf = Math.max(6, Math.round(px * 0.55)), tp = Math.round(tf * 0.3), th = Math.round(tf * 1.45), gap = Math.round(px * 0.08);
    const tg = mk(4, 4).getContext("2d")!;
    tg.font = `900 ${tf}px 'Pretendard', 'Malgun Gothic', sans-serif`;
    const tw2 = Math.ceil(tg.measureText(tagT).width + tp * 2);
    const t = mk(Math.max(c.width, tw2), c.height + th + gap);
    const g2 = ctx2(t);
    g2.fillStyle = look.tagColor || "#1D4ED8";
    g2.fillRect(0, 0, tw2, th);
    g2.font = tg.font; g2.fillStyle = "#FFFFFF"; g2.textBaseline = "middle";
    g2.fillText(tagT, tp, th / 2 + 1);
    g2.drawImage(c, 0, th + gap);
    out = t;
    asc += th + gap;
  }
  // 텍스트 뒤틀기 — 반듯하게 그린 글자를 그물로 옮겨 그린다
  if (look.warp && look.warp.style && look.warp.style !== "none") return { canvas: warpCanvas(out, look.warp), ascent: asc };
  return { canvas: out, ascent: asc };
}

/** 그라데이션 글자 — 영상 편집기(gradCss)와 같은 뜻: 각도는 CSS 처럼 180 = 위→아래, 투명도 gradA·gradB */
const rgba = (hex: string, transp = 0) => { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${1 - transp})`; };
function textGradient(g: CanvasRenderingContext2D, look: TextLook, w: number, h: number) {
  const a = rgba(look.color || "#FFFFFF", look.gradA ?? 0), b = rgba(look.gradTo!, look.gradB ?? 0);
  if (look.gradType === "radial") {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
    grd.addColorStop(0, a);
    grd.addColorStop(1, b);
    return grd;
  }
  const t = ((Number(look.gradAngle ?? 180)) * Math.PI) / 180;
  const dx = Math.sin(t), dy = -Math.cos(t);
  const L = Math.abs(w * dx) + Math.abs(h * dy);
  const grd = g.createLinearGradient(w / 2 - (dx * L) / 2, h / 2 - (dy * L) / 2, w / 2 + (dx * L) / 2, h / 2 + (dy * L) / 2);
  if (look.gradType === "reflect") { grd.addColorStop(0, b); grd.addColorStop(0.5, a); grd.addColorStop(1, b); }
  else { grd.addColorStop(0, a); grd.addColorStop(1, b); }
  return grd;
}
/** 글자 칸 모양 → 포토샵 레이어 효과 (획·드롭 섀도·외부 광선) */
export function effectsFromLook(look: TextLook, px: number): Layer["effects"] | undefined {
  const fx: NonNullable<Layer["effects"]> = {};
  const contour = { name: "Linear", curve: [{ x: 0, y: 0 }, { x: 255, y: 255 }] };
  const ow = Number(look.outlineWidth ?? 0);
  if (!look.bg && ow > 0) {
    const s1 = Math.max(1, Math.round((ow * px) / 50));
    fx.stroke = [{ enabled: true, present: true, showInDialog: true, position: "outside", fillType: "color", blendMode: "normal", opacity: 1 - (look.outlineAlpha ?? 0), size: { units: "Pixels", value: s1 }, color: hexToRgb(look.outline || "#000000") }];
    // 이중 테두리 — 안쪽 테두리 바깥에 한 겹 더 (포토샵 획 두 개, 위가 안쪽)
    const ow2 = Number(look.outline2Width || 0);
    if (ow2 > 0) fx.stroke.push({ enabled: true, present: true, showInDialog: true, position: "outside", fillType: "color", blendMode: "normal", opacity: 1, size: { units: "Pixels", value: s1 + Math.max(1, Math.round((ow2 * px) / 50)) }, color: hexToRgb(look.outline2 || "#FFFFFF") });
  }
  if (!look.bg && look.gradTo) {
    // 그라데이션 글자 — 포토샵에서 글을 다시 써도 그대로 보이게 그레이디언트 오버레이로도
    const ang = Number(look.gradAngle ?? 180);
    const ca = hexToRgb(look.color || "#FFFFFF"), cb = hexToRgb(look.gradTo);
    const refl = look.gradType === "reflect";
    fx.gradientOverlay = [{
      enabled: true, present: true, showInDialog: true, blendMode: "normal", opacity: 1, align: true, scale: 1, reverse: false, dither: false,
      type: look.gradType === "radial" ? "radial" : refl ? "reflected" : "linear", angle: 90 - ang,
      gradient: {
        name: "Custom", type: "solid", smoothness: 1,
        colorStops: refl ? [{ color: ca, location: 0, midpoint: 50 }, { color: cb, location: 4096, midpoint: 50 }] : [{ color: ca, location: 0, midpoint: 50 }, { color: cb, location: 4096, midpoint: 50 }],
        opacityStops: [{ opacity: 1 - (look.gradA ?? 0), location: 0, midpoint: 50 }, { opacity: 1 - (look.gradB ?? 0), location: 4096, midpoint: 50 }],
      },
    }];
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
function gradFromFx(fx: PLayer["effects"]): Partial<TextLook> {
  const go = fx?.gradientOverlay?.[0];
  const gr = go?.enabled && go.gradient?.type === "solid" ? go.gradient : null;
  if (!go || !gr || gr.colorStops.length < 2) return {};
  const first = gr.colorStops[0], last = gr.colorStops[gr.colorStops.length - 1];
  return {
    color: rgbToHex(first.color), gradTo: rgbToHex(last.color),
    gradType: go.type === "radial" ? "radial" : go.type === "reflected" ? "reflect" : undefined,
    gradAngle: 90 - (go.angle ?? 90),
    gradA: 1 - (gr.opacityStops[0]?.opacity ?? 1) || undefined, gradB: 1 - (gr.opacityStops[gr.opacityStops.length - 1]?.opacity ?? 1) || undefined,
  };
}
/** 포토샵 글자 레이어 → 글자 칸 모양 (처음 열 때) */
export function lookFromLayer(l: PLayer): TextLook & { text: string; px: number } {
  const t = l.text!;
  const st = t.style || t.styleRuns?.[0]?.style || {};
  const tf = t.transform || [1, 0, 0, 1, 0, 0];
  const scale = Math.hypot(tf[0], tf[1]) || 1;
  const rot = Math.round((Math.atan2(tf[1], tf[0]) * 180) / Math.PI);
  if (rot && !l._rot) l._rot = (rot + 360) % 360; // 포토샵에서 돌린 글자
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
    hScale: st.horizontalScale && Math.abs(st.horizontalScale - 1) > 0.005 ? st.horizontalScale : undefined,
    vScale: st.verticalScale && Math.abs(st.verticalScale - 1) > 0.005 ? st.verticalScale : undefined,
    // 획이 둘이면 바깥 것이 이중 테두리
    ...(fx?.stroke?.[1]?.enabled && stroke?.enabled ? { outline2: rgbToHex(fx.stroke[1].color), outline2Width: Math.max(1, Math.round((((fx.stroke[1].size?.value || 4) - (stroke.size?.value || 2)) * 50) / px)) } : {}),
    // 그레이디언트 오버레이 → 그라데이션 글자
    ...gradFromFx(fx),
    shadow: sh?.enabled ? Math.max(0.01, (sh.distance?.value || 6) / px / 1.41) : 0,
    shadowColor: sh?.enabled ? rgbToHex(sh.color) : undefined,
    shadowAlpha: sh?.enabled ? 1 - (sh.opacity ?? 0.75) : undefined,
    glow: gl?.enabled ? rgbToHex(gl.color) : "",
    glowSize: gl?.enabled ? Math.max(0.3, (gl.size?.value || px * 0.25) / (px * 0.25)) : undefined,
    textAlpha: typeof (l as { fillOpacity?: number }).fillOpacity === "number" ? 1 - (l as { fillOpacity?: number }).fillOpacity! : undefined,
    // 포토샵 텍스트 뒤틀기
    ...(t.warp?.style && t.warp.style !== "none" && t.warp.style !== "custom" && t.warp.style !== "cylinder" ? { warp: { style: t.warp.style, bend: t.warp.value ?? 0, h: t.warp.perspective ?? 0, v: t.warp.perspectiveOther ?? 0, vertical: t.warp.rotate === "vertical" } } : {}),
    // 포토샵 단락 글자 (칸)
    ...(t.shapeType === "box" && t.boxBounds?.length === 4 ? { boxW: Math.round((t.boxBounds[2] - t.boxBounds[0]) * scale), boxH: Math.round((t.boxBounds[3] - t.boxBounds[1]) * scale) } : {}),
  };
}
/** 글자 레이어를 다시 그리기 — 기준점(left·top)은 그대로 두고 그림·효과·포토샵 글자 정보를 맞춘다 */
export function applyLook(l: PLayer, look: TextLook & { text: string; px: number }, keepAnchor = true) {
  const r = renderText(look);
  if (l._rot) { applyLookRotated(l, look, r); return; }
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
  const box = look.boxW ? { shapeType: "box" as const, boxBounds: [0, 0, r.canvas.width, r.canvas.height] } : {};
  l.text = {
    text: look.text.replace(/\n/g, "\r"),
    // 단락 글자는 칸의 왼쪽 위가 기준
    transform: look.boxW ? [1, 0, 0, 1, l.left || 0, l.top || 0] : [1, 0, 0, 1, Math.round(ax), Math.round(ay)],
    ...box,
    // 포토샵 텍스트 뒤틀기 (같은 이름 · 같은 값)
    ...(look.warp && look.warp.style !== "none" ? { warp: { style: look.warp.style as WarpStyle, value: look.warp.bend ?? 50, perspective: look.warp.h ?? 0, perspectiveOther: look.warp.v ?? 0, rotate: look.warp.vertical ? "vertical" as const : "horizontal" as const } } : {}),
    antiAlias: "smooth",
    style: {
      font: { name: psFontName(look.font) }, fontSize: look.px, fillColor: hexToRgb(look.color || "#111111"),
      fauxBold: look.bold === true && !/Bold|Black|Han|Hyeon|Jua/.test(psFontName(look.font)), fauxItalic: Boolean(look.italic), underline: Boolean(look.underline),
      fontCaps: look.textCase === "upper" ? 2 : 0, tracking: Math.round(effSpacing(look) * 1000), autoLeading: false, leading: Math.round(effLeading(look) * look.px),
      horizontalScale: look.hScale || 1, verticalScale: look.vScale || 1,
    },
    paragraphStyle: { justification: align },
  };
}

/** 돌린 글자 — 가운데를 그대로 두고 돌린 그림, 포토샵 글자 정보는 회전 행렬로 */
function applyLookRotated(l: PLayer, look: TextLook & { text: string; px: number }, r: { canvas: HTMLCanvasElement; ascent: number }) {
  const b = l.canvas ? { x: l.left || 0, y: l.top || 0, w: l.canvas.width, h: l.canvas.height } : { x: 0, y: 0, w: r.canvas.width, h: r.canvas.height };
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const deg = l._rot || 0, t = (deg * Math.PI) / 180;
  const rc = rotateCanvas(r.canvas, deg);
  l._look = { ...look };
  l.canvas = rc;
  l.left = Math.round(cx - rc.width / 2);
  l.top = Math.round(cy - rc.height / 2);
  l.right = l.left + rc.width;
  l.bottom = l.top + rc.height;
  l.effects = effectsFromLook(look, look.px);
  (l as { fillOpacity?: number }).fillOpacity = 1 - (look.textAlpha ?? 0);
  const align = look.align || "left";
  // 돌리기 전 기준점 → 가운데 기준으로 돌린 자리
  const ux = -r.canvas.width / 2 + (align === "center" ? r.canvas.width / 2 : align === "right" ? r.canvas.width : 0), uy = -r.canvas.height / 2 + r.ascent;
  const ax = cx + ux * Math.cos(t) - uy * Math.sin(t), ay = cy + ux * Math.sin(t) + uy * Math.cos(t);
  l.text = {
    text: look.text.replace(/\n/g, "\r"),
    transform: [Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t), Math.round(ax), Math.round(ay)],
    antiAlias: "smooth",
    style: {
      font: { name: psFontName(look.font) }, fontSize: look.px, fillColor: hexToRgb(look.color || "#111111"),
      fauxBold: look.bold === true && !/Bold|Black|Han|Hyeon|Jua/.test(psFontName(look.font)), fauxItalic: Boolean(look.italic), underline: Boolean(look.underline),
      fontCaps: look.textCase === "upper" ? 2 : 0, tracking: Math.round(effSpacing(look) * 1000), autoLeading: false, leading: Math.round(effLeading(look) * look.px),
      horizontalScale: look.hScale || 1, verticalScale: look.vScale || 1,
    },
    paragraphStyle: { justification: align },
  };
}
/** 레이어 돌리기 (자유 변형 회전) — 글자·도형은 고칠 수 있게 그대로, 사진은 원본에서 다시 돌려 흐려지지 않게 */
export function rotateLayer(l: PLayer, deg: number) {
  if (!deg || l.children || !l.canvas) return false;
  const b = boundsOf(l)!;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const place = (c: HTMLCanvasElement) => {
    l.canvas = c;
    l.left = Math.round(cx - c.width / 2);
    l.top = Math.round(cy - c.height / 2);
    l.right = l.left + c.width;
    l.bottom = l.top + c.height;
  };
  if (isText(l)) {
    const look = lookOf(l);
    l._rot = (((l._rot || 0) + deg) % 360 + 360) % 360 || undefined;
    if (!l._rot) {
      // 0° 로 돌아오면 보통 글자로 — 가운데 그대로
      const r = renderText(look);
      place(r.canvas);
      applyLook(l, look, false);
      return true;
    }
    applyLook(l, look);
    return true;
  }
  if (l._shape) {
    l._shape = { ...l._shape, rot: (((l._shape.rot || 0) + deg) % 360 + 360) % 360 || undefined };
    place(shapeCanvas(l._shape));
    return true;
  }
  let src = l._src || l.canvas;
  let k = l.canvas.width / src.width;
  if (Math.abs(k - l.canvas.height / src.height) > 0.01) { src = l.canvas; k = 1; } // 비율을 바꿔 줄인 사진은 지금 그림으로
  const rs = rotateCanvas(src, deg);
  l._src = k < 0.999 ? rs : undefined;
  place(k < 0.999 ? scaled(rs, rs.width * k, rs.height * k) : rs);
  delete l.placedLayer;
  delete l._picto; // 돌린 픽토그램은 그림으로
  if (l.mask) delete l.mask; // 마스크는 같이 돌리지 못한다 — 빼 둔다
  return true;
}

/* ── 레이어 마스크 (흰색 = 보이기 · 검정 = 숨기기) ── */
/** 새 마스크 — 문서 크기. sel = 선택 영역 (있으면 그 안만 보이기 / hide 면 그 안만 숨기기) */
export function makeMask(W: number, H: number, hide: boolean, sel: HTMLCanvasElement | null): NonNullable<PLayer["mask"]> {
  const c = mk(W, H);
  const g = ctx2(c);
  g.fillStyle = hide ? "#FFFFFF" : "#000000";
  if (sel) {
    // 선택 영역 모양 그대로 (부드러운 가장자리까지)
    g.fillRect(0, 0, W, H);
    const s = mk(W, H);
    const sg = ctx2(s);
    sg.fillStyle = hide ? "#000000" : "#FFFFFF";
    sg.fillRect(0, 0, W, H);
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(sel, 0, 0);
    g.drawImage(s, 0, 0);
  } else {
    g.fillStyle = hide ? "#000000" : "#FFFFFF";
    g.fillRect(0, 0, W, H);
  }
  return { left: 0, top: 0, right: W, bottom: H, canvas: c, defaultColor: sel ? (hide ? 255 : 0) : hide ? 0 : 255 };
}
/** 마스크를 문서 크기로 넓힌다 (칠하기 전에 — 되돌리기 기록이 옛 마스크를 갖도록 새 그림으로) */
export function fullMask(m: NonNullable<PLayer["mask"]>, W: number, H: number): NonNullable<PLayer["mask"]> {
  const c = mk(W, H);
  const g = ctx2(c);
  g.fillStyle = m.defaultColor === 0 ? "#000000" : "#FFFFFF";
  g.fillRect(0, 0, W, H);
  if (m.canvas) g.drawImage(m.canvas, m.left || 0, m.top || 0);
  return { ...m, left: 0, top: 0, right: W, bottom: H, canvas: c };
}
/** 마스크 적용 — 숨긴 곳을 그림에서 지우고 마스크는 뺀다 */
export function applyMask(l: PLayer) {
  const m = l.mask;
  if (!m?.canvas || !l.canvas) return;
  const c = copyCanvas(l.canvas);
  const g = ctx2(c);
  g.globalCompositeOperation = "destination-in";
  if (m.defaultColor === 255) {
    // 마스크 바깥은 보임
    const o = mk(c.width, c.height);
    const og = ctx2(o);
    og.fillStyle = "#fff";
    og.fillRect(0, 0, o.width, o.height);
    og.clearRect((m.left || 0) - (l.left || 0), (m.top || 0) - (l.top || 0), m.canvas.width, m.canvas.height);
    og.drawImage(alphaMask(m.canvas), (m.left || 0) - (l.left || 0), (m.top || 0) - (l.top || 0));
    g.drawImage(o, 0, 0);
  } else g.drawImage(alphaMask(m.canvas), (m.left || 0) - (l.left || 0), (m.top || 0) - (l.top || 0));
  l.canvas = c;
  delete l._src;
  delete l.mask;
}
/** 픽토그램 레이어 — 문서 짧은 변의 size 비율 크기로 가운데에 */
export function pictoLayer(d: Doc, id: string, color: string, style: PictoStyle, size?: number): PLayer {
  const s = Math.round(size || Math.min(d.psd.width, d.psd.height) * 0.14);
  const c = pictoCanvas(id, s, color, style);
  const x = Math.round((d.psd.width - s) / 2), y = Math.round((d.psd.height - s) / 2);
  return { _k: uid(), name: pictoOf(id).name, canvas: c, left: x, top: y, right: x + s, bottom: y + s, _picto: { id, color, style } };
}
/** 색 → 같은 밝기의 회색 (마스크에 칠하는 색) */
export function grayOf(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return rgbToHex({ r: v, g: v, b: v });
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

/** 마스크를 제자리에서 칠한 뒤 — 기억해 둔 투명도 그림을 버린다 */
export const forgetMask = (c?: HTMLCanvasElement) => { if (c) maskCache.delete(c); };
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
const imgCache = new WeakMap<HTMLCanvasElement, { key: string; m: HTMLCanvasElement | null; img: { c: HTMLCanvasElement; dx: number; dy: number } }>();
export function layerImage(l: PLayer): LayerImg | null {
  if (!l.canvas || l.adjustment) return null;
  const fx = l.effects && !l.effects.disabled ? l.effects : undefined;
  const fill = typeof (l as { fillOpacity?: number }).fillOpacity === "number" ? (l as { fillOpacity?: number }).fillOpacity! : 1;
  const mask = l.mask && !l.mask.disabled && l.mask.canvas ? l.mask : null;
  const key = JSON.stringify([fx, fill, mask ? [mask.left! - (l.left || 0), mask.top! - (l.top || 0), mask.defaultColor] : 0]);
  const cached = imgCache.get(l.canvas);
  if (cached && cached.key === key && cached.m === (mask?.canvas || null)) return { c: cached.img.c, x: (l.left || 0) + cached.img.dx, y: (l.top || 0) + cached.img.dy };
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
    for (const s of [...(fx.stroke || [])].reverse()) { // 목록 위(첫째)가 맨 위 — 아래 것부터 그린다
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
  imgCache.set(l.canvas, { key, m: mask?.canvas || null, img: { c: out, dx: -m, dy: -m } });
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

/** 그 자리에 그림이 있는 레이어 모두 (위부터) — 오른쪽 클릭 레이어 목록. 잠긴 레이어도 넣는다 */
/** 문자 도구 — 글자 사이 빈 곳도 그 글자로 (포토샵처럼 글 상자 안이면 맞음) · 맨 위 글자 레이어 */
export function textHit(d: Doc, x: number, y: number): PLayer | null {
  let hit: PLayer | null = null;
  const look = (list: PLayer[]) => {
    for (let i = list.length - 1; i >= 0 && !hit; i--) {
      const l = list[i];
      if (l.hidden) continue;
      if (l.children) { look(kids(l)); continue; }
      if (!isText(l)) continue;
      const b = boundsOf(l);
      if (b && x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h) hit = l;
    }
  };
  look(kids(d.psd));
  return hit;
}
export function hitAll(d: Doc, x: number, y: number): PLayer[] {
  const out: PLayer[] = [];
  const look = (list: PLayer[]) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const l = list[i];
      if (l.hidden || l._box) continue;
      if (l.children) { look(kids(l)); continue; }
      const img = layerImage(l);
      if (!img) continue;
      const ix = Math.floor(x - img.x), iy = Math.floor(y - img.y);
      if (ix < 0 || iy < 0 || ix >= img.c.width || iy >= img.c.height) continue;
      if (ctx2(img.c).getImageData(ix, iy, 1, 1).data[3] > 12) out.push(l);
    }
  };
  look(kids(d.psd));
  return out;
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
      if (m.rot) l._rot = m.rot;
      if (m.tpl) l._tpl = m.tpl;
      if (m.slot) l._slot = m.slot;
      if (m.picto) l._picto = m.picto;
    }
  });
  // 저장할 때 만든 "글자 상자" 는 글자 레이어가 다시 그리므로 지운다
  const strip = (list: PLayer[]): PLayer[] => list.filter((l) => !l._box).map((l) => (l.children ? { ...l, children: strip(kids(l)) } : l));
  psd.children = strip(kids(psd));
  // 색 모드 — 우리가 저장한 CMYK 문서, 또는 포토샵 CMYK 파일 (그림은 RGB 로 바뀌어 열린다)
  const mode = memo[-1]?.mode || ((psd as { colorMode?: number }).colorMode === 4 ? "cmyk" : "rgb");
  const layerMemo = Object.keys(memo).filter((k) => k !== "-1").length;
  return { id: uid(), name: name.replace(/\.(psd|psb)$/i, ""), path, fromFile: true, psd, mode, dirty: false, pristine: Boolean(psd.canvas) && !layerMemo, meta: memo[-1]?.meta };
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
type Memo = Record<number, { look?: PLayer["_look"]; box?: boolean; shape?: PLayer["_shape"]; rot?: number; tpl?: PLayer["_tpl"]; slot?: string; picto?: PLayer["_picto"]; mode?: "rgb" | "cmyk"; meta?: Doc["meta"] }>; // -1 = 문서 (색 모드)
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
  if (d.mode === "cmyk" || d.meta) memo[-1] = { ...(d.mode === "cmyk" ? { mode: "cmyk" as const } : {}), ...(d.meta ? { meta: d.meta } : {}) };
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
      if (l._look || l._shape || l._tpl || l._slot || l._rot || l._picto) memo[l.id!] = { look: l._look, shape: l._shape, rot: l._rot, tpl: l._tpl, slot: l._slot, picto: l._picto };
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
/** 웹용으로 저장 — JPG · PNG · GIF · WebP, 크기(scale)와 화질 */
export type WebFmt = "jpg" | "png" | "gif" | "webp";
export async function webBytes(d: Doc, fmt: WebFmt, quality = 0.8, scale = 1): Promise<Uint8Array> {
  let c = composite(d);
  if (scale !== 1) c = scaled(c, c.width * scale, c.height * scale);
  if (fmt === "jpg") {
    const w = mk(c.width, c.height);
    const g = ctx2(w);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w.width, w.height);
    g.drawImage(c, 0, 0);
    c = w;
  }
  if (fmt === "gif") {
    const { encodeGif } = await import("./gif");
    return encodeGif(c);
  }
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("그림을 만들지 못했어요"))), fmt === "jpg" ? "image/jpeg" : fmt === "webp" ? "image/webp" : "image/png", quality));
  return new Uint8Array(await blob.arrayBuffer());
}
/** 레이어가 하나뿐인 사진 문서인가 — 그러면 원래 형식(JPG·PNG·WebP)으로 저장 (포토샵처럼) */
export function flatExt(d: Doc): "jpg" | "png" | "webp" | null {
  const m = /\.(jpe?g|png|webp)$/i.exec(d.path || "");
  if (!m) return null;
  const top = kids(d.psd);
  if (top.length !== 1) return null;
  const l = top[0];
  if (l.children || l.hidden || isText(l) || l._shape || (l.opacity ?? 1) < 1 || (l.effects && !l.effects.disabled) || l.mask || l.blendMode && l.blendMode !== "normal") return null;
  const e = m[1].toLowerCase();
  return e === "jpeg" ? "jpg" : (e as "jpg" | "png" | "webp");
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
/** 그림 돌리기 — 가운데를 기준으로, 새 그림은 돌린 모양을 다 담는 크기 */
export function rotateCanvas(src: HTMLCanvasElement, deg: number) {
  const t = (deg * Math.PI) / 180, cs = Math.abs(Math.cos(t)), sn = Math.abs(Math.sin(t));
  const w = Math.max(1, Math.ceil(src.width * cs + src.height * sn)), h = Math.max(1, Math.ceil(src.width * sn + src.height * cs));
  const c = mk(w, h);
  const g = ctx2(c);
  g.imageSmoothingQuality = "high";
  g.translate(w / 2, h / 2);
  g.rotate(t);
  g.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}
export function shapeCanvas(s: NonNullable<PLayer["_shape"]>): HTMLCanvasElement {
  if (s.rot) return rotateCanvas(shapeCanvas({ ...s, rot: 0 }), s.rot);
  const c = mk(s.w, s.h);
  const g = ctx2(c);
  g.fillStyle = s.color;
  g.beginPath();
  if (s.kind === "line") {
    // 선 — 상자 대각선을 잇는다 (두께만큼 안쪽으로)
    const lw = Math.max(1, s.lw || 6), m = lw / 2;
    g.strokeStyle = s.color;
    g.lineWidth = lw;
    g.lineCap = "round";
    const yA = s.dir === -1 ? c.height - m : m, yB = s.dir === -1 ? m : c.height - m;
    const flatH = c.height <= lw + 1, flatW = c.width <= lw + 1;
    g.moveTo(flatW ? c.width / 2 : m, flatH ? c.height / 2 : yA);
    g.lineTo(flatW ? c.width / 2 : c.width - m, flatH ? c.height / 2 : yB);
    g.stroke();
    return c;
  }
  if (s.kind === "path" && s.pts) {
    // 펜 모양 — 비율 점을 지금 크기로
    const P = s.pts.map((q) => ({ x: q.x * c.width, y: q.y * c.height, hx: q.hx * c.width, hy: q.hy * c.height }));
    g.moveTo(P[0].x, P[0].y);
    for (let i = 1; i <= P.length; i++) { const a = P[i - 1], b = P[i % P.length]; g.bezierCurveTo(a.x + a.hx, a.y + a.hy, b.x - b.hx, b.y - b.hy, b.x, b.y); }
    g.closePath();
    g.fill();
    return c;
  }
  if (s.kind === "ellipse") g.ellipse(c.width / 2, c.height / 2, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
  else g.roundRect(0, 0, c.width, c.height, Math.min(s.radius, c.width / 2, c.height / 2));
  g.fill();
  return c;
}
export const SHAPE_NAME = { rect: "사각형", ellipse: "타원", line: "선", path: "모양" } as const;
/** 펜으로 그린 닫힌 모양 → 도형 레이어 (점은 상자 비율로 저장 — 크기를 바꿔도 모양 그대로) */
export function penShapeLayer(pts: { x: number; y: number; hx: number; hy: number }[], color: string): PLayer | null {
  if (pts.length < 3) return null;
  // 손잡이까지 담는 상자 (곡선이 상자 밖으로 조금 나갈 수 있어 넉넉히)
  const xs = pts.flatMap((q) => [q.x, q.x + q.hx, q.x - q.hx]), ys = pts.flatMap((q) => [q.y, q.y + q.hy, q.y - q.hy]);
  const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
  const w = Math.max(1, Math.ceil(Math.max(...xs)) - x), h = Math.max(1, Math.ceil(Math.max(...ys)) - y);
  const s = { w, h, color, radius: 0, kind: "path" as const, pts: pts.map((q) => ({ x: (q.x - x) / w, y: (q.y - y) / h, hx: q.hx / w, hy: q.hy / h })) };
  return { _k: uid(), name: "모양", _shape: s, canvas: shapeCanvas(s), left: x, top: y, right: x + w, bottom: y + h };
}
/** 도형 도구로 끌어 그린 도형 */
export function shapeLayerAt(kind: "rect" | "ellipse" | "line", box: Box, color: string, o: { radius?: number; lw?: number; dir?: 1 | -1 } = {}): PLayer {
  const lw = o.lw || 6;
  let { x, y, w, h } = box;
  if (kind === "line") { x -= lw / 2; y -= lw / 2; w += lw; h += lw; } // 끝이 잘리지 않게
  const s = { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), color, radius: o.radius || 0, kind, lw, dir: o.dir || 1 };
  const X = Math.round(x), Y = Math.round(y);
  return { _k: uid(), name: SHAPE_NAME[kind], _shape: s, canvas: shapeCanvas(s), left: X, top: Y, right: X + s.w, bottom: Y + s.h };
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
    const kx = box.w / b0.w, ky = box.h / b0.h;
    l.left = Math.round(box.x);
    l.top = Math.round(box.y);
    if (look.boxW) {
      // 단락 글자 — 칸 크기만 바꾸고 글자 크기는 그대로 (포토샵처럼, 줄은 새 칸에 맞춰 다시 바뀜)
      applyLook(l, { ...look, boxW: Math.max(look.px, Math.round(box.w / (look.hScale || 1))), boxH: Math.max(4, Math.round(box.h / (look.vScale || 1))) }, false);
    } else if (Math.abs(kx - ky) < 0.015) {
      // 비율 그대로 — 글자 크기로
      applyLook(l, { ...look, px: Math.max(4, Math.round(look.px * ky)) }, false);
    } else {
      // 자유롭게 (Shift+모서리 · 옆 손잡이) — 글자 크기는 그대로, 가로·세로 비율로 (포토샵 문자 칸과 같은 값)
      const hs = Math.max(0.05, Math.min(20, (look.hScale || 1) * kx)), vs = Math.max(0.05, Math.min(20, (look.vScale || 1) * ky));
      applyLook(l, { ...look, hScale: Math.abs(hs - 1) < 0.005 ? undefined : hs, vScale: Math.abs(vs - 1) < 0.005 ? undefined : vs }, false);
    }
    return;
  }
  const sx = w / b0.w, sy = h / b0.h;
  if (l._shape) {
    // 돌린 도형은 돌리기 전 크기를 같은 비율로
    l._shape = l._shape.rot ? { ...l._shape, w: Math.max(1, Math.round(l._shape.w * sx)), h: Math.max(1, Math.round(l._shape.h * sy)) } : { ...l._shape, w, h };
    l.canvas = shapeCanvas(l._shape);
  } else if (l._picto) {
    // 픽토그램 — 새 크기로 다시 그린다 (비율이 바뀌면 큰 쪽으로 그려 늘린다)
    const pc = pictoCanvas(l._picto.id, Math.max(w, h), l._picto.color, l._picto.style);
    l.canvas = w === h ? pc : scaled(pc, w, h);
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
/* ── 이미지 메뉴 (포토샵과 같게) — 캔버스 크기 · 이미지 크기 · 이미지 회전 · 재단 · 모두 나타내기 ── */
/** 배경 레이어(잠긴 맨 아래 그림) — 캔버스를 늘리면 늘어난 곳을 이 색으로 */
const bgLayerOf = (d: Doc) => kids(d.psd).find((l) => l.protected?.position && l.canvas && !l.children && (l.name === "배경" || l === kids(d.psd)[0])) || null;
/** 캔버스 크기 — 새 문서 = 지금 좌표의 상자 (x,y 가 음수면 늘어남). 그림은 그대로, 레이어는 옮기기만. ext = 배경 레이어의 늘어난 곳 색 ("" = 투명) */
export function canvasRect(d: Doc, box: Box, ext = "#FFFFFF") {
  const x = Math.round(box.x), y = Math.round(box.y), w = Math.max(1, Math.round(box.w)), h = Math.max(1, Math.round(box.h));
  const bg = bgLayerOf(d);
  for (const l of kids(d.psd)) {
    if (l === bg) {
      const c = mk(w, h);
      const g = ctx2(c);
      if (ext) { g.fillStyle = ext; g.fillRect(0, 0, w, h); }
      g.drawImage(l.canvas!, (l.left || 0) - x, (l.top || 0) - y);
      l.canvas = c; l.left = 0; l.top = 0; l.right = w; l.bottom = h;
      delete l._src;
    } else offsetLayer(l, -x, -y);
  }
  setGuides(d, guidesOf(d).map((g) => ({ ...g, location: g.location - (g.direction === "horizontal" ? y : x) })).filter((g) => g.location >= 0 && g.location <= (g.direction === "horizontal" ? h : w)));
  d.psd.width = w;
  d.psd.height = h;
}
/** 캔버스 크기 (기준점) — ax·ay 0 = 왼쪽/위, 0.5 = 가운데, 1 = 오른쪽/아래 */
export function canvasSizeDoc(d: Doc, w: number, h: number, ax = 0.5, ay = 0.5, ext = "#FFFFFF") {
  canvasRect(d, { x: Math.round((d.psd.width - w) * ax), y: Math.round((d.psd.height - h) * ay), w, h }, ext);
}
/** 이미지 크기 — 모든 레이어를 같은 비율로 늘이고 줄인다 (글자는 글자 크기로, 사진은 원본에서 다시) */
export function imageSizeDoc(d: Doc, w: number, h: number, ppi?: number) {
  const kx = w / d.psd.width, ky = h / d.psd.height;
  const scaleMask = (l: PLayer) => {
    const m = l.mask;
    if (!m?.canvas) return;
    const c = scaled(m.canvas, m.canvas.width * kx, m.canvas.height * ky);
    l.mask = { ...m, canvas: c, left: Math.round((m.left || 0) * kx), top: Math.round((m.top || 0) * ky), right: Math.round((m.left || 0) * kx) + c.width, bottom: Math.round((m.top || 0) * ky) + c.height };
  };
  walk(kids(d.psd), (l) => {
    if (l.children) return;
    const b = boundsOf(l);
    if (!b) return;
    if (isText(l)) {
      const look = lookOf(l);
      const k = ky, hs = (look.hScale || 1) * (kx / ky);
      l.left = Math.round(b.x * kx); l.top = Math.round(b.y * ky);
      applyLook(l, { ...look, px: Math.max(4, Math.round(look.px * k)), hScale: Math.abs(hs - 1) < 0.005 ? undefined : hs,
        ...(look.boxW ? { boxW: Math.round(look.boxW * kx / (hs || 1)), boxH: look.boxH ? Math.round(look.boxH * ky) : undefined } : {}) }, false);
    } else {
      applyResize(l, { x: b.x * kx, y: b.y * ky, w: Math.max(1, b.w * kx), h: Math.max(1, b.h * ky) });
    }
    scaleMask(l);
    // 레이어 효과(획·그림자) 크기도 같이
    const fx = l.effects;
    const kk = Math.sqrt(kx * ky);
    if (fx && !isText(l)) {
      for (const st of fx.stroke || []) if (st.size) st.size = { ...st.size, value: Math.max(1, Math.round(st.size.value * kk)) };
      for (const ds of fx.dropShadow || []) { if (ds.distance) ds.distance = { ...ds.distance, value: Math.round(ds.distance.value * kk) }; if (ds.size) ds.size = { ...ds.size, value: Math.round(ds.size.value * kk) }; }
    }
  });
  setGuides(d, guidesOf(d).map((g) => ({ ...g, location: Math.round(g.location * (g.direction === "horizontal" ? ky : kx)) })));
  d.psd.width = Math.max(1, Math.round(w));
  d.psd.height = Math.max(1, Math.round(h));
  if (ppi) {
    d.psd.imageResources = { ...(d.psd.imageResources || {}), resolutionInfo: { horizontalResolution: ppi, horizontalResolutionUnit: "PPI", widthUnit: "Inches", verticalResolution: ppi, verticalResolutionUnit: "PPI", heightUnit: "Inches" } };
  }
}
/** 이미지 회전 — 90 (시계) · 180 · 270 (반시계). 레이어마다 돌리고 자리도 돌린다 */
export function rotateDoc(d: Doc, deg: 90 | 180 | 270) {
  const W = d.psd.width, H = d.psd.height;
  const nW = deg === 180 ? W : H, nH = deg === 180 ? H : W;
  const bg = bgLayerOf(d);
  walk(kids(d.psd), (l) => {
    if (l.children || !l.canvas) return;
    const b = boundsOf(l)!;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    // 가운데 점을 돌린 자리
    const [nx, ny] = deg === 90 ? [H - cy, cx] : deg === 180 ? [W - cx, H - cy] : [cy, W - cx];
    if (l === bg) {
      l.canvas = rotateCanvas(l.canvas, deg);
      delete l._src;
    } else rotateLayer(l, deg);
    const c = l.canvas!;
    l.left = Math.round(nx - c.width / 2); l.top = Math.round(ny - c.height / 2);
    l.right = l.left + c.width; l.bottom = l.top + c.height;
  });
  setGuides(d, []);
  d.psd.width = nW;
  d.psd.height = nH;
}
/** 캔버스 뒤집기 — 그림은 뒤집고 자리도 거울처럼. 글자는 읽을 수 있게 자리만 옮긴다 */
export function flipDoc(d: Doc, horizontal: boolean) {
  const W = d.psd.width, H = d.psd.height;
  walk(kids(d.psd), (l) => {
    if (l.children || !l.canvas) return;
    const b = boundsOf(l)!;
    if (!isText(l)) flipLayer(l, horizontal);
    if (l._shape?.rot) l._shape = { ...l._shape, rot: (360 - l._shape.rot) % 360 || undefined };
    const nx = horizontal ? W - b.x - b.w : b.x, ny = horizontal ? b.y : H - b.y - b.h;
    offsetLayer(l, Math.round(nx - b.x), Math.round(ny - b.y));
  });
}
/** 재단 — 투명한 곳 / 왼쪽 위 색 / 오른쪽 아래 색 을 가장자리에서 잘라낸다 */
export function trimBox(d: Doc, basis: "transparent" | "topleft" | "bottomright", sides: { top: boolean; bottom: boolean; left: boolean; right: boolean }): Box | null {
  const c = composite(d);
  const W = c.width, H = c.height;
  const px = ctx2(c).getImageData(0, 0, W, H).data;
  const ref = basis === "topleft" ? 0 : basis === "bottomright" ? (W * H - 1) * 4 : -1;
  const same = (i: number) => {
    if (ref < 0) return px[i + 3] < 8;
    return Math.abs(px[i] - px[ref]) < 6 && Math.abs(px[i + 1] - px[ref + 1]) < 6 && Math.abs(px[i + 2] - px[ref + 2]) < 6 && Math.abs(px[i + 3] - px[ref + 3]) < 6;
  };
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (same((y * W + x) * 4)) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const L = sides.left ? x0 : 0, T = sides.top ? y0 : 0, R = sides.right ? x1 + 1 : W, B = sides.bottom ? y1 + 1 : H;
  return { x: L, y: T, w: R - L, h: B - T };
}
/** 모두 나타내기 — 캔버스 밖으로 나간 레이어까지 다 보이게 캔버스를 넓힌다 */
export function revealBox(d: Doc): Box | null {
  let x0 = 0, y0 = 0, x1 = d.psd.width, y1 = d.psd.height;
  walk(kids(d.psd), (l) => {
    if (l.children || l.hidden) return;
    const b = boundsOf(l);
    if (!b) return;
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  });
  if (x0 === 0 && y0 === 0 && x1 === d.psd.width && y1 === d.psd.height) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** 자르기 — 상자 밖을 잘라 문서 크기를 상자에 맞춘다 (레이어는 옮기기만, 그림은 그대로) */
export function cropDoc(d: Doc, box: Box) {
  const x = Math.round(box.x), y = Math.round(box.y), w = Math.max(1, Math.round(box.w)), h = Math.max(1, Math.round(box.h));
  for (const l of kids(d.psd)) offsetLayer(l, -x, -y);
  setGuides(d, guidesOf(d).map((g) => ({ ...g, location: g.location - (g.direction === "horizontal" ? y : x) })).filter((g) => g.location >= 0 && g.location <= (g.direction === "horizontal" ? h : w)));
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
/** 칠한 뒤 — 투명한 가장자리를 잘라 레이어 범위를 그림이 있는 곳에 맞춘다 (포토샵처럼 테두리가 칠한 부분에) */
export function trimLayer(l: PLayer) {
  if (!l.canvas || l.children || isText(l) || l._shape) return;
  const c = l.canvas, W = c.width, H = c.height;
  const d = ctx2(c).getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = 0; x < W; x++) if (d[row + x * 4 + 3]) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; } // 다 지웠으면 한 칸만
  if (x0 === 0 && y0 === 0 && x1 === W - 1 && y1 === H - 1) return;
  const out = mk(x1 - x0 + 1, y1 - y0 + 1);
  ctx2(out).drawImage(c, -x0, -y0);
  l.canvas = out;
  l.left = (l.left || 0) + x0;
  l.top = (l.top || 0) + y0;
  l.right = l.left + out.width;
  l.bottom = l.top + out.height;
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
