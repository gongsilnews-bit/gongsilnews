"use client";

// 글꼴 고르기 · 색 고르기 (자주 쓰는 색 저장) — 화면 글자·자막 칸에서 같이 쓴다
import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_FONT, STUDIO_FONTS, fontCss } from "@/lib/studio-video/fonts";
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

const chipBase: React.CSSProperties = { height: 40, padding: "0 10px", borderRadius: 5, fontSize: 15, fontFamily: FONT, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

export function FontPick({ value, onChange }: { value?: string; onChange: (family: string) => void }) {
  const cur = value || DEFAULT_FONT;
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  useFonts(STUDIO_FONTS.slice(0, 6).map((f) => f.family)); // 앞의 자주 쓰는 글꼴은 이름을 그 글꼴로 보여 준다
  const pick = async (family: string) => {
    setErr("");
    setBusy(family);
    try {
      await loadFont(family);
      onChange(family);
    } catch (e) {
      setErr(`글꼴을 받지 못했어요: ${errText(e)}`);
    }
    setBusy("");
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {STUDIO_FONTS.map((f) => {
          const on = cur === f.family;
          return (
            <button key={f.family} type="button" onClick={() => pick(f.family)} disabled={Boolean(busy)} title={f.label}
              style={{ ...chipBase, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.text, fontFamily: fontCss(f.family), fontWeight: f.family === DEFAULT_FONT ? 700 : 400 }}>
              {busy === f.family ? "받는 중…" : f.label}
            </button>
          );
        })}
      </div>
      {err && <div style={{ color: C.danger, fontSize: 13.5, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

/* ── 색 고르기 — 기본 3색 + 내 색(자주 쓰는 색, 이 PC에 저장) + 다른 색 ── */
const BASIC = ["#FFFFFF", "#111111", "#FFD400"];
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

export function ColorPick({ value, onChange }: { value?: string; onChange: (hex: string) => void }) {
  const cur = (value || "#FFFFFF").toUpperCase();
  const [mine, setMine] = useState<string[]>(() => (typeof window === "undefined" ? [] : readColors()));
  const ref = useRef<HTMLInputElement>(null);
  // 고른 색은 내 색 맨 앞에 저장 (기본 3색은 빼고)
  const apply = (hex: string, save: boolean) => {
    const h = hex.toUpperCase();
    onChange(h);
    if (save && !BASIC.includes(h)) {
      const next = [h, ...readColors().filter((x) => x.toUpperCase() !== h)];
      writeColors(next);
      setMine(next.slice(0, 14));
    }
  };
  // 색 고르는 창을 닫을 때(change) 한 번만 바꾼다 — 끄는 동안 되돌리기가 쌓이지 않게
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const done = () => apply(el.value, true);
    el.addEventListener("change", done);
    return () => el.removeEventListener("change", done);
  });
  const remove = (h: string) => {
    const next = readColors().filter((x) => x.toUpperCase() !== h);
    writeColors(next);
    setMine(next);
  };
  const sw = (h: string, title: string, onContext?: () => void) => (
    <button key={title + h} type="button" title={title} onClick={() => apply(h, false)}
      onContextMenu={onContext ? (e) => { e.preventDefault(); onContext(); } : undefined}
      style={{ width: 32, height: 32, borderRadius: 5, border: `2px solid ${cur === h.toUpperCase() ? C.accent : C.line2}`, outline: cur === h.toUpperCase() ? `2px solid ${C.bg}` : undefined, outlineOffset: -4, background: h, cursor: "pointer", padding: 0 }} />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {sw("#FFFFFF", "흰색")}
        {sw("#111111", "검정")}
        {sw("#FFD400", "노랑")}
        <button type="button" onClick={() => ref.current?.click()} title="다른 색 고르기"
          style={{ height: 32, padding: "0 10px", borderRadius: 5, border: `1px dashed ${C.line2}`, background: "transparent", color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
          + 다른 색
        </button>
        <input ref={ref} type="color" defaultValue={cur.toLowerCase()} key={cur} style={{ width: 0, height: 0, opacity: 0, border: 0, padding: 0 }} />
        <span style={{ fontSize: 12.5, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{cur}</span>
      </div>
      <div>
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 5 }}>내 색 (자주 쓰는 색 · 오른쪽 클릭하면 빼요)</div>
        {mine.length ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{mine.map((h) => sw(h, `${h} (오른쪽 클릭: 빼기)`, () => remove(h.toUpperCase())))}</div>
        ) : (
          <div style={{ fontSize: 12.5, color: C.dim }}>[+ 다른 색]으로 고른 색이 여기에 저장돼요.</div>
        )}
      </div>
    </div>
  );
}
