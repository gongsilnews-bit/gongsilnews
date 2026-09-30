
import { ImageStyle, StyleOption, VoiceOption } from './types';

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: ImageStyle.PSYCHOLOGY,
    label: '심리학 (Psychology)',
    description: '심플한 캐릭터, 흰색 배경, 심리적 은유 (Minimalist, White BG)',
    thumbnail: 'https://picsum.photos/seed/psychology/400/300'
  },
  {
    id: ImageStyle.GONGSILI,
    label: '공실이 (Gongsili)',
    description: '단순하고 선이 굵은 공실이 캐릭터 스타일',
    thumbnail: 'https://picsum.photos/seed/gongsili/400/300'
  },
  {
    id: ImageStyle.REALISTIC,
    label: '실사 (Realistic)',
    description: 'Professional architectural photography style.',
    thumbnail: 'https://picsum.photos/seed/real/400/300'
  },
  {
    id: ImageStyle.CARTOON,
    label: 'K-웹툰 (K-Webtoon)',
    description: 'High-quality Korean webtoon style (Manhwa).',
    thumbnail: 'https://picsum.photos/seed/cartoon/400/300'
  },
  {
    id: ImageStyle.PIXAR,
    label: '3D 픽사 (Pixar)',
    description: 'High-quality 3D animation style like Pixar movies.',
    thumbnail: 'https://picsum.photos/seed/pixar/400/300'
  },
  {
    id: ImageStyle.DISNEY,
    label: '디즈니 (Disney)',
    description: 'Classic Disney animation style with soft lighting.',
    thumbnail: 'https://picsum.photos/seed/disney/400/300'
  },
  {
    id: ImageStyle.GHIBLI,
    label: '지브리 (Ghibli)',
    description: 'Hand-painted backgrounds and whimsical characters.',
    thumbnail: 'https://picsum.photos/seed/ghibli/400/300'
  },
  {
    id: ImageStyle.JAPANESE_ANIME,
    label: '일본 애니메이션 (JP Anime)',
    description: 'Traditional Japanese animation aesthetics.',
    thumbnail: 'https://picsum.photos/seed/jpanime/400/300'
  },
  {
    id: ImageStyle.ANIME,
    label: '모던 애니 (Modern Anime)',
    description: '깨끗하고 밝고 깔끔한 작화 (Clean & Bright)',
    thumbnail: 'https://picsum.photos/seed/anime/400/300'
  },
  {
    id: ImageStyle.FLAT_ILLUSTRATION,
    label: '플랫 일러스트 (Flat)',
    description: 'Clean, modern vector art popular in explainer videos.',
    thumbnail: 'https://picsum.photos/seed/flat/400/300'
  },
  {
    id: ImageStyle.ISO_3D,
    label: '3D 아이소메트릭 (3D Iso)',
    description: 'Cute 3D clay style, popular for tech & finance.',
    thumbnail: 'https://picsum.photos/seed/iso/400/300'
  },
  {
    id: ImageStyle.RETRO_FILM,
    label: '감성 필름 (Retro Film)',
    description: 'Warm, nostalgic film grain style for vlogs.',
    thumbnail: 'https://picsum.photos/seed/retro/400/300'
  },
  {
    id: ImageStyle.LINE_ART,
    label: '라인 드로잉 (Line Art)',
    description: 'Minimalist whiteboard sketch style.',
    thumbnail: 'https://picsum.photos/seed/line/400/300'
  },
  {
    id: ImageStyle.CYBERPUNK,
    label: '사이버펑크 (Cyberpunk)',
    description: 'Neon lights and futuristic urban vibes.',
    thumbnail: 'https://picsum.photos/seed/cyber/400/300'
  },
  {
    id: ImageStyle.WATERCOLOR,
    label: '수채화 (Watercolor)',
    description: 'Soft, flowing colors and delicate textures.',
    thumbnail: 'https://picsum.photos/seed/water/400/300'
  },
  {
    id: ImageStyle.OIL_PAINTING,
    label: '유화 (Oil Painting)',
    description: 'Rich textures and artistic strokes.',
    thumbnail: 'https://picsum.photos/seed/oil/400/300'
  }
];

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Kore', label: '코레 (Kore)', description: '차분하고 신뢰감 있는 여성 목소리', gender: 'Female' },
  { id: 'Puck', label: '퍽 (Puck)', description: '밝고 경쾌한 남성 목소리', gender: 'Male' },
  { id: 'Charon', label: '카론 (Charon)', description: '깊고 중후한 남성 목소리', gender: 'Male' },
  { id: 'Zephyr', label: '제퍼 (Zephyr)', description: '부드럽고 자연스러운 목소리', gender: 'Female' },
  { id: 'Fenrir', label: '펜릴 (Fenrir)', description: '강조가 뚜렷한 남성 목소리', gender: 'Male' },
  { id: 'Aoede', label: '아오이데 (Aoede)', description: '품격 있고 전문적인 여성 목소리', gender: 'Female' },
  { id: 'Leda', label: '레다 (Leda)', description: '따뜻하고 안정적인 여성 목소리', gender: 'Female' },
  { id: 'Orus', label: '오루스 (Orus)', description: '자신감 있는 뉴스 톤 남성 목소리', gender: 'Male' }
];

export const SPEED_OPTIONS = [
  { label: '0.75', value: 0.75 },
  { label: '일반', value: 1.0 },
  { label: '1.25', value: 1.25 },
  { label: '1.5', value: 1.5 },
  { label: '1.75', value: 1.75 }
];

export const SYSTEM_INSTRUCTION = `
You are a professional storyboard artist for "Gongsil News" (Real Estate News).
Your task is to take a raw news script and break it down into **highly granular** visual segments.

**CRITICAL REQUIREMENT:**
- **Split the script into very short segments.**
- Aim for roughly **2x more segments** than a standard paragraph breakdown.
- Each segment should consist of only **1 short sentence** or even a phrase if it carries a distinct visual idea.
- Do NOT group multiple sentences together. Keep it fast-paced.

**VISUAL RULES:**
- If money, currency, or financial graphs are depicted, **ALWAYS** describe them as **Korean Won (₩)**. NEVER use the Dollar symbol ($).
- The setting is South Korea.

For each segment, provide:
1. narrative: The specific part of the script for this segment. Keep the original text to maintain the flow.
2. visualPrompt: A highly descriptive English prompt for an AI image generator. The prompt should focus on architectural details, urban scenes, or metaphors for real estate vacancy and market trends. Avoid text in images.

Output MUST be a JSON array of objects with the keys "narrative" and "visualPrompt".
`;
