// 영상 편집기 자료 모양 — 앱(studio-app/src/video/project.js)과 같다
export type Ratio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3";
export type Method = "text" | "video" | "longform" | "record";
export type Fill = "cover" | "contain" | "blur";
// 사진 움직임 (브루처럼) — auto = 사진 클립 차례대로 줌인·좌→우·줌아웃·우→좌·위→아래 를 돌려 쓴다
export type Motion = "auto" | "none" | "zoomIn" | "zoomOut" | "leftRight" | "rightLeft" | "topBottom" | "bottomTop";
export type MotionPower = "low" | "mid" | "high";
// 사진 올리기·화면 글자 애니메이션 (브루처럼) — 등장·퇴장 / 강조 / 확대. auto = 레이어 차례대로 돌려 쓰기
export type AnimIn = "auto" | "fade" | "fly" | "zoom" | "pop" | "spin" | "flip" | "roll" | "drop" | "slideL" | "slideR" | "big" | "stretch" | "swing" | "jelly";
export type LayerAnim = {
  in?: AnimIn; out?: AnimIn; emph?: "pulse" | "shake" | "blink" | "float" | "sway" | "bounce" | "beat" | "wiggle"; grow?: "grow" | "shrink"; dur?: number /* 등장·퇴장 걸리는 초 (기본 0.5) */;
  // 효과음 — 나타날 때 (auto = 효과에 맞게, none = 없음, 그 밖 = 소리 이름 public/studio-sfx). 없으면 사진·글자는 자동, 자막은 없음
  sfx?: string; sfxVol?: number /* 0~1, 기본 0.6 */; sfxOut?: boolean /* 사라질 때도 */;
};

export type Word = { w: string; s: number; e: number; del?: boolean; o?: [number, number] /* 상세 편집 전 처음 시각 (↺ 처음대로) */; v?: string /* AI 목소리 — 이 단어만 다른 목소리 (클립은 그대로, 소리 안에서 잇는다) */ };

export type Asset = {
  id: string;
  path: string;
  edit?: string;
  url: string;
  thumb?: string;
  kind: "video" | "image" | "audio";
  name: string;
  duration: number;
  width: number;
  height: number;
  hasAudio?: boolean;
  source?: string;
  credit?: string;
  missing?: boolean;
};

export type Clip = {
  id: string;
  type: "source" | "silence" | "voice";
  text: string;
  words?: Word[];
  src?: { asset: string; s: number; e: number };
  trans?: { type: string; a: number; b: number }; // 앞 클립에서 이 클립으로 넘어가는 화면전환 — 앞 클립 끝 a초 + 이 클립 시작 b초 (transitions.ts)
  cuts?: { s: number; e: number }[]; // 무음 줄이기로 건너뛰는 구간 (원본 시각) — 원래대로 하면 지운다
  voice?: { file: string; url?: string; duration: number; id: string; text: string } | null;
  voiceId?: string; // 클립만 다른 목소리
  speed?: number; // 클립만 다른 빠르기 (AI 목소리 클립: 목소리 빠르기 / 촬영 클립: 영상·소리 빠르기 0.5~2)
  pad?: number; // AI 목소리 클립 끝에 더 머무는 시간 (초) — 클립 길이를 늘릴 때
  visual?: { asset: string; s: number } | null; // 화면 자료 (글 클립 배경 · 촬영 클립 화면 바꾸기)
  hold?: number; // 목소리 없을 때 길이
  fitLen?: number; // 영상 위에 AI 목소리를 얹은 클립 — 이 길이(영상 구간)에 맞춘다 (목소리가 짧으면 끝에 머물기 pad)
  fill?: Fill;
  box?: { x: number; y: number; w: number }; // 화면 직접 크기 — 가운데 자리(0~1)·폭(화면 폭 비율). 있으면 채우기 대신 이 자리에
  flipX?: boolean; // 화면 좌우 반전
  flipY?: boolean; // 화면 상하 반전
  motion?: Motion; // 사진 움직임 — 없으면 전체 설정(settings.motion, 기본 자동)
  motionPower?: MotionPower; // 움직임 크기 (기본 보통)
  muted?: boolean;
  volume?: number;
  visualVolume?: number; // 첨부한 화면 영상의 소리 (0~2, 없으면 0 = 무음) — 원본 메인 소리(말소리·AI 목소리)와 섞인다
  sub?: boolean;
  subStyle?: Partial<SubtitleSettings>; // 이 클립만 따로 바꾼 메인자막 서식 (바꾼 항목만, 나머지는 전체 서식)
  subText?: string; // 자막만 따로 쓴 글 (말소리·목소리는 그대로). 무음 클립에도 자막을 넣을 수 있다
  del?: boolean;
  hint?: { desc?: string; keywords?: string; kind?: string };
};

