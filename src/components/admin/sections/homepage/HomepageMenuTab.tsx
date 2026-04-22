"use client";

import React from "react";
import { AdminTheme } from "../types";

interface HomepageMenuTabProps {
  theme: AdminTheme;
  formData: any;
  onFormUpdate: (updates: Record<string, any>) => void;
}

const DEFAULT_MENUS = [
  { key: "home", label: "메인", always: true },
  { key: "listings", label: "전체매물보기", always: false },
  { key: "map", label: "지도검색", always: false },
  { key: "news", label: "뉴스기사", always: false },
  { key: "about", label: "회사소개", always: false },
  { key: "directions", label: "오시는길", always: false },
  { key: "contact", label: "임대·임차의뢰", always: false },
];

export default function HomepageMenuTab({ theme, formData, onFormUpdate }: HomepageMenuTabProps) {
  const darkMode = theme.darkMode;

  // menu_config: { [key]: boolean }
  const menuConfig: Record<string, boolean> = formData.menu_config || {};
  // 기본값: 전부 활성화
  const isOn = (key: string) => menuConfig[key] !== false;

  const toggle = (key: string) => {
    const updated = { ...menuConfig, [key]: !isOn(key) };
    onFormUpdate({ menu_config: updated });
  };

  return (
    <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 10, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, background: darkMode ? "#25262b" : "#f9fafb" }}>
        <span style={{ fontSize: 13, color: theme.textSecondary }}>
          💡 홈페이지 상단 네비게이션에 표시할 메뉴를 선택하세요. &quot;메인&quot;은 항상 표시됩니다.
        </span>
      </div>
      {DEFAULT_MENUS.map((menu, idx) => (
        <div key={menu.key} style={{
          display: "flex", alignItems: "center", padding: "14px 20px",
          borderBottom: idx === DEFAULT_MENUS.length - 1 ? "none" : `1px solid ${darkMode ? "#333" : "#e5e7eb"}`,
        }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
            {menu.label}
            {menu.always && <span style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 8 }}>(필수)</span>}
          </span>
          <button
            onClick={() => !menu.always && toggle(menu.key)}
            disabled={menu.always}
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none", cursor: menu.always ? "default" : "pointer",
              background: (menu.always || isOn(menu.key)) ? "#3b82f6" : (darkMode ? "#555" : "#d1d5db"),
              position: "relative", transition: "background 0.3s", opacity: menu.always ? 0.7 : 1,
            }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: (menu.always || isOn(menu.key)) ? 25 : 3,
              transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
      ))}
    </div>
  );
}
