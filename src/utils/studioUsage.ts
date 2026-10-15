import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { trialMonth, type ExtensionMember } from "@/utils/extensionMember";
import { isAdminRole } from "@/utils/permissionCheck";

/**
 * 공실뉴스 스튜디오 이용 횟수 (2026-10-15 회의 결정)
 *
 * 블로그(SNS뉴스발행) 한 달 기본 횟수 — 등급별:
 *   일반회원 0 · 무료부동산 3 · 공실스터디부동산·비즈니스회원 무제한 · 최고관리자 무제한
 * 최고관리자가 회원마다 정할 수 있다: members.studio_blog_limit (NULL=등급 기본, -1=무제한, n=월 n회)
 *
 * - 1회 = 이번 달 공실 하나. 같은 공실의 다시 쓰기·수정·네이버 채우기는 더 깎지 않는다.
 * - 크롬 확장 블로그 체험과 같은 기록(extension_trial_usage, feature 'blog')을 함께 센다.
 *   확장 기록(vacancy_id 없음)은 한 줄 = 1회, 스튜디오 기록은 공실 하나 = 1회.
 * - 무제한이어도 하루 안전 상한이 있다 (회원 ChatGPT·네이버 계정 보호): 새 공실 20건, AI 이미지 10장. 최고관리자는 없음.
 */

export const STUDIO_DAILY_BLOG = 20;
export const STUDIO_DAILY_AI_IMAGE = 10;
const UNLIMITED = -1;

function admin() {
  return createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* 한국 시간 오늘 0시 (UTC ISO) */
function kstTodayStart(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600 * 1000).toISOString();
}

/** 등급 기본 한 달 횟수 */
export function gradeBlogLimit(member: ExtensionMember): number {
  if (isAdminRole(member.role)) return UNLIMITED;
  if (member.canBlog || member.role === "BIZ") return UNLIMITED;
  if (member.role === "REALTOR") return 3;
  return 0;
}

async function memberOverride(memberId: string): Promise<number | null> {
  // 칸이 아직 없으면(DB 변경 전) 등급 기본으로 본다
  const { data, error } = await admin().from("members").select("studio_blog_limit").eq("id", memberId).maybeSingle();
  if (error || !data) return null;
  const v = (data as { studio_blog_limit: number | null }).studio_blog_limit;
  return typeof v === "number" ? v : null;
}

export type StudioUsage = {
  plan: string;
  /** 한 달 횟수. -1 = 무제한 */
  monthLimit: number;
  monthUsed: number;
  monthRemaining: number | null; // null = 무제한
  dailyLimit: number | null; // null = 상한 없음(최고관리자)
  todayUsed: number;
  aiImageToday: number;
  aiImageLimit: number | null;
  custom: boolean;
  /** 이번 달 이미 쓴 공실 (다시 쓰면 깎지 않음) */
  vacancyIds: string[];
};

export async function getStudioUsage(member: ExtensionMember): Promise<StudioUsage> {
  const db = admin();
  const override = await memberOverride(member.id);
  const monthLimit = override ?? gradeBlogLimit(member);
  const isAdmin = isAdminRole(member.role);

  const month = trialMonth();
  let rows: { vacancy_id?: string | null; created_at: string; feature: string }[] = [];
  const withVacancy = await db.from("extension_trial_usage").select("vacancy_id, created_at, feature").eq("member_id", member.id).eq("used_month", month).in("feature", ["blog", "ai_image"]);
  if (withVacancy.error) {
    const plain = await db.from("extension_trial_usage").select("created_at, feature").eq("member_id", member.id).eq("used_month", month).eq("feature", "blog");
    rows = plain.data || [];
  } else {
    rows = withVacancy.data || [];
  }

  const blogRows = rows.filter((r) => r.feature === "blog");
  const vacancyIds = Array.from(new Set(blogRows.map((r) => r.vacancy_id).filter((v): v is string => Boolean(v))));
  const monthUsed = blogRows.filter((r) => !r.vacancy_id).length + vacancyIds.length;
  const today = kstTodayStart();
  const todayUsed = blogRows.filter((r) => r.created_at >= today).length;
  const aiImageToday = rows.filter((r) => r.feature === "ai_image" && r.created_at >= today).length;

  return {
    plan: member.planLabel,
    monthLimit,
    monthUsed,
    monthRemaining: monthLimit === UNLIMITED ? null : Math.max(0, monthLimit - monthUsed),
    dailyLimit: isAdmin ? null : STUDIO_DAILY_BLOG,
    todayUsed,
    aiImageToday,
    aiImageLimit: isAdmin ? null : STUDIO_DAILY_AI_IMAGE,
    custom: override !== null,
    vacancyIds,
  };
}

