"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { MenuItem } from "@/components/admin/sections/types";

/**
 * 공실뉴스 스튜디오 텍스트 메뉴 (중개사 관리자 /realty_admin)
 *
 * 좁은 아이콘 막대 대신, 작은 아이콘 옆에 글씨를 둔 넓은 메뉴.
 * 자주 쓰는 업무 메뉴만 위에 두고 나머지는 [더보기]에 접는다.
 * 웹과 앱이 같은 메뉴를 쓴다 (realty_admin 의 STUDIO_MENU_ON_WEB).
 * - «/» 버튼으로 아이콘만 보이게 접고 편다 (이 기기에 기억).
 * - [메뉴 편집]으로 업무·더보기와 순서를 회원이 바꾼다 (realtyMenu.tsx).
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
  onEditMenu?: () => void;
  background: string;
  isApp: boolean;
  appVersion: string | null;
  badges?: Record<string, string>;
  /** 넓은 작업 화면(공실마케팅의 매물보고서 등)일 때 잠시 아이콘만 남게 접는다 — 기억된 설정은 바꾸지 않는다 */
  autoCollapse?: boolean;
};

const COLLAPSE_KEY = "realty_menu_collapsed";

export default function StudioSidebar({ main, more, settings, activeMenu, onSelect, onHover, onEditMenu, background, isApp, appVersion, badges = {}, autoCollapse = false }: Props) {
  const [savedCollapsed, setCollapsed] = useState(false);
  // 자동으로 접힌 동안 [»]를 누르면 그때만 펼친다 (다른 메뉴로 가면 원래 설정으로)
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeek(false);
  }, [autoCollapse]);
  const collapsed = autoCollapse ? !peek : savedCollapsed;
  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {}
    // 브라우저에 기억된 값은 그린 뒤에야 읽을 수 있다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setCollapsed(true);
  }, []);
  const toggle = () => {
    if (autoCollapse) {
      setPeek(!peek);
      return;
    }
    const next = !savedCollapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {}
  };

  // 더보기 안의 메뉴를 보고 있으면 늘 펼쳐 둔다
  const moreActive = more.some((m) => m.key === activeMenu);
  const [moreToggled, setMoreToggled] = useState(false);
  const moreOpen = moreActive || moreToggled;
  const width = collapsed ? 68 : 220;

  const item = (m: MenuItem, small = false) => {
    const active = activeMenu === m.key;
    return (
      <li key={m.key}>
        <button
          onClick={() => onSelect(m.key)}
          onMouseEnter={() => onHover(m.key)}
          className="studio-nav-btn"
          data-active={active ? "1" : undefined}
          title={collapsed ? m.label : undefined}
          style={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, width: "100%", border: "none", cursor: "pointer",
            padding: collapsed ? "11px 0" : small ? "8px 12px 8px 40px" : "10px 12px", borderRadius: 8, fontFamily: "inherit",
            fontSize: small ? 13 : 14, fontWeight: active ? 700 : 500, textAlign: "left",
            color: active ? "#ffffff" : "rgba(255,255,255,0.72)",
            background: active ? "rgba(255,255,255,0.16)" : "transparent",
          }}
        >
          {(!small || collapsed) && (
            <span style={{ width: 18, height: 18, display: "block", flexShrink: 0 }}>
              {React.cloneElement(m.icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, { style: { width: 18, height: 18, stroke: active ? "#ffffff" : "rgba(255,255,255,0.72)" } })}
            </span>
          )}
          {!collapsed && <span style={{ flex: 1, whiteSpace: "nowrap" }}>{m.label}</span>}
          {badges[m.key] &&
            (collapsed ? (
              <span style={{ position: "absolute", top: 7, right: 12, width: 7, height: 7, borderRadius: "50%", background: "#fbbf24" }} />
            ) : (
              <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#fbbf24", color: "#1a3a6b" }}>{badges[m.key]}</span>
            ))}
        </button>
      </li>
    );
  };

  /* 로고 → 공실뉴스 홈을 새 창으로. 앱에서는 앱 창이 아니라 평소 쓰는 크롬으로 연다 */
  const openHome = () => {
    const url = `${window.location.origin}/`;
    const studio = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => Promise<void> } }).gongsilStudio;
    if (isApp && studio?.openInBrowser) studio.openInBrowser(url);
    else window.open(url, "_blank", "noopener");
  };

  const plainBtn: React.CSSProperties = { border: "none", background: "transparent", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontFamily: "inherit" };

  return (
    <aside style={{ width, background, display: "flex", flexDirection: "column", zIndex: 10, boxShadow: "2px 0 8px rgba(0,0,0,0.12)", flexShrink: 0, transition: "width 0.18s ease" }}>
      <style>{`.studio-nav-btn:not([data-active]):hover{background:rgba(255,255,255,0.10)!important;color:#fff!important}`}</style>

      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", padding: collapsed ? 0 : "0 10px 0 18px", borderBottom: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}>
        {!collapsed && (
          <div onClick={openHome} title="공실뉴스 홈 (새 창)" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <img src="/new_logo.png" alt="공실뉴스" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px" }}>공실뉴스</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, letterSpacing: "1.5px" }}>STUDIO</div>
            </div>
          </div>
        )}
        <button onClick={toggle} title={collapsed ? "메뉴 펼치기" : "메뉴 접기"} className="studio-nav-btn"
          style={{ ...plainBtn, width: 34, height: 34, borderRadius: 8, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "14px 8px" : "14px 10px", scrollbarWidth: "none" as const }}>
        {!collapsed && <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "1px", padding: "0 12px 8px" }}>업무</div>}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {main.map((m) => item(m))}
        </ul>

        {more.length > 0 && (
          <button
            onClick={() => setMoreToggled(!moreOpen)}
            className="studio-nav-btn"
            title={collapsed ? "더보기" : undefined}
            style={{
              ...plainBtn, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", width: "100%", marginTop: 18,
              padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "1px",
            }}
          >
            {collapsed ? "···" : "더보기"}
            {!collapsed && <span style={{ fontSize: 10, transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>}
          </button>
        )}
        {moreOpen && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            {more.map((m) => item(m, true))}
          </ul>
        )}

        {onEditMenu && (
          <button onClick={onEditMenu} className="studio-nav-btn" title="메뉴 편집"
            style={{ ...plainBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 14, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", border: "1px dashed rgba(255,255,255,0.2)" }}>
            ✎{!collapsed && " 메뉴 편집"}
          </button>
        )}
      </nav>

      <div style={{ padding: collapsed ? "10px 8px 14px" : "10px 10px 14px", borderTop: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{item(settings)}</ul>
        {!collapsed && (
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
        )}
        {collapsed && isApp && <div title={`이 PC 연결됨 · v${appVersion}`} style={{ margin: "10px auto 0", width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} />}
      </div>
    </aside>
  );
}
