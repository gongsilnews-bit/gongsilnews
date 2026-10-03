const test = require("node:test");
const assert = require("node:assert/strict");

/* 작업창에서는 앞선 script 로 들어오는 전역 — 테스트에서는 직접 넣는다 */
Object.assign(globalThis, require("../shared/blog-prompt.js"));
require("../shared/youtube-json.js");
require("../shared/naver-blog.js");

const {
  GW_SNS_CHANNELS,
  gwBuildSnsPrompt,
  gwBuildSnsRevisePrompt,
  gwSnsParse,
  gwSnsCompose,
  gwSnsPickMedia,
  gwSnsCanLead,
} = require("../shared/sns-prompt.js");

const source = {
  article: { title: "[공실열람 보도] 양재역 36평 사무실", subtitles: [], body: "첫 문단.\n\n둘째 문단." },
  vacancy: { title: "한영빌딩 5층", priceText: "월세 1억/320만", fields: [{ label: "소재지", value: "서울 서초구 양재동" }] },
};

const agencyListing = {
  capturedAt: "2026-10-03T00:00:00Z",
  owner: { type: "agency", name: "공실공인중개사사무소", ceo: "홍길동", regNo: "11650-2026-00001", address: "서울 서초구 양재동 1", phone: "02-000-0000" },
};

test("세 플랫폼을 한 번에 요청하고, 연락처·링크는 AI 에게 쓰지 말라고 한다", () => {
  const prompt = gwBuildSnsPrompt(source);
  for (const key of ["[페이스북 — facebook]", "[인스타그램 — instagram]", "[스레드 — threads]"]) assert.ok(prompt.includes(key), key);
  assert.ok(prompt.includes("월세 1억/320만"));
  assert.ok(prompt.includes("중개사무소 이름·연락처·링크"));
  assert.ok(prompt.includes("문의하세요"));
});

test("경매·공매 물건이면 '물건'이라고 부른다", () => {
  const prompt = gwBuildSnsPrompt({ ...source, vacancy: { ...source.vacancy, saleKind: "경매" } });
  assert.ok(prompt.includes("확인된 물건 정보"));
});

test("수정 요청은 고친 플랫폼 하나만 받는다", () => {
  const prompt = gwBuildSnsRevisePrompt("instagram", "더 짧게");
  assert.ok(prompt.includes("[인스타그램] 글만"));
  assert.ok(prompt.includes('"instagram"'));
  assert.ok(!prompt.includes('"threads"'));
});

test("AI 답변을 편집용 모양으로 바꾸고, 줄바꿈·꼬리 쉼표가 깨진 JSON 도 읽는다", () => {
  const raw = '```json\n{"facebook":{"paragraphs":["결론 문단","둘째"],"hashtags":["#양재역사무실","서초구 사무실"]},' +
    '"instagram":{"lines":["양재역 36평 📍","📐 전용 119㎡"],"hashtags":["양재역","양재역"]},' +
    '"threads":{"posts":["첫 글\n이어서",],"topic":"#양재역사무실"}}\n```';
  const parsed = gwSnsParse(raw);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.repaired, true);
  assert.equal(parsed.posts.facebook.body, "결론 문단\n\n둘째");
  assert.deepEqual(parsed.posts.facebook.hashtags, ["양재역사무실", "서초구사무실"]);
  assert.deepEqual(parsed.posts.instagram.hashtags, ["양재역"]);
  assert.equal(parsed.posts.threads.topic, "양재역사무실");
});

test("수정 답변처럼 한 플랫폼만 와도 읽는다", () => {
  const parsed = gwSnsParse('{"threads":{"posts":["짧게 고친 글"],"topic":"양재"}}');
  assert.equal(parsed.ok, true);
  assert.deepEqual(Object.keys(parsed.posts), ["threads"]);
});

