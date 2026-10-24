// 화면캡처 · 화면녹화 유틸리티 (2026-10-24 사장님 회의)
//  - [화면캡처·녹화]를 누르면 스튜디오 창은 내려가고 화면 오른쪽에 세로 도구 막대가 뜬다 (캡처·녹화에 안 찍힘)
//  - 캡처: 영역(마우스로 네모) · 모니터 전체 · 스크롤(고른 칸을 앱이 굴리며 찍어 이어 붙임 — 크롬 말고도 됨)
//  - 녹화: 모니터 전체(1920×1080 으로 맞춤) · 영역(마우스로 네모)
//  - 찍으면 클립보드에 바로 (카톡·첨부·이미지제작에 Ctrl+V). 녹화 영상은 파일로 클립보드에 (카톡에 Ctrl+V = 파일 첨부)
//  - 저장: 07 녹화파일\화면캡쳐 · 화면녹화 (날짜 폴더 없이, 이름 앞 20261024)
const { BrowserWindow, screen, desktopCapturer, clipboard, ipcMain, shell, app, globalShortcut } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const log = require("electron-log/main");

const sr = () => require("../studio-root");
const ff = () => require("../video/ff");
const ink = () => require("../video/ink");
const PRELOAD = path.join(__dirname, "snap-preload.js");
const alive = (w) => w && !w.isDestroyed();
// 개발판 시험용 — STUDIO_SHOW_IN_CAPTURE=1 이면 막대·알림도 캡처에 보인다 (ink.js · ipc.js 와 같은 규칙)
const hideFromCapture = (w) => w.setContentProtection(!(!app.isPackaged && process.env.STUDIO_SHOW_IN_CAPTURE === "1"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};
/** 같은 이름이 있으면 _2, _3… (강의녹화와 같은 규칙) */
function uniq(dir, base, ext) {
  let f = path.join(dir, `${base}${ext}`);
  for (let i = 2; fs.existsSync(f); i++) f = path.join(dir, `${base}_${i}${ext}`);
  return f;
}
const outDir = (name) => {
  const d = sr().dir("rec", name);
  fs.mkdirSync(d, { recursive: true });
  return d;
};

/* 설정 — 녹화 때 마이크 (막대에서 켜고 끔, 기억) */
const prefsFile = () => path.join(app.getPath("userData"), "snap.json");
let prefs = null;
function getPrefs() {
  if (!prefs) {
    try {
      prefs = { mic: false, ...JSON.parse(fs.readFileSync(prefsFile(), "utf8")) };
    } catch {
      prefs = { mic: false };
    }
  }
  return prefs;
}
function setPrefs(p) {
  prefs = { ...getPrefs(), ...p };
  try {
    fs.writeFileSync(prefsFile(), JSON.stringify(prefs));
  } catch {}
}

let main = null; // 스튜디오 창 (막대를 닫으면 다시 올린다)
let bar = null; // 오른쪽 세로 막대
let toast = null; // 찍은 뒤 오른쪽 아래 알림
let frame = null; // 영역 녹화 테두리
let recWin = null; // 녹화하는 숨은 창
const inits = new Map(); // 창(webContents id) → 처음 줄 값
let state = { mode: "idle", text: "", startedAt: 0 }; // idle · rec · scroll · busy
let rec = null; // { file, fd, kind, area(비율), display, chain }
let scrollStop = false;
let picking = null; // 고르는 중 { wins, resolve }

function setState(s) {
  state = { ...state, ...s };
  if (alive(bar)) bar.webContents.send("snap:state", { ...state, mic: getPrefs().mic });
}

function makeWin(opts, file, init) {
  const w = new BrowserWindow({
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    ...opts,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  inits.set(w.webContents.id, init || {});
  const id = w.webContents.id;
  w.on("closed", () => inits.delete(id));
  w.loadFile(path.join(__dirname, file));
  return w;
}

/* ───────── 막대 ───────── */

/** [화면캡처·녹화] — 스튜디오 창을 내리고 오른쪽 막대를 띄운다 */
function open(w) {
  if (w) main = w;
  if (alive(bar)) {
    bar.showInactive();
    return true;
  }
  const d = main ? screen.getDisplayMatching(main.getBounds()) : screen.getPrimaryDisplay();
  const W = 84, H = 612, wa = d.workArea;
  // focusable 을 끄면 고르기 창이 닫힌 뒤 막대가 클릭을 못 받는다 (2026-10-24 — 녹화 끝·닫기가 안 먹힘)
  bar = makeWin({ width: W, height: H, x: wa.x + wa.width - W - 10, y: Math.round(wa.y + (wa.height - H) / 2), alwaysOnTop: true, title: "화면캡처·녹화" }, "bar.html", { role: "bar" });
  bar.setAlwaysOnTop(true, "screen-saver");
  hideFromCapture(bar);
  bar.once("ready-to-show", () => alive(bar) && bar.showInactive());
  bar.on("closed", () => {
    bar = null;
    unregisterKeys();
  });
  registerKeys();
  if (main && !main.isDestroyed()) main.minimize();
  log.info("[화면캡처] 막대 열림");
  return true;
}

/** 막대 닫기 — 녹화 중이면 닫지 않는다. 스튜디오 창을 다시 올린다 */
function close() {
  if (rec) return false;
  scrollStop = true;
  cancelPick();
  if (alive(bar)) bar.close();
  bar = null;
  if (alive(toast)) toast.close();
  try {
    if (ink().isOpen()) ink().close();
  } catch {}
  if (main && !main.isDestroyed()) {
    if (main.isMinimized()) main.restore();
    main.show();
    main.focus();
  }
  return true;
}

/* 단축키 — 막대가 떠 있는 동안만 (다른 프로그램과 겹치지 않게) */
const KEYS = [
  ["CommandOrControl+Shift+1", () => run("area")],
  ["CommandOrControl+Shift+2", () => run("full")],
  ["CommandOrControl+Shift+3", () => run("scroll")],
  ["CommandOrControl+Shift+4", () => (rec ? run("rec-stop") : run("rec-full"))],
  ["CommandOrControl+Shift+5", () => (rec ? run("rec-stop") : run("rec-area"))],
];
function registerKeys() {
  for (const [k, fn] of KEYS) {
    try {
      if (!globalShortcut.isRegistered(k) && !globalShortcut.register(k, fn)) log.warn(`[화면캡처] ${k} 단축키를 쓰지 못함`);
    } catch {}
  }
}
function unregisterKeys() {
  for (const [k] of KEYS) {
    try {
      globalShortcut.unregister(k);
    } catch {}
  }
}

/* ───────── 화면 찍기 ───────── */

/** 모니터 한 대를 실제 화소 크기로 → { img, id }. small = 그림 없이 이름(id)만 (녹화 시작을 빠르게) */
async function grab(d, small = false) {
  const sf = d.scaleFactor || 1;
  const size = small ? { width: 0, height: 0 } : { width: Math.round(d.bounds.width * sf), height: Math.round(d.bounds.height * sf) };
  const list = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: size });
  return pickSrc(list, d);
}
function pickSrc(list, d) {
  const idx = screen.getAllDisplays().findIndex((x) => x.id === d.id);
  const src = list.find((s) => String(s.display_id) === String(d.id)) || list[idx] || list[0];
  if (!src) throw new Error("화면을 찾지 못했어요.");
  return { img: src.thumbnail, id: src.id };
}
/** 모든 모니터를 한 번에 (모니터마다 따로 부르면 그만큼 느리다) */
async function grabAll() {
  const all = screen.getAllDisplays();
  const width = Math.max(...all.map((d) => Math.round(d.bounds.width * (d.scaleFactor || 1))));
  const height = Math.max(...all.map((d) => Math.round(d.bounds.height * (d.scaleFactor || 1))));
  const list = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width, height } });
  return new Map(all.map((d) => [d.id, pickSrc(list, d).img]));
}

