import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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
    // members 테이블에서 이름 + 전화번호로 조회
    const { data, error } = await supabaseAdmin
      .from('members')
      .select('email, provider')
      .eq('name', name.trim())
      .eq('phone', phone.trim())
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      email: maskEmail(data.email || ''),
      provider: data.provider || 'google',
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}
