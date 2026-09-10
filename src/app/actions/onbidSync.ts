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
    // console.error("좌표 변환 에러:", error);
  }
  return null;
}

// ─── 스마트 다단계 주소 정제 및 좌표 폴백 ────────────────────────
function cleanAddressCandidates(fullAddress: string, item: any): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const addCand = (str?: string | null) => {
    if (!str) return;
    const clean = str.replace(/\s+/g, " ").trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      candidates.push(clean);
    }
  };

  // 1단계: 용도 수식어 및 괄호 부가설명 제거
  let base = fullAddress
    .replace(/\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실|단독주택|다세대주택|연립주택|도시형생활주택|주상복합|노유자시설|종교시설|숙박시설|위락시설|자동차관련시설).*$/i, "")
    .replace(/\(.*?\)/g, "")
    .trim();
  addCand(base);

  // 2단계: 번지/건물번호까지만 추출한 지번 주소
  const lotMatch = base.match(/^(.+?(?:동|리|로|길)\s*(?:산\s*)?\d+(?:-\d+)?)/);
  if (lotMatch && lotMatch[1]) {
    addCand(lotMatch[1]);
  }

  // 3단계: "외 N필지", "제N층", "제N호", 복수 지번 제거
  const refined = base
    .replace(/외\s*\d+필지/g, "")
    .replace(/제?\d+층/g, "")
    .replace(/제?[가-힣\w\d]+호/g, "")
    .replace(/,\s*\d+(?:-\d+)?/g, "");
  addCand(refined);

  // 4단계: 읍면동 단위 폴백 (lctnSdnm + lctnSggnm + lctnEmdNm)
  const dongFallback = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
  addCand(dongFallback);

  // 5단계: 시군구 단위 폴백 (최후의 안전망)
  const sggFallback = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""}`.trim();
  addCand(sggFallback);

  return candidates;
}

async function getSmartCoordinates(fullAddress: string, item: any): Promise<{ lat: number; lng: number } | null> {
  const candidates = cleanAddressCandidates(fullAddress, item);
  for (const cand of candidates) {
    const coords = await getCoordinates(cand);
    if (coords) return coords;
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

function isRealDate(dtStr: string | null | undefined): boolean {
  if (!dtStr) return false;
  const s = String(dtStr).trim();
  if (s.length < 8) return false;
  const y = parseInt(s.substring(0, 4), 10);
  return y >= 2020 && y <= 2040;
}

function formatOnbidDate(dtStr: string): string {
  if (!dtStr || dtStr.length < 8) return "일정 미정";
  if (!isRealDate(dtStr)) return "일정 보류(미정)";
  return `${dtStr.substring(0, 4)}-${dtStr.substring(4, 6)}-${dtStr.substring(6, 8)} ${dtStr.substring(8, 10) || "00"}:${dtStr.substring(10, 12) || "00"}`;
}

function getKstNowString(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 3600000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = kst.getFullYear();
  const m = pad(kst.getMonth() + 1);
  const d = pad(kst.getDate());
  const hh = pad(kst.getHours());
  const mm = pad(kst.getMinutes());
  return `${y}${m}${d}${hh}${mm}`;
}

function selectBestRound(rounds: any[], nowStr: string): any {
  if (!rounds || rounds.length === 0) return null;

  const validRounds = rounds.filter(
    (r) => isRealDate(r.cltrBidBgngDt) && isRealDate(r.cltrBidEndDt)
  );

  // 더미 일자만 있는 경우
  if (validRounds.length === 0) {
    return rounds[0];
  }

  // 1순위: 현재 입찰 진행 중인 회차 (시작일 <= 현재 <= 종료일)
  const activeRounds = validRounds.filter((r) => {
    const bg = String(r.cltrBidBgngDt);
    const ed = String(r.cltrBidEndDt);
    return bg <= nowStr && ed >= nowStr;
  });
  if (activeRounds.length > 0) {
    activeRounds.sort((a, b) => String(a.cltrBidEndDt).localeCompare(String(b.cltrBidEndDt)));
    return activeRounds[0];
  }

  // 2순위: 오늘 이후 가장 먼저 다가오는 직근 미래 회차 (종료일 > 현재)
  const upcomingRounds = validRounds.filter((r) => {
    const ed = String(r.cltrBidEndDt);
    return ed > nowStr;
  });
  if (upcomingRounds.length > 0) {
    upcomingRounds.sort((a, b) => {
      const cmp = String(a.cltrBidBgngDt).localeCompare(String(b.cltrBidBgngDt));
      if (cmp !== 0) return cmp;
      return String(a.cltrBidEndDt).localeCompare(String(b.cltrBidEndDt));
    });
    return upcomingRounds[0];
  }

  // 3순위: 모두 종료된 경우 (가장 최근에 끝난 회차)
  validRounds.sort((a, b) => String(b.cltrBidEndDt).localeCompare(String(a.cltrBidEndDt)));
  return validRounds[0];
}

function calculateFailCount(item: any): number {
  const rawUsbd = parseInt(item.usbdNft ?? "0", 10) || 0;
  const apsl = parseInt(item.apslEvlAmt || "0", 10) || 0;
  const lowest = parseInt(item.lowstBidPrcIndctCont || "0", 10) || 0;

  // 1차: 온비드 raw usbdNft가 1 이상이면 그 값을 신뢰
  if (rawUsbd > 0) return rawUsbd;

  // 2차: 감정가 대비 할인율을 통한 유찰 횟수 역산 (공매 1회 유찰당 통상 10%씩 체감)
  if (apsl > 0 && lowest > 0 && lowest < apsl) {
    const discountRate = ((apsl - lowest) / apsl) * 100;
    const est = Math.round(discountRate / 10);
    if (est > 0) return est;
  }

  // 3차: 공고차수(pbctNsq) 기반
  const nsq = parseInt(item.pbctNsq || "0", 10) || 0;
  if (nsq > 1) return nsq - 1;

  return 0;
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
        
        // 온비드 API 실시간 차단/한도 초과/에러 감지
        const header = data.header || data.response?.header;
        const resultCode = header?.resultCode;
        const resultMsg = header?.resultMsg;
        if (resultCode && resultCode !== "00" && resultCode !== "NORMAL_CODE") {
          throw new Error(`온비드 API 오류 [${resultCode}]: ${resultMsg}`);
        }

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
      } else {
        hasMore = false;
      }
    } catch (err: any) {
      console.error(`API pageNo=${pageNo} 에러:`, err);
      hasMore = false;
      throw err;
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
  let serviceKey = process.env.ONBID_API_KEY || process.env.DATA_GO_KR_API_KEY || process.env.NEXT_PUBLIC_BROKERAGE_API_KEY;
  
  if (serviceKey) {
    serviceKey = serviceKey.replace(/['"]/g, "").trim();
  }

  if (!serviceKey) {
    console.error("❌ ONBID_API_KEY 환경변수 누락 (DATA_GO_KR_API_KEY, NEXT_PUBLIC_BROKERAGE_API_KEY 포함)");
    return { success: false, error: "API Key missing" };
  }

  const startTime = Date.now();
  console.log(`🤖 [v2] 온비드 UPSERT 동기화 시작 (${targetSido})`);

  try {
    // ═══ 1단계: 온비드 API 호출용 시도명 변환 및 수집 ═══
    // 온비드 API v2 규격: 광주광역시, 전라남도는 '전남광주통합특별시'로 등록되어 있음
    const isGwangju = targetSido.includes("광주");
    const isJeonnam = targetSido.includes("전남") || targetSido.includes("전라남도");
    const apiSearchSido = (isGwangju || isJeonnam) ? "전남광주통합특별시" : targetSido;

    let apiItems = await fetchOnbidItems(serviceKey, apiSearchSido);

    if (isGwangju || isJeonnam) {
      const GWANGJU_DISTRICTS = new Set(["동구", "서구", "남구", "북구", "광산구"]);
      apiItems = apiItems.filter((item) => {
        const sgg = (item.lctnSggnm || "").trim();
        const matchesGwangju = GWANGJU_DISTRICTS.has(sgg);
        if (isGwangju) {
          if (matchesGwangju) {
            item.lctnSdnm = "광주광역시";
            return true;
          }
          return false;
        } else {
          if (!matchesGwangju) {
            item.lctnSdnm = "전라남도";
            return true;
          }
          return false;
        }
      });
    }
    
    if (apiItems.length === 0) {
      console.log(`📦 ${targetSido}: API에서 가져올 물건이 없습니다.`);
      return { success: true, inserted: 0, updated: 0, deleted: 0, skipped: 0, elapsed: "0.1" };
    }
    console.log(`📦 API 수집: ${apiItems.length}건 (${targetSido})`);

    // ═══ 2단계: API 물건을 공고번호(cltrMngNo) 기준으로 그룹핑 후 최적 회차 스마트 선정 ═══
    // 온비드 다회차 공고 중: 1순위 현재 진행중, 2순위 직근 다가오는 회차, 2999년 등 더미일자 배제
    const nowStr = getKstNowString();
    const groupedByMngNo = new Map<string, any[]>();
    for (const item of apiItems) {
      const mngNo = String(item.cltrMngNo || "").trim();
      if (!mngNo) continue;
      const list = groupedByMngNo.get(mngNo) || [];
      list.push(item);
      groupedByMngNo.set(mngNo, list);
    }

    const apiMap = new Map<string, any>();
    for (const [mngNo, rounds] of groupedByMngNo.entries()) {
      const best = selectBestRound(rounds, nowStr);
      if (best) {
        apiMap.set(mngNo, best);
      }
    }
    console.log(`📋 공고번호 기준 고유 물건: ${apiMap.size}건 (API ${apiItems.length}건 → 직근 유효 회차 선별 완료)`);

    // ═══ 3단계: DB 기존 매물 조회 (페이징으로 1,000건 제한 완벽 우회) ═══
    const sidoFilters = [targetSido, normalizeSido(targetSido), targetSido.substring(0, 2)];
    if (targetSido === "강원특별자치도") sidoFilters.push("강원도");
    if (targetSido === "제주특별자치도") sidoFilters.push("제주도");
    if (targetSido === "전북특별자치도") sidoFilters.push("전라북도");

    const dbRows: any[] = [];
    let dbPage = 0;
    let hasMoreDb = true;

    while (hasMoreDb) {
      const { data: pageRows, error: dbErr } = await supabase
        .from("vacancies")
        .select("id, metadata, lat, lng, building_name, detail_addr, sido")
        .eq("trade_type", "경매")
        .in("sido", sidoFilters)
        .eq("status", "ACTIVE")
        .range(dbPage * 1000, (dbPage + 1) * 1000 - 1);

      if (dbErr) {
        console.error("DB 기존 매물 조회 에러:", dbErr.message);
        break;
      }

      if (pageRows && pageRows.length > 0) {
        dbRows.push(...pageRows);
        dbPage++;
        hasMoreDb = pageRows.length === 1000;
      } else {
        hasMoreDb = false;
      }
    }

    // DB의 공고번호 → vacancy ID 맵 구축
    const dbMap = new Map<string, { id: string; lat: number; lng: number }>();
    const dbMngNos = new Set<string>();
    
    for (const row of dbRows) {
      const mngNo = (row.metadata as any)?.cltrMngNo;
      if (mngNo) {
        dbMap.set(String(mngNo), { id: row.id, lat: row.lat, lng: row.lng });
        dbMngNos.add(String(mngNo));
      }
    }
    console.log(`📋 DB 기존 매물: ${dbMap.size}건 (공고번호 보유, 전체 ${dbRows.length}건)`);

    // ═══ 4단계: INSERT / UPDATE / DELETE 분류 ═══
    const toInsert: any[] = [];
    const toUpdate: any[] = [];
    
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

    // ═══ 5단계: 신규 매물 지오코딩 (스마트 5단계 폴백 병렬 캐싱) ═══
    const newAddresses = new Map<string, any>();
    for (const { item } of toInsert) {
      let address = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
      const propertyName = item.onbidCltrNm || "";
      if (propertyName) {
        const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
        if (addrMatch?.[1]) address = addrMatch[1].trim();
      }
      if (address) newAddresses.set(address, item);
    }

    const coordsCache = new Map<string, { lat: number; lng: number }>();
    if (newAddresses.size > 0) {
      console.log(`📍 신규 ${newAddresses.size}개 주소 지오코딩 시작...`);
      const addrEntries = Array.from(newAddresses.entries());
      const CHUNK_SIZE = 20;
      for (let i = 0; i < addrEntries.length; i += CHUNK_SIZE) {
        const chunk = addrEntries.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async ([addr, item]) => {
          const coords = await getSmartCoordinates(addr, item);
          if (coords) coordsCache.set(addr, coords);
        }));
      }
      console.log(`📍 지오코딩 완료: ${coordsCache.size}/${addrEntries.length}개 좌표 확보`);
    }

    // ═══ 6단계: 관리자 ID 확보 ═══
    const ownerId = await getAdminOwnerId(supabase);

    // ═══ 7단계: INSERT (신규 매물 등록 - 20개씩 병렬 배치) ═══
    let insertedCount = 0;
    let skippedCount = 0;

    const INSERT_CHUNK = 20;
    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK);
      await Promise.all(chunk.map(async ({ mngNo, item }) => {
        const propertyName = item.onbidCltrNm || "";
        let address = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
        if (propertyName) {
          const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
          if (addrMatch?.[1]) address = addrMatch[1].trim();
        }

        const coords = coordsCache.get(address);
        if (!coords) {
          skippedCount++;
          return;
        }

        const parsedAddr = parseAddress(address);
        const resolvedSido = (targetSido === "광주광역시" || targetSido === "전라남도")
          ? targetSido
          : (parsedAddr.sido || targetSido);
        const propertyType = mapPropertyType(item.cltrUsgMclsCtgrNm || item.cltrUsgLclsCtgrNm, propertyName);
        const deposit = Math.round(parseInt(item.lowstBidPrcIndctCont || "0", 10) / 10000);
        const appraisalPrice = Math.round(parseInt(item.apslEvlAmt || "0", 10) / 10000);
        const bidStart = formatOnbidDate(item.cltrBidBgngDt);
        const bidEnd = formatOnbidDate(item.cltrBidEndDt);
        const failCount = calculateFailCount(item);

        const isPendingSchedule = !isRealDate(item.cltrBidBgngDt);
        const bidStatus = isPendingSchedule
          ? "일정보류"
          : (item.cltrBidBgngDt <= nowStr && item.cltrBidEndDt >= nowStr)
            ? "입찰진행중"
            : (item.cltrBidBgngDt > nowStr)
              ? "입찰준비중"
              : "입찰마감";

        const discountRate = appraisalPrice > 0 ? Math.round(((appraisalPrice - deposit) / appraisalPrice) * 100) : 0;

        const description = `[📢 온비드 공매 추천 매물]
