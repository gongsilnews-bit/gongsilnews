"use server";

import { createClient } from "@supabase/supabase-js";

/**
 * 알림 생성/조회
 *
 * 수신자는 둘 중 하나로 지정한다.
 *   recipientId   : 특정 회원 (1:1 문의 답변 등)
 *   recipientRole : 역할 전체 ("ADMIN" = 최고관리자 전원)
 *
 * 알림 만들기는 절대 본래 작업을 실패시키지 않는다. 회원가입/기사등록이
 * 알림 때문에 막히면 안 되므로 오류는 로그만 남기고 삼킨다.
 */

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type NotificationType =
  | "member_signup"      // 회원가입 신규
  | "article_pending"    // 신규 기사 등록(승인대기)
  | "newsrealty_apply"   // 공실뉴스부동산 접수
  | "vacancy_new"        // 공실 등록
  | "inquiry_new"        // 1:1문의 접수
  | "inquiry_reply"      // 1:1문의에 회원이 단 추가 질문
  | "inquiry_answered";  // 내 문의에 답변이 달림 (회원용)

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  mobile_link: string | null;
  read_at: string | null;
  created_at: string;
};

/** 알림 생성 (실패해도 호출한 작업은 계속된다) */
export async function createNotification(payload: {
  recipientId?: string | null;
  recipientRole?: "ADMIN" | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  mobileLink?: string;
  sourceId?: string;
  /** 같은 사건이 다시 발생한 경우(예: 반려된 기사의 재승인신청) 기존 알림을
   *  안 읽음으로 되살린다. 중복 방지는 유지하면서 재발생은 놓치지 않는다. */
  revive?: boolean;
}) {
  try {
    if (!payload.recipientId && !payload.recipientRole) return { success: false };

    const supabase = getAdminClient();
    const { error } = await supabase.from("notifications").insert({
      recipient_id: payload.recipientId || null,
      recipient_role: payload.recipientRole || null,
      type: payload.type,
      title: payload.title,
      body: payload.body || null,
      link: payload.link || null,
      mobile_link: payload.mobileLink || payload.link || null,
      source_id: payload.sourceId || null,
    });

    // 같은 사건에 대한 중복 알림(23505)은 정상 흐름이라 조용히 넘긴다
    if (error?.code === "23505") {
      if (payload.revive && payload.sourceId) {
        await supabase
          .from("notifications")
          .update({ read_at: null, created_at: new Date().toISOString(), title: payload.title, body: payload.body || null })
          .eq("type", payload.type)
          .eq("source_id", payload.sourceId);
      }
      return { success: true };
    }
    if (error) {
      console.warn("[createNotification]", payload.type, error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: unknown) {
    console.warn("[createNotification]", err instanceof Error ? err.message : err);
    return { success: false };
  }
}

/** 내 알림 목록 (최신순). isAdmin 이면 ADMIN 공용 알림도 함께 본다 */
export async function getNotifications(options: { userId?: string; isAdmin?: boolean; limit?: number }) {
  const supabase = getAdminClient();
  const limit = options.limit ?? 20;

  try {
    const targets: string[] = [];
    if (options.userId) targets.push(`recipient_id.eq.${options.userId}`);
    if (options.isAdmin) targets.push("recipient_role.eq.ADMIN");
    if (targets.length === 0) return { success: true, data: [] as NotificationRow[], unread: 0 };

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, mobile_link, read_at, created_at")
      .or(targets.join(","))
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { success: false, error: error.message, data: [] as NotificationRow[], unread: 0 };

    let countQuery = supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    countQuery = countQuery.or(targets.join(","));
    const { count } = await countQuery;

    return { success: true, data: (data || []) as NotificationRow[], unread: count || 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알림 조회 실패";
    return { success: false, error: message, data: [] as NotificationRow[], unread: 0 };
  }
}

/** 알림 하나 읽음 처리 */
export async function markNotificationRead(id: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 모두 읽음 처리. types 를 주면 그 종류만 (메뉴 진입 시 해당 알림만 정리) */
export async function markAllNotificationsRead(options: { userId?: string; isAdmin?: boolean; types?: string[] }) {
  const supabase = getAdminClient();
  const targets: string[] = [];
  if (options.userId) targets.push(`recipient_id.eq.${options.userId}`);
  if (options.isAdmin) targets.push("recipient_role.eq.ADMIN");
  if (targets.length === 0) return { success: true };

  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .or(targets.join(","));

  if (options.types?.length) query = query.in("type", options.types);

  const { error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 메뉴 뱃지용: 안 읽은 알림을 종류별로 센다 */
export async function getUnreadCountsByType(options: { userId?: string; isAdmin?: boolean }) {
  const supabase = getAdminClient();
  const targets: string[] = [];
  if (options.userId) targets.push(`recipient_id.eq.${options.userId}`);
  if (options.isAdmin) targets.push("recipient_role.eq.ADMIN");

  const empty: Record<string, number> = {};
  if (targets.length === 0) return { success: true, data: empty };

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("type")
      .is("read_at", null)
      .or(targets.join(","))
      .limit(5000);
    if (error) return { success: false, error: error.message, data: empty };

    const counts: Record<string, number> = {};
    (data || []).forEach((n: { type: string }) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return { success: true, data: counts };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알림 건수 조회 실패";
    return { success: false, error: message, data: empty };
  }
}
