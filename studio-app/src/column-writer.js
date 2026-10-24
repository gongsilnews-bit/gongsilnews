// 뉴스칼럼 (뉴스·SNS발행 > 뉴스칼럼) — 크롬 확장 뉴스메이커(newsmaker10)를 앱으로 옮긴 것
//
// 소재 하나 = 칼럼 하나. 소재를 정하면 "col-…" 번호를 붙여 userData/media/<번호>/source.json 에 둔다.
// 이 번호를 공실 번호처럼 쓰므로 기사·블로그·SNS 탭과 미리보기 편집기·기사쓰기 보내기·네이버 채우기는
// 공실뉴스와 같은 길을 탄다 (각 모듈이 isColumn(번호)로 뉴스메이커 프롬프트로 갈라진다).
//
// 소재 (1차: 뉴스·주제 직접입력 — 시세 2종은 다음 단계)
//  - 뉴스 주소 붙여넣기: 안 보이는 창에 그 주소를 열고 확장 news-extract.js 로 제목·언론사·날짜·본문을 읽는다
//  - 지금 보는 뉴스: 스튜디오 전용 크롬에서 보고 있는 뉴스 탭을 같은 방법으로 읽는다
//  - 주제 직접입력: 주제·서론·본론·결론·참고 메모
// 원문 기사 사진은 쓰지 않는다 (저작권). 대신 기사를 쓰면 AI 대표 이미지를 자동으로 만든다 (끌 수 있음).
const { app, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const log = require("electron-log/main");
const nm = require("./ext-newsmaker");
const chatgpt = require("./ai"); // 고른 글쓰기 AI (ChatGPT · Gemini) — 그림은 ChatGPT
const chrome = require("./studio-chrome");

const isColumn = (id) => /^col-[a-f0-9]+$/.test(String(id || ""));
const mediaDir = (id) => path.join(app.getPath("userData"), "media", String(id).replace(/[^\w-]/g, ""));
const sourceFile = (id) => path.join(mediaDir(id), "source.json");
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const EXTRACT = () => `${nm.NEWS_EXTRACT_SRC}\n;gwNewsExtract(document, location.href)`; // 서버에서 받은 글로 그때 만든다
const NEWS_HOME = "https://news.naver.com/section/101"; // 네이버 뉴스 경제
// 뉴스 읽기가 본문을 못 찾는 화면(정부·기관 보도자료 등) — 문단 글이 가장 많이 모인 칸을 본문으로 (2026-10-20 사장님: 보도자료로 영상 대본)
const GENERIC_SRC = `(() => {
  const clean = (t) => String(t || "").replace(/[ \\t\\u00a0]+/g, " ").replace(/\\n\\s*\\n+/g, "\\n").trim();
  const meta = (k) => (document.querySelector('meta[property="' + k + '"],meta[name="' + k + '"]') || {}).content || "";
  const SKIP = /comment|reply|policy|footer|copyright|guide|rule|sns|share|related|banner/i;
  let body = "";
  // ① 기관 게시판에 흔한 본문 칸
  for (const sel of [".view_cont", ".article_body", ".bbs_view .view_cont", ".bd-view .dbdata", ".board_view .view_content", ".view_content", ".bbs-view-content", ".board-view-content", ".view-cont", ".viewCont", "#viewContent", ".view_txt", ".bd_view_cont", "article"]) {
    const el = document.querySelector(sel);
    const t = el ? clean(el.innerText) : "";
    if (t.length >= 200) { body = t; break; }
  }
  // ①-2 본문을 같은 사이트의 안쪽 창(iframe)에 그리는 곳 (정책브리핑 보도자료 등)
  if (!body) {
    const walk = (doc, depth) => {
      for (const f of doc.querySelectorAll("iframe")) {
        let d = null;
        try { d = f.contentDocument; } catch (e) {}
        if (!d || !d.body) continue;
        const t = clean(d.body.innerText);
        if (t.length >= 200 && t.length > body.length) body = t;
        if (depth < 3) walk(d, depth + 1); // 창 안의 창 (정책브리핑 문서 보기)
      }
    };
    walk(document, 0);
  }
  // ② 페이지에 담긴 기사 정보 (JSON-LD)
  if (!body) {
    for (const sc of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { const j = JSON.parse(sc.textContent); const t = clean(j.articleBody || j.description); if (t.length >= 200) { body = t; break; } } catch (e) {}
    }
  }
  // ③ 문단 글이 가장 많이 모인 칸 (댓글 규칙·저작권 안내 칸은 뺀다)
  if (!body) {
    const score = new Map();
    const add = (el, v) => { if (el && el !== document.body && el !== document.documentElement) score.set(el, (score.get(el) || 0) + v); };
    for (const p of document.querySelectorAll("p, li, td, div")) {
      if (p.closest("nav, header, footer, aside, script, style, form")) continue;
      let bad = false;
      for (let x = p; x && x !== document.body; x = x.parentElement) if (SKIP.test((x.className && String(x.className)) + " " + (x.id || ""))) { bad = true; break; }
      if (bad) continue;
      if (p.tagName === "DIV" && p.querySelector("p, div, table, ul")) continue;
      const t = clean(p.innerText);
      if (t.length < 25) continue;
      const links = [...p.querySelectorAll("a")].reduce((a, x) => a + clean(x.innerText).length, 0);
      if (links > t.length * 0.5) continue;
      const v = Math.min(t.length, 800);
      add(p.parentElement, v);
      add(p.parentElement && p.parentElement.parentElement, v / 2);
    }
    let best = null, top = 0;
    for (const [el, v] of score) if (v > top) { top = v; best = el; }
    body = best ? clean(best.innerText) : "";
  }
  if (body.length < 200) return { ok: false, reason: "이 화면에서 본문을 찾지 못했습니다. 보도자료 한 건이 열린 화면에서 다시 눌러 주세요." };
  const og = clean(meta("og:title"));
  const h = document.querySelector(".view_title, .article_head h1, .subject, .tit, .title, h1, h2, h3");
  const title = (og && !/\\|/.test(og) ? og : clean(h && h.innerText) || og || document.title).slice(0, 200);
  const site = clean(meta("og:site_name") || document.title.split(/[|\\-–]/).pop() || location.hostname);
  return { ok: true, news: { title, publisher: site.slice(0, 40), publishedAt: "", url: location.href, body: body.slice(0, 9000), truncated: body.length > 9000 } };
})()`;

/* ── 뉴스 가져오기 ── */

// 뉴스 읽기가 요약 한 줄(소개 글)만 잡은 경우 — 다른 읽기로 찾은 본문이 더 길면 그 본문으로 (제목·언론사는 뉴스 읽기 것)
const SHORT_BODY = 400;
function pickBody(r, g) {
  if (!g || !g.ok) return r;
  if (!r || !r.ok) return g;
  return g.news.body.length > r.news.body.length ? { ok: true, news: { ...r.news, body: g.news.body, truncated: g.news.truncated } } : r;
}

/* 주소 붙여넣기: 안 보이는 창에 열어 읽는다 (자바스크립트로 그리는 언론사 화면도 읽히게 진짜 화면으로 연다) */
async function fetchNews(url) {
  const href = String(url || "").trim();
  if (!/^https?:\/\//i.test(href)) throw new Error("뉴스 주소(https://…)를 붙여넣어 주세요.");
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { partition: "column-news", javascript: true, images: true, sandbox: true }, // 기사 화면 캡처에 사진이 보이게
  });
  const wc = win.webContents;
  wc.setAudioMuted(true);
  wc.setWindowOpenHandler(() => ({ action: "deny" }));
  win.on("close", (e) => e.preventDefault()); // 언론사 화면의 window.close() 로 창이 먼저 닫히지 않게 (끝나면 destroy 로 닫는다)
  wc.on("will-prevent-unload", (e) => e.preventDefault());
  try {
    await Promise.race([
      wc.loadURL(href, { userAgent: BROWSER_UA }).catch((e) => {
        // 광고·추적 요청이 끊기거나 주소가 넘어가도 본문은 이미 그려져 있을 수 있다 — 페이지를 못 연 경우만 오류
        if (win.isDestroyed() || !wc.getURL()) throw e;
      }),
      sleep(25000),
    ]).catch((e) => log.warn(`[뉴스칼럼] 페이지 열기 ${e.message}`));
    // 늦게 그려지는 본문을 조금 기다리며 두세 번 읽어 본다
    let r = null;
    for (let i = 0; i < 4 && !win.isDestroyed(); i++) {
      await sleep(i === 0 ? 800 : 1500);
      if (win.isDestroyed()) break;
      r = await wc.executeJavaScript(EXTRACT(), true).catch(() => null);
      if (r && r.ok && r.news.body.length >= SHORT_BODY) break;
      if (i < 2) continue; // 뉴스 화면은 늦게 그려질 수 있어 두 번은 뉴스 읽기로만
      const g = await wc.executeJavaScript(GENERIC_SRC, true).catch(() => null);
      r = pickBody(r, g);
      if (r && r.ok && r.news.body.length >= SHORT_BODY) break;
    }
    if (!r) throw new Error("뉴스 페이지를 열지 못했습니다. 주소를 확인해 주세요.");
    if (!r.ok) throw new Error(r.reason);
    const shots = await captureWin(wc).catch((e) => { log.warn(`[뉴스칼럼] 기사 화면 캡처 못함 ${e.message}`); return []; });
    lastShots = { url: r.news.url || href, shots };
    log.info(`[뉴스칼럼] 뉴스 가져옴 ${r.news.publisher} · ${r.news.title.slice(0, 40)} · 화면 ${shots.length}장`);
    return withThumbs(r.news, shots);
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

/* [네이버 뉴스 열기]: 스튜디오 전용 크롬에 네이버 뉴스(경제)를 연다 — 둘러보다가 [지금 보는 뉴스 가져오기] */
async function openNews() {
  await chrome.openPage("news.naver.com", NEWS_HOME);
  return { ok: true };
}

/* 보도자료 사이트 바로가기 (동영상제작 › 뉴스 기사 › 보도자료, 2026-10-20 사장님) — 전용 크롬에 연다. 둘러보다가 [지금 보는 페이지 가져오기] */
async function openUrl(url) {
  const href = String(url || "").trim();
  if (!/^https:\/\//i.test(href)) throw new Error("주소가 올바르지 않습니다.");
  const host = new URL(href).hostname.replace(/^www\./, "");
  const page = await chrome.openPage(host, href);
  if (!page.url().startsWith(href)) await page.goto(href, { waitUntil: "domcontentloaded" }).catch(() => {});
  return { ok: true };
}

const SKIP_HOSTS = /(^|\.)(chatgpt\.com|openai\.com|claude\.ai|gemini\.google\.com|blog\.naver\.com|nid\.naver\.com)$/;

/* 기사 화면 캡처 3장 — 제목 부분 · 본문 1/3 · 본문 2/3 (짧은 기사는 겹치는 자리를 빼서 1~2장)
   [이 소재로 쓰기](create) 때 칼럼 폴더에 저장하고, 기사·블로그·SNS 사진으로 쓴다. 사진마다 출처(언론사·주소)를 붙인다 */
let lastShots = { url: "", shots: [] };
/** 화면에 보여 줄 작은 사진 (저장은 create 때 원본으로) */
const withThumbs = (news, shots) => ({ ...news, shots: shots.map((b) => nativeImage.createFromBuffer(b).resize({ width: 220 }).toDataURL()) });
/** 기사 자리 계산 — 제목 · 본문 1/3 · 본문 2/3 (겹치면 빼기) */
const SHOT_POS = `(() => {
  const body = document.querySelector("#dic_area, #newsct_article, #articleBodyContents, [itemprop='articleBody'], article");
  const head = document.querySelector("#title_area, .media_end_head_headline, .media_end_head, h1, h2") || body || document.body;
  const y0 = Math.max(0, head.getBoundingClientRect().top + scrollY - 60);
  const r = body ? body.getBoundingClientRect() : null;
  const top = r ? r.top + scrollY : y0;
  const h = r ? r.height : document.body.scrollHeight - y0;
  return { ys: [y0, top + h * 0.33, top + h * 0.66], back: scrollY, vh: innerHeight, max: Math.max(0, document.documentElement.scrollHeight - innerHeight) };
})()`;
/** 늘 3장 (2026-10-23 사장님) — 기사가 짧아 자리가 겹치면 화면을 조금씩(0.55화면) 내려가며 채운다 */
const pickYs = (pos) => {
  const clamp = (y) => Math.max(0, Math.min(Math.round(y), pos.max ?? Infinity));
  const ys = [];
  const add = (y) => { y = clamp(y); if (!ys.some((v) => Math.abs(v - y) < pos.vh * 0.3)) ys.push(y); };
  pos.ys.forEach(add);
  for (let k = 1; ys.length < 3 && k <= 6; k++) add(pos.ys[0] + k * pos.vh * 0.55);
  return ys.sort((a, b) => a - b).slice(0, 3);
};
/** 안 보이는 창(주소로 가져오기)에서 캡처 */
async function captureWin(wc) {
  const pos = await wc.executeJavaScript(SHOT_POS, true);
  const out = [];
  for (const y of pickYs(pos)) {
    await wc.executeJavaScript(`window.scrollTo(0, ${y})`, true);
    await sleep(700);
    const img = await wc.capturePage();
    if (!img.isEmpty()) out.push(img.toJPEG(85));
  }
  return out;
}
async function captureNews(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const pos = await page.evaluate(SHOT_POS);
    const ys = pickYs(pos);
    const out = [];
    for (const y of ys) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await sleep(600);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 85 });
      out.push(Buffer.from(data, "base64"));
    }
    await page.evaluate((v) => window.scrollTo(0, v), pos.back).catch(() => {});
    return out;
  } finally {
    await cdp.detach().catch(() => {});
  }
}

