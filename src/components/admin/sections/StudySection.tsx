"use client";

import React from "react";
import { AdminSectionProps } from "./types";

export default function StudySection({ theme }: AdminSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const studyData = [
    { status: "판매중", title: "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 운영법", price: "2,000 P", date: "2026. 04. 07. 12시 08:34" },
    { status: "판매중", title: "[2026] 부동산이 알아야 하는 챗봇 활용법", price: "3,000 P", date: "2026. 04. 07. 12시 08:34" },
    { status: "판매중", title: "[202603] 부동산 중개에 필요한 지미나이 활용법", price: "5,000 P", date: "2026. 04. 07. 12시 08:34" },
    { status: "판매중", title: "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 운영법", price: "2,000 P", date: "2026. 04. 05. 오전 11:44" },
    { status: "판매중", title: "[2026] 부동산이 알아야 하는 챗봇 활용법", price: "3,000 P", date: "2026. 04. 05. 오전 11:42" },
    { status: "판매중", title: "[202603] 부동산 중개에 필요한 지미나이 활용법", price: "5,000 P", date: "2026. 04. 05. 오전 11:40" },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>스터디목록 (강의관리)</h1>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          ( <span style={{ color: "#3b82f6" }}>총 6건</span> / <span style={{ color: "#6b7280" }}>임시저장 1건</span> / <span style={{ color: "#6b7280" }}>유료지원 0건</span> )
        </span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>진행상황</label>
            <select style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}><option>전체</option></select>
          </div>
          <input type="text" placeholder="강의명을 검색하세요." style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
          <button style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
          <button style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
        </div>

        {/* 액션 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10 }}>
          <button style={{ height: 36, padding: "0 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ 새 강의 등록</button>
          <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>선택삭제</button>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                {[{w:40,t:""},{w:80,t:"공개상태"},{w:0,t:"강의명",a:"left"},{w:120,t:"수강료(포인트)"},{w:180,t:"최초등록일"},{w:100,t:"관리"}].map((h,i) => (
                  <th key={i} style={{ padding: "12px 10px", textAlign: (h.a || "center") as any, fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, ...(h.w ? {width:h.w} : {}) }}>
                    {i === 0 ? <input type="checkbox" style={{ accentColor: "#3b82f6" }} /> : h.t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studyData.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fafbfc"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}><input type="checkbox" style={{ accentColor: "#3b82f6" }} /></td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, fontSize: 13, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a" }}>{row.status}</span>
                  </td>
                  <td style={{ padding: "16px 10px", verticalAlign: "middle", fontWeight: 700, color: textPrimary, fontSize: 15 }}>{row.title}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>{row.price}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{row.date}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        수정
                      </button>
                      <button style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
          <button style={{ width: 32, height: 32, border: "none", borderRadius: 4, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>1</button>
        </div>
      </div>
    </div>
  );
}
