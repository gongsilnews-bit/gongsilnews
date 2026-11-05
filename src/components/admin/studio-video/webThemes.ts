/**
 * 쇼츠릴스studio 디자인 테마 (2026-11-05 사장님: "디자인 테마도 선택 · 고르면 자막부터 음악 스타일까지 · 자신의 테마도 3개")
 *  테마 하나 = 메인자막 모양 + 첫 장면 제목 상자 + 마지막 사무소 상자 + 배경음악
 *  내 테마 3칸은 이 브라우저(localStorage)에 저장
 */
import type { SubLook } from "./SubPresets";
import type { SubtitleSettings } from "./types";
import { captureKit, type ThemeKit } from "./webThemeKit";
import { getShortsThemes } from "@/app/actions/shortsThemes";

export type ShortsTheme = {
  id: string;
  name: string;
  /** 메인자막 — 모양·크기·자리·움직임 */
  sub: Partial<SubLook> & Partial<SubtitleSettings>;
  /** 첫 장면 동네·종류 상자 */
  title: { font?: string; color: string; boxColor: string };
  /** 마지막 사무소 이름 상자 */
  office: { font?: string; color: string; boxColor: string };
  music: string; // public 주소
  musicName: string;
  /** 어울리는 성우 (el_… — 공실뉴스 일레븐랩스 순위 성우). 없으면 목록 첫 성우 */
  voice: string;
  /** 내가 고친 테마인지 (내 테마 칸) */
  mine?: boolean;
  /** 그래픽·전환·드론 자리·표시광고·제목 움직임 (webThemeKit) */
  kit?: ThemeKit;
};
const T = (type: string, a = 0.3) => ({ type, a, b: a });
const G = (at: number, text: string, style: string, color: string | undefined, layer: Record<string, unknown>) => ({ at, n: 9, stk: { style, text, ...(color ? { color } : {}) }, layer: { x: 0.5, y: 0.4, w: 0.5, opacity: 1, ...layer } });

export const SHORTS_MUSIC: { url: string; name: string }[] = [
  // 공실뉴스 로열티뮤직 — 기본 테마 음악 (2026-11-05 사장님)
  { url: "/reels-assets/bgm/lib/rm-018.mp3", name: "A Modern and Upbeat" },
  { url: "/reels-assets/bgm/lib/rm-015.mp3", name: "Sunny Room" },
  { url: "/reels-assets/bgm/lib/rm-001.mp3", name: "고요한 햇살 속으로" },
  { url: "/reels-assets/bgm/lib/rm-022.mp3", name: "Happiness Apart Piano" },
  { url: "/reels-assets/bgm/lib/rm-007.mp3", name: "Dream City Love" },
  { url: "/reels-assets/bgm/upbeat.mp3", name: "경쾌하게" },
  { url: "/reels-assets/bgm/calm.mp3", name: "잔잔하게" },
  { url: "/reels-assets/bgm/lib/funk-beat.mp3", name: "펑키 비트" },
  { url: "/reels-assets/bgm/lib/film-guitar.mp3", name: "어쿠스틱 기타" },
  { url: "/reels-assets/bgm/lib/cute-happy.mp3", name: "귀엽고 밝게" },
  { url: "/reels-assets/bgm/lib/corporate.mp3", name: "깔끔한 기업" },
  { url: "/reels-assets/bgm/lib/evening-sunset.mp3", name: "저녁 노을" },
  { url: "/reels-assets/bgm/lib/chill-vibe.mp3", name: "칠 바이브" },
  { url: "/reels-assets/bgm/lib/good-vibe.mp3", name: "굿 바이브" },
  { url: "/reels-assets/bgm/lib/reveal.mp3", name: "공개하듯" },
];
const M = (url: string) => ({ music: url, musicName: SHORTS_MUSIC.find((m) => m.url === url)?.name || "" });

