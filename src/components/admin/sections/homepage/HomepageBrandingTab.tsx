"use client";

import React, { useState, useRef } from "react";
import { AdminTheme } from "../types";

interface HomepageBrandingTabProps {
  theme: AdminTheme;
  formData: any;
  onFormUpdate: (updates: Record<string, any>) => void;
  logoPreview: string | null;
  faviconPreview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => void;
  onFileRemove: (type: "logo" | "favicon") => void;
  isFree: boolean;
}

export default function HomepageBrandingTab({ theme, formData, onFormUpdate, logoPreview, faviconPreview, onFileChange, onFileRemove, isFree }: HomepageBrandingTabProps) {
  const darkMode = theme.darkMode;
  const labelStyle: React.CSSProperties = {
    width: 160, fontSize: 13, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#111827",
    flexShrink: 0, padding: "16px 20px", display: "flex", alignItems: "center",
    background: darkMode ? "#25262b" : "#f9fafb", borderRight: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`,
  };
  const rowStyle: React.CSSProperties = { display: "flex", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` };
  const contentStyle: React.CSSProperties = { flex: 1, padding: "16px 20px", display: "flex", alignItems: "center" };

  return (
    <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 10, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden" }}>
      {/* 로고 업로드 */}
      <div style={rowStyle}>
        <div style={labelStyle}>
          로고 이미지
          {isFree && <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 4 }}>🔒</span>}
        </div>
        <div style={{ ...contentStyle, gap: 16 }}>
          {isFree ? (
            <span style={{ fontSize: 13, color: theme.textSecondary }}>유료 요금제에서 사용 가능합니다.</span>
          ) : (
            <>
              {logoPreview && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={logoPreview} alt="로고 미리보기"
                    style={{ height: 48, maxWidth: 200, objectFit: "contain", borderRadius: 6, border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, background: "#fff", padding: 4 }} />
                  <button onClick={() => onFileRemove("logo")}
                    style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "2px solid #fff", fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}>
                    &times;
                  </button>
                </div>
              )}
              {!logoPreview && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input type="file" accept="image/*" onChange={(e) => onFileChange(e, "logo")} style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 12, color: theme.textSecondary }}>추천: 가로 200px 이상 PNG/SVG</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 파비콘 업로드 */}
      <div style={{ ...rowStyle, borderBottom: "none" }}>
        <div style={labelStyle}>파비콘 (탭 아이콘)</div>
        <div style={{ ...contentStyle, gap: 16 }}>
          {faviconPreview && (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={faviconPreview} alt="파비콘 미리보기"
                style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4, border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, background: "#fff", padding: 2 }} />
              <button onClick={() => onFileRemove("favicon")}
                style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "2px solid #fff", fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}>
                &times;
              </button>
            </div>
          )}
          {!faviconPreview && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input type="file" accept="image/*" onChange={(e) => onFileChange(e, "favicon")} style={{ fontSize: 14 }} />
              <span style={{ fontSize: 12, color: theme.textSecondary }}>추천: 32×32 또는 64×64 PNG</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
