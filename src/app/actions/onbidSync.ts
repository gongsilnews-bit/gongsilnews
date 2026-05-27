"use server";

import { createClient } from "@supabase/supabase-js";

// ─── 헬퍼 함수들 ───────────────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// 주소 → 좌표 변환 (카카오 → 브이월드 폴백)
async function getCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const kakaoRestKey = process.env.KAKAO_REST_API_KEY || process.env.KAKAO_REST_KEY || process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
    if (kakaoRestKey) {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
        { headers: { Authorization: `KakaoAK ${kakaoRestKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.documents?.length > 0) {
          return { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x) };
        }
      }
    }
    const vworldKey = process.env.VWORLD_API_KEY || "7CD204D5-0BDC-360B-8833-D66D5DF31CD9";
    const vworldRes = await fetch(
      `https://api.vworld.kr/req/address?service=address&request=getcoord&key=${vworldKey}&address=${encodeURIComponent(address)}&type=ROAD`
    );
    if (vworldRes.ok) {
      const vdata = await vworldRes.json();
      if (vdata.response?.status === "OK" && vdata.response?.result?.point) {
        return { lat: parseFloat(vdata.response.result.point.y), lng: parseFloat(vdata.response.result.point.x) };
      }
    }
  } catch (error) {
    console.error("좌표 변환 에러:", error);
  }
  return null;
}

function normalizeSido(sido: string | null): string {
  if (!sido) return "";
  const clean = sido.trim();
  if (clean === "충청북도" || clean === "충북") return "충북";
  if (clean === "충청남도" || clean === "충남") return "충남";
  if (clean === "전라북도" || clean === "전북" || clean === "전북특별자치도") return "전북";
  if (clean === "전라남도" || clean === "전남") return "전남";
  if (clean === "경상북도" || clean === "경북") return "경북";
  if (clean === "경상남도" || clean === "경남") return "경남";
  if (clean === "강원특별자치도" || clean === "강원도" || clean === "강원") return "강원";
  if (clean === "제주특별자치도" || clean === "제주도" || clean === "제주") return "제주";
  return clean.substring(0, 2);
}

function parseAddress(fullAddress: string) {
  const parts = fullAddress.split(/\s+/);
  return { sido: parts[0] || "", sigungu: parts[1] || "", dong: parts[2] || "", detail_addr: parts.slice(3).join(" ") || "" };
}

function mapPropertyType(onbidCategory: string, propertyName?: string): string {
  const cat = `${onbidCategory || ""} ${propertyName || ""}`;
  if (cat.includes("아파트") || cat.includes("오피스텔") || cat.includes("주상복합") || cat.includes("공동주택")) return "아파트·오피스텔";
  if (cat.includes("주택") || cat.includes("빌라") || cat.includes("다세대") || cat.includes("다가구") || cat.includes("연립") || cat.includes("단독") || cat.includes("주거용")) return "빌라·주택";
  if (cat.includes("원룸") || cat.includes("투룸") || cat.includes("고시원")) return "원룸·투룸(풀옵션)";
  return "상가·사무실·건물·공장·토지";
}

function formatOnbidDate(dtStr: string): string {
  if (!dtStr || dtStr.length < 8) return dtStr || "";
  return `${dtStr.substring(0, 4)}-${dtStr.substring(4, 6)}-${dtStr.substring(6, 8)} ${dtStr.substring(8, 10) || "00"}:${dtStr.substring(10, 12) || "00"}`;
}

// ─── 온비드 API 호출 ─────────────────────────────────────────

async function fetchOnbidItems(serviceKey: string, targetSido: string): Promise<any[]> {
  const items: any[] = [];
  let pageNo = 1;
  let hasMore = true;

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
          hasMore = pageItems.length >= 1000;
          pageNo++;
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
  return items;
}

// ─── 관리자 ID 조회 ──────────────────────────────────────────

