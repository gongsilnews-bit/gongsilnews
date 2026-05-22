"use client";

import React, { useState, useEffect } from "react";
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

  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | 'ALL'>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(searchParams.get("section2") || null);

  useEffect(() => {
    setSelectedSubCategory(searchParams.get("section2") || null);
  }, [searchParams]);

  const handleSubCategoryClick = (sub: string | null) => {
    setSelectedSubCategory(sub);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (sub) {
      params.set("section2", sub);
    } else {
      params.delete("section2");
    }
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

  // 사이드바 "많이 본 뉴스" 숨김 여부 판단 (북마크 모드거나 제목이 "검색결과"일 때)
  const hidePopularNews = isBookmarkMode || title.includes("검색결과") || title.includes("기자의 글");

  return (
    <>
      <main className="container px-20" style={{ position: "relative", paddingTop: "20px" }}>
        
        {/* 전체 가로 폭을 차지하는 카테고리 헤더 (중앙일보 스타일) */}
        <div style={{ 
          display: "flex", alignItems: "flex-end", gap: "60px", 
          paddingBottom: "12px", marginBottom: "24px" 
        }}>
          <div 
            onClick={() => handleSubCategoryClick(null)}
            style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "32px", fontWeight: "900", color: "#111", letterSpacing: "-1px", lineHeight: "1", cursor: "pointer" }}
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
                  color: selectedSubCategory === null ? "#2563eb" : "#6b7280",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
              >
                <span style={{
                  color: selectedSubCategory === null ? "#2563eb" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.2s"
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                </span>
                전체
              </button>

              {subCategories.map(sub => {
                const icon = CATEGORY_ICON_MAP[sub];
                return (
                  <button
                    key={sub}
                    onClick={() => handleSubCategoryClick(sub)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "16px",
                      fontWeight: selectedSubCategory === sub ? "800" : "500",
                      color: selectedSubCategory === sub ? "#2563eb" : "#6b7280",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s"
                    }}
                  >
                    {icon && (
                      <span style={{
                        color: selectedSubCategory === sub ? "#2563eb" : "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        transition: "color 0.2s"
                      }}>
                        {icon}
                      </span>
                    )}
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

        <div className="news-layout">
          {/* 좌측 뉴스 리스트 */}
          <div className="news-list-area">
            {/* 중요 기사 (상단 이미지 영역 - 프리미엄 스플릿 슬라이더 + 리스트) */}
            {!isBookmarkMode && displayImportantArticles.length > 0 && (
              <div className="premium-recommend-section">
                {/* 1. 개인화 헤더 배너 (대표님 맞춤형 인사말) */}
                {(() => {
                  const isKeywordSearch = !!searchQuery;
                  if (isKeywordSearch) return null;

                  const activeSub = selectedSubCategory || "전체";
                  const mentalText = PERSONALIZED_MENTAL_MAP[category]?.[activeSub] || "추천 뉴스";
                  const displayName = memberName || "부동산";
                  const activeIcon = CATEGORY_ICON_MAP[activeSub];

                  return (
                    <div className="premium-header-banner">
                      <div className="premium-header-content">
                        <span className="premium-user-tag">
                          <span className="premium-user-name">{displayName} 대표님</span>을 위한
                        </span>
                        <h2 className="premium-banner-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {activeIcon && (
                            <span style={{ color: "#ea580c", display: "inline-flex", alignItems: "center" }}>
                              {React.cloneElement(activeIcon as React.ReactElement<any>, { width: 24, height: 24 })}
                            </span>
                          )}
                          <span>
                            {mentalText} <span className="premium-banner-title-light">News</span>
                          </span>
                        </h2>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. 스플릿 매거진 레이아웃 */}
                <PremiumSplitRecommend articles={displayImportantArticles} />
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
            <div style={{ marginBottom: 20 }}>
              <BannerSlot placement="LIST_SIDEBAR" category={category} />
            </div>

            {/* 많이 본 뉴스 5개 (검색/북마크 모드일 때는 숨김) */}
            {!hidePopularNews && (
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

// 카테고리별 매칭 픽토그램 SVG 맵 (모바일 규격과 완전 동일)
const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  "전체": <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  "아파트/오피스텔": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M6 2h12a2 2 0 012 2v18H4V4a2 2 0 012-2z" fill="currentColor"/><rect x="10" y="18" width="4" height="4" rx=".5" fill="white"/><rect x="7" y="5" width="2.5" height="2" rx=".5" fill="white"/><rect x="14.5" y="5" width="2.5" height="2" rx=".5" fill="white"/><rect x="7" y="9" width="2.5" height="2" rx=".5" fill="white"/><rect x="14.5" y="9" width="2.5" height="2" rx=".5" fill="white"/><rect x="7" y="13" width="2.5" height="2" rx=".5" fill="white"/><rect x="14.5" y="13" width="2.5" height="2" rx=".5" fill="white"/></svg>,
  "빌라/주택": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 2.5L2 10.5V22h20V10.5L12 2.5z" fill="currentColor"/><rect x="9" y="13" width="6" height="9" rx="1" fill="white"/></svg>,
  "원룸/투룸(풀옵션)": <svg width="20" height="20" viewBox="0 0 24 24"><rect x="1" y="3" width="3" height="18" rx="1.5" fill="currentColor"/><path d="M4 8h16a2 2 0 012 2v11H4V8z" fill="currentColor"/><rect x="4" y="16.5" width="18" height="1.5" fill="white"/></svg>,
  "상가/사무실/공장/토지": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M2 7h20v14a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" fill="currentColor"/><path d="M6 3.5c.5-.6 1.3-.8 2-.6L12 4l4-1.1c.7-.2 1.5 0 2 .6L22 7H2l4-3.5z" fill="currentColor"/><line x1="12" y1="7" x2="12" y2="23" stroke="white" strokeWidth="1.5"/><line x1="2" y1="11" x2="22" y2="11" stroke="white" strokeWidth="1.5"/></svg>,
  "신축/분양/경매": <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="16" cy="5" r="3" fill="currentColor"/><path d="M14 9L5 18a2 2 0 002.8 2.8l9-9L14 9z" fill="currentColor"/><path d="M15 4l-3 3M17 6l-3 3" stroke="white" strokeWidth="1.2"/></svg>,
  "부동산 정책/동향": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" fill="currentColor"/><path d="M14 2v6h6" fill="white" opacity=".3"/><rect x="8" y="12" width="8" height="1.5" rx=".5" fill="white"/><rect x="8" y="16" width="6" height="1.5" rx=".5" fill="white"/></svg>,
  "경제/재테크/주식": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 3h2v16h16v2H3V3z" fill="currentColor"/><path d="M7 14l3-3 4 4 5-5v8H7v-4z" fill="currentColor" opacity=".3"/><path d="M7 14l3-3 4 4 5-5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "법률/세무 지식": <svg width="20" height="20" viewBox="0 0 24 24"><rect x="11" y="2" width="2" height="18" rx="1" fill="currentColor"/><rect x="7" y="20" width="10" height="2.5" rx="1" fill="currentColor"/><rect x="3" y="7" width="18" height="2" rx="1" fill="currentColor"/><path d="M4 14h6L7 9 4 14z" fill="currentColor"/><path d="M14 14h6l-3-5-3 5z" fill="currentColor"/></svg>,
  "AI/NEWS": <svg width="20" height="20" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="3" fill="currentColor"/><circle cx="9" cy="10" r="1.5" fill="white"/><circle cx="15" cy="10" r="1.5" fill="white"/><rect x="8" y="14" width="8" height="2" rx="1" fill="white"/></svg>,
  "부동산유튜브/블로그": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.33 29 29 0 00-.46-5.33z" fill="currentColor"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48" fill="white"/></svg>,
  "공실/임대관리": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 10-4-4L2 18z" fill="currentColor"/><circle cx="16.5" cy="7.5" r="1.5" fill="white"/></svg>,
  "인물/인터뷰": <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5" fill="currentColor"/><path d="M4 21a8 8 0 0116 0H4z" fill="currentColor"/></svg>,
  "부동산/인테리어 꿀팁": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 2a6 6 0 00-6 6c0 1.23.23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5h6.18c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8a6 6 0 00-6-6z" fill="currentColor"/><rect x="9" y="16" width="6" height="2" rx="1" fill="currentColor"/><rect x="10" y="20" width="4" height="2" rx="1" fill="currentColor"/></svg>,
  "맛집/여행/건강": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 2c0-.6.4-1 1-1s1 .4 1 1v7a2 2 0 01-2 2v10c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V11a2 2 0 01-2-2V2c0-.6.4-1 1-1s1 .4 1 1v7c.6 0 1-.4 1-1V2c0-.6.4-1 1-1s1 .4 1 1v6c0 1.7-1.3 3-3 3v10c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1V11c-1.7 0-3-1.3-3-3V2c0-.6.4-1 1-1z" fill="currentColor" transform="translate(1,0)"/><path d="M20 2c0-.6.4-1 1-1s1 .4 1 1v13h1c1.1 0 2-.9 2-2V7a5 5 0 00-5-5v13h0v6c0 .6-.4 1-1 1s-1-.4-1-1V2z" fill="currentColor" transform="translate(-2,0)"/></svg>,
  "자유 에세이": <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z" fill="currentColor"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" fill="currentColor"/><circle cx="11" cy="11" r="2" fill="white"/></svg>,
};

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
function PremiumSplitRecommend({ articles }: { articles: Article[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [articles]);

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
      {/* 좌측 메인 히어로 슬라이더 */}
      <Link
        href={`/news/${activeArticle.article_no || activeArticle.id}`}
        className="premium-hero-card"
      >
        <div className="premium-hero-img-wrapper">
          {activeThumb && <img src={activeThumb} alt={activeArticle.title} />}
          {activeYtInfo && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, background: "rgba(0,0,0,0.5)", borderRadius: "50%", border: "2.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z"/></svg>
            </div>
          )}

          {articles.length > 1 && (
            <>
              {/* 슬라이더 좌우 조작 버튼 */}
              <div className="premium-slider-controls">
                <button className="premium-slider-btn" onClick={handlePrev} title="이전 추천뉴스">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button className="premium-slider-btn" onClick={handleNext} title="다음 추천뉴스">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>

              {/* 페이지 카운터 */}
              <div className="premium-slider-counter">
                {activeIndex + 1} / {articles.length}
              </div>
            </>
          )}
        </div>

        <h3 className="premium-hero-title">{activeArticle.title}</h3>
        <p className="premium-hero-desc">
          {activeArticle.subtitle || stripHtml(activeArticle.content || "").slice(0, 140)}
        </p>
        <div className="premium-hero-meta">
          {formatDate(activeArticle.published_at || activeArticle.created_at)} · {activeArticle.author_name || "공실뉴스"}
        </div>
      </Link>

      {/* 우측 큐레이션 리스트 */}
      <div className="premium-curated-list">
        {curatedArticles.map((article) => {
          const thumb = getThumbnailSrc(article);
          const ytInfo = extractYoutubeIdInfo(article.youtube_url) || extractYoutubeIdInfo(article.content);
          
          return (
            <Link
              key={article.id}
              href={`/news/${article.article_no || article.id}`}
              className="premium-curated-item"
            >
              {thumb && (
                <div className="premium-curated-img" style={{ position: "relative" }}>
                  <img src={thumb} alt={article.title} />
                  {ytInfo && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 28, height: 28, background: "rgba(0,0,0,0.5)", borderRadius: "50%", border: "1.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="white" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  )}
                </div>
              )}
              <div className="premium-curated-body">
                <h4 className="premium-curated-title">{article.title}</h4>
                <div className="premium-curated-meta">
                  {formatDate(article.published_at || article.created_at)} · {article.author_name || "공실뉴스"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <style>{`
        .premium-recommend-section {
          margin-bottom: 32px;
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
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
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 24px;
        }
        .premium-hero-card {
          display: flex;
          flex-direction: column;
          position: relative;
          text-decoration: none;
          color: inherit;
        }
        .premium-hero-img-wrapper {
          position: relative;
          width: 100%;
          height: 240px;
          border-radius: 8px;
          overflow: hidden;
          background: #f3f4f6;
          margin-bottom: 16px;
        }
        .premium-hero-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .premium-hero-card:hover .premium-hero-img-wrapper img {
          transform: scale(1.03);
        }
        .premium-hero-title {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.4;
          color: #111;
          margin: 0 0 10px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.2s;
        }
        .premium-hero-card:hover .premium-hero-title {
          color: #ea580c;
        }
        .premium-hero-desc {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.5;
          margin: 0 0 12px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .premium-hero-meta {
          font-size: 12px;
          color: #9ca3af;
          margin-top: auto;
        }
        .premium-slider-controls {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          gap: 6px;
          z-index: 5;
        }
        .premium-slider-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          color: #111;
          transition: all 0.2s;
          padding: 0;
        }
        .premium-slider-btn:hover {
          background: #1a2e50;
          color: #fff;
          transform: scale(1.05);
        }
        .premium-slider-counter {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          z-index: 5;
          backdrop-filter: blur(4px);
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
      `}</style>
    </div>
  );
}
