"use client";

// 이미지 편집 — 가운데 그림판. 도구 고르기 없이: 누르면 고르기 · 끌면 옮기기 · 모서리 손잡이로 크기 · 두 번 누르면 글 고치기 · 휠로 확대
// 빠르게: 옮기는 동안은 [아래 그림 · 이 레이어 · 위 그림] 셋만 붙여 그린다 (다른 레이어를 다시 합치지 않음)
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { C, FONT, useStudioTheme } from "@/components/admin/studio-video/ui";
import { proofCanvas } from "./cmyk";
import { withLinked, boundsOf, composite, copyCanvas, textGeom, renderText, hitAll, offsetLayer, forgetMask, grayOf, dabLine, drawList, findLayer, forgetImage, hitTest, textHit, isText, kids, layerImage, lookOf, mk, paintGradient, pickColor, type Box, type Doc, type PLayer, type PsdGuide } from "./model";
import { alphaOf, bucketFill, clearInside, clipTo, extract, inpaint, keepInside, type PenPt, type SelMode, type SelShape } from "./selection";

export type View = { z: number; x: number; y: number };
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type Drag = {
  k: string;
  mode: "move" | Handle | "pan" | "paint" | "rot" | "multi";
  keys?: string[]; done?: { x: number; y: number }; // 여러 개 함께 옮기기 — 레이어들 · 지금까지 옮긴 만큼
  deg?: number; // 돌리는 중 (°)
  sx: number; sy: number; // 누른 곳 (화면)
  b0: Box;
  box: Box;
  v0?: View;
  below?: HTMLCanvasElement;
  above?: HTMLCanvasElement | null;
  moved: boolean;
  gx?: number; gy?: number; // 레이어 안에서 잡은 곳 (문서 좌표) — 다른 문서로 끌어갈 때
  tap?: boolean; // 문자 도구로 글자를 누름 — 안 끌고 떼면 고치기
  piece?: { c: HTMLCanvasElement; x: number; y: number }; // 선택 영역만 옮기는 중 — 잘라 든 조각 (포토샵처럼)
  copy?: boolean; // Alt 를 누른 채 끌기 — 선택한 부분을 복사해 옮김 (원래 자리는 그대로, 포토샵처럼 2026-10-30)
};
type Guide = { x?: number; y?: number };

export type Tool = "move" | "marquee" | "ellipseSel" | "lasso" | "polyLasso" | "wand" | "crop" | "picker" | "heal" | "brush" | "stamp" | "eraser" | "gradient" | "bucket" | "text"
  | "pen" | "freePen" | "curvePen" | "addAnchor" | "delAnchor" | "convAnchor" | "rectShape" | "ellipseShape" | "lineShape" | "hand" | "zoom";
export const PAINT_TOOLS: Tool[] = ["brush", "eraser", "bucket", "gradient", "stamp", "heal"];
export const SEL_TOOLS: Tool[] = ["marquee", "ellipseSel", "lasso", "polyLasso", "wand"];
export const SHAPE_TOOLS: Tool[] = ["rectShape", "ellipseShape", "lineShape"];
/** 페인트 통 커서 — 포토샵처럼 작은 화살표(누르는 곳) + 오른쪽 아래 페인트 통 */
const BUCKET_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'>"
  + "<path d='M1.5 1.5v10l2.6-2.5 1.8 4 1.5-.7-1.8-3.9h3.6z' fill='black' stroke='white' stroke-width='1' stroke-linejoin='round'/>"
  + "<g transform='translate(11 10)'>"
  + "<path d='M3 7l6-6 7 7-6 6z' fill='white' stroke='black' stroke-width='1.3' stroke-linejoin='round'/>"
  + "<path d='M9 1V-1.5a2 2 0 0 0-4 0V4' fill='none' stroke='black' stroke-width='1.3' stroke-linecap='round'/>"
  + "<path d='M16 8c1.3 2 2.2 3.4 2.2 4.4a2.2 2.2 0 0 1-4.4 0c0-1 .9-2.4 2.2-4.4z' fill='black' stroke='white' stroke-width='.8'/>"
  + "</g></svg>",
)}") 2 2, crosshair`;
/** 펜 묶음 (P) — 펜 · 자유 형태 펜 · 곡률 펜 · 기준점 추가 · 기준점 삭제 · 기준점 변환 */
export const PEN_TOOLS: Tool[] = ["pen", "freePen", "curvePen", "addAnchor", "delAnchor", "convAnchor"];
/** 포토샵 펜 커서 — 펜촉 + 옆 표시 (* 새 패스 · + 점 더하기 · − 점 빼기 · o 닫기 · ^ 변환) */
function penCursor(kind: "pen" | "free" | "curve" | "conv", sfx: string) {
  const nib = kind === "conv"
    ? "<path d='M3 3l9 3-3 3 6 6-2 2-6-6-3 3z' fill='black' stroke='white' stroke-width='1.1' stroke-linejoin='round'/>"
    : "<path d='M2 2l11 4.5 3.5 7.5-2.5 2.5-7.5-3.5z' fill='black' stroke='white' stroke-width='1.1' stroke-linejoin='round'/><circle cx='8.6' cy='8.6' r='1.3' fill='white'/><path d='M14 16l2-2 3 3-2 2z' fill='black' stroke='white' stroke-width='1'/>"
      + (kind === "free" ? "<path d='M15 25c2-3 4 1 6-2s4 1 6-2' fill='none' stroke='white' stroke-width='3'/><path d='M15 25c2-3 4 1 6-2s4 1 6-2' fill='none' stroke='black' stroke-width='1.2'/>" : "")
      + (kind === "curve" ? "<path d='M15 26q5-8 12 0' fill='none' stroke='white' stroke-width='3'/><path d='M15 26q5-8 12 0' fill='none' stroke='black' stroke-width='1.2'/>" : "");
  const mark = !sfx ? "" : sfx === "o"
    ? "<circle cx='23' cy='21' r='3' fill='none' stroke='white' stroke-width='3'/><circle cx='23' cy='21' r='3' fill='none' stroke='black' stroke-width='1.3'/>"
    : `<text x='19.5' y='26' font-family='Arial' font-weight='bold' font-size='13' fill='black' stroke='white' stroke-width='2.5' paint-order='stroke'>${sfx === "-" ? "−" : sfx}</text>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'>${nib}${mark}</svg>`)}") 2 2, crosshair`;
}
/** 곡률 펜 — 점 사이를 부드럽게 (이웃 점으로 손잡이를 정한다) */
export function smoothPts(pts: { x: number; y: number }[], closed: boolean): PenPt[] {
  const n = pts.length;
  return pts.map((q, i) => {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    return { x: q.x, y: q.y, hx: (b.x - a.x) / 6, hy: (b.y - a.y) / 6 };
  });
}
/** 패스의 선분 위 가장 가까운 곳 (화면 픽셀 d 안이면) — 점을 더할 자리 */
function segAt(pts: PenPt[], p: { x: number; y: number }, z: number, closed: boolean, d = 6) {
  let best: { i: number; t: number; dist: number } | null = null;
  const n = pts.length, last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    for (let k = 1; k < 40; k++) {
      const t = k / 40, u = 1 - t;
      const x = u * u * u * a.x + 3 * u * u * t * (a.x + a.hx) + 3 * u * t * t * (b.x - b.hx) + t * t * t * b.x;
      const y = u * u * u * a.y + 3 * u * u * t * (a.y + a.hy) + 3 * u * t * t * (b.y - b.hy) + t * t * t * b.y;
      const dist = Math.hypot((x - p.x) * z, (y - p.y) * z);
      if (dist < d && (!best || dist < best.dist)) best = { i, t, dist };
    }
  }
  return best;
}
/** 선분을 t 에서 나눠 점 하나 더하기 (모양은 거의 그대로) */
function splitAt(pts: PenPt[], i: number, t: number): PenPt[] {
  const n = pts.length, a = pts[i], b = pts[(i + 1) % n];
  const L = (p: number[], q: number[]) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const P0 = [a.x, a.y], P1 = [a.x + a.hx, a.y + a.hy], P2 = [b.x - b.hx, b.y - b.hy], P3 = [b.x, b.y];
  const P01 = L(P0, P1), P12 = L(P1, P2), P23 = L(P2, P3), P012 = L(P01, P12), P123 = L(P12, P23), M = L(P012, P123);
  const m: PenPt = { x: M[0], y: M[1], hx: ((P123[0] - M[0]) + (M[0] - P012[0])) / 2, hy: ((P123[1] - M[1]) + (M[1] - P012[1])) / 2 };
  const out = pts.slice();
  out[i] = { ...a, hx: (a.hx || a.hy) ? P01[0] - a.x : 0, hy: (a.hx || a.hy) ? P01[1] - a.y : 0 };
  out.splice(i + 1, 0, m);
  return out;
}
/** 끌어서 그리는 중 (선택 윤곽 · 올가미 · 도형 · 자르기 상자) */
type Aux = { kind: "sel" | "lasso" | "shape" | "crop" | "tbox"; p0: { x: number; y: number }; p1: { x: number; y: number }; pts: { x: number; y: number }[]; mode: SelMode; ch?: string; c0?: Box; shift?: boolean };
const norm = (a: { x: number; y: number }, b: { x: number; y: number }, square = false): Box => {
  let w = b.x - a.x, h = b.y - a.y;
  if (square) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
  return { x: Math.min(a.x, a.x + w), y: Math.min(a.y, a.y + h), w: Math.abs(w), h: Math.abs(h) };
};
/** 색칠 도구 설정 (옵션줄) */
export type PaintOpts = { fg: string; bg: string; size: number; hardness: number; opacity: number; tol: number; grad: "linear" | "radial"; gradTo: "bg" | "clear";
  /** 페인트 통 (포토샵 옵션줄) — 모드 · 앤티 앨리어스 · 인접 · 모든 레이어 */
  fillMode?: GlobalCompositeOperation; aa?: boolean; contig?: boolean; allLayers?: boolean };
type Paint = { l: PLayer; kind: Tool; orig: HTMLCanvasElement; stroke: HTMLCanvasElement; tmp?: HTMLCanvasElement; lx: number; ly: number; x0: number; y0: number;
  src?: HTMLCanvasElement; off?: { dx: number; dy: number }; content?: HTMLCanvasElement }; // 복제 도장 · 스팟 복구
const RW = 20; // 눈금자 두께
/** 이동 도구 마우스 — 포토샵처럼 화살표 오른쪽 아래에 작은 십자 화살표 */
const MOVE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><path d='M1.5 1.5v15l3.6-3.5 2.6 6 2.2-1-2.6-5.9h5z' fill='black' stroke='white' stroke-width='1.2' stroke-linejoin='round'/><path d='M18 12.5v10M13 17.5h10M16.4 14.1L18 12.5l1.6 1.6M16.4 20.9L18 22.5l1.6-1.6M14.6 15.9L13 17.5l1.6 1.6M21.4 15.9L23 17.5l-1.6 1.6' fill='none' stroke='white' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/><path d='M18 12.5v10M13 17.5h10M16.4 14.1L18 12.5l1.6 1.6M16.4 20.9L18 22.5l1.6-1.6M14.6 15.9L13 17.5l1.6 1.6M21.4 15.9L23 17.5l-1.6 1.6' fill='none' stroke='black' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/></svg>") 2 2, default`;
const ROT_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M5 12a7 7 0 1 1 3 5.7' fill='none' stroke='white' stroke-width='4'/><path d='M5 12a7 7 0 1 1 3 5.7' fill='none' stroke='black' stroke-width='1.6'/><path d='M2 9l3 4 3-4' fill='black' stroke='white'/></svg>") 12 12, alias`;
/** 눈금 간격 — 화면에서 60px 쯤 되게 1·2·5 단위로 */
const tickStep = (z: number) => {
  const raw = 60 / z;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= raw) || 10 * p;
};

