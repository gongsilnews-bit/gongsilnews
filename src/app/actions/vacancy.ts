"use server"

import { createClient } from "@supabase/supabase-js"
import { getEffectivePlan } from "@/utils/planCheck"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// ── 공실 등록 ──
export async function createVacancy(data: {
  owner_id: string;
  owner_role: string;
  property_type: string;
  sub_category?: string;
  trade_type: string;
  deposit?: number;
  monthly_rent?: number;
  maintenance_fee?: number;
  commission_type?: string;
  commission_amount?: string;
  commission_etc?: string;
  supply_m2?: number;
  supply_py?: number;
  exclusive_m2?: number;
  exclusive_py?: number;
  room_count?: number;
  bath_count?: number;
  direction?: string;
  current_floor?: string;
  total_floor?: string;
  parking?: string;
  move_in_date?: string;
  options?: string[];
  sido?: string;
  sigungu?: string;
  dong?: string;
  detail_addr?: string;
  building_name?: string;
  apt_dong?: string;
  hosu?: string;
  address_exposure?: string;
  lat?: number;
  lng?: number;
  client_name?: string;
  client_phone?: string;
  owner_relation?: string;
  description?: string;
  realtor_commission?: string;
  exposure_type?: string;
  landlord_name?: string;
  landlord_phone?: string;
  landlord_memo?: string;
  consent?: boolean;
  infrastructure?: Record<string, string[]>;
  approval_year?: number;
  total_units?: number;
  status?: string;
  metadata?: any;
}) {
  const supabase = getAdminClient();

  try {
    // 1. 유저의 현재 요금제 및 기간 확인
    const { data: member } = await supabase.from('members').select('*').eq('id', data.owner_id).single();
    if (!member) return { success: false, error: "회원 정보를 찾을 수 없습니다." };
    
    // 유틸리티를 통해 실제 적용 중인 플랜(만료 시 free) 판별
    const plan = getEffectivePlan(member);
    
    // 2. 관리자나 공실등록부동산이 아니면 한도 체크
    if (plan !== 'vacancy_premium' && plan !== 'admin') {
      const { count, error: countErr } = await supabase
        .from('vacancies')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', data.owner_id)
        .neq('status', 'DELETED');
        
      if (countErr) return { success: false, error: "공실광고 개수 확인 중 오류가 발생했습니다." };
      
      const maxVacancies = member.max_vacancies ?? 5; // 요금제별 제한 (기본 5개)
      if ((count || 0) >= maxVacancies) {
        return { 
          success: false, 
          error: `기본 요금제의 공실광고 등록 한도(${maxVacancies}건)를 초과했습니다. 무제한 등록을 위해 요금제를 업그레이드해 주세요.` 
        };
      }
    }

    // 클라이언트가 보낸 status 존중 (DRAFT=임시저장, ACTIVE=바로발행)
    const status = data.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE';

    const insertData = {
      ...data,
      status,
      deposit: data.deposit || 0,
      monthly_rent: data.monthly_rent || 0,
      maintenance_fee: data.maintenance_fee || 0,
      supply_m2: data.supply_m2 || null,
      supply_py: data.supply_py || null,
      exclusive_m2: data.exclusive_m2 || null,
      exclusive_py: data.exclusive_py || null,
      infrastructure: data.infrastructure || {},
    };

    const { data: result, error } = await supabase
      .from('vacancies')
      .insert(insertData)
      .select('id, vacancy_no')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, id: result.id, vacancy_no: result.vacancy_no };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 공실 사진 업로드 ──
export async function uploadVacancyPhoto(formData: FormData) {
  const file = formData.get('file') as File;
  const path = formData.get('path') as string;

  if (!file || !path) {
    return { success: false, error: "파일 또는 경로가 누락되었습니다." };
  }

  const supabase = getAdminClient();
  try {
    const { error } = await supabase.storage
      .from('vacancy_images')
      .upload(path, file, { upsert: true });

    if (error) return { success: false, error: error.message };

    const { data: urlData } = supabase.storage
      .from('vacancy_images')
      .getPublicUrl(path);

    return { success: true, url: urlData.publicUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 공실 사진 DB 저장 ──
export async function saveVacancyPhoto(vacancyId: string, url: string, sortOrder: number) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from('vacancy_photos')
      .insert({ vacancy_id: vacancyId, url, sort_order: sortOrder });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 공실 사진 전체 동기화 (기존 데이터 삭제 후 새로 삽입) ──
export async function syncVacancyPhotos(vacancyId: string, urls: string[]) {
  const supabase = getAdminClient();
  try {
    // 1. 기존 사진 삭제
    await supabase.from('vacancy_photos').delete().eq('vacancy_id', vacancyId);
    
    // 2. 새 사진 URL 삽입
    if (urls.length > 0) {
      const insertData = urls.map((url, i) => ({
        vacancy_id: vacancyId,
        url,
        sort_order: i
      }));
      const { error } = await supabase.from('vacancy_photos').insert(insertData);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 공실 목록 조회 ──
// --- Node.js Server-side Global Cache ---
let _serverVacanciesCache: string | null = null;
let _serverVacanciesCacheTime: number = 0;
const SERVER_CACHE_TTL = 3 * 60 * 1000; // 3분 캐시

export async function getVacancies(options?: {
  ownerId?: string;
  status?: string;
  all?: boolean;
  page?: number;
  limit?: number;
  vacancyNo?: string;
  tradeType?: string;
  propertyType?: string;
  subCategory?: string;
  searchKeyword?: string;
  excludeOnbid?: boolean;
  stringify?: boolean;
}) {
  // 1. 서버 캐시 확인 (전체 조회 & stringify 옵션 시에만 적용)
  if (options?.all && options?.stringify) {
    if (_serverVacanciesCache && (Date.now() - _serverVacanciesCacheTime < SERVER_CACHE_TTL)) {
      return { success: true, data: _serverVacanciesCache };
    }
  }

  const supabase = getAdminClient();
  try {
    const selectFields = options?.all
      ? 'id, vacancy_no, owner_id, status, trade_type, property_type, sub_category, deposit, monthly_rent, maintenance_fee, sido, sigungu, dong, building_name, lat, lng, created_at, address_exposure, exposure_type, realtor_commission, room_count, bath_count, exclusive_m2, supply_m2, parking, total_floor, current_floor, direction, move_in_date, client_name, client_phone, themes, options, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)'
      : '*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)';

    // 만약 페이지네이션이 명시된 경우, 단일 쿼리로 최적화해서 수행
    if (options?.page && options?.limit) {
      const from = (options.page - 1) * options.limit;
      const to = from + options.limit - 1;

      let pageQuery = supabase
        .from('vacancies')
        .select(selectFields, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // 역할별 필터
      if (options?.ownerId && !options?.all) {
        const { data: user } = await supabase.from('members').select('role').eq('id', options.ownerId).single();
        if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN' && user?.role !== '최고관리자') {
          pageQuery = pageQuery.eq('owner_id', options.ownerId);
        }
      }

      // 상태 필터 (삭제된 것 제외)
      if (options?.status) {
        pageQuery = pageQuery.eq('status', options.status);
      } else {
        pageQuery = pageQuery.neq('status', 'DELETED');
      }

      // 추가적인 검색 필터
      if (options?.vacancyNo) {
        pageQuery = pageQuery.eq('vacancy_no', parseInt(options.vacancyNo, 10));
      }
      if (options?.tradeType && options.tradeType !== "전체") {
        pageQuery = pageQuery.eq('trade_type', options.tradeType);
      }
      if (options?.searchKeyword) {
        const p = `%${options.searchKeyword}%`;
        pageQuery = pageQuery.or(`sido.ilike.${p},sigungu.ilike.${p},dong.ilike.${p},building_name.ilike.${p},client_name.ilike.${p},client_phone.ilike.${p}`);
      }
      if (options?.excludeOnbid) {
        pageQuery = pageQuery.or("metadata->>source_type.is.null,metadata->>source_type.neq.ONBID");
      }
      if (options?.propertyType && options.propertyType !== "전체") {
        pageQuery = pageQuery.eq('property_type', options.propertyType);
      }
      if (options?.subCategory && options.subCategory !== "전체") {
        pageQuery = pageQuery.eq('sub_category', options.subCategory);
      }

      const { data, error, count } = await pageQuery;
      if (error) {
        console.error("DEBUG SUPABASE ERROR:", error);
        return { success: false, error: error.message };
      }

      const lightData = (data || []).map(v => {
        const { infrastructure, description, metadata, members, vacancy_photos, ...rest } = v;
        const lightMetadata = metadata ? {
          cltrUsgLclsCtgrNm: metadata.cltrUsgLclsCtgrNm,
          cltrUsgMclsCtgrNm: metadata.cltrUsgMclsCtgrNm,
          cltrUsgSclsCtgrNm: metadata.cltrUsgSclsCtgrNm,
          cltrMngNo: metadata.cltrMngNo,
          cltr_mng_no: metadata.cltr_mng_no,
          bldSqms: metadata.bldSqms,
          cltrAr: metadata.cltrAr,
          apslEvlAmt: metadata.apslEvlAmt,
          appraisal_price: metadata.appraisal_price,
          lowstBidPrcIndctCont: metadata.lowstBidPrcIndctCont,
          lowest_bid_price: metadata.lowest_bid_price,
          pblctBgnDtm: metadata.pblctBgnDtm,
          bid_start_date: metadata.bid_start_date,
        } : {};
        return { ...rest, metadata: lightMetadata, members, vacancy_photos };
      });

      return { success: true, data: lightData, count: count || 0 };
    }

    // 순차 while 루프 대신 병렬 Promise.all로 최대 10,000건을 한 번에 병렬 조회하여 속도 비약적 향상
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 10; // 최대 10,000건
    
    // Check role before loop
    let isFilteredRole = false;
    if (options?.ownerId && !options?.all) {
      const { data: user } = await supabase.from('members').select('role').eq('id', options.ownerId).single();
      if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN' && user?.role !== '최고관리자') {
        isFilteredRole = true;
      }
    }

    const promises = [];
    for (let i = 0; i < MAX_PAGES; i++) {
      const from = i * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let pageQuery = supabase
        .from('vacancies')
        .select(selectFields)
        .order('created_at', { ascending: false })
        .range(from, to);

      // 역할별 필터
      if (isFilteredRole) {
        pageQuery = pageQuery.eq('owner_id', options!.ownerId);
      }

      // 상태 필터 (삭제된 것 제외)
      if (options?.status) {
        pageQuery = pageQuery.eq('status', options.status);
      } else {
        pageQuery = pageQuery.neq('status', 'DELETED');
      }

      if (options?.excludeOnbid) {
        pageQuery = pageQuery.or("metadata->>source_type.is.null,metadata->>source_type.neq.ONBID");
      }

      promises.push(pageQuery);
    }

    const results = await Promise.all(promises);
    let allData: any[] = [];
    let page = 0;

    for (const res of results) {
      if (res.error) {
        console.error("DEBUG SUPABASE ERROR:", res.error);
        return { success: false, error: res.error.message };
      }
      if (res.data && res.data.length > 0) {
        allData = allData.concat(res.data);
        page++;
        if (res.data.length < PAGE_SIZE) break; // 더 이상 데이터가 없으면 중단
      } else {
        break;
      }
    }

    console.log(`📊 getVacancies: 총 ${allData.length}건 로드 (${page}페이지)`);
    
    const lightData = allData.map(v => {
      const { infrastructure, description, metadata, members, vacancy_photos, ...rest } = v;
      const lightMetadata = metadata ? {
        cltrUsgLclsCtgrNm: metadata.cltrUsgLclsCtgrNm,
        cltrUsgMclsCtgrNm: metadata.cltrUsgMclsCtgrNm,
        cltrUsgSclsCtgrNm: metadata.cltrUsgSclsCtgrNm,
        cltrMngNo: metadata.cltrMngNo,
        cltr_mng_no: metadata.cltr_mng_no,
        bldSqms: metadata.bldSqms,
        cltrAr: metadata.cltrAr,
        apslEvlAmt: metadata.apslEvlAmt,
        appraisal_price: metadata.appraisal_price,
        lowstBidPrcIndctCont: metadata.lowstBidPrcIndctCont,
        lowest_bid_price: metadata.lowest_bid_price,
        pblctBgnDtm: metadata.pblctBgnDtm,
        bid_start_date: metadata.bid_start_date,
      } : {};
      return { ...rest, metadata: lightMetadata, members, vacancy_photos };
    });

    const finalData = lightData || [];
    const resultString = options?.stringify ? JSON.stringify(finalData) : finalData;

    // 캐시에 저장
    if (options?.all && options?.stringify) {
      _serverVacanciesCache = resultString as string;
      _serverVacanciesCacheTime = Date.now();
    }

    return { success: true, data: resultString };
  } catch (error: any) {
    console.error("DEBUG TRY/CATCH ERROR:", error);
    return { success: false, error: error.message };
  }
}

export async function getVacancyCountByKeyword(keyword: string) {
  const supabase = getAdminClient();
  try {
    const trimmed = keyword.trim();
    if (!trimmed) return { success: true, count: 0 };

    let orConditions = `dong.ilike.%${trimmed}%,sigungu.ilike.%${trimmed}%,sido.ilike.%${trimmed}%,building_name.ilike.%${trimmed}%,detail_addr.ilike.%${trimmed}%`;
    if (/^\d+$/.test(trimmed)) {
      orConditions += `,vacancy_no.eq.${trimmed}`;
    }
    orConditions += `,metadata->>cltrMngNo.ilike.%${trimmed}%,metadata->>cltr_mng_no.ilike.%${trimmed}%`;

    const { count, error } = await supabase
      .from('vacancies')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'DELETED')
      .or(orConditions);

    if (error) return { success: false, error: error.message };
    return { success: true, count: count || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── 공실 상세 조회 ──
export async function getVacancyDetail(vacancyId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('vacancies')
      .select('*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)')
      .eq('id', vacancyId)
      .single();

    if (error) return { success: false, error: error.message };

    // 사진 조회
    const { data: photos } = await supabase
      .from('vacancy_photos')
      .select('*')
      .eq('vacancy_id', vacancyId)
      .order('sort_order', { ascending: true });

    // Flyer 조회 (오류 시에도 에러 없이 null 처리되도록 안전하게 조회)
    let flyer = null;
    try {
      const { data: flyerData } = await supabase
        .from('vacancy_flyers')
        .select('*')
        .eq('vacancy_id', vacancyId)
        .maybeSingle();
      flyer = flyerData;
    } catch (e) {
      console.warn("vacancy_flyers table load skipped or failed:", e);
    }

    return { success: true, data, photos: photos || [], flyer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 물건관리번호(cltrMngNo)로 경매 매물 조회 ──
export async function getVacancyByMngNo(mngNo: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('vacancies')
      .select('*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)')
      .eq('trade_type', '경매')
      .eq('status', 'ACTIVE')
      .or(`metadata->>cltrMngNo.eq.${mngNo},metadata->>cltr_mng_no.eq.${mngNo}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: '해당 물건관리번호의 매물을 찾을 수 없습니다.' };

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 공실번호(vacancy_no)로 매물 조회 ──
export async function getVacancyByVacancyNo(vacancyNo: number) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('vacancies')
      .select('*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)')
      .eq('vacancy_no', vacancyNo)
      .neq('status', 'DELETED')
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


// ── 공실 상태 변경 (광고중 ↔ 광고종료, 승인 등) ──
export async function updateVacancyStatus(vacancyId: string, newStatus: string) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from('vacancies')
      .update({ status: newStatus })
      .eq('id', vacancyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 공실 수정 ──
export async function updateVacancy(vacancyId: string, updates: Record<string, any>) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from('vacancies')
      .update(updates)
      .eq('id', vacancyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 공실 삭제 (Soft Delete) ──
export async function deleteVacancy(vacancyId: string) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from('vacancies')
      .update({ status: 'DELETED' })
      .eq('id', vacancyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 중개소 정보 조회 ──
export async function getAgencyInfo(ownerId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase.from('agencies').select('*').eq('owner_id', ownerId).single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


// --- Node.js Server-side Global Cache for Map ---
let _serverMapCache: any[] | null = null;
let _serverMapCacheTime: number = 0;
const SERVER_MAP_CACHE_TTL = 3 * 60 * 1000; // 3분 캐시

export async function getVacanciesForMap(options?: {
  bbox?: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
  };
  sido?: string;
  sigungu?: string;
  dong?: string;
  is_auction?: boolean; // 🚀 경공매 모드 스위치 지원을 위한 옵션 정의
  limit?: number; // ⚡️ 로딩 성능 비약적 향상을 위한 limit 파라미터 추가
  ownerId?: string; // 🏢 특정 중개사 매물 필터링용 옵션 추가
}) {
  const supabase = getAdminClient();
  try {
    // 1. 캐시 활용 (특정 범위/조건이 없는 메인페이지의 전체 로딩인 경우)
    const isGlobalFetch = !options?.bbox && !options?.sido && !options?.sigungu && !options?.dong && options?.is_auction === undefined && !options?.ownerId;
    if (isGlobalFetch) {
      if (_serverMapCache && (Date.now() - _serverMapCacheTime < SERVER_MAP_CACHE_TTL)) {
        return { success: true, data: _serverMapCache };
      }
    }

    const batchSize = 1000;
    const maxLimit = options?.limit ?? 10000;
    // 필요한 만큼만 병렬 쿼리 호출 (limit이 1000이면 1페이지만 조회하여 10배 속도 향상!)
    const pages = Math.max(1, Math.min(10, Math.ceil(maxLimit / batchSize)));
    const promises = [];
    
    for (let i = 0; i < pages; i++) {
      let pageQuery = supabase
        .from('vacancies')
        .select('id, vacancy_no, owner_id, lat, lng, trade_type, property_type, sub_category, deposit, monthly_rent, maintenance_fee, sido, sigungu, dong, detail_addr, building_name, hosu, exclusive_m2, supply_m2, room_count, bath_count, direction, parking, owner_role, realtor_commission, commission_type, status, themes, options, address_exposure, exposure_type, created_at, metadata, vacancy_photos(url, sort_order)')
        .eq('status', 'ACTIVE')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (options?.ownerId) {
        pageQuery = pageQuery.eq('owner_id', options.ownerId);
      }

      if (options?.is_auction !== undefined) {
        if (options.is_auction) {
          pageQuery = pageQuery.eq('trade_type', '경매');
        } else {
          pageQuery = pageQuery.neq('trade_type', '경매');
        }
      }

      if (options?.bbox) {
        pageQuery = pageQuery
          .gte('lat', options.bbox.swLat)
          .lte('lat', options.bbox.neLat)
          .gte('lng', options.bbox.swLng)
          .lte('lng', options.bbox.neLng);
      }

      if (options?.sido) {
        pageQuery = pageQuery.eq('sido', options.sido);
      }
      if (options?.sigungu) {
        pageQuery = pageQuery.eq('sigungu', options.sigungu);
      }
      if (options?.dong) {
        pageQuery = pageQuery.eq('dong', options.dong);
      }

      pageQuery = pageQuery
        .order('created_at', { ascending: false })
        .range(i * batchSize, (i + 1) * batchSize - 1);
      
      promises.push(pageQuery);
    }

    const results = await Promise.all(promises);
    let combinedData: any[] = [];
    for (const res of results) {
      if (res.error) return { success: false, error: res.error.message };
      if (res.data) {
        combinedData = combinedData.concat(res.data);
        // If a page returns fewer than 1000 rows, we reached the end of the records
        if (res.data.length < batchSize) break;
      }
    }

    const lightData = combinedData.map(v => {
      const { metadata, vacancy_photos, ...rest } = v;
      const lightMetadata = metadata ? {
        cltrUsgLclsCtgrNm: metadata.cltrUsgLclsCtgrNm,
        cltrUsgMclsCtgrNm: metadata.cltrUsgMclsCtgrNm,
        cltrUsgSclsCtgrNm: metadata.cltrUsgSclsCtgrNm,
        cltrMngNo: metadata.cltrMngNo,
        cltr_mng_no: metadata.cltr_mng_no,
        bldSqms: metadata.bldSqms,
        cltrAr: metadata.cltrAr,
        apslEvlAmt: metadata.apslEvlAmt,
        appraisal_price: metadata.appraisal_price,
        lowstBidPrcIndctCont: metadata.lowstBidPrcIndctCont,
        lowest_bid_price: metadata.lowest_bid_price,
        pblctBgnDtm: metadata.pblctBgnDtm,
        bid_start_date: metadata.bid_start_date,
      } : {};
      return { ...rest, metadata: lightMetadata, vacancy_photos };
    });

    if (isGlobalFetch) {
      _serverMapCache = lightData;
      _serverMapCacheTime = Date.now();
    }

    return { success: true, data: lightData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getVacancyListByKeyword(keyword: string) {
  const supabase = getAdminClient();
  try {
    const trimmed = keyword.trim();
    if (!trimmed) return { success: true, data: [] };

    let orConditions = `dong.ilike.%${trimmed}%,sigungu.ilike.%${trimmed}%,sido.ilike.%${trimmed}%,building_name.ilike.%${trimmed}%,detail_addr.ilike.%${trimmed}%`;
    if (/^\d+$/.test(trimmed)) {
      orConditions += `,vacancy_no.eq.${trimmed}`;
    }
    orConditions += `,metadata->>cltrMngNo.ilike.%${trimmed}%,metadata->>cltr_mng_no.ilike.%${trimmed}%`;

    const { data, error } = await supabase
      .from('vacancies')
      .select('*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)')
      .neq('status', 'DELETED')
      .or(orConditions)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const withImages = data?.map(v => ({ ...v, images: v.vacancy_photos ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url) : [] })) || [];
    return { success: true, data: withImages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 특정 회원의 공실 목록 조회 (기자 프로필용, role 무관하게 항상 owner_id 필터) ──
export async function getVacanciesByOwnerId(ownerId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('vacancies')
      .select('*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)')
      .eq('owner_id', ownerId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const withImages = data?.map(v => ({
      ...v,
      images: v.vacancy_photos
        ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
        : [],
    })) || [];

    return { success: true, data: withImages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── AI 매물 상세페이지 (Flyer) 저장/삭제 ──
export async function saveVacancyFlyer(vacancyId: string, flyerState: any, type: 'flyer' | 'report' = 'flyer') {
  const supabase = getAdminClient();
  try {
    if (flyerState === null) {
      const { data: existing } = await supabase
        .from('vacancy_flyers')
        .select('flyer_state')
        .eq('vacancy_id', vacancyId)
        .maybeSingle();

      if (existing && existing.flyer_state) {
        let stateObj = { ...existing.flyer_state };
        if (stateObj.flyer !== undefined || stateObj.report !== undefined) {
          stateObj[type] = null;
          if (stateObj.flyer === null && stateObj.report === null) {
            const { error: deleteFlyerError } = await supabase
              .from('vacancy_flyers')
              .delete()
              .eq('vacancy_id', vacancyId);
            if (deleteFlyerError) return { success: false, error: deleteFlyerError.message };
          } else {
            const { error: updateError } = await supabase
              .from('vacancy_flyers')
              .update({ flyer_state: stateObj, updated_at: new Date().toISOString() })
              .eq('vacancy_id', vacancyId);
            if (updateError) return { success: false, error: updateError.message };
          }
        } else {
          // Legacy format deletion
          const { error: deleteFlyerError } = await supabase
            .from('vacancy_flyers')
            .delete()
            .eq('vacancy_id', vacancyId);
          if (deleteFlyerError) return { success: false, error: deleteFlyerError.message };
        }
      }

      if (type === 'flyer') {
        const { data: vac, error: fetchError } = await supabase
          .from('vacancies')
          .select('infrastructure')
          .eq('id', vacancyId)
          .maybeSingle();

        if (!fetchError && vac && vac.infrastructure) {
          const infra = { ...vac.infrastructure };
          if ('_flyer_settings' in infra) {
            delete infra._flyer_settings;
            await supabase
              .from('vacancies')
              .update({ infrastructure: infra })
              .eq('id', vacancyId);
          }
        }
      }

      return { success: true };
    }

    const { data: existing } = await supabase
      .from('vacancy_flyers')
      .select('flyer_state')
      .eq('vacancy_id', vacancyId)
      .maybeSingle();

    let finalState: any = {};
    if (existing) {
      let existingState = existing.flyer_state || {};
      if ('flyer' in existingState || 'report' in existingState) {
        finalState = { ...existingState };
      } else {
        // Convert legacy single flyer_state to composite
        finalState = {
          flyer: existingState,
          report: null
        };
      }
      finalState[type] = flyerState;

      const { error } = await supabase
        .from('vacancy_flyers')
        .update({ flyer_state: finalState, updated_at: new Date().toISOString() })
        .eq('vacancy_id', vacancyId);
      if (error) return { success: false, error: error.message };
    } else {
      finalState = {
        flyer: type === 'flyer' ? flyerState : null,
        report: type === 'report' ? flyerState : null
      };
      const { error } = await supabase
        .from('vacancy_flyers')
        .insert({ vacancy_id: vacancyId, flyer_state: finalState });
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


// ── AI 전단지 목록 조회 (고객관리 매칭용) ──
export async function getVacancyFlyers() {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('vacancy_flyers')
      .select('id, vacancy_id, flyer_state, created_at, vacancies(building_name, sido, sigungu, dong, deposit, monthly_rent, trade_type)')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // 실제 등록된 전단지 매핑
    const mapped = data?.map(f => {
      const vacancies = f.vacancies as any;
      const state = f.flyer_state;
      let flyerStateObj = state;
      if (state && typeof state === 'object') {
        if ('flyer' in state) {
          flyerStateObj = state.flyer;
        } else if ('report' in state) {
          flyerStateObj = state.report;
        }
      }
      const title = flyerStateObj?.title || vacancies?.building_name || "이름 없는 전단지";
      const deposit = vacancies?.deposit || 0;
      const monthly_rent = vacancies?.monthly_rent || 0;
      const trade_type = vacancies?.trade_type || "";
      
      let priceText = "";
      if (trade_type === "월세") {
        priceText = `보증금 ${deposit}/${monthly_rent}`;
      } else if (trade_type === "전세") {
        priceText = `전세 ${deposit}`;
      } else if (trade_type === "매매") {
        priceText = `매매 ${deposit}`;
      } else {
        priceText = `금액 ${deposit}`;
      }

      const region = vacancies?.dong || "";

      return {
        id: f.id,
        vacancy_id: f.vacancy_id,
        title: `[전단지] ${title} (${priceText}${region ? ` / ${region}` : ""})`,
        url: `https://www.gongsilnews.com/flyer/${f.vacancy_id}.html`
      };
    });

    return { success: true, data: mapped || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


