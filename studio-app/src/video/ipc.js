// 영상 편집기 — 편집 화면(웹)과 PC(앱)를 잇는 통로. preload 의 gongsilStudio.video.* 가 부른다.
const { ipcMain, dialog, shell, BrowserWindow, desktopCapturer, session, screen } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const log = require("electron-log/main");
const library = require("./library");
const folders = require("./folders");
const fonts = require("./fonts");
const project = require("./project");
const render = require("./render");
const server = require("./server");
const media = require("./media");
const ff = require("./ff");
const vai = require("./ai");

let baseUrl = "";
const jobs = new Map(); // 굽기 멈추기
const recs = new Map(); // 녹화 중 파일
let chosenSource = null; // 화면 녹화로 고른 화면
const sourceDisplay = new Map(); // 화면 id → 모니터 번호
let pendingFile = ""; // 탐색기에서 두 번 눌러 연 .gss
let dirty = false; // 편집 화면에 저장 안 한 내용이 있음
let dirtyWork = { dir: "", file: "" }; // 그 프로젝트 (작업 폴더·.gss)
let closing = false; // [저장 안 함]·[저장] 뒤 정말 닫는 중
/** 앱 바깥에서 .gss 를 열었을 때 (main.js) — 영상 편집기가 켜져 있으면 바로, 아니면 켜질 때 가져간다 */
function openFile(file, win) {
  pendingFile = file;
  if (win && !win.isDestroyed()) win.webContents.send("video:open-file", file);
}
let live = null; // 녹화 중인 창 { win, startedAt, onMin, onRestore }
let mini = null; // 녹화 중 작은 막대 창
let miniOpening = false;
let prompter = null; // 녹화 중 프롬프터 창 (녹화에 안 찍힘)
// 개발판 시험용 — STUDIO_SHOW_IN_CAPTURE=1 이면 조정실·프롬프터가 캡처에 보인다 (설치판은 늘 안 찍힘)
const hideFromCapture = (w) => w.setContentProtection(!(!require("electron").app.isPackaged && process.env.STUDIO_SHOW_IN_CAPTURE === "1"));
let consoleWin = null; // 녹화 조정실 창 (OBS 스튜디오 모드처럼 — 녹화에 안 찍힘)

/* ── 녹화 중 창 자리 — 모니터가 두 대면 녹화하지 않는 모니터에 (카메라만이면 오른쪽), 끌어 옮긴 자리는 기억해 다음에도 ── */
let lastCamOnly = false; // 이번 녹화가 카메라만인지 (작은 창 자리도 같은 기준)
let winMem = null; // { console: {x, y, display}, mini: {x, y, width, height, display} }
const memFile = () => path.join(require("electron").app.getPath("userData"), "record-windows.json");
function mem() {
  if (!winMem) {
    try {
      winMem = JSON.parse(fs.readFileSync(memFile(), "utf8")) || {};
    } catch {
      winMem = {};
    }
  }
  return winMem;
}
function saveMem() {
  try {
    fs.writeFileSync(memFile(), JSON.stringify(winMem || {}));
  } catch {}
}
const recDisplayId = (camOnly) => (camOnly ? "" : String(sourceDisplay.get(chosenSource) || ""));
/** 녹화하지 않는 모니터 중 오른쪽 것 (모니터가 한 대면 null) */
function otherDisplay(camOnly) {
  const ds = screen.getAllDisplays();
  if (ds.length < 2) return null;
  const rec = recDisplayId(camOnly);
  const others = ds.filter((d) => String(d.id) !== rec).sort((a, b) => a.bounds.x - b.bounds.x);
  return others[others.length - 1] || null;
}
/** 기억한 자리 — 그 모니터가 아직 있고, 녹화하는 모니터가 아니면 */
function memPlace(kind, camOnly) {
  const m = mem()[kind];
  if (!m) return null;
  const d = screen.getAllDisplays().find((x) => String(x.id) === String(m.display));
  if (!d || String(d.id) === recDisplayId(camOnly)) return null;
  return { m, d };
}
// 다시 키울 때의 기준 — 누른 단추가 있던 창 (얇은 막대 → 작은 창, 작은 창 → 녹화하기 창).
// 2모니터에서 기억해 둔 다른 모니터로 튀지 않고, 누른 자리(그 모니터)에 뜨게 (사장님 2026-10-17)
let anchor = null; // { b: 창 자리, from: "bar", at: 시각 }
let popMini = null; // 떠 있는 카톡 크기 작은 창
const setAnchor = (b, from) => (anchor = b ? { b, from, at: Date.now() } : null);
const takeAnchor = (from) => {
  const a = anchor && anchor.from === from && Date.now() - anchor.at < 15000 ? anchor : null;
  if (a) anchor = null;
  return a && a.b;
};
function clampTo(d, x, y, w, h) {
  const wa = d.workArea;
  return { x: Math.round(Math.min(Math.max(wa.x, x), wa.x + wa.width - Math.min(w, wa.width))), y: Math.round(Math.min(Math.max(wa.y, y), wa.y + wa.height - Math.min(h, wa.height))) };
}

