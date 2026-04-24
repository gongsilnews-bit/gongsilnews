"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AdminTheme } from "./types";
import { getAllTalkItems, replyToTalk, TalkItem } from "@/app/actions/talk";
import { createClient } from "@/utils/supabase/client";

interface CommentSectionProps {
  theme: AdminTheme;
  role: "admin" | "realtor" | "user";
  memberId?: string;
}

/** 채팅방 단위 (기사/매물 하나 = 채팅방 하나) */
interface TalkRoom {
  sourceType: "vacancy" | "article" | "inquiry";
  sourceId: string;
  sourceTitle: string;
  messages: TalkItem[];
  lastMessage: TalkItem;
  unreadCount: number;
}

/** 더미 문의Talk 데이터 */
const DUMMY_INQUIRY_ROOMS: TalkRoom[] = [
  {
    sourceType: "inquiry", sourceId: "inq_1",
    sourceTitle: "강남수산 부동산",
    messages: [
      { id: "inq_msg_1", sourceType: "vacancy", sourceId: "inq_1", sourceTitle: "강남수산 부동산", authorId: "u1", authorName: "강남수산", content: "안녕하세요! 역삼동 테헤란로 사무실 아직 나와있나요?", isSecret: false, isRead: true, isReplied: false, createdAt: "2026-04-23T10:30:00Z" },
      { id: "inq_msg_2", sourceType: "vacancy", sourceId: "inq_1", sourceTitle: "강남수산 부동산", authorId: "admin", authorName: "공실뉴스", content: "네! 현재 공실 상태입니다. 방문 가능하세요?", isSecret: false, isRead: true, isReplied: true, createdAt: "2026-04-23T10:35:00Z" },
      { id: "inq_msg_3", sourceType: "vacancy", sourceId: "inq_1", sourceTitle: "강남수산 부동산", authorId: "u1", authorName: "강남수산", content: "이번주 금요일 오후 2시에 가능할까요?", isSecret: false, isRead: false, isReplied: false, createdAt: "2026-04-23T11:00:00Z" },
    ],
    lastMessage: { id: "inq_msg_3", sourceType: "vacancy", sourceId: "inq_1", sourceTitle: "강남수산 부동산", authorId: "u1", authorName: "강남수산", content: "이번주 금요일 오후 2시에 가능할까요?", isSecret: false, isRead: false, isReplied: false, createdAt: "2026-04-23T11:00:00Z" },
    unreadCount: 1,
  },
  {
    sourceType: "inquiry", sourceId: "inq_2",
    sourceTitle: "꼬마빌딩최고",
    messages: [
      { id: "inq_msg_4", sourceType: "article", sourceId: "inq_2", sourceTitle: "꼬마빌딩최고", authorId: "u2", authorName: "꼬마빌딩최고", content: "기사에서 언급한 서초동 매물 정보 좀 더 알 수 있을까요?", isSecret: false, isRead: true, isReplied: false, createdAt: "2026-04-22T14:20:00Z" },
      { id: "inq_msg_5", sourceType: "article", sourceId: "inq_2", sourceTitle: "꼬마빌딩최고", authorId: "admin", authorName: "공실뉴스", content: "네, DM으로 상세 정보 보내드리겠습니다!", isSecret: false, isRead: true, isReplied: true, createdAt: "2026-04-22T15:00:00Z" },
    ],
    lastMessage: { id: "inq_msg_5", sourceType: "article", sourceId: "inq_2", sourceTitle: "꼬마빌딩최고", authorId: "admin", authorName: "공실뉴스", content: "네, DM으로 상세 정보 보내드리겠습니다!", isSecret: false, isRead: true, isReplied: true, createdAt: "2026-04-22T15:00:00Z" },
    unreadCount: 0,
  },
  {
    sourceType: "inquiry", sourceId: "inq_3",
    sourceTitle: "익명의 손님",
    messages: [
      { id: "inq_msg_6", sourceType: "vacancy", sourceId: "inq_3", sourceTitle: "익명의 손님", authorId: "u3", authorName: "익명의 손님", content: "전화 넘 안받으시네요. 혹시 이번주 토요일에 사무실 방문하면 뵐 수 있을까요?", isSecret: true, isRead: false, isReplied: false, createdAt: "2026-04-24T09:15:00Z" },
    ],
    lastMessage: { id: "inq_msg_6", sourceType: "vacancy", sourceId: "inq_3", sourceTitle: "익명의 손님", authorId: "u3", authorName: "익명의 손님", content: "전화 넘 안받으시네요. 혹시 이번주 토요일에 사무실 방문하면 뵐 수 있을까요?", isSecret: true, isRead: false, isReplied: false, createdAt: "2026-04-24T09:15:00Z" },
    unreadCount: 1,
  },
];

