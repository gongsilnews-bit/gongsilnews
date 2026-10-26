import { redirect } from "next/navigation";

// 강의영상업로딩 설명은 2026-10-26부터 부동산특강이란?(/study/about) — 예전 주소는 넘겨준다
export default function StudyLectureUploadRedirect() {
  redirect("/study/about");
}
