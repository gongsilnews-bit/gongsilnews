"use client";

// 영상 꾸미기 (대본 쓰고 편집 2단계) — 왼쪽 예시 화면 + 오른쪽 1~6 항목, 아래 샘플 (2026-10-22 사장님 회의)
//  1 자막 스타일 · 2 왼쪽 위 제목 · 3 오른쪽 위 채널명 (로고 그림도) · 4 화면전환 · 5 썸네일 · 6 엔딩
//  고른 것은 이 PC 에 기억해 다음 영상에도. 채널명은 내 중개사무소 이름이 기본 (지어내지 않음)
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { AnimIn, LayerAnim, Ratio, SubtitleSettings } from "./types";
import { AnimBody } from "./Anim";
import { C, FONT, input } from "./ui";
import { SUB_PRESETS, gradCss, subLookCss, type SubLook } from "./SubPresets";
import { fontCss } from "@/lib/studio-video/fonts";
import { loadFont } from "./Pickers";
import { TRANSITIONS, transStyle, type TransType } from "./transitions";
import { SFX_LIST, animAt, animCss } from "./timeline";
import { TransFx } from "./TransFx";
import { AD_LAW_LABELS, TEMPLATES, TPL_PREFIX, drawTemplate, tplFonts, tplTextOf } from "./Templates";
import { CAT_SIZES, LAYOUTS, layoutFonts, loadSampleBg, previewOf, type Layout } from "@/components/admin/studio-photo/layouts";

