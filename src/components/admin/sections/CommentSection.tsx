"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminTheme } from "./types";
import { createClient } from "@/utils/supabase/client";
import { getCommentsOnMyContent, getRepliesOnMyComments, addReplyToComment } from "@/app/actions/comment";

interface CommentSectionProps {
  theme: AdminTheme;
  role: "admin" | "realtor" | "user";
  memberId?: string;
}

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

export default function CommentSection({ theme, role, memberId }: CommentSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [tab, setTab] = useState<"myContent" | "myReplies">("myContent");
  const [myContentComments, setMyContentComments] = useState<CommentItem[]>([]);
  const [myReplies, setMyReplies] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");

  // 답글 입력 상태
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // 유저 정보 & 데이터 로드
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("members").select("name").eq("id", user.id).single();
      setUserId(user.id);
      setUserName(m?.name || "관리자");
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

  // Realtime 구독
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("comment-notify-v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "article_comments" }, () => fetchAll(userId))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vacancy_comments" }, () => fetchAll(userId))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "board_comments" }, () => fetchAll(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchAll]);

  // 답글 전송
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

  // 시간 포맷
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  const isNew = (dateStr: string) => {
    return (new Date().getTime() - new Date(dateStr).getTime()) < 86400000;
  };

  const typeIcon = (type: string) => type === "article" ? "📰" : type === "vacancy" ? "🏢" : "📚";
  const typeLabel = (type: string) => type === "article" ? "기사" : type === "vacancy" ? "공실" : "특강";
  const typeColor = (type: string) => type === "article" ? "#2563eb" : type === "vacancy" ? "#d97706" : "#7c3aed";
  const typeBg = (type: string) => type === "article" ? "#dbeafe" : type === "vacancy" ? "#fef3c7" : "#ede9fe";

  const getLink = (c: CommentItem) => {
    if (c.type === "article") return `/news/${c.sourceId}`;
    if (c.type === "vacancy") return `/gongsil?id=${c.sourceId}`;
    return "#";
  };

  const currentList = tab === "myContent" ? myContentComments : myReplies;

  const renderCommentCard = (c: CommentItem) => (
    <div key={c.id} style={{
      background: cardBg, borderRadius: 14, border: `1px solid ${border}`,
      marginBottom: 10, overflow: "hidden", transition: "box-shadow 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      {/* 상단: 원글 정보 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 18px",
        borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`,
        background: darkMode ? "#1e1f23" : "#fafbfc",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 15,
          background: typeBg(c.type), flexShrink: 0,
        }}>
          {typeIcon(c.type)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: typeColor(c.type),
              background: darkMode ? "rgba(255,255,255,0.06)" : typeBg(c.type),
              padding: "2px 8px", borderRadius: 10,
            }}>
              {typeLabel(c.type)}
            </span>
            <span
              onClick={() => window.open(getLink(c), "_blank")}
              style={{
                fontSize: 13, fontWeight: 700, color: textPrimary, cursor: "pointer",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
              title={c.sourceTitle}
            >
              {c.sourceTitle}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {isNew(c.createdAt) && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: "#fff", background: "#ef4444",
              padding: "2px 7px", borderRadius: 8, letterSpacing: 0.5,
            }}>NEW</span>
          )}
          <span style={{ fontSize: 11, color: textSecondary }}>{formatTime(c.createdAt)}</span>
        </div>
      </div>

      {/* 중앙: 댓글 내용 */}
      <div style={{ padding: "14px 18px" }}>
        {/* 내 댓글 답글 탭에서: 내 원댓글 표시 */}
        {tab === "myReplies" && (c as any).myOriginalComment && (
          <div style={{
            fontSize: 12, color: textSecondary, marginBottom: 10,
            padding: "8px 12px", borderRadius: 8,
            background: darkMode ? "#2a2b30" : "#f0f1f3",
            borderLeft: `3px solid ${darkMode ? "#555" : "#d1d5db"}`,
          }}>
            <span style={{ fontWeight: 700, marginRight: 6 }}>내 댓글:</span>
            {(c as any).myOriginalComment.length > 60
              ? (c as any).myOriginalComment.slice(0, 60) + "..."
              : (c as any).myOriginalComment}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {/* 작성자 아바타 */}
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: darkMode ? "#374151" : "#e5e7eb",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: textSecondary,
          }}>
            {c.authorName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{c.authorName}</span>
              {c.isSecret && <span style={{ fontSize: 11 }}>🔒</span>}
            </div>
            <div style={{ fontSize: 14, color: textPrimary, lineHeight: 1.6, wordBreak: "break-word" }}>
              {c.isSecret ? "비밀 댓글입니다" : c.content}
            </div>
          </div>
        </div>
      </div>

      {/* 하단: 답글 영역 */}
      <div style={{ padding: "0 18px 14px" }}>
        {replyingTo === c.id ? (
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            background: darkMode ? "#1a1b1e" : "#f8f9fb",
            borderRadius: 10, padding: "8px 12px",
            border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
          }}>
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(c); } }}
              placeholder="답글을 입력하세요..."
              autoFocus
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 14,
                background: "transparent", color: textPrimary, padding: "6px 0",
              }}
            />
            <button
              onClick={() => handleSendReply(c)}
              disabled={sending || !replyText.trim()}
              style={{
                height: 34, padding: "0 16px", borderRadius: 8, border: "none",
                background: sending ? "#9ca3af" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              {sending ? "..." : "전송"}
            </button>
            <button
              onClick={() => { setReplyingTo(null); setReplyText(""); }}
              style={{
                height: 34, padding: "0 10px", borderRadius: 8, border: `1px solid ${border}`,
                background: "transparent", color: textSecondary, fontSize: 13, cursor: "pointer",
                flexShrink: 0,
              }}
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setReplyingTo(c.id); setReplyText(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: "#3b82f6",
              padding: "4px 0",
            }}
          >
            💬 답글 달기
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: bg }}>
      {/* 헤더 */}
      <div style={{ padding: "24px 28px 16px", flexShrink: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: textPrimary, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>💬</span>
          댓글 관리
        </h1>
        <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>
          내 콘텐츠에 달린 댓글을 확인하고 바로 답글을 달 수 있습니다
        </p>
      </div>

      {/* 2탭 */}
      <div style={{ display: "flex", gap: 0, padding: "0 28px", flexShrink: 0, borderBottom: `1px solid ${border}` }}>
        {[
          { key: "myContent" as const, label: "📥 내 글에 달린 댓글", count: myContentComments.length },
          { key: "myReplies" as const, label: "💬 내 댓글의 답글", count: myReplies.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "12px 20px", fontSize: 14, fontWeight: tab === t.key ? 800 : 500,
            border: "none", background: "none", cursor: "pointer",
            color: tab === t.key ? "#2563eb" : textSecondary,
            borderBottom: tab === t.key ? "3px solid #2563eb" : "3px solid transparent",
            transition: "all 0.2s",
          }}>
            {t.label} <span style={{
              fontSize: 12, fontWeight: 700, marginLeft: 4,
              background: tab === t.key ? "#2563eb" : (darkMode ? "#374151" : "#e5e7eb"),
              color: tab === t.key ? "#fff" : textSecondary,
              padding: "2px 8px", borderRadius: 10,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px 24px" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: textSecondary }}>
            <div style={{ fontSize: 28, marginBottom: 12, animation: "pulse 1.5s infinite" }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>댓글을 불러오는 중...</div>
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: textSecondary }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {tab === "myContent" ? "내 글에 달린 댓글이 없습니다" : "내 댓글에 달린 답글이 없습니다"}
            </div>
            <div style={{ fontSize: 13 }}>
              {tab === "myContent" ? "기사, 공실, 특강을 등록하면 댓글 알림을 받을 수 있습니다" : "댓글을 달면 답글 알림을 받을 수 있습니다"}
            </div>
          </div>
        ) : (
          currentList.map(c => renderCommentCard(c))
        )}
      </div>
    </div>
  );
}
