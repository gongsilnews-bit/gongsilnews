import React, { Suspense } from "react";
import MobileStudyApplyClient from "./MobileStudyApplyClient";

export const metadata = {
  title: "멤버십신청 | 공실스터디",
  description: "AI로 중개하는 공실스터디 멤버가 되세요! 1년 36만원으로 365일 무제한 수강과 실무 혜택을 즉시 누리실 수 있습니다.",
};

export default function MobileStudyApplyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666" }}>멤버십 신청을 불러오는 중...</div>}>
      <MobileStudyApplyClient />
    </Suspense>
  );
}
