"use client";
// 앱 공유 받은 화면 (2026-11-19 사장님) — 사진 · 제목 · 짧은 소개 + 큰 [공실뉴스 앱에서 보기]
//  - 안드로이드 폰에서만 이 화면. 아이폰·PC·우리 앱 안(GongsilNewsApp)은 원래 웹 화면으로 바로 넘긴다
//  - [앱에서 보기] → 앱이 있으면 앱의 그 화면(gongsilnews://open?u=…), 없으면 플레이스토어 설치
//    설치 화면 주소에 referrer 로 원래 주소를 붙여 둔다 — 다음 앱 빌드에서 설치 뒤 첫 실행 때 그 화면을 연다
//  - 앱이 플레이스토어에 오르기 전(NEXT_PUBLIC_APP_STORE_LIVE 가 1 이 아님)에는 단추를 누르면 웹 화면으로 (주소 끝 ?apptest=1 이면 미리 시험)
import { useEffect, useState } from "react";

export type ShareCard = { kind: "v" | "n"; title: string; desc: string; image: string | null; price: string; place: string; webPath: string };

const NAVY = "#102c57";
const ORANGE = "#ff8e15";
const PACKAGE = "com.gongsilnews.app";
const LIVE = process.env.NEXT_PUBLIC_APP_STORE_LIVE === "1";

export default function ShareLanding({ card }: { card: ShareCard | null }) {
  const [ready, setReady] = useState(false);
  const [test, setTest] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const inApp = /GongsilNewsApp/.test(ua) || !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    const t = new URLSearchParams(location.search).get("apptest") === "1";
    setTest(t);
    if (!card) { location.replace("/m"); return; }
    if (inApp || (!/Android/i.test(ua) && !t)) { location.replace(card.webPath); return; } // 아이폰·PC·앱 안 → 원래 화면
    setReady(true);
  }, [card]);

  if (!card || !ready) return <div style={{ minHeight: "100vh", background: "#fff" }} />;

  const openApp = () => {
    if (!LIVE && !test) { location.href = card.webPath; return; } // 스토어 오르기 전
    const store = `https://play.google.com/store/apps/details?id=${PACKAGE}&referrer=${encodeURIComponent(`u=${card.webPath}`)}`;
    location.href = `intent://open?u=${encodeURIComponent(card.webPath)}#Intent;scheme=gongsilnews;package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(store)};end`;
  };
  const isV = card.kind === "v";

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", justifyContent: "center", fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 448, background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px" }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: NAVY, letterSpacing: "-0.5px" }}>공실<span style={{ color: ORANGE }}>뉴스</span></span>
          <span style={{ fontSize: 12.5, color: "#6b7280", fontWeight: 600 }}>{isV ? "공유받은 공실" : "공유받은 기사"}</span>
        </div>

        <div style={{ width: "100%", aspectRatio: "16 / 10", background: "#e5e7eb", overflow: "hidden" }}>
          {card.image && <img src={card.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>

        <div style={{ padding: "18px 20px 8px" }}>
          {isV ? (
            <>
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>{card.desc}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#1a73e8", marginTop: 6, letterSpacing: "-0.5px" }}>{card.price}</div>
              <div style={{ fontSize: 15, color: "#111827", fontWeight: 700, marginTop: 4 }}>{card.place}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 21, fontWeight: 900, color: "#111827", lineHeight: 1.4, letterSpacing: "-0.5px", wordBreak: "keep-all" }}>{card.title}</div>
              {card.desc && <div style={{ fontSize: 15, color: "#4b5563", marginTop: 10, lineHeight: 1.6, wordBreak: "keep-all" }}>{card.desc}</div>}
            </>
          )}
        </div>

        <div style={{ margin: "14px 20px 0", padding: "14px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #eef2f7", fontSize: 14, color: "#374151", lineHeight: 1.6, wordBreak: "keep-all" }}>
          {isV ? "사진 전체·위치·연락하기는 공실뉴스 앱에서 볼 수 있어요. 주변 공실도 지도로 한눈에." : "기사 전체는 공실뉴스 앱에서 볼 수 있어요. 우리 동네 공실과 소식도 함께."}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ position: "sticky", bottom: 0, background: "#fff", padding: "12px 20px calc(16px + env(safe-area-inset-bottom))", borderTop: "1px solid #f1f5f9" }}>
          <button onClick={openApp} style={{ width: "100%", height: 54, border: "none", borderRadius: 12, background: NAVY, color: "#fff", fontSize: 16.5, fontWeight: 800, cursor: "pointer" }}>
            {isV ? "공실뉴스 앱에서 공실 보기" : "공실뉴스 앱에서 기사 보기"}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 8 }}>앱이 없으면 설치 화면으로 이동합니다</div>
        </div>
      </div>
    </div>
  );
}
