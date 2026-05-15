import { getGeminiApiKey } from "./core";

export interface VerifyAgentInput {
  imageBuffer: Buffer;
  mimeType: string;
  userInputData: {
    companyName?: string;
    representative?: string;
  };
}

export interface VerifyAgentOutput {
  status: "APPROVED" | "REJECTED" | "NEEDS_REVIEW" | "ERROR";
  message: string;
  diff?: {
    expected: any;
    found: any;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class VerifyAgent {
  /**
   * 부동산 서류 이미지를 검증하여 사용자 입력 데이터와의 일치 여부를 판단합니다.
   */
  static async verifyDocument({ imageBuffer, mimeType, userInputData }: VerifyAgentInput): Promise<VerifyAgentOutput> {
    try {
      const apiKey = await getGeminiApiKey();

      const prompt = `
        너는 부동산 중개사무소 등록증과 사업자등록증을 검토하는 전문 심사 에이전트야.
        첨부된 이미지를 읽고 다음 정보를 정확하게 추출해서 반드시 JSON 포맷으로만 응답해.
        
        [추출할 정보]
        - companyName: 상호명 혹은 명칭 (예: OO공인중개사사무소)
        - representative: 대표자 성명
        - registrationNumber: 등록번호 (사업자등록번호 또는 중개사무소등록번호)
        - address: 소재지 주소
        
        [JSON 응답 예시]
        {
          "companyName": "홍길동 공인중개사사무소",
          "representative": "홍길동",
          "registrationNumber": "111-22-33333",
          "address": "서울시 강남구 테헤란로 123"
        }
      `;

      const base64Data = imageBuffer.toString("base64");
      const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      let lastError = "";

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType, data: base64Data } }
                ]
              }],
              generationConfig: { temperature: 0.2 }
            })
          });

          if (!response.ok) {
            const errRes = await response.json().catch(() => ({}));
            lastError = errRes?.error?.message || `${model} 호출 실패`;
            continue;
          }

          const json = await response.json();
          const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!responseText) { lastError = "AI 응답 없음"; continue; }

          // JSON 파싱
          const cleanJsonString = responseText.replace(/```json\n?|```/g, '').trim();
          let extractedData;
          try {
            extractedData = JSON.parse(cleanJsonString);
          } catch (parseError) {
            console.error("Agent JSON Parsing Error:", responseText);
            return { status: "ERROR", message: "AI가 서류 정보를 올바른 형식으로 추출하지 못했습니다." };
          }

          // 사용자 입력 데이터와 이미지 추출 데이터 비교
          const safeCompanyName = userInputData.companyName?.trim() || "";
          const safeRepName = userInputData.representative?.trim() || "";
          const isNameMatch = extractedData.companyName?.includes(safeCompanyName) || safeCompanyName.includes(extractedData.companyName);
          const isRepMatch = extractedData.representative === safeRepName;

          const usageMeta = json.usageMetadata;
          const usageInfo = usageMeta ? {
            inputTokens: usageMeta.promptTokenCount || 0,
            outputTokens: usageMeta.candidatesTokenCount || 0,
            totalTokens: usageMeta.totalTokenCount || 0,
          } : undefined;

          if (isNameMatch && isRepMatch) {
            return { status: "APPROVED", message: "서류 검증이 완료되었습니다. (자동 승인)", usage: usageInfo };
          } else {
            return { 
              status: "NEEDS_REVIEW", 
              message: "입력한 정보와 서류 내용이 일치하지 않거나 누락되었습니다. 수동 검토가 필요합니다.",
              diff: { expected: userInputData, found: extractedData },
              usage: usageInfo
            };
          }
        } catch (err: any) {
          lastError = err.message;
        }
      }

      return { status: "ERROR", message: `AI 서류 인식 실패: ${lastError}` };

    } catch (error: any) {
      console.error("VerifyAgent Execution Error:", error);
      return { status: "ERROR", message: error.message || "AI 서류 인식 중 오류가 발생했습니다." };
    }
  }
}
