import { NextResponse } from 'next/server';
import { isAgentAutoMode } from '@/app/actions/agentChat';
import { PressReleaseAgent } from '@/lib/agents/PressReleaseAgent';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 120;

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * 보도자료 기사 작성 에이전트 API
 * 
 * POST: 보도자료 텍스트를 받아 Gemini로 기사 초안을 생성하고 
 *       DB에 수정저장(DRAFT) 상태로 저장 (최고관리자 계정)
 * 
 * body: { pressReleaseText: string, sourceUrl?: string }
 */
export async function POST(req: Request) {
  try {
    const { pressReleaseText, sourceUrl } = await req.json();
    
    if (!pressReleaseText || pressReleaseText.trim().length < 50) {
      return NextResponse.json({ success: false, error: '보도자료 내용이 너무 짧습니다. (최소 50자 이상)' }, { status: 400 });
    }

    // 에이전트 자동 모드 확인
    const isAuto = await isAgentAutoMode('pressRelease');
    if (!isAuto) {
      return NextResponse.json({ success: true, skipped: true, message: '보도자료 에이전트가 수동 모드입니다.' });
    }

    // Gemini를 사용하여 보도자료 분석 및 기사 생성
    const result = await PressReleaseAgent.writeArticle({
      pressReleaseText,
      sourceUrl,
    });

    // 출처 링크를 본문 하단에 추가
    let finalContent = result.content || '';
    if (sourceUrl) {
      finalContent += `\n<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">📎 출처: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceUrl}</a></p>`;
    }

    // Supabase에 기사를 수정저장(DRAFT) 상태로 저장 (최고관리자 계정)
    const supabase = getAdminClient();
    
    // 최고관리자 계정 조회
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'superAdmin')
      .limit(1)
      .single();

    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert({
        title: result.title,
        subtitle: result.subtitle,
        content: finalContent,
        section1: result.section1,
        section2: result.section2,
        keywords: result.keywords,
        status: 'DRAFT',
        author_id: adminUser?.id || null,
        author_name: adminUser?.name || '공실뉴스',
        author_email: adminUser?.email || 'gongsilnews@gmail.com',
        source_type: 'ai_press_release',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[보도자료 에이전트] 기사 저장 실패:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    console.log(`[보도자료 에이전트] 기사 생성 완료 - ID: ${article?.id}, 토큰: ${result.usage?.totalTokens}`);

    // Next.js 캐시 무효화
    const { revalidateTag, revalidatePath } = require('next/cache');
    revalidateTag('articles');
    revalidatePath('/', 'layout');

    return NextResponse.json({
      success: true,
      articleId: article?.id,
      title: result.title,
      usage: result.usage,
    });
  } catch (err: any) {
    console.error('[보도자료 에이전트] API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
