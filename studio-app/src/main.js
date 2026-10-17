// 공실뉴스 스튜디오 - Electron 메인 프로세스
// 앱 창은 공실뉴스 중개사 관리자 화면(/realty_admin)을 그대로 불러온다.
// 로그인은 "클릭 한 번 연결": 크롬의 /studio/connect → gongsilstudio://connect?code=… → 앱 창의 /studio/callback
const { app, BrowserWindow, Menu, dialog, ipcMain, nativeImage, screen, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const { autoUpdater } = require("electron-updater");
const aiConnect = require("./ai-connect");
const { findBrowser } = require("./studio-chrome");
const { ffmpegPath } = require("./paths");
const { analyzeVacancy } = require("./vacancy-capture");
const blogWriter = require("./blog-writer");
const naverWrite = require("./naver-write");
const snsWriter = require("./sns-writer");
const columnWriter = require("./column-writer");
const youtubeWriter = require("./youtube-writer");
const simWriter = require("./sim-writer");
const marketingWriter = require("./marketing-writer");
// 영상 편집기 (동영상제작) — PC 파일 재생 주소는 앱 준비 전에 등록해야 한다
const videoMedia = require("./video/media");
const videoIpc = require("./video/ipc");
const aiBusy = require("./ai-busy");
videoMedia.registerScheme();

const BASE_URL = (process.env.STUDIO_BASE_URL || "https://www.gongsilnews.com").replace(/\/$/, "");
const BASE_ORIGIN = new URL(BASE_URL).origin;

// 확장 프롬프트·채우기 파일은 EXE 에 넣지 않고 서버에서 받아 메모리에만 둔다 (ext.js, 2026-10-15 보안 결정).
// 그 파일을 쓰는 기능(IPC)은 먼저 받아 둔 것을 기다린다. 아래 목록은 파일이 필요 없는 기능이다.
const ext = require("./ext");
ext.configure(BASE_URL);
const NO_EXT = new Set([
  "studio:open-connect", "studio:open-ai-window", "studio:open-external", "studio:info", "studio:check-update",
  "studio:ai-list", "studio:ai-check", "studio:ai-finish-login", "studio:ai-connect", "studio:ai-open", "studio:ai-set-writer", "studio:ai-writer", "studio:ai-set-imager", "studio:ai-imager",
  "studio:vacancy-load", "studio:vacancy-analyze", "studio:naver-open-blog", "studio:column-open-news",
  "studio:save-file", "studio:open-out-folder",
]);
const ipcHandle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, fn) =>
  // 영상 편집기는 PC에서만 일하므로(인터넷 없어도) 회원 AI 쓰는 것만 글쓰기 설정을 기다린다
  ipcHandle(channel, NO_EXT.has(channel) || (channel.startsWith("video:") && !channel.startsWith("video:ai-")) ? fn : async (...args) => {
    await ext.ensure();
    return fn(...args);
  });
const PROTOCOL = "gongsilstudio";
// 앱 창 안에서 띄워도 되는 팝업 (주소 검색 등). 그 외 다른 사이트는 평소 브라우저로 연다.
const IN_APP_POPUP_HOSTS = [/(^|\.)daum\.net$/, /(^|\.)daumcdn\.net$/, /(^|\.)kakao\.com$/];

// 개발 실행은 설치판과 저장 공간(로그인·전용 크롬)과 "한 번만 실행"이 겹치지 않게 이름을 달리 한다
if (!app.isPackaged) {
  // STUDIO_INSTANCE 를 주면 개발판을 하나 더 따로 띄울 수 있다 (자동 시험용)
  const devName = `공실뉴스 스튜디오 (개발${process.env.STUDIO_INSTANCE ? ` ${process.env.STUDIO_INSTANCE}` : ""})`;
  app.setName(devName);
  app.setPath("userData", path.join(app.getPath("appData"), devName));
}

log.initialize();
log.transports.file.level = "info";

let mainWindow = null;
let aiWindow = null;
let pendingDeepLink = null;

/* ───────── 한 번만 실행 + gongsilstudio:// 주소 받기 ───────── */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = findDeepLink(argv);
    if (url) handleDeepLink(url);
    const gssFile = findGss(argv);
    if (gssFile) openGss(gssFile);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

