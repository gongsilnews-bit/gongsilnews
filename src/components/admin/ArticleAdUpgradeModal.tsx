"use client";

import React from "react";
import Link from "next/link";

interface ArticleAdUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ArticleAdUpgradeModal({ isOpen, onClose }: ArticleAdUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 10000,
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
          maxWidth: 440,
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          padding: "36px 28px",
          textAlign: "center",
          position: "relative",
          animation: "upgradeModalFadeIn 0.2s ease-out",
        }}
      >
        <style>{`
          @keyframes upgradeModalFadeIn {
            from { opacity: 0; transform: translateY(10px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* 닫기 ✕ 버튼 */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "none",
            border: "none",
            fontSize: 20,
            color: "#94a3b8",
            cursor: "pointer",
            padding: 4,
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* 뱃지 아이콘 */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 16px auto",
          }}
        >
          📰
        </div>

        {/* 메인 타이틀 */}
        <h2
          style={{
            fontSize: 21,
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 10px 0",
            letterSpacing: "-0.4px",
          }}
        >
          공실뉴스기자 전용 페이지입니다
        </h2>

        {/* 서브 설명 */}
        <p
          style={{
            fontSize: 14,
            color: "#475569",
            lineHeight: 1.55,
            margin: "0 0 24px 0",
            wordBreak: "keep-all",
          }}
        >
          기사 하단에 맞춤 광고 및 홍보 배너를 등록하여<br />
          <strong>강력한 브랜딩 및 마케팅 효과</strong>를 누려보세요!
        </p>

        {/* 혜택 목록 카드 */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "16px 18px",
            textAlign: "left",
            marginBottom: 24,
            fontSize: 13,
            color: "#334155",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: "#2563eb", fontWeight: 700 }}>✓</span>
            <span>내 기사 하단에 <strong>중개업소 프로필 & 보유 공실 현황</strong> 자동 노출</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: "#2563eb", fontWeight: 700 }}>✓</span>
            <span>직접 제작한 <strong>홍보/분양 와이드 배너</strong> 자유 등록 및 링크 연동</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: "#2563eb", fontWeight: 700 }}>✓</span>
            <span>기사별 체크박스 선택으로 <strong>한 번에 일괄 배너 적용 및 기간 설정</strong></span>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/realty_admin?menu=settings&tab=plan"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 12,
              textDecoration: "none",
              display: "block",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
              transition: "all 0.15s",
            }}
          >
            공실뉴스기자 멤버십 신청 및 안내 바로가기 →
          </Link>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "11px 16px",
              background: "#f1f5f9",
              color: "#64748b",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
