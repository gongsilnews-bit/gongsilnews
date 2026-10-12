"use client";

import React from "react";
import { useRouter } from "next/navigation";
import StudyHeader from "@/components/study/StudyHeader";
import NewsrealtyLanding from "@/components/newsrealty/NewsrealtyLanding";

// 공실스터디란?(/study) 본문 — 공실뉴스부동산 소개(/newsrealty)와 같은 본문을 녹색·공실스터디 이름으로 보여 준다.
// 멤버십은 "공실스터디 멤버십" 하나 (2026-10-12).
export default function StudyNewsrealtyClient() {
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
      <NewsrealtyLanding onApply={handleApplyClick} tone="green" benefitsHref="/study/benefits" />
    </div>
  );
}
