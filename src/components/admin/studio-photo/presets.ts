// 이미지 편집 — 새 문서 크기 (포토샵 [새로운 문서] 처럼). 처음 화면 · 새로 만들기 창이 같이 쓴다
import type { PsdGuide } from "./model";

export type Preset = { name: string; w: number; h: number; ppi?: number; note?: string; guides?: PsdGuide[] };
/* 부동산에 필요한 종류 — 유튜브 · 블로그 · SNS · 부동산마케팅 (회의 2026-10-19). 인쇄는 300ppi, 큰 인쇄물은 150·100ppi (앱이 다룰 수 있는 크기)
   ※ 공식 크기를 확인하지 못한 것(카카오톡 채널)은 넣지 않았다 — 확인되면 더한다 */
const v = (location: number): PsdGuide => ({ location, direction: "vertical" });
const hz = (location: number): PsdGuide => ({ location, direction: "horizontal" });
export const PRESETS: { id: string; label: string; icon: string; desc: string; items: Preset[] }[] = [
  { id: "youtube", label: "유튜브", icon: "video", desc: "썸네일 · 쇼츠 표지 · 채널 배너 · 로고", items: [
    { name: "유튜브 썸네일", w: 1280, h: 720, note: "영상 목록에 보이는 그림" },
    { name: "쇼츠 표지", w: 1080, h: 1920, note: "세로 9:16" },
    // 안내선 (2026-10-30 사장님: 영역별로) — 세로 352·2208 태블릿 · 507·2053 모바일(글자·로고 안전 칸) · 1280 가운데 / 가로 508.5·931.5 PC·모바일 띠 · 720 가운데. TV 는 그림 전체
    { name: "채널 배너 (아트)", w: 2560, h: 1440, note: "로고·글자는 가운데 1546×423 안에 · 안내선: 태블릿·모바일·PC 띠·가운데", guides: [v(352), v(2208), v(507), v(2053), v(1280), hz(508.5), hz(931.5), hz(720)] },
    { name: "채널 로고 (프로필)", w: 800, h: 800, note: "동그랗게 잘려 보여요" },
    { name: "영상 끝 화면", w: 1920, h: 1080, note: "다음 영상·구독 안내" },
  ] },
  { id: "blog", label: "블로그", icon: "pen", desc: "대표 이미지 · 타이틀 · 로고 · 스킨", items: [
    { name: "대표 이미지 (정사각)", w: 1080, h: 1080, note: "모바일 목록 1:1" },
    { name: "블로그 타이틀", w: 966, h: 300, note: "블로그 맨 위 이름 그림 (가로 966)" },
    { name: "블로그 로고 (프로필)", w: 500, h: 500, note: "프로필 사진 자리" },
    { name: "블로그 스킨", w: 1920, h: 1080, note: "가운데 글 영역은 비워 두세요" },
  ] },
  { id: "sns", label: "SNS", icon: "phone", desc: "인스타 카드뉴스 · 피드 · 스토리 · 링크 공유", items: [
    { name: "인스타 카드뉴스", w: 1080, h: 1350, note: "여러 장을 한 묶음으로" },
    { name: "인스타 피드 정사각", w: 1080, h: 1080 },
    { name: "스토리 · 릴스", w: 1080, h: 1920 },
    { name: "링크 공유 이미지", w: 1200, h: 630, note: "페이스북·카카오톡 링크 미리보기" },
    { name: "스레드", w: 1080, h: 1350 },
  ] },
  { id: "realty", label: "부동산마케팅", icon: "image", desc: "명함 · X배너 · 유리창 홍보지 · 전단 · 현수막", items: [
    // 명함은 하나로 (2026-10-30 사장님) · 인쇄소(성원애드피아) 규격 — 작업 92×52mm(사방 1mm 여유) · 재단 90×50mm.
    // 안내선: 재단선(1mm) · 안전선(재단선 안쪽 2mm, 글자·로고는 이 안에) · 가운데
    { name: "부동산 명함", w: 1087, h: 614, ppi: 300, note: "작업 92×52mm · 재단 90×50mm (안내선)",
      guides: [v(11.8), v(1075.2), hz(11.8), hz(602.2), v(35.4), v(1051.6), hz(35.4), hz(578.6), v(543.5), hz(307)] },
    { name: "X배너", w: 3543, h: 10630, ppi: 150, note: "600 × 1800 mm" },
    { name: "유리창 홍보지 A4", w: 2480, h: 3508, ppi: 300, note: "210 × 297 mm" },
    { name: "전단지 A4", w: 2480, h: 3508, ppi: 300, note: "210 × 297 mm" },
    { name: "현수막", w: 19685, h: 3543, ppi: 100, note: "5000 × 900 mm" },
  ] },
  { id: "basic", label: "기본", icon: "file", desc: "웹 화면 · A4 · A3", items: [
    { name: "웹 큰 화면", w: 1920, h: 1080 }, { name: "웹 HD", w: 1280, h: 720 },
    { name: "A4", w: 2480, h: 3508, ppi: 300, note: "210 × 297 mm" }, { name: "A3", w: 3508, h: 4961, ppi: 300, note: "297 × 420 mm" },
  ] },
];
/** 처음 화면에서 고른 종류 · 크기 (새로 만들기 창의 탭 · 크기) */
export type NewInit = { tab?: string; preset?: Preset };
const RECENT_KEY = "gsp-new-recent";
export const readRecentSizes = (): Preset[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
};
/** 빈 문서로 만든 크기 — [최근 사용] 탭 맨 앞에 (8개까지) */
export const saveRecentSize = (p: Preset) => {
  try {
    const r = [p, ...readRecentSizes().filter((x) => !(x.w === p.w && x.h === p.h))].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(r));
  } catch {}
};

/** 이 크기에 정해진 안내선 (채널 배너 등) — 템플릿·AI로 만든 문서에도 같이 넣는다 */
export const guidesForSize = (w: number, h: number): PsdGuide[] =>
  PRESETS.flatMap((g) => g.items).find((p) => p.guides?.length && p.w === w && p.h === h)?.guides?.map((x) => ({ ...x })) || [];
