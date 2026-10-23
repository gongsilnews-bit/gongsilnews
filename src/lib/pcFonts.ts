// 내 PC 글꼴 — 스튜디오 앱이 읽어 준 회원 윈도우 글꼴 목록 (2026-10-22 회의)
//  기본은 공실뉴스 글꼴, 그 아래 "내 PC 글꼴". 파일은 PC 안에서만 쓰고 서버에 올리지 않는다.
import { useEffect, useState } from "react";

export type PcFont = { family: string; ko: string; label: string; styles: string[] };
type Bridge = { fonts?: { pcList?: (refresh?: boolean) => Promise<PcFont[]> } };
const bridge = (): Bridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null) : null);

let cache: PcFont[] | null = null;
let pending: Promise<PcFont[]> | null = null;
const subs = new Set<(l: PcFont[]) => void>();

/** 목록 받기 (앱이 아니면 빈 목록) — refresh 면 글꼴 폴더를 다시 훑는다 */
export function loadPcFonts(refresh = false): Promise<PcFont[]> {
  const b = bridge();
  if (!b?.fonts?.pcList) return Promise.resolve([]);
  if (cache && !refresh) return Promise.resolve(cache);
  if (pending && !refresh) return pending;
  pending = b.fonts.pcList(refresh).then((l) => { cache = Array.isArray(l) ? l : []; subs.forEach((f) => f(cache!)); return cache; }).catch(() => (cache = [])).finally(() => { pending = null; });
  return pending;
}
/** 내 PC 글꼴 목록 (null = 아직 / 앱 아님은 []) */
export function usePcFonts(): PcFont[] | null {
  const [l, setL] = useState<PcFont[] | null>(cache);
  useEffect(() => {
    subs.add(setL);
    if (!cache) loadPcFonts().then(setL);
    return () => { subs.delete(setL); };
  }, []);
  return l;
}
export const pcFontsReady = () => cache;
/** 영문·한글 이름 어느 것이든 → PC 글꼴 */
export function findPcFont(name?: string): PcFont | null {
  if (!name || !cache) return null;
  const k = name.toLowerCase();
  return cache.find((f) => f.family.toLowerCase() === k || (f.ko && f.ko.toLowerCase() === k)) || null;
}
/** 앱에서 PC 글꼴을 다 읽었는데 없는 글꼴인지 (다른 PC 에서 만든 작업을 열 때 알림용) */
export const pcFontMissing = (name?: string) => Boolean(name && cache && cache.length && !findPcFont(name));
export const PC_FONT_NOTE = "내 PC 글꼴은 이 PC 에서만 써요. 상업용(광고·블로그) 사용 허락은 글꼴마다 달라요 — 쓰기 전에 확인하세요.";
