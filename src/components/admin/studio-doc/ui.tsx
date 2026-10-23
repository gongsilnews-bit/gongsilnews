"use client";
// 문서편집 — 리본 부품 (워드 모양): 그룹 · 큰 단추 · 작은 단추 · 나눔 단추 · 펼침 메뉴 · 색 고르기 · 숫자 칸
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { RiArrowDownSLine } from "react-icons/ri";
import { usePcFonts, loadPcFonts, findPcFont, PC_FONT_NOTE } from "@/lib/pcFonts";

const keep = (e: React.MouseEvent) => e.preventDefault(); // 단추를 눌러도 글 선택이 풀리지 않게

export function Group({ label, children, launcher, title }: { label: string; children: React.ReactNode; launcher?: () => void; title?: string }) {
  return (
    <div className="gsd-grp">
      <div className="gsd-grp-body">{children}</div>
      <div className="gsd-grp-label">
        {label}
        {launcher && <button className="gsd-launch" title={title || `${label} 설정`} onMouseDown={keep} onClick={launcher}>⌟</button>}
      </div>
    </div>
  );
}
export const Col = ({ children, gap = 2 }: { children: React.ReactNode; gap?: number }) => <div className="gsd-col" style={{ gap }}>{children}</div>;
export const Row = ({ children, gap = 1 }: { children: React.ReactNode; gap?: number }) => <div className="gsd-row" style={{ gap }}>{children}</div>;
export const Sep = () => <span className="gsd-vsep" />;

type BtnProps = { icon?: IconType; label?: string; title?: string; on?: boolean; disabled?: boolean; onClick?: () => void; color?: string; iconEl?: React.ReactNode; wide?: boolean };

/** 큰 단추 — 아이콘 위, 글 아래 (붙여넣기·표·그림 …) */
export function Big({ icon: I, label, title, on, disabled, onClick, color = "#2b579a", iconEl, menu, children }: BtnProps & { menu?: (close: () => void) => React.ReactNode; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, open, () => setOpen(false));
  const body = (
    <>
      <span className="gsd-big-ic" style={{ color }}>{iconEl || (I && <I size={30} />)}</span>
      <span className="gsd-big-lb">{label}{menu && <RiArrowDownSLine size={12} style={{ verticalAlign: -2 }} />}</span>
    </>
  );
  if (!menu) return <button className={`gsd-big${on ? " on" : ""}`} title={title || label} disabled={disabled} onMouseDown={keep} onClick={onClick}>{body}</button>;
  // 나눔 큰 단추: onClick 이 있으면 위(아이콘)는 바로 실행, 아래(글)는 메뉴
  return (
    <div ref={ref} className="gsd-pop-wrap">
      {onClick ? (
        <div className={`gsd-big split${on ? " on" : ""}`}>
          <button className="gsd-big-top" title={title || label} disabled={disabled} onMouseDown={keep} onClick={onClick}><span className="gsd-big-ic" style={{ color }}>{iconEl || (I && <I size={30} />)}</span></button>
          <button className="gsd-big-bot" disabled={disabled} onMouseDown={keep} onClick={() => setOpen(!open)}>{label}<RiArrowDownSLine size={12} style={{ verticalAlign: -2 }} /></button>
        </div>
      ) : (
        <button className={`gsd-big${on || open ? " on" : ""}`} title={title || label} disabled={disabled} onMouseDown={keep} onClick={() => setOpen(!open)}>{body}</button>
      )}
      {open && <Pop anchor={ref}>{menu(() => setOpen(false))}{children}</Pop>}
    </div>
  );
}

