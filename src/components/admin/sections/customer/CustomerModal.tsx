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
    type: "매수",
    budget: "",
    area: "",
    source: "오프라인(워크인)",
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.name && !formData.phone) {
      alert("고객 이름 또는 연락처 중 하나는 필수입니다.");
      return;
    }
    
    setLoading(true);
    const res = await createCustomer(memberId, formData);
    setLoading(false);
    
    if (res.success) {
      alert("고객 정보가 등록되었습니다!");
      onSave(); // 부모 컴포넌트 데이터 갱신
      onClose();
    } else {
      alert("오류가 발생했습니다: " + res.message);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: cardBg, 
        width: 500, 
        borderRadius: 16,
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* 모달 헤더 */}
        <div style={{
          padding: "20px 24px", 
          borderBottom: `1px solid ${border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: darkMode ? "#2c2d31" : "#f9fafb"
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>새 고객 등록</h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 24, 
            color: textSecondary, cursor: "pointer", 
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            &times;
          </button>
        </div>

        {/* 모달 바디 (폼 영역) */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", maxHeight: "60vh" }}>
          
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>고객 이름 <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="예: 홍길동"
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none" }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>연락처 <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="010-0000-0000"
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none" }} 
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>상담 유형</label>
              <select name="type" value={formData.type} onChange={handleChange}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none" }}>
                <option value="매수">매수 찾음</option>
                <option value="임차(전월세)">임차(전월세) 찾음</option>
                <option value="매도">매도 내놓음</option>
                <option value="임대(전월세)">임대 내놓음</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>유입 경로</label>
              <select name="source" value={formData.source} onChange={handleChange}
                style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none" }}>
                <option value="오프라인(워크인)">오프라인 (워크인)</option>
                <option value="전화 문의">전화 문의</option>
                <option value="지인 소개">지인 소개</option>
                <option value="홈페이지 문의" disabled>홈페이지 (자동기록)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>희망 지역 및 조건</label>
            <input type="text" name="area" value={formData.area} onChange={handleChange} placeholder="예: 강남구 논현동, 1층 상가"
              style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none" }} 
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>가용 예산</label>
            <input type="text" name="budget" value={formData.budget} onChange={handleChange} placeholder="예: 보증금 5천 / 월세 300, 매매 20억"
              style={{ width: "100%", height: 42, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none" }} 
            />
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>첫 상담 메모</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="빠른 입주 희망, 애완동물 있음 등 특이사항..."
              style={{ width: "100%", height: 100, padding: "12px", border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit" }} 
            />
          </div>

        </div>

        {/* 모달 푸터 (버튼) */}
        <div style={{
          padding: "16px 24px", 
          borderTop: `1px solid ${border}`,
          background: darkMode ? "#2c2d31" : "#f9fafb",
          display: "flex", justifyContent: "flex-end", gap: 12
        }}>
          <button onClick={onClose} style={{
            height: 40, padding: "0 16px", borderRadius: 8, 
            background: darkMode ? "#4b5563" : "#e5e7eb", color: darkMode ? "#e5e7eb" : "#4b5563",
            border: "none", fontWeight: 700, cursor: "pointer"
          }}>
            취소
          </button>
          <button onClick={handleSave} disabled={loading} style={{
            height: 40, padding: "0 24px", borderRadius: 8, 
            background: "#3b82f6", color: "#fff",
            border: "none", fontWeight: 700, cursor: loading ? "wait" : "pointer",
            boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
            opacity: loading ? 0.7 : 1
          }}>
            {loading ? "등록 중..." : "고객 등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
