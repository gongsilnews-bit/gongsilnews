// 공실마케팅 저장 위치 — 기본은 문서\공실마케팅, 회원이 언제든 다른 곳(D 드라이브·외장하드)으로 옮길 수 있다 (2026-10-23 사장님)
//
//  · 설치는 한 번 클릭 그대로. 처음 켤 때 문서\공실마케팅 를 만든다.
//  · 처음 켤 때 한 번만 — 문서 폴더가 OneDrive 안이거나 그 드라이브에 자리가 적으면 [위치 바꾸기]를 권한다.
//  · [바꾸기]: 폴더를 고르면 공실마케팅 폴더를 통째로 옮기고(01~09 그대로), 앱 설정 파일 안의 예전 경로도 고친 뒤 앱을 다시 켠다.
//  · 외장하드: 켤 때 빠져 있으면 [다시 확인] [이번만 문서 폴더 쓰기] [다른 위치 고르기] 를 묻는다.
//  · 고른 곳에 이미 공실마케팅 폴더가 있으면(다른 PC 에서 쓰던 외장하드) 옮기지 않고 그 폴더를 그대로 쓴다.
const { app, dialog, shell, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

// 폴더 이름 (2026-10-29 사장님: 공실스튜디오 → 공실마케팅, 앱 이름과 같게). 예전 이름 폴더는 켤 때 한 번 이름만 바꾼다 (renameOld)
const NAME = "공실마케팅";
const OLD_NAME = "공실스튜디오";
const cfgFile = () => path.join(app.getPath("userData"), "storage-root.json");
const defaultRoot = () => path.join(app.getPath("documents"), NAME);

let cfg = null;
let offline = false; // 고른 곳(외장하드)이 빠져 있어 이번만 기본 위치를 쓰는 중
function read() {
  if (cfg) return cfg;
  try {
    const v = JSON.parse(fs.readFileSync(cfgFile(), "utf8"));
    cfg = { root: typeof v.root === "string" && path.isAbsolute(v.root) ? v.root : "", asked: Boolean(v.asked), moved: Array.isArray(v.moved) ? v.moved.filter((m) => m && m.from && m.to) : [] };
  } catch {
    cfg = { root: "", asked: false, moved: [] };
  }
  renameOld();
  return cfg;
}
/* 예전 공실스튜디오 폴더 → 같은 자리의 공실마케팅 (이름만 바꾸니 바로 끝난다). 앱 설정 파일 안의 예전 경로도 고친다.
   못 바꾸면(파일이 열려 있음·외장하드 빠짐) 예전 폴더를 그대로 쓴다 — 다음에 켤 때 다시 해 본다 */
function renameOld() {
  const old = cfg.root ? (path.basename(cfg.root) === OLD_NAME ? cfg.root : "") : path.join(app.getPath("documents"), OLD_NAME);
  if (!old || !fs.existsSync(old)) return;
  const to = path.join(path.dirname(old), NAME);
  if (fs.existsSync(to)) { if (!cfg.root) cfg.root = old; return; } // 둘 다 있으면 손대지 않고 쓰던 곳을 그대로
  try {
    fs.renameSync(old, to);
    write({ ...(cfg.root ? { root: to } : {}), moved: [...cfg.moved, { from: old, to }] });
    try { rewritePaths(old, to); } catch {}
  } catch {
    if (!cfg.root) cfg.root = old; // 이번엔 예전 폴더 그대로 (저장은 안 한다)
  }
}
function write(patch) {
  cfg = { ...read(), ...patch };
  fs.mkdirSync(path.dirname(cfgFile()), { recursive: true });
  fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 1));
}

