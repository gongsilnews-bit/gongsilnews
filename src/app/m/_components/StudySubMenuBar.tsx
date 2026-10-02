"use client";

import React, { useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export type StudyTab = "lecture" | "applications" | "board";
export type StudyMenuKey = "about" | "lecture" | "apply" | "my_lectures" | "benefits" | "pricing" | "applications" | "board";

interface Props {
  activeMenu?: StudyMenuKey;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
}

// 대표님 요청: 상단 4개 메뉴로 정돈
const MENUS: { key: StudyMenuKey; label: string; href: string }[] = [
  { key: "about", label: "공실스터디란?", href: "/m/study/about" },
  { key: "lecture", label: "특강목록", href: "/m/study" },
  { key: "apply", label: "멤버십신청", href: "/m/study/apply" },
  { key: "my_lectures", label: "내강의실", href: "/m/my_lectures" },
];

export default function StudySubMenuBar({ activeMenu, activeTab, onTabChange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 현재 활성화된 키 계산
  const currentKey: StudyMenuKey = React.useMemo(() => {
    if (activeMenu) return activeMenu;
    if (activeTab === "applications") return "my_lectures";
    if (pathname.includes("/m/study/about")) return "about";
    if (pathname.includes("/m/study/apply")) return "apply";
    if (pathname.includes("/m/study/pricing")) return "apply"; // 금액안내는 멤버십신청과 연계
    if (pathname.includes("/m/study/benefits")) return "about"; // 혜택은 소개란과 연계
    if (pathname.includes("/m/my_lectures")) return "my_lectures";
    if (pathname.includes("/m/study")) return "lecture";
    return "about";
  }, [activeMenu, activeTab, pathname]);

  const handleMenuClick = (item: typeof MENUS[0]) => {
    // 특강 목록 내부에서 탭 변경 콜백이 있고 현재 페이지가 /m/study 인 경우
    if (pathname === "/m/study" && onTabChange && item.key === "lecture") {
      onTabChange("lecture");
      return;
    }
    router.push(item.href);
  };

  return (
    <div
      ref={scrollContainerRef}
      className="study-sub-menu-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "6px",
        padding: "8px 12px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        position: "fixed",
        top: "56px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 35,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "448px",
      }}
    >
      {MENUS.map((tab) => {
        const isSel = currentKey === tab.key;
        return (
          <button
            key={tab.key}
            data-active={isSel}
            onClick={() => handleMenuClick(tab)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "7px 4px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: isSel ? 800 : 600,
              color: isSel ? "#ffffff" : "#4b5563",
              backgroundColor: isSel ? "#059669" : "#f3f4f6",
              border: isSel ? "1px solid #059669" : "1px solid #e5e7eb",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              transition: "all 0.18s ease",
              whiteSpace: "nowrap",
              letterSpacing: "-0.4px",
            }}
          >
            <span>{tab.label}</span>
            {tab.key === "apply" && (
              <span style={{ 
                fontSize: "9px", 
                fontWeight: 900, 
                backgroundColor: isSel ? "#ffffff" : "#10b981", 
                color: isSel ? "#059669" : "#ffffff", 
                borderRadius: "8px", 
                padding: "1px 4px", 
                marginLeft: "1px" 
              }}>
                N
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
