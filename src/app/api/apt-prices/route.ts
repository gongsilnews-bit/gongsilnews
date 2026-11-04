// 공실열람 지도 [아파트 시세] 읽기 (2026-11-02). 모으기는 /api/cron/apt-prices
//  GET ?sw=37.49,127.03&ne=37.52,127.07   화면 안 단지 (거래 많은 순 400개까지)
//  GET ?id=11680:대치동:1014-3              단지 하나 — 매매·전월세 거래 전부 + 평형·세대수 + 단지 정보 (상세 창이 계산)
import { NextRequest, NextResponse } from "next/server";
import { db, UNITS_FIXED_AT, withAgent } from "@/utils/aptMap";
import { LAWD_NAMES, type Trade } from "@/utils/aptMapShared";

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

/** 이 단지 뉴스 — 단지에서 50m 안에 찍힌 기사 + 근처(약 2km)에서 제목에 단지 이름이 든 기사 (2026-11-04 사장님: 단지 창 [뉴스 N])
 *  저장해 둔 연결 없이 그때그때 찾는다. 흔한 짧은 이름(2글자)은 이름으로 찾지 않는다 */
async function newsOf(supabase: ReturnType<typeof db>, c: { name: string; lat: number | null; lng: number | null }) {
  if (!c.lat || !c.lng) return [];
  const cols = "id, article_no, title, subtitle, section1, section2, location_name, published_at, created_at, author_name, thumbnail_url, lat, lng";
  const now = new Date().toISOString();
  const base = () => supabase.from("articles").select(cols).eq("status", "APPROVED").eq("is_deleted", false).lte("published_at", now);
  const near = (d: number) => (q: ReturnType<typeof base>) => q.gte("lat", c.lat! - d).lte("lat", c.lat! + d).gte("lng", c.lng! - d * 1.25).lte("lng", c.lng! + d * 1.25);
  const bare = String(c.name || "").replace(/\(.*?\)|아파트|오피스텔|\s/g, "");
  const [a, b] = await Promise.all([
    near(0.0006)(base()).limit(50),
    bare.length >= 3 ? near(0.02)(base()).ilike("title", `%${bare.replace(/[%_]/g, "")}%`).limit(50) : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const meters = (x: { lat: number; lng: number }) => Math.hypot((x.lat - c.lat!) * 111_000, (x.lng - c.lng!) * 88_000);
  const byId = new Map<string, Record<string, unknown>>();
  for (const x of (a.data || []) as { id: string; lat: number; lng: number }[]) if (meters(x) <= 50) byId.set(x.id, x);
  for (const x of (b.data || []) as { id: string }[]) byId.set(x.id, x);
  return [...byId.values()].sort((p, q) => String(q.published_at || q.created_at || "").localeCompare(String(p.published_at || p.created_at || "")));
}

/** 지도 단지 표시 오른쪽 아래 주황 뉴스 수 (2026-11-04 사장님) — 단지 창 [뉴스 N](newsOf)과 같은 규칙.
 *  단지마다 묻지 않고, 화면(+약 2km) 안 기사를 한 번만 읽어 나눈다 (회원 10만 명이어도 가볍게) */
async function countNews(supabase: ReturnType<typeof db>, list: { name: string; lat: number | null; lng: number | null; news?: number }[], [s, w, n, e]: number[]) {
  if (!list.length || n - s > 0.5 || e - w > 0.5) return; // 너무 넓게 보면 세지 않는다
  const d = 0.02;
  const { data } = await supabase.from("articles").select("id, title, lat, lng")
    .eq("status", "APPROVED").eq("is_deleted", false).lte("published_at", new Date().toISOString())
    .gte("lat", s - d).lte("lat", n + d).gte("lng", w - d * 1.25).lte("lng", e + d * 1.25).limit(2000);
  const arts = (data || []).filter((x) => x.lat && x.lng) as { id: string; title: string | null; lat: number; lng: number }[];
  if (!arts.length) return;
  for (const c of list) {
    if (!c.lat || !c.lng) continue;
    const bare = String(c.name || "").replace(/\(.*?\)|아파트|오피스텔|\s/g, "");
    let k = 0;
    for (const x of arts) {
      const dLat = Math.abs(x.lat - c.lat), dLng = Math.abs(x.lng - c.lng);
      if (dLat > d || dLng > d * 1.25) continue;
      if (Math.hypot(dLat * 111_000, dLng * 88_000) <= 50 || (bare.length >= 3 && String(x.title || "").includes(bare))) k++;
    }
    if (k) c.news = k;
  }
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
      .select("id, kind, name, dong, jibun, lawd_cd, build_year, lat, lng, trades, rents, supply_map, agent_supply, unit_map, supply_tried_at, info, agent_info, trade_count, updated_at")
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
      news: await newsOf(supabase, data).catch(() => []),
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
    .select(`id, kind, name, lat, lng, rep_area, rep_supply, rep_price, rep_date, trade_count, rent0:rents->0, t0:trades->0`) // t0 = 가장 최근 매매 — NEW(지난 7일 계약) 판단
    .gte("lat", swLat).lte("lat", neLat).gte("lng", swLng).lte("lng", neLng)
    .neq("fp", "gone")
    .order("trade_count", { ascending: false })
    .limit(400);
  const main = want.filter((k) => k !== "villa");
  const read = () => Promise.all([
    main.length ? box().in("kind", main) : Promise.resolve({ data: [], error: null }),
    // 빌라는 전월세만 있는 건물이 많다 — 매매가 없어도 최근 전월세 한 건(rent0)으로 표시 (2026-11-03)
    want.includes("villa") ? supabase.from("apt_complexes")
      .select(`id, kind, name, lat, lng, rep_area, rep_supply, rep_price, rep_date, trade_count, rent0:rents->0, t0:trades->0`) // t0 = 가장 최근 매매 — NEW(지난 7일 계약) 판단
      .gte("lat", swLat).lte("lat", neLat).gte("lng", swLng).lte("lng", neLng)
      .eq("kind", "villa").neq("rents", "[]")
      .order("trade_count", { ascending: false })
      .limit(400) : Promise.resolve({ data: [], error: null }),
  ]);
  const [a, v] = await read();
  const error = a.error || v.error;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  const complexes = [...(a.data || []), ...(v.data || [])] as { id: string; name: string; lat: number | null; lng: number | null; news?: number }[];
  await countNews(supabase, complexes, [swLat, swLng, neLat, neLng]).catch(() => {});
  return NextResponse.json({ success: true, complexes }, { headers });
}
