"use server"

import { createClient } from "@supabase/supabase-js"

const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'm', 'admin', 'news', 'study', 'biz', 'flyer', 'sites',
  'mail', 'static', 'cdn', 'app', 'support', 'help', 'login', 'signup',
]);

function validateSubdomain(subdomain: string): string | null {
  const value = subdomain.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)) {
    return "주소는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.";
  }
  if (value.length < 2 || value.length > 30) {
    return "주소는 2~30자로 입력해 주세요.";
  }
  if (RESERVED_SUBDOMAINS.has(value)) {
    return "공실뉴스 서비스에서 사용하는 예약 주소입니다.";
  }
  return null;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * DB 한 줄을 화면이 쓰는 모양으로 편다.
 *
 * 이 테이블은 상호·로고·전화처럼 오래된 값은 각자 컬럼에 그대로 두고,
 * 첫 화면 슬라이드·섹션 on/off 처럼 자주 늘어나는 설정만 design_settings(JSONB)
 * 안의 intake 에 모아 둔다. 설정이 하나 늘 때마다 컬럼을 만들지 않아도 된다.
 *
 * 한때 settings 라는 JSONB 한 칸에 전부 몰아넣는 안이 있었으나(sql/migrate_homepage_settings.sql)
 * 롤백 스크립트로 되돌려져 그 컬럼은 DB에 없다. 코드만 남아 있어서 저장이 통째로
 * 실패하고 있었다 — 여기 있는 컬럼에 맞춘다.
 */
