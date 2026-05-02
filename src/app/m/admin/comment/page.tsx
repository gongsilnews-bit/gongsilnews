"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getCommentsOnMyContent, getRepliesOnMyComments, addReplyToComment } from "@/app/actions/comment";

interface CommentItem {
  id: string;
  type: "article" | "vacancy" | "board";
  sourceId: string;
  sourceTitle: string;
  authorId: string;
  authorName: string;
  content: string;
  isSecret: boolean;
  parentId?: string | null;
  myOriginalComment?: string;
  createdAt: string;
}

export default function MobileCommentPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"myContent" | "myReplies">("myContent");
  const [myContentComments, setMyContentComments] = useState<CommentItem[]>([]);
  const [myReplies, setMyReplies] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  // 답글 상태
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data: m } = await supabase.from("members").select("name").eq("id", user.id).single();
      setUserId(user.id);
      setUserName(m?.name || "사용자");
      setAuthChecked(true);
      await fetchAll(user.id);
    })();
  }, []);

  const fetchAll = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const [contentRes, repliesRes] = await Promise.all([
        getCommentsOnMyContent(uid),
        getRepliesOnMyComments(uid),
      ]);
      if (contentRes.success) setMyContentComments(contentRes.data || []);
      if (repliesRes.success) setMyReplies(repliesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("m-comment-notify")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "article_comments" }, () => fetchAll(userId))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vacancy_comments" }, () => fetchAll(userId))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "board_comments" }, () => fetchAll(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchAll]);

  const handleSendReply = async (comment: CommentItem) => {
    if (!replyText.trim() || !userId) return;
    setSending(true);
    try {
      const res = await addReplyToComment(comment.type, comment.id, comment.sourceId, replyText.trim(), userId, userName);
      if (res.success) {
        setReplyText("");
        setReplyingTo(null);
        await fetchAll(userId);
      } else {
        alert("답글 등록 실패: " + res.error);
      }
    } catch (err: any) {
      alert("오류: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${d.getMonth() + 1}.${d.getDate()}`;
  };

  const isNew = (dateStr: string) => (new Date().getTime() - new Date(dateStr).getTime()) < 86400000;

  const typeIcon = (type: string) => type === "article" ? "📰" : type === "vacancy" ? "🏢" : "📚";
  const typeLabel = (type: string) => type === "article" ? "기사" : type === "vacancy" ? "공실" : "특강";
  const typeColor = (type: string) => type === "article" ? "#2563eb" : type === "vacancy" ? "#d97706" : "#7c3aed";

  const getLink = (c: CommentItem) => {
    if (c.type === "article") return `/news/${c.sourceId}`;
    if (c.type === "vacancy") return `/gongsil?id=${c.sourceId}`;
    return "#";
  };

  const currentList = tab === "myContent" ? myContentComments : myReplies;

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>준비 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 헤더 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: "#fff",
        borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>💬 댓글 관리</h1>
      </div>

      {/* 2탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        {[
          { key: "myContent" as const, label: "📥 내 글 댓글", count: myContentComments.length },
          { key: "myReplies" as const, label: "💬 내 댓글 답글", count: myReplies.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "13px 0", fontSize: 14, fontWeight: tab === t.key ? 800 : 500,
            border: "none", background: "none", cursor: "pointer",
            color: tab === t.key ? "#2563eb" : "#6b7280",
            borderBottom: tab === t.key ? "3px solid #2563eb" : "3px solid transparent",
          }}>
            {t.label}
            <span style={{
              fontSize: 11, fontWeight: 700, marginLeft: 4,
              background: tab === t.key ? "#2563eb" : "#e5e7eb",
              color: tab === t.key ? "#fff" : "#6b7280",
              padding: "2px 7px", borderRadius: 10,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{ padding: "12px 16px 100px" }}>
        {loading ? (
          <div style={{ padding: 50, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>불러오는 중...</div>
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {tab === "myContent" ? "내 글에 달린 댓글이 없습니다" : "내 댓글에 답글이 없습니다"}
            </div>
          </div>
        ) : currentList.map(c => (
          <div key={c.id} style={{
            background: "#fff", borderRadius: 14, marginBottom: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden",
          }}>
            {/* 원글 정보 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              background: "#fafbfc", borderBottom: "1px solid #f3f4f6",
            }}
              onClick={() => window.open(getLink(c), "_blank")}
            >
              <span style={{ fontSize: 16 }}>{typeIcon(c.type)}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: typeColor(c.type),
                background: c.type === "article" ? "#dbeafe" : c.type === "vacancy" ? "#fef3c7" : "#ede9fe",
                padding: "2px 7px", borderRadius: 8,
              }}>{typeLabel(c.type)}</span>
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 700, color: "#111",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{c.sourceTitle}</span>
              {isNew(c.createdAt) && (
                <span style={{
                  fontSize: 9, fontWeight: 800, color: "#fff", background: "#ef4444",
                  padding: "2px 6px", borderRadius: 6,
                }}>NEW</span>
              )}
              <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{formatTime(c.createdAt)}</span>
            </div>

            {/* 댓글 내용 */}
            <div style={{ padding: "12px 14px" }}>
              {/* 내 원댓글 (답글 탭에서만) */}
              {tab === "myReplies" && (c as any).myOriginalComment && (
                <div style={{
                  fontSize: 12, color: "#6b7280", marginBottom: 10,
                  padding: "8px 10px", borderRadius: 8, background: "#f3f4f6",
                  borderLeft: "3px solid #d1d5db",
                }}>
                  <span style={{ fontWeight: 700 }}>내 댓글: </span>
                  {(c as any).myOriginalComment.length > 50
                    ? (c as any).myOriginalComment.slice(0, 50) + "..."
                    : (c as any).myOriginalComment}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#6b7280",
                }}>
                  {c.authorName.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{c.authorName}</span>
                    {c.isSecret && <span style={{ fontSize: 11 }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: 14, color: "#111", lineHeight: 1.6, wordBreak: "break-word" }}>
                    {c.isSecret ? "비밀 댓글입니다" : c.content}
                  </div>
                </div>
              </div>
            </div>

            {/* 답글 영역 */}
            <div style={{ padding: "0 14px 12px" }}>
              {replyingTo === c.id ? (
                <div style={{
                  display: "flex", gap: 8, alignItems: "center",
                  background: "#f8f9fb", borderRadius: 10, padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                }}>
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSendReply(c); } }}
                    placeholder="답글 입력..."
                    autoFocus
                    style={{
                      flex: 1, border: "none", outline: "none", fontSize: 14,
                      background: "transparent", color: "#111", padding: "6px 0",
                    }}
                  />
                  <button
                    onClick={() => handleSendReply(c)}
                    disabled={sending || !replyText.trim()}
                    style={{
                      height: 32, padding: "0 14px", borderRadius: 8, border: "none",
                      background: sending ? "#9ca3af" : "#2563eb",
                      color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: sending ? "not-allowed" : "pointer", flexShrink: 0,
                    }}
                  >
                    {sending ? "..." : "전송"}
                  </button>
                  <button
                    onClick={() => { setReplyingTo(null); setReplyText(""); }}
                    style={{
                      height: 32, padding: "0 10px", borderRadius: 8,
                      border: "1px solid #d1d5db", background: "#fff",
                      color: "#6b7280", fontSize: 13, cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setReplyingTo(c.id); setReplyText(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, color: "#3b82f6", padding: "4px 0",
                  }}
                >
                  💬 답글 달기
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
