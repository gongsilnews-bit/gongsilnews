import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { studioWebOp } from "@/utils/studio-web/writer";

/**
 * 웹 뉴스·SNS자동화 (2026-11-03 사장님: 앱의 공실뉴스 부분을 웹에서도 똑같이)
 * 프롬프트 만들기 · AI 답 나누기 · SNS 글 끝 · 네이버 블록 — 계산은 utils/studio-web/writer.ts. 로그인 회원만.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  try {
    return NextResponse.json({ success: true, ...studioWebOp(String(b?.op || ""), b || {}) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
