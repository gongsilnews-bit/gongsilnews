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
/* 지운 글인가 — 로그인 없이 서버에서 알아볼 수 있는 채널만 (2026-10-29 사장님)
   블로그: PostView 404 · 스레드: 지운 글은 ?error=invalid_post 로 넘김 · 유튜브: oEmbed 404
   인스타·페북은 로그인 없이는 늘 같은 화면이라 여기서 못 본다 — 도우미 확장이 평소 크롬에서 본다 (markPromoGone)
   true = 지움 · false = 있음 · null = 확인 못 함(그대로 둔다) */
async function promoGone(channel: string, url: string): Promise<boolean | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  const ua = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0 Safari/537.36" };
  try {
    if (channel === "blog") {
      const m = /blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d+)/.exec(url);
      if (!m) return null;
      const res = await fetch(`https://blog.naver.com/PostView.naver?blogId=${m[1]}&logNo=${m[2]}`, { headers: ua, signal: ac.signal, cache: "no-store" });
      return res.status === 404 ? true : res.ok ? false : null;
    }
    if (channel === "threads") {
      if (!/^https:\/\/www\.threads\.(com|net)\/@[^/]+\/post\/[A-Za-z0-9_-]+/.test(url)) return null;
      const res = await fetch(url, { headers: ua, signal: ac.signal, cache: "no-store", redirect: "manual" });
      const loc = res.headers.get("location") || "";
      if (res.status >= 300 && res.status < 400) return /error=invalid_post/.test(loc) ? true : null;
      return res.ok ? false : null;
    }
    if (channel === "youtube") {
      if (!/youtube\.com|youtu\.be/.test(url)) return null;
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { headers: ua, signal: ac.signal, cache: "no-store" });
      if (res.status === 404) return true;
      if (res.ok) return false;
      // 지운 영상도 oEmbed 는 403 을 줄 때가 있다 — 영상 화면의 재생 상태로 가른다 (2026-10-29)
      //  ERROR(동영상을 재생할 수 없음) = 지움 · LOGIN_REQUIRED(비공개) · UNPLAYABLE(퍼가기·지역) = 그대로
      const id = /(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/.exec(url)?.[1];
      if (!id) return null;
      const page = await fetch(`https://www.youtube.com/watch?v=${id}`, { headers: { ...ua, "Accept-Language": "ko-KR" }, signal: ac.signal, cache: "no-store" });
      const st = /"playabilityStatus":\{"status":"([A-Z_]+)"/.exec(await page.text())?.[1];
      return st === "ERROR" ? true : st ? false : null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const CH_NAME: Record<string, string> = { blog: "네이버 블로그", threads: "스레드", youtube: "유튜브", instagram: "인스타그램", facebook: "페이스북" };

/** 홍보현황 링크 중 지운 글은 연결을 푼다 — 공실·기사 모두 (2026-10-29 사장님: 블로그 + 스레드·유튜브) */
//  only — [링크 수정]을 연 공실·기사 하나만 (몇 개라 바로 끝난다). 없으면 전체 — 화면은 6시간에 한 번만 부른다 (2026-10-29 사장님: 물건 50개면 느리지 않나)
export async function checkMyPromoLinks(only?: { vacancyId?: string; articleNo?: string }): Promise<{ success: boolean; removed: { vacancyId: string; channel: string; title: string }[] }> {
  const user = await me();
  if (!user) return { success: false, removed: [] };
  const db = admin();
  const CH = ["blog", "threads", "youtube"];
  let articleId = "";
  if (only?.articleNo) {
    const { data: art } = await db.from("articles").select("id").eq("article_no", Number(only.articleNo)).eq("author_id", user.id).maybeSingle();
    articleId = art?.id ? String(art.id) : "-";
  }
  let vq = db.from("vacancy_promos").select("id, vacancy_id, channel, url, vacancies(building_name, dong)").eq("owner_id", user.id).in("channel", CH);
  let aq = db.from("article_promos").select("id, article_id, channel, url, articles(title)").eq("owner_id", user.id).in("channel", CH);
  if (only?.vacancyId) vq = vq.eq("vacancy_id", only.vacancyId);
  if (articleId) aq = aq.eq("article_id", articleId);
  const [{ data: vRows, error }, { data: aRows }] = await Promise.all([
    only?.articleNo && !only.vacancyId ? Promise.resolve({ data: [] as never[], error: null }) : vq,
    only?.vacancyId && !only.articleNo ? Promise.resolve({ data: [] as never[] }) : aq,
  ]);
  if (error) return { success: false, removed: [] };
  const removed: { vacancyId: string; channel: string; title: string }[] = [];
  const one = <T,>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x) || null;
  // 동시에 6개씩 — 링크가 많아도 한꺼번에 두드리지 않는다
  const jobs: (() => Promise<void>)[] = [
    ...(vRows || []).map((r) => async () => {
      if ((await promoGone(r.channel, String(r.url))) !== true) return;
      await db.from("vacancy_promos").delete().eq("id", r.id);
      const v = one(r.vacancies as { building_name?: string; dong?: string } | null);
      removed.push({ vacancyId: String(r.vacancy_id), channel: CH_NAME[r.channel] || r.channel, title: v?.building_name || v?.dong || "공실" });
    }),
    ...(aRows || []).map((r) => async () => {
      if ((await promoGone(r.channel, String(r.url))) !== true) return;
      await db.from("article_promos").delete().eq("id", r.id);
      const a = one(r.articles as { title?: string } | null);
      removed.push({ vacancyId: "", channel: CH_NAME[r.channel] || r.channel, title: (a?.title || "기사").slice(0, 20) });
    }),
  ];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, jobs.length) }, async () => {
    while (next < jobs.length) await jobs[next++]();
  }));
  return { success: true, removed };
}

/**
 * 도우미 확장이 평소 크롬(로그인된 상태)에서 확인할 인스타그램·페이스북 링크 (2026-10-29 사장님)
 * 앱이 이 목록을 확장에 넘기고, 지운 글로 보이면 markPromoGone 으로 푼다.
 */
export async function listPromoLinksToVerify(): Promise<{ success: boolean; urls: string[] }> {
  const user = await me();
  if (!user) return { success: false, urls: [] };
  const db = admin();
  const CH = ["instagram", "facebook"];
  const [{ data: v }, { data: a }] = await Promise.all([
    db.from("vacancy_promos").select("url").eq("owner_id", user.id).in("channel", CH),
    db.from("article_promos").select("url").eq("owner_id", user.id).in("channel", CH),
  ]);
  return { success: true, urls: [...new Set([...(v || []), ...(a || [])].map((r) => String(r.url)).filter(Boolean))] };
}

/** 도우미 확장이 "지운 글"로 본 주소의 연결을 푼다 — 본인 링크만 */
export async function markPromoGone(url: string): Promise<{ success: boolean; removed: number }> {
  const user = await me();
  if (!user || !url) return { success: false, removed: 0 };
  const db = admin();
  const [{ data: v }, { data: a }] = await Promise.all([
    db.from("vacancy_promos").delete().eq("owner_id", user.id).eq("url", url).select("id"),
    db.from("article_promos").delete().eq("owner_id", user.id).eq("url", url).select("id"),
  ]);
  return { success: true, removed: (v || []).length + (a || []).length };
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