/** 예전 위치(공실스튜디오 이름·옮기기 전)의 경로를 지금 위치로 — 없으면 그대로. 옮긴 뒤에 연 작업 파일(.gss) 안의 경로용 */
function remap(p) {
  if (typeof p !== "string" || !p || !/^[a-z]:[\\/]/i.test(p)) return p;
  for (const m of [...read().moved].reverse()) {
    const r = path.relative(m.from, p);
    if (r && !r.startsWith("..") && !path.isAbsolute(r)) {
      const q = path.join(m.to, r);
      if (!fs.existsSync(p) && fs.existsSync(q)) return remap(q);
    }
  }
  return p;
}

/** 지금 쓰는 공실마케팅 폴더 */
const root = () => (!offline && read().root) || defaultRoot();
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const inside = (child, parent) => { const r = path.relative(parent, child); return r === "" || (!r.startsWith("..") && !path.isAbsolute(r)); };
const reachable = (p) => { try { return fs.existsSync(path.parse(p).root) && fs.existsSync(p); } catch { return false; } };
function freeBytes(p) {
  try {
    let d = p;
    while (!fs.existsSync(d) && path.dirname(d) !== d) d = path.dirname(d);
    const s = fs.statfsSync(d);
    return s.bavail * s.bsize;
  } catch { return -1; }
}
const gb = (n) => `${(n / 1024 ** 3).toFixed(n >= 10 * 1024 ** 3 ? 0 : 1)}GB`;
const isOneDrive = (p) => /\\onedrive[^\\]*\\/i.test(path.resolve(p) + "\\");

/** 화면에 보일 정보 */
function info() {
  const r = root();
  return { root: r, isDefault: same(r, defaultRoot()), offline, chosen: read().root || "", freeGB: Math.floor(Math.max(0, freeBytes(r)) / 1024 ** 3), oneDrive: isOneDrive(r) };
}
const openFolder = () => { try { fs.mkdirSync(root(), { recursive: true }); } catch {} return shell.openPath(root()); };

/* ── 켤 때 ── */
async function startup() {
  const c = read();
  // 외장하드에 두었는데 빠져 있다
  while (c.root && !reachable(c.root)) {
    const { response } = await dialog.showMessageBox({
      type: "warning", title: "공실마케팅 저장 위치",
      message: "저장 위치를 찾을 수 없어요",
      detail: `${c.root}\n\n외장하드나 USB 가 빠져 있나요? 연결한 뒤 [다시 확인]을 눌러 주세요.\n[이번만 문서 폴더 쓰기]를 누르면 이번에 만드는 것은 문서\\${NAME} 에 저장돼요.`,
      buttons: ["다시 확인", "이번만 문서 폴더 쓰기", "다른 위치 고르기"], defaultId: 0, cancelId: 1, noLink: true,
    });
    if (response === 0) continue;
    if (response === 1) { offline = true; break; }
    const picked = await pickFolder(null);
    if (!picked) continue;
    // 빠진 곳에서는 옮길 수 없다 — 새 곳을 그대로 쓴다
    write({ root: picked, asked: true });
  }
  if (!c.asked) {
    write({ asked: true });
    const r = root(), free = freeBytes(r), od = isOneDrive(r);
    if (od || (free >= 0 && free < 30 * 1024 ** 3)) {
      const why = od
        ? "문서 폴더가 OneDrive 안에 있어요. 녹화·완성 영상이 모두 인터넷에 올라가 OneDrive 용량이 금방 차요."
        : `이 드라이브에 남은 자리가 ${gb(free)} 뿐이에요. 영상은 몇 GB 씩 쌓여요.`;
      const { response } = await dialog.showMessageBox({
        type: "info", title: "공실마케팅 저장 위치",
        message: `공실마케팅 폴더를 ${r} 에 만들어요`,
        detail: `${why}\n\nD 드라이브나 외장하드로 옮기는 것을 권해요. 나중에 왼쪽 아래 [저장 위치]에서도 언제든 바꿀 수 있어요.`,
        buttons: ["위치 바꾸기", "그대로 쓰기"], defaultId: 0, cancelId: 1, noLink: true,
      });
      if (response === 0) return choose(null, { restart: false });
    }
  }
  return null;
}

