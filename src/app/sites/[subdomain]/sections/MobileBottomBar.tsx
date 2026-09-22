"use client";

import React from "react";
import type { Theme } from "../theme";

interface Props {
  theme: Theme;
  phone?: string;
  onIntake: () => void;
  /** 편집기 미리보기에서는 화면이 아니라 미리보기 틀 아래에 붙인다 */
  preview?: boolean;
}

/**
 * 폰 하단 고정바.
 *
 * 원페이지는 길다. 매물을 보다 마음이 생긴 사람이 다시 위로 올라가 버튼을 찾게
 * 두면 대부분 거기서 끝난다. 급한 사람은 전화, 아닌 사람은 접수로 갈라진다.
 */
export default function MobileBottomBar({ theme, phone, onIntake, preview }: Props) {
  return (
    <div
      className={preview ? undefined : "gs-bottombar"}
      style={{
        position: preview ? "sticky" : "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: preview ? "flex" : undefined,
        gap: 8,
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "saturate(180%) blur(8px)",
        WebkitBackdropFilter: "saturate(180%) blur(8px)",
        borderTop: "1px solid #e8ecf0",
      }}
    >
      {phone && (
        <a
          href={`tel:${phone}`}
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minWidth: 104,
            padding: "15px 14px",
            background: "#16202b",
            color: "#fff",
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          전화
        </a>
      )}

      <button
        type="button"
        onClick={onIntake}
        style={{
          flex: 1,
          padding: "15px 14px",
          background: theme.primary,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 15.5,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        물건 접수하기
      </button>
    </div>
  );
}
