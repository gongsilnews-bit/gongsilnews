import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image files (.png, .jpg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)',
  ],
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // Vercel 환경에서 넘어오는 호스트 헤더 읽기
  const hostname = request.headers.get('host') || '';

  // 허용할 메인 도메인 및 로컬호스트 (테스트 환경)
  const currentHost =
    process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'
      ? hostname.replace(`.gongsilnews.com`, '')
      : hostname.replace(`.localhost:3000`, '');

  // 메인 도메인 접속 (서브도메인이 없는 경우)
  if (
    hostname === 'localhost:3000' ||
    hostname === 'gongsilnews.com' ||
    hostname === 'www.gongsilnews.com'
  ) {
    // 모바일 기기 접속 여부 확인
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // 쿠키를 통한 PC 버전 강제 보기 옵션 확인 (옵션)
    const viewDesktop = request.cookies.get('view-desktop')?.value === 'true';

    // 이미 /m 경로이거나 관리자 페이지 등은 제외하고 Rewrite
    if (
      isMobile &&
      !viewDesktop &&
      !url.pathname.startsWith('/m') &&
      !url.pathname.startsWith('/admin') &&
      !url.pathname.startsWith('/realty_admin') &&
      !url.pathname.startsWith('/user_admin')
    ) {
      url.pathname = `/m${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // ---- [여기는 서브도메인 접속 환경입니다 (예: happy.gongsilnews.com)] ----
  // currentHost는 서브도메인이름이 됩니다. (예: "happy")
  
  // TODO: Supabase에 연결하여 currentHost로 가입된 부동산의 요금제 기간 및 활성상태 체크를 여기서 수행.
  // API Route Edge Function을 찌르거나 여기서 바로 Supabase 클라이언트 연결하여 expired 판단.
  
  // 현재 요금제 만료 로직은 개발 예정이므로, 일단 접속된 모든 서브도메인을 `/_sites/` 라우트로 포워딩합니다.
  url.pathname = `/_sites/${currentHost}${url.pathname}`;
  
  return NextResponse.rewrite(url);
}
