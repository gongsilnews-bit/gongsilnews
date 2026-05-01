"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import { incrementArticleView } from "@/app/actions/article";
import { getComments, addComment, deleteComment, toggleCommentLike, editComment } from "@/app/actions/comment";
import { getArticleReactions, toggleArticleReaction } from "@/app/actions/reaction";
import { getVacancies } from "@/app/actions/vacancy";
import AuthModal from "./AuthModal";
import BannerSlot from "./BannerSlot";

interface NewsReadContentProps {
  article: any;
  popularArticles: any[];
}

const FONT_SIZES = [
  { label: "작게", size: 16 },
  { label: "보통", size: 18 },
  { label: "크게", size: 20 },
  { label: "아주크게", size: 22 },
  { label: "최대크게", size: 24 },
];

export default function NewsReadContent({ article, popularArticles }: NewsReadContentProps) {
  const pathname = usePathname() || "";
  const isMobile = pathname.startsWith("/m");
  const basePath = isMobile ? "/m" : "";

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

  // 대댓글(답글) State
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSecretReply, setIsSecretReply] = useState(false);

  // 댓글 수정 State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // 스티커(리액션) State
  const [reactionCounts, setReactionCounts] = useState<any>({ INFO: 0, INTERESTING: 0, AGREE: 0, ANALYSIS: 0, RECOMMEND: 0 });
  const [myReaction, setMyReaction] = useState<string | null>(null);

  // 로그인 모달 State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 커스텀 Confirm 모달 State
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean; message: string; onConfirm: () => void} | null>(null);

  // 작성자 정보 및 소속 공실 State
  const [authorRole, setAuthorRole] = useState<string | null>(null);
  const [authorEmail, setAuthorEmail] = useState<string | null>(null);
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

  // 댓글 및 리액션 가져오기
  useEffect(() => {
    if (article?.id) {
      getComments(article.id, currentUserId).then(res => {
        if (res.success && res.data) {
          setComments(res.data);
        }
        setIsCommentsLoading(false);
      });
      getArticleReactions(article.id, currentUserId).then(res => {
        if (res.success && res.counts) {
          setReactionCounts(res.counts);
          setMyReaction(res.myReaction || null);
        }
      });
    }
  }, [article?.id, currentUserId]);

  const loadComments = async () => {
    if (!article?.id) return;
    const res = await getComments(article.id, currentUserId);
    if (res.success && res.data) setComments(res.data);
  };

  const loadReactions = async () => {
    if (!article?.id) return;
    const res = await getArticleReactions(article.id, currentUserId);
    if (res.success && res.counts) {
      setReactionCounts(res.counts);
      setMyReaction(res.myReaction || null);
    }
  };

  const handleCommentSubmit = async () => {
    if (!currentUserId) {
      setConfirmDialog({
        isOpen: true,
        message: "의견을 남기려면 로그인이 필요합니다.\n로그인 화면으로 이동할까요?",
        onConfirm: () => setIsAuthModalOpen(true)
      });
      return;
    }
    if (!commentText.trim()) {
      setToastMessage("댓글 내용을 입력해주세요.");
      return;
    }
    
    const res = await addComment(article.id, commentText, isSecretComment, currentUserId, currentUserName || "익명", null);
    if (res.success) {
      setCommentText("");
      setIsSecretComment(false);
      loadComments();
    } else {
      setToastMessage("댓글 등록에 실패했습니다.");
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!currentUserId) {
      setConfirmDialog({
        isOpen: true,
        message: "의견을 남기려면 로그인이 필요합니다.\n로그인 화면으로 이동할까요?",
        onConfirm: () => setIsAuthModalOpen(true)
      });
      return;
    }
    if (!replyText.trim()) {
      setToastMessage("답글 내용을 입력해주세요.");
      return;
    }
    
    const res = await addComment(article.id, replyText, isSecretReply, currentUserId, currentUserName || "익명", parentId);
    if (res.success) {
      setReplyText("");
      setIsSecretReply(false);
      setReplyToCommentId(null);
      loadComments();
    } else {
      setToastMessage("답글 등록에 실패했습니다.");
    }
  };

  const handleToggleReaction = async (type: string) => {
    if (!currentUserId) {
      setConfirmDialog({
        isOpen: true,
        message: "의견을 남기려면 로그인이 필요합니다.\n로그인 화면으로 이동할까요?",
        onConfirm: () => setIsAuthModalOpen(true)
      });
      return;
    }
    const res = await toggleArticleReaction(article.id, currentUserId, type);
    if (res.success) loadReactions();
  };

  const handleEditSubmit = async (commentId: string) => {
    if (!currentUserId) return;
    if (!editingContent.trim()) {
      setToastMessage("수정할 내용을 입력해주세요.");
      return;
    }
    const res = await editComment(commentId, currentUserId, editingContent);
    if (res.success) {
      setEditingCommentId(null);
      setEditingContent("");
      loadComments();
    } else {
      setToastMessage("댓글 수정에 실패했습니다.");
    }
  };

  const handleToggleLike = async (commentId: string, type: 'LIKE'|'DISLIKE') => {
    if (!currentUserId) {
      setConfirmDialog({
        isOpen: true,
        message: "의견을 남기려면 로그인이 필요합니다.\n로그인 화면으로 이동할까요?",
        onConfirm: () => setIsAuthModalOpen(true)
      });
      return;
    }
    const res = await toggleCommentLike(commentId, currentUserId, type);
    if (res.success) loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;
    if (confirm("댓글을 삭제하시겠습니까? (삭제 시 복구할 수 없습니다.)")) {
      const res = await deleteComment(commentId, currentUserId);
      if (res.success) {
        setToastMessage("댓글이 삭제되었습니다.");
        loadComments();
      }
      else setToastMessage("삭제에 실패했습니다.");
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
          .select("role, email")
          .eq("id", article.author_id)
          .single();
        
        if (member) {
          setAuthorRole(member.role);
          if (member.email) setAuthorEmail(member.email);
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
      setToastMessage("카카오 SDK 로드 중입니다. 잠시 후 시도해 주세요.");
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
            <h1 className="detail-title" style={{ fontSize: `${currentFontSize + 10}px`, lineHeight: 1.35, transition: "font-size 0.2s ease" }}>{article.title}</h1>
            
            <div style={{ padding: "0", marginBottom: "30px", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "15px", color: "#111", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontWeight: "700" }}>{article.author_name || "공실뉴스"}</span>
                    <span style={{ fontSize: "13px", color: "#666" }}>기자</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#888", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span suppressHydrationWarning>입력 {formatDate(article.published_at || article.created_at)}</span>
                    {article.updated_at && (
                      <span suppressHydrationWarning>수정 {formatDate(article.updated_at)}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 기능 버튼 (조회수) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", height: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6b7280", fontWeight: "600", lineHeight: 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>조회수</span> 
                    <span style={{ color: "#374151" }}>{viewCount}</span>
                  </span>
                </div>
                
                <div className="meta-stats" style={{ display: "flex", gap: "14px", alignItems: "center", height: "100%" }}>
                  <span className="meta-icon" title={isBookmarked ? "찜 해제" : "찜하기"} onClick={toggleBookmark} style={{ cursor: "pointer", color: isBookmarked ? "#1a73e8" : "#222", display: "flex", alignItems: "center" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  </span>
                  
                  <span className="meta-icon" title="글자 크기" style={{ fontWeight: "400", display: "flex", alignItems: "baseline", gap: "1px", letterSpacing: "-1px", cursor: "pointer", color: showFontSizePopup ? "#1a73e8" : "#222" }} onClick={() => { setShowFontSizePopup(!showFontSizePopup); setShowShareDropdown(false); }}>
                    <span style={{ fontSize: "10px", lineHeight: 1 }}>가</span><span style={{ fontSize: "14px", lineHeight: 1 }}>가</span>
                  </span>
                  
                  <span className="meta-icon" title="공유하기" onClick={() => { setShowShareDropdown(!showShareDropdown); setShowFontSizePopup(false); }} style={{ cursor: "pointer", color: showShareDropdown ? "#1a73e8" : "#222", display: "flex", alignItems: "center" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  </span>
                  
                  {/* Share Dropdown */}
                  {showShareDropdown && (
                    <div ref={shareDropdownRef} style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "10px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: "200px", zIndex: 9999, overflow: "hidden", animation: "dropdownFadeIn 0.15s ease" }}>
                      <button onClick={handleKakaoShare} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: "14px", color: "#333", fontFamily: "inherit", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>
                        </div>
                        <span style={{ fontWeight: 600 }}>카카오톡 공유</span>
                      </button>
                      <button onClick={handleCopyUrl} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#333", fontFamily: "inherit", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        </div>
                        <span style={{ fontWeight: 600 }}>URL 복사</span>
                      </button>
                    </div>
                  )}

                  {/* FontSize Popup */}
                  {showFontSizePopup && (
                    <div ref={fontSizePopupRef} style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: "280px", zIndex: 9999, padding: "20px", animation: "dropdownFadeIn 0.15s ease" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: "#111" }}>글자크기</span>
                        <button onClick={() => setShowFontSizePopup(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                        {FONT_SIZES.map((fs, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleFontSizeChange(idx)}
                            style={{
                              flex: 1,
                              height: "44px",
                              border: fontSizeIndex === idx ? "2px solid #1a73e8" : "1px solid #ddd",
                              borderRadius: "8px",
                              background: fontSizeIndex === idx ? "#1a73e8" : "#fff",
                              color: fontSizeIndex === idx ? "#fff" : "#333",
                              fontSize: `${fs.size - 4}px`,
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
                      <div style={{ display: "flex", gap: "4px" }}>
                        {FONT_SIZES.map((fs, idx) => (
                          <span key={idx} style={{ flex: 1, textAlign: "center", fontSize: "11px", color: fontSizeIndex === idx ? "#1a73e8" : "#999", fontWeight: fontSizeIndex === idx ? 800 : 400, letterSpacing: "-0.5px" }}>
                            {fs.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {article.subtitle && (
              <div className="article-subtitle-box" style={{ fontSize: `${currentFontSize + 2}px`, lineHeight: 1.5, transition: "font-size 0.2s ease" }}>{article.subtitle}</div>
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
                <div className="article-img-wrap" style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: "8px", marginBottom: "16px" }}>
                  <Image src={article.thumbnail_url} alt={article.title} fill style={{ objectFit: "cover" }} sizes="100vw" />
                </div>
              ) : null}

              {article.content && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ 
                  __html: article.content
                    .replace(/<button[^>]*class="editor-media-delete"[^>]*>.*?<\/button>/gi, '')
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

            <div className="article-footer-bar" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, color: "#111", fontSize: 16 }}>{article.author_name || "공실뉴스"}</span>
                    <span style={{ color: "#666", fontSize: 14 }}>{authorRole === "ADMIN" ? "기자" : "객원기자"}</span>
                    <Link href={`/news_all?author_name=${encodeURIComponent(article.author_name || "공실뉴스")}`} style={{ background: "#e11d48", color: "#fff", fontSize: 11, fontWeight: "bold", padding: "4px 8px", borderRadius: 4, textDecoration: "none" }}>다른기사 보기</Link>
                  </div>
                  {authorEmail && <div style={{ color: "#888", fontSize: 13 }}>{authorEmail}</div>}
                </div>
                <div style={{ color: "#888", fontSize: 13, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>저작권자 © 공실뉴스 무단전재 및 재배포 금지</div>
              </div>
            </div>

            {/* ── 추천 (리액션) 섹션 ── */}
            <div className="recommend-section" style={{ marginTop: 40, paddingBottom: 24, borderBottom: "8px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111", margin: 0 }}>이 기사를 추천합니다</h3>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", paddingBottom: "8px" }}>
                {[
                  { type: 'INFO', icon: '💡', label: '쏠쏠정보' },
                  { type: 'INTERESTING', icon: '🤓', label: '흥미진진' },
                  { type: 'AGREE', icon: '😊', label: '공감백배' },
                  { type: 'ANALYSIS', icon: '✨', label: '분석탁월' },
                  { type: 'RECOMMEND', icon: '👍', label: '후속강추' },
                ].map(rp => (
                  <div key={rp.type} onClick={() => handleToggleReaction(rp.type)} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", gap: 6, opacity: myReaction === rp.type ? 1 : 0.6, transition: "opacity 0.2s", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 24, lineHeight: 1 }}>{rp.icon}</span>
                      <span style={{ fontSize: 11, color: "#555", fontWeight: myReaction === rp.type ? "bold" : "normal", whiteSpace: "nowrap" }}>{rp.label}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: "bold", color: "#111" }}>{reactionCounts[rp.type] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="comments-section" style={{ marginTop: 24 }}>
              <div className="comment-header" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: 20 }}>
                <div className="comment-count" style={{ fontSize: 18, fontWeight: 800 }}>{comments.length}개의 댓글</div>
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
                  readOnly={!currentUserId}
                  onClick={() => {
                    if (!currentUserId) {
                      setConfirmDialog({
                        isOpen: true,
                        message: "의견을 남기려면 로그인이 필요합니다.\n로그인 화면으로 이동할까요?",
                        onConfirm: () => setIsAuthModalOpen(true)
                      });
                    }
                  }}
                  style={{ width: "100%", height: 80, padding: 12, border: "1px solid #d1d5db", borderRadius: 8, resize: "none", fontSize: 14, outline: "none", fontFamily: "inherit", background: "#fff", cursor: currentUserId ? "text" : "pointer" }}
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
                  {(() => {
                    // 최상위 댓글 추출 및 대댓글 연결을 위한 구조화
                    const rootComments = comments.filter(c => !c.parent_id);
                    const getChildren = (parentId: string) => comments.filter(c => c.parent_id === parentId);
                    
                    const renderComment = (comment: any, depth: number = 0) => {
                      const isSecret = comment.is_secret;
                      const canViewSecret = !isSecret || (currentUserId === comment.author_id) || (currentUserId === article.author_id);
                      const children = getChildren(comment.id);

                      return (
                        <div key={comment.id} style={{ paddingLeft: depth * 24, borderBottom: "1px solid #f3f4f6", paddingBottom: 16 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: depth > 0 ? 16 : 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                {depth > 0 && <span style={{ color: "#9ca3af" }}>↳</span>}
                                {canViewSecret ? comment.author_name : "익명"}
                                {isSecret && <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, border: "1px solid #fca5a5", padding: "1px 4px", borderRadius: 4 }}>비밀글</span>}
                              </span>
                              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#9ca3af" }}>{formatDate(comment.created_at)}</span>
                                {currentUserId === comment.author_id && (
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content); }} style={{ border: "none", background: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", padding: 0 }}>수정</button>
                                    <button onClick={() => handleDeleteComment(comment.id)} style={{ border: "none", background: "none", color: "#ef4444", fontSize: 12, cursor: "pointer", padding: 0 }}>삭제</button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {editingCommentId === comment.id ? (
                              <div style={{ marginTop: 8, padding: 12, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                                <textarea 
                                  value={editingContent} 
                                  onChange={(e) => setEditingContent(e.target.value.slice(0, 400))}
                                  style={{ width: "100%", height: 60, padding: 12, border: "1px solid #d1d5db", borderRadius: 8, resize: "none", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff", marginBottom: 8 }}
                                />
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                  <button onClick={() => setEditingCommentId(null)} style={{ padding: "6px 14px", background: "#fff", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>취소</button>
                                  <button onClick={() => handleEditSubmit(comment.id)} disabled={!editingContent.trim()} style={{ padding: "6px 14px", background: editingContent.trim() ? "#1a73e8" : "#9ca3af", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: "bold", cursor: editingContent.trim() ? "pointer" : "not-allowed" }}>저장</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 14, color: canViewSecret ? "#374151" : "#9ca3af", lineHeight: 1.6, fontStyle: canViewSecret ? "normal" : "italic", whiteSpace: "pre-wrap" }}>
                                {canViewSecret ? comment.content : "비밀 댓글입니다. (작성자와 기사 작성자만 볼 수 있습니다.)"}
                              </div>
                            )}

                            {canViewSecret && !editingCommentId && (
                              <div style={{ display: "flex", gap: 12, marginTop: 4, alignItems: "center" }}>
                                <button onClick={() => handleToggleLike(comment.id, 'LIKE')} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 12, borderRadius: 16, border: comment.myLike === 'LIKE' ? "1px solid #3b82f6" : "1px solid #e5e7eb", background: comment.myLike === 'LIKE' ? "#eff6ff" : "#fff", color: comment.myLike === 'LIKE' ? "#3b82f6" : "#4b5563", cursor: "pointer" }}>
                                  👍 {comment.likeCount}
                                </button>
                                <button onClick={() => handleToggleLike(comment.id, 'DISLIKE')} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 12, borderRadius: 16, border: comment.myLike === 'DISLIKE' ? "1px solid #ef4444" : "1px solid #e5e7eb", background: comment.myLike === 'DISLIKE' ? "#fef2f2" : "#fff", color: comment.myLike === 'DISLIKE' ? "#ef4444" : "#4b5563", cursor: "pointer" }}>
                                  👎 {comment.dislikeCount}
                                </button>
                                <button onClick={() => {setReplyToCommentId(comment.id); setReplyText(''); setIsSecretReply(false);}} style={{ border: "none", background: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>답글</button>
                              </div>
                            )}
                          </div>
                          
                          {/* 대댓글 입력 폼 */}
                          {replyToCommentId === comment.id && (
                            <div style={{ marginTop: 12, padding: 16, background: "#f3f4f6", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                              <textarea 
                                placeholder="답글을 남겨보세요" 
                                value={replyText} 
                                onChange={(e) => setReplyText(e.target.value.slice(0, 400))}
                                style={{ width: "100%", height: 60, padding: 12, border: "1px solid #d1d5db", borderRadius: 8, resize: "none", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff", marginBottom: 8 }}
                              />
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#4b5563", fontSize: 13 }}>
                                  <input type="checkbox" checked={isSecretReply} onChange={e => setIsSecretReply(e.target.checked)} style={{ accentColor: "#508bf5" }} /> 
                                  비밀답글
                                </label>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button onClick={() => setReplyToCommentId(null)} style={{ padding: "6px 14px", background: "#fff", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>취소</button>
                                  <button onClick={() => handleReplySubmit(comment.id)} disabled={!replyText.trim()} style={{ padding: "6px 14px", background: replyText.trim() ? "#1a73e8" : "#9ca3af", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: "bold", cursor: replyText.trim() ? "pointer" : "not-allowed" }}>답글 등록</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {children.map(child => renderComment(child, depth + 1))}
                        </div>
                      );
                    };

                    return rootComments.map(c => renderComment(c, 0));
                  })()}
                </div>
              )}
            </div>

            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              initialTab="login"
            />

            <div style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid #ccc", textAlign: "center" }}>
              <button className="back-to-list" onClick={() => window.history.back()}>목록으로 돌아가기</button>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="news-sidebar">
            {/* 1. 추천 공실 - 부동산회원이면 등록한 공실 전체 노출 */}
            {authorRole === "REALTOR" && authorVacancies.length > 0 && (
              <div className="sb-widget">
                <div className="sb-title">추천 공실</div>
                {authorVacancies.map((prop, i) => {
                  const title = prop.building_name || prop.detail_addr || "이름없는 공실";
                  
                  // 가격 포매팅 로직 개선 (원 단위 -> 억/천/백 혼합)
                  const formatMoney = (val: number) => {
                    if (!val) return "0";
                    const m = Math.round(val / 10000);
                    if (m === 0) return "0";
                    const e = Math.floor(m / 10000);
                    const r = m % 10000;
                    let result = "";
                    if (e > 0) result += `${e}억`;
                    if (r > 0) {
                      const c = Math.floor(r / 1000);
                      const rem = r % 1000;
                      let rest = "";
                      if (c > 0) rest += `${c}천`;
                      if (rem > 0) rest += `${rem}`;
                      if (rest) result += result ? " " + rest : rest;
                      if (e === 0 && c === 0 && rem > 0) result += "만";
                    }
                    return result || "0";
                  };

                  let price = prop.trade_type;
                  if (prop.trade_type === "매매" || prop.trade_type === "전세") price += ` ${formatMoney(prop.deposit)}`;
                  else if (prop.trade_type === "월세") price += ` ${formatMoney(prop.deposit || 0)} / ${formatMoney(prop.monthly_rent || 0)}`;
                  
                  const detailStr = `룸 ${prop.room_count||0}개, 욕실 ${prop.bath_count||0}개`;
                  const thumb = prop.vacancy_photos && prop.vacancy_photos.length > 0 ? prop.vacancy_photos[0].url : "";
                  const createdDate = prop.created_at ? new Date(prop.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\.$/, "") : "";

                  return (
                    <Link href={isMobile ? `/m/gongsil?id=${prop.id}` : `/gongsil?id=${prop.id}`} target={isMobile ? undefined : "_blank"} key={prop.id || i} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div className="prop-item" style={{ padding: "16px 0", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 12, cursor: "pointer", background: "#fff", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div className="prop-info" style={{ minWidth: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
                          <div className="prop-title" style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                          <div className="prop-price" style={{ color: "#1a73e8", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>{price}</div>
                          <div className="prop-meta" style={{ fontSize: 14, color: "#666", marginBottom: 3 }}>
                            {prop.property_type || "주택"} <span style={{color: "#ddd"}}>|</span> {prop.direction || "방향없음"} <span style={{color: "#ddd"}}>|</span> {prop.exclusive_m2 || 0}㎡
                          </div>
                          <div className="prop-meta" style={{ fontSize: 14, color: "#666", marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {detailStr}{prop.options && prop.options.length > 0 ? `, ${prop.options.join(", ")}` : ""}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {prop.commission_type && (
                              <span style={{ fontSize: 13, color: "#ef4444", border: "1px solid #fca5a5", padding: "2px 6px", borderRadius: 2 }}>
                                {prop.commission_type}
                              </span>
                            )}
                            {prop.vacancy_no && (
                              <span style={{ fontSize: 15, color: "#ef4444", fontWeight: 700 }}>{prop.vacancy_no}</span>
                            )}
                            <span style={{ fontSize: 14, color: "#999" }}>{createdDate}</span>
                          </div>
                        </div>
                        {thumb && (
                          <div className="prop-img-wrapper" style={{ flexShrink: 0 }}>
                            <div style={{ width: 80, height: 80, backgroundColor: "#eee", backgroundImage: `url(${thumb})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 6, border: "1px solid #eee" }}></div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* 2. 많이 본 뉴스 */}
            <div className="sb-widget">
              <div className="sb-title">많이 본 뉴스</div>
              <ul className="pop-list">
                {popularArticles.length > 0 ? popularArticles.map((item, i) => (
                  <li key={item.id} className="pop-item">
                    <Link href={`${basePath}/news/${item.article_no || item.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "flex-start", gap: 8, width: "100%" }}>
                      <span className="pop-ranking">{i + 1}</span>
                      <span className="pop-title">{item.title}</span>
                    </Link>
                  </li>
                )) : (
                  <li className="pop-item" style={{ color: "#999", fontSize: 15 }}>기사가 없습니다.</li>
                )}
              </ul>
            </div>

            {/* 3. 광고 배너 */}
            <div style={{ marginBottom: 20 }}>
              <BannerSlot placement="SIDEBAR" />
            </div>
          </div>
        </div>
      </main>

      {toastMessage && (
        <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.8)", color: "#fff", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: "bold", zIndex: 999999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", animation: "toastFadeIn 0.2s ease" }}>
          {toastMessage}
        </div>
      )}

      {/* 커스텀 Confirm 모달 (귀엽고 깜찍한 블랙박스 팝업) */}
      {confirmDialog?.isOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" }}>
          <div style={{ background: "#222", color: "#fff", padding: "24px 32px", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", textAlign: "center", minWidth: 320, animation: "popIn 0.2s ease" }}>
            <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 24, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {confirmDialog.message}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setConfirmDialog(null)} style={{ padding: "10px 24px", borderRadius: 24, border: "2px solid #555", background: "transparent", color: "#ccc", fontSize: 14, fontWeight: "bold", cursor: "pointer", transition: "0.2s" }} onMouseEnter={e => {e.currentTarget.style.background = "#444"; e.currentTarget.style.color = "#fff"}} onMouseLeave={e => {e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ccc"}}>
                아니요
              </button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} style={{ padding: "10px 24px", borderRadius: 24, border: "none", background: "#f87171", color: "#fff", fontSize: 14, fontWeight: "bold", cursor: "pointer", transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#ef4444"} onMouseLeave={e => e.currentTarget.style.background = "#f87171"}>
                네!!
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @media (max-width: 768px) {
          .article-img-wrap, .article-body img, .article-body iframe {
            margin-left: -20px !important;
            margin-right: -20px !important;
            width: calc(100% + 40px) !important;
            max-width: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
