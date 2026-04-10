import { NextResponse } from 'next/server'
// Supabase SSR 서버 클라이언트 (나중을 위해 일단 기본 형태로 둡니다)
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
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
      // 성공하면 홈페이지로 리다이렉트 (로그인 성공 모달 등을 띄우려면 query param을 추가할 수도 있음)
      return NextResponse.redirect(`${origin}/?signup=success`)
    }
  }

  // 에러 발생시
  return NextResponse.redirect(`${origin}/?error=auth`)
}
