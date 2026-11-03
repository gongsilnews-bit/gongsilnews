// 글쓰기 (2026-11-03 사장님: "글이 정말 중요함") — 회원 AI 로 초안·다듬기, 쓴 글은 회원 PC 에만 저장
//  지시문(작성법 카드)은 웹 화면이 만들어 보낸다 — 앱을 새로 깔지 않고 글 품질을 고칠 수 있게.
//  저장: 문서\공실마케팅\10 글쓰기\  (내 글 = 20261103 제목.gsw · 자주 쓰는 글\ 같은 모양)
//  .gsw = JSON { id, cat, card, title, text, inputs, versions, aiBase, fav, updatedAt }
const fs = require("fs");
const path = require("path");
const { dialog, shell, BrowserWindow } = require("electron");
const root = require("./studio-root");

const base = () => root.dir("write");
const favDir = () => path.join(base(), "자주 쓰는 글");
const safe = (s) => String(s || "").replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "제목 없음";
const ymd = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

/** 회원 AI 에게 묻기 — 웹이 만든 지시문 그대로. JSON 으로 답하라 했으면 다 받을 때까지 기다린다 */
async function ask(prompt, opts = {}, onProgress = () => {}) {
  const ai = require("./ai");
  const pick = opts.provider ? { provider: opts.provider, mode: opts.mode === "api" ? "api" : opts.mode === "account" ? "account" : undefined } : {};
  return ai.ask(String(prompt || ""), {
    ...pick,
    onProgress,
    feature: "글쓰기",
    busyLabel: opts.busyLabel || "초안을 쓰고 있습니다",
    isComplete: opts.json ? (t) => /\}\s*(```)?\s*$/.test(String(t || "").trim()) : undefined,
  });
}

/** 저장 — 같은 id 는 같은 파일에 덮어쓴다. 처음이면 "20261103 제목.gsw" */
function save(doc) {
  if (!doc || !doc.id) throw new Error("저장할 글이 없습니다.");
  const dir = doc.fav ? favDir() : base();
  fs.mkdirSync(dir, { recursive: true });
  let file = doc.file && fs.existsSync(doc.file) && path.dirname(doc.file) === dir ? doc.file : "";
  if (!file) {
    const hit = fs.readdirSync(dir).filter((n) => n.endsWith(".gsw")).find((n) => readJson(path.join(dir, n))?.id === doc.id);
    file = hit ? path.join(dir, hit) : path.join(dir, `${ymd()} ${safe(doc.title)}.gsw`);
    for (let i = 2; !hit && fs.existsSync(file); i++) file = path.join(dir, `${ymd()} ${safe(doc.title)} (${i}).gsw`);
  }
  const out = { ...doc, file: undefined, updatedAt: new Date().toISOString() };
  fs.writeFileSync(file, JSON.stringify(out, null, 1), "utf8");
  return { file, savedAt: out.updatedAt };
}

/** 목록 — 최근 고친 순 (본문은 앞부분만) */
function list({ fav = false, limit = 50 } = {}) {
  const dir = fav ? favDir() : base();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith(".gsw")).map((n) => {
    const f = path.join(dir, n);
    const j = readJson(f);
    if (!j) return null;
    return { file: f, id: j.id, cat: j.cat, card: j.card, title: j.title || n.replace(/\.gsw$/, ""), preview: String(j.text || "").slice(0, 80), updatedAt: j.updatedAt || fs.statSync(f).mtime.toISOString(), fav: Boolean(j.fav) };
  }).filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

const load = (file) => { const j = readJson(file); return j ? { ...j, file } : null; };
function remove(file) {
  if (!file || !file.endsWith(".gsw") || !path.resolve(file).startsWith(path.resolve(base()))) throw new Error("지울 수 없는 파일입니다.");
  fs.rmSync(file, { force: true });
  return true;
}

/** 파일로 내보내기 — txt · doc(워드에서 열림) · pdf */
async function exportFile(win, { title, text, kind = "txt" }) {
  const ext = kind === "pdf" ? "pdf" : kind === "doc" ? "doc" : "txt";
  const name = `${ymd()} ${safe(title)}.${ext}`;
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(base(), name), filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  if (r.canceled || !r.filePath) return { canceled: true };
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:"맑은 고딕","Malgun Gothic",sans-serif;font-size:12pt;line-height:1.8;margin:2cm}h1{font-size:16pt}</style></head><body><h1>${esc(title)}</h1>${esc(text).split(/\n/).map((l) => `<p style="margin:0 0 .4em">${l || "&nbsp;"}</p>`).join("")}</body></html>`;
  if (ext === "txt") fs.writeFileSync(r.filePath, `${title}\r\n\r\n${String(text || "").replace(/\r?\n/g, "\r\n")}`, "utf8");
  else if (ext === "doc") fs.writeFileSync(r.filePath, "﻿" + html, "utf8");
  else {
    const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    try {
      await w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
      fs.writeFileSync(r.filePath, await w.webContents.printToPDF({ pageSize: "A4", printBackground: true }));
    } finally { w.destroy(); }
  }
  return { file: r.filePath };
}

function register(ipcMain) {
  ipcMain.handle("write:ask", (e, prompt, opts) => ask(prompt, opts || {}, (t) => { try { e.sender.send("write:progress", t); } catch {} }));
  ipcMain.handle("write:save", (_e, doc) => save(doc));
  ipcMain.handle("write:list", (_e, o) => list(o || {}));
  ipcMain.handle("write:load", (_e, file) => load(file));
  ipcMain.handle("write:remove", (_e, file) => remove(file));
  ipcMain.handle("write:export", (e, o) => exportFile(BrowserWindow.fromWebContents(e.sender), o || {}));
  ipcMain.handle("write:folder", () => { fs.mkdirSync(base(), { recursive: true }); return shell.openPath(base()); });
}

module.exports = { register, ask, save, list, load, remove };
