// 영상 편집기 자료 모양 — 앱(studio-app/src/video/project.js)과 같다
export type Ratio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3";
export type Method = "text" | "video" | "longform" | "record";
export type Fill = "cover" | "contain" | "blur";

export type Word = { w: string; s: number; e: number; del?: boolean };

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
  voice?: { file: string; url?: string; duration: number; id: string; text: string } | null;
  voiceId?: string; // 클립만 다른 목소리
  speed?: number; // 클립만 다른 빠르기
  visual?: { asset: string; s: number } | null; // 화면 자료 (글 클립 배경 · 촬영 클립 화면 바꾸기)
  hold?: number; // 목소리 없을 때 길이
  fill?: Fill;
  muted?: boolean;
  volume?: number;
  sub?: boolean;
  del?: boolean;
  hint?: { desc?: string; keywords?: string; kind?: string };
};

export type Scene = { id: string; title?: string; clips: Clip[] };

export type SubtitleSettings = { on: boolean; position: "top" | "middle" | "middle-low" | "bottom"; length: "long" | "short"; size: number; font: string; color: string; outline: string; outlineWidth: number; bg: boolean; bold: boolean };

export type Settings = {
  fill: Fill;
  subtitle: SubtitleSettings;
  voice: { id: string; speed: number; volume: number };
  music: { on: boolean; mood?: string; file: string; url?: string; name: string; volume: number };
  sourceVolume: number;
};

export type Project = {
  v: number;
  id: string;
  name: string;
  method: Method;
  ratio: Ratio;
  vacancyId?: string;
  createdAt: string;
  updatedAt: string;
  settings: Settings;
  assets: Record<string, Asset>;
  scenes: Scene[];
  dir: string;
  duration?: number;
  thumb?: string;
};

export type LibItem = { id: string; name: string; kind: "video" | "image"; source: string; fav: boolean; credit?: string; duration: number; width: number; height: number; url: string; thumb: string; ready: boolean };
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
  };
  project: {
    create: (o: { method: Method; ratio: Ratio; name?: string; vacancyId?: string }) => Promise<Project>;
    open: (dir: string) => Promise<Project>;
    openPick: () => Promise<Project | null>;
    save: (p: Project) => Promise<{ updatedAt: string; duration: number }>;
    recent: () => Promise<Recent[]>;
    addAsset: (libId: string) => Promise<Asset>;
    exportText: (p: Project, kind: "srt" | "txt") => Promise<string>;
  };
  voice: (dir: string, text: string, voiceId: string) => Promise<{ file: string; url: string; duration: number; id: string; text: string; words: Word[] }>;
  transcribe: (p: Project, assetId: string) => Promise<{ clips: Clip[] }>;
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
  render: (p: Project, o?: { scope?: string; sceneId?: string; clipIds?: string[]; height?: number }) => Promise<{ file: string; seconds: number; took: number; encoder: string }>;
  renderCancel: (id: string) => Promise<void>;
  exportAudio: (p: Project, kind: "mp3" | "wav") => Promise<string>;
  snapshot: (p: Project, file: string, at: number) => Promise<string>;
  record: {
    sources: () => Promise<{ id: string; name: string; thumb: string }[]>;
    choose: (id: string) => Promise<boolean>;
    start: (name: string) => Promise<string>;
    chunk: (token: string, buf: ArrayBuffer) => Promise<boolean>;
    stop: (token: string) => Promise<LibItem>;
  };
  showFile: (file: string) => Promise<void>;
  openPath: (p: string) => Promise<string>;
  onProgress: (fn: (text: string, frac?: number) => void) => () => void;
  onRender: (fn: (text: string, frac: number, jobId?: string) => void) => () => void;
};

export const videoBridge = (): VideoBridge | null => {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { gongsilStudio?: { video?: VideoBridge } }).gongsilStudio?.video) || null;
};

export const uid = () => Math.random().toString(36).slice(2, 10);
export const errText = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
export const fmtTime = (t: number, cs = true) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return cs ? `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}` : `${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}`;
};
