// 이미지 편집 — AI 자동 디자인의 레이아웃 틀 · 레이어 조립 · 디자인 템플릿 레이어로 나누기
// 원칙 (docs/2026-10-22_photo_ai_layout_plan.md):
//  - 위치는 AI 가 아니라 틀이 정한다. AI 는 제목·부제·딱지 문구와 배경 장면만
//  - 가격·면적·주소·중개사는 공실 자료 그대로 (없으면 그 칸을 만들지 않는다 — 가짜 데이터 금지)
//  - 결과는 레이어 묶음. 칸마다 _slot 이름표 → 다른 공실을 넣으면 그 칸만 바뀐다
import type { TextLook } from "@/components/admin/studio-video/SubPresets";
import { tplSplit, tplTextWidth } from "@/components/admin/studio-video/Templates";
import { applyLook, boundsOf, composite, kids, mk, offsetLayer, renderText, scaled, uid, walk, type Doc, type PLayer } from "./model";
import { pictoCanvas, pictoOf } from "./pictos";

export type Slot = "bg" | "shade" | "panel" | "card" | "badge" | "title" | "sub" | "price" | "area" | "address" | "agency" | "label" | "source" | "aimark"
  | "office" | "ceo" | "phone" | "officeAddr" | "regNum";
export const SLOT_NAME: Record<Slot, string> = {
  bg: "배경 사진", shade: "어둡게 깔기", panel: "판", card: "카드", badge: "딱지", title: "제목", sub: "부제", price: "가격", area: "면적",
  address: "주소", agency: "중개사무소", label: "머리표", source: "출처", aimark: "AI 보정 표시",
  office: "상호", ceo: "대표", phone: "전화", officeAddr: "사무소 주소", regNum: "등록번호",
};
/** 레이어 칸으로 고를 수 있는 것 (내 템플릿 만들 때) */
export const SLOT_PICK: Slot[] = ["bg", "title", "sub", "badge", "price", "area", "address", "agency", "source", "office", "ceo", "phone", "officeAddr", "regNum"];
export type Content = { title?: string; sub?: string; badge?: string; price?: string; area?: string; address?: string; agency?: string; source?: string; label?: string;
  office?: string; ceo?: string; phone?: string; officeAddr?: string; regNum?: string };
/** 종류 — 처음 화면 · AI 자동 디자인의 분류와 같다 */
export type Cat = "youtube" | "blog" | "sns" | "realty" | "basic";
export const CAT_NAME: Record<Cat, string> = { youtube: "유튜브", blog: "블로그", sns: "SNS", realty: "부동산마케팅", basic: "기본" };
export type CatSize = { name: string; w: number; h: number; ppi?: number };
/** 종류마다 디자인할 크기 (처음 화면 [만들기] 목록과 같은 값) */
export const CAT_SIZES: Record<Cat, CatSize[]> = {
  youtube: [{ name: "유튜브 썸네일", w: 1280, h: 720 }, { name: "영상 끝 화면", w: 1920, h: 1080 }],
  blog: [{ name: "대표 이미지 (가로 3:2)", w: 1200, h: 800 }, { name: "대표 이미지 (정사각)", w: 1080, h: 1080 }, { name: "본문 이미지 (가로 16:9)", w: 1920, h: 1080 }, { name: "본문 이미지 (세로 4:5)", w: 1080, h: 1350 }],
  sns: [{ name: "인스타 피드 정사각", w: 1080, h: 1080 }, { name: "인스타 카드뉴스", w: 1080, h: 1350 }, { name: "스토리 · 릴스", w: 1080, h: 1920 }, { name: "링크 공유 이미지", w: 1200, h: 630 }],
  realty: [
    { name: "전단지 A4", w: 2480, h: 3508, ppi: 300 }, { name: "유리창 홍보지 A4", w: 2480, h: 3508, ppi: 300 }, { name: "유리창 홍보지 A2", w: 4961, h: 7016, ppi: 300 },
    { name: "X배너", w: 3543, h: 10630, ppi: 150 }, { name: "현수막", w: 19685, h: 3543, ppi: 100 }, { name: "일반 명함", w: 1063, h: 591, ppi: 300 },
  ],
  basic: [{ name: "웹 큰 화면", w: 1920, h: 1080 }, { name: "웹 HD", w: 1280, h: 720 }, { name: "A4", w: 2480, h: 3508, ppi: 300 }, { name: "A3", w: 3508, h: 4961, ppi: 300 }],
};
/** icon = 글 앞에 붙는 픽토그램 (pictos.ts id) */
type TextSlot = { slot: Exclude<Slot, "bg" | "shade" | "panel" | "card">; x: number; y: number; w: number; size: number; align: "left" | "center" | "right"; vc?: boolean; look: TextLook; icon?: string };
type BoxSlot = { slot: "shade" | "panel" | "card"; x: number; y: number; w: number; h: number; color: string; alpha: number; grad?: "down" | "up" | "left" | "right"; radius?: number };
/** cats = 어느 종류의 샘플로 보일지 · sizes = 맞는 크기 이름 (인쇄물처럼 크기가 정해진 틀) · kind "agency" = 공실·기사 없이 중개사무소 정보로 (명함) */
export type Layout = { id: string; name: string; aspect: ("wide" | "square" | "tall")[]; kind: ("vacancy" | "article" | "agency")[]; cats: Cat[]; sizes?: string[]; bg: { x: number; y: number; w: number; h: number }; boxes: BoxSlot[]; texts: TextSlot[] };

