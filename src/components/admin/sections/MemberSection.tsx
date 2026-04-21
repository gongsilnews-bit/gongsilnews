"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import MemberRegisterForm from "@/components/admin/MemberRegisterForm";
import { adminGetMembers, adminSoftDeleteMember, adminRestoreMember, adminHardDeleteMember, adminBulkUpdatePlanAndLimits } from "@/app/admin/actions";

interface MemberSectionProps extends AdminSectionProps {
  activeSubmenu: "members_list" | "dormant";
  onSubmenuChange?: (submenu: string) => void;
  initialData?: any[];
}

export default function MemberSection({ theme, activeSubmenu, onSubmenuChange, initialData }: MemberSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [dbMembers, setDbMembers] = useState<any[]>(initialData || []);
  const [checkedMemberIds, setCheckedMemberIds] = useState<string[]>([]);
  const [showMemberRegister, setShowMemberRegister] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [searchMemberId, setSearchMemberId] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState({
    plan_type: "free",
    plan_end_date: "",
    max_vacancies: 5,
    max_articles_per_month: 0
  });
  const [searchRole, setSearchRole] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilters, setActiveFilters] = useState({ memberId: "", role: "전체", keyword: "" });

  useEffect(() => {
    if (!initialData) adminGetMembers().then(res => { if (res?.success && res.data) setDbMembers(res.data); });
  }, []);

  if (showMemberRegister) {
    return (
      <MemberRegisterForm
        darkMode={darkMode}
        editMemberId={selectedMemberId}
        isAdmin={true}
        onBack={() => {
          setShowMemberRegister(false);
          setSelectedMemberId(null);
          adminGetMembers().then(res => setDbMembers(res.data || []));
        }}
      />
    );
  }

  const isDormant = activeSubmenu === "dormant";
  let displayMembers = isDormant ? dbMembers.filter(m => m.is_deleted) : dbMembers.filter(m => !m.is_deleted);

  if (activeFilters.memberId) {
    displayMembers = displayMembers.filter(m => {
       const memberNumber = String(dbMembers.length - dbMembers.findIndex(x => x.id === m.id)).padStart(6, '0');
       return memberNumber.includes(activeFilters.memberId);
    });
  }
  if (activeFilters.role !== "전체") {
    displayMembers = displayMembers.filter(m => {
      const roleMap: any = { 'ADMIN': '최고관리자', 'REALTOR': '부동산회원', 'USER': '일반회원' };
      const displayRole = roleMap[m.role] || m.role || '일반회원';
      return displayRole === activeFilters.role;
    });
  }
  if (activeFilters.keyword) {
    const k = activeFilters.keyword.toLowerCase();
    displayMembers = displayMembers.filter(m => {
      return (m.name && m.name.toLowerCase().includes(k)) || (m.email && m.email.toLowerCase().includes(k));
    });
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>회원관리</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( <span>관리자 1명</span> / <span>부동산회원 1명</span> / <span>일반 1명</span> / 전체 3명 )
        </span>
      </div>

      {/* 서브메뉴 탭 */}
      <div style={{ display: "flex", borderBottom: `1px solid ${border}`, marginBottom: 20, gap: 24 }}>
        {[
          { key: "members_list", label: "회원목록" },
          { key: "dormant", label: "휴지통" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => onSubmenuChange?.(tab.key)}
            style={{
              padding: "0 4px 12px",
              background: "none",
              border: "none",
              borderBottom: activeSubmenu === tab.key ? "3px solid #3b82f6" : "3px solid transparent",
              color: activeSubmenu === tab.key ? "#3b82f6" : textSecondary,
              fontSize: 16,
              fontWeight: activeSubmenu === tab.key ? 800 : 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>회원번호</label>
            <input type="text" value={searchMemberId} onChange={e => setSearchMemberId(e.target.value)} onKeyDown={e => e.key === 'Enter' && setActiveFilters({ memberId: searchMemberId, role: searchRole, keyword: searchKeyword })} placeholder="번호 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 130 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>회원구분</label>
            <select value={searchRole} onChange={e => setSearchRole(e.target.value)} style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
              <option value="전체">전체</option><option value="최고관리자">최고관리자</option><option value="부동산회원">부동산회원</option><option value="일반회원">일반회원</option>
            </select>
          </div>
          <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && setActiveFilters({ memberId: searchMemberId, role: searchRole, keyword: searchKeyword })} placeholder="이름 또는 이메일 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
          <button onClick={() => setActiveFilters({ memberId: searchMemberId, role: searchRole, keyword: searchKeyword })} style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
          <button onClick={() => { setSearchMemberId(""); setSearchRole("전체"); setSearchKeyword(""); setActiveFilters({ memberId: "", role: "전체", keyword: "" }); }} style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
        </div>

        {/* 액션 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          {isDormant ? (
            <button onClick={async () => {
              if (checkedMemberIds.length === 0) { alert("재등록할 회원을 선택해주세요."); return; }
              if (confirm(`선택한 ${checkedMemberIds.length}명의 회원을 복구하시겠습니까?`)) {
                for (const id of checkedMemberIds) await adminRestoreMember(id);
                adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                setCheckedMemberIds([]);
                onSubmenuChange?.("members_list");
              }
            }} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>재등록</button>
          ) : (
            <>
              <button onClick={() => { setSelectedMemberId(null); setShowMemberRegister(true); }} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ 회원등록</button>
              <button onClick={() => {
                if (checkedMemberIds.length === 0) { alert("일괄 변경할 회원을 선택해주세요."); return; }
                setShowBulkModal(true);
              }} style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>요금제 일괄변경</button>
            </>
          )}
          <button onClick={async () => {
            if (checkedMemberIds.length === 0) { alert("삭제할 회원을 선택해주세요."); return; }
            if (isDormant) {
              if (confirm(`선택한 ${checkedMemberIds.length}명을 영구 삭제하시겠습니까?`)) {
                for (const id of checkedMemberIds) await adminHardDeleteMember(id);
                adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                setCheckedMemberIds([]);
              }
            } else {
              if (confirm(`선택한 ${checkedMemberIds.length}명을 휴지통으로 이동하시겠습니까?`)) {
                for (const id of checkedMemberIds) await adminSoftDeleteMember(id);
                adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                setCheckedMemberIds([]);
              }
            }
          }} style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: isDormant ? "#ef4444" : textPrimary, border: `1px solid ${isDormant ? "#ef4444" : border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{isDormant ? "영구삭제" : "선택삭제"}</button>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1200, whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                  <input type="checkbox" style={{ accentColor: "#3b82f6" }}
                    checked={displayMembers.length > 0 && checkedMemberIds.length === displayMembers.length}
                    onChange={(e) => { if (e.target.checked) setCheckedMemberIds(displayMembers.map((m: any) => m.id)); else setCheckedMemberIds([]); }} />
                </th>
                {["회원번호","아이디","이름","연락처","회원구분","가입일","승인상태","공실","기사(mon)","홈페이지ID","종료"].map((h,i) => (
                  <th key={i} style={{ padding: "12px 10px", textAlign: i===0?"right":i===1?"left":"center" as any, fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>{h}</th>
                ))}
                <th style={{ width: "auto", borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}></th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 220 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {displayMembers.length > 0 ? displayMembers.map((member, idx) => {
                const roleMap: any = { 'ADMIN': '최고관리자', 'REALTOR': '부동산회원', 'USER': '일반회원' };
                let displayRole = roleMap[member.role] || member.role || '일반회원';
                if (member.role === 'REALTOR' && member.plan_type) {
                  if (member.plan_type === 'news_premium') displayRole += ' (공실뉴스)';
                  if (member.plan_type === 'vacancy_premium') displayRole += ' (공실등록)';
                }
                const createdDate = member.created_at ? new Date(member.created_at).toISOString().split('T')[0] : "-";
                let agencyStatus = null;
                if (member.agencies) agencyStatus = Array.isArray(member.agencies) ? member.agencies[0]?.status : member.agencies.status;
                let displayStatus = member.signup_completed ? '정상' : '승인대기';
                let statusColor = textSecondary, statusBg = "transparent";
                if (member.role === 'REALTOR') {
                  if (agencyStatus === 'APPROVED') {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    const isOld = member.created_at && new Date(member.created_at) < oneWeekAgo;
                    
                    if (isOld) {
                      displayStatus = '정상';
                      statusColor = textSecondary;
                      statusBg = "transparent";
                    } else {
                      displayStatus = '정상승인';
                      statusColor = "#065f46";
                      statusBg = "#d1fae5";
                    }
                  }
                  else if (agencyStatus === 'REJECTED') { displayStatus = '서류보완 필요'; statusColor = "#b91c1c"; statusBg = "#fee2e2"; }
                  else { displayStatus = '승인대기'; statusColor = "#92400e"; statusBg = "#fef3c7"; }
                }

                return (
                  <tr key={member.id || idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f1f3f5"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      <input type="checkbox" style={{ accentColor: "#3b82f6" }} checked={checkedMemberIds.includes(member.id)} onChange={(e) => { if (e.target.checked) setCheckedMemberIds(prev => [...prev, member.id]); else setCheckedMemberIds(prev => prev.filter(id => id !== member.id)); }} />
                    </td>
                    <td style={{ padding: "16px 20px 16px 10px", textAlign: "right", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{String(dbMembers.length - dbMembers.findIndex(m => m.id === member.id)).padStart(6, '0')}</td>
                    <td style={{ padding: "16px 10px", verticalAlign: "middle", textAlign: "left" }}>
                      <a href="#" style={{ fontSize: 15, fontWeight: 600, color: textSecondary, textDecoration: "none", cursor: "pointer" }}
                        onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                        onClick={(e) => { e.preventDefault(); setSelectedMemberId(member.id); setShowMemberRegister(true); }}>{member.email}</a>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 600, color: textPrimary }}>{member.name || '-'}</td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{member.phone || '-'}</td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{displayRole}</td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{createdDate}</td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14 }}>
                      <span onClick={() => { setSelectedMemberId(member.id); setShowMemberRegister(true); }}
                        style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: statusBg, color: statusColor, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{displayStatus}</span>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textPrimary, fontWeight: 700 }}>
                      {member.vacancies_count ?? 0} / {member.max_vacancies ?? 5}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textPrimary, fontWeight: 700 }}>
                      {member.articles_count ?? 0} / {member.max_articles_per_month ?? 0}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary, fontWeight: 600 }}>
                      {member.homepage_id || '-'}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>
                      {member.plan_end_date ? new Date(member.plan_end_date).toISOString().split('T')[0] : '-'}
                    </td>
                    <td></td>
                    <td style={{ padding: "16px 10px", textAlign: "right", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => { setSelectedMemberId(member.id); setShowMemberRegister(true); }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          수정
                        </button>
                        <button onClick={async () => {
                          if (isDormant) {
                            if (confirm("영구 삭제하시겠습니까? 되돌릴 수 없습니다.")) {
                              const res = await adminHardDeleteMember(member.id);
                              if (res.success) adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                              else alert("삭제 실패: " + res.error);
                            }
                          } else {
                            if (confirm("휴지통으로 이동하시겠습니까?")) {
                              const res = await adminSoftDeleteMember(member.id);
                              if (res.success) { adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) }); onSubmenuChange?.("dormant"); }
                              else alert("삭제 실패: " + res.error);
                            }
                          }
                        }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: isDormant ? "#ef4444" : "#9ca3af", border: `1px solid ${isDormant ? "#ef4444" : (darkMode ? "#444" : "#d1d5db")}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          {isDormant ? "영구삭제" : "삭제"}
                        </button>
                        <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#6b7280", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>수정내역</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={10} style={{ padding: "40px 0", textAlign: "center", color: textSecondary, fontSize: 14 }}>{isDormant ? "삭제된 회원이 없습니다." : "가입된 회원이 없습니다."}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
          <button style={{ width: 32, height: 32, border: "none", borderRadius: 4, background: "#4b5563", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>1</button>
        </div>
      </div>
      
      {showBulkModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: darkMode ? "#222" : "#fff", borderRadius: 12, width: 400, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 18, color: textPrimary }}>선택 회원 일괄 변경 ({checkedMemberIds.length}명)</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: textSecondary, marginBottom: 6 }}>요금제</label>
                <select value={bulkData.plan_type} onChange={(e) => setBulkData({ ...bulkData, plan_type: e.target.value })} style={{ width: "100%", height: 40, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#333" : "#fff", color: textPrimary, padding: "0 12px" }}>
                  <option value="free">무료부동산 (Free)</option>
                  <option value="news_premium">공실뉴스부동산</option>
                  <option value="vacancy_premium">공실등록부동산</option>
                </select>
              </div>
              {bulkData.plan_type !== "free" && (
                <div>
                  <label style={{ display: "block", fontSize: 13, color: textSecondary, marginBottom: 6 }}>만료일</label>
                  <input type="date" value={bulkData.plan_end_date} onChange={(e) => setBulkData({ ...bulkData, plan_end_date: e.target.value })} style={{ width: "100%", height: 40, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#333" : "#fff", color: textPrimary, padding: "0 12px" }} />
                </div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, color: textSecondary, marginBottom: 6 }}>매물 등록 한도</label>
                  <input type="number" min={0} value={bulkData.max_vacancies} onChange={(e) => setBulkData({ ...bulkData, max_vacancies: parseInt(e.target.value || "0") })} style={{ width: "100%", height: 40, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#333" : "#fff", color: textPrimary, padding: "0 12px", textAlign: "right" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, color: textSecondary, marginBottom: 6 }}>기사 작성 한도</label>
                  <input type="number" min={0} value={bulkData.max_articles_per_month} onChange={(e) => setBulkData({ ...bulkData, max_articles_per_month: parseInt(e.target.value || "0") })} style={{ width: "100%", height: 40, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#333" : "#fff", color: textPrimary, padding: "0 12px", textAlign: "right" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setShowBulkModal(false)} style={{ padding: "0 16px", height: 36, border: "none", background: "#f3f4f6", color: "#4b5563", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>취소</button>
              <button onClick={async () => {
                const res = await adminBulkUpdatePlanAndLimits(checkedMemberIds, bulkData);
                if (res.success) {
                  alert("일괄 변경이 완료되었습니다.");
                  setShowBulkModal(false);
                  setCheckedMemberIds([]);
                  adminGetMembers().then(r => { if (r.success) setDbMembers(r.data || []) });
                } else {
                  alert("오류 발생: " + res.error);
                }
              }} style={{ padding: "0 16px", height: 36, border: "none", background: "#3b82f6", color: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
