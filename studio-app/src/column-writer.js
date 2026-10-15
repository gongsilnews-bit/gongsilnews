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
const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const log = require("electron-log/main");
const nm = require("./ext-newsmaker");
const chatgpt = require("./ai/chatgpt");
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

/* ── 뉴스 가져오기 ── */

/* 주소 붙여넣기: 안 보이는 창에 열어 읽는다 (자바스크립트로 그리는 언론사 화면도 읽히게 진짜 화면으로 연다) */
async function fetchNews(url) {
  const href = String(url || "").trim();
  if (!/^https?:\/\//i.test(href)) throw new Error("뉴스 주소(https://…)를 붙여넣어 주세요.");
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { partition: "column-news", javascript: true, images: false, sandbox: true },
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
      if (r && r.ok) break;
    }
    if (!r) throw new Error("뉴스 페이지를 열지 못했습니다. 주소를 확인해 주세요.");
    if (!r.ok) throw new Error(r.reason);
    log.info(`[뉴스칼럼] 뉴스 가져옴 ${r.news.publisher} · ${r.news.title.slice(0, 40)}`);
    return r.news;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

/* [네이버 뉴스 열기]: 스튜디오 전용 크롬에 네이버 뉴스(경제)를 연다 — 둘러보다가 [지금 보는 뉴스 가져오기] */
async function openNews() {
  await chrome.openPage("news.naver.com", NEWS_HOME);
  return { ok: true };
}

const SKIP_HOSTS = /(^|\.)(chatgpt\.com|openai\.com|claude\.ai|gemini\.google\.com|blog\.naver\.com|nid\.naver\.com)$/;

/* [지금 보는 뉴스 가져오기]: 전용 크롬에서 지금 보고 있는 탭(없으면 가장 최근 탭)을 읽는다 */
async function grabNews() {
  const pages = (await chrome.openPages()).filter((p) => /^https?:/.test(p.url()) && !SKIP_HOSTS.test(chrome.hostOf(p)));
  if (!pages.length) throw new Error("전용 크롬에 열린 뉴스가 없습니다. [네이버 뉴스 열기]로 기사 한 건을 연 뒤 다시 눌러 주세요.");
  // 앞에 보이는 탭부터
  const seen = await Promise.all(pages.map((p) => p.evaluate(() => document.visibilityState === "visible").catch(() => false)));
  const ordered = [...pages.filter((_, i) => seen[i]), ...pages.filter((_, i) => !seen[i]).reverse()];
  let last = null;
  for (const page of ordered) {
    const r = await page.evaluate(EXTRACT()).catch(() => null);
    if (r && r.ok) {
      log.info(`[뉴스칼럼] 보던 뉴스 가져옴 ${r.news.publisher} · ${r.news.title.slice(0, 40)}`);
      return r.news;
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

/* [이 소재로 쓰기]: 새 칼럼 번호를 만든다 */
function create(source) {
  const s = cleanSource(source);
  if (!nm.gwSourceReady(s)) throw new Error(s.mode === "news" ? "뉴스 제목과 본문이 필요합니다." : "주제를 적어 주세요.");
  const id = `col-${Date.now().toString(16)}${crypto.randomBytes(3).toString("hex")}`;
  const data = { id, source: s, createdAt: new Date().toISOString() };
  fs.mkdirSync(mediaDir(id), { recursive: true });
  fs.writeFileSync(sourceFile(id), JSON.stringify(data, null, 2));
  log.info(`[뉴스칼럼] 새 칼럼 ${id} (${s.mode})`);
  return forWeb(data);
}

function get(id) {
  return isColumn(id) ? forWeb(readJson(sourceFile(id))) : null;
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
    autoCover: true,
  };
}

/* 기사 쓰기 — 섹션은 AI 가 공실뉴스 1·2차 섹션에서 고른다. 기사 한도는 기사 등록할 때 센다.
   autoCover: 다 쓰면 AI 대표 이미지를 만든다 (AI 이미지 하루 한도 안에서). 실패해도 기사는 남는다. */
async function writeArticle({ baseUrl, vacancyId: id, kind = "news", length = "normal", autoCover = true }, onProgress = () => {}) {
  const blogWriter = require("./blog-writer");
  const source = readSource(id);
  const prompt = nm.gwBuildPrompt(source, { kind, length });
  let chatUrl = "";
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => nm.GWArticleJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });
  onProgress("받은 기사를 정리하는 중…");
  const parsed = nm.GWArticleJson.parse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "AI 답변을 읽지 못했습니다.");
  const section = nm.gwNormalizeSection(parsed.article.section1, parsed.article.section2);
  let draft = blogWriter.saveWritten(id, "article", parsed, { style: kind, length, chatUrl, ...section });

  const hasCover = (draft.media || []).some((m) => m.isCover);
  if (autoCover && !hasCover) {
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

module.exports = { isColumn, fetchNews, openNews, grabNews, create, get, list, readSource, articleOptions, writeArticle };
