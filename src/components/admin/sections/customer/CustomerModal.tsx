"use client";
import React, { useState } from "react";
import { AdminTheme } from "../types";
import { createCustomer } from "@/app/actions/customer";

interface CustomerModalProps {
  theme: AdminTheme;
  memberId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function CustomerModal({ theme, memberId, onClose, onSave }: CustomerModalProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "매물구해요",       // 손님 구분 (매물내놔요, 매물구해요, 공동중개, 기타)
    property_type: "아파트", // 매물 구분
    source: "오프라인(워크인)", // 유입 경로 (유입방법)
    transaction_type: "월세", // 거래 구분 (매매, 전세, 월세)
    price_buy: "",          // 매매가
    price_deposit: "",      // 보증금 / 전세금
    price_monthly: "",      // 월세
    price_maintenance: "",  // 관리비
    budget: "",             // 기타용 단일 금액 필드
    area: "",               // 지역 / 주소
    notes: ""               // 상담 메모
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("⚠️ 고객 이름을 입력해 주세요 (필수).");
      return;
    }
    if (!formData.phone.trim()) {
      alert("⚠️ 연락처를 입력해 주세요 (필수).");
      return;
    }
    if (!formData.role) {
      alert("⚠️ 구분을 선택해 주세요 (필수).");
      return;
    }
    
    // 구분(role) 값을 바로 type 컬럼에 매핑!
    const typeLabel = formData.role;
    
    // 매물구분(property_type)을 지역(area) 필드와 슬래시로 결합하여 매핑!
    const areaLabel = formData.property_type 
      ? `${formData.property_type} / ${formData.area || "지역미정"}`
      : formData.area || "지역미정";

    // 상세 거래 정보 문자열 구성! (예: "[월세] 보증금 5,000/120 (관비 10)")
    let budgetString = "";
    if (formData.role === "매물구해요" || formData.role === "매물내놔요") {
      const parts = [];
      parts.push(`[${formData.transaction_type}]`);
      if (formData.transaction_type === "매매" && formData.price_buy) {
        parts.push(`매매 ${formData.price_buy}`);
      } else if (formData.transaction_type === "전세" && formData.price_deposit) {
        parts.push(`전세(보증금) ${formData.price_deposit}`);
      } else if (formData.transaction_type === "월세") {
        if (formData.price_deposit || formData.price_monthly) {
          parts.push(`보증금 ${formData.price_deposit || 0}/${formData.price_monthly || 0}`);
        }
      }
      if (formData.price_maintenance) {
        parts.push(`(관비 ${formData.price_maintenance})`);
      }
      budgetString = parts.join(" ") || "금액 협의";
    } else {
      budgetString = formData.budget || "금액 협의";
    }

    setLoading(true);
    const res = await createCustomer(memberId, {
      name: formData.name,
      phone: formData.phone,
      type: typeLabel,
      budget: budgetString,
      area: areaLabel,
      source: formData.source,
      notes: formData.notes
    });
    setLoading(false);
    
