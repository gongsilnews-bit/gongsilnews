"use client";

// 메인자막 [사전 설정 스타일] — 캡컷처럼 눌러서 바로 (2026-10-18 사장님: 자막에서도 사전설정을 미리 만들어 두기)
//  글꼴·색·테두리·상자·그림자·네온 빛을 한 번에 바꾼다. 크기·자리·줄 너비는 그대로.
//  굽기(render.js subtitleStyle)와 미리보기(Player.tsx)가 같은 항목을 쓴다.
import React, { useEffect } from "react";
import type { LayerAnim, SubtitleSettings } from "./types";
import { fontCss, STUDIO_FONTS } from "@/lib/studio-video/fonts";
import { C, FONT } from "./ui";
import { loadFont } from "./Pickers";

export type SubLook = Pick<SubtitleSettings, "font" | "color" | "outline" | "outlineWidth" | "bg" | "bgColor" | "bgOpacity" | "bold" | "shadow" | "shadowColor" | "glow" | "outline2" | "outline2Width" | "gradTo" | "gradType" | "gradAngle" | "gradA" | "gradB">;
/** 글자 모양 (메인자막·화면 글자 같이 쓰는 이름) — 사전설정에 크기·자간·행간까지 */
export type TextLook = Partial<SubLook> & { size?: number; spacing?: number; leading?: number; italic?: boolean; underline?: boolean; textCase?: "upper" | "lower" | "title"; align?: "left" | "center" | "right"; bgPad?: number; shadowAlpha?: number; glowSize?: number; glowAlpha?: number; outlineAlpha?: number; textAlpha?: number };
type Preset = { id: string; label: string; look: SubLook };

const P = (id: string, label: string, o: Partial<SubLook>): Preset => ({
  id, label,
  look: { font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bg: false, bgColor: "#000000", bgOpacity: 0.62, bold: true, shadow: 0, shadowColor: "#000000", glow: "", outline2Width: 0, gradTo: "", gradType: undefined, gradAngle: undefined, gradA: undefined, gradB: undefined, ...o },
});

