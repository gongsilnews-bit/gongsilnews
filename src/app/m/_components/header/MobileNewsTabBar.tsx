"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const SearchOverlay = dynamic(() => import("@/app/m/_components/header/SearchOverlay"), { ssr: false });

const CATEGORIES = [
  { key: "news", label: "뉴스", path: "/m/news_gongsil" },
  { key: "gongsil", label: "공실열람", path: "/m/gongsil" },
  { key: "study", label: "스터디", path: "/m/study" },
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
          <div style={{ flexShrink: 0, width: (activeTab === "local" || activeTab === "news" || activeTab === "news_gongsil" || activeTab === "news_politics" || activeTab === "news_marketing" || activeTab === "news_etc") ? "155px" : "48px" }} />
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
          {/* 오직 뉴스 탭 및 우리동네 지도 뷰에서만 지도/목록 토글 버튼 노출 (공실열람, 스터디에서는 미노출) */}
          {(activeTab === "local" || activeTab === "news" || activeTab === "news_gongsil" || activeTab === "news_politics" || activeTab === "news_marketing" || activeTab === "news_etc") && (
            activeTab === "local" ? (
              <button
                onClick={() => router.push("/m/news_gongsil")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 9px",
                  borderRadius: "16px",
                  background: "#F0F4FF",
                  border: "1px solid #D0E0FF",
                  color: "#1a4282",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.3px",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a4282" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <span>목록보기</span>
              </button>
            ) : (
              <button
                onClick={() => router.push("/m/news_map")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 9px",
                  borderRadius: "16px",
                  background: "#F0F4FF",
                  border: "1px solid #D0E0FF",
                  color: "#1a4282",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.3px",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a4282" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                  <line x1="8" y1="2" x2="8" y2="18"></line>
                  <line x1="16" y1="6" x2="16" y2="22"></line>
                </svg>
                <span>지도기사</span>
              </button>
            )
          )}

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
