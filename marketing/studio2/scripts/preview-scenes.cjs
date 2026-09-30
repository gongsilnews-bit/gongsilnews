/* 장면 미리보기 — workspace 의 장면마다 "애니메이션이 끝난 화면"을 PNG 로 찍는다.
   VS Code 에서 장면을 만든 AI(Claude·Codex)가 글자 잘림·겹침을 눈으로 확인하는 용도다.
   기다리지 않는다: 시계(타이머·requestAnimationFrame)를 장면 길이만큼 앞으로 돌리고 CSS 애니메이션은 끝으로 넘긴 뒤,
   모든 장면을 동시에 찍는다 — 6장면 기준 몇 초.
   결과: workspace/output/preview/scene01.png …   (특정 장면만: node scripts/preview-scenes.cjs 3 5) */
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const studioDir = path.resolve(__dirname, '..');
const workspaceDir = path.join(studioDir, 'workspace');
const scenesDir = path.join(workspaceDir, 'scenes');
const previewDir = path.join(workspaceDir, 'output', 'preview');

function videoSize(aspectRatio) {
  if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
  if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(workspaceDir, 'project.json'), 'utf8'));
  const only = process.argv.slice(2).map(Number).filter(Boolean);
  const size = videoSize(manifest.aspectRatio);
  await fs.mkdir(previewDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const problems = [];
  const lines = [];
  try {
    await Promise.all(manifest.scenes.map(async (scene, index) => {
      const number = index + 1;
      const name = `scene${String(number).padStart(2, '0')}`;
      if (only.length && !only.includes(number)) return;
      if (scene.mediaType === 'image') {
        lines[index] = `${name}: 이미지 장면 — 건너뜀`;
        return;
      }
      const htmlPath = path.join(scenesDir, scene.htmlFile);
      const page = await browser.newPage({ viewport: size });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => errors.push(`불러오기 실패: ${request.url()}`));
      page.on('request', request => {
        if (/^https?:/i.test(request.url())) errors.push(`외부 요청 금지: ${request.url()}`);
      });
      await page.clock.install();
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const hasStart = await page.evaluate(() => typeof window.startScene === 'function');
      if (!hasStart) errors.push('window.startScene 이 없습니다');
      await page.evaluate(() => window.startScene && window.startScene());
      /* 마지막 화면 = 장면 길이 직전 — 타이머·rAF 는 시계로, CSS 애니메이션은 끝으로 */
      await page.clock.runFor(Math.max(500, (Number(scene.durationMs) || 6000) - 300));
      await page.evaluate(() => document.getAnimations().forEach(animation => {
        const timing = animation.effect && animation.effect.getComputedTiming ? animation.effect.getComputedTiming() : null;
        if (timing && Number.isFinite(timing.endTime)) {
          try { animation.finish(); } catch (_) { /* 끝낼 수 없는 애니메이션은 둔다 */ }
        }
      }));
      await page.waitForTimeout(150);
      /* 화면 밖으로 넘친 글자 */
      const overflow = await page.evaluate(({ width, height }) => Array.from(document.querySelectorAll('body *'))
        .filter(node => node.children.length === 0 && node.textContent.trim())
        .filter(node => {
          const r = node.getBoundingClientRect();
          return r.width > 0 && (r.left < -1 || r.top < -1 || r.right > width + 1 || r.bottom > height + 1);
        })
        .slice(0, 5)
        .map(node => node.textContent.trim().slice(0, 30)), size);
      if (overflow.length) errors.push(`화면 밖으로 나간 글자: ${overflow.join(' / ')}`);
      /* 내용이 화면 가운데에 작게 몰려 있는지 — 큰 글자(28px 이상)와 큰 덩어리(화면의 3% 이상)만 센다.
         구석의 말머리·로고 같은 작은 글자는 빼야 실제 내용의 크기가 보인다. */
      const spread = await page.evaluate(({ width, height }) => {
        let left = width, right = 0, top = height, bottom = 0;
        Array.from(document.querySelectorAll('body *')).forEach(node => {
          if (node.id === 'app' || node.classList.contains('grid')) return;
          const style = getComputedStyle(node);
          if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') return;
          const r = node.getBoundingClientRect();
          if (r.width < 4 || r.height < 4 || r.width > width * 0.98 || r.height > height * 0.98) return;
          const isLeafText = node.children.length === 0 && node.textContent.trim();
          const bigText = isLeafText && parseFloat(style.fontSize) >= 28;
          const bigBlock = !isLeafText && (r.width * r.height) >= width * height * 0.03;
          if (!bigText && !bigBlock) return;
          left = Math.min(left, r.left); right = Math.max(right, r.right);
          top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom);
        });
        return { w: Math.max(0, right - left) / width, h: Math.max(0, bottom - top) / height };
      }, size);
      if (spread.w < 0.55 || spread.h < 0.5) errors.push(`내용이 화면 가운데에 작게 몰려 있습니다 (가로 ${Math.round(spread.w * 100)}% · 세로 ${Math.round(spread.h * 100)}%) — 가로 70%·세로 60% 이상 채우세요`);
      const file = path.join(previewDir, `${name}.png`);
      await page.screenshot({ path: file });
      await page.close();
      lines[index] = `${name}: ${file}${errors.length ? `\n  ⚠ ${errors.join('\n  ⚠ ')}` : ''}`;
      if (errors.length) problems.push(number);
    }));
  } finally {
    await browser.close();
  }
  lines.filter(Boolean).forEach(line => console.log(line));
  if (problems.length) {
    console.log(`확인이 필요한 장면: ${problems.sort((a, b) => a - b).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