/** 폴더 고르기 → 그 안의 공실마케팅 경로 (고른 폴더 이름이 이미 공실마케팅면 그대로) */
async function pickFolder(win) {
  const cur = root();
  const r = await dialog.showOpenDialog(win || undefined, {
    title: "공실마케팅 폴더를 둘 곳 고르기 (D 드라이브·외장하드도 돼요)",
    defaultPath: path.dirname(cur),
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "여기에 두기",
  });
  if (r.canceled || !r.filePaths[0]) return "";
  const p = r.filePaths[0];
  return path.basename(p) === NAME || path.basename(p) === OLD_NAME ? p : path.join(p, NAME);
}

function walk(d, acc = { files: 0, bytes: 0 }) {
  let list = [];
  try { list = fs.readdirSync(d, { withFileTypes: true }); } catch { return acc; }
  for (const e of list) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else { acc.files++; try { acc.bytes += fs.statSync(p).size; } catch {} }
  }
  return acc;
}
const hasFiles = (d) => { try { return fs.readdirSync(d).length > 0; } catch { return false; } };

/** 옮기는 동안 보이는 작은 창 */
function progressWindow(parent) {
  const w = new BrowserWindow({ width: 440, height: 150, parent: parent || undefined, modal: Boolean(parent), resizable: false, minimizable: false, maximizable: false, closable: false, title: "공실마케팅 옮기는 중", autoHideMenuBar: true, webPreferences: { sandbox: true } });
  w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`<body style="margin:0;font:14px 'Malgun Gothic';padding:22px;background:#fff;color:#111"><b>공실마케팅 폴더를 옮기는 중이에요</b><div id=t style="margin-top:12px;color:#555">준비 중…</div><div style="margin-top:12px;height:8px;background:#e5e7eb;border-radius:4px"><div id=b style="height:8px;width:0;background:#2563eb;border-radius:4px"></div></div></body>`));
  return {
    set(text, pct) { if (!w.isDestroyed()) w.webContents.executeJavaScript(`t.textContent=${JSON.stringify(text)};b.style.width='${Math.round(pct)}%'`).catch(() => {}); },
    close() { if (!w.isDestroyed()) { w.setClosable(true); w.close(); } },
  };
}

/** 한 파일씩 옮기기 — 같은 드라이브면 이름만 바꾸고, 다른 드라이브(외장하드)면 복사 후 지운다 */
async function moveTree(from, to, onFile) {
  await fs.promises.mkdir(to, { recursive: true });
  for (const e of await fs.promises.readdir(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) { await moveTree(a, b, onFile); await fs.promises.rmdir(a).catch(() => {}); continue; }
    if (fs.existsSync(b)) { onFile(a, 0, true); continue; } // 이미 있으면 덮어쓰지 않고 남겨 둔다
    const size = (await fs.promises.stat(a)).size;
    try { await fs.promises.rename(a, b); }
    catch (err) {
      if (err.code !== "EXDEV") throw err;
      await fs.promises.copyFile(a, b);
      await fs.promises.unlink(a);
    }
    onFile(a, size, false);
  }
}

