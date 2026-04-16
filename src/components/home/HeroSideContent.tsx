import BannerSlot from "@/components/BannerSlot";
import { getArticles } from "@/app/actions/article";
import Link from "next/link";

export default async function HeroSideContent() {
  const res = await getArticles({ status: "APPROVED", limit: 5 });
  const articles = res.data || [];

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  return (
    <div className="hero-right" style={{ marginTop: 0 }}>
      {/* 핫 공실뉴스 타이틀 및 라인 삭제됨 */}
      <div className="hn-list-wrapper" style={{ height: 260, overflow: "hidden", position: "relative", marginBottom: 0 }}>
        {articles.length > 0 ? (
          <div className="hn-scroll-inner">
            {[...articles, ...articles].map((item: any, idx: number) => (
              <Link key={idx} href={`/news/${item.article_no || item.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div className="hn-item">
                  <div className="hn-img" style={{ background: `url('${item.thumbnail_url || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"}') center/cover`, borderRadius: 4 }}></div>
                  <div className="hn-txt">
                    <h4 style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, marginBottom: 8 }}>{item.title}</h4>
                    <span>{formatDate(item.published_at || item.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>등록된 기사가 없습니다.</div>
        )}
      </div>
      <BannerSlot placement="SIDEBAR" style={{ marginTop: 16, width: "100%", borderRadius: 8, overflow: "hidden" }} />

      <style>{`
        .hn-scroll-inner {
          animation: newsVScroll 25s linear infinite;
        }
        .hn-scroll-inner:hover {
          animation-play-state: paused;
        }
        @keyframes newsVScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}
