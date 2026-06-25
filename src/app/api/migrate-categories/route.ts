import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 카테고리 마이그레이션 API (일회성)
 * 
 * GET  /api/migrate-categories         → 현황 조회 (dry-run)
 * POST /api/migrate-categories?run=true → 실제 마이그레이션 실행
 */

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 마이그레이션 매핑 테이블
const MIGRATION_RULES = [
  // 1. section1: 우리동네부동산 → 공실뉴스 (section2 유지)
  { oldSection1: "우리동네부동산", newSection1: "공실뉴스", section2Map: null },

  // 2. 뉴스/칼럼 > 부동산마케팅 → AI마케팅 > AI/NEWS
  { oldSection1: "뉴스/칼럼", oldSection2: "부동산마케팅", newSection1: "AI마케팅", newSection2: "AI/NEWS" },

  // 3. 뉴스/칼럼 > 부동산·주식·재테크 → 부동산·경제 > 경제/재테크/주식
  { oldSection1: "뉴스/칼럼", oldSection2: "부동산·주식·재테크", newSection1: "부동산·경제", newSection2: "경제/재테크/주식" },

  // 4. 뉴스/칼럼 > 정치·경제·사회 → 부동산·경제 > 부동산 정책/동향
  { oldSection1: "뉴스/칼럼", oldSection2: "정치·경제·사회", newSection1: "부동산·경제", newSection2: "부동산 정책/동향" },

  // 5. 뉴스/칼럼 > 세무·법률 → 부동산·경제 > 법률/세무 지식
  { oldSection1: "뉴스/칼럼", oldSection2: "세무·법률", newSection1: "부동산·경제", newSection2: "법률/세무 지식" },

  // 6. 뉴스/칼럼 > 여행·건강·생활 → 라이프·오피니언 > 맛집/여행/건강
  { oldSection1: "뉴스/칼럼", oldSection2: "여행·건강·생활", newSection1: "라이프·오피니언", newSection2: "맛집/여행/건강" },

  // 7. 뉴스/칼럼 > IT·가전·가구 → 라이프·오피니언 > 기타
  { oldSection1: "뉴스/칼럼", oldSection2: "IT·가전·가구", newSection1: "라이프·오피니언", newSection2: "기타" },

  // 8. 뉴스/칼럼 > 스포츠·연예·Car → 라이프·오피니언 > 스포츠
  { oldSection1: "뉴스/칼럼", oldSection2: "스포츠·연예·Car", newSection1: "라이프·오피니언", newSection2: "스포츠" },

  // 9. 뉴스/칼럼 > 인물·미션·기타 → 라이프·오피니언 > 인물/인터뷰
  { oldSection1: "뉴스/칼럼", oldSection2: "인물·미션·기타", newSection1: "라이프·오피니언", newSection2: "인물/인터뷰" },
];

export async function GET() {
  const supabase = getAdminClient();

  try {
    // 현재 DB의 section1/section2 분포 조회
    const { data: articles, error } = await supabase
      .from("articles")
      .select("id, section1, section2, title")
      .eq("is_deleted", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 카테고리별 카운트
    const counts: Record<string, number> = {};
    (articles || []).forEach((a: any) => {
      const key = `${a.section1 || "(없음)"} > ${a.section2 || "(없음)"}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    // 마이그레이션 대상 카운트
    let migrationTargets: { rule: string; count: number }[] = [];
    for (const rule of MIGRATION_RULES) {
      let matched: any[];
      if (rule.oldSection2) {
        matched = (articles || []).filter((a: any) => a.section1 === rule.oldSection1 && a.section2 === rule.oldSection2);
      } else {
        matched = (articles || []).filter((a: any) => a.section1 === rule.oldSection1);
      }
      if (matched.length > 0) {
        migrationTargets.push({
          rule: `${rule.oldSection1} > ${rule.oldSection2 || "*"} → ${rule.newSection1} > ${rule.newSection2 || "(유지)"}`,
          count: matched.length,
        });
      }
    }

    return NextResponse.json({
      status: "DRY_RUN",
      message: "마이그레이션 현황 조회 (실행 전). POST ?run=true 로 실행하세요.",
      totalArticles: (articles || []).length,
      currentDistribution: counts,
      migrationTargets,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const run = url.searchParams.get("run");

  if (run !== "true") {
    return NextResponse.json({ error: "run=true 파라미터를 추가해주세요." }, { status: 400 });
  }

  const supabase = getAdminClient();
  const results: { rule: string; updated: number; error?: string }[] = [];

  try {
    for (const rule of MIGRATION_RULES) {
      let query = supabase
        .from("articles")
        .select("id")
        .eq("section1", rule.oldSection1);

      if (rule.oldSection2) {
        query = query.eq("section2", rule.oldSection2);
      }

      const { data: matched, error: matchErr } = await query;
      if (matchErr) {
        results.push({ rule: `${rule.oldSection1} > ${rule.oldSection2 || "*"}`, updated: 0, error: matchErr.message });
        continue;
      }

      if (!matched || matched.length === 0) {
        results.push({ rule: `${rule.oldSection1} > ${rule.oldSection2 || "*"}`, updated: 0 });
        continue;
      }

      const ids = matched.map((a: any) => a.id);

      // 업데이트 데이터 구성
      const updateData: any = { section1: rule.newSection1 };
      if (rule.newSection2) {
        updateData.section2 = rule.newSection2;
      }

      const { error: updateErr } = await supabase
        .from("articles")
        .update(updateData)
        .in("id", ids);

      if (updateErr) {
        results.push({ rule: `${rule.oldSection1} > ${rule.oldSection2 || "*"}`, updated: 0, error: updateErr.message });
      } else {
        results.push({ rule: `${rule.oldSection1} > ${rule.oldSection2 || "*"} → ${rule.newSection1} > ${rule.newSection2 || "(유지)"}`, updated: ids.length });
      }
    }

    // 마이그레이션 후 현황 재조회
    const { data: afterArticles } = await supabase
      .from("articles")
      .select("section1, section2")
      .eq("is_deleted", false);

    const afterCounts: Record<string, number> = {};
    (afterArticles || []).forEach((a: any) => {
      const key = `${a.section1 || "(없음)"} > ${a.section2 || "(없음)"}`;
      afterCounts[key] = (afterCounts[key] || 0) + 1;
    });

    return NextResponse.json({
      status: "COMPLETED",
      message: "✅ 카테고리 마이그레이션 완료!",
      results,
      afterDistribution: afterCounts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}
