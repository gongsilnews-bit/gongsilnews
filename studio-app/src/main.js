// 공실뉴스 스튜디오 - Electron 메인 프로세스
// 앱 창은 공실뉴스 중개사 관리자 화면(/realty_admin)을 그대로 불러온다.
// 로그인은 "클릭 한 번 연결": 크롬의 /studio/connect → gongsilstudio://connect?code=… → 앱 창의 /studio/callback
const { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const { autoUpdater } = require("electron-updater");

const BASE_URL = (process.env.STUDIO_BASE_URL || "https://www.gongsilnews.com").replace(/\/$/, "");
const BASE_ORIGIN = new URL(BASE_URL).origin;
const PROTOCOL = "gongsilstudio";
// 앱 창 안에서 띄워도 되는 팝업 (주소 검색 등). 그 외 다른 사이트는 평소 브라우저로 연다.
const IN_APP_POPUP_HOSTS = [/(^|\.)daum\.net$/, /(^|\.)daumcdn\.net$/, /(^|\.)kakao\.com$/];

log.initialize();
log.transports.file.level = "info";

let mainWindow = null;
let pendingDeepLink = null;

/* ───────── 한 번만 실행 + gongsilstudio:// 주소 받기 ───────── */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = findDeepLink(argv);
    if (url) handleDeepLink(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

if (app.isPackaged) {
  app.setAsDefaultProtocolClient(PROTOCOL);
} else {
  // 개발 중(npm start)에는 electron.exe + 앱 폴더로 등록해야 주소를 받을 수 있다
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1] || ".")]);
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

/* ───────── FFmpeg ───────── */

function ffmpegPath() {
  const dir = app.isPackaged ? path.join(process.resourcesPath, "ffmpeg") : path.join(__dirname, "..", "vendor", "ffmpeg");
  const exe = path.join(dir, "ffmpeg.exe");
  return fs.existsSync(exe) ? exe : null;
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
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 640,
    title: `공실뉴스 스튜디오 v${app.getVersion()}`,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#f6f8fa",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 웹 화면 제목 대신 앱 이름과 버전을 항상 보여 준다
  mainWindow.on("page-title-updated", (e) => e.preventDefault());

  // 로그인이 풀려 /login 으로 가면 앱 창 로그인 대신 "크롬에서 연결하기" 화면을 보여 준다
  // (구글은 앱 창 안의 구글 로그인을 막는다)
  mainWindow.webContents.on("did-navigate", (_e, url) => {
    if (isPathOf(url, "/login") || isPathOf(url, "/m/login")) showConnectScreen();
  });

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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === "about:blank" || url.startsWith(BASE_ORIGIN)) return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    try {
      if (IN_APP_POPUP_HOSTS.some((re) => re.test(new URL(url).hostname))) return { action: "allow" };
    } catch {}
    shell.openExternal(url);
    return { action: "deny" };
  });

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

function buildMenu() {
  const template = [
    {
      label: "보기",
      submenu: [
        { label: "새로고침", accelerator: "F5", role: "reload" },
        { label: "관리자 화면으로", accelerator: "Alt+Home", click: () => mainWindow && mainWindow.loadURL(`${BASE_URL}/realty_admin`) },
        { type: "separator" },
        { label: "확대", role: "zoomIn" },
        { label: "축소", role: "zoomOut" },
        { label: "원래 크기", role: "resetZoom" },
        { type: "separator" },
        { label: "개발자 도구", accelerator: "Ctrl+Shift+I", role: "toggleDevTools" },
      ],
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

autoUpdater.on("update-downloaded", async (info) => {
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
ipcMain.handle("studio:info", () => ({ version: app.getVersion(), baseUrl: BASE_URL, ffmpeg: Boolean(ffmpegPath()) }));

app.whenReady().then(async () => {
  const url = findDeepLink(process.argv);
  if (url) pendingDeepLink = url;
  buildMenu();
  await createWindow();
  log.info(`[시작] v${app.getVersion()} ${BASE_URL} ffmpeg=${ffmpegPath() || "없음"}`);
  checkForUpdates();
});

app.on("window-all-closed", () => app.quit());
