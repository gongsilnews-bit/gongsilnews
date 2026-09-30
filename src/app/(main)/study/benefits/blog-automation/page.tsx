import { Metadata } from "next";
import StudyBlogAutomationClient from "./StudyBlogAutomationClient";

export const metadata: Metadata = {
  title: "블로그포스팅자동화 | 공실스터디",
  description: "공실스터디 멤버십 전용 혜택 - 블로그 포스팅 자동화 프로그램",
};

export default function StudyBlogAutomationPage() {
  return <StudyBlogAutomationClient />;
}
