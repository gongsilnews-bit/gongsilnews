"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { canAccessBoard, getLevelName } from "@/utils/permissionCheck";
import BoardAccessModal, { type BoardAccessNotice } from "@/components/common/BoardAccessModal";
import StudyHeader, { STUDY_HERO_BAR } from "@/components/study/StudyHeader";
import TypingText from "@/components/study/TypingText";

/**
 * 공실스터디 Q&A게시판 (게시판관리에서 만든 studyqa 게시판을 그대로 사용)
 * 공실뉴스 게시판(/board)과 같은 목록형 마크업을 쓰되, 사이드바를 빼서 폭을 다 쓰고
 * 포인트 컬러만 스터디 에메랄드로 덮어쓴다.
 */
const POINT = "#1a2e50";
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
  const [accessNotice, setAccessNotice] = useState<BoardAccessNotice | null>(null);

  React.useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);


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
      <StudyHeader background={STUDY_HERO_BAR} />

      {/* ━━━ 상단 타이틀 배너 (멤버십신청과 100% 동일한 칸 높이 & 폰트 크기) ━━━ */}
      <section
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "linear-gradient(145deg, #052326 0%, #0c382f 60%, #114b3f 100%)",
          color: "#ffffff",
          padding: "60px 20px 64px",
          // 세 페이지 히어로 높이를 같게 두고 글은 세로 가운데
          minHeight: "260px",
          display: "flex",
          alignItems: "center",
          boxShadow: "0 4px 20px rgba(5, 35, 38, 0.25)",
        }}
      >
        <div
          style={{
            // 멤버십신청·나의 강의실 히어로와 같은 안쪽 라인 (글 시작 위치를 맞춘다)
            width: "100%",
            boxSizing: "border-box",
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 72,
            flexWrap: "wrap",
          }}
        >
          <div>

            {/* 멤버십신청·나의 강의실과 같은 모션: 제목은 아래에서 위로, 이어서 설명 문장 타이핑 */}
            <h1 className="study-hero-rise" style={{ display: "flex", alignItems: "baseline", gap: "24px", fontSize: "44px", fontWeight: 900, lineHeight: 1.2, letterSpacing: "-1px", margin: "0 0 16px", color: "#ffffff", wordBreak: "keep-all" }}>
              Q&amp;A 게시판
              <span style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-0.5px", color: "#34d399" }}>Study Community</span>
            </h1>

            <p style={{ fontSize: "24px", fontWeight: 500, color: "rgba(255, 255, 255, 0.92)", lineHeight: 1.45, margin: "0 0 18px", letterSpacing: "-0.5px", wordBreak: "keep-all" }}>
              <TypingText text="막히는 건 물어보고, 아는 건 나눠 주세요! 함께 하면, 더 쉬워집니다!" delay={750} speed={55} />
            </p>
            <style>{`
              .study-hero-rise { animation: studyHeroRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
              @keyframes studyHeroRise { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }
              @media (prefers-reduced-motion: reduce) { .study-hero-rise { animation: none; } }
            `}</style>

            {/* 아래 목록의 버튼과 같은 동작 */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {currentUser && (
                <button
                  type="button"
                  onClick={toggleMyPosts}
                  style={{
                    padding: "8px 16px", borderRadius: 7, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    background: myPostsOnly ? "#ffffff" : "rgba(255, 255, 255, 0.08)",
                    color: myPostsOnly ? POINT : "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.45)",
                  }}
                >
                  {myPostsOnly ? "전체글 보기" : "내가 쓴 글 보기"}
                </button>
              )}
              {canWrite ? (
                <a
                  href={writeUrl}
                  style={{ padding: "8px 18px", borderRadius: 7, fontSize: 13.5, fontWeight: 800, color: "#ffffff", background: "#10b981", textDecoration: "none", boxShadow: "0 3px 12px rgba(16, 185, 129, 0.4)" }}
                >
                  질문하기
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setAccessNotice({ level: board.perm_write ?? 5, action: "write" })}
                  style={{ padding: "8px 18px", borderRadius: 7, fontSize: 13.5, fontWeight: 800, color: "#ffffff", background: "#10b981", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  질문하기
                </button>
              )}
            </div>
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
                                setAccessNotice({ level: board.perm_read ?? 0 });
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
                  onClick={() => setAccessNotice({ level: board.perm_write ?? 5, action: "write" })}
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

      <BoardAccessModal notice={accessNotice} isLoggedIn={!!currentUser} onClose={() => setAccessNotice(null)} />

      <style>{`
        /* 공실뉴스 공지사항 게시판과 동일한 네이비 테마 */
        .study-qna {
          --board-navy: #1a2e50;
          --board-navy-dark: #0f1d36;
          --board-navy-soft: #f8fafc;
        }
        .study-qna .cat-badge { color: #ef4444; }
        .study-qna .b-tab.active { background: #1a2e50; border-color: #1a2e50; color: #ffffff; }
        .study-qna .b-tab:hover { border-color: #1a2e50; color: #1a2e50; }
        .study-qna .b-list-table { border-top: 2px solid #1a2e50; }
        .study-qna .b-list-table tbody tr:hover td.subject { color: #1a2e50; }
        .study-qna .b-list-table td.subject a { color: inherit; text-decoration: none; }
        .study-qna .b-search button { background: #f8f9fa; border-color: #ccc; color: #555; }
        .study-qna .b-search button:hover { background: #e2e8f0; color: #111; }
        .study-qna .b-search input:focus { border-color: #1a2e50; outline: none; }
      `}</style>
    </div>
  );
}
