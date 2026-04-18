"use server";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache, revalidateTag } from "next/cache";

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
  thumbnail_url?: string;
  reject_reason?: string;
  is_important?: boolean;
  is_headline?: boolean;
}) {
  const supabase = getAdminClient();

  try {
    // status 매핑 (한글 → DB 값)
    const statusMap: Record<string, string> = {
      "작성중": "DRAFT",
      "승인신청": "PENDING",
      "승인": "APPROVED",
      "광고중": "APPROVED",
      "반려": "REJECTED",
      "삭제": "DELETED",
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
      thumbnail_url: data.thumbnail_url || null,
      updated_at: new Date().toISOString(),
    };
    if (data.reject_reason !== undefined) {
      (articleData as any).reject_reason = data.reject_reason;
    }
    if (data.is_important !== undefined) {
      (articleData as any).is_important = data.is_important;
    }
    if (data.is_headline !== undefined) {
      (articleData as any).is_headline = data.is_headline;
    }

    let articleId = data.id;

    if (articleId) {
      // 수정
      const { error } = await supabase
        .from("articles")
        .update(articleData)
        .eq("id", articleId);
      if (error) {
        if (error.message.includes("reject_reason")) {
           console.warn("❌ reject_reason column missing in DB. Ignoring reject_reason.");
           delete (articleData as any).reject_reason;
           const { error: fallbackError } = await supabase.from("articles").update(articleData).eq("id", articleId);
           if (fallbackError) return { success: false, error: fallbackError.message };
        } else {
           return { success: false, error: error.message };
        }
      }
    } else {
      // 신규
      const { data: inserted, error } = await supabase
        .from("articles")
        .insert(articleData)
        .select("id")
        .single();
      if (error) {
        if (error.message.includes("reject_reason")) {
           console.warn("❌ reject_reason column missing in DB. Ignoring reject_reason.");
           delete (articleData as any).reject_reason;
           const { data: fallbackInserted, error: fallbackError } = await supabase.from("articles").insert(articleData).select("id").single();
           if (fallbackError) return { success: false, error: fallbackError.message };
           articleId = fallbackInserted.id;
        } else {
           return { success: false, error: error.message };
        }
      } else {
        articleId = inserted.id;
      }
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

    // 캐시 무효화 (목록 및 상세 즉시 갱신)
    // @ts-ignore
    revalidateTag("articles");

    return { success: true, articleId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 캐싱된 기사 목록 조회 (기본) ── */
const getArticlesCached = unstable_cache(
  async (filters?: { status?: string; section1?: string; section2?: string | string[]; is_important?: boolean; is_headline?: boolean; limit?: number; keyword?: string; author_name?: string }) => {
    const supabase = getAdminClient();
    let query = supabase
      .from("articles")
      .select("id, article_no, status, section1, section2, title, subtitle, content, author_name, author_id, published_at, created_at, updated_at, is_deleted, thumbnail_url, view_count, lat, lng, location_name, youtube_url, is_important, is_headline, reject_reason, article_keywords(keyword)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.section1) query = query.eq("section1", filters.section1);
    if (filters?.section2) {
      if (Array.isArray(filters.section2)) {
        query = query.in("section2", filters.section2);
      } else {
        query = query.eq("section2", filters.section2);
      }
    }
    if (filters?.is_important !== undefined) query = query.eq("is_important", filters.is_important);
    if (filters?.is_headline !== undefined) query = query.eq("is_headline", filters.is_headline);
    if (filters?.author_name) query = query.eq("author_name", filters.author_name);
    
    if (filters?.keyword) {
      // 키워드로 검색된 article_id 목록 추출
      const { data: kwData, error: kwError } = await supabase
        .from("article_keywords")
        .select("article_id")
        .eq("keyword", filters.keyword);
        
      if (!kwError && kwData && kwData.length > 0) {
        query = query.in("id", kwData.map((k: any) => k.article_id));
      } else {
        // 일치하는 키워드가 없는 경우 빈 배열 즉시 리턴
        return { success: true, data: [] };
      }
    }

    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },
  ["articles-list"],
  { tags: ["articles"], revalidate: 300 } // 5분 캐시
);

export async function getArticles(filters?: {
  status?: string;
  section1?: string;
  section2?: string | string[];
  is_important?: boolean;
  is_headline?: boolean;
  limit?: number;
  keyword?: string;
  author_name?: string;
}) {
  return await getArticlesCached(filters);
}

/* ── 회원 본인 기사만 조회 (author_id 필터링) ── */
export async function getMyArticles(authorId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, article_no, status, section1, section2, title, subtitle, content, author_name, author_id, published_at, created_at, updated_at, is_deleted, thumbnail_url, view_count, lat, lng, location_name, youtube_url, is_important, is_headline, article_keywords(keyword)")
      .eq("is_deleted", false)
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 기사 상세 조회 (캐싱 적용) ── */
const getArticleDetailCached = unstable_cache(
  async (articleIdentifier: string) => {
    const supabase = getAdminClient();
    let query = supabase
      .from("articles")
      .select("*, article_keywords(keyword), article_media(*)");
      
    // 숫자로만 구성된 경우 article_no 로 조회, 아니면 id(UUID) 로 조회
    if (/^[0-9]+$/.test(articleIdentifier)) {
      query = query.eq("article_no", parseInt(articleIdentifier, 10));
    } else {
      query = query.eq("id", articleIdentifier);
    }
    
    const { data, error } = await query.single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },
  ["article-detail"],
  { tags: ["articles"], revalidate: 3600 }
);

export async function getArticleDetail(articleId: string) {
  return await getArticleDetailCached(articleId);
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
    
    // @ts-ignore
    revalidateTag("articles"); // 캐시 무효화
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 포토DB 목록 조회 (최근 업로드된 사진들) ── */
export async function getPhotoLibrary(filters?: {
  search?: string;
  isFavorite?: boolean;
  limit?: number;
}) {
  const supabase = getAdminClient();

  try {
    let query = supabase
      .from("article_media")
      .select("id, url, filename, caption, is_favorite, created_at, file_size")
      .eq("media_type", "PHOTO")
      .order("created_at", { ascending: false });

    if (filters?.isFavorite) {
      query = query.eq("is_favorite", true);
    }
    if (filters?.search) {
      // filename or caption 검색
      query = query.or(`filename.ilike.%${filters.search}%,caption.ilike.%${filters.search}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 포토DB 즐겨찾기 토글 ── */
export async function togglePhotoFavorite(mediaId: string, isFavorite: boolean) {
  const supabase = getAdminClient();

  try {
    const { error } = await supabase
      .from("article_media")
      .update({ is_favorite: isFavorite })
      .eq("id", mediaId);
      
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 관리자 기사 일괄 상태 수정 ── */
export async function adminUpdateArticleStatus(articleIds: string[], status: 'APPROVED' | 'REJECTED' | 'DRAFT' | 'PENDING', reject_reason?: string) {
  const supabase = getAdminClient();

  try {
    const updateData: any = { status };
    if (reject_reason) {
      updateData.reject_reason = reject_reason;
    }

    const { error } = await supabase
      .from("articles")
      .update(updateData)
      .in("id", articleIds);
      
    if (error) {
      if (error.message.includes("reject_reason")) {
        console.warn("❌ reject_reason column missing in DB. Ignoring reject_reason.");
        const { error: fallbackError } = await supabase.from("articles").update({ status }).in("id", articleIds);
        if (fallbackError) return { success: false, error: fallbackError.message };
        
        // @ts-ignore
        revalidateTag("articles"); // 캐시 무효화
        return { success: true };
      }
      return { success: false, error: error.message };
    }
    
    // @ts-ignore
    revalidateTag("articles"); // 캐시 무효화
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 관리자 기사 노출 유형(광고) 일괄 수정 ── */
export async function adminUpdateArticleFlags(articleId: string, isImportant: boolean, isHeadline: boolean) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("articles")
      .update({ is_important: isImportant, is_headline: isHeadline })
      .eq("id", articleId);
      
    if (error) return { success: false, error: error.message };
    
    // @ts-ignore
    revalidateTag("articles"); // 캐시 무효화
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 기사 조회수 1 증가 ── */
export async function incrementArticleView(articleId: string) {
  const supabase = getAdminClient();
  try {
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("view_count")
      .eq("id", articleId)
      .single();

    if (fetchError || !article) return { success: false, error: fetchError?.message };

    const newViewCount = (article.view_count || 0) + 1;

    const { error: updateError } = await supabase
      .from("articles")
      .update({ view_count: newViewCount })
      .eq("id", articleId);

    if (updateError) return { success: false, error: updateError.message };

    // 캐시 무효화 삭제: 조회수+1 할 때마다 전체 기사 목록 캐시가 초기화되는 레이턴시 문제 방지
    // revalidateTag("articles");
    
    return { success: true, view_count: newViewCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
