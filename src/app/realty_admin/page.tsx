"use client";

import React, { useState, useEffect, lazy, Suspense, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import NotificationBell from "@/components/common/NotificationBell";
import HomepageHeaderBar from "@/components/admin/HomepageHeaderBar";
import { computeTheme, MenuItem } from "@/components/admin/sections/types";
import { IconDashboard, IconBuilding, IconArticle, IconAd, IconStudy, IconCustomer, IconComment, IconManual, IconSettings, IconPoint, IconHomepage, IconSend, IconFilm, IconImage } from "@/components/admin/sections/AdminIcons";
import StudioSidebar, { useStudioApp } from "@/components/admin/StudioSidebar";
import { FACTORY_LAYOUT, normalizeLayout, menuItem, MenuLayoutEditor, type MenuLayout } from "@/components/admin/realtyMenu";
import { getRealtyMenu, saveMyRealtyMenu } from "@/app/actions/realtyMenu";
import MemberRegisterForm from "@/components/admin/MemberRegisterForm";
import ArticleAdUpgradeModal from "@/components/admin/ArticleAdUpgradeModal";
import { getVacancies } from "@/app/actions/vacancy";
import { getMyArticles } from "@/app/actions/article";
import { getAuthorArticlesAdSettingsMap } from "@/app/actions/articleAd";
import { adminApproveRealtorApplication, normalizePendingRealtorRole } from "@/app/admin/actions";
import AdminLoadingFallback from "@/components/admin/sections/AdminSkeletons";
import { getEffectiveMemberRole, isAdminRole } from "@/utils/permissionCheck";

/* ── Lazy-loaded 섹션 ── */
const DashboardSection = lazy(() => import("@/components/admin/sections/DashboardSection"));
const VacancySection = lazy(() => import("@/components/admin/sections/VacancySection"));
const MemberArticleSection = lazy(() => import("@/components/admin/sections/MemberArticleSection"));
const MemberArticleAdSection = lazy(() => import("@/components/admin/sections/MemberArticleAdSection"));
const MyPointSection = lazy(() => import("@/components/admin/sections/MyPointSection"));
const IntakeStudio = lazy(() => import("@/components/admin/sections/IntakeStudio"));
const CustomerSection = lazy(() => import("@/components/admin/sections/CustomerSection"));
const InquiryBoardSection = lazy(() => import("@/components/admin/sections/InquiryBoardSection"));
const StudySection = lazy(() => import("@/components/admin/sections/StudySection"));
const ManualFrame = lazy(() => import("@/components/admin/sections/ManualFrame"));
const StudioComingSoon = lazy(() => import("@/components/admin/sections/StudioComingSoon"));
const StudioMarketingSection = lazy(() => import("@/components/admin/sections/StudioMarketingSection"));
const StudioSnsSection = lazy(() => import("@/components/admin/sections/StudioSnsSection"));
const VideoStudio = lazy(() => import("@/components/admin/studio-video/VideoStudio"));
const PhotoStudio = lazy(() => import("@/components/admin/studio-photo/PhotoStudio"));
import StudioPromoSection from "@/components/admin/sections/StudioPromoSection";

/* ── 부동산관리자 메뉴 ── */
const REALTY_MENU: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "gongsil", label: "공실관리", icon: <IconBuilding /> },
  { key: "article", label: "기사관리", icon: <IconArticle /> },
  { key: "article_ad", label: "광고관리", icon: <IconAd /> },
  { key: "study", label: "특강관리", icon: <IconStudy /> },
  { key: "customer", label: "고객문의", icon: <IconCustomer /> },
  { key: "inquiry_board", label: "1:1문의", icon: <IconCustomer /> },
  { key: "point", label: "포인트", icon: <IconPoint /> },
  { key: "homepage", label: "물건접수웹페이지", icon: <IconHomepage /> },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
  // 웹에서만 — 공실스튜디오(PC 앱) 소개·받기 (2026-10-26 사장님: 만드는 기능은 앱에서)
  { key: "studio", label: "공실스튜디오", icon: <IconFilm /> },
  { key: "settings", label: "정보설정", icon: <IconSettings />, separated: true },
];

