// 영상 편집기 — .gss 파일 (공실스튜디오 프로젝트 파일 하나)
//  .gss = zip 한 덩어리: project.json + 프로젝트 안에서 만든 파일(AI 목소리·AI 그림·무료 자료·음악 등)
//  촬영·녹화 원본은 넣지 않고 PC 위치만 기억한다 (크니까). 다른 PC로 옮길 때는 [프로젝트 패키지] — 원본을 "미디어" 폴더에 모은다.
//  편집은 보이지 않는 작업 폴더(userData\gss-work\…)에 풀어서 하고, 저장할 때 .gss 로 다시 묶는다.
//  project.json 안의 위치 표시: {{GSS}}/… = 이 파일 안(작업 폴더), {{HERE}}/… = .gss 파일 옆 (패키지의 미디어)
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const log = require("electron-log/main");
const media = require("./media");

const EXT = ".gss";
const isGss = (p) => typeof p === "string" && p.toLowerCase().endsWith(EXT);
const SOURCE = ".gss-source"; // 작업 폴더 → 원래 .gss 위치
const SYNCED = ".gss-synced"; // 작업 폴더가 .gss 와 같았던 마지막 시각 (그 뒤에 고치면 "저장 안 한 내용")
// .gss 에 넣지 않는 것 — 자동 저장 기록·받아쓰기용 소리·예전 폴더 방식의 완성 영상·임시 파일
const SKIP = /^(autosave|audio|output)$/i;

/* ── zip (압축 라이브러리 없이 — Node 기본 zlib) ── */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  if (zlib.crc32) return zlib.crc32(buf) >>> 0;
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
/** entries: [{ name, data: Buffer }] → zip 파일 (이미 압축된 소리·그림은 그대로 담는다) */
function zipWrite(file, entries) {
  const parts = [];
  const central = [];
  let off = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name.replace(/\\/g, "/"), "utf8");
    const stored = /\.(mp3|m4a|aac|mp4|webm|jpg|jpeg|png|webp|gif|ogg|opus|wav)$/i.test(e.name);
    const body = stored ? e.data : zlib.deflateRawSync(e.data, { level: 6 });
    const method = stored ? 0 : 8;
    const crc = crc32(e.data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x0800, 6); // 이름이 UTF-8
    h.writeUInt16LE(method, 8);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(body.length, 18);
    h.writeUInt32LE(e.data.length, 22);
    h.writeUInt16LE(name.length, 26);
    parts.push(h, name, body);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(method, 10);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(body.length, 20);
    c.writeUInt32LE(e.data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(off, 42);
    central.push(c, name);
    off += h.length + name.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(off, 16);
  // 다 쓴 뒤 바꿔치기 — 저장하다 꺼져도 원래 .gss 는 깨지지 않는다
  const tmp = `${file}.saving`;
  fs.writeFileSync(tmp, Buffer.concat([...parts, cd, end]));
  fs.renameSync(tmp, file);
}
function zipRead(file) {
  const b = fs.readFileSync(file);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (b.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("공실스튜디오 영상 파일(.gss)이 아니거나 깨졌어요.");
  const n = b.readUInt16LE(e + 10);
  let p = b.readUInt32LE(e + 16);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error(".gss 파일이 깨졌어요.");
    const method = b.readUInt16LE(p + 10);
    const size = b.readUInt32LE(p + 20);
    const nl = b.readUInt16LE(p + 28), xl = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32);
    const lo = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nl).toString("utf8");
    const ds = lo + 30 + b.readUInt16LE(lo + 26) + b.readUInt16LE(lo + 28);
    const raw = b.slice(ds, ds + size);
    out.push({ name, data: method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw) });
    p += 46 + nl + xl + cl;
  }
  return out;
}

/* ── 위치 표시 바꾸기 ── */
const norm = (p) => path.resolve(p).toLowerCase();
const under = (p, dir) => typeof p === "string" && p && (norm(p) + path.sep).startsWith(norm(dir) + path.sep) && norm(p) !== norm(dir);
const relOf = (p, dir) => path.relative(dir, p).split(path.sep).join("/");
/** 깊게 돌며 문자열을 바꾼다 */
function mapStrings(v, fn) {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn));
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = mapStrings(x, fn);
    return o;
  }
  return v;
}
/** 저장용 — 작업 폴더 안 → {{GSS}}/…, 옮길 원본(extra: 원래 위치 → {{HERE}}/…) */
function toPortable(data, workDir, extra = new Map()) {
  return mapStrings(data, (s) => {
    if (s.startsWith("studio-media://")) {
      const f = media.fileOf(s);
      if (f && under(f, workDir)) return `{{GSSURL}}/${relOf(f, workDir)}`;
      if (f && extra.has(norm(f))) return `{{HEREURL}}/${extra.get(norm(f))}`;
      return s;
    }
    if (extra.has(norm(s))) return `{{HERE}}/${extra.get(norm(s))}`;
    if (under(s, workDir)) return `{{GSS}}/${relOf(s, workDir)}`;
    return s;
  });
}
/** 열기용 — 표시를 이 PC 위치로 */
function fromPortable(data, workDir, hereDir) {
  const at = (base, rel) => path.join(base, ...rel.split("/"));
  return mapStrings(data, (s) => {
    if (!s.startsWith("{{")) return s;
    let m = /^\{\{GSS\}\}\/(.*)$/.exec(s);
    if (m) return at(workDir, m[1]);
    m = /^\{\{HERE\}\}\/(.*)$/.exec(s);
    if (m) return at(hereDir, m[1]);
    m = /^\{\{GSSURL\}\}\/(.*)$/.exec(s);
    if (m) return media.urlOf(at(workDir, m[1]));
    m = /^\{\{HEREURL\}\}\/(.*)$/.exec(s);
    if (m) {
      const f = at(hereDir, m[1]);
      media.allow(f);
      return media.urlOf(f);
    }
    return s;
  });
}

