/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

/* 작업창에서는 앞선 script 로 들어오는 전역 — 테스트에서는 직접 넣는다 */
Object.assign(globalThis, require("../shared/blog-prompt.js"));
require("../shared/youtube-json.js");

const {
  GW_SNS_CHANNELS, GW_SNS_HOME,
  gwBuildSnsPrompt, gwBuildSnsRevisePrompt, gwSnsParse, gwSnsCompose, gwSnsCredit, gwSnsPickMedia, gwSnsCanLead, gwSnsAiLabelNote,
} = require("../shared/sns-prompt.js");

const article = { title: "전세 계약 전 확인할 것", subtitles: ["a", "b", "c"], body: "첫 문단.\n\n둘째 문단.", keywords: [] };
const newsSource = { mode: "news", news: { title: "전세사기 대책", publisher: "연합뉴스", body: "본문" }, topic: {} };
const marketSource = { mode: "local", local: { data: { target: { name: "서울 강남구 대치동" } } }, topic: {} };
const topicSource = { mode: "topic", topic: { subject: "전세 계약 체크리스트" } };

test("소재에 맞는 원칙 — 뉴스는 원문 문장 금지, 시세는 숫자 원칙", () => {
  const news = gwBuildSnsPrompt({ article, source: newsSource });
  assert.ok(news.includes("[페이스북 — facebook]") && news.includes("[스레드 — threads]"));
  assert.ok(news.includes("원문 뉴스(연합뉴스)의 문장을 그대로 옮기지 말고"));
  const market = gwBuildSnsPrompt({ article, source: marketSource });
  assert.ok(market.includes("[참조 기사]에 있는 숫자만"));
  assert.ok(!market.includes("중개사무소"), "매물 출처 규칙은 없다");
});

test("출처 줄 — 뉴스 · 시세 · 주제", () => {
  assert.equal(gwSnsCredit(newsSource), "출처: 연합뉴스 보도 내용 재구성 · 공실뉴스");
  assert.equal(gwSnsCredit(marketSource), "자료: 국토교통부 실거래가 (신고 기준) · 공실뉴스 정리");
  assert.equal(gwSnsCredit(topicSource), "공실뉴스");
});

test("링크 — 기사 주소가 없으면 공실뉴스 홈, 있으면 기사 전문 링크", () => {
  const home = gwSnsCompose("facebook", { body: "본문", hashtags: ["전세"] }, { credit: "공실뉴스" });
  assert.ok(home.text.includes(`▶ 공실뉴스에서 더 보기\n${GW_SNS_HOME}`));
  assert.ok(home.text.endsWith("#전세"));
  const url = "https://www.gongsilnews.com/news/123";
  const withUrl = gwSnsCompose("facebook", { body: "본문", hashtags: [] }, { url, credit: "공실뉴스" });
  assert.ok(withUrl.text.includes(`▶ 공실뉴스 기사 전문 보기\n${url}`));
  const ig = gwSnsCompose("instagram", { body: "훅", hashtags: [] }, { url, credit: "공실뉴스" });
  assert.ok(ig.text.includes(`자세한 내용은 프로필 링크 → 공실뉴스\n${url}`));
});

test("스레드 — 500자를 넘기면 링크·출처를 새 글로", () => {
  const short = gwSnsCompose("threads", { posts: ["짧은 글"], topic: "전세" }, { credit: "공실뉴스" });
  assert.equal(short.posts.length, 1);
  assert.ok(short.posts[0].includes("#전세") && short.posts[0].includes("공실뉴스에서 더 보기"));
  const long = gwSnsCompose("threads", { posts: ["가".repeat(490)], topic: "" }, { credit: "공실뉴스" });
  assert.equal(long.posts.length, 2);
  assert.ok(long.posts.every((post) => post.length <= GW_SNS_CHANNELS.threads.maxChars));
});

test("사진 — 시세표·직접 올린 사진 먼저, AI 이미지는 뒤, AI 레이블 안내", () => {
  const media = [
    { kind: "ai", url: "cover.png", isCover: true },
    { kind: "chart", url: "chart.png", real: true },
    { kind: "upload", url: "up.jpg", real: true },
  ];
  const ig = gwSnsPickMedia("instagram", media);
  assert.deepEqual(ig.map((m) => m.url), ["chart.png", "up.jpg", "cover.png"]);
  assert.equal(ig[2].ai, true);
  assert.equal(gwSnsCanLead(ig, 2), false);
  assert.ok(gwSnsAiLabelNote("instagram", ig).includes("AI로 만든 이미지 1장"));
  const onlyAi = gwSnsPickMedia("facebook", [{ kind: "ai", url: "a.png" }]);
  assert.equal(gwSnsCanLead(onlyAi, 0), true);
});

test("수정 요청은 한 플랫폼만, 답변 읽기는 V30 과 같다", () => {
  assert.ok(gwBuildSnsRevisePrompt("threads", "짧게").includes("[스레드] 글만"));
  const parsed = gwSnsParse('{"instagram":{"lines":["훅 📌","줄"],"hashtags":["#전세"]}}');
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.posts.instagram.hashtags, ["전세"]);
});
