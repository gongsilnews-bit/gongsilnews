"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const SearchOverlay = dynamic(() => import("@/app/m/_components/header/SearchOverlay"), { ssr: false });

const CATEGORIES = [
  { key: "all", label: "전체뉴스" },
  { key: "부동산·주식·재테크", label: "부동산·재테크" },
  { key: "정치·경제·사회", label: "정치·경제" },
  { key: "세무·법률", label: "세무·법률" },
  { key: "여행·건강·생활", label: "여행·생활" },
  { key: "etc", label: "기타" },
];

export default function NewsDetailHeader({ activeCategory }: { activeCategory: string }) {
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
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const targetUrl = `/m/news?tab=${cat.key}`;
            
            return (
              <Link
                key={cat.key}
                href={targetUrl}
                style={{
                  flexShrink: 0,
                  padding: "0 14px 0",
                  fontSize: "17px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#1a2e50" : "#222222",
                  background: "none",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  letterSpacing: "-0.3px",
                }}
              >
                <span style={{
                  display: "inline-block",
                  paddingBottom: "3px",
                  borderBottom: isActive ? "3px solid #1a2e50" : "3px solid transparent",
                }}>
                  {cat.label}
                </span>
              </Link>
            );
          })}
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
