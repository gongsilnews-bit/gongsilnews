// 영상 편집기 글꼴 — 화면 글자·자막에 쓰는 무료 한글 글꼴 (상업 이용 가능)
//  처음 고를 때 받아 PC에 두고(userData\video-fonts), 미리보기(@font-face)와 굽기(libass)에 같은 파일을 쓴다.
//  목록 차례·이름은 편집 화면 src/lib/studio-video/fonts.ts 와 같게 둔다 (사장님: Pretendard·나눔고딕·지마켓산스·배민체를 맨 앞에).
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const log = require("electron-log/main");
const server = require("./server");
const media = require("./media");

const G = "https://github.com/google/fonts/raw/main/ofl/";
// family = 글꼴 파일 안의 이름 (libass·CSS 가 이 이름으로 찾는다)
const FONTS = [
  { family: "Pretendard", file: "Pretendard-Bold.otf", url: "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf" }, // OFL
  { family: "NanumGothic", file: "NanumGothic-Bold.ttf", url: G + "nanumgothic/NanumGothic-Bold.ttf" }, // OFL
  { family: "GmarketSans", file: "GmarketSansBold.otf", url: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff", woff: true }, // G마켓 무료 글꼴
  { family: "Do Hyeon", file: "DoHyeon-Regular.ttf", url: G + "dohyeon/DoHyeon-Regular.ttf" }, // 배민 도현 (OFL)
  { family: "Jua", file: "Jua-Regular.ttf", url: G + "jua/Jua-Regular.ttf" }, // 배민 주아 (OFL)
  { family: "Yeon Sung", file: "YeonSung-Regular.ttf", url: G + "yeonsung/YeonSung-Regular.ttf" }, // 배민 연성 (OFL)
  { family: "Malgun Gothic", system: ["malgun.ttf", "malgunbd.ttf"] },
  { family: "NanumMyeongjo", file: "NanumMyeongjo-Bold.ttf", url: G + "nanummyeongjo/NanumMyeongjo-Bold.ttf" },
  { family: "Black Han Sans", file: "BlackHanSans-Regular.ttf", url: G + "blackhansans/BlackHanSans-Regular.ttf" },
  { family: "Gowun Dodum", file: "GowunDodum-Regular.ttf", url: G + "gowundodum/GowunDodum-Regular.ttf" },
  { family: "Nanum Pen", file: "NanumPenScript-Regular.ttf", url: G + "nanumpenscript/NanumPenScript-Regular.ttf" },
  { family: "Song Myung", file: "SongMyung-Regular.ttf", url: G + "songmyung/SongMyung-Regular.ttf" },
];
const DEFAULT_FAMILY = "Malgun Gothic";
const dir = () => path.join(app.getPath("userData"), "video-fonts");
const find = (family) => FONTS.find((f) => f.family === family) || null;

/** 글꼴 이름표(name) 새로 만들기 — 웹 글꼴은 이름이 지워져 있어 libass 가 못 찾는다 */
function nameTable(family) {
  const recs = [
    [1, family],
    [2, "Regular"],
    [4, family],
    [6, family.replace(/[^A-Za-z0-9-]/g, "")],
  ].map(([id, str]) => ({ id, data: Buffer.from(str, "utf16le").swap16() }));
  const head = Buffer.alloc(6 + recs.length * 12);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(recs.length, 2);
  head.writeUInt16BE(head.length, 4);
  let off = 0;
  recs.forEach((r, i) => {
    const o = 6 + i * 12;
    head.writeUInt16BE(3, o); // Windows
    head.writeUInt16BE(1, o + 2); // Unicode BMP
    head.writeUInt16BE(0x409, o + 4);
    head.writeUInt16BE(r.id, o + 6);
    head.writeUInt16BE(r.data.length, o + 8);
    head.writeUInt16BE(off, o + 10);
    off += r.data.length;
  });
  return Buffer.concat([head, ...recs.map((r) => r.data)]);
}
function checksum(data) {
  const b = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)]);
  let sum = 0;
  for (let i = 0; i < b.length; i += 4) sum = (sum + b.readUInt32BE(i)) >>> 0;
  return sum;
}

