"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImportantNewsRotate from "./ImportantNewsRotate";
import BannerSlot from "./BannerSlot";

interface Article {
  id: string;
  article_no?: number;
  title: string;
  subtitle?: string;
  content?: string;
  section1?: string;
  section2?: string;
  author_name?: string;
  thumbnail_url?: string;
  youtube_url?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  view_count?: number;
}

interface NewsListLayoutProps {
  category: string;
  title: string;
  initialArticles: Article[];
  initialPopular: Article[];
  importantArticles?: Article[];
  searchQuery?: string;
  isBookmarkMode?: boolean;
}

export default function NewsListLayout({ category, title, initialArticles, initialPopular, importantArticles = [], searchQuery, isBookmarkMode = false }: NewsListLayoutProps) {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const ITEMS_PER_PAGE = 10;

  // 관심기사 모드일 때 localStorage에서 북마크 ID 로드
  useEffect(() => {
    if (isBookmarkMode) {
      try {
        const saved = localStorage.getItem("news_bookmarks");
        if (saved) {
          setBookmarkIds(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to load bookmarks", e);
      }
    }
  }, [isBookmarkMode]);

  // 북마크 모드면 북마크된 기사만 필터
  const displayArticles = isBookmarkMode
    ? initialArticles.filter(a => bookmarkIds.includes(a.id))
    : initialArticles;

  const displayTitle = isBookmarkMode ? "📌 관심기사" : title;

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(displayArticles.length / ITEMS_PER_PAGE));
  const pagedArticles = displayArticles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 날짜 포맷 (YYYY.MM.DD HH:mm)
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd} ${hour}:${min}`;
  };

  // 본문에서 텍스트만 추출 (기사 복사 시 딸려온 팝업 X버튼 등 제거)
  const stripHtml = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    text = text.replace(/^(?:X|×|✕)(?=[가-힣\[\(])/i, "").trim();
    return text;
  };

  // YouTube 추출 유틸리티
  const extractYoutubeIdInfo = (article: Article) => {
    // 1순위: 명시적 유튜브 URL
    if (article.youtube_url) {
      const match = article.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
    // 2순위: 본문(content) 내장 iframe 또는 링크
    if (article.content) {
      const match = article.content.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
    return { id: null, hasVideo: false };
  };

  // 썸네일 URL 결정
  const getThumbnailSrc = (article: Article, ytInfo: { id: string | null; hasVideo: boolean }) => {
    if (article.thumbnail_url) {
      if (article.thumbnail_url.includes('maxresdefault.jpg')) {
        return article.thumbnail_url.replace('maxresdefault.jpg', 'hqdefault.jpg');
      }
      return article.thumbnail_url;
    }
    if (ytInfo.id) return `https://img.youtube.com/vi/${ytInfo.id}/hqdefault.jpg`;
    return null;
  };

  // 북마크 삭제
  const removeBookmark = (articleId: string) => {
    try {
      const saved = localStorage.getItem("news_bookmarks");
      let arr: string[] = saved ? JSON.parse(saved) : [];
      arr = arr.filter(id => id !== articleId);
      localStorage.setItem("news_bookmarks", JSON.stringify(arr));
      setBookmarkIds(arr);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <main className="container px-20" style={{ position: "relative" }}>
        <div className="news-layout">
          {/* 좌측 뉴스 리스트 */}
          <div className="news-list-area">
            {/* 중요 기사 (상단 이미지 영역, 자동 롤링) */}
            {!isBookmarkMode && importantArticles.length > 0 && (
              <ImportantNewsRotate articles={importantArticles} />
            )}

            <div className="list-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {displayTitle}
              {isBookmarkMode && (
                <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, marginLeft: 8 }}>
                  총 {displayArticles.length}건
                </span>
              )}
            </div>

            {searchQuery && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f0f4ff', borderRadius: '8px', fontSize: '14px', color: '#555' }}>
                총 <strong style={{ color: '#1a2e50' }}>{initialArticles.length}</strong>건의 검색결과
              </div>
            )}

            {isBookmarkMode && displayArticles.length === 0 && (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#888", fontSize: 15 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📌</div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>저장한 관심기사가 없습니다</div>
                <div style={{ fontSize: 13, color: "#aaa" }}>기사를 읽을 때 북마크(🔖) 버튼을 눌러 저장하세요</div>
              </div>
            )}

            {/* 기사 카드 리스트 — 서버에서 미리 받아와서 즉시 표시 */}
            {pagedArticles.length > 0 ? pagedArticles.map((article, index) => {
              const ytInfo = extractYoutubeIdInfo(article);
              const thumbSrc = getThumbnailSrc(article, ytInfo);
              const showImgArea = Boolean(thumbSrc);

              return (
              <React.Fragment key={article.id}>
                {index === 3 && (
                  <div style={{ margin: "24px 0" }}>
                    <BannerSlot placement="LIST_INLINE" category={category} />
                  </div>
                )}
                <div style={{ position: "relative" }}>
                  <Link href={`/news/${article.article_no || article.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="an-card">
                      {showImgArea && (
                        <div className="an-img" style={{ position: "relative", flexShrink: 0 }}>
                          <img
                            src={thumbSrc as string}
                            alt={article.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }}
                          />
                          {ytInfo.hasVideo && (
                            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, background: "rgba(0,0,0,0.4)", borderRadius: "50%", border: "2.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                              <svg viewBox="0 0 24 24" width="24" height="24" fill="white" style={{ marginLeft: 4 }}><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="an-body">
                        <div className="an-title">{article.title}</div>
                        <div className="an-desc">
                          {article.subtitle || stripHtml(article.content || "").slice(0, 160)}
                        </div>
                        <div className="an-meta">
                          <span style={{ color: "#508bf5", fontWeight: "bold", marginRight: 8 }}>
                            [{article.section1 || "뉴스"} &gt; {article.section2 || "전체"}]
                          </span>
                          {formatDate(article.published_at || article.created_at || "")} {article.updated_at ? `(수정: ${formatDate(article.updated_at)})` : ""} · {article.author_name || "공실뉴스"}
                        </div>
                      </div>
                    </div>
                  </Link>
                  {isBookmarkMode && (
                    <button
                      onClick={(e) => { e.preventDefault(); removeBookmark(article.id); }}
                      title="관심기사 해제"
                      style={{
                        position: "absolute", top: 12, right: 12,
                        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
                        padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "#ef4444",
                        fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                      해제
                    </button>
                  )}
                </div>
              </React.Fragment>
            )}) : (!isBookmarkMode && (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#888", fontSize: 15 }}>
                해당 카테고리에 등록된 기사가 없습니다.
              </div>
            ))}

            {/* 페이지네이션 */}
            {displayArticles.length > 0 && (
              <div className="pagination">
                <button className="page-btn" disabled={currentPage <= 1} onClick={() => handlePageChange(-1)}>&lt; 이전</button>
                <span className="page-info">{currentPage} / {totalPages}</span>
                <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => handlePageChange(1)}>다음 &gt;</button>
              </div>
            )}
          </div>

          {/* 우측 사이드바 */}
          <div className="news-sidebar">
            {/* 배너 영역 */}
            <div style={{ marginBottom: 20 }}>
              <BannerSlot placement="LIST_SIDEBAR" category={category} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