/** 녹화 조정실 창 모양 — 스튜디오 창이 있는 모니터 가운데. mini = 녹화 중 [작게 하기] 창 (카톡 크기, 녹화하는 모니터 오른쪽 아래) */
function consoleOptions(main, kind) {
  if (kind === "mini") {
    const base = { minWidth: 320, minHeight: 420, frame: false, backgroundColor: "#111317", title: "녹화 중", alwaysOnTop: true, autoHideMenuBar: true, show: true };
    // 0) 얇은 막대 [크게 보기]로 왔으면 — 막대가 있던 자리에 (막대는 작은 창 아래쪽 가운데에 붙어 있었다)
    const ab = takeAnchor("bar");
    if (ab) {
      const m = mem().mini;
      const w = (m && m.width) || 400, h = (m && m.height) || 560;
      const d = screen.getDisplayMatching(ab);
      return { ...base, width: w, height: h, ...clampTo(d, ab.x + ab.width / 2 - w / 2, ab.y + ab.height - h, w, h) };
    }
    // 1) 끌어 옮겨 둔 자리  2) 녹화하지 않는 모니터 오른쪽 아래  3) 녹화하는 모니터 오른쪽 아래
    const mp = memPlace("mini", lastCamOnly);
    if (mp) {
      const w = mp.m.width || 400, h = mp.m.height || 560;
      return { ...base, width: w, height: h, ...clampTo(mp.d, mp.m.x, mp.m.y, w, h) };
    }
    let d = otherDisplay(lastCamOnly);
    if (!d) {
      try {
        const id = sourceDisplay.get(chosenSource);
        d = screen.getAllDisplays().find((x) => String(x.id) === id) || null;
      } catch {}
    }
    const wa = (d || screen.getDisplayMatching(main.getBounds())).workArea;
    const W = 400, H = Math.min(560, wa.height - 40); // 내용 높이에 맞게 (빈칸 없이)
    return { ...base, width: W, height: H, x: wa.x + wa.width - W - 20, y: wa.y + wa.height - H - 20 };
  }
  const wa = screen.getDisplayMatching(main.getBounds()).workArea;
  const W = Math.min(1000, wa.width - 40), H = Math.min(980, wa.height - 40); // 녹화하기 창(980px)이 그대로 들어가게
  return {
    width: W,
    height: H,
    x: Math.round(wa.x + (wa.width - W) / 2),
    y: Math.round(wa.y + (wa.height - H) / 2),
    minWidth: 900,
    minHeight: 560,
    frame: false,
    backgroundColor: "#111317",
    title: "영상 녹화하기",
    alwaysOnTop: true,
    autoHideMenuBar: true,
    show: true,
  };
}
/** 조정실 창이 생기면 — 녹화에 안 찍히게, 스튜디오 창은 가려져도 그리기를 늦추지 않게 (녹화 화판을 거기서 그린다) */
let consoleMain = null; // 조정실을 연 스튜디오 창 (자리 맞추기 기준)
function setConsole(win, main, kind = "console") {
  consoleWin = win;
  consoleMain = main;
  // 끌어 옮기거나 크기를 바꾸면 기억 (다음 녹화 때 그 자리에)
  let t = 0;
  const remember = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (win.isDestroyed() || win.isMaximized() || win.isMinimized()) return;
      const b = win.getBounds();
      mem()[kind] = { x: b.x, y: b.y, width: b.width, height: b.height, display: screen.getDisplayMatching(b).id };
      saveMem();
    }, 400);
  };
  win.on("moved", remember);
  win.on("resized", remember);
  // 작은 창 — [크게 보기]를 누르면 녹화하기 창이 먼저 뜨고 작은 창이 닫힌다 → 자리 잡을 때 이 창 자리를 읽는다
  if (kind === "mini") {
    popMini = win;
    win.on("closed", () => popMini === win && (popMini = null));
  }
  hideFromCapture(win);
  win.setAlwaysOnTop(true, "floating");
  win.setMenuBarVisibility(false);
  if (main && !main.isDestroyed()) main.webContents.setBackgroundThrottling(false);
  win.on("closed", () => {
    if (consoleWin !== win) return; // 새 조정실이 이미 떠 있다
    consoleWin = null;
    if (main && !main.isDestroyed() && !live) main.webContents.setBackgroundThrottling(true);
  });
}
let prompterOpts = null; // { text, cps, size, startAt }
let prompterOwner = null; // 프롬프터를 연 창의 webContents (닫으면 알린다)

/** 녹화하는 모니터 (화면 녹화면 고른 화면, 아니면 스튜디오 창이 있는 모니터) */
async function recordDisplay(win) {
  let d = null;
  try {
    const srcs = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 0, height: 0 } });
    const s = srcs.find((x) => x.id === chosenSource);
    if (s) d = screen.getAllDisplays().find((x) => String(x.id) === String(s.display_id)) || null;
  } catch {}
  return d || screen.getDisplayMatching((win && !win.isDestroyed() ? win : BrowserWindow.getAllWindows()[0]).getBounds());
}

/**
 * 프롬프터 — 녹화하는 모니터 위쪽 가운데(카메라 바로 아래, 눈이 카메라를 보듯이)에 뜬다.
 * 화면 캡처에서 빠져서 화면을 녹화해도 영상에 나오지 않는다. 포커스를 뺏지 않게 조용히 띄운다
 */