/** 앱 설정 파일(userData 의 .json) 안의 예전 경로를 새 경로로 — 최근 파일·저장 폴더·내 템플릿 목록 등 */
function rewritePaths(oldRoot, newRoot) {
  const forms = (p) => [p, JSON.stringify(p).slice(1, -1), p.replace(/\\/g, "/")];
  const olds = forms(oldRoot), news = forms(newRoot);
  const ud = app.getPath("userData");
  const skip = /^(Cache|Code Cache|GPUCache|DawnCache|DawnGraphiteCache|DawnWebGPUCache|Partitions|IndexedDB|Local Storage|Session Storage|Service Worker|blob_storage|Crashpad|logs|models|Shared Dictionary)$/i;
  const files = [];
  const scan = (d, depth) => {
    let list = [];
    try { list = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of list) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (depth < 2 && !skip.test(e.name)) scan(p, depth + 1); }
      else if (/\.json$/i.test(e.name) && e.name !== "storage-root.json") files.push(p);
    }
  };
  scan(ud, 0);
  let changed = 0;
  for (const f of files) {
    try {
      if (fs.statSync(f).size > 8 * 1024 * 1024) continue;
      let s = fs.readFileSync(f, "utf8"), t = s;
      olds.forEach((o, i) => { t = t.split(o).join(news[i]); });
      // 영상 주소(studio-media://f/<경로 base64>) 안의 경로도
      t = t.replace(/studio-media:\/\/f\/([A-Za-z0-9_-]+)/g, (all, b) => {
        const f = Buffer.from(b, "base64url").toString("utf8");
        const r = path.relative(oldRoot, f);
        return r && !r.startsWith("..") && !path.isAbsolute(r) ? `studio-media://f/${Buffer.from(path.join(newRoot, r), "utf8").toString("base64url")}` : all;
      });
      if (t !== s) { fs.writeFileSync(f, t); changed++; }
    } catch {}
  }
  return changed;
}

