"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";

/**
 * 공실뉴스 스튜디오: 공실번호로 공실열람에 공개 중인 공실을 찾는다.
 * 블로그는 공실열람의 어떤 매물로도 쓸 수 있으므로(크롬 확장과 같음) 내 공실로 한정하지 않는다.
 * 공개 화면에 나오는 값(번호·이름)만 돌려준다. 의뢰인·임대인 정보는 돌려주지 않는다.
 */
export async function findStudioVacancyByNo(vacancyNo: string) {
  const no = parseInt(String(vacancyNo).replace(/[^\d]/g, ""), 10);
  if (!no) return { success: false as const, error: "공실번호를 숫자로 입력해 주세요." };

  const supabase = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("vacancies")
    .select("id, vacancy_no, building_name, trade_type, property_type, sido, sigungu, dong")
    .eq("vacancy_no", no)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (error) return { success: false as const, error: error.message };
  if (!data) return { success: false as const, error: `공실번호 ${no} 은(는) 공실열람에 공개 중인 공실이 아닙니다.` };
  return { success: true as const, data };
}
