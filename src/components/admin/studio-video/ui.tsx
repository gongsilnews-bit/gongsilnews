"use client";

// 영상 편집기 생김새 — 어두운 회색 + 흰/회색 글자, 강조색은 공실뉴스 파랑 하나 (알록달록·AI스러운 꾸밈 금지, 사장님)
// 60세 어르신도 쉽게: 글자 크게, 단추는 아이콘 + 한글 이름
import React from "react";

/* 화면 색 — 어두운(기본)·밝은 두 벌 (2026-10-23 사장님: 이미지제작·동영상제작에 밝은 화면도).
   C 는 CSS 변수(--st-…)라서 이미지제작·동영상제작이 열려 있는 동안 useStudioTheme 이 고른 벌을 :root 에 넣는다.
   변수가 없으면(다른 화면) 어두운 색 그대로. 캔버스에 그릴 색에는 쓰지 않는다 (var() 는 캔버스에서 안 됨) */
const DARK = {
  bg: "#18191c",
  panel: "#202125",
  panel2: "#26272c",
  card: "#2b2c31",
  cardHover: "#313238",
  line: "#36373d",
  line2: "#44454c",
  text: "#eceef1",
  sub: "#a3a7af",
  dim: "#6f737b",
  accent: "#3b82f6",
  accentDim: "rgba(59,130,246,0.16)",
  danger: "#f06a6a",
  ok: "#4ade80",
  field: "#18191c", // 입력칸 바탕
  sel: "#eceef1",
  selText: "#18191c",
  // 이미지 편집판(포토샵식) 막대·메뉴·눈금자 — 2026-10-23 밝은 화면
  psBar: "#2b2b2b",
  psBarLine: "#1f1f1f",
  psMenu: "#323232",
  psMenuText: "#e6e6e6",
  psMenuSep: "#454545",
  psHover: "#3a3a3a",
  psOpen: "#3e3e3e",
  psSel: "#3d3d3d",
  psToolOn: "#505050",
  psIcon: "#cfcfcf",
  psStage: "#121316",
  psCtrl: "#2a2c31",
  psCtrlLine: "#4a4d55",
  psCtrlText: "#f1f1f1",
  psCtrlIn: "#141518",
  psCtrlHover: "#3a3d45",
  psCtrlSel: "#3b4252",
  psCtrlSep: "#3d4048",
  psEdge: "#4a4a4a",
  psEdgeOn: "#5a5a5a",
  psRulerTick: "#8a8a8a",
  psRulerText: "#bdbdbd",
  psMute: "#999",
  psMute2: "#aaa",
  psOff: "#777",
  psDdd: "#ddd",
  psHi: "#1473e6",
};
const LIGHT: typeof DARK = {
  // 흰색·회색 나누기 (2026-10-23 사장님) — 작업 바탕은 회색, 칸·상자(card)는 흰색, 고른 것은 cardHover(연회색)
  // 관리 화면(뉴스·SNS발행)과 같은 색 (2026-10-23 사장님: 일관성) — 바탕 연회색 · 칸 흰색 · 강조 공실뉴스 남색
  bg: "#f4f5f7",
  panel: "#ffffff",
  panel2: "#f9fafb",
  card: "#ffffff",
  cardHover: "#f3f4f6",
  line: "#e1e4e8",
  line2: "#d1d5db",
  text: "#111827",
  sub: "#6b7280",
  dim: "#9ca3af",
  accent: "#1a3a6b",
  accentDim: "rgba(26,58,107,0.08)",
  danger: "#dc2626",
  ok: "#16a34a",
  field: "#ffffff",
  sel: "#1a3a6b",
  selText: "#ffffff",
  psBar: "#f3f4f6",
  psBarLine: "#d9dde3",
  psMenu: "#ffffff",
  psMenuText: "#1f2937",
  psMenuSep: "#e5e7eb",
  psHover: "#e6e9ee",
  psOpen: "#e2e6ec",
  psSel: "#dbe4f3",
  psToolOn: "#d3d9e2",
  psIcon: "#374151",
  psStage: "#2b2e34", // 그림판 둘레 — 밝은 화면에서도 어둡게 (그림 색을 바르게 보려고)
  psCtrl: "#ffffff",
  psCtrlLine: "#cfd4db",
  psCtrlText: "#14171c",
  psCtrlIn: "#ffffff",
  psCtrlHover: "#e6e9ee",
  psCtrlSel: "#dbe4f3",
  psCtrlSep: "#e5e7eb",
  psEdge: "#cfd4db",
  psEdgeOn: "#9aa3b0",
  psRulerTick: "#9aa3b0",
  psRulerText: "#4b5260",
  psMute: "#6b7280",
  psMute2: "#6b7280",
  psOff: "#a3a9b3",
  psDdd: "#1f2937",
  psHi: "#d6e4fb",
};
export const C = Object.fromEntries(Object.entries(DARK).map(([k, v]) => [k, `var(--st-${k}, ${v})`])) as typeof DARK;