* 공고번호: ${mngNo}
* 물건번호 (온비드 고유 ID): ${item.onbidCltrno || ""}
* 감정평가액: ${(appraisalPrice * 10000).toLocaleString()}원
* 최저입찰가격: ${(deposit * 10000).toLocaleString()}원 (할인율 ${discountRate > 0 ? `▼${discountRate}%` : "0%"})
* 유찰 횟수: ${failCount}회
* 입찰 진행: ${bidStatus} (${bidStart} ~ ${bidEnd})

본 매물은 한국자산관리공사(KAMCO)에서 진행하는 공식 공매 물건입니다. 
인터넷 입찰은 온비드 사이트에서 입찰 기간 내에 직접 참여하실 수 있습니다. 
주변 시세 대비 압도적으로 합리적인 최저가로 내 집 마련 또는 투자 기회를 선점하세요!`;

        const metadata: Record<string, any> = {
          source_type: "ONBID",
          cltrMngNo: mngNo,
          bid_start_date: bidStart,
          bid_end_date: bidEnd,
          bid_status: bidStatus,
          fail_count: failCount,
          failCount: failCount,
          usbdNft: failCount,
          pbctCnt: failCount,
          pbct_cnt: failCount,
          round_nsq: item.pbctNsq || "",
          appraisal_price: appraisalPrice * 10000,
          lowest_bid_price: deposit * 10000,
          discount_rate: discountRate,
        };
        for (const [key, val] of Object.entries(item)) { metadata[key] = val; }
        metadata.bid_start_date = bidStart;
        metadata.bid_end_date = bidEnd;
        metadata.bid_status = bidStatus;
        metadata.fail_count = failCount;
        metadata.usbdNft = failCount;
        metadata.pbctCnt = failCount;
        metadata.pbct_cnt = failCount;
        metadata.appraisal_price = appraisalPrice * 10000;
        metadata.lowest_bid_price = deposit * 10000;
        metadata.discount_rate = discountRate;

        const { data: inserted, error: insertErr } = await supabase.from("vacancies").insert({
          owner_id: ownerId, owner_role: "ADMIN", property_type: propertyType, trade_type: "경매",
          deposit, monthly_rent: 0, maintenance_fee: 0,
          sido: resolvedSido, sigungu: parsedAddr.sigungu || item.lctnSggnm || "", dong: parsedAddr.dong || item.lctnEmdNm || "", detail_addr: parsedAddr.detail_addr,
          building_name: propertyName, lat: coords.lat, lng: coords.lng,
          description, status: "ACTIVE", address_exposure: "지번공개", move_in_date: "즉시입주", consent: true,
          metadata
        }).select("id").maybeSingle();

        if (insertErr) {
          console.error(`INSERT 실패(${propertyName}):`, insertErr.message);
          skippedCount++;
        } else {
          insertedCount++;
          if (inserted?.id && item.thnlImgUrlAdr) {
            try {
              const highResUrl = item.thnlImgUrlAdr.replace("downloadImageKind=THNL_NM", "downloadImageKind=ORIG_NM");
              await supabase.from("vacancy_photos").insert({ vacancy_id: inserted.id, url: highResUrl, sort_order: 1 });
            } catch {}
          }
        }
      }));
    }

    // ═══ 8단계: UPDATE (기존 매물 가격/일자 갱신 - 25개씩 병렬 배치) ═══
    let updatedCount = 0;
    const UPDATE_CHUNK = 25;
    for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK) {
      const chunk = toUpdate.slice(i, i + UPDATE_CHUNK);
      await Promise.all(chunk.map(async ({ mngNo, item, dbRecord }) => {
        const deposit = Math.round(parseInt(item.lowstBidPrcIndctCont || "0", 10) / 10000);
        const appraisalPrice = Math.round(parseInt(item.apslEvlAmt || "0", 10) / 10000);
        const bidStart = formatOnbidDate(item.cltrBidBgngDt);
        const bidEnd = formatOnbidDate(item.cltrBidEndDt);
        const propertyType = mapPropertyType(item.cltrUsgMclsCtgrNm || item.cltrUsgLclsCtgrNm, item.onbidCltrNm);
        const failCount = calculateFailCount(item);

        const isPendingSchedule = !isRealDate(item.cltrBidBgngDt);
        const bidStatus = isPendingSchedule
          ? "일정보류"
          : (item.cltrBidBgngDt <= nowStr && item.cltrBidEndDt >= nowStr)
            ? "입찰진행중"
            : (item.cltrBidBgngDt > nowStr)
              ? "입찰준비중"
              : "입찰마감";

        const discountRate = appraisalPrice > 0 ? Math.round(((appraisalPrice - deposit) / appraisalPrice) * 100) : 0;

        const metadata: Record<string, any> = {
          source_type: "ONBID",
          cltrMngNo: mngNo,
          bid_start_date: bidStart,
          bid_end_date: bidEnd,
          bid_status: bidStatus,
          fail_count: failCount,
          failCount: failCount,
          usbdNft: failCount,
          pbctCnt: failCount,
          pbct_cnt: failCount,
          round_nsq: item.pbctNsq || "",
          appraisal_price: appraisalPrice * 10000,
          lowest_bid_price: deposit * 10000,
          discount_rate: discountRate,
        };
        for (const [key, val] of Object.entries(item)) { metadata[key] = val; }
        metadata.bid_start_date = bidStart;
        metadata.bid_end_date = bidEnd;
        metadata.bid_status = bidStatus;
        metadata.fail_count = failCount;
        metadata.usbdNft = failCount;
        metadata.pbctCnt = failCount;
        metadata.pbct_cnt = failCount;
        metadata.appraisal_price = appraisalPrice * 10000;
        metadata.lowest_bid_price = deposit * 10000;
        metadata.discount_rate = discountRate;

        const description = `[📢 온비드 공매 추천 매물]
