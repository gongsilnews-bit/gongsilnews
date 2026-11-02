// 배경음악 목록 (화면·서버 공용). id 규칙:
//   "none" 음악 없음 · "upbeat"/"calm" 기본 2곡 · "lib-<이름>" 무료 음악(CC0) · "my-<uuid>" 회원이 올린 음악
// 무료 음악은 Freesound 의 CC0(퍼블릭 도메인) 곡만 쓴다: 상업 사용 가능, 출처 표기 의무 없음 (CREDITS.md 에 기록)
export interface LibraryTrack {
  id: string;        // lib-<slug>
  label: string;     // 화면 이름
  mood: string;      // 분위기 묶음
  duration: number;  // 초
  thumb?: string;    // 표지 그림 (/reels-assets/bgm/thumbs/…)
  bpm?: number;      // 빠르기 (분석 어림값)
  old?: boolean;     // 예전 무료 곡 — 목록에서 숨긴다 (예전 영상이 쓰던 곡은 그대로 재생되게 남겨 둠)
}

export const MUSIC_MOODS = ["행복", "경쾌한", "힙한", "잔잔한", "고급스러운"] as const;

// 기본 2곡 (스타일 기본값). 회원 공개 전 상업 사용 허가 확인 필요 — 확인 안 되면 무료 음악으로 바꾼다
export const BASIC_MUSIC = [
  { id: "upbeat", label: "경쾌한 음악 (기본)", mood: "경쾌한" },
  { id: "calm", label: "잔잔한 음악 (기본)", mood: "잔잔한" },
] as const;

// 리얼티뮤직 (공실뉴스 유튜브 @리얼티뮤직_RealtyMusic) — 사장님이 Suno 유료 요금제로 만든 우리 곡 (2026-11-02).
//  표지는 곡 파일 안에 든 그림. 분류는 곡을 분석해 비트(템포·박자 세기)와 분위기(밝기·세기·저음)로 나눴다 (2026-11-02 사장님)
//   행복: 밝은 소리 · 또렷한 박자 / 경쾌한: 세고 빠른 박자 / 힙한: 묵직한 저음 + 강한 비트 / 잔잔한: 약한 박자 · 부드러움 / 고급스러운: 피아노·재즈·시네마틱
//   분류 안에서는 빠른 곡부터. bpm 은 분석값 (어림)
const RM = (n: string, label: string, mood: string, duration: number, bpm: number): LibraryTrack =>
  ({ id: `lib-rm-${n}`, label, mood, duration, bpm, thumb: `/reels-assets/bgm/thumbs/rm-${n}.jpg` });
const REALTY_MUSIC: LibraryTrack[] = [
  RM("022", "Happiness Apart Piano", "행복", 173, 129), RM("007", "Dream City Love", "행복", 186, 112), RM("012", "Shiny Room", "행복", 196, 108), RM("003", "City Life", "행복", 172, 103), RM("025", "New Apart Life", "행복", 191, 99),
  RM("016", "Woke Up to the City Lights", "경쾌한", 158, 136), RM("018", "A Modern and Upbeat", "경쾌한", 177, 123), RM("029", "Rising Through the Morning Light", "경쾌한", 129, 103), RM("027", "Drone Lover", "경쾌한", 199, 99), RM("015", "Sunny Room", "경쾌한", 168, 83),
  RM("013", "Sky Line", "힙한", 209, 129), RM("014", "Sky Love", "힙한", 257, 129), RM("031", "Driving City", "힙한", 203, 117),
  RM("002", "Apart Morning", "잔잔한", 401, 161), RM("006", "Country Piano Man", "잔잔한", 191, 129), RM("001", "고요한 햇살 속으로", "잔잔한", 103, 103), RM("005", "Country Life", "잔잔한", 246, 96), RM("011", "River View", "잔잔한", 171, 92), RM("017", "A Bright Acoustic Guitar", "잔잔한", 184, 83), RM("020", "Cozy Calm", "잔잔한", 182, 81),
  RM("019", "Modern HighEnd House", "고급스러운", 179, 123), RM("026", "Drone Love", "고급스러운", 143, 123), RM("028", "Cinematic Drone", "고급스러운", 430, 117), RM("023", "HighEnd Piano", "고급스러운", 170, 108), RM("024", "Grand Piano in Apart", "고급스러운", 204, 96), RM("009", "Jazz City", "고급스러운", 177, 92), RM("010", "Jazz City Life", "고급스러운", 169, 89), RM("004", "City River Life", "고급스러운", 167, 81),
];

