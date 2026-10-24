"use client";

import React from "react";

/**
 * 기다리는 동안 보이는 것 — 뉴스·SNS발행 공용 (2026-10-24 사장님)
 *  - BusyDots: 글 끝 점이 하나씩 늘어나는 "…"
 *  - LoadingCover: 그 칸 위에 흰 막을 덮고 곤색 점 세 개 · 제목... · 지금 단계. 감싼 칸은 position: relative 여야 한다
 */
type Theme = { textSecondary: string; darkMode?: boolean };

export function BusyDots() {
  return (
    <span aria-hidden="true" style={{ display: "inline-block", width: "1.2em", textAlign: "left" }}>
      <style>{`@keyframes gsDot{0%,15%{opacity:0}35%,100%{opacity:1}}.gs-dot i{font-style:normal;opacity:0;animation:gsDot 1.5s infinite}.gs-dot i:nth-child(2){animation-delay:.25s}.gs-dot i:nth-child(3){animation-delay:.5s}`}</style>
      <span className="gs-dot"><i>.</i><i>.</i><i>.</i></span>
    </span>
  );
}

export function LoadingCover({ theme, title, detail = "" }: { theme: Theme; title: string; detail?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5, borderRadius: 14, background: theme.darkMode ? "rgba(17,24,39,0.88)" : "rgba(255,255,255,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "wait", textAlign: "center", padding: 16 }}>
      {/* 곤색 점 세 개가 차례로 커졌다 작아진다 (로고 대신 깔끔하게 — 사장님) */}
      <style>{`@keyframes gsBounce{0%,80%,100%{transform:scale(.55);opacity:.35}40%{transform:scale(1);opacity:1}}`}</style>
      <div style={{ display: "flex", gap: 10 }}>
        {[0, 0.15, 0.3].map((d) => (
          <span key={d} style={{ width: 14, height: 14, borderRadius: 7, background: theme.darkMode ? "#93c5fd" : "#1a3a6b", animation: `gsBounce 1.2s ${d}s infinite ease-in-out` }} />
        ))}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: theme.darkMode ? "#ffffff" : "#1a3a6b" }}>{title}<BusyDots /></div>
      {detail && <div style={{ fontSize: 13, color: theme.textSecondary }}>{detail}</div>}
    </div>
  );
}
