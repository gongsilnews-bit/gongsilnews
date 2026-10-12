import React from "react";
import StudyHeader from "@/components/study/StudyHeader";
import StudyBenefitsSubNav from "@/components/study/StudyBenefitsSubNav";
import StudyLanding from "@/components/study/StudyLanding";

export const metadata = {
  title: "강의영상업로딩 | 공실스터디",
  description:
    "내 지역, 단지, 물건 정보를 이제 유튜브 강의로. 부동산 대표님도 공실스터디 강사가 될 수 있습니다.",
};

export default function StudyLectureUploadPage() {
  return (
    <>
      <StudyHeader />
      <StudyBenefitsSubNav active="lecture-upload" />
      <StudyLanding />
    </>
  );
}
