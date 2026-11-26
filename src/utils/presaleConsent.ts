/* 분양자료 신청 동의 문구 (2026-11-26 사장님 회의) — 신청 창과 서버(증빙 저장)가 같은 글을 쓴다
   ※ 실제로 분양사에 연락처를 넘기기 전에 문구를 법률 전문가에게 한 번 확인받는다 */

export const PRESALE_KEEP = "신청일부터 1년 (기간이 지나면 지웁니다)";

export function collectText(presaleName: string) {
  return [
    `[개인정보 수집·이용 동의 (필수)]`,
    `· 수집하는 곳: (주)공실마케팅 (공실뉴스)`,
    `· 목적: ${presaleName} 분양자료 안내와 상담 연락`,
    `· 항목: 이름, 휴대폰 번호, 관심 평형`,
    `· 보관 기간: ${PRESALE_KEEP}`,
    `· 동의하지 않을 수 있으며, 이 경우 분양자료 신청을 할 수 없습니다.`,
  ].join("\n");
}

/** 제공받는 자 — 단지 사업주체(청약홈 시행사 이름) 및 그 분양 업무 수행사 */
export function thirdPartyName(presaleName: string, developer: string | null) {
  return `${presaleName} 사업주체${developer ? `(${developer})` : ""} 및 그 분양 업무 수행사`;
}

export function thirdText(presaleName: string, developer: string | null) {
  return [
    `[분양사 개인정보 제공 동의 (선택)]`,
    `· 제공받는 자: ${thirdPartyName(presaleName, developer)}`,
    `· 목적: ${presaleName} 분양 상담·자료 안내`,
    `· 항목: 이름, 휴대폰 번호, 관심 평형`,
    `· 보관 기간: 제공받은 날부터 1년 또는 분양 완료 때까지`,
    `· 동의하지 않아도 분양자료 신청은 할 수 있습니다.`,
  ].join("\n");
}