let busy = false;
/** [저장 위치 바꾸기] — 고르고 → 옮기고 → 다시 켜기 */
async function choose(win, { restart = true } = {}) {
  if (busy) return { ok: false, error: "이미 옮기는 중이에요" };
  if (BrowserWindow.getAllWindows().some((w) => /녹화 중|영상 녹화하기|프롬프터/.test(w.getTitle()))) {
    await dialog.showMessageBox(win || undefined, { type: "warning", message: "녹화 중에는 저장 위치를 바꿀 수 없어요", detail: "녹화를 마친 뒤 다시 해 주세요.", buttons: ["확인"] });
    return { ok: false };
  }
  // 열린 편집 파일이 옮기는 중에 저장되면 꼬인다 — 먼저 저장하게
  let dirty = 0;
  try { dirty = require("./photo/ipc").dirtyCount() + require("./doc/ipc").dirtyCount(); } catch {}
  if (dirty > 0) {
    await dialog.showMessageBox(win || undefined, { type: "warning", message: "저장하지 않은 파일이 있어요", detail: "이미지제작·문서편집에서 저장(Ctrl+S)한 뒤 다시 해 주세요.", buttons: ["확인"] });
    return { ok: false };
  }
  const from = root();
  const to = await pickFolder(win);
  if (!to) return { ok: false };
  if (same(from, to)) return { ok: false, error: "지금 쓰는 위치와 같아요" };
  if (inside(to, from)) {
    await dialog.showMessageBox(win || undefined, { type: "warning", message: "지금 공실마케팅 폴더 안으로는 옮길 수 없어요", buttons: ["확인"] });
    return { ok: false };
  }
  if (isOneDrive(to)) {
    const { response } = await dialog.showMessageBox(win || undefined, { type: "warning", message: "OneDrive 안이에요", detail: "영상이 모두 인터넷에 올라가 용량이 금방 차요. 그래도 여기에 둘까요?", buttons: ["다른 곳 고르기", "그래도 여기에"], defaultId: 0, cancelId: 0, noLink: true });
    if (response === 0) return choose(win, { restart });
  }

  // 다른 PC 에서 쓰던 외장하드처럼 이미 공실마케팅 폴더가 있으면 — 옮기지 않고 그 폴더를 쓴다
  if (hasFiles(to)) {
    const { response } = await dialog.showMessageBox(win || undefined, {
      type: "question", title: "공실마케팅 저장 위치",
      message: "그곳에 이미 공실마케팅 폴더가 있어요",
      detail: `${to}\n\n[그 폴더 쓰기]: 지금 폴더(${from})의 파일은 옮기지 않고 그대로 두고, 앞으로 그 폴더를 써요.\n[합쳐서 옮기기]: 지금 폴더의 파일을 그 폴더로 옮겨요 (이름이 같은 파일은 지금 폴더에 남겨 둬요).`,
      buttons: ["그 폴더 쓰기", "합쳐서 옮기기", "취소"], defaultId: 0, cancelId: 2, noLink: true,
    });
    if (response === 2) return { ok: false };
    if (response === 0) { write({ root: to, asked: true }); offline = false; return finish(win, to, restart, "그 폴더를 쓰도록 바꿨어요"); }
  }

  // 아직 아무것도 없으면(처음 켤 때) 옮길 것 없이 위치만
  if (!hasFiles(from)) { try { fs.rmdirSync(from); } catch {} write({ root: to, asked: true }); offline = false; return finish(win, to, restart, "저장 위치를 바꿨어요"); }
  const { files, bytes } = walk(from);
  const free = freeBytes(to);
  if (free >= 0 && free < bytes + 1024 ** 3) {
    await dialog.showMessageBox(win || undefined, { type: "warning", message: "자리가 모자라요", detail: `옮길 파일 ${gb(bytes)} · 그곳의 남은 자리 ${gb(free)}`, buttons: ["확인"] });
    return { ok: false };
  }
  const sameDrive = path.parse(from).root.toLowerCase() === path.parse(to).root.toLowerCase();
  const { response } = await dialog.showMessageBox(win || undefined, {
    type: "question", title: "공실마케팅 저장 위치",
    message: "공실마케팅 폴더를 옮길까요?",
    detail: `${from}\n→ ${to}\n\n파일 ${files.toLocaleString()}개 · ${gb(bytes)}${sameDrive ? "" : " — 다른 드라이브라 복사하는 데 몇 분 걸릴 수 있어요"}.\n편집 중인 동영상은 먼저 저장해 주세요. 옮기는 동안 앱을 끄거나 외장하드를 빼지 마세요.${restart ? " 끝나면 앱이 다시 켜져요." : ""}`,
    buttons: ["옮기기", "취소"], defaultId: 0, cancelId: 1, noLink: true,
  });
  if (response !== 0) return { ok: false };

  busy = true;
  const pw = progressWindow(win);
  let done = 0, doneBytes = 0, kept = 0;
  try {
    await moveTree(from, to, (_f, size, skipped) => {
      done++; doneBytes += size; if (skipped) kept++;
      if (done % 5 === 0 || done === files) pw.set(`${done.toLocaleString()} / ${files.toLocaleString()} 파일 · ${gb(doneBytes)}`, bytes ? (doneBytes / bytes) * 100 : (done / Math.max(1, files)) * 100);
    });
    if (!kept) await fs.promises.rmdir(from).catch(() => {});
    write({ root: to, asked: true, moved: [...read().moved, { from, to }] });
    offline = false;
    rewritePaths(from, to);
  } catch (e) {
    pw.close(); busy = false;
    await dialog.showMessageBox(win || undefined, { type: "error", message: "옮기다가 멈췄어요", detail: `${e.message}\n\n저장 위치는 그대로(${from})예요. 이미 옮겨진 파일은 ${to} 에 있어요.`, buttons: ["확인"] });
    return { ok: false, error: e.message };
  }
  pw.close(); busy = false;
  return finish(win, to, restart, kept ? `다 옮겼어요. 이름이 같은 파일 ${kept}개는 예전 폴더에 남겨 뒀어요.` : "다 옮겼어요");
}

async function finish(win, to, restart, msg) {
  if (!restart) return { ok: true, root: to }; // 처음 켤 때 — 아직 앱 창 전이라 다시 켤 필요 없음
  await dialog.showMessageBox(win || undefined, { type: "info", message: msg, detail: `이제 ${to} 에 저장해요.\n앱을 다시 켤게요.`, buttons: ["확인"] });
  app.relaunch();
  app.quit(); // 열린 창이 평소처럼 닫히게 (exit 는 저장 확인을 건너뛴다)
  return { ok: true, root: to };
}

module.exports = { remap, root, defaultRoot, info, startup, choose, openFolder };