/* [지금 보는 뉴스 가져오기]: 전용 크롬에서 지금 보고 있는 탭(없으면 가장 최근 탭)을 읽는다 */
async function grabNews() {
  const pages = (await chrome.openPages()).filter((p) => /^https?:/.test(p.url()) && !SKIP_HOSTS.test(chrome.hostOf(p)));
  if (!pages.length) throw new Error("전용 크롬에 열린 뉴스가 없습니다. [네이버 뉴스 열기]로 기사 한 건을 연 뒤 다시 눌러 주세요.");
  // 앞에 보이는 탭부터
  const seen = await Promise.all(pages.map((p) => p.evaluate(() => document.visibilityState === "visible").catch(() => false)));
  const ordered = [...pages.filter((_, i) => seen[i]), ...pages.filter((_, i) => !seen[i]).reverse()];
  let last = null;
  for (const page of ordered) {
    let r = await page.evaluate(EXTRACT()).catch(() => null);
    if (!r || !r.ok || r.news.body.length < SHORT_BODY) r = pickBody(r, await page.evaluate(GENERIC_SRC).catch(() => null));
    if (r && r.ok) {
      const shots = await captureNews(page).catch((e) => { log.warn(`[뉴스칼럼] 기사 화면 캡처 못함 ${e.message}`); return []; });
      lastShots = { url: r.news.url || page.url(), shots };
      log.info(`[뉴스칼럼] 보던 뉴스 가져옴 ${r.news.publisher} · ${r.news.title.slice(0, 40)} · 화면 ${shots.length}장`);
      return withThumbs(r.news, shots);
    }
    last = r;
  }
  throw new Error((last && last.reason) || "열린 탭에서 뉴스 본문을 찾지 못했습니다. 기사 한 건을 연 화면에서 눌러 주세요.");
}

