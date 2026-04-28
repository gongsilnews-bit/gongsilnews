"use client";

import { useState } from "react";

/* ──────────────────────── 더미 데이터 ──────────────────────── */
const DUMMY_ROOMS = [
  { id: "1", type: "group", title: "강남 상가 교류방", members: 32, lastMsg: "급매물 정보 공유합니다. 강남역 1번출구 상가 32평...", lastTime: "오후 3:14", unread: 3, avatar: "🏢" },
  { id: "2", type: "group", title: "서초구 소장 모임", members: 18, lastMsg: "다음 주 목요일 정기 모임 참석하실 분?", lastTime: "오후 2:30", unread: 0, avatar: "🤝" },
  { id: "3", type: "group", title: "급매물 공유방", members: 45, lastMsg: "마포구 오피스텔 급매 나왔습니다", lastTime: "오후 1:20", unread: 12, avatar: "🔥" },
  { id: "4", type: "private", title: "김동현 소장님", members: 2, lastMsg: "네, 내일 오후에 현장 같이 볼까요?", lastTime: "오전 11:45", unread: 1, avatar: "👤" },
  { id: "5", type: "private", title: "박미영 대표", members: 2, lastMsg: "계약서 확인 부탁드립니다", lastTime: "어제", unread: 0, avatar: "👤" },
  { id: "6", type: "group", title: "송파구 오피스 정보", members: 21, lastMsg: "잠실 새내역 오피스 공실률이 많이 낮아졌네요", lastTime: "어제", unread: 0, avatar: "🏙️" },
];

const DUMMY_MESSAGES = [
  { id: "m1", authorId: "other1", authorName: "미소탑공인", avatar: "🏠", content: "강남역 근처 상가 32평 급매물 나왔습니다.\n관심있으신 분 연락주세요!", time: "오후 2:56", isMe: false, role: "owner" },
  { id: "m2", authorId: "me", authorName: "나", avatar: "", content: "네 감사합니다. 위치 좀 더 알려주실 수 있나요?", time: "오후 3:01", isMe: true },
  { id: "m3", authorId: "other2", authorName: "박소장", avatar: "👤", content: "저도 관심있습니다. 평당가 얼마인가요?", time: "오후 3:05", isMe: false },
  { id: "m4", authorId: "other1", authorName: "미소탑공인", avatar: "🏠", content: "평당 2,800만원 수준입니다.\n현재 임차인 없이 깨끗한 상태입니다.\n사진 보내드릴게요!", time: "오후 3:08", isMe: false, role: "owner" },
  { id: "m5", authorId: "me", authorName: "나", avatar: "", content: "좋습니다! 내일 오후에 현장 방문 가능할까요?", time: "오후 3:10", isMe: true },
  { id: "m6", authorId: "other1", authorName: "미소탑공인", avatar: "🏠", content: "네, 내일 오후 2시에 현장에서 뵙겠습니다.\n주소는 강남구 역삼동 123-45 입니다.", time: "오후 3:14", isMe: false, role: "owner" },
];

const DUMMY_CONTACTS = [
  { id: "c1", name: "김동현 소장님", company: "우정공인중개사무소", avatar: "👤", status: "강남구 상가 전문" },
  { id: "c2", name: "미소탑공인", company: "미소탑공인중개사", avatar: "🏠", status: "역삼동 10년차" },
  { id: "c3", name: "박미영 대표", company: "원앤원중개법인", avatar: "👤", status: "오피스/상가 매매" },
  { id: "c4", name: "이상윤 소장", company: "브루시 부동산", avatar: "👤", status: "서초구 전문" },
  { id: "c5", name: "최은숙 대표", company: "독일집공인", avatar: "👤", status: "송파구 아파트" },
];

type LnbTab = "contacts" | "chats" | "notifications" | "settings";

