import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { PROMO_CHANNELS, type PromoChannel } from "@/utils/vacancyPromos";

/**
 * 기사 홍보현황 링크 저장 (2026-10-28) — 홈 "내 기사" 카드.
 * 앱이 도우미에게서 받은 발행 글 주소(api/studio/promo, articleNo)와 화면의 [링크 붙여넣기](actions/myArticles.ts)가 같이 쓴다.
 * 회원 확인은 부르는 쪽이 하고, 여기서는 기사 쓴 사람이 맞는지 본다.
 */
export async function saveArticlePromoFor(
  userId: string,
  article: { id?: string; no?: string },
  channel: PromoChannel,
  url: string,
  source: "helper" | "paste",
): Promise<{ success: boolean; error?: string }> {
  if (!PROMO_CHANNELS.includes(channel)) return { success: false, error: "알 수 없는 채널입니다." };
  const db = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const q = db.from("articles").select("id, author_id");
  const { data: a } = article.id ? await q.eq("id", article.id).maybeSingle() : await q.eq("article_no", Number(article.no)).maybeSingle();
  if (!a || a.author_id !== userId) return { success: false, error: "내 기사가 아닙니다." };

  const clean = url.trim();
  if (!clean) {
    const { error } = await db.from("article_promos").delete().eq("article_id", a.id).eq("channel", channel);
    return error ? { success: false, error: error.message } : { success: true };
  }
  let ok = false;
  try {
    ok = /^https?:$/.test(new URL(clean).protocol);
  } catch {}
  if (!ok) return { success: false, error: "https:// 로 시작하는 주소를 넣어 주세요." };

  const { error } = await db
    .from("article_promos")
    .upsert({ article_id: a.id, owner_id: userId, channel, url: clean, source, updated_at: new Date().toISOString() }, { onConflict: "article_id,channel" });
  if (error) {
    if (/article_promos/.test(error.message) && /does not exist|schema cache/.test(error.message)) return { success: false, error: "링크 저장 준비가 아직 안 됐어요 (서버 표 만들기 전)." };
    return { success: false, error: error.message };
  }
  return { success: true };
}
