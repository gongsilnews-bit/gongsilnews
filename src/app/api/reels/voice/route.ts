// 클립 성우: 같은 대사·목소리는 저장본을 주고, 없으면 녹음해 저장한다 (편집 화면 미리보기용, 약 3초)
import { NextRequest, NextResponse } from "next/server";
import { checkReelAccess } from "@/lib/reels/access";
import { getVoice, REEL_VOICES, signedVoiceUrl } from "@/lib/reels/voice";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { vacancyId, text, voice } = await request.json().catch(() => ({}));
  const tts = String(text || "").trim();
  if (!vacancyId || !tts) return NextResponse.json({ success: false, error: "vacancyId 와 대사가 필요합니다." }, { status: 400 });
  if (tts.length > 120) return NextResponse.json({ success: false, error: "대사가 너무 깁니다." }, { status: 400 });
  if (!(REEL_VOICES as readonly string[]).includes(voice)) return NextResponse.json({ success: false, error: "지원하지 않는 목소리입니다." }, { status: 400 });

  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  try {
    const { path, duration, cached } = await getVoice(vacancyId, tts, voice);
    return NextResponse.json({ success: true, url: await signedVoiceUrl(path), duration, cached });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
