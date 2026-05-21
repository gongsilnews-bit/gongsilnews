"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "../types";
import { getCustomerLogs, addCustomerLog, updateCustomerStatus, getRelatedCustomers, getCustomerDetail } from "@/app/actions/customer";
import { getVacancyFlyers } from "@/app/actions/vacancy";

interface CustomerDetailPanelProps {
  theme: AdminTheme;
  customerId: string;
  customer?: any;
  onClose: () => void;
}

export default function CustomerDetailPanel({ theme, customerId, customer, onClose }: CustomerDetailPanelProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  
  const [localCustomer, setLocalCustomer] = useState<any>(customer || null);
  const [customerLoading, setCustomerLoading] = useState(!customer);
  
  // API로 연동할 데이터
  const [memos, setMemos] = useState<any[]>([]);
  const [newMemo, setNewMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [flyers, setFlyers] = useState<any[]>([]);
  const [selectedFlyer, setSelectedFlyer] = useState<any>(null);
  const [relatedCustomers, setRelatedCustomers] = useState<any[]>([]);

  const loadCustomer = async () => {
    if (!customer || String(customer.id) !== String(customerId)) {
      setCustomerLoading(true);
      const res = await getCustomerDetail(customerId);
      if (res.success && res.data) {
        setLocalCustomer(res.data);
      }
      setCustomerLoading(false);
    } else {
      setLocalCustomer(customer);
      setCustomerLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    const res = await getCustomerLogs(customerId);
    if (res.success && res.data) {
      setMemos(res.data);
    }
    setLoading(false);
  };

  const fetchFlyers = async () => {
    const res = await getVacancyFlyers();
    if (res.success && res.data) {
      setFlyers(res.data);
      if (res.data.length > 0) {
        setSelectedFlyer(res.data[0]);
      }
    }
  };

  const fetchRelatedCustomers = async () => {
    if (!localCustomer?.phone) return;
    const res = await getRelatedCustomers(localCustomer.phone, customerId);
    if (res.success && res.data) {
      setRelatedCustomers(res.data);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [customerId, customer]);

  useEffect(() => {
    if (localCustomer) {
      fetchLogs();
      fetchFlyers();
      fetchRelatedCustomers();
    }
  }, [customerId, localCustomer]);

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    
    // UI에 먼저 반영
    const tempMemo = {
      id: Date.now().toString(),
      type: "memo",
      content: newMemo,
      created_at: new Date().toISOString()
    };
    setMemos([...memos, tempMemo]);
    setNewMemo("");
    
    // DB 저장
    await addCustomerLog(customerId, "memo", newMemo);
    fetchLogs(); // 재조회
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!localCustomer) return;
    const newStatus = e.target.value;
    
    // DB 업데이트
    await updateCustomerStatus(customerId, newStatus);
    await addCustomerLog(customerId, "system", `상태를 [${localCustomer.status}]에서 [${newStatus}](으)로 변경함.`);
    setLocalCustomer((prev: any) => ({ ...prev, status: newStatus }));
    fetchLogs();
  };

  if (customerLoading) {
    return (
      <div style={{ flex: 1, padding: 40, textAlign: "center", color: textSecondary, background: bg, fontSize: 14 }}>
        문의 상세 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!localCustomer) {
    return (
      <div style={{ flex: 1, padding: 40, textAlign: "center", color: textSecondary, background: bg, fontSize: 14 }}>
        문의 정보를 찾을 수 없습니다.
      </div>
    );
  }

  // 1. 거래 구분 및 금액 파싱
  const budgetStr = localCustomer.budget || "";
  let transactionType = "정보 없음";
  let priceText = budgetStr;
  
  if (budgetStr.startsWith("[")) {
    const match = budgetStr.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      transactionType = match[1]; // "매매", "월세", "전세" 등
      priceText = match[2]; // "매매 21억 (관비 10)"
    }
  }

  // 1-2. 매물 구분, 희망 지역, 입주 조건 파싱
  let propertyType = "아파트";
  let areaText = localCustomer.area || "지역 미정";
  let moveInCondition = "즉시 입주 / 협의 가능";
  if (localCustomer.area && localCustomer.area.includes(" / ")) {
    const parts = localCustomer.area.split(" / ");
    propertyType = parts[0];
    areaText = parts[1] || "지역 미정";
    if (parts[2]) {
      moveInCondition = parts[2];
    }
  }

  // 2. 접수일 포맷팅
  const dt = new Date(localCustomer.created_at);
  const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 3. 상담 메모 파싱 (전체 메모를 역순으로 렌더링)
  const allNotes = memos.filter(memo => memo.type !== "system").reverse();

  return (
    <div style={{
      display: "flex", gap: "24px", padding: "20px 28px", background: bg, minHeight: "100%", width: "100%", overflowY: "auto"
    }}>
      {/* 좌측 상세 정보 영역 */}
      <div style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
        
        {/* 상단 컨트롤 바 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: cardBg, padding: "16px 24px", borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`, borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>
            ← 문의 목록
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>진행상태</span>
            <select value={localCustomer.status} onChange={handleStatusChange}
              style={{
                height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, 
                fontSize: 13, fontWeight: 700,
                color: textPrimary,
                background: darkMode ? "#1f2023" : "#fff", outline: "none"
            }}>
              <option value="신규">신규접수</option>
              <option value="진행중">진행중</option>
              <option value="계약완료">계약 완료</option>
              <option value="보류/종료">보류 및 종료</option>
            </select>
          </div>
        </div>

        {/* 메인 상세 정보 카드 */}
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          {/* 고객 기본 정보 */}
          <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 850, color: textPrimary }}>{localCustomer.name}</h2>
              <span style={{ 
                fontSize: 13, 
                fontWeight: 800, 
                padding: "4px 12px", 
                borderRadius: 30,
                background: localCustomer.source?.includes("오프라인")
                  ? (darkMode ? "rgba(245, 158, 11, 0.15)" : "#fef3c7")
                  : (darkMode ? "rgba(59, 130, 246, 0.15)" : "#eff6ff"),
                color: localCustomer.source?.includes("오프라인") ? "#d97706" : "#3b82f6",
                border: `1px solid ${
                  localCustomer.source?.includes("오프라인") ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)"
                }`
              }}>
                {localCustomer.source || "유입 정보 없음"}
              </span>
              {localCustomer.user_id && (
                <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: 4 }}>
                  가입회원
                </span>
              )}
            </div>
            
            <div style={{ fontSize: 20, color: textPrimary, fontWeight: 800, letterSpacing: "-0.5px" }}>{localCustomer.phone}</div>
            
            {localCustomer.user_id && (
              <div style={{ marginTop: 12, fontSize: 12, color: textSecondary, background: darkMode ? "#1f2023" : "#f8fafc", padding: "8px 12px", borderRadius: 6, border: `1px solid ${border}`, display: "inline-block" }}>
                웹사이트 계정: <span style={{ fontWeight: 700, color: textPrimary }}>{localCustomer.account_email}</span>
              </div>
            )}
          </div>

          {/* 상세 요약 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "20px 16px", fontSize: 15 }}>
            <div style={{ color: textSecondary, fontWeight: 700 }}>의뢰 구분</div>
            <div style={{ 
              color: localCustomer.type?.includes("구해요") || localCustomer.type?.includes("임차") || localCustomer.type?.includes("매수") ? "#3b82f6" : "#ef4444", 
              fontWeight: 800 
            }}>
              {localCustomer.type}
            </div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>매물 구분</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{propertyType}</div>

            <div style={{ color: textSecondary, fontWeight: 700 }}>희망 지역</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{areaText}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>거래 구분</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{transactionType}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>금액 / 예산</div>
            <div style={{ 
              color: localCustomer.type?.includes("구해요") || localCustomer.type?.includes("임차") || localCustomer.type?.includes("매수") ? "#3b82f6" : "#ef4444", 
              fontWeight: 800 
            }}>{priceText}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>입주 조건</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{moveInCondition}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>접수일시</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{dateStr}</div>
          </div>
        </div>

      </div>

      {/* 우측 상담 기록(상담 메모) 영역 */}
      <div style={{ width: 400, display: "flex", flexDirection: "column", gap: "20px", flexShrink: 0 }}>
        
        {/* 메모 입력 및 내역 카드 */}
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: textPrimary }}>📝 상담 기록 작성</h3>
          
          {/* 메모 입력창 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "16px", background: darkMode ? "#2c2d31" : "#f8fafc", borderRadius: 12, border: `1px solid ${border}` }}>
            <textarea 
              value={newMemo} onChange={(e) => setNewMemo(e.target.value)}
              placeholder="상담 내용, 특이사항, 다음 약속일정 등을 기록해 보세요."
              style={{ width: "100%", height: 80, padding: 0, border: "none", background: "transparent", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleAddMemo} style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                기록 등록
              </button>
            </div>
          </div>

          <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 800, color: textPrimary, borderTop: `1px solid ${border}`, paddingTop: "16px" }}>📋 상담 이력</h3>
          
          {/* 상담 이력 리스트 */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
            {allNotes.length === 0 ? (
              <div style={{ fontSize: 14, color: textSecondary, textAlign: "center", padding: "40px 0" }}>
                등록된 상담 기록이 없습니다.
              </div>
            ) : (
              allNotes.map(memo => {
                const dt = new Date(memo.created_at);
                const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={memo.id} style={{ 
                    padding: "16px", 
                    background: darkMode ? "#2c2d31" : "#f8fafc", 
                    borderRadius: 12, 
                    border: `1px solid ${border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}>
                    <div style={{ fontSize: 11, color: textSecondary, fontWeight: 700 }}>{dateStr}</div>
                    <div style={{ fontSize: 14, color: textPrimary, fontWeight: 600, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {memo.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
