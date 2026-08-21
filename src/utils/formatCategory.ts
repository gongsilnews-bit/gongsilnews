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

export function formatCategoryBadge(sec1?: string | null, sec2?: string | null): string {
  const s1 = formatSection1(sec1);
  const s2 = sec2 && sec2 !== "전체" ? sec2 : "";
  return s2 ? `${s1} > ${s2}` : s1;
}
