"use client";

import React, { useMemo } from "react";
import Link from "next/link";

interface ArticleDetailPopularNewsWidgetProps {
  currentArticleId?: string | number;
  section1?: string;
  section2?: string;
  allArticles?: any[];
  basePath?: string;
}

function ArticleDetailPopularNewsWidgetImpl({
  currentArticleId,
  section1,
  section2,
  allArticles = [],
  basePath = "",
}: ArticleDetailPopularNewsWidgetProps) {
  // 2차 카테고리별 + 주간 클릭수(views_week) 0.001초 인메모리 필터링
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

    // 2. 주간 클릭수(views_week) 우선 정렬 (동점 시 누적 조회수 및 최신순)
    const sorted = [...pool].sort((a, b) => {
      const aVal = a.views_week ?? a.view_count ?? 0;
      const bVal = b.views_week ?? b.view_count ?? 0;
      if (bVal !== aVal) return bVal - aVal;
      return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
    });

    const top5 = sorted.slice(0, 5);

    // 3. 안전망(Fallback): 5개 미만인 경우 해당 카테고리 내 다른 기사로 보충
    if (top5.length < 5) {
      const existingIds = new Set(top5.map((a) => a.id));
      let fallbackPool = baseList;
      if (section2) {
        fallbackPool = baseList.filter((a) => a.section2 === section2 && !existingIds.has(a.id));
      } else {
        fallbackPool = baseList.filter((a) => !existingIds.has(a.id));
      }

      const sortedFallback = [...fallbackPool].sort(
        (a, b) => (b.views_week ?? b.view_count ?? 0) - (a.views_week ?? a.view_count ?? 0)
      );
      const filled = [...top5, ...sortedFallback.slice(0, 5 - top5.length)];

      if (filled.length < 5) {
        const filledIds = new Set(filled.map((a) => a.id));
        const overallFallback = baseList
          .filter((a) => !filledIds.has(a.id))
          .sort((a, b) => (b.views_week ?? b.view_count ?? 0) - (a.views_week ?? a.view_count ?? 0));
        return [...filled, ...overallFallback.slice(0, 5 - filled.length)];
      }

      return filled;
    }

    return top5;
  }, [allArticles, currentArticleId, section2]);

  // 동적 타이틀: 2차 카테고리 우선 표기
  const displayTitle = section2
    ? `${section2} 많이 본 뉴스`
    : `${section1 || "공실뉴스"} 많이 본 뉴스`;

  return (
    <div className="sb-widget" style={{ position: "relative" }}>
      {/* 헤더: 타이틀 (전체 1줄 깔끔한 구분선) */}
      <div
        style={{
          display: "flex",
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
            등록된 기사가 없습니다.
          </li>
        )}
      </ul>
    </div>
  );
}

export const ArticleDetailPopularNewsWidget = React.memo(ArticleDetailPopularNewsWidgetImpl);
ArticleDetailPopularNewsWidget.displayName = "ArticleDetailPopularNewsWidget";
