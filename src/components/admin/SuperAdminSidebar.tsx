"use client";

import React, { useEffect, useState } from "react";
import type { MenuItem } from "@/components/admin/sections/types";

/**
 * 최고관리자 왼쪽 메뉴 (2026-11-09 사장님 회의 — docs/2026-11-09_superadmin_page_plan.md)
 *
 * 회원 관리자(StudioSidebar)와 같은 남색 글자 메뉴 모양. StudioSidebar 는 앱과 같이 쓰는 파일이라 고치지 않고 따로 둔다.
 * 메뉴를 세 부분(총괄 · 공실뉴스 홍보 · 회원에게 연락)으로 묶어 보여 준다.
 * 메뉴마다 key 가 이름표 — 나중에 직원 권한(항목별·지역별)을 이 key 에 건다.
 */

export type AdminMenuGroup = { title?: string; items: MenuItem[] };

type Props = {
  groups: AdminMenuGroup[];
  bottom: MenuItem[];
  activeMenu: string;
  activeSubmenu?: string;
  onSelect: (key: string, sub?: string) => void;
  onHover?: (key: string) => void;
  badges?: Record<string, number>;
};

const COLLAPSE_KEY = "admin_menu_collapsed";
const NAVY = "#111111"; // 최고관리자 메뉴는 검정 (2026-11-09 사장님) — 회원 관리자는 남색

export default function SuperAdminSidebar({ groups, bottom, activeMenu, activeSubmenu, onSelect, onHover, badges = {} }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let saved = false;
    try { saved = localStorage.getItem(COLLAPSE_KEY) === "1"; } catch {}
    // 브라우저에 기억된 값은 그린 뒤에야 읽을 수 있다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setCollapsed(true);
  }, []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch {}
  };

  const plainBtn: React.CSSProperties = { border: "none", background: "transparent", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontFamily: "inherit" };

  const badge = (n: number) => (n > 0 ? (
    collapsed
      ? <span style={{ position: "absolute", top: 5, right: 10, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#ef4444", color: "#fff", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{n > 99 ? "99+" : n}</span>
      : <span style={{ minWidth: 20, height: 18, padding: "0 6px", borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, flexShrink: 0 }}>{n > 99 ? "99+" : n}</span>
  ) : null);

  const item = (m: MenuItem) => {
    const active = activeMenu === m.key;
    return (
      <li key={m.key}>
        <button
          onClick={() => onSelect(m.key, m.submenus?.[0]?.key)}
          onMouseEnter={() => onHover?.(m.key)}
          className="adm-nav-btn"
          data-active={active ? "1" : undefined}
          title={collapsed ? m.label : undefined}
          style={{
            position: "relative", display: "flex", flexDirection: collapsed ? "column" : "row", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 5 : 10, width: "100%", border: "none", cursor: "pointer", padding: collapsed ? "9px 2px 8px" : "9px 12px", borderRadius: 8, fontFamily: "inherit",
            fontSize: 14, fontWeight: active ? 700 : 500, textAlign: "left",
            color: active ? "#ffffff" : "rgba(255,255,255,0.72)", background: active ? "rgba(255,255,255,0.16)" : "transparent",
          }}
        >
          <span style={{ width: 18, height: 18, display: "block", flexShrink: 0 }}>
            {React.cloneElement(m.icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, { style: { width: 18, height: 18, stroke: active ? "#ffffff" : "rgba(255,255,255,0.72)" } })}
          </span>
          {collapsed
            ? <span style={{ fontSize: 11, lineHeight: 1.25, textAlign: "center", wordBreak: "keep-all", overflowWrap: "anywhere" }}>{m.label}</span>
            : <span style={{ flex: 1, whiteSpace: "nowrap" }}>{m.label}</span>}
          {badge(badges[m.key] || 0)}
        </button>
        {/* 고른 메뉴에 하위 메뉴가 있으면 바로 아래에 펼친다 (예전 막대는 마우스를 올려야 보였다) */}
        {active && !collapsed && m.submenus && (
          <ul style={{ listStyle: "none", margin: "2px 0 4px", padding: 0 }}>
            {m.submenus.map((s) => {
              const on = activeSubmenu === s.key;
              return (
                <li key={s.key}>
                  <button onClick={() => onSelect(m.key, s.key)} className="adm-nav-btn" data-active={on ? "1" : undefined}
                    style={{ display: "block", width: "100%", border: "none", cursor: "pointer", padding: "7px 12px 7px 40px", borderRadius: 8, fontFamily: "inherit", fontSize: 13, textAlign: "left",
                      fontWeight: on ? 700 : 500, color: on ? "#fff" : "rgba(255,255,255,0.6)", background: on ? "rgba(255,255,255,0.10)" : "transparent" }}>
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside style={{ width: collapsed ? 80 : 220, background: NAVY, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)", flexShrink: 0, transition: "width 0.18s ease" }}>
      <style>{`.adm-nav-btn:not([data-active]):hover{background:rgba(255,255,255,0.10)!important;color:#fff!important}`}</style>

      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", padding: collapsed ? 0 : "0 10px 0 18px", borderBottom: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}>
        {!collapsed && (
          <div onClick={() => onSelect("dashboard")} title="홈" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <img src="/new_logo.png" alt="공실뉴스" title="공실뉴스 사이트로" onClick={(e) => { e.stopPropagation(); window.location.href = "/"; }}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>공실뉴스</div>
          </div>
        )}
        <button onClick={toggle} title={collapsed ? "메뉴 펼치기" : "메뉴 접기"} className="adm-nav-btn"
          style={{ ...plainBtn, width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="3" /><line x1="9" y1="4" x2="9" y2="20" />
            {!collapsed && <rect x="3.9" y="4.9" width="4.2" height="14.2" rx="1.6" fill="currentColor" stroke="none" />}
          </svg>
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "12px 8px" : "12px 10px", scrollbarWidth: "none" as const }}>
        {groups.map((g, i) => (
          <div key={g.title || i} style={{ marginTop: i === 0 ? 0 : 14 }}>
            {g.title && (collapsed
              ? <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "0 6px 8px" }} />
              : <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "1px", padding: "0 12px 6px" }}>{g.title}</div>)}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              {g.items.map(item)}
            </ul>
          </div>
        ))}
      </nav>

      <div style={{ padding: collapsed ? "10px 8px 14px" : "10px 10px 14px", borderTop: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>{bottom.map(item)}</ul>
      </div>
    </aside>
  );
}
