"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import VacancyRegisterForm from "@/components/admin/VacancyRegisterForm";
import { getVacancies, updateVacancyStatus, deleteVacancy, getVacancyDetail } from "@/app/actions/vacancy";

interface VacancySectionProps extends AdminSectionProps {
  role: "admin" | "realtor" | "user";
  ownerId: string;
  ownerName?: string;
  ownerPhone?: string;
  initialData?: any[];
}

export default function VacancySection({ theme, role, ownerId, ownerName, ownerPhone, initialData }: VacancySectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [dbVacancies, setDbVacancies] = useState<any[]>(initialData || []);
  const [editingVacancy, setEditingVacancy] = useState<any>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const fetchAllVacancies = async () => {
    const res = role === "admin"
      ? await getVacancies({ all: true })
      : await getVacancies({ ownerId });
    if (res.success) setDbVacancies(res.data || []);
  };

  useEffect(() => {
    if (!initialData) fetchAllVacancies();
  }, [showRegisterForm]);

  if (showRegisterForm) {
    return (
      <VacancyRegisterForm
        onBack={() => { setShowRegisterForm(false); setEditingVacancy(null); }}
        darkMode={darkMode}
        userRole={role}
        ownerId={ownerId}
        editData={editingVacancy}
        {...(role === "user" && ownerName ? { initialClientName: ownerName } : {})}
        {...(role === "user" && ownerPhone ? { initialClientPhone: ownerPhone } : {})}
      />
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      {/* 타이틀 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>공실관리</h1>
        <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>(광고 {dbVacancies.filter(v => v.status === 'ACTIVE').length}건 / 전체 {dbVacancies.length}건)</span>
      </div>

      {/* 메인 카드 */}
      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 영역 */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>매물번호</label>
            <input type="text" placeholder="매물번호 입력" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 140 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>매물종류</label>
            <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
              <option>전체</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>매물구분</label>
            <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
              <option>전체</option>
            </select>
          </div>
          <input type="text" placeholder="전체내용 입력하세요." style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
          <button style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            검색
          </button>
          <button style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
        </div>

        {/* 액션 버튼 영역 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowRegisterForm(true)} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ 공실등록</button>
          <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            엑셀 대량등록
          </button>
          <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            선택삭제
          </button>
        </div>

        {/* 데이터 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}><input type="checkbox" style={{ accentColor: "#3b82f6" }} /></th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>번호</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>광고설정</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 90 }}>매물종류</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 300 }}>주소 / 연락처</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 110 }}>금액</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 130 }}>방수/면적(m²)/층</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 70 }}>최초등록</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>등록자/연락처</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {dbVacancies.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>등록된 공실이 없습니다.</td></tr>
              ) : dbVacancies.map((row, idx) => {
                const formatAmount = (amt: number) => {
                  if (!amt) return "";
                  const manwon = Math.round(amt / 10000);
                  if (manwon >= 10000) {
                    const eok = Math.floor(manwon / 10000);
                    const rest = manwon % 10000;
                    return `${eok}억${rest ? ` ${rest}` : ""}`;
                  }
                  return `${manwon}`;
                };
                const monthlyManwon = row.monthly_rent ? Math.round(row.monthly_rent / 10000) : 0;
                const priceText = row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
                  : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
                  : `${formatAmount(row.deposit)}/${monthlyManwon}`;
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
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}><input type="checkbox" style={{ accentColor: "#3b82f6" }} /></td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>
                      <div style={{ fontWeight: 700 }}>{idx + 1}</div>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{row.vacancy_no}</div>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      {canToggleStatus ? (
                        isPending ? (
                          role === "admin" ? (
                            <button onClick={async () => {
                              if (!confirm("이 공실을 승인하시겠습니까?")) return;
                              const res = await updateVacancyStatus(row.id, 'ACTIVE');
                              if (res.success) fetchAllVacancies();
                            }} style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: darkMode ? "#2e2a1a" : "#fef3c7", color: darkMode ? "#fbbf24" : "#92400e", fontWeight: 700, fontSize: 13 }}>
                              승인대기
                            </button>
                          ) : (
                            <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: darkMode ? "#2e2a1a" : "#fef3c7", color: darkMode ? "#fbbf24" : "#92400e", fontWeight: 700, fontSize: 13 }}>대기중</span>
                          )
                        ) : (
                          <button onClick={async () => {
                            const msg = isActive ? "광고를 종료하시겠습니까?" : "광고하시겠습니까?";
                            if (!confirm(msg)) return;
                            const newStatus = isActive ? 'STOPPED' : 'ACTIVE';
                            const res = await updateVacancyStatus(row.id, newStatus);
                            if (res.success) fetchAllVacancies();
                          }} style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: isActive ? (darkMode ? "#1a2e1a" : "#d1fae5") : (darkMode ? "#2e1a1a" : "#fee2e2"), color: isActive ? (darkMode ? "#4ade80" : "#065f46") : (darkMode ? "#fca5a5" : "#b91c1c"), fontWeight: 700, fontSize: 13 }}>
                            {isActive ? "광고중" : "광고종료"}
                          </button>
                        )
                      ) : (
                        isPending ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: darkMode ? "#2e2a1a" : "#fef3c7", color: darkMode ? "#fbbf24" : "#92400e", fontWeight: 700, fontSize: 13 }}>대기중</span>
                        ) : isActive ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: darkMode ? "#1a2e1a" : "#d1fae5", color: darkMode ? "#4ade80" : "#065f46", fontWeight: 700, fontSize: 13 }}>광고중</span>
                        ) : (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: darkMode ? "#2e1a1a" : "#fee2e2", color: darkMode ? "#fca5a5" : "#b91c1c", fontWeight: 700, fontSize: 13 }}>광고종료</span>
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
                          const res = await getVacancyDetail(row.id);
                          if (res.success) { setEditingVacancy(res.data); setShowRegisterForm(true); }
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
