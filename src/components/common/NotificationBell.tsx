"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/app/actions/notification";

const TYPE_LABEL: Record<string, { icon: string; color: string }> = {
  member_signup: { icon: "👤", color: "#2563eb" },
  article_pending: { icon: "📝", color: "#d97706" },
  newsrealty_apply: { icon: "🏢", color: "#059669" },
  inquiry_new: { icon: "💬", color: "#dc2626" },
  inquiry_reply: { icon: "💬", color: "#dc2626" },
  inquiry_answered: { icon: "✅", color: "#059669" },
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

interface Props {
  /** 모바일 화면이면 mobile_link 로 이동한다 */
  mobile?: boolean;
  /** 아이콘 색 (헤더 배경에 맞춘다) */
  color?: string;
}

export default function NotificationBell({ mobile = false, color = "#333" }: Props) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 로그인 사용자와 권한 파악
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      const role = (data?.role || "").toUpperCase();
      setIsAdmin(role === "ADMIN" || role === "SUPER_ADMIN" || (data?.role || "").includes("관리자"));
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await getNotifications({ userId, isAdmin });
    if (res.success) {
      setItems(res.data);
      setUnread(res.unread);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    void (async () => { await load(); })();
  }, [load]);

  // 새 알림이 들어오면 즉시 숫자가 올라간다
  useNotificationsRealtime(userId, load);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const handleClickItem = async (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) {
      setUnread(u => Math.max(0, u - 1));
      setItems(prev => prev.map(i => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)));
      void markNotificationRead(n.id);
    }
    const target = mobile ? n.mobile_link || n.link : n.link || n.mobile_link;
    if (target) router.push(target);
  };

  const handleReadAll = async () => {
    setUnread(0);
    setItems(prev => prev.map(i => (i.read_at ? i : { ...i, read_at: new Date().toISOString() })));
    await markAllNotificationsRead({ userId: userId || undefined, isAdmin });
  };

  if (!userId) return null;

  return (
    <div ref={boxRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`알림 ${unread}건`}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", position: "relative" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -4, minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0, width: 340, maxHeight: 420,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
          boxShadow: "0 12px 28px rgba(0,0,0,0.16)", zIndex: 10000, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>알림 {unread > 0 && <span style={{ color: "#ef4444" }}>{unread}</span>}</span>
            {unread > 0 && (
              <button type="button" onClick={handleReadAll} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                모두 읽음
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {items.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>새 알림이 없습니다.</div>
            ) : (
              items.map(n => {
                const meta = TYPE_LABEL[n.type] || { icon: "🔔", color: "#6b7280" };
                const isUnread = !n.read_at;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickItem(n)}
                    style={{
                      width: "100%", display: "flex", gap: 10, padding: "12px 16px", textAlign: "left",
                      background: isUnread ? "#f8fbff" : "#fff", border: "none",
                      borderBottom: "1px solid #f4f4f5", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{meta.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: isUnread ? 800 : 600, color: "#111", marginBottom: 2 }}>
                        {n.title}
                      </span>
                      {n.body && (
                        <span style={{ display: "block", fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.body}
                        </span>
                      )}
                      <span style={{ display: "block", fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{timeAgo(n.created_at)}</span>
                    </span>
                    {isUnread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 6 }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
