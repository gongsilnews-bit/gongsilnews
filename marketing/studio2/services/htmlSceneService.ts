import { AspectRatio, NewsSegment, SegmentationMode } from '../types';

type SceneTheme = {
  from: string;
  to: string;
  accent: string;
  glow: string;
};

const THEMES: SceneTheme[] = [
  { from: '#07152e', to: '#123b72', accent: '#5ee7ff', glow: '#38bdf8' },
  { from: '#1f1235', to: '#5b247a', accent: '#f0abfc', glow: '#c084fc' },
  { from: '#13231a', to: '#146b4a', accent: '#86efac', glow: '#34d399' },
  { from: '#30120d', to: '#8a351c', accent: '#fdba74', glow: '#fb923c' },
];

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sentenceParts = (script: string): string[] => {
  const normalized = script.replace(/\r/g, '').trim();
  if (!normalized) return [];

  return (normalized.match(/[^.!?。！？\n]+[.!?。！？]?/g) || [normalized])
    .map(part => part.trim())
    .filter(Boolean);
};

const splitLongPart = (text: string): [string, string] | null => {
  if (text.length < 18) return null;
  const middle = Math.floor(text.length / 2);
  const candidates = [',', '，', '·', '–', '-', ' '];
  let splitAt = -1;

  for (const separator of candidates) {
    const left = text.lastIndexOf(separator, middle);
    const right = text.indexOf(separator, middle);
    const candidate = left > text.length * 0.25 ? left : right;
    if (candidate > 0 && candidate < text.length - 1) {
      splitAt = candidate + (separator === ' ' ? 0 : 1);
      break;
    }
  }

  if (splitAt < 1) splitAt = middle;
  const first = text.slice(0, splitAt).trim();
  const second = text.slice(splitAt).trim();
  return first && second ? [first, second] : null;
};

const fitClipCount = (parts: string[], targetClipCount?: number): string[] => {
  if (!targetClipCount || targetClipCount < 1 || parts.length === 0) return parts;
  const result = [...parts];

  while (result.length < targetClipCount) {
    let longestIndex = 0;
    for (let i = 1; i < result.length; i++) {
      if (result[i].length > result[longestIndex].length) longestIndex = i;
    }
    const split = splitLongPart(result[longestIndex]);
    if (!split) break;
    result.splice(longestIndex, 1, ...split);
  }

  while (result.length > targetClipCount) {
    let shortestPairIndex = 0;
    let shortestPairLength = Number.POSITIVE_INFINITY;
    for (let i = 0; i < result.length - 1; i++) {
      const pairLength = result[i].length + result[i + 1].length;
      if (pairLength < shortestPairLength) {
        shortestPairLength = pairLength;
        shortestPairIndex = i;
      }
    }
    result.splice(
      shortestPairIndex,
      2,
      `${result[shortestPairIndex]} ${result[shortestPairIndex + 1]}`,
    );
  }

  return result;
};

const createLocalVisualPrompt = (narrative: string): string => {
  const keywordRules: Array<[RegExp, string]> = [
    [/공실|빈집|미분양/, 'vacant commercial and residential buildings'],
    [/아파트|주택|부동산/, 'modern South Korean apartment buildings and real estate market'],
    [/상가|점포|매장/, 'South Korean retail property and storefront district'],
    [/금리|대출|은행/, 'interest rates, mortgage finance and a modern Korean bank'],
    [/경매|낙찰/, 'South Korean real estate auction and contract documents'],
    [/재개발|재건축/, 'urban redevelopment construction site in South Korea'],
    [/정책|정부|규제/, 'South Korean government real estate policy briefing'],
    [/서울|강남|수도권/, 'cinematic Seoul skyline and dense urban district'],
  ];
  const subject = keywordRules.find(([pattern]) => pattern.test(narrative))?.[1]
    || 'South Korean property news and modern city architecture';

  return `Editorial news visual of ${subject}, cinematic composition, realistic lighting, professional broadcast quality, no text, no letters, 16:9`;
};

