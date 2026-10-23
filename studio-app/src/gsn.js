// 작업 파일 — 메뉴마다 파일 하나 (2026-10-23 사장님 회의, docs/2026-10-23_gsn_plan.md)
//   .gsn = 01 뉴스SNS발행 작업 (공실·칼럼·시뮬레이션)            → 01 뉴스SNS발행\프로젝트\20261023\
//   .gsm = 02 공실마케팅 작업 (예측 보고서 · 공실 없이 만든 매물보고서) → 02 공실마케팅\프로젝트\20261023\
//   (.gss = 05 동영상제작 — video/gss.js)
//  작업은 지금처럼 안 보이는 userData 에서 하고, 바뀌면 3초 쉬었다가 통째로 묶어 쓴다 (zip — video/gss.js zipWrite).
//  이 기능을 켠 뒤 새로 만든 작업만 (예전 작업은 그대로 — 사장님). 회원이 파일 이름을 바꾸거나 옮기면 다음 저장 때 새로 만든다.
//  공실로 만든 매물보고서는 서버에 저장되므로 파일로 남기지 않는다.
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log/main");

const VERSION = 1;
const TYPES = {
  gsn: { ext: ".gsn", folder: "sns", meta: "gsn.json", label: "뉴스SNS발행" },
  gsm: { ext: ".gsm", folder: "mkt", meta: "gsm.json", label: "공실마케팅" },
};
const EXT = TYPES.gsn.ext;
const userData = () => app.getPath("userData");
const mediaRoot = () => path.join(userData(), "media");
const reportsRoot = () => path.join(userData(), "local-reports");
const indexFile = () => path.join(userData(), "gsn-index.json");
const readIndex = () => {
  try {
    const v = JSON.parse(fs.readFileSync(indexFile(), "utf8"));
    return { since: Number(v.since) || 0, files: v.files && typeof v.files === "object" ? v.files : {}, menuFolders: v.menuFolders || 0 };
  } catch {
    return { since: 0, files: {} };
  }
};
const writeIndex = (v) => { try { fs.writeFileSync(indexFile(), JSON.stringify(v, null, 1)); } catch {} };
const ymd = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

/* ── 작업 알아보기 ── */
const isSrp = (id) => /^srp-[a-f0-9]+$/.test(id); // 인테리어·리모델링 예측 보고서 (공간마다 int-·rem- 시뮬레이션)
const isRpt = (id) => /^rpt-[\w-]+$/.test(id); // 공실 없이 만든 매물보고서
const isSimId = (id) => /^(int|rem)-[\w-]+$/.test(id);
const kindOf = (id) => (/^col-/.test(id) ? "column" : isSimId(id) ? "sim" : isSrp(id) ? "simreport" : isRpt(id) ? "report" : "vacancy");
/** 이 시뮬레이션이 예측 보고서의 공간이면 그 보고서 id */
function ownerProject(simId) {
  try {
    for (const n of fs.readdirSync(mediaRoot())) {
      if (!isSrp(n)) continue;
      const d = readJson(path.join(mediaRoot(), n, "project.json"));
      if (d && (d.spaces || []).some((s) => s.simId === simId)) return n;
    }
  } catch {}
  return "";
}
/** 바뀐 것(id) → 어느 작업 파일에 쓸지 { type, id } (안 쓰면 null) */
function workOf(id) {
  if (!/^[\w-]+$/.test(id)) return null;
  if (isRpt(id) || isSrp(id)) return { type: "gsm", id };
  if (isSimId(id)) { const owner = ownerProject(id); return owner ? { type: "gsm", id: owner } : { type: "gsn", id }; }
  return { type: "gsn", id };
}
/** 작업의 주 자리 (폴더 또는 파일) */
const mainPath = (id) => (isRpt(id) ? path.join(reportsRoot(), `${id}.json`) : path.join(mediaRoot(), id));
// 이름을 정할 만큼 준비됐는지
const KEY_FILE = { vacancy: "analysis.json", column: "article.json", sim: "sim.json", simreport: "project.json" };
function ready(id) {
  const p = mainPath(id);
  return isRpt(id) ? fs.existsSync(p) : fs.existsSync(path.join(p, KEY_FILE[kindOf(id)]));
}
/** 이 기능을 켠 뒤 새로 만든 작업인가 (또는 작업 파일에서 연 작업) */
function eligible(id, idx) {
  try {
    const st = fs.statSync(mainPath(id));
    return (Boolean(idx.files[id]) || (st.birthtimeMs || st.ctimeMs) >= idx.since) && ready(id);
  } catch {
    return false;
  }
}

