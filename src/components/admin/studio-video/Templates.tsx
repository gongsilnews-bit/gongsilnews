"use client";

// 템플릿 127종 (2026-10-19 사장님 — 론박 자막 템플릿(.mogrt) 견본을 보고 우리 편집기로 새로 그림. 원본 파일·그림은 쓰지 않음)
//  - 글이 주인공(자막바·제목·말풍선 카드·이름표·브이로그·예능 글자) = [텍스트] 칸, 그림이 주인공(화살표·가리키기·반응) = [스티커] 칸,
//    움직임이 기능(경로·카운트다운·슬롯머신·로딩바·점수·지나가는 자막) = 움직이는 템플릿
//  - 넣으면 스티커처럼 그림 레이어(stk.style = "tpl:<id>", stk.text = 칸 글들). 글을 고치면 같은 모양으로 다시 그린다
//  - 움직이는 템플릿은 칸(1/30초)마다 그린다: 미리보기 TplMotion, 굽기 AnimBake → 미리보기 = 완성 영상
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { LayerAnim, LibItem, Project } from "./types";
import { DRAG_STICKER, errText, stickerDrag, videoBridge } from "./types";
import { loadFont } from "./Pickers";
import { Side } from "./Panels";
import { Btn, C, FONT } from "./ui";

export const TPL_PREFIX = "tpl:";
const SEP = "␞"; // 칸 글 사이
export const isTplStyle = (style?: string) => String(style || "").startsWith(TPL_PREFIX);
const OPT = "⚙"; // 맨 끝 칸 = 글꼴·글자 크기 ("⚙글꼴|배율")
export type TplOpts = { font?: string; k?: number };
export const tplFieldsOf = (text: string) => (text ? String(text).split(SEP).filter((x) => !x.startsWith(OPT)) : []);
export const tplOptsOf = (text: string): TplOpts => {
  const o = String(text || "").split(SEP).find((x) => x.startsWith(OPT));
  if (!o) return {};
  const [font, k] = o.slice(OPT.length).split("|");
  return { font: font || undefined, k: Number(k) > 0 && Number(k) !== 1 ? Number(k) : undefined };
};
export const tplTextOf = (fields: string[], o?: TplOpts) => fields.join(SEP) + (o && (o.font || (o.k && o.k !== 1)) ? SEP + OPT + (o.font || "") + "|" + (o.k || 1) : "");
/** 고를 수 있는 글꼴 (템플릿이 이미 받는 것만) */
export const TPL_FONTS: { id: string; label: string }[] = [
  { id: "", label: "원래 글꼴" }, { id: "Black Han Sans", label: "검은고딕" }, { id: "Jua", label: "주아" }, { id: "Do Hyeon", label: "도현" },
  { id: "Pretendard", label: "프리텐다드" }, { id: "GmarketSans", label: "G마켓 산스" }, { id: "CookieRunOTF", label: "쿠키런" }, { id: "Gowun Dodum", label: "고운돋움" },
  { id: "Nanum Pen", label: "나눔펜" }, { id: "Yeon Sung", label: "연성" }, { id: "Cafe24 Oneprettynight", label: "고운밤" }, { id: "tvN Enjoystories", label: "tvN 즐거운이야기" }, { id: "NanumMyeongjo", label: "나눔명조" },
];
export const TPL_SIZES: { k: number; label: string }[] = [{ k: 0.85, label: "작게" }, { k: 1, label: "보통" }, { k: 1.15, label: "크게" }];
/** 그리는 동안만 쓰는 글꼴·크기 바꾸기 — 모든 글은 tw·txt 를 지나므로 여기서 한 번에 */
let FX: TplOpts | null = null;
const fx = (font: string) => {
  if (!FX || /Emoji/.test(font)) return font;
  let f = font;
  if (FX.k && FX.k !== 1) f = f.replace(/(\d+(?:\.\d+)?)px/, (_, n) => `${Math.round(Number(n) * FX!.k! * 10) / 10}px`);
  if (FX.font) f = f.replace(/px\s+.*$/, `px "${FX.font}", "Malgun Gothic", sans-serif`);
  return f;
};
function drawWith(d: TplDef, vals: string[], color: string, t: number, o?: TplOpts) {
  FX = o && (o.font || o.k) ? o : null;
  try { return d.draw(vals, color, t); } finally { FX = null; }
}

type Kind = "text" | "sticker" | "motion";
type Field = { label: string; def: string; multi?: boolean };
type Draw = (f: string[], c: string, t: number) => HTMLCanvasElement;
export type TplDef = { id: string; cat: string; label: string; kind: Kind; fields: Field[]; color: string; w: number; y?: number; anim: LayerAnim; dur?: number; draw: Draw; /** 누르는 순간 (초) — 넣으면 그때마다 큰 딸깍 */ clicks?: number[] };

/* ── 글꼴 ── */
const F = {
  head: `"Black Han Sans", "Malgun Gothic", sans-serif`,
  round: `"Jua", "Malgun Gothic", sans-serif`,
  dh: `"Do Hyeon", "Malgun Gothic", sans-serif`,
  pre: `"Pretendard", "Malgun Gothic", sans-serif`,
  pen: `"Nanum Pen", "Malgun Gothic", sans-serif`,
  ys: `"Yeon Sung", "Malgun Gothic", sans-serif`,
  gm: `"GmarketSans", "Malgun Gothic", sans-serif`,
  ck: `"CookieRunOTF", "Jua", "Malgun Gothic", sans-serif`,
  night: `"Cafe24 Oneprettynight", "Nanum Pen", "Malgun Gothic", sans-serif`,
  gd: `"Gowun Dodum", "Malgun Gothic", sans-serif`,
  mj: `"NanumMyeongjo", "Batang", serif`,
  tvn: `"tvN Enjoystories", "Nanum Pen", "Malgun Gothic", sans-serif`,
  emoji: `"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`,
};
const FAMILIES = ["Black Han Sans", "Jua", "Do Hyeon", "Pretendard", "Nanum Pen", "Yeon Sung", "GmarketSans", "CookieRunOTF", "Cafe24 Oneprettynight", "Gowun Dodum", "NanumMyeongjo", "tvN Enjoystories"];
let fontsP: Promise<void> | null = null;
/** 템플릿 글꼴 받기 (한 번만) — 늦어도 2.5초 뒤엔 그린다 */
export function tplFonts() {
  if (!fontsP) fontsP = Promise.race([Promise.all(FAMILIES.map((f) => loadFont(f).catch(() => {}))).then(() => {}), new Promise<void>((r) => setTimeout(r, 2500))]);
  return fontsP;
}

/* ── 그리기 도구 ── */
function mk(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.ceil(w));
  c.height = Math.max(2, Math.ceil(h));
  const g = c.getContext("2d")!;
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineCap = "round";
  return { c, g };
}
const meas = mk(4, 4).g;
const tw = (font: string, s: string) => { meas.font = fx(font); return meas.measureText(s).width; };
const lines = (s: string) => String(s || "").split(/\r?\n/).map((x) => x.trim()).filter((x, i, a) => x || a.length === 1);
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}
/** 이미지 편집에서 템플릿을 레이어로 나눌 때만 — 글 그리기를 기록하고, 고른 칸 글만 그린다 (영상 편집기에는 영향 없음) */
type TxtCall = { s: string; fi: number; font: string; fill: string; stroke?: string; lw?: number; align: CanvasTextAlign; glow?: string; shadow?: string };
let SPLIT: { fieldOf: (s: string) => number; show: Set<number>; calls: TxtCall[] } | null = null;
function txt(g: CanvasRenderingContext2D, s: string, x: number, y: number, o: { font: string; fill: string; stroke?: string; lw?: number; align?: CanvasTextAlign; glow?: string; blur?: number; shadow?: string }) {
  if (SPLIT) {
    const fi = SPLIT.fieldOf(s);
    SPLIT.calls.push({ s, fi, font: fx(o.font), fill: typeof o.fill === "string" ? o.fill : "#FFFFFF", stroke: o.stroke, lw: o.lw, align: o.align || "center", glow: o.glow, shadow: o.shadow });
    if (fi >= 0 && !SPLIT.show.has(fi)) return;
  }
  g.save();
  g.font = fx(o.font);
  g.textAlign = o.align || "center";
  if (o.shadow) { g.shadowColor = o.shadow; g.shadowBlur = 0; g.shadowOffsetX = 5; g.shadowOffsetY = 6; }
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur ?? 26; }
  if (o.stroke && o.lw) { g.lineWidth = o.lw; g.strokeStyle = o.stroke; g.strokeText(s, x, y); }
  if (o.glow) { g.fillStyle = o.fill; g.fillText(s, x, y); g.shadowBlur = (o.blur ?? 26) / 2; }
  g.fillStyle = o.fill;
  g.fillText(s, x, y);
  g.restore();
}
const pad = (c: HTMLCanvasElement, p: number) => {
  const o = mk(c.width + p * 2, c.height + p * 2);
  o.g.drawImage(c, p, p);
  return o.c;
};
function shadowed(c: HTMLCanvasElement, blur = 18, alpha = 0.45, dy = 6) {
  const o = mk(c.width + blur * 2, c.height + blur * 2 + dy);
  o.g.shadowColor = `rgba(0,0,0,${alpha})`;
  o.g.shadowBlur = blur;
  o.g.shadowOffsetY = dy;
  o.g.drawImage(c, blur, blur);
  return o.c;
}
function hex(c: string, a = 1) {
  const n = parseInt(String(c || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const ink = (c: string) => {
  const n = parseInt(String(c).replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const L = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return L > 150 ? "#111111" : "#FFFFFF";
};
const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * i) / 5 - Math.PI / 2, k = i % 2 ? r * 0.42 : r;
    g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}
function burstPath(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, n = 16, k = 0.72) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2, s = i % 2 ? k : 1;
    g.lineTo(cx + Math.cos(a) * rx * s, cy + Math.sin(a) * ry * s);
  }
  g.closePath();
}
function arrowHead(g: CanvasRenderingContext2D, x: number, y: number, ang: number, size: number, color: string) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(-size, -size * 0.6);
  g.lineTo(-size, size * 0.6);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.restore();
}

/* ── 기본 움직임 ── */
const A = {
  pop: { in: "pop", out: "fade", dur: 0.45, sfx: "pop", sfxVol: 0.5 } as LayerAnim,
  slideL: { in: "slideL", out: "fade", dur: 0.5, sfx: "whoosh-short", sfxVol: 0.45 } as LayerAnim,
  slideR: { in: "slideR", out: "fade", dur: 0.5, sfx: "whoosh-short", sfxVol: 0.45 } as LayerAnim,
  fade: { in: "fade", out: "fade", dur: 0.6 } as LayerAnim,
  zoom: { in: "zoom", out: "fade", dur: 0.45, sfx: "whoosh-short", sfxVol: 0.45 } as LayerAnim,
  stamp: { in: "big", out: "fade", emph: "shake", dur: 0.35, sfx: "impact-bass-1", sfxVol: 0.7 } as LayerAnim,
  jelly: { in: "jelly", out: "fade", emph: "pulse", dur: 0.5, sfx: "pop", sfxVol: 0.6 } as LayerAnim,
  point: { in: "fly", out: "fade", emph: "bounce", dur: 0.45, sfx: "whoosh", sfxVol: 0.5 } as LayerAnim,
  spin: { in: "spin", out: "fade", emph: "pulse", dur: 0.5, sfx: "ping", sfxVol: 0.5 } as LayerAnim,
  key: { in: "fade", out: "fade", dur: 0.3, sfx: "key-press", sfxVol: 0.5 } as LayerAnim,
  shrink: { in: "big", out: "fade", dur: 0.7 } as LayerAnim,
  none: { out: "fade", dur: 0.3 } as LayerAnim,
};

/* ════════ 1. 자막바·박스 자막 ════════ */
/** 다큐 자막바 — 어두운 띠(오른쪽으로 옅어짐) + 왼쪽 색 점 + 작은 머리글 + 큰 글 */
const docBar = (rows: number): Draw => (f, c) => {
  const top = f[0] || "", body = lines(f[1] || "").slice(0, rows);
  const fs = 54, fsT = 34;
  const w = Math.max(tw(`700 ${fs}px ${F.pre}`, body.reduce((a, b) => (a.length > b.length ? a : b), "")), tw(`700 ${fsT}px ${F.pre}`, top)) + 200;
  const h = 70 + body.length * fs * 1.35 + 30;
  const { c: cv, g } = mk(w, h);
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, "rgba(10,14,22,0.88)");
  gr.addColorStop(0.75, "rgba(10,14,22,0.7)");
  gr.addColorStop(1, "rgba(10,14,22,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  g.fillStyle = c;
  g.fillRect(0, 0, 10, h);
  g.beginPath();
  g.arc(48, 46, 10, 0, Math.PI * 2);
  g.fill();
  txt(g, top, 72, 46, { font: `700 ${fsT}px ${F.pre}`, fill: c, align: "left" });
  body.forEach((l, i) => txt(g, l, 40, 100 + i * fs * 1.35, { font: `700 ${fs}px ${F.pre}`, fill: "#FFFFFF", align: "left" }));
  return cv;
};
/** 장문형 자막바 — 둥근 반투명 판 + 왼쪽 위 이름표 + 여러 줄 */
const longBar = (rows: number): Draw => (f, c) => {
  const tag = f[0] || "", body = lines(f[1] || "").slice(0, rows);
  const fs = 46;
  const w = Math.max(...body.map((l) => tw(`600 ${fs}px ${F.pre}`, l)), 400) + 100;
  const h = 60 + body.length * fs * 1.45 + 40;
  const { c: cv, g } = mk(w, h);
  rr(g, 0, 26, w, h - 26, 18);
  g.fillStyle = hex("#0B1A33", 0.82);
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = hex(c, 0.9);
  g.stroke();
  const tagW = tw(`800 ${30}px ${F.pre}`, tag) + 36;
  rr(g, 24, 0, tagW, 52, 10);
  g.fillStyle = c;
  g.fill();
  txt(g, tag, 24 + tagW / 2, 27, { font: `800 30px ${F.pre}`, fill: ink(c) });
  body.forEach((l, i) => txt(g, l, 44, 88 + i * fs * 1.45, { font: `600 ${fs}px ${F.pre}`, fill: "#FFFFFF", align: "left" }));
  return cv;
};
/** 2단 반응 자막바 — 위 작은 색 상자(머리글) + 아래 흰 상자(본문) */
const twoStep: Draw = (f, c) => {
  const a = f[0] || "", b = f[1] || "";
  const fa = 34, fb = 50;
  const wa = tw(`800 ${fa}px ${F.pre}`, a) + 40, wb = tw(`800 ${fb}px ${F.pre}`, b) + 56;
  const { c: cv, g } = mk(Math.max(wa, wb) + 10, 160);
  g.fillStyle = c;
  g.fillRect(0, 0, wa, 54);
  txt(g, a, wa / 2, 28, { font: `800 ${fa}px ${F.pre}`, fill: ink(c) });
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 62, wb, 80);
  txt(g, b, wb / 2, 103, { font: `800 ${fb}px ${F.pre}`, fill: "#111111" });
  return shadowed(cv, 10, 0.35, 4);
};
/** 반응형 2단 박스 — 노란 모서리 괄호 안 두 줄 */
const bracketBox: Draw = (f, c) => {
  const a = f[0] || "", b = f[1] || "";
  const fa = 52, fb = 32;
  const w = Math.max(tw(`800 ${fa}px ${F.pre}`, a), tw(`600 ${fb}px ${F.pre}`, b)) + 110;
  const h = 150;
  const { c: cv, g } = mk(w, h);
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(14, 10, w - 28, h - 20);
  g.strokeStyle = c;
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(14, 10); g.lineTo(14, h - 10);
  g.moveTo(w - 14, 10); g.lineTo(w - 14, h - 10);
  g.stroke();
  txt(g, a, w / 2, 58, { font: `800 ${fa}px ${F.pre}`, fill: c });
  txt(g, b, w / 2, 110, { font: `600 ${fb}px ${F.pre}`, fill: "#FFFFFF" });
  return cv;
};
/** 반응형 2줄 박스 — 기울어진 두 색 상자 */
const slantTwo: Draw = (f, c) => {
  const a = f[0] || "", b = f[1] || "";
  const fa = 40, fb = 54;
  const wa = tw(`900 ${fa}px ${F.head}`, a) + 60, wb = tw(`900 ${fb}px ${F.head}`, b) + 70;
  const { c: cv, g } = mk(Math.max(wa + 30, wb) + 40, 190);
  g.save();
  g.translate(20, 20);
  g.rotate(-0.06);
  g.fillStyle = c;
  g.fillRect(30, 0, wa, 62);
  txt(g, a, 30 + wa / 2, 32, { font: `${fa}px ${F.head}`, fill: ink(c) });
  g.fillStyle = "#22D3EE";
  g.fillRect(0, 70, wb, 82);
  txt(g, b, wb / 2, 112, { font: `${fb}px ${F.head}`, fill: "#0B1220" });
  g.restore();
  return shadowed(cv, 10, 0.35, 4);
};
/** 모던 박스 타이틀 — 얇은 색 상자 한 줄 (색만 다르게 여러 개) */
const modernBox = (bg: string, fg: string, border?: string): Draw => (f, c) => {
  const s = f[0] || "";
  const fs = 46;
  const w = tw(`800 ${fs}px ${F.pre}`, s) + 70;
  const { c: cv, g } = mk(w + 8, 92);
  rr(g, 4, 4, w, 84, 8);
  g.fillStyle = bg === "accent" ? c : bg;
  g.fill();
  if (border) { g.lineWidth = 5; g.strokeStyle = border === "accent" ? c : border; g.stroke(); }
  txt(g, s, 4 + w / 2, 47, { font: `800 ${fs}px ${F.pre}`, fill: fg === "auto" ? ink(bg === "accent" ? c : bg) : fg });
  return shadowed(cv, 8, 0.3, 3);
};
/** 포인트 자막바 — 작은 이름표 + 노란 형광 본문 */
const pointBar: Draw = (f, c) => {
  const tag = f[0] || "", s = f[1] || "";
  const fs = 54;
  const w = Math.max(tw(`900 ${fs}px ${F.head}`, s) + 60, 200);
  const { c: cv, g } = mk(w + 10, 150);
  const tW = tw(`800 28px ${F.pre}`, tag) + 26;
  rr(g, 0, 0, tW, 42, 8);
  g.fillStyle = "#111111";
  g.fill();
  txt(g, tag, tW / 2, 22, { font: `800 28px ${F.pre}`, fill: c });
  g.fillStyle = c;
  g.fillRect(0, 54, w, 84);
  txt(g, s, w / 2, 97, { font: `${fs}px ${F.head}`, fill: ink(c) });
  return cv;
};
/** 이름 자막바 — 밑줄 위 이름 · 오른쪽 작은 직함 */
const nameBar: Draw = (f, c) => {
  const name = f[0] || "", role = f[1] || "";
  const fn = 52, fr = 30;
  const wn = tw(`800 ${fn}px ${F.pre}`, name), wr = tw(`600 ${fr}px ${F.pre}`, role);
  const w = wn + wr + 90;
  const { c: cv, g } = mk(w, 110);
  txt(g, name, 20, 48, { font: `800 ${fn}px ${F.pre}`, fill: "#FFFFFF", align: "left", shadow: "rgba(0,0,0,.5)" });
  txt(g, role, 50 + wn, 54, { font: `600 ${fr}px ${F.pre}`, fill: c, align: "left", shadow: "rgba(0,0,0,.5)" });
  g.fillStyle = c;
  g.fillRect(10, 88, w - 20, 7);
  g.fillStyle = "#FFFFFF";
  g.fillRect(10, 88, 60, 7);
  return cv;
};
/** 인물 소개 — 둥근 색 배지 안 이름 · 직함 */
const personBadge: Draw = (f, c) => {
  const name = f[0] || "", role = f[1] || "";
  const { c: cv, g } = mk(320, 320);
  g.beginPath();
  g.arc(160, 160, 150, 0, Math.PI * 2);
  const gr = g.createRadialGradient(130, 120, 20, 160, 160, 160);
  gr.addColorStop(0, "#FFFFFF");
  gr.addColorStop(0.15, c);
  gr.addColorStop(1, hex(c, 0.9));
  g.fillStyle = gr;
  g.fill();
  g.lineWidth = 10;
  g.strokeStyle = "#FFFFFF";
  g.stroke();
  txt(g, name, 160, 145, { font: `${Math.min(80, 520 / Math.max(2, name.length))}px ${F.head}`, fill: "#FFFFFF", stroke: "#3b2200", lw: 8 });
  txt(g, role, 160, 222, { font: `800 30px ${F.pre}`, fill: "#3b2200" });
  return shadowed(cv, 14, 0.35, 6);
};
/** 서브타이틀 — 번호 + 제목 + 작은 설명 (5가지 모양) */
const subTitle = (v: 1 | 2 | 3 | 4 | 5): Draw => (f, c) => {
  const no = f[0] || "01", a = f[1] || "", b = f[2] || "";
  const fa = 46, fb = 28;
  const wt = Math.max(tw(`800 ${fa}px ${F.pre}`, a), tw(`500 ${fb}px ${F.pre}`, b));
  const numW = v === 4 ? 96 : 110;
  const w = numW + wt + 70;
  const h = 130;
  const { c: cv, g } = mk(w, h);
  if (v === 4 || v === 5) {
    rr(g, 0, 10, w, h - 20, (h - 20) / 2);
    g.fillStyle = v === 4 ? "#FFFFFF" : "rgba(16,18,26,0.9)";
    g.fill();
    if (v === 5) { g.lineWidth = 4; g.strokeStyle = c; g.stroke(); }
  }
  if (v === 3) {
    rr(g, 6, 22, numW - 20, h - 44, 10);
    g.fillStyle = c;
    g.fill();
    g.lineWidth = 3; g.strokeStyle = "#FFFFFF"; g.stroke();
  }
  if (v === 4) { g.beginPath(); g.arc(58, h / 2, 40, 0, Math.PI * 2); g.fillStyle = c; g.fill(); }
  const numFill = v === 3 || v === 4 ? "#FFFFFF" : v === 5 ? c : "#FFFFFF";
  txt(g, no, v === 4 ? 58 : (numW - 14) / 2 + 6, h / 2 + 2, { font: `900 ${v === 4 ? 44 : 54}px ${F.gm}`, fill: numFill });
  const tx = numW + 14, dark = v === 4;
  txt(g, a, tx, h / 2 - 18, { font: `800 ${fa}px ${F.pre}`, fill: dark ? "#111111" : v === 1 ? c : "#FFFFFF", align: "left" });
  txt(g, b, tx, h / 2 + 26, { font: `500 ${fb}px ${F.pre}`, fill: dark ? "#444444" : "#D7DCE6", align: "left" });
  if (v === 1 || v === 2) { g.fillStyle = c; g.fillRect(numW - 4, 26, 4, h - 52); }
  return v === 1 || v === 2 ? pad(cv, 4) : shadowed(cv, 10, 0.35, 4);
};
/** 컬러 박스 — 검은 판 + 색 띠 4줄 + 제목 */
const colorBox: Draw = (f, c) => {
  const s = f[0] || "";
  const fs = 50;
  const w = tw(`900 ${fs}px ${F.head}`, s) + 120;
  const { c: cv, g } = mk(w, 120);
  g.fillStyle = "#111111";
  g.fillRect(0, 0, w, 120);
  ["#FF3B30", "#FFCC00", "#34C759", c].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 14, 0, 10, 120); });
  txt(g, s, 60 + (w - 60) / 2, 62, { font: `${fs}px ${F.head}`, fill: "#FFFFFF" });
  return cv;
};
/** 2단 자막 트랜지션 — 파란 블록들 + 글 */
const blockTrans: Draw = (f, c, t) => {
  const a = f[0] || "", b = f[1] || "";
  const w = Math.max(tw(`900 56px ${F.head}`, a), tw(`600 34px ${F.pre}`, b)) + 220;
  const { c: cv, g } = mk(w, 200);
  const k = ease(t / 0.6);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = hex(c, 0.9 - i * 0.18);
    g.fillRect(0, 20 + i * 42, (120 - i * 18) * k, 32);
  }
  txt(g, a, 160, 80, { font: `56px ${F.head}`, fill: "#FFFFFF", align: "left" });
  txt(g, b, 162, 140, { font: `600 34px ${F.pre}`, fill: c, align: "left" });
  return cv;
};

