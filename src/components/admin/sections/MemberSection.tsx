"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import MemberRegisterForm from "@/components/admin/MemberRegisterForm";
import { adminGetMembers, adminSoftDeleteMember, adminRestoreMember, adminHardDeleteMember } from "@/app/admin/actions";

interface MemberSectionProps extends AdminSectionProps {
  activeSubmenu: "members_list" | "dormant";
  onSubmenuChange?: (submenu: string) => void;
}

export default function MemberSection({ theme, activeSubmenu, onSubmenuChange }: MemberSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [dbMembers, setDbMembers] = useState<any[]>([]);
  const [checkedMemberIds, setCheckedMemberIds] = useState<string[]>([]);
  const [showMemberRegister, setShowMemberRegister] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    adminGetMembers().then(res => { if (res?.success && res.data) setDbMembers(res.data); });
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
  const displayMembers = isDormant ? dbMembers.filter(m => m.is_deleted) : dbMembers.filter(m => !m.is_deleted);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>{isDormant ? "휴지통" : "회원목록"}</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( <span>관리자 1명</span> / <span>부동산회원 1명</span> / <span>일반 1명</span> / 전체 3명 )
        </span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>회원번호</label>
            <input type="text" placeholder="회원번호 입력" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 130 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>회원구분</label>
            <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}>
              <option>전체</option><option>최고관리자</option><option>부동산회원</option><option>일반회원</option>
            </select>
          </div>
          <input type="text" placeholder="이름 또는 이메일 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
          <button style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
          <button style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
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
            <button onClick={() => { setSelectedMemberId(null); setShowMemberRegister(true); }} style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ 회원등록</button>
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
                {["회원번호","아이디","이름","연락처","회원구분","가입일","승인상태"].map((h,i) => (
                  <th key={i} style={{ padding: "12px 10px", textAlign: i===0?"right":i===1?"left":"center" as any, fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>{h}</th>
                ))}
                <th style={{ width: "auto", borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}></th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 220 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {displayMembers.length > 0 ? displayMembers.map((member, idx) => {
                const roleMap: any = { 'ADMIN': '최고관리자', 'REALTOR': '부동산회원', 'USER': '일반회원' };
                const displayRole = roleMap[member.role] || member.role || '일반회원';
                const createdDate = member.created_at ? new Date(member.created_at).toISOString().split('T')[0] : "-";
                let agencyStatus = null;
                if (member.agencies) agencyStatus = Array.isArray(member.agencies) ? member.agencies[0]?.status : member.agencies.status;
                let displayStatus = member.signup_completed ? '정상' : '승인대기';
                let statusColor = textSecondary, statusBg = "transparent";
                if (member.role === 'REALTOR') {
                  if (agencyStatus === 'APPROVED') { displayStatus = '정상승인'; statusColor = "#065f46"; statusBg = "#d1fae5"; }
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
                    <td></td>
                    <td style={{ padding: "16px 10px", textAlign: "right", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => { setSelectedMemberId(member.id); setShowMemberRegister(true); }} style={{ height: 30, padding: "0 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>수정</button>
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
                        }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: isDormant ? "#ef4444" : "#9ca3af", border: `1px solid ${isDormant ? "#ef4444" : (darkMode ? "#444" : "#d1d5db")}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{isDormant ? "영구삭제" : "삭제"}</button>
                        <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#6b7280", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>수정내역</button>
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
    </div>
  );
}
