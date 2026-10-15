// 크롬 확장의 유튜브 대본 프롬프트 (확장 원본 그대로, scripts/sync-ext.mjs 로 복사)
//  - 공실(매물·경매)  : gongsilwriter30/shared/youtube-prompt.js — 매물 사실(gwFactLines, prompt.js)을 함께 쓴다
//  - 뉴스칼럼        : newsmaker10/shared/youtube-prompt.js — 숫자 읽기(한글·숫자) 표가 있다
// 서로 이름이 같아 실행 공간을 둘로 나눈다.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function load(dir, files, names) {
  const ctx = vm.createContext({ console });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(__dirname, dir, f), "utf8"), ctx, { filename: `${dir}/${f}` });
  return vm.runInContext(`({ ${names.join(", ")} })`, ctx);
}

const common = ["GW_YT_VIDEO_TYPE", "GW_YT_DURATION", "GW_YT_TONE", "gwBuildYtScriptPrompt", "gwBuildYtRevisePrompt", "gwYtSpeechSeconds", "gwYtCharCount", "GWYoutubeJson"];

module.exports = {
  gongsil: load("ext", ["prompt.js", "youtube-json.js", "youtube-prompt.js"], [...common, "GW_YT_AUCTION_VIDEO_TYPE", "gwYtVideoTypes"]),
  column: load(path.join("ext", "newsmaker"), ["youtube-json.js", "youtube-prompt.js"], [...common, "GW_YT_NUMBER"]),
};