/* ════════ 2. 제목 ════════ */
const titleUnder: Draw = (f, c) => {
  const en = f[0] || "", s = f[1] || "";
  const fs = 74;
  const w = Math.max(tw(`900 ${fs}px ${F.head}`, s), tw(`600 26px ${F.pre}`, en)) + 60;
  const { c: cv, g } = mk(w, 170);
  txt(g, en.toUpperCase(), w / 2, 26, { font: `600 26px ${F.pre}`, fill: c });
  txt(g, s, w / 2, 92, { font: `${fs}px ${F.head}`, fill: "#FFFFFF", shadow: "rgba(0,0,0,.45)" });
  g.fillStyle = "#FFFFFF";
  g.fillRect(30, 146, w - 60, 4);
  g.fillStyle = c;
  g.fillRect(w / 2 - 50, 142, 100, 12);
  return cv;
};
const titlePill: Draw = (f, c) => {
  const s = f[0] || "", sub = f[1] || "";
  const fs = 58;
  const w = tw(`900 ${fs}px ${F.head}`, s) + 90;
  const { c: cv, g } = mk(Math.max(w, tw(`500 26px ${F.pre}`, sub) + 20), 150);
  rr(g, (cv.width - w) / 2, 0, w, 90, 45);
  g.fillStyle = c;
  g.fill();
  g.lineWidth = 6; g.strokeStyle = "#FFFFFF"; g.stroke();
  txt(g, s, cv.width / 2, 47, { font: `${fs}px ${F.head}`, fill: "#FFFFFF" });
  txt(g, sub, cv.width / 2, 122, { font: `500 26px ${F.pre}`, fill: "#FFFFFF", shadow: "rgba(0,0,0,.5)" });
  return cv;
};
const titleBanner: Draw = (f, c) => {
  const s = f[0] || "";
  const fs = 96;
  const w = tw(`${fs}px ${F.head}`, s) + 200;
  const { c: cv, g } = mk(w, 190);
  g.beginPath();
  g.moveTo(0, 40); g.lineTo(w, 20); g.lineTo(w - 30, 95); g.lineTo(w, 170); g.lineTo(0, 160); g.lineTo(30, 100);
  g.closePath();
  g.fillStyle = "#111111";
  g.fill();
  g.lineWidth = 6; g.strokeStyle = "#FFFFFF"; g.stroke();
  txt(g, s, w / 2, 98, { font: `${fs}px ${F.head}`, fill: c, stroke: "#FFFFFF", lw: 10 });
  return cv;
};
const titleLogo: Draw = (f, c) => {
  const s = f[0] || "", sub = f[1] || "";
  const fs = 86;
  const w = Math.max(tw(`900 ${fs}px ${F.gm}`, s), tw(`500 26px ${F.pre}`, sub)) + 40;
  const { c: cv, g } = mk(w, 160);
  txt(g, s, w / 2, 66, { font: `900 ${fs}px ${F.gm}`, fill: c, stroke: "#FFFFFF", lw: 6 });
  txt(g, sub, w / 2, 134, { font: `500 26px ${F.pre}`, fill: "#FFFFFF", shadow: "rgba(0,0,0,.5)" });
  return cv;
};
const titleKine: Draw = (f, c) => {
  const small = f[0] || "", s = f[1] || "";
  const fs = 104;
  const w = tw(`${fs}px ${F.head}`, s) + 120;
  const { c: cv, g } = mk(w, 160);
  g.save();
  g.translate(40, 80); g.rotate(-Math.PI / 2);
  txt(g, small, 0, 0, { font: `800 26px ${F.pre}`, fill: c });
  g.restore();
  txt(g, s, 80 + (w - 80) / 2, 84, { font: `${fs}px ${F.head}`, fill: c, stroke: "#111111", lw: 8 });
  return cv;
};
const titleTwoColor: Draw = (f, c) => {
  const a = f[0] || "", b = f[1] || "";
  const fs = 80;
  const wa = tw(`${fs}px ${F.head}`, a), wb = tw(`${fs}px ${F.head}`, b);
  const { c: cv, g } = mk(wa + wb + 60, 130);
  txt(g, a, 20, 66, { font: `${fs}px ${F.head}`, fill: c, align: "left", stroke: "#111", lw: 8 });
  txt(g, b, 40 + wa, 66, { font: `${fs}px ${F.head}`, fill: "#FFFFFF", align: "left", stroke: "#111", lw: 8 });
  return cv;
};
const warpText: Draw = (f, c) => {
  const s = f[0] || "";
  const fs = 70;
  const w = tw(`${fs}px ${F.head}`, s) + 200;
  const { c: cv, g } = mk(w, 140);
  for (let i = 0; i < 7; i++) { g.fillStyle = hex(c, 0.25 + i * 0.08); g.fillRect(10 + i * 6, 30 + i * 12, 70 - i * 8, 4); g.fillRect(w - 80 + i * 4, 30 + i * 12, 70 - i * 8, 4); }
  txt(g, s, w / 2, 72, { font: `${fs}px ${F.head}`, fill: "#FFFFFF", glow: c, blur: 22 });
  return cv;
};
const slantStrip: Draw = (f, c) => {
  const s = f[0] || "";
  const fs = 62;
  const w = tw(`${fs}px ${F.head}`, s) + 140;
  const { c: cv, g } = mk(w + 60, 130);
  g.beginPath();
  g.moveTo(40, 10); g.lineTo(w + 60, 10); g.lineTo(w + 20, 120); g.lineTo(0, 120); g.closePath();
  g.fillStyle = c;
  g.fill();
  g.beginPath();
  g.moveTo(w + 10, 10); g.lineTo(w + 60, 10); g.lineTo(w + 20, 120); g.lineTo(w - 30, 120); g.closePath();
  g.fillStyle = "#111111";
  g.fill();
  txt(g, s, (w + 10) / 2, 66, { font: `${fs}px ${F.head}`, fill: ink(c) });
  return cv;
};
const paintStroke: Draw = (f, c) => {
  const ls = [f[0] || "", f[1] || ""].filter(Boolean);
  const fs = 54;
  const w = Math.max(...ls.map((l) => tw(`${fs}px ${F.round}`, l))) + 120;
  const h = ls.length * 86 + 30;
  const { c: cv, g } = mk(w, h);
  ls.forEach((l, i) => {
    const y = 20 + i * 86;
    const lw = tw(`${fs}px ${F.round}`, l) + 70;
    g.fillStyle = i ? "#FFFFFF" : c;
    g.beginPath();
    g.moveTo(20, y + 8);
    for (let x = 20; x <= 20 + lw; x += 14) g.lineTo(x, y + 4 + Math.sin(x * 0.3) * 5);
    for (let x = 20 + lw; x >= 20; x -= 14) g.lineTo(x, y + 72 + Math.cos(x * 0.27) * 5);
    g.closePath();
    g.fill();
    txt(g, l, 20 + lw / 2, y + 40, { font: `${fs}px ${F.round}`, fill: i ? "#111111" : ink(c) });
  });
  return cv;
};
const scroll = (stampOn: boolean): Draw => (f, c) => {
  const a = f[0] || "", b = f[1] || "";
  const fs = 56;
  const tx = Math.max(tw(`800 ${fs}px ${F.mj}`, a), tw(`800 ${fs}px ${F.mj}`, b));
  const w = tx + 220 + (stampOn ? 130 : 0); // 도장은 글 오른쪽 빈 자리에
  const h = 210;
  const { c: cv, g } = mk(w, h);
  g.fillStyle = "#F4E6C4";
  g.fillRect(40, 20, w - 80, h - 40);
  g.strokeStyle = "#8A5A2B";
  g.lineWidth = 4;
  g.strokeRect(54, 34, w - 108, h - 68);
  ["#6B3E1C", "#6B3E1C"].forEach((col, i) => { const x = i ? w - 40 : 0; g.fillStyle = col; rr(g, x, 6, 40, h - 12, 14); g.fill(); g.fillStyle = "#C59B5A"; g.fillRect(x + 6, 0, 28, 14); g.fillRect(x + 6, h - 14, 28, 14); });
  const cx = stampOn ? 110 + tx / 2 : w / 2;
  txt(g, a, cx, 82, { font: `800 ${fs}px ${F.mj}`, fill: "#2B1A0A" });
  txt(g, b, cx, 148, { font: `800 ${fs}px ${F.mj}`, fill: "#2B1A0A" });
  if (stampOn) {
    g.save();
    g.translate(w - 125, h / 2); g.rotate(-0.15);
    g.strokeStyle = c; g.lineWidth = 6; g.strokeRect(-36, -36, 72, 72);
    txt(g, f[2] || "확인", 0, 2, { font: `900 30px ${F.mj}`, fill: c });
    g.restore();
  }
  return cv;
};

/* ════════ 3. 말풍선·메모·정리 카드 ════════ */
const listOf = (s: string, n: number) => lines(s).slice(0, n);
const tipBubble: Draw = (f, c) => {
  const head = f[0] || "TIP", body = listOf(f[1] || "", 5);
  const fs = 40;
  const w = Math.max(...body.map((l) => tw(`600 ${fs}px ${F.pre}`, l)), 260) + 110;
  const h = 90 + body.length * fs * 1.45 + 60;
  const { c: cv, g } = mk(w + 20, h + 50);
  g.beginPath();
  g.ellipse(w / 2 + 10, h / 2 + 10, w / 2, h / 2, 0, 0, Math.PI * 2);
  g.fillStyle = "#FFFFFF";
  g.fill();
  g.beginPath(); g.moveTo(w * 0.62, h - 4); g.lineTo(w * 0.78, h + 44); g.lineTo(w * 0.72, h - 20); g.closePath(); g.fill();
  g.lineWidth = 6; g.strokeStyle = "#111111";
  g.beginPath(); g.ellipse(w / 2 + 10, h / 2 + 10, w / 2, h / 2, 0, 0, Math.PI * 2); g.stroke();
  const hw = tw(`900 30px ${F.gm}`, head) + 30;
  rr(g, w * 0.18, 40, hw, 44, 22); g.fillStyle = c; g.fill();
  txt(g, head, w * 0.18 + hw / 2, 63, { font: `900 30px ${F.gm}`, fill: ink(c) });
  body.forEach((l, i) => txt(g, l, w / 2 + 10, 116 + i * fs * 1.45, { font: `600 ${fs}px ${F.pre}`, fill: "#111111" }));
  return shadowed(cv, 12, 0.35, 5);
};
const explainBubble = (dark: boolean): Draw => (f, c) => {
  const head = f[0] || "", body = listOf(f[1] || "", 5);
  const fs = 38;
  const w = Math.max(...body.map((l) => tw(`600 ${fs}px ${F.pre}`, l)), tw(`800 40px ${F.pre}`, head), 280) + 90;
  const h = 100 + body.length * fs * 1.5 + 30;
  const { c: cv, g } = mk(w + 40, h + 10);
  rr(g, 0, 0, w, h, 26);
  g.fillStyle = dark ? "rgba(14,20,36,0.92)" : c;
  g.fill();
  if (!dark) { g.beginPath(); g.moveTo(w - 10, h * 0.45); g.lineTo(w + 36, h * 0.55); g.lineTo(w - 10, h * 0.65); g.closePath(); g.fill(); }
  if (dark) {
    g.strokeStyle = c; g.lineWidth = 6;
    [[14, 14, 1, 1], [w - 14, 14, -1, 1], [14, h - 14, 1, -1], [w - 14, h - 14, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x, y + sy * 40); g.lineTo(x, y); g.lineTo(x + sx * 40, y); g.stroke(); });
  }
  const fg = dark ? "#FFFFFF" : ink(c);
  txt(g, head, w / 2, 52, { font: `800 40px ${F.pre}`, fill: dark ? c : fg });
  g.fillStyle = hex(fg, 0.4); g.fillRect(40, 84, w - 80, 3);
  body.forEach((l, i) => txt(g, l, w / 2, 120 + i * fs * 1.5, { font: `600 ${fs}px ${F.pre}`, fill: fg }));
  return shadowed(cv, 12, 0.35, 5);
};
const memoPad: Draw = (f, c) => {
  const head = f[0] || "", body = listOf(f[1] || "", 4);
  const fs = 40;
  const w = Math.max(...body.map((l) => tw(`${fs}px ${F.pen}`, l) * 1.0), tw(`800 40px ${F.round}`, head), 280) + 100;
  const h = 110 + body.length * 62 + 40;
  const { c: cv, g } = mk(w + 20, h + 20);
  g.save(); g.translate(10, 14); g.rotate(-0.02);
  g.fillStyle = c; g.fillRect(0, 0, w, h);
  g.strokeStyle = hex("#7a5a00", 0.35); g.lineWidth = 2;
  for (let i = 0; i < body.length; i++) { g.beginPath(); g.moveTo(30, 136 + i * 62); g.lineTo(w - 30, 136 + i * 62); g.stroke(); }
  txt(g, head, w / 2, 58, { font: `40px ${F.round}`, fill: "#3b2a00" });
  body.forEach((l, i) => txt(g, l, 40, 112 + i * 62, { font: `${fs + 8}px ${F.pen}`, fill: "#2a2000", align: "left" }));
  g.fillStyle = "rgba(255,255,255,0.55)"; g.save(); g.translate(w / 2, -6); g.rotate(0.05); g.fillRect(-70, -12, 140, 34); g.restore();
  g.restore();
  return shadowed(cv, 12, 0.4, 7);
};
const summaryPanel: Draw = (f, c) => {
  const head = f[0] || "", body = listOf(f[1] || "", 8);
  const fs = 36;
  const w = Math.max(...body.map((l) => tw(`600 ${fs}px ${F.pre}`, l)), tw(`800 40px ${F.pre}`, head), 360) + 120;
  const h = 110 + body.length * fs * 1.55 + 30;
  const { c: cv, g } = mk(w, h);
  g.fillStyle = "rgba(10,30,60,0.92)"; g.fillRect(0, 0, w, h);
  g.strokeStyle = c; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
  txt(g, `[ ${head} ]`, 40, 56, { font: `800 40px ${F.pre}`, fill: c, align: "left" });
  body.forEach((l, i) => txt(g, `${i + 1}. ${l}`, 46, 116 + i * fs * 1.55, { font: `600 ${fs}px ${F.pre}`, fill: "#FFFFFF", align: "left" }));
  return cv;
};

/* ════════ 4. 브이로그 감성 자막 (13) ════════ */
const VLOG: { font: string; deco: "none" | "quote" | "dash" | "heart" | "brush" | "side" | "en" | "under" | "dot" }[] = [
  { font: F.night, deco: "none" }, { font: F.pen, deco: "quote" }, { font: F.ys, deco: "dash" }, { font: F.gd, deco: "heart" },
  { font: F.mj, deco: "side" }, { font: F.night, deco: "en" }, { font: F.pen, deco: "under" }, { font: F.tvn, deco: "dot" },
  { font: F.gd, deco: "quote" }, { font: F.tvn, deco: "heart" }, { font: F.night, deco: "dash" }, { font: F.mj, deco: "en" }, { font: F.pen, deco: "brush" },
];
const vlog = (k: number): Draw => (f, c) => {
  const v = VLOG[k];
  const s = f[0] || "", en = f[1] || "";
  const fs = v.font === F.pen || v.font === F.tvn ? 66 : 54;
  const w = Math.max(tw(`${fs}px ${v.font}`, s), 200) + 140;
  const h = v.deco === "en" ? 160 : 130;
  const { c: cv, g } = mk(w, h);
  if (v.deco === "brush") {
    g.fillStyle = "rgba(60,60,60,0.75)";
    g.beginPath();
    for (let x = 0; x <= w; x += 10) g.lineTo(x, 26 + Math.sin(x * 0.2) * 6);
    for (let x = w; x >= 0; x -= 10) g.lineTo(x, h - 26 + Math.cos(x * 0.17) * 6);
    g.closePath(); g.fill();
  }
  const cy = v.deco === "en" ? 60 : h / 2;
  txt(g, s, w / 2, cy, { font: `${fs}px ${v.font}`, fill: "#FFFFFF", glow: "rgba(0,0,0,0.55)", blur: 10 });
  const sw = tw(`${fs}px ${v.font}`, s);
  g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 3;
  if (v.deco === "quote") { txt(g, "“", w / 2 - sw / 2 - 34, cy - 20, { font: `60px ${F.mj}`, fill: c }); txt(g, "”", w / 2 + sw / 2 + 34, cy + 10, { font: `60px ${F.mj}`, fill: c }); }
  if (v.deco === "dash") { g.beginPath(); g.moveTo(10, cy); g.lineTo(w / 2 - sw / 2 - 20, cy); g.moveTo(w / 2 + sw / 2 + 20, cy); g.lineTo(w - 10, cy); g.stroke(); }
  if (v.deco === "heart") txt(g, "♡", w / 2 + sw / 2 + 36, cy - 4, { font: `40px ${F.pre}`, fill: c });
  if (v.deco === "side") { g.fillRect(w / 2 - sw / 2 - 40, cy - 28, 4, 56); g.fillRect(w / 2 + sw / 2 + 36, cy - 28, 4, 56); }
  if (v.deco === "en") txt(g, en, w / 2, 128, { font: `italic 500 28px ${F.mj}`, fill: c });
  if (v.deco === "under") { g.beginPath(); for (let x = w / 2 - sw / 2; x <= w / 2 + sw / 2; x += 8) g.lineTo(x, cy + fs * 0.6 + Math.sin(x * 0.2) * 4); g.stroke(); }
  if (v.deco === "dot") [0, 1, 2].forEach((i) => { g.beginPath(); g.arc(w / 2 - 20 + i * 20, cy - fs * 0.75, 4, 0, Math.PI * 2); g.fill(); });
  return cv;
};

