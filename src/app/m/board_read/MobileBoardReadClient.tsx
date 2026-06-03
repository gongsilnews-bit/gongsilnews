"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BoardDropdownHeader from "../_components/header/BoardDropdownHeader";
import { incrementBoardView, saveBoardComment, deleteBoardPost } from "@/app/actions/board";
import { getPermissionLevel, canAccessBoard, getLevelName } from "@/utils/permissionCheck";
import { createClient } from "@/utils/supabase/client";

function getYoutubeId(url: string) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? `https://www.youtube.com/embed/${match[1]}?vq=hd1080&rel=0` : null;
}

export default function MobileBoardReadClient({ 
  post, 
  board, 
  comments, 
  prevPost, 
  nextPost,
  serverUser,
  serverUserLevel 
}: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userLevel, setUserLevel] = useState<number>(serverUserLevel ?? 0);
  const [currentUser, setCurrentUser] = useState<any>(serverUser ?? null);
  const [isChecking, setIsChecking] = useState(serverUserLevel === undefined);
  
  const [localComments, setLocalComments] = useState<any[]>(comments || []);
  const [commentText, setCommentText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState("");

  const handleSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    if (trimmed) {
      router.push(`/m/board?id=${board?.board_id || 'drone'}&search=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/m/board?id=${board?.board_id || 'drone'}`);
    }
  };

  // ?´ì „ê¸€/?¤ìŒê¸€ ?´ë™ ?±ìœ¼ë¡?commentsê°€ ë³€ê²½ë˜ë©??íƒœë¥??™ê¸°??  useEffect(() => {
    setLocalComments(comments || []);
  }, [comments]);

  useEffect(() => {
    async function checkAuth() {
      if (serverUserLevel !== undefined) {
        setIsChecking(false);
        setCurrentUser(serverUser);
      } else {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('members').select('role, plan_type').eq('id', user.id).single();
          if (data) {
            setUserLevel(getPermissionLevel(data));
            setCurrentUser({ ...user, role: data.role });
          }
        }
        setIsChecking(false);
      }
      
      // ì¡°íšŒ??ì¦ê?
      incrementBoardView(post.id);
    }
    checkAuth();
  }, [post.id, serverUserLevel, serverUser]);

  if (isChecking) {
    return <div style={{ padding: 100, textAlign: "center", color: "#666" }}>ê¶Œí•œ???•ì¸?˜ëŠ” ì¤‘ì…?ˆë‹¤...</div>;
  }

  if (board && !canAccessBoard(userLevel, board.perm_read ?? 0)) {
    return (
      <div style={{ padding: '60px 20px', textAlign: "center", backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <h2 style={{ fontSize: 20, color: "#ef4444", marginBottom: 12 }}>{getLevelName(board.perm_read ?? 0)}ë¶€???´ëŒ?˜ì‹¤ ???ˆìŠµ?ˆë‹¤.</h2>
        <p style={{ color: "#666", marginBottom: 24 }}>?„ì¬ ?ˆë²¨: {userLevel}?ˆë²¨</p>
        <button onClick={() => router.back()} style={{ padding: "12px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>?¤ë¡œ ê°€ê¸?/button>
      </div>
    );
  }

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    
    let authorName = guestName || "ê²ŒìŠ¤??;
    if (currentUser) {
      const r = currentUser.role?.toUpperCase() || "";
      if (r === "ADMIN" || r === "ìµœê³ ê´€ë¦¬ì" || r.includes("ê´€ë¦¬ì")) {
        authorName = "ìµœê³ ê´€ë¦¬ì";
      } else {
        authorName = currentUser.user_metadata?.full_name || currentUser.name || currentUser.email?.split('@')[0] || "?µëª…";
      }
    }

    const res = await saveBoardComment({
      post_id: post.id,
      author_id: currentUser?.id,
      author_name: authorName,
      content: commentText,
    });
    if (res.success) {
      setLocalComments([...localComments, {
        id: Date.now().toString(),
        author_name: authorName,
        content: commentText,
        created_at: new Date().toISOString(),
      }]);
      setCommentText("");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm("??ê²Œì‹œê¸€???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?")) return;
    const res = await deleteBoardPost(post.id);
    if (res.success) {
      alert("?? œ?˜ì—ˆ?µë‹ˆ??");
      router.replace(`/m/board?id=${board?.board_id}`);
    } else {
      alert("?? œ ?¤íŒ¨: " + res.error);
    }
  };

  const is1to1 = board?.board_type === "inquiry";

  // ?¤ì¤‘ ?¸ë? ë§í¬ ?Œì‹± ë³´ì™„
  const externalLinks = (() => {
    let links: any[] = [];
    try {
      if (post.external_url && post.external_url.startsWith("[")) {
        links = JSON.parse(post.external_url);
      }
    } catch(e) {}
    
    // ?´ì „ ë²„ì „ ?¸í™˜ (?¨ì¼ ë§í¬ ì§€??? ì?)
    if (links.length === 0) {
      if (post.youtube_url) links.push({ id: "legacy_yt", type: "YOUTUBE", label: "? íŠœë¸??ìƒ", url: post.youtube_url });
      if (post.drive_url) links.push({ id: "legacy_dr", type: "DRIVE", label: "êµ¬ê? ?œë¼?´ë¸Œ ?¤ìš´ë¡œë“œ", url: post.drive_url });
      if (post.external_url && !post.external_url.startsWith("[")) links.push({ id: "legacy_ex", type: "LINK", label: "?¸ë? ë§í¬", url: post.external_url });
    }
    return links;
  })();

  const driveEmbedUrl = (url: string) => {
    if (!url) return null;
    const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#fff', height: '54px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        {isSearching ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
            <button 
              onClick={() => {
                setIsSearching(false);
                setSearchInputValue("");
              }} 
              style={{ background: 'none', border: 'none', padding: '8px', marginLeft: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder={`"${board?.name || "ê²Œì‹œ??}" ??ê²€??} 
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(searchInputValue);
                  }
                }}
                autoFocus
                style={{ 
                  width: '100%', 
                  height: '36px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '20px', 
                  padding: '0 36px 0 16px', 
                  fontSize: '14px', 
                  outline: 'none', 
                  backgroundColor: '#f9fafb' 
                }} 
              />
              {searchInputValue && (
                <button 
                  onClick={() => setSearchInputValue("")} 
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#9ca3af' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
            </div>
            <button 
              onClick={() => handleSearch(searchInputValue)} 
              style={{ background: 'none', border: 'none', padding: '4px 8px', fontSize: '15px', fontWeight: 700, color: '#1e56a0', cursor: 'pointer' }}
            >
              ê²€??            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '8px', marginLeft: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <BoardDropdownHeader currentBoardName={board?.name || "?ë£Œ??} />
            <button onClick={() => setIsSearching(true)} style={{ background: 'none', border: 'none', padding: '8px', marginRight: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px' }}>
        {is1to1 && (
          <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, backgroundColor: (comments && comments.length > 0) ? '#10b981' : '#f3f4f6', color: (comments && comments.length > 0) ? '#fff' : '#6b7280', padding: '4px 10px', borderRadius: '4px', marginBottom: '12px', marginRight: '8px' }}>
            {(comments && comments.length > 0) ? '?µë??„ë£Œ' : '?µë??€ê¸?}
          </div>
        )}
        {post.title.match(/^\[([^\]]+)\]/) && (
          <div style={{ display: 'inline-block', fontSize: '13px', color: '#2563eb', fontWeight: 600, backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '4px', marginBottom: '12px' }}>
            {post.title.match(/^\[([^\]]+)\]/)?.[0]}
          </div>
        )}
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', lineHeight: 1.4, marginBottom: '16px', wordBreak: 'keep-all' }}>
          {post.title.replace(/^\[([^\]]+)\]\s*/, "")}
        </h1>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#6b7280', fontWeight: 600 }}>
              {(post.author_name || "ê´€")[0]}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{post.author_name || "ê´€ë¦¬ì"}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(post.created_at).toLocaleString()}</div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {!is1to1 && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                {post.view_count || 0}
              </>
            )}
          </div>
        </div>

        {/* Video / Content */}
        <div style={{ fontSize: '16px', lineHeight: 1.6, color: '#374151', wordBreak: 'break-word' }}>
          {post.thumbnail_url && (
            <div style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden' }}>
              <img src={post.thumbnail_url} alt="thumbnail" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          )}

          {/* ?¤ì¤‘ ?¸ë? ë§í¬ ë§¤ë‹ˆ?€ */}
          {externalLinks.map((link: any, idx: number) => {
            let resolvedType = link.type;
            if (link.url) {
              if (link.url.includes("drive.google.com")) {
                resolvedType = "DRIVE";
              } else if (link.url.includes("youtube.com") || link.url.includes("youtu.be")) {
                resolvedType = "YOUTUBE";
              }
            }

            if (resolvedType === "YOUTUBE") {
              const embedUrl = getYoutubeEmbedUrl(link.url);
              if (!embedUrl) return null;
              return (
                <div key={link.id || idx} style={{ marginBottom: '24px', position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                  <iframe
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    src={embedUrl}
                    allowFullScreen
                    title={link.label || "YouTube ?ìƒ"}
                  />
                </div>
              );
            } else if (resolvedType === "DRIVE") {
              const embedUrl = driveEmbedUrl(link.url);
              return (
                <div key={link.id || idx} style={{ marginBottom: '24px' }}>
                  {embedUrl && (
                    <div style={{ marginBottom: '16px', position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                      <iframe
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                        src={embedUrl}
                        allow="autoplay"
                        allowFullScreen
                        title="Google Drive ?ìƒ"
                      />
                    </div>
                  )}
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>{link.label || "êµ¬ê? ?œë¼?´ë¸Œ ?ë£Œ ?¤ìš´ë¡œë“œ"}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>??ê²Œì‹œë¬¼ì— ê´€?¨ëœ êµ¬ê? ?œë¼?´ë¸Œ ?Œì¼???¤ìš´ë¡œë“œ?©ë‹ˆ??</div>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: '#2563eb', color: '#fff', padding: '11px 22px',
                        borderRadius: '6px', fontSize: '14px', fontWeight: 700,
                        textDecoration: 'none', whiteSpace: 'nowrap'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      êµ¬ê? ?œë¼?´ë¸Œ ?¤ìš´ë¡œë“œ
                    </a>
                  </div>
                </div>
              );
            } else if (resolvedType === "LINK") {
              return (
                <div key={link.id || idx} style={{ marginBottom: '24px' }}>
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>{link.label || "?¸ë? ?°ì´??ë§í¬"}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>ê²Œì‹œ???¸ë? ë§í¬ ?ë£Œë¡??°ê²°?©ë‹ˆ??</div>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: '#f8fafc', border: '1px solid #e2e8f0', color: '#333',
                        padding: '11px 22px', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                        textDecoration: 'none', whiteSpace: 'nowrap'
                      }}
                    >
                      ?”— ?¸ë? ë§í¬ ë°©ë¬¸
                    </a>
                  </div>
                </div>
              );
            }
            return null;
          })}

          {/* ?ë””??ë³¸ë¬¸ ?´ìš© ì¤„ë°”ê¿??´ë ¤ ?Œë”ë§?*/}
          {post.content && (
            <div style={{ fontSize: '16px', lineHeight: 1.8, color: '#333', marginBottom: '28px', whiteSpace: 'pre-wrap' }}>
              {post.content}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ marginTop: '20px', borderTop: '8px solid #f8f9fa' }}>
        {prevPost && (
          <Link href={`/m/board_read?id=${prevPost.id}&board_id=${board?.board_id}`} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', width: '48px', flexShrink: 0 }}>?´ì „ê¸€</span>
            <span style={{ fontSize: '15px', color: '#374151', fontWeight: 500, flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{prevPost.title.replace(/^\[([^\]]+)\]\s*/, "")}</span>
          </Link>
        )}
        {nextPost && (
          <Link href={`/m/board_read?id=${nextPost.id}&board_id=${board?.board_id}`} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', width: '48px', flexShrink: 0 }}>?¤ìŒê¸€</span>
            <span style={{ fontSize: '15px', color: '#374151', fontWeight: 500, flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{nextPost.title.replace(/^\[([^\]]+)\]\s*/, "")}</span>
          </Link>
        )}
      </div>

      {/* ?¡ì…˜ ë°?(?˜ì •/?? œ) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px', gap: '8px', marginTop: '16px' }}>
        {(currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'super_admin' || currentUser?.id === post.author_id) && (
          <>
            <Link href={`/m/board_write?board_id=${board?.board_id}&post_id=${post.id}`} style={{ border: '1px solid #d1d5db', background: '#fff', color: '#555', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>?˜ì •</Link>
            <button onClick={handleDelete} style={{ border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>?? œ</button>
          </>
        )}
      </div>

      {/* ?“ê? ?ì—­ */}
      <div style={{ marginTop: '24px', borderTop: '8px solid #f8f9fa', padding: '24px 16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#111827' }}>?“ê? {localComments.length}ê°?/div>

        {/* ?“ê? ëª©ë¡ */}
        <div style={{ marginBottom: '24px' }}>
          {localComments.map((c: any) => (
            <div key={c.id} style={{ padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: '#374151' }}>{c.author_name || 'ê²ŒìŠ¤??}</span>
                <span style={{ color: '#9ca3af' }}>{new Date(c.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.content}</div>
            </div>
          ))}
          {localComments.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0', fontSize: '14px' }}>ì²??“ê????¨ê²¨ë³´ì„¸??</div>
          )}
        </div>

        {/* ?“ê? ?…ë ¥ */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser ? (
              <span>{currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}??/span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>?´ë¦„:</span>
                <input 
                  type="text" 
                  placeholder="ê²ŒìŠ¤?? 
                  value={guestName} 
                  onChange={e => setGuestName(e.target.value)}
                  style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', width: '100px', fontSize: '13px' }}
                  disabled={!canAccessBoard(userLevel, board?.perm_reply ?? 1)}
                />
              </div>
            )}
          </div>
          <textarea
            style={{ width: '100%', height: '60px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px', resize: 'none', fontSize: '14px', outline: 'none', background: '#fff', color: '#333' }}
            placeholder={canAccessBoard(userLevel, board?.perm_reply ?? 1) ? "?“ê????¨ê²¨ë³´ì„¸??" : "ê¶Œí•œ???†ìŠµ?ˆë‹¤."}
            maxLength={400}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            disabled={!canAccessBoard(userLevel, board?.perm_reply ?? 1)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              onClick={handleCommentSubmit}
              disabled={isSubmitting || !canAccessBoard(userLevel, board?.perm_reply ?? 1)}
              style={{ background: canAccessBoard(userLevel, board?.perm_reply ?? 1) ? '#2563eb' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontWeight: 700, fontSize: '13px' }}
            >
              ?±ë¡
            </button>
          </div>
        </div>
      </div>
      
      {/* List Button */}
      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
        <button onClick={() => router.push(`/m/board?id=${board?.board_id || 'drone'}`)} style={{ padding: '12px 32px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '15px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
          ëª©ë¡?¼ë¡œ
        </button>
      </div>

      <style>{`
        .board-content-html img { max-width: 100%; height: auto; border-radius: 8px; }
        .board-content-html iframe { max-width: 100%; }
        .board-content-html p { margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
