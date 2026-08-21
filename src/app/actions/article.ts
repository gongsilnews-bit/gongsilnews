"use server";
import { revalidatePath } from "next/cache";
import { reviewArticleByAI, isAgentAutoMode } from "@/app/actions/agentChat";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { getEffectivePlan } from "@/utils/planCheck";
import { formatSection1 } from "@/utils/formatCategory";

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

    // --- [권한/요금제 검증 (신규 작성 시에만)] ---
    if (!articleId && data.author_id) {
      const { data: member } = await supabase.from('members').select('*').eq('id', data.author_id).single();
      const plan = getEffectivePlan(member);

      if (plan !== 'news_premium' && plan !== 'admin') {
        return { success: false, error: "뉴스 기사 작성은 '공실뉴스부동산' 요금제 전용 기능입니다." };
      }

      if (plan === 'news_premium') {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { count, error: countErr } = await supabase
          .from('articles')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', data.author_id)
          .gte('created_at', firstDayOfMonth)
          .eq('is_deleted', false);

        if (countErr) return { success: false, error: "기사 작성 한도 확인 중 오류가 발생했습니다." };

        const maxArticles = member?.max_articles_per_month || 0;
        if (maxArticles <= 0 || (count || 0) >= maxArticles) {
          return { success: false, error: `이번 달 기사 작성 한도(${maxArticles}건)를 초과했거나 한도가 설정되지 않았습니다.` };
        }
      }
    }
    // ---------------------------------------------

    if (articleId) {
      // 수정 횟수 제한 체크 (발행된 기사만 카운트, 최고관리자는 제한 없음)
      const { data: existing } = await supabase.from("articles").select("edit_count, status, author_id").eq("id", articleId).single();
      
      // 관리자 여부 확인 (실제 편집을 요청한 로그인 유저가 관리자이거나 기사 작성자가 관리자인지 확인)
      let isAdmin = false;
      try {
        const serverSupabase = await createServerClient();
        const { data: { user: currentUser } } = await serverSupabase.auth.getUser();
        if (currentUser) {
          const { data: currentMember } = await supabase.from('members').select('role').eq('id', currentUser.id).single();
          if (currentMember?.role === 'ADMIN') isAdmin = true;
        }
      } catch (err) {
        console.error("Error checking editor role:", err);
      }

      if (!isAdmin && data.author_id) {
        const { data: authorMember } = await supabase.from('members').select('role').eq('id', data.author_id).single();
        if (authorMember?.role === 'ADMIN') isAdmin = true;
      }
      
      if (!isAdmin && existing && existing.status === "APPROVED" && (existing.edit_count || 0) >= 3) {
        return { success: false, error: "수정 가능 횟수(3회)를 초과했습니다. 기사를 삭제 후 새로 작성해 주세요." };
      }
      // 발행된 기사를 수정하면 edit_count 증가 (관리자도 카운트는 하되 제한만 안 걸림)
      if (existing && existing.status === "APPROVED") {
        (articleData as any).edit_count = (existing.edit_count || 0) + 1;
      }
      // 수정일(updated_at)을 현재 시간으로 동기화
      (articleData as any).updated_at = new Date().toISOString();
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
export async function getArticles(filters?: {
  status?: string;
  section1?: string;
  section2?: string | string[];
  is_important?: boolean;
  is_headline?: boolean;
  limit?: number;
  page?: number;
  keyword?: string;
  author_name?: string;
  author_id?: string;
  articleNo?: string;
  searchKeyword?: string;
  orderBy?: "published_at" | "updated_at" | "created_at";
  noCache?: boolean;
}) {
  const executeQuery = async () => {
    const supabase = getAdminClient();
    let query = supabase
      .from("articles")
      .select("id, article_no, status, section1, section2, title, subtitle, content, author_name, author_id, published_at, created_at, updated_at, is_deleted, thumbnail_url, view_count, lat, lng, location_name, youtube_url, is_important, is_headline, reject_reason, edit_count, article_keywords(keyword)", { count: "exact" })
      .eq("is_deleted", false);

    if (filters?.orderBy === "updated_at") {
      query = query.order("updated_at", { ascending: false });
    } else if (filters?.orderBy === "created_at" || filters?.status === "PENDING" || filters?.status === "DRAFT" || filters?.status === "REJECTED") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    }

    if (filters?.status) {
      if (filters.status === "SCHEDULED") {
        query = query.eq("status", "APPROVED");
        query = query.gt("published_at", new Date().toISOString());
      } else if (filters.status === "APPROVED") {
        query = query.eq("status", "APPROVED");
        query = query.or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);
      } else {
        query = query.eq("status", filters.status);
      }
    }
    if (filters?.section1) {
      if (filters.section1 === "공실뉴스" || filters.section1 === "공실현장") {
        query = query.in("section1", ["공실뉴스", "공실현장"]);
      } else if (filters.section1 === "부동산·경제" || filters.section1 === "정책시장") {
        query = query.in("section1", ["부동산·경제", "정책시장"]);
      } else if (filters.section1 === "AI마케팅" || filters.section1 === "AI중개실무") {
        query = query.in("section1", ["AI마케팅", "AI중개실무"]);
      } else if (filters.section1 === "라이프·오피니언" || filters.section1 === "기타") {
        query = query.in("section1", ["라이프·오피니언", "기타"]);
      } else {
        query = query.eq("section1", filters.section1);
      }
    }
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
    if (filters?.author_id) query = query.eq("author_id", filters.author_id);
    
    if (filters?.articleNo) {
      query = query.eq("article_no", parseInt(filters.articleNo, 10));
    }
    if (filters?.searchKeyword) {
      const p = `%${filters.searchKeyword}%`;
      query = query.or(`title.ilike.${p},author_name.ilike.${p}`);
    }

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
        return { success: true, data: [], count: 0 };
      }
    }

    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    } else if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };
    const normalizedData = (data || []).map((a: any) => ({
      ...a,
      section1: formatSection1(a.section1)
    }));
    return { success: true, data: normalizedData, count: count || 0 };
  };

  if (filters?.noCache) {
    return await executeQuery();
  }

  const cacheKey = JSON.stringify(filters || {});
  const fetcher = unstable_cache(
    executeQuery,
    ["articles-list", cacheKey],
    { tags: ["articles"], revalidate: 60 }
  );

  return await fetcher();
}

