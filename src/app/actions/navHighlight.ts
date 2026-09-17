"use server";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

/**
 * 헤더 말풍선에 띄울 실시간 수치
 *
 * 헤더는 모든 페이지에 있으므로 방문마다 세는 대신 5분 캐시로 묶는다.
 * 세는 건수는 head 쿼리라 본문을 전혀 가져오지 않는다.
 */
const fetchCounts = unstable_cache(
  async () => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const [auction, vacancy, lecture] = await Promise.all([
      admin.from("vacancies").select("id", { count: "exact", head: true }).eq("trade_type", "경매").eq("status", "ACTIVE"),
      admin.from("vacancies").select("id", { count: "exact", head: true }).neq("trade_type", "경매").eq("status", "ACTIVE"),
      admin.from("lectures").select("id", { count: "exact", head: true }),
    ]);

    return {
      auction: auction.count ?? 0,
      vacancy: vacancy.count ?? 0,
      lecture: lecture.count ?? 0,
    };
  },
  ["nav-highlight-counts"],
  { revalidate: 300, tags: ["nav-highlight-counts"] }
);

export async function getNavHighlightCounts() {
  try {
    return { success: true as const, data: await fetchCounts() };
  } catch {
    return { success: false as const, data: { auction: 0, vacancy: 0, lecture: 0 } };
  }
}
