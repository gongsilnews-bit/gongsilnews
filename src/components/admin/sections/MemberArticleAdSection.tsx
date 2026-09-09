"use client";

import React, { useState, useEffect, useRef } from "react";
import { AdminSectionProps } from "./types";
import {
  getAuthorBanners,
  saveAuthorBanner,
  deleteAuthorBanner,
  toggleAuthorBannerActive,
  AuthorBanner,
} from "@/app/actions/articleAd";

interface MemberArticleAdSectionProps extends AdminSectionProps {
  memberId: string;
  memberName: string;
  memberEmail?: string;
  role?: string;
}

/* ── WebP 압축 유틸리티 ── */
async function compressImageToWebP(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        // 최대 너비 1200px 제한
        if (w > 1200) {
          h = Math.round((h * 1200) / w);
          w = 1200;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context is not available"));
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Blob conversion failed"));
            const extName = file.name.replace(/\.[^/.]+$/, "");
            const newFile = new File([blob], `${extName}.webp`, { type: "image/webp" });
            resolve(newFile);
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (e) => reject(e);
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

export default function MemberArticleAdSection({
  theme,
  memberId,
  memberName,
}: MemberArticleAdSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [banners, setBanners] = useState<AuthorBanner[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 최고관리자 스타일의 폼 화면 전환: "list" | "new" | "edit"
  const [viewMode, setViewMode] = useState<"list" | "new" | "edit">("list");
  const [editingBanner, setEditingBanner] = useState<AuthorBanner | null>(null);

  // 배너 폼 상태
  const [bannerName, setBannerName] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerLinkTarget, setBannerLinkTarget] = useState("_blank");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await getAuthorBanners(memberId);
      if (res.success) {
        setBanners(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId]);

  // 배너 등록 모드로 진입
  const handleOpenNew = () => {
    setEditingBanner(null);
    setBannerName("");
    setBannerLink("");
    setBannerLinkTarget("_blank");
    setBannerFile(null);
    setImagePreview(null);
    setViewMode("new");
  };

  // 배너 수정 모드로 진입
  const handleOpenEdit = (b: AuthorBanner) => {
    setEditingBanner(b);
    setBannerName(b.name);
    setBannerLink(b.link_url || "");
    setBannerLinkTarget(b.link_target || "_blank");
    setBannerFile(null);
    setImagePreview(b.image_url);
    setViewMode("edit");
  };

  // 배너 활성/중지 토글
  const handleToggle = async (id: string, currentActive: boolean) => {
    const res = await toggleAuthorBannerActive(id, memberId, currentActive);
    if (res.success) {
      showToast(currentActive ? "배너가 중지되었습니다." : "배너가 활성화되었습니다.");
      loadData();
    } else {
      showToast(res.error || "상태 변경 실패", "error");
    }
  };

  // 배너 삭제 (단일 및 일괄)
  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}개의 배너를 삭제하시겠습니까?`)) return;
    let failCount = 0;
    for (const id of ids) {
      const res = await deleteAuthorBanner(id, memberId);
      if (!res.success) failCount++;
    }
    if (failCount === 0) {
      showToast("배너가 삭제되었습니다.");
    } else {
      showToast(`${failCount}건 삭제 실패`, "error");
    }
    setCheckedIds([]);
    loadData();
  };

  // 폼 저장 (신규/수정)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerName.trim()) {
      alert("배너명을 입력해주세요.");
      return;
    }
    if (!editingBanner && !bannerFile) {
      alert("배너 이미지를 등록해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      if (editingBanner) formData.append("id", editingBanner.id);
      formData.append("author_id", memberId);
      formData.append("name", bannerName.trim());
      formData.append("link_url", bannerLink.trim());
      formData.append("link_target", bannerLinkTarget);
      if (bannerFile) formData.append("image", bannerFile);
      if (editingBanner && !bannerFile) formData.append("image_url", editingBanner.image_url);

      const res = await saveAuthorBanner(formData);
      if (res.success) {
        showToast(editingBanner ? "배너가 성공적으로 수정되었습니다." : "새 배너가 등록되었습니다!");
        setViewMode("list");
        loadData();
      } else {
        showToast(res.error || "배너 저장 실패", "error");
      }
    } catch (err: any) {
      showToast(err.message || "오류가 발생했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 필터링된 배너 목록
  const filteredBanners = banners.filter((b) => {
    if (filter === "진행중") return b.is_active;
    if (filter === "중지") return !b.is_active;
    return true;
  });

  /* ══════════════════════════════════════════════════════════════
     1. 배너 등록 / 수정 폼 (최고관리자와 100% 동일한 프리미엄 UI)
     ══════════════════════════════════════════════════════════════ */
  if (viewMode === "new" || viewMode === "edit") {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg, fontFamily: "'Pretendard', sans-serif" }}>
        {/* 토스트 알림 */}
        {toast && (
          <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "success" ? "#0f172a" : "#ef4444", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            {toast.text}
          </div>
        )}

        {/* 상단 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>
            {viewMode === "edit" ? "배너 수정" : "새 배너 등록"}
          </h1>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            style={{
              padding: "8px 20px",
              background: darkMode ? "#374151" : "#f3f4f6",
              color: textPrimary,
              border: `1px solid ${border}`,
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← 목록으로
          </button>
        </div>

        {/* 메인 폼 카드 */}
        <form onSubmit={handleSubmit} style={{ background: cardBg, borderRadius: 14, padding: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            {/* 1) 배너명 */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                배너명 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={bannerName}
                onChange={(e) => setBannerName(e.target.value)}
                required
                placeholder="예: 논현동 신축 상가 분양 홍보 배너"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  color: textPrimary,
                  background: darkMode ? "#1a1b1e" : "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* 2) 배너 이미지 (1200X400 WebP 자동 압축) */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                배너 이미지 <span style={{ color: "#ef4444" }}>*</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#2563eb", marginLeft: 8 }}>
                  (권장: 1200X400 / WebP 자동 압축 변환 적용)
                </span>
              </label>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 320,
                    height: 120,
                    border: `2px dashed ${border}`,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    background: darkMode ? "#1a1b1e" : "#fafafa",
                    transition: "border-color 0.2s",
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="배너 미리보기" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center", color: textSecondary, fontSize: 12 }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>📁</div>
                      클릭하여 이미지 첨부 (1200X400)
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const webpFile = await compressImageToWebP(file, 0.85);
                        setBannerFile(webpFile);
                        setImagePreview(URL.createObjectURL(webpFile));
                      } catch (err) {
                        console.error("압축 실패:", err);
                        setBannerFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }
                  }}
                />
                <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                    {bannerFile ? `선택된 파일: ${bannerFile.name} (${Math.round(bannerFile.size / 1024)} KB)` : "파일 선택 대기 중"}
                  </div>
                  <div style={{ fontSize: 12, color: textSecondary, lineHeight: 1.5 }}>
                    • 이미지를 첨부하시면 모바일/PC에 가장 최적화된 <strong>WebP 형식</strong>으로 자동 압축됩니다.<br />
                    • 기사 하단 프로필 카드와 정확히 일치하는 <strong>1200 × 400 px</strong> 규격을 권장합니다.
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      alignSelf: "flex-start",
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: `1px solid ${border}`,
                      background: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      color: textPrimary,
                      cursor: "pointer",
                      marginTop: 4,
                    }}
                  >
                    이미지 변경하기
                  </button>
                </div>
              </div>
            </div>

            {/* 3) 링크 URL */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                링크 URL
              </label>
              <input
                type="text"
                value={bannerLink}
                onChange={(e) => setBannerLink(e.target.value)}
                placeholder="https://example.com (클릭 시 이동할 웹사이트/블로그)"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  color: textPrimary,
                  background: darkMode ? "#1a1b1e" : "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* 4) 링크 열기 방식 */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                링크 열기 방식
              </label>
              <select
                value={bannerLinkTarget}
                onChange={(e) => setBannerLinkTarget(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  color: textPrimary,
                  background: darkMode ? "#1a1b1e" : "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="_blank">새 창에서 열기 (_blank)</option>
                <option value="_self">현재 창에서 열기 (_self)</option>
              </select>
            </div>
          </div>

          {/* 실시간 실물 배너 미리보기 카드 */}
          {imagePreview && (
            <div style={{ marginBottom: 28, paddingTop: 20, borderTop: `1px dashed ${border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#2563eb", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>👀</span> [실시간 미리보기] 실제 기사 하단 노출 모습
                </span>
                <span style={{ fontSize: 12, color: textSecondary }}>
                  {bannerLink ? `연결 링크: ${bannerLink}` : "링크 미입력"}
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
                  background: "#ffffff",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "rgba(15, 23, 42, 0.72)",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 4,
                    letterSpacing: "0.5px",
                    zIndex: 2,
                  }}
                >
                  AD
                </span>
                <img
                  src={imagePreview}
                  alt="배너 실시간 미리보기"
                  style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }}
                />
              </div>
            </div>
          )}

          {/* 저장 / 취소 버튼 */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{
                padding: "12px 24px",
                background: darkMode ? "#2c2d31" : "#f3f4f6",
                color: textPrimary,
                border: `1px solid ${border}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: "12px 32px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              {isSaving ? "저장 중..." : viewMode === "edit" ? "배너 수정 완료" : "배너 등록하기"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     2. 배너 목록 카드 그리드 (최고관리자와 100% 동일한 디자인 레이아웃)
     ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg, fontFamily: "'Pretendard', sans-serif" }}>
      {/* 토스트 알림 */}
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "success" ? "#0f172a" : "#ef4444", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
          {toast.text}
        </div>
      )}

      {/* 상단 타이틀 */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>광고/배너 관리</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( 진행중 {banners.filter((b) => b.is_active).length}건 / 전체 {banners.length}건 )
        </span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 (전체 / 진행중 / 중지) */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {[
            { key: "전체", count: banners.length },
            { key: "진행중", count: banners.filter((b) => b.is_active).length },
            { key: "중지", count: banners.filter((b) => !b.is_active).length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setCheckedIds([]);
              }}
              style={{
                border: "none",
                background: "none",
                padding: "16px 20px",
                fontSize: 14,
                fontWeight: filter === tab.key ? 800 : 600,
                color: filter === tab.key ? "#3b82f6" : textSecondary,
                borderBottom: filter === tab.key ? "3px solid #3b82f6" : "3px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab.key}
              <span
                style={{
                  background: tab.key === "전체" ? "#e5e7eb" : tab.key === "진행중" ? "#10b981" : "#9ca3af",
                  color: tab.key === "전체" ? "#4b5563" : "#fff",
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* 액션 바 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handleOpenNew}
            style={{
              display: "flex",
              alignItems: "center",
              height: 36,
              padding: "0 18px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              gap: 6,
            }}
          >
            + 새 배너 등록
          </button>
          <button
            onClick={() => handleDelete(checkedIds)}
            disabled={checkedIds.length === 0}
            style={{
              height: 36,
              padding: "0 16px",
              background: darkMode ? "#2c2d31" : "#fff",
              color: checkedIds.length > 0 ? "#ef4444" : "#ccc",
              border: `1px solid ${checkedIds.length > 0 ? "#ef4444" : border}`,
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: checkedIds.length > 0 ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🗑 선택삭제 {checkedIds.length > 0 ? `(${checkedIds.length})` : ""}
          </button>
        </div>

        {/* 최고관리자 스타일 카드형 배너 그리드 */}
        <div style={{ padding: 24 }}>
          {filteredBanners.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: textSecondary }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>등록된 배너가 없습니다.</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>[+ 새 배너 등록] 버튼을 눌러 기사 하단 배너를 등록해 보세요.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {filteredBanners.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: `1px solid ${checkedIds.includes(b.id) ? "#3b82f6" : border}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.2s",
                  }}
                >
                  {/* 상단 상태 바 (최고관리자와 동일) */}
                  <div
                    style={{
                      padding: "8px 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      background: b.is_active ? "#10b981" : "#9ca3af",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{b.created_at ? new Date(b.created_at).toLocaleDateString("ko-KR") : "상시 노출"}</span>
                    <span style={{ background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: 4 }}>
                      {b.is_active ? "진행중" : "중지"}
                    </span>
                  </div>

                  {/* 배너 이미지 썸네일 */}
                  <div
                    onClick={() => handleOpenEdit(b)}
                    style={{
                      width: "100%",
                      height: 150,
                      cursor: "pointer",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: darkMode ? "#1a1b1e" : "#f9fafb",
                    }}
                  >
                    <img src={b.image_url} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>

                  {/* 배너 정보 및 체크박스 */}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        style={{ accentColor: "#3b82f6" }}
                        checked={checkedIds.includes(b.id)}
                        onChange={(e) =>
                          setCheckedIds(
                            e.target.checked ? [...checkedIds, b.id] : checkedIds.filter((id) => id !== b.id)
                          )
                        }
                      />
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: textPrimary,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.name}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: textSecondary, marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.link_url ? `🔗 ${b.link_url}` : "링크 없음"}
                    </div>

                    {/* 액션 버튼 그룹 (중지/활성 | 수정 | 삭제) */}
                    <div style={{ display: "flex", gap: 6, borderTop: `1px solid ${border}`, paddingTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(b.id, b.is_active)}
                        style={{
                          flex: 1,
                          height: 32,
                          background: b.is_active ? "#ef4444" : "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {b.is_active ? "⏸ 중지" : "▶ 활성"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(b)}
                        style={{
                          flex: 1,
                          height: 32,
                          background: darkMode ? "#374151" : "#4b5563",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ 수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete([b.id])}
                        style={{
                          flex: 1,
                          height: 32,
                          background: "none",
                          color: "#9ca3af",
                          border: `1px solid ${border}`,
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        🗑 삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
