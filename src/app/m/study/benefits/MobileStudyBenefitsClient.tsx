"use client";

import React from "react";
import { useRouter } from "next/navigation";
import NewsrealtyBenefits from "@/components/newsrealty/NewsrealtyBenefits";

// 모바일 공실스터디 멤버십혜택. PC /study/benefits 와 같은 본문·탭을 녹색·공실스터디 이름으로 보여 준다 (2026-10-12).

// 위에 붙는 뒤로가기 바 높이. 혜택 탭 줄이 그 아래에 붙는다.
const BACK_BAR_HEIGHT = 48;

export default function MobileStudyBenefitsClient() {
  const router = useRouter();

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/m/study/apply");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
      {/* 심플 뒤로가기 바 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 9999990,
        background: "#ffffff", borderBottom: "1px solid #e5e7eb",
        padding: "0 12px", height: BACK_BAR_HEIGHT, boxSizing: "border-box",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <button
          type="button"
          onClick={() => window.history.back()}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontSize: "16px", fontWeight: 800, color: "#1c1917" }}>멤버십 혜택</span>
      </div>

      <NewsrealtyBenefits onApply={handleApplyClick} inquiryHref="/m/help" tabsTop={BACK_BAR_HEIGHT} showFooter tone="green" />
    </div>
  );
}