/* ── 칼럼(소재) ── */

function cleanSource(source) {
  const s = source || {};
  const angle = String(s.angle || "").trim().slice(0, 500);
  if (s.mode === "news") {
    const n = s.news || {};
    const body = String(n.body || "").trim().slice(0, 9000);
    return {
      mode: "news",
      angle,
      news: {
        title: String(n.title || "").trim(),
        publisher: String(n.publisher || "").trim(),
        publishedAt: String(n.publishedAt || "").trim(),
        url: /^https?:\/\//i.test(String(n.url || "")) ? String(n.url).trim() : "",
        body,
        truncated: Boolean(n.truncated),
      },
    };
  }
  const t = s.topic || {};
  return {
    mode: "topic",
    angle,
    topic: {
      subject: String(t.subject || "").trim(),
      intro: String(t.intro || "").trim(),
      points: (Array.isArray(t.points) ? t.points : []).map((p) => String(p || "").trim()).slice(0, 5),
      outro: String(t.outro || "").trim(),
      memo: String(t.memo || "").trim(),
    },
  };
}

function forWeb(data) {
  if (!data) return null;
  return { id: data.id, source: data.source, label: nm.gwSourceLabel(data.source), createdAt: data.createdAt };
}

/** 같은 기사 주소로 만든 예전 칼럼의 캡처 (파일이 남아 있는 것, 가장 최근 칼럼) */
function sameNewsCaptures(url) {
  const root = path.dirname(mediaDir("x"));
  let best = [], bestAt = "";
  try {
    for (const n of fs.readdirSync(root)) {
      if (!n.startsWith("col-")) continue;
      const d = readJson(path.join(root, n, "source.json"));
      const u = d && d.source && d.source.news && String(d.source.news.url || "").split("?")[0];
      const caps = ((d && d.captures) || []).filter((c) => c && fs.existsSync(c.file));
      if (u === url && caps.length && String(d.createdAt || "") > bestAt) { best = caps; bestAt = String(d.createdAt || ""); }
    }
  } catch {}
  return best;
}

