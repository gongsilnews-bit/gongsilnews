"use client";

// 글꼴 고르기 · 색 고르기 (자주 쓰는 색 저장) — 화면 글자·자막 칸에서 같이 쓴다
import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_FONT, STUDIO_FONTS, fontCss, fontLabel } from "@/lib/studio-video/fonts";
import { videoBridge, errText } from "./types";
import { C, FONT } from "./ui";

/* ── 글꼴 받아서 미리보기에 쓰기 (@font-face) ── */
const loaded = new Map<string, Promise<void>>();
export function loadFont(family?: string): Promise<void> {
  if (!family || family === DEFAULT_FONT) return Promise.resolve();
  if (loaded.has(family)) return loaded.get(family)!;
  const b = videoBridge();
  if (!b) return Promise.resolve();
  const p = (async () => {
    const r = await b.fonts.ensure(family);
    if (!r.url) return;
    const st = document.createElement("style");
    st.textContent = `@font-face { font-family: '${family}'; src: url("${r.url}"); font-weight: 100 900; font-display: block; }`;
    document.head.appendChild(st);
    await document.fonts.load(`40px '${family}'`).catch(() => {});
  })();
  loaded.set(family, p);
  p.catch(() => loaded.delete(family));
  return p;
}
/** 프로젝트에 쓰인 글꼴들을 미리 받아 둔다 — 다 되면 화면을 다시 그리게 */
export function useFonts(families: (string | undefined)[]) {
  const key = [...new Set(families.filter(Boolean))].sort().join("|");
  const [, tick] = useState(0);
  useEffect(() => {
    if (!key) return;
    Promise.all(key.split("|").map((f) => loadFont(f).catch(() => {}))).then(() => tick((x) => x + 1));
  }, [key]);
}


