"use server"

import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' });
      }
    }
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
}) {
  const supabase = getAdminClient();

  try {
    // 역할에 따라 초기 상태 결정
    const status = data.owner_role === 'USER' ? 'PENDING' : 'ACTIVE';

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

// ── 공실 목록 조회 ──
export async function getVacancies(options?: {
  ownerId?: string;
  status?: string;
  all?: boolean;
}) {
  const supabase = getAdminClient();
  try {
    let query = supabase
      .from('vacancies')
      .select('*, members!vacancies_owner_id_fkey(name, email, role), vacancy_photos(url, sort_order)')
      .order('created_at', { ascending: false });

    // 역할별 필터
    if (options?.ownerId && !options?.all) {
      query = query.eq('owner_id', options.ownerId);
    }

    // 상태 필터 (삭제된 것 제외)
    if (options?.status) {
      query = query.eq('status', options.status);
    } else {
      query = query.neq('status', 'DELETED');
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 공실 상세 조회 ──
export async function getVacancyDetail(vacancyId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('vacancies')
      .select('*')
      .eq('id', vacancyId)
      .single();

    if (error) return { success: false, error: error.message };

    // 사진 조회
    const { data: photos } = await supabase
      .from('vacancy_photos')
      .select('*')
      .eq('vacancy_id', vacancyId)
      .order('sort_order', { ascending: true });

    return { success: true, data, photos: photos || [] };
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
    let query = supabase.from('vacancies').select('id, property_type, trade_type, deposit, monthly_rent, exclusive_m2, supply_m2, direction, room_count, bath_count, commission_comment, commission_type, lat, lng, options, dong, building_name, hosu, address, title, client_phone, landlord_phone, status, vacancy_no, created_at, realtor_commission, members!vacancies_owner_id_fkey(phone), vacancy_photos(url, sort_order)').eq('status', 'ACTIVE').not('lat', 'is', null).not('lng', 'is', null).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
