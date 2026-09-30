import type { MotionAction, SceneSpec } from './types';

export interface RenderOutput {
  html: string;
  warnings: string[];
}

interface SceneMarkup {
  body: string;
  maxStep: number;
}

interface StepInstruction {
  step: number;
  motion?: string;
  durationMs?: number;
  delayMs?: number;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const text = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fallback;
};

const safeJson = (value: unknown): string => JSON.stringify(value)
  .replaceAll('<', '\\u003c')
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029');

function getStepInstructions(scene: SceneSpec): Map<string, StepInstruction> {
  const instructions = new Map<string, StepInstruction>();
  scene.motionSequence.forEach((rawMotionStep, index) => {
    const motionStep = asRecord(rawMotionStep) as unknown as SceneSpec['motionSequence'][number];
    const step = motionStep.order ?? motionStep.step ?? index + 1;
    (Array.isArray(motionStep.actions) ? motionStep.actions : []).forEach((action: MotionAction) => {
      if (!action.targetId) return;
      instructions.set(action.targetId, {
        step,
        motion: action.motion,
        durationMs: action.durationMs,
        delayMs: action.delayMs,
      });
    });
  });
  return instructions;
}

function attrs(
  instructions: Map<string, StepInstruction>,
  id: string,
  fallbackStep: number,
  fallbackMotion = 'pop',
): string {
  const instruction = instructions.get(id);
  const step = instruction?.step ?? fallbackStep;
  const motion = instruction?.motion ?? fallbackMotion;
  const duration = instruction?.durationMs ?? 560;
  const delay = instruction?.delayMs ?? 0;
  return `id="${escapeHtml(id)}" data-step="${step}" data-motion="${escapeHtml(motion)}" style="--motion-duration:${duration}ms;--motion-delay:${delay}ms"`;
}

function titleMarkup(content: Record<string, unknown>, scene: SceneSpec): string {
  const eyebrow = text(content.eyebrow, scene.visualGrammar.replaceAll('_', ' '));
  const title = text(content.title, scene.title || scene.visualIntent);
  return `<header class="scene-heading">
    <div class="eyebrow"><span></span>${escapeHtml(eyebrow)}</div>
    <h1>${escapeHtml(title)}</h1>
  </header>`;
}

function renderProcess(scene: SceneSpec, instructions: Map<string, StepInstruction>): SceneMarkup {
  const content = asRecord(scene.content);
  const rawSteps = asArray(content.steps);
  const steps = rawSteps.length ? rawSteps : ['첫 번째 단계', '두 번째 단계', '세 번째 단계'];
  const maxCards = Math.min(steps.length, 5);
  const cards: string[] = [];

  for (let index = 0; index < maxCards; index += 1) {
    const item = asRecord(steps[index]);
    const cardTitle = text(item.title, text(steps[index], `단계 ${index + 1}`));
    const description = text(item.description);
    const icon = text(item.icon, String(index + 1).padStart(2, '0'));
    const cardStep = index === 0 ? 1 : Math.min(index + 2, Math.max(1, scene.motionSequence.length));
    cards.push(`<article class="process-card" ${attrs(instructions, `step-${index + 1}`, cardStep, 'pop')}>
      <div class="step-icon">${escapeHtml(icon)}</div>
      <div class="step-kicker">STEP ${String(index + 1).padStart(2, '0')}</div>
      <h2>${escapeHtml(cardTitle)}</h2>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </article>`);
    if (index < maxCards - 1) {
      const connectorStep = Math.min(index + 2, Math.max(1, scene.motionSequence.length));
      cards.push(`<div class="process-connector" ${attrs(instructions, `connector-${index + 1}`, connectorStep, 'drawLine')}>
        <span></span><b>›</b>
      </div>`);
    }
  }

  return {
    body: `${titleMarkup(content, scene)}<div class="process-row count-${maxCards}">${cards.join('')}</div>`,
    maxStep: Math.max(scene.motionSequence.length, maxCards + 1),
  };
}

function renderBigNumber(scene: SceneSpec, instructions: Map<string, StepInstruction>): SceneMarkup {
  const content = asRecord(scene.content);
  const startValue = text(content.startValue, '3시간');
  const endValue = text(content.endValue, text(content.value, '30분'));
  const startLabel = text(content.startLabel, '기존 방식');
  const endLabel = text(content.endLabel, '자동 생성');
  const conclusion = text(content.conclusion, scene.visualIntent);
  return {
    body: `${titleMarkup(content, scene)}
      <div class="number-comparison">
        <article class="number-panel muted" ${attrs(instructions, 'start-value', 1, 'slide')}>
          <span>${escapeHtml(startLabel)}</span><strong>${escapeHtml(startValue)}</strong>
        </article>
        <div class="compression-arrow" ${attrs(instructions, 'compression-arrow', 2, 'drawLine')}>
          <i></i><b>›</b><small>AI</small>
        </div>
        <article class="number-panel target" ${attrs(instructions, 'end-value', 3, 'impact')}>
          <span>${escapeHtml(endLabel)}</span><strong>${escapeHtml(endValue)}</strong>
        </article>
      </div>
      <div class="conclusion-pill" ${attrs(instructions, 'conclusion', 4, 'pop')}>${escapeHtml(conclusion)}</div>`,
    maxStep: Math.max(4, scene.motionSequence.length),
  };
}

