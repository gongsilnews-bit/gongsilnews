// 경공매 지역별 건수 — 앱 경매 지도를 넓게(시·도, 시군구) 볼 때 (2026-11-16)
//  GET ?level=sido|gu → { success, regions: [{ key, name, lat, lng, n, c: { 아파트: 12, … } }], total }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/aptMap";
import { auctionRegionAgg } from "@/utils/auctionRegionAgg";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const level = req.nextUrl.searchParams.get("level") || "gu";
  if (level !== "sido" && level !== "gu") return NextResponse.json({ success: false, error: "level=sido|gu" }, { status: 400 });
  try {
    const all = await auctionRegionAgg(db());
    return NextResponse.json({ success: true, regions: all[level], total: all.total }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
