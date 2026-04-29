import React from "react";
import Link from "next/link";
import { getArticles } from "@/app/actions/article";
import { getVacancies } from "@/app/actions/vacancy";
import MobileHomeClient from "./_components/home/MobileHomeClient";

export const revalidate = 300; // 5분 캐시

export default async function MobileHomePage() {
  // 병렬로 데이터 가져오기
  const [headlineRes, politicsRes, taxRes, lifeRes, financeRes, vacancyRes] = await Promise.all([
    getArticles({ status: "APPROVED", is_headline: true, limit: 5 }),
    getArticles({ status: "APPROVED", section1: "정치·경제·사회", limit: 4 }),
    getArticles({ status: "APPROVED", section1: "세무·법률", limit: 4 }),
    getArticles({ status: "APPROVED", section1: "여행·건강·생활", limit: 4 }),
    getArticles({ status: "APPROVED", section1: "부동산·주식·재테크", limit: 4 }),
    getVacancies({ status: "ACTIVE" }),
  ]);

  const headlineArticles = headlineRes.success ? (headlineRes.data || []) : [];
  const politicsArticles = politicsRes.success ? (politicsRes.data || []) : [];
  const taxArticles = taxRes.success ? (taxRes.data || []) : [];
  const lifeArticles = lifeRes.success ? (lifeRes.data || []) : [];
  const financeArticles = financeRes.success ? (financeRes.data || []) : [];
  const vacancies = vacancyRes.success ? (vacancyRes.data || []).slice(0, 3) : [];

  return (
    <MobileHomeClient
      headlineArticles={headlineArticles}
      politicsArticles={politicsArticles}
      taxArticles={taxArticles}
      lifeArticles={lifeArticles}
      financeArticles={financeArticles}
      vacancies={vacancies}
    />
  );
}
