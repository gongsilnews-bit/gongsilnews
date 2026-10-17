"use client";

// 영상 편집기 생김새 — 어두운 회색 + 흰/회색 글자, 강조색은 공실뉴스 파랑 하나 (알록달록·AI스러운 꾸밈 금지, 사장님)
// 60세 어르신도 쉽게: 글자 크게, 단추는 아이콘 + 한글 이름
import React from "react";

export const C = {
  bg: "#18191c",
  panel: "#202125",
  panel2: "#26272c",
  card: "#2b2c31",
  cardHover: "#313238",
  line: "#36373d",
  line2: "#44454c",
  text: "#eceef1",
  sub: "#a3a7af",
  dim: "#6f737b",
  accent: "#3b82f6",
  accentDim: "rgba(59,130,246,0.16)",
  danger: "#f06a6a",
  ok: "#4ade80",
};

export const FONT = "'Pretendard', 'Malgun Gothic', system-ui, sans-serif";

/* 단색 선 아이콘 (24 칸) */
const P: Record<string, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  open: <><path d="M3 7h6l2 2h10v10H3z" /></>,
  play: <path d="M7 5l12 7-12 7z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  undo: <><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 010 10h-2" /></>,
  redo: <><path d="M15 7l5 5-5 5" /><path d="M20 12H9a5 5 0 000 10h2" /></>,
  cut: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M8 15L19 4M16 15L5 4" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V4H4v12h4" /></>,
  paste: <><rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 4V2h6v2" /></>,
  merge: <><rect x="3" y="5" width="18" height="6" rx="1" /><rect x="3" y="13" width="18" height="6" rx="1" /><path d="M12 9v6" /></>,
  split: <><rect x="3" y="5" width="7" height="14" rx="1" /><rect x="14" y="5" width="7" height="14" rx="1" /></>,
  silence: <><path d="M4 12h3l2-5 3 10 2-5h6" /><path d="M3 3l18 18" /></>,
  text: <><path d="M5 6V4h14v2M12 4v16M9 20h6" /></>,
  image: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="1.5" /><path d="M16 10l5-3v10l-5-3" /></>,
  music: <><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></>,
  voice: <><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" /></>,
  record: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" fill="currentColor" /></>,
  ratio: <><rect x="3" y="6" width="18" height="12" rx="1.5" /></>,
  save: <><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h8V3M8 21v-7h8v7" /></>,
  export: <><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 14v6h14v-6" /></>,
  folder: <path d="M3 6h6l2 2h10v11H3z" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12l5 5 9-10" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  star: <path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.2 8 13.7 4 9.8l5.5-.8z" />,
  pen: <><path d="M4 20h4L19 9l-4-4L4 16z" /></>,
  font: <><path d="M5 19l6-14h2l6 14M8 13h8" /></>,
  sub: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M7 15h5M14 15h3M7 11h3M12 11h5" /></>,
  fill: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 9h18M3 15h18" /></>,
  flipH: <><path d="M12 3v18" strokeDasharray="2 2" /><path d="M9 7L3 17h6z" /><path d="M15 7l6 10h-6z" /></>,
  flipV: <><path d="M3 12h18" strokeDasharray="2 2" /><path d="M7 9L17 3v6z" /><path d="M7 15l10 6v-6z" /></>,
  fitContain: <><rect x="2.5" y="4" width="19" height="16" rx="1.5" /><rect x="6.5" y="8" width="11" height="8" rx="0.5" /></>,
  fitCover: <><rect x="5" y="6.5" width="14" height="11" rx="1" /><path d="M2 4h3M2 4v3M22 4h-3M22 4v3M2 20h3M2 20v-3M22 20h-3M22 20v-3" /></>,
  fitFree: <><rect x="2.5" y="4" width="19" height="16" rx="1.5" /><rect x="12" y="6.5" width="7" height="5" rx="0.5" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  range: <><path d="M5 4v16M19 4v16" /><path d="M8 12h8M8 12l2.5-2.5M8 12l2.5 2.5M16 12l-2.5-2.5M16 12l-2.5 2.5" /></>,
  swap: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  back: <path d="M15 6l-6 6 6 6" />,
  front: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  mute: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 9l4 6M21 9l-4 6" /></>,
  volume: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 8a5 5 0 010 8" /></>,
  scene: <><path d="M4 4h16v16H4z" /><path d="M4 12h16" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 015 .5c0 2-2.5 2-2.5 4M12 17h.01" /></>,
  winMin: <><path d="M5 12h14" /></>,
  winMax: <><rect x="5" y="5" width="14" height="14" rx="1" /></>,
  winRestore: <><rect x="5" y="8" width="11" height="11" rx="1" /><path d="M8 8V5h11v11h-3" /></>,
  // 창 + 톱니 (장치 설정 열기) — 단정한 선 아이콘
  winGear: <><path d="M20 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h5.5" /><path d="M3 8.5h17" /><circle cx="17.5" cy="17.5" r="2" /><path d="M17.5 13.5v1.2M17.5 20.3v1.2M13.5 17.5h1.2M20.3 17.5h1.2M14.7 14.7l.85.85M19.45 19.45l.85.85M14.7 20.3l.85-.85M19.45 15.55l.85-.85" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>,
  file: <><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /></>,
  ai: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 15l2-6 2 6M9 13h2M15 9v6" /></>,
  screen: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></>,
  camera: <><rect x="3" y="7" width="13" height="11" rx="1.5" /><path d="M16 11l5-3v9l-5-3" /></>,
  shorts: <><rect x="7" y="3" width="10" height="18" rx="1.5" /><path d="M10 9l4 3-4 3z" /></>,
  long: <><rect x="2" y="7" width="20" height="10" rx="1.5" /></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  zoom: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M11 8v6M8 11h6" /></>,
  filter: <><path d="M4 5h16l-6 8v6l-4-2v-4z" /></>,
  transition: <><rect x="3" y="6" width="8" height="12" rx="1" /><rect x="13" y="6" width="8" height="12" rx="1" /><path d="M9 12h6" /></>,
  speed: <><path d="M5 18a8 8 0 1114 0" /><path d="M12 13l4-4" /></>,
  bg: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 19l6-6 4 4 3-3 5 5" /></>,
  template: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M9 9v11" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8M16 7l3 3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  thumb: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M7 14h6M7 10h10" /></>,
  marker: <path d="M6 3h12v18l-6-4-6 4z" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
};

