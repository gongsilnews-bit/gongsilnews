import { NextRequest, NextResponse } from "next/server";
import { canSendBlog, getExtensionMember } from "@/utils/extensionMember";
import { vacancyListing } from "@/utils/vacancyListing";

/**
 * 크롬 확장 블로그 작성용 매물 출처 정보
 *
 * 블로그 글 끝의 "매물 정보 출처"(부동산 표시·광고 필수 항목)에 쓰인다.
 * 공개 상세 페이지(/gongsil/detail/[id])의 등록자정보 탭에 이미 공개된 값만 돌려준다.
 * 일반회원(임대인) 매물은 본인이 쓰는 글일 때만 본인 전화를 돌려준다 (2026-10-29).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ success: false, error: "매물 ID가 올바르지 않습니다." }, { status: 400, headers: corsHeaders });
  }

  // 블로그 전송은 반드시 이 API를 거친다. 확장 화면 잠금을 우회해도 여기서 막힌다.
  // 유료 회원 또는 최근 블로그 무료 체험을 쓴 회원만 받는다.
  const requester = await getExtensionMember(req);
  // 리모델링 작성기(유료회원·비즈니스회원)는 물건을 가져올 때 이 정보를 함께 받는다
  if (!requester?.canRemodel && !(await canSendBlog(requester))) {
    return NextResponse.json(
      {
        success: false,
        error: requester
          ? "블로그 작성은 공실뉴스부동산은 무제한, 부동산회원은 한 달에 3번 쓸 수 있습니다. [AI 블로그 초안 작성]으로 시작해 주세요."
          : "공실뉴스에 로그인한 뒤 다시 시도해 주세요.",
      },
      { status: requester ? 403 : 401, headers: corsHeaders }
    );
  }

  // 출처 계산은 utils/vacancyListing (앱 SNS 올리기와 같이 씀, 2026-11-22)
  const l = await vacancyListing(id, requester?.id);
  if (!l) {
    return NextResponse.json({ success: false, error: "매물을 찾을 수 없습니다." }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json(
    {
      success: true,
      id: l.id,
      vacancyNo: l.vacancyNo,
      detailPath: l.detailPath,
      location: l.location,
      propertyType: l.propertyType,
      tradeType: l.tradeType,
      owner: l.owner,
    },
    { headers: { ...corsHeaders, "Cache-Control": "no-store" } }
  );
}
