import { NextResponse } from "next/server";
import { syncOnbidProperties, refreshOnbidMetadata } from "@/app/actions/onbidSync";

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

  console.log(`🤖 온비드 공매 물건 동기화 시작 (대상: ${targetRegions.join(", ")})`);

  const results: any[] = [];
  for (const sido of targetRegions) {
    console.log(`📍 ${sido} 동기화 중...`);
    const syncResult = await syncOnbidProperties(sido.trim());
    results.push({ sido: sido.trim(), ...syncResult });

    // 동기화 후 즉시 metadata 보강
    if (syncResult.success && (syncResult.registered || 0) > 0) {
      const refreshResult = await refreshOnbidMetadata(sido.trim());
      results.push({ sido: sido.trim(), type: "metadata_refresh", ...refreshResult });
    }
  }

  return NextResponse.json({
    success: true,
    message: "온비드 동기화 완료",
    results
  });
}
