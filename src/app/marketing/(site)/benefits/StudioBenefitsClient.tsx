"use client";

import React from "react";
import { useRouter } from "next/navigation";
import StudioSiteHeader from "@/components/studio-site/StudioSiteHeader";
import StudioBenefits from "@/components/studio-site/StudioBenefits";

// 공실마케팅 메뉴 줄이 화면 위에 붙었을 때의 높이. 혜택 탭 줄이 그 아래에 붙는다.
const STUCK_HEADER_HEIGHT = 65;

export default function StudioBenefitsClient() {
  const router = useRouter();

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/marketing/apply");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
      <StudioSiteHeader />
      {/* 강의 업로딩만 [자세히 보기] → 부동산특강이란? (2026-10-26) */}
      <StudioBenefits onApply={handleApplyClick} tabsTop={STUCK_HEADER_HEIGHT} detailHrefs={{ lecture: "/study/about" }} />
    </div>
  );
}
