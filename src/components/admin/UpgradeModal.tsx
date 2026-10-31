"use client";

import React, { useEffect } from "react";
import StudioPriceTable from "@/components/studio-site/StudioPriceTable";

/**
 * 머리줄 [업그레이드하기] → 우리 금액안내 표를 창으로 (2026-10-30 사장님: 캔바 디자인 말고 우리 디자인으로)
 * 금액안내(/marketing/pricing)와 같은 부품을 그대로 써서 금액·항목·디자인이 늘 같다
 */
export type Tier = "free" | "pro" | "studio" | "corp" | "biz";
// 유료는 스튜디오회원 하나 (2026-10-31 사장님) — 예전 pro(마케팅회원)·corp(법인) 값이 와도 스튜디오회원으로 읽는다
export const TIER_LABEL: Record<Tier, string> = { free: "공실뉴스부동산", pro: "스튜디오회원", studio: "스튜디오회원", corp: "스튜디오회원", biz: "비즈니스회원" };
/** 금액안내 표의 요금제 열쇠 */
const PLAN_KEY: Record<Tier, string> = { free: "free", pro: "standard", studio: "standard", corp: "standard", biz: "biz" };
/** 회원 종류 — 일반 중개사무소 · 중개법인 · 전문가(비즈니스회원). 이것으로 고를 수 있는 칸이 정해진다 (2026-10-30) */
export type MemberKind = "general" | "corp" | "biz";
const ALLOWED: Record<MemberKind, string[]> = { general: ["standard"], corp: ["standard"], biz: ["biz"] }; // 일반 사무소·중개법인 같은 금액 (2026-10-31)

export function UpgradeModal({ current, kind = "general", onClose }: { current: Tier; kind?: MemberKind; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(1320px, 100%)", maxHeight: "92vh", overflow: "auto", background: "#fff", borderRadius: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.35)" }}>
        <button type="button" onClick={onClose} aria-label="닫기"
          style={{ position: "sticky", top: 14, float: "right", marginRight: 14, zIndex: 1, width: 40, height: 40, borderRadius: 20, border: "1px solid #e5e7eb", background: "#fff", fontSize: 22, cursor: "pointer", color: "#374151" }}>×</button>
        <StudioPriceTable compact current={PLAN_KEY[current]} allowed={ALLOWED[kind]} />
      </div>
    </div>
  );
}
