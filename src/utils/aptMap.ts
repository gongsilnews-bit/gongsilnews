/**
 * 공실열람 지도 [아파트 시세] — 단지별 시세 모으기 (2026-11-02 사장님: 호갱노노처럼, 오피스텔도)
 *
 * 시군구 하나씩 (매일 밤 크론 /api/cron/apt-prices):
 *  1. 실거래: 국토부 아파트·오피스텔 매매·전월세 최근 36개월 → 법정동+지번으로 단지 묶기 → apt_complexes 에 저장
 *  2. 위치: 좌표가 없는 단지만 카카오 지번 주소 검색 (한 번만)
 *  3. 평형: 건축물대장 전유공용면적 → 전용㎡별 공급㎡ · 세대수 (한 번만)
 *  4. 단지 정보: 총괄표제부·표제부·공동주택 기본정보 → 세대수·준공·용적률·건폐율·최고층·난방·계단식·주차 (한 번만)
 * 숫자는 신고·공부 자료 그대로다. 못 찾은 값은 비워 둔다 (지어내지 않는다).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseError, parseItems, parseTotalCount, recentMonths } from "@/utils/aptTrades";
import { buildingsAt, hubLimited, kaptFor, recapAt, resetHubLimited, type Parcel } from "@/utils/publicLand";
import { LAWD_NAMES, areaLabel, supplyFor, type AreaSummary, type Rent, type Trade } from "@/utils/aptMapShared";

export { LAWD_NAMES, areaLabel, supplyFor };
export type { AreaSummary, Rent, Trade };

const MONTHS = 36;
export const RECENT_MONTHS = 3; // 매일 밤은 최근 3개월만 (실거래는 계약 30일 안에 신고) — 36개월 전체는 한 달에 한 번 (2026-11-03 사장님)
const RENT_KEEP = 100; // 전월세는 많다 — 단지마다 최근 100건만 (11-02 400건으로 넣다 DB 가 멈춤)
const WRITE_BATCH = 10; // 한 번에 10곳씩, 사이에 쉬면서 (Nano DB 보호)
const FP_VERSION = "v2"; // 저장 모양을 바꾸면 올린다 — 다음 갱신 때 모든 단지를 한 번 다시 쓴다

/** 아파트 · 오피스텔 · 빌라(연립·다세대) — 국토부 창구와 이름 칸이 다르다
 *  빌라 매매 창구는 RHTrade2 (운영계정, 2026-11-03), 전월세는 RHRent. 건물명이 비면 "동 지번"으로 */
export type Kind = "apt" | "offi" | "villa";
const KIND: Record<Kind, { service: string; nameTag: string; idPrefix: string; trade?: string }> = {
  apt: { service: "Apt", nameTag: "aptNm", idPrefix: "" },
  offi: { service: "Offi", nameTag: "offiNm", idPrefix: "o:" },
  villa: { service: "RH", nameTag: "mhouseNm", idPrefix: "v:", trade: "RHTrade2" },
};


export const db = (): SupabaseClient =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const dataKey = () => {
  const key = process.env.DATA_GO_KR_API_KEY;
  if (!key) throw new Error("서버에 공공데이터 키가 없습니다 (DATA_GO_KR_API_KEY).");
  return key.includes("%") ? key : encodeURIComponent(key);
};

const tag = (xml: string, name: string) => (xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] || "").trim();
const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
const pad = (v: string) => v.padStart(2, "0");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const byDateDesc = <T extends { d: string }>(list: T[]) => list.sort((x, y) => y.d.localeCompare(x.d));

/** 매매 거래 → 평형별 요약 + 대표(최근 12개월에 거래가 가장 많은 평형, 같으면 최근 거래) — 지도 표시용.
 *  전용 84.236 · 84.349㎡처럼 조금씩 다른 호수도 같은 평형이면 한 줄로 묶는다 */
export function summarize(trades: Trade[], supplyMap: Record<string, number> | null) {
  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = areaLabel(t.a, supplyFor(supplyMap, t.a));
    groups.set(k, [...(groups.get(k) || []), t]);
  }
  const yearAgo = recentMonths(12).at(-1)!;
  const inYear = (d: string) => d.replace(/-/g, "").slice(0, 6) >= yearAgo;
  const areas: (AreaSummary & { y: number })[] = [...groups.values()].map((list) => {
    const latest = [...list].sort((x, y) => y.d.localeCompare(x.d))[0];
    const sizes = list.map((t) => t.a);
    return {
      a: latest.a, s: supplyFor(supplyMap, latest.a), n: list.length, p: latest.p, d: latest.d, f: latest.f,
      lo: Math.min(...sizes), hi: Math.max(...sizes), y: list.filter((t) => inYear(t.d)).length,
    };
  }).sort((x, y) => x.a - y.a);
  const rep = [...areas].sort((x, y) => y.y - x.y || y.d.localeCompare(x.d))[0];
  return {
    areas: areas.map(({ y: _y, ...x }) => x),
    rep_area: rep?.a ?? null, rep_supply: rep?.s ?? null, rep_price: rep?.p ?? null, rep_date: rep?.d ?? null,
    trade_count: trades.length,
  };
}

