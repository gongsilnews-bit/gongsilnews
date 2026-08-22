import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPermissionLevel } from '@/utils/permissionCheck'

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
    
    try {
      // 코드를 통해 세션을 교환
      const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && sessionData.user) {
        const returnTo = searchParams.get('returnTo');
        const defaultMobilePath = '/m?login=success';
        const defaultPcPath = '/?signup=success';
        const baseRedirectPath = from === 'mobile' ? defaultMobilePath : defaultPcPath;
        let redirectPath = returnTo ? returnTo : baseRedirectPath;
        
        // 모바일에서 PC용 관리자 주소가 넘어왔을 경우 모바일 관리자 주소로 자동 변환
        if (from === 'mobile' && redirectPath.startsWith('/realty_admin')) {
          redirectPath = redirectPath.replace('/realty_admin?menu=settings', '/m/admin/settings');
        }

        try {
          // 회원 정보 조회
          const { data: member } = await supabase
            .from('members')
            .select('role, plan_type, agencies(status)')
            .eq('id', sessionData.user.id)
            .maybeSingle();
          
          const level = getPermissionLevel(member);
          const isApprovedBroker = level >= 2;

          // 회원가입(/signup)을 통해 가입/로그인 한 경우 자동으로 부동산회원(REALTOR) 처리
          if (returnTo && returnTo.includes('/signup')) {
            if (member && (member.role === 'USER' || member.role === '일반회원')) {
              await supabase.from('members').update({ role: 'REALTOR' }).eq('id', sessionData.user.id);
            }
            redirectPath = from === 'mobile' ? '/m/admin/settings?tab=agency' : '/realty_admin?menu=settings&tab=agency';
          } else if (isApprovedBroker && returnTo && (returnTo.includes('/admin/settings') || returnTo.includes('/realty_admin?menu=settings'))) {
            // 이미 승인 완료된 부동산회원이 회원수정/환경설정으로 잘못 가려는 경우 메인 공실열람으로 이동
            redirectPath = from === 'mobile' ? '/m/gongsil' : '/gongsil';
          }
        } catch (dbErr) {
          console.error("Auth callback member check error:", dbErr);
        }
        
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
    } catch (authErr) {
      console.error("Auth callback exchange error:", authErr);
    }
  }

  // 에러 발생시
  const errorPath = from === 'mobile' ? '/m?error=auth' : '/?error=auth'
  return NextResponse.redirect(`${origin}${errorPath}`)
}

