"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ImportantNewsRotate from "./ImportantNewsRotate";
import BannerSlot from "./BannerSlot";
import { createClient } from "@/utils/supabase/client";
import { getArticleBookmarks, getBookmarkCategories } from "@/app/actions/bookmark";
import AuthModal from "./AuthModal";
import BookmarkCategoryModal from "./BookmarkCategoryModal";

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
  subCategories?: string[];
}

export default function NewsListLayout(props: NewsListLayoutProps) {
  return (
    <React.Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
      <NewsListLayoutInner {...props} />
    </React.Suspense>
  );
}

function NewsListLayoutInner({ category, title, initialArticles, initialPopular, importantArticles = [], searchQuery, isBookmarkMode = false, subCategories = [] }: NewsListLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [currentPage, setCurrentPage] = useState(() => {
    const pageVal = searchParams.get("page");
    return pageVal ? parseInt(pageVal, 10) : 1;
  });
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | 'ALL'>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(searchParams.get("section2") || null);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>(() => {
    const sortVal = searchParams.get("sort");
    return (sortVal === 'popular' || sortVal === 'newest') ? sortVal : 'newest';
  });

  useEffect(() => {
    setSelectedSubCategory(searchParams.get("section2") || null);
  }, [searchParams]);

  // Sync currentPage with URL searchParams and handle initial restoration
  useEffect(() => {
    const pageVal = searchParams.get("page");
    if (pageVal) {
      setCurrentPage(parseInt(pageVal, 10));
    } else {
      const savedPage = sessionStorage.getItem(`pc_news_page_${category}`);
      if (savedPage && savedPage !== "1") {
        setCurrentPage(parseInt(savedPage, 10));
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", savedPage);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      } else {
        setCurrentPage(1);
      }
    }
  }, [searchParams, category]);

  // Restore sort on mount/category change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSort = sessionStorage.getItem(`pc_news_sort_${category}`);
      if (savedSort === 'popular' || savedSort === 'newest') {
        setSortBy(savedSort);
      }
    }
  }, [category]);

  // scrollTo 가로채기: Next.js 라우터의 scrollTo(0) 호출을 일시 차단하여 깜빡임(flicker) 완전 제거
  useLayoutEffect(() => {
    const savedScroll = sessionStorage.getItem(`pc_news_scroll_${category}`);
    if (savedScroll) {
      const scrollY = parseInt(savedScroll, 10);
      sessionStorage.removeItem(`pc_news_scroll_${category}`);

      // 1. 저장된 위치로 즉시 스크롤
      window.scrollTo(0, scrollY);

      // 2. Next.js 라우터의 scrollTo(0) 호출을 일시 차단
      const origScrollTo = window.scrollTo;
      (window as any).scrollTo = function(...args: any[]) {
        let targetY: number | undefined;
        if (typeof args[0] === 'number') targetY = args[1] as number;
        else if (args[0] && typeof args[0] === 'object') targetY = (args[0] as ScrollToOptions).top;
        if (targetY === 0) return; // Next.js의 scroll-to-top 차단
        return origScrollTo.apply(window, args as any);
      };

      // 3. Next.js 라우터 처리 완료 후 원본 scrollTo 복원 (300ms면 충분)
      setTimeout(() => {
        (window as any).scrollTo = origScrollTo;
      }, 300);
    }
  }, [category]);

  // Save current page state to sessionStorage on change
  useEffect(() => {
    if (typeof window !== "undefined" && category) {
      sessionStorage.setItem(`pc_news_page_${category}`, currentPage.toString());
    }
  }, [currentPage, category]);

  // Save sort state to sessionStorage on change
  useEffect(() => {
    if (typeof window !== "undefined" && category) {
      sessionStorage.setItem(`pc_news_sort_${category}`, sortBy);
    }
  }, [sortBy, category]);

  const handleSubCategoryClick = (sub: string | null) => {
    setSelectedSubCategory(sub);
    setCurrentPage(1);
    setSortBy('newest'); // 서브 카테고리 클릭 시 최신순으로 초기화
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`pc_news_scroll_${category}`);
      sessionStorage.setItem(`pc_news_page_${category}`, "1");
    }
    const params = new URLSearchParams(searchParams.toString());
    if (sub) {
      params.set("section2", sub);
    } else {
      params.delete("section2");
    }
    params.delete("page"); // 서브카테고리 클릭 시 1페이지로 리셋
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  // 모달 상태
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [memberName, setMemberName] = useState<string | null>(null);

  // 유저 정보 및 프로필 이름 조회
  useEffect(() => {
    const fetchMemberProfile = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: member } = await supabase
          .from("members")
          .select("name")
          .eq("id", authUser.id)
          .single();
        if (member && member.name) {
          setMemberName(member.name);
        }
      }
    };
    fetchMemberProfile();
  }, []);

  const ITEMS_PER_PAGE = 10;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 관심기사 모드일 때 DB에서 북마크 ID 로드
  useEffect(() => {
    if (isBookmarkMode) {
      const fetchBookmarks = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAuthModalOpen(true);
          return;
        }
        setUser(user);
        
        // Fetch categories
        const catRes = await getBookmarkCategories(user.id, 'ARTICLE');
        if (catRes.success && catRes.categories) {
          setCategories(catRes.categories);
        }

        const res = await getArticleBookmarks(user.id);
        if (res.success && res.bookmarkIds) {
          setBookmarkIds(res.bookmarkIds);
          if (res.bookmarks) setBookmarks(res.bookmarks);
        }
      };
      fetchBookmarks();
    }
  }, [isBookmarkMode, showCategoryModal]);

  // 북마크 모드면 북마크된 기사 중 카테고리에 맞는 기사만 필터
  let displayArticles = isBookmarkMode
    ? initialArticles.filter(a => {
        if (!bookmarkIds.includes(a.id)) return false;
        if (selectedCategoryId === 'ALL') return true;
        const b = bookmarks.find(bm => String(bm.article_id) === String(a.id));
        if (!b) return false;
        return b.category_id === selectedCategoryId;
      })
    : initialArticles;

  // 서브 카테고리 필터 적용 (section2 기준)
  if (selectedSubCategory && !isBookmarkMode) {
    displayArticles = displayArticles.filter(a => a.section2 === selectedSubCategory);
  }

  // 중요 추천 기사 필터링 (세부 카테고리가 지정되었으면 해당 카테고리만 추천)
  let displayImportantArticles = importantArticles;
  if (selectedSubCategory && !isBookmarkMode) {
    // 1. 해당 서브카테고리에 명시적으로 중요 표시된 기사 필터링
    const subImportant = importantArticles.filter(a => a.section2 === selectedSubCategory);
    if (subImportant.length > 0) {
      displayImportantArticles = subImportant;
    } else {
      // 2. 중요 표시된 기사가 없다면, 해당 서브카테고리에 속한 전체 기사 중 최신 기사순으로 상위 5개를 추천 기사로 채워줌
      const subAll = initialArticles.filter(a => a.section2 === selectedSubCategory);
      displayImportantArticles = subAll.slice(0, 5);
    }
  }

  const displayTitle = isBookmarkMode ? "📌 관심기사" : title;

  // 정렬 필터 적용
  const sortedArticles = React.useMemo(() => {
    if (sortBy === 'popular') {
      return [...displayArticles].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }
    return displayArticles;
  }, [displayArticles, sortBy]);

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(sortedArticles.length / ITEMS_PER_PAGE));
  const pagedArticles = sortedArticles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`pc_news_page_${category}`, newPage.toString());
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
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

  // 사이드바 "많이 본 뉴스" 숨김 여부 판단 (북마크 모드거나 제목이 "검색결과"일 때)
  const hidePopularNews = isBookmarkMode || title.includes("검색결과") || title.includes("기자의 글");

  return (
    <>
      <main className="container px-20" style={{ position: "relative", paddingTop: "20px" }}>
        
        {/* 전체 가로 폭을 차지하는 카테고리 헤더 (중앙일보 스타일) */}
        <div style={{ 
          display: "flex", alignItems: "flex-end", gap: "40px", 
          paddingBottom: "12px", marginBottom: "0px" 
        }}>
          <div 
            onClick={() => handleSubCategoryClick(null)}
            style={{ 
              display: "flex", alignItems: "center", gap: "8px", 
              fontSize: "32px", fontWeight: "900", color: "#111", 
              letterSpacing: "-1px", lineHeight: "1", cursor: "pointer",
              marginLeft: "20px"
            }}
            title="전체 기사 보기"
          >
            {displayTitle}
          </div>
          
          {!isBookmarkMode && subCategories && subCategories.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "3px" }}>
              <button
                onClick={() => handleSubCategoryClick(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: selectedSubCategory === null ? "800" : "500",
                  color: selectedSubCategory === null ? "#1a4282" : "#6b7280",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s"
                }}
              >
                전체
              </button>

              {subCategories.map(sub => {
                return (
                  <button
                    key={sub}
                    onClick={() => handleSubCategoryClick(sub)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "16px",
                      fontWeight: selectedSubCategory === sub ? "800" : "500",
                      color: selectedSubCategory === sub ? "#1a4282" : "#6b7280",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          )}

          {isBookmarkMode && (
            <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, marginBottom: "4px" }}>
              총 {displayArticles.length}건
            </span>
          )}
        </div>

        <div className="news-layout" style={{ marginTop: "12px" }}>
          {/* 좌측 뉴스 리스트 */}
          <div className="news-list-area">
            {/* 중요 기사 (상단 이미지 영역 - 프리미엄 스플릿 슬라이더 + 리스트) */}
            {!isBookmarkMode && displayImportantArticles.length > 0 && (
              <div className="premium-recommend-section">
                {/* 1. 개인화 헤더 배너 (대표님 맞춤형 인사말) */}
                {/* 스플릿 매거진 레이아웃 및 헤더 통합 */}
                {(() => {
                  const isKeywordSearch = !!searchQuery;
                  if (isKeywordSearch) {
                    return <PremiumSplitRecommend articles={displayImportantArticles} />;
                  }

                  const activeSub = selectedSubCategory || "전체";
                  const mentalText = PERSONALIZED_MENTAL_MAP[category]?.[activeSub] || "추천 뉴스";
                  const displayName = memberName || "부동산";

                  return (
                    <PremiumSplitRecommend 
                      articles={displayImportantArticles} 
                      memberName={displayName} 
                      mentalText={mentalText} 
                    />
                  );
                })()}
              </div>
            )}

            {/* Category Tabs for Bookmark Mode */}
            {isBookmarkMode && (
              <div style={{ display: 'flex', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 0', marginBottom: '16px', gap: '8px' }} className="no-scrollbar">
                <button
                  onClick={() => { setSelectedCategoryId('ALL'); setCurrentPage(1); }}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: selectedCategoryId === 'ALL' ? 700 : 500,
                    background: selectedCategoryId === 'ALL' ? '#1e56a0' : '#f3f4f6', color: selectedCategoryId === 'ALL' ? '#fff' : '#4b5563',
                    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  전체
                </button>
                <button
                  onClick={() => { setSelectedCategoryId(null); setCurrentPage(1); }}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: selectedCategoryId === null ? 700 : 500,
                    background: selectedCategoryId === null ? '#1e56a0' : '#f3f4f6', color: selectedCategoryId === null ? '#fff' : '#4b5563',
                    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  기본 폴더
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategoryId(cat.id); setCurrentPage(1); }}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: selectedCategoryId === cat.id ? 700 : 500,
                      background: selectedCategoryId === cat.id ? '#1e56a0' : '#f3f4f6', color: selectedCategoryId === cat.id ? '#fff' : '#4b5563',
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

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

            {/* 정렬 필터 바 (모노크롬 미니멀 스타일) */}
            {displayArticles.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", backgroundColor: "#fff", borderBottom: "1px solid #f3f4f6", marginBottom: "20px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#18181b", letterSpacing: "-0.3px" }}>
                  {displayTitle} <span style={{ color: "#a1a1aa", fontWeight: 400, margin: "0 4px" }}>&gt;</span> {selectedSubCategory || "전체"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button 
                    onClick={() => { 
                      setSortBy('newest'); 
                      setCurrentPage(1);
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete("page");
                      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: sortBy === 'newest' ? 700 : 500,
                      color: sortBy === 'newest' ? "#18181b" : "#a1a1aa",
                      cursor: "pointer",
                      padding: "2px 0",
                      transition: "all 0.15s",
                      letterSpacing: "-0.3px"
                    }}
                  >
                    최신순
                  </button>
                  <span style={{ fontSize: "12px", color: "#e4e4e7" }}>|</span>
                  <button 
                    onClick={() => { 
                      setSortBy('popular'); 
                      setCurrentPage(1);
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete("page");
                      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: sortBy === 'popular' ? 700 : 500,
                      color: sortBy === 'popular' ? "#18181b" : "#a1a1aa",
                      cursor: "pointer",
                      padding: "2px 0",
                      transition: "all 0.15s",
                      letterSpacing: "-0.3px"
                    }}
                  >
                    인기순
                  </button>
                </div>
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
                  <Link 
                    href={`/news/${article.article_no || article.id}`} 
                    style={{ textDecoration: "none", color: "inherit" }}
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        sessionStorage.setItem(`pc_news_scroll_${category}`, window.scrollY.toString());
                      }
                    }}
                  >
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
                              <svg viewBox="0 0 24 24" width="24" height="24" fill="white" style={{ marginLeft: "2px" }}><path d="M8 5v14l11-7z"/></svg>
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
                          <span style={{ color: "#1a4282", fontWeight: "bold", marginRight: 8 }}>
                            [{article.section1 || "뉴스"} &gt; {article.section2 || "전체"}]
                          </span>
                          {formatDate(article.published_at || article.created_at || "")} {article.updated_at ? `(수정: ${formatDate(article.updated_at)})` : ""} · {article.author_name || "공실뉴스"}
                        </div>
                      </div>
                    </div>
                  </Link>
                  {isBookmarkMode && (
                    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
                      <button
                        onClick={(e) => { e.preventDefault(); setSelectedArticleId(article.id); setShowCategoryModal(true); }}
                        title="폴더 이동"
                        style={{
                          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
                          padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "#4b5563",
                          fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        }}
                      >
                        폴더 이동
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); removeBookmark(article.id); }}
                        title="관심기사 해제"
                        style={{
                          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
                          padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "#ef4444",
                          fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                        해제
                      </button>
                    </div>
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
            <div className="sidebar-banner-wrapper">
              <BannerSlot placement="LIST_SIDEBAR" category={category} />
            </div>

            {/* 많이 본 뉴스 5개 (검색/북마크 모드일 때는 숨김) */}
            {!hidePopularNews && (
              <div className="sb-widget">
                <div className="sb-title">{title} 많이 본 뉴스</div>
                <ul className="pop-list">
                  {initialPopular.length > 0 ? initialPopular.map((item, i) => (
                    <li key={item.id} className="pop-item">
                      <Link 
                        href={`/news/${item.article_no || item.id}`} 
                        style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "flex-start", gap: 8, width: "100%" }}
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            sessionStorage.setItem(`pc_news_scroll_${category}`, window.scrollY.toString());
                          }
                        }}
                      >
                        <span className="pop-ranking">{i + 1}</span>
                        <span className="pop-title">{item.title}</span>
                      </Link>
                    </li>
                  )) : (
                    <li className="pop-item" style={{ color: "#999", fontSize: 13 }}>기사가 없습니다.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />
      )}

      {user && showCategoryModal && selectedArticleId && (
        <BookmarkCategoryModal
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false);
            setSelectedArticleId(null);
          }}
          userId={user.id}
          itemId={selectedArticleId}
          type="ARTICLE"
          onSuccess={() => {
            alert("폴더 이동이 완료되었습니다.");
            // 새로고침 대신 모달 닫히면서 effect 재실행으로 업데이트됨
          }}
        />
      )}
    </>
  );
}

