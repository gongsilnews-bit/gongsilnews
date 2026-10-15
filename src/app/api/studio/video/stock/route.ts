import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";

/**
 * 영상 편집기 무료 이미지·비디오 검색 — 사이트 키는 서버에만 둔다 (앱에 넣지 않음)
 *  GET ?q=검색어(영어 권장)&type=photo|video&orientation=landscape|portrait|square&page=1
 *  → { items: [{ id, kind, thumb, url, width, height, duration, credit, source, page }] }
 *  키: PEXELS_API_KEY (Pexels), PIXABAY_API_KEY (Pixabay) — 둘 다 없으면 needKey
 */
type Item = { id: string; kind: "image" | "video"; thumb: string; url: string; width: number; height: number; duration?: number; credit: string; source: string; page: string };

async function pexels(q: string, type: string, orientation: string, page: number): Promise<Item[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const o = orientation ? `&orientation=${orientation}` : "";
  if (type === "video") {
    const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}${o}`, { headers: { Authorization: key } });
    const j = await r.json().catch(() => ({}));
    return (j.videos || []).map((v: { id: number; image: string; width: number; height: number; duration: number; user?: { name: string }; url: string; video_files: { link: string; width: number; height: number; quality: string; file_type: string }[] }) => {
      const files = (v.video_files || []).filter((f) => f.file_type === "video/mp4").sort((a, b) => b.width * b.height - a.width * a.height);
      const pick = files.find((f) => Math.min(f.width, f.height) <= 1080) || files[files.length - 1];
      return { id: `pexels-v-${v.id}`, kind: "video", thumb: v.image, url: pick?.link || "", width: pick?.width || v.width, height: pick?.height || v.height, duration: v.duration, credit: v.user?.name || "Pexels", source: "Pexels", page: v.url };
    }).filter((x: Item) => x.url);
  }
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=30&page=${page}${o}`, { headers: { Authorization: key } });
  const j = await r.json().catch(() => ({}));
  return (j.photos || []).map((p: { id: number; width: number; height: number; photographer: string; url: string; src: { large2x: string; medium: string } }) => ({
    id: `pexels-p-${p.id}`, kind: "image", thumb: p.src.medium, url: p.src.large2x, width: p.width, height: p.height, credit: p.photographer, source: "Pexels", page: p.url,
  }));
}

async function pixabay(q: string, type: string, orientation: string, page: number): Promise<Item[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  const o = orientation === "portrait" ? "&orientation=vertical" : orientation === "landscape" ? "&orientation=horizontal" : "";
  if (type === "video") {
    const r = await fetch(`https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(q)}&per_page=24&page=${page}&safesearch=true`);
    const j = await r.json().catch(() => ({}));
    return (j.hits || []).map((v: { id: number; duration: number; user: string; pageURL: string; videos: Record<string, { url: string; width: number; height: number; thumbnail: string }> }) => {
      const f = v.videos.large?.url ? v.videos.large : v.videos.medium;
      return { id: `pixabay-v-${v.id}`, kind: "video", thumb: f?.thumbnail || v.videos.medium?.thumbnail || "", url: f?.url || "", width: f?.width || 0, height: f?.height || 0, duration: v.duration, credit: v.user, source: "Pixabay", page: v.pageURL };
    }).filter((x: Item) => x.url);
  }
  const r = await fetch(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&image_type=photo&per_page=30&page=${page}&safesearch=true${o}`);
  const j = await r.json().catch(() => ({}));
  return (j.hits || []).map((p: { id: number; webformatURL: string; largeImageURL: string; imageWidth: number; imageHeight: number; user: string; pageURL: string }) => ({
    id: `pixabay-p-${p.id}`, kind: "image", thumb: p.webformatURL, url: p.largeImageURL, width: p.imageWidth, height: p.imageHeight, credit: p.user, source: "Pixabay", page: p.pageURL,
  }));
}

export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  if (!process.env.PEXELS_API_KEY && !process.env.PIXABAY_API_KEY) {
    return NextResponse.json({ success: false, needKey: true, error: "무료 이미지·비디오 검색 준비 중입니다 (사이트 키 등록 전)." });
  }
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  if (!q) return NextResponse.json({ success: true, items: [] });
  const type = sp.get("type") === "video" ? "video" : "photo";
  const orientation = ["landscape", "portrait", "square"].includes(sp.get("orientation") || "") ? (sp.get("orientation") as string) : "";
  const page = Math.max(1, Math.min(20, Number(sp.get("page")) || 1));
  const [a, b] = await Promise.all([pexels(q, type, orientation, page).catch(() => []), pixabay(q, type, orientation, page).catch(() => [])]);
  // 두 곳을 번갈아 섞는다
  const items: Item[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) items.push(a[i]);
    if (b[i]) items.push(b[i]);
  }
  return NextResponse.json({ success: true, items }, { headers: { "Cache-Control": "private, max-age=600" } });
}
