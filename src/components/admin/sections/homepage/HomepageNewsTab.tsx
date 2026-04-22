"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "../types";

interface HomepageNewsTabProps {
  theme: AdminTheme;
  formData: any;
  memberId: string;
  onFormUpdate: (updates: Record<string, any>) => void;
}

export default function HomepageNewsTab({ theme, formData, memberId, onFormUpdate }: HomepageNewsTabProps) {
  const darkMode = theme.darkMode;
  const [articleCount, setArticleCount] = useState<number | null>(null);

  useEffect(() => {
    // 작성한 기사 개수 조회 (간단히 fetch)
    async function checkArticles() {
      try {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();
        const { count } = await supabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .eq("author_id", memberId);
        setArticleCount(count || 0);
      } catch {
        setArticleCount(0);
      }
    }
    checkArticles();
  }, [memberId]);

  // news_display_count: 홈페이지에 표시할 기사 개수
  const displayCount = formData.news_display_count ?? 10;

  return (
    <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 10, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden" }}>
      {/* 안내 */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, background: darkMode ? "#25262b" : "#f9fafb" }}>
        <span style={{ fontSize: 13, color: theme.textSecondary }}>
          💡 공실뉴스에서 작성한 기사가 홈페이지 &apos;뉴스기사&apos; 메뉴에 자동으로 표시됩니다. 별도 작성이 필요 없습니다.
        </span>
      </div>

      {/* 기사 현황 */}
      <div style={{ padding: "20px", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: darkMode ? "#374151" : "#eff6ff", fontSize: 28,
          }}>📰</div>
          <div>
            <div style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 4 }}>내가 작성한 기사</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: theme.textPrimary }}>
              {articleCount === null ? "..." : `${articleCount}건`}
            </div>
          </div>
        </div>
      </div>

      {/* 표시 개수 설정 */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
          홈페이지에 표시할 기사 수
        </span>
        <select
          value={displayCount}
          onChange={(e) => onFormUpdate({ news_display_count: parseInt(e.target.value) })}
          style={{
            padding: "8px 12px", fontSize: 14, borderRadius: 6, border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
            background: darkMode ? "#2c2d31" : "#fff", color: theme.textPrimary, outline: "none", cursor: "pointer",
          }}>
          <option value={5}>최신 5건</option>
          <option value={10}>최신 10건</option>
          <option value={20}>최신 20건</option>
          <option value={50}>최신 50건</option>
        </select>
      </div>

      {/* 뉴스 표시 on/off */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px" }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
          뉴스 메뉴 표시
        </span>
        <button
          onClick={() => onFormUpdate({ news_enabled: !(formData.news_enabled ?? true) })}
          style={{
            width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
            background: (formData.news_enabled ?? true) ? "#3b82f6" : (darkMode ? "#555" : "#d1d5db"),
            position: "relative", transition: "background 0.3s",
          }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 3,
            left: (formData.news_enabled ?? true) ? 25 : 3,
            transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </button>
      </div>
    </div>
  );
}
