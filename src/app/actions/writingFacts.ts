"use server";
/**
 * 글쓰기 재료 — 공실뉴스 데이터에서 불러오기 (2026-11-03 사장님: "공실뉴스 데이터에서 불러 올 수도 있게")
 *  내 공실 · 단지 시세(국토부 실거래) · 지역별 현황 · 공실뉴스 기사.
 *  AI 에게 그대로 넘길 "확인된 자료" 글을 만든다 — 숫자는 DB 값 그대로, 없는 값은 쓰지 않는다 (지어내지 않는다).
 *  손님·집주인 이름·연락처·호수 같은 개인정보는 넣지 않는다.
 */
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { LAWD_NAMES, areaLabel, fullPrice, supplyFor, type Rent, type Trade } from "@/utils/aptMapShared";

const admin = () => createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function me() {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  return user;
}
type Out<T> = { success: true; data: T } | { success: false; error: string };
const won = (v: number | null | undefined) => {
  if (!v) return "";
  const man = Math.floor(v / 10000), eok = Math.floor(man / 10000), rest = man % 10000;
  return eok ? `${eok}억${rest ? ` ${rest.toLocaleString("ko-KR")}만` : ""}원` : `${man.toLocaleString("ko-KR")}만원`;
};
const dot = (d: string) => d.replace(/-/g, ".");
const ym = (d: string) => d.slice(0, 7);
const monthsBack = (n: number) => {
  const out: string[] = [];
  const t = new Date(Date.now() + 9 * 3600000);
  for (let i = 0; i < n; i++) { const x = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - i, 1)); out.push(`${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`); }
  return out;
};
const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const KIND_KO: Record<string, string> = { apt: "아파트", offi: "오피스텔", villa: "빌라" };

/* ── 내 공실 ── */
export async function writingMyVacancies(): Promise<Out<{ id: string; label: string }[]>> {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  const { data, error } = await admin().from("vacancies").select("id, vacancy_no, building_name, trade_type, sigungu, dong, deposit, monthly_rent")
    .eq("owner_id", user.id).eq("status", "ACTIVE").order("created_at", { ascending: false }).limit(200);
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data || []).map((v) => ({ id: v.id, label: `${v.vacancy_no} · ${v.building_name || [v.sigungu, v.dong].filter(Boolean).join(" ")} · ${v.trade_type || ""} ${v.trade_type === "월세" ? `${won(v.deposit)}/${won(v.monthly_rent)}` : won(v.deposit)}`.trim() })) };
}

