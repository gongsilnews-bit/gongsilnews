import React from "react";
import { isAdminRole } from "@/utils/permissionCheck";

interface GongsilRegisterPromoOverlayProps {
  categoryName?: string;
  onClose?: () => void;
  onGoAuction?: () => void;
  currentUser?: any;
  userLevel?: number;
}

export default function GongsilRegisterPromoOverlay({
  categoryName = "공실",
  onClose,
  onGoAuction,
  currentUser,
  userLevel = 0,
}: GongsilRegisterPromoOverlayProps) {
  const isSuperAdmin =
    userLevel >= 5 ||
    isAdminRole(currentUser?.role) ||
    currentUser?.email === "gongsilmarketing@gmail.com";

  const handleRegisterClick = () => {
    const targetUrl = "/realty_admin?menu=gongsil&action=write";
    if (!currentUser) {
      window.location.href = `/login?returnTo=${encodeURIComponent(targetUrl)}`;
    } else {
      window.location.href = targetUrl;
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        background: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 10050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Pretendard', -apple-system, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "90%",
          maxWidth: 460,
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.14), 0 0 1px 1px rgba(0, 0, 0, 0.06)",
          padding: "36px 30px",
          textAlign: "center",
          position: "relative",
          border: "1px solid #e2e8f0",
          animation: "gongsilFadeUp 0.25s ease-out",
        }}
      >
        <style>{`
          @keyframes gongsilFadeUp {
            from { opacity: 0; transform: translateY(12px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* 최고관리자 닫기 버튼 (우측 상단) */}
        {isSuperAdmin && onClose && (
          <button
            onClick={onClose}
            title="최고관리자 매물 열람 모드로 전환 (오버레이 닫기)"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              background: "#1e293b",
              color: "#f8fafc",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 10,
            }}
          >
            <span>👑 열람하기</span>
            <span style={{ fontSize: 14 }}>✕</span>
          </button>
        )}

        {/* 뱃지 */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 20,
            background: isSuperAdmin ? "#fef3c7" : "#eff6ff",
            color: isSuperAdmin ? "#b45309" : "#2563eb",
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <span>{isSuperAdmin ? "👑 최고관리자 개발·검증 모드" : "🏢 부동산 회원 특별 혜택"}</span>
        </div>

        {/* 메인 타이틀 */}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 14px 0",
            letterSpacing: "-0.5px",
            lineHeight: 1.35,
          }}
        >
          내 공동중개 물건 무료 등록하기
        </h2>

        {/* AI 매매 보고서 혜택 박스 */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span>🎁</span>
            <span>AI 매매 보고서 3건 무료</span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              margin: "6px 0 0 0",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            AI 매매보고서를 1초만에 쉽게 만들고<br />
            손님에게 카톡/문자로 전달하세요!
          </p>
        </div>

        {/* 등록하기 CTA 버튼 */}
        <button
          onClick={handleRegisterClick}
          style={{
            width: "100%",
            padding: "15px 20px",
            background: "#2563eb",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#1d4ed8";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#2563eb";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          공실등록 바로가기 &gt;&gt;
        </button>

        {/* 경매/공매 바로가기 버튼 */}
        {onGoAuction && (
          <button
            onClick={onGoAuction}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "13px 18px",
              background: "#f1f5f9",
              color: "#1e293b",
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e2e8f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
            }}
          >
            ⚖️ 전국 1만건 경매·공매 매물 보러가기
          </button>
        )}

        {/* 최고관리자 즉시 열람 버튼 */}
        {isSuperAdmin && onClose && (
          <button
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 18px",
              background: "#0f172a",
              color: "#38bdf8",
              fontSize: 14,
              fontWeight: 800,
              borderRadius: 12,
              border: "1px solid #334155",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1e293b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0f172a";
            }}
          >
            <span>👑 최고관리자: 이 화면 닫고 공실 매물 즉시 열람하기</span>
          </button>
        )}
      </div>
    </div>
  );
}
