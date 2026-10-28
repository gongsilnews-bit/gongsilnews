// 영상 편집기 — 프로젝트 (PC에 저장, 자동 저장·복구)
//  저장: <이름>.gss 파일 하나 (gss.js) — [저장 폴더]의 프로젝트 폴더(기본 문서\공실스튜디오\05 동영상제작\프로젝트)에. 공실과 연결된 영상은 그 매물 폴더\영상\
//    p.file = .gss 위치, p.dir = 보이지 않는 작업 폴더 (편집 중 파일들). 예전 폴더 방식(p.file 없음)도 그대로 열린다 → [.gss 파일로 바꾸기]
//  예전 폴더 방식 자리: 문서\공실스튜디오\영상\<이름_날짜>\
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
const gss = require("./gss");

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
  subtitle: { on: true, position: "bottom", posAuto: true, length: "long", maxLines: 2, size: 100, font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bg: false, bold: true },
  voice: { id: "Charon", speed: 1, volume: 1 },
  music: { on: false, mood: "calm", file: "", name: "", volume: 0.03 },
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
  const key = p.file || p.dir; // .gss 프로젝트는 파일 위치, 예전 폴더 방식은 폴더
  const list = readRecent().filter((r) => r.dir.toLowerCase() !== key.toLowerCase() && r.dir.toLowerCase() !== String(p.dir || "").toLowerCase());
  list.unshift({ dir: key, name: p.name, ratio: p.ratio, method: p.method, updatedAt: p.updatedAt, thumb: p.thumb || "", duration: p.duration || 0, draft: p.draft ? Number(p.draft.step) || 1 : 0 }); // draft = 대본 쓰고 편집 작성 중 단계 (2026-10-23)
  fs.mkdirSync(path.dirname(recentFile()), { recursive: true });
  fs.writeFileSync(recentFile(), JSON.stringify(list.slice(0, 100), null, 1));
}

/** 새 프로젝트 — { method: text|video|longform|record, ratio, name?, vacancyId? } */
function create({ method = "video", ratio = "16:9", name = "", vacancyId = "", folder = "" } = {}) {
  if (!RATIOS[ratio]) ratio = "16:9";
  // 이름을 안 정하면 "무제" (포토샵·프리미어처럼, 2026-10-19 사장님) — 같은 이름이 있으면 무제_2
  const nm = safeName(name) || "무제";
  const fo = require("./folders");
  let base = fo.byDate(fo.projectDir()); // 처음 화면 [저장 폴더]에서 고른 곳 (기본: 문서\공실스튜디오\05 동영상제작\프로젝트\오늘날짜)
  // 만들 때 [위치]에서 직접 고른 폴더가 있으면 그곳에
  if (folder) {
    try {
      fs.mkdirSync(folder, { recursive: true });
      base = folder;
      vacancyId = vacancyId || "";
    } catch {}
  } // 공실로 만든 영상도 05 동영상제작\프로젝트\오늘날짜 (2026-10-23 사장님 — 뉴스SNS발행 폴더에 섞지 않음)
  // <이름>.gss 파일 하나 — 같은 이름이 있으면 _2
  let file = path.join(base, `${nm}${gss.EXT}`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(base, `${nm}_${n}${gss.EXT}`);
  const dir = gss.workFor(file);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const p = { v: 1, id: uid(), name: path.basename(file, gss.EXT), method, ratio, vacancyId: vacancyId || "", createdAt: now, updatedAt: now, savedAt: "", settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), assets: {}, scenes: [{ id: uid(), clips: [] }], dir, file };
  // 자막 위치 자동 — 세로(9:16·4:5)는 쇼츠·릴스 아래쪽 글·단추에 안 가리게 중하단 (편집 화면 types.autoSubPosition 과 같다)
  if (p.settings.subtitle.posAuto) p.settings.subtitle.position = ratio === "9:16" || ratio === "4:5" ? "middle-low" : "bottom";
  writeProject(p);
  gss.setSource(dir, file);
  gss.pack(dir, file);
  media.allowRoot(dir);
  remember(p);
  log.info(`[영상] 새 프로젝트 ${file}`);
  return p;
}

