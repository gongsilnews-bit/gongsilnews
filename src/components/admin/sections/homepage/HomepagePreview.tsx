"use client";

import React, { useState } from "react";
import { AdminTheme } from "../types";

interface HomepagePreviewProps {
  theme: AdminTheme;
  formData: any;
  logoPreview: string | null;
  onElementClick?: (tabKey: string) => void;
  viewMode: "pc" | "mobile";
  setViewMode: (mode: "pc" | "mobile") => void;
}

export default function HomepagePreview({ theme, formData, logoPreview, onElementClick, viewMode, setViewMode }: HomepagePreviewProps) {
  const darkMode = theme.darkMode;

  const menuConfig = formData.menu_config || {};
  const isMenuOn = (key: string) => menuConfig[key] !== false;

  const menus = [
    { key: "home", label: "메인" },
    { key: "listings", label: "전체매물보기" },
    { key: "map", label: "지도검색" },
    { key: "news", label: "뉴스기사" },
    { key: "about", label: "회사소개" },
    { key: "directions", label: "오시는길" },
    { key: "contact", label: "임대·임차의뢰" },
  ].filter(m => m.key === "home" || isMenuOn(m.key));

  const activeTheme = formData.theme_name || "office";
  const themeColor = activeTheme === "apartment" ? "#2d8a4e" : "#1a3a6b";

  const banners = formData.banners || [];
  const siteTitle = formData.site_title || "부동산 홈페이지";
  const phone = formData.contact_phone || "02-000-0000";

  const isMobile = viewMode === "mobile";

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: darkMode ? "#25262b" : "#fff",
      borderRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`,
      overflow: "hidden",
    }}>
      {/* 뷰 전환 헤더 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`,
        background: darkMode ? "#1a1b1e" : "#f9fafb",
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary }}>실시간 미리보기</span>
        <div style={{ display: "flex", gap: 6, background: darkMode ? "#333" : "#e5e7eb", borderRadius: 8, padding: 4 }}>
          <button onClick={() => setViewMode("pc")} style={{
            padding: "6px 18px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 6, cursor: "pointer",
            background: viewMode === "pc" ? "#3b82f6" : "transparent",
            color: viewMode === "pc" ? "#fff" : theme.textSecondary,
            boxShadow: viewMode === "pc" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.2s",
          }}>🖥️ 데스크탑</button>
          <button onClick={() => setViewMode("mobile")} style={{
            padding: "6px 18px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 6, cursor: "pointer",
            background: viewMode === "mobile" ? "#3b82f6" : "transparent",
            color: viewMode === "mobile" ? "#fff" : theme.textSecondary,
            boxShadow: viewMode === "mobile" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.2s",
          }}>📱 모바일</button>
        </div>
      </div>

      {/* 미리보기 영역 (스크롤 가능, 배경색으로 기기 구분) */}
      <div style={{
        flex: 1, display: "flex", alignItems: isMobile ? "center" : "flex-start",
        justifyContent: "center", padding: isMobile ? "20px 0" : 0,
        overflow: "auto", background: darkMode ? "#1a1b1e" : "#e2e8f0",
      }}>
        {/* 기기 프레임 */}
        <div style={{
          width: isMobile ? 375 : "100%",
          minHeight: isMobile ? 667 : "100%",
          background: "#fff",
          borderRadius: isMobile ? 32 : 0,
          boxShadow: isMobile
            ? "0 25px 50px -12px rgba(0,0,0,0.25), inset 0 0 0 8px #111"
            : "none",
          border: isMobile ? "8px solid #111" : "none",
          overflow: "auto", position: "relative",
          display: "flex", flexDirection: "column"
        }}>
          {/* 모바일 노치 */}
          {isMobile && (
            <div style={{ position: "sticky", top: 0, zIndex: 50, height: 28, background: "transparent", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 120, height: 28, background: "#111", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }} />
            </div>
          )}

          {/* ── 헤더 ── */}
          <div style={{
            background: "#fff", borderBottom: `2px solid ${themeColor}`,
            padding: isMobile ? "16px 20px" : "20px 40px",
            paddingTop: isMobile ? 32 : 20, // 노치 공간 확보
          }}>
            {/* 상단 연락처 & 로고 */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 16,
            }}>
              {/* 로고 / 사이트명 */}
              <div 
                onClick={() => onElementClick?.("branding")}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                title="클릭하여 브랜딩 설정으로 이동"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="logo" style={{ height: isMobile ? 32 : 48, objectFit: "contain" }} />
                ) : (
                  <div style={{ fontSize: isMobile ? 18 : 26, fontWeight: 900, color: themeColor, letterSpacing: "-1px" }}>
                    {siteTitle}
                  </div>
                )}
              </div>
              <div 
                onClick={() => onElementClick?.("company")}
                style={{ fontSize: isMobile ? 13 : 18, color: "#475569", fontWeight: 800, cursor: "pointer" }}
                title="클릭하여 회사정보 설정으로 이동"
              >
                📞 {phone}
              </div>
            </div>

            {/* 네비게이션 */}
            <div 
              onClick={() => onElementClick?.("menu")}
              style={{
                display: "flex", gap: isMobile ? 12 : 24, flexWrap: "wrap",
                borderTop: "1px solid #e2e8f0", paddingTop: isMobile ? 10 : 16,
                cursor: "pointer"
              }}
              title="클릭하여 메뉴 구성으로 이동"
            >
              {menus.map((m, i) => (
                <span key={m.key} style={{
                  fontSize: isMobile ? 13 : 18, fontWeight: i === 0 ? 800 : 600,
                  color: i === 0 ? themeColor : "#475569",
                  padding: isMobile ? "4px 0" : "8px 0",
                  borderBottom: i === 0 ? `3px solid ${themeColor}` : "3px solid transparent",
                }}>{m.label}</span>
              ))}
            </div>
          </div>

          {/* ── 배너 영역 ── */}
          <div 
            onClick={() => onElementClick?.("banner")}
            style={{
              height: isMobile ? 180 : 360, background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}30)`,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
              cursor: "pointer"
            }}
            title="클릭하여 배너 관리로 이동"
          >
            {banners.length > 0 ? (
              <img src={banners[0]} alt="배너" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? 32 : 48 }}>🏠</div>
                <div style={{ fontSize: isMobile ? 14 : 20, color: themeColor, fontWeight: 800, marginTop: 8 }}>
                  메인 슬라이더 등록 대기중
                </div>
              </div>
            )}
            {banners.length > 1 && (
              <div style={{ position: "absolute", bottom: 16, display: "flex", gap: 6 }}>
                {banners.map((_: string, idx: number) => (
                  <div key={idx} style={{ width: idx === 0 ? 24 : 8, height: 8, borderRadius: 4, background: idx === 0 ? "#fff" : "rgba(255,255,255,0.5)" }} />
                ))}
              </div>
            )}
          </div>

          {/* ── 매물 영역 ── */}
          <div style={{ padding: isMobile ? "24px 20px" : "40px", background: "#f8fafc", flex: 1 }}>
            <div style={{
              fontSize: isMobile ? 18 : 24, fontWeight: 800, color: "#1e293b",
              marginBottom: isMobile ? 16 : 24, paddingBottom: 12, borderBottom: "2px solid #e2e8f0"
            }}>
              🔖 최근 등록 {activeTheme === "apartment" ? "아파트" : "사무실"} 매물
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? 16 : 24 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  background: "#fff", borderRadius: 12, overflow: "hidden",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0"
                }}>
                  <div style={{
                    width: "100%", height: isMobile ? 160 : 200, background: "#cbd5e1",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32
                  }}>🏢</div>
                  <div style={{ padding: isMobile ? 16 : 20 }}>
                    <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                      {activeTheme === "apartment" ? "테스트 아파트 단지" : "테헤란로 프라임 오피스"} {i}
                    </div>
                    <div style={{ fontSize: isMobile ? 14 : 16, color: "#3b82f6", fontWeight: 800, marginBottom: 8 }}>
                      월세 {i * 50}/{i * 1000}만
                    </div>
                    <div style={{ fontSize: isMobile ? 12 : 14, color: "#64748b" }}>전용 {i * 15}평 | 고층/10층</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 뉴스 영역 (활성화 시) ── */}
          {(formData.news_enabled ?? true) && isMenuOn("news") && (
            <div 
              onClick={() => onElementClick?.("news")}
              style={{ padding: isMobile ? "24px 20px" : "40px", background: "#fff", cursor: "pointer" }}
              title="클릭하여 뉴스 연동 관리로 이동"
            >
              <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>
                📰 부동산 뉴스
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  padding: "16px 0", borderBottom: "1px solid #f1f5f9", display: "flex", flexDirection: "column"
                }}>
                  <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: "#334155" }}>
                    [공실뉴스] {activeTheme === "apartment" ? "지역 아파트 거래량 증가세 지속" : "강남 프라임 오피스 공실률 하락"} {i}
                  </span>
                  <span style={{ fontSize: isMobile ? 12 : 14, color: "#94a3b8", marginTop: 6 }}>2026.04.22</span>
                </div>
              ))}
            </div>
          )}

          {/* ── 푸터 ── */}
          <div 
            onClick={() => onElementClick?.("company")}
            title="클릭하여 회사정보 설정으로 이동"
            style={{
              background: "#1e293b", color: "#94a3b8", padding: isMobile ? "32px 20px" : "48px 40px",
              marginTop: "auto", cursor: "pointer"
            }}
          >
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "#f8fafc", marginBottom: 12 }}>
              {siteTitle}
            </div>
            <div style={{ fontSize: isMobile ? 13 : 15, lineHeight: 1.6, marginBottom: 16 }}>
              {formData.company_intro || "신뢰와 정직으로 보답하는 중개 파트너가 되겠습니다."}
            </div>
            
            <div style={{ fontSize: isMobile ? 12 : 14, display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
              <div>📞 {phone}</div>
              {formData.address && <div>📍 {formData.address} {formData.address_detail}</div>}
              {formData.business_hours && <div>⏰ {formData.business_hours}</div>}
            </div>

            {/* SNS 아이콘 */}
            <div 
              onClick={(e) => { e.stopPropagation(); onElementClick?.("sns"); }}
              style={{ display: "flex", gap: 16, cursor: "pointer" }}
              title="클릭하여 SNS 설정으로 이동"
            >
              {formData.sns_blog && <a style={{ fontSize: isMobile ? 20 : 24 }}>📝</a>}
              {formData.sns_instagram && <a style={{ fontSize: isMobile ? 20 : 24 }}>📷</a>}
              {formData.sns_youtube && <a style={{ fontSize: isMobile ? 20 : 24 }}>🎬</a>}
              {formData.sns_kakao && <a style={{ fontSize: isMobile ? 20 : 24 }}>💬</a>}
            </div>
            
            <div style={{ fontSize: isMobile ? 11 : 13, color: "#475569", marginTop: 32 }}>
              © 2026 {siteTitle}. All rights reserved.
            </div>
          </div>

          {/* ── 팝업 오버레이 ── */}
          {formData.popup_is_active && formData.popup_image && (
            <div 
              onClick={() => onElementClick?.("popup")}
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,0.6)", zIndex: 100,
                display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 20 : 40,
                cursor: "pointer"
              }}
              title="클릭하여 팝업 설정으로 이동"
            >
              <div style={{
                background: "#fff", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 400,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", position: "relative"
              }}>
                <img src={formData.popup_image} alt="팝업 미리보기" style={{ width: "100%", display: "block" }} />
                <div style={{ display: "flex", borderTop: "1px solid #e2e8f0" }}>
                  <button style={{ flex: 1, padding: "16px 0", background: "#f8fafc", color: "#64748b", border: "none", borderRight: "1px solid #e2e8f0", fontSize: 14, cursor: "pointer" }}>오늘 하루 보지 않기</button>
                  <button style={{ flex: 1, padding: "16px 0", background: "#fff", color: "#1e293b", border: "none", fontSize: 14, fontWeight: "bold", cursor: "pointer" }}>닫기</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
