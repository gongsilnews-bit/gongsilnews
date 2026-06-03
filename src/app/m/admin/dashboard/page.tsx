"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { adminGetDashboardData, memberGetDashboardData } from "@/app/admin/actions";

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

const formatRole = (role: string) => {
  if (role === "ADMIN" || role === "최고관리자") return { label: "관리자", bg: "#dbeafe", color: "#1d4ed8" };
  if (role === "REALTOR" || role === "부동산회원") return { label: "부동산", bg: "#fef3c7", color: "#92400e" };
  return { label: "일반", bg: "#f3f4f6", color: "#6b7280" };
};

function MobileDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState<"admin" | "realtor" | "user">("user");
  const [stats, setStats] = useState({ vacanciesCount: 0, membersCount: 0, articlesCount: 0, commentsCount: 0 });
  const [recentVacancies, setRecentVacancies] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [agencyStatus, setAgencyStatus] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  const fetchData = useCallback(async (currentRole: string, memberId: string) => {
    setLoading(true);
    try {
      if (currentRole === "admin") {
        const res = await adminGetDashboardData();
        if (res.success) {
          setStats({
            vacanciesCount: res.stats?.vacanciesCount || 0,
            membersCount: res.stats?.membersCount || 0,
            articlesCount: res.stats?.articlesCount || 0,
            commentsCount: res.stats?.commentsCount || 0,
          });
          setRecentVacancies(res.recentVacancies || []);
          setRecentMembers(res.recentMembers || []);
          setRecentComments(res.recentComments || []);
        }
      } else {
        const res = await memberGetDashboardData(memberId);
        if (res.success) {
          setStats({
            vacanciesCount: res.stats?.vacanciesCount || 0,
            membersCount: 0,
            articlesCount: res.stats?.articlesCount || 0,
            commentsCount: res.stats?.commentsCount || 0,
          });
          setRecentVacancies(res.recentVacancies || []);
          setRecentArticles(res.recentArticles || []);
          setRecentComments(res.recentComments || []);
        }
      }
      const now = new Date();
      setLastUpdated(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      if (!data) {
        alert("회원 정보를 찾을 수 없습니다.");
        router.push("/m");
        return;
      }
      
      let currentRole: "admin" | "realtor" | "user" = "user";
      if (["ADMIN", "SUPER_ADMIN", "최고관리자"].includes(data.role)) currentRole = "admin";
      else if (["REALTOR", "부동산회원"].includes(data.role)) currentRole = "realtor";

      // 부동산회원인 경우 agency 상태 조회
      if (currentRole === "realtor") {
        const { data: agency } = await supabase
          .from("agencies")
          .select("status, reject_reason")
          .eq("owner_id", user.id)
          .single();
        if (agency) {
          setAgencyStatus(agency.status);
          setRejectReason(agency.reject_reason || null);
        }
      }
      
      setRole(currentRole);
      setAuthChecked(true);
      await fetchData(currentRole, user.id);
    })();
  }, [fetchData, router]);

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>대시보드를 준비 중...</div>
        </div>
      </div>
    );
  }

  const kpiCards = role === "admin" ? [
    { icon: "🏢", label: "공실", value: stats.vacanciesCount, color: "#3b82f6", href: "/m/admin/vacancy" },
    { icon: "👤", label: "회원", value: stats.membersCount, color: "#10b981", href: "/m/admin/member" },
    { icon: "📰", label: "기사", value: stats.articlesCount, color: "#f59e0b", href: "/m/admin/article" },
    { icon: "✉️", label: "문의", value: stats.commentsCount, color: "#ef4444", href: "/m/admin/inquiry" },
  ] : [
    { icon: "🏢", label: "내 공실", value: stats.vacanciesCount, color: "#3b82f6", href: "/m/admin/vacancy" },
    { icon: "📰", label: "내 기사", value: stats.articlesCount, color: "#f59e0b", href: "/m/admin/article" },
  ];

  const quickLinks = [
    { icon: "🏢", label: "공실관리", href: "/m/admin/vacancy", roles: ["admin", "realtor", "user"] },
    { icon: "📝", label: "기사관리", href: "/m/admin/article", roles: ["admin", "realtor", "user"] },
    { icon: "👥", label: "회원관리", href: "/m/admin/member", roles: ["admin"] },
    { icon: "👥", label: "고객/문의", href: "/m/admin/customer", roles: ["realtor"] },
    { icon: (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', fontSize: '13px', fontWeight: 900, boxShadow: '0 2px 4px rgba(245, 158, 11, 0.4)', fontFamily: 'system-ui, sans-serif' }}>
        G
      </div>
    ), label: "포인트", href: "/m/admin/point", roles: ["admin", "realtor", "user"] },
    { icon: "🖼️", label: "배너관리", href: "/m/admin/banner", roles: ["admin"] },
    { icon: "📋", label: "게시판관리", href: "/m/admin/board", roles: ["admin"] },
    { icon: "✉️", label: "문의관리", href: "/m/admin/inquiry", roles: ["admin"] },
    { icon: "🌐", label: "홈페이지", href: "/realty_admin?menu=homepage", roles: ["realtor"] },
    { icon: "⚙️", label: "설정", href: "/m/admin/settings", roles: ["admin", "realtor", "user"] },
  ].filter(link => link.roles.includes(role));

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.push("/m?menu=open")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>📊 대시보드</h1>
        </div>
        <button onClick={async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await fetchData(role, user.id);
        }} disabled={loading} style={{ height: 34, padding: "0 12px", background: "none", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
          {loading ? "갱신중..." : "⟳ 새로고침"}
        </button>
      </div>

      {/* 부동산회원 승인 상태 배너 */}
      {role === "realtor" && agencyStatus === "PENDING" && (
        <div style={{ margin: "12px 16px 0", padding: "14px 16px", borderRadius: 12, background: "#fffbeb", border: "1.5px solid #fde68a", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#92400e", marginBottom: 4 }}>현재 서류 검토가 진행 중입니다</div>
            <div style={{ fontSize: 12, color: "#a16207", lineHeight: 1.5 }}>제출해주신 중개업소 증빙 서류를 관리자가 검토하고 있습니다. 최종 승인 전까지 일부 기능 사용이 제한될 수 있습니다.</div>
          </div>
        </div>
      )}
      {role === "realtor" && agencyStatus === "REJECTED" && (
        <div style={{ margin: "12px 16px 0", padding: "14px 16px", borderRadius: 12, background: "#fef2f2", border: "1.5px solid #fecaca" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: rejectReason ? 10 : 0 }}>
            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#b91c1c", marginBottom: 4 }}>서류 보완이 필요합니다</div>
              <div style={{ fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>제출된 서류가 미비하여 승인이 거절되었습니다. 아래 반려 사유를 확인하고 정보를 수정한 후 재심사를 신청해 주세요.</div>
            </div>
          </div>
          {rejectReason && (
            <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>📌 반려 사유</div>
              <div style={{ fontSize: 13, color: "#991b1b", lineHeight: 1.5, fontWeight: 600, whiteSpace: "pre-wrap" }}>{rejectReason}</div>
            </div>
          )}
          <button
            onClick={() => router.push("/m/admin/settings?tab=agency")}
            style={{ width: "100%", marginTop: 10, height: 42, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
          >
            📋 서류 수정 및 재심사 신청하기
          </button>
        </div>
      )}
      {role === "realtor" && agencyStatus === "APPROVED" && (
        <div style={{ margin: "12px 16px 0", padding: "10px 16px", borderRadius: 12, background: "#ecfdf5", border: "1.5px solid #a7f3d0", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#065f46" }}>부동산회원 정상 승인 완료</span>
        </div>
      )}

      {/* 마지막 갱신 */}
      {lastUpdated && (
        <div style={{ padding: "8px 16px", fontSize: 11, color: "#9ca3af", textAlign: "right" }}>
          마지막 갱신: {lastUpdated}
        </div>
      )}

      {/* KPI 카드 */}
      <div style={{ padding: "8px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {kpiCards.map((card, i) => (
          <div key={i} onClick={() => router.push(card.href)}
            style={{
              background: "#fff", borderRadius: 14, padding: "16px 14px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              borderLeft: `4px solid ${card.color}`,
              cursor: "pointer", transition: "transform 0.15s",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 22 }}>{card.icon}</span>
              {role === "admin" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>}
            </div>
            <div style={{ fontSize: role === "admin" ? 28 : 22, fontWeight: 800, color: "#111", lineHeight: 1.1, marginTop: 4 }}>
              {loading ? "-" : card.value.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 16px 120px" }}>
        {/* 최근 등록 공실 */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 }}>
          <div onClick={() => router.push("/m/admin/vacancy")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, cursor: "pointer" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>
              🏠 {role === "admin" ? "최근 공실" : "내 최근 공실"}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "#eff6ff", color: "#3b82f6", fontWeight: 700 }}>{recentVacancies.length}</span>
            </div>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>전체보기 →</span>
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>로딩 중...</div>
          ) : recentVacancies.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>등록된 공실이 없습니다.</div>
          ) : (
            recentVacancies.map((v, i) => (
              <div key={v.id} onClick={() => router.push("/m/admin/vacancy")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: i > 0 ? "1px solid #f3f4f6" : "none", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", background: "#eff6ff", padding: "3px 8px", borderRadius: 6 }}>{v.trade_type}</span>
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{v.address ? v.address.split(" ").slice(0, 2).join(" ") : "-"}</span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatTimeAgo(v.created_at)}</span>
              </div>
            ))
          )}
        </div>

        {/* 최근 가입 회원 or 최근 기사 */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 }}>
          <div onClick={() => router.push(role === "admin" ? "/m/admin/member" : "/m/admin/article")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, cursor: "pointer" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>
              {role === "admin" ? "👥 최근 가입 회원" : "📰 내 최근 기사"}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "#ecfdf5", color: "#10b981", fontWeight: 700 }}>{role === "admin" ? recentMembers.length : recentArticles.length}</span>
            </div>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>전체보기 →</span>
          </div>
          
          {role === "admin" ? (
            loading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>로딩 중...</div>
            ) : recentMembers.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>가입한 회원이 없습니다.</div>
            ) : (
              recentMembers.map((m, i) => {
                const roleInfo = formatRole(m.role);
                return (
                  <div key={m.id} onClick={() => router.push("/m/admin/member")}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid #f3f4f6" : "none", cursor: "pointer" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: roleInfo.color === "#1d4ed8" ? "linear-gradient(135deg, #3b82f6, #6366f1)" : roleInfo.color === "#92400e" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #9ca3af, #6b7280)", color: "#fff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {m.name ? m.name[0] : "?"}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{m.name || "이름없음"}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: roleInfo.bg, color: roleInfo.color, flexShrink: 0 }}>{roleInfo.label}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{formatTimeAgo(m.created_at)}</span>
                  </div>
                );
              })
            )
          ) : (
            loading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>로딩 중...</div>
            ) : recentArticles.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>작성한 기사가 없습니다.</div>
            ) : (
              recentArticles.map((a, i) => (
                <div key={a.id} onClick={() => router.push("/m/admin/article")}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid #f3f4f6" : "none", cursor: "pointer" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📰</div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>조회 {a.views || 0}회</div>
                  </div>
                  <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{formatTimeAgo(a.created_at)}</span>
                </div>
              ))
            )
          )}
        </div>

        {/* 퀵 메뉴 */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 12 }}>⚡ 바로가기</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {quickLinks.map((item, i) => (
              <div key={i} onClick={() => router.push(item.href)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 10px", borderRadius: 10,
                  background: "#f9fafb", border: "1px solid #e5e7eb",
                  cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151",
                }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MobileDashboardPage() {
  return (
    <Suspense fallback={null}>
      <MobileDashboard />
    </Suspense>
  );
}
