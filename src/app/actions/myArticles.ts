"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { saveArticlePromoFor } from "@/utils/articlePromos";
import type { PromoChannel } from "@/utils/vacancyPromos";

/**
 * 홈 "내 기사" 줄 (2026-10-28 사장님) — 내가 쓴 공실뉴스 기사로 SNS 마케팅
 * 로그인 쿠키로 본인을 확인하고, 본인 기사만 읽는다.
 *  - getMyArticleCards: 카드에 쓰는 칸만 (가볍게)
 *  - getMyArticleBody: 카드를 눌렀을 때 그 기사 본문 (SNS 글감)
 */

// links — 이 기사로 쓴 채널별 글 주소 (기사 홍보현황 article_promos, 2026-10-28)
export type MyArticleCard = { id: string; no: string; title: string; status: string; at: string; thumb: string | null; links: Partial<Record<PromoChannel, string>> };

function admin() {
  return createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function me() {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  return user;
}

export async function getMyArticleCards(): Promise<{ success: boolean; data: MyArticleCard[]; error?: string }> {
  const user = await me();
  if (!user) return { success: false, data: [], error: "로그인이 필요합니다." };
  const { data, error } = await admin()
    .from("articles")
    .select("id, article_no, title, status, published_at, created_at, thumbnail_url")
    .eq("author_id", user.id)
    .neq("is_deleted", true)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return { success: false, data: [], error: error.message };
  // 기사 홍보현황 — 표가 아직 없으면 링크 없음으로
  const links: Record<string, Partial<Record<PromoChannel, string>>> = {};
  if (data?.length) {
    const { data: rows } = await admin().from("article_promos").select("article_id, channel, url").in("article_id", data.map((a) => a.id));
    for (const r of rows || []) (links[String(r.article_id)] ||= {})[r.channel as PromoChannel] = r.url;
  }
  return {
    success: true,
    data: (data || []).map((a) => ({
      id: String(a.id),
      no: String(a.article_no || a.id),
      title: a.title || "제목 없는 기사",
      status: a.status || "",
      at: a.published_at || a.created_at || "",
      thumb: a.thumbnail_url || null,
      links: links[String(a.id)] || {},
    })),
  };
}

// HTML 본문 → 글 (문단은 줄바꿈으로)
const toText = (html: string) =>
  String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

export async function getMyArticleBody(id: string): Promise<{ success: boolean; article?: { no: string; title: string; subtitle: string; body: string; at: string }; error?: string }> {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  const { data: a, error } = await admin()
    .from("articles")
    .select("id, article_no, title, subtitle, content, published_at, created_at, author_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!a || a.author_id !== user.id) return { success: false, error: "기사를 찾을 수 없어요." };
  return {
    success: true,
    article: { no: String(a.article_no || a.id), title: a.title || "", subtitle: a.subtitle || "", body: toText(a.content), at: a.published_at || a.created_at || "" },
  };
}

/** 홈 내 기사 메뉴 [삭제] — 본인 기사만 (기사관리 [삭제]와 같이 is_deleted) */
export async function deleteMyArticle(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  const { data, error } = await admin().from("articles").update({ is_deleted: true }).eq("id", id).eq("author_id", user.id).select("id");
  if (error) return { success: false, error: error.message };
  if (!data?.length) return { success: false, error: "기사를 찾을 수 없어요." };
  return { success: true };
}

/** 기사 홍보현황 [링크 붙여넣기]·[연결 끊기](빈 주소) — 본인 기사만 */
export async function saveMyArticlePromo(id: string, channel: PromoChannel, url: string): Promise<{ success: boolean; error?: string }> {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  return saveArticlePromoFor(user.id, { id }, channel, url, "paste");
}
