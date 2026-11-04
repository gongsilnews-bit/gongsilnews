import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import { NewsArticleAgent } from '../src/lib/agents/NewsArticleAgent';
import { PhotoCurationAgent } from '../src/lib/agents/PhotoCurationAgent';
import { NaverNewsScraper } from '../src/lib/agents/NaverNewsScraper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_ID = "e1dcc122-f243-46cd-b5c4-e06db99f4b5f";
const ADMIN_NAME = "공실뉴스";
const ADMIN_EMAIL = "gongsilnews@gmail.com";

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  }
});

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const TARGET_TOPICS = [
  // 1. 공실뉴스 - 아파트/오피스텔
  {
    section1: "공실뉴스",
    section2: "아파트/오피스텔",
    keyword: "강남 서초 아파트 월세 비중 최고가 전세 월세 전환",
    promptSeed: "강남 3구와 주요 도심 고가 아파트를 중심으로 전세의 월세 전환이 가속화되며 월세 거래 비중이 60%를 넘어선 현상과 임대차 시장 재편",
    isHeadline: true,
    isImportant: true,
  },
  // 2. 공실뉴스 - 빌라/주택/다가구/다세대
  {
    section1: "공실뉴스",
    section2: "빌라/주택/다가구/다세대",
    keyword: "모아타운 신속통합기획 지분쪼개기 노후 빌라 정비사업",
    promptSeed: "서울시 모아타운 및 신통기획 추진 지역 내 지분쪼개기 단속 강화와 현금청산 리스크 속 노후 빌라·다가구 매수 전략",
    isHeadline: false,
    isImportant: false,
  },
  // 3. 공실뉴스 - 원룸/투룸(풀옵션)
  {
    section1: "공실뉴스",
    section2: "원룸/투룸(풀옵션)",
    keyword: "판교 여의도 오피스텔 역세권 원룸 투룸 분리형 임대",
    promptSeed: "여의도 금융가 및 판교 IT 밸리 직주근접 배후 주거지의 1.5룸·분리형 투룸 풀옵션 수요 폭증과 임대료 상승 추이",
    isHeadline: false,
    isImportant: false,
  },
  // 4. 공실뉴스 - 상가/사무실/빌딩/공장/토지
  {
    section1: "공실뉴스",
    section2: "상가/사무실/빌딩/공장/토지",
    keyword: "강남 테헤란로 프라임 오피스 빌딩 사옥 매각 매입",
    promptSeed: "강남 테헤란로 중심가 프라임급 대형 오피스 빌딩의 자연공실률 유지와 국내외 대기업 사옥 확보 경쟁 및 매매가 신고가 경신",
    isHeadline: false,
    isImportant: true,
  },
  // 5. 공실뉴스 - 신축/분양/경매
  {
    section1: "공실뉴스",
    section2: "신축/분양/경매",
    keyword: "토지거래허가구역 아파트 법원 경매 낙찰가율 청약",
    promptSeed: "토지거래허가구역 규제를 받지 않는 법원 경매 시장으로의 매수세 쏠림과 주요 학군지 아파트 경매 낙찰가율 급등 분석",
    isHeadline: false,
    isImportant: false,
  },
  // 6. 부동산·경제 - 부동산정책/정치
  {
    section1: "부동산·경제",
    section2: "부동산정책/정치",
    keyword: "디딤돌 대출 한도 축소 규제 보완책 수도권 아파트",
    promptSeed: "정부의 정책대출(디딤돌·버팀목) 한도 조임 완화 및 수도권 실수요자 대상 유예 조치 발표에 따른 중저가 아파트 매매 시장 반응",
    isHeadline: true,
    isImportant: true,
  },
  // 7. 부동산·경제 - 경제/재테크/주식
  {
    section1: "부동산·경제",
    section2: "경제/재테크/주식",
    keyword: "고환율 외국인 투자 서울 물류센터 데이터센터 부동산 펀드",
    promptSeed: "원·달러 고환율 기조 속 글로벌 기관투자자들의 수도권 핵심 입지 데이터센터 및 스마트 물류센터 부동산 매입 펀드 결성 급증",
    isHeadline: false,
    isImportant: true,
  },
  // 8. 부동산·경제 - 세무/법률/기타
  {
    section1: "부동산·경제",
    section2: "세무/법률/기타",
    keyword: "1주택 비과세 상속세 양도소득세 절세 부동산 세무",
    promptSeed: "1가구 1주택 비과세 거주기간 요건 판단과 상속주택 보유 시 양도소득세 중과 배제 및 절세 전략 핵심 가이드",
    isHeadline: false,
    isImportant: false,
  },
  // 9. AI마케팅 - AI/NEWS
  {
    section1: "AI마케팅",
    section2: "AI/NEWS",
    keyword: "AI 에이전트 부동산 상가 권리금 임대료 산정 프롭테크",
    promptSeed: "빅데이터와 생성형 AI가 결합하여 주변 매출과 유동인구를 실시간 역산해 상가 적정 권리금과 임대료를 도출하는 프롭테크 솔루션",
    isHeadline: false,
    isImportant: true,
  },
  // 10. AI마케팅 - 부동산유튜브/블로그
  {
    section1: "AI마케팅",
    section2: "부동산유튜브/블로그",
    keyword: "AI 가상인간 나레이션 공인중개사 부동산 영상 유튜브",
    promptSeed: "생성형 AI 가상 아나운서와 자동 영상 편집 툴을 활용해 5분 만에 고품질 매물 유튜브 쇼츠를 제작하는 공인중개사 마케팅 실무",
    isHeadline: false,
    isImportant: false,
  },
  // 11. AI마케팅 - 공실/임대관리
  {
    section1: "AI마케팅",
    section2: "공실/임대관리",
    keyword: "스마트 임대관리 건물관리 월세 수납 앱 프롭테크",
    promptSeed: "스마트폰 하나로 임대차 계약서 작성부터 전자서명, 월세 자동수납, 하자보수 접수까지 원스톱으로 관리하는 스마트 건물관리 앱의 진화",
    isHeadline: false,
    isImportant: false,
  },
  // 12. 라이프·오피니언 - 인물/인터뷰
  {
    section1: "라이프·오피니언",
    section2: "인물/인터뷰",
    keyword: "부동산 전문가 인터뷰 서울 아파트 공급 절벽 입주 물량",
    promptSeed: "[긴급진단] '2026~2027 서울 신규 입주 가뭄 본격화'… 부동산 석학이 제안하는 무주택자 청약 및 매수 로드맵",
    isHeadline: false,
    isImportant: false,
  },
  // 13. 라이프·오피니언 - 중개실무/인테리어Tip
  {
    section1: "라이프·오피니언",
    section2: "중개실무/인테리어Tip",
    keyword: "원룸 오피스텔 인테리어 조명 홈스타일링 가구 배치",
    promptSeed: "소형 평수 원룸과 오피스텔 공간을 2배 넓어 보이게 만드는 미니멀 빌트인 수납 가구 배치와 3색 조명 홈스타일링 팁",
    isHeadline: false,
    isImportant: false,
  },
  // 14. 라이프·오피니언 - 맛집/여행/건강
  {
    section1: "라이프·오피니언",
    section2: "맛집/여행/건강",
    keyword: "경의선 숲길 연남동 공덕 상권 로컬 식음료 카페거리",
    promptSeed: "폐철길 녹지 축을 따라 형성된 연남·공덕 경의선 숲길 상권의 세대교체와 로컬 F&B 브랜딩 성공 전략",
    isHeadline: false,
    isImportant: false,
  },
  // 15. 라이프·오피니언 - 스포츠/연예/기타
  {
    section1: "라이프·오피니언",
    section2: "스포츠/연예/기타",
    keyword: "북촌 서촌 한옥 스테이 외국인 관광 상권 공간 대여",
    promptSeed: "K-컬처와 전통 한옥의 만남… 북촌·서촌 일대 노후 한옥을 프리미엄 스테이로 변신시켜 고수익을 올리는 공간 기획 비즈니스",
    isHeadline: false,
    isImportant: false,
  },
  // 16. 공실뉴스 - 아파트/오피스텔
  {
    section1: "공실뉴스",
    section2: "아파트/오피스텔",
    keyword: "3기 신도시 본청약 사전청약 분양가 공급 일정",
    promptSeed: "3기 신도시 인천계양·고양창릉 등의 본청약 확정 분양가와 공사비 인상분 반영 현황, 무주택 실수요자 당첨 전략 분석",
    isHeadline: false,
    isImportant: true,
  },
  // 17. 공실뉴스 - 상가/사무실/빌딩/공장/토지
  {
    section1: "공실뉴스",
    section2: "상가/사무실/빌딩/공장/토지",
    keyword: "판교 테크노밸리 지식산업센터 벤처 스타트업 임대 지원",
    promptSeed: "경기 판교 제2·제3 테크노밸리 내 공공·민간 지식산업센터의 IT 스타트업 유치를 위한 임대료 감면 혜택과 공실률 추이",
    isHeadline: false,
    isImportant: false,
  },
  // 18. 부동산·경제 - 부동산정책/정치
  {
    section1: "부동산·경제",
    section2: "부동산정책/정치",
    keyword: "그린벨트 해제 개발제한구역 신규 택지 후보지 토지 보상",
    promptSeed: "정부의 서울 및 수도권 개발제한구역(그린벨트) 해제를 통한 5만 가구 신규 택지 후보지 발표와 토지 보상금 유입 효과",
    isHeadline: false,
    isImportant: false,
  },
  // 19. 부동산·경제 - 경제/재테크/주식
  {
    section1: "부동산·경제",
    section2: "경제/재테크/주식",
    keyword: "인프라 펀드 상장 리츠 배당수익률 맥쿼리인프라 부동산 투자",
    promptSeed: "금리 인하기 안정적인 현금 흐름을 창출하는 상장 인프라 펀드 및 우량 상업용 리츠의 연 6~8% 배당 수익률 매력 분석",
    isHeadline: false,
    isImportant: false,
  },
  // 20. AI마케팅 - AI/NEWS
  {
    section1: "AI마케팅",
    section2: "AI/NEWS",
    keyword: "드론 항공촬영 위성 AI 토지 입지 분석 국토정보",
    promptSeed: "고해상도 드론 항공촬영 영상과 AI 공간 분석을 결합해 토지 경사도, 일조권, 인근 인프라를 1분 만에 시각화하는 스마트 임장 기술",
    isHeadline: false,
    isImportant: false,
  },
];

