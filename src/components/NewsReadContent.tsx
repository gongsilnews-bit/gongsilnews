"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

import { incrementArticleView } from "@/app/actions/article";
import { getComments, addComment, deleteComment, toggleCommentLike } from "@/app/actions/comment";
import { getVacancies } from "@/app/actions/vacancy";

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

  // 별도 기능 State
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showFontSizePopup, setShowFontSizePopup] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // 기본: 보통(16px)

  // 댓글 State
  const [comments, setComments] = useState<any[]>([]);
  const [isSecretComment, setIsSecretComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);

  // 작성자 정보 및 소속 공실 State
  const [authorRole, setAuthorRole] = useState<string | null>(null);
  const [authorVacancies, setAuthorVacancies] = useState<any[]>([]);

  // 사용자 정보 가져오기
  useEffect(() => {
    import("@/utils/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setCurrentUserId(data.user.id);
          // 필요하면 user_metadata 에서 이름 가져오기
          setCurrentUserName(data.user.user_metadata?.name || data.user.email?.split("@")[0] || "익명");
        }
      });
    });
  }, []);

  // 댓글 가져오기
  useEffect(() => {
    if (article?.id) {
      getComments(article.id, currentUserId).then(res => {
        if (res.success && res.data) {
          setComments(res.data);
        }
        setIsCommentsLoading(false);
      });
    }
  }, [article?.id, currentUserId]);

  const loadComments = async () => {
    if (!article?.id) return;
    const res = await getComments(article.id, currentUserId);
    if (res.success && res.data) setComments(res.data);
  };

  const handleCommentSubmit = async () => {
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!commentText.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }
    
    const res = await addComment(article.id, commentText, isSecretComment, currentUserId, currentUserName || "익명");
    if (res.success) {
      setCommentText("");
      setIsSecretComment(false);
      loadComments();
    } else {
      alert("댓글 등록에 실패했습니다.");
    }
  };

  const handleToggleLike = async (commentId: string, type: 'LIKE'|'DISLIKE') => {
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }
    const res = await toggleCommentLike(commentId, currentUserId, type);
    if (res.success) loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;
    if (confirm("댓글을 삭제하시겠습니까?")) {
      const res = await deleteComment(commentId, currentUserId);
      if (res.success) loadComments();
      else alert("삭제에 실패했습니다.");
    }
  };

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

  useEffect(() => {
    if (article && article.id) {
      incrementArticleView(article.id).then((res) => {
        if (res.success && res.view_count !== undefined) {
          setViewCount(res.view_count);
        }
      });
    }
  }, [article.id]);

  // 기사 작성자의 권한 확인 및 공실 데이터 페칭
  useEffect(() => {
    async function fetchAuthorData() {
      if (!article?.author_id) return;
      try {
        const supabase = createClient();
        const { data: member } = await supabase
          .from("members")
          .select("role")
          .eq("id", article.author_id)
          .single();
        
        if (member) {
          setAuthorRole(member.role);
          // 부동산회원인 경우에만 추천 공실 표시를 위해 데이터 가져오기
          if (member.role === "REALTOR") {
            const res = await getVacancies({ ownerId: article.author_id });
            if (res.success && res.data) {
              setAuthorVacancies(res.data);
            }
          }
        }
      } catch (err) {}
    }
    fetchAuthorData();
  }, [article?.author_id]);

  // 스크롤 진행 바 (리렌더링 방지)
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

  // 외부 영역 클릭 시 팝업 닫기
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

  // 토스트 자동 사라짐
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // 카카오 SDK 로드
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

  // 찜하기 기능
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

  // 카카오톡 공유
  const handleKakaoShare = () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK가 로드되지 않았습니다. 잠시 후 시도해 주세요.");
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

  // URL 복사
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

  // 글자 크기
  const handleFontSizeChange = (idx: number) => {
    setFontSizeIndex(idx);
    localStorage.setItem("news_font_size_index", String(idx));
  };

  // 인쇄
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) return;
    const imgHtml = article.thumbnail_url ? `<img src="${article.thumbnail_url}" style="max-width:100%;max-height:400px;object-fit:contain;margin-bottom:16px;border-radius:8px;" />` : "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>${article.title} - 공실뉴스</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 40px; color: #222; max-width: 800px; margin: 0 auto; background: #fff; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; }
          .header .logo { font-size: 24px; font-weight: 900; color: #1a73e8; display: flex; align-items: baseline; gap: 8px; }
          .header .sub { font-size: 13px; color: #666; font-weight: 500; }
          .title { font-size: 28px; font-weight: 800; color: #111; margin-bottom: 20px; line-height: 1.4; word-break: keep-all; }
          .meta { font-size: 14px; color: #555; margin-bottom: 30px; display: flex; align-items: center; gap: 12px; }
          .meta-divider { width: 1px; height: 12px; background: #ddd; }
          .content { font-size: 16px; color: #333; line-height: 1.8; margin-top: 30px; word-break: break-word; }
          .content img, .content iframe { max-width: 100%; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #888; text-align: center; }
          @media print { 
            body { padding: 20px; -webkit-print-color-adjust: exact; } 
            .content img, .content iframe { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">공실뉴스 <span class="sub">부동산 정보 채널</span></div>
          <div class="sub">인쇄일: ${new Date().toLocaleDateString("ko-KR")}</div>
        </div>
        <div class="title">${article.title}</div>
        <div class="meta">
          <span style="font-weight: 700; color: #222;">${article.author_name || "공실뉴스"} 기자</span>
          <span class="meta-divider"></span>
          <span>${formatDate(article.published_at || article.created_at)}</span>
        </div>
        ${imgHtml}
        <div class="content">${article.content || ""}</div>
        <div class="footer">본문에 포함된 모든 내용의 저작권은 공실뉴스에 있으며 무단전재 및 재배포를 금지합니다.<br/><br/>${window.location.origin}/news/${article.article_no || article.id}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1500);
  };

  // 유튜브 ID 추출
  const extractYoutubeId = (url?: string, html?: string): string | null => {
    const rx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
    if (url) { const m = url.match(rx); if (m) return m[1]; }
    if (html) { const m = html.match(rx); if (m) return m[1]; }
    return null;
  };
  const youtubeId = extractYoutubeId(article.youtube_url, article.content);
  // Add comment to trigger recompile
  const hasYoutube = !!youtubeId;

  const currentFontSize = FONT_SIZES[fontSizeIndex].size;

  return (
    <>
      <div ref={scrollBarRef} className="scroll-progress" style={{ width: 0 }}></div>

      <main className="container px-20" style={{ position: "relative" }}>
        <div className="news-layout">
          {/* 본문 영역 */}
          <div className="news-read-area">
            <div className="detail-breadcrumb">
              [{article.section1 || "뉴스"} &gt; {article.section2 || "전체"}]
            </div>
            <h1 className="detail-title">{article.title}</h1>
            
            <div className="detail-meta">
              <div className="meta-info">
                <span style={{ color: "#111", fontWeight: "bold" }}>{article.author_name || "공실뉴스"}</span>
                <span className="meta-divider"></span>
                <span suppressHydrationWarning>입력 {formatDate(article.published_at || article.created_at)}</span>
                {article.updated_at && (
                  <>
                    <span className="meta-divider"></span>
                    <span suppressHydrationWarning>수정 {formatDate(article.updated_at)}</span>
                  </>
                )}
                <span className="meta-divider"></span>
                <span>조회수 {viewCount}</span>
              </div>
              
              <div className="meta-stats" style={{ position: "relative" }}>
                <span className="meta-icon" title={isBookmarked ? "찜 해제" : "찜하기"} onClick={toggleBookmark} style={{ cursor: "pointer", color: isBookmarked ? "#f5a623" : undefined }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={isBookmarked ? "#f5a623" : "none"} stroke={isBookmarked ? "#f5a623" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </span>
                
                <span className="meta-icon" title="공유하기" onClick={() => { setShowShareDropdown(!showShareDropdown); setShowFontSizePopup(false); }} style={{ cursor: "pointer", color: showShareDropdown ? "#1a73e8" : undefined }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </span>
                
                <span className="meta-icon" title="글자 크기" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 1, letterSpacing: -1, cursor: "pointer", color: showFontSizePopup ? "#1a73e8" : undefined }} onClick={() => { setShowFontSizePopup(!showFontSizePopup); setShowShareDropdown(false); }}>
                  <span style={{ fontSize: 13 }}>가</span><span style={{ fontSize: 17 }}>가</span>
                </span>
                
                <span className="meta-icon" title="기사 인쇄" onClick={handlePrint} style={{ cursor: "pointer" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </span>

                {showShareDropdown && (
                  <div ref={shareDropdownRef} style={{ position: "absolute", top: "100%", right: 40, marginTop: 8, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: 200, zIndex: 9999, overflow: "hidden", animation: "dropdownFadeIn 0.15s ease" }}>
                    <button onClick={handleKakaoShare} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: 14, color: "#333", fontFamily: "inherit", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>
                      </div>
                      <span style={{ fontWeight: 600 }}>카카오톡 공유</span>
                    </button>
                    <button onClick={handleCopyUrl} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#333", fontFamily: "inherit", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      </div>
                      <span style={{ fontWeight: 600 }}>URL 복사</span>
                    </button>
                  </div>
                )}

                {showFontSizePopup && (
                  <div ref={fontSizePopupRef} style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: 280, zIndex: 9999, padding: "20px", animation: "dropdownFadeIn 0.15s ease" }}>
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
                            border: fontSizeIndex === idx ? "2px solid #1a73e8" : "1px solid #ddd",
                            borderRadius: 8,
                            background: fontSizeIndex === idx ? "#1a73e8" : "#fff",
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
                        <span key={idx} style={{ flex: 1, textAlign: "center", fontSize: 11, color: fontSizeIndex === idx ? "#1a73e8" : "#999", fontWeight: fontSizeIndex === idx ? 800 : 400, letterSpacing: -0.5 }}>
                          {fs.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {article.subtitle && (
              <div className="article-subtitle-box">{article.subtitle}</div>
            )}

            <div className="article-body" style={{ fontSize: currentFontSize, lineHeight: currentFontSize >= 20 ? 1.9 : 1.7 }}>
              {hasYoutube ? (
                <div className="article-img-wrap">
                  <div style={{ position: "relative", width: "100%", maxWidth: article.is_shorts ? 315 : "100%", aspectRatio: article.is_shorts ? "9 / 16" : "16 / 9", margin: "0 auto", overflow: "hidden" }}>
                    {mounted && (
                      <iframe src={`https://www.youtube.com/embed/${youtubeId}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                    )}
                  </div>
                </div>
              ) : !hasYoutube && article.thumbnail_url && !(article.content && article.content.includes(article.thumbnail_url)) ? (
                <div className="article-img-wrap">
                  <img src={article.thumbnail_url} alt={article.title} style={{ width: "100%", maxHeight: 500, objectFit: "cover" }} />
                </div>
              ) : null}

              {article.content && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ 
                  __html: article.content
                    .replace(/<p[^>]*>\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/p>/gi, '')
                    .replace(/<div(?:(?!class="article-body")[^>]*)?>\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/div>/gi, '')
                    .replace(/<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>/gi, '') 
                }} />
              )}
            </div>

            {article.article_keywords && article.article_keywords.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "24px 0", padding: "16px 0", borderTop: "1px solid #eee" }}>
                {article.article_keywords.map((kw: any, i: number) => (
                  <Link href={`/news_all?keyword=${encodeURIComponent(kw.keyword)}`} key={i} style={{ padding: "6px 14px", borderRadius: 20, background: "#fff", color: "#555", fontSize: 13, fontWeight: 500, border: "1px solid #ccc", textDecoration: "none", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    #{kw.keyword}
                  </Link>
                ))}
              </div>
            )}

            <div className="article-footer-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 800, color: "#111" }}>{article.author_name || "공실뉴스"}</span>
              </div>
              <div style={{ color: "#888", fontSize: 13 }}>저작권자 © 공실뉴스 무단전재 및 재배포 금지</div>
            </div>

            <div className="comments-section" style={{ marginTop: 60 }}>
              <div className="comment-header">
                <div className="comment-count" style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>{comments.length}개의 댓글</div>
              </div>
              <div className="comment-box" style={{ background: "#f9fafb", padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 30 }}>
                <div className="comment-user-name" style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: currentUserId ? "#111" : "#9ca3af" }}>
                  {currentUserId ? currentUserName : "로그인이 필요합니다"}
                </div>
                <textarea 
                  className="comment-textarea" 
                  placeholder={currentUserId ? "댓글을 남겨보세요" : "의견을 남기려면 로그인이 필요합니다."} 
                  value={commentText} 
                  onChange={(e) => setCommentText(e.target.value.slice(0, 400))}
                  disabled={!currentUserId}
                  style={{ width: "100%", height: 80, padding: 12, border: "1px solid #d1d5db", borderRadius: 8, resize: "none", fontSize: 14, outline: "none", fontFamily: "inherit" }}
                />
                <div className="comment-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <div style={{ fontSize: 13, color: "#6b7280", display: "flex", alignItems: "center", gap: 16 }}>
                    <span><span style={{ fontWeight: "bold", color: "#111" }}>{commentText.length}</span> / 400</span>
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#4b5563" }}>
                      <input type="checkbox" checked={isSecretComment} onChange={e => setIsSecretComment(e.target.checked)} disabled={!currentUserId} style={{ accentColor: "#508bf5" }} /> 
                      비밀댓글
                    </label>
                  </div>
                  <button 
                    className="comment-submit-btn" 
                    onClick={handleCommentSubmit}
                    disabled={!currentUserId || !commentText.trim()}
                    style={{ padding: "8px 20px", background: currentUserId && commentText.trim() ? "#1a73e8" : "#9ca3af", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: currentUserId && commentText.trim() ? "pointer" : "not-allowed" }}
                  >
                    등록
                  </button>
                </div>
              </div>

              {isCommentsLoading ? (
                <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 14 }}>댓글을 불러오는 중...</div>
              ) : comments.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>첫 댓글을 남겨보세요.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {comments.map((comment) => {
                    // 비밀댓글 로직: 작성자가 아니거나, 댓글 작성자가 아닌 경우 내용을 가림
                    const isSecret = comment.is_secret;
                    const canViewSecret = 
                      !isSecret || 
                      (currentUserId === comment.author_id) || 
                      (currentUserId === article.author_id);
                    
                    return (
                      <div key={comment.id} style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>
                            {canViewSecret ? comment.author_name : "익명"}
                            {isSecret && <span style={{ marginLeft: 6, fontSize: 11, color: "#ef4444", fontWeight: 600, border: "1px solid #fca5a5", padding: "1px 4px", borderRadius: 4 }}>비밀글</span>}
                          </span>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>{formatDate(comment.created_at)}</span>
                            {currentUserId === comment.author_id && (
                              <button onClick={() => handleDeleteComment(comment.id)} style={{ border: "none", background: "none", color: "#ef4444", fontSize: 12, cursor: "pointer", padding: 0 }}>삭제</button>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ fontSize: 14, color: canViewSecret ? "#374151" : "#9ca3af", lineHeight: 1.6, fontStyle: canViewSecret ? "normal" : "italic", whiteSpace: "pre-wrap" }}>
                          {canViewSecret ? comment.content : "비밀 댓글입니다. (작성자와 기사 작성자만 볼 수 있습니다.)"}
                        </div>

                        {canViewSecret && (
                          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            <button onClick={() => handleToggleLike(comment.id, 'LIKE')} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 12, borderRadius: 16, border: comment.myLike === 'LIKE' ? "1px solid #3b82f6" : "1px solid #e5e7eb", background: comment.myLike === 'LIKE' ? "#eff6ff" : "#fff", color: comment.myLike === 'LIKE' ? "#3b82f6" : "#4b5563", cursor: "pointer" }}>
                              👍 {comment.likeCount}
                            </button>
                            <button onClick={() => handleToggleLike(comment.id, 'DISLIKE')} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 12, borderRadius: 16, border: comment.myLike === 'DISLIKE' ? "1px solid #ef4444" : "1px solid #e5e7eb", background: comment.myLike === 'DISLIKE' ? "#fef2f2" : "#fff", color: comment.myLike === 'DISLIKE' ? "#ef4444" : "#4b5563", cursor: "pointer" }}>
                              👎 {comment.dislikeCount}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid #ccc", textAlign: "center" }}>
              <button className="back-to-list" onClick={() => window.history.back()}>목록으로 돌아가기</button>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="news-sidebar">
            <div className="sb-widget">
              <div className="sidebar-hot-title">HOT 매물/광고</div>
              <div className="sidebar-hot-map">공실가이드맵 (지도 이미지)</div>
              <div className="sidebar-hot-label">강남구 역삼동 신축 빌딩 (수익률 6%)</div>
            </div>

            <div className="sb-widget">
              <div className="sidebar-cta-btn" style={{ background: "#00b894" }}>공실알림<br /><span>(관심도 1,000개 부동산 가입)</span></div>
              <div className="sidebar-cta-btn" style={{ background: "#00cec9", marginBottom: 30 }}>신축/분양/권리조회<br /><span>(부동산 전문가에게 의뢰)</span></div>
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

            {/* 추천 공실 - 부동산회원이고, 사진이 1개라도 있는 공실이 있을 때만 노출 */}
            {authorRole === "REALTOR" && authorVacancies.filter(v => v.vacancy_photos && v.vacancy_photos.length > 0).length > 0 && (
              <div className="sb-widget">
                <div className="sb-title">추천 공실</div>
                {authorVacancies.filter(v => v.vacancy_photos && v.vacancy_photos.length > 0).map((prop, i) => {
                  const title = prop.building_name || prop.detail_addr || "이름없는 공실";
                  
                  // 가격 포매팅 로직 개선 (원 단위 -> 억/만 혼합)
                  const formatMoney = (val: number) => {
                    if (!val) return "0";
                    if (val >= 100000000) {
                      const uk = Math.floor(val / 100000000);
                      const man = Math.floor((val % 100000000) / 10000);
                      return `${uk}억${man > 0 ? ` ${man}만` : ""}`;
                    }
                    return `${Math.floor(val / 10000)}만`;
                  };

                  let price = prop.trade_type;
                  if (prop.trade_type === "매매" || prop.trade_type === "전세") price += ` ${formatMoney(prop.deposit)}`;
                  else if (prop.trade_type === "월세") price += ` ${formatMoney(prop.deposit || 0)} / ${formatMoney(prop.monthly_rent || 0)}`;
                  
                  const detailStr = `룸 ${prop.room_count||0}개, 욕실 ${prop.bath_count||0}개`;
                  const thumb = prop.vacancy_photos && prop.vacancy_photos.length > 0 ? prop.vacancy_photos[0].url : "";
                  const createdDate = prop.created_at ? new Date(prop.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\.$/, "") : "";

                  return (
                    <Link href={`/gongsil?id=${prop.id}`} target="_blank" key={prop.id || i} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div className="prop-item" style={{ padding: "16px 0", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 12, cursor: "pointer", background: "#fff", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div className="prop-info" style={{ minWidth: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
                          <div className="prop-title" style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                          <div className="prop-price" style={{ color: "#1a73e8", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{price}</div>
                          <div className="prop-meta" style={{ fontSize: 12, color: "#666", marginBottom: 3 }}>
                            {prop.property_type || "주택"} <span style={{color: "#ddd"}}>|</span> {prop.direction || "방향없음"} <span style={{color: "#ddd"}}>|</span> {prop.exclusive_m2 || 0}㎡
                          </div>
                          <div className="prop-meta" style={{ fontSize: 12, color: "#666", marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {detailStr}{prop.options && prop.options.length > 0 ? `, ${prop.options.join(", ")}` : ""}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {prop.commission_type && (
                              <span style={{ fontSize: 11, color: "#ef4444", border: "1px solid #fca5a5", padding: "2px 6px", borderRadius: 2 }}>
                                {prop.commission_type}
                              </span>
                            )}
                            {prop.vacancy_no && (
                              <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 700 }}>{prop.vacancy_no}</span>
                            )}
                            <span style={{ fontSize: 12, color: "#999" }}>{createdDate}</span>
                          </div>
                        </div>
                        {thumb ? (
                          <div className="prop-img-wrapper" style={{ flexShrink: 0 }}>
                            <div style={{ width: 80, height: 80, backgroundColor: "#eee", backgroundImage: `url(${thumb})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 6, border: "1px solid #eee" }}></div>
                          </div>
                        ) : (
                          <div className="prop-img-wrapper" style={{ flexShrink: 0 }}>
                            <div style={{ width: 80, height: 80, backgroundColor: "#f4f5f7", borderRadius: 6, border: "1px solid #eee" }}></div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {toastMessage && (
        <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.8)", color: "#fff", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: "bold", zIndex: 999999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", animation: "toastFadeIn 0.2s ease" }}>
          {toastMessage}
        </div>
      )}
      <style>{`
        @keyframes toastFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