if (app.isPackaged) {
  app.setAsDefaultProtocolClient(PROTOCOL);
}
// 개발 실행(npm start)은 gongsilstudio:// 를 등록하지 않는다. 등록하면 설치판 앱의 연결이 개발판으로 넘어간다.
// 개발판 로그인은 scripts/dev-connect.mjs 가 연결 신호를 실행 인자로 넘긴다.

/** 탐색기에서 두 번 누른 .gss 파일 (실행 인자) */
function findGss(argv) {
  return (argv || []).find((a) => typeof a === "string" && /\.gss$/i.test(a) && fs.existsSync(a)) || null;
}
/** .gss 열기 — 영상 편집기(동영상제작)로 가서 그 파일을 연다 */
async function openGss(file) {
  log.info(`[.gss] 탐색기에서 엶 ${file}`);
  videoIpc.openFile(file, mainWindow);
  if (!mainWindow) return;
  const cur = mainWindow.webContents.getURL();
  if (!/[?&]menu=video/.test(cur) && (await isLoggedIn())) mainWindow.loadURL(`${BASE_URL}/realty_admin?menu=video`);
}

function findDeepLink(argv) {
  return argv.find((a) => typeof a === "string" && a.startsWith(`${PROTOCOL}://`)) || null;
}

function handleDeepLink(url) {
  if (!mainWindow) {
    pendingDeepLink = url;
    return;
  }
  try {
    const u = new URL(url);
    const code = u.searchParams.get("code");
    if (u.hostname === "connect" && code) {
      log.info("[연결] 크롬에서 연결 신호를 받음");
      mainWindow.loadURL(`${BASE_URL}/studio/callback?code=${encodeURIComponent(code)}`);
    }
  } catch (e) {
    log.warn("[연결] 잘못된 주소", url, e);
  }
}

/* ───────── 로그인 상태 ───────── */

async function isLoggedIn() {
  // Supabase 로그인 쿠키: sb-<프로젝트>-auth-token (길면 .0 .1 로 나뉨)
  const cookies = await session.defaultSession.cookies.get({ url: BASE_URL });
  return cookies.some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name) && c.value);
}

function showConnectScreen() {
  mainWindow.loadFile(path.join(__dirname, "connect.html"));
}

function openConnectInBrowser() {
  shell.openExternal(`${BASE_URL}/studio/connect`);
}


/* ───────── 창 ───────── */

function isPathOf(url, pathname) {
  try {
    const u = new URL(url);
    return u.origin === BASE_ORIGIN && (u.pathname === pathname || u.pathname.startsWith(`${pathname}/`));
  } catch {
    return false;
  }
}

