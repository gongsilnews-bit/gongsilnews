import React from "react";
import MobileNewsClientWrapper from "../_components/MobileNewsClient";
import { getArticles, searchArticles, getAuthorProfileByName } from "@/app/actions/article";

export const revalidate = 60;

export default async function MobileNewsPage({
  searchParams,
}: {
  searchParams: { author_name?: string; keyword?: string; sec?: string };
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const authorMatch = resolvedParams.author_name;
  const keywordMatch = resolvedParams.keyword;
  const isAll = resolvedParams.sec === "all";
  
  let initialArticles: any[] = [];
  if (keywordMatch) {
    const res = await searchArticles(keywordMatch);
    initialArticles = res.success ? res.data || [] : [];
  } else {
    const filters: any = { status: "APPROVED", limit: 12 };
    if (authorMatch) filters.author_name = authorMatch;
    const res = await getArticles(filters);
    initialArticles = res.success ? res.data || [] : [];
  }
  
  let authorProfile = null;
  if (authorMatch) {
    const profileRes = await getAuthorProfileByName(authorMatch);
    if (profileRes.success && profileRes.data) {
      authorProfile = profileRes.data;
    }
  }

  return <MobileNewsClientWrapper initialTab={isAll ? "all" : "news_gongsil"} initialArticles={initialArticles} initialAuthorName={authorMatch} initialKeyword={keywordMatch} authorProfile={authorProfile} />;
}
