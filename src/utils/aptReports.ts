/**
 * 시세 지도 단지 정보를 부동산이 보완 (2026-11-02 사장님: 전용·공급은 부동산이 가장 잘 안다)
 *  1. 공실등록 값 모으기 — 공실의 단지 번호(complex_id) + 전용·공급㎡ → apt_info_reports(source 'vacancy')
 *     · 공공 자료와 같으면 넘어간다 · 다르면 관리자 확인 · 공공 자료에 없으면 서로 다른 부동산 2곳 이상이 같은 값일 때 저절로 반영
 *  2. 단지 상세 창 [정보 수정 요청] — 승인된 부동산 회원만, 관리자가 승인하면 반영
 *  반영된 값: apt_complexes.agent_supply(공급면적, 공공 자료보다 우선) · agent_info(단지 정보)
 *  실거래 가격은 국토부 신고 자료라 고치지 않는다.
 */
import { db, summarize } from "@/utils/aptMap";
import type { Trade } from "@/utils/aptMapShared";

/** 고칠 수 있는 항목 — key 는 상세 창 info 칸 이름과 같다 */
/** perArea: 전용면적마다 따로 (agent_info[field] = { "87.89": 값 }) */
export const REPORT_FIELDS: Record<string, { label: string; numeric: boolean; perArea?: boolean }> = {
  supply: { label: "공급면적(㎡)", numeric: true },
  capture: { label: "캡처 요청", numeric: false }, // 이미지 + 요청 글 — 관리자가 보고 값을 넣는다
  contract: { label: "계약면적(㎡)", numeric: true, perArea: true }, // 오피스텔 — 공용 전체를 더한 값이라 공급면적과 따로 (11-02)
  rooms: { label: "방/욕실", numeric: false, perArea: true },
  useAprDay: { label: "사용승인일", numeric: false },
  vlRat: { label: "용적률(%)", numeric: true },
  bcRat: { label: "건폐율(%)", numeric: true },
  households: { label: "세대수(호수)", numeric: true },
  dongs: { label: "동수", numeric: true },
  topFloor: { label: "최고층", numeric: true },
  parking: { label: "주차대수", numeric: true },
  heating: { label: "난방", numeric: false },
  hall: { label: "구조(계단식·복도식)", numeric: false },
  builder: { label: "시공사", numeric: false },
};

const AREA_TOL = 0.6;      // 공실 전용㎡는 반올림해 넣는 경우가 많다
const SUPPLY_TOL = 1;      // 공급㎡ 1㎡ 안이면 같은 값

const sane = (ex: number, sup: number) => ex > 0 && sup / ex >= 1.05 && sup / ex <= 2;
const merged = (pub: Record<string, number> | null, agent: Record<string, number> | null) =>
  pub || agent ? { ...(pub || {}), ...(agent || {}) } : null;

/** 공실 전용㎡ → 단지 거래·대장에 있는 전용㎡ 키 (가장 가까운 것, 0.6㎡ 안) */
function areaKeyFor(ex: number, keys: string[]) {
  let best = "", gap = AREA_TOL;
  for (const k of keys) {
    const g = Math.abs(Number(k) - ex);
    if (g <= gap) { gap = g; best = k; }
  }
  return best;
}

type ComplexRow = { id: string; trades: Trade[]; supply_map: Record<string, number> | null; agent_supply: Record<string, number> | null; unit_map: Record<string, number> | null };

/** 반영된 공급면적을 넣고 지도 요약을 다시 계산 */
async function applySupply(c: ComplexRow, exKey: string, supply: number) {
  const agent = { ...(c.agent_supply || {}), [exKey]: Math.round(supply * 100) / 100 };
  await db().from("apt_complexes").update({ agent_supply: agent, ...summarize(c.trades || [], merged(c.supply_map, agent)) }).eq("id", c.id);
  c.agent_supply = agent;
}

