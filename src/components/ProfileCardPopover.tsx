"use client";

import { useState, useEffect, useRef } from "react";

interface ProfileCardProps {
  name: string;
  agencyName?: string;
  ceoName?: string;
  bio?: string;
  phone?: string;
  profileImage?: string;
  userId?: string;
  role?: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export default function ProfileCardPopover({
  name,
  agencyName,
  ceoName,
  bio,
  phone,
  profileImage,
  userId,
  role,
  anchorEl,
  onClose,
}: ProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const NAVY = "#1a2e50";
  const BLUE = "#508bf5";

  // 위치 계산
  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const cardW = 260, cardH = 380;
    let top = rect.top - cardH - 8;
    let left = rect.left + rect.width / 2 - cardW / 2;

    // 화면 밖으로 나가면 보정
    if (top < 10) top = rect.bottom + 8;
    if (left < 10) left = 10;
    if (left + cardW > window.innerWidth - 10) left = window.innerWidth - cardW - 10;

    setPos({ top, left });
  }, [anchorEl]);

  // 바깥 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!anchorEl) return null;

  const displayName = agencyName || name;
  const initial = (displayName || "?")[0];
  const isRealtor = role === "REALTOR" || !!agencyName;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999999 }}>
      <div
        ref={cardRef}
        style={{
          position: "absolute",
          top: pos.top,
          left: pos.left,
          width: 260,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
          overflow: "hidden",
          animation: "profileCardIn 0.2s ease-out",
        }}
      >
        {/* 상단 배경 */}
        <div style={{ height: 100, background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, position: "relative" }}>
          {/* 닫기 버튼 */}
          <button onClick={onClose} style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>✕</button>
        </div>

        {/* 프로필 사진 */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: -48, position: "relative", zIndex: 2 }}>
          {profileImage ? (
            <img src={profileImage} alt="" style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "6px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }} />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: NAVY, border: "6px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
              {initial}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div style={{ padding: "12px 20px 16px", textAlign: "center" }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#111", margin: "0 0 2px" }}>{displayName}</h3>
          {ceoName && <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>대표 {ceoName}</p>}
          {isRealtor && agencyName && name !== agencyName && (
            <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>{name}</p>
          )}
          {bio && (
            <p style={{ fontSize: 12, color: "#666", margin: "6px 0 0", padding: "4px 8px", background: "#f8f9fa", borderRadius: 8, display: "inline-block" }}>"{bio}"</p>
          )}

          {/* 액션 버튼들 */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
            {/* 1:1 대화 */}
            <button
              onClick={() => {
                if (userId) {
                  window.dispatchEvent(new CustomEvent("openGongsilTalk", { detail: { userId, userName: displayName, profileImage } }));
                }
                onClose();
              }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#eaf4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>대화</span>
            </button>

            {/* 전화 */}
            {phone && (
              <a href={`tel:${phone}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none", padding: 4 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#e8fce8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>전화</span>
              </a>
            )}

            {/* 매물보기 */}
            {isRealtor && (
              <button
                onClick={() => {
                  // 공실열람에서 해당 소장님 매물 필터링
                  window.location.href = `/gongsil?owner=${userId || ""}`;
                  onClose();
                }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>매물</span>
              </button>
            )}

            {/* 친구추가 */}
            <button
              onClick={() => { onClose(); }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f0e8fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              </div>
              <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>친구추가</span>
            </button>
          </div>
        </div>

        <style>{`
          @keyframes profileCardIn {
            from { opacity: 0; transform: scale(0.92) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
