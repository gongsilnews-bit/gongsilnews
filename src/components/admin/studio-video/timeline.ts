import type React from "react";
// 클립 길이·남길 구간·단어 시각 — studio-app/src/video/timeline.js 와 같은 계산 (미리보기 = 완성 영상). 둘을 같이 고친다.
import type { Adjust, Clip, Crop, Ease, Keyframe, KfProp, Layer, Project, Roll, Settings, SubtitleSettings } from "./types";
import { uid } from "./types";

export const GAP = 0.2; // 기본 문장 사이 쉼 — 0.4 는 문장마다 끊겨 들렸다 (2026-10-20 사장님, 브루처럼 짧게). gapOf(settings) 를 쓴다
/** AI 목소리 문장 사이 쉼 (초) — [AI 목소리 설정]의 문장 사이 쉼. 기본 0.4 (예전 0.12 는 급하게 들렸다, 2026-10-18 사장님) */
export const gapOf = (settings?: { voice?: { gap?: number } }) => {
  const g = Number(settings?.voice?.gap);
  return Number.isFinite(g) && g >= 0 ? Math.min(2, g) : GAP;
};

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

/** AI 목소리 뒤 쉼 — 나눈 앞 조각(ng)은 없음 */
/** 목소리 뒤 쉼 — 문장 끝(마침표·물음표·느낌표·부호 없음)은 [문장 사이 쉼], 쉼표로 끝나면 말이 이어지니 짧게 (브루처럼, 2026-10-20 사장님). timeline.js 와 같다 */
export const COMMA_GAP = 0.05;
export const endsWithComma = (t?: string) => /[,，、]\s*$/.test(String(t || "").trim());
export const voiceGap = (clip: Clip, settings?: Settings) => (clip.voice?.ng ? 0 : endsWithComma(clip.voice?.text || clip.text) ? Math.min(COMMA_GAP, gapOf(settings)) : gapOf(settings));

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
    if (clip.voice && clip.voice.duration) return clip.voice.duration / speedOf(clip, settings) + voiceGap(clip, settings) + Math.max(0, Number(clip.pad) || 0);
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

/* ── 영상 이어 깔기 (컷편집처럼, 2026-10-21 사장님) ──
   묶음(Project.rolls)의 영상을 from~to 클립 구간에 시간 순서로 꽉 채워 깐다. 영상이 끝나는 순간 다음 영상 (클립 경계와 상관없이).
   실제로는 꽉 채운 "화면 위 영상" 레이어를 조각마다 만든다 (미리보기·굽기 모두 지금 레이어 그대로) — 고칠 때마다 다시 깔아서 클립 길이가 바뀌어도 맞는다 */
export type RollPiece = { k: number; asset: string; vs: number; t0: number; t1: number };
export function rollPieces(p: Project, r: Roll, items: FlatItem[] = flatten(p).items): { pieces: RollPiece[]; A: number; B: number; short: number } | null {
  const ia = items.findIndex((x) => x.clip.id === r.from);
  const ib = items.findIndex((x) => x.clip.id === r.to);
  if (ia < 0 || ib < ia) return null;
  const A = items[ia].start, B = items[ib].start + items[ib].dur;
  const list = r.items
    .map((it, k) => ({ k, asset: it.asset, vs: Math.max(0, it.vs || 0), len: Math.max(0, (it.ve ?? (p.assets[it.asset]?.duration || 0)) - Math.max(0, it.vs || 0)) }))
    .filter((x) => x.len > 0.1 && p.assets[x.asset]);
  const pieces: RollPiece[] = [];
  let t = A;
  for (let n = 0; list.length && t < B - 0.01 && n < 300; n++) {
    if (n >= list.length && r.end === "stop") break;
    const it = list[n % list.length];
    const t1 = Math.min(B, t + it.len);
    pieces.push({ k: it.k, asset: it.asset, vs: it.vs, t0: t, t1 });
    t = t1;
  }
  return { pieces, A, B, short: Math.max(0, B - t) };
}
/** 앞 클립 화면 영상이 모자라는 끝부분 (초) — 영상이 클립보다 짧아 끝 장면에서 멈추는 길이 (2026-10-21) */
export function tailGap(p: Project, it: FlatItem): number {
  const v = it.clip.visual;
  const a = v ? p.assets[v.asset] : null;
  if (!v || !a || a.kind !== "video") return 0;
  const used = (v.e ?? a.duration) - (v.s || 0);
  return Math.max(0, +(it.dur - used).toFixed(3));
}
/** 앞당겨 채우기 — visualLead 클립마다 앞 클립 끝 lead 초 동안 꽉 채운 영상 조각 (이 클립 영상의 바로 앞부분) */
export function layLeads(p: Project) {
  const all = p.layers || [];
  const others = all.filter((l) => !l.lead);
  const items = flatten(p).items;
  const gen: Layer[] = [];
  items.forEach((it, k) => {
    const c = it.clip;
    const lead = Number(c.visualLead) || 0;
    const a = c.visual ? p.assets[c.visual.asset] : null;
    const pr = items[k - 1];
    if (lead <= 0.05 || !a || a.kind !== "video" || !pr) { if (c.visualLead && (!a || !pr)) delete c.visualLead; return; }
    const L = Math.min(lead, pr.dur, c.visual!.s || 0);
    if (L <= 0.05) return;
    // 이 클립 안까지 같은 조각으로 쭉 (2026-10-21: 클립 경계에서 화면 칸이 영상을 바꿔 끼우며 멈칫했다) — 영상이 끝나는 곳까지, 그 뒤는 클립 화면(끝 장면 멈춤)
    const avail = (c.visual!.e ?? a.duration) - (c.visual!.s || 0);
    const te = avail < it.dur - 0.01 ? Math.max(0.05, +avail.toFixed(3)) : undefined;
    gen.push({
      id: "lead-" + c.id, type: "image", lead: c.id, asset: a.id, name: a.name, vs: +((c.visual!.s || 0) - L).toFixed(3), volume: c.visualVolume || 0,
      from: pr.clip.id, to: c.id, ts: +(pr.dur - L).toFixed(3), ...(te !== undefined ? { te } : {}),
      fit: "cover", x: 0.5, y: 0.5, w: 1, opacity: 1, track: 2, lock: true,
    } as Layer);
  });
  if (gen.length || others.length !== all.length) p.layers = [...gen, ...others];
}

