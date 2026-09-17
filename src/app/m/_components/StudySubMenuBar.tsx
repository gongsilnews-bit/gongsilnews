"use client";

import React from "react";
import { useRouter } from "next/navigation";

export type StudyTab = "lecture" | "applications" | "board";

// '내 강의실'은 탭이 아니라 별도 페이지(/m/my_lectures)로 이동하는 항목이다.
type MenuKey = StudyTab | "my_lectures";

interface Props {
  activeTab: StudyTab;
  onTabChange: (tab: StudyTab) => void;
  showBack?: boolean;
}

export default function StudySubMenuBar({ activeTab, onTabChange }: Props) {
  const router = useRouter();
  const tabs: { key: MenuKey; label: string }[] = [
    { key: "lecture", label: "특강 목록" },
    { key: "my_lectures", label: "내 강의실" },
    { key: "applications", label: "내 수강신청" },
    { key: "board", label: "자료실" },
  ];

  return (
    <div
      className="study-sub-menu-scroll"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "10px 16px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        whiteSpace: "nowrap",
        position: "sticky",
        top: "56px",
        zIndex: 35,
      }}
    >
      <style>{`
        .study-sub-menu-scroll::-webkit-scrollbar { display: none; }
        .study-sub-menu-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {tabs.map((tab) => {
        const isSel = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key === "my_lectures") {
                router.push("/m/my_lectures");
                return;
              }
              onTabChange(tab.key);
            }}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: isSel ? 700 : 500,
              color: isSel ? "#ffffff" : "#4b5563",
              backgroundColor: isSel ? "#062828" : "#f3f4f6",
              border: isSel ? "1px solid #062828" : "1px solid #e5e7eb",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.2s",
            }}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