export type Agency = { name: string; ceo: string; regNum: string; phone: string; address: string };
/** two = 2단 제목 색 — 1단: 이 색 바탕 + 흰 글자 / 2단: 이 색 글자 (흰 테두리) */
export type TextStyle = { id: string; group?: string; label: string; two?: string; /** 로고 + 한 줄 (둥근 띠) — 왼쪽에 채널 로고 */ logoPill?: boolean; /** 강조 색 — 제목 뒷부분(또는 [ ] 안)을 이 색으로 · 네모 상자 (예능 방송처럼) */ hl?: string; /** 뉴스형 2단 — 위: 굵은 흰 글씨 · 아래: 흰 상자에 이 색 글씨 */ news?: string; /** 로고 + 2단 — 왼쪽에 제목 로고, 오른쪽에 2단 제목 */ logoTwo?: boolean; /** 자막뉴스 + 출처 (AI 가 쓰지 않음 — 1단 "자막뉴스", 2단 출처) */ subnews?: boolean; /** 뉴스 자막 바 — 아래쪽 흰 띠에 큰 제목 (왼쪽 네모 = 제목 로고 또는 NEWS) · 강조색 */ newsBar?: { side: string; hl: string; ink: string }; look: { color: string; box?: boolean; boxColor?: string; boxOpacity?: number; outline?: string; outlineWidth?: number } };
/* 제목 · 채널명 샘플 — 자막 스타일처럼 묶음별로, 여러 색 (2026-10-22 사장님) */
const PAL: [string, string, string][] = [ // id · 이름 · 색
  ["navy", "남색", "#1A3A6B"], ["red", "빨강", "#E11D48"], ["blue", "파랑", "#2563EB"], ["sky", "하늘", "#0EA5E9"], ["green", "초록", "#0E9F6E"], ["lime", "연두", "#65A30D"],
  ["orange", "주황", "#F97316"], ["yellow", "노랑", "#FFD400"], ["pink", "분홍", "#EC4899"], ["purple", "보라", "#7C3AED"], ["brown", "갈색", "#8B5E34"], ["gold", "금색", "#C9A86A"],
  ["teal", "청록", "#0F766E"], ["black", "검정", "#111111"], ["gray", "회색", "#4B5563"],
];
const dark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 150; };
export const TITLE_STYLES: TextStyle[] = [
  // 예전 고른 것 그대로 쓰이게 id 를 지킨다
  { id: "navy", group: "색 상자", label: "남색 상자", look: { color: "#FFFFFF", box: true, boxColor: "#1A3A6B", boxOpacity: 0.95 } },
  { id: "white", group: "흰 상자", label: "흰 상자·검정", look: { color: "#111111", box: true, boxColor: "#FFFFFF", boxOpacity: 0.95 } },
  { id: "yellow", group: "색 상자", label: "노랑 상자", look: { color: "#111111", box: true, boxColor: "#FFD400", boxOpacity: 1 } },
  { id: "red", group: "색 상자", label: "빨강 상자", look: { color: "#FFFFFF", box: true, boxColor: "#E11D48", boxOpacity: 1 } },
  { id: "outline", group: "글자·테두리", label: "흰 글자·검정 테", look: { color: "#FFFFFF", outline: "#000000", outlineWidth: 4 } },
  { id: "ytext", group: "글자·테두리", label: "노랑 글자·검정 테", look: { color: "#FFE14D", outline: "#000000", outlineWidth: 5 } },
  ...PAL.filter(([id]) => !["navy", "red", "yellow"].includes(id)).map(([id, nm, c]): TextStyle => ({ id: `box-${id}`, group: "색 상자", label: `${nm} 상자`, look: { color: dark(c) ? "#FFFFFF" : "#111111", box: true, boxColor: c, boxOpacity: 1 } })),
  ...PAL.filter(([id]) => !["yellow", "black", "gray"].includes(id)).map(([id, nm, c]): TextStyle => ({ id: `wbox-${id}`, group: "흰 상자", label: `흰 상자·${nm}`, look: { color: c, box: true, boxColor: "#FFFFFF", boxOpacity: 0.95 } })),
  ...PAL.filter(([id]) => !["yellow", "navy", "black", "gray", "brown", "teal"].includes(id)).map(([id, nm, c]): TextStyle => ({ id: `otext-${id}`, group: "글자·테두리", label: `${nm} 글자·흰 테`, look: { color: c, outline: "#FFFFFF", outlineWidth: 5 } })),
  ...PAL.filter(([id]) => ["sky", "lime", "orange", "pink", "gold"].includes(id)).map(([id, nm, c]): TextStyle => ({ id: `ktext-${id}`, group: "글자·테두리", label: `${nm} 글자·검정 테`, look: { color: c, outline: "#000000", outlineWidth: 5 } })),
  // 로고 + 한 줄 — 왼쪽에 로고, 둥근 띠에 제목 한 줄 (유튜브 방송처럼, 2026-10-22 사장님)
  ...([["forest", "숲 초록", "#1F3D2B"], ["black", "검정", "#111111"], ["navy", "남색", "#1A3A6B"], ["teal", "청록", "#0F766E"], ["brown", "갈색", "#5B3A21"], ["red", "빨강", "#B91C1C"], ["blue", "파랑", "#1D4ED8"], ["purple", "보라", "#5B21B6"]] as const)
    .map(([id, nm, c]): TextStyle => ({ id: `lp-${id}`, group: "로고 + 한 줄", label: `로고 + ${nm} 띠`, logoPill: true, look: { color: "#FFFFFF", box: true, boxColor: c, boxOpacity: 0.92 } })),
  { id: "lp-white", group: "로고 + 한 줄", label: "로고 + 흰 띠", logoPill: true, look: { color: "#111111", box: true, boxColor: "#FFFFFF", boxOpacity: 0.92 } },
  // 로고 + 흰 네모 · 뒷부분 강조색 (예능 방송처럼, 2026-10-22 사장님) — [ ] 로 감싸면 그 부분만 강조
  ...([["red", "빨강", "#C62828"], ["blue", "파랑", "#1D4ED8"], ["orange", "주황", "#EA580C"], ["green", "초록", "#15803D"], ["purple", "보라", "#7C3AED"], ["pink", "분홍", "#DB2777"]] as const)
    .map(([id, nm, c]): TextStyle => ({ id: `lh-${id}`, group: "로고 + 강조", label: `흰 네모 · ${nm} 강조`, logoPill: true, hl: c, look: { color: "#111111", box: true, boxColor: "#FFFFFF", boxOpacity: 1 } })),
  ...([["yellow", "노랑", "#FFD400"], ["sky", "하늘", "#38BDF8"]] as const)
    .map(([id, nm, c]): TextStyle => ({ id: `lk-${id}`, group: "로고 + 강조", label: `검정 네모 · ${nm} 강조`, logoPill: true, hl: c, look: { color: "#FFFFFF", box: true, boxColor: "#111111", boxOpacity: 0.92 } })),
  // 뉴스형 2단 — 위 1단 굵은 흰 글씨(그림자) · 아래 2단 흰 상자 진한 글씨 (자막뉴스처럼, 2026-10-22 사장님)
  ...([["navy", "남색", "#0B1F4D"], ["black", "검정", "#111111"], ["red", "빨강", "#B91C1C"], ["blue", "파랑", "#1D4ED8"]] as const)
    .map(([id, nm, c]): TextStyle => ({ id: `news-${id}`, group: "뉴스형 2단", label: `뉴스형 · ${nm} 글씨`, two: c, news: c, look: { color: "#FFFFFF" } })),
  // 로고 + 2단 — 왼쪽 제목 로고 · 오른쪽 2단 제목 (2026-10-22 사장님)
  ...([["navy", "남색", "#1A3A6B"], ["red", "빨강", "#E11D48"], ["blue", "파랑", "#2563EB"], ["green", "초록", "#0E9F6E"], ["orange", "주황", "#F97316"], ["purple", "보라", "#7C3AED"], ["black", "검정", "#111111"]] as const)
    .map(([id, nm, c]): TextStyle => ({ id: `l2-${id}`, group: "로고 + 2단", label: `로고 + 2단 ${nm}`, two: c, logoTwo: true, look: { color: "#FFFFFF", box: true, boxColor: c, boxOpacity: 1 } })),
  ...([["navy", "남색", "#0B1F4D"], ["red", "빨강", "#B91C1C"]] as const)
    .map(([id, nm, c]): TextStyle => ({ id: `l2n-${id}`, group: "로고 + 2단", label: `로고 + 뉴스형 ${nm}`, two: c, news: c, logoTwo: true, look: { color: "#FFFFFF" } })),
  // 자막뉴스 + 출처 — 위 "자막뉴스" 굵은 흰 글씨 · 아래 흰 상자 "출처 | …" (방송 자막뉴스처럼, 2026-10-22 사장님)
  { id: "subnews", group: "뉴스형 2단", label: "자막뉴스 + 출처", two: "#0B1F4D", news: "#0B1F4D", subnews: true, look: { color: "#FFFFFF" } },
  // 2단 — 위 1단은 색 바탕·흰 글씨, 아래 2단은 그 색 글씨
  ...PAL.filter(([id]) => !["yellow", "gray"].includes(id)).map(([id, nm, c]): TextStyle => ({ id: `two-${id}`, group: "2단", label: `2단 ${nm}`, two: c, look: { color: "#FFFFFF", box: true, boxColor: c, boxOpacity: 1 } })),
];
export const CHANNEL_STYLES: TextStyle[] = [
  { id: "plain", group: "글자", label: "흰 글자", look: { color: "#FFFFFF", outline: "#000000", outlineWidth: 3 } },
  { id: "black", group: "반투명 띠", label: "검정 띠", look: { color: "#FFFFFF", box: true, boxColor: "#000000", boxOpacity: 0.6 } },
  { id: "red", group: "색 띠", label: "빨강 띠", look: { color: "#FFFFFF", box: true, boxColor: "#E11D48", boxOpacity: 1 } },
  { id: "blue", group: "색 띠", label: "파랑 띠", look: { color: "#FFFFFF", box: true, boxColor: "#2563EB", boxOpacity: 1 } },
  { id: "yellow", group: "글자", label: "노랑 글자", look: { color: "#FFE14D", outline: "#000000", outlineWidth: 3 } },
  { id: "white-band", group: "반투명 띠", label: "흰 띠", look: { color: "#111111", box: true, boxColor: "#FFFFFF", boxOpacity: 0.75 } },
  { id: "navy-band", group: "반투명 띠", label: "남색 반투명 띠", look: { color: "#FFFFFF", box: true, boxColor: "#1A3A6B", boxOpacity: 0.7 } },
  ...PAL.filter(([id]) => !["red", "blue"].includes(id)).map(([id, nm, c]): TextStyle => ({ id: `band-${id}`, group: "색 띠", label: `${nm} 띠`, look: { color: dark(c) ? "#FFFFFF" : "#111111", box: true, boxColor: c, boxOpacity: 1 } })),
  ...PAL.filter(([id]) => !["yellow", "black", "gray", "navy", "brown", "teal"].includes(id)).map(([id, nm, c]): TextStyle => ({ id: `ctext-${id}`, group: "글자", label: `${nm} 글자`, look: { color: c, outline: dark(c) ? "#FFFFFF" : "#000000", outlineWidth: 3 } })),
];
/** 뉴스 자막 바 그림 — 1920 폭 기준. 왼쪽 네모: 로고 그림 또는 짧은 글(두 줄까지) */
export function newsBarCanvas(nb: { side: string; hl: string; ink: string }, text: string, side: { logo?: HTMLImageElement | null; label?: string }) { // NEWS 딱지는 위에 늘, 왼쪽 네모는 로고가 있을 때만
  const F = "'Pretendard', 'Malgun Gothic', sans-serif", h = 120, fs = 78, padX = 30;
  const m = document.createElement("canvas").getContext("2d")!;
  m.font = `900 ${fs}px ${F}`;
  const parts = hlSplit(text);
  const tw = m.measureText(parts.join("")).width + padX * 2;
  const sw = side.logo ? Math.round((side.logo.naturalWidth / side.logo.naturalHeight) * h) : 0;
  const tabH = 46, tabW = 150; // 위에 늘 붙는 NEWS 딱지
  const c = document.createElement("canvas");
  c.width = Math.ceil(sw + tw); c.height = h + tabH;
  const g = c.getContext("2d")!;
  g.fillStyle = nb.side; g.fillRect(sw, 0, tabW, tabH);
  g.font = `900 34px ${F}`; g.fillStyle = "#FFFFFF"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NEWS", sw + tabW / 2, tabH / 2 + 2); g.textAlign = "left";
  g.translate(0, tabH);
  if (sw) {
    g.fillStyle = nb.side; g.fillRect(0, 0, sw, h);
    if (side.logo) g.drawImage(side.logo, 0, 0, sw, h);
    else if (side.label) {
      const ls = /^[A-Za-z]+$/.test(side.label) ? [side.label] : side.label.replace(/\s+/g, "").length > 3 ? [side.label.slice(0, Math.ceil(side.label.length / 2)), side.label.slice(Math.ceil(side.label.length / 2))] : [side.label];
      const lf = Math.min(44, Math.floor((sw - 16) / Math.max(...ls.map((x) => x.length)) * 1.05));
      g.font = `900 ${lf}px ${F}`; g.fillStyle = "#FFFFFF"; g.textAlign = "center"; g.textBaseline = "middle";
      ls.forEach((t, i) => g.fillText(t.trim(), sw / 2, h / 2 + (i - (ls.length - 1) / 2) * lf * 1.08));
      g.textAlign = "left";
    }
  }
  g.fillStyle = "#FFFFFF"; g.fillRect(sw, 0, tw, h);
  g.font = `900 ${fs}px ${F}`; g.textBaseline = "middle";
  let x = sw + padX;
  parts.forEach((t, i) => { if (!t) return; g.fillStyle = i === 1 && parts[1] !== text ? nb.hl : nb.ink; g.fillText(t, x, h / 2 + 3); x += m.measureText(t).width; });
  return c;
}
/** 강조 나누기 — [ ] 가 있으면 그 안, 없으면 뒤쪽 절반 낱말 */
export function hlSplit(text: string): [string, string, string] {
  const m = /^(.*?)\[(.+?)\](.*)$/.exec(text);
  if (m) return [m[1], m[2], m[3]];
  const w = text.trim().split(/\s+/);
  if (w.length < 2) return ["", text, ""];
  const k = Math.floor(w.length / 2);
  return [w.slice(0, k).join(" ") + " ", w.slice(k).join(" "), ""];
}
/** 로고 + 한 줄 제목 그림 — 1920 폭 기준. logo = 읽어 둔 로고 그림 (없으면 띠만) */
export function logoPillCanvas(look: TextStyle["look"], text: string, logo: HTMLImageElement | null, hl?: string) {
  const F = "'Pretendard', 'Malgun Gothic', sans-serif", fs = 40, padX = 22, h = 62, lh = logo ? 96 : 0, gap = logo ? 10 : 0;
  const m = document.createElement("canvas").getContext("2d")!;
  m.font = `800 ${fs}px ${F}`;
  const parts = hl ? hlSplit(text) : ["", text, ""];
  const plain = parts.join("");
  const tw = m.measureText(plain).width + padX * 2;
  const lw = logo ? Math.round((logo.naturalWidth / logo.naturalHeight) * lh) : 0;
  const H = Math.max(h, lh), c = document.createElement("canvas");
  c.width = Math.ceil(lw + gap + tw + 4); c.height = Math.ceil(H + 4);
  const g = c.getContext("2d")!;
  if (logo) g.drawImage(logo, 0, (H - lh) / 2, lw, lh);
  const x = lw + gap, y = (H - h) / 2;
  const a = look.boxOpacity ?? 1;
  g.globalAlpha = a; g.fillStyle = look.boxColor || "#111"; g.beginPath(); g.roundRect(x, y, tw, h, hl ? 3 : h / 2); g.fill(); g.globalAlpha = 1;
  if (hl) { g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, tw - 2, h - 2); }
  g.font = `800 ${fs}px ${F}`; g.textBaseline = "middle";
  let tx = x + padX;
  parts.forEach((t, i) => { if (!t) return; g.fillStyle = hl && i === 1 ? hl : look.color; g.fillText(t, tx, y + h / 2 + 1); tx += m.measureText(t).width; });
  return c;
}
/** 뉴스형 2단 그림 — 위 굵은 흰 글씨(그림자) · 아래 흰 상자 진한 글씨 */
export function newsTitleCanvas(color: string, l1: string, l2: string) {
  const F = "'Pretendard', 'Malgun Gothic', sans-serif", f1 = 56, f2 = 32, padX = 14, h2 = 54, gap = 14;
  const m = document.createElement("canvas").getContext("2d")!;
  m.font = `900 ${f1}px ${F}`; const w1 = l1 ? m.measureText(l1).width + 10 : 0;
  m.font = `800 ${f2}px ${F}`; const w2 = l2 ? m.measureText(l2).width + padX * 2 : 0;
  const h1 = l1 ? f1 * 1.25 : 0;
  const c = document.createElement("canvas");
  c.width = Math.ceil(Math.max(w1, w2) + 12); c.height = Math.ceil(h1 + (l1 && l2 ? gap : 0) + (l2 ? h2 : 0) + 8);
  const g = c.getContext("2d")!;
  g.textBaseline = "middle";
  if (l1) {
    g.font = `900 ${f1}px ${F}`;
    g.shadowColor = "rgba(0,0,0,0.75)"; g.shadowBlur = 8; g.shadowOffsetX = 2; g.shadowOffsetY = 3;
    g.fillStyle = "#FFFFFF"; g.fillText(l1, 4, h1 / 2);
    g.shadowColor = "transparent";
  }
  if (l2) {
    const y = h1 + (l1 ? gap : 0);
    g.fillStyle = "#FFFFFF"; g.fillRect(4, y, w2, h2);
    g.font = `800 ${f2}px ${F}`; g.fillStyle = color; g.fillText(l2, 4 + padX, y + h2 / 2 + 1);
  }
  return c;
}
/** 2단 제목 그림 — 1920 폭 화면 기준 (영상에는 그림 레이어로, 두 줄 왼쪽 끝이 맞게) */
export function twoTitleCanvas(color: string, l1: string, l2: string, scale = 1, news = false) {
  if (news) return newsTitleCanvas(color, l1, l2);
  const F = "'Pretendard', 'Malgun Gothic', sans-serif";
  const f1 = Math.round(44 * scale), f2 = Math.round(62 * scale), padX = Math.round(f1 * 0.45), padY = Math.round(f1 * 0.22), gap = Math.round(f1 * 0.25);
  const m = document.createElement("canvas").getContext("2d")!;
  m.font = `800 ${f1}px ${F}`;
  const w1 = l1 ? m.measureText(l1).width + padX * 2 : 0;
  m.font = `900 ${f2}px ${F}`;
  const w2 = l2 ? m.measureText(l2).width + f2 * 0.12 : 0;
  const h1 = l1 ? f1 + padY * 2 : 0, h2 = l2 ? f2 * 1.2 : 0;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(Math.max(w1, w2) + 8)); c.height = Math.max(1, Math.ceil(h1 + (l1 && l2 ? gap : 0) + h2 + 6));
  const g = c.getContext("2d")!;
  g.textBaseline = "middle";
  if (l1) {
    g.fillStyle = color; g.beginPath(); g.roundRect(0, 0, w1, h1, 4 * scale); g.fill();
    g.font = `800 ${f1}px ${F}`; g.fillStyle = "#FFFFFF"; g.fillText(l1, padX, h1 / 2);
  }
  if (l2) {
    const y = h1 + (l1 ? gap : 0) + h2 / 2;
    g.font = `900 ${f2}px ${F}`;
    g.lineJoin = "round"; g.strokeStyle = "#FFFFFF"; g.lineWidth = f2 * 0.16; g.strokeText(l2, f2 * 0.06, y);
    g.fillStyle = color; g.fillText(l2, f2 * 0.06, y);
  }
  return c;
}
export type Deco = { sub: string; title: string; titleText: string; /** 2단 제목 (아래 줄) */ title2?: string; channel: string; channelText: string; /** 채널 로고 — 오른쪽 위 채널명 옆 (JPG·PNG, 작게 줄인 data URL) */ logo?: string; /** 제목 로고 — 왼쪽 위 "로고 + 한 줄" 제목 앞 (채널 로고와 따로) */ titleLogo?: string; /** 화면전환 — 여러 개 고르면 클립마다 차례로 (빈 목록 = 없음) */ trans: TransType[]; thumb: string; end: string; /** 화면 전체 PNG (1920×1080, 투명 배경) — 있으면 이것만 쓴다: 제목 칸 · 채널명 칸 (2026-10-22 사장님) */ titleOv?: string; chOv?: string; /** 화면전환 소리 — auto = 전환마다 어울리는 소리 · none = 없음 · 그 밖 = 효과음 이름 (2026-10-22 사장님) */ transSfx?: string; /** 미리보기에서 끌어 옮긴 자리 — 제목·채널명·자막 (2026-10-23) */ drag?: Partial<Record<"title" | "ch" | "sub", DragOff>>; /** 크기 (%) — 제목·채널명·자막, 100 = 기본. 화면 비율마다 따로 */ size?: { title?: number; ch?: number; sub?: number }; sizeR?: Record<string, { title?: number; ch?: number; sub?: number }>; dragR?: Record<string, Partial<Record<"title" | "ch" | "sub", DragOff>>>; /** 애니메이션 — 편집 화면과 같은 값 (인·아웃·반복·효과음·단어별) */ animFull?: { sub?: LayerAnim; title?: LayerAnim; ch?: LayerAnim }; /** (예전) 나타나기 애니메이션 — 자막(줄마다)·제목·채널명. "" = 없음 · word = 자막 단어별(쇼츠식) */ anim?: { sub?: AnimIn | ""; subWord?: boolean; title?: AnimIn | ""; ch?: AnimIn | ""; /** 나타날 때 효과음 — "" 없음 · auto 효과에 맞게 · 그 밖 = 소리 이름 */ sfx?: { sub?: string; title?: string; ch?: string } }; /** 전환 넣는 곳 — auto 클립마다 · none 없음 · scene 씬 바뀌는 곳만 · scene_auto 씬은 고른 전환 + 씬 안은 짧은 디졸브 (2026-10-23) */ transMode?: TransMode };
export type DragOff = { dx: number; dy: number; cx: number; cy: number };
export type TransMode = "auto" | "none" | "scene" | "scene_auto";
export const TRANS_MODES: { id: TransMode; label: string; desc: string }[] = [
  { id: "auto", label: "자동", desc: "클립이 바뀔 때마다 고른 전환" },
  { id: "none", label: "없음", desc: "전환 없이 바로" },
  { id: "scene", label: "씬 전환만", desc: "씬이 바뀌는 곳에만 고른 전환" },
  { id: "scene_auto", label: "씬 전환+자동", desc: "씬이 바뀌는 곳은 고른 전환, 씬 안은 짧은 디졸브" },
];
const KEY = "gsv-wizard-deco";
/** 썸네일 두 줄 — 말줄임(…)을 빼고 낱말 가운데에서 나눈다 (한 줄이 12자 안팎이 되게) */
export function thumbLines(text: string): [string, string] {
  const t = text.replace(/[…]+$/g, "").replace(/\s+/g, " ").trim();
  const w = t.split(" ");
  if (w.length < 2) return t.length >= 6 ? [t.slice(0, Math.ceil(t.length / 2)), t.slice(Math.ceil(t.length / 2))] : [t, ""]; // 띄어쓰기 없으면 글자 반으로
  let best = 1, diff = Infinity;
  for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(" ").length, b = w.slice(i).join(" ").length; if (Math.abs(a - b) < diff) { diff = Math.abs(a - b); best = i; } }
  return [w.slice(0, best).join(" "), w.slice(best).join(" ")];
}
export const loadDeco = (): Deco => {
  const d: Deco = { sub: "", title: "navy", titleText: "", channel: "black", channelText: "", trans: ["fade"], thumb: "yt_split", end: AD_LAW_LABELS[0] || "none" };
  try {
    const o = { ...d, ...JSON.parse(localStorage.getItem(KEY) || "{}"), titleText: "" };
    if (!Array.isArray(o.trans)) o.trans = o.trans && o.trans !== "none" ? [o.trans] : []; // 예전(하나만) 기억
    o.trans = o.trans.slice(0, 5);
    return o;
  } catch { return d; }
};
export const saveDeco = (d: Deco) => { try { localStorage.setItem(KEY, JSON.stringify({ ...d, titleText: "", title2: "", titleOv: undefined, chOv: undefined })); /* 화면 전체 PNG 는 커서 저장하지 않는다 */ } catch {} };
/** 뉴스 자막 바 (자막 스타일) — 문장마다 흰 띠에 진한 글씨, 왼쪽 정렬 · 위에 NEWS 딱지 (2026-10-22 사장님) */
export const NEWS_SUBS: { id: string; label: string; tag: string; look: SubLook }[] = ([["blue", "파랑", "#1D4ED8", "#0B1F4D"], ["red", "빨강", "#C62828", "#111111"], ["navy", "남색", "#0B1F4D", "#0B1F4D"], ["green", "초록", "#0F766E", "#111111"], ["black", "검정", "#111111", "#111111"]] as const)
  .map(([id, nm, tag, ink]) => ({ id: `nbs-${id}`, label: `뉴스 바 · ${nm}`, tag, look: { font: "Pretendard", color: ink, outline: "#000000", outlineWidth: 0, bg: true, bgColor: "#FFFFFF", bgOpacity: 1, bold: true, tag: "NEWS", tagColor: tag } as SubLook }));
