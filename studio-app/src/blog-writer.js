// 블로그 쓰기 (SNS뉴스발행 3단계)
// 공실 분석 결과(analysis.json)로 크롬 확장과 같은 블로그 프롬프트(6문체)를 만들어
// 회원이 연결한 AI(지금은 ChatGPT)에 보내고, 답변 JSON 을 제목·문단·키워드로 나눈다.
const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const blogPrompt = require("./ext/blog-prompt");
const articleJson = require("./ext/article-json");
const chatgpt = require("./ai/chatgpt");

const mediaDir = (vacancyId) => path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""));

function styles() {
  return {
    styles: Object.entries(blogPrompt.GW_BLOG_STYLE).map(([id, s]) => ({ id, label: s.label, fit: s.fit, titleExample: s.titleExample })),
    lengths: Object.entries(blogPrompt.GW_BLOG_LENGTH).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
  };
}

/* 기사를 먼저 쓰지 않았으면 [참조 기사] 자리에 "없음"을 알려 매물 정보만 쓰게 한다 */
const NO_ARTICLE = { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 [확인된 매물 정보]만 사용해 작성하십시오." };

async function write({ vacancyId, style = "listing", length = "normal", article = null }, onProgress = () => {}) {
  const file = path.join(mediaDir(vacancyId), "analysis.json");
  if (!fs.existsSync(file)) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  const analysis = JSON.parse(fs.readFileSync(file, "utf8"));

  const prompt = blogPrompt.gwBuildBlogPrompt({ vacancy: analysis.vacancy, article: article || NO_ARTICLE }, { style, length });
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => articleJson.hasCompleteObject(t) });

  onProgress("받은 글을 정리하는 중…");
  const parsed = articleJson.parse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "AI 답변을 읽지 못했습니다.");
  const a = parsed.article;
  const blog = {
    vacancyId,
    style,
    length,
    ai: "chatgpt",
    title: a.title,
    paragraphs: String(a.body || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    keywords: a.keywords || [],
    writtenAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(mediaDir(vacancyId), "blog.json"), JSON.stringify(blog, null, 2));
  log.info(`[블로그] ${vacancyId} ${style}/${length} 문단 ${blog.paragraphs.length}개`);
  return blog;
}

module.exports = { styles, write };