async function getAdminOwnerId(supabase: any): Promise<string> {
  const { data: admin } = await supabase.from("members").select("id").eq("email", "gongsilnews@gmail.com").maybeSingle();
  if (admin) return admin.id;
  const { data: superAdmin } = await supabase.from("members").select("id").eq("role", "SUPER_ADMIN").limit(1).maybeSingle();
  if (superAdmin) return superAdmin.id;
  const { data: anyUser } = await supabase.from("members").select("id").limit(1).maybeSingle();
  return anyUser?.id || "00000000-0000-0000-0000-000000000000";
}

// ─── 메인: UPSERT 기반 동기화 엔진 (v2) ────────────────────────

/**
 * 🤖 온비드 공매 UPSERT 동기화 엔진 v2
 * 
 * 핵심 원칙: "온비드 API = 유일한 진실" (Single Source of Truth)
 * - API에 있으면 → DB에 추가 또는 업데이트
 * - API에 없으면 → DB에서 삭제
 * - 같은 공고번호(cltrMngNo)의 물건은 1건만 유지
 */
export async function syncOnbidProperties(targetSido: string = "서울특별시") {
  const supabase = getAdminClient();
  const serviceKey = process.env.ONBID_API_KEY;

  if (!serviceKey) {
    console.error("❌ ONBID_API_KEY 환경변수 누락");
    return { success: false, error: "API Key missing" };
  }

  const startTime = Date.now();
  console.log(`🤖 [v2] 온비드 UPSERT 동기화 시작 (${targetSido})`);

  try {
    // ═══ 1단계: 온비드 API에서 현재 유효 물건 전체 수집 ═══
    const apiItems = await fetchOnbidItems(serviceKey, targetSido);
    
    if (apiItems.length === 0) {
      console.log(`📦 ${targetSido}: API에서 가져올 물건이 없습니다.`);
      return { success: true, inserted: 0, updated: 0, deleted: 0, skipped: 0 };
    }
    console.log(`📦 API 수집: ${apiItems.length}건`);

    // ═══ 2단계: API 물건을 공고번호(cltrMngNo) 기준으로 중복 제거 ═══
    // 같은 공고번호에 여러 입찰 회차가 있으면 → 가장 최근 입찰일 것만 유지
    const apiMap = new Map<string, any>();
    for (const item of apiItems) {
      const mngNo = String(item.cltrMngNo || "").trim();
      if (!mngNo) continue;
      
      const existing = apiMap.get(mngNo);
      if (!existing) {
        apiMap.set(mngNo, item);
      } else {
        // 입찰 종료일이 더 최근인 것을 유지
        const existEnd = existing.cltrBidEndDt || "";
        const newEnd = item.cltrBidEndDt || "";
        if (newEnd > existEnd) {
          apiMap.set(mngNo, item);
        }
      }
    }
    console.log(`📋 공고번호 기준 고유 물건: ${apiMap.size}건 (API ${apiItems.length}건 → 중복 제거)`);

    const { data: dbRows } = await supabase
      .from("vacancies")
      .select("id, metadata, lat, lng, building_name, detail_addr")
      .eq("trade_type", "경매")
      .eq("sido", normalizeSido(targetSido))
      .eq("status", "ACTIVE");

    // DB의 공고번호 → vacancy ID 맵 구축
    const dbMap = new Map<string, { id: string; lat: number; lng: number }>();
    const dbMngNos = new Set<string>();
    
    if (dbRows) {
      for (const row of dbRows) {
        const mngNo = (row.metadata as any)?.cltrMngNo;
        if (mngNo) {
          dbMap.set(String(mngNo), { id: row.id, lat: row.lat, lng: row.lng });
          dbMngNos.add(String(mngNo));
        }
      }
    }
    console.log(`📋 DB 기존 매물: ${dbMap.size}건 (공고번호 보유)`);

    // sido 필터 보정 (DB에서 sido 컬럼이 "서울" vs "서울특별시" 등 차이 대응)
    // 공고번호가 없는 레거시 매물도 조회
    if (dbMap.size === 0 && dbRows && dbRows.length === 0) {
      // sido 컬럼이 다를 수 있으므로 trade_type=경매 전체에서 metadata.cltrMngNo로 재조회
      const { data: allAuctions } = await supabase
        .from("vacancies")
        .select("id, metadata, lat, lng, sido")
        .eq("trade_type", "경매")
        .eq("status", "ACTIVE");
      
      if (allAuctions) {
        for (const row of allAuctions) {
          const mngNo = (row.metadata as any)?.cltrMngNo;
          if (mngNo) {
            dbMap.set(String(mngNo), { id: row.id, lat: row.lat, lng: row.lng });
            dbMngNos.add(String(mngNo));
          }
        }
        console.log(`📋 (폴백) 전체 경매 매물에서 공고번호 ${dbMap.size}건 확보`);
      }
    }

    // ═══ 4단계: INSERT / UPDATE 분류 ═══
    const toInsert: any[] = [];  // 신규 (DB에 없는 공고번호)
    const toUpdate: any[] = [];  // 기존 (DB에 있는 공고번호 → 가격/일자 업데이트)
    
    for (const [mngNo, item] of apiMap.entries()) {
      if (dbMap.has(mngNo)) {
        toUpdate.push({ mngNo, item, dbRecord: dbMap.get(mngNo)! });
      } else {
        toInsert.push({ mngNo, item });
      }
    }

    // API에 없는데 DB에 있는 것 → 삭제 대상
    const apiMngNos = new Set(apiMap.keys());
    const toDelete: string[] = [];
    for (const mngNo of dbMngNos) {
      if (!apiMngNos.has(mngNo)) {
        const dbRecord = dbMap.get(mngNo);
        if (dbRecord) toDelete.push(dbRecord.id);
      }
    }

    console.log(`🔍 분류 완료: 신규 ${toInsert.length}건, 업데이트 ${toUpdate.length}건, 삭제 ${toDelete.length}건`);

    // ═══ 5단계: 신규 매물 지오코딩 (신규만!) ═══
    const newAddresses = new Map<string, string>(); // address → mngNo
    for (const { item } of toInsert) {
      let address = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
      const propertyName = item.onbidCltrNm || "";
      if (propertyName) {
        const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
        if (addrMatch?.[1]) address = addrMatch[1].trim();
      }
      if (address) newAddresses.set(address, address);
    }

    const coordsCache = new Map<string, { lat: number; lng: number }>();
    if (newAddresses.size > 0) {
      console.log(`📍 신규 ${newAddresses.size}개 주소 지오코딩 시작...`);
      const addrArray = Array.from(newAddresses.keys());
      for (let i = 0; i < addrArray.length; i += 20) {
        const chunk = addrArray.slice(i, i + 20);
        await Promise.all(chunk.map(async (addr) => {
          const coords = await getCoordinates(addr);
          if (coords) coordsCache.set(addr, coords);
        }));
      }
      console.log(`📍 지오코딩 완료: ${coordsCache.size}/${addrArray.length}개 좌표 확보`);
    }

    // ═══ 6단계: 관리자 ID 확보 ═══
    const ownerId = await getAdminOwnerId(supabase);

    // ═══ 7단계: INSERT (신규 매물 등록) ═══
    let insertedCount = 0;
    let skippedCount = 0;

    for (const { mngNo, item } of toInsert) {
      const propertyName = item.onbidCltrNm || "";
      let address = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
      if (propertyName) {
        const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
        if (addrMatch?.[1]) address = addrMatch[1].trim();
      }

      const coords = coordsCache.get(address);
      if (!coords) { skippedCount++; continue; }

      const parsedAddr = parseAddress(address);
      const propertyType = mapPropertyType(item.cltrUsgMclsCtgrNm || item.cltrUsgLclsCtgrNm, propertyName);
      const deposit = Math.round(parseInt(item.lowstBidPrcIndctCont || "0", 10) / 10000);
      const appraisalPrice = Math.round(parseInt(item.apslEvlAmt || "0", 10) / 10000);
      const bidStart = formatOnbidDate(item.cltrBidBgngDt);
      const bidEnd = formatOnbidDate(item.cltrBidEndDt);

      const description = `[📢 온비드 공매 추천 매물]
* 공고번호: ${mngNo}
* 물건번호 (온비드 고유 ID): ${item.onbidCltrno || ""}
* 감정평가액: ${(appraisalPrice * 10000).toLocaleString()}원
* 최저입찰가격: ${(deposit * 10000).toLocaleString()}원
* 입찰 기간: ${bidStart} ~ ${bidEnd}

본 매물은 한국자산관리공사(KAMCO)에서 진행하는 공식 공매 물건입니다. 
인터넷 입찰은 온비드 사이트에서 입찰 기간 내에 직접 참여하실 수 있습니다. 
주변 시세 대비 압도적으로 합리적인 최저가로 내 집 마련 또는 투자 기회를 선점하세요!`;

      const metadata: Record<string, any> = {
        source_type: "ONBID",
        cltrMngNo: mngNo, // ⭐ UPSERT 고유 키
        bid_start_date: bidStart,
        bid_end_date: bidEnd,
        appraisal_price: appraisalPrice * 10000,
        lowest_bid_price: deposit * 10000,
        discount_rate: appraisalPrice > 0 ? Math.round(((appraisalPrice - deposit) / appraisalPrice) * 100) : 0,
      };
      for (const [key, val] of Object.entries(item)) { metadata[key] = val; }

      const { data: inserted, error: insertErr } = await supabase.from("vacancies").insert({
        owner_id: ownerId, owner_role: "ADMIN", property_type: propertyType, trade_type: "경매",
        deposit, monthly_rent: 0, maintenance_fee: 0,
        sido: parsedAddr.sido, sigungu: parsedAddr.sigungu, dong: parsedAddr.dong, detail_addr: parsedAddr.detail_addr,
        building_name: propertyName, lat: coords.lat, lng: coords.lng,
        description, status: "ACTIVE", address_exposure: "지번공개", move_in_date: "즉시입주", consent: true,
        metadata
      }).select("id").maybeSingle();

      if (insertErr) {
        console.error(`INSERT 실패(${propertyName}):`, insertErr.message);
        skippedCount++;
      } else {
        insertedCount++;
        // 이미지 등록
        if (inserted?.id && item.thnlImgUrlAdr) {
          try {
            const highResUrl = item.thnlImgUrlAdr.replace("downloadImageKind=THNL_NM", "downloadImageKind=ORIG_NM");
            await supabase.from("vacancy_photos").insert({ vacancy_id: inserted.id, url: highResUrl, sort_order: 1 });
          } catch {}
        }
      }
    }

    // ═══ 8단계: UPDATE (기존 매물 가격/입찰일 갱신) ═══
    let updatedCount = 0;

    for (const { mngNo, item, dbRecord } of toUpdate) {
      const deposit = Math.round(parseInt(item.lowstBidPrcIndctCont || "0", 10) / 10000);
      const appraisalPrice = Math.round(parseInt(item.apslEvlAmt || "0", 10) / 10000);
      const bidStart = formatOnbidDate(item.cltrBidBgngDt);
      const bidEnd = formatOnbidDate(item.cltrBidEndDt);
      const propertyType = mapPropertyType(item.cltrUsgMclsCtgrNm || item.cltrUsgLclsCtgrNm, item.onbidCltrNm);

      const metadata: Record<string, any> = {
        source_type: "ONBID",
        cltrMngNo: mngNo,
        bid_start_date: bidStart,
        bid_end_date: bidEnd,
        appraisal_price: appraisalPrice * 10000,
        lowest_bid_price: deposit * 10000,
        discount_rate: appraisalPrice > 0 ? Math.round(((appraisalPrice - deposit) / appraisalPrice) * 100) : 0,
      };
      for (const [key, val] of Object.entries(item)) { metadata[key] = val; }

      const description = `[📢 온비드 공매 추천 매물]
* 공고번호: ${mngNo}
* 물건번호 (온비드 고유 ID): ${item.onbidCltrno || ""}
* 감정평가액: ${(appraisalPrice * 10000).toLocaleString()}원
* 최저입찰가격: ${(deposit * 10000).toLocaleString()}원
* 입찰 기간: ${bidStart} ~ ${bidEnd}

본 매물은 한국자산관리공사(KAMCO)에서 진행하는 공식 공매 물건입니다. 
인터넷 입찰은 온비드 사이트에서 입찰 기간 내에 직접 참여하실 수 있습니다. 
주변 시세 대비 압도적으로 합리적인 최저가로 내 집 마련 또는 투자 기회를 선점하세요!`;

      const { error } = await supabase.from("vacancies")
        .update({ deposit, metadata, description, property_type: propertyType })
        .eq("id", dbRecord.id);

      if (!error) updatedCount++;
    }

    // ═══ 9단계: DELETE (API에 없는 매물 삭제) ═══
    let deletedCount = 0;

    if (toDelete.length > 0) {
      // 사진 먼저 삭제
      await supabase.from("vacancy_photos").delete().in("vacancy_id", toDelete);
      const { error: delErr } = await supabase.from("vacancies").delete().in("id", toDelete);
      if (!delErr) {
        deletedCount = toDelete.length;
      } else {
        console.error("삭제 오류:", delErr.message);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🤖 [v2] ${targetSido} 동기화 완료! (${elapsed}초) [신규: ${insertedCount}, 업데이트: ${updatedCount}, 삭제: ${deletedCount}, 스킵: ${skippedCount}]`);

    // 💡 [대표님 긴급 지침] 동기화 성공 직후 즉시 중복 매물을 전량 검사하여 최신 1건만 보존하고 박멸!
    try {
      await deduplicateOnbidProperties();
    } catch (dedupErr) {
      console.error("중복 제거 실행 중 에러:", dedupErr);
    }

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      deleted: deletedCount,
      skipped: skippedCount,
      elapsed
    };
  } catch (error: any) {
    console.error("❌ 온비드 v2 동기화 에러:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🧹 기존 중복 매물 일괄 정리 (1회성 마이그레이션)
 * 같은 공고번호(cltrMngNo)의 중복 레코드 중 최신 1건만 남기고 삭제
 */
export async function deduplicateOnbidProperties() {
  const supabase = getAdminClient();
  console.log("🧹 기존 온비드 중복 매물 정리 시작...");

  // 모든 경매 매물 조회 (페이징 적용하여 1,000건 제한 우회)
  const allAuctions: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("vacancies")
      .select("id, description, metadata, created_at")
      .eq("trade_type", "경매")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) {
      console.error("조회 실패:", error.message);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      allAuctions.push(...data);
      page++;
      hasMore = data.length === 1000;
    } else {
      hasMore = false;
    }
  }

  // 공고번호별로 그룹핑
  const groups = new Map<string, string[]>(); // mngNo → [id, id, ...]
  let noMngNoCount = 0;

  for (const row of allAuctions) {
    // metadata에서 cltrMngNo 추출
    let mngNo = (row.metadata as any)?.cltrMngNo;
    
    // 없으면 description에서 추출
    if (!mngNo) {
      const match = row.description?.match(/공고번호:\s*(\S+)/);
      mngNo = match?.[1];
    }

    if (!mngNo || mngNo === "정보 없음") {
      noMngNoCount++;
      continue;
    }

    const list = groups.get(mngNo) || [];
    list.push(row.id);
    groups.set(mngNo, list);
  }

  // 중복된 그룹에서 첫 번째(최신)만 남기고 나머지 삭제
  const idsToDelete: string[] = [];
  let duplicateGroups = 0;

  for (const [mngNo, ids] of groups.entries()) {
    if (ids.length > 1) {
      duplicateGroups++;
      // ids[0] = 최신 (order by created_at desc), 나머지 삭제
      idsToDelete.push(...ids.slice(1));
    }
  }

  console.log(`📋 분석 결과: ${groups.size}개 공고번호, ${duplicateGroups}개 중복 그룹, ${idsToDelete.length}건 삭제 대상, ${noMngNoCount}건 공고번호 없음`);

  if (idsToDelete.length > 0) {
    // 배치 삭제 (100건씩)
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const batch = idsToDelete.slice(i, i + 100);
      await supabase.from("vacancy_photos").delete().in("vacancy_id", batch);
      await supabase.from("vacancies").delete().in("id", batch);
    }
    console.log(`🧹 중복 매물 ${idsToDelete.length}건 삭제 완료!`);
  }

  return { success: true, totalGroups: groups.size, duplicateGroups, deleted: idsToDelete.length, noMngNo: noMngNoCount };
}
