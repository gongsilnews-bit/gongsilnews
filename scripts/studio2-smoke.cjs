const { chromium } = require('playwright');
const fs = require('fs/promises');
const path = require('path');

const STUDIO2_URL = process.env.STUDIO2_URL || 'http://127.0.0.1:3010/marketing/studio2/';

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(STUDIO2_URL, { waitUntil: 'networkidle' });

    await page.getByPlaceholder('공실 뉴스 대본을 입력해 주세요...').fill(
      '서울 상가 공실률이 다시 상승했습니다. 금리와 대출 부담이 임대시장에 영향을 주고 있습니다.',
    );
    await page.getByRole('button', { name: '스크립트 분석 + HTML 자동 생성' }).click();
    await page.getByText('CLIP 1').waitFor();

    const htmlFrames = page.locator('iframe[title*="HTML scene"]');
    if (await htmlFrames.count() < 1) {
      throw new Error('HTML 장면 iframe이 생성되지 않았습니다.');
    }

    const headline = await htmlFrames.first().contentFrame().locator('h1').textContent();
    if (!headline?.trim()) {
      throw new Error('HTML 장면 제목이 비어 있습니다.');
    }

    await page.waitForTimeout(1_200);
    const headlineOpacity = await htmlFrames.first().contentFrame().locator('h1').evaluate(
      element => Number.parseFloat(getComputedStyle(element).opacity),
    );
    if (headlineOpacity < 0.9) {
      throw new Error(`HTML 장면 애니메이션이 완료되지 않았습니다. opacity=${headlineOpacity}`);
    }

    await page.getByRole('button', { name: '이미지', exact: true }).first().click();
    if (await htmlFrames.count() !== 1) {
      throw new Error('이미지 모드 전환이 적용되지 않았습니다.');
    }
    await page.locator('input[id^="upload-"]:not([id^="upload-replace-"])').first().setInputFiles(
      path.resolve('public/images/study/gangnam-ai-lecture-2025.png'),
    );
    await page.getByRole('button', { name: 'HTML', exact: true }).first().click();
    if (await htmlFrames.count() !== 2) {
      throw new Error('HTML 모드 전환이 적용되지 않았습니다.');
    }

    await page.getByRole('button', { name: '이미지', exact: true }).first().click();
    const saveResponse = page.waitForResponse(response => response.url().endsWith('/__studio2/workspace'));
    await page.getByTitle('현재 이미지와 HTML 장면을 marketing/studio2/workspace에 저장').click();
    if (!(await saveResponse).ok()) {
      throw new Error('VS Code 작업 폴더 저장 요청이 실패했습니다.');
    }

    const manifest = JSON.parse(await fs.readFile(
      path.resolve('marketing/studio2/workspace/project.json'),
      'utf8',
    ));
    if (manifest.scenes?.[0]?.mediaType !== 'image' || !manifest.scenes?.[0]?.imageFile) {
      throw new Error('이미지 장면이 작업 폴더에 저장되지 않았습니다.');
    }
    if (manifest.scenes?.[1]?.mediaType !== 'html' || !manifest.scenes?.[1]?.htmlFile) {
      throw new Error('HTML 장면이 작업 폴더에 저장되지 않았습니다.');
    }

    await page.waitForTimeout(1_000);

    await page.screenshot({ path: 'output/studio2-smoke.png', fullPage: true });
    console.log(`Studio2 smoke test passed: ${await htmlFrames.count()} HTML scene(s)`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
