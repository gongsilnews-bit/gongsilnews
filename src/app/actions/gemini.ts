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
당신은 대한민국 최고의 실력을 가진 전문 공인중개사이자 부동산 전문 카피라이터입니다. 
당신의 목표는 아래 제공되는 부동산 공실광고 데이터를 바탕으로, 고객의 마음을 사로잡을 수 있는 매력적이고 신뢰감 높은 '전달사항(상세 설명글)'을 완성하는 것입니다.
글자 수는 300~500자 내외로, 너무 짧거나 생략되지 않고 매물의 뛰어난 장점과 모든 특징들이 아주 자세하고 풍부하게 표현되도록 하십시오.

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
${data.realtorInfo ? `
[중개사(부동산) 홍보 정보]
- 상호명: ${data.realtorInfo.company || '미상'}
- 대표자: ${data.realtorInfo.boss || '미상'}
- 사무실번호: ${data.realtorInfo.tel || '미상'}
- 휴대전화: ${data.realtorInfo.cell || '미상'}
- 주소: ${data.realtorInfo.addr || '미상'}
` : ''}
[작성 지침]
1. 제목이나 말머리(예: "안녕하세요" 등) 없이 본문 상세 소개글 내용만 전문적으로 작성하세요.
2. 딱딱한 단순 정보의 나열이 아니라, 집의 장점을 감성적이면서도 신뢰를 주는 프리미엄 중개사 톤앤매너(해요체/하십시오체)로 정성스럽게 풀어 쓰십시오.
3. 매물의 핵심 특징(채광이 좋은 방향, 편리한 층수 위치, 면적의 개방감, 제공되는 주요 프리미엄 옵션, 편리한 주차 및 입주일)을 스토리가 있게 구성하세요.
4. 특히 '주변환경(인프라)' 데이터를 적극적으로 활용하여 역세권, 마트, 학교, 병원 등 실생활 편의성과 훌륭한 주거 가치를 매력적으로 극대화하여 문장으로 자세히 설명하십시오.
5. (필수) 만약 [중개사(부동산) 홍보 정보]가 제공되었다면, 글의 가장 마지막 부분(해시태그 바로 직전)에 해당 부동산을 홍보하고 연락을 유도하는 신뢰감 있는 클로징 멘트(콜투액션)를 한두 문장으로 자연스럽게 추가하십시오. (예: "저희 [상호명]은 언제나 정직과 신뢰를 바탕으로 최선을 다합니다. 궁금한 점이 있으시다면 언제든 [휴대전화 또는 사무실번호]로 편하게 연락 주십시오.")
6. 가장 마지막엔 매물의 대표적인 강점을 담은 트렌디한 부동산 해시태그(예: #더블역세권 #채광좋은집 #풀옵션공실 등)를 4~6개 내외로 추가해 주세요.
7. 글자 수가 너무 적어 매물의 훌륭한 특징들이 생략되지 않도록, 문단과 문장을 짜임새 있고 넉넉하고 풍성하게 채워주십시오.
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

        // 비용 로깅
        try {
          const um = json.usageMetadata;
          if (um) {
            const inT = um.promptTokenCount || 0;
            const outT = um.candidatesTokenCount || 0;
            const costKrw = (inT * 0.075 / 1000000 * 1400) + (outT * 0.3 / 1000000 * 1400);
            await supabaseAdmin.from("agent_chats").insert({
              channel_id: "propertyDescription",
              role: "agent",
              content: `[매물 설명 생성] ${data.propertyType || ''} ${data.tradeType || ''} - ${model}`,
              input_tokens: inT, output_tokens: outT, total_tokens: um.totalTokenCount || 0, cost_krw: costKrw,
            });
          }
        } catch (logErr) { console.log("비용 로깅 실패:", logErr); }

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
  customVacancyData?: {
    buildingName?: string;
    propertyType?: string;
    tradeType?: string;
    deposit?: number | string;
    monthlyRent?: number | string;
    exclusivePy?: number | string;
    supplyPy?: number | string;
    roomCount?: number | string;
    bathCount?: number | string;
    currentFloor?: number | string;
    totalFloor?: number | string;
    direction?: string;
    parking?: string;
    options?: string[];
    moveInDate?: string;
    address?: string;
    description?: string;
  };
  lengthType?: string;
  customLength?: number;
  styleType?: string;
  endingType?: string;
  layoutPattern?: string;
  image?: {
    data: string;
    mimeType: string;
  };
}) {
  try {
    const {
      memberId,
      vacancyId,
      sourceText,
      tone,
      audience,
      customVacancyData,
      lengthType,
      customLength,
      styleType,
      endingType,
      layoutPattern,
      image,
    } = params;

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

    // 2. 매물 정보 불러오기 (연동 또는 수동 입력)
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
    } else if (customVacancyData) {
      const cvd = customVacancyData;
      propertyMaterial = `
[직접 입력한 공실 매물 정보]
- 건물/단지명: ${cvd.buildingName || "미상"}
- 매물유형: ${cvd.propertyType || "미상"}
- 거래종류: ${cvd.tradeType || "미상"}
- 가격 정보: ${
        cvd.tradeType === "매매"
          ? `매매가 ${cvd.deposit || "협의"}만원`
          : cvd.tradeType === "전세"
          ? `전세가 ${cvd.deposit || "협의"}만원`
          : `보증금 ${cvd.deposit || "협의"}만원 / 월세 ${cvd.monthlyRent || "협의"}만원`
      }
- 면적: 전용 ${cvd.exclusivePy || "미상"}평 (공급 ${cvd.supplyPy || "미상"}평)
- 구조: 방 ${cvd.roomCount || "미상"}개 / 욕실 ${cvd.bathCount || "미상"}개
- 층수: 해당층 ${cvd.currentFloor || "미상"}층 / 전체층 ${cvd.totalFloor || "미상"}층
- 방향: ${cvd.direction || "미상"}
- 주차: ${cvd.parking || "미상"}
- 옵션 정보: ${cvd.options && cvd.options.length > 0 ? cvd.options.join(", ") : "없음"}
- 입주 가능일: ${cvd.moveInDate || "즉시입주 가능"}
- 매물 주소: ${cvd.address || "미상"}
- 특징 및 설명: ${cvd.description || "장점이 많은 로열 매물"}
`;
    }

    const materialText = `
${propertyMaterial}
${sourceText ? `[추가 참고 자료/원고]\n${sourceText}` : ""}
`;

    // 3. 전문가 수준 스타일 지침 빌드
    let styleInstructions = "";
    if (lengthType) {
      if (lengthType === "짧게") {
        styleInstructions += `\n- 글의 길이: 각 채널별 본문은 공백 포함 500자 내외로 핵심만 임팩트 있게 작성하십시오.`;
      } else if (lengthType === "보통") {
        styleInstructions += `\n- 글의 길이: 각 채널별 본문은 공백 포함 1000자 내외의 일반적인 분량으로 탄탄하게 작성하십시오.`;
      } else if (lengthType === "길게") {
        styleInstructions += `\n- 글의 길이: 각 채널별 본문은 공백 포함 1500자 내외의 상세하고 매우 풍부한 스토리 형식으로 길게 작성하십시오.`;
      } else if (lengthType === "직접입력" && customLength) {
        styleInstructions += `\n- 글의 길이: 각 채널별 본문은 공백 포함 약 ${customLength}자 내외로 상세하게 작성하십시오.`;
      }
    }

    if (styleType) {
      styleInstructions += `\n- 글쓰기 스타일: [${styleType}] 스타일에 깊이 있게 초점을 맞추어 단어 선정과 문장 구성을 프리미엄 수준으로 끌어올리십시오.`;
    }

    if (endingType) {
      styleInstructions += `\n- 말투/종결어미: 문장의 어미는 한국어 문법에 완벽하게 맞추어 [${endingType}] 말투를 철저하게 적용하십시오. (예: "하십시오체"일 경우 '-습니다, -합니다', "해요체"일 경우 '-해요, -입니다', "해라체/다체"일 경우 '-다, -한다'로 어미를 철저히 통일)`;
    }

    let layoutInstructions = "";
    if (layoutPattern === "standard") {
      layoutInstructions = `\n- 기사 구성 레이아웃 패턴: [패턴 1: 정통 보도기사형]으로 작성하십시오. 상단 매물 요약표나 중간 소제목(■) 없이 문단(Paragraph) 구분만으로 정중하고 유려한 연속 줄글 형식으로 작성해 주십시오.`;
    } else if (layoutPattern === "targeted") {
      layoutInstructions = `\n- 기사 구성 레이아웃 패턴: [패턴 3: 타깃 맞춤형 추천 기사]로 작성하십시오.
  1) 본문 가장 처음에 아래와 같은 매물 정보 요약표를 실제 데이터로 채워서 반드시 한 줄씩 삽입하십시오. (줄바꿈 포함)
  ■ 위치: [매물 건물명 및 동 위치 정보]
  ■ 가격: [매물 가격 정보]
  ■ 면적: [매물 면적 정보]
  ■ 특징: [매물의 핵심 특징 3~4가지]
  
  2) 주요 문단이나 소주제 흐름이 바뀔 때마다 '■ [소주제 제목]' 형태의 굵고 명확한 소제목 헤더를 반드시 개행과 함께 분할하여 작성해 주십시오. (예: '■ 화이트톤의 멋진 인테리어가 빛나는 아파트', '■ 매매가 17억 시세보다 저렴한 급매물' 등)
  
  3) 가장 중요한 점으로, 본문의 가장 마지막 문단(결론 부분)에 주어진 타깃 독자층([${audience}]) 또는 어필할 수 있는 고객군에게 맞춘 강력한 어필/추천 한 줄 요약 멘트를 '■ [소주제 제목]' 뒤에 꼭 감성적으로 덧붙여서 마무리해 주십시오.
  (예: '신혼부부에게 적합한 물건으로 강남에 직주근접을 위한 자영업자부터 전문직 종사자에게 추천할 수 있는 물건입니다.' 또는 '은퇴 후 쾌적하고 조용한 실거주 주택을 찾는 은퇴 세대에게 적극 추천하는 명품 매물입니다.')`;
    } else {
      // 기본값 또는 summary_header
      layoutInstructions = `\n- 기사 구성 레이아웃 패턴: [패턴 2: 요약 박스 + 소주제 분할형]으로 작성하십시오.
  1) 본문 가장 처음에 아래와 같은 매물 정보 요약표를 실제 데이터로 채워서 반드시 한 줄씩 삽입하십시오. (줄바꿈 포함)
  ■ 위치: [매물 건물명 및 동 위치 정보]
  ■ 가격: [매물 가격 정보]
  ■ 면적: [매물 면적 정보]
  ■ 특징: [매물의 핵심 특징 3~4가지]
  
  2) 그리고 본문의 주요 문단이나 소주제 흐름이 바뀔 때마다 '■ [소주제 제목]' 형태의 굵고 명확한 소제목 헤더를 반드시 개행과 함께 분할하여 작성해 주십시오. (예: '■ 화이트톤의 멋진 인테리어가 빛나는 아파트', '■ 매매가 17억 시세보다 저렴한 급매물' 등)`;
    }

    // 4. 마법 프롬프트 작성
    const systemInstruction = `너는 대한민국 최고의 부동산 마케팅 카피라이터이자 부동산 전문 기자야. 
주어진 매물 상세 데이터와 특징, 추가 참고 자료를 철저히 분석하여, 아래 지침에 맞춘 4가지 종류의 완성도 높은 프리미엄 홍보 콘텐츠를 풍부한 내용과 분량으로 일괄 생성해라.
각 채널에 들어가는 본문 글은 매물의 특징이 생략되거나 지나치게 축소되지 않도록 넉넉하고 짜임새 있는 문장 구성으로 풍성하게 작성하는 것이 가장 핵심 요구사항이다.

주어진 톤앤매너: [${tone}] (오피셜 칼럼, 친근한 대화체, 전문가 정보 제공 중 하나)
주어진 타깃 독자: [${audience}] (일반 매수자/세입자, 부동산 투자자, 동료 중개업자 중 하나)
${styleInstructions}
${layoutInstructions}

[JSON 포맷팅 절대 규칙]
1. 결과는 반드시 표준 JSON 스펙을 충족해야 하며 JSON.parse()로 즉시 파싱될 수 있어야 한다.
2. 모든 문자열 값 내부에 포함된 큰따옴표(")는 백슬래시를 사용해 반드시 이스케이프(\") 처리되어야 한다. (예: "그랑디오스 \\"ACROHILLS\\" 아파트" 형식)
3. 줄바꿈 문자는 절대로 문자열 내에 그대로 들어오면 안 되며, 반드시 이스케이프된 역슬래시 n(\\n)으로 표현되어야 한다.

[요구 채널 및 지침]
1. 기사 초안 (content_article): 실제 언론 보도에 나가도 손색이 없을 만큼 아주 정교하고 신뢰감 높은 뉴스 형식의 보도 기사이다. 매물의 장점, 주거 편의성, 교통 인프라, 그리고 해당 매물이 가지는 시장 가치 등을 논리정연하게 작성해야 한다. 제목과 부제목은 상위 필드("title", "subtitle")에 따로 분리해 넣고, 본문(최소 4~5문단 이상의 넉넉한 글 길이)만 마크다운 형식으로 여기에 상세하게 작성해라.
2. 블로그글 (content_blog): 네이버 또는 티스토리 블로그에 최적화된 마케팅 글이다. 독자들의 눈길을 끄는 흥미로운 소제목들을 이모지와 함께 사용하고, 집 내부 옵션, 동/호수 및 층수 조건, 주차 여부, 생활 편의시설 등 매물의 구체적인 장점(특징)을 하나하나 조근조근 친절히 풀어 설명해야 한다. 마지막엔 파급력 있는 네이버 블로그 해시태그 5~8개를 예쁘게 달아 풍성한 글 길이로 작성해라.
3. 쇼츠 대본 (content_shorts): 유튜브 쇼츠/인스타그램 릴스/틱톡용 약 50~60초 분량의 대본이다. 절대로 '[Visual]', '[Audio]' 또는 괄호 안에 동작 지문을 넣지 마라. 대신 오직 나레이터가 매끄럽고 신뢰감 있게 읽을 수 있는 고품격 뉴스 브리핑 톤의 나레이션 줄글(5~6줄 정도의 문장들, 각각 줄바꿈으로 분리)만으로 작성해라. 첫 줄은 시청자를 강하게 흡입하는 후킹 질문(예: '서울 강남 한복판, 논현동 아파트에 진입하려면 과연 얼마가 필요할까요?')으로 시작하고, 중간은 매물의 상세 스펙(가격, 평형, 특징)을 설명하고, 마지막은 시장 전망이나 추천으로 깔끔하게 끝맺는 형식이다.
4. SNS 피드 (content_sns): 인스타그램 피드, 페이스북, 또는 카카오톡 알림톡/메시지 전송용 본문이다. 첫 두 줄에 강렬한 후킹 문구를 담고, 매물의 주요 스펙과 혜택을 가독성 있게 기호(예: ✔, 📌)를 활용해 정리한 뒤, 마지막에 인스타그램 인기 태그들을 충분히 포함시켜라.

JSON 구조는 다음과 같아야 한다:
{
  "title": "실제 뉴스 헤드라인 느낌의 매력적이고 전문적인 기사 제목",
  "subtitle": "줄바꿈(\\n)으로 구분된 3줄의 간결한 부제목 (각 줄은 온점(.)이나 '합니다', '입니다' 종결어미 없이 명사/형용사 단답형으로 깔끔하게 종결할 것. 예: '강남 중심 논현동 최적의 교통망 입지\\n22평형의 쾌적한 남향 주거 환경\\n즉시 입주 가능한 신축 빌라 매물' 형식)",
  "content_article": "전문가 톤의 마크다운 기사 본문 (기사로서 충분한 글 길이와 문단 구성)",
  "content_blog": "소제목과 이모지가 포함된 풍성하고 친근한 마크다운 블로그 포스팅",
  "content_shorts": "오직 나레이션 대사로만 이루어진 5~6줄의 고품격 숏폼 대본 (각 줄은 줄바꿈(\\n)으로 확실하게 단락 구분하며, '[Visual]' 이나 '[Audio]' 같은 지시어 및 괄호는 절대 포함하지 말 것)",
  "content_sns": "후킹, 스펙 요약, 인스타 해시태그가 결합된 트렌디한 SNS 본문",
  "section2": "이 매물에 가장 적합한 2차섹션 이름 ('아파트/오피스텔', '빌라/주택', '원룸/투룸(풀옵션)', '상가/사무실/공장/토지', '신축/분양/경매' 중 단 하나를 한글 문자열로 정확히 선택)",
  "keywords": ["매물 종류, 주소지 동 이름, 건물명 등 검색 노출에 매우 유용한 최적의 포탈 검색 태그/키워드 10개 내외를 배열로 제공"]
}
`;

    // 5. API 직접 호출 (최신 모델 폴백)
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    const errors: string[] = [];
    let generatedRawText = "";

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const reqParts: any[] = [
          { text: systemInstruction },
          { text: `[마케팅 대상 자료]\n${materialText}` }
        ];

        if (image && image.data && image.mimeType) {
          reqParts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data
            }
          });
          reqParts.push({
            text: `[참고 이미지 제공]\n사용자가 첨부한 위 이미지를 상세히 판독하여 분석 정보에 반영하십시오. 이미지에서 포착할 수 있는 건축물 분위기, 상세 매물 특징, 인테리어 톤(예: 화이트톤, 우드톤 등), 경치/조경 뷰, 제공되는 옵션 등을 판독하여 기사, 블로그, 쇼츠 대본, SNS 피드 등에 적극 활용하여 사실감 있고 풍성하게 작성해 주십시오.`
          });
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: reqParts
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
          // 비용 로깅
          try {
            const um = json.usageMetadata;
            if (um) {
              const inT = um.promptTokenCount || 0;
              const outT = um.candidatesTokenCount || 0;
              const costKrw = (inT * 0.075 / 1000000 * 1400) + (outT * 0.3 / 1000000 * 1400);
              await supabaseAdmin.from("agent_chats").insert({
                channel_id: "marketingDraft",
                role: "agent",
                content: `[마케팅 초안 생성] ${tone} / ${audience} - ${model}`,
                input_tokens: inT, output_tokens: outT, total_tokens: um.totalTokenCount || 0, cost_krw: costKrw,
              });
            }
          } catch (logErr) { console.log("비용 로깅 실패:", logErr); }
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

