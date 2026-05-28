import { NextResponse } from "next/server";
import { syncOnbidProperties, deduplicateOnbidProperties } from "@/app/actions/onbidSync";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;

function getLogClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const urlObj = new URL(req.url);
  const isManualRun = urlObj.searchParams.get("manual") === "true";
  const sidoParam = urlObj.searchParams.get("sido");
  const dedup = urlObj.searchParams.get("dedup") === "true";

  if (!isVercelCron && process.env.CRON_SECRET && !isManualRun) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  // 중복 정리 모드
  if (dedup) {
    const result = await deduplicateOnbidProperties();
    return NextResponse.json({ message: "중복 정리 완료", ...result });
  }

  const sidos = [
    "서울특별시", "경기도", "인천광역시", "부산광역시", "대구광역시",
    "대전광역시", "광주광역시", "울산광역시", "세종특별자치시", "강원특별자치도",
    "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도",
    "경상남도", "제주특별자치도"
  ];

  const targetRegions = sidoParam ? sidoParam.split(",") : sidos;
  const startTime = Date.now();
  const supabase = getLogClient();

  console.log(`🤖 [v2] 온비드 UPSERT 동기화 시작 (${targetRegions.join(", ")})`);

  const results: any[] = [];
  for (const sido of targetRegions) {
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 240) {
      console.warn(`⏰ ${elapsed.toFixed(0)}초 → 타임아웃! 나머지 스킵`);
      results.push({ sido: sido.trim(), skipped_reason: "timeout_safety" });
      continue;
    }

    console.log(`📍 ${sido} 동기화 중... (${elapsed.toFixed(0)}초)`);
    try {
      const syncResult = await syncOnbidProperties(sido.trim());
      if (!syncResult.success) {
        throw new Error(syncResult.error || "동기화 실패");
      }
      results.push({ sido: sido.trim(), ...syncResult });

      // 즉시 로그 기록
      try {
        await supabase.from("agent_chats").insert({
          channel_id: "onbid_sync_log",
          role: "agent",
          content: JSON.stringify({
            target: sido.trim(),
            registered: syncResult.inserted || 0,
            updated: syncResult.updated || 0,
            expired: syncResult.deleted || 0,
            skipped: syncResult.skipped || 0,
            isManual: isManualRun,
            elapsed: syncResult.elapsed || "0",
            success: true
          })
        });
      } catch (logErr) {
        console.error(`로그 기록 실패:`, logErr);
      }
    } catch (err: any) {
      console.error(`❌ ${sido} 에러:`, err.message);
      results.push({ sido: sido.trim(), success: false, error: err.message });

      // 즉시 에러 로그 기록
      try {
        await supabase.from("agent_chats").insert({
          channel_id: "onbid_sync_log",
          role: "agent",
          content: JSON.stringify({
            target: sido.trim(),
            registered: 0,
            updated: 0,
            expired: 0,
            skipped: 0,
            isManual: isManualRun,
            elapsed: "0",
            success: false,
            error: err.message
          })
        });
      } catch (logErr) {
        console.error(`에러 로그 기록 실패:`, logErr);
      }
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    success: true,
    message: `온비드 v2 동기화 완료 (${totalElapsed}초)`,
    elapsed: totalElapsed,
    results
  });
}
