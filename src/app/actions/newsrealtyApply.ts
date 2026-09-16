"use server";

import { createClient } from "@supabase/supabase-js";
import { sendPpurioSms } from "@/utils/ppurio";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
      console.warn("newsrealty_applications 테이블 저장 실패, site_inquiries 보조 저장 시도:", insertError.message);
      
      // 만약 newsrealty_applications 테이블이 아직 생성되지 않은 상태라면
      // 기존 site_inquiries 테이블에 '공실뉴스부동산' 카테고리로 안전하게 폴백 저장
      const interestsStr = (data.interests && data.interests.length > 0) ? `\n- 관심 서비스: ${data.interests.join(", ")}` : "";
      const regionStr = [data.regionCity, data.regionDistrict, data.regionDong].filter(Boolean).join(" ");
      const fullContent = `[공실뉴스부동산 파트너 신청]\n- 사무소: ${data.agencyName}\n- 지역: ${regionStr || "미입력"}\n- 주소: ${data.agencyAddress || "미입력"}${interestsStr}\n- 추가요청: ${data.memo || "없음"}`;

      const { data: fallbackInquiry, error: fallbackError } = await supabase
        .from("site_inquiries")
        .insert([
          {
            name: data.name.trim(),
            phone: cleanPhone,
            email: data.email?.trim() || null,
            category: "공실뉴스부동산",
            title: `[공실뉴스부동산 신청] ${data.agencyName} (${data.name})`,
            content: fullContent,
            user_id: data.memberId || null,
            ip_address: data.ipAddress || null,
            status: "신규",
          },
        ])
        .select()
        .single();

      if (fallbackError) {
        console.error("Fallback site_inquiries insertion failed:", fallbackError);
        return { success: false, message: "접수 처리 중 데이터베이스 오류가 발생했습니다: " + insertError.message };
      }

      insertedId = fallbackInquiry.id;
      usedTable = "site_inquiries";
    } else {
      insertedId = inserted?.id || null;
    }

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

      // SMS 발송 상태 업데이트 (newsrealty_applications 테이블인 경우)
      if (insertedId && usedTable === "newsrealty_applications" && smsSuccess) {
        await supabase
          .from("newsrealty_applications")
          .update({ sms_sent: true })
          .eq("id", insertedId);
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
      // 테이블이 없을 경우 site_inquiries에서 '공실뉴스부동산' 카테고리 폴백 조회
      console.warn("newsrealty_applications 조회 실패, site_inquiries에서 폴백 조회:", error.message);
      let fallbackQuery = supabase
        .from("site_inquiries")
        .select("*")
        .eq("category", "공실뉴스부동산")
        .order("created_at", { ascending: false });

      if (filterStatus && filterStatus !== "ALL") {
        fallbackQuery = fallbackQuery.eq("status", filterStatus);
      }

      const { data: fallbackData, error: fbErr } = await fallbackQuery;
      if (fbErr) {
        return { success: false, message: fbErr.message, data: [] };
      }

      // site_inquiries 형식 데이터를 표준 application 포맷으로 매핑
      const mapped = (fallbackData || []).map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        applicant_name: row.name,
        phone: row.phone,
        email: row.email,
        agency_name: row.title?.replace("[공실뉴스부동산 신청] ", "") || "중개사무소",
        agency_address: "",
        region_city: "",
        region_district: "",
        region_dong: "",
        interests: [],
        memo: row.content,
        status: row.status || "신규",
        admin_notes: row.admin_notes,
        sms_sent: true,
        email_sent: false,
        kakao_sent: false,
      }));

      return { success: true, data: mapped, isFallback: true };
    }

    return { success: true, data: data || [], isFallback: false };
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
    const supabase = getAdminClient();
    const table = isFallback ? "site_inquiries" : "newsrealty_applications";

    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "연락완료" && !isFallback) {
      updatePayload.contacted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, data };
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
    const table = isFallback ? "site_inquiries" : "newsrealty_applications";

    const { data, error } = await supabase
      .from(table)
      .update({
        admin_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, data };
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