/* ════════ 5. 예능 글자 (네모·꽃잎·원·지그재그 — 글자마다 칸) ════════ */
const tiles = (shape: "square" | "flower" | "circle" | "zigzag", colors: string[]): Draw => (f) => {
  const chars = [...(f[0] || "").replace(/\s+/g, "")].slice(0, 6);
  const S = 140, gap = 16;
  const { c: cv, g } = mk(chars.length * (S + gap) + 30, S + 70);
  chars.forEach((ch, i) => {
    const x = 15 + i * (S + gap) + S / 2, y = 35 + S / 2 + (shape === "zigzag" ? (i % 2 ? 18 : -18) : 0);
    const col = colors[i % colors.length];
    g.save(); g.translate(x, y); g.rotate(shape === "zigzag" ? (i % 2 ? 0.08 : -0.08) : 0);
    g.beginPath();
    if (shape === "circle") g.arc(0, 0, S / 2, 0, Math.PI * 2);
    else if (shape === "flower") { for (let p = 0; p < 6; p++) { const a = (Math.PI * 2 * p) / 6; g.moveTo(Math.cos(a) * S * 0.26 + S * 0.26, Math.sin(a) * S * 0.26); g.arc(Math.cos(a) * S * 0.26, Math.sin(a) * S * 0.26, S * 0.26, 0, Math.PI * 2); } }
    else rr(g, -S / 2, -S / 2, S, S, 16);
    g.fillStyle = col; g.fill();
    g.lineWidth = 8; g.strokeStyle = "#111111"; g.stroke();
    if (shape === "flower") { g.beginPath(); g.arc(0, 0, S * 0.3, 0, Math.PI * 2); g.fillStyle = "#FFFFFF"; g.fill(); }
    txt(g, ch, 0, 4, { font: `${shape === "flower" ? 64 : 84}px ${F.head}`, fill: shape === "flower" ? "#111111" : ink(col), stroke: shape === "flower" ? undefined : "#111111", lw: shape === "flower" ? 0 : 6 });
    g.restore();
  });
  return cv;
};

/* ════════ 6. 예능 반응 자막 ════════ */
const outlineBig = (font: string, fill: string, stroke: string, tagBg?: string): Draw => (f, c) => {
  const tag = f[1] || "", ls = lines(f[0] || "").slice(0, 2);
  const fs = 86;
  const w = Math.max(...ls.map((l) => tw(`${fs}px ${font}`, l))) + 80;
  const h = ls.length * fs * 1.15 + (tag ? 70 : 30);
  const { c: cv, g } = mk(w, h);
  const y0 = tag ? 60 : 15;
  if (tag) { const tW = tw(`800 30px ${F.pre}`, tag) + 30; rr(g, 30, 4, tW, 46, 10); g.fillStyle = tagBg === "accent" ? c : tagBg || "#FFD400"; g.fill(); txt(g, tag, 30 + tW / 2, 28, { font: `800 30px ${F.pre}`, fill: "#111111" }); }
  ls.forEach((l, i) => txt(g, l, w / 2, y0 + fs * 0.6 + i * fs * 1.15, { font: `${fs}px ${font}`, fill: fill === "accent" ? c : fill, stroke, lw: 14 }));
  return cv;
};
const burstText = (fill: string, text: string, stroke: string): Draw => (f, c) => {
  const ls = lines(f[0] || "").slice(0, 2);
  const fs = 64;
  const w = Math.max(...ls.map((l) => tw(`${fs}px ${F.head}`, l))) + 220;
  const h = ls.length * fs * 1.2 + 180;
  const { c: cv, g } = mk(w, h);
  burstPath(g, w / 2, h / 2, w / 2 - 6, h / 2 - 6, 18, 0.74);
  g.fillStyle = fill === "accent" ? c : fill; g.fill();
  g.lineWidth = 8; g.strokeStyle = stroke; g.stroke();
  ls.forEach((l, i) => txt(g, l, w / 2, h / 2 - ((ls.length - 1) * fs * 1.2) / 2 + i * fs * 1.2, { font: `${fs}px ${F.head}`, fill: text, stroke, lw: 10 }));
  return cv;
};
const stampBox = (bg: string, rot: number): Draw => (f, c) => {
  const s = f[0] || "";
  const fs = 90;
  const w = tw(`${fs}px ${F.head}`, s) + 90;
  const { c: cv, g } = mk(w + 80, 240);
  g.save(); g.translate(cv.width / 2, 120); g.rotate(rot);
  rr(g, -w / 2, -66, w, 132, 14); g.fillStyle = bg === "accent" ? c : bg; g.fill();
  g.lineWidth = 10; g.strokeStyle = "#FFFFFF"; g.stroke();
  g.lineWidth = 4; g.strokeStyle = hex("#000000", 0.6); rr(g, -w / 2 + 14, -52, w - 28, 104, 8); g.stroke();
  txt(g, s, 0, 4, { font: `${fs}px ${F.head}`, fill: "#FFFFFF", stroke: "#111111", lw: 8 });
  g.restore();
  return cv;
};
const bloodText: Draw = (f, c) => {
  const s = f[0] || "";
  const fs = 76;
  const w = tw(`${fs}px ${F.head}`, s) + 80;
  const { c: cv, g } = mk(w, 190);
  txt(g, s, w / 2, 70, { font: `${fs}px ${F.head}`, fill: c, stroke: "#2a0000", lw: 8 });
  g.fillStyle = c;
  for (let i = 0; i < 9; i++) { const x = 50 + ((w - 100) * i) / 8, hh = 30 + ((i * 37) % 60); g.fillRect(x, 96, 8, hh); g.beginPath(); g.arc(x + 4, 96 + hh, 9, 0, Math.PI * 2); g.fill(); }
  return cv;
};
const glowText = (font: string, rows: number): Draw => (f, c) => {
  const ls = lines(f[0] || "").slice(0, rows);
  const fs = 74;
  const w = Math.max(...ls.map((l) => tw(`${fs}px ${font}`, l))) + 120;
  const h = ls.length * fs * 1.25 + 60;
  const { c: cv, g } = mk(w, h);
  ls.forEach((l, i) => txt(g, l, w / 2, 30 + fs * 0.62 + i * fs * 1.25, { font: `${fs}px ${font}`, fill: "#FFFFFF", glow: c, blur: 30 }));
  return cv;
};
const sirenText: Draw = (f, c) => {
  const s = f[0] || "";
  const fs = 62;
  const w = tw(`${fs}px ${F.head}`, s) + 220;
  const { c: cv, g } = mk(w, 130);
  txt(g, "🚨", 60, 66, { font: `70px ${F.emoji}`, fill: "#FF0000" });
  txt(g, "🚨", w - 60, 66, { font: `70px ${F.emoji}`, fill: "#FF0000" });
  txt(g, s, w / 2, 68, { font: `${fs}px ${F.head}`, fill: c, stroke: "#111111", lw: 10 });
  return cv;
};
const speechPop: Draw = (f, c) => {
  const ls = lines(f[0] || "").slice(0, 3);
  const fs = 50;
  const R = Math.max(150, Math.max(...ls.map((l) => tw(`${fs}px ${F.head}`, l))) / 2 + 60);
  const { c: cv, g } = mk(R * 2 + 40, R * 2 + 60);
  g.beginPath(); g.arc(R + 20, R + 20, R, 0, Math.PI * 2);
  g.fillStyle = "#FFFFFF"; g.fill(); g.lineWidth = 10; g.strokeStyle = c; g.stroke();
  g.beginPath(); g.moveTo(R * 1.3, R * 1.8 + 20); g.lineTo(R * 1.6, R * 2 + 50); g.lineTo(R * 1.6, R * 1.6 + 20); g.closePath(); g.fillStyle = c; g.fill();
  ls.forEach((l, i) => txt(g, l, R + 20, R + 20 - ((ls.length - 1) * fs * 1.2) / 2 + i * fs * 1.2, { font: `${fs}px ${F.head}`, fill: c }));
  return cv;
};

/* ════════ 7. 검색창 (로고 없이 모양만) ════════ */
const searchBar = (border: string, btn: string, round: boolean): Draw => (f) => {
  const s = f[0] || "";
  const fs = 44;
  const w = Math.max(tw(`600 ${fs}px ${F.pre}`, s) + 260, 640);
  const h = 110;
  const { c: cv, g } = mk(w + 10, h + 10);
  rr(g, 5, 5, w, h, round ? h / 2 : 10);
  g.fillStyle = "#FFFFFF"; g.fill();
  g.lineWidth = 6; g.strokeStyle = border; g.stroke();
  txt(g, s, 50, 5 + h / 2, { font: `600 ${fs}px ${F.pre}`, fill: "#111111", align: "left" });
  if (btn) { rr(g, w - 120, 15, 110, h - 20, round ? (h - 20) / 2 : 8); g.fillStyle = btn; g.fill(); }
  const ix = btn ? w - 65 : w - 60, iy = 5 + h / 2, col = btn ? "#FFFFFF" : border;
  g.strokeStyle = col; g.lineWidth = 7;
  g.beginPath(); g.arc(ix - 6, iy - 6, 18, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(ix + 7, iy + 7); g.lineTo(ix + 22, iy + 22); g.stroke();
  // 글자 쓰는 막대
  g.fillStyle = "#111111"; g.fillRect(56 + tw(`600 ${fs}px ${F.pre}`, s), 5 + h / 2 - 26, 4, 52);
  return shadowed(cv, 14, 0.3, 5);
};

/* ════════ 8. 화면 · 끝 화면 · 지폐(일반) ════════ */
const vsScreen: Draw = (f) => {
  const a = f[0] || "", b = f[1] || "";
  const W = 1200, H = 420;
  const { c: cv, g } = mk(W, H);
  g.fillStyle = "#E11D48"; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.56, 0); g.lineTo(W * 0.44, H); g.lineTo(0, H); g.closePath(); g.fill();
  g.fillStyle = "#1D4ED8"; g.beginPath(); g.moveTo(W * 0.56, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W * 0.44, H); g.closePath(); g.fill();
  txt(g, a, W * 0.24, H / 2, { font: `76px ${F.head}`, fill: "#FFFFFF", stroke: "#111", lw: 8 });
  txt(g, b, W * 0.76, H / 2, { font: `76px ${F.head}`, fill: "#FFFFFF", stroke: "#111", lw: 8 });
  g.beginPath(); g.arc(W / 2, H / 2, 92, 0, Math.PI * 2); g.fillStyle = "#FFD400"; g.fill(); g.lineWidth = 10; g.strokeStyle = "#111"; g.stroke();
  txt(g, "VS", W / 2, H / 2 + 4, { font: `92px ${F.head}`, fill: "#111111" });
  return cv;
};
const outro: Draw = (f, c) => {
  const name = f[0] || "", a = f[1] || "", b = f[2] || "";
  const W = 1280, H = 720;
  const { c: cv, g } = mk(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c); gr.addColorStop(1, "#FF9500");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.beginPath(); g.arc(200, 190, 120, 0, Math.PI * 2); g.fillStyle = "#1A3A6B"; g.fill(); g.lineWidth = 10; g.strokeStyle = "#FFFFFF"; g.stroke();
  txt(g, name, 200, 192, { font: `44px ${F.head}`, fill: "#FFFFFF" });
  [["구독", "#E11D48"], ["좋아요", "#2563EB"], ["알림", "#16A34A"]].forEach(([t2, col], i) => { const x = 420 + i * 260; rr(g, x, 140, 230, 100, 50); g.fillStyle = col; g.fill(); txt(g, t2, x + 115, 192, { font: `52px ${F.head}`, fill: "#FFFFFF" }); });
  [[a, 300], [b, 900]].forEach(([s, x]) => { rr(g, (x as number) - 260, 340, 520, 300, 18); g.fillStyle = "rgba(0,0,0,0.35)"; g.fill(); txt(g, s as string, x as number, 490, { font: `40px ${F.head}`, fill: "#FFFFFF" }); });
  return cv;
};
const bill = (amount: string, color: string): Draw => (f) => {
  const s = f[0] || amount;
  const { c: cv, g } = mk(600, 290);
  rr(g, 10, 10, 580, 270, 18); g.fillStyle = color; g.fill();
  g.lineWidth = 8; g.strokeStyle = hex("#000000", 0.25); rr(g, 30, 30, 540, 230, 10); g.stroke();
  g.beginPath(); g.ellipse(160, 145, 80, 90, 0, 0, Math.PI * 2); g.fillStyle = hex("#FFFFFF", 0.35); g.fill();
  txt(g, "₩", 160, 150, { font: `110px ${F.gm}`, fill: hex("#000000", 0.45) });
  txt(g, s, 400, 145, { font: `900 70px ${F.gm}`, fill: "#FFFFFF", stroke: hex("#000000", 0.45), lw: 8 });
  return shadowed(cv, 12, 0.35, 6);
};

