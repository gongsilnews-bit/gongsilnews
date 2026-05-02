"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminSectionProps } from "./types";
import { SvgIcon, IconBuilding, IconArticle, IconMembers, IconComment } from "./AdminIcons";
import { adminGetDashboardData } from "@/app/admin/actions";

/* ── 유틸리티 함수 ── */
const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

const formatPrice = (type: string, price: string) => {
  return price ? `${type} ${price}` : type;
};

const formatRole = (role: string) => {
  if (role === 'ADMIN' || role === '최고관리자') return { label: '관리자', class: 'admin' };
  if (role === 'REALTOR' || role === '부동산회원') return { label: '부동산', class: 'realtor' };
  return { label: '일반', class: 'general' };
};

type QuickLink = { icon: React.ReactElement; label: string; count: string | number; href: string };

interface DashboardSectionProps extends AdminSectionProps {
  role: "admin" | "realtor" | "user";
  agencyStatus?: string;
  onMenuChange?: (menu: string) => void;
}

export default function DashboardSection({ theme, role, agencyStatus, onMenuChange }: DashboardSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const navigate = (menu: string) => { if (onMenuChange) onMenuChange(menu); };
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ vacanciesCount: 0, membersCount: 0, articlesCount: 0, commentsCount: 0 });
  const [recentVacancies, setRecentVacancies] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (role !== "admin") return; // 현재는 최고관리자용만 지원
    setLoading(true);
    const res = await adminGetDashboardData();
    if (res.success) {
      setStats(res.stats || { vacanciesCount: 0, membersCount: 0, articlesCount: 0, commentsCount: 0 });
      setRecentVacancies(res.recentVacancies || []);
      setRecentMembers(res.recentMembers || []);
      setRecentComments(res.recentComments || []);
      
      const now = new Date();
      setLastUpdated(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }
    setLoading(false);
  }, [role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 더미 데이터 폴백 (권한이 admin이 아니거나 로딩 중일 때 표시할 기본값)
  const kpiCardsAdmin = [
    { icon: "🏢", label: "공실 등록 물건", value: stats.vacanciesCount.toLocaleString(), sub: "전체 등록 공실", color: "#3b82f6", menu: "gongsil" },
    { icon: "👤", label: "전체 회원", value: stats.membersCount.toLocaleString(), sub: "전체 가입 회원", color: "#10b981", menu: "members" },
    { icon: "📰", label: "등록 기사", value: stats.articlesCount.toLocaleString(), sub: "전체 등록 기사", color: "#f59e0b", menu: "article" },
    { icon: "💬", label: "댓글 / 문의", value: stats.commentsCount.toLocaleString(), sub: "전체 댓글 및 문의", color: "#ef4444", menu: "comment" },
  ];

  const quickLinks: QuickLink[] = [
    { icon: <IconBuilding />, label: "공실 관리", count: stats.vacanciesCount, href: "?menu=gongsil" },
    { icon: <IconArticle />, label: "기사 관리", count: stats.articlesCount, href: "?menu=article" },
    ...(role === "admin" ? [{ icon: <IconMembers />, label: "회원 관리", count: stats.membersCount, href: "?menu=members" }] : []),
    { icon: <SvgIcon strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></SvgIcon>, label: "댓글 관리", count: stats.commentsCount, href: "?menu=comment" },
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
      
      {/* 타이틀 */}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
        모니터링 대시보드
        {lastUpdated && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>마지막 갱신: {lastUpdated}</span>}
        <button onClick={fetchData} disabled={loading} style={{ marginLeft: "auto", fontSize: 12, color: textSecondary, background: "none", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
          {loading ? "갱신 중..." : "⟳ 새로고침"}
        </button>
      </h1>

      {/* KPI 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpiCardsAdmin.length}, 1fr)`, gap: 16, marginBottom: 24 }}>
        {kpiCardsAdmin.map((card, i) => (
          <div key={i} onClick={() => navigate(card.menu)} style={{ background: cardBg, borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", borderLeft: `4px solid ${card.color}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.09)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>{card.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{card.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: textPrimary, lineHeight: 1 }}>{loading ? "-" : card.value}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* 중단: 최근 물건 + 최근 회원 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* 최근 등록 공실 물건 */}
        <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div onClick={() => navigate("gongsil")} style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            🏠 최근 등록 공실 물건
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>{recentVacancies.length}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["매매종류", "주소", "금액", "등록일"].map(th => (
                  <th key={th} style={{ textAlign: "left" as const, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#9ca3af", borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>로딩 중...</td></tr>
              ) : recentVacancies.length === 0 ? (
                <tr><td colSpan={4} style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>최근 등록된 데이터가 없습니다.</td></tr>
              ) : (
                recentVacancies.map(v => (
                  <tr key={v.id} onClick={() => navigate("gongsil")} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px", fontWeight: 600, color: textPrimary }}>{v.trade_type}</td>
                    <td style={{ padding: "10px", color: textSecondary }}>{v.address ? v.address.split(' ').slice(0,2).join(' ') : '-'}</td>
                    <td style={{ padding: "10px", color: "#3b82f6", fontWeight: 700 }}>{formatPrice(v.trade_type, v.price)}</td>
                    <td style={{ padding: "10px", color: "#9ca3af", fontSize: 12 }}>{formatTimeAgo(v.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 최근 가입 회원 (admin만) */}
        <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div onClick={() => navigate("members")} style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            👥 최근 가입 회원
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>{recentMembers.length}</span>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {loading ? (
               <li style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>로딩 중...</li>
            ) : recentMembers.length === 0 ? (
               <li style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>가입한 회원이 없습니다.</li>
            ) : (
              recentMembers.map((m, i) => {
                const roleInfo = formatRole(m.role);
                return (
                  <li key={m.id} onClick={() => navigate("members")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: i < recentMembers.length - 1 ? `1px solid ${darkMode ? "#333" : "#f3f4f6"}` : "none", fontSize: 13, cursor: "pointer", borderRadius: 6, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: roleInfo.class === "realtor" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {m.name ? m.name[0] : "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: textPrimary }}>{m.name || '이름없음'}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.email}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: roleInfo.class === "realtor" ? "#dbeafe" : roleInfo.class === "admin" ? "#dbeafe" : "#f3f4f6", color: roleInfo.class === "realtor" ? "#1d4ed8" : roleInfo.class === "admin" ? "#1d4ed8" : "#6b7280" }}>{roleInfo.label}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>{formatTimeAgo(m.created_at)}</span>
                  </li>
                );
              })
            )}
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
              <a key={i} href={ql.href} style={{
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
                {ql.count !== "" && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#3b82f6", background: darkMode ? "#1e3a5f" : "#eff6ff", padding: "2px 8px", borderRadius: 10 }}>{loading ? "-" : ql.count}</span>}
              </a>
            ))}
          </div>
        </div>

        {/* 최근 댓글 / 문의 */}
        <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div onClick={() => navigate("comment")} style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            💬 최근 댓글 / 문의
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>{recentComments.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading ? (
              <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>로딩 중...</div>
            ) : recentComments.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>댓글 없음</div>
            ) : (
              recentComments.map((c, i) => (
                <div key={c.id || i} onClick={() => navigate("comment")} style={{ 
                  display: "flex", flexDirection: "column", gap: 4, 
                  padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                  background: darkMode ? "#2c2d31" : "#f9fafb",
                  border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
                  transition: "background 0.15s",
                }} onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#38393e" : "#eff6ff"} onMouseLeave={e => e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f9fafb"}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.type === 'article' ? '#2563eb' : c.type === 'vacancy' ? '#d97706' : '#7c3aed', background: darkMode ? "rgba(255,255,255,0.06)" : `${c.type === 'article' ? '#2563eb' : c.type === 'vacancy' ? '#d97706' : '#7c3aed'}10`, padding: "2px 6px", borderRadius: 4 }}>
                      {c.type === 'article' ? '기사' : c.type === 'vacancy' ? '공실' : '게시판'}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatTimeAgo(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: textPrimary, fontWeight: 500, lineHeight: 1.4, wordBreak: "break-all" }}>
                    {c.is_secret ? "🔒 비밀 댓글입니다" : (c.content.length > 50 ? c.content.slice(0, 50) + '...' : c.content)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