    if (res.success) {
      alert("🎉 고객 정보가 등록되었습니다!");
      onSave(); // 부모 컴포넌트 데이터 갱신
      onClose();
    } else {
      alert("오류가 발생했습니다: " + res.message);
    }
  };

  // 금액(budget) 라벨 및 플레이스홀더 (기타용)
  const budgetLabelText = "금액 / 예산 조건";
  const budgetPlaceholderText = "예: 금액 조건 없음 등 자유 기입";

  // 지역(area) 라벨 및 플레이스홀더 동적 연동
  const areaLabelText = formData.role === "매물내놔요"
    ? "보유 건물 주소 (상세호수) *"
    : formData.role === "기타"
    ? "관련 지역 / 주소"
    : "희망 지역 / 입주 조건 *";

  const areaPlaceholderText = formData.role === "매물내놔요"
    ? "예: 서초동 아크로빌라 102호"
    : formData.role === "기타"
    ? "예: 전국구 / 강남권 등 자유 기입"
    : "예: 강남역 도보 5분 인근";

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: cardBg, 
        width: 520, 
        borderRadius: 16,
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        border: `1px solid ${border}`,
        animation: "modalFadeIn 0.25s ease-out"
      }}>
        {/* 모달 헤더 */}
        <div style={{
          padding: "20px 24px", 
          borderBottom: `1px solid ${border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: darkMode ? "#2c2d31" : "#f9fafb"
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
            👤 새 고객 등록
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 24, 
            color: textSecondary, cursor: "pointer", 
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            &times;
          </button>
        </div>

        {/* 모달 바디 (상세 폼 영역) */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "70vh" }}>
          
          {/* 1, 2. 이름 및 연락처 (필수) */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
                고객 이름 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="예: 홍길동"
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14 }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
                연락처 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="010-0000-0000"
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14 }} 
              />
            </div>
          </div>

          {/* 3. 손님 구분 및 유입 경로 (Side-by-Side!) */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
                손님 구분 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select name="role" value={formData.role} onChange={handleChange}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14, fontWeight: 700 }}>
                <option value="매물구해요">🔎 매물구해요 (임차 / 매수 손님)</option>
                <option value="매물내놔요">📢 매물내놔요 (임대 / 매도 의뢰)</option>
                <option value="기타">☕ 기타 (일반 문의 / 기타)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
                유입 경로 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select name="source" value={formData.source} onChange={handleChange}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14, fontWeight: 700 }}>
                <option value="전화 문의">📞 전화 문의</option>
                <option value="오프라인(워크인)">👣 오프라인 (워크인 방문)</option>
                <option value="네이버 광고">💚 네이버 광고 (플레이스 등)</option>
                <option value="공실뉴스">📰 공실뉴스 웹사이트</option>
                <option value="기타">☕ 기타 경로</option>
              </select>
            </div>
          </div>

          {/* 📢 매물내놔요 또는 🔎 매물구해요 일때 거래구분 및 초정밀 금액 입력 영역 */}
          {(formData.role === "매물구해요" || formData.role === "매물내놔요") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px", background: darkMode ? "#242528" : "#f3f4f6", borderRadius: 12, border: `1px solid ${border}` }}>
              {/* 매물 구분 (카드 내부 최상단 배치!) */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>🏢 매물 구분</label>
                <select name="property_type" value={formData.property_type} onChange={handleChange}
                  style={{ 
                    width: "100%", height: 38, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, 
                    background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", 
                    fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}>
                  <option value="아파트">🏢 아파트</option>
                  <option value="빌라/다세대">🏡 빌라 / 다세대</option>
                  <option value="상가/사무실">💼 상가 / 사무실</option>
                  <option value="오피스텔">🏢 오피스텔</option>
                  <option value="원룸/투룸">🚪 원룸 / 투룸</option>
                  <option value="단독/전원주택">🏡 단독 / 전원주택</option>
                  <option value="빌딩/건물">🏢 빌딩 / 건물</option>
                  <option value="토지/임야">🌳 토지 / 임야</option>
                </select>
              </div>

              {/* 거래구분 세그먼트 셀렉터 (매매, 전세, 월세) */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>거래 구분</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["매매", "전세", "월세"].map(type => {
                    const isSelected = formData.transaction_type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, transaction_type: type })}
                        style={{
                          flex: 1, height: 38, borderRadius: 8, fontSize: 13, fontWeight: 700,
                          cursor: "pointer", transition: "all 0.2s",
                          border: `1px solid ${isSelected ? "#3b82f6" : border}`,
                          background: isSelected ? "#3b82f6" : (darkMode ? "#1f2023" : "#fff"),
                          color: isSelected ? "#fff" : textSecondary,
                          boxShadow: isSelected ? "0 2px 8px rgba(59, 130, 246, 0.3)" : "none"
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 매매/보증금/월세/관리비 동적 그리드 */}
              <div style={{ display: "flex", gap: 12 }}>
                {formData.transaction_type === "매매" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>매매가</label>
                    <input
                      type="text"
                      name="price_buy"
                      value={formData.price_buy}
                      onChange={handleChange}
                      placeholder="예: 12억 또는 120,000"
                      style={{ width: "100%", height: 38, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, fontSize: 13 }}
                    />
                  </div>
                )}

                {(formData.transaction_type === "전세" || formData.transaction_type === "월세") && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>
                      {formData.transaction_type === "전세" ? "전세금" : "보증금"}
                    </label>
                    <input
                      type="text"
                      name="price_deposit"
                      value={formData.price_deposit}
                      onChange={handleChange}
                      placeholder="예: 5,000 또는 5억"
                      style={{ width: "100%", height: 38, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, fontSize: 13 }}
                    />
                  </div>
                )}

                {formData.transaction_type === "월세" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>월세</label>
                    <input
                      type="text"
                      name="price_monthly"
                      value={formData.price_monthly}
                      onChange={handleChange}
                      placeholder="예: 120"
                      style={{ width: "100%", height: 38, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, fontSize: 13 }}
                    />
                  </div>
                )}

                <div style={{ width: 110 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>관리비</label>
                  <input
                    type="text"
                    name="price_maintenance"
                    value={formData.price_maintenance}
                    onChange={handleChange}
                    placeholder="예: 10"
                    style={{ width: "100%", height: 38, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, fontSize: 13 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 🤝 공동중개 또는 ☕ 기타 일때만 단순 금액 텍스트 필드 노출 */}
          {!(formData.role === "매물구해요" || formData.role === "매물내놔요") && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>{budgetLabelText}</label>
              <input type="text" name="budget" value={formData.budget} onChange={handleChange} placeholder={budgetPlaceholderText}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14 }} 
              />
            </div>
          )}

          {/* 지역 / 주소 입력 필드 (동적 연동) */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>{areaLabelText}</label>
            <input type="text" name="area" value={formData.area} onChange={handleChange} placeholder={areaPlaceholderText}
              style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14 }} 
            />
          </div>


          
          {/* 8. 첫 상담메모 */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>첫 상담 메모</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="빠른 입주 희망, 반려동물 동반 등 상세 요구사항 메모..."
              style={{ width: "100%", height: 80, padding: "12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }} 
            />
          </div>

        </div>

        {/* 모달 푸터 */}
        <div style={{
          padding: "16px 24px", 
          borderTop: `1px solid ${border}`,
          background: darkMode ? "#2c2d31" : "#f9fafb",
          display: "flex", justifyContent: "flex-end", gap: 12
        }}>
          <button onClick={onClose} style={{
            height: 40, padding: "0 16px", borderRadius: 8, 
            background: darkMode ? "#4b5563" : "#e5e7eb", color: darkMode ? "#e5e7eb" : "#4b5563",
            border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13
          }}>
            취소
          </button>
          <button onClick={handleSave} disabled={loading} style={{
            height: 40, padding: "0 24px", borderRadius: 8, 
            background: "#3b82f6", color: "#fff",
            border: "none", fontWeight: 700, cursor: loading ? "wait" : "pointer",
            boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
            opacity: loading ? 0.7 : 1, fontSize: 13
          }}>
            {loading ? "등록 중..." : "고객 등록하기"}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

