// 성우 녹음 저장소: 같은 대사·목소리는 한 번만 녹음하고 reels 버킷에 두고 다시 쓴다.
// 편집 화면 미리보기와 MP4 렌더가 같은 파일을 써서 박자까지 똑같다.
import { createHash } from "node:crypto";
import { synthesize } from "./gemini";
import { reelsAdminClient } from "./listing";

// Gemini 성우 30명 중 부동산 소개에 어울리는 12명 (여성 6 · 남성 6, 2026-10-06 녹음 확인)
export const REEL_VOICES = ["Aoede", "Kore", "Leda", "Zephyr", "Sulafat", "Achernar", "Puck", "Charon", "Fenrir", "Achird", "Algieba", "Sadaltager"] as const;
const BUCKET = "reels";
const RATE = 24000;

function voicePath(vacancyId: string, text: string, voice: string) {
  // v2: 끝 "찌직" 잡음을 잘라 낸 뒤로 다시 녹음 (예전 저장본은 쓰지 않음)
  const h = createHash("sha1").update(`v2\n${voice}\n${text}`).digest("hex").slice(0, 20);
  return `voice/${vacancyId}/${h}.wav`;
}

/** 녹음을 찾거나 새로 만든다. duration 은 WAV 크기로 계산 (24kHz 16bit mono) */
export async function getVoice(vacancyId: string, text: string, voice: string): Promise<{ path: string; wav: Buffer; duration: number; cached: boolean }> {
  const db = reelsAdminClient();
  const path = voicePath(vacancyId, text, voice);
  const { data } = await db.storage.from(BUCKET).download(path);
  if (data) {
    const wav = Buffer.from(await data.arrayBuffer());
    return { path, wav, duration: (wav.length - 44) / 2 / RATE, cached: true };
  }
  const { wav, duration } = await synthesize(text, voice);
  await db.storage.from(BUCKET).upload(path, wav, { contentType: "audio/wav", upsert: true });
  return { path, wav, duration, cached: false };
}

/** 다시 녹음 (숫자 검사에서 다르게 들린 경우) */
export async function revoice(vacancyId: string, text: string, voice: string) {
  const { wav, duration } = await synthesize(text, voice);
  const path = voicePath(vacancyId, text, voice);
  await reelsAdminClient().storage.from(BUCKET).upload(path, wav, { contentType: "audio/wav", upsert: true });
  return { path, wav, duration };
}

export async function signedVoiceUrl(path: string) {
  const { data } = await reelsAdminClient().storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl || null;
}
