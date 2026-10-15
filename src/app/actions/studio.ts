"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";

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

/**
 * 공실뉴스 스튜디오: 로그인한 회원이 등록한 공실 목록 (SNS뉴스발행 공실 고르기)
 * 회원 번호를 받지 않고 로그인 쿠키로 본인을 확인한다 (남의 목록을 볼 수 없게).
 * 고르기에 필요한 값과 대표 사진만 돌려준다.
 */
export async function listMyStudioVacancies() {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return { success: false as const, error: "로그인이 필요합니다." };

  const supabase = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("vacancies")
    .select("id, vacancy_no, building_name, trade_type, property_type, sub_category, deposit, monthly_rent, sido, sigungu, dong, created_at, vacancy_photos(url, sort_order)")
    .eq("owner_id", user.id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { success: false as const, error: error.message };

  return {
    success: true as const,
    data: (data || []).map((v) => {
      const photos = ((v.vacancy_photos as { url: string; sort_order: number | null }[] | null) || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return {
        id: v.id as string,
        vacancy_no: v.vacancy_no as number,
        building_name: v.building_name as string | null,
        trade_type: v.trade_type as string | null,
        property_type: (v.sub_category || v.property_type) as string | null,
        deposit: v.deposit as number | null,
        monthly_rent: v.monthly_rent as number | null,
        address: [v.sido, v.sigungu, v.dong].filter(Boolean).join(" "),
        created_at: v.created_at as string,
        photo: photos[0]?.url || null,
        photoCount: photos.length,
      };
    }),
  };
}
