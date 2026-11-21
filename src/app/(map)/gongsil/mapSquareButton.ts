import type { CSSProperties } from "react";

/**
 * 공실열람(PC) 지도 오른쪽 네모 단추 — 시세 · 뉴스 · 부동산 (2026-11-21 사장님: 직방 [시세 최근]처럼 심플하게)
 *  흰 네모 · 굵은 글자 한 줄 + 작은 색 글자 한 줄. 켜면 바탕이 그 색.
 */
export function mapSquareButton(on: boolean, color: string): CSSProperties {
  return {
    width: 54, height: 54, padding: 0, border: "none", borderRadius: 8, cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
    background: on ? color : "#fff", color: on ? "#fff" : "#1f2937",
    boxShadow: "0 2px 8px rgba(0,0,0,.18)", fontSize: 15, fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap",
  };
}

export function mapSquareSub(on: boolean, color: string): CSSProperties {
  return { fontSize: 11.5, fontWeight: 700, color: on ? "rgba(255,255,255,.9)" : color };
}
