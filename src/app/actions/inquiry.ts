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
}) {
  try {
    const supabase = getAdminClient();

    // 입력값 기본 검증
    if (!data.name || !data.phone || !data.category || !data.content) {
      return { success: false, message: "필수 입력 항목이 누락되었습니다." };
    }

    // 본문 요약으로 제목 채우기 (제목이 비어있는 경우)
    const title = data.title || (data.content.length > 30 ? data.content.substring(0, 30) + "..." : data.content);

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
