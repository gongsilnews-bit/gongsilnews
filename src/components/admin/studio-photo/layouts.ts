// 이미지 편집 — AI 자동 디자인의 레이아웃 틀 · 레이어 조립 · 디자인 템플릿 레이어로 나누기
// 원칙 (docs/2026-10-22_photo_ai_layout_plan.md):
//  - 위치는 AI 가 아니라 틀이 정한다. AI 는 제목·부제·딱지 문구와 배경 장면만
//  - 가격·면적·주소·중개사는 공실 자료 그대로 (없으면 그 칸을 만들지 않는다 — 가짜 데이터 금지)
//  - 결과는 레이어 묶음. 칸마다 _slot 이름표 → 다른 공실을 넣으면 그 칸만 바뀐다
import type { TextLook } from "@/components/admin/studio-video/SubPresets";
import { tplSplit, tplTextWidth } from "@/components/admin/studio-video/Templates";
import { applyLook, boundsOf, composite, kids, mk, offsetLayer, renderText, scaled, uid, walk, type Doc, type PLayer } from "./model";
import { pictoCanvas, pictoOf } from "./pictos";
import qrcode from "qrcode-generator";

export type Slot = "bg" | "shade" | "panel" | "card" | "badge" | "title" | "sub" | "price" | "area" | "address" | "agency" | "label" | "source" | "aimark"
  | "office" | "ceo" | "phone" | "officeAddr" | "regNum";
export const SLOT_NAME: Record<Slot, string> = {
  bg: "배경 사진", shade: "어둡게 깔기", panel: "판", card: "카드", badge: "키워드", title: "제목", sub: "부제", price: "가격", area: "면적",
  address: "주소", agency: "중개사무소", label: "머리표", source: "출처", aimark: "AI 보정 표시",
  office: "상호", ceo: "대표", phone: "전화", officeAddr: "사무소 주소", regNum: "등록번호",
};
/** 레이어 칸으로 고를 수 있는 것 (내 템플릿 만들 때) */
export const SLOT_PICK: Slot[] = ["bg", "title", "sub", "badge", "price", "area", "address", "agency", "source", "office", "ceo", "phone", "officeAddr", "regNum"];
export type Content = { title?: string; sub?: string; badge?: string; price?: string; area?: string; address?: string; agency?: string; source?: string; label?: string;
  office?: string; ceo?: string; phone?: string; officeAddr?: string; regNum?: string;
  /** 명함 QR 에 넣을 홈페이지 주소 ("QR" = 템플릿 자리 표시) · SNS 줄 ("blog|blog.naver.com/abc" 줄마다) */
  homepage?: string; sns?: string };
/** 종류 — 처음 화면 · AI 자동 디자인의 분류와 같다 */
export type Cat = "youtube" | "blog" | "sns" | "realty" | "basic";
export const CAT_NAME: Record<Cat, string> = { youtube: "유튜브", blog: "블로그", sns: "SNS", realty: "부동산마케팅", basic: "기본" };
export type CatSize = { name: string; w: number; h: number; ppi?: number };
/** 종류마다 디자인할 크기 (처음 화면 [만들기] 목록과 같은 값) */
export const CAT_SIZES: Record<Cat, CatSize[]> = {
  youtube: [{ name: "유튜브 썸네일", w: 1280, h: 720 }, { name: "쇼츠 표지", w: 1080, h: 1920 }, { name: "채널 배너 (아트)", w: 2560, h: 1440 }, { name: "채널 로고 (프로필)", w: 800, h: 800 }, { name: "영상 끝 화면", w: 1920, h: 1080 }],
  // 블로그는 정사각 대표 이미지 + 타이틀 · 로고 · 스킨 (2026-10-30 사장님)
  blog: [{ name: "대표 이미지 (정사각)", w: 1080, h: 1080 }, { name: "블로그 타이틀", w: 966, h: 300 }, { name: "블로그 로고 (프로필)", w: 500, h: 500 }, { name: "블로그 스킨", w: 1920, h: 1080 }],
  sns: [{ name: "인스타 피드 정사각", w: 1080, h: 1080 }, { name: "인스타 카드뉴스", w: 1080, h: 1350 }, { name: "스토리 · 릴스", w: 1080, h: 1920 }, { name: "링크 공유 이미지", w: 1200, h: 630 }],
  realty: [
    { name: "전단지 A4", w: 2480, h: 3508, ppi: 300 }, { name: "유리창 홍보지 A4", w: 2480, h: 3508, ppi: 300 },
    { name: "X배너", w: 3543, h: 10630, ppi: 150 }, { name: "현수막", w: 19685, h: 3543, ppi: 100 }, { name: "부동산 명함", w: 1087, h: 614, ppi: 300 },
  ],
  basic: [{ name: "웹 큰 화면", w: 1920, h: 1080 }, { name: "웹 HD", w: 1280, h: 720 }, { name: "A4", w: 2480, h: 3508, ppi: 300 }, { name: "A3", w: 3508, h: 4961, ppi: 300 }],
};
/** icon = 글 앞에 붙는 픽토그램 (pictos.ts id) */
/** oneLine = 두 줄로 나누지 않고 글자를 줄여 한 줄에 (2026-10-30 사장님) */
type TextSlot = { slot: Exclude<Slot, "bg" | "shade" | "panel" | "card">; x: number; y: number; w: number; size: number; align: "left" | "center" | "right"; vc?: boolean; look: TextLook; icon?: string; oneLine?: boolean };
type BoxSlot = { slot: "shade" | "panel" | "card"; x: number; y: number; w: number; h: number; color: string; alpha: number; grad?: "down" | "up" | "left" | "right"; radius?: number };
/** cats = 어느 종류의 샘플로 보일지 · sizes = 맞는 크기 이름 (인쇄물처럼 크기가 정해진 틀) · kind "agency" = 공실·기사 없이 중개사무소 정보로 (명함) */
/** picts = 로고처럼 놓는 픽토그램 (x·y 가운데, size 짧은 변 비율) — 명함 등 (2026-10-30) */
type PictSlot = { id: string; x: number; y: number; size: number; color: string };
/** qr = 홈페이지 QR (x·y 가운데, size 짧은 변 비율, color 점 색) · sns = SNS 아이콘+주소 한 줄 (최대 3개) */
type QrSlot = { x: number; y: number; size: number; color: string };
type SnsSlot = { x: number; y: number; w: number; size: number; color: string; align: "left" | "center" | "right" };
export type Layout = { id: string; name: string; aspect: ("wide" | "square" | "tall")[]; kind: ("vacancy" | "article" | "agency")[]; cats: Cat[]; sizes?: string[]; bg: { x: number; y: number; w: number; h: number }; boxes: BoxSlot[]; texts: TextSlot[]; picts?: PictSlot[]; qr?: QrSlot; sns?: SnsSlot;
  /** 앞뒤 세트 — 이 틀(앞면)을 고르면 back 틀(뒷면) 문서도 함께 만든다 (2026-10-30 사장님) */
  back?: string };

