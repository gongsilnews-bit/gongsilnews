"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminTheme } from "./types";
import { createClient } from "@/utils/supabase/client";
import { getCommentsOnMyContent, getRepliesOnMyComments } from "@/app/actions/comment";

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

  // 선택 삭제용
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 삭제(숨김) 처리된 ID 목록 (로컬)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
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

  // 탭 변경 시 선택 초기화
  useEffect(() => { setSelectedIds(new Set()); }, [tab]);

  const currentList = (tab === "myContent" ? myContentComments : myReplies).filter(c => !hiddenIds.has(c.id));

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  const isNew = (dateStr: string) => (new Date().getTime() - new Date(dateStr).getTime()) < 86400000;

  const typeLabel = (type: string) => type === "article" ? "기사" : type === "vacancy" ? "공실" : "특강";

  const getLink = (c: CommentItem) => {
    if (c.type === "article") return `/news/${c.sourceId}`;
    if (c.type === "vacancy") return `/gongsil?id=${c.sourceId}`;
    return "#";
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 단일 삭제 (로컬 숨김)
  const handleDelete = (id: string) => {
    if (!confirm("이 댓글 알림을 삭제하시겠습니까?")) return;
    setHiddenIds(prev => new Set([...prev, id]));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  // 선택 삭제
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) { alert("삭제할 항목을 선택해주세요."); return; }
    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) return;
    setHiddenIds(prev => new Set([...prev, ...selectedIds]));
    setSelectedIds(new Set());
  };

  const btnStyle: React.CSSProperties = {
    padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 4,
    border: `1px solid ${darkMode ? "#555" : "#d1d5db"}`, cursor: "pointer",
    background: darkMode ? "#2c2d31" : "#fff", color: textPrimary,
    transition: "all 0.15s", whiteSpace: "nowrap",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: bg }}>
      {/* 헤더 */}
      <div style={{ padding: "20px 28px 0", flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 16px" }}>
          댓글 관리
        </h1>
      </div>

      {/* 2탭 */}
      <div style={{ display: "flex", gap: 0, padding: "0 28px", flexShrink: 0, borderBottom: `2px solid ${darkMode ? "#444" : "#e5e7eb"}` }}>
        {[
          { key: "myContent" as const, label: "📥 내 글에 달린 댓글", count: myContentComments.filter(c => !hiddenIds.has(c.id)).length },
          { key: "myReplies" as const, label: "💬 내 댓글의 답글", count: myReplies.filter(c => !hiddenIds.has(c.id)).length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 20px", fontSize: 14, fontWeight: tab === t.key ? 800 : 500,
            border: "none", background: tab === t.key ? (darkMode ? "#2c2d31" : "#fff") : "none",
            cursor: "pointer", color: tab === t.key ? textPrimary : textSecondary,
            borderBottom: tab === t.key ? `2px solid ${darkMode ? "#fff" : "#111"}` : "2px solid transparent",
            marginBottom: -2, transition: "all 0.2s",
          }}>
            {t.label} <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 4, color: textSecondary }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* 테이블 리스트 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: textSecondary }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>댓글을 불러오는 중...</div>
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: textSecondary }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {tab === "myContent" ? "내 글에 달린 댓글이 없습니다" : "내 댓글에 달린 답글이 없습니다"}
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, background: darkMode ? "#1e1f23" : "#f9fafb" }}>
                <th style={{ padding: "12px 8px", width: 40, textAlign: "center" }}>
                  <input type="checkbox" checked={selectedIds.size === currentList.length && currentList.length > 0}
                    onChange={toggleSelectAll} style={{ cursor: "pointer", width: 16, height: 16 }} />
                </th>
                <th style={{ padding: "12px 12px", textAlign: "left", fontWeight: 700, color: textPrimary, width: 140 }}>아이디</th>
                <th style={{ padding: "12px 12px", textAlign: "left", fontWeight: 700, color: textPrimary }}>내용</th>
                <th style={{ padding: "12px 12px", textAlign: "center", fontWeight: 700, color: textPrimary, width: 180 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {currentList.map(c => (
                <tr key={c.id} style={{
                  borderBottom: `1px solid ${darkMode ? "#333" : "#f0f0f0"}`,
                  background: isNew(c.createdAt) ? (darkMode ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.03)") : "transparent",
                  transition: "background 0.15s",
                }}>
                  {/* 체크박스 */}
                  <td style={{ padding: "14px 8px", textAlign: "center", verticalAlign: "top" }}>
                    <input type="checkbox" checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      style={{ cursor: "pointer", width: 16, height: 16 }} />
                  </td>
                  {/* 아이디 */}
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>{c.authorName}</span>
                      {isNew(c.createdAt) && (
                        <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "#ef4444", padding: "1px 5px", borderRadius: 4 }}>N</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: c.type === "article" ? "#2563eb" : c.type === "vacancy" ? "#d97706" : "#7c3aed",
                      }}>
                        [{typeLabel(c.type)}]
                      </span>
                    </div>
                  </td>
                  {/* 내용 */}
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <div style={{ fontSize: 12, color: textSecondary, marginBottom: 3 }}>
                      {formatTime(c.createdAt)}
                    </div>
                    <div style={{ fontSize: 14, color: textPrimary, lineHeight: 1.5, wordBreak: "break-word" }}>
                      {c.isSecret ? "🔒 비밀 댓글입니다" : c.content}
                    </div>
                    {/* 답글 탭: 내 원댓글 표시 */}
                    {tab === "myReplies" && (c as any).myOriginalComment && (
                      <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, padding: "4px 8px", background: darkMode ? "#2a2b30" : "#f3f4f6", borderRadius: 4, borderLeft: `2px solid ${darkMode ? "#555" : "#d1d5db"}` }}>
                        내 댓글: {(c as any).myOriginalComment.length > 50 ? (c as any).myOriginalComment.slice(0, 50) + "..." : (c as any).myOriginalComment}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                      📌 {c.sourceTitle.length > 40 ? c.sourceTitle.slice(0, 40) + "..." : c.sourceTitle}
                    </div>
                  </td>
                  {/* 관리 버튼 */}
                  <td style={{ padding: "14px 12px", textAlign: "center", verticalAlign: "top" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => window.open(getLink(c), "_blank")} style={{ ...btnStyle, color: "#2563eb", borderColor: "#93c5fd" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fff"; }}>
                        📋 보기
                      </button>
                      <button onClick={() => handleDelete(c.id)} style={{ ...btnStyle, color: "#ef4444", borderColor: "#fca5a5" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fff"; }}>
                        🗑 삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 하단: 선택삭제 */}
      {currentList.length > 0 && (
        <div style={{
          padding: "12px 28px", borderTop: `1px solid ${border}`, flexShrink: 0,
          display: "flex", justifyContent: "flex-end",
        }}>
          <button onClick={handleBulkDelete} style={{
            padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 6,
            border: `1px solid ${darkMode ? "#555" : "#d1d5db"}`,
            background: darkMode ? "#2c2d31" : "#fff", color: textPrimary,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = darkMode ? "#374151" : "#f3f4f6"; }}
            onMouseLeave={e => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fff"; }}>
            ✓ 선택삭제 {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>
      )}
    </div>
  );
}
