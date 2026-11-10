// 스마트스토어 상세페이지 굽기 — detail.html 을 폭 860px 그림으로 (전체 1장 + 칸마다 1장씩)
// 실행: node docs/smartstore-detail/render.mjs  →  docs/smartstore-detail/out/
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "out");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 1200 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(dir, "detail.html")).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(out, "00_전체.png"), fullPage: true });
const ids = await page.$$eval("section", (s) => s.map((e) => e.id));
for (const [i, id] of ids.entries()) {
  await page.locator(`#${id}`).screenshot({ path: path.join(out, `${String(i + 1).padStart(2, "0")}.png`) });
}
await browser.close();
console.log("구움:", ids.length + 1, "장 →", out);
