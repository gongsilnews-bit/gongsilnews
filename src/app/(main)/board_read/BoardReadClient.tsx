"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { saveBoardComment, deleteBoardComment, deleteBoardPost } from "@/app/actions/board";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getPermissionLevel, canAccessBoard } from "@/utils/permissionCheck";

// YouTube URL에서 embed URL 생성 (공유버튼 ?si= 등 모든 형식)
function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? `https://www.youtube.com/embed/${match[1]}?vq=hd1080&rel=0` : null;
}

export default function BoardReadClient({
  post,
  board,
  comments: initialComments,
  prevPost,
  nextPost,
}: {
  post: any;
  board: any;
  comments: any[];
  prevPost: any;
  nextPost: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardId = board?.board_id || post?.board_id || "";
  const boardName = board?.name || "게시판";
  const tabs = board?.categories ? ["전체", ...board.categories.split(",").map((c: string) => c.trim())] : ["전체"];

  const pageParam = searchParams.get('page') || '1';
  const tabParam = searchParams.get('tab') || '전체';
  const listUrl = `/board?id=${boardId}&page=${pageParam}&tab=${encodeURIComponent(tabParam)}`;

  const getReadUrl = (targetPostId: string) => {
    return `/board_read?id=${targetPostId}&board_id=${boardId}&page=${pageParam}&tab=${encodeURIComponent(tabParam)}`;
  };

  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLevel, setUserLevel] = useState<number>(0);
  const [isLevelChecking, setIsLevelChecking] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('members').select('role, plan_type').eq('id', user.id).single();
        if (data) {
          setCurrentUser({ ...user, role: data.role });
          setUserLevel(getPermissionLevel(data));
        }
      }
      setIsLevelChecking(false);
    };
    fetchUser();
  }, []);

  // 카테고리 뱃지 추출
  const catMatch = post.title.match(/^\[([^\]]+)\]/);
  const catBadge = catMatch ? catMatch[0] : null;
  const cleanTitle = catBadge ? post.title.replace(catBadge, "").trim() : post.title;

  const createdAt = new Date(post.created_at).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });

  // 다중 외부 링크 파싱 보완
  const externalLinks = (() => {
    let links: any[] = [];
    try {
      if (post.external_url && post.external_url.startsWith("[")) {
        links = JSON.parse(post.external_url);
      }
    } catch(e) {}
    
    // 이전 버전 호환 (단일 링크 지원 유지)
    if (links.length === 0) {
      if (post.youtube_url) links.push({ id: "legacy_yt", type: "YOUTUBE", label: "유튜브 영상", url: post.youtube_url });
      if (post.drive_url) links.push({ id: "legacy_dr", type: "DRIVE", label: "구글 드라이브 다운로드", url: post.drive_url });
      if (post.external_url && !post.external_url.startsWith("[")) links.push({ id: "legacy_ex", type: "LINK", label: "외부 링크", url: post.external_url });
    }
    return links;
  })();

  const ytLinks = externalLinks.filter((l: any) => l.type === "YOUTUBE");
  const driveLinks = externalLinks.filter((l: any) => l.type === "DRIVE");
  const otherLinks = externalLinks.filter((l: any) => l.type === "LINK");
  
  const driveEmbedUrl = (url: string) => {
    if (!url) return null;
    const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    
    const authorName = currentUser 
      ? currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]
      : guestName || "게스트";

    const res = await saveBoardComment({
      post_id: post.id,
      author_id: currentUser?.id,
      author_name: authorName,
      content: commentText,
    });
    if (res.success) {
      setComments([...comments, {
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
      router.push(`/board?id=${boardId}`);
    } else {
      alert("삭제 실패: " + res.error);
    }
  };

  if (isLevelChecking) {
    return <div style={{ padding: 100, textAlign: "center", color: "#666" }}>권한을 확인하는 중입니다...</div>;
  }

  if (board && !canAccessBoard(userLevel, board.perm_read ?? 0)) {
    return (
      <div style={{ padding: 100, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, color: "#ef4444", marginBottom: 12 }}>접근 권한이 없습니다</h2>
        <p style={{ color: "#666" }}>읽기 레벨: <strong>{board.perm_read ?? 0}레벨 이상</strong> (현재 내 레벨: {userLevel}레벨)</p>
        <button onClick={() => router.push(listUrl)} style={{ marginTop: 24, padding: "10px 24px", background: "#333", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>목록으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
      {/* 게시판 헤더 */}
      <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #222", paddingBottom: 15, marginBottom: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#102c57" }}>
          {boardName}
          <span style={{ fontSize: 16, fontWeight: 500, color: "#666", marginLeft: 10 }}>(자료실)</span>
        </div>
        <div style={{ display: "flex", border: "1px solid #ccc", borderRadius: 4, overflow: "hidden" }}>
          <input type="text" placeholder="제목 검색" style={{ border: "none", padding: "8px 12px", outline: "none", width: 200, fontSize: 14 }} />
          <button style={{ background: "#f8f9fa", borderLeft: "1px solid #ccc", padding: "0 14px", fontWeight: "bold", color: "#555" }}>검색</button>
        </div>
      </div>

      {/* 탭 */}
      {tabs.length > 1 && (
        <div style={{ display: "flex", gap: 10, marginTop: 20, marginBottom: 0, flexWrap: "wrap" }}>
          {tabs.map((tab, i) => (
            <Link
              key={tab}
              href={`/board?id=${boardId}`}
              style={{
                border: "1px solid #ddd", background: "#fff", padding: "8px 16px",
                borderRadius: 20, fontSize: 14, color: "#666", fontWeight: 600,
                textDecoration: "none", whiteSpace: "nowrap",
              }}
            >{tab}</Link>
          ))}
        </div>
      )}

      {/* 본문 영역 */}
      <div style={{ display: "flex", gap: 40, marginTop: 20, marginBottom: 60 }}>
        {/* 좌측 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 브레드크럼 */}
          <div style={{ fontSize: 14, color: "#999", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/" style={{ color: "#999", textDecoration: "none" }}>홈</Link>
            <span style={{ color: "#ccc" }}>›</span>
            <Link href={listUrl} style={{ color: "#999", textDecoration: "none" }}>자료실</Link>
            <span style={{ color: "#ccc" }}>›</span>
            <span style={{ color: "#333", fontWeight: 600 }}>{boardName}</span>
          </div>

          {/* 게시글 카드 */}
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e0e0e0", borderTop: "3px solid #102c57", overflow: "hidden", marginBottom: 12 }}>
            {/* 제목 영역 */}
            <div style={{ padding: "28px 32px 24px", borderBottom: "1px solid #f0f0f0" }}>
              {catBadge && (
                <div style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: "#508bf5", background: "rgba(80,139,245,0.1)", borderRadius: 4, padding: "4px 10px", marginBottom: 12 }}>
                  {catBadge}
                </div>
              )}
              <div style={{ fontSize: 24, fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: 16 }}>
                {cleanTitle}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#888" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#444" }}>{post.author_name || "관리자"}</span>
                  <span>{createdAt}</span>
                </div>
                <span>조회수 <strong>{post.view_count || 0}</strong></span>
              </div>
            </div>

            {/* 본문 */}
            <div style={{ padding: "32px" }}>
              {/* 썸네일 노출 (최상단) */}
              {post.thumbnail_url && (
                <div style={{ marginBottom: 28, textAlign: "center" }}>
                  <img src={post.thumbnail_url} alt="썸네일" style={{ maxWidth: "100%", borderRadius: 8 }} />
                </div>
              )}

              {/* 다중 외부 링크를 등록된 순서대로 모두 노출 */}
              {externalLinks.map((link: any, idx: number) => {
                // 사용자 입력 실수 방지: URL 기반 자동 타입 유추
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
                    <div key={link.id || idx} style={{ marginBottom: 28, position: "relative", paddingTop: "56.25%", height: 0, overflow: "hidden", background: "#000", borderRadius: 8 }}>
                      <iframe
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                        src={embedUrl}
                        allowFullScreen
                        title={link.label || "YouTube 영상"}
                      />
                    </div>
                  );
                } else if (resolvedType === "DRIVE") {
                  const embedUrl = driveEmbedUrl(link.url);
                  return (
                    <div key={link.id || idx} style={{ marginBottom: 28 }}>
                      {/* 구글 드라이브 미리보기 (있으면) */}
                      {embedUrl && (
                        <div style={{ marginBottom: 20, position: "relative", paddingTop: "56.25%", height: 0, overflow: "hidden", background: "#000", borderRadius: 8 }}>
                          <iframe
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                            src={embedUrl}
                            allow="autoplay"
                            allowFullScreen
                            title="Google Drive 영상"
                          />
                        </div>
                      )}
                      {/* 다운로드 버튼 */}
                      <div style={{
                        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                        padding: "16px 24px", display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: 20
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>{link.label || "구글 드라이브 자료 다운로드"}</div>
                          <div style={{ fontSize: 13, color: "#64748b" }}>이 게시물에 관련된 구글 드라이브 파일을 다운로드합니다.</div>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: "#508bf5", color: "#fff", padding: "11px 22px",
                            borderRadius: 6, fontSize: 14, fontWeight: 700,
                            textDecoration: "none", whiteSpace: "nowrap"
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          구글 드라이브 다운로드
                        </a>
                      </div>
                    </div>
                  );
                } else if (resolvedType === "LINK") {
                  return (
                    <div key={link.id || idx} style={{ marginBottom: 28 }}>
                      <div style={{
                        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                        padding: "16px 24px", display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: 20
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>{link.label || "외부 데이터 링크"}</div>
                          <div style={{ fontSize: 13, color: "#64748b" }}>게시된 외부 링크 자료로 연결합니다.</div>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: "#f8fafc", border: "1px solid #e2e8f0", color: "#333",
                            padding: "11px 22px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                            textDecoration: "none", whiteSpace: "nowrap"
                          }}
                        >
                          🔗 외부 링크 방문
                        </a>
                      </div>
                    </div>
                  );
                }
                return null;
              })}

              {/* 내용 */}
              {post.content && (
                <div style={{ fontSize: 16, lineHeight: 1.8, color: "#333", marginBottom: 28, whiteSpace: "pre-wrap" }}>
                  {post.content}
                </div>
              )}

              {/* 첨부파일 목록 */}
              {post.board_attachments && post.board_attachments.length > 0 && (
                <div style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "16px 20px", marginTop: 20, marginBottom: 10
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    첨부파일 ({post.board_attachments.length}개)
                  </div>
                  {post.board_attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
                        borderTop: "1px solid #e2e8f0", fontSize: 14, color: "#508bf5",
                        textDecoration: "none",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span>{att.file_name}</span>
                      {att.file_size && <span style={{ color: "#94a3b8", fontSize: 12 }}>({(att.file_size / 1024).toFixed(0)}KB)</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 이전/다음글 */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", minHeight: 52 }}>
              <div style={{ width: 90, flexShrink: 0, background: "#fafafa", borderRight: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#555" }}>▲ 이전글</div>
              <div style={{ flex: 1, padding: "14px 20px", fontSize: 14, color: prevPost ? "#333" : "#bbb", display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: prevPost ? "pointer" : "default" }}>
                {prevPost ? (
                  <Link href={getReadUrl(prevPost.id)} style={{ color: "#333", textDecoration: "none" }}>
                    {prevPost.title}
                  </Link>
                ) : "이전 게시글이 없습니다."}
              </div>
            </div>
            <div style={{ display: "flex", minHeight: 52 }}>
              <div style={{ width: 90, flexShrink: 0, background: "#fafafa", borderRight: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#555" }}>▼ 다음글</div>
              <div style={{ flex: 1, padding: "14px 20px", fontSize: 14, color: nextPost ? "#333" : "#bbb", display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: nextPost ? "pointer" : "default" }}>
                {nextPost ? (
                  <Link href={getReadUrl(nextPost.id)} style={{ color: "#333", textDecoration: "none" }}>
                    {nextPost.title}
                  </Link>
                ) : "다음 게시글이 없습니다."}
              </div>
            </div>
          </div>

          {/* 액션 바 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", padding: "10px 18px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>신고</button>
              <button style={{ border: "1px solid #e5e7eb", background: "#f9fafb", color: "#555", padding: "10px 18px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>차단</button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link href={listUrl} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#555", padding: "10px 22px", borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>목록</Link>
              {(currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'super_admin' || currentUser?.id === post.author_id) && (
                <>
                  <Link href={`/board_write?board_id=${boardId}&post_id=${post.id}`} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#555", padding: "10px 18px", borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>수정</Link>
                  <button onClick={handleDelete} style={{ border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", padding: "10px 18px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>삭제</button>
                </>
              )}
              {canAccessBoard(userLevel, board?.perm_write ?? 5) && (
                <Link href={`/board_write?board_id=${boardId}`} style={{ background: "#102c57", color: "#fff", padding: "10px 24px", borderRadius: 6, fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>글쓰기</Link>
              )}
            </div>
          </div>

          {/* 댓글 */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, padding: "28px 32px" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: "#111" }}>{comments.length}개의 댓글</div>

            {/* 댓글 입력 */}
            {canAccessBoard(userLevel, board?.perm_reply ?? 1) ? (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  {currentUser ? (currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]) : "게스트"}님
                </div>
                <textarea
                  style={{ width: "100%", height: 80, border: "none", resize: "none", fontSize: 15, outline: "none", background: "transparent", color: "#333", fontFamily: "inherit", boxSizing: "border-box" }}
                  placeholder="게시물에 대한 의견을 남겨보세요. 바르고 고운 말을 사용해주세요."
                  maxLength={400}
                  value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{commentText.length} / 400</span>
                <button
                  onClick={handleCommentSubmit}
                  disabled={isSubmitting}
                  style={{ background: "#111", color: "#fff", border: "none", borderRadius: 6, padding: "9px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  댓글 등록
                </button>
              </div>
            </div>
            ) : null}

            {/* 댓글 목록 */}
            {comments.map((c: any) => (
              <div key={c.id} style={{ paddingTop: 16, paddingBottom: 16, borderTop: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: "#374151" }}>{c.author_name || "게스트"}</span>
                  <span style={{ color: "#9ca3af" }}>{new Date(c.created_at).toLocaleString("ko-KR")}</span>
                </div>
                <div style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.content}</div>
              </div>
            ))}
            {comments.length === 0 && (
              <div style={{ textAlign: "center", color: "#ccc", padding: "20px 0", fontSize: 14 }}>첫 댓글을 남겨보세요!</div>
            )}
          </div>
        </div>

        {/* 우측 사이드바 */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ width: "100%", height: 200, background: "#e2e2e2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold", color: "#888", marginBottom: 24 }}>배너 1</div>
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              인기 게시물
              <span style={{ fontSize: 12, color: "#888", fontWeight: "normal", cursor: "pointer" }}>더보기</span>
            </div>
            <div style={{ fontSize: 13, color: "#ccc", textAlign: "center" }}>불러오는 중...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
