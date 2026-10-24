// 사진 쪽 늘리기 (2026-10-24 사장님) — "4. 사진" 쪽을 최대 5쪽까지, 쪽마다 사진 1~5장 (장수에 맞춰 배치는 Page4Photos 가 자동)
//  1쪽은 예전 칸 그대로 (mainImage · subImage1 · subImage2 · featureImage1 · featureImage2)
//  2~5쪽은 photoP{쪽}_{1~5} 칸 · 설명은 photoCaptions.p{쪽}_{1~5} · 쪽 수는 info.photoPageCount
export const MAX_PHOTO_PAGES = 5;
export const PHOTO_PER_PAGE = 5;
export const FIRST_PAGE_KEYS = ['mainImage', 'subImage1', 'subImage2', 'featureImage1', 'featureImage2'];

export const photoPageCount = (info: { photoPageCount?: number } | undefined) =>
  Math.min(MAX_PHOTO_PAGES, Math.max(1, Number(info?.photoPageCount) || 1));

/** 이 사진 쪽의 칸 이름 5개 (쪽 번호 1~5) */
export const photoPageKeys = (page: number) =>
  page <= 1 ? FIRST_PAGE_KEYS : Array.from({ length: PHOTO_PER_PAGE }, (_, i) => `photoP${page}_${i + 1}`);

/** 2~5쪽 칸 — Page4Photos 의 extraSlots */
export const extraPhotoSlots = (page: number, images: Record<string, any>) =>
  photoPageKeys(page).map((key, i) => ({ src: images[key] || null, key, captionKey: `p${page}_${i + 1}`, label: 'Photo' }));
