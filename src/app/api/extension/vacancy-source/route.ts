import { NextRequest, NextResponse } from "next/server";
import { getVacancyDetail } from "@/app/actions/vacancy";
import { canSendBlog, getExtensionMember } from "@/utils/extensionMember";
import { getHomepageBase } from "@/app/actions/homepage";

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
          ? "블로그 작성은 공실뉴스부동산 회원 전용입니다. 무료 체험은 [AI 블로그 초안 작성]으로 시작해 주세요."
          : "공실뉴스에 로그인한 뒤 다시 시도해 주세요.",
      },
      { status: requester ? 403 : 401, headers: corsHeaders }
    );
  }

  const res = await getVacancyDetail(id);
  if (!res.success || !res.data) {
    return NextResponse.json({ success: false, error: "매물을 찾을 수 없습니다." }, { status: 404, headers: corsHeaders });
  }

  const v: any = res.data;
  const member = v.members || {};
  const agency = (Array.isArray(member.agencies) ? member.agencies[0] : member.agencies) || null;
  const isAgency = Boolean(agency) && (member.role === "REALTOR" || v.owner_role === "REALTOR" || Boolean(agency.registration_no || agency.reg_num));

  const clean = (value: unknown) => String(value ?? "").trim();
  // 내 홈페이지를 쓸 수 있는 회원(Pro · Studio)이면 글 링크·소개를 홈페이지로 (2026-10-29 사장님). 무료 회원은 "" — 글에 언급하지 않는다
  const homepage = isAgency ? await getHomepageBase(String(v.owner_id || "")).catch(() => "") : "";
  const phones = agency ? [agency.phone, agency.cell !== agency.phone ? agency.cell : ""].filter(Boolean) : [];
  const owner = isAgency
    ? {
        type: "agency",
        name: clean(agency.agency_name || agency.name),
        ceo: clean(agency.ceo_name),
        regNo: clean(agency.registration_no || agency.reg_num),
        address: [agency.address, agency.address_detail].map(clean).filter(Boolean).join(" "),
        phone: phones.map(clean).join(", "),
        homepage,
        vacancyNo: v.vacancy_no || null,
      }
    : {
        // 임대인이 본인 이름·본인 전화로 직접 내놓은 매물 (2026-10-29 사장님) — 전화는 본인이 쓰는 글일 때만
        type: "general",
        name: clean(member.name || v.client_name),
        phone: requester?.id && requester.id === v.owner_id ? clean(member.phone) : "",
        vacancyNo: v.vacancy_no || null,
      };

  return NextResponse.json(
    {
      success: true,
      id: v.id,
      vacancyNo: v.vacancy_no || null,
      detailPath: `/gongsil/detail/${v.id}`,
      location: [v.sido, v.sigungu, v.dong].filter(Boolean).join(" "),
      propertyType: [v.property_type, v.sub_category].filter(Boolean).join(" · "),
      tradeType: v.trade_type || "",
      owner,
    },
    { headers: { ...corsHeaders, "Cache-Control": "no-store" } }
  );
}
