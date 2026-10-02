"use client";

import React from "react";
import Link from "next/link";

const POINT = "#059669";

export interface StudyHeroTab {
  key?: string;
  label: string;
  icon?: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export interface StudyHeroProps {
  title: string;
  englishTitle?: string;
  description: string;
  tabs?: StudyHeroTab[];
  rightAction?: React.ReactNode;
}

export default function StudyHero({
  title,
  englishTitle,
  description,
  tabs,
  rightAction,
}: StudyHeroProps) {
  return (
    <section
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "linear-gradient(145deg, #052326 0%, #0c382f 60%, #114b3f 100%)",
        color: "#ffffff",
        height: 250,
        minHeight: 250,
        paddingTop: 42,
        paddingBottom: 32,
        boxShadow: "0 4px 20px rgba(5, 35, 38, 0.25)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "0 24px",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 1. 타이틀 행 (한글 + 영문) - 모든 페이지 동일한 위치/크기 */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
            <h1
              style={{
                fontSize: 38,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                margin: 0,
                color: "#ffffff",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </h1>
            {englishTitle && (
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: "#34d399",
                  whiteSpace: "nowrap",
                }}
              >
                {englishTitle}
              </span>
            )}
          </div>

          {/* 2. 서브 설명 문구 - 모든 페이지 동일한 위치/크기 */}
          <p
            style={{
              fontSize: 16.5,
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.88)",
              margin: "0 0 20px",
              lineHeight: 1.5,
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {description}
          </p>

          {/* 3. 하단 탭/메뉴 영역 - 메뉴 유무 상관없이 고정 높이 슬롯 확보 */}
          <div style={{ minHeight: 46, display: "flex", alignItems: "center" }}>
            {tabs && tabs.length > 0 && (
              <nav
                aria-label={`${title} 탭`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 5,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {tabs.map((tab, idx) => {
                  const isSelected = !!tab.isActive;
                  const inner = (
                    <>
                      {tab.icon && <span style={{ fontSize: 14 }}>{tab.icon}</span>}
                      <span>{tab.label}</span>
                    </>
                  );

                  const tabStyle: React.CSSProperties = {
                    padding: "8px 18px",
                    borderRadius: 8,
                    fontSize: 14.5,
                    whiteSpace: "nowrap",
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.82)",
                    background: isSelected ? POINT : "transparent",
                    boxShadow: isSelected ? "0 3px 12px rgba(5, 150, 105, 0.4)" : "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                    textDecoration: "none",
                  };

                  if (tab.href) {
                    return (
                      <Link key={tab.key || tab.href || idx} href={tab.href} onClick={tab.onClick} style={tabStyle}>
                        {inner}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={tab.key || idx}
                      type="button"
                      onClick={tab.onClick}
                      style={tabStyle}
                    >
                      {inner}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        {/* 4. 우측 액션 버튼 영역 */}
        {rightAction && (
          <div style={{ flexShrink: 0, marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            {rightAction}
          </div>
        )}
      </div>
    </section>
  );
}