/* ════════ 9. 가리키기 스티커 (화살표 20 · 위치 · 지시선 · 깃발 · 클릭) ════════ */
type ArrowKind = "straight" | "curveUp" | "curveDown" | "circle" | "circleDash" | "double" | "bent" | "cross" | "up" | "dashed";
const ARROWS: { k: ArrowKind; dash?: boolean; label?: "top" | "side" | "center" }[] = [
  { k: "straight", label: "top" }, { k: "curveUp", label: "side" }, { k: "double", label: "top" }, { k: "double", dash: true, label: "top" }, { k: "curveDown", label: "top" },
  { k: "double", label: "top" }, { k: "up", label: "side" }, { k: "up", dash: true, label: "side" }, { k: "curveUp", label: "side" }, { k: "curveUp", dash: true, label: "side" },
  { k: "circle", label: "center" }, { k: "circleDash", label: "center" }, { k: "circle", label: "side" }, { k: "circleDash", label: "side" }, { k: "circle", label: "center" },
  { k: "circleDash", label: "center" }, { k: "circle", label: "center" }, { k: "circleDash", label: "center" }, { k: "bent", label: "top" }, { k: "cross", label: "side" },
];
const arrowDraw = (i: number): Draw => (f, c) => {
  const a = ARROWS[i];
  const s = f[0] || "";
  const { c: cv, g } = mk(560, 400);
  g.strokeStyle = c; g.lineWidth = 12; g.fillStyle = c;
  if (a.dash) g.setLineDash([22, 16]);
  const head = (x: number, y: number, ang: number) => { g.setLineDash([]); arrowHead(g, x, y, ang, 44, c); if (a.dash) g.setLineDash([22, 16]); };
  if (a.k === "straight" || a.k === "dashed") { g.beginPath(); g.moveTo(60, 230); g.lineTo(460, 230); g.stroke(); head(510, 230, 0); }
  if (a.k === "double") { g.beginPath(); g.moveTo(80, 230); g.lineTo(480, 230); g.stroke(); head(520, 230, 0); head(40, 230, Math.PI); }
  if (a.k === "curveUp") { g.beginPath(); g.moveTo(140, 360); g.quadraticCurveTo(120, 160, 300, 90); g.stroke(); head(340, 76, -0.35); }
  if (a.k === "curveDown") { g.beginPath(); g.moveTo(60, 160); g.quadraticCurveTo(280, 40, 470, 220); g.stroke(); head(500, 250, 0.85); }
  if (a.k === "up") { g.beginPath(); g.moveTo(280, 370); g.lineTo(280, 110); g.stroke(); head(280, 60, -Math.PI / 2); }
  if (a.k === "bent") { g.beginPath(); g.moveTo(140, 80); g.lineTo(140, 300); g.lineTo(420, 300); g.stroke(); head(470, 300, 0); }
  if (a.k === "cross") { g.beginPath(); g.moveTo(280, 90); g.lineTo(280, 330); g.moveTo(140, 210); g.lineTo(420, 210); g.stroke(); head(280, 50, -Math.PI / 2); head(280, 370, Math.PI / 2); head(100, 210, Math.PI); head(460, 210, 0); }
  if (a.k === "circle" || a.k === "circleDash") {
    if (a.k === "circleDash") g.setLineDash([24, 18]);
    g.beginPath(); g.arc(280, 210, 140, -Math.PI * 0.35, Math.PI * 1.45); g.stroke();
    g.setLineDash([]);
    arrowHead(g, 280 + Math.cos(-Math.PI * 0.35) * 140, 210 + Math.sin(-Math.PI * 0.35) * 140, -Math.PI * 0.35 + Math.PI / 2, 44, c);
  }
  g.setLineDash([]);
  const pos = a.label === "center" ? [280, 214] : a.label === "side" ? [430, 230] : [280, 150];
  if (s) txt(g, s, pos[0], pos[1], { font: `${a.label === "center" ? 52 : 46}px ${F.head}`, fill: "#FFFFFF", stroke: "#111111", lw: 10 });
  return cv;
};
const markerDown = (v: 1 | 2 | 3): Draw => (f, c) => {
  const s = f[0] || "";
  const { c: cv, g } = mk(Math.max(300, tw(`48px ${F.head}`, s) + 60), 380);
  const cx = cv.width / 2;
  txt(g, s, cx, 40, { font: `48px ${F.head}`, fill: "#FFFFFF", stroke: "#111111", lw: 10 });
  if (v === 1) { const gr = g.createLinearGradient(0, 90, 0, 300); gr.addColorStop(0, "#FFE14D"); gr.addColorStop(1, c); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 34, 90); g.lineTo(cx + 34, 90); g.lineTo(cx + 34, 220); g.lineTo(cx + 70, 220); g.lineTo(cx, 310); g.lineTo(cx - 70, 220); g.lineTo(cx - 34, 220); g.closePath(); g.fill(); g.lineWidth = 6; g.strokeStyle = "#111"; g.stroke(); }
  if (v === 2) [0, 1, 2].forEach((i) => { g.beginPath(); g.moveTo(cx - 54, 100 + i * 70); g.lineTo(cx, 150 + i * 70); g.lineTo(cx + 54, 100 + i * 70); g.lineWidth = 22; g.strokeStyle = c; g.stroke(); });
  if (v === 3) { g.beginPath(); g.moveTo(cx - 80, 110); g.lineTo(cx + 80, 110); g.lineTo(cx, 260); g.closePath(); g.fillStyle = c; g.fill(); g.lineWidth = 8; g.strokeStyle = "#FFFFFF"; g.stroke(); }
  g.beginPath(); g.ellipse(cx, 345, 60, 14, 0, 0, Math.PI * 2); g.fillStyle = "rgba(0,0,0,0.35)"; g.fill();
  return cv;
};
const dart = (fromLeft: boolean): Draw => (f, c) => {
  const s = f[0] || "";
  const { c: cv, g } = mk(560, 220);
  g.save(); if (!fromLeft) { g.translate(560, 0); g.scale(-1, 1); }
  g.strokeStyle = "#8B5A2B"; g.lineWidth = 12; g.beginPath(); g.moveTo(40, 110); g.lineTo(420, 110); g.stroke();
  arrowHead(g, 480, 110, 0, 70, c);
  g.fillStyle = c; [0, 1].forEach((i) => { g.beginPath(); g.moveTo(40 + i * 40, 110); g.lineTo(10 + i * 40, 60); g.lineTo(70 + i * 40, 110); g.lineTo(10 + i * 40, 160); g.closePath(); g.fill(); });
  g.restore();
  if (s) txt(g, s, 280, 50, { font: `44px ${F.head}`, fill: "#FFFFFF", stroke: "#111", lw: 9 });
  return cv;
};
const leaderLine: Draw = (f, c) => {
  const s = f[0] || "", sub = f[1] || "";
  const w2 = Math.max(tw(`800 40px ${F.pre}`, s), tw(`500 26px ${F.pre}`, sub)) + 40;
  const { c: cv, g } = mk(260 + w2, 300);
  g.beginPath(); g.arc(40, 250, 18, 0, Math.PI * 2); g.fillStyle = c; g.fill();
  g.beginPath(); g.arc(40, 250, 34, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = c; g.stroke();
  g.beginPath(); g.moveTo(40, 250); g.lineTo(200, 90); g.lineTo(240 + w2, 90); g.lineWidth = 5; g.strokeStyle = "#FFFFFF"; g.stroke();
  txt(g, s, 230, 58, { font: `800 40px ${F.pre}`, fill: "#FFFFFF", align: "left", shadow: "rgba(0,0,0,.5)" });
  txt(g, sub, 230, 122, { font: `500 26px ${F.pre}`, fill: c, align: "left", shadow: "rgba(0,0,0,.5)" });
  return cv;
};
const flag: Draw = (f, c) => {
  const s = f[0] || "";
  const w = Math.max(320, tw(`44px ${F.head}`, s) + 80);
  const { c: cv, g } = mk(w, 380);
  txt(g, s, w / 2, 40, { font: `44px ${F.head}`, fill: "#FFFFFF", stroke: "#111", lw: 9 });
  const x = w / 2 - 60;
  g.fillStyle = "#EEEEEE"; g.fillRect(x, 90, 10, 260);
  g.beginPath(); g.moveTo(x + 10, 96); g.quadraticCurveTo(x + 80, 70, x + 150, 110); g.lineTo(x + 150, 200); g.quadraticCurveTo(x + 80, 160, x + 10, 186); g.closePath(); g.fillStyle = c; g.fill();
  g.beginPath(); g.ellipse(x + 5, 352, 50, 12, 0, 0, Math.PI * 2); g.fillStyle = "rgba(0,0,0,0.35)"; g.fill();
  return cv;
};
const cursorClick: Draw = (f, c, t) => {
  const { c: cv, g } = mk(300, 300);
  const k = (t % 1.2) / 1.2;
  [0, 0.33].forEach((d) => { const r = 30 + ((k + d) % 1) * 110; g.beginPath(); g.arc(120, 120, r, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = hex(c, 1 - ((k + d) % 1)); g.stroke(); });
  g.save(); g.translate(120, 120);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 110); g.lineTo(28, 84); g.lineTo(48, 130); g.lineTo(66, 122); g.lineTo(46, 78); g.lineTo(84, 78); g.closePath();
  g.fillStyle = "#FFFFFF"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#111111"; g.stroke();
  g.restore();
  return cv;
};

/* ════════ 10. 반응 스티커 (별·뿅망치·ㅋㅋㅋ·사이렌·도형) ════════ */
const starsDraw = (big: boolean): Draw => (f, c, t) => {
  const { c: cv, g } = mk(420, 260);
  const pts: [number, number, number][] = [[80, 140, 50], [210, 80, 70], [340, 150, 54], [150, 210, 30], [290, 220, 26]];
  pts.forEach(([x, y, r], i) => { const tw2 = 0.75 + 0.25 * Math.sin(t * 6 + i); star(g, x, y, r * (big ? 1.15 : 0.9) * tw2, i % 2 ? "#FFFFFF" : c); });
  if (f[0]) txt(g, f[0], 210, 150, { font: `60px ${F.head}`, fill: c, stroke: "#111", lw: 10 });
  return cv;
};
const hammer: Draw = (f, c) => {
  const { c: cv, g } = mk(380, 360);
  g.save(); g.translate(190, 200); g.rotate(-0.6);
  g.fillStyle = "#F5D27A"; g.fillRect(-10, 0, 22, 170);
  rr(g, -90, -70, 180, 90, 30); g.fillStyle = c; g.fill(); g.lineWidth = 8; g.strokeStyle = "#111"; g.stroke();
  g.fillStyle = "#FFFFFF"; rr(g, -80, -62, 30, 74, 14); g.fill(); rr(g, 50, -62, 30, 74, 14); g.fill();
  g.restore();
  txt(g, f[0] || "뿅!", 300, 70, { font: `64px ${F.head}`, fill: "#FFD400", stroke: "#111", lw: 10 });
  return cv;
};
const kkk = (scatter: boolean): Draw => (f, c) => {
  const s = f[0] || "ㅋ";
  const { c: cv, g } = mk(scatter ? 900 : 420, scatter ? 300 : 340);
  const n = scatter ? 12 : 6;
  for (let i = 0; i < n; i++) {
    const x = scatter ? 50 + i * 72 : 210 + Math.cos((i / n) * Math.PI * 2) * 120, y = scatter ? 150 + Math.sin(i * 1.3) * 70 : 170 + Math.sin((i / n) * Math.PI * 2) * 110;
    g.save(); g.translate(x, y); g.rotate(Math.sin(i * 2.1) * 0.5);
    txt(g, s, 0, 0, { font: `${scatter ? 74 : 84}px ${F.head}`, fill: i % 3 === 0 ? c : "#FFFFFF", stroke: "#111111", lw: 10 });
    g.restore();
  }
  return cv;
};
const shapeSet: Draw = (f, c) => {
  const { c: cv, g } = mk(360, 200);
  g.fillStyle = c; g.beginPath(); g.arc(60, 100, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#FFD400"; g.fillRect(130, 60, 80, 80);
  g.fillStyle = "#22D3EE"; g.beginPath(); g.moveTo(290, 50); g.lineTo(340, 150); g.lineTo(240, 150); g.closePath(); g.fill();
  return cv;
};

/* ════════ 11. 움직이는 템플릿 ════════ */
const timer = (up: boolean): Draw => (f, c, t) => {
  const start = Math.max(1, Number(f[0]) || 30) * 60;
  const sec = Math.max(0, Math.floor(up ? Math.min(start, t) : start - t));
  const s = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const { c: cv, g } = mk(420, 170);
  rr(g, 10, 30, 400, 130, 22); g.fillStyle = "rgba(10,14,22,0.88)"; g.fill(); g.lineWidth = 6; g.strokeStyle = c; g.stroke();
  const lab = f[1] || (up ? "카운트업" : "카운트다운");
  const lw = tw(`800 26px ${F.pre}`, lab) + 28; rr(g, 30, 10, lw, 42, 10); g.fillStyle = c; g.fill();
  txt(g, lab, 30 + lw / 2, 31, { font: `800 26px ${F.pre}`, fill: ink(c) });
  txt(g, s, 210, 104, { font: `900 78px ${F.gm}`, fill: "#FFFFFF" });
  return cv;
};
const loading: Draw = (f, c, t) => {
  const total = Math.max(0.1, Number(f[0]) || 10) * 60;
  const k = Math.max(0, Math.min(1, t / total));
  const { c: cv, g } = mk(1000, 110);
  rr(g, 10, 40, 980, 44, 22); g.fillStyle = "rgba(255,255,255,0.25)"; g.fill();
  const gr = g.createLinearGradient(10, 0, 990, 0); gr.addColorStop(0, c); gr.addColorStop(0.5, "#A78BFA"); gr.addColorStop(1, "#F472B6");
  rr(g, 10, 40, Math.max(44, 980 * k), 44, 22); g.fillStyle = gr; g.fill();
  txt(g, `${f[1] || "진행"} ${Math.round(k * 100)}%`, 20, 18, { font: `800 26px ${F.pre}`, fill: "#FFFFFF", align: "left", shadow: "rgba(0,0,0,.5)" });
  return cv;
};
const slot: Draw = (f, c, t) => {
  const s = f[0] || "";
  const chars = [...s];
  const fs = 74, cw = 70;
  const { c: cv, g } = mk(chars.length * (cw + 8) + 40, 150);
  rr(g, 4, 10, cv.width - 8, 130, 16); g.fillStyle = "#111827"; g.fill(); g.lineWidth = 6; g.strokeStyle = c; g.stroke();
  chars.forEach((ch, i) => {
    const stop = 0.6 + i * 0.18;
    const x = 20 + i * (cw + 8) + cw / 2;
    rr(g, x - cw / 2, 24, cw, 102, 8); g.fillStyle = "#FFFFFF"; g.fill();
    g.save(); rr(g, x - cw / 2, 24, cw, 102, 8); g.clip();
    if (t < stop && /[0-9]/.test(ch)) { const d = Math.floor(t * 30 + i * 3) % 10; const off = ((t * 30) % 1) * 102; txt(g, String(d), x, 76 - off, { font: `900 ${fs}px ${F.gm}`, fill: "#111111" }); txt(g, String((d + 1) % 10), x, 178 - off, { font: `900 ${fs}px ${F.gm}`, fill: "#111111" }); }
    else txt(g, ch, x, 78, { font: `900 ${ch.length && /[가-힣]/.test(ch) ? 56 : fs}px ${F.gm}`, fill: "#111111" });
    g.restore();
  });
  return cv;
};
const scorePop: Draw = (f, c, t) => {
  const target = Number(String(f[0] || "100").replace(/[^0-9.]/g, "")) || 0;
  const unit = String(f[0] || "").replace(/[0-9.,\s]/g, "");
  const k = ease(t / 1.2);
  const v = Math.round(target * k);
  const s = `${v.toLocaleString("ko-KR")}${unit}`;
  const { c: cv, g } = mk(Math.max(360, tw(`90px ${F.head}`, `${target.toLocaleString("ko-KR")}${unit}`) + 120), 200);
  const sc = 1 + 0.25 * Math.max(0, 1 - Math.abs(t - 1.2) * 4);
  g.save(); g.translate(cv.width / 2, 110); g.scale(sc, sc);
  txt(g, s, 0, 0, { font: `90px ${F.head}`, fill: c, stroke: "#111111", lw: 12 });
  g.restore();
  if (f[1]) txt(g, f[1], cv.width / 2, 30, { font: `800 30px ${F.pre}`, fill: "#FFFFFF", shadow: "rgba(0,0,0,.5)" });
  return cv;
};
const route = (icon: "car" | "plane", land: string): Draw => (f, c, t) => {
  const from = f[0] || "", to = f[1] || "", note = f[2] || "";
  const W = 900, H = 520;
  const { c: cv, g } = mk(W, H);
  // 땅 모양
  g.fillStyle = land;
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, r = 1 + 0.08 * Math.sin(i * 2.7); g.lineTo(W / 2 + Math.cos(a) * 410 * r, H / 2 + Math.sin(a) * 220 * r); }
  g.closePath(); g.fill();
  g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,0.25)"; g.stroke();
  const P0 = { x: 170, y: 340 }, P1 = { x: 450, y: 120 }, P2 = { x: 730, y: 320 };
  const k = ease(t / 1.8);
  const at = (u: number) => ({ x: (1 - u) * (1 - u) * P0.x + 2 * (1 - u) * u * P1.x + u * u * P2.x, y: (1 - u) * (1 - u) * P0.y + 2 * (1 - u) * u * P1.y + u * u * P2.y });
  g.setLineDash([20, 14]); g.lineWidth = 10; g.strokeStyle = "#FFFFFF";
  g.beginPath(); for (let u = 0; u <= k; u += 0.02) { const p = at(u); if (u === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); } g.stroke(); g.setLineDash([]);
  [[P0, from], [P2, to]].forEach(([p, s]) => { const q = p as { x: number; y: number }; g.beginPath(); g.arc(q.x, q.y, 20, 0, Math.PI * 2); g.fillStyle = c; g.fill(); g.lineWidth = 6; g.strokeStyle = "#FFFFFF"; g.stroke(); txt(g, s as string, q.x, q.y + 54, { font: `40px ${F.head}`, fill: "#FFFFFF", stroke: "#111", lw: 8 }); });
  const p = at(k), q = at(Math.min(1, k + 0.02));
  g.save(); g.translate(p.x, p.y);
  if (icon === "plane") g.rotate(Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 4);
  txt(g, icon === "car" ? "🚗" : "✈️", 0, -6, { font: `68px ${F.emoji}`, fill: "#000" });
  g.restore();
  if (note) { const nw = tw(`800 34px ${F.pre}`, note) + 40; rr(g, W / 2 - nw / 2, 18, nw, 56, 28); g.fillStyle = c; g.fill(); txt(g, note, W / 2, 47, { font: `800 34px ${F.pre}`, fill: ink(c) }); }
  return cv;
};
const routeLine: Draw = (f, c, t) => {
  const from = f[0] || "", to = f[1] || "", note = f[2] || "";
  const W = 1000, H = 220;
  const { c: cv, g } = mk(W, H);
  const k = ease(t / 1.6);
  g.fillStyle = "rgba(0,0,0,0.35)"; rr(g, 0, 60, W, 110, 55); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 8; g.beginPath(); g.moveTo(80, 115); g.lineTo(920, 115); g.stroke();
  g.strokeStyle = c; g.beginPath(); g.moveTo(80, 115); g.lineTo(80 + 840 * k, 115); g.stroke();
  [[80, from], [920, to]].forEach(([x, s]) => { g.beginPath(); g.arc(x as number, 115, 16, 0, Math.PI * 2); g.fillStyle = "#FFFFFF"; g.fill(); txt(g, s as string, x as number, 190, { font: `36px ${F.head}`, fill: "#FFFFFF", stroke: "#111", lw: 7 }); });
  txt(g, "🚗", 80 + 840 * k, 96, { font: `60px ${F.emoji}`, fill: "#000" });
  if (note) txt(g, note, W / 2, 30, { font: `800 34px ${F.pre}`, fill: c, shadow: "rgba(0,0,0,.5)" });
  return cv;
};
const passBy = (v: 1 | 2): Draw => (f, c, t) => {
  const s = f[0] || "";
  const fs = 72;
  const W = 1920, H = 150;
  const { c: cv, g } = mk(W, H);
  const sw = tw(`${fs}px ${F.head}`, s);
  const dur = Math.max(2.5, Number(f[1]) || 4);
  const x = W + 40 - ((W + sw + 120) * (t % dur)) / dur;
  if (v === 2) { g.fillStyle = hex(c, 0.88); g.fillRect(0, 20, W, 110); }
  txt(g, s, x, 76, { font: `${fs}px ${F.head}`, fill: v === 2 ? ink(c) : "#FFFFFF", stroke: v === 2 ? undefined : "#111", lw: v === 2 ? 0 : 10, align: "left" });
  return cv;
};

/* ════════ 목록 ════════ */
const T: TplDef[] = [];
/** 나타난 뒤에도 계속 움직이게 (2026-10-20 사장님: 지금 있는 그래픽은 다 무빙) — 분류마다 어울리는 움직임. 움직이는 템플릿은 그림 자체가 움직여서 그대로 */
const EMPH_OF: Record<string, NonNullable<LayerAnim["emph"]>> = {
  "자막바": "float", "제목": "pulse", "말풍선·카드": "float", "브이로그": "float", "예능 글자": "beat", "예능 자막": "pulse", "검색창·화면": "float", "가리키기": "bounce", "반응": "wiggle",
};
const add = (cat: string, label: string, kind: Kind, fields: Field[], color: string, w: number, anim: LayerAnim, draw: Draw, o: { y?: number; dur?: number; clicks?: number[] } = {}) =>
  T.push({ id: `rb${String(T.length + 1).padStart(3, "0")}`, cat, label, kind, fields, color, w, anim: kind !== "motion" && !anim.emph && EMPH_OF[cat] ? { ...anim, emph: EMPH_OF[cat] } : anim, draw, ...o });
const one = (def: string, label = "글"): Field[] => [{ label, def }];

// 자막바·박스
add("자막바", "2줄 다큐 자막바", "text", [{ label: "머리글", def: "공실뉴스 현장" }, { label: "본문 (엔터로 줄)", def: "강남 논현동 역세권 빌라\n전세 5억 · 즉시 입주", multi: true }], "#34D399", 0.62, A.slideL, docBar(2), { y: 0.8 });
add("자막바", "2줄 장문형 자막바", "text", [{ label: "이름표", def: "공실뉴스" }, { label: "본문 (엔터로 줄)", def: "이번 매물은 역에서 걸어서 3분,\n관리비 10만 원으로 부담이 적습니다.", multi: true }], "#3B82F6", 0.66, A.slideL, longBar(2), { y: 0.8 });
add("자막바", "3줄 장문형 자막바", "text", [{ label: "이름표", def: "매물 정보" }, { label: "본문 (엔터로 줄)", def: "전용 102.5㎡ · 방 3개 · 욕실 1개\n남향 배치로 채광이 좋습니다\n주차 가능 · 2개월 이내 입주", multi: true }], "#3B82F6", 0.66, A.slideL, longBar(3), { y: 0.78 });
add("자막바", "2단 반응 자막바", "text", [{ label: "머리글", def: "공실뉴스 추천" }, { label: "본문", def: "역세권 신축 빌라" }], "#FFD400", 0.42, A.slideL, twoStep, { y: 0.78 });
add("자막바", "반응형 2단 박스", "text", [{ label: "큰 글", def: "공실뉴스 매물" }, { label: "작은 글", def: "서울 강남구 논현동" }], "#FFD400", 0.42, A.zoom, bracketBox, { y: 0.78 });
add("자막바", "반응형 2줄 박스 자막", "text", [{ label: "위 글", def: "오늘의 추천 매물" }, { label: "아래 글", def: "전세 5억 실화?!" }], "#FFD400", 0.45, A.slideL, slantTwo, { y: 0.78 });
add("자막바", "모던 박스 타이틀 1 (노랑)", "text", one("공실뉴스 현장 리포트"), "#FFD400", 0.42, A.zoom, modernBox("accent", "auto"), { y: 0.82 });
add("자막바", "모던 박스 타이틀 2 (남색)", "text", one("이번 주 신규 매물"), "#1E3A8A", 0.42, A.zoom, modernBox("accent", "auto"), { y: 0.82 });
add("자막바", "모던 박스 타이틀 3 (자홍)", "text", one("놓치면 후회할 매물"), "#D946EF", 0.42, A.zoom, modernBox("accent", "auto"), { y: 0.82 });
add("자막바", "모던 박스 타이틀 4 (테두리)", "text", one("공실뉴스가 직접 다녀왔어요"), "#22D3EE", 0.44, A.zoom, modernBox("rgba(10,14,22,0.85)", "#FFFFFF", "accent"), { y: 0.82 });
add("자막바", "모던 박스 타이틀 (테두리 남색)", "text", one("공실뉴스 자막 연구소"), "#FFD400", 0.4, A.zoom, modernBox("#1A3A6B", "#FFFFFF", "accent"), { y: 0.82 });
add("자막바", "포인트 자막바", "text", [{ label: "이름표", def: "핵심" }, { label: "본문", def: "관리비 10만 원!" }], "#FFD400", 0.4, A.slideL, pointBar, { y: 0.78 });
add("자막바", "이름 자막바", "text", [{ label: "이름", def: "김공실" }, { label: "직함", def: "공실뉴스 대표 공인중개사" }], "#38BDF8", 0.42, A.slideL, nameBar, { y: 0.8 });
add("자막바", "인물 소개 배지", "text", [{ label: "이름", def: "김공실" }, { label: "직함", def: "대표 중개사" }], "#F59E0B", 0.22, A.jelly, personBadge, { y: 0.7 });
add("자막바", "서브타이틀 01 (번호·세로선)", "text", [{ label: "번호", def: "01" }, { label: "제목", def: "입지·교통" }, { label: "설명", def: "역에서 걸어서 3분, 버스 정류장 바로 앞" }], "#38BDF8", 0.5, A.slideL, subTitle(1), { y: 0.8 });
add("자막바", "서브타이틀 02 (번호·흰 글)", "text", [{ label: "번호", def: "02" }, { label: "제목", def: "가격·조건" }, { label: "설명", def: "전세 5억 · 관리비 10만 원" }], "#38BDF8", 0.5, A.slideL, subTitle(2), { y: 0.8 });
add("자막바", "서브타이틀 03 (번호 상자)", "text", [{ label: "번호", def: "03" }, { label: "제목", def: "내부 구조" }, { label: "설명", def: "방 3개 · 욕실 1개 · 남향" }], "#F97316", 0.5, A.slideL, subTitle(3), { y: 0.8 });
add("자막바", "서브타이틀 04 (흰 알약)", "text", [{ label: "번호", def: "04" }, { label: "제목", def: "옵션" }, { label: "설명", def: "시스템에어컨 · 건조기 · 비데" }], "#F97316", 0.5, A.slideL, subTitle(4), { y: 0.8 });
add("자막바", "서브타이틀 05 (어두운 알약)", "text", [{ label: "번호", def: "05" }, { label: "제목", def: "입주 시기" }, { label: "설명", def: "2개월 이내 입주 가능" }], "#FFD400", 0.5, A.slideL, subTitle(5), { y: 0.8 });
add("자막바", "컬러 박스", "text", one("공실뉴스 매물 브리핑"), "#3B82F6", 0.44, A.slideL, colorBox, { y: 0.8 });
add("자막바", "2단 자막 트랜지션", "text", [{ label: "큰 글", def: "자막은 공실뉴스" }, { label: "작은 글", def: "현장 그대로 전해 드려요" }], "#3B82F6", 0.5, A.fade, blockTrans, { y: 0.78 });