export function layRolls(p: Project) {
  const all = p.layers || [];
  const others = all.filter((l) => !l.roll);
  const rolls = p.rolls || [];
  if (!rolls.length) {
    if (others.length !== all.length) p.layers = others;
    return;
  }
  const items = flatten(p).items;
  const at = (t: number, end: boolean) => items.find((x) => (end ? t > x.start + 1e-6 && t <= x.start + x.dur + 1e-6 : t >= x.start - 1e-6 && t < x.start + x.dur - 1e-6)) || items[items.length - 1];
  const gen: Layer[] = [];
  p.rolls = rolls.filter((r) => {
    const res = rollPieces(p, r, items);
    if (!res) return false; // 구간 클립이 지워졌으면 묶음도 지운다
    res.pieces.forEach((pc, j) => {
      const a = at(pc.t0, false), b = at(pc.t1, true);
      const ts = pc.t0 - a.start, te = pc.t1 - b.start;
      const id = `${r.id}-${j}`;
      const old = all.find((l) => l.id === id);
      gen.push({
        id, type: "image", roll: r.id, asset: pc.asset, name: p.assets[pc.asset]?.name, vs: +pc.vs.toFixed(3), volume: r.volume ?? 0,
        from: a.clip.id, to: b.clip.id, ...(ts > 0.005 ? { ts: +ts.toFixed(3) } : {}), ...(te < b.dur - 0.005 ? { te: +Math.max(0.05, te).toFixed(3) } : {}),
        fit: "cover", x: 0.5, y: 0.5, w: 1, opacity: 1, track: 2, lock: true, ...(old?.off ? { off: true } : {}),
      } as Layer);
    });
    return true;
  });
  p.layers = [...gen, ...others]; // 맨 아래 (그래픽·글자는 그 위에)
}

/** 화면 영상 이어 붙이기 — visualCont 클립은 앞 클립과 같은 영상을 앞 클립이 끝난 자리부터 (2026-10-21 사장님: 영상 하나를 여러 클립에 쭉)
 *  앞 클립 화면이 다른 자료면 이어 붙이기가 끊긴다 (표시를 지운다) */
export function chainVisuals(p: Project) {
  const items = flatten(p).items;
  for (let i = 0; i < items.length; i++) {
    const c = items[i].clip;
    const pr = i > 0 ? items[i - 1].clip : null;
    if (!c.visualCont) {
      // 이어 붙였던 시작점이 남은 채 다른 영상으로 바뀐 클립 — 처음(0초)부터 (2026-10-21: 다른 영상 8초부터 나오던 것)
      if (c.visual && c.visual.s > 0 && pr?.visual && pr.visual.asset !== c.visual.asset && Math.abs(c.visual.s - (pr.visual.s + items[i - 1].dur)) < 0.02) c.visual = { asset: c.visual.asset, s: 0 };
      continue;
    }
    if (!pr || !pr.visual || !c.visual || pr.visual.asset !== c.visual.asset) {
      // 앞 클립 화면이 바뀌어 이어 붙이기가 끊김 — 이 클립 영상도 처음부터
      delete c.visualCont;
      if (c.visual) c.visual = { asset: c.visual.asset, s: 0 };
      continue;
    }
    const s = +(pr.visual.s + items[i - 1].dur).toFixed(3);
    if (c.visual.s !== s || c.visual.e !== undefined) c.visual = { asset: c.visual.asset, s };
    c.visualHold = true;
  }
}

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

/** 글꼴마다 글자 폭 (글자 크기 배수) — [한글, 띄어쓰기, 숫자·영문] · 글꼴 파일에서 잰 값 (studio-app timeline.js 와 같음, 2026-10-19) */
export const FONT_W: Record<string, [number, number, number]> = { "777Starlandmoon": [0.76, 0.146, 0.445], "AndongKaturiOTF": [0.824, 0.28, 0.557], "BM EULJIRO TTF": [0.838, 0.27, 0.55], "BM Euljiro 10 years later": [0.838, 0.27, 0.55], "BM HANNA Air": [0.82, 0.312, 0.53], "BR B": [0.873, 0.312, 0.544], "Batang": [1.0, 0.333, 0.596], "Binggrae II": [0.94, 0.32, 0.642], "Binggrae Melona": [0.91, 0.3, 0.579], "Binggrae Samanco Bold": [0.651, 0.25, 0.412], "Binggrae Samanco Regular": [0.634, 0.25, 0.408], "Black Han Sans": [0.834, 0.3, 0.6], "Cafe24 Dangdanghae": [0.843, 0.297, 0.518], "Cafe24 Danjunghae": [0.841, 0.296, 0.516], "Cafe24 Ohsquare": [0.887, 0.27, 0.629], "Cafe24 Oneprettynight": [0.822, 0.244, 0.456], "Cafe24 Shiningstar": [0.573, 0.31, 0.289], "ChosunilboNM": [0.91, 0.3, 0.5], "CookieRunOTF": [0.882, 0.28, 0.586], "DAON_C_MYUNGSUNGCHE(B)": [0.834, 0.244, 0.551], "DAON_C_MYUNGSUNGCHE(M)": [0.834, 0.244, 0.551], "Do Hyeon": [0.768, 0.3, 0.51], "ELAND Choice": [0.94, 0.28, 0.585], "ELAND Nice": [0.93, 0.299, 0.627], "GmarketSans": [0.962, 0.3, 0.652], "Gong Gothic Bold": [0.95, 0.275, 0.731], "Gong Gothic Medium": [0.92, 0.25, 0.672], "Gowun Dodum": [0.907, 0.31, 0.531], "Gungsuh": [1.0, 0.333, 0.583], "Jalnan OTF": [1.0, 0.28, 0.629], "JejuHallasan": [0.899, 0.28, 0.549], "Jua": [0.809, 0.3, 0.576], "KOTRA_BOLD": [0.987, 0.283, 0.635], "MARU Buri Beta": [0.97, 0.28, 0.554], "Malgun Gothic": [1.0, 0.352, 0.58], "Maplestory": [0.858, 0.265, 0.593], "MapoBackpacking": [0.84, 0.28, 0.536], "MapoDPP": [0.9, 0.29, 0.622], "MapoHongdaeFreedom": [0.95, 0.286, 0.626], "MapoPeacefull": [0.92, 0.28, 0.62], "NEXON Lv1 Gothic": [0.944, 0.328, 0.618], "NEXON Lv1 Gothic Low OTF": [0.944, 0.328, 0.618], "NEXON Lv2 Gothic": [0.874, 0.25, 0.636], "Nanum Pen": [0.595, 0.28, 0.34], "NanumGothic": [0.94, 0.28, 0.606], "NanumMyeongjo": [0.95, 0.273, 0.537], "NanumMyeongjo Regular": [0.95, 0.3, 0.537], "NanumSquareRound": [0.91, 0.25, 0.61], "Pretendard": [0.864, 0.23, 0.617], "RixYeoljeongdo": [0.98, 0.236, 0.745], "Song Myung": [0.88, 0.226, 0.493], "VITRO CORE OTF": [1.0, 0.25, 0.658], "VITRO PRIDE OTF": [0.86, 0.25, 0.54], "Wandohope": [0.879, 0.28, 0.493], "WemakepriceOTF": [0.92, 0.2, 0.64], "YANGJIN": [0.871, 0.268, 0.702], "Yanolja Yache": [0.63, 0.21, 0.435], "Yeon Sung": [0.694, 0.3, 0.468], "fromdami M": [0.684, 0.35, 0.449], "tvN Enjoystories": [0.593, 0.26, 0.336] };
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3\u4e00-\u9fff\uff00-\uffef]/;
/** 글 한 줄의 폭 (글자 크기 배수) */
export function textEm(s: string, st: { font?: string; spacing?: number; bold?: boolean }) {
  const [h, sp, d] = FONT_W[st.font || "Malgun Gothic"] || FONT_W["Malgun Gothic"];
  const ls = effSpacing(st);
  let w = 0;
  for (const ch of s) w += (ch === " " ? sp : HANGUL.test(ch) ? h : /[0-9A-Za-z]/.test(ch) ? d : 0.45) + ls;
  return w;
}
/** 한 줄에 들어가는 폭 (글자 크기 배수) — 화면 줄 너비(88% × 줄 너비)에서 테두리·상자 여백을 뺀다 */
export function capEm(st: { size?: number; wrap?: number; bg?: boolean; bgPad?: number; outlineWidth?: number; outline2Width?: number }, W: number, H: number) {
  const px = Math.min(W, H) * 0.062 * ((st.size || 100) / 100);
  const edge = st.bg ? px * 0.3 * (st.bgPad ?? 1) : Number(st.outlineWidth ?? 3) + Number(st.outline2Width || 0);
  return Math.max(1.5, ((W * 0.88 * Math.max(0.3, Math.min(1, st.wrap ?? 1)) - 2 * edge) / px) * 0.96);
}

