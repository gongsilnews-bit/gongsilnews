// 스튜디오 전용 크롬
// 회원 PC에 깔린 진짜 크롬(없으면 엣지)을 평소 크롬과 분리된 프로필로 띄우고 조종한다.
// - 앱 안 창에서는 구글 로그인이 막히지만 진짜 크롬은 막히지 않는다.
// - 크롬 보안 정책상 조종(원격 디버깅)은 기본 프로필이 아닌 별도 폴더에서만 된다.
// - 회원이 이 크롬에서 ChatGPT·Claude·Gemini·네이버에 직접 로그인한다. 비밀번호는 앱이 받지 않는다.
// - 조종을 켜면 크롬이 스스로 "자동 조종 중"(navigator.webdriver) 표시를 단다. 그 상태에선 구글 로그인이
//   막힐 수 있어, 로그인은 조종을 끈 평범한 크롬(openPlain)으로 하고 조종은 그 뒤에 켠다.
//   표시를 감추는 옵션(AutomationControlled 끄기 등)은 탐지를 속이는 것이라 쓰지 않는다.
const { app, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, execFile } = require("child_process");
const { chromium } = require("playwright-core");
const log = require("electron-log/main");

// 개발판(npm start)은 설치판이 로그인해 둔 전용 크롬을 같이 쓴다 (AI에 다시 로그인하지 않게)
const profileDir = () => {
  if (process.env.STUDIO_CHROME_DIR) return process.env.STUDIO_CHROME_DIR;
  const installed = path.join(app.getPath("appData"), "공실뉴스 스튜디오", "studio-chrome");
  if (!app.isPackaged && fs.existsSync(installed)) return installed;
  return path.join(app.getPath("userData"), "studio-chrome");
};
const portFile = () => path.join(profileDir(), "DevToolsActivePort");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser = null;
let plainProc = null; // 로그인용으로 띄운 평범한 전용 크롬

