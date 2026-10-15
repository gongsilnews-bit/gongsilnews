// 크롬 확장의 유튜브 대본 프롬프트 (서버에서 받는다, ext.js)
//  - 공실(매물·경매)  : 기사작성기 youtube-prompt.js — 매물 사실(gwFactLines, prompt.js)을 함께 쓴다
//  - 뉴스칼럼        : 뉴스메이커 youtube-prompt.js — 숫자 읽기(한글·숫자) 표가 있다
// 서로 이름이 같아 실행 공간을 둘로 나눈다.
const ext = require("./ext");

const common = ["GW_YT_VIDEO_TYPE", "GW_YT_DURATION", "GW_YT_TONE", "gwBuildYtScriptPrompt", "gwBuildYtRevisePrompt", "gwYtSpeechSeconds", "gwYtCharCount", "GWYoutubeJson"];

module.exports = {
  gongsil: ext.lazyModule(() => ext.run(["gongsil/prompt.js", "gongsil/youtube-json.js", "gongsil/youtube-prompt.js"], [...common, "GW_YT_AUCTION_VIDEO_TYPE", "gwYtVideoTypes"])),
  column: ext.lazyModule(() => ext.run(["newsmaker/youtube-json.js", "newsmaker/youtube-prompt.js"], [...common, "GW_YT_NUMBER"])),
};
