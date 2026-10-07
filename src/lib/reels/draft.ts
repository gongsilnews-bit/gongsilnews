// 대본 초안: 사진 검사 → 장면 구성 → AI 대사 → 안전 검사.
// 숫자가 들어가는 장면(가격·마무리)은 AI 가 아니라 코드가 DB 숫자로 만든다. AI 는 숫자를 쓰지 않는다.
import { imageSize } from "image-size";
import { geminiJson } from "./gemini";
import { displayManwon, readNumber } from "./korean-number";
import type { ReelListing } from "./listing";
import { cleanFx, cleanSettings, type ReelFacts, type ReelPhoto, type ReelScene, type ReelScript, type SpeechUnit, cleanVideo } from "./types";

const MAX_PHOTO_SCENES = 4;

// 부동산 광고에서 허위·과장으로 문제될 수 있는 표현 (경고만, 막지 않음)
const RISKY_WORDS = ["최저가", "최저", "보장", "확정", "100%", "무조건", "최고", "유일", "특가", "수익률", "급매", "역대급", "초역세권"];
const PHONE_RE = /0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/;

async function fetchImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`사진을 불러오지 못했습니다: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  let w = 1600, h = 900;
  try {
    const d = imageSize(buf);
    if (d.width && d.height) [w, h] = [d.width, d.height];
  } catch {}
  return { buf, mimeType, w, h };
}

export async function checkPhotos(urls: string[], context: string): Promise<ReelPhoto[]> {
  urls = urls.slice(0, 12);
  if (!urls.length) return [];
  const imgs = await Promise.all(urls.map(fetchImage));
  const verdicts = await geminiJson<{ index: number; keep: boolean; label: string; reason: string }[]>(
    [
      ...imgs.map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.buf.toString("base64") } })),
      {
        text:
          `위 ${urls.length}장은 부동산 매물(${context}) 사진입니다 (0번부터 순서대로). 릴스 영상에 쓸 수 있는지 판단하세요. ` +
          `제외: 앱·웹사이트·지도·로드뷰 화면 캡처, 다른 서비스 워터마크·로고, 글자가 대부분인 이미지(전단지·표), 평면도, 다른 매물 정보가 보이는 이미지, ` +
          `심하게 흐리거나 어두운 사진, 사람 얼굴이 크게 나온 사진. 사용 가능: 이 매물의 실내·외관·건물·주변 실제 사진.\n` +
          `JSON 배열로만 답하세요: [{"index":0,"keep":true,"label":"거실|방|주방|욕실|현관|외관|건물|기타","reason":"제외 이유 (사용 가능하면 빈 문자열)"}]`,
      },
    ],
    `[릴스 사진검사] ${context}`,
  );
  return urls.map((url, i) => {
    const v = verdicts.find((x) => x.index === i);
    return { url, keep: v?.keep ?? false, label: v?.label || "기타", reason: v?.keep ? "" : v?.reason || "판단 실패", w: imgs[i].w, h: imgs[i].h };
  });
}

const unitsToTts = (units: SpeechUnit[]) => units.map((u) => u.s).join(" ");

/** 가격 장면: 성우 "보증금 천만 원에 월세 오십만 원! 수서역 세 개 노선도 가까워요." / 자막은 숫자로 */
export function priceScene(f: ReelFacts, photo: string | null): ReelScene {
  const u: SpeechUnit[] = [];
  const money = (won: number, tail: string) => {
    u.push({ s: readNumber(won / 10000) + "만", d: displayManwon(won) }, { s: tail, d: tail });
  };
  if (f.trade === "월세") {
    u.push({ s: "보증금", d: "보증금" });
    money(f.deposit, "원에");
    u.push({ s: "월세", d: "월세" });
    money(f.monthlyRent, f.transit.length ? "원!" : f.maintenanceFee > 0 ? "원," : "원이에요!");
  } else {
    u.push({ s: f.trade || "가격", d: f.trade || "가격" });
    money(f.deposit, f.transit.length ? "원!" : f.maintenanceFee > 0 ? "원," : "원이에요!");
  }
  if (!f.transit.length && f.maintenanceFee > 0) {
    u.push({ s: "관리비는", d: "관리비는" });
    money(f.maintenanceFee, "원이에요.");
  }
  if (f.transit.length) {
    const station = f.transit[0].split(" ")[0];
    const n = f.transit.length;
    if (n > 1) u.push({ s: station, d: station }, { s: `${["", "한", "두", "세"][n]} 개 노선도`, d: `${n}개 노선도` });
    else u.push({ s: `${station}도`, d: `${station}도` });
    u.push({ s: "가까워요.", d: "가까워요" });
  }
  const highlight = u.map((x, i) => (/\d/.test(x.d) || x.d === f.transit[0]?.split(" ")[0] ? i : -1)).filter((i) => i >= 0);
  return { id: "", kind: "price", photo, tts: unitsToTts(u), units: u, highlight, sticker: null, locked: true };
}

export function ctaScene(f: ReelFacts, photo: string | null): ReelScene {
  const u: SpeechUnit[] = [
    { s: "공실뉴스에서", d: "공실뉴스에서" },
    { s: "매물번호", d: "매물번호" },
    // "팔육삼공이를" 은 "86301을" 로 들린 적이 있어 수로 읽는다
    { s: `${readNumber(f.vacancyNo)} 번!`, d: `${f.vacancyNo}번!` },
  ];
  return { id: "", kind: "cta", photo, tts: unitsToTts(u), units: u, highlight: [2], sticker: null, locked: true };
}

interface AiLine {
  tts: string;
  sticker: string;
  highlight: string[];
}

export async function buildDraft(listing: ReelListing): Promise<{ script: ReelScript; warnings: string[] }> {
  const f = listing.facts;
  const photos = await checkPhotos(listing.photoUrls, `${f.area} ${f.type}`);
  const kept = photos.filter((p) => p.keep);
  if (!kept.length) throw new Error("릴스에 쓸 수 있는 사진이 없습니다. 실내·외관 사진을 등록해 주세요.");
  const photoScenes = kept.slice(0, MAX_PHOTO_SCENES);

  const facts = {
    지역: f.area, 종류: f.type, 거래: f.trade, 전용면적_평: f.exclusivePy, 층: f.floor, 구조: f.rooms, 향: f.direction,
    옵션: f.options, 주차: f.parking, 입주: f.moveIn, 등록설명_참고: f.description,
  };
  const ai = await geminiJson<{ scenes: AiLine[] }>(
    [
      {
        text: `부동산 중개사가 자기 SNS에 올릴 매물 릴스(세로 영상)의 장면별 성우 대사를 써 주세요.
