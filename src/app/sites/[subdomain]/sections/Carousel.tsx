"use client";

import React, { useRef, useState } from "react";
import type { Theme } from "../theme";

interface Props {
  theme: Theme;
  count: number;
  children: React.ReactNode;
}

/**
 * 옆으로 미는 카드 줄.
 *
 * 폰에서 카드를 세로로 쌓으면 매물 12건에 화면 열두 판이 나오고, 그 아래 있는
 * 접수 폼까지 아무도 못 내려온다. 옆으로 밀게 하면 섹션 하나가 화면 한 판으로 끝난다.
 */
export default function Carousel({ theme, count, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.offsetWidth + 12;
    setIdx(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  };

  return (
    <>
      <div
        ref={ref}
        onScroll={onScroll}
        className="gs-scroll-x"
        style={{
          display: "flex",
          gap: 12,
          padding: "2px 16px 4px",
          scrollSnapType: "x mandatory",
          scrollPaddingLeft: 16,
        }}
      >
        {children}
        {/* 마지막 카드가 화면 끝에 딱 붙지 않도록 여백을 하나 더 둔다 */}
        <span aria-hidden style={{ flex: "0 0 4px" }} />
      </div>

      {count > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === idx ? 18 : 6,
                height: 6,
                borderRadius: 999,
                background: i === idx ? theme.primary : "#dbe1e8",
                transition: "width .2s",
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
