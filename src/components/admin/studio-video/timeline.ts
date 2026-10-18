import type React from "react";
// 클립 길이·남길 구간·단어 시각 — studio-app/src/video/timeline.js 와 같은 계산 (미리보기 = 완성 영상). 둘을 같이 고친다.
import type { Clip, Layer, Project, Settings, SubtitleSettings } from "./types";

export const GAP = 0.12;

/** 남길 구간 — 지운 단어와 무음 줄이기(clip.cuts)를 뺀 원본 구간. 영상·소리·자막 단어 시각이 모두 이걸로 계산된다 */
export function keepRanges(clip: Clip): { s: number; e: number }[] {
  if (!clip.src) return [];
  let ranges = [{ s: clip.src.s, e: clip.src.e }];
  const holes: { s: number; e: number }[] = [...(clip.words || []).filter((w) => w.del), ...(clip.cuts || [])];
  for (const w of holes) {
    const next: { s: number; e: number }[] = [];
    for (const r of ranges) {
      if (w.e <= r.s || w.s >= r.e) next.push(r);
      else {
        if (w.s > r.s) next.push({ s: r.s, e: w.s });
        if (w.e < r.e) next.push({ s: w.e, e: r.e });
      }
    }
    ranges = next;
  }
  return ranges.filter((r) => r.e - r.s > 0.04);
}

export const speedOf = (clip: Clip, settings?: Settings) => Number(clip.speed || settings?.voice?.speed || 1) || 1;

/** 촬영 클립 빠르기 (영상·소리 같이, 0.1~20배). 목소리 클립은 1 */
export const srcSpeed = (clip: Clip) => (clip.type === "voice" ? 1 : Math.max(0.1, Math.min(20, Number(clip.speed) || 1)));

export function estimateSeconds(text: string, speed = 1) {
  const n = String(text || "").replace(/\s/g, "").length;
  return Math.max(1.2, n / 5 / speed);
}

export function clipDuration(clip: Clip, settings?: Settings) {
  if (clip.del) return 0;
  if (clip.type === "voice") {
    if (clip.voice && clip.voice.duration) return clip.voice.duration / speedOf(clip, settings) + GAP + Math.max(0, Number(clip.pad) || 0);
    return Math.max(0.5, Number(clip.hold) || estimateSeconds(clip.text, speedOf(clip, settings)));
  }
  return keepRanges(clip).reduce((a, r) => a + (r.e - r.s), 0) / srcSpeed(clip);
}

function spread(tokens: string[], dur: number) {
  const total = tokens.reduce((a, t) => a + t.length, 0) || 1;
  let t = 0;
  return tokens.map((w) => {
    const d = (w.length / total) * dur;
    const r = { w, s: t, e: t + d };
    t += d;
    return r;
  });
}

/** 단어 → 클립 안에서 보이는 시각 (지운 단어 제외). index 는 clip.words 의 자리 */
export function wordTimes(clip: Clip, settings?: Settings): { w: string; s: number; e: number; i: number }[] {
  const all = clip.words || [];
  if (clip.type === "voice") {
    const sp = speedOf(clip, settings);
    if (!all.length || !clip.voice) return spread(String(clip.text || "").split(/\s+/).filter(Boolean), clipDuration(clip, settings)).map((w, i) => ({ ...w, i }));
    return all.map((w, i) => ({ w: w.w, s: w.s / sp, e: w.e / sp, i })).filter((_, i) => !all[i].del);
  }
  const ranges = keepRanges(clip);
  const map = (t: number) => {
    let acc = 0;
    for (const r of ranges) {
      if (t < r.s) return acc;
      if (t <= r.e) return acc + (t - r.s);
      acc += r.e - r.s;
    }
    return acc;
  };
  const ss = srcSpeed(clip);
  return all.map((w, i) => ({ w: w.w, s: map(w.s) / ss, e: map(w.e) / ss, i })).filter((_, i) => !all[i].del);
}

/** 클립 안 시각 → 원본 영상 시각 (촬영 클립) */
export function sourceTimeAt(clip: Clip, local: number) {
  const ranges = keepRanges(clip);
  let rem = local * srcSpeed(clip);
  for (const r of ranges) {
    const d = r.e - r.s;
    if (rem <= d) return r.s + rem;
    rem -= d;
  }
  return ranges.length ? ranges[ranges.length - 1].e : 0;
}

