"use client";

// 이미지 편집 — 가운데 그림판. 도구 고르기 없이: 누르면 고르기 · 끌면 옮기기 · 모서리 손잡이로 크기 · 두 번 누르면 글 고치기 · 휠로 확대
// 빠르게: 옮기는 동안은 [아래 그림 · 이 레이어 · 위 그림] 셋만 붙여 그린다 (다른 레이어를 다시 합치지 않음)
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { C, FONT } from "@/components/admin/studio-video/ui";
import { proofCanvas } from "./cmyk";
import { boundsOf, composite, copyCanvas, dabLine, drawList, findLayer, floodFill, forgetImage, hitTest, isText, kids, layerImage, lookOf, mk, paintGradient, pickColor, type Box, type Doc, type PLayer, type PsdGuide } from "./model";

export type View = { z: number; x: number; y: number };
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type Drag = {
  k: string;
  mode: "move" | Handle | "pan" | "paint";
  sx: number; sy: number; // 누른 곳 (화면)
  b0: Box;
  box: Box;
  v0?: View;
  below?: HTMLCanvasElement;
  above?: HTMLCanvasElement | null;
  moved: boolean;
};
type Guide = { x?: number; y?: number };

export type Tool = "move" | "text" | "hand" | "zoom" | "brush" | "eraser" | "bucket" | "gradient";
export const PAINT_TOOLS: Tool[] = ["brush", "eraser", "bucket", "gradient"];
/** 색칠 도구 설정 (옵션줄) */
export type PaintOpts = { fg: string; bg: string; size: number; hardness: number; opacity: number; tol: number; grad: "linear" | "radial"; gradTo: "bg" | "clear" };
type Paint = { l: PLayer; kind: Tool; orig: HTMLCanvasElement; stroke: HTMLCanvasElement; lx: number; ly: number; x0: number; y0: number };
const RW = 20; // 눈금자 두께
/** 눈금 간격 — 화면에서 60px 쯤 되게 1·2·5 단위로 */
const tickStep = (z: number) => {
  const raw = 60 / z;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= raw) || 10 * p;
};

