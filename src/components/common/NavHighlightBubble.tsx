"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * GNB 핵심 메뉴(공실열람·공실스터디) 위에 가끔 떠오르는 말풍선
 *
 * 항상 떠 있으면 배너처럼 보여서 오히려 안 읽힌다. 한 번에 하나만, 잠깐
 * 나타났다 사라지고, 한 바퀴 돌면 한참 쉬었다가 다시 돈다.
 *
 * - 탭이 가려져 있으면 돌지 않는다 (안 보는 화면에서 순번만 소진되지 않도록)
 * - prefers-reduced-motion 이면 애니메이션 없이 조용히 바뀐다
 */

export type BubbleKey = "map" | "gongsil" | "study";

type Slide = { key: BubbleKey; text: (c: NavCounts) => string };

/** 헤더는 전 페이지에 있으므로 수치는 레이아웃(서버)에서 한 번 받아 내려온다 */
export type NavCounts = { auction: number; vacancy: number; lecture: number };

/** 순서대로 한 바퀴 돈다 (메뉴 왼쪽 → 오른쪽으로 훑고 지나가는 순서) */
const SLIDES: Slide[] = [
  { key: "map", text: () => "지도뉴스검색" },
  { key: "gongsil", text: c => `실시간 경공매 ${c.auction.toLocaleString("ko-KR")}건` },
  { key: "study", text: c => (c.lecture > 0 ? `무료 특강 ${c.lecture}개 수강중` : "무료 특강 열려 있어요") },
  { key: "gongsil", text: () => "공실 3건 무료 등록" },
];

const SHOW_MS = 3800;   // 한 말풍선이 떠 있는 시간
const GAP_MS = 900;     // 다음 말풍선까지 쉬는 시간
const REST_MS = 20000;  // 한 바퀴 다 돌고 쉬는 시간
const FIRST_MS = 2500;  // 페이지가 자리잡은 뒤 첫 등장

/** 말풍선 및 카테고리 형광 헤드라인 테마 */
export const BUBBLE_THEMES: Record<BubbleKey, {
  bg: string;
  text: string;
  softBg: string; // 단색 옅은 뒷 컬러
}> = {
  // 1. 공실스터디: 초록 말풍선 + 옅은 단색 초록
  study: {
    bg: "#059669",
    text: "#ffffff",
    softBg: "rgba(16, 185, 129, 0.24)",
  },
  // 2. 공실열람: 파랑 말풍선 + 옅은 단색 파랑
  gongsil: {
    bg: "#1d68ed",
    text: "#ffffff",
    softBg: "rgba(37, 99, 235, 0.20)",
  },
  // 3. 우리동네: 기존과 동일 오렌지 + 옅은 단색 오렌지
  map: {
    bg: "#ff8e15",
    text: "#ffffff",
    softBg: "rgba(255, 142, 21, 0.24)",
  },
};

/**
 * 메뉴별 흰색 픽토그램
 * 작은 크기(14px)라 선을 굵게(2) 잡고 획 수를 최소로 줄였다.
 */
const ICONS: Record<BubbleKey, React.ReactNode> = {
  // 지도 화살표 (내 위치 방향 표시)
  map: <path d="M3 11 22 2l-9 20-2-9-8-2Z" />,
  // 건물
  gongsil: (
    <>
      <path d="M4 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17" />
      <path d="M13 10h6a1 1 0 0 1 1 1v10" />
      <path d="M3 21h18M8 7.5h1M8 12h1M8 16.5h1" />
    </>
  ),
  // 강의 (칠판/스크린)
  study: (
    <>
      <path d="M3 3h18" />
      <path d="M20 3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V3" />
      <path d="m8 21 4-4 4 4" />
    </>
  ),
};

export type BubbleState = { key: BubbleKey | null; text: string; leaving: boolean };

