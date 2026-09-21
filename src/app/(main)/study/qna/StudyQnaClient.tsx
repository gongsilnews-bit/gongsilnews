"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { canAccessBoard, getLevelName } from "@/utils/permissionCheck";
import StudyHeader from "@/components/study/StudyHeader";

/**
 * 공실스터디 Q&A게시판 (게시판관리에서 만든 studyqa 게시판을 그대로 사용)
 * 공실뉴스 게시판(/board)과 같은 목록형 마크업을 쓰되, 사이드바를 빼서 폭을 다 쓰고
 * 포인트 컬러만 스터디 에메랄드로 덮어쓴다.
 */
const POINT = "#059669";
const ITEMS_PER_PAGE = 12;

export default function StudyQnaClient({
  board,
  initialPosts,
  serverUser,
  serverUserLevel,
}: {
  board: any;
  initialPosts: any[];
  serverUser?: any;
  serverUserLevel?: number;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [posts, setPosts] = useState(initialPosts);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "전체");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10) || 1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [searchInputValue, setSearchInputValue] = useState(searchParams.get("search") || "");
  const [myPostsOnly, setMyPostsOnly] = useState(searchParams.get("mine") === "true");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 서버 페이지가 항상 로그인 여부를 판정해서 넘겨주므로(비로그인이면 0레벨),
  // 클라이언트에서 다시 조회하지 않는다. 목록이 첫 렌더부터 그대로 나온다.
  const userLevel = serverUserLevel ?? 0;
  const currentUser = serverUser ?? null;

  const syncUrl = (next: { tab?: string; page?: number; search?: string; mine?: boolean }) => {
    const params = new URLSearchParams();
    const tab = next.tab ?? activeTab;
    const page = next.page ?? currentPage;
    const search = next.search ?? searchQuery;
    const mine = next.mine ?? myPostsOnly;
    if (tab && tab !== "전체") params.set("tab", tab);
    if (page > 1) params.set("page", String(page));
    if (search.trim()) params.set("search", search.trim());
    if (mine) params.set("mine", "true");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    syncUrl({ search: value, page: 1 });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    syncUrl({ tab, page: 1 });
  };

  const handlePageChange = (p: number | ((prev: number) => number)) => {
    const newPage = typeof p === "function" ? p(currentPage) : p;
    setCurrentPage(newPage);
    syncUrl({ page: newPage });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleMyPosts = () => {
    const newVal = !myPostsOnly;
    setMyPostsOnly(newVal);
    setCurrentPage(1);
    syncUrl({ mine: newVal, page: 1 });
  };

  const getReadUrl = (postId: string) =>
    `/board_read?id=${postId}&board_id=${board.board_id}&page=${currentPage}&tab=${encodeURIComponent(activeTab)}`;

  const writeUrl = `/board_write?board_id=${board.board_id}`;

  // 카테고리 탭 (게시판관리에 입력한 "AI, 영상편집, 블로그, 유튜브, 기타")
  const tabs = ["전체"];
  if (board.categories) {
    tabs.push(
      ...board.categories
        .split(",")
        .map((c: string) => c.trim())
        .filter(Boolean)
    );
  }

  const answeredCount = posts.filter((p) => p.board_comments && p.board_comments.length > 0).length;

  const filteredPosts = posts.filter((p) => {
    if (myPostsOnly && currentUser && p.author_id !== currentUser.id) return false;

    if (activeTab !== "전체" && !p.title.includes(`[${activeTab}]`)) return false;

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

  const canRead = canAccessBoard(userLevel, board.perm_read ?? 0);
  const canWrite = canAccessBoard(userLevel, board.perm_write ?? 5);

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
      <StudyHeader />

      {/* ━━━ 상단 타이틀 배너 (강의목록 히어로와 같은 딥 포레스트 톤) ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "44px 0 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(16, 185, 129, 0.14)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              padding: "6px 14px",
              borderRadius: 24,
              fontSize: 13,
              fontWeight: 700,
              color: "#6ee7b7",
              marginBottom: 16,
            }}
          >
            <span>🌿</span>
            <span>공실스터디 수강생 질의응답</span>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.7px", margin: "0 0 10px 0" }}>{board.name}</h1>
          <p style={{ fontSize: 15, color: "#a7f3d0", opacity: 0.92, lineHeight: 1.6, margin: 0, wordBreak: "keep-all" }}>
            강의를 따라 하다 막힌 부분, AI·영상편집·블로그·유튜브 실무 질문을 남겨주세요. 담당 강사와 운영진이 직접 답변드립니다.
          </p>

          <div style={{ display: "flex", gap: 28, marginTop: 22, fontSize: 14, color: "#d1fae5", fontWeight: 600 }}>
            <span>
              전체 질문 <strong style={{ color: "#34d399", fontWeight: 800 }}>{posts.length}</strong>건
            </span>
            <span>
              답변완료 <strong style={{ color: "#34d399", fontWeight: 800 }}>{answeredCount}</strong>건
            </span>
          </div>
        </div>
      </section>

      {!canAccessBoard(userLevel, board.perm_list ?? 0) ? (
        <div style={{ padding: 100, textAlign: "center" }}>
          <h2 style={{ fontSize: 20, color: "#ef4444", marginBottom: 12 }}>
            {getLevelName(board.perm_list ?? 0)}부터 열람하실 수 있습니다.
          </h2>
          <p style={{ color: "#666" }}>
            목록 보기 레벨: <strong>{board.perm_list ?? 0}레벨 이상</strong> (현재 내 레벨: {userLevel}레벨)
          </p>
          <button
            onClick={() => router.push("/study")}
            style={{ marginTop: 24, padding: "10px 24px", background: POINT, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
          >
            공실스터디 홈으로
          </button>
        </div>
      ) : (
        <main className="container px-20 study-qna" style={{ minHeight: "60vh", marginTop: 20, marginBottom: 70 }}>
          <div className="board-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <div className="board-title">
              {board.name}
              {board.subtitle && (
                <span style={{ fontSize: 16, fontWeight: 500, color: "#666", marginLeft: 10 }}>({board.subtitle.trim()})</span>
              )}
            </div>
            <div className="board-search-write">
              <div className="b-search">
                <input
                  type="text"
                  placeholder="질문 검색"
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

          {tabs.length > 1 && (
            <div className="board-tabs">
              {tabs.map((tab) => (
                <div key={tab} className={`b-tab ${activeTab === tab ? "active" : ""}`} onClick={() => handleTabChange(tab)}>
                  {tab}
                </div>
              ))}
            </div>
          )}

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
                    return (
                      <tr key={p.id}>
                        <td>{totalItems - startIndex - i}</td>
                        <td className="subject">
                          <Link
                            href={canRead ? getReadUrl(p.id) : "#"}
                            onClick={(e) => {
                              if (!canRead) {
                                e.preventDefault();
                                showToast(`${getLevelName(board.perm_read ?? 0)}부터 열람하실 수 있습니다.. 🤍`);
                              }
                            }}
                            style={{ display: "block" }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                marginRight: 10,
                                fontSize: 12.5,
                                fontWeight: 800,
                                padding: "3px 9px",
                                borderRadius: 5,
                                background: replyCount > 0 ? POINT : "#f1f5f9",
                                color: replyCount > 0 ? "#fff" : "#64748b",
                              }}
                            >
                              {replyCount > 0 ? "답변완료" : "답변대기"}
                            </span>
                            {p.title.match(/^\[([^\]]+)\]/) && (
                              <span className="cat-badge">{p.title.match(/^\[([^\]]+)\]/)?.[0]}</span>
                            )}
                            {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                            {replyCount > 0 && (
                              <span style={{ color: "#ef4444", fontWeight: 800, fontSize: 13.5, marginLeft: 7 }}>[{replyCount}]</span>
                            )}
                          </Link>
                        </td>
                        <td>{p.author_name || "익명"}</td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td>{p.view_count || 0}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: 70, borderBottom: "1px solid #e5e7eb", color: "#94a3b8", fontSize: 14.5 }}>
                      {searchQuery.trim() || myPostsOnly || activeTab !== "전체"
                        ? "조건에 맞는 질문이 없습니다."
                        : "아직 등록된 질문이 없습니다. 첫 질문을 남겨보세요."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 40, marginBottom: 20, position: "relative" }}>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div className="pagination" style={{ display: "flex", gap: 6 }}>
                <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} style={pageBtnStyle(currentPage === 1)}>
                  &lt;&lt;
                </button>
                <button onClick={() => handlePageChange((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={pageBtnStyle(currentPage === 1)}>
                  &lt;
                </button>

                {(() => {
                  const PAGE_GROUP_SIZE = 10;
                  const currentGroup = Math.ceil(currentPage / PAGE_GROUP_SIZE);
                  const startPage = (currentGroup - 1) * PAGE_GROUP_SIZE + 1;
                  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages);
                  const pages = [];
                  for (let i = startPage; i <= endPage; i++) pages.push(i);

                  return pages.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      style={{
                        padding: "9px 14px",
                        minWidth: 40,
                        fontSize: 15,
                        borderRadius: 6,
                        border: currentPage === p ? `1px solid ${POINT}` : "1px solid #d7e0ee",
                        background: currentPage === p ? POINT : "#fff",
                        color: currentPage === p ? "#fff" : "#55617a",
                        fontWeight: currentPage === p ? 800 : 600,
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ));
                })()}

                <button
                  onClick={() => handlePageChange((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={pageBtnStyle(currentPage === totalPages)}
                >
                  &gt;
                </button>
                <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} style={pageBtnStyle(currentPage === totalPages)}>
                  &gt;&gt;
                </button>
              </div>
            </div>

            <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 8 }}>
              {currentUser && (
                <button
                  onClick={toggleMyPosts}
                  style={{
                    background: myPostsOnly ? POINT : "#fff",
                    color: myPostsOnly ? "#fff" : "#55617a",
                    padding: "11px 20px",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 15,
                    border: myPostsOnly ? `1px solid ${POINT}` : "1px solid #d7e0ee",
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  {myPostsOnly ? "전체글 보기" : "내가등록한글 보기"}
                </button>
              )}
              {canWrite ? (
                <a
                  href={writeUrl}
                  style={{
                    background: POINT,
                    color: "#fff",
                    padding: "11px 22px",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: "none",
                    display: "inline-block",
                    lineHeight: 1.4,
                  }}
                >
                  질문하기
                </a>
              ) : (
                <button
                  onClick={() => showToast(`${getLevelName(board.perm_write ?? 5)}부터 질문을 등록하실 수 있습니다.. 🤍`)}
                  style={{
                    background: "#fff",
                    color: "#94a3b8",
                    padding: "11px 22px",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 15,
                    border: "1px solid #d7e0ee",
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  질문하기
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "25%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "14px 32px",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: "bold",
            zIndex: 999999,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          {toastMessage}
        </div>
      )}

      <style>{`
        /* 공실뉴스 게시판 클래스를 그대로 쓰되 네이비 포인트만 스터디 에메랄드로 바꾼다 */
        .study-qna {
          --board-navy: #059669;
          --board-navy-dark: #047857;
          --board-navy-soft: #ecfdf5;
        }
        .study-qna .cat-badge { color: #059669; }
        .study-qna .b-list-table td.subject a { color: inherit; text-decoration: none; }
      `}</style>
    </div>
  );
}