/* ── 1. 실거래 (매매·전월세) ── */
async function monthItems(kind: Kind, service: "Trade" | "Rent", lawd: string, ym: string) {
  const svc = service === "Trade" && KIND[kind].trade ? KIND[kind].trade! : `${KIND[kind].service}${service}`;
  const items: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://apis.data.go.kr/1613000/RTMSDataSvc${svc}/getRTMSDataSvc${svc}?serviceKey=${dataKey()}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
    let xml = "";
    for (let tryNo = 0; tryNo < 6; tryNo++) { // 초당 한도는 몇 초 쉬면 풀린다 — 넉넉히 다시
      xml = await fetch(url, { cache: "no-store" }).then((r) => r.text()).catch(() => "");
      await sleep(300); // 몰아서 물으면 "초당 요청 초과"로 막힌다 — 한 번 묻고 조금 쉰다 (2026-11-03)
      // 초당 한도에 걸리면 쉬었다가 다시 (2026-11-02 "초당 서비스 요청제한 횟수 초과"로 도봉구를 건너뛴 일)
      if (xml && !/LIMITED_NUMBER|HTTP_ERROR|초당|요청제한/.test(xml)) break;
      await sleep(1500 * (tryNo + 1));
    }
    const error = parseError(xml);
    if (error) throw new Error(`국토부 실거래가 오류 (${svc} ${lawd} ${ym}): ${error}`);
    items.push(...parseItems(xml));
    if (parseTotalCount(xml) <= page * 1000) break;
  }
  return items;
}

const date = (it: string) => `${tag(it, "dealYear")}-${pad(tag(it, "dealMonth"))}-${pad(tag(it, "dealDay"))}`;

/** 여러 달을 몇 개씩만 동시에 (공공데이터 초당 한도) — 지금은 한 달씩 차례로 (2026-11-03 사장님: 막히지 않게) */
async function inBatches<T>(list: string[], size: number, run: (x: string) => Promise<T[]>) {
  const out: T[] = [];
  for (let i = 0; i < list.length; i += size) out.push(...(await Promise.all(list.slice(i, i + size).map(run))).flat());
  return out;
}

/** 거래 지문 — 건수와 가장 최근 거래가 같으면 다시 쓰지 않는다 */
/** 공공 자료 공급면적 + 부동산이 보완한 공급면적 (부동산 값이 우선, aptReports.ts) */
export const withAgent = (pub: Record<string, number> | null | undefined, agent: Record<string, number> | null | undefined) =>
  pub || agent ? { ...(pub || {}), ...(agent || {}) } : null;

const fingerprint = (trades: Trade[], rents: Rent[]) =>
  [FP_VERSION, trades.length, trades[0]?.d, trades[0]?.p, rents.length, rents[0]?.d, rents[0]?.dep, rents[0]?.m].join("|");

/** 새로 신고된 거래가 들어왔나 — 지도 NEW 배지(1주일). 매매가 있는 단지는 매매로, 전월세만 있는 단지는 전월세로 본다 (2026-11-04 사장님) */
const tradeKey = (t: Trade) => `${t.d}|${t.p}|${t.a}|${t.f}`;
const rentKey = (r: Rent) => `${r.d}|${r.dep}|${r.m}|${r.a}|${r.f}`;
function hasNew(trades: Trade[], rents: Rent[], old: { trades?: Trade[] | null; rents?: Rent[] | null } | undefined) {
  if (!old) return true; // 처음 보는 단지 — 새 거래로 생겼다
  const ot = new Set((old.trades || []).map(tradeKey));
  if (trades.length) return trades.some((t) => !ot.has(tradeKey(t)));
  const or = new Set((old.rents || []).map(rentKey));
  return rents.some((r) => !or.has(rentKey(r)));
}
// DB 에 new_at 칸이 있나 (supabase/migrations/20261104_apt_complexes_new_at.sql) — 없으면 10분 뒤 다시 본다 (칸을 만든 뒤 저절로 쓰게)
let NEW_AT_OK = true, newAtCheckedAt = 0;
/** 거래마다 들어온 날(s) — 전에 있던 거래는 그 날 그대로, 처음 보는 거래는 오늘 (처음 받는 시군구는 적지 않는다) */
function stampSeen(trades: Trade[], rents: Rent[], old: { trades?: Trade[] | null; rents?: Rent[] | null } | undefined, mark: boolean) {
  const today = new Date().toISOString();
  const ot = new Map((old?.trades || []).map((t) => [tradeKey(t), t.s]));
  const or = new Map((old?.rents || []).map((r) => [rentKey(r), r.s]));
  for (const t of trades) { const k = tradeKey(t); const s = ot.has(k) ? ot.get(k) : mark ? today : undefined; if (s) t.s = s; else delete t.s; }
  for (const r of rents) { const k = rentKey(r); const s = or.has(k) ? or.get(k) : mark ? today : undefined; if (s) r.s = s; else delete r.s; }
}
const oldCols = async (q: (cols: string) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>, cols: string) => {
  if (!NEW_AT_OK && Date.now() - newAtCheckedAt > 600_000) NEW_AT_OK = true;
  if (NEW_AT_OK) {
    const r = await q(`${cols}, new_at`);
    if (!r.error || !/new_at/.test(r.error.message)) return r;
    NEW_AT_OK = false;
    newAtCheckedAt = Date.now();
  }
  return q(cols);
};

