// 문서편집 (워드·한글) — 편집 화면(웹)과 PC(앱)를 잇는 통로. preload 의 gongsilStudio.doc.* 가 부른다. (2026-10-22)
//  .docx · .hwpx 읽기·쓰기는 편집 화면 안에서 (직접 만든 변환) — 여기는 파일 고르기·읽기·쓰기·최근 파일·PDF·인쇄·.hwp 변환(Java)
const { ipcMain, dialog, shell, app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const java = require("./java");

let dirty = 0;
const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
const recentFile = () => path.join(app.getPath("userData"), "doc-recent.json");
const defaultDir = () => {
  const d = require("../studio-root").dir("doc"); // 문서\공실스튜디오\03 문서편집 (2026-10-23 저장 폴더 하나로)
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
};
const OPEN_FILTERS = [
  { name: "모든 문서", extensions: ["docx", "hwpx", "hwp", "txt", "html", "htm", "md"] },
  { name: "Word 문서", extensions: ["docx"] },
  { name: "한글 문서", extensions: ["hwpx", "hwp"] },
  { name: "텍스트", extensions: ["txt", "md", "html", "htm"] },
];
const SAVE_FILTERS = {
  docx: { name: "Word 문서 (*.docx)", extensions: ["docx"] },
  hwpx: { name: "한글 문서 (*.hwpx)", extensions: ["hwpx"] },
  hwp: { name: "한글 97~2010 문서 (*.hwp)", extensions: ["hwp"] },
  pdf: { name: "PDF (*.pdf)", extensions: ["pdf"] },
  png: { name: "PNG 그림 (*.png)", extensions: ["png"] },
  jpg: { name: "JPG 그림 (*.jpg)", extensions: ["jpg", "jpeg"] },
  txt: { name: "일반 텍스트 (*.txt)", extensions: ["txt"] },
  html: { name: "웹 페이지 (*.html)", extensions: ["html"] },
};
const MAX = 200 * 1024 * 1024;
const toBuf = (bytes) => Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []));
const u8 = (buf) => new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

function readRecent() {
  try { const l = JSON.parse(fs.readFileSync(recentFile(), "utf8")); return Array.isArray(l) ? l : []; } catch { return []; }
}
function writeRecent(list) { try { fs.writeFileSync(recentFile(), JSON.stringify(list.slice(0, 30))); } catch {} }
function addRecent(file, thumb) {
  const old = readRecent();
  const prev = old.find((x) => x.path === file);
  writeRecent([{ path: file, name: path.basename(file), at: Date.now(), thumb: thumb || (prev && prev.thumb) || "", pinned: Boolean(prev && prev.pinned) }, ...old.filter((x) => x.path !== file)]);
}

/* ── .hwp (예전 한글) — 앱에 든 변환기(hwplib, Java)로 .hwpx 처럼 읽고 쓴다 ── */
const toolJar = () => {
  const cands = [path.join(process.resourcesPath || "", "hwp-tool", "gongsil-hwp.jar"), path.join(__dirname, "..", "..", "hwp-tool", "gongsil-hwp.jar")];
  return cands.find((p) => p && fs.existsSync(p)) || "";
};
async function runTool(args) {
  const j = await java.find();
  if (!j) { const err = new Error("한글(.hwp) 파일을 다루려면 Java 가 필요해요"); err.code = "NO_JAVA"; throw err; }
  const jar = toolJar();
  if (!jar) throw new Error("한글 변환기(gongsil-hwp.jar)가 앱에 없어요 — 앱을 새로 받아 주세요");
  return new Promise((res, rej) => {
    execFile(j.exe, ["-Dfile.encoding=UTF-8", "-jar", jar, ...args], { timeout: 120000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (err, out, se) => {
      if (err) return rej(new Error(String(se || err.message || err).trim().split("\n").slice(-3).join(" ") || "변환하지 못했어요"));
      res(String(out || ""));
    });
  });
}
const tmpDir = () => { const d = path.join(app.getPath("temp"), "gongsil-doc"); fs.mkdirSync(d, { recursive: true }); return d; };
const tmpName = (ext) => path.join(tmpDir(), `d${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`);
/** .hwp → .hwpx 바이트 */
async function hwpToHwpx(file) {
  const out = tmpName("hwpx");
  await runTool(["to-hwpx", file, out]);
  try { return u8(fs.readFileSync(out)); } finally { try { fs.unlinkSync(out); } catch {} }
}
/** .hwpx 바이트 → .hwp 파일 */
async function hwpxToHwp(bytes, target) {
  const inp = tmpName("hwpx");
  fs.writeFileSync(inp, toBuf(bytes));
  try { await runTool(["to-hwp", inp, target]); } finally { try { fs.unlinkSync(inp); } catch {} }
}

function readOne(file) {
  const st = fs.statSync(file);
  if (st.size > MAX) throw new Error("파일이 너무 커요 (200MB 넘음)");
  return { path: file, name: path.basename(file), bytes: u8(fs.readFileSync(file)) };
}
async function readDoc(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  if (ext === "hwp") {
    const bytes = await hwpToHwpx(file);
    return { path: file, name: path.basename(file), bytes, as: "hwpx" };
  }
  return { ...readOne(file), as: ext };
}

/** 인쇄용 HTML 을 숨은 창에 띄운다 (PDF 로 굽기 · 프린터로) */
async function withPrintWindow(html, fn, origin) {
  const file = tmpName("html");
  fs.writeFileSync(file, html, "utf8");
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    // 편집 화면과 같은 곳(주소)에서 열어야 스튜디오 글꼴이 그대로 먹는다 — 빈 쪽을 열고 HTML 을 써 넣는다. 안 되면 파일로
    let loaded = false;
    if (/^https?:\/\//.test(String(origin || ""))) {
      try {
        await win.loadURL(`${origin}/studio-doc-print.html`);
        await win.webContents.executeJavaScript(`document.open();document.write(${JSON.stringify(html)});document.close();1`);
        loaded = true;
      } catch {}
    }
    if (!loaded) await win.loadFile(file);
    // 글꼴·그림이 다 올 때까지
    await win.webContents.executeJavaScript("Promise.all([document.fonts ? document.fonts.ready : 1, ...Array.from(document.images).map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))]).then(() => 1)");
    return await fn(win);
  } finally {
    try { win.destroy(); } catch {}
    setTimeout(() => { try { fs.unlinkSync(file); } catch {} }, 60000);
  }
}

