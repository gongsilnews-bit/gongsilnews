import { NextResponse } from 'next/server'
// Supabase SSR 서버 클라이언트 (나중을 위해 일단 기본 형태로 둡니다)
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const from = searchParams.get('from')
  
  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // 코드를 통해 세션을 교환
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && sessionData.user) {
      // from=mobile이면 모바일 페이지로, 아니면 PC 페이지로 리다이렉트
      // 단, returnTo가 있으면 해당 주소로 이동
      const returnTo = searchParams.get('returnTo');
      const defaultMobilePath = '/m?login=success';
      const defaultPcPath = '/?signup=success';
      const baseRedirectPath = from === 'mobile' ? defaultMobilePath : defaultPcPath;
      let redirectPath = returnTo ? returnTo : baseRedirectPath;
      
      // 모바일에서 PC용 관리자 주소가 넘어왔을 경우 모바일 관리자 주소로 자동 변환
      if (from === 'mobile' && redirectPath.startsWith('/realty_admin')) {
        redirectPath = redirectPath.replace('/realty_admin?menu=settings', '/m/admin/settings');
      }

      // 회원 정보 조회
      const { data: member } = await supabase
        .from('members')
        .select('role, agencies(status)')
        .eq('id', sessionData.user.id)
        .single();
      
      const isApprovedRealtor = member && (member.role === 'REALTOR' || member.role === 'ADMIN') && member.agencies?.[0]?.status === 'APPROVED';

      // 회원가입(/signup)을 통해 가입/로그인 한 경우 자동으로 부동산회원(REALTOR) 처리
      if (returnTo && returnTo.includes('/signup')) {
        if (member && member.role === 'USER') {
          await supabase.from('members').update({ role: 'REALTOR' }).eq('id', sessionData.user.id);
        }
        // 바로 정보설정(부동산정보 입력) 페이지로 이동
        redirectPath = from === 'mobile' ? '/m/admin/settings?tab=agency' : '/realty_admin?menu=settings&tab=agency';
      } else if (isApprovedRealtor && returnTo && (returnTo.includes('/admin/settings') || returnTo.includes('/realty_admin?menu=settings'))) {
        // 이미 승인 완료된 부동산회원이 회원수정/환경설정으로 잘못 가려는 경우 메인 공실열람으로 이동
        redirectPath = from === 'mobile' ? '/m/gongsil' : '/gongsil';
      }
      
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // 에러 발생시
  const errorPath = from === 'mobile' ? '/m?error=auth' : '/?error=auth'
  return NextResponse.redirect(`${origin}${errorPath}`)
}

