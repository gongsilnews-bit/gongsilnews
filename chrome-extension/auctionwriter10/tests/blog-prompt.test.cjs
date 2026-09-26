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


test("스타일마다 구성 설계도와 어울리는 블로그 디자인이 있다", () => {
  const { DESIGNS } = require("../shared/naver-blog.js");
  for (const [key, style] of Object.entries(GW_BLOG_STYLE)) {
    assert.ok(style.structure, `${key} 구성 설계도`);
    assert.ok(DESIGNS[style.design], `${key} 디자인 ${style.design}`);
  }
  assert.equal(GW_BLOG_STYLE.consult.design, "qna");
});

test("프롬프트에 선택한 스타일의 구성과 소제목 표시 규칙을 넣는다", () => {
  const prompt = gwBuildBlogPrompt(source, { style: "visit", length: "normal" });
  assert.ok(prompt.includes(`- 구성: ${GW_BLOG_STYLE.visit.structure}`));
  assert.ok(prompt.includes('반드시 "■ "로 시작'));
  assert.ok(prompt.includes("첫 문단은 2문장 이내의 핵심 요약"));
  assert.ok(!prompt.includes("필요한 경우에만"));
});

test("6개 스타일 모두 경매·공매 보도 원칙을 먼저 넣고 투자 권유·온비드 연락처·법적 주의사항을 막는다", () => {
  for (const style of Object.keys(GW_BLOG_STYLE)) {
    const prompt = gwBuildBlogPrompt(source, { style, length: "normal" });
    assert.ok(/"공실뉴스 공실열람에 이런 (경매|공매) 물건이 나왔다"는 객관적인 보도/.test(prompt), style);
    assert.ok(prompt.indexOf("[보도 원칙") < prompt.indexOf("[가장 중요한 사실 원칙]"), style);
    assert.ok(prompt.includes("투자 권유·호객 표현 금지"), style);
    assert.ok(prompt.includes("낙찰가·낙찰가율·수익률·시세 상승을 예측하지 말 것"), style);
    assert.ok(prompt.includes("온비드 고객센터 등 정보제공업체 연락처"), style);
    assert.ok(prompt.includes("입찰 전 법적 주의사항 안내문은 쓰지 말 것"), style);
  }
  assert.ok(!/한번 보세요/.test(JSON.stringify(GW_BLOG_STYLE)), "스타일 예시에도 권유 문구 없음");
  assert.ok(gwBuildBlogRevisePrompt("짧게").includes("객관적 보도 형식을 유지"));
});