/* ── 이름 · 담을 파일 ── */
function nameOf(id) {
  if (isRpt(id)) return (readJson(mainPath(id)) || {}).title || "매물보고서";
  if (isSrp(id)) {
    const d = readJson(path.join(mainPath(id), "project.json")) || {};
    return `${d.kind === "remodel" ? "리모델링" : "인테리어"} 예측 보고서_${(d.site && d.site.title) || "제목 없음"}`;
  }
  return require("./out-folder").workName(id);
}
/** [{ abs, rel }] — .gsn 은 작업 폴더 안 상대 위치 그대로, .gsm 은 userData 기준 (media/…, local-reports/…) */
function partsOf(type, id) {
  const out = [];
  const walk = (dir, prefix) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, `${prefix}${e.name}/`);
      else if (!/\.(tmp|saving)$/i.test(e.name)) out.push({ abs: p, rel: `${prefix}${e.name}` });
    }
  };
  if (type === "gsn") walk(mainPath(id), "");
  else if (isRpt(id)) out.push({ abs: mainPath(id), rel: `local-reports/${id}.json` });
  else {
    walk(mainPath(id), `media/${id}/`);
    const d = readJson(path.join(mainPath(id), "project.json")) || {};
    for (const s of d.spaces || []) if (isSimId(String(s.simId || ""))) walk(path.join(mediaRoot(), s.simId), `media/${s.simId}/`);
  }
  return out;
}

/** .gsn 은 메뉴 이름 폴더에 (공실뉴스 · 뉴스칼럼 · 인테리어뉴스 · 리모델링뉴스), .gsm 은 지금처럼 날짜 폴더 */
function menuFolder(id) {
  const k = kindOf(id);
  if (k === "column") return "뉴스칼럼";
  if (k === "sim") return String(id).startsWith("int-") ? "인테리어뉴스" : "리모델링뉴스";
  return "공실뉴스";
}
const outDirOf = (type, id) => (type === "gsn"
  ? require("./studio-root").dir(TYPES.gsn.folder, "프로젝트", menuFolder(id))
  : require("./studio-root").dir(TYPES[type].folder, "프로젝트", ymd()));

/** 예전 날짜 폴더(프로젝트\20261023\…)에 있던 .gsn 을 메뉴 폴더로 옮긴다 — 한 번만, 빈 날짜 폴더는 지운다 */
function moveOldGsn() {
  const idx = readIndex();
  if (idx.menuFolders) return;
  const projRoot = require("./studio-root").dir(TYPES.gsn.folder, "프로젝트");
  let moved = 0;
  for (const [id, file] of Object.entries(idx.files)) {
    if (!file || !file.toLowerCase().endsWith(".gsn") || !fs.existsSync(file)) continue;
    if (!/^\d{8}$/.test(path.basename(path.dirname(file))) || path.dirname(path.dirname(file)) !== projRoot) continue; // 날짜 폴더에 있는 것만
    const outDir = outDirOf("gsn", id);
    fs.mkdirSync(outDir, { recursive: true });
    let dest = path.join(outDir, path.basename(file));
    for (let n = 2; fs.existsSync(dest); n++) dest = path.join(outDir, path.basename(file, ".gsn") + `_${n}.gsn`);
    try { fs.renameSync(file, dest); idx.files[id] = dest; moved++; } catch (e) { log.warn(`[.gsn] 옮기지 못함 ${file}: ${e.message}`); }
  }
  // 색인에 없는 것(설치판 앱이 만든 것 등)도 — 파일 안의 작업 번호로 메뉴를 알아낸다
  try {
    for (const d of fs.readdirSync(projRoot)) {
      const p = path.join(projRoot, d);
      if (!/^\d{8}$/.test(d) || !fs.statSync(p).isDirectory()) continue;
      for (const name of fs.readdirSync(p)) {
        if (!name.toLowerCase().endsWith(".gsn")) continue;
        const file = path.join(p, name);
        try {
          const meta = require("./video/gss").zipRead(file).find((e) => e.name === TYPES.gsn.meta);
          const id = String(JSON.parse(meta.data.toString("utf8")).id || "");
          if (!/^[\w-]+$/.test(id)) continue;
          const outDir = outDirOf("gsn", id);
          fs.mkdirSync(outDir, { recursive: true });
          let dest = path.join(outDir, name);
          for (let n = 2; fs.existsSync(dest); n++) dest = path.join(outDir, path.basename(name, ".gsn") + `_${n}.gsn`);
          fs.renameSync(file, dest);
          moved++;
        } catch (e) { log.warn(`[.gsn] 옮기지 못함 ${file}: ${e.message}`); }
      }
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    }
  } catch {}
  idx.menuFolders = 1;
  writeIndex(idx);
  if (moved) log.info(`[.gsn] 메뉴 폴더로 옮김 ${moved}개`);
}

