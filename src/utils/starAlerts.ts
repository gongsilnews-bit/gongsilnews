/**
 * 찜한 부동산·단지 새 소식 알림 (2026-11-04 사장님: 새 기사·새 공실·새 단지 거래가 들어오면 나한테 알람)
 *  🔔 알림 종(notifications)으로 보낸다. 같은 소식은 한 번만 (notifications 의 type+source_id+받는 사람 중복 막기).
 *  회원 10만 명이어도 가볍게 (11-04) — 찜 전체를 훑지 않고, 그 소식에 걸린 사무소·단지를 찜한 사람만 찾는다.
 *   alertVacancy(공실 id)   — 공실 등록 때: 그 공실을 올린 사무소 · 그 공실의 단지를 찜한 사람
 *   alertArticles(기사 id들) — 기사 발행·승인 때: 쓴 사무소 · 기사 자리 50m 안 단지 · 제목에 이름이 든 근처 단지를 찜한 사람
 *   alertTrades(시간)       — 실거래 갱신 뒤 하루 두 번: 그 시간 안에 새 거래가 생긴 찜한 단지를 사람마다 한 줄로 묶어서
 *   pruneNotifications()  — 90일 지난 알림 지우기
 *  색인: supabase/migrations/20261104_map_scale.sql (agency_bookmarks·complex_bookmarks 의 agency_id·complex_id)
 */
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "@/app/actions/notification";


const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const kstDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const bare = (v: string) => String(v || "").replace(/\(.*?\)|아파트|오피스텔|\s/g, "");

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function send(users: Iterable<string>, skip: string | null, p: { type: string; title: string; body?: string; link: string; sourceId: string }) {
  let n = 0;
  for (const u of new Set(users)) {
    if (u === skip) continue; // 내가 올린 것은 나에게 알리지 않는다
    const r = await createNotification({ recipientId: u, type: p.type as never, title: p.title, body: p.body, link: p.link, sourceId: p.sourceId });
    if (r.success) n++;
  }
  return n;
}
/** 이 회원(사무소 주인)의 사무소를 찜한 사람 + 사무소 이름 */
async function agencyFans(ownerId: string) {
  const s = db();
  const { data: ag } = await s.from("agencies").select("id, name").eq("owner_id", ownerId).eq("status", "APPROVED").maybeSingle();
  if (!ag) return { users: [] as string[], name: "" };
  const { data } = await s.from("agency_bookmarks").select("user_id").eq("agency_id", ag.id).limit(50000);
  return { users: (data || []).map((r) => String(r.user_id)), name: String(ag.name || "") };
}
async function complexFans(ids: string[]) {
  if (!ids.length) return new Map<string, string[]>();
  const { data } = await db().from("complex_bookmarks").select("user_id, complex_id").in("complex_id", ids).limit(50000);
  const m = new Map<string, string[]>();
  for (const r of data || []) m.set(String(r.complex_id), [...(m.get(String(r.complex_id)) || []), String(r.user_id)]);
  return m;
}

export async function alertVacancy(vacancyId: string) {
  const s = db();
  const { data: v } = await s.from("vacancies").select("id, vacancy_no, owner_id, complex_id, building_name, dong, trade_type, status").eq("id", vacancyId).maybeSingle();
  if (!v || v.status !== "ACTIVE") return 0;
  const ag = await agencyFans(v.owner_id);
  const cx = v.complex_id ? await complexFans([v.complex_id]) : new Map<string, string[]>();
  let cxName = "";
  if (v.complex_id) cxName = String((await s.from("apt_complexes").select("name").eq("id", v.complex_id).maybeSingle()).data?.name || "");
  const users = [...ag.users, ...(cx.get(v.complex_id) || [])];
  if (!users.length) return 0;
  const what = `${v.building_name || v.dong || ""} ${v.trade_type || ""}`.trim();
  return send(users, v.owner_id, { type: "star_vacancy", title: `${ag.name || cxName || "관심"} · 새 공실`, body: `공실 ${v.vacancy_no} ${what}`.trim(), link: `/gongsil?id=${v.id}`, sourceId: String(v.id) });
}

