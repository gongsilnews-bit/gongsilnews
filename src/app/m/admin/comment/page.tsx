"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getCommentsOnMyContent, getRepliesOnMyComments } from "@/app/actions/comment";

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
  const [authChecked, setAuthChecked] = useState(false);

  // 삭제(숨김) 처리된 ID
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      setUserId(user.id);
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

  const currentList = (tab === "myContent" ? myContentComments : myReplies).filter(c => !hiddenIds.has(c.id));

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

  const typeLabel = (type: string) => type === "article" ? "기사" : type === "vacancy" ? "공실" : "특강";
  const typeColor = (type: string) => type === "article" ? "#2563eb" : type === "vacancy" ? "#d97706" : "#7c3aed";

  const getLink = (c: CommentItem) => {
    if (c.type === "article") return `/news/${c.sourceId}`;
    if (c.type === "vacancy") return `/gongsil?id=${c.sourceId}`;
    return "#";
  };

  const handleDelete = (id: string) => {
    if (!confirm("이 댓글 알림을 삭제하시겠습니까?")) return;
    setHiddenIds(prev => new Set([...prev, id]));
  };

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
        borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 52,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: "#111", margin: 0 }}>댓글 관리</h1>
        <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
          전체 {currentList.length}건
        </span>
      </div>

      {/* 2탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e5e7eb" }}>
        {[
          { key: "myContent" as const, label: "내 글 댓글", count: myContentComments.filter(c => !hiddenIds.has(c.id)).length },
          { key: "myReplies" as const, label: "내 댓글 답글", count: myReplies.filter(c => !hiddenIds.has(c.id)).length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "12px 0", fontSize: 14, fontWeight: tab === t.key ? 800 : 500,
            border: "none", background: "none", cursor: "pointer",
            color: tab === t.key ? "#111" : "#6b7280",
            borderBottom: tab === t.key ? "2px solid #111" : "2px solid transparent",
            marginBottom: -2,
          }}>
            {t.label}
            <span style={{
              fontSize: 11, fontWeight: 700, marginLeft: 4,
              color: t.count > 0 ? "#ef4444" : "#9ca3af",
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{ padding: "0 0 100px" }}>
        {loading ? (
          <div style={{ padding: 50, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>불러오는 중...</div>
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {tab === "myContent" ? "내 글에 달린 댓글이 없습니다" : "내 댓글에 답글이 없습니다"}
            </div>
          </div>
        ) : currentList.map(c => (
          <div key={c.id} style={{
            background: isNew(c.createdAt) ? "#fefefe" : "#fff",
            borderBottom: "1px solid #f0f0f0",
            padding: "14px 16px",
          }}>
            {/* 상단: 작성자 + 시간 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{c.authorName}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: typeColor(c.type),
                }}>
                  [{typeLabel(c.type)}]
                </span>
                {isNew(c.createdAt) && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "#ef4444", padding: "1px 5px", borderRadius: 4 }}>N</span>
                )}
              </div>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatTime(c.createdAt)}</span>
            </div>

            {/* 내용 */}
            <div style={{ fontSize: 14, color: "#111", lineHeight: 1.5, marginBottom: 6, wordBreak: "break-word" }}>
              {c.isSecret ? "🔒 비밀 댓글입니다" : c.content}
            </div>

            {/* 답글 탭: 내 원댓글 */}
            {tab === "myReplies" && (c as any).myOriginalComment && (
              <div style={{
                fontSize: 12, color: "#6b7280", marginBottom: 6,
                padding: "4px 8px", background: "#f3f4f6", borderRadius: 4,
                borderLeft: "2px solid #d1d5db",
              }}>
                내 댓글: {(c as any).myOriginalComment.length > 40 ? (c as any).myOriginalComment.slice(0, 40) + "..." : (c as any).myOriginalComment}
              </div>
            )}

            {/* 원글 제목 */}
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
              📌 {c.sourceTitle.length > 35 ? c.sourceTitle.slice(0, 35) + "..." : c.sourceTitle}
            </div>

            {/* 보기 / 삭제 버튼 */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => window.open(getLink(c), "_blank")} style={{
                padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                border: "1px solid #93c5fd", background: "#fff", color: "#2563eb",
                cursor: "pointer",
              }}>
                📋 보기
              </button>
              <button onClick={() => handleDelete(c.id)} style={{
                padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                border: "1px solid #fca5a5", background: "#fff", color: "#ef4444",
                cursor: "pointer",
              }}>
                🗑 삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