/** 막대·알림을 잠깐 숨기고 찍는다 (캡처에 안 찍히게 해 두었지만 한 번 더) */
async function hidden(fn) {
  if (app.isPackaged || process.env.STUDIO_SHOW_IN_CAPTURE !== "1") return fn(); // 캡처에 안 찍히게 해 두었으니 숨기지 않는다 (빠르게, 깜빡임 없이)
  const vis = [bar, toast].filter((w) => alive(w) && w.isVisible());
  vis.forEach((w) => w.hide());
  if (vis.length) await sleep(160);
  try {
    return await fn();
  } finally {
    vis.forEach((w) => alive(w) && w.showInactive());
  }
}

/** DIP 네모(모니터 안 위치) → 그 모니터 그림에서 잘라 낸다 */
function cropOf(img, d, r) {
  const s = img.getSize();
  const kx = s.width / d.bounds.width, ky = s.height / d.bounds.height;
  const x = Math.max(0, Math.round(r.x * kx)), y = Math.max(0, Math.round(r.y * ky));
  return img.crop({ x, y, width: Math.min(s.width - x, Math.round(r.w * kx)), height: Math.min(s.height - y, Math.round(r.h * ky)) });
}

const cursorDisplay = () => screen.getDisplayNearestPoint(screen.getCursorScreenPoint());

