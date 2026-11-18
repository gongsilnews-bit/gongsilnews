"use server";

/**
 * 최고관리자 → 앱 푸시 보내기 (2026-11-18 사장님: "어떤 회원에게 · 어떤 내용과 기사를")
 *  - 받는 회원: 등급(전체·일반·부동산 무료·공실뉴스부동산 유료·비즈니스) · 지역(사무소 주소에 든 글자, 예: 강남구)
 *  - 앱을 깔고 로그인해 푸시를 등록한 휴대폰(push_tokens)이 있는 회원에게만 간다
 *  - [안내] 앱 설정 "속보·추천 기사"를 끈 회원은 빼고, 방해 금지 시간(밤 10시~아침 8시)을 켠 회원은 그 시간에 뺀다
 *  - [광고] 광고·혜택 푸시에 동의한 회원만(members.marketing_push) · 제목 앞 "(광고)" · 끝에 수신 거부 방법 · 밤 9시~아침 8시 못 보냄
 *  - [나에게 시험] 보내는 최고관리자 본인 휴대폰에만
 *  - 보낸 기록은 push_campaigns (누른 수는 앱이 알려 준다)
 */

import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { memberTier } from "@/utils/tier";
import { sendExpoPush } from "@/utils/push";
import { webpForUpload } from "@/utils/serverWebp";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function requireAdmin(): Promise<string | null> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: me } = await db().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(me?.role) ? user.id : null;
}

/** everyone = 앱 설치한 모든 사람 (로그인 안 한 설치자 포함, 2026-11-18) · all = 앱에 로그인한 회원 전체 */
export type PushTier = "everyone" | "all" | "user" | "free" | "pro" | "biz";
export type PushKind = "info" | "ad";
export type PushAudience = { tier: PushTier; region?: string; kind: PushKind };

const kstHour = () => (new Date().getUTCHours() + 9) % 24;
const adNight = () => { const h = kstHour(); return h >= 21 || h < 8; };
const quietNight = () => { const h = kstHour(); return h >= 22 || h < 8; };
const AD_TAIL = "\n수신 거부: 앱 [설정] › 알림 › 광고·혜택 알림 끄기";

type Row = { id: string; role: string | null; plan_type: string | null; plan_end_date: string | null; studio_end_date: string | null; is_deleted: boolean | null; notify_prefs: Record<string, boolean> | null; marketing_push?: boolean | null };