function numericValue(value: unknown): { number: number; decimals: number } | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const decimals = String(value).includes('.') ? String(value).split('.')[1].length : 0;
    return { number: value, decimals };
  }
  if (typeof value !== 'string') return null;
  const cleaned = value.replaceAll(',', '').match(/-?\d+(?:\.\d+)?/);
  if (!cleaned) return null;
  const parsed = Number(cleaned[0]);
  if (!Number.isFinite(parsed)) return null;
  return { number: parsed, decimals: cleaned[0].includes('.') ? cleaned[0].split('.')[1].length : 0 };
}

function renderStatistics(scene: SceneSpec, instructions: Map<string, StepInstruction>): SceneMarkup {
  const content = asRecord(scene.content);
  const rawItems = asArray(content.items).slice(0, 4);
  const items = rawItems.length ? rawItems : [{ label: '핵심 수치', value: 100, unit: '%' }];
  const cards = items.map((rawItem, index) => {
    const item = asRecord(rawItem);
    const value = item.value ?? 0;
    const numeric = numericValue(value);
    const countAttrs = numeric
      ? `data-count-to="${numeric.number}" data-count-decimals="${numeric.decimals}"`
      : '';
    return `<article class="stat-card" ${attrs(instructions, `stat-${index + 1}`, index + 1, 'pop')}>
      <div class="stat-top"><span class="stat-icon">${escapeHtml(text(item.icon, String(index + 1).padStart(2, '0')))}</span><em>0${index + 1}</em></div>
      <div class="stat-number"><strong ${countAttrs}>${numeric ? '0' : escapeHtml(value)}</strong><span>${escapeHtml(text(item.unit))}</span></div>
      <h2>${escapeHtml(text(item.label, `지표 ${index + 1}`))}</h2>
      ${item.description ? `<p>${escapeHtml(text(item.description))}</p>` : ''}
    </article>`;
  }).join('');
  const conclusion = text(content.conclusion);
  return {
    body: `${titleMarkup(content, scene)}
      <div class="stat-grid count-${items.length}">${cards}</div>
      ${conclusion ? `<div class="conclusion-line" ${attrs(instructions, 'conclusion', items.length + 1, 'slide')}>${escapeHtml(conclusion)}</div>` : ''}`,
    maxStep: Math.max(scene.motionSequence.length, items.length + (conclusion ? 1 : 0)),
  };
}

function comparisonPanel(value: unknown, side: 'left' | 'right'): string {
  const item = asRecord(value);
  const points = asArray(item.points).slice(0, 4);
  return `<div class="compare-label">${escapeHtml(text(item.label, side === 'left' ? 'A' : 'B'))}</div>
    <h2>${escapeHtml(text(item.value, side === 'left' ? '기존 방식' : '새로운 방식'))}</h2>
    ${points.length ? `<ul>${points.map((point) => `<li><span>${side === 'left' ? '−' : '✓'}</span>${escapeHtml(text(point))}</li>`).join('')}</ul>` : ''}`;
}

function renderComparison(scene: SceneSpec, instructions: Map<string, StepInstruction>): SceneMarkup {
  const content = asRecord(scene.content);
  const conclusion = text(content.conclusion, scene.visualIntent);
  return {
    body: `${titleMarkup(content, scene)}
      <div class="compare-grid">
        <article class="compare-panel before" ${attrs(instructions, 'left-panel', 1, 'slide')}>${comparisonPanel(content.left, 'left')}</article>
        <div class="versus" ${attrs(instructions, 'versus', 2, 'impact')}>VS</div>
        <article class="compare-panel after" ${attrs(instructions, 'right-panel', 3, 'slide')}>${comparisonPanel(content.right, 'right')}</article>
      </div>
      <div class="conclusion-pill" ${attrs(instructions, 'conclusion', 4, 'pop')}>${escapeHtml(conclusion)}</div>`,
    maxStep: Math.max(4, scene.motionSequence.length),
  };
}

