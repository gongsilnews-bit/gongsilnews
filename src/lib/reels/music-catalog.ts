// 배경음악 목록 (화면·서버 공용). id 규칙:
//   "none" 음악 없음 · "upbeat"/"calm" 기본 2곡 · "lib-<이름>" 무료 음악(CC0) · "my-<uuid>" 회원이 올린 음악
// 무료 음악은 Freesound 의 CC0(퍼블릭 도메인) 곡만 쓴다: 상업 사용 가능, 출처 표기 의무 없음 (CREDITS.md 에 기록)
export interface LibraryTrack {
  id: string;        // lib-<slug>
  label: string;     // 화면 이름
  mood: string;      // 분위기 묶음
  duration: number;  // 초
}

export const MUSIC_MOODS = ["경쾌한", "잔잔한", "귀여운", "힙한", "고급스러운"] as const;

// 기본 2곡 (스타일 기본값). 회원 공개 전 상업 사용 허가 확인 필요 — 확인 안 되면 무료 음악으로 바꾼다
export const BASIC_MUSIC = [
  { id: "upbeat", label: "경쾌한 음악 (기본)", mood: "경쾌한" },
  { id: "calm", label: "잔잔한 음악 (기본)", mood: "잔잔한" },
] as const;

export const MUSIC_LIBRARY: LibraryTrack[] = [
  { id: "lib-good-vibe", label: "굿 바이브", mood: "경쾌한", duration: 150 },
  { id: "lib-upbeat-guitar", label: "기타 & 오케스트라", mood: "경쾌한", duration: 141 },
  { id: "lib-film-guitar", label: "산뜻한 어쿠스틱 기타", mood: "경쾌한", duration: 136 },
  { id: "lib-upbeat-piano", label: "통통 튀는 피아노", mood: "경쾌한", duration: 104 },
  { id: "lib-happy-guitar", label: "해피 기타", mood: "경쾌한", duration: 92 },
  { id: "lib-laid-back", label: "느긋한 일렉트로닉", mood: "잔잔한", duration: 64 },
  { id: "lib-lofi-fusion", label: "로파이 퓨전", mood: "잔잔한", duration: 134 },
  { id: "lib-lofi-beach", label: "로파이 비치", mood: "잔잔한", duration: 95 },
  { id: "lib-chill-vibe", label: "칠 바이브", mood: "잔잔한", duration: 149 },
  { id: "lib-cool-guitar", label: "여유로운 기타", mood: "잔잔한", duration: 165 },
  { id: "lib-cute-happy", label: "귀여운 해피송", mood: "귀여운", duration: 180 },
  { id: "lib-fun-cute", label: "깜찍한 멜로디", mood: "귀여운", duration: 61 },
  { id: "lib-funk-beat", label: "펑키 비트", mood: "힙한", duration: 151 },
  { id: "lib-disco-funk", label: "디스코 펑크", mood: "힙한", duration: 128 },
  { id: "lib-electro-beat", label: "일렉트로 비트", mood: "힙한", duration: 59 },
  { id: "lib-retro-synth", label: "레트로 신스팝", mood: "힙한", duration: 78 },
  { id: "lib-hiphop-chill", label: "칠 힙합", mood: "힙한", duration: 133 },
  { id: "lib-corporate", label: "회사 소개 영상풍", mood: "고급스러운", duration: 59 },
  { id: "lib-reveal", label: "잔잔한 시네마틱", mood: "고급스러운", duration: 59 },
  { id: "lib-evening-sunset", label: "저녁 노을", mood: "고급스러운", duration: 60 },
];

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
