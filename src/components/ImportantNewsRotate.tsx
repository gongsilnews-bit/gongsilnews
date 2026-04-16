"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Article {
  id: string;
  article_no?: number;
  title: string;
  published_at?: string;
  created_at?: string;
  thumbnail_url?: string;
  youtube_url?: string;
  content?: string;
}

interface ImportantNewsRotateProps {
  articles: Article[];
}

export default function ImportantNewsRotate({ articles }: ImportantNewsRotateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (articles.length <= 3) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 3;
        return nextIndex >= articles.length ? 0 : nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [articles.length]);

  const extractYoutubeIdInfo = (url?: string | null) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const getThumbnailSrc = (item: Article) => {
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
    return null;
  };

  if (articles.length === 0) return null;

  // 표시할 기사 3개 계산
  const displayArticles = articles.slice(currentIndex, currentIndex + 3);

  // 애니메이션 효과
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40, position: 'relative' }}>
      {displayArticles.map((article, idx) => {
        const thumbSrc = getThumbnailSrc(article);
        const isVideo = !!extractYoutubeIdInfo(article.youtube_url) || !!extractYoutubeIdInfo(article.content);
        
        return (
          <Link 
            key={`${article.id}-${currentIndex}-${idx}`} 
            href={`/news/${article.article_no || article.id}`} 
            className="important-article"
            style={{ 
              textDecoration: "none", 
              color: "inherit", 
              display: "block",
              animation: "fadeInImportant 0.5s ease-in-out"
            }}
          >
            <div style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", transition: "transform 0.2s" }} 
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} 
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ width: "100%", height: 140, background: "#f0f0f0", position: "relative" }}>
                {thumbSrc && <img src={thumbSrc} alt={article.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                
                {/* 동영상 플레이 아이콘 */}
                {isVideo && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.8)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 3 }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ padding: "12px 4px" }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#111", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {article.title}
                </h4>
              </div>
            </div>
          </Link>
        );
      })}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInImportant {
          from { opacity: 0.5; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
