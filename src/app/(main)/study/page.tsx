import React from "react";
import { getLectures } from "@/app/actions/lecture";
import StudyHubClient from "./StudyHubClient";

export const revalidate = 60;

export const metadata = {
  title: "부동산특강 | 공실뉴스",
  description: "11만 부동산 실무자와 투자자를 위한 프리미엄 부동산 특강 및 실무 교육 허브",
};

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string }>;
}) {
  const resolvedParams = await searchParams;
  const initialTab = resolvedParams.tab || "lecture";
  const initialCategory = resolvedParams.category || "전체";

  const res = await getLectures({ status: "ACTIVE" });
  let lectures = res.success && res.data ? res.data : [];

  // 데이터가 없을 때 표시할 기본 특강
  if (lectures.length === 0) {
    lectures = [
      { id: "sample-1", category: "실무/마케팅", title: "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 및 릴스 제작 비법", instructor_name: "공실마스터 특강", rating: 4.9, review_count: 138, price: 2000, thumbnail_url: null, created_at: new Date().toISOString() },
      { id: "sample-2", category: "경매/특수물건", title: "[2026] 공실 위험 없는 법원 경·공매 및 권리분석 핵심 실무", instructor_name: "부동산 전문 변호사", rating: 4.8, review_count: 198, price: 3000, thumbnail_url: null, created_at: new Date().toISOString() },
      { id: "sample-3", category: "재개발/투자", title: "[2026] 부동산 중개에 필요한 재개발·재건축 사업성 정밀 분석법", instructor_name: "도시정비 전문 강사", rating: 4.9, review_count: 154, price: 5000, thumbnail_url: null, created_at: new Date().toISOString() },
      { id: "sample-4", category: "세무/법률", title: "[2026] 상가·주택 임대차 세무 절세 전략 및 분쟁 예방 가이드", instructor_name: "전문 세무사", rating: 4.9, review_count: 210, price: 0, thumbnail_url: null, created_at: new Date().toISOString() },
    ];
  }

  return <StudyHubClient initialLectures={lectures} initialTab={initialTab} initialCategory={initialCategory} />;
}
