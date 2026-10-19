"use client";

// 공실뉴스 스튜디오 [이미지 편집] (포토랩) — PSD 를 열고 고치고 PSD 로 저장 (포토샵과 주고받기). 회의: docs/2026-10-19_photolab_meeting.md
//  - 모든 일은 이 PC 안에서 (서버 없음) — 열기·그리기·저장이 바로바로
//  - 화면: 처음 화면(새 파일·열기·최근 파일) → 문서 탭 · 그림판 · 오른쪽 속성 칸 · 레이어 목록
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Btn, C, FONT, Icon, Modal, input } from "@/components/admin/studio-video/ui";
import { loadFont } from "@/components/admin/studio-video/Pickers";
import { stickerFileName, stickerPng, type Sticker } from "@/components/admin/studio-video/Stickers";
import {
  applyLook, applyResize, boundsOf as boundsOfL, bytesToCanvas, cloneTree, composite, duplicate, exportBytes, findLayer, imageLayer, isText, kids, layerPng, lookOf, newDoc, offsetLayer,
  copyCanvas, guidesOf, mk, niceGrid, paintable, preparePaint, setGuides, type PsdGuide,
  openImageBytes, openPsdBytes, parentList, rasterize, resizeCanvas, savePsdBytes, shapeLayer, textLayer, thumbOf, uid, type Box, type Doc, type PLayer,
} from "./model";
import { cmykPdf, cmykTiff, cmykToRgb, outOfGamut, rgbToCmyk } from "./cmyk";
import { PAINT_TOOLS, Stage, type PaintOpts, type Tool, type View } from "./Stage";
import { LayerList, type MenuAct } from "./LayerList";
import { DocPanel, LayerPanel, StickerSide, TextPanel } from "./PhotoPanels";

