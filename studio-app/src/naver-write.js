// 네이버 블로그 채우기 (SNS뉴스발행 4단계)
// 스튜디오 전용 크롬에서 네이버 블로그 글쓰기를 열고, 크롬 확장과 같은 방법으로
// 제목·본문(디자인 4종)·사진(등록 사진 전부 + 캡처 3장)·출처 블록을 채운다.
//  - 블록 만들기: 확장 shared/naver-blog.js (buildNaverBlocks) 그대로
//  - 편집기에 넣기: 확장 content-naver.js 를 글쓰기 화면의 각 프레임에 넣어 그대로 실행
//    (확장의 chrome.runtime 메시지 대신 같은 이름의 작은 대역을 넘긴다)
// 발행 버튼은 누르지 않는다. 태그는 회원이 [발행]을 눌러 발행 창이 열릴 때 채워진다.
const { app, session } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const naverBlog = require("./ext/naver-blog");
const blogPrompt = require("./ext/blog-prompt");
const chrome = require("./studio-chrome");

const CONTENT_NAVER = fs.readFileSync(path.join(__dirname, "ext", "content-naver.js"), "utf8");
const mediaDir = (vacancyId) => path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""));

/* 확장 content-naver.js 를 감싸서 window.__gwNaver(msg) 로 부를 수 있게 한다 */
const INJECT = `(() => {
  if (window.__gwNaver) return true;
  const listeners = [];
  const chrome = { runtime: { onMessage: { addListener: (fn) => listeners.push(fn) } } };
  (function (chrome) {
${CONTENT_NAVER}
  })(chrome);
  window.__gwNaver = (msg) => new Promise((resolve) => {
    let answered = false;
    const done = (v) => { if (!answered) { answered = true; resolve(v); } };
    for (const fn of listeners) fn(msg, {}, done);
    setTimeout(() => done({ ok: false, error: "응답 없음" }), 120000);
  });
  return true;
})()`;

function designs() {
  return Object.entries(naverBlog.DESIGNS).map(([id, d]) => ({ id, label: d.label, hint: d.hint }));
}

function toDataUrl(file) {
  const ext = path.extname(file).toLowerCase();
  const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
}

/* 글 끝 "매물 정보 출처"(표시·광고 필수 정보)를 공실뉴스에서 받는다 — 확장 listing-source.js 와 같은 API */
async function fetchListing(baseUrl, vacancyId) {
  const res = await session.defaultSession.fetch(`${baseUrl}/api/extension/vacancy-source?id=${encodeURIComponent(vacancyId)}`);
  const data = await res.json().catch(() => ({}));
  if (!data || !data.success) throw new Error((data && data.error) || "매물 출처 정보를 가져오지 못했습니다.");
  return {
    detailUrl: `${naverBlog.SITE_URL}${data.detailPath}`,
    location: data.location || "",
    propertyType: data.propertyType || "",
    tradeType: data.tradeType || "",
    owner: data.owner || null,
    capturedAt: new Date().toISOString(),
  };
}

/* 글쓰기 화면의 프레임 가운데 편집기가 있는 프레임을 찾는다 */
async function findEditorFrame(page, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (!/naver\.com/.test(frame.url())) continue;
      try {
        await frame.evaluate(INJECT);
        const ping = await frame.evaluate(() => window.__gwNaver({ type: "GW_PING_NAVER_WRITE" }));
        if (ping && ping.ok) return frame;
      } catch {}
    }
    await chrome.sleep(800);
  }
  return null;
}

/**
 * @param {{ baseUrl, vacancyId, design? }} opts
 */
