// 공실뉴스 기사·블로그 쓰기·다듬기 (뉴스·SNS발행)
// 공실 분석 결과(analysis.json)로 크롬 확장과 같은 프롬프트를 만들어 회원이 연결한 AI(지금은 ChatGPT)에 보내고,
// 답변 JSON 을 제목·(부제)·문단·키워드로 나눈다.
//  - 기사(doc 'article'): 확장 shared/prompt.js gwBuildPrompt (뉴스기사형·단락별 요약, 경매·공매는 경매용)
//  - 블로그(doc 'blog'): 확장 shared/blog-prompt.js (6문체). 기사를 먼저 썼으면 그 기사를 [참조 기사]로 쓴다.
//  - 뉴스칼럼(번호가 "col-…"): 확장 뉴스메이커의 프롬프트로 갈라진다 (column-writer.js, ext-newsmaker.js).
//
// 수정 요청(확장과 같은 방식): 처음 쓴 ChatGPT 대화(chatUrl)에 "위에서 쓴 글을 이렇게 고쳐 주세요"를 이어 보낸다.
//  그 대화가 없어졌으면 처음 프롬프트 + 지금 글 + 수정 요청을 새 대화에 보낸다. 사진·자리는 그대로 둔다.
//
// 미리보기 다듬기(확장 블로그 탭과 같은 방식):
//  - media 의 사진마다 insertAfterParagraph(0 = 첫 문단 앞, n = n번째 문단 뒤) 자리를 둔다.
//    네이버 채우기·기사쓰기 보내기는 이 자리를 그대로 따른다 → 미리보기 순서 = 실제 순서.
//  - 웹 화면은 PC 파일 경로를 모른다. 사진은 id 로만 주고받고, 미리보기는 썸네일로 보낸다.
const { app, session } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const log = require("electron-log/main");
const blogPrompt = require("./ext/blog-prompt");
const articleJson = require("./ext/article-json");
const naverBlog = require("./ext/naver-blog");
const chatgpt = require("./ai/chatgpt");
const { thumbOf, saveDataUrl } = require("./media-util");
const extPrompt = require("./ext-prompt");
const nm = require("./ext-newsmaker");

const isColumn = (id) => /^col-[a-f0-9]+$/.test(String(id || ""));
const column = () => require("./column-writer"); // 서로 부르므로 쓸 때 불러온다

const DOCS = { blog: "blog.json", article: "article.json" };
const DOC_NAME = { blog: "블로그", article: "기사" };
const mediaDir = (vacancyId) => path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""));
const docFile = (vacancyId, doc = "blog") => path.join(mediaDir(vacancyId), DOCS[doc] || DOCS.blog);
const blogFile = (vacancyId) => docFile(vacancyId, "blog");
const newId = () => crypto.randomBytes(6).toString("hex");

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}
const readAnalysis = (vacancyId) => readJson(path.join(mediaDir(vacancyId), "analysis.json"));

function styles(vacancyId) {
  if (isColumn(vacancyId)) {
    return {
      saleKind: "",
      styles: Object.entries(nm.GW_BLOG_STYLE).map(([id, s]) => ({ id, label: s.label, fit: s.fit, titleExample: s.titleExample, design: s.design })),
      lengths: Object.entries(nm.GW_BLOG_LENGTH).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
    };
  }
  const analysis = vacancyId ? readAnalysis(vacancyId) : null;
  const table = blogPrompt.gwBlogStyles(analysis && analysis.vacancy); // 경매·공매면 경매용 문체
  return {
    saleKind: (analysis && analysis.vacancy && analysis.vacancy.saleKind) || "",
    styles: Object.entries(table).map(([id, s]) => ({ id, label: s.label, fit: s.fit, titleExample: s.titleExample, design: s.design })),
    lengths: Object.entries(blogPrompt.GW_BLOG_LENGTH).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
  };
}

