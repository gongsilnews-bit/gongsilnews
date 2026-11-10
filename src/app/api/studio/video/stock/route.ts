import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { r2Json, r2Ready, r2Url } from "@/lib/r2";
import { proMember } from "@/utils/studioUsage";

/**
 * 영상 편집기 무료 이미지·비디오 검색 — 사이트 키는 서버에만 둔다 (앱에 넣지 않음)
 *  GET ?q=검색어(영어 권장)&type=photo|video&orientation=landscape|portrait|square&page=1
 *  → { items: [{ id, kind, thumb, url, width, height, duration, credit, source, page }] }
 *  키: PEXELS_API_KEY (Pexels), PIXABAY_API_KEY (Pixabay) — 둘 다 없으면 needKey
 *  공실뉴스 자료 (2026-10-28) — 우리 드론 영상(R2 비공개 보관함). 장소·샷 이름으로 찾아 맨 앞에. 주소는 서명 주소(몇 시간만)
 */
type Item = { id: string; kind: "image" | "video"; thumb: string; url: string; width: number; height: number; duration?: number; credit: string; source: string; page: string };

// 같은 검색은 24시간 저장해 두고 다시 쓴다 — Pixabay 규칙(요청 24시간 캐시)이고, 한도(1분 100번)도 아낀다 (서버 데이터 캐시)
// 24시간이던 것을 3시간으로 줄였다 (2026-11-06): Pixabay 그림 주소는 받은 뒤 24시간만 열려서, 실제 사이트에서 하루 묵은 결과의 그림이 깨져 보였다
const DAY = 60 * 60 * 3;

async function pexels(q: string, type: string, orientation: string, page: number): Promise<Item[]> {
  const key = envKey("PEXELS_API_KEY");
  if (!key) return [];
  const o = orientation ? `&orientation=${orientation}` : "";
  if (type === "video") {
    const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}${o}`, { headers: { Authorization: key }, next: { revalidate: DAY } });
    const j = await r.json().catch(() => ({}));
    return (j.videos || []).map((v: { id: number; image: string; width: number; height: number; duration: number; user?: { name: string }; url: string; video_files: { link: string; width: number; height: number; quality: string; file_type: string }[] }) => {
      const files = (v.video_files || []).filter((f) => f.file_type === "video/mp4").sort((a, b) => b.width * b.height - a.width * a.height);
      const pick = files.find((f) => Math.min(f.width, f.height) <= 1080) || files[files.length - 1];
      return { id: `pexels-v-${v.id}`, kind: "video", thumb: v.image, url: pick?.link || "", width: pick?.width || v.width, height: pick?.height || v.height, duration: v.duration, credit: v.user?.name || "Pexels", source: "Pexels", page: v.url };
    }).filter((x: Item) => x.url);
  }
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=30&page=${page}${o}`, { headers: { Authorization: key }, next: { revalidate: DAY } });
  const j = await r.json().catch(() => ({}));
  return (j.photos || []).map((p: { id: number; width: number; height: number; photographer: string; url: string; src: { large2x: string; medium: string } }) => ({
    id: `pexels-p-${p.id}`, kind: "image", thumb: p.src.medium, url: p.src.large2x, width: p.width, height: p.height, credit: p.photographer, source: "Pexels", page: p.url,
  }));
}