/** 공실등록 값 모으기 — 시군구 하나 (크론 step=agents) */
export async function harvestVacancies(lawd: string) {
  const supabase = db();
  const { data: vacs, error } = await supabase.from("vacancies")
    .select("id, owner_id, complex_id, exclusive_m2, supply_m2")
    .or(`complex_id.like.${lawd}:*,complex_id.like.o:${lawd}:*`)
    .not("exclusive_m2", "is", null).not("supply_m2", "is", null)
    .limit(2000);
  if (error) throw new Error(`공실 읽기 오류: ${error.message}`);
  const list = (vacs || []).filter((v) => sane(Number(v.exclusive_m2), Number(v.supply_m2)));
  if (!list.length) return { vacancies: 0, same: 0, pending: 0, applied: 0 };

  const ids = [...new Set(list.map((v) => v.complex_id as string))];
  const { data: rows } = await supabase.from("apt_complexes").select("id, trades, supply_map, agent_supply, unit_map").in("id", ids);
  const complexes = new Map((rows || []).map((r) => [r.id as string, r as ComplexRow]));
  const { data: done } = await supabase.from("apt_info_reports").select("vacancy_id").in("vacancy_id", list.map((v) => v.id));
  const seen = new Set((done || []).map((r) => r.vacancy_id));

  let same = 0, pending = 0, applied = 0;
  for (const v of list) {
    if (seen.has(v.id)) continue;
    const c = complexes.get(v.complex_id);
    if (!c) continue;
    const ex = Number(v.exclusive_m2), sup = Number(v.supply_m2);
    const keys = [...new Set([...(c.trades || []).map((t) => t.a.toFixed(2)), ...Object.keys(c.unit_map || {}), ...Object.keys(c.supply_map || {})])];
    const exKey = areaKeyFor(ex, keys) || ex.toFixed(2); // 단지에 없는 면적이면 자동 심사가 반려한다 (11-02 아크로힐스논현 89.3㎡)
    const known = merged(c.supply_map, c.agent_supply)?.[exKey];
    if (known && Math.abs(known - sup) <= SUPPLY_TOL) { same++; continue; } // 이미 같은 값 — 기록하지 않는다
    const report = { complex_id: c.id, field: "supply", ex_area: Number(exKey), value: String(sup) };
    const { data: ins } = await supabase.from("apt_info_reports").insert({ ...report, source: "vacancy", member_id: v.owner_id, vacancy_id: v.id }).select("id").maybeSingle();
    if (!ins) continue;
    // 자동 심사 — 통과하면 바로 반영, 틀리면 반려, 애매하면 보류 (2026-11-02)
    const verdict = await reviewAndApply(ins.id, report);
    if (verdict.decision === "approve") applied++; else if (verdict.decision === "pending") pending++;
  }

  return { vacancies: list.length, same, pending, applied };
}

/* ── 자동 심사 (2026-11-02 사장님: 접수되면 자동으로 심의해서 올려 준다) ──
 *  숫자·글 요청은 여기서 규칙으로 바로 — approve(반영) · reject(반려) · pending(보류, 사람이나 클로드가 본다)
 *  캡처 요청은 pending — 사장님 PC 의 클로드가 1시간마다 읽어 심사한다 (scripts/apt-review)
 *  11-02 공실등록 값 18건 중 17건이 단지에 없는 면적·계약면적 혼동이었다 — 그 실수를 걸러내는 규칙 */
export type Verdict = { decision: "approve" | "reject" | "pending"; reason: string };
type ReviewComplex = ComplexRow & { kind?: string; info?: Record<string, unknown> | null; agent_info?: Record<string, unknown> | null };

const between = (v: number, lo: number, hi: number) => Number.isFinite(v) && v >= lo && v <= hi;
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