/* 기사 스타일·분량 (확장과 같음, 경매·공매면 경매용 스타일) */
function articleOptions(vacancyId) {
  if (isColumn(vacancyId)) return column().articleOptions();
  const analysis = vacancyId ? readAnalysis(vacancyId) : null;
  const auction = Boolean(analysis && analysis.vacancy && analysis.vacancy.saleKind);
  const kinds = auction ? extPrompt.GW_AUCTION_KIND : extPrompt.GW_KIND;
  return {
    kinds: Object.entries(kinds).map(([id, k]) => ({ id, label: k.label, brief: k.brief })),
    lengths: Object.entries(extPrompt.GW_LENGTH).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
  };
}

/* 자동 배치(두 문단마다 한 장, 남으면 글 끝)를 자리 번호로 굳혀 둔다. 미리보기에서 옮길 수 있게. */
function materializeSlots(media, paragraphCount) {
  const slots = naverBlog.layoutMediaSlots(paragraphCount, media);
  slots.forEach((items, slot) => items.forEach(({ index }) => (media[index].insertAfterParagraph = slot)));
  media.forEach((m) => {
    if (m.isCover) m.insertAfterParagraph = null;
    else if (Number.isInteger(m.insertAfterParagraph)) m.insertAfterParagraph = Math.min(m.insertAfterParagraph, paragraphCount);
  });
  return media;
}

const freshMedia = (analysis) => ((analysis && analysis.media) || []).map((m, i) => ({ id: newId(), kind: m.kind, file: m.file, caption: m.caption, isCover: i === 0 }));
/* 새 글의 처음 사진: 공실이면 분석 사진, 칼럼이면 기사에 넣은 사진(대표 AI 이미지 등) */
function seedMedia(vacancyId, doc) {
  const analysis = readAnalysis(vacancyId);
  if (analysis) return freshMedia(analysis);
  if (doc === "article") return [];
  const a = readJson(docFile(vacancyId, "article"));
  return ((a && a.media) || []).map((m) => ({ id: newId(), kind: m.kind, file: m.file, caption: m.caption, isCover: Boolean(m.isCover) }));
}

/* 웹 화면에 보낼 모양 (파일 경로 대신 id·썸네일) */
function forWeb(d, doc = "blog") {
  if (!d) return null;
  return {
    doc,
    vacancyId: d.vacancyId,
    style: d.style,
    length: d.length,
    title: d.title,
    subtitles: d.subtitles || [],
    paragraphs: d.paragraphs,
    keywords: d.keywords,
    section1: d.section1 || "",
    section2: d.section2 || "",
    version: [d.writtenAt, d.revisedAt, d.editedAt].map((v) => v || "").join("|"), // 바뀌면 화면 편집기를 새로 그린다
    media: (d.media || []).map((m) => ({
      id: m.id,
      kind: m.kind,
      caption: m.caption,
      isCover: Boolean(m.isCover),
      insertAfterParagraph: Number.isInteger(m.insertAfterParagraph) ? m.insertAfterParagraph : null,
      thumb: thumbOf(m.file),
    })),
  };
}

function get(vacancyId, doc = "blog") {
  const d = readJson(docFile(vacancyId, doc));
  // 사진 목록이 없는 예전 글이면 분석 사진(등록 사진 전부 + 캡처 3장, 첫 장 대표)으로 채워 둔다
  if (d && !Array.isArray(d.media)) {
    d.media = materializeSlots(seedMedia(vacancyId, doc), d.paragraphs.length);
    fs.writeFileSync(docFile(vacancyId, doc), JSON.stringify(d, null, 2));
  }
  return forWeb(d, doc);
}

