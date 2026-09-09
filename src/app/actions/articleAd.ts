"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

export interface AuthorBanner {
  id: string;
  author_id: string;
  name: string;
  image_url: string;
  link_url: string | null;
  link_target: string;
  is_active: boolean;
  click_count?: number;
  view_count?: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthorBannerStat extends AuthorBanner {
  click_count: number;
  view_count: number;
  ctr: string;
}

export interface ArticleAdSetting {
  article_id: string;
  author_id: string;
  ad_type: "DEFAULT" | "BANNER" | "NONE";
  custom_banner_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
  updated_at?: string;
  custom_banner?: AuthorBanner | null;
}

/* ── 배너 데이터 정규화 헬퍼 (link_target 내 날짜 백업 인코딩 파싱) ── */
export function normalizeAuthorBanner(b: any): AuthorBanner {
  if (!b) return b;
  let startDate = b.start_date || null;
  let endDate = b.end_date || null;
  let linkTarget = b.link_target || "_blank";

  if (linkTarget.includes("|dates:")) {
    const parts = linkTarget.split("|dates:");
    linkTarget = parts[0] || "_blank";
    const dateParts = (parts[1] || "").split(",");
    if (!startDate && dateParts[0]) startDate = dateParts[0];
    if (!endDate && dateParts[1]) endDate = dateParts[1];
  }

  return {
    ...b,
    link_target: linkTarget,
    start_date: startDate,
    end_date: endDate,
    click_count: Number(b.click_count) || 0,
    view_count: Number(b.view_count) || 0,
  };
}

/* ── 1. 작성자의 배너 목록 조회 ── */
export async function getAuthorBanners(authorId: string): Promise<{ success: boolean; data: AuthorBanner[]; error?: string }> {
  if (!authorId) return { success: true, data: [] };
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from("article_author_banners")
      .select("*")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getAuthorBanners notice:", error.message);
      return { success: true, data: [] };
    }
    const banners = (data || []).map(normalizeAuthorBanner);
    return { success: true, data: banners };
  } catch (err: any) {
    console.warn("getAuthorBanners catch:", err.message);
    return { success: true, data: [] };
  }
}

