// 확장 기사작성기 shared/prompt.js(기사·이미지 프롬프트) — module.exports 가 없는 브라우저용 파일이라 필요한 것만 꺼낸다.
// 파일은 서버에서 받는다 (ext.js).
const ext = require("./ext");

module.exports = ext.lazyModule(() =>
  ext.run(["gongsil/prompt.js"], ["gwBuildPrompt", "gwBuildRevisePrompt", "GW_KIND", "GW_AUCTION_KIND", "GW_LENGTH", "gwBuildImagePrompt", "GW_IMAGE_STYLE"])
);
