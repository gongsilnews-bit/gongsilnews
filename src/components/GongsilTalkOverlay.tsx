"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import ProfileCardPopover from "./ProfileCardPopover";
import CreateRoomModal from "./CreateRoomModal";
import AuthModal from "./AuthModal";
import RealtorPropertyCard from "./RealtorPropertyCard";
import { getMyRooms, getRoomMessages, sendMessage, createRoom as createRoomAction, findOrCreateDM, updateMyName, updateMyProfileImage, uploadTalkProfileImage, getMyFriends, getMyFolders, createFriendFolder, renameFriendFolder, deleteFriendFolder, moveFriendToFolder, removeFriend, createGroupRoom, inviteToRoom, renameRoom, type TalkRoom, type TalkMessage, type TalkFriend, type TalkFriendFolder } from "@/app/actions/talkActions";

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [profileCard, setProfileCard] = useState<{ anchorEl: HTMLElement; name: string; agencyName?: string; ceoName?: string; phone?: string; profileImage?: string; userId?: string; role?: string; bio?: string } | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [realtorCard, setRealtorCard] = useState<{ userId: string; userName: string } | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(740);
  const [overlayWidth, setOverlayWidth] = useState(800);
  const [isMobilePath, setIsMobilePath] = useState(false);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(740);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobilePath(window.location.pathname.startsWith("/m"));
    }
  }, []);

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
  const [localUnread, setLocalUnread] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomAvatarInputRef = useRef<HTMLInputElement>(null);

  // ────── 친구 관리 ──────
  const [friends, setFriends] = useState<TalkFriend[]>([]);
  const [folders, setFolders] = useState<TalkFriendFolder[]>([]);
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [friendMenuId, setFriendMenuId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [groupChatCreating, setGroupChatCreating] = useState(false);
  // ── 채팅방 설정 ──
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteSelectedIds, setInviteSelectedIds] = useState<Set<string>>(new Set());
  const [editingRoomTitle, setEditingRoomTitle] = useState(false);
  const [roomTitleInput, setRoomTitleInput] = useState("");

  const loadFriends = useCallback(async () => {
    if (!currentUserId) return;
    const [fRes, foRes] = await Promise.all([getMyFriends(currentUserId), getMyFolders(currentUserId)]);
    if (fRes.success && fRes.data) setFriends(fRes.data);
    if (foRes.success && foRes.data) setFolders(foRes.data);
  }, [currentUserId]);

  useEffect(() => { if (currentUserId && activeTab === "contacts") loadFriends(); }, [currentUserId, activeTab, loadFriends]);

  // 프로필 이미지 업로드 핸들러
  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", `profiles/${currentUserId}_${Date.now()}`);
    
    const res = await uploadTalkProfileImage(formData);
    if (res.success && res.url) {
      await updateMyProfileImage(currentUserId, res.url);
      setCurrentUserImage(res.url);
      alert("프로필 이미지가 변경되었습니다.");
    } else {
      alert("이미지 업로드 실패: " + res.error);
    }
    // file input 초기화
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRoomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedRoom) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", `room_profiles/${selectedRoom}_${Date.now()}`);
    const { uploadTalkProfileImage, updateRoomAvatar } = await import("@/app/actions/talkActions");
    const res = await uploadTalkProfileImage(formData);
    if (res.success && res.url) {
      await updateRoomAvatar(selectedRoom, res.url);
      loadRooms();
    } else {
      alert(res.error || "업로드 실패");
    }
    if (roomAvatarInputRef.current) roomAvatarInputRef.current.value = "";
  };

  // 로그인 사용자 정보
  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        // 프로필 정보 (DB칼럼 정확히 매칭)
        const { data: member, error } = await supabase.from("members").select("name, profile_image_url, role").eq("id", user.id).single();
        if (error) console.error("Error fetching user profile:", error);
        
        if (member?.name) setCurrentUserName(member.name);
        else if (user.email) setCurrentUserName(user.email.split("@")[0]);

        if (member?.role) setCurrentUserRole(member.role);
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

  useEffect(() => { 
    if (selectedRoom) {
      loadMessages(selectedRoom);
      setLocalUnread(prev => {
        if (!prev[selectedRoom]) return prev;
        const copy = { ...prev };
        delete copy[selectedRoom];
        return copy;
      });
    }
  }, [selectedRoom, loadMessages]);

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
        } else {
          // 다른 방이면 안읽음 증가
          setLocalUnread(prev => ({ ...prev, [newMsg.room_id]: (prev[newMsg.room_id] || 0) + 1 }));
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

  const totalUnread = Object.values(localUnread).reduce((a, b) => a + b, 0);
  const filteredRooms = chatFilter === "unread" ? rooms.filter(r => (localUnread[r.id] || 0) > 0) : rooms;
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
      setOverlayWidth(selectedRoom ? 800 : 400);
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
          setIsAuthModalOpen(true);
        }
      }
    };
    
    // 모바일 헤더 등에서 단순히 톡방 전체 목록을 열 때 사용하는 이벤트
    const openMainHandler = () => {
      setIsOpen(true);
    };

    window.addEventListener("openGongsilTalk", handler);
    window.addEventListener("openGongsilTalkMain", openMainHandler);
    
    return () => {
      window.removeEventListener("openGongsilTalk", handler);
      window.removeEventListener("openGongsilTalkMain", openMainHandler);
    };
  }, [currentUserId, currentUserName, loadRooms]);

  // 매물 카드 이벤트 리스너
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.userId) {
        setRealtorCard({ userId: detail.userId, userName: detail.userName || "" });
      }
    };
    window.addEventListener("showRealtorCard", handler);
    return () => window.removeEventListener("showRealtorCard", handler);
  }, []);

  const NAVY = "#1a2e50";
  const BLUE = "#508bf5";
  const LNB_BG = "#2c4a7c";

  const renderFriendItem = (fr: TalkFriend) => {
    const isSelected = selectedFriendIds.has(fr.friend_id);
    return (
    <div key={fr.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", transition: "background 0.15s", position: "relative", background: selectMode && isSelected ? "#eef4ff" : "transparent" }}
      onMouseEnter={e => e.currentTarget.style.background = selectMode && isSelected ? "#eef4ff" : "#f9fafb"}
      onMouseLeave={e => e.currentTarget.style.background = selectMode && isSelected ? "#eef4ff" : "transparent"}
      onClick={(e) => {
        if (selectMode) {
          setSelectedFriendIds(prev => { const n = new Set(prev); if (n.has(fr.friend_id)) n.delete(fr.friend_id); else n.add(fr.friend_id); return n; });
          return;
        }
        const el = e.currentTarget.querySelector(".friend-avatar") as HTMLElement;
        if (el) setProfileCard({ anchorEl: el, name: fr.friend_name || "", userId: fr.friend_id, role: fr.friend_role, profileImage: fr.friend_profile_image, agencyName: fr.friend_agency_name });
      }}
    >
      {/* 선택 모드 체크박스 */}
      {selectMode && (
        <div style={{ width: 20, height: 20, borderRadius: 4, border: isSelected ? "none" : "2px solid #ccc", background: isSelected ? BLUE : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
          {isSelected && <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>✓</span>}
        </div>
      )}
      <div className="friend-avatar" style={{ width: 40, height: 40, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, overflow: "hidden" }}>
        {fr.friend_profile_image ? <img src={fr.friend_profile_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (fr.friend_name || "?")[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fr.friend_name}</div>
        {fr.friend_agency_name && <div style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fr.friend_agency_name}</div>}
      </div>
      {/* 더보기 메뉴 */}
      <button onClick={(e) => { e.stopPropagation(); setFriendMenuId(friendMenuId === fr.id ? null : fr.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 16, padding: "4px", lineHeight: 1 }}>⋮</button>
      {friendMenuId === fr.id && (
        <div style={{ position: "absolute", right: 16, top: 40, background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb", zIndex: 100, minWidth: 140, overflow: "hidden" }}>
          {folders.map(fo => (
            <button key={fo.id} onClick={async (e) => { e.stopPropagation(); await moveFriendToFolder(fr.id, fo.id); setFriendMenuId(null); loadFriends(); }}
              style={{ width: "100%", padding: "8px 14px", background: fr.folder_id === fo.id ? "#eaf4ff" : "none", border: "none", cursor: "pointer", fontSize: 12, color: "#333", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = fr.folder_id === fo.id ? "#eaf4ff" : "transparent"}
            >📁 {fo.name} {fr.folder_id === fo.id && "✓"}</button>
          ))}
          {fr.folder_id && (
            <button onClick={async (e) => { e.stopPropagation(); await moveFriendToFolder(fr.id, null); setFriendMenuId(null); loadFriends(); }}
              style={{ width: "100%", padding: "8px 14px", background: "none", border: "none", borderTop: "1px solid #f0f0f0", cursor: "pointer", fontSize: 12, color: "#888", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >미분류로 이동</button>
          )}
          <button onClick={async (e) => { e.stopPropagation(); if (currentUserId) { await removeFriend(currentUserId, fr.friend_id); setFriendMenuId(null); loadFriends(); } }}
            style={{ width: "100%", padding: "8px 14px", background: "none", border: "none", borderTop: "1px solid #f0f0f0", cursor: "pointer", fontSize: 12, color: "#ef4444", textAlign: "left", fontWeight: 600 }}
            onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >친구 삭제</button>
        </div>
      )}
    </div>
    );
  };

  return (
    <>
      {/* ──── 플로팅 버튼 ──── */}
      {!isOpen && (
        <button
          className="talk-floating-btn"
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed", 
            bottom: 84, // 모바일 하단 네비게이션(약 60px) 고려
            zIndex: 20000000,
            ...(isMobilePath 
              ? { left: "50%", marginLeft: "140px" } // 448/2 = 224, 224 - 84 = 140px (오른쪽 정렬)
              : { right: 24 }),
            width: 56, height: 56, borderRadius: "50%", background: NAVY,
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)", transition: "transform 0.2s, box-shadow 0.2s",
            ...((isMobilePath && typeof window !== "undefined" && window.innerWidth <= 448) ? { left: "auto", right: 24, marginLeft: 0 } : {})
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)"; }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" stroke="none">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          {/* 안읽음 뱃지 */}
          {totalUnread > 0 && (
            <span style={{ position: "absolute", top: -2, right: -2, minWidth: 20, height: 20, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", border: "2px solid #fff" }}>
              {totalUnread}
            </span>
          )}
          {/* 라벨 */}
          <span style={{ position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: NAVY, whiteSpace: "nowrap" }}>TALK</span>
        </button>
      )}

      {/* ──── 슬라이드 오버레이 ──── */}
      <div 
        className="talk-overlay-container"
        style={{
          position: "fixed", bottom: 0, zIndex: 20000000,
          right: isMobilePath ? "auto" : 0,
          left: isMobilePath ? "50%" : "auto",
          transform: isMobilePath ? "translateX(-50%)" : "none",
          width: isOpen ? (isMobilePath ? "100%" : overlayWidth) : 0,
          maxWidth: isMobilePath ? "448px" : "100vw",
          height: isOpen ? (isMobilePath ? "100vh" : overlayHeight) : 0,
          boxShadow: isOpen ? "-4px -4px 24px rgba(0,0,0,0.15)" : "none",
          transition: isDragging.current ? "none" : (isMobilePath ? "opacity 0.2s" : "width 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1)"),
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
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#fff", borderRadius: "16px 0 0 0", overflow: "hidden", position: "relative" }}>
          {/* 매물 카드 오버레이 — 전체 오버레이 위에 표시 */}
          {realtorCard && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div style={{ width: "100%", maxWidth: 420, maxHeight: "90%", display: "flex", flexDirection: "column" }}>
                <RealtorPropertyCard
                  userId={realtorCard.userId}
                  userName={realtorCard.userName}
                  isMyProperty={realtorCard.userId === currentUserId}
                  onClose={() => setRealtorCard(null)}
                  onInquiry={(text) => { setMessageInput(text); setRealtorCard(null); }}
                />
              </div>
            </div>
          )}

          {/* ── LNB ── */}
          <div style={{ width: 64, minWidth: 64, background: LNB_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 4 }}>
            {/* 닫기 버튼 (상단) */}
            <button onClick={() => setIsOpen(false)} title="닫기"
              style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", transition: "all 0.2s", marginBottom: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
            </button>

            {/* 프로필 */}
            <div onClick={() => setActiveTab("contacts")} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#fff", marginBottom: 12, cursor: "pointer", overflow: "hidden" }}>
              {currentUserImage ? <img src={currentUserImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
            </div>

            {([
              { tab: "contacts" as LnbTab, label: "친구", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
              { tab: "chats" as LnbTab, label: "채팅", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>, badge: totalUnread },
              { tab: "notifications" as LnbTab, label: "알림", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
            ]).map(item => (
              <button key={item.tab} onClick={() => setActiveTab(item.tab)} title={item.label}
                style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: activeTab === item.tab ? "rgba(255,255,255,0.25)" : "transparent", color: activeTab === item.tab ? "#fff" : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", position: "relative", transition: "all 0.2s" }}
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
          <div style={{ width: selectedRoom ? 340 : undefined, minWidth: 340, flex: selectedRoom ? "none" : 1, background: "#fff", borderRight: selectedRoom ? "1px solid #e5e7eb" : "none", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 16px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: 0 }}>
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
                <div style={{ display: "flex", gap: 6, padding: "0 16px" }}>
                  <button onClick={() => setChatFilter("all")} style={{ padding: "5px 14px", borderRadius: 16, fontSize: 13, fontWeight: 700, border: chatFilter === "all" ? "1px solid #111" : "1px solid #e5e7eb", cursor: "pointer", background: chatFilter === "all" ? "#111" : "#fff", color: chatFilter === "all" ? "#fff" : "#555" }}>전체</button>
                  <button onClick={() => setChatFilter("unread")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 16, fontSize: 13, fontWeight: 700, border: chatFilter === "unread" ? "1px solid #111" : "1px solid #e5e7eb", cursor: "pointer", background: chatFilter === "unread" ? "#fafafa" : "#fff", color: "#333" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="none"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/><circle cx="8" cy="11" r="1.5" fill="#fff"/><circle cx="12" cy="11" r="1.5" fill="#fff"/><circle cx="16" cy="11" r="1.5" fill="#fff"/></svg>
                    안읽음
                    {totalUnread > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 11, padding: "0 5px", borderRadius: 10, marginLeft: 2 }}>{totalUnread}</span>}
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {activeTab === "chats" && filteredRooms.length === 0 && (
                <div style={{ padding: "40px 14px", textAlign: "center", color: "#bbb", fontSize: 13 }}>💬 채팅방이 없습니다<br/><span style={{ fontSize: 11 }}>+ 버튼으로 새 채팅방을 만들어보세요</span></div>
              )}
              {activeTab === "chats" && filteredRooms.map(room => (
                <div key={room.id} onClick={() => setSelectedRoom(room.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: selectedRoom === room.id ? "#ebf5ff" : "transparent", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (selectedRoom !== room.id) e.currentTarget.style.background = "#f9fafb"; }}
                  onMouseLeave={e => { if (selectedRoom !== room.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, overflow: "hidden" }}>
                    {room.avatar?.startsWith("http") ? <img src={room.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : room.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {room.title}
                        {room.type === "group" && <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 3, fontSize: 11 }}>{room.member_count}</span>}
                      </span>
                      <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0, marginLeft: 6 }}>{room.last_message_time ? formatTime(room.last_message_time) : ""}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 13, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, paddingRight: 6 }}>{room.last_message || ""}</p>
                      {localUnread[room.id] > 0 && (
                        <span style={{ background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 10, flexShrink: 0 }}>
                          {localUnread[room.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {activeTab === "contacts" && (
                <>
                  {/* 내 프로필 카드 */}
                  <div style={{ padding: 16, borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handleProfileImageUpload} />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        title="프로필 이미지 변경"
                        style={{ width: 52, height: 52, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0, cursor: "pointer", position: "relative" }}
                      >
                        {currentUserImage ? <img src={currentUserImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                        <div style={{ position: "absolute", bottom: 0, right: 0, background: "rgba(0,0,0,0.5)", width: "100%", height: "30%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#fff", fontSize: 10 }}>✏️</span>
                        </div>
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
                    <div
                      onClick={() => {
                        if (currentUserId) {
                          setRealtorCard({ userId: currentUserId, userName: currentUserName });
                        }
                      }}
                      style={{ background: "#f8f9fa", borderRadius: 10, padding: 12, cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#eef1f5"}
                      onMouseLeave={e => e.currentTarget.style.background = "#f8f9fa"}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>🏢 내 공실 등록 현황</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: NAVY }}>{currentVacancyCount}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 12, color: "#888" }}>건 등록중</span>
                          <span style={{ color: "#aaa", fontSize: 14 }}>›</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── 친구 관리 헤더 ── */}
                  <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>친구 {friends.length}명</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {selectMode ? (
                        <>
                          <button onClick={() => { setSelectMode(false); setSelectedFriendIds(new Set()); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888", fontWeight: 600, padding: "4px 8px" }}>취소</button>
                          <button
                            disabled={selectedFriendIds.size < 1 || groupChatCreating}
                            onClick={async () => {
                              if (!currentUserId || selectedFriendIds.size < 1) return;
                              setGroupChatCreating(true);
                              const selectedFriends = friends.filter(f => selectedFriendIds.has(f.friend_id));
                              const names = selectedFriends.map(f => f.friend_name || "알수없음");
                              const title = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} 외 ${names.length - 3}명`;
                              const res = await createGroupRoom({
                                title,
                                creatorId: currentUserId,
                                creatorName: currentUserName,
                                memberIds: [...selectedFriendIds],
                                memberNames: names,
                              });
                              if (res.success && res.roomId) {
                                await loadRooms();
                                setSelectedRoom(res.roomId);
                                setActiveTab("chats");
                                setSelectMode(false);
                                setSelectedFriendIds(new Set());
                              }
                              setGroupChatCreating(false);
                            }}
                            style={{ background: NAVY, color: "#fff", border: "none", cursor: selectedFriendIds.size < 1 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6, opacity: selectedFriendIds.size < 1 ? 0.4 : 1 }}
                          >
                            {groupChatCreating ? "생성중..." : `채팅방 만들기 (${selectedFriendIds.size})`}
                          </button>
                        </>
                      ) : (
                        <>
                          {friends.length >= 1 && (
                            <button onClick={() => setSelectMode(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888", fontWeight: 600, padding: "4px 8px", borderRadius: 6 }}>💬 그룹채팅</button>
                          )}
                          <button onClick={() => setFolderManagerOpen(!folderManagerOpen)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: folderManagerOpen ? BLUE : "#888", fontWeight: 600, padding: "4px 8px", borderRadius: 6 }}>
                            {folderManagerOpen ? "완료" : "📁 폴더관리"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── 폴더 관리 모드 ── */}
                  {folderManagerOpen && (
                    <div style={{ padding: "0 16px 12px", borderBottom: "1px solid #f0f0f0" }}>
                      {/* 새 폴더 추가 */}
                      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                        <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="새 폴더 이름" style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12, outline: "none" }}
                          onKeyDown={async e => { if (e.key === "Enter" && newFolderName.trim() && currentUserId) { await createFriendFolder(currentUserId, newFolderName.trim()); setNewFolderName(""); loadFriends(); } }}
                        />
                        <button onClick={async () => { if (newFolderName.trim() && currentUserId) { await createFriendFolder(currentUserId, newFolderName.trim()); setNewFolderName(""); loadFriends(); } }} style={{ padding: "6px 12px", borderRadius: 6, background: NAVY, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>추가</button>
                      </div>
                      {/* 폴더 리스트 */}
                      {folders.map(f => (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                          <span style={{ fontSize: 13, color: "#666" }}>📁</span>
                          {editingFolderId === f.id ? (
                            <input value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)} autoFocus style={{ flex: 1, padding: "3px 6px", borderRadius: 4, border: "1px solid #ccc", fontSize: 12, outline: "none" }}
                              onKeyDown={async e => { if (e.key === "Enter" && editingFolderName.trim()) { await renameFriendFolder(f.id, editingFolderName.trim()); setEditingFolderId(null); loadFriends(); } if (e.key === "Escape") setEditingFolderId(null); }}
                              onBlur={async () => { if (editingFolderName.trim()) { await renameFriendFolder(f.id, editingFolderName.trim()); } setEditingFolderId(null); loadFriends(); }}
                            />
                          ) : (
                            <span onClick={() => { setEditingFolderId(f.id); setEditingFolderName(f.name); }} style={{ flex: 1, fontSize: 13, color: "#333", cursor: "pointer" }}>{f.name}</span>
                          )}
                          <button onClick={async () => { if (confirm(`"${f.name}" 폴더를 삭제하시겠습니까?\n폴더 내 친구는 미분류로 이동됩니다.`)) { await deleteFriendFolder(f.id); loadFriends(); } }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ccc", padding: "2px" }} title="삭제">✕</button>
                        </div>
                      ))}
                      {folders.length === 0 && <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: 8 }}>폴더를 추가해보세요</div>}
                    </div>
                  )}

                  {/* ── 폴더별 친구 목록 ── */}
                  {friends.length === 0 ? (
                    <div style={{ padding: "40px 14px", textAlign: "center", color: "#bbb", fontSize: 13 }}>👥 프로필 카드에서 친구를 추가해보세요</div>
                  ) : (
                    <>
                      {/* 폴더별 그룹 */}
                      {folders.map(folder => {
                        const folderFriends = friends.filter(f => f.folder_id === folder.id);
                        if (folderFriends.length === 0) return null;
                        const isCollapsed = collapsedFolders.has(folder.id);
                        return (
                          <div key={folder.id}>
                            <div onClick={() => setCollapsedFolders(prev => { const n = new Set(prev); if (n.has(folder.id)) n.delete(folder.id); else n.add(folder.id); return n; })} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, background: "#fafafa", userSelect: "none" }}>
                              <span style={{ fontSize: 10, transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
                              📁 {folder.name} ({folderFriends.length})
                            </div>
                            {!isCollapsed && folderFriends.map(fr => renderFriendItem(fr))}
                          </div>
                        );
                      })}
                      {/* 미분류 친구 */}
                      {(() => {
                        const noFolder = friends.filter(f => !f.folder_id);
                        if (noFolder.length === 0) return null;
                        return (
                          <div>
                            {folders.length > 0 && <div style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#888", background: "#fafafa" }}>미분류 ({noFolder.length})</div>}
                            {noFolder.map(fr => renderFriendItem(fr))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              )}

              {activeTab === "notifications" && (
                <div style={{ padding: "40px 14px", textAlign: "center", color: "#bbb", fontSize: 13 }}>🔔 새로운 알림이 없습니다</div>
              )}
            </div>
          </div>

          {/* ── 우측 대화방 ── */}
          {selectedRoom && currentRoom && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#d5e3f0", minWidth: 0, position: "relative" }}>
              <>
                <div style={{ height: 48, background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {editingRoomTitle ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input value={roomTitleInput} onChange={e => setRoomTitleInput(e.target.value)} autoFocus
                          style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, fontWeight: 700, outline: "none", width: 140 }}
                          onKeyDown={async e => {
                            if (e.key === "Enter" && roomTitleInput.trim() && selectedRoom) {
                              const res = await renameRoom(selectedRoom, roomTitleInput.trim());
                              if (res.success) { await loadRooms(); setEditingRoomTitle(false); }
                            }
                            if (e.key === "Escape") setEditingRoomTitle(false);
                          }}
                        />
                        <button onClick={async () => {
                          if (roomTitleInput.trim() && selectedRoom) {
                            const res = await renameRoom(selectedRoom, roomTitleInput.trim());
                            if (res.success) { await loadRooms(); setEditingRoomTitle(false); }
                          }
                        }} style={{ padding: "3px 10px", borderRadius: 6, background: NAVY, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>저장</button>
                        <button onClick={() => setEditingRoomTitle(false)} style={{ padding: "3px 8px", borderRadius: 6, background: "#f3f4f6", color: "#888", border: "none", fontSize: 11, cursor: "pointer" }}>취소</button>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ fontWeight: 800, fontSize: 14, color: "#111", margin: 0 }}>{currentRoom.title}</h3>
                        {currentRoom.type === "group" && <span style={{ fontSize: 12, color: "#aaa" }}>{currentRoom.member_count}</span>}
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 2, position: "relative" }}>
                    {/* 채팅방 설정 메뉴 */}
                    <button onClick={() => setRoomMenuOpen(!roomMenuOpen)} style={{ width: 30, height: 30, borderRadius: 6, background: roomMenuOpen ? "#f3f4f6" : "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    {roomMenuOpen && (
                      <div style={{ position: "absolute", right: 0, top: 34, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb", minWidth: 160, overflow: "hidden", zIndex: 100 }}>
                        <button onClick={() => { setRoomTitleInput(currentRoom.title); setEditingRoomTitle(true); setRoomMenuOpen(false); }}
                          style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >✏️ 채팅방 이름 변경</button>
                        {(currentRoom.created_by === currentUserId || currentUserRole === "ADMIN") && (
                          <button onClick={() => { setRoomMenuOpen(false); roomAvatarInputRef.current?.click(); }}
                            style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", textAlign: "left", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #f0f0f0" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >📸 프로필 사진 변경</button>
                        )}
                        <button onClick={() => { setShowInvitePanel(true); setInviteSelectedIds(new Set()); setRoomMenuOpen(false); loadFriends(); }}
                          style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", textAlign: "left", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #f0f0f0" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >👥 친구 초대</button>
                      </div>
                    )}
                    <button onClick={() => setSelectedRoom(null)} title="닫기" style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"} onMouseLeave={e => e.currentTarget.style.color = "#888"}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>

                {/* 초대 패널 */}
                {showInvitePanel && (
                  <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", maxHeight: 280, overflowY: "auto", flexShrink: 0 }}>
                    <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>👥 친구 초대</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setShowInvitePanel(false)} style={{ padding: "4px 10px", borderRadius: 6, background: "#f3f4f6", color: "#888", border: "none", fontSize: 11, cursor: "pointer" }}>취소</button>
                        <button
                          disabled={inviteSelectedIds.size === 0}
                          onClick={async () => {
                            if (!selectedRoom || !currentUserId || inviteSelectedIds.size === 0) return;
                            const selectedFr = friends.filter(f => inviteSelectedIds.has(f.friend_id));
                            const res = await inviteToRoom({
                              roomId: selectedRoom,
                              inviterId: currentUserId,
                              inviterName: currentUserName,
                              memberIds: selectedFr.map(f => f.friend_id),
                              memberNames: selectedFr.map(f => f.friend_name || "알수없음"),
                            });
                            if (res.success) {
                              setShowInvitePanel(false);
                              setInviteSelectedIds(new Set());
                              await loadRooms();
                              const msgRes = await getRoomMessages(selectedRoom);
                              if (msgRes.success && msgRes.data) setMessages(msgRes.data);
                            }
                          }}
                          style={{ padding: "4px 12px", borderRadius: 6, background: inviteSelectedIds.size === 0 ? "#ccc" : NAVY, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: inviteSelectedIds.size === 0 ? "not-allowed" : "pointer" }}
                        >초대하기 ({inviteSelectedIds.size})</button>
                      </div>
                    </div>
                    {friends.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: "#bbb", fontSize: 12 }}>친구를 먼저 추가해주세요</div>
                    ) : (
                      friends.map(fr => {
                        const isInvSel = inviteSelectedIds.has(fr.friend_id);
                        return (
                          <div key={fr.id}
                            onClick={() => setInviteSelectedIds(prev => { const n = new Set(prev); if (n.has(fr.friend_id)) n.delete(fr.friend_id); else n.add(fr.friend_id); return n; })}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", background: isInvSel ? "#eef4ff" : "transparent" }}
                            onMouseEnter={e => { if (!isInvSel) e.currentTarget.style.background = "#f9fafb"; }}
                            onMouseLeave={e => { if (!isInvSel) e.currentTarget.style.background = "transparent"; }}
                          >
                            <div style={{ width: 18, height: 18, borderRadius: 4, border: isInvSel ? "none" : "2px solid #ccc", background: isInvSel ? BLUE : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {isInvSel && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                            </div>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, overflow: "hidden" }}>
                              {fr.friend_profile_image ? <img src={fr.friend_profile_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (fr.friend_name || "?")[0]}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{fr.friend_name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }} onClick={() => { if (roomMenuOpen) setRoomMenuOpen(false); }}>
                  {messages.map(msg => {
                    const isMe = msg.sender_id === currentUserId;
                    const initial = (msg.sender_name || "?")[0];
                    return (
                      <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 14 }}>
                        {!isMe && (
                          <div style={{ display: "flex", gap: 6, maxWidth: "75%" }}>
                            <div
                              onClick={(e) => setProfileCard({ anchorEl: e.currentTarget as HTMLElement, name: msg.sender_name, userId: msg.sender_id, role: "REALTOR", profileImage: msg.sender_profile_image })}
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
          </div>
          )}
        </div>
      </div>
      {/* 프로필 카드 팝오버 */}
      <input type="file" ref={roomAvatarInputRef} accept="image/*" style={{ display: "none" }} onChange={handleRoomAvatarUpload} />
      {profileCard && (
        <ProfileCardPopover 
          {...profileCard}
          currentUserId={currentUserId || undefined}
          folders={folders}
          onClose={() => setProfileCard(null)}
          onFriendChanged={loadFriends}
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
