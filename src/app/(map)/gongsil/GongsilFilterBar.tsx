"use client";

import React, { useState } from "react";
import Link from "next/link";
import MapTopAuthButtons from "@/components/MapTopAuthButtons";
import { CATEGORY_CONFIG } from "./gongsilHelpers";
import GongsilSearchModal from "./GongsilSearchModal";

interface GongsilFilterBarProps {
  activeCategory: string;
  handleCategoryChange: (category: string) => void;
  popoverSearchKeyword?: string;
  setPopoverSearchKeyword?: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: (keyword: string) => void;
}

export default function GongsilFilterBar({
  activeCategory,
  handleCategoryChange,
  popoverSearchKeyword,
  setPopoverSearchKeyword,
  handleSearch,
}: GongsilFilterBarProps) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  return (
    <div style={{ display: "flex", borderBottom: "1px solid #ddd", alignItems: "center", width: "100%", padding: "0 20px" }}>
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

      <div className="no-scrollbar" style={{ display: "flex", gap: 24, alignItems: "center", overflowX: "auto", flex: 1 }}>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => handleCategoryChange(key)}
            style={{
              background: "none",
              border: "none",
              fontSize: 16,
              fontWeight: "bold",
              color: activeCategory === key ? "#1a73e8" : "#555",
              cursor: "pointer",
              padding: "16px 4px",
              position: "relative",
              whiteSpace: "nowrap",
              borderBottom: activeCategory === key ? "3px solid #1a73e8" : "3px solid transparent",
              fontFamily: "inherit",
              transition: "color 0.2s, border-color 0.2s",
            }}
          >
            {cfg.name}
          </button>
        ))}

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
