"use client";

import React, { useMemo } from "react";
import Link from "next/link";

interface MobileArticleDetailPopularNewsWidgetProps {
  currentArticleId?: string | number;
  section1?: string;
  section2?: string;
  allArticles?: any[];
  basePath?: string;
}

function MobileArticleDetailPopularNewsWidgetImpl({
  currentArticleId,
  section1,
  section2,
  allArticles = [],
  basePath = "/m",
}: MobileArticleDetailPopularNewsWidgetProps) {
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

  const displayCategoryName = section2 || section1 || "공실뉴스";

  if (popularArticles.length === 0) return null;

  return (
    <div style={{ padding: "20px 16px", borderBottom: "8px solid #f4f6f8", backgroundColor: "#fff", position: "relative" }}>
      {/* 헤더: 타이틀 (전체 1줄 깔끔한 구분선) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: "1px solid #111",
        }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: 800,
            color: "#111",
            margin: 0,
            padding: 0,
            border: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={`${displayCategoryName} 많이 본 뉴스`}
        >
          {displayCategoryName} 많이 본 뉴스
        </div>
      </div>

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