/** 자막 줄 나누기 (render.js wrap 과 같음) */
/** 줄 나누기 — 직접 넣은 줄바꿈(엔터)은 그대로 두고, 긴 줄만 나눈다 (max: 글자 수, 또는 "이 줄이 들어가나" 판정) */
export function wrap(text: string, max: number | ((line: string) => boolean)) {
  const fits = typeof max === "number" ? (l: string) => l.length <= max : max;
  const lines: string[] = [];
  for (const part of String(text).split(/\r?\n/)) {
    const words = part.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      if (cur && !fits(cur + " " + w)) {
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
/** 한 화면 최대 줄 수 — 고른 값(1·2·3), 없으면 예전 길게(제한 없음)·짧게(1줄) */
export const maxLinesOf = (st: { maxLines?: number; length?: string }) => st.maxLines || (st.length === "short" ? 1 : 999);

export function subtitleLines(clip: Clip, dur: number, settings: Settings, W: number, H = Math.round((W * 9) / 16)) {
  const st = subStyleOf(settings, clip);
  const custom = typeof clip.subText === "string";
  const text = (custom ? clip.subText! : clipText(clip)).trim();
  if (!st.on || !text || (clip.type === "silence" && !custom) || clip.sub === false) return [] as { s: number; e: number; text: string }[];
  // 한 줄 — 실제 글자 폭(글꼴마다)으로 줄 너비에 들어가는 만큼 (글자를 키우면 줄이 짧아져 자동으로 나뉘어 나간다, render.js 와 같은 계산)
  const cap = capEm(st, W, H);
  const fit = (k = 1) => (s: string) => textEm(s, st) <= cap * k;
  // 직접 쓴 자막에 줄바꿈(엔터)을 넣었으면 — 엔터 친 그대로 줄을 나눠 한 화면에 다 (글자 수로 다시 나누지도, 시간 따라 넘기지도 않음 — 2026-10-19 사장님)
  if (custom && text.includes("\n")) return [{ s: 0, e: dur, text: text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join("\n") }];
  // 한 화면 최대 줄 수 (1·2·3줄, 2026-10-19 사장님). 없으면 예전 프로젝트 — 길게: 한 화면에 다, 짧게: 짧은 한 줄씩
  const per = maxLinesOf(st);
  if (custom) return evenLines(text, dur, !st.maxLines && st.length === "short" ? fit(0.7) : fit(), per);
  if (st.maxLines || st.length !== "short") {
    const lines = wrap(text, fit());
    // 최대 줄 수 안이면 한 화면에 다 — 넘을 때만 그 줄 수씩 말하는 때에 맞춰 넘긴다
    if (lines.length <= per) return [{ s: 0, e: dur, text: lines.join("\n") }];
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += per) chunks.push(lines.slice(i, i + per).join("\n"));
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
    if (cur.length && !fit(0.7)(cur.map((x) => x.w).join(" ") + " " + w.w)) flush();
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
export function evenLines(text: string, dur: number, max: number | ((line: string) => boolean), perChunk: number) {
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
  if (!photoOf(p, clip) || clip.kf?.length) return null; // 키프레임이 있으면 자동 움직임은 쉰다
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

/**
 * 레이어가 그 클립 안에서 나오는 시간 (클립 시작 기준 초). null = 클립 전체
 *  단어 구간(w0·w1) — 그 단어를 말하는 동안 / 초 단위 구간(ts·te, 타임라인에서 끈 것) — 시작 클립은 ts 부터, 끝 클립은 te 까지
 */
export function layerWindow(layer: Layer, clip: Clip, settings?: Settings): { s: number; e: number } | null {
  if (typeof layer.w0 === "number") {
    if (layer.from !== clip.id) return null;
    const w1 = typeof layer.w1 === "number" ? layer.w1 : layer.w0;
    const ts = wordTimes(clip, settings).filter((w) => w.i >= layer.w0! && w.i <= w1);
    if (!ts.length) return null;
    return { s: ts[0].s, e: ts[ts.length - 1].e };
  }
  const a = layer.from === clip.id ? Math.max(0, Number(layer.ts) || 0) : 0;
  const hasE = layer.to === clip.id && typeof layer.te === "number";
  if (!a && !hasE) return null;
  const d = clipDuration(clip, settings);
  const s = Math.min(a, d);
  return { s, e: hasE ? Math.max(s, Math.min(d, Number(layer.te))) : d };
}

/**
 * 화면 위에 겹치는 것(사진·스티커·화면 글자)을 쌓는 순서 — 뒤 → 앞 (회의 3-26, 2026-10-19)
 *  p.layerZ 가 있으면 배열 순서 그대로, 없으면(예전 프로젝트) 사진 먼저·글자 위. 음악은 뺀다. 굽기 timeline.js 와 같다
 */
export function zLayers<T extends { type: string }>(p: { layerZ?: number }, layers: T[]): T[] {
  const vis = layers.filter((l) => l.type === "image" || l.type === "text"); // 화면에 보이는 것만 (음악·효과음 빼고)
  if (p.layerZ) return vis;
  return [...vis.filter((l) => l.type !== "text"), ...vis.filter((l) => l.type === "text")];
}

/* ── 문자 간격·줄 간격 자동 (기본) — 값이 없으면 글꼴·모양에 맞춘 자동 값, 직접 고르면 그 값 (2026-10-19 사장님) ──
   render.js·timeline.js 와 같은 계산 */
type SpacingLook = { font?: string; bg?: boolean; box?: boolean; glow?: string; outlineWidth?: number; shadow?: number; spacing?: number; leading?: number };
/** 줄 간격 자동 — 굵고 키 큰 글꼴은 좁게, 명조·손글씨는 넓게, 상자·굵은 테두리·빛·그림자가 있으면 조금 더 */
export function autoLeading(s: SpacingLook) {
  const f = s.font || "";
  let v = /Black Han Sans|Do Hyeon|Jua/.test(f) ? 1.15 : /Myeongjo|Song Myung|Nanum Pen|Yeon Sung/.test(f) ? 1.35 : 1.28;
  if (s.bg || s.box) v += 0.12;
  else if (s.glow || Number(s.outlineWidth ?? 3) >= 6 || Number(s.shadow) > 0) v += 0.06;
  return Math.round(v * 100) / 100;
}
/** 문자 간격 자동 — 한글 고딕·Pretendard 는 살짝 좁게(-2%), 굵은 제목 글꼴·명조는 그대로, 손글씨는 살짝 넓게(+2%) */
export function autoSpacing(s: SpacingLook) {
  const f = s.font || "";
  if (/Black Han Sans|Do Hyeon|Jua|Myeongjo|Song Myung/.test(f)) return 0;
  if (/Nanum Pen|Yeon Sung/.test(f)) return 0.02;
  return -0.02;
}
/** 실제로 쓰는 문자 간격 (글자 크기 비율) */
export const effSpacing = (s: SpacingLook) => Math.max(-0.1, Math.min(0.5, typeof s.spacing === "number" ? s.spacing : autoSpacing(s)));
/** 실제로 쓰는 줄 간격 (글자 크기 배수) */
export const effLeading = (s: SpacingLook) => Math.max(0.9, Math.min(2.5, typeof s.leading === "number" ? s.leading : autoLeading(s)));

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

/**
 * 클립 하나짜리 씬이 이어지면 하나로 묶기 (문장마다 빈 줄이 있는 대본 — 회의 3-22)
 *  이름이 있는 씬은 그대로 두고, 이름 없는 1클립 씬끼리만 5개까지 묶는다
 */
export function mergeSingleScenes<T extends { title?: string; clips: unknown[] }>(scenes: T[], max = 5): T[] {
  const out: T[] = [];
  let run: T | null = null;
  for (const s of scenes) {
    const single = s.clips.length === 1 && !s.title;
    if (single && run && run.clips.length < max) {
      run.clips.push(...s.clips);
      continue;
    }
    out.push(s);
    run = single ? s : null;
  }
  return out;
}

/** [씬 정리] 결과로 씬 다시 나누기 — 클립 순서는 그대로 (from = 시작 클립 번호, 1부터) */
export function regroupScenes(p: Project, groups: { title: string; from: number }[]) {
  const clips = p.scenes.flatMap((s) => s.clips);
  if (!clips.length) return;
  const starts = groups.filter((g) => g.from >= 1 && g.from <= clips.length).sort((a, b) => a.from - b.from);
  if (!starts.length || starts[0].from !== 1) starts.unshift({ title: "", from: 1 });
  p.scenes = starts.map((g, i) => ({ id: uid(), title: g.title || undefined, clips: clips.slice(g.from - 1, (starts[i + 1]?.from ?? clips.length + 1) - 1) })).filter((s) => s.clips.length);
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
/* ── 단어별 효과 (메인자막, 쇼츠식) — studio-app/src/video/timeline.js 와 같은 계산 (미리보기 = 굽기) ── */
export type WordFx = { show?: "word" | "line"; hl?: "color" | "big" | "both"; color: string; gap: number };
export const WORD_FADE = 0.12; // 단어가 나타나는 데 걸리는 초
export function subWordOf(p: Project, clip: Clip): WordFx | null {
  const a = subStyleOf(p.settings, clip).anim;
  if (!a || (!a.wshow && !a.whl)) return null;
  return { show: a.wshow, hl: a.whl, color: a.wcolor || "#FFE000", gap: Math.max(0.1, Math.min(3, Number(a.wgap) || 0.6)) };
}
/** 자막 줄마다 단어 시각 [{w, s, e}] — 말 시각을 알면 그대로, 모르면(직접 쓴 자막) 줄 안에서 글자 수로 나눈다. e = 다음 단어 시작(강조 끝) */
export function lineWords(clip: Clip, lines: { s: number; e: number; text: string }[], settings: Settings, fx?: WordFx | null) {
  const toks = lines.map((l) => l.text.split(/\s+/).filter(Boolean));
  const total = toks.reduce((a, t) => a + t.length, 0);
  const wt = typeof clip.subText === "string" ? [] : wordTimes(clip, settings);
  const seq = wt.length === total;
  let k = 0;
  return lines.map((l, li) => {
    const ts = toks[li];
    let ws: { w: string; s: number; e: number; ls?: number }[];
    if (seq) ws = ts.map((w) => { const x = wt[k++]; return { w, s: x.s, e: x.e }; });
    else if (fx?.show) {
      // 말 시각이 없으면 (직접 쓴 자막) — 고른 빠르기로 줄마다(한 줄씩) · 단어마다(한 단어씩, 절반 간격) 차례로
      const gap = fx.gap;
      const parts = l.text.split(/\r?\n/).map((x) => x.split(/\s+/).filter(Boolean));
      ws = [];
      let q = 0;
      parts.forEach((pw, pi) => pw.forEach((w, j) => {
        const s = fx.show === "line" ? l.s + 0.05 + pi * gap + (j / Math.max(1, pw.length)) * gap : l.s + 0.05 + q * gap * 0.5;
        ws.push({ w, s, e: s });
        q++;
      }));
    } else {
      const len = ts.reduce((a, w) => a + w.length, 0) || 1;
      let t = l.s;
      ws = ts.map((w) => { const d = (w.length / len) * (l.e - l.s); const r = { w, s: t, e: t + d }; t += d; return r; });
    }
    ws.forEach((x, i) => {
      x.s = Math.max(l.s, Math.min(l.e, x.s));
      x.e = i < ws.length - 1 ? Math.max(x.s, Math.min(l.e, ws[i + 1].s)) : l.e;
    });
    // 한 줄씩 — 화면 줄(엔터·줄바꿈)마다 그 줄 첫 단어 시각에 줄 전체가 나타난다
    let wi = 0;
    for (const part of l.text.split(/\r?\n/)) {
      const n = part.split(/\s+/).filter(Boolean).length;
      const first = ws[wi];
      for (let q = 0; q < n && ws[wi + q]; q++) (ws[wi + q] as { ls?: number }).ls = first ? first.s : l.s;
      wi += n;
    }
    return ws;
  });
}
/** 그 시각 단어 모습 — a: 보이는 정도(0~1), cur: 지금 말하는 단어 */
export function wordState(fx: WordFx, w: { s: number; e: number; ls?: number }, t: number) {
  const at = fx.show === "line" ? w.ls ?? w.s : w.s;
  const a = fx.show ? Math.max(0, Math.min(1, (t - at) / WORD_FADE)) : 1;
  return { a, cur: Boolean(fx.hl) && t >= w.s && t < w.e };
}
/** 레이어가 보이는 동안 — 지금 클립 안 시각(초)으로 시작 a·끝 b (여러 클립에 걸치면 첫 클립에서 등장, 마지막 클립에서 퇴장) */
export function layerSpan(p: Project, layer: Layer, items: FlatItem[], clipId: string, settings?: Settings, order = clipOrder(p)): { a: number; b: number } | null {
  const cur = items.find((x) => x.clip.id === clipId);
  if (!cur) return null;
  if (typeof layer.w0 === "number") {
    const w = layerWindow(layer, cur.clip, settings);
    if (w) return { a: w.s, b: w.e };
  }
  const cov = layerItems(p, layer, items, order);
  if (!cov.length) return null;
  const first = cov[0];
  const last = cov[cov.length - 1];
  // 초 단위 구간 (ts·te) — 시작 클립 ts 초 뒤부터 끝 클립 te 초까지
  const a = first.start + Math.min(first.dur, Math.max(0, Number(layer.ts) || 0));
  const b = last.start + (typeof layer.te === "number" ? Math.max(0, Math.min(last.dur, layer.te)) : last.dur);
  return { a: a - cur.start, b: Math.max(a, b) - cur.start };
}

/** 레이어가 나오는 영상 전체 시각 [s, e] (초) — 타임라인 막대·키프레임 시각. 없으면 null */
export function layerRange(p: Project, layer: Layer, items: FlatItem[], order = clipOrder(p)): { s: number; e: number } | null {
  const cov = layerItems(p, layer, items, order);
  if (!cov.length) return null;
  const sp = layerSpan(p, layer, items, cov[0].clip.id, p.settings, order);
  if (!sp) return null;
  return { s: cov[0].start + sp.a, e: cov[0].start + sp.b };
}

/* ── 키프레임 (캡컷처럼, 2026-10-20 사장님) — studio-app/src/video/timeline.js 와 같은 계산 (미리보기 = 굽기) ──
   점과 점 사이를 고르게(일정하게) 또는 부드럽게 채운다. 첫 점 앞은 첫 점, 마지막 점 뒤는 마지막 점 모습 */
export const EASES: { id: Ease; label: string; desc: string }[] = [
  { id: "linear", label: "일정하게", desc: "같은 빠르기로 움직여요" },
  { id: "inout", label: "부드럽게", desc: "천천히 출발해서 천천히 멈춰요" },
  { id: "in", label: "천천히 시작", desc: "처음엔 느리다가 점점 빨라져요" },
  { id: "out", label: "천천히 끝", desc: "빠르게 출발해서 천천히 멈춰요" },
];
export function easeVal(e: Ease | undefined, u: number) {
  const x = Math.max(0, Math.min(1, u));
  return e === "inout" ? x * x * (3 - 2 * x) : e === "in" ? x * x : e === "out" ? x * (2 - x) : x;
}
/** 시각 순서로 (같은 시각은 하나) */
export const kfSort = (kf: Keyframe[]) => [...kf].sort((a, b) => a.t - b.t);
/** 이 점이 이 항목을 정하는지 (only 가 없으면 모든 항목) */
export const kfHas = (k: Keyframe, p: KfProp) => !k.only || k.only.includes(p);
export const KF_PROPS: KfProp[] = ["x", "y", "s", "r", "o"];
/** 한 항목의 그 시각 값 — 그 항목을 정한 점들 사이를 채운다. 정한 점이 없으면 base (없으면 첫 점 값) */
export function kfVal(ks: Keyframe[], p: KfProp, t: number, base?: Partial<Keyframe> | null): number {
  const pts = ks.filter((k) => kfHas(k, p));
  if (!pts.length) return typeof base?.[p] === "number" ? (base[p] as number) : ks[0][p];
  if (t <= pts[0].t) return pts[0][p];
  const last = pts[pts.length - 1];
  if (t >= last.t) return last[p];
  let i = 0;
  while (i < pts.length - 2 && t >= pts[i + 1].t) i++;
  const a = pts[i], b = pts[i + 1];
  const v = easeVal(a.e, (t - a.t) / Math.max(1e-6, b.t - a.t));
  return a[p] + (b[p] - a[p]) * v;
}
/** 그 시각 모습 — 키프레임이 없으면 null. 항목마다 따로 채운다 (base = 점이 없는 항목의 값) */
export function kfAt(kf: Keyframe[] | undefined, t: number, base?: Partial<Keyframe> | null): Keyframe | null {
  if (!kf || !kf.length) return null;
  const ks = kf.length > 1 && kf.some((k, i) => i && k.t < kf[i - 1].t) ? kfSort(kf) : kf;
  const seg = [...ks].reverse().find((k) => k.t <= t) || ks[0];
  return { t, x: kfVal(ks, "x", t, base), y: kfVal(ks, "y", t, base), s: kfVal(ks, "s", t, base), r: kfVal(ks, "r", t, base), o: kfVal(ks, "o", t, base), e: seg.e };
}
/** 이 항목에 점이 하나라도 있는지 */
export const kfAny = (kf: Keyframe[] | undefined, p: KfProp) => Boolean(kf?.some((k) => kfHas(k, p)));
/** 이 시각에 이 항목 점이 있는지 */
export const kfHasAt = (kf: Keyframe[] | undefined, p: KfProp, t: number) => Boolean(kf?.some((k) => Math.abs(k.t - t) < 0.5 / 30 && kfHas(k, p)));
/** 항목 ◇ — 이 시각에 이 항목 점이 있으면 빼고, 없으면 지금 값으로 찍는다 (cur = 지금 모습 전체) */
export function kfToggleProp(kf: Keyframe[] | undefined, t: number, p: KfProp, cur: Keyframe): Keyframe[] | undefined {
  const list = (kf || []).map((k) => ({ ...k }));
  const i = list.findIndex((k) => Math.abs(k.t - t) < 0.5 / 30);
  if (i >= 0) {
    const k = list[i];
    if (kfHas(k, p)) {
      const only = (k.only || KF_PROPS).filter((x) => x !== p);
      if (!only.length) list.splice(i, 1);
      else list[i] = { ...k, only };
    } else list[i] = { ...k, [p]: cur[p], only: [...(k.only || []), p] };
  } else list.push({ ...cur, t: Math.max(0, +t.toFixed(3)), e: undefined, only: [p] });
  const out = kfSort(list);
  return out.length ? out : undefined;
}
/** 항목들의 점 모두 지우기 (⏱ 끄기) */
export function kfClearProps(kf: Keyframe[] | undefined, props: KfProp[]): Keyframe[] | undefined {
  const out: Keyframe[] = [];
  for (const k of kf || []) {
    const only = (k.only || KF_PROPS).filter((x) => !props.includes(x));
    if (only.length) out.push({ ...k, only: only.length === KF_PROPS.length ? undefined : only });
  }
  return out.length ? kfSort(out) : undefined;
}
/** 항목들의 점 하나를 다른 시각으로 (효과 컨트롤 ◆ 끌기) — 다른 항목과 같이 있던 점은 그 항목만 떼어 옮긴다 */
export function kfMoveProps(kf: Keyframe[] | undefined, props: KfProp[], from: number, to: number): Keyframe[] | undefined {
  if (!kf?.length) return kf;
  const i = kf.findIndex((k) => Math.abs(k.t - from) < 0.5 / 30 && props.some((p) => kfHas(k, p)));
  if (i < 0) return kf;
  const k = kf[i];
  const mine = props.filter((p) => kfHas(k, p));
  const rest = (k.only || KF_PROPS).filter((p) => !mine.includes(p));
  const list = kf.map((x) => ({ ...x }));
  if (rest.length) list[i] = { ...k, only: rest };
  else list.splice(i, 1);
  const tt = Math.max(0, +to.toFixed(3));
  const j = list.findIndex((x) => Math.abs(x.t - tt) < 0.5 / 30);
  if (j >= 0) list[j] = { ...list[j], ...Object.fromEntries(mine.map((p) => [p, k[p]])), only: list[j].only ? [...new Set([...list[j].only!, ...mine])] : undefined };
  else list.push({ ...k, t: tt, only: mine.length === KF_PROPS.length ? undefined : mine });
  return kfSort(list);
}
/** 자르기 값 (0~0.95, 좌우·위아래 합이 넘치지 않게) — 미리보기·굽기 같은 값 */
export function cropOf(c?: Crop | null) {
  if (!c) return null;
  const cl = (v?: number) => Math.max(0, Math.min(0.95, Number(v) || 0));
  let l = cl(c.l), r = cl(c.r), t = cl(c.t), b = cl(c.b);
  if (l + r > 0.95) { const k = 0.95 / (l + r); l *= k; r *= k; }
  if (t + b > 0.95) { const k = 0.95 / (t + b); t *= k; b *= k; }
  return l || r || t || b ? { l, r, t, b } : null;
}
/** 값 바꾸기 (끌기·숫자) — 그 항목에 점이 있으면 이 시각 점을 고치거나 새로 찍고(바뀐 kf), 점이 없으면 null (= 고정 값을 바꾼다) */
export function kfSetProps(kf: Keyframe[] | undefined, t: number, patch: Partial<Record<KfProp, number>>, cur: Keyframe): { kf?: Keyframe[]; rest: Partial<Record<KfProp, number>> } {
  const rest: Partial<Record<KfProp, number>> = {};
  let list = kf ? kf.map((k) => ({ ...k })) : undefined;
  for (const p of Object.keys(patch) as KfProp[]) {
    const v = patch[p]!;
    if (!kfAny(list, p)) { rest[p] = v; continue; }
    const i = list!.findIndex((k) => Math.abs(k.t - t) < 0.5 / 30);
    if (i >= 0) list![i] = { ...list![i], [p]: v, ...(list![i].only && !list![i].only!.includes(p) ? { only: [...list![i].only!, p] } : {}) };
    else list!.push({ ...cur, [p]: v, t: Math.max(0, +t.toFixed(3)), e: undefined, only: [p] });
    list = kfSort(list!);
  }
  return { kf: list, rest };
}
/** 키프레임이 이 시각(±반 칸)에 있는지 — 있으면 그 자리 번호 */
export const kfIndexAt = (kf: Keyframe[] | undefined, t: number) => (kf || []).findIndex((k) => Math.abs(k.t - t) < 0.5 / 30);
/** 키프레임 넣기·고치기 — 이 시각에 있으면 바꾸고, 없으면 지금 모습으로 새로 (시각 순서) */
export function kfUpsert(kf: Keyframe[] | undefined, t: number, patch: Partial<Keyframe>, base: Keyframe): Keyframe[] {
  const list = kf ? [...kf] : [];
  const i = kfIndexAt(list, t);
  const cur = i >= 0 ? list[i] : { ...(kfAt(list, t) || base), t: Math.max(0, +t.toFixed(3)) };
  const next: Keyframe = { ...cur, ...patch, t: cur.t };
  if (i >= 0) list[i] = next;
  else list.push(next);
  return kfSort(list);
}

/** 키프레임이 있는 레이어의 그 시각(tau = 나타난 때부터 초) 모습 — 자리·크기·회전·진하기를 바꾼 사본. 글자 진하기는 kfo */
export function layerAtTime<T extends Layer>(l: T, tau: number): T & { kfo?: number } {
  // 글자 진하기 (타임라인 속성 칸, 2026-10-20) — 키프레임이 없어도 kfo 로
  if (l.type === "text" && !l.kf?.length) return (l.opacity ?? 1) < 0.999 ? { ...l, kfo: Math.max(0, l.opacity ?? 1) } : l;
  if (!l.kf?.length || (l.type === "image" && (l.fit === "cover" || l.fit === "contain"))) return l;
  const k = kfAt(l.kf, tau, { x: l.x ?? 0.5, y: l.y ?? 0.5, s: 1, r: Number(l.rot) || 0, o: 1 })!;
  if (l.type === "image") return { ...l, x: k.x, y: k.y, rot: k.r, w: (l.w ?? 0.35) * k.s, opacity: Math.max(0, Math.min(1, (l.opacity ?? 1) * k.o)) };
  return { ...l, x: k.x, y: k.y, rot: k.r, size: (l.size ?? 100) * k.s, kfo: Math.max(0, Math.min(1, k.o * (l.opacity ?? 1))) };
}
/** 사진 올리기·스티커 자리 (화면 px) — 키프레임이 있으면 화면 밖으로도 (날아 들어오기), 없으면 예전처럼 화면 안으로. 굽기와 같은 계산 */
export function imgRect(l: Layer, a: { width?: number; height?: number } | undefined, W: number, H: number) {
  const pw = Math.max(0.03, Math.min(4, l.w ?? 0.35)) * W;
  const ph = a?.width && a?.height ? (pw * a.height) / a.width : pw;
  const cx = (l.x ?? 0.5) * W, cy = (l.y ?? 0.5) * H;
  if (l.kf?.length) return { left: cx - pw / 2, top: cy - ph / 2, width: pw, height: ph };
  return { left: Math.max(0, Math.min(W - pw, cx - pw / 2)), top: Math.max(0, Math.min(H - ph, cy - ph / 2)), width: pw, height: ph };
}

/** 클립 화면이 보이는 네모 (화면 0~1, 가운데 x·y, 폭 w·높이 h) — 직접 크기(box)면 그 자리, 아니면 채우기대로. 미리보기·굽기 같은 계산 */
export function clipBaseRect(p: Project, c: Clip, W: number, H: number) {
  const id = c.visual?.asset ?? (c.type !== "voice" ? c.src?.asset : undefined);
  const a = id ? p.assets[id] : null;
  const ar = a && a.width && a.height ? a.width / a.height : W / H;
  if (c.box) {
    const w = c.box.w;
    return { x: c.box.x, y: c.box.y, w, h: (w * W) / ar / H };
  }
  const fill = c.fill || p.settings.fill;
  if (ar > W / H !== (fill === "cover")) return { x: 0.5, y: 0.5, w: 1, h: W / ar / H };
  return { x: 0.5, y: 0.5, w: (H * ar) / W, h: 1 };
}
/** 클립 화면 움직임 — 키프레임, 또는 돌리기·진하기만 바꾼 것(한 점). 없으면 null (예전처럼 채우기) */
export function clipKeys(p: Project, c: Clip, W: number, H: number): Keyframe[] | null {
  if (c.kf?.length) return kfSort(c.kf);
  const r = Number(c.rot) || 0;
  const o = c.opacity ?? 1;
  if (!r && o >= 0.999) return null;
  const b = clipBaseRect(p, c, W, H);
  return [{ t: 0, x: b.x, y: b.y, s: 1, r, o }];
}
/** 클립 화면 키프레임의 기본 모습 (첫 점을 넣을 때) */
export function clipKeyBase(p: Project, c: Clip, W: number, H: number): Keyframe {
  const b = clipBaseRect(p, c, W, H);
  return { t: 0, x: b.x, y: b.y, s: 1, r: Number(c.rot) || 0, o: c.opacity ?? 1 };
}

/* ── 색 보정·필터 (캡컷 [필터]·[조정]) — 색 행렬 하나 (3줄 × [빨강·초록·파랑·더하기]), 미리보기 SVG feColorMatrix = 굽기 colorchannelmixer ──
   studio-app/src/video/timeline.js 와 같은 계산 */
export type Mat = number[][]; // 3×4
const I3: Mat = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
const mul = (A: Mat, B: Mat): Mat => A.map((r) => [0, 1, 2, 3].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j] + (j === 3 ? r[3] : 0)));
const satM = (s: number): Mat => [
  [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0],
  [0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0],
  [0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s, 0],
];
const gainM = (r: number, g: number, b: number): Mat => [[r, 0, 0, 0], [0, g, 0, 0], [0, 0, b, 0]];
const conM = (c: number): Mat => [[c, 0, 0, 0.5 * (1 - c)], [0, c, 0, 0.5 * (1 - c)], [0, 0, c, 0.5 * (1 - c)]];
const liftM = (v: number): Mat => [[1, 0, 0, v], [0, 1, 0, v], [0, 0, 1, v]];
/** 필터 (이름 · 설명 · 색 행렬) — 부동산 영상에 맞게 */
export const FILTERS: { id: string; label: string; desc: string; m: Mat }[] = [
  { id: "home", label: "매물 화사하게", desc: "집 사진을 밝고 따뜻하게 (공실뉴스 추천)", m: mul(gainM(1.06, 1.03, 0.97), mul(satM(1.15), mul(conM(1.05), gainM(1.08, 1.08, 1.08)))) },
  { id: "vivid", label: "선명하게", desc: "색을 또렷하게", m: mul(satM(1.35), conM(1.1)) },
  { id: "bright", label: "밝게", desc: "어두운 사진을 환하게", m: mul(satM(1.08), mul(conM(0.95), gainM(1.14, 1.14, 1.14))) },
  { id: "warm", label: "따뜻하게", desc: "노을처럼 포근한 색", m: mul(gainM(1.12, 1.02, 0.86), satM(1.05)) },
  { id: "cool", label: "차갑게", desc: "깔끔한 파란 느낌", m: mul(gainM(0.9, 1, 1.12), satM(0.98)) },
  { id: "film", label: "영화처럼", desc: "차분하고 깊은 색", m: mul(gainM(0.96, 1, 1.04), mul(satM(0.82), conM(1.15))) },
  { id: "fade", label: "빛바랜", desc: "부드럽고 흐린 옛 느낌", m: mul(liftM(0.07), mul(satM(0.75), conM(0.82))) },
  { id: "mono", label: "흑백", desc: "색을 빼고 흑백으로", m: mul(conM(1.1), satM(0)) },
  { id: "sepia", label: "옛날 사진", desc: "누렇게 바랜 사진", m: [[0.393, 0.769, 0.189, 0], [0.349, 0.686, 0.168, 0], [0.272, 0.534, 0.131, 0]] },
  { id: "night", label: "어둡게", desc: "밤·분위기 있게", m: mul(gainM(0.92, 0.95, 1.05), mul(conM(1.2), gainM(0.85, 0.85, 0.85))) },
];
/** 고친 값 → 색 행렬 (없으면 null = 그대로). 순서: 필터(세기만큼) → 밝기 → 대비 → 채도 → 색온도 → 색조 */
export function adjMatrix(a?: Adjust | null): Mat | null {
  if (!a) return null;
  let M = I3;
  const f = a.f ? FILTERS.find((x) => x.id === a.f) : null;
  if (f) {
    const k = Math.max(0, Math.min(1, a.fi ?? 1));
    M = f.m.map((r, i) => r.map((v, j) => I3[i][j] + (v - I3[i][j]) * k));
  }
  const b = Number(a.b) || 0, c = Number(a.c) || 0, s = Number(a.s) || 0, t = Number(a.t) || 0, g = Number(a.g) || 0;
  if (b) M = mul(gainM(1 + 0.6 * b, 1 + 0.6 * b, 1 + 0.6 * b), M);
  if (c) M = mul(conM(1 + 0.6 * c), M);
  if (s) M = mul(satM(1 + s), M);
  if (t) M = mul(gainM(1 + 0.2 * t, 1 + 0.03 * t, 1 - 0.2 * t), M);
  if (g) M = mul(gainM(1 + 0.05 * g, 1 - 0.15 * g, 1 + 0.05 * g), M);
  if (M.every((r, i) => r.every((v, j) => Math.abs(v - I3[i][j]) < 1e-4))) return null;
  return M.map((r) => r.map((v) => +v.toFixed(5)));
}
/** 미리보기 — SVG feColorMatrix 값 (4줄 × 5칸) */
export const adjSvgValues = (M: Mat) => [...M.map((r) => [r[0], r[1], r[2], 0, r[3]]), [0, 0, 0, 1, 0]].flat().join(" ");
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
    // 더 (회의 3-28 ⑤, 2026-10-19) — 떨어지기·옆에서·크게에서·늘어나기·흔들며·젤리
    else if (kind === "drop") { r.dy += -(1 - backOut(x)) * 0.3; r.op *= Math.min(1, x * 3); }
    else if (kind === "slideL") { r.dx += -(1 - e) * 0.4; r.op *= e; }
    else if (kind === "slideR") { r.dx += (1 - e) * 0.4; r.op *= e; }
    else if (kind === "big") { r.sc *= 1 + (1 - e) * 1.4; r.op *= e; }
    else if (kind === "stretch") { r.sx *= Math.max(0.001, backOut(x)); r.sc *= 0.7 + 0.3 * e; r.op *= Math.min(1, x * 3); }
    else if (kind === "swing") { r.rot += (1 - backOut(x)) * -40; r.op *= e; }
    else if (kind === "jelly") { r.sc *= Math.max(0, e * (1 + 0.3 * Math.sin(Math.max(0, Math.min(1, x)) * Math.PI * 3) * (1 - Math.max(0, Math.min(1, x))))); r.op *= Math.min(1, x * 3); }
  };
  const tin = (local - a) / D;
  const tout = (b - local) / D;
  if (an.in && tin < 1) put(an.in, tin);
  if (an.out && tout < 1) put(an.out, tout);
  const tt = Math.max(0, local - a);
  if (an.emph === "pulse") r.sc *= 1 + 0.06 * Math.sin((2 * Math.PI * tt) / 1.1);
  else if (an.emph === "shake") r.rot += 5 * Math.sin((2 * Math.PI * tt) / 0.6);
  else if (an.emph === "blink") r.op *= 0.6 + 0.4 * (0.5 + 0.5 * Math.cos((2 * Math.PI * tt) / 1.2));
  else if (an.emph === "float") r.dy += 0.012 * Math.sin((2 * Math.PI * tt) / 2);
  else if (an.emph === "sway") r.rot += 8 * Math.sin((2 * Math.PI * tt) / 1.6);
  else if (an.emph === "bounce") r.dy -= 0.025 * Math.abs(Math.sin((Math.PI * tt) / 0.5));
  else if (an.emph === "beat") { const q = tt % 1; r.sc *= 1 + 0.07 * (Math.exp(-(((q - 0.1) / 0.05) ** 2)) + Math.exp(-(((q - 0.3) / 0.05) ** 2))); }
  else if (an.emph === "wiggle") { r.dx += 0.006 * Math.sin((2 * Math.PI * tt) / 0.12); r.rot += 1.5 * Math.sin((2 * Math.PI * tt) / 0.18); }
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
const SFX_AUTO: Record<string, string> = { pop: "pop", fly: "whoosh", zoom: "whoosh-short", spin: "whoosh", roll: "whoosh", flip: "click", drop: "pop", slideL: "whoosh-short", slideR: "whoosh-short", big: "whoosh", stretch: "pop", swing: "whoosh-short", jelly: "pop" }; // 페이드는 조용히
/** 이 효과(kind)에 낼 소리 — set: 고른 값 (없으면 dflt) */
export function sfxName(kind: string | undefined, set: string | undefined, dflt: "auto" | "none", isText: boolean): string | null {
  if (!kind) return null;
  const v = set || dflt;
  if (v === "none") return null;
  if (v !== "auto") return v;
  return isText ? "key-press" : SFX_AUTO[kind] || null; // 화면 글자는 엔터 "탁"
}
export type SfxEvent = { keep?: boolean; t: number; name: string; vol: number; file?: string; url?: string /* 내 효과음 */ };
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
  // 누르는 소리 (구독·좋아요 그래픽 — 그래픽이 나온 때부터 l.clicks 초마다 큰 딸깍, 2026-10-20 사장님)
  for (const l of p.layers || []) {
    if (l.off || !Array.isArray(l.clicks) || !l.clicks.length || (l.type !== "image" && l.type !== "text")) continue;
    const cov = layerItems(p, l, items, order);
    if (!cov.length) continue;
    const sp = layerSpan(p, l, items, cov[0].clip.id, p.settings, order);
    if (!sp) continue;
    const a = cov[0].start + sp.a, b = cov[0].start + sp.b;
    for (const c of l.clicks) if (a + Number(c) < b) ev.push({ t: a + Number(c), name: "click-loud", vol: 1, keep: true });
  }
  // 효과음 레이어 — 그 클립(단어를 골라 넣었으면 그 단어) 시작에 한 번, 겹쳐도 빼지 않는다 (회의 3-29)
  for (const l of p.layers || []) {
    if (l.off || l.type !== "sfx" || !l.sfx) continue;
    const cov = layerItems(p, l, items, order);
    if (!cov.length) continue;
    const sp = layerSpan(p, l, items, cov[0].clip.id, p.settings, order);
    // 내 효과음 (2026-10-21) — 프로젝트 assets/sfx 파일 (file · url)
    ev.push({ t: cov[0].start + (sp ? Math.max(0, sp.a) : 0), name: l.sfx, vol: Math.max(0, Math.min(1, l.volume ?? 0.8)), keep: true, ...(l.file ? { file: l.file, url: l.url } : {}) });
  }
  // 화면전환 효과음 (clip.trans.sfx, 2026-10-20) — 전환이 시작될 때 (앞 클립 끝 a초 앞)
  for (let i = 1; i < items.length; i++) {
    const tr = items[i].clip.trans;
    if (!tr || !tr.sfx) continue;
    const a = Math.max(0, Math.min(Number(tr.a) || 0, items[i - 1].dur * 0.45));
    ev.push({ t: Math.max(0, items[i].start - a), name: tr.sfx, vol: 0.6, keep: true });
  }
  for (const it of items) {
    const sa = subAnimOf(p, it.clip);
    const st = subStyleOf(p.settings, it.clip).anim;
    if (!sa || !st || p.settings.subtitle.on === false || it.clip.sub === false) continue;
    const n = sfxName(sa.in, st.sfx, "none", true);
    if (n) ev.push({ t: it.start, name: n, vol: Math.max(0, Math.min(1, st.sfxVol ?? 0.6)) });
  }
  ev.sort((x, y) => x.t - y.t);
  return ev.filter((e, i) => e.keep || !i || e.t - ev[i - 1].t > 0.12);
}
