/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const parser = require("../shared/youtube-json.js");

test("코드블록의 장면 JSON을 정규화한다", () => {
  const result = parser.parse(`설명
\`\`\`json
{
  "title": "논현동 매물",
  "description": "핵심 소개",
  "scenes": [
    {"title":"오프닝","script":"첫 문장","subtitle":"핵심 자막","imagePrompt":"한국 주택가"}
  ]
}
\`\`\``);
  assert.equal(result.ok, true);
  assert.equal(result.script.title, "논현동 매물");
  assert.equal(result.script.scenes[0].heading, "오프닝");
  assert.equal(result.script.scenes[0].narration, "첫 문장");
  assert.equal(result.script.scenes[0].visualPrompt, "한국 주택가");
});

test("문자열 안 줄바꿈과 마지막 쉼표를 복구한다", () => {
  const result = parser.parse(`{
    "title":"테스트",
    "scenes":[{"heading":"장면 1","narration":"첫 줄
둘째 줄",}],
  }`);
  assert.equal(result.ok, true);
  assert.equal(result.repaired, true);
  assert.match(result.script.scenes[0].narration, /첫 줄\n둘째 줄/);
});

test("대본이 없는 응답은 거부한다", () => {
  const result = parser.parse('{"title":"빈 대본","scenes":[]}');
  assert.equal(result.ok, false);
});

test("괄호가 닫힌 JSON만 완료로 본다", () => {
  assert.equal(parser.hasCompleteObject('{"title":"완료"}'), true);
  assert.equal(parser.hasCompleteObject('{"title":"작성 중'), false);
});