export type StudioTheme = "dark" | "light";
const THEME_KEY = "gs-studio-theme";
const THEME_EVENT = "gs-studio-theme-change";
/** 동영상앱·포토앱은 각자 따로 기억 (2026-10-30 사장님) — 처음엔 어두운 화면. 포토앱은 따로 고른 적이 없으면 예전 같이 쓰던 값 */
export type StudioArea = "video" | "photo";
const PHOTO_KEY = "gs-photo-theme";
const keyOf = (area: StudioArea) => (area === "photo" ? PHOTO_KEY : THEME_KEY);
const readTheme = (area: StudioArea = "video"): StudioTheme => {
  try { return (localStorage.getItem(keyOf(area)) ?? localStorage.getItem(THEME_KEY)) === "light" ? "light" : "dark"; } catch { return "dark"; }
};
/** 이미지제작·동영상제작 맨 바깥에서 한 번 — 고른 색 벌을 화면 전체(:root)에 넣고, 떠나면 뺀다 (창·떠 있는 창까지 같은 색) */
export function useStudioTheme(apply = true, area: StudioArea = "video"): [StudioTheme, (t: StudioTheme) => void] {
  const [theme, setThemeS] = React.useState<StudioTheme>("dark");
  React.useEffect(() => {
    const load = () => setThemeS(readTheme(area));
    load();
    window.addEventListener(THEME_EVENT, load);
    return () => window.removeEventListener(THEME_EVENT, load);
  }, [area]);
  React.useEffect(() => {
    if (!apply) return; // 다른 화면 안에 잠깐 열린 편집기(영상 › 썸네일 고치기)는 바깥 화면이 넣은 색을 그대로 쓴다
    const root = document.documentElement;
    const P = theme === "light" ? LIGHT : DARK;
    for (const [k, v] of Object.entries(P)) root.style.setProperty(`--st-${k}`, v);
    root.style.setProperty("color-scheme", theme);
    return () => {
      for (const k of Object.keys(P)) root.style.removeProperty(`--st-${k}`);
      root.style.removeProperty("color-scheme");
    };
  }, [theme, apply]);
  const setTheme = (t: StudioTheme) => {
    try { localStorage.setItem(keyOf(area), t); } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  return [theme, setTheme];
}
/** ☀ 밝은 화면 / 🌙 어두운 화면 — 왼쪽 칸 아래쪽에 */
/** light = 늘 흰 바탕인 칸(이미지제작 왼쪽)에 놓을 때 */
export function ThemeToggle({ light = false }: { light?: boolean } = {}) {
  const [theme, setTheme] = React.useState<StudioTheme>("dark");
  React.useEffect(() => {
    const load = () => setTheme(readTheme());
    load();
    window.addEventListener(THEME_EVENT, load);
    return () => window.removeEventListener(THEME_EVENT, load);
  }, []);
  const next: StudioTheme = theme === "light" ? "dark" : "light";
  return (
    <button type="button" onClick={() => { try { localStorage.setItem(THEME_KEY, next); } catch {} window.dispatchEvent(new Event(THEME_EVENT)); }}
      title={next === "light" ? "밝은 화면으로" : "어두운 화면으로"}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 34, borderRadius: 8, border: `1px solid ${light ? "#d1d5db" : C.line2}`, background: "transparent", color: light ? "#475569" : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
      {next === "light" ? "☀ 밝은 화면" : "🌙 어두운 화면"}
    </button>
  );
}

export const FONT = "'Pretendard', 'Malgun Gothic', system-ui, sans-serif";

/* 단색 선 아이콘 (24 칸) */
const P: Record<string, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  open: <><path d="M3 7h6l2 2h10v10H3z" /></>,
  play: <path d="M7 5l12 7-12 7z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  undo: <><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 010 10h-2" /></>,
  redo: <><path d="M15 7l5 5-5 5" /><path d="M20 12H9a5 5 0 000 10h2" /></>,
  cut: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M8 15L19 4M16 15L5 4" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V4H4v12h4" /></>,
  paste: <><rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 4V2h6v2" /></>,
  merge: <><rect x="3" y="5" width="18" height="6" rx="1" /><rect x="3" y="13" width="18" height="6" rx="1" /><path d="M12 9v6" /></>,
  split: <><rect x="3" y="5" width="7" height="14" rx="1" /><rect x="14" y="5" width="7" height="14" rx="1" /></>,
  silence: <><path d="M4 12h3l2-5 3 10 2-5h6" /><path d="M3 3l18 18" /></>,
  text: <><path d="M5 6V4h14v2M12 4v16M9 20h6" /></>,
  image: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="1.5" /><path d="M16 10l5-3v10l-5-3" /></>,
  music: <><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></>,
  voice: <><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" /></>,
  record: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" fill="currentColor" /></>,
  ratio: <><rect x="3" y="6" width="18" height="12" rx="1.5" /></>,
  save: <><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h8V3M8 21v-7h8v7" /></>,
  export: <><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 14v6h14v-6" /></>,
  folder: <path d="M3 6h6l2 2h10v11H3z" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12l5 5 9-10" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  star: <path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.2 8 13.7 4 9.8l5.5-.8z" />,
  applyAll: <><rect x="4" y="4" width="16" height="4.5" rx="1" /><rect x="4" y="10" width="16" height="4.5" rx="1" /><rect x="4" y="16" width="16" height="4" rx="1" /></>,
  applySel: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M8 12.5l2.8 2.8L16 9.5" /></>,
  alignL: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  alignC: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  alignR: <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.3-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14.5" cy="7" r="1" /></>,
  sticker: <><path d="M5 4h10l4 4v12H5z" /><path d="M15 4v4h4" /><path d="M9 14c1.2 1.4 4.8 1.4 6 0" /><path d="M9.5 10h.01M14.5 10h.01" /></>,
  pen: <><path d="M4 20h4L19 9l-4-4L4 16z" /></>,
  font: <><path d="M5 19l6-14h2l6 14M8 13h8" /></>,
  sub: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M7 15h5M14 15h3M7 11h3M12 11h5" /></>,
  fill: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 9h18M3 15h18" /></>,
  flipH: <><path d="M12 3v18" strokeDasharray="2 2" /><path d="M9 7L3 17h6z" /><path d="M15 7l6 10h-6z" /></>,
  flipV: <><path d="M3 12h18" strokeDasharray="2 2" /><path d="M7 9L17 3v6z" /><path d="M7 15l10 6v-6z" /></>,
  fitContain: <><rect x="2.5" y="4" width="19" height="16" rx="1.5" /><rect x="6.5" y="8" width="11" height="8" rx="0.5" /></>,
  fitCover: <><rect x="5" y="6.5" width="14" height="11" rx="1" /><path d="M2 4h3M2 4v3M22 4h-3M22 4v3M2 20h3M2 20v-3M22 20h-3M22 20v-3" /></>,
  fitFree: <><rect x="2.5" y="4" width="19" height="16" rx="1.5" /><rect x="12" y="6.5" width="7" height="5" rx="0.5" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  range: <><path d="M5 4v16M19 4v16" /><path d="M8 12h8M8 12l2.5-2.5M8 12l2.5 2.5M16 12l-2.5-2.5M16 12l-2.5 2.5" /></>,
  swap: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  back: <path d="M15 6l-6 6 6 6" />,
  front: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  mute: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 9l4 6M21 9l-4 6" /></>,
  volume: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 8a5 5 0 010 8" /></>,
  scene: <><path d="M4 4h16v16H4z" /><path d="M4 12h16" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 015 .5c0 2-2.5 2-2.5 4M12 17h.01" /></>,
  winMin: <><path d="M5 12h14" /></>,
  winMax: <><rect x="5" y="5" width="14" height="14" rx="1" /></>,
  winRestore: <><rect x="5" y="8" width="11" height="11" rx="1" /><path d="M8 8V5h11v11h-3" /></>,
  // 창 + 톱니 (장치 설정 열기) — 단정한 선 아이콘
  winGear: <><path d="M20 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h5.5" /><path d="M3 8.5h17" /><circle cx="17.5" cy="17.5" r="2" /><path d="M17.5 13.5v1.2M17.5 20.3v1.2M13.5 17.5h1.2M20.3 17.5h1.2M14.7 14.7l.85.85M19.45 19.45l.85.85M14.7 20.3l.85-.85M19.45 15.55l.85-.85" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>,
  file: <><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /></>,
  ai: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 15l2-6 2 6M9 13h2M15 9v6" /></>,
  screen: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></>,
  camera: <><rect x="3" y="7" width="13" height="11" rx="1.5" /><path d="M16 11l5-3v9l-5-3" /></>,
  shorts: <><rect x="7" y="3" width="10" height="18" rx="1.5" /><path d="M10 9l4 3-4 3z" /></>,
  long: <><rect x="2" y="7" width="20" height="10" rx="1.5" /></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  zoom: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M11 8v6M8 11h6" /></>,
  filter: <><path d="M4 5h16l-6 8v6l-4-2v-4z" /></>,
  transition: <><rect x="3" y="6" width="8" height="12" rx="1" /><rect x="13" y="6" width="8" height="12" rx="1" /><path d="M9 12h6" /></>,
  speed: <><path d="M5 18a8 8 0 1114 0" /><path d="M12 13l4-4" /></>,
  bg: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 19l6-6 4 4 3-3 5 5" /></>,
  template: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M9 9v11" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8M16 7l3 3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  thumb: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M7 14h6M7 10h10" /></>,
  marker: <path d="M6 3h12v18l-6-4-6 4z" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  // 타임라인·키프레임 (2026-10-20)
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  tlAlignL: <><path d="M4 3v18" /><rect x="7" y="6" width="10" height="4" rx="1" /><rect x="7" y="14" width="6" height="4" rx="1" /></>,
  tlAlignCH: <><path d="M12 3v18" /><rect x="6" y="6" width="12" height="4" rx="1" /><rect x="8" y="14" width="8" height="4" rx="1" /></>,
  tlAlignR: <><path d="M20 3v18" /><rect x="7" y="6" width="10" height="4" rx="1" /><rect x="11" y="14" width="6" height="4" rx="1" /></>,
  tlAlignT: <><path d="M3 4h18" /><rect x="6" y="7" width="4" height="10" rx="1" /><rect x="14" y="7" width="4" height="6" rx="1" /></>,
  tlAlignCV: <><path d="M3 12h18" /><rect x="6" y="6" width="4" height="12" rx="1" /><rect x="14" y="8" width="4" height="8" rx="1" /></>,
  tlAlignB: <><path d="M3 20h18" /><rect x="6" y="7" width="4" height="10" rx="1" /><rect x="14" y="11" width="4" height="6" rx="1" /></>,
  diamond: <path d="M12 4l8 8-8 8-8-8z" />,
  diamondFill: <path d="M12 4l8 8-8 8-8-8z" fill="currentColor" />,
  rotate: <><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v5h-5" /></>,
  splitHere: <><path d="M12 3v18" /><rect x="3" y="7" width="6" height="10" rx="1" /><rect x="15" y="7" width="6" height="10" rx="1" /></>,
  trimL: <><path d="M10 3v18" /><rect x="12" y="7" width="9" height="10" rx="1" /><path d="M3 9l4 3-4 3" /></>,
  trimR: <><path d="M14 3v18" /><rect x="3" y="7" width="9" height="10" rx="1" /><path d="M21 9l-4 3 4 3" /></>,
  timeline: <><rect x="3" y="5" width="18" height="4" rx="1" /><rect x="3" y="11" width="11" height="4" rx="1" /><rect x="8" y="17" width="13" height="3" rx="1" /></>,
  magnet: <><path d="M6 4v8a6 6 0 0012 0V4" /><path d="M6 8h4M14 8h4M10 4v8a2 2 0 004 0V4" /></>,
  fit: <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>,
  minus: <path d="M5 12h14" />,
  adjust: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
};

