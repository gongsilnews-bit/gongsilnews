import React from "react";
import Link from "next/link";
import MobileHeader from "./_components/MobileHeader";
import MobileFooter from "./_components/MobileFooter";
import MobileBottomNav from "./_components/MobileBottomNav";

export const metadata = {
  title: "공실뉴스 (모바일)",
  description: "대한민국 대표 부동산 공실 플랫폼",
};

import PopupBanner from "@/components/PopupBanner";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenance) {
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#fff' }}>
        <PopupBanner />
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col min-h-screen pb-[60px]"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#F4F6F8',
        paddingBottom: '60px',
        fontFamily: "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        letterSpacing: '-0.3px',
        lineHeight: 1.6,
        color: '#333333',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* 모바일 전용 상단 헤더 */}
      <MobileHeader />

      {/* 모바일 메인 콘텐츠 영역 */}
      <main 
        className="flex-1 w-full max-w-md mx-auto bg-white shadow-sm overflow-x-hidden"
        style={{ flex: 1, width: '100%', maxWidth: '448px', margin: '0 auto', backgroundColor: '#ffffff', overflowX: 'hidden', paddingTop: '36px' }}
      >
        {children}
      </main>



      {/* 모바일 전용 하단 탭바 (GNB) */}
      <MobileBottomNav />
    </div>
  );
}
