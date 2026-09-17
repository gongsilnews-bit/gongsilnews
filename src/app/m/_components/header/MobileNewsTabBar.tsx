"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const SearchOverlay = dynamic(() => import("@/app/m/_components/header/SearchOverlay"), { ssr: false });

const CATEGORIES = [
  { key: "news", label: "뉴스", path: "/m/news" },
  { key: "gongsil", label: "공실열람", path: "/m/gongsil" },
  { key: "study", label: "스터디", path: "/m/study" },
  { key: "community", label: "커뮤니티", path: "/m/board?id=free" },
];

interface MobileNewsTabBarProps {
  /** 현재 활성화된 탭 key (없으면 하이라이트 없음) */
  activeTab?: string;
}

export default function MobileNewsTabBar({ activeTab }: MobileNewsTabBarProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabBarRef.current && activeTab) {
      const activeEl = tabBarRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activeTab]);

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
          {CATEGORIES.map((cat) => {
            const isActive = (cat.key === "news" || cat.key === "news_gongsil")
              ? (!activeTab || activeTab === "news" || activeTab === "news_gongsil" || activeTab === "news_politics" || activeTab === "news_marketing" || activeTab === "news_etc" || activeTab === "local")
              : (cat.key === "study" ? (activeTab === "study" || activeTab?.startsWith("board_")) : activeTab === cat.key);
            return (
              <button
                key={cat.key}
                data-active={isActive ? "true" : "false"}
                onClick={() => router.push(cat.path)}
                style={{
                  flexShrink: 0,
                  padding: "0 14px 0",
                  fontSize: "17px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#1a4282" : "#222222",
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
                  borderBottom: isActive ? "3px solid #1a4282" : "3px solid transparent",
                }}>
                  {cat.label}
                </span>
              </button>
            );
          })}
          {/* 검색 및 버튼에 가려지지 않도록 끝부분 여백 추가 */}
          <div style={{ flexShrink: 0, width: (activeTab === "local" || activeTab === "news" || activeTab === "news_gongsil" || activeTab === "news_politics" || activeTab === "news_marketing" || activeTab === "news_etc" || activeTab === "gongsil") ? "155px" : "48px" }} />
        </div>

        {/* 우측 상단 버튼 영역 — 고정 */}
        <div
          style={{
            position: "absolute",
            right: "6px",
            top: "0",
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "#ffffff",
            paddingLeft: "6px",
          }}
        >
          <button
            onClick={() => setIsSearchOpen(true)}
            style={{
              height: "36px",
              width: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* 탭바(56px) 만큼 콘텐츠 밀리기 */}
      <div style={{ height: "56px" }} />

      {/* 검색 오버레이 */}
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </>
  );
}
