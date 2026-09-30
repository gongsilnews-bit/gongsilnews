const { chromium } = require('playwright');
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: {
      width: 1920,
      height: 1080,
    },
    recordVideo: {
      dir: './output/',
      size: {
        width: 1920,
        height: 1080,
      },
    },
  });

  const page = await context.newPage();
  const htmlPath = path.resolve('./scenes/scene01.html');
  const outputPath = path.resolve(
    './output',
    `${path.parse(htmlPath).name}.webm`,
  );

  await page.goto(pathToFileURL(htmlPath).href);

  // 화면 클릭으로 HTML 애니메이션 시작
  await page.locator('#app').click();

  // 장면 길이
  await page.waitForTimeout(10_000);

  const video = page.video();

  await page.close();
  await context.close();

  const webmPath = await video.path();

  await fs.rm(outputPath, { force: true });
  await fs.rename(webmPath, outputPath);

  await browser.close();

  console.log('HTML 녹화 완료');
  console.log(outputPath);
})();
