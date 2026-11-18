// 기사 좌표 → 번지 (2026-11-18 사장님: 단지·빌라 화면 [뉴스]는 번지가 정확히 같은 기사만)
//
// 기사에는 articles.loc_lot 한 칸에 "동 번지@위도,경도" 로 적어 둔다 (예: "서초동 1338@37.49085,127.02955")
//  - 앞 = 번지 열쇠. 단지 아이디 "11650:서초동:1338" 의 뒤 두 칸과 같은 모양 → 같으면 그 단지 기사
//  - 뒤 = 그 번지를 구한 좌표. 기사 좌표가 바뀌면(어느 화면·AI 가 바꾸든) 달라지므로 다시 구한다
// 좌표→번지는 카카오 REST(coord2address) 한 번. 기사마다 한 번만 묻고 저장해 두어 단지 창이 가볍다
// 칸이 아직 없으면(SQL 실행 전) 쓰는 쪽이 예전 방식으로 돌아간다 — supabase/migrations/20261118_articles_loc_lot.sql
import type { SupabaseClient } from "@supabase/supabase-js";

export type Lot = { dong: string; jibun: string; key: string; road: string };

const at = (lat: number, lng: number) => `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;

/** 좌표 → 번지 (카카오). 못 구하면 null */
export async function lotOf(lat: number, lng: number): Promise<Lot | null> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    const r = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const doc = j?.documents?.[0];
    const a = doc?.address;
    if (!a?.region_3depth_name || !a?.main_address_no) return null;
    const jibun = a.main_address_no + (a.sub_address_no && a.sub_address_no !== "0" ? `-${a.sub_address_no}` : "");
    const dong = String(a.region_3depth_name).trim();
    return { dong, jibun, key: `${dong} ${jibun}`, road: doc?.road_address?.address_name || "" };
  } catch {
    return null;
  }
}

/** 단지 아이디("11650:서초동:1338") → 번지 열쇠("서초동 1338") */
export const complexLotKey = (id: string) => {
  const p = String(id || "").replace(/^[a-z]+:/, "").split(":"); // 오피스텔·빌라는 앞에 "o:" 등이 붙는다
  return p.length >= 3 ? `${p[1]} ${p.slice(2).join(":")}` : "";
};

/** 저장된 loc_lot 이 지금 좌표의 것이면 번지 열쇠, 아니면(없거나 좌표가 바뀜) null */
export function freshLotKey(a: { lat: number | null; lng: number | null; loc_lot?: string | null }) {
  if (!a.loc_lot || a.lat == null || a.lng == null) return null;
  const i = a.loc_lot.lastIndexOf("@");
  if (i < 0 || a.loc_lot.slice(i + 1) !== at(a.lat, a.lng)) return null;
  return a.loc_lot.slice(0, i);
}

/** 번지를 아직 모르거나 좌표가 바뀐 기사들의 번지를 구해 저장하고, 기사마다 번지 열쇠를 돌려준다 (한 번에 max 건까지) */
export async function ensureLots(
  supabase: SupabaseClient,
  arts: { id: string; lat: number | null; lng: number | null; loc_lot?: string | null }[],
  max = 20,
) {
  const keys = new Map<string, string>();
  const todo: typeof arts = [];
  for (const a of arts) {
    const k = freshLotKey(a);
    if (k) keys.set(a.id, k);
    else if (a.lat != null && a.lng != null) todo.push(a);
  }
  await Promise.all(todo.slice(0, max).map(async (a) => {
    const lot = await lotOf(Number(a.lat), Number(a.lng));
    // 번지를 못 구한 곳(바다·해외 등)도 "@좌표"만 적어 다시 묻지 않는다
    const loc_lot = `${lot ? lot.key : ""}@${at(Number(a.lat), Number(a.lng))}`;
    await supabase.from("articles").update({ loc_lot }).eq("id", a.id);
    if (lot) keys.set(a.id, lot.key);
  }));
  return keys;
}
