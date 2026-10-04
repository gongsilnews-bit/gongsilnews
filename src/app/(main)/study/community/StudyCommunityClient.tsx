"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { canAccessBoard, getLevelName } from "@/utils/permissionCheck";
import StudyHeader, { STUDY_HERO_BAR } from "@/components/study/StudyHeader";
import StudyHero from "@/components/study/StudyHero";

const POINT = "#1a2e50";
const ITEMS_PER_PAGE = 12;

export default function StudyCommunityClient({
  qnaBoard,
  qnaPosts,
  freeBoard,
  freePosts,
  serverUser,
  serverUserLevel,
  initialBoardKey = "studyqa",
}: {
  qnaBoard: any;
  qnaPosts: any[];
  freeBoard: any;
  freePosts: any[];
  serverUser?: any;
  serverUserLevel?: number;
  initialBoardKey?: "studyqa" | "free";
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // 활성 보드 탭: "studyqa" (스터디 Q&A) vs "free" (자유게시판)
  const currentBoardParam = searchParams.get("board") === "free" ? "free" : initialBoardKey;
  const [activeBoard, setActiveBoard] = useState<"studyqa" | "free">(currentBoardParam);

  const activeBoardData = activeBoard === "studyqa" ? qnaBoard : freeBoard;
  const rawPosts = activeBoard === "studyqa" ? qnaPosts : freePosts;

  const [activeCategory, setActiveCategory] = useState(searchParams.get("tab") || "전체");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10) || 1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [searchInputValue, setSearchInputValue] = useState(searchParams.get("search") || "");
  const [myPostsOnly, setMyPostsOnly] = useState(searchParams.get("mine") === "true");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const userLevel = serverUserLevel ?? 0;
  const currentUser = serverUser ?? null;

  const syncUrl = (next: { board?: string; tab?: string; page?: number; search?: string; mine?: boolean }) => {
    const params = new URLSearchParams();
    const boardKey = next.board ?? activeBoard;
    if (boardKey !== "studyqa") params.set("board", boardKey);
    const tab = next.tab ?? activeCategory;
    if (tab && tab !== "전체") params.set("tab", tab);
    const page = next.page ?? currentPage;
    if (page > 1) params.set("page", String(page));
    const search = next.search ?? searchQuery;
    if (search.trim()) params.set("search", search.trim());
    const mine = next.mine ?? myPostsOnly;
    if (mine) params.set("mine", "true");

    const qs = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  };

  const switchBoard = (key: "studyqa" | "free") => {
    setActiveBoard(key);
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

  const toggleMyPosts = () => {
    const newVal = !myPostsOnly;
    setMyPostsOnly(newVal);
    setCurrentPage(1);
    syncUrl({ mine: newVal, page: 1 });
  };

  const currentBoardId = activeBoardData?.board_id || activeBoard;
  const getReadUrl = (postId: string) =>
    `/board_read?id=${postId}&board_id=${currentBoardId}&page=${currentPage}&tab=${encodeURIComponent(activeCategory)}`;

  const writeUrl = `/board_write?board_id=${currentBoardId}`;

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
    if (myPostsOnly && currentUser && p.author_id !== currentUser.id) return false;
    if (activeCategory !== "전체" && !p.title.includes(`[${activeCategory}]`)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return p.title.toLowerCase().includes(q) || (p.content || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalItems = filteredPosts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  // 쪽 번호는 10개씩 묶어 보여 준다 (Q&A 와 같은 방식). 다 그리면 글이 많을 때 본문 칸을 넘친다.
  const groupStart = Math.floor((currentPage - 1) / 10) * 10 + 1;
  const pageNumbers = Array.from({ length: Math.max(0, Math.min(10, totalPages - groupStart + 1)) }, (_, i) => groupStart + i);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visiblePosts = filteredPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const canRead = canAccessBoard(userLevel, activeBoardData?.perm_read ?? 0);
  const canWrite = canAccessBoard(userLevel, activeBoardData?.perm_write ?? 5);

  // 글쓰기 버튼은 목록 위(검색창 옆)와 아래 두 곳에 둔다.
  // 쓰러 들어온 회원은 위에서, 읽다가 쓰고 싶어진 회원은 아래에서 누른다.
  const writeButton = canWrite ? (
    <a
      href={writeUrl}
      style={{
        padding: "9px 20px",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 800,
        color: "#ffffff",
        background: POINT,
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
        whiteSpace: "nowrap",
      }}
    >
      {activeBoard === "studyqa" ? "질문하기" : "글쓰기"}
    </a>
  ) : (
    <button
      type="button"
      onClick={() => showToast(`${getLevelName(activeBoardData?.perm_write ?? 5)}부터 글을 등록하실 수 있습니다. 🤍`)}
      style={{
        padding: "9px 20px",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 800,
        color: "#ffffff",
        background: POINT,
        border: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {activeBoard === "studyqa" ? "질문하기" : "글쓰기"}
    </button>
  );

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

      {/* ━━━ [1] 상단 히어로 배너 (통일된 프리미엄 스터디 히어로) ━━━ */}
      <StudyHero
        title="커뮤니티"
        englishTitle="Study Community"
        description="막히는 건 물어보고, 아는 건 나눠 주세요!"
        tabs={[
          {
            key: "studyqa",
            label: "스터디 Q&A",
            isActive: activeBoard === "studyqa",
            onClick: () => switchBoard("studyqa"),
          },
          {
            key: "free",
            label: "자유게시판",
            isActive: activeBoard === "free",
            onClick: () => switchBoard("free"),
          },
        ]}
      />

      {/* ━━━ [2] 게시판 본문 (시원한 풀 와이드 스터디 레이아웃) ━━━ */}
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
          className="study-qna container px-20"
          style={{
            maxWidth: 1200,
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
            minHeight: "60vh",
            marginTop: 28,
            marginBottom: 70,
          }}
        >


          {/* 검색 및 상단 헤더 */}
          <div className="board-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <div className="board-title" style={{ fontSize: 20 }}>
              {activeBoard === "studyqa" ? "스터디 질의응답 목록" : "수강생 자유게시판"}
            </div>
            <div className="board-search-write">
              <div className="b-search">
                <input
                  type="text"
                  placeholder={activeBoard === "studyqa" ? "질문 검색" : "글 검색"}
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch(searchInputValue);
                  }}
                />
                <button onClick={() => handleSearch(searchInputValue)}>검색</button>
              </div>
              {writeButton}
            </div>
          </div>

          {/* 서브 카테고리 알약 탭 (Q&A의 경우 AI, 영상편집 등) */}
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

          {/* 게시글 테이블 */}
          <div style={{ marginTop: 20 }}>
            <table className="b-list-table">
              <thead>
                <tr>
                  <th style={{ width: 72 }}>번호</th>
                  <th style={{ textAlign: "left" }}>제목</th>
                  <th style={{ width: 120 }}>작성자</th>
                  <th style={{ width: 118 }}>작성일</th>
                  <th style={{ width: 80 }}>조회</th>
                </tr>
              </thead>
              <tbody>
                {visiblePosts.length > 0 ? (
                  visiblePosts.map((p, i) => {
                    const replyCount = p.board_comments ? p.board_comments.length : 0;
                    const isAnswered = replyCount > 0;
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
                                  `${getLevelName(activeBoardData?.perm_read ?? 0)}부터 열람하실 수 있습니다.`
                                );
                              }
                            }}
                          >
                            {/* Q&A 게시판일 경우 [답변대기/답변완료] 상태 배지 */}
                            {activeBoard === "studyqa" && (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 7px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  borderRadius: "4px",
                                  marginRight: "8px",
                                  backgroundColor: isAnswered ? "#ecfdf5" : "#f3f4f6",
                                  color: isAnswered ? "#059669" : "#6b7280",
                                  border: isAnswered ? "1px solid #a7f3d0" : "1px solid #e5e7eb",
                                }}
                              >
                                {isAnswered ? "답변완료" : "답변대기"}
                              </span>
                            )}
                            {p.title}
                          </Link>
                          {replyCount > 0 && <span className="reply-count">[{replyCount}]</span>}
                        </td>
                        <td>{p.author_name || "회원"}</td>
                        <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</td>
                        <td>{p.view_count || 0}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "60px 0", textAlign: "center", color: "#888" }}>
                      등록된 게시글이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 하단 페이지네이션 및 우측 버튼 */}
          <div
            style={{
              marginTop: 30,
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

              {pageNumbers.map((pageNum) => (
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

            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {currentUser && (
                <button
                  type="button"
                  onClick={toggleMyPosts}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {myPostsOnly ? "전체글 보기" : "내가등록한글 보기"}
                </button>
              )}

              {writeButton}
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
        /* 스터디 커뮤니티 전용: 공지사항 게시판(board?id=notice)과 동일한 네이비 테마 및 반응형 보정 */
        .study-qna {
          --board-navy: #1a2e50 !important;
          --board-navy-dark: #0f1d36 !important;
          --board-navy-soft: #f8fafc !important;
        }
        .study-qna .cat-badge { color: #ef4444 !important; font-size: 14px; font-weight: 800; margin-right: 8px; }
        .study-qna .b-tab.active { background: #1a2e50 !important; border-color: #1a2e50 !important; color: #ffffff !important; }
        .study-qna .b-tab:hover { border-color: #1a2e50 !important; color: #1a2e50 !important; }
        .study-qna .b-list-table { border-top: 2px solid #1a2e50 !important; }
        .study-qna .b-list-table tbody tr:hover td.subject { color: #1a2e50 !important; }
        .study-qna .b-list-table td.subject a { color: inherit; text-decoration: none; }
        .study-qna .b-search button { background: #f8f9fa !important; border-color: #ccc !important; color: #555 !important; }
        .study-qna .b-search button:hover { background: #e2e8f0 !important; color: #111 !important; }
        .study-qna .b-search input:focus { border-color: #1a2e50 !important; outline: none; }
      `}</style>
    </div>
  );
}
