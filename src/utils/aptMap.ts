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
import { buildingsAt, kaptFor, recapAt, type Parcel } from "@/utils/publicLand";
import { LAWD_NAMES, areaLabel, supplyFor, type AreaSummary, type Rent, type Trade } from "@/utils/aptMapShared";

export { LAWD_NAMES, areaLabel, supplyFor };
export type { AreaSummary, Rent, Trade };

const MONTHS = 36;
const RENT_KEEP = 100; // 전월세는 많다 — 단지마다 최근 100건만 (11-02 400건으로 넣다 DB 가 멈춤)
const WRITE_BATCH = 10; // 한 번에 10곳씩, 사이에 쉬면서 (Nano DB 보호)
const FP_VERSION = "v2"; // 저장 모양을 바꾸면 올린다 — 다음 갱신 때 모든 단지를 한 번 다시 쓴다

/** 아파트 · 오피스텔 — 국토부 창구와 이름 칸이 다르다 */
export type Kind = "apt" | "offi";
const KIND = {
  apt: { service: "Apt", nameTag: "aptNm", idPrefix: "" },
  offi: { service: "Offi", nameTag: "offiNm", idPrefix: "o:" },
} as const;


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
  const svc = `${KIND[kind].service}${service}`;
  const items: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://apis.data.go.kr/1613000/RTMSDataSvc${svc}/getRTMSDataSvc${svc}?serviceKey=${dataKey()}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
    let xml = "";
    for (let tryNo = 0; tryNo < 6; tryNo++) { // 초당 한도는 몇 초 쉬면 풀린다 — 넉넉히 다시
      xml = await fetch(url, { cache: "no-store" }).then((r) => r.text()).catch(() => "");
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

/** 여러 달을 몇 개씩만 동시에 (공공데이터 초당 한도) */
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

export async function syncTrades(lawd: string, kind: Kind = "apt") {
  const months = recentMonths(MONTHS);
  const k = KIND[kind];
  const head = (it: string) => ({ name: tag(it, k.nameTag), dong: tag(it, "umdNm"), jibun: tag(it, "jibun"), buildYear: num(tag(it, "buildYear")) });
  const sales = (await inBatches(months, 2, (ym) => monthItems(kind, "Trade", lawd, ym)))
    .filter((it) => tag(it, "cdealType") !== "O") // 해제된 거래 빼기
    .map((it) => ({ ...head(it), t: { a: num(tag(it, "excluUseAr")), p: num(tag(it, "dealAmount")), d: date(it), f: num(tag(it, "floor")) } as Trade }))
    .filter((x) => x.name && x.dong && x.jibun && x.t.p > 0 && x.t.a > 0);
  const rents = (await inBatches(months, 2, (ym) => monthItems(kind, "Rent", lawd, ym)))
    .map((it) => ({ ...head(it), r: { a: num(tag(it, "excluUseAr")), dep: num(tag(it, "deposit")), m: num(tag(it, "monthlyRent")), d: date(it), f: num(tag(it, "floor")) } as Rent }))
    .filter((x) => x.name && x.dong && x.jibun && x.r.dep > 0 && x.r.a > 0);

  type G = { name: string; dong: string; jibun: string; buildYear: number; trades: Trade[]; rents: Rent[] };
  const byId = new Map<string, G>();
  const group = (x: ReturnType<typeof head>) => {
    const id = `${k.idPrefix}${lawd}:${x.dong}:${x.jibun}`;
    const g = byId.get(id) || { name: x.name, dong: x.dong, jibun: x.jibun, buildYear: x.buildYear, trades: [], rents: [] };
    byId.set(id, g);
    return g;
  };
  for (const x of sales) group(x).trades.push(x.t);
  for (const x of rents) group(x).rents.push(x.r);

  const supabase = db();
  const { data: old, error } = await supabase.from("apt_complexes").select("id, supply_map, agent_supply, fp").eq("lawd_cd", lawd).eq("kind", kind);
  if (error) throw new Error(`DB 읽기 오류: ${error.message}`);
  const oldById = new Map((old || []).map((r) => [r.id as string, r as { supply_map: Record<string, number> | null; agent_supply: Record<string, number> | null; fp: string | null }]));

  const rows = [...byId.entries()].flatMap(([id, g]) => {
    const trades = byDateDesc(g.trades), kept = byDateDesc(g.rents).slice(0, RENT_KEEP);
    const fp = fingerprint(trades, kept);
    if (oldById.get(id)?.fp === fp) return []; // 바뀐 것 없음
    return [{
      id, kind, lawd_cd: lawd, dong: g.dong, jibun: g.jibun, name: g.name, build_year: g.buildYear || null,
      trades, rents: kept, fp, ...summarize(trades, withAgent(oldById.get(id)?.supply_map, oldById.get(id)?.agent_supply)), updated_at: new Date().toISOString(),
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
  return { kind, complexes: byId.size, written: rows.length, sales: sales.length, rents: rents.length, emptied: gone.length };
}

/* ── 2. 위치 ── */
export async function syncGeo(lawd: string, deadline: number) {
  const prefix = LAWD_NAMES[lawd];
  if (!prefix) throw new Error(`주소 이름이 없는 시군구 코드입니다: ${lawd} (src/utils/aptMap.ts LAWD_NAMES)`);
  const supabase = db();
  const { data } = await supabase.from("apt_complexes").select("id, dong, jibun").eq("lawd_cd", lawd).is("geo_tried_at", null).limit(500);
  let found = 0, missed = 0;
  for (const r of data || []) {
    if (Date.now() > deadline) break;
    const q = `${prefix} ${r.dong} ${r.jibun}`;
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=1`, {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, cache: "no-store",
    }).then((x) => x.json()).catch(() => null);
    const doc = res?.documents?.[0];
    const bcode = String(doc?.address?.b_code || "");
    const patch = doc && bcode.length === 10
      ? { lat: Number(doc.y), lng: Number(doc.x), bcode, geo_tried_at: new Date().toISOString() }
      : { geo_tried_at: new Date().toISOString() };
    if ("lat" in patch) found++; else missed++;
    await supabase.from("apt_complexes").update(patch).eq("id", r.id);
  }
  return { found, missed };
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
  for (let tryNo = 0; tryNo < 3; tryNo++) {
    const txt = await fetch(url, { cache: "no-store" }).then((r) => r.text()).catch(() => "");
    if (!txt || /LIMITED_NUMBER|HTTP_ERROR/.test(txt)) { await sleep(500 * (tryNo + 1)); continue; }
    try {
      const body = JSON.parse(txt)?.response?.body;
      const it = body?.items?.item;
      return { rows: (Array.isArray(it) ? it : it ? [it] : []) as Record<string, unknown>[], total: num(body?.totalCount) };
    } catch {
      // 한도를 넘으면 XML 오류가 온다 — 이번 실행은 여기서 멈춘다 (다음 실행에 이어서)
      if (/SERVICE_KEY|LIMIT|EXCEEDS/i.test(txt)) throw new Error("건축물대장 하루 호출 한도를 넘었습니다.");
      return { rows: [], total: 0 };
    }
  }
  return { rows: [], total: 0 };
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
export async function supplyMapFor(bcode: string, jibun: string) {
  const units = new Map<string, { ex: number; common: number }>();
  for (let page = 1; page <= 60; page++) { // 5천 세대 단지는 4~5만 줄
    const { rows, total } = await hubPage(bcode, jibun, page);
    for (const r of rows) {
      const key = `${r.dongNm}|${r.hoNm}`;
      const u = units.get(key) || { ex: 0, common: 0 };
      const area = Number(r.area) || 0;
      if (String(r.exposPubuseGbCdNm).trim() === "전유") u.ex += area;
      else if (isResidentialCommon(r)) u.common += area;
      units.set(key, u);
    }
    if (page * 1000 >= total || !rows.length) break;
  }
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

/** 세대수(unit_map)가 아직 없는 단지 — 못 찾으면 {} 를 넣어 다시 부르지 않는다 */
export async function syncSupply(lawd: string, deadline: number) {
  const supabase = db();
  const { data } = await supabase.from("apt_complexes")
    .select("id, bcode, jibun, trades, agent_supply").eq("lawd_cd", lawd).not("bcode", "is", null).is("unit_map", null) // 오피스텔도 같은 기준 (2026-11-02 사장님: 공급면적)
    .order("trade_count", { ascending: false }).limit(400);
  let done = 0, found = 0;
  for (const r of (data || []) as { id: string; bcode: string; jibun: string; trades: Trade[]; agent_supply: Record<string, number> | null }[]) {
    if (Date.now() > deadline) break;
    const { supply, households } = await supplyMapFor(r.bcode, r.jibun);
    await supabase.from("apt_complexes")
      .update({ supply_map: supply, unit_map: households, supply_tried_at: new Date().toISOString(), ...summarize(r.trades || [], withAgent(supply, r.agent_supply)) })
      .eq("id", r.id);
    done++;
    if (supply) found++;
  }
  return { done, found };
}

/* ── 4. 단지 정보 ── */
export type ComplexInfo = {
  households: number | null; dongs: number | null; useAprDay: string; vlRat: number | null; bcRat: number | null;
  topFloor: number | null; heating: string; hall: string; parking: number | null; builder: string;
  // 공동주택 기본·상세정보 (의무관리 단지만 — 대략 150세대 이상)
  baseFloor: number | null; manage: string; saleType: string; parkingGround: number | null; elevators: number | null;
  cctv: number | null; evChargers: number | null; subway: string; subwayTime: string; busTime: string;
  school: string; convenience: string; welfare: string;
};

export async function syncInfo(lawd: string, deadline: number) {
  const supabase = db();
  const { data } = await supabase.from("apt_complexes")
    .select("id, kind, name, dong, jibun, bcode").eq("lawd_cd", lawd).not("bcode", "is", null).is("info_tried_at", null)
    .order("trade_count", { ascending: false }).limit(400);
  let done = 0;
  for (const r of (data || []) as { id: string; kind: Kind; name: string; dong: string; jibun: string; bcode: string }[]) {
    if (Date.now() > deadline) break;
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
      households: r.kind === "offi" ? recap?.units ?? null : kapt?.households ?? recap?.households ?? (homes.reduce((t, b) => t + (b.households || 0), 0) || null),
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
    };
    await supabase.from("apt_complexes").update({ info, info_tried_at: new Date().toISOString() }).eq("id", r.id);
    done++;
  }
  return { done };
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