/* ── 2. 작성자 배너 저장 (신규/수정) ── */
export async function saveAuthorBanner(formData: FormData): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = getAdminClient();

  try {
    const id = formData.get("id") as string | null;
    const authorId = formData.get("author_id") as string;
    const name = (formData.get("name") as string)?.trim() || "맞춤 배너";
    let linkUrl = (formData.get("link_url") as string)?.trim() || null;
    if (linkUrl && !linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
      linkUrl = `https://${linkUrl}`;
    }
    const linkTarget = (formData.get("link_target") as string) || "_blank";
    const startDate = (formData.get("start_date") as string)?.trim() || null;
    const endDate = (formData.get("end_date") as string)?.trim() || null;

    if (!authorId) {
      return { success: false, error: "작성자 정보가 없습니다." };
    }

    // 이미지 업로드
    const imageFile = formData.get("image") as File | null;
    let imageUrl = (formData.get("image_url") as string) || "";

    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const fileName = `article_banner_${authorId}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(fileName, imageFile, { contentType: imageFile.type, upsert: true });

      if (uploadError) {
        return { success: false, error: "이미지 업로드 실패: " + uploadError.message };
      }
      const { data: publicData } = supabase.storage.from("banners").getPublicUrl(fileName);
      imageUrl = publicData.publicUrl;
    }

    if (!imageUrl) {
      return { success: false, error: "배너 이미지를 등록해주세요." };
    }

    const isColError = (err: any) =>
      Boolean(err && (err.code === "42703" || err.code === "PGRST204" || err.message?.includes("column") || err.message?.includes("schema cache")));

    if (id) {
      // 수정
      let updatePayload: any = {
        name,
        image_url: imageUrl,
        link_url: linkUrl,
        link_target: linkTarget,
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from("article_author_banners")
        .update(updatePayload)
        .eq("id", id)
        .eq("author_id", authorId)
        .select()
        .single();

      // 만약 start_date/end_date 컬럼 미존재(PGRST204 / 42703) 시 제외하고 안전하게 재시도
      if (isColError(error)) {
        delete updatePayload.start_date;
        delete updatePayload.end_date;
        const retry = await supabase
          .from("article_author_banners")
          .update(updatePayload)
          .eq("id", id)
          .eq("author_id", authorId)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) return { success: false, error: error.message };
      return { success: true, data: normalizeAuthorBanner(data) };
    } else {
      // 신규 등록
      let insertPayload: any = {
        author_id: authorId,
        name,
        image_url: imageUrl,
        link_url: linkUrl,
        link_target: linkTarget,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      };

      let { data, error } = await supabase
        .from("article_author_banners")
        .insert(insertPayload)
        .select()
        .single();

      // 만약 start_date/end_date 컬럼 미존재(PGRST204 / 42703) 시 제외하고 안전하게 재시도
      if (isColError(error)) {
        delete insertPayload.start_date;
        delete insertPayload.end_date;
        const retry = await supabase
          .from("article_author_banners")
          .insert(insertPayload)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) return { success: false, error: error.message };
      return { success: true, data: normalizeAuthorBanner(data) };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "배너 저장 중 오류가 발생했습니다." };
  }
}

/* ── 2-1. 작성자 배너 활성/비활성 토글 ── */
export async function toggleAuthorBannerActive(bannerId: string, authorId: string, currentActive: boolean): Promise<{ success: boolean; error?: string }> {
  if (!bannerId || !authorId) return { success: false, error: "잘못된 요청입니다." };
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("article_author_banners")
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq("id", bannerId)
      .eq("author_id", authorId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 3. 작성자 배너 삭제 ── */
export async function deleteAuthorBanner(bannerId: string, authorId: string): Promise<{ success: boolean; error?: string }> {
  if (!bannerId || !authorId) return { success: false, error: "잘못된 요청입니다." };
  const supabase = getAdminClient();

  try {
    const { error } = await supabase
      .from("article_author_banners")
      .delete()
      .eq("id", bannerId)
      .eq("author_id", authorId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "삭제 중 오류가 발생했습니다." };
  }
}

/* ── 3-1. 작성자 배너 성과 분석(통계) 조회 ── */
export async function getAuthorBannerStats(authorId: string): Promise<{
  success: boolean;
  data: AuthorBannerStat[];
  error?: string;
}> {
  if (!authorId) return { success: true, data: [] };
  const supabase = getAdminClient();

  try {
    const { data: banners, error } = await supabase
      .from("article_author_banners")
      .select("*")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getAuthorBannerStats error:", error.message);
      return { success: true, data: [] };
    }

    const stats: AuthorBannerStat[] = (banners || []).map(normalizeAuthorBanner).map((b) => {
      const clickCount = Number(b.click_count) || 0;
      const viewCount = Number(b.view_count) || 0;
      const ctr = viewCount > 0 ? ((clickCount / viewCount) * 100).toFixed(2) : "0.00";
      return {
        ...b,
        click_count: clickCount,
        view_count: viewCount,
        ctr,
      };
    });

    // 클릭수 많은 순으로 정렬
    stats.sort((a, b) => (b.click_count - a.click_count) || (b.view_count - a.view_count));

    return { success: true, data: stats };
  } catch (err: any) {
    console.warn("getAuthorBannerStats catch:", err.message);
    return { success: true, data: [] };
  }
}

/* ── 3-2. 작성자 배너 클릭 추적 ── */
export async function trackAuthorBannerClick(bannerId: string): Promise<{ success: boolean }> {
  if (!bannerId) return { success: false };
  const supabase = getAdminClient();
  try {
    const { data } = await supabase
      .from("article_author_banners")
      .select("click_count")
      .eq("id", bannerId)
      .single();

    if (data && typeof data.click_count !== "undefined") {
      await supabase
        .from("article_author_banners")
        .update({ click_count: (Number(data.click_count) || 0) + 1 })
        .eq("id", bannerId);
    }
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

/* ── 3-3. 작성자 배너 노출 추적 ── */
export async function trackAuthorBannerView(bannerId: string): Promise<{ success: boolean }> {
  if (!bannerId) return { success: false };
  const supabase = getAdminClient();
  try {
    const { data } = await supabase
      .from("article_author_banners")
      .select("view_count")
      .eq("id", bannerId)
      .single();

    if (data && typeof data.view_count !== "undefined") {
      await supabase
        .from("article_author_banners")
        .update({ view_count: (Number(data.view_count) || 0) + 1 })
        .eq("id", bannerId);
    }
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

/* ── 4. 작성자의 기사 목록 및 각 기사의 광고 설정 조회 ── */
export async function getAuthorArticlesWithAdSettings(authorId: string): Promise<{
  success: boolean;
  articles: any[];
  error?: string;
}> {
  if (!authorId) return { success: true, articles: [] };
  const supabase = getAdminClient();

  try {
    // 1) 작성자의 기사 목록 (최신순)
    const { data: articles, error: artError } = await supabase
      .from("articles")
      .select("id, title, subtitle, thumbnail_url, section1, status, published_at, created_at")
      .eq("author_id", authorId)
      .neq("status", "DELETED")
      .order("created_at", { ascending: false });

    if (artError) {
      return { success: false, articles: [], error: artError.message };
    }

    if (!articles || articles.length === 0) {
      return { success: true, articles: [] };
    }

    const articleIds = articles.map((a) => a.id);

    // 2) 기사별 광고 설정 조회
    const { data: adSettings, error: adError } = await supabase
      .from("article_ad_settings")
      .select("*, custom_banner:article_author_banners(*)")
      .in("article_id", articleIds);

    const settingsMap = new Map<string, any>();
    if (adSettings && !adError) {
      adSettings.forEach((item: any) => {
        settingsMap.set(item.article_id, item);
      });
    }

    // 3) 병합
    const merged = articles.map((art) => {
      const setting = settingsMap.get(art.id) || {
        article_id: art.id,
        author_id: authorId,
        ad_type: "DEFAULT",
        custom_banner_id: null,
        start_date: null,
        end_date: null,
        custom_banner: null,
      };
      return {
        ...art,
        ad_setting: setting,
      };
    });

    return { success: true, articles: merged };
  } catch (err: any) {
    return { success: false, articles: [], error: err.message };
  }
}

/* ── 5. 선택된 기사들에 광고 설정 일괄/개별 저장 ── */
export async function updateArticlesAdSettings(
  articleIds: string[],
  authorId: string,
  settings: {
    ad_type: "DEFAULT" | "BANNER" | "NONE";
    custom_banner_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!articleIds || articleIds.length === 0 || !authorId) {
    return { success: false, error: "적용할 기사를 선택해주세요." };
  }
  const supabase = getAdminClient();

  try {
    const upsertRows = articleIds.map((artId) => ({
      article_id: artId,
      author_id: authorId,
      ad_type: settings.ad_type || "DEFAULT",
      custom_banner_id: settings.ad_type === "BANNER" ? settings.custom_banner_id || null : null,
      start_date: settings.start_date || null,
      end_date: settings.end_date || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("article_ad_settings")
      .upsert(upsertRows, { onConflict: "article_id" });

    if (error) {
      return { success: false, error: error.message };
    }

    // 캐시 무효화
    articleIds.forEach((id) => {
      revalidatePath(`/news/${id}`);
      revalidatePath(`/m/news/${id}`);
    });

    return { success: true, count: articleIds.length };
  } catch (err: any) {
    return { success: false, error: err.message || "광고 설정 저장 중 오류가 발생했습니다." };
  }
}

/* ── 6. 기사 상세용 광고 데이터 (배너 또는 기본 등록자 정보) 조회 ── */
export async function getArticleAdInfo(articleId: string, authorId?: string): Promise<{
  success: boolean;
  ad_type: "DEFAULT" | "BANNER" | "NONE";
  banner: AuthorBanner | null;
  agencyInfo: any | null;
  memberInfo: any | null;
  vacancyStats: { total: number; maemae: number; jeonse: number; rent: number; short: number };
}> {
  const supabase = getAdminClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const defaultStats = { total: 0, maemae: 0, jeonse: 0, rent: 0, short: 0 };

  try {
    // 1) 기사의 광고 설정 확인
    const { data: adSetting } = await supabase
      .from("article_ad_settings")
      .select("*, custom_banner:article_author_banners(*)")
      .eq("article_id", articleId)
      .maybeSingle();

    let targetAuthorId = authorId;
    if (!targetAuthorId) {
      const { data: art } = await supabase.from("articles").select("author_id").eq("id", articleId).maybeSingle();
      targetAuthorId = art?.author_id;
    }

    if (!targetAuthorId) {
      return { success: true, ad_type: "NONE", banner: null, agencyInfo: null, memberInfo: null, vacancyStats: defaultStats };
    }

    // 2) 작성자의 회원 정보 및 부동산 정보 조회
    const { data: member } = await supabase
      .from("members")
      .select("id, name, email, phone, role, plan_type, profile_image_url, sns_links, agencies(*)")
      .eq("id", targetAuthorId)
      .maybeSingle();

    const agency = member?.agencies
      ? Array.isArray(member.agencies)
        ? member.agencies[0]
        : member.agencies
      : null;

    // 작성자의 공실 통계 (전체/매매/전세/월세/단기 - 삭제 매물 제외, ACTIVE 매물만 집계)
    const { data: vacancies } = await supabase
      .from("vacancies")
      .select("trade_type")
      .eq("owner_id", targetAuthorId)
      .eq("status", "ACTIVE")
      .neq("trade_type", "경매")
      .neq("trade_type", "공매");

    const stats = { ...defaultStats };
    if (vacancies) {
      vacancies.forEach((v: any) => {
        const t = v.trade_type || "";
        if (t === "매매" || t.includes("매매")) stats.maemae += 1;
        else if (t === "전세" || t.includes("전세")) stats.jeonse += 1;
        else if (t === "월세" || t.includes("월세")) stats.rent += 1;
        else if (t === "단기" || t === "단기임대" || t.includes("단기")) stats.short += 1;
      });
      // 전체는 각 거래유형의 실제 합산으로 정확히 일치시킴
      stats.total = stats.maemae + stats.jeonse + stats.rent + stats.short;
    }

    // 3) 배너형 광고 유효성 체크 (기사 설정 또는 배너 자체의 노출 기간 모두 완벽 반영)
    if (adSetting && adSetting.ad_type === "BANNER" && adSetting.custom_banner) {
      const b = normalizeAuthorBanner(adSetting.custom_banner);
      const effectiveStartDate = adSetting.start_date || b.start_date;
      const effectiveEndDate = adSetting.end_date || b.end_date;
      const isStarted = !effectiveStartDate || effectiveStartDate <= todayStr;
      const isNotEnded = !effectiveEndDate || effectiveEndDate >= todayStr;

      if (b.is_active && isStarted && isNotEnded) {
        return {
          success: true,
          ad_type: "BANNER",
          banner: b,
          agencyInfo: agency,
          memberInfo: member,
          vacancyStats: stats,
        };
      }
    }

    if (adSetting && adSetting.ad_type === "NONE") {
      return { success: true, ad_type: "NONE", banner: null, agencyInfo: agency, memberInfo: member, vacancyStats: stats };
    }

    // 기간 만료 또는 기본형일 때는 기본형(등록자정보)으로 리턴!
    return {
      success: true,
      ad_type: "DEFAULT",
      banner: null,
      agencyInfo: agency,
      memberInfo: member,
      vacancyStats: stats,
    };
  } catch (err: any) {
    console.warn("getArticleAdInfo catch:", err.message);
    return { success: true, ad_type: "NONE", banner: null, agencyInfo: null, memberInfo: null, vacancyStats: defaultStats };
  }
}
