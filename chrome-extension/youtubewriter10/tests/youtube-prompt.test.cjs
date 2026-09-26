/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const prompt = require("../shared/youtube-prompt.js");

test("매물 필드를 대본 자료에 포함한다", () => {
  const text = prompt.gywSourceText({
    title: "논현동 단독주택",
    priceText: "50억 원",
    fields: [{ label: "면적", value: "231.4㎡" }],
    themes: ["역세권", "단독주택"],
  });
  assert.match(text, /논현동 단독주택/);
  assert.match(text, /50억 원/);
  assert.match(text, /231\.4㎡/);
  assert.match(text, /역세권/);
});

test("선택한 길이와 장면 길이를 대본 요청에 반영한다", () => {
  const text = prompt.gywBuildScriptPrompt(
    { title: "자료", body: "확인된 본문" },
    { videoType: "news", duration: "medium", sceneLength: "short", aspectRatio: "16:9", tone: "expert" }
  );
  assert.match(text, /약 2분/);
  assert.match(text, /장면당 약 3~5초/);
  assert.match(text, /장면 수는 특정 숫자로 고정하지 말고/);
  assert.match(text, /16:9/);
});

test("한국형 이미지 스타일과 글자 금지 규칙을 반영한다", () => {
  const text = prompt.gywBuildImagePrompt(
    { heading: "오프닝", narration: "매물을 소개합니다.", visualPrompt: "한국 주택가" },
    { imageStyle: "presentation", aspectRatio: "9:16" },
    "저녁 분위기로 변경"
  );
  assert.match(text, /프리미엄 PPT 프레젠테이션/);
  assert.match(text, /9:16/);
  assert.match(text, /한글, 숫자, 로고, 워터마크를 그리지 말 것/);
  assert.match(text, /저녁 분위기로 변경/);
});

test("한국형 스타일 7종을 제공한다", () => {
  assert.equal(Object.keys(prompt.GYW_IMAGE_STYLE).length, 7);
});