export function parseScriptLocally(
  script: string,
  mode: SegmentationMode = 'balanced',
  targetClipCount?: number,
): NewsSegment[] {
  const sentences = sentenceParts(script);
  let parts: string[];

  if (mode === 'single') {
    parts = script.trim() ? [script.trim()] : [];
  } else if (mode === 'standard') {
    parts = [];
    for (let i = 0; i < sentences.length; i += 2) {
      parts.push(sentences.slice(i, i + 2).join(' '));
    }
  } else if (mode === 'detailed') {
    parts = sentences.flatMap(sentence => {
      const split = splitLongPart(sentence);
      return split && sentence.length > 52 ? split : [sentence];
    });
  } else {
    parts = sentences;
  }

  return fitClipCount(parts, targetClipCount).map((narrative, index) => ({
    id: `seg-${Date.now()}-${index}`,
    originalText: narrative,
    narrative,
    visualPrompt: createLocalVisualPrompt(narrative),
    visualType: 'auto',
    mediaType: 'html',
  }));
}

const splitDisplayText = (narrative: string): { kicker: string; headline: string; detail: string } => {
  const clean = narrative.replace(/\s+/g, ' ').trim();
  const headlineLimit = clean.length > 34 ? 26 : 34;
  const headline = clean.length > headlineLimit
    ? `${clean.slice(0, headlineLimit).trim()}…`
    : clean;
  const detail = clean.length > headlineLimit ? clean : '공실뉴스 로컬 스튜디오 자동 장면';
  const kicker = /\d/.test(clean) ? 'DATA BRIEF' : 'GONGSIL NEWS';
  return { kicker, headline, detail };
};

const aspectSize = (aspectRatio: AspectRatio): { width: number; height: number } => {
  if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
  if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
};

