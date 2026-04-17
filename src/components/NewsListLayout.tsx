"use client";

import React, { useState } from "react";
import Link from "next/link";
import ImportantNewsRotate from "./ImportantNewsRotate";

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
}

export default function NewsListLayout({ category, title, initialArticles, initialPopular, importantArticles = [] }: NewsListLayoutProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(initialArticles.length / ITEMS_PER_PAGE));
  const pagedArticles = initialArticles.slice(
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
      const match = article.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
    // 2순위: 본문(content) 내장 iframe 또는 링크
    if (article.content) {
      const match = article.content.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
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

  // 추천공실 (더미 유지 — 매물 DB 연동 시 교체)
  const recommendProps = [
    { title: "관악드림타운 132동 8층호", price: "매매 11억 5000", area: "면적 82.91㎡(25.1평) / 59.83㎡(18.1평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
    { title: "동부센트레빌 101동 101호", price: "매매 10억", area: "면적 84㎡(25.4평) / 59㎡(17.8평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
  ];

  return (
    <>
      <main className="container px-20" style={{ position: "relative" }}>
        <div className="news-layout">
          {/* 좌측 뉴스 리스트 */}
          <div className="news-list-area">
            {/* 중요 기사 (상단 이미지 영역, 자동 롤링) */}
            {importantArticles.length > 0 && (
              <ImportantNewsRotate articles={importantArticles} />
            )}

            <div className="list-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {title}
            </div>

            {/* 기사 카드 리스트 — 서버에서 미리 받아와서 즉시 표시 */}
            {pagedArticles.length > 0 ? pagedArticles.map((article) => {
              const ytInfo = extractYoutubeIdInfo(article);
              const thumbSrc = getThumbnailSrc(article, ytInfo);
              const showImgArea = Boolean(thumbSrc);

              return (
              <Link key={article.id} href={`/news/${article.article_no || article.id}`} style={{ textDecoration: "none", color: "inherit" }}>
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
            )}) : (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#888", fontSize: 15 }}>
                해당 카테고리에 등록된 기사가 없습니다.
              </div>
            )}

            {/* 페이지네이션 */}
            {initialArticles.length > 0 && (
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
            <div className="sb-banner">배너 1</div>

            {/* 많이 본 뉴스 5개 */}
            <div className="sb-widget">
              <div className="sb-title">{title} 많이 본 뉴스</div>
              <ul className="pop-list">
                {initialPopular.length > 0 ? initialPopular.map((item, i) => (
                  <li key={item.id} className="pop-item">
                    <Link href={`/news/${item.article_no || item.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "flex-start", gap: 8, width: "100%" }}>
                      <span className="pop-ranking">{i + 1}</span>
                      <span className="pop-title">{item.title}</span>
                    </Link>
                  </li>
                )) : (
                  <li className="pop-item" style={{ color: "#999", fontSize: 13 }}>기사가 없습니다.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