export type Scene = { id: string; title?: string; clips: Clip[] };

/**
 * 애셋(레이어) — 브루처럼 "클립 몇 번부터 몇 번까지"에 붙는 음악·사진·화면 글자.
 * 범위를 클립으로 잡아서 단어를 지우거나 클립 길이가 바뀌어도 저절로 따라간다.
 */
export type LayerType = "music" | "image" | "text" | "sfx"; // sfx = 효과음 (그 클립·단어 시작에 한 번, 회의 3-29)
export type Layer = {
  id: string;
  type: LayerType;
  from: string; // 시작 클립 id
  to: string; // 끝 클립 id
  // 단어 구간 (브루 [삽입]처럼) — 있으면 from 클립의 w0번째 단어부터 w1번째 단어를 말하는 동안만 나온다
  w0?: number;
  w1?: number;
  name?: string;
  // 음악
  file?: string;
  url?: string;
  volume?: number; // 0~1
  fadeIn?: number; // 초
  fadeOut?: number; // 초
  offset?: number; // 음악 시작 지점 (초)
  loop?: boolean;
  // 사진
  asset?: string;
  sfx?: string; // 효과음 이름 (public/studio-sfx · studio-app/src/video/sfx 의 파일 이름)
  sticker?: boolean; // [삽입] → 스티커로 넣은 것 (사진 레이어와 같이 그리고, 이름·아이콘만 "스티커")
  stk?: { style: string; text: string; icon?: string; color?: string }; // 스티커 모양 — 넣은 뒤 글자를 고치면 이것으로 다시 그린다
  /** 굽기 때만 (저장 안 함) — 클립마다 애니메이션 칸 그림: dir 폴더의 00000.png… , s0(클립 안 시작 초), x·y(왼쪽 위) */
  bake?: Record<string, { dir: string; s0: number; n: number; x: number; y: number }>;
  x?: number; // 가운데 위치 0~1
  y?: number;
  w?: number; // 화면 폭에 대한 비율 0~1
  opacity?: number; // 0~1
  off?: boolean; // 레이어 끄기 (보이기·듣기) — 설정은 그대로
  anim?: LayerAnim; // 사진·화면 글자 애니메이션
  fit?: "free" | "contain" | "cover"; // free(기본) = x·y·w 자리 / contain = 비율 유지하며 채우기 / cover = 잘라서 채우기
  flipX?: boolean;
  flipY?: boolean;
  // 화면 글자
  text?: string;
  pos?: "top" | "middle" | "bottom";
  size?: number; // 100 = 기본
  color?: string;
  font?: string; // 글꼴 이름 (src/lib/studio-video/fonts.ts)
  box?: boolean; // 글자 뒤 상자
  boxColor?: string;
  boxOpacity?: number; // 0~1
  // 화면 글자 모양 더 (메인자막과 같은 이름, 회의 3-28) — 없으면 예전대로 (테두리 4, 검정/흰색 자동)
  outline?: string;
  outlineWidth?: number;
  bold?: boolean;
  shadow?: number; // 그림자 거리 (글자 크기 비율)
  shadowColor?: string;
  glow?: string; // 빛 색 ("" = 없음)
  spacing?: number; // 자간 (글자 크기 비율)
  italic?: boolean;
  underline?: boolean;
  textCase?: "upper" | "lower" | "title";
  align?: "left" | "center" | "right";
  textAlpha?: number;
  outlineAlpha?: number;
  bgPad?: number;
  shadowAlpha?: number;
  glowSize?: number;
  glowAlpha?: number;
};