type Group = { name: string; dong: string; jibun: string; buildYear: number; trades: Trade[]; rents: Rent[] };
/** 몇 달치 매매·전월세를 받아 단지(법정동+지번)별로 묶는다 */
async function fetchGroups(lawd: string, kind: Kind, months: string[]) {
  const k = KIND[kind];
  const head = (it: string) => {
    const dong = tag(it, "umdNm"), jibun = tag(it, "jibun");
    const nm = tag(it, k.nameTag);
    // 빌라는 건물명이 비거나 "(242-4)"처럼 지번만 오는 때가 많다 — 그러면 "논현동 242-4"
    const name = kind === "villa" && (!nm || /^\(?[\d-]+\)?$/.test(nm)) ? `${dong} ${jibun}` : nm;
    return { name, dong, jibun, buildYear: num(tag(it, "buildYear")) };
  };
  const sales = (await inBatches(months, 1, (ym) => monthItems(kind, "Trade", lawd, ym)))
    .filter((it) => tag(it, "cdealType") !== "O") // 해제된 거래 빼기
    .map((it) => ({ ...head(it), t: { a: num(tag(it, "excluUseAr")), p: num(tag(it, "dealAmount")), d: date(it), f: num(tag(it, "floor")) } as Trade }))
    .filter((x) => x.name && x.dong && x.jibun && x.t.p > 0 && x.t.a > 0);
  const rents = (await inBatches(months, 1, (ym) => monthItems(kind, "Rent", lawd, ym)))
    .map((it) => ({ ...head(it), r: { a: num(tag(it, "excluUseAr")), dep: num(tag(it, "deposit")), m: num(tag(it, "monthlyRent")), d: date(it), f: num(tag(it, "floor")) } as Rent }))
    .filter((x) => x.name && x.dong && x.jibun && x.r.dep > 0 && x.r.a > 0);

  const byId = new Map<string, Group>();
  const group = (x: ReturnType<typeof head>) => {
    const id = `${k.idPrefix}${lawd}:${x.dong}:${x.jibun}`;
    const g = byId.get(id) || { name: x.name, dong: x.dong, jibun: x.jibun, buildYear: x.buildYear, trades: [], rents: [] };
    byId.set(id, g);
    return g;
  };
  for (const x of sales) group(x).trades.push(x.t);
  for (const x of rents) group(x).rents.push(x.r);
  return { byId, sales: sales.length, rents: rents.length };
}

/** 한 달에 한 번 — 36개월 전체를 받아 통째로 맞춘다 (36개월 밖으로 나간 단지는 시세를 비운다) */
export async function syncTrades(lawd: string, kind: Kind = "apt") {
  const { byId, sales, rents } = await fetchGroups(lawd, kind, recentMonths(MONTHS));
  const supabase = db();
  const { data: old, error } = await oldCols((c) => supabase.from("apt_complexes").select(c).eq("lawd_cd", lawd).eq("kind", kind), "id, supply_map, agent_supply, fp, trades, rents");
  if (error) throw new Error(`DB 읽기 오류: ${error.message}`);
  type Old = { supply_map: Record<string, number> | null; agent_supply: Record<string, number> | null; fp: string | null; trades: Trade[] | null; rents: Rent[] | null; new_at?: string | null };
  const oldById = new Map(((old || []) as (Old & { id: string })[]).map((r) => [r.id, r]));
  const firstLoad = oldById.size === 0; // 이 시군구를 처음 받는 날은 전부 "새 거래"가 아니다

  const rows = [...byId.entries()].flatMap(([id, g]) => {
    const trades = byDateDesc(g.trades), kept = byDateDesc(g.rents).slice(0, RENT_KEEP);
    const fp = fingerprint(trades, kept);
    const o = oldById.get(id);
    if (o?.fp === fp) return []; // 바뀐 것 없음
    const fresh = !firstLoad && hasNew(trades, kept, o);
    stampSeen(trades, kept, o, !firstLoad);
    return [{
      id, kind, lawd_cd: lawd, dong: g.dong, jibun: g.jibun, name: g.name, build_year: g.buildYear || null,
      trades, rents: kept, fp, ...summarize(trades, withAgent(o?.supply_map, o?.agent_supply)), updated_at: new Date().toISOString(),
      ...(NEW_AT_OK ? { new_at: fresh ? new Date().toISOString() : o?.new_at ?? null } : {}),
    }];
  });
  for (let i = 0; i < rows.length; i += WRITE_BATCH) {
    const { error: e } = await supabase.from("apt_complexes").upsert(rows.slice(i, i + WRITE_BATCH));
    if (e) throw new Error(`DB 저장 오류: ${e.message}`);
    await sleep(250);
  }
  // 36개월 안에 거래가 없어진 단지는 시세를 비운다 (위치·평형·정보는 그대로 둔다)
  const gone = [...oldById.keys()].filter((id) => !byId.has(id) && oldById.get(id)?.fp !== "gone");
  for (let i = 0; i < gone.length; i += 50) {
    await supabase.from("apt_complexes")
      .update({ trades: [], rents: [], areas: [], rep_area: null, rep_supply: null, rep_price: null, rep_date: null, trade_count: 0, fp: "gone" })
      .in("id", gone.slice(i, i + 50));
  }
  return { kind, complexes: byId.size, written: rows.length, sales, rents, emptied: gone.length };
}