export function clipText(clip: Clip) {
  if (clip.words && clip.words.length) return clip.words.filter((w) => !w.del).map((w) => w.w).join(" ");
  return String(clip.text || "");
}

export type FlatItem = { clip: Clip; sceneId: string; start: number; dur: number; index: number };

export function flatten(p: Project): { items: FlatItem[]; total: number } {
  const items: FlatItem[] = [];
  let t = 0;
  let index = 0;
  for (const sc of p.scenes || []) {
    for (const c of sc.clips || []) {
      const d = clipDuration(c, p.settings);
      if (d <= 0) continue;
      items.push({ clip: c, sceneId: sc.id, start: t, dur: d, index: index++ });
      t += d;
    }
  }
  return { items, total: t };
}

/** 자막 줄 나누기 (render.js wrap 과 같음) */
/** 줄 나누기 — 직접 넣은 줄바꿈(엔터)은 그대로 두고, 긴 줄만 글자 수로 나눈다 */
export function wrap(text: string, max: number) {
  const lines: string[] = [];
  for (const part of String(text).split(/\r?\n/)) {
    const words = part.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      if (cur && (cur + " " + w).length > max) {
        lines.push(cur);
        cur = w;
      } else cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

/**
 * 클립의 메인자막 서식 — 전체 서식 위에 이 클립만 따로 바꾼 항목을 덮는다 (render.js 와 같음).
 * 따로 위치(상단·하단…)를 골랐으면 전체의 옮긴 자리(x·y)는 쓰지 않는다
 */
export function subStyleOf(settings: Settings, clip?: Clip | null): SubtitleSettings {
  const base = settings.subtitle;
  const o = clip?.subStyle;
  if (!o || !Object.keys(o).length) return base;
  const m = { ...base, ...o };
  if ("position" in o && !("x" in o)) {
    delete m.x;
    delete m.y;
  }
  return m;
}

/** 클립 하나의 자막 줄들 (render.js subtitleLines 와 같음) */
export function subtitleLines(clip: Clip, dur: number, settings: Settings, W: number) {
  const st = subStyleOf(settings, clip);
  const custom = typeof clip.subText === "string";
  const text = (custom ? clip.subText! : clipText(clip)).trim();
  if (!st.on || !text || (clip.type === "silence" && !custom) || clip.sub === false) return [] as { s: number; e: number; text: string }[];
  // 한 줄 글자 수 — 줄 너비만큼, 글자가 작으면 더 많이 (render.js 와 같은 계산)
  const max = Math.max(4, Math.round(((W >= 1400 ? 26 : W >= 1080 ? 18 : 16) * Math.max(0.3, Math.min(1, st.wrap ?? 1)) * 100) / Math.max(40, st.size || 100) / (1 + Math.max(-0.1, Math.min(0.5, st.spacing ?? 0)))));
  if (custom) return evenLines(text, dur, st.length === "short" ? Math.round(max * 0.7) : max, st.length === "short" ? 1 : 2);
  if (st.length !== "short") {
    const lines = wrap(text, max);
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += 2) chunks.push(lines.slice(i, i + 2).join("\n"));
    if (chunks.length === 1) return [{ s: 0, e: dur, text: chunks[0] }];
    const words = wordTimes(clip, settings);
    let wi = 0;
    return chunks.map((ch, k) => {
      const n = ch.split(/\s+/).length;
      const s = k === 0 ? 0 : words[wi] ? words[wi].s : (dur * k) / chunks.length;
      wi += n;
      const e = k === chunks.length - 1 ? dur : words[wi] ? words[wi].s : (dur * (k + 1)) / chunks.length;
      return { s, e, text: ch };
    });
  }
  const words = wordTimes(clip, settings);
  const out: { s: number; e: number; text: string }[] = [];
  let cur: { w: string; s: number; e: number }[] = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({ s: cur[0].s, e: cur[cur.length - 1].e, text: cur.map((w) => w.w).join(" ") });
    cur = [];
  };
  for (const w of words) {
    if (cur.length && (cur.map((x) => x.w).join(" ") + " " + w.w).length > Math.round(max * 0.7)) flush();
    cur.push(w);
  }
  flush();
  out.forEach((l, i) => {
    l.e = i < out.length - 1 ? out[i + 1].s : dur;
    if (i === 0) l.s = 0;
  });
  return out;
}

