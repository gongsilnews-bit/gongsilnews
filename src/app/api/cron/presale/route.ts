// 분양 단지 하루 한 번 받기 (2026-11-26 사장님: 신축/분양 지도에 청약홈 분양 정보) — src/utils/presale.ts
//  청약홈에서 최근 6개월 공고를 받아 presale_complexes 에 넣고, 좌표 없는 곳을 카카오로 찾는다
import { NextResponse } from "next/server";
import { db } from "@/utils/aptMap";
import { syncPresales } from "@/utils/presale";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }
  try {
    const done = await syncPresales(db(), Date.now() + 270_000);
    return NextResponse.json({ success: true, ...done });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
