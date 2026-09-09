"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getAuthorArticlesWithAdSettings,
  updateArticlesAdSettings,
  getAuthorBanners,
  AuthorBanner,
} from "@/app/actions/articleAd";

interface ArticleBulkAdManagerProps {
  theme: {
    bg: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
    darkMode: boolean;
    border: string;
  };
  memberId: string;
  memberName?: string;
  onBack: () => void;
}

export default function ArticleBulkAdManager({
  theme,
  memberId,
  memberName,
  onBack,
}: ArticleBulkAdManagerProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [articles, setArticles] = useState<any[]>([]);
  const [banners, setBanners] = useState<AuthorBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  // 체크박스 선택 기사 IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 일괄 적용 설정
  // selectedBannerId: "DEFAULT" | "NONE" | banner.id
  const [selectedBannerId, setSelectedBannerId] = useState<string>("DEFAULT");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // 필터 및 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [bannerStatusFilter, setBannerStatusFilter] = useState("ALL");

  // 토스트 메시지
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      const [artRes, banRes] = await Promise.all([
        getAuthorArticlesWithAdSettings(memberId),
        getAuthorBanners(memberId),
      ]);

      if (artRes.success && artRes.articles) {
        setArticles(artRes.articles);
      }
      if (banRes.success && banRes.data) {
        setBanners(banRes.data);
        // 등록된 배너가 있다면 첫 번째 활성 배너를 기본 선택값으로 자동 제안
        if (banRes.data.length > 0 && selectedBannerId === "DEFAULT") {
          const firstActive = banRes.data.find((b) => b.is_active) || banRes.data[0];
          setSelectedBannerId(firstActive.id);
          setStartDate(firstActive.start_date || "");
          setEndDate(firstActive.end_date || "");
        }
      }
    } catch (err: any) {
      showToast(err.message || "데이터 불러오기 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      loadData();
    }
  }, [memberId]);

  // 배너 드롭다운 변경 시 기간 자동 연동
  const handleBannerSelectChange = (val: string) => {
    setSelectedBannerId(val);
    if (val === "DEFAULT" || val === "NONE") {
      setStartDate("");
      setEndDate("");
    } else {
      const found = banners.find((b) => b.id === val);
      if (found) {
        setStartDate(found.start_date || "");
        setEndDate(found.end_date || "");
      }
    }
  };

  // 필터링된 기사 목록
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      // 검색어 (제목 또는 서브타이틀)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (art.title || "").toLowerCase().includes(q);
        const matchSub = (art.subtitle || "").toLowerCase().includes(q);
        if (!matchTitle && !matchSub) return false;
      }

      // 카테고리 필터
      if (categoryFilter !== "ALL") {
        if (art.section1 !== categoryFilter) return false;
      }

      // 배너 상태 필터
      const setting = art.ad_setting;
      const adType = setting?.ad_type || "DEFAULT";
      if (bannerStatusFilter === "BANNER") {
        if (adType !== "BANNER" || !setting?.custom_banner) return false;
      } else if (bannerStatusFilter === "DEFAULT") {
        if (adType !== "DEFAULT") return false;
      } else if (bannerStatusFilter === "NONE") {
        if (adType !== "NONE") return false;
      }

      return true;
    });
  }, [articles, searchQuery, categoryFilter, bannerStatusFilter]);

  // 전체 선택/해제
  const isAllSelected =
    filteredArticles.length > 0 &&
    filteredArticles.every((art) => selectedIds.includes(art.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // 현재 필터된 기사들 해제
      const filteredIds = new Set(filteredArticles.map((a) => a.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // 현재 필터된 기사들 모두 선택에 추가
      const newIds = new Set([...selectedIds, ...filteredArticles.map((a) => a.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  // 개별 선택/해제
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 선택된 배너 객체
  const currentSelectedBannerObj = banners.find((b) => b.id === selectedBannerId);

  // 일괄 적용 실행
  const handleApplyBatch = async () => {
    if (selectedIds.length === 0) {
      alert("배너를 적용할 기사를 1개 이상 선택해주세요.");
      return;
    }

    let targetBannerName = "기본 프로필 광고";
    if (selectedBannerId === "NONE") targetBannerName = "배너 노출 안 함(숨김)";
    else if (currentSelectedBannerObj) targetBannerName = `[${currentSelectedBannerObj.name}] 배너`;

    const periodText = startDate || endDate ? `\n(노출 기간: ${startDate || "시작일 없음"} ~ ${endDate || "종료일 없음"})` : "";
    const msg = `선택하신 ${selectedIds.length}개의 기사에\n'${targetBannerName}'을(를) 일괄 적용하시겠습니까?${periodText}`;

    if (!confirm(msg)) return;

    setIsApplying(true);
    try {
      const res = await updateArticlesAdSettings(selectedIds, memberId, {
        ad_type: selectedBannerId === "DEFAULT" ? "DEFAULT" : selectedBannerId === "NONE" ? "NONE" : "BANNER",
        custom_banner_id: selectedBannerId !== "DEFAULT" && selectedBannerId !== "NONE" ? selectedBannerId : null,
        start_date: startDate || null,
        end_date: endDate || null,
      });

      if (res.success) {
        showToast(`${selectedIds.length}개 기사에 배너가 성공적으로 일괄 적용되었습니다!`);
        setSelectedIds([]);
        loadData();
      } else {
        showToast(res.error || "일괄 적용에 실패했습니다.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "오류가 발생했습니다.", "error");
    } finally {
      setIsApplying(false);
    }
  };

  // 개별 기사 단독 빠른 변경
  const handleSingleArticleChange = async (articleId: string, bannerVal: string) => {
    const art = articles.find((a) => a.id === articleId);
    if (!art) return;

    let sDate = null;
    let eDate = null;
    let targetType: "DEFAULT" | "BANNER" | "NONE" = "DEFAULT";
    let customId = null;

    if (bannerVal === "NONE") {
      targetType = "NONE";
    } else if (bannerVal === "DEFAULT") {
      targetType = "DEFAULT";
    } else {
      targetType = "BANNER";
      customId = bannerVal;
      const bObj = banners.find((b) => b.id === bannerVal);
      if (bObj) {
        sDate = bObj.start_date || null;
        eDate = bObj.end_date || null;
      }
    }

    try {
      const res = await updateArticlesAdSettings([articleId], memberId, {
        ad_type: targetType,
        custom_banner_id: customId,
        start_date: sDate,
        end_date: eDate,
      });
      if (res.success) {
        showToast("기사 배너가 변경되었습니다.");
        loadData();
      } else {
        showToast(res.error || "변경 실패", "error");
      }
    } catch (err: any) {
      showToast(err.message || "오류가 발생했습니다.", "error");
    }
  };

  // 고유 카테고리 목록
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      if (a.section1) set.add(a.section1);
    });
    return Array.from(set);
  }, [articles]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg, fontFamily: "'Pretendard', sans-serif" }}>
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
            padding: "12px 22px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toast.text}
        </div>
      )}

      {/* ── 상단 네비게이션 & 헤더 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: darkMode ? "#2c2d31" : "#f1f5f9",
              border: `1px solid ${border}`,
              borderRadius: 6,
              color: textPrimary,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
              transition: "all 0.15s",
            }}
          >
            ← 광고/배너 목록으로 돌아가기
          </button>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>
              기사 일괄 배너관리
            </h1>
            <span style={{ fontSize: 13, color: textSecondary }}>
              내가 작성한 기사들의 하단 배너를 체크 한 번으로 일괄 교체합니다.
            </span>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: darkMode ? "#2c2d31" : "#ffffff",
            border: `1px solid ${border}`,
            borderRadius: 6,
            color: textSecondary,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔄 {loading ? "불러오는 중..." : "목록 새로고침"}
        </button>
      </div>

      {/* ── 1단계: 배너 지정 & 원클릭 일괄 적용 컨트롤러 바 ── */}
      <div
        style={{
          background: cardBg,
          borderRadius: 14,
          padding: "20px 24px",
          border: `1px solid ${border}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 7px", borderRadius: 4 }}>
            STEP 1
          </span>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: 0 }}>
            적용할 배너 선택 및 일괄 적용
          </h2>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
          {/* 배너 선택 드롭다운 */}
          <div style={{ minWidth: 260, flex: "1 1 260px" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 5 }}>
              적용할 배너
            </label>
            <select
              value={selectedBannerId}
              onChange={(e) => handleBannerSelectChange(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: `1.5px solid #3b82f6`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                color: textPrimary,
                background: darkMode ? "#1e293b" : "#f8fafc",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <optgroup label="── 등록된 내 배너 ──">
                {banners.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏷️ {b.name} {!b.is_active ? "(중지됨)" : "(진행중)"}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── 기본 / 특수 설정 ──">
                <option value="DEFAULT">👤 기본 프로필 광고 (업체/기자 정보)</option>
                <option value="NONE">🚫 배너 노출 안 함 (숨김)</option>
              </optgroup>
            </select>
          </div>

          {/* 노출 기간 설정 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "2 1 320px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 5 }}>
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: textPrimary,
                  background: darkMode ? "#1a1b1e" : "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <span style={{ marginTop: 22, color: textSecondary, fontWeight: 700 }}>~</span>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 5 }}>
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: textPrimary,
                  background: darkMode ? "#1a1b1e" : "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                style={{
                  padding: "9px 12px",
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  background: darkMode ? "#2c2d31" : "#f1f5f9",
                  color: textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                상시 노출
              </button>
            </div>
          </div>

          {/* 일괄 적용 실행 버튼 */}
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleApplyBatch}
              disabled={selectedIds.length === 0 || isApplying}
              style={{
                height: 42,
                padding: "0 24px",
                background: selectedIds.length > 0 ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : darkMode ? "#334155" : "#e2e8f0",
                color: selectedIds.length > 0 ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 800,
                cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
                boxShadow: selectedIds.length > 0 ? "0 4px 14px rgba(37, 99, 235, 0.35)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
              }}
            >
              <span>⚡</span>
              {isApplying
                ? "일괄 적용 중..."
                : `선택한 ${selectedIds.length}개 기사에 일괄 적용하기`}
            </button>
          </div>
        </div>

        {/* 선택된 배너 실시간 미니 프리뷰 */}
        {currentSelectedBannerObj && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px dashed ${border}`,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>
              선택 배너 미리보기:
            </span>
            <div
              style={{
                height: 38,
                width: 114,
                borderRadius: 6,
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                background: "#0f172a",
                flexShrink: 0,
              }}
            >
              <img
                src={currentSelectedBannerObj.image_url}
                alt={currentSelectedBannerObj.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>
              {currentSelectedBannerObj.name}
              {currentSelectedBannerObj.link_url && (
                <span style={{ fontSize: 12, color: "#3b82f6", marginLeft: 8, fontWeight: 400 }}>
                  🔗 {currentSelectedBannerObj.link_url}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 2단계: 기사 목록 테이블 & 필터 바 ── */}
      <div
        style={{
          background: cardBg,
          borderRadius: 14,
          border: `1px solid ${border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {/* 필터 및 검색 컨트롤 바 */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${border}`,
            background: darkMode ? "#2c2d31" : "#fafafa",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* 좌측: 전체선택 + 선택 카운트 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: textPrimary,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#3b82f6" }}
              />
              <span>
                {isAllSelected ? "전체 해제" : "목록 전체 선택"}
              </span>
            </label>

            <span style={{ fontSize: 13, color: textSecondary }}>
              (선택: <strong style={{ color: "#3b82f6" }}>{selectedIds.length}</strong> / 총 {filteredArticles.length}건)
            </span>
          </div>

          {/* 우측: 검색 + 카테고리 필터 + 배너상태 필터 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* 카테고리 필터 */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                border: `1px solid ${border}`,
                borderRadius: 6,
                fontSize: 13,
                color: textPrimary,
                background: darkMode ? "#1a1b1e" : "#fff",
                outline: "none",
              }}
            >
              <option value="ALL">모든 카테고리</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* 배너 상태 필터 */}
            <select
              value={bannerStatusFilter}
              onChange={(e) => setBannerStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                border: `1px solid ${border}`,
                borderRadius: 6,
                fontSize: 13,
                color: textPrimary,
                background: darkMode ? "#1a1b1e" : "#fff",
                outline: "none",
              }}
            >
              <option value="ALL">모든 배너 상태</option>
              <option value="BANNER">🏷️ 개별 배너 적용 중</option>
              <option value="DEFAULT">👤 기본 프로필</option>
              <option value="NONE">🚫 배너 숨김</option>
            </select>

            {/* 검색창 */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="기사 제목 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: 200,
                  padding: "8px 12px 8px 30px",
                  border: `1px solid ${border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  color: textPrimary,
                  background: darkMode ? "#1a1b1e" : "#fff",
                  outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: textSecondary }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "none",
                    fontSize: 12,
                    color: textSecondary,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 기사 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: darkMode ? "#1e293b" : "#f8fafc", borderBottom: `2px solid ${border}` }}>
                <th style={{ width: 44, padding: "12px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#3b82f6" }}
                  />
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: textSecondary }}>
                  기사 제목
                </th>
                <th style={{ width: 120, padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary }}>
                  카테고리
                </th>
                <th style={{ width: 110, padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary }}>
                  발행일
                </th>
                <th style={{ width: 220, padding: "12px 16px", textAlign: "left", fontWeight: 700, color: textSecondary }}>
                  현재 적용된 배너
                </th>
                <th style={{ width: 140, padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary }}>
                  개별 빠른 변경
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 60, textAlign: "center", color: textSecondary }}>
                    기사 목록을 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 60, textAlign: "center", color: textSecondary }}>
                    {searchQuery || categoryFilter !== "ALL" || bannerStatusFilter !== "ALL"
                      ? "검색 조건에 맞는 기사가 없습니다."
                      : "작성한 기사가 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredArticles.map((art) => {
                  const isChecked = selectedIds.includes(art.id);
                  const setting = art.ad_setting;
                  const adType = setting?.ad_type || "DEFAULT";
                  const customBanner = setting?.custom_banner;

                  return (
                    <tr
                      key={art.id}
                      onClick={() => handleToggleSelect(art.id)}
                      style={{
                        borderBottom: `1px solid ${darkMode ? "#2c2d31" : "#f1f5f9"}`,
                        background: isChecked
                          ? darkMode
                            ? "rgba(59, 130, 246, 0.15)"
                            : "#eff6ff"
                          : "transparent",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                    >
                      {/* 체크박스 */}
                      <td
                        style={{ padding: "14px", textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(art.id)}
                          style={{ width: 17, height: 17, cursor: "pointer", accentColor: "#3b82f6" }}
                        />
                      </td>

                      {/* 기사 제목 & 썸네일 */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {art.thumbnail_url && (
                            <div
                              style={{
                                width: 50,
                                height: 34,
                                borderRadius: 4,
                                overflow: "hidden",
                                background: "#0f172a",
                                flexShrink: 0,
                              }}
                            >
                              <img
                                src={art.thumbnail_url}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                          )}
                          <div>
                            <a
                              href={`/news/${art.article_no || art.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: textPrimary,
                                fontWeight: 700,
                                fontSize: 14,
                                textDecoration: "none",
                                lineHeight: 1.4,
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#3b82f6")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = textPrimary)}
                            >
                              {art.title}
                            </a>
                            {art.subtitle && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: textSecondary,
                                  marginTop: 2,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {art.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 카테고리 */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: darkMode ? "#1e293b" : "#f1f5f9",
                            color: textSecondary,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {art.section1 || "일반"}
                        </span>
                      </td>

                      {/* 발행일 */}
                      <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 12, color: textSecondary }}>
                        {art.published_at ? art.published_at.substring(0, 10) : art.created_at ? art.created_at.substring(0, 10) : "-"}
                      </td>

                      {/* 현재 적용된 배너 */}
                      <td style={{ padding: "14px 16px" }}>
                        {adType === "BANNER" && customBanner ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 56,
                                height: 20,
                                borderRadius: 3,
                                overflow: "hidden",
                                background: "#0f172a",
                                flexShrink: 0,
                                border: "1px solid #cbd5e1",
                              }}
                            >
                              <img
                                src={customBanner.image_url}
                                alt={customBanner.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span
                                style={{
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  display: "inline-block",
                                  marginBottom: 2,
                                }}
                              >
                                🏷️ {customBanner.name}
                              </span>
                              {(setting.start_date || setting.end_date) && (
                                <div style={{ fontSize: 11, color: textSecondary }}>
                                  {setting.start_date || "시작"} ~ {setting.end_date || "종료"}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : adType === "NONE" ? (
                          <span
                            style={{
                              background: darkMode ? "#3f1d24" : "#fef2f2",
                              color: "#ef4444",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            🚫 배너 숨김
                          </span>
                        ) : (
                          <span
                            style={{
                              background: darkMode ? "#1e293b" : "#f1f5f9",
                              color: textSecondary,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            👤 기본 프로필
                          </span>
                        )}
                      </td>

                      {/* 개별 빠른 변경 드롭다운 */}
                      <td
                        style={{ padding: "14px 16px", textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={adType === "BANNER" && setting?.custom_banner_id ? setting.custom_banner_id : adType}
                          onChange={(e) => handleSingleArticleChange(art.id, e.target.value)}
                          style={{
                            padding: "5px 8px",
                            border: `1px solid ${border}`,
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: textPrimary,
                            background: darkMode ? "#1a1b1e" : "#fff",
                            outline: "none",
                            cursor: "pointer",
                            maxWidth: 130,
                          }}
                        >
                          <option value="DEFAULT">👤 기본 프로필</option>
                          <option value="NONE">🚫 배너 숨김</option>
                          {banners.map((b) => (
                            <option key={b.id} value={b.id}>
                              🏷️ {b.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
