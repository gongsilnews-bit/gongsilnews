"use client";
/**
 * 빈 장면 채우기 — 웹 쇼츠릴스studio (2026-11-11 사장님: "해당 없는 사진이 많이 나와 · 너무 복잡하게 말고 간단하게 체크")
 *  체크 네 개: ☑ 공실 사진 ☑ 단지 화면 ☑ 공실뉴스 사진·드론 ☐ 무료 사진(Pixabay) — 고른 것은 이 PC 에 기억
 *  관련 있는 것만 넣는다. 모자라면 앞 장면 사진을 그대로 이어 쓴다 (엉뚱한 사진을 넣지 않는다)
 *  사진·영상(드론)은 저절로 섞는다. [영상 만들기]와 편집 화면 [빈 장면 채우기]가 같이 쓴다
 */
import { videoBridge, type Asset, type Project } from "./types";
import { captureComplexScreens } from "@/components/admin/writing/realScreenShot";
import { writingVacancyFacts } from "@/app/actions/writingFacts";
import { getVideoVacancy, type VideoVacancy } from "@/app/actions/videoWeb";

export type FillOpts = { vacancy: boolean; complex: boolean; gongsil: boolean; free: boolean };
const KEY = "gsv:webFill";
export const FILL_DEFAULT: FillOpts = { vacancy: true, complex: true, gongsil: true, free: false };
export function loadFill(): FillOpts {
  try { return { ...FILL_DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) || "null") || {}) }; } catch { return FILL_DEFAULT; }
}
export function saveFill(o: FillOpts) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* */ }
}
export const FILL_LABELS: [keyof FillOpts, string, string][] = [
  ["vacancy", "공실 사진", "고른 공실에 올린 사진"],
  ["complex", "단지 화면", "그 공실 단지의 시세 화면·스카이뷰·주변 지도 (로드뷰는 빼요)"],
  ["gongsil", "공실뉴스 사진·드론", "그 동네 공실뉴스 사진과 드론 영상 (사진은 공실뉴스부동산)"],
  ["free", "무료 사진", "주제에 맞는 무료 사진 — 관련 없는 사진이 섞일 수 있어요"],
];

type B = NonNullable<ReturnType<typeof videoBridge>>;
type Stock = { id: string; kind: "image" | "video"; thumb: string; url: string; width: number; height: number; duration?: number; credit: string; source: string };

/** 매물 종류 → 무료 사진 찾는 말 (Pixabay 는 영어가 잘 찾아진다) */
function freeWord(kind: string) {
  if (/아파트/.test(kind)) return "korea apartment building";
  if (/오피스텔/.test(kind)) return "officetel building interior";
  if (/빌라|주택|연립|다세대|다가구/.test(kind)) return "residential house interior";
  if (/상가|점포|매장/.test(kind)) return "store street shop";
  if (/사무실|오피스|지식산업/.test(kind)) return "office interior";
  if (/공장|창고/.test(kind)) return "warehouse";
  if (/토지|땅/.test(kind)) return "land field";
  return "apartment interior";
}

/**
 * 채울 자료를 모은다 (프로젝트에 넣은 자료 id 목록). need = 더 필요한 장면 수
 *  vacId — 공실 id (없으면 공실·단지·동네 자료 없이). words — 장면마다 찾을 말 (AI편집에서 온 것, 무료 사진에 씀)
 */
