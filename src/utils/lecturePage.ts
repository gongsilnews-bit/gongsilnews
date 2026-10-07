// 강의 상세 페이지(PC /study_read, 모바일 /m/study_read)가 서버에서 함께 쓰는 강의 조회·메타태그
import { cache } from "react";
import type { Metadata } from "next";
import { getLectureDetail, getLectures } from "@/app/actions/lecture";

// 메타태그와 본문이 같은 요청 안에서 한 번만 조회하도록
const loadDetail = cache(async (lectureId: string) => {
  const res = await getLectureDetail(lectureId);
  return res.success && res.data ? res.data : null;
});

export async function loadLecturePageData(lectureId?: string) {
  if (lectureId) return loadDetail(lectureId);
  const res = await getLectures({ status: "ACTIVE" });
  if (res.success && res.data && res.data.length > 0) return loadDetail(res.data[0].id);
  return null;
}

export async function lectureMetadata(lectureId?: string): Promise<Metadata> {
  if (!lectureId) return {};
  const lecture = await loadDetail(lectureId);
  if (!lecture) return {};
  const title = `${(lecture.title || "").trim()} | 공실스터디`;
  const description = (lecture.subtitle || lecture.title || "").trim().slice(0, 160);
  const images = lecture.thumbnail_url ? [lecture.thumbnail_url] : undefined;
  return {
    title,
    description,
    // 폰은 같은 주소에서 모바일 화면을 받으므로 대표 주소는 하나
    alternates: { canonical: `/study_read?id=${lecture.id}` },
    openGraph: { title, description, images, type: "website" },
  };
}
