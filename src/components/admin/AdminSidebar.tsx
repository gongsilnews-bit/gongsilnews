"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const SvgIcon = ({ children, ...props }: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {children}
  </svg>
);

const IconDashboard = (props: any) => <SvgIcon {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></SvgIcon>;
const IconMembers = (props: any) => <SvgIcon {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></SvgIcon>;
const IconBuilding = (props: any) => <SvgIcon {...props}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></SvgIcon>;
const IconArticle = (props: any) => <SvgIcon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></SvgIcon>;
const IconStudy = (props: any) => <SvgIcon {...props}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></SvgIcon>;
const IconEdit = (props: any) => <SvgIcon {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></SvgIcon>;
const IconBoard = (props: any) => <SvgIcon {...props}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></SvgIcon>;
const IconAd = (props: any) => <SvgIcon {...props}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></SvgIcon>;
const IconPlugin = (props: any) => <SvgIcon {...props}><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></SvgIcon>;
const IconStats = (props: any) => <SvgIcon {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></SvgIcon>;
const IconSettings = (props: any) => <SvgIcon {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SvgIcon>;
const IconManual = (props: any) => <SvgIcon {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></SvgIcon>;

type MenuItem = { key: string; label: string; icon: React.ReactElement; dividerBefore?: boolean; submenus?: { key: string; label: string }[] };

const MENU_ITEMS: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "members", label: "회원관리", icon: <IconMembers />, submenus: [
    { key: "members_list", label: "회원목록" },
    { key: "dormant", label: "휴면회원목록" },
    { key: "etc_register", label: "기타등록관리" },
    { key: "author_display", label: "필자표시관리" },
    { key: "department", label: "부서관리" },
  ]},
  { key: "gongsil", label: "공실관리", icon: <IconBuilding /> },
  { key: "article", label: "기사관리", icon: <IconArticle /> },
  { key: "study", label: "스터디관리", icon: <IconStudy /> },
  { key: "edit", label: "편집", icon: <IconEdit />, dividerBefore: true },
  { key: "board", label: "게시판", icon: <IconBoard /> },
  { key: "ad", label: "광고", icon: <IconAd />, dividerBefore: true },
  { key: "plugin", label: "부동산홈페이지", icon: <IconPlugin /> },
  { key: "stats", label: "통계", icon: <IconStats /> },
  { key: "settings", label: "정보설정", icon: <IconSettings />, dividerBefore: true },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
];

interface AdminSidebarProps {
  activeMenu: string;
  setActiveMenu?: (menu: string) => void;
  darkMode?: boolean;
}

export default function AdminSidebar({ activeMenu, setActiveMenu, darkMode = false }: AdminSidebarProps) {
  const router = useRouter();
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  
  const sidebarBg = darkMode ? "#000" : "#111111";

  const handleMenuClick = (key: string) => {
    if (setActiveMenu) {
      setActiveMenu(key);
    } else {
      // If we are not on the main /admin page, navigate back to /admin with the correct menu
      router.push(`/admin?menu=${key}`);
    }
  };

  return (
    <aside style={{ width: 80, height: "100vh", background: sidebarBg, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)", overflow: "visible" }}>
      {/* 로고 */}
      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 }}>
        <img src="/favicon.png" alt="공실뉴스 로고" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onClick={() => window.location.href = "/"} />
      </div>

      {/* 메뉴 리스트 */}
      <ul style={{ listStyle: "none", margin: 0, padding: "16px 0", flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
        {MENU_ITEMS.map((item) => (
          <React.Fragment key={item.key}>
            <li style={{ margin: 0, position: "relative", ...(item.dividerBefore ? { marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" } : {}) }}
              onMouseEnter={() => setHoveredMenu(item.key)}
              onMouseLeave={() => setHoveredMenu(null)}>
              <button
                onClick={() => handleMenuClick(item.key)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "18px 0", textDecoration: "none", width: "100%", border: "none", cursor: "pointer",
                  color: activeMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.5)",
                  background: activeMenu === item.key ? "rgba(255,255,255,0.12)" : hoveredMenu === item.key ? "rgba(255,255,255,0.06)" : "none",
                  borderLeft: activeMenu === item.key ? "3px solid #fff" : "3px solid transparent",
                  fontSize: 11, fontWeight: activeMenu === item.key ? 700 : 500, gap: 6, fontFamily: "inherit",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <span style={{
                  width: 22, height: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: activeMenu === item.key || hoveredMenu === item.key ? "#fff" : "rgba(255,255,255,0.5)",
                  transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: hoveredMenu === item.key && activeMenu !== item.key ? "translateY(-3px)" : "none"
                }}>
                  <span style={{ width: 22, height: 22, display: "block" }}>
                    {React.cloneElement(item.icon as React.ReactElement<any>, {
                      style: { width: 22, height: 22, stroke: activeMenu === item.key || hoveredMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.5)" }
                    })}
                  </span>
                </span>
                {item.label}
              </button>

              {/* 서브메뉴 (회원 메뉴만) */}
              {item.submenus && hoveredMenu === item.key && (
                <div style={{
                  position: "absolute", left: 80, top: 0, minWidth: 160,
                  background: darkMode ? "#25262b" : "#ffffff", borderRadius: 8,
                  boxShadow: "4px 4px 20px rgba(0,0,0,0.18)", zIndex: 100,
                  padding: "6px 0", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
                  animation: "fadeInSub 0.15s ease"
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", padding: "8px 18px 4px", letterSpacing: "0.08em", borderBottom: `1px solid ${darkMode ? "#3a3b3f" : "#f3f4f6"}`, marginBottom: 2, textTransform: "uppercase" as const }}>회원관리</div>
                  {item.submenus.map((sub) => (
                    <button key={sub.key} style={{
                      display: "block", padding: "10px 18px", fontSize: 13, fontWeight: 600,
                      color: darkMode ? "#ccc" : "#374151", textDecoration: "none", whiteSpace: "nowrap" as const,
                      cursor: "pointer", transition: "background 0.15s, color 0.15s",
                      borderLeft: "3px solid transparent", background: "none",
                      borderRight: "none", borderTop: "none", borderBottom: "none",
                      width: "100%", textAlign: "left" as const, fontFamily: "inherit",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#38393e" : "#f0f4ff"; e.currentTarget.style.borderLeftColor = darkMode ? "#fbbf24" : "#111111"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderLeftColor = "transparent"; }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          </React.Fragment>
        ))}
      </ul>


    </aside>
  );
}
