/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

/* 작업창에서는 prompt.js 의 gwFactLines 가 먼저 불린다 */
globalThis.gwFactLines = (v) => (v.fields || []).map((f) => `- ${f.label}: ${f.value}`).join("\n");
const yt = require("../shared/youtube-prompt.js");

const article = {
  title: "[공실열람 보도] 논현동 단독주택 매매 50억",
  subtitles: ["지하철 7호선 학동역 도보권"],
  body: "서울 강남구 논현동에 단독주택이 매물로 나왔다.\n\n대지 198㎡ 규모다.",
};
const listing = { article, vacancy: { fields: [{ label: "금액", value: "매매 50억" }] } };
const auction = {
  article: { title: "[공실열람 경매] 역삼동 오피스텔 3회 유찰", subtitles: [], body: "역삼동 오피스텔이 경매로 나왔다." },
  vacancy: {
    saleKind: "경매",
    fields: [
      { label: "감정가", value: "500,000,000원 (5억원)" },
      { label: "최저입찰가", value: "256,000,000원 (2억 5,600만원)" },
      { label: "유찰 횟수", value: "3회" },
    ],
  },
};

test("일반 매물 대본은 기사·물건 정보·길이·말투를 넣고 읽을 원고만 요청한다", () => {
  const prompt = yt.gwBuildYtScriptPrompt(listing, { videoType: "news", duration: "medium", tone: "expert" });
  assert.ok(prompt.includes("[기사 제목] [공실열람 보도] 논현동 단독주택 매매 50억"));
  assert.ok(prompt.includes("- 금액: 매매 50억"));
  assert.ok(prompt.includes("부동산 뉴스"));
  assert.ok(prompt.includes("약 2분"));
  assert.ok(prompt.includes("부동산 전문가 분석형"));
  assert.ok(prompt.includes('"narration"'));
  assert.ok(!prompt.includes('"scenes"'), "장면을 요청하지 않는다");
  assert.ok(prompt.includes("권유·호객 표현을 쓰지 마십시오"));
  assert.ok(!prompt.includes("경매"), "일반 매물 대본에는 경매 지시가 섞이지 않는다");
});

test("경매 물건이면 경매용 대본 지시문을 쓴다", () => {
  const prompt = yt.gwBuildYtScriptPrompt(auction, { videoType: "news", duration: "short", tone: "news" });
  assert.ok(prompt.includes("경매·공매 담당 유튜브 대본 작가"));
  assert.ok(prompt.includes("법원 경매 물건 정보"));
  assert.ok(prompt.includes("- 최저입찰가: 256,000,000원 (2억 5,600만원)"));
  assert.ok(prompt.includes("경매 뉴스"), "경매용 콘텐츠 유형 이름");
  assert.ok(prompt.includes("낙찰가·낙찰가율·수익률·시세 상승을 예측하지 마십시오"));
  assert.ok(prompt.includes("온비드 고객센터"));
  assert.ok(prompt.includes("입찰 일정이 자료에 없으면 날짜를 만들지 마십시오"));
  assert.ok(prompt.includes("[공실열람 경매]"));
  assert.ok(prompt.includes('"narration"'));
});

test("공매 물건은 공매(온비드)로 부른다", () => {
  const prompt = yt.gwBuildYtScriptPrompt(
    { ...auction, vacancy: { ...auction.vacancy, saleKind: "공매" } },
    { videoType: "listing" }
  );
  assert.ok(prompt.includes("공매(온비드) 물건 정보"));
  assert.ok(prompt.includes("[공실열람 공매]"));
  assert.ok(prompt.includes("물건 소개"));
});

test("콘텐츠 유형 표는 물건 종류에 맞춰 바뀌고 칸(키)은 같다", () => {
  assert.deepEqual(Object.keys(yt.gwYtVideoTypes(null)), Object.keys(yt.gwYtVideoTypes(auction.vacancy)));
  assert.equal(yt.gwYtVideoTypes(null).listing.label, "매물 소개");
  assert.equal(yt.gwYtVideoTypes(auction.vacancy).listing.label, "물건 소개");
});

test("수정 프롬프트는 고친 원고 전체를 보내고, 경매면 경매 원칙을 지키게 한다", () => {
  const full = { title: "제목", text: "직접 고친 첫 문단.\n\n둘째 문단." };
  const normal = yt.gwBuildYtRevisePrompt(full, "더 짧게", listing.vacancy);
  assert.ok(normal.includes("더 짧게"));
  assert.ok(normal.includes("직접 고친 첫 문단."));
  assert.ok(normal.includes("둘째 문단."));
  assert.ok(normal.includes("원고 전체를 빠짐없이"));
  assert.ok(normal.includes("중개사무소 연락처"));

  const forAuction = yt.gwBuildYtRevisePrompt(full, "더 짧게", auction.vacancy);
  assert.ok(forAuction.includes("낙찰가·수익 예측"));
  assert.ok(forAuction.includes("최저입찰가"));
});

test("읽는 시간은 공백 제외 글자 수로 잰다", () => {
  assert.equal(yt.gwYtCharCount("가 나 다"), 3);
  assert.equal(yt.gwYtSpeechSeconds("가".repeat(55)), 10);
});