export async function gatherFill(b: B, p: Project, o: { opts: FillOpts; vacId: string; info?: VideoVacancy | null; need: number; ratio: string; words?: string[]; skipVacancy?: boolean; say?: (t: string) => void }): Promise<string[]> {
  const { opts, vacId, need } = o;
  if (need <= 0) return [];
  const say = o.say || (() => {});
  const orient = o.ratio === "9:16" || o.ratio === "4:5" ? "portrait" : o.ratio === "1:1" ? "square" : "landscape";
  const isVac = Boolean(vacId) && !vacId.startsWith("col-");
  let info = o.info || null;
  if (isVac && !info) { const r = await getVideoVacancy(vacId).catch(() => null); info = r && r.success ? r.data : null; }
  const add = async (id: string) => { const a: Asset | null = await b.project.addAsset(id).catch(() => null); if (a) { p.assets[a.id] = a; return a.id; } return ""; };
  const lists: string[][] = [];
  // ① 공실 사진 (편집 화면에서 채울 때 — 영상 만들기에서는 이미 넣었으니 건너뜀)
  if (opts.vacancy && isVac && !o.skipVacancy) {
    say("공실 사진을 불러오는 중…");
    const r = await b.vacancy(vacId).catch(() => ({ photos: [] as { id: string }[] }));
    const used = new Set(Object.values(p.assets).map((a) => a.name));
    const ids: string[] = [];
    for (const ph of r.photos.slice(0, need)) { if (used.has((ph as { name?: string }).name || "")) continue; const id = await add(ph.id); if (id) ids.push(id); }
    lists.push(ids);
  }
  // ② 단지 화면 — 로드뷰는 빼고 (2026-11-11 회의)
  if (opts.complex && isVac && b.photosFrom) {
    const f = await writingVacancyFacts(vacId).catch(() => null);
    const cid = f && f.success ? f.data.complexId : null;
    if (cid) {
      say("단지 화면을 찍는 중… (30초쯤)");
      const shots = await captureComplexScreens({ id: cid, name: info?.building || info?.title || "" }, "complex", (t) => say(`단지 화면을 찍는 중… ${t}`)).catch(() => []);
      const keep = shots.filter((s) => !/로드뷰/.test(s.caption)).slice(0, 4);
      const items = await b.photosFrom(keep.map((s) => ({ url: s.url, name: s.caption.replace(/^\[[^\]]*\]\s*/, "").slice(0, 40) }))).catch(() => []);
      const ids: string[] = [];
      for (const it of items) { const id = await add(it.id); if (id) ids.push(id); }
      lists.push(ids);
    }
  }
  // ③ 공실뉴스 사진·드론 — 그 동네(동)만. 다른 동네 것은 넣지 않는다
  const dong = info?.dong || "";
  if (opts.gongsil && dong && b.stock) {
    say(`${dong} 공실뉴스 사진·드론을 찾는 중…`);
    const ph = await fetch(`/api/studio/video/stock?type=gphoto&q=${encodeURIComponent(dong)}`, { credentials: "include" }).then((r) => r.json()).catch(() => null) as { success?: boolean; items?: Stock[] } | null;
    const dr = await b.stock.search(dong, "drone", orient, 1).catch(() => null) as { items?: Stock[] } | null;
    const photos: string[] = [], drones: string[] = [];
    for (const s of (ph?.items || []).slice(0, need)) { const it = await b.stock.get(p.dir, s).catch(() => null); const id = it ? await add(it.id) : ""; if (id) photos.push(id); }
    for (const s of (dr?.items || []).slice(0, Math.max(1, Math.ceil(need / 4)))) { const it = await b.stock.get(p.dir, s).catch(() => null); const id = it ? await add(it.id) : ""; if (id) drones.push(id); }
    lists.push(photos, drones);
  }
  // ④ 무료 사진(Pixabay) — 체크했을 때만. 장면마다 찾을 말이 있으면(AI편집) 그 말로, 없으면 매물 종류로
  if (opts.free && b.stock) {
    say("무료 사진을 찾는 중…");
    const ids: string[] = [];
    const words = (o.words || []).map((w) => w.trim()).filter(Boolean);
    const qs = words.length ? words : [freeWord(info?.intro.kind || "")];
    const per = Math.max(1, Math.ceil(need / qs.length));
    for (const q of qs) {
      if (ids.length >= need) break;
      const res = await b.stock.search(q, "photo", orient, 1).catch(() => null) as { items?: Stock[] } | null;
      for (const s of (res?.items || []).filter((x) => x.kind === "image" && x.source !== "공실뉴스").slice(0, per)) { const it = await b.stock.get(p.dir, s).catch(() => null); const id = it ? await add(it.id) : ""; if (id) ids.push(id); }
    }
    lists.push(ids);
  }
  // 섞기 — 갈래마다 하나씩 번갈아 (사진·드론 영상이 고르게)
  const out: string[] = [];
  for (let i = 0; out.length < need && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && out.length < need) out.push(l[i]);
  return out;
}

/** 장면에 자료를 차례로 — 모자라면 앞 장면 것을 그대로 (같은 사진 되풀이보다 엉뚱한 사진이 더 나쁘다) */
export function assignVisuals<T extends { visual?: { asset: string; s: number } | null }>(clips: T[], ids: string[], only?: (c: T, i: number) => boolean) {
  let k = 0, prev = "";
  clips.forEach((c, i) => {
    const want = only ? only(c, i) : true;
    if (want && ids[k]) c.visual = { asset: ids[k++], s: 0 };
    else if (want && !c.visual?.asset && prev) c.visual = { asset: prev, s: 0 };
    if (c.visual?.asset) prev = c.visual.asset;
  });
}
