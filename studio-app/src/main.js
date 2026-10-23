// 공실스튜디오 - Electron 메인 프로세스
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
const photoIpc = require("./photo/ipc");
const docIpc = require("./doc/ipc");
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
  "studio:ai-set-mode", "studio:ai-get-order", "studio:ai-set-order", "studio:ai-get-method", "studio:ai-set-method", "studio:ai-set-key", "studio:ai-test-key", "studio:ai-clear-key", "studio:ai-usage", "studio:ai-usage-limit", "studio:ai-usage-csv",
  "studio:vacancy-load", "studio:vacancy-analyze", "studio:naver-open-blog", "studio:column-open-news", "studio:column-open-url",
  "studio:save-file", "studio:open-out-folder", "studio:storage-get", "studio:storage-choose", "studio:storage-open", "studio:busy-hold", "studio:busy-text", "studio:busy-release",
  "studio:work-save", "studio:work-status", "studio:work-show", "studio:work-open",
  "studio:report-get", "studio:report-list", "studio:report-save", "studio:report-remove",
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

// 앱 이름을 "공실스튜디오"로 바꿨어도(2026-10-23) 회원 PC 저장 공간(로그인·AI 키·설정·공실 없는 보고서)은 예전 이름 폴더 그대로 —
// 이름을 따라 새 폴더로 가면 전부 사라진 것처럼 보인다 (docs/2026-10-23_naming_plan.md 4-2)
if (app.isPackaged) app.setPath("userData", path.join(app.getPath("appData"), "공실뉴스 스튜디오"));
// 개발 실행은 설치판과 저장 공간(로그인·전용 크롬)과 "한 번만 실행"이 겹치지 않게 이름을 달리 한다
if (!app.isPackaged) {
  // STUDIO_INSTANCE 를 주면 개발판을 하나 더 따로 띄울 수 있다 (자동 시험용)
  const inst = process.env.STUDIO_INSTANCE ? ` ${process.env.STUDIO_INSTANCE}` : "";
  app.setName(`공실스튜디오 (개발${inst})`);
  app.setPath("userData", path.join(app.getPath("appData"), `공실뉴스 스튜디오 (개발${inst})`)); // 저장 공간은 예전 이름 그대로
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
    const gsnFile = findGsn(argv);
    if (gsnFile) openGsn(gsnFile);
    const psdFile = findPsd(argv);
    if (psdFile) openPsd(psdFile);
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
/** 탐색기에서 두 번 누른 작업 파일 — .gsn(뉴스·SNS발행) · .gsm(공실마케팅) (2026-10-23) */
function findGsn(argv) {
  return (argv || []).find((a) => typeof a === "string" && /\.gs[nm]$/i.test(a) && fs.existsSync(a)) || null;
}
/** 탐색기에서 두 번 누른 PSD (포토샵이 없는 PC — 설치할 때 PSD 기본 프로그램이 없으면 공실스튜디오로 연결, build/installer.nsh) */
function findPsd(argv) {
  return (argv || []).find((a) => typeof a === "string" && /\.(psd|psb)$/i.test(a) && fs.existsSync(a)) || null;
}
/** PSD 열기 — 이미지제작으로 가서 그 파일을 연다 (화면이 ?open=<위치> 를 보고 연다) */
async function openPsd(file) {
  log.info(`[PSD] 탐색기에서 엶 ${file}`);
  if (!mainWindow || !(await isLoggedIn())) return;
  mainWindow.loadURL(`${BASE_URL}/realty_admin?menu=photo&open=${encodeURIComponent(file)}`);
}
/** 작업 파일 열기 — 풀고 그 메뉴에서 그 작업을 연다 (화면이 ?gsn=<id> · ?gsm=<id> 를 보고 고른다) */
async function openGsn(file) {
  try {
    const r = await require("./gsn").open(file, mainWindow);
    if (!r || !mainWindow) return;
    if (!(await isLoggedIn())) return;
    if (r.type === "gsm") {
      const cat = r.kind === "report" ? "report" : `${r.simKind}_sim`;
      mainWindow.loadURL(`${BASE_URL}/realty_admin?menu=marketing&gsm=${encodeURIComponent(r.id)}&cat=${cat}`);
    } else mainWindow.loadURL(`${BASE_URL}/realty_admin?menu=sns&gsn=${encodeURIComponent(r.id)}`);
  } catch (e) {
    log.warn(`[.gsn] 열지 못함 ${file}: ${e.message}`);
    dialog.showMessageBox(mainWindow || undefined, { type: "warning", title: "공실스튜디오", message: "작업 파일을 열지 못했어요.", detail: e.message });
  }
}
// 뉴스·SNS발행 [저장하기] · [불러오기] · 저장 상태 (2026-10-23 사장님)
ipcMain.handle("studio:work-save", (_e, id) => require("./gsn").saveNow(id));
ipcMain.handle("studio:work-status", (_e, id) => require("./gsn").status(id));
ipcMain.handle("studio:work-show", (_e, file) => { if (file && fs.existsSync(file)) shell.showItemInFolder(file); });
ipcMain.handle("studio:work-open", async () => {
  const r = await dialog.showOpenDialog(mainWindow || undefined, {
    title: "작업 파일 불러오기",
    defaultPath: require("./studio-root").dir("sns", "프로젝트"),
    filters: [{ name: "공실스튜디오 작업 파일", extensions: ["gsn", "gsm"] }],
    properties: ["openFile"],
  });
  if (r.canceled || !r.filePaths[0]) return false;
  await openGsn(r.filePaths[0]);
  return true;
});
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
    title: `공실스튜디오 v${app.getVersion()}`,
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
    // 이미지 편집에 저장 안 한 파일 — 닫을지 묻는다
    if (photoIpc.dirtyCount() > 0) {
      const r = dialog.showMessageBoxSync(mainWindow, {
        type: "question", buttons: ["저장하지 않고 닫기", "취소"], defaultId: 1, cancelId: 1, title: "공실스튜디오",
        message: `이미지 편집에 저장하지 않은 파일이 ${photoIpc.dirtyCount()}개 있어요.`,
        detail: "[취소]를 누르고 이미지 편집에서 저장(Ctrl+S)한 뒤 닫아 주세요.",
      });
      if (r === 1) return e.preventDefault();
      photoIpc.clearDirty();
    }
    if (docIpc.dirtyCount() > 0) {
      const r = dialog.showMessageBoxSync(mainWindow, {
        type: "question", buttons: ["저장하지 않고 닫기", "취소"], defaultId: 1, cancelId: 1, title: "공실스튜디오",
        message: "문서편집에 저장하지 않은 문서가 있어요.",
        detail: "[취소]를 누르고 문서편집에서 저장(Ctrl+S)한 뒤 닫아 주세요.",
      });
      if (r === 1) return e.preventDefault();
      docIpc.clearDirty();
    }
    if (!videoIpc.wantsAsk()) return;
    e.preventDefault();
    // 묻는 창이 다른 창 뒤에 숨지 않게 — 앱 창을 맨 앞으로
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
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
      title: "공실스튜디오",
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
  // 크게 (2026-10-23 사장님) — 화면 높이에 맞춰, 늘리고 줄일 수 있게
  const wa = screen.getDisplayMatching(mainWindow ? mainWindow.getBounds() : { x: 0, y: 0, width: 1, height: 1 }).workArea;
  aiWindow = new BrowserWindow({
    width: Math.min(1180, wa.width - 40), // 왼쪽 메뉴 + 넓은 오른쪽 (브루 설정창처럼, 2026-10-23)
    height: Math.min(900, wa.height - 30),
    minWidth: 760,
    minHeight: 600,
    parent: mainWindow || undefined,
    title: "AI 설정",
    autoHideMenuBar: true,
    resizable: true,
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
        { label: "내 저장 폴더 열기 (문서\\공실스튜디오)", accelerator: "Ctrl+Shift+O", click: () => require("./out-folder").openRoot() },
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
      submenu: [{ label: "AI 설정 (ChatGPT·Claude·Gemini)", click: () => openAiWindow() }],
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
          label: "공실스튜디오 정보",
          click: () =>
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "공실스튜디오",
              message: `공실스튜디오 v${app.getVersion()}`,
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
  const win = new BrowserWindow({ width: 440, height: 160, frame: false, resizable: false, alwaysOnTop: true, backgroundColor: "#16202b", title: "공실스튜디오 업데이트", icon: path.join(__dirname, "..", "build", "icon.png"), webPreferences: { sandbox: true } });
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;flex-direction:column;justify-content:center;padding:0 28px;box-sizing:border-box;background:#16202b;color:#fff;font-family:'Malgun Gothic',sans-serif">
<div style="font-size:17px;font-weight:800">공실스튜디오 새 버전${ver ? ` v${ver}` : ""}</div>
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
  return { id, name: `${ai.nameOf(id)} ${aiConnect.getMode(id) === "api" ? "API(유료)" : "내 계정(무료)"}` }; // 2026-10-21 사장님: 무료·유료를 확실하게
});
ipcMain.handle("studio:ai-writer", () => {
  const ai = require("./ai");
  const id = ai.current();
  return { id, name: `${ai.nameOf(id)} ${aiConnect.getMode(id) === "api" ? "API(유료)" : "내 계정(무료)"}` };
});
ipcMain.handle("studio:ai-check", (_e, id) => aiConnect.check(id));
// [내 계정으로 | API 키로] · API 키 등록·확인·지우기 — 키는 이 PC 에만 (ai/api.js)
const aiChanged = () => {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send("studio:ai-writer-changed");
  return aiConnect.list();
};
ipcMain.handle("studio:ai-set-mode", (_e, id, mode) => (aiConnect.setMode(id, mode), aiChanged()));
ipcMain.handle("studio:ai-get-order", () => aiConnect.getOrder());
ipcMain.handle("studio:ai-get-method", () => aiConnect.getMethod());
ipcMain.handle("studio:ai-set-method", (_e, m) => (aiConnect.setMethod(m), aiChanged()));
ipcMain.handle("studio:ai-set-order", (_e, o) => (aiConnect.setOrder(o), aiChanged()));
ipcMain.handle("studio:ai-set-key", async (_e, id, key) => (await require("./ai/api").setKey(id, key), aiChanged()));
ipcMain.handle("studio:ai-test-key", async (_e, id) => (await require("./ai/api").test(id), aiConnect.list()));
// API 사용 내역 (2026-10-21 사장님) — 이 PC 기록 · 한도 알림 · CSV
ipcMain.handle("studio:ai-usage", (_e, month) => require("./ai/usage").summary(month));
ipcMain.handle("studio:ai-usage-limit", (_e, v) => require("./ai/usage").setLimit(v));
ipcMain.handle("studio:ai-usage-csv", async (e, month) => {
  const u = require("./ai/usage");
  const m = month || new Date().toISOString().slice(0, 7);
  const r = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), { title: "API 사용 내역 저장", defaultPath: path.join(require("./studio-root").root(), `API 사용 내역 ${m}.csv`), filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (r.canceled || !r.filePath) return "";
  require("fs").writeFileSync(r.filePath, u.csv(m));
  return r.filePath;
});
ipcMain.handle("studio:ai-clear-key", (_e, id) => (require("./ai/api").clear(id), aiChanged()));
ipcMain.handle("studio:ai-finish-login", () => aiConnect.finishLogin());
// [창 열기] — 스튜디오 전용 크롬을 그 AI 사이트로 그냥 열어 본다 (연결 확인 없이, 닫을 때까지 기다리지 않음)
ipcMain.handle("studio:ai-open", (_e, id) => aiConnect.open(id));
ipcMain.handle("studio:blog-styles", (_e, vacancyId) => blogWriter.styles(vacancyId));
ipcMain.handle("studio:naver-designs", () => naverWrite.designs());
ipcMain.handle("studio:sns-channels", () => snsWriter.channelInfo());
ipcMain.handle("studio:sns-get", (_e, vacancyId) => snsWriter.get(vacancyId));
ipcMain.handle("studio:all-write", (e, opts) => require("./all-writer").writeAll({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:blog-progress", text))); // 한 번에 모두 쓰기 (2026-10-23)
ipcMain.handle("studio:sns-write", (e, opts) => snsWriter.write({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:sns-progress", text)));
ipcMain.handle("studio:sns-save", (_e, opts) => snsWriter.save(opts));
ipcMain.handle("studio:sns-revise", (e, opts) => snsWriter.revise(opts, (text) => e.sender.send("studio:sns-progress", text)));
ipcMain.handle("studio:blog-revise", (e, opts) => blogWriter.revise(opts, (text) => e.sender.send("studio:blog-progress", text)));
ipcMain.handle("studio:sns-export", (_e, opts) => snsWriter.exportChannel(opts));
ipcMain.handle("studio:sns-helper-fill", (e, opts) => snsWriter.fillByHelper(opts, (text) => e.sender.send("studio:sns-progress", text))); // 평소 크롬 + 도우미 확장 (2026-10-23)
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
ipcMain.handle("studio:column-open-url", (_e, url) => columnWriter.openUrl(url));
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
// 공실마케팅 › 인테리어·리모델링 예측 시뮬레이션 보고서 (2026-10-22)
ipcMain.handle("studio:sim-report-media", (_e, id) => simWriter.reportMedia(id));
ipcMain.handle("studio:sim-report-save", (_e, opts) => simWriter.saveReport(opts));
ipcMain.handle("studio:sim-report-text", (e, id) => simWriter.reportText({ id }, (text) => e.sender.send("studio:sim-progress", text)));
// 보고서 묶음 — 공간(거실·안방·주방·욕실…)마다 시뮬레이션 하나
ipcMain.handle("studio:sim-proj-create", (_e, kind) => simWriter.projCreate(kind));
ipcMain.handle("studio:sim-proj-get", (_e, id) => simWriter.projGet(id));
ipcMain.handle("studio:sim-proj-list", (_e, kind) => simWriter.projList(kind));
ipcMain.handle("studio:sim-proj-save", (_e, opts) => simWriter.projSave(opts));
ipcMain.handle("studio:sim-proj-add-space", (_e, opts) => simWriter.projAddSpace(opts));
ipcMain.handle("studio:sim-proj-text", (e, id) => simWriter.projText({ id }, (text) => e.sender.send("studio:sim-progress", text)));
// 공실마케팅 AI 채우기 (매물보고서·유리창홍보지 — 도구가 앱 화면 안에서 부른다)
// 홍보지·매물보고서 [이미지 내보내기] — 저장 창 없이 문서\공실스튜디오\02 공실마케팅\<AI홍보지|AI매물보고서>\날짜\ 에 (out-folder.js)
ipcMain.handle("studio:save-file", (_e, opts) => require("./out-folder").saveFile(opts));
ipcMain.handle("studio:open-out-folder", () => require("./out-folder").openRoot());
ipcMain.handle("studio:marketing-fill", (e, opts) => marketingWriter.fill({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:marketing-progress", text)));
// 공실 없이 만드는 AI 매물보고서 — PC 저장 (2026-10-23, report-local.js)
const reportLocal = require("./report-local");
ipcMain.handle("studio:report-create", (e, opts) => reportLocal.create({ ...opts, baseUrl: BASE_URL }, (text) => e.sender.send("studio:marketing-progress", text)));
ipcMain.handle("studio:report-get", (_e, id) => reportLocal.get(id));
ipcMain.handle("studio:report-list", () => reportLocal.list());
ipcMain.handle("studio:report-save", (_e, opts) => reportLocal.save(opts));
ipcMain.handle("studio:report-remove", (_e, id) => reportLocal.remove(id));
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
ipcMain.handle("studio:busy-hold", (_e, text, sub) => aiBusy.hold(text, sub));
ipcMain.handle("studio:busy-text", (_e, text, sub) => aiBusy.holdText(text, sub));
ipcMain.handle("studio:busy-release", () => aiBusy.release());
ipcMain.handle("studio:storage-get", () => require("./storage-place").info());
ipcMain.handle("studio:storage-choose", (e) => require("./storage-place").choose(BrowserWindow.fromWebContents(e.sender)));
ipcMain.handle("studio:storage-open", () => require("./storage-place").openFolder());
ipcMain.handle("studio:info", () => ({ version: app.getVersion(), baseUrl: BASE_URL, ffmpeg: Boolean(ffmpegPath()) }));

// 웹 화면이 "스튜디오 앱"임을 알아보도록 브라우저 정보 끝에 영어 이름을 붙인다
app.userAgentFallback = `${app.userAgentFallback} GongsilStudio/${app.getVersion()}`;

// 오른쪽 클릭 — 글 칸이나 고른 글자에서 잘라내기·복사·붙여넣기 (Electron 은 기본 메뉴가 없다).
// 페이지가 자기 메뉴를 띄우며 막은 곳(편집기 클립 등)에서는 이 이벤트가 오지 않는다
app.on("web-contents-created", (_e, wc) => {
  wc.on("context-menu", (_ev, p) => {
    const f = p.editFlags || {};
    if (!p.isEditable && !p.selectionText) return;
    const items = p.isEditable
      ? [
          { label: "잘라내기", accelerator: "CmdOrCtrl+X", role: "cut", enabled: f.canCut },
          { label: "복사", accelerator: "CmdOrCtrl+C", role: "copy", enabled: f.canCopy },
          { label: "붙여넣기", accelerator: "CmdOrCtrl+V", role: "paste", enabled: f.canPaste },
          { type: "separator" },
          { label: "모두 선택", accelerator: "CmdOrCtrl+A", role: "selectAll", enabled: f.canSelectAll },
        ]
      : [{ label: "복사", accelerator: "CmdOrCtrl+C", role: "copy", enabled: f.canCopy }];
    Menu.buildFromTemplate(items).popup({ window: BrowserWindow.fromWebContents(wc) || undefined });
  });
});

app.whenReady().then(async () => {
  // 저장 위치 — 외장하드가 빠졌는지 · 처음 켤 때 OneDrive/자리 부족이면 옮기기 권하기 (storage-place.js)
  try { await require("./storage-place").startup(); } catch (e) { log.warn(`[저장 위치] ${e.message}`); }
  try { require("./studio-root").ensureAll(); } catch {}
  try { require("./helper-server").start(); } catch (e) { log.warn(`[도우미] 창구 못 염: ${e.message}`); } // 공실스튜디오 도우미(크롬 확장)와 PC 안에서만 (2026-10-23)
  try { require("./gsn").start(); } catch (e) { log.warn(`[.gsn] 시작 못함: ${e.message}`); } // 뉴스·SNS발행 새 작업 → .gsn (docs/2026-10-23_gsn_plan.md) // 문서\공실스튜디오 01~09 폴더를 미리 (처음 열어도 전체 모양이 보이게)
  videoMedia.handle();
  videoIpc.register(BASE_URL);
  photoIpc.register();
  docIpc.register();
  require("./fonts-pc").register();
  videoIpc.setupCapture();
  const url = findDeepLink(process.argv);
  if (url) pendingDeepLink = url;
  buildMenu();
  // 켤 때 새 버전이 있으면 먼저 업데이트 (설치하러 끝나면 창을 만들지 않는다)
  if (await startupUpdate()) return;
  await createWindow();
  const gssFile = findGss(process.argv);
  if (gssFile) openGss(gssFile);
  const gsnFile = findGsn(process.argv);
  if (gsnFile) openGsn(gsnFile);
  const psdFile = findPsd(process.argv);
  if (psdFile) openPsd(psdFile);
  log.info(`[시작] v${app.getVersion()} ${BASE_URL} ffmpeg=${ffmpegPath() || "없음"}`);
  prefetchMyVoice();
  // 받아쓰기 공용 낱말장 받아 두기 (목록만, 비용 0원)
  setTimeout(() => require("./video/whisper").refreshShared().catch(() => {}), 20 * 1000);
});

/**
 * 내 목소리 성우(Qwen3-TTS, 약 3.5GB) 미리 받아 두기 — 설치 파일엔 안 넣고, 앱을 켜고 3분 뒤 뒤에서 받는다 (회의 3-16)
 *  대표님이 [내 목소리]를 처음 누를 땐 이미 준비돼 있게. 디스크가 10GB 안 남았으면 받지 않는다 (누를 때 안내)
 *  끄기: ai-settings.json 에 "prefetchVoice": false
 */
function prefetchMyVoice() {
  setTimeout(() => {
    try {
      const myvoice = require("./video/myvoice");
      const st = myvoice.status();
      if (st.engine || st.installing) return;
      try {
        if (JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "ai-settings.json"), "utf8")).prefetchVoice === false) return;
      } catch {}
      const free = (() => {
        try {
          const s = fs.statfsSync(path.dirname(myvoice.ROOT));
          return s.bavail * s.bsize;
        } catch {
          return Infinity;
        }
      })();
      if (free < 10e9) return log.info(`[내 목소리] 미리 받기 건너뜀 — 디스크 여유 ${(free / 1e9).toFixed(1)}GB`);
      log.info("[내 목소리] 미리 받기 시작 (뒤에서)");
      // 진행은 열린 창에 알린다 — [내 목소리] 탭을 열면 진행 막대가 보인다
      const tell = (t, f) => BrowserWindow.getAllWindows().forEach((w) => !w.isDestroyed() && w.webContents.send("video:myvoice-progress", t, f));
      myvoice.install(tell).then(() => log.info("[내 목소리] 미리 받기 끝")).catch((e) => log.warn(`[내 목소리] 미리 받기 실패 (누를 때 다시): ${e.message}`));
    } catch (e) {
      log.warn(`[내 목소리] 미리 받기 못 함: ${e.message}`);
    }
  }, 3 * 60 * 1000);
}
// 웹 화면의 [지금 업데이트] (필수 버전보다 낮을 때)
ipcMain.handle("studio:check-update", () => checkForUpdates(true));

app.on("window-all-closed", () => app.quit());