export async function alertArticles(ids: string[]) {
  const s = db();
  let n = 0;
  const { data: arts } = await s.from("articles").select("id, article_no, title, author_id, lat, lng, status, is_deleted, published_at").in("id", ids.slice(0, 50));
  for (const a of (arts || []) as Row[]) {
    if (a.status !== "APPROVED" || a.is_deleted || (a.published_at && a.published_at > new Date().toISOString())) continue;
    const ag = a.author_id ? await agencyFans(a.author_id) : { users: [] as string[], name: "" };
    const users = [...ag.users];
    let about = ag.name;
    if (a.lat && a.lng) {
      // 근처(약 2km) 찜한 단지 중 — 50m 안이거나 제목에 단지 이름
      const d = 0.02;
      const { data: near } = await s.from("apt_complexes").select("id, name, lat, lng").gte("lat", a.lat - d).lte("lat", a.lat + d).gte("lng", a.lng - d * 1.25).lte("lng", a.lng + d * 1.25).limit(3000);
      const hit = (near || []).filter((c) => (c.lat && Math.hypot((c.lat - a.lat) * 111_000, (c.lng - a.lng) * 88_000) <= 50) || (bare(c.name).length >= 3 && bare(a.title).includes(bare(c.name))));
      const fans = await complexFans(hit.map((c) => String(c.id)));
      for (const c of hit) { const f = fans.get(String(c.id)) || []; if (f.length) { users.push(...f); about = about || String(c.name); } }
    }
    if (users.length) n += await send(users, a.author_id, { type: "star_article", title: `${about} · 새 기사`, body: String(a.title || ""), link: `/news/${a.article_no || a.id}`, sourceId: String(a.id) });
  }
  return n;
}

/**
 * 새 실거래 — 사람마다 한 줄로 묶어 보낸다 (2026-11-04 사장님: 찜한 단지가 많아도 알림·DB 가 불어나지 않게)
 *  예: "찜한 단지 23곳 · 새 실거래 41건" (단지 하나면 예전처럼 단지 이름으로). 한 번 돌 때(하루 두 번) 한 사람에게 한 줄
 */
export async function alertTrades(hours = 14) {
  const s = db();
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const per = new Map<string, { n: number; sale: number; rent: number; top: { id: string; name: string; k: number } }>();
  // 찜된 단지 id 를 1000개씩 (찜이 많아도 나눠 읽는다)
  for (let at = 0; at < 200000; at += 1000) {
    const { data, error } = await s.from("complex_bookmarks").select("complex_id").order("complex_id").range(at, at + 999);
    if (error || !data?.length) break;
    const ids = [...new Set(data.map((r) => String(r.complex_id)))];
    // 그 시간 안에 갱신된 단지만 (새 거래가 들어왔으면 updated_at 이 바뀐다)
    const { data: cs } = await s.from("apt_complexes").select("id, name, trades, rents").in("id", ids).gte("updated_at", since);
    const fans = cs?.length ? await complexFans(cs.map((c) => String(c.id))) : new Map<string, string[]>();
    for (const c of (cs || []) as Row[]) {
      const sale = (c.trades || []).filter((t: { s?: string }) => t.s && t.s >= since).length;
      const rent = (c.rents || []).filter((t: { s?: string }) => t.s && t.s >= since).length;
      if (!sale && !rent) continue;
      for (const u of fans.get(String(c.id)) || []) {
        const p = per.get(u) || { n: 0, sale: 0, rent: 0, top: { id: "", name: "", k: -1 } };
        p.n++; p.sale += sale; p.rent += rent;
        if (sale + rent > p.top.k) p.top = { id: String(c.id), name: String(c.name || ""), k: sale + rent };
        per.set(u, p);
      }
    }
    if (data.length < 1000) break;
  }
  const slot = new Date(Date.now() + 9 * 3600_000).getUTCHours() < 9 ? "am" : "pm"; // 하루 두 번 도는 것을 따로
  let n = 0;
  for (const [u, p] of per) {
    const body = [p.sale ? `매매 ${p.sale}건` : "", p.rent ? `전월세 ${p.rent}건` : ""].filter(Boolean).join(" · ");
    const title = p.n === 1 ? `${p.top.name} · 새 실거래 ${p.sale + p.rent}건` : `찜한 단지 ${p.n}곳 · 새 실거래 ${p.sale + p.rent}건`;
    n += await send([u], null, { type: "star_trade", title, body: p.n === 1 ? body : `${body} — ${p.top.name} 외 ${p.n - 1}곳`, link: `/gongsil?apt=${encodeURIComponent(p.top.id)}`, sourceId: `trades:${kstDay()}:${slot}` });
  }
  return n;
}

/** 오래된 알림 지우기 — 90일이 지난 알림은 읽었든 안 읽었든 지운다 (2026-11-04 사장님: DB 가 불어나지 않게). 하루 두 번 실거래 알림 뒤에 */
export async function pruneNotifications(days = 90) {
  const before = new Date(Date.now() - days * 24 * 3600_000).toISOString();
  const { error, count } = await db().from("notifications").delete({ count: "exact" }).lt("created_at", before);
  return error ? -1 : count || 0;
}
