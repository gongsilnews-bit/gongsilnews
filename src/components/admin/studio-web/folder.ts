"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 웹 PC 폴더 저장 (2026-11-04 사장님: "PC폴더 저장을 만들자 · 공실뉴스라고 해줘")
 *  회원이 [저장 폴더 정하기]로 문서\공실뉴스 를 한 번 고르면, 웹에서 만든 것을 그 폴더에 쓴다.
 *  - 크롬·엣지(showDirectoryPicker)만. 안 되는 브라우저는 지금처럼 다운로드 폴더로 내려받는다
 *  - 고른 폴더는 이 브라우저에 기억 (IndexedDB 에 폴더 손잡이). 크롬을 새로 켜면 처음 한 번 "허락"을 다시 묻기도 한다
 *  - 안쪽 폴더는 웹 메뉴 이름 (2026-11-04 사장님: "우리 웹과 맞춰서"): 01 뉴스SNS발행 · 02 매물보고서 · 03 물건홍보지 · 04 포토studio (2026-11-06 사장님: 보고서·홍보지 폴더 따로) (글쓰기 폴더는 웹에선 안 둠, 2026-11-04 사장님)
 *    처음 저장할 때 생긴다 (빈 폴더를 미리 만들지 않는다). 보고서·홍보지(marketing/report·ai-detail 의 webFolder.ts)도 같은 이름을 쓴다
 *  - 고른 폴더 이름이 "공실뉴스"가 아니면 그 안에 "공실뉴스" 폴더를 만들어 쓴다 (문서를 골라도 문서\공실뉴스)
 *  작업(브라우저 안 IndexedDB)은 그대로 두고, 이 폴더는 백업 겸 다른 브라우저(엣지↔크롬)·다른 PC로 옮기는 길
 */

export const ROOT_NAME = "공실뉴스";
/** 앱(공실마케팅 스튜디오 = 확장판)의 저장 폴더 이름 — 이 폴더를 고르면 그대로 쓴다 (2026-11-11 사장님: "폴더 정리도 서로 호환되게") */
export const APP_ROOT_NAME = "공실마케팅";
// video·done — 앱과 같은 자리 (2026-11-11): 작업 파일 05 동영상제작\프로젝트\*.gss · 완성 영상 06 완성영상\년월일\ (예전 웹은 05 동영상studio)
export const F = { sns: "01 뉴스SNS발행", mkt: "02 매물보고서", flyer: "03 물건홍보지", photo: "04 포토studio", video: "05 동영상제작", done: "06 완성영상", videoOld: "05 동영상studio", capture: "07 화면캡쳐" } as const; // capture — 웹 화면캡처 막대 (2026-11-05)
export type FolderKey = keyof typeof F;

