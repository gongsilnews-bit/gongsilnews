"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AdminSectionProps } from "./types";
import {
  getAuthorBanners,
  saveAuthorBanner,
  deleteAuthorBanner,
  toggleAuthorBannerActive,
  getAuthorBannerStats,
  AuthorBanner,
  AuthorBannerStat,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const action = searchParams.get("action");
  const bannerId = searchParams.get("id");

  const [banners, setBanners] = useState<AuthorBanner[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 최고관리자 스타일의 폼 화면 전환: "list" | "new" | "edit" | "stats"
  const [viewMode, setViewMode] = useState<"list" | "new" | "edit" | "stats">("list");
  const [editingBanner, setEditingBanner] = useState<AuthorBanner | null>(null);

  // 성과 분석 통계 데이터
  const [stats, setStats] = useState<AuthorBannerStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // 배너 폼 상태
  const [bannerName, setBannerName] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerLinkTarget, setBannerLinkTarget] = useState("_blank");
  const [bannerStartDate, setBannerStartDate] = useState("");
  const [bannerEndDate, setBannerEndDate] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"PC" | "MOBILE">("PC");
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

  const loadStats = async () => {
    if (!memberId) return;
    setStatsLoading(true);
    try {
      const res = await getAuthorBannerStats(memberId);
      if (res.success) {
        setStats(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId]);

  // 배너 상태 판별 헬퍼 함수 (최고관리자와 동일)
  const getBannerStatusInfo = (b: AuthorBanner) => {
    if (!b.is_active) {
      return { label: "중지", color: "#9ca3af", bg: "#f3f4f6" };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (b.start_date && b.start_date > today) {
      return { label: "예약", color: "#f59e0b", bg: "#fffbeb" };
    }
    if (b.end_date && b.end_date < today) {
      return { label: "종료", color: "#ef4444", bg: "#fef2f2" };
    }
    return { label: "진행중", color: "#10b981", bg: "#ecfdf5" };
  };

  // 배너 노출 기간 텍스트
  const getBannerPeriodText = (b: AuthorBanner) => {
    if (b.start_date && b.end_date) {
      return `${b.start_date} ~ ${b.end_date}`;
    }
    if (b.start_date) {
      return `${b.start_date} ~ 상시`;
    }
    if (b.end_date) {
      return `~ ${b.end_date}`;
    }
    return "상시 노출 (기간 제한 없음)";
  };

  // URL action 파라미터와 viewMode 동기화 (뒤로가기 시 대시보드 대신 목록으로 안전 복귀)
  useEffect(() => {
    if (!action) {
      setViewMode("list");
      setEditingBanner(null);
      setImagePreview(null);
    } else if (action === "stats") {
      setViewMode("stats");
      loadStats();
    } else if (action === "new") {
      setEditingBanner(null);
      setBannerName("");
      setBannerLink("");
      setBannerLinkTarget("_blank");
      setBannerStartDate("");
      setBannerEndDate("");
      setBannerFile(null);
      setImagePreview(null);
      setViewMode("new");
    } else if (action === "edit") {
      setViewMode("edit");
      if (bannerId && banners.length > 0) {
        const found = banners.find((b) => b.id === bannerId);
        if (found) {
          setEditingBanner(found);
          setBannerName(found.name);
          setBannerLink(found.link_url || "");
          setBannerLinkTarget(found.link_target || "_blank");
          setBannerStartDate(found.start_date || "");
          setBannerEndDate(found.end_date || "");
          setBannerFile(null);
          setImagePreview(found.image_url);
        }
      }
    }
  }, [action, bannerId, banners]);

  // 배너 등록 모드로 진입 (URL 연동)
  const handleOpenNew = () => {
    router.push(`${pathname}?menu=article_ad&action=new`);
  };

  // 배너 수정 모드로 진입 (URL 연동)
  const handleOpenEdit = (b: AuthorBanner) => {
    setEditingBanner(b);
    setBannerName(b.name);
    setBannerLink(b.link_url || "");
    setBannerLinkTarget(b.link_target || "_blank");
    setBannerStartDate(b.start_date || "");
    setBannerEndDate(b.end_date || "");
    setBannerFile(null);
    setImagePreview(b.image_url);
    router.push(`${pathname}?menu=article_ad&action=edit&id=${b.id}`);
  };

  // 성과 분석 모드로 진입 (URL 연동)
  const handleOpenStats = () => {
    router.push(`${pathname}?menu=article_ad&action=stats`);
  };

  // 목록으로 돌아가기 (URL 연동)
  const handleBackToList = () => {
    router.push(`${pathname}?menu=article_ad`);
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
      formData.append("start_date", bannerStartDate.trim());
      formData.append("end_date", bannerEndDate.trim());
      if (bannerFile) formData.append("image", bannerFile);
      if (editingBanner && !bannerFile) formData.append("image_url", editingBanner.image_url);

      const res = await saveAuthorBanner(formData);
      if (res.success) {
        showToast(editingBanner ? "배너가 성공적으로 수정되었습니다." : "새 배너가 등록되었습니다!");
        router.push(`${pathname}?menu=article_ad`);
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
    if (filter === "전체") return true;
    return getBannerStatusInfo(b).label === filter;
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

        {/* 상단 헤더: 뒤로가기 버튼이 타이틀 앞에 위치 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <button
            type="button"
            onClick={handleBackToList}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              background: darkMode ? "#374151" : "#f3f4f6",
              color: textPrimary,
              border: `1px solid ${border}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode ? "#4b5563" : "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = darkMode ? "#374151" : "#f3f4f6";
            }}
          >
            ← 뒤로가기
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>
            {viewMode === "edit" ? "배너 수정" : "새 배너 등록"}
          </h1>
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

            {/* 2) 배너 이미지 */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                배너 이미지 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 320,
                    height: 107,
                    border: `1px solid ${border}`,
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
                      <div style={{ fontSize: 26, marginBottom: 4 }}>📁</div>
                      클릭하여 이미지 첨부
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

            {/* 5) 노출 기간 설정 (시작일 ~ 종료일) */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                노출 기간 설정
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: textSecondary }}>시작일:</span>
                  <input
                    type="date"
                    value={bannerStartDate}
                    onChange={(e) => setBannerStartDate(e.target.value)}
                    style={{
                      padding: "10px 14px",
                      border: `1px solid ${border}`,
                      borderRadius: 8,
                      fontSize: 14,
                      color: textPrimary,
                      background: darkMode ? "#1a1b1e" : "#fff",
                      outline: "none",
                    }}
                  />
                </div>
                <span style={{ fontSize: 14, color: textSecondary, fontWeight: 700 }}>~</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: textSecondary }}>종료일:</span>
                  <input
                    type="date"
                    value={bannerEndDate}
                    onChange={(e) => setBannerEndDate(e.target.value)}
                    style={{
                      padding: "10px 14px",
                      border: `1px solid ${border}`,
                      borderRadius: 8,
                      fontSize: 14,
                      color: textPrimary,
                      background: darkMode ? "#1a1b1e" : "#fff",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBannerStartDate("");
                    setBannerEndDate("");
                  }}
                  style={{
                    padding: "9px 14px",
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    background: darkMode ? "#2c2d31" : "#f3f4f6",
                    color: textSecondary,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  상시 노출 (기간 초기화)
                </button>
              </div>
              <p style={{ fontSize: 12, color: textSecondary, margin: "6px 0 0" }}>
                * 기간을 설정하면 기사 하단에 해당 기간 동안만 배너가 노출되며, 기사 작성 시 이 배너를 가져오면 노출 기간 조건이 기사에 자동으로 함께 동기화됩니다. (미설정 시 상시 노출)
              </p>
            </div>
          </div>

          {/* 실시간 실물 배너 미리보기 카드 (PC & 모바일 듀얼 뷰) */}
          <div style={{ marginBottom: 32, paddingTop: 24, borderTop: `1px dashed ${border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#2563eb", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>👀</span> [실시간 미리보기] 실제 기사 하단 노출 모습
                </span>
                <span style={{ fontSize: 12, color: textSecondary, background: darkMode ? "#2c2d31" : "#f1f5f9", padding: "3px 8px", borderRadius: 6 }}>
                  독자 화면 100% 동일 렌더링
                </span>
              </div>

              {/* 🖥️ PC vs 📱 모바일 디바이스 전환 토글 바 */}
              <div style={{ display: "inline-flex", background: darkMode ? "#1f2937" : "#e2e8f0", padding: 3, borderRadius: 10, border: `1px solid ${border}` }}>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("PC")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: previewDevice === "PC" ? (darkMode ? "#374151" : "#ffffff") : "transparent",
                    color: previewDevice === "PC" ? (darkMode ? "#ffffff" : "#0f172a") : textSecondary,
                    boxShadow: previewDevice === "PC" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>🖥️</span> PC 화면 (기사 본문 800px)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("MOBILE")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: previewDevice === "MOBILE" ? (darkMode ? "#374151" : "#ffffff") : "transparent",
                    color: previewDevice === "MOBILE" ? (darkMode ? "#ffffff" : "#0f172a") : textSecondary,
                    boxShadow: previewDevice === "MOBILE" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>📱</span> 모바일 화면 (스마트폰 380px)
                </button>
              </div>
            </div>

            {/* 디바이스 뷰 컨테이너 */}
            <div
              style={{
                background: darkMode ? "#111827" : "#f8fafc",
                borderRadius: 16,
                padding: previewDevice === "PC" ? "28px 20px" : "36px 16px",
                border: `1px solid ${border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transition: "all 0.3s ease",
              }}
            >
              {previewDevice === "PC" ? (
                /* ─── 🖥️ PC 기사 뷰 (최대 820px 본문 박스) ─── */
                <div
                  style={{
                    width: "100%",
                    maxWidth: 820,
                    background: darkMode ? "#1e293b" : "#ffffff",
                    borderRadius: 14,
                    padding: "24px 28px",
                    boxShadow: "0 4px 20px -2px rgba(0,0,0,0.06)",
                    border: `1px solid ${border}`,
                  }}
                >
                  {/* 배너 노출 영역 */}
                  {imagePreview ? (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                        background: "#ffffff",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: "rgba(15, 23, 42, 0.75)",
                          color: "#ffffff",
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "2px 7px",
                          borderRadius: 4,
                          letterSpacing: "0.5px",
                          zIndex: 2,
                        }}
                      >
                        AD
                      </span>
                      <img
                        src={imagePreview}
                        alt="배너 PC 실시간 미리보기"
                        style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 180,
                        borderRadius: 12,
                        border: "2px dashed #cbd5e1",
                        background: darkMode ? "#0f172a" : "#f1f5f9",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        color: textSecondary,
                      }}
                    >
                      <span style={{ fontSize: 28 }}>🖼️</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>이미지 첨부 시 실제 PC 규격(800px)으로 표시됩니다</span>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── 📱 모바일 스마트폰 뷰 (380px 목업) ─── */
                <div
                  style={{
                    width: "100%",
                    maxWidth: 380,
                    background: "#0f172a",
                    borderRadius: 44,
                    padding: "12px",
                    boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.1)",
                    border: "4px solid #334155",
                    position: "relative",
                  }}
                >
                  {/* 상단 다이내믹 아일랜드 & 노치 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 16px 8px", color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>
                    <span>9:41</span>
                    <div style={{ width: 80, height: 18, background: "#000", borderRadius: 20, margin: "0 auto" }} />
                    <span>5G 􀛨</span>
                  </div>

                  {/* 스마트폰 내부 화면 */}
                  <div
                    style={{
                      background: darkMode ? "#1e293b" : "#ffffff",
                      borderRadius: 32,
                      padding: "24px 16px",
                      minHeight: 220,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    {/* 모바일 배너 노출 */}
                    {imagePreview ? (
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          background: "#ffffff",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            background: "rgba(15, 23, 42, 0.75)",
                            color: "#ffffff",
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: 3,
                            zIndex: 2,
                          }}
                        >
                          AD
                        </span>
                        <img
                          src={imagePreview}
                          alt="배너 모바일 실시간 미리보기"
                          style={{ width: "100%", aspectRatio: "1200 / 400", objectFit: "cover", display: "block" }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: 120,
                          borderRadius: 10,
                          border: "2px dashed #cbd5e1",
                          background: darkMode ? "#0f172a" : "#f1f5f9",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          color: textSecondary,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>📱</span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>스마트폰 배너 크기로 표시됩니다</span>
                      </div>
                    )}

                    {/* 스마트폰 홈 바 (Home Indicator) */}
                    <div style={{ width: 110, height: 4, background: darkMode ? "#475569" : "#cbd5e1", borderRadius: 2, marginTop: 20 }} />
                  </div>
                </div>
              )}
            </div>
          </div>

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
     2. 배너 성과 분석 대시보드 (최고관리자와 100% 동일한 프리미엄 UI)
     ══════════════════════════════════════════════════════════════ */
  if (viewMode === "stats") {
    const totalBanners = stats.length;
    const activeBanners = stats.filter((s) => s.is_active).length;
    const totalClicks = stats.reduce((acc, s) => acc + (s.click_count || 0), 0);
    const totalViews = stats.reduce((acc, s) => acc + (s.view_count || 0), 0);

    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg, fontFamily: "'Pretendard', sans-serif" }}>
        {/* 상단 헤더: 뒤로가기 버튼이 타이틀 앞에 위치 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <button
            type="button"
            onClick={handleBackToList}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              background: darkMode ? "#374151" : "#f3f4f6",
              color: textPrimary,
              border: `1px solid ${border}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode ? "#4b5563" : "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = darkMode ? "#374151" : "#f3f4f6";
            }}
          >
            ← 뒤로가기
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>📊 배너 성과 분석</h1>
            <p style={{ fontSize: 13, color: textSecondary, margin: "4px 0 0" }}>
              작성자 본인이 등록한 배너들의 실시간 노출수, 클릭수 및 클릭률(CTR) 통계입니다.
            </p>
          </div>
        </div>

        {/* 요약 카드 4종 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "전체 배너", value: totalBanners, icon: "🖼️", color: "#3b82f6" },
            { label: "활성 배너", value: activeBanners, icon: "✅", color: "#10b981" },
            { label: "총 클릭수", value: totalClicks.toLocaleString(), icon: "👆", color: "#f59e0b" },
            { label: "총 노출수", value: totalViews.toLocaleString(), icon: "👁️", color: "#8b5cf6" },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                background: cardBg,
                borderRadius: 12,
                padding: "20px 24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                border: `1px solid ${border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{card.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>{card.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* 배너별 성과 테이블 */}
        <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, fontWeight: 700, color: textPrimary, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>배너별 클릭 성과 (CTR = 클릭수 ÷ 노출수)</span>
            <button
              type="button"
              onClick={loadStats}
              disabled={statsLoading}
              style={{
                background: "none",
                border: `1px solid ${border}`,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                color: textSecondary,
                cursor: statsLoading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🔄 {statsLoading ? "새로고침 중..." : "새로고침"}
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 100 }}>미리보기</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}` }}>배너명</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 90 }}>상태</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 150 }}>노출 기간</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 100 }}>노출수</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 100 }}>클릭수</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 100 }}>CTR</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 220 }}>클릭률 그래프</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const ctrNum = parseFloat(s.ctr) || 0;
                const statusInfo = getBannerStatusInfo(s);
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      <div style={{ width: 80, height: 28, borderRadius: 4, overflow: "hidden", background: "#f3f4f6", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={s.image_url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: textPrimary }}>
                      <div>{s.name}</div>
                      {s.link_url && (
                        <a
                          href={s.link_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", display: "inline-block", marginTop: 2, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          🔗 {s.link_url}
                        </a>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: statusInfo.bg,
                          color: statusInfo.color,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 12, color: textSecondary, fontWeight: 500 }}>
                      {getBannerPeriodText(s)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: textPrimary, fontWeight: 600 }}>
                      {(s.view_count || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#3b82f6", fontWeight: 700 }}>
                      {(s.click_count || 0).toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "center",
                        fontWeight: 700,
                        color: ctrNum > 5 ? "#10b981" : ctrNum > 1 ? "#f59e0b" : textSecondary,
                      }}
                    >
                      {s.ctr}%
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ background: darkMode ? "#1a1b1e" : "#f3f4f6", borderRadius: 4, height: 20, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(ctrNum * 5, 100)}%`,
                            height: "100%",
                            background: `linear-gradient(90deg, #3b82f6, ${ctrNum > 5 ? "#10b981" : "#60a5fa"})`,
                            borderRadius: 4,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: "center", color: textSecondary }}>
                    등록된 배너가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     3. 배너 목록 카드 그리드 (최고관리자와 100% 동일한 디자인 레이아웃)
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
          ( 진행중 {banners.filter((b) => getBannerStatusInfo(b).label === "진행중").length}건 / 전체 {banners.length}건 )
        </span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 (전체 / 진행중 / 예약 / 종료 / 중지 - 최고관리자와 100% 동일) */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {["전체", "진행중", "예약", "종료", "중지"].map((tab) => {
            let count = 0;
            if (tab === "전체") count = banners.length;
            else count = banners.filter((b) => getBannerStatusInfo(b).label === tab).length;

            return (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab);
                  setCheckedIds([]);
                }}
                style={{
                  border: "none",
                  background: "none",
                  padding: "16px 20px",
                  fontSize: 14,
                  fontWeight: filter === tab ? 800 : 600,
                  color: filter === tab ? "#3b82f6" : textSecondary,
                  borderBottom: filter === tab ? "3px solid #3b82f6" : "3px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {tab}
                <span
                  style={{
                    background: tab === "전체" ? "#e5e7eb" : tab === "진행중" ? "#10b981" : tab === "예약" ? "#f59e0b" : tab === "종료" ? "#ef4444" : "#9ca3af",
                    color: tab === "전체" ? "#4b5563" : "#fff",
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
            onClick={handleOpenStats}
            style={{
              display: "flex",
              alignItems: "center",
              height: 36,
              padding: "0 16px",
              background: "#8b5cf6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              gap: 6,
            }}
          >
            📊 성과 분석
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
                  {/* 상단 상태 바 (최고관리자와 동일: 노출기간 + 실시간 상태) */}
                  {(() => {
                    const statusInfo = getBannerStatusInfo(b);
                    return (
                      <div
                        style={{
                          padding: "8px 14px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                          background: statusInfo.label === "진행중" ? "#10b981" : statusInfo.label === "예약" ? "#f59e0b" : statusInfo.label === "종료" ? "#ef4444" : "#9ca3af",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "68%" }}>
                          📅 {getBannerPeriodText(b)}
                        </span>
                        <span style={{ background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: 4 }}>
                          {statusInfo.label}
                        </span>
                      </div>
                    );
                  })()}

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

                    <div style={{ fontSize: 12, color: textSecondary, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.link_url ? `🔗 ${b.link_url}` : "링크 없음"}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: textSecondary, marginBottom: 10 }}>
                      <span style={{ padding: "2px 8px", background: darkMode ? "#2c2d31" : "#f3f4f6", borderRadius: 4, fontWeight: 600 }}>1200x400</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span>클릭 <strong style={{ color: "#3b82f6" }}>{(b.click_count || 0).toLocaleString()}</strong></span>
                        <span>노출 <strong style={{ color: textPrimary }}>{(b.view_count || 0).toLocaleString()}</strong></span>
                      </div>
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
