/**
 * 부동산 회원 등급 — 한곳에서 판정 (2026-11-04 사장님 회의, docs/2026-11-04_member_tiers_plan.md)
 *  공실뉴스부동산(무료) · 공실뉴스부동산 PRO(유료, 주황 PRO 딱지) · 비즈니스회원(PRO 와 같은 권한) · 최고관리자
 *  PRO 판정 = 이용 기간(members.studio_end_date) 이 남았나 — 예전 스튜디오회원(빌드온·착함임대 등)은 그대로 PRO
 *  등급 코드값(plan_type news_premium·study_premium 등)은 보지 않는다 (기간이 끝나도 유료로 읽히던 곳을 막는다)
 *  서버·화면 둘 다 쓴다 (브라우저 전용 코드를 넣지 않는다)
 */
import { studioAlive } from "./planCheck";

export type Tier = "user" | "free" | "pro" | "biz" | "admin";
export type TierMember = { role?: string | null; plan_type?: string | null; plan_end_date?: string | Date | null; studio_end_date?: string | Date | null } | null | undefined;

export function memberTier(m: TierMember): Tier {
  const role = m?.role || "";
  if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "최고관리자") return "admin";
  if (role === "BIZ" || role === "비즈니스회원") return "biz";
  if (role === "REALTOR" || role === "부동산회원") return studioAlive(m) ? "pro" : "free";
  return "user";
}
/** PRO 기능을 쓸 수 있나 — PRO · 비즈니스회원 · 최고관리자 */
export const isProTier = (t: Tier) => t === "pro" || t === "biz" || t === "admin";
export const isPro = (m: TierMember) => isProTier(memberTier(m));

/** 한도 (광고 중인 공실만 센다) */
export const LIMITS = {
  /** 공실뉴스에 거는 공실 (부동산노출 · 부동산노출 + 일반인노출) */
  vacancy: { free: 3, pro: 20 },
  /** 무료 — 공실로 블로그 한 달에 (같은 공실 고쳐 쓰기는 안 센다) */
  freeBlogPerMonth: 3,
  /** PRO 기사 작성 한 달에 */
  proArticlePerMonth: 4,
} as const;

/** 공실 한도 — 비즈니스회원·최고관리자는 없음(null) */
export function vacancyLimit(t: Tier): number | null {
  if (t === "free") return LIMITS.vacancy.free;
  if (t === "pro") return LIMITS.vacancy.pro;
  return null;
}

export const PRO_ORANGE = "#ea8a0c";
/** 종료일 짧게 — 2026-11-30 → 261130 (2026-11-06 사장님: "2026-11-30 너무 길어") */
export function shortEnd(d?: string | Date | null): string {
  if (!d) return "";
  const s = typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[1].slice(2)}${m[2]}${m[3]}` : "";
}
export const TIER_NAME: Record<Tier, string> = { user: "일반회원", free: "부동산회원", pro: "공실뉴스부동산", biz: "비즈니스회원", admin: "최고관리자" };
/** PRO 기능을 무료 회원이 눌렀을 때 */
export const PRO_ONLY = "공실뉴스부동산에서 쓸 수 있어요.";

/**
 * 내 홈페이지 전용 공실 (2026-11-04 사장님: "기능 만들자") — 노출 칸 세 번째 값
 *  DB 값은 띄어쓰기 없이 "홈페이지전용" (화면 이름은 "내 홈페이지만"). PRO 만 고른다.
 *  공실뉴스 지도·목록·다른 부동산에는 안 보이고 내 물건접수홈페이지에만. 한도는 공실뉴스 20건과 따로 20건
 */
export const HOMEPAGE_ONLY = "홈페이지전용";
export const HOMEPAGE_ONLY_LABEL = "내 홈페이지만";
export const isHomepageOnly = (v: { exposure_type?: string | null } | null | undefined) => String(v?.exposure_type || "").replace(/\s/g, "") === HOMEPAGE_ONLY;
/** 내 홈페이지 전용 공실 한도 (PRO) */
export const HOMEPAGE_ONLY_LIMIT = 20;
