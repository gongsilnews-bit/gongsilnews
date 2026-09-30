import type { ProjectSpec, SceneSpec, ValidationIssue } from './types';

const REQUIRED_SCENE_FIELDS: Array<keyof SceneSpec> = [
  'sceneId',
  'segmentId',
  'sourceText',
  'startTime',
  'endTime',
  'duration',
  'visualIntent',
  'visualGrammar',
  'renderMode',
  'composition',
  'content',
  'motionSequence',
  'interaction',
  'sound',
];

const RENDER_MODES = new Set(['STANDARD', 'CREATIVE', 'CUSTOM']);
const INTERACTION_MODES = new Set(['CLICK', 'TIMED']);
const SUPPORTED_GRAMMARS = new Set([
  'PROCESS',
  'FLOW',
  'BIG_NUMBER',
  'TIME_COMPRESSION',
  'STATISTICS',
  'COMPARISON',
  'TIMELINE',
  'CHECKLIST',
  'WARNING',
  'SUMMARY',
  'METAPHOR',
  'MAP',
  'CUSTOM_DIAGRAM',
]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateScene(scene: unknown, index = 0): ValidationIssue[] {
  const prefix = `scenes[${index}]`;
  if (!isObject(scene)) {
    return [{ path: prefix, message: '장면이 객체가 아닙니다.', severity: 'error' }];
  }

  const issues: ValidationIssue[] = [];
  for (const field of REQUIRED_SCENE_FIELDS) {
    if (!(field in scene)) {
      issues.push({ path: `${prefix}.${field}`, message: '필수 필드가 없습니다.', severity: 'error' });
    }
  }

  if (typeof scene.sceneId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(scene.sceneId)) {
    issues.push({ path: `${prefix}.sceneId`, message: '영문, 숫자, _, - 조합의 ID가 필요합니다.', severity: 'error' });
  }
  if (typeof scene.segmentId !== 'string' || !scene.segmentId.trim()) {
    issues.push({ path: `${prefix}.segmentId`, message: '원본 Segment ID가 필요합니다.', severity: 'error' });
  }
  if (typeof scene.sourceText !== 'string' || !scene.sourceText.trim()) {
    issues.push({ path: `${prefix}.sourceText`, message: '원본 대본 문장이 필요합니다.', severity: 'error' });
  }
  if (typeof scene.duration !== 'number' || scene.duration <= 0 || scene.duration > 120) {
    issues.push({ path: `${prefix}.duration`, message: 'duration은 0초 초과, 120초 이하 숫자여야 합니다.', severity: 'error' });
  }
  if (typeof scene.visualIntent !== 'string' || !scene.visualIntent.trim()) {
    issues.push({ path: `${prefix}.visualIntent`, message: '장면의 시각적 목적이 필요합니다.', severity: 'error' });
  }
  if (typeof scene.visualGrammar !== 'string' || !SUPPORTED_GRAMMARS.has(scene.visualGrammar)) {
    issues.push({ path: `${prefix}.visualGrammar`, message: '지원 목록에 없는 시각 문법입니다.', severity: 'warning' });
  }
  if (typeof scene.renderMode !== 'string' || !RENDER_MODES.has(scene.renderMode)) {
    issues.push({ path: `${prefix}.renderMode`, message: 'STANDARD, CREATIVE, CUSTOM 중 하나여야 합니다.', severity: 'error' });
  }
  if (!isObject(scene.composition)) {
    issues.push({ path: `${prefix}.composition`, message: 'composition은 객체여야 합니다.', severity: 'error' });
  }
  if (!isObject(scene.content)) {
    issues.push({ path: `${prefix}.content`, message: 'content는 객체여야 합니다.', severity: 'error' });
  }
  if (!Array.isArray(scene.motionSequence) || scene.motionSequence.length === 0) {
    issues.push({ path: `${prefix}.motionSequence`, message: '한 개 이상의 Motion Step이 필요합니다.', severity: 'error' });
  } else {
    scene.motionSequence.forEach((step, stepIndex) => {
      if (!isObject(step)) {
        issues.push({ path: `${prefix}.motionSequence[${stepIndex}]`, message: 'Motion Step은 객체여야 합니다.', severity: 'error' });
      }
    });
  }
  if (!isObject(scene.interaction) || !INTERACTION_MODES.has(String(scene.interaction.mode))) {
    issues.push({ path: `${prefix}.interaction.mode`, message: 'CLICK 또는 TIMED가 필요합니다.', severity: 'error' });
  }
  if (!Array.isArray(scene.sound)) {
    issues.push({ path: `${prefix}.sound`, message: 'sound는 배열이어야 합니다.', severity: 'error' });
  } else {
    scene.sound.forEach((cue, soundIndex) => {
      if (typeof cue !== 'string' && (!isObject(cue) || typeof cue.preset !== 'string')) {
        issues.push({ path: `${prefix}.sound[${soundIndex}]`, message: '효과음은 문자열 또는 preset을 가진 객체여야 합니다.', severity: 'error' });
      }
    });
  }
  if (scene.startTime === null || scene.endTime === null) {
    issues.push({ path: `${prefix}.startTime`, message: '타임코드가 없어도 생성할 수 있지만 영상 자동 배치는 제한됩니다.', severity: 'warning' });
  }
  if (scene.renderMode === 'CUSTOM') {
    issues.push({ path: `${prefix}.renderMode`, message: 'CUSTOM은 현재 안전한 기본 장면으로 대체 렌더링됩니다.', severity: 'warning' });
  }
  return issues;
}

export function parseProjectSpec(raw: string): {
  project?: ProjectSpec;
  issues: ValidationIssue[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      issues: [{
        path: '$',
        message: `JSON 문법 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        severity: 'error',
      }],
    };
  }

  if (!isObject(parsed)) {
    return { issues: [{ path: '$', message: '최상위 값은 객체여야 합니다.', severity: 'error' }] };
  }

  // 초기 ChatGPT 결과가 { scenes: [...] }만 반환해도 로컬 프로젝트 기본값을 보완합니다.
  const normalized: Record<string, unknown> = {
    schemaVersion: parsed.schemaVersion ?? '1.0.0',
    catalogVersion: parsed.catalogVersion ?? '1.0.0',
    project: parsed.project ?? {
      projectId: `lecture-${Date.now()}`,
      title: '새 강의 모션 프로젝트',
      locale: 'ko-KR',
      aspectRatio: '16:9',
      designPreset: 'lecture-modern',
    },
    segments: parsed.segments,
    scenes: parsed.scenes,
  };

  const issues: ValidationIssue[] = [];
  if (normalized.schemaVersion !== '1.0.0') {
    issues.push({ path: 'schemaVersion', message: '현재 지원 버전은 1.0.0입니다.', severity: 'warning' });
  }
  if (!isObject(normalized.project)) {
    issues.push({ path: 'project', message: 'project 정보가 객체가 아닙니다.', severity: 'error' });
  }
  if (!Array.isArray(normalized.scenes) || normalized.scenes.length === 0) {
    issues.push({ path: 'scenes', message: '한 개 이상의 Scene이 필요합니다.', severity: 'error' });
  } else {
    normalized.scenes.forEach((scene, index) => issues.push(...validateScene(scene, index)));
    const ids = new Set<string>();
    normalized.scenes.forEach((scene, index) => {
      if (!isObject(scene) || typeof scene.sceneId !== 'string') return;
      if (ids.has(scene.sceneId)) {
        issues.push({ path: `scenes[${index}].sceneId`, message: '중복된 Scene ID입니다.', severity: 'error' });
      }
      ids.add(scene.sceneId);
    });
  }

  if (issues.some((issue) => issue.severity === 'error')) return { issues };
  return { project: normalized as unknown as ProjectSpec, issues };
}
