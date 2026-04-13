"use client";

import React, { useState } from "react";
import Link from "next/link";
import { saveBoardPost } from "@/app/actions/board";

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
  const [activeTab, setActiveTab] = useState("전체");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posts, setPosts] = useState(initialPosts);

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

  const isListType = board.skin_type === "LIST";

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
                  onClick={() => setActiveTab(tab)}
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
                  {filteredPosts.length > 0 ? filteredPosts.map((p, i) => (
                    <tr key={p.id}>
                      <td>{filteredPosts.length - i}</td>
                      <td className="subject">
                        <Link href={`/board_read?id=${p.id}`} style={{ display: "block" }}>
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
                {filteredPosts.length > 0 ? filteredPosts.map((p, i) => (
                  <Link href={`/board_read?id=${p.id}`} key={p.id} style={{ display: "block", textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 8, overflow: "hidden", cursor: "pointer" }}>
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
                  </Link>
                )) : (
                  <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", color: "#999", border: "1px solid #eee", borderRadius: 8 }}>등록된 게시물이 없습니다.</div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 40, marginBottom: 20 }}>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", paddingRight: 10 }}>
              <div className="pagination">
                <button className="page-btn" disabled>&lt; 이전</button>
                <span className="page-info">1 / 1</span>
                <button className="page-btn" disabled>다음 &gt;</button>
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <a 
                className="b-write-btn" 
                href={`/board_write?board_id=${board.board_id}`}
                style={{ background: "#102c57", color: "#fff", textDecoration: "none", display: "inline-block" }}
              >
                글쓰기
              </a>
            </div>
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
                  <Link href={`/board_read?id=${p.id}`} className="pop-title" style={{ color: "inherit", textDecoration: "none" }}>{p.title.replace(/^\[([^\]]+)\]\s*/, "")}</Link>
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
    </>
  );
}