/** 작은 단추 — 아이콘(+글). menu 가 있으면 옆에 ▾ */
export function Small({ icon: I, label, title, on, disabled, onClick, color, iconEl, menu, wide, bar }: BtnProps & { menu?: (close: () => void) => React.ReactNode; bar?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, open, () => setOpen(false));
  const ic = iconEl || (I && <I size={16} style={{ color }} />);
  const face = (
    <>
      <span className="gsd-sm-ic">{ic}{bar !== undefined && <span className="gsd-colorbar" style={{ background: bar || "transparent", border: bar ? 0 : "1px solid #bbb" }} />}</span>
      {label && <span className="gsd-sm-lb">{label}</span>}
    </>
  );
  if (!menu) return <button className={`gsd-sm${on ? " on" : ""}${wide ? " wide" : ""}`} title={title || label} disabled={disabled} onMouseDown={keep} onClick={onClick}>{face}</button>;
  return (
    <div ref={ref} className="gsd-pop-wrap">
      <div className={`gsd-split${on ? " on" : ""}`}>
        <button className={`gsd-sm${wide ? " wide" : ""}`} title={title || label} disabled={disabled} onMouseDown={keep} onClick={onClick || (() => setOpen(!open))}>{face}</button>
        <button className="gsd-sm gsd-arrow" disabled={disabled} title={`${title || label || ""} 더 보기`} onMouseDown={keep} onClick={() => setOpen(!open)}><RiArrowDownSLine size={12} /></button>
      </div>
      {open && <Pop anchor={ref}>{menu(() => setOpen(false))}</Pop>}
    </div>
  );
}

/** 펼침 메뉴 한 줄 */
export function Item({ icon: I, label, hint, on, disabled, onClick, children, style }: { icon?: IconType; label: React.ReactNode; hint?: string; on?: boolean; disabled?: boolean; onClick?: () => void; children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button className={`gsd-item${on ? " on" : ""}`} disabled={disabled} onMouseDown={keep} onClick={onClick} style={style}>
      <span className="gsd-item-ic">{I ? <I size={16} /> : on ? "✓" : ""}</span>
      <span className="gsd-item-lb">{label}{children}</span>
      {hint && <span className="gsd-item-hint">{hint}</span>}
    </button>
  );
}
export const MenuSep = () => <div className="gsd-menu-sep" />;
export const MenuHead = ({ children }: { children: React.ReactNode }) => <div className="gsd-menu-head">{children}</div>;

/** 펼침 메뉴 — 리본 밖(종이 위)까지 보이게 화면 기준(fixed)으로 단추 바로 아래에 띄운다 */
export function Pop({ anchor, children, className = "", minWidth }: { anchor: React.RefObject<HTMLElement | null>; children: React.ReactNode; className?: string; minWidth?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const a = anchor.current, el = ref.current;
    if (!a || !el) return;
    const r = a.getBoundingClientRect();
    const top = r.bottom + 2;
    el.style.top = `${top}px`;
    el.style.maxHeight = `${Math.max(160, window.innerHeight - top - 10)}px`;
    const w = el.offsetWidth;
    el.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
  });
  return <div ref={ref} className={`gsd-pop ${className}`} style={{ position: "fixed", minWidth, marginTop: 0, zIndex: 300 }}>{children}</div>;
}

export function useOutside(ref: React.RefObject<HTMLElement | null>, active: boolean, close: () => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [ref, active, close]);
}
/** 메뉴가 화면 밖으로 나가지 않게 */
export function useFit(ref: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) el.style.left = `${Math.min(0, window.innerWidth - 8 - r.right)}px`;
  });
}

