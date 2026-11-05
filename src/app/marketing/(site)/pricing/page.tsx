import React from "react";
import StudioSiteHeader from "@/components/studio-site/StudioSiteHeader";
import StudioPriceTable from "@/components/studio-site/StudioPriceTable";

export const metadata = {
  title: "금액안내 | 공실뉴스부동산",
  description: "부동산회원은 무료, 공실뉴스부동산은 월 3만원 · 1년 36만원.",
};

// 2026-10-26 사장님: 브루 가격 정책처럼 심플하게, 비교할 수 있게 — 예전 금액 화면(StudioPricing)은 부품으로 남김
export default function StudioPricingPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <StudioSiteHeader />
      <StudioPriceTable />
      {/* 비교표는 소개 첫 화면 맨 아래로 다시 옮김 (2026-11-05 사장님: "메인 하단으로") */}
    </div>
  );
}
