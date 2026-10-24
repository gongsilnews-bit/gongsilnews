/**
 * 공실열람 상세 — 아파트·오피스텔 단지정보 줄 (2026-10-24 사장님)
 *  공실등록 때 받아 둔 metadata.complex_info · total_units 로 만든다 (열람할 때 공공자료를 다시 부르지 않음 → 목록·검색에 무리 없음).
 *  값이 없는 줄은 만들지 않는다 (지어내지 않음). 표 모양은 그 화면의 기존 줄과 같게 — 줄 목록만 돌려준다.
 */
/** 평형 구성 한 줄 — 공동주택관리정보의 전용면적 구간별 세대수 (0인 구간은 뺀다) */
export function sizeMixText(sz: { le60?: number | null; le85?: number | null; le135?: number | null; gt135?: number | null } | null | undefined): string {
  if (!sz) return "";
  return ([["60㎡ 이하", sz.le60], ["60~85㎡", sz.le85], ["85~135㎡", sz.le135], ["135㎡ 초과", sz.gt135]] as [string, number | null | undefined][])
    .filter(([, v]) => Number(v) > 0).map(([k, v]) => `${k} ${Number(v).toLocaleString("ko-KR")}세대`).join(" · ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function complexRows(meta: Record<string, any> | null | undefined): { label: string; value: string }[] {
  const ci = meta?.complex_info || {};
  const rows: { label: string; value: string }[] = [];
  const num = (v: unknown) => { const n = Number(String(v ?? "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; };
  const t = (v: unknown) => String(v ?? "").trim();
  const hh = num(meta?.total_units) ?? num(ci.households);
  const dongs = num(ci.dongs);
  if (hh || dongs) rows.push({ label: "세대수", value: [hh && `${hh.toLocaleString("ko-KR")}세대`, dongs && `${dongs}개 동`].filter(Boolean).join(" · ") });
  const top = num(ci.topFloor);
  if (top) rows.push({ label: "최고층", value: `${top}층` });
  const mix = ci.sizeMix !== undefined ? t(ci.sizeMix) : sizeMixText(ci.sizes);
  if (mix) rows.push({ label: "평형 구성", value: mix });
  if (t(ci.builder)) rows.push({ label: "시공사", value: t(ci.builder) });
  if (t(ci.heating)) rows.push({ label: "난방 방식", value: t(ci.heating) });
  if (t(ci.hall)) rows.push({ label: "복도 유형", value: t(ci.hall) });
  const pk = num(ci.parking);
  if (pk) rows.push({ label: "단지 주차", value: `${pk.toLocaleString("ko-KR")}대${hh ? ` (세대당 ${(pk / hh).toFixed(2)}대)` : ""}` });
  if (t(ci.subway)) rows.push({ label: "가까운 역", value: `${t(ci.subway)}${t(ci.subwayTime) ? ` · 도보 ${t(ci.subwayTime)}` : ""}` });
  // "초등학교(원촌초등학교) 중학교(원촌중교)" → "원촌초등학교 · 원촌중교"
  const sc = t(ci.school);
  if (sc) {
    const names = [...sc.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim()).filter(Boolean);
    rows.push({ label: "학교", value: names.length ? names.join(" · ") : sc });
  }
  return rows;
}
