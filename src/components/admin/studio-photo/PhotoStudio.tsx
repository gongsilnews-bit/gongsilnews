"use client";

// 공실스튜디오 [이미지 편집] (포토랩) — PSD 를 열고 고치고 PSD 로 저장 (포토샵과 주고받기). 회의: docs/2026-10-19_photolab_meeting.md
//  - 모든 일은 이 PC 안에서 (서버 없음) — 열기·그리기·저장이 바로바로
//  - 화면: 처음 화면(새 파일·열기·최근 파일) → 문서 탭 · 그림판 · 오른쪽 속성 칸 · 레이어 목록
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Btn, C, FONT, Icon, Modal, input, useStudioTheme } from "@/components/admin/studio-video/ui";
import { loadFont } from "@/components/admin/studio-video/Pickers";
import { stickerFileName, stickerPng, type Sticker } from "@/components/admin/studio-video/Stickers";
import {
  applyLook, applyResize, shapeCanvas, boundsOf as boundsOfL, bytesToCanvas, cloneTree, composite, duplicate, exportBytes, findLayer, imageLayer, isText, kids, layerPng, lookOf, newDoc, offsetLayer,
  copyCanvas, guidesOf, mk, niceGrid, paintable, preparePaint, setGuides, type PsdGuide,
  openImageBytes, openPsdBytes, parentList, rasterize, resizeCanvas, savePsdBytes, shapeLayer, textLayer, thumbOf, uid, type Box, type Doc, type PLayer,
  cropDoc, canvasRect, canvasSizeDoc, imageSizeDoc, rotateDoc, flipDoc, trimBox, revealBox, guidesOf as guidesOfDoc, setGuides as setGuidesDoc, shapeLayerAt, rotateLayer, pictoLayer, flipLayer, webBytes, flatExt, penShapeLayer, walk, makeMask, fullMask, applyMask, grayOf, forgetMask, trimLayer, type WebFmt,
  pageCount, pageIndex, gotoPage, addPage, removePage, movePage,
} from "./model";
import { cmykPdf, cmykTiff } from "./cmyk";
import { PAINT_TOOLS, SEL_TOOLS, Stage, type PaintOpts, type Tool, type View } from "./Stage";
import { ADJUST_NAME, adjustCanvas, clearInside, clipTo, combine, extract, fillCanvas, fillInside, invertMask, maskBounds, modifyMask, selectAll, shapeMask, strokeCanvas, trimCanvas, wandMask, type Adjust, type FillOpt, type SelMode, type SelShape, type StrokeOpt } from "./selection";
import { LAYER_DRAG, LayerList, type MenuAct } from "./LayerList";
import { applyAdj, histogram, type AdjKind, type AdjVal } from "./adjust";
import { AdjustDialog } from "./AdjustDialog";
import { pictoCanvas } from "./pictos";
import { WarpDialog } from "./WarpDialog";
import { PrintDialog, type PrintBridge } from "./PrintDialog";
import { CanvasSizeDialog, ImageSizeDialog, TrimDialog } from "./ImageDialogs";
import { FILTERS, FILTER_MENU, type FVals } from "./filters";
import { FilterDialog } from "./FilterDialog";
import { AiBar, AI_ACT_NAME, type AiAct, type BarTextSet } from "./AiBar";
import type { TextWarp } from "./warp";
import { ColorPicker } from "./ColorPicker";
import { DesignSide, type MyTpl } from "./DesignSide";
import { DesignDialog, ratioOf, type DesignResult } from "./DesignDialog";
import { SampleGrid } from "./SampleGrid";
import { PageStrip } from "./PageStrip";
import { CAT_SIZES, SLOT_NAME, SLOT_PICK, buildLayout, contentFor, coverCanvas, layoutFonts, loadSampleBg, placeholderBg, placeholderContent, refill, tplGroup, type Cat, type CatSize, type Layout, type Slot } from "./layouts";
import { getStudioAgency } from "@/app/actions/studio";
import { videoBridge } from "@/components/admin/studio-video/types";
import { AiSettingsBox } from "@/components/admin/studio-video/VideoMenu";
import { DocPanel, LayerPanel, PictoSide, StickerSide, TextPanel } from "./PhotoPanels";

