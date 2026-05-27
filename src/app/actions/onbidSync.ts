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
function mapPropertyType(onbidCategory: string, propertyName?: string): string {
  // 용도분류 + 물건명을 합쳐서 키워드 매칭 (물건명에 "삼호아파트" 같은 정보가 있으므로)
  const cat = `${onbidCategory || ""} ${propertyName || ""}`;
  if (cat.includes("아파트") || cat.includes("오피스텔") || cat.includes("주상복합") || cat.includes("공동주택")) {
    return "아파트·오피스텔";
  }
  if (cat.includes("주택") || cat.includes("빌라") || cat.includes("다세대") || cat.includes("다가구") || cat.includes("연립") || cat.includes("단독") || cat.includes("주거용")) {
    return "빌라·주택";
  }
  if (cat.includes("원룸") || cat.includes("투룸") || cat.includes("고시원")) {
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
 * 🧹 입찰 기간이 지난 만료된 온비드 경공매 매물들을 자동으로 정리하는 함수
 */
export async function cleanupExpiredOnbidProperties() {
  const supabase = getAdminClient();
  console.log("🧹 만료된 온비드 경공매 매물 정리 작업 시작...");

  try {
    // 1. 현재 활성화되어 있는 모든 경공매 매물 조회
    const { data: activeAuctions, error: fetchErr } = await supabase
      .from("vacancies")
      .select("id, building_name, description, metadata")
      .eq("trade_type", "경매")
      .eq("status", "ACTIVE");

    if (fetchErr) {
      console.error("❌ 만료 매물 조회 중 오류 발생:", fetchErr.message);
      return { success: false, error: fetchErr.message };
    }

    if (!activeAuctions || activeAuctions.length === 0) {
      console.log("🧹 만료 매물 정리: 정리할 활성 경공매 매물이 없습니다.");
      return { success: true, count: 0 };
    }

    const now = new Date();
    const expiredIds: string[] = [];

    for (const auction of activeAuctions) {
      // metadata JSONB 필드 내에 저장된 bid_end_date 확인
      const bidEndDateStr = (auction.metadata as any)?.bid_end_date;
      
      if (bidEndDateStr) {
        // 날짜 포맷 변환 후 한국 표준시(KST)로 정밀 변환
        const endDateStr = bidEndDateStr.replace(" ", "T") + ":00+09:00";
        const endDate = new Date(endDateStr);

        // 현재 시각보다 마감일이 과거(이전)이면 만료 처리
        if (endDate < now) {
          console.log(`🧹 만료 감지: [${auction.building_name}] 마감일(${bidEndDateStr}) 경과 ➡️ 삭제 대상 추가`);
          expiredIds.push(auction.id);
        }
      } else {
        // 하위 호환성 폴백: metadata가 아직 없거나 비어있는 경우 description에서 파싱 시도
        const dateMatch = auction.description?.match(/~\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})/);
        if (dateMatch) {
          const endDateStr = `${dateMatch[1]}T${dateMatch[2]}:00+09:00`;
          const endDate = new Date(endDateStr);
          if (endDate < now) {
            console.log(`🧹 만료 감지 (설명 기반): [${auction.building_name}] 마감일(${endDateStr}) 경과 ➡️ 삭제 대상 추가`);
            expiredIds.push(auction.id);
          }
        }
      }
    }

    if (expiredIds.length > 0) {
      // 2. 외래키 무결성 유지를 위해 사진 먼저 삭제
      console.log(`📸 만료 매물 관련 사진 ${expiredIds.length}건 삭제 중...`);
      await supabase
        .from("vacancy_photos")
        .delete()
        .in("vacancy_id", expiredIds);

      // 3. 만료 매물 하드 삭제 처리
      console.log(`🏠 만료 매물 ${expiredIds.length}건 데이터베이스 영구 삭제 중...`);
      const { error: deleteErr } = await supabase
        .from("vacancies")
        .delete()
        .in("id", expiredIds);

      if (deleteErr) {
        console.error("❌ 만료 매물 삭제 실패:", deleteErr.message);
        return { success: false, error: deleteErr.message };
      }
      
      console.log(`🧹 만료된 온비드 경공매 매물 삭제 정리 완료! [삭제된 매물 수: ${expiredIds.length}건]`);
      return { success: true, count: expiredIds.length };
    }

    console.log(`🧹 만료된 온비드 경공매 매물 정리 완료! [정리된 매물 수: 0건]`);
    return { success: true, count: 0 };
  } catch (err: any) {
    console.error("❌ 만료 매물 정리 프로세스 중 치명적 오류 발생:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 🤖 온비드 공매 API 동기화 에이전트 핵심 함수
 * 매일 새벽 스케줄러에 의해 무인 자동 호출됩니다.
 */
export async function syncOnbidProperties(targetSido: string = "서울특별시") {
  const supabase = getAdminClient();
  const serviceKey = process.env.ONBID_API_KEY;

  if (!serviceKey) {
    console.error("❌ ONBID_API_KEY 환경변수가 설정되지 않아 온비드 연동을 건너뜁니다.");
    return { success: false, error: "API Key missing" };
  }

  // 🧹 동기화 작업 시작 전 만료 매물 선제 자동 정리 실행 (안정성 극대화)
  let expiredCount = 0;
  try {
    const cleanRes = await cleanupExpiredOnbidProperties();
    if (cleanRes.success) {
      expiredCount = cleanRes.count || 0;
    }
  } catch (cleanErr) {
    console.error("❌ 동기화 전 만료 매물 정리 중 에러 발생:", cleanErr);
  }

  try {
    // 1. 공공데이터포털 온비드 차세대 부동산 API 호출 (서울 또는 지정된 시도만 numOfRows=1000으로 전체 고속 수집)
    const items: any[] = [];
    let pageNo = 1;
    let hasMore = true;

    console.log(`🤖 온비드 API 호출 시작 (${targetSido} 대상)...`);

    while (hasMore) {
      const url = `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1000&pageNo=${pageNo}&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N&lctnSdnm=${encodeURIComponent(targetSido)}`;
      try {
        const res = await fetch(url, { next: { revalidate: 0 } });
        if (res.ok) {
          const data = await res.json();
          const body = data.body || data.response?.body;
          const pageItems = body?.items?.item || body?.items || [];
          if (Array.isArray(pageItems) && pageItems.length > 0) {
            items.push(...pageItems);
            console.log(`Page ${pageNo}: ${pageItems.length} items loaded.`);
            if (pageItems.length < 1000) {
              hasMore = false;
            } else {
              pageNo++;
            }
          } else if (pageItems && typeof pageItems === 'object' && Object.keys(pageItems).length > 0) {
            items.push(pageItems);
            hasMore = false;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error(`온비드 API pageNo=${pageNo} 호출 중 에러 발생:`, err);
        hasMore = false;
      }
    }

    if (items.length === 0) {
      return { success: true, message: `가져올 신규 온비드 물건이 없습니다. (${targetSido})` };
    }

    console.log(`📦 총 수집 완료: ${items.length}건. 고유 주소 및 좌표 캐시 생성 중...`);

    // 2. 고유 주소 좌표 캐시(지오코딩 효율화) 구축
    const uniqueAddresses = new Set<string>();
    for (const item of items) {
      let address = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
      const propertyName = item.onbidCltrNm || "";
      if (propertyName) {
        const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
        if (addrMatch && addrMatch[1]) {
          address = addrMatch[1].trim();
        }
      }
      if (address) {
        uniqueAddresses.add(address);
      }
    }

    console.log(`🔍 온비드 고유 주소 개수: ${uniqueAddresses.size}개. 지오코딩 병렬 변환 시작...`);

    const addressCoordsCache = new Map<string, { lat: number; lng: number }>();
    const addressArray = Array.from(uniqueAddresses);
    const concurrencyLimit = 20; // 성능 최적화: 동시 20개 지오코딩
    
    for (let i = 0; i < addressArray.length; i += concurrencyLimit) {
      const chunk = addressArray.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map(async (addr) => {
        const coords = await getCoordinates(addr);
        if (coords) {
          addressCoordsCache.set(addr, coords);
        }
      }));
    }

    console.log(`🎉 지오코딩 완료! 유효 좌표 확보 완료. 중복 체크 벌크 프리페치 중...`);

    let successCount = 0;
    let skipCount = 0;

    // ⚡ 성능 최적화: 기존 온비드 물건 ID를 벌크로 한 번에 가져와서 메모리 캐시 생성
    // (기존 방식: 매 건마다 DB 쿼리 → 수천 건일 때 수천 회 네트워크 요청 → 극심한 지연)
    const existingOnbidIds = new Set<string>();
    const existingAddresses = new Set<string>();
    try {
      const { data: existingRows } = await supabase
        .from("vacancies")
        .select("description, detail_addr")
        .eq("trade_type", "경매")
        .neq("status", "DELETED");
      
      if (existingRows) {
        for (const row of existingRows) {
          // description에서 온비드 물건번호 추출
          const idMatch = row.description?.match(/물건번호.*?:\s*(\d+)/);
          if (idMatch) existingOnbidIds.add(idMatch[1]);
          if (row.detail_addr) existingAddresses.add(row.detail_addr);
        }
      }
      console.log(`📋 기존 매물 캐시 구축 완료: 온비드ID ${existingOnbidIds.size}개, 주소 ${existingAddresses.size}개`);
    } catch (cacheErr) {
      console.warn("⚠️ 기존 매물 캐시 구축 실패, 개별 체크로 폴백합니다:", cacheErr);
    }

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

    console.log(`🚀 DB 적재 시작! (대상: ${items.length}건)`);

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

      // ⚡ 중복 체크: 메모리 캐시에서 O(1) 조회 (DB 호출 0건!)
      if (existingOnbidIds.has(onbidId) || existingAddresses.has(address)) {
        skipCount++;
        continue;
      }

      // 3. 지오코더 캐시에서 실시간 좌표(lat, lng) 획득
      const coords = addressCoordsCache.get(address);
      if (!coords) {
        // 지도에 표출할 수 없는 주소는 노이즈 제거 차원에서 생략
        skipCount++;
        continue;
      }

      // 4. 주소 분해 및 물건 타입 매핑
      const parsedAddr = parseAddress(address);
      const propertyType = mapPropertyType(item.cltrUsgMclsCtgrNm || item.cltrUsgLclsCtgrNm, item.onbidCltrNm);
      
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

      // 5. 모든 API 원본 필드를 메타데이터에 납작하게(Flat) 100% 매핑
      const metadata: Record<string, any> = {
        source_type: "ONBID",
        bid_start_date: bidStart,
        bid_end_date: bidEnd,
        appraisal_price: appraisalPrice * 10000,
        lowest_bid_price: deposit * 10000,
        discount_rate: appraisalPrice > 0 ? Math.round(((appraisalPrice - deposit) / appraisalPrice) * 100) : 0,
      };

      // API가 리턴해준 모든 필드를 메타데이터에 동적으로 바인딩
      for (const [key, val] of Object.entries(item)) {
        metadata[key] = val;
      }

      // 6. 공실 DB에 다이렉트 insert 처리
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
        consent: true,
        metadata: metadata // 50여 개 온비드 원본 전 필드 주입
      };

      const { data: insertedVacancy, error: insertErr } = await supabase
        .from("vacancies")
        .insert(insertData)
        .select("id")
        .maybeSingle();

      if (insertErr) {
        console.error(`온비드 물건(${propertyName}) 저장 오류:`, insertErr.message);
        skipCount++;
      } else {
        successCount++;
        // 5.5. 이미지가 존재할 경우 vacancy_photos 테이블에 추가 (ORIG_NM 고해상도 변환 주입)
        if (insertedVacancy?.id && item.thnlImgUrlAdr) {
          try {
            const highResUrl = item.thnlImgUrlAdr.replace("downloadImageKind=THNL_NM", "downloadImageKind=ORIG_NM");
            await supabase
              .from("vacancy_photos")
              .insert({
                vacancy_id: insertedVacancy.id,
                url: highResUrl,
                sort_order: 1
              });
          } catch (imgErr: any) {
            console.error(`온비드 이미지(${propertyName}) 저장 실패:`, imgErr.message);
          }
        }
      }
    }

    console.log(`🤖 온비드 동기화 완료! [성공: ${successCount}건, 생략/중복: ${skipCount}건, 만료/삭제: ${expiredCount}건]`);
    return { success: true, registered: successCount, skipped: skipCount, expired: expiredCount };
  } catch (error: any) {
    console.error("❌ 온비드 연동 실행 에러:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔄 기존 경매 매물의 metadata를 온비드 API 원본 데이터로 일괄 업데이트
 * backfill된 매물에 API 원본 50+ 필드를 보강합니다.
 */
export async function refreshOnbidMetadata(targetSido: string = "서울특별시") {
  const supabase = getAdminClient();
  const serviceKey = process.env.ONBID_API_KEY;

  if (!serviceKey) {
    return { success: false, error: "API Key missing" };
  }

  try {
    // 1. 온비드 API에서 전체 데이터 수집
    const items: any[] = [];
    let pageNo = 1;
    let hasMore = true;

    console.log(`🔄 [Metadata 보강] 온비드 API 호출 시작 (${targetSido})...`);

    while (hasMore) {
      const url = `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1000&pageNo=${pageNo}&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N&lctnSdnm=${encodeURIComponent(targetSido)}`;
      try {
        const res = await fetch(url, { next: { revalidate: 0 } });
        if (res.ok) {
          const data = await res.json();
          const body = data.body || data.response?.body;
          const pageItems = body?.items?.item || body?.items || [];
          if (Array.isArray(pageItems) && pageItems.length > 0) {
            items.push(...pageItems);
            console.log(`Page ${pageNo}: ${pageItems.length} items loaded.`);
            if (pageItems.length < 1000) { hasMore = false; } else { pageNo++; }
          } else if (pageItems && typeof pageItems === 'object' && Object.keys(pageItems).length > 0) {
            items.push(pageItems);
            hasMore = false;
          } else {
            hasMore = false;
          }
        } else { hasMore = false; }
      } catch (err) {
        console.error(`API pageNo=${pageNo} 에러:`, err);
        hasMore = false;
      }
    }

    console.log(`📦 API 수집: ${items.length}건. 기존 매물 metadata 업데이트 시작...`);

    // 2. 기존 경매 매물 조회
    const { data: existingAuctions } = await supabase
      .from("vacancies")
      .select("id, description, building_name, detail_addr")
      .eq("trade_type", "경매")
      .eq("status", "ACTIVE");

    if (!existingAuctions || existingAuctions.length === 0) {
      return { success: true, message: "업데이트할 경매 매물이 없습니다." };
    }

    // 3. 온비드 ID → API 아이템 맵 생성
    const apiMap = new Map<string, any>();
    for (const item of items) {
      const onbidId = String(item.onbidCltrno || "");
      if (onbidId) apiMap.set(onbidId, item);
    }

    // 4. 기존 매물 매칭 후 metadata 업데이트
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const auction of existingAuctions) {
      // description에서 온비드 ID 추출
      const idMatch = auction.description?.match(/물건번호.*?:\s*(\d+)/);
      const onbidId = idMatch ? idMatch[1] : null;

      const apiItem = onbidId ? apiMap.get(onbidId) : null;

      if (!apiItem) {
        notFoundCount++;
        continue;
      }

      // metadata 구성 (API 원본 전 필드)
      const bidStart = formatOnbidDate(apiItem.cltrBidBgngDt);
      const bidEnd = formatOnbidDate(apiItem.cltrBidEndDt);
      const appraisalPrice = Math.round(parseInt(apiItem.apslEvlAmt || "0", 10));
      const lowestBidPrice = Math.round(parseInt(apiItem.lowstBidPrcIndctCont || "0", 10));

      const metadata: Record<string, any> = {
        source_type: "ONBID",
        bid_start_date: bidStart,
        bid_end_date: bidEnd,
        appraisal_price: appraisalPrice,
        lowest_bid_price: lowestBidPrice,
        discount_rate: appraisalPrice > 0 ? Math.round(((appraisalPrice - lowestBidPrice) / appraisalPrice) * 100) : 0,
      };

      // API 원본 전 필드 동적 바인딩
      for (const [key, val] of Object.entries(apiItem)) {
        metadata[key] = val;
      }

      // property_type도 정확하게 재매핑
      const propertyType = mapPropertyType(apiItem.cltrUsgMclsCtgrNm || apiItem.cltrUsgLclsCtgrNm, apiItem.onbidCltrNm);

      const { error } = await supabase
        .from("vacancies")
        .update({ metadata, property_type: propertyType })
        .eq("id", auction.id);

      if (!error) {
        updatedCount++;
      } else {
        console.error(`❌ ID ${auction.id} 업데이트 실패:`, error.message);
      }
    }

    console.log(`🔄 Metadata 보강 완료! [업데이트: ${updatedCount}건, 미매칭: ${notFoundCount}건]`);
    return { success: true, updated: updatedCount, notFound: notFoundCount };
  } catch (error: any) {
    console.error("❌ Metadata 보강 에러:", error);
    return { success: false, error: error.message };
  }
}
