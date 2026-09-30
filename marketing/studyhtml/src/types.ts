export type RenderMode = 'STANDARD' | 'CREATIVE' | 'CUSTOM';
export type InteractionMode = 'CLICK' | 'TIMED';

export type VisualGrammar =
  | 'PROCESS'
  | 'FLOW'
  | 'BIG_NUMBER'
  | 'TIME_COMPRESSION'
  | 'STATISTICS'
  | 'COMPARISON'
  | 'TIMELINE'
  | 'CHECKLIST'
  | 'WARNING'
  | 'SUMMARY'
  | 'METAPHOR'
  | 'MAP'
  | 'CUSTOM_DIAGRAM';

export interface MotionAction {
  type: string;
  targetId?: string;
  motion?: string;
  durationMs?: number;
  delayMs?: number;
  value?: string | number;
}

export interface MotionStep {
  step?: number;
  stepId?: string;
  order?: number;
  atMs?: number;
  label?: string;
  action?: string;
  actions?: MotionAction[];
}

export interface SoundCue {
  preset: string;
  step?: number;
  volume?: number;
  delayMs?: number;
}

export interface SceneSpec {
  sceneId: string;
  segmentId: string;
  title?: string;
  sourceText: string;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  visualIntent: string;
  visualGrammar: VisualGrammar | string;
  renderMode: RenderMode;
  composition: {
    layoutStrategy?: string;
    layout?: string;
    background?: string;
    mainElement?: string;
    supportElements?: string[];
    elements?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  content: Record<string, unknown>;
  motionSequence: MotionStep[];
  interaction: {
    mode: InteractionMode;
    dragTargets?: string[];
    [key: string]: unknown;
  };
  sound: Array<string | SoundCue>;
  assets?: Array<Record<string, unknown>>;
  fallback?: Record<string, unknown>;
}

export interface SegmentSpec {
  segmentId: string;
  sourceText: string;
  startTime: string | null;
  endTime: string | null;
  recommendedMedia: string;
  selectionReason?: string;
}

export interface ProjectSpec {
  schemaVersion: string;
  catalogVersion: string;
  project: {
    projectId: string;
    title: string;
    locale: string;
    aspectRatio: '16:9';
    designPreset?: string;
  };
  segments?: SegmentSpec[];
  scenes: SceneSpec[];
}

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export type RenderStatus = 'queued' | 'rendering' | 'ready' | 'warning' | 'error';

export interface RenderedScene {
  scene: SceneSpec;
  html: string;
  status: RenderStatus;
  warnings: string[];
  error?: string;
  included: boolean;
  updatedAt: string;
}
