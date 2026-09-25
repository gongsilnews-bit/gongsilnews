const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../shared/config.js"), "utf8");
const context = {
  console: { log() {} },
  location: { host: "gongsilnews.com", pathname: "/gongsil" },
};
vm.runInNewContext(`${source}\nglobalThis.__GW = GW;`, context);
const GW = context.__GW;

test("공실뉴스 보내기는 관리자 주소가 아니라 공용 기사작성 진입점으로 간다", () => {
  assert.equal(GW.writeUrl("https://gongsilnews.com"), "https://gongsilnews.com/article/write");
});

test("공실 번호는 공용 기사작성 주소에 안전하게 전달한다", () => {
  assert.equal(
    GW.writeUrl("https://gongsilnews.com", "vacancy id/한글"),
    "https://gongsilnews.com/article/write?vacancy_id=vacancy%20id%2F%ED%95%9C%EA%B8%80"
  );
});
