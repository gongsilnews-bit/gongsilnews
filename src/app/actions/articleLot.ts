"use server";

// 기사쓰기 위치 창(PC·모바일)에서 찍은 자리의 번지와 그 번지의 단지 (2026-11-18 사장님)
//  기자가 맞는 건물에 찍었는지 눈으로 확인하게 — 단지 이름이 보이면 그 단지 화면 [뉴스]에 나온다
import { createClient } from "@supabase/supabase-js";
import { lotOf } from "@/utils/articleLot";

const KIND: Record<string, string> = { apt: "아파트", offi: "오피스텔", villa: "빌라" };

export async function lookupArticleLot(lat: number, lng: number) {
  const lot = await lotOf(Number(lat), Number(lng));
  if (!lot) return { lot: "", complexes: [] as string[] };
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  // 같은 동·번지 단지 (동 이름은 다른 도시에도 있어 둘레 약 1km 안만)
  const { data } = await db.from("apt_complexes").select("name, kind")
    .eq("dong", lot.dong).eq("jibun", lot.jibun)
    .gte("lat", lat - 0.01).lte("lat", lat + 0.01).gte("lng", lng - 0.0125).lte("lng", lng + 0.0125)
    .limit(5);
  // 같은 건물이 아파트·오피스텔 목록에 둘 다 있으면 한 줄로 "(아파트·오피스텔)"
  const byName = new Map<string, { name: string; kinds: string[] }>();
  for (const c of data || []) {
    const k = String(c.name).replace(/\s/g, "");
    const row = byName.get(k) || { name: String(c.name), kinds: [] as string[] };
    const kind: string = KIND[c.kind] || String(c.kind);
    if (!row.kinds.includes(kind)) row.kinds.push(kind);
    byName.set(k, row);
  }
  const order = ["아파트", "오피스텔", "빌라"];
  const complexes = [...byName.values()].map((r) => `${r.name} (${r.kinds.sort((x, y) => order.indexOf(x) - order.indexOf(y)).join("·")})`);
  return { lot: lot.key, complexes };
}
