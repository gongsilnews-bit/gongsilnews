// 영상 편집기 AI 목소리 목록 — Gemini 성우 30명 (모두 한국어). 서버(검사)와 편집 화면(목록)이 같이 쓴다.
// 앞의 12명은 2026-10-06 릴스에서 한국어 녹음을 확인한 목소리 (추천).
// name = 화면에 보이는 성우 이름 (2026-10-17 사장님: 브루처럼 이름 + 얼굴 그림 + 특성), kind = 목소리 느낌.
// 얼굴 그림은 public/studio-voices/{id 소문자}.webp — 없으면 이름 첫 글자 동그라미.
export type StudioVoice = { id: string; name: string; kind: string; gender: "여성" | "남성"; age: string; mood: VoiceMood; tags: string[]; recommended?: boolean };

// 분위기 — 목소리 고르는 창의 거르기 (2026-10-17 사장님: 성별·나이·분위기로 분류)
export const VOICE_MOODS = ["신뢰감", "차분한", "따뜻한", "밝은", "힘있는"] as const;
export type VoiceMood = (typeof VOICE_MOODS)[number];

export const STUDIO_VOICES: StudioVoice[] = [
  { id: "Kore", name: "서연", kind: "단정한 여성", gender: "여성", age: "30대", mood: "신뢰감", tags: ["또박또박", "안내", "신뢰감"], recommended: true },
  { id: "Aoede", name: "하린", kind: "산뜻한 여성", gender: "여성", age: "20대", mood: "밝은", tags: ["밝은", "경쾌한", "광고"], recommended: true },
  { id: "Leda", name: "유나", kind: "발랄한 여성", gender: "여성", age: "20대", mood: "밝은", tags: ["젊은", "생기있는", "유튜브"], recommended: true },
  { id: "Zephyr", name: "지우", kind: "맑은 여성", gender: "여성", age: "20대", mood: "차분한", tags: ["또렷한", "선명한", "내레이션"], recommended: true },
  { id: "Sulafat", name: "은정", kind: "따뜻한 여성", gender: "여성", age: "40대", mood: "따뜻한", tags: ["포근한", "친절한", "상담"], recommended: true },
  { id: "Achernar", name: "수아", kind: "부드러운 여성", gender: "여성", age: "30대", mood: "차분한", tags: ["나긋한", "고급스러운", "브랜드"], recommended: true },
  { id: "Charon", name: "정훈", kind: "신뢰감 남성", gender: "남성", age: "40대", mood: "신뢰감", tags: ["아나운서", "안정적인", "뉴스"], recommended: true },
  { id: "Sadaltager", name: "민혁", kind: "전문가 남성", gender: "남성", age: "30대", mood: "신뢰감", tags: ["설명", "똑부러지는", "강의"], recommended: true },
  { id: "Puck", name: "준호", kind: "활기찬 남성", gender: "남성", age: "20대", mood: "힘있는", tags: ["힘찬", "밝은", "홍보"], recommended: true },
  { id: "Achird", name: "동현", kind: "친근한 남성", gender: "남성", age: "30대", mood: "따뜻한", tags: ["편안한", "다정한", "브이로그"], recommended: true },
  { id: "Algieba", name: "성민", kind: "차분한 남성", gender: "남성", age: "40대", mood: "차분한", tags: ["매끄러운", "차분한", "다큐"], recommended: true },
  { id: "Fenrir", name: "태양", kind: "신나는 남성", gender: "남성", age: "20대", mood: "힘있는", tags: ["들뜬", "에너지", "예능"], recommended: true },
  { id: "Callirrhoe", name: "미경", kind: "여유로운 여성", gender: "여성", age: "40대", mood: "따뜻한", tags: ["편안한", "느긋한"] },
  { id: "Autonoe", name: "다은", kind: "밝은 여성", gender: "여성", age: "20대", mood: "밝은", tags: ["밝은", "상큼한"] },
  { id: "Despina", name: "소희", kind: "매끄러운 여성", gender: "여성", age: "30대", mood: "차분한", tags: ["매끄러운", "세련된"] },
  { id: "Erinome", name: "예린", kind: "또렷한 여성", gender: "여성", age: "20대", mood: "신뢰감", tags: ["또렷한", "명랑한"] },
  { id: "Laomedeia", name: "채원", kind: "경쾌한 여성", gender: "여성", age: "20대", mood: "밝은", tags: ["경쾌한", "통통 튀는"] },
  { id: "Gacrux", name: "정숙", kind: "성숙한 여성", gender: "여성", age: "50대", mood: "차분한", tags: ["성숙한", "차분한", "품위있는"] },
  { id: "Pulcherrima", name: "혜진", kind: "힘있는 여성", gender: "여성", age: "30대", mood: "힘있는", tags: ["힘있는", "당당한"] },
  { id: "Vindemiatrix", name: "민지", kind: "상냥한 여성", gender: "여성", age: "20대", mood: "따뜻한", tags: ["상냥한", "친절한"] },
  { id: "Orus", name: "상철", kind: "단단한 남성", gender: "남성", age: "50대", mood: "힘있는", tags: ["단단한", "묵직한"] },
  { id: "Enceladus", name: "우진", kind: "속삭이는 남성", gender: "남성", age: "30대", mood: "차분한", tags: ["낮은", "속삭이는", "ASMR"] },
  { id: "Iapetus", name: "현우", kind: "또렷한 남성", gender: "남성", age: "30대", mood: "신뢰감", tags: ["또렷한", "깔끔한"] },
  { id: "Umbriel", name: "경수", kind: "여유로운 남성", gender: "남성", age: "50대", mood: "따뜻한", tags: ["편안한", "느긋한"] },
  { id: "Algenib", name: "대호", kind: "굵은 남성", gender: "남성", age: "40대", mood: "힘있는", tags: ["굵은", "남자다운"] },
  { id: "Rasalgethi", name: "영수", kind: "안내 남성", gender: "남성", age: "60대", mood: "신뢰감", tags: ["설명", "점잖은"] },
  { id: "Alnilam", name: "강민", kind: "단호한 남성", gender: "남성", age: "40대", mood: "힘있는", tags: ["단호한", "카리스마"] },
  { id: "Schedar", name: "승호", kind: "고른 남성", gender: "남성", age: "30대", mood: "차분한", tags: ["담담한", "고른"] },
  { id: "Zubenelgenubi", name: "병철", kind: "편한 남성", gender: "남성", age: "50대", mood: "따뜻한", tags: ["친근한", "동네 아저씨"] },
  { id: "Sadachbia", name: "시우", kind: "생기있는 남성", gender: "남성", age: "20대", mood: "밝은", tags: ["생기있는", "청량한"] },
];

