import type { NextRequest } from "next/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { getEffectivePlan } from "@/utils/planCheck";
import { isAdminRole } from "@/utils/permissionCheck";

/**
 * 크롬 확장(공실뉴스 AI 기사작성기) 회원 판정
 *
 * - 공실뉴스 로그인 쿠키(확장은 gongsilnews.com 권한으로 쿠키를 함께 보낸다) 또는 Bearer 토큰으로만 판정한다.
 * - 3단계 블로그 작성: 공실뉴스부동산·공실스터디부동산(요금제 기간 내)·최고관리자는 무제한.
 * - AI 유튜브작성기: 위와 같은 회원 범위지만 별도 권한 값으로 응답한다.
 * - 그 외 로그인 회원은 블로그·유튜브 대본을 기능별로 매월 3번 무료 체험한다 (아래 consumeTrial).
 *   1·2단계는 비회원도 쓸 수 있으므로 여기서 막지 않는다.
 */

export const BLOG_PLANS = ["admin", "news_premium", "study_premium"] as const;
export const YOUTUBE_WRITER_PLANS = ["admin", "news_premium", "study_premium"] as const;
/** 리모델링 작성기: 위 요금제 + 비즈니스회원(역할로 판정) */
export const REMODEL_PLANS = ["admin", "news_premium", "study_premium"] as const;
/** 뉴스메이커(newsmaker10) 블로그·유튜브 무제한: 위 요금제 + 비즈니스회원(역할로 판정). 그 외 회원은 무료 체험 */
export const NEWSMAKER_PLANS = ["admin", "news_premium", "study_premium"] as const;

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
  canYoutubeWriter: boolean;
  /** 리모델링 작성기(remodeling10) — 유료회원 전용. 비즈니스회원도 포함한다 */
  canRemodel: boolean;
  /** 뉴스메이커(newsmaker10) 블로그·유튜브 대본 무제한 — 비즈니스회원도 포함한다 */
  canNewsMaker: boolean;
};

function getAdminClient() {
  return createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ═════════════ 무료 체험 (3번 블로그 · 4번 유튜브 대본) ═════════════
   유료 회원(canBlog·canYoutubeWriter)이 아닌 로그인 회원은 기능별로 매월 3번까지 쓴다.
   기록은 extension_trial_usage 한 줄 = 1번. 월은 한국 시간 기준. */
export const TRIAL_LIMIT = 3;
export type TrialFeature = "blog" | "youtube";
export type TrialStatus = { used: number; remaining: number; limit: number };

/** 한국 시간 기준 'YYYY-MM' */
export function trialMonth(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

async function countTrialUse(memberId: string, feature: TrialFeature, month: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("extension_trial_usage")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("feature", feature)
    .eq("used_month", month);
  if (error) throw new Error(`무료 체험 기록을 읽지 못했습니다: ${error.message}`);
  return count || 0;
}

const trialStatus = (used: number): TrialStatus => ({
  used,
  remaining: Math.max(0, TRIAL_LIMIT - used),
  limit: TRIAL_LIMIT,
});

/** 이번 달 블로그·유튜브 무료 체험 사용 현황 */
export async function getTrialUsage(memberId: string): Promise<Record<TrialFeature, TrialStatus> & { month: string }> {
  const month = trialMonth();
  const [blog, youtube] = await Promise.all([
    countTrialUse(memberId, "blog", month),
    countTrialUse(memberId, "youtube", month),
  ]);
  return { month, blog: trialStatus(blog), youtube: trialStatus(youtube) };
}

/** 무료 체험 1번을 쓴다. 이번 달 3번을 다 썼으면 ok:false */
export async function consumeTrial(memberId: string, feature: TrialFeature): Promise<{ ok: boolean } & TrialStatus> {
  const month = trialMonth();
  const used = await countTrialUse(memberId, feature, month);
  if (used >= TRIAL_LIMIT) return { ok: false, ...trialStatus(used) };
  const { error } = await getAdminClient()
    .from("extension_trial_usage")
    .insert({ member_id: memberId, feature, used_month: month });
  if (error) throw new Error(`무료 체험 기록을 남기지 못했습니다: ${error.message}`);
  return { ok: true, ...trialStatus(used + 1) };
}

/**
 * 블로그 네이버 전송(매물·물건 출처 API)을 허용할 회원인가
 * 유료 회원이거나, 최근 31일 안에 블로그 무료 체험을 쓴 회원(체험으로 만든 글을 보내야 하므로).
 */
export async function canSendBlog(member: ExtensionMember | null): Promise<boolean> {
  if (!member) return false;
  if (member.canBlog) return true;
  const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await getAdminClient()
    .from("extension_trial_usage")
    .select("id", { count: "exact", head: true })
    .eq("member_id", member.id)
    .eq("feature", "blog")
    .gte("created_at", since);
  return (count || 0) > 0;
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
  const isAdmin = plan === "admin" || isAdminRole(role);
  // getEffectivePlan 은 비즈니스회원을 free 로 보므로 역할로 따로 연다
  const isBiz = role === "BIZ" || role === "비즈니스회원";
  return {
    id: member.id,
    name: member.name || "공실뉴스 회원",
    email: member.email || "",
    role,
    plan,
    planLabel: PLAN_LABELS[plan] || (role === "REALTOR" ? "무료부동산" : role === "BIZ" ? "비즈니스회원" : "일반회원"),
    canBlog: isAdmin || (BLOG_PLANS as readonly string[]).includes(plan),
    canYoutubeWriter: isAdmin || (YOUTUBE_WRITER_PLANS as readonly string[]).includes(plan),
    canRemodel: isAdmin || (REMODEL_PLANS as readonly string[]).includes(plan) || isBiz,
    canNewsMaker: isAdmin || (NEWSMAKER_PLANS as readonly string[]).includes(plan) || isBiz,
  };
}
