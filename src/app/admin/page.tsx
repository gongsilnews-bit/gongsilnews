"use client";

import React, { useState, useEffect } from "react";
import VacancyRegisterForm from "@/components/admin/VacancyRegisterForm";
import MemberRegisterForm from "@/components/admin/MemberRegisterForm";
import { adminGetMembers, adminSoftDeleteMember, adminRestoreMember, adminHardDeleteMember } from "./actions";
import { getArticles, deleteArticle, adminUpdateArticleStatus } from "@/app/actions/article";
import { getBoards, deleteBoard } from "@/app/actions/board";
import { createClient } from "@/utils/supabase/client";

/* ──────────────────────────────────────────────
   SVG 아이콘 컴포넌트 (원본 feather-icon 1:1 복제)
   ────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────
   사이드바 메뉴 데이터 (원본 admin/index.html에서 추출)
   ────────────────────────────────────────────── */
type MenuItem = { key: string; label: string; icon: React.ReactElement; dividerBefore?: boolean; submenus?: { key: string; label: string }[] };

const MENU_ITEMS: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "members", label: "회원", icon: <IconMembers />, submenus: [
    { key: "members_list", label: "회원목록" },
    { key: "dormant", label: "휴지통" },
  ]},
  { key: "gongsil", label: "공실", icon: <IconBuilding /> },
  { key: "article", label: "기사", icon: <IconArticle /> },
  { key: "study", label: "스터디", icon: <IconStudy /> },
  { key: "edit", label: "편집", icon: <IconEdit />, dividerBefore: true },
  { key: "board", label: "게시판", icon: <IconBoard /> },
  { key: "ad", label: "광고", icon: <IconAd />, dividerBefore: true },
  { key: "plugin", label: "플러그인", icon: <IconPlugin /> },
  { key: "stats", label: "통계", icon: <IconStats /> },
  { key: "settings", label: "환경설정", icon: <IconSettings />, dividerBefore: true },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
];

/* ──────────────────────────────────────────────
   더미 대시보드 데이터 (원본 스크린샷에서 추출)
   ────────────────────────────────────────────── */
const kpiCards = [
  { icon: "🏢", label: "공실 등록 물건", value: "204", sub: "전체 등록 공실", color: "#3b82f6" },
  { icon: "👤", label: "전체 회원", value: "3", sub: "부동산회원 1명 포함", color: "#10b981" },
  { icon: "📰", label: "등록 기사", value: "14", sub: "전체 등록 기사", color: "#f59e0b" },
  { icon: "💬", label: "댓글 / 문의", value: "24", sub: "전체 댓글 및 문의", color: "#ef4444" },
];

const recentMembers = [
  { name: "김동현", email: "suppliant@naver.com", role: "일반", roleClass: "general", time: "1일 전" },
  { name: "착한임대", email: "gongsilmarketing@gmail.com", role: "부동산", roleClass: "realtor", time: "8일 전" },
  { name: "김미숙", email: "gongsilnews@gmail.com", role: "관리자", roleClass: "admin", time: "22일 전" },
];

type QuickLink = { icon: React.ReactElement; label: string; count: string };
const quickLinks: QuickLink[] = [
  { icon: <IconBuilding />, label: "공실 관리", count: "204" },
  { icon: <IconArticle />, label: "기사 관리", count: "14" },
  { icon: <IconMembers />, label: "고객 관리", count: "3" },
  { icon: <SvgIcon strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></SvgIcon>, label: "댓글 / 문의", count: "24" },
  { icon: <SvgIcon strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></SvgIcon>, label: "공실 등록하기", count: "" },
];

/* ──────────────────────────────────────────────
   메인 컴포넌트
   ────────────────────────────────────────────── */
