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

/** 녹화 중 큰 창을 내리면 — 녹화하는 모니터 위쪽 가운데에 작은 막대. 막대는 녹화에 찍히지 않게(화면 캡처 제외) */
async function openMini() {
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
    mini = new BrowserWindow({
      width: W,
      height: H,
      x: Math.round(wa.x + (wa.width - W) / 2),
      y: wa.y + 12,
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
    win.webContents.setBackgroundThrottling(true);
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
  ipcMain.handle("video:record-live", (e, on, startedAt) => {
    if (!on) return endLive(), true;
    const win = winOf(e);
    if (!win || live) return true;
    win.webContents.setBackgroundThrottling(false);
    live = { win, startedAt: Number(startedAt) || Date.now(), onMin: () => openMini(), onRestore: () => closeMini() };
    win.on("minimize", live.onMin);
    win.on("restore", live.onRestore);
    return true;
  });
  ipcMain.handle("video:record-minimize", (e) => {
    const win = winOf(e);
    if (win) win.minimize();
    return true;
  });
  ipcMain.on("record-mini:expand", () => live && showBig(live.win));
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
module.exports = { register, setupCapture, openFile, wantsAsk, leave };
