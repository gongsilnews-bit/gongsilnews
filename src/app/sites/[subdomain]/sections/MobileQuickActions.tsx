"use client";

import React from "react";
import type { Theme } from "../theme";

interface Props {
  theme: Theme;
  phone?: string;
  /** 섹션으로 보내는 진짜 링크. 스크립트가 막혀도 브라우저가 이동시킨다 */
  anchor: (id: string) => { href: string; onClick: (ev: React.MouseEvent) => void };
  /** 편집기 미리보기에서는 화면이 아니라 미리보기 틀 안에 붙인다 */
  preview?: boolean;
}

/**
 * 폰 오른쪽 아래에 따라다니는 버튼 묶음.
 *
 * 원페이지는 길다. 매물을 보다 마음이 생긴 사람이 다시 위로 올라가 버튼을
 * 찾게 두면 대부분 거기서 끝난다. 그래서 늘 떠 있어야 한다.
 *
 * 전에는 가로 전체를 쓰는 띠였다. 눈에는 잘 띄지만 화면 아래 74px 을 끝까지
 * 물고 있어, 매물 카드나 기사를 읽는 내내 거슬렸다. 세로로 세우면 오른쪽
 * 여백만 쓴다.
 *
 * 대신 작아진 만큼 무게를 나눈다 — 전화와 접수는 테마색으로 눈에 띄게 두고,
 * 맨위로는 흐리게, 그것도 조금 내려갔을 때만 나타난다. 넷을 늘 띄워두면
 * 화면이 무겁다.
 *
 * 아래에서 위로: 전화 → 물건접수 → (즐겨찾기) → 맨위로
 */
export default function MobileQuickActions({ theme, phone, anchor, preview }: Props) {
  const [showTop, setShowTop] = React.useState(false);

  /*
   * 바탕화면에 깔기.
   *
   * 안드로이드는 브라우저가 "이제 설치할 수 있다"고 알려줄 때만 설치창을 띄울
   * 수 있다. 그 신호를 붙잡아 두었다가 버튼을 누를 때 쓴다.
   *
   * 아이폰은 설치창을 띄울 방법이 아예 없다. [공유] → [홈 화면에 추가] 를
   * 손님이 직접 눌러야 하므로 그 순서를 그림처럼 적어 보여준다.
   *
   * 이미 깔아둔 사람에게는 버튼을 보이지 않는다.
   */
  const [installEvent, setInstallEvent] = React.useState<any>(null);
  const [isIOS, setIsIOS] = React.useState(false);
  const [installed, setInstalled] = React.useState(true);
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);

  React.useEffect(() => {
    if (preview) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // 설치 조건을 채우는 최소 워커. 화면을 가로채지 않는다.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [preview]);

  const canInstall = !preview && !installed && (Boolean(installEvent) || isIOS);

  const install = async () => {
    if (installEvent) {
      installEvent.prompt();
      const res = await installEvent.userChoice.catch(() => null);
      if (res?.outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    setShowIOSGuide(true);
  };

  React.useEffect(() => {
    if (preview) return;
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [preview]);

  const round: React.CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: "50%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 10.5,
    fontWeight: 800,
    lineHeight: 1,
    boxShadow: "0 4px 14px rgba(16,24,40,.22)",
  };

  return (
    <div
      className={preview ? undefined : "gs-quickstack"}
      style={{
        position: preview ? "sticky" : "fixed",
        right: 14,
        bottom: preview ? 14 : "calc(16px + env(safe-area-inset-bottom))",
        zIndex: 50,
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "flex-end",
        gap: 10,
      }}
    >
      {/* 맨 아래 — 급한 사람은 여기서 끝난다 */}
      {phone && (
        <a href={`tel:${phone}`} aria-label="전화하기" style={{ ...round, background: "#16202b", color: "#fff" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          전화
        </a>
      )}

      <a {...anchor("intake")} aria-label="물건 접수하기" style={{ ...round, background: theme.primary, color: "#fff" }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        접수
      </a>

      {/* 깔 수 있을 때만 보인다. 이미 깔았거나 지원하지 않으면 자리도 안 잡는다 */}
      {canInstall && (
        <button
          type="button"
          onClick={install}
          aria-label="바탕화면에 추가"
          style={{ ...round, background: "rgba(255,255,255,0.96)", color: theme.primary, border: `1px solid ${theme.primary}55` }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          바탕
        </button>
      )}

      {/* 조금 내려갔을 때만. 첫 화면에서는 올라갈 곳이 없다 */}
      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="맨 위로"
          style={{ ...round, background: "rgba(255,255,255,0.96)", color: "#64748b", border: "1px solid #e2e8f0" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 15l-6-6-6 6" />
          </svg>
          위로
        </button>
      )}

      {/*
        아이폰 안내.
        버튼을 눌러도 설치창이 안 뜨니, 무엇을 눌러야 하는지 그대로 적어준다.
        화면 아래에서 올라오게 두어 공유 버튼이 있는 쪽을 가리킨다.
      */}
      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(15,23,42,.45)",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "#fff",
              borderRadius: "16px 16px 0 0",
              padding: "22px 20px calc(22px + env(safe-area-inset-bottom))",
              textAlign: "left",
            }}
          >
            <p style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900, color: theme.dark }}>
              바탕화면에 추가하기
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 15, color: "#475569", lineHeight: 2 }}>
              <li>화면 아래 <strong>공유</strong> 버튼을 누르세요</li>
              <li>목록을 내려 <strong>홈 화면에 추가</strong>를 고르세요</li>
              <li>오른쪽 위 <strong>추가</strong>를 누르면 끝입니다</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              style={{
                width: "100%",
                marginTop: 18,
                padding: "13px 0",
                border: "none",
                borderRadius: 10,
                background: theme.primary,
                color: "#fff",
                fontSize: 15.5,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              알겠습니다
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
