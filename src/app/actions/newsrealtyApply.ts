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
        };
      });

      const filtered = (filterStatus && filterStatus !== "ALL")
        ? mapped.filter((item: any) => item.status === filterStatus)
        : mapped;

      return { success: true, data: filtered, isFallback: true };
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

    return { success: true };
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