function writeProject(p) {
  const file = path.join(p.dir, "project.json");
  const { dir, file: _file, ...data } = p; // 위치는 열 때마다 다시 붙인다
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
/** [저장] — 지금 내용을 .gss 파일로 묶는다 (자동 저장은 작업 폴더에만 하는 복구용). 돌려줌: 저장한 시각 */
function flush(p) {
  if (!p || !p.file) {
    if (p && p.scenes) save(p);
    return { savedAt: "" };
  }
  p.savedAt = new Date().toISOString();
  save(p);
  gss.pack(p.dir, p.file);
  return { savedAt: p.savedAt };
}
/** 자동 저장본 — .gss 옆 "자동 저장\<이름>\<이름>_날짜_시각.gss" (원래 .gss 는 그대로). 최근 20개 */
const backupDir = (file) => path.join(path.dirname(file), "자동 저장", path.basename(file, gss.EXT));
function backup(p) {
  if (!p || !p.file) return "";
  const d = new Date();
  const two = (n) => String(n).padStart(2, "0");
  const dir = backupDir(p.file);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${path.basename(p.file, gss.EXT)}_${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}_${two(d.getHours())}-${two(d.getMinutes())}${gss.EXT}`);
  gss.pack(p.dir, out);
  const list = backups(p);
  for (const x of list.slice(20)) fs.rmSync(x.file, { force: true });
  log.info(`[영상] 자동 저장본 ${out}`);
  return out;
}
function backups(p) {
  if (!p || !p.file) return [];
  const dir = backupDir(p.file);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => gss.isGss(f))
    .map((f) => {
      const st = fs.statSync(path.join(dir, f));
      return { file: path.join(dir, f), at: st.mtime.toISOString(), size: st.size };
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
/** 앱이 직접 (F5·창 이동 때) — 작업 폴더를 .gss 로 저장 / 버리기 */
function saveWork(dir, file) {
  if (!dir || !file || !fs.existsSync(path.join(dir, "project.json"))) return false;
  const pj = path.join(dir, "project.json");
  const data = JSON.parse(fs.readFileSync(pj, "utf8"));
  data.savedAt = new Date().toISOString();
  fs.writeFileSync(pj, JSON.stringify(data, null, 1));
  gss.pack(dir, file);
  return true;
}
function discardWork(dir, file) {
  if (!dir || !file) return false;
  let savedAt;
  try {
    savedAt = JSON.parse(fs.readFileSync(path.join(dir, "project.json"), "utf8")).savedAt;
  } catch {}
  return discard({ dir, file, savedAt });
}

/**
 * [저장 안 함] — 저장하지 않은 고친 내용(작업 폴더)을 버린다. 한 번도 저장 안 한 새 프로젝트면 .gss 파일도 지운다
 * (빈 프로젝트가 쌓이지 않게)
 */
function discard(p) {
  if (!p || !p.file) return false;
  const never = p.savedAt === ""; // 새로 만들고 한 번도 저장 안 함 (예전에 만든 .gss 는 이 표시가 없어서 지우지 않는다)
  fs.rmSync(p.dir, { recursive: true, force: true });
  if (never && fs.existsSync(p.file)) {
    fs.rmSync(p.file, { force: true });
    fs.writeFileSync(recentFile(), JSON.stringify(readRecent().filter((r) => gss.norm(r.dir) !== gss.norm(p.file)), null, 1));
    log.info(`[영상] 저장 안 한 새 프로젝트를 지움 ${p.file}`);
  } else log.info(`[영상] 저장 안 함 — 마지막 저장 상태로 ${p.file}`);
  return true;
}

/**
 * 다른 이름으로 저장 — 프로젝트 폴더를 통째로 새 이름 폴더로 복사 (자동 저장 기록은 빼고)
 * 폴더 안 파일(목소리 등)을 가리키는 위치는 새 폴더로 고친다. 내 자료처럼 폴더 밖 파일은 그대로 같이 쓴다.
 * 원본은 마지막으로 저장된 그대로 두고, 지금 편집 중인 내용은 사본에 담는다
 */
function saveAs(p, name, parent) {
  if (!p || !p.dir || !fs.existsSync(p.dir)) throw new Error("프로젝트 정보가 없습니다.");
  const nm = safeName(name);
  if (!nm) throw new Error("새 이름을 써 주세요.");
  if (p.file) {
    // .gss — 지금 편집 중인 내용을 새 .gss 로 묶고 그걸 연다 (원본 .gss 는 마지막으로 저장된 그대로)
    const base = parent ? path.resolve(parent) : path.dirname(p.file);
    if (!fs.existsSync(base)) throw new Error("저장할 폴더를 찾지 못했습니다.");
    let file = path.join(base, `${nm}${gss.EXT}`);
    for (let n = 2; fs.existsSync(file); n++) file = path.join(base, `${nm}_${n}${gss.EXT}`);
    writeProject(p);
    const now = new Date().toISOString();
    gss.pack(p.dir, file, { patch: (d) => ({ ...d, id: uid(), name: path.basename(file, gss.EXT), createdAt: now, updatedAt: now }) });
    log.info(`[영상] 다른 이름으로 저장 ${p.file} → ${file}`);
    return open(file);
  }
  const base = parent ? path.resolve(parent) : path.dirname(p.dir);
  if (!fs.existsSync(base)) throw new Error("저장할 폴더를 찾지 못했습니다.");
  if ((base + path.sep).toLowerCase().startsWith(p.dir.toLowerCase() + path.sep)) throw new Error("지금 프로젝트 폴더 안에는 저장할 수 없어요. 다른 폴더를 골라 주세요.");
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

/**
 * 이름 바꾸기 (처음 화면 최근 프로젝트) — project.json 의 이름만 바꾼다. 폴더 이름은 그대로
 * (폴더를 옮기면 안의 영상·목소리 파일 위치가 다 바뀌어서). 내보낸 영상 파일 이름은 이 이름을 쓴다
 */
function rename(dir, name) {
  const nm = String(name || "").replace(/[\\/:*?"<>|\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!nm) throw new Error("새 이름을 써 주세요.");
  if (gss.isGss(dir)) {
    // .gss — 파일 이름을 바꾼다 (작업 폴더도 같이 옮겨 저장 안 된 내용을 지킨다)
    if (!fs.existsSync(dir)) throw new Error("프로젝트 파일을 찾지 못했습니다.");
    const to = path.join(path.dirname(dir), `${nm}${gss.EXT}`);
    if (gss.norm(to) === gss.norm(dir)) return nm;
    if (fs.existsSync(to)) throw new Error("같은 이름의 프로젝트가 이미 있어요. 다른 이름을 써 주세요.");
    gss.flush(dir);
    fs.renameSync(dir, to);
    const wOld = gss.workFor(dir), wNew = gss.workFor(to);
    if (fs.existsSync(wOld)) {
      fs.rmSync(wNew, { recursive: true, force: true });
      fs.renameSync(wOld, wNew);
      gss.setSource(wNew, to);
    }
    const list = readRecent().map((r) => (gss.norm(r.dir) === gss.norm(dir) ? { ...r, dir: to, name: nm } : r));
    fs.writeFileSync(recentFile(), JSON.stringify(list, null, 1));
    log.info(`[영상] 이름 바꾸기 ${dir} → ${to}`);
    return nm;
  }
  const file = path.join(dir, "project.json");
  if (!fs.existsSync(file)) throw new Error("프로젝트 파일을 찾지 못했습니다.");
  const p = JSON.parse(fs.readFileSync(file, "utf8"));
  p.name = nm;
  p.dir = dir;
  writeProject(p);
  remember(p);
  log.info(`[영상] 이름 바꾸기 ${dir} → ${nm}`);
  return nm;
}

/* ── 휴지통 (처음 화면) — 프로젝트 폴더를 통째로 문서\공실스튜디오\05 동영상제작\휴지통 으로 옮겨 둔다 (바로 지우지 않음).
   되살리면 원래 자리로 그대로 옮겨서 안의 파일 위치가 다시 맞는다. 녹화 원본처럼 폴더 밖 파일은 건드리지 않는다 ── */
const trashDir = () => require("../studio-root").dir("vid", "휴지통");
const trashFile = () => path.join(trashDir(), "휴지통.json");
function readTrash() {
  try {
    return JSON.parse(fs.readFileSync(trashFile(), "utf8")).filter((x) => x && x.at && fs.existsSync(x.at));
  } catch {
    return [];
  }
}
function writeTrash(list) {
  fs.mkdirSync(trashDir(), { recursive: true });
  fs.writeFileSync(trashFile(), JSON.stringify(list, null, 1));
}
function trashList() {
  return readTrash().map((x) => {
    if (x.thumb) media.allow(media.fileOf(x.thumb));
    return x;
  });
}
function trash(dir) {
  const isFile = gss.isGss(dir);
  if (isFile) gss.flush(dir);
  const file = isFile ? dir : path.join(dir, "project.json");
  if (!fs.existsSync(file)) throw new Error("프로젝트 파일을 찾지 못했습니다.");
  const r0 = readRecent().find((r) => gss.norm(r.dir) === gss.norm(dir)) || {};
  const p = isFile ? { name: path.basename(dir, gss.EXT), thumb: r0.thumb, ratio: r0.ratio, duration: r0.duration } : JSON.parse(fs.readFileSync(file, "utf8"));
  fs.mkdirSync(trashDir(), { recursive: true });
  const at = path.join(trashDir(), `${safeName(isFile ? path.basename(dir, gss.EXT) : path.basename(dir)) || "프로젝트"}_${Date.now()}${isFile ? gss.EXT : ""}`);
  try {
    fs.renameSync(dir, at);
  } catch (e) {
    throw new Error(`휴지통으로 옮기지 못했어요. 이 프로젝트를 연 프로그램(탐색기·영상 플레이어)을 닫고 다시 해 주세요. (${e.code || e.message})`);
  }
  const list = readTrash();
  const id = uid();
  list.unshift({ id, name: p.name || path.basename(dir), from: dir, at, deletedAt: new Date().toISOString(), thumb: p.thumb || "", ratio: p.ratio, duration: p.duration || 0 });
  writeTrash(list);
  // 최근 목록에서 뺀다
  fs.writeFileSync(recentFile(), JSON.stringify(readRecent().filter((r) => r.dir.toLowerCase() !== dir.toLowerCase()), null, 1));
  log.info(`[영상] 휴지통으로 ${dir} → ${at}`);
  return id; // 되돌리기용
}
function restore(id) {
  const list = readTrash();
  const x = list.find((y) => y.id === id);
  if (!x) throw new Error("휴지통에서 찾지 못했어요.");
  const isFile = gss.isGss(x.from);
  let to = x.from;
  for (let n = 2; fs.existsSync(to); n++) to = isFile ? x.from.replace(/\.gss$/i, `_${n}${gss.EXT}`) : `${x.from}_${n}`; // 그 자리에 같은 이름이 생겼으면 _2
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(x.at, to);
  writeTrash(list.filter((y) => y.id !== id));
  if (isFile) {
    const list2 = readRecent().filter((r) => gss.norm(r.dir) !== gss.norm(to));
    list2.unshift({ dir: to, name: path.basename(to, gss.EXT), ratio: x.ratio, method: "", updatedAt: new Date().toISOString(), thumb: x.thumb || "", duration: x.duration || 0 });
    fs.writeFileSync(recentFile(), JSON.stringify(list2.slice(0, 100), null, 1));
  } else {
    const p = JSON.parse(fs.readFileSync(path.join(to, "project.json"), "utf8"));
    p.dir = to;
    remember(p);
  }
  log.info(`[영상] 휴지통에서 되살림 ${x.at} → ${to}`);
  return to;
}
/** 영구 삭제 — id 하나 또는 "all"(휴지통 비우기) */
function purge(id) {
  const list = readTrash();
  const gone = id === "all" ? list : list.filter((y) => y.id === id);
  for (const x of gone) fs.rmSync(x.at, { recursive: true, force: true });
  writeTrash(id === "all" ? [] : list.filter((y) => y.id !== id));
  log.info(`[영상] 휴지통 영구 삭제 ${gone.length}개`);
  return gone.length;
}

/**
 * 예전 폴더 방식 → .gss 파일로 바꾸기. 같은 자리에 <이름>.gss 를 만들고, 완성 영상(output)은 옆 폴더로 꺼내 두고,
 * 원래 폴더는 휴지통으로 (되살릴 수 있게). 바꾼 .gss 를 열어 돌려준다
 */
function convert(p) {
  if (!p || !p.dir || p.file) throw new Error("이미 .gss 파일 프로젝트예요.");
  writeProject(p);
  const parent = path.dirname(p.dir);
  const nm = safeName(p.name) || path.basename(p.dir);
  let file = path.join(parent, `${nm}${gss.EXT}`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(parent, `${nm}_${n}${gss.EXT}`);
  gss.pack(p.dir, file);
  const out = path.join(p.dir, "output");
  if (fs.existsSync(out) && fs.readdirSync(out).length) {
    let keep = path.join(parent, `${path.basename(file, gss.EXT)}_내보낸 영상`);
    for (let n = 2; fs.existsSync(keep); n++) keep = `${keep}_${n}`;
    fs.renameSync(out, keep);
  }
  try {
    trash(p.dir);
  } catch (e) {
    log.warn(`[영상] 예전 폴더를 휴지통으로 못 옮김 (그대로 둠): ${e.message}`);
  }
  log.info(`[영상] .gss 로 바꿈 ${p.dir} → ${file}`);
  return open(file);
}

/* ── 프로젝트 패키지 (프리미어 "파일 수집") — 원본 영상·사진·음악을 한 폴더에 모아 그 폴더만 옮기면 어디서든 열리게 ── */
function externals(p) {
  const out = new Map(); // 원래 위치(소문자) → { path, size }
  const add = (f) => {
    if (!f || require("./remote").isRemote(f) || gss.under(f, p.dir) || !fs.existsSync(f)) return;
    if (!out.has(gss.norm(f))) out.set(gss.norm(f), { path: f, size: fs.statSync(f).size });
  };
  for (const a of Object.values(p.assets || {})) add(a.path);
  for (const l of p.layers || []) add(l.file);
  if (p.settings && p.settings.music) add(p.settings.music.file);
  return [...out.values()];
}
function packageInfo(p) {
  const list = externals(p);
  const missing = Object.values(p.assets || {}).filter((a) => !require("./remote").isRemote(a.path) && !fs.existsSync(a.path)).map((a) => a.name);
  return { count: list.length, bytes: list.reduce((a, x) => a + x.size, 0), missing };
}
async function makePackage(p, parent, onProgress = () => {}) {
  if (!p || !p.dir) throw new Error("프로젝트 정보가 없습니다.");
  writeProject(p);
  const nm = safeName(p.name) || "프로젝트";
  let dest = path.join(parent, `${nm}_패키지`);
  for (let n = 2; fs.existsSync(dest); n++) dest = path.join(parent, `${nm}_패키지_${n}`);
  const md = path.join(dest, "미디어");
  fs.mkdirSync(md, { recursive: true });
  const list = externals(p);
  const total = list.reduce((a, x) => a + x.size, 0) || 1;
  const map = new Map(); // 원래 위치 → 미디어/이름
  const used = new Set();
  let done = 0;
  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    let base = path.basename(x.path);
    const ext = path.extname(base);
    for (let n = 2; used.has(base.toLowerCase()); n++) base = `${path.basename(x.path, ext)}_${n}${ext}`;
    used.add(base.toLowerCase());
    onProgress(`원본을 모으는 중… (${i + 1}/${list.length}) ${base}`, done / total);
    await fs.promises.copyFile(x.path, path.join(md, base));
    done += x.size;
    map.set(gss.norm(x.path), `미디어/${base}`);
  }
  onProgress("프로젝트 파일을 만드는 중…", 0.99);
  const file = path.join(dest, `${nm}${gss.EXT}`);
  // 편집용 사본(edit)은 이 PC 캐시라 빼고, 원본은 옆 "미디어" 폴더를 보게
  gss.pack(p.dir, file, { extra: map, patch: (d) => { for (const a of Object.values(d.assets || {})) a.edit = ""; return d; } });
  log.info(`[영상] 프로젝트 패키지 ${dest} (원본 ${list.length}개)`);
  return { dir: dest, file, count: list.length, bytes: total };
}

/** 없어진 원본 다시 연결 — 고른 파일로 그 자료(asset) 위치를 바꾼다 */
function relink(p, assetId, newFile) {
  const a = p && p.assets && p.assets[assetId];
  if (!a) throw new Error("자료를 찾지 못했습니다.");
  if (!newFile || !fs.existsSync(newFile)) throw new Error("고른 파일을 찾지 못했어요.");
  media.allow(newFile);
  return { path: newFile, edit: "", missing: false, url: media.urlOf(newFile) };
}

/** 열기 — 없어진 원본 파일 표시 (missing) */
function open(target, choice = "") {
  let dir = target;
  let file = "";
  if (gss.isGss(target)) {
    if (!fs.existsSync(target)) throw new Error("프로젝트 파일을 찾지 못했어요. 옮겼거나 지웠는지 확인해 주세요.");
    // 저장 안 한 고친 내용이 남아 있으면 — 편집 화면이 [이어서 열기 / 마지막 저장 상태로] 를 묻는다
    if (!choice && gss.hasUnsaved(target)) return { recover: true, file: target, name: path.basename(target, gss.EXT) };
    file = target;
    dir = gss.unpack(target, choice === "work");
  } else if (gss.sourceOf(target)) file = gss.sourceOf(target); // 편집 화면이 작업 폴더로 다시 열 때
  const pj = path.join(dir, "project.json");
  if (!fs.existsSync(pj)) throw new Error("프로젝트 파일을 찾지 못했습니다.");
  const p = JSON.parse(fs.readFileSync(pj, "utf8"));
  p.dir = dir;
  if (file) {
    p.file = file;
    p.name = path.basename(file, gss.EXT); // .gss 는 파일 이름이 곧 프로젝트 이름
  }
  media.allowRoot(dir);
  const here = file ? path.dirname(file) : "";
  for (const a of Object.values(p.assets || {})) {
    // 공실뉴스 자료(드론 영상) — PC 파일이 없다. 쓸 때마다 서버에서 불러온다
    if (require("./remote").isRemote(a.path)) {
      a.missing = false;
      a.edit = "";
      continue;
    }
    // 원본이 없으면 .gss 옆 "미디어" 폴더·.gss 옆에서 같은 이름을 찾는다 (프로젝트 패키지·다른 PC)
    if (!fs.existsSync(a.path) && here) {
      const nm = path.basename(String(a.path || ""));
      const found = [path.join(here, "미디어", nm), path.join(here, nm)].find((x) => nm && fs.existsSync(x));
      if (found) {
        a.path = found;
        a.edit = "";
      }
    }
    a.missing = !fs.existsSync(a.path);
    if (!a.missing) media.allow(a.path);
    if (a.edit && fs.existsSync(a.edit)) media.allow(a.edit);
    else a.edit = a.edit && fs.existsSync(a.edit) ? a.edit : "";
    if (a.thumb) media.allow(media.fileOf(a.thumb));
  }
  for (const l of p.layers || []) {
    if (l.file && !fs.existsSync(l.file) && here) {
      const nm = path.basename(l.file);
      const found = [path.join(here, "미디어", nm), path.join(here, nm)].find((x) => fs.existsSync(x));
      if (found) l.file = found;
    }
    if (l.file && fs.existsSync(l.file)) {
      media.allow(l.file);
      l.url = media.urlOf(l.file);
    }
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
    .filter((r) => (gss.isGss(r.dir) ? fs.existsSync(r.dir) : fs.existsSync(path.join(r.dir, "project.json"))))
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
  if (it.remote) a.remote = true;
  media.allow(a.path);
  if (a.edit) media.allow(a.edit);
  if (it.thumb) media.allow(it.thumb);
  a.url = media.urlOf(a.edit || a.path);
  return a;
}

/* ── AI 목소리 ── 같은 문장·목소리는 한 번만 받는다 (프로젝트 voice\) */
/** opts.fresh — [목소리 다시 만들기]: 저장해 둔 것을 쓰지 않고 새로 만든다 (새 파일 이름이라 미리보기도 바로 바뀜, 기본 파일도 새것으로) */
/**
 * 받은 성우 소리의 앞뒤 무음 정리 (타입캐스트·일레븐랩스) — 일레븐랩스는 끝에 0.3~1초 무음이 붙어 와서 문장 사이가 길게 끊겼다 (2026-10-20 실측).
 *  말소리 앞뒤 0.08초만 남기고 (내 목소리·제미나이와 같게), 끝 0.03초는 부드럽게 줄여 "틱" 소리가 없게
 */
async function tidyEdges(file) {
  try {
    const info = await ff.probe(file);
    const dur = info.duration || 0;
    const parts = await ff.speech(file, dur, { noise: -40, min: 0.3 });
    if (!parts.length || dur <= 0) return;
    const s = Math.max(0, parts[0].s - 0.08);
    const e = Math.min(dur, parts[parts.length - 1].e + 0.08);
    if (s < 0.02 && dur - e < 0.02) return;
    const tmp = file.replace(/\.wav$/i, "_tidy.wav");
    const len = e - s;
    await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", file, "-ss", s.toFixed(3), "-to", e.toFixed(3), "-af", `afade=t=out:st=${Math.max(0, len - 0.03).toFixed(3)}:d=0.03`, tmp]);
    fs.renameSync(tmp, file);
  } catch {}
}

async function voiceFor(p, text, voiceId, opts = {}) {
  let t = String(text || "").replace(/\s+/g, " ").trim();
  // 감정 태그([신나게] 등)는 일레븐랩스만 — 다른 성우는 태그를 빼고 읽는다 (2026-10-20)
  if (!/^el_/.test(String(voiceId))) t = t.replace(/\[[^\]]{1,20}\]\s*/g, "").trim();
  if (!t) throw new Error("읽을 문장이 없습니다.");
  // 성우가 읽을 글 — 숫자·단위를 한글로 (8745 → 팔천칠백사십오 · 136㎡ → 백삼십육 제곱미터). 자막(text·words)은 원래 글 그대로 (2026-10-22 사장님)
  const say = require("./speak-ko").toSpoken(t);
  const my = voiceId === "me" ? require("./myvoice") : null; // 내 목소리 — PC 에서 만든다 (목소리를 다시 등록하면 새로)
  const tc = /^tc_/.test(String(voiceId)) ? require("./typecast") : null; // 타입캐스트 성우 — 회원 자기 키로 이 앱이 바로 (2026-10-19)
  const el = /^el_/.test(String(voiceId)) ? require("./elevenlabs") : null; // 일레븐랩스 성우 — 회원 자기 키
  const emo = tc ? String(opts.emotion || "smart") : el ? String(opts.emotion || "normal") : "";
  const h = crypto.createHash("sha1").update(`${voiceId}\n${my ? my.stamp() + "\n" : ""}${emo ? emo + "\n" : ""}${say}`).digest("hex").slice(0, 16);
  const base = path.join(p.dir, "voice", `${voiceId}_${h}.wav`);
  const file = opts.fresh ? base.replace(/\.wav$/, `_${Date.now().toString(36)}.wav`) : base;
  if (my && !fs.existsSync(file)) await my.say(say, file);
  else if (tc && !fs.existsSync(file)) { await tc.say(say, file, { voiceId, emotion: emo, prev: opts.prev, next: opts.next }); await tidyEdges(file); }
  else if (el && !fs.existsSync(file)) { await el.say(say, file, { voiceId, emotion: emo, prev: opts.prev, next: opts.next }); await tidyEdges(file); }
  // 제미나이 성우 — 회원 Gemini API 키로 이 PC 에서 (공실뉴스 서버 Gemini 는 쓰지 않음, 2026-10-19 사장님)
  else if (!fs.existsSync(file)) await require("./geminitts").say(say, file, { voiceId });
  if (opts.fresh) fs.copyFileSync(file, base); // 다음에 같은 문장을 부르면 새로 만든 것이 나오게
  media.allow(file);
  const info = await ff.probe(file);
  return { file, url: media.urlOf(file), duration: info.duration, id: voiceId, text: t, words: spreadWords(t, info.duration) };
}

/**
 * 한 클립 안에서 단어마다 목소리가 다를 때 — 조각별로 만든 목소리 파일을 한 파일로 잇는다 (PC에서, ffmpeg).
 * 같은 조각 묶음이면 저장해 둔 파일을 다시 쓴다
 */
async function voiceJoin(p, files) {
  const list = (files || []).filter((f) => f && fs.existsSync(f));
  if (!list.length) throw new Error("이을 목소리가 없습니다.");
  const h = crypto.createHash("sha1").update(list.join("\n")).digest("hex").slice(0, 16);
  const file = path.join(p.dir, "voice", `join_${h}.wav`);
  if (!fs.existsSync(file)) {
    const args = ["-y", "-hide_banner", "-loglevel", "error"];
    for (const f of list) args.push("-i", f);
    const norm = list.map((_, i) => `[${i}:a]aresample=24000,aformat=sample_fmts=s16:channel_layouts=mono[a${i}]`).join(";");
    args.push("-filter_complex", `${norm};${list.map((_, i) => `[a${i}]`).join("")}concat=n=${list.length}:v=0:a=1[out]`, "-map", "[out]", file);
    await ff.run(ff.ff(), args);
  }
  media.allow(file);
  const info = await ff.probe(file);
  return { file, url: media.urlOf(file), duration: info.duration };
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
/**
 * 소리 토막 받아쓰기 → { success, segments:[{start,end,text}] } (토막 기준 초)
 *  PC 의 Whisper 로 (무료, 시각 정확, 글만 서버에서 교정). Whisper 가 없는 옛 설치면 예전처럼 서버(Gemini)로 소리를 보낸다
 */
async function listen(file, start, len, tmp) {
  const wh = require("./whisper");
  // 공실뉴스 서버 Gemini 받아쓰기는 쓰지 않는다 (2026-10-19 사장님) — PC 받아쓰기(Whisper)만
  if (!wh.ready()) return { success: false, error: "PC 받아쓰기 프로그램이 없어요. 스튜디오를 새 버전으로 다시 설치해 주세요." };
  return { success: true, segments: await wh.segments(file, { start, len }) };
}

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
    const r = await listen(a.path, start, Math.min(CH + 1, dur - start), path.join(p.dir, "audio", `${assetId}_${i}.mp3`));
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

/**
 * 자동 자막 — 지금 있는 클립은 그대로 두고 글만 채운다 (편집 화면 [자동 자막 만들기]).
 * targets: [{ id, asset, s, e }] 클립의 원본 구간. 같은 영상에서 가까운 클립끼리 90초 안으로 묶어 소리만 서버로 보내고
 * (지운 클립·긴 침묵은 안 보내니 그만큼 비용이 준다), 받아온 단어를 그 시각이 들어간 클립에 나눠 준다.
 * 돌려줌: [{ id, text, words, sents: [{ text, s, e, words }] }] — sents 는 그 클립 안의 문장 (편집 화면이 문장마다 클립을 나눈다)
 */
/* ── AI 보이스로 만든 소리의 문장 시각 (2026-10-20 사장님) ──
 *  AI 보이스 녹음·목소리만 저장은 문장을 하나씩 만들어 잇기 때문에 문장 경계를 정확히 안다 → 소리 파일 내용(sha1)을 열쇠로 이 PC 에 적어 두고,
 *  [오디오로 편집하기]에서 받아쓰기 대신 그대로 쓴다 (웃음·숨소리로 시작하는 문장도 단어가 앞서 나오지 않게). 파일 이름을 바꾸거나 옮겨도 같은 내용이면 찾는다 */
const metaDir = () => path.join(app.getPath("userData"), "voice-meta");
const fileKey = (file) => crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
function saveVoiceMeta(file, meta) {
  try {
    fs.mkdirSync(metaDir(), { recursive: true });
    fs.writeFileSync(path.join(metaDir(), fileKey(file) + ".json"), JSON.stringify({ v: 1, ...meta }));
  } catch {}
}
function loadVoiceMeta(file) {
  try {
    const f = path.join(metaDir(), fileKey(file) + ".json");
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
  } catch {
    return null;
  }
}
/** 문장 앞 웃음·한숨처럼 소리만 있는 부분의 길이 (초) — 앞 1.6초 안에서 "쉭쉭" 숨소리(빠르게 떨리는 소리)가 끝나는 곳. 없으면 0 */
async function leadNonverbal(file) {
  const raw = path.join(require("os").tmpdir(), `gsv-lead-${crypto.randomBytes(4).toString("hex")}.raw`);
  try {
    await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", file, "-t", "1.8", "-ac", "1", "-ar", "16000", "-f", "s16le", raw]);
    const b = fs.readFileSync(raw);
    const W = 800; // 0.05초
    const fr = [];
    for (let k = 0; (k + 1) * W * 2 <= b.length && k * 0.05 < 1.6; k++) {
      let sum = 0, zc = 0, prev = 0;
      for (let i = 0; i < W; i++) {
        const v = b.readInt16LE((k * W + i) * 2);
        sum += v * v;
        if (i && (v >= 0) !== (prev >= 0)) zc++;
        prev = v;
      }
      fr.push({ db: 20 * Math.log10(Math.max(1, Math.sqrt(sum / W))), zc });
    }
    // 처음 나오는 "쉭쉭" 덩어리(0.15초 이상 — 자음 하나는 0.1초 안쪽이라 걸리지 않는다)가 끝난 뒤, 목소리가 다시 크게 나오는 곳
    let end = 0;
    for (let k = 0; k < fr.length; k++) {
      let n = 0;
      while (k + n < fr.length && fr[k + n].zc > 120 && fr[k + n].db > 45) n++;
      if (n >= 3) {
        let j = k + n;
        while (j < fr.length && !(fr[j].zc < 90 && fr[j].db > 55)) j++;
        end = j * 0.05;
        break;
      }
      k += n;
    }
    return end;
  } catch {
    return 0;
  } finally {
    try { fs.unlinkSync(raw); } catch {}
  }
}

async function transcribeClips(p, targets, onProgress = () => {}) {
  // AI 보이스로 만든 소리면 적어 둔 문장 시각 그대로 (받아쓰기 없이, 정확하게)
  const known = [];
  const rest = [];
  for (const t of targets || []) {
    const a = p.assets[t.asset];
    const m = a && a.kind === "audio" && a.path && fs.existsSync(a.path) ? loadVoiceMeta(a.path) : null;
    if (m && Array.isArray(m.sents) && m.sents.length) {
      const sents = m.sents.filter((x) => x.e > t.s && x.s < t.e).map((x) => ({ text: x.text, s: Math.max(t.s, x.s), e: Math.min(t.e, x.e), words: x.words.filter((w) => w.e > t.s && w.s < t.e) }));
      if (sents.length) { known.push({ id: t.id, text: sents.map((x) => x.text).join(" "), words: sents.flatMap((x) => x.words), sents }); continue; }
    }
    rest.push(t);
  }
  if (!rest.length) return known;
  return [...known, ...(await transcribeWhisper(p, rest, onProgress))];
}

async function transcribeWhisper(p, targets, onProgress = () => {}) {
  const CH = 90;
  const list = (targets || []).filter((t) => p.assets[t.asset] && t.e > t.s).sort((a, b) => (a.asset === b.asset ? a.s - b.s : a.asset < b.asset ? -1 : 1));
  const wins = [];
  for (const t of list) {
    const w = wins[wins.length - 1];
    if (w && w.asset === t.asset && t.s - w.e <= 5 && Math.max(w.e, t.e) - w.s <= CH) w.e = Math.max(w.e, t.e);
    else wins.push({ asset: t.asset, s: t.s, e: t.e });
  }
  const pieces = [];
  for (const w of wins) for (let s = w.s; s < w.e - 0.05; s += CH) pieces.push({ asset: w.asset, s, e: Math.min(w.e, s + CH) });
  fs.mkdirSync(path.join(p.dir, "audio"), { recursive: true });
  // 실제 말소리 구간 (PC에서, 무료) — AI 가 준 문장 시각은 대략이라 여기에 맞추고, 단어는 말하는 시간 안에서만 나눈다
  const speechOf = {};
  for (const id of new Set(pieces.map((x) => x.asset))) {
    onProgress("말소리 구간을 찾는 중… (PC에서)", 0);
    speechOf[id] = await ff.speech(p.assets[id].path, p.assets[id].duration, { min: 0.2 }).catch(() => []);
  }
  const snap = (sp, t, edge) => {
    let best = t;
    let bd = 0.7;
    for (const r of sp) {
      const v = edge === "s" ? r.s : r.e;
      if (Math.abs(v - t) < bd) (bd = Math.abs(v - t)), (best = v);
    }
    return best;
  };
  const words = {}; // 영상별 [{ w, s, e, g }] (원본 시각, g = 문장 번호)
  let g = 0;
  for (let i = 0; i < pieces.length; i++) {
    const pc = pieces[i];
    onProgress(`말소리를 글로 바꾸는 중… (${i + 1}/${pieces.length})`, i / pieces.length);
    const r = await listen(p.assets[pc.asset].path, pc.s, pc.e - pc.s + 0.3, path.join(p.dir, "audio", `${pc.asset}_c${Math.round(pc.s * 1000)}.mp3`));
    if (!r || !r.success) throw new Error(`받아쓰기에 실패했습니다: ${(r && r.error) || ""}`);
    const arr = (words[pc.asset] = words[pc.asset] || []);
    const sp = speechOf[pc.asset] || [];
    // AI 가 준 문장 시각은 1~2초씩 틀릴 때가 있다 — 문장 사이 경계는 "두 문장 사이에서 가장 길게 쉰 곳"으로 정하고,
    // 문장 = 그 경계 사이의 실제 말소리 전부 (AI 시각 근처만 보면 말 일부가 옆 문장으로 빠진다)
    const segs = (r.segments || []).map((sg) => ({ text: sg.text, s: pc.s + sg.start, e: pc.s + sg.end, dtw: (sg.words || []).map((w) => (w.t >= 0 ? pc.s + w.t : -1)) }));
    const gaps = sp.slice(1).map((x, i) => ({ s: sp[i].e, e: x.s }));
    const cut = segs.slice(1).map((nx, i) => {
      const a = segs[i].e - 1.5, z = nx.s + 1.5;
      const cand = gaps.filter((gp) => gp.e > a && gp.s < z && (gp.s + gp.e) / 2 > segs[i].s && (gp.s + gp.e) / 2 < nx.e);
      if (!cand.length) return (segs[i].e + nx.s) / 2;
      const best = cand.reduce((m, gp) => (gp.e - gp.s > m.e - m.s ? gp : m));
      return (best.s + best.e) / 2;
    });
    for (let si = 0; si < segs.length; si++) {
      const sg = segs[si];
      const prevE = arr.length ? arr[arr.length - 1].e : 0;
      const L = Math.max(prevE, si ? cut[si - 1] : pc.s);
      const R = si < cut.length ? cut[si] : pc.e + 0.3;
      const inside = sp.filter((x) => x.e > L && x.s < R);
      const ss = inside.length ? Math.max(L, inside[0].s) : Math.max(L, snap(sp, sg.s, "s"));
      const ee = inside.length ? Math.min(R, inside[inside.length - 1].e) : Math.min(R, snap(sp, sg.e, "e"));
      if (!(ee > ss + 0.05)) continue;
      if (arr.length && sg.s < prevE - 0.3 && !si) continue; // 토막 경계에서 겹친 문장
      // AI 가 같은 문장을 한 번 더 지어낼 때가 있다 — 그 구간에 실제 말소리가 글자 수에 비해 거의 없으면 버린다
      //  (버린 시간은 다음 문장 클립의 앞부분이 된다). 한 글자에 0.05초도 안 되면 말한 게 아니다
      const talk = sp.reduce((a, x) => a + Math.max(0, Math.min(ee, x.e) - Math.max(ss, x.s)), 0);
      const chars = String(sg.text).replace(/[\s.,?!~'"·…]/g, "").length;
      if (sp.length && talk < Math.max(0.25, chars * 0.05)) continue;
      // 서버가 여러 문장을 한 덩어리로 줄 때가 있다 — 마침표·물음표·느낌표 뒤에서 문장을 나눈다 (문장마다 클립)
      const parts = String(sg.text).split(/(?<=[.?!。？！])\s+/).map((x) => x.trim()).filter(Boolean);
      // 문장 전체 단어를 실제 말소리 구간 안에서만 나누고(쉬는 곳엔 단어를 두지 않음), 단어마다 몇째 문장인지 붙인다
      const ws = alignWords(parts.join(" "), ss, ee, sp);
      let k = 0;
      for (const part of parts) {
        g++;
        const n = part.split(/\s+/).filter(Boolean).length;
        arr.push(...ws.slice(k, k + n).map((w) => ({ ...w, g })));
        k += n;
      }
    }
  }
  // 단어 가운데 시각이 들어간 클립으로 (사이 틈에 떨어지면 0.6초 안의 가까운 클립으로)
  const out = new Map(list.map((t) => [t.id, []]));
  for (const [asset, arr] of Object.entries(words)) {
    const mine = list.filter((t) => t.asset === asset);
    for (const w of arr) {
      const m = (w.s + w.e) / 2;
      let best = mine.find((t) => m >= t.s && m < t.e);
      if (!best) {
        let bd = 0.6;
        for (const t of mine) {
          const d = m < t.s ? t.s - m : m - t.e;
          if (d < bd) (bd = d), (best = t);
        }
      }
      if (best) out.get(best.id).push({ w: w.w, s: +Math.max(best.s, w.s).toFixed(3), e: +Math.min(best.e, w.e).toFixed(3), g: w.g });
    }
  }
  onProgress("자막을 채우는 중…", 1);
  const strip = (ws) => ws.map(({ w, s, e }) => ({ w, s, e }));
  return list.map((t) => {
    const ws = out.get(t.id);
    const sents = [];
    for (const w of ws) {
      const last = sents[sents.length - 1];
      if (last && last.g === w.g) last.ws.push(w);
      else sents.push({ g: w.g, ws: [w] });
    }
    return {
      id: t.id,
      text: ws.map((w) => w.w).join(" "),
      words: strip(ws),
      sents: sents.map((x) => ({ text: x.ws.map((w) => w.w).join(" "), s: x.ws[0].s, e: x.ws[x.ws.length - 1].e, words: strip(x.ws) })),
    };
  });
}

/**
 * 자막 시각 맞추기 (무료, AI 없음) — 이미 받아쓴 클립의 글은 그대로 두고, 단어 시각만 실제 말소리에 다시 맞춘다.
 * items: [{ id, asset, s, e, text }] → [{ id, words }]
 */
async function realign(p, items, onProgress = () => {}) {
  const speechOf = {};
  const ids = [...new Set((items || []).map((x) => x.asset))].filter((id) => p.assets[id]);
  for (let i = 0; i < ids.length; i++) {
    onProgress(`말소리 구간을 찾는 중… (${i + 1}/${ids.length})`, i / ids.length);
    speechOf[ids[i]] = await ff.speech(p.assets[ids[i]].path, p.assets[ids[i]].duration, { min: 0.2 }).catch(() => []);
  }
  return (items || []).filter((x) => speechOf[x.asset]).map((x) => {
    const sp = speechOf[x.asset];
    const inside = sp.filter((r) => r.e > x.s && r.s < x.e);
    const s = inside.length ? Math.max(x.s, inside[0].s) : x.s;
    const e = inside.length ? Math.min(x.e, inside[inside.length - 1].e) : x.e;
    return { id: x.id, words: alignWords(x.text, s, e, sp) };
  });
}

/* 문장 시각을 실제 말소리 구간에 맞추고, 사이의 무음은 따로 클립으로 (브루처럼) */
/**
 * 받아쓰기 없이 넣기 — PC에서 말소리 구간만 찾아(ffmpeg, 무료) 말하는 구간 = 클립, 긴 침묵 = 말 없는 구간.
 * 서버로 아무것도 보내지 않는다 (AI 비용 없음). 글은 비어 있고, 나중에 받아쓰기로 채울 수 있다
 */
async function splitBySpeech(p, assetId, onProgress = () => {}) {
  const a = p.assets[assetId];
  if (!a) throw new Error("영상을 찾지 못했습니다.");
  const dur = a.duration;
  const whole = [{ id: uid(), type: "source", text: "", src: { asset: assetId, s: 0, e: dur }, words: [] }];
  if (!a.hasAudio || a.kind !== "video" || !(dur > 0)) return { clips: whole, speech: [] };
  onProgress("말소리 구간을 나누는 중… (PC에서)", 0.5);
  const speech = await ff.speech(a.path, dur).catch(() => []);
  // 가까운 말소리는 한 덩어리로 (0.6초보다 짧게 쉰 곳은 이어서), 너무 짧은 덩어리는 옆에 붙인다
  const runs = [];
  for (const r of speech) {
    const last = runs[runs.length - 1];
    if (last && r.s - last.e < 0.6) last.e = r.e;
    else runs.push({ s: r.s, e: r.e });
  }
  if (!runs.length) return { clips: whole, speech };
  const clips = [];
  let t = 0;
  for (const r of runs) {
    const s = Math.max(t, r.s - 0.08);
    const e = Math.min(dur, r.e + 0.12);
    if (s - t > 0.6) clips.push({ id: uid(), type: "silence", text: "", src: { asset: assetId, s: t, e: s } });
    const prev = clips[clips.length - 1];
    if (prev && prev.type === "source" && (e - s < 0.5 || s - prev.src.e <= 0.6)) prev.src.e = e;
    else clips.push({ id: uid(), type: "source", text: "", src: { asset: assetId, s: s - t <= 0.6 ? t : s, e }, words: [] });
    t = e;
  }
  if (dur - t > 0.6) clips.push({ id: uid(), type: "silence", text: "", src: { asset: assetId, s: t, e: dur } });
  else if (clips.length) clips[clips.length - 1].src.e = dur;
  return { clips, speech };
}

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

/**
 * 단어 시각 맞추기 (자동 자막) — 문장 안의 실제 말소리 덩어리마다 단어를 통째로 배정한다 (쉬는 곳에 걸친 단어가 없게).
 * 글자 수 비율로 "이 단어는 몇째 덩어리"를 정하고, 덩어리 안에서 다시 글자 수만큼 나눈다
 */
/**
 * Whisper DTW 단어 시각으로 단어 나누기 (2026-10-20 사장님: 웃음소리로 시작하는 문장에서 자막이 앞서 나왔다)
 *  단어 수가 같고 시각이 앞으로만 가면 쓴다. DTW 시각은 소리보다 0.1초쯤 늦게 찍혀서 조금 당긴다. 아니면 null (예전 방식으로)
 */
function dtwWords(text, dtw, s, e) {
  const tokens = String(text).split(/\s+/).filter(Boolean);
  if (!dtw || dtw.length !== tokens.length || !tokens.length || dtw.some((t) => !(t >= 0))) return null;
  const st = dtw.map((t) => Math.max(s, Math.min(e - 0.05, t - 0.1)));
  for (let i = 1; i < st.length; i++) if (st[i] < st[i - 1] + 0.03) return null; // 거꾸로 가거나 겹치면 믿지 않는다
  return tokens.map((w, i) => ({ w, s: +st[i].toFixed(3), e: +(i + 1 < st.length ? st[i + 1] : e).toFixed(3) }));
}

function alignWords(text, s, e, speech) {
  const tokens = String(text).split(/\s+/).filter(Boolean);
  const runs = speech.map((r) => ({ s: Math.max(s, r.s), e: Math.min(e, r.e) })).filter((r) => r.e - r.s > 0.05);
  if (runs.length < 2 || !tokens.length) return spreadSource(text, s, e, speech);
  const T = runs.reduce((a, r) => a + (r.e - r.s), 0);
  // 글자 양 — 문장부호(. , ? ! 등)는 소리가 아니라 빼고 센다
  const wt = tokens.map((w) => w.replace(/[.,?!~'"·…。？！]/g, "").length + 0.5);
  const W = wt.reduce((a, x) => a + x, 0);
  // 나눌 수 있는 모든 경우 중 "덩어리마다 말한 시간 비율 ≈ 맡은 글자 양 비율"이 가장 잘 맞는 나눔 (단어 순서는 그대로)
  const n = tokens.length, m = runs.length;
  const pre = [0];
  for (const x of wt) pre.push(pre[pre.length - 1] + x);
  const share = runs.map((r) => (r.e - r.s) / T);
  const f = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(Infinity));
  const from = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  f[0][0] = 0;
  for (let k = 1; k <= m; k++)
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= i; j++) {
        if (f[k - 1][j] === Infinity) continue;
        const d = share[k - 1] - (pre[i] - pre[j]) / W;
        const v = f[k - 1][j] + d * d;
        if (v < f[k][i]) (f[k][i] = v), (from[k][i] = j);
      }
  const groups = runs.map(() => []);
  for (let k = m, i = n; k > 0; k--) {
    const j = from[k][i];
    for (let x = j; x < i; x++) groups[k - 1].push(x);
    i = j;
  }
  const out = [];
  groups.forEach((idx, gi) => {
    if (!idx.length) return;
    const r = runs[gi];
    const sum = idx.reduce((a, i) => a + wt[i], 0);
    let t = r.s;
    for (const i of idx) {
      const d = ((r.e - r.s) * wt[i]) / sum;
      out.push({ w: tokens[i], s: +t.toFixed(3), e: +(t + d).toFixed(3) });
      t += d;
    }
  });
  return out;
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
function exportText(p, kind, outFile) {
  const { items } = tl.flatten(p);
  // 저장할 곳 — [다른 형식으로 내보내기]에서 고른 파일 (없으면 완성 영상과 같은 곳: .gss 옆)
  const out = outFile ? path.dirname(outFile) : require("./folders").exportDir(p);
  fs.mkdirSync(out, { recursive: true });
  let file;
  if (kind === "srt") {
    let n = 0;
    const body = items
      .filter((x) => x.clip.sub !== false && (x.clip.type !== "silence" || typeof x.clip.subText === "string") && tl.subtitleText(x.clip).trim())
      .map((x) => `${++n}\n${srtTime(x.start)} --> ${srtTime(x.start + x.dur)}\n${tl.subtitleText(x.clip)}\n`)
      .join("\n");
    file = outFile || path.join(out, `${p.name}.srt`);
    fs.writeFileSync(file, body, "utf8");
  } else {
    const body = (p.scenes || []).map((sc) => sc.clips.filter((c) => !c.del && c.type !== "silence").map((c) => tl.clipText(c)).filter(Boolean).join("\n")).join("\n\n");
    file = outFile || path.join(out, `${p.name}.txt`);
    fs.writeFileSync(file, body, "utf8");
  }
  return file;
}

module.exports = { tidyEdges, saveVoiceMeta, leadNonverbal, alignWords, create, open, save, flush, discard, backup, backups, saveWork, discardWork, convert, packageInfo, makePackage, relink, saveAs, rename, trashList, trash, restore, purge, recent, addAsset, voiceFor, voiceJoin, transcribe, transcribeClips, realign, splitBySpeech, exportText, withUrls, RATIOS, DEFAULT_SETTINGS, uid, spreadWords };
