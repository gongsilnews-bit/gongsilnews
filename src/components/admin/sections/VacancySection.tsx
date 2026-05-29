"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import VacancyRegisterForm from "@/components/admin/VacancyRegisterForm";
import VacancyDetailPanel from "./VacancyDetailPanel";
import { getVacancies, updateVacancyStatus, updateVacancy, deleteVacancy, getVacancyDetail } from "@/app/actions/vacancy";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface VacancySectionProps extends AdminSectionProps {
  role: "admin" | "realtor" | "user";
  ownerId: string;
  ownerName?: string;
  ownerPhone?: string;
  initialData?: any[];
}

export default function VacancySection({ theme, role, ownerId, ownerName, ownerPhone, initialData }: VacancySectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const editId = searchParams.get("id");
  
  const [dbVacancies, setDbVacancies] = useState<any[]>(initialData || []);
  const [editingVacancy, setEditingVacancy] = useState<any>(null);
  const [flyerMap, setFlyerMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function checkFlyers() {
      if (dbVacancies.length === 0) return;
      const supabase = createClient();
      const ids = dbVacancies.map((v: any) => v.id);
      
      const { data: flyers } = await supabase
        .from("vacancy_flyers")
        .select("vacancy_id")
        .in("vacancy_id", ids);
        
      if (flyers) {
        const map: Record<string, boolean> = {};
        flyers.forEach((f: any) => {
          map[f.vacancy_id] = true;
        });
        setFlyerMap(map);
      }
    }
    checkFlyers();
  }, [dbVacancies]);
  const showRegisterForm = action === "write";
  const [activeTab, setActiveTab] = useState("전체");

  const [searchVacancyNo, setSearchVacancyNo] = useState("");
  const [searchType, setSearchType] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilters, setActiveFilters] = useState({ vacancyNo: "", type: "전체", keyword: "" });
  const [excludeOnbid, setExcludeOnbid] = useState(role === "admin");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ 전체: 0, 광고중: 0, 광고종료: 0, 임시저장: 0 });

  const fetchAllVacancies = async () => {
    const params: any = {
      page: currentPage,
      limit: pageSize,
      all: role === "admin"
    };

    if (role !== "admin" && ownerId) {
      params.ownerId = ownerId;
    }

    if (role === "admin" && excludeOnbid) {
      params.excludeOnbid = true;
    }

    // Map status filter
    if (activeTab === "광고중") params.status = "ACTIVE";
    else if (activeTab === "광고종료") params.status = "STOPPED";
    else if (activeTab === "임시저장") params.status = "DRAFT";

    // Map search filters
    if (activeFilters.vacancyNo) params.vacancyNo = activeFilters.vacancyNo;
    if (activeFilters.type !== "전체") params.tradeType = activeFilters.type;
    if (activeFilters.keyword) params.searchKeyword = activeFilters.keyword;

    const res = await getVacancies(params);
    if (res.success) {
      setDbVacancies(res.data || []);
      setTotalCount(res.count || 0);
    }

    // Compute total and status counts (using high-performance aggregates to bypass 1,000 max row limit)
    const supabase = createClient();
    let queryAll = supabase.from("vacancies").select("*", { count: "exact", head: true }).neq("status", "DELETED");
    let queryActive = supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "ACTIVE");
    let queryStopped = supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "STOPPED");
    let queryDraft = supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "DRAFT");

    if (role !== "admin" && ownerId) {
      const { data: user } = await supabase.from('members').select('role').eq('id', ownerId).single();
      if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN' && user?.role !== '최고관리자') {
        queryAll = queryAll.eq('owner_id', ownerId);
        queryActive = queryActive.eq('owner_id', ownerId);
        queryStopped = queryStopped.eq('owner_id', ownerId);
        queryDraft = queryDraft.eq('owner_id', ownerId);
      }
    }

    if (role === "admin" && excludeOnbid) {
      queryAll = queryAll.or("metadata->>source_type.is.null,metadata->>source_type.neq.ONBID");
      queryActive = queryActive.or("metadata->>source_type.is.null,metadata->>source_type.neq.ONBID");
      queryStopped = queryStopped.or("metadata->>source_type.is.null,metadata->>source_type.neq.ONBID");
      queryDraft = queryDraft.or("metadata->>source_type.is.null,metadata->>source_type.neq.ONBID");
    }

    const [resAll, resActive, resStopped, resDraft] = await Promise.all([
      queryAll,
      queryActive,
      queryStopped,
      queryDraft
    ]);

    setCounts({
      전체: resAll.count || 0,
      광고중: resActive.count || 0,
      광고종료: resStopped.count || 0,
      임시저장: resDraft.count || 0
    });
  };

  const handleRequestApproval = async () => {
    const checked = Array.from(document.querySelectorAll('.vacancy-checkbox:checked')).map((el: any) => el.value);
    if (checked.length === 0) { alert("승인신청할 공실광고를 선택하세요."); return; }
    
    const invalid = checked.some(id => {
      const v = dbVacancies.find(x => x.id === id);
      return v && v.status !== "REJECTED";
    });
    
    if (invalid) { alert("반려된 공실만 승인신청할 수 있습니다."); return; }
    
    if (confirm(`선택한 ${checked.length}건의 반려된 공실을 승인신청하시겠습니까?`)) {
      for (const id of checked) { await updateVacancyStatus(id, "PENDING"); }
      fetchAllVacancies();
      // 체크박스 해제
      document.querySelectorAll('.vacancy-checkbox').forEach((box: any) => box.checked = false);
    }
  };

  useEffect(() => {
    fetchAllVacancies();
  }, [currentPage, activeTab, activeFilters, showRegisterForm, excludeOnbid, pageSize]);

  useEffect(() => {
    const fetchEditData = async () => {
      if (editId && action === "write") {
        const res = await getVacancyDetail(editId);
        if (res.success) setEditingVacancy(res.data);
      } else {
        setEditingVacancy(null);
      }
    };
    fetchEditData();
  }, [editId, action]);

  if (showRegisterForm) {
    const returnUrl = role === "realtor" ? "/realty_admin?menu=gongsil" : role === "user" ? "/user_admin?menu=gongsil" : "/admin?menu=gongsil";
    return (
      <VacancyRegisterForm
        onBack={() => { router.push(returnUrl); }}
        darkMode={darkMode}
        userRole={role}
        ownerId={ownerId}
        editData={editingVacancy}
        {...(role === "user" && ownerName ? { initialClientName: ownerName } : {})}
        {...(role === "user" && ownerPhone ? { initialClientPhone: ownerPhone } : {})}
      />
    );
  }

  if (action === "detail" && editId) {
    return (
      <VacancyDetailPanel
        vacancyId={editId}
        onBack={() => {
          const path = role === "realtor" ? "/realty_admin" : role === "user" ? "/user_admin" : "/admin";
          router.push(`${path}?menu=gongsil`);
        }}
        onEdit={() => {
          const path = role === "realtor" ? "/realty_admin" : role === "user" ? "/user_admin" : "/admin";
          router.push(`${path}?menu=gongsil&action=write&id=${editId}`);
        }}
      />
    );
  }
  let filteredVacancies = dbVacancies;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      {/* 타이틀 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>공실관리</h1>
        <span style={{ fontSize: 13, color: "#111", fontWeight: 600 }}>(광고 {counts.광고중}건 / 전체 {counts.전체}건)</span>
      </div>

      {/* 필터 검색 바 (독립 컨테이너로 위로 분리) */}
      <div style={{ padding: "16px 24px", background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>공실광고 번호</label>
          <input type="text" value={searchVacancyNo} onChange={e => setSearchVacancyNo(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { setActiveFilters({ vacancyNo: searchVacancyNo, type: searchType, keyword: searchKeyword }); if (searchVacancyNo || searchKeyword || searchType !== "전체") setActiveTab("전체"); setCurrentPage(1); } }} placeholder="번호 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 130 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>거래구분</label>
          <select value={searchType} onChange={e => setSearchType(e.target.value)} style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
            <option value="전체">전체</option><option value="매매">매매</option><option value="전세">전세</option><option value="월세">월세</option>
          </select>
        </div>
        <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { setActiveFilters({ vacancyNo: searchVacancyNo, type: searchType, keyword: searchKeyword }); if (searchVacancyNo || searchKeyword || searchType !== "전체") setActiveTab("전체"); setCurrentPage(1); } }} placeholder="주소, 등록자 또는 연락처 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
        {role === "admin" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#2563eb", cursor: "pointer", background: darkMode ? "#1e293b" : "#eff6ff", padding: "8px 12px", borderRadius: 8, border: `1px solid ${darkMode ? "#334155" : "#bfdbfe"}`, height: 36, boxSizing: "border-box", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={excludeOnbid} onChange={e => { setExcludeOnbid(e.target.checked); setCurrentPage(1); }} style={{ accentColor: "#2563eb", cursor: "pointer", margin: 0 }} />
              🤖 온비드 매물 제외
            </label>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>보기</label>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ height: 36, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 90 }}>
            <option value={10}>10개씩</option>
            <option value={20}>20개씩</option>
            <option value={30}>30개씩</option>
            <option value={50}>50개씩</option>
            <option value={100}>100개씩</option>
          </select>
        </div>
        <button onClick={() => { setActiveFilters({ vacancyNo: searchVacancyNo, type: searchType, keyword: searchKeyword }); if (searchVacancyNo || searchKeyword || searchType !== "전체") setActiveTab("전체"); setCurrentPage(1); }} style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
        <button onClick={() => { setSearchVacancyNo(""); setSearchType("전체"); setSearchKeyword(""); setActiveFilters({ vacancyNo: "", type: "전체", keyword: "" }); setActiveTab("전체"); setCurrentPage(1); }} style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {["전체", "광고중", "광고종료", "임시저장"].map(tab => {
            let count = counts[tab as keyof typeof counts] || 0;

            return (
              <button key={tab} onClick={() => {
                setActiveTab(tab);
                setActiveFilters({ vacancyNo: "", type: "전체", keyword: "" });
                setSearchVacancyNo(""); setSearchType("전체"); setSearchKeyword("");
                setCurrentPage(1);
              }}
                style={{ border: "none", background: "none", padding: "16px 20px", fontSize: 14, fontWeight: activeTab === tab ? 800 : 600, color: activeTab === tab ? "#3b82f6" : textSecondary, borderBottom: activeTab === tab ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {tab}
                <span style={{ 
                  background: tab === "전체" ? "#e5e7eb" : tab === "광고중" ? "#10b981" : tab === "광고종료" ? "#ef4444" : tab === "임시저장" ? "#9ca3af" : "#ef4444",
                  color: tab === "전체" ? "#4b5563" : "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 액션 버튼 영역 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => {
            const path = role === "realtor" ? "/realty_admin" : role === "user" ? "/user_admin" : "/admin";
            router.push(`${path}?menu=gongsil&action=write`);
          }} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ 공실광고 등록</button>

          {role !== "user" && (
            <button onClick={() => alert("준비 중인 기능입니다.")} style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              엑셀 대량등록
            </button>
          )}
          <button onClick={async () => {
             const checked = Array.from(document.querySelectorAll('.vacancy-checkbox:checked')).map((el: any) => el.value);
             if (checked.length === 0) { alert("삭제할 공실광고를 선택하세요."); return; }
             if (confirm(`선택한 ${checked.length}건의 공실광고를 삭제하시겠습니까?`)) {
               for (const id of checked) { await deleteVacancy(id); }
               fetchAllVacancies();
             }
          }} style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            선택삭제
          </button>
        </div>

        {/* 데이터 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 4px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 30 }}>
                  <input type="checkbox" style={{ accentColor: "#3b82f6" }} onChange={e => {
                     const allBoxes = document.querySelectorAll('.vacancy-checkbox');
                     allBoxes.forEach((box: any) => box.checked = e.target.checked);
                  }} />
                </th>
                <th style={{ padding: "12px 4px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 50 }}>번호</th>
                <th style={{ padding: "12px 4px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 70 }}>광고설정</th>
                <th style={{ padding: "12px 4px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 70 }}>공실광고 종류</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 300 }}>주소 / 연락처</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 110 }}>금액</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 130 }}>방수/면적(m²)/층</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 70 }}>최초등록</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>등록자/연락처</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredVacancies.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>조건에 맞는 공실이 없습니다.</td></tr>
              ) : filteredVacancies.map((row, idx) => {
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
                const priceText = row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
                  : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
                  : `${formatAmount(row.deposit)}/${formatAmount(row.monthly_rent)}`;
                const addrText = [row.dong, row.building_name].filter(Boolean).join(" ") || [row.sido, row.sigungu, row.dong].filter(Boolean).join(" ");
                const dateStr = row.created_at ? new Date(row.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : "";
                const isActive = row.status === 'ACTIVE';
                const isPending = row.status === 'PENDING';
                const daysSinceCreated = row.created_at ? Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000) : 0;
                const ownerInfo = row.members || {};
                const agencyData = Array.isArray(ownerInfo.agencies) ? ownerInfo.agencies[0] : ownerInfo.agencies;
                const agencyName = agencyData?.name || "";
                const canToggleStatus = true; // 모든 역할에서 광고 ON/OFF 가능

                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f1f3f5"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "16px 4px", textAlign: "center", verticalAlign: "middle" }}>
                      <input type="checkbox" className="vacancy-checkbox" value={row.id} style={{ accentColor: "#3b82f6" }} />
                    </td>
                    <td style={{ padding: "16px 4px", textAlign: "center", verticalAlign: "middle", fontSize: 13, color: textSecondary }}>
                      {row.vacancy_no || '-'}
                    </td>
                    <td style={{ padding: "16px 4px", textAlign: "center", verticalAlign: "middle" }}>
                      {canToggleStatus ? (
                        row.status === 'DRAFT' ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#9ca3af", color: "#fff", fontWeight: 700, fontSize: 12 }}>임시저장</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <button onClick={async () => {
                              const msg = isActive ? "광고를 종료하시겠습니까?" : "광고하시겠습니까?";
                              if (!confirm(msg)) return;
                              const newStatus = isActive ? 'STOPPED' : 'ACTIVE';
                              const res = await updateVacancyStatus(row.id, newStatus);
                              if (res.success) fetchAllVacancies();
                            }} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: isActive ? "#10b981" : "#ef4444", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                              {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>}
                              {isActive ? "광고중" : "광고종료"}
                            </button>
                            <span style={{ fontSize: 11, color: textSecondary }}>{daysSinceCreated}일</span>
                          </div>
                        )
                      ) : (
                        row.status === 'DRAFT' ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#9ca3af", color: "#fff", fontWeight: 700, fontSize: 12 }}>임시저장</span>
                        ) : isActive ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                            광고중
                          </span>
                        ) : (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 12 }}>광고종료</span>
                        )
                      )}
                      <div style={{ fontSize: 13, color: textSecondary, marginTop: 4, fontWeight: 600 }}>{daysSinceCreated}일</div>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 600, color: textPrimary }}>{row.sub_category || row.property_type}</td>
                    <td style={{ padding: "16px 10px", verticalAlign: "middle", cursor: "pointer" }} onClick={() => {
                      const path = role === "realtor" ? "/realty_admin" : role === "user" ? "/user_admin" : "/admin";
                      router.push(`${path}?menu=gongsil&action=detail&id=${row.id}`);
                    }}>
                      <div style={{ fontWeight: 700, color: textPrimary, fontSize: 15, marginBottom: 4 }}>{addrText}</div>
                      <div style={{ fontSize: 14, color: textSecondary }}>{row.client_phone || ""}</div>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      <span style={{ color: darkMode ? "#fca5a5" : "#ef4444", fontWeight: 600, fontSize: 15 }}>{priceText}</span>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>
                      {row.room_count || "-"} / {row.exclusive_m2 ? `${row.exclusive_m2}m²` : "m²"} / {row.current_floor || "-"}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{dateStr}</td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, marginBottom: 2 }}>{ownerInfo.name || row.client_name || ownerName || "-"}</div>
                      <div style={{ fontSize: 13, color: textSecondary, fontWeight: 600, marginTop: 2, marginBottom: role === "admin" ? 4 : 0 }}>
                        {ownerInfo.phone || ownerPhone || "-"}
                      </div>
                      {role === "admin" && (
                        <div style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, display: "inline-block", background: row.owner_role === 'REALTOR' ? '#dbeafe' : row.owner_role === 'ADMIN' ? '#fce7f3' : '#f3f4f6', color: row.owner_role === 'REALTOR' ? '#1e40af' : row.owner_role === 'ADMIN' ? '#be185d' : '#374151', fontWeight: 600 }}>
                          {row.owner_role === 'REALTOR' ? (agencyName ? `부동산 (${agencyName})` : '부동산') : row.owner_role === 'ADMIN' ? '관리자' : '일반'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                        {role === "admin" && row.owner_role === "REALTOR" ? (
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <span style={{ height: 30, padding: "0 12px", background: "#f3f4f6", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                              🔒 열람불가
                            </span>
                            <button onClick={async () => {
                              if (!confirm("이 공실을 삭제하시겠습니까?")) return;
                              const res = await deleteVacancy(row.id);
                              if (res.success) fetchAllVacancies();
                            }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              삭제
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center", width: "100%" }}>
                              {(role === "admin" || role === "realtor") && (() => {
                                const hasFlyer = flyerMap[row.id];
                                const isCommercialSale = row.trade_type === "매매";

                                if (isCommercialSale) {
                                  return (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button 
                                        onClick={() => window.open(`/marketing/report?vacancy_id=${row.id}`, '_blank')}
                                        style={{ 
                                          height: 30, 
                                          padding: "0 10px", 
                                          background: darkMode ? "#1e3a8a" : "#eff6ff", 
                                          color: darkMode ? "#93c5fd" : "#1d4ed8", 
                                          border: `1px solid ${darkMode ? "#1e40af" : "#bfdbfe"}`, 
                                          borderRadius: 4, 
                                          fontSize: 12, 
                                          fontWeight: 700, 
                                          cursor: "pointer", 
                                          display: "flex", 
                                          alignItems: "center", 
                                          gap: 4, 
                                          whiteSpace: "nowrap", 
                                          flexShrink: 0,
                                          transition: "all 0.15s"
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#1e40af" : "#dbeafe"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = darkMode ? "#1e3a8a" : "#eff6ff"; }}
                                        title="프리미엄 매매보고서(IM) 생성기"
                                      >
                                        💎 매매보고서(IM)
                                      </button>
                                      
                                      <button 
                                        onClick={() => window.open(`/marketing/ai-detail?vacancy_id=${row.id}`, '_blank')}
                                        style={{ 
                                          height: 30, 
                                          padding: "0 10px", 
                                          background: hasFlyer 
                                            ? (darkMode ? "#059669" : "#10b981") 
                                            : (darkMode ? "#2a2d35" : "#f3f4f6"), 
                                          color: hasFlyer 
                                            ? "#fff" 
                                            : (darkMode ? "#7c8ba1" : "#8a94a6"), 
                                          border: hasFlyer 
                                            ? "none" 
                                            : `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, 
                                          borderRadius: 4, 
                                          fontSize: 12, 
                                          fontWeight: 700, 
                                          cursor: "pointer", 
                                          display: "flex", 
                                          alignItems: "center", 
                                          gap: 4, 
                                          whiteSpace: "nowrap", 
                                          flexShrink: 0,
                                          transition: "all 0.15s"
                                        }}
                                        onMouseEnter={(e) => { 
                                          e.currentTarget.style.background = hasFlyer 
                                            ? (darkMode ? "#047857" : "#059669") 
                                            : (darkMode ? "#343842" : "#e5e7eb"); 
                                        }}
                                        onMouseLeave={(e) => { 
                                          e.currentTarget.style.background = hasFlyer 
                                            ? (darkMode ? "#059669" : "#10b981") 
                                            : (darkMode ? "#2a2d35" : "#f3f4f6"); 
                                        }}
                                        title={hasFlyer ? "AI 온라인전단지 완성됨 (클릭하여 편집/수정)" : "AI 온라인전단지 미작성 (클릭하여 제작)"}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                        {hasFlyer ? "전단지" : "전단지"}
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <button 
                                    onClick={() => window.open(`/marketing/ai-detail?vacancy_id=${row.id}`, '_blank')}
                                    style={{ 
                                      height: 30, 
                                      padding: "0 10px", 
                                      background: hasFlyer 
                                        ? (darkMode ? "#059669" : "#10b981") 
                                        : (darkMode ? "#2a2d35" : "#f3f4f6"), 
                                      color: hasFlyer 
                                        ? "#fff" 
                                        : (darkMode ? "#7c8ba1" : "#8a94a6"), 
                                      border: hasFlyer 
                                        ? "none" 
                                        : `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, 
                                      borderRadius: 4, 
                                      fontSize: 12, 
                                      fontWeight: 700, 
                                      cursor: "pointer", 
                                      display: "flex", 
                                      alignItems: "center", 
                                      gap: 4, 
                                      whiteSpace: "nowrap", 
                                      flexShrink: 0,
                                      transition: "all 0.15s"
                                    }}
                                    onMouseEnter={(e) => { 
                                      e.currentTarget.style.background = hasFlyer 
                                        ? (darkMode ? "#047857" : "#059669") 
                                        : (darkMode ? "#343842" : "#e5e7eb"); 
                                    }}
                                    onMouseLeave={(e) => { 
                                      e.currentTarget.style.background = hasFlyer 
                                        ? (darkMode ? "#059669" : "#10b981") 
                                        : (darkMode ? "#2a2d35" : "#f3f4f6"); 
                                    }}
                                    title={hasFlyer ? "AI 온라인전단지 완성됨 (클릭하여 편집/수정)" : "AI 온라인전단지 미작성 (클릭하여 제작)"}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    {hasFlyer ? "AI 온라인전단지 (완성)" : "AI 온라인전단지 (미작성)"}
                                  </button>
                                );
                              })()}
                              <button onClick={() => window.open(`/m/gongsil?id=${row.id}`, '_blank')} style={{ height: 30, padding: "0 10px", background: darkMode ? "#1e293b" : "#eff6ff", color: darkMode ? "#93c5fd" : "#2563eb", border: `1px solid ${darkMode ? "#334155" : "#bfdbfe"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                미리보기
                              </button>
                              <button onClick={async () => {
                                const path = role === "realtor" ? "/realty_admin" : role === "user" ? "/user_admin" : "/admin";
                                router.push(`${path}?menu=gongsil&action=write&id=${row.id}`);
                              }} style={{ height: 30, padding: "0 10px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                수정
                              </button>
                              <button onClick={async () => {
                                if (!confirm("이 공실을 삭제하시겠습니까?")) return;
                                const res = await deleteVacancy(row.id);
                                if (res.success) fetchAllVacancies();
                              }} style={{ height: 30, padding: "0 10px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                삭제
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이징 */}
        {totalCount > pageSize && (
          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              style={{ padding: "6px 12px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              이전
            </button>
            {Array.from({ length: Math.ceil(totalCount / pageSize) }).map((_, i) => {
              const pageNum = i + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: 32,
                    height: 32,
                    border: isCurrent ? "none" : `1px solid ${border}`,
                    borderRadius: 6,
                    background: isCurrent ? "#3b82f6" : (darkMode ? "#2c2d31" : "#fff"),
                    color: isCurrent ? "#fff" : textPrimary,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s"
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button 
              disabled={currentPage === Math.ceil(totalCount / pageSize)}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
              style={{ padding: "6px 12px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 13, fontWeight: 600, cursor: currentPage === Math.ceil(totalCount / pageSize) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(totalCount / pageSize) ? 0.5 : 1 }}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
