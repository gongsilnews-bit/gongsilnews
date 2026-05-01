"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getVacancies, updateVacancyStatus, deleteVacancy } from "@/app/actions/vacancy";

function MobileVacancyAdmin() {
  const router = useRouter();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("id, name, phone").eq("id", user.id).single();
      if (data) {
        setMemberId(data.id);
        setUserName(data.name || "이름없음");
        setUserPhone(data.phone || "");
      }
      setAuthChecked(true);
    }
    init();
  }, []);

  const fetchVacancies = async () => {
    if (!memberId) return;
    setLoading(true);
    const res = await getVacancies({ ownerId: memberId });
    if (res.success) setVacancies(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (memberId) fetchVacancies();
  }, [memberId]);

  const filtered = vacancies.filter(v => {
    if (filter === "승인대기" && v.status !== "PENDING") return false;
    if (filter === "광고중" && v.status !== "ACTIVE") return false;
    if (filter === "광고종료" && v.status !== "STOPPED") return false;
    if (filter === "작성중" && v.status !== "DRAFT") return false;
    if (filter === "반려" && v.status !== "REJECTED") return false;
    if (activeKeyword) {
      const k = activeKeyword.toLowerCase();
      const addr = [v.sido, v.sigungu, v.dong, v.building_name].filter(Boolean).join(" ").toLowerCase();
      if (!addr.includes(k) && !(v.client_name && v.client_name.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  const formatAmount = (amt: number) => {
    if (!amt) return "0";
    const m = Math.round(amt / 10000);
    if (m === 0) return "0";
    const e = Math.floor(m / 10000);
    const r = m % 10000;
    let result = "";
    if (e > 0) result += `${e}억`;
    if (r > 0) {
      const c = Math.floor(r / 1000);
      const rem = r % 1000;
      let rest = "";
      if (c > 0) rest += `${c}천`;
      if (rem > 0) rest += `${rem}`;
      if (rest) result += result ? " " + rest : rest;
      if (e === 0 && c === 0 && rem > 0) result += "만";
    }
    return result || "0";
  };

  const statusInfo: Record<string, { bg: string; label: string }> = {
    PENDING: { bg: "#8b5cf6", label: "승인대기" },
    ACTIVE: { bg: "#10b981", label: "광고중" },
    STOPPED: { bg: "#ef4444", label: "광고종료" },
    DRAFT: { bg: "#9ca3af", label: "작성중" },
    REJECTED: { bg: "#ef4444", label: "반려됨" },
  };

  const tabs = [
    { key: "전체", count: vacancies.length },
    { key: "승인대기", count: vacancies.filter(v => v.status === "PENDING").length },
    { key: "광고중", count: vacancies.filter(v => v.status === "ACTIVE").length },
    { key: "광고종료", count: vacancies.filter(v => v.status === "STOPPED").length },
    { key: "작성중", count: vacancies.filter(v => v.status === "DRAFT").length },
    { key: "반려", count: vacancies.filter(v => v.status === "REJECTED").length },
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
          <button onClick={() => router.push("/m")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>공실관리</h1>
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            광고 {vacancies.filter(v => v.status === "ACTIVE").length}건 / 전체 {vacancies.length}건
          </span>
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      {/* 검색 영역 (접이식) */}
      {searchOpen && (
        <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setActiveKeyword(searchKeyword); setFilter("전체"); } }}
            placeholder="주소, 건물명 또는 등록자 검색"
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
              background: tab.key === "전체" ? "#e5e7eb" : tab.key === "승인대기" ? "#8b5cf6" : tab.key === "광고중" ? "#10b981" : tab.key === "광고종료" ? "#ef4444" : tab.key === "작성중" ? "#9ca3af" : "#ef4444",
              color: tab.key === "전체" ? "#4b5563" : "#fff",
              padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 공실 카드 리스트 */}
      <div style={{ padding: "8px 8px 100px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {filter === "전체" ? "등록된 공실이 없습니다." : "조건에 맞는 공실이 없습니다."}
            </div>
          </div>
        ) : filtered.map(row => {
          const st = statusInfo[row.status] || { bg: "#9ca3af", label: row.status };
          const addrText = [row.dong, row.building_name].filter(Boolean).join(" ") || [row.sido, row.sigungu, row.dong].filter(Boolean).join(" ");
          const priceText = row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
            : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
            : `${formatAmount(row.deposit)}/${formatAmount(row.monthly_rent)}`;
          const dateStr = row.created_at ? new Date(row.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : "-";
          const daysSinceCreated = row.created_at ? Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000) : 0;

          return (
            <div key={row.id} style={{
              background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0",
            }}>
              {/* 상단: 상태 + 매물종류 + 번호 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {(row.status === "ACTIVE" || row.status === "STOPPED") ? (
                    <button
                      onClick={async () => {
                        const isActive = row.status === "ACTIVE";
                        const msg = isActive ? "광고를 종료하시겠습니까?" : "광고를 다시 시작하시겠습니까?";
                        if (!confirm(msg)) return;
                        const newStatus = isActive ? "STOPPED" : "ACTIVE";
                        const res = await updateVacancyStatus(row.id, newStatus);
                        if (res.success) fetchVacancies();
                      }}
                      style={{ padding: "4px 10px", background: st.bg, color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}
                    >
                      {st.label}
                    </button>
                  ) : (
                    <span style={{ padding: "4px 10px", background: st.bg, color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                  )}
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>{row.sub_category || row.property_type}</span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>#{row.vacancy_no || "-"} · {daysSinceCreated}일</span>
              </div>

              {/* 주소 */}
              <div
                onClick={() => router.push(`/user_admin?menu=gongsil&action=detail&id=${row.id}`)}
                style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 6, cursor: "pointer", wordBreak: "keep-all" }}
              >
                {addrText || "주소 미입력"}
              </div>

              {/* 가격 + 스펙 */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>{priceText}</span>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {row.room_count || "-"}방 / {row.exclusive_m2 ? `${row.exclusive_m2}m²` : "-"} / {row.current_floor || "-"}층
                </span>
              </div>

              {/* 등록자 + 날짜 */}
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12, display: "flex", gap: 12 }}>
                <span>{row.client_name || userName} · {row.client_phone || userPhone}</span>
                <span>{dateStr} 등록</span>
              </div>

              {/* 반려 사유 */}
              {row.status === "REJECTED" && row.reject_reason && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 10, fontSize: 12, color: "#dc2626", fontWeight: 600, lineHeight: 1.4 }}>
                  ⚠️ 반려 사유: {row.reject_reason}
                </div>
              )}

              {/* 액션 버튼 */}
              <div style={{ display: "flex", gap: 6 }}>
                {row.status === "REJECTED" && (
                  <button onClick={async () => {
                    if (!confirm("이 공실을 재승인 신청하시겠습니까?")) return;
                    const res = await updateVacancyStatus(row.id, "PENDING");
                    if (res.success) fetchVacancies();
                  }} style={{ flex: 1, height: 36, background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    📋 재승인
                  </button>
                )}
                <button onClick={() => window.open(`/m/gongsil?id=${row.id}`, "_blank")} style={{ flex: 1, height: 36, background: "#f0f9ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  👁️ 미리보기
                </button>
                <button onClick={() => router.push(`/m/admin/vacancy/write?id=${row.id}`)} style={{ flex: 1, height: 36, background: "#4b5563", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ✏️ 수정
                </button>
                <button onClick={async () => {
                  if (!confirm("이 공실을 삭제하시겠습니까?")) return;
                  const res = await deleteVacancy(row.id);
                  if (res.success) fetchVacancies();
                }} style={{ flex: 1, height: 36, background: "#fff", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  🗑️ 삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB: 공실등록 */}
      <button
        onClick={() => router.push("/m/admin/vacancy/write")}
        style={{
          position: "fixed", bottom: 80, right: 20, width: 56, height: 56,
          borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
          fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 40,
        }}
      >
        +
      </button>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function MobileVacancyAdminPage() {
  return (
    <Suspense fallback={null}>
      <MobileVacancyAdmin />
    </Suspense>
  );
}
