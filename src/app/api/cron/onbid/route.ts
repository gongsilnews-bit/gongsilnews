import { NextResponse } from "next/server";
import { syncOnbidProperties } from "@/app/actions/onbidSync";

export const maxDuration = 300; // Vercel 최대 실행 시간 5분 설정

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const urlObj = new URL(req.url);
  const isManualRun = urlObj.searchParams.get("manual") === "true";

  // 보안 인증 검증 (Vercel Cron Secret 검증 또는 수동 실행 매개변수 확인)
  if (!isVercelCron && process.env.CRON_SECRET && !isManualRun) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  console.log("🤖 온비드 공매 물건 동기화 스케줄러 작동 시작...");
  const result = await syncOnbidProperties();
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      message: "온비드 동기화 완료",
      registered: result.registered,
      skipped: result.skipped
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error
    }, { status: 500 });
  }
}
