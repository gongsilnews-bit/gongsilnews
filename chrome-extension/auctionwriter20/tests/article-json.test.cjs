const test = require("node:test");
const assert = require("node:assert/strict");
const articleJson = require("../shared/article-json.js");

const base = {
  title: "논현동 단독다가구 매매",
  subtitle1: "첫 번째 부제",
  subtitle2: "두 번째 부제",
  subtitle3: "세 번째 부제",
  keywords: ["논현동", "단독다가구"],
};

test("새 문단 배열 형식을 정상적으로 읽는다", () => {
  const result = articleJson.parse(JSON.stringify({ ...base, body: ["첫 문단", "둘째 문단"] }));
  assert.equal(result.ok, true);
  assert.equal(result.repaired, false);
  assert.equal(result.article.body, "첫 문단\n\n둘째 문단");
});

test("예전 body 문자열 형식도 계속 읽는다", () => {
  const result = articleJson.parse(JSON.stringify({ ...base, body: "첫 문단\n\n둘째 문단" }));
  assert.equal(result.ok, true);
  assert.equal(result.article.body, "첫 문단\n\n둘째 문단");
});

test("subtitles 배열 변형도 읽는다", () => {
  const result = articleJson.parse(JSON.stringify({
    title: base.title,
    subtitles: ["부제 1", "부제 2"],
    body: ["본문"],
    keywords: "논현동, 매매",
  }));
  assert.deepEqual(result.article.subtitles, ["부제 1", "부제 2"]);
  assert.deepEqual(result.article.keywords, ["논현동", "매매"]);
});

test("코드블록과 후행 쉼표를 자동 복구한다", () => {
  const raw = `\`\`\`json
{
  "title": "${base.title}",
  "subtitle1": "첫 번째 부제",
  "body": ["첫 문단", "둘째 문단",],
  "keywords": ["논현동",],
}
\`\`\``;
  const result = articleJson.parse(raw);
  assert.equal(result.ok, true);
  assert.equal(result.repaired, true);
  assert.equal(result.article.body, "첫 문단\n\n둘째 문단");
});

test("문자열 안의 원시 줄바꿈을 자동 복구한다", () => {
  const raw = `{
    "title": "${base.title}",
    "subtitle1": "첫 번째 부제",
    "body": "첫 문단

둘째 문단",
    "keywords": ["논현동"]
  }`;
  const result = articleJson.parse(raw);
  assert.equal(result.ok, true);
  assert.equal(result.repaired, true);
  assert.equal(result.article.body, "첫 문단\n\n둘째 문단");
});

test("Gemini의 문자열 body 뒤 잘못된 배열 닫기도 복구한다", () => {
  const raw = `JSON
{
  "title": "${base.title}",
  "subtitle1": "첫 번째 부제",
  "subtitle2": "두 번째 부제",
  "subtitle3": "세 번째 부제",
  "body": "첫 문단

둘째 문단"
  ],
  "keywords": ["논현동", "단독다가구"]
}`;
  const result = articleJson.parse(raw);
  assert.equal(result.ok, true);
  assert.equal(result.repaired, true);
  assert.equal(result.article.body, "첫 문단\n\n둘째 문단");
  assert.deepEqual(result.article.keywords, ["논현동", "단독다가구"]);
});

test("완성되지 않은 스트리밍 JSON을 구분한다", () => {
  assert.equal(articleJson.hasCompleteObject('{"title":"작성 중'), false);
  assert.equal(articleJson.hasCompleteObject('{"title":"완료","body":["본문"]}'), true);
});

test("제목이나 본문이 없으면 실패한다", () => {
  const result = articleJson.parse('{"title":"제목만","keywords":[]}');
  assert.equal(result.ok, false);
});
