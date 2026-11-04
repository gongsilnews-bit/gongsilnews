"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 웹 뉴스·SNS자동화 공통 (2026-11-04 사장님: 웹 전용은 한 폴더에 — 관리자 코드가 복잡해지지 않게)
 *  서버 묻기 · 이용 횟수 · 진행 글 · 이 브라우저 저장(IndexedDB) · 사진 다듬기·내려받기 · 공실마케팅 도우미(크롬 확장)
 *  소재마다 따로: gongsil.ts(공실뉴스) · 다음에 column.ts(뉴스칼럼)
 */
import { webAi } from "./ai-ask";
export { webAi };

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const newId = () => Math.random().toString(16).slice(2, 14).padEnd(12, "0");
export const now = () => new Date().toISOString();

/* ── 이 브라우저 저장 (IndexedDB) ── */
let memberId = "";
export const setStudioWebMember = (id: string) => { memberId = id; };
export const getMember = () => memberId;
export const DB_NAME = "gs-studio-web";
export let dbp: Promise<IDBDatabase> | null = null;
export function db() {
  if (!dbp) dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("works", { keyPath: "key" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}
export async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const q = fn(d.transaction("works", mode).objectStore("works"));
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}

/* ── 서버 ── */
export async function api(op: string, body: Record<string, unknown> = {}) {
  const r = await fetch("/api/studio/web", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...body }) });
  const d = await r.json().catch(() => null);
  if (!d || !d.success) throw new Error((d && d.error) || "공실뉴스 서버에 묻지 못했어요. 잠시 뒤 다시 해 주세요.");
  return d;
}
export const optCache = new Map<string, Promise<any>>();
export const options = (vacancy?: any) => {
  const k = vacancy && vacancy.saleKind ? `a:${vacancy.saleKind}` : "g";
  if (!optCache.has(k)) optCache.set(k, api("options", { vacancy: vacancy || null }).catch((e) => { optCache.delete(k); throw e; }));
  return optCache.get(k)!;
};
export async function useQuota(kind: string, vacancyId: string) {
  const r = await fetch("/api/studio/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, vacancyId }) });
  const d = await r.json().catch(() => ({}));
  if (!d || !d.success) throw new Error((d && d.error) || "이용 횟수를 확인하지 못했어요. 잠시 뒤 다시 해 주세요.");
}


/* ── 진행 글 ── */
export const listeners: Record<string, Set<(t: string) => void>> = {};
export const onProgress = (ch: string) => (fn: (t: string) => void) => {
  (listeners[ch] ||= new Set()).add(fn);
  return () => { listeners[ch].delete(fn); };
};
export const say = (ch: string, t: string) => listeners[ch]?.forEach((f) => f(t));


/* ── 그림 ── */
export function loadImage(src: string): Promise<HTMLImageElement> {
  const viaProxy = /^https?:/i.test(src) && !src.startsWith(location.origin);
  const tryLoad = (u: string, cors: boolean) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("사진을 불러오지 못했어요."));
    img.src = u;
  });
  if (!viaProxy) return tryLoad(src, false);
  return tryLoad(src, true).catch(() => tryLoad(`/api/proxy-image?url=${encodeURIComponent(src)}`, true));
}
/** mode: max = 긴 변 w 까지 줄이기 · cover = w×h 가운데 자르기 · fit = w×h 안에 넣고 흰 여백 */
export async function toJpeg(src: string, w: number, h = w, mode: "max" | "cover" | "fit" = "max", q = 0.88) {
  const img = await loadImage(src);
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  if (mode === "max") {
    const s = Math.min(1, w / Math.max(iw, ih));
    c.width = Math.round(iw * s); c.height = Math.round(ih * s);
    g.drawImage(img, 0, 0, c.width, c.height);
  } else {
    c.width = w; c.height = h;
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    const s = mode === "cover" ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  return c.toDataURL("image/jpeg", q);
}
export const readFile = (f: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(f); });
export function pickFiles(multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files || []));
    window.addEventListener("focus", () => setTimeout(() => resolve(Array.from(input.files || [])), 800), { once: true }); // 취소
    input.click();
  });
}
export function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
export const safeName = (s: string) => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
export const ymd = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; };

export async function zipDownload(name: string, files: { name: string; data: string | Blob }[]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const f of files) {
    if (typeof f.data === "string" && f.data.startsWith("data:")) zip.file(f.name, f.data.split(",")[1], { base64: true });
    else zip.file(f.name, f.data);
  }
  download(name, await zip.generateAsync({ type: "blob" }));
}

