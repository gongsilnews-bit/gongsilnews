"use client";

import React, { useEffect, useState } from "react";
import { getVacancyDetail } from "@/app/actions/vacancy";

interface MobileVacancyMarketingPanelProps {
  vacancyId: string;
  onBack: () => void;
}

const marketingTools = [
  {
    id: "remodeling",
    icon: "🏢",
    title: "건물 외관 리모델링",
    description: "건물 외관을 AI로 새롭게 디자인합니다.",
    color: "#ec4899",
    background: "#fdf2f8",
  },
  {
    id: "home-interior",
    icon: "🛋️",
    title: "아파트·내부 인테리어",
    description: "공실 내부를 다양한 인테리어로 바꿔봅니다.",
    color: "#7c3aed",
    background: "#f5f3ff",
  },
  {
    id: "ai-detail",
    icon: "📄",
    title: "AI 온라인 전단지",
    description: "SNS와 블로그용 홍보물을 제작합니다.",
    color: "#059669",
    background: "#ecfdf5",
  },
  {
    id: "report",
    icon: "📊",
    title: "AI 물건보고서",
    description: "방문 고객 브리핑용 전문 보고서를 편집합니다.",
    color: "#2563eb",
    background: "#eff6ff",
    mobile: true,
  },
  {
    id: "studio",
    icon: "🎬",
    title: "AI 마케팅 스튜디오",
    description: "영상과 숏폼 콘텐츠를 종합 제작합니다.",
    color: "#d97706",
    background: "#fffbeb",
  },
];

export default function MobileVacancyMarketingPanel({ vacancyId, onBack }: MobileVacancyMarketingPanelProps) {
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVacancyDetail(vacancyId)
      .then((result) => {
        if (result.success) setVacancy(result.data);
      })
      .finally(() => setLoading(false));
  }, [vacancyId]);

  const address = [vacancy?.dong, vacancy?.detail_addr || vacancy?.detail_address]
    .filter(Boolean)
    .join(" ");
  const propertyName = vacancy?.building_name || vacancy?.property_type || "공실 매물";

  const handleToolClick = (tool: (typeof marketingTools)[number]) => {
    if (tool.id === "report") {
      window.location.href = `/marketing/report?vacancy_id=${vacancyId}`;
      return;
    }
    alert("이 기능은 PC 버전에서 지원됩니다. PC에서 공실뉴스에 접속해 이용해 주세요.");
  };

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>공실마케팅을 준비하고 있습니다.</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", paddingBottom: 80 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.96)", borderBottom: "1px solid #e2e8f0", backdropFilter: "blur(12px)" }}>
        <button type="button" onClick={onBack} aria-label="공실관리로 돌아가기" style={{ width: 38, height: 38, border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", color: "#334155", fontSize: 24, lineHeight: 1, cursor: "pointer" }}>‹</button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a" }}>공실마케팅 센터</div>
          <div style={{ marginTop: 2, fontSize: 11, color: "#64748b" }}>{propertyName}</div>
        </div>
      </header>

      <main style={{ padding: "16px 14px" }}>
        <section style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
          <div style={{ width: 58, height: 58, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: 12, background: "#f1f5f9", fontSize: 28 }}>🏢</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 4, fontSize: 12, color: "#2563eb", fontWeight: 800 }}>{vacancy?.sub_category || vacancy?.property_type || "부동산"} · {vacancy?.trade_type || "거래"}</div>
            <div style={{ overflow: "hidden", color: "#0f172a", fontSize: 16, fontWeight: 900, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{propertyName}</div>
            <div style={{ overflow: "hidden", marginTop: 3, color: "#64748b", fontSize: 12, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{address || "소재지 정보 없음"}</div>
          </div>
        </section>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 2px 12px" }}>
          <span style={{ fontSize: 19 }}>✨</span>
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 }}>AI 마케팅 솔루션</h1>
        </div>

        <section style={{ display: "grid", gap: 10 }}>
          {marketingTools.map((tool) => (
            <button key={tool.id} type="button" onClick={() => handleToolClick(tool)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, textAlign: "left", background: "#fff", border: `1px solid ${tool.color}44`, borderRadius: 14, boxShadow: "0 2px 8px rgba(15,23,42,0.04)", cursor: "pointer" }}>
              <span style={{ width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: 12, background: tool.background, fontSize: 23 }}>{tool.icon}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", color: "#0f172a", fontSize: 14, fontWeight: 850 }}>{tool.title}</span>
                <span style={{ display: "block", marginTop: 3, color: "#64748b", fontSize: 11, lineHeight: 1.45 }}>{tool.description}</span>
              </span>
              <span style={{ flexShrink: 0, padding: "5px 8px", borderRadius: 8, background: tool.mobile ? "#eff6ff" : "#f8fafc", color: tool.mobile ? "#2563eb" : "#64748b", fontSize: 10, fontWeight: 800 }}>{tool.mobile ? "모바일 이용" : "PC 이용"}</span>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}