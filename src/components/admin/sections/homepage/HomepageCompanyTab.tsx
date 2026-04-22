"use client";

import React from "react";
import { AdminTheme } from "../types";

interface HomepageCompanyTabProps {
  theme: AdminTheme;
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFormUpdate: (updates: Record<string, any>) => void;
}

export default function HomepageCompanyTab({ theme, formData, onChange, onFormUpdate }: HomepageCompanyTabProps) {
  const darkMode = theme.darkMode;
  const inputStyle: React.CSSProperties = {
    flex: 1, minHeight: 40, height: 40, padding: "0 14px",
    border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
    borderRadius: 6, fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827",
    background: darkMode ? "#2c2d31" : "#fff", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    width: 160, fontSize: 13, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#111827",
    flexShrink: 0, padding: "16px 20px", display: "flex", alignItems: "center",
    background: darkMode ? "#25262b" : "#f9fafb", borderRight: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`,
  };
  const rowStyle: React.CSSProperties = { display: "flex", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` };
  const contentStyle: React.CSSProperties = { flex: 1, padding: "16px 20px", display: "flex", alignItems: "center" };

  const formatPhone = (v: string) => {
    const raw = v.replace(/[^0-9]/g, "");
    if (!raw) return "";
    if (raw.startsWith("02")) {
      if (raw.length <= 2) return raw;
      if (raw.length <= 5) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
      if (raw.length <= 9) return `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
      return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
    }
    if (raw.length <= 3) return raw;
    if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormUpdate({ contact_phone: formatPhone(e.target.value) });
  };

  return (
    <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 10, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden" }}>
      {/* 대표 연락처 */}
      <div style={rowStyle}>
        <div style={labelStyle}>대표 연락처</div>
        <div style={contentStyle}>
          <input type="text" name="contact_phone" value={formData.contact_phone || ""} onChange={handlePhoneChange}
            style={{ ...inputStyle, maxWidth: 240 }} placeholder="02-000-0000" />
        </div>
      </div>

      {/* 회사 소개글 */}
      <div style={rowStyle}>
        <div style={{ ...labelStyle, alignItems: "flex-start", paddingTop: 20 }}>회사 소개글</div>
        <div style={{ ...contentStyle, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          <textarea name="company_intro" value={formData.company_intro || ""} onChange={onChange}
            style={{ ...inputStyle, height: 120, padding: "12px 14px", resize: "vertical" as const }}
            placeholder="홈페이지 '회사소개' 메뉴에 표시됩니다. 중개사무소를 소개하는 글을 작성해주세요."
            maxLength={1000} />
          <span style={{ fontSize: 12, color: (formData.company_intro?.length || 0) >= 1000 ? "#ef4444" : theme.textSecondary, alignSelf: "flex-end" }}>
            {formData.company_intro?.length || 0} / 1,000
          </span>
        </div>
      </div>

      {/* 오시는길 - 주소 */}
      <div style={rowStyle}>
        <div style={labelStyle}>사무실 주소</div>
        <div style={{ ...contentStyle, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <input type="text" name="address" value={formData.address || ""} onChange={onChange}
            style={inputStyle} placeholder="예: 서울특별시 강남구 테헤란로 123" />
          <input type="text" name="address_detail" value={formData.address_detail || ""} onChange={onChange}
            style={inputStyle} placeholder="상세주소 (예: 5층 502호)" />
          <span style={{ fontSize: 12, color: theme.textSecondary }}>
            💡 입력된 주소는 홈페이지 &apos;오시는길&apos; 페이지에 카카오맵과 함께 표시됩니다.
          </span>
        </div>
      </div>

      {/* 영업시간 */}
      <div style={{ ...rowStyle, borderBottom: "none" }}>
        <div style={labelStyle}>영업시간</div>
        <div style={contentStyle}>
          <input type="text" name="business_hours" value={formData.business_hours || ""} onChange={onChange}
            style={inputStyle} placeholder="예: 평일 09:00~18:00 / 토요일 09:00~13:00" />
        </div>
      </div>
    </div>
  );
}
