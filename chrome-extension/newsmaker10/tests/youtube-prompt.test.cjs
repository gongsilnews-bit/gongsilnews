/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

const yt = require("../shared/youtube-prompt.js");

const article = {
  title: "내년부터 청약 가점 기준 바뀐다",
  subtitles: ["부양가족 점수 상한 상향"],
  body: "국토교통부는 청약 가점 기준을 바꾼다고 밝혔다.\n\n부양가족 점수 상한이 35점에서 40점으로 오른다.",
};
const newsInput = { article, source: { mode: "news", news: { title: "청약 가점 개편", publisher: "연합뉴스" } } };
const topicInput = { article, source: { mode: "topic", topic: { subject: "이사 체크리스트" } } };

test("설정 표 — 유형 3·길이 4·말투 3·숫자 표기 2", () => {
  assert.deepEqual(Object.keys(yt.GW_YT_VIDEO_TYPE), ["briefing", "info", "story"]);
  assert.deepEqual(Object.keys(yt.GW_YT_DURATION), ["short", "mid", "long", "xlong"]);
  assert.deepEqual(Object.keys(yt.GW_YT_TONE), ["news", "friendly", "expert"]);
  assert.deepEqual(Object.keys(yt.GW_YT_NUMBER), ["hangul", "digit"]);
});

test("뉴스 소재 대본은 기사·원문 출처·설정을 넣고 읽을 원고와 제목 후보만 요청한다", () => {
  const prompt = yt.gwBuildYtScriptPrompt(newsInput, { videoType: "briefing", duration: "long", tone: "expert", number: "hangul" });
  assert.ok(prompt.includes("[기사 제목] 내년부터 청약 가점 기준 바뀐다"));
  assert.ok(prompt.includes("[원문 출처] 연합뉴스 「청약 가점 개편」"));
  assert.ok(prompt.includes("뉴스 브리핑"));
  assert.ok(prompt.includes("약 6분"));
  assert.ok(prompt.includes("약 1,800~2,200자"));
  assert.ok(prompt.includes("차분하고 논리적인 전문가 해설형"));
  assert.ok(prompt.includes("일억 오천만 원"), "기본은 TTS 한글 읽기");
  assert.ok(prompt.includes('"연합뉴스 보도에 따르면"'));
  assert.ok(prompt.includes('"narration"') && prompt.includes('"titles"'));
  assert.ok(!prompt.includes('"scenes"'), "장면을 요청하지 않는다");
  assert.ok(prompt.includes("더 자세한 소식은 공실뉴스에서 확인할 수 있습니다."));
});

test("주제 소재 대본은 주제를 넣고 출처 표기 지시를 넣지 않는다. 숫자 그대로도 고를 수 있다", () => {
  const prompt = yt.gwBuildYtScriptPrompt(topicInput, { videoType: "story", duration: "short", tone: "friendly", number: "digit" });
  assert.ok(prompt.includes("[주제] 이사 체크리스트"));
  assert.ok(prompt.includes("이야기형"));
  assert.ok(prompt.includes("60초 쇼츠"));
  assert.ok(prompt.includes("아라비아 숫자"));
  assert.ok(!prompt.includes("보도에 따르면"));
  assert.ok(prompt.includes("가정한 사례임을 분명히"));
});

test("모르는 설정이면 기본값(뉴스 브리핑·60초·뉴스형·한글 읽기)으로 쓴다", () => {
  const prompt = yt.gwBuildYtScriptPrompt(topicInput, { videoType: "listing", duration: "medium", tone: "x", number: "y" });
  assert.ok(prompt.includes("뉴스 브리핑") && prompt.includes("60초 쇼츠") && prompt.includes("뉴스 앵커형") && prompt.includes("일억 오천만 원"));
});

test("수정 요청은 현재 원고 전체와 제목 후보 모양을 다시 요구한다", () => {
  const prompt = yt.gwBuildYtRevisePrompt({ title: "제목", text: "첫 문단.\n\n둘째 문단." }, "오프닝을 더 강하게");
  assert.ok(prompt.includes("오프닝을 더 강하게"));
  assert.ok(prompt.includes('"첫 문단."') && prompt.includes('"둘째 문단."'));
  assert.ok(prompt.includes("원고 전체를 빠짐없이"));
  assert.ok(prompt.includes('"titles"'));
});

test("읽는 시간은 공백 빼고 1초에 5.5글자로 센다", () => {
  assert.equal(yt.gwYtCharCount("가 나\n다"), 3);
  assert.equal(yt.gwYtSpeechSeconds("가".repeat(330)), 60);
});
