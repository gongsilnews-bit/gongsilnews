// 공실 릴스 공통 자료형. 대본(ReelScript)이 초안 → 회원 편집(미리보기) → 렌더까지 그대로 흐른다.
import { speakDigits } from "./korean-number";

export type SceneKind = "hook" | "photo" | "price" | "cta";

/** 성우가 읽는 말(s)과 화면 자막(d)의 짝. 예: { s: "천만", d: "1,000만" } */
export interface SpeechUnit {
  s: string;
  d: string;
}

/** 클립별 효과. 모든 값의 기본은 "auto" — 손대지 않으면 템플릿이 알아서 정한다 */
export interface SceneFx {
  camera?: "auto" | "pan-lr" | "pan-rl" | "zoom-in" | "zoom-out" | "still";
  transition?: "auto" | "whip-left" | "whip-right" | "flash" | "punch" | "fade" | "cut"; // 이 클립으로 들어올 때
  stickerOn?: boolean;                                   // 기본 true (문구가 있을 때)
  stickerStyle?: "auto" | "slam" | "pill" | "stamp" | "burst" | "hand";
  stickerPos?: "top" | "middle" | "bottom";
  stickerSide?: "left" | "center" | "right";
  stickerAt?: "start" | "middle" | "end";
  stickerAnim?: "auto" | "slam" | "pop" | "spin" | "drop" | "slide" | "fade";   // 스티커 등장 방식
  stickerSound?: "auto" | "impact" | "pop" | "sparkle" | "click" | "none";      // 스티커 효과음
  transitionSound?: "auto" | "whoosh" | "sparkle" | "none";                    // 전환 효과음
  captionOn?: boolean;                                   // 기본 true
  captionPos?: "top" | "middle" | "bottom";
  captionSize?: "s" | "m" | "l";
  captionColor?: "yellow" | "orange" | "blue";
  sfxOn?: boolean;                                       // 기본 true
  hold?: number;                                         // 대사 뒤 여유 (0 · 0.5 · 1초)
  // 미리보기 화면에서 직접 끌어 놓은 위치·크기 (영상 좌표 1080×1920 px). 있으면 위의 위·가운데·아래 보다 우선
  stickerXY?: [number, number];                          // 스티커 가운데 점
  stickerScale?: number;                                 // 0.4 ~ 3
  captionY?: number;                                     // 자막 상자 윗변
  captionScale?: number;                                 // 0.6 ~ 1.8
}

/** 인스타·틱톡 화면에서 버튼·설명 글에 가려지는 구역 (1080×1920 기준) — 끌어 놓을 때 경고만 한다 */
export const SAFE_COVER = [
  { x: 0, y: 0, w: 1080, h: 200 },      // 위: 상단 메뉴
  { x: 0, y: 1560, w: 1080, h: 360 },   // 아래: 계정·설명 글
  { x: 930, y: 960, w: 150, h: 600 },   // 오른쪽: 좋아요·댓글·공유
] as const;

/** 영상 전체 설정 */
export interface ReelSettings {
  sfx?: boolean;                        // 효과음 전체 (기본 true)
  musicLevel?: "low" | "mid" | "high";  // 배경음악 크기 (기본 mid)
  badge?: boolean;                      // 왼쪽 위 공실뉴스 배지 (기본 true)
  style?: ReelStyle;                    // 영상 분위기 (기본 lively) — 효과의 "자동" 값이 이것을 따른다
  musicStart?: number;                  // 배경음악을 몇 초부터 쓸지 (기본 0)
  disclosure?: boolean;                 // 표시·광고 정보 띠 (기본 true, 공인중개사법 명시사항)
}

