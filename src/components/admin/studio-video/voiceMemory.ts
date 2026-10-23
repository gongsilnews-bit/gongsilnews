// 마지막에 고른 목소리 (이 PC 에 기억) — AI 보이스 녹음 · 영상 꾸미기가 늘 "정훈"으로 시작하던 것 (2026-10-22 사장님)
export type LastVoice = { id: string; speed: number; emotion?: string };
const KEY = "gsv-voice-last";
export function lastVoice(): LastVoice | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && typeof v.id === "string" ? { id: v.id, speed: Number(v.speed) || 1, emotion: typeof v.emotion === "string" ? v.emotion : undefined } : null;
  } catch {
    return null;
  }
}
export function saveLastVoice(v: LastVoice) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
}
