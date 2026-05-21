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

// ── AI 초안 마법사: 멀티채널 마케팅 콘텐츠 일괄 생성 서버 액션 ──
export async function generateMarketingDrafts(params: {
  memberId: string;
  vacancyId?: string;
  sourceText?: string;
  tone: string;
  audience: string;
}) {
  try {
    const { memberId, vacancyId, sourceText, tone, audience } = params;
    if (!memberId) {
      return { success: false, error: "회원 정보가 유효하지 않습니다." };
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. 최고관리자 공용 Gemini API Key 가져오기
    const { data: adminData, error: adminErr } = await supabaseAdmin
      .from("members")
      .select("sns_links")
      .eq("email", ADMIN_EMAIL)
      .single();

    if (adminErr || !adminData) {
      return { success: false, error: "공용 AI 설정을 찾을 수 없습니다." };
    }

    const apiList = adminData.sns_links?.api_list || [];
    const geminiApi = apiList.find((api: any) => api.provider === "구글" || api.provider === "구글 (Gemini)");
    if (!geminiApi || !geminiApi.key_value) {
      return { success: false, error: "Gemini API 키가 구성되지 않았습니다." };
    }
    const apiKey = geminiApi.key_value;

    // 2. 매물 정보 불러오기 (선택 시)
    let propertyMaterial = "";
    if (vacancyId) {
      const { data: vacancy, error: vacErr } = await supabaseAdmin
        .from("vacancies")
        .select("*")
        .eq("id", vacancyId)
        .single();

      if (vacErr || !vacancy) {
        return { success: false, error: "매물 정보를 찾을 수 없습니다." };
      }

      propertyMaterial = `
[연동된 공실 매물 정보]
- 건물/단지명: ${vacancy.building_name || "미상"} (${vacancy.apt_dong || ""}동 ${vacancy.hosu || ""}호)
- 매물유형: ${vacancy.property_type || "미상"} (${vacancy.sub_category || "미상"})
- 거래종류: ${vacancy.trade_type || "미상"}
- 가격 정보: ${
        vacancy.trade_type === "매매"
          ? `매매가 ${vacancy.deposit || "협의"}만원`
          : vacancy.trade_type === "전세"
          ? `전세가 ${vacancy.deposit || "협의"}만원`
          : `보증금 ${vacancy.deposit || "협의"}만원 / 월세 ${vacancy.monthly_rent || "협의"}만원`
      }
- 관리비: ${vacancy.maintenance_fee ? `${vacancy.maintenance_fee}만원` : "없음"}
- 면적: 전용 ${vacancy.exclusive_py || vacancy.exclusive_m2 || "미상"}평 (공급 ${vacancy.supply_py || vacancy.supply_m2 || "미상"}평)
- 구조: 방 ${vacancy.room_count || "미상"}개 / 욕실 ${vacancy.bath_count || "미상"}개
- 층수: 해당층 ${vacancy.current_floor || "미상"}층 / 전체층 ${vacancy.total_floor || "미상"}층
- 방향: ${vacancy.direction || "미상"}
- 주차: ${vacancy.parking || "미상"}
- 옵션 정보: ${vacancy.options ? vacancy.options.join(", ") : "없음"}
- 입주 가능일: ${vacancy.moveInDate || "즉시입주 가능"}
- 매물 주소: ${vacancy.sido || ""} ${vacancy.sigungu || ""} ${vacancy.dong || ""} ${vacancy.detail_addr || ""}
- 특징 및 설명: ${vacancy.description || "장점이 많은 로열 매물"}
`;
    }

    const materialText = `
${propertyMaterial}
${sourceText ? `[추가 참고 자료/원고]\n${sourceText}` : ""}
`;

    // 3. 마법 프롬프트 작성
    const systemInstruction = `너는 최고의 실력을 가진 부동산 마케팅 카피라이터이자 부동산 전문 기자야. 
주어진 자료를 바탕으로 아래 지침에 맞는 4가지 종류의 홍보 콘텐츠를 일괄 생성해라.

주어진 톤앤매너: [${tone}] (오피셜 칼럼, 친근한 대화체, 전문가 정보 제공 중 하나)
주어진 타깃 독자: [${audience}] (일반 매수자/세입자, 부동산 투자자, 동료 중개업자 중 하나)

[JSON 포맷팅 절대 규칙]
1. 결과는 반드시 표준 JSON 스펙을 충족해야 하며 JSON.parse()로 즉시 파싱될 수 있어야 한다.
2. 모든 문자열 값 내부에 포함된 큰따옴표(")는 백슬래시를 사용해 반드시 이스케이프(\") 처리되어야 한다. (예: "그랑디오스 \\"ACROHILLS\\" 아파트" 형식)
3. 줄바꿈 문자는 절대로 문자열 내에 그대로 들어오면 안 되며, 반드시 이스케이프된 역슬래시 n(\\n)으로 표현되어야 한다.

[요구 채널 및 지침]
1. 기사 초안 (content_article): 객관적이고 신뢰감 높은 뉴스 형식의 보도 기사. 제목과 부제목은 상위 필드("title", "subtitle")에 따로 넣고 본문(최소 3~4문단)만 마크다운으로 여기에 작성해라.
2. 블로그글 (content_blog): 네이버 블로그에 적합하게 이모지와 소제목을 적절히 사용한 친밀하고 상세한 정보성 포스팅 원고. 마지막엔 핵심 태그 3~5개를 달아라.
3. 쇼츠 대본 (content_shorts): 유튜브 쇼츠/릴스용 약 40~50초 분량의 대본. 영상 화면 구성 지문(Visual)과 나레이션 대사(Audio)를 타임라인별로 한눈에 보게 구성해라.
4. SNS 피드 (content_sns): 인스타그램이나 카카오톡 채널 메시지 전송용 해시태그를 포함한 짧고 강렬한 본문(약 3~4문장).

JSON 구조는 다음과 같아야 한다:
{
  "title": "기사 헤드라인 제목",
  "subtitle": "기사 요약 부제목",
  "content_article": "뉴스 기사 본문 (마크다운 형식)",
  "content_blog": "블로그 포스팅 본문 (마크다운 형식)",
  "content_shorts": "쇼츠 대본 본문 (줄글 또는 타임라인)",
  "content_sns": "SNS/카카오톡 전송용 본문"
}
`;

    // 4. API 직접 호출 (최신 모델 폴백)
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    const errors: string[] = [];
    let generatedRawText = "";

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemInstruction },
                  { text: `[마케팅 대상 자료]\n${materialText}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errRes = await response.json().catch(() => ({}));
          errors.push(`[${model}] ${errRes?.error?.message || response.status}`);
          continue;
        }

        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          generatedRawText = text;
          break;
        }
      } catch (err: any) {
        errors.push(`[${model}] ${err.message}`);
      }
    }

    if (!generatedRawText) {
      return { success: false, error: `AI 생성에 실패했습니다: ${errors.join(" | ")}` };
    }

    // 마크다운 백틱 가드 제거 후 JSON 파싱
    let cleanJsonStr = generatedRawText.trim();
    if (cleanJsonStr.includes("```")) {
      const startIdx = cleanJsonStr.indexOf("{");
      const endIdx = cleanJsonStr.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJsonStr = cleanJsonStr.substring(startIdx, endIdx + 1);
      }
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cleanJsonStr);
    } catch (parseErr: any) {
      console.warn("JSON.parse primary failed, attempting escape repair...", parseErr);
      try {
        // 줄바꿈이나 이스케이프 문자 복구 시도
        let repaired = cleanJsonStr;
        repaired = repaired.replace(/[\r\n]+/g, "\\n");
        repaired = repaired
          .replace(/{\\n/g, "{\n")
          .replace(/}\\n/g, "\n}")
          .replace(/",\\n/g, '",\n')
          .replace(/:\\n/g, ":\n")
          .replace(/\\n\s*"/g, '\n  "');

        parsedData = JSON.parse(repaired);
      } catch (secondErr: any) {
        console.error("JSON repair parsing failed:", secondErr);
        throw new Error(`AI의 JSON 출력 구조가 올바르지 않습니다. 다시 한 번 생성을 시도해 주세요. (${parseErr.message})`);
      }
    }

    return {
      success: true,
      data: parsedData
    };
  } catch (err: any) {
    console.error("generateMarketingDrafts 오류:", err);
    return { success: false, error: `오류가 발생했습니다: ${err.message}` };
  }
}

