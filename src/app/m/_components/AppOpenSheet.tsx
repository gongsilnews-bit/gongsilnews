"use client";

/**
 * 공유받은 공실·기사를 모바일 웹으로 열었을 때 아래에서 올라오는 [공실뉴스 앱으로 보기] 창 (2026-11-18 사장님: 직방처럼)
 *
 * - 띄우는 곳: 공실 상세(/m/gongsil?id=…) · 기사(/m/news/<id>) — 카톡 등으로 공유되는 주소
 * - 안드로이드 휴대폰 브라우저에서만. 우리 앱 안 웹 화면(사용자 에이전트 GongsilNewsApp)에서는 절대 안 띄운다
 * - [앱으로 보기] → 앱이 깔려 있으면 앱의 그 화면, 없으면 플레이스토어 설치 화면 (안드로이드 intent 주소 하나로)
 * - [모바일 웹으로 볼게요] → 하루 동안 다시 안 띄움
 * - 앱이 플레이스토어에 오르기 전에는 꺼 둔다: NEXT_PUBLIC_APP_STORE_LIVE=1 일 때만 켜짐
 *   (미리 보기: 주소 끝에 &apptest=1 을 붙이면 꺼져 있어도 보인다)
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// 서버 그림에는 없고 브라우저에서만 판단한다
const noopSubscribe = () => () => {};

/** 이 브라우저에서 창을 띄워도 되는가 (앱 안 · 아이폰 · 하루 숨김은 제외) */
function canShow(test: boolean) {
  const ua = navigator.userAgent || "";
  if (/GongsilNewsApp/.test(ua) || (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView) return false;
  if (!/Android/i.test(ua) && !test) return false; // 아이폰 앱은 아직 없다
  try { if (!test && Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now()) return false; } catch { /* 저장소가 막혀도 창은 띄운다 */ }
  return true;
}

const NAVY = "#102c57";
const ORANGE = "#ff8e15";
const PACKAGE = "com.gongsilnews.app";
const STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;
const HIDE_KEY = "gsn_app_sheet_hide_until";
const LIVE = process.env.NEXT_PUBLIC_APP_STORE_LIVE === "1";

export default function AppOpenSheet() {
  const pathname = usePathname() || "";
  const search = useSearchParams();
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [closed, setClosed] = useState(false);

  const isVacancy = pathname === "/m/gongsil" && !!search.get("id");
  const isNews = /^\/m\/news\/[\w-]+$/.test(pathname);
  const test = search.get("apptest") === "1";
  const show = isClient && !closed && (LIVE || test) && (isVacancy || isNews) && !search.get("part") && canShow(test);

  // 창이 떠 있는 동안 뒤 화면이 같이 밀리지 않게
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  if (!show) return null;

  const openApp = () => {
    const params = new URLSearchParams(search.toString());
    params.delete("apptest");
    const qs = params.toString();
    const target = pathname + (qs ? `?${qs}` : "");
    // 앱이 있으면 gongsilnews://open?u=… 로 앱의 그 화면, 없으면 플레이스토어
    window.location.href = `intent://open?u=${encodeURIComponent(target)}#Intent;scheme=gongsilnews;package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(STORE_URL)};end`;
  };
  const stayWeb = () => {
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + 24 * 3600 * 1000)); } catch { /* 무시 */ }
    setClosed(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="공실뉴스 앱으로 보기"
      onClick={(e) => { if (e.target === e.currentTarget) stayWeb(); }}
      style={{ position: "fixed", inset: 0, zIndex: 10000020, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div style={{ width: "100%", maxWidth: 448, background: "#fff", borderRadius: "20px 20px 0 0", padding: "26px 22px calc(18px + env(safe-area-inset-bottom))", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#111827", lineHeight: 1.4, letterSpacing: "-0.5px", wordBreak: "keep-all" }}>
              {isVacancy ? "공유받은 공실," : "공실뉴스 기사,"}<br />앱에서 바로 보세요
            </div>
            <div style={{ fontSize: 13.5, color: "#6b7280", marginTop: 6, wordBreak: "keep-all" }}>
              {isVacancy ? "사진·위치·연락처를 한 화면에서, 주변 공실은 지도로." : "기사와 우리 동네 공실을 한 곳에서 볼 수 있어요."}
            </div>
          </div>
          <div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 16, background: NAVY, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(16,44,87,0.3)" }}>
            <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.5px" }}>공실</span>
            <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.5px", color: ORANGE }}>뉴스</span>
          </div>
        </div>
        <button
          onClick={openApp}
          style={{ width: "100%", marginTop: 22, height: 52, border: "none", borderRadius: 12, background: NAVY, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}
        >
          공실뉴스 앱으로 보기
        </button>
        <button
          onClick={stayWeb}
          style={{ width: "100%", marginTop: 6, height: 44, border: "none", background: "none", color: "#6b7280", fontSize: 14, textDecoration: "underline", cursor: "pointer" }}
        >
          모바일 웹으로 볼게요
        </button>
      </div>
    </div>
  );
}