// 제목
add("제목", "제목 타이틀 (밑줄)", "text", [{ label: "영어 머리글", def: "gongsil news" }, { label: "제목", def: "강남 역세권 빌라" }], "#38BDF8", 0.55, A.zoom, titleUnder, { y: 0.45 });
add("제목", "제목 템플릿 2 (알약)", "text", [{ label: "제목", def: "공실뉴스 매물 브리핑" }, { label: "작은 글", def: "2026년 10월 셋째 주" }], "#E11D48", 0.5, A.pop, titlePill, { y: 0.45 });
add("제목", "제목 템플릿 3 (검은 띠)", "text", one("실화냐 이 가격", "제목"), "#FFD400", 0.7, A.stamp, titleBanner, { y: 0.45 });
add("제목", "제목 템플릿 4 (로고형)", "text", [{ label: "제목", def: "GONGSIL" }, { label: "작은 글", def: "공실뉴스 부동산 채널" }], "#2563EB", 0.45, A.zoom, titleLogo, { y: 0.45 });
add("제목", "짧은 키네포 타이틀", "text", [{ label: "세로 작은 글", def: "NEW" }, { label: "제목", def: "신규 매물" }], "#FFD400", 0.5, A.stamp, titleKine, { y: 0.45 });
add("제목", "2단 색 변형 타이틀", "text", [{ label: "앞 글 (색)", def: "공실뉴스" }, { label: "뒤 글 (흰색)", def: "추천 매물" }], "#FF3B30", 0.55, A.pop, titleTwoColor, { y: 0.45 });
add("제목", "워프 자막", "text", one("다음 매물로 갑니다"), "#22D3EE", 0.55, A.zoom, warpText, { y: 0.5 });
add("제목", "사선 체인지 자막", "text", one("가격 대공개"), "#FFD400", 0.5, A.slideR, slantStrip, { y: 0.5 });
add("제목", "2줄 페인트 자막", "text", [{ label: "윗줄", def: "오늘의 매물" }, { label: "아랫줄", def: "논현동 무지개 빌라" }], "#F472B6", 0.45, A.slideL, paintStroke, { y: 0.75 });
add("제목", "상소문 2줄 타이틀 (도장)", "text", [{ label: "윗줄", def: "공실뉴스가 아뢰옵니다" }, { label: "아랫줄", def: "역세권 빌라 나왔사옵니다" }, { label: "도장 글", def: "공실" }], "#C81E1E", 0.6, A.zoom, scroll(true), { y: 0.45 });
add("제목", "상소문 2줄 타이틀", "text", [{ label: "윗줄", def: "공실뉴스가 아뢰옵니다" }, { label: "아랫줄", def: "역세권 빌라 나왔사옵니다" }], "#C81E1E", 0.6, A.zoom, scroll(false), { y: 0.45 });

// 말풍선·정리 카드
add("말풍선·카드", "5줄 말풍선 팁", "text", [{ label: "머리글", def: "TIP" }, { label: "본문 (엔터로 줄, 5줄까지)", def: "관리비에 포함된 항목\n인터넷 · 수도 · 공용전기\n주차는 1대 무료", multi: true }], "#FFD400", 0.38, A.jelly, tipBubble, { y: 0.42 });
add("말풍선·카드", "5줄 설명 말풍선 (색)", "text", [{ label: "머리글", def: "매물 한눈에" }, { label: "본문 (엔터로 줄)", def: "전세 5억\n관리비 10만 원\n전용 102.5㎡\n방 3 · 욕실 1", multi: true }], "#FFD400", 0.36, A.jelly, explainBubble(false), { y: 0.42 });
add("말풍선·카드", "5줄 설명 말풍선 (어두운)", "text", [{ label: "머리글", def: "TEMPLATE" }, { label: "본문 (엔터로 줄)", def: "역에서 걸어서 3분\n남향 · 채광 좋음\n주차 가능\n즉시 입주", multi: true }], "#38BDF8", 0.36, A.jelly, explainBubble(true), { y: 0.42 });
add("말풍선·카드", "4줄 메모장", "text", [{ label: "제목", def: "체크 포인트" }, { label: "본문 (엔터로 줄, 4줄까지)", def: "✔ 등기부등본 확인\n✔ 관리비 항목\n✔ 주차 가능 여부\n✔ 입주 날짜", multi: true }], "#FFE58A", 0.34, A.jelly, memoPad, { y: 0.42 });
add("말풍선·카드", "8줄 정리 판", "text", [{ label: "제목", def: "매물 정리" }, { label: "본문 (엔터로 줄, 8줄까지)", def: "위치: 강남구 논현동\n가격: 전세 5억\n관리비: 10만 원\n면적: 전용 102.5㎡\n구조: 방 3 · 욕실 1\n방향: 남향\n주차: 가능\n입주: 2개월 이내", multi: true }], "#38BDF8", 0.4, A.fade, summaryPanel, { y: 0.45 });

// 브이로그 감성
["오늘도 좋은 하루", "햇살 가득한 거실", "동네 한 바퀴", "작은 행복", "조용한 골목", "산책하기 좋은 날", "우리 동네 이야기", "커피 한 잔의 여유", "창밖 풍경", "따뜻한 오후", "천천히 걷기", "Seoul Daily", "이 집 참 마음에 들어요"].forEach((s, i) =>
  add("브이로그", `브이로그 감성 자막 ${i + 1}`, "text", VLOG[i].deco === "en" ? [{ label: "글", def: s }, { label: "영어 작은 글", def: "a cozy afternoon" }] : one(s), ["#FFFFFF", "#FDE68A", "#FBCFE8", "#F9A8D4", "#E5E7EB", "#A7F3D0", "#FFFFFF", "#FDE68A", "#BAE6FD", "#FDBA74", "#FFFFFF", "#E9D5FF", "#FFFFFF"][i], 0.45, A.fade, vlog(i), { y: 0.82 }));

// 예능 글자 칸
add("예능 글자", "네모 3글자", "text", one("역세권", "글자 (3자)"), "#FFD400", 0.4, A.jelly, tiles("square", ["#FFFFFF", "#FFD400", "#FFFFFF"]), { y: 0.3 });
add("예능 글자", "네모 4글자", "text", one("대박매물", "글자 (4자)"), "#FFD400", 0.5, A.jelly, tiles("square", ["#FFFFFF", "#FFD400"]), { y: 0.3 });
add("예능 글자", "꽃잎 3글자", "text", one("귀여워", "글자 (3자)"), "#F472B6", 0.4, A.jelly, tiles("flower", ["#F472B6", "#FDE047", "#FB923C"]), { y: 0.3 });
add("예능 글자", "꽃잎 4글자", "text", one("초품아다", "글자 (4자)"), "#F472B6", 0.5, A.jelly, tiles("flower", ["#F472B6", "#FDE047", "#FB923C", "#A78BFA"]), { y: 0.3 });
add("예능 글자", "원 3글자", "text", one("남향집", "글자 (3자)"), "#FFFFFF", 0.4, A.jelly, tiles("circle", ["#FFFFFF", "#111111", "#FFFFFF"]), { y: 0.3 });
add("예능 글자", "지그재그 4글자", "text", one("대중교통", "글자 (4자)"), "#FFD400", 0.5, A.jelly, tiles("zigzag", ["#FFD400", "#22D3EE", "#F472B6", "#A3E635"]), { y: 0.3 });

// 예능 반응 자막
add("예능 자막", "런닝맨식 자막 1", "text", [{ label: "글 (엔터로 줄)", def: "입이 쩍\n달라붙는데?!", multi: true }, { label: "작은 머리글", def: "공실뉴스" }], "#FF3B30", 0.42, A.pop, outlineBig(F.head, "#FFFFFF", "#111111"), { y: 0.35 });
add("예능 자막", "런닝맨식 자막 2 (폭발)", "text", [{ label: "글 (엔터로 줄)", def: "이 집 찜한 사람\n벌써 몇 명?!", multi: true }], "#FFD400", 0.48, A.stamp, burstText("#E11D48", "#FFFFFF", "#111111"), { y: 0.35 });
add("예능 자막", "런닝맨식 자막 3 (손글씨)", "text", [{ label: "글 (엔터로 줄)", def: "주인장 몰래\n살짝 보여 드림", multi: true }], "#FFFFFF", 0.42, A.fade, outlineBig(F.pen, "#FFFFFF", "#111111"), { y: 0.35 });
add("예능 자막", "런닝맨식 자막 3 (손글씨·색)", "text", [{ label: "글 (엔터로 줄)", def: "주인장 몰래\n살짝 보여 드림", multi: true }], "#FFD400", 0.42, A.fade, outlineBig(F.pen, "accent", "#111111"), { y: 0.35 });
add("예능 자막", "런닝맨식 질문 자막", "text", one("이 가격 실화일까요?"), "#3B82F6", 0.45, A.pop, modernBox("accent", "#FFFFFF", "#FFFFFF"), { y: 0.3 });
add("예능 자막", "예능 완성 자막", "text", [{ label: "글", def: "자막은 공실뉴스!!" }, { label: "작은 머리글", def: "완성" }], "#FFD400", 0.48, A.pop, outlineBig(F.head, "accent", "#111111", "#FFFFFF"), { y: 0.3 });
add("예능 자막", "튀어나오는 예능 자막", "text", one("어머 여긴 꼭 봐야 해"), "#FFD400", 0.5, A.jelly, outlineBig(F.ck, "accent", "#3b1d00"), { y: 0.3 });
add("예능 자막", "튀어나오는 말풍선 자막", "text", [{ label: "글 (엔터로 줄)", def: "이게\n된다고?", multi: true }], "#EC4899", 0.25, A.jelly, speechPop, { y: 0.35 });
add("예능 자막", "퍽 때리는 자막", "text", [{ label: "글 (엔터로 줄)", def: "퍽!\n가격 실화", multi: true }], "#FFD400", 0.32, A.stamp, burstText("#FF3B30", "#FFD400", "#111111"), { y: 0.35 });
add("예능 자막", "피 튀기는 자막", "text", one("공포의 관리비"), "#DC2626", 0.45, A.stamp, bloodText, { y: 0.35 });
add("예능 자막", "쾅 박히는 자막 I", "text", one("공실뉴스"), "#E11D48", 0.4, A.stamp, stampBox("accent", -0.12), { y: 0.35 });
add("예능 자막", "쾅 박히는 자막 II", "text", one("PASS"), "#2563EB", 0.34, A.stamp, stampBox("accent", -0.08), { y: 0.35 });
add("예능 자막", "쾅 박히는 자막 III (가운데)", "text", one("PASS"), "#EC4899", 0.34, A.stamp, stampBox("accent", 0.06), { y: 0.45 });
add("예능 자막", "사이렌 예능 자막", "text", one("긴급 매물 등장!"), "#FFD400", 0.5, A.stamp, sirenText, { y: 0.3 });
add("예능 자막", "빛나는 2줄 자막", "text", [{ label: "글 (엔터로 줄)", def: "공실뉴스\n추천 매물", multi: true }], "#22D3EE", 0.42, A.fade, glowText(F.head, 2), { y: 0.4 });
add("예능 자막", "빛나는 조명 자막", "text", [{ label: "글", def: "빛나는 조명이 감싸는 자막" }], "#FFD400", 0.6, A.fade, glowText(F.dh, 1), { y: 0.4 });
add("예능 자막", "점점 줄어드는 말 자막", "text", one("자신이 없어지는 중…"), "#FFFFFF", 0.4, A.shrink, glowText(F.pen, 1), { y: 0.4 });

// 검색창·화면·지폐
add("검색창·화면", "검색창 (초록)", "text", one("강남 역세권 빌라 전세"), "#03C75A", 0.55, A.key, searchBar("#03C75A", "#03C75A", false), { y: 0.3 });
add("검색창·화면", "검색창 (빨강 단추)", "text", one("공실뉴스 매물 브리핑"), "#FF0000", 0.55, A.key, searchBar("#CCCCCC", "#FF0000", true), { y: 0.3 });
add("검색창·화면", "검색창 (둥근 흰색)", "text", one("논현동 원룸 시세"), "#4285F4", 0.55, A.key, searchBar("#DADCE0", "", true), { y: 0.3 });
add("검색창·화면", "VS 화면", "text", [{ label: "왼쪽", def: "역세권 빌라" }, { label: "오른쪽", def: "신축 오피스텔" }], "#FFD400", 0.8, A.zoom, vsScreen, { y: 0.5 });
add("검색창·화면", "끝 화면 (구독·문의)", "text", [{ label: "채널 이름", def: "공실뉴스" }, { label: "왼쪽 칸", def: "다른 매물 보기" }, { label: "오른쪽 칸", def: "문의 02-000-0000" }], "#FFD400", 1, A.fade, outro, { y: 0.5 });
add("검색창·화면", "지폐 (천 원 · 일반 그림)", "sticker", one("1,000", "금액"), "#5B8DEF", 0.3, A.pop, bill("1,000", "#5B8DEF"));
add("검색창·화면", "지폐 (만 원 · 일반 그림)", "sticker", one("10,000", "금액"), "#4CAF7A", 0.3, A.pop, bill("10,000", "#4CAF7A"));
add("검색창·화면", "지폐 (오만 원 · 일반 그림)", "sticker", one("50,000", "금액"), "#E0A33A", 0.3, A.pop, bill("50,000", "#E0A33A"));
add("검색창·화면", "지폐 (달러 · 일반 그림)", "sticker", one("$100", "금액"), "#6B8E5A", 0.3, A.pop, bill("$100", "#6B8E5A"));

// 가리키기 스티커
ARROWS.forEach((a, i) => add("가리키기", `화살표 ${i + 1}`, "sticker", one(["여기", "매물", "역", "출입구", "주차장", "넓은 거실", "옥상", "정문", "베란다", "채광", "여기요", "포인트", "핵심", "체크", "여기!", "주목", "이곳", "강추", "입구", "중심"][i], "글 (비우면 화살표만)"), ["#FFFFFF", "#FFFFFF", "#FFD400", "#FFFFFF", "#38BDF8", "#FFFFFF", "#FFFFFF", "#38BDF8", "#FFD400", "#FFFFFF", "#38BDF8", "#FFFFFF", "#FFD400", "#FFFFFF", "#22D3EE", "#FFFFFF", "#F472B6", "#FFFFFF", "#FF3B30", "#FF3B30"][i], 0.3, a.k.startsWith("circle") ? A.spin : A.point, arrowDraw(i)));
add("가리키기", "위치 화살표 1 (굵은)", "sticker", one("오늘의 목적지"), "#FF6A00", 0.18, A.point, markerDown(1));
add("가리키기", "위치 화살표 2 (겹화살)", "sticker", one("도착 지점"), "#E11D48", 0.18, A.point, markerDown(2));
add("가리키기", "위치 화살표 3 (세모)", "sticker", one("오늘의 매물"), "#F59E0B", 0.18, A.point, markerDown(3));
add("가리키기", "왼쪽에서 꽂히는 화살", "sticker", one("명중!"), "#E11D48", 0.32, { in: "slideL", emph: "shake", out: "fade", dur: 0.25, sfx: "impact-bass-1", sfxVol: 0.6 }, dart(true));
add("가리키기", "오른쪽에서 꽂히는 화살", "sticker", one("명중!"), "#E11D48", 0.32, { in: "slideR", emph: "shake", out: "fade", dur: 0.25, sfx: "impact-bass-1", sfxVol: 0.6 }, dart(false));
add("가리키기", "지시선", "sticker", [{ label: "글", def: "공용 엘리베이터" }, { label: "작은 글", def: "1층 로비" }], "#22D3EE", 0.36, A.fade, leaderLine);
add("가리키기", "깃발 위치", "sticker", one("View Point"), "#E11D48", 0.18, A.point, flag);

// 반응 스티커
add("반응", "별별별", "sticker", one("", "글 (비우면 별만)"), "#FFD400", 0.3, A.pop, starsDraw(false));
add("반응", "예능 별별별", "sticker", one("WOW", "글 (비우면 별만)"), "#FFD400", 0.32, A.pop, starsDraw(true));
add("반응", "뿅망치", "sticker", one("뿅!"), "#E11D48", 0.24, { in: "swing", emph: "shake", out: "fade", dur: 0.35, sfx: "pop", sfxVol: 0.7 }, hammer);
add("반응", "예능 뿅망치", "sticker", one("정신 차려!"), "#FF6A00", 0.26, { in: "swing", emph: "shake", out: "fade", dur: 0.35, sfx: "impact-bass-1", sfxVol: 0.7 }, hammer);
add("반응", "동그란 ㅋㅋㅋ", "sticker", one("ㅋ"), "#FFD400", 0.3, A.spin, kkk(false));
add("반응", "지나가는 ㅋㅋㅋ", "sticker", one("ㅋ"), "#FFD400", 0.6, A.slideR, kkk(true));
add("반응", "도형 셋", "sticker", [], "#FF3B30", 0.22, A.pop, shapeSet);

// 움직이는 템플릿
add("움직이는", "카운트다운", "motion", [{ label: "몇 분부터", def: "30" }, { label: "이름표", def: "마감까지" }], "#FF3B30", 0.24, A.fade, timer(false), { y: 0.15 });
add("움직이는", "카운트업", "motion", [{ label: "최대 몇 분", def: "30" }, { label: "이름표", def: "경과 시간" }], "#22C55E", 0.24, A.fade, timer(true), { y: 0.15 });
add("움직이는", "컬러 로딩바", "motion", [{ label: "다 차는 데 몇 분", def: "10" }, { label: "이름", def: "진행" }], "#3B82F6", 0.6, A.fade, loading, { y: 0.9 });
add("움직이는", "슬롯머신 숫자", "motion", one("5억 5천", "보여 줄 글 (숫자가 굴러가요)"), "#FFD400", 0.45, A.zoom, slot, { y: 0.4 });
add("움직이는", "튀어나오는 점수", "motion", [{ label: "숫자와 단위", def: "990만원" }, { label: "작은 글", def: "보증금" }], "#FFD400", 0.4, A.pop, scorePop, { y: 0.4 });
add("움직이는", "자동차 목적지 (지도)", "motion", [{ label: "출발", def: "논현역" }, { label: "도착", def: "매물" }, { label: "작은 글", def: "걸어서 3분" }], "#E11D48", 0.55, A.fade, route("car", "#2F9E7A"), { y: 0.5 });
add("움직이는", "자동차 목적지 (줄)", "motion", [{ label: "출발", def: "논현역 3번 출구" }, { label: "도착", def: "무지개 빌라" }, { label: "작은 글", def: "차로 2분" }], "#FFD400", 0.6, A.fade, routeLine, { y: 0.8 });
add("움직이는", "비행기 목적지", "motion", [{ label: "출발", def: "서울" }, { label: "도착", def: "제주" }, { label: "작은 글", def: "세컨드 하우스 투어" }], "#3B82F6", 0.55, A.fade, route("plane", "#C9A86A"), { y: 0.5 });
add("움직이는", "빠르게 지나가는 자막", "motion", [{ label: "글", def: "말하면서 빠르게 지나가는 그런 자막입니다" }, { label: "몇 초에 한 번", def: "4" }], "#FFFFFF", 1, A.none, passBy(1), { y: 0.85 });
add("움직이는", "빠르게 지나가는 자막 2 (띠)", "motion", [{ label: "글", def: "속보 · 강남 역세권 신규 매물 등장" }, { label: "몇 초에 한 번", def: "5" }], "#FFD400", 1, A.none, passBy(2), { y: 0.88 });
add("움직이는", "마우스 클릭", "motion", [], "#38BDF8", 0.14, A.pop, cursorClick, { y: 0.5 });

