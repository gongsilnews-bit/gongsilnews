"use server";
/**
 * 공실열람 지도 찜(★) — 기사 · 부동산 (2026-11-04 사장님: 공실·기사·부동산 다 찜하기, 누르면 노란색)
 *  공실 찜은 원래 있던 vacancy_wishlist (GongsilClient.toggleWishlist) 를 그대로 쓴다.
 *  기사 = article_bookmarks (원래 있던 기사 찜) · 부동산 = agency_bookmarks · 단지 = complex_bookmarks (supabase/migrations/20261104_agency_bookmarks.sql)
 */
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient as createCookie } from "@/utils/supabase/server";

/** 찜 상한 — 공실·기사·부동산·단지 종류마다 (2026-11-04) */
const STAR_LIMIT = 300;
const admin = () => createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
async function me() {
  const c = await createCookie();
  const { data: { user } } = await c.auth.getUser();
  return user;
}

export async function getMyMapStars(): Promise<{ loggedIn: boolean; articles: string[]; agencies: string[]; complexes: string[] }> {
  const user = await me();
  if (!user) return { loggedIn: false, articles: [], agencies: [], complexes: [] };
  const db = admin();
  const [a, g, c] = await Promise.all([
    db.from("article_bookmarks").select("article_id").eq("user_id", user.id).limit(5000),
    db.from("agency_bookmarks").select("agency_id").eq("user_id", user.id).limit(5000),
    db.from("complex_bookmarks").select("complex_id").eq("user_id", user.id).limit(5000),
  ]);
  return {
    loggedIn: true,
    articles: (a.data || []).map((r) => String(r.article_id)),
    agencies: g.error ? [] : (g.data || []).map((r) => String(r.agency_id)),
    complexes: c.error ? [] : (c.data || []).map((r) => String(r.complex_id)),
  };
}

export async function toggleMapStar(kind: "art" | "ag" | "apt", id: string, on: boolean): Promise<{ success: boolean; error?: string; login?: boolean }> {
  const user = await me();
  if (!user) return { success: false, login: true, error: "로그인이 필요합니다." };
  const db = admin();
  const table = kind === "art" ? "article_bookmarks" : kind === "ag" ? "agency_bookmarks" : "complex_bookmarks";
  const col = kind === "art" ? "article_id" : kind === "ag" ? "agency_id" : "complex_id";
  if (on) {
    const { data: had } = await db.from(table).select("id").eq("user_id", user.id).eq(col, id).maybeSingle();
    if (had) return { success: true };
    // 종류마다 300개까지 (2026-11-04 사장님: DB 가 불어나지 않게)
    const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count || 0) >= STAR_LIMIT) return { success: false, error: `찜은 ${STAR_LIMIT}개까지 할 수 있어요. 안 보는 찜을 지운 뒤 다시 해 주세요.` };
    const { error } = await db.from(table).insert({ user_id: user.id, [col]: id });
    if (error) return { success: false, error: /agency_bookmarks|complex_bookmarks/.test(error.message) ? "찜 표가 아직 없습니다 (DB 칸 만들기 필요)." : error.message };
  } else {
    const { error } = await db.from(table).delete().eq("user_id", user.id).eq(col, id);
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}

/* ── MY관심 대시보드 (2026-11-04 사장님: 지도 없이 넓게 — 찜한 기사·부동산·단지 + 1주일 안 새 소식) ── */
export type BoardArticle = { id: string; article_no: number | null; title: string; subtitle: string | null; thumbnail_url: string | null; published_at: string | null; author_name: string | null; section1: string | null; section2: string | null; location_name: string | null; categoryId?: string | null };
export type BoardAgency = { id: string; ownerId: string; name: string; address: string; phone: string; photo: string; vacancies: number; articles: number; newVacancies: number; newArticles: number; categoryId?: string | null };
export type BoardComplex = { id: string; kind: string; name: string; place: string; repArea: number | null; repPrice: number | null; repDate: string | null; tradeCount: number; newTrades: number; newVacancies: number; newArticles: number; categoryId?: string | null };

