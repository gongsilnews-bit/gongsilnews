"use server"

import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function adminCreateMember(formData: FormData) {
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const role = formData.get("role") as string;

  if (!email || !name || !role) {
    return { success: false, error: "필수 항목을 입력해주세요." };
  }

  const supabaseAdmin = getAdminClient();

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: { full_name: name },
      password: 'Gongsilnews123!'
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        return { success: false, error: "이미 가입된 이메일입니다." };
      }
      return { success: false, error: authError.message };
    }

    if (authData.user) {
      let sns_links = {};
      try { sns_links = JSON.parse(formData.get("sns_links") as string || "{}"); } catch(e) {}
      
      const { error: memberError } = await supabaseAdmin.from('members').upsert({
        id: authData.user.id,
        email, name, phone,
        role: role === '최고관리자' ? 'ADMIN' : role === '부동산회원' ? 'REALTOR' : 'USER',
        sns_links,
        signup_completed: true
      }, { onConflict: 'id' });
      if (memberError) return { success: false, error: memberError.message };
    }

    return { success: true, userId: authData.user?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 회원 정보 수정 ──
export async function adminUpdateMember(memberId: string, updates: {
  name?: string;
  phone?: string;
  role?: string;
  sns_links?: Record<string, any>;
}) {
  const supabaseAdmin = getAdminClient();
  try {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.sns_links !== undefined) dbUpdates.sns_links = updates.sns_links;

    const { error } = await supabaseAdmin.from('members').update(dbUpdates).eq('id', memberId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 중개업소 정보 수정/생성 ──
export async function adminUpdateAgency(memberId: string, agencyData: any) {
  const supabaseAdmin = getAdminClient();
  try {
    const { data: existing } = await supabaseAdmin
      .from('agencies').select('id').eq('owner_id', memberId).single();

    if (existing) {
      const { error } = await supabaseAdmin.from('agencies').update(agencyData).eq('owner_id', memberId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from('agencies').insert({ owner_id: memberId, ...agencyData });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 관리자 권한 파일 업로드 ──
export async function adminUploadAgencyDocument(formData: FormData) {
  const file = formData.get('file') as File;
  const path = formData.get('path') as string;
  
  if (!file || !path) {
    return { success: false, error: "파일 또는 경로가 누락되었습니다." };
  }

  const supabaseAdmin = getAdminClient();
  try {
    const { data, error } = await supabaseAdmin.storage.from('agency_documents').upload(path, file, { upsert: true });
    if (error) {
      return { success: false, error: error.message };
    }
    const { data: urlData } = supabaseAdmin.storage.from('agency_documents').getPublicUrl(path);
    return { success: true, url: urlData.publicUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 모든 회원 목록 조회 ──
export async function adminGetMembers() {
  const supabaseAdmin = getAdminClient();
  try {
    const { data: members, error } = await supabaseAdmin.from('members').select('*, agencies(status)').order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: members };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 개별 회원 상세 조회 (편집용) ──
export async function adminGetMemberDetail(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    const { data: member, error: memberError } = await supabaseAdmin.from('members').select('*').eq('id', memberId).single();
    if (memberError) return { success: false, error: memberError.message };

    let agency = null;
    if (member.role === 'REALTOR' || member.role === '부동산회원') {
      const { data: agencyData } = await supabaseAdmin.from('agencies').select('*').eq('owner_id', memberId).single();
      if (agencyData) agency = agencyData;
    }

    const { count } = await supabaseAdmin.from('members').select('*', { count: 'exact', head: true }).lte('created_at', member.created_at);
    member.memberNumber = String(count || 1).padStart(6, '0');

    return { success: true, member, agency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 회원 삭제 (Soft Delete) ──
export async function adminSoftDeleteMember(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    const { error } = await supabaseAdmin.from('members').update({ is_deleted: true }).eq('id', memberId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 회원 복구 (Restore) ──
export async function adminRestoreMember(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    const { error } = await supabaseAdmin.from('members').update({ is_deleted: false }).eq('id', memberId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 회원 영구 삭제 (Hard Delete) ──
export async function adminHardDeleteMember(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    const { error } = await supabaseAdmin.from('members').delete().eq('id', memberId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
