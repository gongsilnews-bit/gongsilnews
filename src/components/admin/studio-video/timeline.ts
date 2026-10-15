// 클립 길이·남길 구간·단어 시각 — studio-app/src/video/timeline.js 와 같은 계산 (미리보기 = 완성 영상). 둘을 같이 고친다.
import type { Clip, Project, Settings } from "./types";

export const GAP = 0.12;

export function keepRanges(clip: Clip): { s: number; e: number }[] {
  if (!clip.src) return [];
  let ranges = [{ s: clip.src.s, e: clip.src.e }];
  for (const w of clip.words || []) {
    if (!w.del) continue;
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

export function estimateSeconds(text: string, speed = 1) {
  const n = String(text || "").replace(/\s/g, "").length;
  return Math.max(1.2, n / 5 / speed);
}

export function clipDuration(clip: Clip, settings?: Settings) {
  if (clip.del) return 0;
  if (clip.type === "voice") {
    if (clip.voice && clip.voice.duration) return clip.voice.duration / speedOf(clip, settings) + GAP;
    return Math.max(0.5, Number(clip.hold) || estimateSeconds(clip.text, speedOf(clip, settings)));
  }
  return keepRanges(clip).reduce((a, r) => a + (r.e - r.s), 0);
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
  return all.map((w, i) => ({ w: w.w, s: map(w.s), e: map(w.e), i })).filter((_, i) => !all[i].del);
}

/** 클립 안 시각 → 원본 영상 시각 (촬영 클립) */
export function sourceTimeAt(clip: Clip, local: number) {
  const ranges = keepRanges(clip);
  let rem = local;
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
export function wrap(text: string, max: number) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > max) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 클립 하나의 자막 줄들 (render.js subtitleLines 와 같음) */
export function subtitleLines(clip: Clip, dur: number, settings: Settings, W: number) {
  const st = settings.subtitle;
  const text = clipText(clip).trim();
  if (!st.on || !text || clip.type === "silence" || clip.sub === false) return [] as { s: number; e: number; text: string }[];
  const max = W >= 1400 ? 26 : W >= 1080 ? 18 : 16;
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

/** 글을 문장(클립)으로 나누기 — 빈 줄 = 장면, 줄바꿈·마침표 = 문장 */
export function splitScript(script: string): string[][] {
  return String(script || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split(/\n/)
        .flatMap((line) => line.match(/[^.!?。]+[.!?。]*[\s"”’)]*|.+$/g) || [])
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .filter((b) => b.length);
}
