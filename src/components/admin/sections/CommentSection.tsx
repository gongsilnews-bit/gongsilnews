"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminTheme } from "./types";
import { createClient } from "@/utils/supabase/client";

interface CommentSectionProps {
  theme: AdminTheme;
  role: "admin" | "realtor" | "user";
  memberId?: string;
}

interface CommentNotification {
  id: string;
  type: "article" | "vacancy";
  sourceTitle: string;
  authorName: string;
  content: string;
  isSecret: boolean;
  createdAt: string;
  sourceId: string;
}

export default function CommentSection({ theme, role, memberId }: CommentSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [comments, setComments] = useState<CommentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "article" | "vacancy">("all");

  // 댓글 조회
  const fetchComments = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const supabase = createClient();

      // 기사 댓글
      const { data: articleComments } = await supabase
        .from("article_comments")
        .select("id, article_id, author_name, content, is_secret, created_at, articles!inner(title)")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);

      // 매물 댓글
      const { data: vacancyComments } = await supabase
        .from("vacancy_comments")
        .select("id, vacancy_id, author_name, content, is_secret, created_at, vacancies!inner(title)")
        .order("created_at", { ascending: false })
        .limit(50);

      const mapped: CommentNotification[] = [
        ...(articleComments || []).map((c: any) => ({
          id: `article_${c.id}`,
          type: "article" as const,
          sourceTitle: c.articles?.title || "(삭제된 기사)",
          authorName: c.author_name || "익명",
          content: c.content,
          isSecret: c.is_secret || false,
          createdAt: c.created_at,
          sourceId: c.article_id,
        })),
        ...(vacancyComments || []).map((c: any) => ({
          id: `vacancy_${c.id}`,
          type: "vacancy" as const,
          sourceTitle: c.vacancies?.title || "(삭제된 매물)",
          authorName: c.author_name || "익명",
          content: c.content,
          isSecret: c.is_secret || false,
          createdAt: c.created_at,
          sourceId: c.vacancy_id,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setComments(mapped);
    } catch (err) {
      console.error("댓글 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Realtime 구독
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("comment-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "article_comments" }, () => fetchComments(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vacancy_comments" }, () => fetchComments(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchComments]);

  const filtered = filter === "all" ? comments : comments.filter(c => c.type === filter);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) {
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h >= 12 ? "오후" : "오전"} ${h > 12 ? h - 12 : h}:${m}`;
    }
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  const getLink = (c: CommentNotification) => {
    if (c.type === "article") return `/news/${c.sourceId}`;
    return `/gongsil?id=${c.sourceId}`;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: bg }}>
      {/* 헤더 */}
      <div style={{ padding: "20px 28px 16px", flexShrink: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: textPrimary, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>💬</span>
          댓글 알림
          <span style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginLeft: 8 }}>
            새로운 댓글을 확인하세요
          </span>
        </h1>
      </div>

      {/* 필터 탭 */}
      <div style={{ display: "flex", gap: 8, padding: "0 28px 12px", flexShrink: 0 }}>
        {[
          { key: "all", label: "전체", count: comments.length, color: "#3b82f6" },
          { key: "article", label: "📰 기사 댓글", count: comments.filter(c => c.type === "article").length, color: "#2563eb" },
          { key: "vacancy", label: "🏢 매물 댓글", count: comments.filter(c => c.type === "vacancy").length, color: "#d97706" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key as any)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
            background: filter === tab.key ? tab.color : (darkMode ? "#374151" : "#f3f4f6"),
            color: filter === tab.key ? "#fff" : textSecondary,
            transition: "all 0.2s",
          }}>
            {tab.label} <span style={{ opacity: 0.8 }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* 댓글 리스트 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 20px" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: textSecondary }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: textSecondary }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            댓글이 없습니다.
          </div>
        ) : filtered.map(c => (
          <div key={c.id} style={{
            display: "flex", gap: 12, padding: "14px 16px", marginBottom: 6,
            background: cardBg, borderRadius: 12, border: `1px solid ${border}`,
            cursor: "pointer", transition: "all 0.15s",
          }}
            onClick={() => window.open(getLink(c), "_blank")}
            onMouseEnter={e => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"; e.currentTarget.style.transform = "translateX(4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = cardBg; e.currentTarget.style.transform = "translateX(0)"; }}
          >
            {/* 아이콘 */}
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.type === "article" ? "#dbeafe" : "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {c.type === "article" ? "📰" : "🏢"}
            </div>

            {/* 내용 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{c.authorName}</span>
                  {c.isSecret && <span style={{ fontSize: 11 }}>🔒</span>}
                </div>
                <span style={{ fontSize: 11, color: textSecondary, flexShrink: 0 }}>{formatTime(c.createdAt)}</span>
              </div>
              <div style={{ fontSize: 13, color: textPrimary, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.isSecret ? "비밀 댓글입니다" : c.content}
              </div>
              <div style={{ fontSize: 11, color: textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.type === "article" ? "📰" : "🏢"} {c.sourceTitle}
              </div>
            </div>

            {/* 화살표 */}
            <div style={{ display: "flex", alignItems: "center", color: textSecondary, fontSize: 14 }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
