import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { NewsArticleAgent } from '@/lib/agents/NewsArticleAgent';
import { PhotoCurationAgent } from '@/lib/agents/PhotoCurationAgent';
import { createClient } from '@supabase/supabase-js';
import { kstHour, kstTodayStart } from '@/utils/kst';

export const maxDuration = 300; // Vercel 최대 실행 시간 5분 (7개 카테고리 × 8초 딜레이 대비)

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
  // 1. 공실뉴스
  { section1: "공실뉴스", section2: "아파트/오피스텔", keyword: "아파트 매매 전세 OR 오피스텔 분양 임대" },
  { section1: "공실뉴스", section2: "빌라/주택", keyword: "빌라 다세대 전세 OR 단독주택 매매" },
  { section1: "공실뉴스", section2: "원룸/투룸(풀옵션)", keyword: "원룸 투룸 월세 임대차" },
  { section1: "공실뉴스", section2: "상가/사무실/공장/토지", keyword: "지식산업센터 공실 OR 상가 매매 동향 OR 오피스 빌딩 매매 OR 토지 거래" },
  { section1: "공실뉴스", section2: "신축/분양/경매", keyword: "신축 아파트 분양 청약 OR 법원 경매 낙찰가율 OR 오피스텔 분양" },

  // 2. 부동산·경제
  { section1: "부동산·경제", section2: "부동산정책/정치", keyword: "국토교통부 부동산 정책 OR 아파트 분양가 OR 재건축 규제 OR 부동산 대출" },
  { section1: "부동산·경제", section2: "경제/재테크/주식", keyword: "기준금리 부동산 OR 주식 시장 전망 OR 부동산 펀드 리츠 OR 채권 금리" },
  { section1: "부동산·경제", section2: "세무/법률/기타", keyword: "부동산 세금 OR 부동산 판례 OR 종부세 OR 취득세 OR 상가 임대차" },
  { section1: "부동산·경제", section2: "공실/임대관리", keyword: "상가 공실률 OR 오피스 임대료 OR 꼬마빌딩 리모델링 OR 임대관리" },

  // 3. AI마케팅
  { section1: "AI마케팅", section2: "AI/NEWS", keyword: "생성형 AI 프롭테크 OR 챗GPT 인공지능 OR 부동산 AI" },
  { section1: "AI마케팅", section2: "부동산유튜브/블로그", keyword: "공인중개사 마케팅 OR 부동산 유튜브 채널 OR 매물 홍보" },
  { section1: "AI마케팅", section2: "중개실무/인테리어Tip", keyword: "상가 인테리어 OR 아파트 인테리어 OR 리모델링 OR 공인중개사" },
  { section1: "AI마케팅", section2: "인물/인터뷰", keyword: "부동산 전문가 인터뷰 OR CEO 리더십 인터뷰 OR 프롭테크 대표" },

  // 4. 라이프·오피니언
  { section1: "라이프·오피니언", section2: "맛집/여행/건강", keyword: "맛집 추천 OR 국내 여행지 OR 건강 관리" },
  { section1: "라이프·오피니언", section2: "스포츠/연예/기타", keyword: "프로야구 OR K리그 OR 연예 이슈 OR 신차 출시" },
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
    autoPublish: true, // 자동 즉시 승인/발행 기본 활성화
    hours: [8, 14, 23],
    categories: FULL_CATEGORY_MAP.map(c => c.section2)
  };

  // 수동 실행이 아닌 경우(Cron 자동 실행인 경우) 시간과 활성화 여부 체크
  if (!isManualRun) {
    if (!config.isActive) {
      return NextResponse.json({ success: true, message: 'Scheduler is disabled in settings.' });
    }
    
    // 현재 한국 시간 기준 '시(Hour)' 구하기
    const currentHour = kstHour();
    
    // 설정된 시간에 포함되지 않으면 스킵
    if (!config.hours.includes(currentHour)) {
      return NextResponse.json({ success: true, message: `Current hour (${currentHour}) is not in scheduled hours.`, config });
    }
  }

  // 관리자 계정 가져오기
  const { data: admin } = await supabase.from('members').select('id, name, email').eq('email', 'gongsilnews@gmail.com').single();

  // 설정된 카테고리만 필터링해서 수집
  let activeCategories = FULL_CATEGORY_MAP.filter(c => config.categories.includes(c.section2));

  if (isManualRun && manualCategory) {
    activeCategories = FULL_CATEGORY_MAP.filter(c => c.section2 === manualCategory);
  }

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // ── 오늘 이미 작성된 기사 제목 목록 가져오기 (중복 방지) ──
  const todayStartISO = kstTodayStart();
  const { data: todayArticles } = await supabase
    .from('articles')
    .select('title, content')
    .gte('created_at', todayStartISO)
    .order('created_at', { ascending: false });
  
  const todayTitles = (todayArticles || []).map(a => a.title).filter(Boolean);
  const todayContents = (todayArticles || []).map(a => a.content || '').join(' ');

  for (const item of activeCategories) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(item.keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
      const feed = await parser.parseURL(rssUrl);
      
      if (!feed.items || feed.items.length === 0) {
        results.push({ category: item.section2, status: 'skipped (no news)' });
        continue;
      }

      // 상위 10개의 최신 뉴스 긁어오기 (AI에게 선택권 부여)
      const candidateNews = feed.items.slice(0, 10).map((news, index) => {
        return `[후보 ${index + 1}]\n제목: ${news.title}\n요약: ${news.contentSnippet || news.content || ''}\nURL: ${news.link || ''}\n`;
      }).join('\n');

      // ── 원문 URL 기반 중복 체크 (이미 동일 출처로 작성한 기사가 있으면 스킵) ──
      const candidateUrls = feed.items.slice(0, 10).map(n => n.link).filter(Boolean);
      const allDuplicate = candidateUrls.every(url => todayContents.includes(url!));
      if (allDuplicate && candidateUrls.length > 0) {
        results.push({ category: item.section2, status: 'skipped (all URLs already used today)' });
        continue;
      }

      // ── 오늘 작성된 기사 제목을 AI에게 전달하여 중복 주제 회피 ──
      const existingTitlesContext = todayTitles.length > 0
        ? `\n\n[⚠️ 오늘 이미 작성된 기사 제목 목록 - 아래 주제와 겹치는 뉴스는 절대 선택하지 마라]\n${todayTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
        : '';

      // 에이전트(편집국장)에게 10개 던져주고 1개 골라서 고품격 전문 기사로 작성하도록 요청
      const aiResult = await NewsArticleAgent.writeArticle({
        sourceText: candidateNews + existingTitlesContext,
        category: item.section2
      });

      // ── 사진 전문 에이전트(PhotoCurationAgent) 가동: 맥락 분석 + 실물 보도사진 + 중복 방지 ──
      const media = await PhotoCurationAgent.resolvePhoto({
        category: item.section2,
        articleTitle: aiResult.title,
        articleSubtitle: aiResult.subtitle,
        articleContent: aiResult.content,
        sourceUrl: aiResult.sourceUrl,
        mediaType: aiResult.mediaType,
        youtubeSearchQuery: aiResult.youtubeSearchQuery,
      });

      // 하단 원문 참고 링크는 완전히 제거하고 순수 독창적 기사 본문만 저장
      const finalContent = aiResult.content;
      const isAutoPublish = config.autoPublish !== false; // 기본값: 즉시 승인 및 자동 발행(APPROVED)
      const nowISO = new Date().toISOString();

      const { data: article, error } = await supabase
        .from('articles')
        .insert({
          title: aiResult.title,
          subtitle: aiResult.subtitle,
          content: finalContent,
          section1: item.section1,
          section2: item.section2,
          status: isAutoPublish ? 'APPROVED' : 'PENDING',
          published_at: isAutoPublish ? nowISO : null,
          thumbnail_url: media.thumbnailUrl || null,
          youtube_url: media.youtubeUrl || null,
          is_headline: aiResult.isHeadline || false,
          is_important: aiResult.isImportant || (aiResult.isHeadline ? true : false),
          author_id: admin?.id || null,
          author_name: admin?.name || '공실뉴스 AI 비서',
          author_email: admin?.email || 'gongsilnews@gmail.com',
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

      results.push({ 
        category: item.section2, 
        status: 'success', 
        articleId: article?.id, 
        title: aiResult.title,
        published: isAutoPublish,
        mediaType: media.youtubeUrl ? 'youtube' : 'stock_image',
        thumbnailUrl: media.thumbnailUrl
      });

    } catch (err: any) {
      console.error(`[Cron News - ${item.section2}] Error:`, err);
      results.push({ category: item.section2, status: 'error', message: err.message });
    }
    
    // 구글 Gemini AI의 분당 요청 제한 방지를 위해 카테고리당 8초씩 대기
    await delay(8000);
  }

  const { revalidateTag } = require('next/cache');
  revalidateTag('articles');

  return NextResponse.json({ success: true, results });
}
