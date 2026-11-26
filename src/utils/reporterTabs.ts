/* 기자 페이지 분류 탭 — 그 기자 기사의 실제 분류로 (2026-11-26 사장님: 옛 고정 분류 "부동산·주식·재테크…" 대신)
   여러 대분류(section1)에 걸쳐 쓴 기자 → 대분류 탭 (공실뉴스 · 부동산·경제 · AI마케팅 · 라이프·오피니언 …)
   한 대분류만 쓴 기자 → 그 안의 소분류(section2) 탭
   기사가 0건인 탭은 만들지 않는다. 글자 수가 많은 순서 */
import { formatSection2 } from "@/utils/formatCategory";

type A = { section1?: string | null; section2?: string | null };
export type ReporterTab = { key: string; label: string; count: number };

const s1 = (a: A) => String(a.section1 || "").trim();
const s2 = (a: A) => formatSection2(String(a.section2 || "").trim()) || "";

export function reporterTabs(articles: A[]): ReporterTab[] {
  const tops = new Map<string, number>();
  for (const a of articles) if (s1(a)) tops.set(s1(a), (tops.get(s1(a)) || 0) + 1);
  const useTop = tops.size > 1;
  const m = new Map<string, number>();
  for (const a of articles) {
    const k = useTop ? s1(a) : s2(a);
    if (k) m.set(k, (m.get(k) || 0) + 1);
  }
  const tabs = [...m.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ key: `${useTop ? "s1" : "s2"}:${k}`, label: k, count: n }));
  return [{ key: "all", label: "전체 기사", count: articles.length }, ...tabs];
}

export function inReporterTab(a: A, key: string) {
  if (key === "all") return true;
  const [kind, ...rest] = key.split(":");
  const v = rest.join(":");
  return kind === "s1" ? s1(a) === v : s2(a) === v;
}
