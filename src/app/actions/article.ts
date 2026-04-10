"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ── 기사 저장 (신규 + 수정 겸용) ── */
export async function saveArticle(data: {
  id?: string;
  author_id?: string;
  author_name: string;
  author_email: string;
  status: string;
  form_type: string;
  section1: string;
  section2: string;
  series: string;
  title: string;
  subtitle: string;
  content: string;
  youtube_url: string;
  is_shorts: boolean;
  lat?: number | null;
  lng?: number | null;
  location_name?: string;
  published_at: string | null;
  keywords: string[];
}) {
  const supabase = getAdminClient();

  try {
    // status 매핑 (한글 → DB 값)
    const statusMap: Record<string, string> = {
      "작성중": "DRAFT",
      "승인신청": "PENDING",
      "반려": "REJECTED",
    };
    const formTypeMap: Record<string, string> = {
      "일반": "NORMAL",
      "카드뉴스": "CARD_NEWS",
      "갤러리": "GALLERY",
    };

    const articleData = {
      author_id: data.author_id || null,
      author_name: data.author_name,
      author_email: data.author_email,
      status: statusMap[data.status] || data.status,
      form_type: formTypeMap[data.form_type] || data.form_type,
      section1: data.section1 || null,
      section2: data.section2 || null,
      series: data.series || null,
      title: data.title,
      subtitle: data.subtitle || null,
      content: data.content || null,
      youtube_url: data.youtube_url || null,
      is_shorts: data.is_shorts,
      lat: data.lat || null,
      lng: data.lng || null,
      location_name: data.location_name || null,
      published_at: data.published_at || null,
      updated_at: new Date().toISOString(),
    };

    let articleId = data.id;

    if (articleId) {
      // 수정
      const { error } = await supabase
        .from("articles")
        .update(articleData)
        .eq("id", articleId);
      if (error) return { success: false, error: error.message };
    } else {
      // 신규
      const { data: inserted, error } = await supabase
        .from("articles")
        .insert(articleData)
        .select("id")
        .single();
      if (error) return { success: false, error: error.message };
      articleId = inserted.id;
    }

    // 키워드 처리: 기존 삭제 후 새로 INSERT
    if (articleId && data.keywords.length > 0) {
      await supabase
        .from("article_keywords")
        .delete()
        .eq("article_id", articleId);

      const keywordRows = data.keywords.map((kw) => ({
        article_id: articleId,
        keyword: kw,
      }));
      await supabase.from("article_keywords").insert(keywordRows);
    }

    return { success: true, articleId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 기사 목록 조회 ── */
export async function getArticles(filters?: {
  status?: string;
  section1?: string;
  section2?: string;
  limit?: number;
}) {
  const supabase = getAdminClient();

  try {
    let query = supabase
      .from("articles")
      .select("*, article_keywords(keyword)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.section1) query = query.eq("section1", filters.section1);
    if (filters?.section2) query = query.eq("section2", filters.section2);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 기사 상세 조회 ── */
export async function getArticleDetail(articleId: string) {
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*, article_keywords(keyword), article_media(*)")
      .eq("id", articleId)
      .single();
    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 기사 미디어 업로드 ── */
export async function uploadArticleMedia(formData: FormData) {
  const file = formData.get("file") as File;
  const articleId = formData.get("article_id") as string;
  const mediaType = formData.get("media_type") as string;
  const caption = formData.get("caption") as string;
  const sortOrder = parseInt(formData.get("sort_order") as string) || 0;

  if (!file || !articleId) {
    return { success: false, error: "파일 또는 기사ID가 누락되었습니다." };
  }

  const supabase = getAdminClient();

  try {
    const ext = file.name.split(".").pop() || "webp";
    const path = `articles/${articleId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("article-media")
      .upload(path, file, { upsert: true });
    if (uploadError) return { success: false, error: uploadError.message };

    const { data: urlData } = supabase.storage
      .from("article-media")
      .getPublicUrl(path);

    const { error: dbError } = await supabase.from("article_media").insert({
      article_id: articleId,
      media_type: mediaType || "PHOTO",
      url: urlData.publicUrl,
      filename: file.name,
      caption: caption || null,
      sort_order: sortOrder,
      file_size: file.size,
    });
    if (dbError) return { success: false, error: dbError.message };

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 기사 삭제 (소프트) ── */
export async function deleteArticle(articleId: string) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("articles")
      .update({ is_deleted: true })
      .eq("id", articleId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
