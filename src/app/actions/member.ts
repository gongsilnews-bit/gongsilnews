"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

import { createNotification } from "./notification";
import { getGradeDefaults } from "@/app/admin/actions";

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
      .select("id, role, signup_completed")
      .eq("id", userId)
      .single();

    // 처음 가입을 마치는 일반회원은 [회원관리 → 등급별 기본 한도 설정]의 일반회원 값을 받는다.
    // 넣지 않으면 DB 칸 기본값(공실 5건 등)이 남아, 표에 3건을 적어도 새 회원은 5건이 됐다.
    const userDefaults = await getGradeDefaults("USER", "free");

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
      if (!existing.signup_completed && (!existing.role || existing.role === "USER")) {
        Object.assign(updateData, userDefaults);
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
        ...userDefaults,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;
    }

    await createNotification({
      recipientRole: "ADMIN",
      type: "member_signup",
      title: "새 회원이 가입했습니다",
      body: `${name.trim()} (${email || "이메일 없음"})`,
      link: "/admin?menu=members",
      mobileLink: "/m/admin/member",
      sourceId: userId,
    });

    return { success: true };
  } catch (err: any) {
    console.error("completeMemberSignup error:", err);
    return { success: false, error: err.message || "회원가입 완료 처리에 실패했습니다." };
  }
}
