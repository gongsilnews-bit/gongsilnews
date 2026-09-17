"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GuideTabs from "@/components/newsrealty/GuideTabs";

export default function MobileGuideNoticePage() {
  const router = useRouter();
  const [selectedNotice, setSelectedNotice] = useState<number | null>(null);

  const notices = [
    { id: 1, tag: "[공지]", title: "공실뉴스부동산 파트너 안심운영정책 개정 안내", date: "2026.06.12", content: "공실뉴스부동산 파트너 회원님들의 안전한 중개 활동 및 매물 기사 송출 품질 향상을 위해 안심운영정책이 일부 개정되었습니다." },
    { id: 2, tag: "[공지]", title: "원룸·오피스텔·빌라 통합 공동중개망 신규 오픈 안내", date: "2026.06.09", content: "전국 제휴 공인중개사 간 신속한 매칭을 지원하는 B2B 공동중개망이 정식 오픈되었습니다." },
    { id: 3, tag: "[공지]", title: "포털 뉴스 송출 AI 기사 에이전트 2.0 업데이트", date: "2026.05.28", content: "매물 정보를 입력하면 3분 만에 정식 언론 기사로 자동 변환되는 AI 기사 에이전트 성능이 대폭 향상되었습니다." },
    { id: 4, tag: "[공지]", title: "파트너 전용 부동산유튜브 실전 강의 개설", date: "2026.05.15", content: "현업 전문 PD가 전수하는 스마트폰 촬영 및 쇼츠 제작 마스터클래스가 무료 공개되었습니다." },
    { id: 5, tag: "[안내]", title: "뉴스 광고 영업 리워드 정산 일정 안내", date: "2026.05.01", content: "매월 유치하신 광고비의 최대 50% 리워드는 익월 10일 정산 입금됩니다." },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: "70px" }}>
      {/* ━━━ 모바일 헤더 ━━━ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: "none", border: "none", fontSize: "18px", color: "#475569", cursor: "pointer", padding: "4px" }}
          >
            ‹
          </button>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 800, color: "#111827", textDecoration: "none" }}>
            공실뉴스부동산
          </Link>
        </div>
        <Link
          href="/m/newsrealty/apply"
          style={{
            fontSize: "12.5px",
            fontWeight: 800,
            color: "#ffffff",
            backgroundColor: "#ff8e15",
            padding: "5px 12px",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          입점신청
        </Link>
      </header>

      {/* ━━━ 직방 4단 탭 바 (모바일) ━━━ */}
      <GuideTabs activeTab="notice" isMobile={true} />

      {/* ━━━ 본문 ━━━ */}
      <div style={{ padding: "0 16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 16px 0" }}>
          공지사항
        </h1>

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
                    padding: "14px 4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#ff8e15" }}>{item.tag}</span>
                    <span style={{ fontSize: "14px", fontWeight: isSelected ? 800 : 500, color: "#111827", lineHeight: 1.4 }}>
                      {item.title}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>{item.date}</span>
                </button>
                {isSelected && (
                  <div style={{ padding: "14px", backgroundColor: "#f8fafc", fontSize: "13px", color: "#475569", lineHeight: 1.6, borderTop: "1px dashed #e2e8f0" }}>
                    {item.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