/** 작업 하나를 작업 파일로 쓴다 (돌려줌: 파일 위치 · 안 쓰면 "") */
function write(type, id, force = false) {
  const T = TYPES[type];
  const idx = readIndex();
  // force — [저장하기]: 기능을 켜기 전에 만든 작업도 저장한다 (준비만 돼 있으면)
  if (!T || (force ? !ready(id) : !idx.since || !eligible(id, idx))) return "";
  let file = idx.files[id];
  if (!file || !fs.existsSync(file)) {
    const day = ymd();
    const outDir = outDirOf(type, id);
    fs.mkdirSync(outDir, { recursive: true });
    const base = `${day} ${nameOf(id)}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
    file = path.join(outDir, `${base}${T.ext}`);
    for (let n = 2; fs.existsSync(file); n++) file = path.join(outDir, `${base}_${n}${T.ext}`);
  }
  const entries = [{ name: T.meta, data: Buffer.from(JSON.stringify({ app: "공실스튜디오", type: T.label, version: VERSION, id, kind: kindOf(id), savedAt: new Date().toISOString() }, null, 1), "utf8") }];
  for (const p of partsOf(type, id)) entries.push({ name: p.rel, data: fs.readFileSync(p.abs) });
  const tmp = `${file}.saving`;
  require("./video/gss").zipWrite(tmp, entries);
  fs.renameSync(tmp, file); // 쓰다 멈춰도 예전 파일이 깨지지 않게
  idx.files[id] = file;
  writeIndex(idx);
  return file;
}

/* 바뀔 때마다 쓰면 무거우니 3초 모아서 */
const timers = new Map(); // "type:id" → timer
function schedule(w) {
  if (!w) return;
  const k = `${w.type}:${w.id}`;
  clearTimeout(timers.get(k));
  timers.set(k, setTimeout(() => {
    timers.delete(k);
    try {
      const f = write(w.type, w.id);
      if (f) log.info(`[${TYPES[w.type].ext}] ${w.id} → ${f}`);
    } catch (e) {
      log.warn(`[${TYPES[w.type].ext}] ${w.id} 쓰지 못함: ${e.message}`);
    }
  }, 3000));
}
function flushAll() {
  for (const [k, t] of timers) { clearTimeout(t); const [type, id] = k.split(":"); try { write(type, id); } catch {} }
  timers.clear();
}

/** 앱을 켤 때 — 처음이면 "이때부터 새 작업" 시각을 적고, 작업 자리를 지켜본다 */
function start() {
  const idx = readIndex();
  if (!idx.since) { idx.since = Date.now(); writeIndex(idx); }
  try { moveOldGsn(); } catch (e) { log.warn(`[.gsn] 메뉴 폴더로 옮기기 실패: ${e.message}`); }
  // 네 메뉴 폴더를 미리 (처음 열어도 모양이 보이게)
  for (const m of ["공실뉴스", "뉴스칼럼", "인테리어뉴스", "리모델링뉴스"]) { try { fs.mkdirSync(require("./studio-root").dir(TYPES.gsn.folder, "프로젝트", m), { recursive: true }); } catch {} }
  for (const d of [mediaRoot(), reportsRoot()]) fs.mkdirSync(d, { recursive: true });
  try {
    fs.watch(mediaRoot(), { recursive: true }, (_ev, rel) => schedule(workOf(String(rel || "").split(/[\\/]/)[0])));
    fs.watch(reportsRoot(), (_ev, name) => { const m = /^(rpt-[\w-]+)\.json$/.exec(String(name || "")); if (m) schedule(workOf(m[1])); });
  } catch (e) {
    log.warn(`[작업 파일] 지켜보지 못함: ${e.message}`);
  }
  app.on("before-quit", flushAll);
}

/* ── 열기 — 탐색기에서 두 번 누르면 (실행 인자). 풀고 그 메뉴에서 그 작업을 연다 ── */
const typeOfFile = (p) => (typeof p === "string" ? Object.keys(TYPES).find((t) => p.toLowerCase().endsWith(TYPES[t].ext)) || "" : "");
const isGsn = (p) => typeOfFile(p) === "gsn";
const isWorkFile = (p) => Boolean(typeOfFile(p));
const newestIn = (p) => {
  let t = 0;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) walk(q); else t = Math.max(t, fs.statSync(q).mtimeMs); } };
  try { if (fs.statSync(p).isDirectory()) walk(p); else t = fs.statSync(p).mtimeMs; } catch {}
  return t;
};
const when = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시 ${String(d.getMinutes()).padStart(2, "0")}분`; };
/** 돌려줌: { type, id, kind, simKind? } (열지 않았으면 null) */
async function open(file, win) {
  const { dialog } = require("electron");
  const gss = require("./video/gss");
  const type = typeOfFile(file);
  const T = TYPES[type];
  const bad = () => new Error(`공실스튜디오 ${type === "gsm" ? "마케팅" : "뉴스"} 파일(${T ? T.ext : ".gsn"})이 아니거나 깨졌어요.`);
  if (!T) throw bad();
  let entries;
  try { entries = gss.zipRead(file); } catch { throw bad(); }
  let info = null;
  try { info = JSON.parse(entries.find((e) => e.name === T.meta).data.toString("utf8")); } catch {}
  const id = String((info && info.id) || "");
  if (!/^[\w-]+$/.test(id) || (type === "gsm" && !isSrp(id) && !isRpt(id))) throw bad();
  // 이 PC에 같은 작업이 있으면 — 어느 쪽이 최근인지 보여 주고 묻는다
  const here = mainPath(id);
  const hasHere = fs.existsSync(here) && (!fs.statSync(here).isDirectory() || fs.readdirSync(here).length > 0);
  if (hasHere) {
    const mine = newestIn(here);
    const theirs = Date.parse(info.savedAt) || fs.statSync(file).mtimeMs;
    const r = await dialog.showMessageBox(win || undefined, {
      type: "question", title: "공실스튜디오", buttons: ["파일 것으로 열기", "지금 PC 것 그대로 열기", "취소"], defaultId: theirs >= mine ? 0 : 1, cancelId: 2,
      message: "이 PC에 같은 작업이 이미 있어요.",
      detail: `파일: ${when(theirs)} 저장${theirs >= mine ? " (더 최근)" : ""}\n이 PC: ${when(mine)} 고침${mine > theirs ? " (더 최근)" : ""}\n\n[파일 것으로 열기]를 누르면 이 PC의 작업을 파일 내용으로 바꿉니다.`,
    });
    if (r.response === 2) return null;
    if (r.response === 1) { const idx = readIndex(); idx.files[id] = file; writeIndex(idx); return result(type, id); }
  }
  // 풀기 — 들어갈 자리를 먼저 비운다 (.gsm 은 보고서와 공간 시뮬레이션들)
  if (type === "gsn") {
    fs.rmSync(here, { recursive: true, force: true });
    fs.mkdirSync(here, { recursive: true });
  } else {
    const tops = new Set(entries.map((e) => (/^media\/([\w-]+)\//.exec(e.name) || [])[1]).filter(Boolean));
    for (const t of tops) if (isSrp(t) || isSimId(t)) fs.rmSync(path.join(mediaRoot(), t), { recursive: true, force: true });
  }
  for (const e of entries) {
    if (e.name === T.meta) continue;
    let to = "";
    if (type === "gsn") to = path.join(here, ...e.name.split("/"));
    else {
      const m = /^media\/([\w-]+)\/(.+)$/.exec(e.name);
      if (m && (m[1] === id || isSimId(m[1]))) to = path.join(mediaRoot(), m[1], ...m[2].split("/"));
      else if (isRpt(id) && e.name === `local-reports/${id}.json`) to = path.join(reportsRoot(), `${id}.json`);
    }
    const base = type === "gsn" ? here : userData();
    if (!to || !gss.under(to, base)) continue; // 이상한 이름(../) 막기
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, e.data);
  }
  // 앞으로 고치면 이 파일에 다시 저장한다
  const idx = readIndex();
  idx.files[id] = file;
  writeIndex(idx);
  log.info(`[${T.ext}] 엶 ${file} → ${id}`);
  return result(type, id);
}
function result(type, id) {
  const out = { type, id, kind: kindOf(id) };
  if (isSrp(id)) out.simKind = ((readJson(path.join(mainPath(id), "project.json")) || {}).kind === "remodel") ? "remodel" : "interior";
  return out;
}

/** [저장하기] — 지금 바로 작업 파일로. 돌려줌 { file, savedAt } (준비 안 된 작업이면 file "") */
function saveNow(id) {
  const w = workOf(String(id || ""));
  if (!w) return { file: "", savedAt: "" };
  clearTimeout(timers.get(`${w.type}:${w.id}`));
  timers.delete(`${w.type}:${w.id}`);
  const file = write(w.type, w.id, true);
  if (file) log.info(`[${TYPES[w.type].ext}] ${w.id} → ${file} (저장하기)`);
  return { file, savedAt: file ? new Date().toISOString() : "" };
}
/** 이 작업의 작업 파일과 마지막 저장 시각 (없으면 빈칸) */
function status(id) {
  const w = workOf(String(id || ""));
  const file = w ? readIndex().files[w.id] : "";
  if (!file || !fs.existsSync(file)) return { file: "", savedAt: "" };
  return { file, savedAt: fs.statSync(file).mtime.toISOString() };
}

module.exports = { EXT, TYPES, start, write, flushAll, kindOf, isGsn, isWorkFile, open, saveNow, status };
