export function getPermissionLevel(member: {
  role?: string;
  plan_type?: string;
  agencies?: { status?: string } | { status?: string }[] | null;
} | null | undefined): number {
  if (!member || !member.role) return 0; // 비회원

  if (isAdminRole(member.role)) return 5;
  
  if (member.role === 'USER' || member.role === '일반회원') return 1;

  if (member.role === 'REALTOR' || member.role === '부동산회원') {
    let agencyStatus = "";
    if (member.agencies) {
      if (Array.isArray(member.agencies)) {
        agencyStatus = member.agencies[0]?.status || "";
      } else {
        agencyStatus = member.agencies.status || "";
      }
    }
    if (agencyStatus !== 'APPROVED') {
      return 1; // 미승인 부동산 회원은 일반회원(1레벨) 권한으로 제한
    }

    // 공실뉴스부동산이 최상위다. 공실스터디부동산이 그 아래.
    if (member.plan_type === 'news_premium') return 4;
    if (member.plan_type === 'study_premium') return 3;
    return 2; // 무료부동산회원
  }

  return 1; // 기본적으로 인증된 사용자는 1레벨로 취급
}
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalizedRole = role.trim().toUpperCase();
  // 부동산회원, 부동산관리자 등은 본사 최고관리자가 아니므로 제외
  if (
    normalizedRole.includes("부동산") ||
    normalizedRole.includes("REALTOR") ||
    normalizedRole.includes("AGENCY")
  ) {
    return false;
  }
  return (
    normalizedRole === "ADMIN" ||
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "SUPERADMIN" ||
    normalizedRole === "최고관리자" ||
    normalizedRole === "SUPER_ADMINISTRATOR" ||
    normalizedRole === "MASTER"
  );
}

export function getEffectiveMemberRole(role?: string | null, agencyStatus?: string | null): "ADMIN" | "REALTOR" | "USER" {
  if (isAdminRole(role)) return "ADMIN";
  if (agencyStatus === "APPROVED") return "REALTOR";
  return role?.trim().toUpperCase() === "REALTOR" || role === "부동산회원" ? "USER" : "USER";
}

export function canAccessBoard(userLevel: number, requiredLevel: number): boolean {
  return userLevel >= requiredLevel;
}

export function getLevelName(level: number): string {
  switch (level) {
    case 0: return "비회원";
    case 1: return "일반회원";
    case 2: return "무료부동산회원";
    case 3: return "공실스터디부동산 회원";
    case 4: return "공실뉴스부동산 회원";
    case 5: return "최고관리자";
    default: return "회원";
  }
}

/**
 * 회원 등급의 이름.
 *
 * 화면마다 따로 조합하던 것을 한 곳으로 모은다. 전에는 헤더 다섯 군데가
 * role 만 보고 부동산회원을 전부 "부동산회원"으로 불러, 돈을 낸 사람과
 * 무료 회원이 같은 글자를 봤다.
 */
export function getPlanLabel(member: {
  role?: string | null;
  plan_type?: string | null;
} | null | undefined): string {
  const role = member?.role;
  if (isAdminRole(role)) return '최고관리자';
  if (role === 'BIZ' || role === '비즈니스회원') return '비즈니스회원';

  if (role === 'REALTOR' || role === '부동산회원') {
    const plan = member?.plan_type;
    if (plan === 'news_premium' || plan === 'news_basic') return '공실뉴스부동산';
    if (plan === 'study_premium' || plan === 'vacancy_premium' || plan === 'vacancy_basic') return '공실스터디부동산';
    return '무료부동산';
  }

  return '일반회원';
}

/** 사이트 헤더에서 관리자 화면으로 들어가는 버튼에 쓸 글자 */
export function getAdminEntryLabel(
  member: { role?: string | null; plan_type?: string | null } | null | undefined,
  agencyStatus?: string | null
): string {
  const role = member?.role;
  // 서류가 반려된 중개사에게는 등급보다 먼저 알려줄 것이 있다
  if ((role === 'REALTOR' || role === '부동산회원') && agencyStatus === 'REJECTED') {
    return '서류보완 >>';
  }
  return `${getPlanLabel(member)} admin >>`;
}

/** 요금제 만료일을 배지에 붙일 짧은 꼴로. 없으면 빈 글자 */
export function formatPlanEnd(planEndDate?: string | Date | null): string {
  if (!planEndDate) return '';
  const d = new Date(planEndDate);
  if (Number.isNaN(d.getTime())) return '';
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `(~${yy}.${mm}.${dd})`;
}

/** 만료가 코앞인가. 배지 색을 바꿔 연장을 놓치지 않게 한다 */
export function isPlanEndingSoon(planEndDate?: string | Date | null, days: number = 7): boolean {
  if (!planEndDate) return false;
  const d = new Date(planEndDate);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  const left = d.getTime() - Date.now();
  return left >= 0 && left <= days * 24 * 60 * 60 * 1000;
}
