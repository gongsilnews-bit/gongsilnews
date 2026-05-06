import { NextResponse } from 'next/server';
import { reviewArticleByAI, isAgentAutoMode } from '@/app/actions/agentChat';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function POST(req: Request) {
  try {
    const { articleIds } = await req.json();
    if (!articleIds || articleIds.length === 0) return NextResponse.json({ success: true });
    
    const isAuto = await isAgentAutoMode('articleReview');
    if (!isAuto) return NextResponse.json({ success: true, skipped: true });
    
    const supabase = getAdminClient();
    
    for (const aId of articleIds) {
      const { data: art } = await supabase.from('articles').select('title, subtitle, content, section1, section2, author_name').eq('id', aId).single();
      if (art) {
        const reviewResult = await reviewArticleByAI({
          articleId: aId,
          title: art.title || '',
          subtitle: art.subtitle || '',
          content: art.content || '',
          section1: art.section1 || '',
          section2: art.section2 || '',
          authorName: art.author_name || '알수없음'
        });
        
        if (reviewResult.status === 'APPROVED') {
          await supabase.from('articles').update({
            status: 'APPROVED',
            reject_reason: `[AI 승인 - ${reviewResult.score}점] ${reviewResult.reason}`,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', aId);
        } else if (reviewResult.status === 'REJECTED') {
          await supabase.from('articles').update({
            status: 'REJECTED',
            reject_reason: `[AI 반려 - ${reviewResult.score}점] ${reviewResult.reason}`,
            updated_at: new Date().toISOString()
          }).eq('id', aId);
        } else {
          await supabase.from('articles').update({
            reject_reason: `[AI 수정요청 - ${reviewResult.score}점] ${reviewResult.reason}`
          }).eq('id', aId);
        }
      }
    }
    
    // AI 심사 결과가 DB에 반영되었으므로, Next.js 전체 기사 캐시를 무효화하여 최고관리자 화면 등에 즉각 반영되도록 합니다.
    const { revalidateTag, revalidatePath } = require('next/cache');
    revalidateTag('articles');
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('AI API Route Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