const W1 = "#FFFFFF", Y = "#FFD400", INK = "#111111";
/** 인쇄 틀이 맞는 크기 이름 (처음 화면 · 새로운 문서의 크기 이름과 같다) */
const PRINT = ["A4", "A3", "전단지 A4", "유리창 홍보지 A4", "유리창 홍보지 A2"];
const BIZ = ["일반 명함", "고급 명함 (양면)"];
const shadow: TextLook = { shadow: 0.06, shadowColor: "#000000", shadowAlpha: 0.45 };
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
      { slot: "title", x: 0.04, y: 0.24, w: 0.37, size: 0.12, align: "left", look: { color: INK, font: "Black Han Sans" } },
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
      { slot: "title", x: 0.5, y: 0.8, w: 0.94, size: 0.13, align: "center", vc: true, look: { color: W1, font: "Black Han Sans", outline: "#7F1D1D", outlineWidth: 4 } },
      { slot: "sub", x: 0.5, y: 0.6, w: 0.9, size: 0.05, align: "center", vc: true, look: { color: W1, outline: "#000000", outlineWidth: 6 } },
    ],
  },
  {
    id: "yt_top", name: "유튜브 — 위 띠 (뉴스)", aspect: ["wide"], kind: ["article", "vacancy"], cats: ["basic", "youtube", "sns"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [
      { slot: "panel", x: 0, y: 0, w: 1, h: 0.17, color: "#0B1220", alpha: 0.92 },
      { slot: "shade", x: 0, y: 0.45, w: 1, h: 0.55, color: "#000000", alpha: 0.85, grad: "down" },
    ],
    texts: [
      { slot: "label", x: 0.03, y: 0.085, w: 0.3, size: 0.055, align: "left", vc: true, look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "badge", x: 0.03, y: 0.085, w: 0.3, size: 0.055, align: "left", vc: true, look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "source", x: 0.97, y: 0.085, w: 0.5, size: 0.035, align: "right", vc: true, look: { color: "#CBD5E1", bold: false } },
      { slot: "agency", x: 0.97, y: 0.085, w: 0.5, size: 0.035, align: "right", vc: true, look: { color: "#CBD5E1", bold: false }, icon: "phone" },
      { slot: "title", x: 0.04, y: 0.6, w: 0.92, size: 0.12, align: "left", look: { color: Y, font: "Black Han Sans", outline: "#000000", outlineWidth: 6 } },
      { slot: "sub", x: 0.04, y: 0.82, w: 0.92, size: 0.05, align: "left", look: { color: W1 } },
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
      { slot: "title", x: 0.5, y: 0.7, w: 0.9, size: 0.12, align: "center", vc: true, look: { color: W1, font: "Black Han Sans", outline: "#000000", outlineWidth: 6 } },
      { slot: "sub", x: 0.5, y: 0.86, w: 0.86, size: 0.05, align: "center", vc: true, look: { color: Y } },
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
    id: "yt_review_0", name: "유튜브 — 아래 상자 두 줄 (노랑·흰)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.55, w: 1, h: 0.45, color: "#000000", alpha: 0.45, grad: "down" }],
    texts: [
      { slot: "label", x: 0.04, y: 0.06, w: 0.6, size: 0.14, align: "left", look: { color: "#F5F1E8", font: "NanumMyeongjo", italic: true, outline: "#1F2937", outlineWidth: 1, ...shadow } },
      { slot: "agency", x: 0.97, y: 0.05, w: 0.35, size: 0.032, align: "right", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.2, y: 0.38, w: 0.4, size: 0.045, align: "left", look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: "#111111" } },
      { slot: "title", x: 0.03, y: 0.64, w: 0.75, size: 0.095, align: "left", look: { bg: true, bgColor: "#1F2937", bgOpacity: 0.88, color: "#FFE14D", font: "GmarketSans" } },
      { slot: "sub", x: 0.03, y: 0.81, w: 0.75, size: 0.095, align: "left", look: { bg: true, bgColor: "#1F2937", bgOpacity: 0.9, color: "#FFFFFF", font: "GmarketSans" } },
    ],
  },
  {
    id: "yt_review_1", name: "유튜브 — 아래 상자 두 줄 (흰·흰)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.55, w: 1, h: 0.45, color: "#000000", alpha: 0.45, grad: "down" }],
    texts: [
      { slot: "label", x: 0.04, y: 0.06, w: 0.6, size: 0.14, align: "left", look: { color: "#F5F1E8", font: "NanumMyeongjo", italic: true, outline: "#1F2937", outlineWidth: 1, ...shadow } },
      { slot: "agency", x: 0.97, y: 0.05, w: 0.35, size: 0.032, align: "right", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.2, y: 0.38, w: 0.4, size: 0.045, align: "left", look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: "#111111" } },
      { slot: "title", x: 0.03, y: 0.64, w: 0.75, size: 0.095, align: "left", look: { bg: true, bgColor: "#334155", bgOpacity: 0.88, color: "#FFFFFF", font: "GmarketSans" } },
      { slot: "sub", x: 0.03, y: 0.81, w: 0.75, size: 0.095, align: "left", look: { bg: true, bgColor: "#111827", bgOpacity: 0.9, color: "#FFFFFF", font: "GmarketSans" } },
    ],
  },
  {
    id: "yt_review_2", name: "유튜브 — 아래 상자 두 줄 (흰·빨강 상자)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.55, w: 1, h: 0.45, color: "#000000", alpha: 0.45, grad: "down" }],
    texts: [
      { slot: "label", x: 0.04, y: 0.06, w: 0.6, size: 0.14, align: "left", look: { color: "#F5F1E8", font: "NanumMyeongjo", italic: true, outline: "#1F2937", outlineWidth: 1, ...shadow } },
      { slot: "agency", x: 0.97, y: 0.05, w: 0.35, size: 0.032, align: "right", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.2, y: 0.38, w: 0.4, size: 0.045, align: "left", look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: "#111111" } },
      { slot: "title", x: 0.03, y: 0.64, w: 0.75, size: 0.095, align: "left", look: { bg: true, bgColor: "#111827", bgOpacity: 0.88, color: "#FFFFFF", font: "GmarketSans" } },
      { slot: "sub", x: 0.03, y: 0.81, w: 0.75, size: 0.095, align: "left", look: { bg: true, bgColor: "#B91C1C", bgOpacity: 0.9, color: "#FFFFFF", font: "GmarketSans" } },
    ],
  },
  {
    id: "yt_review_3", name: "유튜브 — 아래 상자 두 줄 (올리브)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.55, w: 1, h: 0.45, color: "#000000", alpha: 0.45, grad: "down" }],
    texts: [
      { slot: "label", x: 0.04, y: 0.06, w: 0.6, size: 0.14, align: "left", look: { color: "#F5F1E8", font: "NanumMyeongjo", italic: true, outline: "#1F2937", outlineWidth: 1, ...shadow } },
      { slot: "agency", x: 0.97, y: 0.05, w: 0.35, size: 0.032, align: "right", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.2, y: 0.38, w: 0.4, size: 0.045, align: "left", look: { bg: true, bgColor: "#FFFFFF", bgOpacity: 1, color: "#111111" } },
      { slot: "title", x: 0.03, y: 0.64, w: 0.75, size: 0.095, align: "left", look: { bg: true, bgColor: "#3F4A2C", bgOpacity: 0.88, color: "#FFFFFF", font: "GmarketSans" } },
      { slot: "sub", x: 0.03, y: 0.81, w: 0.75, size: 0.095, align: "left", look: { bg: true, bgColor: "#3F4A2C", bgOpacity: 0.9, color: "#FDE68A", font: "GmarketSans" } },
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
      { slot: "title", x: 0.5, y: 0.8, w: 0.92, size: 0.08, align: "center", vc: true, look: { color: W1, outline: "#000000", outlineWidth: 2, ...shadow } },
    ],
  },
  /* 강연·인물 썸네일 — 왼쪽 어둡게 · 큰 흰 글씨 + 마지막 줄 강조색 · 이름 딱지 (2026-10-22 사장님) */
  {
    id: "yt_speaker_0", name: "유튜브 — 인물 왼쪽 글 (주황 강조)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.92, grad: "left" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.06, w: 0.4, size: 0.05, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "label", x: 0.03, y: 0.06, w: 0.4, size: 0.05, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "title", x: 0.04, y: 0.27, w: 0.6, size: 0.11, align: "left", look: { color: W1, font: "GmarketSans" } },
      { slot: "sub", x: 0.04, y: 0.55, w: 0.62, size: 0.11, align: "left", look: { color: "#FF5A1F", font: "GmarketSans" } },
      { slot: "badge", x: 0.04, y: 0.75, w: 0.5, size: 0.045, align: "left", look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
    ],
  },
  {
    id: "yt_speaker_1", name: "유튜브 — 인물 왼쪽 글 (노랑 강조)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.92, grad: "left" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.06, w: 0.4, size: 0.05, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "label", x: 0.03, y: 0.06, w: 0.4, size: 0.05, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "title", x: 0.04, y: 0.27, w: 0.6, size: 0.11, align: "left", look: { color: W1, font: "GmarketSans" } },
      { slot: "sub", x: 0.04, y: 0.55, w: 0.62, size: 0.11, align: "left", look: { color: "#FFD400", font: "GmarketSans" } },
      { slot: "badge", x: 0.04, y: 0.75, w: 0.5, size: 0.045, align: "left", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
    ],
  },
  {
    id: "yt_speaker_2", name: "유튜브 — 인물 왼쪽 글 (하늘 강조)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0, w: 1, h: 1, color: "#000000", alpha: 0.92, grad: "left" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.06, w: 0.4, size: 0.05, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "label", x: 0.03, y: 0.06, w: 0.4, size: 0.05, align: "left", look: { color: W1, font: "Black Han Sans" } },
      { slot: "title", x: 0.04, y: 0.27, w: 0.6, size: 0.11, align: "left", look: { color: W1, font: "GmarketSans" } },
      { slot: "sub", x: 0.04, y: 0.55, w: 0.62, size: 0.11, align: "left", look: { color: "#38BDF8", font: "GmarketSans" } },
      { slot: "badge", x: 0.04, y: 0.75, w: 0.5, size: 0.045, align: "left", look: { bg: true, bgColor: "#111827", bgOpacity: 1, color: W1 } },
    ],
  },
  /* 조회수형 썸네일 — 가운데 아래 큰 두 줄 (첫 줄 흰색 · 둘째 줄 형광 초록/노랑) · 위 빨간 따옴표 한마디 · 왼쪽 위 [이름] (2026-10-22 사장님) */
  {
    id: "yt_hook_0", name: "유튜브 — 큰 두 줄 (형광 초록)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.45, w: 1, h: 0.55, color: "#000000", alpha: 0.7, grad: "down" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.04, align: "left", look: { color: W1, outline: "#000000", outlineWidth: 4 } },
      { slot: "label", x: 0.03, y: 0.05, w: 0.4, size: 0.04, align: "left", look: { color: W1, outline: "#000000", outlineWidth: 4 } },
      { slot: "badge", x: 0.62, y: 0.05, w: 0.6, size: 0.075, align: "center", look: { color: "#E11D2A", font: "Black Han Sans", outline: "#FFFFFF", outlineWidth: 6 } },
      { slot: "title", x: 0.5, y: 0.58, w: 0.94, size: 0.12, align: "center", look: { color: W1, font: "Black Han Sans", outline: "#000000", outlineWidth: 8 } },
      { slot: "sub", x: 0.5, y: 0.76, w: 0.96, size: 0.13, align: "center", look: { color: "#7CFF4D", font: "Black Han Sans", outline: "#000000", outlineWidth: 8 } },
    ],
  },
  {
    id: "yt_hook_1", name: "유튜브 — 큰 두 줄 (노랑)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.45, w: 1, h: 0.55, color: "#000000", alpha: 0.7, grad: "down" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.04, align: "left", look: { color: W1, outline: "#000000", outlineWidth: 4 } },
      { slot: "label", x: 0.03, y: 0.05, w: 0.4, size: 0.04, align: "left", look: { color: W1, outline: "#000000", outlineWidth: 4 } },
      { slot: "badge", x: 0.62, y: 0.05, w: 0.6, size: 0.075, align: "center", look: { color: "#E11D2A", font: "Black Han Sans", outline: "#FFFFFF", outlineWidth: 6 } },
      { slot: "title", x: 0.5, y: 0.58, w: 0.94, size: 0.12, align: "center", look: { color: W1, font: "Black Han Sans", outline: "#000000", outlineWidth: 8 } },
      { slot: "sub", x: 0.5, y: 0.76, w: 0.96, size: 0.13, align: "center", look: { color: "#FFE600", font: "Black Han Sans", outline: "#000000", outlineWidth: 8 } },
    ],
  },
  {
    id: "yt_hook_2", name: "유튜브 — 큰 두 줄 (하늘)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.45, w: 1, h: 0.55, color: "#000000", alpha: 0.7, grad: "down" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.04, align: "left", look: { color: W1, outline: "#000000", outlineWidth: 4 } },
      { slot: "label", x: 0.03, y: 0.05, w: 0.4, size: 0.04, align: "left", look: { color: W1, outline: "#000000", outlineWidth: 4 } },
      { slot: "badge", x: 0.62, y: 0.05, w: 0.6, size: 0.075, align: "center", look: { color: "#E11D2A", font: "Black Han Sans", outline: "#FFFFFF", outlineWidth: 6 } },
      { slot: "title", x: 0.5, y: 0.58, w: 0.94, size: 0.12, align: "center", look: { color: W1, font: "Black Han Sans", outline: "#000000", outlineWidth: 8 } },
      { slot: "sub", x: 0.5, y: 0.76, w: 0.96, size: 0.13, align: "center", look: { color: "#5CD6FF", font: "Black Han Sans", outline: "#000000", outlineWidth: 8 } },
    ],
  },
  /* 교양·토크 방송 썸네일 — 아래 왼쪽 큰 흰 글씨 두 줄(둘째 줄 강조색) · 오른쪽 위 색 딱지 · 왼쪽 위 채널 (2026-10-22 사장님) */
  {
    id: "yt_talk_0", name: "유튜브 — 토크 두 줄 (초록)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.38, w: 1, h: 0.62, color: "#000000", alpha: 0.82, grad: "down" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.034, align: "left", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#10B981", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#10B981", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.04, y: 0.6, w: 0.9, size: 0.095, align: "left", look: { color: W1, font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
      { slot: "sub", x: 0.04, y: 0.77, w: 0.9, size: 0.095, align: "left", look: { color: "#4ADE80", font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
    ],
  },
  {
    id: "yt_talk_1", name: "유튜브 — 토크 두 줄 (주황)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.38, w: 1, h: 0.62, color: "#000000", alpha: 0.82, grad: "down" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.034, align: "left", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#F97316", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#F97316", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.04, y: 0.6, w: 0.9, size: 0.095, align: "left", look: { color: W1, font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
      { slot: "sub", x: 0.04, y: 0.77, w: 0.9, size: 0.095, align: "left", look: { color: "#FDBA74", font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
    ],
  },
  {
    id: "yt_talk_2", name: "유튜브 — 토크 두 줄 (파랑)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.38, w: 1, h: 0.62, color: "#000000", alpha: 0.82, grad: "down" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.034, align: "left", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.04, y: 0.6, w: 0.9, size: 0.095, align: "left", look: { color: W1, font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
      { slot: "sub", x: 0.04, y: 0.77, w: 0.9, size: 0.095, align: "left", look: { color: "#7DD3FC", font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
    ],
  },
  {
    id: "yt_talk_3", name: "유튜브 — 토크 두 줄 (분홍)", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "shade", x: 0, y: 0.38, w: 1, h: 0.62, color: "#000000", alpha: 0.82, grad: "down" }],
    texts: [
      { slot: "agency", x: 0.03, y: 0.05, w: 0.4, size: 0.034, align: "left", look: { color: W1, bold: false, ...shadow } },
      { slot: "badge", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#DB2777", bgOpacity: 1, color: W1 } },
      { slot: "label", x: 0.97, y: 0.05, w: 0.3, size: 0.05, align: "right", look: { bg: true, bgColor: "#DB2777", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.04, y: 0.6, w: 0.9, size: 0.095, align: "left", look: { color: W1, font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
      { slot: "sub", x: 0.04, y: 0.77, w: 0.9, size: 0.095, align: "left", look: { color: "#F9A8D4", font: "GmarketSans", outline: "#000000", outlineWidth: 3, ...shadow } },
    ],
  },
  {
    id: "yt_card", name: "유튜브 — 흰 말풍선 카드", aspect: ["wide"], kind: ["vacancy", "article"], cats: ["basic", "youtube"], bg: { x: 0, y: 0, w: 1, h: 1 },
    boxes: [{ slot: "card", x: 0.05, y: 0.56, w: 0.9, h: 0.36, color: "#FFFFFF", alpha: 0.96, radius: 28 }],
    texts: [
      { slot: "badge", x: 0.05, y: 0.08, w: 0.4, size: 0.06, align: "left", look: { bg: true, bgColor: Y, bgOpacity: 1, color: INK } },
      { slot: "label", x: 0.05, y: 0.08, w: 0.4, size: 0.055, align: "left", look: { bg: true, bgColor: "#2563EB", bgOpacity: 1, color: W1 } },
      { slot: "price", x: 0.95, y: 0.08, w: 0.45, size: 0.06, align: "right", look: { bg: true, bgColor: "#E11D48", bgOpacity: 1, color: W1 } },
      { slot: "title", x: 0.5, y: 0.69, w: 0.84, size: 0.1, align: "center", vc: true, look: { color: INK, font: "Black Han Sans" } },
      { slot: "sub", x: 0.5, y: 0.84, w: 0.84, size: 0.045, align: "center", vc: true, look: { color: "#4B5563", bold: false } },
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
    id: "flyer_a", name: "전단지 — 사진 + 정보", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: ["A4", "A3", "전단지 A4", "유리창 홍보지 A4", "유리창 홍보지 A2"], bg: { x: 0, y: 0.11, w: 1, h: 0.49 },
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
    id: "flyer_b", name: "전단지 — 큰 제목형", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: ["A4", "A3", "전단지 A4", "유리창 홍보지 A4", "유리창 홍보지 A2"], bg: { x: 0, y: 0.26, w: 1, h: 0.46 },
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
    id: "window", name: "유리창 홍보지 — 멀리서도 보이게", aspect: ["tall"], kind: ["vacancy"], cats: ["realty", "basic"], sizes: ["A4", "A3", "유리창 홍보지 A2", "유리창 홍보지 A4", "전단지 A4"], bg: { x: 0, y: 0.17, w: 1, h: 0.4 },
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
];
// 유튜브 썸네일은 글씨를 크게 — 제목·부제·딱지 1.3배 (칸 너비를 넘으면 fitText 가 두 줄·줄이기로 맞춘다, 2026-10-22 사장님)
for (const l of LAYOUTS) if (l.id.startsWith("yt_")) for (const t of l.texts) if (t.slot === "title" || t.slot === "sub" || t.slot === "badge") t.size = +(t.size * 1.3).toFixed(4);
export const aspectOf = (w: number, h: number): "wide" | "square" | "tall" => (w / h > 1.2 ? "wide" : w / h < 0.85 ? "tall" : "square");
/** 이 종류 · 크기에 맞는 틀 (kind 를 주면 그 재료로 만들 수 있는 것만) */
export const layoutsForCat = (cat: Cat, size: CatSize, kind?: "vacancy" | "article") =>
  LAYOUTS.filter((l) => l.cats.includes(cat) && (!kind || l.kind.includes(kind)) && (l.sizes ? l.sizes.includes(size.name) : l.aspect.includes(aspectOf(size.w, size.h))));
/** 샘플을 보여 줄 크기 — 그 종류의 크기 중 틀에 맞는 첫 것 */
export const sampleSizeOf = (l: Layout, cat: Cat): CatSize | null =>
  CAT_SIZES[cat].find((sz) => (l.sizes ? l.sizes.includes(sz.name) : l.aspect.includes(aspectOf(sz.w, sz.h)))) || null;
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
/** which: "living" = 거실 (기본) · "building" = 한강 건물 (썸네일 예시, 2026-10-22 사장님) */
export function loadSampleBg(which: "living" | "building" = "living"): Promise<HTMLCanvasElement | null> {
  const url = which === "building" ? "/studio-samples/building.webp" : SAMPLE_BG_URL;
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
/** 칸 이름 그대로의 내용 — 샘플을 [템플릿 열기] 할 때 (고칠 자리 표시, 지어낸 값 아님) */
export const placeholderContent = (agency?: { name?: string; ceo?: string; phone?: string; address?: string; regNum?: string }): Content => ({
  title: "제목을 입력하세요", sub: "부제를 입력하세요", badge: "딱지", price: "가격", area: "면적", address: "주소",
  agency: agency?.name ? [agency.name, agency.phone].filter(Boolean).join(" · ") : "중개사무소", label: "공실뉴스", source: "출처",
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
  const c = composite(d);
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
export function fitText(text: string, look: TextLook, px: number, maxW: number): { text: string; px: number } {
  const width = (t: string, p: number) => renderText({ ...look, text: t, px: p }).canvas.width;
  let t = text, p = px;
  if (width(t, p) <= maxW) return { text: t, px: p };
  const k = maxW / width(t, p);
  if (k >= 0.72) return { text: t, px: Math.max(8, Math.floor(p * k)) };
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
export function textSlotLayer(name: string, text: string, look: TextLook, px: number, maxW: number, ax: number, ay: number, align: "left" | "center" | "right", vc: boolean, slot?: Slot): PLayer {
  const f = fitText(text, { ...look, align }, px, maxW);
  const l: PLayer = { _k: uid(), name, left: 0, top: 0, _slot: slot };
  applyLook(l, { font: "Pretendard", color: "#111111", outlineWidth: 0, ...look, align, text: f.text, px: f.px }, false);
  const w = l.canvas!.width, h = l.canvas!.height;
  offsetLayer(l, Math.round(align === "center" ? ax - w / 2 : align === "right" ? ax - w : ax), Math.round(vc ? ay - h / 2 : ay));
  return l;
}

/** 이 틀이 쓰는 글꼴 (그리기 전에 받아 둔다 — 안 받고 그리면 다른 글꼴로 굳는다) */
export const layoutFonts = (lay: Layout) => [...new Set(["Pretendard", ...lay.texts.map((t) => t.look.font || "Pretendard")])];
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
  for (const bx of lay.boxes) out.push(imgLayer(SLOT_NAME[bx.slot], boxCanvas(bx, bx.w * W, bx.h * H), bx.x * W, bx.y * H, bx.slot));
  const used = new Set<Slot>();
  for (const t of lay.texts) {
    const v = String(c[t.slot as keyof Content] || "").trim();
    if (!v || used.has(t.slot)) continue; // 내용이 없으면 칸을 만들지 않는다 (지어내지 않음)
    used.add(t.slot);
    const px = Math.round(t.size * (aspectOf(W, H) === "tall" ? H : S));
    const tl = textSlotLayer(SLOT_NAME[t.slot], v, t.look, px, t.w * W - (t.icon ? px * 1.4 : 0), t.x * W, t.y * H, t.align, Boolean(t.vc), t.slot);
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
  if (aiMark) {
    // AI 로 다듬은 실제 사진 — 작게 표시 (허위 광고 막기)
    const px = Math.max(10, Math.round(S * 0.02));
    out.push(textSlotLayer(SLOT_NAME.aimark, "AI 보정", { color: "#FFFFFF", bold: false, bg: true, bgColor: "#000000", bgOpacity: 0.45 }, px, W, W * 0.008, H - px * 1.75, "left", false, "aimark"));
  }
  return out;
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
