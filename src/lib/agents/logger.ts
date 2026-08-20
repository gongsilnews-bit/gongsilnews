import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface LogAiUsageParams {
  channelId: string; // "article" | "photoCuration" | "remodeling" | "homeInterior" | "studio" | "marketingDraft" | "verify" | "articleReview" | "propertyDescription" | "imageExtract" | "onbid"
  userEmail?: string; // "gongsilnews@gmail.com" | user email | "SYSTEM (자동 크론)"
  userName?: string;
  summary: string; // e.g. '[기사 작성] "서울 신축 18억 시대..."'
  model?: string; // "gemini-3.6-flash" | "gemini-3.1-flash-image"
  type?: "text" | "image";
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  imageCount?: number;
  costKrw?: number;
}

/**
 * 모든 AI API(텍스트 생성, 나노바나나, 리모델링, 인테리어 등) 호출 내역과 크레딧 소모를 
 * 최고관리자 AI비서실에 실시간으로 기록합니다.
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  try {
    const supabase = getAdminClient();
    if (!supabase) return;

    const userEmail = params.userEmail || "gongsilnews@gmail.com";
    const model = params.model || "gemini-3.6-flash";
    const type = params.type || "text";

    let calculatedCost = params.costKrw;
    let inputTokens = params.inputTokens || 0;
    let outputTokens = params.outputTokens || 0;
    let totalTokens = params.totalTokens || (inputTokens + outputTokens);

    if (calculatedCost === undefined || calculatedCost === null) {
      if (type === "image") {
        // 이미지 생성: 장당 약 ₩40.00 (Gemini Imagen 표준 단가)
        const count = params.imageCount || 1;
        calculatedCost = count * 40.0;
        inputTokens = 0;
        outputTokens = 0;
        totalTokens = count; // 이미지 장수를 토큰 필드에 보관
      } else {
        // 텍스트 토큰: 입력 1M당 $0.15, 출력 1M당 $0.60 (환율 1380원 기준)
        const costUsd = (inputTokens * 0.00000015) + (outputTokens * 0.0000006);
        calculatedCost = Math.round(costUsd * 1380 * 100) / 100;
        if (calculatedCost === 0 && totalTokens > 0) calculatedCost = 0.01;
      }
    }

    // 사용자 정보와 작업 요약을 결합한 규격화된 로그 문자열
    // 형식: [user@email] [기능명] 작업요약 - 모델명 (타입)
    const content = `[${userEmail}] ${params.summary} - ${model}${type === "image" ? " (이미지)" : ""}`;

    await supabase.from("agent_chats").insert({
      channel_id: params.channelId,
      role: "agent",
      content: content,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_krw: calculatedCost,
    });

    console.log(`[AI Logger] ⚡ Logged: channel=${params.channelId}, user=${userEmail}, cost=₩${calculatedCost}`);
  } catch (err: any) {
    console.error("[AI Logger] Failed to log AI usage:", err.message);
  }
}
