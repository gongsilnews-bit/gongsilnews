"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import HomeHeader from "../_components/HomeHeader";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/AuthModal";

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

function getPermissionLevel(data: any): number {
  if (data.role === 'admin') return 10;
  if (data.plan_type === 'premium') return 5;
  return 1;
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

  React.useEffect(() => {
    if (serverUser || serverUserLevel !== undefined) return;
    const fetchUserLevel = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('members').select('role, plan_type').eq('id', user.id).single();
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

  const filteredPosts = initialPosts.filter(p => {
    if (showMyPosts && p.author_id !== currentUser?.id) return false;
    if (activeTab === "전체") return true;
    return p.title.includes(`[${activeTab}]`);
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

  return (
    <div style={{ width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#fff', height: '54px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '8px', marginLeft: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
          {board?.name || "게시판"}
        </div>
        <button onClick={() => router.push('/m/search')} style={{ background: 'none', border: 'none', padding: '8px', marginRight: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1a2e50', display: 'flex', alignItems: 'center' }}>
          <span style={{ width: '6px', height: '20px', backgroundColor: '#1a2e50', marginRight: '8px', display: 'inline-block' }}></span>
          {board.name}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            {board.subtitle || "공실뉴스가 제공하는 자료실입니다."}
          </p>
          {currentUser && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#4b5563', cursor: 'pointer', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={showMyPosts} 
                onChange={(e) => setShowMyPosts(e.target.checked)}
                style={{ accentColor: '#2563eb', width: '16px', height: '16px' }}
              />
              내가 쓴 글
            </label>
          )}
        </div>
      </div>

      {tabs.length > 1 && (
        <div style={{ padding: '0 16px 16px', overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: '8px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: activeTab === tab ? '1px solid #2563eb' : '1px solid #e5e7eb',
                backgroundColor: activeTab === tab ? '#2563eb' : '#fff',
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
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
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
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
