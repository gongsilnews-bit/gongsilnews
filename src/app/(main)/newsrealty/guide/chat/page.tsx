"use client";

import React from "react";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import GuideTabs from "@/components/newsrealty/GuideTabs";
import { openChannelTalk } from "@/utils/channelTalk";

export default function GuideChatPage() {
  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 4분할 탭 ━━━ */}
      <GuideTabs activeTab="chat" />

      {/* ━━━ 본문 영역 ━━━ */}
      <main style={{ maxWidth: "800px", margin: "0 auto 100px", padding: "0 20px" }}>
        {/* 타이틀 */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            실시간상담
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            상담 시간: 평일 오전 10:00 ~ 17:00 (점심 12:00 ~ 13:00)
          </p>
        </div>

        {/* 상담 시작 */}
        <div style={{ borderTop: "2px solid #111827", paddingTop: "56px", paddingBottom: "56px", textAlign: "center" }}>
          <button
            type="button"
            onClick={() => openChannelTalk()}
            style={{
              padding: "15px 44px",
              backgroundColor: "#ff8e15",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 800,
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(255, 142, 21, 0.3)",
            }}
          >
            실시간 채팅 시작하기
          </button>
          <p style={{ fontSize: "15px", color: "#475569", margin: "22px 0 0 0", lineHeight: 1.7 }}>
            궁금하신 점을 남겨주시면 담당자가 순서대로 답변해 드립니다.
          </p>
        </div>
      </main>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}