async function openPrompter(win, opts) {
  closePrompter();
  prompterOpts = opts || {};
  const d = await recordDisplay(win);
  const wa = d.workArea;
  const W = Math.round(Math.min(960, wa.width * 0.62)), H = Math.round(Math.min(340, wa.height * 0.36));
  prompter = new BrowserWindow({
    width: W,
    height: H,
    minWidth: 420,
    minHeight: 200,
    x: Math.round(wa.x + (wa.width - W) / 2),
    y: wa.y + 8,
    frame: false,
    // 바탕만 비치게 (투명도 막대) — 뒤가 비치는 창. 크기 조절은 창 안의 손잡이로 (윈도우는 이런 창의 가장자리 끌기를 막는다)
    transparent: true,
    backgroundColor: "#00000000",
    resizable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,
    skipTaskbar: false, // [작게] 하면 작업 표시줄에서 다시 연다
    alwaysOnTop: true,
    show: false,
    title: "프롬프터",
    // 앞에 나와 있지 않아도(포커스 없음) 그리기를 늦추지 않게
    webPreferences: { preload: path.join(__dirname, "prompter-preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  prompter.setAlwaysOnTop(true, "screen-saver");
  hideFromCapture(prompter); // 윈도우: 화면 녹화·캡처에서 빠진다
  prompter.loadFile(path.join(__dirname, "prompter.html"));
  prompter.once("ready-to-show", () => prompter && prompter.showInactive());
  prompter.on("closed", () => {
    prompter = null;
    if (prompterOwner && !prompterOwner.isDestroyed()) prompterOwner.send("video:prompter-closed");
  });
}
function closePrompter() {
  if (prompter && !prompter.isDestroyed()) prompter.close();
  prompter = null;
}

/** 녹화 중 큰 창을 내리면 — 녹화하는 모니터 위쪽 가운데에 작은 막대. 막대는 녹화에 찍히지 않게(화면 캡처 제외) */
/** at = 이 자리 아래쪽에 (작은 창 [더 작게] — 작은 창이 있던 자리 아래쪽 가운데) */
async function openMini(at) {
  if (!live || mini || miniOpening) return;
  miniOpening = true;
  try {
    let d = null;
    try {
      const srcs = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 0, height: 0 } });
      const s = srcs.find((x) => x.id === chosenSource);
      if (s) d = screen.getAllDisplays().find((x) => String(x.id) === String(s.display_id)) || null;
    } catch {}
    if (!live) return;
    if (!d) d = screen.getDisplayMatching(live.win.getBounds());
    const W = 340, H = 54, wa = d.workArea;
    // 프롬프터가 떠 있으면 그 바로 아래에 (겹치지 않게)
    const pb = prompter && !prompter.isDestroyed() ? prompter.getBounds() : null;
    mini = new BrowserWindow({
      width: W,
      height: H,
      x: at ? Math.round(at.x + (at.width - W) / 2) : pb ? Math.round(pb.x + (pb.width - W) / 2) : Math.round(wa.x + (wa.width - W) / 2),
      y: at ? at.y + at.height - H : pb ? pb.y + pb.height + 8 : wa.y + 12,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      title: "녹화 중",
      webPreferences: { preload: path.join(__dirname, "record-mini-preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    mini.setAlwaysOnTop(true, "screen-saver");
    mini.setContentProtection(true); // 윈도우: 화면 녹화·캡처에서 빠진다
    mini.loadFile(path.join(__dirname, "record-mini.html"), { query: { t: String(live.startedAt) } });
    mini.once("ready-to-show", () => mini && mini.showInactive());
    mini.on("closed", () => {
      mini = null;
    });
  } finally {
    miniOpening = false;
  }
}
function closeMini() {
  if (mini && !mini.isDestroyed()) mini.close();
  mini = null;
}
function showBig(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
/** 녹화 끝 — 막대를 닫고, 내려가 있던 큰 창을 다시 올린다 */
function endLive() {
  if (!live) return;
  const { win, onMin, onRestore } = live;
  live = null;
  closeMini();
  if (!win.isDestroyed()) {
    win.removeListener("minimize", onMin);
    win.removeListener("restore", onRestore);
    win.webContents.setBackgroundThrottling(Boolean(!consoleWin)); // 조정실이 떠 있으면 계속 안 늦춤
    showBig(win);
  }
}

const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
const send = (e, ch, ...a) => {
  if (!e.sender.isDestroyed()) e.sender.send(ch, ...a);
};

function register(base) {
  baseUrl = base;
  server.configure(base);

  /* ── 라이브러리 ── */
  ipcMain.handle("video:lib-list", (_e, opts) => library.list(opts || {}));
  ipcMain.handle("video:lib-pick", async (e, { kinds = "media" } = {}) => {
    const filters = kinds === "audio"
      ? [{ name: "소리", extensions: ["mp3", "wav", "m4a", "aac", "ogg", "flac"] }]
      : [{ name: "사진·영상", extensions: ["mp4", "mov", "m4v", "webm", "mkv", "avi", "wmv", "jpg", "jpeg", "png", "webp", "gif", "heic"] }];
    const r = await dialog.showOpenDialog(winOf(e), { title: "PC에서 불러오기", properties: ["openFile", "multiSelections"], filters });
    if (r.canceled || !r.filePaths.length) return [];
    if (kinds === "audio") return library.add(r.filePaths, { source: "local", allowAudio: true }); // 내 음악 목록에 남긴다
    return library.add(r.filePaths, { source: "local" });
  });
  ipcMain.handle("video:lib-fav", (_e, id, fav) => library.setFav(id, fav));
  ipcMain.handle("video:lib-remove", (_e, id) => library.remove(id));
  ipcMain.handle("video:lib-folders", () => library.folders());
  ipcMain.handle("video:lib-add-folder", async (e) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "자동으로 가져올 폴더", properties: ["openDirectory"] });
    if (r.canceled || !r.filePaths[0]) return library.folders();
    return library.addFolder(r.filePaths[0]);
  });
  ipcMain.handle("video:lib-remove-folder", (_e, dir) => library.removeFolder(dir));
  ipcMain.handle("video:font-ensure", (_e, family) => fonts.ensure(family));
  ipcMain.handle("video:lib-music-folder", () => {
    fs.mkdirSync(library.musicDir(), { recursive: true });
    return library.musicDir();
  });
  /** 내 음악 → 프로젝트 폴더로 복사해서 쓴다 (원본을 옮기거나 지워도 영상은 그대로) */
  ipcMain.handle("video:music-use", async (_e, dir, libId) => {
    const it = library.get(libId);
    if (!it || it.kind !== "audio" || !fs.existsSync(it.path)) throw new Error("음악 파일을 찾지 못했습니다.");
    const destDir = path.join(dir, "assets", "music");
    fs.mkdirSync(destDir, { recursive: true });
    const ext = path.extname(it.path);
    let file = path.join(destDir, `${it.id}${ext}`);
    if (!fs.existsSync(file)) fs.copyFileSync(it.path, file);
    media.allow(file);
    return { file, url: media.urlOf(file), name: it.name.replace(/\.[^.]+$/, "") };
  });

  /* ── 프로젝트 ── */
  ipcMain.handle("video:project-create", (_e, opts) => project.withUrls(project.create(opts || {})));
  ipcMain.handle("video:project-open", (_e, dir, choice) => project.open(dir, choice));
  ipcMain.handle("video:project-open-pick", async (e) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "프로젝트 열기", defaultPath: folders.projectDir(), properties: ["openFile"], filters: [{ name: "공실뉴스 스튜디오 파일", extensions: ["gss"] }, { name: "예전 폴더 방식 프로젝트 (project.json)", extensions: ["json"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    const f = r.filePaths[0];
    return project.open(f.toLowerCase().endsWith(".gss") ? f : path.dirname(f));
  });
  ipcMain.handle("video:project-save", (_e, p) => project.save(p));
  // .gss — 바로 묶기 · 예전 폴더 → .gss · 프로젝트 패키지 · 없어진 원본 다시 연결
  ipcMain.handle("video:project-flush", (_e, p) => project.flush(p));
  ipcMain.handle("video:project-discard", (_e, p) => project.discard(p));
  // 저장 안 한 내용이 있으면 앱 창 X 를 누를 때 먼저 묻는다 (main.js 창 닫기)
  ipcMain.handle("video:set-dirty", (_e, v, dir, file) => {
    dirty = Boolean(v);
    dirtyWork = { dir: dir || "", file: file || "" };
    return true;
  });
  ipcMain.handle("video:backup", (_e, p) => project.backup(p));
  ipcMain.handle("video:backups", (_e, p) => project.backups(p));
  ipcMain.handle("video:close-now", (e) => {
    dirty = false;
    closing = true;
    const w = winOf(e);
    if (w) setTimeout(() => w.close(), 30);
    return true;
  });
  ipcMain.handle("video:project-convert", (_e, p) => project.convert(p));
  ipcMain.handle("video:package-info", (_e, p) => project.packageInfo(p));
  ipcMain.handle("video:package-make", async (e, p) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "프로젝트 패키지를 만들 곳 (이 안에 '이름_패키지' 폴더가 생겨요)", defaultPath: p.file ? path.dirname(p.file) : folders.projectDir(), properties: ["openDirectory", "createDirectory"] });
    if (r.canceled || !r.filePaths[0]) return null;
    const out = await project.makePackage(p, r.filePaths[0], (t, f) => send(e, "video:progress", t, f));
    shell.showItemInFolder(out.file);
    return out;
  });
  ipcMain.handle("video:relink", async (e, p, assetId) => {
    const a = p && p.assets && p.assets[assetId];
    const r = await dialog.showOpenDialog(winOf(e), { title: `원본 다시 연결 — ${a ? a.name : ""}`, defaultPath: p.file ? path.dirname(p.file) : undefined, properties: ["openFile"] });
    if (r.canceled || !r.filePaths[0]) return null;
    return project.relink(p, assetId, r.filePaths[0]);
  });
  // 탐색기에서 .gss 를 두 번 눌러 앱을 열었으면 — 편집 화면이 물어 가져간다
  ipcMain.handle("video:pending-file", () => {
    const f = pendingFile;
    pendingFile = "";
    return f;
  });
  ipcMain.handle("video:project-save-as", (_e, p, name, parent) => project.saveAs(p, name, parent));
  ipcMain.handle("video:pick-folder", async (e, title, defaultPath) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: title || "폴더 고르기", defaultPath: defaultPath || undefined, properties: ["openDirectory", "createDirectory"] });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });
  ipcMain.handle("video:project-recent", () => project.recent());
  // 저장 폴더 설정 — 프로젝트·녹화·내보내기 (비우면 기본)
  ipcMain.handle("video:folders-get", () => folders.get());
  ipcMain.handle("video:folders-set", (_e, patch) => {
    const r = folders.set(patch);
    library.scan().catch(() => {}); // 바꾼 폴더도 내 자료에서 보이게
    return r;
  });
  ipcMain.handle("video:project-rename", (_e, dir, name) => project.rename(dir, name));
  // 휴지통 — 옮겨 두기 · 목록 · 되살리기 · 영구 삭제(하나 / "all")
  ipcMain.handle("video:trash", (_e, dir) => project.trash(dir));
  ipcMain.handle("video:trash-list", () => project.trashList());
  ipcMain.handle("video:trash-restore", (_e, id) => project.restore(id));
  ipcMain.handle("video:trash-purge", (_e, id) => project.purge(id));
  ipcMain.handle("video:project-add-asset", (e, libId) => project.addAsset({}, libId, (f) => send(e, "video:progress", "편집용 사본 만드는 중…", f)));
  ipcMain.handle("video:project-export-text", (_e, p, kind) => {
    const f = project.exportText(p, kind);
    shell.showItemInFolder(f);
    return f;
  });

  /* ── AI 목소리 ── */
  ipcMain.handle("video:voice", (_e, dir, text, voiceId) => project.voiceFor({ dir }, text, voiceId));
  // 단어마다 목소리가 다른 클립 — 조각을 한 파일로 (0.1.8부터)
  ipcMain.handle("video:voice-join", (_e, dir, files) => project.voiceJoin({ dir }, files));

  /* ── 받아쓰기 ── */
  ipcMain.handle("video:transcribe", (e, p, assetId) => project.transcribe(p, assetId, (t, f) => send(e, "video:progress", t, f)));
  // 무음 줄이기 — 영상별 실제 말소리 구간 (0.2초 넘게 쉰 곳에서 끊음). 서버로 보내지 않는다 (무료)
  ipcMain.handle("video:speech", async (e, p, assetIds) => {
    const out = {};
    const ids = [...new Set(assetIds || [])].filter((id) => p.assets[id]);
    for (let i = 0; i < ids.length; i++) {
      const a = p.assets[ids[i]];
      send(e, "video:progress", `말소리 구간을 찾는 중… (${i + 1}/${ids.length})`, i / ids.length);
      out[ids[i]] = a.hasAudio === false ? [] : await ff.speech(a.path, a.duration, { min: 0.2 }).catch(() => []);
    }
    return out;
  });
  // 상세 편집 — 원본 영상 소리 파형 (PC에서, 무료). 앱 데이터 폴더에 저장해 두고 다음부터 바로
  ipcMain.handle("video:peaks", (_e, p, assetId) => {
    const a = p && p.assets && p.assets[assetId];
    if (!a || !a.path) throw new Error("원본 영상을 찾지 못했어요.");
    return ff.peaks(a.path, path.join(require("electron").app.getPath("userData"), "peaks"));
  });
  ipcMain.handle("video:realign", (e, p, items) => project.realign(p, items, (t, f) => send(e, "video:progress", t, f)));
  ipcMain.handle("video:transcribe-clips", (e, p, targets) => project.transcribeClips(p, targets, (t, f) => send(e, "video:progress", t, f)));
  ipcMain.handle("video:split", (e, p, assetId) => project.splitBySpeech(p, assetId, (t, f) => send(e, "video:progress", t, f)));

  /* ── 회원 AI ── */
  ipcMain.handle("video:ai-script", (e, opts) => vai.script(opts || {}, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:ai-scenes", (e, lines) => vai.scenesFor(lines || [], (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:ai-shorts", (e, clips, opts) => vai.shorts(clips || [], opts || {}, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:ai-image", async (e, dir, prompt) => {
    const dataUrl = await vai.image(prompt, (t) => send(e, "video:progress", t));
    const m = /^data:image\/(\w+);base64,(.+)$/s.exec(dataUrl || "");
    if (!m) throw new Error("그림을 받지 못했습니다.");
    const file = path.join(dir || path.join(library.studioRoot(), "영상", "AI 그림"), "assets", `AI그림_${Date.now()}.${m[1] === "jpeg" ? "jpg" : m[1]}`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(m[2], "base64"));
    return (await library.add([file], { source: "ai" }))[0];
  });

  /* ── 공실 (사진·정보) ── 이미 분석해 둔 것이 있으면 그대로, 없으면 공실 분석(사진 내려받기) */
  ipcMain.handle("video:vacancy", async (e, vacancyId) => {
    const blogWriter = require("../blog-writer");
    let a = blogWriter.readJson(path.join(blogWriter.mediaDir(vacancyId), "analysis.json"));
    if (!a) {
      const { analyzeVacancy } = require("../vacancy-capture");
      a = await analyzeVacancy(baseUrl, vacancyId, (t) => send(e, "video:progress", t));
    }
    const photos = (a.media || []).filter((m) => m.kind === "photo" && m.file && fs.existsSync(m.file)).map((m) => m.file);
    const items = await library.add(photos, { source: "vacancy" });
    return { vacancy: a.vacancy, photos: items };
  });

  /* ── 무료 이미지·비디오 ── 서버 검색 → 고르면 PC 프로젝트로 내려받기 (사장님: 로컬에 복사) */
  ipcMain.handle("video:stock-search", (_e, q, type, orientation, page) =>
    server.call(`/api/studio/video/stock?q=${encodeURIComponent(q || "")}&type=${type || "photo"}&orientation=${orientation || ""}&page=${page || 1}`)
  );
  ipcMain.handle("video:stock-get", async (e, dir, item) => {
    const ext = item.kind === "video" ? "mp4" : (/\.(png|webp)(\?|$)/i.exec(item.url) || [0, "jpg"])[1];
    const file = path.join(dir || path.join(library.studioRoot(), "영상", "받은 자료"), "assets", `${String(item.id).replace(/[^\w-]/g, "")}.${ext}`);
    if (!fs.existsSync(file)) {
      send(e, "video:progress", "무료 자료를 PC로 받는 중…");
      await server.download(item.url, file);
    }
    return (await library.add([file], { source: "free", credit: `${item.source} · ${item.credit}` }))[0];
  });

  /* ── 배경 음악 ── 공실뉴스 무료 음악(CC0)을 PC 프로젝트로 받아 둔다 */
  ipcMain.handle("video:music-get", async (_e, dir, rel) => {
    if (!/^bgm\/[\w\/-]+\.mp3$/.test(String(rel))) throw new Error("음악을 찾지 못했습니다.");
    const file = path.join(dir || path.join(library.studioRoot(), "영상", "음악"), "assets", "music", path.basename(rel));
    if (!fs.existsSync(file)) await server.download(`${baseUrl}/reels-assets/${rel}`, file);
    media.allow(file);
    return { file, url: media.urlOf(file) };
  });

  /* ── 굽기 ── */
  ipcMain.handle("video:render", async (e, p, opts) => {
    const id = crypto.randomBytes(4).toString("hex");
    jobs.set(id, false);
    send(e, "video:render-job", id);
    try {
      const r = await render.render(p, opts || {}, (t, f) => send(e, "video:render-progress", t, f), () => jobs.get(id));
      return r;
    } finally {
      jobs.delete(id);
    }
  });
  ipcMain.handle("video:render-cancel", (_e, id) => jobs.set(id, true));
  ipcMain.handle("video:export-audio", (e, p, kind) => render.exportAudio(p, kind, (t, f) => send(e, "video:render-progress", t, f)));
  ipcMain.handle("video:snapshot", async (_e, p, file, at) => {
    const out = path.join(folders.exportDir(p), `${p.name}_화면_${Date.now()}.png`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await render.snapshot(p, media.fileOf(file) || file, at, out);
    shell.showItemInFolder(out);
    return out;
  });

  /* ── 녹화 ── 화면/카메라는 편집 화면이 녹화하고, 조각을 앱이 PC 파일로 쓴다 */
  ipcMain.handle("video:record-sources", async () => {
    // 모니터만 (창 목록은 복잡해서 뺀다) — 실제 놓인 순서대로 왼쪽·오른쪽 모니터
    const list = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 320, height: 180 } });
    const { screen } = require("electron");
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay().id;
    const xOf = (s) => (displays.find((d) => String(d.id) === String(s.display_id)) || { bounds: { x: 0 } }).bounds.x;
    const sorted = [...list].sort((a, b) => xOf(a) - xOf(b));
    const names = sorted.length === 1 ? ["모니터"] : sorted.length === 2 ? ["왼쪽 모니터", "오른쪽 모니터"] : sorted.map((_, i) => `모니터 ${i + 1} (왼쪽부터)`);
    for (const s of list) sourceDisplay.set(s.id, String(s.display_id)); // 작은 녹화 창을 그 모니터에 띄우려고
    return sorted.map((s, i) => ({ id: s.id, name: names[i] + (String(s.display_id) === String(primary) ? " · 주 모니터" : ""), thumb: s.thumbnail.toDataURL() }));
  });
  ipcMain.handle("video:record-choose", (_e, id) => {
    chosenSource = id;
    return true;
  });
  // 저장할 곳 — 기본은 문서\공실뉴스 스튜디오\영상\녹화, 회원이 다른 폴더를 고를 수 있다
  const recDir = () => folders.recordDir(); // 처음 화면 [저장 폴더] (기본: 문서\공실뉴스 스튜디오\영상\녹화)
  ipcMain.handle("video:record-default-dir", () => recDir());
  ipcMain.handle("video:record-pick-dir", async (e, cur) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "녹화 파일을 저장할 폴더", defaultPath: cur || recDir(), properties: ["openDirectory", "createDirectory"] });
    return r.canceled || !r.filePaths.length ? "" : r.filePaths[0];
  });
  ipcMain.handle("video:record-start", (_e, name, opt = {}) => {
    const dir = opt.dir && path.isAbsolute(String(opt.dir)) ? String(opt.dir) : recDir();
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date();
    const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]/g, " ").replace(/\.(mp4|webm)$/i, "").trim();
    const base = safe(opt.fileName) || `${safe(name) || "녹화"}_${d.getMonth() + 1}월${d.getDate()}일 ${d.getHours()}시${String(d.getMinutes()).padStart(2, "0")}분${String(d.getSeconds()).padStart(2, "0")}초`;
    // 같은 이름이 있으면 덮어쓰지 않고 (2), (3)…
    let file = path.join(dir, `${base}.webm`);
    for (let i = 2; fs.existsSync(file) || fs.existsSync(file.replace(/\.webm$/, ".mp4")); i++) file = path.join(dir, `${base} (${i}).webm`);
    const token = crypto.randomBytes(4).toString("hex");
    recs.set(token, { file, fd: fs.openSync(file, "w") });
    return token;
  });
  // 녹화 시작·끝 — 녹화 중에는 큰 창을 내려도 녹화가 멈추지 않게(백그라운드 느려짐 끔), 내리면 작은 막대
  ipcMain.handle("video:record-live", (e, on, startedAt, opt) => {
    if (!on) return endLive(), true;
    const win = winOf(e);
    if (!win || live) return true;
    win.webContents.setBackgroundThrottling(false);
    // 웹 화면이 작은 녹화 창을 직접 띄우면(opt.console) 얇은 막대 대신 — 내렸다·올렸다만 알린다
    const noMini = Boolean(opt && opt.console);
    const tell = (ch) => !win.isDestroyed() && win.webContents.send(ch);
    live = {
      win,
      noMini,
      startedAt: Number(startedAt) || Date.now(),
      onMin: () => (noMini ? tell("video:record-min") : openMini()),
      onRestore: () => (closeMini(), noMini && tell("video:record-restore")),
    };
    win.on("minimize", live.onMin);
    win.on("restore", live.onRestore);
    return true;
  });
  ipcMain.handle("video:record-minimize", (e) => {
    const win = winOf(e);
    if (win) win.minimize();
    return true;
  });
  // 얇은 막대 [크게 보기] — 웹 화면이 작은 창을 맡으면(noMini) 카톡 크기 작은 창으로, 아니면 앱 창
  ipcMain.on("record-mini:expand", () => {
    if (!live) return;
    if (!live.noMini) return showBig(live.win);
    if (mini && !mini.isDestroyed()) setAnchor(mini.getBounds(), "bar");
    closeMini();
    if (!live.win.isDestroyed()) live.win.webContents.send("video:record-mini-expand");
  });
  // 작은 창 [더 작게 하기] — 맨 처음의 얇은 막대 (● 녹화 중 · 크게 보기 · 녹화 끝내기)
  ipcMain.handle("video:record-tiny", () => {
    // 작은 창이 있던 자리 아래쪽에 얇은 막대 (작은 창은 웹 화면이 그 뒤에 닫는다)
    const at = consoleWin && !consoleWin.isDestroyed() ? consoleWin.getBounds() : null;
    openMini(at);
    return true;
  });
  // 녹화 조정실 창 — 옮기기·투명도·작게·크게 (앱 0.1.8부터)
  let consoleFrom = null;
  ipcMain.handle("video:console", (_e, act, a, b, c, d, e) => {
    const w = consoleWin && !consoleWin.isDestroyed() ? consoleWin : null;
    if (!w) return false;
    if (act === "drag-start") consoleFrom = w.isMaximized() ? null : w.getPosition();
    else if (act === "drag" && consoleFrom) w.setPosition(Math.round(consoleFrom[0] + a), Math.round(consoleFrom[1] + b));
    else if (act === "opacity") w.setOpacity(Math.min(1, Math.max(0.3, Number(a) || 1)));
    else if (act === "min") w.minimize();
    else if (act === "max") {
      if (w.isMaximized()) w.unmaximize();
      else w.maximize();
      return w.isMaximized();
    } else if (act === "place") {
      // 녹화하기 창 — 크기는 앱 안에서 보이던 그대로(모양이 바뀌지 않게). 자리는
      //  1) 끌어 옮겨 둔 자리  2) 모니터가 두 대면 녹화하지 않는 모니터 가운데  3) 앱 안에서 보이던 자리 그대로
      lastCamOnly = Boolean(e);
      const width = Math.round(c), height = Math.round(d);
      // 0) 작은 창 [크게 보기]로 왔으면 — 작은 창이 있던 모니터·자리에 (가운데 맞춤, 위는 작은 창 위쪽)
      const ab = popMini && !popMini.isDestroyed() ? popMini.getBounds() : null;
      const mp = ab ? null : memPlace("console", lastCamOnly);
      const od = ab ? null : otherDisplay(lastCamOnly);
      if (ab) {
        const ad = screen.getDisplayMatching(ab);
        w.setBounds({ width, height, ...clampTo(ad, ab.x + ab.width / 2 - width / 2, ab.y, width, height) });
      } else if (mp) w.setBounds({ width, height, ...clampTo(mp.d, mp.m.x, mp.m.y, width, height) });
      else if (od) {
        const wa = od.workArea;
        w.setBounds({ width, height, ...clampTo(od, wa.x + (wa.width - width) / 2, wa.y + (wa.height - height) / 2, width, height) });
      } else {
        const m = consoleMain && !consoleMain.isDestroyed() ? consoleMain.getContentBounds() : { x: 0, y: 0 };
        w.setBounds({ x: Math.round(m.x + a), y: Math.round(m.y + b), width, height });
      }
    } else if (act === "big") {
      if (live) showBig(live.win); // [크게 보기] — 스튜디오 창 다시
    } else if (act === "show") {
      if (w.isMinimized()) w.restore();
      w.show();
      w.focus();
    }
    return true;
  });
  // 프롬프터 (앱 0.1.8부터)
  ipcMain.handle("video:prompter-open", async (e, opts) => {
    prompterOwner = e.sender;
    await openPrompter(winOf(e), opts);
    return true;
  });
  ipcMain.handle("video:prompter-close", () => (closePrompter(), true));
  ipcMain.handle("prompter:init", () => prompterOpts);
  ipcMain.on("prompter:close", () => closePrompter());
  let prompterFrom = null;
  ipcMain.on("prompter:resize-start", () => (prompterFrom = prompter && !prompter.isDestroyed() && !prompter.isMaximized() ? prompter.getBounds() : null));
  ipcMain.on("prompter:resize", (_e, dw, dh) => {
    if (!prompterFrom || !prompter || prompter.isDestroyed()) return;
    prompter.setBounds({ ...prompterFrom, width: Math.max(420, Math.round(prompterFrom.width + dw)), height: Math.max(200, Math.round(prompterFrom.height + dh)) });
  });
  ipcMain.on("prompter:min", () => prompter && !prompter.isDestroyed() && prompter.minimize());
  ipcMain.handle("prompter:max", () => {
    if (!prompter || prompter.isDestroyed()) return false;
    if (prompter.isMaximized()) prompter.unmaximize();
    else prompter.maximize();
    return prompter.isMaximized();
  });
  // 녹화 창 [프롬프터 보이기] — 작게 했거나 다른 창 뒤에 있으면 다시 앞으로
  ipcMain.handle("video:prompter-show", () => {
    if (!prompter || prompter.isDestroyed()) return false;
    if (prompter.isMinimized()) prompter.restore();
    prompter.showInactive();
    return true;
  });
  ipcMain.on("prompter:prefs", (_e, o) => {
    if (prompterOwner && !prompterOwner.isDestroyed()) prompterOwner.send("video:prompter-prefs", o);
  });
  let dragFrom = null;
  ipcMain.on("prompter:drag-start", () => (dragFrom = prompter && !prompter.isDestroyed() && !prompter.isMaximized() ? prompter.getPosition() : null));
  ipcMain.on("prompter:drag", (_e, dx, dy) => {
    if (dragFrom && prompter && !prompter.isDestroyed()) prompter.setPosition(Math.round(dragFrom[0] + dx), Math.round(dragFrom[1] + dy));
  });
  ipcMain.on("record-mini:stop", () => {
    if (!live || live.win.isDestroyed()) return closeMini();
    live.win.webContents.send("video:record-mini-stop");
    showBig(live.win);
  });
  ipcMain.handle("video:record-chunk", (_e, token, buf) => {
    const r = recs.get(token);
    if (r) fs.writeSync(r.fd, Buffer.from(buf));
    return true;
  });
  ipcMain.handle("video:record-stop", async (e, token) => {
    const r = recs.get(token);
    if (!r) throw new Error("녹화 파일을 찾지 못했습니다.");
    fs.closeSync(r.fd);
    recs.delete(token);
    // webm → mp4 (어디서나 열리게). 길이 정보가 없는 webm 도 고쳐진다
    send(e, "video:progress", "녹화 파일을 정리하는 중…");
    const mp4 = r.file.replace(/\.webm$/, ".mp4");
    const enc = await ff.encoder();
    try {
      await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", r.file, "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-r", "30", ...enc.args("fast"), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", mp4]);
      fs.rmSync(r.file, { force: true });
    } catch (err) {
      log.warn(`[녹화] mp4 변환 실패: ${err.message} (webm ${fs.existsSync(r.file) ? fs.statSync(r.file).size : 0}바이트)`);
      // webm 이라도 읽히면 그걸로, 깨졌으면 알아듣게 알린다 (조각 순서가 뒤바뀌면 머리말이 없어 못 읽는다)
      const ok = await ff.probe(r.file).then((i) => i && i.duration > 0).catch(() => false);
      if (!ok) throw new Error("녹화한 파일을 읽지 못했어요. 다시 녹화해 주세요. (녹화가 너무 짧았거나 파일이 깨졌어요)");
      return (await library.add([r.file], { source: "record" }))[0];
    }
    return (await library.add([mp4], { source: "record" }))[0];
  });

  /* ── 폴더·파일 열기 ── */
  ipcMain.handle("video:show-file", (_e, file) => shell.showItemInFolder(media.fileOf(file) || file));
  // 윈도우 카메라·마이크 권한 화면 (녹화 창 — 카메라 사용이 꺼져 있을 때)
  ipcMain.handle("video:open-settings", (_e, what) => shell.openExternal(what === "microphone" ? "ms-settings:privacy-microphone" : "ms-settings:privacy-webcam"));
  // 윈도우 카메라·마이크 장치 설정 (녹화 창 [설정] 톱니바퀴 — 밝기·대비, 쓸 장치, 입력 크기·마이크 테스트)
  ipcMain.handle("video:open-device-settings", (_e, what) => shell.openExternal(what === "microphone" ? "ms-settings:sound" : "ms-settings:camera"));
  ipcMain.handle("video:open-path", (_e, p) => shell.openPath(media.fileOf(p) || p));
}

