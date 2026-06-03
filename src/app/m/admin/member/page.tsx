"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { adminGetMembers, adminApproveRealtorApplication, adminRejectRealtorApplication } from "@/app/admin/actions";

function MobileMemberAdmin() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState("?„ì²´");
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [rejectModalFor, setRejectModalFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("?¬ì—…?ë“±ë¡ì¦??ë¶ˆë¶„ëª…í•©?ˆë‹¤");
  const [customReason, setCustomReason] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    const res = await adminGetMembers();
    if (res.success && res.data) {
      const processedMembers = res.data.map((m: any) => {
        let agencyStatus = null;
        if (m.agencies) agencyStatus = Array.isArray(m.agencies) ? m.agencies[0]?.status : m.agencies.status;
        let computedStatus = m.signup_completed ? '?•ìƒ' : '?¹ì¸?€ê¸?;
        if (m.role === 'REALTOR') {
          if (agencyStatus === 'APPROVED') computedStatus = '?•ìƒ?¹ì¸';
          else if (agencyStatus === 'REJECTED') computedStatus = '?œë¥˜ë³´ì™„';
          else computedStatus = '?¹ì¸?€ê¸?;
        } else {
          computedStatus = '?•ìƒ?¹ì¸'; // ?¼ë°˜?Œì› ë°?ê´€ë¦¬ì??ê¸°ë³¸ ?•ìƒ
        }
        return { ...m, computedStatus, agencyStatus };
      });
      setMembers(processedMembers);
    }
    setLoading(false);
  };

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      if (data && (data.role === 'ADMIN' || data.role === 'SUPER_ADMIN' || data.role === 'ìµœê³ ê´€ë¦¬ì')) {
        await fetchMembers();
        setAuthChecked(true);
      } else {
        alert("?‘ê·¼ ê¶Œí•œ???†ìŠµ?ˆë‹¤.");
        router.push("/m");
      }
    }
    init();
  }, [router]);

  const filtered = members.filter(m => {
    if (m.is_deleted) return false;
    
    // Role filter (using computed roles for tabs)
    if (filter === "ìµœê³ ê´€ë¦¬ì" && m.role !== "ADMIN") return false;
    if (filter === "ë¶€?™ì‚°?Œì›" && m.role !== "REALTOR") return false;
    if (filter === "?¼ë°˜?Œì›" && m.role !== "USER") return false;
    if (filter === "?¹ì¸?€ê¸? && m.computedStatus !== "?¹ì¸?€ê¸?) return false;
    if (filter === "?œë¥˜ë³´ì™„" && m.computedStatus !== "?œë¥˜ë³´ì™„") return false;
    
    // Keyword search
    if (activeKeyword) {
      const k = activeKeyword.toLowerCase();
      if (
        !(m.name && m.name.toLowerCase().includes(k)) && 
        !(m.email && m.email.toLowerCase().includes(k)) &&
        !(m.phone && m.phone.includes(k)) &&
        !(m.memberNumber && m.memberNumber.toString().includes(k)) &&
        !(m.id && String(m.id).includes(k))
      ) return false;
    }
    return true;
  });

  const getRoleLabel = (role: string) => {
    if (role === 'ADMIN') return 'ìµœê³ ê´€ë¦¬ì';
    if (role === 'REALTOR') return 'ë¶€?™ì‚°?Œì›';
    return '?¼ë°˜?Œì›';
  };

  const getRoleColor = (role: string) => {
    if (role === 'ADMIN') return { bg: "#111827", text: "#fff" };
    if (role === 'REALTOR') return { bg: "#2563eb", text: "#fff" };
    return { bg: "#e5e7eb", text: "#374151" };
  };

  const statusInfo: Record<string, { bg: string; color: string; label: string }> = {
    "?¹ì¸?€ê¸?: { bg: "#fef3c7", color: "#92400e", label: "?¹ì¸?€ê¸? },
    "?•ìƒ?¹ì¸": { bg: "#d1fae5", color: "#065f46", label: "?•ìƒ?¹ì¸" },
    "?œë¥˜ë³´ì™„": { bg: "#fee2e2", color: "#b91c1c", label: "?œë¥˜ë³´ì™„" },
  };

  const tabs = [
    { key: "?„ì²´", count: members.filter(m => !m.is_deleted).length },
    { key: "?¹ì¸?€ê¸?, count: members.filter(m => !m.is_deleted && m.computedStatus === "?¹ì¸?€ê¸?).length },
    { key: "?œë¥˜ë³´ì™„", count: members.filter(m => !m.is_deleted && m.computedStatus === "?œë¥˜ë³´ì™„").length },
    { key: "ìµœê³ ê´€ë¦¬ì", count: members.filter(m => !m.is_deleted && m.role === "ADMIN").length },
    { key: "ë¶€?™ì‚°?Œì›", count: members.filter(m => !m.is_deleted && m.role === "REALTOR").length },
    { key: "?¼ë°˜?Œì›", count: members.filter(m => !m.is_deleted && m.role === "USER").length },
  ];

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>?”</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>ê¶Œí•œ???•ì¸?˜ê³  ?ˆìŠµ?ˆë‹¤...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ?ë‹¨ ?¤ë” */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>?Œì›ê´€ë¦?/h1>
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      {/* ê²€???ì—­ */}
      {searchOpen && (
        <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setActiveKeyword(searchKeyword); setFilter("?„ì²´"); } }}
            placeholder="?´ë¦„, ?´ë©”???ëŠ” ?Œì›ë²ˆí˜¸ ê²€??
            style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
          <button onClick={() => { setActiveKeyword(searchKeyword); setFilter("?„ì²´"); }} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>ê²€??/button>
          {activeKeyword && (
            <button onClick={() => { setSearchKeyword(""); setActiveKeyword(""); }} style={{ height: 40, padding: "0 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>ì´ˆê¸°??/button>
          )}
        </div>
      )}

      {/* ?„í„° ??*/}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 12px", display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setActiveKeyword(""); setSearchKeyword(""); }}
            style={{
              flexShrink: 0, border: "none", background: "none", padding: "14px 14px", fontSize: 14,
              fontWeight: filter === tab.key ? 800 : 500,
              color: filter === tab.key ? "#3b82f6" : "#6b7280",
              borderBottom: filter === tab.key ? "3px solid #3b82f6" : "3px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {tab.key}
            <span style={{
              background: tab.key === "?„ì²´" ? "#e5e7eb" : tab.key === "?¹ì¸?€ê¸? ? "#fef3c7" : tab.key === "?œë¥˜ë³´ì™„" ? "#fee2e2" : "#dbeafe",
              color: tab.key === "?„ì²´" ? "#4b5563" : tab.key === "?¹ì¸?€ê¸? ? "#92400e" : tab.key === "?œë¥˜ë³´ì™„" ? "#b91c1c" : "#1e40af",
              padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ?”ì•½ ?„í™© ì¹´ë“œ (?„ì²´ ??—?œë§Œ ë³´ì„) */}
      {filter === "?„ì²´" && !activeKeyword && (
        <div style={{ padding: "16px 16px 8px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>ìµœê³ ê´€ë¦¬ì</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{tabs.find(t => t.key === "ìµœê³ ê´€ë¦¬ì")?.count || 0}</div>
            </div>
            <div style={{ width: 1, background: "#e5e7eb", margin: "0 10px" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>ë¶€?™ì‚°?Œì›</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb" }}>{tabs.find(t => t.key === "ë¶€?™ì‚°?Œì›")?.count || 0}</div>
            </div>
            <div style={{ width: 1, background: "#e5e7eb", margin: "0 10px" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>?¼ë°˜?Œì›</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{tabs.find(t => t.key === "?¼ë°˜?Œì›")?.count || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* ?Œì› ì¹´ë“œ ë¦¬ìŠ¤??*/}
      <div style={{ padding: "8px 16px 40px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>?‘¥</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>ì¡°ê±´??ë§ëŠ” ?Œì›???†ìŠµ?ˆë‹¤.</div>
          </div>
        ) : filtered.map((member, idx) => {
          const roleLabel = getRoleLabel(member.role);
          const roleColor = getRoleColor(member.role);
          const st = statusInfo[member.computedStatus] || { bg: "#e5e7eb", color: "#374151", label: member.computedStatus };
          const dateStr = member.created_at ? new Date(member.created_at).toLocaleDateString('ko-KR') : "-";
          
          return (
            <div key={member.id || idx} style={{
              background: "#fff", borderRadius: 12, padding: "16px", marginBottom: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0",
            }}>
              {/* ?ë‹¨: ??•  ë±ƒì? & ?íƒœ ë±ƒì? */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: roleColor.bg, color: roleColor.text, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {roleLabel}
                  </span>
                  {member.role === 'REALTOR' && (
                    <span style={{ background: st.bg, color: st.color, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      {st.label}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{dateStr} ê°€??/span>
              </div>

              {/* ê¸°ë³¸ ?•ë³´ */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{member.name || '?´ë¦„?†ìŒ'}</span>
                  {member.memberNumber && <span style={{ fontSize: 12, color: "#6b7280" }}>#{member.memberNumber}</span>}
                </div>
                <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 2 }}>{member.email}</div>
                <div style={{ fontSize: 14, color: "#4b5563" }}>{member.phone || '-'}</div>
              </div>

              {/* ?¡ì…˜ ë²„íŠ¼ */}
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                {member.role === 'REALTOR' && (member.computedStatus === '?¹ì¸?€ê¸? || member.computedStatus === '?œë¥˜ë³´ì™„') && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => {
                      if (!confirm(`${member.name} ?Œì›??ë¶€?™ì‚°?Œì›?¼ë¡œ ?¹ì¸?˜ì‹œê² ìŠµ?ˆê¹Œ?`)) return;
                      const res = await adminApproveRealtorApplication(member.id);
                      if (res.success) { alert('???¹ì¸ ?„ë£Œ!'); fetchMembers(); }
                      else alert('?¹ì¸ ?¤íŒ¨: ' + res.error);
                    }} style={{ flex: 1, height: 38, background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      ???¹ì¸
                    </button>
                    <button onClick={() => setRejectModalFor(member.id)} style={{ flex: 1, height: 38, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      ??ë°˜ë ¤
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => router.push(`/m/admin/member/write?id=${member.id}`)}
                  style={{ width: "100%", height: 38, background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  ?ì„¸ë³´ê¸° ë°?ì²˜ë¦¬
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ë°˜ë ¤ ?¬ìœ  ëª¨ë‹¬ */}
      {rejectModalFor && (
        <div onClick={() => setRejectModalFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 20px 36px", width: "100%", maxWidth: 448, animation: "slideUp 0.25s ease" }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db", margin: "0 auto 20px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: "0 0 16px" }}>ë°˜ë ¤ ?¬ìœ  ? íƒ</h3>
            <select value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); if (e.target.value !== 'ê¸°í?') setCustomReason(''); }} style={{ width: "100%", height: 46, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 15, outline: "none", marginBottom: 12, background: "#fff", color: "#111", boxSizing: "border-box" }}>
              <option value="?¬ì—…?ë“±ë¡ì¦??ë¶ˆë¶„ëª…í•©?ˆë‹¤">?¬ì—…?ë“±ë¡ì¦??ë¶ˆë¶„ëª…í•©?ˆë‹¤</option>
              <option value="ì¤‘ê°œ?…ë“±ë¡ì¦???„ë½?˜ì—ˆ?µë‹ˆ??>ì¤‘ê°œ?…ë“±ë¡ì¦???„ë½?˜ì—ˆ?µë‹ˆ??/option>
              <option value="?œë¥˜ ?•ë³´ê°€ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤">?œë¥˜ ?•ë³´ê°€ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤</option>
              <option value="?„ìˆ˜ ?•ë³´ê°€ ë¯¸ì…???˜ì—ˆ?µë‹ˆ??>?„ìˆ˜ ?•ë³´ê°€ ë¯¸ì…???˜ì—ˆ?µë‹ˆ??/option>
              <option value="ê¸°í?">ê¸°í? (ì§ì ‘ ?…ë ¥)</option>
            </select>
            {rejectReason === 'ê¸°í?' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="ë°˜ë ¤ ?¬ìœ ë¥?ì§ì ‘ ?…ë ¥?´ì£¼?¸ìš”..."
                style={{ width: "100%", height: 80, padding: 14, border: "1px solid #d1d5db", borderRadius: 10, fontSize: 15, outline: "none", marginBottom: 12, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setRejectModalFor(null)} style={{ flex: 1, height: 48, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>ì·¨ì†Œ</button>
              <button onClick={async () => {
                const finalReason = rejectReason === 'ê¸°í?' ? (customReason.trim() || 'ê¸°í? ?¬ìœ ') : rejectReason;
                const res = await adminRejectRealtorApplication(rejectModalFor, finalReason);
                if (res.success) { alert('ë°˜ë ¤ ì²˜ë¦¬ ?„ë£Œ'); fetchMembers(); setRejectModalFor(null); setRejectReason('?¬ì—…?ë“±ë¡ì¦??ë¶ˆë¶„ëª…í•©?ˆë‹¤'); setCustomReason(''); }
                else alert('ë°˜ë ¤ ?¤íŒ¨: ' + res.error);
              }} style={{ flex: 1, height: 48, background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>ë°˜ë ¤ ?•ì •</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobileMemberAdminPage() {
  return (
    <Suspense fallback={null}>
      <MobileMemberAdmin />
    </Suspense>
  );
}