/* ── 앱 통로 (없으면 브라우저: 파일 고르기·내려받기) ── */
type FileRes = { path: string; name: string; bytes?: Uint8Array; error?: string };
type Recent = { path: string; name: string; at: number; thumb: string; missing?: boolean };
type AutoItem = { id: string; name: string; file: string; at: number };
type PhotoBridge = {
  open: (o?: { images?: boolean }) => Promise<FileRes[]>;
  read: (file: string) => Promise<FileRes>;
  save: (o: { file?: string; name: string; ext: "psd" | "png" | "jpg" | "pdf" | "tif" | "gif" | "webp"; bytes: Uint8Array; thumb?: string; ask?: boolean }) => Promise<{ path?: string; name?: string; canceled?: boolean; error?: string }>;
  autosaveWrite?: (o: { id: string; name: string; file?: string; bytes: Uint8Array }) => Promise<boolean>;
  autosaveList?: () => Promise<AutoItem[]>;
  autosaveRead?: (id: string) => Promise<{ bytes?: Uint8Array; error?: string }>;
  autosaveClear?: (id: string) => Promise<boolean>;
  tplList?: () => Promise<{ file: string; name: string; thumb: string; w: number; h: number; at: number }[]>;
  tplWrite?: (o: { name: string; bytes: Uint8Array; thumb: string; w: number; h: number; ask?: boolean }) => Promise<{ file?: string; error?: string; canceled?: boolean }>;
  tplRead?: (file: string) => Promise<FileRes>;
  tplRemove?: (file: string) => Promise<boolean>;
  readFile?: (file: string) => Promise<FileRes>;
  tempWrite?: (o: { bytes: Uint8Array; ext?: string }) => Promise<{ path?: string; error?: string }>;
  aiText?: (o: { text: string; request: string }) => Promise<{ text: string }>;
  recent: () => Promise<Recent[]>;
  recentRemove: (file: string) => Promise<boolean>;
  reveal: (file: string) => Promise<boolean>;
  setDirty?: (n: number) => Promise<boolean>;
} & PrintBridge;
const bridge = (): PhotoBridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: { photo?: PhotoBridge } }).gongsilStudio?.photo ?? null) : null);
function pickLocal(images: boolean): Promise<File[]> {
  return new Promise((res) => {
    const i = document.createElement("input");
    i.type = "file";
    i.multiple = true;
    i.accept = images ? "image/*" : ".psd,.psb,image/*";
    i.onchange = () => res([...(i.files || [])]);
    i.click();
  });
}
function download(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ── 열려 있는 문서들 — 메뉴를 오가도 그대로 (앱을 켠 동안) ── */
type Snap = { children: PLayer[]; w: number; h: number; guides: PsdGuide[] };
const store = {
  docs: [] as Doc[],
  active: "",
  home: true,
  hist: new Map<string, { undo: Snap[]; redo: Snap[]; key: string; at: number }>(),
  view: new Map<string, View>(),
  /** 탭에서 끌어내 떠 있는 창들 (작업 영역 안 위치·크기, z = 겹침 순서) */
  float: new Map<string, { x: number; y: number; w: number; h: number; z: number }>(),
  zTop: 0,
  /** 탭 자리(붙어 있는 문서들)에서 마지막으로 보던 문서 */
  dock: "",
  /** 문서마다 "화면에 맞추기" 누른 횟수 */
  fit: new Map<string, number>(),
};
type FloatRect = { x: number; y: number; w: number; h: number; z: number };
/* 선택 영역 — 문서마다 (지금 · 바로 전 = Shift+Ctrl+D 다시 선택). 되돌리기 기록에는 안 남는다 */
const sels = new Map<string, { cur: HTMLCanvasElement | null; prev: HTMLCanvasElement | null; vec?: SelShape | null; pvec?: SelShape | null }>();
/* 복사한 것 (Ctrl+C · X) — 문서끼리도 붙여넣기. sys = 시스템 클립보드에도 같은 그림을 넣었나 */
let clip: { layer: PLayer; w: number; h: number; sys: boolean } | null = null;
/* 왼쪽 도구창 — 포토샵과 같은 순서 · 같은 글쇠 · 같은 묶음 (Shift+글쇠 = 묶음 안에서 다음 도구) */
type ToolDef = { t: Tool; name: string };
const TOOL_GROUPS: { key: string; code: string; tools: ToolDef[]; gap?: boolean }[] = [
  { key: "V", code: "KeyV", tools: [{ t: "move", name: "이동 도구" }] },
  { key: "M", code: "KeyM", tools: [{ t: "marquee", name: "사각형 선택 윤곽 도구" }, { t: "ellipseSel", name: "타원형 선택 윤곽 도구" }] },
  { key: "L", code: "KeyL", tools: [{ t: "lasso", name: "올가미 도구" }, { t: "polyLasso", name: "다각형 올가미 도구" }] },
  { key: "W", code: "KeyW", tools: [{ t: "wand", name: "자동 선택 도구" }] },
  { key: "C", code: "KeyC", tools: [{ t: "crop", name: "자르기 도구" }] },
  { key: "I", code: "KeyI", tools: [{ t: "picker", name: "스포이트 도구" }], gap: true },
  { key: "J", code: "KeyJ", tools: [{ t: "heal", name: "스팟 복구 브러시 도구" }] },
  { key: "B", code: "KeyB", tools: [{ t: "brush", name: "브러시 도구" }] },
  { key: "S", code: "KeyS", tools: [{ t: "stamp", name: "복제 도장 도구" }] },
  { key: "E", code: "KeyE", tools: [{ t: "eraser", name: "지우개 도구" }] },
  { key: "G", code: "KeyG", tools: [{ t: "gradient", name: "그레이디언트 도구" }, { t: "bucket", name: "페인트 통 도구" }], gap: true },
  { key: "P", code: "KeyP", tools: [{ t: "pen", name: "펜 도구" }, { t: "freePen", name: "자유 형태 펜 도구" }, { t: "curvePen", name: "곡률 펜 도구" }, { t: "addAnchor", name: "기준점 추가 도구" }, { t: "delAnchor", name: "기준점 삭제 도구" }, { t: "convAnchor", name: "기준점 변환 도구" }] },
  { key: "T", code: "KeyT", tools: [{ t: "text", name: "가로쓰기 문자 도구" }] },
  { key: "U", code: "KeyU", tools: [{ t: "rectShape", name: "사각형 도구" }, { t: "ellipseShape", name: "타원 도구" }, { t: "lineShape", name: "선 도구" }], gap: true },
  { key: "H", code: "KeyH", tools: [{ t: "hand", name: "손 도구" }] },
  { key: "Z", code: "KeyZ", tools: [{ t: "zoom", name: "돋보기 도구" }] },
];
const groupOf = (t: Tool) => TOOL_GROUPS.find((g) => g.tools.some((x) => x.t === t))!;
const TOOL_NAME = Object.fromEntries(TOOL_GROUPS.flatMap((g) => g.tools.map((x) => [x.t, x.name]))) as Record<Tool, string>;
const histOf = (id: string) => {
  let h = store.hist.get(id);
  if (!h) store.hist.set(id, (h = { undo: [], redo: [], key: "", at: 0 }));
  return h;
};
/* 여러 쪽 — 되돌리기 기록은 쪽마다 따로 (쪽을 바꾸면 그 쪽 기록으로 갈아 끼운다). 열쇠 = 문서 id:쪽 열쇠 */
const pageHist = new Map<string, { undo: Snap[]; redo: Snap[] }>();
/** 쪽 바꾸기·더하기·지우기·옮기기 — 지금 쪽 기록을 맡겨 두고, 바뀐 쪽 기록을 꺼낸다 */
const withPageHist = (d: Doc, fn: () => void) => {
  const h = histOf(d.id);
  const before = d.psd;
  fn();
  const old = d.pages?.find((p) => p.psd === before);
  if (old) pageHist.set(`${d.id}:${old.key}`, { undo: h.undo, redo: h.redo });
  const cur = d.pages?.[pageIndex(d)];
  const got = cur ? pageHist.get(`${d.id}:${cur.key}`) : null;
  h.undo = got?.undo || [];
  h.redo = got?.redo || [];
  h.key = "";
};
const snapOf = (d: Doc): Snap =>({ children: cloneTree(kids(d.psd)), w: d.psd.width, h: d.psd.height, guides: cloneTree(guidesOf(d)) });
const walkNames = (list: PLayer[], fn: (n: string) => void) => { for (const l of list) { fn(l.name || ""); if (l.children) walkNames(kids(l), fn); } };
const gridSizes = new Map<string, number>(); // 문서마다 격자 간격
/* 보기 설정 (눈금자 · 격자 · 안내선) — 이 PC 에 기억 */
const VIS_KEY = "gsp-vis";
type Vis = { rulers: boolean; grid: boolean; guides: boolean; proof?: boolean };
const readVis = (): Vis => {
  try { return { rulers: true, grid: false, guides: true, ...JSON.parse(localStorage.getItem(VIS_KEY) || "{}") }; } catch { return { rulers: true, grid: false, guides: true }; }
};
const PAINT_KEY = "gsp-paint";
const readPaint = (): PaintOpts => {
  const d: PaintOpts = { fg: "#000000", bg: "#FFFFFF", size: 30, hardness: 0.9, opacity: 1, tol: 32, grad: "linear", gradTo: "bg" };
  try { return { ...d, ...JSON.parse(localStorage.getItem(PAINT_KEY) || "{}") }; } catch { return d; }
};

/* ── 새 문서 크기 (포토샵 [새로운 문서] 처럼) ── */
type Preset = { name: string; w: number; h: number; ppi?: number; note?: string; guides?: PsdGuide[] };
/* 부동산에 필요한 종류 — 유튜브 · 블로그 · SNS · 부동산마케팅 (회의 2026-10-19). 인쇄는 300ppi, 큰 인쇄물은 150·100ppi (앱이 다룰 수 있는 크기)
   ※ 공식 크기를 확인하지 못한 것(네이버 블로그 상단 배너·본문 폭, 카카오톡 채널)은 넣지 않았다 — 확인되면 더한다 */
const v = (location: number): PsdGuide => ({ location, direction: "vertical" });
const hz = (location: number): PsdGuide => ({ location, direction: "horizontal" });
const PRESETS: { id: string; label: string; icon: string; desc: string; items: Preset[] }[] = [
  { id: "youtube", label: "유튜브", icon: "video", desc: "썸네일 · 쇼츠 표지 · 채널 배너 · 로고", items: [
    { name: "유튜브 썸네일", w: 1280, h: 720, note: "영상 목록에 보이는 그림" },
    { name: "쇼츠 표지", w: 1080, h: 1920, note: "세로 9:16" },
    { name: "채널 배너 (아트)", w: 2560, h: 1440, note: "글자는 가운데 1546×423 안에 (안내선)", guides: [v(507), v(2053), hz(508.5), hz(931.5)] },
    { name: "채널 로고 (프로필)", w: 800, h: 800, note: "동그랗게 잘려 보여요" },
    { name: "영상 워터마크", w: 150, h: 150, note: "구독 버튼 자리" },
    { name: "영상 끝 화면", w: 1920, h: 1080, note: "다음 영상·구독 안내" },
  ] },
  { id: "blog", label: "블로그", icon: "pen", desc: "대표 이미지 · 본문 이미지", items: [
    { name: "대표 이미지 (정사각)", w: 1080, h: 1080, note: "모바일 목록 1:1" },
    { name: "대표 이미지 (가로 3:2)", w: 1200, h: 800, note: "PC 목록 3:2" },
    { name: "본문 이미지 (가로 16:9)", w: 1920, h: 1080, note: "글 사이에 넣는 그림" },
    { name: "본문 이미지 (세로 4:5)", w: 1080, h: 1350, note: "모바일에서 크게" },
  ] },
  { id: "sns", label: "SNS", icon: "phone", desc: "인스타 카드뉴스 · 피드 · 스토리 · 링크 공유", items: [
    { name: "인스타 카드뉴스", w: 1080, h: 1350, note: "여러 장을 한 묶음으로" },
    { name: "인스타 피드 정사각", w: 1080, h: 1080 },
    { name: "스토리 · 릴스", w: 1080, h: 1920 },
    { name: "링크 공유 이미지", w: 1200, h: 630, note: "페이스북·카카오톡 링크 미리보기" },
    { name: "스레드", w: 1080, h: 1350 },
  ] },
  { id: "realty", label: "부동산마케팅", icon: "image", desc: "명함 · X배너 · 유리창 홍보지 · 전단 · 현수막", items: [
    { name: "일반 명함", w: 1063, h: 591, ppi: 300, note: "90 × 50 mm" },
    { name: "고급 명함 (양면)", w: 1063, h: 591, ppi: 300, note: "90 × 50 mm · 앞뒤 따로 만들기" },
    { name: "X배너", w: 3543, h: 10630, ppi: 150, note: "600 × 1800 mm" },
    { name: "유리창 홍보지 A2", w: 4961, h: 7016, ppi: 300, note: "420 × 594 mm" },
    { name: "유리창 홍보지 A4", w: 2480, h: 3508, ppi: 300, note: "210 × 297 mm" },
    { name: "전단지 A4", w: 2480, h: 3508, ppi: 300, note: "210 × 297 mm" },
    { name: "현수막", w: 19685, h: 3543, ppi: 100, note: "5000 × 900 mm" },
  ] },
  { id: "basic", label: "기본", icon: "file", desc: "웹 화면 · A4 · A3", items: [
    { name: "웹 큰 화면", w: 1920, h: 1080 }, { name: "웹 HD", w: 1280, h: 720 },
    { name: "A4", w: 2480, h: 3508, ppi: 300, note: "210 × 297 mm" }, { name: "A3", w: 3508, h: 4961, ppi: 300, note: "297 × 420 mm" },
  ] },
];
type NewInit = { tab?: string; preset?: Preset };
const RECENT_KEY = "gsp-new-recent";
const readRecentSizes = (): Preset[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
};

function NewDocDialog({ onCreate, onClose, init, onSample, mine, onMine, onMineRemove }: { onCreate: (o: { name: string; width: number; height: number; bg: string; ppi: number; guides?: PsdGuide[]; mode: "rgb" | "cmyk" }) => void; onClose: () => void; init?: NewInit | null; onSample?: (l: Layout, size: CatSize, ai: boolean, cat: Cat) => void; mine?: MyTpl[] | null; onMine?: (t: MyTpl, ai: boolean) => void; onMineRemove?: (t: MyTpl) => void }) {
  const recent = readRecentSizes();
  const p0 = init?.preset;
  const [tab, setTab] = useState(init?.tab || "basic"); // 처음엔 [기본] (2026-10-22 사장님)
  const [name, setName] = useState(p0?.name || "제목 없음-1");
  const [w, setW] = useState(p0?.w || 1080), [h, setH] = useState(p0?.h || 1080), [ppi, setPpi] = useState(p0?.ppi || 72);
  const [bg, setBg] = useState("white");
  const [mode, setMode] = useState<"rgb" | "cmyk">((p0?.ppi || 72) >= 100 ? "cmyk" : "rgb"); // 인쇄물은 CMYK 가 기본
  const [picked, setPicked] = useState(p0 ? `${p0.name}${p0.w}x${p0.h}` : "");
  const [guides, setGuidesS] = useState<PsdGuide[] | undefined>(p0?.guides);
  const list = tab === "recent" ? recent : PRESETS.find((p) => p.id === tab)?.items || [];
  // 이 탭에서 고른 크기 — 아래 레이아웃 샘플을 그 크기에 맞는 것만 (2026-10-22 사장님)
  const pickedP = list.find((p) => `${p.name}${p.w}x${p.h}` === picked);
  const pickedSize = pickedP ? { name: pickedP.name, w: pickedP.w, h: pickedP.h, ppi: pickedP.ppi } : undefined;
  const pick = (p: Preset) => { setW(p.w); setH(p.h); setPpi(p.ppi || 72); setGuidesS(p.guides); setMode((p.ppi || 72) >= 100 ? "cmyk" : "rgb"); setPicked(`${p.name}${p.w}x${p.h}`); if (/^제목 없음/.test(name) || PRESETS.some((c) => c.items.some((x) => x.name === name))) setName(p.name); };
  const make = () => {
    const ww = Math.max(1, Math.min(30000, Math.round(w))), hh = Math.max(1, Math.min(30000, Math.round(h)));
    try {
      const r = [{ name: name || "제목 없음", w: ww, h: hh, ppi }, ...readRecentSizes().filter((x) => !(x.w === ww && x.h === hh))].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(r));
    } catch {}
    onCreate({ name: name.trim() || "제목 없음-1", width: ww, height: hh, bg, ppi, guides: ww === w && hh === h ? guides : undefined, mode });
  };
  const tabBtn = (id: string, t: string) => (
    <button key={id} type="button" onClick={() => setTab(id)}
      style={{ height: 40, padding: "0 16px", border: 0, borderBottom: `2px solid ${tab === id ? C.accent : "transparent"}`, background: "transparent", color: tab === id ? C.text : C.sub, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>{t}</button>
  );
  const portrait = h > w;
  const numIn = (v: number, set: (n: number) => void) => (
    <input type="number" value={v} onChange={(e) => set(Number(e.target.value))} onKeyDown={(e) => e.stopPropagation()} style={{ ...input, height: 36, fontSize: 14 }} />
  );
  return (
    <Modal title="새로운 문서" onClose={onClose} width={980}
      footer={<><Btn onClick={onClose}>닫기</Btn><Btn primary onClick={make}>만들기</Btn></>}>
      <div style={{ display: "flex", minHeight: 440 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.line}`, padding: "0 12px" }}>
            {/* 기본 → 유튜브 · 블로그 · SNS · 부동산마케팅 → 최근 사용 */}
            {[...PRESETS.filter((p) => p.id === "basic"), ...PRESETS.filter((p) => p.id !== "basic")].map((p) => tabBtn(p.id, p.label))}
            {tabBtn("recent", "최근 사용")}
          </div>
          <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>빈 문서</span>
            <span style={{ fontSize: 12.5, color: C.dim }}>누르면 오른쪽에서 크기를 확인하고 [만들기] · 아래 레이아웃 샘플로도 시작할 수 있어요</span>
          </div>
          <div style={{ flex: 1, maxHeight: "62vh", overflowY: "auto" }}>
          <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, alignContent: "start" }}>
            {list.map((p, i) => {
              const on = picked === `${p.name}${p.w}x${p.h}`;
              const k = Math.min(64 / p.w, 40 / p.h);
              return (
                <button key={i} type="button" onClick={() => pick(p)} onDoubleClick={() => { pick(p); setTimeout(make, 0); }}
                  title={p.note || undefined}
                  style={{ padding: "8px 6px", borderRadius: 8, border: `2px solid ${on ? C.sel : C.line}`, background: on ? C.cardHover : "transparent", color: C.text, cursor: "pointer", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ height: 44, display: "flex", alignItems: "center" }}><span style={{ width: Math.max(4, p.w * k), height: Math.max(4, p.h * k), border: `1.5px solid ${C.sub}`, borderRadius: 2 }} /></span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, textAlign: "center", lineHeight: 1.25 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: C.sub }}>{p.w} × {p.h}{p.ppi ? ` · ${p.ppi}ppi` : ""}</span>
                </button>
              );
            })}
            {!list.length && <div style={{ gridColumn: "1 / -1", color: C.sub, fontSize: 14, padding: 20 }}>아직 만든 문서가 없어요. 다른 탭에서 크기를 골라 보세요.</div>}
          </div>
          {onSample && ["youtube", "blog", "sns", "realty", "basic"].includes(tab) && (
            <div style={{ padding: "0 16px 16px" }}>
              <SampleGrid key={tab} cat={tab as Cat} compact size={pickedSize} onSample={(l, size, ai, cat) => { onClose(); onSample(l, size, ai, cat); }}
                mine={mine} onMine={onMine ? (t, ai) => { onClose(); onMine(t, ai); } : undefined} onMineRemove={onMineRemove} />
            </div>
          )}
          </div>
        </div>
        <div style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${C.line}`, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.sub }}>사전 설정 세부 정보</div>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} style={{ ...input, fontSize: 16, fontWeight: 700 }} />
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 30px", gap: 8, alignItems: "center", fontSize: 13.5, color: C.sub }}>
            <span>폭</span>{numIn(w, setW)}<span>px</span>
            <span>높이</span>{numIn(h, setH)}<span>px</span>
            <span>해상도</span>{numIn(ppi, setPpi)}<span>ppi</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.sub }}>
            <span style={{ width: 48 }}>방향</span>
            {[false, true].map((pt) => (
              <button key={String(pt)} type="button" title={pt ? "세로" : "가로"} onClick={() => { if (pt !== portrait) { setW(h); setH(w); } }}
                style={{ width: 40, height: 34, borderRadius: 5, border: `1px solid ${portrait === pt ? C.sel : C.line2}`, background: portrait === pt ? C.sel : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: pt ? 12 : 20, height: pt ? 20 : 12, border: `2px solid ${portrait === pt ? C.bg : C.sub}`, borderRadius: 2 }} />
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: C.sub }}>
            <span>색상 모드</span>
            <div style={{ display: "flex", gap: 6 }}>
              {([["rgb", "RGB", "화면용 (SNS·유튜브·블로그)"], ["cmyk", "CMYK", "인쇄용 (명함·전단·배너)"]] as const).map(([v2, t, d2]) => (
                <button key={v2} type="button" onClick={() => setMode(v2)} title={d2}
                  style={{ flex: 1, height: 44, borderRadius: 5, border: `2px solid ${mode === v2 ? C.sel : C.line2}`, background: "transparent", color: C.text, fontFamily: FONT, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <b style={{ fontSize: 13.5 }}>{t}</b><span style={{ fontSize: 11, color: C.dim }}>{v2 === "rgb" ? "화면용" : "인쇄용"}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: C.sub }}>
            <span>배경</span>
            <div style={{ display: "flex", gap: 6 }}>
              {([["white", "흰색", "#fff"], ["#000000", "검정", "#000"], ["transparent", "투명", "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px"]] as const).map(([v, t, bgc]) => (
                <button key={v} type="button" onClick={() => setBg(v)}
                  style={{ flex: 1, height: 36, borderRadius: 5, border: `2px solid ${bg === v ? C.sel : C.line2}`, background: "transparent", color: C.text, fontSize: 13, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: bgc, border: `1px solid ${C.line2}` }} />{t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── 처음 화면 ── */
function PhotoHome({ onNew, onOpen, onRecent, busy, onPreset, top, onSample, onAi, mine, onMine, onMineRemove }: { onNew: () => void; onOpen: () => void; onRecent: (r: Recent) => void; busy: boolean; onPreset: (i: NewInit) => void; top?: React.ReactNode; onSample?: (l: Layout, size: CatSize, ai: boolean, cat: Cat) => void; onAi?: () => void; mine?: MyTpl[] | null; onMine?: (t: MyTpl, ai: boolean) => void; onMineRemove?: (t: MyTpl) => void }) {
  const [theme] = useStudioTheme(false, "photo");
  const b = bridge();
  const [cat, setCat] = useState("");
  const [recent, setRecent] = useState<Recent[] | null>(null);
  const load = useCallback(() => { if (b) b.recent().then(setRecent).catch(() => setRecent([])); else setRecent([]); }, [b]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const catBtn = (id: string, label: string, icon: string) => (
    <button key={id} type="button" onClick={() => setCat(id)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", border: 0, borderRadius: 8, cursor: "pointer", fontFamily: FONT, fontSize: 14.5,
        fontWeight: cat === id ? 800 : 600, color: cat === id ? (theme === "light" ? C.accent : C.text) : C.sub, background: cat === id ? (theme === "light" ? C.accentDim : C.cardHover) : "transparent", boxShadow: cat === id && theme === "light" ? `inset 3px 0 0 ${C.accent}` : "none" }}>
      <Icon name={icon} size={17} />{label}
    </button>
  );
  const group = PRESETS.find((p) => p.id === cat);
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
    {/* 왼쪽 — 만들 것 고르기 (부동산에 필요한 것) */}
    {/* 왼쪽 둘째 칸 — 밝은 화면이면 흰색, 어두운 화면이면 어둡게 (2026-10-23 사장님) */}
    <aside style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, padding: "22px 12px", background: C.panel, borderRight: `1px solid ${C.line}`, fontFamily: FONT }}>
      <h2 style={{ margin: "0 6px 12px", fontSize: 19, fontWeight: 800, color: C.text }}>이미지제작</h2>
      <AiSettingsBox light={theme === "light"} />
      {catBtn("", "최근 파일", "folder")}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.dim, margin: "14px 12px 4px" }}>만들기</div>
      {PRESETS.map((p) => catBtn(p.id, p.label, p.icon))}
    </aside>
    {group ? (
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "26px 28px", color: C.text, fontFamily: FONT }}>
        {top}
        <div style={{ fontSize: 22, fontWeight: 800 }}>{group.label}</div>
        <div style={{ fontSize: 14.5, color: C.sub, marginTop: 6 }}>{group.desc} — 누르면 그 크기로 새 문서를 만들어요.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginTop: 22 }}>
          {group.items.map((it) => {
            const k = Math.min(150 / it.w, 100 / it.h);
            return (
              <button key={it.name} type="button" onClick={() => onPreset({ tab: group.id, preset: it })}
                style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.line}`, background: C.panel, color: C.text, cursor: "pointer", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.sub; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; }}>
                <span style={{ height: 110, display: "flex", alignItems: "center" }}><span style={{ width: Math.max(8, it.w * k), height: Math.max(8, it.h * k), border: `1.5px solid ${C.sub}`, borderRadius: 3, background: C.card }} /></span>
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{it.name}</span>
                <span style={{ fontSize: 12.5, color: C.sub }}>{it.w} × {it.h} px{it.ppi ? ` · ${it.ppi}ppi` : ""}</span>
                {it.note && <span style={{ fontSize: 12, color: C.dim, lineHeight: 1.4 }}>{it.note}</span>}
              </button>
            );
          })}
        </div>
        {group.items.some((x) => x.ppi && x.ppi >= 100) && (
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 18, lineHeight: 1.7 }}>
            인쇄물은 인쇄소에 PNG·JPG(고화질)로 보내요. 화면 색(RGB)으로 만들어져서 인쇄 색이 조금 다를 수 있어요. X배너·현수막은 크게 보는 물건이라 해상도를 낮췄어요 (150·100ppi).
          </div>
        )}
        {onSample && ["youtube", "blog", "sns", "realty", "basic"].includes(group.id) && <SampleGrid key={group.id} cat={group.id as Cat} onSample={onSample} onAi={onAi} mine={mine} onMine={onMine} onMineRemove={onMineRemove} />}
      </div>
    ) : (
    <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "26px 28px", color: C.text, fontFamily: FONT }}>
      {top}
      <div style={{ fontSize: 22, fontWeight: 800 }}>이미지제작</div>
      <div style={{ fontSize: 14.5, color: C.sub, marginTop: 6 }}>포토샵 파일(PSD)을 그대로 열고, 고치고, PSD 로 저장해요. 디자이너와 파일을 주고받을 수 있어요.</div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Btn primary onClick={onNew}><Icon name="plus" size={17} />새 파일</Btn>
        <Btn onClick={onOpen} disabled={busy}><Icon name="open" size={17} />{busy ? "여는 중…" : "열기"}</Btn>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, marginTop: 30, marginBottom: 12 }}>최근 파일</div>
      {recent && !recent.length && <div style={{ fontSize: 14, color: C.sub }}>{b ? "아직 연 파일이 없어요. [열기]로 PSD·사진을 열거나 [새 파일]로 시작하세요. 파일을 이 화면에 끌어다 놓아도 열려요." : "브라우저에서는 최근 파일이 남지 않아요."}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {(recent || []).map((r) => (
          <div key={r.path} style={{ position: "relative" }}>
            <button type="button" onClick={() => !r.missing && onRecent(r)} title={r.path}
              style={{ width: "100%", padding: 0, borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, cursor: r.missing ? "default" : "pointer", overflow: "hidden", textAlign: "left", opacity: r.missing ? 0.45 : 1 }}>
              <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", background: "repeating-conic-gradient(#2a2f3a 0% 25%, #222630 0% 50%) 50% / 16px 16px" }}>
                {r.thumb ? <img src={r.thumb} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} /> : <Icon name="file" size={34} color={C.sub} />}
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{r.missing ? "파일을 찾을 수 없어요" : new Date(r.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </button>
            <button type="button" title="목록에서 빼기" onClick={() => b?.recentRemove(r.path).then(load)}
              style={{ position: "absolute", right: 6, top: 6, width: 22, height: 22, borderRadius: 11, border: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, cursor: "pointer", padding: 0 }}>✕</button>
          </div>
        ))}
      </div>
      {onSample && (
        <SampleGrid cat="youtube" oneRow title="AI 템플릿" onSample={onSample} onAi={onAi} mine={mine} onMine={onMine} onMineRemove={onMineRemove}
          picks={[{ id: "yt_split", cat: "youtube" }, { id: "band", cat: "youtube" }, { id: "blog_clean", cat: "blog" }, { id: "card", cat: "sns" }, { id: "sns_cover", cat: "sns" }, { id: "flyer_a", cat: "realty" }, { id: "window", cat: "realty" }, { id: "yt_price", cat: "youtube" }]} />
      )}
    </div>
    )}
    </div>
  );
}

const BLEND_NAMES: [NonNullable<PLayer["blendMode"]>, string][] = [
  ["normal", "표준"], ["multiply", "곱하기"], ["screen", "스크린"], ["overlay", "오버레이"], ["soft light", "소프트 라이트"], ["hard light", "하드 라이트"],
  ["darken", "어둡게 하기"], ["lighten", "밝게 하기"], ["color dodge", "색상 닷지"], ["color burn", "색상 번"], ["linear dodge", "선형 닷지(추가)"],
  ["difference", "차이"], ["exclusion", "제외"], ["hue", "색조"], ["saturation", "채도"], ["color", "색상"], ["luminosity", "광도"],
];

/* ── 이미지 편집 ── */
/** 다른 편집기 안에서 잠깐 여는 이미지 편집 (영상 › SNS 올리기 › 썸네일 고치기, 2026-10-22) — 문서 하나를 열고 [이 썸네일 쓰기]·Ctrl+S 로 돌려준다 */
export type PhotoEmbed = { doc: Doc; title: string; useLabel?: string; onUse: (png: Uint8Array, psd: Uint8Array) => void | Promise<void>; onCancel: () => void };

export default function PhotoStudio({ menu, embed }: { menu: React.ReactNode; embed?: PhotoEmbed }) {
  useStudioTheme(!embed, "photo"); // 밝은/어두운 화면 — 이미지제작 따로 기억 (2026-10-23)
  const b = bridge();
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const [sel, setSelRaw] = useState<string | null>(null);
  const [extra, setExtra] = useState<string[]>([]); // 함께 고른 다른 레이어들 (Shift·Ctrl 로)
  const [maskEdit, setMaskEditS] = useState(false); // 고른 레이어의 마스크에 칠하는 중
  const setSelS = (k: string | null) => { setSelRaw(k); setExtra([]); };
  const [editing, setEditing] = useState<string | null>(null);
  const [side, setSide] = useState<"" | "sticker" | "fx" | "tpl" | "picto">("");
  const [designOpen, setDesignOpen] = useState(false); // AI 자동 디자인 창
  const [myTpls, setMyTpls] = useState<MyTpl[] | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newInit, setNewInit] = useState<NewInit | null>(null); // 처음 화면에서 고른 종류 (새 문서 창의 탭·크기)
  const [closing, setClosing] = useState<Doc | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false); // 인쇄용 파일 창
  const [fltDlg, setFltDlg] = useState<null | { id: string; k: string; orig: HTMLCanvasElement; mask: HTMLCanvasElement | null }>(null); // 필터 대화상자
  const lastFilter = useRef<{ id: string; v: FVals } | null>(null); // 필터 › 마지막 필터 (Alt+Ctrl+F)
  const [imgDlg, setImgDlg] = useState<"" | "size" | "canvas" | "trim">(""); // 이미지 › 이미지 크기 · 캔버스 크기 · 재단
  const [subOpen, setSubOpen] = useState(""); // 메뉴의 ▸ 하위 메뉴
  const [aiBar, setAiBar] = useState(false); // 도구 줄 [AI] — AI 요청바 (포토샵 상황별 작업 표시줄)
  const [aiBusy, setAiBusy] = useState("");
  const [printDlg, setPrintDlg] = useState<null | { src: HTMLCanvasElement; sel: HTMLCanvasElement | null }>(null); // 파일 › 인쇄 (Ctrl+P)
  const [bleedMm, setBleedMm] = useState(2);
  const [colorEdit, setColorEdit] = useState<"" | "fg" | "bg">(""); // CMYK 색 고르기 칸
  const [tool, setToolS] = useState<Tool>("move"); // 왼쪽 도구창 (포토샵처럼)
  // 묶음마다 마지막에 쓴 도구 — 이 PC 에 기억 (다음에 열어도 그 도구가 대표로, 포토샵처럼)
  const [groupPick, setGroupPick] = useState<Record<string, Tool>>(() => {
    try { return JSON.parse(localStorage.getItem("gsp-tool-groups") || "{}"); } catch { return {}; }
  });
  const setTool = (t: Tool) => {
    setToolS(t);
    setGroupPick((o) => {
      const n = { ...o, [groupOf(t).key]: t };
      try { localStorage.setItem("gsp-tool-groups", JSON.stringify(n)); } catch {}
      return n;
    });
  };
  const flyHold = useRef(false); // 누른 채로 연 목록 — 손을 뗀 곳의 도구로 (포토샵처럼)
  const [fly, setFly] = useState(""); // 펼친 도구 묶음
  const [flyAt, setFlyAt] = useState({ x: 0, y: 0 }); // 펼친 메뉴 자리 (도구창 칸 밖으로 — 화면 위에 띄운다)
  const flyT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selMode, setSelMode] = useState<SelMode>("new");
  // 이동 도구 [자동 선택] · 대상 (레이어/그룹) — 이 PC 에 기억. 기본은 켜짐 (처음 쓰는 회원이 쉽게)
  const [autoSel, setAutoSelS] = useState<{ on: boolean; group: boolean }>(() => { try { return { on: true, group: false, ...JSON.parse(localStorage.getItem("gsp-autosel") || "{}") }; } catch { return { on: true, group: false }; } });
  const setAutoSel = (p: Partial<{ on: boolean; group: boolean }>) => setAutoSelS((o) => { const n = { ...o, ...p }; try { localStorage.setItem("gsp-autosel", JSON.stringify(n)); } catch {} return n; });
  const [layerMenu, setLayerMenu] = useState<null | { x: number; y: number; keys: string[] }>(null); // 오른쪽 클릭 — 그 자리 레이어 목록
  // 페더 — 선택 윤곽·올가미로 새로 그리는 선택의 가장자리를 부드럽게 (포토샵 옵션줄처럼, 이 PC 에 기억)
  const [feather, setFeatherS] = useState(() => { try { return Math.max(0, Number(localStorage.getItem("gsp-feather")) || 0); } catch { return 0; } });
  const setFeather = (n: number) => { const v = Math.max(0, Math.min(250, Math.round(n) || 0)); setFeatherS(v); try { localStorage.setItem("gsp-feather", String(v)); } catch {} };
  const [wandOpt, setWandOpt] = useState({ contig: true, all: false });
  const [crop, setCrop] = useState<Box | null>(null);
  const [shapeOpt, setShapeOpt] = useState({ radius: 0, lw: 6 });
  const [penMode, setPenMode] = useState<"shape" | "sel">("shape"); // 펜 — 닫으면 모양 레이어 / 선택 영역
  const [panelsHidden, setPanelsHidden] = useState(false); // Tab — 도구창·옵션줄·오른쪽 패널 숨기기
  const lastAdjust = useRef<Adjust | null>(null); // Ctrl+F 다시 적용
  const [strokeDlg, setStrokeDlg] = useState(false); // 편집 › 획
  const [strokeOpt, setStrokeOpt] = useState<StrokeOpt & { newLayer: boolean }>({ width: 6, pos: "center", color: "#000000", dash: "solid", opacity: 1, newLayer: true });
  const [fillDlg, setFillDlg] = useState(false); // 편집 › 칠 (Shift+F5)
  const [fillOpt, setFillOpt] = useState<FillOpt & { newLayer: boolean }>({ kind: "fg", color: "#1A3A6B", color2: "#FFFFFF", grad: "down", opacity: 1, newLayer: true });
  const [warpDlg, setWarpDlg] = useState<null | { k: string; look: ReturnType<typeof lookOf>; left: number; top: number }>(null); // 문자 › 텍스트 뒤틀기
  const [adjDlg, setAdjDlg] = useState<null | { kind: AdjKind; k: string; orig: HTMLCanvasElement; mask: HTMLCanvasElement | null; hist: Uint32Array }>(null); // 이미지 › 조정
  const [modDlg, setModDlg] = useState<null | { kind: "expand" | "contract" | "feather" | "border" | "smooth"; n: number }>(null); // 선택 › 수정
  const [vis, setVisS] = useState<Vis>(readVis);
  const setVis = (p: Partial<Vis>) => setVisS((o) => { const n = { ...o, ...p }; try { localStorage.setItem(VIS_KEY, JSON.stringify(n)); } catch {} return n; });
  const [paint, setPaintS] = useState<PaintOpts>(readPaint);
  const setPaint = (p: Partial<PaintOpts>) => setPaintS((o) => { const n = { ...o, ...p }; try { localStorage.setItem(PAINT_KEY, JSON.stringify(n)); } catch {} return n; });
  const fgIn = useRef<HTMLInputElement>(null), bgIn = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(""); // 맨 위 메뉴줄에서 펼친 메뉴
  const area = useRef<HTMLDivElement>(null); // 그림판 자리 (떠 있는 창의 기준)
  const tabBar = useRef<HTMLDivElement>(null);
  const [dockHint, setDockHint] = useState(false); // 창을 탭 줄 위로 끌고 있음 → 놓으면 탭으로
  const [keysOpen, setKeysOpen] = useState(false);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((t: string) => {
    setToast(t);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(""), 3200);
  }, []);
  const doc = store.home ? null : store.docs.find((d) => d.id === store.active) || null;
  // 왼쪽 메뉴 줄 숨기기 — 영상 편집기와 같게: 문서가 열려 있을 때만 숨길 수 있고, 메뉴 줄 맨 앞 [»]로 다시 보이기 (2026-10-19 사장님)
  const [railHidden, setRailHidden] = useState(false);
  useEffect(() => {
    setRailHidden(Boolean((window as unknown as { __studioRailHidden?: boolean }).__studioRailHidden));
    const on = (e: Event) => setRailHidden(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("studio:rail-state", on);
    return () => window.removeEventListener("studio:rail-state", on);
  }, []);
  const hasDoc = Boolean(doc);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("studio:editor", { detail: hasDoc }));
  }, [hasDoc]);
  useEffect(() => () => { window.dispatchEvent(new CustomEvent("studio:editor", { detail: false })); }, []);
  const setSel = (k: string | null) => { if (k !== sel) setMaskEditS(false); setSelS(k); setSide(""); };
  /** 지금 고른 레이어 모두 (맨 처음이 속성 칸에 보이는 것) */
  const allSel = (): string[] => {
    if (!doc || !sel) return [];
    return [sel, ...extra.filter((x) => x !== sel)].filter((x) => findLayer(kids(doc.psd), x));
  };
  /** 하나 더하기/빼기 (Ctrl) · 사이 모두 (Shift — keys) */
  const pickSel = (k: string, keys: string[] | null) => {
    setSide("");
    if (keys) { setSelRaw(k); setExtra(keys.filter((x) => x !== k)); return; }
    const cur = allSel();
    if (cur.includes(k)) {
      const rest = cur.filter((x) => x !== k);
      setSelRaw(k === sel ? rest[rest.length - 1] || null : sel);
      setExtra(rest.filter((x) => x !== (k === sel ? rest[rest.length - 1] : sel)));
    } else { setSelRaw(k); setExtra(cur); }
  };
  /** 고른 레이어들을 문서 순서(아래부터)로 — 그룹 안의 것은 그 그룹을 같이 골랐으면 뺀다 */
  const selInOrder = (): PLayer[] => {
    if (!doc) return [];
    const ks = new Set(allSel());
    const out: PLayer[] = [];
    walk(kids(doc.psd), (l, _d, parent) => {
      if (!ks.has(l._k!)) return;
      let p = parent;
      while (p) { if (ks.has(p._k!)) return; p = parentList(kids(doc.psd), p._k!)?.parent || null; }
      out.push(l);
    });
    return out;
  };

  const syncDirty = () => { b?.setDirty?.(store.docs.filter((d) => d.dirty).length).catch(() => {}); };
  /** 고치기 — 되돌리기 기록을 남기고, 문서를 "고침" 으로. key 가 같으면 이어지는 고치기(끌개)로 보고 기록을 하나로 */
  const mutate = useCallback((fn: () => void, key?: string) => {
    const d = store.docs.find((x) => x.id === store.active);
    if (!d) return;
    const h = histOf(d.id);
    const now = Date.now();
    if (!key || key !== h.key || now - h.at > 1200) {
      h.undo.push(snapOf(d));
      if (h.undo.length > 60) h.undo.shift();
    }
    h.key = key || "";
    h.at = now;
    h.redo = [];
    fn();
    d.dirty = true;
    d.pristine = false;
    bump();
    syncDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump]);
  const restore = (d: Doc, s: Snap) => {
    d.psd.children = s.children;
    d.psd.width = s.w;
    d.psd.height = s.h;
    setGuides(d, s.guides);
    d.dirty = true;
    d.pristine = false;
  };
  const undo = () => {
    if (!doc) return;
    const h = histOf(doc.id);
    const s = h.undo.pop();
    if (!s) return;
    h.redo.push(snapOf(doc));
    h.key = "";
    restore(doc, s);
    if (sel && !findLayer(kids(doc.psd), sel)) setSel(null);
    bump();
    syncDirty();
  };
  const redo = () => {
    if (!doc) return;
    const h = histOf(doc.id);
    const s = h.redo.pop();
    if (!s) return;
    h.undo.push(snapOf(doc));
    h.key = "";
    restore(doc, s);
    bump();
    syncDirty();
  };

  /* 여러 쪽 (2026-10-23) — 쪽 바꾸기·더하기·복제·지우기·옮기기. 선택은 풀고, 되돌리기 기록은 쪽마다 */
  const pageOp = (fn: (d: Doc) => void, dirty = true) => {
    if (!doc || editing) return;
    const w0 = doc.psd.width, h0 = doc.psd.height;
    withPageHist(doc, () => fn(doc));
    setSel(null);
    setExtra([]);
    sels.delete(doc.id);
    if (dirty) { doc.dirty = true; syncDirty(); }
    if (doc.psd.width !== w0 || doc.psd.height !== h0) fitDoc(doc.id);
    else bump();
  };
  const goPage = (i: number) => { if (doc && i !== pageIndex(doc) && i >= 0 && i < pageCount(doc)) pageOp((d) => gotoPage(d, i), false); };
  const newPage = (dup: boolean) => pageOp((d) => { addPage(d, dup); });
  const delPage = (i: number) => {
    if (!doc || pageCount(doc) <= 1) return;
    if (!window.confirm(`${i + 1}쪽을 지울까요? 지운 쪽은 되돌릴 수 없어요.`)) return;
    pageOp((d) => removePage(d, i));
  };
  const shiftPage = (i: number, dir: -1 | 1) => { if (doc && i + dir >= 0 && i + dir < pageCount(doc)) pageOp((d) => movePage(d, i, i + dir)); };

  /* 글꼴 — 아직 안 받은 글꼴이면 받은 뒤 한 번 더 그린다 */
  const applyText = useCallback((l: PLayer, look: PLayer["_look"] & object) => {
    applyLook(l, look);
    const fam = look.font || "Pretendard";
    if (typeof document !== "undefined" && !document.fonts.check(`20px '${fam}'`)) {
      loadFont(fam).then(() => {
        if (l._look && (l._look.font || "Pretendard") === fam) {
          applyLook(l, l._look);
          bump();
        }
      }).catch(() => {});
    }
  }, [bump]);

  /* 웹용으로 저장 (Alt+Shift+Ctrl+S) — 형식 · 화질 · 크기, 파일 크기 미리 */
  const [webDlg, setWebDlg] = useState<null | { fmt: WebFmt; q: number; scale: number; size?: number; busy?: boolean }>(null);
  useEffect(() => {
    if (!webDlg || !doc) return;
    let stop = false;
    const t = setTimeout(() => {
      void webBytes(doc, webDlg.fmt, webDlg.q, webDlg.scale).then((bs) => { if (!stop) setWebDlg((o) => (o ? { ...o, size: bs.length } : o)); }).catch(() => {});
    }, 250);
    return () => { stop = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webDlg?.fmt, webDlg?.q, webDlg?.scale, doc?.id]);
  const doWebSave = async () => {
    if (!doc || !webDlg) return;
    setWebDlg({ ...webDlg, busy: true });
    try {
      const bytes = await webBytes(doc, webDlg.fmt, webDlg.q, webDlg.scale);
      if (b) {
        const r = await b.save({ file: doc.path?.replace(/\.\w+$/, `.${webDlg.fmt}`), name: doc.name, ext: webDlg.fmt, bytes, ask: true });
        if (r.canceled) { setWebDlg({ ...webDlg, busy: false }); return; }
        if (r.error) say(`저장하지 못했어요: ${r.error}`);
        else say(`웹용으로 저장했어요 — ${r.name}`);
      } else download(bytes, `${doc.name}.${webDlg.fmt}`);
      setWebDlg(null);
    } catch (e) {
      say(`저장하지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
      setWebDlg({ ...webDlg, busy: false });
    }
  };
  /* 자동 저장 — 고치고 4초 쉬면 고친 문서를 PC 임시 칸에 PSD 로. 저장·닫기하면 지운다, 앱이 갑자기 꺼지면 다음에 복구 */
  const autoVer = useRef(new Map<string, number>());
  useEffect(() => {
    if (!b?.autosaveWrite) return;
    const t = setTimeout(() => {
      for (const d of store.docs) {
        if (!d.dirty || autoVer.current.get(d.id) === tick) continue;
        autoVer.current.set(d.id, tick);
        try { void b.autosaveWrite!({ id: d.id, name: d.name, file: d.path, bytes: savePsdBytes(d) }); } catch {}
      }
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  const [autoList, setAutoList] = useState<AutoItem[]>([]);
  useEffect(() => {
    if (!store.home || !b?.autosaveList) return;
    b.autosaveList().then((l) => setAutoList(l.filter((x) => !store.docs.some((d) => d.id === x.id)))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.home]);
  const recover = async (it: AutoItem) => {
    if (!b?.autosaveRead) return;
    const r = await b.autosaveRead(it.id);
    if (!r.bytes) return say(r.error || "복구하지 못했어요");
    try {
      const d = openPsdBytes(`${it.name}.psd`, r.bytes);
      d.name = it.name;
      if (it.file) { d.path = it.file; d.fromFile = !/\.psd$/i.test(it.file); }
      d.dirty = true;
      addDoc(d);
      void b.autosaveWrite?.({ id: d.id, name: d.name, file: d.path, bytes: r.bytes });
      void b.autosaveClear?.(it.id);
      setAutoList((l) => l.filter((x) => x.id !== it.id));
      syncDirty();
      say(`복구했어요 — ${it.name} (저장해 두세요)`);
    } catch (e) {
      say(`복구하지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const discardAuto = (it: AutoItem) => { void b?.autosaveClear?.(it.id); setAutoList((l) => l.filter((x) => x.id !== it.id)); };

  /* 문서 고르기 · 떠 있는 창 */
  const activate = (id: string) => {
    if (store.active !== id) { setSel(null); setEditing(null); }
    store.active = id;
    const r = store.float.get(id);
    if (r) { if (r.z !== store.zTop) r.z = ++store.zTop; } else store.dock = id;
    bump();
  };
  const fitDoc = (id: string) => { store.fit.set(id, (store.fit.get(id) || 0) + 1); bump(); };
  const floatDoc = (id: string, at?: { x: number; y: number }) => {
    const a = area.current?.getBoundingClientRect();
    const aw = a?.width || 1000, ah = a?.height || 700;
    const n = store.float.size;
    const w = Math.round(Math.max(360, aw * 0.58)), h = Math.round(Math.max(260, ah * 0.62));
    const x = at ? at.x - w / 2 : 40 + (n % 6) * 28, y = at ? at.y - 14 : 30 + (n % 6) * 28;
    store.float.set(id, { x: Math.round(x), y: Math.round(Math.max(0, y)), w, h, z: ++store.zTop });
    store.view.delete(id); // 새 창 크기에 맞춰 다시
    if (store.dock === id) store.dock = "";
    activate(id);
  };
  const dockDoc = (id: string) => {
    store.float.delete(id);
    store.view.delete(id);
    activate(id);
  };
  const dockAll = () => {
    for (const id of [...store.float.keys()]) { store.float.delete(id); store.view.delete(id); }
    if (doc) activate(doc.id); else bump();
  };
  /** 바둑판식 — 모든 문서를 떠 있는 창으로 나란히 */
  const tileAll = () => {
    const a = area.current?.getBoundingClientRect();
    if (!a || !store.docs.length) return;
    const n = store.docs.length, cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    const w = Math.floor(a.width / cols), h = Math.floor(a.height / rows);
    store.docs.forEach((d, i) => {
      store.float.set(d.id, { x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h, z: ++store.zTop });
      store.view.delete(d.id);
    });
    store.dock = "";
    if (doc) activate(doc.id); else bump();
  };
  /** 떠 있는 창 옮기기 · 크기 — 제목줄 · 오른쪽 아래 모서리. 제목줄을 탭 줄에 놓으면 다시 탭으로 */
  const dragWin = (id: string, mode: "move" | "size", e: { clientX: number; clientY: number }, start?: FloatRect) => {
    const r0 = { ...(start || store.float.get(id)!) };
    const sx = e.clientX, sy = e.clientY;
    const overTabs = (x: number, y: number) => {
      const t = tabBar.current?.getBoundingClientRect();
      return Boolean(t && y >= t.top - 6 && y <= t.bottom + 4 && x >= t.left && x <= t.right);
    };
    const mv = (ev: PointerEvent) => {
      const r = store.float.get(id);
      if (!r) return;
      const a = area.current?.getBoundingClientRect();
      const aw = a?.width || 9999, ah = a?.height || 9999;
      if (mode === "move") {
        r.x = Math.round(Math.min(aw - 80, Math.max(80 - r.w, r0.x + ev.clientX - sx)));
        r.y = Math.round(Math.min(ah - 30, Math.max(-28, r0.y + ev.clientY - sy)));
        setDockHint(overTabs(ev.clientX, ev.clientY));
      } else {
        r.w = Math.round(Math.max(240, r0.w + ev.clientX - sx));
        r.h = Math.round(Math.max(160, r0.h + ev.clientY - sy));
      }
      bump();
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      setDockHint(false);
      if (mode === "move" && overTabs(ev.clientX, ev.clientY)) dockDoc(id);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  /** 탭을 아래로 끌어내면 떠 있는 창으로 (포토샵처럼) */
  const tabDown = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const sy = e.clientY;
    const mv = (ev: PointerEvent) => {
      const t = tabBar.current?.getBoundingClientRect();
      if (!t || ev.clientY < t.bottom + 18 || Math.abs(ev.clientY - sy) < 24) return;
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      const a = area.current!.getBoundingClientRect();
      floatDoc(id, { x: ev.clientX - a.left, y: ev.clientY - a.top });
      dragWin(id, "move", ev, store.float.get(id)); // 손을 뗄 때까지 창을 따라 옮김
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  /** 레이어를 다른 문서로 복사 — 손을 뗀 자리에 (gx·gy = 레이어 안에서 잡은 곳) */
  const copyLayerTo = (targetId: string, l: PLayer, cx: number, cy: number, gx: number, gy: number) => {
    const t = store.docs.find((d) => d.id === targetId);
    if (!t) return;
    const c = duplicate(l);
    const tn = new Set<string>();
    walkNames(kids(t.psd), (nm) => tn.add(nm));
    c.name = tn.has(l.name || "레이어") ? copyName(l.name || "레이어", t) : l.name || "레이어";
    const box = document.querySelector<HTMLElement>(`[data-doc="${targetId}"]`)?.getBoundingClientRect();
    const v = store.view.get(targetId);
    const b = boundsOfL(c);
    if (b) {
      const px = box && v ? (cx - box.left - v.x) / v.z : t.psd.width / 2;
      const py = box && v ? (cy - box.top - v.y) / v.z : t.psd.height / 2;
      offsetLayer(c, Math.round(px - gx - b.x), Math.round(py - gy - b.y));
    }
    activate(targetId);
    mutate(() => { if (t.psd.children) t.psd.children.push(c); else t.psd.children = [c]; });
    setSelS(c._k!);
    say(`"${c.name}" 레이어를 ${t.name} 에 복사했어요`);
  };
  const docUnder = (cx: number, cy: number) => (document.elementFromPoint(cx, cy)?.closest("[data-doc]") as HTMLElement | null)?.dataset.doc || "";

  /* ── 선택 영역 · 픽셀 고치기 · 복사/붙여넣기 · 보정 (포토샵 단축키) ── */
  const selOf = (d?: Doc | null) => (d ? sels.get(d.id)?.cur || null : null);
  /** vec = 모양 하나로 된 선택이면 그 모양 (획을 파선·점선으로 그릴 때) */
  const setSelMask = (m: HTMLCanvasElement | null, vec: SelShape | null = null) => {
    if (!doc) return;
    const o = sels.get(doc.id) || { cur: null, prev: null };
    if (o.cur && o.cur !== m) { o.prev = o.cur; o.pvec = o.vec; }
    o.cur = m;
    o.vec = m ? vec : null;
    sels.set(doc.id, o);
    bump();
  };
  const onSelectShape = (sh: SelShape, mode: SelMode) => {
    if (!doc) return;
    const W = doc.psd.width, H = doc.psd.height;
    let m: HTMLCanvasElement | null;
    if (sh.kind === "wand") {
      // 자동 선택 — 고른 레이어 기준 (포토샵 기본), [모든 레이어 샘플링] 이면 보이는 그대로
      const cur = sel ? findLayer(kids(doc.psd), sel) : null;
      const one = !wandOpt.all && cur && cur.canvas && !cur.children && !cur.hidden;
      m = one ? wandMask(cur.canvas!, cur.left || 0, cur.top || 0, W, H, sh.x, sh.y, paint.tol, wandOpt.contig) : wandMask(composite(doc), 0, 0, W, H, sh.x, sh.y, paint.tol, wandOpt.contig);
      if (!m) return;
    } else {
      m = shapeMask(W, H, sh);
      if (feather > 0) m = modifyMask(m, "feather", feather); // 가장자리 부드럽게
    }
    const base = selOf(doc);
    setSelMask(combine(base, m, mode), sh.kind !== "wand" && (mode === "new" || !base) ? sh : null);
  };
  /** 픽셀을 고칠 레이어 — 고른 그림 레이어만 (글자·도형은 래스터화 뒤에) */
  const pixLayer = (): PLayer | null => {
    if (!doc) return null;
    const l = sel ? findLayer(kids(doc.psd), sel) : null;
    if (!l) { say("레이어를 먼저 골라 주세요"); return null; }
    if (!paintable(l)) { say("그림 레이어에서만 돼요 — 글자·도형은 [레이어 › 래스터화] 뒤에 해 주세요"); return null; }
    return l;
  };
  useEffect(() => {
    const l = doc && sel ? findLayer(kids(doc.psd), sel) : null;
    if (maskEdit && !l?.mask?.canvas) setMaskEditS(false);
  });
  /* ── 레이어 마스크 ── */
  const setMaskEdit = (on: boolean) => {
    setMaskEditS(on);
    // 마스크에는 회색으로만 칠한다 — 전경·배경색을 같은 밝기의 회색으로 (포토샵처럼)
    if (on && (grayOf(paint.fg) !== paint.fg.toUpperCase() || grayOf(paint.bg) !== paint.bg.toUpperCase())) setPaint({ fg: "#FFFFFF", bg: "#000000" });
  };
  const maskLayer = () => {
    const l = doc && sel ? findLayer(kids(doc.psd), sel) : null;
    return l && maskEdit && l.mask?.canvas ? l : null;
  };
  /** 마스크 추가 — 선택 영역이 있으면 그 안만 보이기 (hide 면 그 안만 숨기기), 없으면 모두 보이기 / 모두 숨기기 */
  const addMask = (hide = false, useSel = true) => {
    if (!doc || !sel) return say("마스크를 붙일 레이어를 먼저 골라 주세요");
    const l = findLayer(kids(doc.psd), sel);
    if (!l || l.children) return say("그룹에는 아직 마스크를 붙일 수 없어요 — 레이어를 골라 주세요");
    if (l.mask?.canvas) return say("이미 마스크가 있어요");
    const m = useSel ? selOf(doc) : null;
    mutate(() => { l.mask = makeMask(doc.psd.width, doc.psd.height, hide, m); });
    if (m) setSelMask(null);
    setMaskEdit(true);
  };
  const maskOp = (op: "apply" | "delete" | "toggle") => {
    const l = doc && sel ? findLayer(kids(doc.psd), sel) : null;
    if (!l?.mask?.canvas) return;
    if (op === "apply") mutate(() => applyMask(l));
    else if (op === "delete") mutate(() => { delete l.mask; });
    else mutate(() => { l.mask = { ...l.mask!, disabled: !l.mask!.disabled }; });
    if (op !== "toggle") setMaskEditS(false);
  };
  /** 마스크에 칠할 대리 레이어 — 마스크를 문서 크기 새 그림으로 넓혀 두고 (되돌리기 기록용) 그 그림을 칠한다 */
  const maskProxy = (l: PLayer): PLayer => {
    const W = doc!.psd.width, H = doc!.psd.height;
    mutate(() => { l.mask = fullMask(l.mask!, W, H); });
    return { _k: `mask:${l._k}`, _maskOf: l._k, name: "마스크", canvas: l.mask!.canvas, left: 0, top: 0, right: W, bottom: H };
  };
  const clearSel = () => {
    const ml = maskLayer();
    if (ml && selOf(doc)) { fillWith(paint.bg); return; } // 마스크에서 Delete = 배경색 (포토샵처럼)
    const l = pixLayer(), m = selOf(doc);
    if (!l || !m) return;
    mutate(() => { delete l._src; l.canvas = clearInside(l.canvas!, m, l.left || 0, l.top || 0); trimLayer(l); });
  };
  /** 칠하기 — Alt+Backspace 전경색 · Ctrl+Backspace 배경색 (선택 영역 안, 없으면 레이어 전체) */
  const fillWith = (color: string) => {
    if (!doc) return;
    const ml = maskLayer();
    if (ml) {
      // 마스크 — 선택 영역 안 (없으면 전체) 을 그 색의 회색으로
      const W = doc.psd.width, H = doc.psd.height, m = selOf(doc);
      mutate(() => { const fm = fullMask(ml.mask!, W, H); fm.canvas = fillInside(fm.canvas!, m, 0, 0, grayOf(color)); ml.mask = fm; });
      return;
    }
    const cur = sel ? findLayer(kids(doc.psd), sel) : null;
    const l = paintable(cur) ? cur : newLayer("칠");
    if (!l) return;
    const m = selOf(doc);
    mutate(() => { preparePaint(l, doc.psd.width, doc.psd.height); l.canvas = fillInside(l.canvas!, m, l.left || 0, l.top || 0, color); trimLayer(l); });
  };
  /** 선택 영역의 그림 (없으면 레이어 통째로) → 새 레이어 거리 */
  const pieceOf = (cut: boolean): PLayer | null => {
    if (!doc) return null;
    const l = sel ? findLayer(kids(doc.psd), sel) : null;
    const m = selOf(doc);
    if (!l) { say("레이어를 먼저 골라 주세요"); return null; }
    if (!m) return duplicate(l);
    if (!l.canvas || l.children) { say("그림이 있는 레이어를 골라 주세요"); return null; }
    const ex = extract(l.canvas, l.left || 0, l.top || 0, m);
    if (!ex) return null;
    if (cut) {
      if (!paintable(l)) { say("그림 레이어에서만 잘라낼 수 있어요"); return null; }
      mutate(() => { delete l._src; l.canvas = clearInside(l.canvas!, m, l.left || 0, l.top || 0); });
    }
    return { _k: uid(), name: l.name || "레이어", canvas: ex.c, left: ex.x, top: ex.y, right: ex.x + ex.c.width, bottom: ex.y + ex.c.height };
  };
  /** Ctrl+J 선택 영역 복사한 레이어 · Shift+Ctrl+J 잘라낸 레이어 (선택이 없으면 레이어 복제) */
  const toNewLayer = (cut: boolean) => {
    if (!doc || !sel) return;
    if (!selOf(doc)) { void act(sel, "dup"); return; }
    const piece = pieceOf(cut);
    if (!piece) return;
    piece.name = copyName(piece.name || "레이어");
    insert(piece);
  };
  const copySel = (cut: boolean) => {
    if (!doc || !sel) return;
    const m = selOf(doc);
    const piece = pieceOf(cut && Boolean(m));
    if (!piece) return;
    clip = { layer: piece, w: piece.canvas?.width || 0, h: piece.canvas?.height || 0, sys: false };
    // 다른 프로그램에도 붙여넣을 수 있게 시스템 클립보드에도 그림으로
    const c = piece.canvas;
    const mine = clip;
    if (c && typeof ClipboardItem !== "undefined") {
      c.toBlob((blob) => {
        if (!blob) return;
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => { mine.sys = true; }).catch(() => {});
      }, "image/png");
    }
    if (cut && !m) void act(sel, "del");
    say(cut ? "잘라냈어요" : "복사했어요");
  };
  const pasteClip = () => {
    if (!doc || !clip) return;
    const c = duplicate(clip.layer);
    // 같은 이름이 이 문서에 있으면 "복사" 를 붙인다 (다른 문서로 처음 붙이면 이름 그대로)
    const names = new Set<string>();
    walkNames(kids(doc.psd), (nm) => names.add(nm));
    c.name = names.has(clip.layer.name || "레이어") ? copyName(clip.layer.name || "레이어") : clip.layer.name || "레이어";
    const b = boundsOfL(c);
    // 문서 밖이면 가운데로
    if (b && (b.x > doc.psd.width || b.y > doc.psd.height || b.x + b.w < 0 || b.y + b.h < 0)) offsetLayer(c, Math.round((doc.psd.width - b.w) / 2 - b.x), Math.round((doc.psd.height - b.h) / 2 - b.y));
    insert(c);
  };
  const adjust = (kind: Adjust) => {
    const l = pixLayer();
    if (!l || !doc) return;
    const m = selOf(doc);
    mutate(() => {
      delete l._src;
      const res = adjustCanvas(l.canvas!, kind);
      l.canvas = m ? clipTo(l.canvas!, res, m, l.left || 0, l.top || 0) : res;
    });
    lastAdjust.current = kind;
    say(ADJUST_NAME[kind]);
  };
  /* 보정 대화상자 — 여는 동안은 미리보기 (기록 없이), 확인하면 되돌리기 기록 한 번 */
  const openAdj = (kind: AdjKind) => {
    const l = pixLayer();
    if (!l || !doc) return;
    setAdjDlg({ kind, k: l._k!, orig: l.canvas!, mask: selOf(doc), hist: histogram(l.canvas!) });
  };
  const adjResult = <K extends AdjKind>(a: NonNullable<typeof adjDlg>, l: PLayer, v: AdjVal[K]) => {
    const res = applyAdj(a.orig, a.kind as K, v);
    return a.mask ? clipTo(a.orig, res, a.mask, l.left || 0, l.top || 0) : res;
  };
  /* ── 필터 (포토샵 필터 메뉴) — 값이 있으면 대화상자(미리보기), 없으면 바로. 선택 영역이 있으면 그 안만 ── */
  const filterCtx = () => ({ fg: paint.fg, bg: paint.bg });
  const filterRun = (id: string, orig: HTMLCanvasElement, mask: HTMLCanvasElement | null, l: PLayer, v: FVals) => {
    const res = FILTERS[id].run(orig, v, filterCtx());
    return mask ? clipTo(orig, res, mask, l.left || 0, l.top || 0) : res;
  };
  const openFilter = (id: string, again = false) => {
    const f = FILTERS[id];
    const l = pixLayer();
    if (!f || !l || !doc) return;
    if (!f.params?.length || again) {
      const v = again && lastFilter.current?.id === id ? lastFilter.current.v : {};
      setBusy(`${f.name} 적용 중…`);
      setTimeout(() => {
        try {
          const res = filterRun(id, l.canvas!, selOf(doc), l, v);
          mutate(() => { delete l._src; l.canvas = res; });
          lastFilter.current = { id, v };
          say(f.name);
        } finally {
          setBusy("");
        }
      }, 20);
      return;
    }
    setFltDlg({ id, k: l._k!, orig: l.canvas!, mask: selOf(doc) });
  };
  const fltLayer = () => (fltDlg && doc ? findLayer(kids(doc.psd), fltDlg.k) : null);
  const fltPreview = (v: FVals | null) => {
    const l = fltLayer();
    if (!l || !fltDlg) return;
    l.canvas = v ? filterRun(fltDlg.id, fltDlg.orig, fltDlg.mask, l, v) : fltDlg.orig;
    bump();
  };
  const fltOk = (v: FVals) => {
    const l = fltLayer();
    if (l && fltDlg) {
      const res = filterRun(fltDlg.id, fltDlg.orig, fltDlg.mask, l, v);
      l.canvas = fltDlg.orig;
      mutate(() => { delete l._src; l.canvas = res; });
      lastFilter.current = { id: fltDlg.id, v };
    }
    setFltDlg(null);
  };
  const fltCancel = () => {
    const l = fltLayer();
    if (l && fltDlg) { l.canvas = fltDlg.orig; bump(); }
    setFltDlg(null);
  };
  /** AI 필터 — 회원 이미지 AI 로 (결과는 새 레이어) */
  const aiFilter = (prompt: string) => {
    if (!selL || isText(selL) || !selL.canvas || selL.children) return say("그림 레이어를 골라 주세요");
    void runAi("edit", prompt);
  };
  /* ── AI 요청바 — 회원 본인 이미지 AI (앱) 로. 결과는 언제나 새 레이어 (원본은 그대로), 1장 ── */
  const pngBytes = (c: HTMLCanvasElement) => new Promise<Uint8Array>((res, rej) => c.toBlob((bl) => (bl ? bl.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error("그림을 만들지 못했어요"))), "image/png"));
  const AI_RATIOS: [string, number][] = [["16:9", 16 / 9], ["4:3", 4 / 3], ["1:1", 1], ["4:5", 0.8], ["9:16", 9 / 16]];
  const nearRatio = (w: number, h: number) => AI_RATIOS.reduce((a, r) => (Math.abs(Math.log(w / h / r[1])) < Math.abs(Math.log(w / h / a[1])) ? r : a));
  const cropOf = (src: HTMLCanvasElement, x: number, y: number, w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    c.getContext("2d")!.drawImage(src, -Math.round(x), -Math.round(y));
    return c;
  };
  const sizeTo = (src: HTMLCanvasElement, w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  };
  const aiPicture = async (prompt: string, ratio: string, files: HTMLCanvasElement[]) => {
    const vb = videoBridge();
    if (!vb || !b?.readFile || (files.length && !b.tempWrite)) throw new Error("스튜디오 앱에서만 돼요 (앱을 새로 받아 주세요)");
    const paths: string[] = [];
    for (const c of files) {
      const r = await b.tempWrite!({ bytes: await pngBytes(c), ext: "png" });
      if (!r.path) throw new Error(r.error || "그림을 보내지 못했어요");
      paths.push(r.path);
    }
    const off = vb.onProgress?.((t: string) => setAiBusy(t));
    try {
      const it = await vb.ai.image("", prompt, paths.length ? { ratio, files: paths } : { ratio });
      const f = await b.readFile(it.path!);
      if (!f.bytes) throw new Error(f.error || "그림을 읽지 못했어요");
      return await bytesToCanvas(f.bytes);
    } finally {
      off?.();
    }
  };
  const NO_TEXT = "Do not add any text, letters, logos or watermarks.";
  const runAi = async (act: AiAct, prompt: string) => {
    if (!doc || aiBusy) return;
    const d = doc, W = d.psd.width, H = d.psd.height;
    const short = prompt ? `: ${prompt.slice(0, 18)}` : "";
    setAiBusy(`AI 가 ${AI_ACT_NAME[act]} 하는 중… (30초~1분)`);
    try {
      if (act === "text") {
        // 글자 레이어 — 회원 AI 가 글만 고친다 (바로 바꾸고, Ctrl+Z 로 되돌리기)
        const l0 = selL && isText(selL) ? selL : null;
        if (!l0) throw new Error("글자 레이어를 골라 주세요");
        if (!b?.aiText) throw new Error("스튜디오 앱에서만 돼요 (앱을 새로 받아 주세요)");
        const vb = videoBridge();
        const off = vb?.onProgress?.((t: string) => setAiBusy(t));
        try {
          const look = lookOf(l0);
          const r = await b.aiText({ text: look.text, request: prompt });
          const wasAuto = !l0.name || l0.name === look.text.slice(0, 20);
          mutate(() => {
            applyText(l0, { ...look, text: r.text });
            if (wasAuto) l0.name = r.text.replace(/\s+/g, " ").slice(0, 20);
          });
        } finally {
          off?.();
        }
        say("글을 바꿨어요 — 마음에 안 들면 Ctrl+Z");
        return;
      }
      if (act === "fill") {
        // 선택 부분 + 둘레를 잘라 보낸다 (AI 가 둘레를 보고 이어 그리게) · 두 번째 그림 = 바꿀 곳(흰색) 마스크
        const m = selOf(d);
        const r = m ? maskBounds(m) : null;
        if (!m || !r) throw new Error("먼저 바꿀 곳을 선택해 주세요 (M 으로 끌기)");
        const pad = Math.max(r.w, r.h) * 0.35;
        let bx = r.x - pad, by = r.y - pad, bw = r.w + pad * 2, bh = r.h + pad * 2;
        const [ratio, rv] = nearRatio(bw, bh);
        if (bw / bh < rv) { const nw = bh * rv; bx -= (nw - bw) / 2; bw = nw; } else { const nh = bw / rv; by -= (nh - bh) / 2; bh = nh; }
        bw = Math.min(bw, W); bh = Math.min(bh, H);
        bx = Math.max(0, Math.min(W - bw, bx)); by = Math.max(0, Math.min(H - bh, by));
        bx = Math.round(bx); by = Math.round(by); bw = Math.round(bw); bh = Math.round(bh);
        const img = cropOf(composite(d), bx, by, bw, bh);
        const mt = cropOf(m, bx, by, bw, bh);
        const mg = mt.getContext("2d")!;
        mg.globalCompositeOperation = "source-in";
        mg.fillStyle = "#FFFFFF";
        mg.fillRect(0, 0, bw, bh);
        const mask = document.createElement("canvas");
        mask.width = bw; mask.height = bh;
        const kg = mask.getContext("2d")!;
        kg.fillStyle = "#000000";
        kg.fillRect(0, 0, bw, bh);
        kg.drawImage(mt, 0, 0);
        const what = prompt ? `In the white area: ${prompt}.` : "In the white area: remove whatever is there and fill it naturally with the surrounding background, as if it was never there.";
        const out = await aiPicture(`Edit the FIRST image. The SECOND image is a black-and-white mask of the same size — the WHITE area is the only region you may change. ${what} Keep everything outside the white area exactly the same (same framing, perspective, lighting and colors) and blend the edges seamlessly. Photorealistic. ${NO_TEXT} Return the full edited first image with the same framing.`, ratio, [img, mask]);
        const c = sizeTo(out, bw, bh);
        const l: PLayer = { _k: uid(), name: `생성형 채우기${short}`, canvas: c, left: bx, top: by, right: bx + bw, bottom: by + bh };
        l.mask = makeMask(W, H, false, m); // 선택한 모양만 보이게 (원본은 그대로 아래에)
        insert(l);
      } else if (act === "edit") {
        const l0 = selL && !selL.children && !isText(selL) && selL.canvas && !selL._shape ? selL : null;
        const src = l0 ? l0.canvas! : composite(d);
        const x = l0 ? l0.left || 0 : 0, y = l0 ? l0.top || 0 : 0;
        const [ratio] = nearRatio(src.width, src.height);
        const out = await aiPicture(`Edit this image: ${prompt}. Keep the same composition, framing, perspective and all main objects unless asked otherwise. Photorealistic. ${NO_TEXT}`, ratio, [src]);
        const c = sizeTo(out, src.width, src.height);
        insert({ _k: uid(), name: `프롬프트로 편집${short}`, canvas: c, left: x, top: y, right: x + c.width, bottom: y + c.height });
      } else if (act === "gen") {
        const [ratio] = nearRatio(W, H);
        const out = await aiPicture(`${prompt}. High quality, photorealistic. ${NO_TEXT}`, ratio, []);
        const c = coverCanvas(out, W, H);
        insert({ _k: uid(), name: `이미지 생성${short}`, canvas: c, left: 0, top: 0, right: W, bottom: H });
      } else if (act === "removeBg") {
        const l0 = selL && !selL.children && !isText(selL) && selL.canvas ? selL : null;
        if (!l0) throw new Error("배경을 지울 그림 레이어를 골라 주세요");
        const src = l0.canvas!;
        const [ratio] = nearRatio(src.width, src.height);
        const out = await aiPicture(`Keep only the main subject of this image exactly as it is (same position and size) and replace the entire background with a flat pure green color #00FF00. No shadows or gradients on the background. ${NO_TEXT}`, ratio, [src]);
        const c = sizeTo(out, src.width, src.height);
        // 초록 바탕을 투명하게 (가장자리는 초록 정도에 따라 반투명)
        const g = c.getContext("2d")!;
        const im = g.getImageData(0, 0, c.width, c.height);
        const p = im.data;
        for (let i = 0; i < p.length; i += 4) {
          const rr = p[i], gg = p[i + 1], bb2 = p[i + 2];
          const k = gg - Math.max(rr, bb2);
          if (k > 90) p[i + 3] = 0;
          else if (k > 35) { p[i + 3] = Math.round(p[i + 3] * (1 - (k - 35) / 55)); p[i + 1] = Math.max(rr, bb2); }
        }
        g.putImageData(im, 0, 0);
        const nl: PLayer = { _k: uid(), name: `${l0.name || "그림"} (배경 제거)`, canvas: c, left: l0.left || 0, top: l0.top || 0, right: (l0.left || 0) + c.width, bottom: (l0.top || 0) + c.height };
        insert(nl);
        mutate(() => { l0.hidden = true; }); // 원본은 숨겨 둔다 (지우지 않음)
      }
      say(`${AI_ACT_NAME[act]} — 새 레이어로 넣었어요 (원본은 그대로)`);
    } catch (e) {
      say(`${AI_ACT_NAME[act]} 실패 — ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiBusy("");
    }
  };
  /* 파일 › 인쇄 (Ctrl+P) — 합친 그림 · 선택 영역이 있으면 그 네모만큼도 */
  const openPrint = () => {
    if (!doc) return;
    setEditing(null);
    const src = composite(doc);
    const m = selOf(doc);
    const r = m ? maskBounds(m) : null;
    let selC: HTMLCanvasElement | null = null;
    if (r && r.w > 0 && r.h > 0) {
      selC = document.createElement("canvas");
      selC.width = Math.round(r.w); selC.height = Math.round(r.h);
      selC.getContext("2d")!.drawImage(src, -Math.round(r.x), -Math.round(r.y));
    }
    setPrintDlg({ src, sel: selC });
  };
  /* 문자 › 텍스트 뒤틀기 — 바꾸는 대로 미리보기, 확인이면 되돌리기 기록 한 번 */
  const openWarp = () => {
    if (!doc || !sel) return;
    const l = findLayer(kids(doc.psd), sel);
    if (!l || !isText(l)) return say("글자 레이어를 골라 주세요");
    setEditing(null);
    setWarpDlg({ k: sel, look: { ...lookOf(l) }, left: l.left || 0, top: l.top || 0 });
  };
  const warpLayer = () => (warpDlg && doc ? findLayer(kids(doc.psd), warpDlg.k) : null);
  const warpLook = (w: TextWarp | null) => ({ ...warpDlg!.look, warp: w && w.style !== "none" ? w : undefined });
  const warpBack = (l: PLayer) => { l.left = warpDlg!.left; l.top = warpDlg!.top; applyText(l, warpDlg!.look); };
  const warpPreview = (w: TextWarp) => {
    const l = warpLayer();
    if (!l) return;
    warpBack(l);
    applyText(l, warpLook(w));
    bump();
  };
  const warpOk = (w: TextWarp) => {
    const l = warpLayer();
    if (l) {
      warpBack(l);
      mutate(() => applyText(l, warpLook(w)));
    }
    setWarpDlg(null);
  };
  const warpCancel = () => {
    const l = warpLayer();
    if (l) { warpBack(l); bump(); }
    setWarpDlg(null);
  };
  const adjLayer = () => (adjDlg && doc ? findLayer(kids(doc.psd), adjDlg.k) : null);
  const adjPreview = (v: AdjVal[AdjKind]) => {
    const l = adjLayer();
    if (!l || !adjDlg) return;
    l.canvas = adjResult(adjDlg, l, v);
    bump();
  };
  const adjOk = (v: AdjVal[AdjKind]) => {
    const l = adjLayer();
    if (l && adjDlg) {
      const res = adjResult(adjDlg, l, v);
      l.canvas = adjDlg.orig;
      mutate(() => { delete l._src; l.canvas = res; });
    }
    setAdjDlg(null);
  };
  const adjCancel = () => {
    const l = adjLayer();
    if (l && adjDlg) { l.canvas = adjDlg.orig; bump(); }
    setAdjDlg(null);
  };
  const applyCrop = (box?: Box | null) => {
    if (!doc) return;
    const b = box || crop;
    if (!b || (b.x === 0 && b.y === 0 && b.w === doc.psd.width && b.h === doc.psd.height)) return;
    mutate(() => cropDoc(doc, b));
    sels.delete(doc.id);
    if (tool === "crop") setCrop({ x: 0, y: 0, w: Math.round(b.w), h: Math.round(b.h) });
    fitDoc(doc.id);
  };
  /** 보이는 레이어 병합 (Shift+Ctrl+E) · 보이는 결과를 새 레이어로 (Shift+Ctrl+Alt+E) */
  const mergeVisible = (stamp: boolean) => {
    if (!doc) return;
    const W = doc.psd.width, H = doc.psd.height;
    const c = composite(doc);
    const m: PLayer = { _k: uid(), name: stamp ? nextName("레이어") : "병합", canvas: c, left: 0, top: 0, right: W, bottom: H };
    if (stamp) { insert(m); return; }
    const top = kids(doc.psd);
    const shown = top.filter((l) => !l.hidden);
    if (shown.length < 2) return say("합칠 보이는 레이어가 둘 이상 있어야 해요");
    mutate(() => {
      const at = top.indexOf(shown[0]);
      doc.psd.children = top.filter((l) => l.hidden);
      doc.psd.children.splice(Math.min(at, doc.psd.children.length), 0, m);
    });
    setSelS(m._k!);
  };
  const toEnd = (front: boolean) => {
    if (!doc || !sel) return;
    const pl = parentList(kids(doc.psd), sel);
    if (!pl) return;
    const l = pl.list[pl.i];
    mutate(() => { pl.list.splice(pl.i, 1); if (front) pl.list.push(l); else pl.list.unshift(l); });
  };
  const rotSel = (deg: number) => {
    const l = doc && sel ? findLayer(kids(doc.psd), sel) : null;
    if (l) mutate(() => rotateLayer(l, deg));
  };
  const flipSel = (h: boolean) => {
    const l = doc && sel ? findLayer(kids(doc.psd), sel) : null;
    if (l && !l.children) mutate(() => flipLayer(l, h));
  };
  const toggleClip = () => {
    if (!doc || !sel) return;
    void act(sel, "clip");
  };
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  /** 획 · 칠 결과 (문서 크기 그림) — 새 레이어로, 또는 고른 그림 레이어에 바로 */
  const putPaint = (c: HTMLCanvasElement, name: string, toNew: boolean) => {
    if (!doc) return;
    const cur = sel ? findLayer(kids(doc.psd), sel) : null;
    if (!toNew && paintable(cur)) {
      mutate(() => {
        preparePaint(cur, doc.psd.width, doc.psd.height);
        cur.canvas!.getContext("2d")!.drawImage(c, -(cur.left || 0), -(cur.top || 0));
        trimLayer(cur);
      });
      return;
    }
    const t = trimCanvas(c);
    if (!t) return say("칠할 곳이 없어요");
    insert({ _k: uid(), name: nextName(name), canvas: t.c, left: t.x, top: t.y, right: t.x + t.c.width, bottom: t.y + t.c.height });
  };
  const doStroke = () => {
    if (!doc) return;
    const o = sels.get(doc.id);
    if (!o?.cur) return say("먼저 선택 영역을 만들어 주세요 (M · L · W)");
    setStrokeDlg(false);
    if (strokeOpt.dash !== "solid" && !o.vec) say("자동 선택·합친 선택은 실선으로만 그려요");
    putPaint(strokeCanvas(o.cur, o.vec, strokeOpt), "획", strokeOpt.newLayer);
  };
  const doFill = () => {
    if (!doc) return;
    setFillDlg(false);
    putPaint(fillCanvas(doc.psd.width, doc.psd.height, selOf(doc), fillOpt, paint.fg, paint.bg), fillOpt.kind === "gradient" ? "그레이디언트" : "칠", fillOpt.newLayer);
  };
  const doModify = () => {
    const m = selOf(doc);
    if (!m || !modDlg) return;
    setSelMask(modifyMask(m, modDlg.kind, Math.max(1, modDlg.n)));
    setModDlg(null);
  };
  // 자르기 도구 — 처음엔 문서 전체를 상자로
  const docKey = doc?.id;
  useEffect(() => {
    setCrop(tool === "crop" && doc ? { x: 0, y: 0, w: doc.psd.width, h: doc.psd.height } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, docKey]);
  // 붙여넣기 (Ctrl+V) — 우리가 복사한 것, 아니면 다른 프로그램에서 복사한 그림
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || !doc) return;
      const file = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"))?.getAsFile();
      e.preventDefault();
      if (!file || (clip && !clip.sys)) { pasteClip(); return; }
      void (async () => {
        try {
          const c = await bytesToCanvas(new Uint8Array(await file.arrayBuffer()));
          if (clip && clip.w === c.width && clip.h === c.height) pasteClip();
          else insert(imageLayer(doc, c, "붙여넣기"));
        } catch { pasteClip(); }
      })();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  /* ── AI 자동 디자인 · 디자인 템플릿 · 내 템플릿 ── */
  const loadMine = () => { if (b?.tplList) b.tplList().then(setMyTpls).catch(() => setMyTpls([])); else setMyTpls([]); };
  const [designInit, setDesignInit] = useState<{ cat: Cat; size: CatSize; layout?: string } | null>(null);
  const openDesign = () => { loadMine(); setDesignInit(null); setDesignOpen(true); };
  /** 처음 화면 샘플 — [템플릿 열기] 는 칸 이름 글 · 사진 자리로 레이어 문서를 바로, [AI로 채우기] 는 AI 자동 디자인 창을 이 틀로 */
  const openSample = async (l: Layout, size: CatSize, ai: boolean, cat: Cat) => {
    if (ai) { loadMine(); setDesignInit({ cat, size, layout: l.id }); setDesignOpen(true); return; }
    setBusy("샘플을 여는 중…");
    try {
      await Promise.all(layoutFonts(l).map((f) => loadFont(f).catch(() => {})));
      const ag = await getStudioAgency().catch(() => null);
      const d = newDoc({ name: l.name.replace(/[\\/:*?"<>|]/g, " "), width: size.w, height: size.h, bg: "transparent", ppi: size.ppi });
      d.psd.children = buildLayout(d, l, contentFor(l, placeholderContent(ag?.success && ag.data.name ? ag.data : undefined)), (await loadSampleBg(cat === "youtube" ? "building" : "living")) || placeholderBg(size.w, size.h, "사진을 넣어 주세요"), false); // 샘플 사진 — [사진 바꾸기] 로 내 사진으로
      d.dirty = true;
      d.pristine = false;
      addDoc(d);
      syncDirty();
      say("샘플을 열었어요 — 글자를 두 번 눌러 고치고, [배경 사진] 레이어에서 [사진 바꾸기] 로 사진을 넣어요");
    } finally {
      setBusy("");
    }
  };
  /** [배경 사진] 칸 사진 바꾸기 — PC 에서 고른 사진으로 (칸 크기에 꽉 차게) */
  const replaceBg = async () => {
    if (!doc) return;
    let bytes: Uint8Array | null = null;
    if (b) { const r = (await b.open({ images: true })).find((x) => x.bytes); bytes = r?.bytes || null; }
    else { const f = (await pickLocal(true))[0]; bytes = f ? new Uint8Array(await f.arrayBuffer()) : null; }
    if (!bytes) return;
    try {
      const c = await bytesToCanvas(bytes);
      mutate(() => { refill(doc, {}, c); });
    } catch { say("그림으로 열 수 없는 파일이에요"); }
  };
  const hasSlots = (d: Doc | null) => { let n = 0; if (d) walk(kids(d.psd), (l) => { if (l._slot) n++; }); return n > 0; };
  const onDesignDone = async (r: DesignResult) => {
    setDesignOpen(false);
    const title = (r.content.title || r.meta.src.title || "AI 디자인").replace(/[\\/:*?"<>|\n]/g, " ").slice(0, 40);
    // 글꼴부터 받아 둔다 (안 받고 그리면 다른 글꼴로 굳는다)
    const fams = new Set<string>(r.layout ? layoutFonts(r.layout) : ["Pretendard"]);
    if (doc) walk(kids(doc.psd), (l) => { if (l._slot && l._look?.font) fams.add(l._look.font); });
    setBusy("글꼴을 받는 중…");
    await Promise.all([...fams].map((f) => loadFont(f).catch(() => {})));
    setBusy("");
    if (r.refill && doc) {
      mutate(() => { refill(doc, r.content, r.bg); doc.meta = { ...doc.meta, ...r.meta }; });
      say("지금 문서의 칸에 새 내용을 넣었어요");
      return;
    }
    let d: Doc;
    if (r.mine && b?.tplRead) {
      const f = await b.tplRead(r.mine.file);
      if (!f.bytes) return say(f.error || "내 템플릿을 열지 못했어요");
      d = openPsdBytes(`${title}.psd`, f.bytes);
      const more: string[] = [];
      walk(kids(d.psd), (l) => { if (l._slot && l._look?.font) more.push(l._look.font); });
      await Promise.all(more.map((f) => loadFont(f).catch(() => {})));
      refill(d, r.content, r.bg);
      d.path = undefined;
      d.fromFile = false;
    } else {
      if (!r.layout) return;
      d = newDoc({ name: title, width: r.w, height: r.h, bg: "transparent", ppi: r.ppi });
      d.psd.children = buildLayout(d, r.layout, r.content, r.bg, r.aiMark);
    }
    d.name = title;
    d.meta = r.meta;
    d.dirty = true;
    d.pristine = false;
    addDoc(d);
    syncDirty();
    say("레이어로 만들었어요 — 글자·사진을 하나씩 고칠 수 있어요");
  };
  const insertTpl = (id: string) => {
    if (!doc) return;
    try {
      const g = tplGroup(doc, id);
      if (!g) return;
      mutate(() => placeAbove(g));
      setSelS(g._k!);
    } catch (e) {
      say(`템플릿을 넣지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const saveMine = async (name: string) => {
    if (!doc || !b?.tplWrite) return say("스튜디오 앱에서만 돼요");
    if (!hasSlots(doc)) say("칸이 정해진 레이어가 없어요 — 다른 공실을 넣을 땐 글이 바뀌지 않아요 (레이어 칸 위 [칸] 에서 정하세요)");
    // 저장 창에서 위치·이름을 고른다 — 처음엔 공실스튜디오\04 이미지제작\내템플릿, 다음부터는 지난번에 고른 폴더 (고른 곳에 저장해도 내 템플릿 목록에 뜬다)
    const r = await b.tplWrite({ name: name || doc.name, bytes: savePsdBytes(doc), thumb: thumbOf(composite(doc)), w: doc.psd.width, h: doc.psd.height, ask: true });
    if (r.canceled) return;
    if (r.error) return say(`저장하지 못했어요: ${r.error}`);
    say("내 템플릿에 넣었어요 — 처음 화면 템플릿 목록 맨 앞에 있어요");
    loadMine();
  };
  const openMine = async (t: MyTpl) => {
    if (!b?.tplRead) return;
    const f = await b.tplRead(t.file);
    if (!f.bytes) return say(f.error || "열지 못했어요");
    const d = openPsdBytes(`${t.name}.psd`, f.bytes);
    d.path = undefined;
    d.fromFile = false;
    addDoc(d);
  };
  const removeMine = async (t: MyTpl) => { await b?.tplRemove?.(t.file); loadMine(); };
  const useMine = (t: MyTpl, ai: boolean) => {
    if (!ai) return void openMine(t);
    // 이 디자인과 비율이 맞는 종류·크기로 창을 연다 (없으면 유튜브 썸네일)
    const fit = (Object.keys(CAT_SIZES) as Cat[]).flatMap((c) => CAT_SIZES[c].map((sz) => ({ c, sz }))).find(({ sz }) => t.w && t.h && Math.abs(t.w / t.h - sz.w / sz.h) < 0.05);
    loadMine();
    setDesignInit({ cat: fit?.c || "youtube", size: fit?.sz || CAT_SIZES.youtube[0], layout: `@mine:${t.file}` });
    setDesignOpen(true);
  };
  // 처음 화면에 내 템플릿을 보여 주려면 목록을 먼저 읽어 둔다
  useEffect(() => { loadMine(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /** 배경만 다시 만들기 — 저장해 둔 AI 프롬프트로 다시 그려 [배경 사진] 칸만 바꾼다 */
  const regenBg = async () => {
    const vb = videoBridge();
    const p = doc?.meta?.ai?.prompt;
    if (!doc || !vb || !p || !b?.readFile) return say("AI 로 만든 배경이 있는 문서에서만 돼요");
    setBusy("AI 가 배경을 다시 그리는 중… (30초~1분)");
    try {
      const it = await vb.ai.image("", p, { ratio: doc.meta?.ai?.ratio || ratioOf(doc.psd.width, doc.psd.height) });
      const f = await b.readFile(it.path!);
      if (!f.bytes) throw new Error(f.error || "그림을 읽지 못했어요");
      const c = await bytesToCanvas(f.bytes);
      mutate(() => { refill(doc, {}, c); });
      say("배경을 새로 그렸어요");
    } catch (e) {
      say(`다시 그리지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };

  /* 문서 열기 · 만들기 · 닫기 */
  const addDoc = (d: Doc) => {
    store.docs.push(d);
    store.active = d.id;
    store.dock = d.id;
    store.home = false;
    setSel(null);
    setEditing(null);
    bump();
  };
  // 다른 편집기에서 열면 받은 문서를 바로 연다
  const embedOpened = useRef(false);
  useEffect(() => {
    if (!embed || embedOpened.current) return;
    embedOpened.current = true;
    if (store.docs.some((d) => d.id === embed.doc.id)) activate(embed.doc.id);
    else addDoc(embed.doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const openFiles = async (files: { name: string; bytes: Uint8Array; path?: string }[]) => {
    for (const f of files) {
      const already = f.path && store.docs.find((d) => d.path === f.path);
      if (already) { store.home = false; activate(already.id); continue; }
      setBusy(`${f.name} 여는 중…`);
      await new Promise((r) => setTimeout(r, 30)); // "여는 중" 이 먼저 보이게
      try {
        const d = /\.(psd|psb)$/i.test(f.name) ? openPsdBytes(f.name, f.bytes, f.path) : await openImageBytes(f.name, f.bytes, f.path);
        addDoc(d);
        // 최근 파일 그림
        if (f.path && b && /\.(psd|psb)$/i.test(f.name)) {
          const c = composite(d);
          (b as unknown as { recentThumb?: (p: string, t: string) => Promise<boolean> }).recentThumb?.(f.path, thumbOf(c));
        }
      } catch (e) {
        say(`${f.name} 을(를) 열지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setBusy("");
  };
  const openPick = async () => {
    if (b) {
      const r = await b.open();
      const bad = r.filter((x) => x.error);
      if (bad.length) say(`${bad[0].name}: ${bad[0].error}`);
      await openFiles(r.filter((x) => x.bytes).map((x) => ({ name: x.name, bytes: x.bytes!, path: x.path })));
    } else {
      const fs = await pickLocal(false);
      await openFiles(await Promise.all(fs.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }))));
    }
  };
  const openRecent = async (r: Recent) => {
    if (!b) return;
    const f = await b.read(r.path);
    if (f.error || !f.bytes) return say(f.error || "열지 못했어요");
    await openFiles([{ name: f.name, bytes: f.bytes, path: f.path }]);
  };
  // 탐색기에서 PSD 를 두 번 눌러 연 경우 (2026-10-23 — 포토샵이 없는 PC). 앱이 주소 ?open=<파일 위치> 로 이 화면을 연다
  useEffect(() => {
    if (embed) return;
    const u = new URL(window.location.href);
    const file = u.searchParams.get("open") || "";
    if (!/\.(psd|psb)$/i.test(file)) return;
    u.searchParams.delete("open");
    window.history.replaceState(window.history.state, "", u.toString());
    void openRecent({ path: file, name: file.split(/[\\/]/).pop() || file, at: Date.now(), thumb: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const create = (o:{ name: string; width: number; height: number; bg: string; ppi: number; guides?: PsdGuide[]; mode: "rgb" | "cmyk" }) => {
    setNewOpen(false);
    setNewInit(null);
    const d = newDoc({ name: o.name, width: o.width, height: o.height, bg: o.bg, ppi: o.ppi });
    if (o.guides?.length) setGuides(d, o.guides); // 채널 배너 — 모든 기기에 보이는 칸 안내선
    d.mode = o.mode;
    addDoc(d);
  };
  const reallyClose = (d: Doc) => {
    void b?.autosaveClear?.(d.id);
    store.docs = store.docs.filter((x) => x.id !== d.id);
    store.hist.delete(d.id);
    store.view.delete(d.id);
    store.float.delete(d.id);
    store.fit.delete(d.id);
    if (store.dock === d.id) store.dock = "";
    if (store.active === d.id) store.active = store.docs[store.docs.length - 1]?.id || "";
    if (!store.docs.length) store.home = true;
    setSel(null);
    setClosing(null);
    bump();
    syncDirty();
  };
  const closeDoc = (d: Doc) => (d.dirty ? setClosing(d) : reallyClose(d));

  /* 저장 */
  /** [이 썸네일 쓰기] — 지금 그림(PNG)과 레이어(PSD)를 돌려주고 닫는다 */
  const applyEmbed = async () => {
    if (!embed) return;
    const d = store.docs.find((x) => x.id === embed.doc.id);
    if (!d) return embed.onCancel();
    setBusy("썸네일을 저장하는 중…");
    try {
      const c = composite(d);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
      if (!blob) throw new Error("그림을 만들지 못했어요");
      await embed.onUse(new Uint8Array(await blob.arrayBuffer()), savePsdBytes(d));
      d.dirty = false;
      reallyClose(d);
    } catch (e) {
      say(`저장하지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };
  const cancelEmbed = () => {
    if (!embed) return;
    const d = store.docs.find((x) => x.id === embed.doc.id);
    if (d) { d.dirty = false; reallyClose(d); }
    embed.onCancel();
  };
  const save = async (d: Doc, ask = false): Promise<boolean> => {
    if (embed && d.id === embed.doc.id && !ask) { await applyEmbed(); return true; } // Ctrl+S = 이 썸네일 쓰기
    setBusy("저장하는 중…");
    await new Promise((r) => setTimeout(r, 30));
    const flat = !ask && b ? flatExt(d) : null;
    if (flat && b) {
      // 레이어가 하나뿐인 사진 — 원래 형식 그대로 같은 파일에 (포토샵처럼)
      try {
        const r = await b.save({ file: d.path, name: d.name, ext: flat, bytes: await webBytes(d, flat, 0.92) });
        if (r.error) { say(`저장하지 못했어요: ${r.error}`); return false; }
        d.dirty = false;
        void b.autosaveClear?.(d.id);
        say(`저장했어요 — ${r.name || d.name}`);
        bump();
        syncDirty();
        return true;
      } catch (e) {
        say(`저장하지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      } finally {
        setBusy("");
      }
    }
    try {
      const bytes = savePsdBytes(d);
      const thumb = thumbOf(composite(d));
      if (b) {
        const r = await b.save({ file: d.path, name: d.name, ext: "psd", bytes, thumb, ask: ask || d.fromFile || !d.path });
        if (r.canceled) return false;
        if (r.error) { say(`저장하지 못했어요: ${r.error}`); return false; }
        d.path = r.path;
        d.name = (r.name || d.name).replace(/\.psd$/i, "");
      } else download(bytes, `${d.name}.psd`);
      d.fromFile = false;
      d.dirty = false;
      void b?.autosaveClear?.(d.id);
      say(`저장했어요 — ${d.name}.psd`);
      bump();
      syncDirty();
      return true;
    } catch (e) {
      say(`저장하지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    } finally {
      setBusy("");
    }
  };
  /** 인쇄용 파일 (CMYK PDF · TIFF) — 재단 여백 bleed mm */
  const exportPrint = async (type: "pdf" | "tif", bleed: number) => {
    if (!doc) return;
    setPrintOpen(false);
    setBusy("인쇄용 파일 만드는 중…");
    await new Promise((r) => setTimeout(r, 30));
    try {
      const ppi = doc.psd.imageResources?.resolutionInfo?.horizontalResolution || 300;
      const c = composite(doc);
      const bytes = type === "pdf" ? await cmykPdf(c, ppi, bleed) : await cmykTiff(c, ppi, bleed);
      const nm = `${doc.name}_인쇄용`;
      if (b) {
        const r = await b.save({ file: doc.path ? doc.path.replace(/[^\\/]+$/, `${nm}.${type}`) : undefined, name: nm, ext: type, bytes, ask: true });
        if (r.path) say(`인쇄용 파일을 만들었어요 — ${r.name}`);
        else if (r.error) say(`만들지 못했어요: ${r.error}`);
      } else download(bytes, `${nm}.${type}`);
    } catch (e) {
      say(`만들지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };
  const exportAs = async (type: "png" | "jpg") => {
    if (!doc) return;
    setExportOpen(false);
    const bytes = await exportBytes(doc, type);
    if (b) {
      const r = await b.save({ file: doc.path?.replace(/\.(psd|psb)$/i, `.${type}`), name: doc.name, ext: type, bytes, ask: true });
      if (r.path) say(`내보냈어요 — ${r.name}`);
      else if (r.error) say(`내보내지 못했어요: ${r.error}`);
    } else download(bytes, `${doc.name}.${type}`);
  };

  /* 넣기 */
  const insert = (l: PLayer, edit = false) => {
    if (!doc) return;
    mutate(() => {
      // 고른 레이어 바로 위에 (없으면 맨 위)
      const pl = sel ? parentList(kids(doc.psd), sel) : null;
      if (pl && !pl.list[pl.i].children) pl.list.splice(pl.i + 1, 0, l);
      else kids(doc.psd).push(l);
      if (!doc.psd.children) doc.psd.children = [l];
    });
    setSelS(l._k!);
    setSide("");
    if (edit) startEdit(l._k!);
  };
  const addText = () => {
    if (!doc) return;
    const l = textLayer(doc);
    applyText(l, l._look!);
    insert(l, true);
  };
  const addImages = async (files?: File[]) => {
    if (!doc) return;
    let list: { name: string; bytes: Uint8Array }[] = [];
    if (files) list = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
    else if (b) list = (await b.open({ images: true })).filter((x) => x.bytes).map((x) => ({ name: x.name, bytes: x.bytes! }));
    else list = await Promise.all((await pickLocal(true)).map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
    for (const f of list) {
      try {
        const c = await bytesToCanvas(f.bytes);
        insert(imageLayer(doc, c, f.name.replace(/\.\w+$/, "")));
      } catch {
        say(`${f.name} 은(는) 그림으로 열 수 없어요`);
      }
    }
  };
  const addSticker = async (s: Sticker) => {
    if (!doc) return;
    const url = await stickerPng(s);
    const bytes = Uint8Array.from(atob(url.split(",")[1]), (ch) => ch.charCodeAt(0));
    const c = await bytesToCanvas(bytes);
    const l = imageLayer(doc, c, stickerFileName(s.text));
    // 그래픽은 문서 폭의 40% 쯤
    const want = Math.round(Math.min(doc.psd.width, doc.psd.height) * 0.4);
    if (c.width > want) applyResize(l, { x: (doc.psd.width - want) / 2, y: (doc.psd.height - (c.height * want) / c.width) / 2, w: want, h: (c.height * want) / c.width });
    insert(l);
  };
  const onDropFiles = async (files: File[]) => {
    const psd = files.filter((f) => /\.(psd|psb)$/i.test(f.name));
    const img = files.filter((f) => !/\.(psd|psb)$/i.test(f.name) && /^image\//.test(f.type));
    if (psd.length) await openFiles(await Promise.all(psd.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()), path: (f as File & { path?: string }).path }))));
    if (img.length) {
      if (doc && !psd.length) await addImages(img);
      else await openFiles(await Promise.all(img.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }))));
    }
  };

  /* 여러 레이어 함께 — 지우기 · 그룹 · 복제 · 병합 */
  const manyAct = (a: "del" | "group" | "dup" | "merge") => {
    if (!doc) return;
    const ls = selInOrder();
    if (!ls.length) return;
    const root = kids(doc.psd);
    const top = ls[ls.length - 1];
    if (a === "del") {
      mutate(() => { for (const l of ls) { const pl = parentList(root, l._k!); if (pl) pl.list.splice(pl.i, 1); } });
      setSel(null);
      return;
    }
    if (a === "dup") {
      const made: string[] = [];
      mutate(() => {
        for (const l of ls) {
          const pl = parentList(root, l._k!);
          if (!pl) continue;
          const c = duplicate(l);
          c.name = copyName(l.name || "레이어");
          pl.list.splice(pl.i + 1, 0, c);
          made.push(c._k!);
        }
      });
      if (made.length) { setSelRaw(made[made.length - 1]); setExtra(made.slice(0, -1)); }
      return;
    }
    // 그룹 · 병합 — 맨 위 것 자리에 새 것을 놓고 나머지는 뺀다
    const W = doc.psd.width, H = doc.psd.height;
    const made: PLayer | null = a === "group"
      ? { _k: uid(), name: nextName("그룹"), opened: true, children: ls.map((l) => l), blendMode: "pass through" }
      : rasterize(ls, W, H, top.name || "병합");
    if (!made) return;
    mutate(() => {
      const tp = parentList(root, top._k!);
      if (!tp) return;
      tp.list.splice(tp.i, 1, made);
      for (const l of ls) { if (l === top) continue; const pl = parentList(root, l._k!); if (pl && pl.list[pl.i] === l) pl.list.splice(pl.i, 1); }
    });
    setSelS(made._k!);
  };
  /** 그림판에서 함께 끌어 옮김 — 이미 옮겨 보여 줬으니 되돌린 뒤 기록 한 번으로 */
  const moveMany = (keys: string[], dx: number, dy: number) => {
    if (!doc) return;
    const ls = keys.map((k) => findLayer(kids(doc.psd), k)).filter((l): l is PLayer => Boolean(l));
    for (const l of ls) offsetLayer(l, -dx, -dy);
    mutate(() => { for (const l of ls) offsetLayer(l, dx, dy); });
  };

  /* 레이어 메뉴 · 단축키 */
  const act = async (k: string, a: MenuAct) => {
    if (!doc) return;
    const root = kids(doc.psd);
    const pl = parentList(root, k);
    if (!pl) return;
    const l = pl.list[pl.i];
    const W = doc.psd.width, H = doc.psd.height;
    switch (a) {
      case "dup": {
        const c = duplicate(l);
        c.name = copyName(l.name || "레이어");
        offsetLayer(c, 0, 0);
        mutate(() => { pl.list.splice(pl.i + 1, 0, c); });
        setSelS(c._k!);
        break;
      }
      case "clip":
        // 클리핑 마스크 — 바로 아래 레이어 모양 안에서만 보이게 (맨 아래 레이어는 끼울 바탕이 없음)
        if (!l.clipping && pl.i === 0) { say("맨 아래 레이어는 클리핑 마스크를 만들 수 없어요"); break; }
        mutate(() => { l.clipping = !l.clipping; });
        setSel(k);
        break;
      case "del":
        mutate(() => { pl.list.splice(pl.i, 1); });
        setSel(null);
        break;
      case "group": {
        const g: PLayer = { _k: uid(), name: nextName("그룹"), opened: true, children: [l], blendMode: "pass through" };
        mutate(() => { pl.list.splice(pl.i, 1, g); });
        setSelS(g._k!);
        break;
      }
      case "ungroup":
        if (l.children) mutate(() => { pl.list.splice(pl.i, 1, ...kids(l)); });
        setSel(null);
        break;
      case "png": {
        const bytes = await layerPng(l);
        if (!bytes) return;
        if (b) {
          const r = await b.save({ name: l.name || "레이어", ext: "png", bytes, ask: true, file: doc.path ? doc.path.replace(/[^\\/]+$/, `${(l.name || "레이어").replace(/[\\/:*?"<>|]/g, "_")}.png`) : undefined });
          if (r.path) say(`내보냈어요 — ${r.name}`);
        } else download(bytes, `${l.name || "레이어"}.png`);
        break;
      }
      case "merge": {
        if (pl.i === 0) return say("아래에 합칠 레이어가 없어요");
        const lower = pl.list[pl.i - 1];
        const m = rasterize([lower, l], W, H, lower.name || "레이어");
        mutate(() => { pl.list.splice(pl.i - 1, 2, ...(m ? [m] : [])); });
        setSelS(m?._k || null);
        break;
      }
      case "raster": {
        const m = rasterize([{ ...l, opacity: 1 }], W, H, l.name || "레이어");
        if (m) { m.opacity = l.opacity; m.blendMode = l.children ? "normal" : l.blendMode; }
        mutate(() => { pl.list.splice(pl.i, 1, ...(m ? [m] : [])); });
        setSelS(m?._k || null);
        break;
      }
      case "up":
        if (pl.i < pl.list.length - 1) mutate(() => { pl.list.splice(pl.i, 1); pl.list.splice(pl.i + 1, 0, l); });
        break;
      case "down":
        if (pl.i > 0) mutate(() => { pl.list.splice(pl.i, 1); pl.list.splice(pl.i - 1, 0, l); });
        break;
      case "lock":
        mutate(() => { l.protected = { ...(l.protected || {}), position: !l.protected?.position }; });
        break;
      case "hide":
        mutate(() => { l.hidden = !l.hidden; });
        break;
      case "fx":
        setSelS(k);
        setSide("fx");
        break;
    }
  };
  const toggle = (k: string, what: "hidden" | "lock" | "open") => {
    if (!doc) return;
    const l = findLayer(kids(doc.psd), k);
    if (!l) return;
    if (what === "open") { l.opened = l.opened === false; bump(); return; }
    act(k, what === "hidden" ? "hide" : "lock");
  };
  const dropLayer = (k: string, target: string, above: boolean) => {
    if (!doc || k === target) return;
    const root = kids(doc.psd);
    const from = parentList(root, k);
    if (!from) return;
    const l = from.list[from.i];
    if (l.children && findLayer(kids(l), target)) return; // 그룹을 제 안으로는 못 넣는다
    mutate(() => {
      from.list.splice(from.i, 1);
      const to = parentList(root, target)!;
      // 목록은 위가 앞 → 배열(아래가 0)에서 "위"는 뒤쪽
      to.list.splice(above ? to.i + 1 : to.i, 0, l);
    });
  };

  useEffect(() => {
    // 포토샵 단축키 — 한글 입력 상태에서도 되게 글쇠 자리(e.code)로 본다
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      const ctrl = e.ctrlKey || e.metaKey, sh = e.shiftKey, alt = e.altKey;
      const c = e.code;
      const go = (fn: () => void) => { e.preventDefault(); fn(); };
      if (ctrl && sh && c === "KeyN") return go(() => newLayer());
      if (ctrl && c === "KeyN") return go(() => setNewOpen(true));
      if (ctrl && c === "KeyO") return go(() => void openPick());
      if (!doc) return;
      if (tool === "crop" && (c === "Enter" || c === "NumpadEnter")) return go(() => applyCrop());
      if (tool === "crop" && c === "Escape") return go(() => setCrop({ x: 0, y: 0, w: doc.psd.width, h: doc.psd.height }));
      // 파일 · 편집
      if (ctrl && sh && alt && c === "KeyS") return go(() => setWebDlg({ fmt: "jpg", q: 0.8, scale: 1 }));
      if (ctrl && !sh && !alt && c === "KeyP") return go(openPrint); // 인쇄 (포토샵처럼)
      if (ctrl && c === "KeyS") return go(() => void save(doc, sh));
      if (ctrl && c === "KeyZ") return go(() => (sh ? redo() : undo()));
      if (!ctrl && !alt && (c === "PageUp" || c === "PageDown") && pageCount(doc) > 1) return go(() => goPage(pageIndex(doc) + (c === "PageUp" ? -1 : 1))); // 여러 쪽
      if (ctrl && c === "KeyY") return go(() => { if (doc.mode === "cmyk") setVis({ proof: vis.proof === false }); }); // 교정 색상
      if (ctrl && c === "KeyW") return go(() => closeDoc(doc));
      if (ctrl && c === "KeyT") return go(() => { setTool("move"); if (!sel) say("크기를 바꿀 레이어를 골라 주세요"); }); // 자유 변형 — 모서리 손잡이
      if (ctrl && alt && !sh && c === "KeyF") return go(() => { if (lastFilter.current) openFilter(lastFilter.current.id, true); }); // 마지막 필터
      if (ctrl && alt && !sh && c === "KeyC") return go(() => setImgDlg("canvas")); // 캔버스 크기
      if (ctrl && alt && !sh && c === "KeyI") return go(() => setImgDlg("size")); // 이미지 크기
      if (ctrl && c === "KeyC") return go(() => copySel(false));
      if (ctrl && c === "KeyX") return go(() => copySel(true));
      if (alt && !ctrl && (c === "Backspace" || c === "Delete")) return go(() => fillWith(paint.fg));
      if (ctrl && c === "Backspace") return go(() => fillWith(paint.bg));
      // 보기
      if (sh && !ctrl && c === "F5") return go(() => setFillDlg(true));
      if (sh && !ctrl && c === "F6") return go(() => { if (selOf(doc)) setModDlg({ kind: "feather", n: 10 }); });
      if (ctrl && c === "KeyR") return go(() => setVis({ rulers: !vis.rulers }));
      if (ctrl && c === "Quote") return go(() => setVis({ grid: !vis.grid }));
      if (ctrl && c === "Semicolon") return go(() => setVis({ guides: !vis.guides }));
      if (ctrl && (c === "Digit0" || c === "Numpad0")) return go(() => fitDoc(doc.id));
      if (ctrl && (c === "Digit1" || c === "Numpad1")) return go(() => { const v = store.view.get(doc.id); if (v) { store.view.set(doc.id, { z: 1, x: v.x, y: v.y }); bump(); } });
      if (ctrl && (c === "Equal" || c === "Minus" || c === "NumpadAdd" || c === "NumpadSubtract")) return go(() => zoomBy(c === "Minus" || c === "NumpadSubtract" ? 1 / 1.25 : 1.25));
      // 선택
      if (ctrl && c === "KeyA") return go(() => setSelMask(selectAll(doc.psd.width, doc.psd.height), { kind: "rect", box: { x: 0, y: 0, w: doc.psd.width, h: doc.psd.height } }));
      if (ctrl && sh && c === "KeyD") return go(() => { const o = sels.get(doc.id); if (o?.prev) setSelMask(o.prev, o.pvec || null); });
      if (ctrl && c === "KeyD") return go(() => setSelMask(null));
      if (ctrl && sh && c === "KeyI") return go(() => { const m = selOf(doc); setSelMask(m ? invertMask(m) : null); });
      // 보정
      if (ctrl && sh && alt && c === "KeyB") return go(() => adjust("gray"));
      if (ctrl && sh && alt && c === "KeyL") return go(() => adjust("autoContrast"));
      if (ctrl && sh && c === "KeyL") return go(() => adjust("autoTone"));
      if (ctrl && sh && c === "KeyB") return go(() => adjust("autoColor"));
      if (ctrl && !sh && !alt && c === "KeyL") return go(() => openAdj("levels"));
      if (ctrl && !sh && !alt && c === "KeyM") return go(() => openAdj("curves"));
      if (ctrl && !sh && !alt && c === "KeyU") return go(() => openAdj("hueSat"));
      if (ctrl && !sh && !alt && c === "KeyB") return go(() => openAdj("balance"));
      if (ctrl && c === "KeyI") return go(() => adjust("invert"));
      if (ctrl && c === "KeyF") return go(() => { if (lastAdjust.current) adjust(lastAdjust.current); });
      // 레이어
      if (ctrl && sh && alt && c === "KeyE") return go(() => mergeVisible(true));
      if (ctrl && sh && c === "KeyE") return go(() => mergeVisible(false));
      if (ctrl && alt && c === "KeyG") return go(toggleClip);
      if (ctrl && sh && c === "KeyJ") return go(() => toNewLayer(true));
      if (ctrl && c === "KeyJ") return go(() => (allSel().length > 1 && !selOf(doc) ? manyAct("dup") : toNewLayer(false)));
      if (ctrl && c === "KeyE") return go(() => (allSel().length > 1 ? manyAct("merge") : sel && void act(sel, "merge")));
      if (ctrl && c === "KeyG") return go(() => (!sh && allSel().length > 1 ? manyAct("group") : sel && void act(sel, sh ? "ungroup" : "group")));
      if (ctrl && sh && c === "BracketRight") return go(() => toEnd(true));
      if (ctrl && sh && c === "BracketLeft") return go(() => toEnd(false));
      if (ctrl && c === "BracketRight") return go(() => { if (sel) void act(sel, "up"); });
      if (ctrl && c === "BracketLeft") return go(() => { if (sel) void act(sel, "down"); });
      // 화면
      if (!ctrl && !alt && c === "Tab") return go(() => setPanelsHidden((x) => !x));
      if (!ctrl && !alt && !sh && c === "KeyF") return go(toggleFull);
      if (!ctrl && !alt) {
        // 도구 — 포토샵과 같은 글쇠, Shift+글쇠 = 묶음 안에서 다음 도구
        const g = TOOL_GROUPS.find((x) => x.code === c);
        if (g) {
          e.preventDefault();
          const cur = groupPick[g.key] || g.tools[0].t;
          if (sh && g.tools.length > 1) {
            const i = g.tools.findIndex((x) => x.t === (groupOf(tool) === g ? tool : cur));
            setTool(g.tools[(i + 1) % g.tools.length].t);
          } else setTool(cur);
          return;
        }
        if (c === "KeyX") return go(() => setPaint({ fg: paint.bg, bg: paint.fg })); // 전경색 ↔ 배경색
        if (c === "KeyD") return go(() => setPaint({ fg: "#000000", bg: "#FFFFFF" })); // 기본 색
        if (c === "BracketLeft" || c === "BracketRight") {
          const up = c === "BracketRight";
          if (sh) return go(() => setPaint({ hardness: Math.max(0, Math.min(1, Math.round((paint.hardness + (up ? 0.25 : -0.25)) * 4) / 4)) }));
          return go(() => setPaint({ size: Math.max(1, Math.min(1000, Math.round(paint.size * (up ? 1.2 : 1 / 1.2)))) }));
        }
        const dg = /^(Digit|Numpad)(\d)$/.exec(c);
        if (dg && !sh) {
          // 숫자 1~0 — 불투명도 10~100% (색칠 도구면 붓 불투명도, 아니면 고른 레이어)
          const v = (Number(dg[2]) || 10) / 10;
          e.preventDefault();
          if (PAINT_TOOLS.includes(tool)) setPaint({ opacity: v });
          else if (sel) { const l = findLayer(kids(doc.psd), sel); if (l) mutate(() => { l.opacity = v; }, `op:${sel}`); }
          return;
        }
      }
      if (c === "Delete" || c === "Backspace") {
        e.preventDefault();
        if (selOf(doc)) clearSel(); // 선택 영역이 있으면 그 안을 지운다
        else if (allSel().length > 1) manyAct("del");
        else if (sel) void act(sel, "del");
        return;
      }
      if (!sel) return;
      if (c === "Escape") { setSel(null); return; }
      if (c.startsWith("Arrow")) {
        e.preventDefault();
        const n = sh ? 10 : 1;
        const dx = c === "ArrowLeft" ? -n : c === "ArrowRight" ? n : 0, dy = c === "ArrowUp" ? -n : c === "ArrowDown" ? n : 0;
        const ls = selInOrder().filter((l) => !l.protected?.position);
        if (ls.length) mutate(() => { for (const l of ls) offsetLayer(l, dx, dy); }, `nudge:${allSel().join(",")}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 처음 화면 (왼쪽 메뉴와 함께)
  const home = (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); void onDropFiles([...e.dataTransfer.files]); }}>
      {menu}
      <PhotoHome onNew={() => setNewOpen(true)} onOpen={() => void openPick()} onRecent={(r) => void openRecent(r)} busy={Boolean(busy)} onPreset={(i) => { setNewInit(i); setNewOpen(true); }}
        onSample={(l, size, ai, cat) => void openSample(l, size, ai, cat)} onAi={openDesign} mine={myTpls} onMine={useMine} onMineRemove={(t) => void removeMine(t)}
          top={<>
        {autoList.length > 0 && (
          <div style={{ margin: "0 0 14px", padding: "12px 14px", borderRadius: 8, border: "1px solid #b45309", background: "rgba(180,83,9,0.15)", color: C.text, fontFamily: FONT }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 8 }}>저장하지 않고 꺼진 작업이 있어요 — 복구할까요?</div>
            {autoList.map((it) => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", fontSize: 14 }}>
                <b style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</b>
                <span style={{ color: C.sub, fontSize: 12.5 }}>{new Date(it.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <Btn small primary onClick={() => void recover(it)}>복구</Btn>
                <Btn small onClick={() => discardAuto(it)}>버리기</Btn>
              </div>
            ))}
          </div>
        )}
          </>} />
    </div>
  );

  const selL = doc && sel ? findLayer(kids(doc.psd), sel) : null;
  const view = doc ? store.view.get(doc.id) || null : null;
  const h = doc ? histOf(doc.id) : null;
  const zoomBy = (f: number) => {
    if (!doc) return;
    const v = store.view.get(doc.id);
    if (v) { store.view.set(doc.id, { ...v, z: Math.max(0.02, Math.min(32, v.z * f)) }); bump(); }
  };
  const addTextAt = (x: number, y: number) => {
    if (!doc) return;
    // 포토샵처럼 — 누른 자리에 빈 글자 레이어를 만들고 바로 입력 (아무것도 안 쓰고 끝내면 레이어도 없어짐)
    const l = textLayer(doc, undefined, " ");
    l.name = "글자";
    applyText(l, l._look!);
    const bb = l.canvas!;
    offsetLayer(l, Math.round(x - ((l.left || 0) + bb.width / 2)), Math.round(y - ((l.top || 0) + bb.height / 2)));
    insert(l);
    startEdit(l._k!, true);
  };
  /** 문자 도구로 끌어 만든 단락 글자 칸 — 칸 안에서 줄이 바뀐다 (포토샵 단락 문자) */
  const addTextBox = (b: { x: number; y: number; w: number; h: number }, inShape?: string) => {
    if (!doc) return;
    // 모양 안 글자 — 모양 레이어를 고른 채로 넣어 바로 위에 생기고, 가운데 정렬 · 모양과 대비되는 색
    if (inShape) setSelS(inShape);
    const shp = inShape ? findLayer(kids(doc.psd), inShape)?._shape : null;
    const dark = shp ? (() => { const h = shp.color.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16); return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 140; })() : false;
    const px = Math.max(12, Math.round(Math.min(doc.psd.width, doc.psd.height) * 0.04));
    const l = textLayer(doc, { align: inShape ? "center" : "left", boxW: Math.round(b.w), boxH: Math.round(b.h), ...(inShape ? { color: dark ? "#FFFFFF" : "#111111" } : {}) }, " ");
    l.name = "글자";
    offsetLayer(l, Math.round(b.x) - (l.left || 0), Math.round(b.y) - (l.top || 0));
    applyText(l, { ...l._look!, px });
    insert(l);
    startEdit(l._k!, true);
  };
  const ppi = doc?.psd.imageResources?.resolutionInfo?.horizontalResolution;
  /** 글 고치기 시작 — 고치기 전 모습을 기억 (Esc 면 되돌리고, 끝나면 되돌리기 기록 한 번) */
  const editOrig = useRef<{ k: string; look: ReturnType<typeof lookOf>; left: number; top: number; fresh?: boolean } | null>(null);
  const startEdit = (k: string, fresh = false) => {
    const l = doc ? findLayer(kids(doc.psd), k) : null;
    if (!l || !isText(l)) return;
    editOrig.current = { k, look: { ...lookOf(l) }, left: l.left || 0, top: l.top || 0, fresh };
    setSelS(k);
    setEditing(k);
  };
  const docLabel = (d: Doc) => {
    const z = store.view.get(d.id)?.z;
    return `${d.name}${z ? ` @ ${Math.round(z * 100)}%` : ""} (${d.mode === "cmyk" ? "CMYK" : "RGB"}/8)${d.dirty ? " *" : ""}`;
  };
  // 탭 자리에 보이는 문서 — 지금 문서가 탭이면 그것, 떠 있으면 마지막으로 보던 탭
  const docked = store.docs.filter((d) => !store.float.has(d.id));
  const dockD = docked.find((d) => d.id === store.active) || docked.find((d) => d.id === store.dock) || docked[docked.length - 1] || null;
  /** 문서 하나의 그림판 — 지금 문서만 고칠 수 있고, 다른 문서는 누르면 그 문서로 바뀐다. 레이어 칸에서 끌어온 레이어는 복사 */
  const docBox = (d: Doc) => {
    const on = d.id === doc?.id;
    return (
      <div data-doc={d.id} style={{ flex: 1, minHeight: 0, display: "flex", position: "relative", isolation: "isolate" /* 막이 떠 있는 창 위로 올라가지 않게 */ }}
        onPointerDownCapture={() => { if (!on && tool === "move") activate(d.id); /* 이동 도구: 누른 그 손으로 바로 레이어를 잡는다 */ }}
        onDragOver={(e) => { if (!on && e.dataTransfer.types.includes(LAYER_DRAG)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
        onDrop={(e) => {
          const k = e.dataTransfer.getData(LAYER_DRAG);
          if (on || !k || !doc) return;
          e.preventDefault();
          const l = findLayer(kids(doc.psd), k);
          const lb = l ? boundsOfL(l) : null;
          if (l && lb) copyLayerTo(d.id, l, e.clientX, e.clientY, lb.w / 2, lb.h / 2);
        }}>
        <Stage key={d.id} doc={d} tick={tick} view={store.view.get(d.id) || null} setView={(v) => { store.view.set(d.id, v); bump(); }}
          sel={on ? sel : null} onSel={setSel} fitKey={store.fit.get(d.id) || 0} tool={tool} onTextAt={addTextAt} onTextBox={addTextBox}
          rulers={vis.rulers} grid={vis.grid ? gridSizes.get(d.id) || niceGrid(d.psd.width, d.psd.height) : 0}
          proof={d.mode === "cmyk" && vis.proof !== false}
          guidesOn={vis.guides} guideList={guidesOf(d)} onGuides={(g) => mutate(() => setGuides(d, g))}
          paint={paint} onPaintTarget={paintTarget} onPaintEnd={(l) => {
            if (l._maskOf) {
              // 마스크에 칠한 것 → 진짜 레이어 마스크로 (새 그림으로 두어 되돌리기 기록이 섞이지 않게)
              const real = findLayer(kids(d.psd), l._maskOf);
              if (real?.mask && l.canvas) { forgetMask(real.mask.canvas); real.mask = { ...real.mask, canvas: copyCanvas(l.canvas) }; }
              bump();
              return;
            }
            if (l.canvas) { l.canvas = copyCanvas(l.canvas); trimLayer(l); }
            bump();
          }}
          onPickColor={(hex, toBg) => setPaint(toBg ? { bg: hex } : { fg: hex })} onSay={say}
          autoSel={autoSel.on} autoGroup={autoSel.group} onLayerMenu={(x, y, keys) => setLayerMenu({ x, y, keys })}
          selAll={on ? allSel() : []} onAddSel={(k) => pickSel(k, null)} onMoveMany={moveMany}
          onMove={(k, dx, dy) => { const l = findLayer(kids(d.psd), k); if (l && (dx || dy)) mutate(() => offsetLayer(l, dx, dy)); }}
          onMoveSel={(k, dx, dy) => {
            // 선택 영역 옮기기 — 그 레이어의 선택한 부분을 잘라 옮겨 붙이고, 선택 영역도 같이 옮긴다 (포토샵처럼)
            const l = findLayer(kids(d.psd), k);
            const m = selOf(d);
            if (!l?.canvas || !m || (!dx && !dy)) return;
            const ox = l.left || 0, oy = l.top || 0;
            const ex = extract(l.canvas, ox, oy, m);
            if (!ex) return;
            const hole = clearInside(l.canvas, m, ox, oy);
            const nx = ex.x + dx, ny = ex.y + dy;
            const x0 = Math.min(ox, nx), y0 = Math.min(oy, ny), x1 = Math.max(ox + hole.width, nx + ex.c.width), y1 = Math.max(oy + hole.height, ny + ex.c.height);
            const c = document.createElement("canvas");
            c.width = Math.max(1, x1 - x0); c.height = Math.max(1, y1 - y0);
            const g = c.getContext("2d")!;
            g.drawImage(hole, ox - x0, oy - y0);
            g.drawImage(ex.c, nx - x0, ny - y0);
            const nm = document.createElement("canvas");
            nm.width = m.width; nm.height = m.height;
            nm.getContext("2d")!.drawImage(m, dx, dy);
            mutate(() => { delete l._src; l.canvas = c; l.left = x0; l.top = y0; l.right = x1; l.bottom = y1; trimLayer(l); });
            setSelMask(nm);
          }}
          onResize={(k, box: Box) => { const l = findLayer(kids(d.psd), k); if (l) mutate(() => applyResize(l, box)); }}
          onRotate={(k, deg) => { const l = findLayer(kids(d.psd), k); if (l) mutate(() => rotateLayer(l, deg)); }}
          selMask={on ? selOf(d) : sels.get(d.id)?.cur || null} selMode={selMode} onSelect={onSelectShape} onDeselect={() => setSelMask(null)}
          crop={on ? crop : null} onCrop={setCrop} onCropApply={() => applyCrop()}
          onPathEdit={(k, pts) => {
            // 펜으로 그린 모양의 점 고치기 — 같은 레이어 그대로 (이름·효과 유지)
            const l = findLayer(kids(d.psd), k);
            if (!l?._shape) return;
            const nl = penShapeLayer(pts, l._shape.color);
            if (!nl) return;
            mutate(() => { l._shape = nl._shape; l.canvas = nl.canvas; l.left = nl.left; l.top = nl.top; l.right = nl.right; l.bottom = nl.bottom; }, `path-${k}`);
          }}
          onPen={(pts) => {
            if (penMode === "sel") { onSelectShape({ kind: "path", pts }, selMode); return; }
            const l = penShapeLayer(pts, paint.fg);
            if (l) insert(l);
          }}
          onShape={(kind, box, dir) => { insert(shapeLayerAt(kind, box, paint.fg, { radius: shapeOpt.radius, lw: shapeOpt.lw, dir })); }}
          onDropOut={(k, cx, cy, gx, gy) => {
            const t = docUnder(cx, cy);
            const l = findLayer(kids(d.psd), k);
            if (!t || t === d.id || !l) return false;
            copyLayerTo(t, l, cx, cy, gx, gy);
            return true;
          }}
          onEditText={(k) => startEdit(k)}
          editing={on ? editing : null}
          onEditLive={(k, text) => {
            const l = findLayer(kids(d.psd), k);
            if (!l) return;
            applyText(l, { ...lookOf(l), text: text || " " });
            bump();
          }}
          onEditDone={(k, text) => {
            setEditing(null);
            const l = findLayer(kids(d.psd), k);
            const o = editOrig.current;
            editOrig.current = null;
            if (!l || !o || o.k !== k) return;
            // 글자를 다 지우고 끝내면 레이어도 지운다 (포토샵처럼 — 빈 글자 레이어가 남아 다시 누르면 옛 글자가 살아나지 않게)
            const empty = (text !== null && !text.trim()) || (text === null && o.fresh);
            if (empty) {
              if (o.fresh) { undo(); return; } // 방금 만든 빈 레이어 — 만든 것까지 없던 일로
              mutate(() => { const pl = parentList(kids(d.psd), k); if (pl) pl.list.splice(pl.i, 1); });
              setSelS(null);
              return;
            }
            // 고치기 전 모습으로 돌려놓고, 바뀌었으면 되돌리기 기록 한 번으로 다시
            const look = lookOf(l);
            l.left = o.left; l.top = o.top;
            applyText(l, o.look);
            if (text === null || text === o.look.text) { bump(); return; }
            const wasAuto = !l.name || l.name === o.look.text.slice(0, 20) || !!o.fresh;
            mutate(() => {
              applyText(l, { ...look, text: text || " " });
              if (wasAuto) l.name = (text || "글자").replace(/\s+/g, " ").slice(0, 20);
            });
          }}
          onDropFiles={(f) => void onDropFiles(f)} />
        {/* 여러 쪽 — 지금 문서의 쪽 목록 (2026-10-23) */}
        {on && <PageStrip doc={d} tick={tick} onGo={goPage} onAdd={newPage} onDel={delPage} onMove={shiftPage} />}
        {/* 다른 문서 — 누르면 그 문서로 (포토샵처럼 창을 앞으로) */}
        {/* 다른 문서 — 이동 도구가 아니면 첫 클릭은 그 문서로 바꾸기만 (붓질이 엉뚱한 문서에 가지 않게) */}
        {!on && tool !== "move" && <div style={{ position: "absolute", inset: 0, zIndex: 20, cursor: "default" }} onPointerDown={(e) => { e.preventDefault(); activate(d.id); }} />}
      </div>
    );
  };
  /** 복사한 레이어 이름 — "원래 복사", 이미 있으면 "원래 복사 2", "원래 복사 3" … (포토샵처럼) */
  const copyName = (name: string, d: Doc | null = doc) => {
    const base = (name || "레이어").replace(/ 복사( \d+)?$/, "");
    const names = new Set<string>();
    if (d) walkNames(kids(d.psd), (nm) => names.add(nm));
    if (!names.has(`${base} 복사`)) return `${base} 복사`;
    let n = 2;
    while (names.has(`${base} 복사 ${n}`)) n++;
    return `${base} 복사 ${n}`;
  };
  const nextName = (base: string) => {
    let n = 1;
    if (doc) walkNames(kids(doc.psd), (nm) => { const m = new RegExp(`^${base} (\\d+)$`).exec(nm); if (m) n = Math.max(n, Number(m[1]) + 1); });
    return `${base} ${n}`;
  };
  const placeAbove = (l: PLayer) => {
    if (!doc) return;
    const pl = sel ? parentList(kids(doc.psd), sel) : null;
    if (pl && !pl.list[pl.i].children) pl.list.splice(pl.i + 1, 0, l);
    else if (pl && pl.list[pl.i].children) kids(pl.list[pl.i]).push(l); // 그룹을 골랐으면 그 안 맨 위
    else if (doc.psd.children) doc.psd.children.push(l);
    else doc.psd.children = [l];
  };
  /** [+] 새 레이어 — 빈 투명 그림 레이어 (포토샵 Shift+Ctrl+N) */
  const newLayer = (base = "레이어"): PLayer | null => {
    if (!doc) return null;
    const W = doc.psd.width, H = doc.psd.height;
    const l: PLayer = { _k: uid(), name: nextName(base), canvas: mk(W, H), left: 0, top: 0, right: W, bottom: H };
    mutate(() => placeAbove(l));
    setSelS(l._k!);
    return l;
  };
  /** [폴더] 묶기 — 고른 레이어를 새 그룹으로, 안 골랐으면 빈 그룹 */
  const newGroup = () => {
    if (!doc) return;
    if (sel) { void act(sel, "group"); return; }
    const g: PLayer = { _k: uid(), name: nextName("그룹"), opened: true, children: [], blendMode: "pass through" };
    mutate(() => placeAbove(g));
    setSelS(g._k!);
  };
  /** 색칠할 레이어 — 고른 그림 레이어에 (포토샵처럼). 없거나 글자·도형이면 새 레이어. 그레이디언트는 늘 새 레이어 */
  const paintTarget = (kind: Tool): PLayer | null => {
    if (!doc) return null;
    const ml = maskLayer();
    if (ml) {
      if (kind === "stamp" || kind === "heal") { say("마스크에는 브러시·지우개·페인트 통·그레이디언트로 칠해요"); return null; }
      return maskProxy(ml);
    }
    const cur = sel ? findLayer(kids(doc.psd), sel) : null;
    const W = doc.psd.width, H = doc.psd.height;
    if (kind !== "gradient" && paintable(cur) && !cur.hidden) {
      mutate(() => preparePaint(cur, W, H));
      return cur;
    }
    if (kind === "eraser") { say("지울 그림 레이어를 먼저 골라 주세요"); return null; }
    return newLayer(kind === "gradient" ? "그레이디언트" : "레이어");
  };

  /* 맨 위 메뉴줄 (포토샵처럼 파일 · 편집 · 이미지 · 레이어 · 문자 · 보기 · 도움말) */
  type MI = { t: string; key?: string; go?: () => void; off?: boolean; on?: boolean; sub?: MI[] } | "-";
  /* 이미지 › 이미지 회전 · 복제 */
  const docRotate = (deg: 90 | 180 | 270) => { if (!doc) return; mutate(() => rotateDoc(doc, deg)); sels.delete(doc.id); fitDoc(doc.id); };
  const dupDoc = () => {
    if (!doc) return;
    const d2 = newDoc({ name: `${doc.name} 복사`, width: doc.psd.width, height: doc.psd.height, bg: "transparent", ppi: doc.psd.imageResources?.resolutionInfo?.horizontalResolution });
    d2.psd.children = cloneTree(kids(doc.psd));
    d2.mode = doc.mode;
    d2.meta = doc.meta;
    setGuidesDoc(d2, cloneTree(guidesOfDoc(doc)));
    d2.dirty = true;
    d2.pristine = false;
    addDoc(d2);
    syncDirty();
  };
  const S = sel || "";
  const hasSelMask = Boolean(selOf(doc));
  const menus: { id: string; label: string; items: MI[] }[] = [
    { id: "file", label: "파일", items: [
      { t: "새로 만들기…", key: "Ctrl+N", go: () => setNewOpen(true) },
      { t: "열기…", key: "Ctrl+O", go: () => void openPick() },
      { t: "최근 파일 · 처음 화면", go: () => { store.home = true; setSel(null); bump(); } },
      "-",
      { t: "닫기", key: "Ctrl+W", go: () => doc && closeDoc(doc), off: !doc },
      { t: "저장", key: "Ctrl+S", go: () => doc && void save(doc), off: !doc },
      { t: "다른 이름으로 저장…", key: "Shift+Ctrl+S", go: () => doc && void save(doc, true), off: !doc },
      { t: "웹용으로 저장 (JPG · PNG · GIF · WebP)…", key: "Alt+Shift+Ctrl+S", go: () => setWebDlg({ fmt: "jpg", q: 0.8, scale: 1 }), off: !doc },
      "-",
      { t: "인쇄…", key: "Ctrl+P", go: openPrint, off: !doc },
      "-",
      { t: "AI 자동 디자인 (공실·기사 가져오기)…", go: openDesign },
      { t: "내 템플릿으로 저장…", go: () => doc && void saveMine(doc.name), off: !doc },
      "-",
      { t: "사진 가져오기 (PC에서)…", go: () => void addImages(), off: !doc },
      { t: "내보내기 › PNG…", go: () => void exportAs("png"), off: !doc },
      { t: "내보내기 › JPG…", go: () => void exportAs("jpg"), off: !doc },
    ] },
    { id: "edit", label: "편집", items: [
      { t: "실행 취소", key: "Ctrl+Z", go: undo, off: !h?.undo.length },
      { t: "다시 실행", key: "Shift+Ctrl+Z", go: redo, off: !h?.redo.length },
      "-",
      { t: "잘라내기", key: "Ctrl+X", go: () => copySel(true), off: !sel },
      { t: "복사", key: "Ctrl+C", go: () => copySel(false), off: !sel },
      { t: "붙여넣기", key: "Ctrl+V", go: pasteClip, off: !clip },
      { t: "지우기 (선택 영역 안)", key: "Delete", go: clearSel, off: !hasSelMask },
      "-",
      { t: "칠…", key: "Shift+F5", go: () => setFillDlg(true), off: !doc },
      { t: "획…", go: () => setStrokeDlg(true), off: !hasSelMask },
      { t: "전경색으로 채우기", key: "Alt+Backspace", go: () => fillWith(paint.fg), off: !doc },
      { t: "배경색으로 채우기", key: "Ctrl+Backspace", go: () => fillWith(paint.bg), off: !doc },
      "-",
      { t: "자유 변형 (모서리 바깥을 끌면 회전)", key: "Ctrl+T", go: () => setTool("move"), off: !sel },
      { t: "변형 › 90° 시계 방향 회전", go: () => rotSel(90), off: !sel },
      { t: "변형 › 90° 반시계 방향 회전", go: () => rotSel(-90), off: !sel },
      { t: "변형 › 180° 회전", go: () => rotSel(180), off: !sel },
      { t: "변형 › 가로로 뒤집기", go: () => flipSel(true), off: !sel },
      { t: "변형 › 세로로 뒤집기", go: () => flipSel(false), off: !sel },
      { t: "레이어 복제", key: "Ctrl+J", go: () => toNewLayer(false), off: !sel },
    ] },
    { id: "image", label: "이미지", items: [
      { t: "모드", off: !doc, sub: [
        { t: "RGB 색상 (화면용)", go: () => doc && doc.mode === "cmyk" && mutate(() => { doc.mode = "rgb"; }), on: doc?.mode !== "cmyk", off: !doc },
        { t: "CMYK 색상 (인쇄용)", go: () => doc && doc.mode !== "cmyk" && mutate(() => { doc.mode = "cmyk"; }), on: doc?.mode === "cmyk", off: !doc },
      ] },
      "-",
      { t: "조정", off: !doc, sub: [
        { t: "명도/대비…", go: () => openAdj("brightCon"), off: !sel },
        { t: "레벨…", key: "Ctrl+L", go: () => openAdj("levels"), off: !sel },
        { t: "곡선…", key: "Ctrl+M", go: () => openAdj("curves"), off: !sel },
        "-",
        { t: "색조/채도…", key: "Ctrl+U", go: () => openAdj("hueSat"), off: !sel },
        { t: "색상 균형…", key: "Ctrl+B", go: () => openAdj("balance"), off: !sel },
        { t: "흑백", key: "Alt+Shift+Ctrl+B", go: () => adjust("gray"), off: !sel },
        "-",
        { t: "반전", key: "Ctrl+I", go: () => adjust("invert"), off: !sel },
      ] },
      "-",
      { t: "자동 톤", key: "Shift+Ctrl+L", go: () => adjust("autoTone"), off: !sel },
      { t: "자동 대비", key: "Alt+Shift+Ctrl+L", go: () => adjust("autoContrast"), off: !sel },
      { t: "자동 색상", key: "Shift+Ctrl+B", go: () => adjust("autoColor"), off: !sel },
      "-",
      { t: "이미지 크기…", key: "Alt+Ctrl+I", go: () => setImgDlg("size"), off: !doc },
      { t: "캔버스 크기…", key: "Alt+Ctrl+C", go: () => setImgDlg("canvas"), off: !doc },
      { t: "이미지 회전", off: !doc, sub: [
        { t: "180°", go: () => docRotate(180), off: !doc },
        { t: "90° 시계 방향", go: () => docRotate(90), off: !doc },
        { t: "90° 시계 반대 방향", go: () => docRotate(270), off: !doc },
        "-",
        { t: "캔버스 가로로 뒤집기", go: () => doc && mutate(() => flipDoc(doc, true)), off: !doc },
        { t: "캔버스 세로로 뒤집기", go: () => doc && mutate(() => flipDoc(doc, false)), off: !doc },
      ] },
      { t: "자르기", go: () => { const m = selOf(doc); const b = m && maskBounds(m); if (b) applyCrop(b); }, off: !hasSelMask },
      { t: "재단…", go: () => setImgDlg("trim"), off: !doc },
      { t: "모두 나타내기", go: () => { if (!doc) return; const r = revealBox(doc); if (!r) return say("캔버스 밖으로 나간 레이어가 없어요"); mutate(() => canvasRect(doc, r, "")); sels.delete(doc.id); fitDoc(doc.id); }, off: !doc },
      "-",
      { t: "복제…", go: dupDoc, off: !doc },
      "-",
      { t: "배경만 다시 만들기 (AI)", go: () => void regenBg(), off: !doc?.meta?.ai?.prompt },
    ] },
    { id: "page", label: "쪽", items: [
      { t: "새 쪽 (흰 쪽)", go: () => newPage(false), off: !doc },
      { t: "쪽 복제", go: () => newPage(true), off: !doc },
      { t: "쪽 지우기…", go: () => doc && delPage(pageIndex(doc)), off: !doc || pageCount(doc) <= 1 },
      "-",
      { t: "앞 쪽", key: "PageUp", go: () => doc && goPage(pageIndex(doc) - 1), off: !doc || pageIndex(doc) <= 0 },
      { t: "다음 쪽", key: "PageDown", go: () => doc && goPage(pageIndex(doc) + 1), off: !doc || pageIndex(doc) >= pageCount(doc) - 1 },
      "-",
      { t: "이 쪽을 앞으로", go: () => doc && shiftPage(pageIndex(doc), -1), off: !doc || pageIndex(doc) <= 0 },
      { t: "이 쪽을 뒤로", go: () => doc && shiftPage(pageIndex(doc), 1), off: !doc || pageIndex(doc) >= pageCount(doc) - 1 },
    ] },
    { id: "layer", label: "레이어", items: [
      { t: "새 레이어", key: "Shift+Ctrl+N", go: () => newLayer(), off: !doc },
      { t: "새 그룹", go: () => { setSelS(null); const g: PLayer = { _k: uid(), name: nextName("그룹"), opened: true, children: [], blendMode: "pass through" }; if (doc) { mutate(() => { if (doc.psd.children) doc.psd.children.push(g); else doc.psd.children = [g]; }); setSelS(g._k!); } }, off: !doc },
      "-",
      { t: "새 그룹으로 묶기", key: "Ctrl+G", go: () => void act(S, "group"), off: !sel },
      { t: "그룹 풀기", key: "Shift+Ctrl+G", go: () => void act(S, "ungroup"), off: !selL?.children },
      { t: "레이어 복제", key: "Ctrl+J", go: () => void act(S, "dup"), off: !sel },
      { t: "레이어 삭제", go: () => void act(S, "del"), off: !sel },
      "-",
      { t: "레이어 스타일 (혼합 옵션)…", go: () => void act(S, "fx"), off: !sel || Boolean(selL?.children) },
      { t: "레이어 마스크 › 모두 나타내기", go: () => addMask(false, false), off: !sel || Boolean(selL?.mask?.canvas) || Boolean(selL?.children) },
      { t: "레이어 마스크 › 모두 숨기기", go: () => addMask(true, false), off: !sel || Boolean(selL?.mask?.canvas) || Boolean(selL?.children) },
      { t: "레이어 마스크 › 선택 영역 나타내기", go: () => addMask(false, true), off: !sel || !hasSelMask || Boolean(selL?.mask?.canvas) || Boolean(selL?.children) },
      { t: "레이어 마스크 › 선택 영역 숨기기", go: () => addMask(true, true), off: !sel || !hasSelMask || Boolean(selL?.mask?.canvas) || Boolean(selL?.children) },
      { t: selL?.mask?.disabled ? "레이어 마스크 › 사용" : "레이어 마스크 › 사용 안 함", go: () => maskOp("toggle"), off: !selL?.mask?.canvas },
      { t: "레이어 마스크 › 적용 (그림에 굽기)", go: () => maskOp("apply"), off: !selL?.mask?.canvas },
      { t: "레이어 마스크 › 삭제", go: () => maskOp("delete"), off: !selL?.mask?.canvas },
      "-",
      { t: "클리핑 마스크 만들기 / 풀기", key: "Alt+Ctrl+G", go: toggleClip, off: !sel, on: Boolean(selL?.clipping) },
      { t: "아래 레이어와 병합", key: "Ctrl+E", go: () => void act(S, "merge"), off: !sel },
      { t: "보이는 레이어 병합", key: "Shift+Ctrl+E", go: () => mergeVisible(false), off: !doc },
      { t: "보이는 결과를 새 레이어로", key: "Shift+Ctrl+Alt+E", go: () => mergeVisible(true), off: !doc },
      { t: "래스터화 (그림으로)", go: () => void act(S, "raster"), off: !sel },
      { t: "PNG 빠른 내보내기", go: () => void act(S, "png"), off: !sel || Boolean(selL?.children) },
      "-",
      { t: "맨 앞으로 가져오기", key: "Shift+Ctrl+]", go: () => toEnd(true), off: !sel },
      { t: "앞으로 가져오기", key: "Ctrl+]", go: () => void act(S, "up"), off: !sel },
      { t: "뒤로 보내기", key: "Ctrl+[", go: () => void act(S, "down"), off: !sel },
      { t: "맨 뒤로 보내기", key: "Shift+Ctrl+[", go: () => toEnd(false), off: !sel },
      "-",
      { t: selL?.protected?.position ? "잠금 풀기" : "레이어 잠그기", go: () => void act(S, "lock"), off: !sel },
      { t: selL?.hidden ? "레이어 보이기" : "레이어 숨기기", go: () => void act(S, "hide"), off: !sel },
      "-",
      { t: "사각형 넣기", go: () => doc && insert(shapeLayer(doc)), off: !doc },
      { t: "그래픽 · 픽토그램 넣기…", go: () => setSide("sticker"), off: !doc },
      { t: "디자인 템플릿 넣기 (레이어로)…", go: () => { loadMine(); setSide("tpl"); }, off: !doc },
    ] },
    { id: "type", label: "문자", items: [
      { t: "가로 문자 넣기", key: "T", go: addText, off: !doc },
      { t: "글 고치기", go: () => sel && startEdit(sel), off: !selL || !isText(selL) },
      "-",
      { t: "텍스트 뒤틀기…", go: openWarp, off: !selL || !isText(selL), on: Boolean(selL && isText(selL) && lookOf(selL).warp) },
    ] },
    { id: "select", label: "선택", items: [
      { t: "모두", key: "Ctrl+A", go: () => doc && setSelMask(selectAll(doc.psd.width, doc.psd.height), { kind: "rect", box: { x: 0, y: 0, w: doc.psd.width, h: doc.psd.height } }), off: !doc },
      { t: "선택 해제", key: "Ctrl+D", go: () => setSelMask(null), off: !hasSelMask },
      { t: "다시 선택", key: "Shift+Ctrl+D", go: () => { const o = doc && sels.get(doc.id); if (o?.prev) setSelMask(o.prev, o.pvec || null); }, off: !(doc && sels.get(doc.id)?.prev) },
      { t: "반전", key: "Shift+Ctrl+I", go: () => { const m = selOf(doc); setSelMask(m ? invertMask(m) : null); }, off: !hasSelMask },
      "-",
      { t: "수정 › 테두리…", go: () => setModDlg({ kind: "border", n: 10 }), off: !hasSelMask },
      { t: "수정 › 매끄럽게…", go: () => setModDlg({ kind: "smooth", n: 10 }), off: !hasSelMask },
      { t: "수정 › 확대…", go: () => setModDlg({ kind: "expand", n: 10 }), off: !hasSelMask },
      { t: "수정 › 축소…", go: () => setModDlg({ kind: "contract", n: 10 }), off: !hasSelMask },
      { t: "수정 › 페더…", key: "Shift+F6", go: () => setModDlg({ kind: "feather", n: 10 }), off: !hasSelMask },
      "-",
      { t: "선택 영역을 복사한 레이어", key: "Ctrl+J", go: () => toNewLayer(false), off: !hasSelMask || !sel },
      { t: "선택 영역을 잘라낸 레이어", key: "Shift+Ctrl+J", go: () => toNewLayer(true), off: !hasSelMask || !sel },
    ] },
    { id: "filter", label: "필터", items: [
      { t: lastFilter.current ? `마지막 필터 (${FILTERS[lastFilter.current.id]?.name || ""})` : "마지막 필터", key: "Alt+Ctrl+F", go: () => lastFilter.current && openFilter(lastFilter.current.id, true), off: !lastFilter.current || !sel },
      "-",
      { t: "스마트 필터용으로 변환", off: true },
      "-",
      { t: "뉴럴 필터…", off: true },
      "-",
      { t: "필터 갤러리…", off: true },
      { t: "응용 광각…", key: "Alt+Shift+Ctrl+A", go: () => openFilter("wideAngle"), off: !sel },
      { t: "Camera Raw 필터… (곡선으로)", key: "Shift+Ctrl+A", go: () => openAdj("curves"), off: !sel },
      { t: "AI 노이즈 제거…", go: () => aiFilter("Remove the noise and grain from this photo while keeping all details sharp and natural."), off: !sel },
      { t: "AI 선명 효과…", go: () => aiFilter("Make this photo sharper and clearer — enhance fine detail and focus naturally, without changing anything else."), off: !sel },
      { t: "렌즈 교정…", key: "Shift+Ctrl+R", go: () => openFilter("lensCorrect"), off: !sel },
      { t: "픽셀 유동화…", key: "Shift+Ctrl+X", off: true },
      { t: "소실점…", key: "Alt+Ctrl+V", off: true },
      "-",
      ...FILTER_MENU.map((g): MI => ({ t: g.group, off: !sel, sub: g.items.map((it): MI => (Array.isArray(it) ? { t: it[0], off: true } : { t: `${FILTERS[it].name}${FILTERS[it].params?.length ? "…" : ""}`, go: () => openFilter(it), off: !sel })) })),
    ] },
    { id: "view", label: "보기", items: [
      { t: "인쇄 색 미리보기 (CMYK)", key: "Ctrl+Y", go: () => setVis({ proof: vis.proof === false }), on: doc?.mode === "cmyk" && vis.proof !== false, off: doc?.mode !== "cmyk" },
      "-",
      { t: "눈금자", key: "Ctrl+R", go: () => setVis({ rulers: !vis.rulers }), on: vis.rulers },
      { t: "격자", key: "Ctrl+'", go: () => setVis({ grid: !vis.grid }), on: vis.grid },
      { t: "안내선", key: "Ctrl+;", go: () => setVis({ guides: !vis.guides }), on: vis.guides },
      { t: "격자 간격…", go: () => { setVis({ grid: true }); setSel(null); }, off: !doc },
      { t: "새 안내선 (가로 가운데)", go: () => doc && mutate(() => setGuides(doc, [...guidesOf(doc), { location: doc.psd.height / 2, direction: "horizontal" }])), off: !doc },
      { t: "새 안내선 (세로 가운데)", go: () => doc && mutate(() => setGuides(doc, [...guidesOf(doc), { location: doc.psd.width / 2, direction: "vertical" }])), off: !doc },
      { t: "안내선 모두 지우기", go: () => doc && mutate(() => setGuides(doc, [])), off: !doc || !guidesOf(doc).length },
      "-",
      { t: "확대", key: "Ctrl++", go: () => zoomBy(1.25), off: !doc },
      { t: "축소", key: "Ctrl+-", go: () => zoomBy(1 / 1.25), off: !doc },
      { t: "화면 크기에 맞추기", key: "Ctrl+0", go: () => doc && fitDoc(doc.id), off: !doc },
      { t: "100%", key: "Ctrl+1", go: () => { if (doc) { const v = store.view.get(doc.id); if (v) { store.view.set(doc.id, { ...v, z: 1 }); bump(); } } }, off: !doc },
      "-",
      { t: "패널 숨기기 / 보이기", key: "Tab", go: () => setPanelsHidden((x) => !x), on: panelsHidden },
      { t: "전체 화면", key: "F", go: toggleFull },
    ] },
    { id: "window", label: "창", items: [
      { t: "상황별 작업 표시줄 (AI 요청바)", go: () => setAiBar(!aiBar), on: aiBar, off: !doc },
      "-",
      { t: "떠 있는 창으로 빼기", go: () => doc && floatDoc(doc.id), off: !doc || store.float.has(doc?.id || "") },
      { t: "탭으로 붙이기", go: () => doc && dockDoc(doc.id), off: !doc || !store.float.has(doc?.id || "") },
      "-",
      { t: "모두 탭으로 합치기", go: dockAll, off: !store.float.size },
      { t: "바둑판식으로 나란히 보기", go: tileAll, off: store.docs.length < 2 },
    ] },
    { id: "help", label: "도움말", items: [
      { t: "단축키 안내", go: () => setKeysOpen(true) },
    ] },
  ];
  /** 메뉴 한 줄 — sub 가 있으면 ▸ 하위 메뉴 (마우스를 올리면 오른쪽에, 포토샵처럼) */
  const menuRow = (it: MI, i: number, key: string): React.ReactNode => {
    if (it === "-") return <div key={i} style={{ height: 1, background: C.psMenuSep, margin: "4px 0" }} />;
    const open = Boolean(it.sub) && subOpen === key && !it.off;
    return (
      <div key={i} style={{ position: "relative" }} onMouseEnter={() => setSubOpen(it.sub ? key : key.split("-").slice(0, -1).join("-"))}>
        <button type="button" disabled={it.off} onClick={() => { if (it.sub) { setSubOpen(open ? "" : key); return; } setMenuOpen(""); setSubOpen(""); it.go?.(); }}
          style={{ display: "flex", width: "100%", alignItems: "center", gap: 16, padding: "6px 16px 6px 22px", border: 0, background: open ? C.psHi : "transparent", color: it.off ? C.psOff : C.psMenuText, fontSize: 13.5, fontFamily: FONT, textAlign: "left", cursor: it.off ? "default" : "pointer", whiteSpace: "nowrap" }}
          onMouseEnter={(e) => { if (!it.off) e.currentTarget.style.background = C.psHi; }} onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ width: 12, marginLeft: -14, color: C.psMenuText }}>{it.on ? "✓" : ""}</span><span style={{ flex: 1 }}>{it.t}</span>
          {it.key && <span style={{ color: it.off ? "#666" : "#aaa", fontSize: 12.5 }}>{it.key}</span>}
          {it.sub && <span style={{ color: it.off ? "#666" : "#ccc", fontSize: 10 }}>▶</span>}
        </button>
        {open && (
          <div style={{ position: "absolute", left: "100%", top: -4, minWidth: 220, padding: "4px 0", background: C.psMenu, border: `1px solid ${C.psBarLine}`, borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
            {it.sub!.map((x, j) => menuRow(x, j, `${key}-${j}`))}
          </div>
        )}
      </div>
    );
  };
  const menuBar = (
    <div style={{ display: "flex", alignItems: "center", height: 30, padding: "0 6px", background: C.psBar, borderBottom: `1px solid ${C.psBarLine}`, flexShrink: 0, position: "relative", zIndex: 60 }}>
      {railHidden && hasDoc && (
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("studio:rail", { detail: false }))} title="왼쪽 메뉴 보이기"
          style={{ width: 26, height: 24, marginRight: 4, border: `1px solid ${C.psEdge}`, borderRadius: 4, background: "transparent", color: C.psDdd, fontSize: 15, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}>»</button>
      )}
      {menus.map((m) => (
        <div key={m.id} style={{ position: "relative" }}>
          <button type="button" onClick={() => { setMenuOpen(menuOpen === m.id ? "" : m.id); setSubOpen(""); }} onMouseEnter={() => { if (menuOpen) { setMenuOpen(m.id); setSubOpen(""); } }}
            style={{ height: 26, padding: "0 10px", border: 0, borderRadius: 4, background: menuOpen === m.id ? C.psOpen : "transparent", color: C.psDdd, fontSize: 13.5, fontFamily: FONT, cursor: "pointer" }}>{m.label}</button>
          {menuOpen === m.id && (
            <div style={{ position: "absolute", left: 0, top: 28, minWidth: 250, padding: "4px 0", background: C.psMenu, border: `1px solid ${C.psBarLine}`, borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
              {m.items.map((it, i) => menuRow(it, i, `${m.id}-${i}`))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  /* 옵션줄 — 집 · 지금 도구 · 맞춤 · 되돌리기 … 오른쪽에 저장 · 내보내기 */
  const iconBtn = (icon: React.ReactNode, tip: string, go: () => void, disabled = false, on = false) => (
    <button type="button" title={tip} onClick={go} disabled={disabled}
      style={{ width: 32, height: 30, borderRadius: 4, border: 0, background: on ? C.psEdge : "transparent", color: disabled ? C.dim : C.text, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {typeof icon === "string" ? <Icon name={icon} size={18} /> : icon}
    </button>
  );
  const sep = <div style={{ width: 1, height: 22, background: C.line2, margin: "0 8px", flexShrink: 0 }} />;
  const svg = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={d} /></svg>;
  const alignTo = (fn: (b: Box, W: number, H: number) => [number, number]) => () => {
    const ls = selInOrder().filter((l) => !l.protected?.position);
    if (doc && ls.length > 1) {
      // 여러 개 — 고른 것들을 모두 담는 상자에 맞춘다 (포토샵처럼)
      const bs = ls.map((l) => boundsOfL(l)).filter((b): b is Box => Boolean(b));
      const U = { x: Math.min(...bs.map((b) => b.x)), y: Math.min(...bs.map((b) => b.y)) };
      const UW = Math.max(...bs.map((b) => b.x + b.w)) - U.x, UH = Math.max(...bs.map((b) => b.y + b.h)) - U.y;
      mutate(() => {
        for (const l of ls) {
          const b = boundsOfL(l);
          if (!b) continue;
          const [x, y] = fn({ ...b, x: b.x - U.x, y: b.y - U.y }, UW, UH);
          offsetLayer(l, Math.round(x + U.x - b.x), Math.round(y + U.y - b.y));
        }
      });
      return;
    }
    if (!doc || !selL || selL.protected?.position) return;
    const b = boundsOfL(selL);
    if (!b) return;
    const [x, y] = fn(b, doc.psd.width, doc.psd.height);
    mutate(() => offsetLayer(selL, Math.round(x - b.x), Math.round(y - b.y)));
  };
  /* 색칠 도구 옵션 — 끌개 + 숫자 */
  const optSlider = (name: string, v: number, min: number, max: number, set: (n: number) => void, unit = "") => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 10, fontSize: 12.5, color: C.sub, whiteSpace: "nowrap" }}>
      {name}
      <input type="range" min={min} max={max} value={v} onChange={(e) => set(Number(e.target.value))} style={{ width: 90, accentColor: C.accent }} />
      <input type="number" min={min} max={max} value={v} onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || min)))} onKeyDown={(e) => e.stopPropagation()}
        style={{ width: 52, height: 26, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, padding: "0 4px" }} />{unit}
    </label>
  );
  const seg = (on: boolean, text: string, go: () => void) => (
    <button type="button" onClick={go} style={{ height: 26, padding: "0 10px", borderRadius: 4, border: `1px solid ${on ? C.sel : C.line2}`, background: on ? C.sel : "transparent", color: on ? C.selText : C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", marginLeft: 4 }}>{text}</button>
  );
  const optionBar = doc && (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 42, padding: "0 8px", background: C.panel, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
      {iconBtn(svg("M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10"), "처음 화면 (새 파일 · 열기 · 최근 파일)", () => { store.home = true; setSel(null); bump(); })}
      {sep}
      <span style={{ fontSize: 13, color: C.sub, fontWeight: 700, minWidth: 90 }}>{TOOL_NAME[tool]}</span>
      {tool === "move" && (
        <>
          {sep}
          <label title="켜면 누른 곳의 레이어가 골라져요 · 끄면 고른 레이어만 움직여요 (Ctrl+누르기 = 언제나 마우스 바로 아래 레이어)"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.sub, whiteSpace: "nowrap", cursor: "pointer" }}>
            <input type="checkbox" checked={autoSel.on} onChange={(e) => setAutoSel({ on: e.target.checked })} />자동 선택:
          </label>
          <select value={autoSel.group ? "group" : "layer"} onChange={(e) => setAutoSel({ group: e.target.value === "group" })} disabled={!autoSel.on}
            style={{ height: 26, marginLeft: 6, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: autoSel.on ? C.text : C.dim, fontSize: 12.5, fontFamily: FONT }}>
            <option value="layer">레이어</option>
            <option value="group">그룹</option>
          </select>
          {sep}
          {iconBtn(svg("M4 3v18M8 7h12v4H8zM8 13h7v4H8z"), "왼쪽 맞춤 (캔버스)", alignTo((b) => [0, b.y]), !selL)}
          {iconBtn(svg("M12 3v18M5 7h14v4H5zM8 13h8v4H8z"), "가로 가운데 맞춤", alignTo((b, W) => [(W - b.w) / 2, b.y]), !selL)}
          {iconBtn(svg("M20 3v18M4 7h12v4H4zM9 13h7v4H9z"), "오른쪽 맞춤", alignTo((b, W) => [W - b.w, b.y]), !selL)}
          {iconBtn(svg("M3 4h18M7 8v12h4V8zM13 8v7h4V8z"), "위쪽 맞춤", alignTo((b) => [b.x, 0]), !selL)}
          {iconBtn(svg("M3 12h18M7 5v14h4V5zM13 8v8h4V8z"), "세로 가운데 맞춤", alignTo((b, _W, H) => [b.x, (H - b.h) / 2]), !selL)}
          {iconBtn(svg("M3 20h18M7 4v12h4V4zM13 9v7h4V9z"), "아래쪽 맞춤", alignTo((b, _W, H) => [b.x, H - b.h]), !selL)}
        </>
      )}
      {tool === "text" && (
        <>
          {/* 포토샵 문자 옵션줄의 [텍스트 뒤틀기] 단추 (T 아래 휜 선) */}
          {iconBtn(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 4h10M11 4v9" /><path d="M4 18q8-6 16 0" /></svg>, "텍스트 뒤틀기", openWarp, !selL || !isText(selL))}
          <span style={{ fontSize: 12.5, color: C.dim, marginLeft: 8 }}>누르면 한 줄 글자 · 끌면 글 칸 · 글자를 누르면 고치기</span>
        </>
      )}
      {tool === "zoom" && (
        <>
          {sep}
          {iconBtn(svg("M11 5a6 6 0 100 12 6 6 0 000-12zM21 21l-5.5-5.5M8 11h6M11 8v6"), "확대", () => zoomBy(1.25))}
          {iconBtn(svg("M11 5a6 6 0 100 12 6 6 0 000-12zM21 21l-5.5-5.5M8 11h6"), "축소", () => zoomBy(1 / 1.25))}
          <Btn small onClick={() => doc && fitDoc(doc.id)}>화면 맞추기</Btn>
          <span style={{ fontSize: 12.5, color: C.dim, marginLeft: 8 }}>누르면 확대 · Alt+누르면 축소</span>
        </>
      )}
      {(tool === "brush" || tool === "eraser" || tool === "stamp" || tool === "heal") && (
        <>
          {sep}
          {optSlider("크기", paint.size, 1, 500, (n) => setPaint({ size: n }), "px")}
          {optSlider("경도", Math.round(paint.hardness * 100), 0, 100, (n) => setPaint({ hardness: n / 100 }), "%")}
          {optSlider("불투명도", Math.round(paint.opacity * 100), 1, 100, (n) => setPaint({ opacity: n / 100 }), "%")}
        </>
      )}
      {tool === "bucket" && (
        <>
          {sep}
          <span title="칠할 색 — 전경색" style={{ display: "flex", alignItems: "center", gap: 6, height: 26, padding: "0 8px", borderRadius: 4, border: `1px solid ${C.line2}`, fontSize: 12.5, color: C.sub }}>
            <span style={{ width: 14, height: 14, borderRadius: 2, background: paint.fg, border: "1px solid #888" }} />전경색
          </span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 10, fontSize: 12.5, color: C.sub, whiteSpace: "nowrap" }}>모드:
            <select value={paint.fillMode || "source-over"} onChange={(e) => setPaint({ fillMode: e.target.value as GlobalCompositeOperation })}
              style={{ height: 26, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, fontFamily: FONT }}>
              {([["source-over", "표준"], ["multiply", "곱하기"], ["screen", "스크린"], ["overlay", "오버레이"], ["soft-light", "소프트 라이트"], ["darken", "어둡게 하기"], ["lighten", "밝게 하기"], ["color", "색상"], ["luminosity", "광도"]] as const).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
          {optSlider("불투명도", Math.round(paint.opacity * 100), 1, 100, (n) => setPaint({ opacity: n / 100 }), "%")}
          {optSlider("허용치", paint.tol, 0, 255, (n) => setPaint({ tol: n }))}
          {([["aa", "앤티 앨리어스", paint.aa !== false], ["contig", "인접", paint.contig !== false], ["allLayers", "모든 레이어", Boolean(paint.allLayers)]] as const).map(([k, t, on]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 10, fontSize: 12.5, color: C.sub, whiteSpace: "nowrap", cursor: "pointer" }}>
              <input type="checkbox" checked={on} onChange={(e) => setPaint({ [k]: e.target.checked } as Partial<PaintOpts>)} />{t}
            </label>
          ))}
        </>
      )}
      {tool === "gradient" && (
        <>
          {sep}
          <span style={{ width: 90, height: 22, borderRadius: 3, border: `1px solid ${C.line2}`, background: `linear-gradient(90deg, ${paint.fg}, ${paint.gradTo === "bg" ? paint.bg : "transparent"}), repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px` }} />
          {seg(paint.gradTo === "bg", "전경 → 배경", () => setPaint({ gradTo: "bg" }))}
          {seg(paint.gradTo === "clear", "전경 → 투명", () => setPaint({ gradTo: "clear" }))}
          <span style={{ width: 10 }} />
          {seg(paint.grad === "linear", "선형", () => setPaint({ grad: "linear" }))}
          {seg(paint.grad === "radial", "원형", () => setPaint({ grad: "radial" }))}
          {optSlider("불투명도", Math.round(paint.opacity * 100), 1, 100, (n) => setPaint({ opacity: n / 100 }), "%")}
        </>
      )}
      {maskEdit && <span style={{ marginLeft: 10, padding: "3px 8px", borderRadius: 4, background: "#1f2937", border: "1px solid #4b5563", fontSize: 12, color: "#e5e7eb", whiteSpace: "nowrap" }}>마스크에 칠하는 중 — 검정 = 숨기기 · 흰색 = 보이기 (X 로 바꾸기)</span>}
      {PAINT_TOOLS.includes(tool) && !maskEdit && tool !== "bucket" && <span style={{ fontSize: 12, color: C.dim, marginLeft: 10, whiteSpace: "nowrap" }}>{tool === "gradient" ? "끌어서 칠하기 · 새 레이어로" : tool === "eraser" ? "고른 그림 레이어를 지워요" : tool === "stamp" ? "Alt+누르기로 복제할 곳 찍기 → 칠하면 그곳이 복사돼요" : tool === "heal" ? "없앨 곳(잡티·전선·글씨)을 칠하면 둘레 색으로 메워요" : "Alt+누르기 = 색 뽑기"}</span>}
      {tool === "hand" && <span style={{ fontSize: 12.5, color: C.dim, marginLeft: 8 }}>끌어서 화면 옮기기 (다른 도구에서도 스페이스+끌기)</span>}
      {SEL_TOOLS.includes(tool) && (
        <>
          {sep}
          {seg(selMode === "new", "새 선택", () => setSelMode("new"))}
          {seg(selMode === "add", "더하기", () => setSelMode("add"))}
          {seg(selMode === "sub", "빼기", () => setSelMode("sub"))}
          {tool !== "wand" && (
            <label title="선택 영역 가장자리를 부드럽게 — 새로 그리는 선택부터 (이미 만든 선택은 선택 › 수정 › 페더, Shift+F6)"
              style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 12, fontSize: 12.5, color: C.sub, whiteSpace: "nowrap" }}>페더:
              <input type="number" min={0} max={250} value={feather} onChange={(e) => setFeather(Number(e.target.value))} onKeyDown={(e) => e.stopPropagation()}
                style={{ width: 56, height: 26, borderRadius: 4, border: `1px solid ${feather > 0 ? C.accent : C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, padding: "0 6px" }} />px
            </label>
          )}
          {tool === "wand" && (
            <>
              {optSlider("허용치", paint.tol, 0, 255, (n) => setPaint({ tol: n }))}
              <label style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 10, fontSize: 12.5, color: C.sub, whiteSpace: "nowrap" }}><input type="checkbox" checked={wandOpt.contig} onChange={(e) => setWandOpt({ ...wandOpt, contig: e.target.checked })} />인접</label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 10, fontSize: 12.5, color: C.sub, whiteSpace: "nowrap" }}><input type="checkbox" checked={wandOpt.all} onChange={(e) => setWandOpt({ ...wandOpt, all: e.target.checked })} />모든 레이어 샘플링</label>
            </>
          )}
          <span style={{ width: 10 }} />
          <Btn small onClick={() => setSelMask(null)}>선택 해제</Btn>
          <span style={{ fontSize: 12, color: C.dim, marginLeft: 10, whiteSpace: "nowrap" }}>{tool === "polyLasso" ? "점을 찍고 첫 점을 누르거나 두 번 누르면 닫혀요 · Esc 취소" : "Shift = 더하기 · Alt = 빼기 · Delete = 안을 지우기"}</span>
        </>
      )}
      {tool === "crop" && (
        <>
          {sep}
          {crop && <span style={{ fontSize: 12.5, color: C.sub, marginLeft: 6 }}>{Math.round(crop.w)} × {Math.round(crop.h)} px</span>}
          <span style={{ width: 10 }} />
          <Btn small primary onClick={() => applyCrop()}>✓ 자르기 (Enter)</Btn>
          <span style={{ width: 6 }} />
          <Btn small onClick={() => setCrop({ x: 0, y: 0, w: doc.psd.width, h: doc.psd.height })}>취소 (Esc)</Btn>
          <span style={{ fontSize: 12, color: C.dim, marginLeft: 10, whiteSpace: "nowrap" }}>손잡이를 끌거나 새로 끌어 그려요 · 두 번 누르면 적용</span>
        </>
      )}
      {(tool === "pen" || tool === "freePen" || tool === "curvePen") && (
        <>
          {sep}
          {seg(penMode === "shape", "모양 (전경색)", () => setPenMode("shape"))}
          {seg(penMode === "sel", "선택 영역", () => setPenMode("sel"))}
          <span style={{ fontSize: 12, color: C.dim, marginLeft: 10, whiteSpace: "nowrap" }}>{tool === "freePen" ? "누른 채 그리면 그대로 패스 · 떼면 닫힌 모양" : tool === "curvePen" ? "누르는 점마다 부드럽게 이어져요 · 첫 점을 누르거나 Enter·두 번 누르면 닫기 · Esc 취소" : "누르면 점 · 끌면 곡선 · 첫 점을 누르거나 Enter·두 번 누르면 닫기 · 그린 모양을 고르면 선 위 = 점 더하기(+), 점 위 = 빼기(−)"}</span>
        </>
      )}
      {(tool === "addAnchor" || tool === "delAnchor" || tool === "convAnchor") && <span style={{ fontSize: 12.5, color: C.dim, marginLeft: 8 }}>{tool === "addAnchor" ? "펜으로 그린 모양을 고르고 선 위를 누르면 점이 생겨요" : tool === "delAnchor" ? "펜으로 그린 모양을 고르고 점을 누르면 빠져요" : "점을 누르면 모서리 ↔ 곡선 · 점에서 끌면 새 손잡이"}</span>}
      {tool === "picker" && <span style={{ fontSize: 12.5, color: C.dim, marginLeft: 8 }}>누르면 전경색 · Alt+누르면 배경색</span>}
      {(tool === "rectShape" || tool === "ellipseShape" || tool === "lineShape") && (
        <>
          {sep}
          <span style={{ fontSize: 12.5, color: C.sub, marginLeft: 6 }}>칠</span>
          <span title="전경색으로 칠해요" style={{ width: 26, height: 20, marginLeft: 6, borderRadius: 3, border: `1px solid ${C.line2}`, background: paint.fg }} />
          {tool === "rectShape" && optSlider("둥글게", shapeOpt.radius, 0, 200, (n) => setShapeOpt({ ...shapeOpt, radius: n }), "px")}
          {tool === "lineShape" && optSlider("두께", shapeOpt.lw, 1, 100, (n) => setShapeOpt({ ...shapeOpt, lw: n }), "px")}
          <span style={{ fontSize: 12, color: C.dim, marginLeft: 10, whiteSpace: "nowrap" }}>끌어서 그리기 · Shift = {tool === "lineShape" ? "곧게" : "정사각·정원"}</span>
        </>
      )}
      {sep}
      {iconBtn("undo", "실행 취소 (Ctrl+Z)", undo, !h?.undo.length)}
      {iconBtn("redo", "다시 실행 (Shift+Ctrl+Z)", redo, !h?.redo.length)}
      <div style={{ flex: 1 }} />
      <Btn small onClick={() => void save(doc)} title="PSD 로 저장 (Ctrl+S) · 다른 이름으로 Shift+Ctrl+S"><Icon name="save" size={15} />저장</Btn>
      <div style={{ position: "relative", marginLeft: 6 }}>
        <Btn small primary onClick={() => setExportOpen(!exportOpen)}><Icon name="export" size={15} />내보내기</Btn>
        {exportOpen && (
          <div style={{ position: "absolute", right: 0, top: 40, width: 220, padding: 4, background: C.card, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 50 }}>
            {([["png", "PNG", "투명 배경 그대로"], ["jpg", "JPG", "가볍게 (흰 바탕)"]] as const).map(([t, n, d]) => (
              <button key={t} type="button" onClick={() => void exportAs(t)}
                style={{ display: "block", width: "100%", padding: "9px 12px", border: 0, borderRadius: 6, background: "transparent", color: C.text, textAlign: "left", cursor: "pointer", fontFamily: FONT }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.cardHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 12, color: C.sub }}>{d}</div>
              </button>
            ))}
            <div style={{ height: 1, background: C.line, margin: "4px 0" }} />
            <button type="button" onClick={() => { setExportOpen(false); void save(doc, true); }}
              style={{ display: "block", width: "100%", padding: "9px 12px", border: 0, borderRadius: 6, background: "transparent", color: C.text, textAlign: "left", cursor: "pointer", fontFamily: FONT, fontSize: 14 }}>다른 이름으로 저장 (PSD)…</button>
            <button type="button" onClick={() => { setExportOpen(false); setPrintOpen(true); }}
              style={{ display: "block", width: "100%", padding: "9px 12px", border: 0, borderRadius: 6, background: "transparent", color: C.text, textAlign: "left", cursor: "pointer", fontFamily: FONT }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.cardHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>인쇄용 파일 (CMYK)…</div><div style={{ fontSize: 12, color: C.sub }}>PDF · TIFF · 재단 여백</div>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  /* 왼쪽 도구창 — 포토샵과 같은 순서. 작은 세모 = 묶음 (오른쪽 클릭 · 길게 누르기로 펼침) */
  const svgEl = (el: React.ReactNode) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{el}</svg>;
  const TOOL_ICON: Record<Tool, React.ReactNode> = {
    move: svg("M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"),
    marquee: svgEl(<rect x="4" y="5" width="16" height="14" strokeDasharray="3 2.4" />),
    ellipseSel: svgEl(<ellipse cx="12" cy="12" rx="8.5" ry="6.5" strokeDasharray="3 2.4" />),
    lasso: svg("M7 15c-3-1.5-3.5-6 2-8.5s11-.5 11 3-4.5 5.5-9.5 5.5c-1.5 0-2.7-.2-3.5-.6M7.5 15c-1 1.5-.3 3.6 1.7 3.6M9 18.6c.5 1-.2 2-1.4 2.4"),
    polyLasso: svg("M5 15L8 5l9 2 3 8-9 3-6-3zM6 15l-2 6"),
    wand: svg("M4 20L14 10M14 10l2 2M16 3v3M20 7h-3M19 3.5l-2 2M11 4l.8 1.8M20.5 12l-1.8-.8"),
    crop: svg("M6 2v16h16M2 6h16v16"),
    picker: svg("M15 3.5l5.5 5.5-2.2 2.2-5.5-5.5zM13.5 7.5L5 16v3h3l8.5-8.5"),
    heal: svg("M8.5 3.5l12 12-5 5-12-12zM6 11l7-7M11 16l7-7M10 10h.01M13 13h.01M10 13h.01M13 10h.01"),
    stamp: svg("M9 3h6v5a3 3 0 01-1 2l-1 1h5a2 2 0 012 2v2H4v-2a2 2 0 012-2h5l-1-1a3 3 0 01-1-2zM5 19h14v2H5z"),
    brush: svg("M4 20c2 0 4-1 4-3.5S6 13 8 11l8-8 3 3-8 8c-2 2-1.5 3.5-3.5 4.5S5 20 4 20z"),
    eraser: svg("M8 20h12M5 15l9-9 5 5-9 9H8z M10 10l5 5"),
    gradient: <span style={{ width: 18, height: 18, borderRadius: 2, border: "1.5px solid currentColor", background: "linear-gradient(90deg, currentColor, transparent)" }} />,
    bucket: svg("M5 11l7-7 7 7-7 7zM5 11h14M20 15s2 2.5 2 4a2 2 0 01-4 0c0-1.5 2-4 2-4z"),
    text: <span style={{ fontSize: 19, fontWeight: 700, fontFamily: "Georgia, serif" }}>T</span>,
    pen: svg("M12 2l5 9-5 11-5-11zM12 11v4M3 21h4M17 21h4"),
    freePen: svg("M10 2l4 8-4 9-4-9zM10 10v3M13 21c2-3 4 1 6-2s3 0 4-1"),
    curvePen: svg("M10 2l4 8-4 9-4-9zM10 10v3M13 22q4-7 9 0"),
    addAnchor: svg("M10 2l4 8-4 9-4-9zM10 10v3M18 15v7M14.5 18.5h7"),
    delAnchor: svg("M10 2l4 8-4 9-4-9zM10 10v3M14.5 18.5h7"),
    convAnchor: svg("M4 3l14 5-5 2 6 6-3 3-6-6-2 5z"),
    rectShape: svg("M4 6h16v12H4z"),
    ellipseShape: svgEl(<ellipse cx="12" cy="12" rx="8.5" ry="6.5" />),
    lineShape: svg("M4 20L20 4"),
    hand: svg("M8 12V5.5a1.5 1.5 0 013 0V11M11 10V4.5a1.5 1.5 0 013 0V11M14 10.5V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6.5 7S5 17 4 15l-1.5-3a1.5 1.5 0 012.6-1.5L8 13"),
    zoom: svg("M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM20 20l-4.8-4.8"),
  };
  const groupBtn = (g: (typeof TOOL_GROUPS)[number]) => {
    const cur = g.tools.find((x) => x.t === tool) ? tool : groupPick[g.key] || g.tools[0].t;
    const on = g.tools.some((x) => x.t === tool);
    const many = g.tools.length > 1;
    const open = (el: HTMLElement) => {
      if (!many) return;
      const r = el.getBoundingClientRect();
      setFlyAt({ x: r.right + 4, y: r.top });
      setFly(fly === g.key ? "" : g.key);
    };
    return (
      <div key={g.key} style={{ position: "relative" }}>
        <button type="button" title={`${TOOL_NAME[cur]} (${g.key})${many ? " · 길게 누르거나 오른쪽 클릭으로 다른 도구" : ""}`}
          onClick={() => { if (flyHold.current) return; setFly(""); setTool(cur); }}
          onContextMenu={(e) => { e.preventDefault(); if (flyT.current) clearTimeout(flyT.current); open(e.currentTarget); }}
          onPointerDown={(e) => {
            if (flyT.current) clearTimeout(flyT.current);
            flyHold.current = false;
            const el = e.currentTarget;
            if (!many || e.button !== 0) return;
            // 누른 채로 있으면 목록 열기 — 손을 떼는 곳의 도구로 바뀐다
            const hold = () => { flyHold.current = true; const r = el.getBoundingClientRect(); setFlyAt({ x: r.right + 4, y: r.top }); setFly(g.key); };
            flyT.current = setTimeout(hold, 300);
            const up = (ev: PointerEvent) => {
              window.removeEventListener("pointerup", up);
              if (flyT.current) clearTimeout(flyT.current);
              if (!flyHold.current) return;
              // 목록 칸 위에서 뗐으면 그 도구 (칸의 pointerup 이 먼저 처리), 아니면 닫기
              const hit = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest?.("[data-fly-tool]") as HTMLElement | null;
              if (hit) setTool(hit.dataset.flyTool as Tool);
              if (hit || !el.contains(document.elementFromPoint(ev.clientX, ev.clientY))) setFly("");
              setTimeout(() => { flyHold.current = false; }, 0);
            };
            window.addEventListener("pointerup", up);
          }}
          onPointerLeave={(e) => {
            // 누른 채로 단추 밖으로 끌면 바로 목록을 연다
            if (flyT.current && e.buttons & 1 && many) { clearTimeout(flyT.current); flyT.current = null; flyHold.current = true; const r = e.currentTarget.getBoundingClientRect(); setFlyAt({ x: r.right + 4, y: r.top }); setFly(g.key); }
          }}
          style={{ position: "relative", width: 36, height: 32, borderRadius: 4, border: 0, background: on ? C.psToolOn : "transparent", color: on ? "#fff" : "#cfcfcf", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = C.psHover; }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
          {TOOL_ICON[cur]}
          {many && <span style={{ position: "absolute", right: 2, bottom: 2, width: 0, height: 0, borderLeft: "4px solid transparent", borderBottom: "4px solid currentColor", opacity: 0.8 }} />}
        </button>
        {fly === g.key && (
          <div onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", left: flyAt.x, top: flyAt.y, zIndex: 3000, minWidth: 210, padding: "4px 0", background: C.psMenu, border: `1px solid ${C.psBarLine}`, borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
            {g.tools.map((x) => (
              <button key={x.t} type="button" data-fly-tool={x.t} onClick={() => { setTool(x.t); setFly(""); }}
                style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "5px 12px 5px 8px", border: 0, background: "transparent", color: C.psMenuText, fontSize: 13, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.psHi; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ width: 6, fontSize: 10 }}>{x.t === cur ? "■" : ""}</span>
                <span style={{ width: 20, display: "flex", justifyContent: "center" }}>{TOOL_ICON[x.t]}</span>
                <span style={{ flex: 1 }}>{x.name}</span>
                <span style={{ color: C.psMute2, fontSize: 12 }}>{g.key}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  const extraBtn = (icon: React.ReactNode, tip: string, go: () => void) => (
    <button key={tip} type="button" title={tip} onClick={go}
      style={{ width: 36, height: 32, borderRadius: 4, border: 0, background: "transparent", color: C.psIcon, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.psHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      {typeof icon === "string" ? <Icon name={icon} size={19} /> : icon}
    </button>
  );
  const toolbar = doc && !panelsHidden && (
    <div style={{ width: 46, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 0", background: C.panel, borderRight: `1px solid ${C.line}`, overflowY: "auto", overflowX: "visible" }}
      onPointerDown={(e) => { if (fly && !(e.target as HTMLElement).closest("button")) setFly(""); }}>
      {TOOL_GROUPS.map((g) => (
        <React.Fragment key={g.key}>
          {groupBtn(g)}
          {g.gap && <div style={{ width: 26, height: 1, background: C.line2, margin: "3px 0" }} />}
        </React.Fragment>
      ))}
      <div style={{ width: 26, height: 1, background: C.line2, margin: "3px 0" }} />
      {extraBtn("image", "사진 가져오기 (PC에서)", () => void addImages())}
      {/* 그래픽 — 그래픽 · 픽토그램을 한 단추로 (위 탭으로 바꾸기, 2026-10-22 사장님) */}
      {extraBtn("sticker", "그래픽 · 픽토그램", () => setSide(side === "sticker" || side === "picto" ? "" : "sticker"))}
      {extraBtn(svg("M4 4h16v6H4zM4 14h7v6H4zM15 14h5v6h-5z"), "디자인 템플릿 (레이어로)", () => { if (side !== "tpl") loadMine(); setSide(side === "tpl" ? "" : "tpl"); })}
      {/* [AI] — AI 요청바 켜고 끄기 (포토샵 상황별 작업 표시줄 · 프롬프트 입력창, 2026-10-22 사장님) */}
      <button type="button" title="AI 요청바 — 생성형 채우기 · 프롬프트로 편집 · 이미지 생성 · 배경 제거" onClick={() => setAiBar(!aiBar)}
        style={{ width: 36, height: 32, borderRadius: 4, border: 0, background: aiBar ? "#1473e6" : "transparent", color: aiBar ? "#fff" : "#cfcfcf", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseEnter={(e) => { if (!aiBar) e.currentTarget.style.background = C.psHover; }} onMouseLeave={(e) => { if (!aiBar) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: -0.5 }}>AI</span>
      </button>
      {/* 전경색 · 배경색 — AI 바로 아래, 포토샵처럼 두 칸이 겹쳐 보이게 (2026-10-22 사장님) */}
      <div style={{ width: 26, height: 1, background: C.line2, margin: "4px 0 6px" }} />
      <div style={{ position: "relative", width: 40, height: 46, flexShrink: 0, marginBottom: 6 }}>
        <button type="button" title="기본 색 — 검정·흰색 (D)" onClick={() => setPaint({ fg: "#000000", bg: "#FFFFFF" })}
          style={{ position: "absolute", left: 1, top: 0, width: 12, height: 12, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}>
          <span style={{ position: "absolute", left: 4, top: 4, width: 7, height: 7, background: "#fff", border: `1px solid ${C.psMute2}` }} />
          <span style={{ position: "absolute", left: 0, top: 0, width: 7, height: 7, background: "#000", border: `1px solid ${C.psMute2}` }} />
        </button>
        <button type="button" title="전경색 ↔ 배경색 (X)" onClick={() => setPaint({ fg: paint.bg, bg: paint.fg })}
          style={{ position: "absolute", right: 0, top: 0, width: 14, height: 14, padding: 0, border: 0, background: "transparent", color: C.psDdd, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 4.5Q2 2 4.5 2H9M7.5 0.5 9 2 7.5 3.5M10 7.5Q10 10 7.5 10H3M4.5 8.5 3 10l1.5 1.5" /></svg>
        </button>
        <button type="button" title="배경색 — 누르면 색 고르기" onClick={() => setColorEdit(colorEdit === "bg" ? "" : "bg")}
          style={{ position: "absolute", left: 15, top: 20, width: 24, height: 24, border: `1px solid ${C.psMute}`, background: paint.bg, cursor: "pointer", padding: 0, boxShadow: "0 0 0 1px #000" }} />
        <button type="button" title="전경색 (브러시·페인트 통·그레이디언트 색) — 누르면 색 고르기" onClick={() => setColorEdit(colorEdit === "fg" ? "" : "fg")}
          style={{ position: "absolute", left: 2, top: 9, width: 24, height: 24, border: "1px solid #eee", background: paint.fg, cursor: "pointer", padding: 0, boxShadow: "0 0 0 1px #000" }} />
        <input ref={fgIn} type="color" value={paint.fg.toLowerCase()} onChange={(e) => setPaint({ fg: e.target.value.toUpperCase() })} style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }} />
        <input ref={bgIn} type="color" value={paint.bg.toLowerCase()} onChange={(e) => setPaint({ bg: e.target.value.toUpperCase() })} style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }} />
      </div>
    </div>
  );

  /* 오른쪽 아래 레이어 칸 — 혼합 · 불투명도 줄, 목록, 아래 단추 줄 (포토샵처럼) */
  const layersPanel = doc && (
    <div style={{ flex: "1 1 45%", minHeight: 220, display: "flex", flexDirection: "column", background: C.panel, borderTop: `1px solid ${C.line2}` }}>
      <div style={{ display: "flex", alignItems: "center", height: 36, padding: "0 12px", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 14, fontWeight: 800, borderBottom: `2px solid ${C.text}`, paddingBottom: 6, marginTop: 8 }}>레이어</span>
        <div style={{ flex: 1 }} />
        {selL?._slot === "bg" && <button type="button" onClick={() => void replaceBg()} title="이 칸의 사진을 PC 사진으로 바꿔요 (칸 크기에 꽉 차게)"
          style={{ height: 26, marginRight: 8, padding: "0 10px", borderRadius: 4, border: 0, background: C.accent, color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>사진 바꾸기</button>}
        {selL && !selL.children && (
          <label title="AI 자동 디자인·내 템플릿에서 다른 공실을 넣을 때 바뀌는 칸" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.sub }}>칸
            <select value={selL._slot || ""} onChange={(e) => mutate(() => { selL._slot = e.target.value || undefined; })}
              style={{ height: 26, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, fontFamily: FONT }}>
              <option value="">없음</option>
              {SLOT_PICK.map((k) => <option key={k} value={k}>{SLOT_NAME[k]}</option>)}
              {selL._slot && !SLOT_PICK.includes(selL._slot as Slot) && <option value={selL._slot}>{SLOT_NAME[selL._slot as Slot] || selL._slot}</option>}
            </select>
          </label>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: `1px solid ${C.line}` }}>
        <select value={selL?.blendMode || "normal"} disabled={!selL} onChange={(e) => selL && mutate(() => { selL.blendMode = e.target.value as typeof selL.blendMode; })}
          style={{ flex: 1, minWidth: 0, height: 28, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: FONT }}>
          {selL?.children && <option value="pass through">통과</option>}
          {BLEND_NAMES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: C.sub }}>불투명도:</span>
        <input type="number" min={0} max={100} disabled={!selL} value={selL ? Math.round((selL.opacity ?? 1) * 100) : 100}
          onChange={(e) => selL && mutate(() => { selL.opacity = Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100; }, `op:${selL._k}`)}
          onKeyDown={(e) => e.stopPropagation()}
          style={{ width: 54, height: 28, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: FONT, padding: "0 6px" }} />
      </div>
      {/* 잠그기 · 채우기 (포토샵처럼) */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 12.5, color: C.sub }}>
        <span>잠그기:</span>
        {([["transparency", "투명 픽셀 잠그기", "▦"], ["position", "위치 잠그기 (못 옮김)", "✥"], ["all", "모두 잠그기", "🔒"]] as const).map(([k2, t, ic]) => {
          const pr = selL?.protected || {};
          const on = k2 === "all" ? Boolean(pr.position && pr.transparency && pr.composite) : Boolean(pr[k2]);
          return (
            <button key={k2} type="button" title={t} disabled={!selL}
              onClick={() => selL && mutate(() => {
                const cur = selL.protected || {};
                selL.protected = k2 === "all" ? { transparency: !on, composite: !on, position: !on } : { ...cur, [k2]: !on };
              })}
              style={{ width: 26, height: 24, borderRadius: 4, border: `1px solid ${on ? C.sel : "transparent"}`, background: on ? C.psEdge : "transparent", color: selL ? C.text : C.dim, cursor: selL ? "pointer" : "default", fontSize: 13, padding: 0 }}>{ic}</button>
          );
        })}
        <span style={{ flex: 1 }} />
        <span>채우기:</span>
        <input type="number" min={0} max={100} disabled={!selL} value={selL ? Math.round(((selL as { fillOpacity?: number }).fillOpacity ?? 1) * 100) : 100}
          title="채우기 — 효과(테두리·그림자)는 그대로 두고 그림만 흐리게"
          onChange={(e) => selL && mutate(() => { (selL as { fillOpacity?: number }).fillOpacity = Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100; }, `fill:${selL._k}`)}
          onKeyDown={(e) => e.stopPropagation()}
          style={{ width: 54, height: 26, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: FONT, padding: "0 6px" }} />
      </div>
      <LayerList doc={doc} tick={tick} sel={sel} selSet={allSel()} onSel={setSel} onPick={pickSel} onToggle={toggle}
        maskEdit={maskEdit}
        onMaskThumb={(k, e) => {
          if (e.shiftKey) { if (sel !== k) setSel(k); const l = findLayer(kids(doc.psd), k); if (l?.mask) mutate(() => { l.mask = { ...l.mask!, disabled: !l.mask!.disabled }; }); return; }
          if (sel !== k) setSel(k);
          setMaskEdit(true);
        }}
        onLayerThumb={() => setMaskEditS(false)} onDrop={dropLayer} onAct={(k, a) => void act(k, a)}
        onRename={(k, name) => { const l = findLayer(kids(doc.psd), k); if (l && l.name !== name) mutate(() => { l.name = name; }); }} />
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, height: 36, padding: "0 8px", borderTop: `1px solid ${C.line}` }}>
        {iconBtn(<span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 14 }}>fx</span>, "레이어 스타일 (효과)", () => void act(S, "fx"), !sel || Boolean(selL?.children))}
        <button type="button" title={"레이어 마스크 추가 — 선택 영역이 있으면 그 안만 보여요 · Alt+누르기 = 모두 숨기기(검정)"} disabled={!sel || Boolean(selL?.children)}
          onClick={(e) => addMask(e.altKey)}
          style={{ width: 32, height: 30, borderRadius: 4, border: 0, background: "transparent", color: !sel || selL?.children ? C.dim : C.text, cursor: !sel ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {svg("M4 5h16v14H4zM12 9a3 3 0 100 6 3 3 0 000-6z")}
        </button>
        {iconBtn("folder", sel ? "그룹으로 묶기 (Ctrl+G)" : "새 그룹", newGroup)}
        {iconBtn(svg("M5 4h14v16H5zM12 8v8M8 12h8"), "새 레이어 (Shift+Ctrl+N) · 레이어를 끌어다 놓으면 복제", () => newLayer())}
        {iconBtn("trash", "레이어 삭제 (Delete)", () => void act(S, "del"), !sel)}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: C.bg, fontFamily: FONT, color: C.text }}
      onPointerDown={() => { if (menuOpen) setMenuOpen(""); }}>
      {embed && (
        <div style={{ height: 46, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", background: "#1d4ed8", color: "#fff", fontFamily: FONT }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>✏ {embed.title}</span>
          <span style={{ fontSize: 13, opacity: 0.9 }}>글자·사진·색을 고치고 [{embed.useLabel || "이 썸네일 쓰기"}] (Ctrl+S) — 영상 폴더에 PNG·PSD 로 저장돼요</span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={cancelEmbed} disabled={Boolean(busy)} style={{ height: 32, padding: "0 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.6)", background: "transparent", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>취소</button>
          <button type="button" onClick={() => void applyEmbed()} disabled={Boolean(busy)} style={{ height: 32, padding: "0 16px", borderRadius: 6, border: 0, background: "#fff", color: "#1d4ed8", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>✓ {embed.useLabel || "이 썸네일 쓰기"}</button>
        </div>
      )}
      {!doc ? home : (
        <>
          <div onPointerDown={(e) => e.stopPropagation()}>{menuBar}</div>
          {!panelsHidden && optionBar}
          <div style={{ flex: 1, minHeight: 0, display: "flex" }} onPointerDown={() => { if (exportOpen) setExportOpen(false); if (fly) setFly(""); }}>
            {toolbar}
            {/* 가운데: 문서 탭 · 그림판 · 상태줄 */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div ref={tabBar} style={{ userSelect: "none", display: "flex", alignItems: "flex-end", height: 32, background: dockHint ? "#1d3557" : C.panel, borderBottom: `1px solid ${dockHint ? "#3b82f6" : C.line}`, overflowX: "auto", flexShrink: 0 }}>
                {store.docs.filter((d) => !store.float.has(d.id)).map((d) => {
                  const on = d.id === dockD?.id;
                  return (
                    <div key={d.id} onClick={() => activate(d.id)} onPointerDown={(e) => tabDown(d.id, e)} title={`${d.path || d.name}\n아래로 끌어내면 떠 있는 창이 돼요`}
                      style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 6px 0 12px", background: on ? C.bg : "transparent", borderRight: `1px solid ${C.line}`, color: on ? C.text : C.sub, cursor: "pointer", flexShrink: 0, maxWidth: 300, fontSize: 13, fontWeight: on ? 700 : 500 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docLabel(d)}</span>
                      <button type="button" title="닫기 (Ctrl+W)" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeDoc(d); }}
                        style={{ width: 20, height: 20, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  );
                })}
                <button type="button" title="새 파일 (Ctrl+N)" onClick={() => setNewOpen(true)} style={{ width: 30, height: 30, alignSelf: "center", border: 0, background: "transparent", color: C.sub, cursor: "pointer" }}><Icon name="plus" size={15} /></button>
                {dockHint && <span style={{ alignSelf: "center", marginLeft: 8, fontSize: 12.5, color: "#93c5fd", whiteSpace: "nowrap" }}>여기에 놓으면 탭으로 붙어요</span>}
              </div>
              <div ref={area} style={{ flex: 1, minHeight: 0, display: "flex", position: "relative", overflow: "hidden" }}>
                {dockD ? docBox(dockD) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.psStage, color: C.dim, fontSize: 13 }}>
                    떠 있는 창의 제목줄을 위 탭 줄에 놓으면 다시 탭으로 붙어요
                  </div>
                )}
                {aiBar && (
                  <AiBar hasSel={hasSelMask} imgLayer={selL && !selL.children && !isText(selL) && selL.canvas && !selL._shape && !selL._picto ? selL.name || "그림" : null} busy={aiBusy}
                    textLayer={selL && isText(selL) ? (() => {
                      const lk = lookOf(selL);
                      // 가격·면적·주소·중개사무소 같은 정보 칸 — AI 가 바꾸지 않음 (지어내기 방지)
                      const info = ["price", "area", "address", "agency", "phone", "officeAddr", "regNum", "office", "ceo", "source"].includes(selL._slot || "");
                      return { name: selL._k || "", font: lk.font || "Pretendard", px: Math.round(lk.px), color: lk.color || "#111111", align: lk.align || "left", aiOff: info };
                    })() : null}
                    shapeColor={selL && !isText(selL) ? (selL._shape?.color ?? selL._picto?.color ?? null) : null}
                    onTextSet={(p: BarTextSet) => { if (selL && isText(selL)) { const lk = lookOf(selL); mutate(() => applyText(selL, { ...lk, ...p }), `bar-${selL._k}-${Object.keys(p).join()}`); } }}
                    onWarp={openWarp}
                    onShapeColor={(c) => {
                      if (!selL) return;
                      if (selL._shape) mutate(() => { selL._shape = { ...selL._shape!, color: c }; selL.canvas = shapeCanvas(selL._shape); }, `bar-col-${selL._k}`);
                      else if (selL._picto) mutate(() => { selL._picto = { ...selL._picto!, color: c }; const w = selL.canvas!.width, h = selL.canvas!.height; const pc = pictoCanvas(selL._picto.id, Math.max(w, h), c, selL._picto.style); selL.canvas = w === h ? pc : sizeTo(pc, w, h); }, `bar-col-${selL._k}`);
                    }}
                    onRun={(a, p) => void runAi(a, p)} onAddImage={() => void addImages()} onClose={() => setAiBar(false)}
                    onSelInvert={() => { const m = selOf(doc); setSelMask(m ? invertMask(m) : null); }} onSelClear={() => setSelMask(null)} />
                )}
                {[...store.float.entries()].map(([id, r]) => {
                  const d = store.docs.find((x) => x.id === id);
                  if (!d) return null;
                  const on = d.id === doc.id;
                  return (
                    <div key={id} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 100 + r.z, display: "flex", flexDirection: "column", background: C.panel, border: `1px solid ${on ? C.psEdgeOn : C.psHover}`, boxShadow: "0 10px 30px rgba(0,0,0,0.55)" }}>
                      <div onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); activate(id); dragWin(id, "move", e); }} onDoubleClick={() => dockDoc(id)}
                        title="끌어서 옮기기 · 위 탭 줄에 놓거나 두 번 누르면 탭으로"
                        style={{ display: "flex", alignItems: "center", gap: 8, height: 28, padding: "0 4px 0 10px", background: on ? C.psHover : C.psBar, color: on ? C.text : C.sub, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "move", flexShrink: 0, userSelect: "none" }}>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docLabel(d)}</span>
                        <button type="button" title="탭으로 붙이기" onPointerDown={(e) => e.stopPropagation()} onClick={() => dockDoc(id)}
                          style={{ width: 22, height: 22, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", padding: 0, fontSize: 13 }}>▭</button>
                        <button type="button" title="닫기" onPointerDown={(e) => e.stopPropagation()} onClick={() => closeDoc(d)}
                          style={{ width: 22, height: 22, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon name="close" size={12} />
                        </button>
                      </div>
                      {docBox(d)}
                      <div onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); activate(id); dragWin(id, "size", e); }} title="끌어서 크기 바꾸기"
                        style={{ position: "absolute", right: 0, bottom: 0, width: 14, height: 14, cursor: "nwse-resize", zIndex: 30, background: "linear-gradient(135deg, transparent 50%, #777 50%)" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, height: 24, padding: "0 10px", background: C.panel, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.sub, flexShrink: 0 }}>
                <span>{view ? `${(view.z * 100).toFixed(2).replace(/\.?0+$/, "")}%` : ""}</span>
                <span>{doc.psd.width} 픽셀 × {doc.psd.height} 픽셀{ppi ? ` (${Math.round(ppi)} ppi)` : ""}</span>
                <span style={{ color: doc.mode === "cmyk" ? "#7dd3fc" : C.sub }}>{doc.mode === "cmyk" ? `CMYK 인쇄용${vis.proof !== false ? " · 인쇄 색 미리보기" : ""}` : "RGB 화면용"}</span>
                {doc.path && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.path}</span>}
              </div>
            </div>
            {/* 오른쪽: 위 속성 · 아래 레이어 */}
            {!panelsHidden && <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, borderLeft: `1px solid ${C.line}` }}>
              {(side === "sticker" || side === "picto") && (
                <div style={{ display: "flex", gap: 4, padding: "8px 12px 0", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
                  {([["sticker", "그래픽"], ["picto", "픽토그램"]] as const).map(([k, t]) => (
                    <button key={k} type="button" onClick={() => setSide(k)}
                      style={{ height: 34, padding: "0 16px", border: 0, borderBottom: `2px solid ${side === k ? C.accent : "transparent"}`, background: "transparent", color: side === k ? C.text : C.sub, fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>{t}</button>
                  ))}
                </div>
              )}
              <div style={{ flex: "1 1 55%", minHeight: 0, display: "flex", overflow: "hidden" }}>
                {side === "picto" ? <PictoSide color={paint.fg} onPick={(id, st) => doc && insert(pictoLayer(doc, id, paint.fg, st))} onClose={() => setSide("")} />
                  : side === "tpl" ? <DesignSide onPick={insertTpl} onClose={() => setSide("")} mine={myTpls} onMine={(t) => void openMine(t)} onMineRemove={(t) => void removeMine(t)} onSaveMine={() => void saveMine(doc.name)} />
                  : side === "sticker" ? <StickerSide onPick={addSticker} onClose={() => setSide("")} />
                  : selL && isText(selL) && !selL.children ? <TextPanel key={selL._k} doc={doc} l={selL} mutate={mutate} apply={applyText} onClose={() => setSel(null)} />
                  : selL ? <LayerPanel key={selL._k} doc={doc} l={selL} mutate={mutate} fxFirst={side === "fx"} onClose={() => setSel(null)} />
                  : <DocPanel doc={doc} onResize={(w, hh) => mutate(() => resizeCanvas(doc, w, hh))}
                      gridSize={gridSizes.get(doc.id) || niceGrid(doc.psd.width, doc.psd.height)} onGridSize={(n) => { gridSizes.set(doc.id, n); bump(); }} />}
              </div>
              {layersPanel}
            </div>}
          </div>
        </>
      )}
      {colorEdit && doc && (
        <ColorPicker key={colorEdit} value={colorEdit === "fg" ? paint.fg : paint.bg} title={colorEdit === "fg" ? "전경색" : "배경색"}
          onOk={(hex) => { setPaint(colorEdit === "fg" ? { fg: hex } : { bg: hex }); setColorEdit(""); }} onClose={() => setColorEdit("")} />
      )}
      {strokeDlg && doc && (
        <Modal title="획 — 선택 영역 테두리에 선" onClose={() => setStrokeDlg(false)} width={460}
          footer={<><Btn onClick={() => setStrokeDlg(false)}>취소</Btn><Btn primary onClick={doStroke}>확인</Btn></>}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, fontSize: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>두께
              <input type="range" min={1} max={100} value={strokeOpt.width} onChange={(e) => setStrokeOpt({ ...strokeOpt, width: Number(e.target.value) })} style={{ flex: 1, accentColor: C.accent }} />
              <input type="number" min={1} max={500} value={strokeOpt.width} onChange={(e) => setStrokeOpt({ ...strokeOpt, width: Math.max(1, Number(e.target.value) || 1) })} onKeyDown={(e) => e.stopPropagation()} style={{ ...input, width: 70 }} />px
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>색
              <input type="color" value={strokeOpt.color.toLowerCase()} onChange={(e) => setStrokeOpt({ ...strokeOpt, color: e.target.value.toUpperCase() })} style={{ width: 44, height: 30, border: 0, background: "transparent" }} />
              <Btn small onClick={() => setStrokeOpt({ ...strokeOpt, color: paint.fg })}>전경색</Btn>
              <Btn small onClick={() => setStrokeOpt({ ...strokeOpt, color: paint.bg })}>배경색</Btn>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>위치
              <span style={{ width: 6 }} />
              {seg(strokeOpt.pos === "inside", "안쪽", () => setStrokeOpt({ ...strokeOpt, pos: "inside" }))}
              {seg(strokeOpt.pos === "center", "가운데", () => setStrokeOpt({ ...strokeOpt, pos: "center" }))}
              {seg(strokeOpt.pos === "outside", "바깥쪽", () => setStrokeOpt({ ...strokeOpt, pos: "outside" }))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>모양
              <span style={{ width: 6 }} />
              {seg(strokeOpt.dash === "solid", "━ 실선", () => setStrokeOpt({ ...strokeOpt, dash: "solid" }))}
              {seg(strokeOpt.dash === "dash", "╍ 파선", () => setStrokeOpt({ ...strokeOpt, dash: "dash" }))}
              {seg(strokeOpt.dash === "dot", "┈ 점선", () => setStrokeOpt({ ...strokeOpt, dash: "dot" }))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>불투명도
              <input type="range" min={1} max={100} value={Math.round(strokeOpt.opacity * 100)} onChange={(e) => setStrokeOpt({ ...strokeOpt, opacity: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: C.accent }} />{Math.round(strokeOpt.opacity * 100)}%
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={strokeOpt.newLayer} onChange={(e) => setStrokeOpt({ ...strokeOpt, newLayer: e.target.checked })} />새 레이어로 (끄면 고른 그림 레이어에 바로)</label>
          </div>
        </Modal>
      )}
      {fillDlg && doc && (
        <Modal title={`칠 — ${hasSelMask ? "선택 영역 안" : "문서 전체"}`} onClose={() => setFillDlg(false)} width={480}
          footer={<><Btn onClick={() => setFillDlg(false)}>취소</Btn><Btn primary onClick={doFill}>확인</Btn></>}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, fontSize: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>내용
              <span style={{ width: 6 }} />
              {seg(fillOpt.kind === "fg", "전경색", () => setFillOpt({ ...fillOpt, kind: "fg" }))}
              {seg(fillOpt.kind === "bg", "배경색", () => setFillOpt({ ...fillOpt, kind: "bg" }))}
              {seg(fillOpt.kind === "color", "색 고르기", () => setFillOpt({ ...fillOpt, kind: "color" }))}
              {seg(fillOpt.kind === "gradient", "그레이디언트", () => setFillOpt({ ...fillOpt, kind: "gradient", color: paint.fg, color2: paint.bg }))}
            </div>
            {fillOpt.kind === "color" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>색
                <input type="color" value={fillOpt.color.toLowerCase()} onChange={(e) => setFillOpt({ ...fillOpt, color: e.target.value.toUpperCase() })} style={{ width: 44, height: 30, border: 0, background: "transparent" }} />
              </div>
            )}
            {fillOpt.kind === "gradient" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>색
                  <input type="color" value={fillOpt.color.toLowerCase()} onChange={(e) => setFillOpt({ ...fillOpt, color: e.target.value.toUpperCase() })} style={{ width: 44, height: 30, border: 0, background: "transparent" }} />→
                  {fillOpt.color2 !== null && <input type="color" value={fillOpt.color2.toLowerCase()} onChange={(e) => setFillOpt({ ...fillOpt, color2: e.target.value.toUpperCase() })} style={{ width: 44, height: 30, border: 0, background: "transparent" }} />}
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={fillOpt.color2 === null} onChange={(e) => setFillOpt({ ...fillOpt, color2: e.target.checked ? null : paint.bg })} />투명으로</label>
                  <span style={{ width: 80, height: 22, borderRadius: 3, border: `1px solid ${C.line2}`, background: `linear-gradient(90deg, ${fillOpt.color}, ${fillOpt.color2 || "transparent"}), repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px` }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>방향
                  <span style={{ width: 6 }} />
                  {seg(fillOpt.grad === "down", "↓ 위→아래", () => setFillOpt({ ...fillOpt, grad: "down" }))}
                  {seg(fillOpt.grad === "right", "→ 왼→오른", () => setFillOpt({ ...fillOpt, grad: "right" }))}
                  {seg(fillOpt.grad === "diag", "↘ 대각선", () => setFillOpt({ ...fillOpt, grad: "diag" }))}
                  {seg(fillOpt.grad === "radial", "◎ 원형", () => setFillOpt({ ...fillOpt, grad: "radial" }))}
                </div>
              </>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>불투명도
              <input type="range" min={1} max={100} value={Math.round(fillOpt.opacity * 100)} onChange={(e) => setFillOpt({ ...fillOpt, opacity: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: C.accent }} />{Math.round(fillOpt.opacity * 100)}%
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={fillOpt.newLayer} onChange={(e) => setFillOpt({ ...fillOpt, newLayer: e.target.checked })} />새 레이어로 (끄면 고른 그림 레이어에 바로)</label>
          </div>
        </Modal>
      )}
      {layerMenu && doc && (
        <div onPointerDown={() => setLayerMenu(null)} onContextMenu={(e) => { e.preventDefault(); setLayerMenu(null); }} style={{ position: "fixed", inset: 0, zIndex: 3500 }}>
          <div onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", left: Math.min(layerMenu.x, window.innerWidth - 260), top: Math.min(layerMenu.y, window.innerHeight - 40 - layerMenu.keys.length * 30), minWidth: 220, maxWidth: 320, padding: "4px 0", background: C.psMenu, border: `1px solid ${C.psBarLine}`, borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", fontFamily: FONT }}>
            <div style={{ padding: "4px 12px 6px", fontSize: 11.5, color: C.psMute }}>이 자리의 레이어</div>
            {layerMenu.keys.length ? layerMenu.keys.map((k) => {
              const l = findLayer(kids(doc.psd), k);
              if (!l) return null;
              return (
                <button key={k} type="button" onClick={() => { setSel(k); setLayerMenu(null); }}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, padding: "6px 14px", border: 0, background: k === sel ? C.psSel : "transparent", color: C.psMenuText, fontSize: 13, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.psHi; }} onMouseLeave={(e) => { e.currentTarget.style.background = k === sel ? C.psSel : "transparent"; }}>
                  <span style={{ width: 14, color: C.psMute2, fontSize: 11 }}>{isText(l) ? "T" : l._shape ? "◆" : "▣"}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name || "레이어"}</span>
                  {l.protected?.position && <span style={{ fontSize: 11 }}>🔒</span>}
                </button>
              );
            }) : <div style={{ padding: "6px 14px", fontSize: 13, color: C.psMute2 }}>그림이 있는 레이어가 없어요</div>}
          </div>
        </div>
      )}
      {webDlg && doc && (
        <Modal title="웹용으로 저장" onClose={() => setWebDlg(null)} width={480}
          footer={<><Btn onClick={() => setWebDlg(null)}>취소</Btn><Btn primary onClick={() => void doWebSave()}>{webDlg.busy ? "만드는 중…" : "저장…"}</Btn></>}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, fontSize: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>형식
              <span style={{ width: 6 }} />
              {(["jpg", "png", "gif", "webp"] as const).map((f) => seg(webDlg.fmt === f, f.toUpperCase(), () => setWebDlg({ ...webDlg, fmt: f, size: undefined })))}
            </div>
            <div style={{ fontSize: 12.5, color: C.dim }}>{({ jpg: "사진에 알맞아요 · 가장 가벼움 (투명은 흰 바탕)", png: "글자·도형·투명 배경 그대로 · 무거움", gif: "256색 · 투명 가능 · 오래된 게시판·메일용", webp: "JPG보다 가볍고 투명도 돼요 · 요즘 웹용" } as const)[webDlg.fmt]}</div>
            {(webDlg.fmt === "jpg" || webDlg.fmt === "webp") && (
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>화질
                <input type="range" min={10} max={100} value={Math.round(webDlg.q * 100)} onChange={(e) => setWebDlg({ ...webDlg, q: Number(e.target.value) / 100, size: undefined })} style={{ flex: 1, accentColor: C.accent }} />{Math.round(webDlg.q * 100)}
              </label>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>크기
              <input type="range" min={10} max={100} value={Math.round(webDlg.scale * 100)} onChange={(e) => setWebDlg({ ...webDlg, scale: Number(e.target.value) / 100, size: undefined })} style={{ flex: 1, accentColor: C.accent }} />{Math.round(webDlg.scale * 100)}%
            </label>
            <div style={{ fontSize: 13.5, color: C.sub }}>
              {Math.round(doc.psd.width * webDlg.scale)} × {Math.round(doc.psd.height * webDlg.scale)} px · 파일 크기 {webDlg.size === undefined ? "계산 중…" : webDlg.size > 1024 * 1024 ? `${(webDlg.size / 1024 / 1024).toFixed(2)} MB` : `${Math.round(webDlg.size / 1024)} KB`}
            </div>
          </div>
        </Modal>
      )}
      {designOpen && <DesignDialog init={designInit} canRefill={Boolean(doc && hasSlots(doc))} mine={myTpls || []} onDone={(r) => void onDesignDone(r)} onClose={() => setDesignOpen(false)} />}
      {fltDlg && FILTERS[fltDlg.id] && <FilterDialog key={fltDlg.id + fltDlg.k} filter={FILTERS[fltDlg.id]} init={lastFilter.current?.id === fltDlg.id ? lastFilter.current.v : null} onPreview={fltPreview} onOk={fltOk} onCancel={fltCancel} />}
      {imgDlg === "size" && doc && <ImageSizeDialog w0={doc.psd.width} h0={doc.psd.height} ppi0={ppi || 72} onClose={() => setImgDlg("")}
        onOk={(w, h, p) => { setImgDlg(""); if (w === doc.psd.width && h === doc.psd.height && p === (ppi || 72)) return; mutate(() => imageSizeDoc(doc, w, h, p)); sels.delete(doc.id); fitDoc(doc.id); }} />}
      {imgDlg === "canvas" && doc && <CanvasSizeDialog w0={doc.psd.width} h0={doc.psd.height} ppi={ppi || 72} onClose={() => setImgDlg("")}
        onOk={(w, h, ax, ay, ext) => { setImgDlg(""); if (w === doc.psd.width && h === doc.psd.height) return; mutate(() => canvasSizeDoc(doc, w, h, ax, ay, ext)); sels.delete(doc.id); fitDoc(doc.id); }} />}
      {imgDlg === "trim" && doc && <TrimDialog onClose={() => setImgDlg("")}
        onOk={(basis, sides) => { setImgDlg(""); const r = trimBox(doc, basis, sides); if (!r) return say("잘라낼 곳이 없어요"); if (r.x === 0 && r.y === 0 && r.w === doc.psd.width && r.h === doc.psd.height) return say("잘라낼 곳이 없어요"); mutate(() => cropDoc(doc, r)); sels.delete(doc.id); fitDoc(doc.id); }} />}
      {printDlg && doc && <PrintDialog src={printDlg.src} sel={printDlg.sel} ppi={ppi || 72} name={doc.name} bridge={b} say={say} onClose={() => setPrintDlg(null)} />}
      {warpDlg && <WarpDialog key={warpDlg.k} init={warpDlg.look.warp} onPreview={warpPreview} onOk={warpOk} onCancel={warpCancel} />}
      {adjDlg && <AdjustDialog key={adjDlg.kind + adjDlg.k} kind={adjDlg.kind} hist={adjDlg.hist} onPreview={adjPreview} onOk={adjOk} onCancel={adjCancel} />}
      {modDlg && (
        <Modal title={`선택 영역 ${({ expand: "확대", contract: "축소", feather: "페더", border: "테두리", smooth: "매끄럽게" } as const)[modDlg.kind]}`} onClose={() => setModDlg(null)} width={380}
          footer={<><Btn onClick={() => setModDlg(null)}>취소</Btn><Btn primary onClick={doModify}>확인</Btn></>}>
          <label style={{ padding: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            {modDlg.kind === "feather" ? "페더 반경" : modDlg.kind === "border" ? "폭" : modDlg.kind === "smooth" ? "샘플 반경" : "크기"}
            <input type="number" min={1} max={500} value={modDlg.n} autoFocus onChange={(e) => setModDlg({ ...modDlg, n: Math.max(1, Number(e.target.value) || 1) })}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") doModify(); }} style={{ ...input, width: 90 }} />픽셀
          </label>
        </Modal>
      )}
      {printOpen && doc && (
        <Modal title="인쇄용 파일 (CMYK)" onClose={() => setPrintOpen(false)} width={520}
          footer={<><Btn onClick={() => setPrintOpen(false)}>닫기</Btn><Btn onClick={() => void exportPrint("tif", bleedMm)}>TIFF 만들기</Btn><Btn primary onClick={() => void exportPrint("pdf", bleedMm)}>PDF 만들기</Btn></>}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, fontSize: 14.5, lineHeight: 1.6 }}>
            <div>인쇄소에 보낼 CMYK 파일을 만들어요. 해상도 <b>{Math.round(ppi || 72)} ppi</b>{(ppi || 72) < 150 ? " — 인쇄에는 낮아요. 300ppi 문서를 권해요." : ""}</div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>재단 여백</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 2, 3].map((mm) => (
                  <button key={mm} type="button" onClick={() => setBleedMm(mm)}
                    style={{ flex: 1, height: 34, borderRadius: 5, border: `2px solid ${bleedMm === mm ? C.sel : C.line2}`, background: "transparent", color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{mm ? `사방 ${mm}mm` : "없음"}</button>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>자를 때 하얀 줄이 생기지 않게 가장자리를 늘려 붙여요. 명함·전단은 보통 2mm (인쇄소 안내를 따르세요).</div>
            </div>
            <div style={{ fontSize: 12.5, color: C.dim }}>지금은 간단한 계산으로 CMYK 를 만들어요. 거래 인쇄소의 색 기준(ICC)이 정해지면 그 기준으로 맞출게요.</div>
          </div>
        </Modal>
      )}
      {keysOpen && (
        <Modal title="단축키 (포토샵과 같아요)" onClose={() => setKeysOpen(false)} width={620}>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "190px 1fr", rowGap: 6, fontSize: 13.5, maxHeight: "70vh", overflowY: "auto" }}>
            {[["도구", ""], ["V · M · L · W · C · I", "이동 · 선택 윤곽 · 올가미 · 자동 선택 · 자르기 · 스포이트"], ["J · B · S · E", "스팟 복구 · 브러시 · 복제 도장 · 지우개"], ["G · P · T · U", "그레이디언트/페인트 통 · 펜 · 문자 · 도형"], ["H · Z · 스페이스+끌기", "손 · 돋보기 · 잠깐 손 도구"], ["Ctrl+누르기 (이동 도구)", "마우스 바로 아래 레이어 고르기"], ["Shift+Ctrl+누르기 (이동 도구)", "레이어 더하기/빼기 (여러 개 함께)"], ["레이어 칸 Shift / Ctrl+누르기", "사이 모두 / 하나씩 더하기"], ["오른쪽 클릭 (이동 도구)", "그 자리의 레이어 골라 쓰기"], ["Shift+도구 글쇠", "묶음 안의 다음 도구 (도구 오른쪽 클릭으로도)"],
              ["파일 · 편집", ""], ["Ctrl+N / O / S / W", "새로 만들기 / 열기 / 저장 / 닫기"], ["Shift+Ctrl+S", "다른 이름으로 저장"], ["Alt+Shift+Ctrl+S", "웹용으로 저장 (JPG·PNG·GIF·WebP)"], ["Ctrl+Z / Shift+Ctrl+Z", "실행 취소 / 다시 실행"], ["Ctrl+T", "자유 변형 (크기)"], ["Ctrl+C / X / V", "복사 / 잘라내기 / 붙여넣기"], ["Alt / Ctrl+Backspace", "전경색 / 배경색으로 채우기"], ["Shift+F5", "칠…"],
              ["선택", ""], ["Ctrl+A / D", "모두 / 선택 해제"], ["Shift+Ctrl+D / I", "다시 선택 / 반전"], ["Shift+F6", "페더"], ["Delete", "선택 영역 안 지우기 (없으면 레이어 삭제)"],
              ["레이어", ""], ["Shift+Ctrl+N", "새 레이어"], ["Ctrl+J / Shift+Ctrl+J", "복제 (선택 영역 복사) / 잘라낸 레이어"], ["Ctrl+E", "아래 레이어와 병합"], ["Shift+Ctrl+E", "보이는 레이어 병합"], ["Shift+Ctrl+Alt+E", "보이는 결과를 새 레이어로"], ["Ctrl+G / Shift+Ctrl+G", "그룹 / 그룹 풀기"], ["Alt+Ctrl+G", "클리핑 마스크"], ["Ctrl+] / [", "앞으로 / 뒤로"], ["Shift+Ctrl+] / [", "맨 앞으로 / 맨 뒤로"], ["1 ~ 0", "불투명도 10~100%"], ["화살표 (Shift)", "1px (10px) 옮기기"],
              ["보정", ""], ["Ctrl+L / M", "레벨 / 곡선"], ["Ctrl+U / B", "색조·채도 / 색상 균형"], ["Ctrl+I", "색 반전"], ["Alt+Shift+Ctrl+B", "흑백"], ["Shift+Ctrl+L", "자동 톤"], ["Alt+Shift+Ctrl+L", "자동 대비"], ["Shift+Ctrl+B", "자동 색상"], ["Ctrl+F", "마지막 보정 다시"],
              ["화면 · 브러시", ""], ["Ctrl+0 / 1", "화면 맞추기 / 100%"], ["Ctrl+ + / -", "확대 / 축소"], ["Ctrl+R / ; / '", "눈금자 / 안내선 / 격자"], ["Tab · F", "패널 숨기기 · 전체 화면"], ["[ / ]", "브러시 크기"], ["Shift+[ / ]", "브러시 경도"], ["X · D", "색 바꾸기 · 기본 색"]].map(([k, t]) => (
              t ? <React.Fragment key={k}><b>{k}</b><span style={{ color: C.sub }}>{t}</span></React.Fragment>
                : <div key={k} style={{ gridColumn: "1 / -1", marginTop: 8, fontWeight: 800, color: C.text, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>{k}</div>
            ))}
          </div>
        </Modal>
      )}
      {newOpen && <NewDocDialog init={newInit} onCreate={create} onClose={() => { setNewOpen(false); setNewInit(null); }} onSample={(l, size, ai, cat) => void openSample(l, size, ai, cat)} mine={myTpls} onMine={useMine} onMineRemove={(t) => void removeMine(t)} />}
      {closing && (
        <Modal title="저장하지 않은 내용이 있어요" onClose={() => setClosing(null)} width={500}
          footer={<><Btn onClick={() => setClosing(null)}>취소</Btn><Btn onClick={() => reallyClose(closing)}>저장 안 함</Btn><Btn primary onClick={async () => { if (await save(closing)) reallyClose(closing); }}>저장</Btn></>}>
          <div style={{ padding: 20, fontSize: 15, lineHeight: 1.7 }}><b>{closing.name}</b> 을(를) 닫기 전에 PSD 로 저장할까요?</div>
        </Modal>
      )}
      {(busy || toast) && (
        <div onClick={() => setToast("")} style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", padding: "10px 18px", background: C.card, border: `1px solid ${C.line2}`, color: C.text, borderRadius: 8, fontSize: 14.5, zIndex: 4000, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {busy || toast}
        </div>
      )}
    </div>
  );
}
