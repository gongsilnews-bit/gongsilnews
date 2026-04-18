"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import VacancyRegisterForm from "@/components/admin/VacancyRegisterForm";
import { getVacancies, updateVacancyStatus, updateVacancy, deleteVacancy, getVacancyDetail } from "@/app/actions/vacancy";
import { useRouter, useSearchParams } from "next/navigation";

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
  const showRegisterForm = action === "write";
  const [activeTab, setActiveTab] = useState("전체");

  const fetchAllVacancies = async () => {
    const res = role === "admin"
      ? await getVacancies({ all: true })
      : await getVacancies({ ownerId });
    if (res.success) setDbVacancies(res.data || []);
  };

  const handleRequestApproval = async () => {
    const checked = Array.from(document.querySelectorAll('.vacancy-checkbox:checked')).map((el: any) => el.value);
    if (checked.length === 0) { alert("승인신청할 매물을 선택하세요."); return; }
    
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
    if (!initialData) fetchAllVacancies();
  }, [showRegisterForm]);

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
  const filteredVacancies = dbVacancies.filter(v => {
    if (activeTab === "전체") return true;
    if (activeTab === "승인대기") return v.status === "PENDING";
    if (activeTab === "광고중") return v.status === "ACTIVE";
    if (activeTab === "작성중") return v.status === "DRAFT";
    if (activeTab === "반려") return v.status === "REJECTED";
    return true;
  });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      {/* 타이틀 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>공실관리</h1>
        <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>(광고 {dbVacancies.filter(v => v.status === 'ACTIVE').length}건 / 전체 {dbVacancies.length}건)</span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {["전체", "승인대기", "광고중", "작성중", "반려"].filter(tab => {
            if (role === "realtor" && (tab === "승인대기" || tab === "반려")) return false;
            return true;
          }).map(tab => {
            let count = 0;
            if (tab === "전체") count = dbVacancies.length;
            else if (tab === "승인대기") count = dbVacancies.filter(v => v.status === "PENDING").length;
            else if (tab === "광고중") count = dbVacancies.filter(v => v.status === "ACTIVE").length;
            else if (tab === "작성중") count = dbVacancies.filter(v => v.status === "DRAFT").length;
            else if (tab === "반려") count = dbVacancies.filter(v => v.status === "REJECTED").length;

            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ border: "none", background: "none", padding: "16px 20px", fontSize: 14, fontWeight: activeTab === tab ? 800 : 600, color: activeTab === tab ? "#3b82f6" : textSecondary, borderBottom: activeTab === tab ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {tab}
                <span style={{ 
                  background: tab === "전체" ? "#e5e7eb" : tab === "승인대기" ? "#8b5cf6" : tab === "광고중" ? "#10b981" : tab === "작성중" ? "#9ca3af" : "#ef4444",
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
          }} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ 공실등록</button>

          {role === "user" && (
            <>
              <button onClick={handleRequestApproval} style={{ height: 36, padding: "0 16px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                📋 승인신청
              </button>
              <span style={{ fontSize: 12, color: textSecondary, marginLeft: 4 }}>
                ※ 반려 공실만 승인신청 가능
              </span>
            </>
          )}
          
          {role === "admin" && (
            <>
              <button onClick={async () => {
                const checked = Array.from(document.querySelectorAll('.vacancy-checkbox:checked')).map((el: any) => el.value);
                if (checked.length === 0) { alert("승인할 매물을 선택하세요."); return; }
                if (confirm(`선택한 ${checked.length}건의 공실을 일괄 광고(승인)하시겠습니까?`)) {
                  for (const id of checked) { await updateVacancyStatus(id, 'ACTIVE'); }
                  fetchAllVacancies();
                }
              }} style={{ height: 36, padding: "0 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ 선택 승인</button>
              <button onClick={async () => {
                const checked = Array.from(document.querySelectorAll('.vacancy-checkbox:checked')).map((el: any) => el.value);
                if (checked.length === 0) { alert("반려할 매물을 선택하세요."); return; }
                const reason = prompt("반려 사유를 입력하세요 (취소 시 처리 안 됨)");
                if (reason) {
                   for (const id of checked) { await updateVacancy(id, { status: 'REJECTED', reject_reason: reason }); }
                   fetchAllVacancies();
                }
              }} style={{ height: 36, padding: "0 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🚫 선택 반려</button>
            </>
          )}

          {role !== "user" && (
            <button onClick={() => alert("준비 중인 기능입니다.")} style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              엑셀 대량등록
            </button>
          )}
          <button onClick={async () => {
             const checked = Array.from(document.querySelectorAll('.vacancy-checkbox:checked')).map((el: any) => el.value);
             if (checked.length === 0) { alert("삭제할 매물을 선택하세요."); return; }
             if (confirm(`선택한 ${checked.length}건의 매물을 삭제하시겠습니까?`)) {
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
                <th style={{ padding: "12px 4px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 70 }}>매물종류</th>
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
                const canToggleStatus = role === "admin" || role === "realtor";

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
                        isPending ? (
                          role === "admin" ? (
                            <button onClick={async () => {
                              if (!confirm("이 공실을 승인하시겠습니까?")) return;
                              const res = await updateVacancyStatus(row.id, 'ACTIVE');
                              if (res.success) fetchAllVacancies();
                            }} style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: "#8b5cf6", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                              승인하기
                            </button>
                          ) : (
                            <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#8b5cf6", color: "#fff", fontWeight: 700, fontSize: 12 }}>승인대기</span>
                          )
                        ) : row.status === 'REJECTED' ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 12 }}>반려됨</span>
                            <span style={{ fontSize: 11, color: textSecondary }}>{daysSinceCreated}일</span>
                          </div>
                        ) : row.status === 'DRAFT' ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#9ca3af", color: "#fff", fontWeight: 700, fontSize: 12 }}>작성중</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <button onClick={async () => {
                              const msg = isActive ? "광고를 종료하시겠습니까?" : "광고하시겠습니까?";
                              if (!confirm(msg)) return;
                              const newStatus = isActive ? 'STOPPED' : 'ACTIVE';
                              const res = await updateVacancyStatus(row.id, newStatus);
                              if (res.success) fetchAllVacancies();
                            }} style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: isActive ? "#10b981" : "#ef4444", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                              {isActive ? "광고중" : "광고종료"}
                            </button>
                            <span style={{ fontSize: 11, color: textSecondary }}>{daysSinceCreated}일</span>
                          </div>
                        )
                      ) : (
                        isPending ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#8b5cf6", color: "#fff", fontWeight: 700, fontSize: 12 }}>승인대기</span>
                        ) : row.status === 'REJECTED' ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 12 }}>반려됨</span>
                        ) : row.status === 'DRAFT' ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#9ca3af", color: "#fff", fontWeight: 700, fontSize: 12 }}>작성중</span>
                        ) : isActive ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 12 }}>광고중</span>
                        ) : (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 12 }}>광고종료</span>
                        )
                      )}
                      <div style={{ fontSize: 13, color: textSecondary, marginTop: 4, fontWeight: 600 }}>{daysSinceCreated}일</div>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 600, color: textPrimary }}>{row.sub_category || row.property_type}</td>
                    <td style={{ padding: "16px 10px", verticalAlign: "middle" }}>
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
                      {role === "admin" && (
                        <div style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, display: "inline-block", background: row.owner_role === 'REALTOR' ? '#dbeafe' : row.owner_role === 'ADMIN' ? '#fce7f3' : '#f3f4f6', color: row.owner_role === 'REALTOR' ? '#1e40af' : row.owner_role === 'ADMIN' ? '#be185d' : '#374151', fontWeight: 600 }}>
                          {row.owner_role === 'REALTOR' ? '부동산' : row.owner_role === 'ADMIN' ? '관리자' : '일반'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button onClick={async () => {
                          const path = role === "realtor" ? "/realty_admin" : role === "user" ? "/user_admin" : "/admin";
                          router.push(`${path}?menu=gongsil&action=write&id=${row.id}`);
                        }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          수정
                        </button>
                        <button onClick={async () => {
                          if (!confirm("이 공실을 삭제하시겠습니까?")) return;
                          const res = await deleteVacancy(row.id);
                          if (res.success) fetchAllVacancies();
                        }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이징 */}
        <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
          <button style={{ width: 32, height: 32, border: "none", borderRadius: 4, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>1</button>
        </div>
      </div>
    </div>
  );
}