/** 대상 회원과 그 휴대폰 토큰 */
async function audience(a: PushAudience) {
  const supabase = db();
  // 푸시 받을 휴대폰이 있는 회원부터 (회원이 많아도 휴대폰 있는 회원만 읽는다)
  const tokens: { token: string; user_id: string | null; news_off?: boolean }[] = [];
  let guestCol = true; // news_off 칸(로그인 안 한 설치자) — SQL 전이면 없음
  for (let from = 0; ; from += 1000) {
    let { data, error } = await supabase.from("push_tokens").select("token, user_id, news_off").range(from, from + 999);
    if (error && /news_off/.test(error.message)) { guestCol = false; ({ data, error } = await supabase.from("push_tokens").select("token, user_id").range(from, from + 999) as never); }
    if (error) return { error: /push_tokens/.test(error.message) ? "푸시 표가 아직 없습니다. (SQL 실행 필요)" : error.message, members: [] as string[], tokens: [] as string[], guests: 0 };
    tokens.push(...((data || []) as typeof tokens));
    if (!data || data.length < 1000) break;
  }
  // 로그인 안 한 설치자 — "앱 설치한 모든 사람" 안내 푸시에만, 지역을 고르면 빠진다(주소가 없음), 광고는 동의를 못 받아 빠진다
  const guestTokens = a.tier === "everyone" && a.kind !== "ad" && !(a.region || "").trim() && guestCol
    ? tokens.filter((t) => !t.user_id && !t.news_off).map((t) => t.token) : [];
  const ids = [...new Set(tokens.map((t) => t.user_id).filter(Boolean) as string[])];
  if (!ids.length) return { members: [] as string[], tokens: guestTokens, guests: guestTokens.length };

  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    const part = ids.slice(i, i + 300);
    const cols = "id, role, plan_type, plan_end_date, studio_end_date, is_deleted, notify_prefs";
    let res = await supabase.from("members").select(`${cols}, marketing_push`).in("id", part);
    if (res.error && /marketing_push/.test(res.error.message)) {
      if (a.kind === "ad") return { error: "광고 푸시 동의 칸이 아직 없습니다. (SQL 실행 필요)", members: [] as string[], tokens: [] as string[], guests: 0 };
      res = await supabase.from("members").select(cols).in("id", part) as typeof res;
    }
    if (res.error) return { error: res.error.message, members: [] as string[], tokens: [] as string[], guests: 0 };
    rows.push(...((res.data || []) as unknown as Row[]));
  }

  // 지역 — 부동산 사무소 주소에 그 글자가 든 회원 (일반회원은 주소가 없어 지역을 고르면 빠진다)
  let inRegion: Set<string> | null = null;
  const region = (a.region || "").trim();
  if (region) {
    const { data } = await supabase.from("agencies").select("owner_id, address").in("owner_id", rows.map((r) => r.id)).ilike("address", `%${region.replace(/[%_]/g, "")}%`);
    inRegion = new Set((data || []).map((x) => String(x.owner_id)));
  }

  const quiet = quietNight();
  const picked = rows.filter((m) => {
    if (m.is_deleted) return false;
    const t = memberTier(m);
    if (a.tier !== "all" && a.tier !== "everyone" && t !== a.tier) return false;
    if (inRegion && !inRegion.has(m.id)) return false;
    const p = m.notify_prefs || {};
    if (a.kind === "ad") { if (m.marketing_push !== true) return false; }
    else if (p.news_push === false) return false;
    if (quiet && p.quiet === true) return false;
    return true;
  }).map((m) => m.id);
  const want = new Set(picked);
  const memberTokens = tokens.filter((t) => t.user_id && want.has(t.user_id)).map((t) => t.token);
  return { members: picked, tokens: [...new Set([...memberTokens, ...guestTokens])], guests: guestTokens.length };
}

/** 보내기 전에 — 몇 명 · 몇 대에게 가는지 */
export async function adminPushPreview(a: PushAudience) {
  if (!(await requireAdmin())) return { success: false, error: "최고관리자만 쓸 수 있어요.", members: 0, guests: 0, devices: 0 };
  const r = await audience(a);
  if (r.error) return { success: false, error: r.error, members: 0, guests: 0, devices: 0 };
  return { success: true, members: r.members.length, guests: r.guests || 0, devices: r.tokens.length, adNight: a.kind === "ad" && adNight() };
}

/** 기사 고르기 — 제목으로 찾기 (빈칸이면 최근 발행 기사) */
export async function adminPushFindArticles(q: string) {
  if (!(await requireAdmin())) return { success: false, articles: [] };
  let query = db().from("articles").select("id, article_no, title, section1, section2, thumbnail_url, published_at")
    .eq("status", "APPROVED").eq("is_deleted", false).lte("published_at", new Date().toISOString());
  const t = q.trim().replace(/[%_,()]/g, " ");
  if (t) query = /^\d+$/.test(t) ? query.eq("article_no", Number(t)) : query.ilike("title", `%${t}%`);
  const { data } = await query.order("published_at", { ascending: false }).limit(20);
  return { success: true, articles: data || [] };
}

/** 푸시에 붙일 그림 올리기 — 잠금화면에 큰 그림으로 보인다(안드로이드). 가로 1024px WebP 로 줄여 저장 */
export async function adminPushUploadImage(fd: FormData) {
  if (!(await requireAdmin())) return { success: false, error: "최고관리자만 쓸 수 있어요." };
  const file = fd.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return { success: false, error: "그림 파일을 골라 주세요." };
  if (file.size > 10 * 1024 * 1024) return { success: false, error: "10MB 이하 그림만 올릴 수 있어요." };
  const up = await webpForUpload(file, `push/${Date.now()}.jpg`, { maxWidth: 1024, quality: 80 });
  const supabase = db();
  const { error } = await supabase.storage.from("article-media").upload(up.path, up.body, { upsert: true, contentType: up.contentType });
  if (error) return { success: false, error: error.message };
  return { success: true, url: supabase.storage.from("article-media").getPublicUrl(up.path).data.publicUrl };
}

