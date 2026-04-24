"use client";

import React, { useState, useEffect, useRef } from "react";
import { AdminTheme } from "./types";
import { getAllTalkItems, TalkItem } from "@/app/actions/talk";

interface CommentSectionProps {
  theme: AdminTheme;
  role: "admin" | "realtor" | "user";
  memberId?: string;
}

/** 채팅방 단위 (기사/매물 하나 = 채팅방 하나) */
interface TalkRoom {
  sourceType: "vacancy" | "article";
  sourceId: string;
  sourceTitle: string;
  messages: TalkItem[];
  lastMessage: TalkItem;
  unreadCount: number;
}

export default function CommentSection({ theme, role, memberId }: CommentSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  
  const [activeTab, setActiveTab] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [rooms, setRooms] = useState<TalkRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<TalkRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 실제 데이터 조회 → 채팅방 단위로 그룹핑
  useEffect(() => {
    async function fetchTalkData() {
      setLoading(true);
      try {
        const res = await getAllTalkItems(role === "admin" ? undefined : memberId);
        if (res.success && res.data) {
          // sourceId 기준으로 그룹핑
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
          // 각 채팅방의 메시지를 시간순(오래된→최신) 정렬
          const roomList = Array.from(roomMap.values()).map(room => {
            room.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            room.lastMessage = room.messages[room.messages.length - 1];
            room.unreadCount = room.messages.filter(m => !m.isRead).length;
            return room;
          });
          // 마지막 메시지 기준 최신순 정렬
          roomList.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
          setRooms(roomList);
        }
      } catch (err) {
        console.error("공실Talk 데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTalkData();
  }, [role, memberId]);

  // 채팅방 열면 스크롤을 맨 밑으로
  useEffect(() => {
    if (selectedRoom && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedRoom]);

  // 필터 로직
  const filteredRooms = rooms.filter(room => {
    if (activeTab === "공실 매물" && room.sourceType !== "vacancy") return false;
    if (activeTab === "뉴스 기사" && room.sourceType !== "article") return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!room.sourceTitle.toLowerCase().includes(kw) && !room.lastMessage.content.toLowerCase().includes(kw) && !room.lastMessage.authorName.toLowerCase().includes(kw)) return false;
    }
    return true;
  });

  const getSourceBadge = (type: string) => {
    switch (type) {
      case "vacancy": return <span style={{ padding: "3px 6px", background: darkMode ? "rgba(217, 119, 6, 0.2)" : "#fef3c7", color: "#d97706", borderRadius: 4, fontSize: 10, fontWeight: 800 }}>공실 매물</span>;
      case "article": return <span style={{ padding: "3px 6px", background: darkMode ? "rgba(37, 99, 235, 0.2)" : "#dbeafe", color: "#2563eb", borderRadius: 4, fontSize: 10, fontWeight: 800 }}>뉴스 기사</span>;
      default: return null;
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
    return `${d.getMonth()+1}.${d.getDate()}`;
  };

  const vacancyRoomCount = rooms.filter(r => r.sourceType === "vacancy").length;
  const articleRoomCount = rooms.filter(r => r.sourceType === "article").length;

  const handleReply = () => {
    if (!replyText.trim() || !selectedRoom) return;
    alert(`답글이 등록되었습니다.\n내용: ${replyText}`);
    setReplyText("");
  };

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
        
        {/* ===== 좌측: 채팅방 리스트 ===== */}
        <div style={{ width: selectedRoom ? 380 : "100%", transition: "width 0.3s", borderRight: selectedRoom ? `1px solid ${border}` : "none", display: "flex", flexDirection: "column", background: cardBg, flexShrink: 0 }}>
          
          {/* 탭 */}
          <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc", flexShrink: 0 }}>
            {[
              { label: "전체", count: rooms.length },
              { label: "공실 매물", count: vacancyRoomCount },
              { label: "뉴스 기사", count: articleRoomCount },
            ].map(tab => (
              <button key={tab.label} onClick={() => setActiveTab(tab.label)} style={{
                flex: 1, height: 44, background: "none", border: "none",
                borderBottom: activeTab === tab.label ? "2px solid #3b82f6" : "2px solid transparent",
                color: activeTab === tab.label ? "#3b82f6" : textSecondary,
                fontSize: 13, fontWeight: activeTab === tab.label ? 800 : 600,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
              }}>
                {tab.label}
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 8, background: activeTab === tab.label ? "#3b82f6" : (darkMode ? "#374151" : "#e5e7eb"), color: activeTab === tab.label ? "#fff" : textSecondary }}>{tab.count}</span>
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
            ) : filteredRooms.map(room => (
              <div key={`${room.sourceType}_${room.sourceId}`}
                onClick={() => setSelectedRoom(room)}
                style={{
                  padding: "14px 16px", borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`,
                  cursor: "pointer", transition: "background 0.15s",
                  background: selectedRoom?.sourceId === room.sourceId && selectedRoom?.sourceType === room.sourceType
                    ? (darkMode ? "rgba(59,130,246,0.1)" : "#eff6ff")
                    : "transparent",
                  display: "flex", gap: 12, alignItems: "flex-start"
                }}
                onMouseEnter={e => { if (!(selectedRoom?.sourceId === room.sourceId && selectedRoom?.sourceType === room.sourceType)) e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"; }}
                onMouseLeave={e => { if (!(selectedRoom?.sourceId === room.sourceId && selectedRoom?.sourceType === room.sourceType)) e.currentTarget.style.background = "transparent"; }}
              >
                {/* 아이콘 */}
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: room.sourceType === "vacancy" ? "#fef3c7" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {room.sourceType === "vacancy" ? "🏢" : "📰"}
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
                      <strong style={{ color: textPrimary }}>{room.lastMessage.authorName}</strong>: {room.lastMessage.content}
                    </span>
                    {/* NEW 뱃지 (메시지 수) */}
                    <span style={{ flexShrink: 0, marginLeft: 8, fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "#ef4444", color: "#fff", minWidth: 20, textAlign: "center" }}>
                      {room.messages.length}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 우측: Talk 대화 패널 ===== */}
        {selectedRoom && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: darkMode ? "#1f2023" : "#f0f2f5", minWidth: 0 }}>
            
            {/* 헤더 */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${border}`, background: cardBg, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  {getSourceBadge(selectedRoom.sourceType)}
                  <span style={{ fontSize: 11, color: textSecondary }}>대화 {selectedRoom.messages.length}건</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedRoom.sourceTitle}</h3>
              </div>
              <button onClick={() => setSelectedRoom(null)} style={{ background: "none", border: "none", fontSize: 22, color: textSecondary, cursor: "pointer", padding: "4px 8px" }}>&times;</button>
            </div>

            {/* 대화 영역 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
              {selectedRoom.messages.map((msg, idx) => {
                const isMe = msg.authorName === "공실뉴스"; // 관리자 본인 판별 (간이)
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
                    {/* 아바타 */}
                    {!isMe && (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: darkMode ? "#374151" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>👤</div>
                    )}
                    <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                      {/* 이름 + 시간 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{msg.authorName}</span>
                        {msg.isSecret && <span style={{ fontSize: 11 }}>🔒</span>}
                        <span style={{ fontSize: 11, color: textSecondary }}>{new Date(msg.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {/* 말풍선 */}
                      <div style={{
                        padding: "10px 14px", fontSize: 14, lineHeight: 1.6, color: isMe ? "#fff" : textPrimary,
                        background: isMe ? "#3b82f6" : (darkMode ? "#2c2d31" : "#fff"),
                        borderRadius: isMe ? "12px 0 12px 12px" : "0 12px 12px 12px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)", wordBreak: "break-word"
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* 입력창 */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${border}`, background: cardBg, display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0 }}>
              <textarea
                value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }}}
                placeholder="메시지를 입력하세요..."
                style={{ flex: 1, height: 42, padding: "10px 14px", borderRadius: 8, border: `1px solid ${border}`, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }}
                rows={1}
              />
              <button onClick={handleReply} style={{ height: 42, padding: "0 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" }}>전송</button>
            </div>
          </div>
        )}

        {/* 선택 안 했을 때 안내 */}
        {!selectedRoom && !loading && rooms.length > 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: darkMode ? "#1f2023" : "#f0f2f5" }}>
            <div style={{ textAlign: "center", color: textSecondary }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>대화를 선택하세요</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>좌측 목록에서 Talk방을 클릭하면 대화가 표시됩니다.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
