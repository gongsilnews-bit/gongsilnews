"use client";
/**
 * 공실열람 찜(★) 한곳 모음 (2026-11-04 사장님) — 공실 · 기사 · 부동산. 누르면 노란 별.
 *  공실 = GongsilClient 의 wishlist (알림 "gs-vacancy-stars" 로 받고, 누르면 "gs-vacancy-star" 로 맡긴다)
 *  기사·부동산·단지 = actions/mapStars. 지도 말풍선(HTML)은 starHtml() + 문서 전체 클릭 한 곳에서 받는다.
 */
import { useEffect, useState } from "react";
import { getMyMapStars, toggleMapStar } from "@/app/actions/mapStars";

export type StarKind = "vac" | "art" | "ag" | "apt"; // apt = 단지 (아파트·오피스텔·빌라, 11-04 사장님)
const sets: Record<StarKind, Set<string>> = { vac: new Set(), art: new Set(), ag: new Set(), apt: new Set() };
let loggedIn = false, loaded = false;
const subs = new Set<() => void>();
const changed = () => { subs.forEach((f) => f()); paintAll(); };

// 찜 모양 — 별(★) 대신 책갈피 (2026-11-04 사장님: "별표가 아니라 책갈피로", 공실 상세의 저장 단추와 같은 모양). 누르면 노란색은 그대로
const STAR = "M6.5 3.5h11a1 1 0 0 1 1 1v16.2l-6.5-4.3-6.5 4.3V4.5a1 1 0 0 1 1-1z";
export const starSvg = (on: boolean, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}" fill="${on ? "#facc15" : "none"}" stroke="${on ? "#eab308" : "#9ca3af"}" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
export const isStar = (k: StarKind, id: string) => sets[k].has(String(id));
/** 지도 말풍선용 — 누르면 찜 (문서 전체 클릭에서 받는다) */
export const starHtml = (k: StarKind, id: string, size = 20) =>
  `<span data-star="${k}:${String(id).replace(/"/g, "")}" title="${isStar(k, id) ? "찜 해제" : "찜하기"}" style="display:inline-flex;cursor:pointer;line-height:0;padding:2px">${starSvg(isStar(k, id), size)}</span>`;

function paintAll() {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLElement>("[data-star]").forEach((el) => {
    const [k, id] = String(el.dataset.star).split(":") as [StarKind, string];
    const on = isStar(k, id);
    el.innerHTML = starSvg(on, Number(el.dataset.size || 20));
    el.title = on ? "찜 해제" : "찜하기";
  });
}

export async function toggleStar(k: StarKind, id: string) {
  id = String(id);
  if (k === "vac") { window.dispatchEvent(new CustomEvent("gs-vacancy-star", { detail: id })); return; }
  if (!loggedIn) { window.dispatchEvent(new CustomEvent("gs-need-login", { detail: "찜하시려면 로그인이 필요합니다." })); return; }
  const on = !sets[k].has(id);
  if (on) sets[k].add(id); else sets[k].delete(id);
  changed();
  window.dispatchEvent(new CustomEvent("gs-toast", { detail: on ? "찜했습니다." : "찜을 해제했습니다." }));
  const r = await toggleMapStar(k as "art" | "ag" | "apt", id, on).catch(() => ({ success: false, error: "저장하지 못했습니다." } as { success: boolean; error?: string; login?: boolean }));
  if (!r.success) {
    if (on) sets[k].delete(id); else sets[k].add(id);
    changed();
    if (r.login) window.dispatchEvent(new CustomEvent("gs-need-login", { detail: "찜하시려면 로그인이 필요합니다." }));
    else window.dispatchEvent(new CustomEvent("gs-toast", { detail: r.error || "저장하지 못했습니다." }));
  }
}

let wired = false;
function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  // 공실 찜 목록 — GongsilClient 가 바뀔 때마다 알려 준다
  window.addEventListener("gs-vacancy-stars", (e) => { sets.vac = new Set(((e as CustomEvent).detail as string[]).map(String)); changed(); });
  // 지도 말풍선 안 ★ (지도·말풍선의 다른 클릭보다 먼저)
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement | null)?.closest?.("[data-star]") as HTMLElement | null;
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    const [k, id] = String(el.dataset.star).split(":") as [StarKind, string];
    void toggleStar(k, id);
  }, true);
  if (!loaded) {
    loaded = true;
    getMyMapStars().then((r) => { loggedIn = r.loggedIn; sets.art = new Set(r.articles); sets.ag = new Set(r.agencies); sets.apt = new Set(r.complexes); changed(); }).catch(() => {});
  }
}

/** 화면 쪽 — 찜이 바뀌면 다시 그린다 */
export function useStars() {
  const [, setN] = useState(0);
  useEffect(() => {
    wire();
    const f = () => setN((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return { isStar, toggleStar };
}

/** React 쪽 ★ 단추 */
export function starButtonProps(k: StarKind, id: string) {
  return {
    "data-star": `${k}:${id}`,
    title: isStar(k, id) ? "찜 해제" : "찜하기",
    dangerouslySetInnerHTML: { __html: starSvg(isStar(k, id)) },
  };
}

/* ── 최근 본 기사·부동산·단지 (2026-11-04 사장님: MY관심에 최근 본 것도) — 이 기기에 50개까지, 카드에 그릴 내용째 ── */
export type RecentKind = "art" | "ag" | "apt";
const RKEY = (k: RecentKind) => `gs-recent-${k}`;
export function addRecent(k: RecentKind, item: { id: string } & Record<string, unknown>) {
  try {
    const l = JSON.parse(localStorage.getItem(RKEY(k)) || "[]") as { id: string }[];
    const next = [{ ...item, seenAt: new Date().toISOString() }, ...l.filter((x) => String(x.id) !== String(item.id))].slice(0, 50);
    localStorage.setItem(RKEY(k), JSON.stringify(next));
  } catch { /* 사생활 보호 모드 */ }
}
export function getRecent<T>(k: RecentKind): T[] {
  try { return JSON.parse(localStorage.getItem(RKEY(k)) || "[]") as T[]; } catch { return []; }
}
