import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { NewsArticleAgent } from '@/lib/agents/NewsArticleAgent';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 120; // Vercel 최대 실행 시간 2분

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  }
});

const FULL_CATEGORY_MAP = [
  { category: "부동산·주식·재테크", keyword: "부동산 OR 주식 OR 재테크" },
  { category: "정치·경제·사회", keyword: "정치 OR 경제 OR 사회" },
  { category: "세무·법률", keyword: "세금 OR 세무 OR 법률 OR 판례" },
  { category: "여행·건강·생활", keyword: "여행 OR 건강 OR 생활가이드" },
  { category: "IT·가전·가구", keyword: "IT신제품 OR 가전제품 OR 인테리어가구" },
  { category: "스포츠·연예·CAR", keyword: "스포츠 OR 연예 OR 신차출시" },
  { category: "인물·미션·기타", keyword: "인물인터뷰 OR 트렌드 OR 휴먼스토리" }
];

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const urlObj = new URL(req.url);
  const isManualRun = urlObj.searchParams.get('manual') === 'true';
  const manualCategory = urlObj.searchParams.get('category');
  
  if (!isVercelCron && process.env.CRON_SECRET && !isManualRun) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const results = [];

  // DB에서 스케줄러 설정값 가져오기
  const { data: configData } = await supabase.from('agent_settings').select('settings').eq('id', 'article_cron').single();
  
  // 설정값이 없으면 기본값 적용
  const config = configData?.settings || {
    isActive: true,
    hours: [8, 14, 23],
    categories: FULL_CATEGORY_MAP.map(c => c.category)
  };

  // 수동 실행이 아닌 경우(Cron 자동 실행인 경우) 시간과 활성화 여부 체크
  if (!isManualRun) {
    if (!config.isActive) {
      return NextResponse.json({ success: true, message: 'Scheduler is disabled in settings.' });
    }
    
    // 현재 한국 시간 기준 '시(Hour)' 구하기
    const kstDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const currentHour = kstDate.getHours();
    
    // 설정된 시간에 포함되지 않으면 스킵
    if (!config.hours.includes(currentHour)) {
      return NextResponse.json({ success: true, message: `Current hour (${currentHour}) is not in scheduled hours.`, config });
    }
  }

  // 관리자 계정 가져오기
  const { data: admin } = await supabase.from('members').select('id, name, email').eq('email', 'gongsilnews@gmail.com').single();

  // 설정된 카테고리만 필터링해서 수집
  let activeCategories = FULL_CATEGORY_MAP.filter(c => config.categories.includes(c.category));

  if (isManualRun && manualCategory) {
    activeCategories = FULL_CATEGORY_MAP.filter(c => c.category === manualCategory);
  }

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const item of activeCategories) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(item.keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
      const feed = await parser.parseURL(rssUrl);
      
      if (!feed.items || feed.items.length === 0) {
        results.push({ category: item.category, status: 'skipped (no news)' });
        continue;
      }

      // 상위 10개의 최신 뉴스 긁어오기 (AI에게 선택권 부여)
      const candidateNews = feed.items.slice(0, 10).map((news, index) => {
        return `[후보 ${index + 1}]\n제목: ${news.title}\n요약: ${news.contentSnippet || news.content || ''}\nURL: ${news.link || ''}\n`;
      }).join('\n');

      // 에이전트(편집국장)에게 10개 던져주고 1개 골라서 쓰라고 요청
      const aiResult = await NewsArticleAgent.writeArticle({
        sourceText: candidateNews,
        category: item.category
      });

      // AI가 선택한 뉴스의 원문 출처(URL) 추가
      let finalContent = aiResult.content;
      if (aiResult.sourceUrl && aiResult.sourceUrl.startsWith('http')) {
        finalContent += `\n<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">📎 원문 참고: <a href="${aiResult.sourceUrl}" target="_blank" rel="noopener noreferrer">${aiResult.sourceUrl}</a></p>`;
      }

      const { data: article, error } = await supabase
        .from('articles')
        .insert({
          title: aiResult.title,
          subtitle: aiResult.subtitle,
          content: finalContent,
          section1: item.category,
          section2: "일반",
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

      if (article?.id && aiResult.keywords) {
        const keywordList = aiResult.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
        if (keywordList.length > 0) {
          const keywordRows = keywordList.map((kw: string) => ({
            article_id: article.id,
            keyword: kw,
          }));
          await supabase.from("article_keywords").insert(keywordRows);
        }
      }

      results.push({ category: item.category, status: 'success', articleId: article?.id, title: aiResult.title });

    } catch (err: any) {
      console.error(`[Cron News - ${item.category}] Error:`, err);
      results.push({ category: item.category, status: 'error', message: err.message });
    }
    
    // 구글 Gemini AI의 무료 티어 제한(1분당 15회) 방지를 위해 카테고리당 4초씩 대기
    await delay(4500);
  }

  const { revalidateTag } = require('next/cache');
  revalidateTag('articles');

  return NextResponse.json({ success: true, results });
}
