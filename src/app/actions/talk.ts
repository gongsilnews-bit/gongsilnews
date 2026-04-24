"use server"

import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  });
}

export interface TalkItem {
  id: string;
  sourceType: "vacancy" | "article";
  sourceId: string;
  sourceTitle: string;
  authorId: string;
  authorName: string;
  content: string;
  isSecret: boolean;
  isRead: boolean;
  isReplied: boolean;
  createdAt: string;
  parentId?: string;
}

/**
 * 공실Talk: 전체 댓글/문의 통합 조회
 * - article_comments + vacancy_comments를 합쳐서 최신순으로 반환
 * - role=admin일 때는 전체, role=realtor/user일 때는 해당 memberId만
 */
export async function getAllTalkItems(memberId?: string): Promise<{ success: boolean; data?: TalkItem[]; error?: string }> {
  const supabase = getAdminClient();
  try {
    // 1. 기사 댓글 조회
    let articleQuery = supabase
      .from("article_comments")
      .select("id, article_id, author_id, author_name, content, is_secret, is_deleted, created_at, parent_id")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(100);

    // 2. 공실 댓글 조회
    let vacancyQuery = supabase
      .from("vacancy_comments")
      .select("id, vacancy_id, author_id, author_name, content, is_secret, created_at, parent_id")
      .order("created_at", { ascending: false })
      .limit(100);

    const [articleRes, vacancyRes] = await Promise.all([articleQuery, vacancyQuery]);

    if (articleRes.error) throw articleRes.error;
    if (vacancyRes.error) throw vacancyRes.error;

    // 3. 기사 ID → 제목 매핑
    const articleIds = [...new Set((articleRes.data || []).map(c => c.article_id))];
    let articleTitleMap: Record<string, string> = {};
    if (articleIds.length > 0) {
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title")
        .in("id", articleIds);
      (articles || []).forEach(a => { articleTitleMap[a.id] = a.title; });
    }

    // 4. 공실 ID → 제목 매핑
    const vacancyIds = [...new Set((vacancyRes.data || []).map(c => c.vacancy_id))];
    let vacancyTitleMap: Record<string, string> = {};
    if (vacancyIds.length > 0) {
      const { data: vacancies } = await supabase
        .from("vacancies")
        .select("id, title")
        .in("id", vacancyIds);
      (vacancies || []).forEach(v => { vacancyTitleMap[v.id] = v.title; });
    }

    // 5. 통합 매핑
    const articleTalks: TalkItem[] = (articleRes.data || []).map(c => ({
      id: `article_${c.id}`,
      sourceType: "article" as const,
      sourceId: c.article_id,
      sourceTitle: articleTitleMap[c.article_id] || "(삭제된 기사)",
      authorId: c.author_id,
      authorName: c.author_name || "익명",
      content: c.content,
      isSecret: c.is_secret || false,
      isRead: true,
      isReplied: !!c.parent_id,
      createdAt: c.created_at,
      parentId: c.parent_id ? `article_${c.parent_id}` : undefined,
    }));

    const vacancyTalks: TalkItem[] = (vacancyRes.data || []).map(c => ({
      id: `vacancy_${c.id}`,
      sourceType: "vacancy" as const,
      sourceId: c.vacancy_id,
      sourceTitle: vacancyTitleMap[c.vacancy_id] || "(삭제된 매물)",
      authorId: c.author_id,
      authorName: c.author_name || "익명",
      content: c.content,
      isSecret: c.is_secret || false,
      isRead: true,
      isReplied: !!c.parent_id,
      createdAt: c.created_at,
      parentId: c.parent_id ? `vacancy_${c.parent_id}` : undefined,
    }));

    // 6. 합치고 최신순 정렬
    const allTalks = [...articleTalks, ...vacancyTalks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 7. memberId 필터 (부동산/일반 유저용)
    let result = allTalks;
    if (memberId) {
      // 내가 소유한 매물 ID 목록 가져오기
      const { data: myVacancies } = await supabase
        .from("vacancies")
        .select("id")
        .eq("owner_id", memberId);
      const myVacancyIds = new Set((myVacancies || []).map(v => v.id));

      // 내가 쓴 댓글 ID 모음 (답글 타겟 검사용)
      const myMessageIds = new Set(allTalks.filter(t => t.authorId === memberId).map(t => t.id));

      // 내가 기자인 기사 ID 목록 가져오기
      const { data: myArticles } = await supabase
        .from("articles")
        .select("id")
        .eq("author_id", memberId);
      const myArticleIds = new Set((myArticles || []).map(a => a.id));

      // 1. 내가 주인이면(내 매물/내 기사) -> 해당 방의 전체 메시지 보임
      // 2. 일반 댓글러면 -> "방 단위"가 아니라 "내가 쓴 메시지이거나, 내 메시지에 달린 답글"만 보임
      const mySourceIdsAsOwner = new Set<string>();
      allTalks.forEach(t => {
        if (
          (t.sourceType === "vacancy" && myVacancyIds.has(t.sourceId)) ||
          (t.sourceType === "article" && myArticleIds.has(t.sourceId))
        ) {
          mySourceIdsAsOwner.add(t.sourceId);
        }
      });

      result = allTalks.filter(t => {
        if (mySourceIdsAsOwner.has(t.sourceId)) return true;
        
        // 주인이 아니면, 권한 체크 (내가 썼거나, 내 글에 대한 답글이거나)
        if (t.authorId === memberId) return true;
        if (t.parentId && myMessageIds.has(t.parentId)) return true;
        return false;
      });
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("공실Talk 조회 오류:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 공실Talk: 댓글 답글 저장
 * sourceType에 따라 article_comments 또는 vacancy_comments 테이블에 INSERT
 */
export async function replyToTalk(params: {
  sourceType: "article" | "vacancy";
  sourceId: string;
  authorId: string;
  authorName: string;
  content: string;
  isSecret?: boolean;
  parentId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  try {
    if (params.sourceType === "article") {
      const { error } = await supabase
        .from("article_comments")
        .insert({
          article_id: params.sourceId,
          author_id: params.authorId,
          author_name: params.authorName,
          content: params.content,
          is_secret: params.isSecret || false,
          parent_id: params.parentId ? params.parentId.split("_")[1] : undefined,
        });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("vacancy_comments")
        .insert({
          vacancy_id: params.sourceId,
          author_id: params.authorId,
          author_name: params.authorName,
          content: params.content,
          is_secret: params.isSecret || false,
          parent_id: params.parentId ? params.parentId.split("_")[1] : undefined,
        });
      if (error) throw error;
    }
    return { success: true };
  } catch (error: any) {
    console.error("공실Talk 답글 저장 오류:", error);
    return { success: false, error: error.message };
  }
}
