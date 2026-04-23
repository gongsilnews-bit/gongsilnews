"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminTheme } from "./types";
import {
  getHomepageSettings,
  saveHomepageSettings,
  checkSubdomainAvailable,
  uploadHomepageFile,
} from "@/app/actions/homepage";

import HomepageBasicTab from "./homepage/HomepageBasicTab";
import HomepageBrandingTab from "./homepage/HomepageBrandingTab";
import HomepageCompanyTab from "./homepage/HomepageCompanyTab";
import HomepageSnsTab from "./homepage/HomepageSnsTab";
import HomepageMenuTab from "./homepage/HomepageMenuTab";
import HomepageBannerTab from "./homepage/HomepageBannerTab";
import HomepageNewsTab from "./homepage/HomepageNewsTab";
import HomepagePopupTab from "./homepage/HomepagePopupTab";


interface HomepageSectionProps {
  theme: AdminTheme;
  memberId: string;
  planType: string;
}

const TABS = [
  { key: "basic", label: "기본설정", icon: "📋" },
  { key: "branding", label: "브랜딩", icon: "🎨" },
  { key: "company", label: "회사정보", icon: "🏢" },
  { key: "sns", label: "SNS", icon: "🔗" },
  { key: "menu", label: "메뉴구성", icon: "📂" },
  { key: "banner", label: "배너", icon: "🖼️" },
  { key: "popup", label: "팝업", icon: "📢" },
  { key: "news", label: "뉴스연동", icon: "📰" },
];

