// 클립별 AI 그림 — 그림 스타일 16가지 (2026-10-19 사장님: 공실뉴스 AI 스튜디오 앱의 스타일·조건값을 바탕으로)
//  - 회사·작가 이름(픽사·디즈니·지브리·신카이·미야자키)은 회원용 상품이라 화면 이름·조건에서 빼고, 그림 모양을 설명하는 말로 바꿨다
//  - 조건 끝에 공통 규칙(글자·한글 금지, 돈 기호 최소)을 붙인다 → imagePrompt()
export type ImageStyle = {
  id: string;
  label: string;
  desc: string;
  /** 그림 AI 에 붙이는 스타일 조건 (영어) */
  prompt: string;
  /** 이 스타일의 주인공 — 장면 설명을 쓸 때 "이 인물이 나오게" (공실이·심리학) */
  character?: string;
  /** 카드 바탕 — 공실뉴스 AI 스튜디오 앱과 같은 사진 (picsum, 사장님 2026-10-19). 못 불러오면 bg 색 */
  thumb?: string;
  bg: string;
};

export const GONGSILI =
  "Gongsili, a cute mascot with a large perfectly round white head and a small simple white body, big round black eyes with white highlights, thin curved eyebrows, a tiny nose, pink blush on both cheeks, a wide open happy mouth with red inside";

