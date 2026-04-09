"use client";

import React, { useState } from "react";

/* ──────────────────────────────────────────────
   SVG 아이콘 컴포넌트 (원본 user_admin.html 1:1 복제)
   ────────────────────────────────────────────── */
const SvgIcon = ({ children, ...props }: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {children}
  </svg>
);

const IconDashboard = () => <SvgIcon><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></SvgIcon>;
const IconBuilding = () => <SvgIcon><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></SvgIcon>;
const IconArticle = () => <SvgIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></SvgIcon>;
const IconStudy = () => <SvgIcon><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></SvgIcon>;
const IconCustomer = () => <SvgIcon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></SvgIcon>;
const IconComment = () => <SvgIcon><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></SvgIcon>;
const IconManual = () => <SvgIcon><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></SvgIcon>;
const IconSettings = () => <SvgIcon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></SvgIcon>;

/* ──────────────────────────────────────────────
   부동산관리자 메뉴 (원본 user_admin.html에서 추출)
   회원관리, 편집, 게시판, 광고, 플러그인, 통계 없음
   정보설정은 구분선 후 맨 하단에 배치
   ────────────────────────────────────────────── */
type MenuItem = { key: string; label: string; icon: React.ReactNode; separated?: boolean };

const REALTY_MENU: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "gongsil", label: "공실관리", icon: <IconBuilding /> },
  { key: "article", label: "기사관리", icon: <IconArticle /> },
  { key: "study", label: "스터디관리", icon: <IconStudy /> },
  { key: "customer", label: "고객관리", icon: <IconCustomer /> },
  { key: "comment", label: "댓글·문의", icon: <IconComment /> },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
  { key: "settings", label: "정보설정", icon: <IconSettings />, separated: true },
];

/* ──────────────────────────────────────────────
   더미 대시보드 데이터 (원본 스크린샷에서 추출)
   부동산관리자: KPI 3개 (회원 카드 없음)
   ────────────────────────────────────────────── */
const kpiCards = [
  { icon: "🏢", label: "공실 등록 물건", value: "204", sub: "전체 등록 공실", color: "#3b82f6" },
  { icon: "📰", label: "등록 기사", value: "14", sub: "전체 등록 기사", color: "#f59e0b" },
  { icon: "💬", label: "댓글 / 문의", value: "24", sub: "전체 댓글 및 문의", color: "#ef4444" },
];

const quickLinks = [
  { icon: <IconBuilding />, label: "공실 관리", count: "204" },
  { icon: <IconArticle />, label: "기사 관리", count: "14" },
  { icon: <IconComment />, label: "댓글 / 문의", count: "24" },
  { icon: <SvgIcon strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></SvgIcon>, label: "공실 등록하기", count: "" },
];

/* ──────────────────────────────────────────────
   메인 컴포넌트
   ────────────────────────────────────────────── */
