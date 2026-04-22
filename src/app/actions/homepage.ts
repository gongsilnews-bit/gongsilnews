"use server"

import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// ── 홈페이지 설정 조회 ──
export async function getHomepageSettings(ownerId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('homepage_settings')
      .select('*')
      .eq('owner_id', ownerId)
      .single();

    if (error && error.code === 'PGRST116') {
      return { success: true, data: null };
    }
    if (error) return { success: false, error: error.message };

    // JSONB(settings)에 들어있는 값들을 예전 화면(프론트엔드)이 인식할 수 있게 평탄화(Flatten)해서 내려줌
    // 이렇게 하면 프론트엔드 코드를 당장 전부 뜯어고칠 필요가 없음
    const flatData = {
      id: data.id,
      owner_id: data.owner_id,
      subdomain: data.subdomain,
      is_active: data.is_active,
      created_at: data.created_at,
      ...data.settings // 하위 호환성을 위해 최상위로 속성 전개 (theme_name 등은 이미 직단에 있음)
    };
    
    // 만약 settings 내부에 카테고리별로 깊게 숨은 속성이 있다면 여기서 추출
    const header = data.settings?.header || {};
    const loc = data.settings?.location_map || {};
    const info = data.settings?.company_info_page || {};

    flatData.logo_url = header.logo_url || null;
    flatData.favicon_url = header.favicon_url || null;
    flatData.site_title = header.site_title || null;
    flatData.contact_phone = loc.contact_number || null;
    flatData.company_intro = info.greeting_text || null;
    flatData.theme_name = data.settings?.theme_name || null;

    return { success: true, data: flatData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 홈페이지 설정 저장 (upsert) ──
export async function saveHomepageSettings(ownerId: string, inputData: {
  subdomain: string;
  theme_name: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  site_title?: string;
  contact_phone?: string;
  company_intro?: string;
  is_active?: boolean;
}) {
  const supabase = getAdminClient();
  try {
    // 1. 서브도메인 유효성 검사
    if (inputData.subdomain) {
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
      if (!subdomainRegex.test(inputData.subdomain)) {
        return { success: false, error: "서브도메인은 영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다." };
      }
      if (inputData.subdomain.length < 2 || inputData.subdomain.length > 30) {
        return { success: false, error: "서브도메인은 2~30자로 입력해주세요." };
      }
    }

    // 2. 기존 DB에 저장되어 있던 JSONB(settings) 전체를 먼저 가져옴
    const { data: existingData } = await supabase
      .from('homepage_settings')
      .select('settings')
      .eq('owner_id', ownerId)
      .single();
    
    const cs = existingData?.settings || {}; // 현재 세팅값 (Current Settings)

    // 3. 기존 JSON 구조를 해치지 않으면서(Deep Merge), 이번에 입력된 데이터만 안전하게 덮어쓰기
    const newSettings = {
      ...cs,
      theme_name: inputData.theme_name !== undefined ? inputData.theme_name : cs.theme_name,
      header: {
        ...(cs.header || {}),
        logo_url: inputData.logo_url !== undefined ? inputData.logo_url : cs.header?.logo_url,
        favicon_url: inputData.favicon_url !== undefined ? inputData.favicon_url : cs.header?.favicon_url,
        site_title: inputData.site_title !== undefined ? inputData.site_title : cs.header?.site_title,
      },
      location_map: {
        ...(cs.location_map || {}),
        contact_number: inputData.contact_phone !== undefined ? inputData.contact_phone : cs.location_map?.contact_number,
      },
      company_info_page: {
        ...(cs.company_info_page || {}),
        greeting_text: inputData.company_intro !== undefined ? inputData.company_intro : cs.company_info_page?.greeting_text,
      }
    };

    // 4. DB에는 딱 4개의 핵심 컬럼과 1개의 JSON 컬럼만 넘겨서 저장
    const { error } = await supabase
      .from('homepage_settings')
      .upsert(
        { 
          owner_id: ownerId, 
          subdomain: inputData.subdomain, 
          is_active: inputData.is_active,
          settings: newSettings 
        },
        { onConflict: 'owner_id' }
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 서브도메인 중복 검사 ──
export async function checkSubdomainAvailable(subdomain: string, ownerId?: string) {
  const supabase = getAdminClient();
  try {
    let query = supabase
      .from('homepage_settings')
      .select('id, owner_id')
      .eq('subdomain', subdomain);
    
    // 자기 자신은 제외
    if (ownerId) {
      query = query.neq('owner_id', ownerId);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, available: !data || data.length === 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 버킷 자동 생성 ──
async function ensureBucket(supabase: ReturnType<typeof getAdminClient>, bucketName: string) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.name === bucketName);
  if (!exists) {
    await supabase.storage.createBucket(bucketName, { public: true });
  }
}

// ── 홈페이지 파일 업로드 (로고/파비콘 — WebP 압축 후 전송) ──
export async function uploadHomepageFile(formData: FormData) {
  const file = formData.get('file') as File;
  const path = formData.get('path') as string;

  if (!file || !path) {
    return { success: false, error: "파일 또는 경로가 누락되었습니다." };
  }

  const supabase = getAdminClient();
  try {
    // 버킷이 없으면 자동 생성
    await ensureBucket(supabase, 'homepage_assets');

    const { data, error } = await supabase.storage
      .from('homepage_assets')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return { success: false, error: error.message };

    const { data: urlData } = supabase.storage
      .from('homepage_assets')
      .getPublicUrl(path);

    return { success: true, url: urlData.publicUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
