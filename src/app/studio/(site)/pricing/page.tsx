import React from "react";
import StudioSiteHeader from "@/components/studio-site/StudioSiteHeader";
import StudioPriceTable from "@/components/studio-site/StudioPriceTable";

export const metadata = {
  title: "금액안내 | 공실스튜디오",
  description: "공실뉴스부동산은 무료, 공실스튜디오 멤버십은 월 3만원 · 1년 36만원.",
};

// 2026-10-26 사장님: 브루 가격 정책처럼 심플하게, 비교할 수 있게 — 예전 금액 화면(StudioPricing)은 부품으로 남김
export default function StudioPricingPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <StudioSiteHeader />
      <StudioPriceTable />
    </div>
  );
}
