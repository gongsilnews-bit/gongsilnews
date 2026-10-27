// 네이버 블로그 채우기 (SNS뉴스발행 4단계)
// 스튜디오 전용 크롬에서 네이버 블로그 글쓰기를 열고, 크롬 확장과 같은 방법으로
// 제목·본문(디자인 4종)·사진(등록 사진 전부 + 캡처 3장)·출처 블록을 채운다.
//  - 블록 만들기: 확장 shared/naver-blog.js (buildNaverBlocks) 그대로
//  - 편집기에 넣기: 확장 content-naver.js 를 글쓰기 화면의 각 프레임에 넣어 그대로 실행
//    (확장의 chrome.runtime 메시지 대신 같은 이름의 작은 대역을 넘긴다)
// 발행 버튼은 누르지 않는다. 태그는 회원이 [발행]을 눌러 발행 창이 열릴 때 채워진다.
// 뉴스칼럼(번호 "col-…")은 확장 뉴스메이커의 블록(글 끝 [참고 자료] 원문 출처·링크)으로 채운다.
const { app, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const ext = require("./ext"); // 확장 파일은 서버에서 받는다
const naverBlog = ext.lazyModule(() => ext.run(["gongsil/naver-blog.js"]));
const blogPrompt = ext.lazyModule(() => ext.run(["gongsil/blog-prompt.js"]));
const chrome = require("./studio-chrome");
const nm = require("./ext-newsmaker");
const isColumn = (id) => /^col-[a-f0-9]+$/.test(String(id || ""));
const isSim = (id) => /^(int|rem)-[a-f0-9]+$/.test(String(id || "")); // 인테리어·리모델링 시뮬레이션

const mediaDir = (vacancyId) => path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""));

