"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { MenuItem } from "@/components/admin/sections/types";
import { useStudioTheme } from "@/components/admin/studio-video/ui";

/**
 * 공실마케팅 텍스트 메뉴 (중개사 관리자 /realty_admin)
 *
 * 좁은 아이콘 막대 대신, 작은 아이콘 옆에 글씨를 둔 넓은 메뉴.
 * 자주 쓰는 업무 메뉴만 위에 두고 나머지는 [더보기]에 접는다.
 * 웹과 앱이 같은 메뉴를 쓴다 (realty_admin 의 STUDIO_MENU_ON_WEB).
 * - «/» 버튼으로 아이콘만 보이게 접고 편다 (이 기기에 기억).
 * - [메뉴 편집]으로 업무·더보기와 순서를 회원이 바꾼다 (realtyMenu.tsx).
 */

/** 공실마케팅 앱 안에서 열렸는지. 앱 창의 브라우저 정보에 gongsil-studio/버전 이 들어 있다. */
const noSubscribe = () => () => {};
export function useStudioApp(): { isApp: boolean; version: string | null } {
  // 서버에서 그릴 때는 빈 값 → 브라우저에서만 판정 (화면 어긋남 방지)
  const ua = useSyncExternalStore(noSubscribe, () => navigator.userAgent, () => "");
  // 설치판은 앱 이름이 한글(공실마케팅)로 들어가므로 Electron 표시로도 판정한다
  const m = ua.match(/(?:gongsil-studio|GongsilStudio|공실마케팅)\/([\d.]+)/i);
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
  /** 영상 편집처럼 화면을 넓게 쓸 때 — 메뉴 줄을 통째로 숨긴다 (다시 보이기는 그 화면의 [»]) */
  hidden?: boolean;
  onHide?: () => void;
};

const COLLAPSE_KEY = "realty_menu_collapsed";

/* 메뉴 오른쪽 파일 표시 — 그 메뉴가 만드는 파일 (2026-10-23 사장님). 파일 아이콘(build/*.ico)과 같은 색·픽토그램을 글자+동그라미로 */
// color = 동그라미(파일 아이콘과 같은 색) · text = 남색 메뉴 바탕에서 잘 보이게 한 단계 밝은 글자색
const FILE_BADGE: Record<string, { text: string; color: string; ink: string; glyph: React.ReactNode }> = {
  gsm: { text: "GSM", color: "#1F9D6B", ink: "#4ADE9B", glyph: <><path d="M7 4h7l4 4v12H7z" /><path d="M10 16v-2M13 16v-4M16 16v-6" /></> }, // 그래프 보고서
  gsn: { text: "GSN", color: "#2F6FED", ink: "#7DB0FF", glyph: <><rect x="5" y="6" width="14" height="12" rx="1.5" /><path d="M8 10h8M8 13h8M8 16h5" /></> }, // 신문
  gss: { text: "GSS", color: "#F5A623", ink: "#FBC04A", glyph: <><path d="M5 10h14v9H5z" /><path d="M5 10l13-4 1 3" /><path d="M9 9l-1-3M13 8l-1-3" /></> }, // 필름 딱따기
  psd: { text: "PSD", color: "#7C4DFF", ink: "#B39BFF", glyph: <><path d="M12 5l7 3.5-7 3.5-7-3.5z" /><path d="M5 12l7 3.5 7-3.5" /><path d="M5 15.5l7 3.5 7-3.5" /></> }, // 레이어
};
function FileBadge({ kind }: { kind: string }) {
  const b = FILE_BADGE[kind];
  if (!b) return null;
  return (
    <span title={`.${kind} 파일`} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3, color: b.ink, lineHeight: 1 }}>{b.text}</span>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: b.color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{b.glyph}</svg>
      </span>
    </span>
  );
}

