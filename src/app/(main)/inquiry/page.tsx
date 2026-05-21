import React from "react";
import InquiryFormClient from "./InquiryFormClient";

export const metadata = {
  title: "1:1 맞춤 문의하기 | 공실뉴스",
  description: "공실뉴스 플랫폼 서비스 및 AI온라인전단지 제작 제휴에 대한 1:1 맞춤형 문의하기 공간입니다. 빠르고 친절하게 답변해 드리겠습니다."
};

export default function InquiryPage() {
  return (
    <div style={{ background: "#f8fafc", minHeight: "80vh", padding: "40px 10px" }}>
      <InquiryFormClient />
    </div>
  );
}