/* 확장 content-naver.js 를 감싸서 window.__gwNaver(msg) 로 부를 수 있게 한다 (서버에서 받은 글로 그때 만든다) */
const INJECT = () => `(() => {
  if (window.__gwNaver) return true;
  const listeners = [];
  const chrome = { runtime: { onMessage: { addListener: (fn) => listeners.push(fn) } } };
  (function (chrome) {
${ext.text("gongsil/content-naver.js")}
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

/* 경매·공매 물건 출처 정보 (확장 listing-source.js gwFetchAuctionListing 과 같다) */
async function fetchAuctionListing(baseUrl, vacancyId) {
  const res = await session.defaultSession.fetch(`${baseUrl}/api/extension/auction-source?id=${encodeURIComponent(vacancyId)}&for=blog`);
  const data = await res.json().catch(() => ({}));
  if (!data || !data.success) throw new Error((data && data.error) || "경매·공매 물건 정보를 가져오지 못했습니다.");
  const fact = (...labels) => ((data.facts || []).find((f) => labels.includes(f.label)) || {}).value || "";
  return {
    detailUrl: `${naverBlog.SITE_URL}${data.detailPath}`,
    location: data.location || "",
    propertyType: data.propertyType || "",
    saleKind: data.saleKind || "",
    caseLabel: fact("관리번호") ? "관리번호" : "사건번호",
    caseNo: fact("관리번호", "사건번호"),
    agency: fact("집행기관", "관할법원"),
    capturedAt: new Date().toISOString(),
  };
}

/* 글 끝 "매물 정보 출처"(표시·광고 필수 정보)를 공실뉴스에서 받는다 — 확장 listing-source.js 와 같은 API.
   경매·공매 물건(saleKind)이면 경매 출처를 받는다. */
async function fetchListing(baseUrl, vacancyId, saleKind = "") {
  if (saleKind) return fetchAuctionListing(baseUrl, vacancyId);
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
        await frame.evaluate(INJECT());
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
async function fillNaver({ baseUrl, vacancyId, design, via = "" }, onProgress = () => {}) {
  if (isColumn(vacancyId)) return fillColumn({ vacancyId, design, via }, onProgress);
  if (isSim(vacancyId)) return fillSim({ baseUrl, vacancyId, design, via }, onProgress);
  const dir = mediaDir(vacancyId);
  const analysisFile = path.join(dir, "analysis.json");
  const blogFile = path.join(dir, "blog.json");
  if (!fs.existsSync(analysisFile)) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  if (!fs.existsSync(blogFile)) throw new Error("먼저 블로그 글을 써 주세요.");
  const analysis = JSON.parse(fs.readFileSync(analysisFile, "utf8"));
  const blog = JSON.parse(fs.readFileSync(blogFile, "utf8"));

  onProgress("매물 출처 정보(중개사무소)를 확인하는 중…");
  const saleKind = analysis.vacancy.saleKind || "";
  const listing = await fetchListing(baseUrl, vacancyId, saleKind);
  const problems = naverBlog.listingProblems(listing, Boolean(saleKind));
  if (problems.length) {
    throw new Error(saleKind
      ? `물건 정보가 없어 멈췄습니다: ${problems.join(", ")}. 분석·캡처를 다시 해 주세요.`
      : `부동산 표시·광고 필수 정보가 없어 멈췄습니다: ${problems.join(", ")}. 공실의 등록자 정보를 확인해 주세요.`);
  }

  // 사진: 미리보기에서 다듬은 순서·대표·자리 그대로 (없으면 등록 사진 전부 + 캡처 3장, 첫 장 대표)
  const media = blog.media && blog.media.length ? blog.media : (analysis.media || []).map((m, i) => ({ ...m, isCover: i === 0 }));
  const chosenDesign = naverBlog.DESIGNS[design] ? design : (blogPrompt.GW_BLOG_STYLE[blog.style] || {}).design || "basic";
  const blocks = naverBlog
    .buildNaverBlocks(blog.paragraphs.join("\n\n"), media, { design: chosenDesign, title: blog.title, vacancy: { ...analysis.vacancy, vacancyId }, listing })
    .map((b) => (b.type === "image" ? { type: "image", dataUrl: media[b.mediaIndex] && media[b.mediaIndex].file ? toDataUrl(media[b.mediaIndex].file) : null } : b));
  const tags = naverBlog.normalizeTags(blog.keywords);
  const res = await (SINK[via] || fillEditor)({ title: blog.title, blocks, tags, vacancyId }, onProgress);
  log.info(`[네이버] ${vacancyId} 디자인 ${chosenDesign} 사진 ${res.imagesInserted}장 채움`);
  return { ok: true, imagesInserted: res.imagesInserted, imagesTotal: blocks.filter((b) => b.type === "image").length, design: chosenDesign, tags, via: res.via || "chrome", ...(res.extra || {}) };
}

/* 뉴스칼럼 블로그: 사진은 미리보기 그대로, 글 끝에 [참고 자료](원문 언론사·제목·링크)와 공실뉴스 서명 */
async function fillColumn({ vacancyId, design, via }, onProgress) {
  const dir = mediaDir(vacancyId);
  const blogFile = path.join(dir, "blog.json");
  if (!fs.existsSync(blogFile)) throw new Error("먼저 블로그 글을 써 주세요.");
  const blog = JSON.parse(fs.readFileSync(blogFile, "utf8"));
  const source = require("./column-writer").readSource(vacancyId);
  const nb = nm.GWNaverBlog;
  const media = blog.media || [];
  const chosenDesign = nb.DESIGNS[design] ? design : (nm.GW_BLOG_STYLE[blog.style] || {}).design || "basic";
  const blocks = nb
    .buildNaverBlocks(blog.paragraphs.join("\n\n"), media, { design: chosenDesign, title: blog.title, source })
    .map((b) => (b.type === "image" ? { type: "image", dataUrl: media[b.mediaIndex] && media[b.mediaIndex].file ? toDataUrl(media[b.mediaIndex].file) : null } : b));
  const tags = nb.normalizeTags(blog.keywords);
  const res = await (SINK[via] || fillEditor)({ title: blog.title, blocks, tags, vacancyId }, onProgress);
  log.info(`[네이버] 칼럼 ${vacancyId} 디자인 ${chosenDesign} 사진 ${res.imagesInserted}장 채움`);
  return { ok: true, imagesInserted: res.imagesInserted, imagesTotal: blocks.filter((b) => b.type === "image").length, design: chosenDesign, tags, via: res.via || "chrome", ...(res.extra || {}) };
}

/* 인테리어·리모델링 블로그: 확장 interior10·remodeling10 의 블록. 매물과 연결된 시뮬레이션이면 매물 출처를 붙이고,
   중개사무소 정보가 없어도 채운다 (확장과 같음 — 경매·공매 물건 정보가 없을 때만 멈춘다) */
async function fillSim({ baseUrl, vacancyId, design, via }, onProgress) {
  const S = require("./sim-writer");
  const L = S.lib(vacancyId);
  const { result, vacancy } = S.resultOf(vacancyId);
  const blogFile = path.join(mediaDir(vacancyId), "blog.json");
  if (!fs.existsSync(blogFile)) throw new Error("먼저 블로그 글을 써 주세요.");
  const blog = JSON.parse(fs.readFileSync(blogFile, "utf8"));
  let listing = null;
  if (result.vacancyId) {
    onProgress("매물 출처 정보(중개사무소)를 확인하는 중…");
    listing = await fetchListing(baseUrl, result.vacancyId, result.saleKind || "").catch(() => null);
    const problems = L.GWNaverBlog.listingProblems(listing, Boolean(result.saleKind));
    if (problems.length && result.saleKind) throw new Error(`물건 정보가 없어 멈췄습니다: ${problems.join(", ")}.`);
  }
  const media = blog.media || [];
  const nb = L.GWNaverBlog;
  const chosenDesign = nb.DESIGNS[design] ? design : (L.gwBlogStyles(null)[blog.style] || {}).design || "basic";
  const blocks = nb
    .buildNaverBlocks(blog.paragraphs.join("\n\n"), media, { design: chosenDesign, title: blog.title, vacancy: vacancy ? { ...vacancy, vacancyId: result.vacancyId } : null, listing })
    .map((b) => (b.type === "image" ? { type: "image", dataUrl: media[b.mediaIndex] && media[b.mediaIndex].file ? toDataUrl(media[b.mediaIndex].file) : null } : b));
  const tags = nb.normalizeTags(blog.keywords);
  const res = await (SINK[via] || fillEditor)({ title: blog.title, blocks, tags, vacancyId }, onProgress);
  log.info(`[네이버] 시뮬레이션 ${vacancyId} 디자인 ${chosenDesign} 사진 ${res.imagesInserted}장 채움`);
  return { ok: true, imagesInserted: res.imagesInserted, imagesTotal: blocks.filter((b) => b.type === "image").length, design: chosenDesign, tags, via: res.via || "chrome", ...(res.extra || {}) };
}

/* 전용 크롬에 새 글쓰기를 열고 편집기에 제목·블록을 넣는다 (공실·칼럼 공용) */
async function fillEditor({ title, blocks, tags }, onProgress) {
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
  const res = await frame.evaluate((payload) => window.__gwNaver({ type: "GW_APPLY_BLOG_DRAFT", payload }), { title, blocks, tags });
  if (!res || !res.ok) throw new Error((res && res.error) || "네이버 편집기에 넣지 못했습니다.");
  return res;
}

/* ── 평소 크롬 + 공실스튜디오 도우미 확장 (2026-10-23 사장님: 전용 크롬 대신) ──
   일감을 PC 안 창구에 올리고 평소 브라우저에 새 글쓰기를 연다 → 도우미가 받아 가서 채운다.
   30초 안에 안 받아 가면(확장이 없거나 꺼짐) HELPER_NONE — 화면이 복사·폴더 방식을 띄운다 */
async function fillByHelper({ title, blocks, tags, vacancyId }, onProgress) {
  const helper = require("./helper-server");
  // 공실 글이면 발행 뒤 글 주소를 홍보현황에 (2026-10-27) — 칼럼·시뮬레이션은 공실이 아니라 빼고
  const isVacancy = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(vacancyId || ""));
  const id = helper.addJob("naver", { title, blocks, tags }, isVacancy ? { vacancyId, channel: "blog" } : null);
  void shell.openExternal(naverBlog.WRITE_URL);
  onProgress("평소 크롬에 네이버 블로그 글쓰기를 열었어요. 공실스튜디오 도우미가 채우기를 기다리는 중…");
  if (!(await helper.wait(id, "taken", 45000))) {
    helper.cancel(id);
    throw new Error("HELPER_NONE: 공실스튜디오 도우미(크롬 확장)가 응답하지 않았어요. 아래 복사·사진 폴더로 직접 붙여 넣거나, 도우미를 설치해 주세요.");
  }
  onProgress(`도우미가 제목·본문·사진 ${blocks.filter((b) => b.type === "image").length}장을 채우는 중… (크롬 창을 닫지 마세요)`);
  const done = await helper.wait(id, "done", 240000);
  if (!done) throw new Error("도우미가 다 채웠다는 소식이 없어요. 크롬 창에서 채워진 내용을 확인해 주세요.");
  if (!done.ok) throw new Error(done.error || "도우미가 채우지 못했어요.");
  return { imagesInserted: done.imagesInserted || 0, via: "helper" };
}

/* 복사·폴더 (확장 없이) — 사진은 글 순서대로 번호를 붙여 폴더에, 본문은 디자인 그대로 복사(사진 자리는 [사진 N])
   저장 자리: 문서\공실스튜디오\01 뉴스SNS발행\네이버 블로그\날짜\<작업 이름> (out-folder.js) */
const htmlText = (h) => String(h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h\d|li|blockquote)>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
async function fillManual({ title, blocks, tags, vacancyId }, onProgress) {
  onProgress("사진을 글 순서대로 폴더에 저장하는 중…");
  const folder = require("./out-folder").folderFor(vacancyId, "네이버 블로그");
  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(folder, { recursive: true });
  let n = 0;
  const html = [];
  const text = [];
  for (const b of blocks) {
    if (b.type === "html") { html.push(b.html); text.push(htmlText(b.html)); continue; }
    if (b.type !== "image" || !b.dataUrl) continue;
    n += 1;
    const m = /^data:image\/(\w+);base64,(.*)$/s.exec(b.dataUrl);
    if (m) fs.writeFileSync(path.join(folder, `${String(n).padStart(2, "0")}.${m[1] === "jpeg" ? "jpg" : m[1]}`), Buffer.from(m[2], "base64"));
    html.push(`<p style="color:#2563eb">[사진 ${n}]</p>`);
    text.push(`[사진 ${n}]`);
  }
  const tagLine = (tags || []).map((t) => "#" + t).join(" ");
  fs.writeFileSync(path.join(folder, "블로그_글.txt"), [title, "", text.join("\n\n"), "", tagLine].join("\n"), "utf8");
  void shell.openPath(folder);
  void shell.openExternal(naverBlog.WRITE_URL);
  return { imagesInserted: 0, via: "manual", extra: { folder, copy: { title, html: html.join(""), text: text.join("\n\n"), tags: tagLine }, photos: n } };
}
const SINK = { helper: fillByHelper, manual: fillManual };

/* [네이버 블로그 바로가기]: 전용 크롬(로그인된)에서 네이버 블로그 홈(이웃 새글)을 연다 */
const BLOG_HOME_URL = "https://section.blog.naver.com/BlogHome.naver?directoryNo=0&currentPage=1&groupId=0";
async function openMyBlog() {
  await shell.openExternal(BLOG_HOME_URL); // 평소 브라우저로 (2026-10-23 — 전용 크롬 대신)
  return { ok: true };
}

module.exports = { designs, fillNaver, openMyBlog, fetchListing };