/* [이 소재로 쓰기]: 새 칼럼 번호를 만든다 */
function create(source) {
  const s = cleanSource(source);
  if (!nm.gwSourceReady(s)) throw new Error(s.mode === "news" ? "뉴스 제목과 본문이 필요합니다." : "주제를 적어 주세요.");
  const id = `col-${Date.now().toString(16)}${crypto.randomBytes(3).toString("hex")}`;
  const data = { id, source: s, createdAt: new Date().toISOString() };
  fs.mkdirSync(mediaDir(id), { recursive: true });
  // 가져올 때 찍은 기사 화면 — 같은 기사면 저장하고 출처를 붙인다 (기사·블로그·SNS 사진으로)
  //  같은 기사로 칼럼을 또 만들어도 붙게 비우지 않는다 (2026-10-24: 두 번째 칼럼에 캡처가 빠졌음) — 다음 뉴스를 가져오면 바뀐다
  const bare = (u) => String(u || "").split("?")[0];
  const credit = `출처: ${s.news && s.news.publisher || "원문 기사"}${s.news && s.news.url ? ` (${s.news.url})` : ""}`;
  if (s.mode === "news" && lastShots.shots.length && lastShots.url && s.news.url && bare(lastShots.url) === bare(s.news.url)) {
    data.captures = lastShots.shots.map((buf, i) => {
      const file = path.join(mediaDir(id), `capture-${i + 1}.jpg`);
      fs.writeFileSync(file, buf);
      return { file, caption: `원문 기사 화면 ${i + 1} · ${credit}` };
    });
  } else if (s.mode === "news" && s.news.url) {
    // 앱을 다시 켠 뒤 등 — 같은 기사로 만든 예전 칼럼의 캡처를 복사해 온다
    const prev = sameNewsCaptures(bare(s.news.url));
    if (prev.length) data.captures = prev.map((c, i) => {
      const file = path.join(mediaDir(id), `capture-${i + 1}.jpg`);
      fs.copyFileSync(c.file, file);
      return { file, caption: `원문 기사 화면 ${i + 1} · ${credit}` };
    });
  }
  fs.writeFileSync(sourceFile(id), JSON.stringify(data, null, 2));
  log.info(`[뉴스칼럼] 새 칼럼 ${id} (${s.mode})`);
  return forWeb(data);
}

