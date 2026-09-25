const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GW_BLOG_LENGTH,
  GW_BLOG_STYLE,
  gwBuildBlogPrompt,
  gwBuildBlogRevisePrompt,
} = require("../shared/blog-prompt.js");

const source = {
  article: {
    title: "[공실열람 보도] 논현동 아크로힐스 매매",
    subtitles: ["3룸 남향 구조", "교통 접근성 확인"],
    body: "첫 문단입니다.\n\n둘째 문단입니다.",
  },
  vacancy: {
    title: "아크로힐스",
    priceText: "매매 15억",
    fields: [
      { label: "소재지", value: "서울 강남구 논현동" },
      { label: "방향", value: "남향" },
    ],
  },
};

test("블로그 스타일 6종과 분량 3종을 제공한다", () => {
  assert.equal(Object.keys(GW_BLOG_STYLE).length, 6);
  assert.deepEqual(Object.keys(GW_BLOG_LENGTH), ["short", "normal", "long"]);
});

test("선택한 스타일·분량과 참조 기사 사실을 프롬프트에 넣는다", () => {
  const prompt = gwBuildBlogPrompt(source, { style: "report", length: "long" });
  assert.match(prompt, /분석·리포트형/);
  assert.match(prompt, /2,500~3,500자/);
  assert.match(prompt, /매매 15억/);
  assert.match(prompt, /서울 강남구 논현동/);
  assert.match(prompt, /JSON\.parse/);
});

test("현장답사형도 실제 방문을 지어내지 못하게 한다", () => {
  const prompt = gwBuildBlogPrompt(source, { style: "visit", length: "short" });
  assert.match(prompt, /실제 방문·촬영·인터뷰를 했다고 거짓말하지 말고/);
  assert.match(prompt, /700~1,000자/);
});

test("수정 요청은 블로그 전체 JSON 재출력을 요구한다", () => {
  const prompt = gwBuildBlogRevisePrompt("첫 문단을 더 친근하게");
  assert.match(prompt, /첫 문단을 더 친근하게/);
  assert.match(prompt, /고친 블로그 글 전체/);
  assert.match(prompt, /"body"/);
});