/** 화면 녹화 허용 — 편집 화면이 고른 화면(없으면 첫 화면)을 준다. 카메라·마이크 권한도 허용 */
function setupCapture() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, callback) => {
    const list = await desktopCapturer.getSources({ types: ["screen", "window"] });
    const src = list.find((s) => s.id === chosenSource) || list[0];
    callback({ video: src, audio: "loopback" });
  });
  const prev = session.defaultSession.permissionRequestHandler;
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => {
    if (permission === "media" || permission === "display-capture") return cb(true);
    if (typeof prev === "function") return prev(wc, permission, cb, details);
    cb(true);
  });
}

/** 앱 창 X — 저장 안 한 내용이 있으면 true (main.js 가 닫기를 멈추고 편집 화면에 묻게 한다) */
const wantsAsk = () => dirty && !closing;
/** F5·창 이동 때 앱이 직접 — 저장하고 나가기 / 저장 안 함 (작업 폴더는 자동 저장으로 최신이다) */
function leave(save) {
  try {
    if (save) project.saveWork(dirtyWork.dir, dirtyWork.file);
    else project.discardWork(dirtyWork.dir, dirtyWork.file);
  } catch (e) {
    log.warn(`[.gss] 나갈 때 ${save ? "저장" : "버리기"} 실패: ${e.message}`);
  }
  dirty = false;
}
module.exports = { register, setupCapture, openFile, wantsAsk, leave, consoleOptions, setConsole };
