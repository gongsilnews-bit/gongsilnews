// 경공매 지역별 건수 (2026-11-16 사장님: 앱 경매 지도를 넓게 보면 600건만 나와 다 안 보이던 것)
//  진행 중 경매 전부(약 1.8만 건)를 좌표·주소·종류만 읽어 시·도 / 시군구마다 센다. 10분 기억.
//  시군구 고르기: 경매 주소(building_name)에 시군구 이름이 들어 있으면 그 구 (같은 이름 "중구" 등은 가까운 쪽),
//  주소가 엉망이면(온비드 "강남구청역 …" 같은 것) 좌표에서 가장 가까운 구 가운데로. 구 가운데 = 아파트 지역 평균의 가운데
import type { SupabaseClient } from "@supabase/supabase-js";
import { LAWD_NAMES } from "@/utils/aptMapShared";
import { storedRegionAgg } from "@/utils/aptRegionAgg";

export type AucRegion = { key: string; name: string; lat: number; lng: number; n: number; c: Record<string, number> };
/** grid = 약 1km(위도·경도 0.01도) 칸마다 건수 — 앱 경매 지도를 넓게 볼 때 지역 이름 없이 원 숫자로 (2026-11-17 사장님) */
type Out = { sido: AucRegion[]; gu: AucRegion[]; grid: AucRegion[]; total: number };

const KEEP_MS = 10 * 60 * 1000;
let cache: { at: number; data: Out } | null = null;
let loading: Promise<Out> | null = null;

type Row = { id: string; lat: number | null; lng: number | null; building_name: string | null; property_type: string | null; s: string | null; mc: string | null };

/** 앱·모바일웹 경매 종류 (앱 src/lib/gongsil.ts auctionInfo 와 같은 규칙) */
function categoryOf(r: Row): string {
  const s = r.s || "", mc = r.mc || "", b = r.building_name || "", pt = r.property_type || "";
  const has = (x: string) => s.includes(x) || b.includes(x);
  if (has("오피스텔")) return "오피스텔";
  if ((s.includes("아파트") || b.includes("아파트")) && !s.includes("아파트형") && !b.includes("아파트형")) return "아파트";
  if (has("단독") || has("다가구")) return "단독/다가구";
  if (["빌라", "다세대", "연립", "도시형"].some(has) || s.includes("기타주거") || (mc.includes("주거") && !s.includes("아파트") && !s.includes("단독") && !s.includes("다가구"))) return "빌라/주택";
  if (["근린생활", "판매", "상가", "점포", "소매"].some((x) => s.includes(x)) || b.includes("근생") || b.includes("상가") || b.includes("판매시설")) return "상가/근생";
  if ((["공장", "창고", "제조", "자동차"].some((x) => s.includes(x)) || b.includes("공장") || b.includes("창고") || mc.includes("산업")) && !s.includes("지식산업") && !s.includes("아파트형")) return "공장/창고";
  if (mc.includes("토지") || ["토지", "대지", "임야", "전", "답", "잡종지", "과수원", "도로", "목장", "염전", "구거", "하천", "부지", "용지"].some((x) => s.includes(x)) || ["토지", "임야", "대지"].some((x) => b.includes(x))) return "토지";
  if (["사무", "업무", "빌딩", "숙박", "콘도", "의료", "지식산업", "아파트형"].some((x) => s.includes(x)) || b.includes("빌딩") || b.includes("사무실") || mc.includes("상가용및업무")) return "빌딩/사무실";
  if (pt === "아파트·오피스텔") return b.includes("오피스텔") ? "오피스텔" : "아파트";
  if (pt === "빌라·주택") return b.includes("단독") || b.includes("다가구") ? "단독/다가구" : "빌라/주택";
  return "상가/근생";
}

async function readAll(supabase: SupabaseClient): Promise<Row[]> {
  const out: Row[] = [];
  let last = "";
  for (let guard = 0; guard < 60; guard++) {
    let q = supabase.from("vacancies")
      .select("id, lat, lng, building_name, property_type, s:metadata->>cltrUsgSclsCtgrNm, mc:metadata->>cltrUsgMclsCtgrNm")
      .eq("status", "ACTIVE").eq("trade_type", "경매").order("id").limit(1000);
    if (last) q = q.gt("id", last);
    const { data, error } = await q;
    if (error) throw error;
    const got = (data || []) as unknown as Row[];
    out.push(...got);
    if (got.length < 1000) break;
    last = String(got[got.length - 1].id);
  }
  return out;
}

