"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { savePromoFor, type PromoChannel } from "@/utils/vacancyPromos";


/**
 * 공실 홍보현황 (2026-10-27 회의) — 앱 홈 "내 공실 홍보현황" 카드
 *  - 공실뉴스 기사: 기사에 붙인 공실(article_media ATTACHED_VACANCY)로 바로 안다
 *  - 블로그·인스타·스레드·페북·유튜브: vacancy_promos 표 (도우미가 잡거나 회원이 붙여 넣은 글 주소)
 * 로그인 쿠키로 본인을 확인하고, 본인 공실만 읽고 쓴다.
 * vacancy_promos 표가 아직 없으면 링크 없음으로 둔다 (supabase/migrations/20261027_vacancy_promos.sql).
 */


export type VacancyPromo = {
  /** 공실뉴스 기사 — 발행된(APPROVED) 기사가 있으면 그 기사 번호, 검토 중이면 pending */
  article: { no: string; pending: boolean } | null;
  links: Partial<Record<PromoChannel, string>>;
};

function admin() {
  return createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function me() {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  return user;
}

/** 내 공실마다 { 기사, 채널별 링크 } */
export async function getMyVacancyPromos(): Promise<{ success: boolean; promos: Record<string, VacancyPromo>; error?: string }> {
  const user = await me();
  if (!user) return { success: false, promos: {}, error: "로그인이 필요합니다." };
  const db = admin();
  const promos: Record<string, VacancyPromo> = {};
  const slot = (id: string) => (promos[id] ||= { article: null, links: {} });

  // 공실뉴스 기사 — 내가 쓴 기사 중 공실을 붙인 것
  const { data: arts } = await db.from("articles").select("id, article_no, status").eq("author_id", user.id).neq("is_deleted", true);
  if (arts?.length) {
    const { data: media } = await db
      .from("article_media")
      .select("article_id, url")
      .in("article_id", arts.map((a) => a.id))
      .or("media_type.eq.ATTACHED_VACANCY,and(media_type.eq.FILE,filename.eq.ATTACHED_VACANCY)");
    const byId = new Map(arts.map((a) => [a.id, a]));
    for (const m of media || []) {
      const a = byId.get(m.article_id);
      if (!a || !m.url) continue;
      const cur = slot(String(m.url)).article;
      const approved = a.status === "APPROVED";
      // 발행된 기사가 있으면 그것을, 없으면 검토 중 표시
      if (!cur || (cur.pending && approved)) slot(String(m.url)).article = { no: String(a.article_no || a.id), pending: !approved };
    }
  }

  // 채널 링크 (표가 없으면 건너뜀)
  const { data: rows, error } = await db.from("vacancy_promos").select("vacancy_id, channel, url").eq("owner_id", user.id);
  if (!error) for (const r of rows || []) slot(String(r.vacancy_id)).links[r.channel as PromoChannel] = r.url;

  return { success: true, promos };
}

/** 링크 붙여넣기 · 바꾸기 (url 이 비면 연결 끊기) */
export async function saveVacancyPromo(vacancyId: string, channel: PromoChannel, url: string): Promise<{ success: boolean; error?: string }> {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  return savePromoFor(user.id, vacancyId, channel, url, "paste");
}

/**
 * 연결된 글이 아직 있는지 — 지운 글은 연결을 푼다 (2026-10-27 사장님: 블로그를 지웠는데 그대로였다)
 * 지금은 네이버 블로그만 확인한다 (지운 글은 PostView 가 404). 인스타·스레드 등은 로그인 없이 확인할 수 없어 그대로 둔다.
 * 네트워크 오류는 "지움"으로 보지 않는다 — 404 일 때만 푼다.
 */
export async function checkMyPromoLinks(): Promise<{ success: boolean; removed: { vacancyId: string; channel: string; title: string }[] }> {
  const user = await me();
  if (!user) return { success: false, removed: [] };
  const db = admin();
  const { data: rows, error } = await db.from("vacancy_promos").select("id, vacancy_id, channel, url, vacancies(building_name, dong)").eq("owner_id", user.id).eq("channel", "blog");
  if (error || !rows?.length) return { success: !error, removed: [] };
  const removed: { vacancyId: string; channel: string; title: string }[] = [];
  await Promise.all(rows.map(async (r) => {
    const m = /blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d+)/.exec(String(r.url));
    if (!m) return;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    try {
      const res = await fetch(`https://blog.naver.com/PostView.naver?blogId=${m[1]}&logNo=${m[2]}`, { headers: { "User-Agent": "Mozilla/5.0" }, signal: ac.signal, cache: "no-store" });
      if (res.status !== 404) return;
      await db.from("vacancy_promos").delete().eq("id", r.id);
      const v = (Array.isArray(r.vacancies) ? r.vacancies[0] : r.vacancies) as { building_name?: string; dong?: string } | null;
      removed.push({ vacancyId: String(r.vacancy_id), channel: r.channel, title: v?.building_name || v?.dong || "공실" });
    } catch {
      /* 확인 못 함 — 그대로 둔다 */
    } finally {
      clearTimeout(t);
    }
  }));
  return { success: true, removed };
}

/**
 * 내 공실 카드 (2026-10-28) — 홈 "내 공실 홍보현황" · 공실등록 [카드형]
 * getVacancies 는 표·지도용이라 무겁다 (1,000건씩 10번 · 회원·중개소 정보까지). 카드에 쓰는 칸만, 내 것만 한 번에 읽는다.
 */
export async function getMyVacancyCards(): Promise<{ success: boolean; data: any[]; error?: string }> {
  const user = await me();
  if (!user) return { success: false, data: [], error: "로그인이 필요합니다." };
  const { data, error } = await admin()
    .from("vacancies")
    .select("id, vacancy_no, status, trade_type, property_type, sub_category, deposit, monthly_rent, dong, building_name, created_at, realtor_commission, direction, exclusive_m2, room_count, bath_count, options, metadata, vacancy_photos(url, sort_order)")
    .eq("owner_id", user.id)
    .neq("status", "DELETED")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return { success: false, data: [], error: error.message };
  return { success: true, data: data || [] };
}

/**
 * 광고 내리기 — 거래 완료 (2026-10-28 사장님 회의)
 *  거래 완료면 공실을 내리고(STOPPED) metadata.deal_closed_at 에 표시 → 홈 카드가 "거래 완료 · SNS 정리" 로 보여 준다.
 *  올라간 블로그·SNS 글은 회원이 직접 지우거나 비공개로 (거래 완료된 매물 광고를 그대로 두면 부당 표시·광고가 될 수 있다).
 *  closed=false 는 다시 올리기 (ACTIVE · 표시 지움)
 */
export async function setVacancyDealClosed(vacancyId: string, closed: boolean): Promise<{ success: boolean; error?: string }> {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  const db = admin();
  const { data: v, error: e1 } = await db.from("vacancies").select("owner_id, metadata").eq("id", vacancyId).maybeSingle();
  if (e1) return { success: false, error: e1.message };
  if (!v || v.owner_id !== user.id) return { success: false, error: "내 공실이 아닙니다." };
  const metadata = { ...((v.metadata as Record<string, unknown>) || {}), deal_closed_at: closed ? new Date().toISOString() : null };
  const { error } = await db.from("vacancies").update({ status: closed ? "STOPPED" : "ACTIVE", metadata }).eq("id", vacancyId);
  return error ? { success: false, error: error.message } : { success: true };
}