/* ── 색 — 워드 Office 테마 색 (밝게 80·60·40 %, 어둡게 25·50 %) + 표준 색 ── */
const THEME_BASE = ["#FFFFFF", "#000000", "#E7E6E6", "#44546A", "#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"];
const STANDARD = ["#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050", "#00B050", "#00B0F0", "#0070C0", "#002060", "#7030A0"];
export const HIGHLIGHTS = ["#FFFF00", "#00FF00", "#00FFFF", "#FF00FF", "#0000FF", "#FF0000", "#000080", "#008080", "#008000", "#800080", "#800000", "#808000", "#808080", "#C0C0C0", "#000000"];
const mix = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t)));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};
const shadeRows = (base: string, i: number) => {
  // 흰색은 어둡게만, 검정은 밝게만 (워드와 같게)
  if (i === 0) return [-0.05, -0.15, -0.25, -0.35, -0.5].map((t) => mix(base, t));
  if (i === 1) return [0.5, 0.35, 0.25, 0.15, 0.05].map((t) => mix(base, t));
  return [0.8, 0.6, 0.4, -0.25, -0.5].map((t) => mix(base, t));
};
const recentColors: string[] = [];
export function ColorMenu({ onPick, none = "자동", close, extra }: { onPick: (c: string | null) => void; none?: string; close: () => void; extra?: React.ReactNode }) {
  const pick = (c: string | null) => {
    if (c && !recentColors.includes(c)) { recentColors.unshift(c); recentColors.splice(10); }
    onPick(c);
    close();
  };
  const sw = (c: string, k: string) => <button key={k} className="gsd-sw" title={c} style={{ background: c }} onMouseDown={keep} onClick={() => pick(c)} />;
  return (
    <div className="gsd-colors">
      <button className="gsd-item" onMouseDown={keep} onClick={() => pick(null)}><span className="gsd-item-ic"><span className="gsd-sw" style={{ background: none === "자동" ? "#000" : "transparent", border: "1px solid #999", display: "inline-block" }} /></span><span className="gsd-item-lb">{none}</span></button>
      <MenuHead>테마 색</MenuHead>
      <div className="gsd-sw-row">{THEME_BASE.map((c, i) => sw(c, `b${i}`))}</div>
      <div className="gsd-sw-grid">{[0, 1, 2, 3, 4].map((r) => THEME_BASE.map((c, i) => sw(shadeRows(c, i)[r], `s${r}${i}`)))}</div>
      <MenuHead>표준 색</MenuHead>
      <div className="gsd-sw-row">{STANDARD.map((c, i) => sw(c, `t${i}`))}</div>
      {recentColors.length > 0 && <><MenuHead>최근에 사용한 색</MenuHead><div className="gsd-sw-row">{recentColors.map((c, i) => sw(c, `r${i}`))}</div></>}
      <MenuSep />
      <label className="gsd-item" style={{ cursor: "pointer" }}>
        <span className="gsd-item-ic">🎨</span><span className="gsd-item-lb">다른 색…</span>
        <input type="color" style={{ width: 0, height: 0, opacity: 0, position: "absolute" }} onChange={(e) => pick(e.target.value.toUpperCase())} />
      </label>
      {extra}
    </div>
  );
}
export function HighlightMenu({ onPick, close }: { onPick: (c: string | null) => void; close: () => void }) {
  return (
    <div className="gsd-colors">
      <div className="gsd-sw-grid" style={{ gridTemplateColumns: "repeat(5, 22px)" }}>
        {HIGHLIGHTS.map((c) => <button key={c} className="gsd-sw big" style={{ background: c }} onMouseDown={keep} onClick={() => { onPick(c); close(); }} />)}
      </div>
      <MenuSep />
      <Item label="색 없음" onClick={() => { onPick(null); close(); }} />
    </div>
  );
}

/** 글꼴·크기 고르기 칸 (적어 넣거나 목록에서) */
export function Combo({ value, options, width, onPick, title, render }: { value: string; options: { v: string; label?: string }[]; width: number; onPick: (v: string) => void; title?: string; render?: (o: { v: string; label?: string }) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useOutside(ref, open, close);
  const shown = editing ? text : value;
  return (
    <div ref={ref} className="gsd-combo" style={{ width }} title={title}>
      <input value={shown} onFocus={(e) => { setText(value); setEditing(true); e.target.select(); }} onBlur={() => setEditing(false)} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { onPick(text); setEditing(false); (e.target as HTMLInputElement).blur(); } if (e.key === "Escape") { setEditing(false); (e.target as HTMLInputElement).blur(); } }} />
      <button onMouseDown={keep} onClick={() => setOpen(!open)}><RiArrowDownSLine size={13} /></button>
      {open && (
        <Pop anchor={ref} className="gsd-combo-list" minWidth={width}>
          {options.map((o) => (
            <button key={o.v} className={`gsd-item${o.v === value ? " on" : ""}`} onMouseDown={keep} onClick={() => { onPick(o.v); setOpen(false); }}>
              <span className="gsd-item-lb">{render ? render(o) : o.label || o.v}</span>
            </button>
          ))}
        </Pop>
      )}
    </div>
  );
}

