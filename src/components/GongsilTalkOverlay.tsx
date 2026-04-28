"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import ProfileCardPopover from "./ProfileCardPopover";
import CreateRoomModal from "./CreateRoomModal";
import { getMyRooms, getRoomMessages, sendMessage, createRoom as createRoomAction, findOrCreateDM, updateMyName, type TalkRoom, type TalkMessage } from "@/app/actions/talkActions";

type LnbTab = "contacts" | "chats" | "notifications" | "settings";

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) {
    const h = d.getHours(); const m = String(d.getMinutes()).padStart(2, "0");
    return `${h >= 12 ? "오후" : "오전"} ${h > 12 ? h - 12 : h}:${m}`;
  }
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

export default function GongsilTalkOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LnbTab>("chats");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [chatFilter, setChatFilter] = useState<"all" | "unread">("all");
  const [messageInput, setMessageInput] = useState("");
  const [profileCard, setProfileCard] = useState<{ anchorEl: HTMLElement; name: string; agencyName?: string; ceoName?: string; phone?: string; profileImage?: string; userId?: string; role?: string; bio?: string } | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState(680);
  const [overlayWidth, setOverlayWidth] = useState(720);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(680);

  // ────── 실제 Supabase 데이터 ──────
  const [rooms, setRooms] = useState<TalkRoom[]>([]);
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("나");
  const [currentUserRole, setCurrentUserRole] = useState<string>("general");
  const [currentUserImage, setCurrentUserImage] = useState<string | null>(null);
  const [currentAgencyName, setCurrentAgencyName] = useState<string | null>(null);
  const [currentVacancyCount, setCurrentVacancyCount] = useState(0);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 로그인 사용자 정보
  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        // 프로필 정보 (DB칼럼 정확히 매칭)
        const { data: member } = await supabase.from("members").select("name, membership_type, profile_image_url, role").eq("id", user.id).single();
        if (member?.name) setCurrentUserName(member.name);
        else if (user.email) setCurrentUserName(user.email.split("@")[0]);

        if (member?.membership_type) setCurrentUserRole(member.membership_type);
        if (member?.profile_image_url) setCurrentUserImage(member.profile_image_url);
        if (member?.role === "ADMIN") setCurrentUserRole("ADMIN");

        // 소속 부동산이 있다면 (admin action 참조: owner_id)
        if (member?.role === "REALTOR" || member?.role === "부동산회원") {
          const { data: agency } = await supabase.from("agencies").select("name").eq("owner_id", user.id).single();
          if (agency?.name) setCurrentAgencyName(agency.name);
        }

        // 내 매물 수
        const { count } = await supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("owner_id", user.id);
        setCurrentVacancyCount(count || 0);
      }
    });
  }, []);

  // 채팅방 목록 로드
  const loadRooms = useCallback(async () => {
    if (!currentUserId) return;
    const res = await getMyRooms(currentUserId);
    if (res.success && res.data) setRooms(res.data);
  }, [currentUserId]);

  useEffect(() => { if (currentUserId) loadRooms(); }, [currentUserId, loadRooms]);

  // 메시지 로드
  const loadMessages = useCallback(async (roomId: string) => {
    const res = await getRoomMessages(roomId);
    if (res.success && res.data) {
      setMessages(res.data);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, []);

  useEffect(() => { if (selectedRoom) loadMessages(selectedRoom); }, [selectedRoom, loadMessages]);

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const channel = supabase
      .channel("talk-messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "talk_messages" }, (payload) => {
        const newMsg = payload.new as TalkMessage;
        // 현재 열린 방이면 메시지 추가
        if (newMsg.room_id === selectedRoom) {
          setMessages(prev => [...prev, newMsg]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
        // 방 목록 갱신
        loadRooms();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom, loadRooms]);

  // 메시지 전송
  const handleSend = async () => {
    if (!messageInput.trim() || !selectedRoom || !currentUserId) return;
    const text = messageInput.trim();
    setMessageInput("");
    await sendMessage(selectedRoom, currentUserId, currentUserName, text);
  };

  const totalUnread = rooms.reduce((a, r) => a + (r.unread_count || 0), 0);
  const filteredRooms = chatFilter === "unread" ? rooms.filter(r => (r.unread_count || 0) > 0) : rooms;
  const currentRoom = rooms.find(r => r.id === selectedRoom);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = overlayHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dy = startY.current - ev.clientY;
      const newH = Math.min(Math.max(startHeight.current + dy, 300), window.innerHeight * 0.95);
      setOverlayHeight(newH);
    };
    const handleUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const handleResizeLeftStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientX;
    startHeight.current = overlayWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = startY.current - ev.clientX;
      const newW = Math.min(Math.max(startHeight.current + dx, 320), 1200);
      setOverlayWidth(newW);
    };
    const handleUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  // 채팅방 열기/닫기 시 자동 폭 조정
  useEffect(() => {
    if (!isDragging.current) {
      setOverlayWidth(selectedRoom ? 720 : 320);
    }
  }, [selectedRoom]);

  // 공실Talk 버튼 이벤트 리스너 (1:1 DM)
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.userId) {
        if (currentUserId) {
          setIsOpen(true);
          setActiveTab("chats");
          const res = await findOrCreateDM(currentUserId, currentUserName, detail.userId, detail.userName);
          if (res.success && res.roomId) {
            await loadRooms();
            setSelectedRoom(res.roomId);
          }
        } else {
          window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { message: "공실Talk을 이용하려면 로그인이 필요합니다." } }));
        }
      }
    };
    window.addEventListener("openGongsilTalk", handler);
    return () => window.removeEventListener("openGongsilTalk", handler);
  }, [currentUserId, currentUserName, loadRooms]);

  const NAVY = "#1a2e50";
  const BLUE = "#508bf5";
  const LNB_BG = "#2c4a7c";

  return (
    <>
      {/* ──── 플로팅 버튼 ──── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 20000000,
            width: 56, height: 56, borderRadius: "50%", background: NAVY,
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)", transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)"; }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {/* 안읽음 뱃지 */}
          {totalUnread > 0 && (
            <span style={{ position: "absolute", top: -2, right: -2, minWidth: 20, height: 20, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", border: "2px solid #fff" }}>
              {totalUnread}
            </span>
          )}
          {/* 라벨 */}
          <span style={{ position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: NAVY, whiteSpace: "nowrap" }}>공실Talk</span>
        </button>
      )}

      {/* ──── 슬라이드 오버레이 ──── */}
      <div style={{
        position: "fixed", bottom: 0, right: 0, zIndex: 20000000,
        width: isOpen ? overlayWidth : 0, height: isOpen ? overlayHeight : 0,
        boxShadow: isOpen ? "-4px -4px 24px rgba(0,0,0,0.15)" : "none",
        transition: isDragging.current ? "none" : "width 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'Pretendard', sans-serif",
        opacity: isOpen ? 1 : 0,
      }}>
        {/* 좌측 리사이즈 핸들 */}
        <div
          onMouseDown={handleResizeLeftStart}
          style={{ position: "absolute", left: -4, top: 0, width: 10, height: "100%", cursor: "ew-resize", zIndex: 20 }}
        />
        {/* 상단 리사이즈 핸들 */}
        <div
          onMouseDown={handleResizeStart}
          style={{ position: "absolute", left: 0, top: -4, width: "100%", height: 10, cursor: "ns-resize", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
        />
        {/* 좌상단 코너 리사이즈 핸들 */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isDragging.current = true;
            const sX = e.clientX, sY = e.clientY, sW = overlayWidth, sH = overlayHeight;
            document.body.style.cursor = "nwse-resize";
            document.body.style.userSelect = "none";
            const move = (ev: MouseEvent) => {
              if (!isDragging.current) return;
              setOverlayWidth(Math.min(Math.max(sW + (sX - ev.clientX), 320), 1200));
              setOverlayHeight(Math.min(Math.max(sH + (sY - ev.clientY), 300), window.innerHeight * 0.95));
            };
            const up = () => {
              isDragging.current = false;
              document.body.style.cursor = "";
              document.body.style.userSelect = "";
              window.removeEventListener("mousemove", move);
              window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
          }}
          style={{ position: "absolute", left: -4, top: -4, width: 18, height: 18, cursor: "nwse-resize", zIndex: 30 }}
        />
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#fff", borderRadius: "16px 0 0 0", overflow: "hidden" }}>

          {/* ── LNB ── */}
          <div style={{ width: 56, minWidth: 56, background: LNB_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 2 }}>
            {/* 닫기 버튼 (상단) */}
            <button onClick={() => setIsOpen(false)} title="닫기"
              style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", transition: "all 0.2s", marginBottom: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
            </button>

            {/* 프로필 */}
            <div onClick={() => setActiveTab("contacts")} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff", marginBottom: 12, cursor: "pointer", overflow: "hidden" }}>
              {currentUserImage ? <img src={currentUserImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
            </div>

            {([
              { tab: "contacts" as LnbTab, label: "친구", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
              { tab: "chats" as LnbTab, label: "채팅", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, badge: totalUnread },
              { tab: "notifications" as LnbTab, label: "알림", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
            ]).map(item => (
              <button key={item.tab} onClick={() => setActiveTab(item.tab)} title={item.label}
                style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: activeTab === item.tab ? "rgba(255,255,255,0.25)" : "transparent", color: activeTab === item.tab ? "#fff" : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", position: "relative", transition: "all 0.2s" }}
                onMouseEnter={e => { if (activeTab !== item.tab) { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={e => { if (activeTab !== item.tab) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; } }}
              >
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span style={{ position: "absolute", top: 1, right: 1, minWidth: 14, height: 14, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{item.badge}</span>
                )}
              </button>
            ))}

            <div style={{ flex: 1 }} />
          </div>

          {/* ── 중앙 리스트 ── */}
          <div style={{ width: selectedRoom ? 260 : undefined, minWidth: 260, flex: selectedRoom ? "none" : 1, background: "#fff", borderRight: selectedRoom ? "1px solid #e5e7eb" : "none", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 14px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>
                  {activeTab === "contacts" ? "친구" : activeTab === "chats" ? "채팅" : activeTab === "notifications" ? "알림" : "설정"}
                </h2>
                <div style={{ display: "flex", gap: 2 }}>
                  <button style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  </button>
                  {activeTab === "chats" && (
                    <button onClick={() => setShowCreateRoom(true)} style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }} title="채팅방 만들기">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    </button>
                  )}
                </div>
              </div>
              {activeTab === "chats" && (
                <div style={{ display: "flex", gap: 6 }}>
                  {(["all", "unread"] as const).map(f => (
                    <button key={f} onClick={() => setChatFilter(f)}
                      style={{ padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: chatFilter === f ? NAVY : "#f3f4f6", color: chatFilter === f ? "#fff" : "#555" }}>
                      {f === "all" ? "전체" : "안읽음"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {activeTab === "chats" && filteredRooms.length === 0 && (
                <div style={{ padding: "40px 14px", textAlign: "center", color: "#bbb", fontSize: 13 }}>💬 채팅방이 없습니다<br/><span style={{ fontSize: 11 }}>+ 버튼으로 새 채팅방을 만들어보세요</span></div>
              )}
              {activeTab === "chats" && filteredRooms.map(room => (
                <div key={room.id} onClick={() => setSelectedRoom(room.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: selectedRoom === room.id ? "#ebf5ff" : "transparent", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (selectedRoom !== room.id) e.currentTarget.style.background = "#f9fafb"; }}
                  onMouseLeave={e => { if (selectedRoom !== room.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{room.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {room.title}
                        {room.type === "group" && <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 3, fontSize: 11 }}>{room.member_count}</span>}
                      </span>
                      <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0, marginLeft: 6 }}>{room.last_message_time ? formatTime(room.last_message_time) : ""}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, paddingRight: 6 }}>{room.last_message || ""}</p>
                    </div>
                  </div>
                </div>
              ))}

              {activeTab === "contacts" && (
                <>
                  {/* 내 프로필 카드 */}
                  <div style={{ padding: 16, borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                        {currentUserImage ? <img src={currentUserImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingNickname ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)}
                              autoFocus
                              style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, fontWeight: 700, outline: "none" }}
                              onKeyDown={async e => {
                                if (e.key === "Enter" && nicknameInput.trim() && currentUserId) {
                                  const renameRes = await updateMyName(currentUserId, nicknameInput.trim());
                                  if (renameRes.success) {
                                    setCurrentUserName(nicknameInput.trim());
                                    setEditingNickname(false);
                                  } else {
                                    alert("이름 수정 실패: " + renameRes.error);
                                  }
                                }
                                if (e.key === "Escape") setEditingNickname(false);
                              }}
                            />
                            <button onClick={async () => {
                              if (nicknameInput.trim() && currentUserId) {
                                const renameRes = await updateMyName(currentUserId, nicknameInput.trim());
                                if (renameRes.success) {
                                  setCurrentUserName(nicknameInput.trim());
                                  setEditingNickname(false);
                                } else {
                                  alert("이름 수정에 실패했습니다.");
                                }
                              }
                            }} style={{ padding: "4px 10px", borderRadius: 6, background: NAVY, color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>저장</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 15, color: "#111" }}>{currentUserName}</span>
                            <button onClick={() => { setNicknameInput(currentUserName); setEditingNickname(true); }}
                              style={{ width: 20, height: 20, borderRadius: 4, background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#999" }}
                              title="이름 수정"
                            >✏️</button>
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{currentAgencyName || "공실뉴스 회원"}</div>
                        <span style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 6, background: "#dbeafe", color: "#2563eb", fontSize: 11, fontWeight: 700 }}>
                          {currentUserRole === "ADMIN" ? "최고관리자" : currentUserRole === "REALTOR" || currentUserRole === "부동산회원" ? "부동산회원" : "일반회원"}
                        </span>
                      </div>
                    </div>

                    {/* 내 매물 현황 */}
                    <div style={{ background: "#f8f9fa", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>🏢 내 공실 등록 현황</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: NAVY }}>{currentVacancyCount}</span>
                        <span style={{ fontSize: 12, color: "#888" }}>건 등록중</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "40px 14px", textAlign: "center", color: "#bbb", fontSize: 13 }}>👥 채팅방 멤버들과 대화해보세요</div>
                </>
              )}

              {activeTab === "notifications" && (
                <div style={{ padding: "40px 14px", textAlign: "center", color: "#bbb", fontSize: 13 }}>🔔 새로운 알림이 없습니다</div>
              )}
            </div>
          </div>

          {/* ── 우측 대화방 ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#d5e3f0", minWidth: 0 }}>
            {selectedRoom && currentRoom ? (
              <>
                <div style={{ height: 48, background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h3 style={{ fontWeight: 800, fontSize: 14, color: "#111", margin: 0 }}>{currentRoom.title}</h3>
                    {currentRoom.type === "group" && <span style={{ fontSize: 12, color: "#aaa" }}>{currentRoom.member_count}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    </button>
                    <button style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <button onClick={() => setSelectedRoom(null)} title="닫기" style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"} onMouseLeave={e => e.currentTarget.style.color = "#888"}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
                  {messages.map(msg => {
                    const isMe = msg.sender_id === currentUserId;
                    const initial = (msg.sender_name || "?")[0];
                    return (
                      <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 14 }}>
                        {!isMe && (
                          <div style={{ display: "flex", gap: 6, maxWidth: "75%" }}>
                            <div
                              onClick={(e) => setProfileCard({ anchorEl: e.currentTarget as HTMLElement, name: msg.sender_name, userId: msg.sender_id, role: "REALTOR" })}
                              style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, boxShadow: "0 1px 2px rgba(0,0,0,0.08)", cursor: "pointer", overflow: "hidden" }}
                            >
                              {msg.sender_profile_image ? <img src={msg.sender_profile_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#444" }}>{msg.sender_name}</span>
                              </div>
                              <div style={{ background: "#fff", borderRadius: "4px 16px 16px 16px", padding: "8px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                <p style={{ fontSize: 13, color: "#222", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                              </div>
                              <span style={{ fontSize: 10, color: "#999", marginTop: 3, marginLeft: 2, display: "inline-block" }}>{formatTime(msg.created_at)}</span>
                            </div>
                          </div>
                        )}
                        {isMe && (
                          <div style={{ maxWidth: "75%" }}>
                            <div style={{ background: NAVY, borderRadius: "16px 4px 16px 16px", padding: "8px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}>
                              <p style={{ fontSize: 13, color: "#fff", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 3, marginRight: 2 }}>
                              <span style={{ fontSize: 10, color: "#999" }}>{formatTime(msg.created_at)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: 10, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button style={{ width: 34, height: 34, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0, color: "#fff" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="메시지를 입력하세요" style={{ flex: 1, background: "#f3f4f6", borderRadius: 18, padding: "8px 14px", fontSize: 13, border: "none", outline: "none", color: "#222" }} />
                  <button onClick={handleSend} style={{ padding: "8px 16px", borderRadius: 18, background: BLUE, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0 }}>전송</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {/* 프로필 카드 팝오버 */}
      {profileCard && (
        <ProfileCardPopover
          name={profileCard.name}
          agencyName={profileCard.agencyName}
          ceoName={profileCard.ceoName}
          phone={profileCard.phone}
          profileImage={profileCard.profileImage}
          userId={profileCard.userId}
          role={profileCard.role}
          bio={profileCard.bio}
          anchorEl={profileCard.anchorEl}
          onClose={() => setProfileCard(null)}
        />
      )}
      {/* 채팅방 만들기 모달 */}
      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        userRole={currentUserRole}
        onCreateRoom={async (room) => {
          if (!currentUserId) return;
          const res = await createRoomAction({ title: room.title, description: room.description, type: room.type, avatar: room.avatar, creatorId: currentUserId });
          if (res.success && res.roomId) {
            await loadRooms();
            setSelectedRoom(res.roomId);
            setActiveTab("chats");
          }
        }}
      />
    </>
  );
}
