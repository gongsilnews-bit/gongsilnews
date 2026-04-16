import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return local[0] + '***@' + domain;
  return local.slice(0, 3) + '***@' + domain;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const phone = searchParams.get('phone');

  if (!name || !phone) {
    return NextResponse.json({ found: false, message: '이름과 연락처를 입력해주세요.' });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://stub.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub'
    );

    // members 테이블에서 이름으로 먼저 조회
    const { data, error } = await supabaseAdmin
      .from('members')
      .select('email, login_provider, phone')
      .eq('name', name.trim());

    if (error || !data || data.length === 0) {
      return NextResponse.json({ found: false });
    }

    // 전화번호 형식 무시하고 비교 (- 제거 후 비교)
    const normalizedInputPhone = phone.replace(/[^0-9]/g, '');
    let matchedUser = data.find(user => (user.phone || '').replace(/[^0-9]/g, '') === normalizedInputPhone);

    if (!matchedUser) {
      return NextResponse.json({ found: false });
    }

    // 만약 동일 번호 중 구글이나 카카오 등 소셜 연동 계정이 있다면 우선 반환
    const socialUser = data.find(user => (user.phone || '').replace(/[^0-9]/g, '') === normalizedInputPhone && user.login_provider !== 'email');
    if (socialUser) matchedUser = socialUser;

    return NextResponse.json({
      found: true,
      email: maskEmail(matchedUser.email || ''),
      provider: matchedUser.login_provider || 'google',
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}