/** 숫자 칸 (위·아래 화살표) — 레이아웃 › 들여쓰기·간격 */
export function Spin({ label, value, unit, step = 1, min = 0, max = 999, onChange, width = 64 }: { label: string; value: number; unit: string; step?: number; min?: number; max?: number; onChange: (v: number) => void; width?: number }) {
  const [t, setT] = useState<string | null>(null);
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v * 10) / 10)));
  return (
    <label className="gsd-spin">
      <span className="gsd-spin-lb">{label}</span>
      <span className="gsd-spin-box" style={{ width }}>
        <input value={t ?? `${value} ${unit}`} onFocus={(e) => { setT(String(value)); setTimeout(() => e.target.select()); }} onChange={(e) => setT(e.target.value)}
          onBlur={() => { if (t !== null) { const v = parseFloat(t); if (Number.isFinite(v)) set(v); } setT(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "ArrowUp") { e.preventDefault(); set(value + step); } if (e.key === "ArrowDown") { e.preventDefault(); set(value - step); } }} />
        <span className="gsd-spin-arrows">
          <button onMouseDown={keep} onClick={() => set(value + step)}>▴</button>
          <button onMouseDown={keep} onClick={() => set(value - step)}>▾</button>
        </span>
      </span>
    </label>
  );
}

/** 표 넣기 격자 (10 × 8) */
export function TableGrid({ onPick }: { onPick: (r: number, c: number) => void }) {
  const [h, setH] = useState({ r: 0, c: 0 });
  return (
    <div style={{ padding: 8 }}>
      <div className="gsd-menu-head" style={{ padding: "0 0 6px" }}>{h.r && h.c ? `표 ${h.c}×${h.r}` : "표 삽입"}</div>
      <div className="gsd-tgrid" onMouseLeave={() => setH({ r: 0, c: 0 })}>
        {Array.from({ length: 8 }, (_, r) => Array.from({ length: 10 }, (_, c) => (
          <button key={`${r}-${c}`} className={r < h.r && c < h.c ? "on" : ""} onMouseEnter={() => setH({ r: r + 1, c: c + 1 })} onMouseDown={keep} onClick={() => onPick(r + 1, c + 1)} />
        )))}
      </div>
    </div>
  );
}

/** 그림 미리보기 갤러리 칸 (스타일·서식·워터마크 …) */
export function Gallery({ children, rows = 1, width }: { children: React.ReactNode; rows?: number; width?: number }) {
  return <div className="gsd-gallery" style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, width }}>{children}</div>;
}

/** 창 (대화 상자) — 워드처럼 가운데 회색 테두리 */
export function Dialog({ title, onClose, children, width = 460, foot }: { title: string; onClose: () => void; children: React.ReactNode; width?: number; foot?: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="gsd-dlg-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gsd-dlg" style={{ width }}>
        <div className="gsd-dlg-title"><span>{title}</span><button onClick={onClose} title="닫기">✕</button></div>
        <div className="gsd-dlg-body">{children}</div>
        {foot && <div className="gsd-dlg-foot">{foot}</div>}
      </div>
    </div>
  );
}

