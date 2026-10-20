// 글자 템플릿의 움직임 (2026-10-20 사장님: "템플릿은 글자에 애니메이션을 입힌 것 — 니가 어울리는 움직임을 붙여줘")
//  꾸민 글자(SubPresets 분류) · 예능 자막(varietyPresets 분류)마다 어울리는 인·아웃·반복. 같은 분류 안에서는 차례대로 돌려 써서 비슷한 것끼리도 다르게
//  고른 뒤 [애니메이션] 탭에서 얼마든지 바꿀 수 있다
import type { LayerAnim } from "./types";

const A = (inn: LayerAnim["in"], out: LayerAnim["out"], emph?: LayerAnim["emph"], dur = 0.5): LayerAnim => ({ in: inn, out, ...(emph ? { emph } : {}), dur });

const BY_GROUP: Record<string, LayerAnim[]> = {
  // 꾸민 글자
  "기본": [A("fade", "fade"), A("slideL", "fade"), A("fly", "fade"), A("zoom", "fade")],
  "글꼴": [A("fade", "fade"), A("slideR", "fade"), A("zoom", "fade"), A("fly", "fade")],
  "상자": [A("stretch", "fade"), A("slideL", "slideR"), A("flip", "fade"), A("fly", "fade")],
  "네온·빛": [A("zoom", "fade", "blink"), A("fade", "fade", "pulse"), A("zoom", "zoom", "blink")],
  "예능·유튜브": [A("pop", "zoom", "bounce"), A("jelly", "fade"), A("drop", "fade", "shake"), A("big", "fade"), A("stretch", "fade", "beat")],
  "다큐·뉴스": [A("fade", "fade", undefined, 0.7), A("slideL", "fade", undefined, 0.6), A("fly", "fade", undefined, 0.6)],
  // 예능 자막 160
  "기본자막": [A("fade", "fade"), A("fly", "fade")],
  "일본예능": [A("pop", "zoom", "bounce"), A("jelly", "fade"), A("big", "fade", "shake"), A("drop", "fade", "beat")],
  "납량특집": [A("fade", "fade", "wiggle", 0.8), A("drop", "fade", "shake"), A("zoom", "fade", "blink")],
  "썸네일&로고": [A("zoom", "fade", "pulse"), A("spin", "fade"), A("big", "zoom")],
  "패션&뷰티": [A("fade", "fade", "float"), A("slideR", "fade"), A("zoom", "fade", "float")],
  "놀면뭐하니": [A("pop", "zoom", "bounce"), A("stretch", "fade"), A("jelly", "fade", "sway")],
  "뭉쳐야쏜다": [A("big", "fade", "beat"), A("drop", "fade"), A("pop", "zoom", "shake")],
  "여행&브이로그": [A("fly", "fade", "float"), A("slideL", "fade"), A("fade", "fade", "sway")],
  "게임&오락": [A("spin", "zoom"), A("pop", "fade", "wiggle"), A("roll", "fade")],
  "펫&키즈": [A("jelly", "fade", "sway"), A("pop", "fade", "bounce"), A("swing", "fade")],
  "금빛자막": [A("zoom", "fade", "pulse"), A("fade", "fade", "pulse")],
  "네온사인": [A("fade", "fade", "blink"), A("zoom", "fade", "blink")],
  "트렌드자막": [A("slideL", "slideR"), A("pop", "fade"), A("stretch", "fade")],
};

/** 그 분류 index 번째 템플릿의 움직임 */
export function tplAnim(group: string, index: number): LayerAnim {
  const list = BY_GROUP[group] || [A("fade", "fade")];
  return { ...list[Math.max(0, index) % list.length] };
}
