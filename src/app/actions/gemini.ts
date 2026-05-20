"use server";

import { createClient } from "@supabase/supabase-js";

// ── 최고관리자 이메일 (이 계정의 마케팅정보에 등록된 Gemini API Key를 공용으로 사용) ──
const ADMIN_EMAIL = "gongsilnews@gmail.com";

export async function generatePropertyDescription(data: any) {
  try {
    // 1. 보안이 적용된 관리자용 Supabase 클라이언트 초기화
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. 최고관리자(ADMIN_EMAIL)의 마케팅 정보에서 공용 Gemini API Key 가져오기
    const { data: adminData, error } = await supabaseAdmin
      .from("members")
      .select("sns_links")
      .eq("email", ADMIN_EMAIL)
      .single();

    if (error || !adminData) {
      console.error("최고관리자 계정을 찾을 수 없습니다:", error);
      return { success: false, error: "관리자 계정 정보를 불러올 수 없습니다." };
    }

    const apiList = adminData.sns_links?.api_list || [];
    const geminiApi = apiList.find((api: any) => api.provider === "구글" || api.provider === "구글 (Gemini)");

    if (!geminiApi || !geminiApi.key_value) {
      return { success: false, error: "AI 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요." };
    }

    const apiKey = geminiApi.key_value;

    // 3. Gemini 처리를 위한 프롬프트 가공
    const prompt = `
당신은 최고의 실력을 가진 전문 공인중개사 카피라이터입니다. 
당신의 목표는 아래 제공되는 부동산 공실광고 정보를 바탕으로, 고객의 마음을 사로잡을 수 있는 매력적이고 자연스러운 '전달사항(설명글)'을 작성하는 것입니다.

[공실광고 데이터]
- 공실광고유형: ${data.propertyType} (${data.subCategory})
- 거래종류: ${data.tradeType}
- 금액: 보증금/매매가 ${data.deposit}만원 ${data.monthly ? `, 월세 ${data.monthly}만원` : ''}
- 관리비: ${data.maintenance ? data.maintenance + "만원" : "없음"}
- 층수: 해당층 ${data.currentFloor}층 / 전체층 ${data.totalFloor}층
- 방향: ${data.direction || "미상"}
- 면적: 전용 ${data.exclusivePy}평 (공급 ${data.supplyPy}평)
- 구조: 방 ${data.roomCount}개 / 욕실 ${data.bathCount}개 (주거용인 경우)
- 옵션: ${data.selectedOptions?.join(", ") || "없음"}
- 주차: ${data.parking}
- 입주가능일: ${data.moveInDate}
- 인프라(주변환경): ${Object.entries(data.infrastructure || {}).map(([k, v]) => `${k} - ${(v as string[]).join(', ')}`).join(' | ')}

[작성 지침]
1. 제목이나 말머리 없이 본문 내용만 작성하세요.
2. 딱딱한 정보 나열이 아니라 감성적이고 전문적인 중개사 톤(해요체/하십시오체)으로 작성하세요.
3. 공실광고의 장점(뷰, 방향, 층수, 옵션, 주변 인프라 등)을 극대화하여 표현하세요.
4. 마지막엔 적절한 해시태그(예: #채광좋은방 #즉시입주 #더블역세권 등)를 3~5개 정도 예쁘게 달아주세요.
5. 너무 길지 않도록 핵심만 간결하게(약 4~5문장 내외) 정리하세요.
`;

    // 4. Gemini API 호출 (최신 모델부터 폴백)
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    const errors: string[] = [];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
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
        const generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
          errors.push(`[${model}] AI가 텍스트를 생성하지 못했습니다.`);
          continue;
        }

        console.log(`Success with Gemini model: ${model}!`);
        return { success: true, text: generatedText.trim() };
      } catch (err: any) {
        errors.push(`[${model}] ${err.message}`);
        console.log(`Gemini model [${model}] error: ${err.message}`);
      }
    }

    return { success: false, error: `AI 생성 실패: ${errors.join(" | ")}` };
  } catch (err: any) {
    console.error("generatePropertyDescription 오류:", err);
    return { success: false, error: "서버 내부 오류가 발생했습니다." };
  }
}
