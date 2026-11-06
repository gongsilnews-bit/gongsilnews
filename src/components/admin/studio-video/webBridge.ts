"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 웹 동영상studio 통로 (2026-11-05 사장님: 브루 웹 체험판처럼 — 앱과 같은 화면을 웹에서, 일은 회원 PC 브라우저가)
 *  앱(공실마케팅)은 window.gongsilStudio.video 를 대 주고, 웹은 이것을 쓴다 (types.ts videoBridge 가 고른다)
 *  - 프로젝트·내가 올린 파일: 이 브라우저 안 (IndexedDB "gs-video-web"). 서버에 올리지 않는다
 *  - 공실 사진: 원래 주소(Supabase) 그대로
 *  - 웹에서 안 되는 것(AI 목소리·녹화·긴 영상 등)은 없는 기능으로 두거나 "앱에서" 안내
 *  계획: memory web-shorts-video-plan · 1분 내외 9:16·16:9
 */
import type { Asset, LibItem, Project, Ratio, Method, Recent, VideoBridge } from "./types";
import { ymd } from "./types";
import { getVideoVacancy } from "@/app/actions/videoWeb";
import { renderWebMp4 } from "./webExport";
import { FONT_URLS } from "@/lib/studio-video/fontUrls";
import { audioDuration, elevenApi, keyApi, sayBlob, spreadWords } from "./webVoice";
import { downloadWithHandle } from "@/components/admin/studio-web/core";

/** 웹 AI 목소리 빠르기 — 무조건 1.25배 (2026-11-05 사장님) */
export const WEB_VOICE_SPEED = 1.25;

export const WEB_ONLY_APP = "이 기능은 공실마케팅 앱에서 쓸 수 있어요. 웹에서는 공실 사진·내 사진으로 1분 내외 영상을 만들어요.";

const DB = "gs-video-web";
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("projects", { keyPath: "dir" });
      r.result.createObjectStore("lib", { keyPath: "id" }); // { id, item: LibItem, blob?: Blob }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await idb();
  return new Promise((resolve, reject) => {
    const q = fn(d.transaction(store, mode).objectStore(store));
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const SETTINGS = () => ({
  fill: "cover",
  subtitle: { on: true, position: "bottom", posAuto: true, length: "long", maxLines: 2, size: 100, font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bg: false, bold: true },
  voice: { id: "Charon", speed: WEB_VOICE_SPEED, volume: 1 },
  music: { on: false, mood: "calm", file: "", name: "", volume: 0.03 },
  sourceVolume: 1,
});

/* ── 자료 (내가 올린 파일 · 공실 사진) ── */
type LibRow = { id: string; item: LibItem; blob?: Blob };
const urls = new Map<string, string>(); // libId → blob: 주소 (새로고침하면 다시 만든다)
const mem = new Map<string, LibItem>(); // 이번에 본 자료 (공실 사진 포함) — addAsset 은 id 만 받는다

function withUrl(r: LibRow): LibItem {
  if (!r.blob) return r.item;
  let u = urls.get(r.id);
  if (!u) { u = URL.createObjectURL(r.blob); urls.set(r.id, u); }
  return { ...r.item, url: u, thumb: r.item.kind === "image" ? u : r.item.thumb };
}

function sizeOfImage(url: string): Promise<{ w: number; h: number }> {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => res({ w: 1080, h: 1080 });
    im.src = url;
  });
}
function metaOfMedia(url: string, kind: "video" | "audio"): Promise<{ d: number; w: number; h: number }> {
  return new Promise((res) => {
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => res({ d: el.duration || 0, w: (el as HTMLVideoElement).videoWidth || 0, h: (el as HTMLVideoElement).videoHeight || 0 });
    el.onerror = () => res({ d: 0, w: 0, h: 0 });
    el.src = url;
  });
}

function pickFiles(accept: string): Promise<File[]> {
  return new Promise((resolve) => {
    const i = document.createElement("input");
    i.type = "file";
    i.multiple = true;
    i.accept = accept;
    i.onchange = () => resolve([...(i.files || [])]);
    window.addEventListener("focus", () => setTimeout(() => resolve([...(i.files || [])]), 800), { once: true }); // 취소
    i.click();
  });
}

