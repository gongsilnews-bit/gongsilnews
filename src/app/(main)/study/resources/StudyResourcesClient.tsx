"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { canAccessBoard, getLevelName } from "@/utils/permissionCheck";
import StudyHeader, { STUDY_HERO_BAR } from "@/components/study/StudyHeader";
import StudyHero from "@/components/study/StudyHero";

const POINT = "#059669";
const ITEMS_PER_PAGE = 12;

interface BoardMeta {
  board_id: string;
  name: string;
  subtitle?: string;
  categories?: string;
  perm_list?: number;
  perm_read?: number;
  perm_write?: number;
  skin_type?: string;
}

const TABS = [
  { key: "drone", label: "드론영상" },
  { key: "app", label: "APP(앱)" },
  { key: "prompt", label: "AI 프롬프트" },
  { key: "sound", label: "음원" },
  { key: "doc", label: "계약서/양식" },
];

// YouTube URL에서 썸네일 이미지 추출
function getYoutubeThumbnail(url: string): string | null {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

// Google Drive URL에서 썸네일 이미지 추출
function getDriveThumbnail(url: string): string | null {
  if (!url) return null;
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : null;
}

// 대표 썸네일 추출 (1순위: 직접첨부이미지, 2순위: 유튜브, 3순위: 구글드라이브, 4순위: 기본이미지)
function getPrimaryThumbnail(p: any): string {
  if (p.thumbnail_url) return p.thumbnail_url;

  let ytUrl = p.youtube_url;
  let drUrl = p.drive_url;

  try {
    if (p.external_url && p.external_url.startsWith("[")) {
      const links = JSON.parse(p.external_url);
      const firstYt = links.find((l: any) => l.type === "YOUTUBE" || (l.url && (l.url.includes("youtube.com") || l.url.includes("youtu.be"))));
      const firstDr = links.find((l: any) => l.type === "DRIVE" || (l.url && l.url.includes("drive.google.com")));
      if (firstYt?.url) ytUrl = firstYt.url;
      if (firstDr?.url) drUrl = firstDr.url;
    }
  } catch (e) {}

  const ytThumb = getYoutubeThumbnail(ytUrl);
  if (ytThumb) return ytThumb;

  const drThumb = getDriveThumbnail(drUrl);
  if (drThumb) return drThumb;

  return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=320&q=80";
}

// 비디오 링크 판별
function hasVideoLink(p: any, skinType: string): boolean {
  let hasVideo = p.youtube_url;
  let isDriveVideo = skinType === "VIDEO_ALBUM" && p.drive_url && p.drive_url.includes("drive.google.com/file/d/");
  hasVideo = hasVideo || isDriveVideo;

  try {
    if (p.external_url && p.external_url.startsWith("[")) {
      const links = JSON.parse(p.external_url);
      hasVideo =
        hasVideo ||
        links.some((l: any) => {
          if (l.type === "YOUTUBE" || (l.url && (l.url.includes("youtube.com") || l.url.includes("youtu.be")))) return true;
          if (skinType === "VIDEO_ALBUM" && (l.type === "DRIVE" || (l.url && l.url.includes("drive.google.com")))) return true;
          return false;
        });
    }
  } catch (e) {}

  return !!hasVideo;
}

export default function StudyResourcesClient({
  boardsMap,
  postsMap,
  serverUser,
  serverUserLevel,
  initialBoardKey = "drone",
}: {
  boardsMap: Record<string, BoardMeta>;
  postsMap: Record<string, any[]>;
  serverUser?: any;
  serverUserLevel?: number;
  initialBoardKey?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const currentBoardKey = searchParams.get("board") || initialBoardKey;
  const [activeBoard, setActiveBoard] = useState<string>(currentBoardKey);

  const activeBoardData = boardsMap[activeBoard] || { board_id: activeBoard, name: "자료실" };
  const rawPosts = postsMap[activeBoard] || [];

  const isDefaultCard = currentBoardKey === "drone" || activeBoardData?.skin_type === "VIDEO_ALBUM";
  const [viewMode, setViewMode] = useState<"card" | "list">(isDefaultCard ? "card" : "list");

  const [activeCategory, setActiveCategory] = useState(searchParams.get("tab") || "전체");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10) || 1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [searchInputValue, setSearchInputValue] = useState(searchParams.get("search") || "");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const userLevel = serverUserLevel ?? 0;
  const currentUser = serverUser ?? null;

  // URL 변경 시 상태 동기화
  useEffect(() => {
    const b = searchParams.get("board") || initialBoardKey;
    setActiveBoard(b);
    const isCard = b === "drone" || boardsMap[b]?.skin_type === "VIDEO_ALBUM";
    setViewMode(isCard ? "card" : "list");
    setActiveCategory(searchParams.get("tab") || "전체");
    setCurrentPage(parseInt(searchParams.get("page") || "1", 10) || 1);
    const q = searchParams.get("search") || "";
    setSearchQuery(q);
    setSearchInputValue(q);
  }, [searchParams, initialBoardKey, boardsMap]);

  const syncUrl = (next: { board?: string; tab?: string; page?: number; search?: string }) => {
    const params = new URLSearchParams();
    const boardKey = next.board ?? activeBoard;
    if (boardKey !== "doc") params.set("board", boardKey);
    const tab = next.tab ?? activeCategory;
    if (tab && tab !== "전체") params.set("tab", tab);
    const page = next.page ?? currentPage;
    if (page > 1) params.set("page", String(page));
    const search = next.search ?? searchQuery;
    if (search.trim()) params.set("search", search.trim());

    const qs = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  };

  const switchBoard = (key: string) => {
    setActiveBoard(key);
    const isCard = key === "drone" || boardsMap[key]?.skin_type === "VIDEO_ALBUM";
    setViewMode(isCard ? "card" : "list");
    setActiveCategory("전체");
    setCurrentPage(1);
    setSearchQuery("");
    setSearchInputValue("");
    syncUrl({ board: key, tab: "전체", page: 1, search: "" });
  };

  const handleCategoryChange = (tab: string) => {
    setActiveCategory(tab);
    setCurrentPage(1);
    syncUrl({ tab, page: 1 });
  };

  const handleSearch = (term: string) => {
    setSearchQuery(term);
    setCurrentPage(1);
    syncUrl({ search: term, page: 1 });
  };

  const handlePageChange = (p: number | ((prev: number) => number)) => {
    const newPage = typeof p === "function" ? p(currentPage) : p;
    setCurrentPage(newPage);
    syncUrl({ page: newPage });
    if (typeof window !== "undefined") window.scrollTo({ top: 320, behavior: "smooth" });
  };

  const getReadUrl = (postId: string) =>
    `/board_read?id=${postId}&board_id=${activeBoard}&page=${currentPage}&tab=${encodeURIComponent(activeCategory)}`;

  const writeUrl = `/board_write?board_id=${activeBoard}`;

  // 카테고리 탭 목록 생성
  const categoriesList = ["전체"];
  if (activeBoardData?.categories) {
    categoriesList.push(
      ...activeBoardData.categories
        .split(",")
        .map((c: string) => c.trim())
        .filter(Boolean)
    );
  }

  // 필터링
  const filteredPosts = rawPosts.filter((p) => {
    if (activeCategory !== "전체" && !p.title.includes(`[${activeCategory}]`)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return p.title.toLowerCase().includes(q) || (p.content || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalItems = filteredPosts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visiblePosts = filteredPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const canRead = canAccessBoard(userLevel, activeBoardData?.perm_read ?? 0);
  const canWrite = canAccessBoard(userLevel, activeBoardData?.perm_write ?? 5);

  const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: "9px 14px",
    fontSize: 15,
    borderRadius: 6,
    border: "1px solid #d7e0ee",
    background: disabled ? "#f6f8fc" : "#fff",
    color: disabled ? "#b3bdcd" : "#55617a",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", color: "#132e27" }}>
      <StudyHeader background={STUDY_HERO_BAR} />

      {/* ━━━ [1] 헤더 섹션 (통일된 프리미엄 스터디 히어로) ━━━ */}
      <StudyHero
        title="자료실"
        englishTitle="Study Resources"
        description="부동산마케팅에 필요한 자료 공유실입니다."
        tabs={TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          isActive: activeBoard === tab.key,
          onClick: () => switchBoard(tab.key),
        }))}
      />

      {/* ━━━ [2] 게시판 본문 (좌측 리스트/카드 + 우측 배너&인기게시물 사이드바) ━━━ */}
      {!canAccessBoard(userLevel, activeBoardData?.perm_list ?? 0) ? (
        <div style={{ padding: 100, textAlign: "center" }}>
          <h2 style={{ fontSize: 20, color: "#ef4444", marginBottom: 12 }}>
            {getLevelName(activeBoardData?.perm_list ?? 0)}부터 열람하실 수 있습니다.
          </h2>
          <p style={{ color: "#666" }}>
            목록 보기 레벨: <strong>{activeBoardData?.perm_list ?? 0}레벨 이상</strong> (현재 내 레벨: {userLevel}레벨)
          </p>
          <button
            onClick={() => router.push("/study")}
            style={{
              marginTop: 24,
              padding: "10px 24px",
              background: POINT,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            공실스터디 홈으로
          </button>
        </div>
      ) : (
        <main
          className="study-qna"
          style={{
            maxWidth: 1080,
            width: "100%",
            margin: "0 auto",
            padding: "0 24px",
            boxSizing: "border-box",
            minHeight: "60vh",
            marginTop: 28,
            marginBottom: 70,
          }}
        >
          <div className="b-layout" style={{ marginTop: 0 }}>
            {/* ━━━ 좌측 본문 영역 (75%) ━━━ */}
            <div className="b-list-area">
              {/* 상단 타이틀 + 뷰 전환 + 검색창 */}
              <div className="board-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
                <div className="board-title">
                  {activeBoardData?.name || "자료 목록"}
                  {activeBoardData?.subtitle && (
                    <span style={{ fontSize: 16, fontWeight: 500, color: "#666", marginLeft: 10 }}>
                      ({activeBoardData.subtitle})
                    </span>
                  )}
                </div>
                <div className="board-search-write">
                  {/* 카드형 / 목록형 뷰 모드 토글 */}
                  <div
                    style={{
                      display: "inline-flex",
                      borderRadius: 6,
                      border: "1px solid #d1d5db",
                      overflow: "hidden",
                      background: "#f9fafb",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode("card")}
                      title="카드형(갤러리)"
                      style={{
                        padding: "7px 11px",
                        border: "none",
                        background: viewMode === "card" ? "#059669" : "transparent",
                        color: viewMode === "card" ? "#fff" : "#6b7280",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                        fontWeight: viewMode === "card" ? 700 : 500,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />
                      </svg>
                      <span>카드형</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      title="목록형(리스트)"
                      style={{
                        padding: "7px 11px",
                        border: "none",
                        background: viewMode === "list" ? "#059669" : "transparent",
                        color: viewMode === "list" ? "#fff" : "#6b7280",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                        fontWeight: viewMode === "list" ? 700 : 500,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                      </svg>
                      <span>목록형</span>
                    </button>
                  </div>

                  <div className="b-search">
                    <input
                      type="text"
                      placeholder="자료 검색"
                      value={searchInputValue}
                      onChange={(e) => setSearchInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch(searchInputValue);
                      }}
                    />
                    <button onClick={() => handleSearch(searchInputValue)}>검색</button>
                  </div>
                </div>
              </div>

              {/* 서브 카테고리 알약 탭 */}
              {categoriesList.length > 1 && (
                <div className="board-tabs">
                  {categoriesList.map((cat) => (
                    <div
                      key={cat}
                      className={`b-tab ${activeCategory === cat ? "active" : ""}`}
                      onClick={() => handleCategoryChange(cat)}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}

              {/* ━━━ 본문 콘텐츠: 카드 갤러리 or 리스트 테이블 ━━━ */}
              <div style={{ marginTop: 20 }}>
                {viewMode === "card" ? (
                  /* 썸네일 카드 그리드 (드론영상 기본 뷰) */
                  <div className="b-grid">
                    {visiblePosts.length > 0 ? (
                      visiblePosts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (!canRead) {
                              showToast(
                                `${getLevelName(activeBoardData?.perm_read ?? 0)}부터 열람하실 수 있습니다.. 🤍`
                              );
                            } else {
                              router.push(getReadUrl(p.id));
                            }
                          }}
                          style={{
                            display: "block",
                            textDecoration: "none",
                            color: "inherit",
                            border: "1px solid #e3e9f2",
                            borderRadius: 10,
                            overflow: "hidden",
                            cursor: "pointer",
                            background: "#fff",
                            transition: "all 0.2s ease",
                          }}
                          className="b-card-item"
                        >
                          <div
                            style={{
                              height: 160,
                              background: "#222",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <img
                              src={getPrimaryThumbnail(p)}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: 0.85,
                                transition: "transform 0.3s ease",
                              }}
                              alt="thumb"
                              className="card-thumb-img"
                            />
                            {hasVideoLink(
                              p,
                              activeBoardData.skin_type || (activeBoard === "drone" ? "VIDEO_ALBUM" : "LIST")
                            ) && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%)",
                                  width: 44,
                                  height: 44,
                                  background: "rgba(0,0,0,0.6)",
                                  borderRadius: "50%",
                                  border: "2px solid #fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div style={{ padding: "16px 18px 18px" }}>
                            {p.title.match(/^\[([^\]]+)\]/) && (
                              <div
                                style={{
                                  display: "inline-block",
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: "#ef4444",
                                  marginBottom: 7,
                                  marginRight: 6,
                                }}
                              >
                                {p.title.match(/^\[([^\]]+)\]/)?.[0]}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: 15.5,
                                fontWeight: 600,
                                color: "#111827",
                                lineHeight: 1.5,
                                marginBottom: 9,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                height: 46,
                              }}
                            >
                              {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#94a3b8",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span>{p.author_name || "최고관리자"}</span>
                              <span>
                                조회 {p.view_count || 0} ·{" "}
                                {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          padding: 70,
                          textAlign: "center",
                          color: "#94a3b8",
                          fontSize: 14.5,
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                        }}
                      >
                        등록된 자료가 없습니다.
                      </div>
                    )}
                  </div>
                ) : (
                  /* 리스트형 테이블 */
                  <table className="b-list-table">
                    <thead>
                      <tr>
                        <th style={{ width: 72 }}>번호</th>
                        <th style={{ textAlign: "left" }}>제목</th>
                        <th style={{ width: 120 }}>구분</th>
                        <th style={{ width: 118 }}>등록일</th>
                        <th style={{ width: 80 }}>조회</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePosts.length > 0 ? (
                        visiblePosts.map((p, i) => {
                          const hasLink = p.drive_url || p.youtube_url || p.external_url;
                          return (
                            <tr key={p.id}>
                              <td>{totalItems - startIndex - i}</td>
                              <td className="subject">
                                <Link
                                  href={canRead ? getReadUrl(p.id) : "#"}
                                  onClick={(e) => {
                                    if (!canRead) {
                                      e.preventDefault();
                                      showToast(
                                        `${getLevelName(activeBoardData?.perm_read ?? 0)}부터 열람하실 수 있습니다.. 🤍`
                                      );
                                    }
                                  }}
                                  style={{ display: "block" }}
                                >
                                  {p.title.match(/^\[([^\]]+)\]/) && (
                                    <span className="cat-badge">{p.title.match(/^\[([^\]]+)\]/)?.[0]}</span>
                                  )}
                                  {hasLink && (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "2px 6px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        borderRadius: "4px",
                                        marginRight: "8px",
                                        backgroundColor: "#eff6ff",
                                        color: "#2563eb",
                                        border: "1px solid #bfdbfe",
                                      }}
                                    >
                                      {p.youtube_url ? "영상" : p.drive_url ? "다운로드" : "자료"}
                                    </span>
                                  )}
                                  {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                                </Link>
                              </td>
                              <td>{activeBoardData.name}</td>
                              <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</td>
                              <td>{p.view_count || 0}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: "60px 0", textAlign: "center", color: "#888" }}>
                            등록된 자료가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 하단 페이지네이션 및 우측 버튼 */}
              <div
                style={{
                  marginTop: 35,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }} />

                {/* 페이지네이션 버튼들 */}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    style={pageBtnStyle(currentPage === 1)}
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    &laquo;
                  </button>
                  <button
                    type="button"
                    style={pageBtnStyle(currentPage === 1)}
                    onClick={() => handlePageChange((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    &lsaquo;
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        padding: "9px 15px",
                        fontSize: 15,
                        borderRadius: 6,
                        border: pageNum === currentPage ? `1px solid ${POINT}` : "1px solid #d7e0ee",
                        background: pageNum === currentPage ? POINT : "#fff",
                        color: pageNum === currentPage ? "#fff" : "#55617a",
                        fontWeight: pageNum === currentPage ? 800 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    style={pageBtnStyle(currentPage === totalPages)}
                    onClick={() => handlePageChange((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    &rsaquo;
                  </button>
                  <button
                    type="button"
                    style={pageBtnStyle(currentPage === totalPages)}
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    &raquo;
                  </button>
                </div>

                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                  {canWrite && (
                    <a
                      href={writeUrl}
                      style={{
                        padding: "10px 22px",
                        borderRadius: 6,
                        fontSize: 14.5,
                        fontWeight: 800,
                        color: "#ffffff",
                        background: POINT,
                        textDecoration: "none",
                        boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                    >
                      {activeBoard === "drone" ? "영상 등록하기" : "자료 등록하기"}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* ━━━ 우측 사이드바 영역 (25%, 260px) ━━━ */}
            <div className="b-sidebar">
              <div className="sb-banner">배너 1</div>

              <div className="sb-widget">
                <div className="sb-title">
                  {activeBoard === "drone" ? "인기 드론영상" : "인기 게시물"}
                </div>
                <ul className="pop-list">
                  {[...rawPosts]
                    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                    .slice(0, 5)
                    .map((p, i) => (
                      <li className="pop-item" key={p.id || i}>
                        <span className="pop-ranking" style={{ color: "#ef4444" }}>{i + 1}</span>
                        <Link
                          href={canRead ? getReadUrl(p.id) : "#"}
                          onClick={(e) => {
                            if (!canRead) {
                              e.preventDefault();
                              showToast(
                                `${getLevelName(activeBoardData?.perm_read ?? 0)}부터 열람하실 수 있습니다.. 🤍`
                              );
                            }
                          }}
                          className="pop-title"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                        </Link>
                      </li>
                    ))}
                  {rawPosts.length === 0 && (
                    <li style={{ fontSize: 14, color: "#94a3b8" }}>게시물이 없습니다.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(17, 24, 39, 0.92)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
            zIndex: 999999,
          }}
        >
          {toastMessage}
        </div>
      )}

      <style>{`
        /* 스터디 자료실 전용 에메랄드/그린 포인트 및 반응형 보정 */
        .study-qna {
          --board-navy: #059669 !important;
          --board-navy-dark: #047857 !important;
          --board-navy-soft: #ecfdf5 !important;
        }
        .study-qna .cat-badge { color: #ef4444 !important; font-size: 14px; font-weight: 800; margin-right: 8px; }
        .study-qna .b-sidebar .pop-ranking { color: #ef4444 !important; font-weight: 900; }
        .study-qna .b-tab.active { background: #059669 !important; border-color: #059669 !important; color: #ffffff !important; }
        .study-qna .b-tab:hover { border-color: #059669 !important; color: #059669 !important; }
        .study-qna .b-list-table { border-top: 2px solid #059669 !important; }
        .study-qna .b-list-table tbody tr:hover td.subject { color: #059669 !important; }
        .study-qna .b-list-table td.subject a { color: inherit; text-decoration: none; }
        .study-qna .b-search button { background: #059669 !important; border-color: #059669 !important; color: #ffffff !important; }
        .study-qna .b-search button:hover { background: #047857 !important; }
        .study-qna .b-search input:focus { border-color: #059669 !important; outline: none; }
        .study-qna .b-card-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.09);
          border-color: #cbd5e1 !important;
        }
        .study-qna .b-card-item:hover .card-thumb-img {
          transform: scale(1.05);
        }
        .study-qna .b-sidebar .sb-title {
          border-bottom: 2px solid #059669 !important;
        }
      `}</style>
    </div>
  );
}