export default function CommentSection({ theme, role, memberId }: CommentSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  
  const [activeTab, setActiveTab] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [commentRooms, setCommentRooms] = useState<TalkRoom[]>([]);
  const [inquiryRooms] = useState<TalkRoom[]>(DUMMY_INQUIRY_ROOMS);
  const [selectedRoom, setSelectedRoom] = useState<TalkRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("관리자");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 현재 로그인 사용자 정보 가져오기
  useEffect(() => {
    async function fetchCurrentUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: member } = await supabase.from("members").select("name").eq("id", user.id).single();
        setCurrentUserName(member?.name || user.email?.split("@")[0] || "관리자");
      }
    }
    fetchCurrentUser();
  }, []);

  // 실제 댓글 데이터 조회 → 채팅방 단위로 그룹핑
  const fetchTalkData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await getAllTalkItems(role === "admin" ? undefined : memberId);
      if (res.success && res.data) {
        const roomMap = new Map<string, TalkRoom>();
        for (const item of res.data) {
          const key = `${item.sourceType}_${item.sourceId}`;
          if (!roomMap.has(key)) {
            roomMap.set(key, {
              sourceType: item.sourceType,
              sourceId: item.sourceId,
              sourceTitle: item.sourceTitle,
              messages: [],
              lastMessage: item,
              unreadCount: 0,
            });
          }
          roomMap.get(key)!.messages.push(item);
        }
        const roomList = Array.from(roomMap.values()).map(room => {
          room.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          room.lastMessage = room.messages[room.messages.length - 1];
          return room;
        });
        roomList.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
        setCommentRooms(roomList);
      }
    } catch (err) {
      console.error("공실Talk 데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [role, memberId]);

  useEffect(() => {
    fetchTalkData();
  }, [role, memberId]);

  // ★ Supabase Realtime 구독 → 새 댓글이 들어오면 자동 새로고침
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel("gongsil-talk-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "article_comments" }, () => {
        fetchTalkData(true);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vacancy_comments" }, () => {
        fetchTalkData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTalkData]);

  // ★ commentRooms가 업데이트되면 현재 열려있는 채팅방도 자동 동기화
  const selectedRoomRef = useRef(selectedRoom);
  selectedRoomRef.current = selectedRoom;
  useEffect(() => {
    if (selectedRoomRef.current) {
      const updated = commentRooms.find(
        r => r.sourceType === selectedRoomRef.current!.sourceType && r.sourceId === selectedRoomRef.current!.sourceId
      );
      if (updated && updated.messages.length !== selectedRoomRef.current.messages.length) {
        setSelectedRoom(updated);
      }
    }
  }, [commentRooms]);

  // 채팅방 열면 스크롤 하단으로
  useEffect(() => {
    if (selectedRoom && chatEndRef.current) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [selectedRoom]);

  // 현재 탭에 따라 보여줄 방 결정
  const getVisibleRooms = (): TalkRoom[] => {
    let rooms: TalkRoom[] = [];
    if (activeTab === "전체") rooms = [...commentRooms, ...inquiryRooms];
    else if (activeTab === "댓글") rooms = commentRooms;
    else if (activeTab === "문의 Talk") rooms = inquiryRooms;

    rooms.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      rooms = rooms.filter(r => r.sourceTitle.toLowerCase().includes(kw) || r.lastMessage.content.toLowerCase().includes(kw) || r.lastMessage.authorName.toLowerCase().includes(kw));
    }
    return rooms;
  };

  const filteredRooms = getVisibleRooms();

  const getSourceBadge = (type: string, size: "sm" | "md" = "sm") => {
    const pad = size === "md" ? "4px 8px" : "3px 6px";
    const fs = size === "md" ? 11 : 10;
    switch (type) {
      case "vacancy": return <span style={{ padding: pad, background: darkMode ? "rgba(217, 119, 6, 0.2)" : "#fef3c7", color: "#d97706", borderRadius: 4, fontSize: fs, fontWeight: 800 }}>🏢 공실 매물</span>;
      case "article": return <span style={{ padding: pad, background: darkMode ? "rgba(37, 99, 235, 0.2)" : "#dbeafe", color: "#2563eb", borderRadius: 4, fontSize: fs, fontWeight: 800 }}>📰 뉴스 기사</span>;
      case "inquiry": return <span style={{ padding: pad, background: darkMode ? "rgba(5, 150, 105, 0.2)" : "#d1fae5", color: "#059669", borderRadius: 4, fontSize: fs, fontWeight: 800 }}>💬 문의 Talk</span>;
      default: return null;
    }
  };

  const getRoomIcon = (type: string) => {
    switch (type) {
      case "vacancy": return { bg: "#fef3c7", icon: "🏢" };
      case "article": return { bg: "#dbeafe", icon: "📰" };
      case "inquiry": return { bg: "#d1fae5", icon: "💬" };
      default: return { bg: "#e5e7eb", icon: "💬" };
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${d.getMonth() + 1}.${d.getDate()}`;
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedRoom || !currentUserId || selectedRoom.sourceType === "inquiry") return;
    setSending(true);
    try {
      const res = await replyToTalk({
        sourceType: selectedRoom.sourceType,
        sourceId: selectedRoom.sourceId,
        authorId: currentUserId,
        authorName: currentUserName,
        content: replyText.trim(),
      });
      if (res.success) {
        setReplyText("");
        // 데이터 새로고침
        await fetchTalkData();
        // 해당 방 다시 선택 (새 메시지 포함)
        const updatedRoom = commentRooms.find(r => r.sourceType === selectedRoom.sourceType && r.sourceId === selectedRoom.sourceId);
        if (updatedRoom) setSelectedRoom(updatedRoom);
      } else {
        alert("답글 저장에 실패했습니다: " + res.error);
      }
    } catch (err) {
      alert("답글 저장 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const totalRooms = commentRooms.length + inquiryRooms.length;
  const totalNewInquiry = inquiryRooms.reduce((acc, r) => acc + r.unreadCount, 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: bg }}>
      {/* 상단 타이틀 */}
      <div style={{ padding: "20px 28px 0", flexShrink: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: textPrimary, margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>💬</span>
          <span>공실</span><span style={{ color: "#3b82f6" }}>Talk</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginLeft: 8 }}>
            {role === "admin" ? "플랫폼 전체 대화" : "내 공실/기사 대화"}
          </span>
        </h1>
      </div>

      {/* 메인 2단 레이아웃 */}
      <div style={{ flex: 1, display: "flex", margin: "16px 28px 0", gap: 0, overflow: "hidden", borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
        
        {/* ===== 좌측: 채팅방 리스트 (항상 전체 폭) ===== */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: cardBg }}>
          
          {/* 탭: 전체 / 댓글 / 문의Talk */}
          <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc", flexShrink: 0 }}>
            {[
              { label: "전체", count: totalRooms, color: "#3b82f6" },
              { label: "댓글", count: commentRooms.length, color: "#8b5cf6" },
              { label: "문의 Talk", count: inquiryRooms.length, color: "#059669", hasNew: totalNewInquiry > 0 },
            ].map(tab => (
              <button key={tab.label} onClick={() => { setActiveTab(tab.label); setSelectedRoom(null); }} style={{
                flex: 1, height: 46, background: "none", border: "none",
                borderBottom: activeTab === tab.label ? `2px solid ${tab.color}` : "2px solid transparent",
                color: activeTab === tab.label ? tab.color : textSecondary,
                fontSize: 13, fontWeight: activeTab === tab.label ? 800 : 600,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5
              }}>
                {tab.label}
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: activeTab === tab.label ? tab.color : (darkMode ? "#374151" : "#e5e7eb"), color: activeTab === tab.label ? "#fff" : textSecondary }}>{tab.count}</span>
                {tab.hasNew && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />}
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
            <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
              placeholder="제목, 작성자, 내용 검색"
              style={{ width: "100%", height: 34, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#1f2023" : "#fff", outline: "none" }}
            />
          </div>

          {/* 채팅방 목록 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>💬 불러오는 중...</div>
            ) : filteredRooms.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>대화가 없습니다.
              </div>
            ) : filteredRooms.map(room => {
              const roomIcon = getRoomIcon(room.sourceType);
              const isSelected = selectedRoom?.sourceId === room.sourceId && selectedRoom?.sourceType === room.sourceType;
              return (
                <div key={`${room.sourceType}_${room.sourceId}`}
                  onClick={() => setSelectedRoom(room)}
                  style={{
                    padding: "14px 16px", borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`,
                    cursor: "pointer", transition: "background 0.15s",
                    background: isSelected ? (darkMode ? "rgba(59,130,246,0.1)" : "#eff6ff") : "transparent",
                    display: "flex", gap: 12, alignItems: "flex-start",
                    borderLeft: isSelected ? "3px solid #3b82f6" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* 아이콘 */}
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: darkMode ? "rgba(255,255,255,0.1)" : roomIcon.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {roomIcon.icon}
                  </div>
                  {/* 내용 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        {getSourceBadge(room.sourceType)}
                        <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.sourceTitle}</span>
                      </div>
                      <span style={{ fontSize: 11, color: textSecondary, flexShrink: 0 }}>{formatTime(room.lastMessage.createdAt)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {room.lastMessage.isSecret && <span style={{ marginRight: 4 }}>🔒</span>}
                        <strong style={{ color: textPrimary }}>{room.lastMessage.authorName}</strong>: {room.lastMessage.content}
                      </span>
                      {/* 메시지 카운트 뱃지 */}
                      <span style={{ flexShrink: 0, marginLeft: 8, fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: room.unreadCount > 0 ? "#ef4444" : (room.sourceType === "article" ? "#3b82f6" : room.sourceType === "vacancy" ? "#d97706" : "#059669"), color: "#fff", minWidth: 20, textAlign: "center" }}>
                        {room.messages.length}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>

        {/* ===== 우측: Talk 대화 오버레이 패널 ===== */}
      {selectedRoom && (
        <div style={{
          position: "fixed", top: 0, right: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.3)", zIndex: 9999,
          display: "flex", justifyContent: "flex-end"
        }}>
          <div style={{ flex: 1 }} onClick={() => setSelectedRoom(null)} />
          
          <div style={{
            width: 520, background: cardBg,
            boxShadow: "-4px 0 15px rgba(0,0,0,0.1)",
            display: "flex", flexDirection: "column",
            animation: "slideInRight 0.3s ease-out"
          }}>
            {/* 헤더 */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {getSourceBadge(selectedRoom.sourceType, "md")}
                  <span style={{ fontSize: 12, color: textSecondary, fontWeight: 600 }}>대화 {selectedRoom.messages.length}건</span>
                </div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 18, color: textPrimary, fontWeight: 700, lineHeight: 1.4 }}>{selectedRoom.sourceTitle}</h2>
                <div style={{ fontSize: 13, color: textSecondary }}>
                  {selectedRoom.sourceType === "inquiry" ? "회원 간 1:1 대화" : "댓글 대화 스레드"}
                </div>
              </div>
              <button onClick={() => setSelectedRoom(null)} style={{ background: "none", border: "none", fontSize: 24, color: textSecondary, cursor: "pointer" }}>&times;</button>
            </div>

            {/* 대화 영역 */}
            <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: darkMode ? "#222" : "#f0f2f5", display: "flex", flexDirection: "column", gap: 20 }}>
              {selectedRoom.messages.map((msg) => {
                const isMe = currentUserId ? msg.authorId === currentUserId : false;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 10, alignItems: "flex-start" }}>
                    {!isMe && (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: darkMode ? "#374151" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
                    )}
                    {isMe && (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>ME</div>
                    )}
                    <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexDirection: isMe ? "row-reverse" : "row" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{msg.authorName}</span>
                        {msg.isSecret && <span style={{ fontSize: 11 }}>🔒</span>}
                        <span style={{ fontSize: 11, color: textSecondary }}>{new Date(msg.createdAt).toLocaleString("ko-KR", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div style={{
                        padding: "12px 16px", fontSize: 14, lineHeight: 1.7, color: isMe ? "#fff" : textPrimary,
                        background: isMe ? "#3b82f6" : (darkMode ? "#2c2d31" : "#fff"),
                        borderRadius: isMe ? "14px 0 14px 14px" : "0 14px 14px 14px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)", wordBreak: "break-word"
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* 답글 입력창 (하단 고정) */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc", display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea
                value={replyText} onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                placeholder={`메시지를 입력하세요...`}
                style={{ width: "100%", height: 80, padding: "12px", borderRadius: 8, border: `1px solid ${border}`, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <button onClick={handleReply} disabled={sending || !replyText.trim()} style={{ background: sending ? "#93c5fd" : "#3b82f6", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 6, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontSize: 14 }}>
                  {sending ? "전송 중..." : "답글 전송"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