async function addFile(f: File): Promise<LibItem> {
  const kind: LibItem["kind"] = f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image";
  const id = `w${uid()}`;
  const url = URL.createObjectURL(f);
  urls.set(id, url);
  let w = 0, h = 0, d = 0;
  if (kind === "image") ({ w, h } = await sizeOfImage(url));
  else ({ d, w, h } = await metaOfMedia(url, kind));
  const item: LibItem = { id, name: f.name, kind, source: "web", fav: false, addedAt: Date.now(), duration: d, width: w, height: h, url, thumb: kind === "image" ? url : "", ready: true };
  await run("lib", "readwrite", (s) => s.put({ id, item: { ...item, url: "", thumb: "" }, blob: f } as LibRow));
  mem.set(id, item);
  return item;
}

/* ── 프로젝트 ── */
function durationOf(p: Project) {
  let t = 0;
  for (const sc of p.scenes || []) for (const c of sc.clips || []) {
    const cc = c as any;
    if (cc.src) t += Math.max(0, (cc.src.e || 0) - (cc.src.s || 0));
    else t += cc.voice?.duration || cc.hold || 0;
  }
  return Math.round(t * 10) / 10;
}
function thumbOf(p: Project) {
  const a = Object.values(p.assets || {}).find((x) => x.kind === "image" && /^https?:/.test(x.url));
  return a?.url || "";
}
/** 열 때 — 내가 올린 파일(blob:)은 주소를 다시 만든다 */
async function relink(p: Project): Promise<Project> {
  for (const a of Object.values(p.assets || {})) {
    const libId = a.path?.startsWith("web-lib:") ? a.path.slice(8) : "";
    if (!libId) continue;
    const r = await run<LibRow | undefined>("lib", "readonly", (s) => s.get(libId)).catch(() => undefined);
    if (r?.blob) a.url = withUrl(r).url;
    else a.missing = true;
  }
  // 공실뉴스 드론 — 잠깐만 열리는 주소라 열 때마다 새로 받는다 (2026-11-05: 다음 날 열면 드론이 안 나오던 것)
  for (const a of Object.values(p.assets || {})) {
    const m = /^stock:s-gongsil-d-(.+)$/.exec(a.path || "");
    if (!m) continue;
    const r = await fetch(`/api/studio/video/stock?type=drone-url&id=${encodeURIComponent(m[1])}`, { credentials: "include" }).then((x) => x.json()).catch(() => null);
    if (r?.url) a.url = r.url;
  }
  // 클립 목소리 (웹에서 만든 AI 목소리·녹음)
  for (const sc of p.scenes || []) for (const c of sc.clips || []) {
    const v = (c as any).voice as { file?: string; url?: string } | null;
    const libId = v?.file?.startsWith("web-lib:") ? v.file.slice(8) : "";
    if (!libId) continue;
    const r = await run<LibRow | undefined>("lib", "readonly", (st) => st.get(libId)).catch(() => undefined);
    if (r?.blob) v!.url = withUrl(r).url;
  }
  // 내가 올린 음악·효과음 레이어도
  for (const l of (p.layers || []) as { file?: string; url?: string }[]) {
    if (!l.file && l.url && !l.url.startsWith("blob:")) l.file = l.url; // 예전 웹 프로젝트 — 미리보기 음악이 나오게
    const libId = l.file?.startsWith("web-lib:") ? l.file.slice(8) : "";
    if (!libId) continue;
    const r = await run<LibRow | undefined>("lib", "readonly", (s) => s.get(libId)).catch(() => undefined);
    if (r?.blob) l.url = withUrl(r).url;
  }
  return p;
}