export const newsSubOf = (id: string) => NEWS_SUBS.find((x) => x.id === id) || null;
export const subLookOf = (id: string): SubLook | null => SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === id)?.look || newsSubOf(id)?.look || null;
/** NEWS 딱지 그림 */
export function newsTagCanvas(color: string) {
  const c = document.createElement("canvas"); c.width = 150; c.height = 46;
  const g = c.getContext("2d")!;
  g.fillStyle = color; g.fillRect(0, 0, 150, 46);
  g.font = "900 34px 'Pretendard', 'Malgun Gothic', sans-serif"; g.fillStyle = "#FFFFFF"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NEWS", 75, 25);
  return c;
}
export const endFieldsOf = (a: Agency | null) => (a ? [a.name, a.ceo, a.regNum, a.address, a.phone, ""] : []);
export const endDefOf = (label: string) => TEMPLATES.find((x) => x.cat === "부동산 표시광고" && x.label === label) || null;

const TABS: { id: keyof Pick<Deco, "sub" | "title" | "channel" | "trans" | "thumb" | "end">; n: number; name: string }[] = [
  { id: "sub", n: 1, name: "자막 스타일" }, { id: "title", n: 2, name: "왼쪽 위 제목" }, { id: "channel", n: 3, name: "오른쪽 위 채널명" },
  { id: "trans", n: 4, name: "화면전환" }, { id: "thumb", n: 5, name: "썸네일" }, { id: "end", n: 6, name: "엔딩" },
];

