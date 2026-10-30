/**
 * 공실뉴스부동산 회원 구분 — 일반 중개사무소 / 중개법인 (2026-10-30 사장님)
 * 결제 요금을 가르는 기준: 일반 = Pro · Studio / 법인 = Studio 법인 (기능은 Studio 와 같고 한도 20% 더)
 *
 * 1) 최고관리자가 정해 둔 값(agencies.biz_kind)이 있으면 그것
 * 2) 없으면 사업자등록번호 가운데 두 자리로 — 81·85·86·87·88 = 법인 (국세청 사업자 구분)
 */
export type AgencyKind = "general" | "corp";

const CORP_CODES = ["81", "85", "86", "87", "88"];

/** 사업자등록번호만 보고 — 10자리가 아니면 일반으로 본다 */
export function kindFromBizNum(bizNum?: string | null): AgencyKind {
  const d = String(bizNum || "").replace(/\D/g, "");
  return d.length === 10 && CORP_CODES.includes(d.slice(3, 5)) ? "corp" : "general";
}

export function agencyKind(agency?: { biz_kind?: string | null; biz_num?: string | null } | null): AgencyKind {
  if (agency?.biz_kind === "corp" || agency?.biz_kind === "general") return agency.biz_kind;
  return kindFromBizNum(agency?.biz_num);
}

export const AGENCY_KIND_LABEL: Record<AgencyKind, string> = { general: "일반 중개사무소", corp: "중개법인" };
