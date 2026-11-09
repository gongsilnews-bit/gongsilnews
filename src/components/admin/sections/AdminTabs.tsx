"use client";

import React from "react";
import type { AdminTheme } from "./types";

/** 최고관리자 묶음 화면(승인·결제 · 문의) 위쪽 탭 줄 — 2026-11-09 */
export default function AdminTabs({ theme, title, tabs, active, onChange, counts = {} }: {
  theme: AdminTheme;
  title: string;
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
  counts?: Record<string, number | undefined>;
}) {
  const navy = theme.darkMode ? "#93c5fd" : "#1e3a6e";
  return (
    <div style={{ padding: "18px 28px 0", background: theme.bg, flexShrink: 0 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: theme.textPrimary, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${theme.border}`, overflowX: "auto" }}>
        {tabs.map((t) => {
          const on = t.key === active;
          const n = counts[t.key];
          return (
            <button key={t.key} onClick={() => onChange(t.key)} data-keep-fill
              style={{ border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", padding: "10px 16px", marginBottom: -1, whiteSpace: "nowrap",
                fontSize: 14.5, fontWeight: on ? 800 : 600, color: on ? navy : theme.textSecondary, borderBottom: `3px solid ${on ? navy : "transparent"}`,
                display: "flex", alignItems: "center", gap: 6 }}>
              {t.label}
              {n != null && n > 0 && <span style={{ minWidth: 20, height: 18, padding: "0 6px", borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n > 99 ? "99+" : n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
