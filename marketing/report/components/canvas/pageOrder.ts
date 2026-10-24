// 쪽 순서 (2026-10-24 사장님: 쪽 고르기 칸에서 끌어서 순서 바꾸기)
//  쪽 번호(id)는 그대로 두고 보여 주는 차례만 info.pageOrder 에 저장한다. 표지(0)는 늘 맨 앞.
//  화면에 붙는 번호("7. 지적도")는 차례대로 다시 매긴다 — PAGE 07 / 12 와 같게.
export const PAGE_NAMES: Record<number, string> = {
  0: '표지', 1: '개요', 2: '매물설명 & 시세', 3: '임대현황', 4: '사진', 5: '입지', 6: '로드맵',
  8: '지적도', 9: '건축물대장', 10: '층별 현황', 11: '실거래 이력', 7: '연락처',
};
export const DEFAULT_ORDER = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 7];

/** 저장된 차례 → 빠진 쪽은 기본 자리 근처(연락처 앞)에 넣고, 표지는 맨 앞 */
export function pageOrder(info: { pageOrder?: number[] } | undefined): number[] {
  const saved = (info?.pageOrder || []).filter((p, i, a) => DEFAULT_ORDER.includes(p) && a.indexOf(p) === i && p !== 0);
  const missing = DEFAULT_ORDER.filter((p) => p !== 0 && !saved.includes(p));
  const out = [...saved];
  for (const p of missing) {
    const at = out.indexOf(7);
    if (p !== 7 && at >= 0) out.splice(at, 0, p); else out.push(p);
  }
  return [0, ...out];
}

/** 쪽 이름 앞 번호 — 보이는 쪽만 차례대로 (표지 0부터) */
export function pageNumberLabel(id: number, info: { pageOrder?: number[] } | undefined): string {
  const i = pageOrder(info).indexOf(id);
  return `${i}. ${PAGE_NAMES[id] || ''}`;
}
