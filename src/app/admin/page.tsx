"use client";

import { ADMIN_SKIN } from "@/components/admin/studioLight";
import React, { useState, useEffect, lazy, Suspense, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import NotificationBell from "@/components/common/NotificationBell";
import { computeTheme, MenuItem } from "@/components/admin/sections/types";
import { IconDashboard, IconMembers, IconBuilding, IconArticle, IconStudy, IconEdit, IconBoard, IconAd, IconPlugin, IconStats, IconSettings, IconManual, IconPoint, IconComment, IconRobot, IconSend, IconImage, IconFilm, IconMegaphone } from "@/components/admin/sections/AdminIcons";
import { getArticles } from "@/app/actions/article";
import AdminLoadingFallback from "@/components/admin/sections/AdminSkeletons";
import MemberRegisterForm from "@/components/admin/MemberRegisterForm";
import { isAdminRole } from "@/utils/permissionCheck";
import SuperAdminSidebar, { type AdminMenuGroup } from "@/components/admin/SuperAdminSidebar";
import AdminTabs from "@/components/admin/sections/AdminTabs";
import { getUnreadCountsByType, markAllNotificationsRead } from "@/app/actions/notification";

/* ── Lazy-loaded 섹션 ── */
const AdminHomeSection = lazy(() => import("@/components/admin/sections/AdminHomeSection")); // 가입 현황 · 처리할 일 (2026-11-09)
const VacancySection = lazy(() => import("@/components/admin/sections/VacancySection"));
const ArticleSection = lazy(() => import("@/components/admin/sections/ArticleSection"));
const StudySection = lazy(() => import("@/components/admin/sections/StudySection"));
const BoardSection = lazy(() => import("@/components/admin/sections/BoardSection"));
const MemberSection = lazy(() => import("@/components/admin/sections/MemberSection"));
const BannerSection = lazy(() => import("@/components/admin/sections/BannerSection"));
const PointSection = lazy(() => import("@/components/admin/sections/PointSection"));
const AdminManual = lazy(() => import("./AdminManual"));
const AIWorkspaceSection = lazy(() => import("@/components/admin/agents/AIWorkspaceSection"));
const InquirySection = lazy(() => import("@/components/admin/sections/InquirySection"));
const InquiryBoardSection = lazy(() => import("@/components/admin/sections/InquiryBoardSection"));
const NewsrealtySection = lazy(() => import("@/components/admin/sections/NewsrealtySection"));
const SmartstoreOrdersPanel = lazy(() => import("@/components/admin/sections/SmartstoreOrdersPanel"));
const MarketingSection = lazy(() => import("@/components/admin/sections/MarketingSection"));
const SttWordsSection = lazy(() => import("@/components/admin/sections/SttWordsSection"));
const AptReportsSection = lazy(() => import("@/components/admin/sections/AptReportsSection"));
const StudioAdsSection = lazy(() => import("@/components/admin/sections/StudioAdsSection"));
// 공실뉴스 홍보 — 회원 도구를 같이 쓴다 (관리자용을 따로 만들지 않음, 2026-11-09)
const PromoCalendarSection = lazy(() => import("@/components/admin/sections/PromoCalendarSection"));
const StudioSnsSection = lazy(() => import("@/components/admin/sections/StudioSnsSection"));
const PhotoStudio = lazy(() => import("@/components/admin/studio-photo/PhotoStudio"));
const VideoStudio = lazy(() => import("@/components/admin/studio-video/VideoStudio"));

/* ── 최고관리자 메뉴 — 세 부분 (2026-11-09 사장님 회의, docs/2026-11-09_superadmin_page_plan.md)
   메뉴 key 는 나중에 직원 권한(항목별·지역별)을 거는 이름표다. 바꾸지 말 것 ── */
const MEMBER_SUBMENUS = [{ key: "members_list", label: "회원목록" }, { key: "dormant", label: "휴지통" }, { key: "policy", label: "등급별 한도 설정" }, { key: "realty_menu", label: "중개사 메뉴 기본값" }];
const MENU_GROUPS: AdminMenuGroup[] = [
  { items: [{ key: "dashboard", label: "홈", icon: <IconDashboard /> }] },
  {
    title: "총괄",
    items: [
      { key: "approval", label: "승인·결제", icon: <IconEdit /> },
      { key: "members", label: "회원관리", icon: <IconMembers />, submenus: MEMBER_SUBMENUS },
      { key: "point", label: "포인트", icon: <IconPoint /> },
      { key: "gongsil", label: "공실관리", icon: <IconBuilding /> },
      { key: "apt_reports", label: "단지 정보 요청", icon: <IconBuilding /> }, // 시세 지도 공급면적·단지 정보 보완 (2026-11-02)
      { key: "article", label: "기사관리", icon: <IconArticle /> },
      { key: "agent", label: "AI 비서실", icon: <IconRobot /> },
      { key: "stt_words", label: "받아쓰기 낱말장", icon: <IconEdit /> },
      { key: "inquiry", label: "문의", icon: <IconComment /> },
      { key: "study", label: "특강관리", icon: <IconStudy /> },
      { key: "board", label: "게시판", icon: <IconBoard /> },
      { key: "ad", label: "광고", icon: <IconAd /> },
      { key: "studio_ads", label: "스튜디오 광고", icon: <IconAd /> },
      { key: "plugin", label: "부동산홈페이지", icon: <IconPlugin /> },
      { key: "stats", label: "통계", icon: <IconStats /> },
    ],
  },
  {
    title: "공실뉴스 홍보",
    items: [
      { key: "promo", label: "홍보 달력·현황", icon: <IconMegaphone /> },
      { key: "sns", label: "뉴스·SNS자동화", icon: <IconSend /> },
      { key: "photo", label: "포토studio", icon: <IconImage /> },
      { key: "video", label: "쇼츠릴스studio", icon: <IconFilm /> },
    ],
  },
  {
    title: "회원에게 연락",
    items: [{ key: "message", label: "문자·카톡 보내기", icon: <IconSend /> }],
  },
];
const BOTTOM_MENU: MenuItem[] = [
  { key: "settings", label: "정보설정", icon: <IconSettings /> },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
];
const ALL_MENU: MenuItem[] = [...MENU_GROUPS.flatMap((g) => g.items), ...BOTTOM_MENU];

/* 승인·결제 묶음 — 흩어져 있던 화면을 한곳에 (속 화면은 그대로) */
const APPROVAL_TABS = [
  { key: "member", label: "회원 승인" },
  { key: "newsrealty", label: "공실뉴스부동산 가입" },
  { key: "payment", label: "결제" },
  { key: "article", label: "기사 승인" },
];
/* 문의 — 문의관리 + 1:1문의 합침 */
const INQUIRY_TABS = [
  { key: "inquiry", label: "문의관리" },
  { key: "board", label: "1:1문의" },
];
const DEFAULT_SUB: Record<string, string> = { members: "members_list", approval: "member", inquiry: "inquiry", point: "members" };

/* 예전 메뉴 주소 → 새 자리 (알림 링크 등에 남아 있다) */
const OLD_MENU: Record<string, { menu: string; sub?: string }> = {
  newsrealty: { menu: "approval", sub: "newsrealty" },
  inquiry_board: { menu: "inquiry", sub: "board" },
  marketing: { menu: "message" },
};

/* ── 데이터 프리페치 — 기사관리만 (다른 섹션은 마운트 시 스스로 다시 부른다) ── */
const DATA_KEYS = ["article"] as const;
type DataKey = typeof DATA_KEYS[number];

import { useRouter, useSearchParams } from "next/navigation";

/** 메뉴·탭에 붙일 알림 종류 (안 읽은 건수를 숫자로) */
const MENU_NOTIFICATION_TYPES: Record<string, string[]> = {
  members: ["member_signup"],
  approval: ["newsrealty_apply", "study_apply", "smartstore_order", "article_pending"],
  gongsil: ["vacancy_new"],
  study: ["lecture_pending"],
  inquiry: ["inquiry_new", "inquiry_reply"],
};
const TAB_NOTIFICATION_TYPES: Record<string, string[]> = {
  newsrealty: ["newsrealty_apply", "study_apply"],
  payment: ["smartstore_order"],
  article: ["article_pending"],
};

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <AdminContent />
    </Suspense>
  );
}

