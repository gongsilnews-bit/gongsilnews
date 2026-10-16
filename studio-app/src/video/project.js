// 영상 편집기 — 프로젝트 (PC에 저장, 자동 저장·복구)
//  저장 자리: 문서\공실뉴스 스튜디오\영상\<이름_날짜>\  (공실과 연결된 영상은 그 매물 폴더\영상\<이름_날짜>\)
//    project.json  autosave\  voice\  assets\(받은 자료)  audio\(받아쓰기용 소리)  output\(완성 영상)
//  최근 프로젝트 목록: userData\video-projects.json
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const log = require("electron-log/main");
const media = require("./media");
const library = require("./library");
const server = require("./server");
const ff = require("./ff");
const tl = require("./timeline");

const recentFile = () => path.join(app.getPath("userData"), "video-projects.json");
const RATIOS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350], "4:3": [1440, 1080] };
const uid = () => crypto.randomBytes(6).toString("hex");
const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
const stamp = () => {
  const d = new Date();
  return `${d.getMonth() + 1}월${d.getDate()}일 ${d.getHours()}시${String(d.getMinutes()).padStart(2, "0")}분`;
};

const DEFAULT_SETTINGS = {
  fill: "cover", // cover 꽉 채우기 · contain 맞추기 · blur 맞추고 흐린 배경
  subtitle: { on: true, position: "bottom", length: "long", size: 100, font: "Malgun Gothic", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bg: false, bold: true },
  voice: { id: "Charon", speed: 1, volume: 1 },
  music: { on: false, mood: "calm", file: "", name: "", volume: 0.15 },
  sourceVolume: 1,
};

function readRecent() {
  try {
    return JSON.parse(fs.readFileSync(recentFile(), "utf8"));
  } catch {
    return [];
  }
}
function remember(p) {
  const list = readRecent().filter((r) => r.dir.toLowerCase() !== p.dir.toLowerCase());
  list.unshift({ dir: p.dir, name: p.name, ratio: p.ratio, method: p.method, updatedAt: p.updatedAt, thumb: p.thumb || "", duration: p.duration || 0 });
  fs.mkdirSync(path.dirname(recentFile()), { recursive: true });
  fs.writeFileSync(recentFile(), JSON.stringify(list.slice(0, 100), null, 1));
}

/** 새 프로젝트 — { method: text|video|longform|record, ratio, name?, vacancyId? } */
function create({ method = "video", ratio = "16:9", name = "", vacancyId = "" } = {}) {
  if (!RATIOS[ratio]) ratio = "16:9";
  const label = { text: "텍스트 영상", video: "영상 편집", longform: "숏폼", record: "녹화 영상" }[method] || "영상";
  const nm = safeName(name) || `${label}_${stamp()}`;
  let base = path.join(library.studioRoot(), "영상");
  if (vacancyId) {
    try {
      base = require("../out-folder").folderFor(vacancyId, "영상");
    } catch {}
  }
  let dir = path.join(base, nm);
  for (let n = 2; fs.existsSync(dir); n++) dir = path.join(base, `${nm}_${n}`);
  fs.mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const p = { v: 1, id: uid(), name: path.basename(dir), method, ratio, vacancyId: vacancyId || "", createdAt: now, updatedAt: now, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), assets: {}, scenes: [{ id: uid(), clips: [] }], dir };
  writeProject(p);
  media.allowRoot(dir);
  log.info(`[영상] 새 프로젝트 ${dir}`);
  return p;
}

function writeProject(p) {
  const file = path.join(p.dir, "project.json");
  const { dir, ...data } = p;
  const json = JSON.stringify(data, null, 1);
  fs.mkdirSync(p.dir, { recursive: true });
  fs.writeFileSync(`${file}.tmp`, json);
  fs.renameSync(`${file}.tmp`, file);
  // 자동 저장본 — 5분마다 하나씩, 최근 10개
  const auto = path.join(p.dir, "autosave");
  fs.mkdirSync(auto, { recursive: true });
  const list = fs.readdirSync(auto).filter((f) => f.endsWith(".json")).sort();
  const last = list.length ? fs.statSync(path.join(auto, list[list.length - 1])).mtimeMs : 0;
  if (Date.now() - last > 5 * 60 * 1000) {
    fs.writeFileSync(path.join(auto, `${Date.now()}.json`), json);
    list.slice(0, Math.max(0, list.length - 9)).forEach((f) => fs.rmSync(path.join(auto, f), { force: true }));
  }
}