/* ── 제목/본문 텍스트 검색 ── */
export async function searchArticles(query: string) {
  const supabase = getAdminClient();
  try {
    const searchPattern = `%${query}%`;
    const { data, error } = await supabase
      .from("articles")
      .select("id, article_no, status, section1, section2, title, subtitle, content, author_name, author_id, published_at, created_at, updated_at, is_deleted, thumbnail_url, view_count, lat, lng, location_name, youtube_url, is_important, is_headline, article_keywords(keyword)")
      .eq("is_deleted", false)
      .eq("status", "APPROVED")
      .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
      .or(`title.ilike.${searchPattern},subtitle.ilike.${searchPattern},content.ilike.${searchPattern}`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { success: false, error: error.message };
    const normalizedData = (data || []).map((a: any) => ({
      ...a,
      section1: formatSection1(a.section1)
    }));
    return { success: true, data: normalizedData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 회원 본인 기사만 조회 (author_id 필터링) ── */
export async function getMyArticles(authorId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, article_no, status, section1, section2, title, subtitle, content, author_name, author_id, published_at, created_at, updated_at, is_deleted, thumbnail_url, view_count, lat, lng, location_name, youtube_url, is_important, is_headline, reject_reason, edit_count, article_keywords(keyword)")
      .eq("is_deleted", false)
      .eq("author_id", authorId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    const normalizedData = (data || []).map((a: any) => ({
      ...a,
      section1: formatSection1(a.section1)
    }));
    return { success: true, data: normalizedData };
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
    return {
      success: true,
      data: data ? { ...data, section1: formatSection1(data.section1) } : null
    };
  },
  ["article-detail"],
  { tags: ["articles"], revalidate: 3600 }
);

export async function getArticleDetail(articleId: string, noCache: boolean = false) {
  if (noCache) {
    const supabase = getAdminClient();
    let query = supabase
      .from("articles")
      .select("*, article_keywords(keyword), article_media(*)");
      
    if (/^[0-9]+$/.test(articleId)) {
      query = query.eq("article_no", parseInt(articleId, 10));
    } else {
      query = query.eq("id", articleId);
    }
    
    const { data, error } = await query.single();
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: data ? { ...data, section1: formatSection1(data.section1) } : null
    };
  }
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
    revalidateTag("articles");
    revalidatePath("/", "layout");
    
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
  authorId?: string | null;
}) {
  const supabase = getAdminClient();

  try {
    let query = supabase
      .from("article_media")
      .select(`id, url, filename, caption, is_favorite, created_at, file_size${filters?.authorId ? ', articles!inner(author_id)' : ''}`)
      .eq("media_type", "PHOTO")
      .order("created_at", { ascending: false });

    if (filters?.authorId) {
      query = query.eq('articles.author_id', filters.authorId);
    }
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
    // 승인(APPROVED) 처리할 때 발행일(published_at)을 승인 시점(현재시간)으로 동기화
    if (status === 'APPROVED') {
      updateData.published_at = new Date().toISOString();
    }
    // 상태 변경도 변경사항이므로 수정일(updated_at)을 현재 시간으로 동기화
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("articles")
      .update(updateData)
      .in("id", articleIds);
      
    if (error) {
      if (error.message.includes("reject_reason")) {
        console.warn("❌ reject_reason column missing in DB. Ignoring reject_reason.");
        const fallbackUpdateData = { ...updateData };
        delete fallbackUpdateData.reject_reason;
        const { error: fallbackError } = await supabase.from("articles").update(fallbackUpdateData).in("id", articleIds);
        if (fallbackError) return { success: false, error: fallbackError.message };
        
        // @ts-ignore
        revalidateTag("articles");
    revalidatePath("/", "layout");
        return { success: true };
      }
      return { success: false, error: error.message };
    }
    // @ts-ignore
    revalidateTag("articles");
    revalidatePath("/", "layout");

    // 반려(REJECTED)와 동시에 반려 사유가 있으면 기사작성 + 사진 에이전트가 즉시 재작성하여 [승인대기]로 자동 이동
    if (status === 'REJECTED' && reject_reason && reject_reason.trim()) {
      for (const id of articleIds) {
        adminReviseArticleWithFeedback(id, reject_reason).catch(e => console.error("Auto revise on reject error:", e));
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ── 최고관리자 반려 사유를 반영한 AI 기사 자동 재작성 및 승인대기 이동 ── */
export async function adminReviseArticleWithFeedback(articleId: string, feedback: string) {
  const supabase = getAdminClient();

  try {
    const { data: article, error: fetchErr } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (fetchErr || !article) {
      return { success: false, error: "기사를 찾을 수 없습니다." };
    }

    const { generateWithGemini } = await import("@/lib/agents/core");

    const prompt = `너는 대한민국 1등 경제·부동산 종합 언론사 '공실뉴스'의 [수석 편집국장 AI]야.
방금 작성된 기사에 대해 최고관리자(발행인)로부터 다음과 같은 [반려 사유 및 수정 지시사항]이 접수되었다.

[기존 기사 정보]
- 카테고리: [${article.section2 || article.section1 || '부동산·경제'}]
- 기존 제목: "${article.title}"
- 기존 부제목: "${article.subtitle || ''}"
- 기존 본문:
${article.content}

[최고관리자 반려 사유 및 필수 보완 지시사항]
"${feedback}"

[재작성 및 수정 지침 - ★필수 준수★]
1. **최고관리자의 지적 및 요구사항을 100% 철저하게 반영**하여 기사를 전문적이고 완성도 높게 재구성하라.
2. 기존 기사의 팩트와 구조를 살리면서, 지적된 미흡한 부분(예: 구체적 통계 수치 보강, 법적/세무 쟁점 상세화, 시장 영향 분석 심화 등)을 완벽히 보완하라.
3. **공실뉴스 시그니처 포맷 유지**:
   - 3줄 핵심 요약 부제목 (각 줄은 줄바꿈 \\n으로 구분)
   - 본문 내 3개의 맞춤형 소제목 (<b>■ ...</b>)
   - 본문 최하단에 [■ 공실뉴스 시장전망 & 체크포인트] 심층 분석 박스 포함
4. 타 언론사 명칭 및 외부 링크는 일체 기재하지 않는다.

출력 포맷: 반드시 아래 JSON 형식으로만 순수 JSON을 출력하라:
\`\`\`json
{
  "title": "수정 및 고도화된 메인 헤드라인",
  "subtitle": "수정된 3줄 부제목 1행\\n수정된 3줄 부제목 2행\\n수정된 3줄 부제목 3행",
  "content": "<p>수정된 기사 본문 문단들...</p><p><b>■ 소제목 1</b><br>문단 내용...</p><p><b>■ 소제목 2</b><br>문단 내용...</p><p><b>■ 소제목 3</b><br>문단 내용...</p><div style=\\"margin-top:28px;padding:20px;background:#f8fafc;border-left:4px solid #3b82f6;border-radius:8px;\\"><h4 style=\\"margin:0 0 10px 0;font-size:15px;color:#1e293b;font-weight:800;\\">■ 공실뉴스 시장전망 & 체크포인트</h4><p style=\\"margin:0;font-size:13.5px;line-height:1.7;color:#475569;\\">수정된 시장 전망 및 전문가 체크포인트 분석 내용...</p></div>"
}
\`\`\``;

    const res = await generateWithGemini(prompt, { temperature: 0.3 });
    const text = res.text;

    let parsed: any = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("JSON parse failed, fallback to raw text", e);
    }

    const newTitle = parsed?.title || article.title;
    const newSubtitle = parsed?.subtitle || article.subtitle;
    const newContent = parsed?.content || text;

    // 2. 기사 동영상/사진 에이전트 가동 (반려 사유에 사진/이미지 요청사항이 있으면 나노바나나 AI 실사 즉시 생성 및 교체)
    let newThumbnailUrl = article.thumbnail_url;
    let newMediaType = article.media_type;
    let newYoutubeUrl = article.youtube_url;

    try {
      const { PhotoCurationAgent } = await import("@/lib/agents/PhotoCurationAgent");
      const media = await PhotoCurationAgent.resolvePhoto({
        category: article.section2 || article.section1 || "부동산·경제",
        articleTitle: newTitle,
        articleSubtitle: newSubtitle,
        articleContent: newContent,
        sourceUrl: article.source_url || article.sourceUrl,
        mediaType: article.media_type,
        userFeedback: feedback,
        userEmail: article.author_email || "gongsilnews@gmail.com",
      });

      if (media?.thumbnailUrl) {
        newThumbnailUrl = media.thumbnailUrl;
        newMediaType = media.mediaType || "image";
        if (media.youtubeUrl) newYoutubeUrl = media.youtubeUrl;
      }
    } catch (mediaErr) {
      console.warn("Photo revision failed, keeping existing photo:", mediaErr);
    }

    // Supabase DB 업데이트: 수정된 기사 + 새 사진 반영 및 상태를 'APPROVED'(정식 발행)으로 즉시 재발행
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("articles")
      .update({
        title: newTitle,
        subtitle: newSubtitle,
        content: newContent,
        thumbnail_url: newThumbnailUrl,
        youtube_url: newYoutubeUrl || null,
        status: "APPROVED", // 수정 완료 후 즉시 정식 발행!
        published_at: nowIso,
        reject_reason: null,
        updated_at: nowIso,
      })
      .eq("id", articleId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // AI 로깅 (agent_chats)
    const tokens = res.usage?.totalTokens || 0;
    const costKrw = Math.round((tokens * 0.00000045) * 1380 * 100) / 100;
    await supabase.from("agent_chats").insert({
      channel_id: "article",
      role: "agent",
      content: `[gongsilnews@gmail.com] [반려 사유 반영 AI 기사 재작성 및 재발행] "${newTitle}" (피드백: ${feedback.slice(0, 40)}) - gemini-3.6-flash`,
      input_tokens: res.usage?.inputTokens || 0,
      output_tokens: res.usage?.outputTokens || 0,
      total_tokens: tokens,
      cost_krw: costKrw,
    });

    // @ts-ignore
    revalidateTag("articles");
    revalidatePath("/", "layout");

    return {
      success: true,
      revisedTitle: newTitle,
      revisedSubtitle: newSubtitle,
      revisedContent: newContent,
      message: "반려 사유를 반영하여 기사 및 사진이 성공적으로 재작성되었으며, 메인 뉴스에 즉시 재발행되었습니다."
    };
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
      .update({ 
        is_important: isImportant, 
        is_headline: isHeadline,
        updated_at: new Date().toISOString()
      })
      .eq("id", articleId);
      
    if (error) return { success: false, error: error.message };
    
    // @ts-ignore
    revalidateTag("articles");
    revalidatePath("/", "layout");
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

export async function getAuthorProfileByName(name: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase.from('members').select('*').eq('name', name).limit(1).maybeSingle();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAuthorProfileById(id: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase.from('members').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) return { success: false, error: error.message };
    
    // BIZ 회원이면 business_profiles에서 업종 정보도 가져옴
    if (data && data.role === 'BIZ') {
      const { data: bizProfile } = await supabase.from('business_profiles').select('business_type, company_name').eq('user_id', id).maybeSingle();
      if (bizProfile) {
        data.business_type = bizProfile.business_type;
        data.company_name = bizProfile.company_name;
      }
    }
    
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
