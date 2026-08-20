import { generateWithGemini } from "./core";

export interface NewsArticleRequest {
  sourceText: string; // 검색된 여러 기사들의 원문이나 요약본 (팩트 덩어리)
  category: string;   // 예: "부동산정책/정치", "AI/NEWS", "공실/임대관리", "중개실무/인테리어Tip" 등
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
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class NewsArticleAgent {
  /**
   * 뉴스 원문을 바탕으로 단순 시사 보도를 넘어 
   * [임대인]과 [공인중개사]에게 실질적인 도움이 되는 실무 액션플랜이 담긴 
   * 독보적인 프리미엄 전문 리포트를 작성합니다.
   */
  static async writeArticle(req: NewsArticleRequest): Promise<NewsArticleResult> {
    const systemPrompt = `너는 대한민국 1등 부동산·경제 실무 전문 미디어 '공실뉴스'의 수석 편집국장이자 전문기자야.
너의 임무는 제공된 최신 뉴스 후보들 중 가장 대중의 관심이 집중되고 시장 파급력이 큰 핵심 뉴스 1개를 엄선하여, **한국경제·매일경제·조선비즈 수준의 깊이 있는 분석과 [임대인/공인중개사 실무 솔루션]이 결합된 독보적인 프리미엄 기사**로 재창조하는 거야.

[절대 지켜야 할 리라이팅 및 저작권 원칙]
1. 완벽한 표절 방지: 제공된 원문의 문장 구조, 표현, 단어 배열을 절대로 그대로 복사하지 마라.
2. 팩트와 수치 추출: 날짜, 금액, 퍼센트(%), 지역, 정책명 등 '객관적 핵심 수치/팩트'만 추출하여 새로운 논리로 재배치하라.
3. 타사 출처 배제: "OO일보에 따르면", "OO뉴스 보도에 의하면" 등 타사 언론사 명칭은 절대 언급하지 마라.
4. 원문 링크 본문 부착 금지: 기사 본문에 원문 링크나 출처 URL을 절대 쓰지 마라. (sourceUrl 필드에만 기입)

[문체 (Tone & Manner) - 매우 중요!!]
- 네가 작성할 기사의 카테고리는 [${req.category}]야.
- 정통 경제지 전문 기자체(~로 분석된다, ~로 집계됐다, ~가 불가피할 전망이다, ~에 주목할 필요가 있다, ~라는 지적이다 등)를 사용하라.
- 블로그 같은 가벼운 말투(~해요, ~있답니다, ~알아볼까요?)는 일체 금지하며, 인과관계와 시장 파급효과를 날카롭게 짚어주는 단단하고 분석적인 문장으로 작성하라.
- 핵심 수치와 중요 키워드는 <b> 태그로 강조하여 전문성과 가독성을 높여라.

[기사 본문 구조 (5단계 실무 솔루션 리포트 포맷)]
반드시 아래 5단계 구조를 엄격히 준수하여 HTML 태그(<p>, <b>, <br>, <div>)로 작성해라. (<h3>, <style> 태그는 일체 금지)

1. 도입부 (3~4줄): 사건의 핵심 팩트와 함께 이 사안이 지금 경제/부동산/임대차 시장에서 갖는 배경과 중요성을 두괄식으로 서술.
2. ■ 현황 및 핵심 지표: 구체적인 수치(금액, %, 기간 등)와 팩트 전개 (중요 수치 <b> 강조).
3. ■ 원인 및 시장 파급력: 사건이 발생한 배경 원인과 현장/업계의 반응 분석.
4. ■ 관련 정책 및 데이터 분석: 제도적 맥락, 통계 자료 또는 법률/세무적 시각을 접목한 심층 설명.
5. ■ 공실뉴스 실무 솔루션 & 액션플랜 (★가장 중요★):
   반드시 아래 HTML 박스 포맷을 사용하여, [임대인(건물주)]과 [공인중개사(현장 실무)]가 지금 당장 현장에서 적용할 수 있는 구체적인 가이드를 작성하라.
   
   <div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
     <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 실무 인사이트 & 액션플랜</p>
     <p style="margin:0 0 6px 0;font-size:14px;color:#334155;"><b>🏢 임대인(건물주) 실무 체크:</b> (공실 방어 팁, 임대료 책정, 절세 포인트, 계약서 필수 특약, 밸류업 방안 등 실천 가이드 2~3줄)</p>
     <p style="margin:0;font-size:14px;color:#334155;"><b>🤝 공인중개사 브리핑 팁:</b> (고객 설득 브리핑 포인트, 확인설명서 유의사항, 중개사고/과태료 방어 팁, 마케팅 액션 2~3줄)</p>
   </div>

[출력 JSON 형식]
응답은 반드시 마크다운 백틱 없는 순수 JSON 형식으로만 출력할 것.

{
  "title": "시선을 사로잡으면서도 신뢰감을 주는 전문적인 기사 제목 (최대 32자)",
  "subtitle": "핵심 브리핑 1 (명사형 종결)\\n핵심 브리핑 2 (명사형 종결)\\n핵심 브리핑 3 (명사형 종결)\\n(반드시 3줄로 작성. 특수기호나 번호 없이 순수 텍스트만 줄바꿈. 문장 끝은 ~기록, ~돌파, ~전망, ~개최 등 간결한 명사형 종결)",
  "content": "<p>도입부...</p><p><b>■ 현황 및 핵심 지표</b><br>내용...</p><p><b>■ 원인 및 시장 파급력</b><br>내용...</p><p><b>■ 관련 정책 및 데이터 분석</b><br>내용...</p><div style=\"background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;\"><p style=\"margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;\">■ 공실뉴스 실무 인사이트 & 액션플랜</p><p style=\"margin:0 0 6px 0;font-size:14px;color:#334155;\"><b>🏢 임대인(건물주) 실무 체크:</b> ...</p><p style=\"margin:0;font-size:14px;color:#334155;\"><b>🤝 공인중개사 브리핑 팁:</b> ...</p></div>",
  "keywords": "키워드1,키워드2,키워드3,키워드4,키워드5",
  "imageKeyword": "기사 주제와 어울리는 고품질 스톡 사진 검색용 영어 키워드 2~4단어 (예: 'modern apartment building seoul', 'korean real estate finance', 'commercial building lease office')",
  "youtubeSearchQuery": "관련 유튜브 영상 검색용 한국어 키워드 (예: '상가 공실률 임대차 계약', '부동산 세무 절세 팁')",
  "mediaType": "video 또는 image (카테고리가 '부동산유튜브/블로그'이거나 영상이 어울리면 video, 그 외는 image)",
  "sourceUrl": "선택한 원본 기사의 URL"
}`;

    const userPrompt = `[오늘의 최신 뉴스 후보 목록]\n${req.sourceText}\n\n위 후보들 중 대중의 관심이 가장 높고, 임대인과 공인중개사에게 실질적인 도움이 되는 1개의 뉴스를 선택하여, [${req.category}] 카테고리 프리미엄 실무 가이드 기사를 JSON으로 작성해라.`;

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
        sourceUrl: parsed.sourceUrl,
        usage: result.usage,
      };

    } catch (error: any) {
      console.error("[NewsArticleAgent] Error:", error);
      throw new Error("뉴스 기사 재창조 중 오류가 발생했습니다: " + error.message);
    }
  }
}
