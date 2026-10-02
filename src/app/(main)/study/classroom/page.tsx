import React from "react";
import StudyClassroomClient from "./StudyClassroomClient";
import { getStudySettings } from "@/app/actions/studySettings";

export const metadata = {
  title: "나의 강의실 | 공실스터디",
  description: "내가 수강 중인 공실스터디 특강을 이어보고 복습하는 나의 강의실",
};

export default async function StudyClassroomPage() {
  // 강의목록과 같은 분류 탭을 쓴다 (관리자 공실스터디 설정의 분류)
  const settingsRes = await getStudySettings();
  const categories = ["전체", ...(settingsRes.success && settingsRes.categories ? settingsRes.categories : [])];
  return <StudyClassroomClient categories={categories} />;
}
