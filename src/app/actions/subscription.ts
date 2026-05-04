"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── 구독 토글 ──
export async function toggleSubscription(reporterId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    // 기존 구독 확인
    const { data: existing } = await supabase
      .from("reporter_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("reporter_id", reporterId)
      .maybeSingle();

    if (existing) {
      // 구독 취소
      await supabase.from("reporter_subscriptions").delete().eq("id", existing.id);
      
      // subscriber_count 감소
      const { data: countData } = await supabase
        .from("reporter_subscriptions")
        .select("id", { count: "exact" })
        .eq("reporter_id", reporterId);
      await supabase.from("members").update({ subscriber_count: countData?.length || 0 }).eq("id", reporterId);
      
      return { success: true, subscribed: false, count: countData?.length || 0 };
    } else {
      // 구독
      const { error } = await supabase.from("reporter_subscriptions").insert({
        user_id: userId,
        reporter_id: reporterId,
      });
      if (error) throw error;

      // subscriber_count 증가
      const { data: countData } = await supabase
        .from("reporter_subscriptions")
        .select("id", { count: "exact" })
        .eq("reporter_id", reporterId);
      await supabase.from("members").update({ subscriber_count: countData?.length || 0 }).eq("id", reporterId);
      
      return { success: true, subscribed: true, count: countData?.length || 0 };
    }
  } catch (error: any) {
    console.error("구독 토글 오류:", error);
    return { success: false, error: error.message };
  }
}

// ── 구독 상태 조회 ──
export async function getSubscriptionStatus(reporterId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    const { data } = await supabase
      .from("reporter_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("reporter_id", reporterId)
      .maybeSingle();
    return { success: true, subscribed: !!data };
  } catch (error: any) {
    return { success: false, subscribed: false };
  }
}

// ── 내 구독 기자 목록 ──
export async function getMySubscriptions(userId: string) {
  const supabase = getAdminClient();
  try {
    const { data: subs } = await supabase
      .from("reporter_subscriptions")
      .select("reporter_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!subs || subs.length === 0) return { success: true, reporters: [] };

    const reporterIds = subs.map(s => s.reporter_id);
    const { data: members } = await supabase
      .from("members")
      .select("id, name, profile_image_url")
      .in("id", reporterIds);

    return { success: true, reporters: members || [] };
  } catch (error: any) {
    console.error("구독 목록 조회 오류:", error);
    return { success: false, reporters: [] };
  }
}

// ── 응원하기 (하루 1회) ──
export async function cheerReporter(reporterId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    // 오늘 날짜
    const today = new Date().toISOString().split("T")[0];

    // 오늘 이미 응원했는지 확인
    const { data: existing } = await supabase
      .from("reporter_cheers")
      .select("id")
      .eq("user_id", userId)
      .eq("reporter_id", reporterId)
      .eq("cheered_at", today)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "already_cheered", message: "오늘은 이미 응원했습니다!" };
    }

    // 응원 추가
    const { error } = await supabase.from("reporter_cheers").insert({
      user_id: userId,
      reporter_id: reporterId,
      cheered_at: today,
    });
    if (error) throw error;

    // 전체 응원 수 업데이트
    const { data: countData } = await supabase
      .from("reporter_cheers")
      .select("id", { count: "exact" })
      .eq("reporter_id", reporterId);
    
    const totalCheers = countData?.length || 0;
    await supabase.from("members").update({ point_balance: totalCheers }).eq("id", reporterId);

    return { success: true, count: totalCheers };
  } catch (error: any) {
    console.error("응원 오류:", error);
    return { success: false, error: error.message };
  }
}

// ── 오늘 응원 여부 확인 ──
export async function getCheerStatus(reporterId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("reporter_cheers")
      .select("id")
      .eq("user_id", userId)
      .eq("reporter_id", reporterId)
      .eq("cheered_at", today)
      .maybeSingle();
    return { success: true, cheered: !!data };
  } catch (error: any) {
    return { success: false, cheered: false };
  }
}

// ── 구독 수 조회 (실시간) ──
export async function getSubscriptionCount(reporterId: string) {
  const supabase = getAdminClient();
  try {
    const { data } = await supabase
      .from("reporter_subscriptions")
      .select("id", { count: "exact" })
      .eq("reporter_id", reporterId);
    return { success: true, count: data?.length || 0 };
  } catch {
    return { success: true, count: 0 };
  }
}

// ── 응원 수 조회 (실시간) ──
export async function getCheerCount(reporterId: string) {
  const supabase = getAdminClient();
  try {
    const { data } = await supabase
      .from("reporter_cheers")
      .select("id", { count: "exact" })
      .eq("reporter_id", reporterId);
    return { success: true, count: data?.length || 0 };
  } catch {
    return { success: true, count: 0 };
  }
}