export function Icon({ name, size = 20, color = "currentColor", stroke = 1.6 }: { name: string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: "block" }}>
      {P[name] || P.info}
    </svg>
  );
}

export function Btn({ children, onClick, primary, disabled, small, title, style, danger }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; small?: boolean; title?: string; style?: React.CSSProperties; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: small ? 34 : 42, padding: small ? "0 12px" : "0 18px",
        borderRadius: 6, border: `1px solid ${primary ? C.accent : C.line2}`, background: primary ? C.accent : C.card, color: danger ? C.danger : primary ? "#fff" : C.text,
        fontSize: small ? 14 : 15, fontWeight: 700, fontFamily: FONT, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap", ...style,
      }}>
      {children}
    </button>
  );
}

/**
 * 클립 소리 — 무음 켜고 끄기 + 크기(0~200%). 한 번 끄는 동안은 되돌리기 한 번 (first)
 * 미리보기는 100%까지만 크게 들리고, 내보낸 영상에는 200%까지 들어간다
 */
export function VolumeControl({ muted, value, onMute, onVolume }: { muted: boolean; value: number; onMute: (v: boolean) => void; onVolume: (v: number, first: boolean) => void }) {
  const first = React.useRef(true);
  const pct = Math.round(value * 100);
  const silent = muted || pct === 0; // 무음이거나 0% 면 빨간 무음 표시
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: muted ? 0.4 : 1 }}>
        <Icon name={silent ? "mute" : "volume"} size={17} color={silent ? C.danger : C.text} />
        <input type="range" min={0} max={2} step={0.05} value={value} disabled={muted}
          onPointerDown={() => (first.current = true)}
          onChange={(e) => { onVolume(Number(e.target.value), first.current); first.current = false; }}
          style={{ flex: 1, accentColor: C.accent }} />
        <span style={{ width: 46, textAlign: "right", fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: silent ? C.danger : C.text }}>{muted ? "0%" : `${pct}%`}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {/* 무음 — 50% 옆, 다시 누르면 소리 켜기 */}
        <button type="button" onClick={() => onMute(!muted)} title={muted ? "무음 (다시 누르면 소리 켜기)" : "무음 (이 클립 소리 끄기)"}
          style={{ flex: 1, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, border: `1px solid ${silent ? C.danger : C.line2}`, background: silent ? "rgba(239,68,68,0.15)" : "transparent", color: silent ? C.danger : C.text, fontFamily: FONT, cursor: "pointer" }}>
          <Icon name="mute" size={16} />
        </button>
        {[0.5, 1, 1.5, 2].map((v) => (
          <button key={v} type="button" onClick={() => { if (muted) onMute(false); onVolume(v, true); }}
            style={{ flex: 1, height: 28, borderRadius: 5, border: `1px solid ${!muted && Math.abs(value - v) < 0.01 ? C.accent : C.line2}`, background: !muted && Math.abs(value - v) < 0.01 ? C.accentDim : "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
            {Math.round(v * 100)}%
          </button>
        ))}
      </div>
      {pct > 100 && !muted && <div style={{ fontSize: 12, color: C.dim }}>100%보다 크게 한 소리는 내보낸 영상에서 들려요 (미리보기는 100%까지).</div>}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!on)} aria-pressed={on}
      style={{ width: 46, height: 26, borderRadius: 13, border: 0, padding: 3, background: on ? C.accent : C.line2, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, flexShrink: 0 }}>
      <span style={{ display: "block", width: 20, height: 20, borderRadius: 10, background: "#fff", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .15s" }} />
    </button>
  );
}

