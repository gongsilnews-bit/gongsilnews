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

  // 이전글/다음글 이동 등으로 comments가 변경되면 상태를 동기화
  useEffect(() => {
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
      
      // 조회수 증가
      incrementBoardView(post.id);
    }
    checkAuth();
  }, [post.id, serverUserLevel, serverUser]);

  if (isChecking) {
    return <div style={{ padding: 100, textAlign: "center", color: "#666" }}>권한을 확인하는 중입니다...</div>;
  }

  if (board && !canAccessBoard(userLevel, board.perm_read ?? 0)) {
    return (
      <div style={{ padding: '60px 20px', textAlign: "center", backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <h2 style={{ fontSize: 20, color: "#ef4444", marginBottom: 12 }}>{getLevelName(board.perm_read ?? 0)}부터 열람하실 수 있습니다.</h2>
        <p style={{ color: "#666", marginBottom: 24 }}>현재 레벨: {userLevel}레벨</p>
        <button onClick={() => router.back()} style={{ padding: "12px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>뒤로 가기</button>
      </div>
    );
  }

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    
    let authorName = guestName || "게스트";
    if (currentUser) {
      const r = currentUser.role?.toUpperCase() || "";
      if (r === "ADMIN" || r === "최고관리자" || r.includes("관리자")) {
        authorName = "최고관리자";
      } else {
        authorName = currentUser.user_metadata?.full_name || currentUser.name || currentUser.email?.split('@')[0] || "익명";
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
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
    const res = await deleteBoardPost(post.id);
    if (res.success) {
      alert("삭제되었습니다.");
      router.replace(`/m/board?id=${board?.board_id}`);
    } else {
      alert("삭제 실패: " + res.error);
    }
  };

  const ytId = getYoutubeId(post.youtube_url);
  const is1to1 = board?.board_type === "inquiry";

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#fff', height: '54px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '8px', marginLeft: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <BoardDropdownHeader currentBoardName={board?.name || "자료실"} />
        <button onClick={() => router.push('/m/search')} style={{ background: 'none', border: 'none', padding: '8px', marginRight: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px' }}>
        {is1to1 && (
          <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, backgroundColor: (comments && comments.length > 0) ? '#10b981' : '#f3f4f6', color: (comments && comments.length > 0) ? '#fff' : '#6b7280', padding: '4px 10px', borderRadius: '4px', marginBottom: '12px', marginRight: '8px' }}>
            {(comments && comments.length > 0) ? '답변완료' : '답변대기'}
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
              {(post.author_name || "관")[0]}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{post.author_name || "관리자"}</div>
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
          {ytId && (
            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', marginBottom: '24px', borderRadius: '12px', overflow: 'hidden' }}>
              <iframe
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}

          {post.thumbnail_url && !ytId && (
            <div style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden' }}>
              <img src={post.thumbnail_url} alt="thumbnail" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          )}

          <div dangerouslySetInnerHTML={{ __html: post.content }} className="board-content-html" />
        </div>

        {/* Attachment Link */}
        {post.drive_url && (
          <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>첨부파일 다운로드</div>
              <div style={{ fontSize: '12px', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>구글 드라이브 외부 링크</div>
            </div>
            <a href={post.drive_url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              열기
            </a>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ marginTop: '20px', borderTop: '8px solid #f8f9fa' }}>
        {prevPost && (
          <Link href={`/m/board_read?id=${prevPost.id}&board_id=${board?.board_id}`} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', width: '48px', flexShrink: 0 }}>이전글</span>
            <span style={{ fontSize: '15px', color: '#374151', fontWeight: 500, flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{prevPost.title.replace(/^\[([^\]]+)\]\s*/, "")}</span>
          </Link>
        )}
        {nextPost && (
          <Link href={`/m/board_read?id=${nextPost.id}&board_id=${board?.board_id}`} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', width: '48px', flexShrink: 0 }}>다음글</span>
            <span style={{ fontSize: '15px', color: '#374151', fontWeight: 500, flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{nextPost.title.replace(/^\[([^\]]+)\]\s*/, "")}</span>
          </Link>
        )}
      </div>

      {/* 액션 바 (수정/삭제) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px', gap: '8px', marginTop: '16px' }}>
        {(currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'super_admin' || currentUser?.id === post.author_id) && (
          <>
            <Link href={`/m/board_write?board_id=${board?.board_id}&post_id=${post.id}`} style={{ border: '1px solid #d1d5db', background: '#fff', color: '#555', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>수정</Link>
            <button onClick={handleDelete} style={{ border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>삭제</button>
          </>
        )}
      </div>

      {/* 댓글 영역 */}
      <div style={{ marginTop: '24px', borderTop: '8px solid #f8f9fa', padding: '24px 16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#111827' }}>댓글 {localComments.length}개</div>

        {/* 댓글 목록 */}
        <div style={{ marginBottom: '24px' }}>
          {localComments.map((c: any) => (
            <div key={c.id} style={{ padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: '#374151' }}>{c.author_name || '게스트'}</span>
                <span style={{ color: '#9ca3af' }}>{new Date(c.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.content}</div>
            </div>
          ))}
          {localComments.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0', fontSize: '14px' }}>첫 댓글을 남겨보세요!</div>
          )}
        </div>

        {/* 댓글 입력 */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser ? (
              <span>{currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}님</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>이름:</span>
                <input 
                  type="text" 
                  placeholder="게스트" 
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
            placeholder={canAccessBoard(userLevel, board?.perm_reply ?? 1) ? "댓글을 남겨보세요." : "권한이 없습니다."}
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
              등록
            </button>
          </div>
        </div>
      </div>
      
      {/* List Button */}
      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
        <button onClick={() => router.push(`/m/board?id=${board?.board_id || 'drone'}`)} style={{ padding: '12px 32px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '15px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
          목록으로
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
