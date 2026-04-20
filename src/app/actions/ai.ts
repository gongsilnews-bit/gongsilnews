"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function extractPropertyInfoFromImage(base64Data: string, mimeType: string, ownerId: string) {
  try {
    const supabase = getAdminClient();
    
    // 1. ownerId 확인
    if (!ownerId) {
      return { success: false, error: "인증 정보(ownerId)가 부족합니다." };
    }

    // 2. 사용자의 마케팅 정보에서 API Key 찾기
    const { data: memberData, error: memberError } = await supabase.from('members')
      .select('sns_links')
      .eq('id', ownerId)
      .single();

    if (memberError || !memberData) {
      return { success: false, error: "회원 정보를 찾을 수 없습니다." };
    }

    const apiList = memberData.sns_links?.api_list || [];
    const geminiApi = apiList.find((api: any) => api.provider === "구글" || api.provider === "구글 (Gemini)");
    
    if (!geminiApi || !geminiApi.key_value) {
      return { success: false, error: "구글(Gemini) API Key가 설정되지 않았습니다. 내 정보 > 마케팅정보 설정을 확인해주세요." };
    }

    const apiKey = geminiApi.key_value;

    // 3. 사용 가능한 모델 자동 탐색 (404 오류 방지)
    let modelName = "gemini-1.5-flash"; // 기본값
    try {
      const modelsRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey);
      if (modelsRes.ok) {
        const modelsJson = await modelsRes.json();
        if (modelsJson.models) {
          const names = modelsJson.models.map((m: any) => m.name);
          console.log("=== Available Gemini Models ===", names);
          
          let picked = false;
          if (names.includes("models/gemini-2.0-flash-exp")) { modelName = "gemini-2.0-flash-exp"; picked = true; }
          else if (names.includes("models/gemini-2.0-flash")) { modelName = "gemini-2.0-flash"; picked = true; }
          else if (names.includes("models/gemini-1.5-flash")) { modelName = "gemini-1.5-flash"; picked = true; }
          else if (names.includes("models/gemini-1.5-flash-latest")) { modelName = "gemini-1.5-flash-latest"; picked = true; }
          else if (names.includes("models/gemini-1.5-pro")) { modelName = "gemini-1.5-pro"; picked = true; }
          else if (names.includes("models/gemini-1.5-pro-latest")) { modelName = "gemini-1.5-pro-latest"; picked = true; }
          else if (names.includes("models/gemini-pro-vision")) { modelName = "gemini-pro-vision"; picked = true; }
          
          if (!picked && modelsJson.models.length > 0) {
            const fallback = modelsJson.models.find((m: any) => 
               m.supportedGenerationMethods?.includes("generateContent") && 
               (m.name.includes("flash") || m.name.includes("pro"))
            ) || modelsJson.models.find((m: any) => m.supportedGenerationMethods?.includes("generateContent"));
            
            if (fallback) {
              modelName = fallback.name.replace("models/", "");
            }
          }
        }
      }
    } catch(e) { 
      console.error("Error fetching Gemini models list", e); 
    }

    console.log("Selected Gemini Model:", modelName);

    // 4. Gemini 연동
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
이 사진은 부동산 매물을 홍보하는 전단지 또는 메신저 캡처본입니다.
사진에 표시된 내용을 분석하여 공실 등록을 위해 필요한 아래의 형식(JSON)으로 반환해주세요. 
주관적인 해석을 넣지 말고 사진에 기재된 명시적인 내용만 채워주세요. 알 수 없는 필드는 빈 문자열("")로 둡니다.
마크다운(\`\`\`json ...) 없이 오직 JSON 객체만 반환하세요.

JSON 구조:
{
  "property_type": "아파트·오피스텔, 빌라·주택, 원룸·투룸(풀옵션), 상가·사무실·건물·공장·토지 중 택 1",
  "trade_type": "매매, 전세, 월세, 단기 중 택 1",
  "deposit": "보증금 금액 (단위: 만원, 숫자만. 예: 2000)",
  "monthly_rent": "월세 (단위: 만원, 숫자만. 예: 50)",
  "maintenance_fee": "관리비 (단위: 만원, 숫자만. 예: 10)",
  "current_floor": "해당층 (숫자. 예: 3)",
  "total_floor": "전체층 (숫자. 예: 5)",
  "room_count": "방 개수 (숫자만, 예: 2)",
  "bath_count": "욕실 개수 (숫자만, 예: 1)",
  "supply_m2": "공급면적 (숫자, 평이 주어지면 3.3을 곱해 m²로)",
  "exclusive_m2": "전용면적 (숫자, 평이 주어지면 3.3을 곱해 m²로)",
  "description": "매물의 특징 및 장점을 자유롭게 작성 (2~3문장)"
}`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    // JSON 문자열 파싱 (안전 처리)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(responseText);
      return { success: false, error: "분석된 응답 형식을 처리할 수 없습니다." };
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      data: parsedData
    };
  } catch (error: any) {
    console.error("Gemini Image Parsing Error:", error);
    return { success: false, error: error.message };
  }
}