// ── AI 초안 마법사: Supabase DB 저장 서버 액션 ──
export async function saveAiDraft(draft: {
  member_id: string;
  vacancy_id?: string;
  source_type: "VACANCY" | "NEWS" | "MANUAL";
  original_source?: string;
  title: string;
  subtitle: string;
  content_article: string;
  content_blog: string;
  content_shorts: string;
  content_sns: string;
  image_urls?: string[];
}) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("ai_drafts")
      .insert([
        {
          member_id: draft.member_id,
          vacancy_id: draft.vacancy_id || null,
          source_type: draft.source_type,
          original_source: draft.original_source || "",
          title: draft.title,
          subtitle: draft.subtitle,
          content_article: draft.content_article,
          content_blog: draft.content_blog,
          content_shorts: draft.content_shorts,
          content_sns: draft.content_sns,
          image_urls: draft.image_urls || [],
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error("saveAiDraft 오류:", err);
    return { success: false, error: err.message };
  }
}

// ── AI 초안 마법사: Supabase DB 히스토리 로드 서버 액션 ──
export async function getAiDraftHistory(memberId: string) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("ai_drafts")
      .select("*, vacancies(building_name, sido, sigungu, dong)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error("getAiDraftHistory 오류:", err);
    return { success: false, error: err.message };
  }
}

