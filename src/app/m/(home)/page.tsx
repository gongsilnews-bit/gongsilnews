import React from "react";
import { getVacanciesForMap } from "@/app/actions/vacancy";
import { getLectures } from "@/app/actions/lecture";
import { getArticles } from "@/app/actions/article";
import MobileHomeClient from "../_components/home/MobileHomeClient";
import MobileFooter from "../_components/MobileFooter";

export const revalidate = 300;

export default async function MobileHomePage() {
  const [
    vacancyRes,
    headlineRes,
    allNewsRes,
    mapNewsRes,
    lecturesRes,
  ] = await Promise.all([
    getVacanciesForMap(),
    getArticles({ status: "APPROVED", is_headline: true, limit: 8 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", limit: 100 }),
    getArticles({ status: "APPROVED", section1: "우리동네부동산", limit: 10 }),
    getLectures({ status: "ACTIVE" }),
  ]);

  const vacancies = vacancyRes.data || [];
  const headlineArticles = headlineRes.success ? (headlineRes.data || []) : [];
  const allNewsArticles = allNewsRes.success ? (allNewsRes.data || []) : [];
  const mapArticles = mapNewsRes.success ? (mapNewsRes.data || []) : [];
  const lectures = lecturesRes.success ? (lecturesRes.data || []) : [];

  // 카테고리 분류 (PC와 동일)
  const financeArts = allNewsArticles.filter((a: any) => a.section2 === "부동산·주식·재테크").slice(0, 6);
  const politicsArts = allNewsArticles.filter((a: any) => a.section2 === "정치·경제·사회").slice(0, 4);
  const lawArts = allNewsArticles.filter((a: any) => a.section2 === "세무·법률").slice(0, 4);
  const lifeArts = allNewsArticles.filter((a: any) => a.section2 === "여행·건강·생활").slice(0, 4);
  const etcArts = allNewsArticles.filter((a: any) =>
    ["IT·가전·가구", "스포츠·연예·Car", "인물·미션·기타"].includes(a.section2)
  ).slice(0, 4);

  return (
    <>
      <MobileHomeClient
        vacancies={vacancies.slice(0, 5)}
        headlineArticles={headlineArticles}
        financeArticles={financeArts}
        politicsArticles={politicsArts}
        lawArticles={lawArts}
        lifeArticles={lifeArts}
        etcArticles={etcArts}
        mapArticles={mapArticles}
        lectures={lectures.slice(0, 4)}
      />
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto' }}>
        <MobileFooter />
      </div>
    </>
  );
}
