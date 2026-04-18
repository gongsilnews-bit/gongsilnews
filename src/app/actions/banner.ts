"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ── 배너 전체 목록 조회 ── */
export async function getBanners() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

/* ── 슬롯별 활성 배너 조회 (프론트엔드용) ── */
export async function getBannersByPlacement(placement: string) {
  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("placement_code", placement)
    .eq("is_active", true)
    .or(`start_time.is.null,start_time.lte.${now}`)
    .or(`end_time.is.null,end_time.gte.${now}`)
    .order("sort_order", { ascending: true });
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

/* ── 배너 생성 ── */
export async function createBanner(formData: FormData) {
  const supabase = getAdminClient();

  // 이미지 업로드
  const imageFile = formData.get("image") as File | null;
  let imageUrl = formData.get("image_url") as string || "";

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop();
    const fileName = `banner_${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("banners")
      .upload(fileName, imageFile, { contentType: imageFile.type, upsert: true });
    if (uploadError) return { success: false, error: "이미지 업로드 실패: " + uploadError.message };
    const { data: publicData } = supabase.storage.from("banners").getPublicUrl(fileName);
    imageUrl = publicData.publicUrl;
  }

  if (!imageUrl && formData.get("placement_code") !== "HEADER_TEXT") {
    return { success: false, error: "이미지가 필요합니다." };
  }

  const bannerData = {
    title: formData.get("title") as string,
    image_url: imageUrl,
    link_url: (formData.get("link_url") as string) || null,
    link_target: (formData.get("link_target") as string) || "_blank",
    placement_code: formData.get("placement_code") as string,
    device_type: (formData.get("device_type") as string) || "ALL",
    start_time: (formData.get("start_time") as string) || null,
    end_time: (formData.get("end_time") as string) || null,
    is_active: formData.get("is_active") === "true",
    margin_top: parseInt(formData.get("margin_top") as string) || 0,
    margin_bottom: parseInt(formData.get("margin_bottom") as string) || 0,
    sort_order: parseInt(formData.get("sort_order") as string) || 0,
    auto_rotate: formData.get("auto_rotate") === "true",
    rotate_interval: parseInt(formData.get("rotate_interval") as string) || 5,
  };

  const { data, error } = await supabase.from("banners").insert(bannerData).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/* ── 배너 수정 ── */
export async function updateBanner(id: string, formData: FormData) {
  const supabase = getAdminClient();

  // 이미지 업로드 (새 파일이 있는 경우만)
  const imageFile = formData.get("image") as File | null;
  let imageUrl = formData.get("image_url") as string || "";

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop();
    const fileName = `banner_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(fileName, imageFile, { contentType: imageFile.type, upsert: true });
    if (uploadError) return { success: false, error: "이미지 업로드 실패: " + uploadError.message };
    const { data: publicData } = supabase.storage.from("banners").getPublicUrl(fileName);
    imageUrl = publicData.publicUrl;
  }

  const bannerData: any = {
    title: formData.get("title") as string,
    link_url: (formData.get("link_url") as string) || null,
    link_target: (formData.get("link_target") as string) || "_blank",
    placement_code: formData.get("placement_code") as string,
    device_type: (formData.get("device_type") as string) || "ALL",
    start_time: (formData.get("start_time") as string) || null,
    end_time: (formData.get("end_time") as string) || null,
    is_active: formData.get("is_active") === "true",
    margin_top: parseInt(formData.get("margin_top") as string) || 0,
    margin_bottom: parseInt(formData.get("margin_bottom") as string) || 0,
    sort_order: parseInt(formData.get("sort_order") as string) || 0,
    auto_rotate: formData.get("auto_rotate") === "true",
    rotate_interval: parseInt(formData.get("rotate_interval") as string) || 5,
    updated_at: new Date().toISOString(),
  };

  if (imageUrl) bannerData.image_url = imageUrl;

  const { data, error } = await supabase.from("banners").update(bannerData).eq("id", id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/* ── 배너 삭제 ── */
export async function deleteBanner(id: string) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ── 배너 활성/비활성 토글 ── */
export async function toggleBannerActive(id: string, isActive: boolean) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("banners").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ── 클릭 추적 ── */
export async function trackBannerClick(bannerId: string, referrer?: string, userAgent?: string) {
  const supabase = getAdminClient();

  // 클릭 로그 삽입
  await supabase.from("banner_clicks").insert({
    banner_id: bannerId,
    referrer: referrer || null,
    user_agent: userAgent || null,
  });

  // click_count 증가
  const { error: rpcError } = await supabase.rpc("increment_banner_click", { banner_id_param: bannerId });
  if (rpcError) {
    // fallback: 직접 증가
    const { data: current } = await supabase.from("banners").select("click_count").eq("id", bannerId).single();
    if (current) {
      await supabase.from("banners").update({ click_count: (current.click_count || 0) + 1 }).eq("id", bannerId);
    }
  }

  return { success: true };
}

/* ── 노출 추적 ── */
export async function trackBannerView(bannerId: string) {
  const supabase = getAdminClient();
  const { data: current } = await supabase.from("banners").select("view_count").eq("id", bannerId).single();
  if (current) {
    await supabase.from("banners").update({ view_count: (current.view_count || 0) + 1 }).eq("id", bannerId);
  }
  return { success: true };
}

/* ── 배너 통계 ── */
export async function getBannerStats() {
  const supabase = getAdminClient();

  // 전체 배너 + 클릭수/노출수
  const { data: banners, error } = await supabase
    .from("banners")
    .select("id, title, placement_code, click_count, view_count, is_active, start_time, end_time, created_at")
    .order("click_count", { ascending: false });

  if (error) return { success: false, error: error.message, data: [] };

  // CTR 계산
  const stats = (banners || []).map(b => ({
    ...b,
    ctr: b.view_count > 0 ? ((b.click_count / b.view_count) * 100).toFixed(2) : "0.00",
  }));

  return { success: true, data: stats };
}

/* ── 최근 7일 클릭 추이 (특정 배너) ── */
export async function getBannerClickTrend(bannerId: string) {
  const supabase = getAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("banner_clicks")
    .select("clicked_at")
    .eq("banner_id", bannerId)
    .gte("clicked_at", sevenDaysAgo)
    .order("clicked_at", { ascending: true });

  if (error) return { success: false, error: error.message, data: [] };

  // 일별 그룹핑
  const daily: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    daily[d.toISOString().split("T")[0]] = 0;
  }
  (data || []).forEach(row => {
    const day = new Date(row.clicked_at).toISOString().split("T")[0];
    if (daily[day] !== undefined) daily[day]++;
  });

  return { success: true, data: Object.entries(daily).map(([date, count]) => ({ date, count })) };
}
