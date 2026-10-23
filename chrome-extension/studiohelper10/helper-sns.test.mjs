import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.route("https://www.facebook.com/**", (route) => route.fulfill({
  contentType: "text/html",
  body: "<!doctype html><html><body></body></html>",
}));
await page.goto("https://www.facebook.com/");
await page.evaluate(() => {
  window.__GS_HELPER_TEST__ = {};
  window.chrome = {
    runtime: {
      lastError: null,
      sendMessage(_message, callback) { callback(null); },
    },
  };
});
await page.addScriptTag({ path: join(here, "helper-sns.js") });

const css = `<style>
  [data-visible] { display:block; width:420px; min-height:32px; }
  [role=dialog] { display:block; width:520px; min-height:160px; }
  [hidden] { display:none !important; }
</style>`;

async function selectedId(html, names = ["무슨 생각을 하고 계신가요", "What's on your mind"]) {
  await page.evaluate(({ cssText, body }) => {
    document.head.innerHTML = cssText;
    document.body.innerHTML = body;
  }, { cssText: css, body: html });
  return page.evaluate((wanted) => window.__GS_HELPER_TEST__.findBox(wanted)?.id || null, names);
}

assert.equal(await selectedId(`
  <div role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <div id="actual" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"
      aria-label="공실뉴스님, 무슨 생각을 하고 계신가요?"></div>
  </div>`), "actual", "현재 Facebook Lexical root를 선택해야 한다");

assert.equal(await selectedId(`
  <div hidden><div id="stale" data-visible contenteditable="true" role="textbox"
    aria-label="무슨 생각을 하고 계신가요?"></div></div>
  <div role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <div id="actual" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"></div>
  </div>`), "actual", "숨은 이전 편집기를 제외해야 한다");

assert.equal(await selectedId(`
  <div id="old-dialog" role="dialog" aria-label="설정">
    <div id="old" data-visible contenteditable="true" role="textbox" style="width:900px"></div>
  </div>
  <div id="new-dialog" role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <div id="actual" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"></div>
  </div>`), "actual", "폭이 아니라 현재 게시물 dialog를 우선해야 한다");

assert.equal(await selectedId(`
  <div role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <div role="textbox" aria-label="무슨 생각을 하고 계신가요?">
      <div id="actual" data-visible data-lexical-editor="true" contenteditable="true"></div>
    </div>
  </div>`), "actual", "role=textbox wrapper를 실제 editable child로 보정해야 한다");

assert.equal(await selectedId(`
  <div role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <span id="prompt">무슨 생각을 하고 계신가요?</span>
    <div id="actual" data-visible contenteditable="plaintext-only" role="textbox" aria-labelledby="prompt"></div>
  </div>`), "actual", "plaintext-only와 aria-labelledby를 지원해야 한다");

assert.equal(await selectedId(`
  <div role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <div id="actual" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"></div>
  </div>
  <div role="dialog" aria-label="게시물 만들기">
    <div id="stale" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"></div>
  </div>`), "actual", "DOM 뒤에 남은 stale dialog보다 aria-modal dialog를 우선해야 한다");

assert.equal(await selectedId(`
  <div id="background" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"
    aria-label="무슨 생각을 하고 계신가요?"></div>
  <div role="dialog" aria-modal="true" aria-label="게시물 만들기"><div data-visible>업로드 중</div></div>`), null,
"작성창 editor가 mount되기 전에는 배경 editor로 fallback하면 안 된다");

assert.equal(await selectedId(`
  <div role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <textarea id="alt" data-visible aria-label="대체 텍스트"></textarea>
  </div>`), null, "대체 텍스트 칸을 게시물 본문으로 고르면 안 된다");

assert.equal(await selectedId(`
  <div role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <div id="wrapper" data-visible contenteditable="true" role="textbox" aria-label="무슨 생각을 하고 계신가요?">
      <div id="actual" data-visible data-lexical-editor="true" contenteditable="true"></div>
    </div>
  </div>`), "actual", "contenteditable wrapper 안에서도 실제 Lexical root를 골라야 한다");

await page.evaluate(() => {
  document.head.innerHTML = `<style>[data-visible]{display:block;width:420px;min-height:32px}</style>`;
  document.body.innerHTML = `<div id="actual" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"></div>`;
  const editor = document.getElementById("actual");
  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    editor.textContent = event.clipboardData.getData("text/plain");
  });
});
assert.equal(await page.evaluate(() => window.__GS_HELPER_TEST__.insertText(
  document.getElementById("actual"),
  "첫 줄\n둘째 줄",
)), true, "Lexical paste 경로로 여러 줄 글을 넣어야 한다");
assert.equal(await page.locator("#actual").textContent(), "첫 줄\n둘째 줄");

await page.evaluate(() => {
  document.head.innerHTML = `<style>[data-visible]{display:block;width:420px;min-height:32px}</style>`;
  document.body.innerHTML = `<div id="partial" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"></div>`;
  const editor = document.getElementById("partial");
  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    editor.textContent = "첫 줄";
  });
});
assert.equal(await page.evaluate(() => window.__GS_HELPER_TEST__.insertText(
  document.getElementById("partial"),
  "첫 줄\n둘째 줄",
)), false, "부분 paste 뒤에는 전체 글을 다시 덧붙이지 않아야 한다");
assert.equal(await page.locator("#partial").textContent(), "첫 줄");

await page.evaluate(() => {
  document.head.innerHTML = `<style>
    [data-visible]{display:block;width:420px;min-height:32px}
    [role=dialog]{display:block;width:520px;min-height:160px}
  </style>`;
  document.body.innerHTML = `<div id="composer" role="dialog" aria-modal="true" aria-label="게시물 만들기">
    <div id="old" data-visible data-lexical-editor="true" contenteditable="true" role="textbox"></div>
  </div>`;
  const old = document.getElementById("old");
  old.addEventListener("paste", (event) => {
    event.preventDefault();
    old.style.display = "none";
    const replacement = document.createElement("div");
    replacement.id = "replacement";
    replacement.setAttribute("data-visible", "");
    replacement.setAttribute("data-lexical-editor", "true");
    replacement.setAttribute("contenteditable", "true");
    replacement.setAttribute("role", "textbox");
    document.getElementById("composer").appendChild(replacement);
  });
});
assert.equal(await page.evaluate(() => window.__GS_HELPER_TEST__.insertText(
  document.getElementById("old"),
  "교체 뒤 입력",
)), true, "paste 중 root가 교체되면 새 root를 다시 찾아야 한다");
assert.equal(await page.locator("#replacement").textContent(), "교체 뒤 입력");

await browser.close();
console.log("helper-sns: 12 tests passed");
