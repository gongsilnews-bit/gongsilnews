import { NextResponse } from "next/server";
import { syncOnbidProperties } from "@/app/actions/onbidSync";

export const maxDuration = 300; // Vercel 최대 실행 시간 5분 설정

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const urlObj = new URL(req.url);
  const isManualRun = urlObj.searchParams.get("manual") === "true";
  const sidoParam = urlObj.searchParams.get("sido");

  // 보안 인증 검증 (Vercel Cron Secret 검증 또는 수동 실행 매개변수 확인)
  if (!isVercelCron && process.env.CRON_SECRET && !isManualRun) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const sidos = [
    "서울특별시", "경기도", "인천광역시", "부산광역시", "대구광역시", 
    "대전광역시", "광주광역시", "울산광역시", "세종특별자치시", "강원특별자치도", 
    "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", 
    "경상남도", "제주특별자치도"
  ];

  // 대상 지역 결정: sido 파라미터가 있으면 해당 지역, 없으면 전국 17개 시도
  const targetRegions = sidoParam ? sidoParam.split(",") : sidos;
  const startTime = Date.now();

  console.log(`🤖 온비드 공매 물건 동기화 시작 (대상: ${targetRegions.join(", ")})`);

  const results: any[] = [];
  for (const sido of targetRegions) {
    // 안전 타임아웃: 4분(240초) 경과 시 나머지 시도 스킵 (Vercel 5분 리밋 안전 마진)
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 240) {
      console.warn(`⏰ ${elapsed.toFixed(0)}초 경과 → 안전 타임아웃! 나머지 시도 스킵합니다.`);
      results.push({ sido: sido.trim(), skipped_reason: "timeout_safety", elapsed: `${elapsed.toFixed(0)}s` });
      continue;
    }

    console.log(`📍 ${sido} 동기화 중... (경과: ${elapsed.toFixed(0)}초)`);
    try {
      const syncResult = await syncOnbidProperties(sido.trim());
      results.push({ sido: sido.trim(), ...syncResult });
    } catch (err: any) {
      console.error(`❌ ${sido} 동기화 중 오류:`, err.message);
      results.push({ sido: sido.trim(), success: false, error: err.message });
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── 수집 로그 DB(agent_chats)에 기록 ──
  try {
    const aggregated = results.reduce((acc, r) => {
      if (!r.skipped_reason) {
        acc.registered += r.registered || 0;
        acc.skipped += r.skipped || 0;
        acc.expired += r.expired || 0;
      }
      return acc;
    }, { registered: 0, skipped: 0, expired: 0 });

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await supabase.from("agent_chats").insert({
      channel_id: "onbid_sync_log",
      role: "system",
      content: JSON.stringify({
        target: sidoParam || "전국",
        registered: aggregated.registered,
        skipped: aggregated.skipped,
        expired: aggregated.expired,
        isManual: isManualRun,
        elapsed: totalElapsed
      })
    });
  } catch (logErr) {
    console.error("❌ 온비드 동기화 로그 기록 실패:", logErr);
  }

  return NextResponse.json({
    success: true,
    message: `온비드 동기화 완료 (${totalElapsed}초)`,
    elapsed: totalElapsed,
    results
  });
}
