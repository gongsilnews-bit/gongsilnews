import React from "react";
import MobileNewsClient from "../news/MobileNewsClient";
import { getArticles, getAuthorProfileByName } from "@/app/actions/article";

export const revalidate = 60; // 1분 단위 백그라운드 캐싱 (ISR)

export default async function MobileNewsMarketingPage({
  searchParams,
}: {
  searchParams: { author_name?: string; keyword?: string };
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const authorMatch = resolvedParams.author_name;
  const keywordMatch = resolvedParams.keyword;
  
  const filters: any = { status: "APPROVED", limit: 30, section2: "부동산마케팅" };

  if (authorMatch) {
    filters.author_name = authorMatch;
  }
  if (keywordMatch) {
    filters.keyword = keywordMatch;
  }

  // 서버에서 데이터 미리 Fetching
  const res = await getArticles(filters);
  const initialArticles = res.success ? res.data || [] : [];
  
  let authorProfile = null;
  if (authorMatch) {
    const profileRes = await getAuthorProfileByName(authorMatch);
    if (profileRes.success && profileRes.data) {
      authorProfile = profileRes.data;
    }
  }

  // MobileNewsClient에 초기 탭을 "부동산마케팅"으로 전달
  return <MobileNewsClient initialTab="부동산마케팅" initialArticles={initialArticles} initialAuthorName={authorMatch} initialKeyword={keywordMatch} authorProfile={authorProfile} />;
}
