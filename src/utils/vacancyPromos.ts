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
  const { data: v } = await db.from("vacancies").select("owner_id, metadata, trade_type").eq("id", vacancyId).maybeSingle();
  // 내 공실 · 또는 경매·공매 물건 (누구나 홍보할 수 있는 공개 물건, 2026-10-29 사장님: 경매·공매에도 링크체크)
  //  경매·공매 구분은 auction-source API 와 같은 칸 (온비드 관리번호·공고번호 · 법원 사건번호)
  let md = (v?.metadata || {}) as Record<string, unknown>;
  if (typeof md === "string") { try { md = JSON.parse(md); } catch { md = {}; } }
  const auction = ["cltrMngNo", "cltr_mng_no", "onbidPbancNo", "pbctNo", "onbidCltrNm", "case_no", "caseNo"].some((k) => md[k]) || /경매|공매/.test(String(v?.trade_type || ""));
  if (!v || (v.owner_id !== userId && !auction)) return { success: false, error: "내 공실이 아닙니다." };

  const clean = url.trim();
  if (!clean) {
    const { error } = await db.from("vacancy_promos").delete().eq("vacancy_id", vacancyId).eq("owner_id", userId).eq("channel", channel);
    return error ? { success: false, error: error.message } : { success: true };
  }
  let ok = false;
  try {
    ok = /^https?:$/.test(new URL(clean).protocol);
  } catch {}
  if (!ok) return { success: false, error: "https:// 로 시작하는 주소를 넣어 주세요." };

  // 회원마다 따로 (20261029_vacancy_promos_per_member.sql) — 그 SQL 을 돌리기 전이면 예전 규칙(물건·채널)으로
  const row = { vacancy_id: vacancyId, owner_id: userId, channel, url: clean, source, updated_at: new Date().toISOString() };
  let { error } = await db.from("vacancy_promos").upsert(row, { onConflict: "vacancy_id,owner_id,channel" });
  if (error && /no unique or exclusion constraint/i.test(error.message)) {
    if (v.owner_id !== userId) return { success: false, error: "경매·공매 링크 저장 준비가 아직 안 됐어요 (서버 표 바꾸기 전)." };
    ({ error } = await db.from("vacancy_promos").upsert(row, { onConflict: "vacancy_id,channel" }));
  }
  if (error) {
    if (/vacancy_promos/.test(error.message) && /does not exist|schema cache/.test(error.message)) return { success: false, error: "링크 저장 준비가 아직 안 됐어요 (서버 표 만들기 전)." };
    return { success: false, error: error.message };
  }
  return { success: true };
}