async function main() {
  console.log("🚀 [공실뉴스] AI 기사 20개 일괄 자동 발행 파이프라인 시작 (2026-11-03 신규 기획)...");
  console.log(`- 관리자 계정: ${ADMIN_NAME} (${ADMIN_EMAIL})`);
  console.log(`- 상태 원칙: 즉시 승인 및 자동 발행 (status: APPROVED)`);

  // 최근 기사 가져와서 중복 방지 풀 구축
  const { data: recentArticles } = await supabase
    .from('articles')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(100);

  const existingTitles = (recentArticles || []).map((a) => a.title).filter(Boolean);
  const results = [];

  for (let i = 0; i < TARGET_TOPICS.length; i++) {
    const item = TARGET_TOPICS[i];
    const indexStr = `[${i + 1}/${TARGET_TOPICS.length}]`;
    console.log(`\n============================================================`);
    console.log(`${indexStr} 진행 중: [${item.section1} > ${item.section2}] 키워드: "${item.keyword}"`);

    try {
      // 1. 실시간 뉴스 수집 (네이버 + 구글 RSS)
      const naverNewsPromise = NaverNewsScraper.getTopNewsForCategory(item.keyword, item.section2).catch(() => []);
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(item.keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
      const googleFeedPromise = parser.parseURL(rssUrl).catch(() => ({ items: [] }));

      const [naverItems, googleFeed] = await Promise.all([naverNewsPromise, googleFeedPromise]);

      const candidates: Array<{ title: string; snippet: string; link: string; source: string }> = [];
      for (const n of naverItems) {
        candidates.push({
          title: n.title,
          snippet: n.snippet,
          link: n.link,
          source: n.source === 'naver_ranking' ? '네이버 실시간 랭킹' : '네이버 부동산/뉴스'
        });
      }
      for (const g of (googleFeed.items || [])) {
        if (!candidates.some(c => c.title === g.title)) {
          candidates.push({
            title: g.title || '',
            snippet: g.contentSnippet || g.content || '',
            link: g.link || '',
            source: '구글 실시간 뉴스'
          });
        }
      }

      // 후보 뉴스 텍스트 구성
      let candidateNewsText = "";
      let topSourceUrl: string | undefined = undefined;

      if (candidates.length > 0) {
        topSourceUrl = candidates[0].link;
        candidateNewsText = candidates.slice(0, 5).map((news, idx) => {
          return `[후보 ${idx + 1}]\nID: CANDIDATE_${idx + 1}\n출처: ${news.source}\n제목: ${news.title}\n요약: ${news.snippet || ''}\nURL: ${news.link || ''}\n`;
        }).join('\n');
      }

      const fullSourceText = `[핵심 기획 주제 및 팩트 요약]\n${item.promptSeed}\n\n[실시간 참고 뉴스 데이터]\n${candidateNewsText || '실시간 기사 없음 - 주제 핵심 팩트를 기반으로 정통 분석 기사로 작성할 것'}`;

      // 2. 기사작성 에이전트 가동
      console.log(`  ✍️ NewsArticleAgent 기사 작성 중...`);
      const aiResult = await NewsArticleAgent.writeArticle({
        sourceText: fullSourceText,
        category: item.section2,
        userEmail: ADMIN_EMAIL,
      });

      console.log(`  📄 생성된 제목: "${aiResult.title}"`);

      // 3. 사진/미디어 큐레이션 에이전트 가동 (4단계 우선순위)
      console.log(`  📸 PhotoCurationAgent 미디어 매칭 중...`);
      const resolvedSourceUrl = topSourceUrl || aiResult.sourceUrl;
      const media = await PhotoCurationAgent.resolvePhoto({
        category: item.section2,
        articleTitle: aiResult.title,
        articleSubtitle: aiResult.subtitle,
        articleContent: aiResult.content,
        sourceUrl: resolvedSourceUrl,
        mediaType: aiResult.mediaType,
        youtubeSearchQuery: aiResult.youtubeSearchQuery,
        userEmail: ADMIN_EMAIL,
      });

      console.log(`  🖼️ 미디어 채택: [${media.sourceType}] ${media.thumbnailUrl ? media.thumbnailUrl.slice(0, 60) + '...' : '없음'}`);

      // 4. 본문 맨 앞 썸네일 삽입 포맷팅
      let finalContent = aiResult.content;
      if (media.thumbnailUrl && !media.youtubeUrl) {
        finalContent = `<div style="text-align: center;"><img src="${media.thumbnailUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" /></div><br/>${finalContent}`;
      }

      // 발행 시각: 현재 시각 기준 순차적 시간 배치 (최근 순 정렬)
      const offsetSeconds = (TARGET_TOPICS.length - i) * 60; // 1분 간격 순차 정렬
      const publishedAt = new Date(Date.now() - offsetSeconds * 1000).toISOString();

      // 5. DB 저장 (즉시 승인 및 자동 발행: APPROVED)
      const { data: article, error: insertError } = await supabase
        .from('articles')
        .insert({
          title: aiResult.title,
          subtitle: aiResult.subtitle,
          content: finalContent,
          section1: item.section1,
          section2: item.section2,
          status: 'APPROVED',
          published_at: publishedAt,
          thumbnail_url: media.thumbnailUrl || null,
          youtube_url: media.youtubeUrl || null,
          is_headline: item.isHeadline || aiResult.isHeadline || false,
          is_important: item.isImportant || aiResult.isImportant || false,
          author_id: ADMIN_ID,
          author_name: ADMIN_NAME,
          author_email: ADMIN_EMAIL,
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      // 6. article_media 테이블 등록
      if (article?.id && media.thumbnailUrl && !media.youtubeUrl) {
        await supabase.from('article_media').insert({
          article_id: article.id,
          media_type: 'PHOTO',
          url: media.thumbnailUrl,
          sort_order: 0,
        });
      }

      // 7. article_keywords 테이블 등록
      if (article?.id && aiResult.keywords) {
        const keywordList = aiResult.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
        if (keywordList.length > 0) {
          const keywordRows = keywordList.map((kw: string) => ({
            article_id: article.id,
            keyword: kw,
          }));
          await supabase.from('article_keywords').insert(keywordRows);
        }
      }

      existingTitles.unshift(aiResult.title);

      results.push({
        index: i + 1,
        id: article.id,
        category: `${item.section1} > ${item.section2}`,
        title: aiResult.title,
        status: 'SUCCESS',
        mediaSource: media.sourceType,
      });

      console.log(`  ✅ ${indexStr} 성공! Article ID: ${article.id}`);

    } catch (err: any) {
      console.error(`  ❌ ${indexStr} 오류 발생:`, err.message);
      results.push({
        index: i + 1,
        category: `${item.section1} > ${item.section2}`,
        status: 'ERROR',
        error: err.message,
      });
    }

    // Gemini 분당 호출 제한 방지를 위해 3.5초 대기
    if (i < TARGET_TOPICS.length - 1) {
      console.log(`  ⏳ 다음 기사 생성까지 3.5초 대기...`);
      await delay(3500);
    }
  }

  console.log(`\n============================================================`);
  console.log(`🎉 [공실뉴스] 20개 신규 기사 발행 작업 완료!`);
  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  console.log(`- 성공: ${successCount}건 / 실패: ${results.length - successCount}건`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Critical run error:", err);
  process.exit(1);
});
