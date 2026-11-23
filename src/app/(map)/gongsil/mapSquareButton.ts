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

/**
 * 모바일 공실열람 [지도 표시] 창의 한 줄 — 앱과 같은 체크 상자 줄 (2026-11-22 사장님: 앱처럼 겹쳐 보기 아이콘을 누르면 나오게)
 *  ☑/☐ + 이름. 켜면 그 색 글자. 창 모양은 m/gongsil/page.tsx
 */
export function mapLayerRow(on: boolean, color: string): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 4px", border: "none", background: "none", cursor: "pointer",
    fontSize: 14, fontWeight: on ? 800 : 600, color: on ? color : "#374151", fontFamily: "inherit", whiteSpace: "nowrap", textAlign: "left",
  };
}

/** 체크 상자 모양 (앱 Ionicons checkbox / square-outline 과 비슷하게) */
export function mapLayerBox(on: boolean, color: string): CSSProperties {
  return {
    width: 18, height: 18, flexShrink: 0, borderRadius: 4, boxSizing: "border-box",
    border: `2px solid ${on ? color : "#9ca3af"}`, background: on ? color : "#fff",
    color: "#fff", fontSize: 12, fontWeight: 900, lineHeight: "14px", textAlign: "center",
  };
}