async function fillNaver({ baseUrl, vacancyId, design }, onProgress = () => {}) {
  const dir = mediaDir(vacancyId);
  const analysisFile = path.join(dir, "analysis.json");
  const blogFile = path.join(dir, "blog.json");
  if (!fs.existsSync(analysisFile)) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  if (!fs.existsSync(blogFile)) throw new Error("먼저 블로그 글을 써 주세요.");
  const analysis = JSON.parse(fs.readFileSync(analysisFile, "utf8"));
  const blog = JSON.parse(fs.readFileSync(blogFile, "utf8"));

  onProgress("매물 출처 정보(중개사무소)를 확인하는 중…");
  const listing = await fetchListing(baseUrl, vacancyId);
  const problems = naverBlog.listingProblems(listing, false);
  if (problems.length) {
    throw new Error(`부동산 표시·광고 필수 정보가 없어 멈췄습니다: ${problems.join(", ")}. 공실의 등록자 정보를 확인해 주세요.`);
  }

  // 사진: 미리보기에서 다듬은 순서·대표·자리 그대로 (없으면 등록 사진 전부 + 캡처 3장, 첫 장 대표)
  const media = blog.media && blog.media.length ? blog.media : (analysis.media || []).map((m, i) => ({ ...m, isCover: i === 0 }));
  const chosenDesign = naverBlog.DESIGNS[design] ? design : (blogPrompt.GW_BLOG_STYLE[blog.style] || {}).design || "basic";
  const blocks = naverBlog
    .buildNaverBlocks(blog.paragraphs.join("\n\n"), media, { design: chosenDesign, title: blog.title, vacancy: { ...analysis.vacancy, vacancyId }, listing })
    .map((b) => (b.type === "image" ? { type: "image", dataUrl: media[b.mediaIndex] && media[b.mediaIndex].file ? toDataUrl(media[b.mediaIndex].file) : null } : b));
  const tags = naverBlog.normalizeTags(blog.keywords);

  onProgress("스튜디오 전용 크롬에서 네이버 블로그 글쓰기를 여는 중…");
  const page = await chrome.openPage("blog.naver.com", naverBlog.WRITE_URL);
  await page.goto(naverBlog.WRITE_URL, { waitUntil: "domcontentloaded" }); // 늘 새 글쓰기
  await chrome.sleep(1500);
  if (/nid\.naver\.com/.test(page.url())) {
    throw new Error("NAVER_LOGIN: 네이버에 로그인되어 있지 않습니다. 아래 [네이버 로그인]을 눌러 로그인한 뒤 다시 채워 주세요.");
  }

  onProgress("네이버 편집기가 뜨기를 기다리는 중…");
  const frame = await findEditorFrame(page);
  if (!frame) throw new Error("네이버 글쓰기 편집기를 찾지 못했습니다. 크롬 창에 '작성 중인 글' 안내가 떠 있으면 닫고 다시 눌러 주세요.");

  onProgress(`제목·본문·사진 ${blocks.filter((b) => b.type === "image").length}장을 채우는 중…`);
  const res = await frame.evaluate((payload) => window.__gwNaver({ type: "GW_APPLY_BLOG_DRAFT", payload }), { title: blog.title, blocks, tags });
  if (!res || !res.ok) throw new Error((res && res.error) || "네이버 편집기에 넣지 못했습니다.");
  log.info(`[네이버] ${vacancyId} 디자인 ${chosenDesign} 사진 ${res.imagesInserted}장 채움`);
  return { ok: true, imagesInserted: res.imagesInserted, imagesTotal: blocks.filter((b) => b.type === "image").length, design: chosenDesign, tags };
}

/* [네이버 블로그 바로가기]: 전용 크롬(로그인된)에서 내 블로그를 연다 */
async function openMyBlog() {
  const page = await chrome.openPage("blog.naver.com", "https://blog.naver.com/MyBlog.naver");
  if (!/MyBlog|blog\.naver\.com\/[A-Za-z0-9_-]+$/.test(page.url())) await page.goto("https://blog.naver.com/MyBlog.naver", { waitUntil: "domcontentloaded" });
  return { ok: true };
}

module.exports = { designs, fillNaver, openMyBlog };
