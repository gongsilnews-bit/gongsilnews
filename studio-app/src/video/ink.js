// 강의 녹화 판서 · 마우스 강조 (2026-10-24 사장님 회의)
//  - 판서 판: 녹화하는 모니터 전체를 덮는 투명 창. 녹화에 "찍힌다" (그린 것이 영상에 나오게)
//    평소에는 마우스가 뒤로 그대로 지나가고, F9 를 누르면 그 위에 펜·형광펜·체크·도형을 그린다
//  - 도구 막대: 판서 중에만 뜨는 작은 창. 녹화에 "안 찍힌다" (조정실·프롬프터와 같게)
//  - 마우스 강조: 포인터 둘레 후광 · 큰 포인터를 판서 판에 그린다 (실제 커서는 그대로)
//  - 녹화를 시작하면 켜지고 끝나면 닫힌다. 설정의 [미리 써 보기]로 녹화 없이도 열어 본다
const { BrowserWindow, globalShortcut, screen, app, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log/main");

const KEY = "F9";
const DEFAULTS = { enabled: true, halo: false, haloColor: "#facc15", haloSize: 36, big: false, scale: 2 };
let prefs = null;
const prefsFile = () => path.join(app.getPath("userData"), "record-ink.json");
function getPrefs() {
  if (!prefs) {
    try {
      prefs = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(prefsFile(), "utf8")) };
    } catch {
      prefs = { ...DEFAULTS };
    }
  }
  return prefs;
}
function setPrefs(p) {
  prefs = { ...getPrefs(), ...(p || {}) };
  try {
    fs.writeFileSync(prefsFile(), JSON.stringify(prefs));
  } catch {}
  send("ink:prefs", prefs);
  cursorLoop();
  return prefs;
}

let ink = null; // 판서 판 (녹화에 찍힘)
let bar = null; // 도구 막대 (녹화에 안 찍힘)
let bounds = null; // 판이 덮은 모니터
let timer = null; // 마우스 위치 보내기
let lastPt = "";
const state = { drawing: false, tool: "pen", color: "#ef4444", board: "" };
const alive = (w) => w && !w.isDestroyed();
const send = (ch, v) => [ink, bar].forEach((w) => alive(w) && w.webContents.send(ch, v));
// 개발판 시험용 — STUDIO_SHOW_IN_CAPTURE=1 이면 도구 막대도 캡처에 보인다 (ipc.js 와 같은 규칙)
const hideFromCapture = (w) => w.setContentProtection(!(!app.isPackaged && process.env.STUDIO_SHOW_IN_CAPTURE === "1"));