/** 저장 (편집 화면이 바뀔 때마다 부른다) */
function save(p) {
  if (!p || !p.dir) throw new Error("프로젝트 정보가 없습니다.");
  p.updatedAt = new Date().toISOString();
  p.duration = tl.flatten(p).total;
  const firstVisual = Object.values(p.assets || {}).find((a) => a.thumb);
  p.thumb = firstVisual ? firstVisual.thumb : "";
  writeProject(p);
  remember(p);
  return { updatedAt: p.updatedAt, duration: p.duration };
}

/**
 * 다른 이름으로 저장 — 프로젝트 폴더를 통째로 새 이름 폴더로 복사 (자동 저장 기록은 빼고)
 * 폴더 안 파일(목소리 등)을 가리키는 위치는 새 폴더로 고친다. 내 자료처럼 폴더 밖 파일은 그대로 같이 쓴다.
 * 원본은 마지막으로 저장된 그대로 두고, 지금 편집 중인 내용은 사본에 담는다
 */
function saveAs(p, name) {
  if (!p || !p.dir || !fs.existsSync(p.dir)) throw new Error("프로젝트 정보가 없습니다.");
  const nm = safeName(name);
  if (!nm) throw new Error("새 이름을 써 주세요.");
  const base = path.dirname(p.dir);
  let dir = path.join(base, nm);
  for (let n = 2; fs.existsSync(dir); n++) dir = path.join(base, `${nm}_${n}`);
  const auto = path.join(p.dir, "autosave").toLowerCase();
  const own = path.join(p.dir, "project.json").toLowerCase();
  fs.cpSync(p.dir, dir, {
    recursive: true,
    filter: (src) => {
      const s = src.toLowerCase();
      return s !== auto && !s.startsWith(auto + path.sep) && s !== own && !s.endsWith(".tmp");
    },
  });
  // 폴더 안을 가리키는 위치 → 새 폴더
  const from = p.dir.toLowerCase() + path.sep;
  const fix = (v) => {
    if (typeof v === "string") return v.toLowerCase().startsWith(from) ? path.join(dir, v.slice(from.length)) : v;
    if (Array.isArray(v)) return v.map(fix);
    if (v && typeof v === "object") {
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = fix(x);
      return o;
    }
    return v;
  };
  const { dir: _old, ...data } = p;
  const now = new Date().toISOString();
  const q = { ...fix(data), id: uid(), name: path.basename(dir), createdAt: now, updatedAt: now, dir };
  writeProject(q);
  log.info(`[영상] 다른 이름으로 저장 ${p.dir} → ${dir}`);
  const opened = open(dir);
  // 음악 애셋 주소도 새로
  for (const l of opened.layers || []) if (l.file) l.url = media.urlOf(l.file);
  return opened;
}

/** 열기 — 없어진 원본 파일 표시 (missing) */
function open(dir) {
  const file = path.join(dir, "project.json");
  if (!fs.existsSync(file)) throw new Error("프로젝트 파일을 찾지 못했습니다.");
  const p = JSON.parse(fs.readFileSync(file, "utf8"));
  p.dir = dir;
  media.allowRoot(dir);
  for (const a of Object.values(p.assets || {})) {
    a.missing = !fs.existsSync(a.path);
    if (!a.missing) media.allow(a.path);
    if (a.edit && fs.existsSync(a.edit)) media.allow(a.edit);
    if (a.thumb) media.allow(media.fileOf(a.thumb));
  }
  remember(p);
  return withUrls(p);
}

/** 편집 화면용 주소를 붙인다 */
function withUrls(p) {
  for (const a of Object.values(p.assets || {})) {
    a.url = media.urlOf(a.edit && fs.existsSync(a.edit) ? a.edit : a.path);
  }
  for (const sc of p.scenes || []) for (const c of sc.clips || []) if (c.voice && c.voice.file) c.voice.url = media.urlOf(c.voice.file);
  if (p.settings && p.settings.music && p.settings.music.file) p.settings.music.url = media.urlOf(p.settings.music.file);
  return p;
}

function recent() {
  return readRecent()
    .filter((r) => fs.existsSync(path.join(r.dir, "project.json")))
    .map((r) => ({ ...r, thumb: r.thumb || "" }));
}

