"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AdminSectionProps } from "./types";
import StudyListSection from "@/components/admin/study/StudyListSection";

/* 작성폼은 1,000줄이 넘는다. [+ 새 강의 등록]·[수정]을 누를 때만 불러온다 */
const StudyWriteForm = dynamic(() => import("@/components/admin/StudyWriteForm"), {
  ssr: false,
  loading: () => <div style={{ flex: 1, padding: 60, textAlign: "center", color: "#9ca3af" }}>불러오는 중...</div>,
});

/**
 * 특강관리. 최고관리자(admin)와 회원(member)이 같이 쓴다.
 * 주소에 action=write 가 있으면 작성폼, 없으면 목록.
 */
export default function StudySection({ theme, mode = "admin" }: AdminSectionProps & { mode?: "admin" | "member" }) {
  const searchParams = useSearchParams();
  if (searchParams.get("action") === "write") return <StudyWriteForm mode={mode} />;
  return <StudyListSection theme={theme} mode={mode} />;
}
