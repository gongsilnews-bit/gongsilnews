import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Supabase 관리자 클라이언트 (DB 직접 조회용)
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * DB(최고관리자 마케팅정보)에서 Gemini API Key를 가져와서 
 * GoogleGenerativeAI 클라이언트를 생성하여 반환합니다.
 */
export async function getGenAIClient(): Promise<GoogleGenerativeAI> {
  // 1. 기본값으로 환경변수 키를 먼저 할당
  let apiKey = process.env.GEMINI_API_KEY || "";

  try {
    const supabaseAdmin = getAdminClient();
    // 2. 최고관리자(gongsilnews@gmail.com)의 sns_links(마케팅정보) 조회
    const { data: adminUser, error } = await supabaseAdmin
      .from('members')
      .select('sns_links')
      .eq('email', 'gongsilnews@gmail.com')
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

  return new GoogleGenerativeAI(apiKey);
}
