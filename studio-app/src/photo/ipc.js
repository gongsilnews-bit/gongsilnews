// 이미지 편집 (포토랩) — 편집 화면(웹)과 PC(앱)를 잇는 통로. preload 의 gongsilStudio.photo.* 가 부른다.
// PSD 읽기·쓰기·그리기는 모두 편집 화면 안에서 (ag-psd) — 여기는 파일 고르기·읽기·쓰기·최근 파일만 (회의: docs/2026-10-19_photolab_meeting.md)
const { ipcMain, dialog, shell, app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

let dirty = 0; // 저장 안 한 문서 수 — 앱을 닫을 때 묻는다
const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
const recentFile = () => path.join(app.getPath("userData"), "photo-recent.json");
const defaultDir = () => {
  const d = require("../studio-root").dir("img"); // 문서\공실스튜디오\04 이미지제작
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
};
const OPEN_FILTERS = [
  { name: "포토샵·그림", extensions: ["psd", "psb", "png", "jpg", "jpeg", "webp", "gif", "bmp"] },
  { name: "포토샵 (PSD)", extensions: ["psd", "psb"] },
  { name: "그림", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] },
];
const MAX = 512 * 1024 * 1024; // 너무 큰 파일은 열지 않는다

function readRecent() {
  try {
    const list = JSON.parse(fs.readFileSync(recentFile(), "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function writeRecent(list) {
  try { fs.writeFileSync(recentFile(), JSON.stringify(list.slice(0, 24))); } catch {}
}
function addRecent(file, thumb) {
  const list = readRecent().filter((x) => x.path !== file);
  const old = readRecent().find((x) => x.path === file);
  list.unshift({ path: file, name: path.basename(file), at: Date.now(), thumb: thumb || (old && old.thumb) || "" });
  writeRecent(list);
}
function readOne(file) {
  const st = fs.statSync(file);
  if (st.size > MAX) throw new Error("파일이 너무 커요 (512MB 넘음)");
  const buf = fs.readFileSync(file);
  return { path: file, name: path.basename(file), bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) };
}
/* 자동 저장 (고칠 때마다 몇 초 뒤) — 앱이 갑자기 꺼져도 다시 켜면 복구 */
const autoDir = () => {
  const d = path.join(app.getPath("userData"), "photo-autosave");
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
};
const safeId = (id) => String(id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
/* 내 템플릿 — 문서\공실스튜디오\04 이미지제작\내템플릿\*.psd (+ 같은 이름 .json 메모). 예전 문서\공실뉴스 이미지\내 템플릿 도 같이 보인다 */
const tplDir = () => {
  const d = path.join(defaultDir(), "내템플릿");
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
};
const oldTplDir = () => path.join(require("../studio-root").oldImage(), "내 템플릿");
/* 다른 곳에 저장한 내 템플릿 목록 · 지난번에 고른 폴더 */
const tplIndexFile = () => path.join(app.getPath("userData"), "photo-templates.json");
const tplIndex = () => {
  try {
    const v = JSON.parse(fs.readFileSync(tplIndexFile(), "utf8"));
    return {
      files: Array.isArray(v.files) ? v.files.filter((f) => typeof f === "string" && path.isAbsolute(f)) : [],
      lastDir: typeof v.lastDir === "string" ? v.lastDir : "",
      hidden: Array.isArray(v.hidden) ? v.hidden.filter((f) => typeof f === "string") : [], // 목록에서 뺀 것 (소문자 경로)
    };
  } catch {
    return { files: [], lastDir: "", hidden: [] };
  }
};
const writeTplIndex = (v) => { try { fs.writeFileSync(tplIndexFile(), JSON.stringify(v)); } catch {} };
const toBuf = (bytes) => Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []));

function register() {
  try { defaultDir(); } catch {} // 켤 때 이미지편집 폴더를 만들어 둔다 (잠깐 쓴 "이미지" 폴더는 이름만 바꿈)
  // 열기 — 고른 파일들의 바이트
  ipcMain.handle("photo:open", async (e, { images = false } = {}) => {
    const r = await dialog.showOpenDialog(winOf(e), {
      title: images ? "사진 넣기" : "열기",
      defaultPath: defaultDir(),
      properties: ["openFile", "multiSelections"],
      filters: images ? [OPEN_FILTERS[2]] : OPEN_FILTERS,
    });
    if (r.canceled || !r.filePaths.length) return [];
    const out = [];
    for (const f of r.filePaths) {
      try {
        out.push(readOne(f));
        if (!images) addRecent(f);
      } catch (err) {
        out.push({ path: f, name: path.basename(f), error: String((err && err.message) || err) });
      }
    }
    return out;
  });
  // 최근 파일 다시 열기
  ipcMain.handle("photo:read", (_e, file) => {
    try {
      const r = readOne(file);
      addRecent(file);
      return r;
    } catch (err) {
      return { path: file, name: path.basename(file), error: fs.existsSync(file) ? String((err && err.message) || err) : "파일을 찾을 수 없어요 (옮겼거나 지웠어요)" };
    }
  });
  // 저장 — file 이 없으면 [다른 이름으로] 창. ext: psd | png | jpg
  ipcMain.handle("photo:save", async (e, { file, name, ext = "psd", bytes, thumb, ask } = {}) => {
    let target = file;
    if (!target || ask) {
      const base = String(name || "제목 없음").replace(/[\\/:*?"<>|]/g, "_");
      const FILTERS = { gif: { name: "GIF", extensions: ["gif"] }, webp: { name: "WebP", extensions: ["webp"] }, psd: { name: "포토샵 (PSD)", extensions: ["psd"] }, jpg: { name: "JPG", extensions: ["jpg", "jpeg"] }, png: { name: "PNG", extensions: ["png"] }, pdf: { name: "인쇄용 PDF (CMYK)", extensions: ["pdf"] }, tif: { name: "인쇄용 TIFF (CMYK)", extensions: ["tif", "tiff"] } };
      const filters = [FILTERS[ext] || FILTERS.png];
      // 예전 폴더(공실뉴스 이미지·공실뉴스 스튜디오)에 있던 파일이면 새 저장 폴더 공실스튜디오\04 이미지제작 에서 연다 (2026-10-23 저장 폴더 하나로)
      const sr = require("../studio-root");
      const inOld = (d) => [sr.oldImage(), sr.oldRoot()].some((o) => (d.toLowerCase() + path.sep).startsWith(o.toLowerCase() + path.sep));
      const startDir = file && !inOld(path.dirname(file)) ? path.dirname(file) : defaultDir();
      const r = await dialog.showSaveDialog(winOf(e), {
        title: ext === "psd" ? "다른 이름으로 저장" : "내보내기",
        defaultPath: path.join(startDir, `${base}.${ext}`),
        filters,
      });
      if (r.canceled || !r.filePath) return { canceled: true };
      target = r.filePath;
    }
    try {
      const tmp = `${target}.saving`;
      fs.writeFileSync(tmp, toBuf(bytes));
      fs.renameSync(tmp, target); // 쓰다 멈춰도 원본이 깨지지 않게
      if (ext === "psd") addRecent(target, thumb);
      else shell.showItemInFolder(target); // 웹용 저장·내보내기(PNG·JPG·PDF…) — 저장한 폴더를 열어 파일을 보여 준다 (2026-10-23 사장님)
      return { path: target, name: path.basename(target) };
    } catch (err) {
      return { error: String((err && err.message) || err) };
    }
  });
  ipcMain.handle("photo:recent", () => readRecent().map((x) => ({ ...x, missing: !fs.existsSync(x.path) })));
  ipcMain.handle("photo:recent-remove", (_e, file) => {
    writeRecent(readRecent().filter((x) => x.path !== file));
    return true;
  });
  ipcMain.handle("photo:recent-thumb", (_e, file, thumb) => {
    const list = readRecent();
    const hit = list.find((x) => x.path === file);
    if (hit) { hit.thumb = thumb; writeRecent(list); }
    return true;
  });
  ipcMain.handle("photo:set-dirty", (_e, n) => {
    dirty = Number(n) || 0;
    return true;
  });
  // 자동 저장 — id 마다 PSD 한 벌과 메모(이름·원래 경로·시각)
  ipcMain.handle("photo:autosave-write", (_e, { id, name, file, bytes } = {}) => {
    const k = safeId(id);
    if (!k) return false;
    try {
      const base = path.join(autoDir(), k);
      fs.writeFileSync(`${base}.psd.saving`, toBuf(bytes));
      fs.renameSync(`${base}.psd.saving`, `${base}.psd`);
      fs.writeFileSync(`${base}.json`, JSON.stringify({ id: k, name: name || "제목 없음", file: file || "", at: Date.now() }));
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("photo:autosave-list", () => {
    try {
      return fs.readdirSync(autoDir()).filter((f) => f.endsWith(".json")).map((f) => {
        try { return JSON.parse(fs.readFileSync(path.join(autoDir(), f), "utf8")); } catch { return null; }
      }).filter((x) => x && fs.existsSync(path.join(autoDir(), `${x.id}.psd`))).sort((a, b) => b.at - a.at);
    } catch {
      return [];
    }
  });
  ipcMain.handle("photo:autosave-read", (_e, id) => {
    const k = safeId(id);
    try {
      const buf = fs.readFileSync(path.join(autoDir(), `${k}.psd`));
      return { bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) };
    } catch (err) {
      return { error: String((err && err.message) || err) };
    }
  });
  ipcMain.handle("photo:autosave-clear", (_e, id) => {
    const k = safeId(id);
    for (const ext of [".psd", ".json"]) { try { fs.unlinkSync(path.join(autoDir(), k + ext)); } catch {} }
    return true;
  });
  // 내 템플릿 — 기본 폴더(내 템플릿\) + 회원이 저장 창에서 고른 곳에 저장한 것 (photo-templates.json 에 기억, 2026-10-23 사장님)
  ipcMain.handle("photo:tpl-list", () => {
    try {
      const dirs = [tplDir(), oldTplDir()].filter((d, i) => i === 0 || fs.existsSync(d));
      const seen = new Set(tplIndex().hidden); // 삭제(목록에서 뺀) 것은 건너뛴다
      const files = [
        ...dirs.flatMap((dir) => fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".psd")).map((f) => path.join(dir, f))),
        ...tplIndex().files.filter((f) => fs.existsSync(f)),
      ].filter((f) => { const k = f.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      return files.map((file) => {
        const f = path.basename(file);
        let meta = {};
        try { meta = JSON.parse(fs.readFileSync(file.replace(/\.psd$/i, ".json"), "utf8")); } catch {}
        return { file, name: f.replace(/\.psd$/i, ""), thumb: meta.thumb || "", w: meta.w || 0, h: meta.h || 0, at: fs.statSync(file).mtimeMs };
      }).sort((a, b) => b.at - a.at);
    } catch {
      return [];
    }
  });
  // ask = 저장 창에서 위치·이름을 고른다 (처음엔 내 템플릿 폴더, 다음부터는 지난번에 고른 폴더에서 열린다)
  ipcMain.handle("photo:tpl-write", async (e, { name, bytes, thumb, w, h, ask } = {}) => {
    try {
      const base = String(name || "내 템플릿").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
      const idx = tplIndex();
      let file = path.join(tplDir(), `${base}.psd`);
      if (ask) {
        const start = idx.lastDir && fs.existsSync(idx.lastDir) ? idx.lastDir : tplDir();
        const r = await dialog.showSaveDialog(winOf(e), { title: "내 템플릿으로 저장", defaultPath: path.join(start, `${base}.psd`), filters: [{ name: "포토샵 (PSD)", extensions: ["psd"] }] });
        if (r.canceled || !r.filePath) return { canceled: true };
        file = r.filePath;
      }
      fs.writeFileSync(file, toBuf(bytes));
      fs.writeFileSync(file.replace(/\.psd$/i, ".json"), JSON.stringify({ thumb: thumb || "", w, h }));
      idx.files = [file, ...idx.files.filter((f) => f.toLowerCase() !== file.toLowerCase())];
      idx.hidden = idx.hidden.filter((f) => f !== file.toLowerCase()); // 예전에 뺐던 것을 다시 저장하면 다시 보인다
      idx.lastDir = path.dirname(file);
      writeTplIndex(idx);
      return { file };
    } catch (err) {
      return { error: String((err && err.message) || err) };
    }
  });
  ipcMain.handle("photo:tpl-read", (_e, file) => {
    try { return readOne(file); } catch (err) { return { error: String((err && err.message) || err) }; }
  });
  // 삭제 — 내 템플릿 목록에서만 뺀다. PSD 파일은 어디에 있든 지우지 않는다 (2026-10-23 사장님: 완전히 없어지는 것이 아니라)
  ipcMain.handle("photo:tpl-remove", (_e, file) => {
    if (!file) return false;
    const k = String(file).toLowerCase();
    const idx = tplIndex();
    idx.files = idx.files.filter((f) => f.toLowerCase() !== k);
    if (!idx.hidden.includes(k)) idx.hidden.push(k); // 내 템플릿 폴더 안 파일도 목록에 다시 안 뜨게
    writeTplIndex(idx);
    return true;
  });
  // 아무 그림 파일 읽기 (공실 사진 · AI 그림을 레이어로) — 최근 파일에는 안 남긴다
  ipcMain.handle("photo:read-file", (_e, file) => {
    try { return readOne(file); } catch (err) { return { path: file, name: path.basename(String(file || "")), error: String((err && err.message) || err) }; }
  });
  // AI 자동 디자인 — 공실·기사 내용으로 제목·부제·강조 문구와 배경 장면 설명 (회원 AI, 서버 Gemini 안 씀)
  //  숫자(가격·면적·층)·주소·연락처는 AI 가 쓰지 않는다 — 화면에서 공실 자료 그대로 넣는다 (가짜 데이터 금지)
  ipcMain.handle("photo:ai-design", async (e, o = {}) => {
    const ai = require("../ai");
    const facts = String(o.facts || "").slice(0, 6000);
    const isNews = o.kind === "article";
    const prompt = [
      `당신은 한국 부동산 미디어 "공실뉴스"의 ${isNews ? "뉴스 카드" : "매물 홍보 이미지"} 카피라이터이자 아트 디렉터입니다.`,
      `아래 ${isNews ? "기사" : "공실(매물)"} 자료를 읽고, ${o.size || "SNS"}용 이미지에 들어갈 문구와 배경 장면을 정해 주세요.`,
      isNews ? "사실만 짧게. 과장·추측 금지." : "객관적인 보도 톤으로 \"이런 매물이 나왔다\"는 느낌. 과장 광고 문구(최고, 무조건, 대박 등) 금지.",
      "중요: 가격·보증금·월세·면적·층수·주소·전화번호 같은 숫자와 정보는 문구에 절대 쓰지 마세요 (화면에서 자료 그대로 따로 넣습니다). 자료에 없는 내용도 지어내지 마세요.",
      o.request ? `회원 요청: ${String(o.request).slice(0, 400)}` : "",
      "",
      "[자료]",
      facts,
      "",
      "JSON 하나로만 답하세요:",
      '{"title":"제목 (한국어 6~16자)","sub":"부제 (한국어 10~28자, 없으면 빈칸)","badge":"강조 딱지 2~5자 (예: 신규 매물, 역세권, 단독 — 자료에 근거가 있을 때만, 없으면 빈칸)",',
      ' "scene":"English description of a background image for this design — the place/mood only, NO text, NO letters, NO numbers, NO logos, leave calm empty space for headline",',
      ' "retouch":"English instruction to gently improve the real listing photo — only sky, lighting, color, tidiness. Never change the building, rooms, layout or furniture."}',
    ].filter((x) => x !== "").join("\n");
    const parse = (t) => {
      const m = /\{[\s\S]*\}/.exec(String(t || ""));
      try { const j = m ? JSON.parse(m[0]) : null; return j && typeof j.title === "string" ? j : null; } catch { return null; }
    };
    const pick = o.ai && o.ai.provider ? { provider: o.ai.provider, mode: o.ai.mode === "api" ? "api" : "account" } : {};
    const text = await ai.ask(prompt, { ...pick, onProgress: (t) => { try { e.sender.send("video:progress", t); } catch {} }, busyLabel: "이미지 문구를 쓰고 있습니다", isComplete: (t) => Boolean(parse(t)) });
    const j = parse(text);
    if (!j) throw new Error("AI 답을 읽지 못했어요. 한 번 더 눌러 주세요.");
    const clean = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
    return { title: clean(j.title, 40), sub: clean(j.sub, 60), badge: clean(j.badge, 12), scene: clean(j.scene, 800), retouch: clean(j.retouch, 400) };
  });
  /* AI 요청바 — 글자 레이어 [AI 문구 바꾸기]: 글 하나를 회원 요청대로 고친다 (숫자·정보는 지어내지 않음) */
  ipcMain.handle("photo:ai-text", async (e, o = {}) => {
    const ai = require("../ai");
    const text = String(o.text || "").slice(0, 600);
    const req = String(o.request || "").slice(0, 300) || "더 읽기 좋게 다듬어 주세요";
    const prompt = [
      "당신은 한국 부동산 미디어 \"공실뉴스\"의 이미지 카피라이터입니다.",
      "아래 [글]은 이미지(썸네일·카드·전단) 위에 들어가는 글자 한 덩어리입니다. 회원 요청대로 고쳐 주세요.",
      "규칙: 가격·보증금·월세·면적·층수·주소·전화번호 같은 숫자와 정보는 새로 만들거나 바꾸지 마세요 (글에 있던 것은 그대로 둡니다). 글에 없는 사실도 지어내지 마세요. 과장 광고 문구(최고, 무조건, 대박 등) 금지.",
      "줄바꿈이 있으면 비슷한 줄 수로. 이미지 글이니 짧게.",
      `회원 요청: ${req}`,
      "",
      "[글]",
      text,
      "",
      '고친 글만 JSON 으로 답하세요: {"text":"고친 글"}',
    ].join("\n");
    const parse = (t) => {
      const m = /\{[\s\S]*\}/.exec(String(t || ""));
      try { const j = m ? JSON.parse(m[0]) : null; return j && typeof j.text === "string" ? j : null; } catch { return null; }
    };
    const out = await ai.ask(prompt, { onProgress: (t) => { try { e.sender.send("video:progress", t); } catch {} }, busyLabel: "글자를 고치고 있습니다", isComplete: (t) => Boolean(parse(t)) });
    const j = parse(out);
    if (!j || !j.text.trim()) throw new Error("AI 답을 읽지 못했어요. 한 번 더 눌러 주세요.");
    return { text: j.text.trim().slice(0, 600) };
  });
  /* AI 요청바 — AI 에 보낼 그림(선택 부분 · 마스크)을 임시 파일로 (ai.image 의 files 는 파일 경로) */
  ipcMain.handle("photo:temp-write", (_e, { bytes, ext = "png" } = {}) => {
    if (!bytes) return { error: "그림이 없어요" };
    const dir = path.join(app.getPath("temp"), "gongsil-ai");
    fs.mkdirSync(dir, { recursive: true });
    // 하루 지난 것은 지운다
    try { for (const f of fs.readdirSync(dir)) { const p2 = path.join(dir, f); if (Date.now() - fs.statSync(p2).mtimeMs > 86400000) fs.unlinkSync(p2); } } catch {}
    const file = path.join(dir, `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${String(ext).replace(/[^a-z]/g, "") || "png"}`);
    fs.writeFileSync(file, Buffer.from(bytes));
    return { path: file };
  });
  /* 인쇄 (파일 › 인쇄, Ctrl+P) — 편집 화면이 용지 한 장 그림(재단선·여백 포함)을 만들어 보내면, 숨은 창에 띄워 프린터로 */
  ipcMain.handle("photo:printers", async (e) => {
    const list = await e.sender.getPrintersAsync();
    return list.map((p) => ({ name: p.name, label: p.displayName || p.name, isDefault: Boolean(p.isDefault) }));
  });
  ipcMain.handle("photo:print", async (_e, { bytes, wMm, hMm, deviceName, copies = 1, dialog: ask = false } = {}) => {
    if (!bytes || !wMm || !hMm) return { ok: false, error: "인쇄할 그림이 없어요" };
    const dir = path.join(app.getPath("temp"), "gongsil-print");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = Date.now();
    const img = path.join(dir, `p${stamp}.png`);
    fs.writeFileSync(img, Buffer.from(bytes));
    const html = path.join(dir, `p${stamp}.html`);
    const src = require("url").pathToFileURL(img).href;
    fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${wMm}mm ${hMm}mm;margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:${wMm}mm;height:${hMm}mm}</style></head><body><img src="${src}"></body></html>`, "utf8");
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
    try {
      await win.loadFile(html);
      await win.webContents.executeJavaScript("new Promise((r) => { const i = document.images[0]; if (!i || i.complete) r(1); else { i.onload = () => r(1); i.onerror = () => r(0); } })");
      const land = wMm > hMm;
      const r = await new Promise((res) => {
        win.webContents.print({
          silent: !ask, deviceName: deviceName || undefined, copies: Math.max(1, Math.min(99, Math.round(copies) || 1)), landscape: land, printBackground: true,
          margins: { marginType: "none" },
          pageSize: { width: Math.round(Math.min(wMm, hMm) * 1000), height: Math.round(Math.max(wMm, hMm) * 1000) },
        }, (ok, why) => res({ ok, error: ok ? undefined : why === "Print job canceled" || why === "cancelled" ? "취소했어요" : why }));
      });
      return r;
    } finally {
      try { win.destroy(); } catch {}
      setTimeout(() => { try { fs.unlinkSync(img); fs.unlinkSync(html); } catch {} }, 60000);
    }
  });
  ipcMain.handle("photo:reveal", (_e, file) => {
    if (file && fs.existsSync(file)) shell.showItemInFolder(file);
    return true;
  });
}

module.exports = { register, dirtyCount: () => dirty, clearDirty: () => { dirty = 0; } };
