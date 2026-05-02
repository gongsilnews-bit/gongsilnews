import React from "react";
import SubPageHeader from "../_components/SubPageHeader";
import StudyDetailPage from "../../(main)/study_read/page";

export default function MobileStudyReadPage(props: any) {
  return (
    <>
      <SubPageHeader title="부동산 특강 상세" />
      <div style={{ paddingBottom: 60 }}>
        <StudyDetailPage {...props} />
      </div>
    </>
  );
}
