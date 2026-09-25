"use server";

import { createClient } from "@supabase/supabase-js";
import { sendPpurioSms } from "@/utils/ppurio";
import { createNotification } from "./notification";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { adminUpdateMember } from "@/app/admin/actions";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: member } = await getAdminClient()
    .from("members")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return isAdminRole(member?.role) ? user : null;
}

const PLAN_BY_SERVICE: Record<MembershipService, { planType: string; label: string }> = {
  newsrealty: { planType: "news_premium", label: "공실뉴스부동산" },
  study: { planType: "study_premium", label: "공실스터디부동산" },
};

/**
 * 승인완료된 신청의 회원 등급을 해당 멤버십으로 바꾼다.
 * 공실뉴스부동산이 최상위라 공실스터디 승인으로 등급을 낮추지 않는다.
 * 관리자에게 보여줄 결과 문구를 돌려준다.
 */
async function grantMembershipPlan(applicationId: string): Promise<string> {
  const supabase = getAdminClient();

  let memberId: string | null = null;
  let service: MembershipService = "newsrealty";
  const { data: app } = await supabase
    .from("newsrealty_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (app) {
    memberId = app.member_id;
    service = serviceOf(app);
  } else {
    const { data: post } = await supabase
      .from("board_posts")
      .select("author_id")
      .eq("id", applicationId)
      .maybeSingle();
    memberId = post?.author_id || null;
  }

  if (!memberId) return "신청서에 연결된 회원 계정이 없어 회원 등급은 바뀌지 않았습니다.";

  const { data: member } = await supabase
    .from("members")
    .select("role, plan_type")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return "회원 정보를 찾지 못해 회원 등급은 바뀌지 않았습니다.";
  if (isAdminRole(member.role)) return "관리자 계정이라 회원 등급은 바꾸지 않았습니다.";

  const target = PLAN_BY_SERVICE[service];
  if (member.plan_type === target.planType) {
    return `이미 ${target.label} 회원이라 등급은 그대로입니다.`;
  }
  if (service === "study" && member.plan_type === "news_premium") {
    return "이미 상위 등급(공실뉴스부동산) 회원이라 등급은 그대로입니다.";
  }

  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const res = await adminUpdateMember(memberId, {
    role: "REALTOR",
    plan_type: target.planType,
    plan_start_date: start.toISOString(),
    plan_end_date: end.toISOString(),
  });
  if (!res.success) return `회원 등급 변경 실패: ${res.error}`;

  const { data: agency } = await supabase
    .from("agencies")
    .select("status")
    .eq("owner_id", memberId)
    .maybeSingle();
  const agencyNote = agency?.status === "APPROVED"
    ? ""
    : " (중개사무소 승인 전이라 등급 권한은 중개소 승인 후부터 적용됩니다)";

  return `회원 등급이 ${target.label}(1년)으로 변경되었습니다.${agencyNote}`;
}

export interface NewsrealtyApplicationInput {
  memberId?: string;
  name: string;
  phone: string;
  email?: string;
  agencyName: string;
  agencyAddress?: string;
  regionCity?: string;
  regionDistrict?: string;
  regionDong?: string;
  interests?: string[];
  memo?: string;
  ipAddress?: string;
}

/** 멤버십 신청 종류. service 칸이 없던 시절의 행은 모두 공실뉴스부동산 신청이다. */
export type MembershipService = "newsrealty" | "study";

const serviceOf = (row: { service?: string | null }): MembershipService =>
  row.service === "study" ? "study" : "newsrealty";

/**
 * 회원의 기존 신청 내역 확인 (중복 신청 방지). 서비스별로 따로 본다.
 */
