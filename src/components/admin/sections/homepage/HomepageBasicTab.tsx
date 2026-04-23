"use client";

import React from "react";
import { AdminTheme } from "../types";

interface HomepageBasicTabProps {
  theme: AdminTheme;
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFormUpdate: (updates: Record<string, any>) => void;
  subdomainStatus: "idle" | "checking" | "available" | "taken";
  onCheckSubdomain: () => void;
  isFree: boolean;
}

export default function HomepageBasicTab({ theme, formData, onChange, onFormUpdate, subdomainStatus, onCheckSubdomain, isFree }: HomepageBasicTabProps) {
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

  const themes = [
    { key: "template01", label: "Templete01 오피스텔형", desc: "깔끔한 사무실 중심 레이아웃", emoji: "🏢", sampleUrl: "https://templete01.gongsilnews.com/" },
    { key: "template02", label: "Templete02 일반룸형", desc: "원룸·주거 전문 레이아웃", emoji: "🏠", sampleUrl: "https://templete02.gongsilnews.com/" },
  ];

  return (
    <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 10, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden" }}>
      {/* 서브도메인 */}
      <div style={rowStyle}>
        <div style={labelStyle}>서브도메인 주소</div>
        <div style={{ ...contentStyle, gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1, minWidth: 260 }}>
            <input type="text" name="subdomain" value={formData.subdomain} onChange={onChange}
              style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", minWidth: 120 }}
              placeholder="my-office" maxLength={30} />
            <span style={{
              height: 40, padding: "0 14px", display: "flex", alignItems: "center",
              background: darkMode ? "#333" : "#f3f4f6", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
              borderTopRightRadius: 6, borderBottomRightRadius: 6, borderRight: "none",
              fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280", fontWeight: 600, whiteSpace: "nowrap",
            }}>.gongsilnews.com</span>
            <button onClick={onCheckSubdomain} style={{
              height: 40, padding: "0 16px", background: "#3b82f6", color: "#fff",
              border: "none", borderTopRightRadius: 6, borderBottomRightRadius: 6,
              fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
            }}>중복확인</button>
          </div>
          {subdomainStatus === "checking" && <span style={{ fontSize: 12, color: "#3b82f6" }}>⏳ 확인 중...</span>}
          {subdomainStatus === "available" && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✅ 사용 가능</span>}
          {subdomainStatus === "taken" && <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>❌ 이미 사용 중</span>}
          <div style={{ width: "100%", fontSize: 12, color: darkMode ? "#666" : "#9ca3af" }}>
            영문 소문자, 숫자, 하이픈(-) 사용 가능 · 2~30자
          </div>
        </div>
      </div>

      {/* 템플릿 선택 */}
      <div style={rowStyle}>
        <div style={labelStyle}>
          템플릿 선택
          {isFree && <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 4 }}>🔒</span>}
        </div>
        <div style={{ ...contentStyle, gap: 16 }}>
          {themes.map((t) => (
            <div key={t.key} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => !isFree && onFormUpdate({ theme_name: t.key })}
                disabled={isFree}
                style={{
                  padding: "16px", borderRadius: 10, cursor: isFree ? "not-allowed" : "pointer",
                  background: formData.theme_name === t.key
                    ? (darkMode ? "rgba(59,130,246,0.15)" : "#eff6ff")
                    : (darkMode ? "#333" : "#f9fafb"),
                  border: formData.theme_name === t.key
                    ? "2px solid #3b82f6" : `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
                  textAlign: "center", transition: "all 0.2s", opacity: isFree ? 0.5 : 1,
                  display: "flex", flexDirection: "column", alignItems: "center", width: "100%"
                }}>
                
                {/* 라이브 썸네일 (iframe 스케일링) */}
                <div 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    window.open(t.sampleUrl, '_blank'); 
                  }}
                  title="클릭하여 샘플 홈페이지만 새 창에서 보기"
                  style={{ 
                    width: "100%", height: 160, overflow: "hidden", position: "relative", 
                    borderRadius: 6, marginBottom: 16, background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "zoom-in"
                  }}>
                  <iframe src={t.sampleUrl} tabIndex={-1} scrolling="no" style={{ 
                    width: "400%", height: "400%", transform: "scale(0.25)", 
                    transformOrigin: "0 0", border: "none", pointerEvents: "none" 
                  }} />
                  <div style={{ 
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, 
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0)", transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.2)";
                    if (e.currentTarget.firstChild) (e.currentTarget.firstChild as HTMLElement).style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0)";
                    if (e.currentTarget.firstChild) (e.currentTarget.firstChild as HTMLElement).style.opacity = "0";
                  }}>
                    <span style={{ 
                      padding: "8px 16px", background: "rgba(0,0,0,0.8)", color: "#fff", 
                      borderRadius: 20, fontSize: 13, fontWeight: 700, opacity: 0, transition: "opacity 0.2s"
                    }}>
                      🔍 샘플 미리보기
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  {t.emoji} {t.label}
                </div>
                <div style={{ fontSize: 13, color: theme.textSecondary }}>{t.desc}</div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 사이트 제목 */}
      <div style={rowStyle}>
        <div style={labelStyle}>사이트 제목</div>
        <div style={contentStyle}>
          <input type="text" name="site_title" value={formData.site_title} onChange={onChange}
            style={inputStyle} placeholder="브라우저 탭에 표시될 이름 (예: 공실뉴스 부동산)" maxLength={50} />
        </div>
      </div>

      {/* 홈페이지 활성화 */}
      <div style={{ ...rowStyle, borderBottom: "none" }}>
        <div style={labelStyle}>홈페이지 활성화</div>
        <div style={{ ...contentStyle, gap: 12 }}>
          <button onClick={() => onFormUpdate({ is_active: !formData.is_active })}
            style={{
              width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
              background: formData.is_active ? "#3b82f6" : (darkMode ? "#555" : "#d1d5db"),
              position: "relative", transition: "background 0.3s",
            }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3, left: formData.is_active ? 27 : 3,
              transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
          <span style={{ fontSize: 14, color: formData.is_active ? "#10b981" : theme.textSecondary, fontWeight: 600 }}>
            {formData.is_active ? "활성화됨" : "비활성화됨"}
          </span>
          <span style={{ fontSize: 12, color: theme.textSecondary }}>
            비활성화하면 방문자에게 &quot;준비 중&quot; 페이지가 표시됩니다.
          </span>
        </div>
      </div>
    </div>
  );
}
