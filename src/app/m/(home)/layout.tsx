import React from "react";
import HomeHeader from "../_components/HomeHeader";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 홈 전용 헤더 */}
      <HomeHeader />

      {/* 홈 콘텐츠 — 헤더(36px) 높이만큼 padding */}
      <div style={{ paddingTop: '36px' }}>
        {children}
      </div>
    </>
  );
}
