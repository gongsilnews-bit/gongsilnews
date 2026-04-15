"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { computeTheme, MenuItem } from "@/components/admin/sections/types";
import { IconDashboard, IconMembers, IconBuilding, IconArticle, IconStudy, IconEdit, IconBoard, IconAd, IconPlugin, IconStats, IconSettings, IconManual } from "@/components/admin/sections/AdminIcons";

/* ── Lazy-loaded 섹션 ── */
const DashboardSection = lazy(() => import("@/components/admin/sections/DashboardSection"));
const VacancySection = lazy(() => import("@/components/admin/sections/VacancySection"));
const ArticleSection = lazy(() => import("@/components/admin/sections/ArticleSection"));
const StudySection = lazy(() => import("@/components/admin/sections/StudySection"));
const BoardSection = lazy(() => import("@/components/admin/sections/BoardSection"));
const MemberSection = lazy(() => import("@/components/admin/sections/MemberSection"));
const AdminManual = lazy(() => import("./AdminManual"));

/* ── 최고관리자 메뉴 ── */
const ADMIN_MENU: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "members", label: "회원관리", icon: <IconMembers />, submenus: [{ key: "members_list", label: "회원목록" }, { key: "dormant", label: "휴지통" }] },
  { key: "gongsil", label: "공실관리", icon: <IconBuilding /> },
  { key: "article", label: "기사관리", icon: <IconArticle /> },
  { key: "study", label: "스터디관리", icon: <IconStudy /> },
  { key: "edit", label: "편집", icon: <IconEdit /> },
  { key: "board", label: "게시판", icon: <IconBoard /> },
  { key: "ad", label: "광고", icon: <IconAd /> },
  { key: "plugin", label: "플러그인", icon: <IconPlugin /> },
  { key: "stats", label: "통계", icon: <IconStats /> },
  { key: "settings", label: "환경설정", icon: <IconSettings />, dividerBefore: true },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
];

const LoadingSpinner = () => (
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontSize: 16, color: "#9ca3af" }}>로딩중...</div>
  </div>
);

export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [activeSubmenu, setActiveSubmenu] = useState("members_list");
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminUserId(user.id);
    }
    fetchUser();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const menuParam = params.get("menu");
      if (menuParam && ADMIN_MENU.some(m => m.key === menuParam)) {
        setActiveMenu(menuParam);
      }
    }
  }, []);

  const theme = computeTheme(darkMode);
  const sidebarBg = darkMode ? "#000" : "#111111";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: theme.bg, overflow: "hidden" }}>
      {/* ===== 좌측 사이드바 (80px, 블랙 테마) ===== */}
      <aside style={{ width: 80, background: sidebarBg, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 12px rgba(0,0,0,0.18)" }}>
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", flexShrink: 0 }}>
          <img src="/favicon.png" alt="공실뉴스 로고" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onClick={() => window.location.href = "/"} />
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: "16px 0", flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
          {ADMIN_MENU.map((item) => (
            <li key={item.key} style={{ margin: 0, position: "relative", ...(item.dividerBefore ? { marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" } : {}) }}
              onMouseEnter={() => setHoveredMenu(item.key)}
              onMouseLeave={() => setHoveredMenu(null)}>
              <button
                onClick={() => {
                  setActiveMenu(item.key);
                  if (item.submenus) setActiveSubmenu(item.submenus[0].key);
                }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "18px 0", textDecoration: "none", width: "100%", border: "none", cursor: "pointer",
                  color: activeMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.5)",
                  background: activeMenu === item.key ? "rgba(255,255,255,0.12)" : hoveredMenu === item.key ? "rgba(255,255,255,0.06)" : "none",
                  borderLeft: activeMenu === item.key ? "3px solid #fff" : "3px solid transparent",
                  fontSize: 11, fontWeight: activeMenu === item.key ? 700 : 500, gap: 6, fontFamily: "inherit",
                  transition: "all 0.2s ease",
                }}>
                <span style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", transform: hoveredMenu === item.key ? "translateY(-2px)" : "none" }}>
                  <span style={{ width: 22, height: 22, display: "block" }}>
                    {React.cloneElement(item.icon as React.ReactElement<any>, { style: { width: 22, height: 22, stroke: activeMenu === item.key || hoveredMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.5)" } })}
                  </span>
                </span>
                {item.label}
              </button>
              {/* 서브메뉴 */}
              {item.submenus && activeMenu === item.key && (
                <div style={{ background: "rgba(255,255,255,0.06)" }}>
                  {item.submenus.map(sub => (
                    <button key={sub.key} onClick={() => setActiveSubmenu(sub.key)}
                      style={{ display: "block", width: "100%", border: "none", background: activeSubmenu === sub.key ? "rgba(255,255,255,0.12)" : "none", color: activeSubmenu === sub.key ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 600, padding: "10px 0", cursor: "pointer", fontFamily: "inherit" }}>
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* ===== 우측 메인 영역 ===== */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.bg, overflow: "hidden" }}>
        {/* 상단 헤더 */}
        <header style={{ height: 64, background: theme.headerBg, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", flexShrink: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 12px", borderRadius: 6, transition: "background 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary }}>공실뉴스</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, background: darkMode ? "#1e3a5f" : "#dbeafe", color: "#3b82f6" }}>최고관리자</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: darkMode ? "#2c2d31" : "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: darkMode ? "#e1e4e8" : "#555" }} title="다크모드 전환">
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = "/"; }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", border: "none", borderRadius: 6, background: darkMode ? "#374151" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>로그아웃</button>
            <a href="/" style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: darkMode ? "#e1e4e8" : "#4b5563", textDecoration: "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>🏠 공실페이지 가기</a>
          </div>
        </header>

        {/* 콘텐츠 영역 */}
        <Suspense fallback={<LoadingSpinner />}>
          {activeMenu === "dashboard" && <DashboardSection theme={theme} role="admin" />}
          {activeMenu === "members" && <MemberSection theme={theme} activeSubmenu={activeSubmenu as "members_list" | "dormant"} onSubmenuChange={setActiveSubmenu} />}
          {activeMenu === "gongsil" && <VacancySection theme={theme} role="admin" ownerId={adminUserId} />}
          {activeMenu === "article" && <ArticleSection theme={theme} />}
          {activeMenu === "study" && <StudySection theme={theme} />}
          {activeMenu === "board" && <BoardSection theme={theme} />}
          {activeMenu === "manual" && <AdminManual />}
          {["edit", "ad", "plugin", "stats", "settings"].includes(activeMenu) && (
            <div style={{ flex: 1, margin: 16, marginBottom: 0, background: theme.cardBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.textPrimary }}>{ADMIN_MENU.find(m => m.key === activeMenu)?.label || activeMenu}</div>
                <div style={{ marginTop: 8, fontSize: 14 }}>준비 중인 기능입니다.</div>
              </div>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}
