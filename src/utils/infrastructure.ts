export const INFRASTRUCTURE_CATEGORY_ORDER = [
  "지하철역",
  "버스정류장",
  "쇼핑센터",
  "병원",
  "학교",
  "기타",
] as const;

/**
 * 등록 화면에서는 저장소(JSON)의 키 순서와 무관하게 같은 순서로 보여 준다.
 * 기존 데이터에 있는 사용자 정의 카테고리는 "기타" 바로 앞에 보존한다.
 */
export function getInfrastructureEntries(
  infrastructure: Record<string, unknown> | null | undefined,
): Array<[string, string[]]> {
  const source = infrastructure || {};
  const known = new Set<string>(INFRASTRUCTURE_CATEGORY_ORDER);
  const toPlaces = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  const entries: Array<[string, string[]]> = INFRASTRUCTURE_CATEGORY_ORDER
    .slice(0, -1)
    .map((category) => [category, toPlaces(source[category])] as [string, string[]]);

  Object.entries(source).forEach(([category, places]) => {
    if (!category.startsWith("_") && !known.has(category)) {
      entries.push([category, toPlaces(places)]);
    }
  });

  entries.push(["기타", toPlaces(source["기타"])]);
  return entries;
}
