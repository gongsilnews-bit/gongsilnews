"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "../types";
import { getCustomerLogs, addCustomerLog, updateCustomerStatus } from "@/app/actions/customer";
import { getVacancyFlyers } from "@/app/actions/vacancy";

interface CustomerDetailPanelProps {
  theme: AdminTheme;
  customerId: string;
  customer: any;
  onClose: () => void;
}

export default function CustomerDetailPanel({ theme, customerId, customer, onClose }: CustomerDetailPanelProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  
  // API로 연동할 데이터
  const [memos, setMemos] = useState<any[]>([]);
  const [newMemo, setNewMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [flyers, setFlyers] = useState<any[]>([]);
  const [selectedFlyer, setSelectedFlyer] = useState<any>(null);

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

  useEffect(() => {
    fetchLogs();
    fetchFlyers();
  }, [customerId]);

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
    if (!customer) return;
    const newStatus = e.target.value;
    
    // DB 업데이트
    await updateCustomerStatus(customerId, newStatus);
    await addCustomerLog(customerId, "system", `상태를 [${customer.status}]에서 [${newStatus}](으)로 변경함.`);
    fetchLogs(); // 여기 하위 컴포넌트 로그 다시 불러오고, 부모 업데이트는 onClose 트리거로 처리하거나 이벤트를 주면 됩니다만 
                 // 지금 구현에서는 패널을 닫았다 열면 부모가 최신화 되므로 괜찮습니다.
  };

  if (!customer) {
    return null;
  }

  // 1. 거래 구분 및 금액 파싱
  const budgetStr = customer.budget || "";
  let transactionType = "정보 없음";
  let priceText = budgetStr;
  
  if (budgetStr.startsWith("[")) {
    const match = budgetStr.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      transactionType = match[1]; // "매매", "월세", "전세" 등
      priceText = match[2]; // "매매 21억 (관비 10)"
    }
  }

  // 2. 접수일 포맷팅
  const dt = new Date(customer.created_at);
  const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 3. 첫 메모 및 추가 메모 파싱
  const allNotes = memos.filter(memo => memo.type !== "system");
  const firstMemo = allNotes[0]?.content || "최초 접수 상담 메모 없음";
  const additionalNotes = allNotes.slice(1).reverse();

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.3)", zIndex: 9999,
      display: "flex", justifyContent: "flex-end"
    }}>
      {/* 백그라운드 클릭 시 닫기 */}
      <div style={{ flex: 1 }} onClick={onClose} />
      
      {/* 우측 슬라이드 패널 */}
      <div style={{
        width: 500, background: cardBg,
        boxShadow: "-4px 0 15px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.3s ease-out"
      }}>
        {/* 상단 프로필 헤더 */}
        <div style={{ padding: "24px", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 850, color: textPrimary }}>{customer.name}</h2>
                <span style={{ 
                  fontSize: 14, 
                  fontWeight: 800, 
                  padding: "4px 12px", 
                  borderRadius: 30,
                  background: customer.source?.includes("오프라인")
                    ? (darkMode ? "rgba(245, 158, 11, 0.15)" : "#fef3c7")
                    : (darkMode ? "rgba(59, 130, 246, 0.15)" : "#eff6ff"),
                  color: customer.source?.includes("오프라인") ? "#d97706" : "#3b82f6",
                  border: `1px solid ${
                    customer.source?.includes("오프라인") ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)"
                  }`
                }}>
                  {customer.source || "유입 정보 없음"}
                </span>
                {customer.user_id && (
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }} title="홈페이지 가입 회원">
                    가입회원
                  </span>
                )}
              </div>
              <div style={{ fontSize: 22, color: textPrimary, fontWeight: 800, letterSpacing: "-0.5px", marginTop: 4 }}>{customer.phone}</div>
              
              {/* 회원 ID 표시 박스 */}
              {customer.user_id && (
                <div style={{ marginTop: 8, fontSize: 12, color: textSecondary, background: darkMode ? "#1f2023" : "#fff", padding: "6px 10px", borderRadius: 6, border: `1px solid ${border}`, display: "inline-block" }}>
                  웹사이트 계정: <span style={{ fontWeight: 700, color: textPrimary }}>{customer.account_email}</span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, color: textSecondary, cursor: "pointer" }}>&times;</button>
          </div>

          {/* 상태 변경 셀렉트 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>현재 진행상태</span>
            <select value={customer.status} onChange={handleStatusChange}
              style={{
                height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, 
                fontSize: 14, fontWeight: 700,
                color: textPrimary,
                background: darkMode ? "#1f2023" : "#fff", outline: "none", flex: 1
            }}>
              <option value="신규">접수</option>
              <option value="진행중">진행중</option>
              <option value="계약완료">계약 완료</option>
              <option value="보류/종료">보류 및 종료</option>
            </select>
          </div>
        </div>

        {/* 상세 정보 테이블 요약 */}
        <div style={{ padding: "24px", borderBottom: `8px solid ${darkMode ? "#1f2023" : "#f1f5f9"}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "115px 1fr", gap: "16px", fontSize: 16 }}>
            <div style={{ color: textSecondary, fontWeight: 700 }}>구분</div>
            <div style={{ 
              color: customer.type?.includes("구해요") || customer.type?.includes("임차") || customer.type?.includes("매수") ? "#ef4444" : "#3b82f6", 
              fontWeight: 800 
            }}>
              {customer.type}
            </div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>희망 지역</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{customer.area}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>거래 구분</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{transactionType}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>금액</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{priceText}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>거래 희망일</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>즉시 입주 / 협의 가능</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>접수일</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{dateStr}</div>

            <div style={{ color: textSecondary, fontWeight: 700 }}>첫 메모</div>
            <div style={{ 
              color: textPrimary, 
              fontWeight: 700, 
              background: darkMode ? "#2c2d31" : "#f8fafc", 
              padding: "12px 16px", 
              borderRadius: 10, 
              border: `1px solid ${border}`,
              lineHeight: 1.5,
              fontSize: 14
            }}>
              {firstMemo}
            </div>
          </div>
        </div>

        {/* [공실 CRM 플러스] 유형별 B2B 프리미엄 특화 액션 카드 (임대인 전용) */}
        {(customer.type === "임대인" || customer.type.includes("임대") || customer.type.includes("매도")) && (
          /* [임대인 / 매도 공급측] 원클릭 공실등록 매핑 배너 */
          <div style={{ padding: "20px 24px", borderBottom: `8px solid ${darkMode ? "#1f2023" : "#f1f5f9"}`, background: darkMode ? "#1c2c22" : "#f0fdf4" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
              임대인 의뢰 광고 연동 서비스
            </h4>
            <p style={{ margin: "0 0 14px 0", fontSize: 12, color: darkMode ? "#a7f3d0" : "#047857", lineHeight: 1.5, fontWeight: 600 }}>
              접수된 매물의 상세 스펙(주소, 의뢰인 연락처, 예산 등)을 그대로 전송하여 3초 만에 <b>공실뉴스 광고 매물</b>로 등록할 수 있습니다.
            </p>
            <button 
              onClick={() => {
                const prefillParams = new URLSearchParams({
                  menu: "gongsil",
                  action: "write",
                  prefill_name: customer.name,
                  prefill_phone: customer.phone,
                  prefill_area: customer.area,
                  prefill_budget: customer.budget
                }).toString();
                alert(`[공실 CRM 플러스] 임대인 매물 데이터를 자동 연동하였습니다!\n\n• 임대인: ${customer.name}\n• 연락처: ${customer.phone}\n• 의뢰주소: ${customer.area}\n• 희망예산: ${customer.budget}\n\n확인 버튼을 누르면 공실광고 등록 화면으로 이동합니다.`);
                window.location.href = `/realty_admin?${prefillParams}`;
              }}
              style={{
                width: "100%", height: 38, background: "#10b981", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)", transition: "all 0.2s"
              }}
            >
              공실광고 즉시 등록하기 (양식 자동 완성)
            </button>
          </div>
        )}

        {/* 추가 메모 영역 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", background: darkMode ? "#222" : "#fff", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: textPrimary }}>추가 메모</h3>
          
          {/* 추가 메모 리스트 (상단 배치) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {additionalNotes.length === 0 ? (
              <div style={{ fontSize: 14, color: textSecondary, textAlign: "center", padding: "20px 0" }}>
                등록된 추가 메모가 없습니다.
              </div>
            ) : (
              additionalNotes.map(memo => {
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

          {/* 메모 입력창 (하단으로 배치 이동) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px", background: darkMode ? "#2c2d31" : "#f8fafc", borderRadius: 12, border: `1px solid ${border}` }}>
            <textarea 
              value={newMemo} onChange={(e) => setNewMemo(e.target.value)}
              placeholder="상담 내용, 특이사항, 다음 약속일정 등을 자유롭게 남겨보세요."
              style={{ width: "100%", height: 80, padding: 0, border: "none", background: "transparent", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleAddMemo} style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                메모 남기기
              </button>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
