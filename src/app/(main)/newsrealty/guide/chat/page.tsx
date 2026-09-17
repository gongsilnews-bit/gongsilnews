"use client";

import React from "react";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import GuideTabs from "@/components/newsrealty/GuideTabs";

export default function GuideChatPage() {
  const channels = [
    {
      title: "카카오톡 1:1 실시간 상담",
      desc: "공실뉴스 공식 카카오톡 채널을 통해 담당 매니저와 가장 빠르고 편리하게 실시간 채팅 상담이 가능합니다.",
      actionText: "카카오톡 상담 시작하기 ➔",
      href: "https://pf.kakao.com",
      badge: "가장 빠른 응답",
      icon: "💬",
      color: "#fee500",
      textColor: "#3c1e1e",
    },
    {
      title: "대표 유선 전화 상담",
      desc: "공실뉴스부동산 입점 심사 및 제휴 관련 사항을 전문 상담원과 전화로 직접 상담받으실 수 있습니다.",
      actionText: "1555-5343 전화 걸기",
      href: "tel:1555-5343",
      badge: "평일 10:00 ~ 18:00",
      icon: "📞",
      color: "#ff8e15",
      textColor: "#ffffff",
    },
    {
      title: "온라인 원격 기술 지원",
      desc: "시스템 이용, 매물 일괄 등록, 사진 업로드 오류 등 기술적인 문제가 발생했을 때 실시간 원격 지원을 제공합니다.",
      actionText: "원격 지원 요청하기",
      href: "tel:1555-5343",
      badge: "파트너 전용",
      icon: "💻",
      color: "#1e293b",
      textColor: "#ffffff",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 직방 호갱노노 CEO 1:1 동일 4분할 탭 ━━━ */}
      <GuideTabs activeTab="chat" />

      {/* ━━━ 본문 영역 ━━━ */}
      <main style={{ maxWidth: "1000px", margin: "0 auto 100px", padding: "0 20px" }}>
        {/* 타이틀 */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            실시간상담
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            공실뉴스 전문 전담팀이 소장님의 중개 업무에 지장이 없도록 실시간으로 답변해 드립니다.
          </p>
        </div>

        {/* 상담 채널 리스트 (직방 스타일 상단 굵은 실선) */}
        <div style={{ borderTop: "2px solid #111827", paddingTop: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {channels.map((ch, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "24px",
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ff8e15")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
            >
              <div style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "32px" }}>{ch.icon}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: 0 }}>
                      {ch.title}
                    </h3>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: "#ffffff",
                        border: "1px solid #d1d5db",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        color: "#4b5563",
                      }}
                    >
                      {ch.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5, margin: 0, maxWidth: "560px" }}>
                    {ch.desc}
                  </p>
                </div>
              </div>

              <div style={{ flexShrink: 0 }}>
                <a
                  href={ch.href}
                  target={ch.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    backgroundColor: ch.color,
                    color: ch.textColor,
                    fontSize: "14px",
                    fontWeight: 800,
                    borderRadius: "8px",
                    textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ch.actionText}
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}
