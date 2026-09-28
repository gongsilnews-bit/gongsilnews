import { lecturePlanOf, type LecturePlanKey } from "@/utils/lectureAccess";
import { isAdminRole } from "@/utils/permissionCheck";

/**
 * 강의를 올릴 수 있는 유료 등급.
 *
 * 공실스터디부동산·공실뉴스부동산·비즈니스회원. 최고관리자는 따로 늘 통과한다.
 * 요금제가 끝난 회원은 lecturePlanOf 가 무료로 떨어뜨리므로 여기서도 막힌다.
 */
const PAID_LECTURE_PLANS: LecturePlanKey[] = ["study_premium", "news_premium", "biz_premium"];

export type LectureQuota = {
  isAdmin: boolean;
  /** 지금 유료 등급인가 */
  paid: boolean;
  /** 올려 둔 강의 수 (삭제한 것은 빼고) */
  used: number;
  /** 올릴 수 있는 최대 수 (회원 칸 max_lectures). 최고관리자는 null = 무제한 */
  max: number | null;
  canCreate: boolean;
  /** 막힌 이유 — 화면에 그대로 보여 준다 */
  reason: string | null;
};

/**
 * 이 회원이 강의를 하나 더 올릴 수 있는가.
 *
 * 서버 저장과 화면 버튼이 같은 판단을 쓰도록 여기 한 곳에 둔다.
 */
export function lectureQuotaOf(
  member: { role?: string | null; plan_type?: string | null; plan_end_date?: string | null; max_lectures?: number | null } | null | undefined,
  used: number
): LectureQuota {
  if (isAdminRole(member?.role)) {
    return { isAdmin: true, paid: true, used, max: null, canCreate: true, reason: null };
  }
  const plan = lecturePlanOf(member);
  const paid = Boolean(plan && PAID_LECTURE_PLANS.includes(plan));
  const max = Math.max(0, Number(member?.max_lectures) || 0);

  let reason: string | null = null;
  if (!paid) reason = "강의 등록은 유료회원(공실스터디부동산·공실뉴스부동산·비즈니스회원)만 할 수 있습니다.";
  else if (max <= 0) reason = "강의 등록 한도가 없습니다. 최고관리자에게 문의해 주세요.";
  else if (used >= max) reason = `강의는 최대 ${max}개까지 등록할 수 있습니다. (현재 ${used}개)`;

  return { isAdmin: false, paid, used, max, canCreate: reason === null, reason };
}
