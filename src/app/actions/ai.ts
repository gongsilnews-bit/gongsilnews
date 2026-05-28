"use server";

import { createClient } from "@supabase/supabase-js";

// ── 최고관리자 이메일 (이 계정의 마케팅정보에 등록된 Gemini API Key를 공용으로 사용) ──
const ADMIN_EMAIL = "gongsilnews@gmail.com";

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

    // 2. 최고관리자(ADMIN_EMAIL)의 마케팅 정보에서 공용 Gemini API Key 가져오기
    const { data: adminData, error: adminError } = await supabase.from('members')
      .select('sns_links')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (adminError || !adminData) {
      return { success: false, error: "관리자 계정 정보를 불러올 수 없습니다. 관리자에게 문의하세요." };
    }

    const apiList = adminData.sns_links?.api_list || [];
    const geminiApi = apiList.find((api: any) => api.provider === "구글" || api.provider === "구글 (Gemini)");
    
    if (!geminiApi || !geminiApi.key_value) {
      return { success: false, error: "AI 이미지 분석 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요." };
    }

    const apiKey = geminiApi.key_value;

    // 3. 공용 프롬프트 준비
    const prompt = `
너는 부동산 매물 정보 추출 전문 AI야.
이 사진은 부동산 매물 정보가 담긴 이미지야. 네이버부동산 캡처, 직방/다방 캡처, 전단지, 메신저 대화 캡처, 손글씨 메모 등 다양한 형태일 수 있어.
사진에 표시된 내용을 분석하여 공실 등록을 위해 필요한 아래 JSON 형식으로 반환해줘.

[중요 규칙]
1. 사진에 명시적으로 기재된 내용만 채워라. 주관적 해석 금지.
2. 알 수 없는 필드는 빈 문자열("")로 둬라.
3. 금액은 반드시 "만원" 단위 숫자만 기입해라. (예: 17억 → 170000, 5370만원 → 5370, 28만원 → 28)
4. 면적은 m² 숫자만 기입해라. 평이 주어지면 ×3.3058로 변환해라.
5. 마크다운(\`\`\`json ...) 없이 오직 순수 JSON 객체만 반환해라.

JSON 구조:
{
  "property_type": "아파트·오피스텔 | 빌라·주택 | 원룸·투룸(풀옵션) | 상가·사무실·건물·공장·토지 중 택 1",
  "trade_type": "매매 | 전세 | 월세 | 단기 중 택 1",
  "sale_price": "매매가 (만원 단위 숫자만. 예: 170000)",
  "deposit": "보증금/전세금 (만원 단위 숫자만. 예: 2000)",
  "monthly_rent": "월세 (만원 단위 숫자만. 예: 50)",
  "maintenance_fee": "관리비 (만원 단위 숫자만. 예: 28)",
  "current_floor": "해당층 (숫자 또는 '중층' 등. 예: 3)",
  "total_floor": "전체층 (숫자. 예: 11)",
  "room_count": "방 개수 (숫자만. 예: 3)",
  "bath_count": "욕실 개수 (숫자만. 예: 2)",
  "supply_m2": "공급면적 m² (숫자만. 예: 104.67)",
  "exclusive_m2": "전용면적 m² (숫자만. 예: 83.7)",
  "direction": "방향 (남향, 동향 등. 예: 동향)",
  "building_name": "건물명/단지명 (예: 논현한화꿈에그린2차)",
  "address": "주소 (시/도, 시/군/구, 동/읍/면 등 최대한 상세하게)",
  "description": "매물의 특징 및 장점을 2~3문장으로 요약 작성"
}`;

    // 4. REST API 직접 호출 (폐기된 SDK 대신 네이티브 fetch 사용)
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    const errors: string[] = [];
    let parsedData = null;

    for (const model of models) {
      try {
        console.log(`Trying Gemini model: ${model}...`);
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
          const errMsg = errRes?.error?.message || `${model} 모델 호출 실패 (${response.status})`;
          errors.push(`[${model}] ${errMsg}`);
          console.log(`Gemini model [${model}] failed: ${errMsg}`);
          continue;
        }

        const json = await response.json();
        const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
          errors.push(`[${model}] AI가 텍스트를 생성하지 못했습니다.`);
          continue;
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
          console.log(`Success with Gemini model: ${model}!`);

          // 비용 로깅
          try {
            const um = json.usageMetadata;
            if (um) {
              const inT = um.promptTokenCount || 0;
              const outT = um.candidatesTokenCount || 0;
              const costKrw = (inT * 0.075 / 1000000 * 1400) + (outT * 0.3 / 1000000 * 1400);
              await supabase.from("agent_chats").insert({
                channel_id: "imageExtract",
                role: "agent",
                content: `[이미지 매물 추출] ${parsedData.property_type || ''} ${parsedData.building_name || ''} - ${model}`,
                input_tokens: inT, output_tokens: outT, total_tokens: um.totalTokenCount || 0, cost_krw: costKrw,
              });
            }
          } catch (logErr) { console.log("비용 로깅 실패:", logErr); }

          break;
        } else {
          errors.push(`[${model}] AI가 유효한 JSON을 반환하지 않았습니다.`);
        }
      } catch (err: any) {
        console.log(`Gemini model [${model}] error: ${err.message}`);
        errors.push(`[${model}] ${err.message}`);
      }
    }

    if (!parsedData) {
      return { success: false, error: errors.join(" | ") };
    }

    return {
      success: true,
      data: parsedData
    };
  } catch (error: any) {
    console.error("Gemini Image Parsing Error:", error);
    return { success: false, error: error.message };
  }
}
