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
    // 모든 카운트를 동시에 병렬 조회
    const [
      { data: subData },
      { count: myArticles },
      { count: myVacancies },
      { count: bookmarkedArticles },
      { count: bookmarkedVacancies },
      { count: myLectures },
    ] = await Promise.all([
      supabase.from("reporter_subscriptions").select("reporter_id").eq("user_id", userId),
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("author_id", userId).eq("is_deleted", false),
      supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("owner_id", userId).neq("status", "DELETED"),
      supabase.from("article_bookmarks").select("*, articles!inner(is_deleted)", { count: "exact", head: true }).eq("user_id", userId).eq("articles.is_deleted", false),
      supabase.from("vacancy_wishlist").select("*, vacancies!inner(status)", { count: "exact", head: true }).eq("user_id", userId).neq("vacancies.status", "DELETED"),
      supabase.from("lecture_enrollments").select("*, lectures!inner(is_deleted, status)", { count: "exact", head: true }).eq("user_id", userId).eq("status", "ACTIVE").eq("lectures.is_deleted", false).eq("lectures.status", "ACTIVE"),
    ]);

    let activeSubscribedReporters = 0;
    if (subData && subData.length > 0) {
      const reporterIds = subData.map((s) => s.reporter_id);
      const { count } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .in("id", reporterIds)
        .eq("is_deleted", false);
      activeSubscribedReporters = count || 0;
    }

    return {
      success: true,
      counts: {
        myArticles: myArticles || 0,
        myVacancies: myVacancies || 0,
        bookmarkedArticles: bookmarkedArticles || 0,
        bookmarkedVacancies: bookmarkedVacancies || 0,
        subscribedReporters: activeSubscribedReporters,
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
