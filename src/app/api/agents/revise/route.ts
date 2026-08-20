import { NextResponse } from 'next/server';
import { adminReviseArticleWithFeedback } from '@/app/actions/article';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300;

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET() {
  const supabase = getAdminClient();
  const { data: rejected } = await supabase
    .from('articles')
    .select('id, article_no, title, reject_reason')
    .eq('status', 'REJECTED')
    .order('created_at', { ascending: false })
    .limit(3);

  const results = [];

  for (const a of (rejected || [])) {
    console.log(`[Revise Route] Revising Article #${a.article_no}: "${a.title}" with feedback: "${a.reject_reason}"`);
    const res = await adminReviseArticleWithFeedback(a.id, a.reject_reason || "기사 내용 및 사진 보완 요망");
    results.push({
      id: a.id,
      articleNo: a.article_no,
      title: a.title,
      res,
    });
  }

  return NextResponse.json({ success: true, count: results.length, results });
}