/** 라이브러리 자료를 프로젝트에 넣는다 — 편집용 사본을 만들어 둔다 (미리보기·굽기를 빠르게) */
async function addAsset(p, libId, onProgress = () => {}) {
  const it = library.get(libId);
  if (!it) throw new Error("자료를 찾지 못했습니다.");
  await library.ensureMeta(it);
  const edit = await library.prepare(libId, onProgress);
  const a = {
    id: it.id,
    path: it.path,
    edit: edit !== it.path ? edit : "",
    kind: it.kind,
    name: it.name,
    duration: it.meta ? it.meta.duration : 0,
    width: it.meta ? it.meta.width : 0,
    height: it.meta ? it.meta.height : 0,
    hasAudio: Boolean(it.meta && it.meta.hasAudio),
    thumb: it.thumb ? media.urlOf(it.thumb) : "",
    source: it.source,
    credit: it.credit || "",
  };
  a.url = media.urlOf(a.edit || a.path);
  return a;
}

/* ── AI 목소리 ── 같은 문장·목소리는 한 번만 받는다 (프로젝트 voice\) */
async function voiceFor(p, text, voiceId) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) throw new Error("읽을 문장이 없습니다.");
  const h = crypto.createHash("sha1").update(`${voiceId}\n${t}`).digest("hex").slice(0, 16);
  const file = path.join(p.dir, "voice", `${voiceId}_${h}.wav`);
  if (!fs.existsSync(file)) {
    const r = await server.call("/api/studio/video/voice", { method: "POST", body: { text: t, voice: voiceId } });
    if (!r.success) throw new Error(r.error || "목소리를 만들지 못했습니다.");
    await server.download(r.url, file);
  }
  media.allow(file);
  const info = await ff.probe(file);
  return { file, url: media.urlOf(file), duration: info.duration, id: voiceId, text: t, words: spreadWords(t, info.duration) };
}

/** 문장 길이에 맞춰 단어 시각을 나눈다 (성우 음성에는 단어 시각이 없어서 글자 수로 나눈다) */
function spreadWords(text, dur) {
  const tokens = String(text).split(/\s+/).filter(Boolean);
  const total = tokens.reduce((a, w) => a + w.length + 0.6, 0) || 1;
  let t = 0;
  return tokens.map((w) => {
    const d = ((w.length + 0.6) / total) * dur;
    const r = { w, s: +t.toFixed(3), e: +(t + d).toFixed(3) };
    t += d;
    return r;
  });
}

/* ── 받아쓰기 ── 소리만 90초씩 서버로 (원본 영상은 보내지 않음) → 문장 + 무음 구간으로 시각 맞추기 */
async function transcribe(p, assetId, onProgress = () => {}) {
  const a = p.assets[assetId];
  if (!a) throw new Error("영상을 찾지 못했습니다.");
  if (!a.hasAudio && a.kind === "video") return { clips: [{ id: uid(), type: "source", text: "", src: { asset: assetId, s: 0, e: a.duration }, words: [] }], speech: [] };
  const dur = a.duration;
  const CH = 90;
  const segs = [];
  const parts = Math.max(1, Math.ceil(dur / CH));
  for (let i = 0; i < parts; i++) {
    onProgress(`말소리를 글로 바꾸는 중… (${i + 1}/${parts})`, i / parts);
    const start = i * CH;
    const tmp = path.join(p.dir, "audio", `${assetId}_${i}.mp3`);
    await ff.audioForSpeech(a.path, tmp, { start, len: Math.min(CH + 1, dur - start) });
    const b64 = fs.readFileSync(tmp).toString("base64");
    let r = null;
    for (let tryNo = 0; tryNo < 3 && !(r && r.success); tryNo++) {
      r = await server.call("/api/studio/video/transcribe", { method: "POST", body: { audio: b64, mime: "audio/mpeg" } }).catch((e) => ({ success: false, error: e.message }));
    }
    if (!r || !r.success) throw new Error(`받아쓰기에 실패했습니다: ${(r && r.error) || ""}`);
    for (const s of r.segments || []) {
      const ss = start + s.start;
      const ee = Math.min(dur, start + s.end);
      if (ss < (segs.length ? segs[segs.length - 1].end - 0.3 : -1)) continue; // 토막 경계에서 겹친 문장
      segs.push({ start: ss, end: ee, text: s.text });
    }
  }
  onProgress("말이 없는 구간을 찾는 중…", 0.95);
  const speech = await ff.speech(a.path, dur);
  return { clips: buildClips(assetId, segs, speech, dur), speech };
}

