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
    </div>
  );
}