function renderList(scene: SceneSpec, instructions: Map<string, StepInstruction>): SceneMarkup {
  const content = asRecord(scene.content);
  const items = asArray(content.items).slice(0, 6);
  const fallback = scene.visualGrammar === 'WARNING'
    ? ['주의할 내용을 입력하세요.']
    : ['첫 번째 핵심 내용', '두 번째 핵심 내용', '세 번째 핵심 내용'];
  const list = (items.length ? items : fallback).map((rawItem, index) => {
    const item = asRecord(rawItem);
    const label = text(item.title, text(item.label, text(rawItem)));
    const description = text(item.description);
    return `<article class="check-item" ${attrs(instructions, `item-${index + 1}`, index + 1, index % 2 ? 'slide' : 'pop')}>
      <span class="check-mark">${scene.visualGrammar === 'WARNING' ? '!' : '✓'}</span>
      <div><h2>${escapeHtml(label)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div>
    </article>`;
  }).join('');
  const conclusion = text(content.conclusion);
  const itemCount = items.length || fallback.length;
  return {
    body: `${titleMarkup(content, scene)}
      <div class="check-list ${scene.visualGrammar === 'WARNING' ? 'warning-list' : ''}">${list}</div>
      ${conclusion ? `<div class="conclusion-line" ${attrs(instructions, 'conclusion', itemCount + 1, 'impact')}>${escapeHtml(conclusion)}</div>` : ''}`,
    maxStep: Math.max(scene.motionSequence.length, itemCount + (conclusion ? 1 : 0)),
  };
}

function renderTimeline(scene: SceneSpec, instructions: Map<string, StepInstruction>): SceneMarkup {
  const content = asRecord(scene.content);
  const rawItems = asArray(content.items).slice(0, 6);
  const items = rawItems.length ? rawItems : ['시작', '진행', '완료'];
  const nodes = items.map((rawItem, index) => {
    const item = asRecord(rawItem);
    return `<article class="timeline-node" ${attrs(instructions, `timeline-${index + 1}`, index + 1, 'pop')}>
      <span class="timeline-dot">${index + 1}</span>
      <h2>${escapeHtml(text(item.label, text(item.title, text(rawItem))))}</h2>
      <p>${escapeHtml(text(item.description))}</p>
    </article>`;
  }).join('');
  return {
    body: `${titleMarkup(content, scene)}<div class="timeline-track"><div class="timeline-line"></div>${nodes}</div>`,
    maxStep: Math.max(scene.motionSequence.length, items.length),
  };
}

function renderMetaphor(scene: SceneSpec, instructions: Map<string, StepInstruction>): SceneMarkup {
  const content = asRecord(scene.content);
  const items = asArray(content.items).slice(0, 5);
  const tokens = (items.length ? items : ['시도 1', '시도 2', '결과']).map((item, index) =>
    `<span class="metaphor-token token-${index + 1}" ${attrs(instructions, `token-${index + 1}`, index + 1, 'bounce')}>${escapeHtml(text(item))}</span>`,
  ).join('');
  const conclusion = text(content.conclusion, scene.visualIntent);
  return {
    body: `${titleMarkup(content, scene)}
      <div class="metaphor-machine">
        <div class="machine-window">${tokens}<div class="machine-glow"></div></div>
        <div class="machine-base"><span></span><b></b><i></i></div>
      </div>
      <div class="conclusion-pill" ${attrs(instructions, 'conclusion', (items.length || 3) + 1, 'impact')}>${escapeHtml(conclusion)}</div>`,
    maxStep: Math.max(scene.motionSequence.length, (items.length || 3) + 1),
  };
}

function renderMap(scene: SceneSpec, instructions: Map<string, StepInstruction>, warnings: string[]): SceneMarkup {
  const content = asRecord(scene.content);
  const places = asArray(content.places).slice(0, 8);
  if (!places.length) warnings.push('MAP 장면에 실제 위치 자료(content.places)가 없어 안내 화면으로 렌더링했습니다.');
  const pins = places.map((rawPlace, index) => {
    const place = asRecord(rawPlace);
    const rawX = Number(place.x ?? 20 + index * 14);
    const rawY = Number(place.y ?? 50 + (index % 2 ? 12 : -12));
    const x = Number.isFinite(rawX) ? Math.max(5, Math.min(95, rawX)) : 20 + index * 12;
    const y = Number.isFinite(rawY) ? Math.max(8, Math.min(90, rawY)) : 50;
    return `<div class="map-pin" style="left:${x}%;top:${y}%" ${attrs(instructions, `place-${index + 1}`, index + 1, 'pop')}>
      <i></i><span>${escapeHtml(text(place.label, `위치 ${index + 1}`))}</span>
    </div>`;
  }).join('');
  return {
    body: `${titleMarkup(content, scene)}
      <div class="map-frame">
        <div class="map-surface" data-draggable="true">
          <svg viewBox="0 0 1200 520" aria-hidden="true"><path d="M-20 410 C160 260 250 390 410 250 S700 120 850 260 1080 410 1240 170"/><path d="M-30 120 C180 210 250 60 470 150 S780 360 1230 250"/><path class="river" d="M-40 310 C250 470 510 180 740 340 S1050 450 1240 300"/></svg>
          ${pins || '<div class="map-empty"><b>실제 지도 자료가 필요합니다</b><span>지명과 상대 좌표를 확인한 뒤 places에 입력하세요.</span></div>'}
        </div>
      </div>`,
    maxStep: Math.max(scene.motionSequence.length, places.length || 1),
  };
}

