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

  const [checkedIds, setCheckedIds] = useState<string[]>([]);
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

  // Realtime
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

  useEffect(() => { setCheckedIds([]); }, [tab]);

  const currentList = (tab === "myContent" ? myContentComments : myReplies).filter(c => !hiddenIds.has(c.id));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const isNew = (dateStr: string) => (new Date().getTime() - new Date(dateStr).getTime()) < 86400000;

  const typeLabel = (type: string) => type === "article" ? "기사" : type === "vacancy" ? "공실" : "특강";
  const typeBadgeColor = (type: string) => type === "article" ? "#2563eb" : type === "vacancy" ? "#d97706" : "#7c3aed";

  const getLink = (c: CommentItem) => {
    if (c.type === "article") return `/news/${c.sourceId}`;
    if (c.type === "vacancy") return `/gongsil?id=${c.sourceId}`;
    return "#";
  };

  const handleDelete = (id: string) => {
    if (!confirm("이 댓글 알림을 삭제하시겠습니까?")) return;
    setHiddenIds(prev => new Set([...prev, id]));
    setCheckedIds(prev => prev.filter(cid => cid !== id));
  };

  const handleBulkDelete = () => {
    if (checkedIds.length === 0) { alert("삭제할 항목을 선택해주세요."); return; }
    if (!confirm(`선택한 ${checkedIds.length}개 항목을 삭제하시겠습니까?`)) return;
    setHiddenIds(prev => new Set([...prev, ...checkedIds]));
    setCheckedIds([]);
  };

  const thStyle: React.CSSProperties = {
    padding: "14px 12px", textAlign: "center", fontWeight: 700, fontSize: 14,
    color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: "18px 12px", verticalAlign: "middle",
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>댓글 관리</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( 전체 {myContentComments.filter(c => !hiddenIds.has(c.id)).length + myReplies.filter(c => !hiddenIds.has(c.id)).length}건 )
        </span>
      </div>

      {/* 카드 컨테이너 */}
      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>

        {/* 필터 탭 (기사관리와 동일 스타일) */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {[
            { key: "myContent" as const, label: "내 글에 달린 댓글", count: myContentComments.filter(c => !hiddenIds.has(c.id)).length },
            { key: "myReplies" as const, label: "내 댓글의 답글", count: myReplies.filter(c => !hiddenIds.has(c.id)).length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              border: "none", background: "none", padding: "16px 20px", fontSize: 14,
              fontWeight: tab === t.key ? 800 : 600,
              color: tab === t.key ? "#3b82f6" : textSecondary,
              borderBottom: tab === t.key ? "3px solid #3b82f6" : "3px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              {t.label}
              <span style={{
                background: t.count > 0 ? "#3b82f6" : "#e5e7eb",
                color: t.count > 0 ? "#fff" : "#4b5563",
                padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleBulkDelete} style={{
            height: 36, padding: "0 16px",
            background: darkMode ? "#2c2d31" : "#fff", color: textPrimary,
            border: `1px solid ${border}`, borderRadius: 6,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            선택삭제 {checkedIds.length > 0 && `(${checkedIds.length})`}
          </button>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 700 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ ...thStyle, width: 40 }}>
                  <input type="checkbox" style={{ accentColor: "#3b82f6", width: 16, height: 16 }}
                    checked={checkedIds.length === currentList.length && currentList.length > 0}
                    onChange={e => setCheckedIds(e.target.checked ? currentList.map(c => c.id) : [])} />
                </th>
                <th style={{ ...thStyle, width: 140, textAlign: "left" }}>아이디</th>
                <th style={{ ...thStyle, textAlign: "left" }}>내용</th>
                <th style={{ ...thStyle, width: 180 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 60, textAlign: "center", color: textSecondary, fontSize: 15 }}>댓글을 불러오는 중...</td></tr>
              ) : currentList.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 60, textAlign: "center", color: textSecondary, fontSize: 15 }}>조회된 댓글이 없습니다.</td></tr>
              ) : currentList.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                  {/* 체크박스 */}
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <input type="checkbox" style={{ accentColor: "#3b82f6", width: 16, height: 16 }}
                      checked={checkedIds.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) setCheckedIds(prev => [...prev, c.id]);
                        else setCheckedIds(prev => prev.filter(id => id !== c.id));
                      }} />
                  </td>

                  {/* 아이디 */}
                  <td style={{ ...tdStyle, verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{c.authorName}</span>
                      {isNew(c.createdAt) && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "#ef4444", padding: "2px 6px", borderRadius: 4 }}>N</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: typeBadgeColor(c.type),
                      background: darkMode ? "rgba(255,255,255,0.06)" : `${typeBadgeColor(c.type)}10`,
                      padding: "2px 8px", borderRadius: 4, display: "inline-block", marginTop: 2,
                    }}>
                      {typeLabel(c.type)}
                    </span>
                  </td>

                  {/* 내용 */}
                  <td style={{ ...tdStyle, verticalAlign: "top" }}>
                    <div style={{ fontSize: 13, color: textSecondary, marginBottom: 4 }}>
                      {formatDate(c.createdAt)}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary, lineHeight: 1.6, wordBreak: "break-word", marginBottom: 6 }}>
                      {c.isSecret ? "🔒 비밀 댓글입니다" : c.content}
                    </div>
                    {/* 답글 탭: 내 원댓글 표시 */}
                    {tab === "myReplies" && (c as any).myOriginalComment && (
                      <div style={{
                        fontSize: 13, color: textSecondary, marginBottom: 6,
                        padding: "6px 10px", background: darkMode ? "#2a2b30" : "#f3f4f6",
                        borderRadius: 6, borderLeft: `3px solid ${darkMode ? "#555" : "#d1d5db"}`,
                      }}>
                        <span style={{ fontWeight: 700, color: textPrimary }}>내 댓글:</span>{" "}
                        {(c as any).myOriginalComment.length > 60 ? (c as any).myOriginalComment.slice(0, 60) + "..." : (c as any).myOriginalComment}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: textSecondary }}>
                      📌 {c.sourceTitle.length > 50 ? c.sourceTitle.slice(0, 50) + "..." : c.sourceTitle}
                    </div>
                  </td>

                  {/* 관리 버튼 */}
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button onClick={() => window.open(getLink(c), "_blank")} style={{
                        width: 76, height: 32, padding: 0, justifyContent: "center",
                        background: darkMode ? "#1e293b" : "#fff",
                        color: darkMode ? "#93c5fd" : "#2563eb",
                        border: `1px solid ${darkMode ? "#334155" : "#bfdbfe"}`,
                        borderRadius: 4, fontSize: 13, fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 4,
                        cursor: "pointer",
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        보기
                      </button>
                      <button onClick={() => handleDelete(c.id)} style={{
                        width: 76, height: 32, padding: 0, justifyContent: "center",
                        background: darkMode ? "#2c2d31" : "#fff",
                        color: "#9ca3af",
                        border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
                        borderRadius: 4, fontSize: 13, fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 4,
                        cursor: "pointer",
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
