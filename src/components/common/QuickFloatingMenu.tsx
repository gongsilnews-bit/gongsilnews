"use client";

import { useState } from "react";

export default function QuickFloatingMenu() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="quick-menu" style={{ overflow: "visible", border: "none", boxShadow: "none", background: "transparent", width: 130 }}>
      {/* 빠른메뉴 헤더 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "linear-gradient(135deg, #3b5998, #4a6fad)",
          color: "#fff",
          border: "none",
          borderRadius: isOpen ? "8px 8px 0 0" : "8px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "-0.3px",
          transition: "border-radius 0.2s",
        }}
      >
        빠른메뉴
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 메뉴 아이템 영역 */}
      <div style={{
        maxHeight: isOpen ? "300px" : "0",
        overflow: "hidden",
        transition: "max-height 0.3s ease",
        background: "#fff",
        border: isOpen ? "1px solid #e0e0e0" : "1px solid transparent",
        borderTop: "none",
        borderRadius: "0 0 8px 8px",
        boxShadow: isOpen ? "0 4px 15px rgba(0,0,0,0.1)" : "none",
      }}>
        {/* 관심매물 */}
        <div
          onClick={() => window.location.href = "/gongsil"}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          찜한공실
        </div>

        {/* 관심기사 */}
        <div
          onClick={() => window.location.href = "/news_all?mode=bookmarks"}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          관심기사
        </div>

        {/* 카카오톡 실시간상담 */}
        <div
          onClick={() => window.open("https://pf.kakao.com/_ckHkG/chat", "_blank")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect width="24" height="24" rx="5" fill="#FEE500"/>
            <path d="M12 5.5C7.3 5.5 3.5 8.35 3.5 11.87c0 2.22 1.5 4.19 3.75 5.3l-.95 3.55c-.08.31.25.55.51.38l4.2-2.77c.33.03.67.05 1.02.05 4.7 0 8.5-2.85 8.5-6.37S16.7 5.5 12 5.5z" fill="#3A1D1D"/>
            <text x="12" y="14.3" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="6.5" fill="#FEE500" textAnchor="middle">TALK</text>
          </svg>
          실시간상담
        </div>

        {/* 1:1 문의 */}
        <div
          onClick={() => window.location.href = "#"}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          1:1문의
        </div>
      </div>

      {/* TOP 버튼 — 항상 노출 */}
      <div
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          marginTop: 8,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "10px 0", cursor: "pointer",
          background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          fontSize: 12, fontWeight: 700, color: "#555",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
        TOP
      </div>
    </div>
  );
}
