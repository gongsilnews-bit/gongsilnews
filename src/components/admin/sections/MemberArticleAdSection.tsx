"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import {
  getAuthorBanners,
  saveAuthorBanner,
  deleteAuthorBanner,
  getAuthorArticlesWithAdSettings,
  updateArticlesAdSettings,
  AuthorBanner,
} from "@/app/actions/articleAd";

interface MemberArticleAdSectionProps extends AdminSectionProps {
  memberId: string;
  memberName: string;
  memberEmail?: string;
  role?: string;
}

export default function MemberArticleAdSection({
  theme,
  memberId,
  memberName,
}: MemberArticleAdSectionProps) {
  const { cardBg, textPrimary, textSecondary, border } = theme;

  // 탭 상태: "articles" (기사별 광고 설정) | "banners" (내 배너 보관함)
  const [activeTab, setActiveTab] = useState<"articles" | "banners">("articles");

  // 데이터 상태
  const [articles, setArticles] = useState<any[]>([]);
  const [banners, setBanners] = useState<AuthorBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 체크박스 선택된 기사 ID들
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);

  // 일괄 적용 폼 상태
  const [batchAdType, setBatchAdType] = useState<"DEFAULT" | "BANNER" | "NONE">("DEFAULT");
  const [batchBannerId, setBatchBannerId] = useState<string>("");
  const [batchStartDate, setBatchStartDate] = useState<string>("");
  const [batchEndDate, setBatchEndDate] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  // 배너 등록 모달 상태
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AuthorBanner | null>(null);
  const [bannerName, setBannerName] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  // 토스트 메시지
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 데이터 로드
  const loadData = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const [artRes, banRes] = await Promise.all([
        getAuthorArticlesWithAdSettings(memberId),
        getAuthorBanners(memberId),
      ]);
      if (artRes.success) setArticles(artRes.articles || []);
      if (banRes.success) {
        setBanners(banRes.data || []);
        if (banRes.data && banRes.data.length > 0 && !batchBannerId) {
          setBatchBannerId(banRes.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId]);

  // 전체 선택 토글
  const handleSelectAll = () => {
    if (selectedArticleIds.length === articles.length) {
      setSelectedArticleIds([]);
    } else {
      setSelectedArticleIds(articles.map((a) => a.id));
    }
  };

  // 개별 선택 토글
  const handleToggleSelect = (id: string) => {
    setSelectedArticleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 일괄 적용 실행
  const handleApplyBatch = async () => {
    if (selectedArticleIds.length === 0) {
      alert("적용할 기사를 목록에서 1개 이상 선택해주세요.");
      return;
    }

    if (batchAdType === "BANNER" && !batchBannerId) {
      alert("적용할 배너를 선택해주세요. 먼저 '내 배너 보관함'에서 배너를 등록해주세요.");
      return;
    }

    setIsApplying(true);
    const res = await updateArticlesAdSettings(selectedArticleIds, memberId, {
      ad_type: batchAdType,
      custom_banner_id: batchAdType === "BANNER" ? batchBannerId : null,
      start_date: batchStartDate || null,
      end_date: batchEndDate || null,
    });
    setIsApplying(false);

    if (res.success) {
      showToast(`${res.count || selectedArticleIds.length}개 기사의 광고 설정이 일괄 적용되었습니다!`);
      setSelectedArticleIds([]);
      loadData();
    } else {
      showToast(res.error || "적용 실패", "error");
    }
  };

  // 단일 기사 즉시 적용
  const handleSingleSave = async (
    articleId: string,
    adType: "DEFAULT" | "BANNER" | "NONE",
    bannerId?: string | null,
    start?: string | null,
    end?: string | null
  ) => {
    const res = await updateArticlesAdSettings([articleId], memberId, {
      ad_type: adType,
      custom_banner_id: bannerId || null,
      start_date: start || null,
      end_date: end || null,
    });
    if (res.success) {
      showToast("기사 광고 설정이 변경되었습니다.");
      loadData();
    } else {
      showToast(res.error || "변경 실패", "error");
    }
  };

  // 배너 저장 (신규/수정)
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerName.trim()) {
      alert("배너 이름을 입력해주세요.");
      return;
    }
    if (!editingBanner && !bannerFile) {
      alert("배너 이미지를 첨부해주세요.");
      return;
    }

    setIsSavingBanner(true);
    const formData = new FormData();
    if (editingBanner) formData.append("id", editingBanner.id);
    formData.append("author_id", memberId);
    formData.append("name", bannerName.trim());
    formData.append("link_url", bannerLink.trim());
    if (bannerFile) formData.append("image", bannerFile);
    if (editingBanner && !bannerFile) formData.append("image_url", editingBanner.image_url);

    const res = await saveAuthorBanner(formData);
    setIsSavingBanner(false);

    if (res.success) {
      showToast(editingBanner ? "배너가 수정되었습니다." : "새 배너가 등록되었습니다.");
      setShowBannerModal(false);
      setEditingBanner(null);
      setBannerName("");
      setBannerLink("");
      setBannerFile(null);
      setBannerPreview("");
      loadData();
    } else {
      showToast(res.error || "배너 저장 실패", "error");
    }
  };

  // 배너 삭제
  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm("이 배너를 삭제하시겠습니까? (이 배너가 설정된 기사는 자동으로 기본형으로 복귀됩니다)")) return;
    const res = await deleteAuthorBanner(bannerId, memberId);
    if (res.success) {
      showToast("배너가 삭제되었습니다.");
      loadData();
    } else {
      showToast(res.error || "삭제 실패", "error");
    }
  };

  const openNewBannerModal = () => {
    setEditingBanner(null);
    setBannerName("");
    setBannerLink("");
    setBannerFile(null);
    setBannerPreview("");
    setShowBannerModal(true);
  };

  const openEditBannerModal = (b: AuthorBanner) => {
    setEditingBanner(b);
    setBannerName(b.name);
    setBannerLink(b.link_url || "");
    setBannerFile(null);
    setBannerPreview(b.image_url);
    setShowBannerModal(true);
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto", fontFamily: "'Pretendard', sans-serif" }}>
      {/* 토스트 알림 */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: toast.type === "success" ? "#0f172a" : "#ef4444",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          }}
        >
          {toast.text}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>📢</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>
            기사 광고 / 배너 관리
          </h1>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 6,
              background: "#eff6ff",
              color: "#2563eb",
            }}
          >
            공실뉴스기자 전용
          </span>
        </div>
        <p style={{ fontSize: 14, color: textSecondary, margin: 0 }}>
          내가 작성한 기사 하단에 노출되는 <strong>[기본형 등록자정보]</strong> 또는 <strong>[직접 제작한 홍보 배너]</strong>를 손쉽게 일괄 설정합니다.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${border}`, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("articles")}
          style={{
            padding: "12px 20px",
            fontSize: 15,
            fontWeight: 800,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: activeTab === "articles" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "articles" ? "#2563eb" : textSecondary,
            transition: "all 0.15s",
          }}
        >
          📰 기사별 광고 설정 ({articles.length}건)
        </button>
        <button
          onClick={() => setActiveTab("banners")}
          style={{
            padding: "12px 20px",
            fontSize: 15,
            fontWeight: 800,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: activeTab === "banners" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "banners" ? "#2563eb" : textSecondary,
            transition: "all 0.15s",
          }}
        >
          🖼️ 내 배너 보관함 ({banners.length}개)
        </button>
      </div>

      {/* ── 탭 1: 기사별 광고 설정 ── */}
      {activeTab === "articles" && (
        <div>
          {/* 일괄 적용 바 (체크박스 선택 시 활성화) */}
          <div
            style={{
              background: "#f8fafc",
              border: `1px solid ${border}`,
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 20,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                선택된 기사: <strong style={{ color: "#2563eb" }}>{selectedArticleIds.length}</strong>건
              </span>
            </div>

            <div style={{ height: 20, width: 1, background: "#cbd5e1" }} />

            {/* 일괄 광고 유형 */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: textSecondary }}>광고 형태:</span>
              <select
                value={batchAdType}
                onChange={(e) => setBatchAdType(e.target.value as any)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  outline: "none",
                }}
              >
                <option value="DEFAULT">🏢 기본형 (공실 등록자정보 카드)</option>
                <option value="BANNER">🖼️ 직접 배너형 (보관함 배너 선택)</option>
                <option value="NONE">❌ 광고 노출 안함</option>
              </select>
            </div>

            {/* 배너 선택 (배너형일 때만 노출) */}
            {batchAdType === "BANNER" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: textSecondary }}>배너:</span>
                {banners.length > 0 ? (
                  <select
                    value={batchBannerId}
                    onChange={(e) => setBatchBannerId(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      fontWeight: 600,
                      outline: "none",
                      maxWidth: 180,
                    }}
                  >
                    {banners.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={openNewBannerModal}
                    style={{
                      padding: "7px 12px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + 배너 먼저 등록하기
                  </button>
                )}
              </div>
            )}

            {/* 기간 설정 */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: textSecondary }}>노출 기간:</span>
              <input
                type="date"
                value={batchStartDate}
                onChange={(e) => setBatchStartDate(e.target.value)}
                title="시작일 (비우면 즉시)"
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
              />
              <span style={{ color: "#94a3b8" }}>~</span>
              <input
                type="date"
                value={batchEndDate}
                onChange={(e) => setBatchEndDate(e.target.value)}
                title="종료일 (만료 시 기본형 복귀)"
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
              />
            </div>

            {/* 일괄 적용 버튼 */}
            <button
              onClick={handleApplyBatch}
              disabled={isApplying || selectedArticleIds.length === 0}
              style={{
                marginLeft: "auto",
                padding: "9px 18px",
                background: selectedArticleIds.length > 0 ? "#2563eb" : "#94a3b8",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: selectedArticleIds.length > 0 ? "pointer" : "not-allowed",
                boxShadow: selectedArticleIds.length > 0 ? "0 2px 8px rgba(37, 99, 235, 0.3)" : "none",
              }}
            >
              {isApplying ? "적용 중..." : "선택한 기사에 일괄 적용하기"}
            </button>
          </div>

          {/* 기사 목록 테이블 */}
          <div
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${border}` }}>
                  <th style={{ padding: "14px 16px", width: 44, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={articles.length > 0 && selectedArticleIds.length === articles.length}
                      onChange={handleSelectAll}
                      style={{ cursor: "pointer", width: 16, height: 16 }}
                    />
                  </th>
                  <th style={{ padding: "14px 16px", color: textSecondary, fontWeight: 700 }}>기사 제목</th>
                  <th style={{ padding: "14px 16px", width: 120, color: textSecondary, fontWeight: 700 }}>작성일</th>
                  <th style={{ padding: "14px 16px", width: 180, color: textSecondary, fontWeight: 700 }}>적용된 광고</th>
                  <th style={{ padding: "14px 16px", width: 180, color: textSecondary, fontWeight: 700 }}>노출 기간</th>
                  <th style={{ padding: "14px 16px", width: 110, color: textSecondary, fontWeight: 700, textAlign: "center" }}>
                    바로보기
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary }}>
                      기사 및 광고 설정을 불러오는 중입니다...
                    </td>
                  </tr>
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary }}>
                      작성된 기사가 없습니다. 기사를 먼저 작성해주세요.
                    </td>
                  </tr>
                ) : (
                  articles.map((art) => {
                    const isChecked = selectedArticleIds.includes(art.id);
                    const setting = art.ad_setting || {};
                    const adType = setting.ad_type || "DEFAULT";
                    const bannerInfo = setting.custom_banner;

                    return (
                      <tr
                        key={art.id}
                        style={{
                          borderBottom: `1px solid ${border}`,
                          background: isChecked ? "#f0f7ff" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        {/* 체크박스 */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(art.id)}
                            style={{ cursor: "pointer", width: 16, height: 16 }}
                          />
                        </td>

                        {/* 기사 제목 */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 700, color: textPrimary, marginBottom: 2 }}>{art.title}</div>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{art.section1 || "공실뉴스"}</span>
                        </td>

                        {/* 작성일 */}
                        <td style={{ padding: "14px 16px", color: textSecondary, fontSize: 12 }}>
                          {art.published_at ? art.published_at.slice(0, 10) : art.created_at?.slice(0, 10)}
                        </td>

                        {/* 적용된 광고 (개별 드롭다운) */}
                        <td style={{ padding: "14px 16px" }}>
                          <select
                            value={
                              adType === "BANNER" && setting.custom_banner_id
                                ? `BANNER:${setting.custom_banner_id}`
                                : adType
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "DEFAULT" || val === "NONE") {
                                handleSingleSave(art.id, val, null, setting.start_date, setting.end_date);
                              } else if (val.startsWith("BANNER:")) {
                                const bId = val.replace("BANNER:", "");
                                handleSingleSave(art.id, "BANNER", bId, setting.start_date, setting.end_date);
                              }
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #cbd5e1",
                              fontSize: 12,
                              fontWeight: 600,
                              background: "#fff",
                              maxWidth: 160,
                            }}
                          >
                            <option value="DEFAULT">🏢 기본형 (등록자정보)</option>
                            {banners.map((b) => (
                              <option key={b.id} value={`BANNER:${b.id}`}>
                                🖼️ {b.name}
                              </option>
                            ))}
                            <option value="NONE">❌ 노출 안함</option>
                          </select>
                        </td>

                        {/* 노출 기간 */}
                        <td style={{ padding: "14px 16px", fontSize: 12, color: textSecondary }}>
                          {setting.start_date || setting.end_date ? (
                            <span>
                              {setting.start_date || "상시"} ~ {setting.end_date || "상시"}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>상시 노출</span>
                          )}
                        </td>

                        {/* 바로보기 */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <a
                            href={`/news/${art.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2563eb",
                              textDecoration: "none",
                              padding: "4px 8px",
                              borderRadius: 4,
                              background: "#eff6ff",
                            }}
                          >
                            기사보기 ↗
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 탭 2: 내 배너 보관함 ── */}
      {activeTab === "banners" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: textPrimary, margin: "0 0 4px 0" }}>
                내 홍보/분양 배너 목록
              </h2>
              <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>
                등록한 배너는 기사별 광고 설정에서 자유롭게 선택하여 노출할 수 있습니다.
              </p>
            </div>
            <button
              onClick={openNewBannerModal}
              style={{
                padding: "10px 18px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              }}
            >
              + 새 배너 등록하기
            </button>
          </div>

          {/* 배너 카드 그리드 */}
          {banners.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: 14,
                textAlign: "center",
                color: textSecondary,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>🖼️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                등록된 맞춤 배너가 없습니다.
              </div>
              <p style={{ fontSize: 13, margin: "0 0 16px 0" }}>
                자사 홈페이지, 블로그, 유튜브, 분양 홍보 배너를 등록해보세요!
              </p>
              <button
                onClick={openNewBannerModal}
                style={{
                  padding: "9px 18px",
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + 첫 배너 등록하기
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {banners.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: cardBg,
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* 배너 이미지 미리보기 */}
                  <div style={{ position: "relative", height: 140, background: "#f1f5f9", overflow: "hidden" }}>
                    <img
                      src={b.image_url}
                      alt={b.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(15, 23, 42, 0.7)",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      AD
                    </span>
                  </div>

                  {/* 정보 */}
                  <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: "0 0 6px 0" }}>
                      {b.name}
                    </h3>
                    <div style={{ fontSize: 12, color: textSecondary, wordBreak: "break-all", marginBottom: 14 }}>
                      링크: {b.link_url || "링크 없음 (단순 이미지)"}
                    </div>

                    {/* 액션 버튼 */}
                    <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
                      <button
                        onClick={() => openEditBannerModal(b)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          background: "#f1f5f9",
                          color: textPrimary,
                          border: "none",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(b.id)}
                        style={{
                          padding: "8px 14px",
                          background: "#fee2e2",
                          color: "#ef4444",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 배너 등록/수정 모달 ── */}
      {showBannerModal && (
        <div
          onClick={() => setShowBannerModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100dvh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 480,
              background: "#fff",
              borderRadius: 18,
              padding: "30px 26px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 18px 0" }}>
              {editingBanner ? "배너 정보 수정" : "새 맞춤 배너 등록"}
            </h2>

            <form onSubmit={handleSaveBanner} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* 배너 명칭 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  배너 이름 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 9월 역삼동 상가 분양 홍보 배너"
                  value={bannerName}
                  onChange={(e) => setBannerName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              {/* 랜딩 링크 URL */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  클릭 시 이동할 링크 URL (선택)
                </label>
                <input
                  type="text"
                  placeholder="https://... (자사 홈페이지, 유튜브, 블로그 등)"
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 배너 이미지 파일 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  배너 이미지 {!editingBanner && <span style={{ color: "#ef4444" }}>*</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setBannerFile(file);
                      setBannerPreview(URL.createObjectURL(file));
                    }
                  }}
                  style={{ fontSize: 12 }}
                />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  가로형 와이드 이미지 권장 (권장 크기: 1200 x 300px 또는 4:1 비율)
                </div>
              </div>

              {/* 이미지 미리보기 */}
              {bannerPreview && (
                <div style={{ marginTop: 6, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", maxHeight: 120 }}>
                  <img src={bannerPreview} alt="미리보기" style={{ width: "100%", height: 120, objectFit: "cover" }} />
                </div>
              )}

              {/* 버튼 */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowBannerModal(false)}
                  style={{
                    padding: "10px 18px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingBanner}
                  style={{
                    padding: "10px 20px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isSavingBanner ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingBanner ? "저장 중..." : editingBanner ? "수정 완료" : "배너 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
