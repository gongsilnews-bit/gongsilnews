"use client";
/**
 * 앱(공실마케팅studio) 밝은 화면 — 목록 화면 공통 모양 (2026-11-03 사장님 "남색 테마 + SVG + 색상으로 포인트")
 *  흰 바탕 · 남색 하나 · 얇은 테두리. 상태(광고중·발행됨·반려…)만 색을 준다. 웹·어두운 화면은 그대로.
 *  쓰는 법: 바깥에 className="gs-al" + <StudioListCss colors={…} />, 칸 gs-al-card, 탭 gs-al-tabs/gs-al-tab(on),
 *  탭 숫자 gs-al-cnt data-k={탭}, 상태 표시 gs-al-badge data-k={상태}, 단추 gs-al-pri(남색)/gs-al-sec(흰색)/gs-al-del
 */
import React, { useEffect, useState } from "react";

export const NAVY = "#1e3a6e";

/** 상태 색 [글자, 옅은 바탕] */
export type StateColors = Record<string, [string, string]>;
export const C_GREEN: [string, string] = ["#059669", "#d1fae5"];
export const C_RED: [string, string] = ["#dc2626", "#fee2e2"];
export const C_AMBER: [string, string] = ["#d97706", "#fef3c7"];
export const C_VIOLET: [string, string] = ["#7c3aed", "#ede9fe"];
export const C_GRAY: [string, string] = ["#6b7280", "#f3f4f6"];

/** 앱(공실마케팅studio) 안인가 — 기사 쓰기 다리(write)가 있다 */
export const inStudioApp = () => typeof window !== "undefined" && Boolean((window as unknown as { gongsilStudio?: { write?: unknown } }).gongsilStudio?.write);
/** 앱과 같은 모양을 쓰는 화면 — 앱 + 웹 회원 화면(부동산·일반 회원). 최고관리자(/admin)는 예전 그대로 (2026-11-03 사장님: 웹도 왼쪽 메뉴만 빼고 앱과 같이) */
export const studioSurface = () => inStudioApp() || (typeof window !== "undefined" && /^\/(realty_admin|user_admin)(\/|$)/.test(window.location.pathname));

/** 앱과 같은 밝은 남색 모양인가 — 앱·웹 회원 화면 + 어두운 화면 아님 */
export function useStudioLight(darkMode: boolean) {
  const [st, setSt] = useState(false);
  useEffect(() => { setSt(!darkMode && studioSurface()); }, [darkMode]);
  return st;
}

export function StudioListCss({ colors }: { colors: StateColors }) {
  const css = [
    ".gs-al{background:#f7f8fa!important}",
    ".gs-al .gs-al-card{border-radius:8px!important;box-shadow:none!important;border:1px solid #e5e7eb}",
    ".gs-al input,.gs-al select{border-radius:5px!important;border-color:#d9dde3!important}",
    ".gs-al .gs-al-tabs{background:#fff!important}",
    ".gs-al .gs-al-tab{color:#6b7280!important;border-bottom-color:transparent!important;font-weight:700!important}",
    `.gs-al .gs-al-tab.on{color:${NAVY}!important;border-bottom-color:${NAVY}!important;font-weight:800!important}`,
    ".gs-al .gs-al-cnt{background:#eef1f5!important;color:#4b5563!important;border-radius:5px!important}",
    `.gs-al .gs-al-tab.on .gs-al-cnt{background:${NAVY}!important;color:#fff!important}`,
    `.gs-al .gs-al-pri{background:${NAVY}!important;color:#fff!important;border:1px solid ${NAVY}!important;border-radius:5px!important}`,
    ".gs-al .gs-al-pri:hover{background:#16305c!important}",
    ".gs-al .gs-al-sec{background:#fff!important;color:#374151!important;border:1px solid #d9dde3!important;border-radius:5px!important}",
    `.gs-al .gs-al-sec:hover{border-color:${NAVY}!important;color:${NAVY}!important}`,
    ".gs-al .gs-al-del{color:#9ca3af!important}",
    ".gs-al .gs-al-note{background:#f7f8fa!important;border-color:#e5e7eb!important;border-radius:6px!important}",
    ".gs-al .gs-al-note span{color:#4b5563!important}",
    ".gs-al thead tr{background:#fff!important}",
    ".gs-al th{color:#6b7280!important;border-bottom:1px solid #e5e7eb!important;font-weight:700!important}",
    ".gs-al tbody tr:hover{background:#fafbfc}",
    ".gs-al .gs-al-fb{color:#6b7280!important;font-weight:500!important}",
    `.gs-al input[type=checkbox]{accent-color:${NAVY}}`,
    ".gs-al .gs-al-badge{border:0!important;border-radius:4px!important;font-weight:800!important;white-space:nowrap}",
    ...Object.entries(colors).flatMap(([k, [c, bg]]) => [
      `.gs-al .gs-al-cnt[data-k="${k}"]{background:${bg}!important;color:${c}!important}`,
      `.gs-al .gs-al-tab.on .gs-al-cnt[data-k="${k}"]{background:${c}!important;color:#fff!important}`,
      `.gs-al .gs-al-badge[data-k="${k}"]{background:${bg}!important;color:${c}!important}`,
    ]),
  ].join("");
  return <style>{css}</style>;
}

/** 선 픽토그램 — 글자색을 따라간다 */
export function Ico({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}><path d={d} /></svg>
  );
}

/** 자주 쓰는 픽토그램 모양 */
export const ICON = {
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  plus: "M12 5v14M5 12h14",
  clipboardCheck: "M9 4h6v3H9zM8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M9 14l2 2 4-4",
  tag: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 7.5h.01",
  building: "M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 7h3M8 11h3M8 15h3",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",
  report: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h4",
  poster: "M4 3h16v18H4zM4 15l4-4 4 4 3-3 5 5M15 8h.01",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
  refresh: "M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5",
  pin: "M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  calc: "M5 3h14v18H5zM8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h8",
  check: "M20 6 9 17l-5-5",
  folder: "M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
};