/* ── 작업 폴더 ── */
const workRoot = () => path.join(app.getPath("userData"), "gss-work");
const workFor = (file) => path.join(workRoot(), crypto.createHash("sha1").update(norm(file)).digest("hex").slice(0, 16));
const sourceOf = (workDir) => {
  try {
    return fs.readFileSync(path.join(workDir, SOURCE), "utf8").trim();
  } catch {
    return "";
  }
};
const setSource = (workDir, file) => fs.writeFileSync(path.join(workDir, SOURCE), file, "utf8");

/** 작업 폴더(또는 예전 폴더 프로젝트)를 .gss 하나로 — extra: 원본 위치 → 옆 폴더 상대 위치(패키지) */
function pack(workDir, file, { extra = new Map(), patch = null } = {}) {
  const pj = path.join(workDir, "project.json");
  let data = JSON.parse(fs.readFileSync(pj, "utf8"));
  delete data.dir;
  delete data.file;
  if (patch) data = patch(data);
  const entries = [{ name: "project.json", data: Buffer.from(JSON.stringify(toPortable(data, workDir, extra), null, 1), "utf8") }];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      const rel = relOf(p, workDir);
      if (e.isDirectory()) {
        if (dir === workDir && SKIP.test(e.name)) continue;
        walk(p);
      } else if (rel !== "project.json" && e.name !== SOURCE && !/\.(tmp|saving)$/i.test(e.name)) entries.push({ name: rel, data: fs.readFileSync(p) });
    }
  };
  walk(workDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  zipWrite(file, entries);
  if (gssWork(workDir, file)) markSynced(workDir);
  return entries.length;
}
const gssWork = (workDir, file) => norm(sourceOf(workDir) || "x") === norm(file);
const markSynced = (workDir) => fs.writeFileSync(path.join(workDir, SYNCED), String(Date.now()));
/** 이 .gss 의 작업 폴더에 저장하지 않은 고친 내용이 있는지 (갑자기 꺼졌거나 [저장 안 함] 없이 나갔을 때) */
function hasUnsaved(file) {
  const work = workFor(file);
  const pj = path.join(work, "project.json");
  if (!fs.existsSync(pj) || !gssWork(work, file)) return false;
  let synced = 0;
  try {
    synced = Number(fs.readFileSync(path.join(work, SYNCED), "utf8")) || 0;
  } catch {}
  return fs.statSync(pj).mtimeMs > Math.max(synced, fs.statSync(file).mtimeMs) + 1500;
}

/** .gss → 작업 폴더에 풀기. keepWork: 저장 안 한 고친 내용(작업 폴더)을 이어서 쓴다. 돌려줌: 작업 폴더 */
function unpack(file, keepWork = false) {
  const work = workFor(file);
  const pj = path.join(work, "project.json");
  if (keepWork && fs.existsSync(pj) && gssWork(work, file)) {
    log.info(`[.gss] 저장 안 한 고친 내용을 이어서 엶 ${file}`);
    return work;
  }
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  for (const e of zipRead(file)) {
    const to = path.join(work, ...e.name.split("/"));
    if (!under(to, work)) continue; // 이상한 이름(../) 막기
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (e.name === "project.json") {
      const data = fromPortable(JSON.parse(e.data.toString("utf8")), work, path.dirname(file));
      fs.writeFileSync(to, JSON.stringify(data, null, 1));
    } else fs.writeFileSync(to, e.data);
  }
  if (!fs.existsSync(pj)) throw new Error(".gss 파일 안에 프로젝트 정보가 없어요.");
  setSource(work, file);
  markSynced(work);
  return work;
}

/* ── 저장 묶기 — 고칠 때마다 묶으면 무거우니 2초 모아서. 닫기·끝낼 때는 바로 ── */
const pending = new Map(); // .gss → { work, timer }
function schedule(workDir, file, ms = 2000) {
  const old = pending.get(file);
  if (old) clearTimeout(old.timer);
  const timer = setTimeout(() => flush(file), ms);
  pending.set(file, { work: workDir, timer });
}
function flush(file) {
  const x = pending.get(file);
  if (!x) return false;
  clearTimeout(x.timer);
  pending.delete(file);
  try {
    pack(x.work, file);
    return true;
  } catch (e) {
    log.warn(`[.gss] 저장 실패 ${file}: ${e.message}`);
    throw e;
  }
}
function flushAll() {
  for (const f of [...pending.keys()]) {
    try {
      flush(f);
    } catch {}
  }
}

module.exports = { EXT, isGss, workFor, sourceOf, setSource, pack, unpack, hasUnsaved, schedule, flush, flushAll, under, norm, zipRead, zipWrite };
