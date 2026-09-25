"use server";

import { createClient } from "@supabase/supabase-js";
import { sendPpurioSms } from "@/utils/ppurio";
import { createNotification } from "./notification";
import { checkExistingNewsrealtyApplication } from "./newsrealtyApply";

/**
 * 공실스터디 멤버십 신청
 *
 * 공실뉴스부동산 신청과 같은 newsrealty_applications 표에 service='study' 로 저장한다.
 * 관리자는 멤버십관리 화면에서 두 신청을 함께 보고, 승인완료 시 회원 등급이
 * 공실스터디부동산(study_premium)으로 바뀐다.
 */
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
  return checkExistingNewsrealtyApplication(memberId, undefined, "study");
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

    const { data: inserted, error } = await supabase
      .from("newsrealty_applications")
      .insert([
        {
          member_id: data.memberId,
          applicant_name: name,
          phone: cleanPhone,
          email: email || null,
          agency_name: agencyName || "-",
          interests: ["공실스터디"],
          memo: `[공실스터디 멤버십 신청] 신청자: ${name} / 연락처: ${cleanPhone} / 이메일: ${email || "미입력"} / 중개사무소: ${agencyName || "미입력"}`,
          status: "신규",
          sms_sent: false,
          email_sent: false,
          kakao_sent: false,
          service: "study",
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
      link: "/admin?menu=newsrealty&service=study",
      sourceId: String(inserted.id),
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
        await supabase.from("newsrealty_applications").update({ sms_sent: true }).eq("id", inserted.id);
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
