// helper/naver-fill.js 만들기 — 이 확장의 네이버 채우기(content-naver.js)를 그대로 감싸 self.__gwNaver(msg) 로 부른다
// 웹 [네이버 블로그에 채우기] 일감을 helper-naver.js 가 이걸로 채운다. content-naver.js 를 고치면 이걸 다시 돌린다:
//   node chrome-extension/gongsilwriter30/helper/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "content-naver.js"), "utf8");
const out = `/* 자동으로 만든 파일 — 고치지 마세요. 원본: content-naver.js (helper/build.mjs) */
(() => {
  if (self.__gwNaver) return;
  const listeners = [];
  const chrome = { runtime: { onMessage: { addListener: (fn) => listeners.push(fn) } } };
  (function (chrome) {
${src}
  })(chrome);
  self.__gwNaver = (msg) => new Promise((resolve) => {
    let answered = false;
    const done = (v) => { if (!answered) { answered = true; resolve(v); } };
    for (const fn of listeners) fn(msg, {}, done);
    setTimeout(() => done({ ok: false, error: "응답 없음" }), 240000);
  });
})();
`;
writeFileSync(join(here, "naver-fill.js"), out);
console.log("naver-fill.js", out.length);
