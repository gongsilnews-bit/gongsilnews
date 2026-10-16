// 영상 편집기 — 내 자료 라이브러리 (사장님: PC에 있는 영상·사진이 자동으로 들어와 있어야 한다)
//  - 자동: 문서\공실뉴스 스튜디오(만든 결과물) · 앱이 받은 공실 사진·AI 그림(userData\media) · 회원이 정한 폴더
//  - 직접: [PC에서 불러오기]로 고른 파일
//  - 음악(내 음악): 문서\공실뉴스 스튜디오\음악 폴더에 넣은 것 + [PC에서 음악 불러오기]로 고른 것
//  원본은 옮기지 않고 위치만 기억한다. 썸네일·편집용 사본은 앱이 만든다 (userData\video-cache).
//  다른 곳(자료 창고·무료 사이트·AI 그림)에서 받은 파일은 PC로 복사해 둔 뒤 여기 올린다 (source 표시).
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const log = require("electron-log/main");
const ff = require("./ff");
const media = require("./media");

const indexFile = () => path.join(app.getPath("userData"), "video-library.json");
const cacheDir = () => path.join(app.getPath("userData"), "video-cache");
const studioRoot = () => path.join(app.getPath("documents"), "공실뉴스 스튜디오");
const musicDir = () => path.join(studioRoot(), "음악");
const idOf = (file) => crypto.createHash("sha1").update(path.resolve(file).toLowerCase()).digest("hex").slice(0, 16);

let db = null;
function load() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(indexFile(), "utf8"));
  } catch {
    db = { items: {}, folders: [] };
  }
  db.items = db.items || {};
  db.folders = db.folders || [];
  db.hidden = db.hidden || []; // 목록에서 뺀 것 — 자동 폴더 훑기에서 다시 넣지 않는다
  return db;
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(indexFile()), { recursive: true });
    fs.writeFileSync(indexFile(), JSON.stringify(db));
  }, 300);
}

function put(file, extra = {}) {
  const kind = ff.kindOf(file);
  if (!kind || kind === "audio" && !extra.allowAudio) return null;
  const d = load();
  const id = idOf(file);
  if (d.hidden.includes(id)) {
    if (!extra.unhide) return null;
    d.hidden = d.hidden.filter((x) => x !== id); // 직접 다시 불러오면 다시 보인다
  }
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    return null;
  }
  const prev = d.items[id];
  if (prev && prev.size === st.size && prev.mtime === st.mtimeMs) {
    if (extra.source && prev.source !== extra.source && extra.source !== "local") prev.source = extra.source;
    media.allow(file);
    return prev;
  }
  const item = { id, path: file, name: path.basename(file), kind, size: st.size, mtime: st.mtimeMs, addedAt: (prev && prev.addedAt) || Date.now(), source: extra.source || (prev && prev.source) || "local", fav: Boolean(prev && prev.fav), credit: extra.credit || (prev && prev.credit) || "" };
  d.items[id] = item;
  media.allow(file);
  save();
  return item;
}

/* 폴더 안 사진·영상 찾기 (깊이 4, 3000개까지) */
function walk(dir, out, depth = 0, audio = false) {
  if (depth > 4 || out.length > 3000) return;
  let ents = [];
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    if (e.name.startsWith(".") || /^(proxy|thumbnails|autosave|waveform|audio|node_modules|studio-chrome|Cache|Code Cache|GPUCache|video-cache)$/i.test(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, depth + 1, audio);
    else if (audio ? ff.kindOf(p) === "audio" : ff.kindOf(p) === "image" || ff.kindOf(p) === "video") out.push(p);
  }
}

let scanning = null;
/** 자동 폴더 훑기 — 새 파일은 넣고, 없어진 파일은 뺀다 */
function scan() {
  if (scanning) return scanning;
  scanning = (async () => {
    const d = load();
    const roots = [
      { dir: studioRoot(), source: "studio" },
      { dir: path.join(app.getPath("userData"), "media"), source: "vacancy" },
      ...d.folders.map((f) => ({ dir: f, source: "local" })),
    ];
    const seen = new Set();
    // 내 음악 폴더 (없으면 만들어 둔다 — 여기에 넣으면 저절로 목록에)
    try {
      fs.mkdirSync(musicDir(), { recursive: true });
    } catch {}
    const songs = [];
    walk(musicDir(), songs, 0, true);
    for (const f of songs) {
      const it = put(f, { source: "music", allowAudio: true });
      if (it) seen.add(it.id);
    }
    for (const r of roots) {
      if (!fs.existsSync(r.dir)) continue;
      const files = [];
      walk(r.dir, files);
      for (const f of files) {
        if (/_edit\.(mp4|jpg)$/i.test(f)) continue; // 편집용 사본은 따로 보이지 않게
        const it = put(f, { source: r.source });
        if (it) seen.add(it.id);
      }
    }
    for (const [id, it] of Object.entries(d.items)) {
      if (!fs.existsSync(it.path)) delete d.items[id];
    }
    save();
    log.info(`[영상 라이브러리] ${Object.keys(d.items).length}개`);
  })().finally(() => (scanning = null));
  return scanning;
}