export type ReelStyle = "lively" | "calm" | "clean";
/** 스타일: 고르면 전환·스티커·효과음의 "자동" 기본값과 어울리는 배경음악이 함께 바뀐다 */
export const REEL_STYLES = [
  { id: "lively", icon: "🔥", label: "신나게", desc: "휙휙 넘어가는 화면 전환, 큼직한 스티커와 효과음으로 첫 1초부터 눈길을 끕니다.", fit: "원룸·오피스텔·투룸, 20~30대 손님", music: "upbeat" },
  { id: "calm", icon: "🌿", label: "차분하게", desc: "부드럽게 겹쳐지는 전환, 천천히 움직이는 사진, 작은 스티커로 고급스럽고 편안하게 보여 줍니다.", fit: "아파트·신축·고급 매물", music: "calm" },
  { id: "clean", icon: "📋", label: "깔끔하게", desc: "바로 넘어가는 컷 전환에 스티커·효과음 없이 자막과 가격 정보 위주로 또렷하게 전합니다.", fit: "사무실·상가·지식산업센터", music: "calm" },
] as const;

export const FX_OPTIONS = {
  camera: [["auto", "자동"], ["pan-lr", "왼→오 훑기"], ["pan-rl", "오→왼 훑기"], ["zoom-in", "확대"], ["zoom-out", "축소"], ["still", "움직임 없음"]],
  transition: [["auto", "자동"], ["whip-left", "휙 넘기기 ←"], ["whip-right", "휙 넘기기 →"], ["flash", "번쩍"], ["punch", "확 당기기"], ["fade", "부드럽게"], ["cut", "그냥 컷"]],
  stickerStyle: [["auto", "자동"], ["slam", "쾅 큰글씨"], ["pill", "알약"], ["stamp", "도장"], ["burst", "별 모양"], ["hand", "손글씨"]],
  stickerPos: [["top", "위"], ["middle", "가운데"], ["bottom", "아래"]],
  stickerSide: [["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]],
  stickerAt: [["start", "대사 시작"], ["middle", "중간"], ["end", "끝"]],
  stickerAnim: [["auto", "자동"], ["slam", "쾅 떨어지기"], ["pop", "톡 튀어나오기"], ["spin", "빙글 돌며"], ["drop", "위에서 떨어지기"], ["slide", "옆에서 미끄러지기"], ["fade", "서서히"]],
  stickerSound: [["auto", "자동"], ["impact", "쾅"], ["pop", "뽁"], ["sparkle", "반짝"], ["click", "딸깍"], ["none", "없음"]],
  transitionSound: [["auto", "자동"], ["whoosh", "휙"], ["sparkle", "반짝"], ["none", "없음"]],
  captionPos: [["top", "위"], ["middle", "가운데"], ["bottom", "아래"]],
  captionSize: [["s", "작게"], ["m", "보통"], ["l", "크게"]],
  captionColor: [["yellow", "노랑"], ["orange", "주황"], ["blue", "파랑"]],
  hold: [[0, "0초"], [0.5, "0.5초"], [1, "1초"]],
} as const;

/** 클립에 사진 대신 쓰는 영상 (reel_media 의 변환본). 구간·속도·소리 */
export interface SceneVideo {
  media: string;                        // reel_media.id
  from: number;                         // 원본에서 쓸 구간 시작(초)
  to: number;                           // 끝(초)
  speed?: "auto" | number;              // auto: 구간이 대사 길이에 딱 맞게. 숫자: 0.5 · 1 · 1.5 · 2 · 4 · 8
  sound?: "off" | "low" | "on";         // 원래 소리 (기본 off, 2배 넘게 빠르면 항상 off)
  fit?: "cover" | "contain";            // 가로 영상: 꽉 채우기(가운데 잘림) / 전체 보이기(흐린 배경)
}

export const VIDEO_SPEEDS = [["auto", "자동 맞춤"], [0.5, "0.5배"], [1, "1배"], [1.5, "1.5배"], [2, "2배"], [4, "4배"], [8, "8배"]] as const;
export const VIDEO_LIMIT = { maxSeconds: 180, warnSeconds: 60, maxBytes: 1.5 * 1024 ** 3 } as const;

export interface ReelScene {
  id: string;             // s1, s2 ... (화면 구성용, 순서 바뀌면 다시 매김)
  kind: SceneKind;
  photo: string | null;   // 쓰는 사진 URL
  tts: string;            // 성우 대사 (숫자는 한글로)
  units?: SpeechUnit[];   // 코드가 만든 장면(가격·마무리)의 말·자막 짝. 없으면 tts 를 띄어쓰기로 나눈 것이 자막
  highlight: number[];    // 노란 강조할 단어 번호
  sticker: string | null;
  locked?: boolean;       // 가격·마무리: 내용은 DB 숫자로 코드가 만든다 (custom 이면 회원 문장)
  custom?: boolean;       // 가격·마무리 클립을 회원이 직접 고친 경우 (숫자는 등록 정보와 대조해 경고)
  caption?: string | null; // 자막을 대사와 다르게 쓸 때 (없으면 대사가 자막)
  fx?: SceneFx;           // 클립별 효과 (없으면 전부 자동)
  video?: SceneVideo | null; // 있으면 사진 대신 영상 (photo 는 영상이 없을 때 대신 쓰는 사진)
}

/** 화면에서 온 영상 설정을 믿을 수 있는 값으로 */
export function cleanVideo(v: unknown): SceneVideo | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.media !== "string" || !/^[0-9a-f-]{36}$/.test(o.media)) return null;
  const n = (x: unknown) => (typeof x === "number" && isFinite(x) ? Math.max(0, Math.min(VIDEO_LIMIT.maxSeconds, Math.round(x * 100) / 100)) : 0);
  const from = n(o.from);
  const to = Math.max(from + 0.3, n(o.to));
  const speeds = VIDEO_SPEEDS.map((x) => x[0]) as readonly unknown[];
  return {
    media: o.media,
    from,
    to,
    speed: speeds.includes(o.speed) ? (o.speed as SceneVideo["speed"]) : "auto",
    sound: o.sound === "low" || o.sound === "on" ? o.sound : "off",
    fit: o.fit === "contain" ? "contain" : "cover",
  };
}

