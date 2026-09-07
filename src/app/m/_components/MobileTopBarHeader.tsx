"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";

const SearchOverlay = dynamic(() => import("./header/SearchOverlay"), { ssr: false });

const CATEGORIES = [
  { key: "news", label: "뉴스", path: "/m/news" },
  { key: "gongsil", label: "공실열람", path: "/m/gongsil" },
  { key: "study", label: "스터디", path: "/m/study" },
];

interface Props {
  activeTab?: string;
  onLocationMove?: (lat: number, lng: number, zoom: number) => void;
}

interface LocationResult {
  id?: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  y: string;
  x: string;
  category_name?: string;
}

interface KakaoLocationSearchApi {
  maps?: {
    services?: {
      Places: new () => {
        keywordSearch: (query: string, callback: (data: LocationResult[], status: string) => void) => void;
      };
      Status: { OK: string };
    };
  };
}

function VacancyLocationSearchOverlay({ onClose, onLocationMove }: { onClose: () => void; onLocationMove: (lat: number, lng: number, zoom: number) => void }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchLocation = () => {
    const query = keyword.trim();
    const kakao = (window as Window & { kakao?: KakaoLocationSearchApi }).kakao;
    if (!query || !kakao?.maps?.services) return;

    setIsSearching(true);
    const places = new kakao.maps.services.Places();
    places.keywordSearch(query, (data: LocationResult[], status: string) => {
      setResults(status === kakao.maps.services.Status.OK ? data : []);
      setIsSearching(false);
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 99999, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f3f4f6", gap: "10px" }}>
        <button onClick={onClose} aria-label="검색 닫기" style={{ padding: "4px", background: "none", border: "none", cursor: "pointer" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <input
          autoFocus
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          onKeyDown={event => event.key === "Enter" && searchLocation()}
          placeholder="지역 또는 지하철역을 입력해 주세요"
          style={{ flex: 1, padding: "11px 14px", border: "none", borderRadius: "8px", background: "#f8fafc", fontSize: "16px", outline: "none" }}
        />
        <button onClick={searchLocation} aria-label="지역 검색" style={{ padding: "4px", background: "none", border: "none", cursor: "pointer" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>
      </div>
      <div style={{ padding: "18px 16px", overflowY: "auto" }}>
        <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "12px" }}>지역 또는 지하철역 검색 결과</div>
        {isSearching && <div style={{ padding: "30px 0", textAlign: "center", color: "#94a3b8" }}>검색 중...</div>}
        {!isSearching && keyword.trim() && results.length === 0 && <div style={{ padding: "30px 0", textAlign: "center", color: "#94a3b8" }}>검색 결과가 없습니다.</div>}
        {results.map((result, index) => (
          <button
            key={result.id || `${result.x}-${result.y}-${index}`}
            onClick={() => { onLocationMove(Number(result.y), Number(result.x), 5); onClose(); }}
            style={{ width: "100%", padding: "13px 4px", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
          >
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>{result.place_name || result.address_name}</div>
            <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>{result.road_address_name || result.address_name}{result.category_name ? ` · ${result.category_name}` : ""}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MobileTopBarHeader({ activeTab, onLocationMove }: Props) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleVacancyAdminClick = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/m/login?returnTo=" + encodeURIComponent("/m/admin/vacancy"));
      } else {
        router.push("/m/admin/vacancy");
      }
    } catch {
      router.replace("/m/login?returnTo=" + encodeURIComponent("/m/admin/vacancy"));
    }
  };

  const handleMyLecturesClick = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/m/login?returnTo=" + encodeURIComponent("/m/my_lectures"));
      } else {
        router.push("/m/my_lectures");
      }
    } catch {
      router.replace("/m/login?returnTo=" + encodeURIComponent("/m/my_lectures"));
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
                onClick={() => router.push("/m/news")}
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

          {/* 3. 스터디 탭: 지도기사/공실관리 스타일의 '내 강의실' 버튼 */}
          {activeTab === "study" && (
            <button
              onClick={handleMyLecturesClick}
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a4282" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>내 강의실</span>
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
      {isSearchOpen && activeTab === "gongsil" && onLocationMove ? (
        <VacancyLocationSearchOverlay onClose={() => setIsSearchOpen(false)} onLocationMove={onLocationMove} />
      ) : isSearchOpen ? (
        <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      ) : null}
    </>
  );
}
