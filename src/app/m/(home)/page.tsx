import React from "react";
import { getVacanciesForMap } from "@/app/actions/vacancy";
import { getLectures } from "@/app/actions/lecture";
import { getArticles } from "@/app/actions/article";
import MobileHomeClient from "../_components/home/MobileHomeClient";
import MobileFooter from "../_components/MobileFooter";

export const revalidate = 300;

export default async function MobileHomePage() {
  const [
    headlineRes,
    gongsilRes,
    realestateRes,
    marketingRes,
    lifeRes,
    mapNewsRes,
    lecturesRes,
  ] = await Promise.all([
    getArticles({ status: "APPROVED", is_headline: true, limit: 8 }),
    getArticles({ status: "APPROVED", section1: "공실뉴스", limit: 6 }),
    getArticles({ status: "APPROVED", section1: "부동산·경제", limit: 6 }),
    getArticles({ status: "APPROVED", section1: "AI마케팅", limit: 6 }),
    getArticles({ status: "APPROVED", section1: "라이프·오피니언", limit: 6 }),
    getArticles({ status: "APPROVED", section1: "우리동네부동산", limit: 10 }),
    getLectures({ status: "ACTIVE" }),
  ]);

  const headlineArticles = headlineRes.success ? (headlineRes.data || []) : [];
  const gongsilArticles = gongsilRes.success ? (gongsilRes.data || []) : [];
  const realestateArticles = realestateRes.success ? (realestateRes.data || []) : [];
  const marketingArticles = marketingRes.success ? (marketingRes.data || []) : [];
  const lifeArticles = lifeRes.success ? (lifeRes.data || []) : [];
  const mapArticles = mapNewsRes.success ? (mapNewsRes.data || []) : [];
  const lectures = lecturesRes.success ? (lecturesRes.data || []) : [];

  return (
    <>
      <MobileHomeClient
        vacancies={[]}
        headlineArticles={headlineArticles}
        gongsilArticles={gongsilArticles}
        realestateArticles={realestateArticles}
        marketingArticles={marketingArticles}
        lifeArticles={lifeArticles}
        mapArticles={mapArticles}
        lectures={lectures.slice(0, 4)}
      />
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto' }}>
        <MobileFooter />
      </div>
    </>
  );
}