const W1 = "#FFFFFF", Y = "#FFD400", INK = "#111111";
/** 인쇄 틀이 맞는 크기 이름 (처음 화면 · 새로운 문서의 크기 이름과 같다) */
// 유리창 홍보지는 홍보지 자동 생성기와 같은 전용 디자인만 (2026-10-30 사장님) — 전단·A4 샘플을 섞지 않는다
const PRINT = ["A4", "A3", "전단지 A4"];
const WINDOW = "유리창 홍보지 A4";
const TEAL = "#00788C", TEAL_LIGHT = "#7FE3EC";
const GOLD = "#B39A6B", NAVY2 = "#1F2240", GREEN2 = "#0E3B36";
// 명함은 "부동산 명함" 하나로 (2026-10-30 사장님) — 예전 이름으로 저장한 크기도 같은 샘플이 보이게 남긴다
const BIZ = ["부동산 명함", "일반 명함", "고급 명함 (양면)"];
/** 전용 샘플만 보이는 크기 — 비율이 썸네일과 같아도 쓰임이 달라 썸네일 샘플을 섞지 않는다 (2026-10-30 사장님) */
const CH_BANNER = "채널 배너 (아트)", END_SCREEN = "영상 끝 화면", SHORTS = "쇼츠 표지", CH_LOGO = "채널 로고 (프로필)";
const BLOG_TITLE = "블로그 타이틀", BLOG_LOGO = "블로그 로고 (프로필)", BLOG_SKIN = "블로그 스킨";
const ONLY_OWN = [CH_BANNER, END_SCREEN, SHORTS, CH_LOGO, BLOG_TITLE, BLOG_LOGO, BLOG_SKIN, WINDOW, "부동산 명함"]; // 명함엔 썸네일로 저장한 내 템플릿이 섞이지 않게
/** 전용 크기인가 — 내 템플릿도 비율이 아니라 같은 크기로 저장한 것만 보인다 (썸네일 템플릿이 채널 배너에 섞이지 않게) */
export const isOwnSize = (name?: string) => Boolean(name && ONLY_OWN.includes(name));
const shadow: TextLook = { shadow: 0.06, shadowColor: "#000000", shadowAlpha: 0.45 };
/** 유리창 홍보지 아래 연락 띠 — 전화 크게 · 상호 · 대표·등록번호 (생성기의 연락 띠와 같게) */
const CALL_BAND: TextSlot[] = [
  { slot: "phone", x: 0.06, y: 0.865, w: 0.66, size: 0.042, align: "left", vc: true, oneLine: true, look: { color: W1, font: "Black Han Sans" }, icon: "phone" },
  { slot: "office", x: 0.06, y: 0.915, w: 0.66, size: 0.018, align: "left", vc: true, oneLine: true, look: { color: W1 } },
  { slot: "ceo", x: 0.06, y: 0.945, w: 0.66, size: 0.012, align: "left", vc: true, oneLine: true, look: { color: "#CBD5E1", bold: false } },
  { slot: "regNum", x: 0.06, y: 0.97, w: 0.66, size: 0.011, align: "left", vc: true, oneLine: true, look: { color: "#94A3B8", bold: false } },
];
export const LAYOUTS: Layout[] = [
  {
    id: "band", name: "매물 — 아래 띠", aspect: ["wide", "square"], kind: ["vacancy"], cats: ["basic", "youtube", "blog", "sns"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.42, w: 1, h: 0.58, color: "#000000", alpha: 0.82, grad: "down" }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.07, w: 0.4, size: 0.05, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1, bgPad: 1.1 } },
      { slot: "agency", x: 0.95, y: 0.07, w: 0.45, size: 0.032, align: "right", look: { bg: true, bgColor: "#000000", bgOpacity: 0.55, color: W1, bold: false } },
      { slot: "title", x: 0.05, y: 0.51, w: 0.9, size: 0.1, align: "left", look: { color: W1, ...shadow } },
      { slot: "sub", x: 0.05, y: 0.655, w: 0.9, size: 0.045, align: "left", look: { color: "#E5E7EB", bold: false } },
      { slot: "price", x: 0.05, y: 0.75, w: 0.6, size: 0.062, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "area", x: 0.05, y: 0.905, w: 0.5, size: 0.035, align: "left", look: { color: W1, bold: false }, icon: "area" },
      { slot: "address", x: 0.95, y: 0.905, w: 0.5, size: 0.035, align: "right", look: { color: W1, bold: false }, icon: "pin" },
    ],
  },
  {
    id: "leftpanel", name: "매물 — 왼쪽 판", aspect: ["wide"], kind: ["vacancy"], cats: ["basic", "youtube", "blog", "sns"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 0.46, h: 1, color: "#0F1F3D", alpha: 0.9 }],
    texts: [
      { slot: "badge", x: 0.04, y: 0.1, w: 0.38, size: 0.045, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.04, y: 0.24, w: 0.38, size: 0.085, align: "left", look: { color: W1 } },
      { slot: "sub", x: 0.04, y: 0.42, w: 0.38, size: 0.04, align: "left", look: { color: "#CBD5E1", bold: false } },
      { slot: "price", x: 0.04, y: 0.56, w: 0.38, size: 0.07, align: "left", look: { color: Y }, icon: "won" },
      { slot: "area", x: 0.04, y: 0.68, w: 0.38, size: 0.042, align: "left", look: { color: W1, bold: false }, icon: "area" },
      { slot: "address", x: 0.04, y: 0.77, w: 0.38, size: 0.036, align: "left", look: { color: "#CBD5E1", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.04, y: 0.9, w: 0.38, size: 0.032, align: "left", look: { color: W1, bold: false }, icon: "phone" },
    ],
  },
  {
    id: "bigtitle", name: "유튜브 — 큰 제목", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.35 }],
    texts: [
      { slot: "badge", x: 0.04, y: 0.07, w: 0.4, size: 0.065, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.42, w: 0.92, size: 0.15, align: "center", vc: true, look: { color: "#FFE600", outline: "#000000", outlineWidth: 9, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.64, w: 0.9, size: 0.06, align: "center", vc: true, look: { color: W1, outline: "#000000", outlineWidth: 6 } },
      { slot: "price", x: 0.96, y: 0.84, w: 0.5, size: 0.065, align: "right", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "agency", x: 0.04, y: 0.9, w: 0.5, size: 0.032, align: "left", look: { color: W1, bold: false, ...shadow }, icon: "phone" },
    ],
  },
  {
    id: "center", name: "블로그 — 가운데 제목", aspect: ["wide", "square"], kind: ["vacancy", "article"], cats: ["basic", "blog", "youtube", "sns"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.45 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.24, w: 0.5, size: 0.045, align: "center", vc: true, look: { bg: true, bgColor: W1, bgOpacity: 1, color: INK } },
      { slot: "label", x: 0.5, y: 0.24, w: 0.5, size: 0.045, align: "center", vc: true, look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.46, w: 0.86, size: 0.1, align: "center", vc: true, look: { color: W1, ...shadow } },
      { slot: "sub", x: 0.5, y: 0.62, w: 0.8, size: 0.045, align: "center", vc: true, look: { color: "#E5E7EB", bold: false } },
      { slot: "price", x: 0.5, y: 0.76, w: 0.6, size: 0.055, align: "center", vc: true, look: { color: Y } },
      { slot: "source", x: 0.5, y: 0.9, w: 0.8, size: 0.03, align: "center", vc: true, look: { color: "#D1D5DB", bold: false } },
      { slot: "agency", x: 0.5, y: 0.9, w: 0.8, size: 0.03, align: "center", vc: true, look: { color: "#D1D5DB", bold: false } },
    ],
  },
  {
    id: "card", name: "SNS — 사진 + 흰 카드", aspect: ["square", "tall"], kind: ["vacancy"], cats: ["sns", "blog", "youtube"], bg: { x: 0, y: 0, w: 1, h: 0.62 },
    boxes: [{ slot: "card", x: 0, y: 0.6, w: 1, h: 0.4, color: "#FFFFFF", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.05, w: 0.5, size: 0.045, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.06, y: 0.645, w: 0.88, size: 0.068, align: "left", look: { color: INK } },
      { slot: "sub", x: 0.06, y: 0.74, w: 0.88, size: 0.036, align: "left", look: { color: "#4B5563", bold: false } },
      { slot: "price", x: 0.06, y: 0.81, w: 0.6, size: 0.058, align: "left", look: { color: "#E11D48" } },
      { slot: "area", x: 0.94, y: 0.825, w: 0.4, size: 0.034, align: "right", look: { color: "#374151", bold: false }, icon: "area" },
      { slot: "address", x: 0.06, y: 0.905, w: 0.6, size: 0.03, align: "left", look: { color: "#6B7280", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.94, y: 0.905, w: 0.4, size: 0.03, align: "right", look: { color: "#6B7280", bold: false }, icon: "phone" },
    ],
  },
  {
    id: "news", name: "뉴스 카드", aspect: ["square", "wide", "tall"], kind: ["article"], cats: ["basic", "sns", "blog", "youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.35, w: 1, h: 0.65, color: "#000000", alpha: 0.85, grad: "down" }],
    texts: [
      { slot: "label", x: 0.06, y: 0.06, w: 0.4, size: 0.042, align: "left", look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.06, y: 0.6, w: 0.88, size: 0.075, align: "left", look: { color: W1, ...shadow } },
      { slot: "sub", x: 0.06, y: 0.78, w: 0.88, size: 0.036, align: "left", look: { color: "#E5E7EB", bold: false } },
      { slot: "source", x: 0.06, y: 0.92, w: 0.88, size: 0.028, align: "left", look: { color: "#9CA3AF", bold: false } },
    ],
  },
  {
    id: "story", name: "세로 — 위 제목 · 아래 가격", aspect: ["tall"], kind: ["vacancy", "article"], cats: ["sns", "youtube", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "shade", x: 0, y: 0, w: 1, h: 0.36, color: "#000000", alpha: 0.75, grad: "up" },
      { slot: "shade", x: 0, y: 0.6, w: 1, h: 0.4, color: "#000000", alpha: 0.8, grad: "down" },
    ],
    texts: [
      { slot: "badge", x: 0.5, y: 0.06, w: 0.6, size: 0.03, align: "center", vc: true, look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.5, y: 0.06, w: 0.6, size: 0.03, align: "center", vc: true, look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.15, w: 0.9, size: 0.06, align: "center", vc: true, look: { color: W1, ...shadow } },
      { slot: "sub", x: 0.5, y: 0.24, w: 0.88, size: 0.03, align: "center", vc: true, look: { color: "#E5E7EB", bold: false } },
      { slot: "price", x: 0.5, y: 0.78, w: 0.8, size: 0.05, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "area", x: 0.5, y: 0.85, w: 0.8, size: 0.028, align: "center", vc: true, look: { color: W1, bold: false }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.895, w: 0.88, size: 0.026, align: "center", vc: true, look: { color: "#E5E7EB", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.94, w: 0.88, size: 0.024, align: "center", vc: true, look: { color: "#D1D5DB", bold: false }, icon: "phone" },
      { slot: "source", x: 0.5, y: 0.94, w: 0.88, size: 0.024, align: "center", vc: true, look: { color: "#D1D5DB", bold: false } },
    ],
  },
  /* ── 유튜브 썸네일 — 여러 스타일 (2026-10-22 사장님: 다양한 썸네일 샘플) ── */
  {
    id: "yt_split", name: "유튜브 — 좌우 나눔 (노란 판)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0.42, y: 0, w: 0.58, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 0.44, h: 1, color: "#FFD400", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.04, y: 0.08, w: 0.36, size: 0.055, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.04, y: 0.08, w: 0.36, size: 0.05, align: "left", look: { bg: true, bgColor: "#111111", bgOpacity: 1, color: Y } },
      { slot: "title", x: 0.04, y: 0.24, w: 0.37, size: 0.12, align: "left", oneLine: true, look: { color: INK, font: "Black Han Sans" } }, // 한 줄로 (2026-10-30 사장님)
      { slot: "sub", x: 0.04, y: 0.55, w: 0.37, size: 0.045, align: "left", look: { color: "#1F2937", bold: false } },
      { slot: "price", x: 0.04, y: 0.7, w: 0.37, size: 0.065, align: "left", look: { bg: true, bgColor: INK, bgOpacity: 1, color: Y } },
      { slot: "agency", x: 0.04, y: 0.9, w: 0.37, size: 0.03, align: "left", look: { color: INK, bold: false }, icon: "phone" },
      { slot: "source", x: 0.04, y: 0.9, w: 0.37, size: 0.03, align: "left", look: { color: INK, bold: false } },
    ],
  },
  {
    id: "yt_band", name: "유튜브 — 아래 큰 띠", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0.66, w: 1, h: 0.34, color: "#E11D48", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.04, y: 0.07, w: 0.4, size: 0.06, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "label", x: 0.04, y: 0.07, w: 0.4, size: 0.055, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "price", x: 0.96, y: 0.07, w: 0.5, size: 0.065, align: "right", look: { bg: true, bgColor: INK, bgOpacity: 0.85, color: Y } },
      { slot: "title", x: 0.5, y: 0.8, w: 0.94, size: 0.13, align: "center", vc: true, look: { color: W1, font: "Do Hyeon", outline: "#7F1D1D", outlineWidth: 4 } },
      { slot: "sub", x: 0.5, y: 0.6, w: 0.9, size: 0.05, align: "center", vc: true, look: { font: "Do Hyeon", color: W1, outline: "#000000", outlineWidth: 6 } },
    ],
  },
  {
    id: "yt_top", name: "유튜브 — 위 띠 (뉴스)", aspect: ["wide"], kind: ["article", "vacancy"], cats: ["basic", "youtube", "sns"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.17, color: "#0B1220", alpha: 0.92 },
      { slot: "shade", x: 0, y: 0.45, w: 1, h: 0.55, color: "#000000", alpha: 0.85, grad: "down" },
    ],
    texts: [
      // 키워드·머리표 — 작은 흰 상자에 검은 글씨로 깔끔하게 (2026-10-30 사장님: 촌스럽다 → 흰색으로 깔끔하게)
      { slot: "label", x: 0.03, y: 0.085, w: 0.4, size: 0.04, align: "left", vc: true, look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: "#111111", font: "Pretendard", bold: true, bgPad: 0.8 } },
      { slot: "badge", x: 0.03, y: 0.085, w: 0.4, size: 0.04, align: "left", vc: true, look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: "#111111", font: "Pretendard", bold: true, bgPad: 0.8 } },
      { slot: "source", x: 0.97, y: 0.085, w: 0.5, size: 0.035, align: "right", vc: true, look: { color: "#CBD5E1", bold: false } },
      { slot: "agency", x: 0.97, y: 0.085, w: 0.5, size: 0.035, align: "right", vc: true, look: { color: "#CBD5E1", bold: false }, icon: "phone" },
      { slot: "title", x: 0.5, y: 0.5, w: 0.92, size: 0.12, align: "center", vc: true, look: { color: Y, font: "Song Myung", outline: "#000000", outlineWidth: 6 } }, // 화면 한가운데 (2026-10-30 사장님: 가운데 정렬 · 중간에)
      { slot: "sub", x: 0.5, y: 0.66, w: 0.8, size: 0.05, align: "center", look: { font: "Song Myung", color: W1 } }, // 제목 아래 가운데 (2026-10-30 사장님)
      { slot: "price", x: 0.96, y: 0.82, w: 0.4, size: 0.055, align: "right", look: { color: Y }, icon: "won" },
    ],
  },
  {
    id: "yt_frame", name: "유튜브 — 노란 테두리 액자", aspect: ["wide", "square"], kind: ["vacancy", "article"], cats: ["youtube", "sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.035, color: "#FFD400", alpha: 1 },
      { slot: "panel", x: 0, y: 0.965, w: 1, h: 0.035, color: "#FFD400", alpha: 1 },
      { slot: "panel", x: 0, y: 0, w: 0.02, h: 1, color: "#FFD400", alpha: 1 },
      { slot: "panel", x: 0.98, y: 0, w: 0.02, h: 1, color: "#FFD400", alpha: 1 },
      { slot: "shade", x: 0, y: 0.5, w: 1, h: 0.5, color: "#000000", alpha: 0.8, grad: "down" },
    ],
    texts: [
      { slot: "badge", x: 0.05, y: 0.08, w: 0.4, size: 0.06, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.05, y: 0.08, w: 0.4, size: 0.055, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.7, w: 0.9, size: 0.12, align: "center", vc: true, look: { color: W1, font: "Jua", outline: "#000000", outlineWidth: 6 } },
      { slot: "sub", x: 0.5, y: 0.86, w: 0.86, size: 0.05, align: "center", vc: true, look: { font: "Jua", color: Y } },
      { slot: "price", x: 0.95, y: 0.08, w: 0.45, size: 0.06, align: "right", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
    ],
  },
  {
    id: "yt_price", name: "유튜브 — 가격 크게", aspect: ["wide"], kind: ["vacancy"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 0.7, h: 1, color: "#000000", alpha: 0.75, grad: "left" }],
    texts: [
      { slot: "badge", x: 0.04, y: 0.08, w: 0.4, size: 0.06, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.04, y: 0.26, w: 0.6, size: 0.085, align: "left", look: { color: W1, ...shadow } },
      { slot: "price", x: 0.04, y: 0.44, w: 0.62, size: 0.16, align: "left", look: { color: Y, font: "Black Han Sans", outline: "#000000", outlineWidth: 6 } },
      { slot: "area", x: 0.04, y: 0.72, w: 0.6, size: 0.045, align: "left", look: { color: W1, bold: false }, icon: "area" },
      { slot: "address", x: 0.04, y: 0.8, w: 0.6, size: 0.04, align: "left", look: { color: "#E5E7EB", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.04, y: 0.9, w: 0.6, size: 0.032, align: "left", look: { color: "#D1D5DB", bold: false }, icon: "phone" },
    ],
  },
  /* 건축·리뷰 채널 썸네일 — 왼쪽 위 큰 명조 영문/단어 · 흰 메모 딱지 · 아래 어두운 상자 두 줄 (2026-10-22 사장님) */
  {
    id: "yt_review_0", name: "유튜브 — 아래 상자 두 줄", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0.3, y: 0, w: 0.7, h: 1, color: "#000000", alpha: 0.55, grad: "right" }],
    texts: [
      { slot: "label", x: 0.04, y: 0.06, w: 0.6, size: 0.14, align: "left", look: { color: "#F5F1E8", font: "NanumMyeongjo", italic: true, outline: "#1F2937", outlineWidth: 1, ...shadow } },
      { slot: "agency", x: 0.96, y: 0.06, w: 0.4, size: 0.032, align: "right", look: { color: W1, bold: false, ...shadow } },
      // 글 묶음은 오른쪽 · 세로 가운데쯤으로 올려서 (2026-10-30 사장님: 우측 가운데 정렬 · 전체적으로 올려)
      { slot: "badge", x: 0.96, y: 0.22, w: 0.4, size: 0.045, align: "right", look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: "#111111" } },
      { slot: "title", x: 0.96, y: 0.32, w: 0.62, size: 0.082, align: "right", look: { bg: true, bgColor: "#1F2937", bgOpacity: 0.88, color: "#FFE14D", font: "Do Hyeon" } },
      { slot: "sub", x: 0.96, y: 0.48, w: 0.62, size: 0.06, align: "right", look: { bg: true, bgColor: "#1F2937", bgOpacity: 0.9, color: "#FFFFFF", font: "Do Hyeon" } }, // 부제는 제목보다 작게 (2026-10-30 사장님)
    ],
  },
  /* 자막뉴스형 썸네일 — 왼쪽 위 "자막뉴스" 글씨 + 흰 상자 출처 · 오른쪽 위 채널 · 아래 가운데 흰 자막 (2026-10-22 사장님) */
  {
    id: "yt_subnews", name: "유튜브 — 자막뉴스", aspect: ["wide"], kind: ["article", "vacancy"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.6, w: 1, h: 0.4, color: "#000000", alpha: 0.55, grad: "down" }],
    texts: [
      { slot: "label", x: 0.05, y: 0.08, w: 0.4, size: 0.065, align: "left", look: { color: W1, font: "Black Han Sans", ...shadow } },
      { slot: "badge", x: 0.05, y: 0.08, w: 0.4, size: 0.065, align: "left", look: { color: W1, font: "Black Han Sans", ...shadow } },
      { slot: "source", x: 0.05, y: 0.2, w: 0.5, size: 0.035, align: "left", look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: "#0B1F4D" } },
      { slot: "agency", x: 0.95, y: 0.08, w: 0.35, size: 0.045, align: "right", look: { color: W1, font: "Black Han Sans", ...shadow } },
      { slot: "title", x: 0.5, y: 0.8, w: 0.92, size: 0.08, align: "center", vc: true, look: { font: "NanumGothic", color: W1, outline: "#000000", outlineWidth: 2, ...shadow } },
    ],
  },
  /* 강연·인물 썸네일 — 왼쪽 어둡게 · 큰 흰 글씨 + 마지막 줄 강조색 · 이름 딱지 (2026-10-22 사장님) */
  {
    id: "yt_speaker_1", name: "유튜브 — 인물 왼쪽 글", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.92, grad: "left" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.06, w: 0.4, size: 0.05, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "label", x: 0.03, y: 0.06, w: 0.4, size: 0.05, align: "left", look: { color: W1, font: "Black Han Sans" } },
      // 부제는 작게 제목 바로 위에 (2026-10-30 사장님) — 부제를 먼저 놓아, 길어지면 제목이 밀려 내려간다
      { slot: "sub", x: 0.04, y: 0.25, w: 0.62, size: 0.06, align: "left", look: { color: "#FFD400", font: "Pretendard" } },
      { slot: "title", x: 0.04, y: 0.36, w: 0.6, size: 0.11, align: "left", look: { color: W1, font: "Pretendard" } },
      { slot: "badge", x: 0.04, y: 0.75, w: 0.5, size: 0.045, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
    ],
  },
  /* 조회수형 썸네일 — 가운데 아래 큰 두 줄 (첫 줄 흰색 · 둘째 줄 형광 초록/노랑) · 위 빨간 따옴표 한마디 · 왼쪽 위 [이름] (2026-10-22 사장님) */
  /* 교양·토크 방송 썸네일 — 아래 왼쪽 큰 흰 글씨 두 줄(둘째 줄 강조색) · 오른쪽 위 색 딱지 · 왼쪽 위 채널 (2026-10-22 사장님) */
  {
    id: "yt_talk_0", name: "유튜브 — 토크 두 줄", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.38, w: 1, h: 0.62, color: "#000000", alpha: 0.82, grad: "down" }],
    texts: [
      // 제목·부제를 조금 위로 — 부제가 아래 끝에 붙지 않게 (2026-10-30 사장님)
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.034, align: "left", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#10B981", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#10B981", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.04, y: 0.52, w: 0.9, size: 0.095, align: "left", look: { color: W1, font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
      { slot: "sub", x: 0.04, y: 0.69, w: 0.9, size: 0.095, align: "left", look: { color: "#4ADE80", font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
    ],
  },
  {
    id: "yt_card", name: "유튜브 — 흰 말풍선 카드", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["basic", "youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "card", x: 0.05, y: 0.56, w: 0.9, h: 0.36, color: "#FFFFFF", alpha: 0.96, radius: 28 }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.08, w: 0.4, size: 0.06, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "label", x: 0.05, y: 0.08, w: 0.4, size: 0.055, align: "left", look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "price", x: 0.95, y: 0.08, w: 0.45, size: 0.06, align: "right", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.69, w: 0.84, size: 0.1, align: "center", vc: true, look: { color: INK, font: "Gowun Dodum" } },
      { slot: "sub", x: 0.5, y: 0.84, w: 0.84, size: 0.045, align: "center", vc: true, look: { font: "Gowun Dodum", color: "#4B5563", bold: false } },
    ],
  },
  /* ── 블로그 ── */
  {
    id: "blog_clean", name: "블로그 — 흰 판 깔끔", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["basic", "blog", "sns"], bg: { x: 0.45, y: 0, w: 0.55, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 0.47, h: 1, color: "#FFFFFF", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.1, w: 0.38, size: 0.045, align: "left", look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.05, y: 0.1, w: 0.38, size: 0.045, align: "left", look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.05, y: 0.24, w: 0.38, size: 0.085, align: "left", look: { color: INK } },
      { slot: "sub", x: 0.05, y: 0.44, w: 0.38, size: 0.04, align: "left", look: { color: "#6B7280", bold: false } },
      { slot: "price", x: 0.05, y: 0.58, w: 0.38, size: 0.06, align: "left", look: { color: "#E11D48" }, icon: "won" },
      { slot: "area", x: 0.05, y: 0.7, w: 0.38, size: 0.036, align: "left", look: { color: "#374151", bold: false }, icon: "area" },
      { slot: "address", x: 0.05, y: 0.78, w: 0.38, size: 0.034, align: "left", look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.05, y: 0.9, w: 0.38, size: 0.03, align: "left", look: { color: "#6B7280", bold: false }, icon: "phone" },
      { slot: "source", x: 0.05, y: 0.9, w: 0.38, size: 0.03, align: "left", look: { color: "#6B7280", bold: false } },
    ],
  },
  {
    id: "blog_box", name: "블로그 — 가운데 흰 상자", aspect: ["square", "wide"], kind: ["vacancy", "article"], cats: ["blog", "sns", "youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.3 }, { slot: "card", x: 0.1, y: 0.3, w: 0.8, h: 0.42, color: "#FFFFFF", alpha: 0.95, radius: 24 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.37, w: 0.6, size: 0.04, align: "center", vc: true, look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.5, y: 0.37, w: 0.6, size: 0.04, align: "center", vc: true, look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.5, w: 0.72, size: 0.075, align: "center", vc: true, look: { color: INK } },
      { slot: "sub", x: 0.5, y: 0.62, w: 0.72, size: 0.036, align: "center", vc: true, look: { color: "#4B5563", bold: false } },
      { slot: "agency", x: 0.5, y: 0.9, w: 0.8, size: 0.03, align: "center", vc: true, look: { color: W1, bold: false, ...shadow }, icon: "phone" },
      { slot: "source", x: 0.5, y: 0.9, w: 0.8, size: 0.03, align: "center", vc: true, look: { color: W1, bold: false, ...shadow } },
    ],
  },
  /* ── SNS ── */
  {
    id: "sns_top", name: "SNS — 위 흰 띠 제목", aspect: ["square", "tall"], kind: ["vacancy", "article"], cats: ["sns", "youtube", "blog"], bg: { x: 0, y: 0.24, w: 1, h: 0.76 },
    boxes: [{ slot: "card", x: 0, y: 0, w: 1, h: 0.24, color: "#FFFFFF", alpha: 1 }],
    texts: [
      { slot: "label", x: 0.06, y: 0.045, w: 0.5, size: 0.032, align: "left", look: { color: "#2563EB" } },
      { slot: "badge", x: 0.06, y: 0.045, w: 0.5, size: 0.032, align: "left", look: { color: "#E11D48" } },
      { slot: "title", x: 0.06, y: 0.1, w: 0.88, size: 0.065, align: "left", look: { color: INK } },
      { slot: "price", x: 0.06, y: 0.84, w: 0.6, size: 0.055, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "address", x: 0.94, y: 0.92, w: 0.5, size: 0.03, align: "right", look: { color: W1, bold: false, ...shadow }, icon: "pin" },
      { slot: "source", x: 0.94, y: 0.92, w: 0.5, size: 0.03, align: "right", look: { color: W1, bold: false, ...shadow } },
    ],
  },
  {
    id: "sns_cover", name: "SNS — 카드뉴스 표지", aspect: ["tall", "square"], kind: ["vacancy", "article"], cats: ["sns", "youtube", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.5 }],
    texts: [
      { slot: "label", x: 0.07, y: 0.07, w: 0.5, size: 0.04, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "badge", x: 0.07, y: 0.07, w: 0.5, size: 0.04, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.07, y: 0.36, w: 0.86, size: 0.1, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "sub", x: 0.07, y: 0.6, w: 0.86, size: 0.04, align: "left", look: { color: "#E5E7EB", bold: false } },
      { slot: "agency", x: 0.07, y: 0.9, w: 0.86, size: 0.03, align: "left", look: { color: "#D1D5DB", bold: false }, icon: "phone" },
      { slot: "source", x: 0.07, y: 0.9, w: 0.86, size: 0.03, align: "left", look: { color: "#D1D5DB", bold: false } },
    ],
  },
  /* ── 부동산마케팅 (인쇄물) ── */
  {
    id: "flyer_a", name: "전단지 — 사진 + 정보", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: ["A4", "A3", "전단지 A4"], bg: { x: 0, y: 0.11, w: 1, h: 0.49 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 0.11, color: "#0F1F3D", alpha: 1 }, { slot: "card", x: 0, y: 0.6, w: 1, h: 0.4, color: "#FFFFFF", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.055, w: 0.45, size: 0.04, align: "left", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "agency", x: 0.95, y: 0.055, w: 0.5, size: 0.03, align: "right", vc: true, look: { color: W1, bold: false }, icon: "phone" },
      { slot: "title", x: 0.06, y: 0.63, w: 0.88, size: 0.075, align: "left", look: { color: INK } },
      { slot: "sub", x: 0.06, y: 0.72, w: 0.88, size: 0.035, align: "left", look: { color: "#4B5563", bold: false } },
      { slot: "price", x: 0.06, y: 0.78, w: 0.88, size: 0.07, align: "left", look: { color: "#E11D48" }, icon: "won" },
      { slot: "area", x: 0.06, y: 0.88, w: 0.88, size: 0.035, align: "left", look: { color: "#374151", bold: false }, icon: "area" },
      { slot: "address", x: 0.06, y: 0.93, w: 0.88, size: 0.032, align: "left", look: { color: "#374151", bold: false }, icon: "pin" },
    ],
  },
  {
    id: "flyer_b", name: "전단지 — 큰 제목형", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: ["A4", "A3", "전단지 A4"], bg: { x: 0, y: 0.26, w: 1, h: 0.46 },
    boxes: [{ slot: "card", x: 0, y: 0, w: 1, h: 0.26, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0.72, w: 1, h: 0.28, color: "#FFD400", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.045, w: 0.6, size: 0.035, align: "center", vc: true, look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.14, w: 0.9, size: 0.1, align: "center", vc: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.225, w: 0.88, size: 0.032, align: "center", vc: true, look: { color: "#4B5563", bold: false } },
      { slot: "price", x: 0.5, y: 0.79, w: 0.9, size: 0.08, align: "center", vc: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.86, w: 0.9, size: 0.034, align: "center", vc: true, look: { color: INK, bold: false }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.905, w: 0.9, size: 0.03, align: "center", vc: true, look: { color: INK, bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.955, w: 0.9, size: 0.032, align: "center", vc: true, look: { color: INK }, icon: "phone" },
    ],
  },
  {
    id: "window", name: "유리창 홍보지 — 멀리서도 보이게", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: ["A4", "A3", "전단지 A4"], bg: { x: 0, y: 0.17, w: 1, h: 0.4 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 0.17, color: "#E11D48", alpha: 1 }, { slot: "card", x: 0, y: 0.57, w: 1, h: 0.43, color: "#FFFFFF", alpha: 1 }],
    texts: [
      { slot: "title", x: 0.5, y: 0.085, w: 0.92, size: 0.11, align: "center", vc: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "price", x: 0.5, y: 0.66, w: 0.94, size: 0.12, align: "center", vc: true, look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.765, w: 0.9, size: 0.045, align: "center", vc: true, look: { color: INK }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.83, w: 0.9, size: 0.035, align: "center", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.92, w: 0.92, size: 0.05, align: "center", vc: true, look: { color: INK }, icon: "phone" },
    ],
  },
  {
    id: "xbanner", name: "X배너 — 세로 길게", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: ["X배너"], bg: { x: 0, y: 0.22, w: 1, h: 0.4 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 0.22, color: "#0F1F3D", alpha: 1 }, { slot: "card", x: 0, y: 0.62, w: 1, h: 0.38, color: "#FFFFFF", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.04, w: 0.8, size: 0.022, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.5, y: 0.12, w: 0.9, size: 0.04, align: "center", vc: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.185, w: 0.88, size: 0.016, align: "center", vc: true, look: { color: "#CBD5E1", bold: false } },
      { slot: "price", x: 0.5, y: 0.68, w: 0.92, size: 0.04, align: "center", vc: true, look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.74, w: 0.9, size: 0.018, align: "center", vc: true, look: { color: INK }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.78, w: 0.9, size: 0.015, align: "center", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.9, w: 0.92, size: 0.022, align: "center", vc: true, look: { color: INK }, icon: "phone" },
    ],
  },
  {
    id: "banner", name: "현수막 — 가로 길게", aspect: ["wide"], kind: ["vacancy"], cats: ["realty"], sizes: ["현수막"], bg: { x: 0, y: 0, w: 0.3, h: 1 },
    boxes: [{ slot: "panel", x: 0.3, y: 0, w: 0.7, h: 1, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.33, y: 0.12, w: 0.3, size: 0.12, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.33, y: 0.36, w: 0.64, size: 0.26, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "price", x: 0.33, y: 0.72, w: 0.32, size: 0.16, align: "left", look: { color: Y, font: "Black Han Sans" } },
      { slot: "agency", x: 0.97, y: 0.74, w: 0.34, size: 0.13, align: "right", look: { color: W1 }, icon: "phone" },
    ],
  },
  {
    id: "bizcard", name: "명함 — 깔끔", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 0.035, h: 1, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "office", x: 0.09, y: 0.14, w: 0.85, size: 0.12, align: "left", look: { color: "#0F1F3D" } },
      { slot: "ceo", x: 0.09, y: 0.36, w: 0.85, size: 0.07, align: "left", look: { color: INK } },
      { slot: "phone", x: 0.09, y: 0.58, w: 0.85, size: 0.06, align: "left", look: { color: INK, bold: false }, icon: "phone" },
      { slot: "officeAddr", x: 0.09, y: 0.72, w: 0.85, size: 0.045, align: "left", look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.09, y: 0.86, w: 0.85, size: 0.04, align: "left", look: { color: "#6B7280", bold: false } },
    ],
  },
  /* ── 2026-10-22 더 만든 샘플 (크기마다 6개 이상) ── */
  {
    id: "tall_bold", name: "세로 — 꽉 찬 큰 제목", aspect: ["tall"], kind: ["vacancy", "article"], cats: ["youtube", "sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.45 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.12, w: 0.7, size: 0.03, align: "center", vc: true, look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.5, y: 0.12, w: 0.7, size: 0.03, align: "center", vc: true, look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.42, w: 0.9, size: 0.075, align: "center", vc: true, look: { color: "#FFE600", outline: "#000000", outlineWidth: 8, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.55, w: 0.86, size: 0.032, align: "center", vc: true, look: { color: W1, ...shadow } },
      { slot: "price", x: 0.5, y: 0.7, w: 0.8, size: 0.05, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "agency", x: 0.5, y: 0.93, w: 0.9, size: 0.024, align: "center", vc: true, look: { color: W1, bold: false, ...shadow }, icon: "phone" },
      { slot: "source", x: 0.5, y: 0.93, w: 0.9, size: 0.024, align: "center", vc: true, look: { color: W1, bold: false, ...shadow } },
    ],
  },
  {
    id: "tall_split", name: "세로 — 위 사진 · 아래 남색 판", aspect: ["tall"], kind: ["vacancy", "article"], cats: ["youtube", "sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 0.55 },
    boxes: [{ slot: "panel", x: 0, y: 0.55, w: 1, h: 0.45, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.06, y: 0.04, w: 0.6, size: 0.028, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "label", x: 0.06, y: 0.04, w: 0.6, size: 0.028, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.06, y: 0.59, w: 0.88, size: 0.05, align: "left", look: { color: W1 } },
      { slot: "sub", x: 0.06, y: 0.67, w: 0.88, size: 0.026, align: "left", look: { color: "#CBD5E1", bold: false } },
      { slot: "price", x: 0.06, y: 0.74, w: 0.88, size: 0.045, align: "left", look: { color: Y }, icon: "won" },
      { slot: "area", x: 0.06, y: 0.82, w: 0.88, size: 0.026, align: "left", look: { color: W1, bold: false }, icon: "area" },
      { slot: "address", x: 0.06, y: 0.865, w: 0.88, size: 0.024, align: "left", look: { color: "#CBD5E1", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.06, y: 0.93, w: 0.88, size: 0.024, align: "left", look: { color: W1, bold: false }, icon: "phone" },
      { slot: "source", x: 0.06, y: 0.93, w: 0.88, size: 0.024, align: "left", look: { color: "#9CA3AF", bold: false } },
    ],
  },
  /* 전단지 · 유리창 홍보지 · A4 · A3 */
  {
    id: "flyer_c", name: "전단지 — 아래 남색 정보판", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: PRINT, bg: { x: 0, y: 0, w: 1, h: 0.5 },
    boxes: [{ slot: "panel", x: 0, y: 0.5, w: 1, h: 0.4, color: "#0F1F3D", alpha: 1 }, { slot: "panel", x: 0, y: 0.9, w: 1, h: 0.1, color: Y, alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.035, w: 0.5, size: 0.035, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.06, y: 0.54, w: 0.88, size: 0.06, align: "left", look: { color: W1 } },
      { slot: "sub", x: 0.06, y: 0.62, w: 0.88, size: 0.03, align: "left", look: { color: "#CBD5E1", bold: false } },
      { slot: "price", x: 0.06, y: 0.68, w: 0.88, size: 0.075, align: "left", look: { color: Y, font: "Black Han Sans" } },
      { slot: "area", x: 0.06, y: 0.79, w: 0.88, size: 0.032, align: "left", look: { color: W1, bold: false }, icon: "area" },
      { slot: "address", x: 0.06, y: 0.84, w: 0.88, size: 0.03, align: "left", look: { color: "#CBD5E1", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.95, w: 0.9, size: 0.035, align: "center", vc: true, look: { color: INK }, icon: "phone" },
    ],
  },
  {
    id: "flyer_d", name: "전단지 — 사진 크게 · 아래 글", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: PRINT, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.5, w: 1, h: 0.5, color: "#000000", alpha: 0.88, grad: "down" }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.035, w: 0.5, size: 0.035, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.06, y: 0.62, w: 0.88, size: 0.065, align: "left", look: { color: W1, ...shadow } },
      { slot: "sub", x: 0.06, y: 0.705, w: 0.88, size: 0.03, align: "left", look: { color: "#E5E7EB", bold: false } },
      { slot: "price", x: 0.06, y: 0.76, w: 0.88, size: 0.055, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "area", x: 0.06, y: 0.86, w: 0.88, size: 0.03, align: "left", look: { color: W1, bold: false }, icon: "area" },
      { slot: "address", x: 0.06, y: 0.9, w: 0.88, size: 0.028, align: "left", look: { color: "#E5E7EB", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.94, y: 0.95, w: 0.88, size: 0.03, align: "right", vc: true, look: { color: W1 }, icon: "phone" },
    ],
  },
  {
    id: "window_b", name: "유리창 홍보지 — 흰 바탕 · 빨간 띠", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: PRINT, bg: { x: 0.06, y: 0.27, w: 0.88, h: 0.36 },
    boxes: [{ slot: "card", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 1, h: 0.08, color: INK, alpha: 1 }, { slot: "panel", x: 0, y: 0.9, w: 1, h: 0.1, color: "#E11D48", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.04, w: 0.8, size: 0.035, align: "center", vc: true, look: { color: Y } },
      { slot: "title", x: 0.5, y: 0.17, w: 0.9, size: 0.085, align: "center", vc: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "price", x: 0.5, y: 0.71, w: 0.94, size: 0.1, align: "center", vc: true, look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.79, w: 0.9, size: 0.04, align: "center", vc: true, look: { color: INK }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.845, w: 0.9, size: 0.032, align: "center", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.95, w: 0.92, size: 0.042, align: "center", vc: true, look: { color: W1 }, icon: "phone" },
    ],
  },
  /* X배너 (가로 : 세로 = 1 : 3 — 글 크기는 세로 기준) */
  {
    id: "xb_full", name: "X배너 — 사진 꽉 · 큰 제목", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: ["X배너"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.42 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.06, w: 0.8, size: 0.022, align: "center", vc: true, look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.28, w: 0.92, size: 0.045, align: "center", vc: true, look: { color: W1, font: "Black Han Sans", outline: "#000000", outlineWidth: 5 } },
      { slot: "sub", x: 0.5, y: 0.36, w: 0.88, size: 0.016, align: "center", vc: true, look: { color: W1, ...shadow } },
      { slot: "price", x: 0.5, y: 0.6, w: 0.9, size: 0.032, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "area", x: 0.5, y: 0.69, w: 0.9, size: 0.017, align: "center", vc: true, look: { color: W1, ...shadow }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.73, w: 0.9, size: 0.015, align: "center", vc: true, look: { color: W1, bold: false, ...shadow }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.92, w: 0.92, size: 0.02, align: "center", vc: true, look: { bg: true, bgColor: W1, bgOpacity: 1, color: INK }, icon: "phone" },
    ],
  },
  {
    id: "xb_top", name: "X배너 — 위 사진 · 노란 판", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: ["X배너"], bg: { x: 0, y: 0, w: 1, h: 0.45 },
    boxes: [{ slot: "panel", x: 0, y: 0.45, w: 1, h: 0.45, color: Y, alpha: 1 }, { slot: "panel", x: 0, y: 0.9, w: 1, h: 0.1, color: INK, alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.04, w: 0.8, size: 0.02, align: "center", vc: true, look: { bg: true, bgColor: INK, bgOpacity: 1, color: Y } },
      { slot: "title", x: 0.5, y: 0.52, w: 0.92, size: 0.038, align: "center", vc: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.58, w: 0.88, size: 0.015, align: "center", vc: true, look: { color: "#374151", bold: false } },
      { slot: "price", x: 0.5, y: 0.67, w: 0.92, size: 0.042, align: "center", vc: true, look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.75, w: 0.9, size: 0.017, align: "center", vc: true, look: { color: INK }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.79, w: 0.9, size: 0.015, align: "center", vc: true, look: { color: INK, bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.95, w: 0.92, size: 0.02, align: "center", vc: true, look: { color: W1 }, icon: "phone" },
    ],
  },
  {
    id: "xb_red", name: "X배너 — 빨간 바탕", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: ["X배너"], bg: { x: 0.06, y: 0.3, w: 0.88, h: 0.3 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#E11D48", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.06, w: 0.8, size: 0.02, align: "center", vc: true, look: { bg: true, bgColor: W1, bgOpacity: 1, color: "#E11D48" } },
      { slot: "title", x: 0.5, y: 0.16, w: 0.92, size: 0.042, align: "center", vc: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.24, w: 0.88, size: 0.015, align: "center", vc: true, look: { color: "#FFE4E6", bold: false } },
      { slot: "price", x: 0.5, y: 0.68, w: 0.92, size: 0.045, align: "center", vc: true, look: { color: Y, font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.76, w: 0.9, size: 0.017, align: "center", vc: true, look: { color: W1 }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.8, w: 0.9, size: 0.015, align: "center", vc: true, look: { color: W1, bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.92, w: 0.92, size: 0.022, align: "center", vc: true, look: { color: W1 }, icon: "phone" },
    ],
  },
  {
    id: "xb_white", name: "X배너 — 흰 바탕 · 남색 띠", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: ["X배너"], bg: { x: 0, y: 0.22, w: 1, h: 0.38 },
    boxes: [{ slot: "card", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 1, h: 0.03, color: "#0F1F3D", alpha: 1 }, { slot: "panel", x: 0, y: 0.88, w: 1, h: 0.12, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.06, w: 0.8, size: 0.018, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.5, y: 0.12, w: 0.92, size: 0.04, align: "center", vc: true, look: { color: "#0F1F3D", font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.18, w: 0.88, size: 0.015, align: "center", vc: true, look: { color: "#4B5563", bold: false } },
      { slot: "price", x: 0.5, y: 0.67, w: 0.92, size: 0.042, align: "center", vc: true, look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.75, w: 0.9, size: 0.017, align: "center", vc: true, look: { color: INK }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.79, w: 0.9, size: 0.015, align: "center", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.94, w: 0.92, size: 0.022, align: "center", vc: true, look: { color: W1 }, icon: "phone" },
    ],
  },
  {
    id: "xb_mid", name: "X배너 — 가운데 남색 띠", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: ["X배너"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0.33, w: 1, h: 0.4, color: "#0F1F3D", alpha: 0.9 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.06, w: 0.8, size: 0.022, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.5, y: 0.4, w: 0.92, size: 0.04, align: "center", vc: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.46, w: 0.88, size: 0.015, align: "center", vc: true, look: { color: "#CBD5E1", bold: false } },
      { slot: "price", x: 0.5, y: 0.54, w: 0.92, size: 0.04, align: "center", vc: true, look: { color: Y, font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.625, w: 0.9, size: 0.017, align: "center", vc: true, look: { color: W1 }, icon: "area" },
      { slot: "address", x: 0.5, y: 0.67, w: 0.9, size: 0.015, align: "center", vc: true, look: { color: "#CBD5E1", bold: false }, icon: "pin" },
      { slot: "agency", x: 0.5, y: 0.93, w: 0.92, size: 0.02, align: "center", vc: true, look: { bg: true, bgColor: "#000000", bgOpacity: 0.6, color: W1 }, icon: "phone" },
    ],
  },
  /* 현수막 (가로 : 세로 ≈ 5.6 : 1 — 글 크기는 세로 기준) */
  {
    id: "bn_yellow", name: "현수막 — 노란 바탕", aspect: ["wide"], kind: ["vacancy"], cats: ["realty"], sizes: ["현수막"], bg: { x: 0, y: 0, w: 0.22, h: 1 },
    boxes: [{ slot: "panel", x: 0.22, y: 0, w: 0.78, h: 1, color: Y, alpha: 1 }],
    texts: [
      { slot: "title", x: 0.25, y: 0.1, w: 0.72, size: 0.34, align: "left", look: { color: INK, font: "Black Han Sans" } },
      { slot: "price", x: 0.25, y: 0.6, w: 0.4, size: 0.22, align: "left", look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "agency", x: 0.97, y: 0.64, w: 0.32, size: 0.15, align: "right", look: { color: INK }, icon: "phone" },
    ],
  },
  {
    id: "bn_red", name: "현수막 — 빨간 바탕 가운데", aspect: ["wide"], kind: ["vacancy"], cats: ["realty"], sizes: ["현수막"], bg: { x: 0.8, y: 0, w: 0.2, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 0.8, h: 1, color: "#E11D48", alpha: 1 }],
    texts: [
      { slot: "title", x: 0.4, y: 0.36, w: 0.76, size: 0.38, align: "center", vc: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "agency", x: 0.4, y: 0.78, w: 0.76, size: 0.17, align: "center", vc: true, look: { color: Y }, icon: "phone" },
    ],
  },
  {
    id: "bn_photo", name: "현수막 — 사진 꽉", aspect: ["wide"], kind: ["vacancy"], cats: ["realty"], sizes: ["현수막"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.55 }],
    texts: [
      { slot: "title", x: 0.03, y: 0.12, w: 0.62, size: 0.36, align: "left", look: { color: W1, font: "Black Han Sans", outline: "#000000", outlineWidth: 4 } },
      { slot: "price", x: 0.03, y: 0.6, w: 0.4, size: 0.2, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "agency", x: 0.97, y: 0.64, w: 0.32, size: 0.15, align: "right", look: { color: W1, ...shadow }, icon: "phone" },
    ],
  },
  {
    id: "bn_white", name: "현수막 — 흰 바탕 · 오른쪽 사진", aspect: ["wide"], kind: ["vacancy"], cats: ["realty"], sizes: ["현수막"], bg: { x: 0.7, y: 0, w: 0.3, h: 1 },
    boxes: [{ slot: "card", x: 0, y: 0, w: 0.7, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 0.015, h: 1, color: "#E11D48", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.04, y: 0.1, w: 0.3, size: 0.14, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.04, y: 0.34, w: 0.62, size: 0.3, align: "left", look: { color: INK, font: "Black Han Sans" } },
      { slot: "price", x: 0.04, y: 0.7, w: 0.32, size: 0.18, align: "left", look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "agency", x: 0.67, y: 0.73, w: 0.3, size: 0.13, align: "right", look: { color: INK }, icon: "phone" },
    ],
  },
  {
    id: "bn_navy", name: "현수막 — 남색 · 아래 노란 띠", aspect: ["wide"], kind: ["vacancy"], cats: ["realty"], sizes: ["현수막"], bg: { x: 0, y: 0, w: 0.25, h: 0.85 },
    boxes: [{ slot: "panel", x: 0.25, y: 0, w: 0.75, h: 0.85, color: "#0F1F3D", alpha: 1 }, { slot: "panel", x: 0, y: 0.85, w: 1, h: 0.15, color: Y, alpha: 1 }],
    texts: [
      { slot: "title", x: 0.28, y: 0.1, w: 0.69, size: 0.32, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "price", x: 0.28, y: 0.5, w: 0.36, size: 0.2, align: "left", look: { color: Y, font: "Black Han Sans" } },
      { slot: "area", x: 0.97, y: 0.54, w: 0.3, size: 0.12, align: "right", look: { color: W1 }, icon: "area" },
      { slot: "agency", x: 0.5, y: 0.925, w: 0.9, size: 0.1, align: "center", vc: true, look: { color: INK }, icon: "phone" },
    ],
  },
  /* ── 정사각 매물 카드 (SNS 피드 · 블로그 대표 이미지) — 집 테두리 · 큰 가격 · 전화 띠 (2026-10-30 사장님) ── */
  {
    id: "sq_house_navy", name: "매물 카드 — 남색 · 집 테두리 · 큰 가격", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#1E2A78", alpha: 1 }, { slot: "panel", x: 0, y: 0.86, w: 1, h: 0.14, color: Y, alpha: 1 }],
    picts: [{ id: "house_line", x: 0.5, y: 0.47, size: 0.86, color: W1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.06, w: 0.8, size: 0.03, align: "center", vc: true, look: { color: "#C7D2FE" } },
      { slot: "badge", x: 0.5, y: 0.31, w: 0.5, size: 0.035, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.5, y: 0.43, w: 0.6, size: 0.075, align: "center", vc: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "price", x: 0.5, y: 0.6, w: 0.62, size: 0.1, align: "center", vc: true, oneLine: true, look: { color: Y, font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.72, w: 0.6, size: 0.032, align: "center", vc: true, look: { color: W1 }, icon: "area" },
      { slot: "phone", x: 0.5, y: 0.93, w: 0.84, size: 0.055, align: "center", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans" }, icon: "phone" },
    ],
  },
  {
    id: "sq_yellow_house", name: "매물 카드 — 노랑 · 검정 집 테두리", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: Y, alpha: 1 }, { slot: "panel", x: 0, y: 0.87, w: 1, h: 0.13, color: INK, alpha: 1 }],
    picts: [{ id: "house_line", x: 0.5, y: 0.48, size: 0.84, color: INK }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.3, w: 0.5, size: 0.034, align: "center", vc: true, look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.44, w: 0.6, size: 0.08, align: "center", vc: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "price", x: 0.5, y: 0.61, w: 0.62, size: 0.085, align: "center", vc: true, oneLine: true, look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.73, w: 0.6, size: 0.03, align: "center", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.5, y: 0.935, w: 0.84, size: 0.05, align: "center", vc: true, oneLine: true, look: { color: Y, font: "Black Han Sans" }, icon: "phone" },
    ],
  },
  {
    id: "sq_photo_yellow", name: "매물 카드 — 위 사진 · 아래 노랑 판", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 0.55 },
    boxes: [{ slot: "panel", x: 0, y: 0.55, w: 1, h: 0.45, color: Y, alpha: 1 }, { slot: "panel", x: 0, y: 0.88, w: 1, h: 0.12, color: "#1E2A78", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.05, w: 0.5, size: 0.034, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.05, y: 0.59, w: 0.9, size: 0.07, align: "left", oneLine: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "price", x: 0.05, y: 0.77, w: 0.6, size: 0.075, align: "left", vc: true, oneLine: true, look: { color: "#1E2A78", font: "Black Han Sans" } },
      { slot: "area", x: 0.95, y: 0.77, w: 0.35, size: 0.032, align: "right", vc: true, look: { color: INK }, icon: "area" },
      { slot: "phone", x: 0.5, y: 0.94, w: 0.9, size: 0.048, align: "center", vc: true, oneLine: true, look: { color: W1 }, icon: "phone" },
    ],
  },
  {
    id: "sq_signboard", name: "매물 카드 — 남색 바탕 · 흰 간판", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#24418F", alpha: 1 },
      { slot: "card", x: 0.08, y: 0.1, w: 0.84, h: 0.8, color: "#FFFFFF", alpha: 1, radius: 36 },
      { slot: "card", x: 0.11, y: 0.13, w: 0.78, h: 0.74, color: Y, alpha: 0.18, radius: 26 },
    ],
    picts: [{ id: "roof_line", x: 0.5, y: 0.22, size: 0.2, color: INK }],
    texts: [
      { slot: "title", x: 0.5, y: 0.37, w: 0.72, size: 0.085, align: "center", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "price", x: 0.5, y: 0.52, w: 0.7, size: 0.085, align: "center", vc: true, oneLine: true, look: { color: W1, bg: true, bgColor: INK, bgOpacity: 1, bgPad: 1.1, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.65, w: 0.7, size: 0.03, align: "center", vc: true, look: { color: INK } },
      { slot: "office", x: 0.5, y: 0.78, w: 0.7, size: 0.032, align: "center", vc: true, look: { color: INK } },
      { slot: "badge", x: 0.84, y: 0.7, w: 0.25, size: 0.03, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "phone", x: 0.5, y: 0.84, w: 0.7, size: 0.034, align: "center", vc: true, oneLine: true, look: { color: INK, bold: false }, icon: "phone" },
    ],
  },
  {
    id: "sq_orange_card", name: "매물 카드 — 주황 · 흰 판 · 지붕", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#F04E23", alpha: 1 }, { slot: "card", x: 0.14, y: 0.3, w: 0.72, h: 0.62, color: "#FFFFFF", alpha: 1, radius: 24 }],
    picts: [{ id: "roof", x: 0.5, y: 0.2, size: 0.42, color: W1 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.37, w: 0.6, size: 0.032, align: "center", vc: true, look: { color: INK } },
      { slot: "title", x: 0.5, y: 0.48, w: 0.64, size: 0.075, align: "center", vc: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "price", x: 0.5, y: 0.63, w: 0.64, size: 0.08, align: "center", vc: true, oneLine: true, look: { color: "#E11D48", font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.74, w: 0.62, size: 0.026, align: "center", vc: true, look: { color: "#E11D48", bold: false } },
      { slot: "office", x: 0.5, y: 0.85, w: 0.62, size: 0.028, align: "center", vc: true, look: { color: "#6B7280" } },
    ],
  },
  {
    id: "sq_navy_split", name: "매물 카드 — 위 남색 · 아래 사진 · 노랑 띠", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0.45, w: 1, h: 0.42 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 0.45, color: "#1E2A78", alpha: 1 }, { slot: "panel", x: 0, y: 0.87, w: 1, h: 0.13, color: Y, alpha: 1 }],
    picts: [{ id: "roof_line", x: 0.86, y: 0.12, size: 0.16, color: Y }],
    texts: [
      { slot: "badge", x: 0.06, y: 0.07, w: 0.6, size: 0.032, align: "left", look: { color: Y } },
      { slot: "title", x: 0.06, y: 0.15, w: 0.88, size: 0.075, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "price", x: 0.06, y: 0.37, w: 0.88, size: 0.06, align: "left", vc: true, oneLine: true, look: { color: Y, font: "Black Han Sans" } },
      { slot: "phone", x: 0.5, y: 0.935, w: 0.9, size: 0.05, align: "center", vc: true, oneLine: true, look: { color: "#1E2A78", font: "Black Han Sans" }, icon: "phone" },
    ],
  },
  {
    id: "sq_sky_roof", name: "매물 카드 — 하늘색 · 큰 지붕 · 건물 줄", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#DCEBFA", alpha: 1 }, { slot: "panel", x: 0.12, y: 0.53, w: 0.76, h: 0.09, color: "#1E3A8A", alpha: 1 }],
    picts: [{ id: "roof", x: 0.5, y: 0.22, size: 0.5, color: "#1E3A8A" }, { id: "town", x: 0.2, y: 0.86, size: 0.24, color: "#A9C6EA" }, { id: "town", x: 0.8, y: 0.86, size: 0.24, color: "#A9C6EA" }],
    texts: [
      { slot: "title", x: 0.5, y: 0.42, w: 0.8, size: 0.09, align: "center", vc: true, oneLine: true, look: { color: "#1E3A8A", font: "Black Han Sans" } },
      { slot: "badge", x: 0.5, y: 0.575, w: 0.72, size: 0.034, align: "center", vc: true, look: { color: W1 } },
      { slot: "phone", x: 0.5, y: 0.7, w: 0.8, size: 0.055, align: "center", vc: true, oneLine: true, look: { color: "#1E3A8A" }, icon: "phone" },
      { slot: "office", x: 0.5, y: 0.94, w: 0.4, size: 0.026, align: "center", vc: true, look: { color: W1, bg: true, bgColor: "#1E3A8A", bgOpacity: 1 } },
    ],
  },
  {
    id: "sq_green_house", name: "매물 카드 — 초록 · 흰 집 테두리", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#1F9D55", alpha: 1 }, { slot: "panel", x: 0, y: 0.87, w: 1, h: 0.13, color: INK, alpha: 1 }],
    picts: [{ id: "house_line", x: 0.5, y: 0.47, size: 0.82, color: W1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.3, w: 0.5, size: 0.03, align: "center", vc: true, look: { color: W1 } },
      { slot: "title", x: 0.5, y: 0.47, w: 0.58, size: 0.1, align: "center", vc: true, look: { color: Y, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.66, w: 0.58, size: 0.034, align: "center", vc: true, look: { color: W1 } },
      { slot: "phone", x: 0.5, y: 0.935, w: 0.84, size: 0.05, align: "center", vc: true, oneLine: true, look: { color: W1 }, icon: "phone" },
    ],
  },
  {
    id: "sq_black_gold", name: "매물 카드 — 검정 · 금색 집 · 고급", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#121212", alpha: 1 }, { slot: "panel", x: 0.3, y: 0.66, w: 0.4, h: 0.003, color: "#C9A35B", alpha: 1 }],
    picts: [{ id: "tower", x: 0.5, y: 0.3, size: 0.34, color: "#C9A35B" }],
    texts: [
      { slot: "title", x: 0.5, y: 0.58, w: 0.84, size: 0.06, align: "center", vc: true, oneLine: true, look: { color: "#E2C384" } },
      { slot: "price", x: 0.5, y: 0.74, w: 0.8, size: 0.06, align: "center", vc: true, oneLine: true, look: { color: W1 } },
      { slot: "address", x: 0.5, y: 0.83, w: 0.8, size: 0.026, align: "center", vc: true, look: { color: "#9CA3AF", bold: false } },
      { slot: "phone", x: 0.5, y: 0.92, w: 0.8, size: 0.034, align: "center", vc: true, oneLine: true, look: { color: "#C9A35B" }, icon: "phone" },
    ],
  },
  {
    id: "sq_photo_navycard", name: "매물 카드 — 사진 가득 · 아래 남색 판", aspect: ["square"], kind: ["vacancy"], cats: ["sns", "blog"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "card", x: 0.05, y: 0.6, w: 0.9, h: 0.35, color: "#1E2A78", alpha: 0.92, radius: 24 }],
    texts: [
      { slot: "badge", x: 0.09, y: 0.64, w: 0.5, size: 0.03, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.09, y: 0.71, w: 0.82, size: 0.06, align: "left", oneLine: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "price", x: 0.09, y: 0.85, w: 0.5, size: 0.06, align: "left", vc: true, oneLine: true, look: { color: Y, font: "Black Han Sans" } },
      { slot: "phone", x: 0.91, y: 0.85, w: 0.36, size: 0.034, align: "right", vc: true, oneLine: true, look: { color: W1 }, icon: "phone" },
    ],
  },
  /* ── 전단지 — 사장님이 보낸 해외 부동산 전단 견본 스타일 (2026-10-30) — 값은 공실·중개사무소 실제 값만, QR = 그 공실 상세 ── */
  {
    id: "fl_gold", name: "전단지 — 흰 바탕 · 금색 판", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: PRINT, bg: { x: 0.06, y: 0.2, w: 0.88, h: 0.33 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.2, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0, y: 0.2, w: 0.06, h: 0.33, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0.94, y: 0.2, w: 0.06, h: 0.33, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0, y: 0.53, w: 1, h: 0.47, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0.62, y: 0, w: 0.38, h: 0.17, color: GOLD, alpha: 1 },
      { slot: "panel", x: 0.6, y: 0.6, w: 0.34, h: 0.002, color: GOLD, alpha: 1 },
      { slot: "panel", x: 0.62, y: 0.92, w: 0.38, h: 0.08, color: GOLD, alpha: 1 },
    ],
    picts: [{ id: "roof", x: 0.1, y: 0.06, size: 0.09, color: GOLD }],
    texts: [
      { slot: "office", x: 0.16, y: 0.06, w: 0.44, size: 0.016, align: "left", vc: true, look: { color: "#8C7748" } },
      { slot: "badge", x: 0.81, y: 0.05, w: 0.34, size: 0.016, align: "center", vc: true, look: { color: W1 } },
      { slot: "price", x: 0.81, y: 0.115, w: 0.34, size: 0.03, align: "center", vc: true, oneLine: true, look: { color: W1, font: "GmarketSans" } },
      { slot: "sub", x: 0.06, y: 0.57, w: 0.5, size: 0.013, align: "left", look: { color: INK } },
      { slot: "title", x: 0.06, y: 0.6, w: 0.5, size: 0.03, align: "left", look: { color: GOLD, font: "GmarketSans" } },
      { slot: "address", x: 0.06, y: 0.73, w: 0.5, size: 0.014, align: "left", look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "area", x: 0.6, y: 0.63, w: 0.34, size: 0.015, align: "left", look: { color: INK }, icon: "area" },
      { slot: "ceo", x: 0.18, y: 0.875, w: 0.42, size: 0.011, align: "left", vc: true, look: { color: INK } },
      { slot: "regNum", x: 0.18, y: 0.9, w: 0.42, size: 0.01, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
      { slot: "officeAddr", x: 0.18, y: 0.925, w: 0.42, size: 0.01, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
      { slot: "phone", x: 0.97, y: 0.96, w: 0.34, size: 0.02, align: "right", vc: true, oneLine: true, look: { color: W1 }, icon: "phone" },
    ],
    qr: { x: 0.1, y: 0.9, size: 0.12, color: INK }, sns: { x: 0.18, y: 0.955, w: 0.42, size: 0.011, color: "#6B7280", align: "left" },
  },
  {
    id: "fl_pillar", name: "전단지 — 큰 제목 · 아래 사진 · 가격 기둥", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: PRINT, bg: { x: 0, y: 0.45, w: 1, h: 0.55 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.45, color: "#FFFFFF", alpha: 1 },
      { slot: "card", x: 0.62, y: 0.04, w: 0.3, h: 0.5, color: "#3B82F6", alpha: 0.92, radius: 70 },
      { slot: "card", x: 0.62, y: 0.27, w: 0.3, h: 0.27, color: "#1F2937", alpha: 0.95, radius: 70 },
      { slot: "card", x: 0.03, y: 0.85, w: 0.6, h: 0.12, color: "#FFFFFF", alpha: 0.82, radius: 50 },
    ],
    picts: [{ id: "town", x: 0.085, y: 0.05, size: 0.07, color: "#2563EB" }],
    texts: [
      { slot: "office", x: 0.13, y: 0.05, w: 0.45, size: 0.014, align: "left", vc: true, look: { color: "#1F2937" } },
      { slot: "title", x: 0.06, y: 0.11, w: 0.52, size: 0.045, align: "left", look: { color: INK, font: "GmarketSans" } },
      { slot: "sub", x: 0.06, y: 0.3, w: 0.52, size: 0.013, align: "left", look: { color: "#374151", bold: false } },
      { slot: "badge", x: 0.77, y: 0.1, w: 0.26, size: 0.016, align: "center", vc: true, look: { color: W1 } },
      { slot: "price", x: 0.77, y: 0.17, w: 0.26, size: 0.026, align: "center", vc: true, oneLine: true, look: { color: W1, font: "GmarketSans" } },
      { slot: "area", x: 0.77, y: 0.34, w: 0.26, size: 0.016, align: "center", vc: true, look: { color: W1 }, icon: "area" },
      { slot: "address", x: 0.77, y: 0.42, w: 0.26, size: 0.012, align: "center", vc: true, look: { color: "#D1D5DB", bold: false } },
      { slot: "phone", x: 0.06, y: 0.885, w: 0.4, size: 0.017, align: "left", vc: true, oneLine: true, look: { color: INK }, icon: "phone" },
      { slot: "ceo", x: 0.06, y: 0.92, w: 0.4, size: 0.01, align: "left", vc: true, look: { color: "#374151" } },
      { slot: "regNum", x: 0.06, y: 0.945, w: 0.4, size: 0.009, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
    ],
    qr: { x: 0.54, y: 0.91, size: 0.09, color: INK },
  },
  {
    id: "fl_glass", name: "전단지 — 사진 가득 · 유리 판", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: PRINT, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "shade", x: 0, y: 0, w: 1, h: 0.42, color: "#FFFFFF", alpha: 0.75, grad: "down" },
      { slot: "card", x: 0.63, y: 0.12, w: 0.31, h: 0.42, color: "#FFFFFF", alpha: 0.6, radius: 70 },
      { slot: "card", x: 0.33, y: 0.4, w: 0.28, h: 0.12, color: "#FFFFFF", alpha: 0.65, radius: 60 },
      { slot: "panel", x: 0, y: 0.93, w: 1, h: 0.07, color: "#0F172A", alpha: 0.78 },
    ],
    picts: [{ id: "home", x: 0.08, y: 0.05, size: 0.06, color: "#1E3A5F" }],
    texts: [
      { slot: "office", x: 0.12, y: 0.05, w: 0.48, size: 0.013, align: "left", vc: true, look: { color: "#1E3A5F" } },
      { slot: "title", x: 0.06, y: 0.1, w: 0.55, size: 0.05, align: "left", look: { color: "#111827", font: "GmarketSans" } },
      { slot: "sub", x: 0.06, y: 0.3, w: 0.52, size: 0.013, align: "left", look: { color: "#1F2937", bold: false } },
      { slot: "area", x: 0.785, y: 0.2, w: 0.27, size: 0.015, align: "center", vc: true, look: { color: "#1F2937" }, icon: "area" },
      { slot: "address", x: 0.785, y: 0.3, w: 0.27, size: 0.012, align: "center", vc: true, look: { color: "#1F2937", bold: false }, icon: "pin" },
      { slot: "badge", x: 0.47, y: 0.425, w: 0.26, size: 0.012, align: "center", vc: true, look: { color: "#1F2937" } },
      { slot: "price", x: 0.47, y: 0.475, w: 0.26, size: 0.026, align: "center", vc: true, oneLine: true, look: { color: "#1E3A8A", font: "GmarketSans" } },
      { slot: "phone", x: 0.05, y: 0.965, w: 0.32, size: 0.015, align: "left", vc: true, oneLine: true, look: { color: W1 }, icon: "phone" },
      { slot: "ceo", x: 0.4, y: 0.965, w: 0.22, size: 0.01, align: "left", vc: true, oneLine: true, look: { color: W1 } },
      { slot: "regNum", x: 0.64, y: 0.965, w: 0.32, size: 0.009, align: "left", vc: true, oneLine: true, look: { color: "#CBD5E1", bold: false } },
    ],
    qr: { x: 0.89, y: 0.86, size: 0.1, color: "#0F172A" },
  },
  {
    id: "fl_yellow_navy", name: "전단지 — 노랑 · 남색 판", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: PRINT, bg: { x: 0.35, y: 0.18, w: 0.65, h: 0.5 },
    boxes: [
      { slot: "panel", x: 0.6, y: 0, w: 0.4, h: 0.18, color: "#FFFFFF", alpha: 1 },
      { slot: "card", x: 0, y: 0, w: 0.62, h: 0.2, color: NAVY2, alpha: 1, radius: 120 },
      { slot: "panel", x: 0, y: 0, w: 0.3, h: 0.2, color: NAVY2, alpha: 1 },
      { slot: "card", x: 0.62, y: 0.04, w: 0.36, h: 0.1, color: Y, alpha: 1, radius: 90 },
      { slot: "panel", x: 0, y: 0.2, w: 0.4, h: 0.48, color: Y, alpha: 0.96 },
      { slot: "panel", x: 0, y: 0.68, w: 1, h: 0.32, color: "#FFFFFF", alpha: 1 },
      { slot: "card", x: 0.55, y: 0.95, w: 0.5, h: 0.08, color: NAVY2, alpha: 1, radius: 60 },
    ],
    picts: [{ id: "home", x: 0.08, y: 0.07, size: 0.07, color: Y }],
    texts: [
      { slot: "office", x: 0.14, y: 0.07, w: 0.44, size: 0.016, align: "left", vc: true, look: { color: W1 } },
      { slot: "badge", x: 0.95, y: 0.07, w: 0.32, size: 0.011, align: "right", vc: true, look: { color: INK } },
      { slot: "price", x: 0.95, y: 0.11, w: 0.32, size: 0.022, align: "right", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "title", x: 0.04, y: 0.25, w: 0.34, size: 0.038, align: "left", look: { color: NAVY2, font: "Black Han Sans" } },
      { slot: "sub", x: 0.04, y: 0.48, w: 0.34, size: 0.012, align: "left", look: { color: NAVY2, bold: false } },
      { slot: "area", x: 0.04, y: 0.6, w: 0.34, size: 0.014, align: "left", look: { color: NAVY2 }, icon: "area" },
      { slot: "address", x: 0.06, y: 0.72, w: 0.55, size: 0.016, align: "left", look: { color: INK }, icon: "pin" },
      { slot: "ceo", x: 0.06, y: 0.8, w: 0.5, size: 0.011, align: "left", vc: true, look: { color: INK } },
      { slot: "regNum", x: 0.06, y: 0.83, w: 0.5, size: 0.01, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
      { slot: "officeAddr", x: 0.06, y: 0.86, w: 0.5, size: 0.01, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
      { slot: "phone", x: 0.95, y: 0.78, w: 0.4, size: 0.022, align: "right", vc: true, oneLine: true, look: { color: NAVY2, font: "Black Han Sans" }, icon: "phone" },
    ],
    qr: { x: 0.87, y: 0.87, size: 0.1, color: NAVY2 }, sns: { x: 0.06, y: 0.91, w: 0.45, size: 0.011, color: NAVY2, align: "left" },
  },
  {
    id: "fl_navy_dark", name: "전단지 — 남색 · 노랑 줄", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: PRINT, bg: { x: 0.4, y: 0.1, w: 0.6, h: 0.55 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 0.4, h: 1, color: NAVY2, alpha: 1 },
      { slot: "panel", x: 0.4, y: 0, w: 0.6, h: 0.1, color: NAVY2, alpha: 1 },
      { slot: "panel", x: 0.4, y: 0.65, w: 0.6, h: 0.35, color: NAVY2, alpha: 1 },
      { slot: "panel", x: 0.4, y: 0.1, w: 0.02, h: 0.55, color: Y, alpha: 1 },
    ],
    picts: [{ id: "home", x: 0.07, y: 0.06, size: 0.06, color: Y }],
    texts: [
      { slot: "office", x: 0.12, y: 0.06, w: 0.5, size: 0.014, align: "left", vc: true, look: { color: W1 } },
      { slot: "title", x: 0.05, y: 0.15, w: 0.33, size: 0.04, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "sub", x: 0.05, y: 0.37, w: 0.33, size: 0.012, align: "left", look: { color: "#CBD5E1", bold: false } },
      { slot: "badge", x: 0.05, y: 0.47, w: 0.33, size: 0.013, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "price", x: 0.05, y: 0.57, w: 0.33, size: 0.03, align: "left", vc: true, oneLine: true, look: { color: Y, font: "Black Han Sans" } },
      { slot: "area", x: 0.05, y: 0.63, w: 0.33, size: 0.013, align: "left", look: { color: W1 }, icon: "area" },
      { slot: "address", x: 0.45, y: 0.7, w: 0.5, size: 0.014, align: "left", look: { color: W1 }, icon: "pin" },
      { slot: "phone", x: 0.05, y: 0.78, w: 0.33, size: 0.02, align: "left", vc: true, oneLine: true, look: { color: Y, font: "Black Han Sans" }, icon: "phone" },
      { slot: "ceo", x: 0.05, y: 0.84, w: 0.33, size: 0.011, align: "left", vc: true, look: { color: W1 } },
      { slot: "regNum", x: 0.05, y: 0.87, w: 0.33, size: 0.01, align: "left", vc: true, look: { color: "#94A3B8", bold: false } },
      { slot: "officeAddr", x: 0.05, y: 0.9, w: 0.33, size: 0.01, align: "left", vc: true, look: { color: "#94A3B8", bold: false } },
    ],
    qr: { x: 0.85, y: 0.84, size: 0.11, color: NAVY2 }, sns: { x: 0.45, y: 0.95, w: 0.3, size: 0.011, color: W1, align: "left" },
  },
  {
    id: "fl_green", name: "전단지 — 진초록 · 노랑 제목 · 둥근 가격", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: PRINT, bg: { x: 0.5, y: 0.14, w: 0.44, h: 0.46 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 0.5, h: 1, color: GREEN2, alpha: 1 },
      { slot: "panel", x: 0.5, y: 0, w: 0.5, h: 0.14, color: GREEN2, alpha: 1 },
      { slot: "panel", x: 0.94, y: 0.14, w: 0.06, h: 0.46, color: GREEN2, alpha: 1 },
      { slot: "panel", x: 0.5, y: 0.6, w: 0.5, h: 0.4, color: GREEN2, alpha: 1 },
      { slot: "card", x: 0.58, y: 0.71, w: 0.34, h: 0.24, color: "#1F5C50", alpha: 1, radius: 420 },
    ],
    picts: [{ id: "home", x: 0.08, y: 0.05, size: 0.06, color: Y }],
    texts: [
      { slot: "office", x: 0.13, y: 0.05, w: 0.6, size: 0.014, align: "left", vc: true, look: { color: W1 } },
      { slot: "title", x: 0.06, y: 0.12, w: 0.42, size: 0.045, align: "left", look: { color: Y, font: "Black Han Sans" } },
      { slot: "sub", x: 0.06, y: 0.33, w: 0.42, size: 0.013, align: "left", look: { color: W1, bold: false } },
      { slot: "badge", x: 0.06, y: 0.42, w: 0.42, size: 0.014, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: GREEN2 } },
      { slot: "area", x: 0.06, y: 0.48, w: 0.42, size: 0.014, align: "left", look: { color: W1 }, icon: "area" },
      { slot: "address", x: 0.06, y: 0.53, w: 0.42, size: 0.013, align: "left", look: { color: W1, bold: false }, icon: "pin" },
      { slot: "phone", x: 0.06, y: 0.72, w: 0.42, size: 0.02, align: "left", vc: true, oneLine: true, look: { color: W1, font: "Black Han Sans" }, icon: "phone" },
      { slot: "ceo", x: 0.06, y: 0.77, w: 0.42, size: 0.011, align: "left", vc: true, look: { color: W1 } },
      { slot: "regNum", x: 0.06, y: 0.8, w: 0.42, size: 0.01, align: "left", vc: true, look: { color: "#A7C4BC", bold: false } },
      { slot: "officeAddr", x: 0.06, y: 0.83, w: 0.42, size: 0.01, align: "left", vc: true, look: { color: "#A7C4BC", bold: false } },
      { slot: "price", x: 0.75, y: 0.83, w: 0.3, size: 0.026, align: "center", vc: true, oneLine: true, look: { color: Y, font: "Black Han Sans" } },
    ],
    qr: { x: 0.14, y: 0.92, size: 0.1, color: GREEN2 }, sns: { x: 0.25, y: 0.92, w: 0.24, size: 0.01, color: W1, align: "left" },
  },
  /* ── 유리창 홍보지 A4 — 우리 사이트 홍보지 자동 생성기(/marketing/ai-detail)와 같은 디자인 (2026-10-30 사장님) ──
     대표색은 생성기 기본(청록). 아래 연락 띠 = 전화 크게 + 상호·대표·등록번호 + QR(그 공실 상세 화면) */
  {
    id: "win_big", name: "유리창 홍보지 — 숫자 크게", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: [WINDOW], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.1, color: TEAL, alpha: 1 },
      { slot: "panel", x: 0, y: 0.82, w: 1, h: 0.18, color: "#111827", alpha: 1 },
    ],
    texts: [
      { slot: "title", x: 0.5, y: 0.05, w: 0.88, size: 0.03, align: "center", vc: true, oneLine: true, look: { color: W1 } },
      { slot: "badge", x: 0.5, y: 0.17, w: 0.7, size: 0.024, align: "center", vc: true, look: { bg: true, bgColor: "#E11D2A", bgOpacity: 1, color: W1 } },
      { slot: "price", x: 0.5, y: 0.37, w: 0.92, size: 0.1, align: "center", vc: true, oneLine: true, look: { color: TEAL, font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.5, w: 0.88, size: 0.034, align: "center", vc: true, look: { color: INK } },
      { slot: "sub", x: 0.5, y: 0.6, w: 0.86, size: 0.024, align: "center", vc: true, look: { color: "#374151", bold: false } },
      { slot: "address", x: 0.5, y: 0.75, w: 0.86, size: 0.024, align: "center", vc: true, look: { color: "#374151" } },
      ...CALL_BAND,
    ],
    qr: { x: 0.87, y: 0.91, size: 0.19, color: "#111827" },
  },
  {
    id: "win_photo", name: "유리창 홍보지 — 사진형", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: [WINDOW], bg: { x: 0, y: 0, w: 1, h: 0.42 },
    boxes: [
      { slot: "panel", x: 0, y: 0.42, w: 1, h: 0.4, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0, y: 0.82, w: 1, h: 0.18, color: "#111827", alpha: 1 },
    ],
    texts: [
      { slot: "badge", x: 0.05, y: 0.03, w: 0.6, size: 0.022, align: "left", look: { bg: true, bgColor: "#E11D2A", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.47, w: 0.88, size: 0.026, align: "center", vc: true, oneLine: true, look: { color: INK } },
      { slot: "price", x: 0.5, y: 0.565, w: 0.92, size: 0.075, align: "center", vc: true, oneLine: true, look: { color: TEAL, font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.655, w: 0.88, size: 0.028, align: "center", vc: true, look: { color: INK } },
      { slot: "address", x: 0.5, y: 0.75, w: 0.86, size: 0.022, align: "center", vc: true, look: { color: "#374151" } },
      ...CALL_BAND,
    ],
    qr: { x: 0.87, y: 0.91, size: 0.19, color: "#111827" },
  },
  {
    id: "win_board", name: "유리창 홍보지 — 추천 걸이판", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: [WINDOW], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: TEAL, alpha: 1 },
      { slot: "card", x: 0.09, y: 0.06, w: 0.82, h: 0.075, color: "#FFFFFF", alpha: 1, radius: 60 },
      { slot: "panel", x: 0, y: 0.155, w: 1, h: 0.004, color: "#0F172A", alpha: 0.55 },
      { slot: "panel", x: 0.125, y: 0.135, w: 0.008, h: 0.05, color: "#0F172A", alpha: 0.55 },
      { slot: "panel", x: 0.867, y: 0.135, w: 0.008, h: 0.05, color: "#0F172A", alpha: 0.55 },
      { slot: "card", x: 0.06, y: 0.175, w: 0.88, h: 0.645, color: "#FFFFFF", alpha: 1, radius: 70 },
    ],
    texts: [
      { slot: "office", x: 0.5, y: 0.035, w: 0.6, size: 0.016, align: "center", vc: true, look: { bg: true, bgColor: TEAL_LIGHT, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.5, y: 0.0975, w: 0.76, size: 0.03, align: "center", vc: true, oneLine: true, look: { color: INK } },
      { slot: "badge", x: 0.5, y: 0.23, w: 0.7, size: 0.026, align: "center", vc: true, look: { color: TEAL } },
      { slot: "address", x: 0.5, y: 0.31, w: 0.8, size: 0.032, align: "center", vc: true, oneLine: true, look: { color: INK } },
      { slot: "price", x: 0.5, y: 0.43, w: 0.82, size: 0.08, align: "center", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans", bg: true, bgColor: TEAL_LIGHT, bgOpacity: 0.6 } },
      { slot: "area", x: 0.5, y: 0.54, w: 0.8, size: 0.026, align: "center", vc: true, look: { color: "#374151" } },
      { slot: "sub", x: 0.5, y: 0.62, w: 0.8, size: 0.02, align: "center", vc: true, look: { color: "#374151", bold: false } },
      { slot: "phone", x: 0.5, y: 0.74, w: 0.8, size: 0.04, align: "center", vc: true, look: { color: INK, bg: true, bgColor: TEAL_LIGHT, bgOpacity: 1, bgPad: 1.2 }, icon: "phone" },
      { slot: "ceo", x: 0.06, y: 0.87, w: 0.66, size: 0.015, align: "left", vc: true, look: { color: W1 } },
      { slot: "regNum", x: 0.06, y: 0.9, w: 0.66, size: 0.012, align: "left", vc: true, look: { color: "#E0F2F1", bold: false } },
      { slot: "officeAddr", x: 0.06, y: 0.93, w: 0.66, size: 0.012, align: "left", vc: true, look: { color: "#E0F2F1", bold: false } },
    ],
    qr: { x: 0.87, y: 0.905, size: 0.17, color: "#003845" },
  },
  {
    id: "win_split", name: "유리창 홍보지 — 반반 사진", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: [WINDOW], bg: { x: 0, y: 0, w: 0.44, h: 0.86 },
    boxes: [
      { slot: "panel", x: 0.44, y: 0, w: 0.56, h: 0.86, color: "#F6F2EC", alpha: 1 },
      { slot: "panel", x: 0, y: 0.86, w: 1, h: 0.14, color: TEAL, alpha: 1 },
    ],
    texts: [
      { slot: "office", x: 0.95, y: 0.035, w: 0.5, size: 0.014, align: "right", vc: true, look: { color: "#374151" } },
      { slot: "badge", x: 0.05, y: 0.03, w: 0.36, size: 0.02, align: "left", look: { bg: true, bgColor: "#E11D2A", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.95, y: 0.36, w: 0.5, size: 0.028, align: "right", look: { color: TEAL } },
      { slot: "address", x: 0.95, y: 0.5, w: 0.5, size: 0.02, align: "right", vc: true, look: { color: "#374151" } },
      { slot: "price", x: 0.95, y: 0.6, w: 0.52, size: 0.06, align: "right", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "area", x: 0.95, y: 0.68, w: 0.5, size: 0.022, align: "right", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.95, y: 0.78, w: 0.52, size: 0.03, align: "right", vc: true, look: { color: W1, bg: true, bgColor: TEAL, bgOpacity: 1, bgPad: 1.2 }, icon: "phone" },
      { slot: "ceo", x: 0.05, y: 0.89, w: 0.66, size: 0.015, align: "left", vc: true, look: { color: W1 } },
      { slot: "regNum", x: 0.05, y: 0.92, w: 0.66, size: 0.012, align: "left", vc: true, look: { color: "#E0F2F1", bold: false } },
      { slot: "officeAddr", x: 0.05, y: 0.95, w: 0.66, size: 0.012, align: "left", vc: true, look: { color: "#E0F2F1", bold: false } },
    ],
    qr: { x: 0.88, y: 0.93, size: 0.15, color: "#003845" },
  },
  {
    id: "win_color", name: "유리창 홍보지 — 색 바탕", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: [WINDOW], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: TEAL, alpha: 1 },
      { slot: "panel", x: 0, y: 0.82, w: 1, h: 0.18, color: "#111827", alpha: 1 },
    ],
    texts: [
      { slot: "title", x: 0.5, y: 0.08, w: 0.86, size: 0.03, align: "center", vc: true, oneLine: true, look: { color: TEAL, bg: true, bgColor: W1, bgOpacity: 1, bgPad: 1.2 } },
      { slot: "badge", x: 0.5, y: 0.18, w: 0.7, size: 0.024, align: "center", vc: true, look: { bg: true, bgColor: "#E11D2A", bgOpacity: 1, color: W1 } },
      { slot: "price", x: 0.5, y: 0.37, w: 0.92, size: 0.1, align: "center", vc: true, oneLine: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.5, w: 0.88, size: 0.034, align: "center", vc: true, look: { color: W1 } },
      { slot: "sub", x: 0.5, y: 0.6, w: 0.86, size: 0.024, align: "center", vc: true, look: { color: "#E0F2F1", bold: false } },
      { slot: "address", x: 0.5, y: 0.75, w: 0.86, size: 0.024, align: "center", vc: true, look: { color: W1 } },
      ...CALL_BAND,
    ],
    qr: { x: 0.87, y: 0.91, size: 0.19, color: "#111827" },
  },
  {
    id: "win_frame", name: "유리창 홍보지 — 테두리", aspect: ["tall"], kind: ["vacancy"], cats: ["realty"], sizes: [WINDOW], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0.03, y: 0.02, w: 0.94, h: 0.016, color: TEAL, alpha: 1 },
      { slot: "panel", x: 0.03, y: 0.02, w: 0.022, h: 0.8, color: TEAL, alpha: 1 },
      { slot: "panel", x: 0.948, y: 0.02, w: 0.022, h: 0.8, color: TEAL, alpha: 1 },
      { slot: "panel", x: 0.03, y: 0.804, w: 0.94, h: 0.016, color: TEAL, alpha: 1 },
      { slot: "panel", x: 0, y: 0.82, w: 1, h: 0.18, color: "#111827", alpha: 1 },
    ],
    texts: [
      { slot: "title", x: 0.5, y: 0.09, w: 0.8, size: 0.03, align: "center", vc: true, oneLine: true, look: { color: TEAL } },
      { slot: "badge", x: 0.5, y: 0.17, w: 0.7, size: 0.024, align: "center", vc: true, look: { bg: true, bgColor: "#E11D2A", bgOpacity: 1, color: W1 } },
      { slot: "price", x: 0.5, y: 0.36, w: 0.84, size: 0.095, align: "center", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "area", x: 0.5, y: 0.49, w: 0.8, size: 0.032, align: "center", vc: true, look: { color: TEAL } },
      { slot: "sub", x: 0.5, y: 0.59, w: 0.8, size: 0.022, align: "center", vc: true, look: { color: "#374151", bold: false } },
      { slot: "address", x: 0.5, y: 0.73, w: 0.8, size: 0.024, align: "center", vc: true, look: { color: "#374151" } },
      ...CALL_BAND,
    ],
    qr: { x: 0.87, y: 0.91, size: 0.19, color: "#111827" },
  },
  /* ── 명함 세트 앞면 (2026-10-30 사장님: 앞뒤 세트) — 앞면은 로고와 상호만, 연락처·QR·SNS 는 뒷면에 ── */
  {
    id: "bcf_orange", name: "명함 세트 — 주황 · 건물 로고", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#F2A65A", alpha: 1 }],
    picts: [{ id: "town", x: 0.5, y: 0.34, size: 0.36, color: W1 }],
    texts: [{ slot: "office", x: 0.5, y: 0.72, w: 0.8, size: 0.13, align: "center", vc: true, look: { color: W1 } }],
  },
  {
    id: "bcf_houses", name: "명함 세트 — 갈색 · 두 집 로고", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#6B5E55", alpha: 1 }],
    picts: [{ id: "houses", x: 0.5, y: 0.36, size: 0.36, color: W1 }],
    texts: [{ slot: "office", x: 0.5, y: 0.72, w: 0.8, size: 0.11, align: "center", vc: true, look: { color: W1 } }],
  },
  {
    id: "bcf_navy_gold", name: "명함 세트 — 남색 · 금색 테두리", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#1B2A4A", alpha: 1 },
      { slot: "panel", x: 0.04, y: 0.07, w: 0.92, h: 0.006, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.04, y: 0.924, w: 0.92, h: 0.006, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.04, y: 0.07, w: 0.0034, h: 0.86, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.9566, y: 0.07, w: 0.0034, h: 0.86, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.3, y: 0.76, w: 0.4, h: 0.004, color: "#C9A35B", alpha: 1 },
    ],
    picts: [{ id: "roof", x: 0.5, y: 0.32, size: 0.3, color: "#C9A35B" }],
    texts: [{ slot: "office", x: 0.5, y: 0.64, w: 0.8, size: 0.12, align: "center", vc: true, look: { color: "#E2C384" } }],
  },
  {
    id: "bcf_orange_big", name: "명함 세트 — 진주황 · 집 로고", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#EA580C", alpha: 1 }],
    picts: [{ id: "home", x: 0.5, y: 0.33, size: 0.34, color: W1 }],
    texts: [{ slot: "office", x: 0.5, y: 0.7, w: 0.8, size: 0.15, align: "center", vc: true, look: { color: W1, font: "Black Han Sans" } }],
  },
  {
    id: "bcf_green", name: "명함 세트 — 진초록 · 집과 잎", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0B5D51", alpha: 1 }],
    picts: [{ id: "house_leaf", x: 0.5, y: 0.35, size: 0.38, color: "#A3E635" }],
    texts: [{ slot: "office", x: 0.5, y: 0.73, w: 0.8, size: 0.12, align: "center", vc: true, look: { color: W1 } }],
  },
  /* 파랑 지붕 세트의 뒷면 */
  {
    id: "bcb_blue", name: "명함 뒷면 — 흰 바탕 · 파랑", aspect: ["wide"], kind: ["agency"], cats: [], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 1, h: 0.05, color: "#1D4FB8", alpha: 1 }],
    picts: [{ id: "roof", x: 0.1, y: 0.22, size: 0.18, color: "#1D4FB8" }],
    texts: [
      { slot: "office", x: 0.18, y: 0.22, w: 0.5, size: 0.08, align: "left", vc: true, look: { color: "#1D4FB8" } },
      { slot: "ceo", x: 0.06, y: 0.45, w: 0.6, size: 0.065, align: "left", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.06, y: 0.58, w: 0.6, size: 0.05, align: "left", vc: true, look: { color: "#1D4FB8" }, icon: "phone" },
      { slot: "officeAddr", x: 0.06, y: 0.69, w: 0.6, size: 0.036, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.06, y: 0.78, w: 0.6, size: 0.032, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
    ],
    qr: { x: 0.87, y: 0.6, size: 0.3, color: "#1D4FB8" }, sns: { x: 0.06, y: 0.9, w: 0.88, size: 0.032, color: "#1D4FB8", align: "left" },
  },
  /* ── 부동산 명함 — 집·건물 픽토그램 로고 (2026-10-30 사장님) ── */
  {
    id: "bcp_teal", name: "명함 — 청록 · 집 로고 가운데", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#17A9B5", alpha: 1 }],
    picts: [{ id: "house_smile", x: 0.5, y: 0.27, size: 0.3, color: W1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.58, w: 0.8, size: 0.13, align: "center", vc: true, look: { color: W1 } },
      { slot: "ceo", x: 0.5, y: 0.73, w: 0.8, size: 0.05, align: "center", vc: true, look: { color: "#E0F7F9", bold: false } },
      { slot: "phone", x: 0.5, y: 0.85, w: 0.8, size: 0.065, align: "center", vc: true, look: { color: W1 }, icon: "phone" },
    ],
    qr: { x: 0.9, y: 0.77, size: 0.26, color: "#0E7C86" }, sns: { x: 0.5, y: 0.07, w: 0.8, size: 0.034, color: "#FFFFFF", align: "center" },
  },
  {
    id: "bcp_white_teal", name: "명함 — 흰 바탕 · 청록 로고", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }],
    picts: [{ id: "house_smile", x: 0.11, y: 0.22, size: 0.22, color: "#17A9B5" }],
    texts: [
      { slot: "office", x: 0.2, y: 0.18, w: 0.56, size: 0.1, align: "left", vc: true, look: { color: "#17A9B5" } },
      { slot: "regNum", x: 0.2, y: 0.29, w: 0.72, size: 0.036, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
      { slot: "ceo", x: 0.94, y: 0.55, w: 0.5, size: 0.05, align: "right", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.94, y: 0.68, w: 0.5, size: 0.08, align: "right", vc: true, look: { color: "#17A9B5" } },
      { slot: "officeAddr", x: 0.06, y: 0.84, w: 0.62, size: 0.042, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
    ],
    qr: { x: 0.89, y: 0.22, size: 0.28, color: "#0E7C86" }, sns: { x: 0.06, y: 0.95, w: 0.88, size: 0.032, color: "#0E7C86", align: "left" },
  },
  {
    id: "bcp_blue_roof", name: "명함 — 파랑 · 지붕 로고", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#1D4FB8", alpha: 1 }],
    picts: [{ id: "roof", x: 0.5, y: 0.24, size: 0.32, color: W1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.55, w: 0.8, size: 0.13, align: "center", vc: true, look: { color: W1 } },
      { slot: "ceo", x: 0.5, y: 0.7, w: 0.8, size: 0.048, align: "center", vc: true, look: { color: "#DBEAFE", bold: false } },
      { slot: "phone", x: 0.5, y: 0.83, w: 0.8, size: 0.065, align: "center", vc: true, look: { color: Y }, icon: "phone" },
    ],
    qr: { x: 0.9, y: 0.77, size: 0.26, color: "#1D4FB8" }, sns: { x: 0.5, y: 0.07, w: 0.8, size: 0.034, color: "#FFFFFF", align: "center" },
  },
  {
    id: "bcp_orange_town", name: "명함 — 주황 판 · 건물 로고", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 0.44, h: 1, color: "#F2A65A", alpha: 1 }],
    picts: [{ id: "town", x: 0.22, y: 0.33, size: 0.32, color: W1 }],
    texts: [
      { slot: "office", x: 0.22, y: 0.68, w: 0.38, size: 0.1, align: "center", vc: true, look: { color: W1 } },
      { slot: "ceo", x: 0.5, y: 0.2, w: 0.3, size: 0.065, align: "left", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.5, y: 0.42, w: 0.46, size: 0.055, align: "left", vc: true, look: { color: "#C2410C" }, icon: "phone" },
      { slot: "officeAddr", x: 0.5, y: 0.58, w: 0.46, size: 0.038, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.5, y: 0.84, w: 0.46, size: 0.034, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
    ],
    qr: { x: 0.89, y: 0.22, size: 0.26, color: "#C2410C" }, sns: { x: 0.5, y: 0.71, w: 0.46, size: 0.034, color: "#C2410C", align: "left" },
  },
  {
    id: "bcp_houses_line", name: "명함 — 흰 바탕 · 두 집 로고 · 세로줄", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0.37, y: 0.14, w: 0.004, h: 0.72, color: "#6B5E55", alpha: 1 }],
    picts: [{ id: "houses", x: 0.185, y: 0.4, size: 0.3, color: "#6B5E55" }],
    texts: [
      { slot: "office", x: 0.185, y: 0.68, w: 0.3, size: 0.07, align: "center", vc: true, look: { color: "#6B5E55" } },
      { slot: "ceo", x: 0.43, y: 0.24, w: 0.36, size: 0.07, align: "left", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.43, y: 0.52, w: 0.52, size: 0.05, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "phone" },
      { slot: "officeAddr", x: 0.43, y: 0.66, w: 0.52, size: 0.042, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.43, y: 0.8, w: 0.52, size: 0.034, align: "left", vc: true, look: { color: "#9CA3AF", bold: false } },
    ],
    qr: { x: 0.89, y: 0.25, size: 0.26, color: "#4B3F37" }, sns: { x: 0.43, y: 0.92, w: 0.52, size: 0.032, color: "#6B5E55", align: "left" },
  },
  {
    id: "bcp_navy_gold", name: "명함 — 남색 · 금색 테두리", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#1B2A4A", alpha: 1 },
      { slot: "panel", x: 0.04, y: 0.07, w: 0.92, h: 0.006, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.04, y: 0.924, w: 0.92, h: 0.006, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.04, y: 0.07, w: 0.0034, h: 0.86, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.9566, y: 0.07, w: 0.0034, h: 0.86, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.1, y: 0.47, w: 0.56, h: 0.004, color: "#C9A35B", alpha: 1 },
    ],
    picts: [{ id: "roof", x: 0.83, y: 0.3, size: 0.24, color: "#C9A35B" }],
    texts: [
      { slot: "office", x: 0.1, y: 0.26, w: 0.62, size: 0.11, align: "left", vc: true, look: { color: "#E2C384" } },
      { slot: "ceo", x: 0.1, y: 0.39, w: 0.62, size: 0.045, align: "left", vc: true, look: { color: "#E7D3A8", bold: false } },
      { slot: "phone", x: 0.1, y: 0.56, w: 0.62, size: 0.05, align: "left", vc: true, look: { color: W1 }, icon: "phone" },
      { slot: "officeAddr", x: 0.1, y: 0.66, w: 0.62, size: 0.038, align: "left", vc: true, look: { color: "#CBD5E1", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.1, y: 0.75, w: 0.62, size: 0.032, align: "left", vc: true, look: { color: "#94A3B8", bold: false } },
    ],
    qr: { x: 0.84, y: 0.7, size: 0.28, color: "#1B2A4A" }, sns: { x: 0.1, y: 0.85, w: 0.62, size: 0.032, color: "#E2C384", align: "left" },
  },
  {
    id: "bcp_bigphone", name: "명함 — 흰 바탕 · 큰 전화번호", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0.94, w: 1, h: 0.06, color: "#EA580C", alpha: 1 }],
    picts: [],
    texts: [
      { slot: "office", x: 0.06, y: 0.15, w: 0.6, size: 0.075, align: "left", vc: true, look: { bg: true, bgColor: "#EA580C", bgOpacity: 1, color: W1, bgPad: 1.1 } },
      { slot: "ceo", x: 0.06, y: 0.33, w: 0.6, size: 0.06, align: "left", vc: true, look: { color: INK } },
      { slot: "officeAddr", x: 0.06, y: 0.48, w: 0.6, size: 0.038, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.06, y: 0.58, w: 0.6, size: 0.032, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
      { slot: "phone", x: 0.94, y: 0.8, w: 0.88, size: 0.13, align: "right", vc: true, look: { color: "#EA580C", font: "Black Han Sans" }, icon: "phone" },
    ],
    qr: { x: 0.88, y: 0.26, size: 0.3, color: "#EA580C" }, sns: { x: 0.06, y: 0.68, w: 0.6, size: 0.034, color: "#EA580C", align: "left" },
  },
  {
    id: "bcp_green_leaf", name: "명함 — 진초록 · 집과 잎 로고", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0B5D51", alpha: 1 }],
    picts: [{ id: "house_leaf", x: 0.17, y: 0.46, size: 0.34, color: "#A3E635" }],
    texts: [
      { slot: "office", x: 0.33, y: 0.3, w: 0.46, size: 0.12, align: "left", vc: true, look: { color: W1 } },
      { slot: "ceo", x: 0.33, y: 0.46, w: 0.46, size: 0.048, align: "left", vc: true, look: { color: "#D1FAE5", bold: false } },
      { slot: "phone", x: 0.33, y: 0.62, w: 0.62, size: 0.055, align: "left", vc: true, look: { color: W1 }, icon: "phone" },
      { slot: "officeAddr", x: 0.33, y: 0.75, w: 0.62, size: 0.036, align: "left", vc: true, look: { color: "#A7F3D0", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.33, y: 0.86, w: 0.62, size: 0.032, align: "left", vc: true, look: { color: "#86C5B5", bold: false } },
    ],
    qr: { x: 0.88, y: 0.3, size: 0.26, color: "#0B5D51" }, sns: { x: 0.33, y: 0.95, w: 0.62, size: 0.03, color: "#A3E635", align: "left" },
  },
  /* ── 부동산 명함 2 — 앞·뒷면 샘플 6면 (2026-10-30 사장님 보낸 그림) ── */
  {
    id: "bcq_navy_roof", name: "명함 — 남색 · 노랑 상호 · 지붕선", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#1F3557", alpha: 1 }],
    picts: [{ id: "roof_line", x: 0.5, y: 0.25, size: 0.26, color: W1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.5, w: 0.8, size: 0.13, align: "center", vc: true, look: { color: "#F5A623" } },
      { slot: "ceo", x: 0.5, y: 0.65, w: 0.6, size: 0.045, align: "center", vc: true, look: { color: "#CBD5E1", bold: false } },
      { slot: "phone", x: 0.5, y: 0.75, w: 0.6, size: 0.05, align: "center", vc: true, look: { color: W1 }, icon: "phone" },
    ],
    qr: { x: 0.9, y: 0.8, size: 0.24, color: "#1F3557" }, sns: { x: 0.5, y: 0.9, w: 0.66, size: 0.032, color: "#F5A623", align: "center" },
  },
  {
    id: "bcq_white_orange", name: "명함 — 흰 바탕 · 큰 주황 집선", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }],
    picts: [{ id: "house_line", x: 0.68, y: 0.56, size: 0.95, color: "#F5A623" }],
    texts: [
      { slot: "office", x: 0.95, y: 0.12, w: 0.4, size: 0.07, align: "right", vc: true, look: { color: "#F5A623" } },
      { slot: "ceo", x: 0.07, y: 0.4, w: 0.5, size: 0.075, align: "left", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.07, y: 0.55, w: 0.5, size: 0.042, align: "left", vc: true, look: { color: "#F5A623" }, icon: "phone" },
      { slot: "officeAddr", x: 0.07, y: 0.65, w: 0.5, size: 0.034, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.07, y: 0.74, w: 0.5, size: 0.03, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
    ],
    qr: { x: 0.68, y: 0.72, size: 0.26, color: "#B76E00" }, sns: { x: 0.07, y: 0.88, w: 0.5, size: 0.03, color: "#F5A623", align: "left" },
  },
  {
    id: "bcq_gray_coral", name: "명함 — 진회색 · 코랄 띠 · 집선", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#44474F", alpha: 1 }, { slot: "panel", x: 0, y: 0.66, w: 1, h: 0.08, color: "#F26B5B", alpha: 1 }],
    picts: [{ id: "house_line", x: 0.5, y: 0.33, size: 0.5, color: "#F26B5B" }],
    texts: [
      { slot: "office", x: 0.5, y: 0.45, w: 0.7, size: 0.12, align: "center", vc: true, look: { color: W1 } },
      { slot: "phone", x: 0.5, y: 0.7, w: 0.8, size: 0.042, align: "center", vc: true, look: { color: W1 }, icon: "phone" },
    ],
    qr: { x: 0.9, y: 0.25, size: 0.22, color: "#44474F" }, sns: { x: 0.5, y: 0.86, w: 0.8, size: 0.032, color: "#F9A59B", align: "center" },
  },
  {
    id: "bcq_split_coral", name: "명함 — 흰 바탕 · 오른쪽 진회색 판 · 코랄", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0.48, y: 0, w: 0.52, h: 1, color: "#44474F", alpha: 1 },
      { slot: "panel", x: 0.48, y: 0, w: 0.014, h: 1, color: "#F26B5B", alpha: 1 },
    ],
    picts: [{ id: "house_line", x: 0.24, y: 0.36, size: 0.36, color: "#F26B5B" }],
    texts: [
      { slot: "office", x: 0.24, y: 0.66, w: 0.4, size: 0.08, align: "center", vc: true, look: { color: "#F26B5B" } },
      { slot: "ceo", x: 0.54, y: 0.2, w: 0.42, size: 0.065, align: "left", vc: true, look: { color: W1 } },
      { slot: "phone", x: 0.54, y: 0.36, w: 0.42, size: 0.04, align: "left", vc: true, look: { color: W1, bold: false }, icon: "phone" },
      { slot: "officeAddr", x: 0.54, y: 0.46, w: 0.42, size: 0.032, align: "left", vc: true, look: { color: "#E5E7EB", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.54, y: 0.55, w: 0.42, size: 0.028, align: "left", vc: true, look: { color: "#9CA3AF", bold: false } },
    ],
    qr: { x: 0.9, y: 0.8, size: 0.24, color: "#44474F" }, sns: { x: 0.24, y: 0.86, w: 0.42, size: 0.03, color: "#F26B5B", align: "center" },
  },
  {
    id: "bcq_black_tower", name: "명함 — 검정 · 건물 로고 · 흰 줄", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#1E1E1E", alpha: 1 }, { slot: "panel", x: 0.2, y: 0.64, w: 0.6, h: 0.005, color: "#FFFFFF", alpha: 1 }],
    picts: [{ id: "town", x: 0.5, y: 0.26, size: 0.28, color: W1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.52, w: 0.7, size: 0.12, align: "center", vc: true, look: { color: W1 } },
      { slot: "phone", x: 0.5, y: 0.74, w: 0.7, size: 0.042, align: "center", vc: true, look: { color: "#E5E7EB", bold: false }, icon: "phone" },
    ],
    qr: { x: 0.9, y: 0.22, size: 0.22, color: "#1E1E1E" }, sns: { x: 0.5, y: 0.87, w: 0.8, size: 0.032, color: "#9CA3AF", align: "center" },
  },
  {
    id: "bcq_white_mint", name: "명함 — 흰 바탕 · 민트 빌딩", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }],
    picts: [{ id: "tower", x: 0.82, y: 0.68, size: 0.62, color: "#1EC8B0" }],
    texts: [
      { slot: "office", x: 0.07, y: 0.15, w: 0.55, size: 0.085, align: "left", vc: true, look: { color: "#13A894" } },
      { slot: "ceo", x: 0.07, y: 0.42, w: 0.55, size: 0.07, align: "left", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.07, y: 0.55, w: 0.55, size: 0.04, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "phone" },
      { slot: "officeAddr", x: 0.07, y: 0.64, w: 0.55, size: 0.032, align: "left", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.07, y: 0.73, w: 0.55, size: 0.028, align: "left", vc: true, look: { color: "#6B7280", bold: false } },
    ],
    qr: { x: 0.88, y: 0.18, size: 0.24, color: "#0F7F70" }, sns: { x: 0.07, y: 0.87, w: 0.55, size: 0.03, color: "#13A894", align: "left" },
  },
  /* 명함 (중개사무소 정보로) */
  {
    id: "bc_navy", name: "명함 — 남색 바탕", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "office", x: 0.08, y: 0.14, w: 0.86, size: 0.13, align: "left", look: { color: W1 } },
      { slot: "ceo", x: 0.08, y: 0.37, w: 0.86, size: 0.07, align: "left", look: { color: Y } },
      { slot: "phone", x: 0.08, y: 0.57, w: 0.86, size: 0.065, align: "left", look: { color: W1, bold: false }, icon: "phone" },
      { slot: "officeAddr", x: 0.08, y: 0.71, w: 0.86, size: 0.045, align: "left", look: { color: "#CBD5E1", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.08, y: 0.85, w: 0.86, size: 0.04, align: "left", look: { color: "#94A3B8", bold: false } },
    ],
  },
  {
    id: "bc_center", name: "명함 — 가운데 정렬", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0.3, y: 0.5, w: 0.4, h: 0.006, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.25, w: 0.9, size: 0.14, align: "center", vc: true, look: { color: "#0F1F3D" } },
      { slot: "ceo", x: 0.5, y: 0.4, w: 0.9, size: 0.065, align: "center", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.5, y: 0.62, w: 0.9, size: 0.06, align: "center", vc: true, look: { color: INK, bold: false }, icon: "phone" },
      { slot: "officeAddr", x: 0.5, y: 0.75, w: 0.9, size: 0.042, align: "center", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.5, y: 0.87, w: 0.9, size: 0.038, align: "center", vc: true, look: { color: "#6B7280", bold: false } },
    ],
  },
  {
    id: "bc_band", name: "명함 — 왼쪽 남색 판", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 0.34, h: 1, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "office", x: 0.17, y: 0.5, w: 0.3, size: 0.1, align: "center", vc: true, look: { color: W1 } },
      { slot: "ceo", x: 0.4, y: 0.14, w: 0.56, size: 0.075, align: "left", look: { color: INK } },
      { slot: "phone", x: 0.4, y: 0.38, w: 0.56, size: 0.06, align: "left", look: { color: INK, bold: false }, icon: "phone" },
      { slot: "officeAddr", x: 0.4, y: 0.56, w: 0.56, size: 0.042, align: "left", look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.4, y: 0.8, w: 0.56, size: 0.038, align: "left", look: { color: "#6B7280", bold: false } },
    ],
  },
  {
    id: "bc_yellow", name: "명함 — 노란 바탕", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: Y, alpha: 1 }, { slot: "panel", x: 0, y: 0.8, w: 1, h: 0.2, color: INK, alpha: 1 }],
    texts: [
      { slot: "office", x: 0.07, y: 0.1, w: 0.86, size: 0.15, align: "left", look: { color: INK, font: "Black Han Sans" } },
      { slot: "ceo", x: 0.07, y: 0.37, w: 0.86, size: 0.07, align: "left", look: { color: INK } },
      { slot: "phone", x: 0.07, y: 0.53, w: 0.86, size: 0.065, align: "left", look: { color: INK }, icon: "phone" },
      { slot: "regNum", x: 0.07, y: 0.68, w: 0.86, size: 0.038, align: "left", look: { color: "#374151", bold: false } },
      { slot: "officeAddr", x: 0.5, y: 0.9, w: 0.9, size: 0.042, align: "center", vc: true, look: { color: W1, bold: false }, icon: "pin" },
    ],
  },
  {
    id: "bc_red", name: "명함 — 위 빨간 띠", aspect: ["wide"], kind: ["agency"], cats: ["realty"], sizes: BIZ, bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 1, h: 0.3, color: "#E11D48", alpha: 1 }],
    texts: [
      { slot: "office", x: 0.07, y: 0.15, w: 0.86, size: 0.12, align: "left", vc: true, look: { color: W1 } },
      { slot: "ceo", x: 0.07, y: 0.38, w: 0.86, size: 0.07, align: "left", look: { color: INK } },
      { slot: "phone", x: 0.07, y: 0.55, w: 0.86, size: 0.06, align: "left", look: { color: INK, bold: false }, icon: "phone" },
      { slot: "officeAddr", x: 0.07, y: 0.69, w: 0.86, size: 0.042, align: "left", look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.07, y: 0.83, w: 0.86, size: 0.038, align: "left", look: { color: "#6B7280", bold: false } },
    ],
  },
  /* ── 유튜브 썸네일 — 사장님이 보내 준 참고 4장 느낌 (2026-10-30): 예능 두꺼운 테 · 검은 띠 큰 글 · 노랑 판 · 꿀팁 흰 상자 ── */
  {
    id: "ytref_variety", name: "유튜브 — 예능 (보라 테 · 분홍 테두리 큰 글)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "shade", x: 0, y: 0.42, w: 1, h: 0.58, color: "#000000", alpha: 0.55, grad: "down" },
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.03, color: "#A78BFA", alpha: 1 },
      { slot: "panel", x: 0, y: 0.97, w: 1, h: 0.03, color: "#A78BFA", alpha: 1 },
      { slot: "panel", x: 0, y: 0, w: 0.017, h: 1, color: "#A78BFA", alpha: 1 },
      { slot: "panel", x: 0.983, y: 0, w: 0.017, h: 1, color: "#A78BFA", alpha: 1 },
    ],
    texts: [
      { slot: "badge", x: 0.045, y: 0.07, w: 0.3, size: 0.06, align: "left", look: { bg: true, bgColor: "#7C3AED", bgOpacity: 1, color: W1, font: "Black Han Sans", bgPad: 1.1 } },
      { slot: "label", x: 0.045, y: 0.07, w: 0.3, size: 0.06, align: "left", look: { bg: true, bgColor: "#7C3AED", bgOpacity: 1, color: W1, font: "Black Han Sans", bgPad: 1.1 } },
      { slot: "agency", x: 0.955, y: 0.07, w: 0.4, size: 0.032, align: "right", look: { color: W1, bold: false, ...shadow } },
      { slot: "price", x: 0.955, y: 0.14, w: 0.4, size: 0.05, align: "right", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "sub", x: 0.05, y: 0.42, w: 0.62, size: 0.045, align: "left", look: { font: "Nanum Pen", color: W1, outline: "#000000", outlineWidth: 4 } },
      { slot: "title", x: 0.05, y: 0.52, w: 0.62, size: 0.14, align: "left", look: { color: W1, font: "Jua", outline: "#E11D48", outlineWidth: 7, outline2: "#000000", outline2Width: 4 } },
    ],
  },
  {
    id: "ytref_band", name: "유튜브 — 검은 띠 하늘색 큰 글 (하늘 테)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.18 },
      { slot: "panel", x: 0, y: 0.5, w: 1, h: 0.27, color: "#111111", alpha: 0.94 },
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.035, color: "#22D3EE", alpha: 1 },
      { slot: "panel", x: 0, y: 0.965, w: 1, h: 0.035, color: "#22D3EE", alpha: 1 },
      { slot: "panel", x: 0, y: 0, w: 0.02, h: 1, color: "#22D3EE", alpha: 1 },
      { slot: "panel", x: 0.98, y: 0, w: 0.02, h: 1, color: "#22D3EE", alpha: 1 },
    ],
    texts: [
      { slot: "badge", x: 0.5, y: 0.13, w: 0.8, size: 0.075, align: "center", look: { color: "#FACC15", font: "Black Han Sans", outline: "#000000", outlineWidth: 6 } },
      { slot: "label", x: 0.5, y: 0.13, w: 0.8, size: 0.075, align: "center", look: { color: "#FACC15", font: "Black Han Sans", outline: "#000000", outlineWidth: 6 } },
      { slot: "sub", x: 0.5, y: 0.27, w: 0.86, size: 0.075, align: "center", look: { color: W1, font: "Black Han Sans", outline: "#000000", outlineWidth: 6 } },
      { slot: "title", x: 0.5, y: 0.635, w: 0.9, size: 0.16, align: "center", vc: true, look: { color: "#22D3EE", font: "Black Han Sans" } },
      { slot: "price", x: 0.04, y: 0.83, w: 0.5, size: 0.055, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "agency", x: 0.96, y: 0.85, w: 0.45, size: 0.032, align: "right", look: { color: W1, bold: false, ...shadow } },
    ],
  },
  {
    id: "ytref_yellow", name: "유튜브 — 노랑 판 · 가운데 사진", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0.3, y: 0, w: 0.4, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 0.3, h: 1, color: "#FACC15", alpha: 1 },
      { slot: "panel", x: 0.7, y: 0, w: 0.3, h: 1, color: "#FACC15", alpha: 1 },
      { slot: "panel", x: 0.12, y: 0.77, w: 0.76, h: 0.16, color: "#2B1A0E", alpha: 1 },
    ],
    // 금액은 아래 띠 가운데 (2026-10-30 사장님) — 키워드는 왼쪽에 짧게
    texts: [
      { slot: "title", x: 0.03, y: 0.1, w: 0.26, size: 0.15, align: "left", look: { color: "#2B1A0E", font: "Do Hyeon" } },
      { slot: "sub", x: 0.97, y: 0.1, w: 0.26, size: 0.1, align: "right", look: { color: "#2B1A0E", font: "Do Hyeon" } },
      { slot: "badge", x: 0.15, y: 0.85, w: 0.14, size: 0.07, align: "left", vc: true, look: { color: "#FACC15", font: "Black Han Sans" } },
      { slot: "label", x: 0.15, y: 0.85, w: 0.14, size: 0.07, align: "left", vc: true, look: { color: "#FACC15", font: "Black Han Sans" } },
      { slot: "price", x: 0.5, y: 0.85, w: 0.4, size: 0.07, align: "center", oneLine: true, vc: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "agency", x: 0.97, y: 0.94, w: 0.26, size: 0.028, align: "right", look: { color: "#2B1A0E", bold: false } },
    ],
  },
  {
    id: "ytref_tip", name: "유튜브 — 꿀팁 (흰 상자 · 민트 큰 글)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.45, w: 1, h: 0.55, color: "#000000", alpha: 0.9, grad: "down" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.032, align: "left", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.97, y: 0.06, w: 0.35, size: 0.06, align: "right", look: { bg: true, bgColor: "#5EEAD4", bgOpacity: 1, color: INK, font: "Black Han Sans", bgPad: 1.1 } },
      { slot: "label", x: 0.97, y: 0.06, w: 0.35, size: 0.06, align: "right", look: { bg: true, bgColor: "#5EEAD4", bgOpacity: 1, color: INK, font: "Black Han Sans", bgPad: 1.1 } },
      { slot: "sub", x: 0.03, y: 0.6, w: 0.62, size: 0.07, align: "left", look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: INK, bgPad: 1.1 } },
      { slot: "price", x: 0.97, y: 0.6, w: 0.32, size: 0.06, align: "right", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "title", x: 0.03, y: 0.76, w: 0.94, size: 0.14, align: "left", look: { color: "#5EEAD4", font: "GmarketSans", outline: "#000000", outlineWidth: 4 } },
    ],
  },
  /* ── 블로그 타이틀 966×300 (2026-10-30 사장님) — 내 중개사무소 정보로 ── */
  {
    id: "bltitle_navy", name: "블로그 타이틀 — 남색", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_TITLE], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.06, y: 0.15, w: 0.4, size: 0.08, align: "left", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.06, y: 0.5, w: 0.55, size: 0.22, align: "left", vc: true, look: { color: W1 } },
      { slot: "phone", x: 0.94, y: 0.36, w: 0.36, size: 0.1, align: "right", look: { color: Y }, icon: "phone" },
      { slot: "officeAddr", x: 0.94, y: 0.56, w: 0.36, size: 0.07, align: "right", look: { color: "#CBD5E1", bold: false }, icon: "pin" },
    ],
  },
  {
    id: "bltitle_white", name: "블로그 타이틀 — 흰 바탕 · 남색 줄", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_TITLE], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0, y: 0, w: 0.02, h: 1, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.06, y: 0.8, w: 0.4, size: 0.07, align: "left", vc: true, look: { bg: true, bgColor: "#0F1F3D", bgOpacity: 1, color: W1 } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.06, y: 0.26, w: 0.55, size: 0.2, align: "left", look: { color: "#0F1F3D" } },
      { slot: "ceo", x: 0.06, y: 0.58, w: 0.55, size: 0.08, align: "left", look: { color: INK, bold: false } },
      { slot: "phone", x: 0.94, y: 0.5, w: 0.34, size: 0.11, align: "right", vc: true, look: { color: "#0F1F3D" }, icon: "phone" },
    ],
  },
  {
    id: "bltitle_photo", name: "블로그 타이틀 — 사진 · 왼쪽 글", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_TITLE], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 0.75, h: 1, color: "#000000", alpha: 0.78, grad: "left" }],
    texts: [
      { slot: "badge", x: 0.06, y: 0.14, w: 0.4, size: 0.07, align: "left", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.06, y: 0.3, w: 0.55, size: 0.2, align: "left", look: { color: W1, ...shadow } },
      { slot: "phone", x: 0.06, y: 0.64, w: 0.5, size: 0.1, align: "left", look: { color: Y }, icon: "phone" },
    ],
  },
  {
    id: "bltitle_yellow", name: "블로그 타이틀 — 노랑 가운데", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_TITLE], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: Y, alpha: 1 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.15, w: 0.5, size: 0.07, align: "center", vc: true, look: { bg: true, bgColor: INK, bgOpacity: 1, color: Y } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.5, y: 0.42, w: 0.8, size: 0.22, align: "center", vc: true, look: { color: INK } },
      { slot: "phone", x: 0.5, y: 0.68, w: 0.6, size: 0.09, align: "center", look: { color: INK }, icon: "phone" },
    ],
  },
  {
    id: "bltitle_card", name: "블로그 타이틀 — 사진 · 가운데 판", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_TITLE], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.35 }, { slot: "card", x: 0.2, y: 0.16, w: 0.6, h: 0.68, color: "#0F1F3D", alpha: 0.88, radius: 12 }],
    texts: [
      { slot: "badge", x: 0.5, y: 0.25, w: 0.5, size: 0.06, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.5, y: 0.4, w: 0.55, size: 0.18, align: "center", vc: true, look: { color: W1 } },
      { slot: "phone", x: 0.5, y: 0.6, w: 0.55, size: 0.09, align: "center", look: { color: Y }, icon: "phone" },
    ],
  },
  /* ── 블로그 로고 (프로필) 500×500 — 상호 하나만, 단순하게 ── */
  {
    id: "bllogo_navy", name: "블로그 로고 — 남색", aspect: ["square"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0F1F3D", alpha: 1 }],
    picts: [{ id: "roof", x: 0.5, y: 0.36, size: 0.3, color: W1 }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.66, w: 0.74, size: 0.14, align: "center", vc: true, look: { color: W1 } }],
  },
  {
    id: "bllogo_yellow", name: "블로그 로고 — 노랑", aspect: ["square"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: Y, alpha: 1 }],
    picts: [{ id: "house_smile", x: 0.5, y: 0.36, size: 0.32, color: INK }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.68, w: 0.74, size: 0.14, align: "center", vc: true, look: { color: INK } }],
  },
  {
    id: "bllogo_green", name: "블로그 로고 — 초록", aspect: ["square"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#005F4D", alpha: 1 }],
    picts: [{ id: "house_leaf", x: 0.5, y: 0.36, size: 0.32, color: "#A3E635" }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.68, w: 0.74, size: 0.14, align: "center", vc: true, look: { color: W1 } }],
  },
  {
    id: "bllogo_white", name: "블로그 로고 — 흰 바탕 · 남색 글", aspect: ["square"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0.38, y: 0.74, w: 0.24, h: 0.02, color: Y, alpha: 1 }],
    picts: [{ id: "houses", x: 0.5, y: 0.33, size: 0.3, color: "#0F1F3D" }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.62, w: 0.74, size: 0.14, align: "center", vc: true, look: { color: "#0F1F3D" } }],
  },
  {
    id: "bllogo_ring", name: "블로그 로고 — 남색 동그라미", aspect: ["square"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "card", x: 0.1, y: 0.1, w: 0.8, h: 0.8, color: "#0F1F3D", alpha: 1, radius: 200 }],
    picts: [{ id: "roof", x: 0.5, y: 0.38, size: 0.2, color: Y }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.6, w: 0.56, size: 0.11, align: "center", vc: true, look: { color: W1 } }],
  },
  /* ── 블로그 스킨 1920×1080 — 사무소 정보를 다 채운다 (2026-10-30 사장님: "글씨를 다 채워줘야지").
     블로그 글이 놓이는 가운데 아래쪽만 비우고, 위 머리글·양옆에 상호·대표·전화·주소·등록번호 ── */
  {
    id: "blskin_band", name: "블로그 스킨 — 연회색 · 위 남색 띠", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_SKIN], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#F3F4F6", alpha: 1 },
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.34, color: "#0F1F3D", alpha: 1 },
      { slot: "panel", x: 0.46, y: 0.205, w: 0.08, h: 0.005, color: Y, alpha: 1 },
      { slot: "panel", x: 0, y: 0.92, w: 1, h: 0.08, color: "#0F1F3D", alpha: 1 },
    ],
    texts: [
      { slot: "badge", x: 0.04, y: 0.06, w: 0.3, size: 0.03, align: "left", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.5, y: 0.12, w: 0.6, size: 0.1, align: "center", vc: true, look: { color: W1 } },
      { slot: "ceo", x: 0.5, y: 0.245, w: 0.6, size: 0.032, align: "center", vc: true, look: { color: "#CBD5E1", bold: false } },
      { slot: "phone", x: 0.5, y: 0.3, w: 0.6, size: 0.036, align: "center", vc: true, look: { color: Y }, icon: "phone" },
      { slot: "officeAddr", x: 0.04, y: 0.96, w: 0.6, size: 0.024, align: "left", vc: true, look: { color: W1, bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.96, y: 0.96, w: 0.3, size: 0.022, align: "right", vc: true, look: { color: "#CBD5E1", bold: false } },
    ],
  },
  {
    id: "blskin_photo_top", name: "블로그 스킨 — 위 사진 · 아래 흰 바탕", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_SKIN], bg: { x: 0, y: 0, w: 1, h: 0.45 },
    boxes: [
      { slot: "shade", x: 0, y: 0, w: 1, h: 0.45, color: "#000000", alpha: 0.45 },
      { slot: "panel", x: 0, y: 0.45, w: 1, h: 0.55, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0, y: 0.45, w: 1, h: 0.012, color: Y, alpha: 1 },
    ],
    texts: [
      { slot: "badge", x: 0.5, y: 0.05, w: 0.5, size: 0.03, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.5, y: 0.15, w: 0.6, size: 0.11, align: "center", vc: true, look: { color: W1, ...shadow } },
      { slot: "ceo", x: 0.5, y: 0.27, w: 0.6, size: 0.034, align: "center", vc: true, look: { color: W1, bold: false, ...shadow } },
      { slot: "phone", x: 0.5, y: 0.35, w: 0.6, size: 0.04, align: "center", vc: true, look: { color: Y, ...shadow }, icon: "phone" },
      { slot: "officeAddr", x: 0.5, y: 0.93, w: 0.7, size: 0.024, align: "center", vc: true, look: { color: "#374151", bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.5, y: 0.97, w: 0.5, size: 0.02, align: "center", vc: true, look: { color: "#6B7280", bold: false } },
    ],
  },
  {
    // 목록에서 뺐다 (2026-10-30 사장님)
    id: "blskin_pillars", name: "블로그 스킨 — 양옆 남색 기둥", aspect: ["wide"], kind: ["agency"], cats: [], sizes: [BLOG_SKIN], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0, y: 0, w: 0.22, h: 1, color: "#0F1F3D", alpha: 1 },
      { slot: "panel", x: 0.78, y: 0, w: 0.22, h: 1, color: "#0F1F3D", alpha: 1 },
      { slot: "panel", x: 0.07, y: 0.3, w: 0.08, h: 0.005, color: Y, alpha: 1 },
    ],
    texts: [
      { slot: "badge", x: 0.11, y: 0.52, w: 0.19, size: 0.026, align: "center", vc: true, look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.11, y: 0.2, w: 0.19, size: 0.056, align: "center", vc: true, look: { color: W1 } },
      { slot: "ceo", x: 0.11, y: 0.36, w: 0.19, size: 0.026, align: "center", vc: true, look: { color: "#CBD5E1", bold: false } },
      { slot: "phone", x: 0.11, y: 0.43, w: 0.19, size: 0.03, align: "center", vc: true, look: { color: Y }, icon: "phone" },
      { slot: "officeAddr", x: 0.89, y: 0.2, w: 0.19, size: 0.024, align: "center", vc: true, look: { color: W1, bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.89, y: 0.28, w: 0.19, size: 0.022, align: "center", vc: true, look: { color: "#CBD5E1", bold: false } },
    ],
  },
  {
    id: "blskin_yellow", name: "블로그 스킨 — 노랑 · 가운데 흰 판", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_SKIN], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: Y, alpha: 1 },
      { slot: "panel", x: 0.24, y: 0, w: 0.52, h: 1, color: "#FFFFFF", alpha: 1 },
      { slot: "panel", x: 0.46, y: 0.2, w: 0.08, h: 0.005, color: "#0F1F3D", alpha: 1 },
    ],
    texts: [
      { slot: "badge", x: 0.12, y: 0.4, w: 0.21, size: 0.026, align: "center", vc: true, look: { bg: true, bgColor: INK, bgOpacity: 1, color: Y } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.5, y: 0.11, w: 0.48, size: 0.095, align: "center", vc: true, look: { color: INK } },
      { slot: "ceo", x: 0.5, y: 0.24, w: 0.48, size: 0.03, align: "center", vc: true, look: { color: "#374151", bold: false } },
      { slot: "phone", x: 0.5, y: 0.3, w: 0.48, size: 0.036, align: "center", vc: true, look: { color: INK }, icon: "phone" },
      { slot: "officeAddr", x: 0.12, y: 0.5, w: 0.21, size: 0.024, align: "center", vc: true, look: { color: INK, bold: false }, icon: "pin" },
      { slot: "regNum", x: 0.88, y: 0.5, w: 0.21, size: 0.022, align: "center", vc: true, look: { color: INK, bold: false } },
    ],
  },
  {
    id: "blskin_photo", name: "블로그 스킨 — 사진 · 가운데 흰 판", aspect: ["wide"], kind: ["agency"], cats: ["blog"], sizes: [BLOG_SKIN], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.35 },
      { slot: "panel", x: 0.24, y: 0, w: 0.52, h: 1, color: "#FFFFFF", alpha: 0.95 },
      { slot: "panel", x: 0.24, y: 0, w: 0.52, h: 0.012, color: "#0F1F3D", alpha: 1 },
    ],
    texts: [
      { slot: "badge", x: 0.5, y: 0.35, w: 0.48, size: 0.026, align: "center", vc: true, look: { bg: true, bgColor: "#0F1F3D", bgOpacity: 1, color: W1 } }, // #키워드 (2026-10-30 사장님)
      { slot: "office", x: 0.5, y: 0.11, w: 0.48, size: 0.095, align: "center", vc: true, look: { color: "#0F1F3D" } },
      { slot: "ceo", x: 0.5, y: 0.22, w: 0.48, size: 0.03, align: "center", vc: true, look: { color: "#374151", bold: false } },
      { slot: "phone", x: 0.5, y: 0.28, w: 0.48, size: 0.036, align: "center", vc: true, look: { color: INK }, icon: "phone" },
      { slot: "officeAddr", x: 0.12, y: 0.9, w: 0.21, size: 0.024, align: "center", vc: true, look: { color: W1, bold: false, ...shadow }, icon: "pin" },
      { slot: "regNum", x: 0.88, y: 0.9, w: 0.21, size: 0.022, align: "center", vc: true, look: { color: W1, bold: false, ...shadow } },
    ],
  },
  /* ── 유튜브 쇼츠 표지 (2026-10-30 사장님: SNS 세로 샘플을 섞지 않는다) ──
     아래 20% 는 쇼츠 제목·채널 이름, 오른쪽은 좋아요 단추가 덮고 목록에서는 가운데만 보인다 → 글자는 가운데 띠(y 0.2~0.7 · x 0.08~0.86) 안에 */
  {
    id: "shorts_big", name: "쇼츠 — 꽉 찬 큰 제목", aspect: ["tall"], kind: ["vacancy", "article"], cats: ["youtube"], sizes: [SHORTS], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.4 }],
    texts: [
      { slot: "badge", x: 0.47, y: 0.25, w: 0.6, size: 0.028, align: "center", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1, bgPad: 1.1 } },
      { slot: "label", x: 0.47, y: 0.25, w: 0.6, size: 0.026, align: "center", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1, bgPad: 1.1 } },
      { slot: "title", x: 0.47, y: 0.43, w: 0.78, size: 0.068, align: "center", vc: true, look: { color: "#FFE600", outline: "#000000", outlineWidth: 9, font: "Black Han Sans" } },
      { slot: "sub", x: 0.47, y: 0.56, w: 0.76, size: 0.03, align: "center", vc: true, look: { color: W1, outline: "#000000", outlineWidth: 6 } },
      { slot: "price", x: 0.47, y: 0.62, w: 0.7, size: 0.034, align: "center", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
    ],
  },
  {
    id: "shorts_band", name: "쇼츠 — 가운데 흰 띠", aspect: ["tall"], kind: ["vacancy", "article"], cats: ["youtube"], sizes: [SHORTS], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "card", x: 0, y: 0.36, w: 1, h: 0.22, color: "#FFFFFF", alpha: 0.96 }],
    texts: [
      { slot: "badge", x: 0.08, y: 0.3, w: 0.6, size: 0.026, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1, bgPad: 1.1 } },
      { slot: "label", x: 0.08, y: 0.3, w: 0.6, size: 0.024, align: "left", look: { bg: true, bgColor: "#0F1F3D", bgOpacity: 1, color: W1, bgPad: 1.1 } },
      { slot: "title", x: 0.08, y: 0.385, w: 0.78, size: 0.05, align: "left", look: { color: INK } },
      { slot: "sub", x: 0.08, y: 0.5, w: 0.78, size: 0.026, align: "left", look: { color: "#374151", bold: false } },
      { slot: "price", x: 0.08, y: 0.61, w: 0.7, size: 0.034, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
    ],
  },
  {
    id: "shorts_navy", name: "쇼츠 — 위 남색 판", aspect: ["tall"], kind: ["vacancy", "article"], cats: ["youtube"], sizes: [SHORTS], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0.18, w: 1, h: 0.3, color: "#0F1F3D", alpha: 0.92 }],
    texts: [
      { slot: "badge", x: 0.08, y: 0.21, w: 0.6, size: 0.024, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK, bgPad: 1.1 } },
      { slot: "label", x: 0.08, y: 0.21, w: 0.6, size: 0.022, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK, bgPad: 1.1 } },
      { slot: "title", x: 0.08, y: 0.26, w: 0.78, size: 0.054, align: "left", look: { color: W1 } },
      { slot: "sub", x: 0.08, y: 0.4, w: 0.78, size: 0.026, align: "left", look: { color: "#CBD5E1", bold: false } },
      { slot: "price", x: 0.08, y: 0.52, w: 0.7, size: 0.036, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "address", x: 0.08, y: 0.59, w: 0.78, size: 0.022, align: "left", look: { color: W1, bold: false, ...shadow }, icon: "pin" },
    ],
  },
  /* ── 유튜브 채널 로고 (2026-10-30 사장님: 단순하게) — 상호 하나만. 동그랗게 잘려 보이니 가운데(지름의 70%) 안에 ── */
  {
    id: "chlogo_navy", name: "채널 로고 — 남색", aspect: ["square"], kind: ["agency"], cats: ["youtube"], sizes: [CH_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0F1F3D", alpha: 1 }],
    picts: [{ id: "roof", x: 0.5, y: 0.38, size: 0.22, color: W1 }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.62, w: 0.6, size: 0.12, align: "center", vc: true, look: { color: W1 } }],
  },
  {
    id: "chlogo_yellow", name: "채널 로고 — 노랑", aspect: ["square"], kind: ["agency"], cats: ["youtube"], sizes: [CH_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: Y, alpha: 1 }],
    picts: [{ id: "house_smile", x: 0.5, y: 0.38, size: 0.22, color: INK }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.62, w: 0.6, size: 0.12, align: "center", vc: true, look: { color: INK } }],
  },
  {
    id: "chlogo_white", name: "채널 로고 — 흰 바탕 · 남색 글", aspect: ["square"], kind: ["agency"], cats: ["youtube"], sizes: [CH_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0.38, y: 0.72, w: 0.24, h: 0.02, color: Y, alpha: 1 }],
    picts: [{ id: "houses", x: 0.5, y: 0.38, size: 0.22, color: "#0F1F3D" }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.62, w: 0.6, size: 0.12, align: "center", vc: true, look: { color: "#0F1F3D" } }],
  },
  {
    id: "chlogo_ring", name: "채널 로고 — 남색 동그라미", aspect: ["square"], kind: ["agency"], cats: ["youtube"], sizes: [CH_LOGO], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "card", x: 0.12, y: 0.12, w: 0.76, h: 0.76, color: "#0F1F3D", alpha: 1, radius: 304 }],
    picts: [{ id: "roof", x: 0.5, y: 0.4, size: 0.18, color: Y }], // 로고 픽토그램 (2026-10-30 사장님)
    texts: [{ slot: "office", x: 0.5, y: 0.6, w: 0.5, size: 0.1, align: "center", vc: true, look: { color: W1 } }],
  },
  /* ── 유튜브 채널 배너 (2026-10-30 사장님: 썸네일과 다른 전용 샘플) ──
     내 중개사무소 정보로 (명함처럼). 글자는 모든 기기에 보이는 가운데 1546×423 칸 안에만 — x 0.198~0.802 · y 0.353~0.647 */
  {
    id: "chbn_navy", name: "채널 배너 — 남색 바탕 가운데", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0F1F3D", alpha: 1 }, { slot: "panel", x: 0.46, y: 0.475, w: 0.08, h: 0.004, color: Y, alpha: 1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.37, w: 0.58, size: 0.085, align: "center", look: { color: W1 } },
      { slot: "ceo", x: 0.5, y: 0.495, w: 0.58, size: 0.034, align: "center", look: { color: "#CBD5E1", bold: false } },
      { slot: "phone", x: 0.5, y: 0.555, w: 0.58, size: 0.048, align: "center", look: { color: Y }, icon: "phone" },
    ],
  },
  {
    id: "chbn_white", name: "채널 배너 — 흰 바탕 · 남색 줄", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 }, { slot: "panel", x: 0.198, y: 0.36, w: 0.01, h: 0.28, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "office", x: 0.226, y: 0.37, w: 0.57, size: 0.08, align: "left", look: { color: "#0F1F3D" } },
      { slot: "ceo", x: 0.226, y: 0.47, w: 0.57, size: 0.033, align: "left", look: { color: INK, bold: false } },
      { slot: "phone", x: 0.226, y: 0.525, w: 0.57, size: 0.045, align: "left", look: { color: INK }, icon: "phone" },
      { slot: "officeAddr", x: 0.226, y: 0.59, w: 0.57, size: 0.028, align: "left", look: { color: "#6B7280", bold: false }, icon: "pin" },
    ],
  },
  {
    id: "chbn_photo", name: "채널 배너 — 사진 · 가운데 판", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.45 }, { slot: "card", x: 0.198, y: 0.353, w: 0.604, h: 0.294, color: "#0F1F3D", alpha: 0.88, radius: 24 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.385, w: 0.56, size: 0.08, align: "center", look: { color: W1 } },
      { slot: "phone", x: 0.5, y: 0.495, w: 0.56, size: 0.05, align: "center", look: { color: Y }, icon: "phone" },
      { slot: "ceo", x: 0.5, y: 0.58, w: 0.56, size: 0.03, align: "center", look: { color: "#E5E7EB", bold: false } },
    ],
  },
  /* ── 채널 배너 더 (2026-10-30 사장님) — 글자는 모바일 안전 칸(x 0.198~0.802 · y 0.353~0.647) 안에, 꾸밈만 바깥(TV 영역)으로 ── */
  {
    id: "chbn_yellow_roof", name: "채널 배너 — 노랑 · 지붕 로고 왼쪽", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: Y, alpha: 1 }, { slot: "panel", x: 0, y: 0.9, w: 1, h: 0.1, color: INK, alpha: 1 }],
    picts: [{ id: "roof", x: 0.29, y: 0.49, size: 0.17, color: INK }],
    texts: [
      { slot: "office", x: 0.36, y: 0.45, w: 0.43, size: 0.075, align: "left", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "phone", x: 0.36, y: 0.56, w: 0.43, size: 0.04, align: "left", vc: true, oneLine: true, look: { color: INK }, icon: "phone" },
    ],
  },
  {
    id: "chbn_sky_town", name: "채널 배너 — 하늘색 · 아래 건물 줄", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#DCEBFA", alpha: 1 }],
    picts: [
      { id: "town", x: 0.08, y: 0.82, size: 0.3, color: "#A9C6EA" }, { id: "town", x: 0.27, y: 0.84, size: 0.26, color: "#BCD3EF" }, { id: "town", x: 0.5, y: 0.83, size: 0.28, color: "#A9C6EA" },
      { id: "town", x: 0.73, y: 0.84, size: 0.26, color: "#BCD3EF" }, { id: "town", x: 0.92, y: 0.82, size: 0.3, color: "#A9C6EA" }, { id: "roof", x: 0.5, y: 0.4, size: 0.1, color: "#1E3A8A" },
    ],
    texts: [
      { slot: "office", x: 0.5, y: 0.5, w: 0.58, size: 0.075, align: "center", vc: true, oneLine: true, look: { color: "#1E3A8A", font: "Black Han Sans" } },
      { slot: "phone", x: 0.5, y: 0.595, w: 0.58, size: 0.036, align: "center", vc: true, oneLine: true, look: { color: "#1E3A8A" }, icon: "phone" },
    ],
  },
  {
    id: "chbn_dark_gold", name: "채널 배너 — 검정 · 금색 줄 · 고급", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#121212", alpha: 1 },
      { slot: "panel", x: 0.2, y: 0.37, w: 0.6, h: 0.003, color: "#C9A35B", alpha: 1 },
      { slot: "panel", x: 0.2, y: 0.63, w: 0.6, h: 0.003, color: "#C9A35B", alpha: 1 },
    ],
    picts: [{ id: "tower", x: 0.27, y: 0.5, size: 0.15, color: "#C9A35B" }],
    texts: [
      { slot: "office", x: 0.34, y: 0.46, w: 0.45, size: 0.07, align: "left", vc: true, oneLine: true, look: { color: "#E2C384" } },
      { slot: "ceo", x: 0.34, y: 0.56, w: 0.45, size: 0.03, align: "left", vc: true, oneLine: true, look: { color: "#D1D5DB", bold: false } },
    ],
  },
  {
    id: "chbn_split", name: "채널 배너 — 남색 · 노랑 반반", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 0.5, h: 1, color: "#1E2A78", alpha: 1 }, { slot: "panel", x: 0.5, y: 0, w: 0.5, h: 1, color: Y, alpha: 1 }],
    picts: [{ id: "house_line", x: 0.12, y: 0.55, size: 0.6, color: "#2C3A94" }],
    texts: [
      { slot: "office", x: 0.48, y: 0.5, w: 0.27, size: 0.065, align: "right", vc: true, oneLine: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "phone", x: 0.52, y: 0.5, w: 0.27, size: 0.045, align: "left", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans" }, icon: "phone" },
    ],
  },
  {
    id: "chbn_photo_band", name: "채널 배너 — 사진 · 가운데 남색 띠", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.3 }, { slot: "panel", x: 0, y: 0.37, w: 1, h: 0.26, color: "#1E2A78", alpha: 0.86 }],
    picts: [{ id: "roof_line", x: 0.24, y: 0.5, size: 0.12, color: Y }],
    texts: [
      { slot: "office", x: 0.29, y: 0.46, w: 0.5, size: 0.07, align: "left", vc: true, oneLine: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "phone", x: 0.29, y: 0.565, w: 0.5, size: 0.036, align: "left", vc: true, oneLine: true, look: { color: Y }, icon: "phone" },
    ],
  },
  {
    id: "chbn_green_leaf", name: "채널 배너 — 진초록 · 집과 잎 · SNS", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0B5D51", alpha: 1 }],
    picts: [{ id: "house_line", x: 0.88, y: 0.55, size: 0.9, color: "#12705F" }, { id: "house_leaf", x: 0.27, y: 0.49, size: 0.15, color: "#A3E635" }],
    texts: [
      { slot: "office", x: 0.34, y: 0.45, w: 0.45, size: 0.07, align: "left", vc: true, oneLine: true, look: { color: W1 } },
    ],
    sns: { x: 0.34, y: 0.57, w: 0.45, size: 0.026, color: "#A7F3D0", align: "left" },
  },
  /* ── 채널 배너 — 실사 사진 바탕 (2026-10-30 사장님) · 글자는 모바일 안전 칸 안에 ── */
  {
    id: "chbn_ph_whiteband", name: "채널 배너 — 사진 · 가운데 흰 띠", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "panel", x: 0, y: 0.39, w: 1, h: 0.22, color: "#FFFFFF", alpha: 0.9 }],
    picts: [{ id: "roof", x: 0.27, y: 0.5, size: 0.13, color: "#1E2A78" }],
    texts: [
      { slot: "office", x: 0.33, y: 0.46, w: 0.46, size: 0.068, align: "left", vc: true, oneLine: true, look: { color: "#1E2A78", font: "Black Han Sans" } },
      { slot: "phone", x: 0.33, y: 0.555, w: 0.46, size: 0.032, align: "left", vc: true, oneLine: true, look: { color: "#374151" }, icon: "phone" },
    ],
  },
  {
    id: "chbn_ph_dark", name: "채널 배너 — 사진 · 어둡게 · 가운데 큰 상호", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.5 }, { slot: "panel", x: 0.44, y: 0.545, w: 0.12, h: 0.005, color: Y, alpha: 1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.46, w: 0.58, size: 0.085, align: "center", vc: true, oneLine: true, look: { color: W1, font: "Black Han Sans", ...shadow } },
    ],
    sns: { x: 0.5, y: 0.6, w: 0.58, size: 0.026, color: W1, align: "center" },
  },
  {
    id: "chbn_ph_navycard", name: "채널 배너 — 사진 · 왼쪽 남색 판", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 0.6, h: 1, color: "#000000", alpha: 0.45, grad: "left" }, { slot: "card", x: 0.2, y: 0.365, w: 0.34, h: 0.27, color: "#1E2A78", alpha: 0.92, radius: 24 }],
    picts: [{ id: "town", x: 0.25, y: 0.5, size: 0.11, color: Y }],
    texts: [
      { slot: "office", x: 0.29, y: 0.46, w: 0.24, size: 0.055, align: "left", vc: true, oneLine: true, look: { color: W1, font: "Black Han Sans" } },
      { slot: "phone", x: 0.29, y: 0.55, w: 0.24, size: 0.028, align: "left", vc: true, oneLine: true, look: { color: Y }, icon: "phone" },
    ],
  },
  {
    id: "chbn_ph_whitecard", name: "채널 배너 — 사진 · 가운데 흰 판", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.2 }, { slot: "card", x: 0.3, y: 0.38, w: 0.4, h: 0.24, color: "#FFFFFF", alpha: 0.94, radius: 18 }, { slot: "panel", x: 0.3, y: 0.38, w: 0.4, h: 0.012, color: "#0F1F3D", alpha: 1 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.47, w: 0.36, size: 0.06, align: "center", vc: true, oneLine: true, look: { color: "#0F1F3D" } },
      { slot: "phone", x: 0.5, y: 0.565, w: 0.36, size: 0.03, align: "center", vc: true, oneLine: true, look: { color: "#374151" }, icon: "phone" },
    ],
  },
  {
    id: "chbn_ph_skybottom", name: "채널 배너 — 위 사진 · 아래 하늘색 · 건물 줄", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 0.58 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 0.58, color: "#000000", alpha: 0.3 }, { slot: "panel", x: 0, y: 0.58, w: 1, h: 0.42, color: "#DCEBFA", alpha: 1 }],
    picts: [{ id: "town", x: 0.1, y: 0.86, size: 0.22, color: "#A9C6EA" }, { id: "town", x: 0.9, y: 0.86, size: 0.22, color: "#A9C6EA" }],
    texts: [
      { slot: "office", x: 0.5, y: 0.47, w: 0.58, size: 0.075, align: "center", vc: true, oneLine: true, look: { color: W1, font: "Black Han Sans", ...shadow } },
    ],
    sns: { x: 0.5, y: 0.615, w: 0.58, size: 0.026, color: "#1E3A8A", align: "center" },
  },
  {
    id: "chbn_ph_yellowtag", name: "채널 배너 — 사진 · 노랑 상호 딱지", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [CH_BANNER], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.3 }],
    texts: [
      { slot: "office", x: 0.5, y: 0.46, w: 0.58, size: 0.075, align: "center", vc: true, oneLine: true, look: { color: INK, font: "Black Han Sans", bg: true, bgColor: Y, bgOpacity: 1, bgPad: 1.2 } },
      { slot: "phone", x: 0.5, y: 0.575, w: 0.5, size: 0.034, align: "center", vc: true, oneLine: true, look: { color: Y, bg: true, bgColor: INK, bgOpacity: 0.9, bgPad: 1.2 }, icon: "phone" },
    ],
  },
  /* ── 유튜브 영상 끝 화면 (2026-10-30) — 유튜브가 얹는 다음 영상 칸(16:9)·구독 동그라미 자리를 비워 둔다. 남은 곳에 사무소 정보 ── */
  {
    id: "endsc_navy", name: "영상 끝 화면 — 남색 · 오른쪽 영상 두 칸", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [END_SCREEN], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#0F1F3D", alpha: 1 },
      { slot: "card", x: 0.53, y: 0.08, w: 0.4, h: 0.4, color: "#FFFFFF", alpha: 0.12, radius: 16 },
      { slot: "card", x: 0.53, y: 0.52, w: 0.4, h: 0.4, color: "#FFFFFF", alpha: 0.12, radius: 16 },
      { slot: "card", x: 0.07, y: 0.6, w: 0.14, h: 0.249, color: "#FFFFFF", alpha: 0.12, radius: 135 },
    ],
    texts: [
      { slot: "office", x: 0.07, y: 0.14, w: 0.42, size: 0.075, align: "left", look: { color: W1 } },
      { slot: "ceo", x: 0.07, y: 0.26, w: 0.42, size: 0.035, align: "left", look: { color: "#CBD5E1", bold: false } },
      { slot: "phone", x: 0.07, y: 0.34, w: 0.42, size: 0.05, align: "left", look: { color: Y }, icon: "phone" },
    ],
  },
  {
    id: "endsc_photo", name: "영상 끝 화면 — 사진 · 영상 두 칸 나란히", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [END_SCREEN], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.6 },
      { slot: "card", x: 0.06, y: 0.16, w: 0.42, h: 0.42, color: "#FFFFFF", alpha: 0.14, radius: 16 },
      { slot: "card", x: 0.52, y: 0.16, w: 0.42, h: 0.42, color: "#FFFFFF", alpha: 0.14, radius: 16 },
      { slot: "card", x: 0.82, y: 0.68, w: 0.12, h: 0.213, color: "#FFFFFF", alpha: 0.14, radius: 116 },
    ],
    texts: [
      { slot: "office", x: 0.06, y: 0.7, w: 0.6, size: 0.06, align: "left", look: { color: W1, ...shadow } },
      { slot: "phone", x: 0.06, y: 0.8, w: 0.6, size: 0.045, align: "left", look: { color: Y }, icon: "phone" },
    ],
  },
  {
    id: "endsc_white", name: "영상 끝 화면 — 흰 바탕 · 왼쪽 큰 영상", aspect: ["wide"], kind: ["agency"], cats: ["youtube"], sizes: [END_SCREEN], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 1, color: "#FFFFFF", alpha: 1 },
      { slot: "card", x: 0.05, y: 0.1, w: 0.55, h: 0.55, color: "#0F1F3D", alpha: 0.08, radius: 16 },
      { slot: "card", x: 0.69, y: 0.42, w: 0.13, h: 0.231, color: "#0F1F3D", alpha: 0.08, radius: 125 },
      { slot: "panel", x: 0, y: 0.8, w: 1, h: 0.2, color: "#0F1F3D", alpha: 1 },
    ],
    texts: [
      { slot: "office", x: 0.65, y: 0.12, w: 0.31, size: 0.06, align: "left", look: { color: "#0F1F3D" } },
      { slot: "ceo", x: 0.65, y: 0.22, w: 0.31, size: 0.032, align: "left", look: { color: INK, bold: false } },
      { slot: "phone", x: 0.65, y: 0.28, w: 0.31, size: 0.042, align: "left", look: { color: INK }, icon: "phone" },
      { slot: "officeAddr", x: 0.05, y: 0.875, w: 0.9, size: 0.034, align: "left", look: { color: W1, bold: false }, icon: "pin" },
    ],
  },
];
// 유튜브 썸네일은 글씨를 크게 — 제목·부제 1.3배 (칸 너비를 넘으면 fitText 가 두 줄·줄이기로 맞춘다, 2026-10-22 사장님)
// 키워드는 키우지 않는다 — 커지면 빨간 상자가 화면을 차지해 촌스럽다 (2026-10-30 사장님)
for (const l of LAYOUTS) if (l.id.startsWith("yt_")) for (const t of l.texts) if (t.slot === "title" || t.slot === "sub") t.size = +(t.size * 1.3).toFixed(4);
/* 명함은 앞뒤 세트로 (2026-10-30 사장님) — 앞면 → 뒷면. 뒷면은 목록에 따로 나오지 않는다.
   앞면은 로고·상호만 남기고(연락처·QR·SNS 는 뒷면), 이름은 "명함 세트 — …" */
{
  const SETS: [string, string][] = [
    ["bcp_teal", "bcp_white_teal"], ["bcp_blue_roof", "bcb_blue"], ["bcq_navy_roof", "bcq_white_orange"], ["bcq_gray_coral", "bcq_split_coral"],
    ["bcq_black_tower", "bcq_white_mint"], ["bcf_orange", "bcp_orange_town"], ["bcf_houses", "bcp_houses_line"], ["bcf_navy_gold", "bcp_navy_gold"],
    ["bcf_orange_big", "bcp_bigphone"], ["bcf_green", "bcp_green_leaf"],
  ];
  const byId = (id: string) => LAYOUTS.find((l) => l.id === id)!;
  for (const [f, k] of SETS) {
    const front = byId(f), back = byId(k);
    front.back = k;
    front.name = front.name.replace(/^명함( 세트)? — /, "명함 세트 — ");
    front.texts = front.texts.filter((t) => !["ceo", "phone", "officeAddr", "regNum"].includes(t.slot));
    delete front.qr;
    delete front.sns;
    back.cats = [];
    back.name = back.name.replace(/^명함 — /, "명함 뒷면 — ");
  }
  // 예전 한 면짜리 명함은 목록에서 뺀다 (세트만 보이게 · 노란 바탕·위 빨간 띠도 2026-10-30 사장님)
  for (const id of ["bizcard", "bc_navy", "bc_center", "bc_band", "bc_yellow", "bc_red"]) { const l = LAYOUTS.find((x) => x.id === id); if (l) l.cats = []; }
}
/* 명함 틀은 재단 90×50mm 칸 기준으로 그렸다 → 작업 92×52mm 문서에 맞게 사방 1mm 안쪽으로 옮긴다 (2026-10-30 사장님: 인쇄소 규격).
   가장자리에 닿은 판·바탕은 작업 칸 끝까지 늘려 재단할 때 흰 줄이 생기지 않게 */
{
  const MX = 1 / 92, MY = 1 / 52, KX = 90 / 92, KY = 50 / 52;
  const mx = (x: number) => +(MX + x * KX).toFixed(5), my = (y: number) => +(MY + y * KY).toFixed(5);
  const box = <T extends { x: number; y: number; w: number; h: number }>(b: T): T => {
    const x0 = b.x <= 0.001 ? 0 : mx(b.x), y0 = b.y <= 0.001 ? 0 : my(b.y);
    const x1 = b.x + b.w >= 0.999 ? 1 : mx(b.x + b.w), y1 = b.y + b.h >= 0.999 ? 1 : my(b.y + b.h);
    return { ...b, x: x0, y: y0, w: +(x1 - x0).toFixed(5), h: +(y1 - y0).toFixed(5) };
  };
  for (const l of LAYOUTS) {
    if (l.sizes !== BIZ) continue;
    l.bg = box(l.bg);
    l.boxes = l.boxes.map(box);
    l.texts = l.texts.map((t) => ({ ...t, x: mx(t.x), y: my(t.y), w: +(t.w * KX).toFixed(5), size: +(t.size * KY).toFixed(5) }));
    if (l.picts) l.picts = l.picts.map((p) => ({ ...p, x: mx(p.x), y: my(p.y), size: +(p.size * KY).toFixed(5) }));
    if (l.qr) l.qr = { ...l.qr, x: mx(l.qr.x), y: my(l.qr.y), size: +(l.qr.size * KY).toFixed(5) };
    if (l.sns) l.sns = { ...l.sns, x: mx(l.sns.x), y: my(l.sns.y), w: +(l.sns.w * KX).toFixed(5), size: +(l.sns.size * KY).toFixed(5) };
  }
}
export const backOf = (l?: Layout | null) => (l?.back ? LAYOUTS.find((x) => x.id === l.back) || null : null);
/* 쇼츠 표지 = 유튜브 썸네일 디자인을 기본 틀로 (2026-10-30 사장님) — 썸네일 한 장을 세로 화면의 가운데 띠(목록에서 보이는 곳)에 옮긴다.
   화면 전체를 덮는 판·어둡게 깔기·사진은 세로 화면 전체로, 나머지 칸은 띠 안으로. 글씨는 세로에 맞게 조금 줄이고 넘치면 두 줄로 */
{
  const X0 = 0.06, BW = 0.88, Y0 = 0.2, BH = 0.5, K = 0.45;
  const full = (b: { x: number; y: number; w: number; h: number }) => b.x <= 0.001 && b.y <= 0.001 && b.w >= 0.999 && b.h >= 0.999;
  const fx = (x: number) => +(X0 + x * BW).toFixed(4), fy = (y: number) => +(Y0 + y * BH).toFixed(4);
  // 세로로 옮기면 어색한 것은 뺀다 (2026-10-30 사장님: 아래 띠 · 뉴스 카드 · 좌우 나눔 · 위 띠(뉴스))
  const SKIP = new Set(["band", "news", "yt_split", "yt_top", "ytref_yellow"]);
  const thumbs = LAYOUTS.filter((l) => l.cats.includes("youtube") && l.aspect.includes("wide") && !l.sizes && !l.kind.includes("agency") && !SKIP.has(l.id));
  for (const l of thumbs) {
    LAYOUTS.push({
      ...l, id: `sh_${l.id}`, name: l.name.replace(/^[^—]*—\s*/, "쇼츠 — "), aspect: ["tall"], cats: ["youtube"], sizes: [SHORTS],
      // 사진은 늘 세로 화면 전체에 (위아래가 비지 않게)
      bg: { x: 0, y: 0, w: 1, h: 1 },
      // 옆으로 어두워지는 깔기는 좁은 세로 화면에서 반쪽만 어두워 어색하다 → 화면 전체를 고르게 조금 어둡게
      boxes: [...l.boxes.map((b) => b.slot === "shade" && (b.grad === "left" || b.grad === "right") ? { ...b, x: 0, y: 0, w: 1, h: 1, grad: undefined, alpha: +(b.alpha * 0.6).toFixed(2) } : full(b) ? b : {
        ...b,
        // 왼쪽·오른쪽 끝에 닿은 판·어둡게 깔기는 세로 화면에서도 그 끝까지 (옆에 빈 줄이 생기지 않게)
        x: b.x <= 0.001 ? 0 : fx(b.x),
        w: +((b.x + b.w >= 0.999 ? 1 : fx(b.x + b.w)) - (b.x <= 0.001 ? 0 : fx(b.x))).toFixed(4),
        // 위·아래 끝에 닿은 판·어둡게 깔기는 세로 화면 끝까지 (가운데서 뚝 끊기면 오류처럼 보인다, 2026-10-30 사장님)
        y: b.y <= 0.001 ? 0 : fy(b.y),
        h: +((b.y + b.h >= 0.999 ? 1 : fy(b.y + b.h)) - (b.y <= 0.001 ? 0 : fy(b.y))).toFixed(4),
      })],
      texts: l.texts.map((t) => ({ ...t, x: fx(t.x), y: fy(t.y), w: +(t.w * BW).toFixed(4), size: +(t.size * K).toFixed(4), oneLine: false })),
    });
  }
}
export const aspectOf = (w: number, h: number): "wide" | "square" | "tall" => (w / h > 1.2 ? "wide" : w / h < 0.85 ? "tall" : "square");
/** 이 종류 · 크기에 맞는 틀 (kind 를 주면 그 재료로 만들 수 있는 것만) */
/** 이 틀이 이 크기에 맞나 — 크기가 정해진 틀은 그 크기만, 아니면 비율로. 채널 배너·영상 끝 화면은 전용 틀만 */
const fitsSize = (l: Layout, sz: CatSize) => (l.sizes ? l.sizes.includes(sz.name) : !ONLY_OWN.includes(sz.name) && l.aspect.includes(aspectOf(sz.w, sz.h)));
export const layoutsForCat = (cat: Cat, size: CatSize, kind?: "vacancy" | "article") => {
  const all = LAYOUTS.filter((l) => l.cats.includes(cat) && (!kind || l.kind.includes(kind)) && fitsSize(l, size));
  return cat === "basic" ? all.slice(0, BASIC_MAX) : all;
};
/** [기본] 종류는 크기마다 샘플 3개만 (2026-10-30 사장님 — 나중에 무료 회원용으로) */
export const BASIC_MAX = 3;
/** 샘플을 보여 줄 크기 — 그 종류의 크기 중 틀에 맞는 첫 것 */
export const sampleSizeOf = (l: Layout, cat: Cat): CatSize | null => CAT_SIZES[cat].find((sz) => fitsSize(l, sz)) || null;
/** 미리보기 · 샘플 배경 — 사진 자리 (사진이 아직 없을 때) */
export function placeholderBg(w: number, h: number, text = "사진 자리") {
  const c = mk(w, h);
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#334155");
  grd.addColorStop(1, "#64748b");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.font = `700 ${Math.round(Math.min(w, h) * 0.06)}px 'Pretendard', sans-serif`;
  g.textAlign = "center";
  g.fillText(text, w / 2, h * 0.3);
  return c;
}
/** 샘플 배경 사진 — 템플릿 미리보기 · [템플릿 열기] 에 쓰는 보기용 사진 (회원이 [사진 바꾸기] 로 자기 사진을 넣으면 그것으로). 한 번 읽어 둔다 */
export const SAMPLE_BG_URL = "/studio-samples/living.webp";
const sampleBgs: Record<string, Promise<HTMLCanvasElement | null> | null> = {};
/* 샘플 배경 사진 — 픽사베이에서 고른 실사 (2026-10-30 사장님: 이미지가 없어 단조롭다). 우리 서버에 받아 둔 것만 쓴다(픽사베이 주소를 직접 쓰지 않음).
   출처는 public/studio-samples/px/credits.json. 사람 얼굴·상표가 크게 나온 사진은 뺐다. 샘플 미리보기·[템플릿 열기]에만 — 회원이 만들 땐 자기 공실 사진 */
