"use client";

import React, { useState } from "react";

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
    { key: "dormant", label: "휴면회원목록" },
    { key: "etc_register", label: "기타등록관리" },
    { key: "author_display", label: "필자표시관리" },
    { key: "department", label: "부서관리" },
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

  const contentTitle = MENU_ITEMS.find(m => m.key === activeMenu)?.label || "대시보드";
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
        <ul style={{ listStyle: "none", margin: 0, padding: "16px 0", flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
          {MENU_ITEMS.map((item) => (
            <React.Fragment key={item.key}>
              {item.dividerBefore && <li style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "4px 14px" }} />}
              <li style={{ margin: 0, position: "relative" }}
                onMouseEnter={() => setHoveredMenu(item.key)}
                onMouseLeave={() => setHoveredMenu(null)}>
                <button
                  onClick={() => setActiveMenu(item.key)}
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
          <button style={{ padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#fff", border: "none", borderRadius: 6, background: darkMode ? "#2c2d31" : "#4b5563", cursor: "pointer" }}>로그아웃</button>
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
    </div>
  );
}