export function Stage({ doc, tick, view, setView, sel, onSel, onMove, onResize, onEditText, editing, onEditDone, onDropFiles, fitKey, tool = "move", onTextAt,
  rulers = true, grid = 0, guidesOn = true, guideList = [], onGuides, paint, onPaintTarget, onPaintEnd, onPickColor, proof = false }: {
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
  onPickColor?: (hex: string) => void;
  /** 왼쪽 도구창에서 고른 도구 (포토샵처럼) */
  tool?: Tool;
  /** 문자 도구로 빈 곳을 눌렀을 때 — 그 자리에 새 글자 */
  onTextAt?: (x: number, y: number) => void;
  doc: Doc;
  tick: number;
  view: View | null;
  setView: (v: View) => void;
  sel: string | null;
  onSel: (k: string | null) => void;
  onMove: (k: string, dx: number, dy: number) => void;
  onResize: (k: string, box: Box) => void;
  onEditText: (k: string) => void;
  editing: string | null;
  onEditDone: (k: string, text: string | null) => void;
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
  // 안내선 끌기 (눈금자에서 새로 · 있는 것 옮기기) — i = -1 이면 새 안내선
  const [gd, setGd] = useState<{ i: number; dir: "horizontal" | "vertical"; pos: number } | null>(null);
  const [hoverG, setHoverG] = useState<"" | "horizontal" | "vertical">("");
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
    if (d && d.mode !== "pan" && d.below) {
      g.drawImage(d.below, 0, 0);
      const l = findLayer(kids(doc.psd), d.k);
      if (l && d.mode === "paint") forgetImage(l.canvas);
      if (l && !l.hidden) {
        const lay = (img: { c: HTMLCanvasElement; x: number; y: number }, b0: Box) => {
          const sx = d.box.w / b0.w, sy = d.box.h / b0.h;
          g.globalAlpha = l.opacity ?? 1;
          g.drawImage(img.c, d.box.x + (img.x - b0.x) * sx, d.box.y + (img.y - b0.y) * sy, img.c.width * sx, img.c.height * sy);
          g.globalAlpha = 1;
        };
        if (l.children) {
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
      g.drawImage(composite(doc, editing || undefined), 0, 0);
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
      g.fillStyle = "#2b2b2b";
      g.fillRect(0, 0, horiz ? len : RW, horiz ? RW : len);
      g.strokeStyle = "#8a8a8a";
      g.fillStyle = "#bdbdbd";
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
      g.strokeStyle = "#1f1f1f";
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
  }, [view, size, rulers, grid, guidesOn, guideList, gd, W, H]);

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
    if (first) dabLine(sg, lx - 0.01, ly, lx, ly, size, paint.hardness, pr.kind === "eraser" ? "#000000" : paint.fg);
    else dabLine(sg, pr.lx, pr.ly, lx, ly, size, paint.hardness, pr.kind === "eraser" ? "#000000" : paint.fg);
    pr.lx = lx;
    pr.ly = ly;
    const g = pr.l.canvas!.getContext("2d")!;
    g.clearRect(0, 0, pr.orig.width, pr.orig.height);
    g.drawImage(pr.orig, 0, 0);
    g.globalAlpha = paint.opacity;
    g.globalCompositeOperation = pr.kind === "eraser" ? "destination-out" : "source-over";
    g.drawImage(pr.stroke, 0, 0);
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
      if (e.altKey && tool !== "eraser") { onPickColor?.(pickColor(doc, p.x, p.y)); return; } // 스포이드
      const l = onPaintTarget?.(tool);
      if (!l || !l.canvas) return;
      const lx = p.x - (l.left || 0), ly = p.y - (l.top || 0);
      if (tool === "bucket") {
        l.canvas = floodFill(l.canvas, lx, ly, paint.fg, paint.tol, paint.opacity);
        forgetImage(l.canvas);
        onPaintEnd?.(l);
        return;
      }
      const orig = copyCanvas(l.canvas);
      const stroke = mk(l.canvas.width, l.canvas.height);
      paintRef.current = { l, kind: tool, orig, stroke, lx, ly, x0: lx, y0: ly };
      const s = split(l._k!);
      const b = boundsOf(l)!;
      const d: Drag = { k: l._k!, mode: "paint", sx: e.clientX, sy: e.clientY, b0: b, box: b, below: s.below, above: s.above, moved: true };
      dragRef.current = d;
      if (tool !== "gradient") paintStroke(lx, ly, true);
      setDrag({ ...d });
      return;
    }
    if (tool === "move" && e.button === 0 && !handle) {
      const gi = guideAt(e.clientX, e.clientY);
      if (gi >= 0) { startGuide(gi, guideList[gi].direction, e); return; }
    }
    if (tool === "text" && e.button === 0) {
      // 누른 동작이 글 칸의 커서를 빼앗지 않게 — 기본 동작을 막고, 글 칸은 다음 차례에
      e.preventDefault();
      const hit = hitTest(doc, p.x, p.y);
      setTimeout(() => (hit && isText(hit) ? onEditText(hit._k!) : onTextAt?.(p.x, p.y)), 0);
      return;
    }
    if (e.button === 1 || space || tool === "hand") {
      const d: Drag = { k: "", mode: "pan", sx: e.clientX, sy: e.clientY, b0: { x: 0, y: 0, w: 1, h: 1 }, box: { x: 0, y: 0, w: 1, h: 1 }, v0: view, moved: false };
      dragRef.current = d;
      setDrag(d);
      return;
    }
    let k: string | null = null;
    if (handle && sel) k = sel;
    else {
      // 고른 레이어 안을 누르면 (투명한 곳이라도) 그 레이어를 옮긴다
      const cur = sel ? findLayer(kids(doc.psd), sel) : null;
      const cb = cur ? boundsOf(cur) : null;
      if (cur && cb && !cur.protected?.position && p.x >= cb.x && p.x <= cb.x + cb.w && p.y >= cb.y && p.y <= cb.y + cb.h) k = sel;
      else k = hitTest(doc, p.x, p.y)?._k || null;
    }
    if (!k) {
      onSel(null);
      // 빈 곳을 끌면 화면 옮기기
      const d: Drag = { k: "", mode: "pan", sx: e.clientX, sy: e.clientY, b0: { x: 0, y: 0, w: 1, h: 1 }, box: { x: 0, y: 0, w: 1, h: 1 }, v0: view, moved: false };
      dragRef.current = d;
      setDrag(d);
      return;
    }
    if (k !== sel) onSel(k);
    const l = findLayer(kids(doc.psd), k);
    const b0 = l ? boundsOf(l) : null;
    if (!l || !b0 || l.protected?.position) return;
    collectSnap(k);
    const d: Drag = { k, mode: handle || "move", sx: e.clientX, sy: e.clientY, b0, box: { ...b0 }, moved: false };
    dragRef.current = d;
  };
  const onMoveP = (e: React.PointerEvent) => {
    const d = dragRef.current;
    // 브러시 크기 원 (색칠 도구일 때)
    const ring = brushRing.current;
    if (ring && view && paint && (tool === "brush" || tool === "eraser")) {
      const r = wrap.current!.getBoundingClientRect();
      const dia = Math.max(4, paint.size * view.z);
      ring.style.display = "block";
      ring.style.width = ring.style.height = `${dia}px`;
      ring.style.transform = `translate(${e.clientX - r.left - dia / 2}px, ${e.clientY - r.top - dia / 2}px)`;
    }
    if (!d && tool === "move" && guidesOn) {
      const gi = guideAt(e.clientX, e.clientY);
      const dir = gi >= 0 ? guideList[gi].direction : "";
      if (dir !== hoverG) setHoverG(dir);
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
        const ox = pr.l.left || 0, oy = pr.l.top || 0;
        setGradLine({ x0: pr.x0 + ox, y0: pr.y0 + oy, x1: x1 + ox, y1: y1 + oy });
      } else paintStroke(lx, ly);
      setDrag({ ...d });
      return;
    }
    const dxs = e.clientX - d.sx, dys = e.clientY - d.sy;
    if (!d.moved && Math.abs(dxs) + Math.abs(dys) < 3) return;
    if (!d.moved && d.mode !== "pan") {
      // 처음 움직일 때 [아래 · 위] 그림을 만든다
      const s = split(d.k);
      d.below = s.below;
      d.above = s.above;
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
      const l = findLayer(kids(doc.psd), d.k);
      const corner = m.length === 2;
      const keep = (l && isText(l)) || (corner && !e.shiftKey);
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
  const onUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setGuides([]);
    if (d?.mode === "paint") {
      const pr = paintRef.current;
      paintRef.current = null;
      setGradLine(null);
      setDrag(null);
      if (pr) onPaintEnd?.(pr.l);
      return;
    }
    if (d && d.moved && d.mode !== "pan") {
      if (d.mode === "move") onMove(d.k, Math.round(d.box.x - d.b0.x), Math.round(d.box.y - d.b0.y));
      else onResize(d.k, d.box);
    }
    setDrag(null);
  };
  const onDbl = (e: React.MouseEvent) => {
    if (!view) return;
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
  const canResize = selL && !selL.children && !selL.protected?.position;
  const textOnly = selL && isText(selL);
  const handles: Handle[] = textOnly ? ["nw", "ne", "se", "sw"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
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
    <div ref={wrap} onPointerDown={onDown} onPointerMove={onMoveP} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => { if (brushRing.current) brushRing.current.style.display = "none"; }} onDoubleClick={onDbl} onWheel={onWheel}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); const f = [...e.dataTransfer.files]; if (f.length) onDropFiles(f); }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden", background: "#121316", cursor: drag?.mode === "pan" ? "grabbing" : space || tool === "hand" ? "grab" : tool === "zoom" ? "zoom-in" : tool === "text" ? "text"
        : tool === "brush" || tool === "eraser" ? "crosshair" : tool === "bucket" || tool === "gradient" ? "crosshair" : hoverG === "horizontal" ? "row-resize" : hoverG === "vertical" ? "col-resize" : "default", touchAction: "none", userSelect: "none" }}>
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
          {/* 맞춤선 */}
          {guides.map((gd, i) => gd.x !== undefined
            ? <div key={i} style={{ position: "absolute", left: v.x + gd.x * v.z, top: 0, bottom: 0, width: 1, background: "#ff3ea5", pointerEvents: "none" }} />
            : <div key={i} style={{ position: "absolute", top: v.y + gd.y! * v.z, left: 0, right: 0, height: 1, background: "#ff3ea5", pointerEvents: "none" }} />)}
          {sr && !editing && !PAINT_TOOLS.includes(tool) && (
            <>
              <div style={{ position: "absolute", ...sr, outline: "1px solid #3b82f6", boxShadow: "0 0 0 1px rgba(255,255,255,0.5)", pointerEvents: "none" }} />
              {canResize && handles.map((h) => (
                <div key={h} data-h={h} style={{ position: "absolute", ...hpos(h, sr), width: 10, height: 10, background: "#fff", border: "1px solid #3b82f6", borderRadius: 2, cursor: cursorOf(h) }} />
              ))}
              {drag && drag.moved && drag.mode !== "pan" && (
                <div style={{ position: "absolute", left: sr.left, top: sr.top + sr.height + 8, padding: "3px 7px", borderRadius: 4, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 12, fontFamily: FONT, pointerEvents: "none", whiteSpace: "nowrap" }}>
                  {drag.mode === "move" ? `X ${Math.round(drag.box.x)} · Y ${Math.round(drag.box.y)}` : `${Math.round(drag.box.w)} × ${Math.round(drag.box.h)}`}
                </div>
              )}
            </>
          )}
          {edL && edB && edLook && (
            <textarea ref={ta} defaultValue={edLook.text}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => onEditDone(editing!, e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") onEditDone(editing!, null);
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) (e.target as HTMLTextAreaElement).blur();
              }}
              style={{
                position: "absolute", left: v.x + edB.x * v.z, top: v.y + edB.y * v.z, minWidth: Math.max(120, edB.w * v.z), minHeight: edB.h * v.z,
                padding: 0, margin: 0, border: "1px dashed #3b82f6", outline: "none", resize: "none", overflow: "hidden", background: "rgba(255,255,255,0.08)",
                font: `${edLook.italic ? "italic " : ""}${edLook.bold === false ? 400 : 700} ${edLook.px * v.z}px '${edLook.font || "Pretendard"}', 'Malgun Gothic', sans-serif`,
                lineHeight: 1.25, color: edLook.color || "#111", textAlign: edLook.align || "left", whiteSpace: "pre",
              }}
              rows={Math.max(1, edLook.text.split("\n").length)} />
          )}
          {rulers && (
            <>
              <canvas ref={rx} onPointerDown={(e) => startGuide(-1, "horizontal", e)} title="끌어내리면 가로 안내선"
                style={{ position: "absolute", left: 0, top: 0, width: size.w, height: RW, cursor: "row-resize", zIndex: 5 }} />
              <canvas ref={ry} onPointerDown={(e) => startGuide(-1, "vertical", e)} title="끌어오면 세로 안내선"
                style={{ position: "absolute", left: 0, top: 0, width: RW, height: size.h, cursor: "col-resize", zIndex: 5 }} />
              <div style={{ position: "absolute", left: 0, top: 0, width: RW, height: RW, background: "#2b2b2b", borderRight: "1px solid #1f1f1f", borderBottom: "1px solid #1f1f1f", zIndex: 6 }} />
            </>
          )}
        </>
      )}
    </div>
  );
}
