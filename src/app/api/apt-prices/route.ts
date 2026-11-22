// 공실열람 지도 [아파트 시세] 읽기 (2026-11-02). 모으기는 /api/cron/apt-prices
//  GET ?sw=37.49,127.03&ne=37.52,127.07   화면 안 단지 (거래 많은 순 400개까지)
//  GET ?agg=sido|gu|dong&kind=apt         지역(시·도·시군구·동) 평균 — 앱 지도를 넓게 볼 때
//  GET ?id=11680:대치동:1014-3              단지 하나 — 매매·전월세 거래 전부 + 평형·세대수 + 단지 정보 (상세 창이 계산)
import { after, NextRequest, NextResponse } from "next/server";
import { db, UNITS_FIXED_AT, withAgent } from "@/utils/aptMap";
import { LAWD_NAMES, type Trade } from "@/utils/aptMapShared";
import { storedRegionAgg, type AggLevel, type AptKind } from "@/utils/aptRegionAgg";
import { complexLotKey, ensureLots } from "@/utils/articleLot";
import { fillAround, fillLots, lotKeysOf } from "@/utils/complexLots";
import { agenciesOf } from "@/utils/complexAgencies";

// 지역 평균(?agg)을 처음 만들 때 빌라는 20초 넘게 걸린다
export const maxDuration = 60;

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

/** 이 단지 뉴스 (2026-11-18 사장님: 번지가 정확히 같은 기사만) — 기사 좌표의 번지(articles.loc_lot)가 단지 번지와 같은 것
 *  예전(50m 안 전부 + 제목 이름)에는 강남역처럼 촘촘한 곳에서 옆 단지 기사가 붙었다 (풍림아이원플러스에 현대ESA 기사)
 *  loc_lot 칸이 아직 없으면(SQL 실행 전) 예전 방식으로 */
const NEWS_COLS = "id, article_no, title, subtitle, section1, section2, location_name, published_at, created_at, author_name, thumbnail_url, lat, lng";
const noLotColumn = (e: { message?: string } | null) => !!e && /loc_lot/.test(e.message || "");
async function newsOf(supabase: ReturnType<typeof db>, c: { id: string; name: string; lat: number | null; lng: number | null }) {
  if (!c.lat || !c.lng || !complexLotKey(c.id)) return [];
  // 단지 번지 목록 — 대표 번지 + 딸린 번지 (2026-11-22 사장님: 큰 단지는 번지 여러 개를 한 단지로)
  const mine = (await lotKeysOf(supabase, [c])).get(c.id) || new Set<string>();
  const d = 0.003; // 둘레 약 300m 안 기사만 번지를 견준다 (한 필지가 아무리 커도 이 안)
  const { data, error } = await supabase.from("articles").select(`${NEWS_COLS}, loc_lot`)
    .eq("status", "APPROVED").eq("is_deleted", false).lte("published_at", new Date().toISOString())
    .gte("lat", c.lat - d).lte("lat", c.lat + d).gte("lng", c.lng - d * 1.25).lte("lng", c.lng + d * 1.25).limit(200);
  if (noLotColumn(error)) return newsOfOld(supabase, c);
  const arts = (data || []) as unknown as { id: string; lat: number; lng: number; loc_lot: string | null; published_at?: string; created_at?: string }[];
  const keys = await ensureLots(supabase as never, arts);
  return arts.filter((a) => mine.has(keys.get(a.id) || ""))
    .map(({ loc_lot: _l, ...a }) => a)
    .sort((p, q) => String(q.published_at || q.created_at || "").localeCompare(String(p.published_at || p.created_at || "")));
}

