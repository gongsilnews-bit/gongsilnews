"use server";

// 최고관리자 — 스튜디오 광고 (기다리는 동안 유튜브 영상, 2026-10-22 · docs/2026-10-22_studio_wait_ads_plan.md)
//  광고주 · 광고 등록 · 심사(검토 대기→승인) · 켜기/끄기 · 숫자(노출·시청·클릭)
//  표(supabase/migrations/20261022_studio_ads.sql)가 아직 없으면 missing: true 로 알린다
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getEffectivePlan } from "@/utils/planCheck";
import { isAdminRole } from "@/utils/permissionCheck";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function adminId(): Promise<string | null> {
  const { data } = await (await createCookieSupabase()).auth.getUser();
  const id = data?.user?.id;
  if (!id) return null;
  const { data: m } = await db().from("members").select("id, role, plan_type, plan_end_date").eq("id", id).maybeSingle();
  return m && (getEffectivePlan(m) === "admin" || isAdminRole(m.role || "")) ? id : null;
}
const missingTable = (e: { code?: string; message?: string } | null) => Boolean(e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|Could not find the table/i.test(e.message || "")));

export type AdStatus = "draft" | "review" | "approved" | "paused" | "ended";
export type Advertiser = { id: number; name: string; contact_name: string | null; contact_phone: string | null; contact_email: string | null; biz_no: string | null; memo: string | null; is_house: boolean };
export type StudioAd = {
  id: number; advertiser_id: number; title: string; youtube_id: string; link_url: string | null; places: string[]; status: AdStatus;
  weight: number; starts_at: string | null; ends_at: string | null; max_views: number | null; daily_cap: number | null; memo: string | null;
  approved_at: string | null; created_at: string;
  stats?: { views: number; today: number; clicks: number; watchAvg: number };
};

/** 유튜브 주소 → 영상 아이디 (watch?v= · youtu.be · shorts · embed) */
function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/.exec(s);
  return m ? m[1] : null;
}

export async function listStudioAds(): Promise<{ success: boolean; missing?: boolean; ads?: StudioAd[]; advertisers?: Advertiser[]; error?: string }> {
  if (!(await adminId())) return { success: false, error: "최고관리자만 볼 수 있습니다." };
  const c = db();
  const [a, v] = await Promise.all([c.from("studio_ads").select("*").order("created_at", { ascending: false }), c.from("studio_advertisers").select("*").order("is_house", { ascending: false }).order("name")]);
  if (missingTable(a.error) || missingTable(v.error)) return { success: true, missing: true, ads: [], advertisers: [] };
  if (a.error || v.error) return { success: false, error: (a.error || v.error)!.message };
  const ads = (a.data || []) as StudioAd[];
  // 숫자 — 광고마다 (최근 1년치에서 셈)
  if (ads.length) {
    const since = new Date(Date.now() - 365 * 86400000).toISOString();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data: ev } = await c.from("studio_ad_events").select("ad_id, kind, seconds, at").gte("at", since).limit(200000);
    const st = new Map<number, { views: number; today: number; clicks: number; wsum: number; wn: number }>();
    for (const e of (ev || []) as { ad_id: number; kind: string; seconds: number | null; at: string }[]) {
      const s = st.get(e.ad_id) || { views: 0, today: 0, clicks: 0, wsum: 0, wn: 0 };
      if (e.kind === "view") { s.views++; if (new Date(e.at) >= today) s.today++; }
      else if (e.kind === "click") s.clicks++;
      else if (e.kind === "watch") { s.wsum += Number(e.seconds) || 0; s.wn++; }
      st.set(e.ad_id, s);
    }
    for (const ad of ads) { const s = st.get(ad.id); ad.stats = { views: s?.views || 0, today: s?.today || 0, clicks: s?.clicks || 0, watchAvg: s && s.wn ? Math.round((s.wsum / s.wn) * 10) / 10 : 0 }; }
  }
  return { success: true, ads, advertisers: (v.data || []) as Advertiser[] };
}

/** 유튜브 제목 알아보기 (oEmbed — 키 없이) */
export async function lookupYoutube(url: string): Promise<{ success: boolean; id?: string; title?: string; author?: string; error?: string }> {
  if (!(await adminId())) return { success: false, error: "최고관리자만 할 수 있습니다." };
  const id = youtubeId(url);
  if (!id) return { success: false, error: "유튜브 영상 주소가 아니에요." };
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, { cache: "no-store" });
    if (!r.ok) return { success: true, id, title: "" }; // 비공개·삭제된 영상이면 제목 없이
    const j = await r.json();
    return { success: true, id, title: j.title || "", author: j.author_name || "" };
  } catch {
    return { success: true, id, title: "" };
  }
}

export async function saveStudioAd(ad: Partial<StudioAd> & { url?: string }): Promise<{ success: boolean; error?: string }> {
  const uid = await adminId();
  if (!uid) return { success: false, error: "최고관리자만 할 수 있습니다." };
  const yid = ad.url ? youtubeId(ad.url) : ad.youtube_id || null;
  if (!yid) return { success: false, error: "유튜브 영상 주소를 넣어 주세요." };
  if (!ad.title?.trim()) return { success: false, error: "광고 이름을 넣어 주세요." };
  if (!ad.advertiser_id) return { success: false, error: "광고주를 골라 주세요." };
  const row = {
    advertiser_id: ad.advertiser_id, title: ad.title.trim(), youtube_id: yid, link_url: ad.link_url?.trim() || null,
    places: ad.places && ad.places.length ? ad.places : ["ai", "export", "survey"],
    weight: Math.max(1, Math.min(100, Number(ad.weight) || 1)),
    starts_at: ad.starts_at || null, ends_at: ad.ends_at || null,
    max_views: ad.max_views ? Number(ad.max_views) : null, daily_cap: ad.daily_cap ? Number(ad.daily_cap) : null,
    memo: ad.memo || null, updated_at: new Date().toISOString(),
  };
  const c = db();
  const r = ad.id ? await c.from("studio_ads").update(row).eq("id", ad.id) : await c.from("studio_ads").insert({ ...row, status: "review", created_by: uid });
  if (r.error) return { success: false, error: missingTable(r.error) ? "아직 광고 표가 없어요 — SQL 을 먼저 실행해 주세요." : r.error.message };
  return { success: true };
}