export function Icon({ name, size = 20, color = "currentColor", stroke = 1.6 }: { name: string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: "block" }}>
      {P[name] || P.info}
    </svg>
  );
}

export function Btn({ children, onClick, primary, disabled, small, title, style, danger }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; small?: boolean; title?: string; style?: React.CSSProperties; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: small ? 34 : 42, padding: small ? "0 12px" : "0 18px",
        borderRadius: 6, border: `1px solid ${primary ? C.accent : C.line2}`, background: primary ? C.accent : C.card, color: danger ? C.danger : primary ? "#fff" : C.text,
        fontSize: small ? 14 : 15, fontWeight: 700, fontFamily: FONT, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap", ...style,
      }}>
      {children}
    </button>
  );
}

/**
 * 클립 소리 — 무음 켜고 끄기 + 크기(0~200%). 한 번 끄는 동안은 되돌리기 한 번 (first)
 * 미리보기는 100%까지만 크게 들리고, 내보낸 영상에는 200%까지 들어간다
 */
export function VolumeControl({ muted, value, onMute, onVolume }: { muted: boolean; value: number; onMute: (v: boolean) => void; onVolume: (v: number, first: boolean) => void }) {
  const first = React.useRef(true);
  const pct = Math.round(value * 100);
  const silent = muted || pct === 0; // 무음이거나 0% 면 빨간 무음 표시
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: muted ? 0.4 : 1 }}>
        <Icon name={silent ? "mute" : "volume"} size={17} color={silent ? C.danger : C.text} />
        <input type="range" min={0} max={2} step={0.05} value={value} disabled={muted}
          onPointerDown={() => (first.current = true)}
          onChange={(e) => { onVolume(Number(e.target.value), first.current); first.current = false; }}
          style={{ flex: 1, accentColor: C.accent }} />
        <span style={{ width: 46, textAlign: "right", fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: silent ? C.danger : C.text }}>{muted ? "0%" : `${pct}%`}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {/* 무음 — 50% 옆, 다시 누르면 소리 켜기 */}
        <button type="button" onClick={() => onMute(!muted)} title={muted ? "무음 (다시 누르면 소리 켜기)" : "무음 (이 클립 소리 끄기)"}
          style={{ flex: 1, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, border: `1px solid ${silent ? C.danger : C.line2}`, background: silent ? "rgba(239,68,68,0.15)" : "transparent", color: silent ? C.danger : C.text, fontFamily: FONT, cursor: "pointer" }}>
          <Icon name="mute" size={16} />
        </button>
        {[0.5, 1, 1.5, 2].map((v) => (
          <button key={v} type="button" onClick={() => { if (muted) onMute(false); onVolume(v, true); }}
            style={{ flex: 1, height: 28, borderRadius: 5, border: `1px solid ${!muted && Math.abs(value - v) < 0.01 ? C.accent : C.line2}`, background: !muted && Math.abs(value - v) < 0.01 ? C.accentDim : "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
            {Math.round(v * 100)}%
          </button>
        ))}
      </div>
      {pct > 100 && !muted && <div style={{ fontSize: 12, color: C.dim }}>100%보다 크게 한 소리는 내보낸 영상에서 들려요 (미리보기는 100%까지).</div>}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!on)} aria-pressed={on}
      style={{ width: 46, height: 26, borderRadius: 13, border: 0, padding: 3, background: on ? C.accent : C.line2, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, flexShrink: 0 }}>
      <span style={{ display: "block", width: 20, height: 20, borderRadius: 10, background: "#fff", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .15s" }} />
    </button>
  );
}

