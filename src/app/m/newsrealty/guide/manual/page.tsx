"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GuideTabs from "@/components/newsrealty/GuideTabs";

export default function MobileGuideManualPage() {
  const router = useRouter();

  const guideCategories = [
    { title: "회원가입 및 입점 절차", desc: "중개사 자격 인증부터 파트너십 승인까지 전 과정 안내.", icon: "📋" },
    { title: "매물 등록 및 AI 기사 송출", desc: "매물 정보 입력 시 AI가 3분 만에 기사화하여 포털 송출.", icon: "📰" },
    { title: "전국 20건+ B2B 공동중개망", desc: "제휴 파트너 간 우량 매물 공유 및 초고속 매칭.", icon: "🤝" },
    { title: "부동산유튜브 무료 아카데미", desc: "스마트폰 촬영부터 AI 쇼츠 제작 전편 무료 수강.", icon: "🎬" },
    { title: "뉴스 배너 광고 영업 리워드", desc: "로컬 광고 유치 시 최대 50% 다이렉트 정산.", icon: "💰" },
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

      <GuideTabs activeTab="manual" isMobile={true} />

      <div style={{ padding: "0 16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 16px 0" }}>이용가이드</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "2px solid #111827", paddingTop: "20px" }}>
          {guideCategories.map((item, idx) => (
            <div key={idx} style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 16px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "26px" }}>{item.icon}</span>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#111827", margin: "0 0 4px 0" }}>{item.title}</h3>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