/** photos — 공실에 등록한 사진 (순서대로, 2026-11-03 사장님: 이미 첨부한 사진도 기사에) */
export async function writingVacancyFacts(id: string): Promise<Out<{ title: string; text: string; complexId: string | null; photos: string[] }>> {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  const { data: v, error } = await admin().from("vacancies").select("vacancy_no, property_type, sub_category, trade_type, deposit, monthly_rent, maintenance_fee, supply_m2, supply_py, exclusive_m2, exclusive_py, room_count, bath_count, direction, current_floor, total_floor, parking, move_in_date, options, sido, sigungu, dong, building_name, address_exposure, description, infrastructure, themes, complex_id, vacancy_photos(url, sort_order)")
    .eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (error || !v) return { success: false, error: error?.message || "공실을 찾지 못했습니다." };
  const price = v.trade_type === "월세" ? `보증금 ${won(v.deposit)} / 월세 ${won(v.monthly_rent)}` : `${v.trade_type || ""} ${won(v.deposit)}`;
  const rows: [string, unknown][] = [
    ["공실번호", v.vacancy_no], ["종류", [v.property_type, v.sub_category].filter(Boolean).join(" · ")], ["거래", price.trim()],
    ["관리비", v.maintenance_fee ? won(v.maintenance_fee) : ""], ["위치", [v.sido, v.sigungu, v.dong].filter(Boolean).join(" ")], ["건물", v.building_name],
    ["전용면적", v.exclusive_m2 ? `${v.exclusive_m2}㎡${v.exclusive_py ? ` (${v.exclusive_py}평)` : ""}` : ""], ["공급면적", v.supply_m2 ? `${v.supply_m2}㎡${v.supply_py ? ` (${v.supply_py}평)` : ""}` : ""],
    ["방·욕실", v.room_count || v.bath_count ? `방 ${v.room_count ?? "-"} · 욕실 ${v.bath_count ?? "-"}` : ""], ["방향", v.direction], ["층", v.current_floor ? `${v.current_floor}층${v.total_floor ? ` / ${v.total_floor}층` : ""}` : ""],
    ["주차", v.parking], ["입주", v.move_in_date], ["옵션", Array.isArray(v.options) ? v.options.join(", ") : v.options], ["특징", Array.isArray(v.themes) ? v.themes.join(", ") : v.themes],
    ["주변", typeof v.infrastructure === "string" ? v.infrastructure : v.infrastructure ? JSON.stringify(v.infrastructure).slice(0, 400) : ""], ["설명", String(v.description || "").slice(0, 800)],
  ];
  const text = rows.filter(([, x]) => x !== null && x !== undefined && String(x).trim()).map(([k, x]) => `- ${k}: ${String(x).trim()}`).join("\n");
  const photos = ((v as { vacancy_photos?: { url: string; sort_order: number | null }[] }).vacancy_photos || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((x) => x.url).filter(Boolean);
  return { success: true, data: { title: `공실 ${v.vacancy_no} ${v.building_name || v.dong || ""}`.trim(), text: `[내 공실 — 공실뉴스 등록 정보]\n${text}`, complexId: v.complex_id || null, photos } };
}

/* ── 단지 시세 ── */
export async function writingSearchComplexes(q: string): Promise<Out<{ id: string; label: string }[]>> {
  const t = String(q || "").trim();
  if (t.length < 2) return { success: true, data: [] };
  const { data, error } = await admin().from("apt_complexes").select("id, name, dong, kind, lawd_cd").ilike("name", `%${t.replace(/[%_]/g, "")}%`).not("rep_price", "is", null).limit(30);
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data || []).map((c) => ({ id: c.id, label: `${c.name} · ${(LAWD_NAMES[c.lawd_cd] || "").replace(/^\S+\s/, "")} ${c.dong} · ${KIND_KO[c.kind] || c.kind}` })) };
}

