import { studioAlive } from "@/utils/planCheck";
/**
 * 강의를 공짜로 들을 수 있는 등급.
 *
 * 회원 등급은 role 과 plan_type 두 칸에 나뉘어 있다. 강의 설정에서는 한 줄로
 * 골라야 하므로 여기서 한 이름으로 합친다.
 */
export const LECTURE_PLAN_KEYS = [
  "user",
  "realtor_free",
  "news_premium",
  "biz_premium",
] as const;

export type LecturePlanKey = (typeof LECTURE_PLAN_KEYS)[number];

export const LECTURE_PLAN_LABELS: Record<LecturePlanKey, string> = {
  user: "일반회원",
  realtor_free: "공실뉴스부동산",
  news_premium: "스튜디오회원",
  biz_premium: "비즈니스회원",
};

/** 최고관리자는 어디서든 통과한다 */
export function isLectureAdmin(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "최고관리자";
}

/**
 * 이 회원이 지금 어느 등급인가.
 *
 * 요금제가 끝났으면 무료로 떨어진다 — 그래야 요금제가 끝나는 날 강의도 같이
 * 닫힌다. 여기서 만료를 함께 보지 않으면 "요금제를 끊었는데 강의는 계속
 * 보는" 상태가 생긴다.
 * 옛 공실스터디부동산(study_premium)은 2026-10-26 공실뉴스부동산으로 합쳐서 news_premium 으로 읽는다.
 */
export function lecturePlanOf(member: {
  role?: string | null;
  plan_type?: string | null;
  plan_end_date?: string | Date | null;
  studio_end_date?: string | Date | null;
} | null | undefined): LecturePlanKey | null {
  if (!member) return null;

  const role = member.role;
  if (role === "BIZ" || role === "비즈니스회원") return "biz_premium";
  if (role !== "REALTOR" && role !== "부동산회원") return "user";
  // 부동산회원은 공실마케팅 이용기간 하나로만 가른다 — 예전 유료 등급 값은 안 본다 (2026-10-26)
  return studioAlive(member) ? "news_premium" : "realtor_free";
}

/** 지금 이 회원이 이 강의를 공짜로 들을 수 있는가 */
export function canTakeFree(
  member: Parameters<typeof lecturePlanOf>[0],
  freeForPlans?: string[] | null
): boolean {
  if (isLectureAdmin(member?.role)) return true;
  const plan = lecturePlanOf(member);
  return Boolean(plan && (freeForPlans || []).includes(plan));
}
