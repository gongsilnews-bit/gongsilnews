/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

/* 작업창에서는 sections.js 가 prompt.js 보다 먼저 불린다 */
Object.assign(globalThis, require("../shared/sections.js"));
const p = require("../shared/prompt.js");

const newsSource = {
  mode: "news",
  news: {
    title: "내년부터 청약 가점 기준 바뀐다",
    publisher: "연합뉴스",
    publishedAt: "2026-09-28T09:00:00+09:00",
    url: "https://www.yna.co.kr/view/AKR2026",
    body: "국토교통부는 28일 청약 가점 기준을 2027년 1월부터 바꾼다고 밝혔다.\n\n부양가족 점수 상한이 35점에서 40점으로 오른다.",
    truncated: false,
  },
  topic: { subject: "", memo: "" },
  angle: "",
  section1: "자유",
  section2: "",
};

const topicSource = {
  mode: "topic",
  news: null,
  topic: { subject: "전세 계약 전 꼭 확인할 3가지", memo: "확정일자는 주민센터에서 받는다." },
  angle: "20~30대 세입자 관점",
  section1: "부동산·경제",
  section2: "세무/법률/기타",
};

test("소재 준비 여부 — 뉴스는 제목·본문, 주제는 주제 글자가 있어야 한다", () => {
  assert.equal(p.gwSourceReady(newsSource), true);
  assert.equal(p.gwSourceReady(topicSource), true);
  assert.equal(p.gwSourceReady({ mode: "news", news: null }), false);
  assert.equal(p.gwSourceReady({ mode: "topic", topic: { subject: "   " } }), false);
  assert.equal(p.gwSourceReady(null), false);
});

test("뉴스 기사 프롬프트는 원문 사실·새로 쓰기(저작권)·출처 표기를 요구한다", () => {
  const prompt = p.gwBuildPrompt(newsSource, { kind: "news", length: "normal" });
  assert.ok(prompt.includes("- 언론사: 연합뉴스"));
  assert.ok(prompt.includes("- 원문 제목: 내년부터 청약 가점 기준 바뀐다"));
  assert.ok(prompt.includes("- 보도일: 2026년 9월 28일"));
  assert.ok(prompt.includes("부양가족 점수 상한이 35점에서 40점으로 오른다."));
  assert.ok(prompt.includes("【새로 쓰기 — 저작권 원칙】"));
  assert.ok(prompt.includes("10어절"));
  assert.ok(prompt.includes('"연합뉴스 보도에 따르면"'));
  assert.ok(prompt.includes("(참고: 연합뉴스 보도)"));
  assert.ok(prompt.includes("1,400~1,800자"));
  assert.ok(!prompt.includes("[참고 메모"), "뉴스 프롬프트에 주제 지시가 섞이지 않는다");
});

test("자유 카테고리면 섹션 목록 전체를 주고 AI 가 고르게 한다", () => {
  const prompt = p.gwBuildPrompt(newsSource, {});
  assert.ok(prompt.includes("- 부동산·경제: 부동산정책/정치 / 경제/재테크/주식 / 세무/법률/기타"));
  assert.ok(prompt.includes("- 라이프·오피니언: 인물/인터뷰 / 중개실무/인테리어Tip / 맛집/여행/건강 / 스포츠/연예/기타"));
  assert.ok(!prompt.includes("공실뉴스: 아파트"), "매물 전용 섹션은 고를 수 없다");
  assert.ok(prompt.indexOf('"section1"') < prompt.indexOf('"title"'), "JSON 에서 섹션이 제목보다 앞");
});

test("주제 기사 프롬프트는 메모·추가 요청·고른 섹션을 넣고 지어내기를 막는다", () => {
  const prompt = p.gwBuildPrompt(topicSource, { kind: "summary", length: "short" });
  assert.ok(prompt.includes("전세 계약 전 꼭 확인할 3가지"));
  assert.ok(prompt.includes("확정일자는 주민센터에서 받는다."));
  assert.ok(prompt.includes("20~30대 세입자 관점"));
  assert.ok(prompt.includes("[공실뉴스 섹션] 부동산·경제 > 세무/법률/기타"));
  assert.ok(prompt.includes('section2 에는 "세무/법률/기타"'));
  assert.ok(prompt.includes("실재하지 않는 인물·전문가·기관·업체·설문조사·통계를 만들지 마십시오"));
  assert.ok(prompt.includes("가정한 사례임을 분명히"));
  assert.ok(prompt.includes('"■ 소제목"'));
  assert.ok(prompt.includes("700~1,000자"));
  assert.ok(!prompt.includes("저작권 원칙"), "주제 프롬프트에 뉴스 지시가 섞이지 않는다");
});

test("1차만 골랐으면 2차는 그 1차 안에서 AI 가 고른다", () => {
  const prompt = p.gwBuildPrompt({ ...topicSource, section1: "AI마케팅", section2: "" }, {});
  assert.ok(prompt.includes("AI/NEWS / 부동산유튜브/블로그 / 공실/임대관리"));
  assert.ok(prompt.includes('section1 에는 "AI마케팅"'));
});

test("메모가 없는 주제는 확정된 일반 지식으로만 쓰게 한다", () => {
  const prompt = p.gwBuildPrompt({ ...topicSource, topic: { subject: "이사 체크리스트", memo: "" } }, {});
  assert.ok(prompt.includes("없음 — 널리 확정된 일반 지식으로만 쓸 것"));
});