/**
 * 고르기 — 모든 모니터에 고르기 창을 띄운다
 *  mode area: 마우스로 네모 (imgs 가 있으면 멈춘 화면 위에서) → { d, r }
 *  mode pick: 모니터 하나 누르기 → { d }
 */
function choose(mode, hint, imgs) {
  cancelPick();
  return new Promise((resolve) => {
    const wins = [];
    for (const d of screen.getAllDisplays()) {
      const img = imgs && imgs.get(d.id);
      const w = makeWin(
        { ...d.bounds, alwaysOnTop: true, enableLargerThanScreen: true, movable: false, title: "고르기", transparent: !img, backgroundColor: img ? "#000000" : "#00000000" },
        "select.html",
        { mode, hint, img: img ? "data:image/jpeg;base64," + img.toJPEG(85).toString("base64") : "", displayId: d.id } // 배경으로만 보여 주니 JPEG 로 (빨리 뜨게)
      );
      w.setAlwaysOnTop(true, "screen-saver");
      hideFromCapture(w); // 고르기 창 자체는 녹화에 안 찍히게 (영역 녹화 시작 직전)
      w.once("ready-to-show", () => {
        if (!alive(w)) return;
        w.setBounds(d.bounds);
        w.show();
        if (d.id === cursorDisplay().id) w.focus();
      });
      w.displayId = d.id;
      wins.push(w);
    }
    picking = { wins, resolve };
  });
}
function endPick(v) {
  if (!picking) return;
  const { wins, resolve } = picking;
  picking = null;
  wins.forEach((w) => alive(w) && w.close());
  // 고르기 창이 닫힌 뒤 막대를 다시 맨 위로 (클릭이 막대에 가게)
  if (alive(bar)) {
    bar.setAlwaysOnTop(true, "screen-saver");
    bar.moveTop();
  }
  resolve(v);
}
const cancelPick = () => endPick(null);

/** 모니터가 여러 대면 고르게, 한 대면 그대로 */
async function pickDisplay(hint) {
  const all = screen.getAllDisplays();
  if (all.length === 1) return all[0];
  const r = await choose("pick", hint);
  return r && r.d;
}

/** 찍은 그림 저장 + 클립보드 + 알림 */
function saveImage(img, what) {
  const file = uniq(outDir("화면캡쳐"), `${ymd()} 화면캡쳐`, ".png");
  fs.writeFileSync(file, img.toPNG());
  clipboard.writeImage(img);
  const s = img.getSize();
  log.info(`[화면캡처] ${what} ${s.width}×${s.height} → ${file}`);
  showToast({ kind: "image", file, name: path.basename(file), size: `${s.width}×${s.height}`, thumb: img.resize(s.width > s.height ? { width: 280 } : { height: 180 }).toDataURL() });
}

async function captureFull() {
  const d = await pickDisplay("이 모니터를 찍으려면 누르세요");
  if (!d) return;
  const { img } = await hidden(() => grab(d));
  saveImage(img, "전체");
}

/** 모든 모니터를 먼저 찍어 멈춘 화면을 보여 주고, 그 위에서 네모를 고른다 */
async function frozenArea(hint) {
  const imgs = await hidden(grabAll);
  const r = await choose("area", hint, imgs);
  if (!r) return null;
  return { ...r, img: imgs.get(r.d.id) };
}

async function captureArea() {
  const r = await frozenArea("찍을 곳을 마우스로 끌어 고르세요 · Esc 취소");
  if (r) saveImage(cropOf(r.img, r.d, r.r), "영역");
}

/* ───────── 스크롤 캡처 ─────────
 * 고른 칸 가운데에 마우스를 두고 휠을 굴리며 찍은 뒤, 겹친 부분을 찾아 이어 붙인다.
 * 마우스 휠은 윈도우 기본 기능(user32)으로 보낸다 — 파워셸 하나를 띄워 두고 줄마다 명령 */