export default function HomepageSection({ theme, memberId, planType }: HomepageSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  


  const [formData, setFormData] = useState<Record<string, any>>({
    subdomain: "",
    theme_name: "office",
    logo_url: null,
    favicon_url: null,
    site_title: "",
    contact_phone: "",
    company_intro: "",
    is_active: true,
    address: "",
    address_detail: "",
    business_hours: "",
    sns_blog: "",
    sns_instagram: "",
    sns_youtube: "",
    sns_kakao: "",
    menu_config: {},
    banners: [],
    popup_image: null,
    popup_link: "",
    popup_is_active: false,
    news_display_count: 10,
    news_enabled: true,
  });

  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const subdomainTimer = useRef<NodeJS.Timeout | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const isFree = planType === "free";
  const darkMode = theme.darkMode;

  // ── WebP 압축 ──
  const compressToWebP = (file: File, maxW = 800, maxH = 800, quality = 0.85): Promise<File> => {
    if (!file.type.startsWith("image/")) return Promise.resolve(file);
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxW) { height *= maxW / width; width = maxW; }
        } else {
          if (height > maxH) { width *= maxH / height; height = maxH; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); return resolve(file); }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return resolve(file);
          const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          resolve(new File([blob], newName, { type: "image/webp" }));
        }, "image/webp", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  // ── 초기 데이터 로드 ──
  useEffect(() => {
    async function load() {
      const res = await getHomepageSettings(memberId);
      if (res.success && res.data) {
        setFormData((prev) => ({
          ...prev,
          subdomain: res.data.subdomain || "",
          theme_name: res.data.theme_name || "office",
          logo_url: res.data.logo_url || null,
          favicon_url: res.data.favicon_url || null,
          site_title: res.data.site_title || "",
          contact_phone: res.data.contact_phone || "",
          company_intro: res.data.company_intro || "",
          is_active: res.data.is_active ?? true,
          address: res.data.address || "",
          address_detail: res.data.address_detail || "",
          business_hours: res.data.business_hours || "",
          sns_blog: res.data.sns_blog || "",
          sns_instagram: res.data.sns_instagram || "",
          sns_youtube: res.data.sns_youtube || "",
          sns_kakao: res.data.sns_kakao || "",
          menu_config: res.data.menu_config || {},
          banners: res.data.banners || [],
          popup_image: res.data.popup_image || null,
          popup_link: res.data.popup_link || "",
          popup_is_active: res.data.popup_is_active ?? false,
          news_display_count: res.data.news_display_count ?? 10,
          news_enabled: res.data.news_enabled ?? true,
        }));
        if (res.data.logo_url) setLogoPreview(res.data.logo_url);
        if (res.data.favicon_url) setFaviconPreview(res.data.favicon_url);
      }
      setLoading(false);
    }
    load();
  }, [memberId]);



  // ── 서브도메인 중복 검사 (자동, 디바운스) ──
  const checkSubdomain = useCallback(
    (value: string) => {
      if (subdomainTimer.current) clearTimeout(subdomainTimer.current);
      if (!value || value.length < 2) { setSubdomainStatus("idle"); return; }
      setSubdomainStatus("checking");
      subdomainTimer.current = setTimeout(async () => {
        const res = await checkSubdomainAvailable(value, memberId);
        if (res.success) {
          setSubdomainStatus(res.available ? "available" : "taken");
        } else {
          setSubdomainStatus("idle");
        }
      }, 600);
    },
    [memberId]
  );

  // ── 서브도메인 중복 검사 (명시적 클릭) ──
  const handleCheckSubdomainClick = async () => {
    const value = formData.subdomain;
    if (!value || value.length < 2) { 
      alert("서브도메인을 2자 이상 입력해주세요.");
      return; 
    }
    if (subdomainTimer.current) clearTimeout(subdomainTimer.current);
    setSubdomainStatus("checking");
    const res = await checkSubdomainAvailable(value, memberId);
    if (res.success) {
      setSubdomainStatus(res.available ? "available" : "taken");
      if (res.available) {
        alert("✔️ 사용 가능한 서브도메인입니다.");
      } else {
        alert("❌ 이미 사용 중인 서브도메인입니다. 다른 주소를 입력해주세요.");
      }
    } else {
      setSubdomainStatus("idle");
      alert("⚠️ 중복 확인 중 오류가 발생했습니다.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    if (name === "subdomain") {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      checkSubdomain(value);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormUpdate = (updates: Record<string, any>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      const maxSize = type === "favicon" ? 128 : 400;
      const compressed = await compressToWebP(originalFile, maxSize, maxSize, 0.85);
      const previewUrl = URL.createObjectURL(compressed);
      if (type === "logo") { setLogoFile(compressed); setLogoPreview(previewUrl); }
      else { setFaviconFile(compressed); setFaviconPreview(previewUrl); }
    }
  };

  const handleFileRemove = (type: "logo" | "favicon") => {
    if (type === "logo") { setLogoFile(null); setLogoPreview(null); setFormData((prev) => ({ ...prev, logo_url: null })); }
    else { setFaviconFile(null); setFaviconPreview(null); setFormData((prev) => ({ ...prev, favicon_url: null })); }
  };

  // ── 저장 ──
  const handleSave = async () => {
    if (!formData.subdomain) { alert("서브도메인 주소를 입력해주세요."); return; }
    if (subdomainStatus === "taken") { alert("이미 사용 중인 서브도메인입니다."); return; }

    setSaving(true);
    try {
      let logoUrl = formData.logo_url;
      let faviconUrl = formData.favicon_url;

      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        fd.append("path", `${memberId}/logo_${Date.now()}.webp`);
        const res = await uploadHomepageFile(fd);
        if (res.success && res.url) logoUrl = res.url;
      }

      if (faviconFile) {
        const fd = new FormData();
        fd.append("file", faviconFile);
        fd.append("path", `${memberId}/favicon_${Date.now()}.webp`);
        const res = await uploadHomepageFile(fd);
        if (res.success && res.url) faviconUrl = res.url;
      }

      const saveRes = await saveHomepageSettings(memberId, {
        subdomain: formData.subdomain,
        theme_name: isFree ? "office" : formData.theme_name,
        logo_url: isFree ? null : logoUrl,
        favicon_url: faviconUrl,
        site_title: formData.site_title,
        contact_phone: formData.contact_phone,
        company_intro: formData.company_intro,
        is_active: formData.is_active,
        // 새 필드들 (DB 컬럼 추가 후 활성화)
        // address: formData.address,
        // address_detail: formData.address_detail,
        // business_hours: formData.business_hours,
        // sns_blog: formData.sns_blog,
        // sns_instagram: formData.sns_instagram,
        // sns_youtube: formData.sns_youtube,
        // sns_kakao: formData.sns_kakao,
        // menu_config: formData.menu_config,
        // banners: formData.banners,
        // news_display_count: formData.news_display_count,
        // news_enabled: formData.news_enabled,
      });

      if (!saveRes.success) { alert("저장 실패: " + saveRes.error); }
      else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch (err: any) {
      alert("오류: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textSecondary }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌐</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>홈페이지 설정을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: darkMode ? "#1a1b1e" : "#f4f5f7" }}>
      {/* ===== 좌측: 탭 + 설정 영역 ===== */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", minWidth: 280 }}>
        {/* 타이틀 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>🌐 홈페이지 관리</h1>
            {isFree && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                무료 요금제
              </span>
            )}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div style={{
          display: "flex", gap: 0, marginBottom: 16,
          borderBottom: `2px solid ${darkMode ? "#333" : "#e5e7eb"}`,
          overflowX: "auto",
        }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 14px", fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? "#3b82f6" : theme.textSecondary,
                background: "none", border: "none", cursor: "pointer",
                borderBottom: activeTab === tab.key ? "2px solid #3b82f6" : "2px solid transparent",
                marginBottom: -2, transition: "all 0.2s", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 4,
              }}>
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        <div style={{ marginBottom: 20 }}>
          {activeTab === "basic" && (
            <HomepageBasicTab theme={theme} formData={formData} onChange={handleChange}
              onFormUpdate={handleFormUpdate} subdomainStatus={subdomainStatus} 
              onCheckSubdomain={handleCheckSubdomainClick} isFree={isFree} />
          )}
          {activeTab === "branding" && (
            <HomepageBrandingTab theme={theme} formData={formData} onFormUpdate={handleFormUpdate}
              logoPreview={logoPreview} faviconPreview={faviconPreview}
              onFileChange={handleFileChange} onFileRemove={handleFileRemove} isFree={isFree} />
          )}
          {activeTab === "company" && (
            <HomepageCompanyTab theme={theme} formData={formData} onChange={handleChange} onFormUpdate={handleFormUpdate} />
          )}
          {activeTab === "sns" && (
            <HomepageSnsTab theme={theme} formData={formData} onChange={handleChange} />
          )}
          {activeTab === "menu" && (
            <HomepageMenuTab theme={theme} formData={formData} onFormUpdate={handleFormUpdate} />
          )}
          {activeTab === "banner" && (
            <HomepageBannerTab theme={theme} formData={formData} memberId={memberId} onFormUpdate={handleFormUpdate} />
          )}
          {activeTab === "popup" && (
            <HomepagePopupTab theme={theme} formData={formData} memberId={memberId} onFormUpdate={handleFormUpdate} onChange={handleChange} />
          )}
          {activeTab === "news" && (
            <HomepageNewsTab theme={theme} formData={formData} memberId={memberId} onFormUpdate={handleFormUpdate} />
          )}
        </div>

        {/* 무료 요금제 안내 */}
        {isFree && (
          <div style={{
            padding: "12px 16px", marginBottom: 12, borderRadius: 8,
            background: darkMode ? "rgba(234,179,8,0.1)" : "#fffbeb",
            border: `1px solid ${darkMode ? "#78350f" : "#fde68a"}`,
            fontSize: 12, color: darkMode ? "#fcd34d" : "#92400e", lineHeight: 1.5,
          }}>
            💡 <strong>무료 요금제</strong>에서는 기본 템플릿(오피스형)과 공실뉴스 로고가 자동 적용됩니다.
          </div>
        )}

        {/* 저장 버튼 */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "8px 0 16px" }}>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: "12px 40px", fontSize: 14, fontWeight: 800, color: "#fff",
              background: saving ? "#93c5fd" : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(59,130,246,0.3)", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 8,
            }}>
            {saving ? "⏳ 저장 중..." : saved ? "✅ 저장 완료!" : "💾 홈페이지 설정 저장"}
          </button>
        </div>
      </div>


    </div>
  );
}
