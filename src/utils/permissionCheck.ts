export function getPermissionLevel(member: {
  role?: string;
  plan_type?: string;
} | null | undefined): number {
  if (!member || !member.role) return 0; // 비회원

  if (member.role === 'ADMIN' || member.role === '최고관리자') return 5;
  
  if (member.role === 'USER' || member.role === '일반회원') return 1;

  if (member.role === 'REALTOR' || member.role === '부동산회원') {
    if (member.plan_type === 'news_premium') return 3;
    if (member.plan_type === 'vacancy_premium') return 4;
    return 2; // 무료부동산회원
  }

  return 1; // 기본적으로 인증된 사용자는 1레벨로 취급
}

export function canAccessBoard(userLevel: number, requiredLevel: number): boolean {
  return userLevel >= requiredLevel;
}

export function getLevelName(level: number): string {
  switch (level) {
    case 0: return "비회원";
    case 1: return "일반회원";
    case 2: return "무료부동산회원";
    case 3: return "공실뉴스부동산 회원";
    case 4: return "공실등록부동산 회원";
    case 5: return "최고관리자";
    default: return "회원";
  }
}
