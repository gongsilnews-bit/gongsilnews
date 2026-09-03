"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BoardDropdownHeader from "../_components/header/BoardDropdownHeader";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/AuthModal";
import { getPermissionLevel } from "@/utils/permissionCheck";

const RESOURCE_BOARDS = [
  { id: "drone", name: "드론영상", icon: "🚁" },
  { id: "app", name: "APP(앱)", icon: "📱" },
  { id: "prompt", name: "AI 프롬프트", icon: "🤖" },
  { id: "sound", name: "음원", icon: "🎵" },
  { id: "doc", name: "계약서/양식", icon: "📄" },
];

const COMMUNITY_BOARDS = [
  { id: "free", name: "자유게시판", icon: "💬" },
  { id: "qna", name: "Q&A게시판", icon: "❓" },
  { id: "notice", name: "공지사항", icon: "📢" },
  { id: "inquiry", name: "1:1 문의", icon: "✉️" },
];

function getYoutubeThumbnail(url: string): string | null {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

function getDriveThumbnail(url: string): string | null {
  if (!url) return null;
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : null;
}

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

function hasVideoLink(p: any, skinType: string): boolean {
  let hasVideo = p.youtube_url;
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


export default function MobileBoardClient({ board, initialPosts, serverUser, serverUserLevel }: { board: any, initialPosts: any[], serverUser?: any, serverUserLevel?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || "전체";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentUser, setCurrentUser] = useState<any>(serverUser ?? null);
  const [userLevel, setUserLevel] = useState<number>(serverUserLevel ?? 0);
  const [isLevelChecking, setIsLevelChecking] = useState(!serverUser && serverUserLevel === undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [isSearching, setIsSearching] = useState(!!searchParams.get('search'));
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [searchInputValue, setSearchInputValue] = useState(searchParams.get('search') || "");

  React.useEffect(() => {
    const searchVal = searchParams.get('search') || "";
    setSearchQuery(searchVal);
    setSearchInputValue(searchVal);
    setIsSearching(!!searchVal);
  }, [searchParams]);

  const handleSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    setSearchQuery(trimmed);
    setSearchInputValue(trimmed);
    
    const params = new URLSearchParams(searchParams);
    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }
    params.set("id", board.board_id);
    router.replace(`/m/board?${params.toString()}`);
  };

  const handleCloseSearch = () => {
    setIsSearching(false);
    setSearchQuery("");
    setSearchInputValue("");
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("id", board.board_id);
    router.replace(`/m/board?${params.toString()}`);
  };

  React.useEffect(() => {
    if (serverUser || serverUserLevel !== undefined) return;
    const fetchUserLevel = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('members').select('role, plan_type, agencies(status)').eq('id', user.id).single();
        if (data) {
          setUserLevel(getPermissionLevel(data));
          setCurrentUser({ ...user, role: data.role });
        }
      }
      setIsLevelChecking(false);
    };
    fetchUserLevel();
  }, [serverUser, serverUserLevel]);

  const tabs = ["전체"];
  if (board.categories) {
    const cats = board.categories.split(",").map((c: string) => c.trim()).filter(Boolean);
    tabs.push(...cats);
  }

  const isListType = board.skin_type === "LIST";
  const is1to1 = board.board_type === "inquiry";
  const hasReply = (post: any) => (post.board_comments?.[0]?.count || 0) > 0;

  const filteredPosts = initialPosts.filter(p => {
    if (showMyPosts && p.author_id !== currentUser?.id) return false;
    
    // 탭 필터링
    const matchesTab = activeTab === "전체" || p.title.includes(`[${activeTab}]`);
    if (!matchesTab) return false;

    // 검색어 실시간 필터링
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = p.title.toLowerCase().includes(q);
      const contentMatch = (p.content || "").toLowerCase().includes(q);
      return titleMatch || contentMatch;
    }

    return true;
  });

  const getReadUrl = (postId: string) => {
    return `/m/board_read?id=${postId}&board_id=${board.board_id}`;
  };

  const handleWriteClick = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const requiredLevel = is1to1 ? 1 : (board.perm_write || 1);
    if (userLevel < requiredLevel) {
      alert("이 게시판에 글을 작성할 권한이 없습니다.");
      return;
    }
    router.push(`/m/board_write?board_id=${board.board_id}`);
  };

  const currentBoardId = board?.board_id || "";
  const isResource = RESOURCE_BOARDS.some(b => b.id === currentBoardId);
  const subBoards = isResource ? RESOURCE_BOARDS : COMMUNITY_BOARDS;
  const sectionTitle = isResource ? "자료실" : "커뮤니티";

  return (
    <div style={{ width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* 현재 영역만 남긴 독립형 상단 헤더 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <button
          type="button"
          onClick={() => router.push(`/m/study?tab=${isResource ? "board" : "community"}`)}
          aria-label={`${sectionTitle} 이전 화면으로 돌아가기`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, padding: 0, background: 'none', border: 'none', color: '#1f2937', fontSize: 28, lineHeight: 1, cursor: 'pointer' }}
        >
          ‹
        </button>
        <h1 style={{ margin: 0, color: '#111827', fontSize: 17, fontWeight: 800 }}>{sectionTitle}</h1>
      </div>

      {/* 2차 카테고리 메뉴바 */}
      <div
        className="hide-scrollbar"
        style={{
          position: 'sticky',
          top: '56px',
          zIndex: 35,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '6px',
          padding: '10px 16px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          whiteSpace: 'nowrap',
        }}
      >
        {subBoards.map((b) => {
          const isSel = b.id === currentBoardId;
          return (
            <button
              key={b.id}
              onClick={() => router.push(`/m/board?id=${b.id}`)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: isSel ? 700 : 500,
                color: isSel ? '#ffffff' : '#4b5563',
                backgroundColor: isSel ? '#1a2e50' : '#f3f4f6',
                border: isSel ? '1px solid #1a2e50' : '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s',
              }}
            >
              <span>{b.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. 검색창 & 글쓰기 버튼 바 */}
      <div style={{ backgroundColor: '#ffffff', padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder={`"${board?.name || '게시판'}" 내 검색`}
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(searchInputValue);
            }}
            style={{
              width: '100%',
              height: '36px',
              border: '1px solid #e5e7eb',
              borderRadius: '18px',
              padding: '0 36px 0 14px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#f9fafb',
            }}
          />
          {searchInputValue ? (
            <button
              onClick={() => {
                setSearchInputValue("");
                setSearchQuery("");
                handleCloseSearch();
              }}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#9ca3af' }}
            >
              ✕
            </button>
          ) : (
            <button
              onClick={() => handleSearch(searchInputValue)}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#9ca3af' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
          )}
        </div>

        {/* 글쓰기 버튼 */}
        <button
          onClick={handleWriteClick}
          style={{
            padding: '7px 14px',
            borderRadius: '18px',
            backgroundColor: '#1a2e50',
            color: '#fff',
            fontSize: '13.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          글쓰기
        </button>
      </div>

      <div style={{ padding: '10px 16px 8px', textAlign: 'center' }}>
        <p style={{ color: '#9ca3af', fontSize: '15px', margin: 0 }}>
          {board.subtitle || "공실뉴스가 제공하는 자료실입니다."}
        </p>
      </div>

      {tabs.length > 1 && (
        <div style={{ padding: '0 16px 12px', overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: '8px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: activeTab === tab ? '1px solid #1a2e50' : '1px solid #e5e7eb',
                backgroundColor: activeTab === tab ? '#1a2e50' : '#fff',
                color: activeTab === tab ? '#fff' : '#4b5563',
                fontSize: '14px',
                fontWeight: activeTab === tab ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {filteredPosts.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
            등록된 게시물이 없습니다.
          </div>
        ) : isListType ? (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
            {filteredPosts.map((p, i) => (
              <Link key={p.id} href={getReadUrl(p.id)} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '16px', borderBottom: i < filteredPosts.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {p.title.match(/^\[([^\]]+)\]/) && (
                    <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                      {p.title.match(/^\[([^\]]+)\]/)?.[0]}
                    </span>
                  )}
                  <div style={{ fontSize: '16px', color: '#111827', fontWeight: 600, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {is1to1 && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 6px', borderRadius: '4px', backgroundColor: hasReply(p) ? '#10b981' : '#f3f4f6', color: hasReply(p) ? '#fff' : '#6b7280', flexShrink: 0 }}>
                        {hasReply(p) ? '답변완료' : '답변대기'}
                      </span>
                    )}
                    {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#6b7280' }}>
                    <span>{p.author_name || "관리자"}</span>
                    <span>{!is1to1 && `조회 ${p.view_count || 0} · `}{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {filteredPosts.map(p => (
              <Link key={p.id} href={getReadUrl(p.id)} style={{ textDecoration: 'none' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ width: '100%', aspectRatio: '4/3', position: 'relative', backgroundColor: '#e5e7eb' }}>
                    <img src={getPrimaryThumbnail(p)} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {hasVideoLink(p, board.skin_type) && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '36px', height: '36px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.8)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {p.title.match(/^\[([^\]]+)\]/) && (
                      <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, marginBottom: '6px', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                        {p.title.match(/^\[([^\]]+)\]/)?.[0]}
                      </span>
                    )}
                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: 700, lineHeight: 1.4, marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {is1to1 && (
                        <span style={{ display: 'inline-block', marginRight: '6px', fontSize: '10px', fontWeight: 700, padding: '2px 4px', borderRadius: '4px', backgroundColor: hasReply(p) ? '#10b981' : '#f3f4f6', color: hasReply(p) ? '#fff' : '#6b7280' }}>
                          {hasReply(p) ? '답변완료' : '답변대기'}
                        </span>
                      )}
                      {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
                      <span style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '60px' }}>{p.author_name || "관리자"}</span>
                      <span>{!is1to1 && `조회 ${p.view_count || 0}`}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 글쓰기 플로팅 버튼 (FAB) */}
      <button
        onClick={handleWriteClick}
        className="fab-btn"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#1a2e50',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(26, 46, 80, 0.3)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 40,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fab-btn {
          position: fixed;
          bottom: calc(76px + env(safe-area-inset-bottom));
          right: 24px;
        }
        @media (min-width: 448px) {
          .fab-btn {
            right: calc(50% - 224px + 24px);
          }
        }
      `}</style>
    </div>
  );
}