function renderFallback(scene: SceneSpec, instructions: Map<string, StepInstruction>, warnings: string[]): SceneMarkup {
  warnings.push(`${scene.visualGrammar} 전용 Renderer가 없어 안전한 SUMMARY 장면으로 대체했습니다.`);
  const content = asRecord(scene.content);
  const entries = Object.entries(content).filter(([, value]) => typeof value === 'string' || typeof value === 'number').slice(0, 5);
  const items = entries.length ? entries.map(([key, value], index) => `<article class="summary-card" ${attrs(instructions, `summary-${key}`, index + 1, 'pop')}><small>${escapeHtml(key)}</small><strong>${escapeHtml(value)}</strong></article>`).join('') : `<article class="summary-card" ${attrs(instructions, 'summary-1', 1, 'pop')}><strong>${escapeHtml(scene.visualIntent)}</strong></article>`;
  return {
    body: `${titleMarkup(content, scene)}<div class="summary-grid">${items}</div>`,
    maxStep: Math.max(scene.motionSequence.length, entries.length || 1),
  };
}

function buildMarkup(scene: SceneSpec, warnings: string[]): SceneMarkup {
  const instructions = getStepInstructions(scene);
  switch (scene.visualGrammar) {
    case 'PROCESS':
    case 'FLOW':
      return renderProcess(scene, instructions);
    case 'BIG_NUMBER':
    case 'TIME_COMPRESSION':
      return renderBigNumber(scene, instructions);
    case 'STATISTICS':
      return renderStatistics(scene, instructions);
    case 'COMPARISON':
      return renderComparison(scene, instructions);
    case 'CHECKLIST':
    case 'WARNING':
    case 'SUMMARY':
      return renderList(scene, instructions);
    case 'TIMELINE':
      return renderTimeline(scene, instructions);
    case 'METAPHOR':
      return renderMetaphor(scene, instructions);
    case 'MAP':
      return renderMap(scene, instructions, warnings);
    default:
      return renderFallback(scene, instructions, warnings);
  }
}

