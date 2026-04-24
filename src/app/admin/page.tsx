"use client";

import React, { useState, useEffect, lazy, Suspense, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { computeTheme, MenuItem } from "@/components/admin/sections/types";
import { IconDashboard, IconMembers, IconBuilding, IconArticle, IconStudy, IconEdit, IconBoard, IconAd, IconPlugin, IconStats, IconSettings, IconManual, IconPoint, IconComment } from "@/components/admin/sections/AdminIcons";
import { getVacancies } from "@/app/actions/vacancy";
import { adminGetMembers } from "@/app/admin/actions";
import { getArticles } from "@/app/actions/article";
import AdminLoadingFallback from "@/components/admin/sections/AdminSkeletons";
import MemberRegisterForm from "@/components/admin/MemberRegisterForm";

/* ── Lazy-loaded 섹션 ── */
const DashboardSection = lazy(() => import("@/components/admin/sections/DashboardSection"));
const VacancySection = lazy(() => import("@/components/admin/sections/VacancySection"));
const ArticleSection = lazy(() => import("@/components/admin/sections/ArticleSection"));
const StudySection = lazy(() => import("@/components/admin/sections/StudySection"));
const BoardSection = lazy(() => import("@/components/admin/sections/BoardSection"));
const MemberSection = lazy(() => import("@/components/admin/sections/MemberSection"));
const BannerSection = lazy(() => import("@/components/admin/sections/BannerSection"));
const PointSection = lazy(() => import("@/components/admin/sections/PointSection"));
const AdminManual = lazy(() => import("./AdminManual"));
const CommentSection = lazy(() => import("@/components/admin/sections/CommentSection"));

/* ── 최고관리자 메뉴 ── */
const ADMIN_MENU: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "members", label: "회원관리", icon: <IconMembers />, submenus: [{ key: "members_list", label: "회원목록" }, { key: "dormant", label: "휴지통" }] },
  { key: "gongsil", label: "공실관리", icon: <IconBuilding /> },
  { key: "article", label: "기사관리", icon: <IconArticle /> },
  { key: "comment", label: "공실Talk", icon: <IconComment /> },
  { key: "study", label: "스터디관리", icon: <IconStudy /> },
  { key: "edit", label: "편집", icon: <IconEdit /> },
  { key: "board", label: "게시판", icon: <IconBoard /> },
  { key: "ad", label: "광고", icon: <IconAd /> },
  { key: "plugin", label: "부동산홈페이지", icon: <IconPlugin /> },
  { key: "point", label: "포인트", icon: <IconPoint /> },
  { key: "stats", label: "통계", icon: <IconStats /> },
  { key: "settings", label: "정보설정", icon: <IconSettings />, dividerBefore: true },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
];

/* ── 데이터 프리페치 매핑 ── */
const DATA_KEYS = ["gongsil", "members", "article"] as const;
type DataKey = typeof DATA_KEYS[number];