export function Stage({ doc, tick, view, setView, sel, onSel, onMove, onResize, onRotate, onEditText, editing, onEditDone, onEditLive, onDropFiles, fitKey, tool = "move", onTextAt, onTextBox,
  rulers = true, grid = 0, guidesOn = true, guideList = [], onGuides, paint, onPaintTarget, onPaintEnd, onPickColor, proof = false, onDropOut,
  onSay, onPen, onPathEdit, onMoveSel, onSelMenu, selAll = [], onAddSel, onMoveMany, autoSel = true, autoGroup = false, onLayerMenu, selMask = null, selMode = "new", onSelect, onDeselect, crop = null, onCrop, onCropApply, onShape }: {
  /** 선택 영역 (문서 크기 그림) · 옵션줄의 선택 방식 · 새 선택 · 선택 해제 */
  selMask?: HTMLCanvasElement | null;
  selMode?: SelMode;
  onSelect?: (s: SelShape, mode: SelMode) => void;
  onDeselect?: () => void;
  /** 자르기 상자 (자르기 도구) · 바꾸기 · 적용 (두 번 누르기) */
  crop?: Box | null;
  onCrop?: (b: Box) => void;
  onCropApply?: () => void;
  /** 도형 도구로 끌어 그림 (선: dir 1 = ↘, -1 = ↗) */
  onShape?: (kind: "rect" | "ellipse" | "line", box: Box, dir: 1 | -1) => void;
  /** 펜으로 닫은 모양 */
  onPen?: (pts: PenPt[]) => void;
  /** 고른 패스 모양 레이어의 점을 고침 (기준점 추가·삭제·변환 · 펜 자동 추가/삭제) */
  onPathEdit?: (k: string, pts: PenPt[]) => void;
  /** 선택 영역이 있을 때 이동 도구로 끌기 — 그 레이어의 선택한 부분만 옮긴다 */
  onMoveSel?: (k: string, dx: number, dy: number, copy?: boolean) => void;
  /** 선택 영역이 있을 때 오른쪽 클릭 — AI 에게 시키기 메뉴 (2026-10-30 사장님) */
  onSelMenu?: (x: number, y: number) => void;
  /** 레이어를 끌어 손을 뗀 곳 — 다른 문서 창이면 그쪽으로 복사하고 true (이 문서에서는 안 옮김) */
  onDropOut?: (k: string, cx: number, cy: number, gx: number, gy: number) => boolean;
  /** 인쇄 색 미리보기 (CMYK 문서) — 움직이는 동안은 쉰다 */
  proof?: boolean;
  /** 눈금자 보이기 */
  rulers?: boolean;
  /** 격자 간격 (0 = 숨김) */
  grid?: number;
  /** 안내선 보이기 · 안내선들 · 바꾸기 */
  guidesOn?: boolean;
  guideList?: PsdGuide[];
  onGuides?: (g: PsdGuide[]) => void;
  /** 색칠 도구 설정 · 칠할 레이어 받기(없으면 새로 만들어 줌) · 다 칠함 · 스포이드 */
  paint?: PaintOpts;
  onPaintTarget?: (kind: Tool) => PLayer | null;
  onPaintEnd?: (l: PLayer) => void;
  onPickColor?: (hex: string, toBg?: boolean) => void;
  /** 함께 고른 레이어들 (sel 포함) · 더하기/빼기 · 함께 옮김 (다 옮긴 뒤 한 번) */
  selAll?: string[];
  onAddSel?: (k: string) => void;
  onMoveMany?: (keys: string[], dx: number, dy: number) => void;
  /** 이동 도구 [자동 선택] — 누른 곳의 레이어를 고른다 (Ctrl 을 누르면 반대로). autoGroup = 맨 바깥 그룹을 고른다 */
  autoSel?: boolean;
  autoGroup?: boolean;
  /** 오른쪽 클릭 — 그 자리에 겹친 레이어들 (위부터) */
  onLayerMenu?: (cx: number, cy: number, keys: string[]) => void;
  /** 짧은 알림 (복제 도장 원본을 안 찍었을 때 등) */
  onSay?: (t: string) => void;
  /** 왼쪽 도구창에서 고른 도구 (포토샵처럼) */
  tool?: Tool;
  /** 문자 도구로 빈 곳을 눌렀을 때 — 그 자리에 새 글자 */
  onTextAt?: (x: number, y: number) => void;
  /** 문자 도구로 끌어 만든 단락 글자 칸 */
  onTextBox?: (b: Box, inShape?: string) => void;
  doc: Doc;
  tick: number;
  view: View | null;
  setView: (v: View) => void;
  sel: string | null;
  onSel: (k: string | null) => void;
  onMove: (k: string, dx: number, dy: number) => void;
  onResize: (k: string, box: Box) => void;
  /** 모서리 바깥을 끌어 돌림 (자유 변형 회전) */
  onRotate?: (k: string, deg: number) => void;
  onEditText: (k: string) => void;
  editing: string | null;
  onEditDone: (k: string, text: string | null) => void;
  /** 고치는 동안 치는 대로 — 글자 레이어를 바로 다시 그린다 (모양 그대로 보이게) */
  onEditLive?: (k: string, text: string) => void;
  onDropFiles: (files: File[]) => void;
  /** 바뀌면 화면에 맞추기 */
  fitKey: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const pcv = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [space, setSpace] = useState(false);
  const W = doc.psd.width, H = doc.psd.height;
  const paintRef = useRef<Paint | null>(null);
  const [gradLine, setGradLine] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const brushRing = useRef<HTMLDivElement>(null);
  const auxRef = useRef<Aux | null>(null);
  const stampSrc = useRef<{ x: number; y: number } | null>(null); // 복제 도장 — Alt+누른 곳
  const stampOff = useRef<{ dx: number; dy: number } | null>(null); // 정렬: 첫 붓질 때 정한 거리를 계속
  const [draft, setDraft] = useState<Aux | null>(null);
  const [poly, setPoly] = useState<{ x: number; y: number }[] | null>(null); // 다각형 올가미 점들
  const [pen, setPen] = useState<PenPt[] | null>(null); // 펜 점들
  const penDrag = useRef<number>(-1); // 지금 손잡이를 끄는 점
  const [penSfx, setPenSfx] = useState(""); // 펜 커서 옆 표시
  const convRef = useRef<{ i: number; live: boolean; k?: string; pts: PenPt[] } | null>(null); // 기준점 변환 — 끌어서 손잡이
  const freeRef = useRef<{ x: number; y: number }[] | null>(null); // 자유 형태 펜 — 그린 자취
  const curveRaw = useRef<{ x: number; y: number }[]>([]); // 곡률 펜 — 찍은 점 (손잡이는 계산)
  const polyMode = useRef<SelMode>("new");
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const antsCv = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0); // 선택 윤곽 개미 행렬 움직이기
  // 안내선 끌기 (눈금자에서 새로 · 있는 것 옮기기) — i = -1 이면 새 안내선
  const [gd, setGd] = useState<{ i: number; dir: "horizontal" | "vertical"; pos: number } | null>(null);
  const [hoverG, setHoverG] = useState<"" | "horizontal" | "vertical">("");
  const [hoverRot, setHoverRot] = useState(false); // 고른 레이어 모서리 바깥 — 끌면 돌리기
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 화면에 맞추기 */
  const fit = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const z = Math.max(0.01, Math.min(4, (r.width - 80) / W, (r.height - 80) / H));
    setView({ z, x: Math.round((r.width - W * z) / 2), y: Math.round((r.height - H * z) / 2) });
  }, [W, H, setView]);
  useLayoutEffect(() => {
    if (!view) fit();
  }, [view, fit]);
  useEffect(() => {
    if (fitKey) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  /* 그리기 */
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    if (c.width !== W) c.width = W;
    if (c.height !== H) c.height = H;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, W, H);
    const d = drag;
    // 마스크에 칠하는 중 — 진짜 레이어 그림을 다시 만들어 보여 준다
    const pm = d?.mode === "paint" ? paintRef.current : null;
    const maskReal = pm?.l._maskOf ? findLayer(kids(doc.psd), pm.l._maskOf) : null;
    if (maskReal) { forgetImage(maskReal.canvas); forgetMask(pm!.l.canvas); }
    if (d && d.mode !== "pan" && d.below && !maskReal) {
      g.drawImage(d.below, 0, 0);
      const l = findLayer(kids(doc.psd), d.k);
      if (l && d.mode === "paint") forgetImage(l.canvas);
      if (l && !l.hidden) {
        const lay = (img: { c: HTMLCanvasElement; x: number; y: number }, b0: Box) => {
          const sx = d.box.w / b0.w, sy = d.box.h / b0.h;
          g.globalAlpha = l.opacity ?? 1;
          if (d.mode === "rot") {
            // 돌리는 중 — 가운데를 기준으로
            const cx = b0.x + b0.w / 2, cy = b0.y + b0.h / 2;
            g.save();
            g.translate(cx, cy);
            g.rotate(((d.deg || 0) * Math.PI) / 180);
            g.drawImage(img.c, img.x - cx, img.y - cy);
            g.restore();
          } else g.drawImage(img.c, d.box.x + (img.x - b0.x) * sx, d.box.y + (img.y - b0.y) * sy, img.c.width * sx, img.c.height * sy);
          g.globalAlpha = 1;
        };
        if (d.piece) {
          g.globalAlpha = l.opacity ?? 1;
          g.drawImage(d.piece.c, d.piece.x + (d.box.x - d.b0.x), d.piece.y + (d.box.y - d.b0.y));
          g.globalAlpha = 1;
        } else if (l.children) {
          const gc = mk(W, H);
          drawList(gc.getContext("2d")!, kids(l), W, H);
          lay({ c: gc, x: 0, y: 0 }, d.b0);
        } else {
          const img = layerImage(l);
          if (img) lay(img, d.b0);
        }
      }
      if (d.above) g.drawImage(d.above, 0, 0);
    } else {
      g.drawImage(composite(doc), 0, 0);
    }
    // 인쇄 색 미리보기 — 화면 크기만큼 줄인 그림을 인쇄 색으로 (가볍게)
    const pc = pcv.current;
    if (pc) {
      if (proof && !d && view) {
        const dpr = window.devicePixelRatio || 1;
        const p = proofCanvas(c, Math.min(2600, Math.max(W, H) * view.z * dpr));
        pc.width = p.width; pc.height = p.height;
        pc.getContext("2d")!.drawImage(p, 0, 0);
        pc.style.display = "block";
      } else pc.style.display = "none";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, tick, drag, W, H, editing, proof, view?.z]);

  /* 눈금자 · 격자 · 안내선 그리기 */
  const [theme] = useStudioTheme(false, "photo"); // 밝은/어두운 화면이 바뀌면 눈금자를 다시 그린다
  const rx = useRef<HTMLCanvasElement>(null), ry = useRef<HTMLCanvasElement>(null), ov = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!view || !size.w) return;
    const dpr = window.devicePixelRatio || 1;
    const z = view.z;
    const step = tickStep(z);
    const minor = step / (String(step)[0] === "2" ? 4 : 5);
    const ruler = (c: HTMLCanvasElement | null, horiz: boolean) => {
      if (!c) return;
      const len = horiz ? size.w : size.h;
      c.width = (horiz ? len : RW) * dpr;
      c.height = (horiz ? RW : len) * dpr;
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);
      const cv = (k: string, d: string) => getComputedStyle(document.documentElement).getPropertyValue(`--st-${k}`).trim() || d;
      g.fillStyle = cv("psBar", "#2b2b2b");
      g.fillRect(0, 0, horiz ? len : RW, horiz ? RW : len);
      g.strokeStyle = cv("psRulerTick", "#8a8a8a");
      g.fillStyle = cv("psRulerText", "#bdbdbd");
      g.font = "10px 'Malgun Gothic', sans-serif";
      g.lineWidth = 1;
      const o = horiz ? view.x : view.y;
      const u0 = Math.floor(-o / z / minor) * minor, u1 = (len - o) / z;
      g.beginPath();
      for (let u = u0; u <= u1; u += minor) {
        const s0 = Math.round(o + u * z) + 0.5;
        const major = Math.abs(u / step - Math.round(u / step)) < 1e-6;
        const tl = major ? RW : RW * 0.3;
        if (horiz) { g.moveTo(s0, RW); g.lineTo(s0, RW - tl); } else { g.moveTo(RW, s0); g.lineTo(RW - tl, s0); }
        if (major) {
          const t = String(Math.round(u));
          if (horiz) g.fillText(t, s0 + 3, 10);
          else {
            g.save();
            g.translate(10, s0 + 3);
            g.rotate(-Math.PI / 2);
            g.textAlign = "right";
            g.fillText(t, 0, 0);
            g.restore();
          }
        }
      }
      g.stroke();
      g.strokeStyle = cv("psBarLine", "#1f1f1f");
      g.beginPath();
      if (horiz) { g.moveTo(0, RW - 0.5); g.lineTo(len, RW - 0.5); } else { g.moveTo(RW - 0.5, 0); g.lineTo(RW - 0.5, len); }
      g.stroke();
    };
    if (rulers) { ruler(rx.current, true); ruler(ry.current, false); }
    const c = ov.current;
    if (!c) return;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, size.w, size.h);
    if (grid > 0) {
      // 격자 — 문서 안에만. 굵은 줄 = 간격, 가는 줄 = 4칸
      g.save();
      g.beginPath();
      g.rect(view.x, view.y, W * z, H * z);
      g.clip();
      const line = (gap: number, color: string) => {
        if (gap * z < 5) return;
        g.strokeStyle = color;
        g.beginPath();
        for (let x = 0; x <= W; x += gap) { const sx = Math.round(view.x + x * z) + 0.5; g.moveTo(sx, view.y); g.lineTo(sx, view.y + H * z); }
        for (let y = 0; y <= H; y += gap) { const sy = Math.round(view.y + y * z) + 0.5; g.moveTo(view.x, sy); g.lineTo(view.x + W * z, sy); }
        g.stroke();
      };
      line(grid / 4, "rgba(128,128,128,0.22)");
      line(grid, "rgba(110,110,110,0.55)");
      g.restore();
    }
    if (guidesOn || gd) {
      g.strokeStyle = "#00d8ff";
      g.beginPath();
      const one = (dir: string, pos: number) => {
        if (dir === "horizontal") { const sy = Math.round(view.y + pos * z) + 0.5; g.moveTo(0, sy); g.lineTo(size.w, sy); }
        else { const sx = Math.round(view.x + pos * z) + 0.5; g.moveTo(sx, 0); g.lineTo(sx, size.h); }
      };
      if (guidesOn) guideList.forEach((x, i) => { if (!gd || gd.i !== i) one(x.direction, x.location); });
      if (gd) one(gd.dir, gd.pos);
      g.stroke();
    }
  }, [view, size, rulers, grid, guidesOn, guideList, gd, W, H, theme]);

  /* 선택 영역 윤곽 (개미 행렬) — 화면 픽셀마다 안·밖이 바뀌는 곳에 흑백 점선 */
  useEffect(() => {
    if (!selMask) return;
    const t = setInterval(() => setPhase((x) => (x + 1) % 8), 260);
    return () => clearInterval(t);
  }, [selMask]);
  useEffect(() => {
    const c = antsCv.current;
    if (!c || !view || !size.w) return;
    c.width = size.w;
    c.height = size.h;
    if (!selMask || selMask.width !== W || selMask.height !== H) return;
    const g = c.getContext("2d")!;
    const a = alphaOf(selMask);
    const z = view.z;
    const at = (sx: number, sy: number) => {
      const dx = Math.floor((sx + 0.5 - view.x) / z), dy = Math.floor((sy + 0.5 - view.y) / z);
      return dx >= 0 && dy >= 0 && dx < W && dy < H && a[dy * W + dx] > 127;
    };
    const x0 = Math.max(0, Math.floor(view.x) - 1), x1 = Math.min(size.w - 1, Math.ceil(view.x + W * z) + 1);
    const y0 = Math.max(0, Math.floor(view.y) - 1), y1 = Math.min(size.h - 1, Math.ceil(view.y + H * z) + 1);
    if (x1 <= x0 || y1 <= y0) return;
    const img = g.createImageData(size.w, size.h);
    const d = img.data;
    let prevRow: boolean[] = [];
    for (let sy = y0; sy <= y1; sy++) {
      const row: boolean[] = [];
      for (let sx = x0; sx <= x1; sx++) row.push(at(sx, sy));
      for (let i = 0; i < row.length; i++) {
        const v = row[i];
        const edge = (i > 0 && row[i - 1] !== v) || (sy > y0 && prevRow[i] !== v);
        if (!edge) continue;
        const sx = x0 + i;
        const k = (sy * size.w + sx) * 4;
        const on = ((sx + sy + phase) >> 2) & 1 ? 255 : 0;
        d[k] = d[k + 1] = d[k + 2] = on;
        d[k + 3] = 255;
      }
      prevRow = row;
    }
    g.putImageData(img, 0, 0);
  }, [selMask, view, size, phase, W, H]);
  // 도구를 바꾸면 그리던 다각형은 버린다
  useEffect(() => { setPoly(null); setHover(null); setPen(null); curveRaw.current = []; }, [tool]);
  // 다각형 올가미 Enter = 닫기 · Esc = 버리기, 자르기 Enter = 적용
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      if (pen && (e.key === "Enter" || e.key === "Escape")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === "Enter" && pen.length >= 3) onPen?.(tool === "curvePen" ? smoothPts(curveRaw.current, true) : pen);
        setPen(null);
        curveRaw.current = [];
        return;
      }
      if (poly && (e.key === "Enter" || e.key === "Escape")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === "Enter" && poly.length >= 3) onSelect?.({ kind: "poly", pts: poly }, polyMode.current);
        setPoly(null);
      }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, [poly, pen, onSelect, onPen, tool]);

  /** 고른 레이어가 펜으로 그린 모양이면 그 점들 (문서 좌표) */
  const selPath = (): { k: string; pts: PenPt[] } | null => {
    const l = sel ? findLayer(kids(doc.psd), sel) : null;
    const sh = l?._shape;
    if (!l || !sh || sh.kind !== "path" || !sh.pts || sh.rot) return null;
    const x = l.left || 0, y = l.top || 0;
    return { k: l._k!, pts: sh.pts.map((q) => ({ x: x + q.x * sh.w, y: y + q.y * sh.h, hx: q.hx * sh.w, hy: q.hy * sh.h })) };
  };
  /** 펜 도구들 — 지금 그리는 패스(pen) 또는 고른 패스 모양을 대상으로 */
  const penTarget = () => (pen && pen.length ? { live: true as const, k: "", pts: pen } : (() => { const sp = selPath(); return sp ? { live: false as const, k: sp.k, pts: sp.pts } : null; })());
  const penHit = (p: { x: number; y: number }) => {
    const t = penTarget();
    const z = view?.z || 1;
    if (!t) return { t, a: -1, sg: null as ReturnType<typeof segAt> };
    const a = t.pts.findIndex((q) => Math.hypot((q.x - p.x) * z, (q.y - p.y) * z) < 7);
    return { t, a, sg: a < 0 ? segAt(t.pts, p, z, !t.live) : null };
  };
  /** 커서 옆 표시 — 포토샵 원칙 (* 새 패스 시작 · o 첫 점에서 닫기 · + 선 위에서 점 더하기 · − 점 위에서 빼기 · ^ 변환) */
  const penSuffix = (p: { x: number; y: number }) => {
    const z = view?.z || 1;
    if (tool === "addAnchor") return "+";
    if (tool === "delAnchor") return "-";
    if (tool === "convAnchor") return "";
    if (tool === "freePen") return pen ? "" : "*";
    if (pen && pen.length >= 3 && Math.hypot((pen[0].x - p.x) * z, (pen[0].y - p.y) * z) < 9) return "o";
    if (pen) return "";
    if (tool === "pen") { const h = penHit(p); if (h.a >= 0) return "-"; if (h.sg) return "+"; }
    return "*";
  };
  /* 안내선 끌기 — 눈금자에서 끌어내면 새로, 있는 안내선을 끌면 옮기기, 눈금자로 되돌리면 지우기 */
  const gdRef = useRef<{ i: number; dir: "horizontal" | "vertical"; pos: number } | null>(null);
  const startGuide = (i: number, dir: "horizontal" | "vertical", e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const at = (cx: number, cy: number) => { const p = toDoc(cx, cy); return dir === "horizontal" ? p.y : p.x; };
    gdRef.current = { i, dir, pos: at(e.clientX, e.clientY) };
    setGd(gdRef.current);
    const mv = (ev: PointerEvent) => {
      let pos = at(ev.clientX, ev.clientY);
      if (!ev.shiftKey) pos = Math.round(pos);
      gdRef.current = { i, dir, pos };
      setGd(gdRef.current);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      const cur = gdRef.current;
      gdRef.current = null;
      setGd(null);
      if (!cur) return;
      const r = wrap.current!.getBoundingClientRect();
      const onRuler = rulers && (dir === "horizontal" ? ev.clientY - r.top < RW : ev.clientX - r.left < RW);
      const out = cur.pos < 0 || cur.pos > (dir === "horizontal" ? H : W);
      const next = guideList.filter((_, j) => j !== i);
      if (!onRuler && !out) next.push({ location: Math.round(cur.pos * 100) / 100, direction: dir });
      if (i >= 0 || next.length !== guideList.length) onGuides?.(next);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const guideAt = (cx: number, cy: number) => {
    if (!view || !guidesOn) return -1;
    const r = wrap.current!.getBoundingClientRect();
    const mx = cx - r.left, my = cy - r.top;
    return guideList.findIndex((x) => Math.abs((x.direction === "horizontal" ? view.y + x.location * view.z - my : view.x + x.location * view.z - mx)) <= 4);
  };

  /** 고른 레이어 모서리 바로 바깥 (화면 6~30px) 인가 — 포토샵 자유 변형처럼 거기를 끌면 돌린다 */
  const rotZone = (cx: number, cy: number) => {
    if (tool !== "move" || !sel || !view) return false;
    const l = findLayer(kids(doc.psd), sel);
    const b = l && !l.children && !l.protected?.position ? boundsOf(l) : null;
    if (!b) return false;
    const r = wrap.current!.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    const x0 = view.x + b.x * view.z, y0 = view.y + b.y * view.z, x1 = x0 + b.w * view.z, y1 = y0 + b.h * view.z;
    const inside = x >= x0 - 6 && x <= x1 + 6 && y >= y0 - 6 && y <= y1 + 6;
    if (inside) return false;
    return [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].some(([px, py]) => Math.hypot(x - px, y - py) <= 30);
  };
  /* 화면 ↔ 문서 좌표 */
  const toDoc = (cx: number, cy: number) => {
    const r = wrap.current!.getBoundingClientRect();
    const v = view!;
    return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
  };

  /* 옮기는 동안의 [아래 · 위] 그림 — 맨 위 목록에 있으면 정확히, 그룹 안이면 그 레이어만 빼고 */
  const split = (k: string): { below: HTMLCanvasElement; above: HTMLCanvasElement | null } => {
    const top = kids(doc.psd);
    const i = top.findIndex((x) => x._k === k);
    const clipNext = i >= 0 && top[i + 1]?.clipping;
    if (i >= 0 && !top[i].clipping && !clipNext) {
      const below = mk(W, H), above = mk(W, H);
      drawList(below.getContext("2d")!, top.slice(0, i), W, H);
      drawList(above.getContext("2d")!, top.slice(i + 1), W, H);
      return { below, above };
    }
    return { below: composite(doc, k), above: null };
  };

  /* 맞춤선 (캔버스 가장자리·가운데, 다른 레이어 가장자리·가운데) */
  const snapTargets = useRef<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });
  const collectSnap = (k: string) => {
    const xs = [0, W / 2, W], ys = [0, H / 2, H];
    const add = (list: PLayer[]) => {
      for (const l of list) {
        if (l._k === k || l.hidden) continue;
        if (l.children) { add(kids(l)); continue; }
        const b = boundsOf(l);
        if (!b || (b.w >= W && b.h >= H)) continue;
        xs.push(b.x, b.x + b.w / 2, b.x + b.w);
        ys.push(b.y, b.y + b.h / 2, b.y + b.h);
      }
    };
    add(kids(doc.psd));
    if (guidesOn) for (const x of guideList) (x.direction === "horizontal" ? ys : xs).push(x.location);
    if (grid > 0 && W / grid < 400 && H / grid < 400) {
      for (let x = 0; x <= W; x += grid) xs.push(x);
      for (let y = 0; y <= H; y += grid) ys.push(y);
    }
    snapTargets.current = { xs, ys };
  };
  const snap1 = (vals: number[], targets: number[], th: number) => {
    let best: { d: number; t: number; off: number } | null = null;
    for (const v of vals) for (const t of targets) {
      const dd = Math.abs(v - t);
      if (dd <= th && (!best || dd < best.d)) best = { d: dd, t, off: t - v };
    }
    return best;
  };

  /** 브러시·지우개 한 번 — 붓질 그림에 점을 찍고, 원래 그림 + 붓질(불투명도)로 레이어를 다시 만든다 */
  const paintStroke = (lx: number, ly: number, first = false) => {
    const pr = paintRef.current;
    if (!pr || !paint) return;
    const sg = pr.stroke.getContext("2d")!;
    const size = paint.size;
    const onMask = Boolean(pr.l._maskOf);
    // 마스크: 브러시 = 전경색 회색, 지우개 = 배경색 회색 (포토샵처럼). 그림: 도장·복구·지우개는 붓 모양만
    const ink = onMask ? grayOf(pr.kind === "eraser" ? paint.bg : paint.fg) : pr.kind === "brush" ? paint.fg : "#000000";
    if (first) dabLine(sg, lx - 0.01, ly, lx, ly, size, paint.hardness, ink);
    else dabLine(sg, pr.lx, pr.ly, lx, ly, size, paint.hardness, ink);
    pr.lx = lx;
    pr.ly = ly;
    const g = pr.l.canvas!.getContext("2d")!;
    g.clearRect(0, 0, pr.orig.width, pr.orig.height);
    g.drawImage(pr.orig, 0, 0);
    let st = pr.stroke;
    if (selMask) {
      // 선택 영역 안에만 칠한다
      if (!pr.tmp) pr.tmp = mk(pr.stroke.width, pr.stroke.height);
      const tg = pr.tmp.getContext("2d")!;
      tg.clearRect(0, 0, pr.tmp.width, pr.tmp.height);
      tg.drawImage(pr.stroke, 0, 0);
      tg.globalCompositeOperation = "destination-in";
      tg.drawImage(selMask, -(pr.l.left || 0), -(pr.l.top || 0));
      tg.globalCompositeOperation = "source-over";
      st = pr.tmp;
    }
    if (pr.kind === "stamp" && pr.src && pr.off) {
      // 복제 도장 — 붓 모양 안에 떨어진 곳의 그림을
      if (!pr.content) pr.content = mk(pr.stroke.width, pr.stroke.height);
      const cg = pr.content.getContext("2d")!;
      cg.globalCompositeOperation = "source-over";
      cg.clearRect(0, 0, pr.content.width, pr.content.height);
      cg.drawImage(pr.src, -((pr.l.left || 0) + pr.off.dx), -((pr.l.top || 0) + pr.off.dy));
      cg.globalCompositeOperation = "destination-in";
      cg.drawImage(st, 0, 0);
      cg.globalCompositeOperation = "source-over";
      st = pr.content;
    }
    if (pr.kind === "heal") {
      // 스팟 복구 — 칠하는 동안은 어둡게 표시만, 손을 떼면 메운다
      g.globalAlpha = 0.45;
      g.drawImage(st, 0, 0);
      g.globalAlpha = 1;
      return;
    }
    g.globalAlpha = paint.opacity;
    g.globalCompositeOperation = pr.kind === "eraser" && !onMask ? "destination-out" : "source-over";
    g.drawImage(st, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  };
  const onDown = (e: React.PointerEvent) => {
    if (!view || editing) return;
    if (e.button === 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = toDoc(e.clientX, e.clientY);
    const handle = (e.target as HTMLElement).dataset?.h as Handle | undefined;
    if (tool === "zoom" && e.button === 0) {
      // 돋보기: 누르면 확대, Alt+누르면 축소 (누른 곳 기준)
      const r = wrap.current!.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const z = Math.max(0.02, Math.min(32, view.z * (e.altKey ? 1 / 1.5 : 1.5)));
      setView({ z, x: mx - ((mx - view.x) * z) / view.z, y: my - ((my - view.y) * z) / view.z });
      return;
    }
    if (PAINT_TOOLS.includes(tool) && e.button === 0 && paint && !space) {
      if (e.altKey && tool === "stamp") { stampSrc.current = p; stampOff.current = null; onSay?.("복제할 곳을 찍었어요 — 이제 칠하면 그곳이 복사돼요"); return; }
      if (e.altKey && tool !== "eraser" && tool !== "heal") { onPickColor?.(pickColor(doc, p.x, p.y)); return; } // 스포이드 (Alt)
      if (tool === "stamp" && !stampSrc.current) { onSay?.("Alt+누르기로 복제할 곳을 먼저 찍어 주세요"); return; }
      const l = onPaintTarget?.(tool);
      if (!l || !l.canvas) return;
      const lx = p.x - (l.left || 0), ly = p.y - (l.top || 0);
      if (tool === "bucket") {
        const lt = l.left || 0, tp = l.top || 0;
        if (selMask && selMask.width === W && !alphaOf(selMask)[Math.floor(p.y) * W + Math.floor(p.x)]) return; // 선택 영역 밖을 눌렀으면 그대로
        // 비슷한 색을 찾을 그림 — [모든 레이어] 면 보이는 그대로, 아니면 이 레이어
        let sample = l.canvas;
        if (paint.allLayers && !l._maskOf) {
          sample = mk(l.canvas.width, l.canvas.height);
          sample.getContext("2d")!.drawImage(composite(doc), -lt, -tp);
        }
        const filled = bucketFill(l.canvas, sample, lx, ly, {
          color: l._maskOf ? grayOf(paint.fg) : paint.fg, tol: paint.tol, contiguous: paint.contig !== false, aa: paint.aa !== false,
          opacity: paint.opacity, mode: l._maskOf ? "source-over" : paint.fillMode || "source-over",
        });
        l.canvas = selMask && selMask.width === W ? clipTo(l.canvas, filled, selMask, lt, tp) : filled;
        forgetImage(l.canvas);
        onPaintEnd?.(l);
        return;
      }
      const orig = copyCanvas(l.canvas);
      const stroke = mk(l.canvas.width, l.canvas.height);
      paintRef.current = { l, kind: tool, orig, stroke, lx, ly, x0: lx, y0: ly };
      if (tool === "stamp" || tool === "heal") paintRef.current.src = composite(doc); // 보이는 그대로에서 가져온다 (모든 레이어 샘플링)
      if (tool === "stamp") {
        if (!stampOff.current) stampOff.current = { dx: stampSrc.current!.x - p.x, dy: stampSrc.current!.y - p.y };
        paintRef.current.off = stampOff.current;
      }
      const s = split(l._k!);
      const b = boundsOf(l)!;
      const d: Drag = { k: l._k!, mode: "paint", sx: e.clientX, sy: e.clientY, b0: b, box: b, below: s.below, above: s.above, moved: true };
      dragRef.current = d;
      if (tool !== "gradient") paintStroke(lx, ly, true);
      setDrag({ ...d });
      return;
    }
    if (tool === "move" && e.button === 0 && !handle && !space && rotZone(e.clientX, e.clientY)) {
      const l = findLayer(kids(doc.psd), sel!)!;
      const b0 = boundsOf(l)!;
      const d: Drag = { k: sel!, mode: "rot", sx: e.clientX, sy: e.clientY, b0, box: { ...b0 }, moved: false, deg: 0 };
      dragRef.current = d;
      return;
    }
    if (tool === "move" && e.button === 0 && !handle) {
      const gi = guideAt(e.clientX, e.clientY);
      if (gi >= 0) { startGuide(gi, guideList[gi].direction, e); return; }
    }
    if (tool === "text" && e.button === 0) {
      // 누른 동작이 글 칸의 커서를 빼앗지 않게 — 기본 동작을 막고, 글 칸은 다음 차례에
      e.preventDefault();
      // 쓰는 중에 글 칸 밖을 누르면 — 지금 글을 끝내기만 (빈 글이면 레이어도 지워짐)
      if (editing) { ta.current?.blur(); return; }
      const hit = textHit(doc, p.x, p.y);
      const hb = hit && isText(hit) ? boundsOf(hit) : null;
      if (hit && hb) {
        // 글자를 끌면 옮기기, 그냥 누르면 고치기 (포토샵 문자 도구처럼)
        if (hit._k !== sel) onSel(hit._k!);
        if (hit.protected?.position) { setTimeout(() => onEditText(hit._k!), 0); return; }
        collectSnap(hit._k!);
        dragRef.current = { k: hit._k!, mode: "move", sx: e.clientX, sy: e.clientY, b0: hb, box: { ...hb }, moved: false, gx: p.x - hb.x, gy: p.y - hb.y, tap: true };
        return;
      }
      // 펜으로 그린 모양(또는 도형) 위를 누르면 — 그 모양 안에 글을 쓴다 (포토샵 모양 안 문자처럼)
      const sh = hitTest(doc, p.x, p.y);
      const shb = sh && sh._shape && (sh._shape.kind === "path" || sh._shape.kind === "ellipse" || !sh._shape.kind) ? boundsOf(sh) : null;
      if (sh && shb && shb.w > 30 && shb.h > 20) {
        const ins = sh._shape!.kind === "path" || sh._shape!.kind === "ellipse" ? 0.18 : 0.06;
        const b2 = { x: shb.x + shb.w * ins, y: shb.y + shb.h * ins, w: shb.w * (1 - ins * 2), h: shb.h * (1 - ins * 2) };
        setTimeout(() => onTextBox?.(b2, sh._k!), 0);
        return;
      }
      // 빈 곳 — 그냥 누르면 한 줄 글자, 끌면 단락 글자 칸 (포토샵처럼)
      auxRef.current = { kind: "tbox", p0: p, p1: p, pts: [], mode: "new" };
      setDraft({ ...auxRef.current });
      return;
    }
    if (e.button === 1 || space || tool === "hand") {
      const d: Drag = { k: "", mode: "pan", sx: e.clientX, sy: e.clientY, b0: { x: 0, y: 0, w: 1, h: 1 }, box: { x: 0, y: 0, w: 1, h: 1 }, v0: view, moved: false };
      dragRef.current = d;
      setDrag(d);
      return;
    }
    if (e.button === 0 && tool !== "move" && tool !== "text") {
      // 포토샵처럼: Shift = 선택 더하기, Alt = 빼기
      const mode: SelMode = e.shiftKey ? "add" : e.altKey ? "sub" : selMode;
      if (tool === "picker") { onPickColor?.(pickColor(doc, p.x, p.y), e.altKey); return; }
      if (tool === "wand") { onSelect?.({ kind: "wand", x: p.x, y: p.y }, mode); return; }
      if (tool === "freePen") {
        // 자유 형태 펜 — 누른 채 그리면 그대로 패스 (손을 떼면 닫힌 모양)
        freeRef.current = [p];
        setPen([{ x: p.x, y: p.y, hx: 0, hy: 0 }]);
        return;
      }
      if (tool === "addAnchor" || tool === "delAnchor" || tool === "convAnchor" || (tool === "pen" && !pen)) {
        const h = penHit(p);
        const apply = (pts: PenPt[]) => { if (!h.t) return; if (h.t.live) setPen(pts); else onPathEdit?.(h.t.k, pts); };
        if (h.t && (tool === "delAnchor" || (tool === "pen" && !h.t.live)) && h.a >= 0) {
          if (h.t.pts.length > 3) apply(h.t.pts.filter((_q, j) => j !== h.a));
          else onSay?.("점이 3개보다 적으면 모양이 될 수 없어요");
          return;
        }
        if (h.t && (tool === "addAnchor" || (tool === "pen" && !h.t.live)) && h.sg) { apply(splitAt(h.t.pts, h.sg.i, h.sg.t)); return; }
        if (tool === "convAnchor") {
          if (h.t && h.a >= 0) {
            const q = h.t.pts[h.a];
            // 손잡이가 있으면 누르기만 해도 모서리 점으로, 끌면 새 손잡이
            convRef.current = { i: h.a, live: h.t.live, k: h.t.k, pts: h.t.pts };
            if (q.hx || q.hy) apply(h.t.pts.map((x, j) => (j === h.a ? { ...x, hx: 0, hy: 0 } : x)));
          }
          return;
        }
        if (tool !== "pen") return;
      }
      if (tool === "curvePen") {
        // 곡률 펜 — 누르는 점마다 부드럽게 이어진다, 첫 점을 누르면 닫힘
        const raw = curveRaw.current;
        if (raw.length >= 3 && Math.hypot((raw[0].x - p.x) * view.z, (raw[0].y - p.y) * view.z) < 9) {
          onPen?.(smoothPts(raw, true));
          curveRaw.current = [];
          setPen(null);
          return;
        }
        curveRaw.current = [...raw, { x: p.x, y: p.y }];
        setPen(smoothPts(curveRaw.current, false));
        return;
      }
      if (tool === "pen") {
        // 누르면 점, 누른 채 끌면 곡선 손잡이, 첫 점을 누르면 닫힘
        const pts = pen || [];
        if (pts.length >= 3 && Math.hypot((pts[0].x - p.x) * view.z, (pts[0].y - p.y) * view.z) < 9) {
          onPen?.(pts);
          setPen(null);
          return;
        }
        const next = [...pts, { x: p.x, y: p.y, hx: 0, hy: 0 }];
        penDrag.current = next.length - 1;
        setPen(next);
        return;
      }
      if (tool === "polyLasso") {
        const pts = poly || [];
        if (pts.length >= 3 && Math.hypot((pts[0].x - p.x) * view.z, (pts[0].y - p.y) * view.z) < 9) {
          onSelect?.({ kind: "poly", pts }, polyMode.current);
          setPoly(null);
          return;
        }
        if (!pts.length) polyMode.current = mode;
        setPoly([...pts, p]);
        return;
      }
      if (tool === "crop") {
        const ch = (e.target as HTMLElement).dataset?.ch;
        const c = crop;
        const a: Aux = { kind: "crop", p0: p, p1: p, pts: [], mode };
        if (ch && c) { a.ch = ch; a.c0 = c; }
        else if (c && p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { a.ch = "move"; a.c0 = c; }
        else { a.ch = "new"; a.c0 = { x: p.x, y: p.y, w: 0, h: 0 }; }
        auxRef.current = a;
        return;
      }
      if (SEL_TOOLS.includes(tool) || SHAPE_TOOLS.includes(tool)) {
        auxRef.current = { kind: SHAPE_TOOLS.includes(tool) ? "shape" : tool === "lasso" ? "lasso" : "sel", p0: p, p1: p, pts: [p], mode, shift: e.shiftKey };
        setDraft({ ...auxRef.current });
        return;
      }
    }
    let k: string | null = null;
    // [자동 선택] 켜짐 = 누른 곳의 레이어, 꺼짐 = 고른 레이어 그대로. Ctrl+누르기 = 언제나 마우스 바로 아래 레이어 (2026-10-22 사장님)
    const ctrl = e.ctrlKey || e.metaKey;
    const under = () => {
      let h = hitTest(doc, p.x, p.y)?._k || null;
      if (h && autoGroup && !ctrl) {
        // 그룹 — 그 레이어를 담은 맨 바깥 묶음
        const top = kids(doc.psd).find((t) => t._k === h || (t.children && findLayer(kids(t), h!)));
        if (top) h = top._k!;
      }
      return h;
    };
    // Shift+Ctrl+누르기 (자동 선택이 켜져 있으면 Shift+누르기) = 레이어 더하기/빼기 (포토샵처럼)
    if (e.shiftKey && (ctrl || autoSel) && !handle) {
      const h = hitTest(doc, p.x, p.y)?._k;
      if (h) onAddSel?.(h);
      return;
    }
    if (handle && sel && selAll.length < 2) k = sel;
    else if (selMask && sel && onMoveSel && !ctrl) k = sel; // 선택 영역 + 이동 도구 = 고른 레이어의 그 부분을 옮긴다
    else if (ctrl) k = under() || sel;
    else if (!autoSel) k = sel;
    else {
      // 누른 곳에 그림이 있는 맨 위 레이어 — 없으면 (투명한 곳) 고른 레이어 상자 안이면 그 레이어를 옮긴다
      k = under();
      if (!k && sel) {
        const cur = findLayer(kids(doc.psd), sel);
        const cb = cur ? boundsOf(cur) : null;
        if (cur && cb && !cur.protected?.position && p.x >= cb.x && p.x <= cb.x + cb.w && p.y >= cb.y && p.y <= cb.y + cb.h) k = sel;
      }
      // 고른 그룹 안의 레이어를 눌렀으면 그룹 그대로
      if (k && sel && k !== sel) { const g = findLayer(kids(doc.psd), sel); if (g?.children && findLayer(kids(g), k)) k = sel; }
    }
    if (!k) {
      onSel(null);
      // 빈 곳을 끌면 화면 옮기기
      const d: Drag = { k: "", mode: "pan", sx: e.clientX, sy: e.clientY, b0: { x: 0, y: 0, w: 1, h: 1 }, box: { x: 0, y: 0, w: 1, h: 1 }, v0: view, moved: false };
      dragRef.current = d;
      setDrag(d);
      return;
    }
    if (selAll.length > 1 && selAll.includes(k)) {
      // 함께 고른 레이어 중 하나를 잡았으면 모두 같이 옮긴다 (그룹 안 레이어는 그룹이 옮긴다)
      const keys = withLinked(kids(doc.psd), selAll).filter((x) => {
        const l = findLayer(kids(doc.psd), x);
        return l && !l.protected?.position;
      });
      const d: Drag = { k, mode: "multi", sx: e.clientX, sy: e.clientY, b0: { x: 0, y: 0, w: 1, h: 1 }, box: { x: 0, y: 0, w: 1, h: 1 }, moved: false, keys, done: { x: 0, y: 0 } };
      dragRef.current = d;
      return;
    }
    if (k !== sel) onSel(k);
    // 연결된 레이어 — 하나를 잡아도 묶음이 같이 움직인다 (크기 손잡이는 그 레이어만, 포토샵처럼)
    if (!handle && !(selMask && onMoveSel && !ctrl)) {
      const lk = withLinked(kids(doc.psd), [k]).filter((x) => !findLayer(kids(doc.psd), x)?.protected?.position);
      if (lk.length > 1) {
        dragRef.current = { k, mode: "multi", sx: e.clientX, sy: e.clientY, b0: { x: 0, y: 0, w: 1, h: 1 }, box: { x: 0, y: 0, w: 1, h: 1 }, moved: false, keys: lk, done: { x: 0, y: 0 } };
        return;
      }
    }
    const l = findLayer(kids(doc.psd), k);
    const b0 = l ? boundsOf(l) : null;
    if (!l || !b0 || l.protected?.position) return;
    collectSnap(k);
    const d: Drag = { k, mode: handle || "move", sx: e.clientX, sy: e.clientY, b0, box: { ...b0 }, moved: false, gx: p.x - b0.x, gy: p.y - b0.y };
    dragRef.current = d;
  };
  const onMoveP = (e: React.PointerEvent) => {
    const d = dragRef.current;
    // 브러시 크기 원 (색칠 도구일 때)
    const ring = brushRing.current;
    if (ring && view && paint && (tool === "brush" || tool === "eraser" || tool === "stamp" || tool === "heal")) {
      const r = wrap.current!.getBoundingClientRect();
      const dia = Math.max(4, paint.size * view.z);
      ring.style.display = "block";
      ring.style.width = ring.style.height = `${dia}px`;
      ring.style.transform = `translate(${e.clientX - r.left - dia / 2}px, ${e.clientY - r.top - dia / 2}px)`;
    }
    if (!d && tool === "move") { const rz = rotZone(e.clientX, e.clientY); if (rz !== hoverRot) setHoverRot(rz); }
    if (!d && tool === "move" && guidesOn) {
      const gi = guideAt(e.clientX, e.clientY);
      const dir = gi >= 0 ? guideList[gi].direction : "";
      if (dir !== hoverG) setHoverG(dir);
    }
    const ax = auxRef.current;
    if (ax && view) {
      const p = toDoc(e.clientX, e.clientY);
      ax.p1 = p;
      if (ax.kind === "lasso") ax.pts.push(p);
      if (ax.kind === "crop" && ax.c0) {
        const c0 = ax.c0, dx = p.x - ax.p0.x, dy = p.y - ax.p0.y;
        let b: Box;
        if (ax.ch === "new") b = norm(ax.p0, p, e.shiftKey);
        else if (ax.ch === "move") b = { ...c0, x: c0.x + dx, y: c0.y + dy };
        else {
          let x0 = c0.x, y0 = c0.y, x1 = c0.x + c0.w, y1 = c0.y + c0.h;
          if (ax.ch!.includes("w")) x0 += dx;
          if (ax.ch!.includes("e")) x1 += dx;
          if (ax.ch!.includes("n")) y0 += dy;
          if (ax.ch!.includes("s")) y1 += dy;
          b = norm({ x: x0, y: y0 }, { x: x1, y: y1 });
        }
        onCrop?.({ x: Math.round(b.x), y: Math.round(b.y), w: Math.max(1, Math.round(b.w)), h: Math.max(1, Math.round(b.h)) });
        return;
      }
      ax.shift = e.shiftKey;
      setDraft({ ...ax });
      return;
    }
    if ((poly || pen) && view) setHover(toDoc(e.clientX, e.clientY));
    if (PEN_TOOLS.includes(tool) && view) {
      const p = toDoc(e.clientX, e.clientY);
      // 자유 형태 펜 — 자취 모으기
      if (tool === "freePen" && freeRef.current && e.buttons & 1) {
        const f = freeRef.current, l = f[f.length - 1];
        if (Math.hypot((p.x - l.x) * view.z, (p.y - l.y) * view.z) > 3) { f.push(p); setPen(f.map((q) => ({ x: q.x, y: q.y, hx: 0, hy: 0 }))); }
        return;
      }
      // 기준점 변환 — 끌어서 손잡이
      const cv = convRef.current;
      if (tool === "convAnchor" && cv && e.buttons & 1) {
        const q = cv.pts[cv.i];
        const pts = cv.pts.map((x, j) => (j === cv.i ? { ...x, hx: (p.x - q.x) / 3, hy: (p.y - q.y) / 3 } : x));
        if (cv.live) setPen(pts); else if (cv.k) onPathEdit?.(cv.k, pts);
        return;
      }
      const sfx = penSuffix(p);
      if (sfx !== penSfx) setPenSfx(sfx);
    }
    if (pen && penDrag.current >= 0 && view && e.buttons & 1) {
      const p = toDoc(e.clientX, e.clientY);
      const i = penDrag.current;
      setPen(pen.map((q, j) => (j === i ? { ...q, hx: (p.x - q.x) / 3, hy: (p.y - q.y) / 3 } : q)));
      return;
    }
    if (!d || !view) return;
    if (d.mode === "paint") {
      const pr = paintRef.current;
      if (!pr || !paint) return;
      const p = toDoc(e.clientX, e.clientY);
      const lx = p.x - (pr.l.left || 0), ly = p.y - (pr.l.top || 0);
      if (pr.kind === "gradient") {
        let x1 = lx, y1 = ly;
        if (e.shiftKey) {
          // 45° 단위로
          const a = Math.round(Math.atan2(y1 - pr.y0, x1 - pr.x0) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(x1 - pr.x0, y1 - pr.y0);
          x1 = pr.x0 + Math.cos(a) * len;
          y1 = pr.y0 + Math.sin(a) * len;
        }
        pr.lx = x1;
        pr.ly = y1;
        paintGradient(pr.l.canvas!, pr.x0, pr.y0, x1, y1, paint.grad, paint.fg, paint.gradTo === "bg" ? paint.bg : null, paint.opacity);
        if (selMask) keepInside(pr.l.canvas!, selMask, pr.l.left || 0, pr.l.top || 0);
        const ox = pr.l.left || 0, oy = pr.l.top || 0;
        setGradLine({ x0: pr.x0 + ox, y0: pr.y0 + oy, x1: x1 + ox, y1: y1 + oy });
      } else paintStroke(lx, ly);
      setDrag({ ...d });
      return;
    }
    const dxs = e.clientX - d.sx, dys = e.clientY - d.sy;
    if (!d.moved && Math.abs(dxs) + Math.abs(dys) < 3) return;
    if (d.mode === "multi") {
      // 그 자리에서 바로 옮겨 보여 주고, 손을 떼면 되돌리기 기록 한 번으로
      d.moved = true;
      const tx = Math.round(dxs / view.z), ty = Math.round((e.shiftKey ? (Math.abs(dxs) > Math.abs(dys) ? 0 : dys) : dys) / view.z);
      const fx = e.shiftKey && Math.abs(dxs) <= Math.abs(dys) ? 0 : tx;
      const ddx = fx - d.done!.x, ddy = ty - d.done!.y;
      if (ddx || ddy) {
        for (const key of d.keys || []) { const l = findLayer(kids(doc.psd), key); if (l) offsetLayer(l, ddx, ddy); }
        d.done = { x: fx, y: ty };
      }
      setDrag({ ...d });
      return;
    }
    if (d.mode === "rot") {
      if (!d.moved) { const s0 = split(d.k); d.below = s0.below; d.above = s0.above; d.moved = true; }
      const c = { x: view.x + (d.b0.x + d.b0.w / 2) * view.z, y: view.y + (d.b0.y + d.b0.h / 2) * view.z };
      const r = wrap.current!.getBoundingClientRect();
      const a0 = Math.atan2(d.sy - r.top - c.y, d.sx - r.left - c.x), a1 = Math.atan2(e.clientY - r.top - c.y, e.clientX - r.left - c.x);
      let deg = ((a1 - a0) * 180) / Math.PI;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15; // Shift = 15° 씩
      d.deg = Math.round(deg * 10) / 10;
      setDrag({ ...d });
      return;
    }
    if (!d.moved && d.mode !== "pan") {
      if (d.mode === "move" && e.altKey) d.copy = true; // 끌기 시작할 때 Alt = 복사
      // 처음 움직일 때 [아래 · 위] 그림을 만든다
      const s = split(d.k);
      d.below = s.below;
      d.above = s.above;
      // 선택 영역이 있고 그림 레이어면 — 선택한 부분만 들어 옮긴다 (남은 자리는 비움, 포토샵처럼)
      const l = d.mode === "move" && selMask && onMoveSel ? findLayer(kids(doc.psd), d.k) : null;
      if (l && l.canvas && !l.children && !isText(l) && !l._shape && !l._picto && !l.protected?.position) {
        const ex = extract(l.canvas, l.left || 0, l.top || 0, selMask);
        if (ex) {
          // Alt = 복사 — 원래 자리를 비우지 않는다
          const hole = d.copy ? l.canvas : clearInside(l.canvas, selMask!, l.left || 0, l.top || 0);
          const b2 = mk(W, H), bg = b2.getContext("2d")!;
          bg.drawImage(s.below, 0, 0);
          bg.globalAlpha = l.opacity ?? 1;
          bg.drawImage(hole, l.left || 0, l.top || 0);
          d.below = b2;
          d.piece = ex;
        }
      }
    }
    d.moved = true;
    if (d.mode === "pan") {
      setView({ ...d.v0!, x: d.v0!.x + dxs, y: d.v0!.y + dys });
      return;
    }
    const dx = dxs / view.z, dy = dys / view.z;
    const th = 6 / view.z;
    const b0 = d.b0;
    const gs: Guide[] = [];
    let box: Box;
    if (d.mode === "move") {
      box = { ...b0, x: b0.x + dx, y: b0.y + dy };
      if (!e.altKey) {
        const sx = snap1([box.x, box.x + box.w / 2, box.x + box.w], snapTargets.current.xs, th);
        const sy = snap1([box.y, box.y + box.h / 2, box.y + box.h], snapTargets.current.ys, th);
        if (sx) { box.x += sx.off; gs.push({ x: sx.t }); }
        if (sy) { box.y += sy.off; gs.push({ y: sy.t }); }
      }
      if (e.shiftKey) {
        // 한 방향으로만
        if (Math.abs(dx) > Math.abs(dy)) box.y = b0.y;
        else box.x = b0.x;
      }
    } else {
      const m = d.mode;
      let x0 = b0.x, y0 = b0.y, x1 = b0.x + b0.w, y1 = b0.y + b0.h;
      if (m.includes("w")) x0 += dx;
      if (m.includes("e")) x1 += dx;
      if (m.includes("n")) y0 += dy;
      if (m.includes("s")) y1 += dy;
      const corner = m.length === 2;
      // 모서리 = 비율 그대로, Shift+모서리 · 옆 손잡이 = 자유롭게 (포토샵처럼 — 글자도)
      const keep = corner && !e.shiftKey;
      if (keep) {
        // 비율 그대로 — 더 많이 움직인 쪽에 맞춘다
        const r = b0.w / b0.h;
        let w = Math.max(4, x1 - x0), h = Math.max(4, y1 - y0);
        if (m === "n" || m === "s") w = h * r;
        else if (m === "e" || m === "w") h = w / r;
        else if (w / r > h) h = w / r;
        else w = h * r;
        if (m.includes("w")) x0 = x1 - w; else if (!m.includes("e")) x0 = b0.x + (b0.w - w) / 2;
        if (m.includes("n")) y0 = y1 - h; else if (!m.includes("s")) y0 = b0.y + (b0.h - h) / 2;
        x1 = x0 + w;
        y1 = y0 + h;
      }
      box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(4, Math.abs(x1 - x0)), h: Math.max(4, Math.abs(y1 - y0)) };
    }
    d.box = box;
    setGuides(gs);
    setDrag({ ...d });
  };
  const onUp = (e?: React.PointerEvent) => {
    penDrag.current = -1;
    convRef.current = null;
    if (freeRef.current) {
      // 자유 형태 펜 — 자취를 덜어 내 부드러운 패스로
      const f = freeRef.current;
      freeRef.current = null;
      setPen(null);
      if (f.length >= 3) {
        const step = Math.max(1, Math.floor(f.length / 60));
        const pts = f.filter((_q, i) => i % step === 0);
        if (pts.length >= 3) onPen?.(smoothPts(pts, true));
      }
      return;
    }
    const ax = auxRef.current;
    if (ax) {
      auxRef.current = null;
      setDraft(null);
      const z = view?.z || 1;
      const tiny = Math.abs(ax.p1.x - ax.p0.x) * z < 3 && Math.abs(ax.p1.y - ax.p0.y) * z < 3;
      if (ax.kind === "sel") {
        if (tiny) { if (ax.mode === "new") onDeselect?.(); return; } // 그냥 누르면 선택 해제 (포토샵처럼)
        onSelect?.({ kind: tool === "ellipseSel" ? "ellipse" : "rect", box: norm(ax.p0, ax.p1, ax.shift && ax.mode === "new") }, ax.mode);
      } else if (ax.kind === "lasso") {
        if (ax.pts.length < 3 || tiny) { if (ax.mode === "new") onDeselect?.(); return; }
        onSelect?.({ kind: "poly", pts: ax.pts }, ax.mode);
      } else if (ax.kind === "tbox") {
        const at = ax.p0, b = norm(ax.p0, ax.p1);
        setTimeout(() => (tiny || b.w < 8 || b.h < 8 ? onTextAt?.(at.x, at.y) : onTextBox?.(b)), 0);
      } else if (ax.kind === "shape") {
        if (tiny) return;
        const kind = tool === "ellipseShape" ? "ellipse" : tool === "lineShape" ? "line" : "rect";
        const dir = (ax.p1.x - ax.p0.x) * (ax.p1.y - ax.p0.y) >= 0 ? 1 : -1;
        onShape?.(kind, norm(ax.p0, ax.p1, ax.shift && kind !== "line"), dir);
      }
      return;
    }
    const d = dragRef.current;
    dragRef.current = null;
    setGuides([]);
    if (d?.tap && !d.moved) { const k = d.k; setTimeout(() => onEditText(k), 0); setDrag(null); return; }
    if (d?.mode === "paint") {
      const pr = paintRef.current;
      paintRef.current = null;
      if (pr && pr.kind === "heal" && pr.src) {
        // 칠한 곳을 둘레 색으로 메워, 그 부분만 레이어에
        let mask = pr.stroke;
        if (selMask) { mask = copyCanvas(pr.stroke); keepInside(mask, selMask, pr.l.left || 0, pr.l.top || 0); }
        const base = mk(pr.stroke.width, pr.stroke.height);
        base.getContext("2d")!.drawImage(pr.src, -(pr.l.left || 0), -(pr.l.top || 0));
        const healed = inpaint(base, mask);
        const hg = healed.getContext("2d")!;
        hg.globalCompositeOperation = "destination-in";
        hg.drawImage(mask, 0, 0);
        const g = pr.l.canvas!.getContext("2d")!;
        g.clearRect(0, 0, pr.orig.width, pr.orig.height);
        g.drawImage(pr.orig, 0, 0);
        g.drawImage(healed, 0, 0);
      }
      setGradLine(null);
      setDrag(null);
      if (pr) onPaintEnd?.(pr.l);
      return;
    }
    if (d && d.mode === "rot") { if (d.moved && d.deg) onRotate?.(d.k, d.deg); setDrag(null); return; }
    if (d && d.mode === "multi") {
      if (d.moved && (d.done!.x || d.done!.y)) onMoveMany?.(d.keys || [], d.done!.x, d.done!.y);
      else if (!d.moved) onSel(d.k); // 그냥 눌렀으면 그 레이어 하나만
      setDrag(null);
      return;
    }
    if (d && d.moved && d.mode !== "pan") {
      if (d.mode === "move" && e && onDropOut?.(d.k, e.clientX, e.clientY, d.gx || 0, d.gy || 0)) { setDrag(null); return; }
      if (d.mode === "move" && d.piece) onMoveSel?.(d.k, Math.round(d.box.x - d.b0.x), Math.round(d.box.y - d.b0.y), d.copy);
      else if (d.mode === "move") onMove(d.k, Math.round(d.box.x - d.b0.x), Math.round(d.box.y - d.b0.y));
      else onResize(d.k, d.box);
    }
    setDrag(null);
  };
  const onDbl = (e: React.MouseEvent) => {
    if (!view) return;
    if (tool === "crop") { onCropApply?.(); return; }
    if (tool === "pen" || tool === "curvePen") {
      if (pen && pen.length >= 3) onPen?.(tool === "curvePen" ? smoothPts(curveRaw.current, true) : pen);
      setPen(null);
      curveRaw.current = [];
      return;
    }
    if (tool === "polyLasso") {
      if (poly && poly.length >= 3) onSelect?.({ kind: "poly", pts: poly }, polyMode.current);
      setPoly(null);
      return;
    }
    if (tool !== "move" && tool !== "text") return;
    const p = toDoc(e.clientX, e.clientY);
    const l = hitTest(doc, p.x, p.y);
    if (l && isText(l)) onEditText(l._k!);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!view) return;
    const r = wrap.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const z = Math.max(0.02, Math.min(32, view.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    setView({ z, x: mx - ((mx - view.x) * z) / view.z, y: my - ((my - view.y) * z) / view.z });
  };
  // 스페이스를 누르고 끌면 화면 옮기기 (포토샵과 같이)
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code === "Space" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) { setSpace(true); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpace(false); };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  /* 고른 레이어 테두리·손잡이 */
  const selL = sel ? findLayer(kids(doc.psd), sel) : null;
  const sb = drag && drag.mode !== "pan" && drag.moved && drag.k === sel ? drag.box : selL ? boundsOf(selL) : null;
  const v = view;
  const scr = (b: Box) => (v ? { left: v.x + b.x * v.z, top: v.y + b.y * v.z, width: b.w * v.z, height: b.h * v.z } : null);
  const sr = sb ? scr(sb) : null;
  // 선택 영역 + 그림 레이어 = 선택한 부분만 옮기는 상태 — 레이어 전체 상자(파란 테두리)는 감춘다 (포토샵처럼 개미 행렬만)
  const selPieceMode = (() => {
    if (!selMask || !onMoveSel || tool !== "move" || !sel) return false;
    const l = findLayer(kids(doc.psd), sel);
    return Boolean(l && l.canvas && !l.children && !isText(l) && !l._shape && !l._picto && !l.protected?.position);
  })();
  const many = selAll.length > 1;
  const canResize = selL && !many && !selL.children && !selL.protected?.position;
  // 함께 고른 레이어들 — 하나하나 얇은 테두리 + 모두를 담는 상자
  const manyBoxes = many ? selAll.map((x) => { const l = findLayer(kids(doc.psd), x); return l ? boundsOf(l) : null; }).filter((b): b is Box => Boolean(b)) : [];
  const handles: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const hpos = (h: Handle, r: { left: number; top: number; width: number; height: number }) => ({
    left: r.left + (h.includes("w") ? 0 : h.includes("e") ? r.width : r.width / 2) - 5,
    top: r.top + (h.includes("n") ? 0 : h.includes("s") ? r.height : r.height / 2) - 5,
  });
  const cursorOf = (h: Handle) => ({ nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" })[h];

  /* 글 고치기 칸 */
  const edL = editing ? findLayer(kids(doc.psd), editing) : null;
  const edB = edL ? boundsOf(edL) : null;
  const edLook = edL ? lookOf(edL) : null;
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing && ta.current) {
      ta.current.focus();
      ta.current.select();
    }
  }, [editing]);

  return (
    <div ref={wrap} onPointerDown={onDown} onPointerMove={onMoveP} onPointerUp={onUp} onPointerCancel={() => onUp()} onPointerLeave={() => { if (brushRing.current) brushRing.current.style.display = "none"; }} onDoubleClick={onDbl} onWheel={onWheel}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); const f = [...e.dataTransfer.files]; if (f.length) onDropFiles(f); }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (selMask && onSelMenu && !editing) { onSelMenu(e.clientX, e.clientY); return; } // 선택 영역 + 오른쪽 클릭 = AI 메뉴 (어느 도구든)
        if (tool !== "move" || !view || editing) return;
        const p = toDoc(e.clientX, e.clientY);
        onLayerMenu?.(e.clientX, e.clientY, hitAll(doc, p.x, p.y).map((l) => l._k!));
      }}
      style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden", background: C.psStage, cursor: drag?.mode === "rot" || (hoverRot && !drag) ? ROT_CURSOR : drag?.mode === "pan" ? "grabbing" : space || tool === "hand" ? "grab" : tool === "zoom" ? "zoom-in" : tool === "text" ? "text"
        : tool === "bucket" ? BUCKET_CURSOR
        : PEN_TOOLS.includes(tool) ? penCursor(tool === "freePen" ? "free" : tool === "curvePen" ? "curve" : tool === "convAnchor" ? "conv" : "pen", penSfx)
        : tool === "brush" || tool === "eraser" || tool === "stamp" || tool === "heal" ? "crosshair" : tool !== "move" ? "crosshair" : hoverG === "horizontal" ? "row-resize" : hoverG === "vertical" ? "col-resize" : MOVE_CURSOR, touchAction: "none", userSelect: "none" }}>
      {v && (
        <>
          {/* 투명 바둑판 */}
          <div style={{ position: "absolute", left: v.x, top: v.y, width: W * v.z, height: H * v.z, background: "repeating-conic-gradient(#d9d9d9 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px", boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }} />
          <canvas ref={cv} style={{ position: "absolute", left: v.x, top: v.y, width: W * v.z, height: H * v.z, imageRendering: v.z >= 3 ? "pixelated" : "auto" }} />
          <canvas ref={pcv} style={{ position: "absolute", left: v.x, top: v.y, width: W * v.z, height: H * v.z, display: "none", pointerEvents: "none" }} />
          {/* 격자 · 안내선 */}
          <canvas ref={ov} style={{ position: "absolute", left: 0, top: 0, width: size.w, height: size.h, pointerEvents: "none" }} />
          {gradLine && (
            <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <line x1={v.x + gradLine.x0 * v.z} y1={v.y + gradLine.y0 * v.z} x2={v.x + gradLine.x1 * v.z} y2={v.y + gradLine.y1 * v.z} stroke="#fff" strokeWidth={1.5} />
              <circle cx={v.x + gradLine.x0 * v.z} cy={v.y + gradLine.y0 * v.z} r={4} fill="#fff" stroke="#000" />
              <circle cx={v.x + gradLine.x1 * v.z} cy={v.y + gradLine.y1 * v.z} r={4} fill="#fff" stroke="#000" />
            </svg>
          )}
          <div ref={brushRing} style={{ position: "absolute", left: 0, top: 0, display: "none", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 0 0 1px rgba(0,0,0,0.6)", pointerEvents: "none" }} />
          {/* 선택 영역 윤곽 */}
          <canvas ref={antsCv} style={{ position: "absolute", left: 0, top: 0, width: size.w, height: size.h, pointerEvents: "none", display: selMask ? "block" : "none",
            // 선택한 부분을 옮기는 동안 — 개미 행렬도 조각과 같이 움직인다
            transform: drag?.piece && view ? `translate(${(drag.box.x - drag.b0.x) * view.z}px, ${(drag.box.y - drag.b0.y) * view.z}px)` : undefined }} />
          {/* 그리는 중인 선택 윤곽 · 올가미 · 도형 */}
          {!pen && PEN_TOOLS.includes(tool) && (() => {
            const sp = selPath();
            if (!sp) return null;
            const P = sp.pts.map((q) => ({ x: v.x + q.x * v.z, y: v.y + q.y * v.z, hx: q.hx * v.z, hy: q.hy * v.z }));
            let dd = `M${P[0].x},${P[0].y}`;
            for (let i = 1; i <= P.length; i++) { const a = P[i - 1], b = P[i % P.length]; dd += ` C${a.x + a.hx},${a.y + a.hy} ${b.x - b.hx},${b.y - b.hy} ${b.x},${b.y}`; }
            return (
              <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                <path d={dd} fill="none" stroke="#1473e6" strokeWidth={1.2} />
                {P.map((q, i) => (
                  <g key={i}>
                    {(q.hx || q.hy) ? <><line x1={q.x - q.hx * 3} y1={q.y - q.hy * 3} x2={q.x + q.hx * 3} y2={q.y + q.hy * 3} stroke="#1473e6" strokeWidth={0.8} /><circle cx={q.x + q.hx * 3} cy={q.y + q.hy * 3} r={2.5} fill="#1473e6" /><circle cx={q.x - q.hx * 3} cy={q.y - q.hy * 3} r={2.5} fill="#1473e6" /></> : null}
                    <rect x={q.x - 3} y={q.y - 3} width={6} height={6} fill="#fff" stroke="#1473e6" />
                  </g>
                ))}
              </svg>
            );
          })()}
          {(draft || poly || pen) && (() => {
            const P = (q: { x: number; y: number }) => `${v.x + q.x * v.z},${v.y + q.y * v.z}`;
            const dash = { fill: "none", stroke: "#fff", strokeWidth: 1, strokeDasharray: "4 4" } as const;
            const under = { fill: "none", stroke: "#000", strokeWidth: 1 } as const;
            let el: React.ReactNode = null;
            if (draft && (draft.kind === "sel" || draft.kind === "shape" || draft.kind === "tbox")) {
              const line = draft.kind === "shape" && tool === "lineShape";
              if (line) el = <><line x1={v.x + draft.p0.x * v.z} y1={v.y + draft.p0.y * v.z} x2={v.x + draft.p1.x * v.z} y2={v.y + draft.p1.y * v.z} stroke={paint?.fg || "#000"} strokeWidth={2} /></>;
              else {
                const b = norm(draft.p0, draft.p1, draft.shift && draft.mode === "new" || (draft.kind === "shape" && draft.shift));
                const r = { x: v.x + b.x * v.z, y: v.y + b.y * v.z, w: b.w * v.z, h: b.h * v.z };
                const ell = tool === "ellipseSel" || tool === "ellipseShape";
                const shape = (st: object) => ell ? <ellipse cx={r.x + r.w / 2} cy={r.y + r.h / 2} rx={r.w / 2} ry={r.h / 2} {...st} /> : <rect x={r.x} y={r.y} width={r.w} height={r.h} {...st} />;
                el = draft.kind === "shape" ? shape({ fill: paint?.fg || "#000", fillOpacity: 0.35, stroke: "#3b82f6", strokeWidth: 1 }) : <>{shape(under)}{shape(dash)}</>;
              }
            } else if (draft && draft.kind === "lasso") el = <><polyline points={draft.pts.map(P).join(" ")} {...under} /><polyline points={draft.pts.map(P).join(" ")} {...dash} /></>;
            else if (pen) {
              const P = pen.map((q) => ({ x: v.x + q.x * v.z, y: v.y + q.y * v.z, hx: q.hx * v.z, hy: q.hy * v.z }));
              let dd = `M${P[0].x},${P[0].y}`;
              for (let i = 1; i < P.length; i++) dd += ` C${P[i - 1].x + P[i - 1].hx},${P[i - 1].y + P[i - 1].hy} ${P[i].x - P[i].hx},${P[i].y - P[i].hy} ${P[i].x},${P[i].y}`;
              const last = P[P.length - 1];
              el = <>
                <path d={dd} fill="none" stroke="#1473e6" strokeWidth={1.5} />
                {hover && <line x1={last.x} y1={last.y} x2={v.x + hover.x * v.z} y2={v.y + hover.y * v.z} stroke="#1473e6" strokeDasharray="3 3" />}
                {P.map((q, i) => (
                  <g key={i}>
                    {(q.hx || q.hy) ? <><line x1={q.x - q.hx * 3} y1={q.y - q.hy * 3} x2={q.x + q.hx * 3} y2={q.y + q.hy * 3} stroke="#1473e6" /><circle cx={q.x + q.hx * 3} cy={q.y + q.hy * 3} r={3} fill="#1473e6" /><circle cx={q.x - q.hx * 3} cy={q.y - q.hy * 3} r={3} fill="#1473e6" /></> : null}
                    <rect x={q.x - 3.5} y={q.y - 3.5} width={7} height={7} fill={i === 0 ? "#1473e6" : "#fff"} stroke="#1473e6" />
                  </g>
                ))}
              </>;
            } else if (poly) {
              const pts = hover ? [...poly, hover] : poly;
              el = <><polyline points={pts.map(P).join(" ")} {...under} /><polyline points={pts.map(P).join(" ")} {...dash} />
                <circle cx={v.x + poly[0].x * v.z} cy={v.y + poly[0].y * v.z} r={4} fill="#fff" stroke="#000" /></>;
            }
            return <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>{el}</svg>;
          })()}
          {/* 자르기 상자 — 밖은 어둡게, 3분할 선, 손잡이 */}
          {tool === "crop" && crop && (() => {
            const r = { left: v.x + crop.x * v.z, top: v.y + crop.y * v.z, width: crop.w * v.z, height: crop.h * v.z };
            const outer = `M${v.x - 4000},${v.y - 4000}h${W * v.z + 8000}v${H * v.z + 8000}h${-(W * v.z + 8000)}z`;
            const inner = `M${r.left},${r.top}h${r.width}v${r.height}h${-r.width}z`;
            const CH = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
            return (
              <>
                <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <path d={`${outer}${inner}`} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
                  <rect x={r.left} y={r.top} width={r.width} height={r.height} fill="none" stroke="#fff" strokeWidth={1} />
                  {[1, 2].map((i) => <line key={`v${i}`} x1={r.left + (r.width * i) / 3} y1={r.top} x2={r.left + (r.width * i) / 3} y2={r.top + r.height} stroke="rgba(255,255,255,0.5)" />)}
                  {[1, 2].map((i) => <line key={`h${i}`} x1={r.left} y1={r.top + (r.height * i) / 3} x2={r.left + r.width} y2={r.top + (r.height * i) / 3} stroke="rgba(255,255,255,0.5)" />)}
                </svg>
                {CH.map((h) => (
                  <div key={h} data-ch={h} style={{ position: "absolute", ...hpos(h as Handle, r), width: 10, height: 10, background: "#fff", border: "1px solid #000", cursor: cursorOf(h as Handle) }} />
                ))}
              </>
            );
          })()}
          {/* 맞춤선 */}
          {guides.map((gd, i) => gd.x !== undefined
            ? <div key={i} style={{ position: "absolute", left: v.x + gd.x * v.z, top: 0, bottom: 0, width: 1, background: "#ff3ea5", pointerEvents: "none" }} />
            : <div key={i} style={{ position: "absolute", top: v.y + gd.y! * v.z, left: 0, right: 0, height: 1, background: "#ff3ea5", pointerEvents: "none" }} />)}
          {many && !editing && tool === "move" && v && manyBoxes.length > 0 && (() => {
            const x0 = Math.min(...manyBoxes.map((b) => b.x)), y0 = Math.min(...manyBoxes.map((b) => b.y));
            const x1 = Math.max(...manyBoxes.map((b) => b.x + b.w)), y1 = Math.max(...manyBoxes.map((b) => b.y + b.h));
            return (
              <>
                {manyBoxes.map((b, i) => <div key={i} style={{ position: "absolute", ...scr(b)!, outline: "1px solid rgba(59,130,246,0.75)", pointerEvents: "none" }} />)}
                <div style={{ position: "absolute", ...scr({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 })!, outline: "1px dashed #3b82f6", outlineOffset: 3, pointerEvents: "none" }} />
              </>
            );
          })()}
          {sr && !editing && !many && !selPieceMode && (tool === "move" || tool === "text") && (
            <>
              <div style={{ position: "absolute", ...sr, outline: "1px solid #3b82f6", boxShadow: "0 0 0 1px rgba(255,255,255,0.5)", pointerEvents: "none" }} />
              {canResize && handles.map((h) => (
                <div key={h} data-h={h} style={{ position: "absolute", ...hpos(h, sr), width: 10, height: 10, background: "#fff", border: "1px solid #3b82f6", borderRadius: 2, cursor: cursorOf(h) }} />
              ))}
              {drag && drag.moved && drag.mode !== "pan" && (
                <div style={{ position: "absolute", left: sr.left, top: sr.top + sr.height + 8, padding: "3px 7px", borderRadius: 4, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 12, fontFamily: FONT, pointerEvents: "none", whiteSpace: "nowrap" }}>
                  {drag.mode === "rot" ? `${drag.deg || 0}°` : drag.mode === "move" ? `X ${Math.round(drag.box.x)} · Y ${Math.round(drag.box.y)}` : `${Math.round(drag.box.w)} × ${Math.round(drag.box.h)}`}
                </div>
              )}
            </>
          )}
          {edL && edB && edLook && (() => {
            // 그려진 글자 위에 투명한 글 칸을 겹친다 — 보이는 건 진짜 글자 레이어, 칸은 커서·고르기만
            const gm = textGeom(edLook);
            const z = v.z;
            // 돌린 글자 — 돌리기 전 크기의 칸을 가운데에 두고 같이 돌린다
            const rot = edL._rot || 0;
            const hsc = edLook.hScale || 1, vsc = edLook.vScale || 1;
            const raw = rot ? renderText(edLook).canvas : null;
            const eb = raw ? { x: edB.x + edB.w / 2 - raw.width / 2, y: edB.y + edB.h / 2 - raw.height / 2, w: raw.width, h: raw.height } : edB;
            const lines = Math.max(1, edLook.text.split("\n").length);
            return (
              <>
                <style>{".gsp-edit::selection{background:rgba(59,130,246,0.35);color:transparent}"}</style>
                <textarea key={editing} ref={ta} className="gsp-edit" defaultValue={edLook.text} spellCheck={false}
                  onPointerDown={(e) => e.stopPropagation()}
                  onInput={(e) => onEditLive?.(editing!, (e.target as HTMLTextAreaElement).value)}
                  onBlur={(e) => onEditDone(editing!, e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") onEditDone(editing!, null);
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) (e.target as HTMLTextAreaElement).blur();
                  }}
                  style={{
                    position: "absolute", boxSizing: "border-box",
                    // 가로·세로 비율로 늘인 글자 — 칸은 늘이기 전 크기로 두고 같이 늘인다
                    left: v.x + eb.x * z, top: v.y + eb.y * z, width: Math.max((eb.w * z) / hsc, gm.px * z), height: (eb.h * z) / vsc,
                    transformOrigin: "0 0", transform: [rot ? `rotate(${rot}deg)` : "", hsc !== 1 || vsc !== 1 ? `scale(${hsc}, ${vsc})` : ""].join(" ").trim() || undefined,
                    padding: `${(gm.pad * 0.6) * z}px ${(gm.pad + 1) * z}px 0`, margin: 0, border: 0,
                    outline: "1px dashed rgba(59,130,246,0.9)", outlineOffset: 2, resize: "none", overflow: "hidden", background: "transparent",
                    font: gm.font.replace(`${gm.px}px`, `${gm.px * z}px`), letterSpacing: `${gm.sp * z}px`, lineHeight: `${gm.lh * z}px`,
                    color: "transparent", caretColor: edLook.color || "#111", textAlign: edLook.align || "left",
                    // 단락 글자 — 칸 너비에서 띄어쓰기 단위로 줄바꿈 (그림과 같은 규칙)
                    ...(edLook.boxW ? { whiteSpace: "pre-wrap", wordBreak: "keep-all", overflowWrap: "anywhere" } as const : { whiteSpace: "pre" } as const),
                  }}
                  rows={lines} />
              </>
            );
          })()}
          {rulers && (
            <>
              <canvas ref={rx} onPointerDown={(e) => startGuide(-1, "horizontal", e)} title="끌어내리면 가로 안내선"
                style={{ position: "absolute", left: 0, top: 0, width: size.w, height: RW, cursor: "row-resize", zIndex: 5 }} />
              <canvas ref={ry} onPointerDown={(e) => startGuide(-1, "vertical", e)} title="끌어오면 세로 안내선"
                style={{ position: "absolute", left: 0, top: 0, width: RW, height: size.h, cursor: "col-resize", zIndex: 5 }} />
              <div style={{ position: "absolute", left: 0, top: 0, width: RW, height: RW, background: C.psBar, borderRight: `1px solid ${C.psBarLine}`, borderBottom: `1px solid ${C.psBarLine}`, zIndex: 6 }} />
            </>
          )}
        </>
      )}
    </div>
  );
}
