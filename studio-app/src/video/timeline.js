// 영상 편집기 — 클립 길이·남길 구간·자막 시간 계산 (굽기용). 편집 화면은 src/lib/studio-video/timeline.ts 에 같은 계산이 있다 — 둘을 같이 고친다.
//
// 클립 종류
//  source  : 촬영 영상의 한 구간 (자기 소리)  src {asset, s, e}, words [{w, s, e, del}] (원본 시각)
//  silence : 말이 없는 구간 (무음 구간 줄이기로 지운다) src {asset, s, e}
//  voice   : 글로 만든 클립 — AI 목소리 voice {file, duration} (+ 화면 자료 visual {asset, s}), words (목소리 파일 시각, 1배속 기준)
// clip.del = 지운 클립, word.del = 지운 단어, clip.cuts = 무음 줄이기로 건너뛰는 구간 [{s, e}] (원본 시각) — 그 소리·영상 구간이 잘린다
const GAP = 0.2; // (2026-10-20: 0.4 → 0.2, 브루처럼) 목소리 클립 뒤 숨 쉬는 틈 (기본) — gapOf(settings) 로 [AI 목소리 설정]의 문장 사이 쉼
/** 목소리 뒤 쉼 — 쉼표로 끝나면 짧게 (웹 timeline.ts voiceGap 과 같다, 2026-10-20) */
const COMMA_GAP = 0.05;
const endsWithComma = (t) => /[,，、]\s*$/.test(String(t || "").trim());
const voiceGap = (clip, settings) => (clip.voice && clip.voice.ng ? 0 : endsWithComma((clip.voice && clip.voice.text) || clip.text) ? Math.min(COMMA_GAP, gapOf(settings)) : gapOf(settings));
const gapOf = (settings) => {
  const g = Number(settings && settings.voice && settings.voice.gap);
  return Number.isFinite(g) && g >= 0 ? Math.min(2, g) : GAP;
};

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
    if (clip.voice && clip.voice.duration) return clip.voice.duration / speedOf(clip, settings) + voiceGap(clip, settings) + Math.max(0, Number(clip.pad) || 0);
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
  if (!photoOf(p, clip) || (clip.kf && clip.kf.length)) return null; // 키프레임이 있으면 자동 움직임은 쉰다
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
  if (typeof layer.w0 === "number") {
    if (layer.from !== clip.id) return null;
    const w1 = typeof layer.w1 === "number" ? layer.w1 : layer.w0;
    const idx = (clip.words || []).map((w, i) => (w.del ? -1 : i)).filter((i) => i >= 0);
    const ts = wordTimes(clip, settings);
    const pick = ts.filter((_, k) => idx[k] !== undefined && idx[k] >= layer.w0 && idx[k] <= w1);
    if (!pick.length) return null;
    return { s: pick[0].s, e: pick[pick.length - 1].e };
  }
  // 초 단위 구간 (타임라인에서 끈 것, 2026-10-20) — 시작 클립은 ts 부터, 끝 클립은 te 까지
  const a = layer.from === clip.id ? Math.max(0, Number(layer.ts) || 0) : 0;
  const hasE = layer.to === clip.id && typeof layer.te === "number";
  if (!a && !hasE) return null;
  const d = clipDuration(clip, settings);
  const s = Math.min(a, d);
  return { s, e: hasE ? Math.max(s, Math.min(d, Number(layer.te))) : d };
}
/** 화면 위에 겹치는 것의 쌓는 순서 — 뒤 → 앞. src/components/admin/studio-video/timeline.ts zLayers 와 같다 (회의 3-26) */
function zLayers(p, layers) {
  const vis = (layers || []).filter((l) => l.type === "image" || l.type === "text");
  if (p && p.layerZ) return vis;
  return [...vis.filter((l) => l.type !== "text"), ...vis.filter((l) => l.type === "text")];
}
/* ── 문자 간격·줄 간격 자동 (기본) — src/components/admin/studio-video/timeline.ts 와 같은 계산 ── */
function autoLeading(s) {
  const f = (s && s.font) || "";
  let v = /Black Han Sans|Do Hyeon|Jua/.test(f) ? 1.15 : /Myeongjo|Song Myung|Nanum Pen|Yeon Sung/.test(f) ? 1.35 : 1.28;
  if (s.bg || s.box) v += 0.12;
  else if (s.glow || Number(s.outlineWidth ?? 3) >= 6 || Number(s.shadow) > 0) v += 0.06;
  return Math.round(v * 100) / 100;
}
function autoSpacing(s) {
  const f = (s && s.font) || "";
  if (/Black Han Sans|Do Hyeon|Jua|Myeongjo|Song Myung/.test(f)) return 0;
  if (/Nanum Pen|Yeon Sung/.test(f)) return 0.02;
  return -0.02;
}
const effSpacing = (s) => Math.max(-0.1, Math.min(0.5, typeof s.spacing === "number" ? s.spacing : autoSpacing(s)));
/** 글꼴마다 글자 폭 (글자 크기 배수) — [한글, 띄어쓰기, 숫자·영문] · 글꼴 파일에서 잰 값 (편집 화면 timeline.ts 와 같음, 2026-10-19) */
const FONT_W = { "777Starlandmoon": [0.76, 0.146, 0.445], "AndongKaturiOTF": [0.824, 0.28, 0.557], "BM EULJIRO TTF": [0.838, 0.27, 0.55], "BM Euljiro 10 years later": [0.838, 0.27, 0.55], "BM HANNA Air": [0.82, 0.312, 0.53], "BR B": [0.873, 0.312, 0.544], "Batang": [1.0, 0.333, 0.596], "Binggrae II": [0.94, 0.32, 0.642], "Binggrae Melona": [0.91, 0.3, 0.579], "Binggrae Samanco Bold": [0.651, 0.25, 0.412], "Binggrae Samanco Regular": [0.634, 0.25, 0.408], "Black Han Sans": [0.834, 0.3, 0.6], "Cafe24 Dangdanghae": [0.843, 0.297, 0.518], "Cafe24 Danjunghae": [0.841, 0.296, 0.516], "Cafe24 Ohsquare": [0.887, 0.27, 0.629], "Cafe24 Oneprettynight": [0.822, 0.244, 0.456], "Cafe24 Shiningstar": [0.573, 0.31, 0.289], "ChosunilboNM": [0.91, 0.3, 0.5], "CookieRunOTF": [0.882, 0.28, 0.586], "DAON_C_MYUNGSUNGCHE(B)": [0.834, 0.244, 0.551], "DAON_C_MYUNGSUNGCHE(M)": [0.834, 0.244, 0.551], "Do Hyeon": [0.768, 0.3, 0.51], "ELAND Choice": [0.94, 0.28, 0.585], "ELAND Nice": [0.93, 0.299, 0.627], "GmarketSans": [0.962, 0.3, 0.652], "Gong Gothic Bold": [0.95, 0.275, 0.731], "Gong Gothic Medium": [0.92, 0.25, 0.672], "Gowun Dodum": [0.907, 0.31, 0.531], "Gungsuh": [1.0, 0.333, 0.583], "Jalnan OTF": [1.0, 0.28, 0.629], "JejuHallasan": [0.899, 0.28, 0.549], "Jua": [0.809, 0.3, 0.576], "KOTRA_BOLD": [0.987, 0.283, 0.635], "MARU Buri Beta": [0.97, 0.28, 0.554], "Malgun Gothic": [1.0, 0.352, 0.58], "Maplestory": [0.858, 0.265, 0.593], "MapoBackpacking": [0.84, 0.28, 0.536], "MapoDPP": [0.9, 0.29, 0.622], "MapoHongdaeFreedom": [0.95, 0.286, 0.626], "MapoPeacefull": [0.92, 0.28, 0.62], "NEXON Lv1 Gothic": [0.944, 0.328, 0.618], "NEXON Lv1 Gothic Low OTF": [0.944, 0.328, 0.618], "NEXON Lv2 Gothic": [0.874, 0.25, 0.636], "Nanum Pen": [0.595, 0.28, 0.34], "NanumGothic": [0.94, 0.28, 0.606], "NanumMyeongjo": [0.95, 0.273, 0.537], "NanumMyeongjo Regular": [0.95, 0.3, 0.537], "NanumSquareRound": [0.91, 0.25, 0.61], "Pretendard": [0.864, 0.23, 0.617], "RixYeoljeongdo": [0.98, 0.236, 0.745], "Song Myung": [0.88, 0.226, 0.493], "VITRO CORE OTF": [1.0, 0.25, 0.658], "VITRO PRIDE OTF": [0.86, 0.25, 0.54], "Wandohope": [0.879, 0.28, 0.493], "WemakepriceOTF": [0.92, 0.2, 0.64], "YANGJIN": [0.871, 0.268, 0.702], "Yanolja Yache": [0.63, 0.21, 0.435], "Yeon Sung": [0.694, 0.3, 0.468], "fromdami M": [0.684, 0.35, 0.449], "tvN Enjoystories": [0.593, 0.26, 0.336] };
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3\u4e00-\u9fff\uff00-\uffef]/;
function textEm(s, st) {
  const [h, sp, d] = FONT_W[st.font || "Malgun Gothic"] || FONT_W["Malgun Gothic"];
  const ls = effSpacing(st);
  let w = 0;
  for (const ch of String(s)) w += (ch === " " ? sp : HANGUL.test(ch) ? h : /[0-9A-Za-z]/.test(ch) ? d : 0.45) + ls;
  return w;
}
function capEm(st, W, H) {
  const px = Math.min(W, H) * 0.062 * ((Number(st.size) || 100) / 100);
  const edge = st.bg ? px * 0.3 * Number(st.bgPad ?? 1) : Number(st.outlineWidth ?? 3) + Number(st.outline2Width || 0);
  return Math.max(1.5, ((W * 0.88 * Math.max(0.3, Math.min(1, Number(st.wrap ?? 1))) - 2 * edge) / px) * 0.96);
}
const effLeading = (s) => Math.max(0.9, Math.min(2.5, typeof s.leading === "number" ? s.leading : autoLeading(s)));
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

