/* eslint-disable @typescript-eslint/no-explicit-any */
import { getVacancyDetail } from "@/app/actions/vacancy";
import { getHomepageBase } from "@/app/actions/homepage";

/**
 * 블로그·SNS 글 끝 "매물 정보 출처"(부동산 표시·광고 필수 항목)
 *  공개 상세 페이지(/gongsil/detail/[id])의 등록자정보 탭에 이미 공개된 값만.
 *  크롬 확장(/api/extension/vacancy-source)과 앱 SNS 올리기(/api/app/sns)가 같이 쓴다 (2026-11-22)
 *  일반회원(임대인) 매물은 본인이 쓰는 글일 때만 본인 전화를 넣는다 (2026-10-29).
 */
export async function vacancyListing(id: string, requesterId?: string | null) {
  const res = await getVacancyDetail(id);
  if (!res.success || !res.data) return null;

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
        // 공실 등록 때 넣은 연락처(client_phone) 먼저, 없으면 회원 전화 (2026-11-26 사장님: 카카오·구글 가입자는 회원 전화가 비어 SNS 글 끝에 연락처가 안 나왔음)
        phone: requesterId && requesterId === v.owner_id ? clean(v.client_phone || member.phone) : "",
        vacancyNo: v.vacancy_no || null,
      };

  return {
    id: v.id as string,
    ownerId: String(v.owner_id || ""),
    vacancyNo: v.vacancy_no || null,
    detailPath: `/gongsil/detail/${v.id}`,
    location: [v.sido, v.sigungu, v.dong].filter(Boolean).join(" "),
    propertyType: [v.property_type, v.sub_category].filter(Boolean).join(" · "),
    tradeType: v.trade_type || "",
    owner,
  };
}
