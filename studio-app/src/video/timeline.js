// 영상 편집기 — 클립 길이·남길 구간·자막 시간 계산 (굽기용). 편집 화면은 src/lib/studio-video/timeline.ts 에 같은 계산이 있다 — 둘을 같이 고친다.
//
// 클립 종류
//  source  : 촬영 영상의 한 구간 (자기 소리)  src {asset, s, e}, words [{w, s, e, del}] (원본 시각)
//  silence : 말이 없는 구간 (무음 구간 줄이기로 지운다) src {asset, s, e}
//  voice   : 글로 만든 클립 — AI 목소리 voice {file, duration} (+ 화면 자료 visual {asset, s}), words (목소리 파일 시각, 1배속 기준)
// clip.del = 지운 클립, word.del = 지운 단어 (그 소리·영상 구간이 잘린다)
const GAP = 0.12; // 목소리 클립 뒤 숨 쉬는 틈

function keepRanges(clip) {
  if (!clip.src) return [];
  let ranges = [{ s: clip.src.s, e: clip.src.e }];
  for (const w of clip.words || []) {
    if (!w.del) continue;
    const next = [];
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

const speedOf = (clip, settings) => Number(clip.speed || (settings && settings.voice && settings.voice.speed) || 1) || 1;

/** 촬영 클립 빠르기 (영상·소리 같이). 목소리 클립은 1 */
const srcSpeed = (clip) => (clip.type === "voice" ? 1 : Math.max(0.1, Math.min(20, Number(clip.speed) || 1)));

function clipDuration(clip, settings) {
  if (clip.del) return 0;
  if (clip.type === "voice") {
    if (clip.voice && clip.voice.duration) return clip.voice.duration / speedOf(clip, settings) + GAP + Math.max(0, Number(clip.pad) || 0);
    return Math.max(0.5, Number(clip.hold) || estimateSeconds(clip.text, speedOf(clip, settings)));
  }
  return keepRanges(clip).reduce((a, r) => a + (r.e - r.s), 0) / srcSpeed(clip);
}

/** 성우 없이 글만 있을 때 예상 길이 (한국어 1분 약 300자) */
function estimateSeconds(text, speed = 1) {
  const n = String(text || "").replace(/\s/g, "").length;
  return Math.max(1.2, (n / 5) / speed);
}

/** 단어 → 이 클립 안에서 보이는 시각 [{w, s, e}] (지운 단어 제외) */
function wordTimes(clip, settings) {
  const words = (clip.words || []).filter((w) => !w.del);
  if (clip.type === "voice") {
    const sp = speedOf(clip, settings);
    if (!words.length || !clip.voice) return spread(String(clip.text || "").split(/\s+/).filter(Boolean), clipDuration(clip, settings));
    return words.map((w) => ({ w: w.w, s: w.s / sp, e: w.e / sp }));
  }
  const ranges = keepRanges(clip);
  const map = (t) => {
    let acc = 0;
    for (const r of ranges) {
      if (t < r.s) return acc;
      if (t <= r.e) return acc + (t - r.s);
      acc += r.e - r.s;
    }
    return acc;
  };
  const ss = srcSpeed(clip);
  return words.map((w) => ({ w: w.w, s: map(w.s) / ss, e: map(w.e) / ss }));
}

function spread(tokens, dur) {
  const total = tokens.reduce((a, t) => a + t.length, 0) || 1;
  let t = 0;
  return tokens.map((w) => {
    const d = (w.length / total) * dur;
    const r = { w, s: t, e: t + d };
    t += d;
    return r;
  });
}

/** 지운 단어를 빼고 남은 자막 글 */
function clipText(clip) {
  if (clip.words && clip.words.length) return clip.words.filter((w) => !w.del).map((w) => w.w).join(" ");
  return String(clip.text || "");
}

/** 모든 클립을 차례로 [{clip, start, dur}] */
function flatten(project) {
  const out = [];
  let t = 0;
  for (const sc of project.scenes || []) {
    for (const c of sc.clips || []) {
      const d = clipDuration(c, project.settings);
      if (d <= 0) continue;
      out.push({ clip: c, start: t, dur: d });
      t += d;
    }
  }
  return { items: out, total: t };
}

/* ── 애셋(레이어) — 편집 화면 timeline.ts 와 같은 계산 ──
 * layer { id, type: music|image|text, from: 시작 클립 id, to: 끝 클립 id, ... } */
function clipOrder(p) {
  const m = new Map();
  let i = 0;
  for (const sc of p.scenes || []) for (const c of sc.clips || []) m.set(c.id, i++);
  return m;
}

function inLayer(order, layer, clipId) {
  let a = order.get(layer.from);
  let b = order.get(layer.to);
  const k = order.get(clipId);
  if (a === undefined || b === undefined || k === undefined) return false;
  if (a > b) [a, b] = [b, a];
  return k >= a && k <= b;
}

/** 애셋이 덮는 클립들 (보이는 차례) */
function layerItems(p, layer, items, order = clipOrder(p)) {
  return items.filter((x) => inLayer(order, layer, x.clip.id));
}

/** 클립 하나에 걸린 애셋들 */
function layersAt(p, clipId, order = clipOrder(p)) {
  return (p.layers || []).filter((l) => inLayer(order, l, clipId));
}

/** 음악 애셋 — 예전 프로젝트의 "전체 배경 음악"도 처음~끝 음악 애셋으로 본다 */
function musicLayers(p, items) {
  const ls = (p.layers || []).filter((l) => l.type === "music" && l.file);
  if (ls.length) return ls;
  const m = p.settings && p.settings.music;
  if (m && m.on && m.file && items.length) return [{ id: "bgm", type: "music", from: items[0].clip.id, to: items[items.length - 1].clip.id, name: m.name, file: m.file, volume: m.volume ?? 0.15, fadeIn: 0, fadeOut: 2, offset: 0, loop: true }];
  return [];
}

/** 자막에 쓸 글 — 자막만 따로 쓴 글이 있으면 그것 */
const subtitleText = (clip) => (typeof clip.subText === "string" ? clip.subText : clipText(clip));

module.exports = { srcSpeed, keepRanges, clipDuration, wordTimes, clipText, flatten, estimateSeconds, speedOf, GAP, clipOrder, layerItems, layersAt, musicLayers, subtitleText };