/** 환경 변수 키 — 앞뒤 빈칸·줄바꿈·따옴표를 뗀다 (Vercel 에 붙여 넣을 때 섞이기 쉽다, 2026-11-09) */
const envKey = (name: string) => (process.env[name] || "").trim().replace(/^["']|["']$/g, "").trim();

/** Pixabay 답 읽기 — 실패하면 이유(상태·앞부분)를 담아 던진다. 예전에는 빈 목록으로 숨겨 "찾은 자료가 없어요"만 보였다 */
async function pixabayJson(url: string) {
  // 서버 저장(revalidate)을 쓰지 않는다 — 실패한 답이 저장돼 계속 빈 목록이 나올 수 있었다. 같은 검색은 브라우저가 10분 저장한다
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  if (!r.ok) throw new Error(`Pixabay ${r.status}: ${text.slice(0, 120)}`);
  try { return JSON.parse(text) as { hits?: unknown[] }; } catch { throw new Error(`Pixabay 응답을 읽지 못함 (${r.status}): ${text.slice(0, 120)}`); }
}

async function pixabay(q: string, type: string, orientation: string, page: number): Promise<Item[]> {
  const key = envKey("PIXABAY_API_KEY");
  if (!key) return [];
  const o = orientation === "portrait" ? "&orientation=vertical" : orientation === "landscape" ? "&orientation=horizontal" : "";
  // 한글 검색어는 lang=ko 를 붙여야 찾는다 (기본 en — "아파트 거실"이 거의 안 나오던 것)
  const lang = /[가-힣]/.test(q) ? "&lang=ko" : "";
  if (type === "video") {
    const j = await pixabayJson(`https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(q)}${lang}&per_page=24&page=${page}&safesearch=true`);
    return ((j.hits || []) as Parameters<typeof pixabayVideo>[0][]).map(pixabayVideo).filter((x: Item) => x.url);
  }
  const j = await pixabayJson(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}${lang}&image_type=photo&per_page=30&page=${page}&safesearch=true${o}`);
  return ((j.hits || []) as Parameters<typeof pixabayPhoto>[0][]).map(pixabayPhoto);
}
function pixabayVideo(v: { id: number; duration: number; user: string; pageURL: string; videos: Record<string, { url: string; width: number; height: number; thumbnail: string }> }): Item {
  const f = v.videos.large?.url ? v.videos.large : v.videos.medium;
  return { id: `pixabay-v-${v.id}`, kind: "video", thumb: f?.thumbnail || v.videos.medium?.thumbnail || "", url: f?.url || "", width: f?.width || 0, height: f?.height || 0, duration: v.duration, credit: v.user, source: "Pixabay", page: v.pageURL };
}
function pixabayPhoto(p: { id: number; webformatURL: string; largeImageURL: string; imageWidth: number; imageHeight: number; user: string; pageURL: string }): Item {
  return { id: `pixabay-p-${p.id}`, kind: "image", thumb: p.webformatURL, url: p.largeImageURL, width: p.imageWidth, height: p.imageHeight, credit: p.user, source: "Pixabay", page: p.pageURL };
}

/* ── 공실뉴스 자료 — R2 catalog/drone.json (올리기: drone 폴더 → R2, 항목 { id, place, shot, dur, w, h, thumb }) ── */
type DroneItem = { id: string; place: string; shot: string; dur: number; w: number; h: number; thumb: boolean };
let droneCache: { at: number; items: DroneItem[] } | null = null;
async function droneList(): Promise<DroneItem[]> {
  if (droneCache && Date.now() - droneCache.at < 10 * 60 * 1000) return droneCache.items;
  const j = await r2Json<{ items: DroneItem[] }>("catalog/drone.json").catch(() => null);
  const items = j?.items || droneCache?.items || [];
  if (items.length) droneCache = { at: Date.now(), items }; // 비었으면 기억하지 않는다 (올리는 중·잠깐 실패)
  return items;
}
// "드론"·"항공" 같은 말은 드론 자료 전체를 뜻한다 — 나머지 낱말이 모두 장소·샷 이름에 있어야 나온다
const DRONE_WORDS = /^(드론|드론영상|드론샷|항공|항공촬영|항공뷰|하늘|공중|aerial|drone|공실뉴스)$/i;
//  type=drone ([공실뉴스 드론] 탭) — 검색어가 없어도 전부, 한 번에 (편집기가 지역·검색으로 거른다)
async function gongsil(q: string, type: string, page: number): Promise<Item[]> {
  if ((type !== "video" && type !== "drone") || !r2Ready()) return []; // 가로 영상뿐이지만 세로(쇼츠)에도 보여 준다 — 편집기가 화면에 맞게 자른다
  if (type === "video" && !q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  const rest = words.filter((w) => !DRONE_WORDS.test(w));
  const all = await droneList();
  const hit = all.filter((d) => {
    const hay = `${d.place} ${d.shot}`.replace(/\s+/g, "");
    return rest.every((w) => hay.includes(w));
  });
  const per = type === "drone" ? 1000 : 24;
  return hit.slice((page - 1) * per, page * per).map((d) => ({
    id: `gongsil-d-${d.id}`, kind: "video", thumb: d.thumb ? r2Url(`drone/thumbs/${d.id}.jpg`) : "", url: r2Url(`drone/${d.id}.mp4`), width: d.w, height: d.h, duration: d.dur,
    credit: `드론 · ${d.place}${d.shot ? ` · ${d.shot}` : ""}`, source: "공실뉴스", page: "",
  }));
}

/* ── 공실뉴스 사진 (2026-11-10 사장님 사진 5천여 장) — R2 catalog/photo.json, 사진 photo/{id}.webp · 미리보기 photo/thumbs/{id}.webp
 *  올리기: scripts/upload_open_photos.mjs (목록.csv 블러 칸이 빈 사진만)
 *  항목 { id, g 묶음(드론·거리·매물), c 분류, s 공간(매물만), k 검색 낱말, w, h } */
type PhotoItem = { id: string; g: string; c: string; s: string; k: string; w: number; h: number };
let photoCache: { at: number; items: PhotoItem[] } | null = null;
async function photoList(): Promise<PhotoItem[]> {
  if (photoCache && Date.now() - photoCache.at < 10 * 60 * 1000) return photoCache.items;
  const j = await r2Json<{ items: PhotoItem[] }>("catalog/photo.json").catch(() => null);
  const items = j?.items || photoCache?.items || [];
  if (items.length) photoCache = { at: Date.now(), items };
  return items;
}
const PHOTO_PER = 60;
function photoItem(p: PhotoItem): Item {
  return {
    id: `gongsil-p-${p.id}`, kind: "image", thumb: r2Url(`photo/thumbs/${p.id}.webp`), url: `/api/studio/video/stock?type=gphoto-file&id=${p.id}`,
    width: p.w, height: p.h, credit: [p.c, p.s, p.k].filter(Boolean).join(" · "), source: "공실뉴스", page: "",
  };
}
/** 공실뉴스 사진 찾기 — 묶음·분류·공간으로 거르고, 검색 낱말은 모두 들어 있어야 */
async function gongsilPhotos(sp: URLSearchParams) {
  const all = await photoList();
  const g = sp.get("g") || "", c = sp.get("c") || "", s = sp.get("s") || "";
  const words = (sp.get("q") || "").trim().slice(0, 80).split(/\s+/).filter((w) => w && !/^(사진|공실뉴스)$/.test(w));
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const hit = all.filter((p) => (!g || p.g === g) && (!c || p.c === c) && (!s || p.s === s) && words.every((w) => `${p.g}${p.c}${p.s}${p.k}`.replace(/\s+/g, "").includes(w)));
  // 고르기 칸 — 지금 묶음(·분류) 안에서 있는 것만
  const inG = all.filter((p) => !g || p.g === g);
  const cats = Array.from(new Set(inG.map((p) => p.c))).filter(Boolean);
  const spaces = Array.from(new Set(inG.filter((p) => !c || p.c === c).map((p) => p.s))).filter(Boolean);
  return { items: hit.slice((page - 1) * PHOTO_PER, page * PHOTO_PER).map(photoItem), total: hit.length, more: hit.length > page * PHOTO_PER, cats, spaces };
}

export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const sp0 = req.nextUrl.searchParams;
  // 공실뉴스 사진 — 원본(WebP)은 서버가 받아 넘겨 준다 (보관함이 비공개라 브라우저가 바로 받지 못함)
  if (sp0.get("type") === "gphoto-file") {
    const id = (sp0.get("id") || "").replace(/[^a-f0-9]/g, "");
    if (!id || !r2Ready()) return NextResponse.json({ success: false, error: "사진을 찾지 못했어요." }, { status: 404 });
    // 공실뉴스부동산(유료)·비즈니스·최고관리자만 (2026-11-11 사장님: "공실뉴스부동산에게만 노출") — 무료 회원은 흰 막 아래 미리보기만
    if (!proMember(member)) return NextResponse.json({ success: false, error: "공실뉴스 사진은 공실뉴스부동산 전용입니다." }, { status: 403 });
    const r = await fetch(r2Url(`photo/${id}.webp`, 600), { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ success: false, error: "사진을 찾지 못했어요." }, { status: 404 });
    return new NextResponse(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" } });
  }
  if (sp0.get("type") === "gphoto") {
    if (!r2Ready()) return NextResponse.json({ success: false, error: "공실뉴스 사진을 준비 중이에요." });
    const r = await gongsilPhotos(sp0).catch(() => null);
    if (!r) return NextResponse.json({ success: false, error: "공실뉴스 사진을 불러오지 못했어요." });
    return NextResponse.json({ success: true, ...r }, { headers: { "Cache-Control": "private, max-age=600" } });
  }
  // 앱이 드론 영상을 미리보기·굽기에 쓸 때마다 — 잠깐만 열리는 주소 (PC에 받지 않음). 누가 무엇을 썼는지 기록
  //  쓰는 회원 범위는 나중에 정한다 (2026-10-28 사장님) — 정하면 여기서 막는다
  if (sp0.get("type") === "drone-url" || sp0.get("type") === "dronethumb-url") {
    const id = (sp0.get("id") || "").replace(/[^\w-]/g, "");
    if (!id || !r2Ready()) return NextResponse.json({ success: false, error: "공실뉴스 자료를 찾지 못했어요." });
    const thumb = sp0.get("type") === "dronethumb-url";
    if (!thumb) console.log(`[공실뉴스 드론] ${member.id || ""} ${id}`);
    return NextResponse.json({ success: true, url: r2Url(thumb ? `drone/thumbs/${id}.jpg` : `drone/${id}.mp4`) }, { headers: { "Cache-Control": "no-store" } });
  }
  if (sp0.get("type") === "drone") {
    if (!r2Ready()) return NextResponse.json({ success: false, error: "공실뉴스 드론 자료를 준비 중이에요." });
    const items = await gongsil((sp0.get("q") || "").trim().slice(0, 80), "drone", 1).catch(() => []);
    return NextResponse.json({ success: true, items }, { headers: { "Cache-Control": "private, max-age=600" } });
  }
  if (!envKey("PEXELS_API_KEY") && !envKey("PIXABAY_API_KEY")) {
    return NextResponse.json({ success: false, needKey: true, error: "무료 이미지·비디오 검색 준비 중입니다 (사이트 키 등록 전)." });
  }
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  if (!q) return NextResponse.json({ success: true, items: [] });
  const type = sp.get("type") === "video" ? "video" : "photo";
  const orientation = ["landscape", "portrait", "square"].includes(sp.get("orientation") || "") ? (sp.get("orientation") as string) : "";
  const page = Math.max(1, Math.min(20, Number(sp.get("page")) || 1));
  const errs: string[] = [];
  const keep = (src: string) => (e: unknown) => { const m = `${src}: ${e instanceof Error ? e.message : String(e)}`; errs.push(m); console.error("[오픈자료]", m); return [] as Item[]; };
  const [g, a, b] = await Promise.all([gongsil(q, type, page).catch(keep("공실뉴스 드론")), pexels(q, type, orientation, page).catch(keep("Pexels")), pixabay(q, type, orientation, page).catch(keep("Pixabay"))]);
  // 공실뉴스 자료가 맨 앞, 나머지 두 곳은 번갈아 섞는다
  const items: Item[] = [...g];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) items.push(a[i]);
    if (b[i]) items.push(b[i]);
  }
  // 하나도 못 찾았는데 실패가 있었으면 이유를 보여 준다 (빈 답은 브라우저에 저장하지 않는다)
  if (!items.length && errs.length) return NextResponse.json({ success: false, error: `오픈자료를 불러오지 못했어요 (${errs.join(" · ").slice(0, 200)})` }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ success: true, items }, { headers: { "Cache-Control": items.length ? "private, max-age=600" : "no-store" } });
}
