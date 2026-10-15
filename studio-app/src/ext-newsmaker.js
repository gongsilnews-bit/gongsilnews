// 크롬 확장 뉴스메이커(newsmaker10)의 프롬프트·답변 해석 파일 (뉴스칼럼)
// 서로의 함수를 전역으로 부르는 브라우저용 파일들이라 한 실행 공간에 차례로 실행해 필요한 것만 꺼낸다.
// 파일 내용은 확장 원본 그대로다 (scripts/sync-ext.mjs → src/ext/newsmaker).
// news-extract.js 는 화면(DOM)이 필요해 여기서 돌리지 않고 글만 꺼내 둔다 (column-writer 가 숨은 창에 넣는다).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.join(__dirname, "ext", "newsmaker");
const ctx = vm.createContext({ console });
for (const f of ["sections.js", "market-prompt.js", "prompt.js", "blog-prompt.js", "naver-blog.js", "youtube-json.js", "article-json.js", "sns-prompt.js"]) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: `newsmaker/${f}` });
}

module.exports = {
  ...vm.runInContext(
    `({
      GW_LENGTH, GW_KIND, GW_IMAGE_STYLE, gwSourceReady, gwSourceLabel, gwBuildPrompt, gwBuildImagePrompt, gwAiImageCaption,
      gwNormalizeSection,
      GW_BLOG_LENGTH, GW_BLOG_STYLE, gwBuildBlogPrompt,
      GW_SNS_CHANNELS, gwBuildSnsPrompt, gwSnsParse, gwSnsCompose, gwSnsCredit, gwSnsAiLabelNote,
      GWNaverBlog, GWArticleJson,
    })`,
    ctx
  ),
  NEWS_EXTRACT_SRC: fs.readFileSync(path.join(dir, "news-extract.js"), "utf8"),
};
