/* 분양 단지 — 청약홈(한국부동산원) 공공데이터 받아 정리 (2026-11-26 사장님: 신축/분양 지도에 분양 정보)
   표: presale_complexes (supabase/migrations/20261126_presale_complexes.sql)
   받는 곳: api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1 — 키 DATA_GO_KR_API_KEY
   - apt  아파트 분양 (Detail · Mdl)
   - ofc  오피스텔 · 도시형생활주택 · 생활숙박시설 · 민간임대 (UrbtyOfctl)
   - rem  무순위 · 잔여세대 (Remndr)
   값은 청약홈 글자 그대로, 없는 칸은 빈칸 (가짜 값 금지) */

const BASE = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1";

export type PresaleKind = "apt" | "ofc" | "rem";
export type PresaleType = { type: string; area: number | null; supply_area: number | null; units: number | null; price: number | null };
export type PresaleRow = {
  id: string; kind: PresaleKind; house_manage_no: string; pblanc_no: string;
  name: string; address: string | null; sido: string | null; house_type: string | null; supply_kind: string | null;
  total_units: number | null; notice_date: string | null;
  special_start: string | null; special_end: string | null; rank1_date: string | null; rank2_date: string | null;
  receipt_start: string | null; receipt_end: string | null; winner_date: string | null;
  contract_start: string | null; contract_end: string | null; move_in_ym: string | null;
  builder: string | null; developer: string | null; notice_url: string | null; homepage: string | null; phone: string | null;
  types: PresaleType[]; raw: Record<string, unknown>; updated_at: string;
};

const EP: Record<PresaleKind, { detail: string; model: string }> = {
  apt: { detail: "getAPTLttotPblancDetail", model: "getAPTLttotPblancMdl" },
  ofc: { detail: "getUrbtyOfctlLttotPblancDetail", model: "getUrbtyOfctlLttotPblancMdl" },
  rem: { detail: "getRemndrLttotPblancDetail", model: "getRemndrLttotPblancMdl" },
};

type Raw = Record<string, any>;

async function page(ep: string, key: string, cond: Record<string, string>, pageNo: number, perPage = 500): Promise<{ data: Raw[]; matchCount: number }> {
  const u = new URL(`${BASE}/${ep}`);
  u.searchParams.set("page", String(pageNo));
  u.searchParams.set("perPage", String(perPage));
  for (const [k, v] of Object.entries(cond)) u.searchParams.set(k, v);
  u.searchParams.set("serviceKey", key);
  const r = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`청약홈 ${ep} ${r.status}`);
  const j = await r.json();
  return { data: Array.isArray(j?.data) ? j.data : [], matchCount: Number(j?.matchCount || 0) };
}

async function all(ep: string, key: string, cond: Record<string, string>) {
  const out: Raw[] = [];
  for (let p = 1; p <= 40; p++) {
    const { data, matchCount } = await page(ep, key, cond, p);
    out.push(...data);
    if (!data.length || out.length >= matchCount) break;
  }
  return out;
}

const s = (v: unknown) => { const t = String(v ?? "").trim(); return t && t !== "-" ? t : null; };
const d = (v: unknown) => { const t = s(v); return t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null; };
const n = (v: unknown) => { const t = s(v); if (!t) return null; const x = Number(t.replace(/,/g, "")); return Number.isFinite(x) ? x : null; };
const minD = (...xs: (string | null)[]) => xs.filter(Boolean).sort()[0] || null;
const maxD = (...xs: (string | null)[]) => xs.filter(Boolean).sort().slice(-1)[0] || null;

/** "084.9076A" → { area: 84.9076, label: "84A" } */
function aptType(t: unknown) {
  const v = s(t) || "";
  const m = v.match(/^0*(\d+)(?:\.(\d+))?([A-Za-z]*)/);
  if (!m) return { area: null, label: v };
  const area = Number(`${m[1]}.${m[2] || 0}`);
  return { area, label: `${Number(m[1])}${m[3] || ""}` };
}

function typeOf(kind: PresaleKind, m: Raw): PresaleType {
  if (kind === "ofc") {
    const area = n(m.EXCLUSE_AR);
    return { type: s(m.TP) || (area ? `${Math.round(area)}` : ""), area, supply_area: null, units: n(m.SUPLY_HSHLDCO), price: n(m.SUPLY_AMOUNT) };
  }
  const t = aptType(m.HOUSE_TY);
  return { type: t.label, area: t.area, supply_area: n(m.SUPLY_AR), units: n(m.SUPLY_HSHLDCO), price: n(m.LTTOT_TOP_AMOUNT) };
}