export const SHORTS_THEMES: ShortsTheme[] = [
  {
    id: "navy", name: "깔끔 남색",
    sub: { font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 4, bg: false, bold: true, shadow: 0, glow: "", anim: { in: "fade" } },
    title: { font: "Pretendard", color: "#FFFFFF", boxColor: "#1E2A4A" },
    office: { font: "Pretendard", color: "#FFFFFF", boxColor: "#E8890C" },
    ...M("/reels-assets/bgm/lib/rm-018.mp3"),
    voice: "el_PDoCXqBQFGsvfO0hNkEs",
    kit: {
      titleStyle: { pos: "top", size: 90, bold: true, box: true, boxOpacity: 0.9, anim: { in: "drop" } },
      graphics: [G(0, "꼭 보세요", "marker", undefined, { y: 0.4, anim: { in: "pop", emph: "pulse" } }), G(4, "완전 추천!", "neon", undefined, { y: 0.36, anim: { in: "zoom" } })],
      trans: [T("fade"), T("zoomin")],
      drone: [1],
      legal: { label: "네이비 클래식", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "impact", name: "노랑 임팩트",
    sub: { font: "Black Han Sans", color: "#FFE14D", outline: "#111111", outlineWidth: 7, bg: false, bold: true, shadow: 0, glow: "", anim: { in: "pop" } },
    title: { font: "Black Han Sans", color: "#111111", boxColor: "#FFD400" },
    office: { font: "Black Han Sans", color: "#FFE14D", boxColor: "#111111" },
    ...M("/reels-assets/bgm/lib/rm-015.mp3"),
    voice: "el_1W00IGEmNmwmsDeYy7ag",
    kit: {
      titleStyle: { pos: "top", size: 100, bold: true, box: true, boxOpacity: 1, anim: { in: "pop", emph: "bounce" } },
      graphics: [G(0, "대박!", "burst", "#FF7A00", { y: 0.38, w: 0.42, anim: { in: "pop", emph: "shake" } }), G(4, "놓치면 후회!", "ribbon", "#E60012", { y: 0.36, w: 0.6, anim: { in: "slideL" } })],
      trans: [T("zoomin", 0.25), T("slideleft", 0.25)],
      drone: [1],
      legal: { label: "명함형", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "premium", name: "고급 블랙·골드",
    sub: { font: "NanumMyeongjo", color: "#FFFFFF", outline: "#000000", outlineWidth: 1, bg: false, bold: true, shadow: 0.07, shadowColor: "#000000", glow: "", anim: { in: "fade", dur: 0.6 } },
    title: { font: "NanumMyeongjo", color: "#E9C77B", boxColor: "#111111" },
    office: { font: "NanumMyeongjo", color: "#111111", boxColor: "#D4AF37" },
    ...M("/reels-assets/bgm/lib/rm-001.mp3"),
    voice: "el_K3qo7ugXmpT87FDhLBbN",
    kit: {
      titleStyle: { pos: "top", size: 84, box: true, boxOpacity: 0.85, anim: { in: "fade", dur: 0.8 } },
      graphics: [G(0, "완전 추천!", "neon", "#D4AF37", { y: 0.4, w: 0.48, anim: { in: "fade", dur: 0.8 } })],
      trans: [T("fadeblack", 0.5)],
      drone: [1],
      legal: { label: "골드 프리미엄", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "fresh", name: "상큼 민트",
    sub: { font: "Jua", color: "#FFFFFF", bg: true, bgColor: "#0CA678", bgOpacity: 0.95, outlineWidth: 0, bold: true, shadow: 0, glow: "", anim: { in: "jelly" } },
    title: { font: "Jua", color: "#FFFFFF", boxColor: "#0CA678" },
    office: { font: "Jua", color: "#0B4F3C", boxColor: "#FFFFFF" },
    ...M("/reels-assets/bgm/lib/rm-022.mp3"),
    voice: "el_KlstlYt9VVf3zgie2Oht",
    kit: {
      titleStyle: { pos: "top", size: 92, bold: true, box: true, boxOpacity: 0.95, anim: { in: "jelly" } },
      graphics: [G(0, "여기 보세요!", "bubble", undefined, { y: 0.38, w: 0.5, anim: { in: "pop", emph: "float" } }), G(4, "강추!", "burst", "#FF3EA5", { y: 0.36, w: 0.4, anim: { in: "jelly" } })],
      trans: [T("circleopen"), T("slideup")],
      drone: [1],
      legal: { label: "그린 신뢰", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "news", name: "뉴스 속보",
    sub: { font: "GmarketSans", color: "#FFFFFF", bg: true, bgColor: "#111827", bgOpacity: 0.9, outlineWidth: 0, bold: true, shadow: 0, glow: "", anim: { in: "slideL" } },
    title: { font: "GmarketSans", color: "#FFFFFF", boxColor: "#E03131" },
    office: { font: "GmarketSans", color: "#FFFFFF", boxColor: "#1C3D8F" },
    ...M("/reels-assets/bgm/lib/rm-007.mp3"),
    voice: "el_uyVNoMrnUku1dZyVEXwD",
    kit: {
      titleStyle: { pos: "top", size: 88, bold: true, box: true, boxOpacity: 1, anim: { in: "slideL" } },
      graphics: [G(0, "오늘의 매물", "slant", "#FFD400", { y: 0.36, w: 0.5, anim: { in: "slideL" } }), G(4, "현장 직접 다녀옴", "slant", "#1E9BF0", { y: 0.36, w: 0.56, anim: { in: "slideR" } })],
      trans: [T("wiperight"), T("coverleft")],
      drone: [1],
      legal: { label: "블루 그라데이션", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
];

/* ── 기본 테마 5칸 — 최고관리자가 편집한 영상으로 바꾼 것(서버)이 있으면 그것 (2026-11-05) ── */
let baseCache: Promise<ShortsTheme[]> | null = null;
export function loadBaseThemes(fresh = false): Promise<ShortsTheme[]> {
  if (!baseCache || fresh)
    baseCache = getShortsThemes()
      .then((r) => SHORTS_THEMES.map((t, i) => {
        const o = r.slots[i] as ShortsTheme | null;
        return o ? { ...t, ...o, id: t.id, name: t.name, mine: false } : t;
      }))
      .catch(() => SHORTS_THEMES);
  return baseCache;
}

/* ── 내 테마 3칸 (이 브라우저) ── */
const KEY = "gs-shorts-my-themes.v1";
export const MY_THEME_SLOTS = 3;
export function loadMyThemes(): (ShortsTheme | null)[] {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.from({ length: MY_THEME_SLOTS }, (_, i) => (a[i] && a[i].id ? (a[i] as ShortsTheme) : null));
  } catch {
    return Array.from({ length: MY_THEME_SLOTS }, () => null);
  }
}
export function saveMyThemes(list: (ShortsTheme | null)[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MY_THEME_SLOTS))); } catch {}
}
const LAST = "gs-shorts-theme.v1";
export const lastThemeId = () => { try { return localStorage.getItem(LAST) || "navy"; } catch { return "navy"; } };
export const rememberTheme = (id: string) => { try { localStorage.setItem(LAST, id); } catch {} };

/** 편집한 프로젝트 → 테마 (2026-11-05 사장님: "내가 영상 편집을 하고 테마로 저장하면 테마로 저장되는 거야")
 *  메인자막 모양 · 첫 장면 제목 글(위쪽 상자) · 사무소 이름 글 · 배경음악 · 성우 */
export function themeFromProject(p: { settings: { subtitle: Record<string, unknown>; voice?: { id?: string } }; layers?: Array<Record<string, any>> }, base: ShortsTheme = SHORTS_THEMES[0]): ShortsTheme {
  // 자막 — 모양·크기·자리·줄 수·움직임까지 그대로 (켜고 끄기만 빼고)
  const sub: Record<string, unknown> = JSON.parse(JSON.stringify(p.settings.subtitle || {}));
  delete sub.on;
  const layers = p.layers || [];
  const texts = layers.filter((l) => l.type === "text" && !l.off);
  const title = texts.find((l) => l.name === "동네·종류") || texts.find((l) => l.pos === "top");
  const office = texts.find((l) => l.name === "사무소") || texts.find((l) => l.pos === "middle");
  const music = layers.find((l) => l.type === "music" && !l.off);
  const url = String(music?.url || music?.file || "");
  const known = SHORTS_MUSIC.find((m) => m.url === url);
  const box = (l: Record<string, any> | undefined, d: ShortsTheme["title"]) => (l ? { font: l.font || d.font, color: l.color || d.color, boxColor: l.boxColor || d.boxColor } : d);
  return {
    id: "", name: "", mine: true,
    sub: sub as Partial<SubLook>,
    title: box(title, base.title),
    office: box(office, base.office),
    music: url.startsWith("/") ? url : known?.url || "",
    musicName: known?.name || (url ? String(music?.name || "내 음악") : ""),
    voice: String(p.settings.voice?.id || base.voice),
    kit: captureKit(p as never).kit,
  };
}
export function saveMyThemeAt(i: number, t: ShortsTheme) {
  const list = loadMyThemes();
  const saved = { ...t, id: `my${i + 1}-${Date.now().toString(36)}`, name: `내 테마 ${i + 1}`, mine: true };
  list[i] = saved;
  saveMyThemes(list);
  rememberTheme(saved.id);
  return saved;
}
