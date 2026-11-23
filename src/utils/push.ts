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
import { after } from "next/server";

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
  const accepted: { id: string; to: string }[] = [];
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
      const tickets: { status: string; id?: string; details?: { error?: string } }[] = j?.data || [];
      if (!tickets.length) { failed += part.length; continue; }
      tickets.forEach((t) => (t.status === "ok" ? sent++ : failed++));
      const gone = tickets.map((t, k) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" ? part[k].to : null)).filter(Boolean) as string[];
      if (gone.length) await supabase.from("push_tokens").delete().in("token", gone);
      tickets.forEach((t, k) => { if (t.status === "ok" && t.id) accepted.push({ id: t.id, to: part[k].to }); });
    } catch (e) {
      failed += part.length;
      console.warn("[push]", e instanceof Error ? e.message : e);
    }
  }
  // Expo 가 받았어도 구글(FCM)이 나중에 "없는 휴대폰"이라 돌려보내는 것이 있다 (2026-11-22: 앱을 다시 깐 휴대폰의 옛 주소)
  //  응답을 늦추지 않게 끝난 뒤에 영수증을 보고 그 주소를 지운다. 요청 밖(스크립트 등)이면 하지 않는다
  if (accepted.length) { try { after(() => dropDeadTokens(accepted)); } catch { /* 요청 밖 */ } }
  return { sent, failed };
}

/** 보낸 뒤 영수증 — DeviceNotRegistered 인 주소를 push_tokens 에서 지운다 (영수증은 몇 초 뒤에 나온다) */
async function dropDeadTokens(accepted: { id: string; to: string }[]) {
  await new Promise((r) => setTimeout(r, 10_000));
  const toOf = new Map(accepted.map((a) => [a.id, a.to]));
  const dead: string[] = [];
  for (let i = 0; i < accepted.length; i += 1000) {
    const ids = accepted.slice(i, i + 1000).map((a) => a.id);
    const j = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
      body: JSON.stringify({ ids }),
      signal: AbortSignal.timeout(10000),
    }).then((r) => r.json()).catch(() => null);
    for (const [id, rc] of Object.entries((j?.data || {}) as Record<string, { status: string; details?: { error?: string } }>)) {
      if (rc.status === "error" && rc.details?.error === "DeviceNotRegistered" && toOf.get(id)) dead.push(toOf.get(id)!);
      else if (rc.status === "error") console.warn("[push] 영수증", rc.details?.error || rc.status);
    }
  }
  if (dead.length) await db().from("push_tokens").delete().in("token", dead);
}