const autoDir = () => { const d = path.join(app.getPath("userData"), "doc-autosave"); try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; };
const safeId = (id) => String(id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);

function register() {
  ipcMain.handle("doc:open", async (e) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "열기", defaultPath: defaultDir(), properties: ["openFile"], filters: OPEN_FILTERS });
    if (r.canceled || !r.filePaths.length) return null;
    const f = r.filePaths[0];
    try { const d = await readDoc(f); addRecent(f); return d; } catch (err) { return { path: f, name: path.basename(f), error: String((err && err.message) || err), code: err && err.code }; }
  });
  ipcMain.handle("doc:read", async (_e, file) => {
    if (!fs.existsSync(file)) return { path: file, name: path.basename(file), error: "파일을 찾을 수 없어요 (옮겼거나 지웠어요)" };
    try { const d = await readDoc(file); addRecent(file); return d; } catch (err) { return { path: file, name: path.basename(file), error: String((err && err.message) || err), code: err && err.code }; }
  });
  // 그림 넣기 (삽입 › 그림 › 이 디바이스)
  ipcMain.handle("doc:pick-images", async (e) => {
    const r = await dialog.showOpenDialog(winOf(e), { title: "그림 삽입", properties: ["openFile", "multiSelections"], filters: [{ name: "그림", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }] });
    if (r.canceled) return [];
    return r.filePaths.map((f) => { try { return readOne(f); } catch (err) { return { path: f, name: path.basename(f), error: String(err.message || err) }; } });
  });
  /** 저장 — file 이 없거나 ask 면 [다른 이름으로 저장] 창. ext: docx · hwpx · hwp · pdf · png · jpg · txt · html
   *  files: 그림 여러 장(쪽마다) — [{ name, bytes }] 이면 고른 폴더에 한꺼번에 */
  ipcMain.handle("doc:save", async (e, { file, name, ext = "docx", bytes, thumb, ask, files } = {}) => {
    let target = file;
    const base = String(name || "문서").replace(/[\\/:*?"<>|]/g, "_");
    if (files && files.length > 1) {
      const r = await dialog.showOpenDialog(winOf(e), { title: `그림 ${files.length}장을 저장할 폴더`, defaultPath: defaultDir(), properties: ["openDirectory", "createDirectory"] });
      if (r.canceled || !r.filePaths[0]) return { canceled: true };
      const out = [];
      for (const f of files) {
        const p = path.join(r.filePaths[0], String(f.name).replace(/[\\/:*?"<>|]/g, "_"));
        fs.writeFileSync(p, toBuf(f.bytes));
        out.push(p);
      }
      return { path: out[0], paths: out, name: path.basename(out[0]) };
    }
    if (!target || ask) {
      const r = await dialog.showSaveDialog(winOf(e), {
        title: ["docx", "hwpx", "hwp"].includes(ext) ? "다른 이름으로 저장" : "내보내기",
        // 예전 폴더(공실뉴스 문서·공실뉴스 스튜디오)에 있던 파일이면 03 문서편집 에서 연다 (2026-10-23 저장 폴더 하나로)
        defaultPath: path.join(file && ![require("../studio-root").oldDoc(), require("../studio-root").oldRoot()].some((o) => (path.dirname(file).toLowerCase() + path.sep).startsWith(o.toLowerCase() + path.sep)) ? path.dirname(file) : defaultDir(), `${base}.${ext}`),
        filters: [SAVE_FILTERS[ext] || SAVE_FILTERS.docx],
      });
      if (r.canceled || !r.filePath) return { canceled: true };
      target = r.filePath;
    }
    try {
      if (ext === "hwp") {
        const tmp = `${target}.saving`;
        await hwpxToHwp(bytes, tmp);
        fs.renameSync(tmp, target);
      } else {
        const tmp = `${target}.saving`;
        fs.writeFileSync(tmp, toBuf(bytes || (files && files[0] && files[0].bytes)));
        fs.renameSync(tmp, target);
      }
      if (["docx", "hwpx", "hwp"].includes(ext)) addRecent(target, thumb);
      return { path: target, name: path.basename(target) };
    } catch (err) {
      try { fs.unlinkSync(`${target}.saving`); } catch {}
      return { error: String((err && err.message) || err), code: err && err.code };
    }
  });
  ipcMain.handle("doc:recent", () => readRecent().map((x) => ({ ...x, missing: !fs.existsSync(x.path) })));
  ipcMain.handle("doc:recent-remove", (_e, file) => { writeRecent(readRecent().filter((x) => x.path !== file)); return true; });
  ipcMain.handle("doc:recent-pin", (_e, file, pinned) => { const l = readRecent(); const h = l.find((x) => x.path === file); if (h) h.pinned = Boolean(pinned); writeRecent(l); return true; });
  ipcMain.handle("doc:reveal", (_e, file) => { if (file && fs.existsSync(file)) shell.showItemInFolder(file); return true; });
  ipcMain.handle("doc:open-external", (_e, file) => { if (file && fs.existsSync(file)) shell.openPath(file); return true; });
  ipcMain.handle("doc:set-dirty", (_e, n) => { dirty = Number(n) || 0; return true; });
  ipcMain.handle("doc:info", (_e, file) => {
    try { const st = fs.statSync(file); return { size: st.size, created: st.birthtimeMs, modified: st.mtimeMs, dir: path.dirname(file) }; } catch { return null; }
  });
  // 자동 저장 (고칠 때마다 몇 초 뒤, 문서 JSON) — 앱이 꺼져도 다시 켜면 복구
  ipcMain.handle("doc:autosave-write", (_e, { id, name, file, json } = {}) => {
    const k = safeId(id);
    if (!k) return false;
    try { fs.writeFileSync(path.join(autoDir(), `${k}.json`), JSON.stringify({ id: k, name, file: file || "", at: Date.now(), json })); return true; } catch { return false; }
  });
  ipcMain.handle("doc:autosave-list", () => {
    try {
      return fs.readdirSync(autoDir()).filter((f) => f.endsWith(".json")).map((f) => {
        try { const j = JSON.parse(fs.readFileSync(path.join(autoDir(), f), "utf8")); return { id: j.id, name: j.name, file: j.file, at: j.at }; } catch { return null; }
      }).filter(Boolean).sort((a, b) => b.at - a.at);
    } catch { return []; }
  });
  ipcMain.handle("doc:autosave-read", (_e, id) => { try { return JSON.parse(fs.readFileSync(path.join(autoDir(), `${safeId(id)}.json`), "utf8")); } catch { return null; } });
  ipcMain.handle("doc:autosave-clear", (_e, id) => { try { fs.unlinkSync(path.join(autoDir(), `${safeId(id)}.json`)); } catch {} return true; });
  // PDF — 편집 화면이 쪽마다 나눈 인쇄용 HTML 을 보내면 숨은 창에서 PDF 로 (글자가 그대로 글자 — 찾기·복사 됨)
  ipcMain.handle("doc:pdf", async (_e, { html, wMm, hMm, origin } = {}) => {
    if (!html) return { error: "문서가 비었어요" };
    return withPrintWindow(html, async (win) => {
      const buf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, margins: { marginType: "none" }, pageSize: { width: wMm / 25.4, height: hMm / 25.4 } });
      return { bytes: u8(buf) };
    }, origin);
  });
  ipcMain.handle("doc:printers", async (e) => {
    const list = await e.sender.getPrintersAsync();
    return list.map((p) => ({ name: p.name, label: p.displayName || p.name, isDefault: Boolean(p.isDefault) }));
  });
  ipcMain.handle("doc:print", async (_e, { html, wMm, hMm, deviceName, copies = 1, dialog: ask = false, duplex = "simplex", color = true, pageRanges, origin } = {}) => {
    if (!html) return { ok: false, error: "인쇄할 문서가 없어요" };
    return withPrintWindow(html, (win) => new Promise((res) => {
      win.webContents.print({
        silent: !ask, deviceName: deviceName || undefined, copies: Math.max(1, Math.min(99, Math.round(copies) || 1)), printBackground: true, color,
        duplexMode: duplex, landscape: wMm > hMm, margins: { marginType: "none" },
        pageSize: { width: Math.round(Math.min(wMm, hMm) * 1000), height: Math.round(Math.max(wMm, hMm) * 1000) },
        ...(pageRanges && pageRanges.length ? { pageRanges } : {}),
      }, (ok, why) => res({ ok, error: ok ? undefined : /cancel/i.test(String(why)) ? "취소했어요" : why }));
    }), origin);
  });
  // 내 자료에 넣기 — 쪽 그림들을 스튜디오 폴더(문서)에 두고 영상·이미지 편집 [내 자료]에서 쓴다
  ipcMain.handle("doc:lib-add", async (_e, { files = [] } = {}) => {
    const library = require("../video/library");
    const dir = require("../studio-root").dir("doc");
    fs.mkdirSync(dir, { recursive: true });
    const saved = [];
    for (const f of files) {
      const p = path.join(dir, `${String(f.name || "문서").replace(/[\\/:*?"<>|]/g, "_")}`);
      fs.writeFileSync(p, toBuf(f.bytes));
      saved.push(p);
    }
    await library.add(saved, { source: "doc" });
    return { count: saved.length, dir };
  });
  /* AI — 내 AI(ChatGPT 등 연결한 것)로 글 쓰기·고치기. 숫자·사실은 지어내지 않는다 */
  ipcMain.handle("doc:ai", async (e, o = {}) => {
    const ai = require("../ai");
    const mode = String(o.mode || "edit");
    const text = String(o.text || "").slice(0, 12000);
    const req = String(o.request || "").slice(0, 1500);
    const rules = "규칙: 글에 있는 숫자·이름·날짜·주소·금액은 바꾸지 말고, 글에 없는 사실·숫자는 지어내지 마세요 (모르면 빈칸 ○○ 으로). 과장 광고 문구 금지. 한국어 맞춤법을 지키세요.";
    const head = {
      write: `당신은 한국 부동산 중개사무소의 문서 작성 도우미입니다. 회원 요청에 맞는 문서 본문을 써 주세요. 제목은 "# ", 소제목은 "## ", 목록은 "- " 로 시작하는 마크다운으로. 표가 필요하면 마크다운 표로.`,
      edit: "당신은 한국어 문서 교정·편집 도우미입니다. 아래 [글]을 회원 요청대로 고쳐 주세요. 원래 줄바꿈·문단 구조는 되도록 지키세요.",
      summary: "아래 [글]을 핵심만 짧게 요약해 주세요. 목록이 좋으면 \"- \" 로.",
      spell: "아래 [글]의 맞춤법·띄어쓰기·오타만 고쳐 주세요. 내용·말투는 바꾸지 마세요.",
      translate: "아래 [글]을 회원이 말한 말로 번역해 주세요. 줄바꿈 구조는 지키세요.",
    }[mode] || "";
    const prompt = [head, rules, req ? `회원 요청: ${req}` : "", "", text ? `[글]\n${text}` : "", "", '답은 JSON 으로만: {"text":"결과 글 (줄바꿈은 \\n)"}'].join("\n");
    const parse = (t) => { const m = /\{[\s\S]*\}/.exec(String(t || "")); try { const j = m ? JSON.parse(m[0]) : null; return j && typeof j.text === "string" ? j : null; } catch { return null; } };
    const out = await ai.ask(prompt, { onProgress: (t) => { try { e.sender.send("doc:ai-progress", t); } catch {} }, busyLabel: "문서를 쓰고 있습니다", isComplete: (t) => Boolean(parse(t)) });
    const j = parse(out);
    if (!j || !j.text.trim()) throw new Error("AI 답을 읽지 못했어요. 한 번 더 눌러 주세요.");
    return { text: j.text.trim() };
  });
  /* 한글(.hwp)용 Java — 앱 폴더에 내려받기 (PC 에 설치 안 함) */
  ipcMain.handle("doc:java-status", async () => ({ ...(await java.status()), tool: Boolean(toolJar()) }));
  ipcMain.handle("doc:java-install", (e) => java.install((t, f) => { try { e.sender.send("doc:java-progress", t, f); } catch {} }));
  ipcMain.handle("doc:java-remove", () => java.remove());
}

module.exports = { register, dirtyCount: () => dirty, clearDirty: () => { dirty = 0; } };