export type ConsumeResult = { ok: true; charged: boolean; usage: StudioUsage } | { ok: false; reason: string; usage: StudioUsage };

/** 블로그를 쓰기 전(kind 'blog', 공실 하나 1회) 또는 AI 이미지를 만들기 전(kind 'ai_image')에 부른다 */
export async function consumeStudio(member: ExtensionMember, kind: "blog" | "ai_image", vacancyId?: string): Promise<ConsumeResult> {
  const usage = await getStudioUsage(member);
  const db = admin();
  const month = trialMonth();

  if (kind === "ai_image") {
    if (usage.aiImageLimit !== null && usage.aiImageToday >= usage.aiImageLimit) {
      return { ok: false, reason: `AI 이미지는 계정 보호를 위해 하루 ${usage.aiImageLimit}장까지 만들 수 있습니다. 내일 다시 만들어 주세요.`, usage };
    }
    // 기록 칸이 없으면(DB 변경 전) 막지 않는다
    await db.from("extension_trial_usage").insert({ member_id: member.id, feature: "ai_image", used_month: month, source: "studio" });
    return { ok: true, charged: true, usage: { ...usage, aiImageToday: usage.aiImageToday + 1 } };
  }

  if (!vacancyId) return { ok: false, reason: "공실 정보가 없습니다.", usage };
  // 이번 달 이미 쓴 공실이면 깎지 않는다
  if (usage.vacancyIds.includes(vacancyId)) return { ok: true, charged: false, usage };

  if (usage.monthLimit === 0) {
    return { ok: false, reason: "블로그 쓰기는 부동산회원(중개사) 기능입니다. 부동산회원으로 전환하면 매월 무료로 써 볼 수 있습니다.", usage };
  }
  if (usage.monthRemaining !== null && usage.monthRemaining <= 0) {
    return { ok: false, reason: `이번 달 블로그 ${usage.monthLimit}회를 모두 썼습니다. 공실스터디 멤버십이면 무제한으로 쓸 수 있습니다.`, usage };
  }
  if (usage.dailyLimit !== null && usage.todayUsed >= usage.dailyLimit) {
    return { ok: false, reason: `계정 보호를 위해 블로그는 하루 ${usage.dailyLimit}건(새 공실)까지 쓸 수 있습니다. 내일 다시 써 주세요.`, usage };
  }

  const ins = await db.from("extension_trial_usage").insert({ member_id: member.id, feature: "blog", used_month: month, vacancy_id: vacancyId, source: "studio" });
  if (ins.error) {
    // DB 변경 전: 공실 칸 없이 한 줄만 남긴다
    const plain = await db.from("extension_trial_usage").insert({ member_id: member.id, feature: "blog", used_month: month });
    if (plain.error) return { ok: false, reason: `이용 기록을 남기지 못했습니다: ${plain.error.message}`, usage };
  }
  return {
    ok: true,
    charged: true,
    usage: {
      ...usage,
      monthUsed: usage.monthUsed + 1,
      monthRemaining: usage.monthRemaining === null ? null : usage.monthRemaining - 1,
      todayUsed: usage.todayUsed + 1,
      vacancyIds: [...usage.vacancyIds, vacancyId],
    },
  };
}
