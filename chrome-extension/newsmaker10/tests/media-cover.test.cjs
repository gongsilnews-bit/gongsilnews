const test = require("node:test");
const assert = require("node:assert/strict");
const mediaCover = require("../shared/media-cover.js");

const flags = (items) => items.map((item) => item.isCover);
const ids = (items) => items.map((item) => item.id);

test("예전 저장 데이터는 첫 사진을 대표로 보정한다", () => {
  const result = mediaCover.normalize([{ id: "a" }, { id: "b" }]);
  assert.deepEqual(flags(result), [true, false]);
});

test("대표가 여러 장이면 첫 대표만 남긴다", () => {
  const result = mediaCover.normalize([
    { id: "a", isCover: true },
    { id: "b", isCover: true },
  ]);
  assert.deepEqual(flags(result), [true, false]);
});

test("원하는 사진 한 장만 대표로 선택한다", () => {
  const result = mediaCover.select([{ id: "a" }, { id: "b" }, { id: "c" }], 2);
  assert.deepEqual(flags(result), [false, false, true]);
  assert.equal(mediaCover.indexOf(result), 2);
});

test("전송할 때 대표를 첫 순서로 옮기고 나머지 순서는 보존한다", () => {
  const result = mediaCover.coverFirst([
    { id: "a", isCover: false },
    { id: "b", isCover: false },
    { id: "c", isCover: true },
    { id: "d", isCover: false },
  ]);
  assert.deepEqual(ids(result), ["c", "a", "b", "d"]);
  assert.deepEqual(flags(result), [true, false, false, false]);
});

test("잘못된 대표 번호는 기존 대표를 바꾸지 않는다", () => {
  const result = mediaCover.select([
    { id: "a", isCover: false },
    { id: "b", isCover: true },
  ], 99);
  assert.deepEqual(flags(result), [false, true]);
});

test("대표 사진을 삭제하면 남은 첫 사진이 새 대표가 된다", () => {
  const selected = mediaCover.select([{ id: "a" }, { id: "b" }, { id: "c" }], 1);
  const result = mediaCover.normalize(selected.filter((item) => item.id !== "b"));
  assert.deepEqual(ids(result), ["a", "c"]);
  assert.deepEqual(flags(result), [true, false]);
});

test("사진이 없어도 안전하게 처리한다", () => {
  assert.deepEqual(mediaCover.normalize(null), []);
  assert.deepEqual(mediaCover.coverFirst([]), []);
  assert.equal(mediaCover.indexOf([]), -1);
});
