import React, { Suspense } from "react";
import MobileStudyAboutClient from "./MobileStudyAboutClient";

export const metadata = {
  title: "부동산특강 안내 | 공실뉴스 모바일",
  description: "공실뉴스부동산으로 공실 등록부터 블로그·유튜브·SNS 마케팅까지.",
};

export default function MobileStudyAboutPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666" }}>부동산특강 안내를 불러오는 중...</div>}>
      <MobileStudyAboutClient />
    </Suspense>
  );
}
