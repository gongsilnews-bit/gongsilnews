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
  // 2026-11-17: 새 10칸 이름 "빌라/주택"이 표준 — 예전 "빌라/주택/다가구/다세대" 기사도 같은 칸으로
  "빌라/주택": ["빌라/주택", "빌라/주택/다가구/다세대"],
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

/**
 * 공실뉴스 2차섹션 10칸 — 공실열람 칸과 똑같이 (2026-11-17 사장님: "똑같이 맞춰야 공실열람에서 기사가 맞춰서 보여질 것")
 * 기사 쓰기에서 고르는 값. 예전 "빌라/주택/다가구/다세대" 기사는 "빌라/주택"으로 읽는다(SECTION2_ALIASES).
 */
export const GONGSIL_SECTION2 = [
  "아파트", "오피스텔", "빌라/주택", "원룸투룸(풀옵션)", "사무실·지식산업센터",
  "상가", "빌딩/건물 매매", "공장/토지/기타", "신축/분양/재건축", "경매/공매",
] as const;

/** 메뉴·탭에서만 쓰는 짧은 이름 (저장 이름은 그대로) — 칸이 늘어 한 줄에 들어가게 (2026-11-17 사장님) */
const SECTION2_SHORT: Record<string, string> = { "원룸투룸(풀옵션)": "원룸투룸", "사무실·지식산업센터": "사무실·지산", "신축/분양/재건축": "신축/분양" };
export const section2Label = (s: string) => SECTION2_SHORT[s] || s;

/** 새 10칸 → 예전 6칸 (메뉴를 10칸으로 바꾸기 전까지 새 기사가 예전 메뉴에서도 보이게) */
const OLD_GROUP_OF: Record<string, string> = {
  "아파트": "아파트/오피스텔",
  "오피스텔": "아파트/오피스텔",
  "원룸투룸(풀옵션)": "원룸/투룸(풀옵션)",
  "사무실·지식산업센터": "상가/사무실/빌딩/공장/토지",
  "상가": "상가/사무실/빌딩/공장/토지",
  "빌딩/건물 매매": "상가/사무실/빌딩/공장/토지",
  "공장/토지/기타": "상가/사무실/빌딩/공장/토지",
  "신축/분양/재건축": "신축/분양",
};

/** 새 명칭으로 필터링할 때 과거 DB 명칭까지 함께 조회합니다.
 *  예전 6칸 이름이면 그 칸에 속하는 새 10칸 이름도, 새 이름이면 그 이름이 속한 예전 칸 이름도 함께 (2026-11-17) */
export function getSection2Aliases(sec2: string): string[] {
  const canonical = formatSection2(sec2);
  const base = SECTION2_ALIASES[canonical] || [canonical];
  const newMembers = Object.keys(OLD_GROUP_OF).filter((k) => OLD_GROUP_OF[k] === canonical);
  const oldGroup = OLD_GROUP_OF[canonical] ? [OLD_GROUP_OF[canonical]] : [];
  return [...new Set([...base, ...newMembers, ...oldGroup])];
}

/** 기사의 2차섹션이 고른 칸에 들어가는지 — 예전 6칸 ↔ 새 10칸을 같은 칸으로 본다 (목록·많이 본 뉴스 등 화면 거르기용) */
export function section2Matches(articleSec2?: string | null, selected?: string | null): boolean {
  if (!selected) return true;
  if (!articleSec2) return false;
  const a = formatSection2(articleSec2);
  const sel = formatSection2(selected);
  return a === sel || OLD_GROUP_OF[a] === sel || OLD_GROUP_OF[sel] === a;
}

export function formatCategoryBadge(sec1?: string | null, sec2?: string | null): string {
  const s1 = formatSection1(sec1);
  const s2 = sec2 && sec2 !== "전체" ? formatSection2(sec2) : "";
  return s2 ? `${s1} > ${s2}` : s1;
}
