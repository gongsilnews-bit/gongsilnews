"use client";

import React, { useEffect, useState } from "react";
import { listMyStudioVacancies } from "@/app/actions/studio";

/**
 * 공실마케팅 (중개사 관리자 업무 메뉴, 기사등록 아래) — 2026-10-15
 *
 * 뉴스·SNS발행처럼 왼쪽에 2차 카테고리, 오른쪽에 작업 화면.
 *  - AI 매물보고서   : /marketing/report?vacancy_id=…      (공실등록 목록의 [AI물건보고서]와 같은 도구)
 *  - AI 유리창홍보지 : /marketing/ai-detail?vacancy_id=…   (공실등록 목록의 [유리창홍보지]와 같은 도구)
 * 공실을 고르면 그 도구를 이 화면 안에 띄운다. [새 창으로 열기]로 넓게 볼 수도 있다.
 */

const CATEGORIES = [
  { id: "report", label: "AI 매물보고서", path: "/marketing/report", lead: "공실 하나로 매물 소개 보고서를 AI가 만듭니다. 손님에게 보내거나 인쇄해 쓰세요." },
  { id: "flyer", label: "AI 유리창홍보지", path: "/marketing/ai-detail", lead: "공실 하나로 사무실 유리창·온라인에 붙일 홍보지(전단지)를 AI가 만듭니다." },
];
const CATEGORY_KEY = "studio_marketing_category";
const VACANCY_KEY = "studio_marketing_vacancy";

type MyVacancy = { id: string; vacancy_no: number; building_name: string | null; trade_type: string | null; address: string };
type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function StudioMarketingSection({ theme }: { theme: Theme }) {
  // 메뉴를 누른 뒤에만 그려지는 화면이라 처음 값을 이 기기 기억에서 바로 꺼낸다
  const remembered = (key: string) => {
    try {
      return typeof window === "undefined" ? "" : localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  };
  const [category, setCategoryState] = useState(() => {
    const c = remembered(CATEGORY_KEY);
    return CATEGORIES.some((x) => x.id === c) ? c : "report";
  });
  const [mine, setMine] = useState<MyVacancy[] | null>(null);
  const [vacancyId, setVacancyIdState] = useState(() => remembered(VACANCY_KEY));
  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  useEffect(() => {
    listMyStudioVacancies().then((r) => setMine(r.success ? r.data : [])).catch(() => setMine([]));
  }, []);

  const setCategory = (id: string) => {
    setCategoryState(id);
    try {
      localStorage.setItem(CATEGORY_KEY, id);
    } catch {}
  };
  const setVacancyId = (id: string) => {
    setVacancyIdState(id);
    try {
      localStorage.setItem(VACANCY_KEY, id);
    } catch {}
  };

  const known = mine?.some((v) => v.id === vacancyId);
  // 만들어 둔 도구 파일(public/marketing/…/index.html)을 바로 연다 — 개발 PC에서 도구 개발 서버를 안 켜도 열리게
  const url = vacancyId && known ? `${cat.path}/index.html?vacancy_id=${encodeURIComponent(vacancyId)}` : "";
  const openNew = () => {
    if (!url) return;
    const full = `${window.location.origin}${url}`;
    const studio = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => Promise<void> } }).gongsilStudio;
    if (studio?.openInBrowser) studio.openInBrowser(full);
    else window.open(full, "_blank", "noopener");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* 왼쪽: 2차 카테고리 (뉴스·SNS발행과 같은 모양) */}
      <aside style={{ width: 210, flexShrink: 0, background: theme.cardBg, borderRight: `1px solid ${theme.border}`, padding: "22px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: "0 4px", fontSize: 19, fontWeight: 800, color: theme.textPrimary }}>공실마케팅</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{ textAlign: "left", padding: "9px 12px", border: 0, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
                  fontWeight: on ? 700 : 500, color: on ? "#1a3a6b" : theme.textSecondary, background: on ? "rgba(26,58,107,0.08)" : "transparent",
                  boxShadow: on ? "inset 3px 0 0 #1a3a6b" : "none" }}>
                {c.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 오른쪽: 공실 고르기 + 도구 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "24px 24px 0" }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>{cat.label}</h3>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: theme.textSecondary }}>{cat.lead}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {mine !== null && mine.length === 0 ? (
            <span style={{ fontSize: 13.5, color: "#b45309" }}>아직 등록한 공실이 없습니다. 공실등록 메뉴에서 공실을 등록하면 여기에 나옵니다.</span>
          ) : (
            <select value={known ? vacancyId : ""} onChange={(e) => setVacancyId(e.target.value)}
              style={{ flex: 1, minWidth: 260, maxWidth: 560, padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, background: theme.cardBg, color: theme.textPrimary }}>
              <option value="">{mine === null ? "내 공실 불러오는 중…" : `공실을 골라 주세요 (${mine.length}개)`}</option>
              {(mine || []).map((v) => (
                <option key={v.id} value={v.id}>[{v.trade_type || "-"}] {v.building_name || "무제"} ({v.address || ""}) · {v.vacancy_no}</option>
              ))}
            </select>
          )}
          <button onClick={openNew} disabled={!url}
            style={{ padding: "10px 14px", background: theme.cardBg, color: url ? theme.textPrimary : theme.textSecondary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: url ? "pointer" : "default" }}>
            새 창으로 열기
          </button>
        </div>

        {url ? (
          <iframe key={url} src={url} title={cat.label}
            style={{ flex: 1, width: "100%", border: `1px solid ${theme.border}`, borderBottom: 0, borderRadius: "12px 12px 0 0", background: "#fff" }} />
        ) : (
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", fontSize: 14, color: theme.textSecondary }}>
            위에서 공실을 고르면 {cat.label} 화면이 여기에 열립니다.
          </div>
        )}
      </div>
    </div>
  );
}
