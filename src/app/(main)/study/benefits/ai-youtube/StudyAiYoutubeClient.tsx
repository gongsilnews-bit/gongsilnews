"use client";

import React from "react";
import StudyHeader from "@/components/study/StudyHeader";
import StudyBenefitsSubNav from "@/components/study/StudyBenefitsSubNav";

// 멤버십혜택 - AI유튜브강의무료
// 껍데기만 잡아둔 상태. 내용은 아직 채우지 않았다.
export default function StudyAiYoutubeClient() {
  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#132e27", minHeight: "100vh" }}>
      <StudyHeader />
      <StudyBenefitsSubNav active="ai-youtube" />

      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "80px 24px 160px" }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-1px", margin: "0 0 12px 0", color: "#062828" }}>
          AI유튜브강의무료
        </h1>
        <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>
          준비 중입니다.
        </p>
      </section>
    </div>
  );
}
