"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function completeMemberSignup(params: {
  userId: string;
  name: string;
  phone: string;
  email?: string;
}) {
  const { userId, name, phone, email } = params;
  if (!userId) {
    return { success: false, error: "사용자 ID가 전달되지 않았습니다." };
  }

  const supabase = getAdminClient();

  try {
    // 1. 기존 회원이 존재하는지 확인
    const { data: existing, error: selectError } = await supabase
      .from("members")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (existing) {
      // 기존 회원 정보 업데이트
      const updateData: any = {
        name: name.trim(),
        phone: phone.trim(),
        signup_completed: true,
        updated_at: new Date().toISOString(),
      };
      if (!existing.role) {
        updateData.role = "USER";
      }

      const { error: updateError } = await supabase
        .from("members")
        .update(updateData)
        .eq("id", userId);

      if (updateError) throw updateError;
    } else {
      // 회원이 없는 경우 새로 삽입 (안전망)
      const { error: insertError } = await supabase.from("members").insert({
        id: userId,
        email: email || "",
        name: name.trim(),
        phone: phone.trim(),
        role: "USER",
        status: "active",
        signup_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (err: any) {
    console.error("completeMemberSignup error:", err);
    return { success: false, error: err.message || "회원가입 완료 처리에 실패했습니다." };
  }
}
