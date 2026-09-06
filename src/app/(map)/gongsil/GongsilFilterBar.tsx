"use client";

import React from "react";
import Link from "next/link";
import MapTopAuthButtons from "@/components/MapTopAuthButtons";
import { CATEGORY_CONFIG } from "./gongsilHelpers";

interface GongsilFilterBarProps {
  activeCategory: string;
  handleCategoryChange: (category: string) => void;
  popoverSearchKeyword: string;
  setPopoverSearchKeyword: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: (keyword: string) => void;
}

export default function GongsilFilterBar({
  activeCategory,
  handleCategoryChange,
  popoverSearchKeyword,
  setPopoverSearchKeyword,
  handleSearch,
}: GongsilFilterBarProps) {
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
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#111",
            marginRight: 20,
            whiteSpace: "nowrap",
            transition: "color 0.2s",
          }}
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
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <input
              type="text"
              placeholder="공실번호, 학교, 지하철"
              value={popoverSearchKeyword}
              onChange={(e) => setPopoverSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(popoverSearchKeyword);
                }
              }}
              style={{
                width: "240px",
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "13px",
                outline: "none",
                height: "36px",
              }}
            />
            <button
              onClick={() => handleSearch(popoverSearchKeyword)}
              style={{
                height: "36px",
                padding: "0 14px",
                background: "#1a4282",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="16"
                height="16"
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
            </button>
          </div>
          <div style={{ flexShrink: 0 }}>
            <MapTopAuthButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
