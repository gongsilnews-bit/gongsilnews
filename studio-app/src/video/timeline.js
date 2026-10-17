// 영상 편집기 — 클립 길이·남길 구간·자막 시간 계산 (굽기용). 편집 화면은 src/lib/studio-video/timeline.ts 에 같은 계산이 있다 — 둘을 같이 고친다.
//
// 클립 종류
//  source  : 촬영 영상의 한 구간 (자기 소리)  src {asset, s, e}, words [{w, s, e, del}] (원본 시각)
//  silence : 말이 없는 구간 (무음 구간 줄이기로 지운다) src {asset, s, e}
//  voice   : 글로 만든 클립 — AI 목소리 voice {file, duration} (+ 화면 자료 visual {asset, s}), words (목소리 파일 시각, 1배속 기준)
// clip.del = 지운 클립, word.del = 지운 단어, clip.cuts = 무음 줄이기로 건너뛰는 구간 [{s, e}] (원본 시각) — 그 소리·영상 구간이 잘린다
const GAP = 0.12; // 목소리 클립 뒤 숨 쉬는 틈

function keepRanges(clip) {
  if (!clip.src) return [];
  let ranges = [{ s: clip.src.s, e: clip.src.e }];
  for (const w of [...(clip.words || []), ...(clip.cuts || [])]) {
    if (w.w !== undefined && !w.del) continue;
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

/** 클립의 메인자막 서식 — 전체 위에 이 클립만 따로 바꾼 항목 (timeline.ts subStyleOf 와 같음) */
function subStyleOf(settings, clip) {
  const base = (settings && settings.subtitle) || {};
  const o = clip && clip.subStyle;
  if (!o || !Object.keys(o).length) return base;
  const m = { ...base, ...o };
  if ("position" in o && !("x" in o)) {
    delete m.x;
    delete m.y;
  }
  return m;
}

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
/* ── 사진 움직임 — src/components/admin/studio-video/timeline.ts 와 같은 계산 (미리보기 = 굽기) ── */
const AUTO_MOTIONS = ["zoomIn", "leftRight", "zoomOut", "rightLeft", "topBottom"];
const MOTION_POWER = { low: 1.06, mid: 1.12, high: 1.2 };
function photoOf(p, c) {
  if (c.box || c.del) return null;
  const id = (c.visual && c.visual.asset) || (c.type !== "voice" && c.src ? c.src.asset : undefined);
  const a = id ? (p.assets || {})[id] : null;
  return a && a.kind === "image" ? a : null;
}
function motionOf(p, clip) {
  if (!photoOf(p, clip)) return null;
  let m = clip.motion || ((p.settings || {}).motion === "none" ? "none" : "auto");
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
function motionAt(mo, u) {
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
/** 단어 구간 레이어가 그 클립 안에서 나오는 시간 (클립 시작 기준 초). 없으면 null = 클립 전체 (웹 timeline.ts layerWindow 와 같다) */
function layerWindow(layer, clip, settings) {
  if (typeof layer.w0 !== "number" || layer.from !== clip.id) return null;
  const w1 = typeof layer.w1 === "number" ? layer.w1 : layer.w0;
  const idx = (clip.words || []).map((w, i) => (w.del ? -1 : i)).filter((i) => i >= 0);
  const ts = wordTimes(clip, settings);
  const pick = ts.filter((_, k) => idx[k] !== undefined && idx[k] >= layer.w0 && idx[k] <= w1);
  if (!pick.length) return null;
  return { s: pick[0].s, e: pick[pick.length - 1].e };
}
function layersAt(p, clipId, order = clipOrder(p)) {
  return (p.layers || []).filter((l) => inLayer(order, l, clipId));
}

/** 음악 애셋 — 예전 프로젝트의 "전체 배경 음악"도 처음~끝 음악 애셋으로 본다 */
function musicLayers(p, items) {
  const ls = (p.layers || []).filter((l) => l.type === "music" && l.file && !l.off);
  if (ls.length) return ls;
  const m = p.settings && p.settings.music;
  if (m && m.on && m.file && items.length) return [{ id: "bgm", type: "music", from: items[0].clip.id, to: items[items.length - 1].clip.id, name: m.name, file: m.file, volume: m.volume ?? 0.15, fadeIn: 0, fadeOut: 2, offset: 0, loop: true }];
  return [];
}

/** 자막에 쓸 글 — 자막만 따로 쓴 글이 있으면 그것 */
const subtitleText = (clip) => (typeof clip.subText === "string" ? clip.subText : clipText(clip));

module.exports = { motionOf, motionAt, subStyleOf, srcSpeed, keepRanges, clipDuration, wordTimes, clipText, flatten, estimateSeconds, speedOf, GAP, clipOrder, layerItems, layersAt, layerWindow, musicLayers, subtitleText };
