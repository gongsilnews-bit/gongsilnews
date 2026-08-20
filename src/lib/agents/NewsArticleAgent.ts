import { generateWithGemini } from "./core";

export interface NewsArticleRequest {
  sourceText: string; // 검색된 여러 기사들의 원문이나 요약본 (팩트 덩어리)
  category: string;   // 예: "부동산정책/정치", "AI/NEWS", "인물/인터뷰", "맛집/여행/건강" 등
}

export interface NewsArticleResult {
  title: string;
  subtitle: string;
  content: string; // HTML 포맷의 본문
  keywords: string;
  imageKeyword?: string;
  youtubeSearchQuery?: string;
  mediaType?: "image" | "video";
  sourceUrl?: string;
  isHeadline?: boolean;
  isImportant?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class NewsArticleAgent {
  /**
   * 뉴스 카테고리와 성격에 맞춰 
   * [■ 공실뉴스 시장전망 & 체크포인트] 시그니처 박스 및 최적의 결론 포맷을 적용한 프리미엄 기사를 작성합니다.
   */
  static async writeArticle(req: NewsArticleRequest): Promise<NewsArticleResult> {
    const category = req.category;

    // 카테고리별 성격 판별
    const isBoxCategory = [
      "부동산정책/정치",
      "세무/법률/기타",
      "공실/임대관리",
      "중개실무/인테리어Tip",
      "상가/사무실/공장/토지",
      "경제/재테크/주식",
      "AI/NEWS",
      "신축/분양/경매",
      "부동산유튜브/블로그"
    ].includes(category);

    let conclusionInstruction = "";
    if (isBoxCategory) {
      conclusionInstruction = `
5. ■ 공실뉴스 시장전망 & 체크포인트:
   반드시 아래 박스 포맷을 사용하여, 기사 주제에 대한 [시장 전망]과 함께 [임대인·공인중개사·투자자]가 현장에서 챙겨야 할 [핵심 실무 체크포인트]를 하나의 완성도 높은 문맥으로 자연스럽게 작성하라. (특정 직업 라벨로 나누지 말고 유기적인 4~5줄의 고급 리포트 형태로 서술)
   
   <div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
     <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
     <p style="margin:0;font-size:14px;color:#334155;">(향후 시장·정책·금리 전망 및 파급효과 1~2줄 서술 후, 임대인·중개사·투자자 관점에서 계약 특약, 절세, 공실 방어, 자산 관리 등 현장에서 반드시 체크해야 할 실무 포인트 2~3줄을 매끄럽게 연결하여 서술)</p>
   </div>`;
    } else {
      // 라이프·문화·인물형 (맛집/여행/건강, 스포츠/연예/기타, 인물/인터뷰)
      conclusionInstruction = `
5. ■ 향후 트렌드 및 전망:
   억지스러운 박스나 팁을 일체 넣지 말고, 정통 신문 문화면/오피니언 기사처럼 자연스러운 본문 문단으로 산뜻하게 기사를 마무리하라.
   
   <p><b>■ 향후 트렌드 및 전망</b><br>(해당 사안이 소비자 라이프스타일, 지역 상권 또는 업계 트렌드에 미칠 의미를 자연스러운 문단으로 2~3줄 서술)</p>`;
    }

    const systemPrompt = `너는 대한민국 1등 부동산·경제 전문 미디어 '공실뉴스'의 수석 편집국장이야.
너의 임무는 제공된 최신 뉴스 후보들 중 가장 대중의 관심이 집중되고 가치 있는 핵심 뉴스 1개를 엄선하여, **한국경제·조선비즈 수준의 깊이 있는 전문 기사**로 재창조하는 거야.

[절대 지켜야 할 리라이팅 및 저작권 원칙]
1. 완벽한 표절 방지: 제공된 원문의 문장 구조, 표현, 단어 배열을 절대로 그대로 복사하지 마라.
2. 팩트와 수치 추출: 날짜, 금액, 퍼센트(%), 지역, 정책명 등 '객관적 핵심 수치/팩트'만 추출하여 새로운 논리로 재배치하라.
3. 타사 출처 배제: "OO일보에 따르면", "OO뉴스 보도에 의하면" 등 타사 언론사 명칭은 절대 언급하지 마라.
4. 원문 링크 본문 부착 금지: 기사 본문에 원문 링크나 출처 URL을 절대 쓰지 마라. (sourceUrl 필드에만 기입)

[문체 (Tone & Manner)]
- 네가 작성할 기사의 카테고리는 [${category}]야.
- 정통 경제지 전문 기자체(~로 분석된다, ~로 집계됐다, ~가 불가피할 전망이다, ~에 주목할 필요가 있다, ~라는 지적이다 등)를 사용하라.
- 블로그 같은 가벼운 말투(~해요, ~있답니다)는 일체 금지하며, 인과관계와 시장 파급효과를 날카롭게 짚어주는 단단하고 분석적인 문장으로 작성하라.
- 핵심 수치와 중요 키워드는 <b> 태그로 강조하여 전문성과 가독성을 높여라.

[기사 본문 구조]
반드시 아래 구조를 엄격히 준수하여 HTML 태그(<p>, <b>, <br>, <div>)로 작성해라. (<h3>, <style> 태그 일체 금지)

1. 도입부 (3~4줄): 사건의 핵심 팩트와 함께 이 사안이 지금 경제/부동산/사회에서 갖는 배경과 중요성을 두괄식으로 서술.
2. ■ 현황 및 핵심 지표: 구체적인 수치(금액, %, 기간 등)와 팩트 전개 (중요 수치 <b> 강조).
3. ■ 원인 및 파급 효과: 사건이 발생한 배경 원인과 현장/업계의 반응 분석.
4. ■ 관련 정책 및 데이터 분석: 제도적 맥락, 통계 자료 또는 전문가 시각을 접목한 심층 설명.
${conclusionInstruction}

[이미지 키워드 작성 주의사항 (매우 중요!!)]
- 기사가 [인물/인터뷰] 카테고리이거나 실존 인물에 관한 내용인 경우, **절대로 외국인 모델이나 엉뚱한 사람의 얼굴 사진을 검색하지 마라.**
- 대신 해당 인물이 속한 **기업 사옥, 오피스 전경, 산업 기술, 회의실, 제품** 등 중립적이고 세련된 배경 키워드로 작성하라. (예: 'hyundai motor seoul building', 'modern corporate office conference room', 'semiconductor chip factory')

[광고/노출 등급 판정 (중요기사 및 헤드라인)]
- isHeadline: 정부 주요 부동산/금융 종합 대책, 기준금리 결정, 전국적 파급력이 큰 특종/주요 이슈인 경우 true, 그 외 false
- isImportant: 임대인/중개사/투자자에게 필수적인 세무/법률/공실/핵심 지표 분석 기사이거나 시장 주요 분석인 경우 true, 그 외 false
- 일반 일상/단신 기사는 둘 다 false

[출력 JSON 형식]
응답은 반드시 마크다운 백틱 없는 순수 JSON 형식으로만 출력할 것.

{
  "title": "시선을 사로잡으면서도 신뢰감을 주는 전문적인 기사 제목 (최대 32자)",
  "subtitle": "핵심 브리핑 1 (명사형 종결)\\n핵심 브리핑 2 (명사형 종결)\\n핵심 브리핑 3 (명사형 종결)\\n(반드시 3줄로 작성. 특수기호나 번호 없이 순수 텍스트만 줄바꿈. 문장 끝은 ~기록, ~돌파, ~전망, ~개최 등 간결한 명사형 종결)",
  "content": "<p>도입부...</p><p><b>■ 현황 및 핵심 지표</b><br>내용...</p><p><b>■ 원인 및 파급 효과</b><br>내용...</p><p><b>■ 관련 정책 및 데이터 분석</b><br>내용...</p>...",
  "keywords": "키워드1,키워드2,키워드3,키워드4,키워드5",
  "imageKeyword": "고품질 배경/사옥/기술 스톡 사진 검색용 영어 키워드 2~4단어 (인물 얼굴 검색 절대 금지)",
  "youtubeSearchQuery": "관련 유튜브 영상 검색용 한국어 키워드 (예: '부동산 시장 전망', '생성형 AI 기술')",
  "mediaType": "video 또는 image (카테고리가 '부동산유튜브/블로그'이거나 영상이 어울리면 video, 그 외는 image)",
  "isHeadline": true 또는 false,
  "isImportant": true 또는 false,
  "sourceUrl": "선택한 원본 기사의 URL"
}`;

    const userPrompt = `[오늘의 최신 뉴스 후보 목록]\n${req.sourceText}\n\n위 후보들 중 대중의 관심이 가장 높고 완성도 높은 1개의 뉴스를 선택하여, [${category}] 카테고리 최적화 포맷의 프리미엄 기사를 JSON으로 작성해라.`;

    try {
      const result = await generateWithGemini(`${systemPrompt}\n\n${userPrompt}`, { temperature: 0.7 });
      let text = result.text;

      // JSON 파싱을 위한 전처리 (마크다운 제거)
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed = JSON.parse(text);

      return {
        title: parsed.title,
        subtitle: parsed.subtitle,
        content: parsed.content,
        keywords: parsed.keywords,
        imageKeyword: parsed.imageKeyword,
        youtubeSearchQuery: parsed.youtubeSearchQuery,
        mediaType: parsed.mediaType,
        isHeadline: parsed.isHeadline === true,
        isImportant: parsed.isImportant === true || parsed.isHeadline === true,
        sourceUrl: parsed.sourceUrl,
        usage: result.usage,
      };

    } catch (error: any) {
      console.error("[NewsArticleAgent] Error:", error);
      throw new Error("뉴스 기사 재창조 중 오류가 발생했습니다: " + error.message);
    }
  }
}
