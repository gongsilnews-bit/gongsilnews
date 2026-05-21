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
                  background: customer.type.includes("구해요") || customer.type.includes("임차") || customer.type.includes("매수")
                    ? (darkMode ? "rgba(59, 130, 246, 0.15)" : "#eff6ff")
                    : customer.type.includes("내놔요") || customer.type.includes("임대인") || customer.type.includes("매도") || customer.type.includes("임대")
                    ? (darkMode ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5")
                    : (darkMode ? "rgba(156, 163, 175, 0.15)" : "#f3f4f6"),
                  color: customer.type.includes("구해요") || customer.type.includes("임차") || customer.type.includes("매수")
                    ? "#3b82f6"
                    : customer.type.includes("내놔요") || customer.type.includes("임대인") || customer.type.includes("매도") || customer.type.includes("임대")
                    ? "#10b981"
                    : "#4b5563",
                  border: `1px solid ${
                    customer.type.includes("구해요") || customer.type.includes("임차") || customer.type.includes("매수")
                      ? "rgba(59, 130, 246, 0.2)"
                      : customer.type.includes("내놔요") || customer.type.includes("임대인") || customer.type.includes("매도") || customer.type.includes("임대")
                      ? "rgba(16, 185, 129, 0.2)"
                      : "rgba(156, 163, 175, 0.2)"
                  }`
                }}>
                  {customer.type}
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
        <div style={{ padding: "20px 24px", borderBottom: `8px solid ${darkMode ? "#1f2023" : "#f1f5f9"}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px", fontSize: 14 }}>
            <div style={{ color: textSecondary, fontWeight: 600 }}>유입 경로</div>
            <div style={{ color: textPrimary, fontWeight: 700 }}>{customer.source}</div>
            <div style={{ color: textSecondary, fontWeight: 600 }}>희망 지역</div>
            <div style={{ color: textPrimary, fontWeight: 700 }}>{customer.area}</div>
            <div style={{ color: textSecondary, fontWeight: 600 }}>가용 예산</div>
            <div style={{ color: textPrimary, fontWeight: 700 }}>{customer.budget}</div>
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

        {/* 타임라인 (메모) 영역 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", background: darkMode ? "#222" : "#fff", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: textPrimary }}>상담 타임라인 (메모)</h3>
          
          {/* 메모 입력창 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, padding: "16px", background: darkMode ? "#2c2d31" : "#f8fafc", borderRadius: 12, border: `1px solid ${border}` }}>
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

          {/* 타임라인 로그 리스트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 최근 순으로 뒤집어서 보여줌 */}
            {[...memos].reverse().map(memo => {
              const dt = new Date(memo.created_at);
              const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={memo.id} style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 2, background: border, position: "relative", marginTop: 8 }}>
                    <div style={{ position: "absolute", top: 0, left: -4, width: 10, height: 10, borderRadius: "50%", background: memo.type === "system" ? "#9ca3af" : "#3b82f6" }} />
                  </div>
                  <div style={{ flex: 1, paddingBottom: 16 }}>
                    <div style={{ fontSize: 12, color: textSecondary, marginBottom: 4, fontWeight: 600 }}>{dateStr}</div>
                    <div style={{ 
                      fontSize: 14, color: memo.type === "system" ? textSecondary : textPrimary,
                      padding: memo.type === "system" ? 0 : "12px 16px",
                      background: memo.type === "system" ? "transparent" : (darkMode ? "#2c2d31" : "#f8fafc"),
                      borderRadius: memo.type === "system" ? 0 : 8,
                      border: memo.type === "system" ? "none" : `1px solid ${border}`,
                      fontStyle: memo.type === "system" ? "italic" : "normal"
                    }}>
                      {memo.content}
                    </div>
                  </div>
                </div>
              );
            })}
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
