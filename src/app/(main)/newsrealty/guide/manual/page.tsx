"use client";

import React from "react";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import GuideTabs from "@/components/newsrealty/GuideTabs";

export default function GuideManualPage() {
  const guideCategories = [
    {
      title: "회원가입 및 파트너 입점 절차",
      desc: "공인중개사 자격 인증부터 사업자등록증 확인, 파트너십 승인까지의 전 과정을 안내합니다.",
      icon: "📋",
      steps: ["온라인 신청서 작성", "중개사 등록증 확인", "데스크 승인 완료", "로컬기자 활동 시작"],
    },
    {
      title: "매물 등록 및 AI 언론 기사 송출 가이드",
      desc: "매물 사진과 기본 정보 입력 시 AI가 자동으로 전문 보도자료를 작성하고 포털에 송출하는 방법입니다.",
      icon: "📰",
      steps: ["관리자 매물 등록", "AI 기사 초안 확인", "기사 수정/발행 요청", "네이버·다음 노출"],
    },
    {
      title: "전국 20건+ B2B 공동중개망 활용법",
      desc: "전국 제휴 네트워크에 우량 매물을 공유하고 타 지역 매수인과 안전하게 공동중개하는 방법입니다.",
      icon: "🤝",
      steps: ["공동중개망 매물 조회", "제휴 소장님 매칭", "안심 계약 진행", "수수료 100% 보장"],
    },
    {
      title: "부동산유튜브 무료 아카데미 수강 가이드",
      desc: "파트너 전용 100% 무료 유튜브 마스터클래스 시청 및 실전 쇼츠 템플릿 다운로드 방법입니다.",
      icon: "🎬",
      steps: ["온라인 강의실 접속", "촬영/편집 강좌 수강", "디자인 템플릿 적용", "1:1 영상 피드백"],
    },
    {
      title: "뉴스 배너 광고 영업 및 리워드 정산",
      desc: "지역 지국장으로서 로컬 상가, 분양 대행사 배너 광고를 유치하고 최대 50%를 정산받는 절차입니다.",
      icon: "💰",
      steps: ["광고주 연락처 접수", "본사 제안서/계약 대행", "배너 무료 디자인", "익월 10일 정산 입금"],
    },
    {
      title: "계정 관리 및 세금계산서 발행 안내",
      desc: "정기 결제 수단 변경, 전자세금계산서 확인 및 회원 정보 수정 안내입니다.",
      icon: "⚙️",
      steps: ["관리자 설정 이동", "결제 카드 변경", "세금계산서 내역 조회", "해지/연장 관리"],
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 직방 호갱노노 CEO 1:1 동일 4분할 탭 ━━━ */}
      <GuideTabs activeTab="manual" />

      {/* ━━━ 본문 영역 ━━━ */}
      <main style={{ maxWidth: "1000px", margin: "0 auto 100px", padding: "0 20px" }}>
        {/* 타이틀 */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            이용가이드
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            공실뉴스부동산 시스템을 쉽고 편리하게 활용할 수 있는 핵심 가이드입니다.
          </p>
        </div>

        {/* 가이드 카테고리 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", borderTop: "2px solid #111827", paddingTop: "28px" }}>
          {guideCategories.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "26px 22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ff8e15";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(255,142,21,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div>
                <div style={{ fontSize: "30px", marginBottom: "12px" }}>{item.icon}</div>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#111827", margin: "0 0 8px 0" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: 1.6, margin: "0 0 18px 0" }}>
                  {item.desc}
                </p>
              </div>

              {/* 스텝 단계 뱃지 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {item.steps.map((step, sIdx) => (
                  <span
                    key={sIdx}
                    style={{
                      fontSize: "11.5px",
                      color: "#4b5563",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontWeight: 600,
                    }}
                  >
                    {sIdx + 1}. {step}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}
