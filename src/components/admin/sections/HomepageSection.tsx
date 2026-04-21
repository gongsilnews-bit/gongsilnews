"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminTheme } from "./types";
import {
  getHomepageSettings,
  saveHomepageSettings,
  checkSubdomainAvailable,
  uploadHomepageFile,
} from "@/app/actions/homepage";

interface HomepageSectionProps {
  theme: AdminTheme;
  memberId: string;
  planType: string;
}

export default function HomepageSection({ theme, memberId, planType }: HomepageSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    subdomain: "",
    theme_name: "office",
    logo_url: "" as string | null,
    favicon_url: "" as string | null,
    site_title: "",
    contact_phone: "",
    company_intro: "",
    is_active: true,
  });

  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const subdomainTimer = useRef<NodeJS.Timeout | null>(null);

  // 파일 상태
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const isFree = planType === "free";

  // ── WebP 압축 유틸 ──
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
        setFormData({
          subdomain: res.data.subdomain || "",
          theme_name: res.data.theme_name || "office",
          logo_url: res.data.logo_url || null,
          favicon_url: res.data.favicon_url || null,
          site_title: res.data.site_title || "",
          contact_phone: res.data.contact_phone || "",
          company_intro: res.data.company_intro || "",
          is_active: res.data.is_active ?? true,
        });
        if (res.data.logo_url) setLogoPreview(res.data.logo_url);
        if (res.data.favicon_url) setFaviconPreview(res.data.favicon_url);
      }
      setLoading(false);
    }
    load();
  }, [memberId]);

  // ── 서브도메인 중복 검사 (디바운스) ──
  const checkSubdomain = useCallback(
    (value: string) => {
      if (subdomainTimer.current) clearTimeout(subdomainTimer.current);
      if (!value || value.length < 2) {
        setSubdomainStatus("idle");
        return;
      }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    if (name === "subdomain") {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      checkSubdomain(value);
    }
    if (name === "contact_phone") value = formatPhone(value);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      // WebP 압축 (로고: 최대 400px, 파비콘: 최대 128px)
      const maxSize = type === "favicon" ? 128 : 400;
      const compressed = await compressToWebP(originalFile, maxSize, maxSize, 0.85);
      const previewUrl = URL.createObjectURL(compressed);
      if (type === "logo") {
        setLogoFile(compressed);
        setLogoPreview(previewUrl);
      } else {
        setFaviconFile(compressed);
        setFaviconPreview(previewUrl);
      }
    }
  };

  const handleFileRemove = (type: "logo" | "favicon") => {
    if (type === "logo") {
      setLogoFile(null);
      setLogoPreview(null);
      setFormData((prev) => ({ ...prev, logo_url: null }));
    } else {
      setFaviconFile(null);
      setFaviconPreview(null);
      setFormData((prev) => ({ ...prev, favicon_url: null }));
    }
  };

  // ── 저장 ──
  const handleSave = async () => {
    if (!formData.subdomain) {
      alert("서브도메인 주소를 입력해주세요.");
      return;
    }
    if (subdomainStatus === "taken") {
      alert("이미 사용 중인 서브도메인입니다. 다른 주소를 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      let logoUrl = formData.logo_url;
      let faviconUrl = formData.favicon_url;

      // 로고 업로드 (WebP 압축 완료 상태)
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        fd.append("path", `${memberId}/logo_${Date.now()}.webp`);
        const res = await uploadHomepageFile(fd);
        if (res.success && res.url) logoUrl = res.url;
      }

      // 파비콘 업로드 (WebP 압축 완료 상태)
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
      });

      if (!saveRes.success) {
        alert("저장 실패: " + saveRes.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      alert("오류: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── 스타일 ──
  const darkMode = theme.darkMode;
  const inputStyle: React.CSSProperties = {
    flex: 1, minHeight: 40, height: 40, padding: "0 14px",
    border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
    borderRadius: 6, fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827",
    background: darkMode ? "#2c2d31" : "#fff", outline: "none", boxSizing: "border-box",
  };
  const disabledStyle: React.CSSProperties = { ...inputStyle, background: darkMode ? "#333" : "#f3f4f6", color: darkMode ? "#666" : "#9ca3af", cursor: "not-allowed" };
  const labelStyle: React.CSSProperties = {
    width: 180, fontSize: 13, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#111827",
    flexShrink: 0, padding: "16px 20px", display: "flex", alignItems: "center",
    background: darkMode ? "#25262b" : "#f9fafb", borderRight: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`,
  };
  const rowStyle: React.CSSProperties = { display: "flex", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` };
  const contentStyle: React.CSSProperties = { flex: 1, padding: "16px 20px", display: "flex", alignItems: "center" };

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

  const themes = [
    { key: "office", label: "오피스형", desc: "깔끔한 사무실 중심 레이아웃", emoji: "🏢" },
    { key: "apartment", label: "아파트형", desc: "아파트·주거 전문 레이아웃", emoji: "🏠" },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: darkMode ? "#1a1b1e" : "#f4f5f7" }}>
      {/* 타이틀 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>🌐 홈페이지 설정</h1>
          {isFree && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
              무료 요금제 — 일부 기능 제한
            </span>
          )}
        </div>
        {formData.subdomain && (
          <a
            href={`http://${formData.subdomain}.gongsilnews.com`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13, fontWeight: 600, color: "#3b82f6", textDecoration: "none",
              padding: "8px 16px", border: "1px solid #3b82f6", borderRadius: 6,
              display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
            }}
          >
            🔗 내 홈페이지 미리보기
          </a>
        )}
      </div>

      {/* 폼 본체 */}
      <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden", marginBottom: 24 }}>

        {/* 1. 서브도메인 */}
        <div style={rowStyle}>
          <div style={labelStyle}>서브도메인 주소</div>
          <div style={{ ...contentStyle, gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1, minWidth: 260 }}>
              <input
                type="text"
                name="subdomain"
                value={formData.subdomain}
                onChange={handleChange}
                style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", minWidth: 120 }}
                placeholder="my-office"
                maxLength={30}
              />
              <span style={{
                height: 40, padding: "0 14px", display: "flex", alignItems: "center",
                background: darkMode ? "#333" : "#f3f4f6", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
                borderTopRightRadius: 6, borderBottomRightRadius: 6,
                fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280", fontWeight: 600, whiteSpace: "nowrap",
              }}>
                .gongsilnews.com
              </span>
            </div>
            {subdomainStatus === "checking" && <span style={{ fontSize: 12, color: "#3b82f6" }}>⏳ 확인 중...</span>}
            {subdomainStatus === "available" && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✅ 사용 가능</span>}
            {subdomainStatus === "taken" && <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>❌ 이미 사용 중</span>}
            <div style={{ width: "100%", fontSize: 12, color: darkMode ? "#666" : "#9ca3af" }}>
              영문 소문자, 숫자, 하이픈(-) 사용 가능 · 2~30자
            </div>
          </div>
        </div>

        {/* 2. 템플릿 선택 */}
        <div style={rowStyle}>
          <div style={labelStyle}>
            템플릿 선택
            {isFree && <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 4 }}>🔒</span>}
          </div>
          <div style={{ ...contentStyle, gap: 16 }}>
            {themes.map((t) => (
              <button
                key={t.key}
                onClick={() => !isFree && setFormData((p) => ({ ...p, theme_name: t.key }))}
                disabled={isFree}
                style={{
                  flex: 1, padding: "20px 16px", borderRadius: 10, cursor: isFree ? "not-allowed" : "pointer",
                  background: formData.theme_name === t.key
                    ? (darkMode ? "rgba(59,130,246,0.15)" : "#eff6ff")
                    : (darkMode ? "#333" : "#f9fafb"),
                  border: formData.theme_name === t.key
                    ? "2px solid #3b82f6"
                    : `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
                  textAlign: "center", transition: "all 0.2s",
                  opacity: isFree ? 0.5 : 1,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{t.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. 로고 업로드 */}
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
                    <img
                      src={logoPreview}
                      alt="로고 미리보기"
                      style={{ height: 48, maxWidth: 200, objectFit: "contain", borderRadius: 6, border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, background: "#fff", padding: 4 }}
                    />
                    <button
                      onClick={() => handleFileRemove("logo")}
                      style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "2px solid #fff", fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}
                    >
                      &times;
                    </button>
                  </div>
                )}
                {!logoPreview && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "logo")} style={{ fontSize: 14 }} />
                    <span style={{ fontSize: 12, color: theme.textSecondary }}>추천: 가로 200px 이상 PNG/SVG</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 4. 파비콘 업로드 */}
        <div style={rowStyle}>
          <div style={labelStyle}>파비콘 (탭 아이콘)</div>
          <div style={{ ...contentStyle, gap: 16 }}>
            {faviconPreview && (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={faviconPreview}
                  alt="파비콘 미리보기"
                  style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4, border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, background: "#fff", padding: 2 }}
                />
                <button
                  onClick={() => handleFileRemove("favicon")}
                  style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "2px solid #fff", fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>
            )}
            {!faviconPreview && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "favicon")} style={{ fontSize: 14 }} />
                <span style={{ fontSize: 12, color: theme.textSecondary }}>추천: 32×32 또는 64×64 PNG</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. 사이트 제목 */}
        <div style={rowStyle}>
          <div style={labelStyle}>사이트 제목</div>
          <div style={contentStyle}>
            <input
              type="text"
              name="site_title"
              value={formData.site_title}
              onChange={handleChange}
              style={inputStyle}
              placeholder="브라우저 탭에 표시될 이름 (예: 공실뉴스 부동산)"
              maxLength={50}
            />
          </div>
        </div>

        {/* 6. 대표 연락처 */}
        <div style={rowStyle}>
          <div style={labelStyle}>대표 연락처</div>
          <div style={contentStyle}>
            <input
              type="text"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              style={{ ...inputStyle, maxWidth: 240 }}
              placeholder="02-000-0000"
            />
          </div>
        </div>

        {/* 7. 회사 소개글 */}
        <div style={rowStyle}>
          <div style={{ ...labelStyle, alignItems: "flex-start", paddingTop: 20 }}>회사 소개글</div>
          <div style={{ ...contentStyle, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <textarea
              name="company_intro"
              value={formData.company_intro}
              onChange={handleChange}
              style={{ ...inputStyle, height: 120, padding: "12px 14px", resize: "vertical" as const }}
              placeholder="홈페이지 '회사소개' 메뉴에 표시됩니다. 중개사무소를 소개하는 글을 작성해주세요."
              maxLength={1000}
            />
            <span style={{ fontSize: 12, color: (formData.company_intro?.length || 0) >= 1000 ? "#ef4444" : theme.textSecondary, alignSelf: "flex-end" }}>
              {formData.company_intro?.length || 0} / 1,000
            </span>
          </div>
        </div>

        {/* 8. 홈페이지 활성화 토글 */}
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <div style={labelStyle}>홈페이지 활성화</div>
          <div style={{ ...contentStyle, gap: 12 }}>
            <button
              onClick={() => setFormData((p) => ({ ...p, is_active: !p.is_active }))}
              style={{
                width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
                background: formData.is_active ? "#3b82f6" : (darkMode ? "#555" : "#d1d5db"),
                position: "relative", transition: "background 0.3s",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: formData.is_active ? 27 : 3,
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

      {/* 하단 안내 및 저장 버튼 */}
      {isFree && (
        <div style={{
          padding: "16px 20px", marginBottom: 16, borderRadius: 10,
          background: darkMode ? "rgba(234,179,8,0.1)" : "#fffbeb",
          border: `1px solid ${darkMode ? "#78350f" : "#fde68a"}`,
          fontSize: 13, color: darkMode ? "#fcd34d" : "#92400e", lineHeight: 1.6,
        }}>
          💡 <strong>무료 요금제</strong>에서는 기본 템플릿(오피스형)과 공실뉴스 로고가 자동 적용됩니다.
          유료 요금제로 업그레이드하시면 자유로운 테마 선택과 커스텀 로고 설정이 가능합니다.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "8px 0 20px" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "14px 48px", fontSize: 15, fontWeight: 800, color: "#fff",
            background: saving ? "#93c5fd" : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(59,130,246,0.3)", transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {saving ? "⏳ 저장 중..." : saved ? "✅ 저장 완료!" : "💾 홈페이지 설정 저장"}
        </button>
      </div>
    </div>
  );
}