import { useRouter, useSearchParams } from "next/navigation";

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuParam = searchParams.get("menu");

  let initialMenu = "dashboard";
  if (menuParam && ADMIN_MENU.some(m => m.key === menuParam)) {
    initialMenu = menuParam;
  }
  
  const [activeMenu, setActiveMenu] = useState(initialMenu);

  useEffect(() => {
    if (menuParam && ADMIN_MENU.some(m => m.key === menuParam)) {
      setActiveMenu(menuParam);
    } else {
      setActiveMenu("dashboard");
    }
  }, [menuParam]);
  const [activeSubmenu, setActiveSubmenu] = useState("members_list");
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [adminUserName, setAdminUserName] = useState("공실뉴스");
  const [adminUserEmail, setAdminUserEmail] = useState("");

  /* ── 프리페치 데이터 저장소 ── */
  const [prefetchedData, setPrefetchedData] = useState<Record<string, any[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  /* ── 단일 섹션 데이터 프리페치 ── */
  const prefetchSection = useCallback(async (key: string) => {
    if (prefetchedData[key] || fetchingRef.current.has(key)) return;
    fetchingRef.current.add(key);
    try {
      let data: any[] = [];
      if (key === "gongsil") {
        const res = await getVacancies({ all: true });
        if (res.success) data = res.data || [];
      } else if (key === "members") {
        const res = await adminGetMembers();
        if (res?.success) data = res.data || [];
      } else if (key === "article") {
        const res = await getArticles();
        if (res.success) data = res.data || [];
      }
      setPrefetchedData(prev => ({ ...prev, [key]: data }));
    } finally {
      fetchingRef.current.delete(key);
    }
  }, [prefetchedData]);

  const [authChecked, setAuthChecked] = useState(false);

  /* ── 초기 로드: 인증 확인 + 데이터 프리페치 ── */
  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // 🔐 비로그인 → 메인으로 리다이렉트
      if (!user) {
        window.location.href = "/";
        return;
      }

      // 🔐 role 체크: ADMIN만 접근 가능
      const { data: member } = await supabase
        .from("members")
        .select("role, name, email")
        .eq("id", user.id)
        .single();

      if (!member || member.role !== "ADMIN") {
        alert("⚠️ 접근 권한이 없습니다.");
        window.location.href = "/";
        return;
      }

      setAdminUserId(user.id);
      if (member.name) setAdminUserName(member.name);
      if (member.email || user.email) setAdminUserEmail(member.email || user.email || "");
      
      setAuthChecked(true);
    }
    fetchUser();

    // 모든 데이터 섹션 병렬 프리페치
    Promise.all(DATA_KEYS.map(k => prefetchSection(k)));
  }, []);

  /* ── 사이드바 호버 시 프리페치 ── */
  const handleMenuHover = useCallback((key: string) => {
    setHoveredMenu(key);
    if (DATA_KEYS.includes(key as DataKey)) {
      prefetchSection(key);
    }
  }, [prefetchSection]);

  const theme = computeTheme(darkMode);
  const sidebarBg = darkMode ? "#000" : "#111111";

  // 🔐 인증 확인 전까지 빈 화면 (깜빡임 방지)
  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>권한을 확인하고 있습니다...</div>
        </div>
      </div>
    );
  }

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
              onMouseEnter={() => handleMenuHover(item.key)}
              onMouseLeave={() => setHoveredMenu(null)}>
              <button
                onClick={() => {
                  setActiveMenu(item.key);
                  if (item.submenus) setActiveSubmenu(item.submenus[0].key);
                  router.push(`?menu=${item.key}`, { scroll: false });
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
              {/* 서브메뉴 (플라이아웃) */}
              {item.submenus && hoveredMenu === item.key && (
                <div style={{ position: "absolute", left: 80, top: 0, background: darkMode ? "#25262b" : "#fff", borderRadius: "0 8px 8px 0", boxShadow: "4px 4px 16px rgba(0,0,0,0.15)", minWidth: 140, zIndex: 100, overflow: "hidden", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}` }}>
                  {item.submenus.map(sub => (
                    <button key={sub.key} onClick={() => { setActiveMenu(item.key); setActiveSubmenu(sub.key); }}
                      style={{ display: "block", width: "100%", border: "none", background: activeMenu === item.key && activeSubmenu === sub.key ? (darkMode ? "rgba(255,255,255,0.12)" : "#f1f5f9") : "none", color: activeMenu === item.key && activeSubmenu === sub.key ? (darkMode ? "#fff" : "#111") : (darkMode ? "#ccc" : "#555"), fontSize: 13, fontWeight: 600, padding: "12px 20px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background 0.15s" }}
                      onMouseEnter={e => { if (!(activeMenu === item.key && activeSubmenu === sub.key)) e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.06)" : "#f8fafc"; }}
                      onMouseLeave={e => { if (!(activeMenu === item.key && activeSubmenu === sub.key)) e.currentTarget.style.background = "none"; }}>
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
            onClick={() => { setActiveMenu("settings"); router.push('?menu=settings'); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary }}>{adminUserName}</span>
            {adminUserEmail && <span style={{ fontSize: 14, color: darkMode ? "#aaa" : "#666" }}>{adminUserEmail}</span>}
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
        <Suspense fallback={<AdminLoadingFallback />}>
          {activeMenu === "dashboard" && <DashboardSection theme={theme} role="admin" />}
          {activeMenu === "members" && <MemberSection theme={theme} activeSubmenu={activeSubmenu as "members_list" | "dormant"} onSubmenuChange={setActiveSubmenu} initialData={prefetchedData["members"]} />}
          {activeMenu === "gongsil" && <VacancySection theme={theme} role="admin" ownerId={adminUserId} initialData={prefetchedData["gongsil"]} />}
          {activeMenu === "article" && <ArticleSection theme={theme} initialData={prefetchedData["article"]} />}
          {activeMenu === "study" && <StudySection theme={theme} />}
          {activeMenu === "board" && <BoardSection theme={theme} />}
          {activeMenu === "ad" && <BannerSection theme={theme} />}
          {activeMenu === "point" && <PointSection theme={theme} activeSubmenu={activeSubmenu} onSubmenuChange={setActiveSubmenu} />}
          {activeMenu === "comment" && <CommentSection theme={theme} role="admin" />}
          {activeMenu === "manual" && <AdminManual />}
          {activeMenu === "settings" && (
            <div style={{ flex: 1, padding: "20px 28px", overflowY: "auto", background: theme.cardBg, margin: 16, marginBottom: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              {adminUserId ? <MemberRegisterForm editMemberId={adminUserId} onBack={() => setActiveMenu("dashboard")} /> : <div style={{ textAlign: "center", padding: 40, color: theme.textSecondary }}>사용자 정보를 불러오는 중입니다...</div>}
            </div>
          )}
          {["edit", "plugin", "stats"].includes(activeMenu) && (
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