/** 지도 단지 표시 주황 뉴스 수 — 단지 창 [뉴스 N](newsOf)과 같은 규칙(번지가 같은 기사). 화면 안 기사를 한 번만 읽어 나눈다 */
async function countNews(supabase: ReturnType<typeof db>, list: { id: string; name: string; lat: number | null; lng: number | null; news?: number }[], box: number[]) {
  const [s, w, n, e] = box;
  if (!list.length || n - s > 0.5 || e - w > 0.5) return;
  const d = 0.003;
  const { data, error } = await supabase.from("articles").select("id, lat, lng, loc_lot")
    .eq("status", "APPROVED").eq("is_deleted", false).lte("published_at", new Date().toISOString())
    .gte("lat", s - d).lte("lat", n + d).gte("lng", w - d * 1.25).lte("lng", e + d * 1.25).limit(2000);
  if (noLotColumn(error)) return countNewsOld(supabase, list, box);
  const arts = (data || []) as { id: string; lat: number; lng: number; loc_lot: string | null }[];
  if (!arts.length) return;
  const keys = await ensureLots(supabase as never, arts);
  const per = new Map<string, number>();
  for (const k of keys.values()) per.set(k, (per.get(k) || 0) + 1);
  // 단지마다 대표 번지 + 딸린 번지의 기사 수를 더한다 (2026-11-22). 딸린 번지는 화면 안 기사 번지에 해당하는 것만 묻는다
  const reps = new Set(list.map((c) => complexLotKey(c.id)));
  const extra = [...per.keys()].filter((k) => !reps.has(k));
  const lots = await lotKeysOf(supabase, list, extra);
  const used = new Set<string>();
  for (const c of list) {
    let k = 0;
    for (const key of lots.get(c.id) || []) { k += per.get(key) || 0; if (per.has(key)) used.add(key); }
    if (k) c.news = k;
  }
  // 어느 단지 번지에도 안 맞은 기사 — 둘레 단지의 딸린 번지를 응답 뒤에 받아 둔다 (단지마다 한 번만, 다음부터 맞음)
  const loose = arts.filter((a) => { const k = keys.get(a.id); return k && !used.has(k); }).slice(0, 3);
  if (loose.length) after(async () => { for (const a of loose) await fillAround(supabase, a.lat, a.lng, ["apt", "offi"], undefined, 3).catch(() => {}); });
}

/** (예전) 이 단지 뉴스 — 단지에서 50m 안에 찍힌 기사 + 근처(약 2km)에서 제목에 단지 이름이 든 기사 (2026-11-04 사장님: 단지 창 [뉴스 N])
 *  저장해 둔 연결 없이 그때그때 찾는다. 흔한 짧은 이름(2글자)은 이름으로 찾지 않는다 */