const PX = {
  youtube: ["apt1", "tower", "street", "night1", "glass", "apt2", "house1", "night2", "corridor", "hanriver", "seoul_tower", "seoul_night", "skyline", "aerial1", "facade", "night3"],
  realty: ["apt1", "living1", "house1", "kitchen1", "office1", "apt2", "living2", "mall", "studio1", "studio2", "bedroom2", "aerial1", "aerial2", "aptwhite", "hanriver"],
  room: ["living1", "living2", "living3", "kitchen1", "kitchen2", "apt1", "house2", "office2", "interior_dark", "apt2", "studio1", "studio2", "bedroom1", "bedroom2", "bedroom3", "aptwhite"],
};
const hashOf = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
/** 이 샘플에 깔 사진 이름 — 고급·금색은 어두운 실내·야경, 상가·사무는 사무실·상가, 나머지는 종류별 사진을 틀마다 돌려 가며 */
export function sampleBgFor(l?: Layout | null, cat?: Cat): string {
  if (!l) return cat === "youtube" ? "building" : "living";
  const pick = (pool: string[]) => pool[hashOf(l.id) % pool.length];
  if (/고급|금색/.test(l.name)) return pick(["interior_dark", "night2", "living3"]);
  if (/상가|사무/.test(l.name)) return pick(["office1", "office2", "mall"]);
  if (/토지|땅/.test(l.name)) return pick(["land", "aerial2"]);
  if (/분양|신축|공사/.test(l.name)) return pick(["crane", "aerial1", "facade"]);
  return pick(cat === "youtube" ? PX.youtube : cat === "realty" ? PX.realty : PX.room);
}
/** which: "living" = 거실 · "building" = 한강 건물 (예전 기본) · 그 밖 = 픽사베이 샘플 사진 이름 (sampleBgFor) */
export function loadSampleBg(which = "living"): Promise<HTMLCanvasElement | null> {
  const url = which === "building" ? "/studio-samples/building.webp" : which === "living" ? SAMPLE_BG_URL : `/studio-samples/px/${which}.webp`;
  let sampleBgP = sampleBgs[which] || null;
  if (!sampleBgP) {
    sampleBgP = sampleBgs[which] = new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        const c = mk(im.naturalWidth, im.naturalHeight);
        c.getContext("2d")!.drawImage(im, 0, 0);
        res(c);
      };
      im.onerror = () => { sampleBgs[which] = null; res(null); };
      im.src = url;
    });
  }
  return sampleBgP;
}
/**
 * 기사 머리표 — "공실뉴스" 가 아니라 내 부동산 이름 + 뉴스 (2026-10-30 사장님: 착한임대뉴스).
 * 상호 끝의 공인중개사사무소·중개법인 같은 꼬리말은 떼고 붙인다 (착한임대공인중개사사무소 → 착한임대뉴스)
 */
