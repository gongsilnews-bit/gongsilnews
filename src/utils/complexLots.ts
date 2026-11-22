// 공실·기사 → 단지 (2026-11-22 사장님 원칙: "주소에 맞게 단지에 보여야 한다", 큰 단지는 번지 여러 개를 다 한 단지로)
//
// 규칙은 하나 — 번지가 그 단지의 번지 목록 안에 있으면 그 단지. 거리·이름으로 짐작하지 않는다.
//  - 단지 번지 목록 = 대표 번지(apt_complexes.jibun) + 건축물대장 부속지번(complex_lots 에 저장)
//  - 부속지번은 단지마다 한 번만 건축물대장에서 받아 둔다(apt_complexes.lots_tried_at). 필요한 단지만 — 전국을 한꺼번에 묻지 않는다
//  - 공실: 등록·수정 때 좌표의 번지로 단지를 정해 vacancies.complex_id 에 저장 (앱·웹 같은 함수 createVacancy·updateVacancy)
//  - 기사: 좌표의 번지(articles.loc_lot, utils/articleLot.ts)를 이 목록과 견준다 (api/apt-prices)
// complex_lots 표가 아직 없으면(SQL 실행 전) 대표 번지만으로 맞춘다 — supabase/migrations/20261122_complex_lots.sql
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachedLotsAt, hubLimited, parcelAt, type Parcel } from "./publicLand";

export type CxKind = "apt" | "offi";
type Cx = { id: string; kind: string; bcode: string | null; lawd_cd: string; dong: string; jibun: string; lat?: number | null; lng?: number | null };

/** 번지 글자 — 단지 자료와 같은 모양 ("276-1", "481", "산52-6") */
export const jibunText = (mountain: boolean, bun: number, ji: number) => `${mountain ? "산" : ""}${bun}${ji ? `-${ji}` : ""}`;

/** 표가 없을 때(SQL 실행 전) 오류 — 이때는 대표 번지만 쓴다 */
const noTable = (e: { message?: string; code?: string } | null) => !!e && (e.code === "42P01" || e.code === "42703" || e.code === "PGRST205" || /complex_lots|lots_tried_at/.test(e.message || ""));

/** 공실 종류 → 견줄 단지 종류. 아파트·오피스텔 공실만 (웹 지도와 같은 구분), 경매는 따로 맞추므로 뺀다 */
export function kindsOfVacancy(v: { property_type?: string | null; sub_category?: string | null; trade_type?: string | null }): CxKind[] {
  if (v.trade_type === "경매" || !/아파트|오피스텔/.test(String(v.property_type || ""))) return [];
  const sub = String(v.sub_category || "").trim();
  if (!sub) return ["apt", "offi"];
  return sub === "아파트" ? ["apt"] : sub === "오피스텔" ? ["offi"] : [];
}

/** 단지 하나의 부속지번을 건축물대장에서 받아 complex_lots 에 둔다 (한 번만). 표가 없으면 false */
export async function fillLots(sb: SupabaseClient, c: Cx): Promise<boolean> {
  const m = /^(산)?(\d+)(?:-(\d+))?$/.exec(c.jibun || "");
  if (!m || !c.bcode || c.bcode.length !== 10) return true;
  const p = { sigungu: c.bcode.slice(0, 5), bjdong: c.bcode.slice(5), mountain: !!m[1], bun: m[2].padStart(4, "0"), ji: (m[3] || "0").padStart(4, "0") } as Parcel;
  let lots: Awaited<ReturnType<typeof attachedLotsAt>>;
  try { lots = await attachedLotsAt(p); } catch { return true; } // 한도·연결 오류 — 다음에 다시
  const rows = lots.map((l) => ({ complex_id: c.id, lawd_cd: c.lawd_cd, dong: c.dong, jibun: jibunText(l.mountain, l.bun, l.ji) })).filter((r) => r.jibun !== c.jibun);
  if (rows.length) {
    const { error } = await sb.from("complex_lots").upsert(rows, { onConflict: "lawd_cd,dong,jibun,complex_id", ignoreDuplicates: true });
    if (noTable(error)) return false;
    if (error) return true;
  }
  if (!hubLimited) {
    const { error } = await sb.from("apt_complexes").update({ lots_tried_at: new Date().toISOString() }).eq("id", c.id);
    if (noTable(error)) return false;
  }
  return true;
}

/** 이 자리 둘레(약 400m) 단지 중 부속지번을 아직 안 받은 곳을 몇 개 받아 둔다 — 어느 단지의 딸린 번지인지 알려고 */
export async function fillAround(sb: SupabaseClient, lat: number, lng: number, kinds: CxKind[], lawd?: string, max = 5) {
  const d = 0.004;
  let q = sb.from("apt_complexes").select("id, kind, bcode, lawd_cd, dong, jibun, lat, lng")
    .gte("lat", lat - d).lte("lat", lat + d).gte("lng", lng - d * 1.25).lte("lng", lng + d * 1.25)
    .in("kind", kinds).is("lots_tried_at", null).not("bcode", "is", null).limit(40);
  if (lawd) q = q.eq("lawd_cd", lawd);
  const { data, error } = await q;
  if (error) return;
  const dist = (c: Cx) => Math.hypot((Number(c.lat) - lat) * 111_000, (Number(c.lng) - lng) * 88_000);
  const near = ((data || []) as Cx[]).sort((a, b) => dist(a) - dist(b)).slice(0, max);
  for (const c of near) { if (hubLimited || !(await fillLots(sb, c))) break; }
}