async function newsOfOld(supabase: ReturnType<typeof db>, c: { name: string; lat: number | null; lng: number | null }) {
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
async function countNewsOld(supabase: ReturnType<typeof db>, list: { name: string; lat: number | null; lng: number | null; news?: number }[], [s, w, n, e]: number[]) {
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
      .select("id, kind, name, dong, jibun, bcode, lawd_cd, build_year, lat, lng, trades, rents, supply_map, agent_supply, unit_map, supply_tried_at, info, info_tried_at, agent_info, trade_count, updated_at")
      .eq("id", id).maybeSingle();
    if (error || !data) return NextResponse.json({ success: false, error: error?.message || "단지를 찾지 못했습니다." }, { status: 404 });
    // 단지 정보가 아직 비었으면 — 단지 창을 연 그때 건축물대장에서 바로 채운다 (최대 8초, 2026-11-05 사장님: 세대수·용적률 빈칸)
    if (!data.info && !data.info_tried_at && data.bcode && data.jibun) {
      const { fillInfo } = await import("@/utils/aptMap");
      const { resetHubLimited } = await import("@/utils/publicLand");
      resetHubLimited();
      const got = await Promise.race([fillInfo(data as never).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 8000))]);
      if (got) (data as { info: unknown }).info = got;
    }
    // 이 단지의 딸린 번지를 아직 안 받았으면 지금 (단지마다 한 번, 최대 4초) — [뉴스 N]이 큰 단지의 다른 번지 기사까지 (2026-11-22)
    if (data.kind === "apt" || data.kind === "offi") {
      const { data: lt, error: ltErr } = await supabase.from("apt_complexes").select("lots_tried_at").eq("id", data.id).maybeSingle();
      if (!ltErr && lt && !lt.lots_tried_at) await Promise.race([fillLots(supabase, data as never).catch(() => true), new Promise((r) => setTimeout(r, 4000))]);
    }
    // 부동산이 보완한 값이 공공 자료보다 우선 — 어느 칸이 부동산 값인지도 함께 (화면에 "공인중개사 제공")
    const { agent_supply: agentSupply, agent_info: agentInfo, supply_tried_at: unitsAt, info_tried_at: _infoAt, bcode: _bcode, ...rest } = data;
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
      agencies: await agenciesOf(supabase as never, data).catch(() => []), // 입점부동산 — 번지가 같은 승인 사무소 (2026-11-19)
    };
    return NextResponse.json({ success: true, complex }, { headers: { "Cache-Control": "no-store" } });
  }

  // ?at=37.5,127.03&dong=역삼동&jibun=685-19 — 지도 주소 검색으로 고른 자리의 단지 (2026-11-05 사장님)
  // 같은 동·지번이 가까이(약 1km 안) 있으면 그것, 없으면 30m 안 가장 가까운 단지. 없으면 null
  if (params.get("at")) {
    const [lat, lng] = String(params.get("at")).split(",").map(Number);
    if (![lat, lng].every(Number.isFinite)) return NextResponse.json({ success: false, error: "at 이 필요합니다." }, { status: 400 });
    const dong = String(params.get("dong") || ""), jibun = String(params.get("jibun") || "");
    const near = (d: number) => supabase.from("apt_complexes").select("id, kind, lat, lng, dong, jibun, trade_count")
      .gte("lat", lat - d).lte("lat", lat + d).gte("lng", lng - d * 1.25).lte("lng", lng + d * 1.25).neq("fp", "gone");
    const pickKind = (rows: { id: string; kind: string; trade_count: number }[]) =>
      [...rows].sort((a, b) => (a.kind === "villa" ? 1 : 0) - (b.kind === "villa" ? 1 : 0) || b.trade_count - a.trade_count)[0];
    let found: { id: string; kind: string } | null = null;
    if (dong && jibun) {
      const { data } = await near(0.01).eq("dong", dong).eq("jibun", jibun).limit(10);
      if (data?.length) found = pickKind(data);
    }
    if (!found) {
      const { data } = await near(0.0004).limit(50);
      const dist = (r: { lat: number; lng: number }) => Math.hypot((r.lat - lat) * 111000, (r.lng - lng) * 88000);
      const close = (data || []).filter((r) => dist(r) <= 30).sort((a, b) => dist(a) - dist(b));
      if (close.length) found = close[0];
    }
    return NextResponse.json({ success: true, complex: found ? { id: found.id, kind: found.kind } : null }, { headers: { "Cache-Control": "no-store" } });
  }

  // ?agg=sido|gu|dong&kind=apt — 넓게 볼 때 지역 평균 (앱 지도, 2026-11-16). 전국 것을 한 번에 — 화면 안만 고르는 것은 앱이
  const agg = params.get("agg");
  if (agg) {
    const kind = params.get("kind") as AptKind;
    if (!["sido", "gu", "dong"].includes(agg) || !["apt", "offi", "villa"].includes(kind)) {
      return NextResponse.json({ success: false, error: "agg=sido|gu|dong, kind=apt|offi|villa" }, { status: 400 });
    }
    try {
      // DB 에 저장해 둔 것을 읽기만 (2026-11-18) — 묵었으면 응답 뒤에 새로 계산
      const all = await storedRegionAgg(supabase, kind, (job) => after(job));
      return NextResponse.json({ success: true, regions: all[agg as AggLevel] }, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
    } catch (e) {
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "지역 평균을 만들지 못했습니다." }, { status: 500 });
    }
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
      // 매매만 있고 전월세가 없는 건물도 (2026-11-05 사장님: 논현아펠바움 등이 지도에 없던 것)
      .eq("kind", "villa").or(`rents.neq."[]",trades.neq."[]"`)
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
