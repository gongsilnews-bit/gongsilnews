import { getArticles } from "@/app/actions/article";
import Link from "next/link";

export default async function HeroSideContent() {
  const res = await getArticles({ status: "APPROVED", article_type: "HEADLINE", limit: 2 });
  const articles = res.data || [];

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  const extractYoutubeIdInfo = (url?: string | null) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const getThumbnailSrc = (item: any) => {
    if (item.thumbnail_url) {
      if (item.thumbnail_url.includes('maxresdefault.jpg')) {
        return item.thumbnail_url.replace('maxresdefault.jpg', 'hqdefault.jpg');
      }
      return item.thumbnail_url;
    }
    let ytId = extractYoutubeIdInfo(item.youtube_url);
    if (!ytId && item.content) {
      ytId = extractYoutubeIdInfo(item.content);
    }
    if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80";
  };

  return (
    <div className="hero-right" style={{ marginTop: 0, display: "flex", flexDirection: "column", height: "100%", minHeight: 480, gap: 16 }}>
      {articles.length > 0 ? (
        articles.map((item: any) => (
          <Link 
            key={item.id} 
            href={`/news/${item.article_no || item.id}`} 
            style={{ 
              textDecoration: "none", 
              color: "#fff", 
              display: "block", 
              flex: 1, 
              position: "relative", 
              background: `url('${getThumbnailSrc(item)}') center/cover no-repeat` 
            }}
          >
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "30px 20px 20px", background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))" }}>
              <h4 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {item.title}
              </h4>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                {formatDate(item.published_at || item.created_at)}
              </span>
            </div>
          </Link>
        ))
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, background: "#f9f9f9", borderRadius: 8 }}>
          등록된 기사가 없습니다.
        </div>
      )}
    </div>
  );
}
