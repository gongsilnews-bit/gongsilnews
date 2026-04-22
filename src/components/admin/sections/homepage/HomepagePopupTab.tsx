"use client";

import React, { useState } from "react";
import { AdminTheme } from "../types";
import { uploadHomepageFile } from "@/app/actions/homepage";

interface HomepagePopupTabProps {
  theme: AdminTheme;
  formData: any;
  memberId: string;
  onFormUpdate: (updates: Record<string, any>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function HomepagePopupTab({ theme, formData, memberId, onFormUpdate, onChange }: HomepagePopupTabProps) {
  const darkMode = theme.darkMode;
  const [uploading, setUploading] = useState(false);

  // popup_image, popup_link, popup_is_active
  const popupImage = formData.popup_image || null;
  const popupLink = formData.popup_link || "";
  const isActive = formData.popup_is_active ?? false;

  const compressToWebP = (file: File, maxW = 600, maxH = 800, quality = 0.85): Promise<File> => {
    if (!file.type.startsWith("image/")) return Promise.resolve(file);
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxW) { height *= maxW / width; width = maxW; }
        if (height > maxH) { width *= maxH / height; height = maxH; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); return resolve(file); }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" }));
        }, "image/webp", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const compressed = await compressToWebP(file);
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("path", `${memberId}/popup_${Date.now()}.webp`);
      const res = await uploadHomepageFile(fd);
      if (res.success && res.url) {
        onFormUpdate({ popup_image: res.url, popup_is_active: true });
      } else {
        alert("업로드 실패: " + (res.error || "알 수 없는 오류"));
      }
    } catch (err: any) {
      alert("오류: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePopup = () => {
    onFormUpdate({ popup_image: null, popup_is_active: false });
  };

  return (
    <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 10, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, background: darkMode ? "#25262b" : "#f9fafb" }}>
        <span style={{ fontSize: 13, color: theme.textSecondary }}>
          💡 홈페이지 접속 시 최초로 보여지는 메인 팝업입니다. (예: 공지사항, 이벤트)
        </span>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 20 }}>
          {/* 팝업 이미지 영역 */}
          <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              width: "100%", height: 260, borderRadius: 8, border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`,
              background: darkMode ? "#333" : "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", position: "relative"
            }}>
              {popupImage ? (
                <>
                  <img src={popupImage} alt="팝업 이미지" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  <button onClick={removePopup}
                    style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: 12, cursor: "pointer" }}>✕</button>
                </>
              ) : (
                <span style={{ fontSize: 13, color: theme.textSecondary }}>이미지 없음</span>
              )}
            </div>

            <label style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px",
              background: darkMode ? "#374151" : "#f3f4f6", border: `1px dashed ${darkMode ? "#555" : "#d1d5db"}`,
              borderRadius: 6, cursor: uploading ? "not-allowed" : "pointer",
              fontSize: 13, color: theme.textSecondary, fontWeight: 600, opacity: uploading ? 0.5 : 1,
            }}>
              {uploading ? "업로드 중..." : "📷 이미지 등록"}
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
            </label>
          </div>

          {/* 팝업 설정 영역 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 활성화 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>팝업 활성화</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => onFormUpdate({ popup_is_active: !isActive })}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                    background: isActive ? "#3b82f6" : (darkMode ? "#555" : "#d1d5db"),
                    position: "relative", transition: "background 0.3s",
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 3, left: isActive ? 25 : 3,
                    transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </button>
                <span style={{ fontSize: 13, color: isActive ? "#3b82f6" : theme.textSecondary, fontWeight: 600 }}>
                  {isActive ? "표시함" : "숨김"}
                </span>
              </div>
            </div>

            {/* 링크 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>링크 주소 (선택)</div>
              <input type="url" name="popup_link" value={popupLink} onChange={onChange}
                style={{
                  width: "100%", height: 38, padding: "0 12px", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
                  borderRadius: 6, fontSize: 13, color: darkMode ? "#e1e4e8" : "#111827",
                  background: darkMode ? "#2c2d31" : "#fff", outline: "none", boxSizing: "border-box",
                }} placeholder="클릭 시 이동할 주소 (예: https://...)" />
              <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                💡 팝업을 클릭했을 때 특정 페이지로 이동하려면 입력하세요.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
