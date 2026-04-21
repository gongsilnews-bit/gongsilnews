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