/** 이 안의 Modal 은 뜨는 창 대신 그 자리를 채우는 페이지로 (동영상제작 만들기 화면, 2026-10-23). 페이지 안에서 다시 여는 창은 평소처럼 뜬다 */
export const ModalPage = React.createContext(false);

/** 가운데 뜨는 창 (뒤는 어둡게) */
/**
 * 공용 창. controls 면 오른쪽 위에 윈도우처럼 [— 작게][□ 크게][✕ 닫기].
 *  작게: 창을 숨기고 아래에 작은 막대만 (안의 내용은 그대로 살아 있다 — 카메라 미리보기 등). onMinimize 를 주면 그걸 대신 한다
 */
export function Modal({ title, onClose, children, width = 760, footer, steps, step, controls, onMinimize, minNote, win, dock }: { /** 오른쪽에 붙여 띄우기 — 뒤를 어둡게 하지 않고 뒤 화면을 그대로 누르고 끌 수 있게. right = 오른쪽에서 띄울 거리 (2026-10-25 사장님) */ dock?: { right: number; top?: number }; title?: React.ReactNode; onClose?: () => void; children: React.ReactNode; width?: number; footer?: React.ReactNode; steps?: string[]; step?: number; controls?: boolean; onMinimize?: () => void; minNote?: React.ReactNode; /** 혼자 떠 있는 창 안 — 창 전체를 채우고, 위 줄 끌기·크게는 그 윈도우 창을 */ win?: { drag: (e: React.PointerEvent<HTMLDivElement>) => void; max: () => void; big: boolean } }) {
  const [mini, setMini] = React.useState(false);
  const [big, setBig] = React.useState(false);
  // 제목 줄을 잡고 끌면 창이 옮겨진다 (뒤 화면을 보려고 — 녹화 창 등). 제목 줄은 화면 밖으로 나가지 않게
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const box = React.useRef<HTMLDivElement>(null);
  const dragIn = (e: React.PointerEvent<HTMLDivElement>) => {
    if (big || e.button !== 0 || (e.target as HTMLElement).closest("button, input, select, a")) return;
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const sx = e.clientX - pos.x;
    const sy = e.clientY - pos.y;
    const base = { left: r.left - pos.x, top: r.top - pos.y, w: r.width, h: r.height };
    // 끄는 동안에는 창 위치(transform)만 바로 바꾸고, 다 놓았을 때 한 번만 기억한다 —
    // 끌 때마다 창 안(녹화 미리보기 등)을 다시 그리면 버벅인다 (2026-10-30 사장님: 옮기려니 렉)
    let last = { x: pos.x, y: pos.y }, raf = 0;
    const move = (ev: PointerEvent) => {
      // 창 전체가 화면 안에 남게 — 아래 단추([녹화 끝내기] 등)가 화면 밖으로 사라지지 않게 (2026-10-17)
      last = {
        x: Math.min(Math.max(ev.clientX - sx, -base.left), Math.max(-base.left, window.innerWidth - base.left - base.w)),
        y: Math.min(Math.max(ev.clientY - sy, -base.top), Math.max(-base.top, window.innerHeight - base.top - base.h)),
      };
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; if (box.current) box.current.style.transform = `translate(${last.x}px, ${last.y}px)`; });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (raf) cancelAnimationFrame(raf);
      setPos(last);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    e.preventDefault();
  };
  const winBtn = (icon: string, tip: string, onClick: () => void, danger = false) => (
    <button type="button" onClick={onClick} title={tip} aria-label={tip}
      style={{ width: 40, height: 34, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? C.danger : C.line2; e.currentTarget.style.color = danger ? "#fff" : C.text; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.sub; }}>
      <Icon name={icon} size={20} />
    </button>
  );
  const drag = win ? win.drag : dragIn;
  const minimize = () => (onMinimize ? onMinimize() : setMini(true));
  const toggleBig = () => {
    if (win) return win.max();
    setBig((v) => !v);
    setPos({ x: 0, y: 0 });
  };
  const isBig = win ? win.big : big;
  const page = React.useContext(ModalPage);
  if (page && !win) {
    return (
      <div data-gsv-modal="" style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", background: C.panel, color: C.text, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: `1px solid ${C.line}`, minHeight: 56 }}>
          <div style={{ width: 150, flexShrink: 0 }}>
            {onClose && (
              <button type="button" onClick={onClose} title="내 프로젝트로" style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px 0 8px", border: `1px solid ${C.line2}`, borderRadius: 6, background: "transparent", color: C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
                <span style={{ fontSize: 16 }}>‹</span>내 프로젝트
              </button>
            )}
          </div>
          {steps ? (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <span style={{ width: 40, borderTop: `1px dashed ${C.line2}` }} />}
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: i === step ? C.text : C.dim }}>
                    <span style={{ width: 22, height: 22, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: i === step ? C.text : C.line2, color: i === step ? C.bg : C.sub }}>{i + 1}</span>
                    {s}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 800 }}>{title}</div>
          )}
          <div style={{ width: 150, flexShrink: 0 }} />
        </div>
        <ModalPage.Provider value={false}>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, background: C.bg }}>{children}</div>
          {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: `1px solid ${C.line}` }}>{footer}</div>}
        </ModalPage.Provider>
      </div>
    );
  }
  return (
    // 창(묻는 창 등)은 늘 맨 앞 — 단어 단추 막대(3000)·메뉴보다 위
    <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: win ? C.bg : mini || dock ? "transparent" : "rgba(0,0,0,0.55)", pointerEvents: mini || dock ? "none" : undefined, display: "flex", alignItems: dock?.top !== undefined ? "flex-start" : "center", justifyContent: dock ? "flex-end" : "center", paddingRight: dock ? dock.right : undefined, paddingTop: dock?.top, fontFamily: FONT }}>
      {mini && (
        // 작게 한 창 — 오른쪽 아래 작은 막대. 누르면 다시 커진다
        <div style={{ position: "fixed", right: 24, bottom: 24, pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px 12px 18px", borderRadius: 8, background: C.panel, border: `1px solid ${C.line2}`, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", color: C.text }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{title || "창"}</span>
          {minNote}
          <Btn primary onClick={() => setMini(false)}><Icon name="winRestore" size={16} />다시 열기</Btn>
          {onClose && <Btn onClick={onClose}><Icon name="close" size={16} />닫기</Btn>}
        </div>
      )}
      <div ref={box} data-gsv-modal="" style={win ? { width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: C.panel, color: C.text } : { width: big ? "calc(100vw - 24px)" : width, maxWidth: big ? undefined : "94vw", height: big ? "calc(100vh - 24px)" : undefined, maxHeight: big ? undefined : dock?.top !== undefined ? `calc(100vh - ${dock.top + 12}px)` : "92vh", display: mini ? "none" : "flex", flexDirection: "column", pointerEvents: dock ? "auto" : undefined, background: C.panel, border: `1px solid ${dock ? C.line2 : C.line}`, borderRadius: big ? 6 : 10, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", color: C.text, transform: !big && (pos.x || pos.y) ? `translate(${pos.x}px, ${pos.y}px)` : undefined }}>
        <div onPointerDown={drag} onDoubleClick={(e) => !(e.target as HTMLElement).closest("button") && (controls ? toggleBig() : setPos({ x: 0, y: 0 }))} title={isBig ? "두 번 누르면 원래 크기로" : controls ? "끌어서 창을 옮길 수 있어요 (두 번 누르면 크게)" : "끌어서 창을 옮길 수 있어요 (두 번 누르면 가운데로)"}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.line}`, cursor: isBig && win ? "default" : "move", userSelect: "none" }}>
          {steps ? (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <span style={{ width: 40, borderTop: `1px dashed ${C.line2}` }} />}
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: i === step ? C.text : C.dim }}>
                    <span style={{ width: 22, height: 22, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: i === step ? C.text : C.line2, color: i === step ? C.bg : C.sub }}>{i + 1}</span>
                    {s}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, fontSize: 19, fontWeight: 800 }}>{title}</div>
          )}
          {controls ? (
            <div style={{ display: "flex", gap: 2, margin: "-6px -10px -6px 0" }}>
              {winBtn("winMin", "작게 (아래 막대로)", minimize)}
              {winBtn(isBig ? "winRestore" : "winMax", isBig ? "원래 크기로" : "크게 (화면 가득)", toggleBig)}
              {onClose && winBtn("close", "닫기", onClose, true)}
            </div>
          ) : onClose && (
            <button type="button" onClick={onClose} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", padding: 4 }}>
              <Icon name="close" size={22} />
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</div>
        {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: `1px solid ${C.line}` }}>{footer}</div>}
      </div>
    </div>
  );
}

/** 일하는 동안 — 점 세 개 + 지금 하는 일 + 걸린 시간 + 진행 막대 */
/** 기다리는 동안 광고 (자리: export = 영상 만들기·내보내기) — 같은 광고가 이어지지 않게 바로 전 광고는 뺀다 */
type WaitAdItem = { id: number; youtube_id: string; label?: string; link_url?: string };
export function WaitAd({ place = "export" }: { place?: string }) {
  const [ad, setAd] = React.useState<WaitAdItem | null>(null);
  const [muted, setMuted] = React.useState(true);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const post = (id: number, kind: "view" | "watch" | "click", seconds = 0) => {
    try { void fetch("/api/studio/ad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, place, kind, seconds }), keepalive: true }).catch(() => {}); } catch {}
  };
  React.useEffect(() => {
    let shownAt = 0, cur: WaitAdItem | null = null, alive = true;
    const t = setTimeout(() => {
      let last = "";
      try { last = sessionStorage.getItem("gs-wait-ad-last") || ""; } catch {}
      fetch(`/api/studio/ad?place=${place}&last=${last}`, { cache: "no-store" }).then((r) => r.json()).then((j: { ad?: WaitAdItem | null }) => {
        if (!alive || !j.ad?.youtube_id) return;
        cur = j.ad; shownAt = Date.now();
        try { sessionStorage.setItem("gs-wait-ad-last", String(j.ad.id)); } catch {}
        setAd(j.ad);
        post(j.ad.id, "view");
      }).catch(() => {});
    }, 4000);
    return () => { alive = false; clearTimeout(t); if (cur) post(cur.id, "watch", (Date.now() - shownAt) / 1000); };
  }, [place]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ad) return null;
  const yid = encodeURIComponent(ad.youtube_id);
  const open = () => { if (ad.link_url) { post(ad.id, "click"); window.open(ad.link_url, "_blank"); } };
  const toggle = () => {
    const m = !muted;
    setMuted(m);
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: m ? "mute" : "unMute", args: [] }), "*");
  };
  return (
    <div style={{ width: 600, maxWidth: "80%", margin: "22px auto 0" }}>
      <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#000", borderRadius: 8, overflow: "hidden" }}>
        <iframe ref={frame} title="광고" allow="autoplay; encrypted-media" style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          src={`https://www.youtube-nocookie.com/embed/${yid}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${yid}&enablejsapi=1&origin=${encodeURIComponent(typeof location !== "undefined" ? location.origin : "")}`} />
        {ad.link_url && <div onClick={open} title="광고주 사이트 열기 (새 창)" style={{ position: "absolute", inset: 0, cursor: "pointer" }} />}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, color: C.dim }}>{ad.label || "AD"}</span>
        <button type="button" onClick={toggle} style={{ height: 28, padding: "0 12px", borderRadius: 6, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{muted ? "🔇 소리 켜기" : "🔊 소리 끄기"}</button>
        {ad.link_url && <button type="button" onClick={open} style={{ height: 28, padding: "0 12px", borderRadius: 6, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>광고주 사이트 열기 ↗</button>}
      </div>
    </div>
  );
}

export function Working({ title, detail, frac, ad = true }: { title: string; detail?: string; frac?: number | null; /** 기다림 광고 (4초 넘게 걸리면) */ ad?: boolean }) {
  const [sec, setSec] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: C.text }}>
      <style>{`@keyframes gsvDot{0%,60%,100%{opacity:.3}30%{opacity:1}}`}</style>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 5, background: C.text, animation: `gsvDot 1.2s ${i * 0.18}s infinite` }} />)}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
      {typeof frac === "number" && (
        <div style={{ width: 360, maxWidth: "80%", margin: "16px auto 0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.line }}>
            <div style={{ width: `${Math.round(frac * 100)}%`, height: "100%", borderRadius: 3, background: C.accent, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right" }}>{Math.round(frac * 100)}%</span>
        </div>
      )}
      {detail && <div style={{ marginTop: 12, fontSize: 15, color: C.sub }}>{detail}</div>}
      <div style={{ marginTop: 8, fontSize: 14, color: C.dim }}>잠시만 기다려 주세요 · {Math.floor(sec / 60) ? `${Math.floor(sec / 60)}분 ` : ""}{sec % 60}초</div>
      {ad && <WaitAd place="export" />}
    </div>
  );
}

/** 화면마다 다음에 할 일 한 줄 (어르신도 쉽게) */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 14.5, color: C.sub, lineHeight: 1.5 }}>
      <Icon name="info" size={18} color={C.sub} />
      <span>{children}</span>
    </div>
  );
}

export const label: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: C.text };
export const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 42, padding: "0 12px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.field, color: C.text, fontSize: 15, fontFamily: FONT, outline: "none" };
