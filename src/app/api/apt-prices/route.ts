// 공실열람 지도 [아파트 시세] 읽기 (2026-11-02). 모으기는 /api/cron/apt-prices
//  GET ?sw=37.49,127.03&ne=37.52,127.07   화면 안 단지 (거래 많은 순 400개까지)
//  GET ?id=11680:대치동:1014-3              단지 하나 — 매매·전월세 거래 전부 + 평형·세대수 + 단지 정보 (상세 창이 계산)
import { NextRequest, NextResponse } from "next/server";
import { db, UNITS_FIXED_AT, withAgent } from "@/utils/aptMap";
import { LAWD_NAMES, type Trade } from "@/utils/aptMapShared";

// NEW 배지 — 새 거래가 들어온 때 (supabase/migrations/20261104_apt_complexes_new_at.sql). 칸이 아직 없으면 빼고 읽는다
let NEW_COL = ", new_at";
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

  // 마우스를 올린 단지 — 이름 · 주소 · 라벨 면적의 달마다 평균 매매가 (최근 36개월, 2026-11-02 사장님: 호갱노노처럼)
  const peek = params.get("peek");
  if (peek) {
    const { data } = await supabase.from("apt_complexes").select("id, kind, name, dong, jibun, lawd_cd, trades, rep_area").eq("id", peek).maybeSingle();
    if (!data) return NextResponse.json({ success: false }, { status: 404 });
    const byMonth = new Map<string, number[]>();
    for (const t of (data.trades || []) as Trade[]) {
      if (data.rep_area && Math.abs(t.a - data.rep_area) > 0.5) continue;
      const m = t.d.slice(0, 7);
      byMonth.set(m, [...(byMonth.get(m) || []), t.p]);
    }
    const all = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([m, ps]) => ({ m, p: Math.round(ps.reduce((s, x) => s + x, 0) / ps.length) }));
    // 앞뒤 달과 30% 넘게 다른 한 달(직거래·특수 거래)은 흐름에서 뺀다 — 선이 뚝 떨어져 보이지 않게
    const series = all.filter((x, i) => {
      const near = all.slice(Math.max(0, i - 2), i).concat(all.slice(i + 1, i + 3)).map((y) => y.p).sort((a, b) => a - b);
      if (near.length < 2) return true;
      const mid = near[Math.floor(near.length / 2)];
      return Math.abs(x.p - mid) / mid <= 0.3;
    });
    const addr = [LAWD_NAMES[data.lawd_cd] || "", data.dong || "", data.jibun || ""].filter(Boolean).join(" ");
    return NextResponse.json({ success: true, name: data.name, kind: data.kind, addr, series }, { headers });
  }

  const id = params.get("id");
  if (id) {
    const { data, error } = await supabase.from("apt_complexes")
      .select("id, kind, name, dong, jibun, lawd_cd, build_year, lat, lng, trades, rents, supply_map, agent_supply, unit_map, supply_tried_at, info, agent_info, trade_count, updated_at, new_at")
      .eq("id", id).maybeSingle();
    if (error || !data) return NextResponse.json({ success: false, error: error?.message || "단지를 찾지 못했습니다." }, { status: 404 });
    // 부동산이 보완한 값이 공공 자료보다 우선 — 어느 칸이 부동산 값인지도 함께 (화면에 "공인중개사 제공")
    const { agent_supply: agentSupply, agent_info: agentInfo, supply_tried_at: unitsAt, ...rest } = data;
    const complex = {
      ...rest,
      // 고치기 전(첫 100줄만 센) 세대수는 보이지 않는다 — 다시 세면 저절로 보인다 (2026-11-03 사장님: "세대수가 다르면 안 되지")
      unit_map: unitsAt && String(unitsAt) >= UNITS_FIXED_AT ? data.unit_map : null,
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
  // kinds=apt,offi,villa — 켠 것만. 빌라는 수가 많아 따로 400곳 (아파트·오피스텔 자리를 밀어내지 않게, 2026-11-03)
  const want = String(params.get("kinds") || "apt,offi").split(",").filter((k) => ["apt", "offi", "villa"].includes(k));
  // 새 아파트는 분양권·입주권으로만 팔려 매매가 0건이고 전월세만 있다 — 그래도 최근 전월세(rent0)로 보인다
  // (2026-11-04 사장님: 청담르엘이 지도에 없음 — 아파트 6천여·오피스텔 8천여 곳이 이래서 빠져 있었다). 매매 있는 곳이 먼저
  const box = () => supabase.from("apt_complexes")
    .select(`id, kind, name, lat, lng, rep_area, rep_supply, rep_price, rep_date, trade_count, rent0:rents->0${NEW_COL}`)
    .gte("lat", swLat).lte("lat", neLat).gte("lng", swLng).lte("lng", neLng)
    .neq("fp", "gone")
    .order("trade_count", { ascending: false })
    .limit(400);
  const main = want.filter((k) => k !== "villa");
  const read = () => Promise.all([
    main.length ? box().in("kind", main) : Promise.resolve({ data: [], error: null }),
    // 빌라는 전월세만 있는 건물이 많다 — 매매가 없어도 최근 전월세 한 건(rent0)으로 표시 (2026-11-03)
    want.includes("villa") ? supabase.from("apt_complexes")
      .select(`id, kind, name, lat, lng, rep_area, rep_supply, rep_price, rep_date, trade_count, rent0:rents->0${NEW_COL}`)
      .gte("lat", swLat).lte("lat", neLat).gte("lng", swLng).lte("lng", neLng)
      .eq("kind", "villa").neq("rents", "[]")
      .order("trade_count", { ascending: false })
      .limit(400) : Promise.resolve({ data: [], error: null }),
  ]);
  let [a, v] = await read();
  if (NEW_COL && /new_at/.test(`${a.error?.message || ""} ${v.error?.message || ""}`)) {
    NEW_COL = ""; [a, v] = await read();
    setTimeout(() => { NEW_COL = ", new_at"; }, 600_000); // 칸을 만든 뒤 저절로 다시 읽게
  }
  const error = a.error || v.error;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, complexes: [...(a.data || []), ...(v.data || [])] }, { headers });
}
