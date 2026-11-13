// 동영상뉴스 — 유튜브 영상이 붙은 기사만 (2026-11-13 사장님: "동영상이 있는 뉴스만 볼 수 있어야")
// 서버에서만 부른다 (서비스 키). 발행된 기사만, 최신순
import { createClient } from "@supabase/supabase-js";

export type VideoNewsItem = {
  id: string;
  no: number | null;
  title: string;
  publishedAt: string | null;
  youtubeId: string;
  isShorts: boolean;
  thumb: string;
  section: string | null;
  author: string;
};

const YT = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;

export async function getVideoNews(limit = 60): Promise<VideoNewsItem[]> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await sb
    .from("articles")
    .select("id, article_no, title, published_at, youtube_url, is_shorts, thumbnail_url, section1, author_name")
    .eq("status", "APPROVED")
    .eq("is_deleted", false)
    .not("youtube_url", "is", null)
    .neq("youtube_url", "")
    .order("published_at", { ascending: false })
    .limit(limit);
  const out: VideoNewsItem[] = [];
  for (const a of data || []) {
    const m = String(a.youtube_url || "").match(YT);
    if (!m) continue;
    const isShorts = !!a.is_shorts || /\/shorts\//.test(a.youtube_url);
    out.push({
      id: a.id,
      no: a.article_no,
      title: a.title,
      publishedAt: a.published_at,
      youtubeId: m[1],
      isShorts,
      // 쇼츠는 유튜브 썸네일이 가로로 잘려 보여서 기사 대표 사진을 먼저
      thumb: (isShorts && a.thumbnail_url) || `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`,
      section: a.section1,
      author: a.author_name || "공실뉴스",
    });
  }
  return out;
}