let wheelPs = null;
let wheelWait = null;
function wheelProc() {
  if (wheelPs && wheelPs.exitCode === null && !wheelPs.killed) return wheelPs;
  const script = [
    'Add-Type -TypeDefinition @"',
    "using System; using System.Runtime.InteropServices;",
    'public static class GsWheel { [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y); [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, int d, UIntPtr e); [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }',
    '"@',
    "[GsWheel]::SetProcessDPIAware() | Out-Null",
    "[Console]::Out.WriteLine('ready')",
    "while ($true) {",
    "  $l = [Console]::In.ReadLine(); if ($l -eq $null) { break }",
    "  $p = $l.Split(' ')",
    "  [GsWheel]::SetCursorPos([int]$p[0], [int]$p[1]) | Out-Null; Start-Sleep -Milliseconds 30",
    "  for ($i = 0; $i -lt [int]$p[2]; $i++) { [GsWheel]::mouse_event(0x0800, 0, 0, -120, [UIntPtr]::Zero); Start-Sleep -Milliseconds 35 }",
    "  [Console]::Out.WriteLine('ok')",
    "}",
  ].join("\n");
  wheelPs = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], { windowsHide: true });
  let buf = "";
  wheelPs.stdout.on("data", (b) => {
    buf += b.toString();
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line && wheelWait) {
        const f = wheelWait;
        wheelWait = null;
        f(line);
      }
    }
  });
  wheelPs.on("exit", () => (wheelPs = null));
  return wheelPs;
}
function wheelLine(line, ms = 5000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      wheelWait = null;
      resolve(null);
    }, ms);
    wheelWait = (v) => {
      clearTimeout(t);
      resolve(v);
    };
    if (line) wheelProc().stdin.write(line + "\n");
  });
}
async function wheelReady() {
  if (wheelPs && wheelPs.exitCode === null) return true;
  const p = wheelLine("", 8000);
  wheelProc();
  return Boolean(await p);
}

/** 세로 띠마다 줄 값 (겹친 곳 찾기용). 화면을 세로 띠 여러 개로 나눠서 — 안 움직이는 오른쪽 칸·광고가 있어도
 *  움직인 띠들로 얼마나 내려갔는지 찾는다. 오른쪽 끝(스크롤 막대)은 빼고, 작은 흔들림은 무시 */
const BANDS = 12;
function rowSigs(img) {
  const { width: w, height: h } = img.getSize();
  const bmp = img.toBitmap(); // BGRA
  const right = Math.max(BANDS, w - Math.round(w * 0.02) - 6);
  const bw = Math.floor(right / BANDS);
  const sigs = [], flat = [];
  for (let k = 0; k < BANDS; k++) {
    const sg = new Uint32Array(h), fl = new Uint8Array(h); // fl = 한 색으로 된 줄 (어디와도 맞으니까 셈하지 않는다)
    for (let y = 0; y < h; y++) {
      let hs = 2166136261, first = -1, same = 1;
      const o = y * w * 4;
      for (let x = k * bw; x < (k + 1) * bw; x++) {
        const i = o + x * 4;
        const v = ((bmp[i] >> 3) << 10) | ((bmp[i + 1] >> 3) << 5) | (bmp[i + 2] >> 3);
        if (first < 0) first = v;
        else if (v !== first) same = 0;
        hs = Math.imul(hs ^ v, 16777619) >>> 0;
      }
      sg[y] = hs;
      fl[y] = same;
    }
    sigs.push(sg);
    flat.push(fl);
  }
  return { sigs, flat, h, w, bmp };
}
/** 새 화면이 앞 화면보다 몇 줄 내려갔는지 (못 찾으면 -1, 끝에 닿아 그대로면 0) — 띠마다 찾아 많이 나온 값으로 */
function shiftOf(a, b) {
  const h = Math.min(a.h, b.h);
  const votes = new Map();
  let moving = 0, still = 0;
  for (let k = 0; k < BANDS; k++) {
    const as = a.sigs[k], bs = b.sigs[k], fl = b.flat[k];
    let n = 0, same = 0;
    for (let i = 0; i < h; i++) if (!fl[i]) { n++; if (bs[i] === as[i]) same++; }
    if (n < 12) continue; // 거의 빈 띠
    if (same / n > 0.95) { still++; continue; } // 안 움직이는 띠 (고정된 칸·끝에 닿음)
    let best = -1, bestSc = 0;
    for (let s = 1; s < h - 24; s++) {
      let hit = 0, m = 0;
      for (let i = 0; i < h - s; i++) {
        if (fl[i]) continue;
        m++;
        if (bs[i] === as[i + s]) hit++;
      }
      if (m < 12) continue;
      const sc = hit / m;
      if (sc > bestSc + 0.002) { bestSc = sc; best = s; }
    }
    moving++;
    if (bestSc >= 0.8) votes.set(best, (votes.get(best) || 0) + 1);
  }
  if (!moving) return still ? 0 : -1;
  let s = -1, c = 0;
  for (const [v, n] of votes) if (n > c) { s = v; c = n; }
  return c >= 1 && c * 2 >= Math.min(moving, 4) ? s : -1;
}

