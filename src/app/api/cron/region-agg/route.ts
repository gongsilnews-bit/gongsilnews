// 지역 평균(시·도·시군구·동) 하루 한 번 새로 계산해 region_agg 표에 저장 (2026-11-18 사장님: 지역 고르기가 처음에 오래 걸림)
//  실거래 모으기(apt-prices/round)가 끝난 뒤 낮 12시(한국)에 — 앱·지도는 저장된 것을 읽기만 해서 배포와 상관없이 빠르다
import { NextResponse } from "next/server";
import { db } from "@/utils/aptMap";
import { saveRegionAgg, type AptKind } from "@/utils/aptRegionAgg";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }
  const supabase = db();
  const done: Record<string, unknown> = {};
  for (const kind of ["apt", "offi", "villa"] as AptKind[]) {
    const t = Date.now();
    try {
      const d = await saveRegionAgg(supabase, kind);
      done[kind] = { sido: d.sido.length, gu: d.gu.length, dong: d.dong.length, ms: Date.now() - t };
    } catch (e) {
      done[kind] = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  return NextResponse.json({ success: true, done });
}