export async function getMyBoard(): Promise<{ loggedIn: boolean; articles: BoardArticle[]; agencies: BoardAgency[]; complexes: BoardComplex[] }> {
  const user = await me();
  if (!user) return { loggedIn: false, articles: [], agencies: [], complexes: [] };
  const db = admin();
  const week = new Date(Date.now() - 7 * 86400_000).toISOString();
  const now = new Date().toISOString();
  // 폴더(category_id) — 부동산·단지 표에 칸이 아직 없으면 폴더 없이 읽는다
  const read = async (table: string, col: string) => {
    const r = await db.from(table).select(`${col}, category_id, created_at`).eq("user_id", user.id).order("created_at", { ascending: false }).limit(500);
    if (!r.error || !/category_id/.test(r.error.message)) return r as { data: Record<string, string>[] | null; error: { message: string } | null };
    return (await db.from(table).select(`${col}, created_at`).eq("user_id", user.id).order("created_at", { ascending: false }).limit(500)) as { data: Record<string, string>[] | null; error: { message: string } | null };
  };
  const [ab, gb, cb] = await Promise.all([read("article_bookmarks", "article_id"), read("agency_bookmarks", "agency_id"), read("complex_bookmarks", "complex_id")]);
  const catOf = (rows: Record<string, string>[] | null, col: string) => new Map((rows || []).map((r) => [String(r[col]), r.category_id || null]));
  const aCat = catOf(ab.data, "article_id"), gCat = catOf(gb.error ? [] : gb.data, "agency_id"), cCat = catOf(cb.error ? [] : cb.data, "complex_id");
  // 기사
  const aIds = (ab.data || []).map((r) => r.article_id);
  const { data: arts } = aIds.length ? await db.from("articles").select("id, article_no, title, subtitle, thumbnail_url, published_at, author_name, section1, section2, location_name").in("id", aIds).eq("is_deleted", false) : { data: [] };
  const artById = new Map((arts || []).map((a) => [String(a.id), a as BoardArticle]));
  const articles = aIds.map((id) => artById.get(String(id))).filter(Boolean).map((a) => ({ ...a!, categoryId: aCat.get(String(a!.id)) ?? null })) as BoardArticle[];
  // 부동산
  const gIds = gb.error ? [] : (gb.data || []).map((r) => String(r.agency_id));
  let agencies: BoardAgency[] = [];
  if (gIds.length) {
    const { data: ags } = await db.from("agencies").select("id, owner_id, name, phone, address, address_detail").in("id", gIds);
    const owners = (ags || []).map((a) => a.owner_id).filter(Boolean);
    const [mem, vac, art] = await Promise.all([
      db.from("members").select("id, profile_image_url").in("id", owners),
      db.from("vacancies").select("owner_id, created_at").eq("status", "ACTIVE").in("owner_id", owners).limit(20000),
      db.from("articles").select("author_id, published_at").eq("status", "APPROVED").eq("is_deleted", false).eq("section1", "공실뉴스").in("author_id", owners).lte("published_at", now).limit(20000),
    ]);
    const photo = new Map((mem.data || []).map((m) => [m.id, String(m.profile_image_url || "")]));
    const agById = new Map((ags || []).map((a) => [String(a.id), a]));
    agencies = gIds.map((id) => agById.get(id)).filter(Boolean).map((a) => {
      const vs = (vac.data || []).filter((v) => v.owner_id === a!.owner_id), as = (art.data || []).filter((x) => x.author_id === a!.owner_id);
      return {
        id: String(a!.id), ownerId: String(a!.owner_id), name: String(a!.name || ""), address: [a!.address, a!.address_detail].filter(Boolean).join(" "),
        phone: String(a!.phone || ""), photo: photo.get(a!.owner_id) || "", vacancies: vs.length, articles: as.length,
        newVacancies: vs.filter((v) => v.created_at >= week).length, newArticles: as.filter((x) => String(x.published_at) >= week).length,
        categoryId: gCat.get(String(a!.id)) ?? null,
      };
    });
  }
  // 단지
  const cIds = cb.error ? [] : (cb.data || []).map((r) => String(r.complex_id));
  let complexes: BoardComplex[] = [];
  if (cIds.length) {
    const { data: cs } = await db.from("apt_complexes").select("id, kind, name, dong, lawd_cd, lat, lng, rep_area, rep_price, rep_date, trade_count, trades, rents").in("id", cIds);
    const { data: vac } = await db.from("vacancies").select("complex_id, created_at").eq("status", "ACTIVE").in("complex_id", cIds).limit(5000);
    const { data: arts7 } = await db.from("articles").select("title, lat, lng").eq("status", "APPROVED").eq("is_deleted", false).gte("published_at", week).lte("published_at", now).limit(2000);
    const { LAWD_NAMES } = await import("@/utils/aptMapShared");
    const bare = (v: string) => String(v || "").replace(/\(.*?\)|아파트|오피스텔|\s/g, "");
    const byId = new Map((cs || []).map((c) => [String(c.id), c]));
    complexes = cIds.map((id) => byId.get(id)).filter(Boolean).map((c) => {
      const fresh = (l: { s?: string }[] | null) => (l || []).filter((t) => t.s && t.s >= week).length;
      const newArticles = (arts7 || []).filter((a) => (a.lat && c!.lat && Math.hypot((a.lat - c!.lat) * 111_000, (a.lng - c!.lng) * 88_000) <= 50) || (bare(c!.name).length >= 3 && bare(a.title).includes(bare(c!.name)))).length;
      return {
        id: String(c!.id), kind: String(c!.kind || "apt"), name: String(c!.name || ""), place: `${(LAWD_NAMES[c!.lawd_cd] || "").replace(/^\S+\s/, "")} ${c!.dong || ""}`.trim(),
        repArea: c!.rep_area, repPrice: c!.rep_price, repDate: c!.rep_date, tradeCount: c!.trade_count || 0,
        newTrades: fresh(c!.trades) + fresh(c!.rents), newVacancies: (vac || []).filter((v) => v.complex_id === c!.id && v.created_at >= week).length, newArticles,
        categoryId: cCat.get(String(c!.id)) ?? null,
      };
    });
  }
  return { loggedIn: true, articles, agencies, complexes };
}

