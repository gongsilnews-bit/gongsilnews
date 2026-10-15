// 공실 분석·캡처 (기사·블로그·SNS·영상이 함께 쓰는 1단계)
// 앱이 안 보이는 창에 공실열람 상세(/gongsil?id=…)를 열고, 크롬 확장과 같은 방법으로
//  - 매물 정보(제목·금액·상세표·특징·주변환경)를 읽고
//  - 등록 사진을 전부 내려받고
//  - 화면 3장(공실열람 검증 16:9 · 지도 · 로드뷰)을 찍는다.
// 결과는 userData/media/<공실ID>/ 에 파일로 남겨 다음 단계들이 다시 찍지 않고 쓴다.
const { app, BrowserWindow, net } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const { execFile } = require("child_process");
const { ffmpegPath } = require("./paths");

const PAGE_SCRIPT = fs.readFileSync(path.join(__dirname, "inject", "gongsil-page.js"), "utf8");
const SHOTS = [
  { target: "proof", name: "공실열람 검증" },
  { target: "map", name: "지도" },
  { target: "roadview", name: "로드뷰" },
];
const MAX_WIDTH = 1280;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function field(v, ...labels) {
  for (const want of labels) {
    const hit = (v.fields || []).find((f) => f.label === want);
    if (hit) return hit.value;
  }
  return "";
}

/* 사진마다 붙는 설명글 (확장 media.js gwCaptionFor 와 같은 문구) */
function captionFor(kind, v, index = 0) {
  const name = (v && (v.title || field(v, "소재지"))) || "해당 매물";
  const price = (v && v.priceText) || "";
  switch (kind) {
    case "proof":
      return `[공실뉴스 실매물 등록 검증] 공실뉴스에 공식 등록된 '${name}'${price ? ` (${price})` : ""} 등록 현황`;
    case "photo":
      return index === 0 ? `${name} 현장 실물 전경 (자료: 공실뉴스)` : `${name} 현장 실물 ${index + 1} (자료: 공실뉴스)`;
    case "map":
      return `[위치 지도] ${name} 위치 및 주변 환경 (자료: 위치정보 지도)`;
    case "roadview":
      return `[현장 로드뷰] ${name} 진입로 및 가로변 전경 (자료: 로드뷰)`;
    default:
      return name;
  }
}

function extOf(contentType, url) {
  if (/png/i.test(contentType)) return "png";
  if (/webp/i.test(contentType)) return "webp";
  if (/jpe?g/i.test(contentType)) return "jpg";
  const m = String(url).match(/\.(png|webp|jpe?g)(\?|$)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

async function downloadPhoto(url, fileBase) {
  const res = await net.fetch(url);
  if (!res.ok) throw new Error(`사진 내려받기 실패 ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = extOf(res.headers.get("content-type") || "", url);
  const file = `${fileBase}.${ext}`;
  fs.writeFileSync(file, buf);
  if (ext === "jpg" || ext === "png") return file;
  return toJpeg(file, `${fileBase}.jpg`);
}

/* webp 등은 앱 이미지 도구·네이버 붙여넣기에서 안전한 jpg 로 바꿔 둔다 (앱에 넣은 FFmpeg) */
function toJpeg(src, dest) {
  const ff = ffmpegPath();
  if (!ff) return Promise.resolve(src);
  return new Promise((resolve) => {
    execFile(ff, ["-y", "-loglevel", "error", "-i", src, "-q:v", "2", dest], (err) => {
      if (err || !fs.existsSync(dest)) return resolve(src);
      fs.rmSync(src, { force: true });
      resolve(dest);
    });
  });
}

async function waitFor(win, expr, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (win.isDestroyed()) return false;
    const ok = await win.webContents.executeJavaScript(`(${expr})`).catch(() => false);
    if (ok) return true;
    await sleep(300);
  }
  return false;
}

/**
 * 공실 하나를 분석·캡처한다.
 * @returns {{ vacancy, media: {kind, file, caption, real}[], failures: string[], dir }}
 */
async function analyzeVacancy(baseUrl, vacancyId, onProgress = () => {}) {
  const dir = path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""));
  // 분석이 만드는 파일(등록 사진·캡처)만 새로 만든다. 써 둔 블로그(blog.json)와 추가한 사진(added/)은 둔다
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    if (/^(photo-\d+|proof|map|roadview)\.(jpe?g|png|webp|gif)$/i.test(f)) fs.rmSync(path.join(dir, f), { force: true });
  }

  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 900,
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setAudioMuted(true);

  try {
    onProgress("공실열람 화면을 여는 중…");
    await win.loadURL(`${baseUrl}/gongsil?id=${encodeURIComponent(vacancyId)}`);
    await win.webContents.executeJavaScript(PAGE_SCRIPT);
    const ready = await waitFor(win, "window.__gongsilStudio && window.__gongsilStudio.isReady()", 20000);
    if (!ready) throw new Error("공실열람 상세 화면이 열리지 않았습니다. 공실 번호를 확인해 주세요.");
    await sleep(1200); // 사진·표가 다 그려질 때까지

    onProgress("매물 정보를 읽는 중…");
    const got = await win.webContents.executeJavaScript("window.__gongsilStudio.collectVacancy()");
    if (!got || !got.ok) throw new Error((got && got.reason) || "매물 정보를 읽지 못했습니다.");
    const vacancy = got.vacancy;

    const media = [];
    const failures = [];

    /* 1. 등록 사진 — 있는 만큼 전부 */
    const images = vacancy.images || [];
    for (let i = 0; i < images.length; i++) {
      onProgress(`등록 사진 내려받는 중… (${i + 1}/${images.length})`);
      try {
        const file = await downloadPhoto(images[i], path.join(dir, `photo-${String(i + 1).padStart(2, "0")}`));
        media.push({ kind: "photo", file, url: images[i], caption: captionFor("photo", vacancy, i), real: true });
      } catch (e) {
        failures.push(`등록 사진 ${i + 1}: ${e.message}`);
      }
    }

    /* 2·3·4. 공실열람 검증 · 지도 · 로드뷰 */
    for (const shot of SHOTS) {
      onProgress(`${shot.name} 화면을 찍는 중…`);
      try {
        const prep = await win.webContents.executeJavaScript(`window.__gongsilStudio.prepareShot(${JSON.stringify(shot.target)})`);
        if (!prep || !prep.ok) throw new Error((prep && prep.reason) || "준비 실패");
        let image = await win.webContents.capturePage(prep.rect);
        if (image.isEmpty()) throw new Error("빈 화면이 찍혔습니다.");
        if (image.getSize().width > MAX_WIDTH) image = image.resize({ width: MAX_WIDTH, quality: "best" });
        const file = path.join(dir, `${shot.target}.jpg`);
        fs.writeFileSync(file, image.toJPEG(90));
        media.push({ kind: shot.target, file, caption: captionFor(shot.target, vacancy), real: true });
      } catch (e) {
        failures.push(`${shot.name}: ${e.message}`);
      }
    }
    await win.webContents.executeJavaScript("window.__gongsilStudio.restoreScroll()").catch(() => {});

    const result = { vacancyId, vacancy, media, failures, dir, analyzedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(dir, "analysis.json"), JSON.stringify(result, null, 2));
    log.info(`[공실 분석] ${vacancyId} 사진 ${media.filter((m) => m.kind === "photo").length}장, 캡처 ${media.filter((m) => m.kind !== "photo").length}장, 실패 ${failures.length}`);
    return result;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

module.exports = { analyzeVacancy, captionFor };
