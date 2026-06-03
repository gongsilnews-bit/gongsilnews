import React from "react";
import HomeHeader from "../_components/HomeHeader";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ???„ìš© ?¤ë” */}
      <HomeHeader />

      {/* ??ì½˜í…ì¸????¤ë”(50px) ?’ì´ë§Œí¼ padding */}
      <div style={{ paddingTop: '50px' }}>
        {children}
      </div>
    </>
  );
}