async function captureScroll() {
  const r = await frozenArea("길게 찍을 칸을 고르세요 (스크롤되는 부분만 고르면 깔끔해요) · Esc 취소");
  if (!r) return;
  const { d } = r;
  const area = r.r;
  if (!(await wheelReady())) throw new Error("마우스 휠을 움직이지 못했어요.");
  scrollStop = false;
  setState({ mode: "scroll", text: "스크롤하며 찍는 중…" });
  await sleep(300); // 고르기 창이 다 닫히기를
  const back = screen.getCursorScreenPoint();
  const mid = screen.dipToScreenPoint ? screen.dipToScreenPoint({ x: d.bounds.x + area.x + area.w / 2, y: d.bounds.y + area.y + area.h / 2 }) : { x: d.bounds.x + area.x + area.w / 2, y: d.bounds.y + area.y + area.h / 2 };
  const notches = Math.max(1, Math.round((area.h * 0.55) / 100)); // 한 칸(120)이 대개 100px 쯤
  const parts = [];
  let total = 0;
  try {
    let prevImg = cropOf((await hidden(() => grab(d))).img, d, area);
    let prev = rowSigs(prevImg);
    parts.push({ bmp: prev.bmp, w: prev.w, from: 0, rows: prev.h });
    total = prev.h;
    let still = 0;
    for (let i = 0; i < 60 && !scrollStop; i++) {
      await wheelLine(`${Math.round(mid.x)} ${Math.round(mid.y)} ${notches}`);
      await sleep(420); // 부드럽게 내려가는 움직임이 끝나기를
      const img = cropOf((await grab(d)).img, d, area); // 막대는 캡처에 안 찍히니 숨기지 않는다 (깜빡임 없게)
      const cur = rowSigs(img);
      const s = shiftOf(prev, cur);
      if (s === 0) {
        if (++still >= 2) break; // 끝까지 내려감
        continue;
      }
      if (s < 0) {
        log.warn(`[화면캡처] 스크롤 ${i + 1}번째 — 겹친 곳을 못 찾아 여기서 멈춤`);
        break;
      }
      still = 0;
      parts.push({ bmp: cur.bmp, w: cur.w, from: cur.h - s, rows: s });
      total += s;
      prev = cur;
      setState({ text: `스크롤하며 찍는 중… ${parts.length}장` });
      if (total > 30000) break; // 너무 길면 그만
    }
  } finally {
    if (screen.dipToScreenPoint) {
      const p = screen.dipToScreenPoint(back);
      wheelProc().stdin.write(`${Math.round(p.x)} ${Math.round(p.y)} 0\n`);
    }
    setState({ mode: rec ? "rec" : "idle", text: "" });
  }
  // 이어 붙이기
  const w = parts[0].w;
  const out = Buffer.alloc(w * total * 4);
  let y = 0;
  for (const p of parts) {
    p.bmp.copy(out, y * w * 4, p.from * w * 4, (p.from + p.rows) * w * 4);
    y += p.rows;
  }
  const { nativeImage } = require("electron");
  const img = nativeImage.createFromBitmap(out, { width: w, height: total });
  saveImage(img, `스크롤 ${parts.length}장`);
}

/* ───────── 녹화 ───────── */

