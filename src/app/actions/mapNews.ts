"use server";
/**
 * 지도 [우리동네뉴스] — 지금 보이는 지도 범위 안의 공실뉴스 기사만 (2026-11-04 사장님: 회원 10만 명이 써도 느려지지 않게)
 *  전에는 발행 기사를 전부 받아 브라우저에서 걸렀다. 이제 서버가 범위·개수(최대 300)로 끊어 준다.
 *  색인: supabase/migrations/20261104_map_scale.sql (articles lat·lng)
 */
import { createClient } from "@supabase/supabase-js";

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export type MapNews = { id: string; article_no: number | null; title: string; subtitle: string | null; lat: number; lng: number; published_at: string | null; created_at: string | null; author_name: string | null; section1: string | null; section2: string | null; thumbnail_url: string | null; location_name: string | null };

export async function mapNewsInBox(sw: [number, number], ne: [number, number]): Promise<MapNews[]> {
  const [s, w] = sw, [n, e] = ne;
  if (![s, w, n, e].every(Number.isFinite) || n - s > 3 || e - w > 3) return []; // 너무 넓게(전국) 보면 받지 않는다
  const { data } = await admin().from("articles")
    .select("id, article_no, title, subtitle, lat, lng, published_at, created_at, author_name, section1, section2, thumbnail_url, location_name")
    .eq("status", "APPROVED").eq("is_deleted", false).eq("section1", "공실뉴스")
    .lte("published_at", new Date().toISOString())
    .gte("lat", s).lte("lat", n).gte("lng", w).lte("lng", e)
    .order("published_at", { ascending: false }).limit(300);
  return (data || []) as MapNews[];
}

/** 기사마다 댓글 수 (지운 댓글은 빼고) — 기사 카드 "댓글 N" (2026-11-04 사장님). 한 번에 최대 300개 */
export async function articleCommentCounts(ids: string[]): Promise<Record<string, number>> {
  const list = [...new Set((ids || []).map(String))].filter((x) => /^[\w-]+$/.test(x)).slice(0, 300);
  if (!list.length) return {};
  const { data } = await admin().from("article_comments").select("article_id").in("article_id", list).eq("is_deleted", false).limit(20000);
  const out: Record<string, number> = {};
  for (const r of data || []) out[String(r.article_id)] = (out[String(r.article_id)] || 0) + 1;
  return out;
}
