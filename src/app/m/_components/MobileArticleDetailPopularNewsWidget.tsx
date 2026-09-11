"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";

export type PeriodType = "1week" | "1month" | "3months" | "6months" | "12months" | "custom";

interface MobileArticleDetailPopularNewsWidgetProps {
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

function MobileArticleDetailPopularNewsWidgetImpl({
  currentArticleId,
  section1,
  section2,
  allArticles = [],
  basePath = "/m",
}: MobileArticleDetailPopularNewsWidgetProps) {
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
    <div style={{ padding: "20px 16px", borderBottom: "8px solid #f4f6f8", backgroundColor: "#fff", position: "relative" }}>
      {/* 헤더: 타이틀 + 기간 셀렉트박스 (전체 1줄 구분선) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: "1px solid #111",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            marginRight: "8px",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#508bf5",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: "none",
              border: "none",
              outline: "none",
            }}
          >
            {section2 || section1 || "공실뉴스"}
          </span>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#1f2937",
              marginLeft: "5px",
              flexShrink: 0,
              textDecoration: "none",
              border: "none",
              outline: "none",
            }}
          >
            많이 본 뉴스
          </span>
        </div>

        {/* 기간 선택 드롭다운 */}
        <div style={{ flexShrink: 0 }}>
          <select
            value={period}
            onChange={(e) => {
              const val = e.target.value as PeriodType;
              setPeriod(val);
              if (val === "custom") setShowCustomModal(true);
            }}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#4b5563",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
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

      {/* 기간 직접선택 팝오버 (모바일) */}
      {showCustomModal && (
        <div
          ref={customModalRef}
          style={{
            position: "absolute",
            top: "55px",
            right: "16px",
            left: "16px",
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            padding: "16px",
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>
            📅 기간 직접 선택
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "3px" }}>
                시작일
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "3px" }}>
                종료일
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  setPeriod("1week");
                  setShowCustomModal(false);
                }}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#4b5563",
                  fontWeight: 600,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                style={{
                  padding: "6px 16px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "#1a4282",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
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
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {popularArticles.map((a: any, idx: number) => {
          const rank = idx + 1;
          const isTop3 = rank <= 3;
          return (
            <Link
              href={`${basePath}/news/${a.article_no || a.id}`}
              key={`popular-${a.id}`}
              className="article-row"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                textDecoration: "none",
                cursor: "pointer",
                padding: "8px 10px",
                margin: "0 -4px",
                borderRadius: "8px",
                transition: "transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.12s ease",
                WebkitTapHighlightColor: "transparent",
                willChange: "transform",
              }}
            >
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  fontStyle: "italic",
                  color: isTop3 ? "#508bf5" : "#71717a",
                  width: "18px",
                  textAlign: "center",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                {rank}
              </span>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#1f2937",
                  lineHeight: "1.4",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  wordBreak: "keep-all",
                }}
              >
                {a.title}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export const MobileArticleDetailPopularNewsWidget = React.memo(MobileArticleDetailPopularNewsWidgetImpl);
MobileArticleDetailPopularNewsWidget.displayName = "MobileArticleDetailPopularNewsWidget";
