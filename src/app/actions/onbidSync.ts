"use server";

import { createClient } from "@supabase/supabase-js";

// Supabase 어드민 클라이언트 생성 헬퍼
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// 주소 ➡️ 경위도 좌표 변환 (카카오 로컬 API 기반 개발, 브이월드 폴백 포함)
async function getCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // 1. 카카오 로컬 API 시도
    const kakaoRestKey = process.env.KAKAO_REST_API_KEY || process.env.KAKAO_REST_KEY || process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
    if (kakaoRestKey) {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
        {
          headers: { Authorization: `KakaoAK ${kakaoRestKey}` }
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          const doc = data.documents[0];
          return {
            lat: parseFloat(doc.y),
            lng: parseFloat(doc.x)
          };
        }
      }
    }

    // 2. 브이월드(정부 공공 무료 API) 폴백 시도
    const vworldKey = process.env.VWORLD_API_KEY || "7CD204D5-0BDC-360B-8833-D66D5DF31CD9"; // 공용 테스트 키 또는 사용자 등록 키
    const vworldRes = await fetch(
      `https://api.vworld.kr/req/address?service=address&request=getcoord&key=${vworldKey}&address=${encodeURIComponent(
        address
      )}&type=ROAD`
    );
    if (vworldRes.ok) {
      const vdata = await vworldRes.json();
      if (vdata.response?.status === "OK" && vdata.response?.result?.point) {
        const pt = vdata.response.result.point;
        return {
          lat: parseFloat(pt.y),
          lng: parseFloat(pt.x)
        };
      }
    }
  } catch (error) {
    console.error("좌표 변환 중 에러 발생:", error);
  }
  return null;
}

// 주소 해체 헬퍼 (시도, 시군구, 동 단위 자동 추출)
function parseAddress(fullAddress: string) {
  const parts = fullAddress.split(/\s+/);
  return {
    sido: parts[0] || "",
    sigungu: parts[1] || "",
    dong: parts[2] || "",
    detail_addr: parts.slice(3).join(" ") || ""
  };
}

// 온비드 물건 용도를 공실뉴스 카테고리로 안전 매핑
function mapPropertyType(onbidCategory: string): string {
  const cat = onbidCategory || "";
  if (cat.includes("아파트") || cat.includes("오피스텔") || cat.includes("주상복합")) {
    return "아파트·오피스텔";
  }
  if (cat.includes("주택") || cat.includes("빌라") || cat.includes("다세대") || cat.includes("단독")) {
    return "빌라·주택";
  }
  if (cat.includes("원룸") || cat.includes("투룸")) {
    return "원룸·투룸(풀옵션)";
  }
  return "상가·사무실·건물·공장·토지"; // 기본 폴백값
}

// 날짜 문자열 포맷 헬퍼 (예: 202606011000 -> 2026-06-01 10:00)
function formatOnbidDate(dtStr: string): string {
  if (!dtStr || dtStr.length < 8) return dtStr || "";
  const y = dtStr.substring(0, 4);
  const m = dtStr.substring(4, 6);
  const d = dtStr.substring(6, 8);
  const h = dtStr.substring(8, 10) || "00";
  const min = dtStr.substring(10, 12) || "00";
  return `${y}-${m}-${d} ${h}:${min}`;
}

/**
 * 🤖 온비드 공매 API 동기화 에이전트 핵심 함수
 * 매일 새벽 스케줄러에 의해 무인 자동 호출됩니다.
 */