export function createHtmlPosterDataUrl(
  narrative: string,
  index: number,
  aspectRatio: AspectRatio = '16:9',
): string {
  const theme = THEMES[index % THEMES.length];
  const { width, height } = aspectSize(aspectRatio);
  const { kicker, headline, detail } = splitDisplayText(narrative);
  const headlineSize = aspectRatio === '9:16' ? 76 : 82;
  const detailSize = aspectRatio === '9:16' ? 35 : 30;
  const textWidth = aspectRatio === '9:16' ? 16 : 25;
  const headlineLines = headline.match(new RegExp(`.{1,${textWidth}}`, 'g')) || [headline];
  const headlineY = height * 0.42;
  const lineHeight = headlineSize * 1.18;
  const lineSvg = headlineLines.slice(0, 3).map((line, lineIndex) => (
    `<text x="${width * 0.09}" y="${headlineY + lineIndex * lineHeight}" fill="#ffffff" font-size="${headlineSize}" font-weight="800" font-family="Arial, 'Noto Sans KR', sans-serif">${escapeHtml(line)}</text>`
  )).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.from}"/><stop offset="1" stop-color="${theme.to}"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="${theme.glow}" stop-opacity=".58"/><stop offset="1" stop-color="${theme.glow}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${width * 0.82}" cy="${height * 0.22}" r="${Math.min(width, height) * 0.42}" fill="url(#glow)"/>
    <rect x="${width * 0.09}" y="${height * 0.16}" width="${width * 0.12}" height="6" rx="3" fill="${theme.accent}"/>
    <text x="${width * 0.09}" y="${height * 0.22}" fill="${theme.accent}" font-size="24" font-weight="800" letter-spacing="6" font-family="Arial, sans-serif">${kicker}</text>
    ${lineSvg}
    <text x="${width * 0.09}" y="${height * 0.79}" fill="#ffffff" fill-opacity=".68" font-size="${detailSize}" font-family="Arial, 'Noto Sans KR', sans-serif">${escapeHtml(detail.slice(0, 62))}</text>
    <text x="${width * 0.91}" y="${height * 0.9}" text-anchor="end" fill="#ffffff" fill-opacity=".4" font-size="22" font-family="Arial, sans-serif">SCENE ${String(index + 1).padStart(2, '0')}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createHtmlScene(
  narrative: string,
  index: number,
  aspectRatio: AspectRatio = '16:9',
): string {
  const theme = THEMES[index % THEMES.length];
  const { kicker, headline, detail } = splitDisplayText(narrative);
  const safeKicker = escapeHtml(kicker);
  const safeHeadline = escapeHtml(headline);
  const safeDetail = escapeHtml(detail);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>공실뉴스 장면 ${index + 1}</title>
  <style>
    *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden}body{font-family:Arial,"Noto Sans KR",sans-serif;background:${theme.from};color:#fff}
    #app{position:relative;width:100%;height:100%;display:flex;align-items:center;padding:8vw;background:linear-gradient(135deg,${theme.from},${theme.to});cursor:pointer;isolation:isolate}
    .glow{position:absolute;width:64vmin;height:64vmin;right:-10vmin;top:-16vmin;border-radius:50%;background:${theme.glow};filter:blur(90px);opacity:.42;z-index:-1}
    .grid{position:absolute;inset:0;z-index:-1;opacity:.12;background-image:linear-gradient(rgba(255,255,255,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.22) 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(to bottom,black,transparent 85%)}
    .content{width:min(1100px,88vw)}
    .bar{width:150px;height:7px;border-radius:999px;background:${theme.accent};transform:scaleX(0);transform-origin:left}
    .kicker{margin-top:30px;color:${theme.accent};font-weight:900;letter-spacing:.34em;font-size:clamp(14px,1.35vw,25px);opacity:0;transform:translateY(16px)}
    h1{margin:38px 0 24px;font-size:clamp(44px,7vw,118px);line-height:1.08;letter-spacing:-.055em;word-break:keep-all;opacity:0;transform:translateY(42px);text-shadow:0 14px 50px rgba(0,0,0,.35)}
    p{max-width:920px;margin:0;color:rgba(255,255,255,.72);font-size:clamp(19px,2vw,34px);line-height:1.55;word-break:keep-all;opacity:0;transform:translateY(24px)}
    .sceneNo{position:absolute;right:5vw;bottom:5vh;font-size:clamp(14px,1.4vw,24px);letter-spacing:.24em;color:rgba(255,255,255,.38);opacity:0}
    .playing .bar{animation:bar .6s cubic-bezier(.2,.8,.2,1) forwards}.playing .kicker{animation:up .65s .18s ease forwards}.playing h1{animation:up .8s .35s cubic-bezier(.18,.9,.2,1) forwards}.playing p{animation:up .7s .62s ease forwards}.playing .sceneNo{animation:fade .6s .9s ease forwards}.playing .glow{animation:float 5s ease-in-out infinite alternate}
    @keyframes bar{to{transform:scaleX(1)}}@keyframes up{to{opacity:1;transform:translateY(0)}}@keyframes fade{to{opacity:1}}@keyframes float{to{transform:translate(-4vmin,5vmin) scale(1.12)}}
    @media (max-aspect-ratio: 1/1){#app{padding:10vw;align-items:center}.content{width:100%}h1{font-size:clamp(50px,10vw,106px)}p{font-size:clamp(22px,4vw,38px)}}
  </style>
</head>
<body>
  <main id="app" aria-label="장면을 클릭하면 애니메이션이 다시 시작됩니다">
    <div class="glow"></div><div class="grid"></div>
    <section class="content"><div class="bar"></div><div class="kicker">${safeKicker}</div><h1>${safeHeadline}</h1><p>${safeDetail}</p></section>
    <div class="sceneNo">SCENE ${String(index + 1).padStart(2, '0')}</div>
  </main>
  <script>
    const app = document.getElementById('app');
    function startScene(){document.body.classList.remove('playing');void document.body.offsetWidth;document.body.classList.add('playing')}
    window.startScene = startScene;
    app.addEventListener('click', startScene);
    requestAnimationFrame(startScene);
  </script>
</body>
</html>`;
}

export function attachHtmlScene(
  segment: NewsSegment,
  index: number,
  aspectRatio: AspectRatio = '16:9',
): NewsSegment {
  return {
    ...segment,
    mediaType: segment.mediaType || 'html',
    generatedHtml: createHtmlScene(segment.narrative, index, aspectRatio),
    generatedHtmlPosterUrl: createHtmlPosterDataUrl(segment.narrative, index, aspectRatio),
  };
}

export function downloadHtmlScene(segment: NewsSegment, index: number): void {
  if (!segment.generatedHtml) return;
  const blob = new Blob([segment.generatedHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `scene${String(index + 1).padStart(2, '0')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* 음성(blob: 주소)을 파일로 보낼 수 있게 data: 주소로 — 일레븐랩스·Gemini 음성 모두 */
const toDataUrl = async (url?: string): Promise<string | undefined> => {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
};

/* 음성 길이(ms) — 렌더링할 때 장면 길이를 음성에 맞춘다 */
const audioLengthMs = (url?: string): Promise<number> => new Promise(resolve => {
  if (!url) return resolve(0);
  const audio = new Audio();
  const done = (ms: number) => { audio.src = ''; resolve(ms); };
  audio.preload = 'metadata';
  audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
  audio.onerror = () => done(0);
  setTimeout(() => done(0), 8000);
  audio.src = url;
});

/* VS Code 에서 만든 장면을 덮어쓰게 될 때 서버가 알려 주는 오류 */
export class WorkspaceConflictError extends Error {
  conflicts: number[];
  constructor(message: string, conflicts: number[]) {
    super(message);
    this.conflicts = conflicts;
  }
}

export async function saveStudio2Workspace(
  segments: NewsSegment[],
  aspectRatio: AspectRatio,
  options: { force?: boolean } = {},
): Promise<{ savedScenes: number; savedAudio: number; keptScenes?: number[]; workspace: string } | null> {
  if (!import.meta.env.DEV) return null;

  const scenes = await Promise.all(segments.map(async (segment, index) => ({
    index,
    narrative: segment.narrative,
    mediaType: segment.mediaType || 'html',
    html: segment.generatedHtml,
    imageUrl: segment.generatedImageUrl,
    audioUrl: await toDataUrl(segment.generatedAudioUrl),
    audioMs: await audioLengthMs(segment.generatedAudioUrl),
    durationMs: 6_000,
  })));

  const response = await fetch('/__studio2/workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aspectRatio, force: Boolean(options.force), scenes }),
  });

  if (response.status === 409) {
    const body = await response.json();
    throw new WorkspaceConflictError(body.error, body.conflicts || []);
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Studio2 작업 폴더 저장에 실패했습니다.');
  }

  return response.json();
}

export type WorkspaceScene = {
  narrative: string;
  mediaType: 'image' | 'html';
  durationMs: number;
  html?: string;
  byAgent: boolean;
  imageUrl?: string;
  audioUrl?: string;
};

/* 작업 폴더(VS Code 에서 만들거나 고친 장면 포함)를 읽어 온다 */
export async function loadStudio2Workspace(): Promise<{ aspectRatio: AspectRatio; scenes: WorkspaceScene[] }> {
  if (!import.meta.env.DEV) throw new Error('작업 폴더 불러오기는 로컬 개발 서버(npm run dev)에서만 됩니다.');
  const response = await fetch('/__studio2/workspace', { cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || '작업 폴더를 불러오지 못했습니다.');
  return body;
}

/* ── AI 장면 자동 생성 (Studio2 서버가 뒤에서 Claude Code 실행) ── */
export type AgentStatus = {
  running: boolean;
  idle?: boolean;
  total?: number;
  done?: number;
  error?: string;
  summary?: string;
  log?: string[];
  startedAt?: number;
  finishedAt?: number;
};

export async function startAgentScenes(only: number[] = []): Promise<{ total: number }> {
  const response = await fetch('/__studio2/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ only }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'AI 장면 생성을 시작하지 못했습니다.');
  return body;
}

export async function getAgentStatus(): Promise<AgentStatus> {
  const response = await fetch('/__studio2/agent', { cache: 'no-store' });
  if (!response.ok) return { running: false, idle: true };
  return response.json();
}

export async function stopAgentScenes(): Promise<void> {
  await fetch('/__studio2/agent/stop', { method: 'POST' }).catch(() => undefined);
}