async function create(o: { method: Method; ratio: Ratio; name?: string; vacancyId?: string }): Promise<Project> {
  const t = now();
  const id = uid();
  const p = {
    v: 1, id, name: (o.name || "").trim() || "무제", method: o.method, ratio: o.ratio, vacancyId: o.vacancyId || "",
    createdAt: t, updatedAt: t, savedAt: "", settings: SETTINGS(), assets: {}, scenes: [{ id: uid(), clips: [] }], layers: [], dir: `web:${id}`,
  } as unknown as Project;
  if ((p.settings as any).subtitle.posAuto) (p.settings as any).subtitle.position = o.ratio === "9:16" || o.ratio === "4:5" ? "middle-low" : "bottom";
  await run("projects", "readwrite", (s) => s.put(p));
  return p;
}

async function save(p: Project) {
  const t = now();
  const duration = durationOf(p);
  const copy = JSON.parse(JSON.stringify({ ...p, updatedAt: t, duration, thumb: thumbOf(p) }));
  // blob: 주소는 저장하지 않는다 (열 때 다시 만든다)
  for (const a of Object.values(copy.assets || {}) as Asset[]) if (a.url?.startsWith("blob:")) a.url = "";
  await run("projects", "readwrite", (s) => s.put(copy));
  return { updatedAt: t, duration };
}

async function open(dir: string): Promise<Project> {
  const p = await run<Project | undefined>("projects", "readonly", (s) => s.get(dir));
  if (!p) throw new Error("이 브라우저에서 프로젝트를 찾지 못했어요. (웹 프로젝트는 만든 브라우저에만 있어요)");
  return relink(p);
}

/* ── 작업 파일 .gsw (2026-11-05: 웹 프로젝트가 이 브라우저에만 있어 기록을 지우면 사라지던 것) ──
 *  zip 안: project.json + lib/<id>.json(자료 정보) + lib/<id>(파일). 공실 사진·드론·음악은 주소만 (다시 받는다) */
function libIdsOf(p: Project): string[] {
  const ids = new Set<string>();
  const take = (v?: string) => { if (v?.startsWith("web-lib:")) ids.add(v.slice(8)); };
  for (const a of Object.values(p.assets || {})) take(a.path);
  for (const sc of p.scenes || []) for (const c of sc.clips || []) take(((c as any).voice as { file?: string } | null)?.file);
  for (const l of (p.layers || []) as { file?: string }[]) take(l.file);
  return [...ids];
}
export async function exportProject(p: Project): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const copy = JSON.parse(JSON.stringify(p));
  for (const a of Object.values(copy.assets || {}) as Asset[]) if (a.url?.startsWith("blob:")) a.url = "";
  zip.file("project.json", JSON.stringify(copy));
  for (const id of libIdsOf(p)) {
    const r = await run<LibRow | undefined>("lib", "readonly", (st) => st.get(id)).catch(() => undefined);
    if (!r?.blob) continue;
    zip.file(`lib/${id}.json`, JSON.stringify({ ...r.item, url: "", thumb: "" }));
    zip.file(`lib/${id}`, r.blob);
  }
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
export async function importProject(file: File): Promise<Project> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const pj = zip.file("project.json");
  if (!pj) throw new Error("공실 쇼츠 작업 파일(.gsw)이 아니에요.");
  const p = JSON.parse(await pj.async("string")) as Project;
  for (const name of Object.keys(zip.files)) {
    const m = /^lib\/([^/]+)\.json$/.exec(name);
    if (!m) continue;
    const id = m[1];
    const item = JSON.parse(await zip.file(name)!.async("string")) as LibItem;
    const bin = zip.file(`lib/${id}`);
    if (!bin) continue;
    const ab = await bin.async("arraybuffer");
    const blob = new Blob([ab], { type: item.kind === "image" ? "image/png" : item.kind === "video" ? "video/mp4" : "audio/mpeg" });
    await run("lib", "readwrite", (st) => st.put({ id, item, blob } as LibRow));
  }
  // 같은 프로젝트가 이 브라우저에 있으면 덮어쓰지 않고 새 이름으로
  const had = await run<Project | undefined>("projects", "readonly", (st) => st.get(p.dir)).catch(() => undefined);
  if (had) { p.dir = `web:${uid()}`; p.name = `${p.name} (가져옴)`; }
  await run("projects", "readwrite", (st) => st.put(p));
  return relink(p);
}

