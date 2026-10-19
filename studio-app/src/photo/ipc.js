// 이미지 편집 (포토랩) — 편집 화면(웹)과 PC(앱)를 잇는 통로. preload 의 gongsilStudio.photo.* 가 부른다.
// PSD 읽기·쓰기·그리기는 모두 편집 화면 안에서 (ag-psd) — 여기는 파일 고르기·읽기·쓰기·최근 파일만 (회의: docs/2026-10-19_photolab_meeting.md)
const { ipcMain, dialog, shell, app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

let dirty = 0; // 저장 안 한 문서 수 — 앱을 닫을 때 묻는다
const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
const recentFile = () => path.join(app.getPath("userData"), "photo-recent.json");
const defaultDir = () => {
  const d = path.join(app.getPath("documents"), "공실뉴스 이미지");
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
};
const OPEN_FILTERS = [
  { name: "포토샵·그림", extensions: ["psd", "psb", "png", "jpg", "jpeg", "webp", "gif", "bmp"] },
  { name: "포토샵 (PSD)", extensions: ["psd", "psb"] },
  { name: "그림", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] },
];
const MAX = 512 * 1024 * 1024; // 너무 큰 파일은 열지 않는다

function readRecent() {
  try {
    const list = JSON.parse(fs.readFileSync(recentFile(), "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function writeRecent(list) {
  try { fs.writeFileSync(recentFile(), JSON.stringify(list.slice(0, 24))); } catch {}
}
function addRecent(file, thumb) {
  const list = readRecent().filter((x) => x.path !== file);
  const old = readRecent().find((x) => x.path === file);
  list.unshift({ path: file, name: path.basename(file), at: Date.now(), thumb: thumb || (old && old.thumb) || "" });
  writeRecent(list);
}
function readOne(file) {
  const st = fs.statSync(file);
  if (st.size > MAX) throw new Error("파일이 너무 커요 (512MB 넘음)");
  const buf = fs.readFileSync(file);
  return { path: file, name: path.basename(file), bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) };
}
const toBuf = (bytes) => Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []));

function register() {
  // 열기 — 고른 파일들의 바이트
  ipcMain.handle("photo:open", async (e, { images = false } = {}) => {
    const r = await dialog.showOpenDialog(winOf(e), {
      title: images ? "사진 넣기" : "열기",
      defaultPath: defaultDir(),
      properties: ["openFile", "multiSelections"],
      filters: images ? [OPEN_FILTERS[2]] : OPEN_FILTERS,
    });
    if (r.canceled || !r.filePaths.length) return [];
    const out = [];
    for (const f of r.filePaths) {
      try {
        out.push(readOne(f));
        if (!images) addRecent(f);
      } catch (err) {
        out.push({ path: f, name: path.basename(f), error: String((err && err.message) || err) });
      }
    }
    return out;
  });
  // 최근 파일 다시 열기
  ipcMain.handle("photo:read", (_e, file) => {
    try {
      const r = readOne(file);
      addRecent(file);
      return r;
    } catch (err) {
      return { path: file, name: path.basename(file), error: fs.existsSync(file) ? String((err && err.message) || err) : "파일을 찾을 수 없어요 (옮겼거나 지웠어요)" };
    }
  });
  // 저장 — file 이 없으면 [다른 이름으로] 창. ext: psd | png | jpg
  ipcMain.handle("photo:save", async (e, { file, name, ext = "psd", bytes, thumb, ask } = {}) => {
    let target = file;
    if (!target || ask) {
      const base = String(name || "제목 없음").replace(/[\\/:*?"<>|]/g, "_");
      const FILTERS = { psd: { name: "포토샵 (PSD)", extensions: ["psd"] }, jpg: { name: "JPG", extensions: ["jpg", "jpeg"] }, png: { name: "PNG", extensions: ["png"] }, pdf: { name: "인쇄용 PDF (CMYK)", extensions: ["pdf"] }, tif: { name: "인쇄용 TIFF (CMYK)", extensions: ["tif", "tiff"] } };
      const filters = [FILTERS[ext] || FILTERS.png];
      const r = await dialog.showSaveDialog(winOf(e), {
        title: ext === "psd" ? "다른 이름으로 저장" : "내보내기",
        defaultPath: path.join(file ? path.dirname(file) : defaultDir(), `${base}.${ext}`),
        filters,
      });
      if (r.canceled || !r.filePath) return { canceled: true };
      target = r.filePath;
    }
    try {
      const tmp = `${target}.saving`;
      fs.writeFileSync(tmp, toBuf(bytes));
      fs.renameSync(tmp, target); // 쓰다 멈춰도 원본이 깨지지 않게
      if (ext === "psd") addRecent(target, thumb);
      return { path: target, name: path.basename(target) };
    } catch (err) {
      return { error: String((err && err.message) || err) };
    }
  });
  ipcMain.handle("photo:recent", () => readRecent().map((x) => ({ ...x, missing: !fs.existsSync(x.path) })));
  ipcMain.handle("photo:recent-remove", (_e, file) => {
    writeRecent(readRecent().filter((x) => x.path !== file));
    return true;
  });
  ipcMain.handle("photo:recent-thumb", (_e, file, thumb) => {
    const list = readRecent();
    const hit = list.find((x) => x.path === file);
    if (hit) { hit.thumb = thumb; writeRecent(list); }
    return true;
  });
  ipcMain.handle("photo:set-dirty", (_e, n) => {
    dirty = Number(n) || 0;
    return true;
  });
  ipcMain.handle("photo:reveal", (_e, file) => {
    if (file && fs.existsSync(file)) shell.showItemInFolder(file);
    return true;
  });
}

module.exports = { register, dirtyCount: () => dirty, clearDirty: () => { dirty = 0; } };
