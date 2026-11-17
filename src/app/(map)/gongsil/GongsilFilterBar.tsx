"use client";

import React, { useState } from "react";
import Link from "next/link";
import MapTopAuthButtons from "@/components/MapTopAuthButtons";
import { CATEGORY_CONFIG, GROUP_TABS, type GroupTabId } from "./gongsilHelpers";
import GongsilSearchModal from "./GongsilSearchModal";

interface GongsilFilterBarProps {
  activeCategory: string;
  handleCategoryChange: (category: string) => void;
  popoverSearchKeyword?: string;
  setPopoverSearchKeyword?: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: (keyword: string) => void;
  groupTab?: GroupTabId;
  onPickGroupTab?: (id: GroupTabId) => void;
  /** 2줄 오른쪽 지도 단추 자리 (2026-11-17) */
  onToggleSlot?: (el: HTMLSpanElement | null) => void;
}

export default function GongsilFilterBar({
  activeCategory,
  handleCategoryChange,
  popoverSearchKeyword,
  setPopoverSearchKeyword,
  handleSearch,
  groupTab = "apt",
  onPickGroupTab,
  onToggleSlot,
}: GongsilFilterBarProps) {
  // 큰 칸(apart·villa·one·biz)을 위쪽 9칸으로 (2026-11-16 아파트·오피스텔 → 2026-11-17 사장님 확정):
  //  아파트 · 오피스텔 · 빌라/주택 · 원룸투룸(풀옵션) · 사무실·지식산업센터 · 상가 · 빌딩/건물 매매 · 공장/토지/기타 · 신축/분양/재건축.
  //  예전 큰 칸 자리(apart)에 칸 전부를 넣고, 나머지 큰 칸(villa·one·biz·sale)은 따로 그리지 않는다. 경매/공매 · MY관심은 그대로
  const groupBases = new Set(GROUP_TABS.map((t) => t.base));
  const tabs = Object.entries(CATEGORY_CONFIG).flatMap(([key, cfg]) => onPickGroupTab && groupBases.has(key)
    ? (key === "apart"
      ? GROUP_TABS.map((t) => ({ id: `group:${t.id}`, name: t.name, on: activeCategory === t.base && groupTab === t.id, go: () => onPickGroupTab(t.id) }))
      : [])
    : [{ id: key, name: cfg.name, on: activeCategory === key, go: () => handleCategoryChange(key) }]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  return (
    // 2026-11-17 사장님: 1줄 = 로고 · 공실열람 … 오른쪽 검색·알림·로그인 / 2줄 = 칸 탭(로고 아래 왼쪽부터)
    <div style={{ width: "100%" }}>
    <div style={{ display: "flex", alignItems: "center", width: "100%", padding: "0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0, marginRight: 24 }}>
        <Link href="/" style={{ marginRight: 15, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <img
            src="/logo.png"
            alt="공실뉴스"
            style={{ height: 48 }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/150x48?text=LOGO";
            }}
          />
        </Link>
        <span
          onClick={() => handleCategoryChange("auction")}
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#111",
            marginRight: 20,
            whiteSpace: "nowrap",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1a73e8")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#111")}
          title="경매/공매 매물 전체보기"
        >
          공실열람
        </span>
      </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center", marginLeft: "auto", flexShrink: 0 }}>
          {/* 🔍 세련된 대형 검색 모달 트리거 버튼 */}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              height: "38px",
              padding: "0 16px",
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "20px",
              color: "#374151",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.18s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#1a73e8";
              e.currentTarget.style.color = "#1a73e8";
              e.currentTarget.style.backgroundColor = "#eff6ff";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(26, 115, 232, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.color = "#374151";
              e.currentTarget.style.backgroundColor = "#fff";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
            }}
            title="물건번호, 경매번호, 지역 검색"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>검색</span>
          </button>

          <div style={{ flexShrink: 0 }}>
            <MapTopAuthButtons />
          </div>
        </div>
      </div>

      {/* 2줄 — 왼쪽 칸 탭, 오른쪽 지도 켜기·끄기 단추(실거래가·우리동네뉴스·부동산, 지도 쪽에서 이 자리로 그려 넣음).
          좁으면 단추가 다음 줄로 내려간다 (가로 넘침 없음) */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 16, padding: "0 20px", borderTop: "1px solid #eee", borderBottom: "1px solid #ddd" }}>
      {/* 탭 사이 간격만 화면이 좁으면 조금 줄인다(1280에서도 MY관심공실까지 보이게) */}
      <div className="no-scrollbar" style={{ display: "flex", gap: "clamp(14px, 1.6vw, 24px)", alignItems: "center", overflowX: "auto", minWidth: 0, flex: "1 1 auto" }}>
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={tb.go}
            style={{
              background: "none",
              border: "none",
              fontSize: 16,
              fontWeight: "bold",
              color: tb.on ? "#1a73e8" : "#555",
              cursor: "pointer",
              padding: "16px 4px",
              position: "relative",
              whiteSpace: "nowrap",
              borderBottom: tb.on ? "3px solid #1a73e8" : "3px solid transparent",
              fontFamily: "inherit",
              transition: "color 0.2s, border-color 0.2s",
            }}
          >
            {tb.name}
          </button>
        ))}
      </div>
      {onToggleSlot && <span ref={onToggleSlot} style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, marginLeft: "auto", padding: "6px 0" }} />}
      </div>

      {/* 대형 풀스크린 검색 오버레이 모달 */}
      <GongsilSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={(kw) => {
          if (setPopoverSearchKeyword) setPopoverSearchKeyword(kw);
          handleSearch(kw);
        }}
        initialKeyword={popoverSearchKeyword || ""}
      />
    </div>
  );
}
