// 블로그 쓰기·다듬기 (SNS뉴스발행 3단계)
// 공실 분석 결과(analysis.json)로 크롬 확장과 같은 블로그 프롬프트(6문체)를 만들어
// 회원이 연결한 AI(지금은 ChatGPT)에 보내고, 답변 JSON 을 제목·문단·키워드로 나눈다.
//
// 미리보기 다듬기(확장 블로그 탭과 같은 방식):
//  - blog.media 의 사진마다 insertAfterParagraph(0 = 첫 문단 앞, n = n번째 문단 뒤) 자리를 둔다.
//    네이버 채우기(naver-write.js)는 이 자리를 그대로 따른다 → 미리보기 순서 = 네이버 순서.
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

const mediaDir = (vacancyId) => path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""));
const blogFile = (vacancyId) => path.join(mediaDir(vacancyId), "blog.json");
const newId = () => crypto.randomBytes(6).toString("hex");

function styles(vacancyId) {
  const analysis = vacancyId ? readJson(path.join(mediaDir(vacancyId), "analysis.json")) : null;
  const table = blogPrompt.gwBlogStyles(analysis && analysis.vacancy); // 경매·공매면 경매용 문체
  return {
    saleKind: (analysis && analysis.vacancy && analysis.vacancy.saleKind) || "",
    styles: Object.entries(table).map(([id, s]) => ({ id, label: s.label, fit: s.fit, titleExample: s.titleExample, design: s.design })),
    lengths: Object.entries(blogPrompt.GW_BLOG_LENGTH).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
  };
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
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

/* 웹 화면에 보낼 모양 (파일 경로 대신 id·썸네일) */
function forWeb(blog) {
  if (!blog) return null;
  return {
    vacancyId: blog.vacancyId,
    style: blog.style,
    length: blog.length,
    title: blog.title,
    paragraphs: blog.paragraphs,
    keywords: blog.keywords,
    media: (blog.media || []).map((m) => ({
      id: m.id,
      kind: m.kind,
      caption: m.caption,
      isCover: Boolean(m.isCover),
      insertAfterParagraph: Number.isInteger(m.insertAfterParagraph) ? m.insertAfterParagraph : null,
      thumb: thumbOf(m.file),
    })),
  };
}

function get(vacancyId) {
  const blog = readJson(blogFile(vacancyId));
  // 사진 목록이 없는 예전 글이면 분석 사진(등록 사진 전부 + 캡처 3장, 첫 장 대표)으로 채워 둔다
  if (blog && !Array.isArray(blog.media)) {
    const analysis = readJson(path.join(mediaDir(vacancyId), "analysis.json"));
    const media = ((analysis && analysis.media) || []).map((m, i) => ({ id: newId(), kind: m.kind, file: m.file, caption: m.caption, isCover: i === 0 }));
    blog.media = materializeSlots(media, blog.paragraphs.length);
    fs.writeFileSync(blogFile(vacancyId), JSON.stringify(blog, null, 2));
  }
  return forWeb(blog);
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

/* 기사를 먼저 쓰지 않았으면 [참조 기사] 자리에 "없음"을 알려 매물 정보만 쓰게 한다 */
const NO_ARTICLE = { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 [확인된 매물 정보]만 사용해 작성하십시오." };

async function write({ baseUrl, vacancyId, style = "listing", length = "normal", article = null }, onProgress = () => {}) {
  const analysis = readJson(path.join(mediaDir(vacancyId), "analysis.json"));
  if (!analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  onProgress("이용 횟수를 확인하는 중…");
  await useQuota(baseUrl, "blog", vacancyId); // 이번 달 이 공실을 처음 쓸 때만 1회

  const prompt = blogPrompt.gwBuildBlogPrompt({ vacancy: analysis.vacancy, article: article || NO_ARTICLE }, { style, length });
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => articleJson.hasCompleteObject(t) });

  onProgress("받은 글을 정리하는 중…");
  const parsed = articleJson.parse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "AI 답변을 읽지 못했습니다.");
  const a = parsed.article;
  const paragraphs = naverBlog.splitParagraphs(a.body);

  // 사진: 다시 쓸 때는 지금까지 고른 사진(추가·삭제·대표)을 유지하고 자리만 새 문단 수에 맞춘다
  const prev = readJson(blogFile(vacancyId));
  const media =
    prev && prev.media && prev.media.length
      ? prev.media.map((m) => ({ ...m, insertAfterParagraph: m.isCover ? null : undefined }))
      : (analysis.media || []).map((m, i) => ({ id: newId(), kind: m.kind, file: m.file, caption: m.caption, isCover: i === 0 }));

  const blog = {
    vacancyId,
    style,
    length,
    ai: "chatgpt",
    title: a.title,
    paragraphs,
    keywords: a.keywords || [],
    media: materializeSlots(media, paragraphs.length),
    writtenAt: new Date().toISOString(),
  };
  fs.writeFileSync(blogFile(vacancyId), JSON.stringify(blog, null, 2));
  log.info(`[블로그] ${vacancyId} ${style}/${length} 문단 ${paragraphs.length}개`);
  return forWeb(blog);
}

/* 미리보기에서 고친 내용 저장: 제목·문단·키워드·사진(순서·대표·자리·설명, 지운 사진은 빠짐) */
function save({ vacancyId, title, paragraphs, keywords, media }) {
  const blog = readJson(blogFile(vacancyId));
  if (!blog) throw new Error("저장할 블로그 글이 없습니다.");
  if (typeof title === "string") blog.title = title.trim();
  if (Array.isArray(paragraphs)) blog.paragraphs = paragraphs.map((p) => String(p).trim()).filter(Boolean);
  if (Array.isArray(keywords)) blog.keywords = keywords.map((k) => String(k).replace(/^#+/, "").trim()).filter(Boolean);
  if (Array.isArray(media)) {
    const byId = new Map((blog.media || []).map((m) => [m.id, m]));
    blog.media = media
      .filter((m) => byId.has(m.id))
      .map((m) => ({
        ...byId.get(m.id),
        caption: typeof m.caption === "string" ? m.caption : byId.get(m.id).caption,
        isCover: Boolean(m.isCover),
        insertAfterParagraph: m.isCover ? null : Number.isInteger(m.insertAfterParagraph) ? Math.min(m.insertAfterParagraph, blog.paragraphs.length) : blog.paragraphs.length,
      }));
  }
  blog.editedAt = new Date().toISOString();
  fs.writeFileSync(blogFile(vacancyId), JSON.stringify(blog, null, 2));
  return { ok: true };
}

/* 내 PC 사진 추가 → slot(문단 뒤 자리)에 넣는다 */
async function addPhoto({ vacancyId, dataUrl, slot, caption = "", kind = "upload", replaceId = null }) {
  const blog = readJson(blogFile(vacancyId));
  if (!blog) throw new Error("먼저 블로그 글을 써 주세요.");
  const id = newId();
  const file = await saveDataUrl(dataUrl, path.join(mediaDir(vacancyId), "added"), `${kind}-${id}`);
  // [수정] 사진 바꾸기: 자리·대표·순서는 그대로 두고 그림만 바꾼다 (내 사진이면 설명도 그대로)
  if (replaceId) {
    const item = blog.media.find((m) => m.id === replaceId);
    if (!item) throw new Error("바꿀 사진을 찾지 못했습니다.");
    item.file = file;
    item.kind = kind;
    if (kind === "ai" && caption) item.caption = caption;
    fs.writeFileSync(blogFile(vacancyId), JSON.stringify(blog, null, 2));
    return { id: item.id, kind, caption: item.caption, isCover: Boolean(item.isCover), insertAfterParagraph: Number.isInteger(item.insertAfterParagraph) ? item.insertAfterParagraph : null, thumb: thumbOf(file) };
  }
  const item = { id, kind, file, caption, isCover: false, insertAfterParagraph: Number.isInteger(slot) ? Math.min(slot, blog.paragraphs.length) : blog.paragraphs.length };
  blog.media.push(item);
  fs.writeFileSync(blogFile(vacancyId), JSON.stringify(blog, null, 2));
  return { id, kind, caption, isCover: false, insertAfterParagraph: item.insertAfterParagraph, thumb: thumbOf(file) };
}

/* AI 이미지 화풍 (확장과 같은 5종) */
function imageStyles() {
  return Object.entries(extPrompt.GW_IMAGE_STYLE).map(([id, s]) => ({ id, label: s.label }));
}

/* AI 이미지 만들기: 확장과 같은 이미지 프롬프트(매물 사실 + 블로그 글 + 화풍·장면 요청)로 ChatGPT 가 그린 그림을 slot 에 넣는다 */
async function makeImage({ baseUrl, vacancyId, style = "news", request = "", slot, replaceId = null }, onProgress = () => {}) {
  const blog = readJson(blogFile(vacancyId));
  const analysis = readJson(path.join(mediaDir(vacancyId), "analysis.json"));
  if (!blog || !analysis) throw new Error("먼저 블로그 글을 써 주세요.");
  await useQuota(baseUrl, "ai_image");
  const prompt = extPrompt.gwBuildImagePrompt(analysis.vacancy, { title: blog.title, body: blog.paragraphs.join("\n\n") }, { style, request });
  const dataUrl = await chatgpt.askImage(prompt, { onProgress });
  onProgress("그림을 블로그에 넣는 중…");
  const label = (extPrompt.GW_IMAGE_STYLE[style] || {}).label || "AI 이미지";
  const name = analysis.vacancy.title || "해당 매물";
  return addPhoto({ vacancyId, dataUrl, slot, replaceId, kind: "ai", caption: `${name} ${label} (AI 생성 이미지)` });
}

module.exports = { styles, write, get, save, addPhoto, imageStyles, makeImage, mediaDir, readJson, blogFile };