type Dir = any; // FileSystemDirectoryHandle (브라우저마다 타입이 달라 any)
const DB = "gs-web-folder";
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("h");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function kv<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await idb();
  return new Promise((resolve, reject) => {
    const q = fn(d.transaction("h", mode).objectStore("h"));
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}

export const folderSupported = () => typeof window !== "undefined" && "showDirectoryPicker" in window;
const changed = () => window.dispatchEvent(new Event("gs-folder-change"));

let rootP: Promise<Dir | null> | null = null;
const stored = () => (rootP ||= kv<Dir | undefined>("readonly", (s) => s.get("root")).then((h) => h || null).catch(() => null));

export type FolderState = { supported: boolean; set: boolean; granted: boolean; name: string };
/** 지금 바로 폴더에 쓸 수 있나 — 내려받기 단추가 기다리지 않고 고르게 (folderState 가 고친다) */
export let folderReady = false;
export async function folderState(): Promise<FolderState> {
  if (!folderSupported()) return { supported: false, set: false, granted: false, name: "" };
  const h = await stored();
  if (!h) { folderReady = false; return { supported: true, set: false, granted: false, name: "" }; }
  let granted = false;
  try { granted = (await h.queryPermission({ mode: "readwrite" })) === "granted"; } catch { /* */ }
  folderReady = granted;
  return { supported: true, set: true, granted, name: h.name };
}
if (typeof window !== "undefined") void folderState();


/** [저장 폴더 정하기] — 단추를 누른 그 순간에 불러야 한다 (브라우저 규칙) */
export async function pickFolder(): Promise<FolderState & { aborted?: boolean }> {
  if (!folderSupported()) throw new Error("이 브라우저는 PC 폴더 저장을 지원하지 않아요. 크롬이나 엣지에서 써 주세요.");
  let picked: Dir;
  try {
    // 처음 = 바탕 화면에서 열림 (2026-11-06 사장님: "첫 위치를 바탕화면으로" — 전엔 문서, 회원이 다른 곳으로 바꿀 수 있음) · [바꾸기] = 지금 쓰는 공실뉴스 폴더에서 열림 (문서·바탕 화면 자체를 다시 골라 "이 폴더를 열 수 없음"이 뜨지 않게)
    const cur = await stored();
    picked = await (window as any).showDirectoryPicker({ mode: "readwrite", startIn: cur || "desktop" });
  } catch (e: any) {
    if (e && e.name === "AbortError") return { ...(await folderState()), aborted: true }; // 회원이 닫았다 (크롬 "이 폴더를 열 수 없음"에서 [취소]도 여기로)
    throw new Error("폴더를 고르지 못했어요. 다른 폴더를 골라 주세요.");
  }
  // 공실뉴스 또는 앱 폴더(공실마케팅)를 고르면 그대로, 아니면 그 안에 공실뉴스 (2026-11-11: 앱과 같은 폴더를 함께 쓰게)
  const root = picked.name === ROOT_NAME || picked.name === APP_ROOT_NAME ? picked : await picked.getDirectoryHandle(ROOT_NAME, { create: true });
  await kv("readwrite", (s) => s.put(root, "root"));
  rootP = Promise.resolve(root);
  restored = false;
  folderReady = true;
  changed();
  return folderState();
}

/** 크롬을 새로 켠 뒤 — 저장 허락을 다시 받는다 (단추를 누른 순간에만 된다) */
export async function allowFolder(): Promise<boolean> {
  const h = await stored();
  if (!h) return false;
  try {
    const ok = (await h.requestPermission({ mode: "readwrite" })) === "granted";
    if (ok) { folderReady = true; changed(); }
    return ok;
  } catch { return false; }
}

/** 쓸 수 있는 폴더 (정했고 허락도 받았을 때만) */
async function root(): Promise<Dir | null> {
  const h = await stored();
  if (!h) return null;
  try { return (await h.queryPermission({ mode: "readwrite" })) === "granted" ? h : null; } catch { return null; }
}
async function dirOf(key: FolderKey, parts: string[], create = true): Promise<Dir | null> {
  let d = await root();
  if (!d) return null;
  for (const p of [F[key], ...parts]) d = await d.getDirectoryHandle(p, { create });
  return d;
}

/** 메뉴 폴더 손잡이 — 열기·저장 창의 처음 위치로 쓴다 (2026-11-06 사장님: 포토studio 열기·저장도 04 포토studio 에서). 폴더를 안 정했으면 null */
export async function menuDir(key: FolderKey): Promise<Dir | null> {
  let d = await dirOf(key, [], true).catch(() => null);
  if (!d && (await stored())) { if (await allowFolder()) d = await dirOf(key, [], true).catch(() => null); }
  return d;
}

/** 메뉴 폴더에서 파일 고르기 창 (2026-11-06 사장님: 쇼츠 [PC에서 열기]는 05 동영상studio 에서)
 *  고른 파일 · 닫았으면 null · 폴더를 안 정했거나 이 창을 못 열면 undefined (부르는 쪽이 보통 파일 고르기로) */
export async function pickFromFolder(key: FolderKey, ext: string, description: string, parts: string[] = []): Promise<File | null | undefined> {
  if (typeof window === "undefined" || !("showOpenFilePicker" in window)) return undefined;
  let d = await dirOf(key, parts, true).catch(() => null);
  if (!d && (await stored())) { if (await allowFolder()) d = await dirOf(key, parts, true).catch(() => null); }
  if (!d) return undefined;
  try {
    const [h] = await (window as any).showOpenFilePicker({ startIn: d, multiple: false, types: [{ description, accept: { "application/octet-stream": [ext] } }] });
    return (await h.getFile()) as File;
  } catch (e: any) {
    return e && e.name === "AbortError" ? null : undefined;
  }
}

/** 폴더에 파일 쓰기 — 폴더를 안 정했거나 허락이 없으면 false (부르는 쪽이 내려받기로) */
export async function saveToFolder(key: FolderKey, parts: string[], name: string, data: Blob | string): Promise<boolean> {
  return Boolean(await saveToFolderHandle(key, parts, name, data));
}
/** 폴더에 쓰고 그 파일 손잡이를 돌려준다 — 포토studio 최근 파일이 다시 열 때 쓴다 (2026-11-05). 못 쓰면 null */
export async function saveToFolderHandle(key: FolderKey, parts: string[], name: string, data: Blob | string): Promise<any | null> {
  try {
    const d = await dirOf(key, parts);
    if (!d) return null;
    const f = await d.getFileHandle(name, { create: true });
    const w = await f.createWritable();
    await w.write(data);
    await w.close();
    return f;
  } catch { return null; }
}

/** 폴더 안 파일 읽기 (하위 폴더 한 단계까지) — .gsn 되살리기에 쓴다 */
export async function listFolder(key: FolderKey, parts: string[], ext: string): Promise<{ path: string[]; name: string; file: File }[]> {
  const out: { path: string[]; name: string; file: File }[] = [];
  try {
    const d = await dirOf(key, parts, false);
    if (!d) return out;
    for await (const [n, h] of d.entries()) {
      if (h.kind === "file" && n.toLowerCase().endsWith(ext)) out.push({ path: [], name: n, file: await h.getFile() });
      else if (h.kind === "directory") {
        for await (const [n2, h2] of h.entries()) if (h2.kind === "file" && n2.toLowerCase().endsWith(ext)) out.push({ path: [n], name: n2, file: await h2.getFile() });
      }
    }
  } catch { /* 폴더가 없다 */ }
  return out;
}

/** 이번 화면에서 폴더 되살리기를 했나 (gongsil.ts 가 쓴다) */
export let restored = false;
export const markRestored = () => { restored = true; };

/** 파일 내려받기 — 폴더가 있으면 그 폴더에, 없으면 다운로드 폴더로 (true = 폴더에 저장함) */
export async function saveOrDownload(key: FolderKey, parts: string[], name: string, blob: Blob, download: (n: string, b: Blob) => void): Promise<boolean> {
  if (await saveToFolder(key, parts, name, blob)) return true;
  download(name, blob);
  return false;
}
