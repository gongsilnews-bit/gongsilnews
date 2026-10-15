import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { consumeStudio, getStudioUsage } from "@/utils/studioUsage";

/**
 * 공실뉴스 스튜디오 이용 횟수
 *  GET  → 이번 달·오늘 사용 현황 (SNS뉴스발행 화면 위쪽 표시)
 *  POST { kind: "blog" | "sns", vacancyId } | { kind: "ai_image" } → 쓰기 전에 확인하고 기록 (앱이 부름)
 * 로그인 쿠키(앱 창·웹 화면)로 회원을 확인한다.
 */
export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const [usage, snsUsage] = await Promise.all([getStudioUsage(member, "blog"), getStudioUsage(member, "sns")]);
  return NextResponse.json({ success: true, usage, snsUsage });
}

export async function POST(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = body?.kind === "ai_image" ? "ai_image" : body?.kind === "sns" ? "sns" : "blog";
  const vacancyId = typeof body?.vacancyId === "string" ? body.vacancyId : undefined;
  const r = await consumeStudio(member, kind, vacancyId);
  if (!r.ok) return NextResponse.json({ success: false, error: r.reason, usage: r.usage }, { status: 403 });
  return NextResponse.json({ success: true, charged: r.charged, usage: r.usage });
}
