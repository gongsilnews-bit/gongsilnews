"useclient";

import React from "react";
import Link from "next/link";

interface BenefitsSubNavProps {
  activeTab: "brokerage-article" | "youtube-lecture" | "ad-revenue";
  isMobile?: boolean;
}

const TABS = [
  {
    id: "brokerage-article",
    name: "공동중개 20건 & 언론기사 4건",
    shortName: "공동중개 & 언론기사",
    badge: "핵심 혜택",
    href: "/newsrealty/benefits/brokerage-article",
    mobileHref: "/m/newsrealty/benefits/brokerage-article",
    icon: "🏢",
  },
  {
    id: "youtube-lecture",
    name: "부동산유튜브 무료 강의",
    shortName: "유튜브 무료강의",
    badge: "120만원 상당",
    href: "/newsrealty/benefits/youtube-lecture",
    mobileHref: "/m/newsrealty/benefits/youtube-lecture",
    icon: "🎬",
  },
  {
    id: "ad-revenue",
    name: "뉴스 광고 영업 수익",
    shortName: "광고 영업수익",
    badge: "최대 50% 리워드",
    href: "/newsrealty/benefits/ad-revenue",
    mobileHref: "/m/newsrealty/benefits/ad-revenue",
    icon: "💰",
  },
] as const;

export default function BenefitsSubNav({ activeTab, isMobile = false }: BenefitsSubNavProps) {
  const applyLink = isMobile ? "/m/newsrealty/apply" : "/newsrealty/apply";

  return (
    <div
      style={{
        position: "sticky",
        top: isMobile ? "50px" : "60px",
        zIndex: 40,
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: isMobile ? "0 12px" : "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* 탭 목록 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "6px" : "12px",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            paddingTop: "6px",
            paddingBottom: "2px",
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const targetHref = isMobile ? tab.mobileHref : tab.href;

            return (
              <Link
                key={tab.id}
                href={targetHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: isMobile ? "10px 10px 12px 10px" : "14px 16px 16px 16px",
                  fontSize: isMobile ? "13.5px" : "15px",
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#ff8e15" : "#64748b",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  position: "relative",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.icon}</span>
                <span>{isMobile ? tab.shortName : tab.name}</span>
                {tab.badge && (
                  <span
                    style={{
                      fontSize: isMobile ? "10px" : "11px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "10px",
                      backgroundColor: isActive ? "#fff5eb" : "#f1f5f9",
                      color: isActive ? "#ff8e15" : "#64748b",
                      border: isActive ? "1px solid #ffd8b2" : "1px solid #e2e8f0",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* 활성 언더라인 인디케이터 */}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "3px",
                      backgroundColor: "#ff8e15",
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* 우측 빠른 입점 신청 CTA 버튼 (PC 전용) */}
        {!isMobile && (
          <div style={{ flexShrink: 0 }}>
            <Link
              href={applyLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                backgroundColor: "#ff8e15",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 700,
                borderRadius: "8px",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(255, 142, 21, 0.25)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#e0790b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ff8e15";
              }}
            >
              <span>입점 신청하기</span>
              <span style={{ fontSize: "14px" }}>→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
