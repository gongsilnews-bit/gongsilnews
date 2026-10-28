import { NextResponse } from "next/server";
import { openStudioCode } from "@/utils/studioConnect";

/**
 * 공실마케팅 연결 신호 풀기 (앱 창의 /studio/callback 화면이 부름)
 * 풀어 낸 1회용 토큰으로 화면이 verifyOtp 를 해서 앱 창에 로그인 쿠키가 생긴다.
 */
export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({ code: "" }));
  const payload = typeof code === "string" ? openStudioCode(code) : null;
  if (!payload) {
    return NextResponse.json({ error: "연결 신호가 만료되었거나 올바르지 않습니다. 다시 연결해 주세요." }, { status: 400 });
  }
  return NextResponse.json({ tokenHash: payload.th });
}
