"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const SearchOverlay = dynamic(() => import("@/app/m/_components/header/SearchOverlay"), { ssr: false });

const CATEGORIES = [
  { key: "news_gongsil", label: "공실뉴스", path: "/m/news_gongsil" },
  { key: "news_politics", label: "부동산·경제", path: "/m/news_politics" },
  { key: "news_marketing", label: "AI마케팅", path: "/m/news_marketing" },
  { key: "news_etc", label: "라이프·오피니언", path: "/m/news_etc" },
];

interface MobileNewsTabBarProps {
  /** 현재 활성화된 탭 key (없으면 하이라이트 없음) */
  activeTab?: string;
}

export default function MobileNewsTabBar({ activeTab }: MobileNewsTabBarProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: "0px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "448px",
          zIndex: 40,
          backgroundColor: "#ffffff",
          borderBottom: "9px solid #F4F6F8",
          display: "flex",
          alignItems: "stretch",
          height: "56px",
        }}
      >
        {/* 좌측 로고 — 고정 */}
        <button
          onClick={() => router.push("/m")}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            padding: "0 8px 6px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <img src="/new_logo.png" alt="홈" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
        </button>

        {/* 중앙 스크롤 메뉴 */}
        <div
          ref={tabBarRef}
          className="hide-scrollbar"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
            scrollBehavior: "smooth",
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              data-active={activeTab === cat.key ? "true" : "false"}
              onClick={() => router.push(cat.path)}
              style={{
                flexShrink: 0,
                padding: "0 14px 0",
                fontSize: "17px",
                fontWeight: activeTab === cat.key ? 700 : 500,
                color: activeTab === cat.key ? "#508bf5" : "#222222",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.2s",
                whiteSpace: "nowrap",
                letterSpacing: "-0.3px",
              }}
            >
              <span style={{
                display: "inline-block",
                paddingBottom: "3px",
                borderBottom: activeTab === cat.key ? "3px solid #508bf5" : "3px solid transparent",
              }}>
                {cat.label}
              </span>
            </button>
          ))}
          {/* 검색 버튼에 가려지지 않도록 끝부분 여백 추가 */}
          <div style={{ flexShrink: 0, width: "40px" }} />
        </div>

        {/* 우측 검색 버튼 — 고정 */}
        <button
          onClick={() => setIsSearchOpen(true)}
          style={{
            position: "absolute",
            right: "0",
            top: "4px",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>

      {/* 탭바(56px) 만큼 콘텐츠 밀리기 */}
      <div style={{ height: "56px" }} />

      {/* 검색 오버레이 */}
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </>
  );
}
