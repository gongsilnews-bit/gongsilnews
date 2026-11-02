// 공실열람 지도 [아파트 시세] 읽기 (2026-11-02). 모으기는 /api/cron/apt-prices
//  GET ?sw=37.49,127.03&ne=37.52,127.07   화면 안 단지 (거래 많은 순 400개까지)
//  GET ?id=11680:대치동:1014-3              단지 하나 — 매매·전월세 거래 전부 + 평형·세대수 + 단지 정보 (상세 창이 계산)
import { NextRequest, NextResponse } from "next/server";
import { db, withAgent } from "@/utils/aptMap";

const headers = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };

/** 이 단지에 붙은 공실·경매 — 지금 탭과 상관없이 DB 에서 직접 (2026-11-02: 경매 탭에서 "공실 없음"으로 잘못 나오던 것) */
async function listingsOf(supabase: ReturnType<typeof db>, id: string) {
  const { data } = await supabase.from("vacancies").select("id, trade_type").eq("complex_id", id).eq("status", "ACTIVE").limit(200);
  const rows = data || [];
  return {
    vacancy_ids: rows.filter((r) => r.trade_type !== "경매").map((r) => String(r.id)),
    auction_ids: rows.filter((r) => r.trade_type === "경매").map((r) => String(r.id)),
  };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const supabase = db();

  const id = params.get("id");
  if (id) {
    const { data, error } = await supabase.from("apt_complexes")
      .select("id, kind, name, dong, jibun, lawd_cd, build_year, lat, lng, trades, rents, supply_map, agent_supply, unit_map, info, agent_info, trade_count, updated_at")
      .eq("id", id).maybeSingle();
    if (error || !data) return NextResponse.json({ success: false, error: error?.message || "단지를 찾지 못했습니다." }, { status: 404 });
    // 부동산이 보완한 값이 공공 자료보다 우선 — 어느 칸이 부동산 값인지도 함께 (화면에 "공인중개사 제공")
    const { agent_supply: agentSupply, agent_info: agentInfo, ...rest } = data;
    const complex = {
      ...rest,
      supply_map: withAgent(data.supply_map, agentSupply),
      info: data.info || agentInfo ? { ...(data.info || {}), ...(agentInfo || {}) } : null,
      agent_fields: [...Object.keys(agentInfo || {}), ...(agentSupply && Object.keys(agentSupply).length ? ["supply"] : [])],
      agent_supply_keys: Object.keys(agentSupply || {}),
      ...(await listingsOf(supabase, data.id)),
    };
    return NextResponse.json({ success: true, complex }, { headers: { "Cache-Control": "no-store" } });
  }

  const [swLat, swLng] = String(params.get("sw") || "").split(",").map(Number);
  const [neLat, neLng] = String(params.get("ne") || "").split(",").map(Number);
  if (![swLat, swLng, neLat, neLng].every(Number.isFinite)) {
    return NextResponse.json({ success: false, error: "지도 범위(sw, ne)가 필요합니다." }, { status: 400 });
  }
  const { data, error } = await supabase.from("apt_complexes")
    .select("id, kind, name, lat, lng, rep_area, rep_supply, rep_price, rep_date, trade_count")
    .gte("lat", swLat).lte("lat", neLat).gte("lng", swLng).lte("lng", neLng)
    .gt("trade_count", 0)
    .order("trade_count", { ascending: false })
    .limit(400);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, complexes: data || [] }, { headers });
}
