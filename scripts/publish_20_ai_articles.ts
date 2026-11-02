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
    keyword: "서울 아파트 매매 전세 실거래가 전세가율 상승세",
    promptSeed: "서울 및 수도권 아파트 전세가격 상승세 지속과 전세가율 상승으로 인한 갭투자 재유입 및 임대차 시장 동향",
    isHeadline: true,
    isImportant: true,
  },
  // 2. 공실뉴스 - 빌라/주택/다가구/다세대
  {
    section1: "공실뉴스",
    section2: "빌라/주택/다가구/다세대",
    keyword: "빌라 다세대 전세보증금 반환보증 HUG 비아파트",
    promptSeed: "HUG 전세보증금 반환보증 요건 개편 후 빌라·다세대 주택 시장의 월세화 가속 및 비아파트 주거 안정 대책",
    isHeadline: false,
    isImportant: false,
  },
  // 3. 공실뉴스 - 원룸/투룸(풀옵션)
  {
    section1: "공실뉴스",
    section2: "원룸/투룸(풀옵션)",
    keyword: "대학가 역세권 원룸 투룸 월세 임대차 청년 주거",
    promptSeed: "주요 대학가 및 초역세권 원룸·투룸 풀옵션 월세 부담 급증과 청년 1~2인 가구의 주거 트렌드 변화",
    isHeadline: false,
    isImportant: false,
  },
  // 4. 공실뉴스 - 상가/사무실/빌딩/공장/토지
  {
    section1: "공실뉴스",
    section2: "상가/사무실/빌딩/공장/토지",
    keyword: "지식산업센터 공실률 상가 임대료 꼬마빌딩 오피스 매매",
    promptSeed: "수도권 지식산업센터 및 주요 상권 1층 상가 공실 장기화 속 렌트프리와 단기 임대 전환 등 임대인들의 대응 전략",
    isHeadline: false,
    isImportant: true,
  },
  // 5. 공실뉴스 - 신축/분양/경매
  {
    section1: "공실뉴스",
    section2: "신축/분양/경매",
    keyword: "수도권 아파트 분양 청약 경쟁률 법원 경매 낙찰가율",
    promptSeed: "분양가 상한제 단지 청약 쏠림과 외곽 미분양 속 법원 경매 낙찰가율 회복세 및 알짜 경매 매물 투자 분석",
    isHeadline: false,
    isImportant: false,
  },
  // 6. 부동산·경제 - 부동산정책/정치
  {
    section1: "부동산·경제",
    section2: "부동산정책/정치",
    keyword: "국토교통부 1기 신도시 노후계획도시 재건축 선도지구 이주대책",
    promptSeed: "정부 1기 신도시(분당·일산·평촌·산본·중동) 선도지구 지정 및 대규모 이주 수요에 따른 수도권 전세 시장 영향과 종합 대책",
    isHeadline: true,
    isImportant: true,
  },
  // 7. 부동산·경제 - 경제/재테크/주식
  {
    section1: "부동산·경제",
    section2: "경제/재테크/주식",
    keyword: "한국은행 기준금리 인하 주택담보대출 금리 리츠 부동산 펀드",
    promptSeed: "한국은행 금리 인하 국면에서 시중은행 주택담보대출 금리 추이와 배당형 공모 리츠(REITs) 자산 포트폴리오 전략",
    isHeadline: false,
    isImportant: true,
  },
  // 8. 부동산·경제 - 세무/법률/기타
  {
    section1: "부동산·경제",
    section2: "세무/법률/기타",
    keyword: "상가건물 임대차보호법 권리금 회수 기회 제소전 화해 세무",
    promptSeed: "상가 임대차 계약 시 임차인의 권리금 회수 기회 보호 법리와 제소전 화해조서 강행규정 위반 무효 판례 분석",
    isHeadline: false,
    isImportant: false,
  },
  // 9. AI마케팅 - AI/NEWS
  {
    section1: "AI마케팅",
    section2: "AI/NEWS",
    keyword: "생성형 AI 프롭테크 3D 가상투어 시세 예측 부동산 인공지능",
    promptSeed: "생성형 AI를 결합한 스마트폰 3D 입체 매물 투어 및 반경 500m 유동인구 소비 분석 프롭테크 솔루션 상용화 급물살",
    isHeadline: false,
    isImportant: true,
  },
  // 10. AI마케팅 - 부동산유튜브/블로그
  {
    section1: "AI마케팅",
    section2: "부동산유튜브/블로그",
    keyword: "공인중개사 유튜브 쇼츠 숏폼 릴스 매물 홍보 마케팅",
    promptSeed: "AI 영상 제작 도구를 활용한 1인 공인중개사의 매물 브리핑 숏폼 영상 제작 및 SNS 채널 상위노출 마케팅 혁신",
    isHeadline: false,
    isImportant: false,
  },
  // 11. AI마케팅 - 공실/임대관리
  {
    section1: "AI마케팅",
    section2: "공실/임대관리",
    keyword: "스마트 임대관리 공실 해결 프롭테크 렌탈 솔루션 꼬마빌딩",
    promptSeed: "꼬마빌딩 및 상가 소유주를 위한 IoT·빅데이터 기반 실시간 공실 관리 및 자동 계약 갱신 스마트 솔루션 확산",
    isHeadline: false,
    isImportant: false,
  },
  // 12. 라이프·오피니언 - 인물/인터뷰
  {
    section1: "라이프·오피니언",
    section2: "인물/인터뷰",
    keyword: "프롭테크 대표 인터뷰 공실 해결 부동산 빅데이터 전문가",
    promptSeed: "[인터뷰] '상권 빅데이터로 빈 상가 100일 만에 완판'… 프롭테크 혁신 리더가 밝히는 공실 제로의 공식",
    isHeadline: false,
    isImportant: false,
  },
  // 13. 라이프·오피니언 - 중개실무/인테리어Tip
  {
    section1: "라이프·오피니언",
    section2: "중개실무/인테리어Tip",
    keyword: "상가 오피스 인테리어 리모델링 홈스테이징 공실 단축",
    promptSeed: "오래된 빈 상가와 낡은 사무실의 임대료를 30% 높이는 가성비 인테리어 감성 홈스테이징 실전 팁",
    isHeadline: false,
    isImportant: false,
  },
  // 14. 라이프·오피니언 - 맛집/여행/건강
  {
    section1: "라이프·오피니언",
    section2: "맛집/여행/건강",
    keyword: "핫플레이스 골목상권 팝업스토어 성수동 한남동 F&B 맛집",
    promptSeed: "MZ세대가 줄 서는 로컬 골목상권 성공 비결과 F&B 팝업스토어로 살아난 구도심 상권 트렌드",
    isHeadline: false,
    isImportant: false,
  },
  // 15. 라이프·오피니언 - 스포츠/연예/기타
  {
    section1: "라이프·오피니언",
    section2: "스포츠/연예/기타",
    keyword: "스타 연예인 빌딩 매입 강남 한남 꼬마빌딩 자산관리",
    promptSeed: "톱스타와 스포츠 스타들의 강남·성수 일대 꼬마빌딩 매입 트렌드와 밸류애드(Value-add) 리모델링 투자법",
    isHeadline: false,
    isImportant: false,
  },
  // 16. 공실뉴스 - 아파트/오피스텔
  {
    section1: "공실뉴스",
    section2: "아파트/오피스텔",
    keyword: "재건축 재개발 정비사업 공사비 협상 분담금 입주권",
    promptSeed: "정비사업 공사비 증액 갈등 속 조합-시공사 간 공사비 검증 협상 사례와 입주권 시세 동향",
    isHeadline: false,
    isImportant: true,
  },
  // 17. 공실뉴스 - 상가/사무실/빌딩/공장/토지
  {
    section1: "공실뉴스",
    section2: "상가/사무실/빌딩/공장/토지",
    keyword: "성수동 도산공원 플래그십 스토어 팝업 꼬마빌딩 임대료",
    promptSeed: "글로벌 패션·뷰티 브랜드의 성수·도산공원 플래그십 스토어 유치 경쟁과 임대료 상승세 분석",
    isHeadline: false,
    isImportant: false,
  },
  // 18. 부동산·경제 - 부동산정책/정치
  {
    section1: "부동산·경제",
    section2: "부동산정책/정치",
    keyword: "수도권 광역급행철도 GTX 개통 역세권 집값 상권 영향",
    promptSeed: "GTX 노선 개통 및 추가 연장 계획에 따른 수도권 핵심 환승역세권의 출퇴근 혁신과 부동산 가격 재평가",
    isHeadline: false,
    isImportant: false,
  },
  // 19. 부동산·경제 - 경제/재테크/주식
  {
    section1: "부동산·경제",
    section2: "경제/재테크/주식",
    keyword: "부동산 PF 정상화 펀드 건설사 유동성 채권 시장",
    promptSeed: "정부와 금융권의 부동산 PF 정상화 펀드 본격 가동과 우량 사업장 중심의 자금 재편 및 투자 시사점",
    isHeadline: false,
    isImportant: false,
  },
  // 20. AI마케팅 - AI/NEWS
  {
    section1: "AI마케팅",
    section2: "AI/NEWS",
    keyword: "AI 건축 설계 자동화 용적률 법규 검토 프롭테크",
    promptSeed: "인공지능이 10초 만에 대지 조건별 최적 용적률과 일조권을 계산하는 AI 건축 설계 자동화 기술 상용화",
    isHeadline: false,
    isImportant: false,
  },
];

async function main() {
  console.log("🚀 [공실뉴스] AI 기사 20개 일괄 자동 발행 파이프라인 시작...");
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

      // 발행 시각: 순차적 시간 배치 (최근 순 정렬)
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
  console.log(`🎉 [공실뉴스] 20개 기사 발행 작업 완료!`);
  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  console.log(`- 성공: ${successCount}건 / 실패: ${results.length - successCount}건`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Critical run error:", err);
  process.exit(1);
});