export async function syncOnbidProperties() {
  const supabase = getAdminClient();
  const serviceKey = process.env.ONBID_API_KEY;

  if (!serviceKey) {
    console.error("❌ ONBID_API_KEY 환경변수가 설정되지 않아 온비드 연동을 건너뜁니다.");
    return { success: false, error: "API Key missing" };
  }

  try {
    // 1. 공공데이터포털 온비드 차세대 부동산 API 호출 (5개 페이지를 루프 돌며 총 500건 수집하여 풍부한 데이터 적재)
    // prptDivCd=0007,0005: 압류재산(법원공매) + 수탁/일반재산 혼합 수집
    const items: any[] = [];
    for (let pageNo = 1; pageNo <= 5; pageNo++) {
      const url = `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=100&pageNo=${pageNo}&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N`;
      try {
        const res = await fetch(url, { next: { revalidate: 0 } });
        if (res.ok) {
          const data = await res.json();
          const pageItems = data.body?.items?.item || data.body?.items || [];
          if (Array.isArray(pageItems)) {
            items.push(...pageItems);
          } else if (pageItems && typeof pageItems === 'object') {
            // 단일 객체일 경우 배열에 삽입
            items.push(pageItems);
          }
        }
      } catch (err) {
        console.error(`온비드 API pageNo=${pageNo} 호출 중 에러 발생:`, err);
      }
    }

    if (items.length === 0) {
      return { success: true, message: "가져올 신규 온비드 물건이 없습니다." };
    }

    let successCount = 0;
    let skipCount = 0;

    // 1.5. DB에서 유효한 관리자(ADMIN) ID를 조회하는 중...
    let ownerId = "00000000-0000-0000-0000-000000000000";
    const { data: adminUser } = await supabase
      .from("members")
      .select("id")
      .eq("email", "gongsilnews@gmail.com")
      .maybeSingle();

    if (adminUser) {
      ownerId = adminUser.id;
    } else {
      const { data: anyAdmin } = await supabase
        .from("members")
        .select("id")
        .eq("role", "SUPER_ADMIN")
        .limit(1)
        .maybeSingle();
      
      if (anyAdmin) {
        ownerId = anyAdmin.id;
      } else {
        const { data: anyUser } = await supabase
          .from("members")
          .select("id")
          .limit(1)
          .maybeSingle();
        
        if (anyUser) {
          ownerId = anyUser.id;
        }
      }
    }

    // 2. 루프 돌며 DB 적재 자동화
    for (const item of items) {
      const onbidId = String(item.onbidCltrno || ""); // 온비드 고유 물건번호
      const propertyName = item.onbidCltrNm || ""; // 물건명
      
      // 주소 추출 (onbidCltrNm에서 건물 종류 용어 앞부분만 파싱하여 안전하게 도로명/지번 주소 확보)
      let address = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
      if (propertyName) {
        const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
        if (addrMatch && addrMatch[1]) {
          address = addrMatch[1].trim();
        }
      }
      
      if (!address || !onbidId) {
        skipCount++;
        continue;
      }

      // 중복 체크: 이미 동일한 온비드 ID가 description에 포함되어 있거나 주소/이름이 같은 경우 건너뜀
      const { data: existing } = await supabase
        .from("vacancies")
        .select("id")
        .or(`description.like.%${onbidId}%,detail_addr.eq.${address}`)
        .limit(1);

      if (existing && existing.length > 0) {
        skipCount++;
        continue;
      }

      // 3. 지오코더를 이용해 실시간 좌표(lat, lng) 획득
      const coords = await getCoordinates(address);
      if (!coords) {
        // 지도에 표출할 수 없는 주소는 노이즈 제거 차원에서 생략
        skipCount++;
        continue;
      }

      // 4. 주소 분해 및 물건 타입 매핑
      const parsedAddr = parseAddress(address);
      const propertyType = mapPropertyType(item.cltrUsgMclsCtgrNm || item.cltrUsgLclsCtgrNm);
      
      // 가격 파싱 (공실뉴스 DB 규격인 만원 단위로 정밀 변환)
      const deposit = Math.round(parseInt(item.lowstBidPrcIndctCont || "0", 10) / 10000); // 최저입찰가 (만원)
      const appraisalPrice = Math.round(parseInt(item.apslEvlAmt || "0", 10) / 10000); // 감정평가액 (만원)

      const bidStart = formatOnbidDate(item.cltrBidBgngDt);
      const bidEnd = formatOnbidDate(item.cltrBidEndDt);

      // 설명란에 AI 스타일의 권리관계 설명 및 온비드 고유키 내장
      const description = `[📢 온비드 공매 추천 매물]
* 공고번호: ${item.cltrMngNo || "정보 없음"}
* 물건번호 (온비드 고유 ID): ${onbidId}
* 감정평가액: ${(appraisalPrice * 10000).toLocaleString()}원
* 최저입찰가격: ${(deposit * 10000).toLocaleString()}원
* 입찰 기간: ${bidStart} ~ ${bidEnd}

본 매물은 한국자산관리공사(KAMCO)에서 진행하는 공식 공매 물건입니다. 
인터넷 입찰은 온비드 사이트에서 입찰 기간 내에 직접 참여하실 수 있습니다. 
주변 시세 대비 압도적으로 합리적인 최저가로 내 집 마련 또는 투자 기회를 선점하세요!`;

      // 5. 공실 DB에 다이렉트 insert 처리
      const insertData = {
        owner_id: ownerId, // 조회된 관리자 또는 회원 ID 연동
        owner_role: "ADMIN",
        property_type: propertyType,
        trade_type: "경매", // 사장님 지침에 따라 '경매' 카테고리로 연동
        deposit: deposit,
        monthly_rent: 0,
        maintenance_fee: 0,
        sido: parsedAddr.sido,
        sigungu: parsedAddr.sigungu,
        dong: parsedAddr.dong,
        detail_addr: parsedAddr.detail_addr,
        building_name: propertyName,
        lat: coords.lat,
        lng: coords.lng,
        description: description,
        status: "ACTIVE", // 100% 무인 자동 노출
        address_exposure: "지번공개",
        move_in_date: "즉시입주",
        consent: true
      };

      const { error: insertErr } = await supabase
        .from("vacancies")
        .insert(insertData);

      if (insertErr) {
        console.error(`온비드 물건(${propertyName}) 저장 오류:`, insertErr.message);
        skipCount++;
      } else {
        successCount++;
      }
    }

    console.log(`🤖 온비드 동기화 완료! [성공: ${successCount}건, 생략/중복: ${skipCount}건]`);
    return { success: true, registered: successCount, skipped: skipCount };
  } catch (error: any) {
    console.error("❌ 온비드 연동 실행 에러:", error);
    return { success: false, error: error.message };
  }
}
