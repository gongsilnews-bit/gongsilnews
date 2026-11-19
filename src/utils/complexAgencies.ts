// 단지 입점부동산 (2026-11-19 사장님) — 단지와 번지가 정확히 같은 곳에 사무소가 있는 승인된 중개사무소
//  단지 뉴스(번지가 같은 기사)와 같은 기준. 번지는 사무소 좌표로 카카오에서 구한다(lotOf) — 도로명 주소로 등록한 사무소도 같이 견줄 수 있게
//  agencies.loc_lot = "동 번지@위도,경도" 에 적어 두고 다시 묻지 않는다 (supabase/migrations/20261119_agencies_loc_lot.sql)
//  칸이 아직 없으면(SQL 실행 전) 그때그때 구하기만 하고 저장하지 않는다
//  보여 주는 순서: 유료(공실뉴스부동산) 먼저 → 매물 많은 순 → 이름
import type { SupabaseClient } from "@supabase/supabase-js";
import { complexLotKey, freshLotKey, lotOf } from "@/utils/articleLot";

export type ComplexAgency = {
  id: string; name: string; ceo_name: string | null; phone: string | null; cell: string | null;
  address: string | null; address_detail: string | null; intro: string | null;
  lat: number | null; lng: number | null;
  paid: boolean;          // 공실뉴스부동산(유료) — 맨 위 · 딱지
  photo: string | null;   // 대표 프로필 사진 (회원 사진, 없으면 이름 첫 글자)
  listings: number;       // 이 사무소가 올린 광고중 공실 전체 수 ("매물 n개")
  articles: number;       // 이 사무소가 쓴 공실뉴스 기사 수 ("기사 n")
  vacancy_ids: string[];
  owner_id: string;       // 사무소 주인(회원) id — 앱은 이걸로 사무소 화면(app/agency/[id])을 연다  // 그 공실 번호 — 줄을 누르면 [공실 n]처럼 목록에 띄운다 (2026-11-19 사장님)
};

const PAID = ["news_premium", "study_premium"]; // 유료는 공실뉴스부동산 하나 (permissionCheck 와 같은 값)
const at = (lat: number, lng: number) => `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
const noLotColumn = (e: { message?: string } | null) => !!e && /loc_lot/.test(e.message || "");

type Row = Omit<ComplexAgency, "paid" | "vacancies"> & { owner_id: string; loc_lot?: string | null };

export async function agenciesOf(supabase: SupabaseClient, c: { id: string; lat: number | null; lng: number | null }): Promise<ComplexAgency[]> {
  const key = complexLotKey(c.id);
  if (!c.lat || !c.lng || !key) return [];
  const d = 0.003; // 둘레 약 300m 안 사무소만 번지를 견준다 (단지 뉴스와 같은 넓이)
  const cols = "id, owner_id, name, ceo_name, phone, cell, address, address_detail, intro, lat, lng";
  const box = (sel: string) => supabase.from("agencies").select(sel).eq("status", "APPROVED")
    .gte("lat", c.lat! - d).lte("lat", c.lat! + d).gte("lng", c.lng! - d * 1.25).lte("lng", c.lng! + d * 1.25).limit(100);
  let hasCol = true;
  let res = await box(`${cols}, loc_lot`);
  if (noLotColumn(res.error)) { hasCol = false; res = await box(cols); }
  const rows = (res.data || []) as unknown as Row[];
  if (!rows.length) return [];

  const mine: Row[] = [];
  await Promise.all(rows.map(async (a) => {
    let k = hasCol ? freshLotKey(a) : null;
    if (!k && a.lat != null && a.lng != null) {
      const lot = await lotOf(Number(a.lat), Number(a.lng));
      k = lot?.key || null;
      if (hasCol) await supabase.from("agencies").update({ loc_lot: `${k || ""}@${at(Number(a.lat), Number(a.lng))}` }).eq("id", a.id);
    }
    if (k === key) mine.push(a);
  }));
  if (!mine.length) return [];

  const owners = mine.map((a) => a.owner_id).filter(Boolean);
  const [{ data: mem }, { data: vac }, { data: art }] = await Promise.all([
    supabase.from("members").select("id, plan_type, profile_image_url").in("id", owners),
    // 지도 사무소 카드(mapAgencies.ts)와 같은 기준 — 내 홈페이지 전용 공실은 빼고, 기사는 승인된 공실뉴스 기사
    supabase.from("vacancies").select("id, owner_id").eq("status", "ACTIVE").or("exposure_type.is.null,exposure_type.neq.홈페이지전용").in("owner_id", owners).order("created_at", { ascending: false }).limit(3000),
    supabase.from("articles").select("author_id").eq("status", "APPROVED").eq("is_deleted", false).eq("section1", "공실뉴스").in("author_id", owners).lte("published_at", new Date().toISOString()).limit(5000),
  ]);
  const arts = new Map<string, number>();
  for (const r of (art || []) as { author_id: string }[]) arts.set(r.author_id, (arts.get(r.author_id) || 0) + 1);
  const members = new Map(((mem || []) as { id: string; plan_type: string | null; profile_image_url: string | null }[]).map((m) => [m.id, m]));
  const ids = new Map<string, string[]>();
  for (const v of (vac || []) as { id: string; owner_id: string }[]) ids.set(v.owner_id, [...(ids.get(v.owner_id) || []), String(v.id)]);
  const pic = (u: string | null | undefined) => (u ? u.replace(/^http:\/\//i, "https://") : null);

  return mine.map(({ owner_id, loc_lot: _l, ...a }) => {
    const m = members.get(owner_id);
    return { ...a, owner_id, paid: PAID.includes(m?.plan_type || ""), photo: pic(m?.profile_image_url), listings: (ids.get(owner_id) || []).length, articles: arts.get(owner_id) || 0, vacancy_ids: ids.get(owner_id) || [] };
  }).sort((p, q) => Number(q.paid) - Number(p.paid) || q.listings - p.listings || p.name.localeCompare(q.name, "ko"));
}