export async function writingComplexFacts(id: string): Promise<Out<{ title: string; text: string }>> {
  const { data: c, error } = await admin().from("apt_complexes").select("id, kind, name, lawd_cd, dong, jibun, build_year, trades, rents, supply_map, info").eq("id", id).maybeSingle();
  if (error || !c) return { success: false, error: error?.message || "단지를 찾지 못했습니다." };
  const trades = (c.trades || []) as Trade[], rents = (c.rents || []) as Rent[];
  const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const groups = new Map<string, { a: number; sales: Trade[]; leases: Rent[] }>();
  const g = (a: number) => { const k = areaLabel(a, supplyFor(c.supply_map, a)); const x = groups.get(k) || { a, sales: [], leases: [] }; groups.set(k, x); return x; };
  trades.forEach((t) => g(t.a).sales.push(t));
  rents.forEach((r) => g(r.a).leases.push(r));
  const lines: string[] = [];
  const info = c.info || {};
  lines.push(`- 단지: ${c.name} (${KIND_KO[c.kind] || c.kind}) · ${LAWD_NAMES[c.lawd_cd] || ""} ${c.dong} ${c.jibun}`);
  const built = info.useAprDay ? String(info.useAprDay).slice(0, 4) : c.build_year;
  const meta = [info.households ? `${info.households}세대` : "", built ? `${built}년 준공` : "", info.dongs ? `${info.dongs}개동` : "", info.topFloor ? `최고 ${info.topFloor}층` : "", info.parking ? `주차 ${info.parking}대` : "", info.subway ? `지하철 ${info.subway}${info.subwayTime ? ` 도보 ${info.subwayTime}` : ""}` : ""].filter(Boolean);
  if (meta.length) lines.push(`- 단지 정보: ${meta.join(" · ")}`);
  for (const [label, x] of [...groups.entries()].sort((p, q) => p[1].a - q[1].a)) {
    const s = [...x.sales].sort((p, q) => q.d.localeCompare(p.d));
    const j = x.leases.filter((r) => !r.m).sort((p, q) => q.d.localeCompare(p.d));
    const y = s.filter((t) => t.d >= yearAgo);
    const parts: string[] = [];
    if (s[0]) parts.push(`최근 매매 ${fullPrice(s[0].p)} (${dot(s[0].d)}, ${s[0].f}층)`);
    if (y.length) parts.push(`최근 1년 매매 ${y.length}건 · 최고 ${fullPrice(Math.max(...y.map((t) => t.p)))} · 최저 ${fullPrice(Math.min(...y.map((t) => t.p)))}`);
    if (j[0]) parts.push(`최근 전세 ${fullPrice(j[0].dep)} (${dot(j[0].d)})`);
    if (parts.length) lines.push(`- ${label}: ${parts.join(" / ")}`);
  }
  // 최근 거래 10건
  const recent = [...trades].sort((p, q) => q.d.localeCompare(p.d)).slice(0, 10);
  if (recent.length) lines.push(`- 최근 매매 거래: ${recent.map((t) => `${dot(t.d)} ${areaLabel(t.a, supplyFor(c.supply_map, t.a))} ${fullPrice(t.p)} ${t.f}층`).join(" | ")}`);
  return { success: true, data: { title: c.name, text: `[단지 시세 — 국토교통부 실거래가, ${today()} 기준 · 최근 3년 · 해제 거래 제외]\n${lines.join("\n")}` } };
}

/* ── 지역별 현황 ── */
export async function writingAreaDongs(lawd: string): Promise<Out<string[]>> {
  if (!LAWD_NAMES[lawd]) return { success: false, error: "지역을 골라 주세요." };
  const { data, error } = await admin().from("apt_complexes").select("dong").eq("lawd_cd", lawd).limit(5000);
  if (error) return { success: false, error: error.message };
  return { success: true, data: [...new Set((data || []).map((r) => r.dong as string))].sort((a, b) => a.localeCompare(b, "ko")) };
}

