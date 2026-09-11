"use client";

import React, { useMemo } from "react";
import Link from "next/link";

interface PopularNewsSidebarWidgetProps {
  title?: string;
  selectedSubCategory?: string | null;
  allArticles?: any[];
  category?: string;
  initialPopular?: any[];
}

type PeriodType = "1week" | "1month" | "3months" | "6months" | "1year";

function PopularNewsSidebarWidgetImpl({
  title,
  selectedSubCategory,
  allArticles = [],
  category = "gongsil",
}: PopularNewsSidebarWidgetProps) {
  const [period, setPeriod] = React.useState<PeriodType>("1week");

  // 브라우저 로컬스토리지에 저장된 사용자 선호 기간 불러오기
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("popular_news_period") as PeriodType;
      if (saved && ["1week", "1month", "3months", "6months", "1year"].includes(saved)) {
        setPeriod(saved);
      }
    } catch (e) {}
  }, []);

  const handlePeriodChange = (val: PeriodType) => {
    setPeriod(val);
    try {
      localStorage.setItem("popular_news_period", val);
    } catch (e) {}
  };

  // 1. 해당 2차 카테고리 필터링 + 기간별(주간/월간 실제클릭수 또는 기간별 조회수) 상위 5개 추출
  const popularArticles = useMemo(() => {
    let pool = allArticles;

    // 세부 카테고리가 선택되었으면 해당 카테고리로 필터링
    if (selectedSubCategory && selectedSubCategory !== "전체") {
      const subList = pool.filter((a) => a.section2 === selectedSubCategory);
      if (subList.length > 0) {
        pool = subList;
      }
    }

    // 2. 기간별 정렬 및 필터링
    if (period === "1week") {
      // 주간 실제 클릭수(views_week) 우선 정렬
      pool = [...pool].sort((a, b) => {
        const aVal = a.views_week ?? a.view_count ?? 0;
        const bVal = b.views_week ?? b.view_count ?? 0;
        if (bVal !== aVal) return bVal - aVal;
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
      });
    } else if (period === "1month") {
      // 월간 실제 클릭수(views_month) 우선 정렬
      pool = [...pool].sort((a, b) => {
        const aVal = a.views_month ?? a.view_count ?? 0;
        const bVal = b.views_month ?? b.view_count ?? 0;
        if (bVal !== aVal) return bVal - aVal;
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
      });
    } else {
      // 지난 3개월, 6개월, 1년: 발행일 기준 필터 후 누적 조회수 정렬
      const now = new Date();
      const cutoff = new Date();
      if (period === "3months") cutoff.setMonth(now.getMonth() - 3);
      else if (period === "6months") cutoff.setMonth(now.getMonth() - 6);
      else if (period === "1year") cutoff.setFullYear(now.getFullYear() - 1);

      const filtered = pool.filter((a) => a.published_at && new Date(a.published_at) >= cutoff);
      const targetPool = filtered.length > 0 ? filtered : pool;

      pool = [...targetPool].sort((a, b) => {
        const diff = (b.view_count || 0) - (a.view_count || 0);
        if (diff !== 0) return diff;
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
      });
    }

    const top5 = pool.slice(0, 5);

    // 5개 미만일 경우 안전망 보충
    if (top5.length < 5) {
      const existingIds = new Set(top5.map((a) => a.id));
      const remaining = allArticles
        .filter((a) => !existingIds.has(a.id))
        .sort((a, b) => (b.views_week ?? b.view_count ?? 0) - (a.views_week ?? a.view_count ?? 0));
      return [...top5, ...remaining.slice(0, 5 - top5.length)];
    }

    return top5;
  }, [allArticles, selectedSubCategory, period]);

  // 동적 타이틀: 세부 카테고리명 1:1 반영
  const displayTitle = selectedSubCategory && selectedSubCategory !== "전체"
    ? `${selectedSubCategory} 많이 본 뉴스`
    : `${title || "공실뉴스"} 많이 본 뉴스`;

  return (
    <div className="sb-widget" style={{ position: "relative" }}>
      {/* 헤더: 타이틀 + 기간 셀렉트박스 (전체 1줄 깔끔한 구분선) */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "center", 
          marginBottom: "15px", 
          paddingBottom: "10px", 
          borderBottom: "1px solid #111",
          gap: "8px",
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
            flex: 1,
          }}
          title={displayTitle}
        >
          {displayTitle}
        </div>

        {/* 기간 선택 드롭다운 (간결한 프리셋, 상태 로컬 기억) */}
        <select
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
          style={{
            padding: "3px 6px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#374151",
            backgroundColor: "#f9fafb",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            cursor: "pointer",
            outline: "none",
            flexShrink: 0,
          }}
        >
          <option value="1week">지난 1주일</option>
          <option value="1month">지난 1달</option>
          <option value="3months">지난 3개월</option>
          <option value="6months">지난 6개월</option>
          <option value="1year">지난 1년</option>
        </select>
      </div>

      {/* 랭킹 1~5위 리스트 */}
      <ul className="pop-list">
        {popularArticles.length > 0 ? (
          popularArticles.map((item, i) => (
            <li key={item.id} className="pop-item">
              <Link
                href={`/news/${item.article_no || item.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  width: "100%",
                }}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(`pc_news_scroll_${category}`, window.scrollY.toString());
                  }
                }}
              >
                <span className="pop-ranking">{i + 1}</span>
                <span className="pop-title" style={{ wordBreak: "keep-all" }}>{item.title}</span>
              </Link>
            </li>
          ))
        ) : (
          <li className="pop-item" style={{ color: "#999", fontSize: 13 }}>
            등록된 기사가 없습니다.
          </li>
        )}
      </ul>
    </div>
  );
}

export const PopularNewsSidebarWidget = React.memo(PopularNewsSidebarWidgetImpl);
PopularNewsSidebarWidget.displayName = "PopularNewsSidebarWidget";