function sceneCss(theme: string): string {
  const isLight = theme.includes('light');
  return `
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    :root { color-scheme: ${isLight ? 'light' : 'dark'}; --bg:${isLight ? '#f5f7fb' : '#07101f'}; --panel:${isLight ? '#ffffff' : '#101d31'}; --text:${isLight ? '#172033' : '#f6f8fc'}; --muted:${isLight ? '#667085' : '#9aa9bd'}; --line:${isLight ? '#d9e0ea' : '#263a58'}; --accent:#5b8cff; --accent-2:#49e2ad; --danger:#ff6b72; }
    * { box-sizing:border-box; }
    html, body { margin:0; width:100%; height:100%; overflow:hidden; background:#02050a; font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { display:grid; place-items:center; }
    #viewport { position:absolute; width:1920px; height:1080px; left:50%; top:50%; transform-origin:center; }
    .stage { position:relative; width:1920px; height:1080px; overflow:hidden; color:var(--text); background:var(--bg); padding:92px 112px; user-select:none; }
    .stage::before { content:""; position:absolute; inset:0; opacity:${isLight ? '.55' : '.28'}; background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px); background-size:44px 44px; mask-image:linear-gradient(to bottom,black,transparent 92%); }
    .stage::after { content:""; position:absolute; width:780px; height:780px; border-radius:50%; right:-260px; top:-350px; background:radial-gradient(circle,rgba(91,140,255,.24),transparent 68%); }
    .stage > * { position:relative; z-index:1; }
    .scene-heading { max-width:1500px; margin-bottom:62px; }
    .eyebrow { display:flex; align-items:center; gap:14px; color:var(--accent); font-size:24px; font-weight:850; letter-spacing:.13em; text-transform:uppercase; margin-bottom:20px; }
    .eyebrow span { display:block; width:58px; height:7px; border-radius:8px; background:var(--accent); }
    h1 { margin:0; font-size:72px; line-height:1.12; letter-spacing:-.045em; font-weight:900; }
    h2 { margin:0; font-weight:850; letter-spacing:-.035em; }
    p { margin:0; color:var(--muted); }
    [data-step] { opacity:0; transform:translateY(28px) scale(.96); transition:opacity var(--motion-duration) cubic-bezier(.2,.82,.2,1) var(--motion-delay),transform var(--motion-duration) cubic-bezier(.2,.82,.2,1) var(--motion-delay),filter var(--motion-duration) ease var(--motion-delay); filter:blur(8px); }
    [data-step].is-visible { opacity:1; transform:none; filter:none; }
    [data-motion="slide"] { transform:translateX(-58px); }
    [data-motion="slide"].is-visible { transform:none; }
    [data-motion="impact"] { transform:scale(.72); }
    [data-motion="impact"].is-visible { transform:scale(1); animation:impact .55s cubic-bezier(.2,1.35,.35,1); }
    [data-motion="bounce"].is-visible { animation:bounce .72s cubic-bezier(.2,1.35,.35,1); }
    [data-motion="drawLine"] { transform:scaleX(0); transform-origin:left center; filter:none; }
    [data-motion="drawLine"].is-visible { transform:scaleX(1); }
    @keyframes impact { 45% { transform:scale(1.1); } 100% { transform:scale(1); } }
    @keyframes bounce { 0% { transform:translateY(-80px) scale(.7); } 65% { transform:translateY(12px) scale(1.06); } 100% { transform:none; } }
    .process-row { min-height:480px; display:flex; align-items:center; justify-content:center; gap:22px; }
    .process-card { flex:1; max-width:340px; min-height:350px; border:2px solid var(--line); border-radius:34px; background:color-mix(in srgb,var(--panel) 92%,transparent); padding:42px 32px; box-shadow:0 24px 60px rgba(0,0,0,.16); }
    .step-icon { width:88px; height:88px; display:grid; place-items:center; border-radius:26px; background:linear-gradient(145deg,var(--accent),#7b5cff); color:#fff; font-size:32px; font-weight:900; box-shadow:0 14px 38px rgba(91,140,255,.32); }
    .step-kicker { margin:34px 0 12px; color:var(--accent); font-size:19px; font-weight:900; letter-spacing:.12em; }
    .process-card h2 { font-size:40px; line-height:1.12; }
    .process-card p { font-size:23px; line-height:1.5; margin-top:18px; }
    .process-connector { width:80px; display:flex; align-items:center; }
    .process-connector span { height:8px; flex:1; border-radius:8px; background:var(--accent); }
    .process-connector b { font-size:56px; line-height:0; color:var(--accent); margin-left:-3px; }
    .number-comparison { display:grid; grid-template-columns:1fr 260px 1fr; gap:50px; align-items:center; min-height:480px; }
    .number-panel { min-height:365px; border-radius:46px; padding:52px; display:flex; flex-direction:column; justify-content:center; border:2px solid var(--line); background:var(--panel); box-shadow:0 26px 70px rgba(0,0,0,.18); }
    .number-panel span { font-size:28px; color:var(--muted); font-weight:750; }
    .number-panel strong { margin-top:20px; font-size:118px; line-height:1; letter-spacing:-.07em; font-weight:950; }
    .number-panel.muted strong { color:var(--muted); text-decoration:line-through; text-decoration-thickness:7px; }
    .number-panel.target { border-color:var(--accent-2); background:linear-gradient(145deg,color-mix(in srgb,var(--panel) 86%,var(--accent-2)),var(--panel)); }
    .number-panel.target strong { color:var(--accent-2); text-shadow:0 0 42px rgba(73,226,173,.2); }
    .compression-arrow { position:relative; display:flex; align-items:center; }
    .compression-arrow i { height:10px; flex:1; background:linear-gradient(90deg,var(--accent),var(--accent-2)); border-radius:10px; }
    .compression-arrow b { color:var(--accent-2); font-size:86px; line-height:0; }
    .compression-arrow small { position:absolute; left:50%; top:-58px; transform:translateX(-50%); color:var(--accent); font-size:24px; font-weight:900; letter-spacing:.12em; }
    .conclusion-pill,.conclusion-line { margin:28px auto 0; width:max-content; max-width:1450px; padding:20px 38px; border-radius:999px; background:var(--accent); color:white; font-size:31px; font-weight:850; box-shadow:0 15px 40px rgba(91,140,255,.26); }
    .stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:32px; min-height:440px; align-items:stretch; }
    .stat-grid.count-4 { grid-template-columns:repeat(4,1fr); }
    .stat-card { padding:38px; border:2px solid var(--line); border-radius:36px; background:var(--panel); box-shadow:0 24px 65px rgba(0,0,0,.13); }
    .stat-top { display:flex; justify-content:space-between; align-items:center; }
    .stat-icon { width:72px; height:72px; border-radius:23px; display:grid; place-items:center; background:color-mix(in srgb,var(--accent) 18%,var(--panel)); color:var(--accent); font-size:25px; font-weight:900; }
    .stat-top em { font-size:24px; font-style:normal; font-weight:900; color:var(--line); }
    .stat-number { display:flex; align-items:baseline; gap:12px; margin:42px 0 24px; white-space:nowrap; }
    .stat-number strong { font-size:102px; line-height:.85; letter-spacing:-.07em; color:var(--accent); font-weight:950; }
    .stat-number span { color:var(--accent-2); font-weight:850; font-size:25px; }
    .stat-card h2 { font-size:34px; }
    .stat-card p { margin-top:14px; font-size:22px; }
    .conclusion-line { border-radius:18px; text-align:center; width:100%; margin-top:30px; }
    .compare-grid { display:grid; grid-template-columns:1fr 130px 1fr; gap:32px; align-items:center; min-height:470px; }
    .compare-panel { min-height:420px; border-radius:42px; padding:48px; border:2px solid var(--line); background:var(--panel); box-shadow:0 24px 65px rgba(0,0,0,.14); }
    .compare-panel.after { border-color:var(--accent-2); }
    .compare-label { display:inline-flex; padding:10px 18px; border-radius:999px; background:color-mix(in srgb,var(--danger) 16%,var(--panel)); color:var(--danger); font-size:22px; font-weight:900; }
    .after .compare-label { background:color-mix(in srgb,var(--accent-2) 16%,var(--panel)); color:var(--accent-2); }
    .compare-panel h2 { font-size:45px; margin-top:28px; line-height:1.23; }
    .compare-panel ul { list-style:none; padding:0; margin:32px 0 0; display:grid; gap:16px; }
    .compare-panel li { display:flex; gap:14px; align-items:center; color:var(--muted); font-size:24px; font-weight:700; }
    .compare-panel li span { width:32px; height:32px; border-radius:50%; display:grid; place-items:center; background:color-mix(in srgb,var(--danger) 16%,transparent); color:var(--danger); }
    .after li span { color:var(--accent-2); background:color-mix(in srgb,var(--accent-2) 16%,transparent); }
    .versus { width:112px; height:112px; display:grid; place-items:center; border-radius:50%; color:#fff; font-size:35px; font-weight:950; background:linear-gradient(145deg,var(--accent),#7b5cff); box-shadow:0 18px 42px rgba(91,140,255,.3); }
    .check-list { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
    .check-item { min-height:150px; border:2px solid var(--line); background:var(--panel); border-radius:30px; padding:30px 34px; display:flex; gap:24px; align-items:center; box-shadow:0 16px 44px rgba(0,0,0,.11); }
    .check-mark { flex:0 0 66px; width:66px; height:66px; border-radius:50%; display:grid; place-items:center; color:#07101f; background:var(--accent-2); font-size:34px; font-weight:950; }
    .warning-list .check-mark { background:var(--danger); color:#fff; }
    .check-item h2 { font-size:31px; }
    .check-item p { margin-top:9px; font-size:21px; }
    .timeline-track { position:relative; min-height:440px; display:flex; align-items:center; justify-content:space-between; gap:22px; padding:0 20px; }
    .timeline-line { position:absolute; left:70px; right:70px; top:50%; height:10px; border-radius:10px; background:linear-gradient(90deg,var(--accent),var(--accent-2)); opacity:.55; }
    .timeline-node { position:relative; width:260px; min-height:260px; padding:30px; border-radius:30px; border:2px solid var(--line); background:var(--panel); text-align:center; box-shadow:0 18px 50px rgba(0,0,0,.13); }
    .timeline-node:nth-child(even) { transform:translateY(-82px); }
    .timeline-node:nth-child(odd) { transform:translateY(82px); }
    .timeline-node.is-visible:nth-child(n) { transform:none; }
    .timeline-dot { display:grid; place-items:center; width:68px; height:68px; margin:0 auto 24px; border-radius:50%; background:var(--accent); color:#fff; font-size:27px; font-weight:900; }
    .timeline-node h2 { font-size:30px; }.timeline-node p { font-size:20px; margin-top:12px; }
    .metaphor-machine { width:720px; margin:0 auto; }
    .machine-window { position:relative; height:390px; overflow:hidden; border:16px solid var(--panel); border-radius:90px 90px 44px 44px; background:linear-gradient(145deg,rgba(91,140,255,.16),rgba(73,226,173,.1)); box-shadow:inset 0 0 70px rgba(91,140,255,.12),0 30px 70px rgba(0,0,0,.2); }
    .machine-glow { position:absolute; width:230px; height:230px; left:50%; top:50%; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(circle,rgba(73,226,173,.24),transparent 70%); }
    .metaphor-token { position:absolute; z-index:2; display:grid; place-items:center; min-width:145px; height:88px; padding:0 24px; border-radius:999px; color:#fff; background:linear-gradient(145deg,var(--accent),#7b5cff); font-size:24px; font-weight:850; }
    .token-1 { left:70px; top:70px; }.token-2 { right:65px; top:95px; }.token-3 { left:260px; bottom:56px; }.token-4 { left:60px; bottom:42px; }.token-5 { right:58px; bottom:38px; }
    .machine-base { height:80px; border-radius:20px 20px 48px 48px; background:var(--panel); border:3px solid var(--line); position:relative; }
    .machine-base span,.machine-base b,.machine-base i { position:absolute; top:25px; width:26px; height:26px; border-radius:50%; background:var(--danger); }.machine-base span { left:70px; }.machine-base b { left:112px; background:#ffd75b; }.machine-base i { left:154px; background:var(--accent-2); }
    .map-frame { position:relative; width:100%; height:600px; border-radius:42px; overflow:hidden; border:2px solid var(--line); background:color-mix(in srgb,var(--panel) 92%,var(--accent)); box-shadow:0 24px 70px rgba(0,0,0,.15); }
    .map-surface { position:absolute; inset:-100px; cursor:grab; touch-action:none; }.map-surface:active { cursor:grabbing; }.map-surface svg { position:absolute; inset:0; width:100%; height:100%; }.map-surface path { fill:none; stroke:var(--line); stroke-width:15; stroke-linecap:round; }.map-surface path.river { stroke:var(--accent); opacity:.35; stroke-width:28; }
    .map-pin { position:absolute; display:flex; align-items:center; gap:13px; }.map-pin i { width:32px; height:42px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); background:var(--danger); box-shadow:0 8px 22px rgba(255,107,114,.35); }.map-pin span { padding:10px 16px; border-radius:12px; background:var(--panel); font-size:22px; font-weight:850; white-space:nowrap; box-shadow:0 8px 24px rgba(0,0,0,.16); }
    .map-empty { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; }.map-empty b { font-size:44px; }.map-empty span { font-size:24px; color:var(--muted); }
    .summary-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:25px; }.summary-card { min-height:170px; padding:34px; border-radius:30px; background:var(--panel); border:2px solid var(--line); display:flex; flex-direction:column; justify-content:center; }.summary-card small { color:var(--accent); font-size:20px; font-weight:850; }.summary-card strong { margin-top:12px; font-size:34px; }
  `;
}

