"use client";

import React, { useState, useSyncExternalStore } from "react";
import { MenuItem } from "@/components/admin/sections/types";

/**
 * 공실뉴스 스튜디오 텍스트 메뉴 (중개사 관리자 /realty_admin)
 *
 * 좁은 아이콘 막대 대신, 작은 아이콘 옆에 글씨를 둔 넓은 메뉴.
 * 자주 쓰는 업무 메뉴만 위에 두고 나머지는 [더보기]에 접는다.
 * 웹과 앱이 같은 메뉴를 쓴다 (realty_admin 의 STUDIO_MENU_ON_WEB).
 */

/** 공실뉴스 스튜디오 앱 안에서 열렸는지. 앱 창의 브라우저 정보에 gongsil-studio/버전 이 들어 있다. */
const noSubscribe = () => () => {};
export function useStudioApp(): { isApp: boolean; version: string | null } {
  // 서버에서 그릴 때는 빈 값 → 브라우저에서만 판정 (화면 어긋남 방지)
  const ua = useSyncExternalStore(noSubscribe, () => navigator.userAgent, () => "");
  // 설치판은 앱 이름이 한글(공실뉴스 스튜디오)로 들어가므로 Electron 표시로도 판정한다
  const m = ua.match(/(?:gongsil-studio|GongsilStudio|공실뉴스 스튜디오)\/([\d.]+)/i);
  const isApp = !!m || /Electron\//.test(ua);
  const version = m ? m[1] : ua.match(/\/([\d.]+) Chrome\//)?.[1] ?? null;
  return { isApp, version };
}

type Props = {
  main: MenuItem[];
  more: MenuItem[];
  settings: MenuItem;
  activeMenu: string;
  onSelect: (key: string) => void;
  onHover: (key: string) => void;
  background: string;
  isApp: boolean;
  appVersion: string | null;
  badges?: Record<string, string>;
};

export default function StudioSidebar({ main, more, settings, activeMenu, onSelect, onHover, background, isApp, appVersion, badges = {} }: Props) {
  // 더보기 안의 메뉴를 보고 있으면 늘 펼쳐 둔다
  const moreActive = more.some((m) => m.key === activeMenu);
  const [moreToggled, setMoreToggled] = useState(false);
  const moreOpen = moreActive || moreToggled;

  const item = (m: MenuItem, small = false) => {
    const active = activeMenu === m.key;
    return (
      <li key={m.key}>
        <button
          onClick={() => onSelect(m.key)}
          onMouseEnter={() => onHover(m.key)}
          className="studio-nav-btn"
          data-active={active ? "1" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", cursor: "pointer",
            padding: small ? "8px 12px 8px 40px" : "10px 12px", borderRadius: 8, fontFamily: "inherit",
            fontSize: small ? 13 : 14, fontWeight: active ? 700 : 500, textAlign: "left",
            color: active ? "#ffffff" : "rgba(255,255,255,0.72)",
            background: active ? "rgba(255,255,255,0.16)" : "transparent",
          }}
        >
          {!small && (
            <span style={{ width: 18, height: 18, display: "block", flexShrink: 0 }}>
              {React.cloneElement(m.icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, { style: { width: 18, height: 18, stroke: active ? "#ffffff" : "rgba(255,255,255,0.72)" } })}
            </span>
          )}
          <span style={{ flex: 1, whiteSpace: "nowrap" }}>{m.label}</span>
          {badges[m.key] && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#fbbf24", color: "#1a3a6b" }}>{badges[m.key]}</span>
          )}
        </button>
      </li>
    );
  };

  return (
    <aside style={{ width: 220, background, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)", flexShrink: 0 }}>
      <style>{`.studio-nav-btn:not([data-active]):hover{background:rgba(255,255,255,0.10)!important;color:#fff!important}`}</style>

      <div
        onClick={() => onSelect("dashboard")}
        style={{ height: 64, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", borderBottom: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 }}
      >
        <img src="/new_logo.png" alt="공실뉴스" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px" }}>공실뉴스</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, letterSpacing: "1.5px" }}>STUDIO</div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "14px 10px", scrollbarWidth: "none" as const }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "1px", padding: "0 12px 8px" }}>업무</div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {main.map((m) => item(m))}
        </ul>

        <button
          onClick={() => setMoreToggled(!moreOpen)}
          className="studio-nav-btn"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: 18,
            padding: "8px 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontFamily: "inherit",
            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "1px",
          }}
        >
          더보기
          <span style={{ fontSize: 10, transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
        </button>
        {moreOpen && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            {more.map((m) => item(m, true))}
          </ul>
        )}
      </nav>

      <div style={{ padding: "10px 10px 14px", borderTop: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{item(settings)}</ul>
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.10)" }}>
          {isApp ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 12, fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 0 3px rgba(52,211,153,0.25)" }} />
                이 PC 연결됨
              </div>
              <div style={{ marginTop: 3, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>공실뉴스 스튜디오 v{appVersion}</div>
            </>
          ) : (
            <>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>공실뉴스 스튜디오</div>
              <div style={{ marginTop: 3, color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 1.5 }}>PC 앱에서 SNS 자동 발행 · 영상 제작</div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