/** 열릴 곳 — 우리 사이트 주소(/m/…)나 https 주소 */
const okLink = (l: string) => !l || /^\/[\w\-/?=&.%가-힣#]*$/.test(l) || /^https?:\/\/[^\s"'<>]+$/.test(l);

/** 보내기 */
export async function adminSendPush(input: { kind: PushKind | "test"; title: string; body: string; link: string; image?: string; tier: PushTier; region?: string }) {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, error: "최고관리자만 쓸 수 있어요." };
  const isAd = input.kind === "ad";
  let title = input.title.trim().slice(0, 60);
  let body = input.body.trim().slice(0, 300);
  const link = input.link.trim().slice(0, 300);
  if (!title) return { success: false, error: "제목을 써 주세요." };
  if (!okLink(link)) return { success: false, error: "열릴 주소가 올바르지 않습니다. (https:// 로 시작하는 주소)" };
  const image = String(input.image || "").trim();
  if (image && !/^https:\/\/[^\s"'<>]+$/.test(image)) return { success: false, error: "그림 주소가 올바르지 않습니다." };
  if (isAd) {
    if (adNight()) return { success: false, error: "광고 푸시는 밤 9시부터 아침 8시까지 보낼 수 없습니다." };
    if (!title.startsWith("(광고)")) title = `(광고) ${title}`;
    body = body + AD_TAIL;
  }

  const supabase = db();
  let members: string[] = [];
  let tokens: string[] = [];
  let guests = 0;
  if (input.kind === "test") {
    const { data } = await supabase.from("push_tokens").select("token").eq("user_id", adminId);
    members = [adminId];
    tokens = (data || []).map((x) => String(x.token));
    if (!tokens.length) return { success: false, error: "내 휴대폰이 아직 등록되지 않았습니다. 설치한 공실뉴스 앱에 로그인해 알림을 허락해 주세요." };
  } else {
    const r = await audience({ tier: input.tier, region: input.region, kind: input.kind });
    if (r.error) return { success: false, error: r.error };
    members = r.members;
    guests = r.guests || 0;
    tokens = r.tokens;
    if (!tokens.length) return { success: false, error: "받을 휴대폰이 없습니다. (앱을 깔고 알림을 허락한 회원이 아직 없거나 조건에 맞는 회원이 없음)" };
  }

  // 기록 먼저 — 누른 수를 세려면 알림에 기록 번호가 들어가야 한다
  const { data: camp } = await supabase.from("push_campaigns").insert({
    kind: input.kind, title, body, link: link || null,
    audience: { tier: input.tier, region: input.region || "", image: image || undefined }, recipients: members.length + guests, created_by: adminId,
  }).select("id").maybeSingle();
  const campaign = camp?.id ? String(camp.id) : "";

  const r = await sendExpoPush(tokens.map((to) => ({ to, title, body: body || undefined, data: { link, type: "admin_push", campaign }, ...(image ? { richContent: { image } } : {}) })));
  if (campaign) await supabase.from("push_campaigns").update({ devices: r.sent, failed: r.failed }).eq("id", campaign);
  return { success: true, members: members.length + guests, sent: r.sent, failed: r.failed };
}

/** 보낸 기록 */
export async function adminPushLogs() {
  if (!(await requireAdmin())) return { success: false, logs: [] };
  const { data, error } = await db().from("push_campaigns").select("id, kind, title, body, link, audience, recipients, devices, failed, opened, created_at").order("created_at", { ascending: false }).limit(50);
  if (error) return { success: false, logs: [], missingTable: /push_campaigns/.test(error.message) };
  return { success: true, logs: data || [] };
}
