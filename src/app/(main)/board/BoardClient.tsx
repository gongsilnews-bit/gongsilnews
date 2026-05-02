"use client";

import React, { useState } from "react";
import Link from "next/link";
import { saveBoardPost } from "@/app/actions/board";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getPermissionLevel, canAccessBoard, getLevelName } from "@/utils/permissionCheck";

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

// 우선순위에 따른 대표 썸네일 추출 (1순위: 직접첨부이미지, 2순위: 유튜브링크, 3순위: 구글드라이브링크)
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
  } catch(e) {}

  const ytThumb = getYoutubeThumbnail(ytUrl);
  if (ytThumb) return ytThumb;

  const drThumb = getDriveThumbnail(drUrl);
  if (drThumb) return drThumb;

  return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=320&q=80";
}

// 비디오 아이콘 표시 여부 판별기
function hasVideoLink(p: any, skinType: string): boolean {
  // 유튜브는 항상 비디오
  let hasVideo = p.youtube_url;
  // 구글 드라이브는 VIDEO_ALBUM 스킨일 때만 비디오로 간주 (나머지 자료실은 일반 파일 다운로드 목적)
  let isDriveVideo = (skinType === "VIDEO_ALBUM") && p.drive_url && p.drive_url.includes("drive.google.com/file/d/");
  
  hasVideo = hasVideo || isDriveVideo;

  try {
    if (p.external_url && p.external_url.startsWith("[")) {
      const links = JSON.parse(p.external_url);
      hasVideo = hasVideo || links.some((l: any) => {
        if (l.type === "YOUTUBE" || (l.url && (l.url.includes("youtube.com") || l.url.includes("youtu.be")))) return true;
        if (skinType === "VIDEO_ALBUM" && (l.type === "DRIVE" || (l.url && l.url.includes("drive.google.com")))) return true;
        return false;
      });
    }
  } catch(e) {}
  
  return !!hasVideo;
}

