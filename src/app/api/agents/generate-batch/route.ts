import { NextResponse } from 'next/server';
import { NewsArticleAgent } from '@/lib/agents/NewsArticleAgent';
import { PhotoCurationAgent } from '@/lib/agents/PhotoCurationAgent';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300;

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

const FIVE_TOPICS = [
  {
    category: 'AI/NEWS',
    section1: 'AI마케팅',
    section2: 'AI/NEWS',
    sourceText: '프롭테크 스타트업들이 생성형 인공지능(AI)을 결합한 실시간 상권 분석 및 3D 매물 자동 가상투어 솔루션을 잇따라 상용화하고 있다. 스마트폰으로 빈 상가나 오피스를 한 바퀴 촬영하기만 하면 AI가 1분 만에 3D 입체 투어 도면을 생성하고, 반경 500m 내 유동인구 성별·연령대 소비 패턴과 예상 매출액을 빅데이터로 정밀 산출한다. 주요 부동산 중개법인과 프랜차이즈 본사들의 도입률이 전월 대비 40% 이상 급증했다.',
  },
  {
    category: '부동산정책/정치',
    section1: '부동산·경제',
    section2: '부동산정책/정치',
    sourceText: '정부의 1기 신도시(분당·일산·평촌·산본·중동) 노후계획도시 재건축 선도지구 선정을 앞두고 이주 대책 마련에 비상이 걸렸다. 최대 3만 가구에 달하는 대규모 이주 수요가 일시에 쏟아질 경우 인근 수도권 전세 시장 불안과 집값 자극이 불가피하다는 지적이다. 국토교통부와 지자체는 영구임대주택 재건축 순환용 주택 공급 및 그린벨트 유휴 부지를 활용한 임시 거주시설 확충 방안을 긴급 협의 중이다.',
  },
  {
    category: '경제/재테크/주식',
    section1: '부동산·경제',
    section2: '경제/재테크/주식',
    sourceText: '원·달러 환율이 1390원을 넘어서며 1400원 저항선을 위협하자 글로벌 자산운용사와 개인 자산가들의 포트폴리오 재편이 빨라지고 있다. 고환율과 고금리 장기화 우려 속에 안정적인 현금 흐름을 창출하는 배당형 인프라·오피스 리츠(REITs)와 안전자산인 금(Gold) 현물 ETF로 시중 뭉칫돈이 대거 유입되고 있다. 증권가에서는 환율 변동성 확대 국면에서 현금 배당 중심의 방어적 자산배분 전략을 권고했다.',
  },
  {
    category: '상가/사무실/공장/토지',
    section1: '공실뉴스',
    section2: '상가/사무실/공장/토지',
    sourceText: '서울 및 수도권 주요 역세권 상권에서 권리금이 완전히 사라진 무권리금 1층 점포가 속출하고 있다. 고금리와 온라인 쇼핑 확산으로 자영업자들의 폐업이 늘면서 공실 기간이 1년을 넘기는 점포가 크게 늘었다. 이에 따라 건물주들이 3~6개월 단위의 단기 팝업스토어나 공유주방, 무인 창고 등 유연한 단기 임대차 모델로 발 빠르게 전환하며 상권 체질 개선에 나서고 있다.',
  },
  {
    category: '세무/법률/기타',
    section1: '부동산·경제',
    section2: '세무/법률/기타',
    sourceText: '상가 임대차 계약 체결 시 임대인이 임차인에게 요구하는 제소전 화해조서 조항 중 강행규정에 위반되는 독소조항이 빈번하게 적발되고 있다. 차임 연체 시 즉시 명도나 권리금 포기를 강제하는 조항은 상가건물 임대차보호법에 위배되어 무효가 될 수 있다. 법률 전문가들은 화해조서 작성 시 공인중개사와 법률 전문가의 사전 검토를 거쳐 임차인의 정당한 갱신요구권과 권리금 회수 기회를 철저히 보장받아야 한다고 조언했다.',
  }
];

export async function GET() {
  const supabase = getAdminClient();
  const { data: admin } = await supabase
    .from('members')
    .select('id, name, email')
    .eq('email', 'gongsilnews@gmail.com')
    .single();

  const results = [];

  for (let i = 0; i < FIVE_TOPICS.length; i++) {
    const item = FIVE_TOPICS[i];

    // 1. 기사작성 에이전트
    const aiResult = await NewsArticleAgent.writeArticle({
      sourceText: item.sourceText,
      category: item.category,
      userEmail: 'gongsilnews@gmail.com'
    });

    // 2. 사진/동영상 에이전트 (4단계 우선순위)
    const media = await PhotoCurationAgent.resolvePhoto({
      category: item.category,
      articleTitle: aiResult.title,
      articleSubtitle: aiResult.subtitle,
      articleContent: aiResult.content,
      sourceUrl: aiResult.sourceUrl,
      mediaType: aiResult.mediaType,
      youtubeSearchQuery: aiResult.youtubeSearchQuery,
      userEmail: 'gongsilnews@gmail.com'
    });

    // 3. DB 등록 (최고관리자 AI 규칙: 무조건 status: 'PENDING' 승인대기로 입고!)
    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        title: aiResult.title,
        subtitle: aiResult.subtitle,
        content: aiResult.content,
        section1: item.section1,
        section2: item.section2,
        thumbnail_url: media.thumbnailUrl,
        youtube_url: media.youtubeUrl || null,
        status: 'PENDING', // 승인대기 기본 입고 불변 규칙!
        author_id: admin ? admin.id : null,
        author_name: admin ? admin.name : '공실뉴스',
        author_email: 'gongsilnews@gmail.com',
        view_count: 0
      })
      .select('id, article_no')
      .single();

    results.push({
      id: article?.id,
      articleNo: article?.article_no,
      title: aiResult.title,
      category: item.category,
      sourceType: media.sourceType,
      thumbnailUrl: media.thumbnailUrl,
      status: 'PENDING',
    });
  }

  return NextResponse.json({ success: true, count: results.length, articles: results });
}
