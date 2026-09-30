import { NextRequest, NextResponse } from "next/server";
import { getExtensionMember, getTrialUsage } from "@/utils/extensionMember";

/**
 * 크롬 확장 회원 확인
 * 공실뉴스 로그인 쿠키 또는 Bearer 토큰으로만 판정한다.
 * (예전의 ?email= 조회와 최고관리자 대체 응답은 누구나 회원 정보를 볼 수 있어 제거했다)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const member = await getExtensionMember(req);

    if (!member) {
      return NextResponse.json(
        {
          success: true,
          isLoggedIn: false,
          user: null,
          canBlog: false,
          canYoutubeWriter: false,
          canRemodel: false,
          canNewsMaker: false,
          tier: "guest",
          dailyLimit: 3,
          dailyUsed: 0,
        },
        { headers: corsHeaders }
      );
    }

    const isPremium = member.canBlog || member.canYoutubeWriter;
    /* 유료 회원이 아니면 이번 달 블로그·유튜브 무료 체험 남은 횟수를 함께 알려 준다 */
    const trial = isPremium
      ? null
      : await getTrialUsage(member.id).catch((error) => {
          console.error("확장 무료 체험 조회 오류:", error);
          return null;
        });
    return NextResponse.json(
      {
        success: true,
        isLoggedIn: true,
        user: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          planType: member.plan,
          planLabel: member.planLabel,
          isPremium,
        },
        canBlog: member.canBlog,
        canYoutubeWriter: member.canYoutubeWriter,
        canRemodel: member.canRemodel,
        canNewsMaker: member.canNewsMaker,
        trial,
        tier: isPremium ? "premium" : "free",
        dailyLimit: isPremium ? 9999 : 5,
        dailyUsed: 0,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("확장프로그램 회원 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "인증 처리 실패" },
      { status: 500, headers: corsHeaders }
    );
  }
}
