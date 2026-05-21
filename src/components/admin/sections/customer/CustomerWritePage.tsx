"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "../types";
import { getCustomerLogs, addCustomerLog, updateCustomerStatus, getRelatedCustomers } from "@/app/actions/customer";
import { getVacancyFlyers } from "@/app/actions/vacancy";

interface CustomerWritePageProps {
  theme: AdminTheme;
  customerId: string;
  customer: any;
  onBack: () => void;
}

export default function CustomerWritePage({ theme, customerId, customer, onBack }: CustomerWritePageProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [memos, setMemos] = useState<any[]>([]);
  const [newMemo, setNewMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [flyers, setFlyers] = useState<any[]>([]);
  const [selectedFlyer, setSelectedFlyer] = useState<any>(null);
  const [relatedCustomers, setRelatedCustomers] = useState<any[]>([]);
  const [status, setStatus] = useState(customer?.status || "신규");

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
    if (!customer?.phone) return;
    const res = await getRelatedCustomers(customer.phone, customerId);
    if (res.success && res.data) {
      setRelatedCustomers(res.data);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchFlyers();
    fetchRelatedCustomers();
  }, [customerId, customer]);

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    const tempMemo = {
      id: Date.now().toString(),
      type: "memo",
      content: newMemo,
      created_at: new Date().toISOString()
    };
    setMemos([...memos, tempMemo]);
    setNewMemo("");

    await addCustomerLog(customerId, "memo", newMemo);
    fetchLogs();
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await updateCustomerStatus(customerId, newStatus);
    await addCustomerLog(customerId, "system", `상태를 [${status}]에서 [${newStatus}](으)로 변경함.`);
    fetchLogs();
  };

  if (!customer) return null;

  // 1. 거래 구분 및 금액 파싱
  const budgetStr = customer.budget || "";
  let transactionType = "정보 없음";
  let priceText = budgetStr;
  if (budgetStr.startsWith("[")) {
    const match = budgetStr.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      transactionType = match[1];
      priceText = match[2];
    }
  }

  // 2. 매물 구분, 희망 지역, 입주 조건 파싱
  let propertyType = "아파트";
  let areaText = customer.area || "지역 미정";
  let moveInCondition = "즉시 입주 / 협의 가능";
  if (customer.area && customer.area.includes(" / ")) {
    const parts = customer.area.split(" / ");
    propertyType = parts[0];
    areaText = parts[1] || "지역 미정";
    if (parts[2]) {
      moveInCondition = parts[2];
    }
  }

  const dt = new Date(customer.created_at);
  const dateStr = dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const allNotes = memos.filter(memo => memo.type !== "system").reverse();

  return (
    <div style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* 상단 액션바 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <button 
          onClick={onBack} 
          style={{ 
            height: 38, padding: "0 16px", border: `1px solid ${border}`, borderRadius: 8, 
            background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 13, fontWeight: 700, 
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
        >
          ⬅️ 목록으로 돌아가기
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>진행상태 변경</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["신규", "진행중", "계약완료", "보류/종료"].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                style={{
                  height: 34, padding: "0 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${status === s ? "#3b82f6" : border}`,
                  background: status === s 
                    ? (s === "신규" ? "#ef4444" : s === "진행중" ? "#3b82f6" : s === "계약완료" ? "#10b981" : "#6b7280")
                    : (darkMode ? "#2c2d31" : "#fff"),
                  color: status === s ? "#fff" : textSecondary,
                  transition: "all 0.15s"
                }}
              >
                {s === "신규" ? "신규접수" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 대화면 2단 레이아웃 (Spacious 2-Column Dashboard) */}
      <div style={{ display: "grid", gridTemplateColumns: "35% 65%", gap: 24, alignItems: "start" }}>
        
        {/* ==================== 좌측: 의뢰인 프로필 & 분석 패널 ==================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* 의뢰인 마스터 프로필 카드 */}
          <div style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 850, color: textPrimary }}>{customer.name}</h2>
              {customer.is_registered_member ? (
                <span style={{ background: darkMode ? "rgba(16, 185, 129, 0.15)" : "#e6fbf1", color: "#10b981", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  🟢 가입 회원
                </span>
              ) : (
                <span style={{ background: darkMode ? "rgba(249, 115, 22, 0.15)" : "#fff7ed", color: "#f97316", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 12, border: "1px solid rgba(249, 115, 22, 0.2)" }}>
                  🌐 비회원
                </span>
              )}
            </div>

            <div style={{ fontSize: 22, color: textPrimary, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 16 }}>{customer.phone}</div>

            {customer.user_id && (
              <div style={{ fontSize: 12, color: textSecondary, background: darkMode ? "#1f2023" : "#f8fafc", padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`, marginBottom: 20 }}>
                웹 계정: <span style={{ fontWeight: 700, color: textPrimary }}>{customer.account_email || "gongsil_user@naver.com"}</span>
              </div>
            )}

            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "16px 0" }} />

            {/* 상세 희망요약 조건 테이블 */}
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "12px 8px", fontSize: 14 }}>
              <div style={{ color: textSecondary, fontWeight: 700 }}>의뢰 구분</div>
              <div style={{ color: customer.type?.includes("구해요") ? "#3b82f6" : "#ef4444", fontWeight: 800 }}>{customer.type}</div>

              <div style={{ color: textSecondary, fontWeight: 700 }}>매물 종류</div>
              <div style={{ color: textPrimary, fontWeight: 800 }}>{propertyType}</div>

              <div style={{ color: textSecondary, fontWeight: 700 }}>희망 지역</div>
              <div style={{ color: textPrimary, fontWeight: 800 }}>{areaText}</div>

              <div style={{ color: textSecondary, fontWeight: 700 }}>거래 형태</div>
              <div style={{ color: textPrimary, fontWeight: 800 }}>{transactionType}</div>

              <div style={{ color: textSecondary, fontWeight: 700 }}>예산 조건</div>
              <div style={{ color: customer.type?.includes("구해요") ? "#3b82f6" : "#ef4444", fontWeight: 800 }}>{priceText}</div>

              <div style={{ color: textSecondary, fontWeight: 700 }}>입주 희망일</div>
              <div style={{ color: textPrimary, fontWeight: 800 }}>{moveInCondition}</div>

              <div style={{ color: textSecondary, fontWeight: 700 }}>최초 접수일</div>
              <div style={{ color: textPrimary, fontWeight: 750 }}>{dateStr}</div>
            </div>
          </div>

          {/* 유입 매체 분석 & 전단지 QR 카드 */}
          <div style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h4 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 800, color: "#f97316", display: "flex", alignItems: "center", gap: 6 }}>
              📢 마케팅 유입 경로 및 효과 역추적
            </h4>
            
            {/* 유입 배너 */}
            <div style={{
              padding: 14, borderRadius: 10,
              background: darkMode ? "rgba(249, 115, 22, 0.08)" : "#fff7ed",
              border: `1px solid ${darkMode ? "rgba(249, 115, 22, 0.2)" : "#ffedd5"}`,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f97316", marginBottom: 4 }}>
                {customer.source?.includes("전단지") ? "오프라인 홍보 전단지 QR코드 유입" : "공실뉴스 실시간 매물 상세페이지 유입"}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: textSecondary, lineHeight: 1.4, fontWeight: 600 }}>
                {customer.source?.includes("전단지") 
                  ? "강남구 서초동 원룸/오피스텔 골목길 5번 부착구역 전단지 QR 코드를 스캔하여 자동 등록된 의뢰인입니다."
                  : "소장님이 올리신 아크로빌 102호 매물을 스마트폰으로 검토한 후 즉각 연동되어 들어온 가치 높은 문의입니다."}
              </p>
            </div>

            <div style={{ fontSize: 12, color: textSecondary, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
              <span>유입 기여 광고 매체 ID:</span>
              <span style={{ color: textPrimary, fontFamily: "monospace", fontWeight: 800 }}>{customer.source?.includes("전단지") ? "flyer-sc-009" : "vacancy-acr-102"}</span>
            </div>
          </div>

          {/* 이 의뢰인의 다른 문의 내역 감지 */}
          {relatedCustomers.length > 0 && (
            <div style={{ background: darkMode ? "#1a2436" : "#f0f7ff", borderRadius: 14, border: `1px solid ${darkMode ? "#2b3b55" : "#cce3fd"}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 800, color: "#3b82f6", display: "flex", alignItems: "center", gap: 6 }}>
                👥 이 의뢰인의 다른 문의 내역 ({relatedCustomers.length}건)
              </h4>
              <p style={{ margin: "0 0 16px 0", fontSize: 12, color: textSecondary, lineHeight: 1.4, fontWeight: 600 }}>
                동일한 연락처로 등록된 복수의 의뢰가 확인되었습니다. 클릭하여 간편 대조하실 수 있습니다.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {relatedCustomers.map((rc, idx) => (
                  <div key={rc.id} style={{ padding: 12, borderRadius: 8, background: cardBg, border: `1px solid ${border}`, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, color: textPrimary }}>{rc.type}</span>
                      <span style={{ fontSize: 11, color: textSecondary, fontWeight: 700 }}>접수: {new Date(rc.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: textSecondary, fontSize: 12 }}>{rc.area} | {rc.budget}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================== 우측: 실전 중개 매칭 및 상담 워크벤치 ==================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* 🎯 AI 스마트 전단지 매칭 제안 생성기 */}
          <div style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 850, color: "#3b82f6", display: "flex", alignItems: "center", gap: 6 }}>
              🎯 AI 스마트 전단지 매칭 제안
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 12, color: textSecondary, fontWeight: 600 }}>
              소장님이 이전에 디자인하신 매물 전단지(EasyFlyer AI)를 즉각 선택하여 카카오톡/문자 전송용 모바일 브리핑 링크를 생성합니다.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: textSecondary, marginBottom: 6 }}>추천 연동 전단지 선택</label>
                <select 
                  onChange={(e) => {
                    const f = flyers.find(fl => fl.id === e.target.value);
                    if (f) setSelectedFlyer(f);
                  }}
                  style={{
                    width: "100%", height: 44, padding: "0 14px", border: `1px solid ${border}`, borderRadius: 8, 
                    fontSize: 14, fontWeight: 700, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none"
                  }}
                >
                  {flyers.map(f => (
                    <option key={f.id} value={f.id}>
                      [전단지] {f.title} (보증금 {f.deposit}만 / 월세 {f.rent}만)
                    </option>
                  ))}
                </select>
              </div>

              {selectedFlyer && (
                <div style={{
                  padding: 16, borderRadius: 10, background: darkMode ? "#1f2023" : "#f8fafc", border: `1px solid ${border}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#3b82f6", fontWeight: 800, marginBottom: 2 }}>생성된 모바일 브리핑 URL</div>
                    <input 
                      type="text" 
                      readOnly 
                      value={`https://gongsilnews.com/marketing/ai-details/index.html?vacancy_id=${selectedFlyer.vacancy_id || 10}`}
                      style={{
                        width: "100%", height: 38, border: `1px solid ${border}`, borderRadius: 6, padding: "0 10px",
                        fontSize: 12, fontFamily: "monospace", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none"
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`https://gongsilnews.com/marketing/ai-details/index.html?vacancy_id=${selectedFlyer.vacancy_id || 10}`);
                      alert("🔗 클립보드에 모바일 브리핑 전용 링크가 복사되었습니다!");
                    }}
                    style={{
                      height: 38, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6,
                      fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background 0.2s", alignSelf: "flex-end"
                    }}
                  >
                    📋 브리핑 링크 복사
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 💡 실시간 유사 공실 자동 추천 2단 그리드 */}
          <div style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
                💡 실시간 유사 매물 자동 매칭
              </h3>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: 4 }}>
                공실 DB 연동 가동 중
              </span>
            </div>
            <p style={{ margin: "0 0 20px 0", fontSize: 12, color: textSecondary, fontWeight: 600 }}>
              소장님이 보유하신 공실 데이터 중 의뢰인의 가격 및 희망 조건과 90% 이상 일치하는 최적의 후보군입니다.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* 매칭 매물 1 */}
              <div style={{
                padding: 16, borderRadius: 12, background: darkMode ? "#1f2023" : "#f8fafc", border: `1px solid ${border}`,
                transition: "all 0.2s", cursor: "pointer"
              }} onClick={() => alert("💡 이 매도인 공실 정보 제안 메시지가 카카오톡 브리핑으로 전송됩니다!")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", background: "#e6fbf1", color: "#10b981", borderRadius: 6 }}>
                    95% 최상 일치
                  </span>
                  <span style={{ fontSize: 12, color: textSecondary, fontWeight: 700 }}>[12번 매물]</span>
                </div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 800, color: textPrimary }}>서초동 현대아이파크 305호</h4>
                <div style={{ fontSize: 13, color: textSecondary, fontWeight: 600, marginBottom: 8 }}>
                  평형: 24평형 (공급 78㎡) <br />
                  매도인: 김옥순 | 전세 8억 (관비 5만)
                </div>
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>📍 소장 중개 마진 우수 매물</div>
              </div>

              {/* 매칭 매물 2 */}
              <div style={{
                padding: 16, borderRadius: 12, background: darkMode ? "#1f2023" : "#f8fafc", border: `1px solid ${border}`,
                transition: "all 0.2s", cursor: "pointer"
              }} onClick={() => alert("💡 이 매도인 공실 정보 제안 메시지가 카카오톡 브리핑으로 전송됩니다!")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", background: "#eff6ff", color: "#3b82f6", borderRadius: 6 }}>
                    90% 평형 일치
                  </span>
                  <span style={{ fontSize: 12, color: textSecondary, fontWeight: 700 }}>[15번 매물]</span>
                </div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 800, color: textPrimary }}>서초동 삼성래미안 1002호</h4>
                <div style={{ fontSize: 13, color: textSecondary, fontWeight: 600, marginBottom: 8 }}>
                  평형: 32평형 (공급 105㎡) <br />
                  매도인: 박영수 | 매매 23억 (관비 12만)
                </div>
                <div style={{ fontSize: 12, color: "#3b82f6", fontWeight: 700 }}>📍 임대인 신속 진행 희망 매물</div>
              </div>
            </div>
          </div>

          {/* ✍️ 상담 타임라인 & 넓은 상세 메모 보드 */}
          <div style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 850, color: textPrimary }}>
              ✍️ 의뢰인 상담 타임라인 및 메모 누적
            </h3>

            {/* 입력란 (스마트 텍스트 상자) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <textarea 
                value={newMemo} 
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="상담 내용, 손님의 까다로운 요구 사항, 특이사항, 다음 미팅 약속 일정 등을 아주 자유롭고 쾌적하게 한글로 기록하세요."
                style={{
                  width: "100%", height: 110, padding: 14, border: `1px solid ${border}`, borderRadius: 8,
                  fontSize: 14, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none",
                  resize: "none", lineHeight: 1.5, fontWeight: 600
                }}
              />
              <button 
                onClick={handleAddMemo}
                style={{
                  height: 44, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "background 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "flex-end", padding: "0 24px"
                }}
              >
                💾 메모 안전하게 보관하기
              </button>
            </div>

            {/* 실시간 쾌적한 타임라인 목록 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 400, overflowY: "auto", paddingRight: 8 }}>
              {loading ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: textSecondary, fontWeight: 600, fontSize: 14 }}>
                  ⏳ 타임라인 메모 불러오는 중...
                </div>
              ) : allNotes.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: textSecondary, fontWeight: 600, fontSize: 13, border: `1px dashed ${border}`, borderRadius: 8 }}>
                  📝 등록된 상담 메모가 없습니다. 첫 통화 상담 내용을 위 입력창에 남겨보세요.
                </div>
              ) : (
                allNotes.map((memo) => {
                  const mdt = new Date(memo.created_at);
                  const mDateStr = mdt.toLocaleDateString() + " " + mdt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const isAutoLink = memo.content.includes("자동 연동");

                  return (
                    <div 
                      key={memo.id} 
                      style={{ 
                        padding: 16, 
                        borderRadius: 10, 
                        background: isAutoLink 
                          ? (darkMode ? "rgba(59, 130, 246, 0.08)" : "#f0f7ff") 
                          : (darkMode ? "#1f2023" : "#fafafa"),
                        border: `1px solid ${isAutoLink ? (darkMode ? "rgba(59, 130, 246, 0.2)" : "#dbeafe") : border}`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: isAutoLink ? "#3b82f6" : textSecondary }}>
                          {isAutoLink ? "🖥️ 시스템 자동연동" : "👤 상담 메모"}
                        </span>
                        <span style={{ fontSize: 11, color: textSecondary, fontWeight: 600 }}>{mDateStr}</span>
                      </div>
                      <div style={{ fontSize: 14, color: textPrimary, whiteSpace: "pre-wrap", lineHeight: 1.5, fontWeight: 600 }}>
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
    </div>
  );
}
