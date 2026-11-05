"use client";
/**
 * 공실뉴스부동산 PRO 딱지 · 잠금 화면 (2026-11-04 사장님 회의 — docs/2026-11-04_member_tiers_plan.md)
 *  딱지: 주황 바탕 흰 글씨 PRO (관리자 로고 "studio" 꼬리표와 같은 모양)
 *  잠금: 무료 회원이 PRO 기능을 열었을 때 — 숨기지 않고 보이게 두고, 누르면 이 안내 + [금액안내]
 */
import React from "react";
import { PRO_ORANGE } from "@/utils/tier";

export function ProTag({ size = "sm", style }: { size?: "xs" | "sm" | "md"; style?: React.CSSProperties }) {
  const f = size === "xs" ? 9 : size === "md" ? 12 : 10;
  return (
    <span title="공실뉴스부동산" style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", background: PRO_ORANGE, color: "#fff", fontSize: f, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1, padding: size === "md" ? "3px 6px 4px" : "2px 4px 3px", borderRadius: 3, ...style }}>NEWS</span>
  );
}

/** PRO 전용 화면 — what: 기능 이름, detail: 한 줄 설명 */
export function ProLock({ what, detail, onUpgrade, dark }: { what: string; detail?: string; onUpgrade?: () => void; dark?: boolean }) {
  const text = dark ? "#e5e7eb" : "#111827";
  const sub = dark ? "#9ca3af" : "#6b7280";
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, margin: "0 auto 14px", borderRadius: "50%", background: "rgba(234,138,12,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PRO_ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, color: text, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{what} <ProTag size="md" /></div>
        <p style={{ margin: "10px 0 0", fontSize: 14, color: sub, lineHeight: 1.65 }}>
          {detail ? <>{detail}<br /></> : null}공실뉴스부동산에서 쓸 수 있어요.
        </p>
        {onUpgrade && (
          <button type="button" onClick={onUpgrade} style={{ marginTop: 18, padding: "10px 22px", borderRadius: 999, border: 0, background: PRO_ORANGE, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>금액안내 보기</button>
        )}
      </div>
    </div>
  );
}