export const SUB_PRESETS: { group: string; items: Preset[] }[] = [
  {
    group: "기본", items: [
      P("plain", "기본", {}),
      P("thick", "굵은 테두리", { outlineWidth: 6 }),
      P("yellow", "노랑", { color: "#FFE14D", outlineWidth: 5 }),
      P("black", "검정·흰 테", { color: "#111111", outline: "#FFFFFF", outlineWidth: 5 }),
      P("red", "빨강·흰 테", { color: "#FF2D2D", outline: "#FFFFFF", outlineWidth: 5 }),
      P("orange", "주황", { color: "#FF8A00", outlineWidth: 5 }),
      P("sky", "하늘", { color: "#3BB8FF", outlineWidth: 5 }),
      P("lime", "연두", { color: "#7CFF4D", outlineWidth: 5 }),
      P("pink", "분홍", { color: "#FF5FB0", outline: "#FFFFFF", outlineWidth: 5 }),
      P("purple", "보라·흰 테", { color: "#8B3DFF", outline: "#FFFFFF", outlineWidth: 5 }),
      P("thin", "얇은 테+그림자", { outlineWidth: 1.5, shadow: 0.06, shadowColor: "#000000" }),
      P("noline", "그림자만", { outlineWidth: 0, shadow: 0.07, shadowColor: "#000000" }),
    ],
  },
  {
    // 글꼴을 골고루 — 글꼴마다 어울리는 색·테두리·상자 (2026-10-19 사장님: 폰트를 다양하게)
    group: "글꼴", items: [
      P("f-pre", "Pretendard 깔끔", { font: "Pretendard", color: "#FFFFFF", outlineWidth: 4 }),
      P("f-nanum", "나눔고딕 그림자", { font: "NanumGothic", color: "#FFFFFF", outlineWidth: 2, shadow: 0.06 }),
      P("f-gmarket", "지마켓 노랑", { font: "GmarketSans", color: "#FFE14D", outline: "#111111", outlineWidth: 6 }),
      P("f-dohyeon", "도현 분홍 테", { font: "Do Hyeon", color: "#FFFFFF", outline: "#E0157A", outlineWidth: 6 }),
      P("f-jua", "주아 주황 테", { font: "Jua", color: "#FFFFFF", outline: "#FF7A00", outlineWidth: 6 }),
      P("f-yeon", "연성 갈색 테", { font: "Yeon Sung", color: "#FFF4D6", outline: "#5B2E00", outlineWidth: 5, shadow: 0.05 }),
      P("f-malgun", "맑은 고딕 굵게", { font: "Malgun Gothic", color: "#FFFFFF", outlineWidth: 5 }),
      P("f-myeongjo", "명조 그림자", { font: "NanumMyeongjo", color: "#FFFFFF", outlineWidth: 1, shadow: 0.07 }),
      P("f-black", "검은고딕 노랑", { font: "Black Han Sans", color: "#FFE14D", outline: "#111111", outlineWidth: 7 }),
      P("f-gowun", "고운돋움 차분", { font: "Gowun Dodum", color: "#FFFFFF", outlineWidth: 2, shadow: 0.06 }),
      P("f-pen", "손글씨 펜", { font: "Nanum Pen", color: "#FFFFFF", outline: "#111111", outlineWidth: 4 }),
      P("f-song", "송명 감성", { font: "Song Myung", color: "#FFFFFF", outlineWidth: 0, shadow: 0.07 }),
      P("f-gmarket-box", "지마켓 남색 상자", { font: "GmarketSans", color: "#FFFFFF", bg: true, bgColor: "#1A3A6B", bgOpacity: 0.95 }),
      P("f-jua-box", "주아 노란 상자", { font: "Jua", color: "#111111", bg: true, bgColor: "#FFD400", bgOpacity: 1 }),
      P("f-dohyeon-box", "도현 빨간 상자", { font: "Do Hyeon", color: "#FFFFFF", bg: true, bgColor: "#E60012", bgOpacity: 1 }),
      P("f-black-box", "검은고딕 흰 상자", { font: "Black Han Sans", color: "#111111", bg: true, bgColor: "#FFFFFF", bgOpacity: 0.96 }),
      P("f-myeongjo-box", "명조 반투명 상자", { font: "NanumMyeongjo", color: "#FFFFFF", bg: true, bgColor: "#000000", bgOpacity: 0.5 }),
      P("f-pen-box", "손글씨 분홍 상자", { font: "Nanum Pen", color: "#FFFFFF", bg: true, bgColor: "#FF3EA5", bgOpacity: 0.95 }),
    ],
  },
  {
    group: "상자", items: [
      P("box-black", "검은 상자", { bg: true, bgColor: "#000000", bgOpacity: 0.85 }),
      P("box-half", "반투명 상자", { bg: true, bgColor: "#000000", bgOpacity: 0.5 }),
      P("box-white", "흰 상자", { color: "#111111", bg: true, bgColor: "#FFFFFF", bgOpacity: 0.95 }),
      P("box-yellow", "노란 상자", { color: "#111111", bg: true, bgColor: "#FFD400", bgOpacity: 1 }),
      P("box-red", "빨간 상자", { bg: true, bgColor: "#E60012", bgOpacity: 1 }),
      P("box-navy", "공실뉴스 남색", { bg: true, bgColor: "#1A3A6B", bgOpacity: 0.95 }),
      P("box-blue", "파란 상자", { bg: true, bgColor: "#1F5FD6", bgOpacity: 1 }),
      P("box-green", "초록 상자", { bg: true, bgColor: "#16A34A", bgOpacity: 1 }),
      P("box-purple", "보라 상자", { bg: true, bgColor: "#7C3AED", bgOpacity: 1 }),
      P("box-pink", "분홍 상자", { bg: true, bgColor: "#FF3EA5", bgOpacity: 1 }),
      P("box-yellowtext", "검은 상자·노랑", { color: "#FFE14D", bg: true, bgColor: "#000000", bgOpacity: 0.85 }),
      P("box-news", "뉴스 자막", { font: "GmarketSans", bg: true, bgColor: "#0B1F44", bgOpacity: 0.92 }),
    ],
  },
  {
    group: "네온·빛", items: [
      P("neon-pink", "네온 분홍", { outline: "#FF3EA5", outlineWidth: 3, glow: "#FF3EA5" }),
      P("neon-sky", "네온 하늘", { outline: "#22D3EE", outlineWidth: 3, glow: "#22D3EE" }),
      P("neon-gold", "금빛", { color: "#FFF3B0", outline: "#FFB800", outlineWidth: 3, glow: "#FFB800" }),
      P("neon-lime", "네온 연두", { outline: "#39FF14", outlineWidth: 3, glow: "#39FF14" }),
      P("neon-purple", "네온 보라", { outline: "#A855F7", outlineWidth: 3, glow: "#A855F7" }),
      P("neon-red", "네온 빨강", { outline: "#FF2D2D", outlineWidth: 3, glow: "#FF2D2D" }),
      P("glow-white", "하얀 빛", { color: "#FFFFFF", outline: "#FFFFFF", outlineWidth: 2, glow: "#FFFFFF" }),
      P("glow-yellow", "노랑 빛", { color: "#FFE14D", outline: "#000000", outlineWidth: 3, glow: "#FFE14D" }),
    ],
  },
  {
    group: "예능·유튜브", items: [
      P("variety-yellow", "예능 노랑", { font: "Do Hyeon", color: "#FFE14D", outline: "#5B2E00", outlineWidth: 7, shadow: 0.06, shadowColor: "#000000" }),
      P("variety-white", "예능 흰·분홍", { font: "Do Hyeon", color: "#FFFFFF", outline: "#FF3EA5", outlineWidth: 7, shadow: 0.06, shadowColor: "#7A0040" }),
      P("variety-sky", "예능 흰·파랑", { font: "Do Hyeon", color: "#FFFFFF", outline: "#1F5FD6", outlineWidth: 7, shadow: 0.06, shadowColor: "#0B1F44" }),
      P("variety-red", "예능 빨강", { font: "Black Han Sans", color: "#FF2D2D", outline: "#FFFFFF", outlineWidth: 7, shadow: 0.07, shadowColor: "#000000" }),
      P("cute", "귀여운 주아", { font: "Jua", color: "#FFFFFF", outline: "#FF8A00", outlineWidth: 6 }),
      P("cute-pink", "주아 분홍", { font: "Jua", color: "#FFE4F1", outline: "#E0157A", outlineWidth: 6 }),
      P("heavy", "검은고딕", { font: "Black Han Sans", color: "#FFFFFF", outline: "#000000", outlineWidth: 6 }),
      P("heavy-yellow", "검은고딕 노랑", { font: "Black Han Sans", color: "#FFE14D", outline: "#000000", outlineWidth: 6, shadow: 0.06 }),
      P("pen", "손글씨", { font: "Nanum Pen", color: "#FFFFFF", outline: "#000000", outlineWidth: 4 }),
      P("pen-box", "손글씨 흰 상자", { font: "Nanum Pen", color: "#111111", bg: true, bgColor: "#FFFFFF", bgOpacity: 0.95 }),
      P("gmarket", "지마켓 산스", { font: "GmarketSans", color: "#FFFFFF", outlineWidth: 5 }),
      P("dodum", "고운돋움 차분", { font: "Gowun Dodum", color: "#FFFFFF", outlineWidth: 2, shadow: 0.05 }),
    ],
  },
  {
    group: "다큐·뉴스", items: [
      P("docu", "다큐 명조", { font: "NanumMyeongjo", color: "#FFFFFF", outlineWidth: 1.5, shadow: 0.06 }),
      P("docu-gold", "명조 금색", { font: "NanumMyeongjo", color: "#F5D78E", outlineWidth: 1.5, shadow: 0.06 }),
      P("song", "송명 감성", { font: "Song Myung", color: "#FFFFFF", outlineWidth: 0, shadow: 0.07 }),
      P("news-white", "뉴스 흰 상자", { font: "GmarketSans", color: "#0B1F44", bg: true, bgColor: "#FFFFFF", bgOpacity: 0.96 }),
      P("news-red", "속보 빨강", { font: "GmarketSans", color: "#FFFFFF", bg: true, bgColor: "#C8102E", bgOpacity: 1 }),
      P("calm", "차분한 반투명", { font: "Pretendard", color: "#FFFFFF", bg: true, bgColor: "#111827", bgOpacity: 0.55 }),
    ],
  },
];

