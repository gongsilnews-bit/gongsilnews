import { createClient } from "@supabase/supabase-js";

// ── 최고관리자 이메일 ──
const ADMIN_EMAIL = "gongsilnews@gmail.com";

// Supabase 관리자 클라이언트 (DB 직접 조회용)
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * DB(최고관리자 마케팅정보)에서 Gemini API Key를 가져옵니다.
 */
export async function getGeminiApiKey(): Promise<string> {
  // 1. 기본값으로 환경변수 키를 먼저 할당
  let apiKey = process.env.GEMINI_API_KEY || "";

  try {
    const supabaseAdmin = getAdminClient();
    // 2. 최고관리자(gongsilnews@gmail.com)의 sns_links(마케팅정보) 조회
    const { data: adminUser, error } = await supabaseAdmin
      .from('members')
      .select('sns_links')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (!error && adminUser?.sns_links?.api_list) {
      const apiList = adminUser.sns_links.api_list;
      // 3. '구글 (Gemini)' 혹은 '구글'로 등록된 API 키 찾기
      const geminiApi = apiList.find((api: any) => 
        api.provider === "구글 (Gemini)" || api.provider === "구글"
      );
      
      if (geminiApi && geminiApi.key_value) {
        apiKey = geminiApi.key_value.trim();
      }
    }
  } catch (err) {
    console.error("DB에서 API Key를 가져오는데 실패했습니다.", err);
  }

  if (!apiKey) {
    console.warn("경고: GEMINI_API_KEY가 환경변수나 DB에 설정되지 않았습니다.");
    throw new Error("Gemini API Key가 설정되지 않았습니다. 관리자 페이지에서 설정해주세요.");
  }

  return apiKey;
}

/**
 * Gemini REST API를 직접 호출하여 텍스트를 생성합니다.
 * 폐기된 @google/generative-ai SDK 대신 네이티브 fetch를 사용합니다.
 */
export async function generateWithGemini(prompt: string, options?: { temperature?: number }): Promise<{
  text: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}> {
  const apiKey = await getGeminiApiKey();
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = "";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: options?.temperature ?? 0.7 }
        })
      });

      if (!response.ok) {
        const errRes = await response.json().catch(() => ({}));
        lastError = errRes?.error?.message || `${model} 모델 호출 실패 (${response.status})`;
        console.log(`[Core] Gemini model [${model}] failed: ${lastError}`);
        continue;
      }

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        lastError = "AI가 텍스트를 생성하지 못했습니다.";
        continue;
      }

      const usageMeta = json.usageMetadata;
      const usage = usageMeta ? {
        inputTokens: usageMeta.promptTokenCount || 0,
        outputTokens: usageMeta.candidatesTokenCount || 0,
        totalTokens: usageMeta.totalTokenCount || 0,
      } : undefined;

      console.log(`[Core] Success with Gemini model: ${model}`);
      return { text, usage };
    } catch (err: any) {
      lastError = err.message;
      console.log(`[Core] Gemini model [${model}] error: ${err.message}`);
    }
  }

  throw new Error(`Gemini API 호출 실패: ${lastError}`);
}
