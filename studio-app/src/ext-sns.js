// 확장 shared/sns-prompt.js(인스타그램·페이스북·스레드 한 번에)는 블로그 프롬프트·네이버 블록·JSON 해석기를
// 전역으로 쓰는 브라우저용 파일이라, 한 실행 공간에 차례로 실행해 필요한 것만 꺼낸다 (파일은 확장 원본 그대로).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ctx = vm.createContext({ console });
for (const f of ["blog-prompt.js", "naver-blog.js", "youtube-json.js", "sns-prompt.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "ext", f), "utf8"), ctx, { filename: f });
}
module.exports = vm.runInContext(
  "({ GW_SNS_CHANNELS, GW_SNS_ORDER, gwBuildSnsPrompt, gwSnsParse, gwSnsCompose, gwSnsPickMedia, gwSnsAiLabelNote, GWYoutubeJson })",
  ctx
);