function findBrowser() {
  const env = process.env;
  const candidates = [
    [env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe", "chrome"],
    [env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe", "chrome"],
    [env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe", "chrome"],
    [env["PROGRAMFILES(X86)"], "Microsoft\\Edge\\Application\\msedge.exe", "edge"],
    [env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe", "edge"],
  ];
  for (const [base, rel, kind] of candidates) {
    if (!base) continue;
    const exe = path.join(base, rel);
    if (fs.existsSync(exe)) return { exe, kind };
  }
  return null;
}

/** 처음 만들 때 프로필 이름을 "공실뉴스 스튜디오"로 해 둔다 (창 위쪽 프로필 표시) */
function seedProfile() {
  const pref = path.join(profileDir(), "Default", "Preferences");
  if (!fs.existsSync(pref)) {
    fs.mkdirSync(path.dirname(pref), { recursive: true });
    fs.writeFileSync(pref, JSON.stringify({ profile: { name: "공실뉴스 스튜디오" }, browser: { has_seen_welcome_page: true } }));
  }
  // 창을 닫으면 크롬이 완전히 끝나게 한다 (뒤에서 계속 실행하면 다음 작업이 그 크롬에 막힌다)
  const localState = path.join(profileDir(), "Local State");
  try {
    const st = fs.existsSync(localState) ? JSON.parse(fs.readFileSync(localState, "utf8")) : {};
    if (!st.background_mode || st.background_mode.enabled !== false) {
      st.background_mode = { ...(st.background_mode || {}), enabled: false };
      fs.writeFileSync(localState, JSON.stringify(st));
    }
  } catch {}
}

function readPort() {
  try {
    const port = Number(fs.readFileSync(portFile(), "utf8").split(/\r?\n/)[0]);
    return port > 0 ? port : null;
  } catch {
    return null;
  }
}

async function tryConnect(port) {
  try {
    return await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 5000 });
  } catch {
    return null;
  }
}

function attach(b) {
  browser = b;
  b.on("disconnected", () => {
    if (browser === b) browser = null;
  });
  return b;
}

/** 전용 크롬이 켜져 있는지 (켜지는 않는다) */
async function isRunning() {
  if (browser && browser.isConnected()) return true;
  const port = readPort();
  if (!port) return false;
  const b = await tryConnect(port);
  if (b) attach(b);
  return Boolean(b);
}

/*
 * 보이는 창은 늘 화면 오른쪽 절반에 연다 (앱 창과 나란히).
 * 크롬은 마지막 창 위치를 기억하는데, 로그인 확인 때 화면 밖(-32000)에 띄운 위치를
 * 기억했다가 다음 창을 화면 밖에 여는 문제가 있어 위치를 매번 정해 준다.
 */
function visiblePlacement() {
  const w = screen.getPrimaryDisplay().workArea;
  const width = Math.max(900, Math.round(w.width / 2));
  return [`--window-position=${w.x + w.width - width},${w.y}`, `--window-size=${width},${w.height}`];
}

function spawnChrome(args) {
  const found = findBrowser();
  if (!found) throw new Error("이 PC에서 크롬이나 엣지를 찾지 못했습니다. 크롬을 설치한 뒤 다시 시도해 주세요.");
  seedProfile();
  log.info(`[전용 크롬] 켜기 ${found.exe} ${args.join(" ")}`);
  return spawn(found.exe, [`--user-data-dir=${profileDir()}`, "--no-first-run", "--no-default-browser-check", ...args], { detached: true, stdio: "ignore" });
}

/** 조종 중인 전용 크롬을 닫는다 */
async function closeControlled() {
  if (await isRunning()) {
    // 조종 연결(connectOverCDP)의 browser.close()는 연결만 끊으므로, 크롬에 직접 닫으라고 보낸다
    try {
      const cdp = await browser.newBrowserCDPSession();
      await cdp.send("Browser.close");
    } catch {}
    await browser.close().catch(() => {});
    browser = null;
    await sleep(800);
  }
  try {
    fs.unlinkSync(portFile());
  } catch {}
}

/**
 * 조종을 끈 평범한 전용 크롬으로 주소를 연다 (로그인용).
 * 회원이 크롬 창을 모두 닫으면 끝난다 (최대 timeoutMs).
 */
async function openPlain(url, timeoutMs = 15 * 60 * 1000) {
  await closeControlled();
  await closeStrayChrome(); // 남은 창이 있으면 새 로그인 창이 그 창에 묻혀 바로 끝나 버린다
  const proc = spawnChrome([...visiblePlacement(), url]);
  plainProc = proc;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    proc.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * 로그인용 전용 크롬을 닫는다 ([로그인 다 했어요]).
 * 강제 종료하면 방금 생긴 로그인 쿠키가 저장되지 않을 수 있어, 창 닫기(/F 없이)로 정상 종료시킨다.
 */
function closePlain() {
  const proc = plainProc;
  if (!proc || proc.exitCode !== null) return;
  execFile("taskkill", ["/PID", String(proc.pid), "/T"], () => {});
  // 창 없이 뒤에서 도는 크롬은 창 닫기에 답하지 않는다 — 6초 뒤에도 살아 있으면 강제로 끝낸다
  setTimeout(() => {
    if (proc.exitCode === null) execFile("taskkill", ["/PID", String(proc.pid), "/T", "/F"], () => {});
  }, 6000);
}

/* 이 프로필로 떠 있는 크롬 본체 프로세스 번호들 (조종용·로그인용 모두) */
function profileChromePids() {
  return new Promise((resolve) => {
    const dir = profileDir().replace(/'/g, "''");
    const ps = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${dir}*' -and $_.CommandLine -notlike '*--type=*' } | ForEach-Object { $_.ProcessId }`;
    execFile("powershell", ["-NoProfile", "-Command", ps], { windowsHide: true }, (err, out) => {
      resolve(err ? [] : String(out).split(/\s+/).map(Number).filter(Boolean));
    });
  });
}

/*
 * 조종 없이 떠 있는 전용 크롬(로그인 창 등)이 있으면 조종용 크롬을 띄울 수 없다.
 * (같은 프로필이면 새 크롬이 떠 있는 창에 빈 탭만 열고 끝난다)
 *  - 지금 로그인 중인 창이면 회원에게 [로그인 다 했어요]를 먼저 누르라고 알린다.
 *  - 지난 실행에서 남은 창이면 창 닫기로 정상 종료시킨다.
 */
async function closeStrayChrome() {
  if (plainProc && plainProc.exitCode === null) {
    throw new Error("로그인용 크롬 창이 아직 열려 있습니다. [로그인 다 했어요]를 먼저 눌러 주세요.");
  }
  let pids = await profileChromePids();
  if (!pids.length) return;
  log.info(`[전용 크롬] 남아 있는 창 정리 ${pids.join(",")}`);
  for (const pid of pids) execFile("taskkill", ["/PID", String(pid), "/T"], () => {});
  for (let i = 0; i < 12 && pids.length; i++) {
    await sleep(500);
    pids = await profileChromePids();
  }
  // 창 없이 뒤에서 도는 크롬은 창 닫기에 답하지 않는다 — 강제로 끝낸다 (로그인 정보는 이미 저장돼 있다)
  if (pids.length) {
    log.info(`[전용 크롬] 강제 정리 ${pids.join(",")}`);
    for (const pid of pids) execFile("taskkill", ["/PID", String(pid), "/T", "/F"], () => {});
    for (let i = 0; i < 10 && pids.length; i++) {
      await sleep(500);
      pids = await profileChromePids();
    }
  }
  if (pids.length) throw new Error("이전에 열린 스튜디오 전용 크롬 창을 닫지 못했습니다. 그 크롬 창을 직접 닫고 다시 눌러 주세요.");
}

/** 전용 크롬을 켜거나, 이미 켜져 있으면 붙는다. hidden 이면 화면 밖에 띄운다 (확인용) */
async function ensureBrowser({ hidden = false } = {}) {
  if (await isRunning()) return browser;
  await closeStrayChrome();

  try {
    fs.unlinkSync(portFile());
  } catch {}
  const args = ["--remote-debugging-port=0"];
  if (hidden) args.push("--window-position=-32000,-32000", "--window-size=1100,800");
  else args.push(...visiblePlacement());
  spawnChrome([...args, "about:blank"]).unref();

  for (let i = 0; i < 100; i++) {
    const port = readPort();
    if (port) {
      const b = await tryConnect(port);
      if (b) return attach(b);
    }
    await sleep(200);
  }
  throw new Error("전용 크롬을 켜지 못했습니다. 크롬 창을 모두 닫고 다시 시도해 주세요.");
}

function context() {
  if (!browser) throw new Error("전용 크롬이 꺼져 있습니다.");
  return browser.contexts()[0];
}

function hostOf(page) {
  try {
    return new URL(page.url()).hostname;
  } catch {
    return "";
  }
}

/** 이미 떠 있는 창이 화면 밖에 있어도 화면 오른쪽 절반으로 끌어온다 */
async function placeOnScreen(page) {
  try {
    const w = screen.getPrimaryDisplay().workArea;
    const width = Math.max(900, Math.round(w.width / 2));
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    // 윈도우는 다른 프로그램이 창을 앞으로 끌어오는 것을 막을 때가 있다.
    // 잠깐 최소화했다가 펴면 확실히 맨 앞으로 나온다 (앱 뒤에 가려진 채로 일하지 않게)
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "minimized" } });
    await sleep(150);
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
    await sleep(250); // 다 펴진 뒤에 위치를 잡아야 오른쪽 절반에 정확히 놓인다
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { left: w.x + w.width - width, top: w.y, width, height: w.height } });
    await cdp.detach();
  } catch (e) {
    log.warn("[전용 크롬] 창 위치 맞추기 실패", e.message);
  }
}

