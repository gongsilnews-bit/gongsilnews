"use client";
/**
 * 공실뉴스부동산 PRO 딱지 · 잠금 화면 (2026-11-04 사장님 회의 — docs/2026-11-04_member_tiers_plan.md)
 *  딱지: 주황 바탕 흰 글씨 PRO (관리자 로고 "studio" 꼬리표와 같은 모양)
 *  잠금: 무료 회원이 PRO 기능을 열었을 때 — 숨기지 않고 보이게 두고, 누르면 이 안내 + [금액안내]
 */
import React from "react";
import { PRO_ORANGE } from "@/utils/tier";

export function ProTag({ size = "sm", style, label = "NEWS" }: { size?: "xs" | "sm" | "md"; style?: React.CSSProperties; label?: string }) {
  const f = size === "xs" ? 9 : size === "md" ? 12 : 10;
  return (
    <span title="공실뉴스부동산" style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", background: PRO_ORANGE, color: "#fff", fontSize: f, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1, padding: size === "md" ? "3px 6px 4px" : "2px 4px 3px", borderRadius: 3, ...style }}>{label}</span>
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

/** 내용은 그대로 보여 주고 흰 반투명 막 위에 안내 (2026-11-10 사장님: "그냥 내용을 다 보여주고 흰색 불투명 위에 안내 문구 있는 것이 좋을 것 같아")
 *  막 아래 화면은 누를 수 없다 */
export function ProCover({ what, message, onUpgrade, children }: { what: string; message: string; onUpgrade?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 560 /* 내용이 짧아도 안내 카드가 잘리지 않게 (2026-11-10) */, display: "flex", overflow: "hidden" }}>
      <div aria-hidden style={{ flex: 1, minWidth: 0, display: "flex", pointerEvents: "none", userSelect: "none" }}>{children}</div>
      <ProCoverOverlay what={what} message={message} onUpgrade={onUpgrade} center />
    </div>
  );
}

/** 흰 반투명 막 + 안내 카드만 — position: relative 인 칸 안에 둔다 */
export function ProCoverOverlay({ what, message, onUpgrade, center }: { what: string; message: string; onUpgrade?: () => void; /** 카드를 가운데에 (한 화면짜리) — 아니면 위쪽 */ center?: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 3000 /* 안쪽 화면의 고정 머리줄(미리보기 등)보다 위 */, minHeight: 360, background: "rgba(255,255,255,0.78)", display: "flex", alignItems: center ? "center" : "flex-start", justifyContent: "center", padding: center ? 24 : "90px 24px 24px" }}>
      <div style={{ maxWidth: 460, textAlign: "center", padding: "30px 34px", borderRadius: 16, background: "#fff", boxShadow: "0 12px 40px rgba(15,23,42,0.14)", border: "1px solid #eef0f3", position: "relative" }}>
        <div style={{ width: 56, height: 56, margin: "0 auto 14px", borderRadius: "50%", background: "rgba(234,138,12,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PRO_ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#111827", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{what} <ProTag size="md" /></div>
        <p style={{ margin: "10px 0 0", fontSize: 15, color: "#374151", lineHeight: 1.65 }}>{message}</p>
        {onUpgrade && (
          <button type="button" onClick={onUpgrade} style={{ marginTop: 18, padding: "11px 24px", borderRadius: 999, border: 0, background: PRO_ORANGE, color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>금액안내 보기</button>
        )}
      </div>
    </div>
  );
}
