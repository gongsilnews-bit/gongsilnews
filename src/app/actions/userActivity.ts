"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 사용자 활동 카운트를 Service Role Key로 조회 (RLS 우회)
 * - 내가 등록한 기사
 * - 내가 등록한 공실
 * - 내가 찜한 기사
 * - 내가 찜한 공실
 * - 내가 구독한 기자
 * - 내 수강특강
 */
export async function getUserActivityCounts(userId: string) {
  const supabase = getAdminClient();
  try {
    const [
      { count: myArticles },
      { count: myVacancies },
      { count: bookmarkedArticles },
      { count: bookmarkedVacancies },
      { count: subscribedReporters },
      { count: myLectures },
    ] = await Promise.all([
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("author_id", userId),
      supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("member_id", userId),
      supabase.from("article_bookmarks").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("vacancy_wishlist").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("reporter_subscriptions").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("lecture_enrollments").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "ACTIVE"),
    ]);

    return {
      success: true,
      counts: {
        myArticles: myArticles || 0,
        myVacancies: myVacancies || 0,
        bookmarkedArticles: bookmarkedArticles || 0,
        bookmarkedVacancies: bookmarkedVacancies || 0,
        subscribedReporters: subscribedReporters || 0,
        myLectures: myLectures || 0,
      },
    };
  } catch (error: any) {
    console.error("getUserActivityCounts 오류:", error);
    return {
      success: false,
      counts: {
        myArticles: 0,
        myVacancies: 0,
        bookmarkedArticles: 0,
        bookmarkedVacancies: 0,
        subscribedReporters: 0,
        myLectures: 0,
      },
    };
  }
}
