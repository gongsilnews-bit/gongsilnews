import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { getVoice, signedVoiceUrl } from "@/lib/reels/voice";
import { STUDIO_VOICE_IDS } from "@/lib/studio-video/voices";

/**
 * 영상 편집기 AI 목소리 — 문장 하나를 성우로 녹음해 주소를 준다 (앱이 내려받아 PC 프로젝트에 둔다)
 *  POST { text, voice } → { url, duration }
 *  같은 문장·같은 목소리는 한 번만 녹음하고 다시 쓴다 (reels 버킷 voice/studio/<회원>/…).
 *  속도·음량·높이는 앱이 PC에서 바꾼다 (다시 녹음하지 않는다).
 */
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const { text, voice } = await req.json().catch(() => ({}));
  const tts = String(text || "").replace(/\s+/g, " ").trim();
  if (!tts) return NextResponse.json({ success: false, error: "읽을 문장이 없습니다." }, { status: 400 });
  if (tts.length > 300) return NextResponse.json({ success: false, error: "문장이 너무 깁니다 (300자 이하). 클립을 나눠 주세요." }, { status: 400 });
  if (!STUDIO_VOICE_IDS.includes(voice)) return NextResponse.json({ success: false, error: "지원하지 않는 목소리입니다." }, { status: 400 });
  try {
    const { path, duration, cached } = await getVoice(`studio/${member.id}`, tts, voice);
    return NextResponse.json({ success: true, url: await signedVoiceUrl(path), duration, cached });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
