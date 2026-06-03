"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { adminGetDashboardData, memberGetDashboardData } from "@/app/admin/actions";

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ë°©ê¸ˆ ??;
  if (minutes < 60) return `${minutes}ë¶???;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}?œê°„ ??;
  return `${Math.floor(hours / 24)}????;
};

const formatRole = (role: string) => {
  if (role === "ADMIN" || role === "ìµœê³ ê´€ë¦¬ì") return { label: "ê´€ë¦¬ì", bg: "#dbeafe", color: "#1d4ed8" };
  if (role === "REALTOR" || role === "ë¶€?™ì‚°?Œì›") return { label: "ë¶€?™ì‚°", bg: "#fef3c7", color: "#92400e" };
  return { label: "?¼ë°˜", bg: "#f3f4f6", color: "#6b7280" };
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
        alert("?Œì› ?•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.");
        router.push("/m");
        return;
      }
      
      let currentRole: "admin" | "realtor" | "user" = "user";
      if (["ADMIN", "SUPER_ADMIN", "ìµœê³ ê´€ë¦¬ì"].includes(data.role)) currentRole = "admin";
      else if (["REALTOR", "ë¶€?™ì‚°?Œì›"].includes(data.role)) currentRole = "realtor";

      // ë¶€?™ì‚°?Œì›??ê²½ìš° agency ?íƒœ ì¡°íšŒ
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
          <div style={{ fontSize: 36, marginBottom: 12 }}>?“Š</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>?€?œë³´?œë? ì¤€ë¹?ì¤?..</div>
        </div>
      </div>
    );
  }

  const kpiCards = role === "admin" ? [
    { icon: "?¢", label: "ê³µì‹¤", value: stats.vacanciesCount, color: "#3b82f6", href: "/m/admin/vacancy" },
    { icon: "?‘¤", label: "?Œì›", value: stats.membersCount, color: "#10b981", href: "/m/admin/member" },
    { icon: "?“°", label: "ê¸°ì‚¬", value: stats.articlesCount, color: "#f59e0b", href: "/m/admin/article" },
    { icon: "?‰ï¸", label: "ë¬¸ì˜", value: stats.commentsCount, color: "#ef4444", href: "/m/admin/inquiry" },
  ] : [
    { icon: "?¢", label: "??ê³µì‹¤", value: stats.vacanciesCount, color: "#3b82f6", href: "/m/admin/vacancy" },
    { icon: "?“°", label: "??ê¸°ì‚¬", value: stats.articlesCount, color: "#f59e0b", href: "/m/admin/article" },
  ];

  const quickLinks = [
    { icon: "?¢", label: "ê³µì‹¤ê´€ë¦?, href: "/m/admin/vacancy", roles: ["admin", "realtor", "user"] },
    { icon: "?“", label: "ê¸°ì‚¬ê´€ë¦?, href: "/m/admin/article", roles: ["admin", "realtor", "user"] },
    { icon: "?‘¥", label: "?Œì›ê´€ë¦?, href: "/m/admin/member", roles: ["admin"] },
    { icon: "?‘¥", label: "ê³ ê°/ë¬¸ì˜", href: "/m/admin/customer", roles: ["realtor"] },
    { icon: (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', fontSize: '13px', fontWeight: 900, boxShadow: '0 2px 4px rgba(245, 158, 11, 0.4)', fontFamily: 'system-ui, sans-serif' }}>
        G
      </div>
    ), label: "?¬ì¸??, href: "/m/admin/point", roles: ["admin", "realtor", "user"] },
    { icon: "?–¼ï¸?, label: "ë°°ë„ˆê´€ë¦?, href: "/m/admin/banner", roles: ["admin"] },
    { icon: "?“‹", label: "ê²Œì‹œ?ê?ë¦?, href: "/m/admin/board", roles: ["admin"] },
    { icon: "?‰ï¸", label: "ë¬¸ì˜ê´€ë¦?, href: "/m/admin/inquiry", roles: ["admin"] },
    { icon: "?Œ", label: "?ˆí˜?´ì?", href: "/realty_admin?menu=homepage", roles: ["realtor"] },
    { icon: "?™ï¸", label: "?¤ì •", href: "/m/admin/settings", roles: ["admin", "realtor", "user"] },
  ].filter(link => link.roles.includes(role));

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ?¤ë” */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>?“Š ?€?œë³´??/h1>
        </div>
        <button onClick={async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await fetchData(role, user.id);
        }} disabled={loading} style={{ height: 34, padding: "0 12px", background: "none", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
          {loading ? "ê°±ì‹ ì¤?.." : "???ˆë¡œê³ ì¹¨"}
        </button>
      </div>

      {/* ë¶€?™ì‚°?Œì› ?¹ì¸ ?íƒœ ë°°ë„ˆ */}
      {role === "realtor" && agencyStatus === "PENDING" && (
        <div style={{ margin: "12px 16px 0", padding: "14px 16px", borderRadius: 12, background: "#fffbeb", border: "1.5px solid #fde68a", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>??/span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#92400e", marginBottom: 4 }}>?„ì¬ ?œë¥˜ ê²€? ê? ì§„í–‰ ì¤‘ì…?ˆë‹¤</div>
            <div style={{ fontSize: 12, color: "#a16207", lineHeight: 1.5 }}>?œì¶œ?´ì£¼??ì¤‘ê°œ?…ì†Œ ì¦ë¹™ ?œë¥˜ë¥?ê´€ë¦¬ìê°€ ê²€? í•˜ê³??ˆìŠµ?ˆë‹¤. ìµœì¢… ?¹ì¸ ?„ê¹Œì§€ ?¼ë? ê¸°ëŠ¥ ?¬ìš©???œí•œ?????ˆìŠµ?ˆë‹¤.</div>
          </div>
        </div>
      )}
      {role === "realtor" && agencyStatus === "REJECTED" && (
        <div style={{ margin: "12px 16px 0", padding: "14px 16px", borderRadius: 12, background: "#fef2f2", border: "1.5px solid #fecaca" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: rejectReason ? 10 : 0 }}>
            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>?š¨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#b91c1c", marginBottom: 4 }}>?œë¥˜ ë³´ì™„???„ìš”?©ë‹ˆ??/div>
              <div style={{ fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>?œì¶œ???œë¥˜ê°€ ë¯¸ë¹„?˜ì—¬ ?¹ì¸??ê±°ì ˆ?˜ì—ˆ?µë‹ˆ?? ?„ë˜ ë°˜ë ¤ ?¬ìœ ë¥??•ì¸?˜ê³  ?•ë³´ë¥??˜ì •?????¬ì‹¬?¬ë? ? ì²­??ì£¼ì„¸??</div>
            </div>
          </div>
          {rejectReason && (
            <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>?“Œ ë°˜ë ¤ ?¬ìœ </div>
              <div style={{ fontSize: 13, color: "#991b1b", lineHeight: 1.5, fontWeight: 600, whiteSpace: "pre-wrap" }}>{rejectReason}</div>
            </div>
          )}
          <button
            onClick={() => router.push("/m/admin/settings?tab=agency")}
            style={{ width: "100%", marginTop: 10, height: 42, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
          >
            ?“‹ ?œë¥˜ ?˜ì • ë°??¬ì‹¬??? ì²­?˜ê¸°
          </button>
        </div>
      )}
      {role === "realtor" && agencyStatus === "APPROVED" && (
        <div style={{ margin: "12px 16px 0", padding: "10px 16px", borderRadius: 12, background: "#ecfdf5", border: "1.5px solid #a7f3d0", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>??/span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#065f46" }}>ë¶€?™ì‚°?Œì› ?•ìƒ ?¹ì¸ ?„ë£Œ</span>
        </div>
      )}

      {/* ë§ˆì?ë§?ê°±ì‹  */}
      {lastUpdated && (
        <div style={{ padding: "8px 16px", fontSize: 11, color: "#9ca3af", textAlign: "right" }}>
          ë§ˆì?ë§?ê°±ì‹ : {lastUpdated}
        </div>
      )}

      {/* KPI ì¹´ë“œ */}
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
        {/* ìµœê·¼ ?±ë¡ ê³µì‹¤ */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 }}>
          <div onClick={() => router.push("/m/admin/vacancy")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, cursor: "pointer" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>
              ?  {role === "admin" ? "ìµœê·¼ ê³µì‹¤" : "??ìµœê·¼ ê³µì‹¤"}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "#eff6ff", color: "#3b82f6", fontWeight: 700 }}>{recentVacancies.length}</span>
            </div>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>?„ì²´ë³´ê¸° ??/span>
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>ë¡œë”© ì¤?..</div>
          ) : recentVacancies.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>?±ë¡??ê³µì‹¤???†ìŠµ?ˆë‹¤.</div>
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

        {/* ìµœê·¼ ê°€???Œì› or ìµœê·¼ ê¸°ì‚¬ */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 }}>
          <div onClick={() => router.push(role === "admin" ? "/m/admin/member" : "/m/admin/article")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, cursor: "pointer" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>
              {role === "admin" ? "?‘¥ ìµœê·¼ ê°€???Œì›" : "?“° ??ìµœê·¼ ê¸°ì‚¬"}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "#ecfdf5", color: "#10b981", fontWeight: 700 }}>{role === "admin" ? recentMembers.length : recentArticles.length}</span>
            </div>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>?„ì²´ë³´ê¸° ??/span>
          </div>
          
          {role === "admin" ? (
            loading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>ë¡œë”© ì¤?..</div>
            ) : recentMembers.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>ê°€?…í•œ ?Œì›???†ìŠµ?ˆë‹¤.</div>
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
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{m.name || "?´ë¦„?†ìŒ"}</div>
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
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>ë¡œë”© ì¤?..</div>
            ) : recentArticles.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>?‘ì„±??ê¸°ì‚¬ê°€ ?†ìŠµ?ˆë‹¤.</div>
            ) : (
              recentArticles.map((a, i) => (
                <div key={a.id} onClick={() => router.push("/m/admin/article")}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid #f3f4f6" : "none", cursor: "pointer" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>?“°</div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>ì¡°íšŒ {a.views || 0}??/div>
                  </div>
                  <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{formatTimeAgo(a.created_at)}</span>
                </div>
              ))
            )
          )}
        </div>

        {/* ??ë©”ë‰´ */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 12 }}>??ë°”ë¡œê°€ê¸?/div>
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
