// 휴대폰 푸시 (2026-11-18 사장님: 앱 잠금화면 알림)
//
// 사이트 알림(notifications)이 하나 생길 때마다 받는 사람의 휴대폰(push_tokens)으로 Expo 푸시를 함께 보낸다.
//  - 앱 [설정] › 알림 켜기·끄기(members.notify_prefs)를 따른다. 끈 종류는 알림함에만 남고 휴대폰은 안 울린다
//  - 방해 금지 시간(quiet)을 켠 사람은 밤 10시~아침 8시(한국 시각)에 울리지 않는다
//  - 최고관리자 공용 알림(recipient_role ADMIN)은 최고관리자 휴대폰 전부로
//  - Expo 가 "이 휴대폰은 더 이상 없음"(DeviceNotRegistered)이라 하면 그 토큰을 지운다
// 안드로이드 전달은 Expo 가 구글 FCM 으로 한다 (Firebase 허가증은 EAS 에 올려 둔다)
// 표: supabase/migrations/20261118_push_tokens.sql — 표가 없으면 조용히 아무것도 안 한다
import { createClient } from "@supabase/supabase-js";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

/** 알림 종류 → 앱 설정 칸. 여기 없는 종류(최고관리자용 등)는 늘 보낸다 */
const PREF_OF: Record<string, string> = {
  star_trade: "star_trade",
  star_vacancy: "star_vacancy",
  star_article: "star_vacancy",
  inquiry_answered: "inquiry",
  vacancy_report: "my_review",
  lecture_approved: "my_review",
  lecture_rejected: "my_review",
  realtor_approved: "my_review",
  realtor_rejected: "my_review",
  article_approved: "my_review",
  article_rejected: "my_review",
  sub_article: "sub_article",
  news_push: "news_push",
};

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "최고관리자"];

/** 지금이 한국 시각 밤 10시~아침 8시인가 */
function quietNow() {
  const h = (new Date().getUTCHours() + 9) % 24;
  return h >= 22 || h < 8;
}

export async function sendPushFor(n: {
  recipientId?: string | null;
  recipientRole?: string | null;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  const supabase = db();
  // 받는 사람들
  let members: { id: string; notify_prefs: Record<string, boolean> | null }[] = [];
  if (n.recipientId) {
    const { data } = await supabase.from("members").select("id, notify_prefs").eq("id", n.recipientId).limit(1);
    members = (data || []) as typeof members;
  } else if (n.recipientRole === "ADMIN") {
    const { data } = await supabase.from("members").select("id, notify_prefs").in("role", ADMIN_ROLES).limit(50);
    members = (data || []) as typeof members;
  }
  if (!members.length) return;

  const pref = PREF_OF[n.type];
  const quiet = quietNow();
  const ids = members.filter((m) => {
    const p = m.notify_prefs || {};
    if (pref && p[pref] === false) return false; // 끈 종류
    if (quiet && p.quiet === true) return false; // 방해 금지 시간
    return true;
  }).map((m) => m.id);
  if (!ids.length) return;

  const { data: rows, error } = await supabase.from("push_tokens").select("token").in("user_id", ids).limit(200);
  if (error || !rows?.length) return; // 표가 아직 없거나 휴대폰이 없음
  const tokens = [...new Set(rows.map((r) => String(r.token)))];

  await sendExpoPush(tokens.map((to) => ({ to, title: n.title, body: n.body || undefined, data: { link: n.link || "", type: n.type } })));
}

export type PushMessage = { to: string; title: string; body?: string; data?: Record<string, unknown>; richContent?: { image?: string } };

/** Expo 로 보내기 — 100개씩, 없어진 휴대폰 토큰은 지운다. 보낸 수·실패 수를 돌려준다 */
export async function sendExpoPush(list: PushMessage[]) {
  const supabase = db();
  let sent = 0, failed = 0;
  const messages = list.map((m) => ({ ...m, sound: "default", channelId: "default", priority: "high" }));
  // Expo 는 한 번에 100개까지
  for (let i = 0; i < messages.length; i += 100) {
    const part = messages.slice(i, i + 100);
    try {
      const r = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(part),
        signal: AbortSignal.timeout(10000),
      });
      const j = await r.json().catch(() => null);
      const tickets: { status: string; details?: { error?: string } }[] = j?.data || [];
      if (!tickets.length) { failed += part.length; continue; }
      tickets.forEach((t) => (t.status === "ok" ? sent++ : failed++));
      const gone = tickets.map((t, k) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" ? part[k].to : null)).filter(Boolean) as string[];
      if (gone.length) await supabase.from("push_tokens").delete().in("token", gone);
    } catch (e) {
      failed += part.length;
      console.warn("[push]", e instanceof Error ? e.message : e);
    }
  }
  return { sent, failed };
}
