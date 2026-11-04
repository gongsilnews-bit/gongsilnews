/**
 * 찜한 부동산·단지 새 소식 알림 (2026-11-04 사장님: 새 기사·새 공실·새 단지 거래가 들어오면 나한테 알람)
 *  🔔 알림 종(notifications)으로 보낸다. 같은 소식은 한 번만 (notifications 의 type+source_id+받는 사람 중복 막기).
 *  sweepStarAlerts(시간) — 그 시간 안에 생긴 것을 훑는다. 몇 번 불러도 같은 알림이 또 생기지 않는다.
 *   부르는 곳: 공실 등록 · 기사 저장(발행) · 기사 승인 · 매일 밤·아침 실거래 갱신(cron/apt-prices/round)
 *  부동산 = 그 사무소 회원이 올린 새 공실·새 기사 / 단지 = 그 단지 새 공실(complex_id)·새 기사(50m 안·제목에 이름)·새 실거래(들어온 날 s)
 */
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "@/app/actions/notification";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const kstDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const bare = (v: string) => String(v || "").replace(/\(.*?\)|아파트|오피스텔|\s/g, "");
const meters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 88_000);

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function sweepStarAlerts(hours = 48) {
  const s = db();
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const [agB, cxB] = await Promise.all([
    s.from("agency_bookmarks").select("user_id, agency_id").limit(20000),
    s.from("complex_bookmarks").select("user_id, complex_id").limit(20000),
  ]);
  const agRows = (agB.error ? [] : agB.data || []) as { user_id: string; agency_id: string }[];
  const cxRows = (cxB.error ? [] : cxB.data || []) as { user_id: string; complex_id: string }[];
  if (!agRows.length && !cxRows.length) return { sent: 0 };

  // 찜한 사무소 → 그 사무소 회원(owner)
  const agIds = [...new Set(agRows.map((r) => r.agency_id))];
  const { data: ags } = agIds.length ? await s.from("agencies").select("id, owner_id, name").in("id", agIds) : { data: [] as Row[] };
  const agById = new Map((ags || []).map((a: Row) => [String(a.id), a]));
  const fansOfOwner = new Map<string, { users: Set<string>; name: string }>();
  for (const r of agRows) {
    const a = agById.get(r.agency_id); if (!a?.owner_id) continue;
    const f = fansOfOwner.get(a.owner_id) || { users: new Set<string>(), name: String(a.name || "") };
    f.users.add(r.user_id); fansOfOwner.set(a.owner_id, f);
  }
  // 찜한 단지
  const cxIds = [...new Set(cxRows.map((r) => r.complex_id))];
  const cxs: Row[] = [];
  for (let i = 0; i < cxIds.length; i += 100) {
    const { data } = await s.from("apt_complexes").select("id, name, lat, lng, trades, rents").in("id", cxIds.slice(i, i + 100));
    cxs.push(...(data || []));
  }
  const fansOfCx = new Map<string, Set<string>>();
  for (const r of cxRows) { const f = fansOfCx.get(r.complex_id) || new Set<string>(); f.add(r.user_id); fansOfCx.set(r.complex_id, f); }

  let sent = 0;
  const send = async (users: Iterable<string>, skip: string | null, p: { type: string; title: string; body?: string; link: string; sourceId: string }) => {
    for (const u of users) {
      if (u === skip) continue; // 내가 올린 것은 나에게 알리지 않는다
      const r = await createNotification({ recipientId: u, type: p.type as never, title: p.title, body: p.body, link: p.link, sourceId: p.sourceId });
      if (r.success) sent++;
    }
  };

  // 1. 새 공실 — 찜한 사무소가 올렸거나 찜한 단지에 붙은 공실
  const owners = [...fansOfOwner.keys()];
  const vacs: Row[] = [];
  if (owners.length) vacs.push(...((await s.from("vacancies").select("id, vacancy_no, owner_id, complex_id, building_name, dong, trade_type").eq("status", "ACTIVE").gte("created_at", since).in("owner_id", owners).limit(1000)).data || []));
  if (cxIds.length) vacs.push(...((await s.from("vacancies").select("id, vacancy_no, owner_id, complex_id, building_name, dong, trade_type").eq("status", "ACTIVE").gte("created_at", since).in("complex_id", cxIds).limit(1000)).data || []));
  const cxName = new Map(cxs.map((c) => [String(c.id), String(c.name || "")]));
  for (const v of new Map(vacs.map((x) => [x.id, x])).values()) {
    const what = `${v.building_name || v.dong || ""} ${v.trade_type || ""}`.trim();
    const users = new Set<string>([...(fansOfOwner.get(v.owner_id)?.users || []), ...(v.complex_id ? fansOfCx.get(v.complex_id) || [] : [])]);
    const from = fansOfOwner.get(v.owner_id)?.name || cxName.get(v.complex_id) || "관심";
    await send(users, v.owner_id, { type: "star_vacancy", title: `${from} · 새 공실`, body: `공실 ${v.vacancy_no} ${what}`.trim(), link: `/gongsil?id=${v.id}`, sourceId: String(v.id) });
  }

  // 2. 새 기사 — 찜한 사무소가 썼거나, 찜한 단지에서 50m 안·제목에 단지 이름
  const now = new Date().toISOString();
  const { data: arts } = await s.from("articles").select("id, article_no, title, author_id, lat, lng").eq("status", "APPROVED").eq("is_deleted", false).gte("published_at", since).lte("published_at", now).limit(1000);
  for (const a of (arts || []) as Row[]) {
    const users = new Set<string>(fansOfOwner.get(a.author_id)?.users || []);
    let about = fansOfOwner.get(a.author_id)?.name || "";
    for (const c of cxs) {
      const near = a.lat && a.lng && c.lat && c.lng && meters(a as { lat: number; lng: number }, c as { lat: number; lng: number }) <= 50;
      const named = bare(c.name).length >= 3 && bare(a.title).includes(bare(c.name));
      if (near || named) { (fansOfCx.get(c.id) || []).forEach((u) => users.add(u)); about = about || String(c.name); }
    }
    if (users.size) await send(users, a.author_id, { type: "star_article", title: `${about} · 새 기사`, body: String(a.title || ""), link: `/news/${a.article_no || a.id}`, sourceId: String(a.id) });
  }

  // 3. 새 실거래 — 찜한 단지에 오늘 들어온 거래 (단지마다 하루 한 번 묶어서)
  for (const c of cxs) {
    const fresh = [...(c.trades || []), ...(c.rents || [])].filter((t: { s?: string }) => t.s && t.s >= since);
    if (!fresh.length) continue;
    const nSale = (c.trades || []).filter((t: { s?: string }) => t.s && t.s >= since).length;
    const body = [nSale ? `매매 ${nSale}건` : "", fresh.length - nSale ? `전월세 ${fresh.length - nSale}건` : ""].filter(Boolean).join(" · ");
    await send(fansOfCx.get(c.id) || [], null, { type: "star_trade", title: `${c.name} · 새 실거래 ${fresh.length}건`, body, link: `/gongsil?apt=${encodeURIComponent(c.id)}`, sourceId: `${c.id}:${kstDay()}` });
  }
  return { sent };
}