export function WizardDeco({ fill = "cover", bgs = [], ratio, firstLine, subOn, setSubOn, subPos, subLines, deco, setDeco, agency, onAiTitle, aiTitleBusy }: {
  /** 채우기 — 원본 비율(contain) · 꽉 채우기(cover) · 흐린 배경(blur) */ fill?: "cover" | "contain" | "blur";
  /** 고른 화면(첨부·공실 사진)의 그림 주소 — 있으면 예시 화면 대신 */ bgs?: string[];
  ratio: Ratio; firstLine: string; subOn: boolean; /** 자막 켜고 끄기 (샘플 [자막 없음]) */ setSubOn?: (v: boolean) => void; subPos: SubtitleSettings["position"]; subLines: number;
  deco: Deco; setDeco: (d: Deco) => void; agency: Agency | null; onAiTitle: () => void; aiTitleBusy: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("sub");
  const [pop, setPop] = useState(false); // 항목 샘플 팝업
  const [zoom, setZoom] = useState(false);
  const [sub2, setSub2] = useState<"style" | "anim" | "sfx">("style"); // 팝업 안 탭
  const [picked, setPicked] = useState<"" | "title" | "ch" | "sub">(""); // 바깥 미리보기에서 고른 묶음 (크기 바꾸기)
  // 애니메이션 미리 보기 — 고르면 그 묶음이 한 번 움직인다
  const [demo, setDemo] = useState<{ k: "title" | "ch" | "sub"; at: number; part: "in" | "out" | "all" } | null>(null);
  const [, setNowT] = useState(0);
  useEffect(() => {
    if (!demo) return;
    let raf = 0;
    const step = () => { setNowT(performance.now()); if (performance.now() - demo.at < (demo.part === "all" ? 3300 : 1500)) raf = requestAnimationFrame(step); else setDemo(null); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [demo]);
  // 고른 묶음 둘레 (미리보기마다 — 작은 미리보기 · 크게 보기) — 모서리 손잡이 자리
  const [hb, setHb] = useState<Record<string, { l: number; t: number; w: number; h: number }>>({});
  useLayoutEffect(() => {
    const out: Record<string, { l: number; t: number; w: number; h: number }> = {};
    if (picked) document.querySelectorAll<HTMLElement>("[data-gsframe]").forEach((fr) => {
      const g = fr.querySelector<HTMLElement>(`[data-grp="${picked}"]`);
      if (!g) return;
      const rs = [...g.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
      if (!rs.length) return;
      const b = fr.getBoundingClientRect();
      const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
      out[fr.dataset.gsframe!] = { l: l - b.left, t: t - b.top, w: Math.max(...rs.map((r) => r.right)) - l, h: Math.max(...rs.map((r) => r.bottom)) - t };
    });
    if (JSON.stringify(out) !== JSON.stringify(hb)) setHb(out);
  });
  const startResize = (e: React.PointerEvent, key: string) => {
    if (!picked) return;
    e.preventDefault(); e.stopPropagation();
    const r = hb[key];
    if (!r) return;
    const k = picked, s0 = sizeOf(k), sx = e.clientX, sy = e.clientY, diag = Math.max(20, r.w + r.h);
    const move = (ev: PointerEvent) => setSize(k, s0 * (1 + (ev.clientX - sx + ev.clientY - sy) / diag));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const play = (k: "title" | "ch" | "sub", part: "in" | "out" | "all" = "in") => setDemo({ k, part, at: performance.now() + 150 }); // all = 반복·단어·줄 — 3초 동안
  const sizeOf = (k: "title" | "ch" | "sub") => szR[k] || 100;
  const setSize = (k: "title" | "ch" | "sub", v: number) => set({ sizeR: { ...(deco.sizeR || {}), [ratio]: { ...szR, [k]: Math.max(50, Math.min(200, Math.round(v / 5) * 5)) } } }); // 미리보기 크게 (돋보기) — 크게 보며 자막·제목 자리 옮기기
  const [tick, setTick] = useState(0);
  const [logoErr, setLogoErr] = useState("");
  const [transMsg, setTransMsg] = useState("");
  const [transShow, setTransShow] = useState(""); // 예시 화면에 보일 전환 — 방금 누른 칸·전환 (2026-10-22 사장님)
  const [transSlot, setTransSlot] = useState(-1);
  const [transDrag, setTransDrag] = useState(-1); // 끌고 있는 칸 // 화면전환 — 바꿀 칸 (1~5, -1 = 빈 칸부터)
  const [ovErr, setOvErr] = useState("");
  const set = (p: Partial<Deco>) => { const n = { ...deco, ...p }; setDeco(n); saveDeco(n); };
  // 끌어 놓은 자리·크기 — 화면 비율마다 따로 (2026-10-23 사장님)
  const dg = (deco.dragR || {})[ratio] || {};
  const setDg = (v: Partial<Record<"title" | "ch" | "sub", DragOff>>) => set({ dragR: { ...(deco.dragR || {}), [ratio]: v } });
  const szR = (deco.sizeR || {})[ratio] || {};
  const [rw, rh] = ratio.split(":").map(Number);
  // 썸네일 · 엔딩 샘플 그림
  const ytSize = CAT_SIZES.youtube[0];
  const thumbLayouts = useMemo(() => LAYOUTS.filter((l) => l.cats.includes("youtube") && l.aspect.includes("wide") && !l.sizes), []);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [ends, setEnds] = useState<Record<string, string>>({});
  const titleText = deco.titleText || "영상 제목";
  const chText = deco.channelText || agency?.name || "";
  useEffect(() => {
    let live = true;
    (async () => {
      await Promise.all([...new Set(thumbLayouts.flatMap(layoutFonts))].map((f) => loadFont(f).catch(() => {})));
      // 썸네일 미리보기도 — 고른 화면이 있으면 그 그림 (읽지 못하면 예시 사진)
      // 고른 화면이 없으면 썸네일 예시는 건물 사진 (2026-10-22 사장님)
      const mine = await new Promise<HTMLCanvasElement | null>((res) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => { try { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d")!.drawImage(im, 0, 0); c.toDataURL(); res(c); } catch { res(null); } };
        im.onerror = () => res(null);
        im.src = bgs[0] || "/studio-samples/building.webp";
      });
      const bg = mine || (await loadSampleBg());
      const out: Record<string, string> = {};
      for (const l of thumbLayouts) {
        if (!live) return;
        await new Promise((r) => setTimeout(r, 0));
        // 썸네일은 글이 커야 — 제목을 낱말 반으로 나눠 큰 두 줄(제목 · 부제)로 (2026-10-22 사장님)
        const [t1, t2] = thumbLines(titleText);
        try { out[l.id] = previewOf(l, ytSize, { title: t1, sub: t2, badge: "", agency: chText, label: "공실뉴스" }, bg, 360); } catch {}
        setThumbs({ ...out });
      }
    })();
    return () => { live = false; };
  }, [titleText, chText, bgs[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let live = true;
    (async () => {
      if (!agency) return;
      await tplFonts();
      const out: Record<string, string> = {};
      for (const lb of AD_LAW_LABELS) {
        const d = endDefOf(lb);
        if (!d || !live) continue;
        try { out[lb] = drawTemplate(TPL_PREFIX + d.id, tplTextOf(endFieldsOf(agency)), d.color).toDataURL("image/png"); } catch {}
      }
      if (live) setEnds(out);
    })();
    return () => { live = false; };
  }, [agency]);
  // 화면전환 미리보기 — 2초마다 넘기기
  useEffect(() => { if (tab !== "trans") return; const t = setInterval(() => setTick((x) => x + 1), 1800); return () => clearInterval(t); }, [tab]);

  // 고른 화면이 있으면 그것, 없으면 예시 사진 (2026-10-22 사장님)
  const bgA = bgs[0] || "/studio-samples/living.webp";
  const bgB = bgs[1] || (bgs[0] ? bgs[0] : "/studio-samples/building.webp");
  const subLook = subLookOf(deco.sub);
  const tStyle = TITLE_STYLES.find((x) => x.id === deco.title);
  const cStyle = CHANNEL_STYLES.find((x) => x.id === deco.channel);
  const textCss = (s: TextStyle["look"], fs: number): React.CSSProperties => ({
    fontFamily: fontCss("Pretendard"), fontWeight: 800, fontSize: fs, lineHeight: 1.25, color: s.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "48%",
    ...(s.box ? { background: `${s.boxColor}${Math.round((s.boxOpacity ?? 1) * 255).toString(16).padStart(2, "0")}`, padding: `${fs * 0.15}px ${fs * 0.4}px`, borderRadius: 3 } : {}),
    ...(s.outlineWidth ? { WebkitTextStroke: `${Math.max(1, s.outlineWidth * fs / 40)}px ${s.outline}`, paintOrder: "stroke fill" } : {}),
  });
  /** 예시 화면 한 장 — 자막 · 제목 · 채널명 */
  /** 끌어 옮기기 — 묶음(제목·채널명·자막) 하나를 통째로 */
  const startDrag = (k: "title" | "ch" | "sub", e: React.PointerEvent<HTMLDivElement>) => {
    const wrap = e.currentTarget, box = wrap.parentElement?.getBoundingClientRect();
    if (!box || e.button !== 0) return;
    e.preventDefault();
    const rs = [...wrap.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
    if (!rs.length) return;
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), r0 = Math.max(...rs.map((r) => r.right)), b0 = Math.max(...rs.map((r) => r.bottom));
    const cur = dg[k] || { dx: 0, dy: 0, cx: 0, cy: 0 };
    const cx = ((l + r0) / 2 - box.left) / box.width - cur.dx, cy = ((t + b0) / 2 - box.top) / box.height - cur.dy; // 옮기기 전 가운데
    const sx = e.clientX, sy = e.clientY;
    const move = (ev: PointerEvent) => {
      const dx = +(cur.dx + (ev.clientX - sx) / box.width).toFixed(4), dy = +(cur.dy + (ev.clientY - sy) / box.height).toFixed(4);
      setDg({ ...dg, [k]: { dx, dy, cx: +cx.toFixed(4), cy: +cy.toFixed(4) } });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const demoLook = (k: "title" | "ch" | "sub", W: number, H: number) => {
    if (!demo || demo.k !== k) return null;
    const af = deco.animFull?.[k] || {};
    const id = String(af.in || (deco.anim || {})[k] || (demo.part === "in" ? "fade" : ""));
    const dur = Number(af.dur) || 0.5;
    const t = Math.max(0, (performance.now() - demo.at) / 1000);
    // 인: 나타나기 · 아웃: 머물다 사라지기 · 반복(강조·확대): 3초 동안 (나타난 뒤 계속)
    const an = demo.part === "out" ? { out: String(af.out || "fade"), dur } : demo.part === "all" ? { in: id || undefined, emph: af.emph, grow: af.grow, dur } : { in: id, dur };
    return animCss(animAt(an, t, 0, demo.part === "out" ? 1.3 : demo.part === "all" ? 6 : 3), W, H) || null;
  };
  const demoWords = (text: string, on: boolean): React.ReactNode => {
    const af = deco.animFull?.sub;
    if (!on || !demo || demo.k !== "sub" || demo.part !== "all" || af?.wshow !== "word") return text;
    const ws = String(text).split(/s+/).filter(Boolean);
    const t = Math.max(0, (performance.now() - demo.at) / 1000);
    const n = Math.min(ws.length, Math.floor(t / Math.max(0.25, 3 / Math.max(1, ws.length))) + 1);
    return ws.slice(0, n).map((w, i) => <span key={i} style={i === n - 1 && af.whl !== undefined ? { color: af.wcolor || "#FFE14D" } : undefined}>{w}{i < n - 1 ? " " : ""}</span>);
  };
  const demoT = (k: "title" | "ch" | "sub", W: number, H: number) => { const c = demoLook(k, W, H); return c && typeof c.transform === "string" ? " " + c.transform : ""; };
  const demoO = (k: "title" | "ch" | "sub") => { const c = demoLook(k, 100, 100); return c && c.opacity !== undefined ? Number(c.opacity) : undefined; };
  const frame = (W: number, H: number, o: { drag?: boolean; forceSub?: boolean; ov?: (string | undefined)[]; news?: string; sub?: SubLook | null; title?: TextStyle | null; ch?: TextStyle | null; text?: string; bg?: string }) => {
    const l = { font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bgOpacity: 0.62, ...(o.sub || {}) } as SubLook & { bgOpacity: number };
    const fs = Math.max(8, Math.round(Math.min(W, H) * (ratio === "9:16" ? 0.075 : 0.065)));
    const pos = subPos === "top" ? { top: H * 0.2 } : subPos === "middle-high" ? { top: H * 0.3 } : subPos === "middle" ? { top: "50%", transform: "translateY(-50%)" } : subPos === "middle-low" ? { bottom: H * 0.26 } : { bottom: H * 0.08 };
    const tfs = Math.max(7, Math.round(Math.min(W, H) * 0.055));
    return (
      <div data-gsframe={o.drag ? String(W) : undefined} onPointerDown={o.drag ? (e) => { if (!(e.target as HTMLElement).closest("[data-grp] > *, [data-gshandle]")) setPicked(""); } : undefined}
        style={{ position: "relative", width: W, height: H, borderRadius: 6, overflow: "hidden", background: `#000 url("${o.bg || bgA}") center / ${fill === "cover" ? "cover" : "contain"} no-repeat`, flexShrink: 0 }}>
        {fill === "blur" && <><div style={{ position: "absolute", inset: -12, background: `url("${o.bg || bgA}") center / cover`, filter: "blur(10px) brightness(0.8)" }} /><div style={{ position: "absolute", inset: 0, background: `url("${o.bg || bgA}") center / contain no-repeat` }} /></>}
        {o.drag && <style>{".gsdrag > * { pointer-events: auto; cursor: move; } .gsdrag:hover > * { outline: 1px dashed rgba(255,255,255,0.85); outline-offset: 2px; } .gspick > * { outline: 2px solid #3b82f6; outline-offset: 2px; }"}</style>}
        <div data-grp="title" className={o.drag ? "gsdrag" + (picked === "title" ? " gspick" : "") : undefined} onPointerDown={o.drag ? (e) => { setPicked("title"); startDrag("title", e); } : undefined} onWheel={o.drag ? (e) => { setPicked("title"); setSize("title", sizeOf("title") + (e.deltaY < 0 ? 5 : -5)); } : undefined} title={o.drag ? "끌어서 옮기기 · 휠로 크기" : undefined}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", transform: `${o.drag && dg.title ? `translate(${dg.title.dx * W}px, ${dg.title.dy * H}px) ` : ""}scale(${(szR.title || 100) / 100})${demoT("title", W, H)}`, opacity: demoO("title"), transformOrigin: "3% 5%" }}>
        {o.title && !o.title.two && !o.title.logoPill && !o.title.newsBar && <div style={{ position: "absolute", left: W * 0.03, top: H * 0.04, ...textCss(o.title.look, tfs) }}>{titleText}</div>}
        {o.title?.logoPill && (
          <div style={{ position: "absolute", left: W * 0.02, top: H * 0.03, display: "flex", alignItems: "center", gap: tfs * 0.25, maxWidth: "80%" }}>
            {deco.titleLogo && <img src={deco.titleLogo} alt="" style={{ height: tfs * 2, objectFit: "contain", flexShrink: 0 }} />}
            <span style={{ ...textCss(o.title.look, tfs * 0.8), maxWidth: "100%", borderRadius: o.title.hl ? 2 : 999, padding: `${tfs * 0.18}px ${tfs * 0.55}px` }}>
              {o.title.hl ? (() => { const [a, h, z] = hlSplit(titleText); return <>{a}<span style={{ color: o.title.hl }}>{h}</span>{z}</>; })() : titleText}
            </span>
          </div>
        )}
        {o.title?.news && (
          <div style={{ position: "absolute", left: W * 0.04 + (o.title.logoTwo && deco.titleLogo ? tfs * 3 : 0), top: H * 0.05, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: tfs * 0.2, maxWidth: "60%" }}>
            <span style={{ fontFamily: fontCss("Pretendard"), fontWeight: 900, fontSize: tfs * 1.05, color: "#FFFFFF", textShadow: "0 2px 6px rgba(0,0,0,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{deco.titleText || "1단 제목"}</span>
            <span style={{ fontFamily: fontCss("Pretendard"), fontWeight: 800, fontSize: tfs * 0.62, color: o.title.news, background: "#FFFFFF", padding: `${tfs * 0.12}px ${tfs * 0.3}px`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{deco.title2 || "2단 제목"}</span>
          </div>
        )}
        {o.title?.newsBar && (() => {
          const nb = o.title.newsBar, [a1, h1, z1] = hlSplit(titleText);
          return (
            <div style={{ position: "absolute", left: W * 0.04, bottom: H * 0.1, display: "flex", height: tfs * 1.9, maxWidth: "88%", boxShadow: "0 2px 6px rgba(0,0,0,0.35)" }}>
              {deco.titleLogo && <div style={{ background: nb.side, display: "flex", alignItems: "center" }}><img src={deco.titleLogo} alt="" style={{ height: "100%", objectFit: "contain" }} /></div>}
              <span style={{ position: "absolute", left: deco.titleLogo ? tfs * 1.9 : 0, top: -tfs * 0.72, height: tfs * 0.72, padding: `0 ${tfs * 0.35}px`, background: nb.side, color: "#fff", fontWeight: 900, fontSize: tfs * 0.5, display: "flex", alignItems: "center", fontFamily: fontCss("Pretendard") }}>NEWS</span>
              <div style={{ background: "#fff", display: "flex", alignItems: "center", padding: `0 ${tfs * 0.4}px`, fontFamily: fontCss("Pretendard"), fontWeight: 900, fontSize: tfs * 1.15, color: nb.ink, whiteSpace: "nowrap", overflow: "hidden" }}>
                {a1}<span style={{ color: nb.hl }}>{h1}</span>{z1}
              </div>
            </div>
          );
        })()}
        {o.title?.logoTwo && deco.titleLogo && <img src={deco.titleLogo} alt="" style={{ position: "absolute", left: W * 0.02, top: H * 0.035, height: tfs * 2.6, maxWidth: tfs * 5, objectFit: "contain" }} />}
        {o.title?.two && !o.title.news && (
          <div style={{ position: "absolute", left: W * 0.03 + (o.title.logoTwo && deco.titleLogo ? tfs * 3 : 0), top: H * 0.04, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: tfs * 0.2, maxWidth: "60%" }}>
            <span style={{ ...textCss(o.title.look, tfs * 0.8), maxWidth: "100%" }}>{deco.titleText || "1단 제목"}</span>
            <span style={{ fontFamily: fontCss("Pretendard"), fontWeight: 900, fontSize: tfs * 1.15, lineHeight: 1.15, color: o.title.two, WebkitTextStroke: `${Math.max(1, tfs * 0.1)}px #FFFFFF`, paintOrder: "stroke fill", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{deco.title2 || "2단 제목"}</span>
          </div>
        )}
        </div>
        <div data-grp="ch" className={o.drag ? "gsdrag" + (picked === "ch" ? " gspick" : "") : undefined} onPointerDown={o.drag ? (e) => { setPicked("ch"); startDrag("ch", e); } : undefined} onWheel={o.drag ? (e) => { setPicked("ch"); setSize("ch", sizeOf("ch") + (e.deltaY < 0 ? 5 : -5)); } : undefined} title={o.drag ? "끌어서 옮기기 · 휠로 크기" : undefined}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", transform: `${o.drag && dg.ch ? `translate(${dg.ch.dx * W}px, ${dg.ch.dy * H}px) ` : ""}scale(${(szR.ch || 100) / 100})${demoT("ch", W, H)}`, opacity: demoO("ch"), transformOrigin: "97% 5%" }}>
        {o.ch && (chText || deco.logo) && (
          <div style={{ position: "absolute", right: W * 0.03, top: H * 0.04, display: "flex", alignItems: "center", gap: tfs * 0.3, maxWidth: "48%" }}>
            {chText && <span style={{ ...textCss(o.ch.look, tfs * 0.8), maxWidth: "100%" }}>{chText}</span>}
            {deco.logo && <img src={deco.logo} alt="" style={{ height: tfs * 1.5, maxWidth: tfs * 4, objectFit: "contain", borderRadius: 3 }} />}
          </div>
        )}
        </div>
        <div data-grp="sub" className={o.drag ? "gsdrag" + (picked === "sub" ? " gspick" : "") : undefined} onPointerDown={o.drag ? (e) => { setPicked("sub"); startDrag("sub", e); } : undefined} onWheel={o.drag ? (e) => { setPicked("sub"); setSize("sub", sizeOf("sub") + (e.deltaY < 0 ? 5 : -5)); } : undefined} title={o.drag ? "끌어서 옮기기 · 휠로 크기" : undefined}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", transform: `${o.drag && dg.sub ? `translate(${dg.sub.dx * W}px, ${dg.sub.dy * H}px) ` : ""}scale(${(szR.sub || 100) / 100})${demoT("sub", W, H)}`, opacity: demoO("sub"), transformOrigin: (subPos === "top" ? "50% 22%" : subPos === "middle-high" ? "50% 32%" : subPos === "middle" ? "50% 50%" : subPos === "middle-low" ? "50% 70%" : "50% 88%") }}>
        {(subOn || o.forceSub) && (
          <div style={{ position: "absolute", left: "6%", right: "6%", display: "flex", flexDirection: "column", alignItems: o.news ? "flex-start" : "center", ...pos }}>
            {o.news && <span style={{ background: o.news, color: "#fff", fontWeight: 900, fontSize: fs * 0.5, padding: `0 ${fs * 0.3}px`, lineHeight: 1.5, fontFamily: fontCss("Pretendard") }}>NEWS</span>}
            <span style={{ maxWidth: "100%", textAlign: o.news ? "left" : "center", fontFamily: fontCss(l.font), fontWeight: l.bold === false ? 500 : 800, fontSize: fs, lineHeight: 1.3, paintOrder: "stroke fill",
              color: l.gradTo ? "transparent" : l.color, ...(l.gradTo ? { backgroundImage: gradCss({ ...l, gradTo: l.gradTo }), WebkitBackgroundClip: "text", backgroundClip: "text" } : {}),
              ...(l.bg ? { background: `${l.bgColor || "#000000"}${Math.round((l.bgOpacity ?? 0.62) * 255).toString(16).padStart(2, "0")}`, padding: "1px 6px", borderRadius: 3 } : {}),
              ...subLookCss(l, fs, fs / 40),
              display: "-webkit-box", WebkitLineClamp: subLines, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>{demoWords(o.text ?? firstLine, Boolean(o.drag))}</span>
          </div>
        )}
        </div>
        {o.drag && picked && hb[String(W)] && (() => {
          const r = hb[String(W)];
          return <div data-gshandle="" onPointerDown={(e) => startResize(e, String(W))} title="끌어서 크기 바꾸기" style={{ position: "absolute", left: r.l + r.w - 5, top: r.t + r.h - 5, width: 12, height: 12, borderRadius: 2, background: "#fff", border: "2px solid #3b82f6", cursor: "nwse-resize", zIndex: 6, boxSizing: "border-box" }} />;
        })()}
        {(o.ov || []).filter(Boolean).map((u, i) => <img key={i} src={u} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }} />)}
      </div>
    );
  };
  // 세로(9:16·4:5)는 높이를 넉넉히 — 예시 화면·샘플이 너무 작아 읽기 어려웠다 (2026-10-22 사장님)
  const tallR = rh > rw;
  const big = tallR ? Math.min(300 / rw, 430 / rh) : Math.min(420 / rw, 250 / rh), small = tallR ? Math.min(150 / rw, 240 / rh) : Math.min(190 / rw, 107 / rh);
  const BW = Math.round(rw * big), BH = Math.round(rh * big), SW = Math.round(rw * small), SH = Math.round(rh * small);
  const card = (key: string, on: boolean, label: string, body: React.ReactNode, go: () => void) => (
    <button key={key} type="button" onClick={go}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 7, borderRadius: 8, border: `2px solid ${on ? C.accent : C.line}`, background: on ? "rgba(59,130,246,0.12)" : C.card, cursor: "pointer", color: C.text, fontFamily: FONT }}>
      {body}
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</span>
    </button>
  );
  /** 로고 이미지 첨부 칸 (JPG·PNG) — 채널명 · 로고 + 한 줄 제목에서 같이 쓴다 */
  const logoCard = (which: "logo" | "titleLogo" = "logo") => (
    <label key={which} title="JPG 또는 PNG" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 7, borderRadius: 8, border: `2px ${deco[which] ? "solid" : "dashed"} ${deco[which] ? C.accent : C.line2}`, background: C.card, cursor: "pointer", color: C.text, fontFamily: FONT, position: "relative" }}>
                <div style={{ width: SW, height: SH, borderRadius: 6, background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, overflow: "hidden" }}>
                  {deco[which] ? <img src={deco[which]} alt="" style={{ maxWidth: "70%", maxHeight: "70%", objectFit: "contain" }} /> : <><span style={{ fontSize: 26, color: C.sub, lineHeight: 1 }}>+</span><span style={{ fontSize: 12, color: logoErr ? C.danger : C.dim, padding: "0 6px", textAlign: "center" }}>{logoErr || "로고 이미지 (JPG·PNG)"}</span></>}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{deco[which] ? "로고 바꾸기" : "로고 이미지 첨부"}</span>
                {deco[which] && <button type="button" title="로고 빼기" onClick={(e) => { e.preventDefault(); e.stopPropagation(); set({ [which]: undefined }); }} style={{ position: "absolute", right: 4, top: 4, width: 20, height: 20, borderRadius: 10, border: 0, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 11, cursor: "pointer", padding: 0 }}>✕</button>}
                <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style={{ display: "none" }} onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (!/\.(jpe?g|png)$/i.test(f.name) || !/^image\/(jpeg|png)$/.test(f.type)) { setLogoErr("로고는 JPG 또는 PNG 이미지여야 해요"); return; }
                  setLogoErr("");
                  const im = new Image();
                  im.onload = () => {
                    const k = Math.min(1, 400 / Math.max(im.naturalWidth, im.naturalHeight));
                    const c = document.createElement("canvas");
                    c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
                    c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
                    set({ [which]: c.toDataURL("image/png") });
                    URL.revokeObjectURL(im.src);
                  };
                  im.onerror = () => setLogoErr("그림을 읽지 못했어요 — JPG 또는 PNG 이미지여야 해요");
                  im.src = URL.createObjectURL(f);
                }} />
              </label>
  );
  /** 화면 전체 PNG 첨부 칸 — 1920×1080 (세로 영상이면 1080×1920), PNG 만. 넣으면 그 칸은 이 그림만 쓴다 */
  const ovCard = (which: "titleOv" | "chOv") => {
    const want = ratio === "9:16" ? [1080, 1920] : ratio === "16:9" ? [1920, 1080] : null;
    return (
      <label key={which} title={`PNG · ${want ? `${want[0]}×${want[1]}` : "화면 비율과 같은 크기"}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 7, borderRadius: 8, border: `2px ${deco[which] ? "solid" : "dashed"} ${deco[which] ? C.accent : C.line2}`, background: C.card, cursor: "pointer", color: C.text, fontFamily: FONT, position: "relative" }}>
        <div style={{ width: SW, height: SH, borderRadius: 6, background: deco[which] ? "repeating-conic-gradient(#3a3d45 0% 25%, #2b2e35 0% 50%) 0 0 / 12px 12px" : C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, overflow: "hidden" }}>
          {deco[which] ? <img src={deco[which]} alt="" style={{ width: "100%", height: "100%", objectFit: "fill" }} /> : <><span style={{ fontSize: 26, color: C.sub, lineHeight: 1 }}>+</span><span style={{ fontSize: 12, color: ovErr ? C.danger : C.dim, padding: "0 6px", textAlign: "center" }}>{ovErr || `PNG ${want ? `${want[0]}×${want[1]}` : ""}`}</span></>}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{deco[which] ? "PNG 바꾸기 (이것만 써요)" : "PNG 이미지 첨부"}</span>
        {deco[which] && <button type="button" title="빼기" onClick={(e) => { e.preventDefault(); e.stopPropagation(); set({ [which]: undefined }); }} style={{ position: "absolute", right: 4, top: 4, width: 20, height: 20, borderRadius: 10, border: 0, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 11, cursor: "pointer", padding: 0 }}>✕</button>}
        <input type="file" accept=".png,image/png" style={{ display: "none" }} onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (!/\.png$/i.test(f.name) || f.type !== "image/png") { setOvErr("PNG 파일만 돼요"); return; }
          const im = new Image();
          im.onload = () => {
            const w = im.naturalWidth, h = im.naturalHeight;
            const ok = want ? w === want[0] && h === want[1] : Math.abs(w / h - rw / rh) < 0.01;
            URL.revokeObjectURL(im.src);
            if (!ok) { setOvErr(want ? `${want[0]}×${want[1]} 크기여야 해요 (지금 ${w}×${h})` : `화면 비율(${ratio})과 같아야 해요`); return; }
            setOvErr("");
            const r = new FileReader();
            r.onload = () => set({ [which]: String(r.result) });
            r.readAsDataURL(f);
          };
          im.onerror = () => setOvErr("그림을 읽지 못했어요 — PNG 파일이어야 해요");
          im.src = URL.createObjectURL(f);
        }} />
      </label>
    );
  };
  const none = (on: boolean, go: () => void, w = SW, h = SH) => card("none", on, "없음", <div style={{ width: w, height: h, borderRadius: 6, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 13 }}>없음</div>, go);
  const grid = (minW: number, kids: React.ReactNode) => <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${minW + 16}px, 1fr))`, gap: 10 }}>{kids}</div>;
  // 전환 미리보기 — 사진 두 장이 번갈아 (간단한 모양으로)
  const transKind = (id: string) => (/slide|push|cover/.test(id) ? "slide" : /wipe|clock|iris|circle/.test(id) ? "wipe" : /zoom/.test(id) ? "zoom" : /black/.test(id) ? "black" : /white/.test(id) ? "white" : "fade");
  /** 화면전환 미리보기 — 편집기와 같은 전환 계산(transStyle)으로, 사진 두 장이 번갈아 넘어간다 */
  const transFrame = (W: number, H: number, id: string) => {
    // 전환 소리도 함께 — 자동이면 그 전환의 소리, 없음이면 조용히 (2026-10-22 사장님)
    const ts = deco.transSfx || "auto";
    const sfx = ts === "none" ? "" : ts === "auto" ? TRANSITIONS.find((x) => x.id === id)?.sfx || "" : ts;
    return <TransDemo W={W} H={H} id={id} a={bgA} b={bgB} tick={tick} sfx={sfx} />;
  };
  const cur = (id: (typeof TABS)[number]["id"]) => {
    if (id === "sub") return !subOn ? "자막 없음" : `${SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === deco.sub)?.label || newsSubOf(deco.sub)?.label || "기본"}`;
    if (id === "title") return deco.titleOv ? "PNG 이미지" : tStyle?.label || "없음";
    if (id === "channel") return deco.chOv ? "PNG 이미지" : cStyle ? (chText || deco.logo ? `${cStyle.label}${deco.logo ? " · 로고" : ""}` : "중개사무소 정보 없음") : "없음";
    if (id === "trans" && deco.transMode === "none") return "없음";
    if (id === "trans" && deco.transMode && deco.transMode !== "auto" && deco.trans.length) return `${TRANS_MODES.find((m) => m.id === deco.transMode)?.label} · ${deco.trans.length}개`;
    if (id === "trans") return !deco.trans.length ? "없음" : deco.trans.length === 1 ? TRANSITIONS.find((x) => x.id === deco.trans[0])?.label || "" : `${deco.trans.length}개 · 끝은 ${TRANSITIONS.find((x) => x.id === deco.trans[deco.trans.length - 1])?.label || ""} 반복`;
    if (id === "thumb") return LAYOUTS.find((x) => x.id === deco.thumb)?.name.replace(/^유튜브 — /, "") || "없음";
    return deco.end === "none" ? "없음" : deco.end;
  };
  const preview = tab === "trans" ? transFrame(BW, BH, transShow && (deco.trans.includes(transShow as TransType) || transShow === "none") ? transShow : deco.trans.length ? deco.trans[deco.trans.length - 1] : "none")
    : tab === "thumb" ? (deco.thumb !== "none" && thumbs[deco.thumb] ? <img src={thumbs[deco.thumb]} alt="" style={{ width: BW, height: Math.round(BW * 9 / 16), objectFit: "cover", borderRadius: 6 }} /> : frame(BW, BH, {}))
    : tab === "end" ? (deco.end !== "none" && ends[deco.end] ? <div style={{ width: BW, height: BH, borderRadius: 6, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><img src={ends[deco.end]} alt="" style={{ maxWidth: "92%", maxHeight: "92%" }} /></div> : frame(BW, BH, { text: "엔딩 없음" }))
    : frame(BW, BH, { drag: true, sub: subLook, news: newsSubOf(deco.sub)?.tag, title: deco.titleOv ? null : tStyle, ch: deco.chOv ? null : cStyle, ov: [deco.titleOv, deco.chOv] });
  return (
    <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 위 — 예시 화면 · 1~6 항목은 스크롤해도 늘 보이게 (2026-10-22 사장님) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", padding: "6px 0 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: C.sub, fontWeight: 700 }}>{bgs.length ? "내 화면으로 미리보기" : "예시 화면"}</span>
          <div style={{ position: "relative" }}>
            {preview}
            {tab !== "trans" && tab !== "thumb" && tab !== "end" && (
              <button type="button" onClick={() => setZoom(true)} title="크게 보기 — 크게 보며 자막·제목 자리를 옮겨요"
                style={{ position: "absolute", right: 8, bottom: 8, width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.28)", background: "rgba(17,24,39,0.72)", backdropFilter: "blur(4px)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21M10.5 7.8v5.4M7.8 10.5h5.4" /></svg>
              </button>
            )}
          </div>
          
          {tab !== "trans" && tab !== "thumb" && tab !== "end" && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", textAlign: "center", gap: 8, fontSize: 12, color: C.dim, maxWidth: 460 }}>제목·채널명·자막은 끌어서 옮기고, 누르면 생기는 모서리 □를 끌어 크기를 바꿔요{Object.keys(dg).length > 0 && <button type="button" onClick={() => setDg({})} style={{ height: 24, padding: "0 8px", borderRadius: 5, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>자리 처음으로</button>}</div>}
        </div>
        <div style={{ width: BW, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setSub2("style"); setPop(true); }} title="눌러서 고르기"
              style={{ display: "flex", alignItems: "center", gap: 10, height: 36, padding: "0 10px", borderRadius: 7, border: `1px solid ${tab === t.id ? C.accent : C.line}`, background: tab === t.id ? "rgba(59,130,246,0.14)" : "transparent", color: C.text, cursor: "pointer", fontFamily: FONT, textAlign: "left" }}>
              <span style={{ width: 20, height: 20, borderRadius: 10, background: tab === t.id ? C.accent : C.line2, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{t.n}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>{t.name}</span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: 12.5, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cur(t.id)}</span>
              <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: C.accent }}>바꾸기 ›</span>
            </button>
          ))}
        </div>
      </div>
      {zoom && (() => {
        // 화면에 맞는 가장 큰 크기 (가로·세로 비율 그대로)
        const k = Math.min((window.innerWidth * 0.86) / rw, (window.innerHeight * 0.78) / rh);
        const ZW = Math.round(rw * k), ZH = Math.round(rh * k);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 6500, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: FONT }} onMouseDown={(e) => { if (e.target === e.currentTarget) setZoom(false); }}>
            {frame(ZW, ZH, { drag: true, sub: subLook, news: newsSubOf(deco.sub)?.tag, title: deco.titleOv ? null : tStyle, ch: deco.chOv ? null : cStyle, ov: [deco.titleOv, deco.chOv] })}
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontSize: 14 }}>
              <span>끌어서 옮기기 · 눌러 고른 뒤 모서리 □를 끌어 크기</span>
              
              {Object.keys(dg).length > 0 && <button type="button" onClick={() => setDg({})} style={{ height: 32, padding: "0 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>자리 처음으로</button>}
              <button type="button" onClick={() => setZoom(false)} style={{ height: 32, padding: "0 18px", borderRadius: 6, border: 0, background: C.accent, color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>완료</button>
            </div>
          </div>
        );
      })()}
      {/* 고른 항목의 샘플 — 팝업 (2026-10-23 사장님: 아래로 쌓이면 복잡) */}
      {pop && (
      <div style={{ position: "fixed", inset: 0, zIndex: 6000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }} onMouseDown={(e) => { if (e.target === e.currentTarget) setPop(false); }}>
      <div style={{ width: "min(1180px, 94vw)", height: "88vh", display: "flex", flexDirection: "column", background: C.panel, color: C.text, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ width: 24, height: 24, borderRadius: 12, background: C.accent, color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{TABS.find((t) => t.id === tab)?.n}</span>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{TABS.find((t) => t.id === tab)?.name}</span>
          <span style={{ fontSize: 13, color: C.sub }}>지금: {cur(tab)}</span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => setPop(false)} style={{ height: 34, padding: "0 18px", borderRadius: 6, border: 0, background: C.accent, color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>완료</button>
        </div>
        <div style={{ display: "flex", gap: 18, padding: "16px 20px", minHeight: 0, flex: 1, overflow: "hidden" }}>
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, color: C.sub, fontWeight: 700 }}>미리보기</span>
            {preview}
          </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingRight: 4 }}>
        {(tab === "sub" || tab === "title" || tab === "channel") && (
          <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: `1px solid ${C.line}` }}>
            {([["style", tab === "sub" ? "자막 스타일" : tab === "title" ? "제목 스타일" : "채널명 스타일"], ["anim", "애니메이션"]] as const).map(([id, nm]) => (
              <button key={id} type="button" onClick={() => setSub2(id)} style={{ height: 36, padding: "0 16px", border: 0, borderBottom: `3px solid ${sub2 === id ? C.accent : "transparent"}`, background: "transparent", color: sub2 === id ? C.text : C.sub, fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer", marginBottom: -1 }}>{nm}</button>
            ))}
          </div>
        )}
        {(tab === "sub" || tab === "title" || tab === "channel") && sub2 === "anim" && (() => {
          const k = tab === "sub" ? "sub" : tab === "title" ? "title" : "ch";
          return (
            <div style={{ marginBottom: 14, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
              <AnimBody what={k === "sub" ? "자막" : "글자"} text={k === "sub" ? "자막" : k === "title" ? (deco.titleText || "제목").slice(0, 4) : "채널"} sfxDefault={k === "sub" ? "none" : "auto"}
                value={deco.animFull?.[k]}
                onChange={(fn) => { const n = fn({ ...(deco.animFull?.[k] || {}) }); const clean = Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined)) as LayerAnim; set({ animFull: { ...(deco.animFull || {}), [k]: clean } }); }}
                onPreview={(part) => play(k, part)} />
            </div>
          );
        })()}
        {tab === "sub" && sub2 === "style" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginBottom: 8 }}>뉴스 자막 바 <span style={{ fontWeight: 500, color: C.dim }}>· 문장마다 흰 띠 · 위에 NEWS (자막 위치 하단)</span></div>
            {grid(SW, [none(!subOn, () => setSubOn?.(false)), ...NEWS_SUBS.map((x) => card(x.id, subOn && deco.sub === x.id, x.label, frame(SW, SH, { sub: x.look, news: x.tag, text: "자막 미리보기", forceSub: true }), () => { setSubOn?.(true); set({ sub: deco.sub === x.id && subOn ? "" : x.id }); }))])}
          </div>
        )}
        {tab === "sub" && sub2 === "style" && SUB_PRESETS.filter((g) => ["기본", "글꼴", "상자", "예능·유튜브", "다큐·뉴스", "네온·빛"].includes(g.group)).map((g) => (
          <div key={g.group} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginBottom: 8 }}>{g.group}</div>
            {grid(SW, [
              // 맨 앞 묶음에 [자막 없음] (2026-10-22 사장님)
              ...g.items.map((x) => card(x.id, subOn && deco.sub === x.id, x.label, frame(SW, SH, { sub: x.look, text: "자막 미리보기", forceSub: true }), () => { setSubOn?.(true); set({ sub: deco.sub === x.id && subOn ? "" : x.id }); if (x.look.font) void loadFont(x.look.font).catch(() => {}); })),
            ])}
          </div>
        ))}
        {tab === "title" && sub2 === "style" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input value={deco.titleText} onChange={(e) => set({ titleText: e.target.value })} onKeyDown={(e) => e.stopPropagation()} placeholder={tStyle?.subnews ? "1단 (예: 자막뉴스)" : tStyle?.two ? "1단 제목 (위 · 색 바탕 흰 글씨)" : tStyle?.hl || tStyle?.newsBar ? "제목 — 강조할 곳은 [ ]로 감싸요 (예: 광란의 개 [보리를 대하는 법]) · 없으면 뒷부분" : "제목 — 비워 두면 만들 때 AI가 대본을 읽고 써요"} style={{ ...input, flex: 1, height: 36 }} />
              {tStyle?.two && <input value={deco.title2 || ""} onChange={(e) => set({ title2: e.target.value })} onKeyDown={(e) => e.stopPropagation()} placeholder={tStyle?.subnews ? "출처 (예: 출처 | 유튜브 '○○') — 자료에 있는 것만" : "2단 제목 (아래 · 색 글씨)"} style={{ ...input, flex: 1, height: 36 }} />}
              <button type="button" onClick={onAiTitle} disabled={aiTitleBusy} style={{ height: 36, padding: "0 14px", borderRadius: 6, border: 0, background: C.accent, color: "#fff", fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{aiTitleBusy ? "쓰는 중…" : "AI로 제목 쓰기"}</button>
            </div>
            {grid(SW, [none(deco.title === "none", () => set({ title: "none" })), logoCard("titleLogo"), ovCard("titleOv")])} {/* 없음 옆에 제목 로고 한 번 (2026-10-22 사장님) */}
            {[...new Set(TITLE_STYLES.map((x) => x.group || ""))].map((gn) => (
              <div key={gn} style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginBottom: 8 }}>{gn}</div>
                {grid(SW, [...TITLE_STYLES.filter((x) => (x.group || "") === gn).map((x) => card(x.id, deco.title === x.id, x.label, frame(SW, SH, { title: x, text: "" }), () => set({ title: x.id })))])}
              </div>
            ))}
          </>
        )}
        {tab === "channel" && sub2 === "style" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
              <input value={deco.channelText} onChange={(e) => set({ channelText: e.target.value })} onKeyDown={(e) => e.stopPropagation()} placeholder={agency?.name ? `비워 두면 "${agency.name}"` : "채널명 (중개사무소 정보가 없어요)"} style={{ ...input, flex: 1, height: 36 }} />
            </div>
            {/* 없음 옆 — 로고 이미지 첨부 칸 (JPG·PNG, 2026-10-22 사장님) */}
            {grid(SW, [none(deco.channel === "none", () => set({ channel: "none" })),
              logoCard(), ovCard("chOv")])}
            {[...new Set(CHANNEL_STYLES.map((x) => x.group || ""))].map((gn) => (
              <div key={gn} style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginBottom: 8 }}>{gn}</div>
                {grid(SW, CHANNEL_STYLES.filter((x) => (x.group || "") === gn).map((x) => card(x.id, deco.channel === x.id, x.label, frame(SW, SH, { ch: x, text: "" }), () => set({ channel: x.id }))))}
              </div>
            ))}
          </>
        )}
        {/* 화면전환 1~5 칸 — 칸을 누르고 아래에서 고르면 그 칸에, 빈 칸이 없으면 마지막 칸에 (2026-10-22 사장님) */}
        {tab === "trans" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.sub, marginRight: 4 }}>넣는 곳</span>
            {TRANS_MODES.map((m) => {
              const on = (deco.transMode || "auto") === m.id;
              return <button key={m.id} type="button" title={m.desc} onClick={() => set({ transMode: m.id })} style={{ height: 32, padding: "0 12px", borderRadius: 6, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? "rgba(59,130,246,0.14)" : "transparent", color: C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{m.label}</button>;
            })}
            <span style={{ fontSize: 12, color: C.dim }}>{TRANS_MODES.find((m) => m.id === (deco.transMode || "auto"))?.desc}</span>
          </div>
        )}
        {tab === "trans" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {[0, 1, 2, 3, 4].map((i) => {
                const id = deco.trans[i], on = transSlot === i;
                return (
                  <button key={i} type="button" onClick={() => { setTransSlot(on ? -1 : i); if (id) { setTransShow(id); setTick((x) => x + 1); } }}
                    // 끌어서 순서 바꾸기 (2026-10-22 사장님) — 채워진 칸만 끌 수 있고, 놓은 칸 자리로
                    draggable={Boolean(id)}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); setTransDrag(i); }}
                    onDragEnd={() => setTransDrag(-1)}
                    onDragOver={(e) => { if (transDrag >= 0) e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = transDrag;
                      setTransDrag(-1);
                      if (from < 0 || from === i) return;
                      const n = deco.trans.slice();
                      const [m] = n.splice(from, 1);
                      n.splice(Math.min(i, n.length), 0, m);
                      set({ trans: n });
                      setTransSlot(-1);
                    }}
                    style={{ position: "relative", height: 52, borderRadius: 8, opacity: transDrag === i ? 0.4 : 1, border: `2px ${id ? "solid" : "dashed"} ${on || (transDrag >= 0 && transDrag !== i) ? C.accent : id ? C.line2 : C.line}`, background: on ? "rgba(59,130,246,0.14)" : C.card, color: id ? C.text : C.dim, fontFamily: FONT, cursor: id ? "grab" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "0 6px" }}>
                    <span style={{ fontSize: 11.5, color: on ? C.accent : C.sub, fontWeight: 800 }}>{i + 1}{i === Math.max(0, deco.trans.length - 1) && id ? " · 반복" : ""}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{id ? TRANSITIONS.find((x) => x.id === id)?.label || id : on ? "아래에서 고르기" : "비어 있음"}</span>
                    {id && <span role="button" title="빼기" onClick={(e) => { e.stopPropagation(); set({ trans: deco.trans.filter((_x, j) => j !== i) }); setTransSlot(-1); }} style={{ position: "absolute", right: 3, top: 3, width: 16, height: 16, borderRadius: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, lineHeight: "16px" }}>✕</span>}
                  </button>
                );
              })}
            </div>
            {/* 전환 소리 — 고르면 바로 들려 줘요 */}
            {(() => {
              const cur = deco.transSfx || "auto";
              const chipS = (on: boolean): React.CSSProperties => ({ height: 30, padding: "0 10px", borderRadius: 15, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 });
              return (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 10 }}>
                  <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginRight: 4 }}>전환 소리</span>
                  <button type="button" title="전환마다 어울리는 소리 (소리가 없는 전환은 조용히)" onClick={() => { set({ transSfx: "auto" }); setTick((x) => x + 1); }} style={chipS(cur === "auto")}>♪ 자동</button>
                  <button type="button" onClick={() => set({ transSfx: "none" })} style={chipS(cur === "none")}>없음</button>
                  {SFX_LIST.map((x) => (
                    <button key={x.id} type="button" title="누르면 들려 줘요" onClick={() => { set({ transSfx: x.id }); setTick((t) => t + 1); }} style={chipS(cur === x.id)}>▶ {x.label}</button>
                  ))}
                </div>
              );
            })()}
            <div style={{ fontSize: 12.5, color: transMsg ? C.danger : C.dim, marginTop: 8 }}>{transMsg || "칸을 끌어서 순서를 바꿔요 · 칸을 누르고 아래에서 고르면 그 칸이 바뀌어요 · 그냥 고르면 빈 칸부터 차례로 · 클립마다 1→5 순서로 넣고, 그 뒤로는 마지막 칸이 반복돼요"}</div>
          </div>
        )}
        {tab === "trans" && [...new Set(TRANSITIONS.map((t) => t.group))].map((gname) => (
          <div key={gname} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginBottom: 8 }}>{gname}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {gname === TRANSITIONS[0].group && <button type="button" onClick={() => set({ trans: [] })} style={{ height: 32, padding: "0 12px", borderRadius: 6, border: `1px solid ${!deco.trans.length ? C.accent : C.line2}`, background: !deco.trans.length ? "rgba(59,130,246,0.14)" : "transparent", color: C.text, fontFamily: FONT, cursor: "pointer" }}>없음</button>}
              {TRANSITIONS.filter((t) => t.group === gname).map((t) => (
                <button key={t.id} type="button" onClick={() => {
                  const on = deco.trans.includes(t.id);
                  // 5개가 차 있으면 막지 않고 — 마지막 것을 이것으로 바꾼다 (예전 기억이 5개 넘게 남아 있어도 바로 고를 수 있게)
                  const cur = deco.trans.slice(0, 5);
                  setTransMsg("");
                  setTransShow(t.id);
                  if (transSlot >= 0) {
                    // 고른 칸에 넣기 (비어 있는 칸이면 맨 뒤에)
                    const n = cur.slice();
                    if (transSlot < n.length) n[transSlot] = t.id; else n.push(t.id);
                    set({ trans: n.slice(0, 5) });
                    setTransSlot(-1);
                  } else if (on) set({ trans: cur.filter((x) => x !== t.id) });
                  else if (cur.length >= 5) { setTransMsg("5칸이 다 찼어요 — 바꿀 칸을 먼저 누르고 골라 주세요"); return; }
                  else set({ trans: [...cur, t.id] });
                  setTick((x) => x + 1);
                }}
                  style={{ height: 32, padding: "0 12px", borderRadius: 6, border: `1px solid ${deco.trans.includes(t.id) ? C.accent : C.line2}`, background: deco.trans.includes(t.id) ? "rgba(59,130,246,0.14)" : "transparent", color: C.text, fontFamily: FONT, cursor: "pointer", fontSize: 13 }}>
                  {deco.trans.includes(t.id) && <b style={{ color: C.accent, marginRight: 4 }}>{deco.trans.indexOf(t.id) + 1}</b>}{t.label}</button>
              ))}
            </div>
          </div>
        ))}
        {tab === "thumb" && (
          <>
            <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 10 }}>유튜브 썸네일 레이아웃 — 고른 틀은 편집 화면에서 이미지 편집으로 열어 만들어요 (사진·제목은 내 영상 것으로)</div>
            {grid(200, [none(deco.thumb === "none", () => set({ thumb: "none" }), 200, 112), ...thumbLayouts.map((l: Layout) => card(l.id, deco.thumb === l.id, l.name.replace(/^유튜브 — /, ""),
              thumbs[l.id] ? <img src={thumbs[l.id]} alt="" style={{ width: 200, height: 112, objectFit: "cover", borderRadius: 6 }} /> : <div style={{ width: 200, height: 112, borderRadius: 6, background: C.bg }} />, () => set({ thumb: l.id })))])}
          </>
        )}
        {tab === "end" && (
          !agency ? <div style={{ fontSize: 13.5, color: C.sub }}>중개사무소 정보가 없어 엔딩을 만들 수 없어요 — 회원 정보에서 중개사무소를 등록해 주세요.</div> : (
            <>
              <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 10 }}>부동산 표시광고 — 내 중개사무소 정보(상호·대표·등록번호·주소·전화)로 마지막 5초</div>
              {grid(200, [none(deco.end === "none", () => set({ end: "none" }), 200, 112), ...AD_LAW_LABELS.map((lb) => card(lb, deco.end === lb, lb,
                <div style={{ width: 200, height: 112, borderRadius: 6, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{ends[lb] ? <img src={ends[lb]} alt="" style={{ maxWidth: "94%", maxHeight: "94%" }} /> : null}</div>, () => set({ end: lb })))])}
            </>
          )
        )}
      </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

