"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import MobileTopBarHeader from "../_components/MobileTopBarHeader";
import StudySubMenuBar from "../_components/StudySubMenuBar";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/AuthModal";
import { getPermissionLevel } from "@/utils/permissionCheck";

const RESOURCE_BOARDS = [
  {
    id: "drone",
    name: "드론영상",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 5l2 2M19 5l-2 2M5 19l2-2M19 19l-2-2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    ),
  },
  {
    id: "app",
    name: "APP(앱)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: "prompt",
    name: "AI 프롬프트",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
        <path d="M16 14H8l-2 8h12l-2-8z" />
        <line x1="9" y1="18" x2="15" y2="18" />
      </svg>
    ),
  },
  {
    id: "sound",
    name: "음원",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: "doc",
    name: "계약서/양식",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
];

const COMMUNITY_BOARDS = [
  {
    id: "free",
    name: "자유게시판",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="13" y2="13" />
      </svg>
    ),
  },
  {
    id: "studyqa",
    name: "Q&A",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
      </svg>
    ),
  },
];

const HELP_BOARDS = [
  { id: "faq", name: "자주 묻는 질문(FAQ)", href: "/m/help" },
  { id: "notice", name: "공지사항", href: "/m/board?id=notice" },
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
        const { data } = await supabase.from('members').select('role, plan_type, name, agencies(status)').eq('id', user.id).single();
        if (data) {
          setUserLevel(getPermissionLevel(data));
          setCurrentUser({ ...user, role: data.role, name: data.name });
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
  const isCommunity = COMMUNITY_BOARDS.some(b => b.id === currentBoardId);
  const isNotice = currentBoardId === "notice";
  const isStudySection = isResource || isCommunity;
  const subBoards = isResource ? RESOURCE_BOARDS : COMMUNITY_BOARDS;
  const displayName = currentUser?.name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "부동산";

  return (
    <div style={{ width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '40px', paddingTop: isStudySection ? '108px' : '56px' }}>
      {/* 공통 상단 헤더 (로고 + 1차 카테고리) — 공지사항은 고객센터, 스터디 관련은 공실스터디 활성 */}
      <MobileTopBarHeader activeTab={isNotice ? "help" : "study"} />
      {isStudySection && <StudySubMenuBar />}

      {/* 고객센터(공지사항) 서브메뉴 */}
      {isNotice && (
        <div
          style={{
            position: 'sticky',
            top: '56px',
            zIndex: 34,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '8px',
            padding: '8px 16px',
          }}
        >
          {HELP_BOARDS.map((b) => {
            const isSel = b.id === "notice";
            return (
              <button
                key={b.id}
                onClick={() => router.push(b.href)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13.5px',
                  fontWeight: isSel ? 700 : 500,
                  color: isSel ? '#ffffff' : '#4b5563',
                  backgroundColor: isSel ? '#1a2e50' : '#f3f4f6',
                  border: isSel ? '1px solid #1a2e50' : '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 스터디 브릿지 배너 (1차 카테고리와 2차 픽토그램 사이) */}
      {isStudySection && (
        <div style={{ padding: "16px 16px 12px", backgroundColor: "#ffffff" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#059669",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  padding: "2px 8px",
                  borderRadius: "12px",
                }}
              >
                {isResource ? "✨ 부동산 마케팅 & 실무 필수자료" : "💬 공인중개사 & 스터디 실시간 소통망"}
              </span>
              <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
                <span style={{ fontWeight: 800, color: "#111" }}>{displayName} 대표님</span>을 위한
              </span>
            </div>
            <h2 style={{ fontSize: "17.5px", fontWeight: 900, color: "#064e3b", margin: 0, letterSpacing: "-0.5px", lineHeight: 1.35 }}>
              {isResource
                ? "고화질 드론영상부터 AI 프롬프트·계약서식까지!"
                : "막히는 실무 질문부터 생생한 현장 이야기까지!"}
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.4 }}>
              {isResource
                ? "매물 홍보 유튜브 소스 · 필수 업무 앱 · 중개 실무 서식을 다운로드하세요."
                : "혼자 고민하지 마세요. 세무·법률·AI 마케팅 Q&A와 자유로운 정보 공유의 장"}
            </p>
          </div>
        </div>
      )}

      {/* 2차 카테고리 픽토그램 메뉴 바 (뉴스 스타일 52px 둥근 사각형) */}
      {isStudySection && (
        <div
          style={{
            padding: "0 16px 14px",
            backgroundColor: "#ffffff",
            borderBottom: "8px solid #f4f6f8",
          }}
        >
          <div
            className="hide-scrollbar"
            style={{
              display: "flex",
              gap: "12px",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              paddingBottom: "4px",
              alignItems: "flex-start",
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
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    width: "60px",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isSel ? "#ecfdf5" : "#f8fafc",
                      border: isSel ? "2px solid #059669" : "1px solid #e5e7eb",
                      color: isSel ? "#059669" : "#64748b",
                      boxShadow: isSel ? "0 3px 8px rgba(5, 150, 105, 0.18)" : "none",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {b.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: isSel ? 800 : 500,
                      color: isSel ? "#059669" : "#374151",
                      letterSpacing: "-0.3px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      {!isStudySection && (
        <div style={{ padding: '10px 16px 8px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '15px', margin: 0 }}>
            {board.subtitle || "공실뉴스가 제공하는 자료실입니다."}
          </p>
        </div>
      )}

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
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 6px', borderRadius: '4px', backgroundColor: (p.board_comments && p.board_comments.length > 0) ? '#10b981' : '#f3f4f6', color: (p.board_comments && p.board_comments.length > 0) ? '#fff' : '#6b7280', flexShrink: 0 }}>
                        {(p.board_comments && p.board_comments.length > 0) ? '답변완료' : '답변대기'}
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
                    <Image src={getPrimaryThumbnail(p)} alt="thumbnail" fill sizes="(max-width: 448px) 50vw, 200px" style={{ objectFit: 'cover' }} />
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
                        <span style={{ display: 'inline-block', marginRight: '6px', fontSize: '10px', fontWeight: 700, padding: '2px 4px', borderRadius: '4px', backgroundColor: (p.board_comments && p.board_comments.length > 0) ? '#10b981' : '#f3f4f6', color: (p.board_comments && p.board_comments.length > 0) ? '#fff' : '#6b7280' }}>
                          {(p.board_comments && p.board_comments.length > 0) ? '답변완료' : '답변대기'}
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
