"use client";

// 효과 컨트롤 (프리미어처럼, 2026-10-20 사장님 "효과 컨트롤 좋아") — 타임라인 편집 왼쪽 위
//  왼쪽: fx 묶음(모션·불투명도·자르기·색 보정·오디오)과 항목 한 줄씩 — ⏱(키프레임 켜기) · 값(좌우로 끌어 바꾸기, 누르면 쓰기) · ‹ ◇ › · ↺
//  오른쪽: 고른 것만큼의 작은 키프레임 타임라인 — ◆ 끌어 시각 옮기기, 누르면 고르기 · Delete 로 지우기, 위 눈금을 누르면 재생 막대
import React, { useEffect, useRef, useState } from "react";
import type { Keyframe, KfProp } from "./types";
import { kfAny, kfHas, kfHasAt } from "./timeline";
import { C, FONT, Icon } from "./ui";

const FS = 11.5;
const BLUE = "#5ea2ff"; // 값 (프리미어처럼 파란 숫자)
const ROW = 22;

export type EcValue = { v: number; unit?: string; digits?: number; step?: number; min?: number; max?: number; set: (v: number, first: boolean) => void };
export type EcRow = { label: string; props?: KfProp[]; values?: EcValue[]; reset?: () => void; check?: { label: string; on: boolean; set: (v: boolean) => void }; note?: string };
export type EcGroup = { title: string; rows: EcRow[]; reset?: () => void; open?: boolean };

/** 값 — 좌우로 끌면 바뀌고 (Shift = 10배, Ctrl = 1/10), 누르면 숫자 쓰기 */
function Scrub({ val }: { val: EcValue }) {
  const [edit, setEdit] = useState<string | null>(null);
  const d = val.digits ?? 1;
  const clamp = (x: number) => Math.max(val.min ?? -1e9, Math.min(val.max ?? 1e9, x));
  if (edit !== null)
    return (
      <input autoFocus value={edit} onChange={(e) => setEdit(e.target.value)} onFocus={(e) => e.currentTarget.select()}
        onBlur={() => { const n = Number(edit); setEdit(null); if (Number.isFinite(n)) val.set(clamp(n), true); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); else if (e.key === "Escape") setEdit(null); e.stopPropagation(); }}
        style={{ width: 52, height: 17, padding: "0 3px", border: `1px solid ${BLUE}`, borderRadius: 2, background: C.bg, color: C.text, fontSize: FS, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }} />
    );
  return (
    <span title="좌우로 끌어 바꾸기 (Shift = 크게, Ctrl = 잘게) · 누르면 숫자 쓰기"
      onPointerDown={(e) => {
        e.preventDefault();
        const x0 = e.clientX, v0 = val.v;
        let moved = false, first = true;
        const mv = (ev: PointerEvent) => {
          const dx = ev.clientX - x0;
          if (!moved && Math.abs(dx) < 3) return;
          moved = true;
          const k = (val.step ?? 1) * (ev.shiftKey ? 10 : ev.ctrlKey ? 0.1 : 1);
          val.set(clamp(+(v0 + dx * k).toFixed(Math.max(d, 2))), first);
          first = false;
        };
        const up = () => {
          window.removeEventListener("pointermove", mv);
          if (!moved) setEdit(val.v.toFixed(d));
        };
        window.addEventListener("pointermove", mv);
        window.addEventListener("pointerup", up, { once: true });
      }}
      style={{ color: BLUE, cursor: "ew-resize", fontVariantNumeric: "tabular-nums", borderBottom: `1px dotted ${BLUE}66`, userSelect: "none", whiteSpace: "nowrap" }}>
      {val.v.toFixed(d)}{val.unit ? <span style={{ color: C.sub, marginLeft: 1 }}>{val.unit}</span> : null}
    </span>
  );
}