/** 자막만 따로 쓴 글 — 말 시각을 모르니 글자 수만큼 시간을 나눠 차례로 (render.js evenLines 와 같음) */
export function evenLines(text: string, dur: number, max: number, perChunk: number) {
  const lines = wrap(text, max);
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += perChunk) chunks.push(lines.slice(i, i + perChunk).join("\n"));
  const total = chunks.reduce((a, c) => a + c.length, 0) || 1;
  let t = 0;
  return chunks.map((c, i) => {
    const d = i === chunks.length - 1 ? dur - t : (c.length / total) * dur;
    const r = { s: t, e: t + d, text: c };
    t += d;
    return r;
  });
}

/* ── 애셋(레이어) — render.js 와 같은 계산 ── */

/** 모든 클립 차례 (지운 것 포함) id → 자리 */
/* ── 사진 움직임 — studio-app/src/video/timeline.js 와 같은 계산 (미리보기 = 굽기) ── */
const AUTO_MOTIONS = ["zoomIn", "leftRight", "zoomOut", "rightLeft", "topBottom"] as const;
const MOTION_POWER = { low: 1.06, mid: 1.12, high: 1.2 } as const;
/** 클립 화면이 사진이면 그 사진 (직접 크기로 둔 화면은 움직이지 않는다) */
function photoOf(p: Project, c: Clip) {
  if (c.box || c.del) return null;
  const id = c.visual?.asset ?? (c.type !== "voice" ? c.src?.asset : undefined);
  const a = id ? p.assets[id] : null;
  return a && a.kind === "image" ? a : null;
}
export const isPhotoClip = (p: Project, c: Clip) => Boolean(photoOf(p, c));
/** 이 클립 사진의 움직임 — 없으면 null. 자동은 사진 클립 차례대로 돌려 써서 옆 클립과 겹치지 않는다 */
export function motionOf(p: Project, clip: Clip): { m: string; s: number } | null {
  if (!photoOf(p, clip)) return null;
  let m: string = clip.motion || (p.settings.motion === "none" ? "none" : "auto");
  if (m === "none") return null;
  if (m === "auto") {
    let i = 0;
    outer: for (const sc of p.scenes || []) for (const c of sc.clips || []) {
      if (c.id === clip.id) break outer;
      if (photoOf(p, c)) i++;
    }
    m = AUTO_MOTIONS[i % AUTO_MOTIONS.length];
  }
  return { m, s: MOTION_POWER[clip.motionPower || "mid"] || MOTION_POWER.mid };
}
/** 움직임 u(0~1) 때 — 확대 z, 옮김 x·y (화면 크기에 대한 비율). 처음→끝 고르게 */
export function motionAt(mo: { m: string; s: number }, u: number) {
  const k = Math.max(0, Math.min(1, u));
  const s = mo.s;
  const d = (s - 1) / 2;
  switch (mo.m) {
    case "zoomIn": return { z: 1 + (s - 1) * k, x: 0, y: 0 };
    case "zoomOut": return { z: s - (s - 1) * k, x: 0, y: 0 };
    case "leftRight": return { z: s, x: d - 2 * d * k, y: 0 };
    case "rightLeft": return { z: s, x: -d + 2 * d * k, y: 0 };
    case "topBottom": return { z: s, x: 0, y: d - 2 * d * k };
    case "bottomTop": return { z: s, x: 0, y: -d + 2 * d * k };
    default: return { z: 1, x: 0, y: 0 };
  }
}
export const motionCss = (mo: { m: string; s: number } | null, u: number) => {
  if (!mo) return undefined;
  const { z, x, y } = motionAt(mo, u);
  return `translate(${(x * 100).toFixed(3)}%, ${(y * 100).toFixed(3)}%) scale(${z.toFixed(4)})`;
};

export function clipOrder(p: Project) {
  const m = new Map<string, number>();
  let i = 0;
  for (const sc of p.scenes || []) for (const c of sc.clips || []) m.set(c.id, i++);
  return m;
}

