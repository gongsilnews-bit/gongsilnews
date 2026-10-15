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

const BASE_URL = (process.env.STUDIO_BASE_URL || "https://www.gongsilnews.com").replace(/\/$/, "");
const BASE_ORIGIN = new URL(BASE_URL).origin;
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
    autoHideMenuBar: false, // 메뉴(보기·AI·계정·도움말)를 늘 보이게
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
ipcMain.handle("studio:ai-check", (_e, id) => aiConnect.check(id));
ipcMain.handle("studio:ai-finish-login", () => aiConnect.finishLogin());
ipcMain.handle("studio:blog-styles", (_e, vacancyId) => blogWriter.styles(vacancyId));
ipcMain.handle("studio:naver-designs", () => naverWrite.designs());
ipcMain.handle("studio:sns-channels", () => snsWriter.channelInfo());
ipcMain.handle("studio:sns-get", (_e, vacancyId) => snsWriter.get(vacancyId));
ipcMain.handle("studio:sns-write", (e, opts) => snsWriter.write({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:sns-progress", text)));
ipcMain.handle("studio:sns-save", (_e, opts) => snsWriter.save(opts));
ipcMain.handle("studio:sns-export", (_e, opts) => snsWriter.exportChannel(opts));
ipcMain.handle("studio:naver-open-blog", () => naverWrite.openMyBlog());
ipcMain.handle("studio:blog-get", (_e, vacancyId, doc) => blogWriter.get(vacancyId, doc));
ipcMain.handle("studio:article-options", (_e, vacancyId) => blogWriter.articleOptions(vacancyId));
ipcMain.handle("studio:article-write", (e, opts) => blogWriter.writeArticle(opts, (text) => e.sender.send("studio:blog-progress", text)));
ipcMain.handle("studio:article-export", (_e, vacancyId) => blogWriter.exportArticleDraft(vacancyId));
ipcMain.handle("studio:blog-save", (_e, patch) => blogWriter.save(patch));
ipcMain.handle("studio:blog-add-photo", (_e, opts) => blogWriter.addPhoto(opts));
ipcMain.handle("studio:blog-image-styles", () => blogWriter.imageStyles());
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
  const url = findDeepLink(process.argv);
  if (url) pendingDeepLink = url;
  buildMenu();
  await createWindow();
  log.info(`[시작] v${app.getVersion()} ${BASE_URL} ffmpeg=${ffmpegPath() || "없음"}`);
  checkForUpdates();
});

app.on("window-all-closed", () => app.quit());
