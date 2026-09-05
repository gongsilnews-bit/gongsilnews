"use client";

import React, { useEffect, useState } from "react";
import { getVacancyDetail } from "@/app/actions/vacancy";
import { createClient } from "@/utils/supabase/client";

interface VacancyMarketingPanelProps {
  vacancyId: string;
  onBack: () => void;
  onViewDetail?: () => void;
  darkMode?: boolean;
}

export default function VacancyMarketingPanel({
  vacancyId,
  onBack,
  onViewDetail,
  darkMode = false,
}: VacancyMarketingPanelProps) {
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await getVacancyDetail(vacancyId);
        if (res.success && res.data) {
          const photoList = res.photos || res.data?.vacancy_photos || [];
          setVacancy({
            ...res.data,
            images: photoList && photoList.length > 0
              ? [...photoList].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
              : []
          });
        }
      } catch (err) {
        console.error("Failed to load vacancy for marketing panel:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [vacancyId]);

  // Load saved marketing projects
  useEffect(() => {
    async function fetchSavedProjects() {
      setLoadingProjects(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("marketing_projects")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(6);
        if (data) setProjects(data);
      } catch (e) {
        console.warn("Marketing projects table fetch skipped:", e);
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchSavedProjects();
  }, []);

  const formatAmount = (amt: number) => {
    if (!amt) return "";
    const m = Math.round(amt / 10000);
    if (m === 0) return "";
    const e = Math.floor(m / 10000);
    const r = m % 10000;
    let result = "";
    if (e > 0) result += `${e}억`;
    if (r > 0) {
      const c = Math.floor(r / 1000);
      const rem = r % 1000;
      let rest = "";
      if (c > 0) rest += `${c}천`;
      if (rem > 0) rest += `${rem}`;
      if (rest) {
        result += (result && !result.endsWith(" ") ? " " : "") + rest;
        if (e === 0 && c === 0 && rem > 0) result += "만";
      }
    }
    return result || "";
  };

  const getPriceStr = () => {
    if (!vacancy) return "-";
    const monthlyManwon = vacancy.monthly_rent ? Math.round(vacancy.monthly_rent / 10000) : 0;
    if (vacancy.trade_type === "매매") return `매매 ${formatAmount(vacancy.deposit)}`;
    if (vacancy.trade_type === "전세") return `전세 ${formatAmount(vacancy.deposit)}`;
    return `${formatAmount(vacancy.deposit)}/${monthlyManwon}만`;
  };

  if (loading) {
    return (
      <div style={{ flex: 1, padding: 40, textAlign: "center", color: darkMode ? "#9ca3af" : "#6b7280" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>공실 마케팅 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div style={{ flex: 1, padding: 40, textAlign: "center", color: darkMode ? "#9ca3af" : "#6b7280" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>해당 공실 매물을 찾을 수 없습니다.</div>
        <button
          onClick={onBack}
          style={{
            marginTop: 16,
            padding: "8px 18px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const propTitle = vacancy.building_name || vacancy.property_type || "공실 매물";
  const fullAddress = [vacancy.sido, vacancy.sigungu, vacancy.dong, vacancy.detail_addr || vacancy.detail_address].filter(Boolean).join(" ");
  const mainImage = vacancy.images && vacancy.images.length > 0 ? vacancy.images[0] : null;

  const marketingTools = [
    {
      id: "remodeling",
      title: "건물 외관 리모델링 예측 (RE 1.0)",
      badge: "AI 외관 변환",
      badgeColor: "#ec4899",
      icon: "🏢",
      desc: "노후 빌딩, 상가, 단독주택 외벽을 신축급 모던 스타일이나 럭셔리 파사드로 AI 디자인 변환합니다.",
      cta: "외관 리모델링 시작하기",
      url: `/marketing/remodeling/index.html?vacancy_id=${vacancyId}`,
      gradient: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
      lightBg: darkMode ? "rgba(236, 72, 153, 0.08)" : "#fdf2f8",
      borderColor: darkMode ? "rgba(236, 72, 153, 0.25)" : "#fbcfe8",
    },
    {
      id: "home-interior",
      title: "아파트·내부 인테리어 시뮬레이터 (ARE 1.0)",
      badge: "AI 내부 3D",
      badgeColor: "#64748b",
      icon: "🛋️",
      desc: "텅 빈 공실이나 노후 실내를 모던, 호텔, 우드, 미니멀 등 최신 감성 인테리어로 3D 리디자인합니다.",
      cta: "내부 인테리어 시작하기",
      url: `/marketing/home-interior/index.html?vacancy_id=${vacancyId}`,
      gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
      lightBg: darkMode ? "rgba(100, 116, 139, 0.08)" : "#f1f5f9",
      borderColor: darkMode ? "rgba(100, 116, 139, 0.25)" : "#cbd5e1",
    },
    {
      id: "ai-detail",
      title: "AI 온라인 전단지 & 상세페이지",
      badge: "SNS/블로그 홍보",
      badgeColor: "#10b981",
      icon: "📄",
      desc: "카카오톡/문자 전송용 모바일 카드뉴스 전단지와 네이버 블로그/웹 홍보용 고품질 상세페이지를 제작합니다.",
      cta: "온라인 전단지 제작하기",
      url: `/marketing/ai-detail?vacancy_id=${vacancyId}`,
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      lightBg: darkMode ? "rgba(16, 185, 129, 0.08)" : "#ecfdf5",
      borderColor: darkMode ? "rgba(16, 185, 129, 0.25)" : "#a7f3d0",
    },
    {
      id: "report",
      title: "AI 프리미엄 물건보고서 (IM Report)",
      badge: "브리핑/제원 분석",
      badgeColor: "#3b82f6",
      icon: "📊",
      desc: "방문 고객 브리핑 및 임대인 미팅에 활용할 수 있는 전문 상권/물건 제원 분석 보고서를 생성하고 인쇄합니다.",
      cta: "물건보고서 열기",
      url: `/marketing/report?vacancy_id=${vacancyId}`,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      lightBg: darkMode ? "rgba(59, 130, 246, 0.08)" : "#eff6ff",
      borderColor: darkMode ? "rgba(59, 130, 246, 0.25)" : "#bfdbfe",
    },
    {
      id: "studio",
      title: "공실뉴스 AI 마케팅 스튜디오",
      badge: "영상/숏폼 종합",
      badgeColor: "#f59e0b",
      icon: "🎬",
      desc: "AI 이미지 생성, 홍보 영상/숏폼 제작, 음성 더빙 및 SNS 콘텐츠를 올인원으로 제작하는 종합 스튜디오입니다.",
      cta: "AI 스튜디오 실행",
      url: `/marketing/studio/index.html?vacancy_id=${vacancyId}`,
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      lightBg: darkMode ? "rgba(245, 158, 11, 0.08)" : "#fffbeb",
      borderColor: darkMode ? "rgba(245, 158, 11, 0.25)" : "#fde68a",
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 32px 60px",
        background: darkMode ? "#18191c" : "#f8fafc",
        color: darkMode ? "#f3f4f6" : "#0f172a",
        fontFamily: "'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
      }}
    >
      {/* ── Top Navigation Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              padding: "8px 14px",
              background: darkMode ? "#272930" : "#fff",
              color: darkMode ? "#cbd5e1" : "#475569",
              border: `1px solid ${darkMode ? "#3a3e4b" : "#e2e8f0"}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            ← 목록으로
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
                {propTitle} <span style={{ color: darkMode ? "#cbd5e1" : "#475569" }}>공실마케팅 센터</span>
              </h1>
              <span
                style={{
                  padding: "3px 8px",
                  background: darkMode ? "#2c2d31" : "#f1f5f9",
                  color: darkMode ? "#cbd5e1" : "#475569",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                No.{vacancy.vacancy_no || vacancyId.slice(0, 8)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: darkMode ? "#9ca3af" : "#64748b", marginTop: 2 }}>
              등록된 매물 정보와 사진을 활용하여 고품격 AI 시뮬레이션 및 홍보물을 제작하세요.
            </div>
          </div>
        </div>

        {onViewDetail && (
          <button
            onClick={onViewDetail}
            style={{
              padding: "8px 16px",
              background: darkMode ? "#374151" : "#e2e8f0",
              color: darkMode ? "#f3f4f6" : "#1e293b",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            👁️ 매물 상세정보 보기
          </button>
        )}
      </div>

      {/* ── Property Summary Banner ── */}
      <div
        style={{
          background: darkMode ? "#22242a" : "#fff",
          borderRadius: 16,
          padding: 20,
          border: `1px solid ${darkMode ? "#333742" : "#e2e8f0"}`,
          boxShadow: darkMode ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.03)",
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 110,
            height: 80,
            borderRadius: 10,
            overflow: "hidden",
            background: darkMode ? "#18191c" : "#f1f5f9",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mainImage ? (
            <img src={mainImage} alt="매물 대표 사진" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 32 }}>🏢</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6" }}>
              {vacancy.sub_category || vacancy.property_type || "부동산"}
            </span>
            <span style={{ fontSize: 13, color: darkMode ? "#6b7280" : "#cbd5e1" }}>|</span>
            <span style={{ fontSize: 13, color: darkMode ? "#9ca3af" : "#64748b" }}>{vacancy.trade_type || "거래"}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: darkMode ? "#fff" : "#0f172a", marginBottom: 4 }}>
            {propTitle} <span style={{ color: "#ef4444", marginLeft: 8 }}>{getPriceStr()}</span>
          </div>
          <div style={{ fontSize: 13, color: darkMode ? "#9ca3af" : "#64748b" }}>
            📍 {fullAddress || "소재지 정보 없음"}
            {vacancy.supply_m2 ? ` · 면적 ${vacancy.supply_m2}㎡` : ""}
            {vacancy.room_count ? ` · 방 ${vacancy.room_count}개` : ""}
          </div>
        </div>
      </div>

      {/* ── Section: AI Marketing Tools Grid ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>AI 마케팅 솔루션 선택</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {marketingTools.map((tool) => (
            <div
              key={tool.id}
              style={{
                background: darkMode ? "#22242a" : "#fff",
                borderRadius: 16,
                border: `1px solid ${tool.borderColor}`,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: darkMode ? "0 4px 16px rgba(0,0,0,0.2)" : "0 4px 16px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: tool.lightBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    {tool.icon}
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      background: tool.lightBg,
                      color: tool.badgeColor,
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      border: `1px solid ${tool.borderColor}`,
                    }}
                  >
                    {tool.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                  {tool.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: darkMode ? "#94a3b8" : "#64748b",
                    margin: "0 0 20px",
                    wordBreak: "keep-all",
                  }}
                >
                  {tool.desc}
                </p>
              </div>

              <button
                onClick={() => window.open(tool.url, "_blank")}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: tool.gradient,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: `0 4px 12px ${tool.badgeColor}33`,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.opacity = "0.95";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {tool.cta} <span style={{ fontSize: 14 }}>→</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section: Recent Saved Projects Archive ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🗂️</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>최근 마케팅 프로젝트 보관함</h2>
          </div>
          <span style={{ fontSize: 12, color: darkMode ? "#9ca3af" : "#64748b" }}>
            클라우드에 저장된 AI 시뮬레이션 및 마케팅 작업물
          </span>
        </div>

        {loadingProjects ? (
          <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>보관함 불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div
            style={{
              padding: "36px 20px",
              textAlign: "center",
              background: darkMode ? "#22242a" : "#fff",
              borderRadius: 14,
              border: `1px dashed ${darkMode ? "#374151" : "#cbd5e1"}`,
              color: darkMode ? "#9ca3af" : "#64748b",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎨</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>저장된 프로젝트가 없습니다.</div>
            <div style={{ fontSize: 12 }}>위 마케팅 솔루션을 실행하여 AI 리모델링 및 전단지를 제작하고 저장해보세요!</div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            {projects.map((p) => {
              const appMap: Record<string, { name: string; url: string; icon: string }> = {
                remodeling: { name: "외관 리모델링", url: "/marketing/remodeling/index.html", icon: "🏢" },
                "home-interior": { name: "내부 인테리어", url: "/marketing/home-interior/index.html", icon: "🛋️" },
                studio: { name: "AI 스튜디오", url: "/marketing/studio/index.html", icon: "🎬" },
                report: { name: "물건보고서", url: "/marketing/report", icon: "📊" },
              };
              const meta = appMap[p.app_type] || { name: p.app_type, url: "#", icon: "📁" };

              return (
                <div
                  key={p.id}
                  onClick={() => window.open(`${meta.url}?project_id=${p.id}`, "_blank")}
                  style={{
                    background: darkMode ? "#22242a" : "#fff",
                    borderRadius: 12,
                    border: `1px solid ${darkMode ? "#333742" : "#e2e8f0"}`,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
                >
                  <div style={{ height: 120, background: darkMode ? "#18191c" : "#f1f5f9", position: "relative" }}>
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 32 }}>
                        {meta.icon}
                      </div>
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {meta.name}
                    </span>
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title || "제목 없음"}
                    </div>
                    <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : "#94a3b8" }}>
                      {p.updated_at ? new Date(p.updated_at).toLocaleDateString("ko-KR") : "-"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