말투: 중개사 본인이 매물을 직접 보러 온 듯한 밝은 감탄형 존댓말 ("~나왔어요!", "~깔끔하죠?", "~들어와요").

매물 정보(이것만 사실로 사용):
${JSON.stringify(facts, null, 1)}

장면 ${photoScenes.length}개, 순서대로 사진: ${photoScenes.map((p, i) => `${i + 1}) ${p.label}`).join(", ")}
- 첫 장면: 지역과 매물 종류로 시선을 끈다 (예: "강남구 수서동에 원룸 오피스텔이 나왔어요!")
- 나머지: 그 사진에 실제로 보이는 공간의 장점 한 가지씩

규칙:
1. 대사에 숫자(아라비아·한글 숫자 모두)를 쓰지 마세요. 가격·면적·매물번호는 다른 장면에서 따로 말합니다.
2. 사진에 없는 옵션·시설을 그 장면에 붙이지 마세요. 등록 정보에 없는 사실(역세권, 신축, 풀옵션, 최저가, 학군 등)을 지어내지 마세요.
3. 건물 이름, 호수, 전화번호, 사람 이름은 쓰지 마세요.
4. 대사는 장면당 한 문장, 25자 안팎. sticker 는 6자 이내 감탄 문구 (예: "임장 GO!", "채광 굿", "주방 체크"). highlight 는 대사에서 노란색으로 강조할 핵심 단어 1~2개(대사에 있는 그대로의 어절).