/** 매일 밤 — 최근 몇 달만 받아, 거래가 있는 단지의 그 달 거래만 새로 바꿔 끼운다 (해제된 거래도 빠진다).
 *  거래가 없는 단지는 건드리지 않는다. 36개월 밖으로 나간 거래는 여기서도 덜어 낸다 */
export async function syncRecent(lawd: string, kind: Kind = "apt", n = RECENT_MONTHS) {
  const months = recentMonths(n);
  const from = months.at(-1)!, keepFrom = recentMonths(MONTHS).at(-1)!;
  const ym = (d: string) => d.replace(/-/g, "").slice(0, 6);
  const older = <T extends { d: string }>(list: T[] | null | undefined) => (list || []).filter((x) => ym(x.d) < from && ym(x.d) >= keepFrom);
  const { byId, sales, rents } = await fetchGroups(lawd, kind, months);
  const supabase = db();
  type Old = { id: string; trades: Trade[] | null; rents: Rent[] | null; supply_map: Record<string, number> | null; agent_supply: Record<string, number> | null; fp: string | null; new_at?: string | null };
  const ids = [...byId.keys()];
  const oldById = new Map<string, Old>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await oldCols((c) => supabase.from("apt_complexes").select(c).in("id", ids.slice(i, i + 100)), "id, trades, rents, supply_map, agent_supply, fp");
    if (error) throw new Error(`DB 읽기 오류: ${error.message}`);
    for (const row of (data || []) as Old[]) oldById.set(row.id, row);
  }
  let added = 0;
  const rows = [...byId.entries()].flatMap(([id, g]) => {
    const o = oldById.get(id);
    const trades = byDateDesc([...older(o?.trades), ...g.trades]);
    const kept = byDateDesc([...older(o?.rents), ...g.rents]).slice(0, RENT_KEEP);
    const fp = fingerprint(trades, kept);
    if (o?.fp === fp) return [];
    if (!o) added++;
    const fresh = hasNew(trades, kept, o);
    stampSeen(trades, kept, o, true);
    return [{
      id, kind, lawd_cd: lawd, dong: g.dong, jibun: g.jibun, name: g.name, build_year: g.buildYear || null,
      trades, rents: kept, fp, ...summarize(trades, withAgent(o?.supply_map, o?.agent_supply)), updated_at: new Date().toISOString(),
      ...(NEW_AT_OK ? { new_at: fresh ? new Date().toISOString() : o?.new_at ?? null } : {}),
    }];
  });
  for (let i = 0; i < rows.length; i += WRITE_BATCH) {
    const { error: e } = await supabase.from("apt_complexes").upsert(rows.slice(i, i + WRITE_BATCH));
    if (e) throw new Error(`DB 저장 오류: ${e.message}`);
    await sleep(250);
  }
  return { kind, months: n, complexes: byId.size, written: rows.length, added, sales, rents };
}

/* ── 2. 위치 ── */
const kakaoGet = (path: string, query: string) =>
  fetch(`https://dapi.kakao.com/v2/local/search/${path}.json?query=${encodeURIComponent(query)}&size=5`, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, cache: "no-store",
  }).then((x) => x.json()).catch(() => null);
const bare = (v: string) => v.replace(/\s|아파트|오피스텔|\(.*?\)/g, "").toLowerCase();

