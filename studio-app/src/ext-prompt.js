// 확장 shared/prompt.js(기사·이미지 프롬프트)는 module.exports 가 없는 브라우저용 파일이라
// 따로 떼어 실행해 필요한 것만 꺼낸다. 파일 내용은 확장 원본 그대로다 (scripts/sync-ext.mjs).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "ext", "prompt.js"), "utf8");
module.exports = vm.runInNewContext(
  `${src}\n;({ gwBuildPrompt, GW_KIND, GW_AUCTION_KIND, GW_LENGTH, gwBuildImagePrompt, GW_IMAGE_STYLE })`,
  {},
  { filename: "prompt.js" }
);
