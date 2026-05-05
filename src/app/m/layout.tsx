import React from "react";
import MobileBottomNav from "./_components/MobileBottomNav";
import GlobalDrawerMenu from './_components/header/GlobalDrawerMenu';
import LocationPermissionInitializer from './_components/LocationPermissionInitializer';
import RealtorApprovalNotice from '@/components/RealtorApprovalNotice';

export const metadata = {
  title: "공실뉴스 (모바일)",
  description: "대한민국 대표 부동산 공실 플랫폼",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenance) {
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#fff' }}>
      </div>
    );
  }

  return (
    <div
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
      {/* 각 페이지의 layout.tsx 또는 page.tsx 에서 헤더를 담당합니다 */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '448px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          overflowX: 'clip',
        }}
      >
        {children}
      </main>

      {/* 공통 하단 탭바 및 전역 드로어 */}
      <React.Suspense fallback={null}>
        <GlobalDrawerMenu />
        <RealtorApprovalNotice />
      </React.Suspense>
      <MobileBottomNav />
      <LocationPermissionInitializer />
    </div>
  );
}