/** 전환 한 번 (1초) — tick 이 바뀔 때마다 앞 · 뒤 사진을 바꿔 다시 */
function TransDemo({ W, H, id, a, b, tick, sfx = "" }: { W: number; H: number; id: string; a: string; b: string; tick: number; sfx?: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (id === "none") return;
    let raf = 0;
    const t0 = performance.now() + 250;
    // 넘어가기 시작할 때 소리
    const st = sfx ? window.setTimeout(() => { try { const au = new Audio(`/studio-sfx/${sfx}.mp3`); au.volume = 0.6; void au.play().catch(() => {}); } catch {} }, 230) : 0;
    const step = (t: number) => {
      const q = Math.max(0, Math.min(1, (t - t0) / 1000));
      setP(q);
      if (q < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(st); };
  }, [tick, id]); // eslint-disable-line react-hooks/exhaustive-deps
  const flip = tick % 2 === 1;
  const from = flip ? b : a, to = flip ? a : b;
  const fid = "gsvwiz";
  if (id === "none") return <div style={{ width: W, height: H, borderRadius: 6, background: `#000 url("${to}") center / cover`, flexShrink: 0 }} />;
  const L = transStyle(id as TransType, p, { w: W, h: H, fid });
  const zFrom = L.toOnTop ? 1 : 2, zTo = L.toOnTop ? 2 : 1;
  return (
    <div style={{ position: "relative", width: W, height: H, borderRadius: 6, overflow: "hidden", background: "#000", flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, zIndex: zFrom, background: `url("${from}") center / cover`, ...L.from }} />
      <div style={{ position: "absolute", inset: 0, zIndex: zTo, background: `url("${to}") center / cover`, ...L.to }} />
      {(L.veils || (L.veil ? [L.veil] : [])).map((v, i) => <div key={i} style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", ...v }} />)}
      <TransFx fid={fid} fx={L.fx} />
    </div>
  );
}