function flattenRow(row: any) {
  const ds = row?.design_settings || {};
  const subdomainChange = ds.subdomain_change || {};
  return {
    id: row.id,
    owner_id: row.owner_id,
    subdomain: row.subdomain,
    subdomain_change_count: Math.max(Number(row.subdomain_change_count || 0), Number(subdomainChange.count || 0)),
    subdomain_changed_at: row.subdomain_changed_at || subdomainChange.changed_at || null,
    is_active: row.is_active,
    created_at: row.created_at,
    theme_name: row.theme_name || null,
    logo_url: row.logo_url || null,
    favicon_url: row.favicon_url || null,
    site_title: row.site_title || null,
    contact_phone: row.contact_phone || null,
    company_intro: row.company_intro || null,
    intake: ds.intake || {},
  };
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

    return { success: true, data: flattenRow(data) };
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
  /** 중개사 홈페이지 설정 (색상·사진·문구·섹션·받을 항목) */
  intake?: {
    theme_color?: string;
    brand_mode?: "text" | "logo" | "both";
    logo_size?: "small" | "medium" | "large";
    /** 첫 화면 슬라이드 (최대 3장). 사진이나 유튜브를 깔고 문구를 따로 얹는다 */
    hero_slides?: {
      image?: string;
      youtube?: string;
      title?: string;
      highlight?: string;
      desc?: string;
    }[];
    /** 슬라이드가 생기기 전에 쓰던 낱개 값. 읽을 때 1번 슬라이드로 옮긴다 */
    hero_image?: string | null;
    hero_title?: string;
    hero_highlight?: string;
    hero_desc?: string;
    cta_label?: string;
    /** 섹션 노출. 내용이 없으면 켜 두어도 화면에서 자동으로 빠진다 */
    show_vacancy?: boolean;
    show_article?: boolean;
    show_location?: boolean;
    show_seeking?: boolean;
    show_photos?: boolean;
    show_budget?: boolean;
    show_notes?: boolean;
  };
}) {
  const supabase = getAdminClient();
  try {
    // 1. 서브도메인 유효성 검사
    if (inputData.subdomain) {
      const validationError = validateSubdomain(inputData.subdomain);
      if (validationError) return { success: false, error: validationError };
    }

    // 2. design_settings 안에 이미 들어있던 설정을 먼저 가져온다
    const { data: existingData } = await supabase
      .from('homepage_settings')
      .select('subdomain, design_settings')
      .eq('owner_id', ownerId)
      .maybeSingle();

    const ds = existingData?.design_settings || {};

    if (existingData?.subdomain && existingData.subdomain !== inputData.subdomain) {
      return { success: false, error: "공개된 홈페이지 주소는 일반 저장으로 변경할 수 없습니다. 기본설정의 주소 변경 버튼을 이용해 주세요." };
    }

    // 3. 넘어온 키만 덮어쓴다. 편집기가 일부만 저장해도 나머지가 날아가지 않는다.
    const payload: Record<string, any> = {
      owner_id: ownerId,
      subdomain: inputData.subdomain,
      design_settings: {
        ...ds,
        intake: { ...(ds.intake || {}), ...(inputData.intake || {}) },
      },
    };
    if (inputData.is_active !== undefined) payload.is_active = inputData.is_active;
    if (inputData.theme_name !== undefined) payload.theme_name = inputData.theme_name;
    if (inputData.logo_url !== undefined) payload.logo_url = inputData.logo_url;
    if (inputData.favicon_url !== undefined) payload.favicon_url = inputData.favicon_url;
    if (inputData.site_title !== undefined) payload.site_title = inputData.site_title;
    if (inputData.contact_phone !== undefined) payload.contact_phone = inputData.contact_phone;
    if (inputData.company_intro !== undefined) payload.company_intro = inputData.company_intro;

    // 4. 회원당 한 줄이므로 owner_id 로 겹치면 갱신한다
    const { error } = await supabase
      .from('homepage_settings')
      .upsert(payload, { onConflict: 'owner_id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 서브도메인으로 홈페이지 설정 및 프로필 조회 (공개 서비스용) ──
export async function getHomepageSettingsBySubdomain(subdomain: string) {
  const supabase = getAdminClient();
  try {
    const { data: hs, error } = await supabase
      .from('homepage_settings')
      // is_active 로 거르지 않는다. 걸러버리면 "없는 주소"와 "닫힌 홈페이지"가
      // 똑같이 빈 결과로 와서 둘을 구분할 수 없다.
      .select('*')
      .eq('subdomain', subdomain)
      .maybeSingle();

    // 없는 주소인지, 닫힌 홈페이지인지 구분해서 알려준다. 화면이 다르고,
    // 검색엔진에 돌려줄 답(404 / 503)도 다르다.
    if (error || !hs) return { success: false, reason: "not_found" as const, error: "존재하지 않는 주소입니다." };
    if (hs.is_active === false) {
      return { success: false, reason: "paused" as const, error: "일시적으로 중단된 페이지입니다." };
    }

    // 회원 정보 조회
    const { data: member } = await supabase
      .from('members')
      .select('id, name, email, role, phone, plan_type, plan_end_date, profile_image_url, sns_links')
      .eq('id', hs.owner_id)
      .single();

    if (!member) return { success: false, reason: "not_found" as const, error: "회원 정보를 찾을 수 없습니다." };

    // 요금제 혜택 등급 검사
    const isPremium =
      member.role === 'SUPER_ADMIN' ||
      member.role === 'ADMIN' ||
      member.role === '최고관리자' ||
      ((member.plan_type === 'news_premium' ||
        member.plan_type === 'vacancy_premium' ||
        member.plan_type === 'biz_premium') &&
        (!member.plan_end_date || new Date(member.plan_end_date) >= new Date()));

    if (!isPremium) {
      return { success: false, reason: "paused" as const, error: "일시적으로 중단된 페이지입니다." };
    }

    let companyProfile: any = null;

    if (member.role === 'REALTOR') {
      const { data: agency } = await supabase
        .from('agencies')
        .select('*')
        .eq('owner_id', hs.owner_id)
        .single();
      companyProfile = agency || null;
    } else if (member.role === 'BIZ') {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', hs.owner_id)
        .single();
      companyProfile = biz || null;
    }

    const flatSettings = {
      ...flattenRow(hs),
      theme_name: hs.theme_name || "template01",
    };

    return {
      success: true,
      data: {
        settings: flatSettings,
        member,
        companyProfile
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 서브도메인 중복 검사 ──
export async function checkSubdomainAvailable(subdomain: string, ownerId?: string) {
  const supabase = getAdminClient();
  try {
    const validationError = validateSubdomain(subdomain);
    if (validationError) return { success: true, available: false, error: validationError };

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

export async function changeHomepageSubdomain(ownerId: string, requestedSubdomain: string) {
  const supabase = getAdminClient();
  const next = requestedSubdomain.trim().toLowerCase();
  const validationError = validateSubdomain(next);
  if (validationError) return { success: false, error: validationError };

  try {
    const { data: homepage, error: homepageError } = await supabase
      .from('homepage_settings')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (homepageError) {
      return { success: false, error: homepageError.message };
    }
    if (!homepage?.subdomain) {
      return { success: false, error: "먼저 홈페이지 주소를 최초 설정해 주세요." };
    }
    if (homepage.subdomain === next) {
      return { success: false, error: "현재 사용 중인 주소와 같습니다." };
    }

    const availability = await checkSubdomainAvailable(next, ownerId);
    if (!availability.success || !availability.available) {
      return { success: false, error: availability.error || "이미 사용 중인 주소입니다." };
    }

    // 변경 이력은 기존 DB에서도 즉시 작동하도록 이미 존재하는 design_settings에 저장한다.
    // 전용 컬럼 마이그레이션이 적용된 환경에서는 그 값도 함께 읽어 이전 기록을 보존한다.
    const designSettings = homepage.design_settings || {};
    const storedChange = designSettings.subdomain_change || {};
    const changeCount = Math.max(
      Number(homepage.subdomain_change_count || 0),
      Number(storedChange.count || 0),
    );
    const lastChangedAt = homepage.subdomain_changed_at || storedChange.changed_at || null;
    if (changeCount >= 3 && lastChangedAt) {
      const nextAllowedAt = new Date(lastChangedAt);
      nextAllowedAt.setMonth(nextAllowedAt.getMonth() + 3);
      if (nextAllowedAt > new Date()) {
        return {
          success: false,
          error: `${nextAllowedAt.toLocaleDateString('ko-KR')}부터 다시 변경할 수 있습니다.`,
          nextAllowedAt: nextAllowedAt.toISOString(),
        };
      }
    }

    const changedAt = new Date().toISOString();
    const nextChangeCount = changeCount + 1;
    const { data: updated, error } = await supabase
      .from('homepage_settings')
      .update({
        subdomain: next,
        design_settings: {
          ...designSettings,
          subdomain_change: {
            count: nextChangeCount,
            changed_at: changedAt,
          },
        },
      })
      .eq('owner_id', ownerId)
      .eq('subdomain', homepage.subdomain)
      .select('subdomain')
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!updated) return { success: false, error: "주소가 다른 곳에서 먼저 변경되었습니다. 새로고침 후 다시 시도해 주세요." };
    return { success: true, subdomain: next, changeCount: nextChangeCount, changedAt };
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
/**
 * 스토리지 키로 쓸 수 있는 글자만 남긴다.
 *
 * 사람들이 올리는 파일은 "ChatGPT Image 2026년 9월 20일 오후 06_10_48.png" 처럼
 * 한글과 공백이 섞여 있고, 그대로 키로 쓰면 스토리지가 Invalid key 로 거절한다.
 * 부르는 쪽에서 이미 안전한 이름을 만들지만, 한 곳이라도 빠뜨리면 같은 사고가 나므로
 * 여기서 한 번 더 거른다.
 */
function safeStoragePath(path: string): string {
  return path
    .split('/')
    .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_'))
    .filter(Boolean)
    .join('/');
}

export async function uploadHomepageFile(formData: FormData) {
  const file = formData.get('file') as File;
  const rawPath = formData.get('path') as string;

  if (!file || !rawPath) {
    return { success: false, error: "파일 또는 경로가 누락되었습니다." };
  }

  const path = safeStoragePath(rawPath);
  if (!path) return { success: false, error: "저장 경로를 만들 수 없습니다." };

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
