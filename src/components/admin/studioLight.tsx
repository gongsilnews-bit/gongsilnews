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
/** 앱과 같은 모양을 쓰는 화면 — 앱 + 웹 회원 화면(부동산·일반 회원). 최고관리자(/admin)도 같은 곤색 (2026-11-03 사장님: "최고관리자 화면도 오늘 만든 디자인으로 하나하나 다") */
export const studioSurface = () => inStudioApp() || (typeof window !== "undefined" && /^\/(realty_admin|user_admin|admin)(\/|$)/.test(window.location.pathname));

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

/** 크롬 확장 웹스토어 — 공실뉴스 AI 기사·블로그·SNS·유튜브 작성기 (2026-11-04 도우미 기능을 이 확장에 합침, 앱 없이 웹만) */
export const HELPER_STORE_URL = "https://chromewebstore.google.com/detail/opoimbbagnpmhlblgbpophbigakilofc";
/** 평소 크롬으로 연다 — 앱이면 openInBrowser, 웹이면 새 탭 */
export function openHelperStore() {
  const g = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => Promise<unknown> } }).gongsilStudio;
  if (g?.openInBrowser) { void g.openInBrowser(HELPER_STORE_URL); return; }
  // 웹 — 크롬·엣지·웨일 설치 안내 창 (2026-11-04 사장님: 자동 설치 + 직접 설치)
  void import("@/components/admin/HelperInstallGuide").then((m) => m.showHelperGuide());
}

/** 최고관리자 화면 공통 곤색 껍질 — 18개 관리자 화면에 한 번에 (2026-11-03 사장님: 하나하나 다 바꿔줘)
 *  화면 안의 파랑 단추·파랑 글자·둥근 그림자 칸을 곤색 규칙으로 덮는다. 화면별로 다듬은 곳(gs-al)은 그 규칙이 먼저 */
