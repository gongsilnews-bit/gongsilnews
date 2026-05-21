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
    role: "임차인",          // 3. 구분 (필수)
    status: "매물찾아요",    // 4. 진행상황 (필수)
    property_type: "아파트", // 5. 매물구분
    budget: "",             // 6. 금액
    area: "",               // 7. 지역
    notes: ""               // 8. 첫 상담메모
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "role") {
      let defaultStatus = "매물찾아요";
      if (value === "임대인") defaultStatus = "매물내놔요";
      if (value === "부동산") defaultStatus = "공동중개협업";
      setFormData(prev => ({ ...prev, role: value, status: defaultStatus }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
    if (!formData.status) {
      alert("⚠️ 진행상황을 선택해 주세요 (필수).");
      return;
    }
    
    // 구분(role)과 진행상황(status)을 결합하여 type 컬럼에 깔끔하게 매핑!
    const typeLabel = `${formData.role} (${formData.status})`;
    
    // 매물구분(property_type)을 지역(area) 필드와 슬래시로 결합하여 매핑!
    const areaLabel = formData.property_type 
      ? `${formData.property_type} / ${formData.area || "지역미정"}`
      : formData.area || "지역미정";

    setLoading(true);
    const res = await createCustomer(memberId, {
      name: formData.name,
      phone: formData.phone,
      type: typeLabel,
      budget: formData.budget || "금액 협의",
      area: areaLabel,
      source: "오프라인(워크인)",
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

  // 6. 금액(budget) 라벨 및 플레이스홀더 동적 연동
  const budgetLabelText = formData.role === "임대인"
    ? "희망 의뢰 가격 (접수가) *"
    : formData.role === "부동산"
    ? "공동중개 수수료 조건 / 금액 *"
    : "가용 예산 (보증금/월세) *";

  const budgetPlaceholderText = formData.role === "임대인"
    ? "예: 매매 10억 / 전세 3억"
    : formData.role === "부동산"
    ? "예: 수수료 5:5 / 보증금 5천"
    : "예: 보증금 5천 / 월세 100";

  // 7. 지역(area) 라벨 및 플레이스홀더 동적 연동
  const areaLabelText = formData.role === "임대인"
    ? "보유 건물 주소 (상세호수) *"
    : formData.role === "부동산"
    ? "협업 대상 매물 주소 *"
    : "희망 지역 / 입주 조건 *";

  const areaPlaceholderText = formData.role === "임대인"
    ? "예: 서초동 아크로빌라 102호"
    : formData.role === "부동산"
    ? "예: 역삼동 신축 상가건물"
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

        {/* 모달 바디 (8대 필드 폼 영역) */}
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

          {/* 3, 4. 구분 및 진행상황 (필수) */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
                구분 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select name="role" value={formData.role} onChange={handleChange}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14, fontWeight: 700 }}>
                <option value="임대인">🏢 임대인 (건물주)</option>
                <option value="임차인">🏠 임차인 (손님)</option>
                <option value="부동산">🤝 부동산 (공동중개)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
                진행상황 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select name="status" value={formData.status} onChange={handleChange}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14, fontWeight: 700 }}>
                <option value="매수">매수</option>
                <option value="매물찾아요">매물 찾아요</option>
                <option value="매물내놔요">매물 내놔요</option>
                <option value="공동중개협업">공동중개 협업</option>
              </select>
            </div>
          </div>

          {/* 5. 매물구분 */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>
              매물 구분
            </label>
            <select name="property_type" value={formData.property_type} onChange={handleChange}
              style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14 }}>
              <option value="아파트">아파트</option>
              <option value="빌라/다세대">빌라/다세대</option>
              <option value="상가/사무실">상가/사무실</option>
              <option value="오피스텔">오피스텔</option>
              <option value="원룸/투룸">원룸/투룸</option>
              <option value="단독/전원주택">단독/전원주택</option>
              <option value="빌딩/건물">빌딩/건물</option>
              <option value="토지/임야">토지/임야</option>
            </select>
          </div>

          {/* 6, 7. 금액 및 지역 (동적 연동 바인딩!) */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>{budgetLabelText}</label>
              <input type="text" name="budget" value={formData.budget} onChange={handleChange} placeholder={budgetPlaceholderText}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14 }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>{areaLabelText}</label>
              <input type="text" name="area" value={formData.area} onChange={handleChange} placeholder={areaPlaceholderText}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", fontSize: 14 }} 
              />
            </div>
          </div>
          
          {/* 8. 첫 상담메모 */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>첫 상담 메모</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="빠른 입주 희망, 반려동물 동반 등 상세 유구사항 메모..."
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
