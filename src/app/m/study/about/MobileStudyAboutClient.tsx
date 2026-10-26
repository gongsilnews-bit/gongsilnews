"use client";

import React from "react";
import { useRouter } from "next/navigation";
import MobileTopBarHeader from "../../_components/MobileTopBarHeader";
import StudySubMenuBar from "../../_components/StudySubMenuBar";
import NewsrealtyLanding from "@/components/newsrealty/NewsrealtyLanding";

// 모바일 공실스터디 소개. PC /study 와 같은 본문을 녹색·공실스터디 멤버십 이름으로 보여 준다 (2026-10-12).
export default function MobileStudyAboutClient() {
  const router = useRouter();

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/m/newsrealty/apply");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
      <MobileTopBarHeader activeTab="study" />
      <StudySubMenuBar activeMenu="about" />
      <NewsrealtyLanding onApply={handleApplyClick} benefitsHref="/m/newsrealty/benefits/brokerage-article" tone="green" showFooter />
    </div>
  );
}
