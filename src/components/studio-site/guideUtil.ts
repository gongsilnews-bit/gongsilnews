/** 사용법 배우기(studio_guide) 게시판 — 유튜브 주소에서 영상 id 꺼내기 (2026-10-26) */
export const GUIDE_BOARD = "studio_guide";

export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(url);
  return m ? m[1] : null;
}

/** 글의 유튜브 주소 — youtube_url 칸, 없으면 본문 속 첫 유튜브 주소 */
export function postYoutube(p: { youtube_url?: string | null; content?: string | null }): string | null {
  return youtubeId(p.youtube_url) || youtubeId((p.content || "").match(/https?:\/\/[^\s"'<>]*youtu[^\s"'<>]*/)?.[0]);
}
