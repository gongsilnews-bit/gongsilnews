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

function PopularNewsSidebarWidgetImpl({
  title,
  selectedSubCategory,
  allArticles = [],
  category = "gongsil",
}: PopularNewsSidebarWidgetProps) {
  // 1. 해당 2차 카테고리 필터링 + 주간 조회수(views_week) 기준 상위 5개 추출 (초고속 인메모리 0.001초)
  const popularArticles = useMemo(() => {
    let pool = allArticles;

    // 세부 카테고리가 선택되었으면 해당 카테고리로 필터링
    if (selectedSubCategory && selectedSubCategory !== "전체") {
      const subList = pool.filter((a) => a.section2 === selectedSubCategory);
      if (subList.length > 0) {
        pool = subList;
      }
    }

    // 주간 클릭수(views_week) 우선 정렬, 없을 경우 누적 조회수(view_count) 내림차순 정렬
    const sorted = [...pool].sort((a, b) => {
      const aVal = a.views_week ?? a.view_count ?? 0;
      const bVal = b.views_week ?? b.view_count ?? 0;
      if (bVal !== aVal) return bVal - aVal;
      return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
    });

    const top5 = sorted.slice(0, 5);

    // 5개 미만일 경우 안전망 보충
    if (top5.length < 5) {
      const existingIds = new Set(top5.map((a) => a.id));
      const remaining = allArticles
        .filter((a) => !existingIds.has(a.id))
        .sort((a, b) => (b.views_week ?? b.view_count ?? 0) - (a.views_week ?? a.view_count ?? 0));
      return [...top5, ...remaining.slice(0, 5 - top5.length)];
    }

    return top5;
  }, [allArticles, selectedSubCategory]);

  // 동적 타이틀: 세부 카테고리명 1:1 반영
  const displayTitle = selectedSubCategory && selectedSubCategory !== "전체"
    ? `${selectedSubCategory} 많이 본 뉴스`
    : `${title || "공실뉴스"} 많이 본 뉴스`;

  return (
    <div className="sb-widget" style={{ position: "relative" }}>
      {/* 헤더: 타이틀 (전체 1줄 깔끔한 구분선) */}
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          marginBottom: "15px", 
          paddingBottom: "10px", 
          borderBottom: "1px solid #111" 
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
          }}
          title={displayTitle}
        >
          {displayTitle}
        </div>
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
