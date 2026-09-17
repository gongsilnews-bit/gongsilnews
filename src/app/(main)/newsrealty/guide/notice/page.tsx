"use client";

import React, { useState } from "react";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import GuideTabs from "@/components/newsrealty/GuideTabs";

export default function GuideNoticePage() {
  const [selectedNotice, setSelectedNotice] = useState<number | null>(null);

  const notices = [
    {
      id: 1,
      tag: "[공지]",
      title: "공실뉴스부동산 파트너 안심운영정책 개정 안내",
      date: "2026.06.12",
      content: "공실뉴스부동산 파트너 회원님들의 안전한 중개 활동 및 매물 기사 송출 품질 향상을 위해 안심운영정책이 일부 개정되었습니다. 자세한 사항은 관리자 대시보드 공지사항을 확인해 주시기 바랍니다.",
    },
    {
      id: 2,
      tag: "[공지]",
      title: "원룸·오피스텔·빌라 통합 공동중개망 신규 오픈 안내",
      date: "2026.06.09",
      content: "전국 제휴 공인중개사 간 신속한 매칭을 지원하는 B2B 공동중개망이 정식 오픈되었습니다. 매물 등록 즉시 제휴 파트너에게 실시간 알림이 발송됩니다.",
    },
    {
      id: 3,
      tag: "[공지]",
      title: "포털 뉴스 송출 AI 기사 에이전트 2.0 업데이트",
      date: "2026.05.28",
      content: "매물 정보를 입력하면 3분 만에 정식 언론 기사로 자동 변환되는 AI 기사 에이전트의 문맥 분석 및 실사 이미지 매칭 정확도가 대폭 향상되었습니다.",
    },
    {
      id: 4,
      tag: "[공지]",
      title: "공실뉴스 파트너 전용 부동산유튜브 실전 강의 개설",
      date: "2026.05.15",
      content: "현업 10만 유튜버와 전문 PD가 전수하는 스마트폰 촬영 및 쇼츠 제작 마스터클래스가 온라인 아카데미에 전편 무료 공개되었습니다.",
    },
    {
      id: 5,
      tag: "[안내]",
      title: "뉴스 광고 지국 파트너 영업 리워드 정산 일정 안내",
      date: "2026.05.01",
      content: "매월 유치하신 배너 광고비의 최대 50% 리워드는 익월 10일 원천징수 후 등록 계좌로 정산 지급됩니다.",
    },
    {
      id: 6,
      tag: "[안내]",
      title: "공실뉴스부동산 시스템 정기 점검 안내 (완료)",
      date: "2026.04.20",
      content: "더욱 안정적인 서비스 제공을 위한 서버 점검 작업이 완료되었습니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 직방 호갱노노 CEO 1:1 동일 4분할 탭 ━━━ */}
      <GuideTabs activeTab="notice" />

      {/* ━━━ 본문 영역 (직방 공지사항 게시판 스타일) ━━━ */}
      <main style={{ maxWidth: "1000px", margin: "0 auto 100px", padding: "0 20px" }}>
        {/* 타이틀 */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            공지사항
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            공실뉴스부동산의 새로운 소식과 주요 정책 변경 사항을 전해드립니다.
          </p>
        </div>

        {/* 게시판 리스트 (직방 스타일 상단 굵은 실선 + 항목별 라인) */}
        <div style={{ borderTop: "2px solid #111827" }}>
          {notices.map((item) => {
            const isSelected = selectedNotice === item.id;
            return (
              <div key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <button
                  type="button"
                  onClick={() => setSelectedNotice(isSelected ? null : item.id)}
                  style={{
                    width: "100%",
                    padding: "18px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isSelected ? "#f9fafb" : "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, paddingRight: "16px" }}>
                    <span style={{ fontSize: "14.5px", fontWeight: 700, color: "#ff8e15", whiteSpace: "nowrap" }}>
                      {item.tag}
                    </span>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? "#111827" : "#374151",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {item.title}
                    </span>
                  </div>
                  <span style={{ fontSize: "13px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                    {item.date}
                  </span>
                </button>

                {/* 상세 내용 아코디언 */}
                {isSelected && (
                  <div
                    style={{
                      padding: "20px 24px",
                      backgroundColor: "#f8fafc",
                      fontSize: "14.5px",
                      color: "#475569",
                      lineHeight: 1.7,
                      borderTop: "1px dashed #e2e8f0",
                    }}
                  >
                    {item.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}
