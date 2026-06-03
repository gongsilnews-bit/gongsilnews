import React from "react";
import MobileNewsClientWrapper from "../_components/MobileNewsClient";
import { getArticles, getAuthorProfileByName } from "@/app/actions/article";

export const revalidate = 60;

export default async function MobileNewsPage({
  searchParams,
}: {
  searchParams: { author_name?: string; keyword?: string };
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const authorMatch = resolvedParams.author_name;
  const keywordMatch = resolvedParams.keyword;
  
  const filters: any = { status: "APPROVED", limit: 30, section1: "AIë§ˆì??? };
  if (authorMatch) filters.author_name = authorMatch;
  if (keywordMatch) filters.keyword = keywordMatch;

  const res = await getArticles(filters);
  const initialArticles = res.success ? res.data || [] : [];
  
  let authorProfile = null;
  if (authorMatch) {
    const profileRes = await getAuthorProfileByName(authorMatch);
    if (profileRes.success && profileRes.data) {
      authorProfile = profileRes.data;
    }
  }

  return <MobileNewsClientWrapper initialTab="news_marketing" initialArticles={initialArticles} initialAuthorName={authorMatch} initialKeyword={keywordMatch} authorProfile={authorProfile} />;
}