/* ════════ 11. 구독·좋아요 (2026-10-20 사장님: 프리미어 컴포저 Social Media 처럼 움직이는 것) ════════
 *  모두 "움직이는"(motion) — t 초마다 다시 그린다. 한 번 움직이고 끝 모습에서 멈추는 것(구독 버튼)과 계속 도는 것(엄지·하트·종)
 *  그림 크기는 t 와 상관없이 같게 (글 길이로만 정한다) */
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const seg = (t: number, a: number, b: number) => cl01((t - a) / (b - a));
const eOut = (x: number) => 1 - Math.pow(1 - x, 3);
const eBack = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 마우스 화살표 — 끝(x,y), 누르면 조금 작아짐 */
function pointer(g: CanvasRenderingContext2D, x: number, y: number, s: number, alpha = 1) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha = alpha; g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 46); g.lineTo(12, 35); g.lineTo(20, 54); g.lineTo(28, 50); g.lineTo(20, 32); g.lineTo(36, 32); g.closePath();
  g.fillStyle = "#FFFFFF"; g.fill(); g.lineWidth = 3.5; g.strokeStyle = "#111111"; g.stroke();
  g.restore();
}
/** 누른 곳에 퍼지는 동그라미 (k 0→1) */
function ripple(g: CanvasRenderingContext2D, x: number, y: number, k: number, color = "#FFFFFF") {
  if (k <= 0 || k >= 1) return;
  g.save(); g.globalAlpha = 1 - k; g.beginPath(); g.arc(x, y, 12 + k * 46, 0, Math.PI * 2); g.lineWidth = 5; g.strokeStyle = color; g.stroke(); g.restore();
}
/** 엄지 척 (가운데 cx,cy · 크기 s = 높이) */
function thumbUp(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string) {
  g.save(); g.translate(cx - s * 0.5, cy - s * 0.5); g.scale(s / 100, s / 100); g.fillStyle = fill;
  rr(g, 4, 42, 20, 54, 5); g.fill(); // 소매
  g.beginPath(); g.moveTo(30, 44); g.lineTo(48, 8); g.quadraticCurveTo(60, 2, 62, 18); g.lineTo(58, 40); g.lineTo(86, 40);
  g.quadraticCurveTo(98, 42, 94, 56); g.lineTo(86, 88); g.quadraticCurveTo(83, 96, 74, 96); g.lineTo(30, 96); g.closePath(); g.fill();
  g.restore();
}
/** 종 (가운데 cx,cy · 크기 s · 흔들림 각도 ang) */
function bellIcon(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string, ang = 0) {
  g.save(); g.translate(cx, cy - s * 0.42); g.rotate(ang); g.scale(s / 100, s / 100); g.fillStyle = fill;
  g.beginPath(); g.arc(0, 2, 7, 0, Math.PI * 2); g.fill(); // 꼭지
  g.beginPath(); g.moveTo(-30, 64); g.quadraticCurveTo(-30, 10, 0, 8); g.quadraticCurveTo(30, 10, 30, 64); g.lineTo(40, 76); g.lineTo(-40, 76); g.closePath(); g.fill();
  g.beginPath(); g.arc(0, 86, 10, 0, Math.PI * 2); g.fill(); // 추
  g.restore();
}
/** 하트 (가운데 cx,cy · 크기 s) */
function heartIcon(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string) {
  g.save(); g.translate(cx, cy); g.scale(s / 100, s / 100); g.fillStyle = fill;
  g.beginPath(); g.moveTo(0, 34); g.bezierCurveTo(-60, -6, -40, -52, 0, -22); g.bezierCurveTo(40, -52, 60, -6, 0, 34); g.closePath(); g.fill();
  g.restore();
}
/** 재생 단추 모양 로고 (빨간 둥근 네모 + 흰 세모) */
function playMark(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bg = "#FF0000") {
  rr(g, x, y, w, h, h * 0.28); g.fillStyle = bg; g.fill();
  g.beginPath(); g.moveTo(x + w * 0.4, y + h * 0.28); g.lineTo(x + w * 0.4, y + h * 0.72); g.lineTo(x + w * 0.68, y + h * 0.5); g.closePath(); g.fillStyle = "#FFFFFF"; g.fill();
}
const fmtNum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** 구독 단추 누르기 — 화살표가 와서 [구독]을 누르면 [구독중]으로 바뀌고 종이 울린다 (한 번, 끝 모습에서 멈춤) */
const subscribeClick = (minimal: boolean): Draw => (f, c, t) => {
  const on = f[0] || "구독", off = f[1] || "구독중";
  const font = `800 56px ${F.pre}`;
  const bw = Math.max(tw(font, on), tw(font, off)) + (minimal ? 120 : 150), bh = 104;
  const W = bw + 220, H = 200;
  const { c: cv, g } = mk(W, H);
  const x0 = 30, y0 = (H - bh) / 2;
  const click = 1.0;
  const done = t >= click;
  const press = 1 - 0.06 * Math.sin(Math.PI * seg(t, click - 0.08, click + 0.12));
  g.save(); g.translate(x0 + bw / 2, y0 + bh / 2); g.scale(press, press); g.translate(-(x0 + bw / 2), -(y0 + bh / 2));
  rr(g, x0, y0, bw, bh, bh / 2);
  g.fillStyle = done ? (minimal ? "#FFFFFF" : "#E9E9E9") : minimal ? "#FFFFFF" : c; g.fill();
  if (minimal) { g.lineWidth = 6; g.strokeStyle = done ? "#BBBBBB" : "#111111"; g.stroke(); }
  if (!minimal && !done) playMark(g, x0 + 30, y0 + bh / 2 - 20, 54, 40, "#FFFFFF");
  if (!minimal && !done) { g.beginPath(); g.moveTo(x0 + 51, y0 + bh / 2 - 9); g.lineTo(x0 + 51, y0 + bh / 2 + 9); g.lineTo(x0 + 66, y0 + bh / 2); g.closePath(); g.fillStyle = c; g.fill(); }
  txt(g, done ? `✓ ${off}` : on, x0 + bw / 2 + (minimal || done ? 0 : 30), y0 + bh / 2 + 2, { font, fill: done ? "#333333" : minimal ? "#111111" : "#FFFFFF" });
  g.restore();
  // 종 — 누른 뒤 튀어나와 흔들림
  const bk = eBack(seg(t, click + 0.05, click + 0.4));
  if (bk > 0) {
    const ring = Math.sin(t * 22) * 0.45 * Math.max(0, 1 - seg(t, click + 0.4, click + 1.6));
    g.save(); g.translate(x0 + bw + 90, H / 2); g.scale(bk, bk);
    g.beginPath(); g.arc(0, 0, 54, 0, Math.PI * 2); g.fillStyle = "#FFFFFF"; g.fill();
    bellIcon(g, 0, 4, 66, "#111111", ring);
    g.restore();
  }
  // 화살표 — 오른쪽 아래에서 들어와 누르고 사라짐
  const mv = eOut(seg(t, 0.15, click - 0.05));
  const px = lerp(W - 30, x0 + bw * 0.62, mv), py = lerp(H - 10, y0 + bh * 0.62, mv);
  ripple(g, x0 + bw * 0.62, y0 + bh * 0.62, seg(t, click, click + 0.45), minimal ? "#111111" : "#FFFFFF");
  pointer(g, px, py, t > click - 0.05 && t < click + 0.12 ? 1.25 : 1.4, 1 - seg(t, click + 0.9, click + 1.3));
  return cv;
};

/** 채널 구독 카드 — 동그란 얼굴(첫 글자) · 채널명 · 작은 글 · [구독] → [구독중] */
const channelCard: Draw = (f, c, t) => {
  const name = f[0] || "공실뉴스", sub = f[1] || "", on = f[2] || "구독", off = f[3] || "구독중";
  const nf = `800 50px ${F.pre}`, sf = `500 32px ${F.pre}`, bf = `800 40px ${F.pre}`;
  const bw = Math.max(tw(bf, on), tw(bf, `✓ ${off}`)) + 70;
  const W = 40 + 130 + 30 + Math.max(tw(nf, name), tw(sf, sub)) + 40 + bw + 40, H = 210;
  const { c: cv, g } = mk(W + 40, H + 40);
  g.save(); g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 20; g.shadowOffsetY = 6;
  rr(g, 20, 14, W, H, 34); g.fillStyle = "#FFFFFF"; g.fill(); g.restore();
  // 얼굴
  g.beginPath(); g.arc(20 + 40 + 65, 14 + H / 2, 65, 0, Math.PI * 2); g.fillStyle = c; g.fill();
  txt(g, Array.from(name)[0] || "공", 20 + 40 + 65, 14 + H / 2 + 3, { font: `900 64px ${F.head}`, fill: ink(c) });
  const tx = 20 + 40 + 130 + 30;
  txt(g, name, tx, 14 + (sub ? H / 2 - 24 : H / 2), { font: nf, fill: "#111111", align: "left" });
  if (sub) txt(g, sub, tx, 14 + H / 2 + 30, { font: sf, fill: "#777777", align: "left" });
  const click = 1.3, done = t >= click;
  const bx = 20 + W - 40 - bw, by = 14 + H / 2 - 40;
  const press = 1 - 0.07 * Math.sin(Math.PI * seg(t, click - 0.08, click + 0.12));
  g.save(); g.translate(bx + bw / 2, by + 40); g.scale(press, press); g.translate(-(bx + bw / 2), -(by + 40));
  rr(g, bx, by, bw, 80, 40); g.fillStyle = done ? "#ECECEC" : "#E5252A"; g.fill();
  txt(g, done ? `✓ ${off}` : on, bx + bw / 2, by + 42, { font: bf, fill: done ? "#333333" : "#FFFFFF" });
  g.restore();
  const mv = eOut(seg(t, 0.4, click - 0.05));
  ripple(g, bx + bw * 0.6, by + 52, seg(t, click, click + 0.45), "#E5252A");
  pointer(g, lerp(W + 20, bx + bw * 0.6, mv), lerp(H + 30, by + 52, mv), 1.3, 1 - seg(t, click + 0.9, click + 1.3));
  return cv;
};

/** 좋아요 · 구독 · 알림 — 차례로 나타나고 화살표가 하나씩 눌러 켠다 */
const tripleCta: Draw = (f, c, t) => {
  const labels = [f[0] || "좋아요", f[1] || "구독", f[2] || "알림 설정"];
  const font = `800 44px ${F.pre}`;
  const ws = labels.map((s, i) => tw(font, i === 1 ? `✓ ${s}중` : s) + (i === 1 ? 70 : 120));
  const gap = 26, H = 200, bh = 92;
  const W = ws.reduce((a, b) => a + b, 0) + gap * 2 + 60;
  const { c: cv, g } = mk(W, H);
  const clicks = [0.9, 1.6, 2.3];
  let x = 30;
  const xs: number[] = [];
  labels.forEach((s, i) => {
    xs.push(x);
    const k = eBack(seg(t, i * 0.18, i * 0.18 + 0.4));
    const done = t >= clicks[i];
    const w = ws[i], y = (H - bh) / 2;
    if (k > 0) {
      const press = 1 - 0.07 * Math.sin(Math.PI * seg(t, clicks[i] - 0.08, clicks[i] + 0.12));
      g.save(); g.translate(x + w / 2, y + bh / 2); g.scale(k * press, k * press); g.translate(-(x + w / 2), -(y + bh / 2));
      const bg = i === 0 ? (done ? "#2F7CF6" : "#FFFFFF") : i === 1 ? (done ? "#ECECEC" : "#E5252A") : done ? "#FFD400" : "#FFFFFF";
      rr(g, x, y, w, bh, bh / 2); g.fillStyle = bg; g.fill();
      if (i !== 1) { g.lineWidth = 4; g.strokeStyle = done ? bg : "#DDDDDD"; g.stroke(); }
      const fg = i === 0 ? (done ? "#FFFFFF" : "#111111") : i === 1 ? (done ? "#333333" : "#FFFFFF") : "#111111";
      if (i === 0) thumbUp(g, x + 50, y + bh / 2 - 2, 46, fg);
      if (i === 2) bellIcon(g, x + 50, y + bh / 2 + 2, 48, fg, done ? Math.sin(t * 22) * 0.45 * Math.max(0, 1 - seg(t, clicks[2], clicks[2] + 1.2)) : 0);
      txt(g, i === 1 && done ? `✓ ${s}중` : s, x + (i === 1 ? w / 2 : 84 + (w - 84) / 2 - 10), y + bh / 2 + 2, { font, fill: fg });
      g.restore();
    }
    x += w + gap;
  });
  // 화살표 — 하나씩 차례로
  const at = (i: number) => ({ x: xs[i] + ws[i] * 0.55, y: (H - bh) / 2 + bh * 0.65 });
  let px = W - 10, py = H;
  for (let i = 0; i < 3; i++) {
    const from = i === 0 ? { x: W - 10, y: H } : at(i - 1);
    const to = at(i);
    const a = i === 0 ? 0.4 : clicks[i - 1] + 0.15;
    if (t >= a) { const m = eOut(seg(t, a, clicks[i] - 0.05)); px = lerp(from.x, to.x, m); py = lerp(from.y, to.y, m); }
    ripple(g, to.x, to.y, seg(t, clicks[i], clicks[i] + 0.45), i === 1 ? "#E5252A" : "#2F7CF6");
  }
  pointer(g, px, py, 1.25, (t < 0.4 ? seg(t, 0.25, 0.4) : 1) * (1 - seg(t, clicks[2] + 0.8, clicks[2] + 1.2)));
  return cv;
};

/** 좋아요 엄지 — 파란 동그라미 안 엄지가 통통 + 반짝 가루 (계속) */
const likeThumb: Draw = (f, c, t) => {
  const { c: cv, g } = mk(320, 320);
  const k = (t % 1.6) / 1.6;
  const pop = 1 + 0.16 * Math.sin(Math.PI * cl01(k / 0.3));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, r = 90 + eOut(cl01(k / 0.6)) * 55;
    g.save(); g.globalAlpha = 1 - cl01(k / 0.6); g.beginPath(); g.arc(160 + Math.cos(a) * r, 160 + Math.sin(a) * r, 9, 0, Math.PI * 2); g.fillStyle = i % 2 ? "#FFD400" : c; g.fill(); g.restore();
  }
  g.save(); g.translate(160, 160); g.scale(pop, pop);
  g.beginPath(); g.arc(0, 0, 92, 0, Math.PI * 2); g.fillStyle = c; g.fill(); g.lineWidth = 8; g.strokeStyle = "#FFFFFF"; g.stroke();
  thumbUp(g, 0, -4, 104, "#FFFFFF");
  g.restore();
  if (f[0]) txt(g, f[0], 160, 296, { font: `800 34px ${F.pre}`, fill: "#FFFFFF", stroke: "#111111", lw: 8 });
  return cv;
};

/** 하트 — 쿵쿵 뛰고 작은 하트가 위로 떠오름 (계속) */
const heartBeat: Draw = (f, c, t) => {
  const { c: cv, g } = mk(320, 360);
  for (let i = 0; i < 5; i++) {
    const k = ((t * 0.55 + i / 5) % 1);
    g.save(); g.globalAlpha = 1 - k; heartIcon(g, 160 + Math.sin(k * 6 + i * 2) * 60, 230 - k * 210, 26 + i * 4, i % 2 ? "#FF7BA9" : "#FFFFFF"); g.restore();
  }
  const b = t % 1.1;
  const s = 1 + 0.14 * Math.sin(Math.PI * cl01(b / 0.18)) + 0.08 * Math.sin(Math.PI * cl01((b - 0.22) / 0.16));
  g.save(); g.translate(160, 220); g.scale(s, s); heartIcon(g, 0, 0, 170, c); g.restore();
  if (f[0]) txt(g, f[0], 160, 330, { font: `800 36px ${F.pre}`, fill: "#FFFFFF", stroke: "#111111", lw: 8 });
  return cv;
};

/** 알림 종 — 흔들리고 빨간 숫자 동그라미가 톡 (2초마다) */
const bellBadge: Draw = (f, c, t) => {
  const { c: cv, g } = mk(300, 300);
  const k = t % 2;
  const ang = Math.sin(k * 24) * 0.5 * Math.max(0, 1 - k / 1.1);
  g.beginPath(); g.arc(150, 155, 110, 0, Math.PI * 2); g.fillStyle = c; g.fill();
  bellIcon(g, 150, 162, 130, ink(c), ang);
  const n = f[0] || "1";
  const bs = eBack(seg(k, 0.1, 0.45));
  if (bs > 0) {
    const bw = Math.max(70, tw(`900 44px ${F.pre}`, n) + 34);
    g.save(); g.translate(222, 70); g.scale(bs, bs);
    rr(g, -bw / 2, -35, bw, 70, 35); g.fillStyle = "#FF2D2D"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#FFFFFF"; g.stroke();
    txt(g, n, 0, 3, { font: `900 44px ${F.pre}`, fill: "#FFFFFF" });
    g.restore();
  }
  return cv;
};

/** 좋아요 수 올라가기 — 엄지 + 0 → 숫자 (한 번) */
const likeCount: Draw = (f, c, t) => {
  const target = Number(String(f[0] || "1,234").replace(/[^\d]/g, "")) || 0;
  const label = f[1] || "좋아요";
  const font = `900 64px ${F.pre}`;
  const W = 150 + tw(font, fmtNum(target)) + 30 + tw(`700 40px ${F.pre}`, label) + 70, H = 160;
  const { c: cv, g } = mk(W, H);
  rr(g, 10, 20, W - 20, 120, 60); g.fillStyle = "#FFFFFF"; g.fill();
  const pop = 1 + 0.2 * Math.sin(Math.PI * seg(t, 1.3, 1.6));
  g.save(); g.translate(80, 80); g.scale(pop, pop); g.beginPath(); g.arc(0, 0, 48, 0, Math.PI * 2); g.fillStyle = c; g.fill(); thumbUp(g, 0, -2, 56, "#FFFFFF"); g.restore();
  const n = target * eOut(seg(t, 0.2, 1.4));
  txt(g, fmtNum(n), 150, 82, { font, fill: "#111111", align: "left" });
  txt(g, label, 150 + tw(font, fmtNum(target)) + 24, 86, { font: `700 40px ${F.pre}`, fill: "#666666", align: "left" });
  return cv;
};

/** SNS 팔로우 하단 바 — 로고 네모가 톡 나오고 오른쪽으로 글 띠가 펼쳐짐 (한 번) */
type SnsKind = "youtube" | "insta" | "tiktok" | "blog" | "web";
function snsLogo(g: CanvasRenderingContext2D, kind: SnsKind, x: number, y: number, s: number) {
  if (kind === "youtube") { rr(g, x, y, s, s, s * 0.24); g.fillStyle = "#FFFFFF"; g.fill(); playMark(g, x + s * 0.14, y + s * 0.26, s * 0.72, s * 0.48); return; }
  if (kind === "insta") {
    const gr = g.createLinearGradient(x, y + s, x + s, y);
    gr.addColorStop(0, "#FEDA75"); gr.addColorStop(0.35, "#FA7E1E"); gr.addColorStop(0.65, "#D62976"); gr.addColorStop(1, "#4F5BD5");
    rr(g, x, y, s, s, s * 0.26); g.fillStyle = gr; g.fill();
    g.lineWidth = s * 0.08; g.strokeStyle = "#FFFFFF"; rr(g, x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.6, s * 0.18); g.stroke();
    g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.15, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(x + s * 0.68, y + s * 0.32, s * 0.04, 0, Math.PI * 2); g.fillStyle = "#FFFFFF"; g.fill();
    return;
  }
  if (kind === "tiktok") {
    rr(g, x, y, s, s, s * 0.24); g.fillStyle = "#111111"; g.fill();
    const note = (dx: number, dy: number, col: string) => {
      g.save(); g.translate(dx, dy); g.fillStyle = col;
      g.beginPath(); g.arc(x + s * 0.4, y + s * 0.66, s * 0.13, 0, Math.PI * 2); g.fill();
      g.fillRect(x + s * 0.48, y + s * 0.2, s * 0.08, s * 0.47);
      g.beginPath(); g.moveTo(x + s * 0.56, y + s * 0.2); g.quadraticCurveTo(x + s * 0.6, y + s * 0.36, x + s * 0.76, y + s * 0.38); g.lineTo(x + s * 0.76, y + s * 0.47); g.quadraticCurveTo(x + s * 0.62, y + s * 0.46, x + s * 0.56, y + s * 0.38); g.closePath(); g.fill();
      g.restore();
    };
    note(-s * 0.03, -s * 0.03, "#25F4EE"); note(s * 0.03, s * 0.03, "#FE2C55"); note(0, 0, "#FFFFFF");
    return;
  }
  if (kind === "blog") { rr(g, x, y, s, s, s * 0.24); g.fillStyle = "#03C75A"; g.fill(); txt(g, "blog", x + s / 2, y + s / 2 + 2, { font: `900 ${Math.round(s * 0.32)}px ${F.pre}`, fill: "#FFFFFF" }); return; }
  // 홈페이지 — 지구
  rr(g, x, y, s, s, s * 0.24); g.fillStyle = "#2F7CF6"; g.fill();
  g.save(); g.strokeStyle = "#FFFFFF"; g.lineWidth = s * 0.06;
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.3;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.stroke();
  g.restore();
}
const snsBar = (kind: SnsKind): Draw => (f, c, t) => {
  const s = f[0] || "@공실뉴스", small = f[1] || "";
  const font = `800 50px ${F.pre}`, sf = `600 30px ${F.pre}`;
  const L = 130, bw = Math.max(tw(font, s), tw(sf, small)) + 80;
  const W = L + 20 + bw + 20, H = 170;
  const { c: cv, g } = mk(W, H);
  const lk = eBack(seg(t, 0, 0.35));
  const open = eOut(seg(t, 0.3, 0.85));
  // 띠
  if (open > 0) {
    const x = L / 2 + 20, w = (bw + L / 2) * open;
    rr(g, x, 25, w, 120, 60); g.fillStyle = c; g.fill();
    g.save(); rr(g, x, 25, w, 120, 60); g.clip();
    const ta = seg(t, 0.55, 0.9);
    g.globalAlpha = ta;
    const fg = ink(c);
    txt(g, s, L + 40, small ? 70 : 87, { font, fill: fg, align: "left" });
    if (small) txt(g, small, L + 40, 112, { font: sf, fill: fg === "#111111" ? "#444444" : "#DDDDDD", align: "left" });
    g.restore();
  }
  // 로고
  if (lk > 0) {
    g.save(); g.translate(20 + L / 2, H / 2); g.scale(lk, lk);
    g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 14; g.shadowOffsetY = 4;
    snsLogo(g, kind, -L / 2, -L / 2, L);
    g.restore();
  }
  return cv;
};

