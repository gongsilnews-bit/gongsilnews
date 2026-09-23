import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEffectivePlan } from "@/utils/planCheck";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = getAdminClient();

    // 1. 토큰이 있는 경우 Supabase 유저 검증
    let user: any = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (!userError && userData?.user) {
        user = userData.user;
      }
    }

    // 2. 토큰이 없거나 만료된 경우: URL 쿼리의 email 또는 로컬 최고관리자 기본 프로필 반환 (개발/테스트 편의)
    const emailParam = req.nextUrl.searchParams.get("email");
    let memberData: any = null;

    if (user?.email || emailParam) {
      const targetEmail = user?.email || emailParam;
      const { data: member } = await supabase
        .from("members")
        .select("id, name, email, role, plan_type, plan_end_date, max_articles_per_month")
        .eq("email", targetEmail)
        .maybeSingle();

      memberData = member;
    }

    // 기본 관리자 Fallback (로컬 개발 환경 지원)
    if (!memberData) {
      const { data: adminMember } = await supabase
        .from("members")
        .select("id, name, email, role, plan_type, plan_end_date, max_articles_per_month")
        .eq("role", "ADMIN")
        .limit(1)
        .maybeSingle();
      memberData = adminMember;
    }

    if (!memberData) {
      return NextResponse.json(
        {
          success: true,
          isLoggedIn: false,
          user: null,
          tier: "guest",
          dailyLimit: 3,
          dailyUsed: 0,
        },
        { headers: corsHeaders }
      );
    }

    const effectivePlan = getEffectivePlan(memberData);
    const isPremium = effectivePlan === "admin" || effectivePlan === "news_premium" || memberData.role === "ADMIN";

    return NextResponse.json(
      {
        success: true,
        isLoggedIn: true,
        user: {
          id: memberData.id,
          name: memberData.name || "공실뉴스 회원",
          email: memberData.email,
          role: memberData.role,
          planType: effectivePlan,
          isPremium,
        },
        tier: isPremium ? "premium" : "free",
        dailyLimit: isPremium ? 9999 : 5,
        dailyUsed: 0,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("확장프로그램 회원 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "인증 처리 실패" },
      { status: 500, headers: corsHeaders }
    );
  }
}