export async function checkExistingNewsrealtyApplication(
  memberId?: string,
  phone?: string,
  service: MembershipService = "newsrealty"
) {
  try {
    const supabase = getAdminClient();
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : null;

    if (!memberId && (!cleanPhone || cleanPhone.length < 9)) {
      return { exists: false, application: null };
    }

    // 1. newsrealty_applications 테이블 조회 시도
    let query = supabase.from("newsrealty_applications").select("*");

    if (memberId && cleanPhone && cleanPhone.length >= 9) {
      query = query.or(`member_id.eq.${memberId},phone.eq.${cleanPhone}`);
    } else if (memberId) {
      query = query.eq("member_id", memberId);
    } else if (cleanPhone && cleanPhone.length >= 9) {
      query = query.eq("phone", cleanPhone);
    } else {
      return { exists: false, application: null };
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(20);

    const app = !error ? (data || []).find((row: any) => serviceOf(row) === service) : undefined;
    if (app) {
      return {
        exists: true,
        application: {
          id: app.id,
          status: app.status || "신규",
          created_at: app.created_at,
          applicant_name: app.applicant_name,
          agency_name: app.agency_name,
          phone: app.phone,
          email: app.email,
        },
      };
    }

    // 2. board_posts 폴백 테이블 조회 (공실뉴스부동산만 폴백이 있다)
    if (memberId && service === "newsrealty") {
      const { data: posts, error: postErr } = await supabase
        .from("board_posts")
        .select("*")
        .eq("board_id", "newsrealty")
        .eq("author_id", memberId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!postErr && posts && posts.length > 0) {
        const post = posts[0];
        let meta: any = {};
        try {
          meta = JSON.parse(post.external_url || "{}");
        } catch (e) {
          meta = {};
        }

        return {
          exists: true,
          application: {
            id: post.id,
            status: meta.status || "신규",
            created_at: post.created_at,
            applicant_name: meta.name || post.author_name,
            agency_name: meta.agencyName || "중개사무소",
            phone: meta.phone || "",
            email: meta.email || "",
          },
        };
      }
    }

    return { exists: false, application: null };
  } catch (err: any) {
    console.error("checkExistingNewsrealtyApplication error:", err);
    return { exists: false, application: null };
  }
}

/**
 * 공실뉴스부동산 파트너 신청 접수
 */
export async function submitNewsrealtyApplication(data: NewsrealtyApplicationInput) {
  try {
    const supabase = getAdminClient();

    // 1. 필수값 유효성 검증
    if (!data.name?.trim()) {
      return { success: false, message: "신청자 성함을 입력해주세요." };
    }
    if (!data.phone?.trim()) {
      return { success: false, message: "휴대폰 번호를 입력해주세요." };
    }
    if (!data.agencyName?.trim()) {
      return { success: false, message: "중개사무소 명칭을 입력해주세요." };
    }

    const cleanPhone = data.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      return { success: false, message: "올바른 연락처 번호를 입력해주세요." };
    }

    // 1-1. 중복 신청 여부 체크 (이미 신청한 회원은 중복 접수 방지)
    const existingCheck = await checkExistingNewsrealtyApplication(data.memberId, cleanPhone);
    if (existingCheck.exists && existingCheck.application) {
      const status = existingCheck.application.status || "신규";
      if (status === "승인완료") {
        return {
          success: false,
          alreadyApplied: true,
          status,
          message: "이미 공실뉴스부동산 파트너로 승인 완료된 회원입니다.",
        };
      } else if (status !== "반려") {
        return {
          success: false,
          alreadyApplied: true,
          status,
          message: "이미 파트너 입점 신청서가 접수되어 심사 진행 중입니다. (1영업일 이내 유선 안내)",
        };
      }
    }

    let insertedId: string | null = null;
    let usedTable = "newsrealty_applications";

    // 2. newsrealty_applications 테이블에 인서트 시도
    const { data: inserted, error: insertError } = await supabase
      .from("newsrealty_applications")
      .insert([
        {
          member_id: data.memberId || null,
          applicant_name: data.name.trim(),
          phone: cleanPhone,
          email: data.email?.trim() || null,
          agency_name: data.agencyName.trim(),
          agency_address: data.agencyAddress?.trim() || null,
          region_city: data.regionCity?.trim() || null,
          region_district: data.regionDistrict?.trim() || null,
          region_dong: data.regionDong?.trim() || null,
          interests: data.interests || [],
          memo: data.memo?.trim() || null,
          status: "신규",
          sms_sent: false,
          email_sent: false,
          kakao_sent: false,
          ip_address: data.ipAddress || null,
        },
      ])
      .select()
      .maybeSingle();

    if (insertError) {
      console.warn("newsrealty_applications 테이블 저장 실패, board_posts(newsrealty) 보조 저장 시도:", insertError.message);

      // 만약 newsrealty_applications 테이블이 아직 생성되지 않은 상태라면
      // 실제 존재하는 board_posts 테이블의 'newsrealty' 게시판에 안전하게 저장
      const structuredMeta = {
        name: data.name.trim(),
        phone: cleanPhone,
        email: data.email?.trim() || null,
        agencyName: data.agencyName.trim(),
        agencyAddress: data.agencyAddress?.trim() || "",
        regionCity: data.regionCity?.trim() || "",
        regionDistrict: data.regionDistrict?.trim() || "",
        regionDong: data.regionDong?.trim() || "",
        interests: data.interests || [],
        memo: data.memo?.trim() || "",
        status: "신규",
        admin_notes: "",
        sms_sent: false,
        ip_address: data.ipAddress || null,
        source: "newsrealty_apply",
      };

      const regionStr = [data.regionCity, data.regionDistrict, data.regionDong].filter(Boolean).join(" ");
      const interestsStr = (data.interests && data.interests.length > 0) ? `\n- 관심 서비스: ${data.interests.join(", ")}` : "";
      const fullContent = `[공실뉴스부동산 파트너 신청]\n- 신청자: ${data.name}\n- 연락처: ${cleanPhone}\n- 이메일: ${data.email || "미입력"}\n- 사무소: ${data.agencyName}\n- 지역: ${regionStr || "미입력"}\n- 주소: ${data.agencyAddress || "미입력"}${interestsStr}\n- 추가요청: ${data.memo || "없음"}`;

      const { data: fallbackPost, error: fallbackError } = await supabase
        .from("board_posts")
        .insert([
          {
            board_id: "newsrealty",
            title: `[공실뉴스부동산 신청] ${data.agencyName} (${data.name})`,
            content: fullContent,
            author_name: data.name.trim(),
            author_id: data.memberId || null,
            external_url: JSON.stringify(structuredMeta),
            is_notice: false,
            is_deleted: false,
          },
        ])
        .select()
        .single();

      if (fallbackError) {
        console.error("Fallback board_posts insertion failed:", fallbackError);
        return { success: false, message: "접수 처리 중 데이터베이스 오류가 발생했습니다: " + fallbackError.message };
      }

      insertedId = fallbackPost.id;
      usedTable = "board_posts";
    } else {
      insertedId = inserted?.id || null;
    }

    // 신청은 본 테이블(newsrealty_applications)과 보조 테이블(board_posts) 중
    // 어디에 저장되든 접수된 것이므로, 두 경로가 합쳐진 이 지점에서 알림을 남긴다
    await createNotification({
      recipientRole: "ADMIN",
      type: "newsrealty_apply",
      title: "공실뉴스부동산 신청이 접수되었습니다",
      body: `${data.name.trim()} · ${data.agencyName.trim()}`,
      link: "/admin?menu=newsrealty",
      mobileLink: "/m/admin/customer",
      sourceId: insertedId ? String(insertedId) : undefined,
    });

    // 3. 자동 문자(SMS) 알림 발송
    let smsSuccess = false;
    try {
      const interestsSummary = (data.interests && data.interests.length > 0)
        ? `\n관심분야: ${data.interests.slice(0, 3).join(", ")}`
        : "";

      // (A) 신청자 본인에게 접수 완료 확인 SMS
      const applicantMsg = `[공실뉴스] 공실뉴스부동산 파트너 신청이 정상 접수되었습니다.\n\n` +
        `■ 신청자: ${data.name} 대표님\n` +
        `■ 사무소: ${data.agencyName}${interestsSummary}\n\n` +
        `전문 담당 매니저가 기재해주신 내용을 검토 후 1영업일 이내 유선 안내드리겠습니다.\n\n` +
        `공실뉴스 고객지원: 1555-5343`;

      const smsRes = await sendPpurioSms({
        to: cleanPhone,
        content: applicantMsg,
        subject: "[공실뉴스] 공실뉴스부동산 신청완료",
      });

      if (smsRes.success) {
        smsSuccess = true;
      } else {
        console.warn("신청자 SMS 발송 결과 실패:", smsRes.error);
      }

      // (B) 관리자 대표 번호로 신규 접수 알림 SMS 발송
      const adminNoticePhone = process.env.PPURIO_FROM || "15555343";
      if (adminNoticePhone) {
        const adminMsg = `[신규 접수] 공실뉴스부동산 파트너 신청\n` +
          `- 대표: ${data.name} (${cleanPhone})\n` +
          `- 사무소: ${data.agencyName}\n` +
          `- 지역: ${[data.regionCity, data.regionDistrict].filter(Boolean).join(" ") || "미입력"}\n` +
          `관리자 페이지에서 확인하세요.`;

        sendPpurioSms({
          to: adminNoticePhone,
          content: adminMsg,
          subject: "[관리자알림] 공실뉴스부동산 신규접수",
        }).catch((err) => console.error("Admin SMS notification failed:", err));
      }

      // SMS 발송 상태 업데이트
      if (insertedId && smsSuccess) {
        if (usedTable === "newsrealty_applications") {
          await supabase
            .from("newsrealty_applications")
            .update({ sms_sent: true })
            .eq("id", insertedId);
        } else if (usedTable === "board_posts") {
          const { data: p } = await supabase
            .from("board_posts")
            .select("external_url")
            .eq("id", insertedId)
            .single();
          if (p?.external_url) {
            try {
              const meta = JSON.parse(p.external_url);
              meta.sms_sent = true;
              await supabase
                .from("board_posts")
                .update({ external_url: JSON.stringify(meta) })
                .eq("id", insertedId);
            } catch (e) {
              console.error("Failed to update sms_sent in board_posts:", e);
            }
          }
        }
      }
    } catch (smsErr) {
      console.error("SMS notification exception:", smsErr);
    }

    return {
      success: true,
      applicationId: insertedId,
      smsSent: smsSuccess,
      message: "공실뉴스부동산 파트너 신청이 성공적으로 접수되었습니다.",
    };
  } catch (err: any) {
    console.error("submitNewsrealtyApplication error:", err);
    return { success: false, message: err.message || "서버 오류가 발생했습니다." };
  }
}