// CATEGORY_ICON_MAP removed since PC no longer displays icons.

// 카테고리별 맞춤 문구 맵 (모바일 규격과 완전 동일)
const PERSONALIZED_MENTAL_MAP: Record<string, Record<string, string>> = {
  "공실뉴스": {
    "전체": "실시간 중개용 공실 소식",
    "아파트/오피스텔": "공동중개 추천 아파트·오피스텔",
    "빌라/주택": "계약 확률 높은 빌라·주택 매물",
    "원룸/투룸(풀옵션)": "원룸·투룸 실무 트렌드",
    "상가/사무실/공장/토지": "고수익 상가·사무실 실무 정보",
    "신축/분양/경매": "단기 차익 신축·분양·경매 뉴스"
  },
  "news_gongsil": {
    "전체": "실시간 중개용 공실 소식",
    "아파트/오피스텔": "공동중개 추천 아파트·오피스텔",
    "빌라/주택": "계약 확률 높은 빌라·주택 매물",
    "원룸/투룸(풀옵션)": "원룸·투룸 실무 트렌드",
    "상가/사무실/공장/토지": "고수익 상가·사무실 실무 정보",
    "신축/분양/경매": "단기 차익 신축·분양·경매 뉴스"
  },
  "부동산·경제": {
    "전체": "고객 브리핑용 오늘의 시장 동향",
    "부동산 정책/동향": "상담 필수 정책 분석 & 규제 동향",
    "경제/재테크/주식": "거시경제·재테크 바이블",
    "법률/세무 지식": "고객이 묻기 전에 대비하는 세무·법률 솔루션"
  },
  "news_politics": {
    "전체": "고객 브리핑용 오늘의 시장 동향",
    "부동산 정책/동향": "상담 필수 정책 분석 & 규제 동향",
    "경제/재테크/주식": "거시경제·재테크 바이블",
    "법률/세무 지식": "고객이 묻기 전에 대비하는 세무·법률 솔루션"
  },
  "AI마케팅": {
    "전체": "매물 문의 폭발하는 마케팅 비법",
    "AI/NEWS": "업무 시간을 절반으로 줄여줄 AI 활용법",
    "부동산유튜브/블로그": "지역 1등 중개업소 블로그·유튜브 공략법",
    "공실/임대관리": "효율적인 공실·임대관리 노하우"
  },
  "news_marketing": {
    "전체": "매물 문의 폭발하는 마케팅 비법",
    "AI/NEWS": "업무 시간을 절반으로 줄여줄 AI 활용법",
    "부동산유튜브/블로그": "지역 1등 중개업소 블로그·유튜브 공략법",
    "공실/임대관리": "효율적인 공실·임대관리 노하우"
  },
  "라이프·오피니언": {
    "전체": "일의 보람과 성공을 더해줄 스토리",
    "인물/인터뷰": "억대 연봉 중개사들의 실전 성공 인터뷰",
    "부동산/인테리어 꿀팁": "실전 공간/인테리어 노하우",
    "맛집/여행/건강": "현장 활동이 많은 대표님 전용 건강 바이블",
    "자유 에세이": "일상의 쉼표, 감성 에세이"
  },
  "news_etc": {
    "전체": "일의 보람과 성공을 더해줄 스토리",
    "인물/인터뷰": "억대 연봉 중개사들의 실전 성공 인터뷰",
    "부동산/인테리어 꿀팁": "실전 공간/인테리어 노하우",
    "맛집/여행/건강": "현장 활동이 많은 대표님 전용 건강 바이블",
    "자유 에세이": "일상의 쉼표, 감성 에세이"
  }
};