async function recent(): Promise<Recent[]> {
  const all = await run<Project[]>("projects", "readonly", (s) => s.getAll()).catch(() => [] as Project[]);
  return all
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .map((p) => ({ dir: p.dir, name: p.name, ratio: p.ratio, method: p.method, updatedAt: p.updatedAt, thumb: p.thumb || "", duration: p.duration || 0 }) as Recent);
}

async function addAsset(libId: string): Promise<Asset> {
  let it = mem.get(libId);
  if (!it) {
    const r = await run<LibRow | undefined>("lib", "readonly", (s) => s.get(libId));
    if (r) it = withUrl(r);
  }
  if (!it) throw new Error("자료를 찾지 못했어요. 다시 골라 주세요.");
  return {
    id: uid(), path: it.source === "web" ? `web-lib:${libId}` : it.source === "stock" ? `stock:${libId}` : "", url: it.url, thumb: it.thumb, kind: it.kind, name: it.name,
    duration: it.duration, width: it.width, height: it.height, hasAudio: it.kind === "video" ? false : undefined, source: it.source, credit: it.credit,
  };
}

/** 공실 사진 → 자료 (원래 주소 그대로) */
async function vacancy(id: string) {
  const r = await getVideoVacancy(id);
  if (!r.success) throw new Error(r.error);
  const photos: LibItem[] = [];
  for (let i = 0; i < r.data.photos.length; i++) {
    const url = r.data.photos[i];
    const { w, h } = await sizeOfImage(url);
    const item: LibItem = { id: `v${id.slice(0, 8)}-${i}`, name: `공실 사진 ${i + 1}`, kind: "image", source: "vacancy", fav: false, duration: 0, width: w, height: h, url, thumb: url, ready: true };
    mem.set(item.id, item);
    photos.push(item);
  }
  return { vacancy: { title: r.data.title, fields: [] as { label: string; value: string }[] }, photos, info: r.data };
}

/** 주소 사진 → 자료 (뉴스칼럼 "사진·화면" 등, 2026-11-05) */
async function photosFrom(list: { url: string; name?: string }[]) {
  const out: LibItem[] = [];
  for (let i = 0; i < list.length; i++) {
    const url = list[i].url;
    if (!url) continue;
    const { w, h } = await sizeOfImage(url).catch(() => ({ w: 1080, h: 1080 }));
    const item: LibItem = { id: `u${Date.now().toString(36)}-${i}`, name: list[i].name || `사진 ${i + 1}`, kind: "image", source: "vacancy", fav: false, duration: 0, width: w, height: h, url, thumb: url, ready: true };
    mem.set(item.id, item);
    out.push(item);
  }
  return out;
}

const no = () => () => {};
const renderFns = new Set<(text: string, frac: number, jobId?: string) => void>();
const cancelled = new Set<string>();
let lastOut: { name: string; blob: Blob } | null = null;

