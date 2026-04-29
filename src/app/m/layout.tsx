import React from "react";
import Link from "next/link";
import MobileHeader from "./_components/MobileHeader";
import MobileFooter from "./_components/MobileFooter";
import MobileBottomNav from "./_components/MobileBottomNav";

export const metadata = {
  title: "공실뉴스 (모바일)",
  description: "대한민국 대표 부동산 공실 플랫폼",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="flex flex-col min-h-screen bg-gray-50 pb-[60px]"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '60px' }}
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

      {/* 모바일 전용 하단 푸터 */}
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto' }}>
        <MobileFooter />
      </div>

      {/* 모바일 전용 하단 탭바 (GNB) */}
      <MobileBottomNav />
    </div>
  );
}