export type SubtitleSettings = {
  on: boolean; position: "top" | "middle-high" | "middle" | "middle-low" | "bottom"; /* middle-high = 중상단 (위에서 24%, 중하단과 짝) */ length: "long" | "short"; size: number; font: string; color: string; outline: string; outlineWidth: number; bg: boolean; bgColor?: string; bgOpacity?: number; bold: boolean;
  x?: number; y?: number; // 미리보기에서 끌어 옮긴 자리 (가운데 기준 0~1). 있으면 position 대신
  posAuto?: boolean; // 위치 자동 — 영상 비율에 맞춰 (세로 9:16·4:5 = 중하단, 나머지 = 하단). 비율을 바꾸면 따라간다
  wrap?: number; // 줄 너비 (1 = 기본, 0.3~1) — 한 줄 글자 수를 그만큼 줄인다
  spacing?: number; // 자간 — 글자 크기에 대한 비율 (-0.1~0.5, 0 = 기본)
  leading?: number; // 행간 — 줄 높이 = 글자 크기 × 이 값 (0.9~2.5, 없으면 1.25)
  italic?: boolean; // 기울임 (패턴 I)
  underline?: boolean; // 밑줄 (패턴 U)
  textCase?: "upper" | "lower" | "title"; // 대소문자 TT · tt · Tt (영어만)
  align?: "left" | "center" | "right"; // 정렬 (없으면 가운데)
  textAlpha?: number; // 글자 투명도 0~1 (0 = 진하게)
  outlineAlpha?: number; // 테두리 투명도 0~1 (0 = 진하게)
  bgPad?: number; // 상자 두께 (글자 둘레 여백 배수, 기본 1)
  shadowAlpha?: number; // 그림자 투명도 0~1 (0 = 진하게)
  glowSize?: number; // 빛 두께 (번지는 크기 배수, 기본 1)
  glowAlpha?: number; // 빛 투명도 0~1
  shadow?: number; // 그림자 거리 — 글자 크기에 대한 비율 (0 = 없음, 0.06 안팎) · 상자일 때는 안 씀
  shadowColor?: string;
  glow?: string; // 네온 빛 색 ("" = 없음) — 테두리를 그 색으로 번지게 (사전 설정 스타일, 2026-10-18)
  anim?: LayerAnim; // 메인자막 애니메이션 — 자막 한 줄(조각)마다 나타나고 사라질 때
};

export type Settings = {
  fill: Fill;
  subtitle: SubtitleSettings;
  voice: { id: string; speed: number; volume: number; gap?: number /* 문장 사이 쉼 (초, 기본 0.4) */ };
  music: { on: boolean; mood?: string; file: string; url?: string; name: string; volume: number };
  sourceVolume: number;
  /** 사진 자동 움직임 — "none" 이면 끔 (클립에서 따로 고른 움직임은 그대로). 없으면 자동 */
  motion?: "auto" | "none";
  /** 레이어 켜고 끄기 (프리미어의 눈·스피커) — 클립마다 맞춘 값은 그대로 두고 이것만 켜고 끈다 */
  off?: { visual?: boolean; source?: boolean; voice?: boolean };
};

