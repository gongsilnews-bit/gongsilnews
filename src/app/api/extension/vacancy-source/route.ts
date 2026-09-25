import { NextRequest, NextResponse } from "next/server";
import { getVacancyDetail } from "@/app/actions/vacancy";

/**
 * 크롬 확장 블로그 작성용 매물 출처 정보
 *
 * 블로그 글 끝의 "매물 정보 출처"(부동산 표시·광고 필수 항목)에 쓰인다.
 * 공개 상세 페이지(/gongsil/detail/[id])의 등록자정보 탭에 이미 공개된 값만 돌려준다.
 * 일반회원 매물은 연락처를 돌려주지 않는다.
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

  const res = await getVacancyDetail(id);
  if (!res.success || !res.data) {
    return NextResponse.json({ success: false, error: "매물을 찾을 수 없습니다." }, { status: 404, headers: corsHeaders });
  }

  const v: any = res.data;
  const member = v.members || {};
  const agency = (Array.isArray(member.agencies) ? member.agencies[0] : member.agencies) || null;
  const isAgency = Boolean(agency) && (member.role === "REALTOR" || v.owner_role === "REALTOR" || Boolean(agency.registration_no || agency.reg_num));

  const clean = (value: unknown) => String(value ?? "").trim();
  const phones = agency ? [agency.phone, agency.cell !== agency.phone ? agency.cell : ""].filter(Boolean) : [];
  const owner = isAgency
    ? {
        type: "agency",
        name: clean(agency.agency_name || agency.name),
        ceo: clean(agency.ceo_name),
        regNo: clean(agency.registration_no || agency.reg_num),
        address: [agency.address, agency.address_detail].map(clean).filter(Boolean).join(" "),
        phone: phones.map(clean).join(", "),
      }
    : { type: "general", name: clean(member.name || v.client_name) };

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
