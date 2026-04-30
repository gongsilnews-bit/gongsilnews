import React from "react";
import MobileNewsClient from "./MobileNewsClient";
import { getArticles } from "@/app/actions/article";

export const revalidate = 60; // 1분 단위 백그라운드 캐싱 (ISR)

export default async function MobileNewsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab || "all";
  
  const filters: any = { status: "APPROVED", limit: 30 };
  if (tab !== "all" && tab !== "local") {
    if (tab === "etc") {
      filters.section2 = ["IT·가전·가구", "스포츠·연예·Car", "인물·미션·기타"];
    } else {
      filters.section2 = tab;
    }
  }

  // 서버에서 데이터를 미리 Fetching (RSC의 장점)
  const res = await getArticles(filters);
  const initialArticles = res.success ? res.data || [] : [];

  return <MobileNewsClient initialTab={tab} initialArticles={initialArticles} />;
}
