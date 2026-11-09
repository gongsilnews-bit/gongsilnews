"use server";

import { createClient } from "@/utils/supabase/server";
import { isPro } from "@/utils/tier";

/**
 * 기사쓰기 [오픈자료] — 공실뉴스 드론 영상을 쓸 수 있나 (2026-11-09 사장님)
 *  Pixabay 이미지는 모든 회원, 드론 영상은 공실뉴스부동산(PRO·비즈니스)과 최고관리자만
 */
export async function canUseDroneInArticle(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: m } = await supabase.from("members").select("role, plan_type, plan_end_date, studio_end_date").eq("id", user.id).maybeSingle();
  return isPro(m);
}
