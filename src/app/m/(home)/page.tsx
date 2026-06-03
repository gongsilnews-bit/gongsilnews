import React from "react";
import { getVacanciesForMap } from "@/app/actions/vacancy";
import { getLectures } from "@/app/actions/lecture";
import { getArticles } from "@/app/actions/article";
import { getBoardPosts } from "@/app/actions/board";
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
    lecturesRes,
    droneRes,
  ] = await Promise.all([
    getArticles({ status: "APPROVED", is_headline: true, limit: 8 }),
    getArticles({ status: "APPROVED", section1: "공실?�스", limit: 6 }),
    getArticles({ status: "APPROVED", section1: "부?�산·경제", limit: 6 }),
    getArticles({ status: "APPROVED", section1: "AI마�???, limit: 6 }),
    getArticles({ status: "APPROVED", section1: "?�이?�·오?�니??, limit: 6 }),
    getLectures({ status: "ACTIVE" }),
    getBoardPosts("drone"),
  ]);

  const headlineArticles = headlineRes.success ? (headlineRes.data || []) : [];
  const gongsilArticles = gongsilRes.success ? (gongsilRes.data || []) : [];
  const realestateArticles = realestateRes.success ? (realestateRes.data || []) : [];
  const marketingArticles = marketingRes.success ? (marketingRes.data || []) : [];
  const lifeArticles = lifeRes.success ? (lifeRes.data || []) : [];
  const lectures = lecturesRes.success ? (lecturesRes.data || []) : [];
  const dronePosts = droneRes.data?.slice(0, 8) || [];

  return (
    <>
      <MobileHomeClient
        vacancies={[]}
        headlineArticles={headlineArticles}
        gongsilArticles={gongsilArticles}
        realestateArticles={realestateArticles}
        marketingArticles={marketingArticles}
        lifeArticles={lifeArticles}
        lectures={lectures.slice(0, 4)}
        dronePosts={dronePosts}
      />
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto' }}>
        <MobileFooter />
      </div>
    </>
  );
}
