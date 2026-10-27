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
