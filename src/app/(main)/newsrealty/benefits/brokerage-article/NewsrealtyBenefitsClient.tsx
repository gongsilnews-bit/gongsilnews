"use client";

import React from "react";
import { useRouter } from "next/navigation";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import NewsrealtyBenefits from "@/components/newsrealty/NewsrealtyBenefits";

// 공실뉴스부동산 메뉴 줄이 화면 위에 붙었을 때의 높이. 혜택 탭 줄이 그 아래에 붙는다.
const STUCK_HEADER_HEIGHT = 65;

export default function NewsrealtyBenefitsClient() {
  const router = useRouter();

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/newsrealty/apply");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
      <NewsrealtyHeader />
      <NewsrealtyBenefits onApply={handleApplyClick} tabsTop={STUCK_HEADER_HEIGHT} />
    </div>
  );
}
