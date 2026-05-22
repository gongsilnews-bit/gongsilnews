"use client";

import React from "react";

export type StudyTab = "lecture" | "board" | "community";

interface Props {
  activeTab: StudyTab;
  onTabChange: (tab: StudyTab) => void;
}

export default function StudySubMenuBar({ activeTab, onTabChange }: Props) {
  const tabs: { key: StudyTab; label: string }[] = [
    { key: "lecture", label: "특강준비중" },
    { key: "board", label: "자료실" },
    { key: "community", label: "커뮤니티" },
  ];

  return (
    <div
      className="study-sub-menu-scroll"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 16px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        whiteSpace: "nowrap",
        position: "relative",
        zIndex: 35,
      }}
    >
      <style>{`
        .study-sub-menu-scroll::-webkit-scrollbar { display: none; }
        .study-sub-menu-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "8px 16px",
              borderRadius: "20px",
              border: `1.5px solid ${isActive ? "#16a34a" : "#d1d5db"}`,
              backgroundColor: isActive ? "#f0fdf4" : "#ffffff",
              fontSize: "13.5px",
              fontWeight: 700,
              color: isActive ? "#16a34a" : "#374151",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