function resolveMenu(menu: string | null, sub: string | null): { menu: string; sub: string } {
  if (menu && OLD_MENU[menu]) return { menu: OLD_MENU[menu].menu, sub: OLD_MENU[menu].sub || DEFAULT_SUB[OLD_MENU[menu].menu] || "" };
  if (menu && ALL_MENU.some((m) => m.key === menu)) return { menu, sub: sub || DEFAULT_SUB[menu] || "" };
  return { menu: "dashboard", sub: "" };
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuParam = searchParams.get("menu");
  const tabParam = searchParams.get("tab");

  const [activeMenu, setActiveMenu] = useState(() => resolveMenu(menuParam, tabParam).menu);
  const [activeSubmenu, setActiveSubmenu] = useState(() => resolveMenu(menuParam, tabParam).sub || "members_list");
  const [menuBadges, setMenuBadges] = useState<Record<string, number>>({});
  const [tabBadges, setTabBadges] = useState<Record<string, number>>({});
  const [approvalMemberTab, setApprovalMemberTab] = useState("pending"); // 승인·결제 → 회원 승인은 승인대기로 열린다

  // 메뉴별 안 읽은 알림 건수 (네이버 메일 알림처럼 숫자로 보여준다)
  const loadMenuBadges = useCallback(async () => {
    const res = await getUnreadCountsByType({ isAdmin: true });
    if (!res.success) return;
    const sum = (types: string[]) => types.reduce((s, t) => s + (res.data[t] || 0), 0);
    const byMenu: Record<string, number> = {};
    Object.entries(MENU_NOTIFICATION_TYPES).forEach(([k, types]) => { byMenu[k] = sum(types); });
    const byTab: Record<string, number> = {};
    Object.entries(TAB_NOTIFICATION_TYPES).forEach(([k, types]) => { byTab[k] = sum(types); });
    setMenuBadges(byMenu);
    setTabBadges(byTab);
  }, []);

  const markRead = useCallback(async (types: string[] | undefined) => {
    if (!types?.length) return;
    await markAllNotificationsRead({ isAdmin: true, types });
    void loadMenuBadges();
  }, [loadMenuBadges]);

  useEffect(() => {
    void (async () => { await loadMenuBadges(); })();
  }, [loadMenuBadges]);

  // 새 알림이 들어오면 숫자가 바로 올라간다
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-menu-badges")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        void loadMenuBadges();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadMenuBadges]);

  // 주소(뒤로 가기·알림 링크)가 바뀌면 화면도 따라간다
  useEffect(() => {
    const r = resolveMenu(menuParam, tabParam);
    setActiveMenu(r.menu);
    if (r.sub) setActiveSubmenu(r.sub);
  }, [menuParam, tabParam]);

  const [darkMode, setDarkMode] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [adminUserName, setAdminUserName] = useState("공실뉴스");
  const [adminUserEmail, setAdminUserEmail] = useState("");

  /* ── 프리페치 데이터 저장소 ── */
  const [prefetchedData, setPrefetchedData] = useState<Record<string, any[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  const prefetchSection = useCallback(async (key: string) => {
    if (prefetchedData[key] || fetchingRef.current.has(key)) return;
    fetchingRef.current.add(key);
    try {
      let data: any[] = [];
      if (key === "article") {
        // ArticleSection 이 마운트 직후 실행하는 첫 쿼리와 같은 조건
        const res = await getArticles({ page: 1, limit: 30, orderBy: "published_at", noCache: true, slim: true });
        if (res.success) data = res.data || [];
      }
      setPrefetchedData(prev => ({ ...prev, [key]: data }));
    } finally {
      fetchingRef.current.delete(key);
    }
  }, [prefetchedData]);

  const [authChecked, setAuthChecked] = useState(false);

  /* ── 초기 로드: 인증 확인 ── */
  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/";
        return;
      }
      // 🔐 role 체크: ADMIN만 접근 가능 (직원 권한은 나중에 — 문서 6장)
      const { data: member } = await supabase
        .from("members")
        .select("role, name, email")
        .eq("id", user.id)
        .single();
      if (!member || !isAdminRole(member.role)) {
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
  }, []);

  const handleMenuHover = useCallback((key: string) => {
    if (DATA_KEYS.includes(key as DataKey)) prefetchSection(key);
  }, [prefetchSection]);

  /** 메뉴·탭 이동 — 주소에 남겨 새로고침·뒤로 가기에도 그 자리 */
  const go = useCallback((menu: string, sub?: string) => {
    const r = resolveMenu(menu, sub || null);
    setActiveMenu(r.menu);
    if (r.sub) setActiveSubmenu(r.sub);
    const tab = sub && r.sub && r.sub !== DEFAULT_SUB[r.menu] ? `&tab=${r.sub}` : "";
    router.push(`?menu=${r.menu}${tab}`, { scroll: false });
    // 그 화면을 열었으면 그 종류의 알림은 확인한 것으로 본다
    if (r.menu === "approval") {
      const types = TAB_NOTIFICATION_TYPES[r.sub];
      if (types) { setTabBadges(prev => ({ ...prev, [r.sub]: 0 })); void markRead(types); }
    } else if (MENU_NOTIFICATION_TYPES[r.menu]) {
      setMenuBadges(prev => ({ ...prev, [r.menu]: 0 }));
      void markRead(MENU_NOTIFICATION_TYPES[r.menu]);
    }
  }, [router, markRead]);

  const theme = computeTheme(darkMode);

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

  const approvalBadge = Object.values(tabBadges).reduce((s, n) => s + (n || 0), 0);
  const sideBadges = { ...menuBadges, approval: approvalBadge };
  const sectionCol: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: theme.bg, overflow: "hidden" }}>
      <SuperAdminSidebar groups={MENU_GROUPS} bottom={BOTTOM_MENU} activeMenu={activeMenu} activeSubmenu={activeSubmenu} onSelect={go} onHover={handleMenuHover} badges={sideBadges} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.bg, overflow: "auto", minWidth: 0 }}>
        <header style={{ height: 64, background: theme.headerBg, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 12px", borderRadius: 6, transition: "background 0.2s" }}
            onClick={() => go("settings")}
            onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary }}>{adminUserName}</span>
            {adminUserEmail && <span style={{ fontSize: 14, color: darkMode ? "#aaa" : "#666" }}>{adminUserEmail}</span>}
            <span style={{ fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 4, marginLeft: 4, background: darkMode ? "#1e3a5f" : "#eef1f7", color: darkMode ? "#93c5fd" : "#1e3a6e" }}>최고관리자</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <NotificationBell color={darkMode ? "#e1e4e8" : "#333"} />
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: darkMode ? "#2c2d31" : "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: darkMode ? "#e1e4e8" : "#555" }} title="다크모드 전환">
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut({ scope: "local" }); window.location.href = "/"; }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", border: "none", borderRadius: 6, background: darkMode ? "#374151" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>로그아웃</button>
          </div>
        </header>

        {/* 콘텐츠 영역 — 밝은 화면이면 곤색 껍질 (2026-11-03) */}
        {!darkMode && <style>{ADMIN_SKIN}</style>}
        <div className={darkMode ? undefined : "gs-adm"} style={{ display: "contents" }}>
        <Suspense fallback={<AdminLoadingFallback />}>
          {activeMenu === "dashboard" && <AdminHomeSection theme={theme} onGo={go} />}

          {/* ── 총괄 ── */}
          {activeMenu === "approval" && (
            <div style={sectionCol}>
              <AdminTabs theme={theme} title="승인·결제" tabs={APPROVAL_TABS} active={activeSubmenu} onChange={(k) => go("approval", k)} counts={tabBadges} />
              {activeSubmenu === "member" && <MemberSection key="approval-member" theme={theme} activeSubmenu={approvalMemberTab} onSubmenuChange={setApprovalMemberTab} />}
              {activeSubmenu === "newsrealty" && <NewsrealtySection theme={theme} />}
              {activeSubmenu === "payment" && (
                <div style={{ padding: "16px 28px" }}>
                  <SmartstoreOrdersPanel theme={theme} />
                  <div style={{ marginTop: 12, fontSize: 13, color: theme.textSecondary }}>
                    포인트 충전·사용 기록은 <button onClick={() => go("point", "transactions")} style={{ border: "none", background: "none", padding: 0, color: "#1e3a6e", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13, textDecoration: "underline" }}>포인트</button> 메뉴에서 봐요.
                  </div>
                </div>
              )}
              {activeSubmenu === "article" && <ArticleSection key="approval-article" theme={theme} initialFilter="승인대기" />}
            </div>
          )}
          {activeMenu === "members" && <MemberSection theme={theme} activeSubmenu={activeSubmenu} onSubmenuChange={(s) => go("members", s)} />}
          {activeMenu === "point" && <PointSection theme={theme} activeSubmenu={activeSubmenu} onSubmenuChange={(s) => go("point", s)} />}
          {activeMenu === "gongsil" && <VacancySection theme={theme} role="admin" ownerId={adminUserId} />}
          {activeMenu === "apt_reports" && <AptReportsSection theme={theme} />}
          {activeMenu === "article" && <ArticleSection theme={theme} initialData={prefetchedData["article"]} />}
          {activeMenu === "agent" && <AIWorkspaceSection theme={theme} />}
          {activeMenu === "stt_words" && <SttWordsSection theme={theme} />}
          {activeMenu === "inquiry" && (
            <div style={sectionCol}>
              <AdminTabs theme={theme} title="문의" tabs={INQUIRY_TABS} active={activeSubmenu} onChange={(k) => go("inquiry", k)} />
              {activeSubmenu === "board" ? <InquiryBoardSection theme={theme} replyAuthorName="최고관리자" /> : <InquirySection theme={theme} />}
            </div>
          )}
          {activeMenu === "study" && <StudySection theme={theme} />}
          {activeMenu === "board" && <BoardSection theme={theme} />}
          {activeMenu === "ad" && <BannerSection theme={theme} />}
          {activeMenu === "studio_ads" && <StudioAdsSection theme={theme} />}

          {/* ── 공실뉴스 홍보 ── */}
          {activeMenu === "promo" && adminUserId && <PromoCalendarSection theme={theme} adminId={adminUserId} />}
          {activeMenu === "sns" && adminUserId && <StudioSnsSection theme={theme} memberId={adminUserId} />}
          {activeMenu === "photo" && <PhotoStudio menu={null} />}
          {activeMenu === "video" && <VideoStudio />}

          {/* ── 회원에게 연락 ── */}
          {activeMenu === "message" && <MarketingSection theme={theme} />}

          {activeMenu === "manual" && <AdminManual />}
          {activeMenu === "settings" && (
            <div style={{ flex: 1, padding: "20px 28px", overflowY: "auto", background: theme.cardBg, margin: 16, marginBottom: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              {adminUserId ? <MemberRegisterForm editMemberId={adminUserId} onBack={() => go("dashboard")} /> : <div style={{ textAlign: "center", padding: 40, color: theme.textSecondary }}>사용자 정보를 불러오는 중입니다...</div>}
            </div>
          )}
          {["plugin", "stats"].includes(activeMenu) && (
            <div style={{ flex: 1, margin: 16, marginBottom: 0, background: theme.cardBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.textPrimary }}>{ALL_MENU.find(m => m.key === activeMenu)?.label || activeMenu}</div>
                <div style={{ marginTop: 8, fontSize: 14 }}>준비 중인 기능입니다.</div>
              </div>
            </div>
          )}
        </Suspense>
        </div>
      </main>
    </div>
  );
}
