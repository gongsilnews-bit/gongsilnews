"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";

/**
 * 웹 뉴스칼럼 (2026-11-04 사장님: 본인이 작성한 기사만으로 블로그·SNS·대본) — 내 기사에 들어간 사진
 * 칼럼의 사진·화면 칸에 넣는다 (앱은 원문 기사 화면 캡처, 웹은 내 기사 사진 그대로). 본인 기사만.
 * 사진 설명은 기사에 적힌 것(figcaption·alt)만 — 없으면 빈칸 (지어내지 않는다)
 */
const admin = () => createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const clean = (t: string) => String(t || "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export async function getMyArticlePhotos(no: string): Promise<{ success: boolean; photos: { url: string; caption: string }[]; error?: string }> {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return { success: false, photos: [], error: "로그인이 필요합니다." };
  const key = String(no || "").trim();
  if (!/^\d+$/.test(key)) return { success: false, photos: [], error: "기사 번호를 읽지 못했어요." };
  const { data: a } = await admin().from("articles").select("author_id, thumbnail_url, content").eq("article_no", key).neq("is_deleted", true).maybeSingle();
  if (!a || a.author_id !== user.id) return { success: false, photos: [], error: "기사를 찾을 수 없어요." };
  const html = String(a.content || "");
  const photos: { url: string; caption: string }[] = [];
  const seen = new Set<string>();
  const add = (url: string, caption: string) => {
    const u = String(url || "").trim();
    if (!/^https:\/\//.test(u) || seen.has(u.split("?")[0])) return;
    seen.add(u.split("?")[0]);
    photos.push({ url: u, caption: clean(caption).slice(0, 200) });
  };
  // 본문의 사진 — <figure> 안이면 그 설명, 아니면 alt
  for (const m of html.matchAll(/<figure[\s\S]*?<\/figure>|<img\b[^>]*>/gi)) {
    const block = m[0];
    const src = /<img\b[^>]*\bsrc=["']([^"']+)["']/i.exec(block)?.[1] || "";
    const cap = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(block)?.[1] || /\balt=["']([^"']*)["']/i.exec(block)?.[1] || "";
    add(src, cap);
    if (photos.length >= 20) break;
  }
  // 본문에 사진이 없으면 대표 사진
  if (!photos.length && a.thumbnail_url) add(String(a.thumbnail_url), "");
  return { success: true, photos };
}
