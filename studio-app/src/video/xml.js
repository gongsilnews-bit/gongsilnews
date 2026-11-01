// 영상 편집기 — 프리미어·다빈치로 내보내기 (FCP7 XML, 2026-11-01 사장님)
//  폴더 하나: <이름>\<이름>.xml · <이름>.srt · 자료\(쓴 영상·사진·목소리·음악 — 같은 드라이브면 하드링크, 아니면 복사)
//  옮기는 것: 클립 차례·자르기·빠르기 (V1 + A1 원본 소리) / AI 목소리 (A2) / 사진·영상 레이어 (V2~, 자리·크기) / 음악 (A3~, 시작 지점·크기·반복)
//  빠지는 것: 글자 레이어·말머리·메인자막 모양(자막 글은 .srt 로) · 키프레임·사진 움직임 · 페이드·볼륨 선 · 전환 · 색 보정
const fs = require("fs");
const path = require("path");
const tl = require("./timeline");
const ff = require("./ff");
const remote = require("./remote");
const { RATIOS } = require("./project");

const FPS = 30;
const fr = (t) => Math.max(0, Math.round(t * FPS));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const RATE = `<rate><timebase>${FPS}</timebase><ntsc>FALSE</ntsc></rate>`;
const vol = (x, max = 3) => Math.max(0, Math.min(max, Number(x ?? 1)));
// 프리미어는 원본 파일(a.path)을 쓴다 — 편집용 사본(a.edit)은 원본이 없을 때만
const srcFile = (a) => (remote.isRemote(a.path) ? "" : a.path && fs.existsSync(a.path) ? a.path : a.edit && fs.existsSync(a.edit) ? a.edit : "");
const urlOf = (f) => "file://localhost/" + f.replace(/\\/g, "/").split("/").map((x, i) => (i === 0 && /^[A-Za-z]:$/.test(x) ? x[0] + "%3a" : encodeURIComponent(x))).join("/");

function speedFilter(sp) {
  if (Math.abs(sp - 1) < 0.001) return "";
  return `<filter><effect><name>Time Remap</name><effectid>timeremap</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype>` +
    `<parameter><parameterid>variablespeed</parameterid><name>variablespeed</name><value>0</value></parameter>` +
    `<parameter><parameterid>speed</parameterid><name>speed</name><value>${(sp * 100).toFixed(2)}</value></parameter>` +
    `<parameter><parameterid>reverse</parameterid><name>reverse</name><value>FALSE</value></parameter>` +
    `<parameter><parameterid>frameblending</parameterid><name>frameblending</name><value>FALSE</value></parameter></effect></filter>`;
}
function levelFilter(v) {
  if (Math.abs(v - 1) < 0.001) return "";
  return `<filter><effect><name>Audio Levels</name><effectid>audiolevels</effectid><effectcategory>audiolevels</effectcategory><effecttype>audiolevels</effecttype><mediatype>audio</mediatype>` +
    `<parameter><parameterid>level</parameterid><name>Level</name><valuemin>0</valuemin><valuemax>3.98109</valuemax><value>${v.toFixed(4)}</value></parameter></effect></filter>`;
}
/** 크기(원본 화소 기준 %) · 가운데 자리(화면 가운데 0, 가로·세로 화면 크기 비율) */
function motionFilter(scale, cx = 0, cy = 0) {
  if (Math.abs(scale - 100) < 0.01 && !cx && !cy) return "";
  return `<filter><effect><name>Basic Motion</name><effectid>basic</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype>` +
    `<parameter><parameterid>scale</parameterid><name>Scale</name><valuemin>0</valuemin><valuemax>1000</valuemax><value>${scale.toFixed(3)}</value></parameter>` +
    `<parameter><parameterid>center</parameterid><name>Center</name><value><horiz>${cx.toFixed(5)}</horiz><vert>${cy.toFixed(5)}</vert></value></parameter></effect></filter>`;
}

