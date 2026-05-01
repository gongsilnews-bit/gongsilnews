import React from "react";
import MobileNewsClient from "./MobileNewsClient";
import { getArticles, getAuthorProfileByName } from "@/app/actions/article";

export const revalidate = 60; // 1분 단위 백그라운드 캐싱 (ISR)

export default async function MobileNewsPage({
  searchParams,
}: {
  searchParams: { tab?: string; author_name?: string; keyword?: string };
}) {
  // Promise resolve required for Next.js 15
  const resolvedParams = await Promise.resolve(searchParams);
  const tab = resolvedParams.tab || "all";
  const authorMatch = resolvedParams.author_name;
  const keywordMatch = resolvedParams.keyword;
  
  const filters: any = { status: "APPROVED", limit: 30 };
  if (tab !== "all" && tab !== "local") {
    if (tab === "etc") {
      filters.section2 = ["IT·가전·가구", "스포츠·연예·Car", "인물·미션·기타"];
    } else {
      filters.section2 = tab;
    }
  }

  if (authorMatch) {
    filters.author_name = authorMatch;
  }
  if (keywordMatch) {
    filters.keyword = keywordMatch;
  }

  // 서버에서 데이터 미리 Fetching (RSC의 장점)
  const res = await getArticles(filters);
  const initialArticles = res.success ? res.data || [] : [];
  
  let authorProfile = null;
  if (authorMatch) {
    const profileRes = await getAuthorProfileByName(authorMatch);
    if (profileRes.success && profileRes.data) {
      authorProfile = profileRes.data;
    }
  }

  return <MobileNewsClient initialTab={tab} initialArticles={initialArticles} initialAuthorName={authorMatch} initialKeyword={keywordMatch} authorProfile={authorProfile} />;
}
