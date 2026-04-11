"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface NewsReadContentProps {
  article: any;
  popularArticles: any[];
}

export default function NewsReadContent({ article, popularArticles }: NewsReadContentProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [commentText, setCommentText] = useState("");

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hour = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "오후" : "오전";
    const h12 = hour > 12 ? hour - 12 : hour || 12;
    return `입력 ${yyyy}. ${mm}. ${dd}. ${ampm} ${String(h12).padStart(2, "0")}:${min}`;
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 추천공실 (더미 유지 — 매물 DB 연동 시 교체)
  const recommendProps = [
    { title: "힐데스하임", price: "매매 67억", area: "면적 288.9㎡(87.4평) / 244.55㎡(74.0평)", detail: "룸 1개, 욕실 3+개", badge: "공동중개" },
    { title: "논현 e편한세상 101동 101호", price: "매매 10억", area: "면적 84㎡(25.4평)", detail: "룸 3개, 욕실 2개", badge: "공동중개" },
    { title: "관악드림타운 132동 8층호", price: "매매 11억 5000", area: "면적 82.91㎡(25.1평) / 59.83㎡(18.1평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
    { title: "동부센트레빌 101동 101호", price: "매매 10억", area: "면적 84㎡(25.4평) / 59㎡(17.8평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
  ];

  // 유튜브 ID 추출
  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
  };

  const youtubeId = extractYoutubeId(article.youtube_url);
  const hasYoutube = !!youtubeId;

  return (
    <>
      {/* 스크롤 진행 표시 바 */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }}></div>

      <main className="container px-20" style={{ position: "relative" }}>
        <div className="news-layout">
          {/* ===== 좌측: 기사 본문 영역 ===== */}
          <div className="news-read-area">
            {/* 카테고리 */}
            <div className="detail-breadcrumb">
              [{article.section1 || "뉴스"} &gt; {article.section2 || "전체"}]
            </div>

            {/* 제목 */}
            <h1 className="detail-title">{article.title}</h1>

            {/* 메타 정보 바 */}
            <div className="detail-meta">
              <div className="meta-info">
                <span style={{ color: "#111", fontWeight: "bold" }}>{article.author_name || "공실뉴스"}</span>
                <span className="meta-divider"></span>
                <span>{formatDate(article.published_at || article.created_at)}</span>
                <span className="meta-divider"></span>
                <span>조회수 {article.view_count || 0}</span>
              </div>
              <div className="meta-stats">
                <span className="meta-icon" title="찜하기">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </span>
                <span className="meta-icon" title="공유하기">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </span>
                <span className="meta-icon" title="글자 크기" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 1, letterSpacing: -1 }}>
                  <span style={{ fontSize: 13 }}>가</span><span style={{ fontSize: 17 }}>가</span>
                </span>
                <span className="meta-icon" title="기사 인쇄" onClick={() => window.print()}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </span>
              </div>
            </div>

            {/* 서브타이틀 요약 박스 */}
            {article.subtitle && (
              <div className="article-subtitle-box">{article.subtitle}</div>
            )}

            {/* 기사 본문 */}
            <div className="article-body">
              {/* 대표 이미지 또는 동영상 — 본문에 이미 포함된 경우 중복 표시 안 함 */}
              {hasYoutube && !(article.content && article.content.includes('youtube.com/embed')) ? (
                <div className="article-img-wrap">
                  <div style={{
                    position: "relative",
                    width: "100%",
                    paddingBottom: article.is_shorts ? "177.78%" : "56.25%",
                    maxWidth: article.is_shorts ? 315 : "100%",
                    margin: "0 auto",
                    height: 0,
                    overflow: "hidden",

                  }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </div>
              ) : !hasYoutube && article.thumbnail_url && !(article.content && article.content.includes(article.thumbnail_url)) ? (
                <div className="article-img-wrap">
                  <img
                    src={article.thumbnail_url}
                    alt={article.title}
                    style={{ width: "100%", maxHeight: 500, objectFit: "cover" }}
                  />
                </div>
              ) : null}

              {/* 본문 HTML 렌더링 */}
              {article.content && (
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              )}
            </div>

            {/* 키워드 태그 */}
            {article.article_keywords && article.article_keywords.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "24px 0", padding: "16px 0", borderTop: "1px solid #eee" }}>
                {article.article_keywords.map((kw: any, i: number) => (
                  <span key={i} style={{
                    padding: "6px 14px", borderRadius: 20, background: "#fff",
                    color: "#555", fontSize: 13, fontWeight: 500,
                    border: "1px solid #ccc"
                  }}>
                    #{kw.keyword}
                  </span>
                ))}
              </div>
            )}

            {/* 기사 푸터: 기자명 + 저작권 */}
            <div className="article-footer-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 800, color: "#111" }}>{article.author_name || "공실뉴스"}</span>
              </div>
              <div style={{ color: "#888", fontSize: 13 }}>
                저작권자 © 공실뉴스 무단전재 및 재배포 금지
              </div>
            </div>

            {/* 댓글 섹션 */}
            <div className="comments-section">
              <div className="comment-header">
                <div className="comment-count">0개의 댓글</div>
                <div style={{ fontSize: 14, color: "#555", cursor: "pointer" }}>내 댓글 〉</div>
              </div>

              <div className="comment-box">
                <div className="comment-user-name">로그인이 필요합니다</div>
                <textarea
                  className="comment-textarea"
                  placeholder="댓글을 남겨보세요"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value.slice(0, 400))}
                />
                <div className="comment-footer">
                  <div style={{ fontSize: 13, color: "#999", display: "flex", alignItems: "center", gap: 16 }}>
                    <span><span style={{ fontWeight: "bold", color: "#111" }}>{commentText.length}</span> / 400</span>
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#555" }}>
                      <input type="checkbox" style={{ accentColor: "#508bf5" }} /> 비밀댓글
                    </label>
                  </div>
                  <button className="comment-submit-btn">등록</button>
                </div>
              </div>

              <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 14 }}>
                첫 댓글을 남겨보세요.
              </div>
            </div>

            {/* 목록으로 돌아가기 */}
            <div style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid #ccc", textAlign: "center" }}>
              <button className="back-to-list" onClick={() => window.history.back()}>
                목록으로 돌아가기
              </button>
            </div>
          </div>

          {/* ===== 우측: 사이드바 ===== */}
          <div className="news-sidebar">
            <div className="sb-widget">
              <div className="sidebar-hot-title">HOT 매물/광고</div>
              <div className="sidebar-hot-map">공실가이드맵 (지도 이미지)</div>
              <div className="sidebar-hot-label">강남구 역삼동 신축 빌딩 (수익률 6%)</div>
            </div>

            <div className="sb-widget">
              <div className="sidebar-cta-btn" style={{ background: "#00b894" }}>
                공실알림<br /><span>(관심도 1,000개 부동산 가입)</span>
              </div>
              <div className="sidebar-cta-btn" style={{ background: "#00cec9", marginBottom: 30 }}>
                신축/분양/권리조회<br /><span>(부동산 전문가에게 의뢰)</span>
              </div>
            </div>

            <div className="sb-widget">
              <div className="sb-title">많이 본 뉴스</div>
              <ul className="pop-list">
                {popularArticles.length > 0 ? popularArticles.map((item, i) => (
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

            <div className="sb-widget">
              <div className="sb-title">
                추천 공실
                <span className="sb-title-more">더보기 &gt;</span>
              </div>
              {recommendProps.map((prop, i) => (
                <div key={i} className="prop-item">
                  <div className="prop-info" style={{ minWidth: 0, overflow: "hidden" }}>
                    <div className="prop-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{prop.title}</div>
                    <div className="prop-price">{prop.price}</div>
                    <div className="prop-meta">{prop.area}<br />{prop.detail}</div>
                    <span className="prop-badge">{prop.badge}</span>
                  </div>
                  <div className="prop-img-wrapper" style={{ flexShrink: 0 }}>
                    <div style={{ width: "100%", height: "100%", background: "#eee" }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