export async function writingAreaFacts(lawd: string, dong: string, kinds: string[], months = 3): Promise<Out<{ title: string; text: string }>> {
  if (!LAWD_NAMES[lawd]) return { success: false, error: "지역을 골라 주세요." };
  const ks = (kinds || []).filter((k) => ["apt", "offi"].includes(k));
  let q = admin().from("apt_complexes").select("name, kind, dong, trades, rents, supply_map").eq("lawd_cd", lawd).in("kind", ks.length ? ks : ["apt", "offi"]);
  if (dong) q = q.eq("dong", dong);
  const { data, error } = await q.limit(3000);
  if (error) return { success: false, error: error.message };
  const win = monthsBack(Math.max(1, Math.min(12, months)));
  const from = `${win[win.length - 1]}-01`;
  const six = monthsBack(6).reverse();
  const place = `${LAWD_NAMES[lawd]}${dong ? ` ${dong}` : ""}`;
  type D = { name: string; kind: string; dong: string; t: Trade; s: number | null };
  const deals: D[] = [];
  const jeonse: number[] = [];
  const byMonth = new Map<string, { n: number; p: number; a: number }>();
  for (const c of data || []) {
    for (const t of (c.trades || []) as Trade[]) {
      const m = ym(t.d);
      if (six.includes(m)) { const x = byMonth.get(m) || { n: 0, p: 0, a: 0 }; x.n++; x.p += t.p; x.a += t.a; byMonth.set(m, x); }
      if (t.d >= from) deals.push({ name: c.name, kind: c.kind, dong: c.dong, t, s: supplyFor(c.supply_map, t.a) });
    }
    for (const r of (c.rents || []) as Rent[]) if (!r.m && r.d >= from) jeonse.push(r.dep);
  }
  if (!deals.length && ![...byMonth.values()].some((x) => x.n)) return { success: false, error: `${place}에는 기간 안의 실거래 자료가 아직 없습니다.` };
  const lines: string[] = [];
  lines.push(`- 지역: ${place} · ${(ks.length ? ks : ["apt", "offi"]).map((k) => KIND_KO[k]).join("·")} · 단지 ${(data || []).length}곳`);
  lines.push(`- 기간: ${win[win.length - 1]} ~ ${win[0]} (최근 ${win.length}개월) 매매 ${deals.length}건${jeonse.length ? ` · 전세 ${jeonse.length}건` : ""}`);
  lines.push(`- 달마다 매매 건수·전용 ㎡당 평균: ${six.map((m) => { const x = byMonth.get(m); return `${m} ${x?.n || 0}건${x && x.a ? ` (㎡당 ${Math.round(x.p / x.a).toLocaleString("ko-KR")}만원)` : ""}`; }).join(" | ")}`);
  const top = [...deals].sort((a, b) => b.t.p - a.t.p).slice(0, 5);
  if (top.length) lines.push(`- 최고가 거래 TOP ${top.length}: ${top.map((x, i) => `${i + 1}) ${x.name}${dong ? "" : `(${x.dong})`} ${areaLabel(x.t.a, x.s)} ${fullPrice(x.t.p)} ${dot(x.t.d)} ${x.t.f}층`).join(" | ")}`);
  const cnt = new Map<string, number>();
  deals.forEach((x) => cnt.set(x.name, (cnt.get(x.name) || 0) + 1));
  const most = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (most.length) lines.push(`- 거래 많은 단지: ${most.map(([n, k]) => `${n} ${k}건`).join(" | ")}`);
  const latest = [...deals].sort((a, b) => b.t.d.localeCompare(a.t.d)).slice(0, 8);
  if (latest.length) lines.push(`- 최근 거래: ${latest.map((x) => `${dot(x.t.d)} ${x.name} ${areaLabel(x.t.a, x.s)} ${fullPrice(x.t.p)}`).join(" | ")}`);
  return { success: true, data: { title: `${place} 실거래 현황`, text: `[지역별 현황 — 국토교통부 실거래가, ${today()} 기준 · 해제 거래 제외 · 최근 거래는 늦게 신고될 수 있음]\n${lines.join("\n")}` } };
}

/* ── 공실뉴스 기사 ── */
export async function writingArticles(q: string): Promise<Out<{ id: string; label: string }[]>> {
  let query = admin().from("articles").select("id, article_no, title, published_at").eq("status", "APPROVED").eq("is_deleted", false).order("published_at", { ascending: false }).limit(30);
  const t = String(q || "").trim();
  if (t) query = query.ilike("title", `%${t.replace(/[%_]/g, "")}%`);
  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data || []).map((a) => ({ id: a.id, label: `${a.title}${a.published_at ? ` · ${String(a.published_at).slice(0, 10)}` : ""}` })) };
}

export async function writingArticleFacts(id: string): Promise<Out<{ title: string; text: string }>> {
  const { data: a, error } = await admin().from("articles").select("article_no, title, subtitle, content, published_at").eq("id", id).maybeSingle();
  if (error || !a) return { success: false, error: error?.message || "기사를 찾지 못했습니다." };
  const body = String(a.content || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 3500);
  return { success: true, data: { title: a.title, text: `[공실뉴스 기사 — 기사 ${a.article_no}${a.published_at ? `, ${String(a.published_at).slice(0, 10)}` : ""}]\n- 제목: ${a.title}${a.subtitle ? `\n- 부제: ${String(a.subtitle).replace(/<[^>]+>/g, " ").slice(0, 300)}` : ""}\n- 본문: ${body}` } };
}

