import React from "react";
import SubPageHeader from "../_components/SubPageHeader";

export default function MypageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubPageHeader title="마이페이지" />
      <div style={{ paddingTop: '36px' }}>
        {children}
      </div>
    </>
  );
}
