"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";

export type PeriodType = "1week" | "1month" | "3months" | "6months" | "12months" | "custom";

interface ArticleDetailPopularNewsWidgetProps {
  currentArticleId?: string | number;
  section1?: string;
  section2?: string;
  allArticles?: any[];
  basePath?: string;
}

function getCutoffDate(period: PeriodType): Date | null {
  const now = new Date();
  switch (period) {
    case "1week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "1month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "3months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "12months": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case "custom":
      return null;
    default:
      return null;
  }
}

function ArticleDetailPopularNewsWidgetImpl({
  currentArticleId,
  section1,
  section2,
  allArticles = [],
  basePath = "",
}: ArticleDetailPopularNewsWidgetProps) {
  const [period, setPeriod] = useState<PeriodType>("1week");
  const [showCustomModal, setShowCustomModal] = useState(false);

  // 직접선택 날짜 기본값 (오늘 기준 7일 전 ~ 오늘)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const [customStartDate, setCustomStartDate] = useState(weekAgoStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  const customModalRef = useRef<HTMLDivElement | null>(null);

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customModalRef.current && !customModalRef.current.contains(e.target as Node)) {
        setShowCustomModal(false);
      }
    };
    if (showCustomModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCustomModal]);

  // 2차 카테고리별 + 기간별 0.001초 인메모리 필터링
  const popularArticles = useMemo(() => {
    // 현재 열람 중인 기사 제외
    const curIdStr = String(currentArticleId || "");
    const baseList = allArticles.filter(
      (a) => String(a.id) !== curIdStr && String(a.article_no) !== curIdStr
    );

    // 1. 해당 기사의 2차 카테고리(section2) 우선 필터링
    let pool = baseList;
    if (section2) {
      const subList = baseList.filter((a) => a.section2 === section2);
      if (subList.length > 0) {
        pool = subList;
      }
    }

    // 2. 기간 필터링
    if (period === "custom") {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate + "T00:00:00");
        const end = new Date(customEndDate + "T23:59:59");
        pool = pool.filter((a) => {
          if (!a.published_at) return false;
          const pub = new Date(a.published_at);
          return pub >= start && pub <= end;
        });
      }
    } else {
      const cutoff = getCutoffDate(period);
      if (cutoff) {
        pool = pool.filter((a) => {
          if (!a.published_at) return false;
          return new Date(a.published_at) >= cutoff;
        });
      }
    }

    // 3. 조회수(view_count) 내림차순 정렬
    const sorted = [...pool].sort((a, b) => {
      const diff = (b.view_count || 0) - (a.view_count || 0);
      if (diff !== 0) return diff;
      return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
    });

    const top5 = sorted.slice(0, 5);

    // 4. 안전망(Fallback): 5개 미만인 경우 해당 카테고리 내 다른 기사로 보충
    if (top5.length < 5) {
      const existingIds = new Set(top5.map((a) => a.id));
      let fallbackPool = baseList;
      if (section2) {
        fallbackPool = baseList.filter((a) => a.section2 === section2 && !existingIds.has(a.id));
      } else {
        fallbackPool = baseList.filter((a) => !existingIds.has(a.id));
      }

      const sortedFallback = [...fallbackPool].sort(
        (a, b) => (b.view_count || 0) - (a.view_count || 0)
      );
      const filled = [...top5, ...sortedFallback.slice(0, 5 - top5.length)];

      if (filled.length < 5) {
        const filledIds = new Set(filled.map((a) => a.id));
        const overallFallback = baseList
          .filter((a) => !filledIds.has(a.id))
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        return [...filled, ...overallFallback.slice(0, 5 - filled.length)];
      }

      return filled;
    }

    return top5;
  }, [allArticles, currentArticleId, section2, period, customStartDate, customEndDate]);

  // 동적 타이틀: 2차 카테고리 우선 표기
  const displayTitle = section2
    ? `${section2} 많이 본 뉴스`
    : `${section1 || "공실뉴스"} 많이 본 뉴스`;

  return (
    <div className="sb-widget" style={{ position: "relative" }}>
      {/* 헤더: 타이틀 + 기간 셀렉트박스 (전체 1줄 구분선) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          paddingBottom: "10px",
          borderBottom: "1px solid #111",
        }}
      >
        <div
          style={{
            fontSize: "15px",
            fontWeight: 800,
            color: "#111",
            margin: 0,
            padding: 0,
            border: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "180px",
          }}
          title={displayTitle}
        >
          {displayTitle}
        </div>

        {/* 기간 선택 드롭다운 */}
        <div style={{ position: "relative" }}>
          <select
            value={period}
            onChange={(e) => {
              const val = e.target.value as PeriodType;
              setPeriod(val);
              if (val === "custom") {
                setShowCustomModal(true);
              }
            }}
            style={{
              padding: "3px 6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#374151",
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="1week">지난 1주일</option>
            <option value="1month">지난 1달</option>
            <option value="3months">지난 3개월</option>
            <option value="6months">지난 6개월</option>
            <option value="12months">지난 12개월</option>
            <option value="custom">기간 직접선택</option>
          </select>
        </div>
      </div>

      {/* 기간 직접선택 팝오버 모달 */}
      {showCustomModal && (
        <div
          ref={customModalRef}
          style={{
            position: "absolute",
            top: "40px",
            right: 0,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            padding: "14px",
            zIndex: 100,
            width: "240px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#111", marginBottom: "10px" }}>
            📅 기간 직접 선택
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "#6b7280", display: "block", marginBottom: "2px" }}>
                시작일
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#6b7280", display: "block", marginBottom: "2px" }}>
                종료일
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => {
                  setPeriod("1week");
                  setShowCustomModal(false);
                }}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  color: "#4b5563",
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                style={{
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "#1a4282",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 랭킹 1~5위 리스트 */}
      <ul className="pop-list">
        {popularArticles.length > 0 ? (
          popularArticles.map((item, i) => (
            <li key={item.id} className="pop-item">
              <Link
                href={`${basePath}/news/${item.article_no || item.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  width: "100%",
                }}
              >
                <span className="pop-ranking">{i + 1}</span>
                <span className="pop-title" style={{ wordBreak: "keep-all" }}>
                  {item.title}
                </span>
              </Link>
            </li>
          ))
        ) : (
          <li className="pop-item" style={{ color: "#999", fontSize: 13 }}>
            해당 기간에 등록된 기사가 없습니다.
          </li>
        )}
      </ul>
    </div>
  );
}

export const ArticleDetailPopularNewsWidget = React.memo(ArticleDetailPopularNewsWidgetImpl);
ArticleDetailPopularNewsWidget.displayName = "ArticleDetailPopularNewsWidget";
