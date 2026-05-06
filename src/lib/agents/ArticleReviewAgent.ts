import { getGenAIClient } from "./core";

export interface ArticleReviewInput {
  title: string;
  subtitle?: string;
  content: string;           // HTML 본문
  section1?: string;         // 대분류 (예: 부동산뉴스)
  section2?: string;         // 소분류
  imageUrls?: string[];      // 첨부 이미지 URL 배열
  authorName?: string;
}

export interface ArticleReviewOutput {
  status: "APPROVED" | "REJECTED" | "REVISION_NEEDED";
  score: number;             // 0~100 품질 점수
  reason: string;            // 종합 판정 사유
  details: {
    contentQuality: { pass: boolean; comment: string };    // 기사 품질
    imageRelevance: { pass: boolean; comment: string };    // 이미지 적합성
    promotionCheck: { pass: boolean; comment: string; flaggedKeywords: string[] };  // 홍보성 검사
    factCheck: { pass: boolean; comment: string };         // 사실성/신뢰도
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class ArticleReviewAgent {
  /**
   * 기사 내용과 첨부 이미지를 종합 검토하여 승인/반려/수정요청을 판정합니다.
   */
  static async reviewArticle(input: ArticleReviewInput): Promise<ArticleReviewOutput> {
    try {
      const genAI = await getGenAIClient();
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // HTML 태그 제거하여 순수 텍스트 추출
      const plainContent = input.content
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const prompt = `
너는 '공실뉴스' 부동산 뉴스 플랫폼의 기사 심사 에이전트야.
제출된 기사를 아래 4가지 기준으로 검토하고, 반드시 JSON으로만 응답해.

[최우선 원칙]
언론 기사에는 기자의 주관적인 시장 분석, 의견, 통찰, 사견이 들어가는 것이 매우 당연하고 필수적입니다.
사실 관계가 완벽하게 증명되지 않은 예측이나 주관적인 주장이 있더라도, 이를 이유로 감점하거나 반려/수정요청하지 마세요. "객관적이지 않다", "신뢰할 수 없다"는 식의 '글쓰기 훈수'는 절대 금지합니다.
너의 진짜 역할은 오직 '스팸/불법 광고 차단'입니다.

[검토 기준]

1. 기사 품질 및 카테고리 연관성 (contentQuality)
   - 기사의 형태를 띄고 있는가? (단순 낙서나 의미 없는 단어 나열이 아닌가?)
   - 주관적인 칼럼이나 사설도 훌륭한 기사이므로 무조건 pass: true로 처리.
   - [중요] 기사의 내용이 선택된 분류(카테고리)와 연관성이 있는가? (예: 아파트 기사인데 상가 카테고리를 선택했는지 확인) 연관성이 현저히 떨어진다면 pass: false 및 수정요청.

2. 이미지 적합성 (imageRelevance)
   - 이미지가 없어도 무관.

3. 홍보성 검사 (promotionCheck) ← 이 항목만 가장 엄격하게 검사!
   - 특정 중개사무소/업체의 전화번호(010, 02 등)가 대놓고 포함되어 있는가?
   - "상담 환영", "매물 접수", "수수료 할인", "전화주세요", "분양 문의" 등 노골적인 영업 홍보 문구가 있는가?
   - 발견 시 flaggedKeywords 배열에 담아줘.

4. 사실성/신뢰도 (factCheck)
   - 기자의 주관적인 해석, 미래 예측, 시장 전망은 모두 pass: true입니다.
   - 단, 욕설, 타인 비방, 완전히 허무맹랑한 스팸(예: "도박 사이트 접속")인 경우에만 pass: false.

[판정 기준]
- 4개 항목 모두 pass → status: "APPROVED", score: 85~100
- 홍보성 검사 실패(노골적 전화번호/광고) → status: "REJECTED", score: 0~30
- 심한 욕설이나 의미 없는 도배글 → status: "REJECTED", score: 0~30
- 그 외 애매한 경우 → status: "REVISION_NEEDED", score: 40~70

[제출된 기사]
- 제목: ${input.title}
- 부제: ${input.subtitle || "(없음)"}
- 분류: ${input.section1 || "미분류"} > ${input.section2 || "미분류"}
- 작성자: ${input.authorName || "미상"}
- 본문:
${plainContent.substring(0, 3000)}

- 첨부 이미지 수: ${input.imageUrls?.length || 0}개
${input.imageUrls?.length ? "- 이미지 URL: " + input.imageUrls.slice(0, 5).join(", ") : ""}

[응답 형식 - 반드시 이 JSON 구조로만 응답]
{
  "status": "APPROVED | REJECTED | REVISION_NEEDED",
  "score": 85,
  "reason": "종합 판정 사유를 1~2문장으로",
  "details": {
    "contentQuality": { "pass": true, "comment": "설명" },
    "imageRelevance": { "pass": true, "comment": "설명" },
    "promotionCheck": { "pass": true, "comment": "설명", "flaggedKeywords": [] },
    "factCheck": { "pass": true, "comment": "설명" }
  }
}
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // JSON 파싱
      const cleanJson = responseText.replace(/```json\n?|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("ArticleReviewAgent JSON Parsing Error:", responseText);
        return {
          status: "REVISION_NEEDED",
          score: 50,
          reason: "AI가 검토 결과를 올바른 형식으로 반환하지 못했습니다. 수동 검토가 필요합니다.",
          details: {
            contentQuality: { pass: true, comment: "자동 검토 실패" },
            imageRelevance: { pass: true, comment: "자동 검토 실패" },
            promotionCheck: { pass: true, comment: "자동 검토 실패", flaggedKeywords: [] },
            factCheck: { pass: true, comment: "자동 검토 실패" },
          },
        };
      }

      return {
        status: parsed.status || "REVISION_NEEDED",
        score: parsed.score || 50,
        reason: parsed.reason || "검토 완료",
        details: {
          contentQuality: parsed.details?.contentQuality || { pass: true, comment: "" },
          imageRelevance: parsed.details?.imageRelevance || { pass: true, comment: "" },
          promotionCheck: parsed.details?.promotionCheck || { pass: true, comment: "", flaggedKeywords: [] },
          factCheck: parsed.details?.factCheck || { pass: true, comment: "" },
        },
        usage: result.response.usageMetadata ? {
          inputTokens: result.response.usageMetadata.promptTokenCount,
          outputTokens: result.response.usageMetadata.candidatesTokenCount,
          totalTokens: result.response.usageMetadata.totalTokenCount,
        } : undefined,
      };

    } catch (error: any) {
      console.error("ArticleReviewAgent Execution Error:", error);
      return {
        status: "REVISION_NEEDED",
        score: 0,
        reason: error.message || "AI 기사 심사 중 오류가 발생했습니다.",
        details: {
          contentQuality: { pass: false, comment: "시스템 오류" },
          imageRelevance: { pass: false, comment: "시스템 오류" },
          promotionCheck: { pass: false, comment: "시스템 오류", flaggedKeywords: [] },
          factCheck: { pass: false, comment: "시스템 오류" },
        },
      };
    }
  }
}
