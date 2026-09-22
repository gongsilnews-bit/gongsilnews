"use client";

import React, { useEffect, useRef } from "react";
import type { Theme } from "../theme";

export interface NavItem {
  id: string;
  label: string;
}

interface Props {
  officeName: string;
  logoUrl?: string | null;
  theme: Theme;
  items: NavItem[];
  activeId: string;
  onJump: (id: string) => void;
  /** 편집기 미리보기 안에서는 화면에 붙이지 않는다 */
  preview?: boolean;
}

/**
 * 상단 바 — 로고 줄 + 카테고리 칩 줄, 두 줄 고정.
 *
 * 폰에서 원페이지는 "지금 어디쯤인지"를 잃기 쉽다. 칩을 항상 띄워 두고 보고 있는
 * 섹션에 밑줄을 넣으면, 열어보지 않아도 페이지에 뭐가 있는지까지 같이 알려준다.
 * 햄버거로 감추면 탭이 한 번 더 들고 대부분은 열어보지 않는다.
 */
export default function SiteHeader({ officeName, logoUrl, theme, items, activeId, onJump, preview }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  // 보고 있는 섹션의 칩이 화면 밖에 있으면 칩 줄만 옆으로 민다.
  // scrollIntoView는 가로 메뉴의 스크롤 조상뿐 아니라 문서의 세로 스크롤도
  // 함께 움직일 수 있으므로 메뉴 바의 scrollLeft만 직접 조정한다.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const chip = bar.querySelector<HTMLElement>(`[data-chip="${activeId}"]`);
    if (!chip) return;

    const barRect = bar.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    const nextLeft =
      bar.scrollLeft +
      chipRect.left -
      barRect.left -
      (bar.clientWidth - chipRect.width) / 2;

    bar.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
  }, [activeId]);

  return (
    <header
      style={{
        position: preview ? "relative" : "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "saturate(180%) blur(8px)",
        WebkitBackdropFilter: "saturate(180%) blur(8px)",
        borderBottom: "1px solid #eef1f4",
      }}
    >
      {/* 로고 줄 */}
      <div
        style={{
          height: 56,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={() => onJump("top")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={officeName} style={{ height: 28, objectFit: "contain" }} />
          ) : null}
          <span
            style={{
              fontSize: 17,
              fontWeight: 900,
              color: theme.dark,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: "-0.4px",
            }}
          >
            {officeName}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onJump("intake")}
          style={{
            flexShrink: 0,
            padding: "9px 16px",
            background: theme.primary,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          물건 접수
        </button>
      </div>

      {/* 카테고리 칩 줄 */}
      <div
        ref={barRef}
        className="gs-scroll-x"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 12px",
          height: 46,
          maxWidth: 1100,
          margin: "0 auto",
          borderTop: "1px solid #f4f6f8",
        }}
      >
        {items.map((it) => {
          const on = activeId === it.id;
          return (
            <button
              key={it.id}
              type="button"
              data-chip={it.id}
              onClick={() => onJump(it.id)}
              style={{
                position: "relative",
                flexShrink: 0,
                padding: "0 14px",
                height: 45,
                background: "none",
                border: "none",
                fontSize: 15,
                fontWeight: on ? 900 : 600,
                color: on ? theme.primary : "#8b95a1",
                cursor: "pointer",
                whiteSpace: "nowrap",
                letterSpacing: "-0.3px",
              }}
            >
              {it.label}
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  bottom: 0,
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  background: on ? theme.primary : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>
    </header>
  );
}
