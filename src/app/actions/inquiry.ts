"use server";

import { createClient } from "@supabase/supabase-js";

// 최고관리자 권한의 Supabase 클라이언트 취득
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// 1. 일반 사용자용 문의 등록
export async function submitInquiry(data: {
  name: string;
  phone: string;
  email?: string;
  category: string;
  title?: string;
  content: string;
  userId?: string;
  ipAddress?: string;
  agencyId?: string;     // 해당 중개업소 식별용
  sourceType?: string;   // 'vacancy', 'flyer', 'reporter', 'general' 등
  sourceId?: string;     // 매물/전단지 ID
  budget?: string;       // 보증금/월세 예산
  area?: string;         // 희망 지역 및 매물 설명
}) {
  try {
    const supabase = getAdminClient();

    // 입력값 기본 검증
    if (!data.name || !data.phone || !data.category || !data.content) {
      return { success: false, message: "필수 입력 항목이 누락되었습니다." };
    }

    // 본문 요약으로 제목 채우기 (제목이 비어있는 경우)
    const title = data.title || (data.content.length > 30 ? data.content.substring(0, 30) + "..." : data.content);

    // 1. 공용 플랫폼 문의 테이블에 기록
    const { data: inserted, error } = await supabase
      .from("site_inquiries")
      .insert([
        {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          category: data.category,
          title: title,
          content: data.content,
          user_id: data.userId || null,
          ip_address: data.ipAddress || null,
          status: "신규"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error submitting inquiry to DB:", error);
      return { success: false, message: error.message };
    }

    // 2. 만약 소속 부동산 ID(agencyId)가 제공된 경우 B2B CRM(고객관리)에 자동 인서트 연동!
    if (data.agencyId) {
      // 카테고리에 맞는 고객 유형 매핑
      let customerType = "임차(월세/전세)";
      if (data.category.includes("매도") || data.category === "팔아요") {
        customerType = "매도";
      } else if (data.category.includes("매수") || data.category === "사요") {
        customerType = "매수";
      } else if (data.category.includes("임대") || data.category === "세놓아요") {
        customerType = "임대(월세/전세)";
      }

      const sourceLabel = data.sourceType === "flyer" 
        ? "AI 온라인 전단지" 
        : data.sourceType === "vacancy" 
        ? "공실뉴스 매물문의" 
        : "온라인 문의";

      // crm_customers 테이블에 자동으로 신규 고객 등록
      const { data: customer, error: crmError } = await supabase
        .from("crm_customers")
        .insert([
          {
            agency_id: data.agencyId,
            user_id: data.userId || null,
            name: data.name,
            phone: data.phone,
            type: customerType,
            status: "신규",
            budget: data.budget || null,
            area: data.area || null,
            source: sourceLabel
          }
        ])
        .select()
        .single();

      if (crmError) {
        console.error("Error linking inquiry to B2B CRM:", crmError);
      } else if (customer) {
        // crm_logs 테이블에 최초 타임라인 문의 내역 기록
        const logContent = `💬 [공실뉴스 온라인 문의 연동]\n\n카테고리: ${data.category}\n희망 지역/예산: ${data.area || "-"}/${data.budget || "-"}\n\n[문의 메세지]\n${data.content}`;
        const { error: logError } = await supabase
          .from("crm_logs")
          .insert([
            {
              customer_id: customer.id,
              type: "memo",
              content: logContent
            }
          ]);
        
        if (logError) {
          console.error("Error creating initial memo log from inquiry:", logError);
        }
      }
    }

    return { success: true, data: inserted };
  } catch (err: any) {
    console.error("System error in submitInquiry:", err);
    return { success: false, message: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

// 2. 최고관리자용 문의 전체 조회
export async function getInquiries() {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("site_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching inquiries:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("System error in getInquiries:", err);
    return { success: false, message: err.message };
  }
}

// 3. 최고관리자용 문의 상태 업데이트
export async function updateInquiryStatus(id: string, status: string) {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("site_inquiries")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating inquiry status:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("System error in updateInquiryStatus:", err);
    return { success: false, message: err.message };
  }
}

// 4. 최고관리자용 문의 메모 업데이트
export async function updateInquiryNotes(id: string, notes: string) {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("site_inquiries")
      .update({ admin_notes: notes })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating inquiry notes:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("System error in updateInquiryNotes:", err);
    return { success: false, message: err.message };
  }
}