function rowOf(kind: PresaleKind, r: Raw, models: Raw[], now: string): PresaleRow {
  const special_start = d(r.SPSPLY_RCEPT_BGNDE), special_end = d(r.SPSPLY_RCEPT_ENDDE);
  const rank1 = d(r.GNRL_RNK1_CRSPAREA_RCPTDE) || d(r.GNRL_RCEPT_BGNDE);
  const rank2 = d(r.GNRL_RNK2_CRSPAREA_RCPTDE);
  const subStart = d(r.SUBSCRPT_RCEPT_BGNDE) || d(r.RCEPT_BGNDE), subEnd = d(r.SUBSCRPT_RCEPT_ENDDE) || d(r.RCEPT_ENDDE);
  const address = s(r.HSSPLY_ADRES);
  return {
    id: `${kind}:${s(r.HOUSE_MANAGE_NO)}:${s(r.PBLANC_NO)}`,
    kind,
    house_manage_no: s(r.HOUSE_MANAGE_NO) || "",
    pblanc_no: s(r.PBLANC_NO) || "",
    name: s(r.HOUSE_NM) || "",
    address,
    sido: address ? address.split(/\s+/)[0] : null,
    house_type: kind === "ofc" ? s(r.HOUSE_DTL_SECD_NM) : kind === "rem" ? "무순위" : "아파트",
    supply_kind: kind === "apt" ? s(r.HOUSE_DTL_SECD_NM) : null,
    total_units: n(r.TOT_SUPLY_HSHLDCO),
    notice_date: d(r.RCRIT_PBLANC_DE),
    special_start, special_end,
    rank1_date: rank1, rank2_date: rank2,
    receipt_start: minD(special_start, rank1, subStart),
    receipt_end: maxD(special_end, rank1, d(r.GNRL_RNK2_CRSPAREA_ENDDE) || rank2, d(r.GNRL_RCEPT_ENDDE), subEnd),
    winner_date: d(r.PRZWNER_PRESNATN_DE),
    contract_start: d(r.CNTRCT_CNCLS_BGNDE), contract_end: d(r.CNTRCT_CNCLS_ENDDE),
    move_in_ym: s(r.MVN_PREARNGE_YM),
    builder: s(r.CNSTRCT_ENTRPS_NM),
    developer: s(r.BSNS_MBY_NM),
    notice_url: s(r.PBLANC_URL),
    homepage: s(r.HMPG_ADRES),
    phone: s(r.MDHS_TELNO),
    types: models.map((m) => typeOf(kind, m)).filter((t) => t.type),
    raw: r,
    updated_at: now,
  };
}

/** 모집공고일이 since(YYYY-MM-DD) 이후인 분양을 종류마다 받아 표 모양으로 */
export async function fetchPresales(key: string, since: string): Promise<PresaleRow[]> {
  const now = new Date().toISOString();
  const out: PresaleRow[] = [];
  for (const kind of Object.keys(EP) as PresaleKind[]) {
    const cond = { "cond[RCRIT_PBLANC_DE::GTE]": since };
    const details = await all(EP[kind].detail, key, cond);
    if (!details.length) continue;
    // 평형은 공고번호마다 — 같은 기간 것을 한 번에 받아 묶는다 (평형 표에는 공고일이 없어 공고번호 범위로)
    const nos = details.map((r) => String(r.HOUSE_MANAGE_NO || "")).filter(Boolean).sort();
    const models = await all(EP[kind].model, key, { "cond[HOUSE_MANAGE_NO::GTE]": nos[0], "cond[HOUSE_MANAGE_NO::LTE]": nos[nos.length - 1] });
    const byNo = new Map<string, Raw[]>();
    for (const m of models) {
      const k = `${m.HOUSE_MANAGE_NO}:${m.PBLANC_NO}`;
      if (!byNo.has(k)) byNo.set(k, []);
      byNo.get(k)!.push(m);
    }
    for (const r of details) {
      const row = rowOf(kind, r, (byNo.get(`${r.HOUSE_MANAGE_NO}:${r.PBLANC_NO}`) || []).sort((a, b) => String(a.MODEL_NO).localeCompare(String(b.MODEL_NO))), now);
      if (row.house_manage_no && row.name) out.push(row);
    }
  }
  return out;
}

/** 주소 → 카카오 검색에 넣기 좋게 ("135번지 일원(장성지구 A2블럭)" → "135") */
export function cleanPresaleAddress(a: string) {
  return a
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/(번지)?\s*(일원|일대|외\s*\d*\s*필지|외).*$/, "")
    .replace(/번지/g, "")
    .replace(/\s*,.*$/, "") // "1294, 1294-1" → 첫 번지
    .replace(/\s+/g, " ")
    .trim();
}

