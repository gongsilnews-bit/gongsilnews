"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getEffectivePlan } from "@/utils/planCheck";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

/**
 * 유료 부동산 회원 자격 검사
 * - 공실뉴스부동산 (news_premium)
 * - 공실등록부동산 (vacancy_premium)
 * - 최고관리자 / 관리자 (admin, SUPER_ADMIN)
 */
export async function checkRealtorPaidPlan(authorId: string): Promise<{
  isPaid: boolean;
  plan: string;
  role: string | null;
}> {
  const supabase = getAdminClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, role, plan_type, plan_end_date")
    .eq("id", authorId)
    .single();

  if (!member) {
    return { isPaid: false, plan: "free", role: null };
  }

  const effectivePlan = getEffectivePlan(member);
  const isSuper = member.role === "SUPER_ADMIN" || member.role === "ADMIN" || member.role === "최고관리자";
  const isPaid = isSuper || effectivePlan === "news_premium" || effectivePlan === "vacancy_premium";

  return { isPaid, plan: effectivePlan, role: member.role };
}

/**
 * 작성자가 기사에 연결할 수 있는 적격 공실 목록 조회 (초경량 1회 조회)
 * 조건:
 * 1. 작성자 본인의 매물 (owner_id = authorId)
 * 2. 상태: ACTIVE (정상 진행 매물)
 * 3. 노출유형: '부동산노출 + 일반인노출' (완전 공개 매물만)
 * 4. 경매/공매 제외
 */
export async function getAuthorEligibleVacancies(authorId: string): Promise<{
  success: boolean;
  isPaid: boolean;
  vacancies: any[];
  error?: string;
}> {
  try {
    const { isPaid } = await checkRealtorPaidPlan(authorId);
    if (!isPaid) {
      return { success: true, isPaid: false, vacancies: [] };
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("vacancies")
      .select(
        "id, vacancy_no, building_name, sido, sigungu, dong, detail_addr, trade_type, property_type, deposit, monthly_rent, maintenance_fee, exclusive_m2, supply_m2, room_count, bath_count, themes, exposure_type, vacancy_photos(url, sort_order)"
      )
      .eq("owner_id", authorId)
      .eq("status", "ACTIVE")
      .neq("trade_type", "경매")
      .neq("trade_type", "공매")
      .ilike("exposure_type", "%일반인%")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getAuthorEligibleVacancies] error:", error);
      return { success: false, isPaid, vacancies: [], error: error.message };
    }

    // '부동산노출 + 일반인노출' 매물만 엄격 필터링 (공백 차이 허용)
    const filtered = (data || []).filter((v: any) => {
      const exp = (v.exposure_type || "").replace(/\s/g, "");
      return exp === "부동산노출+일반인노출";
    });

    return { success: true, isPaid, vacancies: filtered };
  } catch (err: any) {
    console.error("[getAuthorEligibleVacancies] unexpected error:", err);
    return { success: false, isPaid: false, vacancies: [], error: err.message };
  }
}

/**
 * 작성자의 기사들에 연결된 공실 매핑 맵 조회
 * 반환: Record<articleId, { vacancy_id: string; title: string; snapshot: any }>
 */
export async function getAuthorArticlesVacancyMap(authorId: string): Promise<{
  success: boolean;
  vacancyMap: Record<string, { vacancy_id: string; title: string; snapshot: any }>;
}> {
  try {
    const supabase = getAdminClient();

    // 1. 해당 작성자의 기사 ID 목록 조회
    const { data: articles } = await supabase
      .from("articles")
      .select("id")
      .eq("author_id", authorId)
      .neq("is_deleted", true);

    if (!articles || articles.length === 0) {
      return { success: true, vacancyMap: {} };
    }

    const articleIds = articles.map((a) => a.id);

    // 2. article_media 에서 ATTACHED_VACANCY 조회 (media_type: 'FILE', filename: 'ATTACHED_VACANCY')
    const { data: mediaList, error } = await supabase
      .from("article_media")
      .select("article_id, url, filename, caption, media_type")
      .in("article_id", articleIds)
      .or("media_type.eq.ATTACHED_VACANCY,and(media_type.eq.FILE,filename.eq.ATTACHED_VACANCY)");

    if (error) {
      console.error("[getAuthorArticlesVacancyMap] error:", error);
      return { success: false, vacancyMap: {} };
    }

    const vacancyMap: Record<string, { vacancy_id: string; title: string; snapshot: any }> = {};
    (mediaList || []).forEach((m) => {
      let snapshot = null;
      try {
        if (m.caption) snapshot = JSON.parse(m.caption);
      } catch (e) {
        snapshot = null;
      }
      vacancyMap[m.article_id] = {
        vacancy_id: m.url,
        title: snapshot?.title || "추천 공실",
        snapshot,
      };
    });

    return { success: true, vacancyMap };
  } catch (err: any) {
    console.error("[getAuthorArticlesVacancyMap] unexpected error:", err);
    return { success: false, vacancyMap: {} };
  }
}

