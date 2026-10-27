import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { savePromoFor, PROMO_CHANNELS, type PromoChannel } from "@/utils/vacancyPromos";

/**
 * 공실 홍보현황 — 회원이 발행한 글 주소 (2026-10-27)
 *  POST { vacancyId, channel, url } → 앱이 도우미(크롬 확장)에게서 받은 주소를 "연결됨"으로 저장
 * 로그인 쿠키(앱 창)로 회원을 확인한다.
 */
export async function POST(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const channel = body?.channel as PromoChannel;
  if (typeof body?.vacancyId !== "string" || !PROMO_CHANNELS.includes(channel) || typeof body?.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const r = await savePromoFor(member.id, body.vacancyId, channel, body.url, "helper");
  return NextResponse.json(r, { status: r.success ? 200 : 400 });
}
