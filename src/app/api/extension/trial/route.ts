import { NextRequest, NextResponse } from "next/server";
import { consumeTrial, getExtensionMember, type TrialFeature } from "@/utils/extensionMember";

/**
 * 크롬 확장 무료 체험 1번 쓰기
 *
 * [AI 블로그 초안 작성]·[AI SNS 3종 작성]·[AI 유튜브 대본 작성]을 누를 때 부른다.
 * body: { feature: "blog" | "sns" | "youtube", app?: "newsmaker" }
 * - SNS 는 블로그와 같은 회원 범위가 무제한이다
 * - 공실뉴스부동산·공실스터디부동산·최고관리자: 세지 않는다 (unlimited)
 * - 뉴스메이커(app: "newsmaker")는 비즈니스회원도 세지 않는다. 체험 횟수는 기사 작성기와 함께 센다
 * - 그 외 로그인 회원: 이번 달 3번까지. 다 썼으면 403 + exhausted
 * - 로그인 안 함: 401
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

const FEATURE_NAME: Record<TrialFeature, string> = { blog: "블로그 작성", sns: "SNS 작성", youtube: "유튜브 대본" };

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const feature = body?.feature as TrialFeature;
    if (feature !== "blog" && feature !== "sns" && feature !== "youtube") {
      return NextResponse.json({ success: false, error: "알 수 없는 기능입니다." }, { status: 400, headers: corsHeaders });
    }

    const member = await getExtensionMember(req);
    if (!member) {
      return NextResponse.json(
        { success: false, error: `공실뉴스에 로그인하면 ${FEATURE_NAME[feature]}을(를) 매월 3번 무료로 체험할 수 있습니다.` },
        { status: 401, headers: corsHeaders }
      );
    }

    const unlimited = body?.app === "newsmaker"
      ? member.canNewsMaker
      : feature === "youtube" ? member.canYoutubeWriter : member.canBlog;
    if (unlimited) {
      return NextResponse.json({ success: true, unlimited: true }, { headers: corsHeaders });
    }

    const result = await consumeTrial(member.id, feature);
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          exhausted: true,
          error: `이번 달 ${FEATURE_NAME[feature]} 무료 체험 ${result.limit}번을 모두 사용했습니다.`,
          used: result.used,
          remaining: 0,
          limit: result.limit,
        },
        { status: 403, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, unlimited: false, used: result.used, remaining: result.remaining, limit: result.limit },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("확장 무료 체험 처리 오류:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "무료 체험을 확인하지 못했습니다." },
      { status: 500, headers: corsHeaders }
    );
  }
}
