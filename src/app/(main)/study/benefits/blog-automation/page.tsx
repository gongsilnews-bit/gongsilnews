import { Metadata } from "next";
import StudyBlogAutomationClient from "./StudyBlogAutomationClient";

export const metadata: Metadata = {
  title: "블로그포스팅자동화 | 부동산특강",
  description: "공실뉴스부동산 전용 혜택 - 블로그 포스팅 자동화 프로그램",
};

export default function StudyBlogAutomationPage() {
  return <StudyBlogAutomationClient />;
}

