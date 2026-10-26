import React from "react";
import Link from "next/link";
import StudyLanding from "@/components/study/StudyLanding";
import StudyBackButton from "@/components/study/StudyBackButton";

export const metadata = {
  title: "부동산특강이란? | 공실뉴스",
  description:
    "내 지역, 단지, 물건 정보를 이제 유튜브 강의로. 부동산 대표님도 부동산특강 강사가 될 수 있습니다.",
};

// 부동산특강이란? (2026-10-26 사장님: 예전 /study/benefits/lecture-upload 가 실질적인 부동산특강 설명 페이지라 여기로)
// 들어오는 길: 특강 첫 화면 배너 [부동산특강이란?] · 공실뉴스부동산 혜택 "강의 업로딩" [자세히 보기]
// 메인 헤더 없이 강의 상세(/study_read)와 같은 경로 줄 [‹ 이전화면 │ 부동산특강 › 부동산특강이란?]
export default function StudyAboutPage() {
  return (
    <>
      <div style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "12px 24px", fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
          <StudyBackButton />
          <Link href="/study" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>부동산특강</Link>
          <span>›</span>
          <span style={{ color: "#334155", fontWeight: 600 }}>부동산특강이란?</span>
        </div>
      </div>
      <StudyLanding />
    </>
  );
}
