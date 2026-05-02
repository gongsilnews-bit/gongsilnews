import React from "react";
import { getLectureDetail, getLectures } from "@/app/actions/lecture";
import MobileStudyReadClient from "./MobileStudyReadClient";

export const dynamic = 'force-dynamic';

export default async function MobileStudyReadPage({ searchParams }: { searchParams: { id?: string } }) {
  const lectureId = searchParams.id;
  let initialLecture = null;

  if (lectureId) {
    const res = await getLectureDetail(lectureId);
    if (res.success && res.data) {
      initialLecture = res.data;
    }
  } else {
    const res = await getLectures({ status: "ACTIVE" });
    if (res.success && res.data && res.data.length > 0) {
      const detail = await getLectureDetail(res.data[0].id);
      if (detail.success && detail.data) {
        initialLecture = detail.data;
      }
    }
  }

  return <MobileStudyReadClient initialLecture={initialLecture} />;
}
