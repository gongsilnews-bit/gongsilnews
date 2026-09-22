import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 닫힌 중개사 홈페이지에 무엇으로 답할 것인가.
 *
 * 결제가 끊긴 홈페이지를 404 로 답하면 검색엔진이 그 주소를 색인에서 지운다.
 * 나중에 다시 결제해도 검색 순위는 돌아오지 않는다. 503(일시적으로 쓸 수 없음)은
 * "지금은 아니지만 있던 자리다"라는 뜻이라 색인이 유지된다.
 *
 * 없는 주소(오타로 들어온 사람)는 그대로 404 로 둔다 — 그건 실제로 없는 페이지다.
 */
function pausedResponse() {
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>일시적으로 중단된 페이지</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#f6f8fa; color:#16202b; font-family:'Pretendard Variable',-apple-system,sans-serif;
         padding:24px; box-sizing:border-box; }
  .box { max-width:420px; text-align:center; background:#fff; border:1px solid #e8ecf0;
         border-radius:12px; padding:44px 26px; box-shadow:0 1px 3px rgba(16,24,40,.08); }
  h1 { margin:0 0 14px; font-size:21px; font-weight:800; letter-spacing:-0.5px; }
  p { margin:0 0 26px; font-size:15px; line-height:1.75; color:#6b7684; word-break:keep-all; }
  a { display:inline-block; padding:13px 24px; background:#16202b; color:#fff; border-radius:8px;
      font-size:15px; font-weight:800; text-decoration:none; }
</style>
</head>
<body>
  <div class="box">
    <h1>일시적으로 중단된 페이지입니다</h1>
    <p>이용이 잠시 중지되어 지금은 열 수 없습니다.<br>곧 다시 열릴 예정입니다.</p>
    <a href="https://gongsilnews.com">공실뉴스로 가기</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // 하루 뒤에 다시 와 보라고 알려준다
      'Retry-After': '86400',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * 이 주소가 지금 열려 있는지 본다.
 *
 * 한 번의 조회로 홈페이지 설정과 주인의 요금제를 같이 읽는다. 판단 기준은
 * getHomepageSettingsBySubdomain 과 같아야 한다 — 다르면 미들웨어는 닫았는데
 * 페이지는 열리는 식으로 어긋난다.
 *
 * 조회가 실패하면 열린 것으로 본다. 잠깐의 장애 때문에 멀쩡한 홈페이지를
 * 전부 닫아버리는 쪽이 훨씬 나쁘다.
 */
async function isSitePaused(subdomain: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const res = await fetch(
      `${url}/rest/v1/homepage_settings?subdomain=eq.${encodeURIComponent(subdomain)}` +
        `&select=is_active,members(role,plan_type,plan_end_date)`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    );
    if (!res.ok) return false;

    const rows = (await res.json()) as any[];
    // 없는 주소는 여기서 판단하지 않는다. 그대로 넘겨 페이지가 404 화면을 그린다.
    if (!rows?.length) return false;

    const row = rows[0];
    if (row.is_active === false) return true;

    const m = row.members || {};
    const isPremium =
      m.role === 'SUPER_ADMIN' ||
      m.role === 'ADMIN' ||
      m.role === '최고관리자' ||
      ((m.plan_type === 'news_premium' ||
        m.plan_type === 'study_premium' ||
        m.plan_type === 'biz_premium') &&
        (!m.plan_end_date || new Date(m.plan_end_date) >= new Date()));

    return !isPremium;
  } catch {
    return false;
  }
}

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

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // Vercel 환경에서 넘어오는 호스트 헤더 읽기
  const hostname = request.headers.get('host') || '';

  // Vercel 환경 여부 (실제 도메인 gongsilnews.com 강제 적용 시 아래 값을 true로 변경하세요)
  // const isVercel = false; // 로컬 호스트(.localhost:3000) 테스트용
  const isVercel = true;  // 실제 주소(.gongsilnews.com) 적용 중
  // const isVercel = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';

  // 허용할 메인 도메인 및 로컬호스트 (테스트 환경)
  const currentHost = isVercel
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

    // 이미 /m 경로이거나 관리자 페이지, 독립 상세 페이지 등은 제외하고 Rewrite
    if (
      isMobile &&
      !viewDesktop &&
      !url.pathname.startsWith('/m') &&
      !url.pathname.startsWith('/auth') &&
      !url.pathname.startsWith('/admin') &&
      !url.pathname.startsWith('/realty_admin') &&
      !url.pathname.startsWith('/user_admin') &&
      !url.pathname.startsWith('/com') &&
      !url.pathname.startsWith('/flyer') &&
      !url.pathname.startsWith('/gongsil/detail')
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
  
  // 현재 요금제 만료 로직은 개발 예정이므로, 일단 접속된 모든 서브도메인을 `/sites/` 라우트로 포워딩합니다.
  // 사람이 페이지를 여는 요청에서만 열림 여부를 확인한다. 이미지·데이터 요청까지
  // 매번 조회하면 한 번 들어올 때마다 쓸데없이 여러 번 물어보게 된다.
  const wantsHtml = (request.headers.get('accept') || '').includes('text/html');
  if (wantsHtml && (await isSitePaused(currentHost))) {
    return pausedResponse();
  }

  url.pathname = `/sites/${currentHost}${url.pathname}`;
  
  return NextResponse.rewrite(url);
}