export const ADMIN_SKIN = [
  ".gs-adm{background:#f7f8fa!important}",
  // 둥근 그림자 카드 → 얇은 테두리 흰 칸
  ".gs-adm [style*='border-radius: 14px'][style*='box-shadow'],.gs-adm [style*='border-radius: 16px'][style*='box-shadow'],.gs-adm [style*='border-radius: 12px'][style*='box-shadow']{border-radius:8px!important;box-shadow:none!important;border:1px solid #e5e7eb!important}",
  // 파랑 채운 단추 → 곤색
  ".gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(59, 130, 246)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(37, 99, 235)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(29, 78, 216)'],.gs-adm a[style*='background: rgb(59, 130, 246)'],.gs-adm a[style*='background: rgb(37, 99, 235)']{background:#1e3a6e!important;border-color:#1e3a6e!important;border-radius:5px!important;box-shadow:none!important}",
  ".gs-adm button[style*='linear-gradient']{background:#1e3a6e!important;box-shadow:none!important}",
  ".gs-adm button.gs-al-sec.gs-al-sec.gs-al-sec.gs-al-sec{background:#fff!important;color:#374151!important;border:1px solid #d9dde3!important;border-radius:5px!important;box-shadow:none!important}",
  // 진회색 채운 단추(검색 등) → 곤색
  ".gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(55, 65, 81)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(75, 85, 99)']{background:#1e3a6e!important;border-radius:5px!important}",
  // 파랑 글자·테두리 → 곤색
  ".gs-adm [style*='color: rgb(59, 130, 246)'],.gs-adm [style*='color: rgb(37, 99, 235)'],.gs-adm [style*='color: rgb(29, 78, 216)']{color:#1e3a6e!important}",
  ".gs-adm [style*='border-bottom: 3px solid rgb(59, 130, 246)'],.gs-adm [style*='border-bottom: 2px solid rgb(59, 130, 246)']{border-bottom-color:#1e3a6e!important}",
  ".gs-adm [style*='border: 1px solid rgb(59, 130, 246)'],.gs-adm [style*='border: 1.5px solid rgb(59, 130, 246)'],.gs-adm [style*='border: 2px solid rgb(59, 130, 246)']{border-color:#1e3a6e!important}",
  // 옅은 파랑 바탕 → 옅은 회색
  ".gs-adm [style*='background: rgb(239, 246, 255)']{background:#f3f5f9!important;border-color:#e5e7eb!important}",
  // 입력칸·고르기
  ".gs-adm input:not([type=checkbox]):not([type=radio]),.gs-adm select,.gs-adm textarea{border-radius:5px!important;border-color:#d9dde3!important}",
  ".gs-adm input:focus,.gs-adm select:focus,.gs-adm textarea:focus{border-color:#1e3a6e!important;outline:none}",
  ".gs-adm input[type=checkbox],.gs-adm input[type=radio]{accent-color:#1e3a6e}",
  // 표 머리
  ".gs-adm thead tr{background:#fff!important}",
  ".gs-adm th{color:#6b7280!important;font-weight:700!important}",
  ".gs-adm tbody tr:hover{background:#fafbfc}",
  // 화면마다 다른 색 덩어리 단추·표시를 한 규칙으로 (2026-11-03 사장님: "뒤죽박죽 — 깔끔하게")
  ".gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(16, 185, 129)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(5, 150, 105)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(34, 197, 94)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(22, 163, 74)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(4, 120, 87)']{background:#fff!important;color:#059669!important;border:1px solid #d9dde3!important;border-radius:5px!important;box-shadow:none!important}",
  ".gs-adm span[style*='background: rgb(16, 185, 129)'],.gs-adm div[style*='background: rgb(16, 185, 129)'][style*='border-radius'],.gs-adm span[style*='background: rgb(5, 150, 105)'],.gs-adm div[style*='background: rgb(5, 150, 105)'][style*='border-radius'],.gs-adm span[style*='background: rgb(34, 197, 94)'],.gs-adm div[style*='background: rgb(34, 197, 94)'][style*='border-radius'],.gs-adm span[style*='background: rgb(22, 163, 74)'],.gs-adm div[style*='background: rgb(22, 163, 74)'][style*='border-radius'],.gs-adm span[style*='background: rgb(4, 120, 87)'],.gs-adm div[style*='background: rgb(4, 120, 87)'][style*='border-radius']{background:#d1fae5!important;color:#059669!important;border-color:transparent!important;border-radius:5px!important}",
  ".gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(239, 68, 68)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(220, 38, 38)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(185, 28, 28)']{background:#fff!important;color:#dc2626!important;border:1px solid #d9dde3!important;border-radius:5px!important;box-shadow:none!important}",
  ".gs-adm span[style*='background: rgb(239, 68, 68)'],.gs-adm div[style*='background: rgb(239, 68, 68)'][style*='border-radius'],.gs-adm span[style*='background: rgb(220, 38, 38)'],.gs-adm div[style*='background: rgb(220, 38, 38)'][style*='border-radius'],.gs-adm span[style*='background: rgb(185, 28, 28)'],.gs-adm div[style*='background: rgb(185, 28, 28)'][style*='border-radius']{background:#fee2e2!important;color:#dc2626!important;border-color:transparent!important;border-radius:5px!important}",
  ".gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(245, 158, 11)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(249, 115, 22)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(234, 88, 12)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(217, 119, 6)']{background:#fff!important;color:#d97706!important;border:1px solid #d9dde3!important;border-radius:5px!important;box-shadow:none!important}",
  ".gs-adm span[style*='background: rgb(245, 158, 11)'],.gs-adm div[style*='background: rgb(245, 158, 11)'][style*='border-radius'],.gs-adm span[style*='background: rgb(249, 115, 22)'],.gs-adm div[style*='background: rgb(249, 115, 22)'][style*='border-radius'],.gs-adm span[style*='background: rgb(234, 88, 12)'],.gs-adm div[style*='background: rgb(234, 88, 12)'][style*='border-radius'],.gs-adm span[style*='background: rgb(217, 119, 6)'],.gs-adm div[style*='background: rgb(217, 119, 6)'][style*='border-radius']{background:#fef3c7!important;color:#d97706!important;border-color:transparent!important;border-radius:5px!important}",
  ".gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(139, 92, 246)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(124, 58, 237)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(168, 85, 247)']{background:#fff!important;color:#7c3aed!important;border:1px solid #d9dde3!important;border-radius:5px!important;box-shadow:none!important}",
  ".gs-adm span[style*='background: rgb(139, 92, 246)'],.gs-adm div[style*='background: rgb(139, 92, 246)'][style*='border-radius'],.gs-adm span[style*='background: rgb(124, 58, 237)'],.gs-adm div[style*='background: rgb(124, 58, 237)'][style*='border-radius'],.gs-adm span[style*='background: rgb(168, 85, 247)'],.gs-adm div[style*='background: rgb(168, 85, 247)'][style*='border-radius']{background:#ede9fe!important;color:#7c3aed!important;border-color:transparent!important;border-radius:5px!important}",
  ".gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(156, 163, 175)'],.gs-adm button:not([data-keep-fill]):not(.gs-al-badge)[style*='background: rgb(107, 114, 128)']{background:#fff!important;color:#6b7280!important;border:1px solid #d9dde3!important;border-radius:5px!important;box-shadow:none!important}",
  ".gs-adm span[style*='background: rgb(156, 163, 175)'],.gs-adm div[style*='background: rgb(156, 163, 175)'][style*='border-radius'],.gs-adm span[style*='background: rgb(107, 114, 128)'],.gs-adm div[style*='background: rgb(107, 114, 128)'][style*='border-radius']{background:#f3f4f6!important;color:#6b7280!important;border-color:transparent!important;border-radius:5px!important}",
  // 파랑 채운 작은 숫자(고른 탭 등) → 곤색
  ".gs-adm span[style*='background: rgb(59, 130, 246)'],.gs-adm span[style*='background: rgb(37, 99, 235)']{background:#1e3a6e!important;color:#fff!important;border-radius:5px!important}",
  // 주황·초록 밑줄 탭 → 곤색
  ".gs-adm [style*='border-bottom: 3px solid rgb(249, 115, 22)'],.gs-adm [style*='border-bottom: 3px solid rgb(37, 99, 235)'],.gs-adm [style*='border-bottom: 3px solid rgb(5, 150, 105)']{border-bottom-color:#1e3a6e!important}",
  ".gs-adm button[style*='color: rgb(249, 115, 22)'][style*='border-bottom']{color:#1e3a6e!important}",
  // 둥근 알약 칩(카테고리 고르기) → 각진 칩
  ".gs-adm button[style*='border-radius: 20px'],.gs-adm button[style*='border-radius: 999px'],.gs-adm button[style*='border-radius: 9999px']{border-radius:5px!important}",
  // 글자 — 같은 글꼴, 제목 크기 맞추기
  ".gs-adm,.gs-adm button,.gs-adm input,.gs-adm select,.gs-adm textarea{font-family:'Pretendard Variable','Pretendard','Malgun Gothic',sans-serif}",
  ".gs-adm h1{font-size:22px!important;font-weight:800!important;color:#111827!important;letter-spacing:-0.3px}",
  ".gs-adm h2{font-size:17px!important;font-weight:800!important;color:#111827!important}",
  ".gs-adm h3{font-size:15px!important;font-weight:800!important;color:#111827!important}",
  ".gs-adm th{font-size:13px!important}",
  ".gs-adm td{font-size:13.5px}",
  // ── 글자 크기·색 한 벌 (2026-11-03 사장님: "곤색 폰트 CSS로 통일감 있게") ──
  //  아주 작은 글자(10~11px)는 12px 로 올리고, 12px 는 12.5px 로 — 비서실 등 "글씨가 너무 작아"
  ".gs-adm [style*='font-size: 9px'],.gs-adm [style*='font-size: 9.5px'],.gs-adm [style*='font-size: 10px'],.gs-adm [style*='font-size: 10.5px'],.gs-adm [style*='font-size: 11px'],.gs-adm [style*='font-size: 11.5px']{font-size:12px!important}",
  ".gs-adm [style*='font-size: 12px']{font-size:12.5px!important}",
  ".gs-adm [style*='font-size: 13px']{font-size:13.5px!important}",
  // 큰 숫자(카드) — 곤색
  ".gs-adm [style*='font-size: 28px'],.gs-adm [style*='font-size: 30px'],.gs-adm [style*='font-size: 32px']{color:#1e3a6e!important}",
  // 진한 검정 글자 → 본문 검정 하나 / 회색 → 회색 하나
  ".gs-adm [style*='color: rgb(17, 24, 39)'],.gs-adm [style*='color: rgb(31, 41, 55)'],.gs-adm [style*='color: rgb(0, 0, 0)'],.gs-adm [style*='color: rgb(51, 51, 51)']{color:#1f2937!important}",
  ".gs-adm [style*='color: rgb(156, 163, 175)'],.gs-adm [style*='color: rgb(148, 163, 184)'],.gs-adm [style*='color: rgb(107, 114, 128)'],.gs-adm [style*='color: rgb(100, 116, 139)']{color:#6b7280!important}",
  // 보라·하늘 강조 글자 → 곤색
  ".gs-adm [style*='color: rgb(139, 92, 246)'],.gs-adm [style*='color: rgb(124, 58, 237)'],.gs-adm [style*='color: rgb(14, 165, 233)'],.gs-adm [style*='color: rgb(6, 182, 212)']{color:#1e3a6e!important}",
  // 진행 막대 — 곤색 하나
  ".gs-adm [style*='height: 6px'][style*='background: rgb(59, 130, 246)'],.gs-adm [style*='height: 6px'][style*='background: rgb(245, 158, 11)'],.gs-adm [style*='height: 6px'][style*='background: rgb(139, 92, 246)'],.gs-adm [style*='height: 6px'][style*='background: rgb(16, 185, 129)'],.gs-adm [style*='height: 4px'][style*='background: rgb(59, 130, 246)']{background:#1e3a6e!important}",
  // 광고 카드 머리 띠 — 꽉 찬 빨강·회색 → 흰 띠 + 상태 글자 (기간 글자는 검정)
  ".gs-adm div[style*='background: rgb(239, 68, 68)'][style*='padding'],.gs-adm div[style*='background: rgb(156, 163, 175)'][style*='padding'],.gs-adm div[style*='background: rgb(16, 185, 129)'][style*='padding']{background:#f7f8fa!important;color:#374151!important;border-bottom:1px solid #e5e7eb}",
  // 머리 줄 [최고관리자] 표시 — 곤색
  ".gs-adm-head span[style*='background: rgb(219, 234, 254)']{background:#eef1f7!important;color:#1e3a6e!important}",
  // 그림 글자 대신 넣은 선 픽토그램은 글자 옆에 (기본 설정이 svg 를 줄 하나로 띄운다)
  "svg[aria-hidden][style*='vertical-align: -2px']{display:inline-block!important}",
].join("");

