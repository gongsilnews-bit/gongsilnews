"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GuideTabs from "@/components/newsrealty/GuideTabs";

export default function MobileGuideChatPage() {
  const router = useRouter();

  const channels = [
    { title: "카카오톡 1:1 실시간 상담", desc: "공식 채널을 통해 담당 매니저와 가장 빠른 채팅 상담.", actionText: "카카오톡 상담하기 ➔", href: "https://pf.kakao.com", color: "#fee500", textColor: "#3c1e1e", icon: "💬" },
    { title: "대표 유선 전화 상담", desc: "입점 심사 및 제휴 사항을 전문 상담원과 직통 통화.", actionText: "1555-5343 전화 걸기", href: "tel:1555-5343", color: "#ff8e15", textColor: "#ffffff", icon: "📞" },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: "70px" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button type="button" onClick={() => router.back()} style={{ background: "none", border: "none", fontSize: "18px", color: "#475569", cursor: "pointer", padding: "4px" }}>‹</button>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 800, color: "#111827", textDecoration: "none" }}>공실뉴스부동산</Link>
        </div>
        <Link href="/m/newsrealty/apply" style={{ fontSize: "12.5px", fontWeight: 800, color: "#ffffff", backgroundColor: "#ff8e15", padding: "5px 12px", borderRadius: "6px", textDecoration: "none" }}>입점신청</Link>
      </header>

      <GuideTabs activeTab="chat" isMobile={true} />

      <div style={{ padding: "0 16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 16px 0" }}>실시간상담</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", borderTop: "2px solid #111827", paddingTop: "20px" }}>
          {channels.map((ch, idx) => (
            <div key={idx} style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "26px" }}>{ch.icon}</span>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: 0 }}>{ch.title}</h3>
              </div>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5, margin: "0 0 16px 0" }}>{ch.desc}</p>
              <a href={ch.href} style={{ display: "block", width: "100%", padding: "12px", backgroundColor: ch.color, color: ch.textColor, textAlign: "center", fontWeight: 800, fontSize: "14px", borderRadius: "8px", textDecoration: "none", boxSizing: "border-box" }}>
                {ch.actionText}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
