"use client";

import React, { useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type StudyTab = "lecture" | "applications" | "board";
export type StudyMenuKey = "lecture" | "resources" | "community" | "apply" | "my_lectures" | "benefits" | "pricing" | "about";

interface Props {
  activeMenu?: StudyMenuKey;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
}

// PC와 100% 일치하는 5대 메뉴 (공실스터디란 삭제)
const MENUS: { key: StudyMenuKey; label: string; href: string }[] = [
  { key: "lecture", label: "강의목록", href: "/m/study" },
  { key: "resources", label: "자료실", href: "/m/board?id=drone" },
  { key: "community", label: "커뮤니티", href: "/m/board?id=free" },
  { key: "apply", label: "멤버십신청", href: "/m/study/apply" },
  { key: "my_lectures", label: "내강의실", href: "/m/my_lectures" },
];

function StudySubMenuBarInner({ activeMenu, activeTab, onTabChange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const boardId = searchParams?.get("id");

  // 현재 활성화된 키 계산
  const currentKey: StudyMenuKey = React.useMemo(() => {
    if (activeMenu) return activeMenu;
    if (activeTab === "applications") return "my_lectures";
    if (pathname.includes("/m/my_lectures")) return "my_lectures";
    if (pathname.includes("/m/study/apply") || pathname.includes("/m/study/pricing")) return "apply";
    if (pathname.includes("/m/study/benefits") || pathname.includes("/m/study/about")) return "apply";
    if (pathname.includes("/m/board")) {
      if (boardId === "free" || boardId === "studyqa") return "community";
      return "resources";
    }
    if (pathname.includes("/m/study")) return "lecture";
    return "lecture";
  }, [activeMenu, activeTab, pathname, boardId]);

  const handleMenuClick = (item: typeof MENUS[0]) => {
    if (pathname === "/m/study" && onTabChange && item.key === "lecture") {
      onTabChange("lecture");
      return;
    }
    router.push(item.href);
  };

  return (
    <div
      ref={scrollContainerRef}
      className="study-sub-menu-bar hide-scrollbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "4px",
        padding: "8px 8px",
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
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        whiteSpace: "nowrap",
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
              minWidth: "fit-content",
              padding: "7px 6px",
              borderRadius: "20px",
              fontSize: "12.5px",
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
              letterSpacing: "-0.5px",
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

export default function StudySubMenuBar(props: Props) {
  return (
    <React.Suspense fallback={
      <div
        className="study-sub-menu-bar hide-scrollbar"
        style={{
          display: "flex",
          height: "45px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          position: "fixed",
          top: "56px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 35,
          width: "100%",
          maxWidth: "448px",
        }}
      />
    }>
      <StudySubMenuBarInner {...props} />
    </React.Suspense>
  );
}
