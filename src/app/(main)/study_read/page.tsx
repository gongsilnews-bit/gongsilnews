import React from "react";
import type { Metadata } from "next";
import { lectureMetadata, loadLecturePageData } from "@/utils/lecturePage";
import StudyReadClient from "./StudyReadClient";

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ id?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return lectureMetadata((await searchParams).id);
}

export default async function StudyReadPage({ searchParams }: Props) {
  return <StudyReadClient initialLecture={await loadLecturePageData((await searchParams).id)} />;
}
