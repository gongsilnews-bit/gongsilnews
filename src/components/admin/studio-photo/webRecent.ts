"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 웹 포토studio 최근 파일 (2026-11-05 사장님: "저장했는데 최근 파일에 안 보여서")
 *  앱은 PC 에 기록하지만, 웹은 이 브라우저 안(IndexedDB)에 이름·미리보기·날짜·파일 손잡이를 둔다. 서버에는 올리지 않는다
 *  - [열기]를 크롬 파일 열기(showOpenFilePicker)로 열면 손잡이가 생겨 다시 열 수 있다 (크롬·엣지·웨일)
 *  - [저장 폴더]에 저장한 파일도 손잡이가 생긴다. 다운로드 폴더로 받은 파일은 손잡이가 없어 "다시 열 수 없음"으로 남는다
 *  - 다시 열 때 크롬이 처음 한 번 "파일 보기 허용"을 묻는다
 *  - 컴퓨터·브라우저마다 따로. 30개까지
 */

export type WebRecent = { path: string; name: string; at: number; thumb: string; missing?: boolean };
type Row = { id: string; name: string; at: number; thumb: string; handle?: any };

const DB = "gs-photo-recent";
const MAX = 30;
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("r", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await idb();
  return new Promise((resolve, reject) => {
    const q = fn(d.transaction("r", mode).objectStore("r"));
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}
const all = () => run<Row[]>("readonly", (s) => s.getAll()).catch(() => [] as Row[]);

export const canPickWithHandle = () => typeof window !== "undefined" && "showOpenFilePicker" in window;

export async function webRecentList(): Promise<WebRecent[]> {
  let rows = (await all()).sort((a, b) => b.at - a.at);
  // 같은 이름인데 다시 열 수 있는 칸이 있으면 — 다시 못 여는 칸은 지운다 (열고 저장해서 두 칸이 되던 것, 2026-11-05)
  const opened = new Set(rows.filter((r) => r.handle).map((r) => r.name));
  const dup = rows.filter((r) => !r.handle && opened.has(r.name));
  for (const r of dup) await run("readwrite", (st) => st.delete(r.id)).catch(() => {});
  rows = rows.filter((r) => !dup.includes(r));
  return rows.map((r) => ({ path: r.id, name: r.name, at: r.at, thumb: r.thumb, missing: !r.handle }));
}

/** 목록에 올린다 — 같은 파일(같은 손잡이, 손잡이가 없으면 같은 이름)은 하나로 */
export async function webRecentAdd(o: { name: string; thumb?: string; handle?: any }) {
  try {
    const rows = await all();
    let same: Row | undefined;
    for (const r of rows) {
      if (o.handle && r.handle) { try { if (await r.handle.isSameEntry(o.handle)) { same = r; break; } } catch { /* */ } }
      else if (!o.handle && r.name === o.name) { same = r; break; } // 손잡이 없이 같은 이름 — 있던 칸(손잡이 있으면 그대로)을 새로
    }
    // 손잡이가 생긴 파일 — 같은 이름의 다시 못 여는 칸은 지운다
    if (o.handle) for (const r of rows) if (!r.handle && r.name === o.name && r !== same) await run("readwrite", (st) => st.delete(r.id));
    const row: Row = { id: same?.id || `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`, name: o.name, at: Date.now(), thumb: o.thumb || same?.thumb || "", handle: o.handle || same?.handle };
    await run("readwrite", (s) => s.put(row));
    const old = [...rows.filter((r) => r.id !== row.id), row].sort((a, b) => b.at - a.at).slice(MAX);
    for (const r of old) await run("readwrite", (s) => s.delete(r.id));
    window.dispatchEvent(new Event("gs-photo-recent"));
  } catch { /* 기록 못 해도 열기·저장은 그대로 */ }
}

export async function webRecentRemove(id: string) {
  await run("readwrite", (s) => s.delete(id)).catch(() => {});
}

/** 다시 열기 — 손잡이로 읽는다 (처음 한 번 크롬이 허락을 묻는다) */
export async function webRecentRead(id: string): Promise<{ name: string; bytes?: Uint8Array; handle?: any; error?: string }> {
  const r = await run<Row | undefined>("readonly", (s) => s.get(id)).catch(() => undefined);
  if (!r) return { name: "", error: "목록에서 찾지 못했어요" };
  if (!r.handle) return { name: r.name, error: "다운로드 폴더로 받은 파일이라 여기서 다시 열 수 없어요. [열기]로 열어 주세요. ([저장 폴더]를 정하면 다음부터 바로 열려요)" };
  try {
    let p = await r.handle.queryPermission({ mode: "read" });
    if (p !== "granted") p = await r.handle.requestPermission({ mode: "read" });
    if (p !== "granted") return { name: r.name, error: "파일 보기를 허용해야 열 수 있어요" };
    const f: File = await r.handle.getFile();
    return { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()), handle: r.handle };
  } catch {
    return { name: r.name, error: "파일을 찾을 수 없어요 (옮기거나 지웠을 수 있어요)" };
  }
}

/** 크롬 파일 열기 — 손잡이와 함께. 취소하면 [] */
export async function pickWithHandles(images: boolean): Promise<{ file: File; handle: any }[]> {
  try {
    // 저장 폴더를 정했으면 04 포토studio 에서 열린다 (2026-11-06 사장님)
    const dir = await import("@/components/admin/studio-web/folder").then((m) => m.menuDir("photo")).catch(() => null);
    const hs: any[] = await (window as any).showOpenFilePicker({
      multiple: true,
      ...(dir ? { startIn: dir } : {}),
      types: [{ description: images ? "사진" : "PSD · 사진", accept: images ? { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] } : { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"], "application/octet-stream": [".psd", ".psb"] } }],
    });
    return Promise.all(hs.map(async (h) => ({ file: await h.getFile(), handle: h })));
  } catch {
    return [];
  }
}

/** 열었던 파일 자리에 그대로 저장 (포토샵 Ctrl+S 처럼) — 처음 한 번 크롬이 "저장 허용"을 묻는다. 못 하면 false */
export async function writeToHandle(handle: any, bytes: Uint8Array): Promise<boolean> {
  try {
    let p = await handle.queryPermission({ mode: "readwrite" });
    if (p !== "granted") p = await handle.requestPermission({ mode: "readwrite" });
    if (p !== "granted") return false;
    const w = await handle.createWritable();
    await w.write(new Blob([bytes as BlobPart]));
    await w.close();
    return true;
  } catch { return false; }
}

/** 다른 이름으로 저장 창 (크롬·엣지·웨일) — 고른 파일 손잡이, 취소 = "cancel", 안 되는 브라우저 = null */
export async function saveAsPicker(name: string, bytes: Uint8Array): Promise<any | "cancel" | null> {
  if (typeof window === "undefined" || !("showSaveFilePicker" in window)) return null;
  try {
    const ext = (/\.(\w+)$/.exec(name)?.[1] || "psd").toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "application/octet-stream";
    const dir = await import("@/components/admin/studio-web/folder").then((m) => m.menuDir("photo")).catch(() => null); // 04 포토studio 에서 (2026-11-06)
    const h = await (window as any).showSaveFilePicker({ suggestedName: name, startIn: dir || "documents", types: [{ description: ext.toUpperCase(), accept: { [mime]: [`.${ext}`] } }] });
    const w = await h.createWritable();
    await w.write(new Blob([bytes as BlobPart]));
    await w.close();
    return h;
  } catch (e: any) {
    return e && e.name === "AbortError" ? "cancel" : null;
  }
}