/* 글꼴 — 최근 사용·즐겨찾기 (이 PC 에 기억) */
const FONT_RECENT = "gsv-font-recent";
const FONT_FAV = "gsv-font-fav";
const readList = (k: string): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};
const writeList = (k: string, v: string[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

/**
 * 글꼴 고르기 — 캡컷처럼 눌러서 펼치는 목록 (2026-10-19 사장님): 찾기 · 최근 사용 · 즐겨찾기(★) · 전체 글꼴
 *  글꼴 이름은 그 글꼴 모양으로 보여 준다
 */
export function FontPick({ value, onChange }: { value?: string; onChange: (family: string) => void }) {
  const cur = value || DEFAULT_FONT;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "fav">("all");
  const [recent, setRecent] = useState<string[]>(() => readList(FONT_RECENT));
  const [fav, setFav] = useState<string[]>(() => readList(FONT_FAV));
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useFonts(open ? STUDIO_FONTS.map((f) => f.family) : [cur]); // 펼치면 모든 글꼴 이름을 그 글꼴로
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", out);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", out); window.removeEventListener("keydown", esc); };
  }, [open]);
  const pick = async (family: string) => {
    setErr("");
    setBusy(family);
    try {
      await loadFont(family);
      onChange(family);
      const r = [family, ...recent.filter((x) => x !== family)].slice(0, 5);
      setRecent(r);
      writeList(FONT_RECENT, r);
      setOpen(false);
    } catch (e) {
      setErr(`글꼴을 받지 못했어요: ${errText(e)}`);
    }
    setBusy("");
  };
  const toggleFav = (family: string) => {
    const f = fav.includes(family) ? fav.filter((x) => x !== family) : [...fav, family];
    setFav(f);
    writeList(FONT_FAV, f);
  };
  const byFamily = (fam: string) => STUDIO_FONTS.find((f) => f.family === fam);
  const k = q.trim().toLowerCase();
  const match = (f: { family: string; label: string }) => !k || f.label.toLowerCase().includes(k) || f.family.toLowerCase().includes(k);
  const row = (f: { family: string; label: string }, key: string) => {
    const on = cur === f.family;
    const star = fav.includes(f.family);
    return (
      <div key={key} style={{ display: "flex", alignItems: "center", borderRadius: 5, background: on ? C.accentDim : "transparent" }}>
        <button type="button" onClick={() => pick(f.family)} disabled={Boolean(busy)} title={f.label}
          style={{ flex: 1, minWidth: 0, height: 36, padding: "0 10px", border: 0, background: "transparent", color: C.text, textAlign: "left", fontSize: 16, fontFamily: fontCss(f.family), fontWeight: f.family === DEFAULT_FONT ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {busy === f.family ? "받는 중…" : f.label}
        </button>
        <button type="button" onClick={() => toggleFav(f.family)} title={star ? "즐겨찾기 빼기" : "즐겨찾기"}
          style={{ width: 34, height: 34, border: 0, background: "transparent", color: star ? "#FFD400" : C.dim, cursor: "pointer", fontSize: 17, lineHeight: 1 }}>
          {star ? "★" : "☆"}
        </button>
      </div>
    );
  };
  const head = (t: string) => <div style={{ fontSize: 12, color: C.dim, fontWeight: 700, padding: "8px 10px 4px", borderBottom: `1px solid ${C.line}`, marginBottom: 2 }}>{t}</div>;
  const recentF = recent.map(byFamily).filter((f): f is { family: string; label: string } => Boolean(f) && match(f!));
  const favF = STUDIO_FONTS.filter((f) => fav.includes(f.family) && match(f));
  const allF = STUDIO_FONTS.filter(match);
  return (
    <div ref={box} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ width: "100%", height: 40, padding: "0 12px", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, border: `1px solid ${open ? C.accent : C.line2}`, background: C.card, color: C.text, cursor: "pointer" }}>
        <span style={{ flex: 1, textAlign: "left", fontSize: 16, fontFamily: fontCss(cur), fontWeight: cur === DEFAULT_FONT ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fontLabel(cur)}</span>
        <span style={{ color: C.sub, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", zIndex: 40, maxHeight: 380, overflowY: "auto", padding: 8, borderRadius: 8, background: C.panel, border: `1px solid ${C.line2}`, boxShadow: "0 12px 32px rgba(0,0,0,0.5)", fontFamily: FONT }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="글꼴 찾기" autoFocus
            style={{ width: "100%", height: 34, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14, fontFamily: FONT, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, margin: "8px 0 4px" }}>
            {([["all", "모두"], ["fav", "즐겨찾기"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setOnly(v)}
                style={{ height: 28, padding: "0 12px", borderRadius: 14, border: `1px solid ${only === v ? C.accent : C.line2}`, background: only === v ? C.accentDim : "transparent", color: C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
                {l}
              </button>
            ))}
          </div>
          {only === "all" && recentF.length > 0 && (
            <>
              {head("최근 사용")}
              {recentF.map((f) => row(f, "r" + f.family))}
            </>
          )}
          {favF.length > 0 && (
            <>
              {head("즐겨찾기")}
              {favF.map((f) => row(f, "f" + f.family))}
            </>
          )}
          {only === "fav" && !favF.length && <div style={{ fontSize: 13, color: C.sub, padding: 10 }}>☆ 를 누르면 즐겨찾기에 담겨요.</div>}
          {only === "all" && (
            <>
              {head("전체 글꼴")}
              {allF.map((f) => row(f, "a" + f.family))}
              {!allF.length && <div style={{ fontSize: 13, color: C.sub, padding: 10 }}>찾는 글꼴이 없어요.</div>}
            </>
          )}
        </div>
      )}
      {err && <div style={{ color: C.danger, fontSize: 13.5, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

/* ── 색 고르기 — 기본 3색 + 내 색(자주 쓰는 색, 이 PC에 저장) + 다른 색 ── */
const KEY = "gsv:colors";
const readColors = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => /^#[0-9A-F]{6}$/i.test(x)).slice(0, 14) : [];
  } catch {
    return [];
  }
};
const writeColors = (list: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 14)));
  } catch {}
};

/* 색 바꾸기 계산 (HSV) */
const hexToHsv = (hex: string) => {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
};
const hsvToHex = (h: number, s: number, v: number) => {
  const f = (k: number) => {
    const x = (k + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(x, 4 - x, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
};
/** 색판 아래 기본 색들 (캡컷처럼) */
const PALETTE = [
  "#FFFFFF", "#BFBFBF", "#7F7F7F", "#3F3F3F", "#000000", "#FFD400", "#FF8A00", "#FF2D55", "#C026D3",
  "#1F8FFF", "#22D3EE", "#16A34A", "#7CFF4D", "#FF5FB0", "#E60012", "#8B5A2B", "#1A3A6B", "#7C3AED",
  "#FFE4F1", "#FFF3B0", "#DCFCE7", "#DBEAFE", "#F5D78E", "#C8102E", "#0B1F44", "#5B2E00", "#39FF14",
];

/**
 * 색 고르기 — 캡컷처럼 색 단추를 누르면 펼쳐지는 색판 (2026-10-19 사장님)
 *  색판(밝기·진하기) · 색 띠 · 스포이트 · 색 번호(#) · 내 색(+ 로 담기, 오른쪽 클릭 빼기) · 기본 색
 *  끄는 동안은 미리 보기만, 손을 떼면 한 번 바꾼다 (되돌리기가 쌓이지 않게)
 */
export function ColorPick({ value, onChange }: { value?: string; onChange: (hex: string) => void }) {
  const cur = (value || "#FFFFFF").toUpperCase();
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(cur));
  const [hexDraft, setHexDraft] = useState(cur);
  const [mine, setMine] = useState<string[]>(() => (typeof window === "undefined" ? [] : readColors()));
  const box = useRef<HTMLDivElement>(null);
  const sv = useRef<HTMLDivElement>(null);
  const shown = hsvToHex(hsv.h, hsv.s, hsv.v);
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", out);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", out); window.removeEventListener("keydown", esc); };
  }, [open]);
  const toggle = () => {
    if (!open) { setHsv(hexToHsv(cur)); setHexDraft(cur); }
    setOpen(!open);
  };
  const commit = (hex: string) => {
    const h = hex.toUpperCase();
    setHexDraft(h);
    if (h !== cur) onChange(h);
  };
  const pickSwatch = (hex: string) => {
    setHsv(hexToHsv(hex));
    commit(hex);
  };
  const saveMine = () => {
    const h = shown;
    const next = [h, ...readColors().filter((x) => x.toUpperCase() !== h)];
    writeColors(next);
    setMine(next.slice(0, 14));
  };
  const remove = (h: string) => {
    const next = readColors().filter((x) => x.toUpperCase() !== h.toUpperCase());
    writeColors(next);
    setMine(next);
  };
  // 색판 끌기
  const dragSv = (e: React.PointerEvent) => {
    const el = sv.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let last = hsv;
    const at = (x: number, y: number) => {
      last = { h: hsv.h, s: Math.max(0, Math.min(1, (x - r.left) / r.width)), v: Math.max(0, Math.min(1, 1 - (y - r.top) / r.height)) };
      setHsv(last);
      setHexDraft(hsvToHex(last.h, last.s, last.v));
    };
    at(e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => at(ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      commit(hsvToHex(last.h, last.s, last.v));
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const eye = async () => {
    const ED = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!ED) return;
    try {
      const r = await new ED().open();
      if (r?.sRGBHex) pickSwatch(r.sRGBHex);
    } catch {}
  };
  const chip = (h: string, title: string, onContext?: () => void) => (
    <button key={title + h} type="button" title={title} onClick={() => pickSwatch(h)}
      onContextMenu={onContext ? (e) => { e.preventDefault(); onContext(); } : undefined}
      style={{ width: 24, height: 24, borderRadius: 4, border: `2px solid ${shown === h.toUpperCase() ? C.accent : "rgba(255,255,255,0.15)"}`, background: h, cursor: "pointer", padding: 0 }} />
  );
  return (
    <div ref={box} style={{ position: "relative" }}>
      <button type="button" onClick={toggle} title="눌러서 색 고르기"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 8px 0 4px", borderRadius: 6, border: `1px solid ${open ? C.accent : C.line2}`, background: C.card, cursor: "pointer" }}>
        <span title={cur} style={{ width: 64, height: 24, borderRadius: 4, background: cur, border: "1px solid rgba(255,255,255,0.25)" }} />
        <span style={{ color: C.sub, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 45, width: 268, padding: 12, borderRadius: 9, background: C.panel, border: `1px solid ${C.line2}`, boxShadow: "0 14px 36px rgba(0,0,0,0.55)", fontFamily: FONT }}>
          {/* 색판 — 왼쪽 위 흰색, 아래 검정 */}
          <div ref={sv} onPointerDown={dragSv}
            style={{ position: "relative", height: 130, borderRadius: 6, cursor: "crosshair", touchAction: "none", background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hsvToHex(hsv.h, 1, 1)}` }}>
            <span style={{ position: "absolute", left: `calc(${hsv.s * 100}% - 7px)`, top: `calc(${(1 - hsv.v) * 100}% - 7px)`, width: 14, height: 14, borderRadius: 7, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.5)", pointerEvents: "none" }} />
          </div>
          {/* 스포이트 + 색 띠 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <button type="button" onClick={eye} title="스포이트 — 화면에서 색 찍기"
              style={{ width: 30, height: 26, flexShrink: 0, borderRadius: 5, border: `1px solid ${C.line2}`, background: C.card, color: C.text, cursor: "pointer", fontSize: 14, padding: 0 }}>✎</button>
            <input type="range" min={0} max={359} step={1} value={Math.round(hsv.h)}
              onChange={(e) => { const n = { ...hsv, h: Number(e.target.value), s: hsv.s || 1, v: hsv.v || 1 }; setHsv(n); setHexDraft(hsvToHex(n.h, n.s, n.v)); }}
              onPointerUp={() => commit(shown)} onKeyUp={() => commit(shown)}
              style={{ flex: 1, height: 12, appearance: "none", WebkitAppearance: "none", borderRadius: 6, background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)", cursor: "pointer" }} />
          </div>
          {/* 색 번호 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 12.5, color: C.sub, width: 30 }}>Hex</span>
            <input value={hexDraft} onChange={(e) => setHexDraft(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              onBlur={() => { const m = /^#?([0-9A-F]{6})$/i.exec(hexDraft.trim()); if (m) pickSwatch("#" + m[1]); else setHexDraft(shown); }}
              style={{ flex: 1, height: 28, padding: "0 8px", borderRadius: 5, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 13, fontFamily: FONT }} />
            <span style={{ width: 28, height: 28, borderRadius: 5, background: shown, border: "1px solid rgba(255,255,255,0.25)" }} />
          </div>
          <div style={{ height: 1, background: C.line, margin: "10px 0" }} />
          {/* 내 색 + 기본 색 */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={saveMine} title="지금 색을 내 색에 담기"
              style={{ width: 24, height: 24, borderRadius: 4, border: `1px dashed ${C.line2}`, background: "transparent", color: C.text, cursor: "pointer", padding: 0, fontSize: 15, lineHeight: "20px" }}>+</button>
            {mine.map((h) => chip(h, `${h} (오른쪽 클릭: 빼기)`, () => remove(h)))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 5, marginTop: 8 }}>
            {PALETTE.map((h) => chip(h, h))}
          </div>
        </div>
      )}
    </div>
  );
}