/** 웹 통로 하나 (한 번만 만든다) */
let bridge: VideoBridge | null = null;
export function webVideoBridge(): VideoBridge {
  if (bridge) return bridge;
  const b: any = {
    web: true,
    lib: {
      list: async (o?: { kind?: string }) => {
        const rows = await run<LibRow[]>("lib", "readonly", (s) => s.getAll()).catch(() => [] as LibRow[]);
        const items = rows.filter((r) => r.item.source !== "voice").map(withUrl).sort((a, z) => (z.addedAt || 0) - (a.addedAt || 0));
        for (const it of items) mem.set(it.id, it);
        return o?.kind ? items.filter((x) => x.kind === o.kind) : items;
      },
      pick: async (o?: { kinds?: "media" | "audio" | "any" }) => {
        const accept = o?.kinds === "audio" ? "audio/*" : o?.kinds === "any" ? "image/*,video/*,audio/*" : "image/*,video/*";
        const fs = await pickFiles(accept);
        const out: LibItem[] = [];
        for (const f of fs) out.push(await addFile(f));
        return out;
      },
      fav: async () => true,
      remove: async (id: string) => { await run("lib", "readwrite", (s) => s.delete(id)); mem.delete(id); },
      folders: async () => [],
      addFolder: async () => [],
      removeFolder: async () => [],
      musicFolder: async () => "",
      tags: async () => [],
      tagAdd: async () => [],
      tagRename: async () => [],
      tagRemove: async () => [],
      tagSet: async () => [],
      pickDir: async () => null,
      paste: async () => [],
      copy: async () => false,
      downloadsAudio: async () => [],
      addDownloads: async () => [],
      // 그래픽(스티커)·썸네일처럼 화면에서 그린 그림 — 이 브라우저 안에 이미지로 저장 (2026-11-05)
      saveImage: async (_dir: string, dataUrl: string, name: string) => {
        const blob = await fetch(dataUrl).then((r) => r.blob());
        const file = new File([blob], /\.\w+$/.test(name) ? name : `${name}.png`, { type: blob.type || "image/png" });
        return addFile(file);
      },
    },
    project: {
      create,
      open,
      // [프로젝트 열기] — PC 의 작업 파일(.gsw)
      openPick: async () => {
        const [f] = await pickFiles(".gsw,application/zip");
        return f ? importProject(f) : null;
      },
      save,
      // [저장](Ctrl+S) — 이 브라우저에 + 저장 폴더를 정했으면 PC 05 동영상studio 에 작업 파일(.gsw)도 (2026-11-05)
      flush: async (p: Project) => {
        await save(p);
        try {
          const { saveToFolderHandle } = await import("@/components/admin/studio-web/folder");
          // 05 동영상studio\작업 파일\년월일 제목.gsw — 날짜 폴더 없이 (2026-11-06 사장님: "쇼츠도 마찬가지", "날짜 폴더는 필요없어")
          const nm = String(p.name || "쇼츠").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
          const day = /^(\d{8})/.exec(nm)?.[1] || ymd();
          const file = `${(/^\d{8}/.test(nm) ? nm : `${day} ${nm}`).slice(0, 49)}.gsw`; // 년월일 8자리 + 제목 앞 40자
          await saveToFolderHandle("video", ["작업 파일"], file, await exportProject(p));
        } catch { /* 폴더를 안 정했거나 권한 없음 — 브라우저 저장은 됐다 */ }
        return { savedAt: now() };
      },
      setDirty: async () => true,
      recent,
      addAsset,
      rename: async (dir: string, name: string) => { const p = await open(dir); p.name = name; await save(p); return dir; },
      trash: async (dir: string) => { await run("projects", "readwrite", (s) => s.delete(dir)); return dir; },
      trashList: async () => [],
      exportText: async () => { throw new Error(WEB_ONLY_APP); },
      restore: async () => "",
      purge: async () => 0,
      pickFolder: async () => null,
      folders: async () => ({ projectDir: "이 브라우저", recordDir: "", exportDir: "다운로드 · 저장 폴더", defaults: { projectDir: "이 브라우저", recordDir: "", exportDir: "" } }),
      setFolders: async () => ({ projectDir: "이 브라우저", recordDir: "", exportDir: "다운로드 · 저장 폴더", defaults: { projectDir: "이 브라우저", recordDir: "", exportDir: "" } }),
      motionRender: async () => { throw new Error("모션그래픽은 공실마케팅 앱에서 쓸 수 있어요."); },
      motionOptions: async () => { throw new Error("모션그래픽은 공실마케팅 앱에서 쓸 수 있어요."); },
      motionPreview: async () => { throw new Error("모션그래픽은 공실마케팅 앱에서 쓸 수 있어요."); },
      motionScene: async () => { throw new Error("모션그래픽은 공실마케팅 앱에서 쓸 수 있어요."); },
    },
    vacancy,
    photosFrom,
    // 오픈자료 — 서버 무료 사진·영상 검색(Pexels·Pixabay) · 공실뉴스 드론 (같은 주소, 웹 로그인 쿠키로, 2026-11-05)
    stock: {
      search: async (q: string, type: "photo" | "video" | "drone", orientation: string, page = 1) => {
        const sp = new URLSearchParams({ q, type, orientation, page: String(page) });
        return fetch(`/api/studio/video/stock?${sp}`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ success: false, error: "오픈자료를 불러오지 못했어요. 잠시 뒤 다시 찾아 주세요." }));
      },
      get: async (_dir: string, s: { id: string; kind: "image" | "video"; thumb: string; url: string; width: number; height: number; duration?: number; credit: string; source: string }) => {
        let url = s.url;
        // 공실뉴스 드론 — 잠깐만 열리는 주소를 그때그때 받는다
        if (/^gongsil-d-/.test(s.id)) {
          const r = await fetch(`/api/studio/video/stock?type=drone-url&id=${encodeURIComponent(s.id.replace(/^gongsil-d-/, ""))}`, { credentials: "include" }).then((x) => x.json()).catch(() => null);
          if (r?.url) url = r.url;
        }
        const item: LibItem = { id: `s-${s.id}`, name: s.credit ? `${s.source} · ${s.credit}` : s.source || "오픈자료", kind: s.kind, source: "stock", fav: false, credit: s.credit ? `${s.source} / ${s.credit}` : s.source, duration: s.duration || 0, width: s.width, height: s.height, url, thumb: s.thumb || url, ready: true };
        mem.set(item.id, item);
        return item;
      },
    },
    // 음악 — 공실뉴스 음악(사이트 /reels-assets/bgm) · 내가 올린 음악 (2026-11-05)
    musicGet: async (_dir: string, rel: string) => {
      if (!/^bgm\/[\w\/-]+\.mp3$/.test(String(rel))) throw new Error("음악을 찾지 못했습니다.");
      return { file: `/reels-assets/${rel}`, url: `/reels-assets/${rel}` }; // file 이 비면 미리보기가 음악을 건너뛴다 (timeline.musicLayers)
    },
    musicUse: async (_dir: string, libId: string) => {
      const it = mem.get(libId) || (await run<LibRow | undefined>("lib", "readonly", (s) => s.get(libId)).then((r) => (r ? withUrl(r) : undefined)));
      if (!it) throw new Error("음악을 찾지 못했어요. 다시 골라 주세요.");
      return { file: `web-lib:${libId}`, url: it.url, name: it.name };
    },
    sfxUse: async (_dir: string, libId: string) => {
      const it = mem.get(libId) || (await run<LibRow | undefined>("lib", "readonly", (s) => s.get(libId)).then((r) => (r ? withUrl(r) : undefined)));
      if (!it) throw new Error("효과음을 찾지 못했어요.");
      return { file: `web-lib:${libId}`, url: it.url, name: it.name };
    },
    // 글꼴 — 무료 글꼴은 공개 주소에서 바로. 예능 글꼴(/studio-fonts)은 이 사이트에 있을 때만 (배포 사이트엔 없음 → 앱에서)
    fonts: {
      ensure: async (family: string) => {
        if (!family || family === "Malgun Gothic" || family === "Gungsuh" || family === "Batang") return { family, url: "" };
        const url = FONT_URLS[family];
        if (!url) return { family, url: "" }; // 내 PC 글꼴 — 이름만으로 그려진다
        if (url.startsWith("/studio-fonts/")) {
          const ok = await fetch(url, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
          if (!ok) throw new Error("이 글꼴(예능 글꼴)은 공실마케팅 앱에서 쓸 수 있어요.");
        }
        return { family, url };
      },
    },
    // AI 이미지·영상·편집·대본 — 웹은 서버 AI 를 안 쓴다 (앱에서, 회원 AI 연결)
    ai: new Proxy({}, { get: (_t, k) => (k === "then" ? undefined : async () => { throw new Error("AI 기능은 공실마케팅 앱에서 쓸 수 있어요."); }) }),
    capturePage: async () => { throw new Error("화면 캡처는 공실마케팅 앱에서 쓸 수 있어요."); },
    /** 내 목소리 녹음 → 이 브라우저 안 (WebRecordPane) */
    saveRecording: async (blob: Blob, text: string) => {
      const id = `rec-${uid()}`;
      const url = URL.createObjectURL(blob);
      urls.set(id, url);
      const d = await audioDuration(url);
      const it: LibItem = { id, name: `내 목소리 ${new Date().toLocaleTimeString("ko-KR")}`, kind: "audio", source: "voice", fav: false, addedAt: Date.now(), duration: d, width: 0, height: 0, url, thumb: "", ready: true };
      await run("lib", "readwrite", (st) => st.put({ id, item: { ...it, url: "", thumb: "" }, blob } as LibRow));
      return { file: `web-lib:${id}`, url, duration: d, id: "rec", text, words: spreadWords(text, d) };
    },
    voiceSave: async () => { throw new Error("목소리만 파일로 저장하기는 공실마케팅 앱에서 쓸 수 있어요. 영상에 넣은 목소리는 [내보내기]에 같이 들어가요."); },
    onProgress: no,
    // 내보내기 — 회원 PC 브라우저에서 mp4 (webExport.ts). 저장 폴더를 정했으면 05 동영상studio\날짜, 아니면 다운로드 폴더
    onRender: (fn: (text: string, frac: number, jobId?: string) => void) => { renderFns.add(fn); return () => { renderFns.delete(fn); }; },
    render: async (p: Project) => {
      const id = uid();
      cancelled.delete(id);
      renderFns.forEach((fn) => fn("", 0, id));
      const t0 = Date.now();
      const { blob, seconds } = await renderWebMp4(p, (text, frac) => renderFns.forEach((fn) => fn(text, frac)), () => cancelled.has(id));
      const name = `${(p.name || "영상").replace(/[\\/:*?"<>|]+/g, " ").trim()}.mp4`;
      lastOut = { name, blob };
      const h = await downloadWithHandle(name, blob, "video");
      return { file: h ? `공실뉴스\\05 동영상studio\\${name}` : `다운로드 폴더\\${name}`, seconds, took: (Date.now() - t0) / 1000, encoder: "web", url: URL.createObjectURL(blob) };
    },
    renderCancel: async (id: string) => { cancelled.add(id); },
    showFile: async () => { if (lastOut) { const a = document.createElement("a"); a.href = URL.createObjectURL(lastOut.blob); a.download = lastOut.name; a.click(); } return true; },
    openPath: async () => true,
    // AI 목소리 — 회원 본인 키(타입캐스트·일레븐랩스), 브라우저가 그 회사에 바로 (webVoice.ts). 같은 문장·성우는 다시 만들지 않는다
    typecast: keyApi("typecast"),
    eleven: elevenApi(), // 공실뉴스 계정 · 포인트 (2026-11-05 사장님)
    voice: async (_dir: string, text: string, voiceId: string, opts?: { fresh?: boolean; emotion?: string; prev?: string; next?: string; edit?: boolean }) => {
      const t = String(text || "").replace(/\s+/g, " ").trim();
      const cacheId = `vo-${voiceId}-${opts?.emotion || ""}-${t}`;
      let it: LibItem | undefined;
      if (!opts?.fresh) {
        const hit = await run<LibRow | undefined>("lib", "readonly", (st) => st.get(cacheId)).catch(() => undefined);
        if (hit) it = withUrl(hit);
      }
      if (!it) {
        const blob = await sayBlob(t, voiceId, opts);
        const url = URL.createObjectURL(blob);
        const d = await audioDuration(url);
        urls.set(cacheId, url);
        it = { id: cacheId, name: t.slice(0, 30), kind: "audio", source: "voice", fav: false, addedAt: Date.now(), duration: d, width: 0, height: 0, url, thumb: "", ready: true };
        await run("lib", "readwrite", (st) => st.put({ id: cacheId, item: { ...it!, url: "", thumb: "" }, blob } as LibRow));
      }
      return { file: `web-lib:${cacheId}`, url: it.url, duration: it.duration, id: voiceId, text: t, words: spreadWords(t, it.duration) as any };
    },
    transcribe: async () => { throw new Error("자동 자막(받아쓰기)은 공실마케팅 앱에서 쓸 수 있어요."); },
    exportAudio: async () => { throw new Error(WEB_ONLY_APP); },
  };
  bridge = b as VideoBridge;
  return bridge;
}

/** 웹 통로인가 (앱 아님) */
export const isWebVideo = (b: unknown) => Boolean(b && (b as { web?: boolean }).web);
