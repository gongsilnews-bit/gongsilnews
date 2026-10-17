// 영상 편집기 자료 모양 — 앱(studio-app/src/video/project.js)과 같다
export type Ratio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3";
export type Method = "text" | "video" | "longform" | "record";
export type Fill = "cover" | "contain" | "blur";
// 사진 움직임 (브루처럼) — auto = 사진 클립 차례대로 줌인·좌→우·줌아웃·우→좌·위→아래 를 돌려 쓴다
export type Motion = "auto" | "none" | "zoomIn" | "zoomOut" | "leftRight" | "rightLeft" | "topBottom" | "bottomTop";
export type MotionPower = "low" | "mid" | "high";
// 사진 올리기·화면 글자 애니메이션 (브루처럼) — 등장·퇴장 / 강조 / 확대. auto = 레이어 차례대로 돌려 쓰기
export type AnimIn = "auto" | "fade" | "fly" | "zoom" | "pop" | "spin" | "flip" | "roll";
export type LayerAnim = { in?: AnimIn; out?: AnimIn; emph?: "pulse" | "shake" | "blink"; grow?: "grow" | "shrink"; dur?: number /* 등장·퇴장 걸리는 초 (기본 0.5) */ };

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
export type LayerType = "music" | "image" | "text";
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
};

export type SubtitleSettings = {
  on: boolean; position: "top" | "middle" | "middle-low" | "bottom"; length: "long" | "short"; size: number; font: string; color: string; outline: string; outlineWidth: number; bg: boolean; bgColor?: string; bgOpacity?: number; bold: boolean;
  x?: number; y?: number; // 미리보기에서 끌어 옮긴 자리 (가운데 기준 0~1). 있으면 position 대신
  wrap?: number; // 줄 너비 (1 = 기본, 0.3~1) — 한 줄 글자 수를 그만큼 줄인다
  spacing?: number; // 자간 — 글자 크기에 대한 비율 (-0.1~0.5, 0 = 기본)
  leading?: number; // 행간 — 줄 높이 = 글자 크기 × 이 값 (0.9~2.5, 없으면 1.25)
};

export type Settings = {
  fill: Fill;
  subtitle: SubtitleSettings;
  voice: { id: string; speed: number; volume: number };
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
  voiceJoin?: (dir: string, files: string[]) => Promise<{ file: string; url: string; duration: number }>; // 앱 0.1.8부터
  voice: (dir: string, text: string, voiceId: string) => Promise<{ file: string; url: string; duration: number; id: string; text: string; words: Word[] }>;
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
    image: (dir: string, prompt: string) => Promise<LibItem>;
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
  renderCancel: (id: string) => Promise<void>;
  exportAudio: (p: Project, kind: "mp3" | "wav") => Promise<string>;
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
