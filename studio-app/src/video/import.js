// 영상 가져오기 (2026-10-28 사장님) — 캡컷 프로젝트 · 클로드(AI)가 만든 영상 설계도를 우리 편집기 프로젝트(.gss)로
//
//  1) 캡컷: 프로젝트 폴더의 draft_content.json (시간 = 마이크로초). 첫 영상 줄 = 메인 클립, 다른 영상 줄 = 화면 위 사진·영상,
//     글자 줄 = 화면 글자, 오디오 줄 = 음악·소리. 캡컷 전용 효과·필터·전환·스티커·글자 템플릿은 옮기지 못한다 (빠진 것을 알려 준다)
//  2) 공실마케팅 영상 JSON ("format": "gongsil-video") — 클로드가 직접 쓰는 간단한 설계도. 설명서: src/video/claude-guide.md (AI받기 폴더에 "클로드용 설명서.md"로 복사)
//
//  둘 다 먼저 같은 "중간 모양"으로 바꾼 뒤 build() 하나로 프로젝트를 만든다:
//   { name, ratio, vacancyId, main: [{ file, s, e, hold, speed, volume, say, blank }], texts: [{ text, at, dur, x, y, pos, size, color, bold }],
//     audio: [{ file, at, dur, offset, volume }], overlays: [{ file, at, dur, s, x, y, w }], skipped: ["효과 3개", …] }
const { app } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");
const log = require("electron-log/main");
const project = require("./project");
const library = require("./library");
const media = require("./media");

