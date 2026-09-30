const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GW_BLOG_LENGTH,
  GW_BLOG_STYLE,
  gwBuildBlogPrompt,
  gwBuildBlogRevisePrompt,
} = require("../shared/blog-prompt.js");

const article = {
  title: "내년부터 청약 가점 기준 바뀐다",
  subtitles: ["부양가족 점수 상한 상향", "2027년 1월 시행"],
  body: "첫 문단입니다.\n\n둘째 문단입니다.",
};
const newsInput = {
  article,
  source: { mode: "news", news: { title: "청약 가점 개편", publisher: "연합뉴스", url: "https://yna.co.kr/1" } },
};
const topicInput = {
  article,
  source: { mode: "topic", topic: { subject: "이사 체크리스트", memo: "전입신고는 14일 안에" } },
};

test("블로그 스타일 6종과 분량 3종을 제공한다", () => {
  assert.deepEqual(Object.keys(GW_BLOG_STYLE), ["info", "story", "qna", "report", "tips", "shortform"]);
  assert.deepEqual(Object.keys(GW_BLOG_LENGTH), ["short", "normal", "long"]);
  Object.values(GW_BLOG_STYLE).forEach((style) => assert.ok(["basic", "magazine", "qna", "news"].includes(style.design)));
});

test("뉴스 소재 블로그는 기사·원문 출처·스타일·분량을 넣고 출처 표기를 요구한다", () => {
  const prompt = gwBuildBlogPrompt(newsInput, { style: "qna", length: "long" });
  assert.ok(prompt.includes("[제목] 내년부터 청약 가점 기준 바뀐다"));
  assert.ok(prompt.includes("[부제] 부양가족 점수 상한 상향 / 2027년 1월 시행"));
  assert.ok(prompt.includes("- 원문 언론사: 연합뉴스"));
  assert.ok(prompt.includes("[선택한 스타일] Q&A 해설형"));
  assert.ok(prompt.includes("2,500~3,500자"));
  assert.ok(prompt.includes('"연합뉴스 보도에 따르면"'));
  assert.ok(prompt.includes("원문 기사의 문장을 그대로 옮기지 말 것"));
  assert.ok(prompt.includes('"■ "로 시작'));
  assert.ok(!/매물|중개사무소/.test(prompt), "매물 블로그 지시가 섞이지 않는다");
});

test("주제 소재 블로그는 주제·메모를 넣고 출처 표기 지시를 넣지 않는다", () => {
  const prompt = gwBuildBlogPrompt(topicInput, { style: "tips" });
  assert.ok(prompt.includes("- 소재: 주제 — 이사 체크리스트"));
  assert.ok(prompt.includes("- 참고 메모: 전입신고는 14일 안에"));
  assert.ok(prompt.includes("[선택한 스타일] 생활 꿀팁형"));
  assert.ok(prompt.includes("1,500~2,000자"), "분량 기본은 중간");
  assert.ok(!prompt.includes("보도에 따르면"));
});

test("모르는 스타일이면 기본 정보형으로 쓴다", () => {
  assert.ok(gwBuildBlogPrompt(topicInput, { style: "listing" }).includes("[선택한 스타일] 기본 정보형"));
});

test("수정 요청은 사실 유지와 전체 JSON 출력을 요구한다", () => {
  const prompt = gwBuildBlogRevisePrompt("도입을 더 친근하게");
  assert.ok(prompt.includes("요청: 도입을 더 친근하게"));
  assert.ok(prompt.includes("사실은 바꾸거나 새로 만들지 마십시오"));
  assert.ok(prompt.includes("고친 블로그 글 전체를 다시 출력"));
  assert.ok(prompt.includes('"body": ["첫 문단", "둘째 문단"]'));
});
