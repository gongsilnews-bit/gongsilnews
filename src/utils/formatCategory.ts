/**
 * 1차 카테고리 명칭 표준화 헬퍼 (공실뉴스, 부동산·경제, AI마케팅, 라이프·오피니언)
 * DB의 과거 명칭(공실현장, 정책시장, AI중개실무, 기타)을 화면 표시 시 100% 최신 표준 명칭으로 변환합니다.
 */
export function formatSection1(sec1?: string | null): string {
  if (!sec1) return "공실뉴스";
  const trimmed = sec1.trim();
  if (trimmed === "공실현장" || trimmed === "공실뉴스") return "공실뉴스";
  if (trimmed === "정책시장" || trimmed === "부동산·경제" || trimmed === "부동산정책" || trimmed === "부동산/경제") return "부동산·경제";
  if (trimmed === "AI중개실무" || trimmed === "AI마케팅" || trimmed === "부동산마케팅") return "AI마케팅";
  if (trimmed === "기타" || trimmed === "라이프·오피니언" || trimmed === "라이프/오피니언") return "라이프·오피니언";
  return trimmed;
}

const SECTION2_ALIASES: Record<string, string[]> = {
  "빌라/주택/다가구/다세대": ["빌라/주택/다가구/다세대", "빌라/주택"],
  "상가/사무실/빌딩/공장/토지": ["상가/사무실/빌딩/공장/토지", "상가/사무실/공장/토지"],
};

/**
 * 공실뉴스 2차 카테고리의 과거 명칭을 현재 표준 명칭으로 변환합니다.
 * 기존 DB 기사는 그대로 조회하면서 화면에는 새 명칭만 노출하기 위한 호환 계층입니다.
 */
export function formatSection2(sec2?: string | null): string {
  if (!sec2) return "";
  const trimmed = sec2.trim();
  const canonical = Object.entries(SECTION2_ALIASES).find(([, aliases]) => aliases.includes(trimmed));
  return canonical?.[0] || trimmed;
}

/** 새 명칭으로 필터링할 때 과거 DB 명칭까지 함께 조회합니다. */
export function getSection2Aliases(sec2: string): string[] {
  const canonical = formatSection2(sec2);
  return SECTION2_ALIASES[canonical] || [canonical];
}

export function formatCategoryBadge(sec1?: string | null, sec2?: string | null): string {
  const s1 = formatSection1(sec1);
  const s2 = sec2 && sec2 !== "전체" ? formatSection2(sec2) : "";
  return s2 ? `${s1} > ${s2}` : s1;
}
