"use client";

import React, { useState, useRef } from "react";
import { AdminTheme } from "../types";
import { uploadHomepageFile } from "@/app/actions/homepage";

interface HomepageBannerTabProps {
  theme: AdminTheme;
  formData: any;
  memberId: string;
  onFormUpdate: (updates: Record<string, any>) => void;
}

export default function HomepageBannerTab({ theme, formData, memberId, onFormUpdate }: HomepageBannerTabProps) {
  const darkMode = theme.darkMode;
  const [uploading, setUploading] = useState(false);

  // banners: string[] (배너 이미지 URL 배열)
  const banners: string[] = formData.banners || [];

  const compressToWebP = (file: File, maxW = 1200, maxH = 600, quality = 0.85): Promise<File> => {
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
    if (banners.length >= 5) {
      alert("배너는 최대 5개까지 등록할 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const file = e.target.files[0];
      const compressed = await compressToWebP(file);
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("path", `${memberId}/banner_${Date.now()}.webp`);
      const res = await uploadHomepageFile(fd);
      if (res.success && res.url) {
        onFormUpdate({ banners: [...banners, res.url] });
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

  const removeBanner = (idx: number) => {
    onFormUpdate({ banners: banners.filter((_, i) => i !== idx) });
  };

  return (
    <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 10, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, background: darkMode ? "#25262b" : "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: theme.textSecondary }}>
          💡 메인 페이지 상단에 슬라이더로 표시됩니다. 최대 5장, 권장 크기 1200×400px
        </span>
        <span style={{ fontSize: 12, color: theme.textSecondary, fontWeight: 600 }}>{banners.length} / 5</span>
      </div>

      {/* 배너 목록 */}
      {banners.length > 0 && (
        <div style={{ padding: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
          {banners.map((url, idx) => (
            <div key={idx} style={{ position: "relative", width: 280, height: 100, borderRadius: 8, overflow: "hidden", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}` }}>
              <img src={url} alt={`배너 ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => removeBanner(idx)}
                style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "2px 8px", textAlign: "center" }}>
                배너 {idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 업로드 버튼 */}
      <div style={{ padding: 20, borderTop: banners.length > 0 ? `1px solid ${darkMode ? "#333" : "#e5e7eb"}` : "none" }}>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
          background: darkMode ? "#374151" : "#f3f4f6", border: `1px dashed ${darkMode ? "#555" : "#d1d5db"}`,
          borderRadius: 8, cursor: banners.length >= 5 || uploading ? "not-allowed" : "pointer",
          fontSize: 14, color: theme.textSecondary, fontWeight: 600,
          opacity: banners.length >= 5 || uploading ? 0.5 : 1,
        }}>
          {uploading ? "⏳ 업로드 중..." : "➕ 배너 이미지 추가"}
          <input type="file" accept="image/*" onChange={handleUpload}
            disabled={banners.length >= 5 || uploading}
            style={{ display: "none" }} />
        </label>
      </div>
    </div>
  );
}
