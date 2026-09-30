const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const studioDir = path.resolve(__dirname, '..');
const workspaceDir = path.join(studioDir, 'workspace');
const scenesDir = path.join(workspaceDir, 'scenes');
const outputDir = path.join(workspaceDir, 'output');
const clipsDir = path.join(outputDir, 'clips');
const tempDir = path.join(outputDir, '.render-temp');
const manifestPath = path.join(workspaceDir, 'project.json');

function assertInside(parent, target) {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`안전하지 않은 출력 경로입니다: ${target}`);
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function videoSize(aspectRatio) {
  if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
  if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

function imageSceneHtml(imageUrl, narrative) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <style>
    *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#05070b}body{font-family:Arial,"Noto Sans KR",sans-serif}
    #app{position:relative;width:100%;height:100%;overflow:hidden;background:#05070b}.image{position:absolute;inset:-4%;width:108%;height:108%;object-fit:cover;transform:scale(1.02)}
    .shade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.04),rgba(0,0,0,.18))}.caption{position:absolute;left:5%;right:5%;bottom:5%;color:rgba(255,255,255,.82);font-size:clamp(18px,2vw,34px);font-weight:700;text-shadow:0 3px 16px rgba(0,0,0,.8);opacity:0;transform:translateY(18px)}
    .playing .image{animation:zoom 6s ease-out forwards}.playing .caption{animation:up .7s .35s ease forwards}@keyframes zoom{to{transform:scale(1.14)}}@keyframes up{to{opacity:1;transform:translateY(0)}}
  </style>
</head>
<body>
  <main id="app"><img class="image" src="${escapeHtml(imageUrl)}" alt=""/><div class="shade"></div><div class="caption">${escapeHtml(narrative)}</div></main>
  <script>function startScene(){document.body.classList.remove('playing');void document.body.offsetWidth;document.body.classList.add('playing')}window.startScene=startScene;requestAnimationFrame(startScene)</script>
</body>
</html>`;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} 종료 코드 ${code}\n${stderr}`));
    });
  });
}

/* 음성 파일 길이(ms) — ffprobe 로 잰다. 못 재면 0 */
function probeDurationMs(file) {
  return new Promise(resolve => {
    const child = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { windowsHide: true });
    let out = '';
    child.stdout.on('data', chunk => { out += chunk.toString(); });
    child.on('error', () => resolve(0));
    child.on('close', () => {
      const seconds = parseFloat(out);
      resolve(Number.isFinite(seconds) ? Math.round(seconds * 1000) : 0);
    });
  });
}

/* 장면 길이 — 음성이 있으면 음성 길이 + 0.5초, 없으면 project.json 의 durationMs(기본 6초) */
async function sceneTiming(scene) {
  const audioPath = scene.audioFile ? path.join(scenesDir, scene.audioFile) : null;
  if (audioPath) {
    try {
      await fs.access(audioPath);
      const audioMs = await probeDurationMs(audioPath);
      if (audioMs) return { audioPath, durationMs: Math.max(audioMs + 500, 1_000) };
    } catch {
      console.warn(`  음성 파일을 찾지 못해 무음으로 만듭니다: ${scene.audioFile}`);
    }
  }
  return { audioPath: null, durationMs: Math.max(1_000, Number(scene.durationMs) || 6_000) };
}

async function recordScene(browser, scene, index, size) {
  const number = String(index + 1).padStart(2, '0');
  const { audioPath, durationMs } = await sceneTiming(scene);
  const context = await browser.newContext({
    viewport: size,
    recordVideo: { dir: tempDir, size },
  });
  /* 녹화는 창을 여는 순간 시작된다 — 장면이 실제로 시작한 시점을 재서 그 앞(빈 화면·로딩)은 잘라 낸다 */
  const recordStartedAt = Date.now();
  const page = await context.newPage();
  const video = page.video();
  let sceneStartSec = 0;

  try {
    const imagePath = scene.imageFile ? path.join(scenesDir, scene.imageFile) : null;
    const htmlPath = scene.htmlFile ? path.join(scenesDir, scene.htmlFile) : null;

    if (scene.mediaType === 'image' && imagePath) {
      await fs.access(imagePath);
      await page.setContent(
        imageSceneHtml(pathToFileURL(imagePath).href, scene.narrative),
        { waitUntil: 'load' },
      );
      await page.waitForFunction(() => Array.from(document.images).every(image => image.complete));
    } else {
      if (!htmlPath) throw new Error(`scene${number}의 HTML 파일 정보가 없습니다.`);
      await fs.access(htmlPath);
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    }

    /* 글꼴까지 다 불러온 뒤 시작해야 첫 프레임에 글자가 튀지 않는다 */
    await page.evaluate(() => document.fonts && document.fonts.ready);
    sceneStartSec = (Date.now() - recordStartedAt) / 1000;
    await page.evaluate(() => {
      if (typeof window.startScene === 'function') window.startScene();
    });
    await page.waitForTimeout(durationMs + 300);
  } finally {
    await page.close();
    await context.close();
  }

  const capturedPath = await video.path();
  const webmPath = path.join(clipsDir, `scene${number}.webm`);
  const mp4Path = path.join(clipsDir, `scene${number}.mp4`);
  await fs.rm(webmPath, { force: true });
  await fs.rename(capturedPath, webmPath);
  /* 모든 클립을 같은 모양(30fps H.264 + 48kHz 스테레오 AAC)으로 맞춰야 마지막에 그대로 이어 붙일 수 있다.
     음성이 없는 클립에는 무음 트랙을 넣는다. */
  const seconds = (durationMs / 1000).toFixed(3);
  const audioInput = audioPath
    ? ['-i', audioPath]
    : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-ss', sceneStartSec.toFixed(3), '-i', webmPath,
    ...audioInput,
    '-map', '0:v:0', '-map', '1:a:0',
    '-vf', `fps=30,scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`,
    '-af', 'aresample=48000,apad',
    '-t', seconds,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', mp4Path,
  ]);
  return mp4Path;
}

async function main() {
  assertInside(workspaceDir, outputDir);
  assertInside(outputDir, clipsDir);
  assertInside(outputDir, tempDir);

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
    throw new Error('workspace/project.json에 렌더링할 장면이 없습니다. Studio2에서 먼저 스크립트를 분석하세요.');
  }

  const size = videoSize(manifest.aspectRatio);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(clipsDir, { recursive: true, force: true });
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(clipsDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const clips = [];
  try {
    for (let index = 0; index < manifest.scenes.length; index++) {
      const scene = manifest.scenes[index];
      console.log(`[${index + 1}/${manifest.scenes.length}] 장면 렌더링 중...${scene.audioFile ? ` (음성 ${scene.audioFile})` : ' (음성 없음)'}`);
      clips.push(await recordScene(browser, manifest.scenes[index], index, size));
    }
  } finally {
    await browser.close();
  }

  const finalPath = path.join(outputDir, 'final.mp4');
  await fs.rm(finalPath, { force: true });

  if (clips.length === 1) {
    await fs.copyFile(clips[0], finalPath);
  } else {
    const concatPath = path.join(tempDir, 'concat.txt');
    const concatText = clips
      .map(clip => `file '${clip.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`)
      .join('\n');
    await fs.writeFile(concatPath, `${concatText}\n`, 'utf8');
    await run('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-c', 'copy', '-movflags', '+faststart', finalPath,
    ]);
  }

  await fs.rm(tempDir, { recursive: true, force: true });
  console.log('Studio2 렌더링 완료');
  console.log(finalPath);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
