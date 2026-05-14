import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { PressReleaseAgent } from '@/lib/agents/PressReleaseAgent';
import { createClient } from '@supabase/supabase-js';

// Vercel Cron은 최대 15초(Hobby) ~ 5분(Pro) 실행 가능합니다.
export const maxDuration = 120;

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  }
});

const RSS_FEEDS = [
  {
    name: "국토교통부 보도자료",
    url: "https://www.molit.go.kr/dev/board/board_rss.jsp?rss_id=NEWS",
  },
  {
    name: "한국은행 보도자료",
    url: "https://www.bok.or.kr/portal/rss/bbs/P0000559.xml",
  }
];

export async function GET(req: Request) {
  // 인증 체크 (Vercel Cron 또는 수동 실행 키)
  const authHeader = req.headers.get('authorization');
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualRun = req.url.includes('manual=true'); // 단순 확인용
  
  // 보안: Cron Secret이 없으면 (설정 전) 수동 실행은 허용
  if (!isVercelCron && process.env.CRON_SECRET && !isManualRun) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const results = [];

  // 멤버 테이블에서 작성자(어드민) 정보 가져오기
  const { data: admin } = await supabase
    .from('members')
    .select('id, name, email')
    .eq('email', 'gongsilnews@gmail.com')
    .single();

  for (const feedInfo of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedInfo.url);
      
      if (!feed.items || feed.items.length === 0) continue;

      // 가장 최신 글 1개만 가져옵니다 (필요시 늘릴 수 있음)
      const latestItem = feed.items[0];
      const sourceUrl = latestItem.link || feedInfo.url;

      // DB에 이미 같은 출처 URL의 기사가 있는지 확인 (중복 생성 방지)
      const { data: existingArticle } = await supabase
        .from('articles')
        .select('id')
        .like('content', `%${sourceUrl}%`)
        .limit(1);

      if (existingArticle && existingArticle.length > 0) {
        results.push({ name: feedInfo.name, status: 'skipped (already exists)' });
        continue;
      }

      // 기사 생성
      const rawText = `[${feedInfo.name}]\n제목: ${latestItem.title}\n내용: ${latestItem.contentSnippet || latestItem.content || latestItem.description || '(내용 없음)'}\n발행일: ${latestItem.pubDate}`;

      const aiResult = await PressReleaseAgent.writeArticle({
        pressReleaseText: rawText,
        sourceUrl: sourceUrl,
      });

      // 출처 링크 추가
      let finalContent = aiResult.content;
      finalContent += `\n<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">📎 출처: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceUrl}</a></p>`;

      // DB 저장
      const { data: article, error } = await supabase
        .from('articles')
        .insert({
          title: aiResult.title,
          subtitle: aiResult.subtitle,
          content: finalContent,
          section1: "부동산·주식·재테크",
          section2: aiResult.section2 || "일반",
          status: 'DRAFT',
          author_id: admin?.id || null,
          author_name: admin?.name || '공실뉴스 AI 비서',
          author_email: admin?.email || 'gongsilnews@gmail.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      results.push({ name: feedInfo.name, status: 'success', articleId: article?.id });

    } catch (err: any) {
      console.error(`[Cron - ${feedInfo.name}] Error:`, err);
      results.push({ name: feedInfo.name, status: 'error', message: err.message });
    }
  }

  // Next.js 캐시 강제 무효화
  const { revalidateTag } = require('next/cache');
  revalidateTag('articles');

  return NextResponse.json({ success: true, results });
}
