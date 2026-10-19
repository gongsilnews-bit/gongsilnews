"use client";

// [삽입] → [스티커] — 부동산 스티커 (2026-10-18 사장님: "가격대비 짱!", "위치 역 1분!", "초품아!" 같은 강조 스티커 + 공실등록 테마·옵션도 모두 스티커로)
//  그림 파일을 모으지 않고 편집기에서 그린다 → 글자·색을 바꿀 수 있고 저작권 걱정 없음.
//  넣을 때 투명 PNG 한 장으로 만들어 "사진 올리기" 레이어로 붙인다 → 미리보기·완성 영상 모두 그대로, 등장·강조 움직임(톡·두근·흔들)도 사진 레이어 것을 그대로 쓴다.
//  빛 지나가기·움직이는 글로우는 다음 단계 (회의: 효과를 따로 만들어 아무 스티커에나 씌우기)
import React, { useEffect, useMemo, useState } from "react";
import type { LayerAnim, LibItem, Project } from "./types";
import { errText, videoBridge } from "./types";
import { Btn, C, FONT } from "./ui";
import { Side } from "./Panels";
import { loadFont } from "./Pickers";

export type StickerStyle = "burst" | "tag" | "pin" | "bubble" | "stamp" | "ribbon" | "neon" | "check" | "marker" | "badge" | "arrow" | "ticket" | "cloud" | "sign" | "circle" | "block";
export type Sticker = { text: string; style: StickerStyle; color?: string; icon?: string };

export const STYLE_LABEL: Record<StickerStyle, string> = {
  burst: "펑!", tag: "가격표", pin: "위치 핀", bubble: "말풍선", stamp: "도장", ribbon: "리본", neon: "네온", check: "체크", marker: "형광펜", badge: "아이콘",
  arrow: "화살표", ticket: "티켓", cloud: "구름", sign: "나무 간판", circle: "동그라미", block: "입체 글자",
};
/** 기본 색 (스티커 바탕·주색) */
const BASE: Record<StickerStyle, string> = {
  burst: "#FFD400", tag: "#E60012", pin: "#E60012", bubble: "#FFFFFF", stamp: "#D7261E", ribbon: "#1F5FD6", neon: "#FF3EA5", check: "#16A34A", marker: "#FFE600", badge: "#1A3A6B",
  arrow: "#E60012", ticket: "#FF7A00", cloud: "#FFFFFF", sign: "#8B5A2B", circle: "#E60012", block: "#FFD400",
};