/** 번지 → 단지 아이디. 대표 번지 먼저, 다음 부속지번. 없으면 null */
async function complexOfLot(sb: SupabaseClient, lot: { lawd: string; dong: string; jibun: string }, kinds: CxKind[]) {
  const pick = (rows: { id: string; kind: string }[]) => kinds.map((k) => rows.find((r) => r.kind === k)).find(Boolean)?.id || null;
  const { data: rep } = await sb.from("apt_complexes").select("id, kind")
    .eq("lawd_cd", lot.lawd).eq("dong", lot.dong).eq("jibun", lot.jibun).in("kind", kinds).limit(10);
  const a = pick((rep || []) as { id: string; kind: string }[]);
  if (a) return a;
  const { data: ex, error } = await sb.from("complex_lots").select("complex_id")
    .eq("lawd_cd", lot.lawd).eq("dong", lot.dong).eq("jibun", lot.jibun).limit(10);
  if (error || !ex?.length) return null;
  const { data: cx } = await sb.from("apt_complexes").select("id, kind").in("id", ex.map((r) => r.complex_id)).in("kind", kinds);
  return pick((cx || []) as { id: string; kind: string }[]);
}

/** 좌표 → 단지 아이디. null = 단지 밖, undefined = 번지를 못 구함(카카오 오류 등 — 저장된 값을 건드리지 않는다) */
export async function complexAt(sb: SupabaseClient, lat: number, lng: number, kinds: CxKind[]): Promise<string | null | undefined> {
  if (!kinds.length || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const p = await parcelAt(lat, lng).catch(() => null);
  if (!p) return undefined;
  const lot = { lawd: p.sigungu, dong: p.dong, jibun: jibunText(p.mountain, Number(p.bun), Number(p.ji)) };
  const hit = await complexOfLot(sb, lot, kinds);
  if (hit) return hit;
  // 대표 번지가 아니면 — 둘레 단지의 딸린 번지를 받아 본 뒤 한 번 더
  await fillAround(sb, lat, lng, kinds, lot.lawd);
  return complexOfLot(sb, lot, kinds);
}

/** 공실 하나의 단지 번호를 정해 저장한다 (등록·수정 뒤). 등록 화면이 준 단지 번호가 실제 단지이고 종류가 맞으면 그대로 둔다 */
export async function linkVacancyComplex(sb: SupabaseClient, vacancyId: string) {
  const { data: v } = await sb.from("vacancies").select("id, property_type, sub_category, trade_type, lat, lng, complex_id").eq("id", vacancyId).maybeSingle();
  if (!v || v.trade_type === "경매") return; // 경매는 수집할 때 따로 맞춘다 (utils/auctionMatch.ts)
  const kinds = kindsOfVacancy(v);
  let next: string | null | undefined = null;
  if (kinds.length) {
    if (v.complex_id) {
      const { data: given } = await sb.from("apt_complexes").select("id, kind").eq("id", v.complex_id).maybeSingle();
      if (given && kinds.includes(given.kind as CxKind)) return;
    }
    next = await complexAt(sb, Number(v.lat), Number(v.lng), kinds);
    if (next === undefined) return;
  }
  if (next !== (v.complex_id ?? null)) await sb.from("vacancies").update({ complex_id: next }).eq("id", vacancyId);
}

/** 단지마다 번지 열쇠 목록 ("동 번지" — articles.loc_lot 과 같은 모양). 대표 번지 + 부속지번
 *  keys 를 주면 그 열쇠에 해당하는 부속지번만 찾는다 (화면 안 단지가 수백 곳일 때 가볍게) */
export async function lotKeysOf(sb: SupabaseClient, complexes: { id: string }[], keys?: string[]) {
  const out = new Map<string, Set<string>>();
  for (const c of complexes) out.set(c.id, new Set([repKey(c.id)].filter(Boolean)));
  if (!complexes.length || (keys && !keys.length)) return out;
  let q = sb.from("complex_lots").select("complex_id, dong, jibun").limit(3000);
  if (keys) {
    const dongs = [...new Set(keys.map((k) => k.split(" ")[0]))], jibuns = [...new Set(keys.map((k) => k.split(" ").slice(1).join(" ")))];
    q = q.in("dong", dongs).in("jibun", jibuns);
  } else q = q.in("complex_id", complexes.map((c) => c.id));
  const { data, error } = await q;
  if (error) return out;
  for (const r of (data || []) as { complex_id: string; dong: string; jibun: string }[]) out.get(r.complex_id)?.add(`${r.dong} ${r.jibun}`);
  return out;
}

/** 단지 아이디("11650:서초동:1338", "o:…") → 대표 번지 열쇠("서초동 1338") */
export const repKey = (id: string) => {
  const p = String(id || "").replace(/^[a-z]+:/, "").split(":");
  return p.length >= 3 ? `${p[1]} ${p.slice(2).join(":")}` : "";
};