/* 이용 횟수 확인·기록 (서버가 판단: 등급·회원별 한 달 횟수, 하루 안전 상한) — /api/studio/usage */
async function useQuota(baseUrl, kind, vacancyId) {
  const res = await session.defaultSession.fetch(`${baseUrl}/api/studio/usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, vacancyId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data || !data.success) throw new Error((data && data.error) || "이용 횟수를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return data.usage;
}

/* 블로그·SNS 의 [참조 기사]: 기사를 먼저 썼으면 그 기사, 없으면 "없음" */
const NO_ARTICLE = { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 [확인된 매물 정보]만 사용해 작성하십시오." };
function referenceArticle(vacancyId) {
  const a = readJson(docFile(vacancyId, "article"));
  return a ? { title: a.title, subtitles: a.subtitles || [], body: a.paragraphs.join("\n\n") } : null;
}

/* AI 답변을 문서로 저장 (다시 쓸 때는 고른 사진은 유지하고 자리만 새 문단 수에 맞춘다) */
function saveWritten(vacancyId, doc, parsed, extra) {
  const a = parsed.article;
  const paragraphs = naverBlog.splitParagraphs(a.body);
  const prev = readJson(docFile(vacancyId, doc));
  const media =
    prev && prev.media && prev.media.length
      ? prev.media.map((m) => ({ ...m, insertAfterParagraph: m.isCover ? null : undefined }))
      : seedMedia(vacancyId, doc);
  const d = {
    vacancyId,
    ...extra,
    ai: "chatgpt",
    title: a.title,
    subtitles: a.subtitles || [],
    paragraphs,
    keywords: a.keywords || [],
    media: materializeSlots(media, paragraphs.length),
    writtenAt: new Date().toISOString(),
  };
  fs.writeFileSync(docFile(vacancyId, doc), JSON.stringify(d, null, 2));
  log.info(`[${DOC_NAME[doc]}] ${vacancyId} 문단 ${paragraphs.length}개`);
  return forWeb(d, doc);
}

async function write({ baseUrl, vacancyId, style = "listing", length = "normal" }, onProgress = () => {}) {
  if (isColumn(vacancyId)) return writeColumnBlog({ baseUrl, vacancyId, style, length }, onProgress);
  const analysis = readAnalysis(vacancyId);
  if (!analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  onProgress("이용 횟수를 확인하는 중…");
  await useQuota(baseUrl, "blog", vacancyId); // 이번 달 이 공실을 처음 쓸 때만 1회

  const article = referenceArticle(vacancyId) || NO_ARTICLE;
  const prompt = blogPrompt.gwBuildBlogPrompt({ vacancy: analysis.vacancy, article }, { style, length });
  let chatUrl = "";
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => articleJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });
  onProgress("받은 글을 정리하는 중…");
  const parsed = articleJson.parse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "AI 답변을 읽지 못했습니다.");
  return saveWritten(vacancyId, "blog", parsed, { style, length, chatUrl });
}

/* 뉴스칼럼 블로그: 뉴스메이커 블로그 프롬프트 — 칼럼 기사를 [참조 기사]로 쓴다 (기사가 먼저 있어야 한다) */
async function writeColumnBlog({ baseUrl, vacancyId, style, length }, onProgress) {
  const source = column().readSource(vacancyId);
  const article = referenceArticle(vacancyId);
  if (!article) throw new Error("먼저 [공실뉴스 기사] 탭에서 기사를 써 주세요. 블로그는 그 기사를 바탕으로 씁니다.");
  const st = nm.GW_BLOG_STYLE[style] ? style : "info";
  onProgress("이용 횟수를 확인하는 중…");
  await useQuota(baseUrl, "blog", vacancyId);
  const prompt = nm.gwBuildBlogPrompt({ article, source }, { style: st, length });
  let chatUrl = "";
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => nm.GWArticleJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });
  onProgress("받은 글을 정리하는 중…");
  const parsed = nm.GWArticleJson.parse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "AI 답변을 읽지 못했습니다.");
  return saveWritten(vacancyId, "blog", parsed, { style: st, length, chatUrl });
}

/* 공실뉴스 기사 쓰기 — 기사 한도는 기사쓰기 화면에서 [기사 등록] 할 때 센다 (여기서는 세지 않음) */
async function writeArticle({ baseUrl, vacancyId, kind = "news", length = "normal", autoCover }, onProgress = () => {}) {
  if (isColumn(vacancyId)) return column().writeArticle({ baseUrl, vacancyId, kind, length, autoCover }, onProgress);
  const analysis = readAnalysis(vacancyId);
  if (!analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  const prompt = extPrompt.gwBuildPrompt(analysis.vacancy, { kind, length });
  let chatUrl = "";
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => articleJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });
  onProgress("받은 기사를 정리하는 중…");
  const parsed = articleJson.parse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "AI 답변을 읽지 못했습니다.");
  return saveWritten(vacancyId, "article", parsed, { style: kind, length, chatUrl });
}

/* 처음 쓸 때 보낸 프롬프트 (이어 쓸 대화가 없을 때 다시 보낸다) */
function originalPrompt(vacancyId, doc, d) {
  if (isColumn(vacancyId)) {
    const source = column().readSource(vacancyId);
    return doc === "article"
      ? nm.gwBuildPrompt(source, { kind: d.style, length: d.length })
      : nm.gwBuildBlogPrompt({ article: referenceArticle(vacancyId), source }, { style: d.style, length: d.length });
  }
  const analysis = readAnalysis(vacancyId);
  if (!analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  return doc === "article"
    ? extPrompt.gwBuildPrompt(analysis.vacancy, { kind: d.style, length: d.length })
    : blogPrompt.gwBuildBlogPrompt({ vacancy: analysis.vacancy, article: referenceArticle(vacancyId) || NO_ARTICLE }, { style: d.style, length: d.length });
}

function revisePrompt(vacancyId, doc, request) {
  if (isColumn(vacancyId)) {
    return doc === "article" ? nm.gwBuildRevisePrompt(request, column().readSource(vacancyId)) : nm.gwBuildBlogRevisePrompt(request);
  }
  const vacancy = (readAnalysis(vacancyId) || {}).vacancy || {};
  return doc === "article" ? extPrompt.gwBuildRevisePrompt(request, vacancy) : blogPrompt.gwBuildBlogRevisePrompt(request, vacancy);
}

/* 지금 글을 처음 출력과 같은 JSON 모양으로 (미리보기에서 고친 내용 포함) */
function draftJson(d, doc) {
  const o = {};
  if (d.section1) Object.assign(o, { section1: d.section1, section2: d.section2 || "" });
  o.title = d.title;
  if (doc === "article") (d.subtitles || []).slice(0, 3).forEach((s, i) => (o[`subtitle${i + 1}`] = s));
  o.body = d.paragraphs;
  o.keywords = d.keywords || [];
  return "```json\n" + JSON.stringify(o, null, 2) + "\n```";
}

/* [수정 요청]: 같은 대화에 이어 보내 고친 글 전체를 받는다. 사진·대표·자리는 그대로 (문단이 줄면 끝으로) */
async function revise({ vacancyId, doc = "blog", request }, onProgress = () => {}) {
  const req = String(request || "").trim();
  if (!req) throw new Error("어떻게 고칠지 적어 주세요.");
  const d = readJson(docFile(vacancyId, doc));
  if (!d) throw new Error(`먼저 ${DOC_NAME[doc] || "글"}을 써 주세요.`);
  const ask = revisePrompt(vacancyId, doc, req);
  const fallbackPrompt = `${originalPrompt(vacancyId, doc, d)}\n\n[앞서 작성한 ${DOC_NAME[doc]} — 미리보기에서 고친 내용 포함]\n${draftJson(d, doc)}\n\n${ask}`;
  const parser = isColumn(vacancyId) ? nm.GWArticleJson : articleJson;
  let chatUrl = d.chatUrl || "";
  const text = await chatgpt.ask(ask, { onProgress, isComplete: (t) => parser.hasCompleteObject(t), chatUrl, fallbackPrompt, onChat: (u) => (chatUrl = u) });
  onProgress("고친 글을 정리하는 중…");
  const parsed = parser.parse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "AI 답변을 읽지 못했습니다.");
  const a = parsed.article;
  d.title = a.title || d.title;
  if (doc === "article" && Array.isArray(a.subtitles) && a.subtitles.length) d.subtitles = a.subtitles;
  d.paragraphs = naverBlog.splitParagraphs(a.body);
  if (Array.isArray(a.keywords) && a.keywords.length) d.keywords = a.keywords;
  (d.media || []).forEach((m) => {
    if (Number.isInteger(m.insertAfterParagraph)) m.insertAfterParagraph = Math.min(m.insertAfterParagraph, d.paragraphs.length);
  });
  d.chatUrl = chatUrl;
  d.revisedAt = new Date().toISOString();
  d.revisions = [...(d.revisions || []), { request: req, at: d.revisedAt }].slice(-20);
  fs.writeFileSync(docFile(vacancyId, doc), JSON.stringify(d, null, 2));
  log.info(`[${DOC_NAME[doc]} 수정] ${vacancyId} 문단 ${d.paragraphs.length}개`);
  return forWeb(d, doc);
}

/* 미리보기에서 고친 내용 저장: 제목·부제·문단·키워드·사진(순서·대표·자리·설명, 지운 사진은 빠짐) */
function save({ vacancyId, doc = "blog", title, subtitles, paragraphs, keywords, media }) {
  const d = readJson(docFile(vacancyId, doc));
  if (!d) throw new Error(`저장할 ${DOC_NAME[doc] || "글"}이 없습니다.`);
  if (typeof title === "string") d.title = title.trim();
  if (Array.isArray(subtitles)) d.subtitles = subtitles.map((s) => String(s).trim()).filter(Boolean).slice(0, 3);
  if (Array.isArray(paragraphs)) d.paragraphs = paragraphs.map((p) => String(p).trim()).filter(Boolean);
  if (Array.isArray(keywords)) d.keywords = keywords.map((k) => String(k).replace(/^#+/, "").trim()).filter(Boolean);
  if (Array.isArray(media)) {
    const byId = new Map((d.media || []).map((m) => [m.id, m]));
    d.media = media
      .filter((m) => byId.has(m.id))
      .map((m) => ({
        ...byId.get(m.id),
        caption: typeof m.caption === "string" ? m.caption : byId.get(m.id).caption,
        isCover: Boolean(m.isCover),
        insertAfterParagraph: m.isCover ? null : Number.isInteger(m.insertAfterParagraph) ? Math.min(m.insertAfterParagraph, d.paragraphs.length) : d.paragraphs.length,
      }));
  }
  d.editedAt = new Date().toISOString();
  fs.writeFileSync(docFile(vacancyId, doc), JSON.stringify(d, null, 2));
  return { ok: true };
}

/* 내 PC 사진 추가 → slot(문단 뒤 자리)에 넣는다. replaceId 면 그 사진을 바꾼다 */
async function addPhoto({ vacancyId, doc = "blog", dataUrl, slot, caption = "", kind = "upload", replaceId = null, cover = false }) {
  const d = readJson(docFile(vacancyId, doc));
  if (!d) throw new Error(`먼저 ${DOC_NAME[doc] || "글"}을 써 주세요.`);
  const id = newId();
  const file = await saveDataUrl(dataUrl, path.join(mediaDir(vacancyId), "added"), `${kind}-${id}`);
  // [수정] 사진 바꾸기: 자리·대표·순서는 그대로 두고 그림만 바꾼다 (내 사진이면 설명도 그대로)
  if (replaceId) {
    const item = d.media.find((m) => m.id === replaceId);
    if (!item) throw new Error("바꿀 사진을 찾지 못했습니다.");
    item.file = file;
    item.kind = kind;
    if (kind === "ai" && caption) item.caption = caption;
    fs.writeFileSync(docFile(vacancyId, doc), JSON.stringify(d, null, 2));
    return { id: item.id, kind, caption: item.caption, isCover: Boolean(item.isCover), insertAfterParagraph: Number.isInteger(item.insertAfterParagraph) ? item.insertAfterParagraph : null, thumb: thumbOf(file) };
  }
  const item = { id, kind, file, caption, isCover: false, insertAfterParagraph: Number.isInteger(slot) ? Math.min(slot, d.paragraphs.length) : d.paragraphs.length };
  if (cover) {
    // 대표 사진으로 맨 앞에 (뉴스칼럼 자동 대표 이미지)
    d.media.forEach((m) => (m.isCover = false));
    Object.assign(item, { isCover: true, insertAfterParagraph: null });
    d.media.unshift(item);
  } else d.media.push(item);
  fs.writeFileSync(docFile(vacancyId, doc), JSON.stringify(d, null, 2));
  return { id, kind, caption, isCover: item.isCover, insertAfterParagraph: item.insertAfterParagraph, thumb: thumbOf(file) };
}

/* AI 이미지 화풍 (확장과 같은 5종) */
function imageStyles(vacancyId) {
  if (isColumn(vacancyId)) return Object.entries(nm.GW_IMAGE_STYLE).map(([id, s]) => ({ id, label: s.label }));
  return Object.entries(extPrompt.GW_IMAGE_STYLE).map(([id, s]) => ({ id, label: s.label }));
}

/* AI 이미지 만들기: 확장과 같은 이미지 프롬프트(매물 사실 + 글 + 화풍·장면 요청)로 ChatGPT 가 그린 그림을 넣는다 */
async function makeImage({ baseUrl, vacancyId, doc = "blog", style = "news", request = "", slot, replaceId = null }, onProgress = () => {}) {
  const d = readJson(docFile(vacancyId, doc));
  if (isColumn(vacancyId)) {
    if (!d) throw new Error(`먼저 ${DOC_NAME[doc] || "글"}을 써 주세요.`);
    await useQuota(baseUrl, "ai_image");
    const st = nm.GW_IMAGE_STYLE[style] ? style : "auto";
    const article = { title: d.title, body: d.paragraphs.join("\n\n") };
    const dataUrl = await chatgpt.askImage(nm.gwBuildImagePrompt(column().readSource(vacancyId), article, { style: st, request }), { onProgress });
    onProgress("그림을 넣는 중…");
    return addPhoto({ vacancyId, doc, dataUrl, slot, replaceId, kind: "ai", caption: nm.gwAiImageCaption(article) });
  }
  const analysis = readAnalysis(vacancyId);
  if (!d || !analysis) throw new Error(`먼저 ${DOC_NAME[doc] || "글"}을 써 주세요.`);
  await useQuota(baseUrl, "ai_image");
  const prompt = extPrompt.gwBuildImagePrompt(analysis.vacancy, { title: d.title, body: d.paragraphs.join("\n\n") }, { style, request });
  const dataUrl = await chatgpt.askImage(prompt, { onProgress });
  onProgress("그림을 넣는 중…");
  const label = (extPrompt.GW_IMAGE_STYLE[style] || {}).label || "AI 이미지";
  const name = analysis.vacancy.title || "해당 매물";
  return addPhoto({ vacancyId, doc, dataUrl, slot, replaceId, kind: "ai", caption: `${name} ${label} (AI 생성 이미지)` });
}

/* 기사쓰기 화면으로 보내기: 기사 초안 + 사진(data URL)을 순서·자리대로 넘긴다 (기사쓰기 화면이 받아 채운다) */
function exportArticleDraft(vacancyId) {
  const d = readJson(docFile(vacancyId, "article"));
  if (!d) return null;
  const analysis = readAnalysis(vacancyId) || { vacancy: {} };
  const toDataUrl = (file) => {
    const ext = path.extname(file).toLowerCase();
    const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
  };
  return {
    title: d.title,
    subtitles: d.subtitles || [],
    paragraphs: d.paragraphs,
    keywords: d.keywords || [],
    saleKind: analysis.vacancy.saleKind || "",
    section1: d.section1 || "", // 뉴스칼럼: AI 가 고른 공실뉴스 섹션
    section2: d.section2 || "",
    photos: (d.media || [])
      .filter((m) => m.file && fs.existsSync(m.file))
      .map((m) => ({ dataUrl: toDataUrl(m.file), caption: m.caption || "", isCover: Boolean(m.isCover), slot: m.isCover ? -1 : Number.isInteger(m.insertAfterParagraph) ? m.insertAfterParagraph : d.paragraphs.length })),
  };
}

module.exports = { styles, articleOptions, write, writeArticle, revise, get, save, addPhoto, imageStyles, makeImage, exportArticleDraft, referenceArticle, saveWritten, useQuota, isColumn, mediaDir, readJson, blogFile, docFile };
