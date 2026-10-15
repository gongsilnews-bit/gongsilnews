// 확장 기사작성기 shared/sns-prompt.js(인스타그램·페이스북·스레드 한 번에)는 블로그 프롬프트·네이버 블록·JSON 해석기를
// 전역으로 쓰는 브라우저용 파일이라, 한 실행 공간에 차례로 실행해 필요한 것만 꺼낸다. 파일은 서버에서 받는다 (ext.js).
const ext = require("./ext");

module.exports = ext.lazyModule(() =>
  ext.run(
    ["gongsil/blog-prompt.js", "gongsil/naver-blog.js", "gongsil/youtube-json.js", "gongsil/sns-prompt.js"],
    ["GW_SNS_CHANNELS", "GW_SNS_ORDER", "gwBuildSnsPrompt", "gwBuildSnsRevisePrompt", "gwSnsParse", "gwSnsCompose", "gwSnsPickMedia", "gwSnsAiLabelNote", "GWYoutubeJson"]
  )
);
