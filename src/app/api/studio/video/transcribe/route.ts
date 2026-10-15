import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { geminiJson } from "@/lib/reels/gemini";

/**
 * 영상 편집기 받아쓰기 — 앱이 영상에서 뽑은 소리 한 토막(90초 안팎, 16kHz mono mp3)을 받아 문장과 시간을 준다.
 * 원본 영상은 받지 않는다 (사장님 원칙: 소리만). 시간은 앱이 PC에서 무음 구간으로 다시 맞춘다.
 *  POST { audio: base64, mime?: "audio/mpeg" } → { segments: [{ start, end, text }] } (초, 이 토막 기준)
 */
export const maxDuration = 120;

type Seg = { start: number | string; end: number | string; text: string };

const toSec = (v: number | string) => {
  if (typeof v === "number") return v;
  const p = String(v).split(":").map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : Number(v) || 0;
};

export async function POST(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const { audio, mime } = await req.json().catch(() => ({}));
  if (!audio || typeof audio !== "string") return NextResponse.json({ success: false, error: "소리가 없습니다." }, { status: 400 });
  if (audio.length > 3_500_000) return NextResponse.json({ success: false, error: "소리 토막이 너무 큽니다." }, { status: 413 });
  try {
    const r = await geminiJson<{ segments?: Seg[] }>(
      [
        { inlineData: { mimeType: mime || "audio/mpeg", data: audio } },
        {
          text:
            "이 음성을 들리는 그대로 한국어로 받아 적으세요. 말하는 사람이 한 문장(또는 숨 쉬고 끊는 한 덩어리)마다 하나씩 나눕니다.\n" +
            "- start, end 는 이 음성 파일 맨 앞을 0초로 한 초 단위 숫자 (소수 둘째 자리까지)\n" +
            "- 말이 없는 구간은 넣지 않습니다. 들리지 않는 말을 지어내지 않습니다. 맞춤법만 바르게, 내용은 바꾸지 않습니다.\n" +
            "- 숫자는 들린 대로 아라비아 숫자로 (예: 오억 → 5억, 삼십 평 → 30평)\n" +
            'JSON 으로만 답하세요: {"segments":[{"start":0.0,"end":2.4,"text":"안녕하세요"}]}',
        },
      ],
      "[영상 받아쓰기]"
    );
    const segments = (r.segments || [])
      .map((s) => ({ start: Math.max(0, toSec(s.start)), end: Math.max(0, toSec(s.end)), text: String(s.text || "").trim() }))
      .filter((s) => s.text && s.end > s.start)
      .sort((a, b) => a.start - b.start);
    return NextResponse.json({ success: true, segments });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
