import React from "react";
import StudyClassroomClient from "./StudyClassroomClient";

export const metadata = {
  title: "나의 강의실 | 공실스터디",
  description: "내가 수강 중인 공실스터디 특강을 이어보고 복습하는 나의 강의실",
};

export default function StudyClassroomPage() {
  return <StudyClassroomClient />;
}
