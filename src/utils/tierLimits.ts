import { createClient } from "@supabase/supabase-js";
import { LIMITS, HOMEPAGE_ONLY_LIMIT } from "./tier";

/**
 * 등급별 한도 — 최고관리자 [회원관리 › 등급별 한도 설정] 화면의 값을 실제 판정에 쓴다 (2026-11-09 사장님: "적용되는 것으로 바꿔줘")
 *  예전엔 화면은 point_settings 에 저장하고, 실제 판정은 코드 안 고정값(tier.ts LIMITS)을 써서 둘이 갈라져 있었다.
 *  서버에서만 쓴다. 값이 없으면 확정값(2026-11-04)으로. 1분 동안 기억해 두고 다시 읽는다.
 */
export type TierLimits = {
  /** 부동산회원(무료) — 공실뉴스에 거는 공실 · 월 기사 · 월 블로그·SNS 쓰기 */
  freeVacancies: number;
  freeArticles: number;
  freeWrites: number;
  /** 공실뉴스부동산(유료) — 공실 · 홈페이지 전용 공실 · 월 기사 */
  proVacancies: number;
  proHomepageVacancies: number;
  /** 공실뉴스부동산 — 광고 중(공실뉴스·내 홈페이지) + 임시저장 합계 (2026-11-10 사장님: "total 50 · 공실뉴스 광고는 20건까지") */
  proTotalVacancies: number;
  proArticles: number;
  /** 비즈니스회원 — 공실(0 = 제한 없음) · 월 기사 */
  bizVacancies: number;
  bizArticles: number;
};

export const TIER_LIMIT_DEFAULTS: TierLimits = {
  freeVacancies: LIMITS.vacancy.free,
  freeArticles: 0,
  freeWrites: LIMITS.freeBlogPerMonth,
  proVacancies: LIMITS.vacancy.pro,
  proHomepageVacancies: HOMEPAGE_ONLY_LIMIT,
  proTotalVacancies: 50,
  proArticles: LIMITS.proArticlePerMonth,
  bizVacancies: 0,
  bizArticles: 10,
};

/** 화면 칸(point_settings 키) ↔ 한도 */
export const TIER_LIMIT_KEYS: Record<keyof TierLimits, string> = {
  freeVacancies: "LIMIT_REALTOR_FREE_VACANCY",
  freeArticles: "LIMIT_REALTOR_FREE_ARTICLE",
  freeWrites: "LIMIT_REALTOR_FREE_WRITES",
  proVacancies: "LIMIT_REALTOR_NEWS_VACANCY",
  proHomepageVacancies: "LIMIT_REALTOR_NEWS_HOMEPAGE_VACANCY",
  proTotalVacancies: "LIMIT_REALTOR_NEWS_TOTAL_VACANCY",
  proArticles: "LIMIT_REALTOR_NEWS_ARTICLE",
  bizVacancies: "LIMIT_BIZ_VACANCY",
  bizArticles: "LIMIT_BIZ_ARTICLE",
};

let cache: { at: number; v: TierLimits } | null = null;

export async function getTierLimits(): Promise<TierLimits> {
  if (cache && Date.now() - cache.at < 60_000) return cache.v;
  const v: TierLimits = { ...TIER_LIMIT_DEFAULTS };
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await db.from("point_settings").select("key, value").in("key", Object.values(TIER_LIMIT_KEYS));
    for (const [k, key] of Object.entries(TIER_LIMIT_KEYS) as [keyof TierLimits, string][]) {
      const row = (data || []).find((r: { key: string }) => r.key === key) as { value: unknown } | undefined;
      const n = Number(row?.value);
      if (row && Number.isFinite(n) && n >= 0) v[k] = n;
    }
  } catch { /* 못 읽으면 확정값 */ }
  cache = { at: Date.now(), v };
  return v;
}

/** 화면에서 저장한 뒤 바로 적용되게 */
export function clearTierLimitsCache() { cache = null; }