/* 문장 시각을 실제 말소리 구간에 맞추고, 사이의 무음은 따로 클립으로 (브루처럼) */
function buildClips(assetId, segs, speech, dur) {
  const snap = (t, edge) => {
    let best = t;
    let bd = 0.7;
    for (const r of speech) {
      const v = edge === "s" ? r.s : r.e;
      if (Math.abs(v - t) < bd) {
        bd = Math.abs(v - t);
        best = v;
      }
    }
    return best;
  };
  const clips = [];
  let t = 0;
  segs.forEach((sg, i) => {
    let s = Math.max(t, snap(sg.start, "s") - 0.08);
    let e = Math.min(dur, snap(sg.end, "e") + 0.12);
    const next = segs[i + 1];
    if (next) e = Math.min(e, Math.max(s + 0.3, snap(next.start, "s") - 0.05));
    if (e <= s) e = Math.min(dur, s + 0.5);
    if (s - t > 0.6) clips.push({ id: uid(), type: "silence", text: "", src: { asset: assetId, s: t, e: s } });
    else if (s > t) s = t; // 짧은 틈은 앞 문장에 붙인다
    clips.push({ id: uid(), type: "source", text: sg.text, src: { asset: assetId, s, e }, words: spreadSource(sg.text, s, e, speech) });
    t = e;
  });
  if (dur - t > 0.6) clips.push({ id: uid(), type: "silence", text: "", src: { asset: assetId, s: t, e: dur } });
  else if (clips.length && dur > t) clips[clips.length - 1].src.e = dur;
  if (!clips.length) clips.push({ id: uid(), type: "source", text: "", src: { asset: assetId, s: 0, e: dur }, words: [] });
  return clips;
}

/* 원본 문장 안 단어 시각 — 말소리 구간 안에서 글자 수만큼 나눈다 */
function spreadSource(text, s, e, speech) {
  const tokens = String(text).split(/\s+/).filter(Boolean);
  const inner = speech.map((r) => ({ s: Math.max(s, r.s), e: Math.min(e, r.e) })).filter((r) => r.e - r.s > 0.05);
  const spans = inner.length ? inner : [{ s, e }];
  const talk = spans.reduce((a, r) => a + (r.e - r.s), 0);
  const total = tokens.reduce((a, w) => a + w.length + 0.5, 0) || 1;
  const at = (x) => {
    let rem = x;
    for (const r of spans) {
      const d = r.e - r.s;
      if (rem <= d) return r.s + rem;
      rem -= d;
    }
    return spans[spans.length - 1].e;
  };
  let acc = 0;
  return tokens.map((w) => {
    const d = ((w.length + 0.5) / total) * talk;
    const r = { w, s: +at(acc).toFixed(3), e: +at(acc + d).toFixed(3) };
    acc += d;
    return r;
  });
}

/* ── 내보내기: 자막(.srt) · 텍스트(.txt) ── */
const srtTime = (t) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};
function exportText(p, kind) {
  const { items } = tl.flatten(p);
  const out = path.join(p.dir, "output");
  fs.mkdirSync(out, { recursive: true });
  let file;
  if (kind === "srt") {
    let n = 0;
    const body = items
      .filter((x) => x.clip.sub !== false && (x.clip.type !== "silence" || typeof x.clip.subText === "string") && tl.subtitleText(x.clip).trim())
      .map((x) => `${++n}\n${srtTime(x.start)} --> ${srtTime(x.start + x.dur)}\n${tl.subtitleText(x.clip)}\n`)
      .join("\n");
    file = path.join(out, `${p.name}.srt`);
    fs.writeFileSync(file, body, "utf8");
  } else {
    const body = (p.scenes || []).map((sc) => sc.clips.filter((c) => !c.del && c.type !== "silence").map((c) => tl.clipText(c)).filter(Boolean).join("\n")).join("\n\n");
    file = path.join(out, `${p.name}.txt`);
    fs.writeFileSync(file, body, "utf8");
  }
  return file;
}

module.exports = { create, open, save, saveAs, recent, addAsset, voiceFor, transcribe, exportText, withUrls, RATIOS, DEFAULT_SETTINGS, uid, spreadWords };