export const MUSIC_LIBRARY: LibraryTrack[] = [
  ...REALTY_MUSIC,
  // ↓ 예전 무료 곡 (Freesound CC0) — 목록에서는 숨김 (2026-11-02 사장님: 촌스러움). 예전 영상 재생용으로만 남김
  { id: "lib-good-vibe", label: "굿 바이브", mood: "경쾌한", duration: 150, old: true },
  { id: "lib-upbeat-guitar", label: "기타 & 오케스트라", mood: "경쾌한", duration: 141, old: true },
  { id: "lib-film-guitar", label: "산뜻한 어쿠스틱 기타", mood: "경쾌한", duration: 136, old: true },
  { id: "lib-upbeat-piano", label: "통통 튀는 피아노", mood: "경쾌한", duration: 104, old: true },
  { id: "lib-happy-guitar", label: "해피 기타", mood: "경쾌한", duration: 92, old: true },
  { id: "lib-laid-back", label: "느긋한 일렉트로닉", mood: "잔잔한", duration: 64, old: true },
  { id: "lib-lofi-fusion", label: "로파이 퓨전", mood: "잔잔한", duration: 134, old: true },
  { id: "lib-lofi-beach", label: "로파이 비치", mood: "잔잔한", duration: 95, old: true },
  { id: "lib-chill-vibe", label: "칠 바이브", mood: "잔잔한", duration: 149, old: true },
  { id: "lib-cool-guitar", label: "여유로운 기타", mood: "잔잔한", duration: 165, old: true },
  { id: "lib-cute-happy", label: "귀여운 해피송", mood: "귀여운", duration: 180, old: true },
  { id: "lib-fun-cute", label: "깜찍한 멜로디", mood: "귀여운", duration: 61, old: true },
  { id: "lib-funk-beat", label: "펑키 비트", mood: "힙한", duration: 151, old: true },
  { id: "lib-disco-funk", label: "디스코 펑크", mood: "힙한", duration: 128, old: true },
  { id: "lib-electro-beat", label: "일렉트로 비트", mood: "힙한", duration: 59, old: true },
  { id: "lib-retro-synth", label: "레트로 신스팝", mood: "힙한", duration: 78, old: true },
  { id: "lib-hiphop-chill", label: "칠 힙합", mood: "힙한", duration: 133, old: true },
  { id: "lib-corporate", label: "회사 소개 영상풍", mood: "고급스러운", duration: 59, old: true },
  { id: "lib-reveal", label: "잔잔한 시네마틱", mood: "고급스러운", duration: 59, old: true },
  { id: "lib-evening-sunset", label: "저녁 노을", mood: "고급스러운", duration: 60, old: true },
];

/** 고를 수 있는 곡 — 예전 무료 곡(old)은 뺀다 (2026-11-02 사장님: 재미없는 음악은 없애기) */
export const MUSIC_PICKABLE: LibraryTrack[] = MUSIC_LIBRARY.filter((t) => !t.old);

export const isLibraryMusic = (id: string) => MUSIC_LIBRARY.some((t) => t.id === id);
export const isBasicMusic = (id: string) => BASIC_MUSIC.some((t) => t.id === id);
export const isMyMusic = (id: string) => /^my-[0-9a-f-]{36}$/.test(id);

/** 미리보기·렌더에서 쓸 파일 경로 (assetBase 기준). 내 음악은 서명 주소를 따로 쓴다 */
export function musicAsset(id: string): string | null {
  if (isBasicMusic(id)) return `bgm/${id}.mp3`;
  if (isLibraryMusic(id)) return `bgm/lib/${id.slice(4)}.mp3`;
  return null;
}

export function musicLabel(id: string, mine: { id: string; title: string }[] = []): string {
  if (id === "none") return "음악 없음";
  return BASIC_MUSIC.find((t) => t.id === id)?.label || MUSIC_LIBRARY.find((t) => t.id === id)?.label || mine.find((t) => t.id === id)?.title || "음악";
}