export const newsLabelOf = (office?: string | null) => {
  // "부동산" 은 상호의 일부라 남긴다 (강남부동산 → 강남부동산뉴스)
  const base = String(office || "").trim().replace(/\s*(공인중개사\s*사무소|공인중개사|중개\s*법인|사무소)$/, "").replace(/\s+/g, "");
  return base ? `${base}뉴스` : "뉴스";
};
/** 칸 이름 그대로의 내용 — 샘플을 [템플릿 열기] 할 때 (고칠 자리 표시, 지어낸 값 아님) */
export const placeholderContent = (agency?: { name?: string; ceo?: string; phone?: string; address?: string; regNum?: string; homepage?: string; sns?: string }): Content => ({
  homepage: agency?.homepage || "QR", sns: agency?.sns || "blog|블로그 주소\ninstagram|인스타그램 주소",
  title: "제목을 입력하세요", sub: "부제를 입력하세요", badge: "#키워드", price: "가격", area: "면적", address: "주소",
  agency: agency?.name ? [agency.name, agency.phone].filter(Boolean).join(" · ") : "중개사무소", label: newsLabelOf(agency?.name), source: "출처",
  office: agency?.name || "상호", ceo: agency?.ceo ? `대표 공인중개사 ${agency.ceo}` : "대표 공인중개사", phone: agency?.phone || "전화번호",
  officeAddr: agency?.address || "사무소 주소", regNum: agency?.regNum ? `등록번호 ${agency.regNum}` : "등록번호",
});
/** 틀에 맞는 칸만 남긴다 — 공실용 틀이면 기사 칸(머리표·출처)을, 기사 전용 틀이면 공실 칸(딱지·가격·면적·주소)을 뺀다 (같은 자리에 겹치지 않게) */
export function contentFor(l: Layout, c: Content, kind?: "vacancy" | "article"): Content {
  const k = kind || (l.kind.includes("vacancy") ? "vacancy" : l.kind.includes("article") ? "article" : "vacancy");
  const o = { ...c };
  if (k === "vacancy") { delete o.label; delete o.source; }
  else { delete o.badge; delete o.price; delete o.area; delete o.address; }
  return o;
}
/** 한 장 미리보기 그림 (작게 만들어 빠르게) */
export function previewOf(l: Layout, size: { w: number; h: number }, content: Content, bg: HTMLCanvasElement | null, max = 640, aiMark = false, kind?: "vacancy" | "article") {
  const k = Math.min(1, 1400 / Math.max(size.w, size.h));
  const W = Math.round(size.w * k), H = Math.round(size.h * k);
  const d = { id: "pv", name: "pv", psd: { width: W, height: H, children: [] }, mode: "rgb", dirty: false, pristine: false } as unknown as Doc;
  d.psd.children = buildLayout(d, l, contentFor(l, content, l.kind.includes(kind as "vacancy") ? kind : undefined), bg || placeholderBg(W, H), aiMark);
  let c = composite(d);
  const bk = backOf(l);
  if (bk) {
    // 앞뒤 세트 — 앞면 위, 뒷면 아래로 붙여 한 장에
    const d2 = { ...d, psd: { width: W, height: H, children: [] } } as unknown as Doc;
    d2.psd.children = buildLayout(d2, bk, contentFor(bk, content), null, false);
    const back = composite(d2), gap = Math.round(H * 0.08);
    const both = mk(W, H * 2 + gap), g2 = both.getContext("2d")!;
    g2.drawImage(c, 0, 0);
    g2.drawImage(back, 0, H + gap);
    c = both;
  }
  const kk = Math.min(1, max / c.width, max / c.height);
  const t = mk(Math.max(1, Math.round(c.width * kk)), Math.max(1, Math.round(c.height * kk)));
  const tg = t.getContext("2d")!;
  tg.imageSmoothingQuality = "high";
  tg.drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL("image/jpeg", 0.85);
}
export const layoutsFor = (w: number, h: number, kind: "vacancy" | "article") => {
  const a = aspectOf(w, h);
  const fit = LAYOUTS.filter((l) => l.kind.includes(kind));
  return [...fit.filter((l) => l.aspect.includes(a)), ...fit.filter((l) => !l.aspect.includes(a))];
};