/* 분류 — 공실등록 테마·옵션 (VacancyRegisterForm 테마/옵션 목록)도 모두 담았다 */
export const CATS: { id: string; label: string; items: Sticker[] }[] = [
  {
    id: "hot", label: "강조", items: [
      { text: "가격대비 짱!", style: "burst" }, { text: "대박!", style: "burst", color: "#FF7A00" }, { text: "강추!", style: "burst", color: "#FF3EA5" },
      { text: "이 가격 실화?", style: "bubble" }, { text: "여기 보세요!", style: "bubble", icon: "👀" }, { text: "놓치면 후회!", style: "ribbon", color: "#E60012" },
      { text: "딱 하나 남음!", style: "neon", color: "#FFD400" }, { text: "선착순!", style: "stamp" }, { text: "꼭 보세요", style: "marker" },
      { text: "완전 추천!", style: "neon" }, { text: "오늘만 이 가격", style: "tag", color: "#FF7A00" }, { text: "미쳤다!", style: "burst", color: "#7C3AED" },
      { text: "짠!", style: "block" }, { text: "실화?!", style: "block", color: "#22D3EE" }, { text: "SALE", style: "circle" },
      { text: "BEST", style: "badge", icon: "🏆", color: "#FF7A00" }, { text: "HOT", style: "badge", icon: "🔥", color: "#E60012" }, { text: "NEW", style: "neon", color: "#22D3EE" },
    ],
  },
  {
    id: "price", label: "가격", items: [
      { text: "전세 3억", style: "tag" }, { text: "월세 50/1000", style: "tag", color: "#1F5FD6" }, { text: "매매 5억", style: "tag", color: "#16A34A" },
      { text: "급매!", style: "burst", color: "#FFD400" }, { text: "급매물", style: "stamp" }, { text: "시세보다 저렴", style: "ribbon", color: "#E60012" },
      { text: "가격 협의 가능", style: "bubble", icon: "🤝" }, { text: "관리비 저렴", style: "marker" }, { text: "가격 인하!", style: "burst", color: "#22D3EE" },
      { text: "무권리", style: "badge", icon: "💰", color: "#16A34A" }, { text: "무피", style: "badge", icon: "💰", color: "#FF7A00" }, { text: "마이너스피", style: "badge", icon: "📉", color: "#E60012" },
      { text: "중도금무이자", style: "ribbon", color: "#7C3AED" }, { text: "전세대출가능", style: "check", icon: "🏦" }, { text: "안심전세", style: "check", icon: "🛡️", color: "#1F5FD6" },
      { text: "저렴한임대료", style: "marker", color: "#A3E635" }, { text: "가성비", style: "burst", color: "#A3E635" }, { text: "가성비매물", style: "badge", icon: "👍", color: "#16A34A" },
    ],
  },
  {
    id: "place", label: "위치·생활", items: [
      { text: "역 1분!", style: "pin", icon: "🚇" }, { text: "역세권", style: "pin", icon: "🚇", color: "#1F5FD6" }, { text: "초품아!", style: "bubble", icon: "🏫" },
      { text: "숲세권", style: "badge", icon: "🌳", color: "#16A34A" }, { text: "학세권", style: "badge", icon: "📚", color: "#1F5FD6" }, { text: "슬세권", style: "badge", icon: "🏪", color: "#FF7A00" },
      { text: "공원 앞", style: "pin", icon: "🌳", color: "#16A34A" }, { text: "버스정류장 앞", style: "pin", icon: "🚌", color: "#FF7A00" }, { text: "대로변", style: "check", icon: "🛣️" },
      { text: "IC인접", style: "pin", icon: "🚗", color: "#7C3AED" }, { text: "유동인구많음", style: "badge", icon: "👥", color: "#E60012" }, { text: "가시성최상", style: "badge", icon: "👀", color: "#1A3A6B" },
      { text: "코너자리", style: "ribbon", color: "#FF7A00" }, { text: "조용한동네", style: "bubble", icon: "🤫" }, { text: "여성안심", style: "check", icon: "🛡️", color: "#FF3EA5" },
      { text: "병원 가까움", style: "pin", icon: "🏥", color: "#22D3EE" }, { text: "마트 5분", style: "pin", icon: "🛒", color: "#16A34A" }, { text: "한강뷰", style: "neon", color: "#22D3EE" },
    ],
  },
  {
    id: "home", label: "집 장점", items: [
      { text: "신축첫입주", style: "ribbon", color: "#E60012" }, { text: "특올수리", style: "ribbon", color: "#7C3AED" }, { text: "로열층", style: "badge", icon: "👑", color: "#FF7A00" },
      { text: "뻥뷰", style: "neon", color: "#22D3EE" }, { text: "풀옵션", style: "ribbon" }, { text: "즉시입주", style: "stamp", color: "#1F5FD6" },
      { text: "반려동물가능", style: "check", icon: "🐶" }, { text: "주차편리", style: "check", icon: "🚗", color: "#1F5FD6" }, { text: "엘리베이터있음", style: "check", icon: "🛗", color: "#1A3A6B" },
      { text: "채광우수", style: "badge", icon: "☀️", color: "#FF7A00" }, { text: "남향", style: "marker" }, { text: "층간소음프리", style: "check", icon: "🔇", color: "#7C3AED" },
      { text: "마당있음", style: "badge", icon: "🌷", color: "#16A34A" }, { text: "테라스/옥상", style: "badge", icon: "🌇", color: "#FF7A00" }, { text: "복층", style: "ribbon", color: "#1A3A6B" },
      { text: "단기임대", style: "bubble", icon: "📅" }, { text: "투룸/쓰리룸", style: "badge", icon: "🛏️", color: "#1F5FD6" }, { text: "대가족추천", style: "badge", icon: "👨‍👩‍👧‍👦", color: "#E60012" },
      { text: "전원생활", style: "badge", icon: "🏡", color: "#16A34A" }, { text: "하이엔드", style: "neon", color: "#FFD400" }, { text: "리모델링", style: "ribbon", color: "#FF7A00" },
    ],
  },
  {
    id: "biz", label: "상가·사무실", items: [
      { text: "카페추천", style: "badge", icon: "☕", color: "#8B5A2B" }, { text: "음식점추천", style: "badge", icon: "🍽️", color: "#E60012" }, { text: "사옥추천", style: "badge", icon: "🏢", color: "#1A3A6B" },
      { text: "통임대", style: "ribbon", color: "#1F5FD6" }, { text: "수익형건물", style: "badge", icon: "📈", color: "#16A34A" }, { text: "메디컬빌딩", style: "badge", icon: "🏥", color: "#22D3EE" },
      { text: "드라이브인", style: "check", icon: "🚚" }, { text: "섹션오피스", style: "ribbon", color: "#7C3AED" }, { text: "층고높음", style: "badge", icon: "📏", color: "#FF7A00" },
      { text: "인테리어완비", style: "check", icon: "✨", color: "#FF3EA5" }, { text: "주차대수많음", style: "check", icon: "🅿️", color: "#1F5FD6" }, { text: "전면통유리", style: "badge", icon: "🪟", color: "#22D3EE" },
      { text: "대로변상가", style: "pin", icon: "🛣️", color: "#E60012" }, { text: "코너상가", style: "ribbon", color: "#FF7A00" }, { text: "공장부지", style: "badge", icon: "🏭", color: "#1A3A6B" },
    ],
  },
  {
    id: "opt", label: "옵션", items: [
      { text: "시스템에어컨", style: "check", icon: "❄️", color: "#1F5FD6" }, { text: "세탁기", style: "check", icon: "🧺" }, { text: "건조기", style: "check", icon: "🌀", color: "#7C3AED" },
      { text: "빌트인냉장고", style: "check", icon: "🧊", color: "#22D3EE" }, { text: "식기세척기", style: "check", icon: "🍽️", color: "#FF7A00" }, { text: "인덕션", style: "check", icon: "🔥", color: "#E60012" },
      { text: "붙박이장", style: "check", icon: "🚪", color: "#8B5A2B" }, { text: "스타일러", style: "check", icon: "👔", color: "#1A3A6B" }, { text: "도어락", style: "check", icon: "🔐" },
      { text: "무인택배함", style: "check", icon: "📦", color: "#FF7A00" }, { text: "CCTV", style: "check", icon: "📹", color: "#1A3A6B" }, { text: "중문설치", style: "check", icon: "🚪", color: "#7C3AED" },
      { text: "침대", style: "check", icon: "🛏️", color: "#1F5FD6" }, { text: "TV", style: "check", icon: "📺" }, { text: "비데", style: "check", icon: "🚽", color: "#22D3EE" },
      { text: "탕비실", style: "check", icon: "☕", color: "#8B5A2B" }, { text: "화물엘리베이터", style: "check", icon: "🛗", color: "#FF7A00" }, { text: "태양광설비", style: "check", icon: "🔆", color: "#FFB800" },
    ],
  },
  {
    id: "point", label: "가리키기", items: [
      { text: "여기!", style: "arrow" }, { text: "이 방!", style: "arrow", color: "#1F5FD6" }, { text: "주목!", style: "arrow", color: "#FF7A00" },
      { text: "포인트", style: "arrow", color: "#16A34A" }, { text: "꿀팁", style: "badge", icon: "🍯", color: "#FFB800" }, { text: "체크!", style: "check", icon: "👆", color: "#E60012" },
      { text: "놓치지 마세요", style: "cloud", icon: "👀" }, { text: "잠깐!", style: "circle", color: "#E60012" }, { text: "Q&A", style: "circle", color: "#1F5FD6" },
      { text: "궁금하죠?", style: "cloud", icon: "🤔" }, { text: "비밀 공개", style: "ticket", color: "#7C3AED" }, { text: "결론!", style: "block", color: "#FF3EA5" },
    ],
  },
  {
    id: "size", label: "면적·구조", items: [
      { text: "32평", style: "circle", color: "#1F5FD6" }, { text: "84㎡", style: "circle", color: "#16A34A" }, { text: "59㎡", style: "circle", color: "#FF7A00" },
      { text: "방3 욕실2", style: "check", icon: "🛏️", color: "#1F5FD6" }, { text: "15층", style: "badge", icon: "🏢", color: "#1A3A6B" }, { text: "판상형", style: "ribbon", color: "#16A34A" },
      { text: "4베이", style: "ribbon", color: "#FF7A00" }, { text: "대단지", style: "block", color: "#22D3EE" }, { text: "1,000세대", style: "burst", color: "#A3E635" },
      { text: "복층구조", style: "badge", icon: "🪜", color: "#7C3AED" }, { text: "넓은 거실", style: "cloud", icon: "🛋️" }, { text: "드레스룸", style: "check", icon: "👗", color: "#FF3EA5" },
      { text: "확장형", style: "ticket", color: "#1F5FD6" }, { text: "탑층", style: "circle", color: "#FFB800" }, { text: "1층 상가", style: "sign" },
    ],
  },
  {
    id: "call", label: "문의·채널", items: [
      { text: "구독", style: "block", color: "#E60012" }, { text: "좋아요", style: "badge", icon: "👍", color: "#1F5FD6" }, { text: "알림 설정", style: "badge", icon: "🔔", color: "#FFB800" },
      { text: "문의 주세요", style: "bubble", icon: "📞" }, { text: "지금 전화!", style: "burst", color: "#16A34A" }, { text: "방문 예약", style: "ticket", color: "#1F5FD6" },
      { text: "상담 무료", style: "circle", color: "#16A34A" }, { text: "더보기 👇", style: "cloud" }, { text: "공실뉴스", style: "sign" },
      { text: "매물 접수", style: "sign", color: "#1A3A6B" }, { text: "댓글 남겨주세요", style: "cloud", icon: "💬" }, { text: "끝까지 보세요", style: "ticket", color: "#E60012" },
      { text: "다음 편", style: "arrow", color: "#7C3AED" }, { text: "감사합니다", style: "block", color: "#FF3EA5" }, { text: "공유하기", style: "badge", icon: "🔗", color: "#16A34A" },
    ],
  },
  {
    id: "state", label: "상태", items: [
      { text: "계약완료", style: "stamp" }, { text: "SOLD", style: "stamp", color: "#E60012" }, { text: "공실", style: "stamp", color: "#1F5FD6" },
      { text: "예약중", style: "stamp", color: "#FF7A00" }, { text: "단독 매물", style: "ribbon", color: "#1A3A6B" }, { text: "OPEN", style: "neon", color: "#22D3EE" },
      { text: "오늘 입주 가능", style: "bubble", icon: "🔑" }, { text: "가격 조정", style: "circle", color: "#FF7A00" }, { text: "오픈 하우스", style: "sign" },
      { text: "회전율 최고", style: "ticket", color: "#16A34A" }, { text: "보러 오세요", style: "arrow", color: "#1F5FD6" }, { text: "마감 임박", style: "block", color: "#E60012" }, { text: "공실뉴스 추천", style: "badge", icon: "⭐", color: "#1A3A6B" }, { text: "현장 직접 다녀옴", style: "check", icon: "📸", color: "#FF7A00" },
    ],
  },
];

