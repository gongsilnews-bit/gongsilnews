"use server"

import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// ── 승인된 비즈니스 프로필 조회 (미니홈피용 - 공개) ──
export async function getBusinessProfileById(profileId: string) {
  const supabase = getAdminClient();
  try {
    const { data: profile, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('status', 'APPROVED')
      .single();

    if (error || !profile) return { success: false, error: "업체 정보를 찾을 수 없습니다." };

    // 회원 정보 별도 조회
    const { data: member } = await supabase
      .from('members')
      .select('id, name, email, profile_image_url, plan_type, plan_end_date')
      .eq('id', profile.user_id)
      .single();

    // 요금제 만료 체크
    if (member?.plan_type !== 'biz_premium') {
      return { success: false, error: "미니홈피 이용 권한이 없는 회원입니다." };
    }
    if (member?.plan_end_date && new Date(member.plan_end_date) < new Date()) {
      return { success: false, error: "미니홈피 이용 기간이 만료되었습니다." };
    }

    return { success: true, data: { ...profile, members: member } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── user_id로 비즈니스 프로필 조회 ──
export async function getBusinessProfileByUserId(userId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'APPROVED')
      .single();

    if (error) return { success: false, error: "업체 정보를 찾을 수 없습니다." };
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 해당 업체(회원)가 작성한 기사 목록 ──
export async function getBusinessArticles(userId: string, limit: number = 20) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, summary, thumbnail_url, views, created_at, category')
      .eq('author_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 승인된 전체 비즈니스 프로필 목록 (디렉토리용) ──
export async function getApprovedBusinessProfiles() {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('id, company_name, business_type, description, logo_url, address')
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
