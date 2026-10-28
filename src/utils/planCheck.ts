/** 공실마케팅 이용 기간(members.studio_end_date)이 남아 있나 — 2026-10-26 이용권은 등급과 따로 저장 */
export function studioAlive(member: { studio_end_date?: string | Date | null } | null | undefined): boolean {
  if (!member?.studio_end_date) return false;
  const end = new Date(member.studio_end_date);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return new Date() <= end;
}

export function getEffectivePlan(member: {
  role?: string;
  plan_type?: string;
  plan_end_date?: string | Date | null;
  studio_end_date?: string | Date | null;
}): string {
  if (!member) return 'free';
  
  // 최고관리자는 모든 권한 무제한 통과용 특별 식별자 반환
  if (member.role === 'ADMIN' || member.role === '최고관리자') return 'admin';

  // 공실마케팅 이용 중이면 예전 유료 등급(news_premium)과 같은 권한 — 비즈니스회원도 이용권을 사면 같다 (2026-10-26)
  if (studioAlive(member) && (member.role === 'REALTOR' || member.role === '부동산회원' || member.role === 'BIZ')) return 'news_premium';
  
  // 일반 회원은 무료 취급
  if (member.role !== 'REALTOR' && member.role !== '부동산회원') return 'free';

  // 부동산회원은 공실마케팅 이용기간 하나로만 가른다 (2026-10-26 사장님 "요금제 기간 · 스튜디오 기간 중복")
  // 예전 유료 등급 값(news_premium · study_premium)은 더 보지 않는다 — 이용기간이 없으면 공실뉴스부동산(무료)
  return 'free';
}

/** 요금제를 내고 받는 권한들. 이 요금제로 열린 권한은 요금제가 끝나면 같이 닫힌다. */
const PAID_PLANS = ['news_premium', 'study_premium', 'biz_premium'];

function isSuperRole(role?: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === '최고관리자';
}

/**
 * 회원에게 켜둔 권한이 지금 살아 있는가.
 *
 * 판정의 주인은 회원의 권한 칸이다 — 최고관리자가 등급과 상관없이 한 사람씩
 * 열고 닫는다. 다만 요금제를 내고 받은 권한은 요금제가 끝나는 날 같이 닫힌다.
 * 돈을 안 내면 닫힌다는 규칙이 권한 칸 때문에 뚫리면 안 되기 때문이다.
 *
 * 무료 회원에게 관리자가 직접 열어준 권한은 만료일과 상관없이 열려 있다.
 * 낼 요금제가 없으니 끝날 요금제도 없다.
 */
export function isPermissionAlive(
  member: {
    role?: string | null;
    plan_type?: string | null;
    plan_end_date?: string | Date | null;
    studio_end_date?: string | Date | null;
  } | null | undefined,
  granted?: boolean | null
): boolean {
  if (!member) return false;
  if (isSuperRole(member.role)) return true;
  if (!granted) return false;
  if (studioAlive(member)) return true; // 공실마케팅 이용 중이면 켜 둔 권한도 살아 있다
  // 부동산회원의 유료 권한은 공실마케팅 이용기간과 같이 닫힌다 (예전 유료 등급 값은 안 본다, 2026-10-26)
  if ((member.role === 'REALTOR' || member.role === '부동산회원') && (member.plan_type === 'news_premium' || member.plan_type === 'study_premium')) return false;

  if (!member.plan_type || !PAID_PLANS.includes(member.plan_type)) return true;
  if (!member.plan_end_date) return true;

  const endDate = new Date(member.plan_end_date);
  endDate.setHours(23, 59, 59, 999);
  return new Date() <= endDate;
}