/** 스티커 글꼴의 글자 모양을 미리 받기 — 안 받으면 몇 글자만 다른 글꼴로 그려진다 */
export async function stickerGlyphs(texts: string[]) {
  const all = [...new Set(texts.join(""))].join("");
  if (!all || typeof document === "undefined" || !document.fonts) return;
  await Promise.all([`100px "Black Han Sans"`, `100px "Jua"`].map((f) => document.fonts.load(f, all).catch(() => [])));
}

/* ── 그리기 ── 큰 해상도(글자 110px 안팎)로 그려 영상에서도 또렷하게 */
const HEAD = `"Black Han Sans", "Malgun Gothic", sans-serif`;
const ROUND = `"Jua", "Malgun Gothic", sans-serif`;
const EMOJI = `"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;

function mk(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  const g = cv.getContext("2d")!;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.textBaseline = "middle";
  g.textAlign = "center";
  return { cv, g };
}
const measure = (font: string, t: string) => {
  const g = document.createElement("canvas").getContext("2d")!;
  g.font = font;
  return g.measureText(t).width;
};
/** 밝은 바탕이면 검은 글자, 어두우면 흰 글자 */
function ink(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * gg + 0.114 * b > 165 ? "#111111" : "#FFFFFF";
}
function shade(hex: string, k: number) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
/** 테두리 + 채움 글자 (스티커 느낌) */
function outlined(g: CanvasRenderingContext2D, t: string, x: number, y: number, fill: string, line: string, lw: number) {
  g.lineWidth = lw;
  g.strokeStyle = line;
  g.strokeText(t, x, y);
  g.fillStyle = fill;
  g.fillText(t, x, y);
}
/** 기울여 붙이기 — 기울인 만큼 캔버스를 넓힌다 */
function tilt(src: HTMLCanvasElement, deg: number) {
  if (!deg) return src;
  const r = (deg * Math.PI) / 180;
  const w = Math.abs(src.width * Math.cos(r)) + Math.abs(src.height * Math.sin(r));
  const h = Math.abs(src.width * Math.sin(r)) + Math.abs(src.height * Math.cos(r));
  const { cv, g } = mk(w, h);
  g.translate(w / 2, h / 2);
  g.rotate(r);
  g.drawImage(src, -src.width / 2, -src.height / 2);
  return cv;
}
/** 그림자·입체는 make3D 에서 한꺼번에 — 모양별로는 그대로 넘긴다 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lift(src: HTMLCanvasElement, _glow?: string) {
  return src;
}

/** 모양 실루엣을 한 색으로 */
function silhouette(src: HTMLCanvasElement, color: string) {
  const { cv, g } = mk(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, cv.width, cv.height);
  return cv;
}
/** 반짝이 별 (네 갈래) */
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.save();
  g.shadowColor = color;
  g.shadowBlur = r * 0.9;
  g.fillStyle = "#FFFFFF";
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * i) / 4 - Math.PI / 2, k = i % 2 ? 0.2 : 1;
    const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
  g.fill();
  g.fill();
  g.restore();
}
/**
 * 짠! 입체 스티커로 — 흰 칼선 테두리 + 아래로 두께(3D) + 위쪽 광택 + 그림자 + 반짝이 별
 *  (2026-10-18 사장님: 반짝반짝부터 짜잔! 까지 알아서, 3D 여도 좋다)
 */
function make3D(flat: HTMLCanvasElement, accent: string) {
  const B = 12, D = 16, M = 46; // 테두리 · 두께 · 여백
  const W = flat.width + M * 2, H = flat.height + M * 2 + D;
  // 1) 흰 칼선 (모양을 사방으로 번지게)
  const { cv: cut, g: cg } = mk(W, H);
  const white = silhouette(flat, "#FFFFFF");
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    cg.drawImage(white, M + Math.cos(a) * B, M + Math.sin(a) * B);
  }
  cg.drawImage(white, M, M);
  // 2) 광택 — 스티커 위쪽 절반에 흰 빛
  const { cv: face, g: fg } = mk(W, H);
  fg.drawImage(cut, 0, 0);
  fg.drawImage(flat, M, M);
  fg.globalCompositeOperation = "source-atop";
  const gl = fg.createLinearGradient(0, M - B, 0, M + flat.height * 0.55);
  gl.addColorStop(0, "rgba(255,255,255,0.42)");
  gl.addColorStop(1, "rgba(255,255,255,0)");
  fg.fillStyle = gl;
  fg.fillRect(0, 0, W, M + flat.height * 0.55);
  // 아래쪽 살짝 어둡게 — 둥글게 부푼 느낌
  const gd = fg.createLinearGradient(0, M + flat.height * 0.6, 0, M + flat.height + B);
  gd.addColorStop(0, "rgba(0,0,0,0)");
  gd.addColorStop(1, "rgba(0,0,0,0.16)");
  fg.fillStyle = gd;
  fg.fillRect(0, M + flat.height * 0.6, W, flat.height);
  // 3) 쌓기 — 그림자 → 두께 → 앞면
  const { cv, g } = mk(W, H);
  g.save();
  g.shadowColor = "rgba(0,0,0,0.5)";
  g.shadowBlur = 22;
  g.shadowOffsetY = D + 6;
  g.drawImage(silhouette(cut, "rgba(0,0,0,0.6)"), 0, 0);
  g.restore();
  const side = silhouette(cut, "#B9BEC9");
  for (let d = D; d > 0; d -= 2) g.drawImage(side, 0, d);
  g.drawImage(silhouette(cut, "#8E95A3"), 0, D); // 두께 아래 끝 진하게
  for (let d = 2; d > 0; d--) g.drawImage(side, 0, d);
  g.drawImage(face, 0, 0);
  // 4) 반짝이 — 모서리 쪽에 크고 작은 별 셋
  const r = Math.max(20, Math.min(46, flat.height * 0.2));
  star(g, M + 4, M + 6, r, accent);
  star(g, W - M - 6, M + flat.height * 0.75, r * 0.7, accent);
  star(g, W - M - r * 1.6, M - 4, r * 0.5, accent);
  return cv;
}

export function drawSticker(s: Sticker, colorIn?: string): HTMLCanvasElement {
  const color = colorIn || s.color || BASE[s.style];
  return make3D(drawFlat(s, color), s.style === "neon" ? color : s.style === "burst" || s.style === "marker" ? "#FFE14D" : color);
}

function drawFlat(s: Sticker, colorIn?: string): HTMLCanvasElement {
  const color = colorIn || s.color || BASE[s.style];
  const t = s.text.trim() || " ";
  const icon = s.icon || "";
  switch (s.style) {
    case "burst": {
      const fs = 110, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const rx = tw / 2 + 95, ry = fs * 0.62 + 70;
      const { cv, g } = mk(rx * 2 + 30, ry * 2 + 30);
      const cx = cv.width / 2, cy = cv.height / 2, N = 20;
      g.beginPath();
      for (let i = 0; i < N * 2; i++) {
        const a = (Math.PI * i) / N - Math.PI / 2, k = i % 2 ? 0.78 : 1;
        const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
      g.fillStyle = color;
      g.fill();
      g.lineWidth = 10;
      g.strokeStyle = "#111";
      g.stroke();
      g.font = font;
      const fg = ink(color) === "#111111" ? "#E60012" : "#FFFFFF";
      outlined(g, t, cx, cy + 4, fg, fg === "#FFFFFF" ? "#111" : "#FFFFFF", 16);
      return lift(tilt(cv, -6));
    }
    case "tag": {
      const fs = 100, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const h = fs + 76, w = tw + 170;
      const { cv, g } = mk(w + 8, h + 8);
      g.translate(4, 4);
      const nose = 62;
      g.beginPath();
      g.moveTo(0, h / 2); g.lineTo(nose, 0); g.lineTo(w - 22, 0); g.quadraticCurveTo(w, 0, w, 22);
      g.lineTo(w, h - 22); g.quadraticCurveTo(w, h, w - 22, h); g.lineTo(nose, h); g.closePath();
      g.fillStyle = color;
      g.fill();
      // 안쪽 점선
      g.save();
      g.setLineDash([14, 10]);
      g.lineWidth = 4;
      g.strokeStyle = ink(color) === "#FFFFFF" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.45)";
      g.beginPath();
      g.moveTo(14, h / 2); g.lineTo(nose + 6, 12); g.lineTo(w - 14, 12); g.lineTo(w - 14, h - 12); g.lineTo(nose + 6, h - 12); g.closePath();
      g.stroke();
      g.restore();
      // 구멍
      g.globalCompositeOperation = "destination-out";
      g.beginPath(); g.arc(44, h / 2, 14, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = "source-over";
      g.lineWidth = 4; g.strokeStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.arc(44, h / 2, 14, 0, Math.PI * 2); g.stroke();
      g.font = font;
      g.fillStyle = ink(color);
      g.fillText(t, nose + 12 + (w - nose - 12) / 2, h / 2 + 4);
      return lift(tilt(cv, -7));
    }
    case "pin": {
      const fs = 92, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const h = fs + 64, pr = h * 0.42;
      const pillX = pr * 1.4, w = pillX + tw + 110 + (icon ? fs * 0.9 : 0);
      const { cv, g } = mk(w + 10, h + pr * 0.7 + 10);
      g.translate(5, 5);
      // 알약
      g.beginPath();
      g.roundRect(pillX - 20, 0, w - pillX + 20, h, h / 2);
      g.fillStyle = "#FFFFFF";
      g.fill();
      g.lineWidth = 8; g.strokeStyle = color; g.stroke();
      // 핀
      const cx = pr + 6, cy = pr + 4;
      g.beginPath();
      g.arc(cx, cy, pr, Math.PI * 0.78, Math.PI * 0.22);
      g.lineTo(cx, cy + pr * 1.75);
      g.closePath();
      g.fillStyle = color; g.fill();
      g.lineWidth = 6; g.strokeStyle = "#FFFFFF"; g.stroke();
      g.beginPath(); g.arc(cx, cy, pr * 0.4, 0, Math.PI * 2); g.fillStyle = "#FFFFFF"; g.fill();
      let x = pillX + 40;
      if (icon) {
        g.font = `${fs * 0.78}px ${EMOJI}`;
        g.textAlign = "left";
        g.fillText(icon, x, h / 2 + 4);
        x += fs * 0.9;
      }
      g.textAlign = "left";
      g.font = font;
      g.fillStyle = "#111111";
      g.fillText(t, x, h / 2 + 4);
      return lift(cv);
    }
    case "bubble": {
      const fs = 104, font = `${fs}px ${ROUND}`;
      const iw = icon ? fs * 1.05 : 0;
      const tw = measure(font, t) + iw;
      const w = tw + 130, h = fs + 100, tail = 56;
      const { cv, g } = mk(w + 20, h + tail + 20);
      g.translate(10, 10);
      g.beginPath();
      g.roundRect(0, 0, w, h, h / 2.2);
      g.moveTo(w * 0.22, h - 4); g.lineTo(w * 0.14, h + tail); g.lineTo(w * 0.36, h - 4);
      g.fillStyle = color; g.fill();
      g.lineWidth = 10; g.strokeStyle = "#111"; g.stroke();
      // 꼬리 안쪽 선 지우기
      g.beginPath(); g.moveTo(w * 0.22 + 6, h - 6); g.lineTo(w * 0.36 - 6, h - 6); g.lineWidth = 12; g.strokeStyle = color; g.stroke();
      const fg = ink(color);
      let x = w / 2 - tw / 2;
      g.textAlign = "left";
      if (icon) {
        g.font = `${fs * 0.86}px ${EMOJI}`;
        g.fillText(icon, x, h / 2 + 4);
        x += iw;
      }
      g.font = font;
      g.fillStyle = fg;
      g.fillText(t, x, h / 2 + 6);
      return lift(tilt(cv, -3));
    }
    case "stamp": {
      const fs = 96, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const round = [...t].length <= 2;
      const w = round ? Math.max(tw, fs) + 110 : tw + 120, h = round ? w : fs + 96;
      const { cv, g } = mk(w + 20, h + 20);
      g.translate(10, 10);
      g.strokeStyle = color;
      g.fillStyle = color;
      if (round) {
        g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 24, 0, Math.PI * 2); g.stroke();
      } else {
        g.lineWidth = 12; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 18); g.stroke();
        g.lineWidth = 4; g.beginPath(); g.roundRect(22, 22, w - 44, h - 44, 10); g.stroke();
      }
      g.font = font;
      g.fillText(t, w / 2, h / 2 + 4);
      // 도장 잉크 얼룩 — 군데군데 빼기
      g.globalCompositeOperation = "destination-out";
      let seed = [...t].reduce((a, ch) => a + ch.charCodeAt(0), 7);
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < 90; i++) {
        g.globalAlpha = 0.25 + rnd() * 0.6;
        g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 4, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      return lift(tilt(cv, -12), "rgba(0,0,0,0.25)");
    }
    case "ribbon": {
      const fs = 92, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const w = tw + 120, h = fs + 60, tail = 70, drop = 26;
      const { cv, g } = mk(w + tail * 2, h + drop + 6);
      const x0 = tail;
      const dark = shade(color, 0.62);
      // 양 끝 꼬리 (뒤)
      for (const side of [0, 1]) {
        g.beginPath();
        const bx = side ? x0 + w - 30 : x0 - tail + 0;
        g.moveTo(bx, drop); g.lineTo(bx + tail + 30, drop); g.lineTo(bx + tail + 30, drop + h);
        g.lineTo(bx, drop + h); g.lineTo(side ? bx + 40 : bx + 40, drop + h / 2);
        if (side) { g.moveTo(bx, drop); }
        g.closePath();
        g.fillStyle = dark; g.fill();
      }
      // 오른쪽 꼬리 제비꼬리 모양
      g.globalCompositeOperation = "destination-out";
      g.beginPath(); g.moveTo(cv.width, drop); g.lineTo(cv.width - 40, drop + h / 2); g.lineTo(cv.width, drop + h); g.closePath(); g.fill();
      g.globalCompositeOperation = "source-over";
      // 접힌 그림자
      g.fillStyle = shade(color, 0.4);
      g.beginPath(); g.moveTo(x0, h); g.lineTo(x0 + 0, h + drop); g.lineTo(x0 + tail * 0.5, h); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x0 + w, h); g.lineTo(x0 + w, h + drop); g.lineTo(x0 + w - tail * 0.5, h); g.closePath(); g.fill();
      // 몸통
      g.fillStyle = color;
      g.fillRect(x0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x0, 0, w, h * 0.42);
      g.font = font;
      outlined(g, t, x0 + w / 2, h / 2 + 4, ink(color), "rgba(0,0,0,0.25)", 6);
      return lift(cv);
    }
    case "neon": {
      const fs = 120, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const { cv, g } = mk(tw + 150, fs + 120);
      const cx = cv.width / 2, cy = cv.height / 2 + 4;
      // 네온 간판 판
      g.beginPath(); g.roundRect(0, 0, cv.width, cv.height, 34);
      g.fillStyle = "#12141C"; g.fill();
      g.lineWidth = 6; g.strokeStyle = color; g.globalAlpha = 0.55; g.stroke(); g.globalAlpha = 1;
      g.font = font;
      g.shadowColor = color;
      for (const [blur, lw] of [[40, 14], [22, 10], [10, 6]] as const) {
        g.shadowBlur = blur;
        g.lineWidth = lw;
        g.strokeStyle = color;
        g.strokeText(t, cx, cy);
      }
      g.shadowBlur = 8;
      g.shadowColor = "#FFFFFF";
      g.fillStyle = "#FFFFFF";
      g.fillText(t, cx, cy);
      return lift(cv, color);
    }
    case "check": {
      const fs = 84, font = `${fs}px ${HEAD}`;
      const iw = icon ? fs * 1.0 : 0;
      const tw = measure(font, t) + iw;
      const h = fs + 56, w = h + tw + 70;
      const { cv, g } = mk(w + 10, h + 10);
      g.translate(5, 5);
      g.beginPath(); g.roundRect(h * 0.5, 0, w - h * 0.5, h, h / 2);
      g.fillStyle = "#FFFFFF"; g.fill();
      g.lineWidth = 7; g.strokeStyle = color; g.stroke();
      g.beginPath(); g.arc(h / 2, h / 2, h / 2, 0, Math.PI * 2); g.fillStyle = color; g.fill();
      g.lineWidth = 13; g.strokeStyle = ink(color);
      g.beginPath(); g.moveTo(h * 0.27, h * 0.52); g.lineTo(h * 0.44, h * 0.68); g.lineTo(h * 0.74, h * 0.34); g.stroke();
      let x = h + 22;
      g.textAlign = "left";
      if (icon) {
        g.font = `${fs * 0.8}px ${EMOJI}`;
        g.fillText(icon, x, h / 2 + 4);
        x += iw;
      }
      g.font = font;
      g.fillStyle = "#111111";
      g.fillText(t, x, h / 2 + 4);
      return lift(cv);
    }
    case "marker": {
      const fs = 110, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const { cv, g } = mk(tw + 90, fs + 80);
      const cx = cv.width / 2, cy = cv.height / 2;
      // 형광펜 — 살짝 삐뚤게 두 번
      g.globalAlpha = 0.92;
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(14, cy - fs * 0.05); g.lineTo(cv.width - 10, cy - fs * 0.16); g.lineTo(cv.width - 18, cy + fs * 0.5); g.lineTo(22, cy + fs * 0.56); g.closePath();
      g.fill();
      g.globalAlpha = 1;
      g.font = font;
      outlined(g, t, cx, cy + 2, "#111111", "#FFFFFF", 12);
      return lift(tilt(cv, -4), "rgba(0,0,0,0.2)");
    }
    case "arrow": {
      // 오른쪽을 가리키는 굵은 화살표 — 몸통 안에 글자
      const fs = 96, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const h = fs + 70, head = h * 0.62, bw = tw + 90;
      const { cv, g } = mk(bw + head + 10, h + head * 0.5 + 10);
      g.translate(5, 5 + head * 0.25);
      g.beginPath();
      g.moveTo(0, 14); g.quadraticCurveTo(0, 0, 14, 0); g.lineTo(bw, 0); g.lineTo(bw, -head * 0.25);
      g.lineTo(bw + head, h / 2); g.lineTo(bw, h + head * 0.25); g.lineTo(bw, h); g.lineTo(14, h); g.quadraticCurveTo(0, h, 0, h - 14);
      g.closePath();
      g.fillStyle = color; g.fill();
      g.lineWidth = 8; g.strokeStyle = shade(color, 0.6); g.stroke();
      g.font = font;
      outlined(g, t, bw / 2 + 6, h / 2 + 4, ink(color), "rgba(0,0,0,0.25)", 6);
      return cv;
    }
    case "ticket": {
      const fs = 88, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const stub = fs * 1.1, h = fs + 80, w = stub + tw + 90;
      const { cv, g } = mk(w + 8, h + 8);
      g.translate(4, 4);
      g.beginPath(); g.roundRect(0, 0, w, h, 16); g.fillStyle = color; g.fill();
      // 양옆 반달 홈 + 절취선
      g.globalCompositeOperation = "destination-out";
      for (const x of [0, w]) { g.beginPath(); g.arc(x, h / 2, 20, 0, Math.PI * 2); g.fill(); }
      for (const y of [0, h]) { g.beginPath(); g.arc(stub, y, 14, 0, Math.PI * 2); g.fill(); }
      g.globalCompositeOperation = "source-over";
      g.save(); g.setLineDash([10, 9]); g.lineWidth = 4; g.strokeStyle = ink(color) === "#FFFFFF" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.4)";
      g.beginPath(); g.moveTo(stub, 18); g.lineTo(stub, h - 18); g.stroke(); g.restore();
      g.font = `${fs * 0.7}px ${EMOJI}`;
      g.fillStyle = ink(color);
      g.fillText(icon || "★", stub / 2 + 4, h / 2 + 4);
      g.font = font;
      g.fillText(t, stub + (w - stub) / 2, h / 2 + 4);
      return tilt(cv, -4);
    }
    case "cloud": {
      const fs = 96, font = `${fs}px ${ROUND}`;
      const iw = icon ? fs * 1.0 : 0;
      const tw = measure(font, t) + iw;
      const w = tw + 140, h = fs + 120;
      const { cv, g } = mk(w + 40 + h * 0.8, h + 70 + h * 0.4);
      g.translate(20 + h * 0.4, 20 + h * 0.2);
      // 둥근 혹 여러 개로 구름
      const bumps: [number, number, number][] = [];
      const n = Math.max(3, Math.round(w / 110));
      for (let i = 0; i <= n; i++) {
        const x = (w * i) / n;
        bumps.push([x, h * 0.28, h * 0.3], [x, h * 0.72, h * 0.28]);
      }
      bumps.push([0, h / 2, h * 0.36], [w, h / 2, h * 0.36]);
      const draw = (pad: number, fill: string) => {
        g.fillStyle = fill;
        g.beginPath(); g.roundRect(-pad, h * 0.2 - pad, w + pad * 2, h * 0.6 + pad * 2, h * 0.3); g.fill();
        for (const [x, y, r] of bumps) { g.beginPath(); g.arc(x, y, r + pad, 0, Math.PI * 2); g.fill(); }
        // 생각 꼬리 동그라미
        g.beginPath(); g.arc(w * 0.08, h + 24, 16 + pad, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(w * 0.02, h + 52, 9 + pad, 0, Math.PI * 2); g.fill();
      };
      draw(8, "#111111");
      draw(0, color);
      let x = w / 2 - tw / 2;
      g.textAlign = "left";
      if (icon) { g.font = `${fs * 0.82}px ${EMOJI}`; g.fillText(icon, x, h / 2 + 4); x += iw; }
      g.font = font; g.fillStyle = ink(color);
      g.fillText(t, x, h / 2 + 6);
      return cv;
    }
    case "sign": {
      // 나무 간판 — 줄에 매달린 판
      const fs = 92, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const w = tw + 130, bh = fs + 80, top = 70;
      const { cv, g } = mk(w + 10, bh + top + 10);
      g.translate(5, 5);
      g.lineWidth = 7; g.strokeStyle = "#5B3A1E";
      g.beginPath(); g.moveTo(w * 0.18, top + 6); g.lineTo(w / 2, 6); g.lineTo(w * 0.82, top + 6); g.stroke();
      g.beginPath(); g.arc(w / 2, 8, 9, 0, Math.PI * 2); g.fillStyle = "#C9A227"; g.fill();
      const wood = g.createLinearGradient(0, top, 0, top + bh);
      wood.addColorStop(0, shade(color, 1.25)); wood.addColorStop(1, shade(color, 0.85));
      g.beginPath(); g.roundRect(0, top, w, bh, 14); g.fillStyle = wood; g.fill();
      g.lineWidth = 8; g.strokeStyle = shade(color, 0.55); g.stroke();
      // 나뭇결
      g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 3;
      for (let i = 1; i < 4; i++) { const y = top + (bh * i) / 4; g.beginPath(); g.moveTo(12, y); g.bezierCurveTo(w * 0.3, y - 6, w * 0.6, y + 6, w - 12, y); g.stroke(); }
      for (const x of [22, w - 22]) { g.beginPath(); g.arc(x, top + 20, 6, 0, Math.PI * 2); g.fillStyle = "#3B2412"; g.fill(); }
      g.font = font;
      outlined(g, t, w / 2, top + bh / 2 + 4, "#FFF4D6", shade(color, 0.45), 10);
      return cv;
    }
    case "circle": {
      // 동그란 배지 — 가장자리 점 장식, 큰 글자
      const len = [...t].length;
      const fs = len <= 2 ? 120 : len <= 4 ? 92 : 72, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const R = Math.max(tw / 2 + 50, fs * 0.95);
      const { cv, g } = mk(R * 2 + 20, R * 2 + 20);
      const c = R + 10;
      const rg = g.createRadialGradient(c - R * 0.3, c - R * 0.35, R * 0.1, c, c, R);
      rg.addColorStop(0, shade(color, 1.35)); rg.addColorStop(1, color);
      g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fillStyle = rg; g.fill();
      g.lineWidth = 6; g.strokeStyle = "rgba(255,255,255,0.85)";
      g.beginPath(); g.arc(c, c, R - 16, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 24; i++) { const a = (Math.PI * 2 * i) / 24; g.beginPath(); g.arc(c + Math.cos(a) * (R - 6), c + Math.sin(a) * (R - 6), 3.5, 0, Math.PI * 2); g.fill(); }
      g.font = font;
      outlined(g, t, c, c + 4, ink(color), "rgba(0,0,0,0.3)", 8);
      return tilt(cv, -8);
    }
    case "block": {
      // 굵은 입체 글자 — 그라데이션 + 두꺼운 테두리 + 아래로 겹친 그림자 글자
      const fs = 150, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const { cv, g } = mk(tw + 80, fs + 90);
      const cx = cv.width / 2, cy = cv.height / 2 - 4;
      g.font = font;
      g.lineWidth = 22; g.strokeStyle = "#111111"; g.fillStyle = "#111111";
      for (let d = 12; d > 0; d -= 2) { g.strokeText(t, cx, cy + d); g.fillText(t, cx, cy + d); }
      g.strokeText(t, cx, cy);
      const gr = g.createLinearGradient(0, cy - fs / 2, 0, cy + fs / 2);
      gr.addColorStop(0, shade(color, 1.45)); gr.addColorStop(0.55, color); gr.addColorStop(1, shade(color, 0.75));
      g.fillStyle = gr;
      g.fillText(t, cx, cy);
      return tilt(cv, -4);
    }
    case "badge":
    default: {
      const fs = 88, font = `${fs}px ${HEAD}`;
      const tw = measure(font, t);
      const isz = fs * 1.5;
      const w = Math.max(tw + 80, isz + 60), h = isz + fs + 70;
      const { cv, g } = mk(w + 12, h + 12);
      g.translate(6, 6);
      // 둥근 카드 + 위쪽 동그라미 아이콘
      g.beginPath(); g.roundRect(0, isz * 0.42, w, h - isz * 0.42, 30);
      g.fillStyle = color; g.fill();
      g.lineWidth = 6; g.strokeStyle = "#FFFFFF"; g.stroke();
      g.beginPath(); g.arc(w / 2, isz / 2 + 4, isz / 2, 0, Math.PI * 2);
      g.fillStyle = "#FFFFFF"; g.fill();
      g.lineWidth = 6; g.strokeStyle = color; g.stroke();
      g.font = `${isz * 0.66}px ${EMOJI}`;
      g.fillText(icon || "🏠", w / 2, isz / 2 + 8);
      g.font = font;
      g.fillStyle = ink(color);
      g.fillText(t, w / 2, isz + 4 + (h - isz - 4) / 2);
      return lift(cv);
    }
  }
}

/* 짠! — 모양마다 어울리는 등장·두근·효과음을 알아서 (사진 레이어 애니메이션 그대로 → 미리보기·완성 영상 같음) */
export function stickerAnim(st: StickerStyle): LayerAnim {
  const base = { out: "fade", dur: 0.45, sfxVol: 0.7 } as const;
  switch (st) {
    case "stamp": return { ...base, in: "zoom", emph: "shake", sfx: "impact-bass-1" }; // 쾅 찍히고 흔들
    case "tag": return { ...base, in: "pop", emph: "shake", sfx: "ping" }; // 가격표 달랑달랑
    case "pin": return { ...base, in: "fly", emph: "pulse", sfx: "pop" };
    case "neon": return { ...base, in: "pop", emph: "blink", sfx: "chime" }; // 네온 깜빡
    case "check": return { ...base, in: "pop", emph: "pulse", sfx: "ping" };
    case "ribbon": return { ...base, in: "zoom", emph: "pulse", sfx: "whoosh-short" };
    case "arrow": return { ...base, in: "fly", emph: "shake", sfx: "whoosh" }; // 쓱 와서 콕콕
    case "sign": return { ...base, in: "fly", emph: "shake", sfx: "click" }; // 매달린 간판 흔들
    case "cloud": return { ...base, in: "zoom", emph: "pulse", sfx: "pop" };
    case "ticket": return { ...base, in: "roll", emph: "pulse", sfx: "whoosh-short" };
    case "circle": return { ...base, in: "spin", emph: "pulse", sfx: "ping" };
    case "block": return { ...base, in: "pop", emph: "pulse", sfx: "impact-bass-1" }; // 쾅 짠!
    default: return { ...base, in: "pop", emph: "pulse", sfx: "sparkle" }; // 반짝 짠!
  }
}

/**
 * 넣어 둔 스티커의 모양 — 레이어에 적어 둔 것, 없으면(먼저 넣은 것) 이름 "스티커_글자" 로 목록에서 찾는다
 *  (2026-10-19 사장님: 스티커 글씨를 고칠 수 있게)
 */
export function stickerSpecOf(l: { stk?: { style: string; text: string; icon?: string; color?: string }; name?: string }): Sticker | null {
  if (l.stk && l.stk.style in BASE) return { ...l.stk, style: l.stk.style as StickerStyle };
  const k = String(l.name || "").replace(/^스티커_/, "").replace(/_\d+(\.\w+)?$/, "");
  if (!k) return null;
  return CATS.flatMap((c) => c.items).find((x) => x.text.replace(/[\\/:*?"<>|\s]+/g, "") === k) || null;
}
/** 스티커를 큰 그림(PNG)으로 — 글꼴 모양을 받은 뒤 */
export async function stickerPng(s: Sticker) {
  await stickerFonts();
  await stickerGlyphs([s.text]);
  return drawSticker(s).toDataURL("image/png");
}
/** 파일 이름에 쓸 글자 */
export const stickerFileName = (t: string) => `스티커_${t.replace(/[\\/:*?"<>|\s]+/g, "")}`;

/**
 * [글자 칸 › 텍스트 › 말풍선] — 화면 글자를 그 글자가 든 말풍선·가격표·리본… 스티커로 바꾸기 (회의 3-28 ④)
 *  글자는 바꾼 뒤에도 스티커 칸 [스티커 글자]에서 고칠 수 있다
 */
const BUBBLE_STYLES: StickerStyle[] = ["bubble", "cloud", "tag", "ribbon", "pin", "ticket", "sign", "check", "marker", "burst", "stamp", "neon", "circle", "block", "arrow", "badge"];
export function BubbleGrid({ text, onPick }: { text: string; onPick: (s: Sticker) => Promise<void> }) {
  const t = (text || "").replace(/\s*\n\s*/g, " ").trim().slice(0, 20) || "글자";
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  useEffect(() => {
    let live = true;
    stickerFonts().then(() => stickerGlyphs([t])).then(() => {
      const out: Record<string, string> = {};
      for (const st of BUBBLE_STYLES) {
        try { out[st] = small(drawSticker({ text: t, style: st }), 120); } catch {}
      }
      if (live) setThumbs(out);
    });
    return () => { live = false; };
  }, [t]);
  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5, marginBottom: 10 }}>누르면 이 글자가 그 모양 안에 들어간 스티커로 바뀌어요. 자리·범위·애니메이션·순서는 그대로, 글자는 스티커 칸에서 고칠 수 있어요.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {BUBBLE_STYLES.map((st) => (
          <button key={st} type="button" disabled={Boolean(busy)} title={STYLE_LABEL[st]}
            onClick={async () => { setBusy(st); try { await onPick({ text: t, style: st }); } finally { setBusy(""); } }}
            style={{ height: 84, padding: 6, borderRadius: 8, border: `2px solid ${busy === st ? C.accent : "transparent"}`, background: "repeating-conic-gradient(#2a2f3a 0% 25%, #222630 0% 50%) 50% / 16px 16px", cursor: busy ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            {thumbs[st] ? <img src={thumbs[st]} alt={STYLE_LABEL[st]} style={{ maxWidth: "100%", maxHeight: 58, objectFit: "contain" }} /> : <span style={{ color: C.sub, fontSize: 12 }}>…</span>}
            <span style={{ fontSize: 11.5, color: C.sub }}>{busy === st ? "바꾸는 중…" : STYLE_LABEL[st]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 칸 그림 (작게) — 한 번 그린 것은 기억 (칸을 다시 열면 바로) ── */
const thumbCache = new Map<string, string>();
const keyOf = (s: Sticker) => `${s.style}|${s.text}|${s.icon || ""}|${s.color || ""}`;
/** 큰 그림을 작게 줄여 PNG 로 — 큰 그림을 그대로 PNG 로 바꾸는 것이 가장 느리다 */
function small(cv: HTMLCanvasElement, h: number) {
  const k = Math.min(1, h / cv.height);
  const o = document.createElement("canvas");
  o.width = Math.max(1, Math.round(cv.width * k));
  o.height = Math.max(1, Math.round(cv.height * k));
  const g = o.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(cv, 0, 0, o.width, o.height);
  return o.toDataURL("image/png");
}
// 글꼴 받기는 앱을 켠 동안 한 번만
let fontsOnce: Promise<void> | null = null;
function stickerFonts() {
  if (!fontsOnce)
    fontsOnce = Promise.all(["Black Han Sans", "Jua"].map((f) => loadFont(f).catch(() => {})))
      .then(() => stickerGlyphs(CATS.flatMap((c) => c.items.map((x) => x.text))))
      .catch(() => {});
  return fontsOnce;
}

/** 칸 그림 하나 (이미지 편집의 스티커 칸) — 글꼴을 받은 뒤, 한 번 그린 것은 기억 */
export async function stickerThumb(x: Sticker) {
  await stickerFonts();
  const k = keyOf(x);
  if (!thumbCache.has(k)) thumbCache.set(k, small(drawSticker(x), 160));
  return thumbCache.get(k)!;
}

/** 편집 화면이 열리면 쉬는 틈에 글꼴·첫 분류 그림을 미리 (스티커 칸을 처음 열 때도 바로) */
export function warmStickers() {
  if (typeof document === "undefined") return;
  stickerFonts().then(() => {
    const todo = CATS[0].items.filter((x) => !thumbCache.has(keyOf(x)));
    const idle = (fn: () => void) => ((window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback || ((f: () => void) => setTimeout(f, 50)))(fn);
    const step = () => {
      const x = todo.shift();
      if (!x) return;
      try { thumbCache.set(keyOf(x), small(drawSticker(x), 160)); } catch {}
      idle(step);
    };
    idle(step);
  });
}

export function StickerPanel({ project, onInsert, onClose, replacing, onTemplates }: {
  /** [가리키기·반응·움직이는 템플릿] 열기 */
  onTemplates?: () => void;
  /** [스티커 바꾸기]로 열었을 때 — 새로 넣지 않고 그 스티커 모양만 바꾼다 */
  replacing?: boolean;
  project: Project;
  /** 투명 PNG 를 내 자료에 담은 뒤 → 사진 레이어로 붙이기 */
  onInsert: (item: LibItem, o: { anim: LayerAnim; w: number; spec: Sticker }) => void | Promise<void>;
  onClose: () => void;
}) {
  const b = videoBridge()!;
  const [cat, setCat] = useState(CATS[0].id);
  const [q, setQ] = useState(""); // 스티커 찾기 (모든 분류에서)
  const [pick, setPick] = useState<Sticker>(CATS[0].items[0]);
  const [text, setText] = useState(CATS[0].items[0].text);
  const [size, setSize] = useState(0.45);
  const [fontsReady, setFontsReady] = useState(false); // 글꼴을 받은 뒤에 그린다 (두 번 그리지 않게)
  const [textReady, setTextReady] = useState(0); // 고친 글자의 글꼴 모양을 받았을 때 (위 큰 그림만 다시)
  const [thumbs, setThumbs] = useState<Record<string, string>>(() => Object.fromEntries(thumbCache));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 스티커 글꼴 (검은고딕·주아) — 늦어도 1.5초 뒤엔 그리기 시작
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => live && setFontsReady(true), 1500);
    stickerFonts().then(() => live && setFontsReady(true));
    return () => { live = false; clearTimeout(t); };
  }, []);
  // 글자를 바꾸면 그 글자 모양도 받아 두기 (웹 글꼴은 글자 묶음별로 나눠 받는다)
  useEffect(() => {
    let live = true;
    stickerGlyphs([text]).then(() => live && setTextReady((x) => x + 1));
    return () => { live = false; };
  }, [text]);

  const items = useMemo(() => {
    const k = q.replace(/\s+/g, "");
    if (!k) return CATS.find((c) => c.id === cat)!.items;
    return CATS.flatMap((c) => c.items).filter((x) => x.text.replace(/\s+/g, "").includes(k) || STYLE_LABEL[x.style].includes(k));
  }, [cat, q]);
  // 칸 그림 — 칸은 바로 열고, 그림은 몇 개씩 차례로 채운다 (화면이 멈추지 않게)
  useEffect(() => {
    if (!fontsReady) return;
    const todo = items.filter((x) => !thumbCache.has(keyOf(x)));
    if (!todo.length) return;
    let live = true;
    let i = 0;
    const step = () => {
      if (!live) return;
      const t0 = performance.now();
      const add: Record<string, string> = {};
      while (i < todo.length && performance.now() - t0 < 24) {
        const x = todo[i++];
        try { const u = small(drawSticker(x), 160); thumbCache.set(keyOf(x), u); add[keyOf(x)] = u; } catch {}
      }
      setThumbs((v) => ({ ...v, ...add }));
      if (i < todo.length) setTimeout(step, 0);
    };
    const t = setTimeout(step, 0);
    return () => { live = false; clearTimeout(t); };
  }, [items, fontsReady]);

  const cur: Sticker = { ...pick, text: text || pick.text };
  const preview = useMemo(() => {
    if (!fontsReady) return "";
    try { return small(drawSticker(cur), 280); } catch { return ""; }
  }, [cur.text, cur.style, cur.icon, cur.color, fontsReady, textReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (s: Sticker) => {
    setPick(s);
    setText(s.text);
  };
  const insert = async (s: Sticker = cur) => {
    if (!b.lib.saveImage) return setErr("공실뉴스 스튜디오를 껐다 켜 주세요 (스티커 기능을 새로 연결해요)");
    setErr("");
    setBusy(true);
    try {
      const url = await stickerPng(s);
      const item = await b.lib.saveImage(project.dir, url, stickerFileName(s.text));
      await onInsert(item, { anim: stickerAnim(s.style), w: size, spec: { style: s.style, text: s.text, icon: s.icon, color: s.color } });
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const chip = (on: boolean): React.CSSProperties => ({ height: 30, padding: "0 11px", borderRadius: 15, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" });
  const head: React.CSSProperties = { fontSize: 13.5, fontWeight: 800, margin: "14px 0 7px" };
  const checker = "repeating-conic-gradient(#2a2f3a 0% 25%, #222630 0% 50%) 50% / 16px 16px";

  return (
    <Side title={replacing ? "스티커 바꾸기" : "스티커"} onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>반짝이·짠! 움직임·효과음까지 알아서 들어가요. 넣은 뒤 화면에서 끌어 옮기고 모서리로 크기를 바꿔요.</span>
          <Btn primary onClick={() => insert()} disabled={busy}>{busy ? (replacing ? "바꾸는 중…" : "넣는 중…") : replacing ? "이 스티커로 바꾸기" : "화면에 넣기"}</Btn>
        </div>
      }>
      <div style={{ padding: "4px 16px 20px" }}>
        {/* 고른 스티커 — 글자·색 바꾸기 */}
        <div style={{ marginTop: 10, height: 150, borderRadius: 10, background: checker, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line2}` }}>
          {preview && <img src={preview} alt="" style={{ maxWidth: "92%", maxHeight: 136, objectFit: "contain" }} />}
        </div>
        <div style={head}>글자 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>— 가격·역 이름 등 바꿔 쓰세요</span></div>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={20} onKeyDown={(e) => { if (e.key === "Enter") insert(); }}
          style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 15, fontFamily: FONT, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10 }}>
          <span style={{ fontSize: 13, color: C.sub, marginRight: 2 }}>크기</span>
          {([[0.3, "작게"], [0.45, "보통"], [0.65, "크게"]] as const).map(([v, l]) => <button key={v} type="button" onClick={() => setSize(v)} style={chip(size === v)}>{l}</button>)}
        </div>

        {onTemplates && !replacing && <Btn onClick={onTemplates} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>가리키기·반응·움직이는 템플릿 (화살표 20종·경로·카운트다운 …)</Btn>}
        {/* 스티커 고르기 */}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="스티커 찾기 (예: 역세권, 주차, 도장)"
          style={{ width: "100%", height: 36, marginTop: 18, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14, fontFamily: FONT, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 10px", opacity: q ? 0.45 : 1 }}>
          {CATS.map((c) => <button key={c.id} type="button" onClick={() => { setCat(c.id); setQ(""); }} style={chip(!q && cat === c.id)}>{c.label}</button>)}
        </div>
        {q && !items.length && <div style={{ fontSize: 13.5, color: C.dim, padding: "10px 0" }}>찾는 스티커가 없어요. 비슷한 스티커를 고르고 위 [글자]에 원하는 말을 쓰세요.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {items.map((s, i) => {
            const on = pick.text === s.text && pick.style === s.style;
            return (
              <button key={s.text + i} type="button" title={`${s.text} · ${STYLE_LABEL[s.style]} — 한 번 누르면 고르기, 두 번 누르면 바로 넣기`}
                onClick={() => choose(s)} onDoubleClick={() => { choose(s); insert(s); }}
                style={{ height: 92, padding: 6, borderRadius: 8, border: `2px solid ${on ? C.accent : "transparent"}`, background: checker, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {thumbs[keyOf(s)] ? <img src={thumbs[keyOf(s)]} alt={s.text} style={{ maxWidth: "100%", maxHeight: 76, objectFit: "contain" }} /> : <span style={{ color: C.text, fontSize: 13 }}>{s.text}</span>}
              </button>
            );
          })}
        </div>
        {err && <div style={{ marginTop: 12, fontSize: 14, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
      </div>
    </Side>
  );
}
