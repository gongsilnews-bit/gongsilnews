"use server";

import { createClient } from "@supabase/supabase-js";

/**
 * 매물 실제 화면 찍기용 위치 (2026-11-09) — 공실열람에 공개 중(ACTIVE)인 매물만
 *  private: 주소를 공개하지 않은 매물(아파트·오피스텔 제외) — 공실열람 지도처럼 정확한 위치를 드러내지 않는다 (로드뷰·위성 안 찍음, 지도는 표시 없이 넓게)
 */
export async function getVacancySpot(vid: string): Promise<{ ok: boolean; lat?: number; lng?: number; name?: string; private?: boolean }> {
  if (!/^[\w-]{6,64}$/.test(vid)) return { ok: false };
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await db.from("vacancies").select("lat, lng, building_name, address_exposure, property_type, sub_category, is_onbid").eq("id", vid).eq("status", "ACTIVE").maybeSingle();
  if (!data || !Number.isFinite(Number(data.lat)) || !Number.isFinite(Number(data.lng))) return { ok: false };
  const exp = String(data.address_exposure || "");
  const isApt = ["아파트", "오피스텔", "도시형생활주택"].some((t) => String(data.property_type || "").includes(t) || String(data.sub_category || "").includes(t));
  const priv = !data.is_onbid && Boolean(exp) && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개" && !isApt;
  return { ok: true, lat: Number(data.lat), lng: Number(data.lng), name: String(data.building_name || ""), private: priv };
}
