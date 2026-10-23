"use client";

// 타임라인 편집 (프리미어·캡컷처럼, 2026-10-20 사장님) — 텍스트 편집과 같은 프로젝트를 트랙으로 본다 (회의 10-19 A안·10장)
//  V 트랙: 위 V3·V2… = 올린 영상·사진·스티커·글자 (위일수록 앞) · 자막 줄 · V1 = 메인 클립 (자석)
//  A 트랙: A1 = 메인 영상 소리 · A2 = AI 목소리 · A3… = 배경 음악·효과음·올린 영상 소리
//  모든 것은 누르면 고른다 (Ctrl = 더하기, 빈 곳을 끌면 네모로 여러 개). 끌면 좌우 = 시간, 위아래 = 트랙
//  전문가용이라 작고 촘촘하게 (텍스트 편집과 달리 12px 글자, 마우스를 올리면 이름표)
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Clip, Layer, Project } from "./types";
import { DRAG_MEDIA, DRAG_STICKER, RATIO_SIZE, fmtTime } from "./types";
import { clipText, layerRange, sourceTimeAt, speedOf, subtitleLines, zLayers, type FlatItem } from "./timeline";
import { isSticker, layerTitle } from "./Layers";
import { loadPeaks } from "./WordDetail";
import { C, FONT, Icon } from "./ui";

/** 타임라인에서 고른 것 — 클립(V1 화면)·레이어·메인자막·AI 목소리(A2)·원본 소리(A1)·화면전환 (sub·voice·src·trans 의 id = 클립 id) */
export type Pick = { kind: "clip" | "layer" | "sub" | "voice" | "src" | "trans"; id: string };
export const samePick = (a: Pick, b: Pick) => a.kind === b.kind && a.id === b.id;

export type TimelineTools = {
  undo: () => void;
  redo: () => void;
  split: () => void;
  trimHere: (side: "l" | "r") => void;
  remove: () => void;
  flip: () => void;
  rotate: () => void;
  key: () => void;
  keyState: { can: boolean; on: boolean };
  magnet: boolean;
  onMagnet: () => void;
};

export type TrackOp = "addV" | "addA" | "del" | "rename" | "lock" | "hide";
/** 도구 (프리미어 도구 막대) — 선택 V · 앞으로 트랙 선택 A · 자르기 C · 손 H · 문자 T */
export type TlTool = "v" | "a" | "c" | "h" | "t";

type Props = {
  project: Project;
  items: FlatItem[];
  total: number;
  time: number;
  playing: boolean;
  picks: Pick[];
  tools: TimelineTools;
  onSeek: (t: number) => void;
  onPicks: (list: Pick[], add: boolean) => void;
  onTrimClip: (id: string, side: "l" | "r", dt: number, first: boolean) => void;
  onMoveClip: (id: string, targetId: string, before: boolean) => void;
  /** 레이어 끌기 — 각 레이어 새 시각 [s, e] 과 트랙 (영상 전체 초) */
  onLayersMove: (moves: { id: string; s: number; e: number; track?: number }[], first: boolean) => void;
  onTrack: (op: TrackOp, track: string, arg?: string) => void;
  onDropMedia: (clipId: string, where: "before" | "after" | "replace", raw: string) => void;
  /** 오른쪽 위 트랙(V2…)에 사진·영상 놓기 — 놓은 시각부터 */
  onDropOver: (t: number, track: number, raw: string) => void;
  onDropSticker: (t: number, track?: number) => void;
  tool?: TlTool;
  /** 자르기 도구 — 누른 것을 그 시각에서 나누기 */
  onRazor?: (pk: Pick, t: number) => void;
  /** 문자 도구 — 누른 V 트랙·시각에 글자 */
  onAddText?: (t: number, track: number) => void;
  /** 클립 두 번 누르기 — 텍스트 편집의 그 클립으로 (단어 편집) */
  onOpenText: (clipId: string) => void;
};

const HEAD = 108;
const RULER = 24;
const H_V = 42; // 위 V 트랙
const H_SUB = 22;
const H_V1 = 50;
const H_A = 32; // A1·A2
const H_A3 = 28; // A3…
const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const COL = { text: "#b45309", sticker: "#7c3aed", image: "#0e7490", video: "#1d4ed8", sub: "#a16207", music: "#15803d", sfx: "#9a3412", voice: "#1e40af", source: "#0f766e", main: "#2d6a73" };
const FS = 11.5; // 글자 크기 (전문가용)
const TOOL_CURSOR: Record<TlTool, string> = { v: "default", a: "e-resize", c: "crosshair", h: "grab", t: "text" };

const tlabel = (t: number, step: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return step < 1 ? `${m}:${s.toFixed(1).padStart(4, "0")}` : `${m}:${String(Math.round(s)).padStart(2, "0")}`;
};