/**
 * 최고관리자 전용: 특정 기사 목록(articleIds)에 연결된 공실 매핑 맵 조회
 */
export async function getAdminArticlesVacancyMap(articleIds: string[]): Promise<{
  success: boolean;
  vacancyMap: Record<string, { vacancy_id: string; title: string; snapshot: any }>;
}> {
  try {
    if (!articleIds || articleIds.length === 0) {
      return { success: true, vacancyMap: {} };
    }

    const supabase = getAdminClient();
    const { data: mediaList, error } = await supabase
      .from("article_media")
      .select("article_id, url, filename, caption, media_type")
      .in("article_id", articleIds)
      .or("media_type.eq.ATTACHED_VACANCY,and(media_type.eq.FILE,filename.eq.ATTACHED_VACANCY)");

    if (error) {
      console.error("[getAdminArticlesVacancyMap] error:", error);
      return { success: false, vacancyMap: {} };
    }

    const vacancyMap: Record<string, { vacancy_id: string; title: string; snapshot: any }> = {};
    (mediaList || []).forEach((m) => {
      let snapshot = null;
      try {
        if (m.caption) snapshot = JSON.parse(m.caption);
      } catch (e) {
        snapshot = null;
      }
      vacancyMap[m.article_id] = {
        vacancy_id: m.url,
        title: snapshot?.title || "추천 공실",
        snapshot,
      };
    });

    return { success: true, vacancyMap };
  } catch (err: any) {
    console.error("[getAdminArticlesVacancyMap] unexpected error:", err);
    return { success: false, vacancyMap: {} };
  }
}

/**
 * 기사에 공실 매물 단일 연결 또는 연결 해제
 * @param articleId 기사 ID
 * @param vacancyId 공실 ID (null 또는 빈 문자열이면 연결 해제)
 */