async function createWindow() {
  // 화면(작업 표시줄 제외) 안에 들어오게 만들고, 처음엔 최대화해서 연다
  const work = screen.getPrimaryDisplay().workArea;
  mainWindow = new BrowserWindow({
    x: work.x,
    y: work.y,
    width: Math.min(1440, work.width),
    height: Math.min(920, work.height),
    show: false,
    minWidth: 1024,
    minHeight: 640,
    title: `공실뉴스 스튜디오 v${app.getVersion()}`,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    autoHideMenuBar: false, // 메뉴 막대는 아래에서 숨긴다 (Alt 로도 안 나오게 false)
    backgroundColor: "#f6f8fa",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 자동 시험(STUDIO_TEST_OFFSCREEN=1)은 화면 밖에 띄워 사장님 화면을 가리지 않는다
  const offscreen = !app.isPackaged && process.env.STUDIO_TEST_OFFSCREEN === "1";
  if (offscreen) {
    mainWindow.setBounds({ x: -4000, y: 0, width: 1440, height: 920 });
    mainWindow.showInactive();
  }
  mainWindow.once("ready-to-show", () => {
    if (offscreen) return;
    mainWindow.maximize();
    mainWindow.show();
  });
  // 페이지가 늦게 떠도 창은 바로 보이게
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible() && !offscreen) {
      mainWindow.maximize();
      mainWindow.show();
    }
  }, 1500);

  // 웹 화면 제목 대신 앱 이름과 버전을 항상 보여 준다
  mainWindow.on("page-title-updated", (e) => e.preventDefault());

  // 로그인이 풀려 /login 으로 가면 앱 창 로그인 대신 "크롬에서 연결하기" 화면을 보여 준다
  // (구글은 앱 창 안의 구글 로그인을 막는다)
  mainWindow.webContents.on("did-navigate", (_e, url) => {
    if (isPathOf(url, "/login") || isPathOf(url, "/m/login")) showConnectScreen();
    // 관리자 화면이 열리면(로그인 확인됨) 글쓰기 설정을 미리 받아 둔다 — 버튼을 누를 때 기다리지 않게
    else if (isPathOf(url, "/realty_admin")) ext.ensure().catch((e) => log.warn(`[글쓰기 설정] 미리 받기 실패: ${e.message}`));
  });

  // 창 메뉴(보기·AI·계정·도움말)는 보이지 않게 — 사장님: "사실 필요가 없음".
  // 메뉴 자체는 남겨 F5·Ctrl+Shift+I 같은 단축키는 그대로 된다. AI 연결·로그아웃은 웹 화면 버튼으로.
  mainWindow.setMenuBarVisibility(false);

  // 다른 사이트로 넘어가는 링크는 평소 브라우저로
  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith("file://")) return;
    try {
      if (new URL(url).origin !== BASE_ORIGIN) {
        e.preventDefault();
        shell.openExternal(url);
      }
    } catch {}
  });

  mainWindow.webContents.setWindowOpenHandler(({ url, frameName }) => {
    // 영상 녹화 조정실 (OBS 스튜디오 모드처럼) — 테두리 없는 따로 창, 항상 위, 녹화에 안 찍힘 (video/ipc.js 가 맡는다)
    if (url === "about:blank" && String(frameName).startsWith("gsv-console")) return { action: "allow", overrideBrowserWindowOptions: videoIpc.consoleOptions(mainWindow) };
    // 녹화 중 [작게 하기] — 카톡 크기 녹화 창
    if (url === "about:blank" && String(frameName).startsWith("gsv-mini")) return { action: "allow", overrideBrowserWindowOptions: videoIpc.consoleOptions(mainWindow, "mini") };
    if (url === "about:blank" || url.startsWith(BASE_ORIGIN)) return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    try {
      if (IN_APP_POPUP_HOSTS.some((re) => re.test(new URL(url).hostname))) return { action: "allow" };
    } catch {}
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-create-window", (win, { frameName }) => {
    if (/^gsv-(console|mini)/.test(String(frameName))) videoIpc.setConsole(win, mainWindow, String(frameName).startsWith("gsv-mini") ? "mini" : "console");
  });

  // 영상 편집기에 저장 안 한 내용이 있으면 — 닫기를 멈추고 [저장 / 다른 이름으로 / 저장 안 함 / 취소] 를 묻는다
  mainWindow.on("close", (e) => {
    if (!videoIpc.wantsAsk()) return;
    e.preventDefault();
    mainWindow.webContents.send("video:want-close");
  });
  // F5·다른 주소로 이동 — 편집기에 저장 안 한 내용이 있으면 앱이 직접 묻는다 (웹 화면은 나가는 중이라 창을 못 띄움)
  mainWindow.webContents.on("will-prevent-unload", (e) => {
    if (!videoIpc.wantsAsk()) return e.preventDefault(); // 그냥 나간다
    const r = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      buttons: ["저장하고 나가기", "저장 안 함", "취소"],
      defaultId: 0,
      cancelId: 2,
      title: "공실뉴스 스튜디오",
      message: "동영상제작에 저장하지 않은 내용이 있어요.",
      detail: "[저장 안 함]을 누르면 마지막으로 저장한 상태로 돌아가요.",
    });
    if (r === 2) return; // 취소 — 나가지 않는다
    videoIpc.leave(r === 0);
    e.preventDefault(); // 나간다
  });
  aiBusy.setWindow(() => mainWindow);
  aiBusy.attach(mainWindow);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (pendingDeepLink) {
    const url = pendingDeepLink;
    pendingDeepLink = null;
    handleDeepLink(url);
  } else if (await isLoggedIn()) {
    mainWindow.loadURL(`${BASE_URL}/realty_admin`);
  } else {
    showConnectScreen();
  }
}

const { thumbOf } = require("./media-util");

/* ───────── 내 AI 연결 창 ───────── */