/** 사진을 칸에 꽉 차게 (가운데 맞춰 잘라서) */
export function coverCanvas(src: HTMLCanvasElement, w: number, h: number) {
  const c = mk(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  const g = c.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  const k = Math.max(c.width / src.width, c.height / src.height);
  const dw = src.width * k, dh = src.height * k;
  g.drawImage(src, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
  return c;
}
function boxCanvas(b: BoxSlot, w: number, h: number) {
  const c = mk(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  const g = c.getContext("2d")!;
  const n = parseInt(b.color.slice(1), 16), rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  if (b.grad) {
    // down = 아래로 진하게 · up = 위로 · left = 왼쪽이 진하게 · right = 오른쪽이 진하게
    const horiz = b.grad === "left" || b.grad === "right";
    const grd = horiz ? g.createLinearGradient(0, 0, c.width, 0) : g.createLinearGradient(0, 0, 0, c.height);
    const dense = b.grad === "down" || b.grad === "right";
    grd.addColorStop(dense ? 0 : 1, `rgba(${rgb},0)`);
    grd.addColorStop(dense ? 1 : 0, `rgba(${rgb},${b.alpha})`);
    if (horiz) grd.addColorStop(dense ? 0.55 : 0.45, `rgba(${rgb},${b.alpha})`); // 가로 — 글 있는 쪽 절반은 진하게, 나머지는 부드럽게 (경계가 보이지 않게)
    g.fillStyle = grd;
  } else g.fillStyle = `rgba(${rgb},${b.alpha})`;
  g.beginPath();
  g.roundRect(0, 0, c.width, c.height, b.radius || 0);
  g.fill();
  return c;
}
const imgLayer = (name: string, c: HTMLCanvasElement, x: number, y: number, slot?: Slot): PLayer => ({ _k: uid(), name, canvas: c, left: Math.round(x), top: Math.round(y), right: Math.round(x) + c.width, bottom: Math.round(y) + c.height, _slot: slot });

/** 글자 레이어 — 칸 너비에 맞게 (넘치면 글자를 줄이고, 그래도 넘치면 두 줄로) */
export function fitText(text: string, look: TextLook, px: number, maxW: number, oneLine = false): { text: string; px: number } {
  const width = (t: string, p: number) => renderText({ ...look, text: t, px: p }).canvas.width;
  let t = text, p = px;
  if (width(t, p) <= maxW) return { text: t, px: p };
  const k = maxW / width(t, p);
  if (k >= 0.72 || oneLine) return { text: t, px: Math.max(8, Math.floor(p * k)) };
  // 두 줄 — 가운데에 가까운 띄어쓰기에서
  const sp = [...t.matchAll(/\s/g)].map((m) => m.index!);
  if (sp.length && !t.includes("\n")) {
    const mid = t.length / 2;
    const at = sp.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    t = `${t.slice(0, at)}\n${t.slice(at + 1)}`;
  }
  const w2 = width(t, p);
  if (w2 > maxW) p = Math.max(8, Math.floor((p * maxW) / w2));
  return { text: t, px: p };
}
export function textSlotLayer(name: string, text: string, look: TextLook, px: number, maxW: number, ax: number, ay: number, align: "left" | "center" | "right", vc: boolean, slot?: Slot, oneLine = false): PLayer {
  const f = fitText(text, { ...look, align }, px, maxW, oneLine);
  const l: PLayer = { _k: uid(), name, left: 0, top: 0, _slot: slot };
  applyLook(l, { font: "Pretendard", color: "#111111", outlineWidth: 0, ...look, align, text: f.text, px: f.px }, false);
  const w = l.canvas!.width, h = l.canvas!.height;
  offsetLayer(l, Math.round(align === "center" ? ax - w / 2 : align === "right" ? ax - w : ax), Math.round(vc ? ay - h / 2 : ay));
  return l;
}

/** 이 틀이 쓰는 글꼴 (그리기 전에 받아 둔다 — 안 받고 그리면 다른 글꼴로 굳는다) */
export const layoutFonts = (lay: Layout): string[] => {
  const b = lay.back ? LAYOUTS.find((x) => x.id === lay.back) : null;
  return [...new Set(["Pretendard", ...[...lay.texts, ...(b?.texts || [])].map((t) => t.look.font || "Pretendard")])];
};
/** 틀 + 내용 → 레이어들 (아래부터). bg = 배경 그림 (없으면 회색 판) */
export function buildLayout(doc: Doc, lay: Layout, c: Content, bg: HTMLCanvasElement | null, aiMark = false): PLayer[] {
  const W = doc.psd.width, H = doc.psd.height, S = Math.min(W, H);
  const out: PLayer[] = [];
  const b = lay.bg;
  if (bg) out.push(imgLayer(SLOT_NAME.bg, coverCanvas(bg, b.w * W, b.h * H), b.x * W, b.y * H, "bg"));
  else {
    const g = mk(Math.round(b.w * W), Math.round(b.h * H));
    const gg = g.getContext("2d")!;
    gg.fillStyle = "#9CA3AF";
    gg.fillRect(0, 0, g.width, g.height);
    out.push(imgLayer(SLOT_NAME.bg, g, b.x * W, b.y * H, "bg"));
  }
  // 어둡게 깔기(shade)는 사진 바로 위 — 테두리·판·카드는 그 위에 (노란 테두리가 어둡게 덮이지 않게, 2026-10-30 사장님)
  const boxes = [...lay.boxes.filter((x) => x.slot === "shade"), ...lay.boxes.filter((x) => x.slot !== "shade")];
  for (const bx of boxes) out.push(imgLayer(SLOT_NAME[bx.slot], boxCanvas(bx, bx.w * W, bx.h * H), bx.x * W, bx.y * H, bx.slot));
  // 로고 픽토그램 — 픽토그램 레이어라 색·크기를 바로 고칠 수 있다
  for (const p of lay.picts || []) {
    const sz = Math.max(8, Math.round(p.size * S)), ix = Math.round(p.x * W - sz / 2), iy = Math.round(p.y * H - sz / 2);
    out.push({ _k: uid(), name: pictoOf(p.id).name, canvas: pictoCanvas(p.id, sz, p.color, "line"), left: ix, top: iy, right: ix + sz, bottom: iy + sz, _picto: { id: p.id, color: p.color, style: "line" } });
  }
  const used = new Set<Slot>();
  // 기사 머리표(label)와 같은 자리에 있는 중개사무소 줄은 기사일 때 빼고 머리표만 (두 글이 겹치지 않게, 2026-10-30)
  const labelAt = new Set(c.label ? lay.texts.filter((x) => x.slot === "label").map((x) => `${x.x},${x.y}`) : []);
  // 위 글이 길어져(두 줄 등) 아래 글과 겹치면 아래 글을 그만큼 내린다 (2026-10-30 사장님: 부제 겹치지 않게)
  const placed: { x0: number; x1: number; y1: number; oy: number }[] = [];
  for (const t of lay.texts) {
    const v = String(c[t.slot as keyof Content] || "").trim();
    if (!v || used.has(t.slot)) continue; // 내용이 없으면 칸을 만들지 않는다 (지어내지 않음)
    if (t.slot === "agency" && labelAt.has(`${t.x},${t.y}`)) continue;
    used.add(t.slot);
    const px = Math.round(t.size * (aspectOf(W, H) === "tall" ? H : S));
    const tl = textSlotLayer(SLOT_NAME[t.slot], v, t.look, px, t.w * W - (t.icon ? px * 1.4 : 0), t.x * W, t.y * H, t.align, Boolean(t.vc), t.slot, Boolean(t.oneLine));
    {
      const nb = boundsOf(tl);
      if (nb) {
        const gap = Math.round(px * 0.2);
        let push = 0;
        for (const p of placed) if (p.oy < t.y * H && nb.x < p.x1 && nb.x + nb.w > p.x0 && p.y1 + gap > nb.y) push = Math.max(push, p.y1 + gap - nb.y);
        // 그림 밖으로 밀려 잘리지는 않게 — 아래 끝(2%)에서 멈춘다
        push = Math.min(push, Math.max(0, H - Math.round(H * 0.02) - (nb.y + nb.h)));
        if (push > 0) offsetLayer(tl, 0, push);
        const fb = boundsOf(tl)!;
        placed.push({ x0: fb.x, x1: fb.x + fb.w, y1: fb.y + fb.h, oy: t.y * H });
      }
    }
    if (t.icon) {
      // 글 앞 픽토그램 — 글자 색 · 글 높이 가운데에
      const sz = Math.max(8, Math.round(px * 1.05)), gap = Math.round(px * 0.35);
      const tb = boundsOf(tl)!;
      if (t.align === "left") offsetLayer(tl, sz + gap, 0);
      else if (t.align === "center") offsetLayer(tl, Math.round((sz + gap) / 2), 0);
      const nb = boundsOf(tl)!;
      const ic = pictoCanvas(t.icon, sz, t.look.color || "#FFFFFF", "line");
      const ix = Math.round(nb.x - gap - sz), iy = Math.round(tb.y + tb.h / 2 - sz / 2);
      out.push({ _k: uid(), name: `${pictoOf(t.icon).name} 아이콘`, canvas: ic, left: ix, top: iy, right: ix + sz, bottom: iy + sz, _picto: { id: t.icon, color: t.look.color || "#FFFFFF", style: "line" } });
    }
    out.push(tl);
  }
  // 홈페이지 QR — 흰 바탕 위에 테마 색 점 (어두운 명함에서도 찍히게)
  if (lay.qr && c.homepage) {
    const sz = Math.max(40, Math.round(lay.qr.size * S));
    const cv = qrCanvas(c.homepage, sz, lay.qr.color);
    const ix = Math.round(lay.qr.x * W - cv.width / 2), iy = Math.round(lay.qr.y * H - cv.height / 2);
    out.push({ _k: uid(), name: "QR코드 (홈페이지)", canvas: cv, left: ix, top: iy, right: ix + cv.width, bottom: iy + cv.height });
  }
  // SNS — 아이콘 + 짧은 주소를 한 줄로 (넘치면 함께 줄인다)
  if (lay.sns && c.sns) {
    const s = lay.sns;
    const items = c.sns.split("\n").map((ln) => { const i = ln.indexOf("|"); return { k: ln.slice(0, i), t: ln.slice(i + 1).trim() }; }).filter((x) => x.k && x.t).slice(0, 3);
    const build = (px: number) => items.map((it) => {
      const isz = Math.round(px * 1.2);
      const tl = textSlotLayer(`SNS ${SNS_NAME[it.k] || it.k}`, it.t, { color: s.color, bold: false }, px, 99999, 0, 0, "left", false, undefined, true);
      const tb = boundsOf(tl)!;
      return { it, isz, tl, tw: tb.w, th: tb.h, gap: Math.round(px * 0.3) };
    });
    let px = Math.max(8, Math.round(s.size * S));
    let row = build(px);
    const sp = () => Math.round(px * 1.1);
    const total = () => row.reduce((a, r) => a + r.isz + r.gap + r.tw, 0) + sp() * (row.length - 1);
    if (items.length && total() > s.w * W) { px = Math.max(8, Math.floor((px * s.w * W) / total())); row = build(px); }
    let x = s.align === "left" ? s.x * W : s.align === "right" ? s.x * W - total() : s.x * W - total() / 2;
    const cy = s.y * H;
    for (const r of row) {
      const ix = Math.round(x), iy = Math.round(cy - r.isz / 2), id = SNS_PICTO[r.it.k] || "globe";
      out.push({ _k: uid(), name: `${SNS_NAME[r.it.k] || "SNS"} 아이콘`, canvas: pictoCanvas(id, r.isz, s.color, "line"), left: ix, top: iy, right: ix + r.isz, bottom: iy + r.isz, _picto: { id, color: s.color, style: "line" } });
      const tb = boundsOf(r.tl)!;
      offsetLayer(r.tl, Math.round(x + r.isz + r.gap - tb.x), Math.round(cy - r.th / 2 - tb.y));
      out.push(r.tl);
      x += r.isz + r.gap + r.tw + sp();
    }
  }
  if (aiMark) {
    // AI 로 다듬은 실제 사진 — 작게 표시 (허위 광고 막기)
    const px = Math.max(10, Math.round(S * 0.02));
    out.push(textSlotLayer(SLOT_NAME.aimark, "AI 보정", { color: "#FFFFFF", bold: false, bg: true, bgColor: "#000000", bgOpacity: 0.45 }, px, W, W * 0.008, H - px * 1.75, "left", false, "aimark"));
  }
  return out;
}

const SNS_PICTO: Record<string, string> = { blog: "sns_blog", instagram: "sns_insta", youtube: "sns_youtube", kakao: "sns_kakao", cafe: "sns_cafe", threads: "sns_threads", facebook: "sns_facebook", twitter: "sns_threads" };
const SNS_NAME: Record<string, string> = { blog: "블로그", instagram: "인스타그램", youtube: "유튜브", kakao: "카카오", cafe: "카페", threads: "스레드", facebook: "페이스북", twitter: "X" };
/** 홈페이지 QR 그림 — 흰 바탕(둘레 2칸 여백) 위에 color 점. "QR" 이면 템플릿 자리 표시 (지어낸 주소를 넣지 않는다) */
export function qrCanvas(text: string, size: number, color: string) {
  if (text === "QR") {
    const c = mk(size, size), g = c.getContext("2d")!;
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, size, size);
    g.strokeStyle = color; g.lineWidth = Math.max(2, size * 0.02); g.setLineDash([size * 0.06, size * 0.04]);
    g.strokeRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);
    g.fillStyle = color; g.font = `700 ${Math.round(size * 0.16)}px Pretendard, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("QR", size / 2, size * 0.42);
    g.font = `500 ${Math.round(size * 0.09)}px Pretendard, sans-serif`;
    g.fillText("홈페이지", size / 2, size * 0.62);
    return c;
  }
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount(), m = n + 4, cell = Math.max(1, Math.floor(size / m)), s = cell * m;
  const c = mk(s, s), g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, s, s);
  g.fillStyle = color;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + 2) * cell, (r + 2) * cell, cell, cell);
  return c;
}

/** 내 템플릿 · 지금 문서에 새 내용 넣기 — 칸 이름표가 있는 레이어만 바꾼다 */
export function refill(doc: Doc, c: Content, bg: HTMLCanvasElement | null) {
  let n = 0;
  walk(kids(doc.psd), (l) => {
    const s = l._slot as Slot | undefined;
    if (!s) return;
    if (s === "bg" && bg && l.canvas) {
      const b = boundsOf(l)!;
      const cv = coverCanvas(bg, b.w, b.h);
      l.canvas = cv;
      delete l._src;
      l.right = (l.left || 0) + cv.width;
      l.bottom = (l.top || 0) + cv.height;
      n++;
      return;
    }
    const v = String(c[s as keyof Content] || "").trim();
    if (!v || !l._look) return;
    const b = boundsOf(l)!;
    const align = l._look.align || "left";
    const ax = align === "center" ? b.x + b.w / 2 : align === "right" ? b.x + b.w : b.x;
    applyLook(l, { ...l._look, text: v }, false);
    const w = l.canvas!.width;
    offsetLayer(l, Math.round((align === "center" ? ax - w / 2 : align === "right" ? ax - w : ax) - (l.left || 0)), 0);
    l.name = SLOT_NAME[s] || l.name;
    n++;
  });
  return n;
}

/** CSS 색 (#rgb · #rrggbb · rgba()) → #RRGGBB 와 진하기 */
function cssHex(c: string): { hex: string; a: number } {
  const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?/i.exec(c);
  if (m) return { hex: "#" + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("").toUpperCase(), a: m[4] !== undefined ? Number(m[4]) : 1 };
  const h = c.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6);
  return { hex: `#${full.toUpperCase()}`, a: 1 };
}
/** 디자인 템플릿(영상 편집기 127종) → 레이어 묶음: 판·장식 그림 + 고칠 수 있는 글자 레이어 */
export function tplGroup(doc: Doc, id: string, fields?: string[], color?: string): PLayer | null {
  const sp = tplSplit(id, fields, color);
  if (!sp) return null;
  const W = doc.psd.width, H = doc.psd.height;
  const k = Math.min((W * sp.def.w) / sp.full.width, (H * 0.8) / sp.full.height);
  const fw = sp.full.width * k, fh = sp.full.height * k;
  const ox = (W - fw) / 2, oy = sp.def.y ? Math.min(H - fh, Math.max(0, H * sp.def.y - fh / 2)) : (H - fh) / 2;
  const children: PLayer[] = [];
  const decor = k === 1 ? sp.decor : scaled(sp.decor, fw, fh);
  children.push({ _k: uid(), name: `${sp.def.label} 판`, canvas: decor, _src: k < 1 ? sp.decor : undefined, left: Math.round(ox), top: Math.round(oy), right: Math.round(ox) + decor.width, bottom: Math.round(oy) + decor.height });
  for (const t of sp.texts) {
    // 그려진 너비로 글자 크기를 맞춘다 (템플릿 안에서 늘리거나 줄인 글)
    const kk = Math.max(0.4, Math.min(2.5, (t.box.w - (t.lw || 0)) / tplTextWidth(t)));
    const px = Math.max(6, Math.round(t.px * kk * k));
    const look: TextLook = {
      font: t.family, bold: t.weight >= 600 ? undefined : false, italic: t.italic || undefined, color: t.fill,
      outline: t.stroke, outlineWidth: t.stroke && t.lw ? Math.max(1, Math.round(((t.lw / 2) * 50) / t.px)) : 0,
      glow: t.glow ? cssHex(t.glow).hex : "",
      // 템플릿 그림자는 (5, 6) 만큼 딱딱한 그림자 — 같은 거리 · 같은 진하기로
      ...(t.shadow ? { shadow: 7.8 / (t.px * 1.41), shadowColor: cssHex(t.shadow).hex, shadowAlpha: 1 - cssHex(t.shadow).a } : { shadow: 0 }),
    };
    const cx = ox + (t.box.x + t.box.w / 2) * k, cy = oy + (t.box.y + t.box.h / 2) * k;
    const l: PLayer = { _k: uid(), name: (t.text || "글자").replace(/\s+/g, " ").slice(0, 20), left: 0, top: 0 };
    applyLook(l, { ...look, align: t.align, text: t.text, px }, false);
    offsetLayer(l, Math.round(cx - l.canvas!.width / 2), Math.round(cy - l.canvas!.height / 2));
    children.push(l);
  }
  return { _k: uid(), name: sp.def.label, opened: true, children, blendMode: "pass through", _tpl: { id, fields: sp.vals, color: color || sp.def.color } };
}
