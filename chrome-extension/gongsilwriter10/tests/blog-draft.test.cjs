const test = require("node:test");
const assert = require("node:assert/strict");

const GWBlogDraft = require("../shared/blog-draft.js");

const article = {
  title: "[공실열람 보도] 논현동 단독다가구 매매 현장",
  body: "논현동에 단독다가구 매물이 나왔다.\n\n계약 전 권리관계를 확인해야 한다.",
  keywords: ["논현동", "단독다가구", "매매"],
};

test("기사 내용이 바뀌면 원본 서명이 달라진다", () => {
  const before = GWBlogDraft.signature(article);
  const after = GWBlogDraft.signature({ ...article, body: article.body + " 변경" });
  assert.notEqual(before, after);
});

test("같은 문장을 그대로 옮기면 중복 비율이 높아진다", () => {
  assert.equal(GWBlogDraft.exactOverlap(article.body, article.body), 1);
  assert.equal(
    GWBlogDraft.exactOverlap(article.body, "직접 살펴볼 핵심을 정리해 보겠습니다.\n\n현장에서는 채광과 진입 동선을 함께 봐야 합니다."),
    0
  );
});

test("해시태그의 #과 중복을 정리한다", () => {
  assert.deepEqual(GWBlogDraft.uniqueKeywords(["#논현동", "논현동", " 단독다가구 "]), ["논현동", "단독다가구"]);
  assert.equal(GWBlogDraft.hashtags({ keywords: ["논현동", "단독 다가구"] }), "#논현동 #단독다가구");
});

test("블로그 복사문은 본문과 해시태그를 분리한다", () => {
  assert.equal(
    GWBlogDraft.bodyWithTags({ body: "본문입니다.", keywords: ["논현동", "매매"] }),
    "본문입니다.\n\n#논현동 #매매"
  );
});

test("품질 점검은 실제 관점이 없거나 원문이 그대로면 경고한다", () => {
  const checks = GWBlogDraft.evaluate(article, article, "", GWBlogDraft.signature(article));
  assert.equal(checks.find((item) => item.id === "fresh").ok, true);
  assert.equal(checks.find((item) => item.id === "title").ok, false);
  assert.equal(checks.find((item) => item.id === "rewrite").ok, false);
  assert.equal(checks.find((item) => item.id === "perspective").ok, false);
});