async function exportXml(p, outFile, onProgress = () => {}) {
  const [W, H] = RATIOS[p.ratio] || RATIOS["16:9"];
  const st = p.settings || {};
  const offs = st.off || {};
  const { items, total } = tl.flatten(p);
  const order = tl.clipOrder(p);
  const skipped = new Set();

  const base = path.basename(outFile, path.extname(outFile));
  let dir = path.join(path.dirname(outFile), base);
  for (let n = 2; fs.existsSync(dir); n++) dir = path.join(path.dirname(outFile), `${base}_${n}`);
  const media = path.join(dir, "자료");
  fs.mkdirSync(media, { recursive: true });

  /* ── 파일 — 자료 폴더에 모으고 <file> 한 번만 자세히 ── */
  const files = new Map(); // 원래 경로 → { id, file, info }
  const used = new Set();
  async function fileOf(src, kind, hint = {}) {
    if (files.has(src)) return files.get(src);
    let name = path.basename(src);
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${path.parse(src).name}_${n}${path.extname(src)}`;
    used.add(name.toLowerCase());
    const dst = path.join(media, name);
    onProgress(`자료 모으는 중… ${name}`, 0.1 + 0.8 * (files.size / Math.max(1, files.size + 3)));
    try { fs.linkSync(src, dst); } catch { await fs.promises.copyFile(src, dst); }
    let info = hint;
    if (kind !== "image" && !(hint.duration > 0)) { try { info = { ...hint, ...(await ff.probe(dst)) }; } catch {} }
    const r = { id: `file-${files.size + 1}`, file: dst, name, kind, info, done: false };
    files.set(src, r);
    return r;
  }
  function fileXml(f) {
    if (f.done) return `<file id="${f.id}"/>`;
    f.done = true;
    const i = f.info || {};
    const d = f.kind === "image" ? 18000 : fr(Number(i.duration) || 0);
    const v = f.kind !== "audio" ? `<video><samplecharacteristics>${RATE}<width>${i.width || W}</width><height>${i.height || H}</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></video>` : "";
    const a = f.kind === "audio" || (f.kind === "video" && i.hasAudio !== false) ? `<audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio>` : "";
    return `<file id="${f.id}"><name>${esc(f.name)}</name><pathurl>${urlOf(f.file)}</pathurl>${RATE}<duration>${d}</duration><media>${v}${a}</media></file>`;
  }

  /* ── 트랙 — 끼울 것 [{s, e, in, out, f, mt, filters, link}] ── */
  const V = [[]]; // V1 = 메인
  const A = [[], []]; // A1 = 원본 소리, A2 = AI 목소리
  let nid = 0;
  const put = (tr, it) => { it.id = `clipitem-${++nid}`; tr.push(it); return it; };
  const fitScale = (a, fill) => {
    const w = a.width || W, h = a.height || H;
    return (fill === "cover" ? Math.max(W / w, H / h) : Math.min(W / w, H / h)) * 100;
  };

  onProgress("클립을 옮기는 중…", 0.05);
  for (const { clip, start, dur } of items) {
    const fill = clip.fill || st.fill || "cover";
    const srcA = clip.src ? (p.assets || {})[clip.src.asset] : null;
    const visual = offs.visual ? null : clip.visual && (p.assets || {})[clip.visual.asset] ? p.assets[clip.visual.asset] : clip.type === "voice" ? null : srcA;
    const ok = (a) => a && !a.missing && srcFile(a);
    if (visual && !ok(visual)) skipped.add(remote.isRemote(visual.path) ? "온라인 자료(PC에 없는 영상·사진)" : "찾을 수 없는 자료 파일");
    const ranges = clip.type === "voice" ? null : tl.keepRanges(clip);
    if (ranges && visual === srcA && ok(visual) && visual.kind === "video") {
      // 촬영 클립 — 남길 구간마다 한 조각 (지운 단어 자리는 잘림)
      const sp = tl.srcSpeed(clip);
      const f = await fileOf(srcFile(visual), "video", visual);
      const v0 = fitScale(visual, fill);
      const lv = vol(st.sourceVolume) * vol(clip.volume);
      let t = start;
      for (const r of ranges) {
        const len = (r.e - r.s) / sp;
        const vi = put(V[0], { s: fr(t), e: fr(t + len), in: fr(r.s), out: fr(r.e), f, mt: "video", filters: motionFilter(v0) + speedFilter(sp) });
        if (visual.hasAudio && !clip.muted && !offs.source) {
          const ai = put(A[0], { s: vi.s, e: vi.e, in: vi.in, out: vi.out, f, mt: "audio", filters: speedFilter(sp) + levelFilter(lv) });
          vi.link = ai; ai.link = vi;
        }
        t += len;
      }
      if (clip.speed && Math.abs(sp - 1) > 0.001 && visual.hasAudio) skipped.add("빠르기를 바꾼 클립 소리의 음높이 유지(프리미어에서 [음높이 유지] 확인)");
    } else if (ok(visual)) {
      // 사진 / 넣은 영상 화면
      const kind = visual.kind === "image" ? "image" : "video";
      const f = await fileOf(srcFile(visual), kind, visual);
      const vs = kind === "video" ? Number(clip.visual && clip.visual.s) || 0 : 0;
      const ve = kind === "video" ? (Number(clip.visual && clip.visual.e) > vs ? Number(clip.visual.e) : Number(visual.duration) || vs + dur) : dur;
      const len = Math.min(dur, ve - vs);
      if (len < dur - 0.05) skipped.add("클립보다 짧은 화면 영상의 반복·멈춤 (짧은 만큼 빈칸)");
      if (len > 0.02) put(V[0], { s: fr(start), e: fr(start + len), in: fr(vs), out: fr(vs + len), f, mt: "video", filters: motionFilter(fitScale(visual, fill)) });
      if (kind === "image" && tl.motionOf(p, clip)) skipped.add("사진 움직임(확대·옮기기)");
    }
    // 화면을 바꾼 촬영·녹음 클립 (사진 + 따로 녹음한 소리, 오디오로 편집하기) — 원본 소리는 A1 에 남길 구간만
    if (ranges && srcA && visual !== srcA && ok(srcA) && (srcA.kind === "audio" || srcA.hasAudio) && !clip.muted && !offs.source) {
      const sp = tl.srcSpeed(clip);
      const f = await fileOf(srcFile(srcA), "audio", srcA);
      let t = start;
      for (const r of ranges) {
        const len = (r.e - r.s) / sp;
        put(A[0], { s: fr(t), e: fr(t + len), in: fr(r.s), out: fr(r.e), f, mt: "audio", filters: speedFilter(sp) + levelFilter(vol(st.sourceVolume) * vol(clip.volume)) });
        t += len;
      }
    }
    if ((clip.kf && clip.kf.length) || clip.box || clip.crop) skipped.add("클립 키프레임·자리·자르기");
    // AI 목소리
    if (clip.type === "voice" && !clip.muted && !offs.voice && clip.voice && clip.voice.file && fs.existsSync(clip.voice.file)) {
      const sp = tl.speedOf(clip, st);
      const f = await fileOf(clip.voice.file, "audio");
      const vo = Number(clip.voice.o) || 0;
      const d0 = Number(clip.voice.duration) || Number(f.info.duration) || 0;
      if (d0 > 0) put(A[1], { s: fr(start), e: fr(start + d0 / sp), in: fr(vo), out: fr(vo + d0), f, mt: "audio", filters: speedFilter(sp) + levelFilter(vol(st.voice && st.voice.volume) * vol(clip.volume)) });
    }
  }

  // 사진·영상 레이어 — 하나에 한 줄 (V2~), 뒤 → 앞
  onProgress("레이어를 옮기는 중…", 0.5);
  for (const l of tl.zLayers(p, p.layers || [])) {
    if (l.off) continue;
    if (l.type === "text") { skipped.add("글자 레이어·말머리 (다음 단계: 투명 영상으로 구워 넣기)"); continue; }
    const a = l.asset && (p.assets || {})[l.asset];
    if (!a || !srcFile(a)) { skipped.add("찾을 수 없는 레이어 자료"); continue; }
    const rg = tl.layerRange(p, l, items, order);
    if (!rg || rg.e - rg.s < 0.02) continue;
    const kind = a.kind === "image" ? "image" : "video";
    const f = await fileOf(srcFile(a), kind, a);
    let scale, cx = 0, cy = 0;
    if (l.fit === "cover" || l.fit === "contain") scale = fitScale(a, l.fit);
    else {
      const r = tl.imgRect(l, a, W, H);
      scale = (r.width / (a.width || W)) * 100;
      cx = (r.left + r.width / 2 - W / 2) / W;
      cy = (r.top + r.height / 2 - H / 2) / H;
    }
    if (l.kf && l.kf.length) skipped.add("레이어 키프레임·애니메이션");
    const tr = [];
    V.push(tr);
    const vs = kind === "video" ? Number(l.vs) || 0 : 0;
    const len = kind === "video" && a.duration > 0 ? Math.min(rg.e - rg.s, a.duration - vs) : rg.e - rg.s;
    const vi = put(tr, { s: fr(rg.s), e: fr(rg.s + len), in: fr(vs), out: fr(vs + len), f, mt: "video", filters: motionFilter(scale, cx, cy) });
    const lv = vol(l.volume, 2);
    if (kind === "video" && a.hasAudio && lv > 0) {
      const at = [];
      A.push(at);
      const ai = put(at, { s: vi.s, e: vi.e, in: vi.in, out: vi.out, f, mt: "audio", filters: levelFilter(lv) });
      vi.link = ai; ai.link = vi;
    }
  }

  // 음악 (A3~) — 시작 지점·크기·반복
  onProgress("음악을 옮기는 중…", 0.7);
  for (const l of tl.musicLayers(p, items)) {
    const cov = tl.layerItems(p, l, items, order);
    if (!cov.length || !l.file || !fs.existsSync(l.file)) continue;
    const rg = l.id === "bgm" ? null : tl.layerRange(p, l, items, order);
    const s = rg ? rg.s : cov[0].start;
    const e = rg ? rg.e : cov[cov.length - 1].start + cov[cov.length - 1].dur;
    const f = await fileOf(l.file, "audio");
    const D = Number(f.info.duration) || 0;
    const lv = vol(l.volume ?? 0.15, 2);
    const at = [];
    A.push(at);
    let t = s, from = Number(l.offset) || 0;
    while (t < e - 0.02 && D > 0.1) {
      const len = Math.min(e - t, D - from);
      if (len <= 0.02) break;
      put(at, { s: fr(t), e: fr(t + len), in: fr(from), out: fr(from + len), f, mt: "audio", filters: levelFilter(lv) });
      t += len;
      from = 0;
      if (l.loop === false) break;
    }
    if (Number(l.fadeIn) > 0 || Number(l.fadeOut) > 0 || (l.volKf && l.volKf.length)) skipped.add("음악 페이드·볼륨 선");
  }
  if (items.some((x) => x.clip.volKf && x.clip.volKf.length)) skipped.add("클립 볼륨 선");
  if (items.some((x) => x.clip.trans || x.clip.transition)) skipped.add("전환 효과");

  /* ── XML 쓰기 ── */
  onProgress("XML 쓰는 중…", 0.9);
  const index = (tr) => tr.forEach((it, i) => { it.ix = i + 1; });
  V.forEach(index);
  A.forEach(index);
  const trackOf = (it) => {
    const arr = it.mt === "video" ? V : A;
    return arr.findIndex((tr) => tr.includes(it)) + 1;
  };
  const linkXml = (it) => !it.link ? "" : [it, it.link].map((x) => `<link><linkclipref>${x.id}</linkclipref><mediatype>${x.mt}</mediatype><trackindex>${trackOf(x)}</trackindex><clipindex>${x.ix}</clipindex></link>`).join("");
  const itemXml = (it) =>
    `<clipitem id="${it.id}"><name>${esc(it.f.name)}</name><enabled>TRUE</enabled><duration>${it.f.kind === "image" ? 18000 : fr(Number(it.f.info.duration) || 0)}</duration>${RATE}` +
    `<start>${it.s}</start><end>${it.e}</end><in>${it.in}</in><out>${it.out}</out>${fileXml(it.f)}` +
    (it.mt === "audio" ? `<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>` : "") +
    `${it.filters || ""}${linkXml(it)}</clipitem>`;
  const end = Math.max(fr(total), ...[...V, ...A].flat().map((x) => x.e));
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="sequence-1"><name>${esc(p.name || base)}</name><duration>${end}</duration>${RATE}` +
    `<media><video><format><samplecharacteristics>${RATE}<width>${W}</width><height>${H}</height><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics></format>` +
    V.map((tr) => `<track>${tr.map(itemXml).join("")}<enabled>TRUE</enabled><locked>FALSE</locked></track>`).join("") +
    `</video><audio><numOutputChannels>2</numOutputChannels><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format>` +
    A.map((tr) => `<track premiereTrackType="Stereo">${tr.map(itemXml).join("")}<enabled>TRUE</enabled><locked>FALSE</locked><outputchannelindex>1</outputchannelindex></track>`).join("") +
    `</audio></media><timecode>${RATE}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode></sequence></xmeml>\n`;
  const file = path.join(dir, `${path.basename(dir)}.xml`);
  fs.writeFileSync(file, xml, "utf8");
  // 자막 — 같은 폴더에 .srt (프리미어: 가져오기 → 캡션 트랙)
  const srt = require("./project").exportText(p, "srt", path.join(dir, `${path.basename(dir)}.srt`));
  onProgress("다 됐어요", 1);
  return { file, dir, srt, skipped: [...skipped] };
}

/* ══ 가져오기 — 프리미어·다빈치·AI 가 만든 FCP7 XML → import.js 중간 모양 (2026-11-01 사장님) ══ */

/** 아주 작은 XML 읽기 — { n: 이름, a: {속성}, c: [자식], t: 글 } */
function parseXml(src) {
  const s = String(src).replace(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<!\[CDATA\[([\s\S]*?)\]\]>/g, (m, cd) => (cd !== undefined ? esc(cd) : ""));
  const un = (t) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
  const root = { n: "#root", a: {}, c: [], t: "" };
  const stack = [root];
  const re = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(s))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) { top.t += un(m[5]); continue; }
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    const a = {};
    for (const x of m[3].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) a[x[1]] = un(x[2] ?? x[3]);
    const el = { n: m[2], a, c: [], t: "" };
    top.c.push(el);
    if (!m[4]) stack.push(el);
  }
  return root;
}
const kid = (e, n) => (e && e.c.find((x) => x.n === n)) || null;
const kids = (e, n) => (e ? e.c.filter((x) => x.n === n) : []);
const txt = (e, n) => { const k = kid(e, n); return k ? k.t.trim() : ""; };
const numOf = (e, n, d = 0) => { const v = Number(txt(e, n)); return Number.isFinite(v) && txt(e, n) !== "" ? v : d; };
function findAll(e, n, out = []) { for (const x of e.c) { if (x.n === n) out.push(x); findAll(x, n, out); } return out; }
const fpsOf = (rateEl, d = FPS) => { if (!rateEl) return d; const tb = numOf(rateEl, "timebase", d) || d; return txt(rateEl, "ntsc").toUpperCase() === "TRUE" ? (tb * 1000) / 1001 : tb; };
const IMG = /\.(jpe?g|png|webp|bmp|gif|tiff?|heic)$/i;

