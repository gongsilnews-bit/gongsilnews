import { NextResponse } from "next/server";
import { syncSmartstoreOrders } from "@/lib/smartstoreSync";

/**
 * 스마트스토어 결제 자동 연동 Cron Job (5분마다)
 * 결제된 공실스터디 수강권 주문을 가져와 공실스터디부동산 멤버십을 켜고, 취소되면 되돌린다.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  // CRON_SECRET 이 있을 때만 확인 (다른 cron 과 같게) — 2026-11-24: Vercel 에 CRON_SECRET 이 없고
  //  x-vercel-cron 헤더도 오지 않아 실서버에서 늘 401 이었다
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 네이버 키가 아직 없는 서버(실서버 설정 전)에서는 아무것도 하지 않는다
  if (!process.env.NAVER_COMMERCE_CLIENT_ID || !process.env.NAVER_COMMERCE_CLIENT_SECRET) {
    return NextResponse.json({ success: true, skipped: "NAVER_COMMERCE 키 없음" });
  }

  try {
    const result = await syncSmartstoreOrders();
    if (result.errors.length) console.error("[smartstore-sync] 오류:", result.errors);
    return NextResponse.json({ success: result.errors.length === 0, ...result });
  } catch (e: any) {
    console.error("[smartstore-sync] 실패:", e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