* 공고번호: ${mngNo}
* 물건번호 (온비드 고유 ID): ${item.onbidCltrno || ""}
* 감정평가액: ${(appraisalPrice * 10000).toLocaleString()}원
* 최저입찰가격: ${(deposit * 10000).toLocaleString()}원 (할인율 ${discountRate > 0 ? `▼${discountRate}%` : "0%"})
* 유찰 횟수: ${failCount}회
* 입찰 진행: ${bidStatus} (${bidStart} ~ ${bidEnd})

본 매물은 한국자산관리공사(KAMCO)에서 진행하는 공식 공매 물건입니다. 
인터넷 입찰은 온비드 사이트에서 입찰 기간 내에 직접 참여하실 수 있습니다. 
주변 시세 대비 압도적으로 합리적인 최저가로 내 집 마련 또는 투자 기회를 선점하세요!`;

        const { error } = await supabase.from("vacancies")
          .update({ deposit, metadata, description, property_type: propertyType })
          .eq("id", dbRecord.id);

        if (!error) updatedCount++;
      }));
    }

    // ═══ 9단계: DELETE (API에 없는 매물 삭제 - 100건씩 배치) ═══
    let deletedCount = 0;
    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += 100) {
        const batch = toDelete.slice(i, i + 100);
        await supabase.from("vacancy_photos").delete().in("vacancy_id", batch);
        const { error: delErr } = await supabase.from("vacancies").delete().in("id", batch);
        if (!delErr) {
          deletedCount += batch.length;
        } else {
          console.error("삭제 오류:", delErr.message);
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🤖 [v2] ${targetSido} 동기화 완료! (${elapsed}초) [신규: ${insertedCount}, 업데이트: ${updatedCount}, 삭제: ${deletedCount}, 스킵: ${skippedCount}]`);

    // 💡 해당 시도 중복 매물 고속 정리
    try {
      await deduplicateOnbidProperties(targetSido);
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
 * 🧹 온비드 중복 매물 정리 (시도별 또는 전국)
 * 같은 공고번호(cltrMngNo)의 중복 레코드 중 최신 1건만 남기고 삭제
 */
export async function deduplicateOnbidProperties(targetSido?: string) {
  const supabase = getAdminClient();
  console.log(`🧹 온비드 중복 매물 정리 시작... (${targetSido || "전국"})`);

  const allAuctions: any[] = [];
  let page = 0;
  let hasMore = true;

  const sidoFilters = targetSido ? [targetSido, normalizeSido(targetSido), targetSido.substring(0, 2)] : null;
  if (targetSido === "강원특별자치도" && sidoFilters) sidoFilters.push("강원도");
  if (targetSido === "제주특별자치도" && sidoFilters) sidoFilters.push("제주도");
  if (targetSido === "전북특별자치도" && sidoFilters) sidoFilters.push("전라북도");

  while (hasMore) {
    let query = supabase
      .from("vacancies")
      .select("id, description, metadata, created_at")
      .eq("trade_type", "경매")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    if (sidoFilters) {
      query = query.in("sido", sidoFilters);
    }

    const { data, error } = await query.range(page * 1000, (page + 1) * 1000 - 1);

    if (error) {
      console.error("중복 매물 조회 실패:", error.message);
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
  const groups = new Map<string, string[]>();
  let noMngNoCount = 0;

  for (const row of allAuctions) {
    let mngNo = (row.metadata as any)?.cltrMngNo;
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
      idsToDelete.push(...ids.slice(1));
    }
  }

  console.log(`📋 중복 분석 결과: ${groups.size}개 공고번호, ${duplicateGroups}개 중복 그룹, ${idsToDelete.length}건 삭제 대상`);

  if (idsToDelete.length > 0) {
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const batch = idsToDelete.slice(i, i + 100);
      await supabase.from("vacancy_photos").delete().in("vacancy_id", batch);
      await supabase.from("vacancies").delete().in("id", batch);
    }
    console.log(`🧹 중복 매물 ${idsToDelete.length}건 삭제 완료!`);
  }

  return { success: true, totalGroups: groups.size, duplicateGroups, deleted: idsToDelete.length, noMngNo: noMngNoCount };
}
