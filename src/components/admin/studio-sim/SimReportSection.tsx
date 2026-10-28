"use client";

// 공실마케팅 › 인테리어 예측 시뮬레이션 · 리모델링 예측 시뮬레이션 (2026-10-22, docs/2026-10-22_sim_report_plan.md)
//  기사와 따로 — 공실과 연결하지 않고 공간(거실·안방·주방·욕실…)마다 예측해 고객용 보고서를 만든다 (SimReport).
//  유료 전용(공실스터디 멤버십).
import React, { useCallback, useEffect, useState } from "react";
import SimReport from "./SimReport";
import type { Kind } from "./pages";

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function SimReportSection({ theme, kind }: { theme: Theme; kind: Kind }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const load = useCallback(() => {
    fetch("/api/studio/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.success && setAllowed(typeof d.simAllowed === "boolean" ? d.simAllowed : null))
      .catch(() => {});
  }, []);
  useEffect(() => load(), [load]);
  const inApp = typeof window !== "undefined" && Boolean((window as unknown as { gongsilStudio?: unknown }).gongsilStudio);
  if (!inApp)
    return (
      <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "40px 24px", textAlign: "center", fontSize: 14, color: theme.textSecondary }}>
        예측 시뮬레이션은 공실마케팅 앱에서 쓸 수 있어요. (회원님 AI로 예측 이미지를 그립니다)
      </div>
    );
  // 유료 전용 (공실스터디 멤버십 — 무료 체험 없음)
  if (allowed === false)
    return (
      <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "44px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{kind === "interior" ? "인테리어" : "리모델링"} 예측 시뮬레이션은 공실뉴스부동산(유료) 전용입니다</div>
        <a href="/study" target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 16, padding: "11px 20px", borderRadius: 8, background: "#059669", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>공실뉴스부동산 알아보기 →</a>
      </div>
    );
  return <SimReport key={kind} kind={kind} theme={theme} />;
}
