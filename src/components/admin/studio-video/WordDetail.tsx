"use client";

// 상세 편집 (브루처럼) — 촬영·녹화 영상 클립에서 고른 단어 하나의 소리 파형을 앞뒤 단어와 함께 크게 보여 주고,
// 양쪽 손잡이를 끌어 그 단어의 시작·끝을 0.01초 단위로 맞춘다 (Shift = 더 미세하게). ▶ 이 단어 듣기 · ↔ 넓게 보기 · ↺ 처음대로
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Clip, Project } from "./types";
import { errText, videoBridge } from "./types";
import { C, FONT, Icon } from "./ui";

type Peaks = { rate: number; arr: Uint8Array };
const cache = new Map<string, Promise<Peaks>>(); // 원본 영상 하나 = 파형 하나 (편집 화면이 켜져 있는 동안)
export function loadPeaks(project: Project, assetId: string): Promise<Peaks> {
  const b = videoBridge();
  const a = project.assets[assetId];
  const key = `${assetId}|${a?.path || ""}`;
  let p = cache.get(key);
  if (!p) {
    if (!b?.peaks) return Promise.reject(new Error("공실뉴스 스튜디오를 새 버전으로 다시 켜 주세요 (파형 기능)"));
    p = b.peaks(project, assetId).then((r) => {
      const bin = atob(r.data);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return { rate: r.rate, arr };
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
};

export function WordDetail({ project, clip, index, onSet, onReset, onPlay, onClose }: {
  project: Project;
  clip: Clip;
  index: number; // 고른 단어
  onSet: (s: number, e: number) => void; // 손을 놓으면 (되돌리기 한 번)
  onReset: () => void;
  onPlay: () => void;
  onClose: () => void;
}) {
  const words = clip.words || [];
  const w = words[index];
  const prev = index > 0 ? words[index - 1] : null;
  const next = index < words.length - 1 ? words[index + 1] : null;
  const asset = clip.src ? project.assets[clip.src.asset] : null;
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  const [err, setErr] = useState("");
  const [wide, setWide] = useState(false);
  const [draft, setDraft] = useState<{ s: number; e: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!clip.src) return;
    let dead = false;
    setErr("");
    loadPeaks(project, clip.src.asset).then((p) => !dead && setPeaks(p)).catch((e) => !dead && setErr(errText(e)));
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.src?.asset]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const s = draft ? draft.s : w?.s ?? 0;
  const e = draft ? draft.e : w?.e ?? 0;
  // 보이는 구간 — 앞 단어 시작 ~ 뒤 단어 끝 (없으면 1초), 넓게 보기면 앞뒤로 2초 더
  const pad = wide ? 2 : 0;
  const L = Math.max(0, (prev ? Math.min(prev.s, s) : s - 1) - pad);
  const dur = asset?.duration || (next ? next.e + 1 : e + 1);
  const R = Math.min(dur, (next ? Math.max(next.e, e) : e + 1) + pad);
  const H = 72;
  const xOf = (t: number) => ((t - L) / Math.max(0.01, R - L)) * width;

  // 파형 그리기
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(width * dpr);
    c.height = Math.round(H * dpr);
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, H);
    const seg = (a: number, b: number, fill: string) => {
      g.fillStyle = fill;
      g.fillRect(xOf(a), 0, Math.max(1, xOf(b) - xOf(a)), H);
    };
    if (prev) seg(prev.s, prev.e, "rgba(255,255,255,0.04)");
    if (next) seg(next.s, next.e, "rgba(255,255,255,0.04)");
    seg(s, e, "rgba(255,255,255,0.10)");
    if (!peaks) return;
    const { rate, arr } = peaks;
    for (let x = 0; x < width; x++) {
      const t0 = L + (x / width) * (R - L), t1 = L + ((x + 1) / width) * (R - L);
      let v = 0;
      for (let i = Math.floor(t0 * rate); i <= Math.floor(t1 * rate) && i < arr.length; i++) if (arr[i] > v) v = arr[i];
      const h = Math.max(1, (v / 255) * (H - 8));
      const t = (t0 + t1) / 2;
      g.fillStyle = t >= s && t <= e ? "#d4d7dd" : (prev && t >= prev.s && t <= prev.e) || (next && t >= next.s && t <= next.e) ? "#7b828e" : "#3c414c";
      g.fillRect(x, (H - h) / 2, 1, h);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peaks, width, L, R, s, e, prev?.s, prev?.e, next?.s, next?.e]);

  // 손잡이 끌기 — 0.01초 단위 (Shift 누르면 5배 미세하게)
  const drag = (edge: "s" | "e", ev: React.PointerEvent<HTMLDivElement>) => {
    ev.preventDefault();
    ev.stopPropagation();
    const el = ev.currentTarget;
    el.setPointerCapture(ev.pointerId);
    const x0 = ev.clientX;
    const base = { s, e };
    const per = (R - L) / width; // 1px = 몇 초
    const lo = prev ? prev.s + 0.05 : 0;
    const hi = next ? next.e - 0.05 : dur;
    let cur = base;
    const mv = (m: PointerEvent) => {
      const dt = ((m.clientX - x0) * per) / (m.shiftKey ? 5 : 1);
      const v = Math.round((base[edge] + dt) * 100) / 100;
      cur = edge === "s" ? { s: Math.min(Math.max(lo, v), base.e - 0.05), e: base.e } : { s: base.s, e: Math.max(Math.min(hi, v), base.s + 0.05) };
      setDraft(cur);
    };
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
      setDraft(null);
      if (Math.abs(cur.s - w.s) > 0.004 || Math.abs(cur.e - w.e) > 0.004) onSet(+cur.s.toFixed(2), +cur.e.toFixed(2));
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
  };

  const changed = Boolean(w?.o);
  const handle = (edge: "s" | "e") => (
    <div onPointerDown={(ev) => drag(edge, ev)} title={edge === "s" ? "끌어서 이 단어 시작 바꾸기 (Shift = 미세하게)" : "끌어서 이 단어 끝 바꾸기 (Shift = 미세하게)"}
      style={{ position: "absolute", top: 18, height: H + 4, left: xOf(edge === "s" ? s : e) - 6, width: 12, cursor: "ew-resize", zIndex: 3, display: "flex", justifyContent: "center", touchAction: "none" }}>
      <span style={{ width: 4, height: "100%", borderRadius: 2, background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.5)" }} />
    </div>
  );
  const roundBtn = (icon: string, tip: string, onClick: () => void, on = false, dis = false) => (
    <button type="button" title={tip} disabled={dis} onClick={(ev) => { ev.stopPropagation(); onClick(); }}
      style={{ width: 34, height: 34, borderRadius: 17, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: dis ? C.dim : C.text, cursor: dis ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={16} />
    </button>
  );
  const labels = useMemo(() => ({ L: fmt(L), R: fmt(R) }), [L, R]);
  if (!w || !clip.src) return null;
  return (
    <div data-keepword="" onClick={(ev) => ev.stopPropagation()} style={{ padding: "6px 12px 12px", fontFamily: FONT, cursor: "default" }}>
      <div ref={box} style={{ position: "relative", height: H + 44 }}>
        {/* 위: 시작 시각 */}
        <span style={{ position: "absolute", left: Math.min(width - 70, Math.max(0, xOf(s) - 32)), top: 0, padding: "1px 7px", borderRadius: 4, background: C.accent, color: "#fff", fontSize: 12, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(s)}</span>
        <span style={{ position: "absolute", left: 0, top: 4, fontSize: 11, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{labels.L}</span>
        <span style={{ position: "absolute", right: 0, top: 4, fontSize: 11, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{labels.R}</span>
        <div style={{ position: "absolute", left: 0, right: 0, top: 20, height: H, borderRadius: 6, border: `1px solid ${C.line2}`, background: "#0e0f12", overflow: "hidden" }}>
          <canvas ref={cv} style={{ width: "100%", height: H, display: "block" }} />
          {!peaks && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: err ? C.danger : C.sub }}>{err || "소리 모양을 읽는 중… (처음 한 번만)"}</span>}
        </div>
        {peaks && handle("s")}
        {peaks && handle("e")}
        {/* 아래: 이 단어 길이 */}
        <span style={{ position: "absolute", left: Math.min(width - 60, Math.max(0, xOf(e) - 50)), top: H + 24, padding: "1px 7px", borderRadius: 4, background: "rgba(59,130,246,0.18)", color: "#9ecbff", fontSize: 12, fontWeight: 800 }}>{(e - s).toFixed(2)}초</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 2 }}>
        {roundBtn("play", "이 단어 듣기", onPlay)}
        {roundBtn("range", wide ? "가까이 보기" : "앞뒤 넓게 보기", () => setWide((v) => !v), wide)}
        {roundBtn("undo", "처음 받아쓴 자리로", onReset, false, !changed)}
        {roundBtn("close", "상세 편집 닫기 (Esc)", onClose)}
      </div>
    </div>
  );
}
