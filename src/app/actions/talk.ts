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
      .select("id, vacancy_id, author_id, author_name, content, is_secret, created_at")
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
      isReplied: false,
      createdAt: c.created_at,
    }));

    // 6. 합치고 최신순 정렬
    const allTalks = [...articleTalks, ...vacancyTalks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 7. memberId 필터 (부동산/일반 유저용)
    const result = memberId 
      ? allTalks.filter(t => t.authorId === memberId)
      : allTalks;

    return { success: true, data: result };
  } catch (error: any) {
    console.error("공실Talk 조회 오류:", error);
    return { success: false, error: error.message };
  }
}
