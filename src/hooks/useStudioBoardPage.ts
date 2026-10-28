"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { onStudioBoardPage } from "@/utils/studioBoards";

/** 공실마케팅 게시판의 글 읽기 · 쓰기 화면인가 — 메인 헤더 · 풋터를 숨길 때 (2026-10-26) */
export function useStudioBoardPage(): boolean {
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(onStudioBoardPage(pathname, window.location.search));
  }, [pathname]);
  return on;
}