JSON 으로만 답하세요: {"scenes":[{"tts":"","sticker":"","highlight":[""]}]}`,
      },
    ],
    `[릴스 대본] 매물 ${f.vacancyNo}`,
  );

  const scenes: ReelScene[] = photoScenes.map((p, i) => {
    const line = ai.scenes?.[i] || { tts: "", sticker: "", highlight: [] };
    const words = line.tts.split(/\s+/);
    return {
      id: "",
      kind: i === 0 ? "hook" : "photo",
      photo: p.url,
      tts: line.tts,
      highlight: words.map((w, k) => ((line.highlight || []).some((h) => h && w.includes(h)) ? k : -1)).filter((k) => k >= 0),
      sticker: line.sticker || null,
    };
  });
  scenes.push(priceScene(f, (kept[1] || kept[0]).url));
  scenes.push(ctaScene(f, kept[0].url));
  scenes.forEach((s, i) => (s.id = `s${i + 1}`));

  const script: ReelScript = { facts: f, agency: listing.agency, photos, scenes };
  return { script, warnings: reviewScript(script) };
}

/** 회원이 쓴 대본을 클립으로 나눈다: 줄마다 하나, 한 덩어리면 문장마다 하나 */
export function splitScript(text: string): string[] {
  const clean = text.replace(PHONE_RE, "").replace(/\r/g, "");
  let lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) lines = (clean.match(/[^.!?~。]+[.!?~。]*/g) || []).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => l.slice(0, 80)).slice(0, 10);
}

/**
 * 직접 입력한 대본으로 초안을 만든다. 사진 검사는 똑같이 하고, 사진은 등록 순서대로 클립에 붙인다.
 * withAuto 이면 가격·마무리(매물번호) 클립을 끝에 붙인다. 표시·광고 화면은 항상 들어간다.
 */
export async function buildFromScript(listing: ReelListing, text: string, withAuto: boolean): Promise<{ script: ReelScript; warnings: string[] }> {
  const f = listing.facts;
  const lines = splitScript(text);
  if (!lines.length) throw new Error("대본이 비어 있습니다.");
  const photos = await checkPhotos(listing.photoUrls, `${f.area} ${f.type}`);
  const kept = photos.filter((p) => p.keep);
  if (!kept.length) throw new Error("릴스에 쓸 수 있는 사진이 없습니다. 실내·외관 사진을 등록해 주세요.");

  const scenes: ReelScene[] = lines.map((tts, i) => ({
    id: "",
    kind: i === 0 ? "hook" : "photo",
    photo: kept[i % kept.length].url,
    tts,
    // 숫자가 들어간 어절은 기본으로 노란 강조
    highlight: tts.split(/\s+/).map((w, k) => (/\d/.test(w) ? k : -1)).filter((k) => k >= 0).slice(0, 2),
    sticker: null,
  }));
  if (withAuto) {
    scenes.push(priceScene(f, (kept[1] || kept[0]).url));
    scenes.push(ctaScene(f, kept[0].url));
  }
  scenes.forEach((s, i) => (s.id = `s${i + 1}`));
  const script: ReelScript = { facts: f, agency: listing.agency, photos, scenes };
  return { script, warnings: reviewScript(script) };
}

/**
 * 렌더 직전 서버에서 대본을 다시 확정한다. 화면에서 온 값은 대사·강조·스티커·사진 선택·순서만 받는다.
 * - 매물 사실은 DB 에서 새로 읽은 것, 사진은 저장된 검사 결과(서버가 만든 것)로만 허용
 * - 가격·마무리 장면은 DB 숫자로 다시 만든다
 */
export function rebuildForRender(listing: ReelListing, saved: ReelScript, edited: ReelScene[]): { script: ReelScript; warnings: string[] } {
  const f = listing.facts;
  const allowed = saved.photos.filter((p) => p.keep).map((p) => p.url);
  if (!allowed.length) throw new Error("릴스에 쓸 수 있는 사진이 없습니다.");
  const pick = (url: string | null, fallback: string) => (url && allowed.includes(url) ? url : fallback);

  const scenes: ReelScene[] = edited.slice(0, 10).map((s, i) => {
    if (s.kind === "price" || s.kind === "cta") {
      const base = s.kind === "price" ? priceScene(f, pick(s.photo, allowed[1] || allowed[0])) : ctaScene(f, pick(s.photo, allowed[0]));
      const own = s.custom && String(s.tts || "").trim();
      return {
        ...base,
        fx: cleanFx(s.fx),
        caption: s.caption ? String(s.caption).slice(0, 80) : null,
        highlight: own ? (s.highlight || []).filter(Number.isInteger).slice(0, 6) : base.highlight,
        ...(own ? { custom: true, units: undefined, tts: String(s.tts).replace(PHONE_RE, "").slice(0, 80) } : {}),
      };
    }
    const tts = String(s.tts || "").replace(PHONE_RE, "").replace(/\s+/g, " ").trim().slice(0, 80);
    const n = tts.split(" ").length;
    return {
      id: "",
      kind: i === 0 ? "hook" : "photo",
      photo: pick(s.photo, allowed[i % allowed.length]),
      tts,
      highlight: (s.highlight || []).filter((k) => Number.isInteger(k) && k >= 0 && k < n).slice(0, 4),
      sticker: s.sticker ? String(s.sticker).trim().slice(0, 10) : null,
      caption: s.caption ? String(s.caption).replace(PHONE_RE, "").slice(0, 80) : null,
      fx: cleanFx(s.fx),
      video: cleanVideo(s.video), // 매물 소유·준비 여부는 렌더 때 reel_media 로 다시 확인
    };
  });
  scenes.forEach((s, i) => (s.id = `s${i + 1}`));
  const empty = scenes.find((s) => !s.tts);
  if (empty) throw new Error(`${empty.id} 클립의 대사가 비어 있습니다.`);
  const script: ReelScript = { facts: f, agency: listing.agency, photos: saved.photos, scenes, settings: cleanSettings(saved.settings) };
  return { script, warnings: reviewScript(script) };
}

// 등록 정보에 있는 숫자 (만 원 단위 금액, 매물번호, 역 노선 수, 평수·층)
function factNumbers(f: ReelFacts): Set<number> {
  const n = [f.deposit, f.monthlyRent, f.maintenanceFee].flatMap((w) => [w, w / 10000]);
  n.push(f.vacancyNo, f.transit.length, f.exclusivePy || 0, f.exclusiveM2 || 0);
  (f.floor || "").match(/\d+/g)?.forEach((x) => n.push(Number(x)));
  return new Set(n.filter((x) => x > 0));
}

export function reviewScript(script: ReelScript): string[] {
  const warnings: string[] = [];
  const known = factNumbers(script.facts);
  script.scenes.forEach((s, i) => {
    // 숫자 대조: 직접 고친 가격·마무리 클립과 따로 쓴 자막
    for (const text of [s.custom ? s.tts : "", s.caption || ""]) {
      for (const m of text.match(/\d[\d,]*(\.\d+)?/g) || []) {
        const v = Number(m.replace(/,/g, ""));
        if (!known.has(v)) warnings.push(`${i + 1}번 클립: "${m}" 은(는) 등록 정보에 없는 숫자입니다. 가격·번호가 맞는지 확인하세요.`);
      }
    }
    if (s.locked) return;
    const text = `${s.tts} ${s.sticker || ""}`;
    for (const w of RISKY_WORDS) if (text.includes(w)) warnings.push(`${i + 1}번 클립: "${w}" 은(는) 허위·과장 광고로 보일 수 있습니다.`);
    if (s.tts.length > 40) warnings.push(`${i + 1}번 클립: 대사가 깁니다 (${s.tts.length}자). 25자 안팎을 권합니다.`);
  });
  return warnings;
}
