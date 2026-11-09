"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  star_vacancy: { icon: "🏢", color: "#2563eb" },
  star_article: { icon: "📰", color: "#ff8e15" },
  star_trade: { icon: "🏠", color: "#1a56db" },
  article_pending: { icon: "📝", color: "#d97706" },
  newsrealty_apply: { icon: "🏢", color: "#059669" },
  study_apply: { icon: "🎓", color: "#059669" },
  smartstore_order: { icon: "🛒", color: "#059669" },
  inquiry_new: { icon: "💬", color: "#dc2626" },
  intake_new: { icon: "📥", color: "#059669" },
  inquiry_reply: { icon: "💬", color: "#dc2626" },
  inquiry_answered: { icon: "✅", color: "#059669" },
  lecture_pending: { icon: "🎓", color: "#d97706" },
  lecture_approved: { icon: "🎓", color: "#059669" },
  lecture_rejected: { icon: "🎓", color: "#dc2626" },
  realtor_rejected: { icon: "🚨", color: "#be123c" },
  realtor_approved: { icon: "✅", color: "#059669" },
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

/* ── 알림 소리 (2026-11-09 사장님: "알림소리가 날 수 있게 · 소리 켜기 끄기 먼저") ──
   새 알림이 실시간으로 들어오면 짧은 "띵". 사람마다 켜기/끄기를 기억 (gs-noti-sound, 기본 켬).
   종이 한 화면에 여러 개 있어도 한 번만 울리게 (마지막으로 울린 알림 번호를 함께 쓴다).
   크롬 규칙상 이 페이지를 한 번이라도 누른 뒤부터 소리가 난다. */
const SOUND_KEY = "gs-noti-sound";
let lastDing = { id: "", at: 0 };
type SoundMode = "ding" | "off";
/** 띵동 · 꺼짐 — 기본 띵동 (2026-11-09 사장님: 목소리 알림은 빼고 "그냥 띵동 소리만") */
function soundMode(): SoundMode { try { return localStorage.getItem(SOUND_KEY) === "off" ? "off" : "ding"; } catch { return "ding"; } }
function soundOn() { return soundMode() !== "off"; }
function ding() {
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const note = (freq: number, at: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.45);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.5);
    };
    note(1046.5, 0); note(1318.5, 0.12); // 띵-동 (도·미)
    setTimeout(() => void ctx.close().catch(() => {}), 900);
  } catch { /* 소리를 못 내도 알림은 그대로 */ }
}

export default function NotificationBell({ mobile = false, color = "#333" }: Props) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [sound, setSound] = useState<SoundMode>("ding");
  useEffect(() => { setSound(soundMode()); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const firstLoad = useRef(true);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  // 목록은 화면 맨 위(body)에 띄운다 — 감싼 칸이 잘라 내도(overflow) 가려지지 않게 (2026-11-04: 공실열람 위쪽 띠에서 안 보이던 것)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

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
      // 처음 불러온 것 말고, 실시간으로 새로 들어온 안 읽은 알림이면 "띵" (한 화면에 종이 여러 개여도 한 번)
      const top = res.data[0];
      if (!firstLoad.current && top && !top.read_at && top.id !== lastDing.id && soundOn()) {
        lastDing = { id: String(top.id), at: Date.now() };
        ding();
      } else if (firstLoad.current && top && !lastDing.id) lastDing = { id: String(top.id), at: Date.now() };
      firstLoad.current = false;
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
      if (boxRef.current && !boxRef.current.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node)) setOpen(false);
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
    if (!target) return;
    // 이미 우리동네부동산(/gongsil)에서 단지 알림을 누르면 — 주소만 바뀌고 다시 열리지 않던 것 (2026-11-05 사장님)
    // 화면에 "이 단지 열기"를 알린다: 지도 탭으로 바꾸고(GongsilClient) 그 단지로 옮겨 단지 창(AptPriceLayer)
    const apt = /^\/gongsil\?apt=([^&]+)/.exec(target);
    if (apt && window.location.pathname === "/gongsil") {
      window.history.replaceState(null, "", target);
      window.dispatchEvent(new CustomEvent("gs-apt-open", { detail: { id: decodeURIComponent(apt[1]) } }));
      return;
    }
    router.push(target);
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
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPos({ top: r.bottom + 10, right: Math.max(8, window.innerWidth - r.right) });
          setOpen(o => !o);
        }}
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

      {open && pos && typeof document !== "undefined" && createPortal(
        <div ref={dropRef} style={{
          position: "fixed", top: pos.top, right: pos.right, width: 340, maxHeight: 420,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
          boxShadow: "0 12px 28px rgba(0,0,0,0.16)", zIndex: 2147483000, display: "flex", flexDirection: "column", /* 맨 위 — 첫 화면 메뉴 줄(.header 9,999,999)에 가려지던 것 (2026-11-06) */
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>알림 {unread > 0 && <span style={{ color: "#ef4444" }}>{unread}</span>}</span>
            <button type="button" onClick={() => { const next: SoundMode = sound === "ding" ? "off" : "ding"; setSound(next); try { localStorage.setItem(SOUND_KEY, next); } catch {} if (next === "ding") ding(); }}
              title={sound === "ding" ? "새 알림이 오면 띵동 — 누르면 소리 끄기" : "소리가 꺼져 있어요 — 누르면 켜요"}
              style={{ marginLeft: "auto", marginRight: 8, display: "flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px", borderRadius: 13, border: `1px solid ${sound === "ding" ? "#1e3a6e" : "#d1d5db"}`, background: sound === "ding" ? "#eef2ff" : "#fff", color: sound === "ding" ? "#1e3a6e" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {sound === "ding" ? "🔔 소리 켜짐" : "🔕 소리 꺼짐"}
            </button>
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
        </div>,
        document.body
      )}
    </div>
  );
}