export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showMemberRegister, setShowMemberRegister] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [checkedMemberIds, setCheckedMemberIds] = useState<string[]>([]);
  const [dbMembers, setDbMembers] = useState<any[]>([]);
  const [dbArticles, setDbArticles] = useState<any[]>([]);
  const [articleFilter, setArticleFilter] = useState("전체");
  const [checkedArticleIds, setCheckedArticleIds] = useState<string[]>([]);
  const [dbBoards, setDbBoards] = useState<any[]>([]);

  useEffect(() => {
    adminGetMembers().then((res) => {
      if (res?.success && res.data) {
        setDbMembers(res.data);
      }
    });
    getArticles().then(res => {
      if (res.success) setDbArticles(res.data || []);
    });
    getBoards().then(res => {
      if (res.success) setDbBoards(res.data || []);
    });
  }, []);

  const handleSidebarClick = (key: string) => {
    setActiveMenu(key);
    setShowRegisterForm(false);
    setShowBoardModal(false);
    setShowMemberRegister(false);
    setSelectedMemberId(null);
  };

  const contentTitle = activeMenu.startsWith("members") ? "회원관리" : (MENU_ITEMS.find(m => m.key === activeMenu)?.label || "대시보드");
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 공통 스타일
  const bg = darkMode ? "#1a1b1e" : "#f4f5f7";
  const sidebarBg = darkMode ? "#000" : "#111111";
  const headerBg = darkMode ? "#25262b" : "#fff";
  const cardBg = darkMode ? "#25262b" : "#fff";
  const textPrimary = darkMode ? "#e1e4e8" : "#111827";
  const textSecondary = darkMode ? "#9ca3af" : "#6b7280";
  const border = darkMode ? "#333" : "#e1e4e8";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: bg, overflow: "hidden" }}>
      {/* ===== 좌측 사이드바 (80px) ===== */}
      <aside style={{ width: 80, background: sidebarBg, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)", overflow: "visible" }}>
        {/* 로고 */}
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 }}>
          <img src="/favicon.png" alt="공실뉴스 로고" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onClick={() => window.location.href = "/"} />
        </div>

        {/* 메뉴 리스트 */}
        <ul style={{ listStyle: "none", margin: 0, padding: "16px 0", flex: 1, overflow: "visible" }}>
          {MENU_ITEMS.map((item) => (
            <React.Fragment key={item.key}>
              {item.dividerBefore && <li style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "4px 14px" }} />}
              <li style={{ margin: 0, position: "relative" }}
                onMouseEnter={() => setHoveredMenu(item.key)}
                onMouseLeave={() => setHoveredMenu(null)}>
                <button
                  onClick={() => handleSidebarClick(item.key)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "12px 0", textDecoration: "none", width: "100%", border: "none", cursor: "pointer",
                    color: activeMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.65)",
                    background: activeMenu === item.key ? "rgba(255,255,255,0.18)" : hoveredMenu === item.key ? "rgba(255,255,255,0.12)" : "none",
                    borderLeft: activeMenu === item.key ? "3px solid #ffffff" : "3px solid transparent",
                    fontSize: 10, fontWeight: activeMenu === item.key ? 700 : 600, gap: 4, fontFamily: "inherit",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{
                    width: 18, height: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: activeMenu === item.key || hoveredMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.65)",
                    transition: "all 0.2s",
                    transform: hoveredMenu === item.key ? "translateY(-2px)" : "none"
                  }}>
                    <span style={{ width: 18, height: 18, display: "block" }}>
                      {React.cloneElement(item.icon as React.ReactElement<any>, {
                        style: { width: 18, height: 18, stroke: activeMenu === item.key || hoveredMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.65)" }
                      })}
                    </span>
                  </span>
                  {item.label}
                </button>

                {/* 서브메뉴 (회원 메뉴만) */}
                {item.submenus && hoveredMenu === item.key && (
                  <div style={{
                    position: "absolute", left: 80, top: 0, minWidth: 140,
                    background: "#25262b", borderRadius: 6,
                    boxShadow: "4px 4px 20px rgba(0,0,0,0.3)", zIndex: 100,
                    padding: "8px 0", border: `1px solid #444`,
                    animation: "fadeInSub 0.15s ease",
                    overflow: "hidden"
                  }}>
                    {item.submenus.map((sub) => (
                      <button key={sub.key} 
                        onClick={() => handleSidebarClick(sub.key)}
                        style={{
                        display: "block", padding: "10px 16px", fontSize: 13, fontWeight: 600,
                        color: "#e1e4e8", textDecoration: "none", whiteSpace: "nowrap" as const,
                        cursor: "pointer", transition: "all 0.15s",
                        border: "none", background: "transparent",
                        width: "100%", textAlign: "left" as const, fontFamily: "inherit",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#38393e"; e.currentTarget.style.color = "#ffffff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#e1e4e8"; }}
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

        {/* 하단 프로필 */}
        <div style={{ padding: "14px 8px 18px", borderTop: `1px solid ${darkMode ? "#333" : "rgba(255,255,255,0.15)"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f5a623, #e8961a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 4 }}>김</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: darkMode ? "#9ca3af" : "#fff", whiteSpace: "nowrap" }}>김미숙</div>
          <div style={{ fontSize: 10, color: darkMode ? "#6b7280" : "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 74, textAlign: "center" }}>gongsilnews@...</div>
        </div>
      </aside>

      {/* ===== 우측 메인 영역 ===== */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: bg, overflow: "hidden" }}>
        {/* 상단 헤더 */}
        <header style={{ height: 64, background: headerBg, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", padding: "0 28px", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.03)", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: textPrimary, flex: 1 }}>{contentTitle === "대시보드" ? "대시보드" : contentTitle}</div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: darkMode ? "#2c2d31" : "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: darkMode ? "#e1e4e8" : "#555", marginRight: 4 }} title="다크모드 전환">
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/";
          }} style={{ padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#fff", border: "none", borderRadius: 6, background: darkMode ? "#2c2d31" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center" }}>로그아웃</button>
          <a href="/" style={{ padding: "7px 14px", fontSize: 13, fontWeight: 600, color: darkMode ? "#e1e4e8" : "#4b5563", textDecoration: "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", display: "flex", alignItems: "center", gap: 6 }}>
            🏠 공실페이지 가기
          </a>
        </header>

        {/* 대시보드 콘텐츠 */}
        {activeMenu === "dashboard" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
            {/* 타이틀 */}
            <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
              모니터링 대시보드
              <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>마지막 갱신: {timeStr}</span>
              <button style={{ marginLeft: "auto", fontSize: 12, color: textSecondary, background: "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>⟳ 새로고침</button>
            </h1>

            {/* KPI 카드 4개 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {kpiCards.map((card, i) => (
                <div key={i} style={{ background: cardBg, borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", borderLeft: `4px solid ${card.color}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.09)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}
                >
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{card.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{card.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: textPrimary, lineHeight: 1 }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* 중단: 최근 물건 + 최근 회원 */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* 최근 등록 공실 물건 */}
              <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  🏠 최근 등록 공실 물건
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>0</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["매매종류", "주소", "금액", "연락처", "등록일"].map(th => (
                        <th key={th} style={{ textAlign: "left" as const, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#9ca3af", borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>{th}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={5} style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>데이터 없음</td></tr>
                  </tbody>
                </table>
              </div>

              {/* 최근 가입 회원 */}
              <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  👥 최근 가입 회원
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>3</span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {recentMembers.map((m, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: i < recentMembers.length - 1 ? `1px solid ${darkMode ? "#333" : "#f3f4f6"}` : "none", fontSize: 13 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: m.roleClass === "realtor" ? "linear-gradient(135deg, #f59e0b, #d97706)" : m.roleClass === "admin" ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {m.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: textPrimary }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.email}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: m.roleClass === "realtor" ? "#dbeafe" : m.roleClass === "admin" ? "#dbeafe" : "#f3f4f6", color: m.roleClass === "realtor" ? "#1d4ed8" : m.roleClass === "admin" ? "#1d4ed8" : "#6b7280" }}>{m.role}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>{m.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 하단: 바로가기 + 최근 댓글 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* 바로가기 */}
              <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px" }}>⚡ 바로가기</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {quickLinks.map((ql, i) => (
                    <a key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 14px", borderRadius: 10, background: darkMode ? "#2c2d31" : "#f9fafb",
                      cursor: "pointer", textDecoration: "none", color: darkMode ? "#e1e4e8" : "#374151",
                      fontSize: 13, fontWeight: 600, transition: "background 0.2s, transform 0.15s",
                      border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#38393e" : "#eff6ff"; e.currentTarget.style.transform = "translateX(4px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f9fafb"; e.currentTarget.style.transform = "none"; }}
                    >
                      <span style={{ width: 18, height: 18, display: "flex", flexShrink: 0 }}>
                        {React.cloneElement(ql.icon as React.ReactElement<any>, { style: { width: 18, height: 18, stroke: textSecondary } })}
                      </span>
                      {ql.label}
                      {ql.count && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#3b82f6", background: darkMode ? "#1e3a5f" : "#eff6ff", padding: "2px 8px", borderRadius: 10 }}>{ql.count}</span>}
                    </a>
                  ))}
                </div>
              </div>

              {/* 최근 댓글 / 문의 */}
              <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px" }}>💬 최근 댓글 / 문의</div>
                <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" as const, padding: 20 }}>댓글 없음</div>
              </div>
            </div>
          </div>
        ) : activeMenu === "gongsil" && showRegisterForm ? (
          /* ===== 공실등록 폼 ===== */
          <VacancyRegisterForm onBack={() => setShowRegisterForm(false)} darkMode={darkMode} />
        ) : activeMenu === "gongsil" ? (
          /* ===== 공실관리 리스트 (원본 iframe 디자인 1:1 복제) ===== */
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
            {/* 타이틀 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>공실관리</h1>
              <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>(광고 204건 / 전체 204건)</span>
            </div>

            {/* 메인 카드 */}
            <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              {/* 필터 영역 */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>매물번호</label>
                  <input type="text" placeholder="매물번호 입력" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 140 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>매물종류</label>
                  <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
                    <option>전체</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>매물구분</label>
                  <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
                    <option>전체</option>
                  </select>
                </div>
                <input type="text" placeholder="전체내용 입력하세요." style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
                <button style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  검색
                </button>
                <button style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
              </div>

              {/* 액션 버튼 영역 */}
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => setShowRegisterForm(true)} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ 공실등록</button>
                <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  엑셀 대량등록
                </button>
                <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                  고소취갱신
                </button>
                <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  선택삭제
                </button>
              </div>

              {/* 데이터 테이블 */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
                  <thead>
                    <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                        <input type="checkbox" style={{ accentColor: "#3b82f6" }} />
                      </th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>번호</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>광고설정</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>매물종류</th>
                      <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 300 }}>주소 / 연락처</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 110 }}>금액</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 130 }}>방수/면적(m²)/층</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 70 }}>최초등록</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>등록자/연락처</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: "1/1612/133", adLabel: "광고중", adDays: "14일", type: "단독/다세대구", addr: "도곡동 탑데스하임", phone: "010-8831-9450", deal: "매매", price: "6억", rooms: "1 / 244.55m² / -", date: "04.07", owner: "김미숙", ownerPhone: "010-5555-5555" },
                      { id: "377952561", adLabel: "광고중", adDays: "5468", type: "다세대/빌라/연립", addr: "논현동 논현 4번지왕상", phone: "010-0555-0555", deal: "매매", price: "10억", rooms: "3 / m² / -", date: "04.08", owner: "김미숙", ownerPhone: "010-5555-5555" },
                      { id: "71079848", adLabel: "광고중", adDays: "5484", type: "다가구", addr: "녹번동 관악드림타운", phone: "010-8831-9450", deal: "매매", price: "11억 5000", rooms: "3 / 159.83m² / 8층", date: "04.04", owner: "김미숙", ownerPhone: "010-8831-9450" },
                      { id: "2971428573", adLabel: "광고중", adDays: "14963", type: "다가구", addr: "노원동 동부센트레빌", phone: "010-8631-9450", deal: "매매", price: "10억", rooms: "3 / 58m² / -", date: "04.04", owner: "김미숙", ownerPhone: "010-8631-9450" },
                      { id: "1386120769", adLabel: "광고중", adDays: "13549", type: "아파트", addr: "서초동 서초클라스", phone: "010-8631-9450", deal: "매매", price: "7억", rooms: "2 / 39.12m² / 5층", date: "03.30", owner: "착한임대", ownerPhone: "010-8631-9450" },
                      { id: "2943105657", adLabel: "광고중", adDays: "23.50", type: "아파트/단지형", addr: "서초동 서초프라지움더닉스", phone: "010-8631-9450", deal: "매매", price: "3.2억", rooms: "4 / 134.78m² / 7층", date: "03.30", owner: "착한임대", ownerPhone: "010-8631-9450" },
                    ].map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f1f3f5"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <input type="checkbox" style={{ accentColor: "#3b82f6" }} />
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>
                          <div style={{ fontWeight: 700 }}>1</div>
                          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{row.id}</div>
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: darkMode ? "#1a2e1a" : "#d1fae5", color: darkMode ? "#4ade80" : "#065f46", fontWeight: 700, fontSize: 13 }}>{row.adLabel}</span>
                          <div style={{ fontSize: 13, color: textSecondary, marginTop: 4, fontWeight: 600 }}>{row.adDays}</div>
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 600, color: textPrimary }}>{row.type}</td>
                        <td style={{ padding: "16px 10px", verticalAlign: "middle" }}>
                          <div style={{ fontWeight: 700, color: textPrimary, fontSize: 15, marginBottom: 4 }}>{row.addr}</div>
                          <div style={{ fontSize: 14, color: textSecondary }}>{row.phone}</div>
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <span style={{ color: darkMode ? "#fca5a5" : "#ef4444", fontWeight: 600, fontSize: 15 }}>{row.deal} {row.price}</span>
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{row.rooms}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{row.date}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, marginBottom: 2 }}>{row.owner}</div>
                          <div style={{ fontSize: 14, color: textSecondary }}>{row.ownerPhone}</div>
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              수정
                            </button>
                            <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이징 */}
              <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
                <button style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&lt;</button>
                <button style={{ width: 32, height: 32, border: "none", borderRadius: 4, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>1</button>
                {[2,3,4,5].map(n => (
                  <button key={n} style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</button>
                ))}
                <button style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&gt;</button>
              </div>
            </div>
          </div>

        ) : activeMenu === "article" ? (
          /* ===== 기사관리 리스트 (원본 iframe 디자인 1:1 복제) ===== */
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
            {/* 타이틀 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>기사관리</h1>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                ( <span style={{ color: "#17a2b8" }}>승인 14건</span> / <span style={{ color: "#6b7280" }}>승인신청 0건</span> / <span style={{ color: "#f59e0b" }}>작성중 0건</span> / <span style={{ color: "#ef4444" }}>반려 0건</span> )
              </span>
            </div>

            {/* 메인 카드 */}
            <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              {/* 필터 영역 */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>진행상황</label>
                  <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
                    <option>전체</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>1차섹션</label>
                  <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
                    <option>전체</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>2차섹션</label>
                  <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
                    <option>전체</option>
                  </select>
                </div>
                <input type="text" placeholder="검색어를 입력하세요." style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
                <button style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  검색
                </button>
                <button style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
              </div>

              {/* 액션 버튼 영역 */}
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => window.location.href = "/admin/news_write"} style={{ height: 36, padding: "0 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ 기사쓰기</button>
                <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 6.91 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  광고순위갱신
                </button>
                <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  선택삭제
                </button>
              </div>

              {/* 데이터 테이블 */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
                  <thead>
                    <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                        <input type="checkbox" style={{ accentColor: "#3b82f6" }} />
                      </th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>기사번호</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>진행상황</th>
                      <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 300 }}>기사명</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>1차섹션</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>2차섹션</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 140 }}>승인일자</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 110 }}>작성자 / 연락처</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbArticles.length > 0 ? (
                      dbArticles.map((row, idx) => {
                        const statusMap: Record<string, string> = { DRAFT: "작성중", PENDING: "승인신청", APPROVED: "광고중", REJECTED: "반려", DELETED: "삭제" };
                        const statusColorMap: Record<string, { color: string; bg: string }> = {
                          DRAFT: { color: "#92400e", bg: "#fef3c7" },
                          PENDING: { color: "#6b7280", bg: "#f3f4f6" },
                          APPROVED: { color: darkMode ? "#bae6fd" : "#0369a1", bg: darkMode ? "#0a2638" : "#e0f2fe" },
                          REJECTED: { color: "#b91c1c", bg: "#fee2e2" },
                        };
                        const st = statusColorMap[row.status] || statusColorMap.DRAFT;
                        const createdDate = row.created_at ? new Date(row.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
                        return (
                      <tr key={row.id || idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fafbfc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <input type="checkbox" style={{ accentColor: "#3b82f6" }} />
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, fontWeight: 600, color: textPrimary }}>{row.article_no}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, fontSize: 13, fontWeight: 700, color: st.color, background: st.bg }}>{statusMap[row.status] || row.status}</span>
                        </td>
                        <td style={{ padding: "16px 10px", verticalAlign: "middle", fontWeight: 700, color: textPrimary, fontSize: 15, maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{row.section1 || "-"}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{row.section2 || "-"}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{createdDate}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 700 }}>관리자</span>{" "}
                          <span style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>{row.author_name || "-"}</span>
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button onClick={() => window.location.href = `/admin/news_write?id=${row.id}`} style={{ height: 30, padding: "0 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              수정
                            </button>
                            <button onClick={async () => {
                              if (confirm(`'${row.title}' 기사를 삭제하시겠습니까?`)) {
                                const res = await deleteArticle(row.id);
                                if (res.success) {
                                  setDbArticles(prev => prev.filter(a => a.id !== row.id));
                                } else {
                                  alert('삭제 실패: ' + res.error);
                                }
                              }
                            }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={9} style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 40 }}>등록된 기사가 없습니다. '+ 기사쓰기' 버튼으로 첫 기사를 작성해보세요!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 페이징 */}
              <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
                <button style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&lt;</button>
                <button style={{ width: 32, height: 32, border: "none", borderRadius: 4, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>1</button>
                <button style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>2</button>
                <button style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&gt;</button>
              </div>
            </div>
          </div>

        ) : activeMenu === "board" ? (
          /* ===== 게시판관리 리스트 (원본 iframe 디자인 1:1 복제) ===== */
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
            {/* 타이틀 + 버튼 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>게시판 리스트 및 설정</h1>
              <button onClick={() => setShowBoardModal(true)} style={{ height: 38, padding: "0 18px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ 새 게시판 생성</button>
            </div>

            {/* 메인 카드 */}
            <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              {/* 데이터 테이블 */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>고유 ID</th>
                      <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 260 }}>게시판명</th>
                      <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 200 }}>스킨 테마 설정</th>
                      <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 160 }}>권한 설정 (목록/읽기/쓰기)</th>
                      <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>관리 액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbBoards.length > 0 ? (
                      dbBoards.map((row, idx) => {
                        const skinLabels: Record<string, string> = { FILE_THUMB: "자료실 썸네일형", VIDEO_ALBUM: "동영상 앨범형", LIST: "일반 목록형", GALLERY: "갤러리형" };
                        const isVideo = row.skin_type === 'VIDEO_ALBUM';
                        return (
                      <tr key={row.id || idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fafbfc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "16px 20px", verticalAlign: "middle", fontSize: 14, color: textSecondary, fontFamily: "monospace" }}>{row.board_id}</td>
                        <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                          <span style={{ fontWeight: 700, color: textPrimary, fontSize: 15 }}>{row.name}</span>
                          {row.description && <span style={{ fontSize: 13, color: textSecondary, marginLeft: 6 }}>({row.description})</span>}
                        </td>
                        <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: textSecondary }}>
                            {!isVideo ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                            )}
                            {skinLabels[row.skin_type] || row.skin_type}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 600, color: textSecondary }}>{row.perm_list} / {row.perm_read} / {row.perm_write}</td>
                        <td style={{ padding: "16px 20px", textAlign: "center", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button style={{ height: 30, padding: "0 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              설정
                            </button>
                            <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#6b7280", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              미리보기
                            </button>
                            <button onClick={async () => { if (confirm(`'${row.name}' 게시판을 삭제하시겠습니까?`)) { const res = await deleteBoard(row.board_id); if (res.success) setDbBoards(prev => prev.filter(b => b.board_id !== row.board_id)); else alert('삭제 실패: ' + res.error); }}} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={5} style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 40 }}>등록된 게시판이 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        ) : activeMenu === "study" ? (
          /* ===== 스터디관리 리스트 (원본 iframe 디자인 1:1 복제) ===== */
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
            {/* 타이틀 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>스터디목록 (강의관리)</h1>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                ( <span style={{ color: "#3b82f6" }}>총 6건</span> / <span style={{ color: "#6b7280" }}>임시저장 1건</span> / <span style={{ color: "#6b7280" }}>유료지원 0건</span> )
              </span>
            </div>

            {/* 메인 카드 */}
            <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              {/* 필터 영역 */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>진행상황</label>
                  <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
                    <option>전체</option>
                  </select>
                </div>
                <input type="text" placeholder="강의명을 검색하세요." style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
                <button style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  검색
                </button>
                <button style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
              </div>

              {/* 액션 버튼 영역 */}
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
                <button style={{ height: 36, padding: "0 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ 새 강의 등록</button>
                <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  선택삭제
                </button>
              </div>

              {/* 데이터 테이블 */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                        <input type="checkbox" style={{ accentColor: "#3b82f6" }} />
                      </th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 80 }}>공개상태</th>
                      <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>강의명</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>수강료(포인트)</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 180 }}>최초등록일</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { status: "판매중", title: "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 운영법", price: "2,000 P", date: "2026. 04. 07. 12시 08:34" },
                      { status: "판매중", title: "[2026] 부동산이 알아야 하는 챗봇 활용법", price: "3,000 P", date: "2026. 04. 07. 12시 08:34" },
                      { status: "판매중", title: "[202603] 부동산 중개에 필요한 지미나이 활용법", price: "5,000 P", date: "2026. 04. 07. 12시 08:34" },
                      { status: "판매중", title: "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 운영법", price: "2,000 P", date: "2026. 04. 05. 오전 11:44" },
                      { status: "판매중", title: "[2026] 부동산이 알아야 하는 챗봇 활용법", price: "3,000 P", date: "2026. 04. 05. 오전 11:42" },
                      { status: "판매중", title: "[202603] 부동산 중개에 필요한 지미나이 활용법", price: "5,000 P", date: "2026. 04. 05. 오전 11:40" },
                    ].map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fafbfc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <input type="checkbox" style={{ accentColor: "#3b82f6" }} />
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, fontSize: 13, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a" }}>{row.status}</span>
                        </td>
                        <td style={{ padding: "16px 10px", verticalAlign: "middle", fontWeight: 700, color: textPrimary, fontSize: 15 }}>{row.title}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>{row.price}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{row.date}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button style={{ height: 30, padding: "0 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              수정
                            </button>
                            <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이징 */}
              <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
                <button style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&lt;</button>
                <button style={{ width: 32, height: 32, border: "none", borderRadius: 4, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>1</button>
                <button style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&gt;</button>
              </div>
            </div>
          </div>

        ) : (activeMenu.startsWith("members") || activeMenu === "dormant") ? (
          /* ===== 회원관리 리스트 (원본 admin 디자인 1:1 복제) ===== */
          showMemberRegister ? (
            <MemberRegisterForm 
              darkMode={darkMode} 
              editMemberId={selectedMemberId}
              isAdmin={true}
              onBack={() => {
                setShowMemberRegister(false);
                setSelectedMemberId(null);
                adminGetMembers().then(res => setDbMembers(res.data || []));
              }} 
            />
          ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
            {/* 타이틀 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>
                {activeMenu === "dormant" ? "휴지통" : "회원목록"}
              </h1>
              <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
                ( <span>관리자 1명</span> / <span>부동산회원 1명</span> / <span>일반 1명</span> / 전체 3명 )
              </span>
            </div>

            {/* 메인 카드 */}
            <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              {/* 필터 영역 */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>회원번호</label>
                  <input type="text" placeholder="회원번호 입력" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 130 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>회원구분</label>
                  <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
                    <option>전체</option>
                    <option>최고관리자</option>
                    <option>부동산회원</option>
                    <option>일반회원</option>
                  </select>
                </div>
                <input type="text" placeholder="이름 또는 이메일 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
                <button style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  검색
                </button>
                <button style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
              </div>

              {/* 액션 버튼 영역 */}
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
                {activeMenu === "dormant" ? (
                  <button onClick={async () => {
                    if (checkedMemberIds.length === 0) {
                      alert("재등록할 회원을 왼쪽 체크박스로 선택해주세요.");
                      return;
                    }
                    if (confirm(`선택한 ${checkedMemberIds.length}명의 회원을 다시 정상 회원으로 복구하시겠습니까?`)) {
                      for (const id of checkedMemberIds) {
                        await adminRestoreMember(id);
                      }
                      adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                      setCheckedMemberIds([]);
                      setActiveMenu("members_list");
                    }
                  }} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="21 3 14 10"/></svg>
                    재등록
                  </button>
                ) : (
                  <button onClick={() => { setSelectedMemberId(null); setShowMemberRegister(true); }} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ 회원등록</button>
                )}
                <button onClick={async () => {
                  if (checkedMemberIds.length === 0) {
                    alert("삭제할 회원을 왼쪽 체크박스로 선택해주세요.");
                    return;
                  }
                  if (activeMenu === "dormant") {
                    if (confirm(`선택한 ${checkedMemberIds.length}명의 회원을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                      for (const id of checkedMemberIds) {
                        await adminHardDeleteMember(id);
                      }
                      adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                      setCheckedMemberIds([]);
                    }
                  } else {
                    if (confirm(`선택한 ${checkedMemberIds.length}명의 회원을 휴지통으로 이동하시겠습니까?`)) {
                      for (const id of checkedMemberIds) {
                        await adminSoftDeleteMember(id);
                      }
                      adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                      setCheckedMemberIds([]);
                    }
                  }
                }} style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: activeMenu === "dormant" ? "#ef4444" : textPrimary, border: `1px solid ${activeMenu === "dormant" ? "#ef4444" : border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  {activeMenu === "dormant" ? "영구삭제" : "선택삭제"}
                </button>
              </div>

              {/* 데이터 테이블 */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1200, whiteSpace: "nowrap" }}>
                  <thead>
                    <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                        <input type="checkbox" style={{ accentColor: "#3b82f6" }} 
                          checked={dbMembers.length > 0 && checkedMemberIds.length === (activeMenu === "dormant" ? dbMembers.filter(m => m.is_deleted).length : dbMembers.filter(m => !m.is_deleted).length) && checkedMemberIds.length > 0}
                          onChange={(e) => {
                            const list = activeMenu === "dormant" ? dbMembers.filter(m => m.is_deleted) : dbMembers.filter(m => !m.is_deleted);
                            if (e.target.checked) setCheckedMemberIds(list.map((m: any) => m.id));
                            else setCheckedMemberIds([]);
                          }}
                        />
                      </th>
                      <th style={{ padding: "12px 20px 12px 10px", textAlign: "right", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>회원번호</th>
                      <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 280 }}>아이디</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 80 }}>이름</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 140 }}>연락처</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 110 }}>회원구분</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>가입일</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>승인상태</th>
                      <th style={{ width: "auto", borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}></th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 220 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const displayMembers = activeMenu === "dormant" ? dbMembers.filter(m => m.is_deleted) : dbMembers.filter(m => !m.is_deleted);
                      return displayMembers.length > 0 ? (
                        displayMembers.map((member, idx) => {
                        const roleMap: any = { 'ADMIN': '최고관리자', 'REALTOR': '부동산회원', 'USER': '일반회원' };
                        const displayRole = roleMap[member.role] || member.role || '일반회원';
                        const createdDate = member.created_at ? new Date(member.created_at).toISOString().split('T')[0] : "-";
                        
                        let agencyStatus = null;
                        if (member.agencies) {
                          agencyStatus = Array.isArray(member.agencies) ? member.agencies[0]?.status : member.agencies.status;
                        }
                        
                        let displayStatus = member.signup_completed ? '정상' : '승인대기';
                        let statusColor = textSecondary;
                        let statusBg = "transparent";
                        
                        if (member.role === 'REALTOR') {
                          if (agencyStatus === 'APPROVED') {
                            displayStatus = '정상승인';
                            statusColor = "#065f46";
                            statusBg = "#d1fae5";
                          } else if (agencyStatus === 'REJECTED') {
                            displayStatus = '서류보완 필요';
                            statusColor = "#b91c1c";
                            statusBg = "#fee2e2";
                          } else {
                            displayStatus = '승인대기';
                            statusColor = "#92400e";
                            statusBg = "#fef3c7";
                          }
                        }
                        
                        return (
                      <tr key={member.id || idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f1f3f5"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                          <input type="checkbox" style={{ accentColor: "#3b82f6" }} 
                            checked={checkedMemberIds.includes(member.id)}
                            onChange={(e) => {
                              if (e.target.checked) setCheckedMemberIds(prev => [...prev, member.id]);
                              else setCheckedMemberIds(prev => prev.filter(id => id !== member.id));
                            }}
                          />
                        </td>
                        <td style={{ padding: "16px 20px 16px 10px", textAlign: "right", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{String(dbMembers.length - dbMembers.findIndex(m => m.id === member.id)).padStart(6, '0')}</td>
                        <td style={{ padding: "16px 10px", verticalAlign: "middle", textAlign: "left" }}>
                          <a href="#" style={{ fontSize: 15, fontWeight: 600, color: textSecondary, textDecoration: "none", cursor: "pointer" }}
                            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                            onClick={(e) => { e.preventDefault(); setSelectedMemberId(member.id); setShowMemberRegister(true); }}
                          >{member.email}</a>
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 600, color: textPrimary }}>{member.name || '-'}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{member.phone || '-'}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>
                          {displayRole}
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{createdDate}</td>
                        <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14 }}>
                          {member.role === 'REALTOR' ? (
                            <span 
                              onClick={() => { setSelectedMemberId(member.id); setShowMemberRegister(true); }}
                              style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: statusBg, color: statusColor, fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "opacity 0.2s" }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                              title="클릭하여 회원정보 수정"
                            >
                              {displayStatus}
                            </span>
                          ) : (
                            <span 
                              onClick={() => { setSelectedMemberId(member.id); setShowMemberRegister(true); }}
                              style={{ color: textSecondary, cursor: "pointer", textDecoration: "underline" }}
                              title="클릭하여 회원정보 수정"
                            >
                              {displayStatus}
                            </span>
                          )}
                        </td>
                        <td></td>
                        <td style={{ padding: "16px 10px", textAlign: "right", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={() => { setSelectedMemberId(member.id); setShowMemberRegister(true); }} style={{ height: 30, padding: "0 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              수정
                            </button>
                            <button onClick={async () => {
                              if (activeMenu === "dormant") {
                                if (confirm("정말로 이 회원을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
                                  const res = await adminHardDeleteMember(member.id);
                                  if (res.success) {
                                    adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                                  } else {
                                    alert("영구 삭제 실패: " + res.error);
                                  }
                                }
                              } else {
                                if (confirm("이 회원을 휴지통으로 이동하시겠습니까? (삭제 처리)")) {
                                  const res = await adminSoftDeleteMember(member.id);
                                  if (res.success) {
                                    adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                                    setActiveMenu("dormant");
                                  } else {
                                    alert("삭제 실패: " + res.error);
                                  }
                                }
                              }
                            }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: activeMenu === "dormant" ? "#ef4444" : "#9ca3af", border: `1px solid ${activeMenu === "dormant" ? "#ef4444" : (darkMode ? "#444" : "#d1d5db")}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              {activeMenu === "dormant" ? "영구삭제" : "삭제"}
                            </button>
                            <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#6b7280", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                              수정내역
                            </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} style={{ padding: "40px 0", textAlign: "center", color: textSecondary, fontSize: 14 }}>
                          {activeMenu === "dormant" ? "삭제된 회원이 없습니다." : "가입된 회원이 없습니다."}
                        </td>
                      </tr>
                    );
                  })()}
                  </tbody>
                </table>
              </div>

              {/* 페이징 */}
              <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
                <button style={{ width: 32, height: 32, border: "none", borderRadius: 4, background: "#4b5563", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>1</button>
                {[2,3,4,5].map(n => (
                  <button key={n} style={{ width: 32, height: 32, border: `1px solid ${border}`, borderRadius: 4, background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</button>
                ))}
              </div>
            </div>
          </div>
          )

        ) : activeMenu === "article" ? (
          /* ===== 기사 관리 대시보드 ===== */
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>기사 목록</h1>
              <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
                ( 승인대기 {dbArticles.filter(a => a.status === 'PENDING').length}건 / 전체 {dbArticles.length}건 )
              </span>
            </div>

            <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              {/* 필터 탭 */}
              <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
                {["전체", "승인대기", "발행됨", "작성중", "반려"].map(tab => (
                  <button key={tab} onClick={() => { setArticleFilter(tab); setCheckedArticleIds([]); }}
                    style={{ border: "none", background: "none", padding: "16px 20px", fontSize: 14, fontWeight: articleFilter === tab ? 800 : 600, color: articleFilter === tab ? "#3b82f6" : textSecondary, borderBottom: articleFilter === tab ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer" }}>
                    {tab}
                    {tab === "승인대기" && <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11 }}>{dbArticles.filter(a => a.status === 'PENDING').length}</span>}
                  </button>
                ))}
              </div>

              {/* 액션 버튼 영역 */}
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
                <a href="/admin/news_write" style={{ display: "flex", alignItems: "center", height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", gap: 6 }}>+ 새 기사 작성</a>
                
                <button onClick={async () => {
                  if (checkedArticleIds.length === 0) { alert("승인할 기사를 선택하세요."); return; }
                  if (confirm(`선택한 ${checkedArticleIds.length}건의 기사를 일괄 승인(발행)하시겠습니까?`)) {
                    const res = await adminUpdateArticleStatus(checkedArticleIds, 'PUBLISHED');
                    if (res.success) {
                      getArticles().then(r => setDbArticles(r.data || []));
                      setCheckedArticleIds([]);
                    } else alert("오류가 발생했습니다: " + res.error);
                  }
                }} style={{ height: 36, padding: "0 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  ✓ 선택 승인
                </button>
                <button onClick={async () => {
                  if (checkedArticleIds.length === 0) { alert("반려할 기사를 선택하세요."); return; }
                  if (confirm(`선택한 ${checkedArticleIds.length}건의 기사를 반려 처리하시겠습니까?`)) {
                    const res = await adminUpdateArticleStatus(checkedArticleIds, 'REJECTED');
                    if (res.success) {
                      getArticles().then(r => setDbArticles(r.data || []));
                      setCheckedArticleIds([]);
                    } else alert("오류가 발생했습니다: " + res.error);
                  }
                }} style={{ height: 36, padding: "0 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  🚫 선택 반려
                </button>
              </div>

              {/* 테이블 */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1000, whiteSpace: "nowrap" }}>
                  <thead>
                    <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                        <input type="checkbox" style={{ accentColor: "#3b82f6" }} 
                          onChange={(e) => {
                            const filtered = dbArticles.filter(a => {
                              if (articleFilter === "전체") return true;
                              if (articleFilter === "승인대기") return a.status === 'PENDING';
                              if (articleFilter === "발행됨") return a.status === 'PUBLISHED';
                              if (articleFilter === "작성중") return a.status === 'DRAFT';
                              if (articleFilter === "반려") return a.status === 'REJECTED';
                              return true;
                            });
                            setCheckedArticleIds(e.target.checked ? filtered.map(a => a.id) : []);
                          }}
                        />
                      </th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 80 }}>상태</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>섹션</th>
                      <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>기사 제목</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>기자명</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>발행일</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 150 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = dbArticles.filter(a => {
                        if (articleFilter === "전체") return true;
                        if (articleFilter === "승인대기") return a.status === 'PENDING';
                        if (articleFilter === "발행됨") return a.status === 'PUBLISHED';
                        if (articleFilter === "작성중") return a.status === 'DRAFT';
                        if (articleFilter === "반려") return a.status === 'REJECTED';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: textSecondary }}>조회된 기사가 없습니다.</td></tr>;
                      }

                      return filtered.map((a) => (
                        <tr key={a.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                          <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                            <input type="checkbox" style={{ accentColor: "#3b82f6" }}
                              checked={checkedArticleIds.includes(a.id)}
                              onChange={(e) => {
                                if (e.target.checked) setCheckedArticleIds(prev => [...prev, a.id]);
                                else setCheckedArticleIds(prev => prev.filter(id => id !== a.id));
                              }} />
                          </td>
                          <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                            {a.status === 'PENDING' && <span style={{ padding: "4px 8px", background: "#8b5cf6", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>승인대기</span>}
                            {a.status === 'PUBLISHED' && <span style={{ padding: "4px 8px", background: "#10b981", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>발행됨</span>}
                            {a.status === 'REJECTED' && <span style={{ padding: "4px 8px", background: "#ef4444", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>반려됨</span>}
                            {a.status === 'DRAFT' && <span style={{ padding: "4px 8px", background: "#9ca3af", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>작성중</span>}
                          </td>
                          <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary }}>{a.section1 || '-'}</td>
                          <td style={{ padding: "16px 10px", textAlign: "left", verticalAlign: "middle" }}>
                            <a href={`/admin/news_write?id=${a.id}`} style={{ fontWeight: 700, fontSize: 15, color: textPrimary, textDecoration: "none" }}>{a.title}</a>
                          </td>
                          <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textPrimary }}>{a.author_name || '-'}</td>
                          <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary }}>{a.published_at ? new Date(a.published_at).toISOString().split('T')[0] : '-'}</td>
                          <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                              <a href={`/admin/news_write?id=${a.id}`} style={{ padding: "6px 12px", background: "#3b4363", color: "#fff", textDecoration: "none", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>상세보기</a>
                              <button onClick={async () => {
                                if (confirm("기사를 삭제하시겠습니까?")) {
                                  const res = await deleteArticle(a.id);
                                  if (res.success) getArticles().then(r => setDbArticles(r.data || []));
                                  else alert("삭제 실패: " + res.error);
                                }
                              }} style={{ padding: "6px 12px", background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`, color: textSecondary, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>삭제</button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* 다른 메뉴 선택 시 placeholder */
          <div style={{ flex: 1, margin: "16px 16px 0 16px", background: cardBg, borderRadius: "14px 14px 0 0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>{contentTitle}</div>
              <div style={{ marginTop: 8, fontSize: 14 }}>준비 중인 기능입니다.</div>
            </div>
          </div>
        )}
      </main>

      {/* ===== 게시판 생성 모달 (1:1 픽셀 복제) ===== */}
      {showBoardModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: darkMode ? "#1f2937" : "#ffffff", width: 560, borderRadius: 10,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden",
            fontFamily: "'Pretendard Variable', -apple-system, sans-serif"
          }}>
            {/* 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "24px 28px 16px"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>게시판 생성</h2>
              <button onClick={() => setShowBoardModal(false)} style={{
                background: "none", border: "none", cursor: "pointer", color: "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* 바디 */}
            <div style={{ padding: "10px 28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* 1열: 고유 ID */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                  게시판 고유 ID <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input type="text" placeholder="예: bbs_notice (영문, 숫자 조합)" style={{
                  width: "100%", height: 42, padding: "0 14px", fontSize: 13,
                  border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff",
                  color: textPrimary, outline: "none", fontFamily: "inherit"
                }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = border} />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, letterSpacing: "-0.2px" }}>URL 주소로 사용될 고유 이름입니다. 예: dori</div>
              </div>

              {/* 2열: 게시판 이름, 보조 타이틀 */}
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                    게시판 이름 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input type="text" placeholder="예: 공지사항" style={{
                    width: "100%", height: 42, padding: "0 14px", fontSize: 13,
                    border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff",
                    color: textPrimary, outline: "none", fontFamily: "inherit"
                  }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = border} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                    보조 타이틀
                  </label>
                  <input type="text" placeholder="예: 자료실" style={{
                    width: "100%", height: 42, padding: "0 14px", fontSize: 13,
                    border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff",
                    color: textPrimary, outline: "none", fontFamily: "inherit"
                  }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = border} />
                </div>
              </div>

              {/* 3열: 스킨/테마 구조 선택, 가로 갯수 */}
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                    스킨 / 테마 구조 선택 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <select style={{
                      width: "100%", height: 42, padding: "0 34px 0 14px", fontSize: 13,
                      border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff",
                      color: textPrimary, outline: "none", fontFamily: "inherit", appearance: "none", cursor: "pointer"
                    }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = border}>
                      <option>📑 일반 리스트형 (자유게시판/공지사항)</option>
                      <option>▶️ 동영상 앨범형 (유튜브 + 드라이브 다운로드 최적화)</option>
                      <option>📄 파일 자료실형 (디자인 썸네일 + 다운로드 버튼)</option>
                      <option>💡 자주묻는질문 (FAQ 아코디언형)</option>
                      <option>🔒 1:1 문의 (작성자/관리자 전용 비밀글)</option>
                    </select>
                    <svg style={{ position: "absolute", right: 12, top: 14, pointerEvents: "none", color: "#9ca3af" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                    가로 갯수 (앨범형)
                  </label>
                  <div style={{ position: "relative" }}>
                    <select style={{
                      width: "100%", height: 42, padding: "0 34px 0 14px", fontSize: 13,
                      border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff",
                      color: textPrimary, outline: "none", fontFamily: "inherit", appearance: "none", cursor: "pointer"
                    }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = border}>
                      <option>3개의 보기</option>
                      <option>4개의 보기</option>
                    </select>
                    <svg style={{ position: "absolute", right: 12, top: 14, pointerEvents: "none", color: "#9ca3af" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              {/* 4열: 세부 카테고리 */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                  세부 카테고리 (분류)
                </label>
                <input type="text" placeholder="쉼표(,)로 구분하여 입력하세요. (예: 드론, 아파트, 빌딩)" style={{
                  width: "100%", height: 42, padding: "0 14px", fontSize: 13,
                  border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff",
                  color: textPrimary, outline: "none", fontFamily: "inherit"
                }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = border} />
              </div>

              {/* 5열: 권한 설정 */}
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { label: "목록 열람 권한", val: "1레벨 (일반회원 이상)" },
                  { label: "내용 읽기/다운로드 권한", val: "5레벨 (기자/제휴 이상)" },
                  { label: "글쓰기 권한", val: "9레벨 (관리자 전용)" }
                ].map((col, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 6, letterSpacing: "-0.5px" }}>
                      {col.label}
                    </label>
                    <div style={{ position: "relative" }}>
                      <select defaultValue={col.val} style={{
                        width: "100%", height: 38, padding: "0 28px 0 10px", fontSize: 12,
                        border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff",
                        color: textPrimary, outline: "none", fontFamily: "inherit", appearance: "none", cursor: "pointer"
                      }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = border}>
                        <option>비회원 + 전체</option>
                        <option>1레벨 (일반회원 이상)</option>
                        <option>5레벨 (기자/제휴 이상)</option>
                        <option>9레벨 (관리자 전용)</option>
                      </select>
                      <svg style={{ position: "absolute", right: 8, top: 12, pointerEvents: "none", color: "#9ca3af" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 푸터 버튼영역 */}
            <div style={{
              display: "flex", justifyContent: "flex-end", gap: 8, padding: "20px 28px 28px"
            }}>
              <button onClick={() => setShowBoardModal(false)} style={{
                padding: "0 20px", height: 44, borderRadius: 6, border: `1px solid ${border}`,
                background: darkMode ? "#374151" : "#ffffff", color: textPrimary,
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s"
              }} onMouseOver={(e) => e.currentTarget.style.background = darkMode ? "#4b5563" : "#f9fafb"} onMouseOut={(e) => e.currentTarget.style.background = darkMode ? "#374151" : "#ffffff"}>
                취소
              </button>
              <button style={{
                padding: "0 24px", height: 44, borderRadius: 6, border: "none",
                background: "#2a2f3a", color: "#ffffff", transition: "background 0.2s",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }} onMouseOver={(e) => e.currentTarget.style.background = "#111827"} onMouseOut={(e) => e.currentTarget.style.background = "#2a2f3a"}>
                설정 저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
