"use client";

import React, { useState, useEffect, lazy, Suspense, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { computeTheme, MenuItem } from "@/components/admin/sections/types";
import { IconDashboard, IconBuilding, IconArticle, IconStudy, IconCustomer, IconComment, IconManual, IconSettings, IconPoint, IconHomepage } from "@/components/admin/sections/AdminIcons";
import MemberRegisterForm from "@/components/admin/MemberRegisterForm";
import { getVacancies } from "@/app/actions/vacancy";
import AdminLoadingFallback from "@/components/admin/sections/AdminSkeletons";

/* ── Lazy-loaded 섹션 ── */
const DashboardSection = lazy(() => import("@/components/admin/sections/DashboardSection"));
const VacancySection = lazy(() => import("@/components/admin/sections/VacancySection"));
const MemberArticleSection = lazy(() => import("@/components/admin/sections/MemberArticleSection"));
const MyPointSection = lazy(() => import("@/components/admin/sections/MyPointSection"));
const HomepageSection = lazy(() => import("@/components/admin/sections/HomepageSection"));
const CustomerSection = lazy(() => import("@/components/admin/sections/CustomerSection"));
const CommentSection = lazy(() => import("@/components/admin/sections/CommentSection"));

/* ── 부동산관리자 메뉴 ── */
const REALTY_MENU: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "gongsil", label: "공실관리", icon: <IconBuilding /> },
  { key: "article", label: "기사관리", icon: <IconArticle /> },
  { key: "study", label: "스터디관리", icon: <IconStudy /> },
  { key: "customer", label: "고객관리", icon: <IconCustomer /> },
  { key: "comment", label: "댓글", icon: <IconComment /> },
  { key: "point", label: "포인트", icon: <IconPoint /> },
  { key: "homepage", label: "홈페이지", icon: <IconHomepage /> },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
  { key: "settings", label: "정보설정", icon: <IconSettings />, separated: true },
];

import { useRouter, useSearchParams } from "next/navigation";

export default function RealtyAdminPage() {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <RealtyAdminContent />
    </Suspense>
  );
}

function RealtyAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuParam = searchParams.get("menu");

  let initialMenu = "dashboard";
  if (menuParam && REALTY_MENU.some(m => m.key === menuParam)) {
    initialMenu = menuParam;
  }

  const [activeMenu, setActiveMenu] = useState(initialMenu);

  useEffect(() => {
    if (menuParam && REALTY_MENU.some(m => m.key === menuParam)) {
      setActiveMenu(menuParam);
    } else {
      setActiveMenu("dashboard");
    }
  }, [menuParam]);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("로딩중...");
  const [agencyStatus, setAgencyStatus] = useState<string>("PENDING");
  const [showDocWarning, setShowDocWarning] = useState(false);
  const [planType, setPlanType] = useState<string>("free");

  /* ── 프리페치 데이터 저장소 ── */
  const [prefetchedData, setPrefetchedData] = useState<Record<string, any[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  const prefetchSection = useCallback(async (key: string, ownerId?: string) => {
    if (prefetchedData[key] || fetchingRef.current.has(key)) return;
    fetchingRef.current.add(key);
    try {
      if (key === "gongsil" && ownerId) {
        const res = await getVacancies({ ownerId });
        if (res.success) setPrefetchedData(prev => ({ ...prev, gongsil: res.data || [] }));
      }
    } finally {
      fetchingRef.current.delete(key);
    }
  }, [prefetchedData]);

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // 🔐 비로그인 → 메인으로 리다이렉트
      if (!user) {
        window.location.href = "/";
        return;
      }

      // 🔐 role 체크: REALTOR만 접근 가능
      const { data: member } = await supabase
        .from("members")
        .select("id, name, role, plan_type")
        .eq("id", user.id)
        .single();

      if (!member || member.role !== "REALTOR") {
        alert("⚠️ 부동산회원만 접근할 수 있습니다.");
        window.location.href = "/";
        return;
      }

      setUserEmail(user.email || null);
      setMemberId(member.id);
      setUserName(member.name || "이름없음");
      setPlanType(member.plan_type || "free");

      const { data: agencyData } = await supabase.from("agencies").select("status, biz_cert_url, reg_cert_url").eq("owner_id", member.id).single();
      if (agencyData) {
        if (agencyData.status) setAgencyStatus(agencyData.status);
        if (!agencyData.biz_cert_url || !agencyData.reg_cert_url) setShowDocWarning(true);
      }

      // 공실 데이터 프리페치
      prefetchSection("gongsil", member.id);
      setAuthChecked(true);
    }
    fetchUser();
  }, []);

  /* ── 사이드바 호버 시 프리페치 ── */
  const handleMenuHover = useCallback((key: string) => {
    setHoveredMenu(key);
    if (key === "gongsil" && memberId) {
      prefetchSection("gongsil", memberId);
    }
  }, [prefetchSection, memberId]);

  const theme = computeTheme(darkMode);
  const sidebarBg = darkMode ? "#1e2a42" : "#1a3a6b";

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
      {/* ===== 좌측 사이드바 (80px, 블루 테마) ===== */}
      <aside style={{ width: 80, background: sidebarBg, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)" }}>
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 }}>
          <img src="/new_logo.png" alt="공실뉴스 로고" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onClick={() => window.location.href = "/"} />
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: "16px 0", flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
          {REALTY_MENU.map((item) => (
            <li key={item.key} style={{ margin: 0, position: "relative", ...(item.separated ? { marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.15)" } : {}) }}
              onMouseEnter={() => handleMenuHover(item.key)} onMouseLeave={() => setHoveredMenu(null)}>
              <button onClick={() => { setActiveMenu(item.key); router.push(`?menu=${item.key}`, { scroll: false }); }}
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

      {/* ===== 우측 메인 영역 ===== */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.bg, overflow: "hidden" }}>
        <header style={{ height: 64, background: theme.headerBg, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", flexShrink: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 12px", borderRadius: 6, transition: "background 0.2s" }}
            onClick={() => { setActiveMenu("settings"); router.push('?menu=settings'); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary }}>{userName}</span>
            <span style={{ fontSize: 14, color: darkMode ? "#aaa" : "#666" }}>{userEmail || "로딩중..."}</span>
            {planType === 'free' ? (
              <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, background: "#f3f4f6", color: "#4b5563" }}>무료부동산(Free)</span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, background: "#ebf5ff", color: "#3b82f6" }}>
                {planType === 'news_basic' || planType === 'news_premium' ? '공실뉴스' : planType === 'vacancy_basic' || planType === 'vacancy_premium' ? '공실등록' : '부동산회원(유료)'}
              </span>
            )}
            {agencyStatus === "REJECTED" && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, color: "#be123c", background: "#fee2e2", border: "1px solid #ef4444", display: "inline-flex", alignItems: "center", gap: 4 }}>🚨 보완요청 확인요망</span>}
            {agencyStatus === "PENDING" && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a" }}>⏳ 승인 대기중</span>}
            {agencyStatus === "APPROVED" && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, color: "#166534", background: "#dcfce7", border: "1px solid #bbf7d0" }}>✅ 정상승인</span>}
            {showDocWarning && <span onClick={() => { setActiveMenu("settings"); router.push('?menu=settings&tab=agency'); }} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 20, marginLeft: 8, color: "#c53030", background: "#fff5f5", border: "1px solid #fed7d7" }}>⚠️ 소장님! 아직 필수 서류를 다 내시지 않았어요! 👉 (여기를 클릭해서 서류를 제출해주세요)</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: darkMode ? "#2c2d31" : "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: darkMode ? "#e1e4e8" : "#555" }} title="다크모드 전환">{darkMode ? "☀️" : "🌙"}</button>
            <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = "/"; }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", border: "none", borderRadius: 6, background: darkMode ? "#374151" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>로그아웃</button>
            <a href="/" style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: darkMode ? "#e1e4e8" : "#4b5563", textDecoration: "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>🏠 공실페이지 가기</a>
          </div>
        </header>

        <Suspense fallback={<AdminLoadingFallback />}>
          {activeMenu === "dashboard" && <DashboardSection theme={theme} role="realtor" agencyStatus={agencyStatus} />}
          {activeMenu === "gongsil" && memberId && <VacancySection theme={theme} role="realtor" ownerId={memberId} ownerName={userName} initialData={prefetchedData["gongsil"]} />}
          {activeMenu === "article" && memberId && <MemberArticleSection theme={theme} memberId={memberId} memberName={userName} memberEmail={userEmail || undefined} role="realtor" />}
          {activeMenu === "point" && memberId && <MyPointSection theme={theme} memberId={memberId} role="realtor" />}
          {activeMenu === "settings" && (
            <div style={{ flex: 1, padding: "20px 28px", overflowY: "auto", background: theme.cardBg, margin: 16, marginBottom: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              {memberId ? <MemberRegisterForm editMemberId={memberId} onBack={() => setActiveMenu("dashboard")} initialTab={searchParams.get("tab") === "agency" ? 1 : 0} /> : <div style={{ textAlign: "center", padding: 40, color: theme.textSecondary }}>사용자 정보를 불러오는 중입니다...</div>}
            </div>
          )}
          {activeMenu === "homepage" && memberId && <HomepageSection theme={theme} memberId={memberId} planType={planType} />}
          {activeMenu === "customer" && memberId && <CustomerSection theme={theme} role="realtor" memberId={memberId} />}
          {activeMenu === "comment" && memberId && <CommentSection theme={theme} role="realtor" memberId={memberId} />}
          {["study", "manual"].includes(activeMenu) && (
            <div style={{ flex: 1, margin: 16, marginBottom: 0, background: theme.cardBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.textPrimary }}>{REALTY_MENU.find(m => m.key === activeMenu)?.label || activeMenu}</div>
                <div style={{ marginTop: 8, fontSize: 14 }}>준비 중인 기능입니다.</div>
              </div>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}