// 구독 버튼
add("구독 버튼", "구독 누르기 (빨강)", "motion", [{ label: "버튼 글", def: "구독" }, { label: "누른 뒤", def: "구독중" }], "#E5252A", 0.32, A.pop, subscribeClick(false), { y: 0.78, clicks: [1.0] });
add("구독 버튼", "구독 누르기 (흰색)", "motion", [{ label: "버튼 글", def: "구독하기" }, { label: "누른 뒤", def: "구독 완료" }], "#FFFFFF", 0.32, A.pop, subscribeClick(true), { y: 0.78, clicks: [1.0] });
add("구독 버튼", "채널 구독 카드", "motion", [{ label: "채널명", def: "공실뉴스" }, { label: "작은 글", def: "부동산 뉴스 · 매물 소개" }, { label: "버튼 글", def: "구독" }, { label: "누른 뒤", def: "구독중" }], "#2F7CF6", 0.46, A.slideL, channelCard, { y: 0.8, clicks: [1.3] });
add("구독 버튼", "좋아요 · 구독 · 알림", "motion", [{ label: "좋아요", def: "좋아요" }, { label: "구독", def: "구독" }, { label: "알림", def: "알림 설정" }], "#E5252A", 0.56, A.pop, tripleCta, { y: 0.8, clicks: [0.9, 1.6, 2.3] });
// 좋아요·알림
add("좋아요·알림", "좋아요 엄지", "motion", [{ label: "아래 글", def: "" }], "#2F7CF6", 0.16, A.jelly, likeThumb, { y: 0.5 });
add("좋아요·알림", "하트 쿵쿵", "motion", [{ label: "아래 글", def: "" }], "#FF2D55", 0.16, A.jelly, heartBeat, { y: 0.5 });
add("좋아요·알림", "알림 종", "motion", [{ label: "숫자", def: "1" }], "#FFD400", 0.15, A.jelly, bellBadge, { y: 0.5 });
add("좋아요·알림", "좋아요 수 올라가기", "motion", [{ label: "숫자", def: "1,234" }, { label: "글", def: "좋아요" }], "#2F7CF6", 0.34, A.pop, likeCount, { y: 0.78 });
// SNS 팔로우
add("SNS 팔로우", "유튜브 채널", "motion", [{ label: "채널", def: "@공실뉴스" }, { label: "작은 글", def: "구독하고 새 매물 받아 보기" }], "#FF0000", 0.4, A.none, snsBar("youtube"), { y: 0.86 });
add("SNS 팔로우", "인스타그램", "motion", [{ label: "계정", def: "@gongsilnews" }, { label: "작은 글", def: "" }], "#FFFFFF", 0.36, A.none, snsBar("insta"), { y: 0.86 });
add("SNS 팔로우", "틱톡", "motion", [{ label: "계정", def: "@gongsilnews" }, { label: "작은 글", def: "" }], "#111111", 0.36, A.none, snsBar("tiktok"), { y: 0.86 });
add("SNS 팔로우", "네이버 블로그", "motion", [{ label: "블로그", def: "blog.naver.com/공실뉴스" }, { label: "작은 글", def: "" }], "#FFFFFF", 0.42, A.none, snsBar("blog"), { y: 0.86 });
add("SNS 팔로우", "홈페이지 주소", "motion", [{ label: "주소", def: "gongsilnews.com" }, { label: "작은 글", def: "매물 더 보기" }], "#1E3A8A", 0.4, A.none, snsBar("web"), { y: 0.86 });

/* ════════ 12. 부동산 표시광고 — 끝 화면 중개사무소 정보 (2026-10-20 사장님: 표시·광고 기준, 상호부터 · 움직이는 디자인 10가지) ════════
 *  칸: 상호 · 대표 공인중개사 · 등록번호 · 소재지 · 연락처 · 매물 정보(엔터로 줄). 빈 칸은 그리지 않는다 (지어내지 않음)
 *  한 번 나타나고 끝 모습에서 멈춘다. 그림 크기는 글 길이로만 정한다 (t 와 상관없이 같게) */
