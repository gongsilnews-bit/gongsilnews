import { createClient as createAdminSupabase } from "@supabase/supabase-js";

/**
 * 공실 홍보현황 링크 저장 (2026-10-27) — 화면의 [링크 붙여넣기](actions/vacancyPromos.ts)와
 * 앱이 도우미에게서 받은 발행 글 주소(api/studio/promo)가 같이 쓴다. 회원 확인은 부르는 쪽이 한다.
 */
export type PromoChannel = "blog" | "instagram" | "threads" | "facebook" | "youtube";
export const PROMO_CHANNELS: PromoChannel[] = ["blog", "instagram", "threads", "facebook", "youtube"];

export async function savePromoFor(userId: string, vacancyId: string, channel: PromoChannel, url: string, source: "helper" | "paste"): Promise<{ success: boolean; error?: string }> {
  if (!PROMO_CHANNELS.includes(channel)) return { success: false, error: "알 수 없는 채널입니다." };
  const db = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: v } = await db.from("vacancies").select("owner_id").eq("id", vacancyId).maybeSingle();
  if (!v || v.owner_id !== userId) return { success: false, error: "내 공실이 아닙니다." };

  const clean = url.trim();
  if (!clean) {
    const { error } = await db.from("vacancy_promos").delete().eq("vacancy_id", vacancyId).eq("channel", channel);
    return error ? { success: false, error: error.message } : { success: true };
  }
  let ok = false;
  try {
    ok = /^https?:$/.test(new URL(clean).protocol);
  } catch {}
  if (!ok) return { success: false, error: "https:// 로 시작하는 주소를 넣어 주세요." };

  const { error } = await db
    .from("vacancy_promos")
    .upsert({ vacancy_id: vacancyId, owner_id: userId, channel, url: clean, source, updated_at: new Date().toISOString() }, { onConflict: "vacancy_id,channel" });
  if (error) {
    if (/vacancy_promos/.test(error.message) && /does not exist|schema cache/.test(error.message)) return { success: false, error: "링크 저장 준비가 아직 안 됐어요 (서버 표 만들기 전)." };
    return { success: false, error: error.message };
  }
  return { success: true };
}