export default function StudioSidebar({ main, more, settings, activeMenu, onSelect, onHover, onEditMenu, background, isApp, appVersion, badges = {}, autoCollapse = false, hidden = false, onHide }: Props) {
  const [savedCollapsed, setCollapsed] = useState(false);
  // 화면 모드(밝은/어두운) — 앱 전체 하나 (이미지제작·동영상제작·관리 화면 같이, 2026-10-23 사장님)
  const [studioTheme, setStudioTheme] = useStudioTheme(false); // 동영상제작·이미지제작 하나로
  // 관리 화면(그 밖 메뉴) 모드 — 기본 밝게, 따로 기억
  const [adminTheme, setAdminThemeS] = useState<"light" | "dark">("light");
  useEffect(() => {
    const load = () => { try { setAdminThemeS(localStorage.getItem(`gs-admin-theme:${activeMenu}`) === "dark" ? "dark" : "light"); } catch {} };
    load();
    window.addEventListener("gs-admin-theme-change", load);
    return () => window.removeEventListener("gs-admin-theme-change", load);
  }, [activeMenu]);
  const studioArea = activeMenu === "video" || activeMenu === "photo";
  const theme = studioArea ? studioTheme : adminTheme;
  const setTheme = (t: "light" | "dark") => {
    if (studioArea) return setStudioTheme(t);
    try { localStorage.setItem(`gs-admin-theme:${activeMenu}`, t); } catch {} // 메뉴마다 따로
    window.dispatchEvent(new Event("gs-admin-theme-change"));
  };
  const [hasAi, setHasAi] = useState(false);
  const [hasSnap, setHasSnap] = useState(false);
  useEffect(() => {
    const gs = (window as unknown as { gongsilStudio?: { openAiConnect?: () => void; snap?: unknown } }).gongsilStudio;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasAi(Boolean(gs?.openAiConnect));
    setHasSnap(Boolean(gs?.snap));
  }, []);
  // 공실마케팅 저장 위치 (문서\공실마케팅 · D 드라이브 · 외장하드) — 앱에서만
  type StorageInfo = { root: string; isDefault: boolean; offline: boolean; chosen: string; freeGB: number; oneDrive: boolean };
  type StorageBridge = { get: () => Promise<StorageInfo>; choose: () => Promise<unknown>; open: () => Promise<unknown> };
  const storageBridge = () => (typeof window !== "undefined" ? (window as unknown as { gongsilStudio?: { storage?: StorageBridge } }).gongsilStudio?.storage : undefined);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  useEffect(() => {
    const load = () => { storageBridge()?.get().then(setStorage).catch(() => {}); };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);
  const openAi = () => (window as unknown as { gongsilStudio?: { openAiConnect?: () => void } }).gongsilStudio?.openAiConnect?.();
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
  const width = collapsed ? 80 : 220; // 접으면 캔바처럼 아이콘 밑에 작은 이름 (2026-10-27 사장님)

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
            position: "relative", display: "flex", flexDirection: collapsed ? "column" : "row", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: collapsed ? 5 : 10, width: "100%", border: "none", cursor: "pointer",
            padding: collapsed ? "9px 2px 8px" : small ? "8px 12px 8px 40px" : "10px 12px", borderRadius: 8, fontFamily: "inherit",
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
          {collapsed
            ? <span style={{ fontSize: 11, lineHeight: 1.25, textAlign: "center", wordBreak: "keep-all", overflowWrap: "anywhere" }}>{m.label}</span>
            : <span style={{ flex: 1, whiteSpace: "nowrap" }}>{m.label}</span>}
          {badges[m.key] && badges[m.key].startsWith("dev:") ? (
            // [개발중] — 최고관리자에게만 보이는 미완성 메뉴 (2026-10-23 사장님)
            !collapsed && <span style={{ flexShrink: 0, padding: "2px 6px", borderRadius: 4, background: "#64748b", color: "#fff", fontSize: 10, fontWeight: 800, lineHeight: 1.3 }}>{badges[m.key].slice(4)}</span>
          ) : badges[m.key] && badges[m.key].startsWith("file:") ? (
            // 파일 표시 (GSN·GSM·GSS·PSD — 글자 + 동그라미 픽토그램). 접힌 메뉴에서는 숨긴다
            !collapsed && <FileBadge kind={badges[m.key].slice(5)} />
          ) : badges[m.key] &&
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

  if (hidden) return null;
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
          style={{ ...plainBtn, width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* 캔바처럼 창 모양 단추 — 왼쪽 칸이 메뉴 */}
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="3" /><line x1="9" y1="4" x2="9" y2="20" />
            {!collapsed && <rect x="3.9" y="4.9" width="4.2" height="14.2" rx="1.6" fill="currentColor" stroke="none" />}
          </svg>
        </button>
      </div>

      {onHide && (
        <button onClick={onHide} title="메뉴 숨기기 — 편집 화면을 넓게 (다시 보려면 편집 화면 맨 위 [»])" className="studio-nav-btn"
          style={{ ...plainBtn, height: 36, margin: collapsed ? "8px 8px 0" : "8px 10px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1px dashed rgba(255,255,255,0.25)" }}>
          <span style={{ fontSize: 16 }}>⇤</span>{!collapsed && "메뉴 숨기기"}
        </button>
      )}
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
            {collapsed ? <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, letterSpacing: 0 }}><span style={{ fontSize: 16, lineHeight: 1 }}>···</span>더보기</span> : "더보기"}
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

      {/* 화면캡처·녹화 (2026-10-24 사장님) — 앱에서만. 누르면 스튜디오 창이 내려가고 화면 오른쪽에 막대 */}
      {hasSnap && (
        <div style={{ padding: collapsed ? "0 8px 6px" : "0 10px 6px", flexShrink: 0 }}>
          <button onClick={() => void (window as unknown as { gongsilStudio?: { snap?: { open: () => Promise<unknown> } } }).gongsilStudio?.snap?.open()} className="studio-nav-btn" title="화면캡처·녹화 — 영역·전체·스크롤 캡처, 전체·영역 녹화 (찍으면 바로 Ctrl+V)"
            style={{ ...plainBtn, width: "100%", height: collapsed ? 50 : 36, borderRadius: 8, fontSize: collapsed ? 11 : 13, fontWeight: 700, display: "flex", flexDirection: collapsed ? "column" : "row", alignItems: "center", justifyContent: "center", gap: collapsed ? 3 : 6, border: "1px solid rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><circle cx="12" cy="12" r="3" /></svg>
            {collapsed ? "캡처·녹화" : "화면캡처 · 녹화"}
          </button>
        </div>
      )}
      {/* 정보설정 구분선 위 — [화면 모드] [AI 설정] (2026-10-23 사장님) */}
      <div style={{ display: "flex", flexDirection: collapsed ? "column" : "row", gap: 6, padding: collapsed ? "0 8px 10px" : "0 10px 10px", flexShrink: 0 }}>
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="studio-nav-btn" title={theme === "light" ? "어두운 화면으로" : "밝은 화면으로"}
          style={{ ...plainBtn, flex: 1, height: 34, borderRadius: 8, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "1px solid rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 14 }}>{theme === "light" ? "🌙" : "☀"}</span>{!collapsed && (theme === "light" ? "어두운 화면" : "밝은 화면")}
        </button>
        {hasAi && (
          <button onClick={openAi} className="studio-nav-btn" title="AI 설정 (내 AI 연결)"
            style={{ ...plainBtn, flex: 1, height: 34, borderRadius: 8, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "1px solid rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>
            {collapsed ? <span style={{ fontSize: 11, fontWeight: 900 }}>AI</span> : "AI 설정"}
          </button>
        )}
      </div>
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
                <div style={{ marginTop: 3, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>공실마케팅 v{appVersion}</div>
                {storage && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700 }}>저장 위치</span>
                      <button onClick={() => { void storageBridge()?.choose().then(() => storageBridge()?.get().then(setStorage)); }} title="공실마케팅 폴더를 D 드라이브·외장하드 등으로 옮겨요"
                        style={{ ...plainBtn, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>바꾸기</button>
                    </div>
                    <button onClick={() => { void storageBridge()?.open(); }} title={`${storage.root} — 눌러서 폴더 열기`}
                      style={{ ...plainBtn, display: "block", width: "100%", marginTop: 3, padding: 0, textAlign: "left", fontSize: 11, color: storage.offline ? "#fbbf24" : "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "rtl" }}>
                      <bdi>{storage.root}</bdi>
                    </button>
                    {storage.offline && <div style={{ marginTop: 3, fontSize: 10.5, color: "#fbbf24", lineHeight: 1.4 }}>외장하드가 없어 이번만 문서 폴더에 저장해요</div>}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>공실마케팅</div>
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