/* ── 소리 파형 ── */
const voiceCache = new Map<string, Promise<number[] | null>>();
function voicePeaks(url: string): Promise<number[] | null> {
  let p = voiceCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.arrayBuffer()).then((buf) => {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      return ctx.decodeAudioData(buf).then((ab) => {
        void ctx.close();
        const d = ab.getChannelData(0);
        const per = Math.max(1, Math.floor(ab.sampleRate / 100));
        const out: number[] = [];
        for (let i = 0; i < d.length; i += per) {
          let m = 0;
          for (let j = i; j < i + per && j < d.length; j++) m = Math.max(m, Math.abs(d[j]));
          out.push(Math.min(1, m * 1.4));
        }
        return out;
      });
    }).catch(() => null);
    voiceCache.set(url, p);
  }
  return p;
}
/** 클립 소리 파형 — kind: voice(AI 목소리) / src(원본 영상 소리) */
function useWave(project: Project, clip: Clip, dur: number, kind: "voice" | "src"): number[] | null {
  const [w, setW] = useState<number[] | null>(null);
  const key = `${kind}|${clip.id}|${clip.voice?.url || ""}|${clip.voice?.o || 0}|${clip.src?.asset || ""}|${clip.src?.s}|${clip.src?.e}|${dur.toFixed(2)}|${(clip.words || []).filter((x) => x.del).length}|${(clip.cuts || []).length}`;
  useEffect(() => {
    let dead = false;
    const N = Math.max(8, Math.min(600, Math.round(dur * 20)));
    if (kind === "voice" && clip.voice?.url) {
      voicePeaks(clip.voice.url).then((pk) => {
        if (dead || !pk) return;
        const out: number[] = [];
        const vo = Number(clip.voice!.o) || 0;
        const span = Math.min(dur * speedOf(clip, project.settings), clip.voice!.duration || 1);
        for (let i = 0; i < N; i++) {
          const a = Math.floor((vo + (i / N) * span) * 100), b = Math.max(a + 1, Math.floor((vo + ((i + 1) / N) * span) * 100));
          let m = 0;
          for (let j = a; j < b && j < pk.length; j++) m = Math.max(m, pk[j]);
          out.push(m);
        }
        setW(out);
      }).catch(() => {});
    } else if (kind === "src" && clip.src && project.assets[clip.src.asset]?.hasAudio) {
      loadPeaks(project, clip.src.asset).then((pk) => {
        if (dead) return;
        const out: number[] = [];
        for (let i = 0; i < N; i++) {
          const t0 = sourceTimeAt(clip, (i / N) * dur), t1 = sourceTimeAt(clip, ((i + 1) / N) * dur);
          const a = Math.floor(t0 * pk.rate), b = Math.max(a + 1, Math.floor(t1 * pk.rate));
          let m = 0;
          for (let j = a; j < b && j < pk.arr.length; j++) m = Math.max(m, pk.arr[j]);
          out.push(m / 255);
        }
        setW(out);
      }).catch(() => {});
    } else void Promise.resolve().then(() => { if (!dead) setW(null); });
    return () => { dead = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return w;
}
function Wave({ data, color, height }: { data: number[]; color: string; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = color;
    const w = cv.width / data.length;
    data.forEach((v, i) => {
      const h = Math.max(1, v * cv.height * 0.9);
      g.fillRect(i * w, (cv.height - h) / 2, Math.max(1, w - 0.5), h);
    });
  }, [data, color]);
  return <canvas ref={ref} width={Math.max(8, data.length * 2)} height={height} style={{ width: "100%", height: "100%", display: "block" }} />;
}
function AudioPiece({ project, it, kind, left, width, height, picked, onDown, children }: { project: Project; it: FlatItem; kind: "voice" | "src"; left: number; width: number; height: number; picked: boolean; onDown: (e: React.PointerEvent) => void; children?: React.ReactNode }) {
  const c = it.clip;
  const wave = useWave(project, c, it.dur, kind);
  const muted = c.muted || c.volume === 0 || (kind === "voice" ? project.settings.off?.voice : project.settings.off?.source);
  const col = kind === "voice" ? COL.voice : COL.source;
  return (
    <div data-pk={`${kind}:${c.id}`} onPointerDown={onDown} title={`${kind === "voice" ? "AI 목소리" : "원본 소리"}${muted ? " · 꺼짐" : ""} — 눌러서 고르기`}
      style={{ position: "absolute", left, width: Math.max(2, width - 1), top: 2, height: height - 4, borderRadius: 3, background: `${col}66`, border: `1px solid ${picked ? "#fff" : col}`, boxSizing: "border-box", overflow: "hidden", cursor: "pointer", opacity: muted ? 0.4 : 1 }}>
      {wave && <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><Wave data={wave} color={kind === "voice" ? "#93c5fd" : "#5eead4"} height={height - 6} /></div>}
      {width > 60 && <span style={{ position: "absolute", left: 4, top: 1, fontSize: 10, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #000", whiteSpace: "nowrap", pointerEvents: "none" }}>{kind === "voice" ? "AI 목소리" : "원본 소리"}{muted ? " · 꺼짐" : ""}</span>}
      {children}
    </div>
  );
}

/* ── 작은 단추 ── */
function IconBtn({ icon, title, on, disabled, onClick, label }: { icon: string; title: string; on?: boolean; disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      style={{ height: 26, minWidth: 26, padding: label ? "0 7px" : 0, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, border: 0, borderRadius: 4, background: on ? C.accentDim : "transparent", color: on ? "#fff" : C.text, opacity: disabled ? 0.35 : 1, fontSize: FS, fontWeight: 600, fontFamily: FONT, cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
      onMouseEnter={(e) => { if (!disabled && !on) e.currentTarget.style.background = C.card; }} onMouseLeave={(e) => { e.currentTarget.style.background = on ? C.accentDim : "transparent"; }}>
      <Icon name={icon} size={15} />{label}
    </button>
  );
}

type Row = { id: string; kind: "v" | "sub" | "v1" | "a1" | "a2" | "a"; n: number; y: number; h: number; name: string };

export default function TimelineView(p: Props) {
  const { project, items, total, time, picks, tools } = p;
  const [Wd, Hd] = RATIO_SIZE[project.ratio] || RATIO_SIZE["16:9"];
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(800);
  const [pps, setPps] = useState(0);
  const totalRef = useRef(total);
  useEffect(() => { totalRef.current = total; }, [total]);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setViewW(w);
      setPps((v) => v || (w > 100 && totalRef.current > 0 ? Math.max(4, Math.min(400, (w - 40) / Math.max(1, totalRef.current))) : 0));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fitPps = () => Math.max(4, Math.min(400, (viewW - 40) / Math.max(1, total)));
  const k = pps || fitPps();
  const width = Math.max(viewW, total * k + 200);
  const X = (t: number) => t * k;
  const picked = (kind: Pick["kind"], id: string) => picks.some((x) => x.kind === kind && x.id === id);
  const locked = (tr: string) => Boolean(project.tl?.lock?.includes(tr));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !p.playing) return;
    const x = X(time);
    if (x < el.scrollLeft + 20 || x > el.scrollLeft + el.clientWidth - 60) el.scrollLeft = Math.max(0, x - el.clientWidth * 0.25);
  }, [time, p.playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomTo = (nk: number) => {
    const el = scrollRef.current;
    const v = Math.max(4, Math.min(400, nk));
    if (el) {
      const anchor = X(time) - el.scrollLeft;
      setPps(v);
      requestAnimationFrame(() => { el.scrollLeft = Math.max(0, time * v - anchor); });
    } else setPps(v);
  };
  function fitAll() {
    setPps(fitPps());
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }
  const onWheel = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomTo(k * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  };
  const step = STEPS.find((s) => s * k >= 70) || 600;
  const ticks: number[] = [];
  for (let t = 0; t <= total + step; t += step) ticks.push(+t.toFixed(3));

  /* ── 트랙 나누기 ── */
  const ranges = useMemo(() => {
    const m = new Map<string, { s: number; e: number }>();
    for (const l of project.layers || []) {
      const r = layerRange(project, l, items);
      if (r) m.set(l.id, r);
    }
    return m;
  }, [project, items]);
  const isVid = (l: Layer) => Boolean(l.asset && project.assets[l.asset]?.kind === "video");
  /** V 트랙 — 정해 둔 트랙(track) 그대로, 없으면 겹치는 순서대로 쌓는다 (뒤 → 앞, 시간이 겹치면 위 트랙) */
  const vPlace = useMemo(() => {
    // 앞당겨 채우기 조각(lead)은 V2 가 아니라 V1 안에 — 다음 클립 영상이 앞 클립 끝으로 이어 들어간 모습 (2026-10-23 사장님)
    const vis = zLayers(project, project.layers || []).filter((l) => ranges.has(l.id) && !l.lead);
    const placed: { l: Layer; track: number }[] = [];
    for (const l of vis) {
      let track = typeof l.track === "number" && l.track >= 2 ? l.track : 2;
      if (!(typeof l.track === "number" && l.track >= 2)) {
        const r = ranges.get(l.id)!;
        for (const q of placed) {
          const rq = ranges.get(q.l.id)!;
          if (rq.s < r.e - 0.001 && r.s < rq.e - 0.001) track = Math.max(track, q.track + 1);
        }
      }
      placed.push({ l, track });
    }
    return placed;
  }, [project, ranges]);
  /** A3… 트랙 — 음악·효과음(정해 둔 트랙 또는 빈 줄), 올린 영상 소리(연결, 빈 줄) */
  const aPlace = useMemo(() => {
    const placed: { l: Layer; track: number; linked?: boolean }[] = [];
    const free = (track: number, r: { s: number; e: number }) => !placed.some((q) => q.track === track && ranges.get(q.l.id)!.s < r.e - 0.001 && r.s < ranges.get(q.l.id)!.e - 0.001);
    const aud = (project.layers || []).filter((l) => (l.type === "music" || l.type === "sfx") && ranges.has(l.id));
    for (const l of aud.filter((x) => typeof x.track === "number" && x.track >= 3)) placed.push({ l, track: l.track! });
    for (const l of [...aud.filter((x) => !(typeof x.track === "number" && x.track >= 3) && x.type === "music"), ...aud.filter((x) => !(typeof x.track === "number" && x.track >= 3) && x.type === "sfx")]) {
      let tr = 3;
      while (!free(tr, ranges.get(l.id)!)) tr++;
      placed.push({ l, track: tr });
    }
    for (const l of (project.layers || []).filter((x) => x.type === "image" && isVid(x) && ranges.has(x.id) && project.assets[x.asset!]?.hasAudio)) {
      let tr = 3;
      while (!free(tr, ranges.get(l.id)!)) tr++;
      placed.push({ l, track: tr, linked: true });
    }
    return placed;
  }, [project, ranges]); // eslint-disable-line react-hooks/exhaustive-deps
  const NV = Math.max(project.tl?.v ?? 1, ...vPlace.map((x) => x.track), 1);
  const NA = Math.max(project.tl?.a ?? 2, ...aPlace.map((x) => x.track), 2);
  const rows: Row[] = [];
  let y = RULER;
  for (let n = NV; n >= 2; n--) { rows.push({ id: `V${n}`, kind: "v", n, y, h: H_V, name: project.tl?.names?.[`V${n}`] || `V${n}` }); y += H_V; }
  rows.push({ id: "SUB", kind: "sub", n: 0, y, h: H_SUB, name: "자막" }); y += H_SUB;
  rows.push({ id: "V1", kind: "v1", n: 1, y, h: H_V1, name: project.tl?.names?.V1 || "V1 메인" }); y += H_V1 + 6;
  rows.push({ id: "A1", kind: "a1", n: 1, y, h: H_A, name: project.tl?.names?.A1 || "A1 소리" }); y += H_A;
  rows.push({ id: "A2", kind: "a2", n: 2, y, h: H_A, name: project.tl?.names?.A2 || "A2 목소리" }); y += H_A;
  for (let n = 3; n <= NA; n++) { rows.push({ id: `A${n}`, kind: "a", n, y, h: H_A3, name: project.tl?.names?.[`A${n}`] || `A${n}` }); y += H_A3; }
  const fullH = y + 30;
  const rowOf = (id: string) => rows.find((r) => r.id === id)!;

  /* ── 끌기 공통 ── */
  const xOf = (e: { clientX: number }) => {
    const el = scrollRef.current!;
    const r = el.getBoundingClientRect();
    return e.clientX - r.left + el.scrollLeft;
  };
  const yOf = (e: { clientY: number }) => {
    const el = bodyRef.current!;
    return e.clientY - el.getBoundingClientRect().top + el.scrollTop;
  };
  const snapPts = useMemo(() => [0, total, ...items.map((x) => x.start), ...items.map((x) => x.start + x.dur), ...[...ranges.values()].flatMap((r) => [r.s, r.e])], [items, ranges, total]);
  const snap = (t: number, skip: number[] = []) => {
    if (!tools.magnet) return t;
    let best = t, bd = 8 / k;
    for (const s of [...snapPts, time]) {
      if (skip.some((x) => Math.abs(x - s) < 1e-6)) continue;
      const d = Math.abs(s - t);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  };
  const [scrub, setScrub] = useState(false);
  const startScrub = (e: React.PointerEvent) => {
    e.preventDefault();
    setScrub(true);
    const go = (ev: { clientX: number }) => p.onSeek(Math.max(0, Math.min(total, xOf(ev) / k)));
    go(e);
    const mv = (ev: PointerEvent) => go(ev);
    const up = () => { window.removeEventListener("pointermove", mv); setScrub(false); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up, { once: true });
  };
  /** 누르기 — Ctrl/Shift = 더하기·빼기, 아니면 그것만 */
  const pickOne = (pk: Pick, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
    const add = e.ctrlKey || e.metaKey || e.shiftKey;
    if (add) p.onPicks(picked(pk.kind, pk.id) ? picks.filter((x) => !samePick(x, pk)) : [...picks, pk], false);
    else if (!picked(pk.kind, pk.id)) p.onPicks([pk], false);
  };

  // 클립 다듬기
  const startTrim = (it: FlatItem, side: "l" | "r", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (locked("V1")) return;
    const x0 = xOf(e);
    let first = true;
    const edge = side === "l" ? it.start : it.start + it.dur;
    const mv = (ev: PointerEvent) => {
      const want = edge + (xOf(ev) - x0) / k;
      const sn = side === "r" ? snap(want, [edge]) : tools.magnet && Math.abs(want - time) < 8 / k ? time : want;
      p.onTrimClip(it.clip.id, side, sn - edge, first);
      first = false;
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", mv), { once: true });
  };
  // V1 클립 — 누르기 = 고르기, 좌우로 끌기 = 순서 바꾸기
  const [moving, setMoving] = useState<{ id: string; target: string; before: boolean } | null>(null);
  const startClip = (it: FlatItem, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pickOne({ kind: "clip", id: it.clip.id }, e);
    if (locked("V1")) return;
    const x0 = xOf(e);
    let drag = false;
    let last: { target: string; before: boolean } | null = null;
    const mv = (ev: PointerEvent) => {
      const x = xOf(ev);
      if (!drag && Math.abs(x - x0) < 6) return;
      drag = true;
      const t = x / k;
      const tgt = items.find((y2) => t < y2.start + y2.dur) || items[items.length - 1];
      last = { target: tgt.clip.id, before: t < tgt.start + tgt.dur / 2 };
      setMoving({ id: it.clip.id, ...last });
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      setMoving(null);
      if (drag && last && last.target !== it.clip.id) p.onMoveClip(it.clip.id, last.target, last.before);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up, { once: true });
  };
  /** 끌어 놓을 트랙 (y) — V 트랙(2…, 맨 위 위면 새 트랙) / A 트랙(3…) */
  const trackAt = (yy: number, kind: "v" | "a"): number | undefined => {
    if (kind === "v") {
      if (yy < RULER + 2) return NV + 1;
      const r = rows.find((q) => q.kind === "v" && yy >= q.y && yy < q.y + q.h);
      return r ? r.n : undefined;
    }
    const r = rows.find((q) => q.kind === "a" && yy >= q.y && yy < q.y + q.h);
    if (r) return r.n;
    const last = rows[rows.length - 1];
    if (yy >= last.y + last.h) return NA + 1;
    return undefined;
  };
  // 레이어 막대 — 몸통 = 옮기기 (좌우 시간·위아래 트랙, 고른 것 모두), 끝 = 길이
  const [ghost, setGhost] = useState<{ track: number; kind: "v" | "a" } | null>(null);
  const startLayer = (l: Layer, mode: "move" | "l" | "r", cur: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const pk: Pick = { kind: "layer", id: l.id };
    const already = picked("layer", l.id);
    pickOne(pk, e);
    const kind: "v" | "a" = l.type === "music" || l.type === "sfx" ? "a" : "v";
    if (locked(`${kind === "v" ? "V" : "A"}${cur}`)) return;
    const group = mode === "move" && already && !(e.ctrlKey || e.metaKey || e.shiftKey) ? picks.filter((x) => x.kind === "layer").map((x) => x.id) : [l.id];
    const r0s = group.map((id) => ({ id, r: ranges.get(id)!, track: (vPlace.find((q) => q.l.id === id) || aPlace.find((q) => q.l.id === id))?.track })).filter((x) => x.r);
    const r0 = ranges.get(l.id);
    if (!r0) return;
    const x0 = xOf(e);
    let first = true;
    let drag = false;
    const mv = (ev: PointerEvent) => {
      const dx = xOf(ev) - x0;
      if (!drag && Math.abs(dx) < 4 && Math.abs(ev.movementY) < 4 && mode === "move" && first) {
        // 거의 안 움직였으면 고르기만
        if (Math.abs(dx) < 4) return;
      }
      drag = true;
      const dt = dx / k;
      if (mode === "move") {
        const len = r0.e - r0.s;
        let s = Math.max(0, Math.min(total - len, r0.s + dt));
        const ss = snap(s, [r0.s]), se = snap(s + len, [r0.e]);
        s = Math.abs(ss - s) <= Math.abs(se - (s + len)) ? ss : se - len;
        const d = Math.max(-Math.min(...r0s.map((x) => x.r.s)), Math.min(total - Math.max(...r0s.map((x) => x.r.e)), s - r0.s));
        const tr = l.type === "sfx" || l.type === "music" || l.type === "text" || l.type === "image" ? trackAt(yOf(ev), kind) : undefined;
        const dTr = tr !== undefined ? tr - cur : 0;
        setGhost(tr !== undefined && tr !== cur ? { track: tr, kind } : null);
        p.onLayersMove(r0s.map((x) => ({ id: x.id, s: x.r.s + d, e: x.r.e + d, track: typeof x.track === "number" ? Math.max(kind === "v" ? 2 : 3, x.track + dTr) : undefined })), first);
      } else if (mode === "l") p.onLayersMove([{ id: l.id, s: Math.max(0, Math.min(r0.e - 0.1, snap(r0.s + dt, [r0.s]))), e: r0.e }], first);
      else p.onLayersMove([{ id: l.id, s: r0.s, e: Math.min(total, Math.max(r0.s + 0.1, snap(r0.e + dt, [r0.e]))) }], first);
      first = false;
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      setGhost(null);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up, { once: true });
  };
  // 빈 곳 끌기 = 네모로 여러 개 고르기 (빈 곳 누르기 = 고르기 풀기)
  const [band, setBand] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const startBand = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const x0 = xOf(e), y0 = yOf(e);
    const add = e.ctrlKey || e.metaKey || e.shiftKey;
    let moved = false;
    const mv = (ev: PointerEvent) => {
      const x1 = xOf(ev), y1 = yOf(ev);
      if (!moved && Math.abs(x1 - x0) + Math.abs(y1 - y0) < 5) return;
      moved = true;
      setBand({ x0, y0, x1, y1 });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mv);
      setBand(null);
      if (!moved) return p.onPicks([], false);
      const x1 = xOf(ev), y1 = yOf(ev);
      const L = Math.min(x0, x1) / k, R = Math.max(x0, x1) / k, T = Math.min(y0, y1), B = Math.max(y0, y1);
      const hit = (r: Row, s: number, en: number) => r.y < B && r.y + r.h > T && s < R && en > L;
      const out: Pick[] = [];
      for (const q of vPlace) { const r = ranges.get(q.l.id)!; if (hit(rowOf(`V${q.track}`), r.s, r.e)) out.push({ kind: "layer", id: q.l.id }); }
      for (const q of aPlace) { if (q.linked) continue; const r = ranges.get(q.l.id)!; if (hit(rowOf(`A${q.track}`), r.s, r.e)) out.push({ kind: "layer", id: q.l.id }); }
      for (const it of items) {
        if (hit(rowOf("V1"), it.start, it.start + it.dur)) out.push({ kind: "clip", id: it.clip.id });
        if (hit(rowOf("SUB"), it.start, it.start + it.dur) && subtitleLines(it.clip, it.dur, project.settings, Wd, Hd).length) out.push({ kind: "sub", id: it.clip.id });
        if (hit(rowOf("A1"), it.start, it.start + it.dur) && it.clip.type !== "voice" && it.clip.src) out.push({ kind: "src", id: it.clip.id });
        if (hit(rowOf("A2"), it.start, it.start + it.dur) && it.clip.voice) out.push({ kind: "voice", id: it.clip.id });
      }
      p.onPicks(add ? [...picks, ...out.filter((x) => !picks.some((y2) => samePick(x, y2)))] : out, false);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up, { once: true });
  };

  // 끌어 놓기 (왼쪽 자료 칸 → 타임라인)
  const clipAtX = (x: number) => {
    const t = x / k;
    return items.find((y2) => t < y2.start + y2.dur) || items[items.length - 1];
  };
  const [dropRow, setDropRow] = useState("");
  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_MEDIA) && !e.dataTransfer.types.includes(DRAG_STICKER)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const yy = yOf(e);
    const r = rows.find((q) => yy >= q.y && yy < q.y + q.h);
    const id = r?.id || (yy < RULER + 2 ? `V${NV + 1}` : "");
    if (id !== dropRow) setDropRow(id);
  };
  const onDrop = (e: React.DragEvent) => {
    setDropRow("");
    const yy = yOf(e);
    const t = Math.max(0, Math.min(total, xOf(e) / k));
    const r = rows.find((q) => yy >= q.y && yy < q.y + q.h);
    if (e.dataTransfer.types.includes(DRAG_STICKER)) {
      e.preventDefault();
      p.onDropSticker(t, r?.kind === "v" ? r.n : yy < RULER + 2 ? NV + 1 : undefined);
      return;
    }
    const raw = e.dataTransfer.getData(DRAG_MEDIA);
    if (!raw) return;
    e.preventDefault();
    if (r?.kind === "v1" && items.length) {
      const it = clipAtX(xOf(e));
      const u = (t - it.start) / it.dur;
      p.onDropMedia(it.clip.id, u < 0.25 ? "before" : u > 0.75 ? "after" : "replace", raw);
    } else if (!items.length) p.onDropMedia("", "after", raw);
    else p.onDropOver(t, r?.kind === "v" ? r.n : NV + 1, raw);
  };

  /* ── 트랙 머리 ── */
  const [menu, setMenu] = useState<{ track: string; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState("");
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);
  const trackHidden = (r: Row) => {
    if (r.kind === "v1") return Boolean(project.settings.off?.visual);
    if (r.kind === "a1") return Boolean(project.settings.off?.source);
    if (r.kind === "a2") return Boolean(project.settings.off?.voice);
    if (r.kind === "sub") return !project.settings.subtitle.on;
    const ls = r.kind === "v" ? vPlace.filter((q) => q.track === r.n) : aPlace.filter((q) => q.track === r.n && !q.linked);
    return ls.length > 0 && ls.every((q) => q.l.off);
  };
  const head = (r: Row) => {
    const audio = r.kind === "a" || r.kind === "a1" || r.kind === "a2";
    const hidden = trackHidden(r);
    const lk = locked(r.id);
    return (
      <div key={r.id} onContextMenu={(e) => { e.preventDefault(); if (r.kind !== "sub") setMenu({ track: r.id, x: e.clientX, y: e.clientY }); }}
        style={{ position: "absolute", left: 0, top: r.y, height: r.h, width: HEAD, display: "flex", alignItems: "center", gap: 2, padding: "0 4px 0 7px", boxSizing: "border-box", borderBottom: `1px solid ${C.line}`, background: r.kind === "v1" ? "#23262b" : undefined }}>
        {renaming === r.id ? (
          <input autoFocus defaultValue={r.name} onBlur={(e) => { setRenaming(""); p.onTrack("rename", r.id, e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenaming(""); }}
            style={{ width: 52, height: 18, fontSize: 11, padding: "0 3px", border: `1px solid ${C.accent}`, background: C.bg, color: C.text, borderRadius: 3 }} />
        ) : (
          <span onDoubleClick={() => r.kind !== "sub" && setRenaming(r.id)} title={r.kind === "sub" ? "메인자막" : "두 번 누르면 이름 바꾸기 · 오른쪽 클릭 = 트랙 메뉴"}
            style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: hidden ? C.dim : C.sub, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "default" }}>{r.name}</span>
        )}
        <button type="button" title={audio ? (hidden ? "소리 켜기" : "이 트랙 소리 끄기") : hidden ? "보이기" : "이 트랙 숨기기"} onClick={() => p.onTrack("hide", r.id)}
          style={{ width: 20, height: 20, padding: 0, border: 0, background: "transparent", color: hidden ? C.danger : C.dim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={audio ? (hidden ? "mute" : "volume") : "eye"} size={13} />
        </button>
        {r.kind !== "sub" && (
          <button type="button" title={lk ? "잠금 풀기" : "잠그기 (실수로 옮기지 않게)"} onClick={() => p.onTrack("lock", r.id)}
            style={{ width: 20, height: 20, padding: 0, border: 0, background: "transparent", color: lk ? C.accent : C.dim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="lock" size={12} />
          </button>
        )}
        {hidden && !audio && <span style={{ position: "absolute", left: 3, top: 2, width: 3, height: r.h - 4, background: C.danger, borderRadius: 2 }} />}
      </div>
    );
  };

  /* ── 그리기 ── */
  const curIt = items.find((x) => time >= x.start && time < x.start + x.dur);
  const kfDots = (kf: { t: number }[] | undefined, x0: number) => (kf || []).map((q, i) => (
    <span key={i} title={`키프레임 ${q.t.toFixed(2)}초`} style={{ position: "absolute", left: X(q.t) - x0 - 4, bottom: 1, color: "#fde047", display: "flex", pointerEvents: "none", filter: "drop-shadow(0 1px 1px #000)" }}><Icon name="diamondFill" size={9} /></span>
  ));
  const handles = (onL: (e: React.PointerEvent) => void, onR: (e: React.PointerEvent) => void) => (
    <>
      <span onPointerDown={onL} title="끌어서 앞 다듬기" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "#fff", cursor: "ew-resize" }} />
      <span onPointerDown={onR} title="끌어서 뒤 다듬기" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 6, background: "#fff", cursor: "ew-resize" }} />
    </>
  );
  const layerBar = (l: Layer, track: number, r: Row, linked = false) => {
    const rg = ranges.get(l.id)!;
    const on = picked("layer", l.id);
    const vid = isVid(l);
    const col = linked ? COL.video : l.type === "text" ? COL.text : l.type === "music" ? COL.music : l.type === "sfx" ? COL.sfx : vid ? COL.video : isSticker(l) ? COL.sticker : COL.image;
    const w = Math.max(5, X(rg.e) - X(rg.s));
    const icon = l.type === "text" ? "font" : l.type === "music" ? "music" : l.type === "sfx" ? "bell" : vid ? "video" : isSticker(l) ? "sticker" : "image";
    const a = l.asset ? project.assets[l.asset] : null;
    const thumb = (l.type === "image" && a && (a.thumb || (a.kind === "image" ? a.url : ""))) || "";
    return (
      <div key={l.id + (linked ? "_a" : "")} data-pk={`layer:${l.id}`} onPointerDown={(e) => (linked ? pickOne({ kind: "layer", id: l.id }, e) : startLayer(l, "move", track, e))}
        title={`${linked ? "올린 영상 소리 · " : ""}${layerTitle(l)} — ${linked ? "영상과 연결 (영상을 옮기면 같이)" : "끌어서 시각·트랙 옮기기 · 양 끝으로 길이"}`}
        style={{ position: "absolute", left: X(rg.s), top: r.y + 2, width: w, height: r.h - 4, borderRadius: 3, background: thumb && !linked ? `${col} url("${thumb}") repeat-x left center / auto 100%` : `${col}${linked ? "88" : "cc"}`, border: `1px solid ${on ? "#fff" : col}`, boxShadow: on ? "0 0 0 1px #fff" : undefined, boxSizing: "border-box", overflow: "hidden", cursor: linked ? "pointer" : "grab", opacity: l.off ? 0.4 : 1, display: "flex", alignItems: "center", gap: 3, padding: "0 4px", color: "#fff" }}>
        <span style={{ display: "flex", flexShrink: 0, filter: "drop-shadow(0 1px 1px #000)" }}><Icon name={icon} size={11} /></span>
        <span style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none", textShadow: "0 1px 2px #000" }}>{l.type === "sfx" ? l.name || l.sfx : vid ? (linked ? "소리 · " : "") + (a?.name || "영상") : layerTitle(l)}</span>
        {on && !linked && kfDots(l.kf?.map((q) => ({ t: q.t + rg.s })), X(rg.s))}
        {on && !linked && !locked(r.id) && l.type !== "sfx" && handles((e) => startLayer(l, "l", track, e), (e) => startLayer(l, "r", track, e))}
      </div>
    );
  };

  /* ── 도구 (프리미어 도구 막대) — 선택 말고 다른 도구면 누르기를 먼저 받는다 ── */
  const tool = p.tool || "v";
  const onToolDown = (e: React.PointerEvent) => {
    if (tool === "v" || e.button !== 0) return;
    const tgt = e.target as HTMLElement;
    if (tgt.closest("[data-ruler]")) return; // 눈금은 재생 막대 옮기기 그대로
    e.preventDefault();
    e.stopPropagation();
    const t = Math.max(0, Math.min(total, xOf(e) / k));
    const yy = yOf(e);
    if (tool === "h") {
      const sc = scrollRef.current, bd = bodyRef.current;
      if (!sc || !bd) return;
      const x0 = e.clientX, y0 = e.clientY, l0 = sc.scrollLeft, t0 = bd.scrollTop;
      const mv = (ev: PointerEvent) => { sc.scrollLeft = l0 - (ev.clientX - x0); bd.scrollTop = t0 - (ev.clientY - y0); };
      window.addEventListener("pointermove", mv);
      window.addEventListener("pointerup", () => window.removeEventListener("pointermove", mv), { once: true });
      return;
    }
    if (tool === "c") {
      const el = tgt.closest<HTMLElement>("[data-pk]");
      if (!el) return;
      const [kind, id] = String(el.dataset.pk).split(":") as [Pick["kind"], string];
      p.onRazor?.({ kind, id }, tools.magnet && Math.abs(t - time) < 6 / k ? time : t);
      return;
    }
    if (tool === "a") {
      // 누른 곳부터 뒤에 시작하는 것 모두 (모든 트랙)
      const out: Pick[] = [];
      for (const it of items) if (it.start >= t - 0.001) out.push({ kind: "clip", id: it.clip.id });
      for (const [id, r] of ranges) if (r.s >= t - 0.001) out.push({ kind: "layer", id });
      p.onPicks(out, false);
      return;
    }
    if (tool === "t") {
      const r = rows.find((q) => yy >= q.y && yy < q.y + q.h);
      p.onAddText?.(t, r?.kind === "v" ? r.n : yy < RULER + 2 ? NV + 1 : 2);
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: C.bg, fontFamily: FONT }}>
      {/* 도구 줄 */}
      <div style={{ display: "flex", alignItems: "center", gap: 1, height: 32, padding: "0 6px", borderBottom: `1px solid ${C.line}`, overflowX: "auto", flexShrink: 0, background: C.panel }}>
        <IconBtn icon="undo" title="되돌리기 (Ctrl+Z)" onClick={tools.undo} />
        <IconBtn icon="redo" title="다시 하기 (Ctrl+Y)" onClick={tools.redo} />
        <span style={{ width: 1, height: 16, background: C.line, margin: "0 4px" }} />
        <IconBtn icon="splitHere" title="재생 막대 자리에서 나누기 (Ctrl+B) — 고른 것, 없으면 메인 클립" onClick={tools.split} disabled={!curIt && !picks.length} />
        <IconBtn icon="trimL" title="재생 막대 앞을 잘라 내기 (Q)" onClick={() => tools.trimHere("l")} disabled={!curIt && !picks.length} />
        <IconBtn icon="trimR" title="재생 막대 뒤를 잘라 내기 (W)" onClick={() => tools.trimHere("r")} disabled={!curIt && !picks.length} />
        <IconBtn icon="trash" title="지우기 (Delete)" onClick={tools.remove} disabled={!picks.length} />
        <span style={{ width: 1, height: 16, background: C.line, margin: "0 4px" }} />
        <IconBtn icon="flipH" title="좌우 반전" onClick={tools.flip} disabled={!picks.length} />
        <IconBtn icon="rotate" title="90도 돌리기" onClick={tools.rotate} disabled={!picks.length} />
        <IconBtn icon={tools.keyState.on ? "diamondFill" : "diamond"} title={tools.keyState.on ? "이 시각 키프레임 빼기" : "키프레임 — 모든 항목을 이 시각에 찍기 (항목마다는 오른쪽 속성 칸 ◇)"} on={tools.keyState.on} onClick={tools.key} disabled={!tools.keyState.can} />
        <span style={{ flex: 1, minWidth: 8 }} />
        <IconBtn icon="magnet" title={tools.magnet ? "자석 끄기 (끝에 붙지 않게)" : "자석 켜기 (클립 끝·재생 막대에 붙기)"} on={tools.magnet} onClick={tools.onMagnet} />
        <span style={{ fontSize: FS, fontWeight: 700, fontVariantNumeric: "tabular-nums", margin: "0 8px", whiteSpace: "nowrap", color: C.text }}>{fmtTime(time)} <span style={{ color: C.dim }}>/ {fmtTime(total)}</span></span>
        <IconBtn icon="minus" title="작게 보기 (Ctrl+휠)" onClick={() => zoomTo(k / 1.4)} />
        <input type="range" min={0} max={100} step={1} value={Math.round((Math.log(k / 4) / Math.log(100)) * 100)} onChange={(e) => zoomTo(4 * Math.pow(100, Number(e.target.value) / 100))} title="타임라인 확대·축소" style={{ width: 90, accentColor: C.accent }} />
        <IconBtn icon="plus" title="크게 보기 (Ctrl+휠)" onClick={() => zoomTo(k * 1.4)} />
        <IconBtn icon="fit" title="영상 전체가 한눈에 보이게" onClick={fitAll} />
      </div>

      <div ref={bodyRef} style={{ flex: 1, minHeight: 0, display: "flex", overflowY: "auto", overflowX: "hidden" }}>
        {/* 트랙 머리 */}
        <div style={{ position: "relative", width: HEAD, flexShrink: 0, height: fullH, background: C.panel, borderRight: `1px solid ${C.line}` }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: HEAD, height: RULER, display: "flex", alignItems: "center", gap: 3, padding: "0 5px", boxSizing: "border-box", borderBottom: `1px solid ${C.line}` }}>
            <button type="button" title="영상 트랙 추가 (맨 위)" onClick={() => p.onTrack("addV", "")} style={{ flex: 1, height: 18, border: `1px solid ${C.line2}`, borderRadius: 3, background: "transparent", color: C.sub, fontSize: 10.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>+ V</button>
            <button type="button" title="소리 트랙 추가 (맨 아래)" onClick={() => p.onTrack("addA", "")} style={{ flex: 1, height: 18, border: `1px solid ${C.line2}`, borderRadius: 3, background: "transparent", color: C.sub, fontSize: 10.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>+ A</button>
          </div>
          {rows.map(head)}
        </div>
        {/* 시간 막대 */}
        <div ref={scrollRef} onWheel={onWheel} style={{ position: "relative", flex: 1, minWidth: 0, height: fullH, overflowX: "auto", overflowY: "hidden" }}
          onDragOver={onDragOver} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropRow(""); }} onDrop={onDrop}>
          <div style={{ position: "relative", width, height: fullH, cursor: TOOL_CURSOR[tool] }} onPointerDownCapture={onToolDown} onPointerDown={(e) => { if (e.target === e.currentTarget) startBand(e); }}>
            {/* 눈금 */}
            <div data-ruler="" onPointerDown={startScrub} style={{ position: "absolute", left: 0, top: 0, width, height: RULER, background: C.panel, borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
              {ticks.map((t) => (
                <div key={t} style={{ position: "absolute", left: X(t), top: 0, height: RULER, borderLeft: `1px solid ${C.line2}`, pointerEvents: "none" }}>
                  <span style={{ position: "absolute", left: 3, top: 4, fontSize: 10, color: C.dim, whiteSpace: "nowrap" }}>{tlabel(t, step)}</span>
                </div>
              ))}
            </div>
            {/* 줄 바탕 */}
            {rows.map((r) => (
              <div key={r.id} onPointerDown={(e) => { if (e.target === e.currentTarget) startBand(e); }}
                style={{ position: "absolute", left: 0, top: r.y, width, height: r.h, borderBottom: `1px solid ${C.line}`, background: dropRow === r.id ? "rgba(59,130,246,0.18)" : r.kind === "v1" ? "rgba(255,255,255,0.03)" : undefined }} />
            ))}
            {dropRow === `V${NV + 1}` && <div style={{ position: "absolute", left: 0, top: RULER, width, height: 3, background: C.accent, pointerEvents: "none" }} />}
            {ghost && (() => {
              const r = rows.find((q) => q.id === `${ghost.kind === "v" ? "V" : "A"}${ghost.track}`);
              return r ? <div style={{ position: "absolute", left: 0, top: r.y, width, height: r.h, background: "rgba(59,130,246,0.15)", pointerEvents: "none" }} />
                : <div style={{ position: "absolute", left: 0, top: ghost.kind === "v" ? RULER : fullH - 30, width, height: 3, background: C.accent, pointerEvents: "none" }} />;
            })()}

            {/* V2… */}
            {vPlace.map((q) => layerBar(q.l, q.track, rowOf(`V${q.track}`)))}
            {!vPlace.length && NV >= 2 && <span style={{ position: "absolute", left: 8, top: rowOf("V2").y + 12, fontSize: 11, color: C.dim, pointerEvents: "none" }}>왼쪽 자료 칸의 사진·영상·그래픽을 여기로 끌어 놓으세요</span>}

            {/* 자막 */}
            {items.map((it) => {
              const r = rowOf("SUB");
              const lines = subtitleLines(it.clip, it.dur, project.settings, Wd, Hd);
              if (!lines.length) return null;
              const on = picked("sub", it.clip.id);
              return lines.map((ln, i) => (
                <div key={`${it.clip.id}_${i}`} data-pk={`sub:${it.clip.id}`} onPointerDown={(e) => { e.stopPropagation(); pickOne({ kind: "sub", id: it.clip.id }, e); }} title={`메인자막 — 눌러서 고르기 (말소리에 붙어 있어 좌우로는 안 움직여요)\n${ln.text}`}
                  style={{ position: "absolute", left: X(it.start + ln.s) + 1, top: r.y + 2, width: Math.max(3, X(ln.e - ln.s) - 2), height: r.h - 4, borderRadius: 3, background: `${COL.sub}bb`, border: `1px solid ${on ? "#fff" : COL.sub}`, boxShadow: on ? "0 0 0 1px #fff" : undefined, boxSizing: "border-box", overflow: "hidden", cursor: "pointer", opacity: project.settings.subtitle.on ? 1 : 0.35 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", padding: "0 4px", whiteSpace: "nowrap", lineHeight: `${r.h - 5}px`, pointerEvents: "none" }}>{ln.text.replace(/\n/g, " ")}</span>
                  {on && i === 0 && kfDots(it.clip.subKf?.map((q) => ({ t: q.t + it.start - (it.start + ln.s) + (it.start + ln.s) })), X(it.start + ln.s))}
                </div>
              ));
            })}

            {/* V1 메인 */}
            {items.map((it, i) => {
              const r = rowOf("V1");
              const c = it.clip;
              const a = project.assets[c.visual?.asset || (c.type !== "voice" ? c.src?.asset || "" : "")] || null;
              const thumb = a ? a.thumb || (a.kind === "image" ? a.url : "") : "";
              const on = picked("clip", c.id);
              const w = Math.max(3, X(it.dur));
              const name = clipText(c).trim() || a?.name || (c.type === "silence" ? "말 없는 구간" : "화면 없음");
              return (
                <React.Fragment key={c.id}>
                  <div data-tlclip={c.id} data-pk={`clip:${c.id}`} onPointerDown={(e) => startClip(it, e)} onDoubleClick={() => p.onOpenText(c.id)}
                    title={`클립 ${i + 1} · ${fmtTime(it.dur)}\n${name}\n끌어서 순서 바꾸기 · 두 번 누르면 텍스트 편집에서 단어 고치기`}
                    style={{ position: "absolute", left: X(it.start), top: r.y + 2, width: w, height: r.h - 4, boxSizing: "border-box", borderRadius: 3, overflow: "hidden", cursor: "grab",
                      border: `1px solid ${on ? "#fff" : COL.main}`, boxShadow: on ? "0 0 0 1px #fff" : undefined, background: thumb ? `#123 url("${thumb}") repeat-x left center / auto 100%` : "#1d3a40", opacity: moving?.id === c.id ? 0.5 : 1 }}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 15, background: "linear-gradient(rgba(0,0,0,.75), rgba(0,0,0,0))", display: "flex", alignItems: "center", gap: 4, padding: "0 4px", pointerEvents: "none" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{i + 1}</span>
                      {w > 60 && <span style={{ fontSize: 10, color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>}
                    </div>
                    {w > 46 && <span style={{ position: "absolute", right: 4, bottom: 2, fontSize: 9.5, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #000", pointerEvents: "none" }}>{it.dur.toFixed(2)}</span>}
                    {(c.adj || c.rot || (c.opacity ?? 1) < 1) && w > 36 && <span title="필터·돌리기·진하기" style={{ position: "absolute", left: 4, bottom: 2, color: "#fff", display: "flex", pointerEvents: "none", filter: "drop-shadow(0 1px 1px #000)" }}><Icon name="adjust" size={10} /></span>}
                    {on && kfDots(c.kf?.map((q) => ({ t: q.t + it.start })), X(it.start))}
                    {on && !locked("V1") && handles((e) => startTrim(it, "l", e), (e) => startTrim(it, "r", e))}
                  </div>
                  {i > 0 && (
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => pickOne({ kind: "trans", id: c.id }, e)} title={c.trans ? "화면전환 — 눌러서 고르기" : "여기에 화면전환 넣기"}
                      style={{ position: "absolute", left: X(it.start) - 8, top: r.y + r.h / 2 - 8, width: 16, height: 16, padding: 0, borderRadius: 3, border: `1px solid ${c.trans ? (picked("trans", c.id) ? "#fff" : "#9ec5ff") : "transparent"}`, background: c.trans ? C.accent : "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: c.trans ? 1 : 0, zIndex: 2 }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; if (!c.trans) e.currentTarget.style.background = C.card; }}
                      onMouseLeave={(e) => { if (!c.trans) { e.currentTarget.style.opacity = "0"; e.currentTarget.style.background = "transparent"; } }}>
                      <Icon name={c.trans ? "transition" : "plus"} size={11} />
                    </button>
                  )}
                </React.Fragment>
              );
            })}
            {/* V1 — 다음 클립 영상을 앞 클립 끝으로 이어 깐 부분 (화면 경계가 그만큼 앞으로) */}
            {(project.layers || []).filter((l) => l.lead && ranges.has(l.id)).map((l) => {
              const r = rowOf("V1");
              const rg = ranges.get(l.id)!;
              const owner = items.find((x) => x.clip.id === l.lead);
              if (!owner || rg.s >= owner.start - 0.01) return null;
              const a = l.asset ? project.assets[l.asset] : null;
              const thumb = a?.thumb || "";
              const s0 = rg.s, e0 = owner.start; // 앞 클립 끝 ~ 이 클립 시작
              return (
                <div key={l.id} title={`${items.indexOf(owner) + 1}번 영상을 ${(e0 - s0).toFixed(1)}초 먼저 시작 — 앞 클립 끝을 채워요 (V1 안에서 이어 깔기)`}
                  style={{ position: "absolute", left: X(s0), top: r.y + 2, width: Math.max(2, X(e0) - X(s0)), height: r.h - 4, boxSizing: "border-box", borderRadius: "3px 0 0 3px", overflow: "hidden", pointerEvents: "none",
                    border: `1px dashed ${COL.main}`, borderRight: 0, background: thumb ? `#123 url("${thumb}") repeat-x left center / auto 100%` : "#1d3a40", opacity: 0.9, zIndex: 1 }}>
                  <span style={{ position: "absolute", left: 3, top: 1, fontSize: 9.5, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px #000" }}>↦{items.indexOf(owner) + 1}</span>
                </div>
              );
            })}
            {moving && (() => {
              const tgt = items.find((x) => x.clip.id === moving.target);
              const r = rowOf("V1");
              return tgt ? <div style={{ position: "absolute", left: X(moving.before ? tgt.start : tgt.start + tgt.dur) - 2, top: r.y, width: 3, height: r.h, background: C.accent, borderRadius: 2, pointerEvents: "none" }} /> : null;
            })()}
            {!items.length && <span style={{ position: "absolute", left: 8, top: rowOf("V1").y + 18, fontSize: 11.5, color: C.dim }}>왼쪽 사진·영상을 여기로 끌어 놓으세요</span>}

            {/* A1 영상 소리 · A2 AI 목소리 */}
            {items.map((it) => {
              const c = it.clip;
              const out: React.ReactNode[] = [];
              const r1 = rowOf("A1"), r2 = rowOf("A2");
              if (c.type !== "voice" && c.src && project.assets[c.src.asset]?.hasAudio) {
                const on = picked("src", c.id);
                out.push(<div key={c.id + "_a1"} style={{ position: "absolute", left: 0, top: r1.y, height: r1.h }}>
                  <AudioPiece project={project} it={it} kind="src" left={X(it.start)} width={X(it.dur)} height={r1.h} picked={on} onDown={(e) => { e.stopPropagation(); pickOne({ kind: "src", id: c.id }, e); }}>
                    {on && !locked("A1") && handles((e) => startTrim(it, "l", e), (e) => startTrim(it, "r", e))}
                  </AudioPiece>
                </div>);
              } else if (c.visual && project.assets[c.visual.asset]?.kind === "video" && (c.visualVolume || 0) > 0) {
                // AI 목소리 클립에 넣은 영상의 소리
                const on = picked("src", c.id);
                out.push(<div key={c.id + "_a1v"} onPointerDown={(e) => { e.stopPropagation(); pickOne({ kind: "src", id: c.id }, e); }} title="넣은 영상 소리 — 눌러서 고르기"
                  style={{ position: "absolute", left: X(it.start), top: r1.y + 2, width: Math.max(2, X(it.dur) - 1), height: r1.h - 4, borderRadius: 3, background: `${COL.source}55`, border: `1px solid ${on ? "#fff" : COL.source}`, boxSizing: "border-box", cursor: "pointer" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", padding: "0 4px", whiteSpace: "nowrap" }}>넣은 영상 소리 {Math.round((c.visualVolume || 0) * 100)}%</span>
                </div>);
              }
              if (c.type === "voice" && c.voice) {
                const on = picked("voice", c.id);
                out.push(<div key={c.id + "_a2"} style={{ position: "absolute", left: 0, top: r2.y, height: r2.h }}>
                  <AudioPiece project={project} it={it} kind="voice" left={X(it.start)} width={X(it.dur)} height={r2.h} picked={on} onDown={(e) => { e.stopPropagation(); pickOne({ kind: "voice", id: c.id }, e); }}>
                    {on && !locked("A2") && handles((e) => startTrim(it, "l", e), (e) => startTrim(it, "r", e))}
                  </AudioPiece>
                </div>);
              }
              return out;
            })}

            {/* A3… */}
            {aPlace.map((q) => layerBar(q.l, q.track, rowOf(`A${q.track}`), q.linked))}

            {/* 네모 고르기 */}
            {band && <div style={{ position: "absolute", left: Math.min(band.x0, band.x1), top: Math.min(band.y0, band.y1), width: Math.abs(band.x1 - band.x0), height: Math.abs(band.y1 - band.y0), border: `1px solid ${C.accent}`, background: "rgba(59,130,246,0.12)", pointerEvents: "none", zIndex: 4 }} />}

            {/* 재생 막대 */}
            <div style={{ position: "absolute", left: X(time) - 0.5, top: 0, width: 1, height: fullH, background: "#fff", pointerEvents: "none", zIndex: 5, boxShadow: scrub ? "0 0 4px #fff" : undefined }} />
            <div onPointerDown={startScrub} title="끌어서 재생 위치 옮기기"
              style={{ position: "absolute", left: X(time) - 6, top: 0, width: 12, height: 14, background: "#fff", clipPath: "polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)", cursor: "ew-resize", zIndex: 6 }} />
          </div>
        </div>
      </div>

      {menu && (
        <div onPointerDown={(e) => e.stopPropagation()} style={{ position: "fixed", left: menu.x, top: menu.y, zIndex: 80, minWidth: 150, padding: 4, borderRadius: 6, background: C.card, border: `1px solid ${C.line2}`, boxShadow: "0 8px 24px rgba(0,0,0,.5)", fontFamily: FONT }}>
          {([
            ["영상 트랙 추가", () => p.onTrack("addV", menu.track)],
            ["소리 트랙 추가", () => p.onTrack("addA", menu.track)],
            ["이름 바꾸기", () => setRenaming(menu.track)],
            ...(/^(V[2-9]|V\d\d|A[3-9]|A\d\d)$/.test(menu.track) ? [["트랙 지우기", () => p.onTrack("del", menu.track)] as [string, () => void]] : []),
          ] as [string, () => void][]).map(([t, fn]) => (
            <button key={t} type="button" onClick={() => { setMenu(null); fn(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", border: 0, borderRadius: 4, background: "transparent", color: t === "트랙 지우기" ? C.danger : C.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.cardHover)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 오디오 미터 (프리미어처럼) — 재생 중 지금 소리 크기. 목소리·원본 소리 파형 값으로 (dB) ── */
const peakDone = new Map<string, number[] | { rate: number; arr: Uint8Array }>();
export function AudioMeter({ project, items, time, playing }: { project: Project; items: FlatItem[]; time: number; playing: boolean }) {
  const it = items.find((x) => time >= x.start && time < x.start + x.dur);
  const [, tick] = useState(0);
  let lv = 0;
  if (it && playing) {
    const c = it.clip;
    const loc = time - it.start;
    if (c.type === "voice" && c.voice?.url && !c.muted && !project.settings.off?.voice) {
      const key = "v" + c.voice.url;
      const pk = peakDone.get(key) as number[] | undefined;
      if (!pk) void voicePeaks(c.voice.url).then((x) => { if (x) { peakDone.set(key, x); tick((n) => n + 1); } });
      else {
        const i = Math.floor(((Number(c.voice.o) || 0) + loc * speedOf(c, project.settings)) * 100);
        for (let j = Math.max(0, i - 3); j <= i + 3 && j < pk.length; j++) lv = Math.max(lv, pk[j]);
        lv *= Math.max(0, Math.min(2, (project.settings.voice?.volume ?? 1) * (c.volume ?? 1)));
      }
    } else if (c.type !== "voice" && c.src && project.assets[c.src.asset]?.hasAudio && !c.muted && !project.settings.off?.source) {
      const key = "s" + c.src.asset;
      const pk = peakDone.get(key) as { rate: number; arr: Uint8Array } | undefined;
      if (!pk) void loadPeaks(project, c.src.asset).then((x) => { peakDone.set(key, x); tick((n) => n + 1); }).catch(() => {});
      else {
        const i = Math.floor(sourceTimeAt(c, loc) * pk.rate);
        for (let j = Math.max(0, i - 3); j <= i + 3 && j < pk.arr.length; j++) lv = Math.max(lv, pk.arr[j] / 255);
        lv *= Math.max(0, Math.min(2, (project.settings.sourceVolume ?? 1) * (c.volume ?? 1)));
      }
    }
  }
  const db = lv > 0 ? 20 * Math.log10(lv) : -99;
  const h = (d: number) => Math.max(0, Math.min(1, (d + 54) / 54)); // -54 ~ 0 dB
  const marks = [0, -6, -12, -18, -24, -30, -36, -42, -48, -54];
  const bar = (
    <div style={{ position: "relative", width: 7, height: "100%", background: "#111" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${h(db) * 100}%`, background: db > -6 ? "linear-gradient(#ef4444, #eab308 12%, #22c55e 30%)" : db > -18 ? "linear-gradient(#eab308, #22c55e 40%)" : "#22c55e", transition: "height 60ms linear" }} />
    </div>
  );
  return (
    <div title="오디오 미터 — 지금 목소리·원본 소리 크기 (dB)" style={{ width: 40, flexShrink: 0, display: "flex", flexDirection: "column", background: C.panel, borderLeft: `1px solid ${C.line}`, padding: "30px 4px 18px", boxSizing: "border-box", fontFamily: FONT }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 2 }}>
        {bar}{bar}
        <div style={{ position: "relative", flex: 1 }}>
          {marks.map((m) => <span key={m} style={{ position: "absolute", left: 2, top: `${(1 - h(m)) * 100}%`, transform: "translateY(-50%)", fontSize: 8.5, color: C.dim }}>{m}</span>)}
        </div>
      </div>
      <div style={{ fontSize: 9, color: C.dim, textAlign: "center", marginTop: 4 }}>dB</div>
    </div>
  );
}
