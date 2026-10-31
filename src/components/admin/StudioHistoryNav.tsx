"use client";

// 공실마케팅 뒤로·앞으로 (2026-10-28 사장님) — 앱엔 주소창·뒤로가기가 없다
// 메뉴를 옮길 때마다 ?menu=… 로 기록이 남으니(selectMenu) 그 기록을 따라간다.
// [←][→] 단추 · Alt+←/→ · 마우스 옆 단추(엄지) 모두 같은 일.
// 이 화면(/realty_admin) 안에서만 오간다 — 로그인 화면 같은 바깥으로는 나가지 않는다.
import { useEffect, useState } from "react";

type NavEntry = { url: string | null };
type NavApi = {
  entries: () => NavEntry[];
  currentEntry: { index: number } | null;
  addEventListener: (t: string, fn: () => void) => void;
  removeEventListener: (t: string, fn: () => void) => void;
};
const nav = () => (typeof window === "undefined" ? undefined : (window as unknown as { navigation?: NavApi }).navigation);

// 옆 기록이 같은 화면(경로)일 때만 갈 수 있다
function canGo(step: -1 | 1) {
  const n = nav();
  if (!n || !n.currentEntry) return step === -1 ? window.history.length > 1 : true;
  const e = n.entries()[n.currentEntry.index + step];
  if (!e?.url) return false;
  try { return new URL(e.url).pathname === window.location.pathname; } catch { return false; }
}

function go(step: -1 | 1) {
  if (!canGo(step)) return;
  const move = () => (step === -1 ? window.history.back() : window.history.forward());
  // 동영상 편집에 저장 안 한 내용이 있으면 먼저 묻는다 (메뉴 옮길 때와 같게 — selectMenu)
  const guard = (window as unknown as { __gsvGuard?: (next: () => void) => void }).__gsvGuard;
  if (guard) guard(move);
  else move();
}

// 새로 고침 — 동영상 편집에 저장 안 한 내용이 있으면 먼저 묻는다
function reload() {
  const guard = (window as unknown as { __gsvGuard?: (next: () => void) => void }).__gsvGuard;
  if (guard) guard(() => window.location.reload());
  else window.location.reload();
}

// onHome — [⌂] 홈 (2026-10-28 사장님: 뒤로가기 옆에) · atHome 이면 흐리게
export default function StudioHistoryNav({ onHome, atHome }: { onHome?: () => void; atHome?: boolean }) {
  const [tick, setTick] = useState(0); // 0 = 아직 서버 그림 (기록은 브라우저에서만 안다)
  useEffect(() => {
    // 주소가 바뀌는 순간(Next 가 화면을 바꾸는 중)에 바로 다시 그리면 React 가 막는다 → 한 박자 뒤에 (2026-10-30 화면 전환 막힘)
    const again = () => { setTimeout(() => setTick((t) => t + 1), 0); };
    again();
    const n = nav();
    n?.addEventListener("currententrychange", again);
    window.addEventListener("popstate", again);
    const key = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    };
    // 마우스 옆 단추 — 3 = 뒤로, 4 = 앞으로
    const down = (e: MouseEvent) => { if (e.button === 3 || e.button === 4) e.preventDefault(); };
    const up = (e: MouseEvent) => {
      if (e.button === 3) { e.preventDefault(); go(-1); }
      else if (e.button === 4) { e.preventDefault(); go(1); }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      n?.removeEventListener("currententrychange", again);
      window.removeEventListener("popstate", again);
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const back = tick > 0 && canGo(-1);
  const fwd = tick > 0 && canGo(1);
  const btn = (on: boolean): React.CSSProperties => ({
    width: 34, height: 34, borderRadius: 8, border: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", color: "#fff", opacity: on ? 1 : 0.3, cursor: on ? "pointer" : "default", flexShrink: 0,
  });
  const hover = (on: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { if (on) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "transparent"; },
  });
  const arrow = (d: string) => (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginRight: 6, flexShrink: 0 }}>
      {onHome && (
        <button title="홈" aria-label="홈" disabled={atHome} onClick={onHome} style={btn(!atHome)} {...hover(!atHome)}>
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h5v-6h4v6h5V9.5" />
          </svg>
        </button>
      )}
      <button title="뒤로 (Alt+←)" aria-label="뒤로" disabled={!back} onClick={() => go(-1)} style={btn(back)} {...hover(back)}>{arrow("M15 18l-6-6 6-6")}</button>
      <button title="앞으로 (Alt+→)" aria-label="앞으로" disabled={!fwd} onClick={() => go(1)} style={btn(fwd)} {...hover(fwd)}>{arrow("M9 18l6-6-6-6")}</button>
      {/* 새로 고침 (2026-10-28 사장님 — 크롬의 ⟳) */}
      <button title="새로 고침 (F5)" aria-label="새로 고침" onClick={reload} style={btn(true)} {...hover(true)}>
        <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v5h-5" />
        </svg>
      </button>
    </div>
  );
}
