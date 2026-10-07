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
    expected: unknown;
    found: unknown;
    mismatches?: string[];
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface RealtorDocumentInput {
  kind: "BUSINESS_REGISTRATION" | "BROKERAGE_REGISTRATION";
  imageBuffer: Buffer;
  mimeType: string;
}

export interface VerifyRealtorDocumentsInput {
  documents: RealtorDocumentInput[];
  userInputData: {
    companyName?: string;
    representative?: string;
    businessNumber?: string;
    brokerageRegistrationNumber?: string;
  };
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]/g, "");
}

function normalizeBusinessNumber(value: unknown) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function valuesMatch(expected: unknown, found: unknown, normalizer = normalizeText) {
  const normalizedExpected = normalizer(expected);
  const normalizedFound = normalizer(found);
  return normalizedExpected.length > 0
    && normalizedFound.length > 0
    && normalizedExpected === normalizedFound;
}

type ExtractedCertificate = {
  readable?: boolean;
  companyName?: unknown;
  representative?: unknown;
  businessNumber?: unknown;
  registrationNumber?: unknown;
};

type ExtractedRealtorDocuments = {
  businessCertificate?: ExtractedCertificate;
  brokerageCertificate?: ExtractedCertificate;
};

function parseGeminiJson<T>(responseText: string): T {
  const cleanJsonString = responseText
    .replace(/```json\s?|```/gi, "")
    .trim();
  return JSON.parse(cleanJsonString) as T;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export class VerifyAgent {
  /**
   * 사업자등록증과 중개사무소 개설등록증을 함께 읽고 네 가지 핵심 입력값을 대조합니다.
   * 자동 승인은 모든 값이 일치할 때만 허용하고, 불확실하거나 API가 실패하면 승인대기로 보냅니다.
   */
  static async verifyRealtorDocuments({ documents, userInputData }: VerifyRealtorDocumentsInput): Promise<VerifyAgentOutput> {
    const businessDocument = documents.find((document) => document.kind === "BUSINESS_REGISTRATION");
    const brokerageDocument = documents.find((document) => document.kind === "BROKERAGE_REGISTRATION");

    if (!businessDocument || !brokerageDocument) {
      return {
        status: "NEEDS_REVIEW",
        message: "사업자등록증과 중개사무소 개설등록증을 모두 제출해 주세요.",
      };
    }

    const expected = {
      companyName: userInputData.companyName?.trim() || "",
      representative: userInputData.representative?.trim() || "",
      businessNumber: userInputData.businessNumber?.trim() || "",
      brokerageRegistrationNumber: userInputData.brokerageRegistrationNumber?.trim() || "",
    };

    if (Object.values(expected).some((value) => !value)) {
      return {
        status: "NEEDS_REVIEW",
        message: "상호명, 대표자명, 사업자등록번호, 중개사무소 개설등록번호를 모두 입력해 주세요.",
      };
    }

    try {
      const apiKey = await getGeminiApiKey();
      const prompt = `
너는 대한민국 부동산 중개사무소 가입 서류를 판독하는 심사 보조 에이전트다.
아래 두 이미지에는 각각 문서 종류 라벨이 붙어 있다. 보이는 내용만 추출하고 추측하지 마라.
반드시 다음 JSON 객체 하나만 응답해라.

{
  "businessCertificate": {
    "readable": true,
    "companyName": "사업자등록증의 상호",
    "representative": "사업자등록증의 대표자",
    "businessNumber": "사업자등록번호"
  },
  "brokerageCertificate": {
    "readable": true,
    "companyName": "중개사무소 개설등록증의 명칭 또는 상호",
    "representative": "중개사무소 개설등록증의 대표자",
    "registrationNumber": "중개사무소 개설등록번호"
  }
}

읽을 수 없는 값은 빈 문자열로 두고 readable을 false로 설정해라.
번호, 상호, 대표자명을 임의로 보정하거나 새로 만들지 마라.
`;

      const parts: Array<Record<string, unknown>> = [{ text: prompt }];
      for (const document of [businessDocument, brokerageDocument]) {
        parts.push({
          text: document.kind === "BUSINESS_REGISTRATION"
            ? "[문서 1: 사업자등록증]"
            : "[문서 2: 중개사무소 개설등록증]",
        });
        parts.push({
          inlineData: {
            mimeType: document.mimeType,
            data: document.imageBuffer.toString("base64"),
          },
        });
      }

      const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3-flash-preview"];
      let lastError = "";

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            }),
          });

          if (!response.ok) {
            const errRes = await response.json().catch(() => ({}));
            lastError = errRes?.error?.message || `${model} 호출 실패 (${response.status})`;
            continue;
          }

          const json = await response.json();
          const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!responseText) {
            lastError = "AI 응답 없음";
            continue;
          }

          let extractedData: ExtractedRealtorDocuments;
          try {
            extractedData = parseGeminiJson<ExtractedRealtorDocuments>(responseText);
          } catch {
            lastError = "AI 응답 JSON 해석 실패";
            continue;
          }

          const business = extractedData?.businessCertificate || {};
          const brokerage = extractedData?.brokerageCertificate || {};
          const checks = [
            {
              label: "사업자등록증 상호명",
              matched: valuesMatch(expected.companyName, business.companyName),
            },
            {
              label: "사업자등록증 대표자명",
              matched: valuesMatch(expected.representative, business.representative),
            },
            {
              label: "사업자등록번호",
              matched: valuesMatch(expected.businessNumber, business.businessNumber, normalizeBusinessNumber),
            },
            {
              label: "개설등록증 상호명",
              matched: valuesMatch(expected.companyName, brokerage.companyName),
            },
            {
              label: "개설등록증 대표자명",
              matched: valuesMatch(expected.representative, brokerage.representative),
            },
            {
              label: "중개사무소 개설등록번호",
              matched: valuesMatch(expected.brokerageRegistrationNumber, brokerage.registrationNumber),
            },
          ];

          const mismatches = checks.filter((check) => !check.matched).map((check) => check.label);
          if (business.readable !== true) mismatches.unshift("사업자등록증 판독");
          if (brokerage.readable !== true) mismatches.unshift("중개사무소 개설등록증 판독");

          const usageMeta = json.usageMetadata;
          const usageInfo = usageMeta ? {
            inputTokens: usageMeta.promptTokenCount || 0,
            outputTokens: usageMeta.candidatesTokenCount || 0,
            totalTokens: usageMeta.totalTokenCount || 0,
          } : undefined;

          if (mismatches.length === 0) {
            return {
              status: "APPROVED",
              message: "두 서류의 핵심 정보가 모두 일치하여 자동 승인되었습니다.",
              usage: usageInfo,
            };
          }

          return {
            status: "NEEDS_REVIEW",
            message: `자동 확인이 어려운 항목: ${Array.from(new Set(mismatches)).join(", ")}`,
            diff: {
              expected,
              found: {
                businessCertificate: business,
                brokerageCertificate: brokerage,
              },
              mismatches: Array.from(new Set(mismatches)),
            },
            usage: usageInfo,
          };
        } catch (error: unknown) {
          lastError = errorMessage(error, "Gemini 호출 오류");
        }
      }

      return {
        status: "ERROR",
        message: `AI 서류 인식 실패: ${lastError}`,
      };
    } catch (error: unknown) {
      console.error("VerifyAgent realtor document error:", error);
      return {
        status: "ERROR",
        message: errorMessage(error, "AI 서류 인식 중 오류가 발생했습니다."),
      };
    }
  }

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
      const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3-flash-preview"];
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
          } catch {
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
        } catch (error: unknown) {
          lastError = errorMessage(error, "Gemini 호출 오류");
        }
      }

      return { status: "ERROR", message: `AI 서류 인식 실패: ${lastError}` };

    } catch (error: unknown) {
      console.error("VerifyAgent Execution Error:", error);
      return { status: "ERROR", message: errorMessage(error, "AI 서류 인식 중 오류가 발생했습니다.") };
    }
  }
}
