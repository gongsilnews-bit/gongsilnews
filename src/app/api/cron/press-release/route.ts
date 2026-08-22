import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { PressReleaseAgent } from '@/lib/agents/PressReleaseAgent';
import { resolveArticleMedia } from '@/lib/agents/mediaHelper';
import { createClient } from '@supabase/supabase-js';

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
    section1: "부동산·경제",
    section2: "부동산정책/정치",
  },
  {
    name: "한국은행 보도자료",
    url: "https://www.bok.or.kr/portal/rss/bbs/P0000559.xml",
    section1: "부동산·경제",
    section2: "경제/재테크/주식",
  }
];

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualRun = req.url.includes('manual=true');
  
  if (!isVercelCron && process.env.CRON_SECRET && !isManualRun) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const results = [];

  const { data: admin } = await supabase
    .from('members')
    .select('id, name, email')
    .eq('email', 'gongsilnews@gmail.com')
    .single();

  // ── 최근 14일간 이미 작성된 기사 목록 가져오기 (중복 방지 14일 전면 확대) ──
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentArticles } = await supabase
    .from('articles')
    .select('title, created_at')
    .gte('created_at', fourteenDaysAgo)
    .order('created_at', { ascending: false });
  
  const existingTitles = (recentArticles || []).map(a => a.title).filter(Boolean);

  const isDuplicateTopic = (candidateTitle: string, titlesPool: string[]): boolean => {
    if (!candidateTitle || titlesPool.length === 0) return false;

    const clean = (t: string) =>
      t
        .replace(/\[.*?\]|\(.*?\)|<.*?>/g, ' ')
        .replace(/[^\w\s가-힣]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const cClean = clean(candidateTitle);
    if (!cClean) return false;

    const getKeywords = (t: string) => {
      const stopWords = new Set(['대한', '통해', '위해', '관련', '지난', '올해', '내년', '이번', '오늘', '결과', '발표', '전망', '분석', '기록', '돌파', '속보', '단독', '종합']);
      return new Set(
        clean(t)
          .split(' ')
          .map(w => w.trim())
          .filter(w => w.length >= 2 && !stopWords.has(w))
      );
    };

    const cKeywords = getKeywords(cClean);
    if (cKeywords.size === 0) return false;

    for (const existing of titlesPool) {
      const eClean = clean(existing);
      if (!eClean) continue;

      if (cClean === eClean || cClean.includes(eClean) || eClean.includes(cClean)) {
        return true;
      }

      const eKeywords = getKeywords(eClean);
      if (eKeywords.size === 0) continue;

      let matchCount = 0;
      for (const kw of cKeywords) {
        if (eKeywords.has(kw)) matchCount++;
      }

      const unionSize = new Set([...cKeywords, ...eKeywords]).size;
      const similarity = unionSize > 0 ? matchCount / unionSize : 0;

      if (matchCount >= 3 || similarity >= 0.4 || (matchCount >= 2 && Math.min(cKeywords.size, eKeywords.size) <= 3)) {
        return true;
      }
    }

    return false;
  };

  for (const feedInfo of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedInfo.url);
      
      if (!feed.items || feed.items.length === 0) continue;

      const latestItem = feed.items[0];
      const sourceUrl = latestItem.link || feedInfo.url;

      // 14일 이내 유사/동일 보도자료 중복 생성 방지
      if (isDuplicateTopic(latestItem.title || '', existingTitles)) {
        results.push({ name: feedInfo.name, status: 'skipped (already exists in recent 14 days)' });
        continue;
      }

      // 기사 생성
      const rawText = `[${feedInfo.name}]\n제목: ${latestItem.title}\n내용: ${latestItem.contentSnippet || latestItem.content || latestItem.description || '(내용 없음)'}\n발행일: ${latestItem.pubDate}`;

      const aiResult = await PressReleaseAgent.writeArticle({
        pressReleaseText: rawText,
        sourceUrl: sourceUrl,
      });

      if (isDuplicateTopic(aiResult.title, existingTitles)) {
        results.push({ name: feedInfo.name, status: 'skipped (generated title was duplicate with recent articles)' });
        continue;
      }

      // 미디어 자동 매칭 (1단계: 보도자료 배포 사진, 2단계: 고화질 스톡 이미지)
      const media = await resolveArticleMedia({
        category: feedInfo.section2,
        sourceUrl: sourceUrl,
        articleTitle: aiResult.title,
      });

      const nowISO = new Date().toISOString();

      // DB 저장 (자동 승인/발행)
      const { data: article, error } = await supabase
        .from('articles')
        .insert({
          title: aiResult.title,
          subtitle: aiResult.subtitle,
          content: aiResult.content,
          section1: feedInfo.section1,
          section2: feedInfo.section2,
          status: 'APPROVED',
          published_at: nowISO,
          thumbnail_url: media.thumbnailUrl || null,
          author_id: admin?.id || null,
          author_name: admin?.name || '공실뉴스 AI 비서',
          author_email: admin?.email || 'gongsilnews@gmail.com',
        })
        .select('id')
        .single();

      if (error) throw error;

      results.push({ 
        name: feedInfo.name, 
        status: 'success', 
        articleId: article?.id,
        title: aiResult.title,
        thumbnailUrl: media.thumbnailUrl
      });

    } catch (err: any) {
      console.error(`[Cron - ${feedInfo.name}] Error:`, err);
      results.push({ name: feedInfo.name, status: 'error', message: err.message });
    }
  }

  const { revalidateTag } = require('next/cache');
  revalidateTag('articles');

  return NextResponse.json({ success: true, results });
}
