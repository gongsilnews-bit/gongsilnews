import React, { Suspense } from "react";
import MobileStudyPricingClient from "./MobileStudyPricingClient";

export const metadata = {
  title: "금액안내 | 공실스터디",
  description: "공실등록 + 유튜브/블로그 실습, 월 3만원이면 OK! 1년 36만원으로 365일 무제한 수강과 실무 자동화 혜택을 누리세요.",
};

export default function MobileStudyPricingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666" }}>금액 안내를 불러오는 중...</div>}>
      <MobileStudyPricingClient />
    </Suspense>
  );
}
