export function getEffectivePlan(member: {
  role?: string;
  plan_type?: string;
  plan_end_date?: string | Date | null;
}): string {
  if (!member) return 'free';
  
  // 최고관리자는 모든 권한 무제한 통과용 특별 식별자 반환
  if (member.role === 'ADMIN' || member.role === '최고관리자') return 'admin';
  
  // 일반 회원은 무료 취급
  if (member.role !== 'REALTOR' && member.role !== '부동산회원') return 'free';
  
  // 부동산 회원 중 요금제가 지정 안 된 경우 무료 취급
  if (!member.plan_type || member.plan_type === 'free') return 'free';

  // 유료 요금제 (공실뉴스, 공실등록 등) 만료일 검사
  if (member.plan_end_date) {
    const endDate = new Date(member.plan_end_date);
    // 종료일의 자정까지 유효하도록 처리 (optional)
    endDate.setHours(23, 59, 59, 999);
    
    const now = new Date();
    if (now > endDate) {
      // 기간이 지났으면 무료로 Fallback
      return 'free';
    }
  }

  // 아직 만료되지 않았으면 해당 요금제 그대로 유지
  return member.plan_type;
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
  } | null | undefined,
  granted?: boolean | null
): boolean {
  if (!member) return false;
  if (isSuperRole(member.role)) return true;
  if (!granted) return false;

  if (!member.plan_type || !PAID_PLANS.includes(member.plan_type)) return true;
  if (!member.plan_end_date) return true;

  const endDate = new Date(member.plan_end_date);
  endDate.setHours(23, 59, 59, 999);
  return new Date() <= endDate;
}
