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
export async function getVacancies(options?: {
  ownerId?: string;
  status?: string;
  all?: boolean;
}) {
  const supabase = getAdminClient();
  try {
    // 리스트와 마커에 필요한 필수 컬럼만 가져옵니다. 
    // infrastructure, description 같이 무거운 JSON/TEXT 컬럼 제외.
    // 임시 원복: 컬럼 오류 방지를 위해 전체 조회( * )로 되돌림
    const selectedColumns = 'id, vacancy_no, status, property_type, sub_category, trade_type, deposit, monthly_rent, maintenance_fee, commission_type, supply_m2, supply_py, exclusive_m2, exclusive_py, room_count, bath_count, direction, current_floor, total_floor, parking, move_in_date, sido, sigungu, dong, detail_addr, building_name, lat, lng, created_at, owner_id, owner_role, realtor_commission, owner_relation, client_name, client_phone, approval_year, total_units, options, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, agencies(*)), vacancy_photos(url, sort_order)';

    let query = supabase
      .from('vacancies')
      .select('*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)')
      .order('created_at', { ascending: false });

    // 역할별 필터
    if (options?.ownerId && !options?.all) {
      const { data: user } = await supabase.from('members').select('role').eq('id', options.ownerId).single();
      if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN' && user?.role !== '최고관리자') {
        query = query.eq('owner_id', options.ownerId);
      }
    }

    // 상태 필터 (삭제된 것 제외)
    if (options?.status) {
      query = query.eq('status', options.status);
    } else {
      query = query.neq('status', 'DELETED');
    }

    const { data, error } = await query;
    if (error) {
      console.error("DEBUG SUPABASE ERROR:", error);
      return { success: false, error: error.message };
    }
    
    // Lazy Loading 최적화: 브라우저 전송 시 병목을 막기 위해 무거운 데이터 제거
    // (상세 내용은 getVacancyDetail 호출로 조회됩니다.)
    const lightData = data?.map(v => {
      const { infrastructure, description, ...rest } = v;
      return rest;
    });

    return { success: true, data: lightData || [] };
  } catch (error: any) {
    console.error("DEBUG TRY/CATCH ERROR:", error);
    return { success: false, error: error.message };
  }
}

export async function getVacancyCountByKeyword(keyword: string) {
  const supabase = getAdminClient();
  try {
    const { count, error } = await supabase
      .from('vacancies')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'DELETED')
      .or(`dong.ilike.%${keyword}%,sigungu.ilike.%${keyword}%,sido.ilike.%${keyword}%,building_name.ilike.%${keyword}%,detail_addr.ilike.%${keyword}%`);

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


export async function getVacanciesForMap(options?: any) {
  const supabase = getAdminClient();
  try {
    let query = supabase.from('vacancies').select('*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)').eq('status', 'ACTIVE').not('lat', 'is', null).not('lng', 'is', null).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const lightData = data?.map(v => {
      const { infrastructure, description, ...rest } = v;
      return rest;
    });

    return { success: true, data: lightData || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getVacancyListByKeyword(keyword: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase.from('vacancies').select('*, members!vacancies_owner_id_fkey(name, email, role, phone, sns_links, profile_image_url, agencies(*)), vacancy_photos(url, sort_order)').neq('status', 'DELETED').or(`dong.ilike.%${keyword}%,sigungu.ilike.%${keyword}%,sido.ilike.%${keyword}%,building_name.ilike.%${keyword}%,detail_addr.ilike.%${keyword}%`).order('created_at', { ascending: false });
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
export async function saveVacancyFlyer(vacancyId: string, flyerState: any) {
  const supabase = getAdminClient();
  try {
    if (flyerState === null) {
      const { error } = await supabase
        .from('vacancy_flyers')
        .delete()
        .eq('vacancy_id', vacancyId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const { data: existing } = await supabase
      .from('vacancy_flyers')
      .select('id')
      .eq('vacancy_id', vacancyId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('vacancy_flyers')
        .update({ flyer_state: flyerState, updated_at: new Date().toISOString() })
        .eq('vacancy_id', vacancyId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('vacancy_flyers')
        .insert({ vacancy_id: vacancyId, flyer_state: flyerState });
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
      const title = f.flyer_state?.title || vacancies?.building_name || "이름 없는 전단지";
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

