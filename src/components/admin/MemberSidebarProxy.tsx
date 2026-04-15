"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconDashboard,
  IconBuilding,
  IconArticle,
  IconStudy,
  IconCustomer,
  IconComment,
  IconManual,
  IconSettings
} from "./sections/AdminIcons";

// The menus from realty_admin/user_admin
const MEMBER_MENU = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "gongsil", label: "공실관리", icon: <IconBuilding /> },
  { key: "article", label: "기사관리", icon: <IconArticle /> },
  { key: "study", label: "스터디관리", icon: <IconStudy /> },
  { key: "customer", label: "고객관리", icon: <IconCustomer /> },
  { key: "comment", label: "댓글·문의", icon: <IconComment /> },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
  { key: "settings", label: "정보설정", icon: <IconSettings />, separated: true },
];

export default function MemberSidebarProxy({ 
  activeMenu = "article", 
  returnPath = "/realty_admin",
  darkMode = false
}: { 
  activeMenu?: string; 
  returnPath?: string;
  darkMode?: boolean;
}) {
  const router = useRouter();
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  const sidebarBg = darkMode ? "#1e2a42" : "#1a3a6b";

  return (
    <aside style={{ width: 80, background: sidebarBg, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)" }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 }}>
        <img src="/favicon.png" alt="공실뉴스 로고" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onClick={() => window.location.href = "/"} />
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: "16px 0", flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
        {MEMBER_MENU.map((item) => (
          <li key={item.key} style={{ margin: 0, position: "relative", ...(item.separated ? { marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.15)" } : {}) }}
            onMouseEnter={() => setHoveredMenu(item.key)} onMouseLeave={() => setHoveredMenu(null)}>
            <button onClick={() => {
              if (item.key === activeMenu) return;
              // If they click another menu, we just redirect them back to the member root page
              router.push(returnPath);
            }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "18px 0", textDecoration: "none", width: "100%", border: "none", cursor: "pointer",
                color: activeMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.65)",
                background: activeMenu === item.key ? "rgba(255,255,255,0.18)" : hoveredMenu === item.key ? "rgba(255,255,255,0.12)" : "none",
                borderLeft: activeMenu === item.key ? "3px solid #ffffff" : "3px solid transparent",
                fontSize: 11, fontWeight: activeMenu === item.key ? 700 : 600, gap: 6, fontFamily: "inherit", transition: "all 0.2s ease",
              }}>
              <span style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", transform: hoveredMenu === item.key ? "translateY(-2px)" : "none" }}>
                <span style={{ width: 22, height: 22, display: "block" }}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { style: { width: 22, height: 22, stroke: activeMenu === item.key || hoveredMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.65)" } })}
                </span>
              </span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
