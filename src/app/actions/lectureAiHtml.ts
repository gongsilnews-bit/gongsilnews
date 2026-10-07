"use server"

import { createClient as createSessionClient } from '@/utils/supabase/server';
import { renderAiHtml } from '@/utils/aiHtml/renderAiHtml';

// 강의 글쓰기 화면의 "AI HTML 붙여넣기" 미리보기 — 상세 페이지와 같은 변환 결과를 돌려준다
export async function previewLectureAiHtml(source: string) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { success: false as const, error: "로그인이 필요합니다." };
  return { success: true as const, html: await renderAiHtml(source || "") };
}
