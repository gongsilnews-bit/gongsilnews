import React from "react";
import MobileBottomNav from "./_components/MobileBottomNav";

import LocationPermissionInitializer from './_components/LocationPermissionInitializer';
import RealtorApprovalNotice from '@/components/RealtorApprovalNotice';
import ComingSoon from "@/components/common/ComingSoon";

export const metadata = {
  title: "ê³µì‹¤?´ìŠ¤ (ëª¨ë°”??",
  description: "?€?œë?êµ??€??ë¶€?™ì‚° ê³µì‹¤ ?Œë«??,
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  // const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  // if (isMaintenance) {
  //   return (
  //     <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#fff' }}>
  //       <ComingSoon />
  //     </div>
  //   );
  // }

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
      {/* ëª¨ë°”??ê²½ë¡œ?ì„œ ?°ìŠ¤?¬íƒ‘ ?„ìš© body min-width ê°•ì œ ?´ì œ */}
      <style>{`body { min-width: auto !important; }`}</style>
      {/* ê°??˜ì´ì§€??layout.tsx ?ëŠ” page.tsx ?ì„œ ?¤ë”ë¥??´ë‹¹?©ë‹ˆ??*/}
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

      {/* ê³µí†µ ?˜ë‹¨ ??°” ë°??„ì—­ ?œë¡œ??*/}
      <React.Suspense fallback={null}>
        <RealtorApprovalNotice />
      </React.Suspense>
      <MobileBottomNav />
      <LocationPermissionInitializer />
    </div>
  );
}
