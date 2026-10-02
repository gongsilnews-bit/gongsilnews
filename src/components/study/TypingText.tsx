"use client";

import React, { useEffect, useState } from "react";

/**
 * 글자를 한 자씩 타이핑하듯 보여 준다.
 * 다 친 문장 자리를 미리 (보이지 않게) 잡아 두어 타이핑 중에 줄이 밀리지 않는다.
 * 움직임 줄이기 설정을 켠 사용자에게는 문장을 바로 다 보여 준다.
 */
export default function TypingText({
  text,
  delay = 0,
  speed = 55,
  style,
}: {
  text: string;
  /** 타이핑을 시작하기 전 기다리는 시간(ms) */
  delay?: number;
  /** 한 글자당 시간(ms) */
  speed?: number;
  style?: React.CSSProperties;
}) {
  const [count, setCount] = useState(0);
  const done = count >= text.length;

  useEffect(() => {
    const chars = text.length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setCount(chars), 0);
      return () => window.clearTimeout(t);
    }
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setCount((c) => {
          if (c + 1 >= chars) window.clearInterval(interval);
          return Math.min(c + 1, chars);
        });
      }, speed);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [text, delay, speed]);

  return (
    <span style={{ position: "relative", display: "inline-block", ...style }}>
      {/* 화면 낭독기용 전체 문장 */}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{text}</span>
      {/* 자리 잡기용 전체 문장 (보이지 않음) */}
      <span aria-hidden="true" style={{ visibility: "hidden" }}>{text}</span>
      <span aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        {text.slice(0, count)}
        {!done && <span className="typing-caret">|</span>}
      </span>
      <style>{`
        .typing-caret { margin-left: 2px; font-weight: 400; animation: typingCaret 0.8s steps(1) infinite; }
        @keyframes typingCaret { 50% { opacity: 0; } }
      `}</style>
    </span>
  );
}
