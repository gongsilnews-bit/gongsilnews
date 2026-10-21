// 템플릿 칸 미리보기 — 그 템플릿의 움직임(인·아웃·반복)을 칸 안에서 계속 (2026-10-21 사장님: 템플릿은 다 애니메이션이 보여야)
//  CSS 키프레임 한 벌을 문서에 한 번 넣고, 칸마다 animation 이름만 붙인다. 한 바퀴 2.6초: 나타나기 → 머무름(반복 움직임) → 사라지기
import type React from "react";
import type { LayerAnim } from "./types";

const IN: Record<string, string> = {
  fade: "opacity:0;",
  fly: "opacity:0;transform:translateY(60%);",
  zoom: "opacity:0;transform:scale(0.4);",
  pop: "opacity:0;transform:scale(0.2);",
  spin: "opacity:0;transform:rotate(-180deg) scale(0.4);",
  flip: "opacity:0;transform:perspective(200px) rotateX(90deg);",
  roll: "opacity:0;transform:translateX(-60%) rotate(-120deg);",
  drop: "opacity:0;transform:translateY(-80%);",
  slideL: "opacity:0;transform:translateX(-70%);",
  slideR: "opacity:0;transform:translateX(70%);",
  big: "opacity:0;transform:scale(2.2);",
  stretch: "opacity:0;transform:scaleX(0.1);",
  swing: "opacity:0;transform:rotate(-25deg);transform-origin:50% 0;",
  jelly: "opacity:0;transform:scale(0.3,1.4);",
};
const EMPH: Record<string, [string, string]> = {
  pulse: ["transform:scale(1);", "transform:scale(1.08);"],
  shake: ["transform:rotate(-4deg);", "transform:rotate(4deg);"],
  blink: ["opacity:1;", "opacity:0.55;"],
  float: ["transform:translateY(0);", "transform:translateY(-8%);"],
  sway: ["transform:rotate(-6deg);", "transform:rotate(6deg);"],
  bounce: ["transform:translateY(0);", "transform:translateY(-14%);"],
  beat: ["transform:scale(1);", "transform:scale(1.1);"],
  wiggle: ["transform:translateX(-3%);", "transform:translateX(3%);"],
};
let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const css: string[] = [];
  for (const [k, from] of Object.entries(IN)) {
    // 한 바퀴: 0~18% 나타나기, 18~82% 머무름, 82~100% 사라지기 (아웃은 나타나기를 거꾸로)
    css.push(`@keyframes gsvtin-${k}{0%{${from}}18%{opacity:1;transform:none;}82%{opacity:1;transform:none;}100%{${from}}}`);
  }
  for (const [k, [a, b]] of Object.entries(EMPH)) css.push(`@keyframes gsvtem-${k}{0%{${a}}50%{${b}}100%{${a}}}`);
  const st = document.createElement("style");
  st.setAttribute("data-gsv", "tpl-preview");
  st.textContent = css.join("\n");
  document.head.appendChild(st);
}
/** 바깥(나타나기·사라지기)·안쪽(반복) 두 겹에 붙일 스타일 */
export function tplPreviewStyles(a: LayerAnim | null | undefined): { outer: React.CSSProperties; inner: React.CSSProperties } {
  inject();
  if (!a) return { outer: {}, inner: {} };
  const inn = a.in && IN[a.in] ? a.in : "fade";
  return {
    outer: { display: "inline-block", animation: `gsvtin-${inn} 2.6s ease-in-out infinite` },
    inner: a.emph && EMPH[a.emph] ? { display: "inline-block", animation: `gsvtem-${a.emph} ${a.emph === "wiggle" ? 0.25 : a.emph === "blink" ? 1.1 : 0.9}s ease-in-out infinite` } : { display: "inline-block" },
  };
}
