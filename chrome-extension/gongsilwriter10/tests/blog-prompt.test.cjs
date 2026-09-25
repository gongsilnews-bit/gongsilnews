const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../shared/prompt.js"), "utf8");
const context = {};
vm.runInNewContext(`${source}\nglobalThis.__buildBlog = gwBuildBlogPrompt;`, context);

const vacancy = {
  title: "논현동 단독다가구",
  priceText: "매매 50억원",
  fields: [{ label: "소재지", value: "서울 강남구 논현동" }],
};
const article = {
  title: "[공실열람 보도] 논현동 단독다가구 매매",
  subtitles: ["확인된 매물 조건"],
  body: "매물의 확인된 조건을 설명하는 기사 본문이다.",
};

test("블로그 프롬프트에 완성 기사와 사용자의 실제 관점을 함께 넣는다", () => {
  const prompt = context.__buildBlog(vacancy, article, "현장에서 진입로 폭을 꼭 확인해야 한다고 느꼈습니다.");
  assert.match(prompt, /논현동 단독다가구 매매/);
  assert.match(prompt, /진입로 폭을 꼭 확인/);
  assert.match(prompt, /뉴스 기사를 복사하거나 문장 끝만 바꾸지 말고/);
});

test("관점 입력이 없으면 가짜 방문 경험을 만들지 못하게 한다", () => {
  const prompt = context.__buildBlog(vacancy, article, "");
  assert.match(prompt, /방문했다거나 직접 확인했다는 경험을 만들어 쓰지 마십시오/);
  assert.match(prompt, /무조건, 확실한, 보장/);
});
