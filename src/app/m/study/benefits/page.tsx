import React, { Suspense } from "react";
import MobileStudyBenefitsClient from "./MobileStudyBenefitsClient";

export const metadata = {
  title: "멤버십혜택 | 공실스터디",
  description: "공실 등록 월 20건, 기사 4편 송고, AI 유튜브 영상 제작 및 네이버 블로그 원클릭 자동화까지! 공실스터디 멤버십의 압도적인 혜택을 확인하세요.",
};

export default function MobileStudyBenefitsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666" }}>혜택 안내를 불러오는 중...</div>}>
      <MobileStudyBenefitsClient />
    </Suspense>
  );
}
