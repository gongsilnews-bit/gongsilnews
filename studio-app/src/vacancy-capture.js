// 공실 분석·캡처 (기사·블로그·SNS·영상이 함께 쓰는 1단계)
// 앱이 안 보이는 창에 공실열람 상세(/gongsil?id=…)를 열고, 크롬 확장과 같은 방법으로
//  - 매물 정보(제목·금액·상세표·특징·주변환경)를 읽고
//  - 등록 사진을 전부 내려받고
//  - 화면 3장(공실열람 검증 16:9 · 지도 · 로드뷰)을 찍는다.
// 결과는 userData/media/<공실ID>/ 에 파일로 남겨 다음 단계들이 다시 찍지 않고 쓴다.
const { app, BrowserWindow, net, session } = require("electron");
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

/* 기사에 쓰지 않는 공고 부속 정보 — 정보제공처(온비드 고객센터 연락처)와 입찰 전 법적 주의사항 */
const EXCLUDED_FACT = /정보\s*제공|고객\s*센터|주의\s*사항|1588-?5321/;

/* 경매·공매 물건이면 서버 정보를, 아니면 null (확장 panel.js fetchAuction 과 같다) */
async function fetchAuction(baseUrl, domVacancy) {
  const id = domVacancy.vacancyId;
  if (!id) return null;
  const res = await session.defaultSession.fetch(`${baseUrl}/api/extension/auction-source?id=${encodeURIComponent(id)}`).catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  if (!data || !data.success) return null; // 일반 매물
  return {
    vacancyId: data.id,
    saleKind: data.saleKind,
    title: data.title,
    priceText: data.priceText,
    location: data.location,
    propertyType: data.propertyType,
    detailPath: data.detailPath,
    fields: (data.facts || []).filter((f) => !EXCLUDED_FACT.test(`${f.label} ${f.value}`)),
    images: (domVacancy.images || []).length ? domVacancy.images : data.images || [],
    url: domVacancy.url,
  };
}

/* 경매·공매 물건 사진 설명글 (확장 media.js gwAuctionCaptionFor 와 같은 문구) */
function auctionCaptionFor(kind, v, index = 0) {
  const name = (v && (v.title || field(v, "소재지(지번)", "소재지"))) || "해당 물건";
  const price = (v && v.priceText) || "";
  const saleKind = (v && v.saleKind) || "경매";
  switch (kind) {
    case "proof":
      return `[공실열람 ${saleKind} 물건 정보] 공실뉴스 공실열람에 게재된 '${name}'${price ? ` (${price})` : ""} ${saleKind} 물건 현황`;
    case "photo":
      return index === 0 ? `${name} 전경 (자료: 공실뉴스)` : `${name} 사진 ${index + 1} (자료: 공실뉴스)`;
    case "map":
      return `[위치 지도] ${name} 위치 및 주변 환경 (자료: 위치정보 지도)`;
    case "roadview":
      return `[현장 로드뷰] ${name} 진입로 및 가로변 전경 (자료: 로드뷰)`;
    default:
      return name;
  }
}

/* 사진마다 붙는 설명글 (확장 media.js gwCaptionFor 와 같은 문구) */
function captionFor(kind, v, index = 0) {
  if (v && v.saleKind) return auctionCaptionFor(kind, v, index);
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

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

async function downloadPhoto(url, fileBase) {
  let res = await net.fetch(url).catch(() => null);
  // 온비드 등 일부 서버는 앱 기본 요청을 거부한다(500) — 브라우저와 같은 요청으로 한 번 더
  if (!res || !res.ok) res = await fetch(url, { headers: { "User-Agent": BROWSER_UA, Accept: "image/*,*/*" } }).catch(() => null);
  if (!res || !res.ok) throw new Error(`사진 내려받기 실패 ${res ? res.status : ""}`.trim());
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
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(path.join(dir, "analysis.json"), "utf8")); } catch {}
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
    // 경매·공매 물건이면 서버의 물건 정보(사건번호·집행기관·감정가·최저입찰가)를 쓴다
    const vacancy = (await fetchAuction(baseUrl, got.vacancy)) || got.vacancy;
    if (vacancy.saleKind) onProgress(`${vacancy.saleKind} 물건으로 확인했습니다.`);
    else if (!(vacancy.fields || []).length) throw new Error("매물 상세 표를 읽지 못했습니다.");

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

    // 다시 분석해도 회원이 넣은 AI 사진은 남기고, 뺀 사진은 계속 뺀 채로 (2026-10-28 사장님: 전부 다 고쳐줘)
    const hidden = [];
    if (prev) {
      const ok = (m) => m && m.file && fs.existsSync(m.file);
      const goneFiles = new Set((prev.hidden || []).filter((m) => m.kind !== "ai").map((m) => m.file));
      for (let i = media.length - 1; i >= 0; i--) if (goneFiles.has(media[i].file)) hidden.unshift(...media.splice(i, 1));
      media.push(...(prev.media || []).filter((m) => m.kind === "ai" && ok(m)));
      hidden.push(...(prev.hidden || []).filter((m) => m.kind === "ai" && ok(m)));
    }
    const result = { vacancyId, vacancy, media, hidden, failures, dir, analyzedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(dir, "analysis.json"), JSON.stringify(result, null, 2));
    log.info(`[공실 분석] ${vacancyId} 사진 ${media.filter((m) => m.kind === "photo").length}장, 캡처 ${media.filter((m) => m.kind !== "photo").length}장, 실패 ${failures.length}`);
    return result;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

module.exports = { analyzeVacancy, captionFor };