/** 지번으로 못 찾을 때 — 단지 이름으로 카카오 장소 검색 (2026-11-04 사장님: 아크로삼성이 지도에 없음.
 *  재건축·택지 단지는 새 지번이 카카오 주소에 아직 없거나 법정동이 바뀌었다. 아파트 237곳)
 *  주거시설이고, 같은 시군구이고, 이름이 서로 들어 있거나 지번이 같을 때만 쓴다 — 비슷한 딴 건물로 찍지 않게 */
async function geoByName(prefix: string, name: string, jibun: string) {
  if (!name || /^[\d-]+$/.test(name) || /^\S+동 [\d-]+$/.test(name)) return null; // 이름 없이 지번만인 곳은 못 찾는다
  const res = await kakaoGet("keyword", `${prefix} ${name}`);
  if (!res || !Array.isArray(res.documents)) return res && /limit/i.test(String(res.message || res.msg || "")) ? "limited" : null;
  const sigungu = prefix.split(" ").slice(1).join(" ").replace(/특별시|광역시|특별자치시|특별자치도/g, "");
  const want = bare(name);
  const doc = (res.documents as { place_name: string; category_name: string; address_name: string; x: string; y: string }[]).find((d) => {
    if (!/주거시설/.test(d.category_name) || (sigungu && !d.address_name.includes(sigungu))) return false;
    const got = bare(d.place_name);
    return (want.length >= 3 && got.length >= 3 && (got.includes(want) || want.includes(got))) || d.address_name.endsWith(` ${jibun}`);
  });
  if (!doc) return null;
  // 법정동 코드 — 좌표로 받는다 (주소 검색은 지번 검색과 한도를 같이 써서 먼저 바닥난다)
  const reg = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${doc.x}&y=${doc.y}`, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, cache: "no-store",
  }).then((x) => x.json()).catch(() => null);
  const bcode = String((reg?.documents || []).find((d: { region_type: string }) => d.region_type === "B")?.code || "");
  return { lat: Number(doc.y), lng: Number(doc.x), bcode: bcode.length === 10 ? bcode : null };
}

export async function syncGeo(lawd: string, deadline: number) {
  const prefix = LAWD_NAMES[lawd];
  if (!prefix) throw new Error(`주소 이름이 없는 시군구 코드입니다: ${lawd} (src/utils/aptMap.ts LAWD_NAMES)`);
  const supabase = db();
  const { data } = await supabase.from("apt_complexes").select("id, kind, name, dong, jibun").eq("lawd_cd", lawd).is("geo_tried_at", null).limit(500);
  let found = 0, missed = 0, limited = false;
  for (const r of data || []) {
    if (Date.now() > deadline) break;
    const q = `${prefix} ${r.dong} ${r.jibun}`;
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=1`, {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, cache: "no-store",
    }).then((x) => x.json()).catch(() => null);
    // 카카오 하루 한도·잠깐 오류면 "찾아봄"으로 적지 않고 멈춘다 — 다음 실행에 이어서 (2026-11-03: 송파·강동 빌라 1만 4천 곳이 한도 초과로 "못 찾음"이 됨)
    const addrLimited = Boolean(res && !Array.isArray(res.documents) && /limit/i.test(String(res.message || res.msg || "")));
    if (addrLimited && r.kind === "villa") { limited = true; break; }
    if (!res || (!Array.isArray(res.documents) && !addrLimited)) continue;
    const doc = addrLimited ? null : res?.documents?.[0];
    const bcode = String(doc?.address?.b_code || "");
    let patch: Record<string, unknown> = doc && bcode.length === 10
      ? { lat: Number(doc.y), lng: Number(doc.x), bcode, geo_tried_at: new Date().toISOString() }
      : { geo_tried_at: new Date().toISOString() };
    if (!("lat" in patch) && r.kind !== "villa") { // 빌라는 이름이 흔해(○○빌라) 이름 검색으로 찍지 않는다
      const byName = await geoByName(prefix, String(r.name || ""), String(r.jibun || ""));
      if (byName === "limited") { limited = true; break; }
      if (byName) patch = { lat: byName.lat, lng: byName.lng, ...(byName.bcode ? { bcode: byName.bcode } : {}), geo_tried_at: new Date().toISOString() };
      else if (addrLimited) { limited = true; continue; } // 지번은 한도로 못 물어봤다 — "못 찾음"으로 적지 않고 다음에 다시
    }
    if ("lat" in patch) found++; else missed++;
    await supabase.from("apt_complexes").update(patch).eq("id", r.id);
  }
  return limited ? { found, missed, limited } : { found, missed }; // limited — 카카오 하루 한도 (자정에 풀린다)
}

/* ── 3. 평형·세대수 (건축물대장 전유공용면적) ── */
const splitJibun = (jibun: string) => {
  const [bun, ji = "0"] = jibun.replace(/^산\s*/, "").split("-");
  return { bun: bun.padStart(4, "0"), ji: ji.padStart(4, "0"), mountain: /^산/.test(jibun) };
};