export async function autoReview(report: { complex_id: string; field: string; ex_area: number | null; value: string }, given?: ReviewComplex | null): Promise<Verdict> {
  const c = given || ((await db().from("apt_complexes").select("id, kind, trades, supply_map, agent_supply, unit_map, info, agent_info").eq("id", report.complex_id).maybeSingle()).data as ReviewComplex | null);
  if (!c) return { decision: "reject", reason: "지도에 없는 단지" };
  const def = REPORT_FIELDS[report.field];
  if (!def) return { decision: "reject", reason: "고칠 수 없는 항목" };
  if (report.field === "capture") return { decision: "pending", reason: "캡처 — 클로드 심사 기다림" };
  const raw = String(report.value || "").trim();
  const num = Number(raw.replace(/[^\d.]/g, ""));
  const offi = c.kind === "offi";

  // 전용면적마다 — 그 면적이 단지에 실제로 있어야 한다 (실거래·건축물대장)
  if (def.perArea || report.field === "supply") {
    const ex = Number(report.ex_area);
    const real = [...new Set([...(c.trades || []).map((t) => t.a.toFixed(2)), ...Object.keys(c.unit_map || {})])];
    const key = areaKeyFor(ex, real);
    if (!key) return { decision: "reject", reason: `이 단지에 전용 ${ex}㎡ 가 없음 (실거래·건축물대장)` };
    if (report.field === "rooms") {
      const m = raw.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
      return m && between(+m[1], 1, 8) && between(+m[2], 1, 5) ? { decision: "approve", reason: `전용 ${key}㎡ 방/욕실` } : { decision: "reject", reason: "방/욕실 형식이 아님 (예: 3/2)" };
    }
    const r = num / Number(key);
    if (report.field === "contract") {
      return between(r, 1.2, 2.6) ? { decision: "approve", reason: `계약/전용 ${r.toFixed(2)}배` } : { decision: "reject", reason: `계약/전용 ${r.toFixed(2)}배 — 계약면적 범위(1.2~2.6배) 밖` };
    }
    // 공급면적 — 아파트 1.12~1.5배, 오피스텔 1.12~1.7배. 넘으면 계약면적을 공급으로 넣은 것
    const hi = offi ? 1.7 : 1.5;
    if (r > hi) return { decision: "reject", reason: `공급/전용 ${r.toFixed(2)}배 — 계약면적으로 보임 (계약면적으로 보내 주세요)` };
    if (r < 1.12) return { decision: "reject", reason: `공급/전용 ${r.toFixed(2)}배 — 공급면적이라기엔 작음` };
    const pub = c.supply_map?.[key];
    if (pub && near(pub, num, 1)) return { decision: "approve", reason: `건축물대장 ${pub}㎡ 와 같음` };
    if (pub) return { decision: "pending", reason: `건축물대장 계산 ${pub}㎡ 와 다름 — 확인 필요` };
    return { decision: "approve", reason: `건축물대장 값 없음 · 공급/전용 ${r.toFixed(2)}배 정상` };
  }

  // 단지 전체 숫자 — 범위 + 공공 자료와 비교 (같거나 공공 자료가 없으면 반영, 다르면 보류)
  const pubInfo = (c.info || {}) as Record<string, unknown>;
  const pubNum = Number(pubInfo[report.field]);
  const RANGE: Record<string, [number, number]> = { households: [2, 20000], dongs: [1, 120], topFloor: [2, 120], parking: [1, 60000], vlRat: [10, 2000], bcRat: [5, 100] };
  if (RANGE[report.field]) {
    const [lo, hi] = RANGE[report.field];
    if (!between(num, lo, hi)) return { decision: "reject", reason: `${def.label} ${raw} — 있을 수 없는 값` };
    if (report.field === "parking" && Number(pubInfo.households) > 0 && !between(num / Number(pubInfo.households), 0.1, 6)) return { decision: "pending", reason: "세대당 주차가 이상함 — 확인 필요" };
    if (!(pubNum > 0)) return { decision: "approve", reason: "공공 자료 없음 · 범위 정상" };
    const tol = report.field === "vlRat" || report.field === "bcRat" ? 2 : Math.max(1, pubNum * 0.02);
    return near(num, pubNum, tol) ? { decision: "approve", reason: `공공 자료 ${pubNum} 와 같음` } : { decision: "pending", reason: `공공 자료 ${pubNum} 와 다름 — 확인 필요` };
  }
  if (report.field === "useAprDay") {
    const d = raw.replace(/\D/g, "");
    const y = Number(d.slice(0, 4)), mo = Number(d.slice(4, 6)), da = Number(d.slice(6, 8));
    if (d.length !== 8 || !between(y, 1960, new Date().getFullYear() + 3) || !between(mo, 1, 12) || !between(da, 1, 31)) return { decision: "reject", reason: "날짜 형식이 아님 (예: 20141208)" };
    const pub = String(pubInfo.useAprDay || "");
    return !pub || pub === d ? { decision: "approve", reason: pub ? "공공 자료와 같음" : "공공 자료 없음" } : { decision: "pending", reason: `공공 자료 ${pub} 와 다름 — 확인 필요` };
  }
  // 글 항목 (난방·구조·시공사)
  if (raw.length < 2 || raw.length > 40) return { decision: "reject", reason: "글이 너무 짧거나 김" };
  const pubText = String(pubInfo[report.field] || "").trim();
  if (!pubText || pubText.replace(/\s/g, "") === raw.replace(/\s/g, "")) return { decision: "approve", reason: pubText ? "공공 자료와 같음" : "공공 자료 없음" };
  return { decision: "pending", reason: `공공 자료 "${pubText}" 와 다름 — 확인 필요` };
}

