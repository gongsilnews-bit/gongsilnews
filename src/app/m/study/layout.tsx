import React from "react";
import SubPageHeader from "../_components/SubPageHeader";

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubPageHeader />
      <div style={{ paddingTop: '36px' }}>
        {children}
      </div>
    </>
  );
}