export type Project = {
  v: number;
  id: string;
  name: string;
  file?: string; // .gss 파일 위치 (예전 폴더 방식이면 없음) — dir 은 보이지 않는 작업 폴더
  savedAt?: string; // 마지막으로 [저장]한 시각 (비면 한 번도 저장 안 한 새 프로젝트)
  method: Method;
  ratio: Ratio;
  vacancyId?: string;
  createdAt: string;
  updatedAt: string;
  settings: Settings;
  assets: Record<string, Asset>;
  scenes: Scene[];
  layers?: Layer[];
  /** 1 = 겹치는 순서를 layers 배열 순서 그대로 (뒤→앞, 스티커·사진·화면 글자 함께). 없으면 예전대로 사진 먼저·글자 위 (회의 3-26) */
  layerZ?: number;
  dir: string;
  duration?: number;
  thumb?: string;
};

export type LibItem = { id: string; path?: string; name: string; kind: "video" | "image" | "audio"; source: string; fav: boolean; credit?: string; duration: number; width: number; height: number; url: string; thumb: string; ready: boolean };
/** .gss 를 열 때 저장 안 한 고친 내용이 남아 있으면 — [이어서 열기 / 마지막 저장 상태로] 를 묻는다 */
export type Recover = { recover: true; file: string; name: string };
export const isRecover = (x: unknown): x is Recover => Boolean(x && (x as Recover).recover);
export type Folders = { projectDir: string; recordDir: string; exportDir: string; defaults: { projectDir: string; recordDir: string; exportDir: string } };
export type TrashItem = { id: string; name: string; from: string; at: string; deletedAt: string; thumb: string; ratio: Ratio; duration: number };
export type Recent = { dir: string; name: string; ratio: Ratio; method: Method; updatedAt: string; thumb: string; duration: number };
export type StockItem = { id: string; kind: "image" | "video"; thumb: string; url: string; width: number; height: number; duration?: number; credit: string; source: string };

/** 위치 자동 — 세로(9:16·4:5)는 쇼츠·릴스 아래쪽 글·단추에 안 가리게 중하단, 나머지는 하단 */
export const autoSubPosition = (r?: string): "middle-low" | "bottom" => (r === "9:16" || r === "4:5" ? "middle-low" : "bottom");
export const RATIO_SIZE: Record<Ratio, [number, number]> = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350], "4:3": [1440, 1080] };
export const RATIO_LABEL: Record<Ratio, string> = { "16:9": "유튜브", "9:16": "쇼츠·릴스", "1:1": "정방형", "4:5": "인스타그램", "4:3": "클래식" };

