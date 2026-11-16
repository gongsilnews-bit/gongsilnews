// 지도를 넓게 볼 때 실거래 단지를 지역으로 묶은 평균 가격 (2026-11-16 사장님: "줌에 따라 시 · 동 · 블럭 · 단지로 다르게")
//  시·도(sido) · 시군구(gu) · 동(dong) 마다 대표 매매가(rep_price, 만원) 평균 · 단지 수 · 가운데 좌표
//  전국 단지를 한 번 읽어 세 단계를 함께 만들고 6시간 기억한다 (값은 하루 한 번 모으는 실거래가라 자주 바뀌지 않음)
import type { SupabaseClient } from "@supabase/supabase-js";
import { LAWD_NAMES } from "@/utils/aptMapShared";

export type AptKind = "apt" | "offi" | "villa";
export type AggLevel = "sido" | "gu" | "dong";
export type RegionAgg = { key: string; name: string; lat: number; lng: number; price: number; n: number };

const KEEP_MS = 6 * 60 * 60 * 1000;
const PAGE = 1000;
const cache = new Map<AptKind, { at: number; data: Record<AggLevel, RegionAgg[]> }>();
const loading = new Map<AptKind, Promise<Record<AggLevel, RegionAgg[]>>>();

/** 시군구 코드 → [시·도 이름, 시군구 이름] */
function namesOf(lawd: string): [string, string] {
  const full = LAWD_NAMES[lawd];
  if (full) { const [sido, ...rest] = full.split(" "); return [sido, rest.join(" ") || sido]; }
  const any = Object.entries(LAWD_NAMES).find(([k]) => k.slice(0, 2) === lawd.slice(0, 2));
  const sido = any ? any[1].split(" ")[0] : "";
  return [sido, sido];
}

type Row = { lawd_cd: string | null; dong: string | null; lat: number | null; lng: number | null; rep_price: number | null };

// 단지 id 는 "시군구코드:동:지번"(오피스텔 "o:…", 빌라 "v:…") 이라 id 범위 = 지역 범위. 시·도(앞 두 자리)마다 id 순서로, 앞 쪽 마지막 id 다음부터 읽는다
// (건너뛰기·다른 칸 범위로 읽으면 빌라처럼 많을 때 DB 시간 제한에 걸림 — id 색인을 그대로 타게)
const SIDO_PREFIXES = Array.from({ length: 42 }, (_, i) => String(11 + i)); // 11~52 (없는 번호는 빈 결과로 금방 끝남)
async function readSido(supabase: SupabaseClient, kind: AptKind, pre: string): Promise<Row[]> {
  const rows: Row[] = [];
  // 오피스텔 id 는 "o:", 빌라는 "v:" 로 시작
  const head = kind === "offi" ? "o:" : kind === "villa" ? "v:" : "";
  let last = head + pre;
  const end = head + String(Number(pre) + 1);
  for (;;) {
    const { data, error } = await supabase.from("apt_complexes").select("id, kind, fp, lawd_cd, dong, lat, lng, rep_price")
      .gt("id", last).lt("id", end).order("id").limit(PAGE);
    if (error) throw new Error(error.message);
    const got = (data || []) as (Row & { id: string; kind: string; fp: string | null })[];
    for (const r of got) if (r.kind === kind && r.fp !== "gone" && r.rep_price && r.rep_price > 0) rows.push(r);
    if (got.length < PAGE) return rows;
    last = got[got.length - 1].id;
  }
}
async function readAll(supabase: SupabaseClient, kind: AptKind): Promise<Row[]> {
  const out: Row[] = [];
  // 시·도 6곳씩 함께
  for (let i = 0; i < SIDO_PREFIXES.length; i += 6) {
    const got = await Promise.all(SIDO_PREFIXES.slice(i, i + 6).map((pre) => readSido(supabase, kind, pre)));
    for (const g of got) out.push(...g);
  }
  return out;
}

function build(rows: Row[]): Record<AggLevel, RegionAgg[]> {
  type Acc = { name: string; lat: number; lng: number; price: number; n: number };
  const maps: Record<AggLevel, Map<string, Acc>> = { sido: new Map(), gu: new Map(), dong: new Map() };
  const add = (lv: AggLevel, key: string, name: string, r: Row) => {
    const m = maps[lv];
    const a = m.get(key) || { name, lat: 0, lng: 0, price: 0, n: 0 };
    a.lat += r.lat!; a.lng += r.lng!; a.price += r.rep_price!; a.n += 1;
    m.set(key, a);
  };
  for (const r of rows) {
    if (!r.lawd_cd || !r.lat || !r.lng || !r.rep_price) continue;
    const [sido, gu] = namesOf(r.lawd_cd);
    add("sido", r.lawd_cd.slice(0, 2), sido || "기타", r);
    add("gu", r.lawd_cd, gu || sido || "기타", r);
    if (r.dong) add("dong", `${r.lawd_cd}:${r.dong}`, r.dong, r);
  }
  const out = (lv: AggLevel) => [...maps[lv].entries()].map(([key, a]) => ({ key, name: a.name, lat: a.lat / a.n, lng: a.lng / a.n, price: Math.round(a.price / a.n), n: a.n }));
  return { sido: out("sido"), gu: out("gu"), dong: out("dong") };
}

export async function regionAgg(supabase: SupabaseClient, kind: AptKind): Promise<Record<AggLevel, RegionAgg[]>> {
  const hit = cache.get(kind);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.data;
  if (!loading.has(kind)) {
    loading.set(kind, readAll(supabase, kind).then(build).then((data) => { cache.set(kind, { at: Date.now(), data }); return data; }).finally(() => loading.delete(kind)));
  }
  return loading.get(kind)!;
}