/** 애셋이 덮는 클립들 (보이는 차례). 범위가 사라졌으면 빈 배열 */
export function layerItems(p: Project, layer: Layer, items: FlatItem[], order = clipOrder(p)) {
  let a = order.get(layer.from);
  let b = order.get(layer.to);
  if (a === undefined || b === undefined) return [] as FlatItem[];
  if (a > b) [a, b] = [b, a];
  return items.filter((x) => {
    const k = order.get(x.clip.id)!;
    return k >= a! && k <= b!;
  });
}

/** 단어 구간 레이어가 그 클립 안에서 나오는 시간 (클립 시작 기준 초). 단어 구간이 없으면 null = 클립 전체 */
export function layerWindow(layer: Layer, clip: Clip, settings?: Settings): { s: number; e: number } | null {
  if (typeof layer.w0 !== "number" || layer.from !== clip.id) return null;
  const w1 = typeof layer.w1 === "number" ? layer.w1 : layer.w0;
  const ts = wordTimes(clip, settings).filter((w) => w.i >= layer.w0! && w.i <= w1);
  if (!ts.length) return null;
  return { s: ts[0].s, e: ts[ts.length - 1].e };
}

/** 클립 하나에 걸린 애셋들 */
export function layersAt(p: Project, clipId: string, order = clipOrder(p)) {
  const k = order.get(clipId);
  if (k === undefined) return [] as Layer[];
  return (p.layers || []).filter((l) => {
    let a = order.get(l.from);
    let b = order.get(l.to);
    if (a === undefined || b === undefined) return false;
    if (a > b) [a, b] = [b, a];
    return k >= a && k <= b;
  });
}

/** 음악 애셋 — 예전 프로젝트의 "전체 배경 음악"도 처음~끝 음악 애셋으로 본다 */
export function musicLayers(p: Project, items: FlatItem[]): Layer[] {
  const ls = (p.layers || []).filter((l) => l.type === "music" && l.file && !l.off);
  if (ls.length) return ls;
  const m = p.settings.music;
  if (m?.on && m.file && items.length) return [{ id: "bgm", type: "music", from: items[0].clip.id, to: items[items.length - 1].clip.id, name: m.name, file: m.file, url: m.url, volume: m.volume ?? 0.15, fadeIn: 0, fadeOut: 2, offset: 0, loop: true }];
  return [];
}

/** 글을 문장(클립)으로 나누기 — 빈 줄 = 장면, 줄바꿈·마침표 = 문장 */
/**
 * 한 줄을 문장으로 — . ! ? 。 에서 끊되, 숫자 사이의 점(6008.81 · 8.00% · 102.5㎡)은 문장 끝이 아니다 (2026-10-18: 소수점에서 잘려 목소리가 토막 나던 것)
 *  끝 문장부호 뒤의 따옴표·괄호·띄어쓰기는 그 문장에 붙인다
 */