/** 가운데 뜨는 창 (뒤는 어둡게) */
/**
 * 공용 창. controls 면 오른쪽 위에 윈도우처럼 [— 작게][□ 크게][✕ 닫기].
 *  작게: 창을 숨기고 아래에 작은 막대만 (안의 내용은 그대로 살아 있다 — 카메라 미리보기 등). onMinimize 를 주면 그걸 대신 한다
 */
export function Modal({ title, onClose, children, width = 760, footer, steps, step, controls, onMinimize, minNote, win }: { title?: string; onClose?: () => void; children: React.ReactNode; width?: number; footer?: React.ReactNode; steps?: string[]; step?: number; controls?: boolean; onMinimize?: () => void; minNote?: React.ReactNode; /** 혼자 떠 있는 창 안 — 창 전체를 채우고, 위 줄 끌기·크게는 그 윈도우 창을 */ win?: { drag: (e: React.PointerEvent<HTMLDivElement>) => void; max: () => void; big: boolean } }) {
  const [mini, setMini] = React.useState(false);
  const [big, setBig] = React.useState(false);
  // 제목 줄을 잡고 끌면 창이 옮겨진다 (뒤 화면을 보려고 — 녹화 창 등). 제목 줄은 화면 밖으로 나가지 않게
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const box = React.useRef<HTMLDivElement>(null);
  const dragIn = (e: React.PointerEvent<HTMLDivElement>) => {
    if (big || e.button !== 0 || (e.target as HTMLElement).closest("button, input, select, a")) return;
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const sx = e.clientX - pos.x;
    const sy = e.clientY - pos.y;
    const base = { left: r.left - pos.x, top: r.top - pos.y, w: r.width, h: r.height };
    const move = (ev: PointerEvent) => {
      // 창 전체가 화면 안에 남게 — 아래 단추([녹화 끝내기] 등)가 화면 밖으로 사라지지 않게 (2026-10-17)
      const x = Math.min(Math.max(ev.clientX - sx, -base.left), Math.max(-base.left, window.innerWidth - base.left - base.w));
      const y = Math.min(Math.max(ev.clientY - sy, -base.top), Math.max(-base.top, window.innerHeight - base.top - base.h));
      setPos({ x, y });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    e.preventDefault();
  };
  const winBtn = (icon: string, tip: string, onClick: () => void, danger = false) => (
    <button type="button" onClick={onClick} title={tip} aria-label={tip}
      style={{ width: 40, height: 34, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? C.danger : C.line2; e.currentTarget.style.color = danger ? "#fff" : C.text; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.sub; }}>
      <Icon name={icon} size={20} />
    </button>
  );
  const drag = win ? win.drag : dragIn;
  const minimize = () => (onMinimize ? onMinimize() : setMini(true));
  const toggleBig = () => {
    if (win) return win.max();
    setBig((v) => !v);
    setPos({ x: 0, y: 0 });
  };
  const isBig = win ? win.big : big;
  return (
    // 창(묻는 창 등)은 늘 맨 앞 — 단어 단추 막대(3000)·메뉴보다 위
    <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: win ? C.bg : mini ? "transparent" : "rgba(0,0,0,0.55)", pointerEvents: mini ? "none" : undefined, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      {mini && (
        // 작게 한 창 — 오른쪽 아래 작은 막대. 누르면 다시 커진다
        <div style={{ position: "fixed", right: 24, bottom: 24, pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px 12px 18px", borderRadius: 8, background: C.panel, border: `1px solid ${C.line2}`, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", color: C.text }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{title || "창"}</span>
          {minNote}
          <Btn primary onClick={() => setMini(false)}><Icon name="winRestore" size={16} />다시 열기</Btn>
          {onClose && <Btn onClick={onClose}><Icon name="close" size={16} />닫기</Btn>}
        </div>
      )}
      <div ref={box} data-gsv-modal="" style={win ? { width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: C.panel, color: C.text } : { width: big ? "calc(100vw - 24px)" : width, maxWidth: big ? undefined : "94vw", height: big ? "calc(100vh - 24px)" : undefined, maxHeight: big ? undefined : "92vh", display: mini ? "none" : "flex", flexDirection: "column", background: C.panel, border: `1px solid ${C.line}`, borderRadius: big ? 6 : 10, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", color: C.text, transform: !big && (pos.x || pos.y) ? `translate(${pos.x}px, ${pos.y}px)` : undefined }}>
        <div onPointerDown={drag} onDoubleClick={(e) => !(e.target as HTMLElement).closest("button") && (controls ? toggleBig() : setPos({ x: 0, y: 0 }))} title={isBig ? "두 번 누르면 원래 크기로" : controls ? "끌어서 창을 옮길 수 있어요 (두 번 누르면 크게)" : "끌어서 창을 옮길 수 있어요 (두 번 누르면 가운데로)"}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.line}`, cursor: isBig && win ? "default" : "move", userSelect: "none" }}>
          {steps ? (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <span style={{ width: 40, borderTop: `1px dashed ${C.line2}` }} />}
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: i === step ? C.text : C.dim }}>
                    <span style={{ width: 22, height: 22, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: i === step ? C.text : C.line2, color: i === step ? C.bg : C.sub }}>{i + 1}</span>
                    {s}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, fontSize: 19, fontWeight: 800 }}>{title}</div>
          )}
          {controls ? (
            <div style={{ display: "flex", gap: 2, margin: "-6px -10px -6px 0" }}>
              {winBtn("winMin", "작게 (아래 막대로)", minimize)}
              {winBtn(isBig ? "winRestore" : "winMax", isBig ? "원래 크기로" : "크게 (화면 가득)", toggleBig)}
              {onClose && winBtn("close", "닫기", onClose, true)}
            </div>
          ) : onClose && (
            <button type="button" onClick={onClose} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", padding: 4 }}>
              <Icon name="close" size={22} />
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</div>
        {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: `1px solid ${C.line}` }}>{footer}</div>}
      </div>
    </div>
  );
}

/** 일하는 동안 — 점 세 개 + 지금 하는 일 + 걸린 시간 + 진행 막대 */
export function Working({ title, detail, frac }: { title: string; detail?: string; frac?: number | null }) {
  const [sec, setSec] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: C.text }}>
      <style>{`@keyframes gsvDot{0%,60%,100%{opacity:.3}30%{opacity:1}}`}</style>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 5, background: C.text, animation: `gsvDot 1.2s ${i * 0.18}s infinite` }} />)}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
      {typeof frac === "number" && (
        <div style={{ width: 360, maxWidth: "80%", margin: "16px auto 0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.line }}>
            <div style={{ width: `${Math.round(frac * 100)}%`, height: "100%", borderRadius: 3, background: C.accent, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right" }}>{Math.round(frac * 100)}%</span>
        </div>
      )}
      {detail && <div style={{ marginTop: 12, fontSize: 15, color: C.sub }}>{detail}</div>}
      <div style={{ marginTop: 8, fontSize: 14, color: C.dim }}>잠시만 기다려 주세요 · {Math.floor(sec / 60) ? `${Math.floor(sec / 60)}분 ` : ""}{sec % 60}초</div>
    </div>
  );
}

/** 화면마다 다음에 할 일 한 줄 (어르신도 쉽게) */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 14.5, color: C.sub, lineHeight: 1.5 }}>
      <Icon name="info" size={18} color={C.sub} />
      <span>{children}</span>
    </div>
  );
}

export const label: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: C.text };
export const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 42, padding: "0 12px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 15, fontFamily: FONT, outline: "none" };