async function recStart(kind) {
  if (rec) return;
  let d, area = null;
  if (kind === "area") {
    const r = await choose("area", "녹화할 곳을 마우스로 끌어 고르세요 · Esc 취소");
    if (!r) return;
    d = r.d;
    area = r.r;
  } else {
    d = await pickDisplay("이 모니터를 녹화하려면 누르세요");
    if (!d) return;
  }
  const { id } = await grab(d, true);
  const sf = d.scaleFactor || 1;
  // 끝나면 .mp4 로 바뀌니까 .mp4 도 같이 보고 이름을 정한다 (앞 녹화를 덮어쓰지 않게)
  const dir = outDir("화면녹화"), base = `${ymd()} 화면녹화`;
  let file = path.join(dir, `${base}.webm`);
  for (let i = 2; fs.existsSync(file) || fs.existsSync(file.replace(/\.webm$/, ".mp4")); i++) file = path.join(dir, `${base}_${i}.webm`);
  rec = { file, fd: fs.openSync(file, "w"), kind, d, area, chain: Promise.resolve(), done: null };
  // 영역 녹화 — 고른 곳 둘레에 테두리 (녹화에는 안 찍힘)
  if (area) {
    const m = 4;
    frame = makeWin({ x: Math.round(d.bounds.x + area.x - m), y: Math.round(d.bounds.y + area.y - m), width: Math.round(area.w + m * 2), height: Math.round(area.h + m * 2), focusable: false, alwaysOnTop: true, enableLargerThanScreen: true, title: "녹화 영역" }, "frame.html", {});
    frame.setAlwaysOnTop(true, "screen-saver");
    frame.setIgnoreMouseEvents(true);
    hideFromCapture(frame);
    frame.once("ready-to-show", () => alive(frame) && frame.showInactive());
  }
  recWin = makeWin({ width: 320, height: 200, focusable: false, title: "녹화" }, "rec.html", { sourceId: id, w: Math.round(d.bounds.width * sf), h: Math.round(d.bounds.height * sf), mic: getPrefs().mic });
  setState({ mode: "rec", startedAt: Date.now(), text: "" });
  log.info(`[화면녹화] 시작 ${kind} ${file}`);
}

/** 녹화 끝 — 숨은 창이 마지막 조각을 보내면(rec-ended) 마무리 */
function recStop() {
  if (!rec || rec.stopping) return;
  rec.stopping = true;
  setState({ mode: "busy", text: "녹화 영상을 정리하는 중…" });
  if (alive(recWin)) recWin.webContents.send("snap:rec-stop");
  else recFinish();
}

async function recFinish(errMsg) {
  const r = rec;
  if (!r) return;
  await r.chain.catch(() => {});
  try {
    fs.closeSync(r.fd);
  } catch {}
  rec = null;
  if (alive(recWin)) recWin.close();
  recWin = null;
  if (alive(frame)) frame.close();
  frame = null;
  try {
    if (errMsg) throw new Error(errMsg);
    if (!fs.existsSync(r.file) || fs.statSync(r.file).size < 1000) throw new Error("녹화된 내용이 없어요.");
    const mp4 = r.file.replace(/\.webm$/, ".mp4");
    const n = (v) => v.toFixed(5);
    let vf;
    if (r.area) {
      const a = r.area, b = r.d.bounds;
      vf = `crop=iw*${n(a.w / b.width)}:ih*${n(a.h / b.height)}:iw*${n(a.x / b.width)}:ih*${n(a.y / b.height)},scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p`;
    } else vf = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p";
    const enc = await ff().encoder();
    await ff().run(ff().ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", r.file, "-vf", vf, "-r", "30", ...enc.args("fast"), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", mp4]);
    fs.rmSync(r.file, { force: true });
    copyFile(mp4);
    log.info(`[화면녹화] 끝 → ${mp4}`);
    const sec = Math.round((Date.now() - state.startedAt) / 1000);
    showToast({ kind: "video", file: mp4, name: path.basename(mp4), size: `${Math.floor(sec / 60)}분 ${sec % 60}초` });
  } catch (e) {
    log.warn(`[화면녹화] 실패: ${e.message}`);
    showToast({ kind: "error", name: "녹화를 저장하지 못했어요", size: e.message });
  } finally {
    setState({ mode: "idle", text: "", startedAt: 0 });
  }
}