function openAiWindow() {
  if (aiWindow) {
    aiWindow.focus();
    return;
  }
  aiWindow = new BrowserWindow({
    width: 520,
    height: 700,
    parent: mainWindow || undefined,
    title: "내 AI 연결",
    autoHideMenuBar: true,
    resizable: false,
    minimizable: false,
    backgroundColor: "#f6f8fa",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  aiWindow.setMenu(null);
  aiWindow.loadFile(path.join(__dirname, "ai.html"));
  aiWindow.on("closed", () => {
    aiWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: "보기",
      submenu: [
        { label: "새로고침", accelerator: "F5", role: "reload" },
        { label: "관리자 화면으로", accelerator: "Alt+Home", click: () => mainWindow && mainWindow.loadURL(`${BASE_URL}/realty_admin`) },
        { label: "내 저장 폴더 열기 (문서\\공실뉴스 스튜디오)", accelerator: "Ctrl+Shift+O", click: () => require("./out-folder").openRoot() },
        { type: "separator" },
        { label: "확대", role: "zoomIn" },
        { label: "축소", role: "zoomOut" },
        { label: "원래 크기", role: "resetZoom" },
        { type: "separator" },
        { label: "개발자 도구", accelerator: "Ctrl+Shift+I", role: "toggleDevTools" },
      ],
    },
    {
      label: "AI",
      submenu: [{ label: "내 AI 연결 (ChatGPT·Claude·Gemini)", click: () => openAiWindow() }],
    },
    {
      label: "계정",
      submenu: [
        {
          label: "연결 끊기 (로그아웃)",
          click: async () => {
            await session.defaultSession.clearStorageData({ origin: BASE_ORIGIN });
            if (mainWindow) showConnectScreen();
          },
        },
      ],
    },
    {
      label: "도움말",
      submenu: [
        { label: "업데이트 확인", click: () => checkForUpdates(true) },
        {
          label: "공실뉴스 스튜디오 정보",
          click: () =>
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "공실뉴스 스튜디오",
              message: `공실뉴스 스튜디오 v${app.getVersion()}`,
              detail: `연결 주소: ${BASE_URL}\nFFmpeg: ${ffmpegPath() ? "설치됨" : "없음"}\n로그: ${log.transports.file.getFile().path}`,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ───────── 자동 업데이트 ───────── */

autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let startupInstalling = false; // 켤 때 업데이트 중 — 아래 [지금 다시 시작] 창을 띄우지 않는다
autoUpdater.on("update-downloaded", async (info) => {
  if (startupInstalling) return;
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: "info",
    buttons: ["지금 다시 시작", "나중에"],
    defaultId: 0,
    title: "업데이트 준비 완료",
    message: `새 버전(v${info.version})이 준비되었습니다.`,
    detail: "지금 다시 시작하면 바로 적용됩니다. [나중에]를 누르면 앱을 닫을 때 적용됩니다.",
  });
  if (response === 0) autoUpdater.quitAndInstall();
});

/**
 * 켤 때 업데이트 — 새 버전이 있으면 묻지 않고 받아서 설치하고 다시 켠다 (아직 작업 전이라 잃을 게 없다).
 * 업데이트 서버가 8초 안에 답이 없거나, 받다가 1분 넘게 멈추면 그냥 지금 버전으로 쓴다 (일을 막지 않게).
 * 쓰는 중에 받은 업데이트는 강제로 다시 켜지 않는다 — 닫을 때 적용 (autoInstallOnAppQuit).
 * 돌려줌: true = 설치하러 끝나는 중 (창을 만들지 않는다)
 */
async function startupUpdate() {
  if (!app.isPackaged) return false;
  autoUpdater.autoDownload = false;
  let result = null;
  try {
    result = await Promise.race([autoUpdater.checkForUpdates(), new Promise((r) => setTimeout(() => r(null), 8000))]);
  } catch (e) {
    log.warn("[업데이트] 켤 때 확인 실패", e && e.message);
  }
  autoUpdater.autoDownload = true;
  if (!result || !result.isUpdateAvailable) return false;
  const ver = (result.updateInfo && result.updateInfo.version) || "";
  log.info(`[업데이트] 켤 때 새 버전 v${ver} — 받아서 설치`);
  const win = new BrowserWindow({ width: 440, height: 160, frame: false, resizable: false, alwaysOnTop: true, backgroundColor: "#16202b", title: "공실뉴스 스튜디오 업데이트", icon: path.join(__dirname, "..", "build", "icon.png"), webPreferences: { sandbox: true } });
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;flex-direction:column;justify-content:center;padding:0 28px;box-sizing:border-box;background:#16202b;color:#fff;font-family:'Malgun Gothic',sans-serif">
<div style="font-size:17px;font-weight:800">공실뉴스 스튜디오 새 버전${ver ? ` v${ver}` : ""}</div>
<div id="t" style="font-size:14px;color:#b6c2cf;margin-top:8px">새 버전을 받는 중… 0%</div>
<div style="height:6px;border-radius:3px;background:#2b3644;margin-top:12px;overflow:hidden"><div id="b" style="height:100%;width:0;background:#3b82f6"></div></div></body>`;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const show = (text, pct) =>
    !win.isDestroyed() && win.webContents.executeJavaScript(`document.getElementById("t").textContent=${JSON.stringify(text)};${typeof pct === "number" ? `document.getElementById("b").style.width="${pct}%"` : ""}`).catch(() => {});
  startupInstalling = true;
  return new Promise((resolve) => {
    let last = Date.now();
    let finished = false;
    const stop = (installing) => {
      if (finished) return;
      finished = true;
      clearInterval(watch);
      autoUpdater.removeListener("download-progress", onProgress);
      autoUpdater.removeListener("update-downloaded", onDone);
      autoUpdater.removeListener("error", onError);
      if (!installing) {
        startupInstalling = false;
        if (!win.isDestroyed()) win.close();
      }
      resolve(installing);
    };
    const onProgress = (p) => {
      last = Date.now();
      const pct = Math.round(p.percent || 0);
      show(`새 버전을 받는 중… ${pct}%`, pct);
      if (!win.isDestroyed()) win.setProgressBar(pct / 100);
    };
    const onDone = () => {
      show("설치하고 다시 켜는 중…", 100);
      stop(true);
      setTimeout(() => autoUpdater.quitAndInstall(true, true), 800); // 조용히 설치하고 바로 다시 켠다
    };
    const onError = (e) => {
      log.warn("[업데이트] 켤 때 받기 실패 — 지금 버전으로", e && e.message);
      stop(false);
    };
    const watch = setInterval(() => {
      if (Date.now() - last > 60000) {
        log.warn("[업데이트] 받기가 1분 넘게 멈춤 — 지금 버전으로 (닫을 때 적용)");
        stop(false);
      }
    }, 5000);
    autoUpdater.on("download-progress", onProgress);
    autoUpdater.once("update-downloaded", onDone);
    autoUpdater.once("error", onError);
    autoUpdater.downloadUpdate().catch(onError);
  });
}

async function checkForUpdates(manual = false) {
  if (!app.isPackaged) {
    if (manual) dialog.showMessageBox(mainWindow, { message: "개발 실행 중에는 업데이트를 확인하지 않습니다." });
    return;
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (manual && (!result || !result.isUpdateAvailable)) {
      dialog.showMessageBox(mainWindow, { message: `최신 버전입니다. (v${app.getVersion()})` });
    }
  } catch (e) {
    log.warn("[업데이트] 확인 실패", e);
    if (manual) dialog.showMessageBox(mainWindow, { type: "warning", message: "업데이트 서버에 연결하지 못했습니다." });
  }
}

/* ───────── 시작 ───────── */

ipcMain.handle("studio:open-connect", () => openConnectInBrowser());
ipcMain.on("studio:base-origin", (e) => {
  e.returnValue = BASE_ORIGIN;
});
ipcMain.handle("studio:open-ai-window", () => openAiWindow());
// 웹 화면이 "평소 브라우저로 열기"를 부탁할 때 (예: 로고 → 공실뉴스 홈). http(s) 주소만 연다
ipcMain.handle("studio:open-external", (_e, url) => {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return;
  // 평소 쓰는 크롬(기본 프로필)에 탭이 아니라 새 창으로 연다. 크롬이 없으면 기본 브라우저로
  const found = findBrowser();
  if (found) {
    const { spawn } = require("child_process");
    spawn(found.exe, ["--new-window", url], { detached: true, stdio: "ignore" }).unref();
  } else {
    shell.openExternal(url);
  }
});
ipcMain.handle("studio:ai-list", () => aiConnect.list());
// 기본 글쓰기 AI — 고르기 · 지금 쓸 AI 이름 (쓰기 단추에 "Gemini로 …" 처럼 보인다)
ipcMain.handle("studio:ai-set-writer", (_e, id) => {
  aiConnect.setWriter(id);
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send("studio:ai-writer-changed");
  return aiConnect.list();
});
ipcMain.handle("studio:ai-set-imager", (_e, id) => {
  aiConnect.setImager(id);
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send("studio:ai-writer-changed");
  return aiConnect.list();
});
ipcMain.handle("studio:ai-imager", () => {
  const ai = require("./ai");
  const id = ai.currentImager();
  return { id, name: ai.nameOf(id) };
});
ipcMain.handle("studio:ai-writer", () => {
  const ai = require("./ai");
  const id = ai.current();
  return { id, name: ai.nameOf(id) };
});
ipcMain.handle("studio:ai-check", (_e, id) => aiConnect.check(id));
ipcMain.handle("studio:ai-finish-login", () => aiConnect.finishLogin());
// [창 열기] — 스튜디오 전용 크롬을 그 AI 사이트로 그냥 열어 본다 (연결 확인 없이, 닫을 때까지 기다리지 않음)
ipcMain.handle("studio:ai-open", (_e, id) => aiConnect.open(id));
ipcMain.handle("studio:blog-styles", (_e, vacancyId) => blogWriter.styles(vacancyId));
ipcMain.handle("studio:naver-designs", () => naverWrite.designs());
ipcMain.handle("studio:sns-channels", () => snsWriter.channelInfo());
ipcMain.handle("studio:sns-get", (_e, vacancyId) => snsWriter.get(vacancyId));
ipcMain.handle("studio:sns-write", (e, opts) => snsWriter.write({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:sns-progress", text)));
ipcMain.handle("studio:sns-save", (_e, opts) => snsWriter.save(opts));
ipcMain.handle("studio:sns-revise", (e, opts) => snsWriter.revise(opts, (text) => e.sender.send("studio:sns-progress", text)));
ipcMain.handle("studio:blog-revise", (e, opts) => blogWriter.revise(opts, (text) => e.sender.send("studio:blog-progress", text)));
ipcMain.handle("studio:sns-export", (_e, opts) => snsWriter.exportChannel(opts));
ipcMain.handle("studio:naver-open-blog", () => naverWrite.openMyBlog());
ipcMain.handle("studio:blog-get", (_e, vacancyId, doc) => blogWriter.get(vacancyId, doc));
ipcMain.handle("studio:article-options", (_e, vacancyId) => blogWriter.articleOptions(vacancyId));
ipcMain.handle("studio:article-write", (e, opts) => blogWriter.writeArticle({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:blog-progress", text)));
ipcMain.handle("studio:article-export", (_e, vacancyId) => blogWriter.exportArticleDraft(vacancyId));
ipcMain.handle("studio:blog-save", (_e, patch) => blogWriter.save(patch));
ipcMain.handle("studio:blog-add-photo", (_e, opts) => blogWriter.addPhoto(opts));
ipcMain.handle("studio:blog-image-styles", (_e, vacancyId) => blogWriter.imageStyles(vacancyId));
// 뉴스칼럼: 소재(뉴스·주제) 정하기
ipcMain.handle("studio:column-fetch-news", (_e, url) => columnWriter.fetchNews(url));
ipcMain.handle("studio:column-open-news", () => columnWriter.openNews());
ipcMain.handle("studio:column-grab-news", () => columnWriter.grabNews());
ipcMain.handle("studio:column-create", (_e, source) => columnWriter.create(source));
ipcMain.handle("studio:column-get", (_e, id) => columnWriter.get(id));
ipcMain.handle("studio:column-list", () => columnWriter.list());
// 인테리어뉴스·리모델링뉴스 시뮬레이션 (유료 전용)
ipcMain.handle("studio:sim-options", (_e, kind) => simWriter.options(kind));
ipcMain.handle("studio:sim-estimate", (_e, kind, costBase, design) => simWriter.estimate(kind, costBase, design));
ipcMain.handle("studio:sim-create", (_e, kind) => simWriter.create(kind));
ipcMain.handle("studio:sim-get", (_e, id) => simWriter.get(id));
ipcMain.handle("studio:sim-list", (_e, kind) => simWriter.list(kind));
ipcMain.handle("studio:sim-use-vacancy", (e, opts) => simWriter.useVacancy({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:sim-progress", text)));
ipcMain.handle("studio:sim-add-photos", (_e, opts) => simWriter.addPhotos(opts));
ipcMain.handle("studio:sim-update", (_e, opts) => simWriter.update(opts));
ipcMain.handle("studio:sim-export", (_e, opts) => simWriter.exportResult(opts));
ipcMain.handle("studio:sim-run", (e, id) => simWriter.run({ id, baseUrl: BASE_URL }, (text) => e.sender.send("studio:sim-progress", text)));
// 공실마케팅 AI 채우기 (매물보고서·유리창홍보지 — 도구가 앱 화면 안에서 부른다)
// 홍보지·매물보고서 [이미지 내보내기] — 저장 창 없이 문서\공실뉴스 스튜디오\<매물>\<홍보지|매물보고서>\ 에 (out-folder.js)
ipcMain.handle("studio:save-file", (_e, opts) => require("./out-folder").saveFile(opts));
ipcMain.handle("studio:open-out-folder", () => require("./out-folder").openRoot());
ipcMain.handle("studio:marketing-fill", (e, opts) => marketingWriter.fill({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:marketing-progress", text)));
// 유튜브 대본
ipcMain.handle("studio:youtube-options", (_e, id) => youtubeWriter.options(id));
ipcMain.handle("studio:youtube-get", (_e, id) => youtubeWriter.get(id));
ipcMain.handle("studio:youtube-write", (e, opts) => youtubeWriter.write({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:youtube-progress", text)));
ipcMain.handle("studio:youtube-revise", (e, opts) => youtubeWriter.revise(opts, (text) => e.sender.send("studio:youtube-progress", text)));
ipcMain.handle("studio:youtube-save", (_e, opts) => youtubeWriter.save(opts));
ipcMain.handle("studio:youtube-export", (_e, id) => youtubeWriter.exportText(id));
ipcMain.handle("studio:blog-make-image", (e, opts) => blogWriter.makeImage({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:blog-progress", text)));
ipcMain.handle("studio:naver-fill", (e, opts) =>
  naverWrite.fillNaver({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:naver-progress", text))
);
ipcMain.handle("studio:blog-write", (e, opts) => blogWriter.write({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:blog-progress", text)));
// 웹 화면은 PC 파일을 직접 못 읽으므로 작은 미리보기만 보낸다
const analysisForWeb = (r) =>
  r && {
    vacancyId: r.vacancyId,
    vacancy: r.vacancy,
    failures: r.failures || [],
    media: (r.media || []).map((m) => ({ kind: m.kind, caption: m.caption, thumb: thumbOf(m.file) })),
  };
// 다른 메뉴에 갔다 와도 이어서 보이게: 저장된 분석 결과를 다시 찍지 않고 그대로 돌려준다
ipcMain.handle("studio:vacancy-load", (_e, vacancyId) => analysisForWeb(blogWriter.readJson(require("path").join(blogWriter.mediaDir(vacancyId), "analysis.json"))));
ipcMain.handle("studio:vacancy-analyze", async (e, vacancyId) => {
  const r = await analyzeVacancy(BASE_URL, vacancyId, (text) => e.sender.send("studio:vacancy-progress", text));
  return {
    vacancyId: r.vacancyId,
    vacancy: r.vacancy,
    failures: r.failures,
    media: r.media.map((m) => ({ kind: m.kind, caption: m.caption, thumb: thumbOf(m.file) })),
  };
});
ipcMain.handle("studio:ai-connect", (e, id) => aiConnect.connect(id, (text) => e.sender.send("studio:ai-progress", text)));
ipcMain.handle("studio:info", () => ({ version: app.getVersion(), baseUrl: BASE_URL, ffmpeg: Boolean(ffmpegPath()) }));

// 웹 화면이 "스튜디오 앱"임을 알아보도록 브라우저 정보 끝에 영어 이름을 붙인다
app.userAgentFallback = `${app.userAgentFallback} GongsilStudio/${app.getVersion()}`;

app.whenReady().then(async () => {
  videoMedia.handle();
  videoIpc.register(BASE_URL);
  videoIpc.setupCapture();
  const url = findDeepLink(process.argv);
  if (url) pendingDeepLink = url;
  buildMenu();
  // 켤 때 새 버전이 있으면 먼저 업데이트 (설치하러 끝나면 창을 만들지 않는다)
  if (await startupUpdate()) return;
  await createWindow();
  const gssFile = findGss(process.argv);
  if (gssFile) openGss(gssFile);
  log.info(`[시작] v${app.getVersion()} ${BASE_URL} ffmpeg=${ffmpegPath() || "없음"}`);
});
// 웹 화면의 [지금 업데이트] (필수 버전보다 낮을 때)
ipcMain.handle("studio:check-update", () => checkForUpdates(true));

app.on("window-all-closed", () => app.quit());