/** 영상에 표시해도 되는 매물 사실만 모은 것. 개인정보·호수·상세주소는 여기 들어오지 않는다. */
export interface ReelFacts {
  vacancyNo: number;
  area: string;          // "강남구 수서동" (동까지만)
  type: string;
  trade: string;         // "월세" | "전세" | "매매"
  deposit: number;       // 원
  monthlyRent: number;
  maintenanceFee: number;
  exclusiveM2: number | null;
  exclusivePy: number | null;
  floor: string | null;
  rooms: string | null;
  direction: string | null;
  parking: string | null;
  moveIn: string | null;
  options: string[];
  transit: string[];     // 지하철역 (최대 3)
  description: string;   // 등록 설명 (전화번호 제거본) — AI 참고용
}

export interface ReelAgency {
  name: string;
  ceo: string | null;
  regNum: string | null;
  address: string | null;
  phone: string | null;
}

export interface ReelPhoto {
  url: string;
  keep: boolean;
  label: string;         // 거실 / 방 / 주방 / 욕실 / 외관 / 기타
  reason: string;        // 제외 이유
  w: number;
  h: number;
}

export interface ReelScript {
  facts: ReelFacts;
  agency: ReelAgency | null;
  photos: ReelPhoto[];
  scenes: ReelScene[];
  settings?: ReelSettings;
  draft?: boolean;        // AI 초안만 나온 상태 (초안 화면에서 [이대로 클립 만들기] 전)
}

const clamp = (n: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, n)) * 100) / 100;
const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && isFinite(v) ? clamp(v, lo, hi) : undefined);

