"use server"

import { createClient } from "@supabase/supabase-js"
import { unstable_cache } from "next/cache"
import { createClient as createCookieSupabase } from "@/utils/supabase/server"
import { getEffectivePlan } from "@/utils/planCheck"
import { isAdminRole } from "@/utils/permissionCheck"
import { VerifyAgent, type RealtorDocumentInput } from "@/lib/agents/VerifyAgent"

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

      const dbRole = role === '최고관리자' ? 'ADMIN' : role === '부동산회원' ? 'REALTOR' : role === '비즈니스회원' ? 'BIZ' : 'USER';
      const planType = formData.get("plan_type") as string || 'free';
      const useCustomRegistrationLimits = formData.get("use_custom_registration_limits") === "true";
      const { policies } = await adminGetLimitPolicies();
      const defaults = planDefaults(policies, dbRole, planType);
      const registrationLimits = useCustomRegistrationLimits
        ? {
            max_vacancies: parseInt(formData.get("max_vacancies") as string || "0", 10),
            max_articles_per_month: parseInt(formData.get("max_articles_per_month") as string || "0", 10),
            max_lectures: parseInt(formData.get("max_lectures") as string || "0", 10),
          }
        : {
            max_vacancies: defaults.max_vacancies,
            max_articles_per_month: defaults.max_articles_per_month,
            max_lectures: defaults.max_lectures,
          };
      
      const { error: memberError } = await supabaseAdmin.from('members').upsert({
        id: authData.user.id,
        email, name, phone,
        role: dbRole,
        sns_links,
        signup_completed: true,
        plan_type: planType,
        plan_start_date: formData.get("plan_start_date") as string || null,
        plan_end_date: formData.get("plan_end_date") as string || null,
        use_custom_registration_limits: useCustomRegistrationLimits,
        ...registrationLimits,
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
  max_lectures?: number;
  use_custom_registration_limits?: boolean;
  profile_image_url?: string | null;
  can_article_banner?: boolean;
  can_article_vacancy_banner?: boolean;
  can_homepage?: boolean;
  max_hero_slides?: number;
  can_hide_footer_badge?: boolean;
  can_intake_photo?: boolean;
  can_site_logo?: boolean;
  can_hero_video?: boolean;
  can_sns_links?: boolean;
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
    if (updates.profile_image_url !== undefined) dbUpdates.profile_image_url = updates.profile_image_url;
    // 최고관리자가 회원 화면에서 직접 체크한 값. 등급과 무관하게 이 값이 그대로 들어간다.
    if (updates.can_article_banner !== undefined) dbUpdates.can_article_banner = updates.can_article_banner;
    if (updates.can_article_vacancy_banner !== undefined) dbUpdates.can_article_vacancy_banner = updates.can_article_vacancy_banner;
    if (updates.can_homepage !== undefined) dbUpdates.can_homepage = updates.can_homepage;
    if (updates.max_hero_slides !== undefined) dbUpdates.max_hero_slides = updates.max_hero_slides;
    if (updates.can_hide_footer_badge !== undefined) dbUpdates.can_hide_footer_badge = updates.can_hide_footer_badge;
    if (updates.can_intake_photo !== undefined) dbUpdates.can_intake_photo = updates.can_intake_photo;
    if (updates.can_site_logo !== undefined) dbUpdates.can_site_logo = updates.can_site_logo;
    if (updates.can_hero_video !== undefined) dbUpdates.can_hero_video = updates.can_hero_video;
    if (updates.can_sns_links !== undefined) dbUpdates.can_sns_links = updates.can_sns_links;

    const { data: currentMember, error: currentMemberError } = await supabaseAdmin
      .from('members')
      .select('role, plan_type, use_custom_registration_limits')
      .eq('id', memberId)
      .single();
    if (currentMemberError) return { success: false, error: currentMemberError.message };

    const nextRole = updates.role ?? currentMember.role;
    let nextPlanType = updates.plan_type ?? currentMember.plan_type;
    if (updates.role === 'USER') nextPlanType = 'free';
    if (updates.role === 'BIZ') nextPlanType = 'biz_premium';

    const useCustomRegistrationLimits = updates.use_custom_registration_limits
      ?? !!currentMember.use_custom_registration_limits;
    if (updates.use_custom_registration_limits !== undefined) {
      dbUpdates.use_custom_registration_limits = updates.use_custom_registration_limits;
    }

    const isManagedGrade = nextRole === 'USER' || nextRole === 'BIZ' || nextRole === 'REALTOR';
    const gradeChanged = updates.role !== undefined || updates.plan_type !== undefined;
    const registrationLimitsSubmitted = updates.max_vacancies !== undefined
      || updates.max_articles_per_month !== undefined
      || updates.max_lectures !== undefined;

    if (isManagedGrade && (gradeChanged || registrationLimitsSubmitted || updates.use_custom_registration_limits !== undefined)) {
      const { policies } = await adminGetLimitPolicies();
      if (updates.role === 'USER') dbUpdates.plan_type = 'free';
      if (updates.role === 'BIZ') dbUpdates.plan_type = 'biz_premium';

      const defaults = planDefaults(policies, nextRole, nextPlanType);

      // 회원별 적용일 때만 입력값을 저장한다. 등급별 적용이면 직접 전달된 숫자가 있어도
      // 현재 등급의 최신 기본값으로 고정해 화면 우회 요청으로 예외값이 생기지 않게 한다.
      if (useCustomRegistrationLimits) {
        if (updates.max_vacancies !== undefined) dbUpdates.max_vacancies = updates.max_vacancies;
        if (updates.max_articles_per_month !== undefined) dbUpdates.max_articles_per_month = updates.max_articles_per_month;
        if (updates.max_lectures !== undefined) dbUpdates.max_lectures = updates.max_lectures;
      } else {
        dbUpdates.max_vacancies = defaults.max_vacancies;
        dbUpdates.max_articles_per_month = defaults.max_articles_per_month;
        dbUpdates.max_lectures = defaults.max_lectures;
      }

      // 등급이나 요금제가 바뀔 때만 나머지 권한도 새 등급 기본값으로 채운다.
      if (gradeChanged) {
        if (updates.can_article_banner === undefined) dbUpdates.can_article_banner = defaults.can_article_banner;
        if (updates.can_article_vacancy_banner === undefined) dbUpdates.can_article_vacancy_banner = defaults.can_article_vacancy_banner;
        if (updates.can_homepage === undefined) dbUpdates.can_homepage = defaults.can_homepage;
        if (updates.max_hero_slides === undefined) dbUpdates.max_hero_slides = defaults.max_hero_slides;
        if (updates.can_hide_footer_badge === undefined) dbUpdates.can_hide_footer_badge = defaults.can_hide_footer_badge;
        if (updates.can_intake_photo === undefined) dbUpdates.can_intake_photo = defaults.can_intake_photo;
        if (updates.can_site_logo === undefined) dbUpdates.can_site_logo = defaults.can_site_logo;
        if (updates.can_hero_video === undefined) dbUpdates.can_hero_video = defaults.can_hero_video;
        if (updates.can_sns_links === undefined) dbUpdates.can_sns_links = defaults.can_sns_links;
      }

      if (updates.role === 'USER') {
        // Update agencies and business_profiles status to REJECTED
        await supabaseAdmin.from('agencies').update({ status: 'REJECTED', reject_reason: '관리자에 의한 일반회원 전환' }).eq('owner_id', memberId);
        await supabaseAdmin.from('business_profiles').update({ status: 'REJECTED', rejection_reason: '관리자에 의한 일반회원 전환', updated_at: new Date().toISOString() }).eq('user_id', memberId);
      }
    } else {
      // 최고관리자 등 등급 정책 대상이 아닌 회원은 전달받은 숫자를 그대로 저장한다.
      if (updates.max_vacancies !== undefined) dbUpdates.max_vacancies = updates.max_vacancies;
      if (updates.max_articles_per_month !== undefined) dbUpdates.max_articles_per_month = updates.max_articles_per_month;
      if (updates.max_lectures !== undefined) dbUpdates.max_lectures = updates.max_lectures;
    }

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

// ── 중개사무소 1곳 = 부동산 신청 1개 (2026-10-03) ──
// 구글 아이디를 여러 개 만들어 같은 사무소로 무료 가입하는 것을 막는다.
// 기준은 중개사무소 개설등록번호(법으로 사무소마다 하나) — 띄어쓰기·하이픈·"제/호" 를 떼고 숫자만 비교한다.
// 이미 가입한 계정은 건드리지 않는다: 새로 신청하거나 등록번호를 바꿀 때만 검사한다.
const ACTIVE_AGENCY_STATUSES = ['PENDING', 'APPROVED'];
const digitsOnly = (value: unknown) => String(value ?? '').replace(/[^0-9]/g, '');

function maskEmail(email: string | null | undefined) {
  const [id, domain] = String(email || '').split('@');
  if (!id || !domain) return '';
  return `${id.slice(0, 3)}${'*'.repeat(Math.max(2, id.length - 3))}@${domain}`;
}

type AgencyMember = { email?: string | null; name?: string | null; role?: string | null; plan_type?: string | null; plan_end_date?: string | null };
type AgencyRow = {
  owner_id: string;
  name: string | null;
  status: string | null;
  reg_num: string | null;
  biz_num: string | null;
  cell: string | null;
  address: string | null;
  address_detail: string | null;
  members?: AgencyMember | AgencyMember[] | null;
};

const memberOf = (row: AgencyRow) => (Array.isArray(row.members) ? row.members[0] : row.members) || null;

/* 유료로 쓰고 있는 사무소 계정인가 — 기존 등급 판정(getEffectivePlan)과 같은 기준 (부동산회원 + 유료 등급 + 기간 안) */
const PAID_OFFICE_PLANS = ['news_premium', 'study_premium', 'biz_premium', 'admin'];
function isPaidOwner(member: AgencyMember | null) {
  if (!member) return false;
  return PAID_OFFICE_PLANS.includes(getEffectivePlan({
    role: member.role || undefined,
    plan_type: member.plan_type || undefined,
    plan_end_date: member.plan_end_date || null,
  }));
}

type RequesterContext = {
  userId: string | null;
  isAdmin: boolean;
};

/* 화면이 넘긴 memberId나 role을 믿지 않고 매 요청마다 로그인 사용자를 다시 확인한다. */
async function getRequesterContext(): Promise<RequesterContext> {
  try {
    const cookieClient = await createCookieSupabase();
    const { data } = await cookieClient.auth.getUser();
    const userId = data?.user?.id;
    if (!userId) return { userId: null, isAdmin: false };
    const { data: me } = await getAdminClient().from('members').select('role, plan_type, plan_end_date').eq('id', userId).maybeSingle();
    if (!me) return { userId, isAdmin: false };
    return {
      userId,
      isAdmin: isAdminRole(me.role) || getEffectivePlan(me) === 'admin',
    };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

/* 지금 이 요청을 보낸 사람이 최고관리자인가 — 화면이 아니라 로그인 정보로 확인한다 */
async function requesterIsAdmin() {
  return (await getRequesterContext()).isAdmin;
}

/* 같은 개설등록번호로 신청 중이거나 승인된 다른 계정들 — DB 에 숫자만 남긴 칸(reg_num_norm)이 있으면 그것으로,
   없으면(마이그레이션 전) 적힌 그대로·숫자만 두 모양으로 찾는다. 검사를 못 하면 null (가입을 막지 않는다) */
async function findOtherAgenciesByRegNum(supabaseAdmin: ReturnType<typeof getAdminClient>, regNum: string, ownerId: string) {
  const norm = digitsOnly(regNum);
  if (norm.length < 5) return [];
  const select = 'owner_id, name, status, reg_num, members:owner_id(email, name, role, plan_type, plan_end_date)';
  let { data, error } = await supabaseAdmin
    .from('agencies').select(select).eq('reg_num_norm', norm)
    .in('status', ACTIVE_AGENCY_STATUSES).neq('owner_id', ownerId).limit(50);
  if (error) {
    const raw = String(regNum).trim();
    ({ data, error } = await supabaseAdmin
      .from('agencies').select(select).in('reg_num', Array.from(new Set([raw, norm])))
      .in('status', ACTIVE_AGENCY_STATUSES).neq('owner_id', ownerId).limit(50));
    if (error) return null;
  }
  return (data || []) as AgencyRow[];
}

/** 관리자 심사용 — 이 신청과 등록번호·사업자번호·휴대폰·주소가 같은 다른 계정 */
export async function adminFindAgencyDuplicates(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    if (!(await requesterIsAdmin())) {
      return { success: false, error: '최고관리자 권한이 필요합니다.', duplicates: [] };
    }
    const { data: mine } = await supabaseAdmin
      .from('agencies').select('reg_num, biz_num, cell, address, address_detail').eq('owner_id', memberId).maybeSingle();
    if (!mine) return { success: true, duplicates: [] };
    const reg = digitsOnly(mine.reg_num);
    const biz = digitsOnly(mine.biz_num);
    const cell = digitsOnly(mine.cell);
    const addr = `${String(mine.address || '').trim()} ${String(mine.address_detail || '').trim()}`.trim();
    const { data, error } = await supabaseAdmin
      .from('agencies')
      .select('owner_id, name, status, reg_num, biz_num, cell, address, address_detail, members:owner_id(email, name, role, plan_type, plan_end_date)')
      .neq('owner_id', memberId)
      .in('status', ACTIVE_AGENCY_STATUSES)
      .limit(2000);
    if (error) return { success: false, error: error.message, duplicates: [] };
    const duplicates = ((data || []) as AgencyRow[]).map((row) => {
      const why: string[] = [];
      if (reg.length >= 5 && digitsOnly(row.reg_num) === reg) why.push('개설등록번호');
      if (biz.length >= 10 && digitsOnly(row.biz_num) === biz) why.push('사업자등록번호');
      if (cell.length >= 10 && digitsOnly(row.cell) === cell) why.push('휴대폰');
      const rowAddr = `${String(row.address || '').trim()} ${String(row.address_detail || '').trim()}`.trim();
      if (addr.length >= 8 && rowAddr === addr) why.push('주소');
      const member = memberOf(row);
      return { ownerId: row.owner_id, name: row.name, status: row.status, email: member?.email || '', memberName: member?.name || '', paid: isPaidOwner(member), why };
    }).filter((row) => row.why.length);
    return { success: true, duplicates };
  } catch (error: any) {
    return { success: false, error: error.message, duplicates: [] };
  }
}

const AGENCY_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const AGENCY_DOCUMENT_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AGENCY_EDITABLE_FIELDS = [
  'name',
  'ceo_name',
  'cell',
  'phone',
  'zipcode',
  'address',
  'address_detail',
  'intro',
  'biz_num',
  'reg_num',
  'reg_cert_url',
  'biz_cert_url',
  'lat',
  'lng',
  'status',
  'reject_reason',
] as const;

function sanitizeAgencyData(value: unknown) {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const payload: Record<string, unknown> = {};
  for (const field of AGENCY_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, field)) payload[field] = source[field];
  }
  return payload;
}

function getAgencyDocumentPath(documentUrl: unknown, memberId: string) {
  if (!documentUrl || !memberId) return null;
  try {
    const storageUrl = new URL(String(documentUrl));
    const configuredUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    if (storageUrl.origin !== configuredUrl.origin) return null;

    const markers = [
      '/storage/v1/object/public/agency_documents/',
      '/storage/v1/object/sign/agency_documents/',
    ];
    const marker = markers.find((candidate) => storageUrl.pathname.includes(candidate));
    if (!marker) return null;

    const encodedPath = storageUrl.pathname.slice(storageUrl.pathname.indexOf(marker) + marker.length);
    const path = decodeURIComponent(encodedPath).replace(/^\/+/, '');
    if (!path.startsWith(`${memberId}/`) || path.includes('..')) return null;
    return path;
  } catch {
    return null;
  }
}

function inferImageMimeType(path: string, reportedType: string | undefined) {
  if (reportedType && AGENCY_DOCUMENT_MIME_TYPES.has(reportedType)) return reportedType;
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

async function downloadAgencyDocument(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  documentUrl: unknown,
  memberId: string,
  kind: RealtorDocumentInput['kind'],
): Promise<RealtorDocumentInput> {
  const path = getAgencyDocumentPath(documentUrl, memberId);
  if (!path) throw new Error('등록된 서류 경로를 확인할 수 없습니다. 서류를 다시 업로드해 주세요.');

  const { data, error } = await supabaseAdmin.storage.from('agency_documents').download(path);
  if (error || !data) throw new Error('등록된 서류를 불러오지 못했습니다. 서류를 다시 업로드해 주세요.');
  if (data.size <= 0 || data.size > AGENCY_DOCUMENT_MAX_BYTES) {
    throw new Error('서류 파일 크기를 확인해 주세요. 파일당 최대 10MB까지 사용할 수 있습니다.');
  }

  const mimeType = inferImageMimeType(path, data.type);
  if (!mimeType) throw new Error('JPG, PNG 또는 WebP 이미지 서류만 사용할 수 있습니다.');

  return {
    kind,
    mimeType,
    imageBuffer: Buffer.from(await data.arrayBuffer()),
  };
}

async function verifyRealtorApplication(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  memberId: string,
  agencyData: Record<string, unknown>,
) {
  try {
    const documents = await Promise.all([
      downloadAgencyDocument(supabaseAdmin, agencyData.biz_cert_url, memberId, 'BUSINESS_REGISTRATION'),
      downloadAgencyDocument(supabaseAdmin, agencyData.reg_cert_url, memberId, 'BROKERAGE_REGISTRATION'),
    ]);

    const result = await VerifyAgent.verifyRealtorDocuments({
      documents,
      userInputData: {
        companyName: String(agencyData.name ?? ''),
        representative: String(agencyData.ceo_name ?? ''),
        businessNumber: String(agencyData.biz_num ?? ''),
        brokerageRegistrationNumber: String(agencyData.reg_num ?? ''),
      },
    });

    try {
      const inputTokens = result.usage?.inputTokens || 0;
      const outputTokens = result.usage?.outputTokens || 0;
      const totalTokens = result.usage?.totalTokens || 0;
      const costKrw = (inputTokens * 0.075 / 1_000_000 * 1400)
        + (outputTokens * 0.3 / 1_000_000 * 1400);
      await supabaseAdmin.from('agent_chats').insert({
        channel_id: 'verify',
        role: 'agent',
        content: `[부동산회원 서류 검증] ${memberId.slice(0, 8)} → ${result.status}`,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_krw: costKrw,
      });
    } catch (logError) {
      console.warn('Failed to log realtor verification:', logError);
    }

    if (result.status === 'APPROVED') {
      return {
        status: 'APPROVED' as const,
        reason: null,
        verificationStatus: result.status,
      };
    }

    return {
      status: 'PENDING' as const,
      reason: result.status === 'ERROR'
        ? 'AI 서류 검증을 완료하지 못해 관리자 검토 대기 중입니다.'
        : result.message,
      verificationStatus: result.status,
    };
  } catch (error: unknown) {
    console.error('Realtor application verification error:', error);
    return {
      status: 'PENDING' as const,
      reason: error instanceof Error
        ? error.message
        : '서류 확인을 완료하지 못해 관리자 검토 대기 중입니다.',
      verificationStatus: 'ERROR' as const,
    };
  }
}

async function applyRealtorApproval(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  memberId: string,
  notify: boolean,
) {
  const { error: agencyError } = await supabaseAdmin
    .from('agencies')
    .update({ status: 'APPROVED', reject_reason: null })
    .eq('owner_id', memberId);
  if (agencyError) return { success: false, error: agencyError.message };

  const { data: member, error: memberLookupError } = await supabaseAdmin
    .from('members')
    .select('plan_type, use_custom_registration_limits')
    .eq('id', memberId)
    .single();
  if (memberLookupError) return { success: false, error: memberLookupError.message };

  const planType = member?.plan_type || 'free';
  const { policies } = await adminGetLimitPolicies();
  const { error: memberError } = await supabaseAdmin
    .from('members')
    .update({
      role: 'REALTOR',
      ...planDefaultsForMember(policies, 'REALTOR', planType, !!member?.use_custom_registration_limits),
    })
    .eq('id', memberId);
  if (memberError) return { success: false, error: memberError.message };

  if (notify) {
    try {
      const { createNotification } = await import("@/app/actions/notification");
      await createNotification({
        recipientId: memberId,
        type: "realtor_approved",
        title: "🎉 부동산회원 승인 완료",
        body: "공인중개사 서류 심사가 통과되어 부동산회원으로 승인되었습니다.",
        link: "/realty_admin",
        mobileLink: "/m/admin",
        sourceId: `realtor_approved_${memberId}`,
        revive: true,
      });
    } catch (notificationError) {
      console.warn('Failed to send realtor approval notification:', notificationError);
    }
  }

  return { success: true };
}

// ── 중개업소 정보 수정/생성 ──
// options.allowDuplicate: 최고관리자의 [중복 허용]
// options.requestApproval: 본인의 승인신청 — 서버가 두 서류를 검증하고 상태를 직접 결정한다
export async function adminUpdateAgency(
  memberId: string,
  agencyData: any,
  options: { allowDuplicate?: boolean; requestApproval?: boolean } = {},
) {
  const supabaseAdmin = getAdminClient();
  try {
    const requester = await getRequesterContext();
    if (!requester.userId) return { success: false, error: '로그인이 필요합니다.' };
    if (!requester.isAdmin && requester.userId !== memberId) {
      return { success: false, error: '본인의 중개업소 정보만 수정할 수 있습니다.' };
    }

    const { data: existing } = await supabaseAdmin
      .from('agencies')
      .select('id, reg_num, status, reg_cert_url, biz_cert_url')
      .eq('owner_id', memberId)
      .maybeSingle();

    /* "중복 허용" 표시는 화면이 보낸 값을 믿지 않는다 — 아래에서 서버가 정한다 */
    agencyData = sanitizeAgencyData(agencyData);
    if (!requester.isAdmin) delete agencyData.reject_reason;
    let forcedPending = false;
    let paidOffice = false;
    let verificationStatus: string | null = null;
    let reviewReason: string | null = null;

    if (!requester.isAdmin && options.requestApproval) {
      const requiredFields = [
        agencyData.name,
        agencyData.ceo_name,
        agencyData.cell,
        agencyData.address,
        agencyData.biz_num,
        agencyData.reg_num,
        agencyData.biz_cert_url,
        agencyData.reg_cert_url,
      ];
      if (requiredFields.some((value) => !String(value ?? '').trim())) {
        return { success: false, error: '필수 정보와 두 종류의 서류를 모두 제출해 주세요.' };
      }
    }

    /* 새로 신청하거나 등록번호를 바꿀 때만 — 같은 사무소의 다른 계정이 있으면:
       기존 계정이 유료로 쓰는 사무소 → 추가 계정 허용 (개수 제한 없음, 관리자 승인 대기로)
       최고관리자가 [중복 허용] → 허용
       그 밖(무료 사무소) → 막는다 */
    const regNumChanged = agencyData.reg_num !== undefined && digitsOnly(agencyData.reg_num) !== digitsOnly(existing?.reg_num);
    if (agencyData.reg_num && (!existing || regNumChanged)) {
      const others = await findOtherAgenciesByRegNum(supabaseAdmin, agencyData.reg_num, memberId);
      if (others && others.length) {
        paidOffice = others.some((row) => isPaidOwner(memberOf(row)));
        const adminAllowed = !paidOffice && options.allowDuplicate === true && requester.isAdmin;
        if (paidOffice || adminAllowed) {
          agencyData.allow_duplicate = true;
        } else {
          const masked = maskEmail(memberOf(others[0])?.email);
          return {
            success: false,
            duplicate: true,
            error: `이미 가입된 중개사무소입니다${masked ? ` (${masked})` : ''}. 무료 회원은 중개사무소 한 곳당 부동산회원 계정을 하나만 만들 수 있습니다. ` +
              '같은 사무소 직원 계정은 사무소 대표 계정이 공실스터디부동산(유료)일 때 만들 수 있습니다. ' +
              '기존 계정으로 로그인하시거나, 계정을 찾을 수 없으면 고객센터로 문의해 주세요.',
          };
        }
      }
    }

    if (!requester.isAdmin) {
      if (options.requestApproval) {
        const verification = await verifyRealtorApplication(supabaseAdmin, memberId, agencyData);
        verificationStatus = verification.verificationStatus;
        agencyData.status = verification.status;
        agencyData.reject_reason = verification.reason;
        reviewReason = verification.reason;

        /* 유료 사무소의 추가 계정은 AI가 통과시켜도 최고관리자가 한 번 더 승인한다. */
        if (paidOffice) {
          agencyData.status = 'PENDING';
          agencyData.reject_reason = '유료 중개사무소의 추가 계정으로 관리자 확인이 필요합니다.';
          reviewReason = agencyData.reject_reason;
          forcedPending = true;
        }
      } else {
        /* 일반 저장에서는 클라이언트가 승인 상태를 바꿀 수 없다. */
        agencyData.status = existing?.status || 'PENDING';
        agencyData.reject_reason = agencyData.status === 'APPROVED' ? null : undefined;
      }
    } else {
      agencyData.status = agencyData.status || existing?.status || 'PENDING';
    }

    /* DB 에 allow_duplicate 칸이 아직 없으면(마이그레이션 전) 빼고 저장한다 */
    const saveAgency = async (payload: any) => {
      let res = existing
        ? await supabaseAdmin.from('agencies').update(payload).eq('owner_id', memberId)
        : await supabaseAdmin.from('agencies').insert({ owner_id: memberId, ...payload });
      if (res.error && 'allow_duplicate' in payload && /allow_duplicate/.test(res.error.message)) {
        const { allow_duplicate: _ignored, ...rest } = payload;
        res = existing
          ? await supabaseAdmin.from('agencies').update(rest).eq('owner_id', memberId)
          : await supabaseAdmin.from('agencies').insert({ owner_id: memberId, ...rest });
      }
      return res;
    };
    const saved = await saveAgency(agencyData);
    if (saved.error) return { success: false, error: saved.error.message };

    if (agencyData.status === 'APPROVED') {
      const approved = await applyRealtorApproval(supabaseAdmin, memberId, existing?.status !== 'APPROVED');
      if (!approved.success) return approved;
    } else if (agencyData.status === 'PENDING' || agencyData.status === 'REJECTED') {
      const { error: memberError } = await supabaseAdmin
        .from('members')
        .update({ role: 'USER' })
        .eq('id', memberId);
      if (memberError) return { success: false, error: memberError.message };
    }

    /* forcedPending: 유료 사무소 추가 계정이라 자동 승인을 막고 관리자 승인 대기로 저장했다 (화면이 바로 승인하지 않게) */
    return {
      success: true,
      status: agencyData.status as string,
      forcedPending,
      paidOffice,
      verificationStatus,
      reviewReason,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function normalizePendingRealtorRole(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    const requester = await getRequesterContext();
    if (!requester.userId) return { success: false, error: '로그인이 필요합니다.' };
    if (!requester.isAdmin && requester.userId !== memberId) {
      return { success: false, error: '본인의 승인 상태만 정리할 수 있습니다.' };
    }
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .select('status')
      .eq('owner_id', memberId)
      .maybeSingle();
    if (agencyError) return { success: false, error: agencyError.message };
    const currentStatus = agency?.status;
    if (currentStatus !== 'PENDING' && currentStatus !== 'REJECTED') {
      return { success: false, error: '승인 전 상태가 아닙니다.' };
    }

    const { error } = await supabaseAdmin
      .from('members')
      .update({ role: 'USER' })
      .eq('id', memberId)
      .eq('role', 'REALTOR');
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 부동산회원 승인 (agencies.status → APPROVED + members.role → REALTOR) ──
export async function adminApproveRealtorApplication(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    const requester = await getRequesterContext();
    if (!requester.userId) return { success: false, error: '로그인이 필요합니다.' };
    if (!requester.isAdmin) {
      if (requester.userId !== memberId) {
        return { success: false, error: '본인의 승인 상태만 복구할 수 있습니다.' };
      }
      const { data: agency, error: agencyError } = await supabaseAdmin
        .from('agencies')
        .select('status')
        .eq('owner_id', memberId)
        .maybeSingle();
      if (agencyError) return { success: false, error: agencyError.message };
      if (agency?.status !== 'APPROVED') {
        return { success: false, error: '승인된 중개업소만 회원 권한을 복구할 수 있습니다.' };
      }
    }
    return await applyRealtorApproval(supabaseAdmin, memberId, true);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 부동산회원 반려 (agencies.status → REJECTED + reject_reason 저장) ──
export async function adminRejectRealtorApplication(memberId: string, reason: string) {
  const supabaseAdmin = getAdminClient();
  try {
    if (!(await requesterIsAdmin())) return { success: false, error: '최고관리자 권한이 필요합니다.' };
    const { error } = await supabaseAdmin
      .from('agencies')
      .update({ status: 'REJECTED', reject_reason: reason })
      .eq('owner_id', memberId);
    if (error) return { success: false, error: error.message };

    const { error: memberError } = await supabaseAdmin
      .from('members')
      .update({ role: 'USER' })
      .eq('id', memberId);
    if (memberError) return { success: false, error: memberError.message };

    // 알림 발송 (회원용 서류보완 안내)
    const { createNotification } = await import("@/app/actions/notification");
    await createNotification({
      recipientId: memberId,
      type: "realtor_rejected",
      title: "🚨 부동산회원 신청 서류보완 요청",
      body: `사유: ${reason}`,
      link: "/user_admin?menu=settings",
      mobileLink: "/m/admin/settings",
      sourceId: `realtor_rejected_${memberId}`,
      revive: true
    });

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
    const requester = await getRequesterContext();
    if (!requester.userId) return { success: false, error: '로그인이 필요합니다.' };
    const normalizedPath = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalizedPath.includes('..')) return { success: false, error: '올바르지 않은 저장 경로입니다.' };
    if (!requester.isAdmin && !normalizedPath.startsWith(`${requester.userId}/`)) {
      return { success: false, error: '본인의 서류만 업로드할 수 있습니다.' };
    }
    if (!AGENCY_DOCUMENT_MIME_TYPES.has(file.type)) {
      return { success: false, error: 'JPG, PNG 또는 WebP 이미지 서류만 업로드할 수 있습니다.' };
    }
    if (file.size <= 0 || file.size > AGENCY_DOCUMENT_MAX_BYTES) {
      return { success: false, error: '서류 파일은 파일당 최대 10MB까지 업로드할 수 있습니다.' };
    }

    const { data, error } = await supabaseAdmin.storage.from('agency_documents').upload(normalizedPath, file, { upsert: true });
    if (error) {
      return { success: false, error: error.message };
    }
    const { data: urlData } = supabaseAdmin.storage.from('agency_documents').getPublicUrl(normalizedPath);
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

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 회원별 공실/기사 건수는 DB 에서 센다.
    // 이전에는 vacancies 전체를 받아와 JS 에서 filter 로 셌는데, PostgREST 기본 행 상한(1,000)에
    // 걸려 11,477건 중 1,000건만 집계되어 공실 건수가 실제보다 적게 표시됐다.
    // (덤으로 회원수 x 공실수 만큼의 JS 반복과 전체 행 전송도 사라진다)
    // 회원 수만큼 카운트 쿼리가 나가므로 회원이 수백 명 규모가 되면 GROUP BY RPC 로 옮길 것.
    const [bizProfilesRes, homepagesRes, memberCounts] = await Promise.all([
      // 비즈니스 프로필은 별도 쿼리 (FK 관계가 members가 아닌 auth.users를 참조하므로)
      supabaseAdmin.from('business_profiles').select('*'),
      // 홈페이지 주소는 homepage_settings 에 있다. agencies 에는 없다 —
      // 그래서 목록의 [홈페이지ID] 칸이 줄곧 비어 있었다.
      supabaseAdmin.from('homepage_settings').select('owner_id, subdomain, is_active'),
      Promise.all((members as any[]).map(async (m: any) => {
        const [vRes, aRes] = await Promise.all([
          // 기존 동작과 동일하게 status 필터 없이 전체를 센다
          supabaseAdmin.from('vacancies').select('id', { count: 'exact', head: true }).eq('owner_id', m.id),
          supabaseAdmin.from('articles').select('id', { count: 'exact', head: true }).eq('author_id', m.id).eq('is_deleted', false).gte('created_at', firstDayOfMonth),
        ]);
        return { id: m.id, vCount: vRes.count || 0, aCount: aRes.count || 0 };
      })),
    ]);
    const bizProfiles = bizProfilesRes.data;
    const homepageByOwner = new Map((homepagesRes.data || []).map((h: any) => [h.owner_id, h]));
    const countsById = new Map(memberCounts.map(c => [c.id, c]));

    const data = members.map((m: any) => {
      const counts = countsById.get(m.id);
      const vCount = counts?.vCount || 0;
      const aCount = counts?.aCount || 0;
      
      // 주소가 없으면 아직 발급 전이다. is_active 는 중개사가 스스로 내린 스위치,
      // can_homepage 는 최고관리자가 여는 권한 — 둘 다 켜져야 실제로 열린다.
      const hp: any = homepageByOwner.get(m.id);
      const homepage_id = hp?.subdomain || '';
      const homepage_is_active = hp ? hp.is_active !== false : false;

      // 비즈니스 프로필 매칭
      const bizProfile = bizProfiles?.find((bp: any) => bp.user_id === m.id) || null;

      return {
        ...m,
        business_profiles: bizProfile,
        vacancies_count: vCount,
        articles_count: aCount,
        homepage_id,
        homepage_is_active
      }
    });

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 회원 목록에서 홈페이지를 바로 열고 닫는다.
 *
 * 회원 하나를 고치려고 [수정] 화면까지 들어갔다 나오는 것이 성가시다.
 * 목록에서 누르면 그 자리에서 can_homepage 만 뒤집는다. 세부 기능(로고·영상·
 * 사진 첨부 등)은 그대로 두므로, 다시 켜면 쓰던 그대로 돌아온다.
 */
export async function adminToggleMemberHomepage(memberId: string, open: boolean) {
  const supabaseAdmin = getAdminClient();
  try {
    const { error } = await supabaseAdmin
      .from('members')
      .update({ can_homepage: open })
      .eq('id', memberId);
    if (error) return { success: false, error: error.message };
    return { success: true };
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
    const { data: agencyData } = await supabaseAdmin.from('agencies').select('*').eq('owner_id', memberId).single();
    if (agencyData) agency = agencyData;

    let businessProfile = null;
    if (member.role === 'BIZ' || member.role === '비즈니스회원') {
      const { data: bizData } = await supabaseAdmin.from('business_profiles').select('*').eq('user_id', memberId).single();
      if (bizData) businessProfile = bizData;
    }

    const countRes = await supabaseAdmin.from('members').select('*', { count: 'exact', head: true }).lte('created_at', member.created_at);
    if (countRes.error) {
      console.error("adminGetMemberDetail countError:", countRes.error);
    }
    const count = countRes.count;
    member.memberNumber = String(count || 1).padStart(6, '0');

    return { success: true, member, agency, businessProfile };
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
    await Promise.allSettled([
      supabaseAdmin.from('vacancies').delete().eq('owner_id', memberId),
      supabaseAdmin.from('agencies').delete().eq('owner_id', memberId),
      supabaseAdmin.from('agency_members').delete().eq('member_id', memberId),
      supabaseAdmin.from('business_profiles').delete().eq('user_id', memberId),
      supabaseAdmin.from('realtor_applications').delete().eq('user_id', memberId),
      supabaseAdmin.from('business_applications').delete().eq('user_id', memberId),
      supabaseAdmin.from('customer_consultations').delete().eq('created_by', memberId),
      supabaseAdmin.from('customers').delete().eq('member_id', memberId),
      supabaseAdmin.from('marketing_projects').delete().eq('user_id', memberId),
      supabaseAdmin.from('inquiries').delete().eq('user_id', memberId),
      supabaseAdmin.from('talk_messages').delete().eq('sender_id', memberId),
      supabaseAdmin.from('talk_room_members').delete().eq('user_id', memberId),
      supabaseAdmin.from('talk_rooms').delete().eq('created_by', memberId),
      supabaseAdmin.from('articles').update({ author_id: null }).eq('author_id', memberId),
    ]);

    // 2. members 테이블에서 삭제
    const { error: dbError } = await supabaseAdmin.from('members').delete().eq('id', memberId);
    if (dbError) return { success: false, error: dbError.message };

    // 3. Supabase Auth 사용자 삭제 (완전한 계정 삭제)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(memberId);
    if (authError) console.error("Auth User 삭제 실패:", authError.message);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 대시보드 통계 및 최근 데이터 조회 ──
async function getAdminDashboardData() {
  const supabaseAdmin = getAdminClient();
  try {
    const [
      { count: vacanciesCount },
      { count: onbidCount },
      { count: membersCount },
      { count: articlesCount },
      { count: ac },
      { count: vc },
      { count: bc },
      { data: recentVacancies },
      { data: recentOnbid },
      { data: recentMembers },
      { data: acData },
      { data: vcData },
      { data: bcData },
    ] = await Promise.all([
      supabaseAdmin.from('vacancies').select('*', { count: 'exact', head: true }).neq('status', 'DELETED').neq('trade_type', '경매'),
      supabaseAdmin.from('vacancies').select('*', { count: 'exact', head: true }).neq('status', 'DELETED').eq('trade_type', '경매'),
      supabaseAdmin.from('members').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('articles').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabaseAdmin.from('article_comments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('vacancy_comments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('board_comments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('vacancies').select('id, trade_type, sido, sigungu, dong, detail_addr, building_name, deposit, monthly_rent, created_at').neq('status', 'DELETED').neq('trade_type', '경매').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('vacancies').select('id, trade_type, sido, sigungu, dong, detail_addr, building_name, deposit, monthly_rent, created_at').neq('status', 'DELETED').eq('trade_type', '경매').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('members').select('id, name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('article_comments').select('id, content, created_at, article_id, is_secret').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('vacancy_comments').select('id, content, created_at, vacancy_id, is_secret').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('board_comments').select('id, content, created_at, board_id, is_secret').order('created_at', { ascending: false }).limit(5),
    ]);
    const commentsCount = (ac || 0) + (vc || 0) + (bc || 0);

    let comments = [
      ...(acData || []).map(c => ({ ...c, type: 'article', sourceId: c.article_id })),
      ...(vcData || []).map(c => ({ ...c, type: 'vacancy', sourceId: c.vacancy_id })),
      ...(bcData || []).map(c => ({ ...c, type: 'board', sourceId: c.board_id }))
    ];
    comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recentComments = comments.slice(0, 5);
    const normalizeVacancy = (vacancy: any) => ({
      ...vacancy,
      address: [vacancy.sido, vacancy.sigungu, vacancy.dong, vacancy.detail_addr].filter(Boolean).join(' '),
      price: vacancy.monthly_rent > 0
        ? `${vacancy.deposit?.toLocaleString() || 0}/${vacancy.monthly_rent.toLocaleString()}`
        : vacancy.deposit?.toLocaleString() || '',
    });

    return { 
      success: true, 
      stats: { vacanciesCount, onbidCount, membersCount, articlesCount, commentsCount },
      recentVacancies: (recentVacancies || []).map(normalizeVacancy),
      recentOnbid: (recentOnbid || []).map(normalizeVacancy),
      recentMembers: recentMembers || [],
      recentComments
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const getCachedAdminDashboardData = unstable_cache(
  getAdminDashboardData,
  ['admin-dashboard-data'],
  { revalidate: 60 }
);

export async function adminGetDashboardData(options?: { noCache?: boolean }) {
  return options?.noCache ? getAdminDashboardData() : getCachedAdminDashboardData();
}

// ── 개별 회원용 대시보드 통계 조회 (본인 데이터만) ──
export async function memberGetDashboardData(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    // 본인의 공실 수
    const { count: vacanciesCount } = await supabaseAdmin.from('vacancies')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', memberId)
      .neq('status', 'DELETED');

    // 본인의 기사 수
    const { count: articlesCount } = await supabaseAdmin.from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', memberId)
      .eq('is_deleted', false);

    // 본인 글(기사/공실)에 달린 댓글 수 합산
    // 1) 본인 기사 ID 조회 후 해당 기사에 달린 댓글
    const { data: myArticles } = await supabaseAdmin.from('articles').select('id').eq('author_id', memberId).eq('is_deleted', false);
    const myArticleIds = (myArticles || []).map(a => a.id);
    let articleCommentsCount = 0;
    if (myArticleIds.length > 0) {
      const { count } = await supabaseAdmin.from('article_comments').select('*', { count: 'exact', head: true }).in('article_id', myArticleIds);
      articleCommentsCount = count || 0;
    }

    // 2) 본인 공실에 달린 댓글
    const { data: myVacancies } = await supabaseAdmin.from('vacancies').select('id').eq('owner_id', memberId);
    const myVacancyIds = (myVacancies || []).map(v => v.id);
    let vacancyCommentsCount = 0;
    if (myVacancyIds.length > 0) {
      const { count } = await supabaseAdmin.from('vacancy_comments').select('*', { count: 'exact', head: true }).in('vacancy_id', myVacancyIds);
      vacancyCommentsCount = count || 0;
    }

    const commentsCount = articleCommentsCount + vacancyCommentsCount;

    // 최근 본인 공실 5개
    const { data: recentVacancies } = await supabaseAdmin.from('vacancies')
      .select('id, trade_type, sido, sigungu, dong, detail_addr, building_name, deposit, monthly_rent, created_at')
      .eq('owner_id', memberId)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false })
      .limit(5);

    // 최근 본인 기사 5개
    const { data: recentArticles } = await supabaseAdmin.from('articles')
      .select('id, title, views, created_at')
      .eq('author_id', memberId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5);

    // 본인 글에 달린 최근 댓글 5개
    let comments: any[] = [];
    if (myArticleIds.length > 0) {
      const { data } = await supabaseAdmin.from('article_comments')
        .select('id, content, created_at, article_id, is_secret')
        .in('article_id', myArticleIds)
        .order('created_at', { ascending: false }).limit(5);
      comments.push(...(data || []).map(c => ({ ...c, type: 'article', sourceId: c.article_id })));
    }
    if (myVacancyIds.length > 0) {
      const { data } = await supabaseAdmin.from('vacancy_comments')
        .select('id, content, created_at, vacancy_id, is_secret')
        .in('vacancy_id', myVacancyIds)
        .order('created_at', { ascending: false }).limit(5);
      comments.push(...(data || []).map(c => ({ ...c, type: 'vacancy', sourceId: c.vacancy_id })));
    }
    comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recentComments = comments.slice(0, 5);

    return {
      success: true,
      stats: { vacanciesCount, membersCount: null, articlesCount, commentsCount },
      recentVacancies: (recentVacancies || []).map((v: { sido?: string; sigungu?: string; dong?: string; detail_addr?: string }) => ({
        ...v,
        address: [v.sido, v.sigungu, v.dong, v.detail_addr].filter(Boolean).join(' '),
      })),
      recentArticles: recentArticles || [],
      recentComments
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ══════════════════════════════════════════════════════════════
// ── 비즈니스 회원 관련 액션 ──
// ══════════════════════════════════════════════════════════════

// ── 비즈니스 프로필 생성/수정 (upsert) ──
export async function adminUpdateBusinessProfile(memberId: string, bizData: any) {
  const supabaseAdmin = getAdminClient();
  try {
    const { data: existing } = await supabaseAdmin
      .from('business_profiles').select('id').eq('user_id', memberId).single();

    if (existing) {
      const { error } = await supabaseAdmin.from('business_profiles').update({
        ...bizData,
        updated_at: new Date().toISOString()
      }).eq('user_id', memberId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from('business_profiles').insert({
        user_id: memberId,
        ...bizData
      });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 비즈니스 회원 승인 (business_profiles.status → APPROVED + members.role → BIZ) ──
export async function adminApproveBusinessApplication(memberId: string) {
  const supabaseAdmin = getAdminClient();
  try {
    // 1. business_profiles 상태를 APPROVED로 변경
    const { error: bizError } = await supabaseAdmin
      .from('business_profiles')
      .update({ status: 'APPROVED', rejection_reason: null, updated_at: new Date().toISOString() })
      .eq('user_id', memberId);
    if (bizError) return { success: false, error: bizError.message };

    // 2. members.role을 BIZ로 변경. 회원별 한도를 쓰는 회원의 세 숫자는 유지한다.
    const { data: member, error: memberLookupError } = await supabaseAdmin
      .from('members')
      .select('use_custom_registration_limits')
      .eq('id', memberId)
      .single();
    if (memberLookupError) return { success: false, error: memberLookupError.message };
    const { policies } = await adminGetLimitPolicies();
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .update({
        role: 'BIZ',
        plan_type: 'biz_premium',
        ...planDefaultsForMember(policies, 'BIZ', 'biz_premium', !!member?.use_custom_registration_limits),
      })
      .eq('id', memberId);
    if (memberError) return { success: false, error: memberError.message };

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── 비즈니스 회원 반려 (business_profiles.status → REJECTED + rejection_reason 저장) ──
export async function adminRejectBusinessApplication(memberId: string, reason: string) {
  const supabaseAdmin = getAdminClient();
  try {
    const { error } = await supabaseAdmin
      .from('business_profiles')
      .update({ status: 'REJECTED', rejection_reason: reason, updated_at: new Date().toISOString() })
      .eq('user_id', memberId);
    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const DEFAULT_LIMIT_POLICIES = {
  LIMIT_USER_VACANCY: 10,
  LIMIT_USER_ARTICLE: 0,
  LIMIT_REALTOR_FREE_VACANCY: 10,
  LIMIT_REALTOR_FREE_ARTICLE: 0,
  LIMIT_REALTOR_NEWS_VACANCY: 50,
  LIMIT_REALTOR_NEWS_ARTICLE: 4,
  LIMIT_REALTOR_STUDY_VACANCY: 20,
  LIMIT_REALTOR_STUDY_ARTICLE: 4,
  LIMIT_BIZ_VACANCY: 0,
  LIMIT_BIZ_ARTICLE: 10,
  // 강의 등록 한도(총 건수). 유료회원만 등록할 수 있게 무료 등급은 0 이다.
  LIMIT_USER_LECTURE: 0,
  LIMIT_REALTOR_FREE_LECTURE: 0,
  LIMIT_REALTOR_STUDY_LECTURE: 3,
  LIMIT_REALTOR_NEWS_LECTURE: 3,
  LIMIT_BIZ_LECTURE: 3,
  // 권한은 켜짐 1 / 꺼짐 0 으로 둔다. point_settings 가 숫자만 담기 때문이다.
  PERM_USER_ARTICLE_BANNER: 0,
  PERM_USER_ARTICLE_VACANCY: 0,
  PERM_USER_HOMEPAGE: 0,
  LIMIT_USER_HERO_SLIDES: 1,
  PERM_USER_FOOTER_HIDE: 0,
  PERM_USER_INTAKE_PHOTO: 0,
  PERM_USER_SITE_LOGO: 0,
  PERM_USER_HERO_VIDEO: 0,
  PERM_USER_SNS_LINKS: 0,
  PERM_REALTOR_FREE_ARTICLE_BANNER: 0,
  PERM_REALTOR_FREE_ARTICLE_VACANCY: 0,
  PERM_REALTOR_FREE_HOMEPAGE: 1,
  LIMIT_REALTOR_FREE_HERO_SLIDES: 1,
  PERM_REALTOR_FREE_FOOTER_HIDE: 0,
  PERM_REALTOR_FREE_INTAKE_PHOTO: 0,
  PERM_REALTOR_FREE_SITE_LOGO: 0,
  PERM_REALTOR_FREE_HERO_VIDEO: 0,
  PERM_REALTOR_FREE_SNS_LINKS: 0,
  PERM_REALTOR_STUDY_ARTICLE_BANNER: 1,
  PERM_REALTOR_STUDY_ARTICLE_VACANCY: 0,
  PERM_REALTOR_STUDY_HOMEPAGE: 1,
  LIMIT_REALTOR_STUDY_HERO_SLIDES: 3,
  PERM_REALTOR_STUDY_FOOTER_HIDE: 1,
  PERM_REALTOR_STUDY_INTAKE_PHOTO: 1,
  PERM_REALTOR_STUDY_SITE_LOGO: 1,
  PERM_REALTOR_STUDY_HERO_VIDEO: 1,
  PERM_REALTOR_STUDY_SNS_LINKS: 1,
  PERM_REALTOR_NEWS_ARTICLE_BANNER: 1,
  PERM_REALTOR_NEWS_ARTICLE_VACANCY: 1,
  PERM_REALTOR_NEWS_HOMEPAGE: 1,
  LIMIT_REALTOR_NEWS_HERO_SLIDES: 3,
  PERM_REALTOR_NEWS_FOOTER_HIDE: 1,
  PERM_REALTOR_NEWS_INTAKE_PHOTO: 1,
  PERM_REALTOR_NEWS_SITE_LOGO: 1,
  PERM_REALTOR_NEWS_HERO_VIDEO: 1,
  PERM_REALTOR_NEWS_SNS_LINKS: 1,
  PERM_BIZ_ARTICLE_BANNER: 1,
  PERM_BIZ_ARTICLE_VACANCY: 0,
  PERM_BIZ_HOMEPAGE: 1,
  LIMIT_BIZ_HERO_SLIDES: 3,
  PERM_BIZ_FOOTER_HIDE: 1,
  PERM_BIZ_INTAKE_PHOTO: 1,
  PERM_BIZ_SITE_LOGO: 1,
  PERM_BIZ_HERO_VIDEO: 1,
  PERM_BIZ_SNS_LINKS: 1,
};

const REGISTRATION_LIMIT_FIELDS = new Set<string>([
  'max_vacancies',
  'max_articles_per_month',
  'max_lectures',
]);

/**
 * 등급이 회원에게 내려주는 기본값 한 벌.
 *
 * 가입·승인·요금제 변경 때만 쓴다. 한 번 내려간 뒤에는 회원 값이 주인이고,
 * 최고관리자가 회원별로 덮어쓴 것을 등급이 다시 끌어내리지 않는다.
 * 여기 한 곳에서만 등급을 값으로 옮기므로, 등급이 늘어도 고칠 곳은 하나다.
 */
function planDefaults(
  policies: typeof DEFAULT_LIMIT_POLICIES,
  role: string,
  planType?: string | null
) {
  if (role === 'USER') {
    return {
      max_vacancies: policies.LIMIT_USER_VACANCY,
      max_articles_per_month: policies.LIMIT_USER_ARTICLE,
      max_lectures: policies.LIMIT_USER_LECTURE,
      can_article_banner: !!policies.PERM_USER_ARTICLE_BANNER,
      can_article_vacancy_banner: !!policies.PERM_USER_ARTICLE_VACANCY,
      can_homepage: !!policies.PERM_USER_HOMEPAGE,
      max_hero_slides: policies.LIMIT_USER_HERO_SLIDES,
      can_hide_footer_badge: !!policies.PERM_USER_FOOTER_HIDE,
      can_intake_photo: !!policies.PERM_USER_INTAKE_PHOTO,
      can_site_logo: !!policies.PERM_USER_SITE_LOGO,
      can_hero_video: !!policies.PERM_USER_HERO_VIDEO,
      can_sns_links: !!policies.PERM_USER_SNS_LINKS,
    };
  }
  if (role === 'BIZ') {
    return {
      max_vacancies: policies.LIMIT_BIZ_VACANCY,
      max_articles_per_month: policies.LIMIT_BIZ_ARTICLE,
      max_lectures: policies.LIMIT_BIZ_LECTURE,
      can_article_banner: !!policies.PERM_BIZ_ARTICLE_BANNER,
      can_article_vacancy_banner: !!policies.PERM_BIZ_ARTICLE_VACANCY,
      can_homepage: !!policies.PERM_BIZ_HOMEPAGE,
      max_hero_slides: policies.LIMIT_BIZ_HERO_SLIDES,
      can_hide_footer_badge: !!policies.PERM_BIZ_FOOTER_HIDE,
      can_intake_photo: !!policies.PERM_BIZ_INTAKE_PHOTO,
      can_site_logo: !!policies.PERM_BIZ_SITE_LOGO,
      can_hero_video: !!policies.PERM_BIZ_HERO_VIDEO,
      can_sns_links: !!policies.PERM_BIZ_SNS_LINKS,
    };
  }
  if (planType === 'news_premium') {
    return {
      max_vacancies: policies.LIMIT_REALTOR_NEWS_VACANCY,
      max_articles_per_month: policies.LIMIT_REALTOR_NEWS_ARTICLE,
      max_lectures: policies.LIMIT_REALTOR_NEWS_LECTURE,
      can_article_banner: !!policies.PERM_REALTOR_NEWS_ARTICLE_BANNER,
      can_article_vacancy_banner: !!policies.PERM_REALTOR_NEWS_ARTICLE_VACANCY,
      can_homepage: !!policies.PERM_REALTOR_NEWS_HOMEPAGE,
      max_hero_slides: policies.LIMIT_REALTOR_NEWS_HERO_SLIDES,
      can_hide_footer_badge: !!policies.PERM_REALTOR_NEWS_FOOTER_HIDE,
      can_intake_photo: !!policies.PERM_REALTOR_NEWS_INTAKE_PHOTO,
      can_site_logo: !!policies.PERM_REALTOR_NEWS_SITE_LOGO,
      can_hero_video: !!policies.PERM_REALTOR_NEWS_HERO_VIDEO,
      can_sns_links: !!policies.PERM_REALTOR_NEWS_SNS_LINKS,
    };
  }
  if (planType === 'study_premium') {
    return {
      max_vacancies: policies.LIMIT_REALTOR_STUDY_VACANCY,
      max_articles_per_month: policies.LIMIT_REALTOR_STUDY_ARTICLE,
      max_lectures: policies.LIMIT_REALTOR_STUDY_LECTURE,
      can_article_banner: !!policies.PERM_REALTOR_STUDY_ARTICLE_BANNER,
      can_article_vacancy_banner: !!policies.PERM_REALTOR_STUDY_ARTICLE_VACANCY,
      can_homepage: !!policies.PERM_REALTOR_STUDY_HOMEPAGE,
      max_hero_slides: policies.LIMIT_REALTOR_STUDY_HERO_SLIDES,
      can_hide_footer_badge: !!policies.PERM_REALTOR_STUDY_FOOTER_HIDE,
      can_intake_photo: !!policies.PERM_REALTOR_STUDY_INTAKE_PHOTO,
      can_site_logo: !!policies.PERM_REALTOR_STUDY_SITE_LOGO,
      can_hero_video: !!policies.PERM_REALTOR_STUDY_HERO_VIDEO,
      can_sns_links: !!policies.PERM_REALTOR_STUDY_SNS_LINKS,
    };
  }
  return {
    max_vacancies: policies.LIMIT_REALTOR_FREE_VACANCY,
    max_articles_per_month: policies.LIMIT_REALTOR_FREE_ARTICLE,
    max_lectures: policies.LIMIT_REALTOR_FREE_LECTURE,
    can_article_banner: !!policies.PERM_REALTOR_FREE_ARTICLE_BANNER,
    can_article_vacancy_banner: !!policies.PERM_REALTOR_FREE_ARTICLE_VACANCY,
    can_homepage: !!policies.PERM_REALTOR_FREE_HOMEPAGE,
    max_hero_slides: policies.LIMIT_REALTOR_FREE_HERO_SLIDES,
    can_hide_footer_badge: !!policies.PERM_REALTOR_FREE_FOOTER_HIDE,
    can_intake_photo: !!policies.PERM_REALTOR_FREE_INTAKE_PHOTO,
    can_site_logo: !!policies.PERM_REALTOR_FREE_SITE_LOGO,
    can_hero_video: !!policies.PERM_REALTOR_FREE_HERO_VIDEO,
    can_sns_links: !!policies.PERM_REALTOR_FREE_SNS_LINKS,
  };
}

/**
 * 등급·요금제가 바뀔 때 회원별 등록 한도를 쓰는 사람의 세 숫자는 빼고
 * 나머지 등급 권한만 적용한다.
 */
function planDefaultsForMember(
  policies: typeof DEFAULT_LIMIT_POLICIES,
  role: string,
  planType: string | null | undefined,
  useCustomRegistrationLimits: boolean
) {
  const defaults = planDefaults(policies, role, planType);
  if (!useCustomRegistrationLimits) return defaults;

  const permissions: Partial<typeof defaults> = { ...defaults };
  delete permissions.max_vacancies;
  delete permissions.max_articles_per_month;
  delete permissions.max_lectures;
  return permissions;
}

/**
 * 지금 등급별 설정 기준으로 그 등급 회원이 받을 한도·권한 한 벌.
 * 회원가입을 마칠 때처럼 관리자 화면 밖에서 등급 기본값을 넣어야 할 때 쓴다.
 */
export async function getGradeDefaults(role: string, planType?: string | null) {
  const { policies } = await adminGetLimitPolicies();
  return planDefaults(policies, role, planType);
}

export async function adminGetLimitPolicies() {
  const supabaseAdmin = getAdminClient();
  try {
    const keys = Object.keys(DEFAULT_LIMIT_POLICIES);
    const { data, error } = await supabaseAdmin
      .from('point_settings')
      .select('key, value')
      .in('key', keys);

    const policies = { ...DEFAULT_LIMIT_POLICIES };
    if (data) {
      data.forEach((row: any) => {
        if (row.key in policies) {
          (policies as any)[row.key] = Number(row.value);
        }
      });
    }
    return { success: true, policies };
  } catch (error: any) {
    return { success: false, error: error.message, policies: DEFAULT_LIMIT_POLICIES };
  }
}

/**
 * 등급별 한도·권한 저장.
 *
 * 저장하면 그 등급 회원에게 바로 내려간다. 정책만 바꾸고 회원은 그대로 두면
 * 화면에 적어둔 값과 실제로 돌아가는 값이 갈라진다 — 실제로 갈라져 있었다.
 * 정책은 공실 50인데 회원은 20, 같은 등급 안에서도 사람마다 달랐다.
 *
 * 표에서 바꾼 칸은 그 등급 회원에게 바로 내려간다. 다만 회원 화면에서
 * [회원별 적용]을 선택한 사람의 공실·기사·강의 한도 세 칸은 명시적으로 제외한다.
 * 표에서 바꾸지 않은 칸은 회원별 값을 그대로 둔다 (다른 칸을 저장하다 값이 지워지지 않도록).
 *
 * force 가 켜지면 바꾸지 않은 칸까지 새 기본값으로 되돌린다.
 * 이때도 [회원별 적용] 회원의 등록 한도 세 칸은 건드리지 않는다.
 */
export async function adminUpdateLimitPolicies(policies: typeof DEFAULT_LIMIT_POLICIES, force: boolean = false) {
  const supabaseAdmin = getAdminClient();
  try {
    // 바꾸기 전 값을 먼저 잡아둔다. 어느 칸을 바꿨는지 이것으로 가린다.
    const { policies: previous } = await adminGetLimitPolicies();

    const FIELDS = [
      'max_vacancies',
      'max_articles_per_month',
      'max_lectures',
      'can_article_banner',
      'can_article_vacancy_banner',
      'can_homepage',
      'max_hero_slides',
      'can_hide_footer_badge',
      'can_intake_photo',
      'can_site_logo',
      'can_hero_video',
      'can_sns_links',
    ] as const;

    // 회원을 읽을 수 있는지 먼저 확인한다. 정책을 먼저 저장하면 스키마 오류가 나도
    // 정책만 바뀌고 회원 한도는 그대로 남는 반쪽 저장이 생긴다.
    const { data: members, error: membersError } = await supabaseAdmin
      .from('members')
      .select(['id', 'role', 'plan_type', 'use_custom_registration_limits', ...FIELDS].join(', '))
      .in('role', ['USER', 'BIZ', 'REALTOR']);
    if (membersError) return { success: false, error: membersError.message };

    const rows = Object.entries(policies).map(([key, value]) => ({ key, value }));
    const { error: upsertError } = await supabaseAdmin
      .from('point_settings')
      .upsert(rows, { onConflict: 'key' });
    if (upsertError) return { success: false, error: upsertError.message };

    let applied = 0;
    for (const m of members as any[]) {
      const before = planDefaults(previous, m.role, m.plan_type) as any;
      const after = planDefaults(policies, m.role, m.plan_type) as any;

      const patch: Record<string, any> = {};
      for (const f of FIELDS) {
        if (m.use_custom_registration_limits && REGISTRATION_LIMIT_FIELDS.has(f)) continue;
        if (after[f] === undefined) continue;
        if (after[f] === m[f]) continue;                    // 이미 새 값이다
        if (!force && after[f] === before[f]) continue;     // 표에서 이 칸은 안 바꿨다 → 회원별 값 유지
        patch[f] = after[f];
      }

      if (Object.keys(patch).length) {
        const { error: memberUpdateError } = await supabaseAdmin.from('members').update(patch).eq('id', m.id);
        if (memberUpdateError) return { success: false, error: memberUpdateError.message };
        applied += 1;
      }
    }

    return { success: true, applied };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