function get(id) {
  if (!isColumn(id)) return null;
  const data = readJson(sourceFile(id));
  if (!data) return null;
  // 요약 줄 썸네일 · [원문 보기] — 가져올 때 찍은 기사 화면 (2026-10-24 사장님: 칼럼도 분석 결과처럼)
  const captures = (data.captures || []).filter((c) => c && fs.existsSync(c.file)).map((c) => {
    let thumb = null;
    try { thumb = nativeImage.createFromPath(c.file).resize({ width: 480 }).toDataURL(); } catch {}
    return { thumb, caption: c.caption };
  });
  return { ...forWeb(data), captures };
}

/* [다시 가져오기] — 같은 기사 주소로 본문·기사 화면을 새로 받는다. 쓴 글에 캡처가 없으면 붙여 준다 */
async function refetch(id) {
  const data = isColumn(id) ? readJson(sourceFile(id)) : null;
  if (!data) throw new Error("칼럼을 찾지 못했습니다.");
  const url = data.source && data.source.mode === "news" && data.source.news && data.source.news.url;
  if (!url) throw new Error("뉴스 주소가 없는 칼럼이에요 (주제 직접입력).");
  const n = await fetchNews(url);
  const s = cleanSource({ mode: "news", angle: data.source.angle, news: { ...n, url: n.url || url } });
  data.source = s;
  if (lastShots.shots.length) {
    const credit = `출처: ${s.news.publisher || "원문 기사"} (${s.news.url})`;
    for (const c of data.captures || []) { try { fs.unlinkSync(c.file); } catch {} }
    data.captures = lastShots.shots.map((buf, i) => {
      const file = path.join(mediaDir(id), `capture-${i + 1}.jpg`);
      fs.writeFileSync(file, buf);
      return { file, caption: `원문 기사 화면 ${i + 1} · ${credit}` };
    });
    // 이미 쓴 기사·블로그에 기사 화면이 하나도 없으면 붙인다 (같은 파일 이름이라 있으면 새 화면으로 저절로 바뀜)
    for (const doc of ["article", "blog"]) {
      const f = path.join(mediaDir(id), `${doc}.json`);
      const d = readJson(f);
      if (!d || (d.media || []).some((m) => m.kind === "capture")) continue;
      const hasCover = (d.media || []).some((m) => m.isCover);
      d.media = [...(d.media || []), ...data.captures.map((c, i) => ({ id: crypto.randomBytes(6).toString("hex"), kind: "capture", file: c.file, caption: c.caption, isCover: !hasCover && i === 0 }))];
      fs.writeFileSync(f, JSON.stringify(d, null, 2));
    }
  }
  fs.writeFileSync(sourceFile(id), JSON.stringify(data, null, 2));
  log.info(`[뉴스칼럼] 다시 가져옴 ${id} · 화면 ${(data.captures || []).length}장`);
  return get(id);
}

