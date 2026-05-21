"use client";
import React, { useState } from "react";
import { AdminTheme } from "../types";
import { createCustomer } from "@/app/actions/customer";

interface CustomerModalProps {
  theme: AdminTheme;
  memberId: string;
  customer?: any; // 수정 모드일 때 전달받을 기존 고객 데이터
  onClose: () => void;
  onSave: () => void;
}

export default function CustomerModal({ theme, memberId, customer, onClose, onSave }: CustomerModalProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState(() => {
    if (customer) {
      // 1. role (유형) 분석
      let role = "매물구해요";
      if (customer.type?.includes("내놔요") || customer.type?.includes("임대") || customer.type?.includes("매도")) {
        role = "매물내놔요";
      } else if (customer.type?.includes("공동")) {
        role = "공동중개";
      } else if (customer.type?.includes("기타")) {
        role = "기타";
      }

      // 2. property_type, area & move_in_condition 분석
      let property_type = "아파트";
      let area = customer.area || "";
      let move_in_condition = "즉시 입주 / 협의 가능";
      if (customer.area && customer.area.includes(" / ")) {
        const parts = customer.area.split(" / ");
        property_type = parts[0];
        area = parts[1] || "";
        if (parts[2]) {
          move_in_condition = parts[2];
        }
      }

      // 3. budget & transaction_type 분석
      let transaction_type = "월세";
      let price_buy = "";
      let price_deposit = "";
      let price_monthly = "";
      let price_maintenance = "";
      let budget = "";

      const budgetStr = customer.budget || "";
      if (budgetStr.startsWith("[")) {
        const match = budgetStr.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          transaction_type = match[1]; // "매매", "월세", "전세"
          const details = match[2];
          
          if (transaction_type === "매매") {
            const buyMatch = details.match(/매매\s+([^\(]+)/);
            if (buyMatch) price_buy = buyMatch[1].trim();
          } else if (transaction_type === "전세") {
            const depMatch = details.match(/전세\(보증금\)\s+([^\(]+)/);
            if (depMatch) price_deposit = depMatch[1].trim();
          } else if (transaction_type === "월세") {
            const wmMatch = details.match(/보증금\s+([^\/]+)\/([^\s\(]+)/);
            if (wmMatch) {
              price_deposit = wmMatch[1].trim();
              price_monthly = wmMatch[2].trim();
            }
          }
          
          const maintMatch = details.match(/\(관비\s+([^\)]+)\)/);
          if (maintMatch) price_maintenance = maintMatch[1].trim();
        }
      } else {
        budget = budgetStr;
      }

      return {
        name: customer.name || "",
        phone: customer.phone || "",
        role,
        property_type,
        source: customer.source || "오프라인",
        transaction_type,
        price_buy,
        price_deposit,
        price_monthly,
        price_maintenance,
        budget,
        area,
        move_in_condition,
        status: customer.status || "신규",
        notes: ""
      };
    }
    
    return {
      name: "",
      phone: "",
      role: "매물구해요",
      property_type: "아파트",
      source: "오프라인",
      transaction_type: "월세",
      price_buy: "",
      price_deposit: "",
      price_monthly: "",
      price_maintenance: "",
      budget: "",
      area: "",
      move_in_condition: "즉시 입주 / 협의 가능",
      status: "신규",
      notes: ""
    };
  });

  // 연락처 한국형 하이픈 자동 연동 포맷터
  const formatPhone = (value: string) => {
    const clean = value.replace(/[^0-9]/g, "");
    if (clean.startsWith("02")) {
      if (clean.length <= 2) return clean;
      if (clean.length <= 5) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
      if (clean.length <= 9) return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`;
      return `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6, 10)}`;
    }
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    if (clean.length <= 10) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === "phone") {
      value = formatPhone(value);
    }
    setFormData({ ...formData, [name]: value });
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
    
    const typeLabel = formData.role;
    
    const areaLabel = formData.property_type 
      ? `${formData.property_type} / ${formData.area || "지역미정"} / ${formData.move_in_condition || "즉시 입주 / 협의 가능"}`
      : `${formData.area || "지역미정"} / ${formData.move_in_condition || "즉시 입주 / 협의 가능"}`;

    let budgetString = "";
    if (formData.role === "매물구해요" || formData.role === "매물내놔요") {
      if (formData.transaction_type === "기타") {
        budgetString = `[기타] ${formData.budget || "금액 협의"}`;
      } else {
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
      }
    } else {
      budgetString = formData.budget || "금액 협의";
    }

    setLoading(true);
    try {
      if (customer) {
        // 수정 모드
        const { updateCustomer } = await import("@/app/actions/customer");
        const res = await updateCustomer(customer.id, {
          name: formData.name,
          phone: formData.phone,
          type: typeLabel,
          budget: budgetString,
          area: areaLabel,
          source: formData.source,
          status: formData.status
        });
        setLoading(false);
        if (res.success) {
          alert("🎉 고객 정보가 수정되었습니다!");
          onSave();
          onClose();
        } else {
          alert("오류가 발생했습니다: " + res.message);
        }
      } else {
        // 신규 등록 모드
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
          onSave();
          onClose();
        } else {
          alert("오류가 발생했습니다: " + res.message);
        }
      }
    } catch (err: any) {
      setLoading(false);
      alert("⚠️ 에러가 발생했습니다: " + err.message);
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
    : "희망 지역 *";

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
            {customer ? "고객 정보 수정" : "새 고객 등록"}
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
                <option value="매물구해요">매물구해요 (임차 / 매수 손님)</option>
                <option value="매물내놔요">매물내놔요 (임대 / 매도 의뢰)</option>
                <option value="기타">기타 (일반 문의 / 기타)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
                유입 경로 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select name="source" value={formData.source} onChange={handleChange}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14, fontWeight: 700 }}>
                <option value="오프라인">오프라인</option>
                <option value="네이버광고">네이버광고</option>
                <option value="공실뉴스">공실뉴스</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          {/* 4. 수정 모드일 때만 노출되는 진행 상태 변경 셀렉터 */}
          {customer && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
                현재 진행 상태 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select name="status" value={formData.status} onChange={handleChange}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14, fontWeight: 700 }}>
                <option value="신규">신규접수</option>
                <option value="진행중">진행중</option>
                <option value="계약완료">계약완료</option>
                <option value="보류/종료">보류/종료</option>
                <option value="휴지통">휴지통</option>
              </select>
            </div>
          )}

          {/* 📢 매물내놔요 또는 🔎 매물구해요 일때 거래구분 및 초정밀 금액 입력 영역 */}
          {(formData.role === "매물구해요" || formData.role === "매물내놔요") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px", background: darkMode ? "#242528" : "#f3f4f6", borderRadius: 12, border: `1px solid ${border}` }}>
              {/* 매물 구분 (카드 내부 최상단 배치!) */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>매물 구분</label>
                <select name="property_type" value={formData.property_type} onChange={handleChange}
                  style={{ 
                    width: "100%", height: 38, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, 
                    background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", 
                    fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}>
                  <option value="아파트">아파트</option>
                  <option value="빌라/다세대">빌라 / 다세대</option>
                  <option value="상가/사무실">상가 / 사무실</option>
                  <option value="오피스텔">오피스텔</option>
                  <option value="원룸/투룸">원룸 / 투룸</option>
                  <option value="단독/전원주택">단독 / 전원주택</option>
                  <option value="빌딩/건물">빌딩 / 건물</option>
                  <option value="토지/임야">토지 / 임야</option>
                </select>
              </div>

              {/* 거래구분 세그먼트 셀렉터 (매매, 전세, 월세, 기타) */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>거래 구분</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["매매", "전세", "월세", "기타"].map(type => {
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

              {/* 금액 입력 영역 */}
              {formData.transaction_type === "기타" ? (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>금액 / 예산 조건</label>
                  <input
                    type="text"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="예: 보증금 5천에 월세 150 이내 / 금액 협의"
                    style={{ width: "100%", height: 38, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 13 }} 
                  />
                </div>
              ) : (
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
              )}

              {/* 희망 지역 (매물내놔요 일 때는 보유 건물 주소) */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>{areaLabelText}</label>
                <input type="text" name="area" value={formData.area} onChange={handleChange} placeholder={areaPlaceholderText}
                  style={{ width: "100%", height: 38, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 13 }} 
                />
              </div>

              {/* 입주 조건 */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>
                  입주 조건 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input type="text" name="move_in_condition" value={formData.move_in_condition} onChange={handleChange} placeholder="예: 즉시 입주 / 협의 가능"
                  style={{ width: "100%", height: 38, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 13 }} 
                />
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

          {/* 🤝 공동중개 또는 ☕ 기타 일때만 단순 지역/주소 텍스트 필드 노출 */}
          {!(formData.role === "매물구해요" || formData.role === "매물내놔요") && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>{areaLabelText}</label>
              <input type="text" name="area" value={formData.area} onChange={handleChange} placeholder={areaPlaceholderText}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14 }} 
              />
            </div>
          )}


          
          {!customer && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>첫 상담 메모</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="빠른 입주 희망, 반려동물 동반 등 상세 요구사항 메모..."
                style={{ width: "100%", height: 80, padding: "12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }} 
              />
            </div>
          )}

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
            {loading ? (customer ? "수정 중..." : "등록 중...") : (customer ? "수정 완료" : "고객 등록하기")}
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