export default function RealtyAdminPage() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  // 부동산관리자 컬러 (#1a3a6b 네이비 블루)
  const sidebarBg = darkMode ? "#1e2a42" : "#1a3a6b";
  const bg = darkMode ? "#1a1b1e" : "#f4f5f7";
  const headerBg = darkMode ? "#25262b" : "#fff";
  const cardBg = darkMode ? "#25262b" : "#fff";
  const textPrimary = darkMode ? "#e1e4e8" : "#111827";
  const textSecondary = darkMode ? "#9ca3af" : "#6b7280";
  const border = darkMode ? "#333" : "#e1e4e8";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: bg, overflow: "hidden" }}>
      {/* ===== 좌측 사이드바 (80px, 블루 테마) ===== */}
      <aside style={{ width: 80, background: sidebarBg, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)" }}>
        {/* 로고 */}
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 }}>
          <img src="/favicon.png" alt="공실뉴스 로고" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onClick={() => window.location.href = "/"} />
        </div>

        {/* 메뉴 리스트 */}
        <ul style={{ listStyle: "none", margin: 0, padding: "16px 0", flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
          {REALTY_MENU.map((item) => (
            <li
              key={item.key}
              style={{
                margin: 0,
                position: "relative",
                ...(item.separated ? { marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.15)" } : {}),
              }}
              onMouseEnter={() => setHoveredMenu(item.key)}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              <button
                onClick={() => setActiveMenu(item.key)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "18px 0", textDecoration: "none", width: "100%", border: "none", cursor: "pointer",
                  color: activeMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.65)",
                  background: activeMenu === item.key ? "rgba(255,255,255,0.18)" : hoveredMenu === item.key ? "rgba(255,255,255,0.12)" : "none",
                  borderLeft: activeMenu === item.key ? "3px solid #ffffff" : "3px solid transparent",
                  fontSize: 11, fontWeight: activeMenu === item.key ? 700 : 600, gap: 6, fontFamily: "inherit",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{
                  width: 22, height: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  transform: hoveredMenu === item.key ? "translateY(-2px)" : "none"
                }}>
                  <span style={{ width: 22, height: 22, display: "block" }}>
                    {React.cloneElement(item.icon as React.ReactElement, {
                      style: { width: 22, height: 22, stroke: activeMenu === item.key || hoveredMenu === item.key ? "#ffffff" : "rgba(255,255,255,0.65)" }
                    })}
                  </span>
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ===== 우측 메인 영역 ===== */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: bg, overflow: "hidden" }}>
        {/* 상단 헤더 — 부동산관리자: 닉네임 + 이메일 + 역할뱃지 + 보완요청 */}
        <header style={{ height: 64, background: headerBg, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", flexShrink: 0, zIndex: 5 }}>
          {/* 사용자 프로필 영역 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 12px", borderRadius: 6, transition: "background 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontWeight: 800, fontSize: 17, color: textPrimary }}>착한임대</span>
            <span style={{ fontSize: 14, color: darkMode ? "#aaa" : "#666" }}>gongsilmarketing@gmail.com</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, background: "#ebf5ff", color: "#3b82f6" }}>부동산회원(유료)</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginLeft: 4, color: "#be123c", background: "#fee2e2", border: "1px solid #ef4444", display: "inline-flex", alignItems: "center", gap: 4 }}>🚨 보완요청 확인요망</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: darkMode ? "#2c2d31" : "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: darkMode ? "#e1e4e8" : "#555" }} title="다크모드 전환">
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", border: "none", borderRadius: 6, background: darkMode ? "#374151" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>로그아웃</button>
            <a href="/" style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: darkMode ? "#e1e4e8" : "#4b5563", textDecoration: "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
              🏠 공실페이지 가기
            </a>
          </div>
        </header>

        {/* 대시보드 or 준비중 */}
        {activeMenu === "dashboard" ? (
          <div style={{ flex: 1, overflowY: "auto", margin: 16, marginBottom: 0, background: cardBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", padding: "20px 28px" }}>
            {/* 타이틀 */}
            <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
              모니터링 대시보드
              <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>마지막 갱신: {timeStr}</span>
              <button style={{ marginLeft: "auto", fontSize: 12, color: textSecondary, background: "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>⟳ 새로고침</button>
            </h1>

            {/* KPI 카드 3개 (부동산관리자: 회원 카드 없음) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {kpiCards.map((card, i) => (
                <div key={i} style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", borderLeft: `4px solid ${card.color}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
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

            {/* 중단: 최근 물건 + 최근 등록 기사 (부동산관리자는 회원 대신 기사) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* 최근 등록 공실 물건 */}
              <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
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

              {/* 최근 등록 기사 (부동산관리자 전용) */}
              <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  📰 최근 등록 기사
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>0</span>
                </div>
                <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" as const, padding: 20 }}>게시된 기사가 없습니다</div>
              </div>
            </div>

            {/* 하단: 바로가기 + 최근 댓글 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* 바로가기 */}
              <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px" }}>⚡ 바로가기</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {quickLinks.map((ql, i) => (
                    <a key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 14px", borderRadius: 10, background: darkMode ? "#1a1b1e" : "#f9fafb",
                      cursor: "pointer", textDecoration: "none", color: darkMode ? "#e1e4e8" : "#374151",
                      fontSize: 13, fontWeight: 600, transition: "background 0.2s, transform 0.15s",
                      border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#38393e" : "#eff6ff"; e.currentTarget.style.transform = "translateX(4px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = darkMode ? "#1a1b1e" : "#f9fafb"; e.currentTarget.style.transform = "none"; }}
                    >
                      <span style={{ width: 18, height: 18, display: "flex", flexShrink: 0 }}>
                        {React.cloneElement(ql.icon as React.ReactElement, { style: { width: 18, height: 18, stroke: textSecondary } })}
                      </span>
                      {ql.label}
                      {ql.count && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#3b82f6", background: darkMode ? "#1e3a5f" : "#eff6ff", padding: "2px 8px", borderRadius: 10 }}>{ql.count}</span>}
                    </a>
                  ))}
                </div>
              </div>

              {/* 최근 댓글 / 문의 */}
              <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px" }}>💬 최근 댓글 / 문의</div>
                <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" as const, padding: 20 }}>댓글 없음</div>
              </div>
            </div>
          </div>
        ) : (
          /* 다른 메뉴 선택 시 placeholder */
          <div style={{ flex: 1, margin: 16, marginBottom: 0, background: cardBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>{REALTY_MENU.find(m => m.key === activeMenu)?.label || activeMenu}</div>
              <div style={{ marginTop: 8, fontSize: 14 }}>준비 중인 기능입니다.</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