/** 지금 서식이 이 사전설정과 같은가 */
function same(s: Partial<SubtitleSettings>, l: SubLook) {
  const eq = (a: unknown, b: unknown) => String(a ?? "").toUpperCase() === String(b ?? "").toUpperCase();
  return eq(s.font || "Pretendard", l.font) && eq(s.color, l.color) && Boolean(s.bg) === Boolean(l.bg) &&
    (l.bg ? eq(s.bgColor, l.bgColor) && Math.abs(Number(s.bgOpacity ?? 0.62) - Number(l.bgOpacity ?? 0.62)) < 0.01 : eq(s.outline, l.outline) && Number(s.outlineWidth ?? 3) === Number(l.outlineWidth)) &&
    eq(s.glow || "", l.glow || "") && Number(s.shadow || 0) === Number(l.shadow || 0);
}

/** 미리보기·칸 그림에 쓰는 CSS (Player.tsx 메인자막과 같은 규칙) — px = 글자 크기, k = 화면 배율 */
/** 패턴·대소문자 CSS (미리보기) — 굽기 render.js 와 같은 규칙 */
export const patternCss = (s: { italic?: boolean; underline?: boolean; textCase?: string }): React.CSSProperties => ({
  fontStyle: s.italic ? "italic" : undefined,
  textDecoration: s.underline ? "underline" : undefined,
  textTransform: s.textCase === "upper" ? "uppercase" : s.textCase === "lower" ? "lowercase" : s.textCase === "title" ? "capitalize" : undefined,
});
/** #RRGGBB + 투명도(0~1, 0 = 진하게) → rgba */
export const withAlpha = (hex: string, alpha = 0) => {
  const n = parseInt(String(hex || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, 1 - alpha)).toFixed(3)})`;
};
/** 그라데이션 글자 CSS — 굽기 render.js gradBands 와 같은 모양 (선형·방사형·반사형 · 각도 · 시작/끝 투명도) */
export function gradCss(s: { color?: string; gradTo: string; gradType?: string; gradAngle?: number; gradA?: number; gradB?: number }) {
  const a = withAlpha(s.color || "#FFFFFF", s.gradA ?? 0), b = withAlpha(s.gradTo, s.gradB ?? 0);
  const ang = Number(s.gradAngle ?? 180);
  if (s.gradType === "radial") return `radial-gradient(ellipse farthest-corner at center, ${a}, ${b})`;
  if (s.gradType === "reflect") return `linear-gradient(${ang}deg, ${b}, ${a} 50%, ${b})`;
  return `linear-gradient(${ang}deg, ${a}, ${b})`;
}
export function subLookCss(s: Partial<SubtitleSettings>, px: number, k: number): React.CSSProperties {
  const glow = s.glow ? withAlpha(s.glow, s.glowAlpha ?? 0) : "";
  const gs = Math.max(0.3, Math.min(3, Number(s.glowSize ?? 1)));
  const shadows: string[] = [];
  if (glow) shadows.push(`0 0 ${px * 0.12 * gs}px ${glow}`, `0 0 ${px * 0.28 * gs}px ${glow}`, `0 0 ${px * 0.5 * gs}px ${glow}`);
  if (!s.bg && Number(s.shadow) > 0) shadows.push(`${px * Number(s.shadow)}px ${px * Number(s.shadow)}px 0 ${withAlpha(s.shadowColor || "#000000", s.shadowAlpha ?? 0)}`);
  const ow = Number(s.outlineWidth ?? 3);
  return {
    WebkitTextStroke: s.bg || ow <= 0 ? undefined : `${Math.max(1, ow * k * 2)}px ${withAlpha(s.outline || "#000000", s.outlineAlpha ?? 0)}`,
    textShadow: shadows.length ? shadows.join(", ") : undefined,
  };
}

/** 글자 칸 [텍스트 › 기본] 에 보이는 묶음 / [텍스트 › 편집효과] 에 보이는 묶음 (회의 3-28) */
export const BASIC_GROUPS = ["기본", "글꼴", "상자"];
export const EFFECT_GROUPS = ["네온·빛", "예능·유튜브", "다큐·뉴스"];

/* ── 내 사전설정 — 내가 만든 글자 (모양 + 애니메이션). 이 PC 에 저장 (나중에 계정에 올려 다른 PC 에서도) ── */
export type MyPreset = { id: string; name: string; look: TextLook; anim?: LayerAnim; at: number };
const MY_KEY = "gsv-my-text-presets";
export function loadMyPresets(): MyPreset[] {
  try {
    const v = JSON.parse(localStorage.getItem(MY_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveMyPresets(list: MyPreset[]) {
  try {
    localStorage.setItem(MY_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
}

/** "가나" 칸 하나 — 사전설정 모양 그대로 */
export function LookTile({ look, on, title, onClick, big }: { look: TextLook; on?: boolean; title?: string; onClick: () => void; big?: boolean }) {
  const l = { font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bgOpacity: 0.62, ...look };
  const fs = big ? 24 : 21;
  return (
    <button type="button" title={title} onClick={onClick}
      style={{ width: "100%", height: big ? 64 : 50, borderRadius: 7, border: `2px solid ${on ? C.accent : "transparent"}`, background: l.glow ? "#0d0f15" : "#2b303b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, overflow: "hidden" }}>
      <span style={{
        fontFamily: fontCss(l.font), fontWeight: l.bold === false ? 500 : 800, fontSize: fs, lineHeight: 1.15, color: l.color, paintOrder: "stroke fill", letterSpacing: l.spacing ? `${l.spacing * fs}px` : undefined,
        background: l.bg ? `${l.bgColor || "#000000"}${Math.round((l.bgOpacity ?? 0.62) * 255).toString(16).padStart(2, "0")}` : undefined, padding: l.bg ? "1px 6px" : undefined, borderRadius: l.bg ? 3 : undefined,
        ...subLookCss(l, fs, 0.45),
      }}>가나</span>
    </button>
  );
}

export function SubPresetGrid({ value, onPick, groups }: { value: Partial<SubtitleSettings>; onPick: (look: SubLook) => void; groups?: string[] }) {
  // 사전설정에 쓰는 글꼴 미리 받기
  useEffect(() => {
    const fams = [...new Set(SUB_PRESETS.flatMap((g) => g.items.map((x) => x.look.font)))].filter((f) => STUDIO_FONTS.some((s) => s.family === f));
    fams.forEach((f) => loadFont(f).catch(() => {}));
  }, []);
  return (
    <div>
      {SUB_PRESETS.filter((g) => !groups || groups.includes(g.group)).map((g) => (
        <div key={g.group} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, margin: "6px 0" }}>{g.group}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {g.items.map((p) => {
              const on = same(value, p.look);
              const l = p.look;
              return (
                <button key={p.id} type="button" title={p.label} onClick={() => onPick(p.look)}
                  style={{ height: 50, borderRadius: 7, border: `2px solid ${on ? C.accent : "transparent"}`, background: l.glow ? "#0d0f15" : "#2b303b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, overflow: "hidden" }}>
                  <span style={{
                    fontFamily: fontCss(l.font), fontWeight: l.bold ? 800 : 500, fontSize: 21, lineHeight: 1.15, color: l.color, paintOrder: "stroke fill",
                    background: l.bg ? `${l.bgColor}${Math.round((l.bgOpacity ?? 0.62) * 255).toString(16).padStart(2, "0")}` : undefined, padding: l.bg ? "1px 6px" : undefined, borderRadius: l.bg ? 3 : undefined,
                    ...subLookCss(l, 21, 0.45),
                  }}>가나</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT, lineHeight: 1.5 }}>누르면 글꼴·색·테두리·상자가 한 번에 바뀌어요. 크기·자리는 그대로예요.</div>
    </div>
  );
}
