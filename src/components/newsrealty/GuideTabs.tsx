"use client";

import React from "react";
import Link from "next/link";

interface GuideTabsProps {
  activeTab: "notice" | "manual" | "inquiry" | "chat";
  isMobile?: boolean;
}

const TABS = [
  { id: "notice", name: "공지사항", href: "/newsrealty/guide/notice", mobileHref: "/m/newsrealty/guide/notice" },
  { id: "manual", name: "이용가이드", href: "/newsrealty/guide/manual", mobileHref: "/m/newsrealty/guide/manual" },
  { id: "inquiry", name: "1:1문의", href: "/newsrealty/guide/inquiry", mobileHref: "/m/newsrealty/guide/inquiry" },
  { id: "chat", name: "실시간상담", href: "/newsrealty/guide/chat", mobileHref: "/m/newsrealty/guide/chat" },
] as const;

export default function GuideTabs({ activeTab, isMobile = false }: GuideTabsProps) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1000px",
        margin: isMobile ? "16px auto 24px" : "32px auto 40px",
        padding: isMobile ? "0 14px" : "0 20px",
      }}
    >
      {/* 직방 호갱노노 CEO 1:1 동일 4분할 탭 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          border: "1px solid #d1d5db",
          borderRadius: "0px",
          overflow: "hidden",
        }}
      >
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const targetHref = isMobile ? tab.mobileHref : tab.href;

          return (
            <Link
              key={tab.id}
              href={targetHref}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: isMobile ? "44px" : "52px",
                backgroundColor: isActive ? "#333842" : "#ffffff",
                color: isActive ? "#ffffff" : "#4b5563",
                fontSize: isMobile ? "13px" : "15px",
                fontWeight: isActive ? 700 : 500,
                textDecoration: "none",
                textAlign: "center",
                borderRight: idx < 3 ? "1px solid #e5e7eb" : "none",
                transition: "background-color 0.15s ease, color 0.15s ease",
              }}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