export function sentencesOf(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    cur += ch;
    const end = /[!?。]/.test(ch) || (ch === "." && !(/\d/.test(line[i - 1] || "") && /\d/.test(line[i + 1] || "")));
    if (!end) continue;
    while (i + 1 < line.length && /[.!?。\s"”’)]/.test(line[i + 1])) cur += line[++i];
    out.push(cur);
    cur = "";
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function splitScript(script: string): string[][] {
  return String(script || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split(/\n/)
        .flatMap(sentencesOf)
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .filter((b) => b.length);
}

/* ── 사진 올리기·화면 글자 애니메이션 — studio-app/src/video/timeline.js 와 같은 계산 (미리보기 = 굽기) ── */
export const AUTO_ANIMS = ["pop", "fly", "zoom", "fade", "roll"] as const;
/** 자동 → 실제 효과 (같은 종류 레이어 중 몇 번째인지로 돌려 쓴다) */
export function animOf(p: Project, layer: Layer): { in?: string; out?: string; emph?: string; grow?: string; dur: number } | null {
  const a = layer.anim;
  if (!a || (!a.in && !a.out && !a.emph && !a.grow)) return null;
  const pickAuto = () => {
    const same = (p.layers || []).filter((l) => l.type === layer.type);
    const i = Math.max(0, same.findIndex((l) => l.id === layer.id));
    return AUTO_ANIMS[i % AUTO_ANIMS.length];
  };
  const inn = a.in === "auto" ? pickAuto() : a.in;
  const out = a.out === "auto" ? (inn && a.in !== undefined ? inn : pickAuto()) : a.out;
  return { in: inn, out, emph: a.emph, grow: a.grow, dur: Math.max(0.1, Math.min(2, Number(a.dur) || 0.5)) };
}
/** 메인자막 애니메이션 — 이 클립 서식(전체 서식 + 클립만 바꾼 것)의 anim. 자동은 클립 차례대로 돌려 쓴다 */
export function subAnimOf(p: Project, clip: Clip): ReturnType<typeof animOf> {
  const a = subStyleOf(p.settings, clip).anim;
  if (!a || (!a.in && !a.out && !a.emph && !a.grow)) return null;
  const i = Math.max(0, clipOrder(p).get(clip.id) ?? 0);
  const auto = AUTO_ANIMS[i % AUTO_ANIMS.length];
  const inn = a.in === "auto" ? auto : a.in;
  const out = a.out === "auto" ? inn || auto : a.out;
  return { in: inn, out, emph: a.emph, grow: a.grow, dur: Math.max(0.1, Math.min(2, Number(a.dur) || 0.5)) };
}
/** 레이어가 보이는 동안 — 지금 클립 안 시각(초)으로 시작 a·끝 b (여러 클립에 걸치면 첫 클립에서 등장, 마지막 클립에서 퇴장) */
export function layerSpan(p: Project, layer: Layer, items: FlatItem[], clipId: string, settings?: Settings, order = clipOrder(p)): { a: number; b: number } | null {
  const cur = items.find((x) => x.clip.id === clipId);
  if (!cur) return null;
  const w = layerWindow(layer, cur.clip, settings);
  if (w) return { a: w.s, b: w.e };
  const cov = layerItems(p, layer, items, order);
  if (!cov.length) return null;
  const last = cov[cov.length - 1];
  return { a: cov[0].start - cur.start, b: last.start + last.dur - cur.start };
}
const easeOut = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const backOut = (x: number) => { const k = Math.max(0, Math.min(1, x)) - 1; return 1 + 2.70158 * k * k * k + 1.70158 * k * k; };
export type AnimLook = { op: number; sc: number; sx: number; rot: number; dx: number; dy: number };
/** 지금(local) 모양 — 투명도·크기·가로 크기(뒤집기)·회전(도)·옮김(화면 크기에 대한 비율) */
export function animAt(an: ReturnType<typeof animOf>, local: number, a: number, b: number): AnimLook {
  const r: AnimLook = { op: 1, sc: 1, sx: 1, rot: 0, dx: 0, dy: 0 };
  if (!an) return r;
  const D = Math.max(0.05, Math.min(an.dur, (b - a) / 3));
  const put = (kind: string, x: number) => {
    const e = easeOut(x);
    if (kind === "fade") r.op *= e;
    else if (kind === "fly") { r.dy += (1 - e) * 0.25; r.op *= e; }
    else if (kind === "zoom") { r.sc *= 0.3 + 0.7 * e; r.op *= e; }
    else if (kind === "pop") { r.sc *= Math.max(0, backOut(x)); r.op *= Math.min(1, x * 3); }
    else if (kind === "spin") { r.rot += (1 - e) * -180; r.sc *= 0.4 + 0.6 * e; r.op *= e; }
    else if (kind === "flip") r.sx *= Math.max(0.001, e);
    else if (kind === "roll") { r.dx += -(1 - e) * 0.35; r.rot += -(1 - e) * 360; r.op *= e; }
  };
  const tin = (local - a) / D;
  const tout = (b - local) / D;
  if (an.in && tin < 1) put(an.in, tin);
  if (an.out && tout < 1) put(an.out, tout);
  const tt = Math.max(0, local - a);
  if (an.emph === "pulse") r.sc *= 1 + 0.06 * Math.sin((2 * Math.PI * tt) / 1.1);
  else if (an.emph === "shake") r.rot += 5 * Math.sin((2 * Math.PI * tt) / 0.6);
  else if (an.emph === "blink") r.op *= 0.6 + 0.4 * (0.5 + 0.5 * Math.cos((2 * Math.PI * tt) / 1.2));
  const u = b > a ? Math.max(0, Math.min(1, (local - a) / (b - a))) : 0;
  if (an.grow === "grow") r.sc *= 1 + 0.15 * u;
  else if (an.grow === "shrink") r.sc *= 1.15 - 0.15 * u;
  return r;
}
/** 미리보기 CSS — 옮김은 화면 px */
export const animCss = (r: AnimLook, boxW: number, boxH: number): React.CSSProperties | undefined =>
  r.op === 1 && r.sc === 1 && r.sx === 1 && r.rot === 0 && r.dx === 0 && r.dy === 0
    ? undefined
    : { opacity: r.op, transform: `translate(${(r.dx * boxW).toFixed(2)}px, ${(r.dy * boxH).toFixed(2)}px) rotate(${r.rot.toFixed(2)}deg) scale(${(r.sc * r.sx).toFixed(4)}, ${r.sc.toFixed(4)})` };

/* ── 애니메이션 효과음 — studio-app/src/video/timeline.js 와 같은 계산. 파일: public/studio-sfx · studio-app/src/video/sfx ── */
export const SFX_LIST: { id: string; label: string }[] = [
  { id: "whoosh", label: "쉭" }, { id: "whoosh-short", label: "휙" }, { id: "pop", label: "뽁" }, { id: "click", label: "딸깍" },
  { id: "key-press", label: "엔터" }, { id: "typing", label: "타자" }, { id: "sparkle", label: "반짝" }, { id: "chime", label: "딩동" },
  { id: "ping", label: "띵" }, { id: "notification", label: "알림" }, { id: "impact-bass-1", label: "쿵" },
];
const SFX_AUTO: Record<string, string> = { pop: "pop", fly: "whoosh", zoom: "whoosh-short", spin: "whoosh", roll: "whoosh", flip: "click" }; // 페이드는 조용히
/** 이 효과(kind)에 낼 소리 — set: 고른 값 (없으면 dflt) */
export function sfxName(kind: string | undefined, set: string | undefined, dflt: "auto" | "none", isText: boolean): string | null {
  if (!kind) return null;
  const v = set || dflt;
  if (v === "none") return null;
  if (v !== "auto") return v;
  return isText ? "key-press" : SFX_AUTO[kind] || null; // 화면 글자는 엔터 "탁"
}
export type SfxEvent = { t: number; name: string; vol: number };
/** 영상 전체 효과음 — 사진·글자는 나타날 때(켜면 사라질 때도), 메인자막은 고른 경우 클립 첫 줄에만. 0.12초 안에 겹치면 하나만 */
export function sfxEvents(p: Project, items: FlatItem[], order = clipOrder(p)): SfxEvent[] {
  const ev: SfxEvent[] = [];
  for (const l of p.layers || []) {
    if (l.off || (l.type !== "image" && l.type !== "text")) continue;
    const an = animOf(p, l);
    if (!an || !l.anim) continue;
    const cov = layerItems(p, l, items, order);
    if (!cov.length) continue;
    const sp = layerSpan(p, l, items, cov[0].clip.id, p.settings, order);
    if (!sp) continue;
    const a = cov[0].start + sp.a, b = cov[0].start + sp.b;
    const vol = Math.max(0, Math.min(1, l.anim.sfxVol ?? 0.6));
    const n1 = sfxName(an.in, l.anim.sfx, "auto", l.type === "text");
    if (n1) ev.push({ t: a, name: n1, vol });
    const n2 = l.anim.sfxOut ? sfxName(an.out, l.anim.sfx, "auto", l.type === "text") : null;
    if (n2) ev.push({ t: Math.max(a, b - Math.min(an.dur, (b - a) / 3)), name: n2, vol });
  }
  for (const it of items) {
    const sa = subAnimOf(p, it.clip);
    const st = subStyleOf(p.settings, it.clip).anim;
    if (!sa || !st || p.settings.subtitle.on === false || it.clip.sub === false) continue;
    const n = sfxName(sa.in, st.sfx, "none", true);
    if (n) ev.push({ t: it.start, name: n, vol: Math.max(0, Math.min(1, st.sfxVol ?? 0.6)) });
  }
  ev.sort((x, y) => x.t - y.t);
  return ev.filter((e, i) => !i || e.t - ev[i - 1].t > 0.12);
}