const hubPage = async (bcode: string, jibun: string, page: number) => {
  const { bun, ji, mountain } = splitJibun(jibun);
  const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${dataKey()}` +
    `&sigunguCd=${bcode.slice(0, 5)}&bjdongCd=${bcode.slice(5)}&platGbCd=${mountain ? 1 : 0}&bun=${bun}&ji=${ji}` +
    `&numOfRows=1000&pageNo=${page}&_type=json`;
  for (let tryNo = 0; tryNo < 6; tryNo++) {
    const txt = await fetch(url, { cache: "no-store" }).then((r) => r.text()).catch(() => "");
    if (!txt || /LIMITED_NUMBER|HTTP_ERROR|초당|요청제한/.test(txt)) { await sleep(800 * (tryNo + 1)); continue; }
    try {
      const body = JSON.parse(txt)?.response?.body;
      const it = body?.items?.item;
      return { rows: (Array.isArray(it) ? it : it ? [it] : []) as Record<string, unknown>[], total: num(body?.totalCount) };
    } catch {
      // 한도를 넘으면 XML 오류가 온다 — 이번 실행은 여기서 멈춘다 (다음 실행에 이어서)
      if (/SERVICE_KEY|EXCEEDS|LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS/i.test(txt)) throw new Error("건축물대장 하루 호출 한도를 넘었습니다.");
      await sleep(800 * (tryNo + 1)); continue; // 잠깐 깨진 답 — 다시 (2026-11-03: 빈 줄로 보고 "끝"으로 알던 것)
    }
  }
  return { rows: [], total: -1 }; // -1 = 못 받음 (다 받은 것으로 보지 않는다)
};

/** 주거공용만 공급면적에 — 주차·기계·관리·커뮤니티·지하는 뺀다 (publicLand.unitAt 과 같은 기준) */
const isResidentialCommon = (r: Record<string, unknown>) =>
  !/주차|기계|전기|관리|경비|커뮤니티|지하|대피/.test(`${r.mainPurpsCdNm ?? ""} ${r.etcPurps ?? ""}`) && !/^지하/.test(String(r.flrNoNm ?? "").trim());

/** 믿을 수 있는 공급면적만 — 전용의 1.05~2배 밖이면 버린다 ("확인 중"으로 둔다).
 *  2026-11-02: 공용 줄이 없는 대장(1.00배), 창고 같은 작은 전유에 공용이 몰린 대장(4.9배)이 실제로 있었다 */
export function saneSupply(map: Record<string, number> | null | undefined): Record<string, number> | null {
  if (!map) return null;
  const out: Record<string, number> = {};
  for (const [ex, sup] of Object.entries(map)) {
    const r = sup / Number(ex);
    if (r >= 1.05 && r <= 2) out[ex] = sup;
  }
  return Object.keys(out).length ? out : null;
}

/** 호수마다 전유 + 주거공용 → 전용㎡별로 가장 많은 공급㎡ · 세대수 (지번 하나의 대장 전체를 읽는다) */
export async function supplyMapFor(bcode: string, jibun: string, deadline = Infinity) {
  const units = new Map<string, { ex: number; common: number }>();
  // 건축물대장은 1000줄을 달라고 해도 한 번에 100줄만 준다 — 받은 줄 수로 넘긴다 (2026-11-03: 438세대 단지가 58세대로 나옴)
  let seen = 0, complete = false;
  for (let page = 1; page <= 500; page++) { // 5천 세대 단지는 4~5만 줄
    const { rows, total } = await hubPage(bcode, jibun, page);
    seen += rows.length;
    for (const r of rows) {
      const key = `${r.dongNm}|${r.hoNm}`;
      const u = units.get(key) || { ex: 0, common: 0 };
      const area = Number(r.area) || 0;
      if (String(r.exposPubuseGbCdNm).trim() === "전유") u.ex += area;
      else if (isResidentialCommon(r)) u.common += area;
      units.set(key, u);
    }
    if (total < 0 || Date.now() > deadline) break; // 못 받음·시간 끝 → 다음에 다시
    if (seen >= total || !rows.length) { complete = total >= 0 && seen >= total; break; }
    await sleep(150); // 초당 한도
  }
  // 다 못 받았으면(한도·끊김) 세대수는 적지 않는다 — 틀린 숫자보다 빈칸 (공급면적은 그대로 쓴다)
  if (!complete) return { supply: null as Record<string, number> | null, households: null as Record<string, number> | null, partial: true };
  const counts = new Map<string, Map<string, number>>(); // 전용 → (공급 → 호수)
  for (const u of units.values()) {
    if (!u.ex) continue;
    const ex = u.ex.toFixed(2), sup = (u.ex + u.common).toFixed(2);
    const m = counts.get(ex) || new Map<string, number>();
    m.set(sup, (m.get(sup) || 0) + 1);
    counts.set(ex, m);
  }
  const supply: Record<string, number> = {}, households: Record<string, number> = {};
  for (const [ex, m] of counts) {
    supply[ex] = Number([...m.entries()].sort((x, y) => y[1] - x[1])[0][0]);
    households[ex] = [...m.values()].reduce((t, c) => t + c, 0);
  }
  return { supply: saneSupply(supply), households };
}

/** 건축물대장을 끝까지 읽게 고친 때 — 이 전에 센 세대수는 첫 100줄만 센 것이라 다시 센다 (2026-11-03 사장님: "아파트 세대수가 맞지 않아") */
export const UNITS_FIXED_AT = "2026-11-03T10:02:00Z"; // 끝까지 읽기가 실제로 돈 때 (한국 19:02)
/** 세대수(unit_map)가 아직 없는 단지 — 못 찾으면 {} 를 넣어 다시 부르지 않는다 */
export async function syncSupply(lawd: string, deadline: number, kinds: Kind[] = ["apt", "offi"]) {
  const supabase = db();
  const { data } = await supabase.from("apt_complexes")
    .select("id, bcode, jibun, trades, agent_supply").eq("lawd_cd", lawd).not("bcode", "is", null).in("kind", kinds) // 아파트·오피스텔 먼저 (빌라는 kind=villa 로 따로)
    // 아직 없거나, 100줄만 읽던 때(2026-11-03 저녁 전) 센 세대수 — 다시 센다. 다 세었을 때만 덮어쓴다 (그 사이엔 예전 숫자 그대로)
    .or(`unit_map.is.null,supply_tried_at.is.null,supply_tried_at.lt.${UNITS_FIXED_AT}`)
    .order("trade_count", { ascending: false }).limit(400);
  let done = 0, found = 0, skipped = 0;
  for (const r of (data || []) as { id: string; bcode: string; jibun: string; trades: Trade[]; agent_supply: Record<string, number> | null }[]) {
    if (Date.now() > deadline) break;
    const got = await supplyMapFor(r.bcode, r.jibun, deadline);
    if ("partial" in got) { skipped++; continue; } // 다 못 받음 — 다음 실행에 다시
    const { supply, households } = got;
    await supabase.from("apt_complexes")
      .update({ supply_map: supply, unit_map: households, supply_tried_at: new Date().toISOString(), ...summarize(r.trades || [], withAgent(supply, r.agent_supply)) })
      .eq("id", r.id);
    done++;
    if (supply) found++;
  }
  return { done, found, skipped, left: Math.max(0, (data || []).length - done) };
}

/* ── 4. 단지 정보 ── */
export type ComplexInfo = {
  households: number | null; dongs: number | null; useAprDay: string; vlRat: number | null; bcRat: number | null;
  topFloor: number | null; heating: string; hall: string; parking: number | null; builder: string;
  // 공동주택 기본·상세정보 (의무관리 단지만 — 대략 150세대 이상)
  baseFloor: number | null; manage: string; saleType: string; parkingGround: number | null; elevators: number | null;
  cctv: number | null; evChargers: number | null; subway: string; subwayTime: string; busTime: string;
  school: string; convenience: string; welfare: string;
  /** K-apt 단지 코드 — 관리비 받을 때 (아파트만, 2026-11-05) */
  kaptCode?: string;
};

export async function syncInfo(lawd: string, deadline: number) {
  const supabase = db();
  const { data } = await supabase.from("apt_complexes")
    .select("id, kind, name, dong, jibun, bcode").eq("lawd_cd", lawd).not("bcode", "is", null).is("info_tried_at", null)
    .order("trade_count", { ascending: false }).limit(400);
  let done = 0;
  for (const r of (data || []) as InfoRow[]) {
    if (Date.now() > deadline || hubLimited) break;
    if (await fillInfo(r)) done++;
  }
  return { done };
}

type InfoRow = { id: string; kind: Kind; name: string; dong: string; jibun: string; bcode: string };
/**
 * 단지 하나 — 건축물대장(총괄표제부·표제부)·공동주택 기본정보로 세대수·용적률·건폐율·준공·최고층… 채우기 (2026-11-05: 빌라도)
 *  하루 한도에 걸리면 저장하지 않고 null (다음에 다시)
 */
export async function fillInfo(r: InfoRow): Promise<ComplexInfo | null> {
  {
    const supabase = db();
    const { bun, ji, mountain } = splitJibun(r.jibun);
    const p: Parcel = {
      bcode: r.bcode, sigungu: r.bcode.slice(0, 5), bjdong: r.bcode.slice(5), dong: r.dong, mountain, bun, ji,
      pnu: `${r.bcode}${mountain ? "2" : "1"}${bun}${ji}`, jibunAddr: `${r.dong} ${r.jibun}`, roadAddr: "",
    };
    const [recap, titles, kapt] = await Promise.all([
      recapAt(p).catch(() => null),
      buildingsAt(p).catch(() => []),
      r.kind === "apt" ? kaptFor(p, r.name).catch(() => null) : Promise.resolve(null), // 공동주택 기본정보는 아파트만
    ]);
    const homes = titles.filter((b) => (r.kind === "offi" ? /오피스텔|업무/ : /아파트|공동주택/).test(`${b.purpose} ${b.etcPurpose}`));
    const floors = (homes.length ? homes : titles).map((b) => b.grndFlr || 0).filter(Boolean);
    const info: ComplexInfo = {
      // 오피스텔은 세대가 아니라 호수 (총괄표제부 hoCnt)
      //  총괄표제부가 없는 한 동짜리 오피스텔이 많다 → 표제부 호수를 더한다 (2026-11-09: 찾아본 오피스텔 1,506곳 중 187곳만 호수가 있었다)
      households: r.kind === "offi" ? recap?.units ?? (homes.reduce((t, b) => t + (b.units || 0), 0) || null) : kapt?.households ?? recap?.households ?? (homes.reduce((t, b) => t + (b.households || 0), 0) || null),
      dongs: kapt?.dongs ?? recap?.dongs ?? (homes.length || null),
      useAprDay: kapt?.useAprDay || recap?.useAprDay || titles[0]?.useAprDay || "",
      vlRat: recap?.vlRat || titles[0]?.vlRat || null,
      bcRat: recap?.bcRat || titles[0]?.bcRat || null,
      topFloor: kapt?.topFloor ?? (floors.length ? Math.max(...floors) : null),
      heating: kapt?.heating || "", hall: kapt?.hall || "",
      parking: kapt?.parking ?? recap?.parking ?? null,
      builder: kapt?.builder || "",
      baseFloor: kapt?.baseFloor ?? null, manage: kapt?.manage || "", saleType: kapt?.saleType || "",
      parkingGround: kapt?.parkingGround ?? null, elevators: kapt?.elevators ?? null, cctv: kapt?.cctv ?? null, evChargers: kapt?.evChargers ?? null,
      subway: kapt?.subway || "", subwayTime: kapt?.subwayTime || "", busTime: kapt?.busTime || "",
      school: kapt?.school || "", convenience: kapt?.convenience || "", welfare: kapt?.welfare || "",
      ...(kapt?.kaptCode ? { kaptCode: kapt.kaptCode } : {}),
    };
    if (hubLimited) return null; // 한도 — 빈 값으로 "찾아봄"을 남기지 않는다
    await supabase.from("apt_complexes").update({ info, info_tried_at: new Date().toISOString() }).eq("id", r.id);
    return info;
  }
}

/**
 * 단지 정보가 빈 곳 채우기 — 낮 크론(위치 채우기가 끝나 쉬는 때)이 조금씩 (2026-11-05 사장님: 단지 창 세대수·용적률 빈칸)
 *  공공데이터포털 하루 한도를 나눠 쓰려고 한 번에 perRun 곳까지. 거래 많은 단지부터. 한도에 걸리면 멈춤
 */
export async function infoRound(deadline: number, perRun = 25) {
  resetHubLimited(); // 어제 한도에 걸렸어도 오늘은 다시
  const supabase = db();
  // 아파트 먼저, 그다음 오피스텔, 빌라는 마지막 (2026-11-09 사장님: "세대수도 아직 다 가지고 온 것 같지 않음") — 예전엔 셋을 거래 많은 순으로 섞어 빌라가 끼어들었다
  let rows: InfoRow[] = [];
  for (const kind of ["apt", "offi", "villa"] as const) {
    const { data } = await supabase.from("apt_complexes")
      .select("id, kind, name, dong, jibun, bcode").eq("kind", kind).not("bcode", "is", null).not("lat", "is", null).is("info_tried_at", null)
      .order("trade_count", { ascending: false, nullsFirst: false }).limit(perRun - rows.length);
    rows = rows.concat((data || []) as InfoRow[]);
    if (rows.length >= perRun) break;
  }
  let done = 0;
  for (const r of rows) {
    if (Date.now() > deadline || hubLimited) break;
    if (await fillInfo(r)) done++;
  }
  return { done, limited: hubLimited };
}

/** 요약만 다시 (묶는 방식을 바꿨을 때) — 공공 API 는 부르지 않는다 */
export async function resummarize(lawd: string) {
  const supabase = db();
  const { data } = await supabase.from("apt_complexes").select("id, trades, supply_map, agent_supply").eq("lawd_cd", lawd);
  for (const r of data || []) {
    const supply = saneSupply(r.supply_map); // 예전에 저장한 값도 같은 기준으로 거른다
    await supabase.from("apt_complexes").update({ supply_map: supply, ...summarize(r.trades || [], withAgent(supply, r.agent_supply)) }).eq("id", r.id);
    await sleep(30); // 천천히 (Nano DB)
  }
  return { done: (data || []).length };
}