export default function BoardClient({ board, initialPosts }: { board: any, initialPosts: any[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = searchParams.get('tab') || "전체";
  const initialPage = parseInt(searchParams.get('page') || "1", 10) || 1;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posts, setPosts] = useState(initialPosts);
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };
  
  const [userLevel, setUserLevel] = useState<number>(0);
  const [isLevelChecking, setIsLevelChecking] = useState(true);

  React.useEffect(() => {
    const fetchUserLevel = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('members').select('role, plan_type').eq('id', user.id).single();
        if (data) {
          setUserLevel(getPermissionLevel(data));
        }
      }
      setIsLevelChecking(false);
    };
    fetchUserLevel();
  }, []);
  const itemsPerPage = 12;

  // URL 파라미터가 변경(뒤로가기 등)될 때 상태 동기화
  React.useEffect(() => {
    setActiveTab(searchParams.get('tab') || "전체");
    setCurrentPage(parseInt(searchParams.get('page') || "1", 10) || 1);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    params.set("page", "1");
    params.set("id", board.board_id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (p: number | ((prev: number) => number)) => {
    const newPage = typeof p === 'function' ? p(currentPage) : p;
    setCurrentPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    params.set("tab", activeTab);
    params.set("id", board.board_id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const getReadUrl = (postId: string) => {
    return `/board_read?id=${postId}&board_id=${board.board_id}&page=${currentPage}&tab=${encodeURIComponent(activeTab)}`;
  };

  // 카테고리 탭 파싱 (예: "드론,아파트,빌딩")
  const tabs = ["전체"];
  if (board.categories) {
    const cats = board.categories.split(",").map((c: string) => c.trim()).filter(Boolean);
    tabs.push(...cats);
  }

  // 글쓰기 헤더 태그 토글
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      const tagStr = newTags.map(t => `[${t}] `).join("");
      const curTitle = postTitle.replace(/^(?:\[[^\]]+\]\s*)+/, "");
      setPostTitle(tagStr + curTitle);
      return newTags;
    });
  };

  const handleWriteSubmit = async () => {
    if (!postTitle.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    const res = await saveBoardPost({
      board_id: board.board_id,
      title: postTitle,
      content: postContent,
      author_name: "관리자 (테스트)",
      // thumbnail_url 등 기타 정보는 실제 구현 시 업로드 후 설정
    });
    setIsSubmitting(false);

    if (res.success) {
      alert("글이 성공적으로 등록되었습니다.");
      setIsModalOpen(false);
      setPostTitle("");
      setPostContent("");
      setSelectedTags([]);
      // 목록 임시 추가 (새로고침 없이 반영)
      setPosts([{
        id: res.postId,
        title: postTitle,
        content: postContent,
        author_name: "관리자 (테스트)",
        view_count: 0,
        created_at: new Date().toISOString()
      }, ...posts]);
    } else {
      alert("글 등록 실패: " + res.error);
    }
  };

  // 탭 필터링 및 제목 검색(추후 구현) 상태
  const filteredPosts = posts.filter(p => {
    if (activeTab === "전체") return true;
    return p.title.includes(`[${activeTab}]`); // 간단한 태그 기반 필터 구현
  });

  const totalItems = filteredPosts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visiblePosts = filteredPosts.slice(startIndex, startIndex + itemsPerPage);
  
  const isListType = board.skin_type === "LIST";

  if (isLevelChecking) {
    return <div style={{ padding: 100, textAlign: "center", color: "#666" }}>권한을 확인하는 중입니다...</div>;
  }

  if (!canAccessBoard(userLevel, board.perm_list ?? 0)) {
    return (
      <div style={{ padding: 100, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, color: "#ef4444", marginBottom: 12 }}>{getLevelName(board.perm_list ?? 0)}부터 열람하실 수 있습니다.</h2>
        <p style={{ color: "#666" }}>목록 보기 레벨: <strong>{board.perm_list ?? 0}레벨 이상</strong> (현재 내 레벨: {userLevel}레벨)</p>
        <button onClick={() => router.push('/')} style={{ marginTop: 24, padding: "10px 24px", background: "#333", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>메인으로 돌아가기</button>
      </div>
    );
  }

  return (
    <>
      <main className="container px-20 b-layout" style={{ position: "relative", minHeight: "80vh" }}>
        
        <div className="b-list-area">
          <div className="board-header">
            <div className="board-title">
              {board.name}
              {board.subtitle && <span style={{ fontSize: 16, fontWeight: 500, color: "#666", marginLeft: 10 }}>({board.subtitle})</span>}
            </div>
            <div className="board-search-write">
              <div className="b-search">
                <input type="text" placeholder="제목 검색" />
                <button>검색</button>
              </div>
            </div>
          </div>

          {tabs.length > 1 && (
            <div className="board-tabs">
              {tabs.map(tab => (
                <div 
                  key={tab} 
                  className={`b-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => handleTabChange(tab)}
                >
                  {tab}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            {isListType ? (
              // 리스트형 스킨 (테이블 형태)
              <table className="b-list-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>번호</th>
                    <th style={{ textAlign: "left" }}>제목</th>
                    <th style={{ width: 100 }}>작성자</th>
                    <th style={{ width: 100 }}>작성일</th>
                    <th style={{ width: 60 }}>조회</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePosts.length > 0 ? visiblePosts.map((p, i) => (
                    <tr key={p.id}>
                      <td>{totalItems - startIndex - i}</td>
                      <td className="subject">
                        <Link 
                          href={canAccessBoard(userLevel, board.perm_read ?? 0) ? getReadUrl(p.id) : "#"} 
                          onClick={(e) => {
                            if (!canAccessBoard(userLevel, board.perm_read ?? 0)) {
                              e.preventDefault();
                              showToast(`${getLevelName(board.perm_read ?? 0)}부터 열람하실 수 있습니다.. 🤍`);
                            }
                          }}
                          style={{ display: "block" }}
                        >
                          {/* 카테고리 뱃지는 정규식으로 추출하거나 title에서 추출해서 표시 */}
                          {p.title.match(/^\[([^\]]+)\]/) && (
                            <span className="cat-badge">{p.title.match(/^\[([^\]]+)\]/)?.[0]}</span>
                          )}
                          {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                        </Link>
                      </td>
                      <td>{p.author_name || "익명"}</td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>{p.view_count || 0}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, borderBottom: "1px solid #eee", color: "#999" }}>등록된 게시글이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              // 썸네일형 스킨 (그리드 형태)
              <div className="b-grid">
                {visiblePosts.length > 0 ? visiblePosts.map((p, i) => (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      if (!canAccessBoard(userLevel, board.perm_read ?? 0)) {
                        showToast(`${getLevelName(board.perm_read ?? 0)}부터 열람하실 수 있습니다.. 🤍`);
                      } else {
                        router.push(getReadUrl(p.id));
                      }
                    }}
                    style={{ display: "block", textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 8, overflow: "hidden", cursor: "pointer" }}
                  >
                    <div style={{ height: 140, background: "#222", position: "relative", overflow: "hidden" }}>
                      <img src={getPrimaryThumbnail(p)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} alt="thumb" />
                      {hasVideoLink(p, board.skin_type) && (
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, background: "rgba(0,0,0,0.6)", borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 15 }}>
                      {p.title.match(/^\[([^\]]+)\]/) && (
                        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#508bf5", background: "rgba(80,139,245,0.1)", borderRadius: 4, padding: "2px 7px", marginBottom: 7 }}>{p.title.match(/^\[([^\]]+)\]/)?.[0]}</div>
                      )}
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title.replace(/^\[([^\]]+)\]\s*/, "")}</div>
                      <div style={{ fontSize: 13, color: "#777", display: "flex", justifyContent: "space-between" }}>
                        <span>{p.author_name || "익명"}</span>
                        <span>조회 {p.view_count || 0} · {new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", color: "#999", border: "1px solid #eee", borderRadius: 8 }}>등록된 게시물이 없습니다.</div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 40, marginBottom: 20, position: "relative" }}>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div className="pagination" style={{ display: "flex", gap: "4px" }}>
                <button 
                  className="page-btn" 
                  onClick={() => handlePageChange(1)} 
                  disabled={currentPage === 1}
                  style={{ padding: "6px 10px", border: "1px solid #ddd", background: currentPage === 1 ? "#f9f9f9" : "#fff", color: currentPage === 1 ? "#aaa" : "#555", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  &lt;&lt;
                </button>
                <button 
                  className="page-btn" 
                  onClick={() => handlePageChange(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  style={{ padding: "6px 10px", border: "1px solid #ddd", background: currentPage === 1 ? "#f9f9f9" : "#fff", color: currentPage === 1 ? "#aaa" : "#555", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  &lt;
                </button>

                {(() => {
                  const PAGE_GROUP_SIZE = 10;
                  const currentGroup = Math.ceil(currentPage / PAGE_GROUP_SIZE);
                  const startPage = (currentGroup - 1) * PAGE_GROUP_SIZE + 1;
                  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages);
                  const pages = [];
                  for (let i = startPage; i <= endPage; i++) pages.push(i);
                  
                  return pages.map(p => (
                    <button 
                      key={p} 
                      onClick={() => handlePageChange(p)} 
                      style={{ 
                        padding: "6px 12px", minWidth: 32,
                        border: "1px solid #ddd", 
                        background: currentPage === p ? "#111" : "#fff", 
                        color: currentPage === p ? "#fff" : "#555",
                        fontWeight: currentPage === p ? "bold" : "normal",
                        cursor: "pointer"
                      }}
                    >
                      {p}
                    </button>
                  ));
                })()}

                <button 
                  className="page-btn" 
                  onClick={() => handlePageChange(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  style={{ padding: "6px 10px", border: "1px solid #ddd", background: currentPage === totalPages ? "#f9f9f9" : "#fff", color: currentPage === totalPages ? "aaa" : "#555", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                >
                  &gt;
                </button>
                <button 
                  className="page-btn" 
                  onClick={() => handlePageChange(totalPages)} 
                  disabled={currentPage === totalPages}
                  style={{ padding: "6px 10px", border: "1px solid #ddd", background: currentPage === totalPages ? "#f9f9f9" : "#fff", color: currentPage === totalPages ? "aaa" : "#555", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
            {canAccessBoard(userLevel, board.perm_write ?? 5) && (
              <div style={{ position: "absolute", right: 0 }}>
                <a 
                  className="b-write-btn" 
                  href={`/board_write?board_id=${board.board_id}`}
                  style={{ background: "#102c57", color: "#fff", textDecoration: "none", display: "inline-block" }}
                >
                  글쓰기
                </a>
              </div>
            )}
          </div>

        </div>
        
        {/* 사이드바는 스킨 타입 상관없이 공통 노출 */}
        <div className="b-sidebar">
          <div className="sb-banner" style={{ background: "#e2e2e2" }}>
            배너 1
          </div>
          
          <div className="sb-widget">
            <div className="sb-title">인기 게시물</div>
            <ul className="pop-list">
              {[...posts].sort((a,b) => (b.view_count||0) - (a.view_count||0)).slice(0, 5).map((p, i) => (
                <li className="pop-item" key={p.id || i}>
                  <span className="pop-ranking">{i + 1}</span>
                  <Link href={getReadUrl(p.id)} className="pop-title" style={{ color: "inherit", textDecoration: "none" }}>{p.title.replace(/^\[([^\]]+)\]\s*/, "")}</Link>
                </li>
              ))}
              {posts.length === 0 && <li style={{ fontSize: 13, color: "#999" }}>게시물이 없습니다.</li>}
            </ul>
          </div>
        </div>
      </main>

      {/* 글쓰기 모달 */}
      {isModalOpen && (
        <div className="b-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="b-modal-content" onClick={e => e.stopPropagation()}>
            <div className="mod-head">
              <div className="mod-title">게시글 작성 ({board.name})</div>
              <div className="mod-close" onClick={() => setIsModalOpen(false)}>&times;</div>
            </div>
            
            {tabs.length > 1 && (
              <div className="mod-row">
                <label className="mod-label">머리글 선택 (선택사항)</label>
                <div className="header-tags">
                  {tabs.filter(t => t !== "전체").map(tag => (
                    <div 
                      key={tag} 
                      className={`h-tag ${selectedTags.includes(tag) ? "selected" : ""}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mod-row">
              <label className="mod-label">제목</label>
              <input 
                type="text" 
                className="mod-input" 
                placeholder="제목을 입력하세요."
                value={postTitle}
                onChange={e => setPostTitle(e.target.value)}
              />
            </div>
            
            {!isListType && (
              <div className="mod-row">
                <label className="mod-label">썸네일 이미지 파일 (옵션)</label>
                <input type="file" className="mod-input" style={{ padding: 9, cursor: "pointer" }} />
              </div>
            )}

            <div className="mod-row" style={{ marginBottom: 0 }}>
              <label className="mod-label">내용</label>
              <textarea 
                className="mod-textarea" 
                placeholder="내용을 자유롭게 입력하세요."
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
              ></textarea>
            </div>
            
            <div className="mod-footer">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>취소</button>
              <button className="btn-submit" onClick={handleWriteSubmit} disabled={isSubmitting}>
                {isSubmitting ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div style={{ position: "fixed", top: "25%", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "14px 32px", borderRadius: 10, fontSize: 16, fontWeight: "bold", zIndex: 999999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", animation: "toastFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {toastMessage}
        </div>
      )}

      <style>{`
        @keyframes toastFadeIn { 
          from { opacity: 0; transform: translate(-50%, 15px); } 
          to { opacity: 1; transform: translate(-50%, 0); } 
        }
      `}</style>
    </>
  );
}