type AdTheme = {
  bg: string | string[]; // 바탕 (두 색이면 그라데이션)
  fg: string; sub: string; accent: string; nameColor?: string; radius: number; border?: string;
  fx: "rise" | "bar" | "band" | "draw" | "shine" | "split" | "type" | "icons" | "stamp" | "glow";
};
const AD_THEMES: { label: string; color: string; th: AdTheme }[] = [
  { label: "네이비 클래식", color: "#C9A86A", th: { bg: "#0B1A33", fg: "#FFFFFF", sub: "#C7D2E4", accent: "#C9A86A", radius: 28, fx: "rise" } },
  { label: "화이트 미니멀", color: "#111111", th: { bg: "#FFFFFF", fg: "#111111", sub: "#555555", accent: "#2F7CF6", radius: 24, fx: "bar" } },
  { label: "그린 신뢰", color: "#0E9F6E", th: { bg: "#FFFFFF", fg: "#14261C", sub: "#4B5D52", accent: "#0E9F6E", nameColor: "#FFFFFF", radius: 26, fx: "band" } },
  { label: "골드 프리미엄", color: "#D4AF37", th: { bg: "#0A0A0A", fg: "#F5E6B8", sub: "#BFA770", accent: "#D4AF37", radius: 18, border: "#D4AF37", fx: "draw" } },
  { label: "블루 그라데이션", color: "#FFFFFF", th: { bg: ["#1E40AF", "#3B82F6"], fg: "#FFFFFF", sub: "#DCE7FF", accent: "#FFFFFF", radius: 30, fx: "shine" } },
  { label: "명함형", color: "#E5252A", th: { bg: "#FFFFFF", fg: "#111111", sub: "#555555", accent: "#E5252A", radius: 20, fx: "split" } },
  { label: "타자 치듯", color: "#22C55E", th: { bg: "#111827", fg: "#F9FAFB", sub: "#9CA3AF", accent: "#22C55E", radius: 22, fx: "type" } },
  { label: "아이콘 목록", color: "#F59E0B", th: { bg: "#FFFBEB", fg: "#1F2937", sub: "#57534E", accent: "#F59E0B", radius: 28, fx: "icons" } },
  { label: "도장 찍기", color: "#DC2626", th: { bg: "#FFFFFF", fg: "#111111", sub: "#4B5563", accent: "#DC2626", radius: 16, fx: "stamp" } },
  { label: "다크 글래스 네온", color: "#22D3EE", th: { bg: "rgba(15,23,42,0.86)", fg: "#E2E8F0", sub: "#94A3B8", accent: "#22D3EE", radius: 32, border: "#22D3EE", fx: "glow" } },
];
const AD_FIELDS: Field[] = [
  { label: "상호", def: "공실뉴스 공인중개사사무소" },
  { label: "대표 공인중개사", def: "홍길동" },
  { label: "등록번호", def: "11680-2026-00000" },
  { label: "소재지", def: "서울 강남구 논현동 000-00" },
  { label: "연락처", def: "02-000-0000" },
  { label: "매물 정보 (엔터로 줄)", def: "논현동 빌라/연립 · 전세 5억 · 105.8㎡\n3층/총 4층 · 남향 · 즉시 입주", multi: true },
];
const adDraw = (theme: AdTheme): Draw => (f, c, t) => {
  const th = { ...theme, accent: c || theme.accent };
  const name = f[0] || "", ceo = f[1] ? `대표 공인중개사  ${f[1]}` : "", reg = f[2] ? `등록번호  ${f[2]}` : "";
  const addr = f[3] || "", tel = f[4] || "";
  const listing = lines(f[5] || "").filter(Boolean).slice(0, 4);
  const NF = `900 74px ${F.pre}`, IF = `600 42px ${F.pre}`, LF = `500 36px ${F.pre}`;
  const info = [ceo, reg, addr && `소재지  ${addr}`, tel && `☎  ${tel}`].filter(Boolean) as string[];
  const icoW = th.fx === "icons" ? 70 : 0;
  const innerW = Math.max(900, tw(NF, name) + (th.fx === "stamp" ? 220 : 0), ...info.map((s) => tw(IF, s) + icoW), ...listing.map((s) => tw(LF, s)));
  const padX = 80, headH = th.fx === "band" ? 150 : 120;
  const W = innerW + padX * 2;
  const H = 60 + headH + info.length * 62 + (listing.length ? 40 + listing.length * 50 : 0) + 60;
  const { c: cv, g } = mk(W + 40, H + 40);
  const X = 20, Y = 20;
  // 등장 — 카드 전체 (fx 마다 조금씩 다르게)
  const cardK = eOut(seg(t, 0, 0.45));
  g.save();
  if (th.fx === "split") g.globalAlpha = cardK;
  else { g.globalAlpha = cardK; g.translate(0, (1 - cardK) * 40); }
  // 바탕
  g.save(); g.shadowColor = "rgba(0,0,0,0.4)"; g.shadowBlur = 30; g.shadowOffsetY = 10;
  rr(g, X, Y, W, H, th.radius);
  if (Array.isArray(th.bg)) { const gr = g.createLinearGradient(X, Y, X + W, Y + H); gr.addColorStop(0, th.bg[0]); gr.addColorStop(1, th.bg[1]); g.fillStyle = gr; } else g.fillStyle = th.bg;
  g.fill(); g.restore();
  g.save(); rr(g, X, Y, W, H, th.radius); g.clip();
  // 효과별 장식
  if (th.fx === "band") { const k = eOut(seg(t, 0.2, 0.7)); g.fillStyle = th.accent; g.fillRect(X, Y, W * k, headH + 30); }
  if (th.fx === "bar") { const k = eOut(seg(t, 0.25, 0.8)); g.fillStyle = th.accent; g.fillRect(X, Y, 18, H * k); }
  if (th.fx === "rise") { const k = eOut(seg(t, 0.3, 0.9)); g.fillStyle = th.accent; g.fillRect(X + padX, Y + 60 + headH - 18, (W - padX * 2) * k, 4); }
  if (th.fx === "split") { const k = eOut(seg(t, 0.15, 0.6)); g.fillStyle = th.accent; g.fillRect(X, Y, 26 * k + 4, H); g.fillRect(X + W - (26 * k + 4), Y, 26 * k + 4, H); }
  if (th.fx === "shine") { const k = seg(t, 0.5, 1.4); if (k > 0 && k < 1) { const x = X - 300 + (W + 600) * k; const gr = g.createLinearGradient(x - 150, 0, x + 150, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(X, Y, W, H); } }
  if (th.fx === "type") { g.fillStyle = hex(th.accent, 0.12); for (let yy = Y; yy < Y + H; yy += 8) g.fillRect(X, yy, W, 2); }
  g.restore();
  // 테두리 — 그려지듯 (골드·네온)
  if (th.border) {
    const k = th.fx === "draw" ? eOut(seg(t, 0.2, 1.1)) : 1;
    g.save();
    if (th.fx === "glow") { g.shadowColor = th.accent; g.shadowBlur = 26 + 10 * Math.sin(t * 3); }
    g.lineWidth = th.fx === "draw" ? 5 : 4; g.strokeStyle = th.border;
    const per = 2 * (W - 30 + H - 30);
    g.setLineDash([per * k, per]);
    rr(g, X + 15, Y + 15, W - 30, H - 30, Math.max(4, th.radius - 10)); g.stroke();
    g.restore();
  }
  // 글 — 줄마다 차례로
  let y = Y + 60 + headH / 2 - 6;
  const reveal = (i: number) => (th.fx === "type" ? 1 : eOut(seg(t, 0.35 + i * 0.13, 0.75 + i * 0.13)));
  const typed = (s: string, i: number) => (th.fx === "type" ? Array.from(s).slice(0, Math.floor(Array.from(s).length * seg(t, 0.3 + i * 0.35, 0.3 + i * 0.35 + 0.5))).join("") : s);
  const line = (s: string, i: number, font: string, color: string, x: number, yy: number) => {
    const k = reveal(i);
    if (k <= 0) return;
    g.save(); g.globalAlpha *= k;
    const dx = th.fx === "split" ? (i % 2 ? 1 : -1) * (1 - k) * 80 : 0, dy = th.fx === "split" ? 0 : (1 - k) * 22;
    txt(g, typed(s, i), x + dx, yy + dy, { font, fill: color, align: "left" });
    g.restore();
  };
  // 상호 (맨 먼저 · 가장 크게)
  const nameColor = th.fx === "band" ? th.nameColor || "#FFFFFF" : th.fx === "draw" || th.fx === "glow" ? th.accent : th.fg;
  if (th.fx === "stamp") {
    const k = seg(t, 0.25, 0.55);
    const s = k <= 0 ? 0 : 1 + 1.4 * (1 - eOut(k));
    if (s > 0) {
      g.save(); g.translate(X + W - padX - 80, Y + 60 + headH / 2 - 4); g.rotate(-0.18); g.scale(s, s); g.globalAlpha *= Math.min(1, k * 3);
      g.beginPath(); g.arc(0, 0, 74, 0, Math.PI * 2); g.lineWidth = 8; g.strokeStyle = th.accent; g.stroke();
      g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.lineWidth = 3; g.stroke();
      txt(g, "공인", 0, -16, { font: `900 34px ${F.head}`, fill: th.accent }); txt(g, "중개사", 0, 22, { font: `900 30px ${F.head}`, fill: th.accent });
      g.restore();
    }
  }
  line(name, 0, NF, nameColor, X + padX, y);
  y += headH / 2 + 40;
  info.forEach((s, i) => {
    if (th.fx === "icons") {
      const k = eBack(seg(t, 0.45 + i * 0.13, 0.75 + i * 0.13));
      if (k > 0) { g.save(); g.translate(X + padX + 22, y); g.scale(k, k); g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fillStyle = th.accent; g.fill(); txt(g, ["人", "No", "◎", "☎"][Math.min(3, i)], 0, 1, { font: `900 22px ${F.pre}`, fill: "#FFFFFF" }); g.restore(); }
      line(s.replace(/^(대표 공인중개사|등록번호|소재지|☎)\s+/, (m) => m), i + 1, IF, th.fg, X + padX + icoW, y);
    } else line(s, i + 1, IF, th.fx === "band" ? th.fg : th.sub === th.fg ? th.fg : th.fg, X + padX, y);
    y += 62;
  });
  if (listing.length) {
    const k = reveal(info.length + 1);
    g.save(); g.globalAlpha *= k; g.fillStyle = hex(th.sub, 0.5); g.fillRect(X + padX, y - 4, (W - padX * 2) * k, 2); g.restore();
    y += 44;
    listing.forEach((s, i) => { line(s, info.length + 2 + i, LF, th.sub, X + padX, y); y += 50; });
  }
  g.restore();
  return cv;
};
AD_THEMES.forEach((d) => add("부동산 표시광고", d.label, "motion", AD_FIELDS, d.color, 0.86, A.fade, adDraw(d.th), { y: 0.5 }));
/** 부동산 표시광고 템플릿 목록 (AI 편집 끝 화면) */
export const AD_LAW_LABELS = AD_THEMES.map((d) => d.label);

/* ── 그래픽 즐겨찾기 (2026-10-20 사장님) — 그래픽·템플릿 칸 오른쪽 위 ☆. 이 PC 에 저장, [내 설정] 탭 맨 위에 모인다
 *  key: "tpl:<템플릿 id>" · "stk:<스티커 모양|글|아이콘|색>" */
const GFAV_KEY = "studio.graphicFav.v1";
const GFAV_EV = "gsv-graphic-fav";
export function loadGFav(): string[] {
  try { const v = JSON.parse(localStorage.getItem(GFAV_KEY) || "[]"); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
export function toggleGFav(key: string) {
  const cur = loadGFav();
  const next = cur.includes(key) ? cur.filter((x) => x !== key) : [key, ...cur].slice(0, 300);
  try { localStorage.setItem(GFAV_KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event(GFAV_EV));
}
export function useGFav(): string[] {
  const [v, setV] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadGFav()));
  useEffect(() => {
    const on = () => setV(loadGFav());
    window.addEventListener(GFAV_EV, on);
    return () => window.removeEventListener(GFAV_EV, on);
  }, []);
  return v;
}
/** 칸 오른쪽 위 ☆/★ */
export function FavStar({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" title={on ? "즐겨찾기에서 빼기" : "즐겨찾기 — [내 그래픽]에 모여요"} onClick={(e) => { e.stopPropagation(); onClick(); }} onDoubleClick={(e) => e.stopPropagation()}
      style={{ position: "absolute", top: 4, right: 4, width: 26, height: 26, borderRadius: 13, border: 0, background: on ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)", color: on ? "#FFD400" : "#FFFFFF", fontSize: 16, lineHeight: "26px", padding: 0, cursor: "pointer", zIndex: 2 }}>{on ? "★" : "☆"}</button>
  );
}

export const TEMPLATES = T;
export const TPL_CATS: { id: string; kind: "text" | "sticker" }[] = [
  { id: "자막바", kind: "text" }, { id: "제목", kind: "text" }, { id: "말풍선·카드", kind: "text" }, { id: "브이로그", kind: "text" }, { id: "예능 글자", kind: "text" },
  { id: "예능 자막", kind: "text" }, { id: "검색창·화면", kind: "text" }, { id: "가리키기", kind: "sticker" }, { id: "반응", kind: "sticker" }, { id: "움직이는", kind: "sticker" },
  { id: "구독 버튼", kind: "sticker" }, { id: "좋아요·알림", kind: "sticker" }, { id: "SNS 팔로우", kind: "sticker" }, { id: "부동산 표시광고", kind: "sticker" },
];
export const tplOf = (style?: string) => (isTplStyle(style) ? T.find((x) => x.id === String(style).slice(TPL_PREFIX.length)) || null : null);
export const isMotionStyle = (style?: string) => tplOf(style)?.kind === "motion";

/** 템플릿 그림 — t 초(움직이는 템플릿은 그 순간, 아니면 다 나온 모습) */
export function drawTemplate(style: string, text: string, color: string | undefined, t = 999): HTMLCanvasElement {
  const d = tplOf(style);
  if (!d) return mk(4, 4).c;
  const fields = tplFieldsOf(text);
  const vals = d.fields.map((fd, i) => (fields[i] !== undefined ? fields[i] : fd.def));
  return drawWith(d, vals, color || d.color, t, tplOptsOf(text));
}

/** 템플릿을 레이어로 나누기 (이미지 편집) — 글 없는 판·장식 그림 + 칸마다 글 자리·모양 */
export type TplText = { field: number; text: string; box: { x: number; y: number; w: number; h: number }; family: string; px: number; weight: number; italic: boolean;
  fill: string; stroke?: string; lw?: number; glow?: string; shadow?: string; align: "left" | "center" | "right" };
export function tplSplit(id: string, fields?: string[], color?: string): { def: TplDef; vals: string[]; full: HTMLCanvasElement; decor: HTMLCanvasElement; texts: TplText[] } | null {
  const d = T.find((x) => x.id === id);
  if (!d) return null;
  const vals = d.fields.map((fd, i) => (fields?.[i] !== undefined ? fields[i] : fd.def));
  const col = color || d.color;
  const fieldOf = (s: string) => {
    const t = String(s || "").trim();
    if (!t) return -1;
    return vals.findIndex((v) => lines(v).some((L) => L && (L === t || t.includes(L) || L.includes(t))));
  };
  const run = (show: number[]) => {
    SPLIT = { fieldOf, show: new Set(show), calls: [] };
    try { return { c: d.draw(vals, col, 999), calls: SPLIT.calls }; } finally { SPLIT = null; }
  };
  const all = run(vals.map((_, i) => i));
  const decor = run([]).c;
  const W = all.c.width, H = all.c.height;
  const dd = decor.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
  const texts: TplText[] = [];
  for (let i = 0; i < vals.length; i++) {
    const call = all.calls.find((c) => c.fi === i);
    if (!call || decor.width !== W || decor.height !== H) continue;
    const one = run([i]).c;
    if (one.width !== W || one.height !== H) continue;
    // 그 칸 글만 넣었을 때 달라진 곳 = 글 자리
    const od = one.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = (y * W + x) * 4;
      if (Math.abs(od[k] - dd[k]) + Math.abs(od[k + 1] - dd[k + 1]) + Math.abs(od[k + 2] - dd[k + 2]) + Math.abs(od[k + 3] - dd[k + 3]) > 40) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) continue;
    const m = /^(italic\s+)?(?:(\d{3}|bold|normal)\s+)?([\d.]+)px\s+(.+)$/.exec(call.font.trim());
    const px = m ? Number(m[3]) : 40;
    const family = m ? m[4].split(",")[0].replace(/["']/g, "").trim() : "Pretendard";
    const weight = m?.[2] === "bold" ? 700 : m?.[2] && /^\d+$/.test(m[2]) ? Number(m[2]) : 400;
    texts.push({
      field: i, text: vals[i], box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, family, px, weight, italic: Boolean(m?.[1]),
      fill: call.fill, stroke: call.stroke, lw: call.lw, glow: call.glow, shadow: call.shadow,
      align: call.align === "left" || call.align === "start" ? "left" : call.align === "right" || call.align === "end" ? "right" : "center",
    });
  }
  return { def: d, vals, full: all.c, decor, texts };
}
/** 칸 글이 그려진 너비 (글꼴 크기 맞추기용) */
export function tplTextWidth(t: TplText) {
  const f = `${t.italic ? "italic " : ""}${t.weight} ${t.px}px "${t.family}", "Malgun Gothic", sans-serif`;
  return Math.max(1, ...lines(t.text).map((L) => tw(f, L)));
}

/* ── 미리보기: 움직이는 템플릿 (칸마다 다시 그림) ── */
export function TplMotion({ style, text, color, t, opacity, flip }: { style: string; text: string; color?: string; t: number; opacity: number; flip?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const src = drawTemplate(style, text, color, t);
    if (cv.width !== src.width || cv.height !== src.height) { cv.width = src.width; cv.height = src.height; }
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(src, 0, 0);
  }, [style, text, color, t]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block", opacity, transform: flip, pointerEvents: "none" }} />;
}

/* ── 고르기 칸 ── */
const thumbCache = new Map<string, string>();
function thumbOf(d: TplDef) {
  if (!thumbCache.has(d.id)) {
    try {
      const big = d.draw(d.fields.map((x) => x.def), d.color, d.kind === "motion" ? 2.5 : 999);
      const k = Math.min(1, 300 / big.width, 150 / big.height);
      const s = mk(big.width * k, big.height * k);
      s.g.drawImage(big, 0, 0, s.c.width, s.c.height);
      thumbCache.set(d.id, s.c.toDataURL("image/png"));
    } catch {
      thumbCache.set(d.id, "");
    }
  }
  return thumbCache.get(d.id) || "";
}

export function TemplatePanel({ project, kind, onInsert, onClose, cat0, bare, only, init, noGrid, onSave, replacing }: {
  /** [그래픽 바꾸기]로 열었을 때 — 단추 이름만 (2026-10-21) */
  replacing?: boolean;
  /** 스티커 칸 안에 넣을 때 (2026-10-20 사장님: 템플릿을 스티커 분류로) — 이 분류만, 칸 틀·분류 칩 없이 */
  cat0?: string;
  bare?: boolean;
  /** 분류 대신 이 조건에 맞는 것만 (스티커 탭 · 찾기) */
  only?: (d: TplDef) => boolean;
  /** 처음 고른 것 (내 설정에서 열 때) */
  init?: { id: string; text: string; color: string };
  /** 고르기 칸 없이 고치는 칸만 */
  noGrid?: boolean;
  /** [내 설정에 저장] */
  onSave?: (x: { id: string; label: string; text: string; color: string }) => void;
  project: Project;
  /** text = [텍스트]에서 연 것 (글 템플릿), sticker = [스티커]에서 연 것 (가리키기·반응·움직이는) */
  kind: "text" | "sticker";
  onInsert: (item: LibItem, o: { anim: LayerAnim; w: number; y?: number; spec: { style: string; text: string; color?: string }; clicks?: number[] }) => void | Promise<void>;
  onClose: () => void;
}) {
  const b = videoBridge()!;
  const favs = useGFav();
  const cats = TPL_CATS.filter((x) => x.kind === kind);
  const [cat, setCat] = useState(cat0 || cats[0].id);
  const list = only ? T.filter(only) : T.filter((x) => x.cat === cat);
  const first = (init && T.find((x) => x.id === init.id)) || list[0] || T[0];
  const [pick, setPick] = useState<TplDef>(first);
  const [vals, setVals] = useState<string[]>(() => first.fields.map((f, i) => (init ? tplFieldsOf(init.text)[i] ?? f.def : f.def)));
  const [color, setColor] = useState(init?.color || first.color);
  const [opt, setOpt] = useState<TplOpts>(() => (init ? tplOptsOf(init.text) : {}));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => { tplFonts().then(() => setReady(true)); }, []);
  // 움직이는 템플릿 미리보기 — 계속 움직여 보여 준다
  useEffect(() => {
    if (pick.kind !== "motion") return;
    const t0 = performance.now();
    const id = window.setInterval(() => setTick((performance.now() - t0) / 1000), 1000 / 20);
    return () => window.clearInterval(id);
  }, [pick]);
  const [picked, setPicked] = useState(Boolean(init || noGrid)); // 스티커 칸 안: 고른 뒤에만 고치는 칸을 위에
  const choose = (d: TplDef) => { setPick(d); setVals(d.fields.map((f) => f.def)); setColor(d.color); setPicked(true); };
  const [saved, setSaved] = useState(false);
  const preview = useMemo(() => {
    if (!ready) return "";
    try { return drawWith(pick, vals.map((v, i) => v ?? pick.fields[i].def), color, pick.kind === "motion" ? tick % 6 : 999, opt).toDataURL("image/png"); } catch { return ""; }
  }, [ready, pick, vals, color, tick, opt]);
  const insert = async () => {
    if (!b.lib.saveImage) return setErr("공실스튜디오를 껐다 켜 주세요 (템플릿 기능을 새로 연결해요)");
    setBusy(true);
    setErr("");
    try {
      await tplFonts();
      const style = TPL_PREFIX + pick.id;
      const text = tplTextOf(vals, opt);
      const url = drawTemplate(style, text, color).toDataURL("image/png");
      const item = await b.lib.saveImage(project.dir, url, `템플릿_${pick.label}`);
      await onInsert(item, { anim: pick.anim, w: pick.w, y: pick.y, spec: { style, text, color }, clicks: pick.clicks });
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  /** 끌어 놓기 — 끌기 시작할 때 그 템플릿(고른 것이면 고친 글·색으로)을 기억해 두고, 놓는 곳이 그린다 */
  const dragStart = (e: React.DragEvent, d: TplDef) => {
    if (!b.lib.saveImage) return;
    const mine = d.id === pick.id;
    const style = TPL_PREFIX + d.id;
    const text = mine ? tplTextOf(vals, opt) : tplTextOf(d.fields.map((f) => f.def));
    const col = mine ? color : d.color;
    e.dataTransfer.setData(DRAG_STICKER, d.label);
    e.dataTransfer.effectAllowed = "copy";
    stickerDrag.make = async () => {
      await tplFonts();
      const url = drawTemplate(style, text, col).toDataURL("image/png");
      const item = await b.lib.saveImage!(project.dir, url, `템플릿_${d.label}`);
      return { item, o: { anim: d.anim, w: d.w, y: d.y, spec: { style, text, color: col } } };
    };
  };
  const chip = (on: boolean): React.CSSProperties => ({ height: 30, padding: "0 11px", borderRadius: 15, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" });
  const checker = "repeating-conic-gradient(#2a2f3a 0% 25%, #222630 0% 50%) 50% / 16px 16px";
  const input: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14, fontFamily: FONT, boxSizing: "border-box" };
  const grid = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {list.map((d) => {
        const th = ready ? thumbOf(d) : "";
        return (
          <div key={d.id} style={{ position: "relative" }}>
          <button type="button" title={`${d.label} — 한 번 누르면 고르기, 두 번 누르면 바로 넣기, 끌어서 클립·미리보기에 놓아도 돼요`} onClick={() => choose(d)} onDoubleClick={() => { choose(d); setTimeout(insert, 0); }}
            draggable onDragStart={(e) => { if (d.id !== pick.id) choose(d); dragStart(e, d); }}
            style={{ width: "100%", height: 96, padding: 6, borderRadius: 8, border: `2px solid ${pick.id === d.id ? C.accent : "transparent"}`, background: checker, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {th ? <img src={th} alt="" style={{ maxWidth: "100%", maxHeight: 62, objectFit: "contain" }} /> : null}
            <span style={{ fontSize: 11.5, color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.label}</span>
          </button>
          <FavStar on={favs.includes(`tpl:${d.id}`)} onClick={() => toggleGFav(`tpl:${d.id}`)} />
          </div>
        );
      })}
    </div>
  );
  if (bare)
    return (
      <div>
        {/* 고른 템플릿 — 글·글꼴·글자 크기·색 고치고 넣기 (고르면 목록 위에) */}
        {picked && (
        <div style={noGrid ? undefined : { position: "sticky", top: 0, zIndex: 3, background: C.panel, margin: "0 -16px 14px", padding: "10px 16px 14px", borderBottom: `1px solid ${C.line}`, boxShadow: "0 8px 16px rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{pick.label}{pick.kind === "motion" && <span style={{ fontSize: 12, color: C.accent, marginLeft: 6 }}>움직여요</span>}{!noGrid && <button type="button" title="닫기 — 보던 목록 그대로" onClick={() => setPicked(false)} style={{ width: 26, height: 26, marginLeft: "auto", border: 0, borderRadius: 4, background: "transparent", color: C.sub, fontSize: 18, lineHeight: "26px", padding: 0, cursor: "pointer" }}>×</button>}</div>
          <div style={{ height: 150, borderRadius: 10, background: checker, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line2}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="" draggable onDragStart={(e) => dragStart(e, pick)} title="끌어서 클립·미리보기·타임라인에 놓으면 들어가요" style={{ maxWidth: "94%", maxHeight: 136, objectFit: "contain", cursor: "grab" }} /> : <span style={{ color: C.dim, fontSize: 13 }}>글꼴을 받는 중…</span>}
          </div>
          <div style={{ height: 10 }} />
          {pick.fields.map((fd, i) => (
            <div key={fd.label + i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 4 }}>{fd.label}</div>
              {fd.multi ? (
                <textarea value={vals[i] ?? ""} rows={Math.min(8, Math.max(2, (vals[i] || "").split("\n").length))} onChange={(e) => setVals((v) => v.map((x, k) => (k === i ? e.target.value : x)))} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} />
              ) : (
                <input value={vals[i] ?? ""} onChange={(e) => setVals((v) => v.map((x, k) => (k === i ? e.target.value : x)))} style={{ ...input, height: 36 }} />
              )}
            </div>
          ))}
          <TplOptRow value={opt} onChange={setOpt} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, color: C.sub, width: 52 }}>색</span>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#FFD400"} onChange={(e) => setColor(e.target.value.toUpperCase())} style={{ width: 44, height: 30, border: 0, background: "transparent", padding: 0, cursor: "pointer" }} />
            <button type="button" onClick={() => setColor(pick.color)} style={chip(false)}>처음 색</button>
          </div>
          <div style={{ display: "flex", gap: 8, margin: "12px 0 4px" }}>
            {onSave && <Btn onClick={() => { onSave({ id: pick.id, label: pick.label, text: tplTextOf(vals, opt), color }); setSaved(true); setTimeout(() => setSaved(false), 1500); }} style={{ flex: 1, justifyContent: "center" }}>{saved ? "저장했어요" : "내 그래픽에 저장"}</Btn>}
            <Btn primary onClick={insert} disabled={busy || !ready} style={{ flex: 1, justifyContent: "center" }}>{busy ? (replacing ? "바꾸는 중…" : "넣는 중…") : replacing ? "이 그래픽으로 바꾸기" : "화면에 넣기"}</Btn>
          </div>
          {err && <div style={{ marginTop: 12, fontSize: 14, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
        </div>
        )}
        {!noGrid && grid}
      </div>
    );
  return (
    <Side title={kind === "text" ? "글자 템플릿" : "가리키기·반응·움직이는 템플릿"} onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>넣은 뒤 화면에서 끌어 옮기고 모서리로 크기를 바꿔요. 글은 오른쪽 칸에서 다시 고칠 수 있어요.</span>
          <Btn primary onClick={insert} disabled={busy || !ready}>{busy ? (replacing ? "바꾸는 중…" : "넣는 중…") : replacing ? "이 그래픽으로 바꾸기" : "화면에 넣기"}</Btn>
        </div>
      }>
      <div style={{ padding: "4px 16px 20px" }}>
        <div style={{ marginTop: 10, height: 170, borderRadius: 10, background: checker, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line2}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" draggable onDragStart={(e) => dragStart(e, pick)} title="끌어서 클립·미리보기·타임라인에 놓으면 들어가요" style={{ maxWidth: "94%", maxHeight: 156, objectFit: "contain", cursor: "grab" }} /> : <span style={{ color: C.dim, fontSize: 13 }}>글꼴을 받는 중…</span>}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, margin: "12px 0 6px" }}>{pick.label}{pick.kind === "motion" && <span style={{ fontSize: 12, color: C.accent, marginLeft: 6 }}>움직여요</span>}</div>
        {pick.fields.map((fd, i) => (
          <div key={fd.label + i} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 4 }}>{fd.label}</div>
            {fd.multi ? (
              <textarea value={vals[i] ?? ""} rows={Math.min(8, Math.max(2, (vals[i] || "").split("\n").length))} onChange={(e) => setVals((v) => v.map((x, k) => (k === i ? e.target.value : x)))} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} />
            ) : (
              <input value={vals[i] ?? ""} onChange={(e) => setVals((v) => v.map((x, k) => (k === i ? e.target.value : x)))} style={{ ...input, height: 36 }} />
            )}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 12.5, color: C.sub }}>색</span>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#FFD400"} onChange={(e) => setColor(e.target.value.toUpperCase())} style={{ width: 44, height: 30, border: 0, background: "transparent", padding: 0, cursor: "pointer" }} />
          <button type="button" onClick={() => setColor(pick.color)} style={chip(false)}>처음 색</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "16px 0 10px" }}>
          {cats.map((c) => <button key={c.id} type="button" onClick={() => { setCat(c.id); choose(T.filter((x) => x.cat === c.id)[0]); }} style={chip(cat === c.id)}>{c.id} {T.filter((x) => x.cat === c.id).length}</button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {list.map((d) => {
            const th = ready ? thumbOf(d) : "";
            return (
              <div key={d.id} style={{ position: "relative" }}>
              <button type="button" title={`${d.label} — 한 번 누르면 고르기, 두 번 누르면 바로 넣기, 끌어서 클립·미리보기에 놓아도 돼요`} onClick={() => choose(d)} onDoubleClick={() => { choose(d); setTimeout(insert, 0); }}
                draggable onDragStart={(e) => { if (d.id !== pick.id) choose(d); dragStart(e, d); }}
                style={{ width: "100%", height: 96, padding: 6, borderRadius: 8, border: `2px solid ${pick.id === d.id ? C.accent : "transparent"}`, background: checker, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {th ? <img src={th} alt="" style={{ maxWidth: "100%", maxHeight: 62, objectFit: "contain" }} /> : null}
                <span style={{ fontSize: 11.5, color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.label}</span>
              </button>
              <FavStar on={favs.includes(`tpl:${d.id}`)} onClick={() => toggleGFav(`tpl:${d.id}`)} />
              </div>
            );
          })}
        </div>
        {err && <div style={{ marginTop: 12, fontSize: 14, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
      </div>
    </Side>
  );
}

/** 글꼴·글자 크기 두 가지 (2026-10-20) */
export function TplOptRow({ value, onChange }: { value: TplOpts; onChange: (o: TplOpts) => void }) {
  const sel: React.CSSProperties = { flex: 1, minWidth: 0, height: 32, padding: "0 8px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 13.5, fontFamily: FONT };
  const k = value.k || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: C.sub, width: 52, flexShrink: 0 }}>글꼴</span>
        <select value={value.font || ""} onChange={(e) => onChange({ ...value, font: e.target.value || undefined })} style={{ ...sel, fontFamily: value.font ? `"${value.font}", ${FONT}` : FONT }}>
          {TPL_FONTS.map((f) => <option key={f.id} value={f.id} style={{ fontFamily: f.id ? `"${f.id}"` : undefined }}>{f.label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12.5, color: C.sub, width: 52, flexShrink: 0 }}>글자 크기</span>
        {TPL_SIZES.map((x) => (
          <button key={x.k} type="button" onClick={() => onChange({ ...value, k: x.k === 1 ? undefined : x.k })}
            style={{ flex: 1, height: 30, borderRadius: 6, border: `1px solid ${k === x.k ? C.accent : C.line2}`, background: k === x.k ? C.accentDim : "transparent", color: k === x.k ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{x.label}</button>
        ))}
      </div>
    </div>
  );
}

/** 오른쪽 칸 — 넣어 둔 템플릿 글 고치기 (칸마다) */
export function TemplateFields({ style, text, color, onSave }: { style: string; text: string; color?: string; onSave: (text: string, color?: string) => Promise<void> }) {
  const d = tplOf(style);
  const init = d ? d.fields.map((fd, i) => tplFieldsOf(text)[i] ?? fd.def) : [];
  const opt0 = tplOptsOf(text);
  const [vals, setVals] = useState<string[]>(init);
  const [opt, setOpt] = useState<TplOpts>(opt0);
  const [col, setCol] = useState(color || d?.color || "#FFD400");
  const [busy, setBusy] = useState(false);
  if (!d) return null;
  const changed = tplTextOf(vals, opt) !== tplTextOf(init, opt0) || col !== (color || d.color);
  const input: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14, fontFamily: FONT, boxSizing: "border-box" };
  return (
    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{d.label}</div>
      {d.fields.map((fd, i) => (
        <div key={fd.label + i} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 4 }}>{fd.label}</div>
          {fd.multi ? <textarea value={vals[i]} rows={Math.min(8, Math.max(2, vals[i].split("\n").length))} onChange={(e) => setVals((v) => v.map((x, k) => (k === i ? e.target.value : x)))} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} />
            : <input value={vals[i]} onChange={(e) => setVals((v) => v.map((x, k) => (k === i ? e.target.value : x)))} style={{ ...input, height: 36 }} />}
        </div>
      ))}
      <TplOptRow value={opt} onChange={setOpt} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: C.sub }}>색</span>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(col) ? col : "#FFD400"} onChange={(e) => setCol(e.target.value.toUpperCase())} style={{ width: 44, height: 30, border: 0, background: "transparent", padding: 0 }} />
        <span style={{ flex: 1 }} />
        <Btn small primary disabled={!changed || busy} onClick={async () => { setBusy(true); try { await tplFonts(); await onSave(tplTextOf(vals, opt), col); } finally { setBusy(false); } }}>{busy ? "그리는 중…" : "바꾸기"}</Btn>
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>모양·자리·움직임은 그대로, 글·글꼴·글자 크기·색만 바뀌어요.</div>
    </div>
  );
}
