import { getGenAIClient } from "./core";

export interface NewsArticleRequest {
  sourceText: string; // 검색된 여러 기사들의 원문이나 요약본 (팩트 덩어리)
  category: string;   // 예: "부동산·주식·재테크", "여행·건강·생활" 등
}

export interface NewsArticleResult {
  title: string;
  subtitle: string;
  content: string; // HTML 포맷의 본문
  keywords: string;
  sourceUrl?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class NewsArticleAgent {
  /**
   * 입력된 뉴스 소스(요약본 후보군)를 바탕으로 가장 핫한 뉴스를 골라 완전히 새로운 기사를 작성합니다.
   */
  static async writeArticle(req: NewsArticleRequest): Promise<NewsArticleResult> {
    const genAI = await getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `너는 '공실뉴스' 플랫폼의 편집국장이자 수석 기자야.
너에게는 오늘 발생한 여러 개의 최신 뉴스 후보 목록이 제공될 거야.
너의 첫 번째 임무는 이 후보들 중에서 **대중의 클릭을 가장 많이 유도할 수 있고, 논란이나 화제가 될 만한 가장 'HOT'한 뉴스 딱 1개**를 스스로 선택하는 거야.
두 번째 임무는 선택한 그 뉴스 1개의 '팩트'를 바탕으로 완전히 새로운 시각과 문체를 가진 독창적인 기사를 새롭게 창조하는 거야.

[절대 지켜야 할 리라이팅(Rewriting) 원칙]
1. 표절 방지: 제공된 원문의 문장 구조, 표현, 단어 배열을 절대로 그대로 따라 쓰지 마라.
2. 팩트 추출: 원문에서 객관적인 수치, 날짜, 장소, 인물 등 '핵심 팩트'만 추출해라.
3. 기사 재구성: 추출한 팩트를 바탕으로 새로운 기획 기사를 쓰듯 완전히 판을 새로 짜서 작성해라.
4. 구성: 시선을 끄는 첫 문장(Hook)으로 시작하고, 중간에 본론을 두며, 마지막은 이 사안이 미칠 '영향이나 향후 전망'으로 마무리해라.
5. 출처 배제: "OO뉴스에 따르면", "OO일보 보도에 따르면" 같은 타사 언론사 이름이나 출처는 절대 적지 마라. (마치 네가 직접 취재한 것처럼 써라)
6. 원문 URL 기록: 네가 최종 선택한 원본 뉴스의 URL 주소를 반드시 'sourceUrl' 필드에 그대로 기입해라.

[문체 (Tone & Manner) - 매우 중요!!]
네가 작성할 기사의 카테고리는 [${req.category}]야.
- 블로그나 매거진 같은 가벼운 말투(~해요, ~있답니다, ~알아볼까요?)는 절대 금지한다.
- 무조건 정통 뉴스 기사체(다/나/까, ~했다, ~한다, ~열린다, ~밝혔다, ~전망이다)를 사용하여 철저히 객관적이고 건조하게 작성해라.

[출력 형식 및 제약사항]
1. 응답은 반드시 아래 JSON 형식으로만 출력할 것 (마크다운 백틱 제외, 순수 JSON만).
2. content 필드는 HTML 태그(<p>, <strong>, <br> 등)를 사용하여 문단을 나누고 가독성 좋게 포맷팅해라.
3. <h3> 태그나 주황색 소제목 등 시각적으로 튀는 태그는 절대 사용하지 마라.
4. 기사 끝에 출처나 원문 링크를 절대 본문에 달지 마라. (sourceUrl 필드에만 넣어라)

{
  "title": "클릭을 유도하면서도 팩트를 담은 독창적인 기사 제목 (최대 30자)",
  "subtitle": "핵심 요약 1 (명사형 종결)\\n핵심 요약 2 (명사형 종결)\\n핵심 요약 3 (명사형 종결)\\n(반드시 3줄로 작성할 것. 기사 제목이나 특수기호('-', '•', 숫자 등)는 절대 맨 앞에 붙이지 말고 순수 텍스트만 줄바꿈하여 작성해라. 문장 끝은 ~예정, ~개최, ~돌파 등 짧고 간결한 명사형으로 끝낼 것. '~입니다', '~했습니다' 등 긴 서술어 절대 금지)",
  "content": "아래 [기사 본문 구조]를 100% 준수하여 HTML 태그(<p>, <b>, <br>)로 작성해라.\\n\\n[기사 본문 구조]\\n1. 기사설명(도입부): 사건의 핵심을 요약하는 3~4줄 분량의 첫 문단\\n2. 단락별 설명(본론): 반드시 3개의 소제목 단락으로 구성할 것. 각 소제목 앞에는 반드시 '■ ' 기호를 붙이고 <b> 태그로 굵게 처리할 것. (예: <p><b>■ 소제목 내용</b></p>)\\n3. 결론: 사안의 영향이나 전망을 3줄 분량으로 요약하며 마무리.\\n\\n(주의: 정통 뉴스 기사체 사용, <h3> 같은 다른 스타일 태그나 CSS 속성 절대 금지)",
  "keywords": "해시태그 기호 없이 키워드만 쉼표로 구분하여 5~10개 작성 (예: 키워드1,키워드2,키워드3,키워드4,키워드5)",
  "sourceUrl": "네가 선택한 원본 기사의 URL 주소 (후보 목록에 있던 URL 그대로 복사할 것)"
}`;

    const userPrompt = `[오늘의 최신 뉴스 후보 목록]\n${req.sourceText}\n\n위 후보들 중 대중이 가장 열광할 만한 1개의 뉴스를 선택하여, 저작권에 걸리지 않는 완전히 새로운 [${req.category}] 카테고리 기사를 JSON으로 작성해라.`;

    try {
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      const response = result.response;
      let text = response.text();

      // JSON 파싱을 위한 전처리 (마크다운 제거)
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed = JSON.parse(text);

      const usage = response.usageMetadata;
      const tokenUsage = usage ? {
        inputTokens: usage.promptTokenCount,
        outputTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
      } : undefined;

      return {
        title: parsed.title,
        subtitle: parsed.subtitle,
        content: parsed.content,
        keywords: parsed.keywords,
        sourceUrl: parsed.sourceUrl,
        usage: tokenUsage,
      };

    } catch (error: any) {
      console.error("[NewsArticleAgent] Error:", error);
      throw new Error("뉴스 기사 재창조 중 오류가 발생했습니다: " + error.message);
    }
  }
}