test("페이스북 글 끝에 링크·출처·해시태그를 코드가 붙인다", () => {
  const out = gwSnsCompose("facebook", { body: "본문", hashtags: ["양재역"] }, { listing: agencyListing, url: "https://www.gongsilnews.com/gongsil?id=1", noun: "매물" });
  assert.ok(out.text.startsWith("본문\n\n▶ 공실뉴스에서 매물 자세히 보기\nhttps://www.gongsilnews.com/gongsil?id=1"));
  assert.ok(out.text.includes("[매물 정보 출처]"));
  assert.ok(out.text.includes("등록번호 11650-2026-00001"));
  assert.ok(out.text.endsWith("#양재역"));
});

test("인스타그램은 링크 대신 프로필 링크 안내를 붙인다", () => {
  const out = gwSnsCompose("instagram", { body: "훅\n📍 양재동", hashtags: [] }, { listing: agencyListing, url: "https://x", noun: "매물" });
  assert.ok(out.text.includes("자세한 매물 정보는 프로필 링크 → 공실뉴스"));
  assert.ok(!out.text.includes("https://x"));
});

test("스레드는 500자를 넘기면 링크·출처를 새 글로 나눈다", () => {
  const short = gwSnsCompose("threads", { posts: ["짧은 글"], topic: "양재역" }, { listing: agencyListing, url: "https://x", noun: "매물" });
  assert.equal(short.posts.length, 1);
  assert.ok(short.posts[0].includes("#양재역"));
  const long = gwSnsCompose("threads", { posts: ["가".repeat(480)], topic: "" }, { listing: agencyListing, url: "https://x", noun: "매물" });
  assert.equal(long.posts.length, 2);
  assert.ok(long.posts.every((post) => post.length <= GW_SNS_CHANNELS.threads.maxChars));
});

test("사진은 실제 사진(대표 먼저) → 지도(인스타만) → AI 순으로 장수만큼 고른다", () => {
  const media = [
    { kind: "ai", url: "ai.png" },
    { kind: "proof", url: "proof.png" },
    { kind: "photo", url: "p1.jpg" },
    { kind: "photo", url: "p2.jpg", isCover: true },
    { kind: "map", url: "map.png" },
    ...Array.from({ length: 10 }, (_, i) => ({ kind: "photo", url: `x${i}.jpg` })),
  ];
  const ig = gwSnsPickMedia("instagram", media);
  assert.equal(ig.length, 10);
  assert.equal(ig[0].url, "p2.jpg");
  assert.ok(!ig.some((item) => item.url === "proof.png"));
  const fb = gwSnsPickMedia("facebook", media);
  assert.equal(fb.length, 4);
  assert.ok(!fb.some((item) => item.kind === "map"));
  const few = gwSnsPickMedia("instagram", [{ kind: "ai", url: "ai.png" }, { kind: "map", url: "m.png" }, { kind: "photo", url: "p.jpg" }]);
  assert.deepEqual(few.map((item) => item.url), ["p.jpg", "m.png", "ai.png"]);
});

test("실제 사진이 있으면 AI 이미지를 대표(1번)로 둘 수 없다", () => {
  assert.equal(gwSnsCanLead([{ ai: false }, { ai: true }], 1), false);
  assert.equal(gwSnsCanLead([{ ai: true }, { ai: true }], 1), true);
  assert.equal(gwSnsCanLead([{ ai: false }, { ai: false }], 1), true);
});

test("AI 이미지가 올라갈 사진에 있으면 플랫폼별 AI 레이블 안내", () => {
  const { gwSnsAiLabelNote } = require("../shared/sns-prompt.js");
  assert.equal(gwSnsAiLabelNote("facebook", [{ ai: false }, { ai: false }]), "");
  assert.ok(gwSnsAiLabelNote("facebook", [{ ai: false }, { ai: true }]).includes("[AI 레이블]"));
  assert.ok(gwSnsAiLabelNote("instagram", [{ ai: true }]).includes("[고급 설정]"));
  /* 장수 제한 밖(올라가지 않는) AI 이미지는 세지 않는다 */
  const five = [{ ai: false }, { ai: false }, { ai: false }, { ai: false }, { ai: true }];
  assert.equal(gwSnsAiLabelNote("facebook", five), "");
});