export const IMAGE_STYLES: ImageStyle[] = [
  {
    id: "psychology", thumb: "https://picsum.photos/seed/psychology/400/300", label: "심리학", desc: "심플한 캐릭터·흰 배경·심리 은유", bg: "linear-gradient(135deg,#f8fafc,#cbd5e1)",
    character: "a minimalist stick figure with a round white head and a simple body",
    prompt: "Style: Psychology Illustration. Minimalist stick figures with round white heads and simple bodies. Clean white background. Expressive facial features showing emotions. Use symbolic metaphors (e.g., masks, glowing hearts, storm clouds, mirrors). Soft pastel accent colors. Line art style. Consistent character design.",
  },
  {
    id: "gongsili", thumb: "https://picsum.photos/seed/gongsili/400/300", label: "공실이", desc: "굵은 선·단색 공실이 캐릭터", bg: "linear-gradient(135deg,#ffffff,#fde2e4)",
    character: GONGSILI,
    prompt: `Style: Gongsili cartoon. ${GONGSILI}. Thick bold black outlines, flat solid colors, no shading, Korean webtoon meme style, expressive and funny. Background in the same bold-line flat style, bright and clean. High contrast.`,
  },
  {
    id: "realistic", thumb: "https://picsum.photos/seed/real/400/300", label: "실사", desc: "건축·부동산 사진처럼", bg: "linear-gradient(135deg,#475569,#94a3b8)",
    prompt: "Style: Professional real estate and architectural photography. Natural daylight, true-to-life colors and materials, sharp focus, wide-angle composition, shot on a full-frame camera, 8k, photorealistic.",
  },
  {
    id: "webtoon", thumb: "https://picsum.photos/seed/cartoon/400/300", label: "K-웹툰", desc: "선명한 한국 웹툰", bg: "linear-gradient(135deg,#60a5fa,#f472b6)",
    prompt: "Style: Premium Korean Webtoon (Manhwa) style. Vibrant colors, clean lines, detailed backgrounds, dramatic angles, anime-influenced but distinctively Korean webtoon aesthetic. High quality, 8k.",
  },
  {
    id: "anim3d", thumb: "https://picsum.photos/seed/pixar/400/300", label: "3D 애니메이션", desc: "극장용 3D 애니처럼", bg: "linear-gradient(135deg,#fbbf24,#fb7185)",
    prompt: "Style: High-end 3D animated feature film look. Soft rounded shapes, expressive lighting, warm color palette, subsurface scattering, cinematic composition, polished render.",
  },
  {
    id: "fairy3d", thumb: "https://picsum.photos/seed/disney/400/300", label: "동화풍 3D", desc: "부드러운 빛·동화 같은 3D", bg: "linear-gradient(135deg,#a78bfa,#f9a8d4)",
    prompt: "Style: Magical fairytale 3D animation. Soft glowing lighting, detailed textures, charming expressive characters, storybook atmosphere, high quality render.",
  },
  {
    id: "handanime", thumb: "https://picsum.photos/seed/ghibli/400/300", label: "손그림 애니", desc: "수채 배경·따뜻한 손그림", bg: "linear-gradient(135deg,#86efac,#7dd3fc)",
    prompt: "Style: Hand-painted anime film look. Watercolor-like painted backgrounds, lush nature, soft natural lighting, gentle whimsical atmosphere, nostalgic and peaceful, traditional cel animation feel.",
  },
  {
    id: "jpanime", thumb: "https://picsum.photos/seed/jpanime/400/300", label: "일본 애니메이션", desc: "전통 일본 애니 느낌", bg: "linear-gradient(135deg,#f87171,#818cf8)",
    prompt: "Style: High-quality Japanese Anime. Detailed backgrounds, cel-shaded characters, dramatic lighting, 90s anime aesthetic mixed with modern sharpness, 4k resolution.",
  },
  {
    id: "modernanime", thumb: "https://picsum.photos/seed/anime/400/300", label: "모던 애니", desc: "깨끗하고 밝은 작화", bg: "linear-gradient(135deg,#38bdf8,#e0f2fe)",
    prompt: "Style: Modern Bright Anime. Clean lines, soft shadows, bright and airy lighting, luminous skies with light rays, neat and detailed composition, vibrant colors, 8k resolution.",
  },
  {
    id: "folktale", label: "한국 전래동화", desc: "한옥·한복·민화풍 옛이야기 그림책", bg: "linear-gradient(135deg,#b45309,#065f46)",
    prompt: "Style: Korean traditional folktale storybook illustration. Inspired by Korean folk painting (minhwa) and ink-wash brushwork, soft muted natural colors on textured hanji paper, hanok houses with curved tile roofs, characters in traditional hanbok, pine trees, mountains, magpies and tigers as motifs, warm and gentle storytelling atmosphere, Joseon-era village setting.",
  },
  {
    id: "archdict", label: "건축사전 3D", desc: "신비한 건축사전 느낌 — 실감 3D 재현·도시 모형·파란 강조", bg: "linear-gradient(135deg,#94a3b8,#60a5fa)",
    prompt: "Style: Architecture explainer 3D visualization, like a Korean architecture documentary. Photorealistic 3D CG reconstruction of Korean cities, rivers, terrain and buildings, cinematic aerial or three-quarter view, realistic materials and water reflections, soft natural daylight with slight haze, Unreal Engine quality render. When explaining a place or plan, show the city as a clean model (white and light-grey massing blocks, soft low-poly green terrain, grey roads) and highlight the key area with a glowing translucent blue volume and light rays bursting outward. Calm, educational, wondrous mood.",
  },
  {
    id: "flat", thumb: "https://picsum.photos/seed/flat/400/300", label: "플랫 일러스트", desc: "설명 영상용 벡터 그림", bg: "linear-gradient(135deg,#34d399,#fde68a)",
    prompt: "Style: Modern Flat Vector Illustration. Minimalist, clean geometric shapes, solid soft colors, corporate Memphis design style. Professional infographic aesthetic.",
  },
  {
    id: "iso3d", thumb: "https://picsum.photos/seed/iso/400/300", label: "3D 아이소메트릭", desc: "귀여운 3D 미니어처", bg: "linear-gradient(135deg,#c4b5fd,#99f6e4)",
    prompt: "Style: 3D Isometric Clay Render. Cute, soft lighting, pastel colors, blender 3d style, miniature world look. High quality, glossy finish.",
  },
  {
    id: "retro", thumb: "https://picsum.photos/seed/retro/400/300", label: "감성 필름", desc: "따뜻한 필름 사진", bg: "linear-gradient(135deg,#d97706,#78350f)",
    prompt: "Style: Retro Film Photography. Warm color grading, subtle film grain, nostalgic 90s Korean vibe, cinematic aesthetic, emotional atmosphere.",
  },
  {
    id: "lineart", thumb: "https://picsum.photos/seed/line/400/300", label: "라인 드로잉", desc: "화이트보드 스케치", bg: "linear-gradient(135deg,#ffffff,#e5e7eb)",
    prompt: "Style: Minimalist Line Art. Black lines on white background, clean hand-drawn sketch style, storyboard aesthetic, simple and elegant.",
  },
  {
    id: "cyberpunk", thumb: "https://picsum.photos/seed/cyber/400/300", label: "사이버펑크", desc: "네온·미래 도시", bg: "linear-gradient(135deg,#db2777,#0891b2)",
    prompt: "Style: Cyberpunk digital art. Neon lights, rainy night streets, futuristic Seoul cityscape, magenta and cyan glow, reflective wet surfaces, high detail.",
  },
  {
    id: "watercolor", thumb: "https://picsum.photos/seed/water/400/300", label: "수채화", desc: "부드럽게 번지는 색", bg: "linear-gradient(135deg,#bae6fd,#fbcfe8)",
    prompt: "Style: Soft watercolor painting. Flowing translucent colors, delicate paper texture, gentle light, airy composition, loose artistic brushwork.",
  },
  {
    id: "oil", thumb: "https://picsum.photos/seed/oil/400/300", label: "유화", desc: "붓 자국이 살아 있는 그림", bg: "linear-gradient(135deg,#92400e,#1e3a8a)",
    prompt: "Style: Classic oil painting. Rich textures, visible brush strokes, deep warm colors, dramatic light, museum-quality fine art.",
  },
];

/** 그림 AI 에 보낼 최종 글 = 장면 설명 + 공통 규칙 + 스타일 조건 */
export function imagePrompt(scene: string, style: ImageStyle) {
  return `${scene.trim()} (CRITICAL RULES: 1. NO TEXT, NO WRITING, NO LETTERS. 2. ABSOLUTELY NO KOREAN/HANGUL CHARACTERS. 3. Avoid currency symbols unless depicting physical cash.) ${style.prompt}`;
}

/** 스타일 견본 그림 — 모든 카드를 같은 장면으로 그려 스타일 차이가 한눈에 보이게 */
export const SAMPLE_SCENE = "A three-story modern villa on a quiet Seoul side street, sunny afternoon, a small tree and a parked scooter in front, wide shot.";
export const sampleScene = (st: ImageStyle) => (st.character ? `${SAMPLE_SCENE} In front of the villa, ${st.character} is waving happily.` : SAMPLE_SCENE);
