// 크롬 확장 뉴스메이커(newsmaker10)의 프롬프트·답변 해석 파일 (뉴스칼럼)
// 서로의 함수를 전역으로 부르는 브라우저용 파일들이라 한 실행 공간에 차례로 실행해 필요한 것만 꺼낸다.
// 파일은 서버에서 받는다 (ext.js). news-extract.js 는 화면(DOM)이 필요해 글만 꺼내 둔다 (column-writer 가 숨은 창에 넣는다).
const ext = require("./ext");

const FILES = ["sections.js", "market-prompt.js", "prompt.js", "blog-prompt.js", "naver-blog.js", "youtube-json.js", "article-json.js", "sns-prompt.js"].map((f) => `newsmaker/${f}`);
const NAMES = [
  "GW_LENGTH", "GW_KIND", "GW_IMAGE_STYLE", "gwSourceReady", "gwSourceLabel", "gwBuildPrompt", "gwBuildRevisePrompt", "gwBuildImagePrompt", "gwAiImageCaption",
  "gwNormalizeSection",
  "GW_BLOG_LENGTH", "GW_BLOG_STYLE", "gwBuildBlogPrompt", "gwBuildBlogRevisePrompt",
  "GW_SNS_CHANNELS", "gwBuildSnsPrompt", "gwBuildSnsRevisePrompt", "gwSnsParse", "gwSnsCompose", "gwSnsCredit", "gwSnsAiLabelNote",
  "GWNaverBlog", "GWArticleJson",
];

module.exports = ext.lazyModule(() => ({ ...ext.run(FILES, NAMES), NEWS_EXTRACT_SRC: ext.text("newsmaker/news-extract.js") }));