async function build(supabase: SupabaseClient): Promise<Out> {
  const [rows, apt] = await Promise.all([readAll(supabase), storedRegionAgg(supabase, "apt")]);
  const guCenter = new Map(apt.gu.map((g) => [g.key, g]));
  const sidoCenter = new Map(apt.sido.map((g) => [g.key, g]));
  const gus = Object.entries(LAWD_NAMES).filter(([k]) => guCenter.has(k)).map(([k, full]) => ({ k, full, gu: full.split(" ").slice(1).join(" ") }));
  const d2 = (lat: number, lng: number, k: string) => { const c = guCenter.get(k)!; return (c.lat - lat) ** 2 + ((c.lng - lng) * 0.8) ** 2; };
  const nearest = (lat: number, lng: number, list: { k: string }[]) => list.reduce((best, x) => (d2(lat, lng, x.k) < d2(lat, lng, best.k) ? x : best), list[0]).k;

  const acc = new Map<string, { n: number; c: Record<string, number> }>();
  const cells = new Map<string, AucRegion>();
  let total = 0;
  for (const r of rows) {
    if (!r.lat || !r.lng) continue;
    const ck = `${Math.round(r.lat * 100)}:${Math.round(r.lng * 100)}`;
    const cell = cells.get(ck) || { key: ck, name: "", lat: 0, lng: 0, n: 0, c: {} };
    const cc = categoryOf(r);
    cell.lat += r.lat; cell.lng += r.lng; cell.n++; cell.c[cc] = (cell.c[cc] || 0) + 1;
    cells.set(ck, cell);
    const b = r.building_name || "";
    const named = gus.filter((g) => g.gu && b.includes(g.gu));
    // 시·도 이름까지 맞는 것을 먼저 (같은 이름 구가 여러 시·도에 있음)
    const strict = named.filter((g) => b.includes(g.full.split(" ")[0].slice(0, 2)));
    const pick = strict.length ? nearest(r.lat, r.lng, strict) : named.length ? nearest(r.lat, r.lng, named) : nearest(r.lat, r.lng, gus);
    const a = acc.get(pick) || { n: 0, c: {} };
    const cat = categoryOf(r);
    a.n++; a.c[cat] = (a.c[cat] || 0) + 1;
    acc.set(pick, a);
    total++;
  }
  const gu: AucRegion[] = [...acc.entries()].map(([k, a]) => {
    const c = guCenter.get(k)!;
    return { key: k, name: LAWD_NAMES[k].split(" ").slice(1).join(" ") || LAWD_NAMES[k], lat: c.lat, lng: c.lng, n: a.n, c: a.c };
  });
  const sidoAcc = new Map<string, AucRegion>();
  for (const g of gu) {
    const k = g.key.slice(0, 2);
    const sc = sidoCenter.get(k);
    const s = sidoAcc.get(k) || { key: k, name: LAWD_NAMES[g.key].split(" ")[0], lat: sc?.lat ?? g.lat, lng: sc?.lng ?? g.lng, n: 0, c: {} };
    s.n += g.n;
    for (const [cat, n] of Object.entries(g.c)) s.c[cat] = (s.c[cat] || 0) + n;
    sidoAcc.set(k, s);
  }
  const grid = [...cells.values()].map((g) => ({ ...g, lat: Math.round((g.lat / g.n) * 1e5) / 1e5, lng: Math.round((g.lng / g.n) * 1e5) / 1e5 }));
  return { sido: [...sidoAcc.values()], gu, grid, total };
}

export async function auctionRegionAgg(supabase: SupabaseClient): Promise<Out> {
  if (cache && Date.now() - cache.at < KEEP_MS) return cache.data;
  if (!loading) loading = build(supabase).then((data) => { cache = { at: Date.now(), data }; return data; }).finally(() => { loading = null; });
  return loading;
}
