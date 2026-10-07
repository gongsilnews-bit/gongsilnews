// 편집 화면 미리보기(재생기 + 같은 템플릿)가 브라우저에서 제대로 재생되는지 확인 (개발 확인용).
// 개발 서버(localhost:3000)가 /reels-assets 를 내주고 있어야 한다.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/reels/try-preview.mts <jobId> <outDir>
import { chromium } from "playwright";
import { reelsAdminClient } from "../../src/lib/reels/listing";
import { buildReel } from "../../src/lib/reels/template";
import { sceneWords, type ReelScript } from "../../src/lib/reels/types";
import { getVoice, signedVoiceUrl } from "../../src/lib/reels/voice";

const [jobId, outDir] = process.argv.slice(2);
const { data: job } = await reelsAdminClient().from("reel_jobs").select("vacancy_id, script, voice").eq("id", jobId).single();
const script = job!.script as ReelScript;
const scenes = await Promise.all(
  script.scenes.map(async (s) => {
    const v = await getVoice(job!.vacancy_id, s.tts, job!.voice);
    return { id: s.id, kind: s.kind, photo: s.photo, ...sceneWords(s), highlight: s.highlight || [], sticker: s.sticker, audioSrc: (await signedVoiceUrl(v.path))!, duration: v.duration };
  }),
);
const { html, plan } = buildReel({
  facts: script.facts, agency: script.agency, scenes,
  photoSize: Object.fromEntries(script.photos.map((p) => [p.url, { w: p.w, h: p.h }])),
  photoSrc: (u) => u, assetBase: "/reels-assets/", bgmSrc: "/reels-assets/bgm/upbeat.mp3",
  previewRuntimeSrc: "/reels-assets/js/hyperframe.runtime.js",
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
const logs: string[] = [];
page.on("console", (m) => m.type() === "error" && logs.push(m.text()));
await page.goto("http://localhost:3000/reels-assets/sfx/CREDITS.md");
await page.setContent('<!doctype html><html><body style="margin:0;background:#111"><div id="box" style="width:360px;height:640px"></div></body></html>');
await page.addScriptTag({ path: "node_modules/@hyperframes/player/dist/hyperframes-player.global.js" });
await page.evaluate((src) => {
  const el = document.createElement("hyperframes-player");
  el.setAttribute("width", "1080");
  el.setAttribute("height", "1920");
  el.style.cssText = "width:360px;height:640px;display:block";
  el.setAttribute("srcdoc", src);
  (window as unknown as { pl: HTMLElement }).pl = el;
  document.getElementById("box")!.appendChild(el);
}, html);
await page.waitForFunction(() => (window as unknown as { pl: { ready: boolean } }).pl.ready, null, { timeout: 30000 });
const dur = await page.evaluate(() => (window as unknown as { pl: { duration: number } }).pl.duration);
console.log(`ready, duration ${dur} (plan ${plan.total})`);
for (const t of [2, 6, 11, 17, 22, 26]) {
  await page.evaluate((x) => (window as unknown as { pl: { seek(n: number): void } }).pl.seek(x), t);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/preview-${t}.png`, clip: { x: 0, y: 0, width: 360, height: 640 } });
}
console.log("console errors:", logs.slice(0, 5));
await browser.close();
