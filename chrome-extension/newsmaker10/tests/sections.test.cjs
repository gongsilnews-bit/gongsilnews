/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const s = require("../shared/sections.js");

test("1·2차 섹션 이름이 공실뉴스 기사쓰기 폼의 option 값과 글자까지 같다", () => {
  const formPath = path.join(__dirname, "..", "..", "..", "src", "components", "admin", "NewsWriteForm.tsx");
  const form = fs.readFileSync(formPath, "utf8");
  for (const first of s.gwSectionNames()) {
    assert.ok(form.includes(`value="${first}"`), `1차 ${first}`);
    for (const second of s.gwSubSectionNames(first)) {
      assert.ok(form.includes(`value="${second}"`), `2차 ${first} > ${second}`);
    }
  }
});

test("매물 전용 공실뉴스 섹션은 빼고 3개 1차 섹션만 둔다", () => {
  assert.deepEqual(s.gwSectionNames(), ["부동산·경제", "AI마케팅", "라이프·오피니언"]);
  assert.equal(s.GW_SECTION_FREE, "자유");
  assert.deepEqual(s.gwSubSectionNames("자유"), []);
});

test("AI 가 쓴 섹션은 가운뎃점·공백이 달라도 폼 이름으로 맞춘다", () => {
  assert.deepEqual(s.gwNormalizeSection("부동산 경제", "세무 / 법률 / 기타"), { section1: "부동산·경제", section2: "세무/법률/기타" });
  assert.deepEqual(s.gwNormalizeSection("라이프ㆍ오피니언", "맛집/여행/건강"), { section1: "라이프·오피니언", section2: "맛집/여행/건강" });
  assert.deepEqual(s.gwNormalizeSection("ai마케팅", "없는섹션"), { section1: "AI마케팅", section2: "" });
  assert.deepEqual(s.gwNormalizeSection("공실뉴스", "아파트/오피스텔"), { section1: "", section2: "" });
});

test("1·2차 조합 검사", () => {
  assert.equal(s.gwIsValidSection("AI마케팅", "AI/NEWS"), true);
  assert.equal(s.gwIsValidSection("AI마케팅", ""), true);
  assert.equal(s.gwIsValidSection("AI마케팅", "맛집/여행/건강"), false);
  assert.equal(s.gwIsValidSection("자유", ""), false);
});
