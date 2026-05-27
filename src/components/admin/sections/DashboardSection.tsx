"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminSectionProps } from "./types";
import { SvgIcon, IconBuilding, IconArticle, IconMembers, IconComment } from "./AdminIcons";
import { adminGetDashboardData, memberGetDashboardData } from "@/app/admin/actions";

/* ── 유틸리티 함수 ── */
const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
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

type QuickLink = { icon: React.ReactElement; label: string; count: string | number; menu: string };

interface DashboardSectionProps extends AdminSectionProps {
  role: "admin" | "realtor" | "user";
  agencyStatus?: string;
  rejectionReason?: string;
  onMenuChange?: (menu: string) => void;
  memberId?: string;
}

export default function DashboardSection({ theme, role, agencyStatus, rejectionReason, onMenuChange, memberId }: DashboardSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const navigate = (menu: string) => { if (onMenuChange) onMenuChange(menu); };

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ vacanciesCount: 0, onbidCount: 0, membersCount: 0, articlesCount: 0, commentsCount: 0 });
  const [recentVacancies, setRecentVacancies] = useState<any[]>([]);
  const [recentOnbid, setRecentOnbid] = useState<any[]>([]);
  const [activeVacancyTab, setActiveVacancyTab] = useState<"general" | "onbid">("general");
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (role === "admin") {
        const res = await adminGetDashboardData();
        if (res.success) {
          setStats({
            vacanciesCount: res.stats?.vacanciesCount || 0,
            onbidCount: res.stats?.onbidCount || 0,
            membersCount: res.stats?.membersCount || 0,
            articlesCount: res.stats?.articlesCount || 0,
            commentsCount: res.stats?.commentsCount || 0,
          });
          setRecentVacancies(res.recentVacancies || []);
          setRecentOnbid(res.recentOnbid || []);
          setRecentMembers(res.recentMembers || []);
          setRecentComments(res.recentComments || []);
        }
      } else if (memberId) {
        const res = await memberGetDashboardData(memberId);
        if (res.success) {
          setStats({
            vacanciesCount: res.stats?.vacanciesCount || 0,
            onbidCount: 0,
            membersCount: 0,
            articlesCount: res.stats?.articlesCount || 0,
            commentsCount: res.stats?.commentsCount || 0,
          });
          setRecentVacancies(res.recentVacancies || []);
          setRecentOnbid([]);
          setRecentArticles(res.recentArticles || []);
          setRecentComments(res.recentComments || []);
        }
      }
      const now = new Date();
      setLastUpdated(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [role, memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── KPI 카드 구성 (역할에 따라 다르게) ── */
  const kpiCards = role === "admin" ? [
    { icon: "🏢", label: "공실 등록 물건", value: stats.vacanciesCount.toLocaleString(), sub: "중개사 등록 공실", color: "#3b82f6", menu: "gongsil" },
    { icon: "⚖️", label: "온비드 경공매", value: stats.onbidCount.toLocaleString(), sub: "전국 온비드 매물", color: "#2563eb", menu: "gongsil" },
    { icon: "👤", label: "전체 회원", value: stats.membersCount.toLocaleString(), sub: "전체 가입 회원", color: "#10b981", menu: "members" },
    { icon: "📰", label: "등록 기사", value: stats.articlesCount.toLocaleString(), sub: "전체 등록 기사", color: "#f59e0b", menu: "article" },
    { icon: "✉️", label: "접수된 문의", value: stats.commentsCount.toLocaleString(), sub: "전체 접수된 문의", color: "#ef4444", menu: "inquiry" },
  ] : [
    { icon: "🏢", label: "내 공실 물건", value: stats.vacanciesCount.toLocaleString(), sub: "내가 등록한 공실", color: "#3b82f6", menu: "gongsil" },
    { icon: "📰", label: "내 기사", value: stats.articlesCount.toLocaleString(), sub: "내가 작성한 기사", color: "#f59e0b", menu: "article" },
  ];

  const quickLinks: QuickLink[] = [
    { icon: <IconBuilding />, label: "공실 관리", count: stats.vacanciesCount, menu: "gongsil" },
    { icon: <IconArticle />, label: "기사 관리", count: stats.articlesCount, menu: "article" },
    ...(role === "admin" ? [
      { icon: <IconMembers />, label: "회원 관리", count: stats.membersCount, menu: "members" },
      { icon: <SvgIcon strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></SvgIcon>, label: "문의 관리", count: stats.commentsCount, menu: "inquiry" }
    ] : []),
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      {/* 부동산관리자 승인 상태 배너 */}
      {role === "realtor" && agencyStatus === "PENDING" && (
        <div style={{ padding: "16px 20px", marginBottom: 24, borderRadius: 8, background: darkMode ? "#422814" : "#fffbeb", border: `1px solid ${darkMode ? "#78350f" : "#fef08a"}`, display: "flex", gap: 12, alignItems: "flex-start", color: darkMode ? "#fde68a" : "#92400e" }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>현재 서류 검토가 진행 중입니다.</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>제출해주신 중개업소 증빙 서류를 관리자가 검토하고 있습니다. 최종 승인 전까지 일부 기능 사용이 제한될 수 있습니다.</div>
            {rejectionReason && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: darkMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.6)", borderRadius: 6, fontSize: 13, fontWeight: 600, border: `1px dashed ${darkMode ? "#92400e" : "#fcd34d"}`, whiteSpace: "pre-wrap" }}>
                {rejectionReason}
              </div>
            )}
          </div>
        </div>
      )}
      {role === "realtor" && agencyStatus === "REJECTED" && (
        <div style={{ padding: "16px 20px", marginBottom: 24, borderRadius: 10, background: darkMode ? "#451a1a" : "#fef2f2", border: `1.5px solid ${darkMode ? "#7f1d1d" : "#fecaca"}`, color: darkMode ? "#fca5a5" : "#b91c1c" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: rejectionReason ? 12 : 0 }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>서류 보완이 필요합니다</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>제출된 서류가 미비하여 승인이 거절되었습니다. 좌측의 <strong>[정보설정]</strong> 메뉴로 이동하여 정보를 수정한 후 재심사를 신청해 주세요.</div>
            </div>
          </div>
          {rejectionReason && (
            <div style={{ background: darkMode ? "rgba(0,0,0,0.2)" : "#fff", border: `1px solid ${darkMode ? "#7f1d1d" : "#fecaca"}`, borderRadius: 8, padding: "12px 16px", marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? "#fca5a5" : "#b91c1c", marginBottom: 4 }}>📌 반려 사유</div>
              <div style={{ fontSize: 14, color: darkMode ? "#fca5a5" : "#991b1b", lineHeight: 1.6, fontWeight: 600, whiteSpace: "pre-wrap" }}>{rejectionReason}</div>
            </div>
          )}
          <button onClick={() => navigate("settings")} style={{ marginTop: 12, height: 36, padding: "0 16px", background: darkMode ? "#7f1d1d" : "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            📋 서류 수정 및 재심사 신청하기
          </button>
        </div>
      )}
      {role === "realtor" && agencyStatus === "APPROVED" && (
        <div style={{ padding: "14px 20px", marginBottom: 24, borderRadius: 10, background: darkMode ? "#064e3b" : "#ecfdf5", border: `1.5px solid ${darkMode ? "#065f46" : "#a7f3d0"}`, display: "flex", gap: 12, alignItems: "center", color: darkMode ? "#6ee7b7" : "#065f46" }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div style={{ fontWeight: 700, fontSize: 14 }}>부동산회원 정상 승인 완료 — 모든 서비스를 정상적으로 이용할 수 있습니다.</div>
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
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpiCards.length}, 1fr)`, gap: 16, marginBottom: 24 }}>
        {kpiCards.map((card, i) => (
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

      {/* 중단: 최근 물건 + 최근 회원/기사 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* 최근 등록 공실 물건 / 온비드 경공매 */}
        <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div onClick={() => navigate("gongsil")} style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              🏠 {role === "admin" ? "최근 등록 매물 현황" : "내 최근 공실 물건"}
            </div>
            {role === "admin" && (
              <div style={{ display: "flex", background: darkMode ? "#1a1b1e" : "#f1f5f9", borderRadius: 8, padding: 3 }}>
                <button
                  onClick={() => setActiveVacancyTab("general")}
                  style={{
                    padding: "4px 10px", fontSize: 11, fontWeight: 700,
                    background: activeVacancyTab === "general" ? (darkMode ? "#2c2d31" : "#fff") : "transparent",
                    color: activeVacancyTab === "general" ? "#2563eb" : textSecondary,
                    border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                    boxShadow: activeVacancyTab === "general" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  일반 공실 ({recentVacancies.length})
                </button>
                <button
                  onClick={() => setActiveVacancyTab("onbid")}
                  style={{
                    padding: "4px 10px", fontSize: 11, fontWeight: 700,
                    background: activeVacancyTab === "onbid" ? (darkMode ? "#2c2d31" : "#fff") : "transparent",
                    color: activeVacancyTab === "onbid" ? "#2563eb" : textSecondary,
                    border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                    boxShadow: activeVacancyTab === "onbid" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  온비드 경공매 ({recentOnbid.length})
                </button>
              </div>
            )}
          </div>

          {activeVacancyTab === "general" || role !== "admin" ? (
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
                  <tr><td colSpan={4} style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>등록된 공실이 없습니다.</td></tr>
                ) : (
                  recentVacancies.map(v => (
                    <tr key={v.id} onClick={() => navigate("gongsil")} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px", fontWeight: 600, color: textPrimary }}>{v.trade_type}</td>
                      <td style={{ padding: "10px", color: textSecondary }}>{v.address ? v.address.split(' ').slice(0, 2).join(' ') : '-'}</td>
                      <td style={{ padding: "10px", color: "#3b82f6", fontWeight: 700 }}>{formatPrice(v.trade_type, v.price)}</td>
                      <td style={{ padding: "10px", color: "#9ca3af", fontSize: 12 }}>{formatTimeAgo(v.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["구분", "물건명/주소", "최저입찰가", "수집일"].map(th => (
                    <th key={th} style={{ textAlign: "left" as const, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#9ca3af", borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>{th}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>로딩 중...</td></tr>
                ) : recentOnbid.length === 0 ? (
                  <tr><td colSpan={4} style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>수집된 온비드 경공매 매물이 없습니다.</td></tr>
                ) : (
                  recentOnbid.map(v => (
                    <tr key={v.id} onClick={() => navigate("gongsil")} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px", fontWeight: 600, color: textPrimary }}>
                        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "#2563eb1a", color: "#2563eb", fontWeight: 700 }}>공매</span>
                      </td>
                      <td style={{ padding: "10px", color: textSecondary, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.building_name || v.address}>
                        <span style={{ fontWeight: 600, color: textPrimary, display: "block" }}>{v.building_name || "공매 물건"}</span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>{v.address ? v.address.split(' ').slice(0, 3).join(' ') : '-'}</span>
                      </td>
                      <td style={{ padding: "10px", color: "#e11d48", fontWeight: 700 }}>{formatPrice("최저", v.price)}</td>
                      <td style={{ padding: "10px", color: "#9ca3af", fontSize: 12 }}>{formatTimeAgo(v.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* 최근 가입 회원 (admin) or 최근 기사 (realtor/user) */}
        <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div onClick={() => navigate(role === "admin" ? "members" : "article")} style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            {role === "admin" ? "👥 최근 가입 회원" : "📰 내 최근 기사"}
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>{role === "admin" ? recentMembers.length : recentArticles.length}</span>
          </div>

          {role === "admin" ? (
            /* 최고관리자: 최근 가입 회원 리스트 */
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
          ) : (
            /* 부동산/일반: 내 최근 기사 리스트 */
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {loading ? (
                <li style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>로딩 중...</li>
              ) : recentArticles.length === 0 ? (
                <li style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>작성한 기사가 없습니다.</li>
              ) : (
                recentArticles.map((a, i) => (
                  <li key={a.id} onClick={() => navigate("article")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: i < recentArticles.length - 1 ? `1px solid ${darkMode ? "#333" : "#f3f4f6"}` : "none", fontSize: 13, cursor: "pointer", borderRadius: 6, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📰</div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontWeight: 600, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>조회 {a.views || 0}회</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{formatTimeAgo(a.created_at)}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {/* 하단: 바로가기 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        {/* 바로가기 */}
        <div style={{ background: cardBg, borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#374151", margin: "0 0 16px" }}>⚡ 바로가기</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {quickLinks.map((ql, i) => (
              <a key={i} onClick={() => navigate(ql.menu)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", borderRadius: 10, background: darkMode ? "#2c2d31" : "#f9fafb",
                cursor: "pointer", textDecoration: "none", color: darkMode ? "#e1e4e8" : "#374151",
                fontSize: 13, fontWeight: 600, transition: "background 0.2s, transform 0.15s",
                border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#38393e" : "#eff6ff"; e.currentTarget.style.transform = "translateY(-2px)"; }}
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
      </div>
    </div>
  );
}
