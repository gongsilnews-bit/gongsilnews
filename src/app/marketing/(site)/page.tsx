import React from "react";
import StudioSiteHeader from "@/components/studio-site/StudioSiteHeader";
import StudioVrewLanding from "@/components/studio-site/StudioVrewLanding";

export const metadata = {
  title: "공실뉴스부동산 | 내 지역 공실! 이제 뉴스로 전달하세요",
  description: "공실 하나로 공실뉴스 기사·블로그·SNS 글과 유튜브 대본을 AI가 만듭니다. 공실뉴스부동산 월 3만원 · 1년 36만원.",
};

// 2026-10-26 사장님: 브루(vrew.ai)식 소개로 — 예전 내용(StudioLanding)은 부품으로 남김
export default function StudioPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <StudioSiteHeader />
      <StudioVrewLanding />
    </div>
  );
}