/* ── 앱 통로 (없으면 브라우저: 파일 고르기·내려받기) ── */
type FileRes = { path: string; name: string; bytes?: Uint8Array; error?: string };
type Recent = { path: string; name: string; at: number; thumb: string; missing?: boolean };
type PhotoBridge = {
  open: (o?: { images?: boolean }) => Promise<FileRes[]>;
  read: (file: string) => Promise<FileRes>;
  save: (o: { file?: string; name: string; ext: "psd" | "png" | "jpg" | "pdf" | "tif"; bytes: Uint8Array; thumb?: string; ask?: boolean }) => Promise<{ path?: string; name?: string; canceled?: boolean; error?: string }>;
  recent: () => Promise<Recent[]>;
  recentRemove: (file: string) => Promise<boolean>;
  reveal: (file: string) => Promise<boolean>;
  setDirty?: (n: number) => Promise<boolean>;
};
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
};
const histOf = (id: string) => {
  let h = store.hist.get(id);
  if (!h) store.hist.set(id, (h = { undo: [], redo: [], key: "", at: 0 }));
  return h;
};
const snapOf = (d: Doc): Snap => ({ children: cloneTree(kids(d.psd)), w: d.psd.width, h: d.psd.height, guides: cloneTree(guidesOf(d)) });
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
  { id: "realty", label: "부동산마케팅", icon: "image", desc: "매물 홍보 카드 · 명함 · X배너 · 유리창 홍보지 · 전단 · 현수막", items: [
    { name: "매물 홍보 카드", w: 1080, h: 1350, note: "공실 정보 자동 채우기는 다음 단계" },
    { name: "일반 명함", w: 1063, h: 591, ppi: 300, note: "90 × 50 mm" },
    { name: "고급 명함 (양면)", w: 1063, h: 591, ppi: 300, note: "90 × 50 mm · 앞뒤 따로 만들기" },
    { name: "X배너", w: 3543, h: 10630, ppi: 150, note: "600 × 1800 mm" },
    { name: "유리창 홍보지 A2", w: 4961, h: 7016, ppi: 300, note: "420 × 594 mm" },
    { name: "유리창 홍보지 A3", w: 3508, h: 4961, ppi: 300, note: "297 × 420 mm" },
    { name: "전단지 A4", w: 2480, h: 3508, ppi: 300, note: "210 × 297 mm" },
    { name: "전단지 A5", w: 1748, h: 2480, ppi: 300, note: "148 × 210 mm" },
    { name: "매물 안내 POP", w: 2480, h: 3508, ppi: 300, note: "A4 · 사무실·창문 게시" },
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

function NewDocDialog({ onCreate, onClose, init }: { onCreate: (o: { name: string; width: number; height: number; bg: string; ppi: number; guides?: PsdGuide[]; mode: "rgb" | "cmyk" }) => void; onClose: () => void; init?: NewInit | null }) {
  const recent = readRecentSizes();
  const p0 = init?.preset;
  const [tab, setTab] = useState(init?.tab || (recent.length ? "recent" : "youtube"));
  const [name, setName] = useState(p0?.name || "제목 없음-1");
  const [w, setW] = useState(p0?.w || 1080), [h, setH] = useState(p0?.h || 1080), [ppi, setPpi] = useState(p0?.ppi || 72);
  const [bg, setBg] = useState("white");
  const [mode, setMode] = useState<"rgb" | "cmyk">((p0?.ppi || 72) >= 100 ? "cmyk" : "rgb"); // 인쇄물은 CMYK 가 기본
  const [picked, setPicked] = useState(p0 ? `${p0.name}${p0.w}x${p0.h}` : "");
  const [guides, setGuidesS] = useState<PsdGuide[] | undefined>(p0?.guides);
  const list = tab === "recent" ? recent : PRESETS.find((p) => p.id === tab)?.items || [];
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
            {tabBtn("recent", "최근 사용")}
            {PRESETS.map((p) => tabBtn(p.id, p.label))}
          </div>
          <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>빈 문서</span>
            <span style={{ fontSize: 12.5, color: C.dim }}>템플릿은 다음 단계에서 이 위에 들어가요</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, alignContent: "start" }}>
            {list.map((p, i) => {
              const on = picked === `${p.name}${p.w}x${p.h}`;
              const k = Math.min(110 / p.w, 70 / p.h);
              return (
                <button key={i} type="button" onClick={() => pick(p)} onDoubleClick={() => { pick(p); setTimeout(make, 0); }}
                  style={{ padding: 12, borderRadius: 8, border: `2px solid ${on ? C.text : C.line}`, background: on ? C.card : "transparent", color: C.text, cursor: "pointer", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span style={{ height: 76, display: "flex", alignItems: "center" }}><span style={{ width: p.w * k, height: p.h * k, border: `1.5px solid ${C.sub}`, borderRadius: 2 }} /></span>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{p.name}</span>
                  <span style={{ fontSize: 12.5, color: C.sub }}>{p.w} × {p.h} px{p.ppi ? ` · ${p.ppi}ppi` : ""}</span>
                  {p.note && <span style={{ fontSize: 12, color: C.dim }}>{p.note}</span>}
                </button>
              );
            })}
            {!list.length && <div style={{ gridColumn: "1 / -1", color: C.sub, fontSize: 14, padding: 20 }}>아직 만든 문서가 없어요. 다른 탭에서 크기를 골라 보세요.</div>}
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
                style={{ width: 40, height: 34, borderRadius: 5, border: `1px solid ${portrait === pt ? C.text : C.line2}`, background: portrait === pt ? C.text : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: pt ? 12 : 20, height: pt ? 20 : 12, border: `2px solid ${portrait === pt ? C.bg : C.sub}`, borderRadius: 2 }} />
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: C.sub }}>
            <span>색상 모드</span>
            <div style={{ display: "flex", gap: 6 }}>
              {([["rgb", "RGB", "화면용 (SNS·유튜브·블로그)"], ["cmyk", "CMYK", "인쇄용 (명함·전단·배너)"]] as const).map(([v2, t, d2]) => (
                <button key={v2} type="button" onClick={() => setMode(v2)} title={d2}
                  style={{ flex: 1, height: 44, borderRadius: 5, border: `2px solid ${mode === v2 ? C.text : C.line2}`, background: "transparent", color: C.text, fontFamily: FONT, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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
                  style={{ flex: 1, height: 36, borderRadius: 5, border: `2px solid ${bg === v ? C.text : C.line2}`, background: "transparent", color: C.text, fontSize: 13, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
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
function PhotoHome({ onNew, onOpen, onRecent, busy, onPreset }: { onNew: () => void; onOpen: () => void; onRecent: (r: Recent) => void; busy: boolean; onPreset: (i: NewInit) => void }) {
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
        fontWeight: cat === id ? 800 : 600, color: cat === id ? C.text : C.sub, background: cat === id ? C.card : "transparent" }}>
      <Icon name={icon} size={17} />{label}
    </button>
  );
  const group = PRESETS.find((p) => p.id === cat);
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
    {/* 왼쪽 — 만들 것 고르기 (부동산에 필요한 것) */}
    <aside style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, padding: "22px 12px", background: C.panel, borderRight: `1px solid ${C.line}`, fontFamily: FONT }}>
      <h2 style={{ margin: "0 6px 12px", fontSize: 19, fontWeight: 800, color: C.text }}>이미지 편집</h2>
      {catBtn("", "최근 파일", "folder")}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.dim, margin: "14px 12px 4px" }}>만들기</div>
      {PRESETS.map((p) => catBtn(p.id, p.label, p.icon))}
    </aside>
    {group ? (
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "26px 28px", color: C.text, fontFamily: FONT }}>
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
      </div>
    ) : (
    <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "26px 28px", color: C.text, fontFamily: FONT }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>이미지 편집</div>
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
export default function PhotoStudio({ menu }: { menu: React.ReactNode }) {
  const b = bridge();
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const [sel, setSelS] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [side, setSide] = useState<"" | "sticker" | "fx">("");
  const [newOpen, setNewOpen] = useState(false);
  const [newInit, setNewInit] = useState<NewInit | null>(null); // 처음 화면에서 고른 종류 (새 문서 창의 탭·크기)
  const [closing, setClosing] = useState<Doc | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false); // 인쇄용 파일 창
  const [bleedMm, setBleedMm] = useState(2);
  const [colorEdit, setColorEdit] = useState<"" | "fg" | "bg">(""); // CMYK 색 고르기 칸
  const [fitKey, setFitKey] = useState(0);
  const [tool, setTool] = useState<Tool>("move"); // 왼쪽 도구창 (포토샵처럼)
  const [vis, setVisS] = useState<Vis>(readVis);
  const setVis = (p: Partial<Vis>) => setVisS((o) => { const n = { ...o, ...p }; try { localStorage.setItem(VIS_KEY, JSON.stringify(n)); } catch {} return n; });
  const [paint, setPaintS] = useState<PaintOpts>(readPaint);
  const setPaint = (p: Partial<PaintOpts>) => setPaintS((o) => { const n = { ...o, ...p }; try { localStorage.setItem(PAINT_KEY, JSON.stringify(n)); } catch {} return n; });
  const fgIn = useRef<HTMLInputElement>(null), bgIn = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(""); // 맨 위 메뉴줄에서 펼친 메뉴
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
  const setSel = (k: string | null) => { setSelS(k); setSide(""); };

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

  /* 문서 열기 · 만들기 · 닫기 */
  const addDoc = (d: Doc) => {
    store.docs.push(d);
    store.active = d.id;
    store.home = false;
    setSel(null);
    setEditing(null);
    bump();
  };
  const openFiles = async (files: { name: string; bytes: Uint8Array; path?: string }[]) => {
    for (const f of files) {
      const already = f.path && store.docs.find((d) => d.path === f.path);
      if (already) { store.active = already.id; store.home = false; bump(); continue; }
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
  const create = (o: { name: string; width: number; height: number; bg: string; ppi: number; guides?: PsdGuide[]; mode: "rgb" | "cmyk" }) => {
    setNewOpen(false);
    setNewInit(null);
    const d = newDoc({ name: o.name, width: o.width, height: o.height, bg: o.bg, ppi: o.ppi });
    if (o.guides?.length) setGuides(d, o.guides); // 채널 배너 — 모든 기기에 보이는 칸 안내선
    d.mode = o.mode;
    addDoc(d);
  };
  const reallyClose = (d: Doc) => {
    store.docs = store.docs.filter((x) => x.id !== d.id);
    store.hist.delete(d.id);
    store.view.delete(d.id);
    if (store.active === d.id) store.active = store.docs[store.docs.length - 1]?.id || "";
    if (!store.docs.length) store.home = true;
    setSel(null);
    setClosing(null);
    bump();
    syncDirty();
  };
  const closeDoc = (d: Doc) => (d.dirty ? setClosing(d) : reallyClose(d));

  /* 저장 */
  const save = async (d: Doc, ask = false): Promise<boolean> => {
    setBusy("저장하는 중…");
    await new Promise((r) => setTimeout(r, 30));
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
    if (edit) setEditing(l._k!);
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
    // 스티커는 문서 폭의 40% 쯤
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
        offsetLayer(c, 0, 0);
        mutate(() => { pl.list.splice(pl.i + 1, 0, c); });
        setSelS(c._k!);
        break;
      }
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
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && e.shiftKey && k === "n") { e.preventDefault(); newLayer(); return; }
      if (ctrl && k === "n") { e.preventDefault(); setNewOpen(true); return; }
      if (ctrl && k === "o") { e.preventDefault(); void openPick(); return; }
      if (!doc) return;
      if (ctrl && k === "s") { e.preventDefault(); void save(doc, e.shiftKey); return; }
      if (ctrl && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (ctrl && k === "y") { e.preventDefault(); if (doc.mode === "cmyk") setVis({ proof: vis.proof === false }); return; } // 포토샵처럼 교정 색상
      if (ctrl && k === "w") { e.preventDefault(); closeDoc(doc); return; }
      if (ctrl && k === "r") { e.preventDefault(); setVis({ rulers: !vis.rulers }); return; }
      if (ctrl && e.key === "'") { e.preventDefault(); setVis({ grid: !vis.grid }); return; }
      if (ctrl && e.key === ";") { e.preventDefault(); setVis({ guides: !vis.guides }); return; }
      if (ctrl && k === "0") { e.preventDefault(); setFitKey((x) => x + 1); return; }
      if (ctrl && k === "1") {
        e.preventDefault();
        const v = store.view.get(doc.id);
        if (v) { store.view.set(doc.id, { z: 1, x: v.x, y: v.y }); bump(); }
        return;
      }
      if (ctrl && (k === "=" || k === "+" || k === "-")) {
        e.preventDefault();
        const v = store.view.get(doc.id);
        if (v) { store.view.set(doc.id, { ...v, z: Math.max(0.02, Math.min(32, v.z * (k === "-" ? 1 / 1.25 : 1.25))) }); bump(); }
        return;
      }
      if (!ctrl && !e.altKey) {
        // 도구 바꾸기 — 포토샵과 같은 글쇠
        const tk: Record<string, Tool> = { v: "move", t: "text", h: "hand", z: "zoom", b: "brush", e: "eraser", g: e.shiftKey ? "bucket" : "gradient" };
        if (tk[k]) { setTool(tk[k]); return; }
        if (k === "x") { setPaint({ fg: paint.bg, bg: paint.fg }); return; } // 전경색 ↔ 배경색
        if (k === "d") { setPaint({ fg: "#000000", bg: "#FFFFFF" }); return; } // 기본 색
        if (e.key === "[" || e.key === "]") { setPaint({ size: Math.max(1, Math.min(1000, Math.round(paint.size * (e.key === "]" ? 1.2 : 1 / 1.2)))) }); return; }
        if (k === "u") { insert(shapeLayer(doc)); return; }
      }
      if (!sel) return;
      if (k === "delete" || k === "backspace") { e.preventDefault(); act(sel, "del"); return; }
      if (ctrl && k === "j") { e.preventDefault(); act(sel, "dup"); return; }
      if (ctrl && k === "e") { e.preventDefault(); act(sel, "merge"); return; }
      if (ctrl && k === "g") { e.preventDefault(); act(sel, e.shiftKey ? "ungroup" : "group"); return; }
      if (ctrl && e.key === "]") { e.preventDefault(); act(sel, "up"); return; }
      if (ctrl && e.key === "[") { e.preventDefault(); act(sel, "down"); return; }
      if (k === "escape") { setSel(null); return; }
      if (k.startsWith("arrow")) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : 1;
        const l = findLayer(kids(doc.psd), sel);
        if (!l || l.protected?.position) return;
        const dx = k === "arrowleft" ? -n : k === "arrowright" ? n : 0, dy = k === "arrowup" ? -n : k === "arrowdown" ? n : 0;
        mutate(() => offsetLayer(l, dx, dy), `nudge:${sel}`);
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
      <PhotoHome onNew={() => setNewOpen(true)} onOpen={() => void openPick()} onRecent={(r) => void openRecent(r)} busy={Boolean(busy)} onPreset={(i) => { setNewInit(i); setNewOpen(true); }} />
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
    const l = textLayer(doc);
    applyText(l, l._look!);
    const bb = l.canvas!;
    offsetLayer(l, Math.round(x - ((l.left || 0) + bb.width / 2)), Math.round(y - ((l.top || 0) + bb.height / 2)));
    insert(l, true);
    setTool("move");
  };
  const ppi = doc?.psd.imageResources?.resolutionInfo?.horizontalResolution;
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
  type MI = { t: string; key?: string; go?: () => void; off?: boolean; on?: boolean } | "-";
  const S = sel || "";
  const menus: { id: string; label: string; items: MI[] }[] = [
    { id: "file", label: "파일", items: [
      { t: "새로 만들기…", key: "Ctrl+N", go: () => setNewOpen(true) },
      { t: "열기…", key: "Ctrl+O", go: () => void openPick() },
      { t: "최근 파일 · 처음 화면", go: () => { store.home = true; setSel(null); bump(); } },
      "-",
      { t: "닫기", key: "Ctrl+W", go: () => doc && closeDoc(doc), off: !doc },
      { t: "저장", key: "Ctrl+S", go: () => doc && void save(doc), off: !doc },
      { t: "다른 이름으로 저장…", key: "Shift+Ctrl+S", go: () => doc && void save(doc, true), off: !doc },
      "-",
      { t: "사진 가져오기 (PC에서)…", go: () => void addImages(), off: !doc },
      { t: "내보내기 › PNG…", go: () => void exportAs("png"), off: !doc },
      { t: "내보내기 › JPG…", go: () => void exportAs("jpg"), off: !doc },
    ] },
    { id: "edit", label: "편집", items: [
      { t: "실행 취소", key: "Ctrl+Z", go: undo, off: !h?.undo.length },
      { t: "다시 실행", key: "Shift+Ctrl+Z", go: redo, off: !h?.redo.length },
      "-",
      { t: "레이어 복제", key: "Ctrl+J", go: () => void act(S, "dup"), off: !sel },
      { t: "삭제", key: "Delete", go: () => void act(S, "del"), off: !sel },
      { t: "선택 해제", key: "Esc", go: () => setSel(null), off: !sel },
    ] },
    { id: "image", label: "이미지", items: [
      { t: "모드 › RGB 색상 (화면용)", go: () => doc && doc.mode === "cmyk" && mutate(() => { doc.mode = "rgb"; }), on: doc?.mode !== "cmyk", off: !doc },
      { t: "모드 › CMYK 색상 (인쇄용)", go: () => doc && doc.mode !== "cmyk" && mutate(() => { doc.mode = "cmyk"; }), on: doc?.mode === "cmyk", off: !doc },
      "-",
      { t: "캔버스 크기…", go: () => setSel(null), off: !doc },
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
      { t: "아래 레이어와 병합", key: "Ctrl+E", go: () => void act(S, "merge"), off: !sel },
      { t: "래스터화 (그림으로)", go: () => void act(S, "raster"), off: !sel },
      { t: "PNG 빠른 내보내기", go: () => void act(S, "png"), off: !sel || Boolean(selL?.children) },
      "-",
      { t: "앞으로 가져오기", key: "Ctrl+]", go: () => void act(S, "up"), off: !sel },
      { t: "뒤로 보내기", key: "Ctrl+[", go: () => void act(S, "down"), off: !sel },
      "-",
      { t: selL?.protected?.position ? "잠금 풀기" : "레이어 잠그기", go: () => void act(S, "lock"), off: !sel },
      { t: selL?.hidden ? "레이어 보이기" : "레이어 숨기기", go: () => void act(S, "hide"), off: !sel },
      "-",
      { t: "사각형 넣기", key: "U", go: () => doc && insert(shapeLayer(doc)), off: !doc },
      { t: "스티커 넣기…", go: () => setSide("sticker"), off: !doc },
    ] },
    { id: "type", label: "문자", items: [
      { t: "가로 문자 넣기", key: "T", go: addText, off: !doc },
      { t: "글 고치기", go: () => sel && setEditing(sel), off: !selL || !isText(selL) },
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
      { t: "화면 크기에 맞추기", key: "Ctrl+0", go: () => setFitKey((x) => x + 1), off: !doc },
      { t: "100%", key: "Ctrl+1", go: () => { if (doc) { const v = store.view.get(doc.id); if (v) { store.view.set(doc.id, { ...v, z: 1 }); bump(); } } }, off: !doc },
    ] },
    { id: "help", label: "도움말", items: [
      { t: "단축키 안내", go: () => setKeysOpen(true) },
    ] },
  ];
  const menuBar = (
    <div style={{ display: "flex", alignItems: "center", height: 30, padding: "0 6px", background: "#2b2b2b", borderBottom: "1px solid #1f1f1f", flexShrink: 0, position: "relative", zIndex: 60 }}>
      {railHidden && hasDoc && (
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("studio:rail", { detail: false }))} title="왼쪽 메뉴 보이기"
          style={{ width: 26, height: 24, marginRight: 4, border: "1px solid #4a4a4a", borderRadius: 4, background: "transparent", color: "#ddd", fontSize: 15, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}>»</button>
      )}
      {menus.map((m) => (
        <div key={m.id} style={{ position: "relative" }}>
          <button type="button" onClick={() => setMenuOpen(menuOpen === m.id ? "" : m.id)} onMouseEnter={() => menuOpen && setMenuOpen(m.id)}
            style={{ height: 26, padding: "0 10px", border: 0, borderRadius: 4, background: menuOpen === m.id ? "#3e3e3e" : "transparent", color: "#ddd", fontSize: 13.5, fontFamily: FONT, cursor: "pointer" }}>{m.label}</button>
          {menuOpen === m.id && (
            <div style={{ position: "absolute", left: 0, top: 28, minWidth: 250, padding: "4px 0", background: "#323232", border: "1px solid #1f1f1f", borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
              {m.items.map((it, i) => it === "-" ? <div key={i} style={{ height: 1, background: "#454545", margin: "4px 0" }} /> : (
                <button key={i} type="button" disabled={it.off} onClick={() => { setMenuOpen(""); it.go?.(); }}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: 16, padding: "6px 16px 6px 22px", border: 0, background: "transparent", color: it.off ? "#777" : "#e6e6e6", fontSize: 13.5, fontFamily: FONT, textAlign: "left", cursor: it.off ? "default" : "pointer" }}
                  onMouseEnter={(e) => { if (!it.off) e.currentTarget.style.background = "#1473e6"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ width: 12, marginLeft: -14, color: "#fff" }}>{it.on ? "✓" : ""}</span><span style={{ flex: 1 }}>{it.t}</span>{it.key && <span style={{ color: it.off ? "#666" : "#aaa", fontSize: 12.5 }}>{it.key}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  /* 옵션줄 — 집 · 지금 도구 · 맞춤 · 되돌리기 … 오른쪽에 저장 · 내보내기 */
  const iconBtn = (icon: React.ReactNode, tip: string, go: () => void, disabled = false, on = false) => (
    <button type="button" title={tip} onClick={go} disabled={disabled}
      style={{ width: 32, height: 30, borderRadius: 4, border: 0, background: on ? "#4a4a4a" : "transparent", color: disabled ? C.dim : C.text, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {typeof icon === "string" ? <Icon name={icon} size={18} /> : icon}
    </button>
  );
  const sep = <div style={{ width: 1, height: 22, background: C.line2, margin: "0 8px", flexShrink: 0 }} />;
  const svg = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={d} /></svg>;
  const alignTo = (fn: (b: Box, W: number, H: number) => [number, number]) => () => {
    if (!doc || !selL || selL.protected?.position) return;
    const b = boundsOfL(selL);
    if (!b) return;
    const [x, y] = fn(b, doc.psd.width, doc.psd.height);
    mutate(() => offsetLayer(selL, Math.round(x - b.x), Math.round(y - b.y)));
  };
  const TOOL_NAME: Record<Tool, string> = { move: "이동 도구", text: "가로 문자 도구", hand: "손 도구", zoom: "돋보기 도구", brush: "브러시 도구", eraser: "지우개 도구", bucket: "페인트 통 도구", gradient: "그레이디언트 도구" };
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
    <button type="button" onClick={go} style={{ height: 26, padding: "0 10px", borderRadius: 4, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", marginLeft: 4 }}>{text}</button>
  );
  const optionBar = doc && (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 42, padding: "0 8px", background: C.panel, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
      {iconBtn(svg("M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10"), "처음 화면 (새 파일 · 열기 · 최근 파일)", () => { store.home = true; setSel(null); bump(); })}
      {sep}
      <span style={{ fontSize: 13, color: C.sub, fontWeight: 700, minWidth: 90 }}>{TOOL_NAME[tool]}</span>
      {tool === "move" && (
        <>
          {sep}
          {iconBtn(svg("M4 3v18M8 7h12v4H8zM8 13h7v4H8z"), "왼쪽 맞춤 (캔버스)", alignTo((b) => [0, b.y]), !selL)}
          {iconBtn(svg("M12 3v18M5 7h14v4H5zM8 13h8v4H8z"), "가로 가운데 맞춤", alignTo((b, W) => [(W - b.w) / 2, b.y]), !selL)}
          {iconBtn(svg("M20 3v18M4 7h12v4H4zM9 13h7v4H9z"), "오른쪽 맞춤", alignTo((b, W) => [W - b.w, b.y]), !selL)}
          {iconBtn(svg("M3 4h18M7 8v12h4V8zM13 8v7h4V8z"), "위쪽 맞춤", alignTo((b) => [b.x, 0]), !selL)}
          {iconBtn(svg("M3 12h18M7 5v14h4V5zM13 8v8h4V8z"), "세로 가운데 맞춤", alignTo((b, _W, H) => [b.x, (H - b.h) / 2]), !selL)}
          {iconBtn(svg("M3 20h18M7 4v12h4V4zM13 9v7h4V9z"), "아래쪽 맞춤", alignTo((b, _W, H) => [b.x, H - b.h]), !selL)}
        </>
      )}
      {tool === "text" && <span style={{ fontSize: 12.5, color: C.dim, marginLeft: 8 }}>그림판을 누르면 그 자리에 글자가 생겨요 · 글자를 누르면 고치기</span>}
      {tool === "zoom" && (
        <>
          {sep}
          {iconBtn(svg("M11 5a6 6 0 100 12 6 6 0 000-12zM21 21l-5.5-5.5M8 11h6M11 8v6"), "확대", () => zoomBy(1.25))}
          {iconBtn(svg("M11 5a6 6 0 100 12 6 6 0 000-12zM21 21l-5.5-5.5M8 11h6"), "축소", () => zoomBy(1 / 1.25))}
          <Btn small onClick={() => setFitKey((x) => x + 1)}>화면 맞추기</Btn>
          <span style={{ fontSize: 12.5, color: C.dim, marginLeft: 8 }}>누르면 확대 · Alt+누르면 축소</span>
        </>
      )}
      {(tool === "brush" || tool === "eraser") && (
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
          {optSlider("허용치", paint.tol, 0, 255, (n) => setPaint({ tol: n }))}
          {optSlider("불투명도", Math.round(paint.opacity * 100), 1, 100, (n) => setPaint({ opacity: n / 100 }), "%")}
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
      {PAINT_TOOLS.includes(tool) && <span style={{ fontSize: 12, color: C.dim, marginLeft: 10, whiteSpace: "nowrap" }}>{tool === "gradient" ? "끌어서 칠하기 · 새 레이어로" : tool === "eraser" ? "고른 그림 레이어를 지워요" : "Alt+누르기 = 색 뽑기"}</span>}
      {tool === "hand" && <span style={{ fontSize: 12.5, color: C.dim, marginLeft: 8 }}>끌어서 화면 옮기기 (다른 도구에서도 스페이스+끌기)</span>}
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

  /* 왼쪽 도구창 */
  const toolBtn = (t: Tool | null, icon: React.ReactNode, tip: string, go?: () => void) => {
    const on = t !== null && tool === t;
    return (
      <button key={tip} type="button" title={tip} onClick={() => (t ? setTool(t) : go?.())}
        style={{ width: 36, height: 34, borderRadius: 4, border: 0, background: on ? "#505050" : "transparent", color: on ? "#fff" : "#cfcfcf", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "#3a3a3a"; }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
        {typeof icon === "string" ? <Icon name={icon} size={19} /> : icon}
      </button>
    );
  };
  const toolbar = doc && (
    <div style={{ width: 46, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", background: C.panel, borderRight: `1px solid ${C.line}` }}>
      {toolBtn("move", svg("M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"), "이동 도구 (V)")}
      {toolBtn("text", <span style={{ fontSize: 19, fontWeight: 700, fontFamily: "Georgia, serif" }}>T</span>, "가로 문자 도구 (T)")}
      <div style={{ width: 26, height: 1, background: C.line2, margin: "4px 0" }} />
      {toolBtn(null, "image", "사진 가져오기 (PC에서)", () => void addImages())}
      {toolBtn(null, svg("M4 6h16v12H4z"), "사각형 넣기 (U)", () => insert(shapeLayer(doc)))}
      {toolBtn(null, "sticker", "스티커", () => setSide(side === "sticker" ? "" : "sticker"))}
      <div style={{ width: 26, height: 1, background: C.line2, margin: "4px 0" }} />
      {toolBtn("brush", svg("M4 20c2 0 4-1 4-3.5S6 13 8 11l8-8 3 3-8 8c-2 2-1.5 3.5-3.5 4.5S5 20 4 20z"), "브러시 도구 (B)")}
      {toolBtn("eraser", svg("M8 20h12M5 15l9-9 5 5-9 9H8z M10 10l5 5"), "지우개 도구 (E)")}
      {toolBtn("bucket", svg("M5 11l7-7 7 7-7 7zM5 11h14M20 15s2 2.5 2 4a2 2 0 01-4 0c0-1.5 2-4 2-4z"), "페인트 통 도구 (Shift+G)")}
      {toolBtn("gradient", <span style={{ width: 18, height: 18, borderRadius: 2, border: "1.5px solid currentColor", background: "linear-gradient(90deg, currentColor, transparent)" }} />, "그레이디언트 도구 (G)")}
      <div style={{ width: 26, height: 1, background: C.line2, margin: "4px 0" }} />
      {toolBtn("hand", svg("M8 12V5.5a1.5 1.5 0 013 0V11M11 10V4.5a1.5 1.5 0 013 0V11M14 10.5V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6.5 7S5 17 4 15l-1.5-3a1.5 1.5 0 012.6-1.5L8 13"), "손 도구 (H · 스페이스)")}
      {toolBtn("zoom", svg("M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM20 20l-4.8-4.8"), "돋보기 도구 (Z)")}
      <div style={{ flex: 1 }} />
      {/* 전경색 · 배경색 (포토샵처럼 아래) — 누르면 색 고르기 */}
      <div style={{ position: "relative", width: 36, height: 40, marginBottom: 2 }}>
        <button type="button" title="배경색" onClick={() => (doc?.mode === "cmyk" ? setColorEdit(colorEdit === "bg" ? "" : "bg") : bgIn.current?.click())}
          style={{ position: "absolute", right: 0, bottom: 0, width: 22, height: 22, border: "1px solid #888", background: paint.bg, cursor: "pointer", padding: 0 }} />
        <button type="button" title="전경색 (브러시·페인트 통·그레이디언트 색)" onClick={() => (doc?.mode === "cmyk" ? setColorEdit(colorEdit === "fg" ? "" : "fg") : fgIn.current?.click())}
          style={{ position: "absolute", left: 0, top: 0, width: 22, height: 22, border: "1px solid #ddd", background: paint.fg, cursor: "pointer", padding: 0, boxShadow: "0 0 0 1px #000" }} />
        <input ref={fgIn} type="color" value={paint.fg.toLowerCase()} onChange={(e) => setPaint({ fg: e.target.value.toUpperCase() })} style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }} />
        <input ref={bgIn} type="color" value={paint.bg.toLowerCase()} onChange={(e) => setPaint({ bg: e.target.value.toUpperCase() })} style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <button type="button" title="기본 색 (D)" onClick={() => setPaint({ fg: "#000000", bg: "#FFFFFF" })} style={{ width: 14, height: 14, padding: 0, border: "1px solid #888", background: "linear-gradient(135deg, #000 50%, #fff 50%)", cursor: "pointer" }} />
        <button type="button" title="색 바꾸기 (X)" onClick={() => setPaint({ fg: paint.bg, bg: paint.fg })} style={{ width: 16, height: 14, padding: 0, border: 0, background: "transparent", color: "#ccc", fontSize: 12, lineHeight: "14px", cursor: "pointer" }}>⇄</button>
      </div>
    </div>
  );

  /* 오른쪽 아래 레이어 칸 — 혼합 · 불투명도 줄, 목록, 아래 단추 줄 (포토샵처럼) */
  const layersPanel = doc && (
    <div style={{ flex: "1 1 45%", minHeight: 220, display: "flex", flexDirection: "column", background: C.panel, borderTop: `1px solid ${C.line2}` }}>
      <div style={{ display: "flex", alignItems: "center", height: 36, padding: "0 12px", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 14, fontWeight: 800, borderBottom: `2px solid ${C.text}`, paddingBottom: 6, marginTop: 8 }}>레이어</span>
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
              style={{ width: 26, height: 24, borderRadius: 4, border: `1px solid ${on ? C.text : "transparent"}`, background: on ? "#4a4a4a" : "transparent", color: selL ? C.text : C.dim, cursor: selL ? "pointer" : "default", fontSize: 13, padding: 0 }}>{ic}</button>
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
      <LayerList doc={doc} tick={tick} sel={sel} onSel={setSel} onToggle={toggle} onDrop={dropLayer} onAct={(k, a) => void act(k, a)}
        onRename={(k, name) => { const l = findLayer(kids(doc.psd), k); if (l && l.name !== name) mutate(() => { l.name = name; }); }} />
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, height: 36, padding: "0 8px", borderTop: `1px solid ${C.line}` }}>
        {iconBtn(<span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 14 }}>fx</span>, "레이어 스타일 (효과)", () => void act(S, "fx"), !sel || Boolean(selL?.children))}
        {iconBtn("folder", sel ? "그룹으로 묶기 (Ctrl+G)" : "새 그룹", newGroup)}
        {iconBtn(svg("M5 4h14v16H5zM12 8v8M8 12h8"), "새 레이어 (Shift+Ctrl+N) · 레이어를 끌어다 놓으면 복제", () => newLayer())}
        {iconBtn("trash", "레이어 삭제 (Delete)", () => void act(S, "del"), !sel)}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: C.bg, fontFamily: FONT, color: C.text }}
      onPointerDown={() => { if (menuOpen) setMenuOpen(""); }}>
      {!doc ? home : (
        <>
          <div onPointerDown={(e) => e.stopPropagation()}>{menuBar}</div>
          {optionBar}
          <div style={{ flex: 1, minHeight: 0, display: "flex" }} onPointerDown={() => exportOpen && setExportOpen(false)}>
            {toolbar}
            {/* 가운데: 문서 탭 · 그림판 · 상태줄 */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "flex-end", height: 32, background: C.panel, borderBottom: `1px solid ${C.line}`, overflowX: "auto", flexShrink: 0 }}>
                {store.docs.map((d) => {
                  const on = d.id === doc.id;
                  const z = store.view.get(d.id)?.z;
                  return (
                    <div key={d.id} onClick={() => { store.active = d.id; setSel(null); bump(); }} title={d.path || d.name}
                      style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 6px 0 12px", background: on ? C.bg : "transparent", borderRight: `1px solid ${C.line}`, color: on ? C.text : C.sub, cursor: "pointer", flexShrink: 0, maxWidth: 300, fontSize: 13, fontWeight: on ? 700 : 500 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}{z ? ` @ ${Math.round(z * 100)}%` : ""} ({d.mode === "cmyk" ? "CMYK" : "RGB"}/8){d.dirty ? " *" : ""}</span>
                      <button type="button" title="닫기 (Ctrl+W)" onClick={(e) => { e.stopPropagation(); closeDoc(d); }}
                        style={{ width: 20, height: 20, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  );
                })}
                <button type="button" title="새 파일 (Ctrl+N)" onClick={() => setNewOpen(true)} style={{ width: 30, height: 30, alignSelf: "center", border: 0, background: "transparent", color: C.sub, cursor: "pointer" }}><Icon name="plus" size={15} /></button>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
                <Stage key={doc.id} doc={doc} tick={tick} view={view} setView={(v) => { store.view.set(doc.id, v); bump(); }}
                  sel={sel} onSel={setSel} fitKey={fitKey} tool={tool} onTextAt={addTextAt}
                  rulers={vis.rulers} grid={vis.grid ? gridSizes.get(doc.id) || niceGrid(doc.psd.width, doc.psd.height) : 0}
                  proof={doc.mode === "cmyk" && vis.proof !== false}
                  guidesOn={vis.guides} guideList={guidesOf(doc)} onGuides={(g) => mutate(() => setGuides(doc, g))}
                  paint={paint} onPaintTarget={paintTarget} onPaintEnd={(l) => { if (l.canvas) l.canvas = copyCanvas(l.canvas); bump(); }}
                  onPickColor={(hex) => setPaint({ fg: hex })}
                  onMove={(k, dx, dy) => { const l = findLayer(kids(doc.psd), k); if (l && (dx || dy)) mutate(() => offsetLayer(l, dx, dy)); }}
                  onResize={(k, box: Box) => { const l = findLayer(kids(doc.psd), k); if (l) mutate(() => applyResize(l, box)); }}
                  onEditText={(k) => { setSelS(k); setEditing(k); }}
                  editing={editing}
                  onEditDone={(k, text) => {
                    setEditing(null);
                    const l = findLayer(kids(doc.psd), k);
                    if (!l || text === null) return;
                    const look = lookOf(l);
                    if (text === look.text && l._look) return;
                    const wasAuto = !l.name || l.name === look.text.slice(0, 20);
                    mutate(() => {
                      applyText(l, { ...look, text: text || " " });
                      if (wasAuto) l.name = (text || "글자").replace(/\s+/g, " ").slice(0, 20);
                    });
                  }}
                  onDropFiles={(f) => void onDropFiles(f)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, height: 24, padding: "0 10px", background: C.panel, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.sub, flexShrink: 0 }}>
                <span>{view ? `${(view.z * 100).toFixed(2).replace(/\.?0+$/, "")}%` : ""}</span>
                <span>{doc.psd.width} 픽셀 × {doc.psd.height} 픽셀{ppi ? ` (${Math.round(ppi)} ppi)` : ""}</span>
                <span style={{ color: doc.mode === "cmyk" ? "#7dd3fc" : C.sub }}>{doc.mode === "cmyk" ? `CMYK 인쇄용${vis.proof !== false ? " · 인쇄 색 미리보기" : ""}` : "RGB 화면용"}</span>
                {doc.path && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.path}</span>}
              </div>
            </div>
            {/* 오른쪽: 위 속성 · 아래 레이어 */}
            <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, borderLeft: `1px solid ${C.line}` }}>
              <div style={{ flex: "1 1 55%", minHeight: 0, display: "flex", overflow: "hidden" }}>
                {side === "sticker" ? <StickerSide onPick={addSticker} onClose={() => setSide("")} />
                  : selL && isText(selL) && !selL.children ? <TextPanel key={selL._k} doc={doc} l={selL} mutate={mutate} apply={applyText} onClose={() => setSel(null)} />
                  : selL ? <LayerPanel key={selL._k} doc={doc} l={selL} mutate={mutate} fxFirst={side === "fx"} onClose={() => setSel(null)} />
                  : <DocPanel doc={doc} onResize={(w, hh) => mutate(() => resizeCanvas(doc, w, hh))}
                      gridSize={gridSizes.get(doc.id) || niceGrid(doc.psd.width, doc.psd.height)} onGridSize={(n) => { gridSizes.set(doc.id, n); bump(); }} />}
              </div>
              {layersPanel}
            </div>
          </div>
        </>
      )}
      {colorEdit && doc && (
        <CmykPicker value={colorEdit === "fg" ? paint.fg : paint.bg} title={colorEdit === "fg" ? "전경색 (CMYK)" : "배경색 (CMYK)"}
          onChange={(hex) => setPaint(colorEdit === "fg" ? { fg: hex } : { bg: hex })} onClose={() => setColorEdit("")} />
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
                    style={{ flex: 1, height: 34, borderRadius: 5, border: `2px solid ${bleedMm === mm ? C.text : C.line2}`, background: "transparent", color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{mm ? `사방 ${mm}mm` : "없음"}</button>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>자를 때 하얀 줄이 생기지 않게 가장자리를 늘려 붙여요. 명함·전단은 보통 2mm (인쇄소 안내를 따르세요).</div>
            </div>
            <div style={{ fontSize: 12.5, color: C.dim }}>지금은 간단한 계산으로 CMYK 를 만들어요. 거래 인쇄소의 색 기준(ICC)이 정해지면 그 기준으로 맞출게요.</div>
          </div>
        </Modal>
      )}
      {keysOpen && (
        <Modal title="단축키 (포토샵과 같아요)" onClose={() => setKeysOpen(false)} width={520}>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "150px 1fr", rowGap: 8, fontSize: 14 }}>
            {[["V · T · H · Z", "이동 · 문자 · 손 · 돋보기 도구"], ["U", "사각형 넣기"], ["스페이스+끌기", "화면 옮기기"], ["휠", "확대 · 축소"], ["Ctrl+N / O", "새로 만들기 / 열기"], ["Ctrl+S", "저장 (PSD)"], ["Shift+Ctrl+S", "다른 이름으로 저장"], ["Ctrl+W", "닫기"], ["Ctrl+Z", "실행 취소"], ["Shift+Ctrl+Z · Ctrl+Y", "다시 실행"], ["Ctrl+J", "레이어 복제"], ["Ctrl+G / Shift+Ctrl+G", "그룹 / 그룹 풀기"], ["Ctrl+E", "아래 레이어와 병합"], ["Ctrl+] / [", "앞으로 / 뒤로"], ["Delete", "레이어 삭제"], ["화살표 (Shift)", "1px (10px) 옮기기"], ["Ctrl+0 / 1", "화면 맞추기 / 100%"], ["Ctrl+ + / -", "확대 / 축소"]].map(([k, t]) => (
              <React.Fragment key={k}><b>{k}</b><span style={{ color: C.sub }}>{t}</span></React.Fragment>
            ))}
          </div>
        </Modal>
      )}
      {newOpen && <NewDocDialog init={newInit} onCreate={create} onClose={() => { setNewOpen(false); setNewInit(null); }} />}
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

/** CMYK 색 고르기 (전경색·배경색) — C·M·Y·K % 로, 인쇄로 그대로 안 나오는 색이면 ⚠ */
function CmykPicker({ value, title, onChange, onClose }: { value: string; title: string; onChange: (hex: string) => void; onClose: () => void }) {
  const n = parseInt(value.replace("#", ""), 16);
  const cur = rgbToCmyk((n >> 16) & 255, (n >> 8) & 255, n & 255);
  const [v, setV] = useState({ c: Math.round(cur.c * 100), m: Math.round(cur.m * 100), y: Math.round(cur.y * 100), k: Math.round(cur.k * 100) });
  const hexOf = (x: typeof v) => {
    const r = cmykToRgb({ c: x.c / 100, m: x.m / 100, y: x.y / 100, k: x.k / 100 });
    return "#" + [r.r, r.g, r.b].map((q) => q.toString(16).padStart(2, "0")).join("").toUpperCase();
  };
  const set = (k: keyof typeof v, val: number) => {
    const nx = { ...v, [k]: Math.max(0, Math.min(100, Math.round(val))) };
    setV(nx);
    onChange(hexOf(nx));
  };
  const hex = hexOf(v);
  const rr = parseInt(hex.slice(1), 16);
  const warn = outOfGamut((rr >> 16) & 255, (rr >> 8) & 255, rr & 255);
  const bars: [keyof typeof v, string, string][] = [["c", "C", "#00A0E9"], ["m", "M", "#E4007F"], ["y", "Y", "#FFF100"], ["k", "K", "#231815"]];
  return (
    <div onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", left: 56, bottom: 60, width: 280, padding: 14, background: C.card, border: `1px solid ${C.line2}`, borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.5)", zIndex: 3000, fontFamily: FONT, color: C.text }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>{title}</span>
        <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer" }}><Icon name="close" size={16} /></button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ width: 44, height: 44, borderRadius: 6, background: hex, border: `1px solid ${C.line2}` }} />
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6 }}>
          C{v.c} M{v.m} Y{v.y} K{v.k}<br />{hex}
          {warn && <div style={{ color: "#fbbf24" }}>⚠ 인쇄로는 이 색 그대로 안 나와요</div>}
        </div>
      </div>
      {bars.map(([k, label, col]) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ width: 14, fontSize: 13, fontWeight: 800, color: col === "#231815" ? C.text : col }}>{label}</span>
          <input type="range" min={0} max={100} value={v[k]} onChange={(e) => set(k, Number(e.target.value))} style={{ flex: 1, accentColor: col === "#231815" ? "#888" : col }} />
          <input type="number" min={0} max={100} value={v[k]} onChange={(e) => set(k, Number(e.target.value) || 0)} onKeyDown={(e) => e.stopPropagation()}
            style={{ width: 50, height: 26, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, padding: "0 4px" }} />
          <span style={{ fontSize: 12, color: C.dim }}>%</span>
        </div>
      ))}
    </div>
  );
}
