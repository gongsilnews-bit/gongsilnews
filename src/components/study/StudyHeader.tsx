"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 공실스터디는 녹색 (2026-10-12 회의: 주황 통일을 시험해 보고 녹색으로 확정)
const POINT = "#059669";

/** 진한 초록 히어로(멤버십신청·나의 강의실·Q&A, 145deg 그라데이션)의 위쪽 가장자리 색을 그대로 옮긴 것 */
export const STUDY_HERO_BAR = "linear-gradient(90deg, #052427 0%, #072928 25%, #09302b 50%, #0b372e 75%, #0e4036 100%)";
/** 공실스터디 홈 히어로(사진 + 가운데가 밝은 그림자)의 위쪽 가장자리 색 */
export const STUDY_HOME_HERO_BAR = "linear-gradient(90deg, #071614 0%, #0c1f1b 25%, #102320 50%, #0b1d1a 75%, #061613 100%)";

/** 멤버십 결제 스마트스토어 상품 (공실스터디 1년 수강권, 판매자상품코드 GS-STUDY-1Y) */
export const STUDY_NAVER_PAY_URL = "https://smartstore.naver.com/mygongsil/products/13805832960";

/**
 * 부동산특강 제목 줄 (2026-10-26 사장님: 메뉴 줄 없이 왼쪽 "부동산특강", 오른쪽 [내 강의실]).
 * 부동산특강 = 부동산이 여는 내 지역/단지 강의. 첫 화면(/study)이 곧 강의목록이다.
 * 멤버십혜택·신청·자료실·커뮤니티는 공실뉴스부동산(/newsrealty)으로 옮겼다. 스크롤해도 붙지 않는다(메인 헤더가 따라온다).
 */
export default function StudyHeader({ background }: { background?: string } = {}) {
  const pathname = usePathname() || "/study";
  const dark = !!background;
  const inClassroom = pathname.startsWith("/study/classroom");
  return (
    <div style={{ background: dark ? "linear-gradient(90deg, #021315 0%, #04191c 50%, #021315 100%)" : "#ffffff" }}>
      <div
        className="container px-20"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: dark ? "20px 20px 28px" : "20px 20px 14px" }}
      >
        <Link
          href="/study"
          title="부동산특강 홈"
          style={{ fontSize: "32px", fontWeight: 900, color: dark ? "#ffffff" : "#111", letterSpacing: "-1px", lineHeight: 1, textDecoration: "none", whiteSpace: "nowrap" }}
        >
          부동산특강
        </Link>
        <Link
          href="/study/classroom"
          title="나의 강의실로 이동"
          aria-current={inClassroom ? "page" : undefined}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 16px", borderRadius: 6,
            fontSize: "14px", fontWeight: 800, color: "#ffffff", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
            background: inClassroom ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" : POINT,
            border: inClassroom ? "1.5px solid #34d399" : "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: inClassroom ? "0 3px 12px rgba(5, 150, 105, 0.45)" : "0 2px 6px rgba(5, 150, 105, 0.25)",
          }}
        >
          내 강의실
        </Link>
      </div>
    </div>
  );
}
