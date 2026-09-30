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

test("ChatGPT 인터넷 검색 출처 표시(cite turn…)를 제목·본문·키워드에서 지운다", () => {
  const cite = (...refs) => "cite" + refs.map((r) => "" + r).join("") + "";
  const raw = JSON.stringify({
    title: "임장료 논의 " + cite("turn1search0"),
    body: [
      "업계의 불만도 임장료 논의를 키운 요인으로 꼽힌다. " + cite("turn584808search2", "turn584808search7"),
      "허용되기 어렵다는 취지다. citeturn584808search6",
      "예전 표시도 지운다【4:1†source】.",
    ],
    keywords: ["임장료" + cite("turn0news1")],
  });
  const result = articleJson.parse(raw);
  assert.equal(result.article.title, "임장료 논의");
  assert.equal(
    result.article.body,
    "업계의 불만도 임장료 논의를 키운 요인으로 꼽힌다.\n\n허용되기 어렵다는 취지다.\n\n예전 표시도 지운다."
  );
  assert.deepEqual(result.article.keywords, ["임장료"]);
  assert.equal(articleJson.stripCitations("returns turn과 search는 보통 단어다"), "returns turn과 search는 보통 단어다");
});

test("뉴스메이커: AI 가 고른 섹션을 읽고, JSON 이 깨져도 섹션을 살린다", () => {
  const ok = articleJson.parse('{"section1":"부동산·경제","section2":"세무/법률/기타","title":"제목","body":["본문"],"keywords":[]}');
  assert.equal(ok.article.section1, "부동산·경제");
  assert.equal(ok.article.section2, "세무/법률/기타");

  const loose = articleJson.parse('{"section1": "AI마케팅", "section2": "AI/NEWS", "title": "제목", "body": ["본문 "따옴표" 문단"], "keywords": ["AI"]}');
  assert.equal(loose.ok, true);
  assert.equal(loose.repaired, true);
  assert.equal(loose.article.section1, "AI마케팅");
  assert.equal(loose.article.section2, "AI/NEWS");

  const none = articleJson.parse('{"title":"제목","body":["본문"]}');
  assert.equal("section1" in none.article, false, "섹션이 없으면 칸을 만들지 않는다");
});