/** 파일을 클립보드에 (탐색기에서 [복사]한 것처럼 — 카톡에 Ctrl+V 하면 파일로 붙는다) */
function copyFile(file) {
  try {
    const q = file.replace(/'/g, "''");
    spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Set-Clipboard -LiteralPath '${q}'`], { windowsHide: true }).on("error", () => {});
  } catch {}
}

/* ───────── 알림 ───────── */

function showToast(info) {
  if (alive(toast)) toast.close();
  const d = alive(bar) ? screen.getDisplayMatching(bar.getBounds()) : cursorDisplay();
  const W = 340, H = info.kind === "image" ? 280 : 132, wa = d.workArea;
  toast = makeWin({ width: W, height: H, x: wa.x + wa.width - W - 104, y: wa.y + wa.height - H - 16, focusable: false, alwaysOnTop: true, title: "찍었어요" }, "toast.html", info);
  toast.setAlwaysOnTop(true, "screen-saver");
  hideFromCapture(toast);
  toast.once("ready-to-show", () => alive(toast) && toast.showInactive());
  toast.on("closed", () => (toast = null));
}

/* ───────── 명령 ───────── */

let running = false;
async function run(cmd) {
  if (running && cmd !== "rec-stop" && cmd !== "scroll-stop") return;
  log.info(`[화면캡처] 누름 ${cmd}${running ? " (다른 일 하는 중)" : ""}`);
  if (cmd === "rec-stop") return recStop();
  if (cmd === "scroll-stop") return void (scrollStop = true);
  if (rec && (cmd === "rec-full" || cmd === "rec-area")) return;
  running = true;
  try {
    if (cmd === "area") await captureArea();
    else if (cmd === "full") await captureFull();
    else if (cmd === "scroll") await captureScroll();
    else if (cmd === "rec-full") await recStart("full");
    else if (cmd === "rec-area") await recStart("area");
  } catch (e) {
    log.warn(`[화면캡처] ${cmd} 실패: ${e.message}`);
    showToast({ kind: "error", name: "찍지 못했어요", size: e.message });
    setState({ mode: rec ? "rec" : "idle", text: "" });
  } finally {
    running = false;
  }
}

let dragFrom = null;
function register(getMain) {
  ipcMain.handle("snap:open", (e) => open(BrowserWindow.fromWebContents(e.sender) || (getMain && getMain())));
  ipcMain.handle("snap:init", (e) => ({ ...(inits.get(e.sender.id) || {}), state: { ...state, mic: getPrefs().mic } }));
  ipcMain.handle("snap:cmd", async (e, c, a) => {
    switch (c) {
      case "close":
        return close();
      case "mic":
        setPrefs({ mic: !getPrefs().mic });
        return setState({});
      case "folder":
        return void shell.openPath(outDir(a === "video" ? "화면녹화" : "화면캡쳐"));
      case "ink": {
        const d = alive(bar) ? screen.getDisplayMatching(bar.getBounds()) : cursorDisplay();
        if (!ink().isOpen()) ink().open(d);
        await sleep(300);
        return ink().f9();
      }
      case "drag-start":
        dragFrom = alive(bar) ? bar.getPosition() : null;
        return;
      case "drag":
        if (dragFrom && alive(bar)) bar.setPosition(Math.round(dragFrom[0] + a.dx), Math.round(dragFrom[1] + a.dy));
        return;
      // 고르기 창
      case "sel-done": {
        const w = BrowserWindow.fromWebContents(e.sender);
        const d = screen.getAllDisplays().find((x) => w && x.id === w.displayId);
        return endPick(d ? { d, r: a } : null);
      }
      case "sel-pick": {
        const w = BrowserWindow.fromWebContents(e.sender);
        const d = screen.getAllDisplays().find((x) => w && x.id === w.displayId);
        return endPick(d ? { d } : null);
      }
      case "sel-cancel":
        return cancelPick();
      // 알림
      case "toast-close":
        return void (alive(toast) && toast.close());
      case "toast-reveal":
        return void (a && shell.showItemInFolder(a));
      case "toast-open":
        return void (a && shell.openPath(a));
      case "toast-photo": {
        // 이미지제작으로 — 막대를 닫고 스튜디오 창에서 그 그림을 연다
        if (alive(toast)) toast.close();
        close();
        if (main && !main.isDestroyed()) main.webContents.send("snap:photo", a);
        return;
      }
      // 녹화 창
      case "rec-chunk":
        if (rec) {
          const r = rec;
          r.chain = r.chain.then(() => fs.writeSync(r.fd, Buffer.from(a)));
          await r.chain;
        }
        return;
      case "rec-ended":
        return recFinish();
      case "rec-error":
        log.warn(`[화면녹화] 녹화 창 오류: ${a}`);
        return recFinish(String(a || "녹화를 시작하지 못했어요."));
      default:
        return run(c);
    }
  });
  app.on("will-quit", () => {
    unregisterKeys();
    try {
      if (wheelPs) wheelPs.kill();
    } catch {}
  });
}

module.exports = { register, open, close };