/* ── 공실스튜디오 텍스트 메뉴 ──
   업무 메뉴 6개만 위에 두고 나머지는 [더보기]에 접는다.
   2026-10-15 앱에서 먼저 써 보고 웹에도 켰다. 예전 아이콘 메뉴로 돌리려면 STUDIO_MENU_ON_WEB 을 false 로.
   2026-10-26 사장님: 웹은 일반회원과 같은 아이콘 메뉴(무료 관리 기능만) — 지금 모양은 공실스튜디오 앱에서만 */
const STUDIO_MENU_ON_WEB = false;
const STUDIO_MAIN_MENU: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "gongsil", label: "공실등록", icon: <IconBuilding /> },
  { key: "article", label: "기사등록", icon: <IconArticle /> },
  { key: "marketing", label: "공실마케팅", icon: <IconSend /> },
  { key: "sns", label: "뉴스·SNS발행", icon: <IconSend /> },
  { key: "video", label: "동영상제작", icon: <IconFilm /> },
  { key: "photo", label: "이미지제작", icon: <IconImage /> },
  { key: "customer", label: "고객관리", icon: <IconCustomer /> },
];
const STUDIO_MORE_KEYS = ["article_ad", "study", "inquiry_board", "point", "homepage", "manual"];
const STUDIO_MORE_MENU = REALTY_MENU.filter((m) => STUDIO_MORE_KEYS.includes(m.key));
const STUDIO_SETTINGS_MENU = REALTY_MENU.find((m) => m.key === "settings")!;
// 메뉴 오른쪽 파일 표시 — 그 메뉴가 만드는 파일 (.gsn·.gsm·.gss·.psd, 글자 + 동그라미 픽토그램 — StudioSidebar FileBadge) — 2026-10-23 사장님: NEW 대신
// 앱에서만 잠시 숨기는 메뉴 — 공실마케팅은 미완성이라 앱 배포에서 뺀다 (2026-10-23 사장님). 다시 보이려면 [] 로 (코드·작업은 그대로)
const HIDDEN_IN_APP: string[] = []; // 공실마케팅 공개 (2026-10-23 사장님 — AI 매물보고서만, 나머지는 메뉴 안에서 "작업중")
const STUDIO_BADGES = { sns: "file:gsn", marketing: "file:gsm", video: "file:gss", photo: "file:psd" };
/** 주소 ?menu= 로 열 수 있는 메뉴 (스튜디오 메뉴 포함) */
const isMenuKey = (key: string | null) => !!key && (REALTY_MENU.some((m) => m.key === key) || key === "sns" || key === "video" || key === "photo" || key === "marketing");