export const STUDIO_VOICE_IDS = STUDIO_VOICES.map((v) => v.id);

// 내 목소리 — 회원이 [AI 목소리 설정 → 내 목소리]에서 등록한 자기 목소리. PC(앱)에서 만들고 서버로 가지 않는다 (2026-10-18)
export const MY_VOICE_ID = "me";
export const MY_VOICE = { id: MY_VOICE_ID, name: "내 목소리", kind: "내가 등록한 목소리" };
/** 등록할 때 붙인 이름 (예: 공실뉴스편집장) — 클립·목록에 그 이름으로 (2026-10-19 사장님) */
export function setMyVoiceName(n?: string) {
  MY_VOICE.name = String(n || "").trim() || "내 목소리";
}
/** 성우 찾기 — "내 목소리"도 포함 (이름·설명만 쓰는 곳에서) */
/* 타입캐스트 성우 (회원 자기 키로 앱이 받아 온 목록) — 이름을 찾을 수 있게 담아 둔다 */
const EXTRA = new Map<string, { id: string; name: string; kind: string }>();
export const isTypecast = (id?: string) => /^tc_/.test(String(id || ""));
export const isEleven = (id?: string) => /^el_/.test(String(id || ""));
export function addExtraVoices(list: { id: string; name: string; kind?: string }[]) {
  for (const v of list) EXTRA.set(v.id, { id: v.id, name: v.name, kind: v.kind || "타입캐스트 성우" });
}
export const findVoice = (id?: string): { id: string; name: string; kind: string } | undefined =>
  id === MY_VOICE_ID ? MY_VOICE : STUDIO_VOICES.find((v) => v.id === id) || (id ? EXTRA.get(id) || (isTypecast(id) ? { id, name: "타입캐스트 성우", kind: "타입캐스트" } : isEleven(id) ? { id, name: "일레븐랩스 성우", kind: "일레븐랩스" } : undefined) : undefined);
export const voicePhoto = (id: string) => `/studio-voices/${id.toLowerCase()}.webp`;
