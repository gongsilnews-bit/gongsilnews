"use client";

import React from "react";
import { AdminSectionProps } from "./types";
import { SvgIcon, IconBuilding, IconArticle, IconMembers, IconComment } from "./AdminIcons";

/* ── 더미 대시보드 데이터 ── */
const kpiCardsAdmin = [
  { icon: "🏢", label: "공실 등록 물건", value: "204", sub: "전체 등록 공실", color: "#3b82f6" },
  { icon: "👤", label: "전체 회원", value: "3", sub: "부동산회원 1명 포함", color: "#10b981" },
  { icon: "📰", label: "등록 기사", value: "14", sub: "전체 등록 기사", color: "#f59e0b" },
  { icon: "💬", label: "댓글 / 문의", value: "24", sub: "전체 댓글 및 문의", color: "#ef4444" },
];

const kpiCardsUser = [
  { icon: "🏢", label: "공실 등록 물건", value: "204", sub: "전체 등록 공실", color: "#3b82f6" },
  { icon: "📰", label: "등록 기사", value: "14", sub: "전체 등록 기사", color: "#f59e0b" },
  { icon: "💬", label: "댓글 / 문의", value: "24", sub: "전체 댓글 및 문의", color: "#ef4444" },
];

const recentMembers = [
  { name: "김동현", email: "suppliant@naver.com", role: "일반", roleClass: "general", time: "1일 전" },
  { name: "착한임대", email: "gongsilmarketing@gmail.com", role: "부동산", roleClass: "realtor", time: "8일 전" },
  { name: "김미숙", email: "gongsilnews@gmail.com", role: "관리자", roleClass: "admin", time: "22일 전" },
];

type QuickLink = { icon: React.ReactElement; label: string; count: string };

interface DashboardSectionProps extends AdminSectionProps {
  role: "admin" | "realtor" | "user";
  agencyStatus?: string;
}

export default function DashboardSection({ theme, role, agencyStatus }: DashboardSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const kpiCards = role === "admin" ? kpiCardsAdmin : kpiCardsUser;

  const quickLinks: QuickLink[] = [
    { icon: <IconBuilding />, label: "공실 관리", count: "204" },
    { icon: <IconArticle />, label: "기사 관리", count: "14" },
    ...(role === "admin" ? [{ icon: <IconMembers />, label: "고객 관리", count: "3" }] : []),
    { icon: <SvgIcon strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></SvgIcon>, label: "댓글 / 문의", count: "24" },
    { icon: <SvgIcon strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></SvgIcon>, label: "공실 등록하기", count: "" },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      {/* 부동산관리자 승인 상태 배너 */}
      {role === "realtor" && agencyStatus === "PENDING" && (
        <div style={{ padding: "16px 20px", marginBottom: 24, borderRadius: 8, background: darkMode ? "#422814" : "#fffbeb", border: `1px solid ${darkMode ? "#78350f" : "#fef08a"}`, display: "flex", gap: 12, alignItems: "flex-start", color: darkMode ? "#fde68a" : "#92400e" }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>현재 서류 검토가 진행 중입니다.</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>제출해주신 중개업소 증빙 서류를 관리자가 검토하고 있습니다. 최종 승인 전까지 일부 기능 사용이 제한될 수 있습니다.</div>
          </div>
        </div>
      )}
      {role === "realtor" && agencyStatus === "REJECTED" && (
        <div style={{ padding: "16px 20px", marginBottom: 24, borderRadius: 8, background: darkMode ? "#451a1a" : "#fef2f2", border: `1px solid ${darkMode ? "#7f1d1d" : "#fecaca"}`, display: "flex", gap: 12, alignItems: "flex-start", color: darkMode ? "#fca5a5" : "#b91c1c" }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>제출하신 서류의 보완이 필요합니다.</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>제출된 서류가 미비하여 승인이 거절되었습니다. 좌측의 <strong>[정보설정]</strong> 메뉴로 이동하여 서류를 다시 첨부해 주시기 바랍니다.</div>
          </div>
        </div>
      )}

      {/* 타이틀 */}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
        모니터링 대시보드
        <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>마지막 갱신: {timeStr}</span>
        <button style={{ marginLeft: "auto", fontSize: 12, color: textSecondary, background: "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>⟳ 새로고침</button>
      </h1>

      {/* KPI 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpiCards.length}, 1fr)`, gap: 16, marginBottom: 24 }}>
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

      {/* 중단: 최근 물건 + 최근 회원/기사 */}
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

        {/* 최근 가입 회원 (admin만) or 최근 기사 */}
        <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            {role === "admin" ? "👥 최근 가입 회원" : "📰 최근 등록 기사"}
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>{role === "admin" ? "3" : "0"}</span>
          </div>
          {role === "admin" ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {recentMembers.map((m, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: i < recentMembers.length - 1 ? `1px solid ${darkMode ? "#333" : "#f3f4f6"}` : "none", fontSize: 13 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: m.roleClass === "realtor" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
          ) : (
            <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" as const, padding: 20 }}>게시된 기사가 없습니다</div>
          )}
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
  );
}
