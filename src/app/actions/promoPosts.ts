"use server";

/**
 * 공실뉴스 회사 홍보 기록 — 홍보 달력·홍보현황 (2026-11-09, docs/2026-11-09_superadmin_page_plan.md ②)
 * 테이블: promo_posts (supabase/migrations/20261109_promo_posts.sql)
 */
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function adminId(): Promise<string | null> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: member } = await getAdminClient().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(member?.role) ? user.id : null;
}

export type PromoPost = {
  id: string;
  created_at: string;
  posted_on: string;
  channel: string;
  title: string | null;
  url: string | null;
  memo: string | null;
  ref_code: string | null;
  signups?: number | null; // 그 꼬리표로 가입한 수 (signup_ref 칸이 없으면 null)
};

/** 테이블이 아직 없을 때 */
const isMissing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || (/promo_posts/.test(e.message || "") && /exist|find/i.test(e.message || "")));

export async function listPromoPosts(from: string, to: string): Promise<{ success: boolean; posts: PromoPost[]; missing?: boolean; error?: string }> {
  if (!(await adminId())) return { success: false, posts: [], error: "권한이 없습니다" };
  const { data, error } = await getAdminClient()
    .from("promo_posts")
    .select("id, created_at, posted_on, channel, title, url, memo, ref_code")
    .gte("posted_on", from)
    .lte("posted_on", to)
    .order("created_at", { ascending: true });
  if (error) return { success: false, posts: [], missing: isMissing(error), error: error.message };
  return { success: true, posts: (data || []) as PromoPost[] };
}

/** 최근 기록 + 그 꼬리표로 가입한 수 */
export async function listRecentPromoPosts(limit = 30): Promise<{ success: boolean; posts: PromoPost[]; missing?: boolean; error?: string }> {
  if (!(await adminId())) return { success: false, posts: [], error: "권한이 없습니다" };
  const db = getAdminClient();
  const { data, error } = await db
    .from("promo_posts")
    .select("id, created_at, posted_on, channel, title, url, memo, ref_code")
    .order("posted_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { success: false, posts: [], missing: isMissing(error), error: error.message };
  const posts = (data || []) as PromoPost[];
  const refs = [...new Set(posts.map((p) => p.ref_code).filter(Boolean))] as string[];
  let counts: Map<string, number> | null = new Map();
  if (refs.length) {
    const { data: ms, error: mErr } = await db.from("members").select("signup_ref").in("signup_ref", refs);
    if (mErr) counts = null; // signup_ref 칸이 아직 없음
    else for (const m of ms || []) counts.set(m.signup_ref, (counts.get(m.signup_ref) || 0) + 1);
  }
  return { success: true, posts: posts.map((p) => ({ ...p, signups: !p.ref_code ? null : counts == null ? null : counts.get(p.ref_code) || 0 })) };
}

export async function addPromoPost(input: { posted_on: string; channel: string; title?: string; url?: string; memo?: string; ref_code?: string }) {
  const uid = await adminId();
  if (!uid) return { success: false, error: "권한이 없습니다" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.posted_on) || !input.channel) return { success: false, error: "날짜와 채널이 필요해요" };
  if (!input.title?.trim() && !input.url?.trim()) return { success: false, error: "제목이나 주소 중 하나는 넣어 주세요" };
  const { data, error } = await getAdminClient()
    .from("promo_posts")
    .insert({
      posted_on: input.posted_on,
      channel: input.channel,
      title: input.title?.trim() || null,
      url: input.url?.trim() || null,
      memo: input.memo?.trim() || null,
      ref_code: input.ref_code?.trim() || null,
      created_by: uid,
    })
    .select("id, created_at, posted_on, channel, title, url, memo, ref_code")
    .single();
  if (error) return { success: false, error: isMissing(error) ? "Supabase에서 SQL을 먼저 실행해 주세요" : error.message };
  return { success: true, post: data as PromoPost };
}

export async function deletePromoPost(id: string) {
  if (!(await adminId())) return { success: false, error: "권한이 없습니다" };
  const { error } = await getAdminClient().from("promo_posts").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
