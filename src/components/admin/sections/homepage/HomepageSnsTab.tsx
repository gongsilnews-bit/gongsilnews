"use client";

import React from "react";
import { AdminTheme } from "../types";

interface HomepageSnsTabProps {
  theme: AdminTheme;
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function HomepageSnsTab({ theme, formData, onChange }: HomepageSnsTabProps) {
  const darkMode = theme.darkMode;
  const inputStyle: React.CSSProperties = {
    flex: 1, minHeight: 40, height: 40, padding: "0 14px",
    border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
    borderRadius: 6, fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827",
    background: darkMode ? "#2c2d31" : "#fff", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    width: 160, fontSize: 13, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#111827",
    flexShrink: 0, padding: "16px 20px", display: "flex", alignItems: "center", gap: 8,
    background: darkMode ? "#25262b" : "#f9fafb", borderRight: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`,
  };
  const rowStyle: React.CSSProperties = { display: "flex", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` };
  const contentStyle: React.CSSProperties = { flex: 1, padding: "16px 20px", display: "flex", alignItems: "center" };

  const snsItems = [
    { key: "sns_blog", label: "블로그", icon: "📝", placeholder: "https://blog.naver.com/아이디" },
    { key: "sns_instagram", label: "인스타그램", icon: "📷", placeholder: "https://instagram.com/아이디" },
    { key: "sns_youtube", label: "유튜브", icon: "🎬", placeholder: "https://youtube.com/@채널명" },
    { key: "sns_kakao", label: "카카오톡", icon: "💬", placeholder: "https://open.kakao.com/오픈채팅방링크" },
  ];

  return (
    <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 10, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, background: darkMode ? "#25262b" : "#f9fafb" }}>
        <span style={{ fontSize: 13, color: theme.textSecondary }}>
          💡 입력된 SNS 링크는 홈페이지 헤더/푸터에 아이콘으로 표시됩니다. 비워두면 표시되지 않습니다.
        </span>
      </div>
      {snsItems.map((item, idx) => (
        <div key={item.key} style={{ ...rowStyle, borderBottom: idx === snsItems.length - 1 ? "none" : rowStyle.borderBottom }}>
          <div style={labelStyle}>
            <span>{item.icon}</span> {item.label}
          </div>
          <div style={contentStyle}>
            <input type="url" name={item.key} value={formData[item.key] || ""} onChange={onChange}
              style={inputStyle} placeholder={item.placeholder} />
          </div>
        </div>
      ))}
    </div>
  );
}
