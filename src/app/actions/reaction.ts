"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 스티커(리액션) 목록 조회
export async function getArticleReactions(articleId: string, currentUserId?: string | null) {
  const supabase = getAdminClient();
  try {
    const { data: reactions, error } = await supabase
      .from("article_reactions")
      .select("*")
      .eq("article_id", articleId);

    if (error) throw error;

    // 카운트 계산
    const rs = reactions || [];
    const counts = {
      INFO: rs.filter(r => r.reaction_type === 'INFO').length,
      INTERESTING: rs.filter(r => r.reaction_type === 'INTERESTING').length,
      AGREE: rs.filter(r => r.reaction_type === 'AGREE').length,
      ANALYSIS: rs.filter(r => r.reaction_type === 'ANALYSIS').length,
      RECOMMEND: rs.filter(r => r.reaction_type === 'RECOMMEND').length,
    };

    const myReaction = currentUserId ? rs.find(r => r.user_id === currentUserId)?.reaction_type : null;

    return { success: true, counts, myReaction };
  } catch (error: any) {
    console.error("스티커 조회 오류:", error);
    return { success: false, error: error.message };
  }
}

// 스티커 토글
export async function toggleArticleReaction(articleId: string, userId: string, reactionType: string) {
  const supabase = getAdminClient();
  try {
    // 기존 누른 리액션 확인
    const { data: existing } = await supabase
      .from("article_reactions")
      .select("*")
      .eq("article_id", articleId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // 같은 걸 또 누르면 삭제(취소)
        await supabase.from("article_reactions").delete().eq("id", existing.id);
      } else {
        // 다른 걸 누르면 업데이트
        await supabase.from("article_reactions").update({ reaction_type: reactionType }).eq("id", existing.id);
      }
    } else {
      // 없으면 신규 추가
      await supabase.from("article_reactions").insert({
        article_id: articleId,
        user_id: userId,
        reaction_type: reactionType,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("스티커 토글 오류:", error);
    return { success: false, error: error.message };
  }
}