function runtimeScript(scene: SceneSpec, maxStep: number): string {
  const timings = Array.from({ length: maxStep }, (_, index) => {
    const motionStep = scene.motionSequence[index];
    if (typeof motionStep?.atMs === 'number') return motionStep.atMs;
    if (maxStep <= 1) return 0;
    return Math.round((scene.duration * 1000 * index) / maxStep);
  });
  const soundCues = scene.sound.map((cue, index) => typeof cue === 'string'
    ? { preset: cue, step: index + 1, volume: 0.25, delayMs: 0 }
    : { preset: String(cue?.preset || 'pop'), step: cue?.step ?? index + 1, volume: cue?.volume ?? 0.25, delayMs: cue?.delayMs ?? 0 });

  return `(() => {
    const MAX_STEP = ${maxStep};
    const TIMINGS = ${safeJson(timings)};
    const SOUNDS = ${safeJson(soundCues)};
    let mode = ${safeJson(scene.interaction.mode)};
    let currentStep = 0;
    let timers = [];
    let audioContext = null;
    const viewport = document.getElementById('viewport');
    const stage = document.getElementById('stage');

    function resize() {
      const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      viewport.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
    }

    function context() {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      return audioContext;
    }

    function tone(frequency, duration, type, volume, delay) {
      const ctx = context();
      const start = ctx.currentTime + (delay || 0);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume || 0.08), start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.03);
    }

    function playSound(step) {
      const cue = SOUNDS.find((item) => item.step === step);
      if (!cue) return;
      const delay = (cue.delayMs || 0) / 1000;
      const volume = Math.min(0.45, Math.max(0.02, cue.volume || 0.2));
      if (cue.preset.includes('impact')) { tone(86, .2, 'sine', volume, delay); tone(170, .12, 'square', volume * .3, delay); }
      else if (cue.preset.includes('success')) { tone(523, .14, 'sine', volume * .5, delay); tone(784, .24, 'sine', volume * .6, delay + .12); }
      else if (cue.preset.includes('line') || cue.preset.includes('whoosh')) { tone(260, .18, 'sine', volume * .35, delay); tone(610, .22, 'sine', volume * .25, delay + .08); }
      else if (cue.preset.includes('tick')) { tone(880, .055, 'square', volume * .18, delay); }
      else { tone(440, .085, 'sine', volume * .25, delay); }
    }

    function countUp(element) {
      if (element.dataset.counted === 'true') return;
      element.dataset.counted = 'true';
      const target = Number(element.dataset.countTo);
      const decimals = Number(element.dataset.countDecimals || 0);
      const startedAt = performance.now();
      const duration = 1050;
      function frame(now) {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = (target * eased).toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function notify() {
      parent.postMessage({ source: 'lecture-motion-scene', type: 'state', sceneId: ${safeJson(scene.sceneId)}, currentStep, maxStep: MAX_STEP, mode }, '*');
    }

    function reveal(step) {
      document.querySelectorAll('[data-step="' + step + '"]').forEach((element) => {
        element.classList.add('is-visible');
        element.querySelectorAll('[data-count-to]').forEach(countUp);
        if (element.matches('[data-count-to]')) countUp(element);
      });
      playSound(step);
      currentStep = Math.max(currentStep, step);
      notify();
    }

    function next() {
      if (currentStep >= MAX_STEP) return;
      reveal(currentStep + 1);
    }

    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      currentStep = 0;
      document.querySelectorAll('[data-step]').forEach((element) => element.classList.remove('is-visible'));
      document.querySelectorAll('[data-count-to]').forEach((element) => { element.textContent = '0'; delete element.dataset.counted; });
      notify();
    }

    function playTimed() {
      reset();
      mode = 'TIMED';
      TIMINGS.forEach((at, index) => timers.push(setTimeout(() => reveal(index + 1), Math.max(0, at) + 320)));
      notify();
    }

    let pointerStart = null;
    let dragged = false;
    let dragTarget = null;
    let dragOffset = { x: 0, y: 0 };
    stage.addEventListener('pointerdown', (event) => {
      pointerStart = { x: event.clientX, y: event.clientY };
      dragged = false;
      dragTarget = event.target.closest('[data-draggable="true"]');
      if (dragTarget) dragTarget.setPointerCapture?.(event.pointerId);
    });
    stage.addEventListener('pointermove', (event) => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.hypot(dx, dy) > 8) dragged = true;
      if (dragged && dragTarget) {
        dragTarget.style.translate = (dragOffset.x + dx) + 'px ' + (dragOffset.y + dy) + 'px';
      }
    });
    stage.addEventListener('pointerup', (event) => {
      if (dragged && dragTarget && pointerStart) {
        dragOffset.x += event.clientX - pointerStart.x;
        dragOffset.y += event.clientY - pointerStart.y;
      } else if (!dragged && mode === 'CLICK') {
        next();
      }
      pointerStart = null;
      dragTarget = null;
    });
    stage.addEventListener('pointercancel', () => { pointerStart = null; dragTarget = null; });
    window.addEventListener('keydown', (event) => {
      if (mode === 'CLICK' && (event.code === 'Space' || event.code === 'ArrowRight')) { event.preventDefault(); next(); }
      if (event.code === 'KeyR') reset();
    });
    window.addEventListener('message', (event) => {
      const message = event.data || {};
      if (message.source !== 'lecture-motion-director') return;
      if (message.command === 'next') next();
      if (message.command === 'reset') reset();
      if (message.command === 'play') playTimed();
      if (message.command === 'setMode') { mode = message.mode === 'TIMED' ? 'TIMED' : 'CLICK'; reset(); if (mode === 'TIMED') playTimed(); }
    });
    window.addEventListener('resize', resize);
    resize();
    reset();
    if (mode === 'TIMED') setTimeout(playTimed, 380);
    parent.postMessage({ source: 'lecture-motion-scene', type: 'ready', sceneId: ${safeJson(scene.sceneId)}, maxStep: MAX_STEP, mode }, '*');
  })();`;
}

export function renderSceneHtml(scene: SceneSpec): RenderOutput {
  const warnings: string[] = [];
  if (scene.renderMode === 'CUSTOM') warnings.push('CUSTOM 장면은 v1 안전 모드에서 지원 가능한 Component로 대체됩니다.');
  const markup = buildMarkup(scene, warnings);
  const content = asRecord(scene.content);
  const theme = text(scene.composition.background, 'dark_grid').toLowerCase();
  const title = text(content.title, scene.title || scene.sceneId);
  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <title>${escapeHtml(title)}</title>
  <style>${sceneCss(theme)}</style>
</head>
<body>
  <main id="viewport">
    <section id="stage" class="stage theme-${escapeHtml(theme)}" aria-label="${escapeHtml(title)}">
      ${markup.body}
    </section>
  </main>
  <script type="application/json" id="scene-spec">${safeJson(scene)}</script>
  <script>${runtimeScript(scene, markup.maxStep)}<\/script>
</body>
</html>`;
  return { html, warnings };
}