export default function GongsilTalkPage() {
  const [activeTab, setActiveTab] = useState<LnbTab>("chats");
  const [selectedRoom, setSelectedRoom] = useState<string | null>("1");
  const [chatFilter, setChatFilter] = useState<"all" | "unread">("all");
  const [messageInput, setMessageInput] = useState("");

  const filteredRooms = chatFilter === "unread" ? DUMMY_ROOMS.filter(r => r.unread > 0) : DUMMY_ROOMS;
  const currentRoom = DUMMY_ROOMS.find(r => r.id === selectedRoom);
  const totalUnread = DUMMY_ROOMS.reduce((a, r) => a + r.unread, 0);

  /* ── 스타일 상수 ── */
  const NAVY = "#1a2e50";
  const BLUE = "#508bf5";
  const LNB_BG = "#2c4a7c"; // 좀 더 밝은 스틸 블루

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'Pretendard', sans-serif" }}>

      {/* ────── 좌측 LNB (밝은 스틸블루) ────── */}
      <div style={{ width: 64, minWidth: 64, background: LNB_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 4 }}>
        {/* 내 프로필 아이콘 */}
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", marginBottom: 16, cursor: "pointer" }}>
          👤
        </div>

        {/* 탭 버튼들 */}
        {([
          { tab: "contacts" as LnbTab, label: "친구", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          { tab: "chats" as LnbTab, label: "채팅", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, badge: totalUnread },
          { tab: "notifications" as LnbTab, label: "알림", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
        ]).map(item => (
          <button
            key={item.tab}
            onClick={() => setActiveTab(item.tab)}
            title={item.label}
            style={{
              width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              background: activeTab === item.tab ? "rgba(255,255,255,0.25)" : "transparent",
              color: activeTab === item.tab ? "#fff" : "rgba(255,255,255,0.6)",
              border: "none", cursor: "pointer", transition: "all 0.2s", position: "relative",
            }}
            onMouseEnter={e => { if (activeTab !== item.tab) { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; } }}
            onMouseLeave={e => { if (activeTab !== item.tab) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; } }}
          >
            {item.icon}
            {item.badge && item.badge > 0 && (
              <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* 설정 */}
        <button
          onClick={() => setActiveTab("settings")}
          title="설정"
          style={{
            width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: activeTab === "settings" ? "rgba(255,255,255,0.25)" : "transparent",
            color: activeTab === "settings" ? "#fff" : "rgba(255,255,255,0.6)",
            border: "none", cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => { if (activeTab !== "settings") { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; } }}
          onMouseLeave={e => { if (activeTab !== "settings") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; } }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      {/* ────── 중앙 리스트 패널 ────── */}
      <div style={{ width: 320, minWidth: 320, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
        {/* 헤더 */}
        <div style={{ padding: "20px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: 0 }}>
              {activeTab === "contacts" ? "친구" : activeTab === "chats" ? "채팅" : activeTab === "notifications" ? "알림" : "설정"}
            </h2>
            <div style={{ display: "flex", gap: 4 }}>
              {/* 검색 */}
              <button style={{ width: 34, height: 34, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </button>
              {activeTab === "chats" && (
                <button style={{ width: 34, height: 34, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }} title="새 채팅"
                  onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* 채팅 필터 탭 */}
          {activeTab === "chats" && (
            <div style={{ display: "flex", gap: 8 }}>
              {(["all", "unread"] as const).map(f => (
                <button key={f} onClick={() => setChatFilter(f)}
                  style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.2s", background: chatFilter === f ? NAVY : "#f3f4f6", color: chatFilter === f ? "#fff" : "#555" }}>
                  {f === "all" ? "전체" : "안읽음"}
                  {f === "unread" && <span style={{ marginLeft: 4, background: "#ef4444", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 10 }}>{DUMMY_ROOMS.filter(r => r.unread > 0).length}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 리스트 콘텐츠 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* ── 채팅방 목록 ── */}
          {activeTab === "chats" && filteredRooms.map(room => (
            <div key={room.id} onClick={() => setSelectedRoom(room.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", transition: "background 0.15s", background: selectedRoom === room.id ? "#ebf5ff" : "transparent" }}
              onMouseEnter={e => { if (selectedRoom !== room.id) e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={e => { if (selectedRoom !== room.id) e.currentTarget.style.background = "transparent"; }}
            >
              {/* 아바타 */}
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {room.avatar}
              </div>
              {/* 텍스트 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {room.title}
                    {room.type === "group" && <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 4, fontSize: 12 }}>{room.members}</span>}
                  </span>
                  <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0, marginLeft: 8 }}>{room.lastTime}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 13, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, paddingRight: 8 }}>{room.lastMsg}</p>
                  {room.unread > 0 && (
                    <span style={{ background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 10, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0 }}>
                      {room.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* ── 친구 목록 ── */}
          {activeTab === "contacts" && (
            <>
              {/* 내 프로필 카드 */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>내 프로필</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>공실뉴스 회원</div>
                  </div>
                </div>
              </div>

              {/* 친구 수 라벨 */}
              <div style={{ padding: "14px 16px 8px", fontSize: 12, color: "#aaa", fontWeight: 600 }}>
                친구 {DUMMY_CONTACTS.length}
              </div>

              {/* 친구 리스트 */}
              {DUMMY_CONTACTS.map(c => (
                <div key={c.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {c.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#222" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{c.company} · {c.status}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── 알림 ── */}
          {activeTab === "notifications" && (
            <div style={{ padding: "60px 16px", textAlign: "center", color: "#bbb", fontSize: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              새로운 알림이 없습니다
            </div>
          )}

          {/* ── 설정 ── */}
          {activeTab === "settings" && (
            <div style={{ padding: "8px 12px" }}>
              {["알림 설정", "채팅 설정", "개인정보 관리", "차단 관리", "고객센터"].map(item => (
                <button key={item}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 12px", borderRadius: 8, border: "none", background: "transparent", fontSize: 14, color: "#444", fontWeight: 500, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{item}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ────── 우측 대화방 영역 ────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#d5e3f0", minWidth: 0 }}>
        {selectedRoom && currentRoom ? (
          <>
            {/* 헤더 */}
            <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: "#111", margin: 0 }}>{currentRoom.title}</h3>
                {currentRoom.type === "group" && <span style={{ fontSize: 13, color: "#aaa" }}>{currentRoom.members}</span>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ width: 34, height: 34, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </button>
                <button style={{ width: 34, height: 34, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* 메시지 영역 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
              {DUMMY_MESSAGES.map(msg => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.isMe ? "flex-end" : "flex-start", marginBottom: 16 }}>
                  {/* 상대방 메시지 */}
                  {!msg.isMe && (
                    <div style={{ display: "flex", gap: 8, maxWidth: "70%" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                        {msg.avatar}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#444" }}>{msg.authorName}</span>
                          {msg.role === "owner" && <span style={{ fontSize: 11 }}>👑</span>}
                        </div>
                        <div style={{ background: "#ffffff", borderRadius: "4px 18px 18px 18px", padding: "10px 14px", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
                          <p style={{ fontSize: 14, color: "#222", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                        </div>
                        <span style={{ fontSize: 11, color: "#999", marginTop: 4, marginLeft: 4, display: "inline-block" }}>{msg.time}</span>
                      </div>
                    </div>
                  )}
                  {/* 내 메시지 */}
                  {msg.isMe && (
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{ background: NAVY, borderRadius: "18px 4px 18px 18px", padding: "10px 14px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                        <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4, marginRight: 4 }}>
                        <span style={{ fontSize: 11, color: "#999" }}>{msg.time}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 매물 카드 공유 예시 */}
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, maxWidth: "75%" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    🏠
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#444" }}>미소탑공인</span>
                      <span style={{ fontSize: 11 }}>👑</span>
                    </div>
                    <div style={{ background: "#fff", borderRadius: "4px 18px 18px 18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                      <div style={{ width: "100%", height: 120, background: "linear-gradient(135deg, #e3edf7, #c7d9f0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 }}>🏢</div>
                      <div style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>강남역 1번출구 상가</p>
                        <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>강남구 역삼동 123-45 · 32평</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: BLUE, margin: "0 0 10px" }}>보증금 5,000 / 월세 350</p>
                        <button style={{ width: "100%", padding: "8px 0", borderRadius: 8, background: BLUE, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
                          자세히 보기
                        </button>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#999", marginTop: 4, marginLeft: 4, display: "inline-block" }}>오후 3:15</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 입력창 */}
            <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: 12, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button style={{ width: 38, height: 38, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0, color: "#fff" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="메시지를 입력하세요"
                style={{ flex: 1, background: "#f3f4f6", borderRadius: 20, padding: "10px 16px", fontSize: 14, border: "none", outline: "none", color: "#222" }}
              />
              <button style={{ padding: "10px 20px", borderRadius: 20, background: BLUE, color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0 }}>
                전송
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#999" }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 4px" }}>공실Talk</p>
            <p style={{ fontSize: 14, margin: 0 }}>대화할 채팅방을 선택해 주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
