"use client";

import { useState } from "react";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (room: { title: string; description: string; type: string; avatar: string }) => void;
  userRole?: string; // 'news_premium' | 'registered' | 'general' 등
}

const NAVY = "#1a2e50";
const BLUE = "#508bf5";

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom, userRole }: CreateRoomModalProps) {
  const [step, setStep] = useState<"type" | "info" | "done">("type");
  const [roomType, setRoomType] = useState<"group" | "private">("group");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("🏢");

  // 권한 체크: 공실뉴스부동산 또는 공실등록부동산만 생성 가능
  const canCreate = userRole === "news_premium" || userRole === "registered" || userRole === "ADMIN";

  const EMOJI_OPTIONS = ["🏢", "🏠", "🔥", "💼", "🤝", "📊", "🏙️", "⭐", "💬", "🎯"];

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreateRoom({ title: title.trim(), description: description.trim(), type: roomType, avatar });
    // 초기화
    setStep("type");
    setTitle("");
    setDescription("");
    setAvatar("🏢");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30000000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div style={{ width: 380, maxHeight: "80vh", background: "#fff", borderRadius: 20, boxShadow: "0 12px 48px rgba(0,0,0,0.2)", overflow: "hidden", animation: "modalIn 0.25s ease-out" }}>
        
        {/* 헤더 */}
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>
            {step === "type" ? "채팅방 만들기" : step === "info" ? "방 정보 설정" : "완료"}
          </h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* 권한 없음 */}
        {!canCreate ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>채팅방 생성 권한이 없습니다</h3>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: "0 0 20px" }}>
              채팅방은 <strong style={{ color: BLUE }}>공실뉴스부동산</strong> 또는<br/>
              <strong style={{ color: BLUE }}>공실등록부동산</strong> 회원만 만들 수 있습니다.
            </p>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 10, background: NAVY, color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>확인</button>
          </div>
        ) : step === "type" ? (
          /* ── STEP 1: 방 유형 선택 ── */
          <div style={{ padding: "24px" }}>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>어떤 채팅방을 만드시겠어요?</p>

            {/* 그룹 채팅 */}
            <div
              onClick={() => setRoomType("group")}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, border: `2px solid ${roomType === "group" ? BLUE : "#e5e7eb"}`, background: roomType === "group" ? "#f0f7ff" : "#fff", cursor: "pointer", marginBottom: 12, transition: "all 0.2s" }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: roomType === "group" ? "#dbeafe" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👥</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>그룹 채팅방</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>여러 회원과 정보를 공유하는 채팅방</div>
              </div>
              {roomType === "group" && <div style={{ marginLeft: "auto", color: BLUE, fontSize: 18 }}>✓</div>}
            </div>

            {/* 1:1 채팅 */}
            <div
              onClick={() => setRoomType("private")}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, border: `2px solid ${roomType === "private" ? BLUE : "#e5e7eb"}`, background: roomType === "private" ? "#f0f7ff" : "#fff", cursor: "pointer", transition: "all 0.2s" }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: roomType === "private" ? "#dbeafe" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>💬</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>1:1 채팅</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>특정 회원과 비공개 대화</div>
              </div>
              {roomType === "private" && <div style={{ marginLeft: "auto", color: BLUE, fontSize: 18 }}>✓</div>}
            </div>

            <button onClick={() => setStep("info")} style={{ width: "100%", padding: "12px", borderRadius: 12, background: NAVY, color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", marginTop: 20, transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = BLUE} onMouseLeave={e => e.currentTarget.style.background = NAVY}>
              다음
            </button>
          </div>
        ) : step === "info" ? (
          /* ── STEP 2: 방 정보 입력 ── */
          <div style={{ padding: "24px" }}>
            {/* 아이콘 선택 */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0f4f8", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 8 }}>{avatar}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setAvatar(e)} style={{ width: 32, height: 32, borderRadius: 8, border: avatar === e ? `2px solid ${BLUE}` : "1px solid #e5e7eb", background: avatar === e ? "#eaf4ff" : "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{e}</button>
                ))}
              </div>
            </div>

            {/* 방 이름 */}
            <label style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 4, display: "block" }}>채팅방 이름 *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="예: 강남 상가 교류방"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 }}
              onFocus={e => e.currentTarget.style.borderColor = BLUE} onBlur={e => e.currentTarget.style.borderColor = "#ddd"}
            />

            {/* 방 설명 */}
            <label style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 4, display: "block" }}>소개글 (선택)</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="채팅방 소개를 입력하세요"
              rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 14 }}
              onFocus={e => e.currentTarget.style.borderColor = BLUE} onBlur={e => e.currentTarget.style.borderColor = "#ddd"}
            />

            {/* 역할 안내 */}
            <div style={{ background: "#f8f9fa", borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>내 역할</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>방장</span>
                <span style={{ fontSize: 12, color: "#666" }}>채팅방 관리, 부방장 지정, 회원 승인/초청 가능</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("type")} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#f3f4f6", color: "#555", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>뒤로</button>
              <button onClick={handleCreate} disabled={!title.trim()} style={{ flex: 2, padding: "12px", borderRadius: 12, background: title.trim() ? NAVY : "#ccc", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: title.trim() ? "pointer" : "not-allowed", transition: "background 0.2s" }}
                onMouseEnter={e => { if (title.trim()) e.currentTarget.style.background = BLUE; }} onMouseLeave={e => { if (title.trim()) e.currentTarget.style.background = NAVY; }}>
                방 만들기
              </button>
            </div>
          </div>
        ) : null}

        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