/** 어느 메뉴에 무슨 문구를 띄울지 정하는 컨트롤러 (헤더에서 한 번만 쓴다) */
export function useNavHighlightBubbles(counts?: NavCounts): BubbleState {
  const [state, setState] = useState<BubbleState>({ key: null, text: "", leaving: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 객체 그대로 의존하면 상위가 리렌더될 때마다 순번이 처음으로 돌아갈 수 있어
  // 숫자만 꺼내서 의존시킨다
  const auction = counts?.auction ?? 0;
  const vacancy = counts?.vacancy ?? 0;
  const lecture = counts?.lecture ?? 0;
  const hasCounts = !!counts;

  useEffect(() => {
    if (!hasCounts) return;
    if (typeof window === "undefined") return;

    // 애니메이션을 원치 않는 사용자에게는 아예 띄우지 않는다
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    const wait = (ms: number) => new Promise<void>(r => { timers.current.push(setTimeout(r, ms)); });

    let alive = true;

    const run = async () => {
      await wait(FIRST_MS);
      while (alive) {
        for (const slide of SLIDES) {
          if (!alive) return;
          // 탭이 가려져 있으면 다시 볼 때까지 순번을 멈춘다
          while (alive && document.visibilityState === "hidden") await wait(1000);
          if (!alive) return;

          setState({ key: slide.key, text: slide.text({ auction, vacancy, lecture }), leaving: false });
          await wait(SHOW_MS);
          if (!alive) return;

          setState(s => ({ ...s, leaving: true }));
          await wait(GAP_MS);
        }
        if (!alive) return;
        setState({ key: null, text: "", leaving: false });
        await wait(REST_MS);
      }
    };

    void run();
    return () => { alive = false; clear(); };
  }, [hasCounts, auction, vacancy, lecture]);

  return state;
}

/** 메뉴 항목 위에 붙는 말풍선 (부모에 position: relative 필요) */
export default function NavHighlightBubble({
  show,
  text,
  leaving,
  disabled,
  icon,
}: {
  show: boolean;
  text: string;
  leaving: boolean;
  /** 압축(스티키) 헤더는 위 여백이 모자라 말풍선이 잘린다 */
  disabled?: boolean;
  /** 앞에 붙일 픽토그램 (메뉴마다 고정) */
  icon?: BubbleKey;
}) {
  if (disabled || !show || !text) return null;

  const theme = BUBBLE_THEMES[icon || "map"] || BUBBLE_THEMES.map;

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          zIndex: 60,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px 7px 12px",
          borderRadius: 999,
          background: theme.bg,
          color: theme.text,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "-0.3px",
          whiteSpace: "nowrap",

          animation: `${leaving ? "navBubbleOut" : "navBubbleIn"} ${leaving ? "0.42s" : "0.5s"} cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        }}
      >
        {/* 아래 메뉴를 가리키는 꼬리 */}
        <span
          style={{
            position: "absolute",
            bottom: -4,
            left: "50%",
            marginLeft: -4,
            width: 8,
            height: 8,
            background: theme.bg,
            transform: "rotate(45deg)",
            borderRadius: 1.5,
          }}
        />

        {icon && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            {ICONS[icon]}
          </svg>
        )}
        {text}
      </div>

      <style>{`
        @keyframes navBubbleIn {
          0%   { opacity: 0; transform: translate(-50%, 8px) scale(0.92); }
          55%  { opacity: 1; transform: translate(-50%, -3px) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes navBubbleOut {
          0%   { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -8px) scale(0.95); }
        }
      `}</style>
    </>
  );
}

/**
 * 카테고리 텍스트 뒤에 옅은 단색으로 은은하게 나타나는 하이라이트 배경 (형광펜 효과)
 */
export function NavCategoryHighlightMarker({
  categoryKey,
  active,
}: {
  categoryKey: BubbleKey;
  active: boolean;
}) {
  const theme = BUBBLE_THEMES[categoryKey] || BUBBLE_THEMES.map;

  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: -4,
        right: -4,
        bottom: 7,
        height: 12,
        borderRadius: 4,
        background: theme.softBg,
        opacity: active ? 1 : 0,
        transform: active ? "scaleX(1)" : "scaleX(0.2)",
        transformOrigin: "center",
        transition: "opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
