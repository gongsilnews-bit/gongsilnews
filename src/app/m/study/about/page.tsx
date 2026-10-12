import React, { Suspense } from "react";
import MobileStudyAboutClient from "./MobileStudyAboutClient";

export const metadata = {
  title: "공실스터디 안내 | 공실뉴스 모바일",
  description: "공실스터디 멤버십으로 공실 등록부터 블로그·유튜브·SNS 마케팅까지.",
};

export default function MobileStudyAboutPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666" }}>스터디 안내를 불러오는 중...</div>}>
      <MobileStudyAboutClient />
    </Suspense>
  );
}