/* 앱 통로 (preload gongsilStudio.video) */
export type VideoBridge = {
  lib: {
    list: (o?: { kind?: string; fav?: boolean; q?: string; source?: string }) => Promise<LibItem[]>;
    pick: (o?: { kinds?: "media" | "audio" }) => Promise<(LibItem & { path?: string })[]>;
    fav: (id: string, fav: boolean) => Promise<boolean>;
    remove: (id: string) => Promise<void>;
    folders: () => Promise<string[]>;
    addFolder: () => Promise<string[]>;
    removeFolder: (dir: string) => Promise<string[]>;
    musicFolder: () => Promise<string>;
    /** 편집기에서 그린 그림(PNG data URL)을 프로젝트에 저장 — 스티커 (앱 0.1.10부터) */
    saveImage?: (dir: string, dataUrl: string, name: string) => Promise<LibItem>;
  };
  project: {
    create: (o: { method: Method; ratio: Ratio; name?: string; vacancyId?: string }) => Promise<Project>;
    open: (dir: string, choice?: "work" | "file") => Promise<Project | Recover>;
    openPick: () => Promise<Project | null>;
    save: (p: Project) => Promise<{ updatedAt: string; duration: number }>;
    // .gss 파일 (옛 앱에는 없음)
    flush?: (p: Project) => Promise<{ savedAt: string }>;
    discard?: (p: Project) => Promise<boolean>;
    setDirty?: (v: boolean, dir?: string, file?: string) => Promise<boolean>;
    backup?: (p: Project) => Promise<string>;
    backups?: (p: Project) => Promise<{ file: string; at: string; size: number }[]>;
    closeNow?: () => Promise<boolean>;
    onWantClose?: (fn: () => void) => () => void;
    convert?: (p: Project) => Promise<Project>;
    packageInfo?: (p: Project) => Promise<{ count: number; bytes: number; missing: string[] }>;
    makePackage?: (p: Project) => Promise<{ dir: string; file: string; count: number; bytes: number } | null>;
    relink?: (p: Project, assetId: string) => Promise<{ path: string; edit: string; missing: boolean; url: string } | null>;
    pendingFile?: () => Promise<string>;
    onOpenFile?: (fn: (file: string) => void) => () => void;
    saveAs?: (p: Project, name: string, parent?: string) => Promise<Project>; // 앱 0.1.4부터
    pickFolder?: (title: string, defaultPath?: string) => Promise<string | null>;
    recent: () => Promise<Recent[]>;
    // 저장 폴더 설정 — 비어 있으면 기본 폴더 (옛 앱에는 없음)
    folders?: () => Promise<Folders>;
    setFolders?: (patch: Partial<Omit<Folders, "defaults">>) => Promise<Folders>;
    rename?: (dir: string, name: string) => Promise<string>; // 이름만 바꾸기 (폴더는 그대로, 옛 앱에는 없음)
    // 휴지통 (옛 앱에는 없음)
    trash?: (dir: string) => Promise<string>; // 휴지통 항목 id (되돌리기용)
    trashList?: () => Promise<TrashItem[]>;
    restore?: (id: string) => Promise<string>;
    purge?: (id: string | "all") => Promise<number>;
    addAsset: (libId: string) => Promise<Asset>;
    exportText: (p: Project, kind: "srt" | "txt") => Promise<string>;
  };
  /** 내 목소리 성우 — 앱 0.1.10부터 (없으면 앱을 새로 받아야 함) */
  sttWords?: { add: (pairs: { wrong: string; right: string; context?: string }[]) => Promise<number> }; // 받아쓰기 낱말장 (앱 0.1.10부터)
  myVoice?: {
    status: () => Promise<MyVoiceStatus>;
    install: () => Promise<MyVoiceStatus>;
    record: (bytes: ArrayBuffer, text: string) => Promise<MyVoiceStatus>;
    file: () => Promise<MyVoiceStatus | null>;
    sample: () => Promise<MyVoiceStatus>;
    remove: () => Promise<MyVoiceStatus>;
    update?: (patch: { name?: string; text?: string }) => Promise<MyVoiceStatus>;
    onProgress: (fn: (text: string, frac: number) => void) => () => void;
  };
  voiceJoin?: (dir: string, files: string[]) => Promise<{ file: string; url: string; duration: number }>; // 앱 0.1.8부터
  voice: (dir: string, text: string, voiceId: string, opts?: { fresh?: boolean }) => Promise<{ file: string; url: string; duration: number; id: string; text: string; words: Word[] }>;
  transcribe: (p: Project, assetId: string) => Promise<{ clips: Clip[] }>;
  // 무음 줄이기 — 영상별 실제 말소리 구간 (PC에서, 옛 앱에는 없음)
  speech?: (p: Project, assetIds: string[]) => Promise<Record<string, { s: number; e: number }[]>>;
  // 상세 편집 — 원본 영상 소리 파형 (1초 rate 칸, data = 0~255 base64, 앱 0.1.8부터)
  peaks?: (p: Project, assetId: string) => Promise<{ rate: number; data: string }>;
  // 자막 시각 맞추기 — 글은 그대로, 단어 시각만 실제 말소리에 (무료, 옛 앱에는 없음)
  realign?: (p: Project, items: { id: string; asset: string; s: number; e: number; text: string }[]) => Promise<{ id: string; words: Word[] }[]>;
  // 자동 자막 — 지금 클립은 그대로, 글만 채우기 (옛 앱에는 없음)
  transcribeClips?: (p: Project, targets: { id: string; asset: string; s: number; e: number }[]) => Promise<{ id: string; text: string; words: Word[]; sents?: { text: string; s: number; e: number; words: Word[] }[] }[]>;
  split?: (p: Project, assetId: string) => Promise<{ clips: Clip[] }>; // 받아쓰기 없이 말소리 구간으로만 (무료, 앱 0.1.4부터)
  ai: {
    script: (o: { topic?: string; style?: string; request?: string; chars?: number; vacancy?: unknown; source?: string }) => Promise<{ title?: string; scenes: { title: string; lines: { text: string; desc: string; keywords: string; kind: string }[] }[] }>;
    scenes: (lines: string[]) => Promise<{ desc: string; keywords: string; kind: string }[]>;
    shorts: (clips: Clip[], o: { count: number; maxSec: number; request?: string }) => Promise<{ title: string; start: number; end: number; reason: string }[]>;
    /** 대본 + 내 영상 → 문장마다 장면 (v: 자료 번호, -1 = 없음 · t: 시작 초). 앱 0.1.10부터 */
    footage?: (lines: string[], items: { path: string; kind: string; duration: number }[]) => Promise<{ v: number; t: number }[]>;
    /** [AI 편집] 글 AI 의 편집 계획 — 앱 0.1.10부터 */
    edit?: (lines: string[], items: { path: string; kind: string; duration: number }[], opts: { aiMax: number; moods: string[] }) => Promise<{
      music: string;
      clips: { act: "keep" | "foot" | "ai" | "stock" | "same"; v?: number; t?: number; desc?: string; keywords?: string; title?: string; emph?: boolean; trans?: boolean }[];
    }>;
    image: (dir: string, prompt: string) => Promise<LibItem>;
    /** [씬 정리] 클립 글 → 씬 나누기 (from = 시작 클립 번호, 1부터) — 앱 0.1.10부터 */
    group?: (lines: string[]) => Promise<{ title: string; from: number }[]>;
  };
  vacancy: (id: string) => Promise<{ vacancy: { title?: string; fields?: { label: string; value: string }[] }; photos: LibItem[] }>;
  stock: {
    search: (q: string, type: "photo" | "video", orientation: string, page?: number) => Promise<{ success: boolean; items?: StockItem[]; error?: string; needKey?: boolean }>;
    get: (dir: string, item: StockItem) => Promise<LibItem>;
  };
  musicGet: (dir: string, rel: string) => Promise<{ file: string; url: string }>;
  musicUse: (dir: string, libId: string) => Promise<{ file: string; url: string; name: string }>;
  fonts: { ensure: (family: string) => Promise<{ family: string; url: string }> };
  render: (p: Project, o?: { scope?: string; sceneId?: string; clipIds?: string[]; height?: number }) => Promise<{ file: string; seconds: number; took: number; encoder: string }>;
  /** 애니메이션 칸 그림 저장 (투명 PNG data URL 들) → 폴더 경로. 앱 0.1.10부터 */
  animFrames?: (dir: string, key: string, start: number, urls: string[]) => Promise<string>;
  renderCancel: (id: string) => Promise<void>;
  /** 예전 앱(0.1.9 이하)은 파일 경로(string)만, 범위(opts)도 무시 */
  exportAudio: (p: Project, kind: "mp3" | "wav", o?: { scope?: string; sceneId?: string; clipIds?: string[] }) => Promise<string | { file: string; seconds: number; took: number }>;
  snapshot: (p: Project, file: string, at: number) => Promise<string>;
  record: {
    sources: () => Promise<{ id: string; name: string; thumb: string }[]>;
    choose: (id: string) => Promise<boolean>;
    start: (name: string, opt?: { dir?: string; fileName?: string }) => Promise<string>;
    // 저장할 곳 (옛 앱에는 없음)
    defaultDir?: () => Promise<string>;
    pickDir?: (cur?: string) => Promise<string>;
    chunk: (token: string, buf: ArrayBuffer) => Promise<boolean>;
    stop: (token: string) => Promise<LibItem>;
    // 녹화 중 작게 하기 (옛 앱에는 없음)
    live?: (on: boolean, startedAt?: number, opt?: { console?: boolean }) => Promise<boolean>;
    // 녹화 조정실 창 (앱 0.1.8부터) — drag-start·drag(dx, dy)·opacity(0.3~1)·min·max(→ 크게인지)·show
    console?: (act: "drag-start" | "drag" | "opacity" | "min" | "max" | "show" | "big" | "place", a?: number, b?: number, c?: number, d?: number, e?: number) => Promise<boolean>;
    // 녹화 중 앱 창을 내렸다·올렸다 — 작은 녹화 창(카톡 크기)을 띄우고 닫으려고 (앱 0.1.8부터)
    onMinimized?: (fn: () => void) => () => void;
    onRestored?: (fn: () => void) => () => void;
    tiny?: () => Promise<boolean>; // [더 작게 하기] — 얇은 막대 (앱 0.1.8부터)
    onTinyExpand?: (fn: () => void) => () => void; // 얇은 막대 [크게 보기] → 작은 창
    minimize?: () => Promise<boolean>;
    onMiniStop?: (fn: () => void) => () => void;
    // 프롬프터 — 녹화하는 모니터 위쪽 대본 창, 녹화에 안 찍힘 (앱 0.1.8부터)
    prompterOpen?: (o: { text: string; cps: number; size: number; opacity: number; mine: { cps: number; size: number } | null; startAt: number; rehearse?: boolean }) => Promise<boolean>;
    prompterClose?: () => Promise<boolean>;
    prompterShow?: () => Promise<boolean>;
    onPrompterClosed?: (fn: () => void) => () => void;
    onPrompterPrefs?: (fn: (o: { cps: number; size: number; opacity?: number; mine: { cps: number; size: number } | null }) => void) => () => void;
  };
  showFile: (file: string) => Promise<void>;
  openSettings?: (what: "camera" | "microphone") => Promise<void>; // 윈도우 설정 화면 (옛 앱에는 없음)
  openDeviceSettings?: (what: "camera" | "microphone") => Promise<void>; // 윈도우 장치 설정 — 밝기·쓸 장치·입력 크기 (앱 0.1.8부터)
  openPath: (p: string) => Promise<string>;
  onProgress: (fn: (text: string, frac?: number) => void) => () => void;
  onRender: (fn: (text: string, frac: number, jobId?: string) => void) => () => void;
};

