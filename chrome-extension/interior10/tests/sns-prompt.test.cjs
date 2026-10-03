/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

Object.assign(globalThis, require("../shared/blog-prompt.js"));
require("../shared/youtube-json.js");
require("../shared/naver-blog.js");
const s = require("../shared/sns-prompt.js");

const source = { article: { title: "시뮬레이션 기사", subtitles: [], body: "첫 문단.\n\n둘째 문단." }, vacancy: null };

test("예측이라는 점을 AI 에게 지키게 한다", () => {
  const prompt = s.gwBuildSnsPrompt(source);
  assert.ok(prompt.includes("AI 시뮬레이션의 \"예측\""));
  assert.ok(prompt.includes("시공 업체를 추천하거나"));
});

test("글 끝에 늘 AI 예측 이미지 안내 — 매물이 없으면 시뮬레이션 출처 줄", () => {
  const out = s.gwSnsCompose("facebook", { body: "본문", hashtags: [] }, { url: "https://www.gongsilnews.com", credit: "공실뉴스 인테리어 시뮬레이션 · gongsilnews.com" });
  assert.ok(out.text.includes(s.GW_SNS_SIM_NOTICE));
  assert.ok(s.GW_SNS_SIM_NOTICE.includes("인테리어 AI 예측 이미지"));
  assert.ok(out.text.includes("공실뉴스 인테리어 시뮬레이션"));
  const th = s.gwSnsCompose("threads", { posts: ["짧은 글"], topic: "" }, { credit: "공실뉴스 인테리어 시뮬레이션" });
  assert.ok(th.posts.at(-1).includes("AI 예측 이미지"));
});

test("예측 이미지는 real 표시가 있어도 AI — 현재 모습(실제 사진)이 대표, AI 레이블 안내", () => {
  const media = [
    { kind: "ai", url: "after1.png", real: true, isCover: true },
    { kind: "upload", url: "before.jpg", real: true },
    { kind: "ai", url: "after2.png", real: true },
  ];
  const ig = s.gwSnsPickMedia("instagram", media);
  assert.deepEqual(ig.map((m) => m.url), ["before.jpg", "after1.png", "after2.png"]);
  assert.equal(s.gwSnsCanLead(ig, 1), false);
  assert.ok(s.gwSnsAiLabelNote("instagram", ig).includes("AI로 만든 이미지 2장"));
});