/** 해당 사이트 탭을 찾고, 없으면 연다. 찾은 탭을 앞으로 가져온다 */
async function openPage(host, url) {
  await ensureBrowser();
  const ctx = context();
  let page = ctx.pages().find((p) => hostOf(p) === host || hostOf(p).endsWith(`.${host}`));
  if (!page) {
    page = ctx.pages().find((p) => p.url() === "about:blank") || (await ctx.newPage());
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }
  await placeOnScreen(page);
  await page.bringToFront();
  return page;
}

/** 이미 열린 해당 사이트 탭 (없으면 null, 새로 열지 않는다) */
function findPage(host) {
  if (!browser) return null;
  return context().pages().find((p) => hostOf(p) === host) || null;
}

/** 전용 크롬에 열린 탭 전부 (꺼져 있으면 빈 목록, 새로 켜지 않는다) */
async function openPages() {
  if (!(await isRunning())) return []; // 켜져 있으면 isRunning 이 붙는다
  return context().pages();
}

/** 화면 밖 전용 크롬에서 주소를 열어 fn(page) 를 실행하고 닫는다 (로그인 확인용) */
async function withHiddenPage(url, fn) {
  await closeControlled();
  await ensureBrowser({ hidden: true });
  try {
    const page = context().pages()[0] || (await context().newPage());
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return await fn(page);
  } finally {
    await closeControlled();
  }
}

module.exports = { findBrowser, ensureBrowser, isRunning, openPage, findPage, openPages, openPlain, closePlain, withHiddenPage, closeControlled, hostOf, sleep };