/** 심사하고 결과대로 처리 — approve 면 바로 반영 */
export async function reviewAndApply(reportId: number, report: { complex_id: string; field: string; ex_area: number | null; value: string }, given?: ReviewComplex | null) {
  const verdict = await autoReview(report, given);
  const supabase = db();
  if (verdict.decision === "approve") {
    try { await applyReport(report); } catch (e) { verdict.decision = "pending"; verdict.reason = `반영 중 오류: ${e instanceof Error ? e.message : e}`; }
  }
  await supabase.from("apt_info_reports").update({
    status: verdict.decision === "pending" ? "pending" : verdict.decision === "approve" ? "approved" : "rejected",
    note: `자동 심사: ${verdict.reason}`,
    ...(verdict.decision === "pending" ? {} : { decided_at: new Date().toISOString() }),
  }).eq("id", reportId);
  return verdict;
}

/** 관리자 승인 — 값을 단지에 반영 */
export async function applyReport(report: { complex_id: string; field: string; ex_area: number | null; value: string }) {
  const supabase = db();
  const { data: c } = await supabase.from("apt_complexes").select("id, trades, supply_map, agent_supply, unit_map, agent_info").eq("id", report.complex_id).maybeSingle();
  if (!c) throw new Error("단지를 찾지 못했습니다.");
  const def = REPORT_FIELDS[report.field];
  if (!def) throw new Error("고칠 수 없는 항목입니다.");
  if (report.field === "supply") {
    const sup = Number(report.value), ex = Number(report.ex_area);
    if (!sane(ex, sup)) throw new Error("공급면적이 전용면적의 1.05~2배 밖입니다. 값을 확인해 주세요.");
    const keys = [...new Set([...(c.trades || []).map((t: Trade) => t.a.toFixed(2)), ...Object.keys(c.unit_map || {}), ...Object.keys(c.supply_map || {})])];
    await applySupply(c as ComplexRow, areaKeyFor(ex, keys) || ex.toFixed(2), sup);
    return;
  }
  const value = def.numeric ? Number(String(report.value).replace(/[^\d.]/g, "")) : String(report.value).trim();
  if (def.numeric && !(Number(value) > 0)) throw new Error("숫자로 넣어 주세요.");
  if (def.perArea) {
    const ex = Number(report.ex_area);
    if (!(ex > 0)) throw new Error("어느 전용면적인지 없습니다.");
    if (report.field === "contract" && !(Number(value) / ex >= 1.05 && Number(value) / ex <= 3)) throw new Error("계약면적이 전용면적의 1.05~3배 밖입니다. 값을 확인해 주세요.");
    const keys = [...new Set([...(c.trades || []).map((t: Trade) => t.a.toFixed(2)), ...Object.keys(c.unit_map || {}), ...Object.keys(c.supply_map || {})])];
    const key = areaKeyFor(ex, keys) || ex.toFixed(2);
    const map = { ...((c.agent_info || {})[report.field] || {}), [key]: value };
    await supabase.from("apt_complexes").update({ agent_info: { ...(c.agent_info || {}), [report.field]: map } }).eq("id", c.id);
    return;
  }
  await supabase.from("apt_complexes").update({ agent_info: { ...(c.agent_info || {}), [report.field]: value } }).eq("id", c.id);
}
