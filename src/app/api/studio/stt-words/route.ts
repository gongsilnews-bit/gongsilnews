import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { addFixes, sharedRules } from "@/lib/sttWords";

/**
 * 받아쓰기 낱말장 (스튜디오 앱 0.1.10부터) — 비용 없음 (AI 안 씀, 목록만 주고받음)
 *  GET  → { rules: [{ wrong, right }] }  모든 대표님에게 쓰는 공용 규칙 (앱이 켤 때 받아 둔다)
 *  POST { pairs: [{ wrong, right, context }] } → 대표님이 [말한 내용 고치기]로 고친 낱말을 모은다
 */
export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json({ success: true, rules: await sharedRules().catch(() => []) });
}

export async function POST(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const { pairs } = await req.json().catch(() => ({}));
  try {
    return NextResponse.json({ success: true, added: await addFixes(member.id, Array.isArray(pairs) ? pairs : []) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