/* ── 사진 올리기·화면 글자 애니메이션 — src/components/admin/studio-video/timeline.ts 와 같은 계산 ── */
const AUTO_ANIMS = ["pop", "fly", "zoom", "fade", "roll"];
function animOf(p, layer) {
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
function subAnimOf(p, clip) {
  const a = subStyleOf(p.settings || {}, clip).anim;
  if (!a || (!a.in && !a.out && !a.emph && !a.grow)) return null;
  const i = Math.max(0, clipOrder(p).get(clip.id) || 0);
  const auto = AUTO_ANIMS[i % AUTO_ANIMS.length];
  const inn = a.in === "auto" ? auto : a.in;
  const out = a.out === "auto" ? inn || auto : a.out;
  return { in: inn, out, emph: a.emph, grow: a.grow, dur: Math.max(0.1, Math.min(2, Number(a.dur) || 0.5)) };
}
/* ── 단어별 효과 (메인자막, 쇼츠식) — 미리보기 timeline.ts 와 같은 계산 ── */
const WORD_FADE = 0.12;
function subWordOf(p, clip) {
  const a = subStyleOf(p.settings || {}, clip).anim;
  if (!a || (!a.wshow && !a.whl)) return null;
  return { show: a.wshow, hl: a.whl, color: a.wcolor || "#FFE000", gap: Math.max(0.1, Math.min(3, Number(a.wgap) || 0.6)) };
}
function lineWords(clip, lines, settings, fx) {
  const toks = lines.map((l) => String(l.text).split(/\s+/).filter(Boolean));
  const total = toks.reduce((a, t) => a + t.length, 0);
  const wt = typeof clip.subText === "string" ? [] : wordTimes(clip, settings);
  const seq = wt.length === total;
  let k = 0;
  return lines.map((l, li) => {
    const ts = toks[li];
    let ws;
    if (seq) ws = ts.map((w) => { const x = wt[k++]; return { w, s: x.s, e: x.e }; });
    else if (fx?.show) {
      // 말 시각이 없으면 (직접 쓴 자막) — 고른 빠르기로 줄마다(한 줄씩) · 단어마다(한 단어씩, 절반 간격) 차례로
      const gap = fx.gap;
      const parts = String(l.text).split(/\r?\n/).map((x) => x.split(/\s+/).filter(Boolean));
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
      for (let q = 0; q < n && ws[wi + q]; q++) ws[wi + q].ls = first ? first.s : l.s;
      wi += n;
    }
    return ws;
  });
}
function wordState(fx, w, t) {
  const at = fx.show === "line" ? (w.ls ?? w.s) : w.s;
  const a = fx.show ? Math.max(0, Math.min(1, (t - at) / WORD_FADE)) : 1;
  return { a, cur: Boolean(fx.hl) && t >= w.s && t < w.e };
}
function layerSpan(p, layer, items, clipId, settings, order = clipOrder(p)) {
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
  const a = first.start + Math.min(first.dur, Math.max(0, Number(layer.ts) || 0));
  const b = last.start + (typeof layer.te === "number" ? Math.max(0, Math.min(last.dur, layer.te)) : last.dur);
  return { a: a - cur.start, b: Math.max(a, b) - cur.start };
}
/** 레이어가 나오는 영상 전체 시각 [s, e] (웹 timeline.ts layerRange 와 같다) */
function layerRange(p, layer, items, order = clipOrder(p)) {
  const cov = layerItems(p, layer, items, order);
  if (!cov.length) return null;
  const sp = layerSpan(p, layer, items, cov[0].clip.id, p.settings, order);
  if (!sp) return null;
  return { s: cov[0].start + sp.a, e: cov[0].start + sp.b };
}

/* ── 키프레임 (2026-10-20) — 웹 timeline.ts 와 같은 계산 (미리보기 = 굽기) ── */
function easeVal(e, u) {
  const x = Math.max(0, Math.min(1, u));
  return e === "inout" ? x * x * (3 - 2 * x) : e === "in" ? x * x : e === "out" ? x * (2 - x) : x;
}
const kfSort = (kf) => [...kf].sort((a, b) => a.t - b.t);
const kfHas = (k, p) => !k.only || k.only.includes(p);
/** 한 항목의 그 시각 값 — 웹 timeline.ts kfVal 과 같다 (항목마다 ◇) */
function kfVal(ks, p, t, base) {
  const pts = ks.filter((k) => kfHas(k, p));
  if (!pts.length) return base && typeof base[p] === "number" ? base[p] : ks[0][p];
  if (t <= pts[0].t) return pts[0][p];
  const last = pts[pts.length - 1];
  if (t >= last.t) return last[p];
  let i = 0;
  while (i < pts.length - 2 && t >= pts[i + 1].t) i++;
  const a = pts[i], b = pts[i + 1];
  const v = easeVal(a.e, (t - a.t) / Math.max(1e-6, b.t - a.t));
  return a[p] + (b[p] - a[p]) * v;
}
function kfAt(kf, t, base) {
  if (!kf || !kf.length) return null;
  const ks = kfSort(kf);
  const seg = [...ks].reverse().find((k) => k.t <= t) || ks[0];
  return { t, x: kfVal(ks, "x", t, base), y: kfVal(ks, "y", t, base), s: kfVal(ks, "s", t, base), r: kfVal(ks, "r", t, base), o: kfVal(ks, "o", t, base), e: seg.e };
}
/** 키프레임 레이어의 그 시각(tau) 모습 (웹 layerAtTime 과 같다) */
function layerAtTime(l, tau) {
  if (l.type === "text" && !(l.kf && l.kf.length)) return (l.opacity ?? 1) < 0.999 ? { ...l, kfo: Math.max(0, l.opacity ?? 1) } : l;
  if (!l.kf || !l.kf.length || (l.type === "image" && (l.fit === "cover" || l.fit === "contain"))) return l;
  const k = kfAt(l.kf, tau, { x: l.x ?? 0.5, y: l.y ?? 0.5, s: 1, r: Number(l.rot) || 0, o: 1 });
  if (l.type === "image") return { ...l, x: k.x, y: k.y, rot: k.r, w: (l.w ?? 0.35) * k.s, opacity: Math.max(0, Math.min(1, (l.opacity ?? 1) * k.o)) };
  return { ...l, x: k.x, y: k.y, rot: k.r, size: (l.size ?? 100) * k.s, kfo: Math.max(0, Math.min(1, k.o * (l.opacity ?? 1))) };
}
/** 사진 올리기·스티커 자리 (px) — 웹 imgRect 와 같다 */
function imgRect(l, a, W, H) {
  const pw = Math.max(0.03, Math.min(4, l.w ?? 0.35)) * W;
  const ph = a && a.width && a.height ? (pw * a.height) / a.width : pw;
  const cx = (l.x ?? 0.5) * W, cy = (l.y ?? 0.5) * H;
  if (l.kf && l.kf.length) return { left: cx - pw / 2, top: cy - ph / 2, width: pw, height: ph };
  return { left: Math.max(0, Math.min(W - pw, cx - pw / 2)), top: Math.max(0, Math.min(H - ph, cy - ph / 2)), width: pw, height: ph };
}
/** 클립 화면 네모 (0~1) — 웹 clipBaseRect 와 같다 */
function clipBaseRect(p, c, W, H) {
  const id = (c.visual && c.visual.asset) || (c.type !== "voice" && c.src ? c.src.asset : undefined);
  const a = id ? (p.assets || {})[id] : null;
  const ar = a && a.width && a.height ? a.width / a.height : W / H;
  if (c.box) {
    const w = Number(c.box.w);
    return { x: Number(c.box.x), y: Number(c.box.y), w, h: (w * W) / ar / H };
  }
  const fill = c.fill || (p.settings || {}).fill;
  if (ar > W / H !== (fill === "cover")) return { x: 0.5, y: 0.5, w: 1, h: W / ar / H };
  return { x: 0.5, y: 0.5, w: (H * ar) / W, h: 1 };
}
/** 클립 화면 움직임 (키프레임, 또는 돌리기·진하기만) — 없으면 null (웹 clipKeys 와 같다) */
/** 클립 화면 점이 없는 항목의 값 (웹 clipKeyBase 와 같다) */
/** 자르기 값 — 웹 timeline.ts cropOf 와 같다 */
function cropOf(c) {
  if (!c) return null;
  const cl = (v) => Math.max(0, Math.min(0.95, Number(v) || 0));
  let l = cl(c.l), r = cl(c.r), t = cl(c.t), b = cl(c.b);
  if (l + r > 0.95) { const k = 0.95 / (l + r); l *= k; r *= k; }
  if (t + b > 0.95) { const k = 0.95 / (t + b); t *= k; b *= k; }
  return l || r || t || b ? { l, r, t, b } : null;
}
function clipKeyBase(p, c, W, H) {
  const b = clipBaseRect(p, c, W, H);
  return { t: 0, x: b.x, y: b.y, s: 1, r: Number(c.rot) || 0, o: c.opacity ?? 1 };
}
function clipKeys(p, c, W, H) {
  if (c.kf && c.kf.length) return kfSort(c.kf);
  const r = Number(c.rot) || 0;
  const o = c.opacity ?? 1;
  if (!r && o >= 0.999) return null;
  const b = clipBaseRect(p, c, W, H);
  return [{ t: 0, x: b.x, y: b.y, s: 1, r, o }];
}

/* ── 색 보정·필터 — 웹 timeline.ts 와 같은 색 행렬 (미리보기 SVG feColorMatrix = 굽기 colorchannelmixer) ── */
const I3 = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
const mmul = (A, B) => A.map((r) => [0, 1, 2, 3].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j] + (j === 3 ? r[3] : 0)));
const satM = (s) => [
  [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0],
  [0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0],
  [0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s, 0],
];
const gainM = (r, g, b) => [[r, 0, 0, 0], [0, g, 0, 0], [0, 0, b, 0]];
const conM = (c) => [[c, 0, 0, 0.5 * (1 - c)], [0, c, 0, 0.5 * (1 - c)], [0, 0, c, 0.5 * (1 - c)]];
const liftM = (v) => [[1, 0, 0, v], [0, 1, 0, v], [0, 0, 1, v]];
const FILTER_M = {
  home: mmul(gainM(1.06, 1.03, 0.97), mmul(satM(1.15), mmul(conM(1.05), gainM(1.08, 1.08, 1.08)))),
  vivid: mmul(satM(1.35), conM(1.1)),
  bright: mmul(satM(1.08), mmul(conM(0.95), gainM(1.14, 1.14, 1.14))),
  warm: mmul(gainM(1.12, 1.02, 0.86), satM(1.05)),
  cool: mmul(gainM(0.9, 1, 1.12), satM(0.98)),
  film: mmul(gainM(0.96, 1, 1.04), mmul(satM(0.82), conM(1.15))),
  fade: mmul(liftM(0.07), mmul(satM(0.75), conM(0.82))),
  mono: mmul(conM(1.1), satM(0)),
  sepia: [[0.393, 0.769, 0.189, 0], [0.349, 0.686, 0.168, 0], [0.272, 0.534, 0.131, 0]],
  night: mmul(gainM(0.92, 0.95, 1.05), mmul(conM(1.2), gainM(0.85, 0.85, 0.85))),
};
function adjMatrix(a) {
  if (!a) return null;
  let M = I3;
  const f = a.f ? FILTER_M[a.f] : null;
  if (f) {
    const k = Math.max(0, Math.min(1, a.fi ?? 1));
    M = f.map((r, i) => r.map((v, j) => I3[i][j] + (v - I3[i][j]) * k));
  }
  const b = Number(a.b) || 0, c = Number(a.c) || 0, s = Number(a.s) || 0, t = Number(a.t) || 0, g = Number(a.g) || 0;
  if (b) M = mmul(gainM(1 + 0.6 * b, 1 + 0.6 * b, 1 + 0.6 * b), M);
  if (c) M = mmul(conM(1 + 0.6 * c), M);
  if (s) M = mmul(satM(1 + s), M);
  if (t) M = mmul(gainM(1 + 0.2 * t, 1 + 0.03 * t, 1 - 0.2 * t), M);
  if (g) M = mmul(gainM(1 + 0.05 * g, 1 - 0.15 * g, 1 + 0.05 * g), M);
  if (M.every((r, i) => r.every((v, j) => Math.abs(v - I3[i][j]) < 1e-4))) return null;
  return M.map((r) => r.map((v) => +v.toFixed(5)));
}
const easeOut = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const backOut = (x) => { const k = Math.max(0, Math.min(1, x)) - 1; return 1 + 2.70158 * k * k * k + 1.70158 * k * k; };
function animAt(an, local, a, b) {
  const r = { op: 1, sc: 1, sx: 1, rot: 0, dx: 0, dy: 0 };
  if (!an) return r;
  const D = Math.max(0.05, Math.min(an.dur, (b - a) / 3));
  const put = (kind, x) => {
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

/* ── 애니메이션 효과음 — src/components/admin/studio-video/timeline.ts 와 같은 계산 ── */
const SFX_AUTO = { pop: "pop", fly: "whoosh", zoom: "whoosh-short", spin: "whoosh", roll: "whoosh", flip: "click", drop: "pop", slideL: "whoosh-short", slideR: "whoosh-short", big: "whoosh", stretch: "pop", swing: "whoosh-short", jelly: "pop" };
function sfxName(kind, set, dflt, isText) {
  if (!kind) return null;
  const v = set || dflt;
  if (v === "none") return null;
  if (v !== "auto") return v;
  return isText ? "key-press" : SFX_AUTO[kind] || null;
}
function sfxEvents(p, items, order = clipOrder(p)) {
  const ev = [];
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
  // 효과음 레이어 — 그 클립(단어) 시작에 한 번 (timeline.ts 와 같다)
  for (const l of p.layers || []) {
    if (l.off || l.type !== "sfx" || !l.sfx) continue;
    const cov = layerItems(p, l, items, order);
    if (!cov.length) continue;
    const sp = layerSpan(p, l, items, cov[0].clip.id, p.settings, order);
    ev.push({ t: cov[0].start + (sp ? Math.max(0, sp.a) : 0), name: l.sfx, vol: Math.max(0, Math.min(1, l.volume ?? 0.8)), keep: true });
  }
  // 화면전환 효과음 (clip.trans.sfx, 2026-10-20) — 전환이 시작될 때 (앞 클립 끝 a초 앞)
  for (let i = 1; i < items.length; i++) {
    const tr = items[i].clip.trans;
    if (!tr || !tr.sfx) continue;
    const a = Math.max(0, Math.min(Number(tr.a) || 0, items[i - 1].dur * 0.45));
    ev.push({ t: Math.max(0, items[i].start - a), name: tr.sfx, vol: 0.6, keep: true });
  }
  const sub = (p.settings && p.settings.subtitle) || {};
  for (const it of items) {
    const sa = subAnimOf(p, it.clip);
    const st = subStyleOf(p.settings || {}, it.clip).anim;
    if (!sa || !st || sub.on === false || it.clip.sub === false) continue;
    const n = sfxName(sa.in, st.sfx, "none", true);
    if (n) ev.push({ t: it.start, name: n, vol: Math.max(0, Math.min(1, st.sfxVol ?? 0.6)) });
  }
  ev.sort((x, y) => x.t - y.t);
  return ev.filter((e, i) => e.keep || !i || e.t - ev[i - 1].t > 0.12);
}

module.exports = { cropOf, kfVal, kfHas, clipKeyBase, layerRange, easeVal, kfSort, kfAt, layerAtTime, imgRect, clipBaseRect, clipKeys, adjMatrix, textEm, capEm, sfxEvents, animOf, subAnimOf, layerSpan, animAt, motionOf, motionAt, subStyleOf, srcSpeed, keepRanges, clipDuration, wordTimes, clipText, flatten, estimateSeconds, speedOf, GAP, clipOrder, layerItems, layersAt, layerWindow, musicLayers, subtitleText, zLayers, effSpacing, effLeading, subWordOf, lineWords, wordState };