/* ── 좌표 (카카오) — 번지까지 맞는 주소만, 안 되면 단지 이름으로 (견본주택·홍보관은 빼고 같은 시군구만). 동네 가운데로 찍는 추측은 안 한다 ── */
type KDoc = { address_name: string; address_type?: string; place_name?: string; category_name?: string; x: string; y: string };
async function kakao(path: string, query: string): Promise<{ docs: KDoc[] } | "limited" | null> {
  const r = await fetch(`https://dapi.kakao.com/v2/local/search/${path}.json?query=${encodeURIComponent(query)}&size=10`, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, cache: "no-store",
  }).then((x) => x.json()).catch(() => null);
  if (!r) return null;
  if (!Array.isArray(r.documents)) return /limit/i.test(String(r.message || r.msg || "")) ? "limited" : null;
  return { docs: r.documents };
}
const bareName = (v: string) => v.replace(/\s|아파트|오피스텔|\(.*?\)|\d+블록|\d+BL|[A-Z]\d*블럭/gi, "").toLowerCase();

export async function geocodePresale(row: { name: string; address: string | null }): Promise<{ lat: number; lng: number } | "limited" | null> {
  // 주소 후보 — 바깥 글자, 그리고 괄호·대괄호 안에 진짜 주소가 적힌 경우 ("…3블록(경기도 파주시 동패동 400-7번지 일원)")
  const raw = row.address || "";
  const inner = [...raw.matchAll(/[(\[]([^)\]]*)[)\]]/g)].map((m) => m[1]).filter((t) => /\d/.test(t) && /(동|리|가|로|길)\s*\d/.test(t));
  const cands = [...new Set([cleanPresaleAddress(raw), ...inner.map(cleanPresaleAddress)].filter((x) => x && /\d/.test(x)))];
  for (const addr of cands) {
    const a = await kakao("address", addr);
    if (a === "limited") return a;
    const doc = a?.docs.find((x) => x.address_type === "REGION_ADDR" || x.address_type === "ROAD_ADDR");
    if (doc) return { lat: Number(doc.y), lng: Number(doc.x) };
  }
  // 이름으로 — 시군구까지 같은 주거시설·건설현장만
  const parts = (row.address || "").split(/\s+/);
  const prefix = parts.slice(0, 2).join(" ");
  const sigungu = (parts[1] || "").trim();
  const want = bareName(row.name);
  if (want.length < 3) return null;
  const k = await kakao("keyword", `${prefix} ${row.name}`);
  if (k === "limited") return k;
  const doc = k?.docs.find((x) => {
    if (/견본주택|모델하우스|홍보관|분양사무소|분양관/.test(`${x.place_name} ${x.category_name}`)) return false;
    if (sigungu && !x.address_name.includes(sigungu)) return false;
    if (!/주거시설|건설|아파트/.test(String(x.category_name || ""))) return false;
    const got = bareName(String(x.place_name || ""));
    return got.length >= 3 && (got.includes(want) || want.includes(got));
  });
  return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null;
}

/** 하루 한 번 — 최근 공고를 받아 표에 넣고(좌표는 그대로 둠), 좌표 없는 것을 찾는다 */
export async function syncPresales(supabase: import("@supabase/supabase-js").SupabaseClient, deadline: number) {
  const key = process.env.DATA_GO_KR_API_KEY;
  if (!key) throw new Error("DATA_GO_KR_API_KEY 가 없습니다.");
  // 3개월 남겨 두는 단지 + 지금 진행 중인 것까지 — 모집공고일 기준 6개월 전부터
  const since = new Date(Date.now() - 183 * 86400000).toISOString().slice(0, 10);
  const rows = await fetchPresales(key, since);
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from("presale_complexes").upsert(rows.slice(i, i + 200), { onConflict: "id" });
    if (error) throw new Error(`분양 저장 실패: ${error.message}`);
  }
  const { data: todo } = await supabase.from("presale_complexes").select("id, name, address").is("geo_tried_at", null).limit(400);
  let found = 0, missed = 0, limited = false;
  for (const r of todo || []) {
    if (Date.now() > deadline) break;
    const g = await geocodePresale(r);
    if (g === "limited") { limited = true; break; } // 카카오 하루 한도 — "못 찾음"으로 적지 않고 다음에
    await supabase.from("presale_complexes").update(g ? { lat: g.lat, lng: g.lng, geo_tried_at: new Date().toISOString() } : { geo_tried_at: new Date().toISOString() }).eq("id", r.id);
    if (g) found++; else missed++;
  }
  return { fetched: rows.length, found, missed, ...(limited ? { limited } : {}) };
}

/** 지도 표시용 대표 평형 — 가장 많이 공급하는 평형(같으면 84㎡에 가까운 것) */
export function repType<T extends { area: number | null; units: number | null; price: number | null }>(types: T[]): T | null {
  const ok = (types || []).filter((t) => t.price && t.area);
  if (!ok.length) return null;
  return [...ok].sort((a, b) => (b.units || 0) - (a.units || 0) || Math.abs((a.area || 0) - 84) - Math.abs((b.area || 0) - 84))[0];
}