/** pathurl → PC 경로 (file://localhost/C%3a/… · file:///C:/…) */
function pathOfUrl(u) {
  let p = String(u || "").trim();
  if (!p) return "";
  p = p.replace(/^file:\/\/localhost\//i, "").replace(/^file:\/\/\//i, "").replace(/^file:\/\//i, "");
  try { p = decodeURIComponent(p); } catch {}
  if (/^[A-Za-z]:/.test(p)) return p.replace(/\//g, path.sep);
  return process.platform === "win32" && p.startsWith("/") && /^\/[A-Za-z]:/.test(p) ? p.slice(1).replace(/\//g, path.sep) : (p.startsWith("/") ? p : "/" + p);
}

function srtRead(file) {
  const out = [];
  const t = (x) => { const m = /(\d+):(\d+):(\d+)[,.](\d+)/.exec(x); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000 : 0; };
  for (const blk of fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n\s*\r?\n/)) {
    const lines = blk.split(/\r?\n/).filter((x) => x.trim());
    const k = lines.findIndex((x) => x.includes("-->"));
    if (k < 0) continue;
    const [a, b] = lines[k].split("-->");
    const text = lines.slice(k + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (text) out.push({ text, at: t(a), dur: Math.max(0.1, t(b) - t(a)), sub: true });
  }
  return out;
}

function fromXml(file) {
  const root = parseXml(fs.readFileSync(file, "utf8"));
  const seq = findAll(root, "sequence").find((s) => kid(s, "media")) || null;
  if (!seq) throw new Error("XML 안에서 시퀀스(편집 타임라인)를 찾지 못했어요. 프리미어·다빈치의 [Final Cut Pro XML 내보내기] 파일인지 확인해 주세요.");
  const here = path.dirname(file);
  const fps = fpsOf(kid(seq, "rate"));
  const fmt = kid(kid(kid(kid(seq, "media"), "video"), "format"), "samplecharacteristics");
  const W = numOf(fmt, "width", 1920) || 1920, H = numOf(fmt, "height", 1080) || 1080;
  // <file id> — 처음 한 번만 자세히, 뒤로는 id 만
  const defs = new Map();
  for (const f of findAll(root, "file")) if (f.a.id && (kid(f, "pathurl") || kid(f, "name"))) defs.set(f.a.id, f);
  const miss = new Set();
  const fileOf = (ci) => {
    let f = kid(ci, "file");
    if (f && f.a.id && defs.has(f.a.id)) f = defs.get(f.a.id);
    if (!f) return null;
    const p = pathOfUrl(txt(f, "pathurl"));
    const nm = txt(f, "name") || path.basename(p);
    const sc = kid(kid(kid(f, "media"), "video"), "samplecharacteristics");
    const info = { width: numOf(sc, "width"), height: numOf(sc, "height") };
    // 못 찾으면 XML 옆 "자료"·XML 옆에서 같은 이름 (우리가 내보낸 폴더 · 다른 PC)
    const found = [p, path.join(here, "자료", path.basename(p || nm)), path.join(here, path.basename(p || nm)), path.join(here, "자료", nm), path.join(here, nm)].find((x) => x && fs.existsSync(x) && fs.statSync(x).isFile());
    if (!found) { miss.add(nm || p); return null; }
    return { file: found, ...info };
  };
  const effects = (ci) => findAll(ci, "effect");
  const param = (eff, id) => kids(eff, "parameter").find((p) => txt(p, "parameterid") === id) || null;
  const speedOf = (ci) => {
    const tr = effects(ci).find((e) => txt(e, "effectid") === "timeremap");
    const v = tr && Number(txt(param(tr, "speed"), "value"));
    return v && Number.isFinite(v) ? Math.abs(v) / 100 : 0;
  };
  const levelOf = (ci) => {
    const lv = effects(ci).find((e) => txt(e, "effectid") === "audiolevels");
    const v = lv && Number(txt(param(lv, "level"), "value"));
    return lv && Number.isFinite(v) ? v : 1;
  };
  const motionOf = (ci) => {
    const bm = effects(ci).find((e) => txt(e, "effectid") === "basic");
    if (!bm) return null;
    const sc = Number(txt(param(bm, "scale"), "value"));
    const ce = kid(param(bm, "center"), "value");
    return { scale: Number.isFinite(sc) ? sc : 100, cx: numOf(ce, "horiz"), cy: numOf(ce, "vert") };
  };
  const skip = {};
  const add = (k, n = 1) => { skip[k] = (skip[k] || 0) + n; };
  /** 한 줄의 클립들 — 시작·끝이 -1(전환에 붙은 쪽)이면 이웃 전환으로 메운다 */
  const items = (track) => {
    const out = [];
    let prevEnd = 0;
    const list = track.c.filter((x) => x.n === "clipitem" || x.n === "transitionitem" || x.n === "generatoritem");
    list.forEach((ci, i) => {
      if (ci.n === "transitionitem") { add("전환"); return; }
      if (ci.n === "generatoritem") { add("글자·색 판(제너레이터)"); return; }
      if (txt(ci, "enabled").toUpperCase() === "FALSE") return;
      const r = fpsOf(kid(ci, "rate"), fps);
      const inF = numOf(ci, "in"), outF = numOf(ci, "out");
      let s = numOf(ci, "start", -1), e = numOf(ci, "end", -1);
      const nx = list[i + 1];
      if (s < 0) s = list[i - 1] && list[i - 1].n === "transitionitem" ? (numOf(list[i - 1], "start") + numOf(list[i - 1], "end")) / 2 : prevEnd * fps;
      if (e < 0) e = nx && nx.n === "transitionitem" ? (numOf(nx, "start") + numOf(nx, "end")) / 2 : s + (outF - inF);
      prevEnd = e / fps;
      if (e - s < 1) return;
      const f = fileOf(ci);
      if (!f) return;
      const at = s / fps, dur = (e - s) / fps;
      const speed = speedOf(ci) || ((outF - inF) / r) / dur || 1;
      out.push({ ci, f, at, dur, s: inF / r, e: outF / r, speed });
    });
    return out;
  };
  const out = { name: txt(seq, "name") || path.basename(file, path.extname(file)), ratio: "", W, H, main: [], texts: [], audio: [], overlays: [], skipped: [] };
  const vt = kids(kid(kid(seq, "media"), "video"), "track");
  const at_ = kids(kid(kid(seq, "media"), "audio"), "track");
  const mainKeys = new Set();
  vt.forEach((tr, ti) => {
    if (txt(tr, "enabled").toUpperCase() === "FALSE") return;
    for (const x of items(tr)) {
      const photo = IMG.test(x.f.file);
      const mo = motionOf(x.ci);
      if (mo && (findAll(x.ci, "keyframe").length)) add("키프레임");
      if (ti === 0) {
        out.main.push({ at: x.at, file: x.f.file, s: photo ? 0 : x.s, e: photo ? 0 : x.e, hold: x.dur, speed: photo ? 1 : Math.round(x.speed * 1000) / 1000, volume: 1 });
        mainKeys.add(`${x.f.file}|${Math.round(x.at * 10)}`);
      } else {
        const fw = x.f.width || W;
        const w = mo ? (mo.scale / 100) * (fw / W) : Math.min(1, fw / W);
        out.overlays.push({ file: x.f.file, at: x.at, dur: x.dur, s: photo ? 0 : x.s, x: 0.5 + (mo ? mo.cx : 0), y: 0.5 + (mo ? mo.cy : 0), w: Math.max(0.05, Math.min(1, w)) });
      }
    }
  });
  // 소리 — 메인 영상에 붙은 원본 소리는 클립이 가져가고, 나머지(목소리·음악·효과음)만. 스테레오 둘로 나뉜 건 하나로
  const seen = new Set();
  for (const tr of at_) {
    if (txt(tr, "enabled").toUpperCase() === "FALSE") continue;
    for (const x of items(tr)) {
      if (mainKeys.has(`${x.f.file}|${Math.round(x.at * 10)}`)) continue;
      const k = `${x.f.file}|${Math.round(x.at * 10)}|${Math.round(x.s * 10)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.audio.push({ file: x.f.file, at: x.at, dur: x.dur, offset: x.s, volume: Math.round(levelOf(x.ci) * 1000) / 1000, name: path.basename(x.f.file) });
    }
  }
  // 같은 이름 .srt 가 옆에 있으면 메인자막으로
  const srt = path.join(here, `${path.basename(file, path.extname(file))}.srt`);
  if (fs.existsSync(srt)) { try { out.texts.push(...srtRead(srt)); } catch {} }
  out.skipped = Object.entries(skip).map(([k, n]) => `${k} ${n}개`);
  if (miss.size) out.skipped.push(`찾지 못한 파일 ${miss.size}개 (${[...miss].slice(0, 3).join(", ")}${miss.size > 3 ? " …" : ""})`);
  return out;
}

module.exports = { exportXml, fromXml, parseXml };
