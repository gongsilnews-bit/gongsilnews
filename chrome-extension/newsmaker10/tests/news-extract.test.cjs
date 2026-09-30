/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

const { decodeHtml, gwNewsExtract, MAX_BODY } = require("../shared/news-extract.js");

test("EUC-KR 언론사 페이지를 한글로 읽는다 (Content-Type 또는 meta charset)", () => {
  // "뉴스" 를 EUC-KR 로 쓴 바이트
  const euckr = Uint8Array.from([0xb4, 0xba, 0xbd, 0xba]);
  assert.equal(decodeHtml(euckr.buffer, "text/html; charset=EUC-KR"), "뉴스");
  const withMeta = Buffer.concat([Buffer.from('<meta charset="ks_c_5601-1987">'), Buffer.from(euckr)]);
  assert.ok(decodeHtml(withMeta.buffer.slice(withMeta.byteOffset, withMeta.byteOffset + withMeta.length), "").endsWith("뉴스"));
});

test("charset 이 없으면 UTF-8 로 읽는다", () => {
  const utf8 = Buffer.from("<p>공실뉴스</p>", "utf8");
  assert.equal(decodeHtml(utf8.buffer.slice(utf8.byteOffset, utf8.byteOffset + utf8.length), "text/html"), "<p>공실뉴스</p>");
});

test("문서를 읽다 오류가 나도 던지지 않고 이유를 돌려준다", () => {
  const broken = { querySelector: () => { throw new Error("boom"); }, location: { href: "https://a.com" } };
  const result = gwNewsExtract(broken, "https://a.com");
  assert.equal(result.ok, false);
  assert.ok(result.reason.includes("boom"));
  assert.ok(MAX_BODY >= 4000);
});