/**
 * 관리자용: 신청 목록 조회
 */
export async function getNewsrealtyApplications(filterStatus?: string) {
  try {
    const supabase = getAdminClient();

    // 1. newsrealty_applications 테이블 조회 시도
    let query = supabase
      .from("newsrealty_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatus && filterStatus !== "ALL") {
      query = query.eq("status", filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      // 2. 테이블이 없을 경우 board_posts('newsrealty')에서 폴백 조회
      let postQuery = supabase
        .from("board_posts")
        .select("*")
        .eq("board_id", "newsrealty")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      const { data: postData, error: postErr } = await postQuery;
      if (postErr) {
        return { success: false, message: postErr.message, data: [] };
      }

      // board_posts JSON 데이터를 표준 application 포맷으로 매핑
      const mapped = (postData || []).map((row: any) => {
        let meta: any = {};
        try {
          meta = JSON.parse(row.external_url || "{}");
        } catch (e) {
          meta = {};
        }

        return {
          id: row.id,
          created_at: row.created_at,
          applicant_name: meta.name || row.author_name,
          phone: meta.phone || "",
          email: meta.email || "",
          agency_name: meta.agencyName || row.title?.replace("[공실뉴스부동산 신청] ", "") || "중개사무소",
          agency_address: meta.agencyAddress || "",
          region_city: meta.regionCity || "",
          region_district: meta.regionDistrict || "",
          region_dong: meta.regionDong || "",
          interests: meta.interests || [],
          memo: meta.memo || row.content,
          status: meta.status || "신규",
          admin_notes: meta.admin_notes || "",
          sms_sent: meta.sms_sent !== false,
          email_sent: false,
          kakao_sent: false,
          service: "newsrealty",
        };
      });

      const filtered = (filterStatus && filterStatus !== "ALL")
        ? mapped.filter((item: any) => item.status === filterStatus)
        : mapped;

      return { success: true, data: filtered, isFallback: true };
    }

    const withService = (data || []).map((row: any) => ({ ...row, service: serviceOf(row) }));
    return { success: true, data: withService, isFallback: false };
  } catch (err: any) {
    console.error("getNewsrealtyApplications error:", err);
    return { success: false, message: err.message, data: [] };
  }
}

/**
 * 관리자용: 상태 변경
 */
export async function updateNewsrealtyStatus(id: string, status: string, isFallback: boolean = false) {
  try {
    // 승인완료는 회원 등급을 올리므로 최고관리자만 바꿀 수 있다
    if (!(await requireAdmin())) {
      return { success: false, message: "최고관리자만 상태를 변경할 수 있습니다." };
    }
    const supabase = getAdminClient();

    // 1. newsrealty_applications 시도
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "연락완료" && !isFallback) {
      updatePayload.contacted_at = new Date().toISOString();
    }

    const { error: appErr } = await supabase
      .from("newsrealty_applications")
      .update(updatePayload)
      .eq("id", id);

    if (appErr) {
      // 2. board_posts 폴백 업데이트
      const { data: post } = await supabase
        .from("board_posts")
        .select("external_url")
        .eq("id", id)
        .single();

      if (post?.external_url) {
        try {
          const meta = JSON.parse(post.external_url);
          meta.status = status;
          await supabase
            .from("board_posts")
            .update({
              external_url: JSON.stringify(meta),
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        } catch (e) {
          console.error("Failed to parse external_url in updateNewsrealtyStatus:", e);
        }
      }
    }

    // 승인완료가 되면 신청한 회원의 등급을 해당 멤버십으로 바꾼다
    let planMessage: string | undefined;
    if (status === "승인완료") {
      planMessage = await grantMembershipPlan(id);
    }

    return { success: true, planMessage };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * 관리자용: 메모 수정
 */
export async function updateNewsrealtyAdminNotes(id: string, notes: string, isFallback: boolean = false) {
  try {
    const supabase = getAdminClient();

    // 1. newsrealty_applications 시도
    const { error: appErr } = await supabase
      .from("newsrealty_applications")
      .update({
        admin_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (appErr) {
      // 2. board_posts 폴백 업데이트
      const { data: post } = await supabase
        .from("board_posts")
        .select("external_url")
        .eq("id", id)
        .single();

      if (post?.external_url) {
        try {
          const meta = JSON.parse(post.external_url);
          meta.admin_notes = notes;
          await supabase
            .from("board_posts")
            .update({
              external_url: JSON.stringify(meta),
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        } catch (e) {
          console.error("Failed to parse external_url in updateNewsrealtyAdminNotes:", e);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * 관리자용: 안내 SMS 재발송
 */
export async function resendNewsrealtySms(phone: string, applicantName: string, agencyName: string) {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const applicantMsg = `[공실뉴스] 공실뉴스부동산 파트너 신청 안내\n\n` +
      `안녕하세요, ${applicantName} 대표님 (${agencyName}).\n` +
      `공실뉴스부동산 입점 및 파트너십 안내 관련하여 담당자가 배정되었습니다.\n\n` +
      `문의 및 상담: 1555-5343 (공실뉴스 파트너팀)`;

    const res = await sendPpurioSms({
      to: cleanPhone,
      content: applicantMsg,
      subject: "[공실뉴스] 파트너십 안내",
    });

    return res;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 관리자용: 신청 내역 삭제 (단일/일괄)
 */
export async function deleteNewsrealtyApplications(ids: string[]) {
  try {
    if (!ids || ids.length === 0) return { success: false, message: "삭제할 항목이 없습니다." };
    const supabase = getAdminClient();

    // 1. newsrealty_applications 테이블에서 삭제
    await supabase
      .from("newsrealty_applications")
      .delete()
      .in("id", ids);

    // 2. board_posts 폴백 테이블에서도 삭제
    await supabase
      .from("board_posts")
      .delete()
      .in("id", ids);

    return { success: true };
  } catch (err: any) {
    console.error("deleteNewsrealtyApplications error:", err);
    return { success: false, message: err.message };
  }
}

