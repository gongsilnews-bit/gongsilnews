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
const myvoice = require("./myvoice");
const ink = require("./ink"); // 강의 녹화 판서 · 마우스 강조 (2026-10-24)

let baseUrl = "";
const jobs = new Map(); // 굽기 멈추기
const stockGets = new Map(); // 무료 자료 받는 중 (파일 → 받기)
const recs = new Map(); // 녹화 중 파일
let chosenSource = null; // 화면 녹화로 고른 화면
const sourceDisplay = new Map(); // 화면 id → 모니터 번호
let pendingFile = ""; // 탐색기에서 두 번 눌러 연 .gss
let lastExportDir = ""; // [내보내기]에서 마지막으로 고른 폴더 (앱을 켠 동안)
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
  ink.close(); // 판서 판·도구 막대도 닫는다
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
  ink.register();
  ink.setControls(() => [mini, consoleWin, popMini, prompter]); // 판서 중에도 [녹화 끝내기]·프롬프터를 누를 수 있게 판 위로
  try { folders.ensure(); } catch {} // 07 녹화파일\강의영상 · 08 AI생성물\AI보이스 폴더
  server.configure(base);

  /* ── 라이브러리 ── */
  ipcMain.handle("video:lib-list", (_e, opts) => library.list(opts || {}));
  ipcMain.handle("video:lib-pick", async (e, { kinds = "media", source = "" } = {}) => {
    const filters = kinds === "audio"
      ? [{ name: "소리", extensions: ["mp3", "wav", "m4a", "aac", "ogg", "flac"] }]
      : [{ name: "사진·영상", extensions: ["mp4", "mov", "m4v", "webm", "mkv", "avi", "wmv", "jpg", "jpeg", "png", "webp", "gif", "heic"] }];
    const r = await dialog.showOpenDialog(winOf(e), { title: "PC에서 불러오기", properties: ["openFile", "multiSelections"], filters });
    if (r.canceled || !r.filePaths.length) return [];
    if (kinds === "audio") return library.add(r.filePaths, { source: source === "sfx" ? "sfx" : "local", allowAudio: true }); // 내 음악(또는 내 효과음) 목록에 남긴다
    return library.add(r.filePaths, { source: "local" });
  });
  ipcMain.handle("video:lib-fav", (_e, id, fav) => library.setFav(id, fav));
  // 내 폴더 (이름표) — 2026-10-22
  ipcMain.handle("video:lib-tags", () => library.tagList());
  ipcMain.handle("video:lib-tag-add", (_e, name) => library.tagAdd(name));
  ipcMain.handle("video:lib-tag-rename", (_e, id, name) => library.tagRename(id, name));
  ipcMain.handle("video:lib-tag-remove", (_e, id) => library.tagRemove(id));
  ipcMain.handle("video:lib-tag-set", (_e, ids, tag, on) => library.tagSet(ids, tag, on));
  // 무료 음악 사이트(픽사베이·유튜브 오디오 보관함)에서 받은 곡 — 다운로드 폴더에서 since 이후 받은 소리 파일 (2026-10-19 사장님)
  const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
  const dlDir = () => require("electron").app.getPath("downloads");
  ipcMain.handle("video:lib-downloads-audio", (_e, since) => {
    try {
      return fs.readdirSync(dlDir())
        .filter((n) => AUDIO_EXT.test(n))
        .map((n) => {
          const f = path.join(dlDir(), n);
          const st = fs.statSync(f);
          return { path: f, name: n, at: st.mtimeMs, size: st.size };
        })
        .filter((x) => x.at >= (Number(since) || 0) - 5000 && x.size > 1000)
        .sort((a, b) => b.at - a.at)
        .slice(0, 10);
    } catch {
      return [];
    }
  });
  // 다운로드 폴더의 곡을 내 음악에 넣기 — 다운로드 폴더 안 소리 파일만
  ipcMain.handle("video:lib-add-downloads", (_e, files, source) => {
    const root = path.resolve(dlDir()).toLowerCase() + path.sep;
    const ok = (files || []).map((f) => path.resolve(String(f))).filter((f) => f.toLowerCase().startsWith(root) && AUDIO_EXT.test(f) && fs.existsSync(f));
    return ok.length ? library.add(ok, { source: source === "sfx" ? "sfx" : "local", allowAudio: true }) : [];
  });
  // 애니메이션 칸 그림 (스티커·사진 올리기 움직임) — 굽기 전에 편집 화면이 그려 보낸다. start 0 이면 폴더를 비우고 새로
  ipcMain.handle("video:anim-frames", (_e, dir, key, start, urls) => {
    const safe = String(key || "a").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80) || "a";
    const out = path.join(dir || require("../studio-root").dir("vid"), "anim", safe);
    if (!start) fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    (urls || []).forEach((u, i) => {
      const m = /^data:image\/png;base64,(.+)$/s.exec(String(u || ""));
      if (m) fs.writeFileSync(path.join(out, `${String((start || 0) + i).padStart(5, "0")}.png`), Buffer.from(m[1], "base64"));
    });
    return out;
  });
  // 편집기에서 그린 그림(스티커 등, PNG data URL) → 프로젝트 assets 에 저장하고 내 자료에 담기
  ipcMain.handle("video:lib-save-image", async (_e, dir, dataUrl, name) => {
    const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/s.exec(String(dataUrl || ""));
    if (!m) throw new Error("그림을 저장하지 못했습니다.");
    const safe = String(name || "그림").replace(/[\/:*?"<>|\s]+/g, "").slice(0, 40) || "그림";
    const file = path.join(dir || folders.received("무료사진"), "assets", `${safe}_${Date.now()}.${m[1] === "jpeg" ? "jpg" : m[1]}`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(m[2], "base64"));
    return (await library.add([file], { source: "sticker" }))[0];
  });
  ipcMain.handle("video:lib-remove", (_e, id) => library.remove(id));
  ipcMain.handle("video:lib-folders", () => library.folders());
  ipcMain.handle("video:lib-add-folder", async (e) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "자동으로 가져올 폴더", properties: ["openDirectory"] });
    if (r.canceled || !r.filePaths[0]) return library.folders();
    return library.addFolder(r.filePaths[0]);
  });
  ipcMain.handle("video:lib-remove-folder", (_e, dir) => library.removeFolder(dir));
  ipcMain.handle("video:font-ensure", (_e, family) => fonts.ensure(family));
  ipcMain.handle("video:lib-ai-folder", () => {
    const d = require("../studio-root").dir("ai", "AI이미지");
    fs.mkdirSync(d, { recursive: true });
    return d;
  });
  ipcMain.handle("video:lib-music-folder", () => {
    fs.mkdirSync(library.musicDir(), { recursive: true });
    return library.musicDir();
  });
  /** 내 효과음 → 프로젝트 폴더 assets/sfx 로 복사 (내 음악과 같은 방식, 2026-10-21) */
  ipcMain.handle("video:sfx-use", async (_e, dir, libId) => {
    const it = library.get(libId);
    if (!it || it.kind !== "audio" || !fs.existsSync(it.path)) throw new Error("효과음 파일을 찾지 못했습니다.");
    const destDir = path.join(dir, "assets", "sfx");
    fs.mkdirSync(destDir, { recursive: true });
    const file = path.join(destDir, `${it.id}${path.extname(it.path)}`);
    if (!fs.existsSync(file)) fs.copyFileSync(it.path, file);
    media.allow(file);
    return { file, url: media.urlOf(file), name: it.name.replace(/.[^.]+$/, "") };
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
    const r = await dialog.showOpenDialog(winOf(e), { title: "프로젝트 열기", defaultPath: folders.projectDir(), properties: ["openFile"], filters: [{ name: "공실마케팅 영상 파일", extensions: ["gss"] }, { name: "예전 폴더 방식 프로젝트 (project.json)", extensions: ["json"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    const f = r.filePaths[0];
    return project.open(f.toLowerCase().endsWith(".gss") ? f : path.dirname(f));
  });
  /* ── 가져오기 — 캡컷 프로젝트 · 클로드(AI)가 만든 공실마케팅 영상 JSON (2026-10-28 사장님) ── */
  ipcMain.handle("video:import-list", () => {
    const im = require("./import");
    return { inboxDir: im.inboxDir(), inbox: im.inboxList(), capcut: im.capcutList() };
  });
  ipcMain.handle("video:import", (e, target) => require("./import").importAny(target, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:import-pick", async (e) => {
    const im = require("./import");
    const r = await dialog.showOpenDialog(winOf(e), { title: "가져올 설계도 고르기 (공실마케팅 영상 JSON · 캡컷 draft_content.json)", defaultPath: im.inboxDir(), properties: ["openFile"], filters: [{ name: "영상 설계도 (JSON)", extensions: ["json"] }] });
    return r.canceled || !r.filePaths[0] ? "" : r.filePaths[0];
  });
  ipcMain.handle("video:import-open-inbox", () => shell.openPath(require("./import").inboxDir()));
  /* 모션그래픽 틀 (2026-10-28 사장님) — 글자는 회원이 쓴 것(texts), 비면 공실 분석 자료. 공실 없이도 된다
   *  사무소 이름은 공실 등록자(중개사무소) — 회원이 지우면(빈 글) 안 나온다 */
  // 공실 등록자(중개사무소) — 사무소 이름 · 표시광고 정보 · 전화 · 공실 주소 (끝 화면 QR)
  const motionOwner = async (vacancyId) => {
    if (!vacancyId) return {};
    try {
      const l = await require("../naver-write").fetchListing(baseUrl, vacancyId);
      const o = (l && l.owner) || {};
      const agency = o.type === "agency";
      const info = agency ? [[o.ceo && `대표 ${o.ceo}`, o.regNo && `등록번호 ${o.regNo}`].filter(Boolean).join(" · "), o.address ? `소재지 ${o.address}` : ""].filter(Boolean).join("\n") : "";
      return { brand: agency ? o.name || "" : "", info, phone: String(o.phone || "").split(",")[0].trim(), link: (l && l.detailUrl) || "" };
    } catch { return {}; }
  };
  const motionBrand = async (vacancyId) => (await motionOwner(vacancyId)).brand || "";
  const motionData = async (o) => {
    const motion = require("./motion");
    const base = (o.vacancyId && motion.vacancyData(o.vacancyId)) || {};
    const tx = o.texts || {};
    const d = { ...base };
    const own = await motionOwner(o.vacancyId);
    Object.assign(d, own);
    for (const k of ["place", "kind", "trade", "price", "brand", "info", "phone", "link", "cta"]) if (typeof tx[k] === "string") d[k] = tx[k];
    if (Array.isArray(tx.chips)) d.chips = tx.chips.filter(Boolean).slice(0, 3);
    // QR — 공실 주소(또는 회원이 쓴 주소)
    if (d.link) { try { d.qr = await require("qrcode").toDataURL(d.link, { margin: 1, width: 480 }); } catch {} }
    return d;
  };
  ipcMain.handle("video:motion-render", async (e, o = {}) => {
    const motion = require("./motion");
    const data = await motionData(o);
    const out = path.join(o.dir || require("electron").app.getPath("temp"), "assets", "motion", `${o.template || "intro"}_${data.no || "인트로"}_${Date.now().toString(36)}.mp4`);
    const file = await motion.render({ template: o.template || "intro", data: { ...data, accent: o.accent || "#E8590C" }, ratio: o.ratio || "9:16", out, font: o.font || "", bg: o.bg || "" }, (t) => send(e, "video:progress", t));
    const [it] = await library.add([file], { source: "motion" });
    return it;
  });
  // 장면에 입히기 — 클립 화면(bg·bgStart)을 배경으로, 클립 길이(seconds)만큼. 글자는 화면이 문장에서 뽑아 보낸다 (data)
  ipcMain.handle("video:motion-scene", async (e, o = {}) => {
    const motion = require("./motion");
    const seconds = Math.max(1.5, Math.min(30, Number(o.seconds) || 4));
    // overlay: 원본 영상은 그대로, 모션만 투명하게 (편집기에서 그래픽처럼 위에 얹는다)
    const out = path.join(o.dir || require("electron").app.getPath("temp"), "assets", "motion", `${o.template}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}${o.overlay ? ".alpha.webm" : ".mp4"}`);
    const file = await motion.render({ template: o.template, data: { ...(o.data || {}), seconds, accent: o.accent || "#E8590C" }, ratio: o.ratio || "9:16", out, font: o.font || "", bg: o.bg || "", bgStart: Number(o.bgStart) || 0, fps: 25, overlay: Boolean(o.overlay) }, (t) => send(e, "video:progress", t));
    const [it] = await library.add([file], { source: "motion" });
    return it;
  });
  // 고르기 창 — 틀·글꼴·배경(공실 사진) 목록 + 글자 처음 값 (공실이 있으면 그 정보)
  ipcMain.handle("video:motion-options", async (_e, vacancyId) => {
    const motion = require("./motion");
    const data = vacancyId ? motion.vacancyData(vacancyId) : null;
    const photos = ((data && data.photos) || []).map((f) => { media.allow(f); return { file: f, url: media.urlOf(f) }; });
    const own = data ? await motionOwner(vacancyId) : {};
    const texts = data ? { place: data.place, kind: data.kind, trade: data.trade, price: data.price, chips: data.chips, brand: own.brand || "", info: own.info || "", phone: own.phone || "", link: own.link || "" } : { place: "", kind: "", trade: "", price: "", chips: [], brand: "", info: "", phone: "", link: "" };
    return { templates: Object.entries(motion.TEMPLATES).map(([id, t]) => ({ id, label: t.label, desc: t.desc, kind: t.kind })), fonts: motion.FONT_CHOICES.map(([family, label]) => ({ family, label })), photos, photo: (data && data.photo) || "", texts };
  });
  // 미리보기 — 작게·빨리 (같은 설정이면 다시 쓰기)
  const motionPreviews = new Map();
  ipcMain.handle("video:motion-preview", async (e, o = {}) => {
    const motion = require("./motion");
    const key = JSON.stringify([o.template, o.vacancyId, o.ratio, o.font, o.bg, o.accent, o.texts]);
    const hit = motionPreviews.get(key);
    if (hit && fs.existsSync(hit)) return { url: media.urlOf(hit) };
    const data = await motionData(o);
    const out = path.join(require("electron").app.getPath("temp"), "gs-motion-preview", `${require("crypto").createHash("sha1").update(key).digest("hex").slice(0, 16)}.mp4`);
    await motion.render({ template: o.template || "intro", data: { ...data, accent: o.accent || "#E8590C" }, ratio: o.ratio || "9:16", out, font: o.font || "", bg: o.bg || "", preview: true }, () => {});
    media.allow(out);
    motionPreviews.set(key, out);
    return { url: media.urlOf(out) };
  });
  // 배경을 내 PC 사진·영상으로
  ipcMain.handle("video:motion-pick-bg", async (e) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "인트로 배경 — 사진이나 영상 고르기", properties: ["openFile"], filters: [{ name: "사진·영상", extensions: ["jpg", "jpeg", "png", "webp", "mp4", "mov", "m4v", "webm"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    const f = r.filePaths[0];
    media.allow(f);
    return { file: f, url: media.urlOf(f), kind: require("./ff").kindOf(f) };
  });
  ipcMain.handle("video:import-text", (e, text) => require("./import").importText(text, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:ai-design-vacancies", () => require("./import").analyzedVacancies());
  ipcMain.handle("video:ai-design", (e, o) => require("./import").aiDesign(o || {}, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:import-guide", () => require("fs").readFileSync(require("path").join(__dirname, "claude-guide.md"), "utf8"));
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
    const r = await dialog.showOpenDialog(winOf(e), { title: "프로젝트 패키지를 만들 곳 (이 안에 '이름_패키지' 폴더가 생겨요)", defaultPath: folders.packageDir(p), properties: ["openDirectory", "createDirectory"] }); // 기본은 그 .gss 가 있는 날짜 폴더 — 패키지 안이면 그 바깥 (2026-10-23)
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
  // 새 프로젝트를 만들 기본 폴더 (만들기 창 [위치]에 보여 준다)
  ipcMain.handle("video:project-dir", () => {
    const d = folders.projectDir();
    try { fs.mkdirSync(d, { recursive: true }); } catch {}
    return d;
  });
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
  ipcMain.handle("video:project-export-text", (_e, p, kind, outFile) => {
    const f = project.exportText(p, kind, outFile);
    shell.showItemInFolder(f);
    return f;
  });

  /* ── AI 목소리 ── */
  ipcMain.handle("video:voice", (_e, dir, text, voiceId, opts) => project.voiceFor({ dir }, text, voiceId, opts || {}));
  // 대본을 텍스트(.txt)로 내려받기 (텍스트로 영상, 2026-10-20 사장님) — 문서\공실마케팅\05 동영상제작\대본 폴더에 바로 저장하고 탐색기로 보여 준다
  //  저장 전에 [다른 이름으로 저장] 창 — 폴더(처음은 대본 폴더)와 파일 이름을 고른다 (2026-10-20 사장님). 취소하면 ""
  ipcMain.handle("video:save-text", async (e, name, text) => {
    const dir = require("../studio-root").dir("vid", "대본");
    fs.mkdirSync(dir, { recursive: true });
    const base = String(name || "대본").replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 60) || "대본";
    let def = path.join(dir, `${base}.txt`);
    for (let n = 2; fs.existsSync(def); n++) def = path.join(dir, `${base}_${n}.txt`);
    const r = await dialog.showSaveDialog(winOf(e), { title: "대본을 텍스트로 저장", defaultPath: def, filters: [{ name: "텍스트 (.txt)", extensions: ["txt"] }] });
    if (r.canceled || !r.filePath) return "";
    const file = /\.txt$/i.test(r.filePath) ? r.filePath : `${r.filePath}.txt`;
    fs.writeFileSync(file, "\ufeff" + String(text || "").replace(/\r?\n/g, "\r\n"), "utf8"); // 메모장에서도 한글이 깨지지 않게
    return file;
  });
  /**
   * 목소리만 파일로 (2026-10-20 사장님: "텍스트로 음성을 만들면 타임라인 말고 mp3 로 저장되는 것도") —
   *  문장마다 AI 목소리를 만들어 (임시 폴더) 순서대로 문장 사이 쉼을 두고 이어 한 파일 (mp3 / wav). 프로젝트는 만들지 않는다
   *  opts: { kind: "mp3"|"wav", outFile, speed, gap }
   */
  ipcMain.handle("video:voice-save", async (e, texts, voiceId, opts = {}) => {
    // opts.files — 이미 만든 문장 목소리 (영상 만들기에서 AI보이스 WAV 자동 저장, 2026-10-20) → 다시 만들지 않고 잇기만
    const pairs = (texts || []).map((t, i) => ({ t: String(t || "").trim(), f: Array.isArray(opts.files) ? opts.files[i] : "" })).filter((x) => x.t && x.t.replace(/\[[^\]]{1,20}\]/g, "").replace(/[\s.,!?…~]/g, "")); // 태그만 있는 줄은 뺀다 (빈 글 오류)
    let list = pairs.map((x) => x.t);
    const made = pairs.map((x) => x.f || "");
    // 미리 듣기 — 처음 세 문장만, 임시 파일로 (2026-10-20 사장님)
    if (opts.preview) {
      list = list.slice(0, 3);
      const td = path.join(require("electron").app.getPath("userData"), "tmp");
      fs.mkdirSync(td, { recursive: true });
      for (const f of fs.readdirSync(td)) if (/^voice_preview_/.test(f)) { try { fs.unlinkSync(path.join(td, f)); } catch {} }
      opts = { ...opts, kind: "mp3", outFile: path.join(td, `voice_preview_${Date.now()}.mp3`), noOverwrite: false };
    }
    const plain = list.map((t) => t.replace(/\[[^\]]{1,20}\]\s*/g, "").trim()); // 쉼 판단은 태그를 뺀 글로
    if (!list.length) throw new Error("읽을 문장이 없어요.");
    const kind = opts.kind === "wav" ? "wav" : "mp3";
    let out = String(opts.outFile || "");
    if (!out) throw new Error("저장할 곳을 골라 주세요.");
    // 기본 AI보이스 폴더면 오늘 날짜 폴더 안으로 (2026-10-23)
    if (!opts.preview) out = path.join(folders.byDate(path.dirname(out)), path.basename(out));
    // 이미 있으면 덮어쓰지 않고 _2, _3 … (AI 보이스 녹음은 저장 창 없이 바로 저장한다)
    if (opts.noOverwrite) {
      const ext = path.extname(out), stem = out.slice(0, out.length - ext.length);
      for (let n = 2; fs.existsSync(out); n++) out = `${stem}_${n}${ext}`;
    }
    const speed = Math.max(0.5, Math.min(2, Number(opts.speed) || 1));
    const gap = Math.max(0, Math.min(2, Number.isFinite(Number(opts.gap)) ? Number(opts.gap) : 0.2));
    const tmp = path.join(require("os").tmpdir(), `gsv-voice-${crypto.randomBytes(4).toString("hex")}`);
    fs.mkdirSync(tmp, { recursive: true });
    try {
      const files = new Array(list.length);
      let k = 0, done = 0;
      const one = async () => {
        while (k < list.length) {
          const i = k++;
          if (made[i] && fs.existsSync(made[i])) { files[i] = made[i]; done++; continue; }
          const r = await project.voiceFor({ dir: tmp }, list[i], voiceId, { emotion: opts.emotion || undefined, prev: list[i - 1] || "", next: list[i + 1] || "" });
          files[i] = r.file;
          done++;
          send(e, "video:render-progress", `AI 목소리를 만드는 중… (${done}/${list.length})`, (done / list.length) * 0.9);
        }
      };
      await Promise.all([one(), one(), one()]);
      send(e, "video:render-progress", "한 파일로 잇는 중…", 0.95);
      const tempo = [];
      let s = speed;
      while (s > 2) { tempo.push("atempo=2"); s /= 2; }
      while (s < 0.5) { tempo.push("atempo=0.5"); s /= 0.5; }
      if (Math.abs(s - 1) > 0.001) tempo.push(`atempo=${s.toFixed(3)}`);
      const args = ["-y", "-hide_banner", "-loglevel", "error"];
      files.forEach((f) => args.push("-i", f));
      const f = files.map((_, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=mono${tempo.length ? "," + tempo.join(",") : ""}${i < files.length - 1 && gap > 0 ? `,apad=pad_dur=${(/[,，、]\s*$/.test(plain[i]) ? Math.min(0.05, gap) : gap).toFixed(3)}` : ""}[a${i}]`);
      f.push(`${files.map((_, i) => `[a${i}]`).join("")}concat=n=${files.length}:v=0:a=1[out]`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await ff.run(ff.ff(), [...args, "-filter_complex", f.join(";"), "-map", "[out]", ...(kind === "mp3" ? ["-c:a", "libmp3lame", "-b:a", "192k"] : ["-c:a", "pcm_s16le"]), out]);
      // 문장 시각을 적어 둔다 → [오디오로 편집하기]가 받아쓰기 대신 정확히 나눈다 (2026-10-20 사장님)
      if (!opts.preview) {
        try {
          const NONVERBAL = /^\[(웃으며|한숨|헛기침|울먹이며|laughs|sighs|clears throat|crying)\]/;
          const sents = [];
          let t = 0;
          for (let i = 0; i < files.length; i++) {
            const d = ((await ff.probe(files[i])).duration || 0) / speed;
            // 문장 앞 웃음·한숨은 단어 앞에서 뺀다 — 태그를 소리로 내는 건 일레븐랩스 v3 뿐
            const v3 = /^el_/.test(String(voiceId)) && /"m":"v3"/.test(String(opts.emotion || ""));
            const lead = v3 && NONVERBAL.test(list[i]) ? (await project.leadNonverbal(files[i])) / speed : 0;
            const ss = t + Math.max(0.08, lead), ee = Math.max(ss + 0.1, t + d - 0.08); // 파일 앞뒤 여유 0.08초
            const text = plain[i];
            const words = project.alignWords(text, ss, ee, [{ s: ss, e: ee }]).map((w) => ({ w: w.w, s: +w.s.toFixed(3), e: +w.e.toFixed(3) }));
            sents.push({ text, s: +t.toFixed(3), e: +(t + d).toFixed(3), words });
            t += d + (i < files.length - 1 ? (/[,，、]\s*$/.test(plain[i]) ? Math.min(0.05, gap) : gap) : 0);
          }
          project.saveVoiceMeta(out, { voiceId, sents });
        } catch (er) { log.warn(`[AI 보이스] 문장 시각 저장 실패: ${er.message}`); }
      }
      const info = await ff.probe(out).catch(() => ({ duration: 0 }));
      media.allow(out); // 다 만든 파일을 앱 안에서 바로 들어 보게 (2026-10-20 사장님)
      return { file: out, seconds: info.duration || 0, url: media.urlOf(out) };
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
  // 타입캐스트 — 회원 자기 키 (이 PC 에만)
  const typecast = require("./typecast");
  ipcMain.handle("video:tc-status", () => typecast.status());
  ipcMain.handle("video:tc-set-key", (_e, k) => typecast.setKey(k));
  ipcMain.handle("video:tc-clear", () => typecast.clear());
  ipcMain.handle("video:tc-voices", (_e, refresh) => typecast.voices(Boolean(refresh)));
  // 일레븐랩스 — 회원 자기 키 (이 PC 에만)
  const eleven = require("./elevenlabs");
  ipcMain.handle("video:el-status", () => eleven.status());
  ipcMain.handle("video:el-set-key", (_e, k) => eleven.setKey(k));
  ipcMain.handle("video:el-clear", () => eleven.clear());
  ipcMain.handle("video:el-voices", (_e, refresh) => eleven.voices(Boolean(refresh)));
  ipcMain.handle("video:el-add-popular", (_e, n) => eleven.addPopularKo(Number(n) || 30)); // 인기 한국어 성우 넣기 (2026-10-30)
  ipcMain.handle("video:el-ranked", (_e, refresh) => eleven.rankedKo(Boolean(refresh))); // 한국어 인기 순위 50
  ipcMain.handle("video:el-add-ranked", (_e, ids) => eleven.addRanked(Array.isArray(ids) ? ids : null));
  // 세부 설정 들어 보기 — 이 설정으로 한 문장 (임시 파일)
  ipcMain.handle("video:el-sample", async (_e, voiceId, emotion, text) => {
    const dir = path.join(require("electron").app.getPath("userData"), "tmp");
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) if (/^el_sample_/.test(f)) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
    const f = path.join(dir, `el_sample_${Date.now()}.wav`);
    await eleven.say(String(text || "안녕하세요. 공실마케팅에서 새 매물을 소개해 드립니다."), f, { voiceId, emotion });
    media.allow(f);
    return media.urlOf(f);
  });
  // 단어마다 목소리가 다른 클립 — 조각을 한 파일로 (0.1.8부터)
  /* 내 목소리 성우 (PC 에서, 무료) — 켜기(내려받기)·등록(직접 녹음 / 파일)·샘플 */
  const myStatus = () => {
    const st = myvoice.status();
    if (st.sample) media.allow(st.sample);
    if (st.ref) media.allow(st.ref);
    const q = `?t=${encodeURIComponent(st.registeredAt)}`;
    return { ...st, sampleUrl: st.sample ? media.urlOf(st.sample) + q : "", refUrl: st.ref ? media.urlOf(st.ref) + q : "" };
  };
  ipcMain.handle("video:myvoice-update", (_e, patch) => {
    myvoice.update(patch || {});
    return myStatus();
  });
  // 받아쓰기 낱말장 — [말한 내용 고치기]로 고친 낱말 (내 PC 바로 + 서버에 모음)
  ipcMain.handle("video:stt-words-add", (_e, pairs) => require("./whisper").addWords(pairs));
  ipcMain.handle("video:myvoice-status", () => myStatus());
  ipcMain.handle("video:myvoice-install", async (e) => {
    await myvoice.install((t, f) => send(e, "video:myvoice-progress", t, f));
    return myStatus();
  });
  ipcMain.handle("video:myvoice-record", async (_e, bytes, text) => {
    await myvoice.register(bytes, text);
    return myStatus();
  });
  ipcMain.handle("video:myvoice-file", async (e) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "내 목소리 녹음 파일 고르기", properties: ["openFile"], filters: [{ name: "녹음·영상", extensions: ["mp3", "m4a", "wav", "aac", "ogg", "flac", "opus", "mp4", "mov", "webm", "mkv"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    await myvoice.registerFile(r.filePaths[0], (t, f) => send(e, "video:myvoice-progress", t, f));
    return myStatus();
  });
  ipcMain.handle("video:myvoice-sample", async () => {
    await myvoice.sample();
    return myStatus();
  });
  ipcMain.handle("video:myvoice-remove", () => {
    myvoice.remove();
    return myStatus();
  });
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
  ipcMain.handle("video:ai-scenes", (e, lines, opts) => vai.scenesFor(lines || [], (t) => send(e, "video:progress", t), opts || {}));
  ipcMain.handle("video:ai-shorts", (e, clips, opts) => vai.shorts(clips || [], opts || {}, (t) => send(e, "video:progress", t)));
  // 대본 + 내 영상 → 문장마다 장면 (items: 내 자료 [{ path, kind, duration }])
  ipcMain.handle("video:ai-footage", (e, lines, items, opts) => vai.matchFootage(lines || [], items || [], (t) => send(e, "video:progress", t), opts || {}));
  // [AI 편집] — 글 AI 의 편집 계획 (화면·화면 글자·자막 강조·화면전환·음악)
  ipcMain.handle("video:ai-edit", (e, lines, items, opts) => vai.aiEdit(lines || [], items || [], opts || {}, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:ai-group", (e, lines) => vai.groupScenes(lines || [], (t) => send(e, "video:progress", t))); // [씬 정리]
  ipcMain.handle("video:ai-clip-prompts", (e, lines, opts) => vai.clipPrompts(lines || [], opts || {}, (t) => send(e, "video:progress", t))); // 이미지 + 동영상 프롬프트 한 번에 (0.1.12)
  ipcMain.handle("video:ai-image-prompts", (e, lines, opts) => vai.imagePrompts(lines || [], opts || {}, (t) => send(e, "video:progress", t))); // 클립별 AI 그림 — 영어 장면 설명
  ipcMain.handle("video:ai-image", async (e, dir, prompt, opts) => {
    const dataUrl = await vai.image(prompt, (t) => send(e, "video:progress", t), opts || {});
    const m = /^data:image\/(\w+);base64,(.+)$/s.exec(dataUrl || "");
    if (!m) throw new Error("그림을 받지 못했습니다.");
    // 만든 AI 그림은 문서공실마케팅AI그림날짜 에 모은다 (2026-10-21 사장님: 따로 모아 볼 폴더가 없었다). 내 자료·프로젝트는 이 파일을 쓴다
    const d = new Date();
    const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; // 20261021
    const file = path.join(require("../studio-root").dir("ai", "AI이미지"), day, `AI그림_${Date.now()}.${m[1] === "jpeg" ? "jpg" : m[1]}`);
    void dir;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(m[2], "base64"));
    return (await library.add([file], { source: "ai" }))[0];
  });

  // AI 영상 — 회원 Gemini API 키 (Gemini Omni Flash), 클립마다 하나씩 (2026-10-21 사장님). 첫 장면 그림이 있으면 그림 → 영상
  //  문서\공실마케팅\08 AI생성물\AI영상\20261021\AI영상_….mp4 에 모은다 (AI그림과 같은 방식)
  ipcMain.handle("video:ai-video", async (e, dir, prompt, opts) => {
    const o = opts || {};
    const image = o.image ? (path.isAbsolute(o.image) ? o.image : path.join(dir || "", o.image)) : "";
    const buf = await require("../ai/video-gen").make({ prompt, image, ratio: o.ratio }, (t) => send(e, "video:progress", t));
    const d = new Date();
    const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const file = path.join(require("../studio-root").dir("ai", "AI영상"), day, `AI영상_${Date.now()}.mp4`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    return (await library.add([file], { source: "ai" }))[0];
  });

  /* ── 공실 (사진·정보) ── 이미 분석해 둔 것이 있으면 그대로, 없으면 공실 분석(사진 내려받기) */
  /* ── 완성 영상 SNS 올리기 (반자동, 2026-10-21) — 글 초안 · 크롬 채우기 · 로그인 ([게시]는 회원이) ── */
  const snsUpload = () => require("../sns-upload");
  ipcMain.handle("video:post-draft", (e, o) => snsUpload().draft(baseUrl, o || {}, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:post-thumbs", (e, o) => snsUpload().thumbs(o || {}, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:post-fill", (e, o) => snsUpload().fill(o || {}, (t) => send(e, "video:progress", t)));
  ipcMain.handle("video:post-login", (_e, ch) => snsUpload().login(ch));
  ipcMain.handle("video:post-finish-login", () => snsUpload().finishLogin());
  ipcMain.handle("video:post-open", (_e, ch, what) => snsUpload().open(ch, what));
  // 내 영상 홍보 — 올린 게시물 주소 (이 PC) · 붙여넣기·고치기 · [링크체크] (2026-10-29)
  ipcMain.handle("video:post-urls", () => snsUpload().postUrls());
  ipcMain.handle("video:post-url-set", (_e, file, ch, url) => snsUpload().savePostUrl(file, ch, url));
  ipcMain.handle("video:post-check", (_e, file) => snsUpload().checkPostUrls(file));
  ipcMain.handle("video:vacancy", async (e, vacancyId) => {
    const blogWriter = require("../blog-writer");
    let a = blogWriter.readJson(path.join(blogWriter.mediaDir(vacancyId), "analysis.json"));
    if (!a) {
      const { analyzeVacancy } = require("../vacancy-capture");
      a = await analyzeVacancy(baseUrl, vacancyId, (t) => send(e, "video:progress", t));
    }
    // 공실 사진 = 분석 내용에서 정리한 순서 그대로 — 등록 사진 + 넣은 AI 사진 (뺀 사진은 hidden 이라 빠진다, 2026-10-28 사장님)
    const isScreen = (m) => ["proof", "map", "roadview"].includes(m.kind);
    const photos = (a.media || []).filter((m) => !isScreen(m) && m.file && fs.existsSync(m.file)).map((m) => m.file);
    const items = await library.add(photos, { source: "vacancy" });
    // 공실 분석 때 찍어 둔 화면 (공실열람 검증·지도·로드뷰) — 영상에서 문장에 맞춰 AI 가 고른다 (2026-10-20 사장님)
    const shotFiles = (a.media || []).filter((m) => isScreen(m) && m.file && fs.existsSync(m.file)).map((m) => m.file);
    const shots = shotFiles.length ? await library.add(shotFiles, { source: "vacancy" }) : [];
    return { vacancy: a.vacancy, photos: items, shots };
  });

  /* ── 기사·보도자료 화면 캡쳐 (2026-10-20 사장님) ──
   *  안 보이는 창(1280×720)에 주소를 열어 제목부터 화면을 찍는다. mode "head" = 제목 부분 1장 (남의 언론사 기사),
   *  "full" = 제목부터 아래로 몇 장 (공실뉴스 기사·보도자료). credit 이 있으면 오른쪽 아래에 "출처: ○○" 를 넣고 찍는다.
   *  문서\공실마케팅\07 녹화파일\캡쳐\<제목> 에 저장하고 [내 자료]에 올린다 */
  ipcMain.handle("video:capture-page", async (e, url, opts = {}) => {
    const href = String(url || "").trim();
    if (!/^https?:\/\//i.test(href)) throw new Error("캡쳐할 주소가 없습니다.");
    const mode = opts.mode === "head" ? "head" : "full";
    const max = mode === "head" ? 1 : Math.min(6, Math.max(1, Number(opts.max) || 4));
    const title = String(opts.title || "").trim();
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const safe = `${ymd} ${(title || new URL(href).hostname).replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 30) || "캡쳐"}`; // "20261021 제목" (2026-10-21 사장님: 연도 네 자리)
    const dir = require("../studio-root").dir("rec", "캡쳐", safe);
    fs.mkdirSync(dir, { recursive: true });
    send(e, "video:progress", "기사 화면을 캡쳐하는 중…");
    const Z = 1.5; // 1920×1080 창에 1.5배로 — 화면은 1280 너비로 그리고 캡쳐는 풀HD 로
    const win = new BrowserWindow({ show: false, width: 1920, height: 1080, useContentSize: true, webPreferences: { partition: "column-news", sandbox: true, zoomFactor: Z } });
    const wc = win.webContents;
    wc.setAudioMuted(true);
    wc.setWindowOpenHandler(() => ({ action: "deny" }));
    win.on("close", (ev) => ev.preventDefault());
    wc.on("will-prevent-unload", (ev) => ev.preventDefault());
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      await Promise.race([
        wc.loadURL(href, { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" }).catch(() => {}),
        wait(20000),
      ]);
      await wait(2500); // 늦게 그려지는 본문·안쪽 창
      await wc.insertCSS("::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}").catch(() => {});
      // 위에 붙는 머리·팝업 숨기기 — 내리면 새로 생기는 머리도 있어 찍을 때마다 (출처 표시는 남긴다)
      const HIDE_FIXED = `(() => { for (const el of document.querySelectorAll("body *")) { if (el.dataset && el.dataset.gsvCredit) continue; const cs = getComputedStyle(el); if (cs.position === "fixed" || cs.position === "sticky") el.style.setProperty("display", "none", "important"); } return 1; })()`;
      // 제목 위치를 찾는다 — head 는 제목이 든 기사 칸만 16:9 로 (옆 칸 남의 사진·광고는 빼고)
      const at = await wc.executeJavaScript(`(() => {
        ${HIDE_FIXED};
        const want = ${JSON.stringify(title.slice(0, 14))};
        let t = null;
        if (want) for (const el of document.querySelectorAll("h1, h2, h3, h4, strong, .title, .tit, .subject, [class*=title], [class*=headline]")) {
          if ((el.innerText || "").replace(/\\s+/g, " ").includes(want) && el.getBoundingClientRect().height > 0) { t = el; break; }
        }
        if (!t) t = document.querySelector("h1, h2");
        const r = t ? t.getBoundingClientRect() : { top: 0, left: 0, width: 0 };
        let c = t;
        while (c && c.parentElement && c.getBoundingClientRect().width < 560) c = c.parentElement;
        let cr = c ? c.getBoundingClientRect() : { left: 0, width: innerWidth };
        let bodyTop = -1; // 본문 칸이 제목보다 좁으면 — 아래로 찍기는 본문 칸부터 (정책브리핑은 거기에 보도자료 원문이 그려진다)
        // 본문 칸이 따로 있으면(제목은 넓고 본문은 좁은 곳 — 정책브리핑 등) 본문 칸 너비로 — 옆 칸(남의 기사 사진)은 빼고
        for (const sel of [".article_body", ".view_cont", "#articleBodyContents", "#dic_area", "article", ".bbs_view", ".board_view", ".view_content", "main"]) {
          const el = document.querySelector(sel);
          const b = el && el.getBoundingClientRect();
          if (b && b.width >= 480 && b.width < cr.width - 40) { cr = { left: b.left, width: b.width }; bodyTop = b.top + scrollY; break; }
        }
        const w = Math.min(innerWidth, Math.floor((innerHeight * 16) / 9), Math.max(560, Math.round(cr.width) + 48)); // 양옆 여백 24, 16:9 가 화면 안에
        const x = Math.max(0, Math.min(innerWidth - w, Math.round(cr.left) - 24));
        return { top: Math.max(0, Math.round(r.top + scrollY - 30)), body: bodyTop < 0 ? -1 : Math.max(0, Math.round(bodyTop - 20)), x, w, h: Math.round(w * 9 / 16), vh: innerHeight };
      })()`, true).catch(() => ({ top: 0, x: 0, w: 1280, h: 720, vh: 720 }));
      // 출처 표시 — 찍을 때마다 잘라 낼 칸의 오른쪽 아래로 옮긴다
      const credit = String(opts.credit || "");
      if (credit) {
        await wc.executeJavaScript(`(() => {
          const d = document.createElement("div");
          d.textContent = ${JSON.stringify(credit)};
          d.dataset.gsvCredit = "1";
          d.id = "gsv-credit";
          d.style.cssText = "position:fixed;transform:translate(-100%,-100%);z-index:2147483647;padding:7px 14px;border-radius:6px;background:rgba(0,0,0,.72);color:#fff;font:700 20px/1.2 sans-serif;white-space:nowrap";
          document.body.appendChild(d);
          return 1;
        })()`, true).catch(() => {});
      }
      const files = [];
      let last = -1;
      const step = Math.max(200, at.h - 40); // 아래로 몇 장 — 조금씩 겹치게
      for (let k = 0; k < max && !win.isDestroyed(); k++) {
        // head: 제목 칸이 첫 화면 안에 다 보이면 내리지 않는다 (내리면 붙는 머리가 생기는 곳이 있어서)
        const want = mode === "head" ? (at.top + at.h <= at.vh ? 0 : at.top) : (at.body >= 0 ? at.body : at.top) + k * step;
        const y = await wc.executeJavaScript(`window.scrollTo(0, ${want}); window.scrollY`, true).catch(() => -1);
        if (y < 0 || y === last) break; // 끝까지 내려갔다
        last = y;
        // 잘라 낼 칸 (기사 칸 16:9) — 페이지 끝이라 덜 내려갔으면 그만큼 아래 칸
        const ry = Math.max(0, Math.min(at.vh - at.h, want - y + (mode === "head" ? at.top - want : 0)));
        await wait(400);
        await wc.executeJavaScript(`(() => { ${HIDE_FIXED}; const d = document.getElementById("gsv-credit"); if (d) { d.style.left = "${at.x + at.w - 16}px"; d.style.top = "${ry + at.h - 16}px"; } return 1; })()`, true).catch(() => {});
        await wait(500);
        await wc.capturePage().catch(() => null); // 안 보이는 창은 첫 장이 예전 화면일 때가 있어 한 번 버린다
        await wc.executeJavaScript(HIDE_FIXED, true).catch(() => {}); // 내린 뒤 늦게 붙는 머리 (정책브리핑)
        await wait(300);
        const img = await wc.capturePage({ x: Math.round(at.x * Z), y: Math.round(ry * Z), width: Math.round(at.w * Z), height: Math.round(at.h * Z) });
        if (img.isEmpty()) continue;
        const file = path.join(dir, `${safe}_${String(k + 1).padStart(2, "0")}.jpg`);
        fs.writeFileSync(file, img.toJPEG(90));
        files.push(file);
      }
      if (!files.length) throw new Error("화면을 캡쳐하지 못했습니다.");
      return await library.add(files, { source: "capture" });
    } finally {
      if (!win.isDestroyed()) win.destroy();
    }
  });

  /* ── 무료 이미지·비디오 ── 서버 검색 → 고르면 PC 프로젝트로 내려받기 (사장님: 로컬에 복사) */
  ipcMain.handle("video:stock-search", (_e, q, type, orientation, page) =>
    server.call(`/api/studio/video/stock?q=${encodeURIComponent(q || "")}&type=${type || "photo"}&orientation=${orientation || ""}&page=${page || 1}`)
  );
  ipcMain.handle("video:stock-get", async (e, dir, item) => {
    // 공실뉴스 드론 — PC에 받지 않는다. 쓸 때마다 서버에서 불러오는 자료로 넣는다 (2026-10-28 사장님)
    if (item && item.source === "공실뉴스") {
      const m = /^gongsil-d-([\w-]+)$/.exec(String(item.id));
      if (!m) throw new Error("공실뉴스 자료를 찾지 못했어요.");
      return library.putRemote({ id: m[1], kind: "drone", name: String(item.credit || "").replace(/^드론 · /, "공실뉴스 드론 · ").slice(0, 80), duration: Number(item.duration) || 0, width: Number(item.width) || 1920, height: Number(item.height) || 1080, credit: "공실뉴스 · 드론" });
    }
    const ext = item.kind === "video" ? "mp4" : (/\.(png|webp)(\?|$)/i.exec(item.url) || [0, "jpg"])[1];
    // 공실뉴스 자료(드론 영상 등, R2) 는 따로 — 09 받은자료\공실뉴스자료 (2026-10-28)
    const sub = item.source === "공실뉴스" ? "공실뉴스자료" : item.kind === "video" ? "무료영상" : "무료사진";
    const file = path.join(dir || folders.received(sub), `${String(item.id).replace(/[^\w-]/g, "")}.${ext}`);
    if (!fs.existsSync(file)) {
      send(e, "video:progress", "무료 자료를 PC로 받는 중…");
      // 같은 자료를 받는 중이면 (⬇·★·고르기를 연달아 누름) 그 받기를 함께 기다린다
      if (!stockGets.has(file)) stockGets.set(file, server.download(item.url, file).finally(() => stockGets.delete(file)));
      await stockGets.get(file);
    }
    return (await library.add([file], { source: "free", credit: `${item.source} · ${item.credit}` }))[0];
  });

  /* ── 배경 음악 ── 공실뉴스 무료 음악(CC0)을 PC 프로젝트로 받아 둔다 */
  ipcMain.handle("video:music-get", async (_e, dir, rel) => {
    if (!/^bgm\/[\w\/-]+\.mp3$/.test(String(rel))) throw new Error("음악을 찾지 못했습니다.");
    const file = path.join(dir || folders.received("BGM"), path.basename(rel));
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
      const r = await render.render(p, opts || {}, (t, f, x) => send(e, "video:render-progress", t, f, x), () => jobs.get(id));
      // 완성 창에서 바로 재생하게 주소도 같이
      try { media.allow(r.file); r.url = media.urlOf(r.file); } catch {}
      return r;
    } finally {
      jobs.delete(id);
    }
  });
  ipcMain.handle("video:render-cancel", (_e, id) => jobs.set(id, true));
  // [내보내기] — 저장할 폴더·파일 이름 고르기 (브루·윈도우 저장 창처럼). 고른 폴더는 다음에도 먼저 보여 준다
  ipcMain.handle("video:export-pick", async (e, p, kind) => {
    const ext = ["mp3", "wav", "srt", "txt"].includes(kind) ? kind : "mp4";
    const NAMES = { mp4: ["영상으로 내보내기 (.mp4)", "MP4 영상"], mp3: ["소리로 내보내기 (.mp3)", "MP3 소리"], wav: ["소리로 내보내기 (.wav)", "WAV 소리 (고음질)"], srt: ["자막으로 내보내기 (.srt)", "SRT 자막"], txt: ["텍스트로 내보내기 (.txt)", "텍스트"] };
    // 목소리만 저장(텍스트로 영상)은 [AI보이스] 폴더(안에서 날짜별)가 기본 (2026-10-20 · 10-23 사장님)
    const dir = p && p.voiceOnly ? (folders.ensure(), folders.byDate(folders.aiAudioDir())) : lastExportDir && fs.existsSync(lastExportDir) && !folders.inFinished(lastExportDir) ? lastExportDir : folders.exportDir(); // 완성영상이면 늘 오늘 날짜 폴더 (2026-10-23)
    const base = String((p && p.name) || "무제").replace(/[\\/:*?"<>|]/g, "_"); // "20261021 제목.mp4" — 프로젝트 이름 그대로 (2026-10-20 사장님)
    let def = path.join(dir, `${base}.${ext}`);
    for (let n = 2; fs.existsSync(def); n++) def = path.join(dir, `${base}_${n}.${ext}`);
    const r = await dialog.showSaveDialog(winOf(e), {
      title: NAMES[ext][0],
      defaultPath: def,
      filters: [{ name: NAMES[ext][1], extensions: [ext] }],
    });
    if (r.canceled || !r.filePath) return null;
    lastExportDir = path.dirname(r.filePath);
    return r.filePath;
  });
  ipcMain.handle("video:export-audio", async (e, p, kind, opts) => {
    const id = crypto.randomBytes(4).toString("hex");
    jobs.set(id, false);
    send(e, "video:render-job", id);
    try {
      return await render.exportAudio(p, kind, (t, f) => send(e, "video:render-progress", t, f), opts || {}, () => jobs.get(id));
    } finally {
      jobs.delete(id);
    }
  });
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
  // 저장할 곳 — 기본은 문서\공실마케팅\07 녹화파일\강의영상 (날짜 폴더 없이), 회원이 다른 폴더를 고를 수 있다
  const recDir = () => folders.recordDir(); // 처음 화면 [저장 폴더] (기본: 문서\공실마케팅\07 녹화파일\강의영상)
  ipcMain.handle("video:record-default-dir", () => recDir());
  ipcMain.handle("video:record-pick-dir", async (e, cur) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "녹화 파일을 저장할 폴더", defaultPath: cur || recDir(), properties: ["openDirectory", "createDirectory"] });
    return r.canceled || !r.filePaths.length ? "" : r.filePaths[0];
  });
  ipcMain.handle("video:record-start", (_e, name, opt = {}) => {
    const dir = folders.byDate(opt.dir && path.isAbsolute(String(opt.dir)) ? String(opt.dir) : recDir()); // 강의영상은 날짜 폴더 없이 바로 (2026-10-24)
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date();
    const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]/g, " ").replace(/\.(mp4|webm)$/i, "").trim();
    // 기본 이름 "20261021 화면 녹화" (2026-10-21 사장님: 앞은 년월일 8자리, 연도 온전하게) — 같은 이름이 있으면 _2, _3…
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const base = safe(opt.fileName) || `${ymd} ${safe(name) || "녹화"}`;
    let file = path.join(dir, `${base}.webm`);
    for (let i = 2; fs.existsSync(file) || fs.existsSync(file.replace(/\.webm$/, ".mp4")); i++) file = path.join(dir, `${base}_${i}.webm`);
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
    // 판서 판 (F9) · 마우스 강조 — 녹화하는 모니터에
    recordDisplay(win).then((d) => live && d && ink.open(d)).catch(() => {});
    return true;
  });
  /* 판서 · 마우스 강조 (2026-10-24 사장님) — 설정 칸과 [판서] 단추가 부른다
     prefs = 설정 읽기 · set-prefs = 설정 저장 · try = 녹화 없이 미리 써 보기(다시 부르면 닫기) · toggle = 판서 켜기·끄기 · state */
  ipcMain.handle("video:ink", async (e, act, arg) => {
    if (act === "prefs") return ink.getPrefs();
    if (act === "set-prefs") return ink.setPrefs(arg);
    if (act === "try") {
      if (ink.isOpen()) return ink.close(), false;
      ink.open(await recordDisplay(winOf(e)));
      return ink.isOpen();
    }
    if (act === "toggle") {
      if (!ink.isOpen()) ink.open(await recordDisplay(winOf(e)));
      return ink.f9();
    }
    return { open: ink.isOpen(), drawing: ink.isDrawing() };
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
