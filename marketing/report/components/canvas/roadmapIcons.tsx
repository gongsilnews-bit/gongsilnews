import React from 'react';

/**
 * 로드맵(6쪽) 아이콘 — 그림 문자(🚗🛒) 대신 선 픽토그램 SVG (2026-10-24 사장님: 촌스럽다)
 * 값은 예전처럼 문자열 하나. 아이콘 이름("train")이면 그대로, 예전 그림 문자면 같은 뜻의 픽토그램으로 바꿔 그린다.
 * 색은 currentColor — 감싼 칸이 테마색을 준다.
 */
export const ROADMAP_ICONS: Record<string, { label: string; svg: React.ReactNode }> = {
  train: { label: '지하철', svg: <><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" /><path d="m9 15-1-1" /><path d="m15 15 1-1" /><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" /><path d="m8 19-2 3" /><path d="m16 19 2 3" /></> },
  bus: { label: '버스', svg: <><path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" /><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" /><circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="16" cy="18" r="2" /></> },
  car: { label: '자동차', svg: <><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></> },
  parking: { label: '주차', svg: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></> },
  pin: { label: '위치', svg: <><path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></> },
  cart: { label: '쇼핑', svg: <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></> },
  store: { label: '상가', svg: <><path d="m2 7 4.4-4.4A2 2 0 0 1 7.8 2h8.4a2 2 0 0 1 1.4.6L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" /></> },
  coffee: { label: '카페', svg: <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><path d="M6 2v2M10 2v2M14 2v2" /></> },
  tree: { label: '공원', svg: <><path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z" /><path d="M7 16v6" /><path d="M13 19v3" /><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5" /></> },
  school: { label: '학교', svg: <><path d="M21.4 10.9a1 1 0 0 0 0-1.8L12.8 5.2a2 2 0 0 0-1.7 0L2.6 9.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.7 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></> },
  hospital: { label: '병원', svg: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" /></> },
  home: { label: '주거', svg: <><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></> },
  building: { label: '건물', svg: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" /></> },
  bed: { label: '방', svg: <><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></> },
  sun: { label: '채광', svg: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></> },
  area: { label: '면적', svg: <><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></> },
  key: { label: '입주', svg: <><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" /><path d="m21 2-9.6 9.6" /><circle cx="7.5" cy="15.5" r="5.5" /></> },
  calendar: { label: '일정', svg: <><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
  money: { label: '금액', svg: <><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></> },
  coins: { label: '수익', svg: <><circle cx="8" cy="8" r="6" /><path d="M18.1 10.4A6 6 0 1 1 10.3 18" /><path d="M7 6h1v4" /><path d="m16.7 13.9.7.7-2.8 2.8" /></> },
  trendUp: { label: '상승', svg: <><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></> },
  trendDown: { label: '하락', svg: <><path d="M22 17 13.5 8.5 8.5 13.5 2 7" /><path d="M16 17h6v-6" /></> },
  lock: { label: '보안', svg: <><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> },
  shield: { label: '안전', svg: <><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></> },
  wrench: { label: '수리', svg: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" /> },
  construction: { label: '개발', svg: <><rect x="2" y="6" width="20" height="8" rx="1" /><path d="M17 14v7M7 14v7M17 3v3M7 3v3M10 14 2.3 6.3M14 6l7.7 7.7M8 6l8 8" /></> },
  users: { label: '사람', svg: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></> },
  briefcase: { label: '업무', svg: <><rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M2 13h20" /></> },
  star: { label: '추천', svg: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /> },
  check: { label: '확인', svg: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></> },
};

// 예전 그림 문자 → 같은 뜻의 픽토그램 (AI·기본 틀이 넣던 것)
const EMOJI: Record<string, string> = {
  '🚇': 'train', '🚉': 'train', '🚆': 'train', '🚄': 'train', '🚈': 'train', '🚊': 'train',
  '🚌': 'bus', '🚍': 'bus', '🚗': 'car', '🚙': 'car', '🚘': 'car', '🅿': 'parking', '📍': 'pin', '🗺': 'pin', '🧭': 'pin',
  '🛒': 'cart', '🛍': 'cart', '🏬': 'store', '🏪': 'store', '☕': 'coffee', '🍽': 'coffee',
  '🌳': 'tree', '🌲': 'tree', '🏞': 'tree', '🌿': 'tree', '🏫': 'school', '🎓': 'school', '📚': 'school', '🏥': 'hospital', '⚕': 'hospital',
  '🏡': 'home', '🏠': 'home', '🏘': 'home', '🏢': 'building', '🏙': 'building', '🏛': 'building', '🛏': 'bed', '🛋': 'bed', '🚪': 'key',
  '☀': 'sun', '🌞': 'sun', '🌅': 'sun', '📐': 'area', '📏': 'area', '🔑': 'key', '🗝': 'key', '📅': 'calendar', '🗓': 'calendar', '📆': 'calendar',
  '💵': 'money', '💴': 'money', '💳': 'money', '💸': 'money', '💰': 'coins', '🪙': 'coins', '📈': 'trendUp', '📉': 'trendDown', '📊': 'trendUp',
  '🔒': 'lock', '🔐': 'lock', '🛡': 'shield', '✅': 'check', '✔': 'check', '🛠': 'wrench', '🔧': 'wrench', '🔨': 'wrench', '🏗': 'construction', '🚧': 'construction',
  '🤝': 'users', '👥': 'users', '👨‍👩‍👧': 'users', '👪': 'users', '💼': 'briefcase', '⭐': 'star', '🌟': 'star', '✨': 'star',
};
const DEFAULTS = ['building', 'home', 'trendUp', 'construction'];

// 제목 낱말 → 아이콘 (그림 문자는 기본 틀 값이라 내용과 안 맞을 때가 많다 — 예: "남향 방 세 개"에 🔒). 앞에 있는 것이 먼저
const WORDS: [RegExp, string][] = [
  [/지하철|역세권|전철|[가-힣]역\b|교통/, 'train'], [/버스/, 'bus'], [/주차/, 'parking'],
  [/마트|쇼핑|상권|생활권|편의/, 'cart'], [/공원|녹지|산책/, 'tree'], [/학교|학군|교육/, 'school'], [/병원|의료/, 'hospital'],
  [/남향|채광|햇빛|일조/, 'sun'], [/방|침실|구성|평면|구조/, 'bed'], [/면적|평형|넓/, 'area'],
  [/수익|임대료|수익률/, 'coins'], [/전세|월세|보증금|매매가|가격|금액|조건|관리비/, 'money'], [/입주|즉시/, 'key'],
  [/재개발|재건축|개발|호재|신축/, 'construction'], [/상승|가치|전망|투자/, 'trendUp'], [/수리|리모델링|인테리어/, 'wrench'],
  [/보안|안전|cctv/i, 'shield'], [/오피스|사무|업무/, 'briefcase'], [/위치|입지/, 'pin'],
];

/** 저장된 값 → 아이콘 이름. 직접 고른 이름은 그대로, 그림 문자·빈칸이면 제목 낱말 → 그림 문자 뜻 → 차례 기본값 */
export function roadmapIconKey(value: string | undefined, index: number, title = ''): string {
  const v = String(value || '').trim();
  if (ROADMAP_ICONS[v]) return v;
  const byWord = WORDS.find(([re]) => re.test(title));
  if (byWord) return byWord[1];
  const e = v.replace(/️/g, '');
  return EMOJI[e] || EMOJI[[...e][0] || ''] || DEFAULTS[index % DEFAULTS.length];
}

export const RoadmapIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {(ROADMAP_ICONS[name] || ROADMAP_ICONS.building).svg}
  </svg>
);