export const videoBridge = (): VideoBridge | null => {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { gongsilStudio?: { video?: VideoBridge } }).gongsilStudio?.video) || null;
};

export const uid = () => Math.random().toString(36).slice(2, 10);
export const errText = (e: unknown) => {
  const m = String(e instanceof Error ? e.message : e);
  // 앱 본체가 영상 기능보다 먼저 켜졌거나(옛 버전) — 화면만 새것이라 통로가 없다
  if (/No handler registered for 'video:/.test(m)) return "공실뉴스 스튜디오를 다시 켜 주세요. (앱을 껐다 켜면 새 영상 기능이 연결돼요. 계속 이러면 앱을 최신 버전으로 업데이트해 주세요.)";
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
};
export const fmtTime = (t: number, cs = true) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return cs ? `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}` : `${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}`;
};

/** "#RRGGBB" + 진하기 → CSS rgba (글자 뒤 상자) */
export const rgba = (hex: string | undefined, a: number) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "#000000");
  const n = parseInt(m ? m[1] : "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
};

/** 오른쪽 자료 칸에서 끌어 놓기 — dataTransfer 종류 이름 */
export const DRAG_MEDIA = "application/x-gsv-media";

/** 내 목소리 성우 상태 (앱) */
export type MyVoiceStatus = { engine: boolean; installing: boolean; voice: boolean; registeredAt: string; sampleUrl: string; readText: string; name?: string; text?: string; refUrl?: string };