// 프리미엄 PC용 추천 스플릿 컴포넌트
function PremiumSplitRecommend({ articles, memberName, mentalText }: { articles: Article[], memberName?: string, mentalText?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [articles]);

  useEffect(() => {
    if (articles.length <= 1) return;
    if (isHovered) return;
    
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev === articles.length - 1 ? 0 : prev + 1));
    }, 4000);
    
    return () => clearInterval(timer);
  }, [articles.length, isHovered]);

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

  const stripHtml = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    text = text.replace(/^(?:X|×|✕)(?=[가-힣\[\(])/i, "").trim();
    return text;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? articles.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev === articles.length - 1 ? 0 : prev + 1));
  };

  const activeArticle = articles[activeIndex];
  const activeThumb = getThumbnailSrc(activeArticle);
  const activeYtInfo = extractYoutubeIdInfo(activeArticle.youtube_url) || extractYoutubeIdInfo(activeArticle.content);

  // 현재 활성화된 기사를 제외한 나머지 3개 큐레이션 기사
  const curatedArticles = articles.filter((_, idx) => idx !== activeIndex).slice(0, 3);

  return (
    <div className="premium-split-container">
      {/* 좌측 메인 히어로 슬라이더 (매거진 스타일) */}
      <Link
        href={`/news/${activeArticle.article_no || activeArticle.id}`}
        className="premium-hero-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="premium-hero-img-wrapper">
          {activeThumb && <img src={activeThumb} alt={activeArticle.title} />}
          <div className="premium-hero-gradient-top" />
          <div className="premium-hero-gradient" />
          
          {mentalText && (
            <div style={{ position: "absolute", top: 24, left: 30, zIndex: 10, display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff", display: "inline-block", width: "fit-content" }}>
                <span style={{ color: "#fef08a" }}>{memberName || "부동산"} 대표님</span>을 위한
              </span>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
                {mentalText} <span style={{ fontWeight: 400 }}>News</span>
              </h2>
            </div>
          )}
          {activeYtInfo && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, background: "rgba(0,0,0,0.5)", borderRadius: "50%", border: "2.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white" style={{ marginLeft: "1.5px" }}><path d="M8 5v14l11-7z"/></svg>
            </div>
          )}
        </div>

        <div className="premium-hero-text-content">
          <h3 className="premium-hero-title">{activeArticle.title}</h3>
          <div className="premium-hero-meta-row">
            <div className="premium-hero-meta">
              {formatDate(activeArticle.published_at || activeArticle.created_at)} · {activeArticle.author_name || "공실뉴스"}
            </div>
            {articles.length > 1 && (
              <div className="premium-slider-controls" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <span className="premium-slider-counter">
                  {activeIndex + 1} / {articles.length}
                </span>
                <button className="premium-slider-btn" onClick={handlePrev} title="이전 추천뉴스">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button className="premium-slider-btn" onClick={handleNext} title="다음 추천뉴스">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>

      <style>{`
        .premium-recommend-section {
          margin-bottom: 32px;
        }
        .premium-header-banner {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1.5px solid #1a2e50;
        }
        .premium-user-tag {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          letter-spacing: -0.3px;
        }
        .premium-user-name {
          font-weight: 800;
          color: #111;
          background: linear-gradient(180deg, transparent 50%, rgba(254, 240, 138, 0.9) 50%);
          padding: 2px 4px;
          border-radius: 2px;
        }
        .premium-banner-title {
          font-size: 22px;
          font-weight: 900;
          color: #ea580c;
          margin: 6px 0 0 0;
          letter-spacing: -0.5px;
          line-height: 1.3;
        }
        .premium-banner-title-light {
          color: #111;
          font-weight: normal;
        }
        .premium-split-container {
          display: block;
          width: 100%;
          margin-bottom: 30px;
        }
        .premium-hero-card {
          display: flex;
          flex-direction: column;
          position: relative;
          text-decoration: none;
          color: inherit;
          height: 480px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .premium-hero-img-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          background: #111;
        }
        .premium-hero-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .premium-hero-card:hover .premium-hero-img-wrapper img {
          transform: scale(1.03);
        }
        .premium-hero-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 70%;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.6) 50%, transparent);
          z-index: 2;
        }
        .premium-hero-gradient-top {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 40%;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.1) 80%, transparent);
          z-index: 2;
        }
        .premium-hero-text-content {
          position: relative;
          z-index: 3;
          margin-top: auto;
          padding: 30px 40px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .premium-hero-title {
          font-size: 36px;
          font-weight: 800;
          line-height: 1.35;
          color: #ffffff;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
          word-break: keep-all;
        }
        .premium-hero-desc {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .premium-hero-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }
        .premium-hero-meta {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }
        .premium-slider-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .premium-slider-counter {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 700;
          margin-right: 12px;
          letter-spacing: 1px;
        }
        .premium-slider-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #fff;
          transition: all 0.2s;
        }
        .premium-slider-btn:hover {
          background: #fff;
          color: #1a4282;
          transform: scale(1.05);
        }
        .premium-curated-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .premium-curated-item {
          display: flex;
          gap: 14px;
          text-decoration: none;
          color: inherit;
          padding-bottom: 16px;
          border-bottom: 1px dashed #f0f0f0;
          transition: all 0.2s;
        }
        .premium-curated-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .premium-curated-img {
          width: 100px;
          height: 72px;
          border-radius: 6px;
          overflow: hidden;
          background: #f3f4f6;
          flex-shrink: 0;
        }
        .premium-curated-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .premium-curated-item:hover .premium-curated-img img {
          transform: scale(1.05);
        }
        .premium-curated-body {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
        }
        .premium-curated-title {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.4;
          color: #111;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.2s;
        }
        .premium-curated-item:hover .premium-curated-title {
          color: #ea580c;
        }
        .premium-curated-meta {
          font-size: 12px;
          color: #9ca3af;
        }
        .sidebar-banner-wrapper:not(:empty) {
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}