/** WOFF(1) → OTF/TTF — 웹 글꼴만 공개된 것을 영상(libass)에서 쓰려고. family 를 주면 이름표를 새로 단다 */
function woffToSfnt(buf, family) {
  if (buf.toString("latin1", 0, 4) !== "wOFF") throw new Error("WOFF 글꼴이 아닙니다.");
  const flavor = buf.readUInt32BE(4);
  const n = buf.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const tag = buf.slice(o, o + 4);
    const off = buf.readUInt32BE(o + 4);
    const comp = buf.readUInt32BE(o + 8);
    const orig = buf.readUInt32BE(o + 12);
    const sum = buf.readUInt32BE(o + 16);
    const raw = buf.slice(off, off + comp);
    tables.push({ tag, sum, data: comp < orig ? zlib.inflateSync(raw) : raw });
  }
  if (family) {
    const nt = tables.find((t) => t.tag.toString("latin1") === "name");
    const data = nameTable(family);
    if (nt) Object.assign(nt, { data, sum: checksum(data) });
    else tables.push({ tag: Buffer.from("name", "latin1"), sum: checksum(data), data });
    tables.sort((a, b) => Buffer.compare(a.tag, b.tag));
  }
  let es = 0;
  while (2 ** (es + 1) <= n) es++;
  const sr = 2 ** es * 16;
  const head = Buffer.alloc(12 + n * 16);
  head.writeUInt32BE(flavor, 0);
  head.writeUInt16BE(n, 4);
  head.writeUInt16BE(sr, 6);
  head.writeUInt16BE(es, 8);
  head.writeUInt16BE(n * 16 - sr, 10);
  const parts = [head];
  let off = head.length;
  tables.forEach((t, i) => {
    const r = 12 + i * 16;
    t.tag.copy(head, r);
    head.writeUInt32BE(t.sum, r + 4);
    head.writeUInt32BE(off, r + 8);
    head.writeUInt32BE(t.data.length, r + 12);
    const pad = (4 - (t.data.length % 4)) % 4;
    parts.push(t.data, Buffer.alloc(pad));
    off += t.data.length + pad;
  });
  return Buffer.concat(parts);
}

const pending = new Map();
/** 글꼴 파일들 (없으면 받는다) — [파일 경로] */
async function files(family) {
  const f = find(family) || find(DEFAULT_FAMILY);
  if (f.system) return f.system.map((x) => path.join(process.env.WINDIR || "C:\\Windows", "Fonts", x)).filter((p) => fs.existsSync(p));
  const dest = path.join(dir(), f.file);
  if (fs.existsSync(dest)) return [dest];
  if (!pending.has(f.family)) {
    pending.set(
      f.family,
      (async () => {
        fs.mkdirSync(dir(), { recursive: true });
        const tmp = dest + ".part";
        await server.download(f.url, tmp);
        if (f.woff) fs.writeFileSync(dest, woffToSfnt(fs.readFileSync(tmp), f.family));
        else fs.renameSync(tmp, dest);
        fs.rmSync(tmp, { force: true });
        log.info(`[글꼴] ${f.family} 받음`);
      })().finally(() => pending.delete(f.family))
    );
  }
  await pending.get(f.family);
  return [dest];
}

/** 미리보기용 — { family, url } (맑은 고딕은 PC 글꼴이라 url 없음) */
async function ensure(family) {
  const f = find(family);
  if (!f) throw new Error("모르는 글꼴입니다.");
  if (f.system) return { family: f.family, url: "" };
  const [file] = await files(f.family);
  media.allow(file);
  return { family: f.family, url: media.urlOf(file) };
}

/** 굽기용 — 쓰인 글꼴들을 작업 폴더(fontsdir)로 복사 */
async function copyTo(families, fontsDir) {
  for (const fam of new Set(families.filter(Boolean))) {
    try {
      for (const src of await files(fam)) fs.copyFileSync(src, path.join(fontsDir, path.basename(src)));
    } catch (e) {
      log.warn(`[글꼴] ${fam} 못 받음 → 맑은 고딕: ${e.message}`);
    }
  }
}

/** libass 굵게 — 맑은 고딕만 굵은 파일이 따로 있다. 나머지는 받은 파일 굵기 그대로 (가짜 굵게 안 함) */
const assBold = (family, bold) => (find(family || DEFAULT_FAMILY)?.system || !find(family) ? bold !== false : false);

module.exports = { FONTS, DEFAULT_FAMILY, ensure, copyTo, files, assBold, woffToSfnt };