const readSource = (id) => {
  const data = readJson(sourceFile(id));
  if (!data) throw new Error("칼럼 소재를 찾지 못했습니다. 소재를 다시 골라 주세요.");
  return data.source;
};

/* 최근 칼럼 (이 PC) — 소재 고르기 아래 "최근 칼럼"에 보여 준다 */
function list(limit = 8) {
  const root = path.join(app.getPath("userData"), "media");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter(isColumn)
    .map((id) => {
      try {
        const data = readJson(sourceFile(id));
        if (!data) return null;
        const article = readJson(path.join(mediaDir(id), "article.json"));
        return { ...forWeb(data), articleTitle: (article && article.title) || "" };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

/* ── 기사 ── */

function articleOptions() {
  return {
    kinds: Object.entries(nm.GW_KIND).map(([id, k]) => ({ id, label: k.label, brief: k.brief })),
    lengths: Object.entries(nm.GW_LENGTH).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
    autoCover: false,
  };
}

/* 기사 쓰기 — 섹션은 AI 가 공실뉴스 1·2차 섹션에서 고른다. 기사 한도는 기사 등록할 때 센다.
   autoCover: 다 쓰면 AI 대표 이미지를 만든다 (AI 이미지 하루 한도 안에서). 실패해도 기사는 남는다. */
async function writeArticle({ baseUrl, vacancyId: id, kind = "news", length = "normal", autoCover = false }, onProgress = () => {}) {
  const blogWriter = require("./blog-writer");
  const source = readSource(id);
  const prompt = nm.gwBuildPrompt(source, { kind, length });
  let chatUrl = "";
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => nm.GWArticleJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });
  onProgress("받은 기사를 정리하는 중…");
  const parsed = nm.GWArticleJson.parse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "AI 답변을 읽지 못했습니다.");
  const section = nm.gwNormalizeSection(parsed.article.section1, parsed.article.section2);
  const draft = blogWriter.saveWritten(id, "article", parsed, { style: kind, length, chatUrl, ...section });
  return autoCover ? addCover(baseUrl, id, draft, onProgress) : draft;
}

/* 다 쓴 기사에 AI 대표 이미지 (없을 때만) — 실패하면 coverError 를 붙여 돌려준다 */
async function addCover(baseUrl, id, draft, onProgress = () => {}) {
  const blogWriter = require("./blog-writer");
  const source = readSource(id);
  const hasCover = (draft.media || []).some((m) => m.isCover && m.kind === "ai"); // 기사 화면 캡처가 대표여도 AI 대표 그림은 켠 사람에게 만든다
  if (!hasCover) {
    try {
      onProgress("기사에 맞는 AI 대표 이미지를 만드는 중… (1~2분)");
      await blogWriter.useQuota(baseUrl, "ai_image");
      const body = draft.paragraphs.join("\n\n");
      const dataUrl = await chatgpt.askImage(nm.gwBuildImagePrompt(source, { title: draft.title, body }, { style: "auto", cover: true }), { onProgress });
      onProgress("대표 이미지를 넣는 중…");
      await blogWriter.addPhoto({ vacancyId: id, doc: "article", dataUrl, kind: "ai", caption: nm.gwAiImageCaption({ title: draft.title }), cover: true });
      draft = blogWriter.get(id, "article");
    } catch (e) {
      log.warn(`[뉴스칼럼] 대표 이미지 실패 ${e.message}`);
      draft = { ...blogWriter.get(id, "article"), coverError: `대표 이미지를 만들지 못했습니다: ${e.message} — 미리보기에서 [AI 이미지]로 다시 만들 수 있습니다.` };
    }
  }
  return draft;
}

module.exports = { isColumn, fetchNews, openNews, openUrl, grabNews, create, get, refetch, list, readSource, articleOptions, writeArticle, addCover };
