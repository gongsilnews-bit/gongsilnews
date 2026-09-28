/* eslint-disable @typescript-eslint/no-require-imports */
/* 한 작성기에서 일반 매물과 경매·공매 물건을 함께 쓴다 — saleKind 로 지시문이 갈리는지 본다 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* prompt.js 는 작업창 전역 스크립트라 module.exports 가 없다 — 함수만 꺼내 쓴다 */
const load = (file, names) =>
  new Function(`${fs.readFileSync(path.join(__dirname, "..", "shared", file), "utf8")}\nreturn { ${names.join(", ")} };`)();
const P = load("prompt.js", ["gwBuildPrompt", "gwBuildRevisePrompt", "gwBuildImagePrompt", "gwIsAuction"]);
const B = require("../shared/blog-prompt.js");
const N = require("../shared/naver-blog.js");

const listing = { title: "논현동 빌라", priceText: "매매 50억", fields: [{ label: "소재지", value: "서울 강남구 논현동" }] };
const auction = {
  saleKind: "공매",
  title: "역삼동 오피스텔",
  priceText: "최저입찰가 291만원",
  fields: [
    { label: "소재지(지번)", value: "서울 강남구 역삼동" },
    { label: "최저입찰가", value: "2,910,000원 (291만원)" },
    { label: "관리번호", value: "2024-01234-001" },
  ],
};

test("saleKind 가 있으면 경매·공매 물건이다", () => {
  assert.equal(P.gwIsAuction(listing), false);
  assert.equal(P.gwIsAuction(auction), true);
  assert.equal(P.gwIsAuction(null), false);
});

test("기사 프롬프트: 일반 매물은 [공실열람 보도], 경매·공매는 [공실열람 공매]", () => {
  const normal = P.gwBuildPrompt(listing, {});
  assert.ok(normal.includes("[공실열람 보도]"));
  assert.ok(normal.includes("[매물 정보 — 확인된 사실]"));
  assert.ok(!normal.includes("낙찰가"));

  const sale = P.gwBuildPrompt(auction, { kind: "summary" });
  assert.ok(sale.includes("[공실열람 공매]"));
  assert.ok(sale.includes("공매(온비드) 물건"));
  assert.ok(sale.includes("[물건 정보 — 확인된 사실]"));
  assert.ok(sale.includes("1) 핵심 가격 조건"), "경매용 단락 요약 부제");
  assert.ok(sale.includes("■ 소제목"), "단락별 요약 규칙은 공통");
});

test("수정 프롬프트는 물건 종류에 맞는 지킬 것을 넣는다", () => {
  assert.ok(P.gwBuildRevisePrompt("짧게", listing).includes("[매물 정보]에 있던 매물 조건"));
  assert.ok(P.gwBuildRevisePrompt("짧게", auction).includes("감정가·최저입찰가"));
});

test("이미지 프롬프트는 경매 물건의 지번 소재지를 쓴다", () => {
  const prompt = P.gwBuildImagePrompt(auction, { title: "t", body: "b" }, {});
  assert.ok(prompt.includes("[확인된 물건 사실]"));
  assert.ok(prompt.includes("- 위치: 서울 강남구 역삼동"));
});

test("블로그: 경매·공매 물건은 경매용 스타일과 지시문을 쓴다", () => {
  assert.equal(B.gwBlogStyles(listing).listing.label, "기본 매물소개형");
  assert.equal(B.gwBlogStyles(auction).listing.label, "기본 물건소개형");
  assert.deepEqual(Object.keys(B.gwBlogStyles(listing)), Object.keys(B.gwBlogStyles(auction)));
  const prompt = B.gwBuildBlogPrompt({ article: { title: "t", body: "b" }, vacancy: auction }, { style: "report" });
  assert.ok(prompt.includes("부동산 경매·공매 정보"));
  assert.ok(prompt.includes("3회 유찰된 논현동 건물"));
  assert.ok(B.gwBuildBlogRevisePrompt("짧게", auction).includes("경매·공매 물건이 나왔다"));
  assert.ok(B.gwBuildBlogRevisePrompt("짧게", listing).includes("공실뉴스에 이런 매물이 나왔다"));
});

test("네이버 블로그: 경매·공매 물건은 물건표·출처가 경매용이다", () => {
  const listingInfo = { saleKind: "공매", caseLabel: "관리번호", caseNo: "2024-01234-001", agency: "한국자산관리공사", capturedAt: "2026-09-28" };
  const html = N.buildNaverBlocks("요약.\n■ 가격\n본문", [], { design: "news", vacancy: auction, listing: listingInfo })
    .map((block) => block.html || "").join("");
  assert.ok(html.includes("[물건 정보]"));
  assert.ok(html.includes("[물건 정보 출처]"));
  assert.ok(html.includes("관리번호 2024-01234-001 | 집행기관 한국자산관리공사"));
  assert.ok(!html.includes("중개사무소"));
  assert.deepEqual(N.listingProblems(null, true), ["경매·공매 물건 정보"]);
  assert.deepEqual(N.listingProblems(listingInfo, true), []);
  assert.ok(N.designHint("basic", true).includes("물건표"));
  assert.ok(N.designHint("basic", false).includes("매물표"));
});
