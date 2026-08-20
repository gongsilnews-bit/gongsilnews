"use client";


import { useRef, useState, useEffect } from "react";
import Link from "next/link";

export default function PremiumDroneCarousel({ posts }: { posts: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [posts]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      setTimeout(checkScroll, 500);
    }
  };

  const getYoutubeThumb = (url: string) => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
  };

  const getDriveThumb = (url: string) => {
    if (!url) return null;
    const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const id = m ? m[1] : (url.match(/id=([a-zA-Z0-9_-]+)/) ? url.match(/id=([a-zA-Z0-9_-]+)/)![1] : null);
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800-h600` : null;
  };

  return (
    <div style={{ position: "relative" }}>
      {/* 화살표 버튼 */}
      {canScrollLeft && (
        <button 
          onClick={() => scroll("left")}
          style={{ position: "absolute", left: "-24px", top: "90px", transform: "translateY(-50%)", zIndex: 20, width: "48px", height: "48px", background: "#fff", borderRadius: "50%", padding: "0", border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", color: "#333", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-50%) scale(1.05)"; e.currentTarget.style.color = "#1e56a0"; }}
          onMouseOut={e => { e.currentTarget.style.transform = "translateY(-50%) scale(1)"; e.currentTarget.style.color = "#333"; }}
          title="이전"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      )}
      {canScrollRight && (
        <button 
          onClick={() => scroll("right")}
          style={{ position: "absolute", right: "-24px", top: "90px", transform: "translateY(-50%)", zIndex: 20, width: "48px", height: "48px", background: "#fff", borderRadius: "50%", padding: "0", border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", color: "#333", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-50%) scale(1.05)"; e.currentTarget.style.color = "#1e56a0"; }}
          onMouseOut={e => { e.currentTarget.style.transform = "translateY(-50%) scale(1)"; e.currentTarget.style.color = "#333"; }}
          title="다음"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      )}

      {/* 스크롤 영역 */}
      <div 
        ref={scrollRef} 
        onScroll={checkScroll}
        style={{ 
          display: "flex", 
          gap: "20px", 
          overflowX: "auto", 
          scrollSnapType: "x mandatory", 
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE
          paddingBottom: "10px"
        }}
      >
        <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
        
        {posts.map((item, i) => {
          let ytUrl = item.youtube_url;
          let drUrl = item.drive_url;
          if (!ytUrl && !drUrl && item.external_url) {
            try {
              const links = typeof item.external_url === 'string' ? JSON.parse(item.external_url) : item.external_url;
              if (Array.isArray(links)) {
                const ytLink = links.find((l: any) => l.type === "YOUTUBE" || (l.url && (l.url.includes("youtube.com") || l.url.includes("youtu.be"))));
                const drLink = links.find((l: any) => l.type === "DRIVE" || (l.url && l.url.includes("drive.google.com")));
                if (ytLink) ytUrl = ytLink.url;
                if (drLink) drUrl = drLink.url;
              }
            } catch (e) {}
          }

          const thumb = item.thumbnail_url || getYoutubeThumb(ytUrl) || getDriveThumb(drUrl) || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600&h=337";
          return (
            <Link 
              key={item.id} 
              href={`/board_read?id=${item.id}`} 
              className="prem-card drone-interactive-card"
              style={{ 
                flex: "0 0 calc(25% - 15px)", 
                minWidth: "220px", 
                scrollSnapAlign: "start",
                textDecoration: "none",
                display: "block",
                transition: "all 0.25s cubic-bezier(0.2, 0, 0.2, 1)",
                borderRadius: "10px",
                overflow: "hidden"
              }}
            >
              <div 
                className="prem-img drone-thumb-box" 
                style={{ 
                  position: "relative",
                  height: "170px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  marginBottom: "12px",
                  background: "#1e293b"
                }}
              >
                <div 
                  className="drone-bg-img"
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url(${thumb})`, 
                    backgroundSize: "cover", 
                    backgroundPosition: "center",
                    transition: "transform 0.4s cubic-bezier(0.2, 0, 0.2, 1), filter 0.3s ease"
                  }}
                />
                {/* 비디오 아이콘 */}
                {(ytUrl || drUrl) && (
                  <div 
                    className="drone-play-icon"
                    style={{ 
                      position: "absolute", 
                      top: "50%", 
                      left: "50%", 
                      transform: "translate(-50%, -50%)",
                      transition: "all 0.25s cubic-bezier(0.2, 0, 0.2, 1)",
                      zIndex: 2
                    }}
                  >
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="24" cy="24" r="24" fill="rgba(0, 0, 0, 0.6)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                      <path d="M20 15L33 24L20 33V15Z" fill="#FFFFFF" />
                    </svg>
                  </div>
                )}
                {/* 하단 그라디언트 */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)", pointerEvents: "none" }} />
              </div>
              <div className="prem-title drone-title" style={{ color: "#fff", transition: "color 0.2s ease" }}>{item.title}</div>
              <div className="prem-desc" style={{ 
                display: "-webkit-box", 
                WebkitLineClamp: 2, 
                WebkitBoxOrient: "vertical", 
                overflow: "hidden",
                color: "#94a3b8",
                fontSize: "13px",
                lineHeight: "1.5"
              }}>
                {item.subtitle || "드론 영상 자료실입니다."}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
