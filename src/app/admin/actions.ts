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
        signup_completed: true,
        plan_type: formData.get("plan_type") as string || 'free',
        plan_start_date: formData.get("plan_start_date") as string || null,
        plan_end_date: formData.get("plan_end_date") as string || null,
        max_vacancies: parseInt(formData.get("max_vacancies") as string || "5", 10),
        max_articles_per_month: parseInt(formData.get("max_articles_per_month") as string || "0", 10)
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
  plan_type?: string;
  plan_start_date?: string | null;
  plan_end_date?: string | null;
  max_vacancies?: number;
  max_articles_per_month?: number;
  profile_image_url?: string | null;
}) {
  const supabaseAdmin = getAdminClient();
  try {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.sns_links !== undefined) dbUpdates.sns_links = updates.sns_links;
    if (updates.plan_type !== undefined) dbUpdates.plan_type = updates.plan_type;
    if (updates.plan_start_date !== undefined) dbUpdates.plan_start_date = updates.plan_start_date;
    if (updates.plan_end_date !== undefined) dbUpdates.plan_end_date = updates.plan_end_date;
    if (updates.max_vacancies !== undefined) dbUpdates.max_vacancies = updates.max_vacancies;
    if (updates.max_articles_per_month !== undefined) dbUpdates.max_articles_per_month = updates.max_articles_per_month;
    if (updates.profile_image_url !== undefined) dbUpdates.profile_image_url = updates.profile_image_url;

    const { error } = await supabaseAdmin.from('members').update(dbUpdates).eq('id', memberId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 요금제 및 한도 일괄 변경 ──
export async function adminBulkUpdatePlanAndLimits(
  memberIds: string[], 
  updates: {
    plan_type?: string;
    plan_start_date?: string | null;
    plan_end_date?: string | null;
    max_vacancies?: number;
    max_articles_per_month?: number;
  }
) {
  const supabaseAdmin = getAdminClient();
  try {
    const dbUpdates: any = {};
    if (updates.plan_type !== undefined) dbUpdates.plan_type = updates.plan_type;
    if (updates.plan_start_date !== undefined) dbUpdates.plan_start_date = updates.plan_start_date;
    if (updates.plan_end_date !== undefined) dbUpdates.plan_end_date = updates.plan_end_date;
    if (updates.max_vacancies !== undefined) dbUpdates.max_vacancies = updates.max_vacancies;
    if (updates.max_articles_per_month !== undefined) dbUpdates.max_articles_per_month = updates.max_articles_per_month;

    const { error } = await supabaseAdmin.from('members').update(dbUpdates).in('id', memberIds);
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
    const { data: members, error } = await supabaseAdmin.from('members').select('*, agencies(*)').order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };

    const { data: vacancies } = await supabaseAdmin.from('vacancies').select('id, owner_id');
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: articles } = await supabaseAdmin.from('articles').select('id, author_id').gte('created_at', firstDayOfMonth).eq('is_deleted', false);

    const data = members.map((m: any) => {
      const vCount = vacancies?.filter((v: any) => v.owner_id === m.id).length || 0;
      const aCount = articles?.filter((a: any) => a.author_id === m.id).length || 0;
      
      let homepage_id = '';
      if (m.agencies) {
         const ag = Array.isArray(m.agencies) ? m.agencies[0] : m.agencies;
         if (ag) {
           homepage_id = ag.homepage_id || ag.subdomain || ag.domain || ag.site_id || '';
         }
      }

      return {
        ...m,
        vacancies_count: vCount,
        articles_count: aCount,
        homepage_id
      }
    });

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 개별 회원 상세 조회 (편집용) ──
export async function adminGetMemberDetail(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    const { data: member, error: memberError } = await supabaseAdmin.from('members').select('*').eq('id', memberId).single();
    if (memberError) {
      console.error("adminGetMemberDetail memberError:", memberError);
      return { success: false, error: memberError.message };
    }

    let agency = null;
    if (member.role === 'REALTOR' || member.role === '부동산회원') {
      const { data: agencyData } = await supabaseAdmin.from('agencies').select('*').eq('owner_id', memberId).single();
      if (agencyData) agency = agencyData;
    }

    const countRes = await supabaseAdmin.from('members').select('*', { count: 'exact', head: true }).lte('created_at', member.created_at);
    if (countRes.error) {
      console.error("adminGetMemberDetail countError:", countRes.error);
    }
    const count = countRes.count;
    member.memberNumber = String(count || 1).padStart(6, '0');

    return { success: true, member, agency };
  } catch (error: any) {
    console.error("adminGetMemberDetail catch block error:", error);
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
    // 1. 연관된 데이터 우선 삭제 (외래키 제약조건 방지)
    await supabaseAdmin.from('vacancies').delete().eq('owner_id', memberId);
    await supabaseAdmin.from('agencies').delete().eq('owner_id', memberId);

    // 2. members 테이블에서 삭제
    const { error: dbError } = await supabaseAdmin.from('members').delete().eq('id', memberId);
    if (dbError) return { success: false, error: dbError.message };

    // 3. Supabase Auth 사용자 삭제 (완전한 계정 삭제)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(memberId);
    if (authError) console.error("Auth User 삭제 실패:", authError.message); // Auth 삭제 실패해도 멤버 DB는 삭제됨

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 대시보드 통계 및 최근 데이터 조회 ──
export async function adminGetDashboardData() {
  const supabaseAdmin = getAdminClient();
  try {
    const { count: vacanciesCount } = await supabaseAdmin.from('vacancies').select('*', { count: 'exact', head: true });
    const { count: membersCount } = await supabaseAdmin.from('members').select('*', { count: 'exact', head: true });
    const { count: articlesCount } = await supabaseAdmin.from('articles').select('*', { count: 'exact', head: true });
    
    const [{ count: ac }, { count: vc }, { count: bc }] = await Promise.all([
      supabaseAdmin.from('article_comments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('vacancy_comments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('board_comments').select('*', { count: 'exact', head: true }),
    ]);
    const commentsCount = (ac || 0) + (vc || 0) + (bc || 0);

    const { data: recentVacancies } = await supabaseAdmin.from('vacancies')
      .select('id, trade_type, address, price, contact, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentMembers } = await supabaseAdmin.from('members')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 댓글은 3개 테이블에서 5개씩 가져와서 JS 단에서 정렬 후 5개 추출
    const [{ data: acData }, { data: vcData }, { data: bcData }] = await Promise.all([
      supabaseAdmin.from('article_comments').select('id, content, created_at, article_id, is_secret').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('vacancy_comments').select('id, content, created_at, vacancy_id, is_secret').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('board_comments').select('id, content, created_at, board_id, is_secret').order('created_at', { ascending: false }).limit(5),
    ]);
    
    let comments = [
      ...(acData || []).map(c => ({ ...c, type: 'article', sourceId: c.article_id })),
      ...(vcData || []).map(c => ({ ...c, type: 'vacancy', sourceId: c.vacancy_id })),
      ...(bcData || []).map(c => ({ ...c, type: 'board', sourceId: c.board_id }))
    ];
    comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recentComments = comments.slice(0, 5);

    return { 
      success: true, 
      stats: { vacanciesCount, membersCount, articlesCount, commentsCount },
      recentVacancies: recentVacancies || [],
      recentMembers: recentMembers || [],
      recentComments
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
