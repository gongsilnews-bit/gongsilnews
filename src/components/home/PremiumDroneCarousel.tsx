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

  return (
    <div style={{ position: "relative" }}>
      {/* 화살표 버튼 */}
      {canScrollLeft && (
        <button 
          onClick={() => scroll("left")}
          style={{ position: "absolute", left: -20, top: "80px", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.5)", borderRadius: "50%", padding: "5px", border: "none", color: "#fff", cursor: "pointer", opacity: 0.8, display: "flex" }}
          title="이전"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      )}
      {canScrollRight && (
        <button 
          onClick={() => scroll("right")}
          style={{ position: "absolute", right: -20, top: "80px", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.5)", borderRadius: "50%", padding: "5px", border: "none", color: "#fff", cursor: "pointer", opacity: 0.8, display: "flex" }}
          title="다음"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
          const thumb = item.thumbnail_url || getYoutubeThumb(item.youtube_url) || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600&h=337";
          return (
            <Link 
              key={item.id} 
              href={`/board_read?id=${item.id}`} 
              className="prem-card"
              style={{ 
                flex: "0 0 calc(25% - 15px)", 
                minWidth: "220px", 
                scrollSnapAlign: "start",
                textDecoration: "none",
                display: "block"
              }}
            >
              <div 
                className="prem-img" 
                style={{ 
                  backgroundImage: `url(${thumb})`, 
                  backgroundSize: "cover", 
                  backgroundPosition: "center",
                  position: "relative"
                }}
              >
                {/* 비디오 아이콘 */}
                {(item.youtube_url || item.drive_url) && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "40px", height: "40px", background: "rgba(0,0,0,0.6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                    <div style={{ width: 0, height: 0, borderLeft: "10px solid #fff", borderTop: "7px solid transparent", borderBottom: "7px solid transparent", marginLeft: "4px" }}></div>
                  </div>
                )}
              </div>
              <div className="prem-title" style={{ color: "#fff" }}>{item.title}</div>
              <div className="prem-desc" style={{ 
                display: "-webkit-box", 
                WebkitLineClamp: 2, 
                WebkitBoxOrient: "vertical", 
                overflow: "hidden",
                color: "#aaa"
              }}>
                {item.subtitle || item.content?.replace(/<[^>]*>?/gm, "").slice(0, 80) || "드론 영상 자료실입니다."}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
