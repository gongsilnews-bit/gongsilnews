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

interface HeroHeadlineRotateProps {
  articles: Article[];
}

export default function HeroHeadlineRotate({ articles }: HeroHeadlineRotateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (articles.length <= 2) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 2;
        return nextIndex >= articles.length ? 0 : nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [articles.length]);

  const formatDate = (dateString?: string) => {
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
    return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80";
  };

  if (articles.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, background: "#f9f9f9", borderRadius: 8 }}>
        등록된 기사가 없습니다.
      </div>
    );
  }

  // 표시할 기사 2개 계산
  const displayArticles = articles.slice(currentIndex, currentIndex + 2);

  // 애니메이션 효과
  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {displayArticles.map((item, idx) => {
        const thumbSrc = getThumbnailSrc(item);
        const isVideo = !!extractYoutubeIdInfo(item.youtube_url) || !!extractYoutubeIdInfo(item.content);

        return (
          <Link 
            key={`${item.id}-${currentIndex}-${idx}`} // key에 currentIndex를 포함하여 애니메이션 리렌더링 유도
            href={`/news/${item.article_no || item.id}`} 
            className="headline-article"
            style={{ 
              textDecoration: "none", 
              color: "#fff", 
              display: "block", 
              flex: 1, 
              position: "relative", 
              background: `url('${thumbSrc}') center/cover no-repeat`,
              animation: "fadeIn 0.5s ease-in-out"
            }}
          >
            {/* 개선된 그라디언트 오버레이 */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: "40%", background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)" }} />
            
            {/* 동영상 플레이 아이콘 */}
            {isVideo && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.8)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 3 }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "30px 20px 20px" }}>
              <h4 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {item.title}
              </h4>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                {formatDate(item.published_at || item.created_at)}
              </span>
            </div>
          </Link>
        );
      })}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0.6; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
