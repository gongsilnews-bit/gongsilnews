/**
 * 오픈자료 [공실뉴스 사진] 올리기 (2026-11-10 사장님: "원본 그대로 · 회원 모두 쓰는 거야")
 *  node scripts/upload_open_photos.mjs "C:\Users\user\Desktop\upload" [--dry]
 *  - 목록.csv 의 "블러" 칸이 빈 사진만 올린다 (얼굴·연락처·동호수 사진은 처리한 뒤 따로)
 *  - 사진 → WebP (가로 1920 · 화질 82) → R2 photo/{id}.webp, 미리보기 480px → photo/thumbs/{id}.webp
 *  - 목록 파일 catalog/photo.json { items: [{ id, g, c, s, k, w, h }] }
 *    g 묶음(드론·거리·매물) · c 분류(드론·거리: 하위 폴더 / 매물: 오피스텔 등) · s 공간(매물만: 거실 등) · k 검색 낱말
 *  - 이어 올리기: 이미 올린 번호는 .upload_open_photos.done 에 적어 두고 건너뛴다
 */
import fs from "fs";
import path from "path";
import { createHash, createHmac } from "crypto";
import sharp from "sharp";

const ROOT = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!ROOT) { console.error("사진 폴더를 주세요"); process.exit(1); }

const env = Object.fromEntries(fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/).filter((l) => /^R2_/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }));
const { R2_ACCOUNT_ID: acc, R2_ACCESS_KEY_ID: kid, R2_SECRET_ACCESS_KEY: secret, R2_BUCKET: bucket } = env;

const hmac = (k, s) => createHmac("sha256", k).update(s, "utf8").digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
function signed(method, key) {
  const host = `${acc}.r2.cloudflarestorage.com`;
  const p = `/${bucket}/${key.split("/").map(enc).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const q = { "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${kid}/${scope}`, "X-Amz-Date": amzDate, "X-Amz-Expires": "3600", "X-Amz-SignedHeaders": "host" };
  const qs = Object.keys(q).sort().map((k) => `${enc(k)}=${enc(q[k])}`).join("&");
  const canonical = [method, p, qs, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, createHash("sha256").update(canonical, "utf8").digest("hex")].join("\n");
  const kSign = hmac(hmac(hmac(hmac(`AWS4${secret}`, day), "auto"), "s3"), "aws4_request");
  return `https://${host}${p}?${qs}&X-Amz-Signature=${createHmac("sha256", kSign).update(toSign, "utf8").digest("hex")}`;
}
async function put(key, body, type) {
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(signed("PUT", key), { method: "PUT", body, headers: { "Content-Type": type } });
      if (r.ok) return;
      throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    } catch (e) { if (t === 3) throw e; await new Promise((s) => setTimeout(s, 1500 * (t + 1))); }
  }
}

// 목록.csv — 파일,원래 이름,블러
const csv = fs.readFileSync(path.join(ROOT, "목록.csv"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).slice(1).filter(Boolean);
const blur = new Map();
for (const line of csv) {
  const cols = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
  blur.set(cols[0].replace(/\\/g, "/"), (cols[2] || "").trim());
}

// 검색에 쓰지 않는 촬영 메모
const NOISE = new Set(["스마트폰촬영", "촬영", "원본", "사진"]);
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(jpe?g|png)$/i.test(f.name)) files.push(p); } })(ROOT);

const items = [];
let skipped = 0;
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  if (!blur.has(rel)) { skipped++; continue; } // 목록에 없는 사진은 확인 전이라 올리지 않는다
  if (blur.get(rel)) { skipped++; continue; }
  const parts = rel.split("/").map((s) => s.replace(/^\d+\s+/, ""));
  const g = parts[0];
  const c = g === "매물" ? parts[1] : parts[1] || "";
  const s = g === "매물" ? parts[2] || "" : "";
  const words = path.basename(f).replace(/\.\w+$/, "").split("_").slice(1).filter((w) => w && !/^\d+$/.test(w) && !NOISE.has(w));
  const k = Array.from(new Set(words.filter((w) => w !== c && w !== s))).join(" ");
  const id = createHash("sha1").update(rel).digest("hex").slice(0, 12);
  items.push({ id, g, c, s, k, rel, f });
}
console.log(`올릴 사진 ${items.length}장 · 뺀 사진(블러·목록 없음) ${skipped}장`);
if (DRY) { console.log(items.slice(0, 5).map(({ f, ...x }) => x)); process.exit(0); }

const DONE = path.join(process.cwd(), "scripts", ".upload_open_photos.done");
const done = new Map(fs.existsSync(DONE) ? fs.readFileSync(DONE, "utf8").split(/\r?\n/).filter(Boolean).map((l) => { const [id, w, h] = l.split(","); return [id, { w: +w, h: +h }]; }) : []);
let n = 0, fail = 0;
async function one(it) {
  if (done.has(it.id)) { Object.assign(it, done.get(it.id)); return; }
  const src = fs.readFileSync(it.f);
  const big = await sharp(src, { failOn: "none" }).rotate().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await sharp(src, { failOn: "none" }).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
  await put(`photo/${it.id}.webp`, big.data, "image/webp");
  await put(`photo/thumbs/${it.id}.webp`, thumb, "image/webp");
  it.w = big.info.width; it.h = big.info.height;
  fs.appendFileSync(DONE, `${it.id},${it.w},${it.h}\n`);
  done.set(it.id, { w: it.w, h: it.h });
}
const queue = [...items];
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let it = queue.shift(); it; it = queue.shift()) {
    try { await one(it); } catch (e) { fail++; console.error("실패", it.rel, e.message); }
    if (++n % 200 === 0) console.log(`${n}/${items.length}`);
  }
}));
const ok = items.filter((x) => x.w);
await put("catalog/photo.json", JSON.stringify({ updated: new Date().toISOString(), items: ok.map(({ id, g, c, s, k, w, h }) => ({ id, g, c, s, k, w, h })) }), "application/json");
console.log(`끝: 올림 ${ok.length}장 · 실패 ${fail}장 · 목록 catalog/photo.json`);
