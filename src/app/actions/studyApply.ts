"use server";

import { createClient } from "@supabase/supabase-js";
import { sendPpurioSms } from "@/utils/ppurio";
import { createNotification } from "./notification";

/**
 * 공실스터디 멤버십 신청
 *
 * 전용 테이블 없이 board_posts 의 'study_apply' 보드에 저장한다.
 * 보드는 관리자 전용 inquiry 타입(마이그레이션 20260925_add_study_apply_board)이라
 * 회원은 자기 신청만 보고, 관리자는 게시판 관리에서 전체 신청을 본다.
 * 신청 상세는 external_url 에 JSON 으로 담는다 (공실뉴스부동산 보조 저장과 같은 방식).
 */
const BOARD_ID = "study_apply";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface StudyApplicationInput {
  memberId: string;
  name: string;
  phone: string;
  email?: string;
  agencyName?: string;
}

/**
 * 회원의 기존 멤버십 신청 내역 확인 (중복 신청 방지)
 */
export async function checkExistingStudyApplication(memberId?: string) {
  if (!memberId) return { exists: false, application: null };
  try {
    const supabase = getAdminClient();
    const { data: posts, error } = await supabase
      .from("board_posts")
      .select("id, created_at, author_name, external_url")
      .eq("board_id", BOARD_ID)
      .eq("author_id", memberId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !posts || posts.length === 0) return { exists: false, application: null };

    const post = posts[0];
    let meta: any = {};
    try {
      meta = JSON.parse(post.external_url || "{}");
    } catch {
      meta = {};
    }

    return {
      exists: true,
      application: {
        id: post.id,
        status: meta.status || "신규",
        created_at: post.created_at,
        applicant_name: meta.name || post.author_name,
        agency_name: meta.agencyName || "",
        phone: meta.phone || "",
        email: meta.email || "",
      },
    };
  } catch (err: any) {
    console.error("checkExistingStudyApplication error:", err);
    return { exists: false, application: null };
  }
}

/**
 * 공실스터디 멤버십 신청 접수
 */
export async function submitStudyApplication(data: StudyApplicationInput) {
  try {
    if (!data.memberId) {
      return { success: false, message: "로그인 후 신청하실 수 있습니다." };
    }
    if (!data.name?.trim()) {
      return { success: false, message: "신청자 성함을 입력해주세요." };
    }
    const cleanPhone = (data.phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      return { success: false, message: "올바른 연락처 번호를 입력해주세요." };
    }

    const existing = await checkExistingStudyApplication(data.memberId);
    if (existing.exists && existing.application && existing.application.status !== "반려") {
      return {
        success: false,
        alreadyApplied: true,
        message: "이미 공실스터디 멤버십 신청서가 접수되어 있습니다.",
      };
    }

    const supabase = getAdminClient();
    const name = data.name.trim();
    const email = data.email?.trim() || "";
    const agencyName = data.agencyName?.trim() || "";

    const meta = {
      name,
      phone: cleanPhone,
      email,
      agencyName,
      status: "신규",
      admin_notes: "",
      sms_sent: false,
      source: "study_apply",
    };

    const content =
      `[공실스터디 멤버십 신청]\n- 신청자: ${name}\n- 연락처: ${cleanPhone}\n` +
      `- 이메일: ${email || "미입력"}\n- 중개사무소: ${agencyName || "미입력"}`;

    const { data: post, error } = await supabase
      .from("board_posts")
      .insert([
        {
          board_id: BOARD_ID,
          title: `[공실스터디 멤버십 신청] ${name}${agencyName ? ` (${agencyName})` : ""}`,
          content,
          author_name: name,
          author_id: data.memberId,
          external_url: JSON.stringify(meta),
          is_notice: false,
          is_deleted: false,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("submitStudyApplication insert error:", error);
      return { success: false, message: "접수 처리 중 오류가 발생했습니다: " + error.message };
    }

    await createNotification({
      recipientRole: "ADMIN",
      type: "study_apply",
      title: "공실스터디 멤버십 신청이 접수되었습니다",
      body: `${name} · ${cleanPhone}${agencyName ? ` · ${agencyName}` : ""}`,
      link: "/admin?menu=study",
      sourceId: String(post.id),
    });

    // 신청자 접수 확인 문자 + 관리자 알림 문자
    let smsSent = false;
    try {
      const smsRes = await sendPpurioSms({
        to: cleanPhone,
        content:
          `[공실스터디] 멤버십 신청이 정상 접수되었습니다.\n\n` +
          `■ 신청자: ${name}님\n\n` +
          `담당자가 확인 후 1~2일 이내 연락드리겠습니다.\n\n` +
          `공실뉴스 고객지원: 1555-5343`,
        subject: "[공실스터디] 멤버십 신청완료",
      });
      smsSent = !!smsRes.success;

      const adminNoticePhone = process.env.PPURIO_FROM || "15555343";
      sendPpurioSms({
        to: adminNoticePhone,
        content:
          `[신규 접수] 공실스터디 멤버십 신청\n` +
          `- 신청자: ${name} (${cleanPhone})\n` +
          `- 중개사무소: ${agencyName || "미입력"}`,
        subject: "[관리자알림] 공실스터디 신규접수",
      }).catch((err) => console.error("Study admin SMS failed:", err));

      if (smsSent) {
        await supabase
          .from("board_posts")
          .update({ external_url: JSON.stringify({ ...meta, sms_sent: true }) })
          .eq("id", post.id);
      }
    } catch (smsErr) {
      console.error("Study apply SMS exception:", smsErr);
    }

    return { success: true, smsSent };
  } catch (err: any) {
    console.error("submitStudyApplication error:", err);
    return { success: false, message: err?.message || "서버 오류가 발생했습니다." };
  }
}
