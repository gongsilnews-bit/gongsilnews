"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getUserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // 서버 액션에서 cookies()를 사용할 때는 @supabase/ssr 패키지를 권장하지만, 
  // 기존 코드 스타일(단순 createClient)을 유지하거나 관리자 클라이언트 위주로 처리합니다.
  return createClient(supabaseUrl, anonKey);
}

// 1. 댓글 목록 조회
export async function getComments(articleId: string, currentUserId?: string | null) {
  const supabase = getAdminClient();
  try {
    // 댓글 패치
    const { data: comments, error } = await supabase
      .from("article_comments")
      .select("*")
      .eq("article_id", articleId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // 좋아요/싫어요 카운트 및 내가 누른 상태 계산을 위해 likes 테이블 조회
    const commentIds = (comments || []).map(c => c.id);
    let likesData: any[] = [];
    if (commentIds.length > 0) {
      const { data: likes } = await supabase
        .from("article_comment_likes")
        .select("*")
        .in("comment_id", commentIds);
      likesData = likes || [];
    }

    // 결과 매핑
    const result = (comments || []).map(c => {
      const cLikes = likesData.filter(l => l.comment_id === c.id);
      return {
        ...c,
        likeCount: cLikes.filter(l => l.type === 'LIKE').length,
        dislikeCount: cLikes.filter(l => l.type === 'DISLIKE').length,
        myLike: currentUserId ? cLikes.find(l => l.user_id === currentUserId)?.type : null,
      };
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("댓글 조회 오류:", error);
    return { success: false, error: error.message };
  }
}

// 2. 댓글 등록
export async function addComment(articleId: string, content: string, isSecret: boolean, authorId: string, authorName: string, parentId?: string | null) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("article_comments")
      .insert({
        article_id: articleId,
        author_id: authorId,
        author_name: authorName,
        content,
        is_secret: isSecret,
        parent_id: parentId || null,
      });
      
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("댓글 등록 오류:", error);
    return { success: false, error: error.message };
  }
}

// 3. 좋아요 / 싫어요 토글
export async function toggleCommentLike(commentId: string, userId: string, type: 'LIKE'|'DISLIKE') {
  const supabase = getAdminClient();
  try {
    // 기존에 누른 이력이 있는지 확인
    const { data: existing } = await supabase
      .from("article_comment_likes")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      if (existing.type === type) {
        // 똑같은 걸 다시 누르면 취소 (삭제)
        await supabase.from("article_comment_likes").delete().eq("id", existing.id);
      } else {
        // 다른 걸 누르면 변경 (업데이트)
        await supabase.from("article_comment_likes").update({ type }).eq("id", existing.id);
      }
    } else {
      // 없으면 신규 추가
      await supabase.from("article_comment_likes").insert({
        comment_id: commentId,
        user_id: userId,
        type,
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error("좋아요/싫어요 오류:", error);
    return { success: false, error: error.message };
  }
}

// 4. 댓글 삭제 (소프트 딜리트 방식)
export async function deleteComment(commentId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    // 작성자 본인 확인 필요
    const { data: comment } = await supabase
      .from("article_comments")
      .select("author_id")
      .eq("id", commentId)
      .single();

    // 관리자이거나 (별도 역할 확인은 생략), 작성자 본인일 경우 삭제 가능
    if (comment?.author_id !== userId) {
      throw new Error("삭제 권한이 없습니다.");
    }

    const { error } = await supabase
      .from("article_comments")
      .update({ is_deleted: true })
      .eq("id", commentId);
      
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("댓글 삭제 오류:", error);
    return { success: false, error: error.message };
  }
}

// 5. 댓글 수정
export async function editComment(commentId: string, userId: string, newContent: string) {
  const supabase = getAdminClient();
  try {
    // 작성자 본인 확인
    const { data: comment } = await supabase
      .from("article_comments")
      .select("author_id")
      .eq("id", commentId)
      .single();

    if (comment?.author_id !== userId) {
      throw new Error("수정 권한이 없습니다.");
    }

    const { error } = await supabase
      .from("article_comments")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", commentId);
      
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("댓글 수정 오류:", error);
    return { success: false, error: error.message };
  }
}

// ── 6. 내 콘텐츠(기사/공실/특강)에 달린 댓글 전체 조회 ──
export async function getCommentsOnMyContent(userId: string) {
  const supabase = getAdminClient();
  try {
    // 기사 댓글: 내가 쓴 기사에 달린 댓글
    const { data: articleComments } = await supabase
      .from("article_comments")
      .select("id, article_id, author_id, author_name, content, is_secret, parent_id, created_at, articles!inner(title, author_id)")
      .eq("articles.author_id", userId)
      .eq("is_deleted", false)
      .neq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    // 공실 댓글: 내가 등록한 공실에 달린 댓글
    const { data: vacancyComments } = await supabase
      .from("vacancy_comments")
      .select("id, vacancy_id, author_id, author_name, content, is_secret, parent_id, created_at, vacancies!inner(title, owner_id)")
      .eq("vacancies.owner_id", userId)
      .neq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    // 특강/게시판 댓글: 내가 쓴 게시글에 달린 댓글
    const { data: boardComments } = await supabase
      .from("board_comments")
      .select("id, post_id, author_id, author_name, content, parent_id, created_at, board_posts!inner(title, author_id)")
      .eq("board_posts.author_id", userId)
      .eq("is_deleted", false)
      .neq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const mapped = [
      ...(articleComments || []).map((c: any) => ({
        id: c.id,
        type: "article" as const,
        sourceId: c.article_id,
        sourceTitle: c.articles?.title || "(삭제된 기사)",
        authorId: c.author_id,
        authorName: c.author_name || "익명",
        content: c.content,
        isSecret: c.is_secret || false,
        parentId: c.parent_id,
        createdAt: c.created_at,
      })),
      ...(vacancyComments || []).map((c: any) => ({
        id: c.id,
        type: "vacancy" as const,
        sourceId: c.vacancy_id,
        sourceTitle: c.vacancies?.title || "(삭제된 매물)",
        authorId: c.author_id,
        authorName: c.author_name || "익명",
        content: c.content,
        isSecret: c.is_secret || false,
        parentId: c.parent_id,
        createdAt: c.created_at,
      })),
      ...(boardComments || []).map((c: any) => ({
        id: c.id,
        type: "board" as const,
        sourceId: c.post_id,
        sourceTitle: c.board_posts?.title || "(삭제된 게시글)",
        authorId: c.author_id,
        authorName: c.author_name || "익명",
        content: c.content,
        isSecret: false,
        parentId: c.parent_id,
        createdAt: c.created_at,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, data: mapped };
  } catch (error: any) {
    console.error("내 콘텐츠 댓글 조회 오류:", error);
    return { success: false, error: error.message, data: [] };
  }
}

// ── 7. 내가 단 댓글에 달린 답글 조회 ──
export async function getRepliesOnMyComments(userId: string) {
  const supabase = getAdminClient();
  try {
    // 1) 내가 쓴 기사 댓글 ID 수집
    const { data: myArticleComments } = await supabase
      .from("article_comments")
      .select("id, article_id, content, articles(title)")
      .eq("author_id", userId)
      .eq("is_deleted", false);

    const myArticleIds = (myArticleComments || []).map((c: any) => c.id);
    let articleReplies: any[] = [];
    if (myArticleIds.length > 0) {
      const { data } = await supabase
        .from("article_comments")
        .select("id, article_id, author_id, author_name, content, is_secret, parent_id, created_at, articles(title)")
        .in("parent_id", myArticleIds)
        .eq("is_deleted", false)
        .neq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      articleReplies = data || [];
    }

    // 2) 내가 쓴 공실 댓글 ID 수집
    const { data: myVacancyComments } = await supabase
      .from("vacancy_comments")
      .select("id, vacancy_id, content, vacancies(title)")
      .eq("author_id", userId);

    const myVacancyIds = (myVacancyComments || []).map((c: any) => c.id);
    let vacancyReplies: any[] = [];
    if (myVacancyIds.length > 0) {
      const { data } = await supabase
        .from("vacancy_comments")
        .select("id, vacancy_id, author_id, author_name, content, is_secret, parent_id, created_at, vacancies(title)")
        .in("parent_id", myVacancyIds)
        .neq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      vacancyReplies = data || [];
    }

    // 3) 내가 쓴 게시판 댓글 ID 수집
    const { data: myBoardComments } = await supabase
      .from("board_comments")
      .select("id, post_id, content, board_posts(title)")
      .eq("author_id", userId)
      .eq("is_deleted", false);

    const myBoardIds = (myBoardComments || []).map((c: any) => c.id);
    let boardReplies: any[] = [];
    if (myBoardIds.length > 0) {
      const { data } = await supabase
        .from("board_comments")
        .select("id, post_id, author_id, author_name, content, parent_id, created_at, board_posts(title)")
        .in("parent_id", myBoardIds)
        .eq("is_deleted", false)
        .neq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      boardReplies = data || [];
    }

    // 내 원댓글 맵 (원댓글 내용 표시용)
    const myCommentMap: Record<string, { content: string; sourceTitle: string }> = {};
    (myArticleComments || []).forEach((c: any) => {
      myCommentMap[c.id] = { content: c.content, sourceTitle: c.articles?.title || "" };
    });
    (myVacancyComments || []).forEach((c: any) => {
      myCommentMap[c.id] = { content: c.content, sourceTitle: c.vacancies?.title || "" };
    });
    (myBoardComments || []).forEach((c: any) => {
      myCommentMap[c.id] = { content: c.content, sourceTitle: c.board_posts?.title || "" };
    });

    const mapped = [
      ...articleReplies.map((r: any) => ({
        id: r.id,
        type: "article" as const,
        sourceId: r.article_id,
        sourceTitle: r.articles?.title || "(삭제된 기사)",
        authorId: r.author_id,
        authorName: r.author_name || "익명",
        content: r.content,
        isSecret: r.is_secret || false,
        parentId: r.parent_id,
        myOriginalComment: myCommentMap[r.parent_id]?.content || "",
        createdAt: r.created_at,
      })),
      ...vacancyReplies.map((r: any) => ({
        id: r.id,
        type: "vacancy" as const,
        sourceId: r.vacancy_id,
        sourceTitle: r.vacancies?.title || "(삭제된 매물)",
        authorId: r.author_id,
        authorName: r.author_name || "익명",
        content: r.content,
        isSecret: r.is_secret || false,
        parentId: r.parent_id,
        myOriginalComment: myCommentMap[r.parent_id]?.content || "",
        createdAt: r.created_at,
      })),
      ...boardReplies.map((r: any) => ({
        id: r.id,
        type: "board" as const,
        sourceId: r.post_id,
        sourceTitle: r.board_posts?.title || "(삭제된 게시글)",
        authorId: r.author_id,
        authorName: r.author_name || "익명",
        content: r.content,
        isSecret: false,
        parentId: r.parent_id,
        myOriginalComment: myCommentMap[r.parent_id]?.content || "",
        createdAt: r.created_at,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, data: mapped };
  } catch (error: any) {
    console.error("내 댓글 답글 조회 오류:", error);
    return { success: false, error: error.message, data: [] };
  }
}

// ── 8. 답글 등록 (타입별 분기) ──
export async function addReplyToComment(
  type: "article" | "vacancy" | "board",
  parentId: string,
  sourceId: string,
  content: string,
  authorId: string,
  authorName: string
) {
  const supabase = getAdminClient();
  try {
    if (type === "article") {
      const { error } = await supabase.from("article_comments").insert({
        article_id: sourceId,
        author_id: authorId,
        author_name: authorName,
        content,
        parent_id: parentId,
        is_secret: false,
      });
      if (error) throw error;
    } else if (type === "vacancy") {
      const { error } = await supabase.from("vacancy_comments").insert({
        vacancy_id: sourceId,
        author_id: authorId,
        author_name: authorName,
        content,
        parent_id: parentId,
        is_secret: false,
      });
      if (error) throw error;
    } else if (type === "board") {
      const { error } = await supabase.from("board_comments").insert({
        post_id: sourceId,
        author_id: authorId,
        author_name: authorName,
        content,
        parent_id: parentId,
      });
      if (error) throw error;
    }
    return { success: true };
  } catch (error: any) {
    console.error("답글 등록 오류:", error);
    return { success: false, error: error.message };
  }
}
