"use server";

/**
 * 많이 본 뉴스 — 기간별 상위 5개를 서버에서 바로 뽑는다 (2026-11-24 사장님: "카테고리별로")
 *  예전: 화면에 받아 둔 최근 기사 20개 안에서만 순서를 다시 매겨서 "지난 1년"을 골라도 사실상 최근 20개 순위였다.
 *  - 대분류(section1) 안에서, 소분류(section2)가 있으면 그 소분류 안에서 뽑는다. 사이트 전체에서 뽑지 않는다.
 *    (대분류가 없는 화면 — 전체 목록 — 만 전체에서)
 *  - 1주일 = 이번 주 조회수(views_week, 월요일 0) · 1달 = 이번 달 조회수(views_month, 1일 0)
 *  - 3개월 · 6개월 · 1년 = 그 기간에 발행된 기사의 누적 조회수(view_count)
 *  - 소분류에서 5개가 안 차면 같은 대분류의 같은 기간 순위로 채운다
 */
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { getSection2Aliases } from "@/utils/formatCategory";

export type PopularPeriod = "1week" | "1month" | "3months" | "6months" | "1year";

const FIELDS = "id, article_no, section1, section2, title, subtitle, published_at, thumbnail_url, view_count, views_week, views_month";

/** 대분류 옛 이름도 같이 (getArticles 와 같은 묶음) */
function section1Aliases(s1: string): string[] {
  if (s1 === "공실뉴스" || s1 === "공실현장") return ["공실뉴스", "공실현장"];
  if (s1 === "부동산·경제" || s1 === "정책시장") return ["부동산·경제", "정책시장"];
  if (s1 === "AI마케팅" || s1 === "AI중개실무") return ["AI마케팅", "AI중개실무"];
  if (s1 === "라이프·오피니언" || s1 === "기타") return ["라이프·오피니언", "기타"];
  return [s1];
}

async function query(section1: string | null, section2: string | null, period: PopularPeriod, exclude: string[], limit: number) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const now = new Date();
  let q = supabase
    .from("articles")
    .select(FIELDS)
    .eq("is_deleted", false)
    .eq("status", "APPROVED")
    .not("published_at", "is", null)
    .lte("published_at", now.toISOString());

  if (section1) q = q.in("section1", section1Aliases(section1));
  if (section2) q = q.in("section2", getSection2Aliases(section2));
  if (exclude.length) q = q.not("id", "in", `(${exclude.join(",")})`);

  if (period === "1week") {
    q = q.order("views_week", { ascending: false, nullsFirst: false });
  } else if (period === "1month") {
    q = q.order("views_month", { ascending: false, nullsFirst: false });
  } else {
    const cutoff = new Date(now);
    if (period === "3months") cutoff.setMonth(cutoff.getMonth() - 3);
    else if (period === "6months") cutoff.setMonth(cutoff.getMonth() - 6);
    else cutoff.setFullYear(cutoff.getFullYear() - 1);
    q = q.gte("published_at", cutoff.toISOString()).order("view_count", { ascending: false, nullsFirst: false });
  }
  q = q.order("published_at", { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

const cached = unstable_cache(
  async (section1: string | null, section2: string | null, period: PopularPeriod, excludeId: string | null) => {
    const exclude = excludeId ? [excludeId] : [];
    const top = await query(section1, section2, period, exclude, 5);
    if (top.length < 5 && section2) {
      const more = await query(section1, null, period, [...exclude, ...top.map((a: any) => a.id)], 5 - top.length);
      return [...top, ...more];
    }
    return top;
  },
  ["popular-news-by-period"],
  { revalidate: 60 },
);

const PERIODS: PopularPeriod[] = ["1week", "1month", "3months", "6months", "1year"];
const UUID = /^[0-9a-f-]{36}$/i;

export async function getPopularNewsByPeriod(args: { section1?: string | null; section2?: string | null; period: PopularPeriod; excludeId?: string | number | null }) {
  try {
    const period = PERIODS.includes(args.period) ? args.period : "1week";
    const s1 = args.section1 && args.section1 !== "전체" ? String(args.section1) : null;
    const s2 = args.section2 && args.section2 !== "전체" ? String(args.section2) : null;
    const ex = args.excludeId != null && UUID.test(String(args.excludeId)) ? String(args.excludeId) : null;
    return { success: true as const, data: await cached(s1, s2, period, ex) };
  } catch (e: any) {
    return { success: false as const, error: e?.message || String(e), data: [] as any[] };
  }
}
