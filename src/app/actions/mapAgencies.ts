"use server";
/**
 * 공실열람 지도 [부동산] (2026-11-04 사장님) — 가입한 회원 부동산(승인된 사무소)을 지도에 · 마우스를 올리면 이름·주소·공실·기사 수 ·
 * 누르면 왼쪽 목록에 그 사무소 카드 + 공실 전부 + 기사 전부. 값은 DB 그대로 — 없는 값은 비워 둔다 (지어내지 않는다).
 */
import { createClient } from "@supabase/supabase-js";

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export type MapAgency = {
  id: string; ownerId: string; name: string; ceo: string; regNum: string; phone: string; cell: string;
  address: string; lat: number; lng: number; intro: string; photo: string; sns: { key: string; url: string }[];
  vacancies: number; articles: number;
};

/** box = 지금 보이는 지도 범위 [[남,서],[북,동]] — 그 안의 사무소만, 최대 300 (2026-11-04: 회원 10만 명이어도 가볍게). id = 한 곳만 */
export async function listMapAgencies(box?: [[number, number], [number, number]] | null, id?: string): Promise<MapAgency[]> {
  const db = admin();
  let q = db.from("agencies").select("id, owner_id, name, ceo_name, reg_num, phone, cell, address, address_detail, lat, lng, intro")
    .eq("status", "APPROVED").not("lat", "is", null);
  if (id) q = q.eq("id", id);
  else if (box) {
    const [[s, w], [n, e]] = box;
    if (n - s > 3 || e - w > 3) return [];
    q = q.gte("lat", s).lte("lat", n).gte("lng", w).lte("lng", e);
  }
  const { data: ags } = await q.limit(300);
  const list = (ags || []).filter((a) => a.owner_id && a.lat && a.lng);
  if (!list.length) return [];
  const owners = [...new Set(list.map((a) => a.owner_id as string))];
  const [mem, vac, art] = await Promise.all([
    db.from("members").select("id, profile_image_url, sns_links, is_deleted").in("id", owners),
    db.from("vacancies").select("owner_id").eq("status", "ACTIVE").in("owner_id", owners).limit(20000),
    db.from("articles").select("author_id").eq("status", "APPROVED").eq("is_deleted", false).eq("section1", "공실뉴스").in("author_id", owners).lte("published_at", new Date().toISOString()).limit(20000),
  ]);
  const count = (rows: { [k: string]: unknown }[] | null, key: string) => {
    const m = new Map<string, number>();
    for (const r of rows || []) m.set(String(r[key]), (m.get(String(r[key])) || 0) + 1);
    return m;
  };
  const vc = count(vac.data, "owner_id"), ac = count(art.data, "author_id");
  const mm = new Map((mem.data || []).map((m) => [m.id as string, m]));
  return list
    .filter((a) => !mm.get(a.owner_id)?.is_deleted)
    .map((a) => {
      const m = mm.get(a.owner_id);
      const links = (m?.sns_links || {}) as Record<string, { url?: string } | unknown>;
      const sns = Object.entries(links)
        .filter(([k, v]) => k !== "api_info" && k !== "api_list" && v && typeof v === "object" && (v as { url?: string }).url)
        .map(([k, v]) => ({ key: k, url: String((v as { url: string }).url) }));
      return {
        id: String(a.id), ownerId: String(a.owner_id), name: String(a.name || ""), ceo: String(a.ceo_name || ""), regNum: String(a.reg_num || ""),
        phone: String(a.phone || ""), cell: a.cell && a.cell !== a.phone ? String(a.cell) : "",
        address: [a.address, a.address_detail].filter(Boolean).join(" "), lat: Number(a.lat), lng: Number(a.lng), intro: String(a.intro || ""),
        photo: String(m?.profile_image_url || ""), sns, vacancies: vc.get(a.owner_id) || 0, articles: ac.get(a.owner_id) || 0,
      };
    });
}

/** 그 사무소가 쓴 공실뉴스 기사 전부 (새 기사부터) */
export async function agencyArticles(ownerId: string) {
  const { data } = await admin().from("articles")
    .select("id, article_no, title, subtitle, section1, section2, location_name, published_at, created_at, author_name, thumbnail_url, lat, lng")
    .eq("author_id", ownerId).eq("status", "APPROVED").eq("is_deleted", false).eq("section1", "공실뉴스").lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false }).limit(300);
  return data || [];
}