export function EffectControls({ name, groups, kf, tau, dur, onSeek, onWatch, onToggle, onMoveKey, onDelKey, empty }: {
  name: string;
  groups: EcGroup[];
  kf?: Keyframe[];
  /** 지금 재생 막대 — 고른 것이 나온 때부터 초 (밖이면 null) */
  tau: number | null;
  dur: number;
  onSeek: (tau: number) => void;
  /** ⏱ — 이 항목들의 키프레임 켜기(지금 시각 점) / 끄기(모두 지우기) */
  onWatch: (props: KfProp[]) => void;
  /** ◇ — 이 시각 점 찍기·빼기 */
  onToggle: (props: KfProp[]) => void;
  onMoveKey: (props: KfProp[], from: number, to: number, first: boolean) => void;
  onDelKey: (props: KfProp[], t: number) => void;
  empty?: boolean;
}) {
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<{ props: KfProp[]; t: number } | null>(null);
  const tlRef = useRef<HTMLDivElement>(null);
  const [tw, setTw] = useState(160);
  useEffect(() => {
    const el = tlRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTw(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [empty]);
  // 고른 ◆ 지우기 (Delete) — 편집기 Delete(클립 지우기)보다 먼저
  useEffect(() => {
    if (!sel) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, [contenteditable]")) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onDelKey(sel.props, sel.t);
      setSel(null);
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  });
  const X = (t: number) => (dur > 0 ? (t / dur) * (tw - 10) + 5 : 5);
  const tOf = (x: number) => Math.max(0, Math.min(dur, ((x - 5) / Math.max(1, tw - 10)) * dur));
  const LEFT = "58%";

  if (empty)
    return (
      <div style={{ padding: 14, fontSize: FS, color: C.dim, lineHeight: 1.7, fontFamily: FONT }}>
        타임라인에서 클립·글자·그래픽·자막·소리를 고르면 여기에 효과 컨트롤이 나와요.
        <br />⏱ 를 누르면 그 항목의 키프레임이 켜지고, 오른쪽 작은 타임라인에서 ◆ 를 끌어 시각을 옮겨요.
      </div>
    );

  const times = (props: KfProp[]) => [...new Set((kf || []).filter((k) => props.some((p) => kfHas(k, p))).map((k) => +k.t.toFixed(3)))].sort((a, b) => a - b);
  const startDrag = (props: KfProp[], t0: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSel({ props, t: t0 });
    const box = tlRef.current?.getBoundingClientRect();
    if (!box) return;
    let first = true, cur = t0, moved = false;
    const mv = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - e.clientX) < 3) return;
      moved = true;
      const t = +tOf(ev.clientX - box.left).toFixed(3);
      if (Math.abs(t - cur) < 0.001) return;
      onMoveKey(props, cur, t, first);
      first = false;
      cur = t;
      setSel({ props, t });
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      if (!moved) onSeek(t0);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up, { once: true });
  };
  const seekAt = (e: React.PointerEvent) => {
    const box = tlRef.current?.getBoundingClientRect();
    if (!box) return;
    e.preventDefault();
    const go = (ev: { clientX: number }) => onSeek(tOf(ev.clientX - box.left));
    go(e);
    const mv = (ev: PointerEvent) => go(ev);
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", mv), { once: true });
  };
  const sbtn = (title: string, node: React.ReactNode, fn: () => void, dis = false, color?: string) => (
    <button type="button" title={title} onClick={fn} disabled={dis}
      style={{ width: 14, height: 18, padding: 0, border: 0, background: "transparent", color: color || C.sub, opacity: dis ? 0.3 : 1, cursor: dis ? "default" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: FONT }}>{node}</button>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", fontFamily: FONT, color: C.text, fontSize: FS }}>
      {/* 머리: 이름 | 작은 타임라인 눈금 */}
      <div style={{ display: "flex", height: 22, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
        <div style={{ width: LEFT, padding: "0 8px", display: "flex", alignItems: "center", fontWeight: 700, color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div onPointerDown={seekAt} style={{ flex: 1, position: "relative", borderLeft: `1px solid ${C.line}`, cursor: "pointer" }}>
          <div style={{ position: "absolute", left: 5, right: 5, top: 4, bottom: 4, background: "#2c5d8f", borderRadius: 2, display: "flex", alignItems: "center", padding: "0 4px", fontSize: 10, color: "#fff", overflow: "hidden", whiteSpace: "nowrap" }}>{name}</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "flex", minHeight: "100%" }}>
          {/* 왼쪽: 항목 */}
          <div style={{ width: LEFT, flexShrink: 0 }}>
            {groups.map((g) => {
              const closed = shut[g.title] ?? g.open === false;
              return (
                <div key={g.title}>
                  <div style={{ height: ROW, display: "flex", alignItems: "center", gap: 4, padding: "0 6px", background: "#1f2024" }}>
                    <button type="button" onClick={() => setShut({ ...shut, [g.title]: !closed })} style={{ width: 14, padding: 0, border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", transform: closed ? undefined : "rotate(90deg)" }}><Icon name="chevron" size={10} /></button>
                    <span style={{ fontStyle: "italic", color: C.dim, fontSize: 10.5 }}>fx</span>
                    <span style={{ flex: 1, fontWeight: 700 }}>{g.title}</span>
                    {g.reset && sbtn("이 묶음 처음대로", <Icon name="undo" size={11} />, g.reset)}
                  </div>
                  {!closed && g.rows.map((r) => {
                    const ps = r.props || [];
                    const any = ps.some((p) => kfAny(kf, p));
                    const at = tau !== null && ps.some((p) => kfHasAt(kf, p, tau));
                    const ts = ps.length ? times(ps) : [];
                    const prev = tau === null ? undefined : [...ts].reverse().find((t) => t < tau - 0.02);
                    const next = tau === null ? undefined : ts.find((t) => t > tau + 0.02);
                    return (
                      <div key={r.label} style={{ height: ROW, display: "flex", alignItems: "center", gap: 5, padding: "0 4px 0 22px" }}>
                        {ps.length ? (
                          <button type="button" onClick={() => onWatch(ps)} disabled={!any && tau === null} title={any ? "키프레임 끄기 (이 항목 점 모두 지우기)" : "키프레임 켜기 (지금 시각에 점)"}
                            style={{ width: 16, height: 16, padding: 0, border: 0, borderRadius: 8, background: any ? BLUE : "transparent", color: any ? "#0b1220" : C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 13V9M10 2h4M19 5l-1.5 1.5" /></svg>
                          </button>
                        ) : <span style={{ width: 16 }} />}
                        <span style={{ width: 62, flexShrink: 0, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
                        <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          {r.values?.map((v, i) => <Scrub key={i} val={v} />)}
                          {r.check && (
                            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: C.sub }}>
                              <input type="checkbox" checked={r.check.on} onChange={(e) => r.check!.set(e.target.checked)} style={{ width: 12, height: 12, accentColor: BLUE }} />{r.check.label}
                            </label>
                          )}
                          {r.note && <span style={{ color: C.dim, fontSize: 10.5 }}>{r.note}</span>}
                        </span>
                        {any && (
                          <span style={{ display: "inline-flex", alignItems: "center" }}>
                            {sbtn("앞 키프레임", "‹", () => prev !== undefined && onSeek(prev), prev === undefined)}
                            {sbtn(at ? "이 시각 키프레임 빼기" : "이 시각에 키프레임 찍기", <Icon name={at ? "diamondFill" : "diamond"} size={10} />, () => onToggle(ps), tau === null, at ? "#fde047" : undefined)}
                            {sbtn("다음 키프레임", "›", () => next !== undefined && onSeek(next), next === undefined)}
                          </span>
                        )}
                        {r.reset && sbtn("처음대로", <Icon name="undo" size={11} />, r.reset)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* 오른쪽: 작은 키프레임 타임라인 */}
          <div ref={tlRef} style={{ flex: 1, position: "relative", borderLeft: `1px solid ${C.line}`, background: "#18191c" }}>
            {(() => {
              let y = 0;
              const out: React.ReactNode[] = [];
              for (const g of groups) {
                const closed = shut[g.title] ?? g.open === false;
                y += ROW;
                if (closed) continue;
                for (const r of g.rows) {
                  const ps = r.props || [];
                  const top = y;
                  if (ps.length) for (const t of times(ps)) {
                    const on = sel && sel.t === t && sel.props.join() === ps.join();
                    out.push(
                      <span key={`${r.label}_${t}`} onPointerDown={(e) => startDrag(ps, t, e)} title={`${t.toFixed(2)}초 — 끌어서 옮기기 · 누르고 Delete 로 지우기`}
                        style={{ position: "absolute", left: X(t) - 5, top: top + ROW / 2 - 5, width: 10, height: 10, color: on ? "#fde047" : "#cfd3da", cursor: "ew-resize", display: "flex", zIndex: 2 }}>
                        <Icon name="diamondFill" size={10} />
                      </span>
                    );
                  }
                  y += ROW;
                }
              }
              return out;
            })()}
            {tau !== null && <div style={{ position: "absolute", left: X(tau), top: 0, bottom: 0, width: 1, background: BLUE, pointerEvents: "none" }} />}
          </div>
        </div>
      </div>
    </div>
  );
}
