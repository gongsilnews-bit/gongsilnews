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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // from=mobile이면 모바일 페이지로, 아니면 PC 페이지로 리다이렉트
      // 단, returnTo가 있으면 해당 주소로 이동
      const returnTo = searchParams.get('returnTo');
      const defaultMobilePath = '/m?login=success';
      const defaultPcPath = '/?signup=success';
      const baseRedirectPath = from === 'mobile' ? defaultMobilePath : defaultPcPath;
      const redirectPath = returnTo ? returnTo : baseRedirectPath;
      
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // 에러 발생시
  const errorPath = from === 'mobile' ? '/m?error=auth' : '/?error=auth'
  return NextResponse.redirect(`${origin}${errorPath}`)
}