/** 그림 글자(이모지) 자리에 선 픽토그램 — 에이전트·채널 목록처럼 값으로 들어 있는 그림 글자용 */
const EMOJI_PATH: Record<string, string> = {
  "🛡️": "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z", "🛡": "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  "📸": "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  "🎨": "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.5 1-2.5 2.5-2.5H18a3 3 0 0 0 3-3c0-5-4-9-9-9zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01",
  "🎬": "M3 8h18v12H3zM3 8l3-4h12l3 4M8 4l2 4M14 4l2 4",
  "✍️": "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z", "✍": "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  "🏛️": "M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18", "🏛": "M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18",
  "📰": "M4 4h13v16H4zM17 8h3v10a2 2 0 0 1-2 2M7 8h7M7 12h7M7 16h4",
  "🏢": "M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 7h3M8 11h3M8 15h3",
  "🤖": "M5 9h14v11H5zM12 9V5M9 14h.01M15 14h.01M2 14h3M19 14h3",
  "🔍": "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
  "💬": "M21 12a8 8 0 0 1-12 7l-6 2 2-5A8 8 0 1 1 21 12z",
  "📊": "M4 20V10M10 20V4M16 20v-7M22 20H2",
  "⚖️": "M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0zM19 7l-3 7a4 4 0 0 0 6 0zM8 21h8",
  "🏠": "M3 11 12 4l9 7M5 10v10h14V10",
};
const EMOJI_FALLBACK = "M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0";
export function EmojiIco({ e, size = 18 }: { e?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle", color: "#1e3a6e", marginRight: 6 }}>
      <path d={EMOJI_PATH[String(e || "")] || EMOJI_FALLBACK} />
    </svg>
  );
}
