"use client";

import React from "react";
import { useRouter } from "next/navigation";
import StudyHeader from "@/components/study/StudyHeader";
import NewsrealtyBenefits from "@/components/newsrealty/NewsrealtyBenefits";

// 공실스터디 멤버십혜택(/study/benefits). 공실뉴스부동산 혜택(/newsrealty/benefits/brokerage-article)과 같은 본문·탭을
// 녹색·공실스터디 이름으로 보여 준다. 멤버십은 "공실스터디 멤버십" 하나 (2026-10-12).

// 혜택별 [자세히 보기] 상세 페이지 (PC 만. 예전 상세 페이지가 PC용이라 모바일은 요약만 보여 준다)
const DETAIL_HREFS = {
  cobroker: "/study/benefits/vacancy-register",
  report: "/study/benefits/vacancy-register",
  blog: "/study/benefits/blog-automation",
  video: "/study/benefits/ai-youtube",
  lecture: "/study/benefits/lecture-upload",
};

// 공실스터디 메뉴 줄이 화면 위에 붙었을 때의 높이. 혜택 탭 줄이 그 아래에 붙는다.
const STUCK_HEADER_HEIGHT = 65;

export default function StudyBenefitsClient() {
  const router = useRouter();

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/study/apply");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
      <StudyHeader />
      <NewsrealtyBenefits onApply={handleApplyClick} tabsTop={STUCK_HEADER_HEIGHT} tone="green" detailHrefs={DETAIL_HREFS} />
    </div>
  );
}
