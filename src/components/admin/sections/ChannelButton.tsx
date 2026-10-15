"use client";

import React from "react";

/**
 * 채널 열기 버튼 — 채널마다 알아보기 쉬운 아이콘과 색 (SNS뉴스발행)
 * 인스타그램 그라데이션 · 페이스북 파랑 · 스레드 검정 · 네이버 블로그 초록
 */

const STYLE: Record<string, { bg: string; icon: React.ReactNode }> = {
  instagram: {
    bg: "linear-gradient(45deg, #f58529 0%, #dd2a7b 50%, #8134af 100%)",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  facebook: {
    bg: "#1877F2",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.4H8v3h2.6V21h2.9z" />
      </svg>
    ),
  },
  threads: {
    bg: "#000000",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M16.5 11.2c-.3-2.5-2-3.7-4.3-3.7-2 0-3.4 1-3.9 2.6" />
        <path d="M16.6 11.4c-3.6-.6-6.8.1-6.7 2.4.1 1.6 1.7 2.3 3.2 2.2 2.1-.1 3.4-1.6 3.5-4.6 0-4.4-2-7.4-6.4-7.4C6.3 4 4 7.3 4 12s2.3 8 6.7 8c2.8 0 4.7-1 5.9-2.6" />
      </svg>
    ),
  },
  blog: {
    bg: "#03C75A",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 3h5.6l4.8 7.6V3H20v18h-5.6l-4.8-7.6V21H4z" />
      </svg>
    ),
  },
};

export default function ChannelButton({ channel, label, onClick, disabled = false }: { channel: string; label: string; onClick: () => void; disabled?: boolean }) {
  const st = STYLE[channel] || STYLE.blog;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", border: 0, borderRadius: 8,
        background: st.bg, color: "#fff", fontSize: 14, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1,
        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
      }}>
      {st.icon}
      {label}
    </button>
  );
}