test("수정 요청은 소재에 맞는 지킬 것과 같은 JSON 모양을 요구한다", () => {
  const news = p.gwBuildRevisePrompt("더 짧게", newsSource);
  assert.ok(news.includes("요청: 더 짧게"));
  assert.ok(news.includes("연합뉴스 보도에 따르면"));
  assert.ok(news.includes('"section1"'));
  const topic = p.gwBuildRevisePrompt("쉽게", topicSource);
  assert.ok(topic.includes("[참고 메모]의 사실은 바꾸지 말고"));
});

test("이미지 프롬프트는 스타일·요청을 반영하고 원문 사진 흉내를 막는다", () => {
  const article = { title: "청약 가점 기준 바뀐다", body: "부양가족 점수가 오른다." };
  const prompt = p.gwBuildImagePrompt(newsSource, article, { style: "life", request: "" });
  assert.ok(prompt.includes("[선택한 스타일] 생활 현장"));
  assert.ok(prompt.includes("부양가족 점수가 오른다."));
  assert.ok(prompt.includes("뉴스 원문 사진을 흉내 내거나 베끼지 말고"));
  assert.ok(prompt.includes("이미지 안에 글자, 숫자, 로고, 워터마크를 넣지 말 것"));
  const chart = p.gwBuildImagePrompt(newsSource, article, { style: "infographic", request: "점수 변화" });
  assert.ok(chart.includes("점수 변화"));
  assert.ok(chart.includes("짧은 항목명만"));
  assert.deepEqual(Object.keys(p.GW_IMAGE_STYLE), ["auto", "news", "life", "city", "animation", "infographic"]);
});

test("AI 추천 스타일이면 다섯 스타일 목록을 주고 본문에 맞는 것을 AI 가 고르게 한다", () => {
  const article = { title: "청약 가점 기준 바뀐다", body: "부양가족 점수가 오른다." };
  const prompt = p.gwBuildImagePrompt(newsSource, article, { style: "auto" });
  assert.ok(prompt.includes("기사 본문 내용에 가장 잘 맞는 것 하나를 스스로 고르십시오"));
  ["보도 실사", "생활 현장", "도시·건물", "애니메이션 일러스트", "통계 도표·인포그래픽"].forEach((label) => assert.ok(prompt.includes(`- ${label}:`), label));
  assert.ok(!prompt.includes("[선택한 스타일]"));
});

test("자동 대표 이미지 프롬프트는 기사 전체를 보여 주는 대표 장면을 요구한다", () => {
  const article = { title: "청약 가점 기준 바뀐다", body: "부양가족 점수가 오른다." };
  const prompt = p.gwBuildImagePrompt(newsSource, article, { style: "auto", cover: true });
  assert.ok(prompt.startsWith("위 기사에 넣을 대표 이미지 1장을"));
  assert.ok(prompt.includes("기사 맨 위에 들어가는 대표 이미지"));
  assert.ok(prompt.includes("부양가족 점수가 오른다."));
  assert.equal(p.gwAiImageCaption({ title: "청약 기준" }), "청약 기준 (AI 생성 이미지)");
});

test("주제의 서론·본론·결론을 순서대로 넣고, 비운 칸은 AI 가 채우게 한다", () => {
  const outlined = {
    ...topicSource,
    topic: {
      subject: "전세 계약 시 주의사항",
      intro: "전세 사기 뉴스가 늘었다",
      points: ["등기부등본 확인", "", "반환보증 가입"],
      outro: "",
      memo: "",
    },
  };
  const prompt = p.gwBuildPrompt(outlined, { kind: "news" });
  assert.ok(prompt.includes("[글 뼈대 — 사용자가 정한 순서]"));
  assert.ok(prompt.includes("- 서론: 전세 사기 뉴스가 늘었다"));
  assert.ok(prompt.includes("- 본론 1: 등기부등본 확인"));
  assert.ok(prompt.includes("- 본론 2: 반환보증 가입"), "빈 본론 칸은 건너뛴다");
  assert.ok(prompt.includes("- 결론: (비워 둠 — 주제에 맞게 직접 채울 것)"));
  assert.ok(prompt.includes("서론 → 본론 1~2 → 결론"));
  assert.ok(!prompt.includes("■ 소제목\" 하나로 삼으십시오"), "뉴스기사형이면 소제목을 만들지 않는다");

  const summary = p.gwBuildPrompt(outlined, { kind: "summary" });
  assert.ok(summary.includes('본론 2개를 각각 "■ 소제목" 하나로 삼으십시오'));
});

test("글 뼈대를 하나도 적지 않으면 뼈대 지시를 넣지 않는다", () => {
  const prompt = p.gwBuildPrompt({ ...topicSource, topic: { subject: "이사 체크리스트", intro: "", points: ["", "", ""], outro: "" } }, {});
  assert.ok(!prompt.includes("[글 뼈대"));
  assert.ok(!prompt.includes("【글 뼈대】"));
  assert.equal(p.gwHasOutline({ points: ["", " "] }), false);
});

test("소재 이름과 AI 이미지 설명글", () => {
  assert.equal(p.gwSourceLabel(newsSource), "[연합뉴스] 내년부터 청약 가점 기준 바뀐다");
  assert.equal(p.gwSourceLabel(topicSource), "전세 계약 전 꼭 확인할 3가지");
  assert.equal(p.gwNewsDate("2026.09.29. 오후 1:48"), "2026.09.29. 오후 1:48", "못 읽는 날짜는 그대로");
});