export async function updateArticleAttachedVacancy(
  articleId: string,
  vacancyId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient();

    // 기존 연결된 ATTACHED_VACANCY 삭제
    await supabase
      .from("article_media")
      .delete()
      .eq("article_id", articleId)
      .or("media_type.eq.ATTACHED_VACANCY,and(media_type.eq.FILE,filename.eq.ATTACHED_VACANCY)");

    // 공실 연결 해제 요청인 경우 삭제만 하고 종료
    if (!vacancyId || vacancyId === "NONE") {
      revalidatePath(`/news/${articleId}`);
      revalidatePath(`/m/news/${articleId}`);
      return { success: true };
    }

    // 공실 상세 데이터 1회 조회하여 경량 스냅샷 생성
    const { data: v, error: vErr } = await supabase
      .from("vacancies")
      .select(
        "id, vacancy_no, building_name, sido, sigungu, dong, detail_addr, trade_type, property_type, deposit, monthly_rent, maintenance_fee, exclusive_m2, supply_m2, room_count, bath_count, themes, exposure_type, vacancy_photos(url, sort_order)"
      )
      .eq("id", vacancyId)
      .single();

    if (vErr || !v) {
      return { success: false, error: "선택한 매물 정보를 찾을 수 없습니다." };
    }

    const photos = (v.vacancy_photos || []).sort(
      (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
    );
    const thumbUrl = photos.length > 0 ? photos[0].url : "";
    const addr = v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ") || "추천 공실";

    const snapshot = {
      id: v.id,
      vacancy_no: v.vacancy_no,
      title: addr,
      building_name: v.building_name,
      dong: v.dong,
      sigungu: v.sigungu,
      trade_type: v.trade_type,
      property_type: v.property_type,
      deposit: v.deposit || 0,
      monthly_rent: v.monthly_rent || 0,
      maintenance_fee: v.maintenance_fee || 0,
      exclusive_m2: v.exclusive_m2 || 0,
      supply_m2: v.supply_m2 || 0,
      room_count: v.room_count || 0,
      bath_count: v.bath_count || 0,
      themes: v.themes || [],
      photo_url: thumbUrl,
    };

    // article_media 제약조건(media_type IN ('PHOTO','FILE'))을 준수하여 media_type: 'FILE', filename: 'ATTACHED_VACANCY'로 저장
    const { error: insertErr } = await supabase.from("article_media").insert({
      article_id: articleId,
      media_type: "FILE",
      url: vacancyId,
      filename: "ATTACHED_VACANCY",
      caption: JSON.stringify(snapshot),
      sort_order: 999,
    });

    if (insertErr) {
      console.error("[updateArticleAttachedVacancy] insert error:", insertErr);
      return { success: false, error: insertErr.message };
    }

    revalidatePath(`/news/${articleId}`);
    revalidatePath(`/m/news/${articleId}`);
    return { success: true };
  } catch (err: any) {
    console.error("[updateArticleAttachedVacancy] unexpected error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 여러 기사에 공실 매물 일괄 적용
 * @param articleIds 대상 기사 ID 목록
 * @param vacancyId 연결할 공실 ID (null 또는 'NONE'이면 일괄 해제)
 */
export async function updateMultipleArticlesAttachedVacancy(
  articleIds: string[],
  vacancyId: string | null
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    if (!articleIds || articleIds.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = getAdminClient();

    // 1. 기존 연결 일괄 삭제
    await supabase
      .from("article_media")
      .delete()
      .in("article_id", articleIds)
      .or("media_type.eq.ATTACHED_VACANCY,and(media_type.eq.FILE,filename.eq.ATTACHED_VACANCY)");

    if (!vacancyId || vacancyId === "NONE") {
      articleIds.forEach((id) => {
        revalidatePath(`/news/${id}`);
        revalidatePath(`/m/news/${id}`);
      });
      return { success: true, count: articleIds.length };
    }

    // 2. 공실 상세 1회 조회 후 스냅샷 생성
    const { data: v, error: vErr } = await supabase
      .from("vacancies")
      .select(
        "id, vacancy_no, building_name, sido, sigungu, dong, detail_addr, trade_type, property_type, deposit, monthly_rent, maintenance_fee, exclusive_m2, supply_m2, room_count, bath_count, themes, exposure_type, vacancy_photos(url, sort_order)"
      )
      .eq("id", vacancyId)
      .single();

    if (vErr || !v) {
      return { success: false, error: "선택한 매물 정보를 찾을 수 없습니다." };
    }

    const photos = (v.vacancy_photos || []).sort(
      (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
    );
    const thumbUrl = photos.length > 0 ? photos[0].url : "";
    const addr = v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ") || "추천 공실";

    const snapshot = {
      id: v.id,
      vacancy_no: v.vacancy_no,
      title: addr,
      building_name: v.building_name,
      dong: v.dong,
      sigungu: v.sigungu,
      trade_type: v.trade_type,
      property_type: v.property_type,
      deposit: v.deposit || 0,
      monthly_rent: v.monthly_rent || 0,
      maintenance_fee: v.maintenance_fee || 0,
      exclusive_m2: v.exclusive_m2 || 0,
      supply_m2: v.supply_m2 || 0,
      room_count: v.room_count || 0,
      bath_count: v.bath_count || 0,
      themes: v.themes || [],
      photo_url: thumbUrl,
    };

    const captionJson = JSON.stringify(snapshot);
    const rows = articleIds.map((articleId) => ({
      article_id: articleId,
      media_type: "FILE",
      url: vacancyId,
      filename: "ATTACHED_VACANCY",
      caption: captionJson,
      sort_order: 999,
    }));

    const { error: insertErr } = await supabase.from("article_media").insert(rows);
    if (insertErr) {
      console.error("[updateMultipleArticlesAttachedVacancy] error:", insertErr);
      return { success: false, error: insertErr.message };
    }

    articleIds.forEach((id) => {
      revalidatePath(`/news/${id}`);
      revalidatePath(`/m/news/${id}`);
    });

    return { success: true, count: articleIds.length };
  } catch (err: any) {
    console.error("[updateMultipleArticlesAttachedVacancy] unexpected error:", err);
    return { success: false, error: err.message };
  }
}