const US = 1e6; // 캡컷 시간 단위 (마이크로초)
const RATIOS = { "16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "4:3": 4 / 3 };
const nearRatio = (w, h) => {
  if (!(w > 0 && h > 0)) return "16:9";
  const r = w / h;
  return Object.keys(RATIOS).sort((a, b) => Math.abs(RATIOS[a] - r) - Math.abs(RATIOS[b] - r))[0];
};
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/* ── 받기 폴더 · 설명서 ── */
function inboxDir() {
  const d = require("../studio-root").dir("vid", "AI받기");
  fs.mkdirSync(d, { recursive: true });
  // 클로드가 이 폴더를 열면 바로 읽게 설명서를 둔다 (앱 버전이 바뀌면 새로 쓴다)
  try {
    const src = path.join(__dirname, "claude-guide.md");
    const dst = path.join(d, "클로드용 설명서.md");
    const text = fs.readFileSync(src, "utf8");
    if (!fs.existsSync(dst) || fs.readFileSync(dst, "utf8") !== text) fs.writeFileSync(dst, text);
  } catch {}
  return d;
}

/** 받기 폴더에 들어온 것 — 우리 JSON 파일 · 캡컷 프로젝트 폴더 (최근 것 먼저) */
function inboxList() {
  const d = inboxDir();
  const out = [];
  for (const name of fs.readdirSync(d)) {
    const f = path.join(d, name);
    let st;
    try { st = fs.statSync(f); } catch { continue; }
    if (st.isDirectory() && fs.existsSync(path.join(f, "draft_content.json"))) out.push({ file: f, name, kind: "capcut", at: st.mtimeMs });
    else if (st.isFile() && /\.json$/i.test(name)) {
      const j = readJson(f);
      if (j && j.format === "gongsil-video") out.push({ file: f, name: j.name || name.replace(/\.json$/i, ""), kind: "gongsil", at: st.mtimeMs });
      else if (j && Array.isArray(j.tracks) && j.materials) out.push({ file: f, name, kind: "capcut", at: st.mtimeMs });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/* ── 캡컷 프로젝트 목록 (이 PC) ── */
function capcutRoots() {
  const list = [];
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  list.push(path.join(local, "CapCut", "User Data", "Projects", "com.lveditor.draft"));
  list.push(path.join(os.homedir(), "Movies", "CapCut", "User Data", "Projects", "com.lveditor.draft")); // 맥
  return list.filter((d) => fs.existsSync(d));
}
function capcutList() {
  const out = [];
  const seen = new Set();
  for (const root of capcutRoots()) {
    const meta = readJson(path.join(root, "root_meta_info.json")) || {};
    const drafts = (meta.all_draft_store || []).map((d) => ({ dir: String(d.draft_fold_path || "").replace(/\//g, path.sep), name: d.draft_name, at: num(d.tm_draft_modified) / 1000, cover: d.draft_cover || "" }));
    // 목록에 없는 기본 자리 폴더도
    for (const n of fs.readdirSync(root)) { const dir = path.join(root, n); if (!drafts.some((d) => d.dir === dir)) drafts.push({ dir, name: n, at: 0, cover: "" }); }
    for (const d of drafts) {
      const f = path.join(d.dir, "draft_content.json");
      if (seen.has(d.dir) || !fs.existsSync(f)) continue;
      seen.add(d.dir);
      let at = d.at;
      try { at = at || fs.statSync(f).mtimeMs; } catch {}
      const cover = d.cover && fs.existsSync(d.cover) ? d.cover : path.join(d.dir, "draft_cover.jpg");
      out.push({ dir: d.dir, name: d.name || path.basename(d.dir), at, cover: fs.existsSync(cover) ? (media.allow(cover), media.urlOf(cover)) : "" });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/* ── 캡컷 → 중간 모양 ── */
function textOf(m) {
  const raw = String((m && m.content) || "");
  try {
    const j = JSON.parse(raw);
    const style = (j.styles && j.styles[0]) || {};
    const c = style.fill && style.fill.content && style.fill.content.solid && style.fill.content.solid.color;
    const color = Array.isArray(c) ? "#" + c.map((v) => Math.round(num(v) * 255).toString(16).padStart(2, "0")).join("").toUpperCase() : "";
    return { text: String(j.text || ""), size: num(style.size, 15), color, bold: Boolean(style.bold) };
  } catch {
    return { text: raw.replace(/<[^>]+>/g, "").replace(/\[|\]/g, ""), size: num(m && m.font_size, 15), color: (m && m.text_color) || "", bold: false };
  }
}
function fromCapcut(file) {
  const j = readJson(file);
  if (!j || !Array.isArray(j.tracks) || !j.materials) throw new Error("캡컷 프로젝트 파일을 읽지 못했어요. 캡컷 버전이 파일을 잠갔을 수 있어요.");
  const dirOf = path.dirname(file);
  const fileOf = (m) => {
    let p = String((m && m.path) || "");
    if (!p) return "";
    p = p.replace(/##_draftpath_placeholder_[^#]*_##/g, dirOf).replace(/\//g, path.sep);
    if (!path.isAbsolute(p)) p = path.join(dirOf, p);
    if (fs.existsSync(p)) return p;
    // 못 찾으면 — 프로젝트 안 Resources, 복사본 프로젝트면 옆의 원본 폴더("0205 (1)" 등)에서 같은 이름 (2026-10-28 사장님 0205)
    const base = path.basename(p);
    for (const d of searchDirs()) { const q = path.join(d, base); if (fs.existsSync(q)) return q; }
    return "";
  };
  let dirsMemo = null;
  const searchDirs = () => {
    if (dirsMemo) return dirsMemo;
    const parent = path.dirname(dirOf);
    const me = path.basename(dirOf);
    const sib = (() => { try { return fs.readdirSync(parent).filter((n) => n !== me && n.startsWith(me)).map((n) => path.join(parent, n)); } catch { return []; } })();
    dirsMemo = [path.join(dirOf, "Resources"), ...sib, ...sib.map((d) => path.join(d, "Resources"))];
    return dirsMemo;
  };
  const cv = j.canvas_config || {};
  const out = { name: j.name || path.basename(dirOf), ratio: nearRatio(num(cv.width), num(cv.height)), main: [], texts: [], audio: [], overlays: [], skipped: [] };
  const miss = [];
  const skip = {};
  let trans = 0;
  // 한 프로젝트(또는 복합 클립 안)를 읽는다 — shift: 안쪽 시각 + shift = 바깥 시각, lo~hi: 바깥에서 보이는 구간, main: 이 안의 첫 영상 줄이 메인인가
  // 모든 단계(복합 클립 안의 복합 클립까지)의 재료 — 안쪽 클립이 바깥 목록의 재료를 가리키기도 한다
  const all = {};
  const gather = (d) => { for (const [k, arr] of Object.entries((d && d.materials) || {})) if (Array.isArray(arr)) for (const m of arr) if (m && m.id) { all[m.id] = all[m.id] || { ...m, _k: k }; if (k === "drafts" && m.draft) gather(m.draft); } };
  gather(j);
  const depth = { n: 0 };
  const walk = (d, shift, lo, hi, main) => {
    if (++depth.n > 200) return;
    const mat = { ...all };
    for (const [k, arr] of Object.entries(d.materials || {})) if (Array.isArray(arr)) for (const m of arr) if (m && m.id) mat[m.id] = { ...m, _k: k };
    trans += Object.values(d.materials && d.materials.transitions || []).length;
    const tracks = d.tracks || [];
    const firstVideo = tracks.find((t) => t.type === "video");
    for (const t of tracks) {
      const segs = [...(t.segments || [])].sort((a, b) => num(a.target_timerange && a.target_timerange.start) - num(b.target_timerange && b.target_timerange.start));
      for (const s of segs) {
        let at = num(s.target_timerange && s.target_timerange.start) / US + shift;
        let dur = num(s.target_timerange && s.target_timerange.duration) / US;
        let ss = num(s.source_timerange && s.source_timerange.start) / US;
        let sd = num(s.source_timerange && s.source_timerange.duration, num(s.target_timerange && s.target_timerange.duration)) / US;
        // 바깥 구간(lo~hi)에 맞춰 자른다 (복합 클립을 앞뒤로 잘라 쓴 경우)
        if (at + dur <= lo + 1e-3 || at >= hi - 1e-3) continue;
        if (at < lo) { const cut = lo - at; ss += cut * (sd / Math.max(dur, 1e-6)); sd -= cut * (sd / Math.max(dur, 1e-6)); dur -= cut; at = lo; }
        if (at + dur > hi) { const cut = at + dur - hi; sd -= cut * (sd / Math.max(dur, 1e-6)); dur -= cut; }
        const m = mat[s.material_id];
        const tr = (s.clip && s.clip.transform) || {};
        const sc = num(s.clip && s.clip.scale && s.clip.scale.x, 1);
        if (t.type === "video") {
          // 복합 클립 — 안쪽 프로젝트를 펼친다 (2026-10-28: 사장님 캡컷 0205 가 통째로 복합 클립)
          const inner = (s.extra_material_refs || []).map((id) => mat[id]).find((x) => x && x._k === "drafts" && x.draft && Array.isArray(x.draft.tracks));
          if (inner && !fileOf(m)) {
            walk(inner.draft, at - ss, at, at + dur, main && t === firstVideo);
            continue;
          }
          const f = fileOf(m);
          if (!f) { if (m && m.path) miss.push(path.basename(String(m.path))); continue; }
          const photo = m.type === "photo";
          if (main && t === firstVideo) out.main.push({ at, file: f, s: photo ? 0 : ss, e: photo ? 0 : ss + sd, hold: dur, speed: num(s.speed, 1) || 1, volume: num(s.volume, 1) });
          else out.overlays.push({ file: f, at, dur, s: photo ? 0 : ss, x: 0.5 + num(tr.x) / 2, y: 0.5 - num(tr.y) / 2, w: Math.max(0.05, Math.min(1, sc)) });
        } else if (t.type === "audio") {
          const f = fileOf(m);
          if (!f) { if (m && m.path) miss.push(path.basename(String(m.path))); continue; }
          out.audio.push({ file: f, at, dur, offset: ss, volume: num(s.volume, 1), name: (m && m.name) || path.basename(f) });
        } else if (t.type === "text") {
          if (!m) continue;
          const tx = textOf(m);
          if (!tx.text.trim()) continue;
          // 캡컷 자막(자동 자막·자막 줄) = 우리 메인자막, 그 밖의 글자 = 화면 글자 (2026-10-28 사장님: 자막이 안 들어감)
          out.texts.push({ text: tx.text, at, dur, x: 0.5 + num(tr.x) / 2, y: 0.5 - num(tr.y) / 2, size: Math.round((tx.size / 15) * 100 * sc), color: tx.color || "#FFFFFF", bold: tx.bold, sub: m.type === "subtitle" });
        } else {
          const label = { effect: "효과", filter: "필터", sticker: "스티커", adjust: "보정" }[t.type] || t.type;
          skip[label] = (skip[label] || 0) + 1;
        }
      }
    }
  };
  walk(j, 0, 0, Infinity, true);
  if (trans) skip["전환"] = trans;
  out.skipped = Object.entries(skip).map(([k, n]) => `${k} ${n}개`);
  if (miss.length) out.skipped.push(`찾지 못한 파일 ${miss.length}개 (${[...new Set(miss)].slice(0, 3).join(", ")}${miss.length > 3 ? " …" : ""})`);
  return out;
}

/* ── 공실마케팅 영상 JSON → 중간 모양 ── */
function vacancyPhotos(key) {
  if (!key) return [];
  const root = path.join(app.getPath("userData"), "media");
  const ok = (a) => ((a && a.media) || []).map((m) => m.file).filter((f) => f && fs.existsSync(f));
  const direct = readJson(path.join(root, String(key).replace(/[^\w-]/g, ""), "analysis.json"));
  if (direct) return ok(direct);
  // 공실번호로 — 분석해 둔 공실 중 "공실광고번호"가 같은 것
  for (const n of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    const a = readJson(path.join(root, n, "analysis.json"));
    const no = a && a.vacancy && ((a.vacancy.fields || []).find((f) => f.label === "공실광고번호") || {}).value;
    if (no && String(no).trim() === String(key).trim()) return ok(a);
  }
  return [];
}
function vacancyIdOf(key) {
  if (!key) return "";
  const root = path.join(app.getPath("userData"), "media");
  if (fs.existsSync(path.join(root, String(key).replace(/[^\w-]/g, ""), "analysis.json"))) return String(key);
  for (const n of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    const a = readJson(path.join(root, n, "analysis.json"));
    const no = a && a.vacancy && ((a.vacancy.fields || []).find((f) => f.label === "공실광고번호") || {}).value;
    if (no && String(no).trim() === String(key).trim()) return n;
  }
  return "";
}
function fromGongsil(file) {
  const j = readJson(file);
  if (!j || j.format !== "gongsil-video") throw new Error("공실마케팅 영상 JSON 이 아니에요 (\"format\": \"gongsil-video\").");
  const base = path.dirname(file);
  const vac = vacancyPhotos(j.vacancy);
  const miss = [];
  const resolve = (f) => {
    const s = String(f || "").trim();
    if (!s) return "";
    const m = /^(?:vacancy|공실)\s*:\s*(\d+)$/i.exec(s);
    if (m) { const p = vac[Number(m[1]) - 1]; if (!p) miss.push(s); return p || ""; }
    const p = path.isAbsolute(s) ? s : path.join(base, s);
    if (!fs.existsSync(p)) { miss.push(path.basename(s)); return ""; }
    return p;
  };
  const out = { name: j.name || path.basename(file, ".json"), ratio: RATIOS[j.ratio] ? j.ratio : "16:9", vacancyId: vacancyIdOf(j.vacancy), main: [], texts: [], audio: [], overlays: [], skipped: [], subtitles: j.subtitles !== false, voice: j.voice || "" };
  let at = 0;
  for (const c of j.clips || []) {
    if (c.blank != null) { const d = Math.max(0.1, num(c.blank, 1)); out.main.push({ at, blank: true, hold: d }); at += d; continue; }
    const f = c.file ? resolve(c.file) : "";
    const s = num(c.from, 0);
    const e = c.to != null ? num(c.to) : 0;
    const hold = c.seconds != null ? num(c.seconds, 3) : e > s ? e - s : c.say ? 0 : 3;
    out.main.push({ at, file: f, s, e: e > s ? e : 0, hold, speed: num(c.speed, 1) || 1, volume: c.volume != null ? num(c.volume, 1) : 1, say: c.say ? String(c.say) : "", useAudio: c.audio !== false });
    at += hold || Math.max(1.2, String(c.say || "").replace(/\s/g, "").length / 5);
  }
  const pos = (v) => (["top", "middle", "bottom"].includes(v) ? v : "");
  for (const t of j.texts || []) {
    if (!String(t.text || "").trim()) continue;
    const st = num(t.start, 0);
    out.texts.push({ text: String(t.text), at: st, dur: t.end != null ? Math.max(0.2, num(t.end) - st) : 0, pos: pos(t.position) || (t.x == null ? "top" : ""), x: t.x != null ? num(t.x, 0.5) : undefined, y: t.y != null ? num(t.y, 0.5) : undefined, size: num(t.size, 100), color: t.color || "#FFFFFF", bold: t.bold !== false });
  }
  for (const a of j.music || []) {
    const f = resolve(a.file);
    if (!f) continue;
    const st = num(a.start, 0);
    out.audio.push({ file: f, at: st, dur: a.end != null ? Math.max(0.2, num(a.end) - st) : 0, offset: num(a.from, 0), volume: a.volume != null ? num(a.volume, 0.3) : 0.3, loop: a.loop !== false, name: path.basename(f) });
  }
  for (const o of j.overlays || []) {
    const f = resolve(o.file);
    if (!f) continue;
    const st = num(o.start, 0);
    out.overlays.push({ file: f, at: st, dur: o.end != null ? Math.max(0.2, num(o.end) - st) : 0, s: num(o.from, 0), x: num(o.x, 0.5), y: num(o.y, 0.5), w: Math.max(0.05, Math.min(1, num(o.width, 0.3))) });
  }
  if (miss.length) out.skipped.push(`찾지 못한 파일 ${miss.length}개 (${[...new Set(miss)].slice(0, 3).join(", ")}${miss.length > 3 ? " …" : ""})`);
  return out;
}

/* ── 중간 모양 → 우리 프로젝트 ── */
async function build(t, onProgress = () => {}) {
  const p = project.create({ method: "video", ratio: t.ratio, name: t.name, vacancyId: t.vacancyId || "" });
  // 성우 — 제미나이 이름(영문 한 단어)·타입캐스트(tc_)·일레븐랩스(el_)·내 목소리(me)만. 모르는 이름이면 앱 기본 성우
  if (t.voice && (/^[A-Z][a-z]+$/.test(t.voice) || /^(tc_|el_)/.test(t.voice) || t.voice === "me")) p.settings.voice.id = t.voice;
  if (t.subtitles === false) p.settings.subtitle.on = false;
  const assetOf = new Map();
  const files = [...new Set([...t.main.map((c) => c.file), ...t.overlays.map((o) => o.file), ...t.audio.map((a) => a.file)].filter(Boolean))];
  let i = 0;
  for (const f of files) {
    onProgress(`자료를 넣는 중… (${++i}/${files.length})`);
    try {
      const [it] = await library.add([f], { source: "import", allowAudio: true }); // 소리 파일도 (캡컷 성우·배경음악)
      if (!it) continue;
      const a = await project.addAsset(p, it.id);
      p.assets[a.id] = a;
      assetOf.set(f, a);
    } catch (e) {
      log.warn(`[가져오기] ${f}: ${e.message}`);
    }
  }
  // 메인 클립 — 사이 빈 곳은 검은 화면
  const clips = [];
  const starts = [];
  let cur = 0;
  const uid = project.uid;
  const blank = (d) => ({ id: uid(), type: "voice", text: "", words: [], voice: null, visual: null, hold: d });
  // 캡컷 "사진 + 따로 녹음한 성우" — 같은 자리·같은 길이 소리는 그 클립의 소리로 묶는다 (자동 자막·단어 편집이 되게, 2026-10-28 사장님)
  const usedAudio = new Set();
  for (const c of t.main) {
    if (c.blank || c.say) continue;
    const hit = t.audio.find((m) => !usedAudio.has(m) && Math.abs(m.at - c.at) < 0.15 && (!c.hold || Math.abs((m.dur || 0) - c.hold) < 0.35));
    if (hit && assetOf.get(hit.file)) { usedAudio.add(hit); c.voiceOf = hit; }
  }
  for (const c of [...t.main].sort((x, y) => x.at - y.at)) {
    if (c.at - cur > 0.05) { starts.push(cur); clips.push(blank(c.at - cur)); cur = c.at; }
    const a = c.file ? assetOf.get(c.file) : null;
    let clip;
    const va = c.voiceOf ? assetOf.get(c.voiceOf.file) : null;
    if (va) {
      // 소리 클립 + 화면 = 오디오로 편집하기와 같은 모양 (src = 성우 소리, visual = 사진·영상)
      const len = c.voiceOf.dur || c.hold || va.duration || 3;
      clip = { id: uid(), type: "source", text: "", words: [], src: { asset: va.id, s: c.voiceOf.offset || 0, e: (c.voiceOf.offset || 0) + len },
        visual: a ? { asset: a.id, s: a.kind === "video" ? c.s : 0, ...(a.kind === "video" && c.e > c.s ? { e: c.e } : {}) } : null, ...(a && a.kind === "video" ? { visualHold: true } : {}),
        ...(c.voiceOf.volume !== 1 ? { volume: c.voiceOf.volume } : {}) };
    } else if (c.blank || (!a && !c.say)) clip = blank(c.hold || 1);
    else if (a && a.kind === "video" && a.hasAudio && c.useAudio !== false && !c.say) {
      const e = c.e > c.s ? Math.min(c.e, a.duration || c.e) : a.duration || c.s + (c.hold || 3);
      clip = { id: uid(), type: "source", text: "", words: [], src: { asset: a.id, s: c.s, e }, ...(c.speed !== 1 ? { speed: c.speed } : {}), ...(c.volume !== 1 ? { volume: c.volume } : {}) };
    } else {
      const vis = a ? { asset: a.id, s: a.kind === "video" ? c.s : 0, ...(a.kind === "video" && c.e > c.s ? { e: c.e } : {}) } : null;
      clip = { id: uid(), type: "voice", text: c.say || "", words: [], voice: null, visual: vis, ...(c.say && !c.hold ? {} : { hold: Math.max(0.1, c.hold || 3) }), ...(a && a.kind === "video" ? { visualHold: true } : {}) };
    }
    starts.push(cur);
    clips.push(clip);
    const len = clip.type === "source" ? (clip.src.e - clip.src.s) / (clip.speed || 1) : clip.hold || Math.max(1.2, String(clip.text).replace(/\s/g, "").length / 5);
    cur += len;
  }
  if (!clips.length) { starts.push(0); clips.push(blank(3)); }
  p.scenes = [{ id: uid(), clips }];
  const total = cur;
  // 초 → (클립, 그 클립 처음부터 초)
  const at = (sec) => {
    let k = 0;
    for (let n = 0; n < starts.length; n++) if (starts[n] <= sec + 0.05) k = n;
    return { id: clips[k].id, off: Math.max(0, sec - starts[k]) };
  };
  const span = (st, dur) => {
    const a = at(st);
    const end = dur > 0 ? Math.min(total, st + dur) : 0;
    const b = end ? at(Math.max(st, end - 1e-3)) : { id: clips[clips.length - 1].id, off: null };
    return { from: a.id, to: b.id, ts: a.off || undefined, te: end ? end - starts[clips.findIndex((x) => x.id === b.id)] : undefined };
  };
  const layers = [];
  for (const o of t.overlays) {
    const a = assetOf.get(o.file);
    if (!a) continue;
    layers.push({ id: uid(), type: "image", asset: a.id, ...span(o.at, o.dur), x: o.x, y: o.y, w: o.w, ...(a.kind === "video" ? { vs: o.s } : {}), track: 2 });
  }
  for (const x of t.texts) {
    // 메인자막 — 글자 구간 가운데가 걸친 클립의 자막으로 (한 클립에 여러 줄이면 이어 붙인다)
    if (x.sub) {
      const mid = x.at + (x.dur > 0 ? x.dur / 2 : 0.01);
      const k = clips[at(mid).id === undefined ? 0 : clips.findIndex((c) => c.id === at(mid).id)];
      if (k) { k.subText = k.subText ? `${k.subText} ${x.text}` : x.text; k.sub = true; continue; }
    }
    layers.push({ id: uid(), type: "text", text: x.text, ...span(x.at, x.dur), ...(x.pos ? { pos: x.pos } : { x: x.x ?? 0.5, y: x.y ?? 0.5 }), size: x.size || 100, color: x.color || "#FFFFFF", font: "Pretendard", bold: x.bold !== false, track: 3 });
  }
  for (const m of t.audio) {
    if (usedAudio.has(m)) continue; // 클립 소리로 묶은 것
    const a = assetOf.get(m.file);
    if (!a) continue;
    layers.push({ id: uid(), type: "music", name: m.name || a.name, file: a.path, url: a.url, volume: m.volume ?? 0.6, fadeIn: 0, fadeOut: 0, offset: m.offset || 0, loop: Boolean(m.loop), ...span(m.at, m.dur), track: 3 });
  }
  p.layers = layers;
  p.layerZ = 1;
  p.tl = { v: Math.max(1, ...layers.filter((l) => l.type !== "music").map((l) => l.track || 2)), a: Math.max(2, ...layers.filter((l) => l.type === "music").map((l) => l.track || 3)) };
  project.flush(p);
  log.info(`[가져오기] ${p.file} 클립 ${clips.length} · 레이어 ${layers.length}${t.skipped.length ? " · 빠짐 " + t.skipped.join(", ") : ""}`);
  return { project: project.withUrls(p), skipped: t.skipped };
}

/** 가져오기 — 캡컷 프로젝트 폴더 · draft_content.json · 우리 JSON 파일 */
async function importAny(target, onProgress) {
  let f = String(target || "");
  if (!f || !fs.existsSync(f)) throw new Error("가져올 파일을 찾지 못했어요.");
  if (fs.statSync(f).isDirectory()) f = path.join(f, "draft_content.json");
  const j = readJson(f);
  if (!j) throw new Error("파일을 읽지 못했어요 (JSON 이 아니에요).");
  onProgress("설계도를 읽는 중…");
  const t = j.format === "gongsil-video" ? fromGongsil(f) : fromCapcut(f);
  return build(t, onProgress);
}

/* ── 붙여넣기 · AI 에게 맡기기 (2026-10-28 사장님) ── */
/** 글에서 설계도 JSON 꺼내기 — ```json 울타리·앞뒤 설명이 있어도 가장 바깥 { } */
function jsonOf(text) {
  const t = String(text || "");
  const a = t.indexOf("{"), z = t.lastIndexOf("}");
  if (a < 0 || z <= a) throw new Error("JSON 을 찾지 못했어요. AI 답에서 { 로 시작하는 부분을 통째로 붙여 넣어 주세요.");
  try { return JSON.parse(t.slice(a, z + 1)); } catch (e) { throw new Error(`JSON 을 읽지 못했어요 (${e.message}). AI 에게 "JSON 만 다시 줘"라고 해 보세요.`); }
}
/** 받기 폴더에 파일로 남기고 가져온다 (나중에 다시 열 수 있게) */
async function importJson(j, onProgress) {
  if (!j || (j.format !== "gongsil-video" && !(Array.isArray(j.tracks) && j.materials))) throw new Error("공실마케팅 영상 JSON (\"format\": \"gongsil-video\") 이나 캡컷 draft_content.json 이 아니에요.");
  const safe = String(j.name || "AI 설계도").replace(/[\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "AI 설계도";
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  const file = path.join(inboxDir(), `${stamp} ${safe}.json`);
  fs.writeFileSync(file, JSON.stringify(j, null, 2));
  return importAny(file, onProgress);
}
const importText = (text, onProgress = () => {}) => importJson(jsonOf(text), onProgress);

/** 이 PC에서 분석해 둔 공실 (AI 에게 맡길 때 고르는 목록) — 최근 것 먼저 */
function analyzedVacancies() {
  const root = path.join(app.getPath("userData"), "media");
  const out = [];
  for (const n of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    if (/^col-/.test(n)) continue;
    const f = path.join(root, n, "analysis.json");
    const a = readJson(f);
    if (!a || !a.vacancy) continue;
    const no = ((a.vacancy.fields || []).find((x) => x.label === "공실광고번호") || {}).value || "";
    let at = 0;
    try { at = fs.statSync(f).mtimeMs; } catch {}
    out.push({ id: n, no: String(no), title: [no, a.vacancy.title, a.vacancy.priceText].filter(Boolean).join(" · "), photos: (a.media || []).length, at });
  }
  return out.sort((x, y) => y.at - x.at).slice(0, 40);
}

/** [AI 에게 맡기기] — 설명서 + 공실 정보(사진 번호표) + 요청을 회원이 연결한 AI 에 보내고, 받은 설계도로 편집기를 연다 */
async function aiDesign({ request = "", vacancyId = "", ratio = "9:16", seconds = 40 } = {}, onProgress = () => {}) {
  const guide = fs.readFileSync(path.join(__dirname, "claude-guide.md"), "utf8");
  let info = "";
  if (vacancyId) {
    const a = readJson(path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""), "analysis.json"));
    if (a && a.vacancy) {
      const v = a.vacancy;
      const no = ((v.fields || []).find((x) => x.label === "공실광고번호") || {}).value || "";
      const KIND = { photo: "등록 사진", ai: "AI 생성 이미지(실제 사진 아님)", upload: "중개사가 올린 사진", proof: "공실열람 검증 화면", map: "위치 지도", roadview: "로드뷰" };
      info = [
        "[확인된 매물 정보 — 이것만 사실로 쓰십시오]",
        `공실번호: ${no}`, `제목: ${v.title || ""}`, `가격: ${v.priceText || ""}`,
        ...(v.fields || []).slice(0, 30).map((f) => `${f.label}: ${f.value}`),
        v.themes && v.themes.length ? `특징: ${v.themes.join(", ")}` : "",
        v.infra ? `주변 환경: ${v.infra}` : "",
        "",
        `[쓸 수 있는 사진 — "vacancy": "${no}" 로 두고 "file": "vacancy:번호"]`,
        ...(a.media || []).map((m, i) => `vacancy:${i + 1} = ${KIND[m.kind] || m.kind} — ${String(m.caption || "").slice(0, 80)}`),
      ].filter((x) => x !== "").join("\n");
    }
  }
  const prompt = [
    "당신은 부동산 영상 편집자입니다. 아래 설명서의 \"공실마케팅 영상 JSON\" 형식으로 영상 설계도를 만드십시오.",
    "", guide, "", info,
    "", "[요청]", request || "이 매물을 소개하는 짧은 영상",
    `화면 비율: ${ratio} · 길이: 약 ${seconds}초`,
    "", "설명 없이 JSON 하나만 답하십시오.",
  ].join("\n");
  const text = await require("../ai").ask(prompt, {
    onProgress,
    isComplete: (t) => { try { const j = jsonOf(t); return j && j.format === "gongsil-video" && Array.isArray(j.clips); } catch { return false; } },
    busyLabel: "영상 설계도를 만들고 있습니다",
    feature: "AI 영상 설계",
    wait: "1~2분",
  });
  const j = jsonOf(text);
  if (j.format !== "gongsil-video") j.format = "gongsil-video";
  if (!j.version) j.version = 1;
  if (!j.ratio) j.ratio = ratio;
  onProgress("받은 설계도로 편집기를 여는 중…");
  return importJson(j, onProgress);
}

module.exports = { inboxDir, inboxList, capcutList, importAny, importText, analyzedVacancies, aiDesign, _test: { fromCapcut, fromGongsil } };
