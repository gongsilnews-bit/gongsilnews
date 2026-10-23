// 내 PC 글꼴 — 회원 윈도우에 설치된 글꼴 목록 (2026-10-22 회의: 기본은 공실뉴스 글꼴, PC 글꼴도 불러오기)
//  윈도우 글꼴 폴더 + "나만 설치" 글꼴 폴더를 훑어 글꼴 파일 안의 이름(한글·영문)을 읽는다.
//  파일은 회원 PC 안에서만 쓰고 서버에 올리지 않는다. 처음 한 번 훑고 사용자 데이터에 기억 (바뀐 파일만 다시 읽음)
const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const DIRS = () => [
  path.join(process.env.WINDIR || "C:\\Windows", "Fonts"),
  path.join(process.env.LOCALAPPDATA || path.join(app.getPath("home"), "AppData", "Local"), "Microsoft", "Windows", "Fonts"),
];
const cacheFile = () => path.join(app.getPath("userData"), "pc-fonts.json");
const EXT = /\.(ttf|otf|ttc)$/i;

/** 파일 앞부분만 읽기 */
function readAt(fd, pos, len) {
  const b = Buffer.alloc(len);
  const n = fs.readSync(fd, b, 0, len, pos);
  return n < len ? b.subarray(0, n) : b;
}
/** 글꼴 하나(오프셋)의 name 표 → { en, ko, style, enFull } */
function readNames(fd, off) {
  const head = readAt(fd, off, 12);
  if (head.length < 12) return null;
  const n = head.readUInt16BE(4);
  const dir = readAt(fd, off + 12, n * 16);
  let nameOff = -1, nameLen = 0;
  for (let i = 0; i < n; i++) {
    if (dir.toString("latin1", i * 16, i * 16 + 4) === "name") { nameOff = dir.readUInt32BE(i * 16 + 8); nameLen = dir.readUInt32BE(i * 16 + 12); }
  }
  if (nameOff < 0 || nameLen > 2_000_000) return null;
  const t = readAt(fd, nameOff, nameLen);
  const count = t.readUInt16BE(2), strOff = t.readUInt16BE(4);
  const got = {};
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12;
    if (r + 12 > t.length) break;
    const plat = t.readUInt16BE(r), enc = t.readUInt16BE(r + 2), lang = t.readUInt16BE(r + 4), id = t.readUInt16BE(r + 6), len = t.readUInt16BE(r + 8), o = t.readUInt16BE(r + 10);
    if (plat !== 3 || (enc !== 1 && enc !== 0 && enc !== 10)) continue;
    if (![1, 2, 16, 17].includes(id)) continue;
    const raw = t.subarray(strOff + o, strOff + o + len);
    const s = Buffer.from(raw).swap16().toString("utf16le").replace(/\0/g, "").trim();
    if (!s) continue;
    const key = `${id}:${lang === 0x412 ? "ko" : lang === 0x409 ? "en" : "x"}`;
    if (!got[key]) got[key] = s;
  }
  // 1 = 기본 가족 이름 (CSS·libass 가 찾는 이름), 16 = 묶음 가족 이름 (굵기별 파일을 한 가족으로)
  const en = got["16:en"] || got["1:en"] || got["1:x"] || got["16:x"];
  if (!en) return null;
  const style = got["17:en"] || got["2:en"] || "Regular";
  const css = got["1:en"] || en;
  // 한글 이름 — 굵기마다 따로인 글꼴(공체 Bold · 공체 Light)은 묶음 한글 이름 + 굵기
  let ko = got["1:ko"] || "";
  if (!ko && got["16:ko"]) {
    const rest = got["16:en"] && css.startsWith(got["16:en"]) ? css.slice(got["16:en"].length).trim() : "";
    ko = rest ? `${got["16:ko"]} ${rest}` : got["16:ko"];
  }
  return { en, ko, style, css };
}
function scanFile(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const sig = readAt(fd, 0, 12);
    const offs = [];
    if (sig.toString("latin1", 0, 4) === "ttcf") {
      const n = sig.readUInt32BE(8);
      const tbl = readAt(fd, 12, Math.min(n, 64) * 4);
      for (let i = 0; i * 4 < tbl.length; i++) offs.push(tbl.readUInt32BE(i * 4));
    } else offs.push(0);
    return offs.map((o) => readNames(fd, o)).filter(Boolean);
  } catch {
    return [];
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
  }
}

let mem = null;
/** 목록 — [{ family(영문, CSS·영상용), ko(한글 이름), label, styles, files }] (가나다 → ABC 순) */
function list(refresh = false) {
  if (mem && !refresh) return mem;
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(cacheFile(), "utf8")) || {}; } catch {}
  const next = {};
  for (const d of DIRS()) {
    let names = [];
    try { names = fs.readdirSync(d); } catch { continue; }
    for (const n of names) {
      if (!EXT.test(n)) continue;
      const file = path.join(d, n);
      let st;
      try { st = fs.statSync(file); } catch { continue; }
      const key = `${file}|${st.size}|${Math.round(st.mtimeMs)}`;
      next[key] = cache[key] || scanFile(file);
    }
  }
  try { fs.writeFileSync(cacheFile(), JSON.stringify(next)); } catch {}
  const fam = new Map();
  for (const [key, faces] of Object.entries(next)) {
    const file = key.split("|")[0];
    for (const f of faces) {
      // 윈도우 기호·숨은 글꼴은 뺀다 (@세로쓰기 · Marlett 등)
      if (/^@|^(Marlett|Webdings|Wingdings|Symbol|MT Extra|HoloLens|Segoe (MDL2|Fluent) Assets)/i.test(f.en)) continue;
      const k = f.css.toLowerCase();
      const cur = fam.get(k) || { family: f.css, ko: f.ko, styles: [], files: [] };
      if (!cur.ko && f.ko) cur.ko = f.ko;
      if (!cur.styles.includes(f.style)) cur.styles.push(f.style);
      if (!cur.files.includes(file)) cur.files.push(file);
      fam.set(k, cur);
    }
  }
  const arr = [...fam.values()].map((x) => ({ ...x, label: x.ko || x.family }));
  const seen = {};
  for (const x of arr) seen[x.label] = (seen[x.label] || 0) + 1;
  mem = arr
    .map((x) => (seen[x.label] > 1 ? { ...x, label: `${x.label} (${x.family})` } : x))
    .sort((a, b) => Number(!a.ko) - Number(!b.ko) || a.label.localeCompare(b.label, "ko"));
  return mem;
}
/** 글꼴 가족 이름(영문·한글 어느 것이든) → 파일들 (영상 굽기용) */
function filesOf(family) {
  const f = String(family || "").toLowerCase();
  const hit = list().find((x) => x.family.toLowerCase() === f || (x.ko && x.ko.toLowerCase() === f));
  return hit ? hit.files.filter((p) => fs.existsSync(p)) : [];
}

function register() {
  const { ipcMain } = require("electron");
  // 편집 화면에는 이름만 (파일 경로는 넘기지 않는다)
  ipcMain.handle("fonts:pc-list", (_e, refresh) => list(Boolean(refresh)).map(({ family, ko, label, styles }) => ({ family, ko, label, styles })));
}

module.exports = { list, filesOf, register };
