// 문서편집 — 문서 모델 (용지·여백·머리글·바닥글 + 본문은 TipTap JSON)
import type { JSONContent } from "@tiptap/core";

export type PageSetup = {
  paper: string; // A4 · A3 · B5 …
  w: number; h: number; // mm (세로 기준)
  landscape: boolean;
  margin: { top: number; right: number; bottom: number; left: number }; // mm
  header: string; footer: string; // 글 ({PAGE} = 쪽 번호, {PAGES} = 전체 쪽)
  headerAlign: "left" | "center" | "right"; footerAlign: "left" | "center" | "right";
  pageNumber: "none" | "bottom-center" | "bottom-right" | "top-right" | "top-center";
  watermark: string; // 글 워터마크 ("" = 없음)
  pageColor: string; // "" = 흰색
  pageBorder: string; // "" = 없음 · 색
  theme: string; // 디자인 › 문서 서식 id
  lineNumbers?: boolean;
};
export type DocData = { page: PageSetup; json: JSONContent; meta?: { title?: string; font?: string; size?: number } };

export const PAPERS: { id: string; name: string; w: number; h: number }[] = [
  { id: "A4", name: "A4", w: 210, h: 297 },
  { id: "A3", name: "A3", w: 297, h: 420 },
  { id: "A5", name: "A5", w: 148, h: 210 },
  { id: "B4", name: "B4 (JIS)", w: 257, h: 364 },
  { id: "B5", name: "B5 (JIS)", w: 182, h: 257 },
  { id: "Letter", name: "Letter", w: 215.9, h: 279.4 },
  { id: "Legal", name: "Legal", w: 215.9, h: 355.6 },
];
/** 워드 여백 미리 설정 (mm) */
export const MARGINS: { id: string; name: string; m: PageSetup["margin"] }[] = [
  { id: "normal", name: "보통", m: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 } },
  { id: "narrow", name: "좁게", m: { top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 } },
  { id: "moderate", name: "보통 (좌우 좁게)", m: { top: 25.4, right: 19.05, bottom: 25.4, left: 19.05 } },
  { id: "wide", name: "넓게", m: { top: 25.4, right: 50.8, bottom: 25.4, left: 50.8 } },
  { id: "hwp", name: "한글 기본", m: { top: 20, right: 30, bottom: 15, left: 30 } },
];
export const DEFAULT_PAGE: PageSetup = {
  paper: "A4", w: 210, h: 297, landscape: false, margin: { ...MARGINS[0].m },
  header: "", footer: "", headerAlign: "center", footerAlign: "center", pageNumber: "none",
  watermark: "", pageColor: "", pageBorder: "", theme: "basic",
};
export const pageSize = (p: PageSetup) => (p.landscape ? { w: p.h, h: p.w } : { w: p.w, h: p.h });

/** 글꼴 — PC 에 있는 한글·영문 글꼴 + 스튜디오 웹 글꼴 */
export const FONTS: { family: string; label: string }[] = [
  { family: "맑은 고딕", label: "맑은 고딕" }, { family: "굴림", label: "굴림" }, { family: "돋움", label: "돋움" }, { family: "바탕", label: "바탕" },
  { family: "궁서", label: "궁서" }, { family: "함초롬바탕", label: "함초롬바탕" }, { family: "함초롬돋움", label: "함초롬돋움" },
  { family: "Pretendard", label: "Pretendard" }, { family: "NanumGothic", label: "나눔고딕" }, { family: "NanumMyeongjo", label: "나눔명조" },
  { family: "GmarketSans", label: "지마켓 산스" }, { family: "Black Han Sans", label: "검은고딕" }, { family: "Gowun Dodum", label: "고운돋움" },
  { family: "Arial", label: "Arial" }, { family: "Calibri", label: "Calibri" }, { family: "Times New Roman", label: "Times New Roman" }, { family: "Georgia", label: "Georgia" },
];
export const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

/** 디자인 › 문서 서식 — 제목 글꼴·색 묶음 (워드 테마처럼) */
export const THEMES: { id: string; name: string; body: string; head: string; color: string; h1: number; h2: number; h3: number }[] = [
  { id: "basic", name: "기본", body: "맑은 고딕", head: "맑은 고딕", color: "#1F3864", h1: 16, h2: 13, h3: 12 },
  { id: "classic", name: "클래식", body: "바탕", head: "바탕", color: "#000000", h1: 18, h2: 14, h3: 12 },
  { id: "modern", name: "모던", body: "Pretendard", head: "Pretendard", color: "#2563EB", h1: 20, h2: 15, h3: 13 },
  { id: "green", name: "그린", body: "맑은 고딕", head: "NanumGothic", color: "#0E7A4B", h1: 18, h2: 14, h3: 12 },
  { id: "warm", name: "웜", body: "돋움", head: "Gowun Dodum", color: "#B45309", h1: 18, h2: 14, h3: 12 },
  { id: "report", name: "보고서", body: "함초롬바탕", head: "함초롬돋움", color: "#0B1F4D", h1: 17, h2: 14, h3: 12 },
  { id: "news", name: "공실뉴스", body: "Pretendard", head: "GmarketSans", color: "#1A3A6B", h1: 20, h2: 15, h3: 13 },
];

export const emptyDoc = (): JSONContent => ({ type: "doc", content: [{ type: "paragraph" }] });
export const newDoc = (): DocData => ({ page: { ...DEFAULT_PAGE, margin: { ...DEFAULT_PAGE.margin } }, json: emptyDoc() });

/** 파일 이름 앞 날짜 — 20261022 문서 (기본값, 회원이 바꿈) */
export const datedTitle = (t = "문서") => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")} ${t}`;
};
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** 워드의 "1줄" 높이 ÷ 글자 크기 (글꼴마다 다름 — 워드 365 로 잰 값, 2026-10-22)
 *  편집기·한글은 줄 간격 1.6 = 글자 크기 × 1.6 이고, 워드는 글꼴 자체 줄 높이 × 배수라서 저장·열기 때 이 값으로 바꾼다.
 *  한글이 섞인 글은 한글 글꼴(동아시아 글꼴)이 줄 높이를 정한다 — 없는 글꼴은 워드가 맑은 고딕으로 바꿔 그린다 */
export function wordLineRatio(font?: string) {
  const f = (font || "").replace(/['"]/g, "").trim();
  if (/^(바탕|굴림|돋움|궁서|Batang|Gulim|Dotum|Gungsuh)/i.test(f)) return 1.317;
  if (/함초롬|Hamchorom/i.test(f)) return 1.702;
  if (/나눔|Nanum/i.test(f)) return 1.517;
  return 1.745; // 맑은 고딕 · 그 밖 (워드 기본 대체 글꼴)
}