/** 글꼴 칸 (워드처럼) — 최근에 사용한 글꼴 · 공실뉴스 글꼴 · 내 PC 글꼴(앱에서). 적으면 걸러 보인다 */
const RECENT_FONTS = "gsd-font-recent";
export function FontCombo({ value, width, base, onPick }: { value: string; width: number; base: { family: string; label: string }[]; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [more, setMore] = useState(80);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => { setOpen(false); setEditing(false); }, []);
  useOutside(ref, open, close);
  const pc = usePcFonts();
  const pcList = (pc || []).filter((f) => !base.some((b) => b.family === f.family || b.family === f.ko)).map((f) => ({ family: f.ko || f.family, label: f.label, en: f.family }));
  const labelOf = (v: string) => base.find((b) => b.family === v)?.label || findPcFont(v)?.label || v;
  const recent = (() => { try { const r = JSON.parse(localStorage.getItem(RECENT_FONTS) || "[]"); return Array.isArray(r) ? (r as string[]) : []; } catch { return []; } })();
  const k = editing ? text.trim().toLowerCase() : "";
  const hit = (f: { family: string; label: string; en?: string }) => !k || f.label.toLowerCase().includes(k) || f.family.toLowerCase().includes(k) || (f.en || "").toLowerCase().includes(k);
  const pick = (v: string) => {
    onPick(v);
    try { localStorage.setItem(RECENT_FONTS, JSON.stringify([v, ...recent.filter((x) => x !== v)].slice(0, 6))); } catch {}
    setOpen(false); setEditing(false);
  };
  const row = (f: { family: string; label: string }, key: string) => (
    <button key={key} className={`gsd-item${f.family === value ? " on" : ""}`} onMouseDown={keep} onClick={() => pick(f.family)}>
      <span className="gsd-item-lb" style={{ fontFamily: `'${f.family}'`, fontSize: 14 }}>{f.label}</span>
    </button>
  );
  const baseF = base.filter(hit), pcF = pcList.filter(hit);
  const recentF = k ? [] : recent.map((v) => ({ family: v, label: labelOf(v) }));
  return (
    <div ref={ref} className="gsd-combo" style={{ width }} title="글꼴">
      <input value={editing ? text : labelOf(value)} style={{ fontFamily: `'${value}'` }}
        onFocus={(e) => { setText(labelOf(value)); setEditing(true); e.target.select(); }}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { const first = [...baseF, ...pcF][0]; if (k && first) pick(first.family); else if (text.trim()) pick(text.trim()); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { close(); (e.target as HTMLInputElement).blur(); }
        }} />
      <button onMouseDown={keep} onClick={() => setOpen(!open)}><RiArrowDownSLine size={13} /></button>
      {open && (
        <Pop anchor={ref} className="gsd-combo-list" minWidth={Math.max(width, 240)}>
          {recentF.length > 0 && <><MenuHead>최근에 사용한 글꼴</MenuHead>{recentF.map((f) => row(f, "r" + f.family))}<MenuSep /></>}
          <MenuHead>공실뉴스 글꼴</MenuHead>
          {baseF.map((f) => row(f, "b" + f.family))}
          {pc && pc.length > 0 && (
            <>
              <MenuSep />
              <div className="gsd-menu-head" style={{ display: "flex", alignItems: "center" }}>
                <span style={{ flex: 1 }}>내 PC 글꼴 ({pcF.length})</span>
                <button className="gsd-sm" onMouseDown={keep} disabled={busy} onClick={async () => { setBusy(true); await loadPcFonts(true); setBusy(false); }}>{busy ? "읽는 중…" : "↻ 새로 고침"}</button>
              </div>
              <div style={{ fontSize: 11, color: "#777", padding: "0 12px 6px", lineHeight: 1.5, maxWidth: 300 }}>{PC_FONT_NOTE}</div>
              {pcF.slice(0, k ? 300 : more).map((f) => row(f, "p" + f.en))}
              {!k && pcF.length > more && <button className="gsd-item" onMouseDown={keep} onClick={() => setMore(more + 150)}><span className="gsd-item-lb" style={{ color: "#185abd" }}>더 보기 ({pcF.length - more}개 더)</span></button>}
            </>
          )}
          {!baseF.length && !pcF.length && <div className="gsd-muted" style={{ padding: "6px 12px" }}>찾는 글꼴이 없어요. Enter 를 누르면 적은 이름 그대로 써요.</div>}
        </Pop>
      )}
    </div>
  );
}
