import React from "react";
import { getLectureDetail } from "@/app/actions/lecture";
import MobileStudyWatchClient from "./MobileStudyWatchClient";

export const dynamic = 'force-dynamic';

export default async function MobileStudyWatchPage({ searchParams }: { searchParams: { id?: string } }) {
  const lectureId = searchParams.id;
  let initialLecture = null;

  if (lectureId) {
    const res = await getLectureDetail(lectureId);
    if (res.success && res.data) {
      initialLecture = res.data;
    }
  }

  return <MobileStudyWatchClient initialLecture={initialLecture} />;
}
