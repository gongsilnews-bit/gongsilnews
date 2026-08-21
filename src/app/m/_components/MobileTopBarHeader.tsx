"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";

const SearchOverlay = dynamic(() => import("./header/SearchOverlay"), { ssr: false });

const CATEGORIES = [
  { key: "news", label: "뉴스", path: "/m/news_gongsil" },
  { key: "gongsil", label: "공실열람", path: "/m/gongsil" },
  { key: "study", label: "스터디", path: "/m/study" },
];

interface Props {
  activeTab?: string;
}

export default function MobileTopBarHeader({ activeTab }: Props) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleVacancyAdminClick = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/m/signup?returnTo=" + encodeURIComponent("/m/admin/vacancy"));
      } else {
        router.push("/m/admin/vacancy");
      }
    } catch {
      router.push("/m/signup?returnTo=" + encodeURIComponent("/m/admin/vacancy"));
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current && activeTab) {
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
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
          ref={scrollContainerRef}
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
            const isActive = (cat.key === "news" || cat.key === "news_gongsil")
              ? (!activeTab || activeTab === "news" || activeTab === "news_gongsil" || activeTab === "news_politics" || activeTab === "news_marketing" || activeTab === "news_etc" || activeTab === "local")
              : (cat.key === "study" ? (activeTab === "study" || activeTab?.startsWith("board_")) : activeTab === cat.key);
            return (
              <button
                key={cat.key}
                data-active={isActive ? "true" : "false"}
                onClick={() => { 
                  router.push(cat.path);
                }}
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
          {/* 1. 뉴스 탭 및 우리동네 지도 뷰: 지도기사/목록보기 토글 */}
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

          {/* 2. 공실열람 탭: 지도기사 스타일의 '공실관리' 버튼 */}
          {activeTab === "gongsil" && (
            <button
              onClick={handleVacancyAdminClick}
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
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <line x1="9" y1="22" x2="9" y2="16" />
                <line x1="15" y1="22" x2="15" y2="16" />
                <line x1="9" y1="16" x2="15" y2="16" />
                <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
              </svg>
              <span>공실관리</span>
            </button>
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

      {/* 검색 오버레이 */}
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </>
  );
}
