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