import { useRouter, useSearchParams } from "next/navigation";
import { getPlanLabel, formatPlanEnd, isPlanEndingSoon, isNewsAdminButton, NEWS_ADMIN_BUTTON_ORANGE } from "@/utils/permissionCheck";

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
  if (isMenuKey(menuParam)) {
    initialMenu = menuParam!;
  }

  const [activeMenu, setActiveMenu] = useState(initialMenu);

  useEffect(() => {
    if (isMenuKey(menuParam)) {
      setActiveMenu(menuParam!);
    } else {
      setActiveMenu("dashboard");
    }
  }, [menuParam]);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  // 스튜디오 메뉴의 [밝은/어두운 화면] 단추가 고른 값을 관리 화면도 따른다 (한 번 고른 적이 있을 때만 — 처음엔 지금처럼 밝게)
  useEffect(() => {
    // 메뉴마다 따로 기억 (기본 밝게, 2026-10-23 사장님) — 동영상제작·이미지제작은 각자 gs-studio-theme · gs-photo-theme (기본 어둡게)
    const load = () => { try { setDarkMode(localStorage.getItem(`gs-admin-theme:${activeMenu}`) === "dark"); } catch {} };
    load();
    window.addEventListener("gs-admin-theme-change", load);
    return () => window.removeEventListener("gs-admin-theme-change", load);
  }, [activeMenu]);
  // 영상 편집에서 왼쪽 메뉴 줄 숨기기 — 편집 화면 맨 위 [»]가 'studio:rail' 신호로 다시 보이게 한다 (이 기기에 기억)
  const [railHidden, setRailHidden] = useState(false);
  const [videoEditing, setVideoEditing] = useState(false); // 편집 화면이 열려 있을 때만 숨긴다 (처음 화면에는 메뉴가 늘 보이게)
  useEffect(() => {
    const ed = (e: Event) => setVideoEditing(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("studio:editor", ed);
    return () => window.removeEventListener("studio:editor", ed);
  }, []);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem("studio.railHidden") === "1") setRailHidden(true);
    } catch {}
    const on = (e: Event) => setRailHidden(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("studio:rail", on);
    return () => window.removeEventListener("studio:rail", on);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("studio.railHidden", railHidden ? "1" : "0");
    } catch {}
    (window as unknown as { __studioRailHidden?: boolean }).__studioRailHidden = railHidden;
    window.dispatchEvent(new CustomEvent("studio:rail-state", { detail: railHidden }));
  }, [railHidden]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("로딩중...");
  const [agencyStatus, setAgencyStatus] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showDocWarning, setShowDocWarning] = useState(false);
  const [planType, setPlanType] = useState<string>("free");
  const [planEndDate, setPlanEndDate] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const studioApp = useStudioApp();
  // 동영상제작·이미지제작 편집 화면에서 [«]로 메뉴를 완전히 숨긴 상태 — 위 머리줄도 같이 숨긴다
  const railGone = ((activeMenu === "video" && studioApp.isApp) || activeMenu === "photo") && videoEditing && railHidden;

  /* 메뉴 구성: 최고관리자 기본값 위에 회원 각자의 구성 (realtyMenu.tsx) */
  const [defaultLayout, setDefaultLayout] = useState<MenuLayout>(FACTORY_LAYOUT);
  const [menuLayout, setMenuLayout] = useState<MenuLayout>(FACTORY_LAYOUT);
  const [canSaveMenu, setCanSaveMenu] = useState(true);
  const [menuDraft, setMenuDraft] = useState<MenuLayout | null>(null);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuError, setMenuError] = useState("");
  useEffect(() => {
    getRealtyMenu().then((r) => {
      const def = normalizeLayout(r.defaultLayout);
      setDefaultLayout(def);
      setMenuLayout(normalizeLayout(r.mine, def));
      setCanSaveMenu(r.canSaveMine);
    }).catch(() => {});
  }, []);
  const saveMenu = async (layout: MenuLayout | null) => {
    setMenuSaving(true);
    setMenuError("");
    const res = await saveMyRealtyMenu(layout);
    setMenuSaving(false);
    if (!res.success) return setMenuError(res.error || "저장하지 못했습니다.");
    setMenuLayout(layout ? normalizeLayout(layout, defaultLayout) : defaultLayout);
    setMenuDraft(null);
  };
  // 2026-10-26 사장님: 웹에서도 유료 회원(공실뉴스부동산·비즈니스, 기간 안)과 최고관리자는 바뀐 화면, 무료부동산은 예전 아이콘 메뉴
  // (공실뉴스부동산을 무료로 바꾸면 이 조건을 '공실스튜디오 이용권'으로 바꾼다)
  const paidOnWeb = (() => {
    if (isAdminRole(userRole)) return true;
    const label = getPlanLabel({ role: userRole, plan_type: planType });
    if (label !== "공실뉴스부동산" && label !== "비즈니스회원") return false;
    if (!planEndDate) return true;
    const end = new Date(planEndDate); end.setHours(23, 59, 59, 999);
    return end >= new Date();
  })();
  const useStudioMenu = studioApp.isApp || STUDIO_MENU_ON_WEB || paidOnWeb;
  // 최고관리자는 앱에서도 숨긴 메뉴까지 모두 본다 — 숨긴 메뉴에는 [개발중] 표시 (2026-10-23 사장님)
  const isSuperAdmin = isAdminRole(userRole);
  const shown = (k: string) => !(studioApp.isApp && HIDDEN_IN_APP.includes(k) && !isSuperAdmin);
  const badges = studioApp.isApp && isSuperAdmin ? { ...STUDIO_BADGES, ...Object.fromEntries(HIDDEN_IN_APP.map((k) => [k, "dev:개발중"])) } : STUDIO_BADGES;
  // 앱에서 숨긴 메뉴로 들어오면 (주소·기억된 메뉴) 대시보드로
  useEffect(() => {
    if (studioApp.isApp && !isAdminRole(userRole) && userRole && HIDDEN_IN_APP.includes(activeMenu)) { setActiveMenu("dashboard"); router.replace("?menu=dashboard", { scroll: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioApp.isApp, activeMenu, userRole]);

  // 공실뉴스기자(유료회원/최고관리자) 자격 판별
  const isReporterEligible =
    userRole === "ADMIN" ||
    userRole === "BIZ" ||
    planType === "news_basic" ||
    planType === "news_premium" ||
    planType === "vacancy_basic" ||
    planType === "study_premium" || // 옛 공실스터디부동산 — 공실뉴스부동산으로 합침 (2026-10-26)
    planType === "business";

  /* ── 프리페치 데이터 저장소 ── */
  const [prefetchedData, setPrefetchedData] = useState<Record<string, any>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  const prefetchSection = useCallback(async (key: string, ownerId?: string) => {
    if (prefetchedData[key] || fetchingRef.current.has(key)) return;
    fetchingRef.current.add(key);
    try {
      if (key === "gongsil" && ownerId) {
        const res = await getVacancies({ ownerId });
        if (res.success) setPrefetchedData(prev => ({ ...prev, gongsil: res.data || [] }));
      } else if (key === "article" && ownerId) {
        const [artRes, adRes] = await Promise.all([
          getMyArticles(ownerId),
          getAuthorArticlesAdSettingsMap(ownerId),
        ]);
        if (artRes.success) {
          setPrefetchedData(prev => ({
            ...prev,
            article: artRes.data || [],
            article_ads: adRes.settingsMap || {},
            article_banners: adRes.banners || [],
          }));
        }
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

      // 🔐 비로그인 → 로그인 화면으로 보내고, 끝나면 보던 화면으로 되돌린다.
      //    메인으로 떨구면 물건접수웹페이지를 고치러 온 사람이 다시 메뉴를 찾아 들어와야 한다.
      if (!user) {
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
        return;
      }

      // 🔐 회원정보 조회 (로그인 필수)
      const { data: member } = await supabase
        .from("members")
        .select("id, name, role, plan_type, plan_end_date")
        .eq("id", user.id)
        .single();

      if (!member) {
        alert("⚠️ 회원정보를 찾을 수 없습니다. 다시 로그인해 주세요.");
        window.location.href = "/";
        return;
      }

      // 🔐 최고관리자는 /admin으로 리다이렉트 — 단 공실스튜디오 앱 안에서는 그대로 두고 모든 메뉴를 쓴다 (2026-10-23 사장님)
      const inStudioApp = /gongsil-studio|GongsilStudio|공실스튜디오|Electron\//i.test(navigator.userAgent);
      if (isAdminRole(member.role) && !inStudioApp) {
        window.location.href = "/admin";
        return;
      }

      setUserEmail(user.email || null);
      setMemberId(member.id);
      setUserName(member.name || "이름없음");
      setPlanType(member.plan_type || "free");
      setPlanEndDate(member.plan_end_date || null);
      setUserRole(member.role || "USER");

      const { data: agencyList } = await supabase.from("agencies").select("status, biz_cert_url, reg_cert_url, reject_reason").eq("owner_id", member.id).limit(1);
      const agencyData = agencyList && agencyList.length > 0 ? agencyList[0] : null;
      if (agencyData && agencyData.status) {
        if (agencyData.status === "APPROVED" && !isAdminRole(member.role) && member.role !== "REALTOR") {
          await adminApproveRealtorApplication(member.id);
        } else if (!isAdminRole(member.role) && member.role === "REALTOR" && agencyData.status !== "APPROVED") {
          await normalizePendingRealtorRole(member.id);
        }
        setUserRole(getEffectiveMemberRole(member.role, agencyData.status));
        setAgencyStatus(agencyData.status);
        if (agencyData.reject_reason) setRejectionReason(agencyData.reject_reason);
        if (!agencyData.biz_cert_url && agencyData.status !== 'APPROVED' && member.role === 'REALTOR') setShowDocWarning(true);
      } else {
        // 등록증 심사가 완료되지 않은 부동산회원은 서류 검토중 상태로 기본 노출 (최고관리자는 서류가 없으니 검토중을 띄우지 않는다 — 앱에서도 쓴다)
        // 일반회원은 신청한 적이 없으니 아무 표시도 하지 않는다
        setAgencyStatus(isAdminRole(member.role) ? "APPROVED" : member.role === "REALTOR" ? "PENDING" : "");
        setUserRole(getEffectiveMemberRole(member.role, null));
      }

      // 데이터 프리페치 (현재 진입한 메뉴가 article이면 article 우선, 아니면 gongsil)
      if (menuParam === "article") {
        prefetchSection("article", member.id);
      } else {
        prefetchSection("gongsil", member.id);
      }
      setAuthChecked(true);
    }
    fetchUser();

    const handleStatusSync = (e: any) => {
      if (e.detail) setAgencyStatus(e.detail);
    };
    window.addEventListener("realty_agency_status_sync", handleStatusSync);
    return () => window.removeEventListener("realty_agency_status_sync", handleStatusSync);
  }, []);

  /* ── 사이드바 호버 시 프리페치 ── */
  const handleMenuHover = useCallback((key: string) => {
    setHoveredMenu(key);
    if ((key === "gongsil" || key === "article") && memberId) {
      prefetchSection(key, memberId);
    }
  }, [memberId, prefetchSection]);

  const selectMenu = useCallback((key: string) => {
    if (key === "article_ad" && !isReporterEligible) {
      setShowUpgradeModal(true);
      return;
    }
    const go = () => {
      setActiveMenu(key);
      router.push(`?menu=${key}`, { scroll: false });
    };
    // 동영상제작에 저장 안 한 내용이 있으면 [저장 / 다른 이름으로 / 저장 안 함 / 취소] 를 먼저 묻는다 (편집 화면이 걸어 둔다)
    const guard = (window as unknown as { __gsvGuard?: (next: () => void) => void }).__gsvGuard;
    if (key !== "video" && guard) return guard(go);
    go();
  }, [isReporterEligible, router]);
  // 화면캡처 알림의 [이미지제작에서 열기] — 이미지제작으로 가서 그 그림을 연다 (PhotoStudio 가 __gsSnapPhoto 를 받아 감)
  useEffect(() => {
    const snap = (window as unknown as { gongsilStudio?: { snap?: { onPhoto: (fn: (file: string) => void) => () => void } } }).gongsilStudio?.snap;
    return snap?.onPhoto((file) => {
      (window as unknown as { __gsSnapPhoto?: string }).__gsSnapPhoto = file;
      selectMenu("photo");
      window.dispatchEvent(new Event("gs-snap-photo"));
    });
  }, [selectMenu]);

  const [saving] = useState(false);

  const theme = computeTheme(darkMode);
  // 메뉴 바·위쪽 바 색 — 최고관리자는 검정 (사이트 관리자 화면 /admin 과 같게, 2026-10-23 사장님), 회원은 파랑
  const sidebarBg = isSuperAdmin ? "#111827" : darkMode ? "#1e2a42" : "#1a3a6b";

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
      {useStudioMenu ? (
        <StudioSidebar
          main={menuLayout.main.filter(shown).map(menuItem)}
          more={menuLayout.more.filter(shown).map(menuItem)}
          onEditMenu={() => { setMenuError(""); setMenuDraft(menuLayout); }}
          settings={STUDIO_SETTINGS_MENU}
          activeMenu={activeMenu}
          onSelect={selectMenu}
          onHover={handleMenuHover}
          background={sidebarBg}
          isApp={studioApp.isApp}
          appVersion={studioApp.version}
          badges={badges}
          autoCollapse={activeMenu === "marketing" || activeMenu === "video" || activeMenu === "photo"} // 매물보고서 미리보기(860px)·영상 편집기가 잘리지 않게
          // 영상 편집·이미지 편집 화면에서는 왼쪽 메뉴를 숨길 수 있다 (이미지 편집도 같게 — 2026-10-19 사장님)
          hidden={railGone}
          onHide={((activeMenu === "video" && studioApp.isApp) || activeMenu === "photo") && videoEditing ? () => setRailHidden(true) : undefined}
        />
      ) : (
      /* ===== 좌측 사이드바 (80px, 블루 테마) ===== */
      <aside style={{ width: 80, background: sidebarBg, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)" }}>
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 }}>
          <img src="/new_logo.png" alt="공실뉴스 로고" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onClick={() => window.location.href = "/"} />
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: "16px 0", flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
          {REALTY_MENU.map((item) => (
            <li key={item.key} style={{ margin: 0, position: "relative", ...(item.separated ? { marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.15)" } : {}) }}
              onMouseEnter={() => handleMenuHover(item.key)} onMouseLeave={() => setHoveredMenu(null)}>
              <button onClick={() => selectMenu(item.key)}
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
      )}

      {/* ===== 우측 메인 영역 ===== */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.bg, overflow: "hidden" }}>
        <header data-admin-head style={{ height: 64, background: useStudioMenu ? sidebarBg : theme.headerBg, borderBottom: useStudioMenu ? "1px solid rgba(255,255,255,0.12)" : `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", flexShrink: 0, zIndex: 5, ...(railGone ? { display: "none" } : {}) /* 왼쪽 메뉴를 완전히 숨기면 위 머리줄도 함께 (2026-10-24 사장님) */ }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 12px", borderRadius: 6, transition: "background 0.2s", minWidth: 0, flexShrink: 1, overflow: "hidden", whiteSpace: "nowrap" }}
            onClick={() => { setActiveMenu("settings"); router.push('?menu=settings'); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = useStudioMenu ? "rgba(255,255,255,0.10)" : darkMode ? "#2c2d31" : "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: useStudioMenu ? "#fff" : theme.textPrimary, flexShrink: 0 }}>{userName}</span>
            <span style={{ fontSize: 14, color: useStudioMenu ? "rgba(255,255,255,0.7)" : darkMode ? "#aaa" : "#666", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail || "로딩중..."}</span>
            {userRole === 'ADMIN' ? (
              <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, background: "#111827", color: "#fff" }}>최고관리자</span>
            ) : (
              /*
               * 등급 이름과 만료일을 한 자리에서 보여준다. 전에는 "공실뉴스" 처럼
               * 줄여 부르고 만료일은 오른쪽 [종료] 칸에만 있어, 자기 요금제가
               * 언제 끝나는지 상단에서 알 수 없었다.
               */
              (() => {
                const paid = userRole === 'BIZ' || (userRole === 'REALTOR' && planType !== 'free');
                const soon = paid && isPlanEndingSoon(planEndDate);
                // 사이트 위쪽 [○○ admin >>] 버튼과 같은 회원별 색 (공실스터디부동산 녹색, 무료부동산 파랑 등)
                const tone = soon
                  ? { bg: "#f59e0b", fg: "#fff" }
                    : isNewsAdminButton({ role: userRole, plan_type: planType }, agencyStatus)
                    ? { bg: NEWS_ADMIN_BUTTON_ORANGE, fg: "#fff" }
                    : userRole === 'BIZ'
                      ? { bg: "#7c3aed", fg: "#fff" }
                      : userRole === 'REALTOR'
                        ? { bg: "#2563eb", fg: "#fff" }
                        : { bg: "#6b7280", fg: "#fff" };
                const until = paid ? formatPlanEnd(planEndDate) : "";
                return (
                  <span
                    title={soon ? "요금제 만료가 얼마 남지 않았습니다" : undefined}
                    style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, background: tone.bg, color: tone.fg }}
                  >
                    {getPlanLabel({ role: userRole, plan_type: planType })}{until ? ` ${until}` : ""}
                  </span>
                );
              })()
            )}
            {agencyStatus === "REJECTED" && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, color: "#be123c", background: "#fee2e2", border: "1px solid #ef4444", display: "inline-flex", alignItems: "center", gap: 4 }}>🚨 심사 반려 (서류보완)</span>}
            {agencyStatus === "PENDING" && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a" }}>⏳ 서류 검토중</span>}
            {agencyStatus === "APPROVED" && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, color: "#166534", background: "#dcfce7", border: "1px solid #bbf7d0" }}>✅ 정상승인</span>}
            {agencyStatus !== "APPROVED" && showDocWarning && <span onClick={() => { setActiveMenu("settings"); router.push('?menu=settings&tab=agency'); }} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 20, marginLeft: 8, color: "#c53030", background: "#fff5f5", border: "1px solid #fed7d7" }}>⚠️ 소장님! 아직 필수 서류(사업자등록증)를 내시지 않았어요! 👉 (여기를 클릭해서 서류를 제출해주세요)</span>}
          </div>
          {memberId && <HomepageHeaderBar memberId={memberId} darkMode={darkMode} onDark={useStudioMenu} />}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0, whiteSpace: "nowrap" }}>
            <NotificationBell color={useStudioMenu ? "#ffffff" : darkMode ? "#e1e4e8" : "#333"} />
            {!useStudioMenu && <button onClick={() => setDarkMode(!darkMode)} style={{ background: useStudioMenu ? "rgba(255,255,255,0.08)" : darkMode ? "#2c2d31" : "none", border: `1px solid ${useStudioMenu ? "rgba(255,255,255,0.25)" : darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: darkMode ? "#e1e4e8" : "#555" }} title="다크모드 전환">{darkMode ? "☀️" : "🌙"}</button>}
            <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut({ scope: "local" }); window.location.href = "/"; }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", border: useStudioMenu ? "1px solid rgba(255,255,255,0.25)" : "none", borderRadius: 6, background: useStudioMenu ? "rgba(255,255,255,0.12)" : darkMode ? "#374151" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>로그아웃</button>
          </div>
        </header>

        <Suspense fallback={<AdminLoadingFallback />}>
          {activeMenu === "dashboard" && <DashboardSection theme={theme} role={userRole === "ADMIN" ? "admin" : userRole === "REALTOR" ? "realtor" : "user"} agencyStatus={agencyStatus} rejectionReason={rejectionReason} memberId={memberId || undefined} onMenuChange={(menu) => { setActiveMenu(menu); router.push(`?menu=${menu}`, { scroll: false }); }} />}
          {activeMenu === "gongsil" && memberId && <VacancySection theme={theme} role={userRole === "ADMIN" ? "admin" : userRole === "REALTOR" ? "realtor" : "user"} ownerId={memberId} ownerName={userName} initialData={prefetchedData["gongsil"]} />}
          {activeMenu === "article" && memberId && (
            <MemberArticleSection
              theme={theme}
              memberId={memberId}
              memberName={userName}
              memberEmail={userEmail || undefined}
              role={userRole === "ADMIN" ? "admin" : userRole === "REALTOR" ? "realtor" : "user"}
              initialData={prefetchedData["article"]}
              initialAdSettings={prefetchedData["article_ads"]}
              initialBanners={prefetchedData["article_banners"]}
            />
          )}
          {activeMenu === "article_ad" && memberId && (
            isReporterEligible ? (
              <MemberArticleAdSection theme={theme} memberId={memberId} memberName={userName} memberEmail={userEmail || undefined} role={userRole === "ADMIN" ? "admin" : userRole === "REALTOR" ? "realtor" : "user"} />
            ) : (
              <div style={{ flex: 1, margin: 16, background: theme.cardBg, borderRadius: 12, padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📰</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: theme.textPrimary, marginBottom: 8 }}>공실뉴스기자 전용 페이지입니다</h2>
                <p style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 20 }}>기사 하단에 맞춤 광고 및 홍보 배너를 등록하여 강력한 마케팅 효과를 누려보세요!</p>
                <button onClick={() => setShowUpgradeModal(true)} style={{ padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>멤버십 안내 보기</button>
              </div>
            )
          )}
          {activeMenu === "point" && memberId && <MyPointSection theme={theme} memberId={memberId} role={userRole === "ADMIN" ? "admin" : userRole === "REALTOR" ? "realtor" : "user"} />}
          {activeMenu === "settings" && (
            <div style={{ flex: 1, padding: "20px 28px", overflowY: "auto", background: theme.cardBg, margin: 16, marginBottom: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              {memberId ? <MemberRegisterForm editMemberId={memberId} onBack={() => setActiveMenu("dashboard")} initialTab={searchParams.get("tab") === "agency" ? 1 : 0} /> : <div style={{ textAlign: "center", padding: 40, color: theme.textSecondary }}>사용자 정보를 불러오는 중입니다...</div>}
            </div>
          )}
          {activeMenu === "homepage" && memberId && <IntakeStudio theme={theme} memberId={memberId} planType={planType} />}
          {activeMenu === "inquiry_board" && memberId && <InquiryBoardSection theme={theme} memberId={memberId} replyAuthorId={memberId} replyAuthorName={userName} />}
          {activeMenu === "customer" && memberId && <CustomerSection theme={theme} role={userRole === "ADMIN" ? "admin" : userRole === "REALTOR" ? "realtor" : "user"} memberId={memberId} />}
          {activeMenu === "study" && memberId && <StudySection theme={theme} mode="member" />}
          {activeMenu === "manual" && <ManualFrame kind="realtor" />}
          {activeMenu === "sns" && studioApp.isApp && memberId && <StudioSnsSection theme={theme} memberId={memberId} />}
          {activeMenu === "marketing" && shown("marketing") && <StudioMarketingSection theme={theme} dev={isSuperAdmin} />}
          {activeMenu === "video" && studioApp.isApp && <VideoStudio />}
          {activeMenu === "photo" && <PhotoStudio menu={null} />}
          {activeMenu === "studio" && <StudioPromoSection theme={theme} onTryPhoto={() => selectMenu("photo")} />}
          {((activeMenu === "sns" && !studioApp.isApp) || (activeMenu === "video" && !studioApp.isApp)) && (
            <StudioComingSoon theme={theme} kind={activeMenu} isApp={studioApp.isApp} onGoGongsil={() => selectMenu("gongsil")} />
          )}
        </Suspense>

        {/* 메뉴 편집: 업무·더보기와 순서 (회원 각자) */}
        {menuDraft && (
          <div onClick={() => !menuSaving && setMenuDraft(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", background: theme.cardBg, borderRadius: 14, padding: "22px 24px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: theme.textPrimary }}>메뉴 편집</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: theme.textSecondary, lineHeight: 1.6 }}>
                끌어서 옮기거나 ▲▼·[업무로]/[더보기로] 버튼을 쓰세요. 웹과 PC 앱에 똑같이 적용됩니다. 정보설정은 늘 맨 아래에 있습니다.
              </p>
              <MenuLayoutEditor theme={theme} value={menuDraft} onChange={setMenuDraft} />
              {!canSaveMenu && <div style={{ marginTop: 12, fontSize: 13, color: "#b45309" }}>메뉴 저장 준비 중입니다. 지금 바꾼 구성은 저장되지 않습니다.</div>}
              {menuError && <div style={{ marginTop: 12, fontSize: 13, color: "#c53030" }}>{menuError}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 18 }}>
                <button onClick={() => saveMenu(null)} disabled={menuSaving || !canSaveMenu}
                  style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  기본값으로 되돌리기
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setMenuDraft(null)} disabled={menuSaving}
                    style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textPrimary, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    취소
                  </button>
                  <button onClick={() => saveMenu(menuDraft)} disabled={menuSaving || !canSaveMenu}
                    style={{ padding: "10px 18px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: menuSaving || !canSaveMenu ? 0.6 : 1 }}>
                    {menuSaving ? "저장 중…" : "저장"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 공실뉴스기자 멤버십 안내 모달 */}
        <ArticleAdUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </main>
    </div>
  );
}
