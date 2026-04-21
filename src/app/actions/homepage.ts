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
      // 데이터 없음 (최초)
      return { success: true, data: null };
    }
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 홈페이지 설정 저장 (upsert) ──
export async function saveHomepageSettings(ownerId: string, data: {
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
    // 서브도메인 유효성 검사
    if (data.subdomain) {
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
      if (!subdomainRegex.test(data.subdomain)) {
        return { success: false, error: "서브도메인은 영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다." };
      }
      if (data.subdomain.length < 2 || data.subdomain.length > 30) {
        return { success: false, error: "서브도메인은 2~30자로 입력해주세요." };
      }
    }

    const { error } = await supabase
      .from('homepage_settings')
      .upsert(
        { owner_id: ownerId, ...data },
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
