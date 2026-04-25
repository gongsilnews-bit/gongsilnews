"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "./types";
import CustomerModal from "./customer/CustomerModal";
import CustomerDetailPanel from "./customer/CustomerDetailPanel";
import { getCustomers } from "@/app/actions/customer";

interface CustomerSectionProps {
  theme: AdminTheme;
  role: "admin" | "realtor" | "user";
  memberId: string;
}

export default function CustomerSection({ theme, role, memberId }: CustomerSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  
  const [activeTab, setActiveTab] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchTypes, setSearchTypes] = useState<string[]>(["전체"]);
  const [activeFilters, setActiveFilters] = useState({ keyword: "", types: ["전체"] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | string | null>(null);

  const [dbCustomers, setDbCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllCustomers = async () => {
    setLoading(true);
    const res = await getCustomers(memberId);
    if (res.success && res.data) {
      setDbCustomers(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllCustomers();
  }, [memberId]);

  let filteredCustomers = dbCustomers.filter(c => {
    // 탭 필터링
    if (activeTab !== "전체" && c.status !== activeTab) return false;
    // 유형 다중 필터링
    if (!activeFilters.types.includes("전체") && !activeFilters.types.includes(c.type)) return false;
    // 검색어 필터링
    if (activeFilters.keyword) {
      const kw = activeFilters.keyword.toLowerCase();
      if (!c.name.includes(kw) && !c.phone.includes(kw)) return false;
    }
    return true;
  });

  const toggleSearchType = (type: string) => {
    if (type === "전체") {
      setSearchTypes(["전체"]);
      return;
    }
    
    let newTypes = searchTypes.filter(t => t !== "전체");
    
    if (newTypes.includes(type)) {
      newTypes = newTypes.filter(t => t !== type);
      if (newTypes.length === 0) newTypes = ["전체"];
    } else {
      newTypes.push(type);
    }
    
    setSearchTypes(newTypes);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      {/* 타이틀 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>고객관리</h1>
        <span style={{ fontSize: 13, color: "#111", fontWeight: 600 }}>
          (진행중 {dbCustomers.filter(c => c.status === "진행중").length}명 / 
          전체 {dbCustomers.length}명)
        </span>
      </div>

      {/* 필터 검색 바 (독립 컨테이너로 위로 분리) */}
      <div style={{ padding: "16px 24px", background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, whiteSpace: "nowrap", marginRight: 4 }}>고객 구분</span>
          {["전체", "매수", "임차(전월세)", "매도", "임대(전월세)"].map(type => (
            <button 
              key={type}
              onClick={() => toggleSearchType(type)}
              style={{ 
                height: 34, padding: "0 14px", borderRadius: 20, 
                fontSize: 13, fontWeight: searchTypes.includes(type) ? 700 : 600, 
                cursor: "pointer", transition: "all 0.2s",
                border: `1px solid ${searchTypes.includes(type) ? "#3b82f6" : border}`,
                background: searchTypes.includes(type) ? (darkMode ? "rgba(59, 130, 246, 0.2)" : "#eff6ff") : (darkMode ? "#2c2d31" : "#fff"),
                color: searchTypes.includes(type) ? "#3b82f6" : textSecondary
              }}
            >
              {type === "전체" ? "전체" : type === "매수" ? "매수" : type === "임차(전월세)" ? "임차(월세/전세)" : type === "매도" ? "매도" : "임대(월세/전세)"}
            </button>
          ))}
        </div>
        
        <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} 
          onKeyDown={e => { 
            if(e.key === 'Enter') { 
              setActiveFilters({ keyword: searchKeyword, types: searchTypes }); 
              if (searchKeyword || !searchTypes.includes("전체")) setActiveTab("전체"); 
            } 
          }}
          placeholder="고객 이름 또는 연락처 검색" 
          style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} 
        />
        <button 
          onClick={() => { 
            setActiveFilters({ keyword: searchKeyword, types: searchTypes }); 
            if (searchKeyword || !searchTypes.includes("전체")) setActiveTab("전체"); 
          }} 
          style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          검색
        </button>
        <button 
          onClick={() => { 
            setSearchKeyword(""); 
            setSearchTypes(["전체"]); 
            setActiveFilters({ keyword: "", types: ["전체"] }); 
            setActiveTab("전체"); 
          }} 
          style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          초기화
        </button>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {["전체", "신규", "진행중", "계약완료", "보류/종료"].map(tab => {
            const count = tab === "전체" ? dbCustomers.length : dbCustomers.filter(c => c.status === tab).length;
            const badgeColor = tab === "전체" ? "#e5e7eb" 
                             : tab === "신규" ? "#ef4444" 
                             : tab === "진행중" ? "#3b82f6" 
                             : tab === "계약완료" ? "#10b981" 
                             : "#9ca3af";
            const badgeTextColor = tab === "전체" ? "#4b5563" : "#fff";

            return (
              <button key={tab} onClick={() => {
                  setActiveTab(tab);
                  setActiveFilters({ keyword: "", types: ["전체"] });
                  setSearchKeyword(""); setSearchTypes(["전체"]);
                }}
                style={{ 
                  border: "none", background: "none", padding: "16px 20px", fontSize: 14, 
                  fontWeight: activeTab === tab ? 800 : 600, 
                  color: activeTab === tab ? "#3b82f6" : textSecondary, 
                  borderBottom: activeTab === tab ? "3px solid #3b82f6" : "3px solid transparent", 
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6 
                }}>
                {tab}
                <span style={{ background: badgeColor, color: badgeTextColor, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 액션 버튼 영역 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            + 새 고객 등록
          </button>
          
          <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
             엑셀 다운로드
          </button>
        </div>

        {/* 데이터 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1000 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 4px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 30 }}>
                  <input type="checkbox" style={{ accentColor: "#3b82f6" }} />
                </th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 80 }}>상태</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>고객유형</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 180 }}>이름 / 연락처</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 250 }}>희망지역 / 가용 예산</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>유입경로</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>등록일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 110 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>고객 데이터를 불러오는 중입니다...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>조건에 맞는 고객이 없습니다.</td></tr>
              ) : filteredCustomers.map((row) => {
                const dateStr = new Date(row.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
                const isNew = row.status === "신규";
                const badgeColor = row.status === "신규" ? "#ef4444" : row.status === "진행중" ? "#3b82f6" : row.status === "계약완료" ? "#10b981" : "#9ca3af";

                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f0fdf4"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    onClick={() => setSelectedCustomerId(row.id)}
                  >
                    <td style={{ padding: "16px 4px", textAlign: "center", verticalAlign: "middle" }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" value={row.id} style={{ accentColor: "#3b82f6" }} />
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, background: badgeColor, color: "#fff", fontWeight: 700, fontSize: 12 }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, fontWeight: 700, color: textSecondary }}>
                      {row.type}
                    </td>
                    <td style={{ padding: "16px 10px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: textPrimary, fontSize: 15 }}>{row.name}</span>
                        {isNew && <span style={{ background: "#fef08a", color: "#854d0e", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 10 }}>N</span>}
                      </div>
                      <div style={{ fontSize: 14, color: textSecondary, fontWeight: 600 }}>{row.phone}</div>
                    </td>
                    <td style={{ padding: "16px 10px", verticalAlign: "middle" }}>
                      <div style={{ fontWeight: 600, color: textPrimary, fontSize: 14, marginBottom: 4 }}>{row.area}</div>
                      <div style={{ fontSize: 13, color: textSecondary }}>{row.budget}</div>
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 13, color: textSecondary }}>
                      {row.source}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 13, color: textSecondary }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button style={{ height: 30, padding: "0 10px", background: darkMode ? "#374151" : "#f1f5f9", color: textPrimary, border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                          상세보기
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
      
      {/* 새 고객 등록 모달 */}
      {isModalOpen && (
        <CustomerModal 
          theme={theme} 
          memberId={memberId} 
          onClose={() => setIsModalOpen(false)} 
          onSave={fetchAllCustomers} 
        />
      )}

      {/* 고객 상세 패널 (슬라이드 아웃) */}
      {selectedCustomerId && (
        <CustomerDetailPanel 
          theme={theme} 
          customerId={selectedCustomerId as string} 
          customer={dbCustomers.find(c => c.id === selectedCustomerId)}
          onClose={() => { setSelectedCustomerId(null); fetchAllCustomers(); }} 
        />
      )}
    </div>
  );
}
