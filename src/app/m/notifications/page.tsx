"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/app/actions/notification";

const TYPE_ICON: Record<string, string> = {
  member_signup: "👤",
  article_pending: "📝",
  newsrealty_apply: "🏢",
  study_apply: "🎓",
  vacancy_new: "🏬",
  inquiry_new: "💬",
  inquiry_reply: "💬",
  inquiry_answered: "✅",
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};

export default function MobileNotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
        const role = (data?.role || "").toUpperCase();
        setIsAdmin(role === "ADMIN" || (data?.role || "").includes("관리자"));
      }
      setAuthChecked(true);
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const res = await getNotifications({ userId, isAdmin, limit: 50 });
    if (res.success) {
      setItems(res.data);
      setUnread(res.unread);
    }
    setLoading(false);
  }, [userId, isAdmin]);

  useEffect(() => {
    if (!authChecked) return;
    void (async () => { await load(); })();
  }, [authChecked, load]);

  // 새 알림이 오면 목록이 즉시 갱신된다
  useNotificationsRealtime(userId, load);

  const openItem = async (n: NotificationRow) => {
    if (!n.read_at) {
      setUnread(u => Math.max(0, u - 1));
      setItems(prev => prev.map(i => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)));
      void markNotificationRead(n.id);
    }
    const target = n.mobile_link || n.link;
    if (target) router.push(target);
  };

  const readAll = async () => {
    setUnread(0);
    setItems(prev => prev.map(i => (i.read_at ? i : { ...i, read_at: new Date().toISOString() })));
    await markAllNotificationsRead({ userId: userId || undefined, isAdmin });
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", paddingBottom: 80 }}>
      {/* 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", height: 56, display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
        <button onClick={() => router.back()} aria-label="뒤로가기" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111", flex: 1 }}>
          알림 {unread > 0 && <span style={{ color: "#ef4444" }}>{unread}</span>}
        </h1>
        {unread > 0 && (
          <button onClick={readAll} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            모두 읽음
          </button>
        )}
      </div>

      {/* 목록 */}
      {!authChecked || loading ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
      ) : !userId ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 8 }}>로그인이 필요합니다</div>
          <button
            onClick={() => router.push("/m/login?returnTo=" + encodeURIComponent("/m/notifications"))}
            style={{ marginTop: 8, height: 44, padding: "0 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            로그인하기
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>새 알림이 없습니다.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", marginTop: 8 }}>
          {items.map(n => {
            const isUnread = !n.read_at;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                style={{
                  width: "100%", display: "flex", gap: 12, padding: "16px", textAlign: "left",
                  background: isUnread ? "#f8fbff" : "#fff", border: "none",
                  borderBottom: "1px solid #f1f2f4", cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICON[n.type] || "🔔"}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: isUnread ? 800 : 600, color: "#111", marginBottom: 3, lineHeight: 1.4 }}>
                    {n.title}
                  </span>
                  {n.body && (
                    <span style={{ display: "block", fontSize: 13, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.body}
                    </span>
                  )}
                  <span style={{ display: "block", fontSize: 11.5, color: "#9ca3af", marginTop: 4 }}>{timeAgo(n.created_at)}</span>
                </span>
                {isUnread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 7 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