/** 저장·렌더 전에 효과 값을 허용된 것만 남긴다 (화면에서 온 값은 그대로 믿지 않음) */
export function cleanFx(fx: unknown): SceneFx | undefined {
  if (!fx || typeof fx !== "object") return undefined;
  const f = fx as Record<string, unknown>;
  const pick = <K extends keyof typeof FX_OPTIONS>(k: K) => {
    const allowed = FX_OPTIONS[k].map((o) => o[0]) as readonly unknown[];
    return allowed.includes(f[k]) ? f[k] : undefined;
  };
  const bool = (k: string) => (typeof f[k] === "boolean" ? (f[k] as boolean) : undefined);
  const out: SceneFx = {
    camera: pick("camera") as SceneFx["camera"],
    transition: pick("transition") as SceneFx["transition"],
    stickerOn: bool("stickerOn"),
    stickerStyle: pick("stickerStyle") as SceneFx["stickerStyle"],
    stickerPos: pick("stickerPos") as SceneFx["stickerPos"],
    stickerSide: pick("stickerSide") as SceneFx["stickerSide"],
    stickerAt: pick("stickerAt") as SceneFx["stickerAt"],
    stickerAnim: pick("stickerAnim") as SceneFx["stickerAnim"],
    stickerSound: pick("stickerSound") as SceneFx["stickerSound"],
    transitionSound: pick("transitionSound") as SceneFx["transitionSound"],
    captionOn: bool("captionOn"),
    captionPos: pick("captionPos") as SceneFx["captionPos"],
    captionSize: pick("captionSize") as SceneFx["captionSize"],
    captionColor: pick("captionColor") as SceneFx["captionColor"],
    sfxOn: bool("sfxOn"),
    hold: pick("hold") as number | undefined,
    stickerXY: Array.isArray(f.stickerXY) && f.stickerXY.length === 2 && f.stickerXY.every((n) => typeof n === "number" && isFinite(n))
      ? [clamp(f.stickerXY[0] as number, 0, 1080), clamp(f.stickerXY[1] as number, 0, 1920)]
      : undefined,
    stickerScale: num(f.stickerScale, 0.4, 3),
    captionY: num(f.captionY, 0, 1800),
    captionScale: num(f.captionScale, 0.6, 1.8),
  };
  Object.keys(out).forEach((k) => out[k as keyof SceneFx] === undefined && delete out[k as keyof SceneFx]);
  return Object.keys(out).length ? out : undefined;
}

export function cleanSettings(v: unknown): ReelSettings {
  const s = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    sfx: typeof s.sfx === "boolean" ? s.sfx : true,
    musicLevel: s.musicLevel === "low" || s.musicLevel === "high" ? s.musicLevel : "mid",
    badge: typeof s.badge === "boolean" ? s.badge : true,
    style: s.style === "calm" || s.style === "clean" ? s.style : "lively",
    disclosure: typeof s.disclosure === "boolean" ? s.disclosure : true,
    musicStart: typeof s.musicStart === "number" && isFinite(s.musicStart) ? Math.max(0, Math.min(600, Math.round(s.musicStart * 10) / 10)) : 0,
  };
}

/** 클립의 말·자막 짝. 코드가 만든 장면은 저장된 짝, 회원·AI 대사는 띄어쓰기로 나누고 숫자를 읽는 말로 바꾼다 */
export function sceneUnits(scene: ReelScene): SpeechUnit[] {
  if (scene.units?.length && !scene.custom) return scene.units;
  return scene.tts.trim().split(/\s+/).filter(Boolean).map((d) => ({ d, s: speakDigits(d) }));
}

/** 대사를 화면 자막 단어·성우 단어로 나눈다 (템플릿 입력용). 자막을 따로 쓰면 자막 글자 수로 타이밍을 나눈다 */
export function sceneWords(scene: ReelScene): { words: string[]; spoken: string[] } {
  if (scene.caption?.trim()) {
    const words = scene.caption.trim().split(/\s+/);
    return { words, spoken: words.map(speakDigits) };
  }
  const u = sceneUnits(scene);
  return { words: u.map((x) => x.d), spoken: u.map((x) => x.s) };
}

/** 성우에게 보낼 문장 (숫자는 한글로 읽는 말) */
export function spokenText(scene: ReelScene): string {
  return sceneUnits(scene).map((u) => u.s).join(" ");
}
