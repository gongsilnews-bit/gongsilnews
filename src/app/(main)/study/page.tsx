import React from "react";
import { getLectures } from "@/app/actions/lecture";
import StudyHomeClient from "./StudyHomeClient";

export const revalidate = 60;

export const metadata = {
  title: "공실스터디 | 공실뉴스",
  description:
    "매주 보고 따라 하면 AI와 유튜브가 익숙해집니다. 11만 부동산 실무자를 위한 1년 365일 실전 동행 공실스터디",
};

// 등록된 특강이 아직 없을 때 홈에서 보여줄 기본 라인업
const SAMPLE_LECTURES = [
  { id: "sample-1", category: "마케팅", title: "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 및 릴스 제작 비법", instructor_name: "공실마스터 특강", rating: 4.9, review_count: 138, price: 2000, thumbnail_url: null },
  { id: "sample-2", category: "법률", title: "[2026] 공실 위험 없는 법원 경·공매 및 권리분석 핵심 실무", instructor_name: "부동산 전문 변호사", rating: 4.8, review_count: 198, price: 3000, thumbnail_url: null },
  { id: "sample-3", category: "중개실무", title: "[2026] 부동산 중개에 필요한 재개발·재건축 사업성 정밀 분석법", instructor_name: "도시정비 전문 강사", rating: 4.9, review_count: 154, price: 5000, thumbnail_url: null },
  { id: "sample-4", category: "세무", title: "[2026] 상가·주택 임대차 세무 절세 전략 및 분쟁 예방 가이드", instructor_name: "전문 세무사", rating: 4.9, review_count: 210, price: 0, thumbnail_url: null },
];

export default async function StudyHomePage() {
  const res = await getLectures({ status: "ACTIVE" });
  const all = res.success && res.data ? res.data : [];
  const lectures = all.length > 0 ? all.slice(0, 4) : SAMPLE_LECTURES;

  return <StudyHomeClient lectures={lectures} totalCount={all.length} />;
}