/** 웹 [뉴스 기사] — 기사 주소를 붙여 넣으면 서버가 본문을 읽어 온다 (앱은 안 보이는 창으로 읽는다, 2026-11-03 사장님: 웹도 앱과 같이)
 *  로그인한 회원만 · 공개 주소(http/https)만 · 사내망·내 PC 주소는 읽지 않는다. 원문 문장은 AI 가 옮기지 않고 사실만 살려 새로 쓴다 */
export async function writingFetchNews(url: string): Promise<Out<{ title: string; publisher: string; publishedAt: string; url: string; body: string }>> {
  if (!(await me())) return { success: false, error: "로그인이 필요합니다." };
  let u: URL;
  try { u = new URL(String(url || "").trim()); } catch { return { success: false, error: "뉴스 주소(https://…)를 붙여 넣어 주세요." }; }
  if (!/^https?:$/.test(u.protocol)) return { success: false, error: "뉴스 주소(https://…)를 붙여 넣어 주세요." };
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[)/i.test(u.hostname) || !u.hostname.includes(".")) return { success: false, error: "읽을 수 없는 주소예요." };
  let html = "";
  try {
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36", Accept: "text/html,*/*", "Accept-Language": "ko-KR,ko;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { success: false, error: `뉴스 페이지를 열지 못했어요 (${res.status}). 주소를 확인해 주세요.` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 5_000_000) return { success: false, error: "페이지가 너무 커서 읽지 못했어요." };
    const ct = res.headers.get("content-type") || "";
    const cs = /charset=([\w-]+)/i.exec(ct)?.[1] || /<meta[^>]+charset=["']?([\w-]+)/i.exec(new TextDecoder("latin1").decode(buf.slice(0, 4000)))?.[1] || "utf-8";
    try { html = new TextDecoder(cs.toLowerCase() === "ks_c_5601-1987" ? "euc-kr" : cs).decode(buf); } catch { html = new TextDecoder("utf-8").decode(buf); }
  } catch { return { success: false, error: "뉴스 페이지를 열지 못했어요. 주소를 확인해 주세요." }; }
  const cheerio = await import("cheerio");
  const $ = cheerio.load(html);
  const clean = (t: string) => t.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  const meta = (p: string) => $(`meta[property="${p}"], meta[name="${p}"]`).attr("content") || "";
  $("script, style, noscript, iframe, nav, header, footer, aside, form, figure figcaption, .reporter_area, .copyright, .byline, .media_end_head_journalist").remove();
  // 언론사·네이버 뉴스 본문 칸 → 없으면 문단 글이 가장 많이 모인 칸
  let body = "";
  for (const sel of ["#dic_area", "#newsct_article", "#articleBodyContents", "#articeBody", ".article_body", "#article-view-content-div", ".news_cnt_detail_wrap", "[itemprop=articleBody]", ".view_cont", "article"]) {
    const t = clean($(sel).first().text());
    if (t.length >= 200) { body = t; break; }
  }
  if (!body) {
    let best = "", top = 0;
    $("div, section").each((_, el) => {
      const ps = $(el).children("p");
      const t = clean(ps.map((__, p) => $(p).text()).get().join("\n"));
      if (t.length > top) { top = t.length; best = t; }
    });
    body = best;
  }
  if (body.length < 200) return { success: false, error: "이 주소에서 기사 본문을 찾지 못했어요. 기사 한 건이 열린 주소인지 확인해 주세요." };
  const title = clean(meta("og:title") || $("h2#title_area, .media_end_head_headline, h1").first().text() || $("title").text()).slice(0, 200);
  const publisher = clean(meta("og:article:author") || meta("og:site_name") || $(".media_end_head_top_logo img").attr("alt") || u.hostname).slice(0, 40);
  const publishedAt = clean($(".media_end_head_info_datestamp_time").first().attr("data-date-time") || meta("article:published_time") || "").slice(0, 16).replace("T", " ");
  return { success: true, data: { title, publisher, publishedAt, url: u.toString(), body: body.slice(0, 9000) } };
}
