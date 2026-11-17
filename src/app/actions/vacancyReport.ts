"use server";
// 공실 오류제보 — 웹(모바일·PC 공실 상세)에서 부른다. 로그인한 회원만 (쿠키 로그인으로 확인)
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { submitVacancyReport } from "@/utils/vacancyReport";

export async function reportVacancyError(vacancyId: string, reason: string) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다.", needLogin: true };
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  return submitVacancyReport(db, user.id, vacancyId, reason);
}
