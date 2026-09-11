"use client";

import React, { useState, useRef, useEffect } from "react";

interface ArticleVacancyDropdownProps {
  articleId: string;
  currentVacancyId: string | null;
  currentVacancyTitle?: string | null;
  vacanciesList: any[];
  isPaidRealtor: boolean;
  onSelect: (articleId: string, vacancyId: string | null) => Promise<void>;
  darkMode?: boolean;
}

function formatShortMoney(tradeType: string, deposit?: number, rent?: number) {
  const format = (val?: number) => {
    if (!val || val === 0) return "0";
    const m = Math.round(val / 10000);
    if (m === 0) return "0";
    const e = Math.floor(m / 10000);
    const r = m % 10000;
    let res = "";
    if (e > 0) res += `${e}억`;
    if (r > 0) res += `${r}만`;
    return res || "0";
  };

  if (tradeType === "매매" || tradeType === "전세") {
    return `[${tradeType} ${format(deposit)}]`;
  }
  if (tradeType === "월세" || tradeType === "단기") {
    return `[${tradeType} ${format(deposit)}/${format(rent)}]`;
  }
  return `[${tradeType}]`;
}

export default function ArticleVacancyDropdown({
  articleId,
  currentVacancyId,
  currentVacancyTitle,
  vacanciesList,
  isPaidRealtor,
  onSelect,
  darkMode = false,
}: ArticleVacancyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isPaidRealtor) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 8px",
          background: darkMode ? "#2c2d31" : "#f3f4f6",
          color: "#9ca3af",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          cursor: "not-allowed",
        }}
        title="공실뉴스부동산 / 공실등록부동산 유료 회원 전용 기능입니다."
      >
        🔒 유료회원
      </span>
    );
  }

  const selectedVacancy = vacanciesList.find((v) => v.id === currentVacancyId);
  const displayLabel = selectedVacancy
    ? `${formatShortMoney(selectedVacancy.trade_type, selectedVacancy.deposit, selectedVacancy.monthly_rent)} ${selectedVacancy.building_name || selectedVacancy.dong || "공실"}`
    : currentVacancyTitle || (currentVacancyId ? "선택된 공실" : "공실 없음");

  const hasAttached = Boolean(currentVacancyId);

  const handleItemClick = async (vacancyId: string | null) => {
    setLoading(true);
    try {
      await onSelect(articleId, vacancyId);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const btnBg = hasAttached
    ? darkMode
      ? "#1e3a8a"
      : "#eff6ff"
    : darkMode
    ? "#2c2d31"
    : "#f9fafb";
  const btnColor = hasAttached ? "#2563eb" : "#6b7280";
  const btnBorder = hasAttached
    ? darkMode
      ? "#3b82f6"
      : "#bfdbfe"
    : darkMode
    ? "#444"
    : "#d1d5db";

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          height: 28,
          padding: "0 10px",
          background: btnBg,
          color: btnColor,
          border: `1px solid ${btnBorder}`,
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          cursor: loading ? "wait" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
          maxWidth: 130,
          overflow: "hidden",
          textOverflow: "ellipsis",
          transition: "all 0.15s",
          opacity: loading ? 0.6 : 1,
        }}
        title={`클릭하여 기사 연결 공실 변경 (현재: ${displayLabel})`}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {loading ? "저장 중..." : displayLabel}
        </span>
        <span style={{ fontSize: 9, opacity: 0.7, flexShrink: 0 }}>▼</span>
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            width: 260,
            maxHeight: 280,
            overflowY: "auto",
            background: darkMode ? "#1f2937" : "#fff",
            border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
            borderRadius: 8,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            zIndex: 9999,
            padding: "6px",
            textAlign: "left",
          }}
        >
          <div
            style={{
              padding: "6px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#6b7280",
              borderBottom: `1px solid ${darkMode ? "#374151" : "#f3f4f6"}`,
              marginBottom: 4,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>기사 노출 공실 (최대 1개)</span>
            <span style={{ color: "#2563eb" }}>모두에게 노출 매물만</span>
          </div>

          {/* 선택 안 함 버튼 */}
          <div
            onClick={() => handleItemClick(null)}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: !hasAttached ? "#ef4444" : darkMode ? "#e5e7eb" : "#374151",
              background: !hasAttached ? (darkMode ? "#374151" : "#fef2f2") : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode ? "#374151" : "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = !hasAttached
                ? darkMode
                  ? "#374151"
                  : "#fef2f2"
                : "transparent";
            }}
          >
            <span>🚫</span>
            <span>선택 안함 (미노출)</span>
          </div>

          <div
            style={{
              height: 1,
              background: darkMode ? "#374151" : "#f3f4f6",
              margin: "4px 0",
            }}
          />

          {/* 매물 목록 */}
          {vacanciesList.length === 0 ? (
            <div
              style={{
                padding: "16px 8px",
                textAlign: "center",
                fontSize: 12,
                color: "#9ca3af",
                lineHeight: 1.4,
              }}
            >
              [부동산노출+일반인노출]로<br />등록된 활성 매물이 없습니다.
            </div>
          ) : (
            vacanciesList.map((v) => {
              const isSelected = v.id === currentVacancyId;
              const priceTag = formatShortMoney(v.trade_type, v.deposit, v.monthly_rent);
              const addr = v.building_name || v.dong || "공실";

              return (
                <div
                  key={v.id}
                  onClick={() => handleItemClick(v.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    background: isSelected
                      ? darkMode
                        ? "#1e3a8a"
                        : "#eff6ff"
                      : "transparent",
                    color: isSelected ? "#2563eb" : darkMode ? "#e5e7eb" : "#1f2937",
                    fontWeight: isSelected ? 700 : 500,
                    marginBottom: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = darkMode ? "#374151" : "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#2563eb", fontWeight: 700 }}>{priceTag}</span>
                    {v.exclusive_m2 && (
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{v.exclusive_m2}㎡</span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {addr}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
