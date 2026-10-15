// 영상 편집기 AI 목소리 목록 — Gemini 성우 30명 (모두 한국어). 서버(검사)와 편집 화면(목록)이 같이 쓴다.
// 앞의 12명은 2026-10-06 릴스에서 한국어 녹음을 확인한 목소리 (추천).
export type StudioVoice = { id: string; name: string; gender: "여성" | "남성"; tags: string[]; recommended?: boolean };

export const STUDIO_VOICES: StudioVoice[] = [
  { id: "Kore", name: "단정한 여성", gender: "여성", tags: ["또박또박", "안내"], recommended: true },
  { id: "Aoede", name: "산뜻한 여성", gender: "여성", tags: ["밝은", "경쾌한"], recommended: true },
  { id: "Leda", name: "발랄한 여성", gender: "여성", tags: ["젊은", "생기있는"], recommended: true },
  { id: "Zephyr", name: "맑은 여성", gender: "여성", tags: ["또렷한", "선명한"], recommended: true },
  { id: "Sulafat", name: "따뜻한 여성", gender: "여성", tags: ["포근한", "친절한"], recommended: true },
  { id: "Achernar", name: "부드러운 여성", gender: "여성", tags: ["나긋한", "고급스러운"], recommended: true },
  { id: "Charon", name: "신뢰감 남성", gender: "남성", tags: ["아나운서", "안정적인"], recommended: true },
  { id: "Sadaltager", name: "전문가 남성", gender: "남성", tags: ["설명", "똑부러지는"], recommended: true },
  { id: "Puck", name: "활기찬 남성", gender: "남성", tags: ["힘찬", "밝은"], recommended: true },
  { id: "Achird", name: "친근한 남성", gender: "남성", tags: ["편안한", "다정한"], recommended: true },
  { id: "Algieba", name: "차분한 남성", gender: "남성", tags: ["매끄러운", "차분한"], recommended: true },
  { id: "Fenrir", name: "신나는 남성", gender: "남성", tags: ["들뜬", "에너지"], recommended: true },
  { id: "Callirrhoe", name: "여유로운 여성", gender: "여성", tags: ["편안한"] },
  { id: "Autonoe", name: "밝은 여성", gender: "여성", tags: ["밝은"] },
  { id: "Despina", name: "매끄러운 여성", gender: "여성", tags: ["매끄러운"] },
  { id: "Erinome", name: "또렷한 여성", gender: "여성", tags: ["또렷한"] },
  { id: "Laomedeia", name: "경쾌한 여성", gender: "여성", tags: ["경쾌한"] },
  { id: "Gacrux", name: "성숙한 여성", gender: "여성", tags: ["성숙한", "차분한"] },
  { id: "Pulcherrima", name: "힘있는 여성", gender: "여성", tags: ["힘있는"] },
  { id: "Vindemiatrix", name: "상냥한 여성", gender: "여성", tags: ["상냥한"] },
  { id: "Orus", name: "단단한 남성", gender: "남성", tags: ["단단한"] },
  { id: "Enceladus", name: "속삭이는 남성", gender: "남성", tags: ["낮은"] },
  { id: "Iapetus", name: "또렷한 남성", gender: "남성", tags: ["또렷한"] },
  { id: "Umbriel", name: "여유로운 남성", gender: "남성", tags: ["편안한"] },
  { id: "Algenib", name: "굵은 남성", gender: "남성", tags: ["굵은"] },
  { id: "Rasalgethi", name: "안내 남성", gender: "남성", tags: ["설명"] },
  { id: "Alnilam", name: "단호한 남성", gender: "남성", tags: ["단호한"] },
  { id: "Schedar", name: "고른 남성", gender: "남성", tags: ["담담한"] },
  { id: "Zubenelgenubi", name: "편한 남성", gender: "남성", tags: ["친근한"] },
  { id: "Sadachbia", name: "생기있는 남성", gender: "남성", tags: ["생기있는"] },
];

export const STUDIO_VOICE_IDS = STUDIO_VOICES.map((v) => v.id);