/* 썸네일·정보는 처음 볼 때 만든다 (한 번에 2개씩) */
const queue = [];
let busy = 0;
function ensureMeta(item) {
  if (item.meta && (item.kind === "audio" || (item.thumb && fs.existsSync(item.thumb)))) return Promise.resolve(item);
  if (item._p) return item._p;
  item._p = new Promise((resolve) => {
    queue.push(async () => {
      try {
        if (!item.meta) item.meta = await ff.probe(item.path);
        const t = path.join(cacheDir(), "thumbs", `${item.id}.jpg`);
        if (item.kind === "audio") item.thumb = ""; // 음악은 썸네일 없음
        else if (item.kind === "image" && Math.max(item.meta.width, item.meta.height) <= 640 && /\.(jpe?g|png)$/i.test(item.path)) item.thumb = item.path;
        else {
          await ff.thumb(item.path, t, item.kind === "video" ? Math.min(1, (item.meta.duration || 0) / 3) : 0);
          item.thumb = t;
        }
        if (item.thumb) media.allow(item.thumb);
      } catch (e) {
        item.error = String(e.message || e).slice(0, 120);
      }
      delete item._p;
      save();
      resolve(item);
    });
    pump();
  });
  return item._p;
}
function pump() {
  while (busy < 2 && queue.length) {
    const job = queue.shift();
    busy++;
    job().finally(() => {
      busy--;
      pump();
    });
  }
}

// 편집 화면에 주소를 줄 때 그 파일을 열 수 있게 등록한다 (앱을 다시 켜면 등록이 비워지므로)
const forWeb = (it) => (media.allow(it.path), it.edit && media.allow(it.edit), it.thumb && media.allow(it.thumb), {
  id: it.id,
  name: it.name,
  kind: it.kind,
  source: it.source,
  fav: it.fav,
  credit: it.credit,
  addedAt: it.addedAt,
  duration: it.meta ? it.meta.duration : 0,
  width: it.meta ? it.meta.width : 0,
  height: it.meta ? it.meta.height : 0,
  url: media.urlOf(it.edit && fs.existsSync(it.edit) ? it.edit : it.path),
  thumb: it.thumb ? media.urlOf(it.thumb) : "",
  ready: Boolean(it.meta),
});

/** 목록 — kind: all(사진·영상)|image|video|audio(내 음악), fav, q(이름), source */
async function list({ kind = "all", fav = false, q = "", source = "", limit = 300 } = {}) {
  const d = load();
  if (!d.scannedAt || Date.now() - d.scannedAt > 60 * 1000) {
    d.scannedAt = Date.now();
    await scan();
  }
  let items = Object.values(d.items).filter((it) => (kind === "all" ? it.kind !== "audio" : it.kind === kind) && (!fav || it.fav) && (!source || it.source === source) && (!q || it.name.toLowerCase().includes(q.toLowerCase())));
  // 음악은 즐겨찾기 먼저, 그다음 최근에 넣은 것
  if (kind === "audio") items.sort((a, b) => Number(b.fav) - Number(a.fav) || (b.addedAt || 0) - (a.addedAt || 0));
  else items.sort((a, b) => b.mtime - a.mtime);
  items = items.slice(0, limit);
  await Promise.all(items.slice(0, 60).map(ensureMeta));
  items.slice(60).forEach((it) => ensureMeta(it));
  return items.map(forWeb);
}

/** PC 파일들을 넣는다 (불러오기·녹화·내려받기) */
async function add(files, extra = {}) {
  const out = [];
  for (const f of files) {
    const it = put(f, { ...extra, unhide: true });
    if (it) {
      await ensureMeta(it);
      out.push(it);
    }
  }
  return out.map(forWeb);
}

function get(id) {
  return load().items[id] || null;
}

/** 편집용 사본을 만들어 둔다 (미리보기·굽기를 빠르게) — 사본 경로 또는 원본 */
async function prepare(id, onProgress) {
  const it = get(id);
  if (!it) throw new Error("자료를 찾지 못했습니다.");
  await ensureMeta(it);
  if (it.edit && fs.existsSync(it.edit)) return it.edit;
  const out = await ff.prepare(it.path, path.join(cacheDir(), "edit", it.id), { ...it.meta, kind: it.kind }, onProgress);
  if (out) {
    it.edit = out;
    media.allow(out);
    save();
  }
  return it.edit || it.path;
}

function setFav(id, fav) {
  const it = get(id);
  if (it) {
    it.fav = Boolean(fav);
    save();
  }
  return Boolean(it);
}
function remove(id) {
  const d = load();
  delete d.items[id];
  if (!d.hidden.includes(id)) d.hidden.push(id);
  save();
}
function addFolder(dir) {
  const d = load();
  if (!d.folders.includes(dir)) d.folders.push(dir);
  d.scannedAt = 0;
  save();
  return d.folders;
}
const folders = () => load().folders;
function removeFolder(dir) {
  const d = load();
  d.folders = d.folders.filter((f) => f !== dir);
  save();
  return d.folders;
}

module.exports = { list, add, get, prepare, setFav, remove, scan, addFolder, removeFolder, folders, ensureMeta, forWeb, cacheDir, studioRoot, musicDir };
