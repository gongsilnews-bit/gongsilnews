"use client";

import React from "react";
import type { Theme } from "../theme";

interface Props {
  theme: Theme;
  /** 제목 위에 얹는 영문 한 줄. 없으면 생략한다 */
  label?: string;
  title: string;
  desc?: string;
  /** 제목 옆 작은 알약 (예: "12건") */
  badge?: string;
}

/**
 * 섹션 제목.
 *
 * 레퍼런스 테마처럼 회색 배경 위에 제목 블록이 한 단 떠 보이게 잡는다.
 * 섹션마다 제목 모양이 다르면 한 페이지가 아니라 짜깁기로 보인다.
 */
export default function SectionTitle({ theme, label, title, desc, badge }: Props) {
  return (
    <div style={{ padding: "0 16px 22px", textAlign: "center" }}>
      {label && (
        <span
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "3px",
            color: theme.primary,
            marginBottom: 10,
          }}
        >
          {label}
        </span>
      )}

      <h2
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          margin: 0,
          fontSize: 25,
          fontWeight: 900,
          color: "#16202b",
          letterSpacing: "-0.8px",
        }}
      >
        {title}
        {badge && (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: theme.primary,
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            {badge}
          </span>
        )}
      </h2>

      <span
        aria-hidden
        style={{ display: "block", width: 42, height: 3, background: theme.primary, margin: "14px auto 0" }}
      />

      {desc && (
        <p style={{ margin: "14px 0 0 0", fontSize: 14.5, color: "#7b8794", fontWeight: 600, wordBreak: "keep-all", whiteSpace: "pre-line", lineHeight: 1.65 }}>
          {desc}
        </p>
      )}
    </div>
  );
}