/** 판서 판 열기 — d = 녹화하는 모니터 */
function open(d) {
  if (alive(ink)) return;
  const p = getPrefs();
  if (!p.enabled && !p.halo && !p.big) return;
  bounds = d.bounds;
  ink = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    enableLargerThanScreen: true,
    show: false,
    title: "판서",
    webPreferences: { preload: path.join(__dirname, "ink-preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  ink.setAlwaysOnTop(true, "screen-saver");
  ink.setIgnoreMouseEvents(true); // 평소에는 뒤 화면을 그대로 누른다
  ink.loadFile(path.join(__dirname, "ink.html"));
  ink.once("ready-to-show", () => {
    if (!alive(ink)) return;
    ink.setBounds(bounds); // 작업 표시줄까지 덮게 한 번 더
    ink.showInactive();
    // 판서를 켜 두었으면 녹화 시작과 함께 도구 막대를 아래에 띄워 둔다 (도구를 누르면 바로 판서)
    if (p.enabled) openBar();
  });
  ink.on("closed", () => {
    ink = null;
    close();
  });
  if (p.enabled) {
    try {
      if (!globalShortcut.isRegistered(KEY) && !globalShortcut.register(KEY, f9)) log.warn(`[판서] ${KEY} 단축키를 쓰지 못함 (다른 프로그램이 쓰는 중)`);
    } catch (e) {
      log.warn("[판서] 단축키", e);
    }
  }
  cursorLoop();
  log.info("[판서] 열림", bounds);
}

/** 판서 판·도구 막대 닫기 */
function close() {
  try {
    if (globalShortcut.isRegistered(KEY)) globalShortcut.unregister(KEY);
  } catch {}
  if (timer) clearInterval(timer);
  timer = null;
  passLoop(false);
  state.drawing = false;
  state.board = "";
  if (alive(bar)) bar.close();
  bar = null;
  if (alive(ink)) ink.close();
  ink = null;
}

/** 마우스 강조가 켜져 있으면 위치를 판에 보낸다 (60번/초, 움직였을 때만) */
function cursorLoop() {
  const p = getPrefs();
  const want = alive(ink) && (p.halo || p.big);
  if (!want) {
    if (timer) clearInterval(timer);
    timer = null;
    if (alive(ink)) ink.webContents.send("ink:cursor", null);
    return;
  }
  if (timer) return;
  timer = setInterval(() => {
    if (!alive(ink) || !bounds) return;
    const pt = screen.getCursorScreenPoint();
    const k = `${pt.x},${pt.y}`;
    if (k === lastPt) return;
    lastPt = k;
    ink.webContents.send("ink:cursor", { x: pt.x - bounds.x, y: pt.y - bounds.y });
  }, 16);
}

/** 도구 막대 — 녹화하는 모니터 아래쪽 가운데 */
function openBar() {
  if (alive(bar) || !bounds) return;
  const W = 760, H = 58;
  const wa = screen.getDisplayMatching(bounds).workArea;
  bar = new BrowserWindow({
    width: W,
    height: H,
    x: Math.round(wa.x + (wa.width - W) / 2),
    y: wa.y + wa.height - H - 24,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false, // 판서 판이 키(Esc·Ctrl+Z)를 계속 받게
    alwaysOnTop: true,
    show: false,
    title: "판서 도구",
    webPreferences: { preload: path.join(__dirname, "ink-preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  barBase = { x: Math.round(wa.x + (wa.width - W) / 2), y: wa.y + wa.height - H - 24, width: W, height: H };
  bar.setAlwaysOnTop(true, "screen-saver");
  hideFromCapture(bar);
  bar.loadFile(path.join(__dirname, "ink-bar.html"));
  bar.once("ready-to-show", () => {
    if (!alive(bar)) return;
    bar.showInactive();
    bar.moveTop();
  });
  bar.on("closed", () => (bar = null));
}

/** 도형 고르기 칸이 열릴 때만 막대 창을 위로 늘린다 (평소에는 막대만큼만 자리를 차지) */
const MENU_H = 60;
function barTall(on) {
  if (!alive(bar) || !barBase) return;
  const b = barBase;
  bar.setBounds(on ? { ...b, y: b.y - MENU_H, height: b.height + MENU_H } : b);
  bar.moveTop();
}
let barBase = null;

// 판서 판을 맨 위로 올리면 녹화 막대([녹화 끝])·프롬프터가 그 밑에 깔려 눌러도 판서가 된다 (2026-10-28 사장님)
//  → 판서를 켤 때마다 그 창들을 판 위로 다시 올린다 (둘 다 녹화에 안 찍히는 창)
//  조정실(녹화하기 창)·작은 창은 한 단계 낮은 "floating" 이라 moveTop 만으로는 판 위로 못 온다 → 판과 같은 단계로 올린다
let controls = () => [];
const setControls = (fn) => (controls = fn);
// 오른쪽 [화면캡처·녹화] 세로 막대도 — 판서 중에 녹화 끝·캡처 단추가 그대로 눌리게 (snap.js 창 제목)
const CONTROL_TITLES = ["화면캡처·녹화"];
const controlWins = () => {
  const byTitle = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed() && CONTROL_TITLES.includes(w.getTitle()));
  return [...controls(), ...byTitle, bar].filter((w) => w && w !== ink && !w.isDestroyed() && w.isVisible());
};
function raiseControls() {
  for (const w of controlWins()) {
    if (w === bar) continue;
    w.setAlwaysOnTop(true, "screen-saver");
    w.moveTop();
  }
}
// 판서 중 마우스가 막대(오른쪽 캡처·녹화, 아래 판서 도구, 녹화 창, 프롬프터) 위에 오면 — 판이 클릭을 그대로 흘려보낸다
//  (2026-10-28 사장님: 무엇을 고르고 있든 막대 위에서는 보통 마우스로). 창 순서와 상관없이 된다
let passTimer = null;
let passing = false;
function passLoop(on) {
  if (passTimer) clearInterval(passTimer);
  passTimer = null;
  passing = false;
  if (!on) return;
  passTimer = setInterval(() => {
    if (!alive(ink) || !state.drawing) return passLoop(false);
    const pt = screen.getCursorScreenPoint();
    const over = controlWins().some((w) => {
      const b = w.getBounds();
      return pt.x >= b.x && pt.x < b.x + b.width && pt.y >= b.y && pt.y < b.y + b.height;
    });
    if (over === passing) return;
    passing = over;
    ink.setIgnoreMouseEvents(over);
  }, 30);
}

/** F9 — 판서 켜기·끄기. 끌 때 칠판도 걷는다 (그린 것은 남겨 둠). 도구 막대는 녹화 내내 떠 있다 */
function toggle(on) {
  if (!alive(ink)) return false;
  state.drawing = typeof on === "boolean" ? on : !state.drawing;
  if (!state.drawing) state.board = "";
  ink.setIgnoreMouseEvents(!state.drawing);
  passLoop(state.drawing);
  if (state.drawing) {
    ink.moveTop();
    ink.focus();
    openBar();
    if (alive(bar)) bar.moveTop();
    raiseControls();
  }
  send("ink:state", state);
  return state.drawing;
}

/** F9 — 도구 막대 보이기·숨기기. 띄울 때는 판서도 켜고, 숨길 때는 판서도 끈다 (그린 것은 남김) */
function f9() {
  if (!alive(ink)) return false;
  if (!alive(bar)) return toggle(true);
  toggle(false);
  bar.close();
  bar = null;
  return false;
}

function register() {
  ipcMain.handle("ink:init", () => ({ state, prefs: getPrefs() }));
  // 도구 막대·판에서: 도구·색·칠판 바꾸기
  // 판서가 꺼진 채 도구·칠판을 누르면 판서를 켠다 (색만 바꿀 때는 그대로)
  ipcMain.on("ink:set", (_e, patch) => {
    Object.assign(state, patch || {});
    if (!state.drawing && patch && (patch.tool || patch.board)) return toggle(true);
    send("ink:state", state);
  });
  // 되돌리기·전체 지우기는 판이 하고, 끄기는 여기서
  ipcMain.on("ink:cmd", (_e, cmd) => {
    if (cmd === "off") toggle(false);
    else if (cmd === "on") toggle(true);
    else if (cmd === "menu-on" || cmd === "menu-off") barTall(cmd === "menu-on");
    else if (alive(ink)) ink.webContents.send("ink:cmd", cmd);
  });
  app.on("will-quit", close);
}

module.exports = { register, setControls, open, close, toggle, f9, getPrefs, setPrefs, isOpen: () => alive(ink), isDrawing: () => state.drawing };