export async function setStudioAdStatus(id: number, status: AdStatus): Promise<{ success: boolean; error?: string }> {
  const uid = await adminId();
  if (!uid) return { success: false, error: "최고관리자만 할 수 있습니다." };
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "approved") { patch.approved_by = uid; patch.approved_at = new Date().toISOString(); }
  const { error } = await db().from("studio_ads").update(patch).eq("id", id);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function deleteStudioAd(id: number): Promise<{ success: boolean; error?: string }> {
  if (!(await adminId())) return { success: false, error: "최고관리자만 할 수 있습니다." };
  const { error } = await db().from("studio_ads").delete().eq("id", id);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function saveAdvertiser(a: Partial<Advertiser>): Promise<{ success: boolean; error?: string }> {
  if (!(await adminId())) return { success: false, error: "최고관리자만 할 수 있습니다." };
  if (!a.name?.trim()) return { success: false, error: "광고주 이름을 넣어 주세요." };
  const row = { name: a.name.trim(), contact_name: a.contact_name || null, contact_phone: a.contact_phone || null, contact_email: a.contact_email || null, biz_no: a.biz_no || null, memo: a.memo || null };
  const c = db();
  const r = a.id ? await c.from("studio_advertisers").update(row).eq("id", a.id) : await c.from("studio_advertisers").insert(row);
  if (r.error) return { success: false, error: missingTable(r.error) ? "아직 광고 표가 없어요 — SQL 을 먼저 실행해 주세요." : r.error.message };
  return { success: true };
}

// ── 회원 화면 (스튜디오 기다리는 동안) ──────────────────────────────

export type WaitAd = { id: number; youtube_id: string; link_url: string | null; label: string };
const PLACE_IDS = ["ai", "export", "survey"];

/** 지금 보여 줄 광고 하나 — 승인 · 기간 안 · 자리 맞음 · 목표/하루 최대 안 넘음, 비중대로 고름.
 *  최고관리자에겐 광고를 보여 주지 않는다 (2026-10-22 사장님) — 모양은 관리자 화면 미리보기로 */
export async function pickStudioAd(place: string, lastId?: number): Promise<WaitAd | null> {
  if (!PLACE_IDS.includes(place)) return null;
  const { data: u } = await (await createCookieSupabase()).auth.getUser();
  if (!u?.user?.id) return null;
  const c = db();
  const { data: m } = await c.from("members").select("role, plan_type, plan_end_date").eq("id", u.user.id).maybeSingle();
  if (m && (getEffectivePlan(m) === "admin" || isAdminRole(m.role || ""))) return null;
  const now = new Date().toISOString();
  const { data: rows, error } = await c.from("studio_ads").select("id, advertiser_id, youtube_id, link_url, weight, starts_at, ends_at, max_views, daily_cap").eq("status", "approved").contains("places", [place]);
  if (error || !rows?.length) return null;
  const live = rows.filter((r) => (!r.starts_at || r.starts_at <= now) && (!r.ends_at || r.ends_at >= now));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ok: typeof live = [];
  for (const r of live) {
    if (r.max_views) {
      const { count } = await c.from("studio_ad_events").select("id", { count: "exact", head: true }).eq("ad_id", r.id).eq("kind", "view");
      if ((count || 0) >= r.max_views) { await c.from("studio_ads").update({ status: "ended", updated_at: now }).eq("id", r.id); continue; } // 목표 채우면 저절로 끝
    }
    if (r.daily_cap) {
      const { count } = await c.from("studio_ad_events").select("id", { count: "exact", head: true }).eq("ad_id", r.id).eq("kind", "view").gte("at", today.toISOString());
      if ((count || 0) >= r.daily_cap) continue;
    }
    ok.push(r);
  }
  // 같은 영상 연달아 안 보임 (하나뿐이면 그것)
  const pool = ok.length > 1 && lastId ? ok.filter((r) => r.id !== lastId) : ok;
  if (!pool.length) return null;
  let n = Math.random() * pool.reduce((s, r) => s + (r.weight || 1), 0);
  const ad = pool.find((r) => (n -= r.weight || 1) < 0) || pool[0];
  // 영상 아래 표시는 "AD" 하나만 (2026-10-22 사장님)
  return { id: ad.id, youtube_id: ad.youtube_id, link_url: ad.link_url, label: "AD" };
}

/** 숫자만 남김 — 어느 회원인지는 남기지 않는다 */
export async function logStudioAd(adId: number, place: string, kind: "view" | "watch" | "click", seconds?: number): Promise<void> {
  if (!PLACE_IDS.includes(place) || !["view", "watch", "click"].includes(kind)) return;
  const { data: u } = await (await createCookieSupabase()).auth.getUser();
  if (!u?.user?.id) return;
  await db().from("studio_ad_events").insert({ ad_id: adId, place, kind, seconds: kind === "watch" ? Math.max(0, Math.min(99999, Math.round((seconds || 0) * 10) / 10)) : null });
}
