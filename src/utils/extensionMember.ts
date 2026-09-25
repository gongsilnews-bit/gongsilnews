import type { NextRequest } from "next/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { getEffectivePlan } from "@/utils/planCheck";

/**
 * 크롬 확장(공실뉴스 AI 기사작성기) 회원 판정
 *
 * - 공실뉴스 로그인 쿠키(확장은 gongsilnews.com 권한으로 쿠키를 함께 보낸다) 또는 Bearer 토큰으로만 판정한다.
 * - 3단계 블로그 작성: 공실뉴스부동산·공실스터디부동산(요금제 기간 내)·최고관리자만.
 *   1·2단계는 비회원도 쓸 수 있으므로 여기서 막지 않는다.
 */

export const BLOG_PLANS = ["admin", "news_premium", "study_premium"] as const;

export const PLAN_LABELS: Record<string, string> = {
  admin: "최고관리자",
  news_premium: "공실뉴스부동산",
  study_premium: "공실스터디부동산",
  free: "무료",
};

export type ExtensionMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  planLabel: string;
  canBlog: boolean;
};

function getAdminClient() {
  return createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getExtensionMember(req: NextRequest): Promise<ExtensionMember | null> {
  const admin = getAdminClient();

  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(authHeader.slice(7).trim());
    userId = data?.user?.id || null;
  }
  if (!userId) {
    const cookieClient = await createCookieSupabase();
    const { data } = await cookieClient.auth.getUser();
    userId = data?.user?.id || null;
  }
  if (!userId) return null;

  const { data: member } = await admin
    .from("members")
    .select("id, name, email, role, plan_type, plan_end_date")
    .eq("id", userId)
    .maybeSingle();
  if (!member) return null;

  const plan = getEffectivePlan(member);
  const role = member.role || "";
  const isAdmin = plan === "admin" || role === "ADMIN";
  return {
    id: member.id,
    name: member.name || "공실뉴스 회원",
    email: member.email || "",
    role,
    plan,
    planLabel: PLAN_LABELS[plan] || (role === "REALTOR" ? "무료부동산" : "일반회원"),
    canBlog: isAdmin || (BLOG_PLANS as readonly string[]).includes(plan),
  };
}
