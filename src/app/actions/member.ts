"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
  /** 광고성 정보 수신 동의 (선택, 기본 꺼짐) — 2026-11-09 */
  marketingSms?: boolean;
  marketingKakao?: boolean;
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

    // 수신 동의 · 가입 경로 (2026-11-09) — 칸이 아직 없으면(SQL 실행 전) 이 값만 빼고 다시 저장한다
    const extra: Record<string, unknown> = {
      marketing_sms: !!params.marketingSms,
      marketing_kakao: !!params.marketingKakao,
      marketing_agreed_at: new Date().toISOString(),
    };
    if (!existing?.signup_completed) {
      try {
        const raw = (await cookies()).get("gs_ref")?.value;
        if (raw) {
          const j = JSON.parse(raw) as { ref?: string; landing?: string };
          if (j.ref) extra.signup_ref = String(j.ref).slice(0, 100);
          if (j.landing) extra.signup_landing = String(j.landing).slice(0, 300);
        }
      } catch {}
    }

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

      let { error: updateError } = await supabase
        .from("members")
        .update({ ...updateData, ...extra })
        .eq("id", userId);
      if (updateError && isMissingColumn(updateError)) {
        ({ error: updateError } = await supabase.from("members").update(updateData).eq("id", userId));
      }

      if (updateError) throw updateError;
    } else {
      // 회원이 없는 경우 새로 삽입 (안전망)
      const row = {
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
      };
      let { error: insertError } = await supabase.from("members").insert({ ...row, ...extra });
      if (insertError && isMissingColumn(insertError)) {
        ({ error: insertError } = await supabase.from("members").insert(row));
      }

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

/** 칸이 아직 없을 때 나는 오류 (SQL 실행 전) — PostgREST PGRST204 · Postgres 42703 */
function isMissingColumn(e: { code?: string; message?: string } | null) {
  if (!e) return false;
  return e.code === "PGRST204" || e.code === "42703" || /column .* (does not exist|not find)|Could not find the '.*' column/i.test(e.message || "");
}

/** 내 수신 동의 켜고 끄기 (회원 정보 수정) — 2026-11-09. 칸이 없으면 ok:false, missing:true */
export async function updateMyMarketingConsent(userId: string, sms: boolean, kakao: boolean) {
  if (!userId) return { success: false as const, error: "로그인이 필요해요." };
  // 본인만 — 로그인한 사람과 같은지 확인
  try {
    const { createClient: createServerClient } = await import("@/utils/supabase/server");
    const sb = await createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user || user.id !== userId) {
      const { data: me } = user ? await getAdminClient().from("members").select("role").eq("id", user.id).maybeSingle() : { data: null };
      const { isAdminRole } = await import("@/utils/permissionCheck");
      if (!me || !isAdminRole(me.role)) return { success: false as const, error: "본인만 바꿀 수 있어요." };
    }
  } catch {
    return { success: false as const, error: "로그인을 확인하지 못했어요." };
  }
  const { error } = await getAdminClient().from("members")
    .update({ marketing_sms: sms, marketing_kakao: kakao, marketing_agreed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false as const, missing: isMissingColumn(error), error: error.message };
  return { success: true as const };
}

/** 수신 동의 읽기 — 칸이 없으면 missing:true (화면은 "준비 중"으로) */
export async function getMarketingConsent(userId: string) {
  if (!userId) return { success: false as const };
  const { data, error } = await getAdminClient().from("members")
    .select("marketing_sms, marketing_kakao, marketing_agreed_at").eq("id", userId).maybeSingle();
  if (error) return { success: false as const, missing: isMissingColumn(error) };
  return { success: true as const, sms: !!data?.marketing_sms, kakao: !!data?.marketing_kakao, at: (data?.marketing_agreed_at as string | null) || null };
}