/* ── 공실마케팅 도우미 (크롬 확장 web-bridge.js) ── */
/* 도우미가 깔려 있나 — web-bridge.js 가 바로 대답한다 (한 번 대답하면 기억) */
export let helperSeen = false;
export async function helperOn() {
  if (helperSeen) return true;
  const r = await helper({ op: "ping" }, 1200);
  helperSeen = Boolean(r && r.ok);
  return helperSeen;
}
export function helper(msg: Record<string, unknown>, ms = 8000): Promise<any> {
  return new Promise((resolve) => {
    const id = `${Date.now()}-${Math.random()}`;
    const t = setTimeout(() => { window.removeEventListener("message", on); resolve(null); }, ms);
    const on = (e: MessageEvent) => {
      if (e.source !== window || !e.data || e.data.gsHelperRes !== true || e.data.id !== id) return;
      clearTimeout(t);
      window.removeEventListener("message", on);
      resolve(e.data.res);
    };
    window.addEventListener("message", on);
    window.postMessage({ gsHelperReq: true, id, msg }, location.origin);
  });
}
export async function helperWait(id: string, what: "taken" | "done", ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await helper({ op: "status", id });
    if (s && s.ok && (what === "taken" ? s.taken || s.done : s.done)) return what === "done" ? s.done : true;
    await sleep(1200);
  }
  return null;
}
export const NO_HELPER = "HELPER_NONE: 공실마케팅 도우미(크롬 확장)가 응답하지 않았어요. 도우미(1.0.39 이상)를 설치하거나 새로 고친 뒤에는 이 화면을 한 번 새로고침(F5)하고 다시 눌러 주세요. 아니면 아래 직접 붙여 넣기로 올려 주세요.";
/* 발행한 글 주소 → 홍보현황 (앱은 helper-server onPublished). 웹은 이 화면이 열려 있는 동안 도우미에게 묻는다 */
export const PUB_KEY = "gs-web-helper-pubs";
type Pub = { id: string; vacancyId: string; channel: string; at: number };
export const pubs = (): Pub[] => { try { return (JSON.parse(localStorage.getItem(PUB_KEY) || "[]") as Pub[]).filter((p) => Date.now() - p.at < 3 * 60 * 60 * 1000); } catch { return []; } };
export const setPubs = (l: Pub[]) => { try { localStorage.setItem(PUB_KEY, JSON.stringify(l.slice(-20))); } catch { /* */ } };
export let pubTimer = 0;
export function watchPublished() {
  if (pubTimer || typeof window === "undefined") return;
  pubTimer = window.setInterval(async () => {
    const list = pubs();
    if (!list.length || !(await helperOn())) return;
    for (const p of list) {
      const s = await helper({ op: "status", id: p.id });
      if (!s || !s.ok) { if (s && !s.ok) setPubs(pubs().filter((x) => x.id !== p.id)); continue; }
      if (s.published) {
        const r = await fetch("/api/studio/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vacancyId: p.vacancyId, channel: p.channel, url: s.published }) }).then((x) => x.json()).catch(() => null);
        if (r && r.success) { setPubs(pubs().filter((x) => x.id !== p.id)); void helper({ op: "forget", id: p.id }); window.dispatchEvent(new CustomEvent("gs-promo-saved", { detail: { vacancyId: p.vacancyId, channel: p.channel } })); }
      }
    }
  }, 15000);
}
export async function helperJob(target: string, payload: Record<string, unknown>, openUrl: string, vacancyId: string, channel: string, progressCh: string, label: string) {
  if (!(await helperOn())) throw new Error(NO_HELPER);
  const r = await helper({ op: "job", target, payload });
  if (!r || !r.ok || !r.id) throw new Error(NO_HELPER);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vacancyId)) setPubs([...pubs(), { id: r.id, vacancyId, channel, at: Date.now() }]);
  window.open(openUrl, "_blank");
  say(progressCh, `새 탭에 ${label}을(를) 열었어요. 공실마케팅 도우미가 채우기를 기다리는 중…`);
  if (!(await helperWait(r.id, "taken", 45000))) {
    void helper({ op: "forget", id: r.id });
    throw new Error(`HELPER_NONE: 도우미가 ${label} 화면에서 일감을 받아 가지 않았어요. 새 탭에 ${label}이(가) 로그인된 채로 열렸는지 확인하고 다시 눌러 주세요.`);
  }
  return r.id as string;
}
