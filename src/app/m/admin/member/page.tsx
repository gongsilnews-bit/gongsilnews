"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { adminGetMembers, adminUpdateAgency, adminUpdateMember } from "@/app/admin/actions";

function MobileMemberAdmin() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    const res = await adminGetMembers();
    if (res.success && res.data) {
      const processedMembers = res.data.map((m: any) => {
        let agencyStatus = null;
        if (m.agencies) agencyStatus = Array.isArray(m.agencies) ? m.agencies[0]?.status : m.agencies.status;
        let computedStatus = m.signup_completed ? '정상' : '승인대기';
        if (m.role === 'REALTOR') {
          if (agencyStatus === 'APPROVED') computedStatus = '정상승인';
          else if (agencyStatus === 'REJECTED') computedStatus = '서류보완';
          else computedStatus = '승인대기';
        } else {
          computedStatus = '정상승인'; // 일반회원 및 관리자는 기본 정상
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
      if (data && (data.role === 'ADMIN' || data.role === 'SUPER_ADMIN' || data.role === '최고관리자')) {
        await fetchMembers();
        setAuthChecked(true);
      } else {
        alert("접근 권한이 없습니다.");
        router.push("/m");
      }
    }
    init();
  }, [router]);

  const filtered = members.filter(m => {
    if (m.is_deleted) return false;
    
    // Role filter (using computed roles for tabs)
    if (filter === "최고관리자" && m.role !== "ADMIN") return false;
    if (filter === "부동산회원" && m.role !== "REALTOR") return false;
    if (filter === "일반회원" && m.role !== "USER") return false;
    if (filter === "승인대기" && m.computedStatus !== "승인대기") return false;
    
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
    if (role === 'ADMIN') return '최고관리자';
    if (role === 'REALTOR') return '부동산회원';
    return '일반회원';
  };

  const getRoleColor = (role: string) => {
    if (role === 'ADMIN') return { bg: "#111827", text: "#fff" };
    if (role === 'REALTOR') return { bg: "#2563eb", text: "#fff" };
    return { bg: "#e5e7eb", text: "#374151" };
  };

  const statusInfo: Record<string, { bg: string; color: string; label: string }> = {
    "승인대기": { bg: "#fef3c7", color: "#92400e", label: "승인대기" },
    "정상승인": { bg: "#d1fae5", color: "#065f46", label: "정상승인" },
    "서류보완": { bg: "#fee2e2", color: "#b91c1c", label: "서류보완" },
  };

  const tabs = [
    { key: "전체", count: members.filter(m => !m.is_deleted).length },
    { key: "승인대기", count: members.filter(m => !m.is_deleted && m.computedStatus === "승인대기").length },
    { key: "최고관리자", count: members.filter(m => !m.is_deleted && m.role === "ADMIN").length },
    { key: "부동산회원", count: members.filter(m => !m.is_deleted && m.role === "REALTOR").length },
    { key: "일반회원", count: members.filter(m => !m.is_deleted && m.role === "USER").length },
  ];

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>권한을 확인하고 있습니다...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 상단 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>회원관리</h1>
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      {/* 검색 영역 */}
      {searchOpen && (
        <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setActiveKeyword(searchKeyword); setFilter("전체"); } }}
            placeholder="이름, 이메일 또는 회원번호 검색"
            style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
          <button onClick={() => { setActiveKeyword(searchKeyword); setFilter("전체"); }} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>검색</button>
          {activeKeyword && (
            <button onClick={() => { setSearchKeyword(""); setActiveKeyword(""); }} style={{ height: 40, padding: "0 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>초기화</button>
          )}
        </div>
      )}

      {/* 필터 탭 */}
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
              background: tab.key === "전체" ? "#e5e7eb" : tab.key === "승인대기" ? "#fef3c7" : "#dbeafe",
              color: tab.key === "전체" ? "#4b5563" : tab.key === "승인대기" ? "#92400e" : "#1e40af",
              padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 요약 현황 카드 (전체 탭에서만 보임) */}
      {filter === "전체" && !activeKeyword && (
        <div style={{ padding: "16px 16px 8px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>최고관리자</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{tabs.find(t => t.key === "최고관리자")?.count || 0}</div>
            </div>
            <div style={{ width: 1, background: "#e5e7eb", margin: "0 10px" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>부동산회원</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb" }}>{tabs.find(t => t.key === "부동산회원")?.count || 0}</div>
            </div>
            <div style={{ width: 1, background: "#e5e7eb", margin: "0 10px" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>일반회원</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{tabs.find(t => t.key === "일반회원")?.count || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* 회원 카드 리스트 */}
      <div style={{ padding: "8px 16px 40px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>조건에 맞는 회원이 없습니다.</div>
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
              {/* 상단: 역할 뱃지 & 상태 뱃지 */}
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
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{dateStr} 가입</span>
              </div>

              {/* 기본 정보 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{member.name || '이름없음'}</span>
                  {member.memberNumber && <span style={{ fontSize: 12, color: "#6b7280" }}>#{member.memberNumber}</span>}
                </div>
                <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 2 }}>{member.email}</div>
                <div style={{ fontSize: 14, color: "#4b5563" }}>{member.phone || '-'}</div>
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                {member.role === 'REALTOR' && member.computedStatus === '승인대기' && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => {
                      if (!confirm(`${member.name} 회원의 부동산 권한을 승인하시겠습니까?`)) return;
                      const res = await adminUpdateAgency(member.id, { status: "APPROVED" });
                      if (res.success) { alert("승인되었습니다."); fetchMembers(); }
                      else alert("승인 처리 중 오류가 발생했습니다.");
                    }} style={{ flex: 1, height: 38, background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      ✅ 부동산 승인
                    </button>
                    <button onClick={async () => {
                      if (!confirm("서류보완(반려) 요청 처리하시겠습니까?")) return;
                      const res = await adminUpdateAgency(member.id, { status: "REJECTED" });
                      if (res.success) { alert("반려 처리되었습니다."); fetchMembers(); }
                      else alert("반려 처리 중 오류가 발생했습니다.");
                    }} style={{ flex: 1, height: 38, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      ❌ 반려 (서류보완)
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => router.push(`/m/admin/member/write?id=${member.id}`)}
                  style={{ width: "100%", height: 38, background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  상세보기 및 처리
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
