import { generateWithGemini } from "./core";

export interface PressReleaseInput {
  pressReleaseText: string;   // 보도자료 원문 텍스트
  sourceUrl?: string;          // 보도자료 원문 URL
}

export interface PressReleaseOutput {
  title: string;               // 기사 메인 타이틀
  subtitle: string;            // 3줄 부제목 (줄바꿈으로 구분)
  content: string;             // HTML 형식의 기사 본문
  section1: string;            // 추천 1차 섹션
  section2: string;            // 추천 2차 섹션
  keywords: string;            // 키워드 (쉼표 구분)
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class PressReleaseAgent {
  /**
   * 보도자료 텍스트를 분석하여 전문 기사 초안을 생성합니다.
   */
  static async writeArticle(input: PressReleaseInput): Promise<PressReleaseOutput> {
    try {
      const prompt = `
너는 주요 경제지의 부동산 전문 기자다.
감정을 배제하고 철저히 객관적인 정통 기사체(~다, ~밝혔다, ~전망이다)를 사용한다.
팩트와 데이터를 기반으로 신뢰감 있게 보도자료를 분석 및 보도한다.

[절대 규칙]
1. 보도자료의 원문 팩트를 절대 왜곡하지 마라.
2. 육하원칙(5W1H)에 입각하여 스트레이트 기사 형태로 작성하라.
3. 기사 하단에는 이번 조치가 '상업용 부동산(상가, 오피스 등)' 시장에 미칠 파급 효과를 분석한 문단을 반드시 포함하라.

[작성 규칙 및 출력 포맷]
1. 메인 타이틀: 기사의 핵심을 관통하는 명확하고 전문적인 헤드라인을 작성하라.
2. 3줄 부제목: 본문 시작 전, 가장 중요한 팩트 3가지를 리드(Lead) 형태의 부제목으로 요약 배치하라. 각 줄은 줄바꿈(\\n)으로 구분.
3. 본문 (스트레이트 기사): 보도자료의 세부 내용을 육하원칙에 입각한 기사 형태로 재구성하라. 실제 신문 기사처럼 문단(p 태그)으로만 구성하라. h3, h2 등 소제목 태그를 절대 사용하지 마라. 강조가 필요하면 <p><strong>텍스트</strong></p> 형태만 사용하라.
4. 시장 전망 (인사이트): 기사 하단에 해당 발표가 '상업용 부동산(상가, 오피스 등)' 시장과 임대수익률에 미칠 파급 효과를 객관적으로 분석한 단락을 추가하라.
5. 출처 링크: 별도로 처리하므로 본문에 포함하지 마라.
6. 카테고리 자동 분류: 아래 카테고리 목록 중 가장 적합한 것을 선택하라.
   - 1차 섹션: 부동산정책, 부동산뉴스, 상권분석, 금융/세금, 건물관리, 법률/판례, 시장동향
   - 2차 섹션: 내용에 맞게 자유롭게 작성

[보도자료 원문]
${input.pressReleaseText}

${input.sourceUrl ? `[출처 URL]\n${input.sourceUrl}` : ''}

[응답 형식 - 반드시 이 JSON 구조로만 응답]
{
  "title": "기사 메인 타이틀",
  "subtitle": "부제목 1줄\\n부제목 2줄\\n부제목 3줄",
  "content": "<p>HTML 형식의 기사 본문</p>",
  "section1": "추천 1차 섹션명",
  "section2": "추천 2차 섹션명",
  "keywords": "키워드1,키워드2,키워드3"
}
      `;

      const result = await generateWithGemini(prompt, { temperature: 0.5 });

      // JSON 파싱
      const cleanJson = result.text.replace(/```json\n?|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("[보도자료 에이전트] JSON Parsing Error:", result.text);
        throw new Error("AI가 기사를 올바른 형식으로 생성하지 못했습니다. 다시 시도해주세요.");
      }

      return {
        title: parsed.title || "(제목 없음)",
        subtitle: parsed.subtitle || "",
        content: parsed.content || "",
        section1: parsed.section1 || "부동산정책",
        section2: parsed.section2 || "",
        keywords: parsed.keywords || "",
        usage: result.usage,
      };

    } catch (error: any) {
      console.error("[보도자료 에이전트] Execution Error:", error);
      throw error;
    }
  }
}
