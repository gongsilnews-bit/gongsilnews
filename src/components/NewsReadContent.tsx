"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

import { incrementArticleView } from "@/app/actions/article";

interface NewsReadContentProps {
  article: any;
  popularArticles: any[];
}

const FONT_SIZES = [
  { label: "작게", size: 14 },
  { label: "보통", size: 16 },
  { label: "크게", size: 18 },
  { label: "아주크게", size: 20 },
  { label: "최대크게", size: 22 },
];

export default function NewsReadContent({ article, popularArticles }: NewsReadContentProps) {
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const fontSizePopupRef = useRef<HTMLDivElement>(null);
  const [commentText, setCommentText] = useState("");
  const [viewCount, setViewCount] = useState(article.view_count || 0);
  const [mounted, setMounted] = useState(false);

  // 찜하기
  const [isBookmarked, setIsBookmarked] = useState(false);
  // 공유 드롭다운
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  // 토스트
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // 글자 크기
  const [showFontSizePopup, setShowFontSizePopup] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // 기본: 보통(16px)

  useEffect(() => {
    setMounted(true);
    // 찜 상태 복원
    const saved = localStorage.getItem("news_bookmarks");
    if (saved) {
      try {
        const arr = JSON.parse(saved) as number[];
        setIsBookmarked(arr.includes(article.id));
      } catch (e) {}
    }
    // 글자 크기 복원
    const savedFs = localStorage.getItem("news_font_size_index");
    if (savedFs) {
      const idx = parseInt(savedFs, 10);
      if (!isNaN(idx) && idx >= 0 && idx < FONT_SIZES.length) setFontSizeIndex(idx);
    }
  }, [article.id]);

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
    if (article && article.id) {
      incrementArticleView(article.id).then((res) => {
        if (res.success && res.view_count !== undefined) {
          setViewCount(res.view_count);
        }
      });
    }
  }, [article.id]);

  // 스크롤 진행 바 — DOM 직접 조작 (리렌더링 방지 → iframe 깜빡임 해결)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      if (scrollBarRef.current) {
        scrollBarRef.current.style.width = `${progress}%`;
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 공유/글자크기 팝업 외부 클릭 닫기
  useEffect(() => {
    if (!showShareDropdown && !showFontSizePopup) return;
    const handleClick = (e: MouseEvent) => {
      if (showShareDropdown && shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShowShareDropdown(false);
      }
      if (showFontSizePopup && fontSizePopupRef.current && !fontSizePopupRef.current.contains(e.target as Node)) {
        setShowFontSizePopup(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showShareDropdown, showFontSizePopup]);

  // 토스트 자동 해제
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Kakao Share SDK 로드
  useEffect(() => {
    const scriptId = "kakao-share-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.onload = () => {
      const Kakao = (window as any).Kakao;
      if (Kakao && !Kakao.isInitialized()) {
        const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
        Kakao.init(kakaoJsKey);
      }
    };
    document.head.appendChild(script);
  }, []);

  // ── 찜하기 토글 ──
  const toggleBookmark = () => {
    setIsBookmarked(prev => {
      const next = !prev;
      const saved = localStorage.getItem("news_bookmarks");
      let arr: number[] = [];
      if (saved) { try { arr = JSON.parse(saved); } catch (e) {} }
      if (next) {
        arr = [article.id, ...arr.filter((x: number) => x !== article.id)];
      } else {
        arr = arr.filter((x: number) => x !== article.id);
      }
      localStorage.setItem("news_bookmarks", JSON.stringify(arr));
      setToastMessage(next ? "기사를 찜했습니다." : "찜을 해제했습니다.");
      return next;
    });
  };

  // ── 카카오톡 공유 ──
  const handleKakaoShare = () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK가 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const shareUrl = `${window.location.origin}/news/${article.article_no || article.id}`;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: article.title,
        description: article.subtitle || `${article.section1 || "뉴스"} | 공실뉴스`,
        imageUrl: article.thumbnail_url || "",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: "기사 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
    setShowShareDropdown(false);
  };

  // ── URL 복사 ──
  const handleCopyUrl = () => {
    const url = `${window.location.origin}/news/${article.article_no || article.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setToastMessage("URL이 복사되었습니다.");
    }).catch(() => {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setToastMessage("URL이 복사되었습니다.");
    });
    setShowShareDropdown(false);
  };

  // ── 글자 크기 변경 ──
  const handleFontSizeChange = (idx: number) => {
    setFontSizeIndex(idx);
    localStorage.setItem("news_font_size_index", String(idx));
  };

  // ── 인쇄 ──
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) return;
    const imgHtml = article.thumbnail_url ? `<img src="${article.thumbnail_url}" style="max-width:100%;max-height:400px;object-fit:contain;margin-bottom:16px;" />` : "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>${article.title} - 공실뉴스</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 30px; color: #222; max-width: 800px; margin: 0 auto; }
          .header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #1a73e8; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 20px; color: #1a73e8; }
          .header .sub { font-size: 12px; color: #888; }
          .title { font-size: 22px; font-weight: 800; color: #111; margin-bottom: 12px; line-height: 1.4; }
          .meta { font-size: 13px; color: #888; margin-bottom: 20px; }
          .content { font-size: 15px; color: #333; line-height: 1.8; }
          .content img { max-width: 100%; height: auto; }
          .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 11px; color: #999; text-align: center; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>공실뉴스</h1>
          <span class="sub">부동산 정보 채널</span>
        </div>
        <div class="title">${article.title}</div>
        <div class="meta">${article.author_name || "공실뉴스"} | ${new Date(article.published_at || article.created_at).toLocaleDateString("ko-KR")} | 조회수 ${viewCount}</div>
        ${imgHtml}
        <div class="content">${article.content || ""}</div>
        <div class="footer">공실뉴스 | ${window.location.origin}/news/${article.article_no || article.id} | 인쇄일: ${new Date().toLocaleDateString("ko-KR")}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1500);
  };

  // 추천공실 (더미 유지 — 매물 DB 연동 시 교체)
  const recommendProps = [
    { title: "힐데스하임", price: "매매 67억", area: "면적 288.9㎡(87.4평) / 244.55㎡(74.0평)", detail: "룸 1개, 욕실 3+개", badge: "공동중개" },
    { title: "논현 e편한세상 101동 101호", price: "매매 10억", area: "면적 84㎡(25.4평)", detail: "룸 3개, 욕실 2개", badge: "공동중개" },
    { title: "관악드림타운 132동 8층호", price: "매매 11억 5000", area: "면적 82.91㎡(25.1평) / 59.83㎡(18.1평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
    { title: "동부센트레빌 101동 101호", price: "매매 10억", area: "면적 84㎡(25.4평) / 59㎡(17.8평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
  ];

  // 유튜브 ID 추출
  const extractYoutubeId = (url?: string, html?: string): string | null => {
    const rx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
    if (url) {
      const m = url.match(rx);
      if (m) return m[1];
    }
    if (html) {
      const m = html.match(rx);
      if (m) return m[1];
    }
    return null;
  };

  const youtubeId = extractYoutubeId(article.youtube_url, article.content);
  const hasYoutube = !!youtubeId;

  const currentFontSize = FONT_SIZES[fontSizeIndex].size;

  return (
    <>
      {/* 스크롤 진행 표시 바 */}
      <div ref={scrollBarRef} className="scroll-progress" style={{ width: 0 }}></div>

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
                <span suppressHydrationWarning>{formatDate(article.published_at || article.created_at)}</span>
                <span className="meta-divider"></span>
                <span>조회수 {viewCount}</span>
              </div>
              <div className="meta-stats" style={{ position: "relative" }}>
                {/* 찜하기 */}
                <span className="meta-icon" title={isBookmarked ? "찜 해제" : "찜하기"} onClick={toggleBookmark} style={{ cursor: "pointer", color: isBookmarked ? "#f5a623" : undefined }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={isBookmarked ? "#f5a623" : "none"} stroke={isBookmarked ? "#f5a623" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </span>

                {/* 공유하기 */}
                <span className="meta-icon" title="공유하기" onClick={() => { setShowShareDropdown(!showShareDropdown); setShowFontSizePopup(false); }} style={{ cursor: "pointer", color: showShareDropdown ? "#1a73e8" : undefined }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </span>

                {/* 글자 크기 */}
                <span className="meta-icon" title="글자 크기" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 1, letterSpacing: -1, cursor: "pointer", color: showFontSizePopup ? "#1a73e8" : undefined }} onClick={() => { setShowFontSizePopup(!showFontSizePopup); setShowShareDropdown(false); }}>
                  <span style={{ fontSize: 13 }}>가</span><span style={{ fontSize: 17 }}>가</span>
                </span>

                {/* 기사 인쇄 */}
                <span className="meta-icon" title="기사 인쇄" onClick={handlePrint} style={{ cursor: "pointer" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </span>

                {/* 공유 드롭다운 */}
                {showShareDropdown && (
                  <div ref={shareDropdownRef} style={{ position: "absolute", top: "100%", right: 40, marginTop: 8, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: 200, zIndex: 9999, overflow: "hidden" }}>
                    <button onClick={handleKakaoShare} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: 14, color: "#333", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>
                      </div>
                      <span style={{ fontWeight: 600 }}>카카오톡 공유</span>
                    </button>
                    <button onClick={handleCopyUrl} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#333", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      </div>
                      <span style={{ fontWeight: 600 }}>URL 복사</span>
                    </button>
                  </div>
                )}

                {/* 글자 크기 팝업 */}
                {showFontSizePopup && (
                  <div ref={fontSizePopupRef} style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: 280, zIndex: 9999, padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>글자크기</span>
                      <button onClick={() => setShowFontSizePopup(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      {FONT_SIZES.map((fs, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleFontSizeChange(idx)}
                          style={{
                            flex: 1,
                            height: 44,
                            border: fontSizeIndex === idx ? "2px solid #3b5998" : "1px solid #ddd",
                            borderRadius: 8,
                            background: fontSizeIndex === idx ? "#3b5998" : "#fff",
                            color: fontSizeIndex === idx ? "#fff" : "#333",
                            fontSize: fs.size - 4,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s",
                            fontFamily: "inherit",
                          }}
                        >
                          가
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {FONT_SIZES.map((fs, idx) => (
                        <span key={idx} style={{ flex: 1, textAlign: "center", fontSize: 11, color: fontSizeIndex === idx ? "#3b5998" : "#999", fontWeight: fontSizeIndex === idx ? 800 : 400 }}>
                          {fs.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 서브타이틀 요약 박스 */}
            {article.subtitle && (
              <div className="article-subtitle-box">{article.subtitle}</div>
            )}

            <div className="article-body" style={{ fontSize: currentFontSize, lineHeight: currentFontSize >= 20 ? 1.9 : 1.7 }}>
              {/* 대표 이미지 또는 동영상 */}
              {hasYoutube ? (
                <div className="article-img-wrap">
                  <div style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: article.is_shorts ? 315 : "100%",
                    aspectRatio: article.is_shorts ? "9 / 16" : "16 / 9",
                    margin: "0 auto",
                    overflow: "hidden",
                  }}>
                    {mounted && (
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    )}
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

              {/* 본문 HTML 렌더링 (유튜브 iframe 중복 제거 및 감싸는 빈 태그 제거) */}
              {article.content && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ 
                  __html: article.content
                    .replace(/<p[^>]*>\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/p>/gi, '')
                    .replace(/<div(?:(?!class="article-body")[^>]*)?>\\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/div>/gi, '')
                    .replace(/<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>/gi, '') 
                }} />
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

      {/* 토스트 알림 */}
      {toastMessage && (
        <div style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.8)", color: "#fff", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: "bold", zIndex: 999999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
          {toastMessage}
        </div>
      )}
    </>
  );
}
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
