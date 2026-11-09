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
// 전환 — 요즘 쇼츠처럼 짧게 + 휙 소리 (2026-11-05 사장님: "앗! 너무 좋다 할 만큼 요즘 트렌드에 맞게")
const T = (type: string, a = 0.25, sfx = "whoosh-short") => ({ type, a, b: a, sfx });
/** 요즘 쇼츠 자막 — 화면 가운데 아래 한 줄, 크게, 말하는 단어만 색·크게 */
const TREND = { position: "middle-low" as const, size: 118, maxLines: 1 as const, length: "long" as const };
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
    sub: { font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 5, bg: false, bold: true, shadow: 0, glow: "", ...TREND, anim: undefined }, // 기본형 — 메인자막 애니메이션 없음 (앞 설정의 애니메이션도 지우게 undefined) (2026-11-09 사장님: 너무 복잡해서)
    title: { font: "Pretendard", color: "#FFFFFF", boxColor: "#1E2A4A" },
    office: { font: "Pretendard", color: "#FFFFFF", boxColor: "#E8890C" },
    ...M("/reels-assets/bgm/lib/rm-018.mp3"),
    voice: "el_uyVNoMrnUku1dZyVEXwD", // 애나 김 (2026-11-05 사장님: "테마1번 성우는 애나김")
    kit: {
      titleStyle: { pos: "top", size: 90, bold: true, box: true, boxOpacity: 0.9, anim: { in: "drop" } },
      // 2026-11-08 사장님: 첫 클립 "추천합니다"(노랑 말딱지) · 6번째 클립 "실화?!"(하늘색 굵은 글자) — 11클립 기준 자리
      graphics: [
        { ...G(0, "추천합니다", "slant", "#FFD400", { y: 0.33, w: 0.46 }), n: 11 },
        { ...G(5, "실화?!", "block", "#22D3EE", { y: 0.4, w: 0.52 }), n: 11 },
      ],
      // 가격 장면 상호·전화 — 상자 없이 노랑 굵은 글자 + 검은 테두리 (2026-11-08 사장님)
      priceStyle: { box: false, color: "#FFD400", font: "GmarketSans", bold: true, outline: "#111111", outlineWidth: 5, shadow: 0.05, shadowColor: "#000000" },
      trans: [T("fade"), T("zoomin")],
      drone: [1],
      legal: { label: "네이비 클래식", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "impact", name: "노랑 임팩트",
    sub: { font: "Black Han Sans", color: "#FFFFFF", outline: "#111111", outlineWidth: 7, bg: false, bold: true, shadow: 0, glow: "", ...TREND, anim: { in: "pop", wshow: "word", whl: "both", wcolor: "#FFE14D" } },
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
    sub: { font: "NanumMyeongjo", color: "#FFFFFF", outline: "#000000", outlineWidth: 2, bg: false, bold: true, shadow: 0.07, shadowColor: "#000000", glow: "", ...TREND, anim: { in: "fade", dur: 0.4, wshow: "word", whl: "both", wcolor: "#E9C77B" } },
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
    sub: { font: "Jua", color: "#FFFFFF", bg: false, outline: "#0B4F3C", outlineWidth: 6, bold: true, shadow: 0, glow: "", ...TREND, anim: { in: "jelly", wshow: "word", whl: "both", wcolor: "#7CFFB2" } },
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
    // 자막·연락처는 배경색 없이 흰 글씨 + 테두리·그림자, 제목·훅만 빨간 상자, 끝은 명함형 (2026-11-07 사장님: "디자인을 이렇게 바꿔줘 · 배경색이 없는 거야")
    sub: { font: "GmarketSans", color: "#FFFFFF", outline: "#000000", outlineWidth: 4, bg: false, bold: true, shadow: 0.05, shadowColor: "#000000", glow: "", ...TREND, anim: { in: "slideL", wshow: "word", whl: "both", wcolor: "#FF5A5A" } },
    title: { font: "GmarketSans", color: "#FFFFFF", boxColor: "#E03131" },
    office: { font: "GmarketSans", color: "#FFFFFF", boxColor: "#1C3D8F" },
    ...M("/reels-assets/bgm/lib/rm-007.mp3"),
    voice: "el_uyVNoMrnUku1dZyVEXwD",
    kit: {
      titleStyle: { pos: "top", size: 88, bold: true, box: true, boxOpacity: 1, anim: { in: "slideL" } },
      contactStyle: { box: false, color: "#FFFFFF", outline: "#000000", outlineWidth: 3, shadow: 0.05, shadowColor: "#000000" },
      priceStyle: { box: false, color: "#FFFFFF", outline: "#000000", outlineWidth: 4, shadow: 0.05, shadowColor: "#000000" },
      graphics: [G(0, "오늘의 매물", "slant", "#FFD400", { y: 0.36, w: 0.5, anim: { in: "slideL" } }), G(4, "현장 직접 다녀옴", "slant", "#1E9BF0", { y: 0.36, w: 0.56, anim: { in: "slideR" } })],
      trans: [T("wiperight"), T("coverleft")],
      drone: [1],
      legal: { label: "명함형", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  /* ── 단지소개 5개 — 2026-11-07 사장님: 테마마다 브랜드 배경 고정 · 1 래미안 · 2 자이 · 3 푸르지오 · 4 힐스테이트 · 5 롯데캐슬 (공실 이름에 브랜드가 없어도 카드 그대로)
   *  (2026-11-06 사장님: "단지 소개 테마 만들어줘", "단지소개 그래픽 배경을 사용해도 좋을 것 같은데")
   *  모두 아파트 그래픽 배경 — 단지 이름으로 브랜드(래미안·자이·힐스테이트…)를 알아내 그 색·로고로, 모르는 브랜드면 쇼츠배경
   *  자막은 배경 아래 띠(중하단)에 · 그래픽 문구에 숫자·사실 주장 없음 */
  {
    id: "cx_ivory", name: "래미안",
    // 래미안 진한 청록 배경 위 — 흰 글씨 (흰 바탕용 진한 글씨였던 것, 2026-11-07)
    sub: { font: "Pretendard", color: "#FFFFFF", outline: "#0C3438", outlineWidth: 4, bg: false, bold: true, shadow: 0.05, shadowColor: "#000000", glow: "", ...TREND, size: 100, anim: { in: "fade", dur: 0.4, wshow: "word", whl: "color", wcolor: "#9ED9D3" } },
    title: { font: "Pretendard", color: "#FFFFFF", boxColor: "#1D6A6A" },
    office: { font: "Pretendard", color: "#FFFFFF", boxColor: "#0C3438" },
    ...M("/reels-assets/bgm/lib/corporate.mp3"),
    voice: "el_K3qo7ugXmpT87FDhLBbN",
    kit: {
      apt: { brand: "raemian", mode: "dark", fb: "cream", span: "all", tag: "PREMIUM" } /* 흰 아파트 배경 뺌 (2026-11-07) */,
      hookStyle: { y: 0.5, boxColor: "#1D6A6A", color: "#FFFFFF", font: "Pretendard" },
      contactStyle: { box: false, color: "#FFFFFF", outline: "#0C3438", outlineWidth: 3, shadow: 0.05, shadowColor: "#000000" }, // 상호 뒤 배경색 없음 · 글꼴 Pretendard (2026-11-07 사장님)
      trans: [T("slideleft", 0.3, "swish")],
      drone: [1],
      legal: { label: "골드 프리미엄", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "cx_news", name: "자이",
    // 글자 뒤 배경색 모두 없앰 — 흰 글씨 + 자이 진한 파랑 테두리·그림자 (2026-11-07 사장님: "자이에서 글자색 배경색 없애줘")
    sub: { font: "Pretendard", color: "#FFFFFF", outline: "#062A38", outlineWidth: 4, bg: false, bold: true, shadow: 0.05, shadowColor: "#000000", glow: "", ...TREND, size: 96, anim: { in: "slideL", wshow: "word", whl: "color", wcolor: "#8FD6EA" } },
    title: { font: "Pretendard", color: "#FFFFFF", boxColor: "#C62828" },
    office: { font: "Pretendard", color: "#FFFFFF", boxColor: "#0B1F4D" },
    ...M("/reels-assets/bgm/lib/good-vibe.mp3"),
    voice: "el_uyVNoMrnUku1dZyVEXwD",
    kit: {
      apt: { brand: "xi", mode: "dark", fb: "tech", span: "all", tag: "단지 뉴스" },
      hookStyle: { y: 0.5, box: false, color: "#FFFFFF", outline: "#062A38", outlineWidth: 5, shadow: 0.05, shadowColor: "#000000" },
      contactStyle: { box: false, color: "#FFFFFF", outline: "#062A38", outlineWidth: 3, shadow: 0.05, shadowColor: "#000000" },
      priceStyle: { box: false, color: "#FFFFFF", outline: "#062A38", outlineWidth: 4, shadow: 0.05, shadowColor: "#000000" },
      trans: [T("wiperight", 0.25), T("coverleft", 0.25)],
      drone: [1],
      legal: { label: "블루 그라데이션", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "cx_green", name: "푸르지오",
    sub: { font: "Pretendard", color: "#FFFFFF", outline: "#0F3D24", outlineWidth: 6, bg: false, bold: true, shadow: 0, glow: "", ...TREND, anim: { in: "pop", wshow: "word", whl: "both", wcolor: "#C6F36B" } },
    title: { font: "Pretendard", color: "#FFFFFF", boxColor: "#1D6A44" },
    office: { font: "Pretendard", color: "#FFFFFF", boxColor: "#1D6A44" },
    ...M("/reels-assets/bgm/lib/film-guitar.mp3"),
    voice: "el_KlstlYt9VVf3zgie2Oht",
    kit: {
      apt: { brand: "prugio", mode: "dark", fb: "green", span: "first", tag: "LIFE" } /* 흰 아파트 배경 뺌 (2026-11-07) */,
      // 글자 뒤 배경색 모두 없앰 — 흰 글씨 + 푸르지오 진한 초록 테두리·그림자 (2026-11-07 사장님: "푸르지오에서 글자색 없애줘")
      titleStyle: { pos: "top", size: 86, bold: true, box: false, outline: "#0F3D24", outlineWidth: 4, shadow: 0.05, shadowColor: "#000000", anim: { in: "drop" } },
      hookStyle: { y: 0.5, box: false, color: "#FFFFFF", outline: "#0F3D24", outlineWidth: 5, shadow: 0.05, shadowColor: "#000000" },
      contactStyle: { box: false, color: "#FFFFFF", outline: "#0F3D24", outlineWidth: 3, shadow: 0.05, shadowColor: "#000000" },
      priceStyle: { box: false, color: "#FFFFFF", outline: "#0F3D24", outlineWidth: 4, shadow: 0.05, shadowColor: "#000000" },
      graphics: [G(2, "동네 한 바퀴", "bubble", undefined, { y: 0.38, w: 0.5, anim: { in: "pop", emph: "float" } })],
      trans: [T("zoomin", 0.3), T("fade", 0.35, "")],
      drone: [1],
      legal: { label: "그린 신뢰", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "cx_sig", name: "힐스테이트",
    sub: { font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 4, bg: false, bold: true, shadow: 0.05, shadowColor: "#000000", glow: "", ...TREND, size: 104, anim: { in: "fade", dur: 0.35, wshow: "word", whl: "color", wcolor: "#E9C77B" } },
    title: { font: "Pretendard", color: "#FFFFFF", boxColor: "#14213D" },
    office: { font: "Pretendard", color: "#FFFFFF", boxColor: "#14213D" },
    ...M("/reels-assets/bgm/lib/rm-001.mp3"),
    voice: "el_uyVNoMrnUku1dZyVEXwD",
    kit: {
      apt: { brand: "hillstate", mode: "dark", fb: "navy", span: "all", tag: "NEWS" },
      // 글자 뒤 배경색 모두 없앰 — 흰 글씨 + 힐스테이트 진한 빨강 테두리·그림자 (2026-11-07 사장님: "글자뒤 배경색 없애줘")
      hookStyle: { y: 0.5, box: false, color: "#FFFFFF", outline: "#4A060E", outlineWidth: 5, shadow: 0.05, shadowColor: "#000000" },
      contactStyle: { box: false, color: "#FFFFFF", outline: "#4A060E", outlineWidth: 3, shadow: 0.05, shadowColor: "#000000" },
      priceStyle: { box: false, color: "#FFFFFF", outline: "#4A060E", outlineWidth: 4, shadow: 0.05, shadowColor: "#000000" },
      trans: [T("fade", 0.45, "")],
      drone: [1],
      legal: { label: "네이비 클래식", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
  {
    id: "cx_night", name: "롯데캐슬",
    sub: { font: "GmarketSans", color: "#FFFFFF", outline: "#141210", outlineWidth: 6, bg: false, bold: true, shadow: 0, glow: "", ...TREND, anim: { in: "zoom", wshow: "word", whl: "both", wcolor: "#C9A46A" } },
    title: { font: "GmarketSans", color: "#FFFFFF", boxColor: "#2A241D" },
    office: { font: "GmarketSans", color: "#FFFFFF", boxColor: "#2A241D" },
    ...M("/reels-assets/bgm/lib/chill-vibe.mp3"),
    voice: "el_1W00IGEmNmwmsDeYy7ag",
    kit: {
      apt: { brand: "lottecastle", mode: "dark", fb: "purple", span: "first", tag: "NEWS" },
      // 글자 뒤 배경색 모두 없앰 — 흰·금색 글씨 + 롯데캐슬 진한 갈색 테두리·그림자 (2026-11-07 사장님: "폰트 배경색 없애줘")
      titleStyle: { pos: "top", size: 88, bold: true, box: false, outline: "#141210", outlineWidth: 4, shadow: 0.05, shadowColor: "#000000", anim: { in: "slideL" } },
      hookStyle: { y: 0.5, box: false, color: "#E2C891", outline: "#141210", outlineWidth: 5, shadow: 0.05, shadowColor: "#000000" },
      contactStyle: { box: false, color: "#FFFFFF", outline: "#141210", outlineWidth: 3, shadow: 0.05, shadowColor: "#000000" },
      priceStyle: { box: false, color: "#FFFFFF", outline: "#141210", outlineWidth: 4, shadow: 0.05, shadowColor: "#000000" },
      graphics: [G(2, "단지 둘러보기", "neon", "#C9A46A", { y: 0.36, w: 0.56, anim: { in: "zoom" } })],
      trans: [T("slideup", 0.25), T("flash", 0.2)],
      drone: [1],
      legal: { label: "다크 글래스 네온", layer: { x: 0.5, y: 0.5, w: 0.86, opacity: 1 } },
    },
  },
];

/* ── 기본 테마 칸 — 최고관리자가 편집한 영상으로 바꾼 것(서버)이 있으면 그것 (2026-11-05) ── */
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
/** 저장한 꾸러미 + 기본 테마의 배경 성격 (단지소개는 브랜드 찾기, 뉴스칼럼은 늘 쇼츠배경) — 2026-11-06 */
function withBase(kit: ThemeKit, base: ShortsTheme): ThemeKit {
  const b = base.kit?.apt;
  if (kit.apt && b) kit.apt = { ...kit.apt, news: b.news, ...(b.news ? {} : { fb: b.fb, brand: kit.apt.brand || b.brand }) };
  return kit;
}
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
    kit: withBase(captureKit(p as never).kit, base),
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
